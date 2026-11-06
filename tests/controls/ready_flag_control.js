// NEGATIVE CONTROL for the app's "ready" flag (window.__appReady), run by hand:
//
//     node tests/controls/ready_flag_control.js
//
// Not a verify_*.js suite on purpose: `npm test` does not run it and the suite
// count stays 92. It proves the one property the flag must have: it is raised
// only after ALL startup promises have settled, even when one rejects EARLY
// while another is still pending, and a rejection still shows as a page error.
//
// How: the real app.html text is served at a made-up https URL with two of its
// startup calls swapped for controlled promises (everything else, including
// trackStartup() and the allSettled line, is the app's own code):
//   - the 4th call becomes a promise that REJECTS at once   (early rejection)
//   - the 6th call becomes a promise that settles after 1200 ms (still pending)
// Expected for the real code: not ready at 400 ms (the early rejection must
// not raise it), ready only after the slow one settled, and the rejection
// reaches the page as a page error.
//
// E4: a check that cannot fail proves nothing, so the same script then serves a
// deliberately NAIVE variant (the flag hangs off Promise.all(...).finally, which
// fires on the first rejection) and requires that the same "not ready at
// 400 ms" check FAILS on it. If the naive variant passes, the control is blind.

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { resolveChromium } = require("../harness");

const URL_ = "https://control.test/app.html";
const SRC = fs.readFileSync(path.resolve(__dirname, "..", "..", "app.html"), "utf8");

const EARLY = "trackStartup(updateInProgressSetsBadge());";
const SLOW = "trackStartup(processPromotedCoinDrafts().catch(() => {}));";
const SIGNAL_REAL = "startupSettled.push(new Promise(signal => {\n      Promise.resolve(p).then(signal, reason => { signal(); throw reason; });\n    }));";
const ALL_REAL = "Promise.allSettled(startupSettled).then(() => { window.__appReady = true; });";

function swap(src, from, to) {
  if (src.split(from).length !== 2) throw new Error("control setup: expected exactly one: " + from.slice(0, 60));
  return src.replace(from, () => to);
}

function controlled(src) {
  let out = swap(src, EARLY, "trackStartup(window.__ctlEarlyReject());");
  out = swap(out, SLOW, "trackStartup(window.__ctlSlow());");
  return out;
}

function naive(src) {
  let out = controlled(src);
  out = swap(out, SIGNAL_REAL, "startupSettled.push(Promise.resolve(p));");
  out = swap(out, ALL_REAL, "Promise.all(startupSettled).finally(() => { window.__appReady = true; });");
  return out;
}

const INIT = () => {
  window.__ctlEarlyReject = () => Promise.reject(new Error("control: early startup rejection"));
  window.__ctlSlow = () => new Promise(resolve => setTimeout(() => { window.__ctlSlowDoneAt = performance.now(); resolve(); }, 1200));
};

async function run(browser, label, html) {
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.route("**/*", route => {
    const u = route.request().url().split("?")[0];
    if (u === URL_) return route.fulfill({ status: 200, contentType: "text/html", body: html });
    return route.abort();
  });
  await page.addInitScript(INIT);
  await page.goto(URL_, { waitUntil: "load" });
  await page.waitForTimeout(400);
  const at400 = await page.evaluate(() => ({ ready: window.__appReady, slowDone: window.__ctlSlowDoneAt !== undefined }));
  let finalState = null;
  try {
    await page.waitForFunction(() => window.__appReady === true, null, { timeout: 5000 });
    finalState = await page.evaluate(() => ({ ready: window.__appReady, slowDone: window.__ctlSlowDoneAt !== undefined }));
  } catch (e) { finalState = { ready: false, timedOut: true }; }
  await page.close();
  const sawRejection = errors.some(e => /control: early startup rejection/.test(e));
  console.log(`  [${label}] at 400 ms: ready=${at400.ready} slowSettled=${at400.slowDone}; at the end: ${JSON.stringify(finalState)}; rejection seen as page error: ${sawRejection}`);
  return { at400, finalState, sawRejection };
}

(async () => {
  let failed = 0;
  const check = (label, cond) => { console.log((cond ? "  PASS  " : "  FAIL  ") + label); if (!cond) failed++; };
  const exe = resolveChromium();
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  try {
    console.log("REAL code (allSettled), early rejection + one still pending:");
    const real = await run(browser, "real", controlled(SRC));
    check("the flag is NOT set at 400 ms while a startup promise is still pending", real.at400.ready === false && real.at400.slowDone === false);
    check("the flag is set only once the pending promise has settled", real.finalState.ready === true && real.finalState.slowDone === true);
    check("the early rejection still reaches the page as a page error", real.sawRejection === true);

    console.log("\nNAIVE variant (Promise.all(...).finally), same two promises. Its check must FAIL here:");
    const bad = await run(browser, "naive", naive(SRC));
    const naiveCaught = bad.at400.ready === true && bad.at400.slowDone === false;
    check("the control CATCHES the naive variant (flag already set at 400 ms with a promise still pending)", naiveCaught);

    console.log("\nPOSITIVE control: both promises resolve, flag must be set:");
    const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
    await page.route("**/*", route => {
      const u = route.request().url().split("?")[0];
      if (u === URL_) return route.fulfill({ status: 200, contentType: "text/html", body: SRC });
      return route.abort();
    });
    await page.goto(URL_, { waitUntil: "load" });
    let raised = false;
    try { await page.waitForFunction(() => window.__appReady === true, null, { timeout: 5000 }); raised = true; } catch (e) { /* stays false */ }
    check("untouched app.html raises the flag", raised);
    await page.close();
  } finally {
    await browser.close();
  }
  console.log(failed ? `\n${failed} control check(s) FAILED` : "\nAll control checks passed.");
  process.exit(failed ? 1 : 0);
})();
