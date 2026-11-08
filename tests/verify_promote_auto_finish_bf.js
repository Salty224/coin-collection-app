// (bf) Promote finishes the row itself (8 Nov 2026).
//
// When Promote's key read-back is empty although Graph confirmed the key
// write ((ax) C'), Promote returns "finishing" at once and a background
// finisher re-checks (every 20 s, at most 5 minutes; fast here through
// __setPromoteFinishTimingForTest) until a read shows the id on exactly the
// row Graph confirmed, then runs the ordinary Promote on that row.
//
// The mock is the one verify_save_lag_ax uses: while `lag.on`, every READ sees
// the sheets as they were at lag.start(); writes land for real.
//
//   F1  Promote while reads lag: returns at once, finishing toast, card shows
//       "Finishing… row N" with no actions (Docket and Staging Review), row in coin.json
//   F2  lag ends: the finisher completes the SAME row; draft Promoted; marker cleared; toast
//   F3  during a finish: Promote joins it, Mark as promoted / Reject / Edit are refused
//   F4  another coin promoted during the finish gets a DIFFERENT row (A4)       [write safety]
//   F5  the lag never ends: gives up with the message; keys-only row; draft Ready; card note
//   F6  the id shows at ANOTHER row: stops, nothing written; a manual Promote too (Q5) [write safety]
//   F7  the id shows at 2 rows: stops, nothing written                          [write safety]
//   F8  a cell of row N holds a different value: refused, nothing overwritten  [write safety]
//   F9  after a reload (memory gone) the coin.json row makes Promote finish row N
//       with NO key write and no new claim                                       [write safety]
//   F10 Force Add finishes the same way (Q2)
//   F11 promoteCoinDraft (what Save to Database awaits) returns while the finisher runs (Q6)
//   F12 offline when the row shows: the fill is refused, draft stays Ready
//
// Negative controls (run by hand, 8 Nov 2026; docs/HISTORY.md (bf)):
//   NC1 drop the "row must be N" check in promoteCoinDraftToAllSheetUnlocked -> F6 fails
//   NC2 ignore coin.json's keysWrittenRow in pendingKeysRowFor               -> F9 fails
//   NC3 drop the claimedRows skip in findClaimableBlankRow                   -> F4 fails
const { defineSuite } = require("./harness");

const ALL = ["CollectionID", "CoinID", "Denomination", "Category", "Year", "MintMark", "Variety", "Description",
  "Finish", "Designation", "Grade", "GradeSource", "Cost", "Remarks", "Reviewed", "LastModified", "Status", "FaceValue"];
const MATCH_ROW = {
  denom: "1C", year: 1943, mint: "S", variety: "", description: "Lincoln Wheat",
  finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0,
  coinId: "C-1943-S-1C-01", composition: "Steel"
};
const READY_DRAFT = {
  type: "coin", version: 1, collectionID: "AY-00760",
  denom: "1C", year: "1943", mint: "S", variety: "", description: "Lincoln Wheat",
  finish: "Business Strike", category: "Coin", grade: "MS-66", gradeSource: "PCGS",
  coinId: "C-1943-S-1C-01", photos: [], allRowWritten: false, forceAdded: false
};

module.exports = defineSuite("promote-auto-finish-bf", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);

  await page.evaluate(({ ALL, MATCH_ROW, READY_DRAFT }) => {
    window.__toasts = [];
    window.showToast = (m) => { window.__toasts.push(String(m)); };
    window.__ALL = ALL;
    window.__coinRow = (id) => ALL.map(h => ({ CollectionID: id, CoinID: "C-1943-S-1C-01", Denomination: "1C", Category: "Coin",
      Year: 1943, MintMark: "S", Description: "Lincoln Wheat", Finish: "Business Strike", Grade: "MS-64", Cost: 5,
      LastModified: 46000.5, Status: "Owned" })[h] ?? "");
    window.__lagMock = (seed) => {
      const mock = createMockGraphClient(seed);
      const lag = { on: false, stale: null, patches: 0 };
      const wrapped = new Proxy(mock, { get(t, k) {
        const v = t[k];
        if (k === "patchWorkbookRanges") return (...a) => { lag.patches++; return v.apply(t, a); };
        if (typeof v !== "function" || !/^read/.test(String(k))) return v;
        return (...a) => {
          if (!lag.on) return v.apply(t, a);
          const live = {};
          Object.keys(lag.stale).forEach(sh => {
            live[sh] = t._grids[sh].slice();
            t._grids[sh].length = 0;
            lag.stale[sh].forEach(r => t._grids[sh].push(r.slice()));
          });
          try { return v.apply(t, a); }
          finally { Object.keys(live).forEach(sh => { t._grids[sh].length = 0; live[sh].forEach(r => t._grids[sh].push(r)); }); }
        };
      } });
      lag.start = () => { lag.stale = {}; Object.keys(mock._grids).forEach(sh => { lag.stale[sh] = mock._grids[sh].map(r => (r || []).slice()); }); lag.on = true; };
      return { mock, wrapped, lag };
    };
    window.__rowsWith = (grid, id) => grid.map((r, i) => ({ r, sheetRow: i + 1 })).filter(x => x.sheetRow > 1 && String(x.r[0] || "").trim() === id);
    window.__nonKey = (r) => r.filter((v, c) => c > 1 && v !== null && v !== undefined && v !== "").length;
    // The Docket re-renders itself on its own reads; wait for a finished one.
    window.__docketItem = async (id) => {
      navigate("needsdbcoins");
      renderNeedsAttentionHub();
      for (let i = 0; i < 60; i++) {
        await new Promise(res => setTimeout(res, 50));
        const el = [...document.querySelectorAll("#docketStagingContainer .wish-item, #docketResearchContainer .wish-item")].find(x => x.textContent.indexOf(id) !== -1);
        if (el) return el;
      }
      return null;
    };
    window.__draftPath = (id) => writePaths().stagingBase + "/" + id + "/coin.json";
    window.__setup = async (drafts) => {
      const grid = [ALL.slice(), __coinRow("AY-00001")];
      for (let i = 0; i < 6; i++) grid.push(ALL.map(() => ""));
      const m = __lagMock({ sheets: { All: grid } });
      __setGraphClientForTest(m.wrapped);
      __resetAllHeaderMapForTest();
      if (typeof __resetSheetHeaderMapsForTest === "function") __resetSheetHeaderMapsForTest();
      __setWorkbookSessionForTest({ source: "workbook", verified: true, dataAt: Date.now(), connection: "ok" });
      __setBrowseEditWriteEnabledForTest(true);
      __setAddCoinWriteEnabledForTest(true);
      __setLiveDbCoinsForTest([MATCH_ROW]);
      __setPromoteFinishTimingForTest(30, 4000);
      __setPromoteRelookMsForTest(0);
      for (const d of drafts) {
        await m.mock.uploadJson(__draftPath(d.collectionID),
          Object.assign({}, READY_DRAFT, d, { status: COIN_DRAFT_STATUS.READY, createdDate: new Date().toISOString() }));
      }
      window.__toasts = [];
      return m;
    };
    window.__teardown = async () => {
      // never leave a finisher running into the next block
      for (const id of ["AY-00760", "AY-00761"]) { const f = __promoteFinisherForTest(id); if (f) { try { await f; } catch (e) {} } }
      __setGraphClientForTest(null);
      __resetAllHeaderMapForTest();
      __setBrowseEditWriteEnabledForTest(null);
      __setAddCoinWriteEnabledForTest(null);
      __setLiveDbCoinsForTest(null);
      __setPromoteFinishTimingForTest(null, null);
      __setPromoteRelookMsForTest(1500);
      __setWorkbookSessionForTest({ source: "workbook", verified: true, dataAt: Date.now(), connection: "ok" });
      navigate("dashboard");
    };
  }, { ALL, MATCH_ROW, READY_DRAFT });

  // ---- F1, F2, F3, F11: the main flow -----------------------------------------------------
  const M = await page.evaluate(async () => {
    const { mock, lag } = await __setup([{ collectionID: "AY-00760" }]);
    const g = mock._grids.All;
    const out = {};
    lag.start();
    const t0 = Date.now();
    const r = await promoteCoinDraft("AY-00760");
    const finisher = __promoteFinisherForTest("AY-00760");
    let settled = false;
    if (finisher) finisher.then(() => { settled = true; });
    const rows1 = __rowsWith(g, "AY-00760");
    const d1 = await mock.getJson(__draftPath("AY-00760"));
    const docketRow = await __docketItem("AY-00760");
    navigate("staging"); await renderStagingList(); await new Promise(res => setTimeout(res, 300));
    const reviewRow = [...document.querySelectorAll("#stagingContainer .wish-item")].find(el => /AY-00760/.test(el.textContent));
    out.f1 = { r, ms: Date.now() - t0, finisher: !!finisher, toast: __toasts[0] || "", rows: rows1.map(x => ({ row: x.sheetRow, nonKey: __nonKey(x.r) })),
      markerRow: d1.keysWrittenRow, markerAt: !!d1.keysWrittenAt, status: d1.status,
      docketText: docketRow ? docketRow.textContent : null, docketButtons: docketRow ? docketRow.querySelectorAll("button").length : -1,
      reviewText: reviewRow ? reviewRow.textContent : null,
      reviewButtons: reviewRow ? [...reviewRow.querySelectorAll("button")].map(b => b.textContent + (b.disabled ? "(disabled)" : "")) : null };
    out.f11 = { returnedBeforeFinish: !!finisher && !settled };
    // F3: other actions while it finishes
    __toasts.length = 0;
    const again = await promoteCoinDraft("AY-00760");
    const mark = await markCoinDraftAlreadyPromoted("AY-00760");
    const edit = await beginCoinDraftEdit("AY-00760");
    rejectStagedCoin("AY-00760", null);
    const dialogOpen = !document.getElementById("writeGuardOverlay").classList.contains("hidden");
    out.f3 = { again, mark, edit, dialogOpen, toasts: __toasts.slice(), rows: __rowsWith(g, "AY-00760").length };
    // F2: the lag ends
    __toasts.length = 0;
    await new Promise(res => setTimeout(res, 100));
    lag.on = false;
    const fin = finisher ? await finisher : null;
    const rows2 = __rowsWith(g, "AY-00760");
    const d2 = await mock.getJson(__draftPath("AY-00760"));
    out.f2 = { fin: fin && { ok: fin.ok, rowNumber: fin.rowNumber, reason: fin.reason }, rows: rows2.map(x => ({ row: x.sheetRow, nonKey: __nonKey(x.r) })),
      status: d2.status, allRowWritten: d2.allRowWritten, markerRow: d2.keysWrittenRow, toasts: __toasts.slice(),
      timing: (__getSaveTimingForTest().last || {}).label, steps: ((__getSaveTimingForTest().last || {}).steps || []).map(s => s.name),
      finisherGone: !__promoteFinisherForTest("AY-00760") };
    await __teardown();
    return out;
  });
  const N = M.f1.rows.length === 1 ? M.f1.rows[0].row : -1;
  ok("F1 Promote while reads lag returns at once with the finishing toast; keys only on one row; the row is in coin.json (" + JSON.stringify(M.f1) + ")",
    M.f1.r === true && M.f1.finisher && M.f1.rows.length === 1 && M.f1.rows[0].nonKey === 0 &&
    M.f1.toast === "AY-00760: written to row " + N + "; Excel is slow to show new rows, so the app is finishing it by itself (up to 0 minutes). You can keep using the app." &&
    M.f1.markerRow === N && M.f1.markerAt && M.f1.status === "Ready for reconciliation");
  ok("F1 ...the Docket card says \"Finishing… row N\" and offers no action (" + JSON.stringify({ t: M.f1.docketText, b: M.f1.docketButtons }) + ")",
    !!M.f1.docketText && M.f1.docketText.indexOf("Finishing… row " + N) !== -1 && M.f1.docketButtons === 0);
  ok("F1 ...Staging Review shows one disabled \"Finishing…\" button and no Promote / Edit / Reject (" + JSON.stringify(M.f1.reviewButtons) + ")",
    !!M.f1.reviewText && M.f1.reviewText.indexOf("Finishing… row " + N) !== -1 &&
    JSON.stringify(M.f1.reviewButtons) === JSON.stringify(["Finishing…(disabled)"]));
  ok("F11 promoteCoinDraft (what Save to Database awaits) returned while the finisher was still running (" + JSON.stringify(M.f11) + ")",
    M.f11.returnedBeforeFinish === true);
  ok("F3 during a finish: Promote joins it, Mark as promoted / Edit / Reject are refused, still one row (" + JSON.stringify(M.f3) + ")",
    M.f3.again === true && M.f3.mark === false && M.f3.edit === false && !M.f3.dialogOpen && M.f3.rows === 1 &&
    M.f3.toasts.length === 4 && /already being finished \(row \d+\)/.test(M.f3.toasts[0]) &&
    M.f3.toasts.slice(1).every(t => t === "AY-00760 is being finished (row " + N + "); try again when that is done."));
  ok("F2 when the lag ends the finisher completes the SAME row: one complete row, draft Promoted, row marker cleared, success toast (" + JSON.stringify(M.f2) + ")",
    M.f2.fin && M.f2.fin.ok === true && M.f2.fin.rowNumber === N && M.f2.rows.length === 1 && M.f2.rows[0].row === N && M.f2.rows[0].nonKey > 3 &&
    M.f2.status === "Promoted" && M.f2.allRowWritten === true && M.f2.markerRow === null && M.f2.finisherGone &&
    M.f2.toasts.some(t => t === "AY-00760 finished: row " + N + " on the All sheet is complete and linked to C-1943-S-1C-01. Its draft is now marked promoted."));
  ok("F2 ...Docket > About gets a \"Promote AY-00760 (finishing)\" record with the re-checks (" + JSON.stringify({ l: M.f2.timing, s: M.f2.steps.slice(0, 4) }) + ")",
    M.f2.timing === "Promote AY-00760 (finishing)" && M.f2.steps.some(s => /^re-check \d+ \(\+\d+ s\): row \d+ not showing yet$/.test(s)) &&
    M.f2.steps.some(s => /^re-check \d+ \(\+\d+ s\): showing at row \d+$/.test(s)));

  // ---- F4: another coin during the finish gets a different row (A4) ------------------------
  const F4 = await page.evaluate(async () => {
    const { mock, lag } = await __setup([{ collectionID: "AY-00760" }, { collectionID: "AY-00761" }]);
    const g = mock._grids.All;
    lag.start();
    const a = await promoteCoinDraftToAllSheet("AY-00760", {});
    const b = await promoteCoinDraftToAllSheet("AY-00761", {});
    const mid = { a: __rowsWith(g, "AY-00760").map(x => x.sheetRow), b: __rowsWith(g, "AY-00761").map(x => x.sheetRow) };
    lag.on = false;
    const fa = await __promoteFinisherForTest("AY-00760");
    const fb = await __promoteFinisherForTest("AY-00761");
    const out = { a: a.reason, aRow: a.rowNumber, b: b.reason, bRow: b.rowNumber, mid, fa: fa && fa.ok, fb: fb && fb.ok,
      rowsA: __rowsWith(g, "AY-00760").map(x => ({ row: x.sheetRow, nonKey: __nonKey(x.r) })),
      rowsB: __rowsWith(g, "AY-00761").map(x => ({ row: x.sheetRow, nonKey: __nonKey(x.r) })) };
    await __teardown();
    return out;
  });
  ok("F4 another coin promoted while the first is finishing gets a DIFFERENT row; both finish complete (" + JSON.stringify(F4) + ")",
    F4.a === "finishing" && F4.b === "finishing" && F4.aRow !== F4.bRow &&
    F4.mid.a.length === 1 && F4.mid.b.length === 1 && F4.mid.a[0] === F4.aRow && F4.mid.b[0] === F4.bRow &&
    F4.fa === true && F4.fb === true && F4.rowsA.length === 1 && F4.rowsB.length === 1 &&
    F4.rowsA[0].nonKey > 3 && F4.rowsB[0].nonKey > 3);

  // ---- F5: the lag never ends: gives up ----------------------------------------------------
  const F5 = await page.evaluate(async () => {
    const { mock, lag } = await __setup([{ collectionID: "AY-00760" }]);
    const g = mock._grids.All;
    lag.start();
    await promoteCoinDraft("AY-00760");
    const fin = await __promoteFinisherForTest("AY-00760");
    const d = await mock.getJson(__draftPath("AY-00760"));
    lag.on = false;
    const docketRow = await __docketItem("AY-00760");
    const out = { fin: fin && { ok: fin.ok, reason: fin.reason, rowNumber: fin.rowNumber }, toasts: __toasts.slice(),
      rows: __rowsWith(g, "AY-00760").map(x => ({ row: x.sheetRow, nonKey: __nonKey(x.r) })), status: d.status, marker: d.keysWrittenRow,
      outcome: (__getSaveTimingForTest().last || {}).outcome,
      docketText: docketRow ? docketRow.textContent : null, docketPromote: docketRow ? !!docketRow.querySelector(".docket-promote") : null };
    await __teardown();
    return out;
  });
  const N5 = F5.rows.length ? F5.rows[0].row : -1;
  ok("F5 the lag never ends: gives up with the plain message; keys-only row; draft Ready with its row recorded (" + JSON.stringify(F5) + ")",
    F5.fin && F5.fin.ok === false && F5.fin.reason === "not-finished" && F5.rows.length === 1 && F5.rows[0].nonKey === 0 &&
    F5.status === "Ready for reconciliation" && F5.marker === N5 && /^not finished: row \d+ still not showing after \d+ s$/.test(F5.outcome || "") &&
    F5.toasts.some(t => t === "AY-00760: the keys went to row " + N5 + " (Graph confirmed), but Excel still isn't showing them after 0 minutes, so nothing else was written. The draft stays Ready. Tap Promote later and the app will finish row " + N5 + ". If Excel still shows nothing there after 10 minutes, check row " + N5 + " in Excel before trying again."));
  ok("F5 ...the Docket card says \"Not finished: row N has only its keys\" and offers Promote again (" + JSON.stringify({ t: F5.docketText, p: F5.docketPromote }) + ")",
    !!F5.docketText && F5.docketText.indexOf("Not finished: row " + N5 + " has only its keys") !== -1 && F5.docketPromote === true);

  // ---- F6 / F7: the id shows somewhere else ------------------------------------------------
  const F67 = await page.evaluate(async () => {
    const run = async (mutate) => {
      const { mock, lag } = await __setup([{ collectionID: "AY-00760" }]);
      const g = mock._grids.All;
      lag.start();
      const r = await promoteCoinDraftToAllSheet("AY-00760", { onFinished: res => afterPromoteFinished("AY-00760", res) });
      const N = r.rowNumber;
      mutate(g, N);                      // what Excel shows now
      const before = JSON.stringify(g);
      const patchesBefore = lag.patches;
      lag.on = false;
      const fin = await __promoteFinisherForTest("AY-00760");
      const unchanged = JSON.stringify(g) === before;
      // Q5: a manual Promote is stopped the same way
      const manual = await promoteCoinDraftToAllSheet("AY-00760", {});
      const out = { N, fin: fin && { ok: fin.ok, reason: fin.reason, rows: fin.rows }, unchanged, writes: lag.patches - patchesBefore,
        unchangedAfterManual: JSON.stringify(g) === before, manual: { ok: manual.ok, reason: manual.reason }, toasts: __toasts.slice() };
      await __teardown();
      return out;
    };
    const move = (g, N) => { g[N] = g[N - 1].slice(); g[N - 1] = g[N - 1].map(() => ""); };     // keys now one row lower
    const copy = (g, N) => { g[N] = g[N - 1].slice(); };                                         // keys on two rows
    return { f6: await run(move), f7: await run(copy) };
  });
  ok("F6 the id shows at ANOTHER row: the finisher stops with nothing written, a manual Promote too (Q5) (" + JSON.stringify(F67.f6) + ")",
    F67.f6.fin && F67.f6.fin.ok === false && F67.f6.fin.reason === "row-mismatch" && F67.f6.unchanged && F67.f6.writes === 0 &&
    F67.f6.manual.ok === false && F67.f6.manual.reason === "row-mismatch" && F67.f6.unchangedAfterManual &&
    F67.f6.toasts.some(t => t === "AY-00760: the app wrote row " + F67.f6.N + ", but Excel now shows it at row " + (F67.f6.N + 1) +
      ". Nothing more was written. Check both rows in Excel."));
  ok("F7 the id shows at 2 rows: stops with nothing written (" + JSON.stringify(F67.f7) + ")",
    F67.f7.fin && F67.f7.fin.ok === false && F67.f7.fin.reason === "row-mismatch" && F67.f7.unchanged && F67.f7.writes === 0 &&
    F67.f7.manual.reason === "row-mismatch" && F67.f7.unchangedAfterManual &&
    F67.f7.toasts.some(t => t === "AY-00760: the app wrote row " + F67.f7.N + ", but Excel now shows it at row " + F67.f7.N + " and row " + (F67.f7.N + 1) +
      ". Nothing more was written. Check those rows in Excel."));

  // ---- F8: a cell of row N already holds a different value ---------------------------------
  const F8 = await page.evaluate(async () => {
    const { mock, lag } = await __setup([{ collectionID: "AY-00760" }]);
    const g = mock._grids.All;
    lag.start();
    const r = await promoteCoinDraftToAllSheet("AY-00760", {});
    const N = r.rowNumber;
    g[N - 1][__ALL.indexOf("Grade")] = "AU-50"; // somebody typed into the row meanwhile
    lag.on = false;
    const fin = await __promoteFinisherForTest("AY-00760");
    const row = g[N - 1];
    const d = await mock.getJson(__draftPath("AY-00760"));
    const out = { fin: fin && { ok: fin.ok, reason: fin.reason }, grade: row[__ALL.indexOf("Grade")], nonKey: __nonKey(row), status: d.status };
    await __teardown();
    return out;
  });
  ok("F8 a cell of row N holds a different value: refused, nothing overwritten or filled, draft stays Ready (" + JSON.stringify(F8) + ")",
    F8.fin && F8.fin.ok === false && F8.fin.reason === "row-differs" && F8.grade === "AU-50" && F8.nonKey === 1 && F8.status === "Ready for reconciliation");

  // ---- F9: after a reload the coin.json row is used ----------------------------------------
  const F9 = await page.evaluate(async () => {
    const { mock, wrapped, lag } = await __setup([{ collectionID: "AY-00760" }]);
    const g = mock._grids.All;
    lag.start();
    const r1 = await promoteCoinDraftToAllSheet("AY-00760", {});
    const N = r1.rowNumber;
    await __promoteFinisherForTest("AY-00760"); // gives up (lag stays on)
    // "Reload": a new graph client clears this session's memory (claimed
    // rows, keys not visible); only coin.json remembers row N.
    __setGraphClientForTest(new Proxy(wrapped, {}));
    __resetAllHeaderMapForTest();
    const memoryGone = !__keysNotVisibleForTest().has("AY-00760") && __claimedRowsForTest("AllCoins").length === 0;
    const patchesBefore = lag.patches;
    const r2 = await promoteCoinDraftToAllSheet("AY-00760", {});
    const writes = lag.patches - patchesBefore;
    const rowsMid = __rowsWith(g, "AY-00760").map(x => x.sheetRow);
    lag.on = false;
    const fin = await __promoteFinisherForTest("AY-00760");
    const out = { N, memoryGone, r2: { reason: r2.reason, rowNumber: r2.rowNumber }, writes, rowsMid,
      fin: fin && { ok: fin.ok, rowNumber: fin.rowNumber },
      rows: __rowsWith(g, "AY-00760").map(x => ({ row: x.sheetRow, nonKey: __nonKey(x.r) })) };
    await __teardown();
    return out;
  });
  ok("F9 after a reload, Promote finds row N in coin.json: no key write, no new row, then finishes row N (" + JSON.stringify(F9) + ")",
    F9.memoryGone && F9.r2.reason === "finishing" && F9.r2.rowNumber === F9.N && F9.writes === 0 &&
    JSON.stringify(F9.rowsMid) === JSON.stringify([F9.N]) && F9.fin && F9.fin.ok === true && F9.fin.rowNumber === F9.N &&
    F9.rows.length === 1 && F9.rows[0].row === F9.N && F9.rows[0].nonKey > 3);

  // ---- F10: Force Add ----------------------------------------------------------------------
  const F10 = await page.evaluate(async () => {
    const { mock, lag } = await __setup([{ collectionID: "AY-00760", coinId: "" }]);
    const g = mock._grids.All;
    lag.start();
    const r = await forceAddCoinDraft("AY-00760");
    const first = __toasts[0] || "";
    const N = (__rowsWith(g, "AY-00760")[0] || {}).sheetRow;
    lag.on = false;
    const fin = await __promoteFinisherForTest("AY-00760");
    const d = await mock.getJson(__draftPath("AY-00760"));
    const rows = __rowsWith(g, "AY-00760");
    const out = { r, first, N, fin: fin && { ok: fin.ok, rowNumber: fin.rowNumber }, forceAdded: d.forceAdded, allRowWritten: d.allRowWritten,
      marker: d.keysWrittenRow, rows: rows.map(x => ({ row: x.sheetRow, coinId: x.r[1], nonKey: __nonKey(x.r) })), toasts: __toasts.slice() };
    await __teardown();
    return out;
  });
  ok("F10 Force Add finishes the same way: one complete row with a blank CoinID; draft force-added (" + JSON.stringify(F10) + ")",
    F10.r === true && /^AY-00760: written to row \d+; Excel is slow/.test(F10.first) && F10.fin && F10.fin.ok === true && F10.fin.rowNumber === F10.N &&
    F10.rows.length === 1 && F10.rows[0].row === F10.N && F10.rows[0].coinId === "" && F10.rows[0].nonKey > 3 &&
    F10.forceAdded === true && F10.allRowWritten === true && F10.marker === null &&
    F10.toasts.some(t => /^AY-00760 finished: row \d+ on the All sheet is complete, with no CoinID/.test(t)));

  // ---- F12: offline when the row shows ------------------------------------------------------
  const F12 = await page.evaluate(async () => {
    const { mock, lag } = await __setup([{ collectionID: "AY-00760" }]);
    const g = mock._grids.All;
    lag.start();
    await promoteCoinDraft("AY-00760");
    const N = (__rowsWith(g, "AY-00760")[0] || {}).sheetRow;
    __setWorkbookSessionForTest({ source: "workbook", verified: true, dataAt: Date.now(), connection: "offline" });
    lag.on = false;
    const fin = await __promoteFinisherForTest("AY-00760");
    __setWorkbookSessionForTest({ source: "workbook", verified: true, dataAt: Date.now(), connection: "ok" });
    const d = await mock.getJson(__draftPath("AY-00760"));
    const out = { fin: fin && { ok: fin.ok, reason: fin.reason }, nonKey: __nonKey(g[N - 1]), status: d.status, marker: d.keysWrittenRow, N,
      toasts: __toasts.slice() };
    await __teardown();
    return out;
  });
  ok("F12 offline when the row shows: the fill is refused, keys-only row, draft Ready with its row kept (" + JSON.stringify(F12) + ")",
    F12.fin && F12.fin.ok === false && F12.nonKey === 0 && F12.status === "Ready for reconciliation" && F12.marker === F12.N &&
    F12.toasts.some(t => /^Couldn't finish AY-00760: /.test(t)));
});
