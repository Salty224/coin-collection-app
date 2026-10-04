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

  await page.evaluate(RESET);
}, module);
