// Dynamic redirectUri + real-Graph flags no longer gated behind a local
// dev-flags.local.js override file.
//
// Two independent changes, same session:
//   1. redirectUri is derived from window.location.origin +
//      window.location.pathname instead of a hardcoded localhost URI — a
//      production redirect URI for app.html's real GitHub Pages URL is
//      already registered in Entra, so this now resolves correctly
//      whether the page is running locally or on the hosted site.
//   2. Ray is the only user of this app, so the six ENABLE_* flags no
//      longer need a local-only override file to turn on. The two
//      read-only flags (ENABLE_REFERENCE_IMAGES, ENABLE_LIVE_NAV_DATA) are
//      plain `true`. The four WRITE-capable flags (ENABLE_SET_WRITE_LAYER,
//      ENABLE_BROWSE_EDIT_WRITE, ENABLE_DOCKET_WRITE, ENABLE_ADDCOIN_WRITE)
//      are `(WRITE_TARGET === "copy")` instead — WRITE_TARGET is the real
//      safety boundary now: flipping it to "live" turns every one of them
//      back off at that same instant, so going live for real needs a
//      second, explicit step (re-enabling each flag) rather than being a
//      side effect of the one WRITE_TARGET edit.
//
// See CLAUDE.md "Real-Graph flags always on; WRITE_TARGET is the actual
// safety boundary".

const fs = require("fs");
const path = require("path");
const { defineSuite } = require("./harness");

const ROOT = path.resolve(__dirname, "..");

module.exports = defineSuite("dynamic-redirect-and-live-flags", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ================================================================
  // A. The flags themselves, read live off the page.
  // ================================================================
  const A = await page.evaluate(() => ({
    target: WRITE_TARGET,
    refImages: ENABLE_REFERENCE_IMAGES,
    liveNav: ENABLE_LIVE_NAV_DATA,
    setWrite: ENABLE_SET_WRITE_LAYER,
    browseEditWrite: ENABLE_BROWSE_EDIT_WRITE,
    docketWrite: ENABLE_DOCKET_WRITE,
    addCoinWrite: ENABLE_ADDCOIN_WRITE,
    writeLayerEnabled: WRITE_LAYER_ENABLED,
    devFlagOverrideGone: typeof devFlagOverride === "undefined",
    devFlagsWindowUnset: typeof window.__DEV_FLAGS__ === "undefined"
  }));
  ok(A.target === "copy", "A1 WRITE_TARGET is 'copy' by default — the real safety boundary");
  ok(A.refImages === true, "A2 ENABLE_REFERENCE_IMAGES is plain true (read-only, never depends on WRITE_TARGET)");
  ok(A.liveNav === true, "A3 ENABLE_LIVE_NAV_DATA is plain true, same reasoning");
  ok(A.setWrite === true && A.browseEditWrite === true && A.docketWrite === true && A.addCoinWrite === true,
    "A4 all four write-capable flags are true, matching WRITE_TARGET === 'copy' in the shipped default");
  ok(A.writeLayerEnabled === true, "A5 WRITE_LAYER_ENABLED follows from the four write flags being on");
  ok(A.devFlagOverrideGone, "A6 devFlagOverride() no longer exists — nothing reads it anymore");
  ok(A.devFlagsWindowUnset, "A7 window.__DEV_FLAGS__ is never set (the <script src=\"dev-flags.local.js\"> tag is gone)");

  // ================================================================
  // B. redirectUri is genuinely dynamic, not a hardcoded string.
  // ================================================================
  const B = await page.evaluate(() => ({
    configuredRedirect: graphMsalConfig.auth.redirectUri,
    currentOriginPlusPath: window.location.origin + window.location.pathname,
    stillMentionsHardcodedLocalhost: graphMsalConfig.auth.redirectUri === "http://localhost:8791/app.html" &&
      window.location.origin + window.location.pathname !== "http://localhost:8791/app.html"
  }));
  ok(B.configuredRedirect === B.currentOriginPlusPath,
    "B1 graphMsalConfig.auth.redirectUri equals window.location.origin + window.location.pathname AT THE MOMENT THE PAGE LOADED");
  ok(!B.stillMentionsHardcodedLocalhost,
    "B2 negative control: it is not simply coincidentally matching a hardcoded localhost string (this test's own file:// origin proves the derivation is real, not luck)");

  // ================================================================
  // C. The dead scaffolding is actually gone from the repo, not just
  // unused in the running page.
  // ================================================================
  const appHtml = fs.readFileSync(path.join(ROOT, "app.html"), "utf8");
  const gitignore = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  ok(!fs.existsSync(path.join(ROOT, "dev-flags.local.example.js")),
    "C1 dev-flags.local.example.js no longer exists in the repo");
  ok(!/dev-flags\.local\.js/.test(gitignore), "C2 .gitignore no longer mentions dev-flags.local.js");
  ok(!/Local dev-flag overrides/.test(readme), "C3 README.md's whole 'Local dev-flag overrides' section is gone");
  ok(!/<script src="dev-flags\.local\.js">/.test(appHtml), "C4 the <script src=\"dev-flags.local.js\"> tag is gone from app.html");
  ok(!/function devFlagOverride/.test(appHtml), "C5 the devFlagOverride() function definition is gone from app.html's source");

  // Nav/overflow smoke.
  const N = await page.evaluate(() => {
    navigate("addcoin");
    navigate("browse");
    navigate("stats");
    return { noOverflow: document.body.scrollWidth <= window.innerWidth };
  });
  ok(N.noOverflow, "N1 no page-level horizontal overflow (no UI change in this task, but confirms nothing else broke)");
}, module);
