// (ax) Save speed, Stage 1 (7 Nov 2026).
//
// P2: Edit Coin's save reads the header, looks the row up AND re-reads the
// row at the same time; the parallel row read is used only after three
// confirmations against this save's own fresh reads ((i) same row, (ii)
// every needed column inside the range read, (iii) the row's CollectionID
// is this coin), otherwise the row is read again one step after the others.
// P1: without a row guess (Promote), the header re-read and the row lookup
// run together and the row re-read follows.
// Diagnostics: Save steps lists the saved-copy delete (open, delete, result),
// the main-thread stall and background work; Docket > About shows the
// LastModified stamp and can read it back.
//
//   S1  three reads overlap; the parallel read is used (no fourth read)
//   S1b Edit Coin itself passes the row guess (form open -> Save)
//   S2  the row moved: read again at the new row, written there, the other row untouched
//   S3  a column now past the range read: read again, saved
//   S4  the parallel read holds another coin: read again, saved
//   S5  a real conflict is still refused through the parallel path
//   S6  Promote's shape (no guess): header and lookup overlap, row read after both
//   S7  the saved-copy delete is timed and finishes before the write request
//   B1  background work and a main-thread stall during a save are named
//   L1  the LastModified stamp keeps seconds; About shows it and reads it back
//
// Negative controls (run by hand, 7 Nov 2026; see docs/HISTORY.md (ax)).

const { defineSuite } = require("./harness");

const HEADERS = ["CollectionID", "CoinID", "Denomination", "Category", "Year", "MintMark", "Description",
  "Finish", "Grade", "Cost", "Remarks", "Status", "Reviewed", "LastModified"];

module.exports = defineSuite("save-speed-ax", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);

  await page.evaluate((HEADERS) => {
    window.showToast = () => {};
    window.__sleep = ms => new Promise(r => setTimeout(r, ms));
    window.__row = (id, remarks) => HEADERS.map(h => ({ CollectionID: id, CoinID: "C-1943-S-1C-01", Denomination: "1C", Category: "Coin",
      Year: 1943, MintMark: "S", Description: "Lincoln Wheat", Finish: "Business Strike", Grade: "MS-64", Cost: 5,
      Remarks: remarks, Status: "Owned" })[h] ?? "");
    // A mock whose reads each take `delay` ms and are logged with start / end.
    window.__slowMock = (rows, delay) => {
      const mock = createMockGraphClient({ sheets: { All: [HEADERS.slice()].concat(rows.map(r => r.slice()), [HEADERS.map(() => "")]) } });
      const log = [];
      const t0 = Date.now();
      const wrapped = new Proxy(mock, { get(t, k) {
        const v = t[k];
        if (typeof v !== "function" || !/^read/.test(String(k))) return v;
        return async (...a) => {
          const entry = { k: String(k), a: a.slice(1).join(" "), start: Date.now() - t0 };
          log.push(entry);
          await __sleep(delay);
          const out = await v.apply(t, a);
          entry.end = Date.now() - t0;
          return out;
        };
      } });
      return { mock, wrapped, log };
    };
    window.__snap = async (mock, row) => {
      __setGraphClientForTest(mock);
      __resetAllHeaderMapForTest();
      const values = await readAllRowWritableValues(row);
      return { values, width: allHeaderMapWidth(allHeaderMap) };
    };
    window.__stepNames = () => __getSaveTimingForTest().last.steps.map(s => s.name);
  }, HEADERS);

  // ---- S1: the three reads overlap; the parallel read is used --------------------
  const S1 = await page.evaluate(async (HEADERS) => {
    __setWorkbookSessionForTest({ source: "workbook", verified: true, connection: "ok" });
    __setBrowseEditWriteEnabledForTest(true);
    const { mock, wrapped, log } = __slowMock([__row("AY-00001", "a")], 150);
    const snap = await __snap(mock, 2);
    __setGraphClientForTest(wrapped);
    log.length = 0;
    const res = await withEditSaveLock(() => saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap.values, { Remarks: "b" }), snap.values,
      { rowGuess: { rowNumber: 2, width: snap.width } }), "Edit Coin AY-00001");
    const reads = log.filter(e => e.end !== undefined);
    const out = { res: { ok: res.ok, rowNumber: res.rowNumber, readWidth: res.readWidth }, reads: reads.map(e => e.k),
      lastStart: Math.max(...reads.map(e => e.start)), firstEnd: Math.min(...reads.map(e => e.end)),
      written: mock._grids.All[1][HEADERS.indexOf("Remarks")], names: __stepNames() };
    __setGraphClientForTest(null);
    return out;
  }, HEADERS);
  ok("S1 header re-read, row lookup and row re-read all start before any of them ends (" + JSON.stringify(S1.reads) +
    ", last start " + S1.lastStart + " ms, first end " + S1.firstEnd + " ms)",
    S1.reads.length === 3 && S1.reads.includes("readTableHeaderRow") && S1.reads.includes("readTableColumn") &&
    S1.reads.includes("readWorkbookRangeDetail") && S1.lastStart < S1.firstEnd);
  ok("S1b ...the parallel row read is used (no fourth read), the save lands, and the step is named (" + JSON.stringify(S1.names.slice(0, 4)) + ")",
    S1.res.ok && S1.written === "b" && S1.names.includes("row re-read for the conflict check (in parallel, at the row Edit Coin opened)") &&
    !S1.names.includes("row re-read for the conflict check") && S1.res.readWidth === HEADERS.length);

  // ---- S1c: Edit Coin passes the guess (form open -> Save) -------------------------
  const S1c = await page.evaluate(async (HEADERS) => {
    const { mock } = __slowMock([__row("AY-00001", "TEST7")], 0);
    __setGraphClientForTest(mock);
    __resetAllHeaderMapForTest();
    const rowObj = {}; HEADERS.forEach((h, i) => { rowObj[h] = mock._grids.All[1][i]; });
    const coin = mapWorkbookRowToCoin(rowObj);
    __setLiveCoinsForTest([coin]);
    navigate("browse"); showBrowseDetail(coin); showBrowseEditView(coin);
    await loadBrowseEditSnapshot(coin);
    await __sleep(80);
    const snap = __getBrowseEditSnapshotForTest();
    const notes = document.getElementById("browseEditNotes");
    notes.value = "TEST8";
    notes.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("browseEditSaveBtn").click();
    const t0 = Date.now();
    while (Date.now() - t0 < 4000 && (editSaveInFlight || !__getSaveTimingForTest().last || !/Edit Coin/.test(__getSaveTimingForTest().last.label))) await __sleep(25);
    await __sleep(100);
    const after = __getBrowseEditSnapshotForTest();
    const out = { snap: { rowNumber: snap.rowNumber, readWidth: snap.readWidth }, names: __stepNames(),
      written: mock._grids.All[1][HEADERS.indexOf("Remarks")], after: after && { rowNumber: after.rowNumber, readWidth: after.readWidth } };
    navigate("browse");
    __setGraphClientForTest(null);
    return out;
  }, HEADERS);
  ok("S1c Edit Coin keeps the row and width it read at open, Save uses them in parallel, and the next save keeps them (" + JSON.stringify(S1c) + ")",
    S1c.snap.rowNumber === 2 && S1c.snap.readWidth === HEADERS.length && S1c.written === "TEST8" &&
    S1c.names.includes("row re-read for the conflict check (in parallel, at the row Edit Coin opened)") &&
    S1c.after && S1c.after.rowNumber === 2 && S1c.after.readWidth === HEADERS.length);
  ok("S1d Save steps lists the new diagnostics (" + JSON.stringify(S1c.names.filter(n => /saved-copy|main thread|background/.test(n))) + ")",
    S1c.names.some(n => /^saved-copy delete before the write: /.test(n)) && S1c.names.includes("main thread: longest stall (heartbeat late)") &&
    S1c.names.some(n => /^main thread: (\d+ long tasks?|long tasks not measured)/.test(n)) && S1c.names.some(n => /^background work during the save: /.test(n)));

  // ---- S2-S5: the confirmations ------------------------------------------------------
  const S = await page.evaluate(async (HEADERS) => {
    const rc = HEADERS.indexOf("Remarks");
    const out = {};
    // S2: a row was inserted above since the form opened (the coin is now row 3).
    {
      const { mock } = __slowMock([__row("AY-00001", "a")], 0);
      const snap = await __snap(mock, 2);
      mock._grids.All.splice(1, 0, __row("AY-00999", "other"));
      const res = await withEditSaveLock(() => saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap.values, { Remarks: "b" }), snap.values,
        { rowGuess: { rowNumber: 2, width: snap.width } }), "Edit Coin AY-00001");
      out.S2 = { ok: res.ok, reason: res.reason, rowNumber: res.rowNumber, row3: mock._grids.All[2][rc], row2: mock._grids.All[1][rc], names: __stepNames() };
    }
    // S3: the form's width ends before Remarks (a column added past the range).
    {
      const { mock } = __slowMock([__row("AY-00001", "a")], 0);
      const snap = await __snap(mock, 2);
      const res = await withEditSaveLock(() => saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap.values, { Grade: "MS-65" }), snap.values,
        { rowGuess: { rowNumber: 2, width: rc } }), "Edit Coin AY-00001");
      out.S3 = { ok: res.ok, reason: res.reason, grade: mock._grids.All[1][HEADERS.indexOf("Grade")], names: __stepNames() };
    }
    // S4: the parallel read comes back holding another coin (a row moved in
    // between the lookup and that read).
    {
      const { mock } = __slowMock([__row("AY-00001", "a")], 0);
      const snap = await __snap(mock, 2);
      let first = true;
      const swapping = new Proxy(mock, { get(t, k) {
        if (k !== "readWorkbookRangeDetail") return t[k];
        return (...a) => {
          if (!first) return t[k].apply(t, a);
          first = false;
          const real = t._grids.All[1];
          t._grids.All[1] = __row("AY-00777", "x");
          try { return t[k].apply(t, a); } finally { t._grids.All[1] = real; }
        };
      } });
      __setGraphClientForTest(swapping);
      const res = await withEditSaveLock(() => saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap.values, { Cost: 9 }), snap.values,
        { rowGuess: { rowNumber: 2, width: snap.width } }), "Edit Coin AY-00001");
      out.S4 = { ok: res.ok, reason: res.reason, cost: mock._grids.All[1][HEADERS.indexOf("Cost")], names: __stepNames() };
    }
    // S5: a real concurrent change is still refused through the parallel path.
    {
      const { mock } = __slowMock([__row("AY-00001", "a")], 0);
      const snap = await __snap(mock, 2);
      mock._grids.All[1][HEADERS.indexOf("Grade")] = "AU-58";
      const res = await withEditSaveLock(() => saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap.values, { Cost: 9 }), snap.values,
        { rowGuess: { rowNumber: 2, width: snap.width } }), "Edit Coin AY-00001");
      out.S5 = { ok: res.ok, reason: res.reason, conflicts: (res.conflicts || []).map(c => c.field), cost: mock._grids.All[1][HEADERS.indexOf("Cost")],
        names: __stepNames(), rowNumber: res.rowNumber, readWidth: res.readWidth };
    }
    __setGraphClientForTest(null);
    return out;
  }, HEADERS);
  ok("S2 the row moved: read again at the new row and written there, the other coin's row untouched (" + JSON.stringify(S.S2) + ")",
    S.S2.ok && S.S2.rowNumber === 3 && S.S2.row3 === "b" && S.S2.row2 === "other" &&
    S.S2.names.includes("parallel row read not used: the row moved (now row 3); read again") && S.S2.names.includes("row re-read for the conflict check"));
  ok("S3 a needed column past the range read: read again, saved (" + JSON.stringify(S.S3) + ")",
    S.S3.ok && S.S3.grade === "MS-65" && S.S3.names.some(n => /^parallel row read not used: a column is now past the range read \(.*Remarks/.test(n)));
  ok("S4 the parallel read held another coin: read again, saved on the right row (" + JSON.stringify(S.S4) + ")",
    S.S4.ok && S.S4.cost === 9 && S.S4.names.includes("parallel row read not used: row 2 holds AY-00777, not this coin; read again"));
  ok("S5 a real change since the form opened is still refused, nothing written (" + JSON.stringify(S.S5) + ")",
    !S.S5.ok && S.S5.reason === "conflict" && JSON.stringify(S.S5.conflicts) === '["Grade"]' && S.S5.cost === 5 &&
    S.S5.names.includes("row re-read for the conflict check (in parallel, at the row Edit Coin opened)") &&
    !S.S5.names.some(n => /^write /.test(n)) && S.S5.rowNumber === 2 && S.S5.readWidth === HEADERS.length);

  // ---- S6: Promote's shape (no snapshot, no guess): P1 -------------------------------
  const S6 = await page.evaluate(async (HEADERS) => {
    const { mock, wrapped, log } = __slowMock([__row("AY-00001", "a")], 150);
    __setGraphClientForTest(wrapped);
    __resetAllHeaderMapForTest();
    const res = await withSaveTiming("Promote AY-00001", () => saveCoinRowToWorkbook("AY-00001", { Remarks: "promoted" }, null, { gate: () => true }));
    const by = k => log.find(e => e.k === k);
    const h = by("readTableHeaderRow"), l = by("readTableColumn"), r = by("readWorkbookRangeDetail");
    const out = { ok: res.ok, written: mock._grids.All[1][HEADERS.indexOf("Remarks")], h, l, r, reads: log.length, names: __stepNames() };
    __setGraphClientForTest(null);
    return out;
  }, HEADERS);
  ok("S6 without a row guess (Promote) the header re-read and the lookup overlap and the row is read after both (" +
    JSON.stringify({ h: S6.h, l: S6.l, r: S6.r }) + ")",
    S6.ok && S6.written === "promoted" && S6.reads === 3 && S6.h.start < S6.l.end && S6.l.start < S6.h.end &&
    S6.r.start >= Math.max(S6.h.end, S6.l.end) && !S6.names.some(n => /in parallel/.test(n)));

  // ---- S7: the saved-copy delete is timed and done before the write request ------------
  const S7 = await page.evaluate(async () => {
    __setLiveDataModeForTest("live");
    __setWorkbookCacheForTest({ account: "acct-ax" });
    const out = {};
    for (const label of ["first", "second"]) {
      if (label === "first") await idbCachePut(WRITE_TARGET, { probe: 1 });
      const mock = createMockGraphClient({ sheets: { All: [["CollectionID", "Remarks"], ["AY-00001", "x"]] } });
      let seenAtWrite = "not called";
      const realPatch = mock.patchWorkbookRanges;
      mock.patchWorkbookRanges = async (...a) => { seenAtWrite = (await idbCacheGet(WRITE_TARGET)) ? "copy still there" : "copy gone"; return realPatch.apply(mock, a); };
      __setGraphClientForTest(mock);
      await withSaveTiming("S7 " + label, () => graph().patchWorkbookRanges(writePaths().workbook, "All", [{ address: "B2", values: [["y"]], _columns: ["Remarks"] }]));
      const steps = __getSaveTimingForTest().last.steps;
      const del = steps.find(s => /^saved-copy delete before the write: /.test(s.name));
      const write = steps.find(s => /^Graph patchWorkbookRanges/.test(s.name));
      out[label] = { del: del && del.name, delEnd: del && del.offsetMs + del.ms, writeStart: write && write.offsetMs, seenAtWrite };
      __setGraphClientForTest(null);
    }
    __setWorkbookCacheForTest({ account: undefined });
    __setLiveDataModeForTest(null);
    return out;
  });
  ok("S7 the saved-copy delete is timed (open, delete, result) and ends before the write request starts (" + JSON.stringify(S7) + ")",
    /^saved-copy delete before the write: open \d+\.\d s, delete \d+\.\d s, deleted$/.test(S7.first.del) &&
    /^saved-copy delete before the write: open \d+\.\d s, delete \d+\.\d s, nothing there$/.test(S7.second.del) &&
    S7.first.seenAtWrite === "copy gone" && S7.first.delEnd <= S7.first.writeStart && S7.second.delEnd <= S7.second.writeStart);

  // ---- B1: background work and a stall during a save are named ------------------------
  const B1 = await page.evaluate(async () => {
    const pending = new Promise(() => {});
    liveNavDataFetchPromise = pending;
    await withSaveTiming("B1", async () => {
      await __sleep(150);
      const t0 = Date.now(); while (Date.now() - t0 < 400) { /* busy: the main thread is blocked */ }
      await __sleep(250);
    });
    if (liveNavDataFetchPromise === pending) liveNavDataFetchPromise = null;
    const steps = __getSaveTimingForTest().last.steps;
    const stall = steps.find(s => s.name === "main thread: longest stall (heartbeat late)");
    const quiet = await (async () => { await withSaveTiming("B1 quiet", () => __sleep(250)); return __stepNames(); })();
    return { names: steps.map(s => s.name), stallMs: stall && stall.ms, quiet };
  });
  ok("B1 a full re-read running during the save and a blocked main thread are both reported (" + JSON.stringify(B1) + ")",
    B1.names.includes("background work during the save: full re-read of the workbook") && B1.stallMs >= 300 &&
    B1.quiet.includes("background work during the save: none"));

  // ---- L1: LastModified keeps seconds; About shows it and reads it back -----------------
  const L1 = await page.evaluate(async (HEADERS) => {
    __resetLoadReportForTest();
    const { mock } = __slowMock([__row("AY-00001", "a")], 0);
    const lmCol = HEADERS.indexOf("LastModified");
    const snap = await __snap(mock, 2);
    await withEditSaveLock(() => saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap.values, { Remarks: "lm" }), snap.values,
      { rowGuess: { rowNumber: 2, width: snap.width } }), "Edit Coin AY-00001");
    const c = __getLastModifiedCheckForTest();
    const cell = mock._grids.All[1][lmCol];
    __setLiveDataModeForTest("live");
    navigate("needsdbcoins");
    await __sleep(40);
    const before = (document.getElementById("docketLastModifiedLine") || {}).textContent || "";
    const btn = document.getElementById("docketLastModifiedReadBtn");
    if (btn) btn.click();
    const t0 = Date.now();
    while (Date.now() - t0 < 2000 && !document.getElementById("docketLastModifiedReadLine")) await __sleep(25);
    const read = (document.getElementById("docketLastModifiedReadLine") || {}).textContent || "";
    __setLiveDataModeForTest(null);
    navigate("browse");
    __setGraphClientForTest(null);
    __setBrowseEditWriteEnabledForTest(null);
    return { written: c && c.written, cell, row: c && c.rowNumber, before, read,
      clock: serialToClockWithSeconds(46333 + (12 * 3600 + 17 * 60 + 46) / 86400) };
  }, HEADERS);
  ok("L1 the stamp written is a serial with whole seconds, the same number the cell got (" + JSON.stringify([L1.written, L1.cell]) + ")",
    typeof L1.written === "number" && L1.written === L1.cell && Math.abs(L1.written * 86400 - Math.round(L1.written * 86400)) < 1e-3 && L1.row === 2);
  ok("L1b About shows the stamp with seconds (" + L1.before + "), and the clock helper is exact (" + L1.clock + ")",
    /^LastModified written \(\d\d:\d\d:\d\d, AY-00001 row 2\): \d+\.\d+ = \d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(L1.before) && L1.clock === "2026-11-07 12:17:46");
  ok("L1c \"Read it back\" reads the cell and shows value, difference, text and format (" + L1.read + ")",
    /^Read back \d\d:\d\d:\d\d \(N2\): value \d+\.\d+ = \d{4}-\d\d-\d\d \d\d:\d\d:\d\d; read minus written 0 s; text "\d+\.\d+"; format "yyyy-mm-dd hh:mm"$/.test(L1.read));
});
