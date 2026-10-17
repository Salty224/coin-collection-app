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
}, module);
