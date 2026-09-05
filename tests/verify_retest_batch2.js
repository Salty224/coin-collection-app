// Live-device retest batch #2 (2026-09-03). Items C(a)/C(b), 6, 7, A, 2 and
// the ValueSource/ValueDate feature request. See CLAUDE.md
// "Live-device retest batch 2" for the full write-up. Item 5 (Force Add's
// orphan blank row) is investigated in this suite but deliberately NOT
// fixed — see block F.

const { defineSuite } = require("./harness");

module.exports = defineSuite("retest-batch2", async ({ ok, openApp, PHONE, TABLET }) => {
  const page = await openApp(PHONE);

  await page.evaluate(() => {
    window.DRAFT = (o) => Object.assign({
      type: "coin", version: 1, status: "Draft — awaiting review",
      denom: "1C", year: "1943", mint: "S", variety: "", description: "Test Coin",
      photos: [], createdDate: new Date().toISOString()
    }, o);
  });

  // ================= A. Staging Review hides PROMOTED drafts (item C(a)) ====
  const A = await page.evaluate(async () => {
    const mock = createMockGraphClient({});
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-05001/coin.json",
      DRAFT({ collectionID: "AY-05001", description: "Still Draft" }));
    await mock.uploadJson(base + "/AY-05002/coin.json",
      DRAFT({ collectionID: "AY-05002", description: "Marked Ready", status: COIN_DRAFT_STATUS.READY, coinId: "C-X" }));
    await mock.uploadJson(base + "/AY-05003/coin.json",
      DRAFT({ collectionID: "AY-05003", description: "Already Promoted",
              status: COIN_DRAFT_STATUS.PROMOTED, coinId: "C-Y", allRowWritten: true }));
    navigate("staging");
    await renderStagingList();
    await new Promise(r => setTimeout(r, 250));
    const txt = document.getElementById("stagingContainer").textContent;
    // The draft FILE must survive — it is the audit trail and the photo-move
    // retry source (processPromotedCoinDrafts reads exactly these).
    const stillOnDisk = !!(await mock.getJson(base + "/AY-05003/coin.json"));
    const res = {
      showsDraft: /AY-05001/.test(txt),
      showsReady: /AY-05002/.test(txt),
      showsPromoted: /AY-05003/.test(txt),
      stillOnDisk
    };
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return res;
  });
  ok(A.showsDraft, "A1 a Draft coin still appears in Staging Review");
  ok(A.showsReady, "A2 a Marked-ready coin still appears in Staging Review");
  ok(A.showsPromoted === false, "A3 a PROMOTED draft no longer appears in Staging Review (item C(a) — it used to land under \"Needs a decision\")");
  ok(A.stillOnDisk, "A4 ... and its draft FILE is untouched — display filter only, audit trail/photo-move retry preserved");

  // ================= B. Staging Review reachable at zero rows (item C(b)) ==
  const B = await page.evaluate(async () => {
    const mock = createMockGraphClient({});
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    navigate("needsdbcoins");
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 250));
    document.getElementById("docketStagingHeader").click();
    const rowCount = document.querySelectorAll("#docketStagingContainer .wish-item").length;
    const btn = document.getElementById("docketOpenStagingBtn");
    const visible = !!btn && getComputedStyle(btn).display !== "none";
    if (btn) btn.click(); // guarded so a removed button fails cleanly, not by throwing
    const landed = document.querySelector(".view.active").id;
    const res = { rowCount, visible, landed, count: document.getElementById("docketStagingCount").textContent };
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return res;
  });
  ok(B.rowCount === 0 && B.count === "0", "B0 sanity: the Staging section is genuinely empty (0 rows, count 0)");
  ok(B.visible, "B1 the \"Open Staging Review\" entry point renders even with zero rows");
  ok(B.landed === "view-staging", "B2 ... and it actually navigates there — the screen is no longer a dead end (item C(b))");

  // ================= C. ensureLiveNavDataFetch force flag (item 6) =========
  const C = await page.evaluate(async () => {
    // The already-loaded guard is what made every post-write refresh a
    // successful-looking no-op. Prove the force flag skips it, and that a
    // plain call still short-circuits.
    const src = ensureLiveNavDataFetch.toString();
    return {
      takesOpts: /function ensureLiveNavDataFetch\(opts\)/.test(src),
      guardIsForceAware: /if \(!force && LIVE_COINS && LIVE_DB_SETS\)/.test(src),
      refreshForces: /ensureLiveNavDataFetch\(\{ force: true \}\)/.test(refreshLiveCoinsAfterWrite.toString()),
      // LIVE_COINS must NOT be nulled first — that would drop Catalog/Ledger
      // to demo data for the duration of the fetch.
      doesNotNullLive: !/LIVE_COINS = null/.test(refreshLiveCoinsAfterWrite.toString())
    };
  });
  ok(C.takesOpts, "C1 ensureLiveNavDataFetch() accepts an options argument");
  ok(C.guardIsForceAware, "C2 the \"already loaded this session\" guard is skipped when forcing (item 6 root cause)");
  ok(C.refreshForces, "C3 refreshLiveCoinsAfterWrite() passes force:true — it previously cleared only the in-flight promise, so the guard fired and nothing re-fetched");
  ok(C.doesNotNullLive, "C4 ... without nulling LIVE_COINS first (would drop Catalog/Ledger to demo data mid-fetch)");

  // ================= D. Edit Coin prefill + Remarks (item 7 / A) ===========
  // Notes specifically is gated on browseEditWriteEnabled() (the "Notes
  // flash" fix — see that section's own comment): with the write layer on,
  // it starts blank pending a real snapshot fetch, rather than reading
  // coin.remarks directly. This block is testing the mockup/flag-off
  // prefill path (item 7's fix, independent of the write layer), so the
  // flag is forced off via the test seam — ENABLE_BROWSE_EDIT_WRITE now
  // ships on by default (see CLAUDE.md "Real-Graph flags always on...").
  const D = await page.evaluate(() => {
    __setBrowseEditWriteEnabledForTest(false);
    const coin = Object.assign({}, FAKE_COINS[1], {
      shippingCost: 7.5, vendor: "NGC Shop", purchaseDate: "2026-01-15", cost: 100,
      remarks: "Bought raw, sent for grading.", valueSource: "Red Book 2027, p. 386", valueDate: "2026-07-05"
    });
    showBrowseDetail(coin); showBrowseEditView(coin);
    const res = {
      cost: document.getElementById("browseEditCost").value,
      shipping: document.getElementById("browseEditShippingCost").value,
      vendor: document.getElementById("browseEditVendor").value,
      pdate: document.getElementById("browseEditPurchaseDate").value,
      notes: document.getElementById("browseEditNotes").value,
      vsource: document.getElementById("browseEditValueSource").value,
      vdate: document.getElementById("browseEditValueDate").value
    };
    __setBrowseEditWriteEnabledForTest(null);
    return res;
  });
  ok(D.cost === "100", "D0 sanity: Cost still prefills (it always did — it reads the row itself)");
  ok(D.shipping === "7.5", "D1 Shipping now prefills from the coin's own workbook value (item 7)");
  ok(D.vendor === "NGC Shop", "D2 Seller/Vendor now prefills (item 7)");
  ok(D.pdate === "2026-01-15", "D3 Purchase Date now prefills (item 7)");
  ok(D.notes === "Bought raw, sent for grading.", "D4 Notes prefills from the coin's own All.Remarks");
  ok(D.vsource === "Red Book 2027, p. 386", "D5 Value source prefills");
  ok(D.vdate === "2026-07-05", "D6 Value date prefills");

  // Negative control for item 7: reverting to the demo-lookup-only read must
  // fail D1-D3. Proven by checking the source actually consults the coin.
  const DNEG = await page.evaluate(() => {
    const src = showBrowseEditView.toString() + (window.showBrowseEditViewInner ? showBrowseEditViewInner.toString() : "");
    return { readsCoin: /coin\.shippingCost/.test(src) && /coin\.vendor/.test(src) && /coin\.purchaseDate/.test(src) };
  });
  ok(DNEG.readsCoin, "D7 the prefill genuinely reads coin.shippingCost/vendor/purchaseDate, not only the demo lookup");

  // ================= E. Remarks + catalog fields on the DETAIL page ========
  const E = await page.evaluate(() => {
    __setLiveDbCoinsForTest([{
      denom: "10C", year: 1916, mint: "D", variety: "", description: "Mercury Dime",
      finish: "Business Strike", designation: "", coinId: "C-T", pcgs: "", mintage: null,
      gsid: "", funFact: "A famously low mintage.", notes: "Counterfeits are common; check the mintmark."
    }]);
    const coin = Object.assign({}, FAKE_COINS[0], {
      denom: "10C", year: 1916, mint: "D", variety: "",
      remarks: "Kept in the blue Whitman folder.",
      valueSource: "PCGS", valueDate: "2026-07-05", value: 1200
    });
    showBrowseDetail(coin);
    const acc = document.getElementById("detailAccordions");
    // open every accordion so textContent covers all of them
    acc.querySelectorAll(".accordion-header").forEach(h => h.click());
    const txt = acc.textContent;
    const res = {
      showsOwnNotes: /Kept in the blue Whitman folder\./.test(txt),
      showsFunFact: /A famously low mintage\./.test(txt),
      showsCatalogNotes: /Counterfeits are common/.test(txt),
      hasYoursTag: [...acc.querySelectorAll(".field-origin")].some(e => /yours/i.test(e.textContent)),
      hasCatalogTag: [...acc.querySelectorAll(".field-origin")].some(e => /catalog reference/i.test(e.textContent)),
      showsValueProv: /Value source/.test(txt) && /PCGS/.test(txt) && /2026-07-05/.test(txt)
    };
    __setLiveDbCoinsForTest(null);
    return res;
  });
  ok(E.showsOwnNotes, "E1 the coin's own All.Remarks now displays on the detail page (was unreachable outside Edit Coin)");
  ok(E.showsFunFact, "E2 DB_Coins FunFact still displays");
  ok(E.showsCatalogNotes, "E3 DB_Coins Notes (1,101 real rows) now displays read-only — Ray's ask, previously read nowhere in the app");
  // E3 above injects an already-mapped row, so it does NOT exercise
  // mapWorkbookRowToDbCoin() -- proven by a negative control that passed with
  // the mapper broken. This asserts the mapper itself reads the real column.
  const EMAP = await page.evaluate(() => {
    const mapped = mapWorkbookRowToDbCoin({
      CoinID: "C-M", Description: "Mercury Dime", Denomination: "10C", Year: 1916,
      MintMark: "D", Variety: "", Finish: "Business Strike", Designation: "",
      FunFact: "FF", Notes: "Counterfeits are common."
    });
    const blank = mapWorkbookRowToDbCoin({ CoinID: "C-N" });
    return { notes: mapped.notes, funFact: mapped.funFact, blankNotes: blank.notes };
  });
  ok(EMAP.notes === "Counterfeits are common.", "E3b mapWorkbookRowToDbCoin() genuinely reads the real DB_Coins.Notes column");
  ok(EMAP.funFact === "FF", "E3c ... alongside FunFact, unchanged");
  ok(EMAP.blankNotes === "", "E3d ... and a row with no Notes maps to blank, never undefined");

  ok(E.hasYoursTag && E.hasCatalogTag, "E4 the two kinds are labelled distinctly (\"yours\" vs \"catalog reference\")");
  ok(E.showsValueProv, "E5 Value source + date show read-only in Overview");

  // catalogNotesFor() must NOT fall back to FAKE_COIN_DETAILS.notes — that
  // field is the demo stand-in for All.Remarks (this coin's OWN note), and
  // presenting it as shared catalog data would be wrong.
  const ENEG = await page.evaluate(() => {
    __setLiveDbCoinsForTest([]);
    const anyId = Object.keys(FAKE_COIN_DETAILS).find(k => FAKE_COIN_DETAILS[k].notes);
    const c = Object.assign({}, FAKE_COINS.find(x => x.id === anyId) || FAKE_COINS[0], { id: anyId });
    const out = { demoNote: (FAKE_COIN_DETAILS[anyId] || {}).notes, catalog: catalogNotesFor(c) };
    __setLiveDbCoinsForTest(null);
    return out;
  });
  ok(ENEG.demoNote && ENEG.catalog === "", "E6 catalogNotesFor() does NOT fall back to the demo per-coin note (would present a personal note as catalog data)");

  // ================= F. Edit Coin label split (item A, first half) =========
  const F = await page.evaluate(() => {
    const coin = FAKE_COINS[0];
    showBrowseDetail(coin); showBrowseEditView(coin);
    const body = document.getElementById("editCoinNotesBody");
    const labels = [...body.querySelectorAll("label")].map(l => l.textContent.replace(/\s+/g, " ").trim());
    return {
      labels,
      funFactReadOnly: document.getElementById("browseEditFunFact").tagName === "DIV",
      catalogNotesReadOnly: document.getElementById("browseEditCatalogNotes").tagName === "DIV",
      notesEditable: document.getElementById("browseEditNotes").tagName === "TEXTAREA"
    };
  });
  ok(F.labels.some(l => /^Notes\b/.test(l) && /yours, editable/.test(l)), "F1 Notes is labelled as the user's own editable field: " + JSON.stringify(F.labels));
  ok(F.labels.some(l => /^Fun Fact\b/.test(l) && /catalog reference, read-only/.test(l)), "F2 Fun Fact is labelled catalog reference, read-only");
  ok(F.labels.some(l => /^Catalog Notes\b/.test(l) && /catalog reference, read-only/.test(l)), "F3 Catalog Notes is labelled catalog reference, read-only");
  ok(F.funFactReadOnly && F.catalogNotesReadOnly, "F4 both catalog fields are non-input DIVs — structurally read-only, no write path");
  ok(F.notesEditable, "F5 Notes remains a real editable textarea (mapping to All.Remarks is correct and unchanged)");

  // The catalog-notes label needs its OWN scoped .hidden rule — this file has
  // no global one, a trap this project has hit before.
  const FHIDE = await page.evaluate(() => {
    __setLiveDbCoinsForTest([]);
    const coin = FAKE_COINS[0];
    showBrowseDetail(coin); showBrowseEditView(coin);
    const lbl = document.getElementById("browseEditCatalogNotesLabel");
    const fld = document.getElementById("browseEditCatalogNotes");
    const out = { lblDisplay: getComputedStyle(lbl).display, fldDisplay: getComputedStyle(fld).display };
    __setLiveDbCoinsForTest(null);
    return out;
  });
  ok(FHIDE.lblDisplay === "none" && FHIDE.fldDisplay === "none",
    "F6 with no catalog note, BOTH the label and the field are genuinely hidden (real computed style, not just a class)");

  // ================= G. ValueSource/ValueDate write path (item 6 request) ==
  const G = await page.evaluate(() => ({
    writable: ALL_WRITABLE_COLUMNS.includes("ValueSource") && ALL_WRITABLE_COLUMNS.includes("ValueDate"),
    notNeverWrite: !ALL_NEVER_WRITE_COLUMNS.includes("ValueSource") && !ALL_NEVER_WRITE_COLUMNS.includes("ValueDate"),
    notIdentity: !IDENTITY_COLUMNS.includes("ValueSource") && !IDENTITY_COLUMNS.includes("ValueDate")
  }));
  ok(G.writable, "G1 ValueSource and ValueDate are on ALL_WRITABLE_COLUMNS");
  ok(G.notNeverWrite, "G2 ... and not on the never-write list");
  ok(G.notIdentity, "G3 ... and not identity fields (no overwrite-confirmation dialog for a re-valuation)");

  const GW = await page.evaluate(async () => {
    const headers = ["CollectionID","CoinID","Year","MintMark","Description","Denomination","Variety",
      "Grade","GradeSource","Designation","SerNo","CACBean","Category","Finish","Error","Value",
      "ValueSource","ValueDate","Cost","Shipping","Seller_Link","PurchaseDate","StorageLocation",
      "Container","Remarks","Reviewed","LastModified"];
    const grid = [headers.slice()];
    const row = new Array(headers.length).fill("");
    row[0] = "AY-05100"; row[15] = 500;
    grid.push(row);
    const mock = createMockGraphClient({ sheets: { All: grid } });
    __setGraphClientForTest(mock); __setBrowseEditWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();
    const res = await saveCoinRowToWorkbook("AY-05100",
      { Value: 850, ValueSource: "Red Book 2027, p. 386", ValueDate: excelSerialFromISODate("2026-07-05") },
      null, { gate: () => true });
    const g = mock._grids.All[1];
    const out = {
      ok: res.ok,
      written: res.written,
      value: g[15], source: g[16], date: g[17],
      expectedSerial: excelSerialFromISODate("2026-07-05"),
      dateIsSerial: typeof g[17] === "number"
    };
    __setBrowseEditWriteEnabledForTest(null); __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return out;
  });
  ok(GW.ok, "G4 a save carrying Value + ValueSource + ValueDate succeeds");
  ok(GW.source === "Red Book 2027, p. 386", "G5 ValueSource lands in its own column verbatim (free text — the real column carries page-level detail)");
  ok(GW.dateIsSerial && GW.date === GW.expectedSerial,
    "G6 ValueDate lands as a real Excel serial, never an ISO string (this column has prior corruption history)");
  // The serial alone does not prove the DATE FORMAT is applied -- that comes
  // from buildRowCellEdits()'s isDateCol(), and a negative control showed G6
  // passing with ValueDate omitted from it. Without the format, a real date
  // renders in Excel as a bare five-digit number.
  const GFMT = await page.evaluate(async () => {
    const headers = ["CollectionID", "Value", "ValueSource", "ValueDate", "Grade", "Reviewed", "LastModified"];
    const grid = [headers.slice(), ["AY-05101", "", "", "", "", "", ""]];
    const mock = createMockGraphClient({ sheets: { All: grid } });
    __setGraphClientForTest(mock); __resetAllHeaderMapForTest();
    const edits = await buildRowCellEdits(2, {
      ValueSource: "PCGS",
      ValueDate: excelSerialFromISODate("2026-07-05"),
      Grade: "MS-65"
    });
    const find = name => edits.find(e => e._columns.includes(name)) || {};
    const out = {
      valueDateHasFormat: !!find("ValueDate").numberFormat,
      valueSourceNoFormat: !find("ValueSource").numberFormat,
      gradeNoFormat: !find("Grade").numberFormat,
      // A date cell must never merge into a run with non-date neighbours --
      // a range PATCH applies one format to the whole rectangle.
      valueDateAlone: (find("ValueDate")._columns || []).length === 1
    };
    __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return out;
  });
  ok(GFMT.valueDateHasFormat, "G8 the ValueDate edit carries an explicit date numberFormat (else Excel shows a bare serial)");
  ok(GFMT.valueSourceNoFormat && GFMT.gradeNoFormat, "G9 ... and non-date columns do not get one");
  ok(GFMT.valueDateAlone, "G10 ... and ValueDate never merges into a range with non-date neighbours");

  ok(GW.written.includes("ValueSource") && GW.written.includes("ValueDate"), "G7 both are reported in the write result");

  // ================= H. Calendar icon (item 2) =============================
  const H = await page.evaluate(() => {
    const rules = [];
    for (const sheet of document.styleSheets) {
      let list; try { list = sheet.cssRules; } catch (e) { continue; }
      for (const r of list || []) if (r.cssText && /calendar-picker-indicator/.test(r.cssText)) rules.push(r.cssText);
    }
    const rootScheme = getComputedStyle(document.documentElement).colorScheme;
    return { rules, count: rules.length, rootScheme, dateInputs: document.querySelectorAll('input[type=date]').length };
  });
  ok(H.count > 0, "H1 a ::-webkit-calendar-picker-indicator rule exists");
  ok(H.rules.some(r => /filter/.test(r)), "H2 ... and it applies a filter so the glyph isn't drawn black-on-black");
  // Chromium serialises the selector with quotes: input[type="date"]
  ok(/input\[type=["']?date["']?\]/.test(H.rules.join(" ")), "H3 ... scoped to date inputs via the shared element selector, not a per-field rule");
  // 5 pre-existing (Edit Coin, Edit Set, Wishlist, Add Coin, Add Set) plus
  // the two "Value date" fields added this round (Edit Coin, Add Coin) = 7,
  // plus the two "Sale / Removal Date" exit-detail fields added by the
  // Status/exit-fields feature (Edit Coin, Edit Set — Add Coin's own Status
  // picker deliberately has no reveal, so it contributes none) = 9.
  ok(H.dateInputs === 9, "H4 all nine date inputs are covered by that one selector: " + H.dateInputs);
  ok(H.rootScheme !== "dark", "H5 no blanket color-scheme:dark on :root — that would repaint scrollbars and native select popups app-wide");

  // ================= I. Item 5 — claim a blank row, never orphan ==========
  // Rewritten from "investigated, not fixed" to assert the real fix (option
  // 2). createAllSheetRow() now reads first and claims a blank row the table
  // already has; nothing is created until the keys are written, so a failure
  // anywhere above leaves the sheet exactly as it was.
  const mkGrid = () => {
    const headers = ["CollectionID","CoinID","Year","MintMark","Description","Denomination","Variety",
      "Grade","GradeSource","Designation","SerNo","CACBean","Category","Finish","Error","Value",
      "ValueSource","ValueDate","Cost","Shipping","Total","SpotValue","Seller_Link","PurchaseDate",
      "StorageLocation","Container","Remarks","Reviewed","LastModified"];
    const g = [headers.slice()];
    for (let i = 1; i <= 3; i++) { const r = new Array(headers.length).fill(""); r[0] = "AY-0700" + i; r[2] = 1900 + i; g.push(r); }
    // Pre-existing trailing blanks INSIDE the table — the real workbook has
    // 987 of them (A1:AY1544 while data ends at row 557). Formula columns
    // carry a computed value even on a blank row, exactly like the real one.
    for (let i = 0; i < 4; i++) { const r = new Array(headers.length).fill(null); r[20] = 0; r[21] = 0; g.push(r); }
    return g;
  };

  const I = await page.evaluate(async (gridJson) => {
    const grid = JSON.parse(gridJson);
    const mock = createMockGraphClient({ sheets: { All: grid } });
    let appends = 0;
    const realAdd = mock.addTableRow.bind(mock);
    mock.addTableRow = (...a) => { appends++; return realAdd(...a); };
    __setGraphClientForTest(mock); __resetAllHeaderMapForTest();
    const before = mock._grids.All.length;
    const row = await createAllSheetRow("AY-07010", "C-Z");
    const g = mock._grids.All;
    const out = {
      row, appends, grewBy: g.length - before,
      // rows 2-4 are real coins, so the first blank is sheet row 5
      claimedFirstBlank: row === 5,
      keys: [g[row - 1][0], g[row - 1][1]]
    };
    __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return out;
  }, JSON.stringify(mkGrid()));
  ok(I.appends === 0, "I1 no row is appended when the table already has a blank one (item 5, option 2)");
  ok(I.grewBy === 0, "I2 ... so the table does not grow at all");
  ok(I.claimedFirstBlank, "I3 the FIRST blank row is claimed, so new coins land right after the real data (~row 558 live), not past 987 blanks at ~1545: got row " + I.row);
  ok(I.keys[0] === "AY-07010" && I.keys[1] === "C-Z", "I4 the claimed row carries both key cells");

  // The orphan mechanism itself: a failing create must leave the sheet
  // untouched. This is the exact live scenario — a second call whose probe
  // was stale, which used to append and THEN hit the tripwire.
  const I2 = await page.evaluate(async (gridJson) => {
    const grid = JSON.parse(gridJson);
    grid[1][0] = "AY-07010"; // the id is already on the sheet
    const mock = createMockGraphClient({ sheets: { All: grid } });
    let appends = 0;
    const realAdd = mock.addTableRow.bind(mock);
    mock.addTableRow = (...a) => { appends++; return realAdd(...a); };
    __setGraphClientForTest(mock); __resetAllHeaderMapForTest();
    const before = mock._grids.All.length;
    let err = null;
    try { await createAllSheetRow("AY-07010", ""); } catch (e) { err = e.message; }
    const out = { err, appends, grewBy: mock._grids.All.length - before };
    __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return out;
  }, JSON.stringify(mkGrid()));
  ok(/already appears on the All sheet/.test(I2.err || ""), "I5 the already-on-the-sheet tripwire still fires");
  ok(I2.appends === 0 && I2.grewBy === 0, "I6 ... and leaves NO orphan row behind — this is the live-reported bug, fixed at the source");
  ok(!/blank row was appended/.test(I2.err || ""), "I7 ... and its message no longer tells the user to go delete one");

  // A blank KEY is not enough — the whole row must be empty, or a new coin
  // would attach itself to someone's part-entered row.
  const I3 = await page.evaluate(async (gridJson) => {
    const grid = JSON.parse(gridJson);
    grid[4][7] = "MS-65";           // sheet row 5: blank id, but real data
    const mock = createMockGraphClient({ sheets: { All: grid } });
    __setGraphClientForTest(mock); __resetAllHeaderMapForTest();
    const row = await createAllSheetRow("AY-07011", "");
    const out = { row, skippedPartial: row !== 5, partialIntact: mock._grids.All[4][7] };
    __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return out;
  }, JSON.stringify(mkGrid()));
  ok(I3.skippedPartial && I3.row === 6, "I8 a row with a blank CollectionID but real data is NOT claimed — skipped to row 6, got " + I3.row);
  ok(I3.partialIntact === "MS-65", "I9 ... and that row's data is untouched");

  // The live formula columns must not make every row look occupied.
  const I4 = await page.evaluate(async (gridJson) => {
    const grid = JSON.parse(gridJson);
    const mock = createMockGraphClient({ sheets: { All: grid } });
    __setGraphClientForTest(mock); __resetAllHeaderMapForTest();
    const blank = await allSheetRowIsBlank(5);
    const populated = await allSheetRowIsBlank(2);
    const out = { blank, populated, formulaCols: ALL_NEVER_WRITE_FORMULA_COLUMNS };
    __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return out;
  }, JSON.stringify(mkGrid()));
  ok(I4.blank === true, "I10 a row carrying only Total/SpotValue formula output still counts as blank (else nothing would ever be claimable)");
  ok(I4.populated === false, "I11 ... while a real coin's row does not");
  ok(JSON.stringify(I4.formulaCols) === JSON.stringify(["SpotValue", "Total"]), "I12 the excluded formula columns are named once, so they can't drift from the never-write list");

  // Append is still the fallback when the table is genuinely full.
  const I5 = await page.evaluate(async (gridJson) => {
    const grid = JSON.parse(gridJson);
    while (grid.length > 4) grid.pop(); // drop every blank row
    const mock = createMockGraphClient({ sheets: { All: grid } });
    let appends = 0;
    const realAdd = mock.addTableRow.bind(mock);
    mock.addTableRow = (...a) => { appends++; return realAdd(...a); };
    __setGraphClientForTest(mock); __resetAllHeaderMapForTest();
    const row = await createAllSheetRow("AY-07012", "");
    const out = { row, appends, id: mock._grids.All[row - 1][0] };
    __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return out;
  }, JSON.stringify(mkGrid()));
  ok(I5.appends === 1 && I5.row === 5 && I5.id === "AY-07012",
    "I13 with no blank row left, it still appends — the fallback path is kept, just no longer the default");

  // Claiming (unlike appending) is not inherently unique, and the promote
  // lock is keyed per CollectionID so it does not cover two DIFFERENT coins.
  const I6 = await page.evaluate(async (gridJson) => {
    const grid = JSON.parse(gridJson);
    const mock = createMockGraphClient({ sheets: { All: grid } });
    __setGraphClientForTest(mock); __resetAllHeaderMapForTest();
    // Guarded: without the lock these clobber each other and the loser's
    // verify throws, so catch it and fail cleanly rather than tearing down
    // the whole suite.
    let a = null, b = null, err = null;
    try {
      [a, b] = await Promise.all([
        createAllSheetRow("AY-07020", ""),
        createAllSheetRow("AY-07021", "")
      ]);
    } catch (e) { err = e.message; }
    const g = mock._grids.All;
    const out = { a, b, err, distinct: a !== null && b !== null && a !== b,
                  idA: a ? g[a - 1][0] : null, idB: b ? g[b - 1][0] : null };
    __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return out;
  }, JSON.stringify(mkGrid()));
  ok(I6.distinct, "I14 two concurrent creations for different coins claim DIFFERENT rows (the session-wide creation lock): " + (I6.err || (I6.a + " vs " + I6.b)));
  ok(I6.idA === "AY-07020" && I6.idB === "AY-07021", "I15 ... and neither clobbers the other's key cells");

  // ================= K. Value/ValueSource/ValueDate on Add Coin ===========
  const K = await page.evaluate(() => {
    navigate("addcoin");
    const ids = ["addCoinValue", "addCoinValueSource", "addCoinValueDate"];
    const els = ids.map(i => document.getElementById(i));
    const overview = document.getElementById("addCoinOverviewBody");
    return {
      allPresent: els.every(Boolean),
      types: els.map(e => e && (e.type || e.tagName)),
      inOverview: els.every(e => overview && overview.contains(e)),
      // $ prefix, same treatment as every other currency field
      hasCurrencyPrefix: !!(els[0] && els[0].closest(".currency-input-row"))
    };
  });
  ok(K.allPresent, "K1 Add Coin has Value, Value source and Value date fields");
  ok(JSON.stringify(K.types) === JSON.stringify(["number", "text", "date"]),
    "K2 ... typed correctly (number / free text / date): " + JSON.stringify(K.types));
  ok(K.inOverview, "K3 ... all three inside Overview, alongside the other identity/value fields");
  ok(K.hasCurrencyPrefix, "K4 Value carries the $ prefix, same as every other currency field");

  // Captured onto the draft, then mapped through to All on promotion.
  const K2 = await page.evaluate(() => {
    navigate("addcoin");
    document.getElementById("addCoinValue").value = "850.5";
    document.getElementById("addCoinValueSource").value = "Red Book 2027, p. 386";
    document.getElementById("addCoinValueDate").value = "2026-07-05";
    const form = readAddCoinFormForDraft();
    const draft = buildCoinDraft("AY-08001", form, null);
    const vals = coinDraftToAllValues(draft);
    return {
      formValue: form.value, formSource: form.valueSource, formDate: form.valueDate,
      draftValue: draft.value, draftSource: draft.valueSource, draftDate: draft.valueDate,
      allValue: vals.Value, allSource: vals.ValueSource, allDate: vals.ValueDate,
      expectedSerial: excelSerialFromISODate("2026-07-05"),
      dateIsSerial: typeof vals.ValueDate === "number"
    };
  });
  ok(K2.formValue === 850.5 && K2.formSource === "Red Book 2027, p. 386" && K2.formDate === "2026-07-05",
    "K5 readAddCoinFormForDraft() captures all three");
  ok(K2.draftValue === 850.5 && K2.draftSource === "Red Book 2027, p. 386" && K2.draftDate === "2026-07-05",
    "K6 ... and they land on the draft");
  ok(K2.allValue === 850.5 && K2.allSource === "Red Book 2027, p. 386",
    "K7 coinDraftToAllValues() maps Value and ValueSource, so they survive promotion");
  ok(K2.dateIsSerial && K2.allDate === K2.expectedSerial,
    "K8 ... and ValueDate goes through the Excel-serial path, never as a raw ISO string");

  // An untouched form must not write zeros/blanks over anything.
  const K3 = await page.evaluate(() => {
    navigate("addcoin");
    const vals = coinDraftToAllValues(buildCoinDraft("AY-08002", readAddCoinFormForDraft(), null));
    return { hasValue: "Value" in vals, hasDate: "ValueDate" in vals, source: vals.ValueSource };
  });
  ok(K3.hasValue === false && K3.hasDate === false,
    "K9 an untouched Value/ValueDate is omitted entirely, not written as 0 or a bogus serial");
  ok(K3.source === "", "K10 ... while ValueSource writes \"\" (a real, clearable value), same rule as the other string columns");

  // Reset between visits, and restore when editing a Staging draft.
  const K4 = await page.evaluate(() => {
    navigate("addcoin");
    document.getElementById("addCoinValue").value = "999";
    document.getElementById("addCoinValueSource").value = "leftover";
    document.getElementById("addCoinValueDate").value = "2020-01-01";
    navigate("dashboard");
    navigate("addcoin"); // plain re-entry must start clean
    const cleared = {
      v: document.getElementById("addCoinValue").value,
      s: document.getElementById("addCoinValueSource").value,
      d: document.getElementById("addCoinValueDate").value
    };
    applyCoinDraftToForm({
      collectionID: "AY-08003", denom: "1C", year: "1943", mint: "S",
      value: 1200, valueSource: "PCGS", valueDate: "2026-02-02"
    });
    const restored = {
      v: document.getElementById("addCoinValue").value,
      s: document.getElementById("addCoinValueSource").value,
      d: document.getElementById("addCoinValueDate").value
    };
    return { cleared, restored };
  });
  ok(K4.cleared.v === "" && K4.cleared.s === "" && K4.cleared.d === "",
    "K11 resetAddCoinForm() clears all three on a plain re-entry (live-run bug #1's rule)");
  ok(K4.restored.v === "1200" && K4.restored.s === "PCGS" && K4.restored.d === "2026-02-02",
    "K12 applyCoinDraftToForm() restores all three when editing a Staging draft (Phase A)");

  // End-to-end: a real promote must land all three in the right columns.
  const K5 = await page.evaluate(async () => {
    const headers = ["CollectionID","CoinID","Year","MintMark","Description","Denomination","Variety",
      "Grade","GradeSource","Designation","SerNo","CACBean","Category","Finish","Error","Value",
      "ValueSource","ValueDate","Cost","Shipping","Total","SpotValue","Seller_Link","PurchaseDate",
      "StorageLocation","Container","Remarks","Reviewed","LastModified"];
    const grid = [headers.slice()];
    const real = new Array(headers.length).fill(""); real[0] = "AY-08100";
    grid.push(real);
    for (let i = 0; i < 3; i++) { const r = new Array(headers.length).fill(null); r[20] = 0; r[21] = 0; grid.push(r); }
    const mock = createMockGraphClient({ sheets: { All: grid } });
    __setGraphClientForTest(mock); __setAddCoinWriteEnabledForTest(true); __resetAllHeaderMapForTest();
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-08101/coin.json", {
      type: "coin", version: 1, status: COIN_DRAFT_STATUS.READY, collectionID: "AY-08101",
      denom: "1C", year: "1943", mint: "S", variety: "", description: "Lincoln Wheat Steel",
      grade: "MS-65", coinId: "C-Q", value: 850.5, valueSource: "Red Book 2027, p. 386",
      valueDate: "2026-07-05", photos: [], createdDate: new Date().toISOString()
    });
    const res = await promoteCoinDraftToAllSheet("AY-08101");
    const g = mock._grids.All;
    let rn = null;
    for (let i = 1; i < g.length; i++) if (g[i][0] === "AY-08101") rn = i + 1;
    const out = {
      ok: res.ok, message: res.message || null, row: rn,
      value: rn ? g[rn - 1][15] : null,
      source: rn ? g[rn - 1][16] : null,
      date: rn ? g[rn - 1][17] : null,
      expectedSerial: excelSerialFromISODate("2026-07-05"),
      // claimed an existing blank row, did not extend the table
      grew: g.length - (2 + 3)
    };
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return out;
  });
  ok(K5.ok, "K13 a promote carrying Value/ValueSource/ValueDate succeeds: " + (K5.message || ""));
  ok(K5.value === 850.5 && K5.source === "Red Book 2027, p. 386" && K5.date === K5.expectedSerial,
    "K14 ... and all three land in their own columns on the real row");
  ok(K5.grew === 0, "K15 ... claiming an existing blank row, without extending the table (item 5 in the real promote path)");

  // ================= J. Nav smoke / overflow, both viewports ==============
  for (const [label, vp] of [["phone", PHONE], ["tablet", TABLET]]) {
    const p2 = await openApp(vp);
    const J = await p2.evaluate(() => {
      const routes = ["dashboard", "browse", "sets", "albums", "wishlist", "addcoin", "stats", "needsdbcoins", "staging"];
      const bad = [];
      routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
      navigate("dashboard");
      return { bad, overflow: document.body.scrollWidth > window.innerWidth };
    });
    ok(J.bad.length === 0, "J1(" + label + ") every route navigates cleanly: " + J.bad.join("; "));
    ok(J.overflow === false, "J2(" + label + ") no horizontal page overflow");
  }
}, module);
