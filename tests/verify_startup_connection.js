// Startup connection fix — "Couldn't connect" on launch, Retry not helping,
// a full reload helping. Root cause: nothing had a timeout, and both shared startup fetches
// (ensureLiveNavDataFetch(), loadDocketQueue()) hand every caller the SAME
// in-flight promise, so one Graph request that never answered held every
// later attempt — Retry included — until a reload.
//
// Real MSAL can't load in this sandbox, so every block stubs the token
// (window.acquireGraphToken) and the network (window.fetch). Both are global
// bindings in app.html's classic script, so reassigning them changes what the
// app's own code calls — the same technique the other splash suites use.
//
// Each block first supersedes the page's own launch-time splash loop
// (splashConnectGeneration++), so its 400ms retries can't fire into the fake
// network mid-assertion.

const { defineSuite } = require("./harness");

// Installed into the page once per block. `routes` maps a matcher name to a
// handler (url, init, callIndex) => Promise<Response> | "hang" | "hang-signal".
//   "hang"        — never resolves and ignores the abort signal (the worst
//                   case: proves the deadline holds without the signal's help)
//   "hang-signal" — never resolves on its own but rejects on abort, the way a
//                   real fetch() does (proves the signal really cancels it)
const INSTALL_FAKE = () => {
  window.__fakeCalls = [];
  window.__fakeSignals = [];
  window.__fakeRoutes = {};
  window.__realFetch = window.__realFetch || window.fetch;
  window.acquireGraphToken = () => Promise.resolve("fake-token");
  __resetLiveNavDataDiagnosticsForTest();
  __setDocketQueueDiagnosticForTest(null);
  __setLiveDocketQueueForTest(null);
  __setGraphClientForTest(null); // RealGraphClient
  window.fetch = (url, init) => {
    const u = String(url);
    const m = /worksheets\('([^']+)'\)/.exec(u);
    const key = m ? decodeURIComponent(m[1]) : (/_Docket/.test(u) ? "docket" : "other");
    const n = window.__fakeCalls.filter(c => c.key === key).length;
    window.__fakeCalls.push({ key, at: Date.now() });
    if (init && init.signal) window.__fakeSignals.push({ key, signal: init.signal });
    const handler = window.__fakeRoutes[key] || window.__fakeRoutes["*"];
    const out = handler ? handler(u, init, n) : "hang";
    if (out === "hang") return new Promise(() => {});
    if (out === "hang-signal") {
      return new Promise((_, reject) => {
        init.signal.addEventListener("abort", () => reject(init.signal.reason || new DOMException("aborted", "AbortError")), { once: true });
      });
    }
    return out;
  };
  // Test-side guard: if the deadline being tested is missing (as in the
  // negative controls), an await would hang the whole suite instead of
  // failing by name. Resolves "__HANG__" after `ms` instead.
  window.__guard = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r("__HANG__"), ms || 3000))]);
  window.__sheet = (values) => Promise.resolve(new Response(JSON.stringify({ values }), { status: 200 }));
  window.__coreOk = () => {
    // Minimal real answers for all nine sheets: All needs a CollectionID row,
    // DB_Sets a Lineage row, the rest a header row (a real, cacheable []).
    const ok = {
      All: [["CollectionID", "Year", "Denomination"], ["AY-90001", 1909, "1C"]],
      DB_Sets: [["SetID", "Lineage", "Description", "Year"], ["S-1", "Proof Set", "Test Proof Set", 1999]]
    };
    return (u, init, n) => {
      const m = /worksheets\('([^']+)'\)/.exec(u);
      const sheet = m ? decodeURIComponent(m[1]) : "";
      return window.__sheet(ok[sheet] || [["Header"]]);
    };
  };
};

// Between blocks: stop any splash loop, drop timing overrides, and clear the
// live caches + shared in-flight promises so one block can't leak into the next.
const RESET = () => {
  splashConnectGeneration++;
  __setSplashTimingsForTest(null);
  __setLiveCoinsForTest(null);
  LIVE_DB_SETS = null;
  liveNavDataFetchPromise = null;
  docketQueueFetchPromise = null;
  __resetLiveNavOptionalForTest();
  __setLiveDataModeForTest(null);
  __setLiveAlbumsForTest(null);
  liveAlbumsLoadFailed = false;
  lastRetryAfterMs = 0;
};

module.exports = defineSuite("startup-connection", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ================================================================
  // A. Per-request timeout (commit A).
  // ================================================================
  const A0 = await page.evaluate(() => ({ request: SPLASH_REQUEST_TIMEOUT_MS }));
  ok(A0.request === 12000, `A0 SPLASH_REQUEST_TIMEOUT_MS is 12000 (got ${A0.request})`);

  // A1–A3: a never-resolving sheet read, signal ignored — resolves null at the
  // deadline, records "timeout", and the request's signal was aborted.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE);
  const A1 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 300 });
    window.__fakeRoutes["*"] = () => "hang";
    const t0 = Date.now();
    const rows = await __guard(fetchWorkbookSheetRows("Receipts"));
    const elapsed = Date.now() - t0;
    const sig = window.__fakeSignals.find(s => s.key === "Receipts");
    return { rows, elapsed, diag: __getLiveNavDataDiagnosticsForTest().Receipts, aborted: !!(sig && sig.signal.aborted) };
  });
  ok(A1.rows === null, "A1 a sheet read that never answers resolves to null (an ordinary failure) instead of hanging forever");
  ok(A1.elapsed >= 280 && A1.elapsed < 1500, `A2 it gives up at the per-request deadline, not before and not much after (${A1.elapsed}ms against a 300ms override)`);
  ok(A1.diag && A1.diag.kind === "timeout", `A3 its diagnostic entry records "timeout", not "pending" (got ${JSON.stringify(A1.diag)})`);
  ok(A1.aborted, "A4 the request's own AbortSignal was aborted, so a real fetch() would be cancelled rather than left running");

  // A5: a signal-honouring hang (what a real fetch does) also ends at the deadline.
  const A5 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 300 });
    window.__fakeRoutes["*"] = () => "hang-signal";
    const t0 = Date.now();
    const rows = await __guard(fetchWorkbookSheetRows("Photos"));
    return { rows, elapsed: Date.now() - t0, diag: __getLiveNavDataDiagnosticsForTest().Photos };
  });
  ok(A5.rows === null && A5.elapsed < 1500 && A5.diag.kind === "timeout", `A5 a signal-honouring hang (a real fetch's behaviour) also times out cleanly (${A5.elapsed}ms, ${JSON.stringify(A5.diag)})`);

  // A6: a LATE answer (arrives after the deadline) is ignored — the
  // diagnostic stays "timeout" and nothing is cached from it.
  const A6 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 200 });
    let release;
    window.__fakeRoutes["*"] = () => new Promise(r => { release = r; });
    const rows = await __guard(fetchWorkbookSheetRows("Albums"));
    if (release) release(new Response(JSON.stringify({ values: [["H"], ["late"]] }), { status: 200 }));
    await new Promise(r => setTimeout(r, 150));
    return { rows, diag: __getLiveNavDataDiagnosticsForTest().Albums };
  });
  ok(A6.rows === null && A6.diag.kind === "timeout", `A6 a response arriving after the deadline doesn't overwrite the "timeout" diagnostic or resurrect the read (${JSON.stringify(A6.diag)})`);

  // A7–A9: the reported case — Receipts never answers. Receipts is additive
  // (a null leaves the previous index in place), so with a deadline the
  // shared fetch now SUCCEEDS on the core sheets instead of hanging forever.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE);
  const A7 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 300 });
    const coreOk = window.__coreOk();
    window.__fakeRoutes["*"] = (u, init, n) => /'Receipts'/.test(u) ? "hang" : coreOk(u, init, n);
    const t0 = Date.now();
    const result = await __guard(ensureLiveNavDataFetch());
    return {
      result, elapsed: Date.now() - t0,
      receiptsDiag: __getLiveNavDataDiagnosticsForTest().Receipts.kind,
      liveCoins: (activeCoins() || []).map(c => c.id)
    };
  });
  ok(A7.result === true, "A7 a hung Receipts read no longer holds the whole startup fetch — the core sheets load and it succeeds");
  ok(A7.elapsed < 1500, `A8 ...at the per-request deadline (${A7.elapsed}ms against 300ms), not never`);
  ok(A7.receiptsDiag === "timeout" && A7.liveCoins.includes("AY-90001"), `A9 Receipts is reported as timed out while real data loaded (${A7.receiptsDiag}, ${JSON.stringify(A7.liveCoins)})`);

  // A10–A12: a CORE sheet hangs once — the fetch fails, the shared promise is
  // cleared (not cached), and the next call starts a FRESH request that
  // succeeds (fails once, then succeeds).
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE);
  const A10 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 300 });
    const coreOk = window.__coreOk();
    window.__fakeRoutes["*"] = (u, init, n) => (/'All'/.test(u) && n === 0) ? "hang" : coreOk(u, init, n);
    const first = await __guard(ensureLiveNavDataFetch());
    const promiseCleared = liveNavDataFetchPromise === null;
    const second = await __guard(ensureLiveNavDataFetch());
    return {
      first, promiseCleared, second,
      allCalls: window.__fakeCalls.filter(c => c.key === "All").length,
      liveCoins: (activeCoins() || []).map(c => c.id)
    };
  });
  ok(A10.first === false && A10.promiseCleared, "A10 a hung core sheet makes the fetch fail at the deadline, and the shared in-flight promise is cleared rather than kept");
  ok(A10.allCalls === 2, `A11 the next call makes a fresh request instead of re-awaiting the hung one (All requested ${A10.allCalls}x)`);
  ok(A10.second === true && A10.liveCoins.includes("AY-90001"), `A12 fails once, then succeeds: the second call loads real data (${JSON.stringify(A10.liveCoins)})`);

  // A13–A16: the Docket queue read — same deadline, not cached, fresh retry.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE);
  const A13 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 300 });
    const good = { type: "docket-queue", version: 1, entries: [] };
    window.__fakeRoutes.docket = (u, init, n) => n === 0 ? "hang"
      : Promise.resolve(new Response(JSON.stringify(good), { status: 200 }));
    const t0 = Date.now();
    const first = await __guard(loadDocketQueue());
    const elapsed = Date.now() - t0;
    const diag = __getDocketQueueDiagnosticForTest();
    const cachedAfterFailure = __getLiveDocketQueueForTest();
    const second = await __guard(loadDocketQueue());
    return { first, elapsed, diag, cachedAfterFailure, second: !!(second && second !== "__HANG__" && second.entries), calls: window.__fakeCalls.filter(c => c.key === "docket").length };
  });
  ok(A13.first === null && A13.elapsed < 1500, `A13 a hung Docket queue read resolves null at the deadline (${A13.elapsed}ms)`);
  ok(A13.diag && A13.diag.kind === "timeout", `A14 its diagnostic records "timeout" (got ${JSON.stringify(A13.diag)})`);
  ok(A13.cachedAfterFailure === null, "A15 nothing is cached from the timed-out read");
  ok(A13.second && A13.calls === 2, `A16 fails once, then succeeds on a fresh request (${A13.calls} requests)`);

  // A17: other getJson() callers are deliberately unchanged — no timeout.
  const A17 = await page.evaluate(async () => {
    window.__fakeRoutes["*"] = () => "hang";
    window.__fakeRoutes.docket = undefined;
    let settled = false;
    graph().getJson("CoinCollection/_Testing/Staging/AY-00001/coin.json").then(() => { settled = true; }, () => { settled = true; });
    await new Promise(r => setTimeout(r, 600));
    return { settled };
  });
  ok(A17.settled === false, "A17 getJson() WITHOUT a timeout option (draft listings etc.) is unchanged — still no deadline");

  // A18: the diagnostic text names a timeout as its own cause.
  const A18 = await page.evaluate(() => {
    __setLiveNavDataDiagnosticsForTest({ All: { kind: "ok", rowCount: 5 }, Receipts: { kind: "timeout", ms: 12000 } });
    __setDocketQueueDiagnosticForTest({ kind: "ok" });
    return buildSplashDiagnosticText();
  });
  ok(/timed out/i.test(A18) && /Receipts: timed out after 12s/.test(A18), `A18 the splash's diagnostic detail calls out the timeout (got: ${A18.split("\n").slice(0, 3).join(" | ")})`);

  // ================================================================
  // B. Retry starts fresh (commit B).
  // ================================================================
  // B1–B5: a core sheet hangs (signal-honouring, like a real fetch). Retry
  // aborts it, drops the shared promise, and a NEW request goes out; the
  // aborted fetch settling later must not touch the newer one's state.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE);
  const B1 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 60000 }); // the deadline is NOT what ends it here — Retry is
    const coreOk = window.__coreOk();
    let release;
    window.__fakeRoutes["*"] = (u, init, n) => {
      if (/'All'/.test(u) && n === 0) return "hang-signal";
      if (/'All'/.test(u) && n === 1) return new Promise(r => { release = () => r(coreOk(u, init, n)); });
      return coreOk(u, init, n);
    };
    const oldPromise = ensureLiveNavDataFetch();
    await new Promise(r => setTimeout(r, 50));
    const oldSignal = window.__fakeSignals.find(x => x.key === "All").signal;
    restartStartupFetches();
    const newPromise = ensureLiveNavDataFetch();
    const oldResult = await __guard(oldPromise, 2000);
    await new Promise(r => setTimeout(r, 50));
    const sharedStillNew = liveNavDataFetchPromise === newPromise;
    const allDiagWhileNewPending = __getLiveNavDataDiagnosticsForTest().All.kind;
    if (release) release();
    const newResult = await __guard(newPromise, 3000);
    return {
      oldAborted: oldSignal.aborted,
      oldAbortWasRetry: !!(oldSignal.reason && oldSignal.reason.retrySuperseded),
      oldResult, sharedStillNew, allDiagWhileNewPending, newResult,
      distinct: oldPromise !== newPromise,
      allCalls: window.__fakeCalls.filter(c => c.key === "All").length,
      liveCoins: (activeCoins() || []).map(c => c.id)
    };
  });
  ok(B1.oldAborted && B1.oldAbortWasRetry, "B1 Retry aborts the in-flight request (its AbortSignal fires, marked as superseded by Retry)");
  ok(B1.distinct && B1.allCalls === 2, `B2 Retry starts a NEW fetch with a new request, instead of handing back the old promise (All requested ${B1.allCalls}x)`);
  ok(B1.oldResult === false && B1.sharedStillNew, "B3 the aborted fetch settling afterwards returns false and does NOT clear the newer fetch's shared in-flight promise");
  ok(B1.allDiagWhileNewPending === "pending", `B4 nor does it overwrite the newer request's "pending" diagnostic (got ${B1.allDiagWhileNewPending})`);
  ok(B1.newResult === true && B1.liveCoins.includes("AY-90001"), "B5 the fresh fetch then completes and loads real data");

  // B6–B8: already-loaded data survives a Retry, and survives that fresh
  // fetch then FAILING too.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE);
  const B6 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 300 });
    const loaded = [{ id: "AY-77777", name: "Already loaded", denom: "1C", year: 1909 }];
    __setLiveCoinsForTest(loaded);           // LIVE_DB_SETS stays null, so a fetch still runs
    const queue = { type: "docket-queue", version: 1, entries: [] };
    __setLiveDocketQueueForTest(queue);
    window.__fakeRoutes["*"] = () => "hang-signal";
    ensureLiveNavDataFetch();
    await new Promise(r => setTimeout(r, 30));
    restartStartupFetches();
    const sameAfterRetry = activeCoins() === loaded;
    const result = await __guard(ensureLiveNavDataFetch(), 3000); // every sheet hangs -> times out -> false
    return {
      sameAfterRetry, result,
      sameAfterFailedFetch: activeCoins() === loaded,
      docketSame: __getLiveDocketQueueForTest() === queue
    };
  });
  ok(B6.sameAfterRetry, "B6 Retry does not wipe already-loaded data (LIVE_COINS is the same array right after Retry)");
  ok(B6.result === false && B6.sameAfterFailedFetch, "B7 ...and a fresh fetch that then fails leaves it untouched too");
  ok(B6.docketSame, "B8 an already-loaded Docket queue survives Retry as well");

  // B9–B11: the Docket read — Retry aborts it and starts a fresh read, and
  // the aborted read settling later doesn't clear the new read's promise.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE);
  const B9 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 60000 });
    const good = { type: "docket-queue", version: 1, entries: [] };
    let release;
    window.__fakeRoutes.docket = (u, init, n) => n === 0 ? "hang-signal"
      : new Promise(r => { release = () => r(new Response(JSON.stringify(good), { status: 200 })); });
    const oldP = loadDocketQueue();
    await new Promise(r => setTimeout(r, 50));
    const oldSignal = window.__fakeSignals.find(x => x.key === "docket").signal;
    restartStartupFetches();
    const newP = loadDocketQueue();
    const newShared = docketQueueFetchPromise; // loadDocketQueue() is async, so compare the shared promise itself
    const oldResult = await __guard(oldP, 2000);
    await new Promise(r => setTimeout(r, 30));
    const sharedStillNew = newShared !== null && docketQueueFetchPromise === newShared;
    const diagWhileNewPending = (__getDocketQueueDiagnosticForTest() || {}).kind;
    if (release) release();
    const newResult = await __guard(newP, 3000);
    return { oldAborted: oldSignal.aborted, oldResult, sharedStillNew, diagWhileNewPending,
      newOk: !!(newResult && newResult.entries), calls: window.__fakeCalls.filter(c => c.key === "docket").length };
  });
  ok(B9.oldAborted && B9.calls === 2, `B9 Retry aborts the in-flight Docket read and a fresh read goes out (${B9.calls} requests)`);
  ok(B9.oldResult === null && B9.sharedStillNew && B9.diagWhileNewPending === "pending", `B10 the aborted Docket read settling later leaves the newer read's promise and "pending" diagnostic alone (${B9.diagWhileNewPending})`);
  ok(B9.newOk, "B11 the fresh Docket read completes normally");

  // B12: the real Retry button is wired to the abort (not just runSplashConnect).
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE);
  const B12 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 60000 });
    window.__fakeRoutes["*"] = () => "hang-signal";
    ensureLiveNavDataFetch();
    await new Promise(r => setTimeout(r, 30));
    const sig = window.__fakeSignals.find(x => x.key === "All").signal;
    document.getElementById("splashRetryBtn").click();
    await new Promise(r => setTimeout(r, 30));
    const aborted = sig.aborted;
    splashConnectGeneration++; // stop the loop the click started
    restartStartupFetches();
    return { aborted };
  });
  ok(B12.aborted, "B12 tapping the real Retry button aborts the in-flight request");

  // ================================================================
  // D. Splash timings, "Still connecting…", late data clears it (commit D).
  //    Each block stubs ensureLiveNavDataFetch() and disables the Docket half
  //    (so it resolves ready at once), except D7, which drives the real chain.
  // ================================================================
  await page.evaluate(RESET);
  const D1 = await page.evaluate(() => ({
    data: SPLASH_DATA_TIMEOUT_MS, slow: SPLASH_SLOW_NOTICE_MS, request: SPLASH_REQUEST_TIMEOUT_MS, grace: SPLASH_DOCKET_GRACE_MS
  }));
  ok(D1.data === 25000 && D1.slow === 5000, `D1 SPLASH_DATA_TIMEOUT_MS is 25000 and SPLASH_SLOW_NOTICE_MS is 5000 (got ${D1.data}, ${D1.slow})`);
  ok(D1.data > 2 * D1.request, `D2 the overall wait exceeds two request timeouts, so one automatic fresh attempt fits (${D1.data} > 2 x ${D1.request})`);
  ok(D1.grace === 2000, `D3 SPLASH_DOCKET_GRACE_MS is unchanged at 2000 (got ${D1.grace})`);

  // Shared stub driver for D4–D8.
  const SPLASH_STUB = () => {
    window.__origEnsure = window.__origEnsure || window.ensureLiveNavDataFetch;
    __setDocketWriteEnabledForTest(false);
    window.__ensureCalls = 0;
    window.__splashState = () => ({
      status: document.getElementById("splashStatus").textContent,
      statusShown: document.getElementById("splashStatus").style.display !== "none",
      error: !document.getElementById("splashErrorBox").classList.contains("hidden"),
      hidden: document.getElementById("splashScreen").classList.contains("hidden")
    });
    window.__restoreSplash = () => {
      window.ensureLiveNavDataFetch = window.__origEnsure;
      __setDocketWriteEnabledForTest(null);
      __setSplashTimingsForTest(null);
      splashConnectGeneration++;
    };
  };

  // D4–D5: "Still connecting…" after the slow-notice delay, not before.
  await page.evaluate(SPLASH_STUB);
  const D4 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ slow: 300, data: 5000 });
    window.ensureLiveNavDataFetch = () => new Promise(() => {});
    runSplashConnect();
    await new Promise(r => setTimeout(r, 150));
    const before = __splashState();
    await new Promise(r => setTimeout(r, 300));
    const after = __splashState();
    __restoreSplash();
    return { before, after };
  });
  ok(D4.before.status === "Connecting to OneDrive…", `D4 before the slow-notice delay the status reads "Connecting to OneDrive…" (got "${D4.before.status}")`);
  ok(D4.after.status === "Still connecting…" && !D4.after.error, `D5 after it, the status changes to "Still connecting…" and no error is shown (got "${D4.after.status}")`);

  // D6: a quick success never shows "Still connecting…".
  await page.evaluate(SPLASH_STUB);
  const D6 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ slow: 300, data: 5000 });
    window.ensureLiveNavDataFetch = () => Promise.resolve(true);
    runSplashConnect();
    await new Promise(r => setTimeout(r, 500));
    const st = __splashState();
    __restoreSplash();
    return st;
  });
  ok(D6.hidden && D6.status === "Connecting to OneDrive…", `D6 a fast success hides the splash and never shows "Still connecting…" (status "${D6.status}")`);

  // D7: the late case — data lands AFTER the error box shows; the splash
  // clears with no Retry tap.
  await page.evaluate(SPLASH_STUB);
  const D7 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ slow: 200, data: 600 });
    let resolveFetch;
    window.ensureLiveNavDataFetch = () => new Promise(r => { resolveFetch = r; });
    runSplashConnect();
    await new Promise(r => setTimeout(r, 750));
    const atError = __splashState();
    resolveFetch(true);
    await new Promise(r => setTimeout(r, 500));
    const after = __splashState();
    __restoreSplash();
    return { atError, after };
  });
  ok(D7.atError.error && !D7.atError.hidden, "D7 the error box shows at the overall timeout while the fetch is still out");
  ok(D7.after.hidden && !D7.after.error, "D8 when that fetch then brings real data, the splash clears and the error box goes away — no Retry tap");

  // D9: after the error shows, no NEW attempts start (Retry is what starts fresh).
  await page.evaluate(SPLASH_STUB);
  const D9 = await page.evaluate(async () => {
    // Each attempt takes 200ms and answers false; retries 10ms apart, so
    // attempts run 0-200, 210-410, 420-620ms — the third is IN FLIGHT when
    // the error shows at 500ms. That in-flight attempt failing must not
    // start another one.
    __setSplashTimingsForTest({ slow: 100, data: 500, retry: 10 });
    window.ensureLiveNavDataFetch = () => { window.__ensureCalls++; return new Promise(r => setTimeout(() => r(false), 200)); };
    runSplashConnect();
    await new Promise(r => setTimeout(r, 520));
    const atError = window.__ensureCalls;
    const error = __splashState().error;
    await new Promise(r => setTimeout(r, 700));
    const later = window.__ensureCalls;
    __restoreSplash();
    return { atError, later, error };
  });
  ok(D9.error && D9.atError >= 3 && D9.later === D9.atError, `D9 attempts repeat until the error shows; an attempt still in flight then failing starts no new one (${D9.atError} attempts by the error, ${D9.later} after)`);

  // D10–D11: end to end through the REAL chain — a core sheet hangs on the
  // first try; the per-request timeout ends it, the splash's own retry starts
  // a fresh request, and the splash clears before the overall timeout with
  // no Retry tap and no error.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE);
  const D10 = await page.evaluate(async () => {
    __setDocketWriteEnabledForTest(false);
    __setSplashTimingsForTest({ request: 300, data: 1500, slow: 1000, retry: 50 });
    const coreOk = window.__coreOk();
    window.__fakeRoutes["*"] = (u, init, n) => (/'All'/.test(u) && n === 0) ? "hang-signal" : coreOk(u, init, n);
    const t0 = Date.now();
    runSplashConnect();
    let hiddenAt = null;
    for (let i = 0; i < 60 && hiddenAt === null; i++) {
      await new Promise(r => setTimeout(r, 50));
      if (document.getElementById("splashScreen").classList.contains("hidden")) hiddenAt = Date.now() - t0;
    }
    const error = !document.getElementById("splashErrorBox").classList.contains("hidden");
    const allCalls = window.__fakeCalls.filter(c => c.key === "All").length;
    __setDocketWriteEnabledForTest(null);
    __setSplashTimingsForTest(null);
    splashConnectGeneration++;
    return { hiddenAt, error, allCalls };
  });
  ok(D10.hiddenAt !== null && D10.hiddenAt < 1500 && !D10.error, `D10 a request that hangs once is retried automatically and the splash clears before the overall timeout, no error (hidden at ${D10.hiddenAt}ms)`);
  ok(D10.allCalls === 2, `D11 ...via exactly one fresh request (All requested ${D10.allCalls}x)`);

  // ================================================================
  // F. getJson()/loadDocketQueue(): text first, status + byte length
  //    recorded, empty body = temporary failure (commit F).
  // ================================================================
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE);
  const F1 = await page.evaluate(async () => {
    window.__fakeRoutes.docket = () => Promise.resolve(new Response("", { status: 200 }));
    let err = null;
    try { await graph().getJson("CoinCollection/_Testing/Staging/_Docket/docket.json"); } catch (e) { err = { name: e.name, status: e.status, bytes: e.bytes, message: e.message }; }
    window.__fakeRoutes.docket = () => Promise.resolve(new Response("  \n ", { status: 200 }));
    let errWs = null;
    try { await graph().getJson("CoinCollection/_Testing/Staging/_Docket/docket.json"); } catch (e) { errWs = { name: e.name, bytes: e.bytes }; }
    return { err, errWs };
  });
  ok(F1.err && F1.err.name === "EmptyBodyError" && F1.err.status === 200 && F1.err.bytes === 0,
    `F1 an "OK" response with an empty body throws a distinct EmptyBodyError carrying status 200 and 0 bytes, not an opaque JSON parse error (got ${JSON.stringify(F1.err)})`);
  ok(F1.errWs && F1.errWs.name === "EmptyBodyError" && F1.errWs.bytes === 4, `F2 a whitespace-only body counts as empty too (${JSON.stringify(F1.errWs)})`);

  // F3–F7: through loadDocketQueue() — empty once, then a real body.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE);
  const F3 = await page.evaluate(async () => {
    const logged = [];
    const origInfo = console.info;
    console.info = (...a) => { logged.push(a.join(" ")); };
    const goodText = JSON.stringify({ type: "docket-queue", version: 1, entries: [{ entryId: "DQ-é1", status: "open" }] });
    const goodBytes = new TextEncoder().encode(goodText).length;
    window.__fakeRoutes.docket = (u, init, n) => n === 0
      ? Promise.resolve(new Response("", { status: 200 }))
      : Promise.resolve(new Response(goodText, { status: 200 }));
    const first = await __guard(loadDocketQueue());
    const diagAfterEmpty = __getDocketQueueDiagnosticForTest();
    const cachedAfterEmpty = __getLiveDocketQueueForTest();
    const renderedEmpty = describeDiagnosticEntry(diagAfterEmpty);
    const second = await __guard(loadDocketQueue());
    const diagAfterOk = __getDocketQueueDiagnosticForTest();
    console.info = origInfo;
    return {
      first, diagAfterEmpty, cachedAfterEmpty, renderedEmpty,
      secondOk: !!(second && second.entries && second.entries.length === 1),
      diagAfterOk, goodBytes, renderedOk: describeDiagnosticEntry(diagAfterOk),
      calls: window.__fakeCalls.filter(c => c.key === "docket").length, logged
    };
  });
  ok(F3.first === null && F3.cachedAfterEmpty === null, "F3 an empty Docket body is a temporary failure: loadDocketQueue() returns null and caches nothing");
  ok(F3.diagAfterEmpty.kind === "empty-body" && F3.diagAfterEmpty.status === 200 && F3.diagAfterEmpty.bytes === 0,
    `F4 the diagnostic records kind "empty-body" with status 200 and 0 bytes (got ${JSON.stringify(F3.diagAfterEmpty)})`);
  ok(F3.secondOk && F3.calls === 2, `F5 the next call retries with a fresh request and loads the real queue (${F3.calls} requests)`);
  ok(F3.diagAfterOk.kind === "ok" && F3.diagAfterOk.status === 200 && F3.diagAfterOk.bytes === F3.goodBytes,
    `F6 a successful read records its status and exact byte length (got ${JSON.stringify(F3.diagAfterOk)}, expected ${F3.goodBytes} bytes)`);
  ok(F3.logged.some(l => /Docket queue read: HTTP 200, 0 bytes/.test(l)) && F3.logged.some(l => new RegExp("HTTP 200, " + F3.goodBytes + " bytes").test(l)),
    `F7 both reads are logged to the console with status and byte length (${JSON.stringify(F3.logged)})`);
  ok(/empty body \(HTTP 200, 0 bytes\)/.test(F3.renderedEmpty) && /ok \(HTTP 200, \d+ bytes\)/.test(F3.renderedOk),
    `F8 the splash's diagnostic detail shows them (empty: "${F3.renderedEmpty}"; ok: "${F3.renderedOk}")`);

  // F9: a missing file is still the normal first-run state (empty queue), with HTTP 404 recorded.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE);
  const F9 = await page.evaluate(async () => {
    window.__fakeRoutes.docket = () => Promise.resolve(new Response("not found", { status: 404 }));
    const q = await __guard(loadDocketQueue());
    return { ok: !!(q && Array.isArray(q.entries) && q.entries.length === 0), diag: __getDocketQueueDiagnosticForTest() };
  });
  ok(F9.ok && F9.diag.kind === "ok" && F9.diag.status === 404, `F9 a 404 is still the first-run empty queue, and is recorded as HTTP 404 (got ${JSON.stringify(F9.diag)})`);

  // F10: malformed (non-empty) JSON is still an ordinary exception, not cached.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE);
  const F10 = await page.evaluate(async () => {
    window.__fakeRoutes.docket = () => Promise.resolve(new Response("{\"type\": \"docket-q", { status: 200 }));
    const q = await __guard(loadDocketQueue());
    return { q, diag: __getDocketQueueDiagnosticForTest(), cached: __getLiveDocketQueueForTest() };
  });
  ok(F10.q === null && F10.cached === null && F10.diag.kind === "exception" && F10.diag.bytes === 18,
    `F10 a truncated (non-empty) body is still an ordinary failure, not cached, with its byte length recorded (got ${JSON.stringify(F10.diag)})`);

  // F11: the splash headline counts an empty body as a failed request.
  const F11 = await page.evaluate(() => {
    __setLiveNavDataDiagnosticsForTest({ All: { kind: "ok", rowCount: 5 } });
    __setDocketQueueDiagnosticForTest({ kind: "empty-body", status: 200, bytes: 0 });
    return buildSplashDiagnosticText();
  });
  ok(/request\(s\) failed/i.test(F11) && /Docket queue: empty body \(HTTP 200, 0 bytes\)/.test(F11), `F11 the splash detail headline treats an empty body as a failed request and names it (${F11.split("\n")[0]})`);

  // ================================================================
  // G. Missing non-essential sheets are refetched on the next call (commit 5).
  //    A routed fake: window.__sheetMode[sheet] = "ok" | "hang" | "fail" |
  //    a function returning a Response promise.
  // ================================================================
  const LIVE_ROUTER = () => {
    window.__liveSheets = {
      All: [["CollectionID", "Year", "Denomination", "Obverse", "Reverse"], ["AY-90001", 1909, "1C", "", ""]],
      DB_Sets: [["SetID", "Lineage", "Description", "Year"], ["S-1", "Proof Set", "Test Proof Set", 1999], ["S-1909-AL-01", "", "Live Test Album", 1909]],
      Albums: [["AlbumID", "Year", "MintMark", "Description", "CoinID", "FilledBy"], ["S-1909-AL-01", 1909, "", "Lincoln", "C-1909--1C-01", ""]],
      Photos: [["PhotoID", "CollectionID", "PhotoType", "Filename"], ["PH-1", "AY-90001", "Obverse", "AY-90001_obverse_cropped.jpg"]]
    };
    window.__sheetMode = {};
    window.__fakeRoutes["*"] = (u, init, n) => {
      const m = /worksheets\('([^']+)'\)/.exec(u);
      const sheet = m ? decodeURIComponent(m[1]) : "";
      const mode = window.__sheetMode[sheet] || "ok";
      if (typeof mode === "function") return mode(u, init, n);
      if (mode === "hang") return "hang-signal";
      if (mode === "fail") return Promise.resolve(new Response("{}", { status: 500 }));
      return window.__sheet(window.__liveSheets[sheet] || [["Header"]]);
    };
    window.__countFor = sheet => window.__fakeCalls.filter(c => c.key === sheet).length;
    window.__countAll = () => window.__fakeCalls.length;
  };

  // G1–G6: Albums times out at startup; the next call refetches only Albums,
  // without waiting, and live albums replace the demo ones. A third call
  // makes no requests at all.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(LIVE_ROUTER);
  const G1 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 300 });
    __setLiveAlbumsForTest(null);
    window.__sheetMode.Albums = "hang";
    const startup = await __guard(ensureLiveNavDataFetch());
    const missingAfterStartup = missingLiveNavOptionalSheets();
    const albumsAfterStartup = activeAlbums() === FAKE_ALBUMS;
    const countsBefore = { All: __countFor("All"), DB_Sets: __countFor("DB_Sets"), Photos: __countFor("Photos"), Albums: __countFor("Albums") };
    window.__sheetMode.Albums = "ok";
    const t0 = Date.now();
    const second = await ensureLiveNavDataFetch();
    const secondMs = Date.now() - t0;
    const refetch = liveNavOptionalFetchPromise;
    const refetchResult = await __guard(refetch || Promise.resolve("none"));
    const countsAfter = { All: __countFor("All"), DB_Sets: __countFor("DB_Sets"), Photos: __countFor("Photos"), Albums: __countFor("Albums") };
    const liveAlbumNames = activeAlbums().map(a => a.name);
    const missingAfterRefetch = missingLiveNavOptionalSheets();
    const totalBeforeThird = __countAll();
    const third = await ensureLiveNavDataFetch();
    await new Promise(r => setTimeout(r, 50));
    return {
      startup, missingAfterStartup, albumsAfterStartup, countsBefore, second, secondMs, refetchResult,
      countsAfter, liveAlbumNames, missingAfterRefetch, third,
      thirdRequests: __countAll() - totalBeforeThird, refetchAfterThird: liveNavOptionalFetchPromise
    };
  });
  ok(G1.startup === true && JSON.stringify(G1.missingAfterStartup) === '["Albums"]' && G1.albumsAfterStartup,
    `G1 Albums timing out at startup still lets startup succeed, Albums is recorded as missing, and the demo albums are what's showing (missing ${JSON.stringify(G1.missingAfterStartup)})`);
  ok(G1.second === true && G1.secondMs < 100, `G2 the next call answers at once without waiting on the refetch (${G1.secondMs}ms)`);
  ok(G1.countsAfter.Albums === G1.countsBefore.Albums + 1 && G1.countsAfter.All === G1.countsBefore.All && G1.countsAfter.DB_Sets === G1.countsBefore.DB_Sets && G1.countsAfter.Photos === G1.countsBefore.Photos,
    `G3 ...and refetches ONLY the missing sheet (before ${JSON.stringify(G1.countsBefore)}, after ${JSON.stringify(G1.countsAfter)})`);
  ok(G1.refetchResult === true && G1.liveAlbumNames.includes("Live Test Album") && G1.missingAfterRefetch.length === 0,
    `G4 the refetched Albums merges in: live albums replace the demo ones and nothing is missing any more (${JSON.stringify(G1.liveAlbumNames)})`);
  ok(G1.third === true && G1.thirdRequests === 0 && G1.refetchAfterThird === null, `G5 once every sheet has loaded, a call makes no requests at all (${G1.thirdRequests} requests)`);

  // G6–G8: a sheet that keeps failing — each call retries just it, and
  // nothing already loaded is touched.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(LIVE_ROUTER);
  const G6 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 300 });
    window.__sheetMode.Wishlist = "fail";
    await __guard(ensureLiveNavDataFetch());
    const albums = LIVE_ALBUMS, photos = LIVE_PHOTOS, coins = LIVE_COINS;
    const before = __countAll(), wishBefore = __countFor("Wishlist");
    for (let i = 0; i < 3; i++) { ensureLiveNavDataFetch(); await __guard(liveNavOptionalFetchPromise || Promise.resolve()); }
    return {
      missing: missingLiveNavOptionalSheets(),
      wishRequests: __countFor("Wishlist") - wishBefore, otherRequests: (__countAll() - before) - (__countFor("Wishlist") - wishBefore),
      untouched: LIVE_ALBUMS === albums && LIVE_PHOTOS === photos && LIVE_COINS === coins && !!albums && !!photos
    };
  });
  ok(JSON.stringify(G6.missing) === '["Wishlist"]' && G6.wishRequests === 3, `G6 a sheet that keeps failing stays missing and is retried once per call (${G6.wishRequests} Wishlist requests over 3 calls)`);
  ok(G6.otherRequests === 0, `G7 ...with no other sheet requested (${G6.otherRequests} other requests)`);
  ok(G6.untouched, "G8 already-loaded Albums, Photos and core data are untouched by those failed refetches");

  // G9–G10: a refetch that times out leaves loaded data alone; a forced
  // refresh where a loaded sheet times out keeps that sheet's data AND
  // doesn't mark it missing (it isn't refetched).
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(LIVE_ROUTER);
  const G9 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 300 });
    window.__sheetMode.Receipts = "hang";
    await __guard(ensureLiveNavDataFetch());
    const photos = LIVE_PHOTOS, albums = LIVE_ALBUMS, receipts = LIVE_RECEIPTS;
    ensureLiveNavDataFetch();
    const r = await __guard(liveNavOptionalFetchPromise || Promise.resolve("none"));
    const afterTimeout = { r, photos: LIVE_PHOTOS === photos, albums: LIVE_ALBUMS === albums, receipts: LIVE_RECEIPTS === receipts, missing: missingLiveNavOptionalSheets() };
    window.__sheetMode.Receipts = "ok";
    window.__sheetMode.Albums = "hang";
    const namesBefore = albums.map(a => a.name).join("|");
    const forced = await __guard(refreshLiveCoinsAfterWrite());
    // The albums object may be rebuilt (fresh DB_Sets + the cached Albums
    // rows); what must hold is that the live albums are still there.
    return { afterTimeout, forced, albumsKept: !!LIVE_ALBUMS && LIVE_ALBUMS.map(a => a.name).join("|") === namesBefore && activeAlbums() !== FAKE_ALBUMS,
      missingAfterForced: missingLiveNavOptionalSheets() };
  });
  ok(G9.afterTimeout.r === false && G9.afterTimeout.photos && G9.afterTimeout.albums && G9.afterTimeout.receipts && JSON.stringify(G9.afterTimeout.missing) === '["Receipts"]',
    `G9 a refetch that times out changes nothing already loaded and leaves only that sheet missing (${JSON.stringify(G9.afterTimeout)})`);
  ok(G9.forced === true && G9.albumsKept && G9.missingAfterForced.length === 0,
    `G10 a forced refresh where loaded Albums times out keeps the existing albums and doesn't re-mark them missing; the late Receipts arrives with it (missing ${JSON.stringify(G9.missingAfterForced)})`);

  // G11: a stale refetch never overwrites newer data.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(LIVE_ROUTER);
  const G11 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 300 });
    window.__sheetMode.Photos = "hang";
    await __guard(ensureLiveNavDataFetch());
    __setSplashTimingsForTest({ request: 60000 });
    let releaseOld;
    window.__sheetMode.Photos = () => new Promise(r => { releaseOld = r; });
    ensureLiveNavDataFetch();                    // starts the background Photos refetch (held open)
    const oldRefetch = liveNavOptionalFetchPromise;
    await new Promise(r => setTimeout(r, 30));   // let it actually issue its request
    window.__liveSheets.Photos = [["PhotoID", "CollectionID", "PhotoType", "Filename"], ["PH-NEW", "AY-90001", "Obverse", "NEW.jpg"]];
    window.__sheetMode.Photos = "ok";
    const forced = await __guard(refreshLiveCoinsAfterWrite()); // newer full fetch brings NEW.jpg
    const newAfterForced = (LIVE_PHOTOS["AY-90001"] || [])[0];
    if (releaseOld) releaseOld(new Response(JSON.stringify({ values: [["PhotoID", "CollectionID", "PhotoType", "Filename"], ["PH-OLD", "AY-90001", "Obverse", "OLD.jpg"]] }), { status: 200 }));
    const oldResult = await __guard(oldRefetch);
    const final = (LIVE_PHOTOS["AY-90001"] || [])[0];
    return { forced, newFile: newAfterForced && newAfterForced.filename, oldResult, finalFile: final && final.filename };
  });
  ok(G11.forced === true && G11.newFile === "NEW.jpg" && G11.oldResult === false && G11.finalFile === "NEW.jpg",
    `G11 an older refetch landing after a newer fetch is discarded — it can't overwrite newer data (final ${G11.finalFile}, stale result ${G11.oldResult})`);

  // G12: end to end through navigate("albums") — the list shows demo albums,
  // then swaps to the live album once the refetch lands, with no reload.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(LIVE_ROUTER);
  const G12 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 300 });
    __setLiveAlbumsForTest(null);
    window.__sheetMode.Albums = "hang";
    await __guard(ensureLiveNavDataFetch());
    window.__sheetMode.Albums = "ok";
    navigate("albums");
    const listText = () => document.getElementById("albumsListView").textContent;
    const before = listText();
    await __guard(liveNavOptionalFetchPromise || Promise.resolve());
    const after = listText();
    navigate("dashboard");
    return { beforeHasDemo: before.includes(FAKE_ALBUMS[0].name), beforeHasLive: before.includes("Live Test Album"),
      afterHasLive: after.includes("Live Test Album"), afterHasDemo: after.includes(FAKE_ALBUMS[0].name) };
  });
  ok(G12.beforeHasDemo && !G12.beforeHasLive && G12.afterHasLive && !G12.afterHasDemo,
    `G12 the Albums list re-renders from demo albums to the live album when the late Albums sheet arrives (${JSON.stringify(G12)})`);

  // G13: Photos arriving after the old All-column fallback was in use.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(LIVE_ROUTER);
  const G13 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 300 });
    LIVE_PHOTOS = null;
    window.__sheetMode.Photos = "hang";
    await __guard(ensureLiveNavDataFetch());
    const coin = () => activeCoins().find(c => c.id === "AY-90001");
    const missingBefore = coinMissingPhoto(coin());
    window.__sheetMode.Photos = "ok";
    ensureLiveNavDataFetch();
    await __guard(liveNavOptionalFetchPromise || Promise.resolve());
    return { missingBefore, missingAfter: coinMissingPhoto(coin()) };
  });
  ok(G13.missingBefore === true && G13.missingAfter === false,
    "G13 a coin whose only photo is on the Photos tab reads as photo-less while Photos is missing (the All-column fallback), and correctly as photographed once the late Photos sheet arrives");

  // ================================================================
  // H. Docket fast-fail (commit 6): a Docket read that fails FAST counts as
  //    ready once core data is in and the grace period has passed; the badge
  //    shows "?" until a later read succeeds.
  // ================================================================
  const DOCKET_FAKE = () => {
    window.__origEnsure = window.__origEnsure || window.ensureLiveNavDataFetch;
    // Draft listings / workbook link go through the same fake: answer 404
    // (no folder / no item) so the hub renders without hanging.
    window.__fakeRoutes.other = () => Promise.resolve(new Response("", { status: 404 }));
    window.__docketMode = "empty";
    window.__fakeRoutes.docket = () => {
      if (window.__docketMode === "empty") return Promise.resolve(new Response("", { status: 200 }));
      if (window.__docketMode === "http") return Promise.resolve(new Response("nope", { status: 503 }));
      const doc = { type: "docket-queue", version: 1, entries: [{ entryId: "DQ-1", status: "open", desc: "Test", year: "1909", mint: "S", denom: "1C", dateFlagged: "2026-10-04" }] };
      return Promise.resolve(new Response(JSON.stringify(doc), { status: 200 }));
    };
    window.__runSplash = async (dataReady, totalMs) => {
      window.ensureLiveNavDataFetch = () => Promise.resolve(dataReady);
      const t0 = Date.now();
      runSplashConnect();
      let hiddenAt = null, errorAt = null;
      while (Date.now() - t0 < totalMs) {
        await new Promise(r => setTimeout(r, 25));
        if (hiddenAt === null && document.getElementById("splashScreen").classList.contains("hidden")) hiddenAt = Date.now() - t0;
        if (errorAt === null && !document.getElementById("splashErrorBox").classList.contains("hidden")) errorAt = Date.now() - t0;
        if (hiddenAt !== null) break;
      }
      window.ensureLiveNavDataFetch = window.__origEnsure;
      splashConnectGeneration++;
      return { hiddenAt, errorAt };
    };
  };

  // H1–H3: empty-body Docket read, core data loaded.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(DOCKET_FAKE);
  const H1 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ grace: 400, data: 4000, retry: 50, slow: 3000 });
    window.__docketMode = "empty";
    const r = await __runSplash(true, 3000);
    return { ...r, reads: window.__fakeCalls.filter(c => c.key === "docket").length, cached: __getLiveDocketQueueForTest() };
  });
  ok(H1.hiddenAt !== null && H1.hiddenAt >= 380 && H1.hiddenAt < 1200 && H1.errorAt === null,
    `H1 core data loaded + a fast-failing (empty body) Docket read: the splash clears once the grace period passes, no error (hidden at ${H1.hiddenAt}ms, grace 400ms)`);
  ok(H1.reads >= 2, `H2 the Docket read was retried rather than given up on at the first failure (${H1.reads} reads)`);
  ok(H1.cached === null, "H3 nothing is cached from the failed read, so the next Docket load retries");

  // H4: HTTP error, same.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(DOCKET_FAKE);
  const H4 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ grace: 400, data: 4000, retry: 50, slow: 3000 });
    window.__docketMode = "http";
    return __runSplash(true, 3000);
  });
  ok(H4.hiddenAt !== null && H4.hiddenAt < 1200 && H4.errorAt === null, `H4 the same for an HTTP error from the Docket read (hidden at ${H4.hiddenAt}ms)`);

  // H5: a successful Docket read is unchanged — clears straight away, no grace wait.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(DOCKET_FAKE);
  const H5 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ grace: 2000, data: 4000, retry: 50, slow: 3000 });
    window.__docketMode = "ok";
    return __runSplash(true, 3000);
  });
  ok(H5.hiddenAt !== null && H5.hiddenAt < 600, `H5 a successful Docket read still clears the splash straight away, without waiting out the grace period (${H5.hiddenAt}ms, grace 2000ms)`);

  // H6: core data NOT loaded — unchanged: no clearing after the grace period.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(DOCKET_FAKE);
  const H6 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ grace: 200, data: 900, retry: 50, slow: 3000 });
    window.__docketMode = "empty";
    return __runSplash(false, 1300);
  });
  ok(H6.hiddenAt === null && H6.errorAt !== null && H6.errorAt >= 850, `H6 with core data not loaded, a failed Docket read never clears the splash; the error shows at the overall timeout as before (error at ${H6.errorAt}ms)`);

  // H7–H11: the badge after a failed read, then after a later successful one.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(DOCKET_FAKE);
  const H7 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 2000 });
    const badgeState = () => {
      const b = document.getElementById("needsAttentionBadge");
      return {
        text: b.textContent, visible: !b.classList.contains("hidden"), aria: b.getAttribute("aria-label"),
        research: document.getElementById("docketResearchCount").textContent,
        unknownNote: document.getElementById("docketResearchUnknownNote").style.display,
        emptyNote: document.getElementById("docketResearchEmptyNote").style.display
      };
    };
    window.__docketMode = "empty";
    await renderNeedsAttentionHub();
    const failed = badgeState();
    window.__docketMode = "ok";
    await loadDocketQueue();                        // a later read succeeds...
    await new Promise(r => setTimeout(r, 400));     // ...and the hub refreshes itself
    const after = badgeState();
    return { failed, after };
  });
  ok(H7.failed.text === "?" && H7.failed.visible && /unknown/i.test(H7.failed.aria),
    `H7 after a failed Docket read the drawer fob shows "?" (an explicit unknown), not "0" or nothing (${JSON.stringify(H7.failed)})`);
  ok(H7.failed.research === "?", `H8 the Research section count shows "?" too (${H7.failed.research})`);
  ok(H7.failed.unknownNote === "block" && H7.failed.emptyNote === "none", "H9 the Research section says the queue couldn't be read, instead of \"Nothing waiting on research\"");
  ok(/^\d+$/.test(H7.after.text) && Number(H7.after.text) >= 1 && H7.after.research === "1",
    `H10 once a later read succeeds, the fob and Research count show the real numbers on their own (fob ${H7.after.text}, research ${H7.after.research})`);
  ok(H7.after.unknownNote === "none" && !/unknown/i.test(H7.after.aria), "H11 ...and the unknown note and label are cleared");

  // H12: with the Docket write layer off, nothing is "unknown" — the in-memory queue is the real one.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(DOCKET_FAKE);
  const H12 = await page.evaluate(async () => {
    __setDocketWriteEnabledForTest(false);
    await renderNeedsAttentionHub();
    const b = document.getElementById("needsAttentionBadge");
    const out = { text: b.textContent, research: document.getElementById("docketResearchCount").textContent };
    __setDocketWriteEnabledForTest(null);
    return out;
  });
  ok(H12.text !== "?" && H12.research !== "?", `H12 with the Docket write layer off there's no "?" — that queue is in memory and known (fob "${H12.text}", research "${H12.research}")`);

  // ================================================================
  // I. No demo albums in a live session (commit 7). __setLiveDataModeForTest
  //    stands in for "MSAL loaded + signed in" (real MSAL can't load here).
  // ================================================================
  const ALBUM_STATE = () => {
    window.__albumsView = () => {
      const list = document.getElementById("albumsListContainer");
      const note = document.getElementById("albumsStatusNote");
      return {
        cards: list.querySelectorAll(".album-card").length,
        text: list.textContent,
        state: note ? note.dataset.state : null,
        demoShown: FAKE_ALBUMS.some(a => list.textContent.includes(a.name)),
        liveShown: list.textContent.includes("Live Test Album")
      };
    };
  };

  // I1–I2: live, nothing loaded yet, load in flight — "still loading", no demo albums.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(LIVE_ROUTER); await page.evaluate(ALBUM_STATE);
  const I1 = await page.evaluate(async () => {
    __setLiveDataModeForTest("live");
    __setSplashTimingsForTest({ request: 60000 });
    window.__sheetMode.All = "hang";
    navigate("albums");
    await new Promise(r => setTimeout(r, 30));
    const v = __albumsView();
    navigate("dashboard");
    restartStartupFetches();
    return v;
  });
  ok(I1.state === "loading" && /still loading/i.test(I1.text), `I1 live session, albums not loaded yet: the Albums screen says they're still loading (state ${I1.state})`);
  ok(I1.cards === 0 && !I1.demoShown, `I2 ...and shows no album cards and no demo album anywhere (${I1.cards} cards)`);

  // I3–I8: every other consumer shows nothing while live albums are missing.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(ALBUM_STATE);
  const I3 = await page.evaluate(async () => {
    __setLiveDataModeForTest("live");
    const demoCoin = FAKE_COINS.find(c => FAKE_ALBUMS.some(a => a.slots.some(s => s.filledBy === c.id)));
    const link = resolveCoinAlbumLink(demoCoin);
    populateAssignAlbumOptions();
    const assignOptions = document.getElementById("assignAlbum").options.length;
    const assignText = document.getElementById("assignAlbum").textContent;
    navigate("browse");
    showBrowseDetail(demoCoin);
    const detailText = document.getElementById("view-browse").textContent;
    navigate("albums");
    const before = { list: document.getElementById("albumsListView").style.display, detail: document.getElementById("albumsDetailView").style.display };
    let threw = null;
    try { await showAlbumDetail(0); await openAlbumFromLink(0); } catch (e) { threw = e.message; }
    const after = { list: document.getElementById("albumsListView").style.display, detail: document.getElementById("albumsDetailView").style.display };
    navigate("dashboard");
    return {
      activeLen: activeAlbums().length, link, assignOptions,
      assignHasDemo: FAKE_ALBUMS.some(a => assignText.includes(a.name)),
      detailHasDemo: FAKE_ALBUMS.some(a => detailText.includes(a.name)),
      demoCoinId: demoCoin && demoCoin.id, before, after, threw
    };
  });
  ok(I3.activeLen === 0, "I3 activeAlbums() is empty in a live session before live albums load — never FAKE_ALBUMS");
  ok(I3.link === null && !I3.detailHasDemo, `I4 the Browse "Belongs to Album" chip finds nothing and no demo album appears on the coin's detail page (coin ${I3.demoCoinId})`);
  ok(I3.assignOptions === 1 && !I3.assignHasDemo, `I5 Add Coin's "Assign to Album" dropdown holds only its "not part of an album" placeholder (${I3.assignOptions} option)`);
  ok(!I3.threw && I3.after.detail !== "block" && I3.after.list === I3.before.list, `I6 the Albums book can't be opened on an empty list — showAlbumDetail()/openAlbumFromLink() leave the list in place, no error (${JSON.stringify(I3.after)}${I3.threw ? ", threw: " + I3.threw : ""})`);

  // I7–I10: Albums times out at startup (couldn't-load), then arrives on reopen.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(LIVE_ROUTER); await page.evaluate(ALBUM_STATE);
  const I7 = await page.evaluate(async () => {
    __setLiveDataModeForTest("live");
    __setSplashTimingsForTest({ request: 300 });
    window.__sheetMode.Albums = "hang";
    navigate("albums");
    const atStart = __albumsView();
    await __guard(liveNavDataFetchPromise || Promise.resolve());
    await new Promise(r => setTimeout(r, 30));
    const afterTimeout = __albumsView();
    window.__sheetMode.Albums = "ok";
    navigate("dashboard");
    navigate("albums");                        // reopen: refetches the missing Albums sheet
    const onReopen = __albumsView();
    await __guard(liveNavOptionalFetchPromise || Promise.resolve());
    const arrived = __albumsView();
    navigate("dashboard");
    return { atStart, afterTimeout, onReopen, arrived, status: liveAlbumsStatus() };
  });
  ok(I7.atStart.state === "loading" && !I7.atStart.demoShown, `I7 while the startup fetch is in flight: "still loading", no demo albums (${I7.atStart.state})`);
  ok(I7.afterTimeout.state === "failed" && /couldn't load albums/i.test(I7.afterTimeout.text) && !I7.afterTimeout.demoShown,
    `I8 when the Albums read times out, the screen switches by itself to "Couldn't load albums; will try again when you reopen this screen" (${I7.afterTimeout.state})`);
  ok(I7.onReopen.state === "loading", `I9 reopening the screen retries and says it's loading again (${I7.onReopen.state})`);
  ok(I7.arrived.state === null && I7.arrived.liveShown && I7.arrived.cards === 1 && !I7.arrived.demoShown && I7.status === "ready",
    `I10 when the albums arrive, the live album fills the screen by itself — no demo albums (${JSON.stringify({ cards: I7.arrived.cards, live: I7.arrived.liveShown })})`);

  // I11: a refetch that fails (HTTP 500) — couldn't-load state.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(LIVE_ROUTER); await page.evaluate(ALBUM_STATE);
  const I11 = await page.evaluate(async () => {
    __setLiveDataModeForTest("live");
    __setSplashTimingsForTest({ request: 300 });
    window.__sheetMode.Albums = "fail";
    await __guard(ensureLiveNavDataFetch());
    navigate("albums");                        // starts the refetch, which also fails
    await __guard(liveNavOptionalFetchPromise || Promise.resolve());
    await new Promise(r => setTimeout(r, 30));
    const v = __albumsView();
    navigate("dashboard");
    return v;
  });
  ok(I11.state === "failed" && I11.cards === 0 && !I11.demoShown, `I11 when the refetch fails, the screen shows the couldn't-load state and no demo albums (${I11.state})`);

  // I12–I13: the open-book case. Before live albums exist there is no album
  // to open, so no book can be holding a demo album when live ones land;
  // after they land, the book opens on the live album.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(LIVE_ROUTER); await page.evaluate(ALBUM_STATE);
  const I12 = await page.evaluate(async () => {
    __setLiveDataModeForTest("live");
    __setSplashTimingsForTest({ request: 300 });
    window.__sheetMode.Albums = "hang";
    await __guard(ensureLiveNavDataFetch());
    navigate("albums");
    const indexBefore = currentAlbumIndex;
    let threw = null;
    try { await showAlbumDetail(0); } catch (e) { threw = e.message; } // nothing to open
    const openedWhileMissing = document.getElementById("albumsDetailView").style.display === "block";
    const indexUnchanged = currentAlbumIndex === indexBefore;
    window.__sheetMode.Albums = "ok";
    await __guard(liveNavOptionalFetchPromise || Promise.resolve()); // the refetch navigate() started — still hanging
    navigate("dashboard"); navigate("albums");
    await __guard(liveNavOptionalFetchPromise || Promise.resolve());
    await showAlbumDetail(0);
    const bookText = document.getElementById("albumsDetailContainer").textContent;
    navigate("dashboard");
    return { threw, openedWhileMissing, indexUnchanged, bookHasLive: bookText.includes("Live Test Album"),
      bookHasDemo: FAKE_ALBUMS.some(a => bookText.includes(a.name)) };
  });
  ok(!I12.threw && !I12.openedWhileMissing && I12.indexUnchanged, "I12 while live albums are missing no book can be opened, so no book can be holding a demo album when the live ones arrive");
  ok(I12.bookHasLive && !I12.bookHasDemo, "I13 once they arrive, the book opens on the live album with nothing from a demo album in it");

  // I14–I16: offline mockup and signed-out are unchanged — demo albums by design.
  await page.evaluate(RESET); await page.evaluate(ALBUM_STATE);
  const I14 = await page.evaluate(async () => {
    const realMode = liveDataMode();                   // no MSAL in this sandbox: the real offline mockup
    navigate("albums");
    const offline = __albumsView();
    __setLiveDataModeForTest("signed-out");
    navigate("dashboard"); navigate("albums");
    const signedOut = __albumsView();
    navigate("dashboard");
    return { realMode, offline, signedOut, offlineIsFake: (__setLiveDataModeForTest(null), activeAlbums() === FAKE_ALBUMS) };
  });
  ok(I14.realMode === "offline" && I14.offlineIsFake, `I14 with no MSAL (this sandbox) the app is in the offline mockup and still uses FAKE_ALBUMS (${I14.realMode})`);
  ok(I14.offline.cards === 3 && I14.offline.demoShown && I14.offline.state === null, `I15 the offline mockup's Albums screen is unchanged: demo album cards, no status note (${I14.offline.cards} cards)`);
  ok(I14.signedOut.cards === 3 && I14.signedOut.state === null, "I16 the signed-out state is left exactly as it was (shows the offline mockup's albums)");

  // ================================================================
  // J. Splash backoff between fresh attempts (commit 8). A fresh attempt =
  //    one set of reads (nine sheets + the Docket read), so the "All" sheet
  //    request is counted as "one attempt".
  // ================================================================
  const SPLASH_RUN = () => {
    window.__splashRun = async (totalMs, opts) => {
      opts = opts || {};
      const t0 = Date.now();
      runSplashConnect();
      if (opts.retryAt) {
        await new Promise(r => setTimeout(r, opts.retryAt));
        window.__retryClickedAt = Date.now() - t0;
        document.getElementById("splashRetryBtn").click();
      }
      if (opts.release) {
        await new Promise(r => setTimeout(r, opts.releaseAt));
        opts.release();
      }
      let hiddenAt = null;
      while (Date.now() - t0 < totalMs) {
        await new Promise(r => setTimeout(r, 25));
        if (hiddenAt === null && document.getElementById("splashScreen").classList.contains("hidden")) { hiddenAt = Date.now() - t0; break; }
      }
      const attempts = window.__fakeCalls.filter(c => c.key === "All").map(c => c.at - t0);
      const errorShown = !document.getElementById("splashErrorBox").classList.contains("hidden");
      splashConnectGeneration++;
      return { attempts, total: window.__fakeCalls.length, hiddenAt, errorShown };
    };
  };
  const FAST_FAIL = () => { window.__fakeRoutes["*"] = () => Promise.reject(new TypeError("Failed to fetch")); };

  const J0 = await page.evaluate(() => ({ backoff: SPLASH_BACKOFF_MS, max: SPLASH_MAX_ATTEMPTS }));
  ok(JSON.stringify(J0.backoff) === "[2000,4000,8000]" && J0.max === 6, `J0 the schedule is 2s, 4s, 8s (repeating) with a cap of 6 fresh attempts (${JSON.stringify(J0)})`);

  // J1–J5: the real 25-second window, every request failing immediately.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(SPLASH_RUN); await page.evaluate(FAST_FAIL);
  const J1 = await page.evaluate(() => __splashRun(25600));
  const gaps = J1.attempts.slice(1).map((t, i) => t - J1.attempts[i]);
  ok(J1.attempts.length >= 1 && J1.attempts[0] < 100, `J1 the first attempt goes out immediately (${J1.attempts[0]}ms)`);
  ok(J1.attempts.length <= 6 && J1.attempts.length >= 4, `J2 a fast-failing network gets ${J1.attempts.length} fresh attempts in the 25s window, within the cap of 6 (at ${JSON.stringify(J1.attempts)}ms)`);
  ok(gaps.length >= 3 && gaps[0] >= 1900 && gaps.every((g, i) => i === 0 || g >= gaps[i - 1] - 100),
    `J3 the delays between attempts grow: ${JSON.stringify(gaps)}ms`);
  ok(J1.total <= 70, `J4 total Graph requests in the window: ${J1.total} (was ~625 with a fresh set every 400ms)`);
  ok(J1.errorShown && J1.hiddenAt === null, "J5 the error still shows at the end of the window when nothing ever loads");

  // J6: a hung request still holds one shared request — nothing new while it's in flight.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(SPLASH_RUN);
  const J6 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ request: 60000, data: 3000, retry: 25, backoff: [50] });
    window.__fakeRoutes["*"] = (u) => /'All'/.test(u) ? "hang-signal" : Promise.reject(new TypeError("Failed to fetch"));
    const r = await __splashRun(1500);
    restartStartupFetches();
    return r;
  });
  ok(J6.attempts.length === 1 && J6.total === 10, `J6 while a read hangs, the checks send nothing new: 1 attempt, ${J6.total} requests in 1.5s (backoff only 50ms)`);

  // J7–J8: Retry starts a fresh attempt at once and resets the schedule.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(SPLASH_RUN); await page.evaluate(FAST_FAIL);
  const J7 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ data: 5000, retry: 25, backoff: [1000, 2000, 4000] });
    const r = await __splashRun(1600, { retryAt: 300 });
    return { ...r, retryAt: window.__retryClickedAt };
  });
  ok(J7.attempts.length >= 2 && J7.attempts[1] - J7.retryAt < 100, `J7 tapping Retry sends a fresh attempt at once (attempts at ${JSON.stringify(J7.attempts)}ms, Retry at ${J7.retryAt}ms)`);
  ok(J7.attempts.length === 3 && Math.abs((J7.attempts[2] - J7.attempts[1]) - 1000) < 200,
    `J8 ...and restarts the schedule: the next attempt comes ~1s later (the first delay), not 2s (${JSON.stringify(J7.attempts)})`);

  // J9: late data after the error box still clears the splash.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(SPLASH_RUN);
  const J9 = await page.evaluate(async () => {
    __setDocketWriteEnabledForTest(false);
    __setSplashTimingsForTest({ request: 60000, data: 600, retry: 25 });
    const coreOk = window.__coreOk();
    let releaseAll;
    window.__fakeRoutes["*"] = (u, init, n) => /'All'/.test(u)
      ? new Promise(r => { releaseAll = () => r(coreOk(u, init, n)); })
      : coreOk(u, init, n);
    const r = await __splashRun(2000, { release: () => releaseAll && releaseAll(), releaseAt: 900 });
    __setDocketWriteEnabledForTest(null);
    return r;
  });
  ok(J9.hiddenAt !== null && J9.hiddenAt > 900, `J9 data arriving after the error box showed still clears the splash (hidden at ${J9.hiddenAt}ms, error at 600ms)`);

  // J10–J12: Retry-After on a 429 is honoured, and can't push past the window.
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(SPLASH_RUN);
  const J10 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ data: 5000, retry: 25, backoff: [50] });
    window.__fakeRoutes["*"] = () => Promise.resolve(new Response("slow down", { status: 429, headers: { "Retry-After": "1" } }));
    const r = await __splashRun(1500);
    return { ...r, diag: describeDiagnosticEntry(__getLiveNavDataDiagnosticsForTest().All) };
  });
  ok(J10.attempts.length === 2 && J10.attempts[1] - J10.attempts[0] >= 950,
    `J10 a 429 with Retry-After: 1 holds the next attempt back at least 1s even though the backoff is 50ms (${JSON.stringify(J10.attempts)})`);
  ok(/Retry-After 1s/.test(J10.diag), `J11 the diagnostic detail shows it (${J10.diag})`);
  await page.evaluate(RESET); await page.evaluate(INSTALL_FAKE); await page.evaluate(SPLASH_RUN);
  const J12 = await page.evaluate(async () => {
    __setSplashTimingsForTest({ data: 1000, retry: 25, backoff: [50] });
    window.__fakeRoutes["*"] = () => Promise.resolve(new Response("", { status: 503, headers: { "Retry-After": "100" } }));
    return __splashRun(1600);
  });
  ok(J12.attempts.length === 1 && J12.errorShown, `J12 a Retry-After longer than the remaining window means no further attempt; the error shows at the end of the window as usual (${J12.attempts.length} attempt)`);

  await page.evaluate(RESET);
}, module);
