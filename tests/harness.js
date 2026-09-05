// Shared harness for this project's headless regression suites.
//
// WHY THIS EXISTS. Until now every verify_*.js lived in a per-session
// scratchpad and was thrown away with the session. That made the suites
// structurally incapable of the one job they exist for: a suite that cannot
// be re-run validates only the session that wrote it and protects nothing
// afterward. CLAUDE.md records the cost repeatedly ("Prior committed
// regression suites could not be re-run… none survived into this session").
// Suites now live in tests/ and are committed.
//
// The app itself is unchanged by this: app.html has no build step and no
// runtime dependencies, and nothing in here is ever served. package.json and
// node_modules/ are dev-time only (node_modules/ is gitignored).

const fs = require("fs");
const path = require("path");

// A fresh checkout has no node_modules, and the bare MODULE_NOT_FOUND stack
// that produces is a poor first thing to hit. Say what to do instead.
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (e) {
  if (e && e.code === "MODULE_NOT_FOUND") {
    console.error("\nPlaywright isn't installed. Run `npm install` first " +
      "(dev-only; it is not part of the shipped app).\n");
    process.exit(1);
  }
  throw e;
}

const APP_URL = "file://" + path.resolve(__dirname, "..", "app.html");

// Console/page noise this sandbox always produces and which says nothing
// about the app: MSAL is loaded from jsdelivr in a plain <script> tag and is
// expected to fail offline (app.html degrades gracefully by design — see
// CLAUDE.md's "the whole feature degrades gracefully if MSAL never loads").
const IGNORED_ERROR = /msal|jsdelivr|net::ERR|Failed to load resource/i;

// Resolve a Chromium binary WITHOUT hardcoding a path.
//
// Playwright's own default resolution cannot be relied on here: the installed
// playwright version pins a browser build number, and a sandbox that
// pre-installs browsers under PLAYWRIGHT_BROWSERS_PATH may well have a
// different one (verified: default launch failed looking for build 1234 while
// /opt/pw-browsers held 1194). Hardcoding the path that happened to work in
// one session is exactly the brittleness that would make a committed suite
// stop running on the next machine, so resolve in order of specificity and
// fall back to letting Playwright try its own default.
function resolveChromium() {
  if (process.env.CHROMIUM_PATH && fs.existsSync(process.env.CHROMIUM_PATH)) {
    return process.env.CHROMIUM_PATH;
  }
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (root && fs.existsSync(root)) {
    const found = fs.readdirSync(root)
      .filter(d => /^chromium-\d+$/.test(d))
      .sort((a, b) => parseInt(b.split("-")[1], 10) - parseInt(a.split("-")[1], 10))
      .map(d => path.join(root, d, "chrome-linux", "chrome"))
      .filter(p => fs.existsSync(p));
    if (found.length) return found[0];
  }
  for (const p of ["/usr/bin/chromium", "/usr/bin/chromium-browser",
                   "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"]) {
    if (fs.existsSync(p)) return p;
  }
  return undefined; // let Playwright resolve it itself
}

const PHONE = { width: 412, height: 915 };   // Ray's S25, the primary target
const TABLET = { width: 1024, height: 768 };

// Runs one suite and returns its result. `fn` receives a context with:
//   ok(cond, label)      — record an assertion
//   openApp(viewport)    — a fresh page with app.html loaded and settled
//   PHONE / TABLET       — the two standard viewports
// Page and console errors are collected automatically and reported as
// failures, so a suite cannot pass while the page is throwing.
async function runSuite(name, fn) {
  const result = { name, pass: 0, fail: 0, failures: [], errors: [] };
  const exe = resolveChromium();
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  try {
    const ctx = {
      PHONE, TABLET,
      ok(cond, label) {
        if (cond) result.pass++;
        else { result.fail++; result.failures.push(label); }
      },
      async openApp(viewport) {
        const page = await browser.newPage({ viewport: viewport || PHONE });
        page.on("pageerror", e => result.errors.push(String(e)));
        page.on("console", m => {
          if (m.type() === "error" && !IGNORED_ERROR.test(m.text())) result.errors.push(m.text());
        });
        await page.goto(APP_URL, { waitUntil: "load" });
        await page.waitForTimeout(600); // let init + splash settle
        return page;
      }
    };
    await fn(ctx);
  } catch (e) {
    result.fail++;
    result.failures.push("SUITE THREW: " + (e && e.stack || e));
  } finally {
    await browser.close();
  }
  return result;
}

function printResult(r) {
  const status = r.fail === 0 && r.errors.length === 0 ? "PASS" : "FAIL";
  console.log(`${status}  ${r.name}: ${r.pass} passed, ${r.fail} failed` +
    (r.errors.length ? `, ${r.errors.length} page error(s)` : ""));
  r.failures.forEach(f => console.log("        - " + f));
  r.errors.forEach(e => console.log("        ! " + String(e).split("\n")[0]));
}

// A suite file declares itself with this. It returns the { name, suite }
// shape run-all.js aggregates, AND — when the file is executed directly
// (`node tests/verify_x.js`) — runs itself immediately and sets an exit code.
// One definition serves both paths, so a suite can never be aggregatable but
// not runnable, or the reverse.
function defineSuite(name, fn, callerModule) {
  if (callerModule && require.main === callerModule) {
    runSuite(name, fn).then(r => {
      printResult(r);
      process.exit(r.fail === 0 && r.errors.length === 0 ? 0 : 1);
    });
  }
  return { name, suite: fn };
}

module.exports = { runSuite, printResult, defineSuite, resolveChromium, PHONE, TABLET, APP_URL };
