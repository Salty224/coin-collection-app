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

  await page.evaluate(RESET);
}, module);
