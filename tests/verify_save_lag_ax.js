// (ax) 2a (7 Nov 2026): writes while Excel still answers reads with the
// workbook as it was before a recent write (Ray's TEST of Stage 1: a Promote's
// key read-back came back empty although the keys had landed; a second save
// of the same coin was refused because of the app's own first save).
//
// The mock is wrapped so that, while `lag` is on, every READ sees the sheets
// as they were when the lag started, while writes land for real.
//
//   A1  two photo rows in a row while reads lag: two different rows, both kept (A4)
//   C1  Promote while reads lag: keys written, honest "not showing yet" refusal, nothing else written
//   C2  ...a retry while still lagging refuses again: no second row (no duplicate)
//   C3  ...a retry after the lag finishes the same row: one complete row
//   C4  a key write that truly never landed: after 10 minutes a retry claims a new row
//   I1  the one-at-a-time row re-read holding another coin's id: refused, nothing written
//   E1  Mark as promoted gets its own Save steps record
//   E2  a workbook write outside any timed save gets a record of its own
//   R1  second save on an open form while reads lag: saved (was refused)
//   R2  form re-opened during the lag, saved after it: saved (was refused)
//   R3  Copilot changes another field after the save: refused, names it
//   R4  Copilot sets a field the app wrote back to its old value: refused
//   R5  a field set back to its old value while reads lag IS written
//   R6  more than 10 minutes after the app's save: compared as read (refused)
//
// Negative controls (run by hand, 7 Nov 2026; see docs/HISTORY.md (ax) 2a).

const { defineSuite } = require("./harness");

const ALL = ["CollectionID", "CoinID", "Denomination", "Category", "Year", "MintMark", "Variety", "Description",
  "Finish", "Designation", "Grade", "GradeSource", "Cost", "Remarks", "Reviewed", "LastModified", "Status", "FaceValue"];
const PHOTO_HEADERS = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded"];
const MATCH_ROW = {
  denom: "1C", year: 1943, mint: "S", variety: "", description: "Lincoln Wheat",
  finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0,
  coinId: "C-1943-S-1C-01", composition: "Steel"
};
const READY_DRAFT = {
  type: "coin", version: 1, collectionID: "AY-00760", status: "Ready",
  denom: "1C", year: "1943", mint: "S", variety: "", description: "Lincoln Wheat",
  finish: "Business Strike", category: "Coin", grade: "MS-66", gradeSource: "PCGS",
  coinId: "C-1943-S-1C-01", photos: [], allRowWritten: false, forceAdded: false
};

module.exports = defineSuite("save-lag-ax", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);

  await page.evaluate((ALL) => {
    window.showToast = () => {};
    window.__ALL = ALL;
    window.__coinRow = (id, remarks) => ALL.map(h => ({ CollectionID: id, CoinID: "C-1943-S-1C-01", Denomination: "1C", Category: "Coin",
      Year: 1943, MintMark: "S", Description: "Lincoln Wheat", Finish: "Business Strike", Grade: "MS-64", Cost: 5,
      Remarks: remarks, LastModified: 46000.5, Status: "Owned" })[h] ?? "");
    // While lag.on, every read sees the sheets as they were at lag.start().
    window.__lagMock = (seed) => {
      const mock = createMockGraphClient(seed);
      const lag = { on: false, stale: null };
      const wrapped = new Proxy(mock, { get(t, k) {
        const v = t[k];
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
    window.__setup = (seed) => {
      const m = __lagMock(seed);
      __setGraphClientForTest(m.wrapped);
      __resetAllHeaderMapForTest();
      if (typeof __resetSheetHeaderMapsForTest === "function") __resetSheetHeaderMapsForTest();
      __setWorkbookSessionForTest({ source: "workbook", verified: true, connection: "ok" });
      __setBrowseEditWriteEnabledForTest(true);
      __setAddCoinWriteEnabledForTest(true);
      return m;
    };
    window.__teardown = () => {
      __setGraphClientForTest(null);
      __resetAllHeaderMapForTest();
      __setBrowseEditWriteEnabledForTest(null);
      __setAddCoinWriteEnabledForTest(null);
      __setLiveDbCoinsForTest(null);
    };
  }, ALL);

  // ---- A1: two photo rows while reads lag (A4) ------------------------------------------
  const A1 = await page.evaluate(async (H) => {
    const rows = [H.slice(), ["PH-00001", "AY-00002", "Obverse", "", "AY-00002_obverse.jpg", "", ""]];
    for (let i = 0; i < 4; i++) rows.push(new Array(H.length).fill(""));
    const { mock, lag } = __setup({ sheets: { Photos: rows } });
    lag.start();
    const w1 = await writePhotoRow("AY-00500", { type: "obverse", caption: "" }, "AY-00500_obverse_cropped.jpg", "");
    const w2 = await writePhotoRow("AY-00500", { type: "reverse", caption: "" }, "AY-00500_reverse_cropped.jpg", "");
    const g = mock._grids.Photos;
    const fileAt = r => g[r - 1] && g[r - 1][H.indexOf("Filename")];
    const out = { r1: w1.row, r2: w2.row, f1: fileAt(w1.row), f2: fileAt(w2.row) };
    __teardown();
    return out;
  }, PHOTO_HEADERS);
  ok("A1 two photo rows while reads lag land on two different rows and both are kept (" + JSON.stringify(A1) + ")",
    A1.r1 !== A1.r2 && A1.f1 === "AY-00500_obverse_cropped.jpg" && A1.f2 === "AY-00500_reverse_cropped.jpg");

  // ---- C1-C3: Promote while reads lag (C') ------------------------------------------------
  const C = await page.evaluate(async ({ row, draft }) => {
    const grid = [__ALL.slice(), __coinRow("AY-00001", "a"), __ALL.map(() => ""), __ALL.map(() => ""), __ALL.map(() => "")];
    const { mock, lag } = __setup({ sheets: { All: grid } });
    __setLiveDbCoinsForTest([row]);
    await mock.uploadJson(writePaths().stagingBase + "/AY-00760/coin.json",
      Object.assign({}, draft, { status: COIN_DRAFT_STATUS.READY, createdDate: new Date().toISOString() }));
    const g = mock._grids.All;
    const nonKey = r => r.filter((v, c) => c > 1 && v !== null && v !== undefined && v !== "").length;
    const out = {};
    lag.start();
    const r1 = await withSaveTiming("Promote AY-00760", () => promoteCoinDraftToAllSheet("AY-00760"));
    out.c1 = { ok: r1.ok, message: r1.message, rows: __rowsWith(g, "AY-00760").map(x => ({ row: x.sheetRow, nonKey: nonKey(x.r) })),
      steps: __getSaveTimingForTest().last.steps.map(s => s.name) };
    const r2 = await promoteCoinDraftToAllSheet("AY-00760");
    out.c2 = { ok: r2.ok, message: r2.message, rows: __rowsWith(g, "AY-00760").map(x => x.sheetRow) };
    lag.on = false;
    const r3 = await promoteCoinDraftToAllSheet("AY-00760");
    const finalRows = __rowsWith(g, "AY-00760");
    out.c3 = { ok: r3.ok, rowNumber: r3.rowNumber, adopted: !!r3.adopted, rows: finalRows.map(x => ({ row: x.sheetRow, nonKey: nonKey(x.r) })) };
    __teardown();
    return out;
  }, { row: MATCH_ROW, draft: READY_DRAFT });
  ok("C1 Promote while reads lag: keys on one row only, the honest message, nothing else written (" + JSON.stringify(C.c1) + ")",
    C.c1.ok === false && C.c1.rows.length === 1 && C.c1.rows[0].nonKey === 0 &&
    /^Wrote the keys for AY-00760 to row \d+ \(Graph confirmed the write\), but Excel isn't showing them yet/.test(C.c1.message) &&
    C.c1.message.indexOf("row " + C.c1.rows[0].row) !== -1 && C.c1.steps.some(n => /^key read-back: row \d+ not showing AY-00760 yet/.test(n)));
  ok("C2 a retry while still lagging refuses again and claims no second row (" + JSON.stringify(C.c2) + ")",
    C.c2.ok === false && /isn't showing them yet/.test(C.c2.message) && C.c2.rows.length === 1 && C.c2.rows[0] === C.c1.rows[0].row);
  ok("C3 a retry after the lag finishes that same row: one complete row (" + JSON.stringify(C.c3) + ")",
    C.c3.ok === true && C.c3.adopted && C.c3.rows.length === 1 && C.c3.rows[0].row === C.c1.rows[0].row && C.c3.rows[0].nonKey > 3);

  // ---- C4: a key write that never landed (Graph said yes, nothing there) --------------------
  const C4 = await page.evaluate(async ({ row, draft }) => {
    const grid = [__ALL.slice(), __coinRow("AY-00001", "a"), __ALL.map(() => ""), __ALL.map(() => ""), __ALL.map(() => "")];
    const { mock } = __setup({ sheets: { All: grid } });
    __setLiveDbCoinsForTest([row]);
    await mock.uploadJson(writePaths().stagingBase + "/AY-00760/coin.json",
      Object.assign({}, draft, { status: COIN_DRAFT_STATUS.READY, createdDate: new Date().toISOString() }));
    const realPatch = mock.patchWorkbookRanges;
    mock.patchWorkbookRanges = () => Promise.resolve({ written: 0 }); // lost: nothing lands
    const r1 = await promoteCoinDraftToAllSheet("AY-00760");
    mock.patchWorkbookRanges = realPatch;
    const r2 = await promoteCoinDraftToAllSheet("AY-00760"); // within 10 minutes: refused again
    __keysNotVisibleForTest().get("AY-00760").at -= 11 * 60 * 1000;
    const r3 = await promoteCoinDraftToAllSheet("AY-00760");
    const rows = __rowsWith(mock._grids.All, "AY-00760").map(x => x.sheetRow);
    const out = { r1: r1.ok, r1row: (/to row (\d+)/.exec(r1.message || "") || [])[1], r2: r2.ok, r3: r3.ok, r3row: r3.rowNumber, rows };
    __teardown();
    return out;
  }, { row: MATCH_ROW, draft: READY_DRAFT });
  ok("C4 a key write that never landed: refused within 10 minutes, then a retry claims a NEW row and completes (" + JSON.stringify(C4) + ")",
    C4.r1 === false && C4.r2 === false && C4.r3 === true && C4.rows.length === 1 && String(C4.r3row) !== String(C4.r1row) && C4.rows[0] === C4.r3row);

  // ---- I1: the one-at-a-time re-read holds another coin ------------------------------------
  const I1 = await page.evaluate(async () => {
    const { mock } = __setup({ sheets: { All: [__ALL.slice(), __coinRow("AY-00001", "a")] } });
    const snap = await readAllRowWritableValues(2);
    const real = mock.readWorkbookRangeDetail;
    mock.readWorkbookRangeDetail = (...a) => {
      const row = mock._grids.All[1];
      mock._grids.All[1] = __coinRow("AY-00777", "a");
      try { return real.apply(mock, a); } finally { mock._grids.All[1] = row; }
    };
    const res = await withEditSaveLock(() => saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap, { Cost: 9 }), snap), "Edit Coin AY-00001");
    const out = { ok: res.ok, reason: res.reason, message: res.message, cost: mock._grids.All[1][__ALL.indexOf("Cost")],
      outcome: __getSaveTimingForTest().last.outcome };
    __teardown();
    return out;
  });
  ok("I1 the one-at-a-time row re-read holding another coin is refused and nothing is written (" + JSON.stringify(I1) + ")",
    I1.ok === false && I1.reason === "row-moved" && /^Row 2 holds AY-00777, not AY-00001/.test(I1.message) && I1.cost === 5 &&
    /^refused \(row-moved/.test(I1.outcome));

  // ---- E1, E2: Save steps records --------------------------------------------------------
  const E = await page.evaluate(async ({ row, draft }) => {
    const r = __coinRow("AY-00760", "");
    ["Grade", "Remarks", "Status", "FaceValue", "Category"].forEach(h => { r[__ALL.indexOf(h)] = ""; });
    const { mock } = __setup({ sheets: { All: [__ALL.slice(), r] } });
    __setLiveDbCoinsForTest([row]);
    await mock.uploadJson(writePaths().stagingBase + "/AY-00760/coin.json",
      Object.assign({}, draft, { status: COIN_DRAFT_STATUS.READY, createdDate: new Date().toISOString() }));
    __resetLoadReportForTest();
    const done = await markCoinDraftAlreadyPromoted("AY-00760");
    const t = __getSaveTimingForTest().last;
    const e1 = { done, label: t && t.label, outcome: t && t.outcome, steps: t ? t.steps.map(s => s.name) : [] };
    __resetLoadReportForTest();
    await graph().patchWorkbookRanges(writePaths().workbook, "All", [{ address: "M2", values: [["x"]], _columns: ["Remarks"] }]);
    const u = __getSaveTimingForTest().last;
    const e2 = { label: u && u.label, outcome: u && u.outcome, steps: u ? u.steps.map(s => s.name) : [] };
    let threw = false;
    mock.patchWorkbookRanges = () => Promise.reject(new Error("boom"));
    try { await graph().patchWorkbookRanges(writePaths().workbook, "All", [{ address: "M2", values: [["y"]] }]); } catch (e) { threw = true; }
    const f = __getSaveTimingForTest().last;
    __teardown();
    return { e1, e2, failed: { threw, outcome: f && f.outcome } };
  }, { row: MATCH_ROW, draft: READY_DRAFT });
  ok("E1 Mark as promoted gets its own Save steps record (" + JSON.stringify(E.e1).slice(0, 300) + ")",
    E.e1.done === true && E.e1.label === "Mark as promoted AY-00760" && E.e1.outcome === "saved" && E.e1.steps.includes("header re-read"));
  ok("E2 a workbook write outside any timed save gets a record of its own, and a failed one says so (" + JSON.stringify([E.e2, E.failed]) + ")",
    E.e2.label === "Write outside a timed save: patchWorkbookRanges All 1 ranges" && E.e2.outcome === "written" &&
    E.e2.steps.some(n => /^Graph patchWorkbookRanges All 1 ranges$/.test(n)) && E.failed.threw && /^failed \(boom\)$/.test(E.failed.outcome));

  // ---- R1-R6: Part 3 --------------------------------------------------------------------
  const R = await page.evaluate(async () => {
    const col = h => __ALL.indexOf(h);
    const fresh = () => __setup({ sheets: { All: [__ALL.slice(), __coinRow("AY-00001", "a")] } });
    const save = (vals, snap) => withEditSaveLock(() => saveCoinRowToWorkbook("AY-00001", vals, snap), "Edit Coin AY-00001");
    const brief = (res, g) => ({ ok: res.ok, reason: res.reason, conflicts: (res.conflicts || []).map(c => c.field),
      remarks: g[1][col("Remarks")], grade: g[1][col("Grade")], steps: __getSaveTimingForTest().last.steps.map(s => s.name).filter(n => /earlier save/.test(n)) });
    const out = {};
    // R1: the form stays open; the second save reads the row from before the first.
    { const { mock, lag } = fresh(); const s0 = await readAllRowWritableValues(2); lag.start();
      const r1 = await save(Object.assign({}, s0, { Remarks: "b" }), s0);
      const r2 = await save(Object.assign({}, r1.values, { Grade: "MS-65" }), r1.values);
      out.R1 = Object.assign({ first: r1.ok }, brief(r2, mock._grids.All)); }
    // R2: re-opened during the lag (the form's snapshot is the old row), saved after it.
    { const { mock, lag } = fresh(); const s0 = await readAllRowWritableValues(2); lag.start();
      const r1 = await save(Object.assign({}, s0, { Remarks: "b" }), s0);
      const stale = await readAllRowWritableValues(2);
      lag.on = false;
      const r2 = await save(Object.assign({}, stale, { Remarks: "b", Grade: "MS-65" }), stale);
      out.R2 = Object.assign({ first: r1.ok, staleRemarks: stale.Remarks }, brief(r2, mock._grids.All)); }
    // R3: Copilot changes Grade after the save.
    { const { mock } = fresh(); const s0 = await readAllRowWritableValues(2);
      const r1 = await save(Object.assign({}, s0, { Remarks: "b" }), s0);
      mock._grids.All[1][col("Grade")] = "AU-58";
      const r2 = await save(Object.assign({}, r1.values, { Cost: 9 }), r1.values);
      out.R3 = brief(r2, mock._grids.All); }
    // R4: Copilot sets Remarks back to "a" (LastModified stays the app's).
    { const { mock } = fresh(); const s0 = await readAllRowWritableValues(2);
      const r1 = await save(Object.assign({}, s0, { Remarks: "b" }), s0);
      mock._grids.All[1][col("Remarks")] = "a";
      const r2 = await save(Object.assign({}, r1.values, { Cost: 9 }), r1.values);
      out.R4 = brief(r2, mock._grids.All); }
    // R5: the user sets Remarks back to "a" while reads still show "a".
    { const { mock, lag } = fresh(); const s0 = await readAllRowWritableValues(2); lag.start();
      const r1 = await save(Object.assign({}, s0, { Remarks: "b" }), s0);
      const between = mock._grids.All[1][col("Remarks")];
      const r2 = await save(Object.assign({}, r1.values, { Remarks: "a" }), r1.values);
      out.R5 = Object.assign({ between }, brief(r2, mock._grids.All)); }
    // R6: more than 10 minutes after the app's save.
    { const { mock, lag } = fresh(); const s0 = await readAllRowWritableValues(2); lag.start();
      const r1 = await save(Object.assign({}, s0, { Remarks: "b" }), s0);
      __ownRowStatesForTest().get("AY-00001").at -= 11 * 60 * 1000;
      const r2 = await save(Object.assign({}, r1.values, { Grade: "MS-65" }), r1.values);
      out.R6 = brief(r2, mock._grids.All); }
    __teardown();
    return out;
  });
  ok("R1 a second save on an open form while reads lag is saved (" + JSON.stringify(R.R1) + ")",
    R.R1.first && R.R1.ok && R.R1.remarks === "b" && R.R1.grade === "MS-65" && R.R1.steps.some(n => /^the row read still shows/.test(n)));
  ok("R2 a form re-opened during the lag and saved after it is saved (" + JSON.stringify(R.R2) + ")",
    R.R2.first && R.R2.staleRemarks === "a" && R.R2.ok && R.R2.remarks === "b" && R.R2.grade === "MS-65" && R.R2.steps.some(n => /^the form was opened while/.test(n)));
  ok("R3 Copilot changing another field after the save is still refused, naming it (" + JSON.stringify(R.R3) + ")",
    !R.R3.ok && R.R3.reason === "conflict" && JSON.stringify(R.R3.conflicts) === '["Grade"]');
  ok("R4 Copilot setting a written field back to its old value is still refused (" + JSON.stringify(R.R4) + ")",
    !R.R4.ok && R.R4.reason === "conflict" && JSON.stringify(R.R4.conflicts) === '["Remarks"]' && R.R4.remarks === "a");
  ok("R5 a field set back to its old value while reads lag IS written (" + JSON.stringify(R.R5) + ")",
    R.R5.between === "b" && R.R5.ok && R.R5.remarks === "a");
  ok("R6 more than 10 minutes later the read is compared as read: refused as before (" + JSON.stringify(R.R6) + ")",
    !R.R6.ok && R.R6.reason === "conflict" && R.R6.conflicts.includes("Remarks"));
});
