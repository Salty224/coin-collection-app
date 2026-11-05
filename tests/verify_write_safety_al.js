// Backlog (al), the write-safety branch (plan approved by Ray 5 Nov 2026;
// docs/BACKLOG.md (al) and docs/ref/WRITE_LAYER.md "Write safety (al)").
//
// Stage A, know the columns:
//   F6   a write never silently drops a column (refuse, naming it; Q1: any
//        non-blank value, and always Reviewed / LastModified; blank values
//        to a missing column are ignored; Photos.OriginalFilename optional);
//   A2   Promote checks the header BEFORE creating a row;
//   5.B  the header is re-read at the start of every write;
//   5.D  the header comes from the TABLE's header row (no A1:BZ1 cap), and a
//        table whose header is not on row 1 is refused;
//   5.C  a write never lands on a formula cell (general save and the narrow
//        writers).
// Stage B, batches: F1 LastModified is its own last range; F5 $batch split
// at 20; F2 a part-landed write names what did and did not land.
// Stage C: F8 Mark as promoted on a re-linked Force Added draft; 5.E header
// spellings without spaces; 5.F Containers read past row 200.
//
// Every block below was also run against main's app.html as a NEGATIVE
// CONTROL (counts in docs/ref/WRITE_LAYER.md).

const { defineSuite } = require("./harness");

// Like _Testing: Purged is right of LastModified.
const ALL_HEADERS = [
  "CollectionID", "CoinID", "SetID", "OriginSetID", "Denomination", "Category", "Year", "MintMark",
  "Variety", "Description", "Finish", "Designation", "Grade", "GradeSource", "SerNo", "CACBean",
  "Cost", "Shipping", "Total", "Seller_Link", "PurchaseDate", "SpotValue", "Value", "ValueSource",
  "ValueDate", "StorageLocation", "Container", "Remarks", "Error", "FaceValue", "Status",
  "SaleDate", "SalePrice", "Buyer", "Platform", "Reviewed", "LastModified", "Purged"
];
const PHOTO_HEADERS = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded"];

function allSeed(opts) {
  const o = opts || {};
  const headers = (o.headers || ALL_HEADERS).slice();
  const row = headers.map(h => {
    const v = { CollectionID: "AY-00001", CoinID: "C-1943-S-1C-01", Denomination: "1C", Year: 1943,
      MintMark: "S", Description: "Lincoln Wheat", Finish: "Business Strike", Category: "Coin",
      Grade: "MS-64", Cost: 5, Remarks: "old remark", Status: "Owned", FaceValue: 0.01 };
    return h in v ? v[h] : "";
  });
  const blank = headers.map(() => "");
  return { sheets: { All: [headers, row, blank.slice(), blank.slice()] } };
}

module.exports = defineSuite("write-safety-al", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);

  await page.evaluate(() => {
    window.__wsSetup = (seed) => {
      const mock = createMockGraphClient(seed);
      __setGraphClientForTest(mock);
      __setBrowseEditWriteEnabledForTest(true);
      __setAddCoinWriteEnabledForTest(true);
      __resetAllHeaderMapForTest();
      __resetSheetHeaderMapsForTest();
      return mock;
    };
    window.__wsTeardown = () => {
      __setGraphClientForTest(null);
      __setBrowseEditWriteEnabledForTest(null);
      __setAddCoinWriteEnabledForTest(null);
      __resetAllHeaderMapForTest();
      __resetSheetHeaderMapsForTest();
    };
    window.__wsCol = (mock, name, row) => {
      const g = mock._grids.All;
      const c = g[0].indexOf(name);
      return c === -1 ? undefined : (g[row - 1] || [])[c];
    };
    window.__wsDraft = (id, extra) => Object.assign({
      type: "coin", version: 1, collectionID: id, status: "Ready",
      denom: "1C", year: "1943", mint: "S", variety: "", description: "Lincoln Wheat",
      finish: "Business Strike", category: "Coin", grade: "MS-66", gradeSource: "PCGS",
      coinId: "C-1943-S-1C-01", allStatus: "Owned", photos: [],
      allRowWritten: false, forceAdded: false
    }, extra || {});
  });

  // ===================== Stage A: F6 =====================================
  // F6a: Copilot renamed Grade -> CoinGrade. A Grade edit used to "save"
  // (Grade dropped, LastModified stamped). Now: refused, sheet untouched.
  const F6a = await page.evaluate(async (seed) => {
    seed.sheets.All[0][seed.sheets.All[0].indexOf("Grade")] = "CoinGrade";
    const mock = __wsSetup(seed);
    const before = JSON.stringify(mock._grids.All);
    const snap = await readAllRowWritableValues(2);
    const res = await saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap, { Grade: "MS-65" }), snap);
    const out = { res, same: JSON.stringify(mock._grids.All) === before };
    __wsTeardown();
    return out;
  }, allSeed());
  ok("F6a a Grade edit with no Grade column is refused (reason missing-column, naming Grade)",
    !F6a.res.ok && F6a.res.reason === "missing-column" && (F6a.res.columns || []).includes("Grade") &&
    /"Grade"/.test(F6a.res.message || ""), F6a.res);
  ok("F6a2 ... and nothing on the sheet changed (no LastModified stamp, no Reviewed blank)", F6a.same, F6a);

  // F6a3: a BLANK value aimed at a missing column is ignored (nothing to
  // lose); the rest of the save lands.
  const F6a3 = await page.evaluate(async (seed) => {
    seed.sheets.All[0][seed.sheets.All[0].indexOf("Buyer")] = "BuyerName";
    const mock = __wsSetup(seed);
    const snap = await readAllRowWritableValues(2);
    const res = await saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap, { Cost: 7, Buyer: "" }), snap);
    const out = { res, cost: __wsCol(mock, "Cost", 2), lm: __wsCol(mock, "LastModified", 2) };
    __wsTeardown();
    return out;
  }, allSeed());
  ok("F6a3 a blank value for a missing column is ignored: the Cost edit saves and stamps LastModified",
    F6a3.res.ok && F6a3.cost === 7 && typeof F6a3.lm === "number", F6a3);

  // F6a4 (Q1): Reviewed is ALWAYS required, even though every save writes it blank.
  const F6a4 = await page.evaluate(async (seed) => {
    seed.sheets.All[0][seed.sheets.All[0].indexOf("Reviewed")] = "Checked";
    const mock = __wsSetup(seed);
    const before = JSON.stringify(mock._grids.All);
    const snap = await readAllRowWritableValues(2);
    const res = await saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap, { Cost: 7 }), snap);
    const out = { res, same: JSON.stringify(mock._grids.All) === before };
    __wsTeardown();
    return out;
  }, allSeed());
  ok("F6a4 a renamed Reviewed column refuses every save, naming Reviewed (Ray, Q1); sheet untouched",
    !F6a4.res.ok && (F6a4.res.columns || []).includes("Reviewed") && F6a4.same, F6a4);

  // F6b: no CoinID column. writeCoinIdCell used to return silently (and
  // Promote then reported a link it never wrote).
  const F6b = await page.evaluate(async (seed) => {
    const h = seed.sheets.All[0]; h[h.indexOf("CoinID")] = "CatalogRef";
    const mock = __wsSetup(seed);
    const before = JSON.stringify(mock._grids.All);
    let threw = null;
    try { await writeCoinIdCell(2, "C-1943-S-1C-02", { stampLastModified: true }); }
    catch (e) { threw = { code: e.code, message: e.message }; }
    const out = { threw, same: JSON.stringify(mock._grids.All) === before };
    __wsTeardown();
    return out;
  }, allSeed());
  ok("F6b writeCoinIdCell with no CoinID column throws MISSING_COLUMN naming CoinID",
    !!F6b.threw && F6b.threw.code === "MISSING_COLUMN" && /CoinID/.test(F6b.threw.message), F6b);
  ok("F6b2 ... and nothing was written (no LastModified stamp either)", F6b.same, F6b);

  // F6c (A2): no Finish column. Promote used to create the row and drop
  // Finish; now it refuses BEFORE any row is claimed or appended.
  const F6c = await page.evaluate(async (seed) => {
    const h = seed.sheets.All[0]; h[h.indexOf("Finish")] = "Strike";
    const mock = __wsSetup(seed);
    const before = JSON.stringify(mock._grids.All);
    await mock.uploadJson(writePaths().stagingBase + "/AY-00801/coin.json", __wsDraft("AY-00801"));
    const res = await promoteCoinDraftToAllSheet("AY-00801");
    const draft = await readCoinDraft("AY-00801");
    const out = { res, same: JSON.stringify(mock._grids.All) === before,
      rows: mock._grids.All.filter(r => r[0] === "AY-00801").length, allRowWritten: draft.allRowWritten };
    __wsTeardown();
    return out;
  }, allSeed());
  ok("F6c Promote with no Finish column is refused (missing-column, naming Finish)",
    !F6c.res.ok && F6c.res.reason === "missing-column" && (F6c.res.columns || []).includes("Finish"), F6c.res);
  ok("F6c2 ... and NO row was created: the sheet is exactly as it was, the draft not marked written",
    F6c.same && F6c.rows === 0 && !F6c.allRowWritten, F6c);

  // F6d: Photos without Label; a captioned photo used to be written with
  // the caption silently dropped. OriginalFilename stays optional (Q2).
  const F6d = await page.evaluate(async (headers) => {
    const mk = (h) => [h.slice(), ["PH-00001", "AY-00002", "Obverse", "", "AY-00002_obverse.jpg", "", ""].slice(0, h.length),
      new Array(h.length).fill(""), new Array(h.length).fill("")];
    const noLabel = headers.filter(h => h !== "Label");
    let mock = __wsSetup({ sheets: { Photos: mk(noLabel) } });
    const before = JSON.stringify(mock._grids.Photos);
    let threw = null;
    try { await writePhotoRow("AY-00500", { type: "slab_obverse", caption: "PCGS holder" }, "AY-00500_slab_obverse.jpg", ""); }
    catch (e) { threw = { code: e.code, message: e.message }; }
    const same = JSON.stringify(mock._grids.Photos) === before;
    __wsTeardown();
    // Positive control: Label present, OriginalFilename absent (the real tab).
    mock = __wsSetup({ sheets: { Photos: mk(headers) } });
    let pos = null, posErr = null;
    try { pos = await writePhotoRow("AY-00500", { type: "slab_obverse", caption: "PCGS holder" }, "AY-00500_slab_obverse.jpg", "AY-00500_slab_obverse_original.jpg"); }
    catch (e) { posErr = e.message; }
    const row = pos ? mock._grids.Photos[pos.row - 1] : null;
    __wsTeardown();
    return { threw, same, posErr, row };
  }, PHOTO_HEADERS);
  ok("F6d a captioned photo on a Photos tab with no Label column is refused, naming Label",
    !!F6d.threw && F6d.threw.code === "MISSING_COLUMN" && /Label/.test(F6d.threw.message), F6d);
  ok("F6d2 ... and the Photos tab is untouched", F6d.same, F6d);
  ok("F6d3 positive control: no OriginalFilename column (the real tab) still saves the photo with its Label (PHOTOS_OPTIONAL_COLUMNS)",
    !F6d.posErr && !!F6d.row && F6d.row[5] === "PCGS holder" && F6d.row[4] === "AY-00500_slab_obverse.jpg", F6d);

  // ===================== Stage A: 5.B ====================================
  // The header is cached, then Copilot inserts a column left of Grade and
  // OriginSetID. With the stale cache the write lands one column to the
  // left (in the new column). Re-read at write time: the right cell.
  const B5 = await page.evaluate(async (seed) => {
    const mock = __wsSetup(seed);
    await ensureAllHeaderMap(); // the session cache, as after any earlier read
    const g = mock._grids.All;
    g.forEach((r, i) => r.splice(2, 0, i === 0 ? "CopilotNote" : "")); // inserted at C, left of both
    const res = await saveCoinRowToWorkbook("AY-00001", { Grade: "MS-65" }, null);
    let linkErr = null;
    try { await writeOriginSetIdCell(2, "AY-09999"); } catch (e) { linkErr = e.message; }
    const out = { res, grade: __wsCol(mock, "Grade", 2), origin: __wsCol(mock, "OriginSetID", 2),
      inserted: __wsCol(mock, "CopilotNote", 2), linkErr,
      setId: __wsCol(mock, "SetID", 2), designation: __wsCol(mock, "Designation", 2) };
    __wsTeardown();
    return out;
  }, allSeed());
  ok("5.B a save after a mid-session column insert writes Grade into the Grade column", B5.res.ok && B5.grade === "MS-65", B5);
  ok("5.B2 ... and a Set link writes OriginSetID into the OriginSetID column", !B5.linkErr && B5.origin === "AY-09999", B5);
  ok("5.B3 ... nothing landed in the columns the stale positions now point at (SetID, Designation) or the inserted one",
    B5.inserted === "" && B5.setId === "" && B5.designation === "", B5);

  // ===================== Stage A: 5.D ====================================
  // A writable column past BZ (column 80) is found through the table header.
  const D5 = await page.evaluate(async () => {
    const headers = ["CollectionID", "CoinID"];
    for (let i = 3; i < 80; i++) headers.push("Pad" + i);
    headers.push("Remarks", "Reviewed", "LastModified");
    const row = headers.map(h => (h === "CollectionID" ? "AY-00001" : ""));
    const mock = __wsSetup({ sheets: { All: [headers, row] } });
    const res = await saveCoinRowToWorkbook("AY-00001", { Remarks: "past BZ" }, null);
    const out = { res, remarks: __wsCol(mock, "Remarks", 2), col: headers.indexOf("Remarks") + 1 };
    __wsTeardown();
    return out;
  });
  ok("5.D a writable column at CA (column 80, past BZ) is written", D5.res.ok && D5.remarks === "past BZ" && D5.col === 80, D5);

  // The table's header moved to row 2 under a title row: every row number
  // would be off by one, so the write is refused before anything happens.
  const D5b = await page.evaluate(async (seed) => {
    const title = seed.sheets.All[0].map((h, i) => (i === 0 ? "My coins" : ""));
    seed.sheets.All.unshift(title);
    seed.tableHeaderRows = { All: 2 };
    const mock = __wsSetup(seed);
    const before = JSON.stringify(mock._grids.All);
    const res = await saveCoinRowToWorkbook("AY-00001", { Remarks: "x" }, null);
    const out = { res, same: JSON.stringify(mock._grids.All) === before };
    __wsTeardown();
    return out;
  }, allSeed());
  ok("5.D2 a table whose header row is not sheet row 1 is refused, saying so; nothing written",
    !D5b.res.ok && /header row is on sheet row 2/.test(D5b.res.message || "") && D5b.same, D5b);

  // ===================== Stage A: 5.C ====================================
  const C5 = await page.evaluate(async (seed) => {
    const vi = seed.sheets.All[0].indexOf("Value");
    const oi = seed.sheets.All[0].indexOf("OriginSetID");
    const frow = []; frow[vi] = "=Q2*2"; frow[oi] = "=\"AY-\"&A2";
    seed.formulas = { All: [[], frow] };
    seed.sheets.All[1][vi] = 10;
    seed.sheets.All[1][oi] = "AY-AY-00001";
    const mock = __wsSetup(seed);
    const snap = await readAllRowWritableValues(2);
    const res = await saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap, { Value: 25 }), snap);
    const before = JSON.stringify(mock._grids.All);
    let linkErr = null;
    try { await writeOriginSetIdCell(2, "AY-09999"); } catch (e) { linkErr = { code: e.code, message: e.message }; }
    const out = { res, value: __wsCol(mock, "Value", 2), formula: (mock._formulas.All[1] || [])[vi],
      oformula: (mock._formulas.All[1] || [])[oi], linkErr, same: JSON.stringify(mock._grids.All) === before,
      lm: __wsCol(mock, "LastModified", 2) };
    __wsTeardown();
    return out;
  }, allSeed());
  ok("5.C a save onto a cell holding a formula is refused (formula-column, naming Value)",
    !C5.res.ok && C5.res.reason === "formula-column" && (C5.res.columns || []).includes("Value"), C5.res);
  ok("5.C2 ... the formula and its value are intact and nothing was stamped",
    C5.formula === "=Q2*2" && C5.value === 10 && C5.lm === "", C5);
  ok("5.C3 a narrow writer (Set link) refuses a formula in OriginSetID; formula and sheet intact",
    !!C5.linkErr && C5.linkErr.code === "FORMULA_COLUMN" && C5.oformula === "=\"AY-\"&A2" && C5.same, C5);

  // ===================== Stage B: Graph-like $batch stub ===================
  // The REAL client's patchWorkbookRanges, with fetch stubbed to behave like
  // Graph's $batch: HTTP 400 above 20 requests; per request 200, or the
  // failure a test asks for, then 424 (failed dependency) for every request
  // chained after it. A request that "lands" is applied to the mock grid.
  await page.evaluate(() => {
    window.__wsBatch = (mock, failAtGlobal) => {
      window.__wsPosts = [];
      let seen = 0;
      window.__wsRealFetch = window.__wsRealFetch || window.fetch;
      window.__wsRealToken = window.__wsRealToken || window.getWriteToken;
      window.getWriteToken = async () => "test-token";
      window.fetch = async (url, opts) => {
        if (!String(url).includes("$batch")) return window.__wsRealFetch(url, opts);
        const body = JSON.parse(opts.body);
        window.__wsPosts.push(body.requests.length);
        if (body.requests.length > 20) {
          return new Response(JSON.stringify({ error: { code: "BadRequest", message: "Batch request has more than 20 requests" } }), { status: 400 });
        }
        let failed = false;
        const responses = body.requests.map(r => {
          const g = seen++;
          if (failed) return { id: r.id, status: 424, body: { error: { code: "FailedDependency" } } };
          if (g === failAtGlobal) { failed = true; return { id: r.id, status: 500, body: { error: { code: "GeneralException", message: "MOCK-GRAPH-500" } } }; }
          const m = /worksheets\('([^']*)'\)\/range\(address='([^']*)'\)/.exec(r.url);
          mock.patchWorkbookRanges("wb", decodeURIComponent(m[1]), [{ address: decodeURIComponent(m[2]), values: r.body.values, numberFormat: r.body.numberFormat }]);
          return { id: r.id, status: 200, body: {} };
        });
        return new Response(JSON.stringify({ responses }), { status: 200, headers: { "Content-Type": "application/json" } });
      };
      return new Proxy(mock, { get(t, k) { return k === "patchWorkbookRanges" ? RealGraphClient.patchWorkbookRanges.bind(RealGraphClient) : t[k]; } });
    };
    window.__wsBatchOff = () => {
      if (window.__wsRealFetch) window.fetch = window.__wsRealFetch;
      if (window.__wsRealToken) window.getWriteToken = window.__wsRealToken;
    };
  });

  // ===================== Stage B: F1 =====================================
  // Remarks sits RIGHT of LastModified here; the edits are captured.
  const F1 = await page.evaluate(async (seed) => {
    const mock = __wsSetup(seed);
    const seenEdits = [];
    __setGraphClientForTest(new Proxy(mock, { get(t, k) {
      if (k === "patchWorkbookRanges") return (wb, sheet, edits) => { seenEdits.push(edits.map(e => ({ address: e.address, cols: e._columns }))); return t[k](wb, sheet, edits); };
      return t[k];
    } }));
    const res = await saveCoinRowToWorkbook("AY-00001", { Remarks: "right of LastModified", Cost: 9 }, null);
    const edits = seenEdits[0] || [];
    const out = { res, edits, last: edits[edits.length - 1] };
    __wsTeardown();
    return out;
  }, (() => { const h = ALL_HEADERS.filter(x => x !== "Remarks").concat(["Remarks"]); return allSeed({ headers: h }); })());
  ok("F1 LastModified is the LAST edit of a save, alone in its range, even with Remarks to its right",
    F1.res.ok && !!F1.last && JSON.stringify(F1.last.cols) === JSON.stringify(["LastModified"]) &&
    F1.edits.some(e => (e.cols || []).includes("Remarks")), F1);

  // ===================== Stage B: F5 =====================================
  const F5 = await page.evaluate(async () => {
    const headers = []; for (let i = 0; i < 25; i++) headers.push("H" + i);
    const mock = createMockGraphClient({ sheets: { All: [headers, headers.map(() => "")] } });
    const client = __wsBatch(mock, -1);
    const edits = headers.map((h, i) => ({ address: columnIndexToLetters(i + 1) + "2", values: [["v" + i]] }));
    let err = null;
    try { await client.patchWorkbookRanges("wb", "All", edits); } catch (e) { err = e.message; }
    const out = { err, posts: window.__wsPosts.slice(), row: mock._grids.All[1].slice() };
    __wsBatchOff();
    // A failure in chunk 1 (request 5) stops everything: no chunk 2 is sent.
    const mock2 = createMockGraphClient({ sheets: { All: [headers, headers.map(() => "")] } });
    const client2 = __wsBatch(mock2, 4);
    let e2 = null;
    try { await client2.patchWorkbookRanges("wb", "All", edits); } catch (e) { e2 = { code: e.code, landed: e.landed, failedAt: e.failedAt, message: e.message }; }
    out.fail = { e2, posts: window.__wsPosts.slice(), row: mock2._grids.All[1].slice() };
    __wsBatchOff();
    return out;
  });
  ok("F5 25 edits go as two $batch POSTs of 20 and 5 (Graph refuses more than 20)",
    !F5.err && JSON.stringify(F5.posts) === "[20,5]", F5);
  ok("F5b ... and all 25 cells land, each in its own column",
    F5.row.every((v, i) => v === "v" + i), F5.row);
  ok("F5c a failure in the first chunk sends no second chunk; exactly the 4 ranges before it landed",
    !!F5.fail.e2 && JSON.stringify(F5.fail.posts) === "[20]" && JSON.stringify(F5.fail.e2.landed) === "[0,1,2,3]" &&
    F5.fail.e2.failedAt === 4 && F5.fail.row.slice(0, 4).every((v, i) => v === "v" + i) && F5.fail.row.slice(4).every(v => v === ""), F5.fail);

  // ===================== Stage B: F2 =====================================
  // Edits: Grade, Cost, Remarks, Reviewed, LastModified (F1). Cost fails.
  const F2 = await page.evaluate(async (seed) => {
    const mock = __wsSetup(seed);
    __setGraphClientForTest(__wsBatch(mock, 1));
    const snap = await readAllRowWritableValues(2);
    const next = Object.assign({}, snap, { Grade: "MS-65", Cost: 9, Remarks: "new remark" });
    const res = await saveCoinRowToWorkbook("AY-00001", next, snap);
    const mid = { grade: __wsCol(mock, "Grade", 2), cost: __wsCol(mock, "Cost", 2), lm: __wsCol(mock, "LastModified", 2) };
    __wsBatchOff();
    // The next Save, from the snapshot the result hands back, with Graph healthy.
    __setGraphClientForTest(__wsBatch(mock, -1));
    const res2 = await saveCoinRowToWorkbook("AY-00001", next, res.freshValues || snap);
    const end = { grade: __wsCol(mock, "Grade", 2), cost: __wsCol(mock, "Cost", 2), remarks: __wsCol(mock, "Remarks", 2), lm: __wsCol(mock, "LastModified", 2) };
    __wsBatchOff();
    __wsTeardown();
    return { res, mid, res2, end };
  }, allSeed());
  ok("F2 a part-landed save returns reason partial: Grade landed; Cost, Remarks, Reviewed and LastModified did not",
    !F2.res.ok && F2.res.reason === "partial" && JSON.stringify(F2.res.landed) === JSON.stringify(["Grade"]) &&
    ["Cost", "Remarks", "Reviewed", "LastModified"].every(c => (F2.res.notLanded || []).includes(c)), F2.res);
  ok("F2b the message names what did and did not land and keeps Graph's own error text",
    /Saved: Grade/.test(F2.res.message || "") && /NOT saved: .*Cost/.test(F2.res.message || "") && /MOCK-GRAPH-500/.test(F2.res.message || ""), F2.res.message);
  ok("F2c nothing was undone and LastModified was NOT stamped (Grade stays written, Cost unchanged)",
    F2.mid.grade === "MS-65" && F2.mid.cost === 5 && F2.mid.lm === "", F2.mid);
  ok("F2d the next Save from the returned snapshot is not a false conflict on its own columns; it writes the rest",
    F2.res2.ok && F2.end.cost === 9 && F2.end.remarks === "new remark" && typeof F2.end.lm === "number", F2);
}, module);
