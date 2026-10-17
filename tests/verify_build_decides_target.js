// The build decides its own data target (branch claude/build-decides-target).
//
// Ray's rule: a build stamped by the deploy workflow as branch "main", with a
// real 40-hex commit, served from https://salty224.github.io/coin-collection-app/
// reads and writes the REAL workbook and folders. Anything else — the raw
// file, localhost, file://, a tag, "main-fix", an unreadable stamp — is the
// _Testing copy. Nothing in the code to flip.
//
// Every page in this suite that could be LIVE has its Microsoft/Graph/CDN
// requests aborted, so nothing here can reach OneDrive or sign-in.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { defineSuite } = require("./harness");

const APP_PATH = path.resolve(__dirname, "..", "app.html");
const APP_SRC = () => fs.readFileSync(APP_PATH, "utf8");

const WRITE_FLAGS = ["ENABLE_SET_WRITE_LAYER", "ENABLE_BROWSE_EDIT_WRITE", "ENABLE_DOCKET_WRITE",
  "ENABLE_ADDCOIN_WRITE", "ENABLE_SET_LINK_WRITE", "ENABLE_PURGE_WRITE"];

const REPO_ROOT = path.resolve(__dirname, "..");
const PLACEHOLDER_LINE = /^  const BUILD_STAMP = null; \/\/ @build-stamp$/m;
const GOOD_COMMIT = "0123456789abcdef0123456789abcdef01234567";
const LIVE_URL = "https://salty224.github.io/coin-collection-app/app.html";

// The same whole-line replacement the deploy workflow performs. `value` is
// either an object (JSON-stamped, as the workflow does) or raw JS text (to
// simulate an unreadable stamp).
function stampSource(src, value) {
  const n = (src.match(new RegExp(PLACEHOLDER_LINE.source, "gm")) || []).length;
  if (n !== 1) throw new Error("placeholder line found " + n + " times");
  const rhs = typeof value === "string" ? value : JSON.stringify(value).replace(/</g, "\\u003c");
  return src.replace(PLACEHOLDER_LINE, "  const BUILD_STAMP = " + rhs + ";");
}

// Serves `html` at `url` (and the repo's own files beside it), aborting every
// other request — Graph, Microsoft sign-in, the MSAL CDN — so a LIVE page
// can never reach OneDrive from a test.
async function openServed(openApp, viewport, url, html, extraRoutes) {
  const page = await openApp(viewport);
  const base = url.slice(0, url.lastIndexOf("/") + 1);
  await page.route("**/*", async route => {
    const u = route.request().url();
    if (u.split("?")[0] === url) return route.fulfill({ status: 200, contentType: "text/html", body: html });
    if (extraRoutes) {
      const handled = await extraRoutes(route, u);
      if (handled) return;
    }
    if (u.indexOf(base) === 0) {
      const rel = decodeURIComponent(u.slice(base.length).split("?")[0]);
      const file = path.join(REPO_ROOT, rel);
      if (rel && file.indexOf(REPO_ROOT) === 0 && fs.existsSync(file) && fs.statSync(file).isFile()) {
        return route.fulfill({ status: 200, body: fs.readFileSync(file) });
      }
      return route.fulfill({ status: 404, body: "" });
    }
    return route.abort();
  });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(600);
  return page;
}

const readTarget = page => page.evaluate(() => ({
  target: WRITE_TARGET, stamp: BUILD_STAMP, workbook: writePaths().workbook,
  flagsOn: [ENABLE_SET_WRITE_LAYER, ENABLE_BROWSE_EDIT_WRITE, ENABLE_DOCKET_WRITE,
    ENABLE_ADDCOIN_WRITE, ENABLE_SET_LINK_WRITE, ENABLE_PURGE_WRITE].every(v => v === true)
}));

module.exports = defineSuite("build-decides-target", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ================================================================
  // COMMIT 1 — every write flag is on regardless of target
  // ================================================================
  const W = await page.evaluate((names) => {
    const vals = {};
    names.forEach(n => { vals[n] = eval(n); }); // eslint-disable-line no-eval
    return { vals, layer: WRITE_LAYER_ENABLED };
  }, WRITE_FLAGS);
  ok(WRITE_FLAGS.every(n => W.vals[n] === true), "W1 all six write flags are true on the loaded page");
  ok(W.layer === true, "W2 WRITE_LAYER_ENABLED is true");
  const src = APP_SRC();
  ok(WRITE_FLAGS.every(n => src.split("const " + n + " = true;").length - 1 === 1),
    "W3 each write flag is defined as plain `true` in app.html (not from WRITE_TARGET)");
  ok(!/const ENABLE_[A-Z_]+ = \(WRITE_TARGET/.test(src),
    "W4 no flag is derived from WRITE_TARGET any more");

  // ================================================================
  // COMMIT 2 — the build marker and isLiveBuild()
  // ================================================================
  ok((src.match(/@build-stamp/g) || []).length === 1, "T1 the placeholder marker occurs exactly once in app.html");
  ok((src.match(new RegExp(PLACEHOLDER_LINE.source, "gm")) || []).length === 1,
    "T2 and it is the whole placeholder line the workflow replaces");
  ok(src.indexOf("const BUILD_STAMP") < src.indexOf("const WRITE_TARGET") &&
     src.indexOf("const WRITE_TARGET") < src.indexOf("const WRITE_LAYER_ENABLED") &&
     src.indexOf("const WRITE_LAYER_ENABLED") < src.indexOf("const graphMsalInstance") &&
     src.indexOf("const graphMsalInstance") < src.indexOf("const WRITE_PATHS"),
    "T3 the stamp is read before the flags, WRITE_LAYER_ENABLED, the MSAL instance and WRITE_PATHS are built");

  const raw = await readTarget(page);
  ok(raw.stamp === null && raw.target === "copy", "T4 the raw file (unstamped, file://) runs as copy");
  ok(raw.workbook === "CoinCollection/_Testing/CoinCollection (AI) COPY.xlsx", "T5 and its workbook is the _Testing copy");

  const U = await page.evaluate((c) => {
    const good = { branch: "main", commit: c, number: "57", date: "2026-10-17T12:00:00.000Z" };
    const loc = (href) => new URL(href);
    const L = "https://salty224.github.io/coin-collection-app/app.html";
    return {
      positive: isLiveBuild(good, loc(L)),
      rootPath: isLiveBuild(good, loc("https://salty224.github.io/coin-collection-app/")),
      mainFix: isLiveBuild({ ...good, branch: "main-fix" }, loc(L)),
      tag: isLiveBuild({ ...good, branch: "v2026.10" }, loc(L)),
      refsHeads: isLiveBuild({ ...good, branch: "refs/heads/main" }, loc(L)),
      shortCommit: isLiveBuild({ ...good, commit: c.slice(0, 7) }, loc(L)),
      upperCommit: isLiveBuild({ ...good, commit: c.toUpperCase() }, loc(L)),
      commit39: isLiveBuild({ ...good, commit: c.slice(1) }, loc(L)),
      noCommit: isLiveBuild({ branch: "main" }, loc(L)),
      http: isLiveBuild(good, loc("http://salty224.github.io/coin-collection-app/app.html")),
      localhost: isLiveBuild(good, loc("http://localhost:8791/app.html")),
      otherHost: isLiveBuild(good, loc("https://someone.github.io/coin-collection-app/app.html")),
      otherPath: isLiveBuild(good, loc("https://salty224.github.io/coin-collection-app-test/app.html")),
      fileUrl: isLiveBuild(good, loc("file:///home/x/coin-collection-app/app.html")),
      stringStamp: isLiveBuild("main", loc(L)),
      nullStamp: isLiveBuild(null, loc(L)),
      nullLoc: isLiveBuild(good, null),
      throwingLoc: isLiveBuild(good, { get protocol() { throw new Error("boom"); } })
    };
  }, GOOD_COMMIT);
  ok(U.positive === true && U.rootPath === true, "T6 stamped main + 40-hex commit + the real Pages URL is LIVE");
  ok(U.mainFix === false, "T7 branch \"main-fix\" is copy");
  ok(U.tag === false && U.refsHeads === false, "T8 a tag name, or \"refs/heads/main\", is copy");
  ok(U.shortCommit === false && U.upperCommit === false && U.commit39 === false && U.noCommit === false,
    "T9 a commit that is not 40 lowercase hex characters is copy");
  ok(U.http === false && U.localhost === false && U.fileUrl === false, "T10 http, localhost and file:// are copy");
  ok(U.otherHost === false && U.otherPath === false, "T11 another host or another path is copy");
  ok(U.stringStamp === false && U.nullStamp === false && U.nullLoc === false && U.throwingLoc === false,
    "T12 an unreadable stamp or location (including one that throws) is copy");

  // Real page loads of stamped temp copies.
  const stampMain = { branch: "main", commit: GOOD_COMMIT, number: "57", date: "2026-10-17T12:00:00.000Z" };
  const appSrc = APP_SRC();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "build-target-"));
  try {
    const live = await openServed(openApp, PHONE, LIVE_URL, stampSource(appSrc, stampMain));
    const L = await readTarget(live);
    ok(L.target === "live" && L.stamp && L.stamp.branch === "main", "T13 a stamped main served from the real URL loads as LIVE");
    ok(L.workbook === "CoinCollection/CoinCollection (AI).xlsx" && L.flagsOn, "T14 with the REAL workbook path and every write flag on");
    await live.close();

    const cases = [
      ["T15 the same stamped main opened as file:// is copy", "file", stampMain],
      ["T16 the same stamped main on localhost is copy", "http://localhost:8791/app.html", stampMain],
      ["T17 a stamped \"main-fix\" on the real URL is copy", LIVE_URL, { ...stampMain, branch: "main-fix" }],
      ["T18 a stamped tag on the real URL is copy", LIVE_URL, { ...stampMain, branch: "v2026.10" }],
      ["T19 a stamped main with a short commit on the real URL is copy", LIVE_URL, { ...stampMain, commit: "0123456" }],
      ["T20 an unreadable stamp (a bare string) on the real URL is copy", LIVE_URL, "\"main\""]
    ];
    for (const [label, where, value] of cases) {
      const html = stampSource(appSrc, value);
      let p;
      if (where === "file") {
        const f = path.join(tmpDir, "app.html");
        fs.writeFileSync(f, html);
        p = await openApp(PHONE);
        await p.goto("file://" + f, { waitUntil: "load" });
        await p.waitForTimeout(600);
      } else {
        p = await openServed(openApp, PHONE, where, html);
      }
      const r = await readTarget(p);
      ok(r.target === "copy" && r.workbook === "CoinCollection/_Testing/CoinCollection (AI) COPY.xlsx", label);
      await p.close();
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  ok(!fs.existsSync(tmpDir), "T21 the temporary stamped copies were deleted");

  // ================================================================
  // COMMIT 3 — the TEST banner
  // ================================================================
  const B1 = await page.evaluate(() => {
    const strip = document.getElementById("topStrip");
    const banner = document.getElementById("testBanner");
    const r = banner.getBoundingClientRect();
    const splash = document.getElementById("splashScreen");
    const wasHidden = splash.classList.contains("hidden"), wasFaded = splash.classList.contains("fade-out");
    splash.classList.remove("hidden", "fade-out");
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const onTopOfSplash = banner.contains(hit);
    if (wasHidden) splash.classList.add("hidden");
    if (wasFaded) splash.classList.add("fade-out");
    return {
      text: banner.textContent, visible: getComputedStyle(strip).display !== "none" && !banner.classList.contains("hidden"),
      top: r.top, height: r.height, position: getComputedStyle(strip).position,
      zStrip: Number(getComputedStyle(strip).zIndex), zSplash: Number(getComputedStyle(splash).zIndex),
      onTopOfSplash,
      var: getComputedStyle(document.documentElement).getPropertyValue("--top-strip-h").trim(),
      bodyPad: getComputedStyle(document.body).paddingTop
    };
  });
  ok(B1.visible && B1.text === "TEST · unstamped", "B1 an unstamped (copy) build shows the bar reading \"TEST · unstamped\"");
  ok(B1.position === "fixed" && B1.top === 0 && B1.height >= 22 && B1.height <= 24, "B2 it is a thin (22-24px) bar fixed at the very top");
  ok(B1.zStrip > B1.zSplash && B1.onTopOfSplash, "B3 it sits above the splash screen");
  ok(B1.var === B1.height + "px" && B1.bodyPad === B1.height + "px", "B4 the page is padded down by exactly the bar's height");

  // No control underneath it, on phone, tablet and PC, on screens with and
  // without the sticky nav, including after scrolling.
  const PC = { width: 1440, height: 900 };
  const coveredOn = async (viewport) => {
    const p = await openApp(viewport);
    const res = await p.evaluate(async () => {
      const stripBottom = document.getElementById("topStrip").getBoundingClientRect().bottom;
      const covered = [];
      // At scroll-top every visible control must sit below the bar. Once
      // scrolled, content legitimately passes underneath fixed chrome (the
      // sticky nav as much as the bar), so only the nav's own controls —
      // which must stay reachable — are checked then.
      const check = (screen, root) => {
        (root || document).querySelectorAll("button, input, select, textarea, a, .drawer").forEach(el => {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || el.offsetParent === null) return;
          if (r.bottom <= 0 || r.top >= window.innerHeight) return;
          if (el.closest("#topStrip, #splashScreen, .photo-adjust-overlay.hidden")) return;
          if (r.top < stripBottom - 0.5) covered.push(screen + ": " + (el.id || el.className || el.tagName) + " @" + Math.round(r.top));
        });
      };
      const settle = () => new Promise(r => setTimeout(r, 120));
      navigate("dashboard"); window.scrollTo(0, 0); await settle(); check("dashboard");
      navigate("browse"); window.scrollTo(0, 0); await settle(); check("catalog");
      window.scrollTo(0, 600); await settle(); check("catalog-scrolled", document.getElementById("navChrome"));
      const navTop = document.getElementById("navChrome").getBoundingClientRect().top;
      navigate("needsdbcoins"); window.scrollTo(0, 0); await settle(); check("docket");
      navigate("addcoin"); window.scrollTo(0, 0); await settle(); check("addcoin");
      navigate("dashboard");
      return { covered, navTop, stripBottom,
        hOverflow: document.documentElement.scrollWidth > window.innerWidth };
    });
    await p.close();
    return res;
  };
  for (const [label, vp] of [["phone", PHONE], ["tablet", { width: 1024, height: 768 }], ["PC", PC]]) {
    const c = await coveredOn(vp);
    ok(c.covered.length === 0, "B5 no control is under the bar on " + label + (c.covered.length ? " (" + c.covered.slice(0, 4).join("; ") + ")" : ""));
    ok(Math.abs(c.navTop - c.stripBottom) < 0.5, "B6 the sticky Back/Close Drawer nav sticks just below the bar on " + label + " (" + c.navTop + ")");
    ok(c.hOverflow === false, "B7 no sideways scroll on " + label);
  }

  // Branch name on a stamped feature build; nothing at all when LIVE.
  const branchPage = await openServed(openApp, PHONE, LIVE_URL,
    stampSource(appSrc, { ...stampMain, branch: "claude/build-decides-target" }));
  const BB = await branchPage.evaluate(() => document.getElementById("testBanner").textContent);
  ok(BB === "TEST · claude/build-decides-target", "B8 a stamped feature branch reads \"TEST · {branch}\"");
  await branchPage.close();

  const livePage = await openServed(openApp, PHONE, LIVE_URL, stampSource(appSrc, stampMain));
  const BL = await livePage.evaluate(() => ({
    target: WRITE_TARGET,
    stripShown: getComputedStyle(document.getElementById("topStrip")).display !== "none",
    bannerHidden: document.getElementById("testBanner").classList.contains("hidden"),
    var: getComputedStyle(document.documentElement).getPropertyValue("--top-strip-h").trim(),
    bodyPad: getComputedStyle(document.body).paddingTop,
    navTopCss: getComputedStyle(document.getElementById("navChrome")).top
  }));
  ok(BL.target === "live" && !BL.stripShown && BL.bannerHidden, "B9 a LIVE build shows no bar at all");
  ok(BL.var === "0px" && BL.bodyPad === "0px" && BL.navTopCss === "0px", "B10 and the page, nav and padding are exactly as before (0px)");
  await livePage.close();

  // ================================================================
  // COMMIT 4 — the build line
  // ================================================================
  const readLines = pg => pg.evaluate(() => {
    const splashLine = document.getElementById("splashBuildLine");
    const docketLine = document.getElementById("docketBuildLine");
    const view = document.getElementById("view-needsdbcoins");
    const muted = getComputedStyle(document.documentElement).getPropertyValue("--text-muted").trim();
    const probe = document.createElement("span"); probe.style.color = muted; document.body.appendChild(probe);
    const mutedRgb = getComputedStyle(probe).color; probe.remove();
    const cs = getComputedStyle(docketLine);
    return {
      splash: splashLine.textContent, docket: docketLine.textContent,
      splashUnderStatus: splashLine.previousElementSibling && splashLine.previousElementSibling.id === "splashStatus",
      docketLast: view.lastElementChild === docketLine,
      docketCentred: cs.textAlign === "center",
      small: parseFloat(cs.fontSize) <= 12 && parseFloat(getComputedStyle(splashLine).fontSize) <= 12,
      gray: cs.color === mutedRgb && getComputedStyle(splashLine).color === mutedRgb
    };
  });
  const LN = await readLines(page);
  ok(LN.splash === "Build unstamped" && LN.docket === "Build unstamped", "L1 an unstamped build reads \"Build unstamped\" on the splash and the Docket");
  ok(LN.splashUnderStatus, "L2 on the splash it sits directly under \"Connecting to OneDrive…\"");
  ok(LN.docketLast && LN.docketCentred, "L3 on the Docket it is the very last thing on the screen, centred");
  ok(LN.small && LN.gray, "L4 it is small gray text");

  const U4 = await page.evaluate(() => ({
    main: buildLineText({ branch: "main", commit: "0123456789abcdef0123456789abcdef01234567", number: "57", date: "2026-10-17T12:00:00.000Z" }),
    string: buildLineText("main"),
    nul: buildLineText(null),
    badDate: buildLineText({ branch: "x", commit: "abcdef0123", number: 3, date: "not a date" })
  }));
  ok(U4.main === "Build 57 · 17 Oct · 0123456", "L5 a stamped build reads \"Build {N} · {D Mon} · {short commit}\"");
  ok(U4.string === "Build unstamped" && U4.nul === "Build unstamped", "L6 an unreadable or missing stamp reads \"Build unstamped\"");
  ok(U4.badDate === "Build 3 · ? · abcdef0", "L7 a stamp with a bad date still shows what it can");

  // UTC, whatever the device's timezone: 23:30 UTC on 31 Oct is already
  // 1 Nov in Auckland, and must still read "31 Oct".
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTimezoneOverride", { timezoneId: "Pacific/Auckland" });
  const TZ = await page.evaluate(() => ({
    local: new Date("2026-10-31T23:30:00.000Z").getDate(),
    line: buildLineText({ commit: "0123456789abcdef0123456789abcdef01234567", number: "8", date: "2026-10-31T23:30:00.000Z" })
  }));
  ok(TZ.local === 1 && TZ.line === "Build 8 · 31 Oct · 0123456", "L8 the date is shown in UTC, not the device's own timezone");

  const stampedLines = await openServed(openApp, PHONE, LIVE_URL, stampSource(appSrc, stampMain));
  const SL = await readLines(stampedLines);
  const slTarget = await stampedLines.evaluate(() => WRITE_TARGET);
  ok(slTarget === "live" && SL.splash === "Build 57 · 17 Oct · 0123456" && SL.docket === SL.splash,
    "L9 a LIVE build shows its build line too, on both screens");
  await stampedLines.close();

  // ================================================================
  // COMMIT 6 — "A newer build is deployed — reload"
  // ================================================================
  const OTHER_COMMIT = "fedcba9876543210fedcba9876543210fedcba98";
  // Serves `html` at the real URL with build-info.json answered by `info`
  // (an object, a raw string body, or a status number), counting requests.
  const openWithInfo = async (html, info) => {
    const seen = [];
    const pg = await openServed(openApp, PHONE, LIVE_URL, html, async (route, u) => {
      if (u.indexOf("https://salty224.github.io/coin-collection-app/build-info.json") !== 0) return false;
      seen.push(u);
      if (typeof info === "number") await route.fulfill({ status: info, body: "" });
      else await route.fulfill({ status: 200, contentType: "application/json",
        body: typeof info === "string" ? info : JSON.stringify(info) });
      return true;
    });
    await pg.waitForTimeout(300);
    const st = await pg.evaluate(() => ({
      shown: !document.getElementById("newerBuildBar").classList.contains("hidden"),
      text: document.getElementById("newerBuildReloadBtn").textContent,
      h: getComputedStyle(document.documentElement).getPropertyValue("--top-strip-h").trim(),
      pad: getComputedStyle(document.body).paddingTop
    }));
    return { pg, seen, st };
  };

  {
    const { pg, seen, st } = await openWithInfo(appSrc, { ...stampMain, commit: OTHER_COMMIT });
    ok(seen.length === 0 && !st.shown, "N1 an unstamped build never asks for build-info.json and shows nothing");
    await pg.close();
  }
  {
    // A stamped copy opened from a file: no request at all (a file:// fetch
    // would only log a blocked-request error).
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "build-info-file-"));
    const f = path.join(d, "app.html");
    fs.writeFileSync(f, stampSource(appSrc, stampMain));
    const pg = await openApp(PHONE);
    const reqs = [];
    pg.on("request", r => { if (/build-info\.json/.test(r.url())) reqs.push(r.url()); });
    await pg.goto("file://" + f, { waitUntil: "load" });
    await pg.waitForTimeout(600);
    const shown = await pg.evaluate(() => !document.getElementById("newerBuildBar").classList.contains("hidden"));
    ok(reqs.length === 0 && !shown, "N1b a stamped copy opened from a file makes no request and shows nothing");
    await pg.close();
    fs.rmSync(d, { recursive: true, force: true });
  }
  {
    const { pg, seen, st } = await openWithInfo(stampSource(appSrc, stampMain), { ...stampMain, commit: OTHER_COMMIT, number: "58" });
    ok(st.shown && st.text === "A newer build is deployed — reload", "N2 a LIVE build whose deployed commit differs shows \"A newer build is deployed — reload\"");
    ok(st.h === "24px" && st.pad === "24px", "N3 and the page moves down to make room for it (no TEST bar on a LIVE build)");
    ok(seen.length === 1 && /\?t=\d+$/.test(seen[0]), "N4 build-info.json is asked for once, cache-busted");
    const nav = pg.waitForNavigation({ timeout: 5000 }).then(() => true, () => false);
    await pg.click("#newerBuildReloadBtn");
    ok(await nav, "N5 tapping it reloads the page");
    await pg.close();
  }
  {
    const { pg, st } = await openWithInfo(stampSource(appSrc, { ...stampMain, branch: "claude/x" }), { ...stampMain, commit: OTHER_COMMIT });
    ok(st.shown && st.h === "48px", "N6 on a TEST build it stacks under the TEST bar and the page moves down by both");
    await pg.close();
  }
  {
    const { pg, st } = await openWithInfo(stampSource(appSrc, stampMain), stampMain);
    ok(!st.shown && st.h === "0px", "N7 the same commit shows nothing");
    await pg.close();
  }
  {
    const { pg, st } = await openWithInfo(stampSource(appSrc, stampMain), 404);
    ok(!st.shown && st.h === "0px", "N8 a missing build-info.json shows nothing (and no page error)");
    await pg.close();
  }
  {
    const { pg, st } = await openWithInfo(stampSource(appSrc, stampMain), "{not json");
    const { pg: pg2, st: st2 } = await openWithInfo(stampSource(appSrc, stampMain), { branch: "main", commit: "short" });
    ok(!st.shown && !st2.shown, "N9 an unreadable or malformed build-info.json shows nothing");
    await pg.close(); await pg2.close();
  }
}, module);
