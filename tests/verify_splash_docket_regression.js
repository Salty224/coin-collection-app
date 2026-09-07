// Confirmed live-blocking regression, found via a direct A/B test (Ray
// switched GitHub Pages' deploy source from claude/code-primer-u8uv1d to
// main, with no other change, and "Couldn't connect"/Retry-does-nothing
// disappeared completely — main has no Docket-queue gating in its splash at
// all, so that gating is the delta and the real cause).
//
// The original "Splash: Docket badge gap closed" fix folded
// docketQueueReady() into the SAME hard Promise.all gate
// ensureLiveNavDataFetch() already had, reasoning both were "genuinely part
// of is-the-app-ready." That reasoning was wrong: it meant a persistently
// failing/hung _Docket/docket.json fetch (a real, low-stakes fob count, not
// anything the rest of the app needs to function) could block the ENTIRE
// APP behind the splash forever, with Retry never helping.
//
// Fix: docketQueueReadyWithGrace() races the real docketQueueReady() call
// against a short, separate SPLASH_DOCKET_GRACE_MS timeout that always
// resolves `true` — so the splash proceeds once the real app data
// (ensureLiveNavDataFetch()) is ready, whether or not the Docket queue ever
// answers. See CLAUDE.md for the full write-up.
//
// This suite also covers the (kept, still useful) diagnostic-detail work
// from the same dispatch: buildSplashDiagnosticText()/describeDiagnosticEntry()
// surface the real technical cause under the splash's friendly error
// message, so a live-device report can be a screenshot instead of a device
// console log.

const { defineSuite } = require("./harness");

module.exports = defineSuite("splash-docket-regression", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ================================================================
  // A. SPLASH_DOCKET_GRACE_MS sanity — a real, bounded budget, shorter
  //    than the outer 5s ceiling with real room to spare for a retry.
  // ================================================================
  const A = await page.evaluate(() => ({
    grace: SPLASH_DOCKET_GRACE_MS,
    ceiling: SPLASH_DATA_TIMEOUT_MS
  }));
  ok(typeof A.grace === "number" && A.grace > 0, "A1 SPLASH_DOCKET_GRACE_MS is a real positive number");
  ok(A.grace < A.ceiling, "A2 the docket grace period is shorter than the overall 5s error-box ceiling — it must resolve BEFORE the outer timeout would otherwise fire, leaving room for at least one more retry if needed");
  ok(A.grace <= 3000, "A3 the grace period doesn't eat an unreasonable share of the 5s budget");

  // ================================================================
  // B. THE ACTUAL FIX — driven through the real runSplashConnect(), with
  //    ensureLiveNavDataFetch() stubbed to succeed immediately and
  //    loadDocketQueue() stubbed to NEVER resolve (the worst case: a
  //    persistent hang/failure, exactly what a broken/blocked
  //    _Docket/docket.json request would look like). Confirms the splash
  //    hides — proceeds without the Docket queue — well inside the grace
  //    window, rather than sitting blocked for the full 5s and showing
  //    "Couldn't connect."
  //
  //    window.ensureLiveNavDataFetch/window.loadDocketQueue really do
  //    override what the real (also top-level, non-module-scoped)
  //    functions resolve to when called from inside runSplashConnect()'s
  //    own closures — the same function-reassignment technique this
  //    project's own suites already rely on elsewhere (e.g.
  //    verify_stats_live_data.js's renderStats() override).
  // ================================================================
  const B = await page.evaluate(async () => {
    __setDocketWriteEnabledForTest(true); // ensure the docket half is genuinely exercised, not short-circuited as "disabled"
    const origFetch = window.ensureLiveNavDataFetch;
    const origDocket = window.loadDocketQueue;
    window.ensureLiveNavDataFetch = () => Promise.resolve(true);
    window.loadDocketQueue = () => new Promise(() => {}); // never resolves — the worst case
    runSplashConnect();
    // Wait comfortably past SPLASH_DOCKET_GRACE_MS but well short of
    // SPLASH_DATA_TIMEOUT_MS, so a pass here can only mean the grace
    // mechanism itself resolved things, not the outer 5s ceiling.
    await new Promise(r => setTimeout(r, SPLASH_DOCKET_GRACE_MS + 400));
    const overlay = document.getElementById("splashScreen");
    const errorBox = document.getElementById("splashErrorBox");
    const result = {
      fadedOut: overlay.classList.contains("fade-out"),
      errorShown: !errorBox.classList.contains("hidden")
    };
    window.ensureLiveNavDataFetch = origFetch;
    window.loadDocketQueue = origDocket;
    __setDocketWriteEnabledForTest(null);
    return result;
  });
  ok(B.fadedOut === true, "B1 the splash proceeds (hides) once real app data is ready, even though the Docket queue fetch never resolved at all — THIS IS THE ACTUAL FIX for the reported \"Couldn't connect, Retry doesn't help\" regression");
  ok(B.errorShown === false, "B2 the error box never shows in this scenario — the app is genuinely usable, not just eventually erroring out");

  // ================================================================
  // C. Negative control — reproduces the pre-fix hard-gate logic (docket
  //    queue readiness AND'd directly into the same Promise.all with no
  //    separate grace timeout) against the IDENTICAL stubbed functions
  //    used in Block B, confirming that formula genuinely never resolves
  //    within the same window — proving B1/B2 exercise a real fix, not a
  //    tautology, and reproducing the exact reported hang.
  // ================================================================
  const C = await page.evaluate(async () => {
    __setDocketWriteEnabledForTest(true);
    const origFetch = window.ensureLiveNavDataFetch;
    const origDocket = window.loadDocketQueue;
    window.ensureLiveNavDataFetch = () => Promise.resolve(true);
    window.loadDocketQueue = () => new Promise(() => {});
    // Recreate the ORIGINAL (pre-fix) docketQueueReady() body exactly, and
    // the ORIGINAL single hard Promise.all gate — no separate grace timer.
    async function oldDocketQueueReady() {
      if (!docketWriteEnabled()) return true;
      return (await loadDocketQueue()) !== null;
    }
    let oldGateResolved = false;
    Promise.all([ensureLiveNavDataFetch(), oldDocketQueueReady()]).then(() => { oldGateResolved = true; });
    await new Promise(r => setTimeout(r, SPLASH_DOCKET_GRACE_MS + 400));
    const stillPending = !oldGateResolved;
    window.ensureLiveNavDataFetch = origFetch;
    window.loadDocketQueue = origDocket;
    __setDocketWriteEnabledForTest(null);
    return { stillPending };
  });
  ok(C.stillPending === true, "C1 negative control: the OLD hard-gate formula (docket queue directly AND'd in, no separate grace timeout) genuinely never resolves within the same window when the docket fetch hangs — reproduces the exact reported regression, confirming B1/B2 exercise the real fix");

  // ================================================================
  // D. describeDiagnosticEntry() — every diagnostic shape it renders.
  // ================================================================
  const D = await page.evaluate(() => ({
    missing: describeDiagnosticEntry(undefined),
    pending: describeDiagnosticEntry({ kind: "pending" }),
    noToken: describeDiagnosticEntry({ kind: "no-token" }),
    httpError: describeDiagnosticEntry({ kind: "http-error", status: 403 }),
    exception: describeDiagnosticEntry({ kind: "exception", message: "Failed to fetch" }),
    disabled: describeDiagnosticEntry({ kind: "disabled" }),
    okNoCount: describeDiagnosticEntry({ kind: "ok" }),
    okWithCount: describeDiagnosticEntry({ kind: "ok", rowCount: 542 })
  }));
  ok(/not yet reported/i.test(D.missing), "D1 a missing entry reads as \"not yet reported\"");
  ok(/pending|in flight/i.test(D.pending), "D2 a pending entry says so");
  ok(D.noToken === "no token", "D3 no-token renders plainly");
  ok(D.httpError === "HTTP 403", "D4 an http-error entry shows the real status code");
  ok(D.exception === "error — Failed to fetch", "D5 an exception entry shows the real caught message");
  ok(/disabled/i.test(D.disabled), "D6 a disabled entry says so");
  ok(D.okNoCount === "ok", "D7 a bare ok with no rowCount renders as plain \"ok\"");
  ok(D.okWithCount === "ok (542 rows)", "D8 an ok entry with a rowCount shows the real row count");

  // ================================================================
  // E. buildSplashDiagnosticText() — the headline classification, across
  //    every case the diagnostic task specifically asked to distinguish.
  // ================================================================
  const E = await page.evaluate(() => {
    function reset() {
      __resetLiveNavDataDiagnosticsForTest();
      __setDocketQueueDiagnosticForTest(null);
    }
    // Case 1: never got a token at all — every sheet AND the docket queue
    // report no-token.
    reset();
    const allNoToken = {};
    LIVE_NAV_DATA_SHEETS.forEach(s => { allNoToken[s] = { kind: "no-token" }; });
    __setLiveNavDataDiagnosticsForTest(allNoToken);
    __setDocketQueueDiagnosticForTest({ kind: "no-token" });
    const noTokenText = buildSplashDiagnosticText();

    // Case 2: got a token, but a Graph request failed (HTTP error on one
    // sheet, everything else ok).
    reset();
    const someHttpError = {};
    LIVE_NAV_DATA_SHEETS.forEach(s => { someHttpError[s] = { kind: "ok", rowCount: 10 }; });
    someHttpError["DB_Coins"] = { kind: "http-error", status: 403 };
    __setLiveNavDataDiagnosticsForTest(someHttpError);
    __setDocketQueueDiagnosticForTest({ kind: "ok" });
    const httpErrorText = buildSplashDiagnosticText();

    // Case 3: got data back but processing it threw (malformed/unexpected
    // shape) — every individual sheet succeeded.
    reset();
    const allOk = {};
    LIVE_NAV_DATA_SHEETS.forEach(s => { allOk[s] = { kind: "ok", rowCount: 5 }; });
    __setLiveNavDataDiagnosticsForTest(allOk);
    __setDocketQueueDiagnosticForTest({ kind: "ok" });
    __setLiveNavDataProcessingErrorForTest({ name: "TypeError", message: "Cannot read properties of undefined" });
    const processingErrorText = buildSplashDiagnosticText();

    // Case 4: a request is still pending/hung at the moment the error box
    // shows.
    reset();
    const somePending = {};
    LIVE_NAV_DATA_SHEETS.forEach(s => { somePending[s] = { kind: "ok", rowCount: 1 }; });
    somePending["Wishlist"] = { kind: "pending" };
    __setLiveNavDataDiagnosticsForTest(somePending);
    __setDocketQueueDiagnosticForTest({ kind: "ok" });
    const pendingText = buildSplashDiagnosticText();

    reset();
    return { noTokenText, httpErrorText, processingErrorText, pendingText };
  });
  ok(/no.*token.*was ever acquired/i.test(E.noTokenText), "E1 all-no-token case: headline distinguishes \"never got a token at all\"");
  ok(E.noTokenText.includes("All: no token") && E.noTokenText.includes("Docket queue: no token"), "E1b the per-line dump shows every sheet AND the docket line");
  ok(/request\(s\) failed/i.test(E.httpErrorText), "E2 http-error case: headline distinguishes \"got a token but the request(s) failed\"");
  ok(E.httpErrorText.includes("DB_Coins: HTTP 403"), "E2b the specific failing sheet and its real status code are shown");
  ok(/malformed|unexpected data shape/i.test(E.processingErrorText), "E3 processing-error case: headline distinguishes \"got data back but it was malformed\"");
  ok(E.processingErrorText.includes("TypeError: Cannot read properties of undefined"), "E3b the real caught error name+message is shown");
  ok(/still in flight|never returned/i.test(E.pendingText), "E4 a pending entry surviving to the timeout is called out as its own hang signal");

  // ================================================================
  // F. Source-level guard: buildSplashDiagnosticText() still checks
  //    ENABLE_LIVE_NAV_DATA — can't be exercised at runtime (a hardcoded
  //    const true, by design — see "Real-Graph flags always on" in
  //    CLAUDE.md), so confirmed by reading the function's own source text.
  // ================================================================
  const F = await page.evaluate(() => buildSplashDiagnosticText.toString());
  ok(/ENABLE_LIVE_NAV_DATA/.test(F), "F1 buildSplashDiagnosticText() still guards on ENABLE_LIVE_NAV_DATA (can't flip the const at runtime to exercise it directly)");

  // ================================================================
  // G. showSplashError() actually populates #splashErrorDetail with the
  //    real diagnostic text — driven end-to-end via ?splashError=1 (the
  //    existing dev-only forced-error toggle), which takes its own short,
  //    separate demo path per the markup comment (no real fetch attempted,
  //    so it must say so rather than show a stale/misleading dump).
  // ================================================================
  const G = await page.evaluate(async () => {
    __resetLiveNavDataDiagnosticsForTest();
    history.replaceState(null, "", location.pathname + "?splashError=1");
    runSplashConnect();
    await new Promise(r => setTimeout(r, SPLASH_ERROR_DEMO_DELAY_MS + 300));
    const detail = document.getElementById("splashErrorDetail").textContent;
    const shown = !document.getElementById("splashErrorBox").classList.contains("hidden");
    history.replaceState(null, "", location.pathname);
    return { detail, shown };
  });
  ok(G.shown === true, "G1 the forced-demo error path still shows the error box");
  ok(/no real fetch was attempted/i.test(G.detail), "G2 the demo path's detail text plainly says nothing real was attempted, rather than showing a stale/misleading diagnostic dump");

  // ================================================================
  // H. nav smoke / no overflow
  // ================================================================
  const Hh = await page.evaluate(() => {
    const bad = [];
    ["dashboard", "browse", "wishlist", "dashboard"].forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(Hh.bad.length === 0, "H1 nav still works cleanly: " + Hh.bad.join("; "));
  ok(Hh.overflow === false, "H2 no horizontal page overflow at 412px");
}, module);
