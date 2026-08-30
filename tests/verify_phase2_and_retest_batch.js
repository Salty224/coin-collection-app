// Live-device retest batch: Add Coin Phase 2 (the real All-sheet write),
// the Set flip-card removal, circle-aware corner fitting, the metal-filter
// join gap, and the three smaller detail-level additions.
//
// See CLAUDE.md's own section for this round's full design reasoning.

const { defineSuite } = require("./harness");

// A DB_Coins row the matcher will resolve cleanly, so a draft can be given a
// real CoinID without depending on whatever the mock catalog happens to hold.
const MATCH_ROW = {
  denom: "10C", year: 1916, mint: "D", variety: "", description: "Mercury Dime",
  finish: "Business Strike", designation: "", gsid: "", pcgs: "4682",
  mintage: 264000, coinId: "C-1916-M-10C-01", composition: "90% Silver"
};

// The All sheet's header row, in the real column order this layer resolves
// positions from. Deliberately includes the two formula columns so a test
// can assert they are never written.
const ALL_HEADERS = [
  "CollectionID", "CoinID", "Denomination", "Category", "Year", "MintMark",
  "Variety", "Description", "Finish", "Designation", "Grade", "GradeSource",
  "SerNo", "CACBean", "Cost", "Shipping", "Total", "Seller_Link",
  "PurchaseDate", "SpotValue", "Value", "StorageLocation", "Container",
  "Remarks", "Reviewed", "LastModified", "Error"
];

function seedMock() {
  return {
    sheets: { All: [ALL_HEADERS.slice(), ["AY-00001", "C-OLD", "$1", "", 1889, "CC"]] }
  };
}

module.exports = defineSuite("phase2-and-retest-batch", async ({ ok, openApp, PHONE, TABLET }) => {
  const page = await openApp(PHONE);

  // ============ PART 1: Add Coin Phase 2 — the real write ============

  // ---------- A. The new primitive appends a genuinely BLANK row ----------
  const A = await page.evaluate((args) => {
    const ALL_HEADERS = args.headers;
    const seed = args.seed;
    const mock = createMockGraphClient(seed);
    __setGraphClientForTest(mock);
    const before = mock._grids.All.length;
    return mock.addTableRow("wb", "AllCoins").then(res => {
      const g = mock._grids.All;
      const out = {
        added: g.length - before,
        index: res.index,
        newRowAllBlank: g[g.length - 1].every(v => v === null),
        width: g[g.length - 1].length
      };
      __setGraphClientForTest(null);
      return out;
    });
  }, { seed: seedMock(), headers: ALL_HEADERS });
  ok(A.added === 1 && A.newRowAllBlank,
    "A1 addTableRow() appends exactly one row and every cell in it is blank — never a values array that would have to fill the formula columns");
  ok(A.width === ALL_HEADERS.length, "A2 -- the blank row spans the table's real width");

  // ---------- B. Key columns: writable ONLY through the narrow path ----------
  const B = await page.evaluate(() => ({
    collectionIdNeverWrite: ALL_NEVER_WRITE_COLUMNS.indexOf("CollectionID") !== -1,
    coinIdNeverWrite: ALL_NEVER_WRITE_COLUMNS.indexOf("CoinID") !== -1,
    collectionIdNotWritable: ALL_WRITABLE_COLUMNS.indexOf("CollectionID") === -1,
    coinIdNotWritable: ALL_WRITABLE_COLUMNS.indexOf("CoinID") === -1,
    categoryWritable: ALL_WRITABLE_COLUMNS.indexOf("Category") !== -1,
    finishWritable: ALL_WRITABLE_COLUMNS.indexOf("Finish") !== -1,
    cacWritable: ALL_WRITABLE_COLUMNS.indexOf("CACBean") !== -1,
    formulasNeverWrite: ["Total", "SpotValue"].every(c => ALL_NEVER_WRITE_COLUMNS.indexOf(c) !== -1),
    disjoint: ALL_WRITABLE_COLUMNS.every(c => ALL_NEVER_WRITE_COLUMNS.indexOf(c) === -1)
  }));
  ok(B.collectionIdNeverWrite && B.coinIdNeverWrite && B.collectionIdNotWritable && B.coinIdNotWritable,
    "B1 CollectionID/CoinID stay on the never-write list and off the allow-list — the general machinery still cannot touch them");
  ok(B.categoryWritable && B.finishWritable && B.cacWritable,
    "B2 Category, Finish and CACBean are on the allow-list (Q2) so promotion stops dropping captured data");
  ok(B.formulasNeverWrite && B.disjoint,
    "B3 the two live formula columns remain unwritable, and the two lists stay disjoint");

  // ---------- C. A clean-match draft promotes end to end ----------
  const C = await page.evaluate(async (args) => {
    const ALL_HEADERS = args.headers;
    const mock = createMockGraphClient(args.seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setBrowseEditWriteEnabledForTest(false); // prove Add Coin's own flag authorizes this
    __setLiveDbCoinsForTest([args.row]);
    __resetAllHeaderMapForTest();
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00700/coin.json", {
      type: "coin", version: 1, collectionID: "AY-00700", status: COIN_DRAFT_STATUS.READY,
      denom: "10C", category: "", year: "1916", mint: "D", variety: "", description: "Mercury Dime",
      finish: "Business Strike", designation: "", grade: "VG-8", gradeSource: "PCGS",
      serNo: "12345678", cacBean: "Green", cost: 950, shippingCost: 12.5,
      purchaseDate: "2024-05-02", vendor: "Great Collections",
      storageLocation: "Safe", container: "", remarks: "test note",
      coinId: "C-1916-M-10C-01", photos: [], allRowWritten: false, forceAdded: false,
      createdDate: new Date().toISOString()
    });

    const result = await promoteCoinDraftToAllSheet("AY-00700");
    const g = mock._grids.All;
    const idx = n => ALL_HEADERS.indexOf(n);
    const row = g[result.rowNumber - 1];
    const draftAfter = await readCoinDraft("AY-00700");

    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null);
    __setBrowseEditWriteEnabledForTest(null); __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return {
      ok: result.ok, rowNumber: result.rowNumber,
      collectionId: row[idx("CollectionID")], coinId: row[idx("CoinID")],
      denom: row[idx("Denomination")], grade: row[idx("Grade")],
      cac: row[idx("CACBean")], finish: row[idx("Finish")],
      cost: row[idx("Cost")], seller: row[idx("Seller_Link")],
      total: row[idx("Total")], spot: row[idx("SpotValue")],
      reviewed: row[idx("Reviewed")], lastModified: row[idx("LastModified")],
      draftStatus: draftAfter.status
    };
  }, { seed: seedMock(), row: MATCH_ROW, headers: ALL_HEADERS });
  ok(C.ok === true, "C1 a clean-match draft promotes successfully");
  ok(C.collectionId === "AY-00700" && C.coinId === "C-1916-M-10C-01",
    "C2 the new row carries both its keys, written through writeNewRowKeyCells()");
  ok(C.denom === "10C" && C.grade === "VG-8" && C.cost === 950 && C.seller === "Great Collections",
    "C3 the captured data lands in the right columns: " + JSON.stringify(C));
  ok(C.cac === "Green" && C.finish === "Business Strike",
    "C4 -- including the three columns added to the allow-list for Phase 2");
  ok(C.total === null && C.spot === null,
    "C5 THE SAFETY PROPERTY: both live formula cells are untouched by the whole create-and-populate cycle");
  ok(C.reviewed === "" && C.lastModified != null,
    "C6 Reviewed is blanked and LastModified stamped, exactly as an app-written row should be");

  // ---------- D. Promote is refused without a match; Force Add is not ----------
  const D = await page.evaluate(async (args) => {
    const ALL_HEADERS = args.headers;
    const seed = args.seed;
    const mock = createMockGraphClient(seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([]);
    __resetAllHeaderMapForTest();
    const base = writePaths().stagingBase;
    const draft = {
      type: "coin", version: 1, collectionID: "AY-00701", status: COIN_DRAFT_STATUS.READY,
      denom: "1C", year: "1943", mint: "S", variety: "Steel", description: "Lincoln Wheat Cent",
      grade: "AU-55", coinId: "", photos: [], allRowWritten: false, forceAdded: false,
      createdDate: new Date().toISOString()
    };
    await mock.uploadJson(base + "/AY-00701/coin.json", draft);

    const refused = await promoteCoinDraftToAllSheet("AY-00701");
    const rowsAfterRefusal = mock._grids.All.length;
    const forced = await promoteCoinDraftToAllSheet("AY-00701", { force: true });
    const g = mock._grids.All;
    const idx = n => ALL_HEADERS.indexOf(n);
    const row = g[forced.rowNumber - 1];

    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null);
    __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return {
      refusedOk: refused.ok, refusedReason: refused.reason, rowsAfterRefusal,
      forcedOk: forced.ok, collectionId: row[idx("CollectionID")],
      coinId: row[idx("CoinID")], grade: row[idx("Grade")], variety: row[idx("Variety")]
    };
  }, { seed: seedMock(), headers: ALL_HEADERS });
  ok(D.refusedOk === false && D.refusedReason === "no-match" && D.rowsAfterRefusal === 2,
    "D1 Promote refuses an unmatched draft and writes nothing at all");
  ok(D.forcedOk === true && D.collectionId === "AY-00701",
    "D2 Force Add writes the same coin as a real row");
  ok(D.coinId === null || D.coinId === "",
    "D3 -- with its CoinID genuinely BLANK, not invented: " + JSON.stringify(D.coinId));
  ok(D.grade === "AU-55" && D.variety === "Steel",
    "D4 -- and every other captured value still lands");

  // ---------- E. Q4.1: a force-added row gets its CoinID later, no re-entry ----------
  const E = await page.evaluate(async (args) => {
    const ALL_HEADERS = args.headers;
    const mock = createMockGraphClient(args.seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00702/coin.json", {
      type: "coin", version: 1, collectionID: "AY-00702", status: COIN_DRAFT_STATUS.READY,
      denom: "10C", year: "1916", mint: "D", variety: "", description: "Mercury Dime",
      grade: "VG-8", coinId: "", photos: [], allRowWritten: true, forceAdded: true,
      createdDate: new Date().toISOString()
    });
    // The row already exists, deliberately unlinked — as Force Add leaves it.
    __setLiveDbCoinsForTest([]);
    await promoteCoinDraftToAllSheet("AY-00702", { force: true });
    const idx = n => ALL_HEADERS.indexOf(n);
    const rowNum = await findAllSheetRowNumber("AY-00702");
    const before = mock._grids.All[rowNum - 1][idx("CoinID")];
    const gradeBefore = mock._grids.All[rowNum - 1][idx("Grade")];

    // Catalog gap closes; the user re-checks.
    __setLiveDbCoinsForTest([args.row]);
    const draft = await readCoinDraft("AY-00702");
    await applyCoinDraftMatch(draft, args.row);
    const after = mock._grids.All[rowNum - 1][idx("CoinID")];
    const gradeAfter = mock._grids.All[rowNum - 1][idx("Grade")];
    const draftAfter = await readCoinDraft("AY-00702");

    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null);
    __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return { before, after, gradeBefore, gradeAfter,
             status: draftAfter.status, forceAdded: draftAfter.forceAdded,
             PROMOTED: COIN_DRAFT_STATUS.PROMOTED };
  }, { seed: seedMock(), row: MATCH_ROW, headers: ALL_HEADERS });
  ok(!E.before && E.after === "C-1916-M-10C-01",
    "E1 Q4.1: a later Re-check writes the real CoinID into the already-written row — the whole point of Force Add");
  ok(E.gradeBefore === "VG-8" && E.gradeAfter === "VG-8",
    "E2 -- and nothing else on the row is re-entered or disturbed");
  ok(E.status === E.PROMOTED && E.forceAdded === false,
    "E3 -- the draft stops being a research item once its gap is genuinely closed");

  // ---------- F. Dismiss requires a reason and keeps it as audit trail ----------
  const F = await page.evaluate(async (seed) => {
    const mock = createMockGraphClient(seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00703/coin.json", {
      type: "coin", version: 1, collectionID: "AY-00703", status: COIN_DRAFT_STATUS.READY,
      denom: "1C", year: "1943", mint: "S", description: "Lincoln Wheat Cent",
      coinId: "", photos: [], allRowWritten: true, forceAdded: true,
      createdDate: new Date().toISOString()
    });
    promptDismissForceAdded("AY-00703");
    const dialogOpen = !document.getElementById("writeGuardOverlay").classList.contains("hidden");
    // Blank reason must NOT close the dialog or record anything.
    const btns = [...document.querySelectorAll("#writeGuardBtns button")];
    btns.find(b => b.textContent === "Dismiss").click();
    await new Promise(r => setTimeout(r, 60));
    const stillOpen = !document.getElementById("writeGuardOverlay").classList.contains("hidden");
    const untouched = (await readCoinDraft("AY-00703")).status;
    // Now a real reason.
    document.getElementById("forceAddDismissReason").value = "new variety, no catalog row expected";
    [...document.querySelectorAll("#writeGuardBtns button")].find(b => b.textContent === "Dismiss").click();
    await new Promise(r => setTimeout(r, 400));
    const after = await readCoinDraft("AY-00703");
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return { dialogOpen, stillOpen, untouched, status: after.status, reason: after.dismissedReason,
             READY: COIN_DRAFT_STATUS.READY, PROMOTED: COIN_DRAFT_STATUS.PROMOTED };
  }, seedMock());
  ok(F.dialogOpen, "F1 Dismiss opens a confirmation rather than acting immediately");
  ok(F.stillOpen && F.untouched === F.READY,
    "F2 a blank reason keeps the dialog open and records nothing");
  ok(F.status === F.PROMOTED && F.reason === "new variety, no catalog row expected",
    "F3 a real reason closes the card and is kept on the draft as the audit trail");

  // ---------- G. Photos relocate app-side, copy-verify-delete ----------
  const G = await page.evaluate(async (seed) => {
    const mock = createMockGraphClient(seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    const p = writePaths(), base = p.stagingBase;
    await mock.uploadBytes(base + "/AY-00704/AY-00704_obverse.jpg", new Uint8Array([1, 2, 3]));
    await mock.uploadBytes(base + "/AY-00704/AY-00704_receipt.pdf", new Uint8Array([9]));
    const draft = {
      type: "coin", version: 1, collectionID: "AY-00704", status: COIN_DRAFT_STATUS.PROMOTED,
      denom: "1C", year: "1943", photos: ["AY-00704_obverse.jpg"], receiptPhoto: "AY-00704_receipt.pdf",
      allRowWritten: true, filesMovedOnPromotion: false, createdDate: new Date().toISOString()
    };
    await mock.uploadJson(base + "/AY-00704/coin.json", draft);
    const planned = plannedCoinPromotionMoves(draft).length;
    const res = await movePromotedCoinFiles(draft);
    const out = {
      planned, allOk: res.allOk,
      photoAtDest: (await mock.getItemMeta(p.coinPhotos + "/AY-00704_obverse.jpg")) !== null,
      receiptAtDest: (await mock.getItemMeta(p.coinReceipts + "/AY-00704_receipt.pdf")) !== null,
      sourceGone: (await mock.getFileBytes(base + "/AY-00704/AY-00704_obverse.jpg")) === null,
      flagged: (await readCoinDraft("AY-00704")).filesMovedOnPromotion
    };
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return out;
  }, seedMock());
  ok(G.planned === 2 && G.allOk, "G1 both the photo and the receipt are planned and moved");
  ok(G.photoAtDest && G.receiptAtDest, "G2 -- each lands in its own real destination folder");
  ok(G.sourceGone && G.flagged, "G3 -- the source is removed only after a verified copy, and the draft is flagged done");

  // ---------- H. Everything stays inert with the flag off ----------
  const H = await page.evaluate(async (seed) => {
    const mock = createMockGraphClient(seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(false);
    const rowsBefore = mock._grids.All.length;
    const res = await promoteCoinDraftToAllSheet("AY-00001");
    const out = { reason: res.reason, ok: res.ok, rowsAfter: mock._grids.All.length, rowsBefore };
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return out;
  }, seedMock());
  ok(H.ok === false && H.reason === "disabled" && H.rowsAfter === H.rowsBefore,
    "H1 with ENABLE_ADDCOIN_WRITE off, promotion writes nothing and reports disabled");

  // ---------- I. The Docket splits READY drafts by catalog match ----------
  const I = await page.evaluate(async (seed) => {
    const mock = createMockGraphClient(seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([]);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00710/coin.json", {
      type: "coin", version: 1, collectionID: "AY-00710", status: COIN_DRAFT_STATUS.READY,
      denom: "10C", year: "1916", mint: "D", description: "Matched Dime",
      coinId: "C-1916-M-10C-01", photos: [], createdDate: new Date().toISOString()
    });
    await mock.uploadJson(base + "/AY-00711/coin.json", {
      type: "coin", version: 1, collectionID: "AY-00711", status: COIN_DRAFT_STATUS.READY,
      denom: "1C", year: "1943", mint: "S", description: "Unmatched Cent",
      coinId: "", photos: [], createdDate: new Date().toISOString()
    });
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 300));
    const staging = document.getElementById("docketStagingContainer");
    const research = document.getElementById("docketResearchContainer");
    const out = {
      matchedInStaging: /AY-00710/.test(staging.textContent),
      matchedNotInResearch: !/AY-00710/.test(research.textContent),
      unmatchedInResearch: /AY-00711/.test(research.textContent),
      unmatchedNotInStaging: !/AY-00711/.test(staging.textContent),
      promoteOnMatched: !!staging.querySelector(".docket-promote"),
      forceAddOnUnmatched: !!research.querySelector(".docket-forceadd"),
      recheckOnUnmatched: !!research.querySelector(".docket-recheck")
    };
    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return out;
  }, seedMock());
  ok(I.matchedInStaging && I.matchedNotInResearch,
    "I1 a marked-ready draft WITH a CoinID stays in Staging — no detour through research (Q4)");
  ok(I.unmatchedInResearch && I.unmatchedNotInStaging,
    "I2 -- and one without a CoinID moves to research, listed once, not in both");
  ok(I.promoteOnMatched, "I3 Promote is offered right there on the matched row");
  ok(I.forceAddOnUnmatched && I.recheckOnUnmatched,
    "I4 the research row gains real actions (Re-check + Force Add) instead of being a bare informational line");

  // ============ PART 2: item 2 — Sets lose the flip card entirely ============
  const J = await page.evaluate(() => {
    navigate("browse");
    const out = {};
    ["AY-00018", "AY-00022"].forEach(id => {   // childless, then multi-child
      const set = FAKE_COINS.find(c => c.id === id);
      showBrowseDetail(set);
      out[id] = {
        frameHidden: document.getElementById("browseDetailFlipFrame").style.display === "none",
        discWidth: document.getElementById("browseDetailDisc").getBoundingClientRect().width,
        photoShown: !document.getElementById("browseDetailSetPhoto").classList.contains("hidden"),
        title: document.getElementById("browseDetailName").textContent
      };
    });
    const coin = FAKE_COINS.find(c => c.id === "AY-00001");
    showBrowseDetail(coin);
    out.coin = {
      frameHidden: document.getElementById("browseDetailFlipFrame").style.display === "none",
      discWidth: document.getElementById("browseDetailDisc").getBoundingClientRect().width,
      photoShown: !document.getElementById("browseDetailSetPhoto").classList.contains("hidden"),
      title: document.getElementById("browseDetailName").textContent
    };
    return out;
  });
  ok(J["AY-00018"].frameHidden && J["AY-00018"].discWidth === 0 && J["AY-00018"].photoShown,
    "J1 a childless Set: the flip frame AND its coin graphic are both gone, the static image is what shows");
  ok(J["AY-00022"].frameHidden && J["AY-00022"].discWidth === 0 && J["AY-00022"].photoShown,
    "J2 -- identically for a multi-child Set");
  ok(!J.coin.frameHidden && J.coin.discWidth > 0 && !J.coin.photoShown,
    "J3 an ordinary coin is completely unaffected — flip card intact, static image hidden");
  ok(J["AY-00018"].title === "2021 Silver Proof Set" && J.coin.title === "1889 Morgan Dollar",
    "J4 Year now rides in the title alongside the description, not floating on a graphic: " +
      JSON.stringify([J["AY-00018"].title, J.coin.title]));

  const J5 = await page.evaluate(() => {
    // Already-dated name isn't doubled; a Roll's literal "Various" is skipped.
    const dated = detailTitleText({ name: "2021 Silver Proof Set", year: 2021 });
    const roll = detailTitleText({ name: "Roll of 20 Silver Dollars", year: "Various" });
    const plain = detailTitleText({ name: "Morgan Dollar", year: 1889 });
    return { dated, roll, plain };
  });
  ok(J5.dated === "2021 Silver Proof Set", "J5 an already-year-prefixed name isn't doubled up");
  ok(J5.roll === "Roll of 20 Silver Dollars", "J6 a mixed-date Roll's literal \"Various\" is not prefixed");
  ok(J5.plain === "1889 Morgan Dollar", "J7 -- while an ordinary coin does get its year");

  // ---------- K. Edit Set: session-only child linking ----------
  const K = await page.evaluate(() => {
    navigate("browse");
    const set = FAKE_COINS.find(c => c.id === "AY-00019"); // childless
    showBrowseDetail(set);
    showBrowseEditSetView(set);
    const before = document.querySelectorAll("#editSetChildrenRows .album-card").length;
    const optionsBefore = document.querySelectorAll("#editSetLinkCoinSelect option").length;
    const bodyHiddenAtRest = document.getElementById("editSetLinkCoinBody").classList.contains("hidden");
    document.getElementById("editSetLinkCoinHeader").click();
    const opened = !document.getElementById("editSetLinkCoinBody").classList.contains("hidden");
    document.getElementById("editSetLinkCoinSelect").value = "AY-00005";
    document.getElementById("editSetLinkCoinBtn").click();
    const after = document.querySelectorAll("#editSetChildrenRows .album-card").length;
    const optionsAfter = document.querySelectorAll("#editSetLinkCoinSelect option").length;
    const childCount = setChildrenFor(set).length;
    document.getElementById("editSetLinkCoinBackBtn").click();
    const closedAfterBack = document.getElementById("editSetLinkCoinBody").classList.contains("hidden");
    // A Set is never offered as its own child, and a linked coin can't be double-claimed.
    const candidates = linkableCoinsForSet(set).map(c => c.id);
    return { before, after, optionsBefore, optionsAfter, childCount, bodyHiddenAtRest, opened,
             closedAfterBack, noSets: !candidates.some(id => isSetRow(FAKE_COINS.find(c => c.id === id))),
             linkedGone: !candidates.includes("AY-00005") };
  });
  ok(K.bodyHiddenAtRest && K.opened, "K1 the linking control is its own collapsed accordion inside Coins in this Set");
  ok(K.before === 0 && K.after === 1 && K.childCount === 1,
    "K2 linking a coin adds it to the Set's children immediately, in memory");
  ok(K.optionsAfter === K.optionsBefore - 1 && K.linkedGone,
    "K3 -- and the just-linked coin drops out of the candidate list, so it can't be double-claimed");
  ok(K.noSets, "K4 a Set is never offered as a candidate child of another Set");
  ok(K.closedAfterBack, "K5 Back collapses the control and returns to the plain Coins-in-this-Set list");

  // ============ PART 3: item 3 — corner text clears the coin ============
  const L = await page.evaluate(() => {
    navigate("browse");
    const tr = document.getElementById("browseDetailTR");
    const out = {};
    [["Morgan Dollar", "$1", "baseline"],
     ["Lincoln Memorial Cent", "1C", "shrinkOnly"],
     ["Washington Crossing the Delaware Quarter", "25C", "atb"],
     ["Martha Washington First Spouse Gold $10", "$10", "firstSpouse"]].forEach(([name, denom, key]) => {
      const coin = { id: "AY-TEST-" + key, name, denom, year: 1889, mint: "CC", grade: "MS-64" };
      FAKE_COINS.push(coin); showBrowseDetail(coin); FAKE_COINS.pop();
      out[key] = {
        size: getComputedStyle(tr).fontSize,
        clears: cornerClearsDisc(tr),
        fits: cornerFits(tr),
        lines: [...tr.querySelectorAll(".corner-line")].map(l => l.textContent)
      };
    });
    return out;
  });
  ok(L.baseline.clears && L.baseline.size === "27px" && JSON.stringify(L.baseline.lines) === JSON.stringify(["Morgan", "$1"]),
    "L1 an ordinary short name is untouched — full natural size, two lines, clears the coin");
  ok(L.shrinkOnly.clears && L.shrinkOnly.lines.length === 2 && L.shrinkOnly.size !== "27px",
    "L2 \"Lincoln Memorial\" still resolves by SHRINKING alone, never gaining a third line: " + JSON.stringify(L.shrinkOnly));
  ok(L.atb.clears && L.atb.lines.length === 3 &&
     L.atb.lines[0] + " " + L.atb.lines[1] === "Washington Crossing the Delaware",
    "L3 a long ATB quarter wraps, keeps its full name, and clears the coin: " + JSON.stringify(L.atb));
  ok(L.firstSpouse.clears && L.firstSpouse.lines.length === 3 &&
     L.firstSpouse.lines.slice(0, 2).join(" ") === "Martha Washington First Spouse Gold $10",
    "L4 THE REPORTED CASE (AY-00463-B): the First Spouse name keeps its full identity AND now clears the coin graphic: " + JSON.stringify(L.firstSpouse));
  ok(Object.keys(L).every(k => L[k].fits),
    "L5 every case satisfies the full fit predicate — fits its own box AND clears the disc");

  // The balanced wrap is what earns the clearance back; a greedy fill left
  // line 2 nearly as wide as the unwrapped original.
  const M = await page.evaluate(() => {
    navigate("browse");
    showBrowseDetail(FAKE_COINS.find(c => c.id === "AY-00001"));
    const el = document.querySelector("#browseDetailTR .corner-line");
    const w = wrapTextToTwoLines("Martha Washington First Spouse Gold $10", el);
    return { lines: w, balancedish: Math.abs(w[0].length - w[1].length) < 12 };
  });
  ok(M.lines.length === 2 && M.balancedish,
    "M1 wrapTextToTwoLines() splits by measured balance, not greedily: " + JSON.stringify(M.lines));

  // ============ PART 4: item 4 — the metal filter join gap ============
  const N = await page.evaluate(() => ({
    silver: metalCategoryFromComposition("90% Silver"),
    fine: metalCategoryFromComposition(".999 Fine Silver"),
    clad: metalCategoryFromComposition("Copper-Nickel Clad"),
    copper: metalCategoryFromComposition("Bronze"),
    gold: metalCategoryFromComposition("91.67% Gold"),
    platinum: metalCategoryFromComposition("99.95% Platinum"),
    zinc: metalCategoryFromComposition("Copper-Plated Zinc"),
    unknown: metalCategoryFromComposition("Something Else"),
    blank: metalCategoryFromComposition("")
  }));
  ok(N.silver === "Silver" && N.fine === "Silver" && N.gold === "Gold" && N.platinum === "Platinum",
    "N1 the precious metals derive correctly from a composition string");
  ok(N.clad === "Clad", "N2 -- and \"Copper-Nickel Clad\" lands on Clad, NOT Copper (compound terms tested first)");
  ok(N.copper === "Copper", "N3 Bronze buckets under Copper, matching how Lookup_MetalContent does it");
  ok(N.zinc === "Zinc" && N.unknown === "" && N.blank === "",
    "N4 unrecognised and blank compositions derive nothing, keeping their existing Other behaviour");

  const O = await page.evaluate(() => {
    // Exactly the reported shape: a live coin whose MetalContentType join
    // produced nothing (metalCategory "") but whose Composition IS populated.
    const coin = { id: "AY-LIVE-DIME", name: "Roosevelt Dime", denom: "10C", year: 1964, mint: "",
                   grade: "MS-65", metalCategory: "", composition: "90% Silver" };
    const before = coin.metalCategory;
    const resolved = metalCategoryFor(coin);
    // And that the Silver pill's own test now accepts it.
    const silverChip = BROWSE_METAL_CHIPS.find(c => c.key === "Silver");
    return { before, resolved, passesSilverFilter: silverChip.test(coin) };
  });
  ok(O.before === "" && O.resolved === "Silver",
    "O1 THE REPORTED BUG: a coin the primary join left blank now derives Silver from its own composition");
  ok(O.passesSilverFilter,
    "O2 -- so Dimes + Silver together finally include it, agreeing with what its flip card already said");

  // ============ PART 5: items 5-7 — detail-level additions ============
  const P = await page.evaluate(() => {
    navigate("browse");
    showBrowseDetail(FAKE_COINS.find(c => c.id === "AY-00001"));
    const overview = document.getElementById("detailAccordions").textContent;
    // A Set has no Error concept of its own.
    showBrowseDetail(FAKE_COINS.find(c => c.id === "AY-00018"));
    const setOverview = document.getElementById("detailAccordions").textContent;
    return {
      hasError: /Error/.test(overview) && /Die Polish Lines/.test(overview),
      setHasNoError: !/Die Polish Lines/.test(setOverview)
    };
  });
  ok(P.hasError, "P1 item 5: Error is a plain Overview row now, not only reachable by flipping the card");
  ok(P.setHasNoError, "P2 -- coin-only, same scoping as Grade/Designation");

  const Q = await page.evaluate(() => {
    const mapped = mapWorkbookRowToCoin({
      CollectionID: "AY-T", Denomination: "1C", Year: "2000",
      Seller_Link: "Great Collections", Shipping: "4.5", PurchaseDate: "45000"
    });
    const blank = mapWorkbookRowToCoin({ CollectionID: "AY-T2", Denomination: "1C", Year: "2000" });
    const live = Object.assign({}, FAKE_COINS.find(c => c.id === "AY-00005"),
      { id: "AY-LIVE-P", vendor: "eBay seller", shippingCost: 7.25, purchaseDate: "2024-03-04" });
    FAKE_COINS.push(live);
    navigate("browse"); showBrowseDetail(live);
    const txt = document.getElementById("detailAccordions").textContent;
    FAKE_COINS.pop();
    return {
      vendor: mapped.vendor, shipping: mapped.shippingCost, date: mapped.purchaseDate,
      blankVendor: blank.vendor, blankShipping: blank.shippingCost, blankDate: blank.purchaseDate,
      rendersSeller: /eBay seller/.test(txt), rendersDate: /2024-03-04/.test(txt),
      rendersShipping: /7\.25/.test(txt), rendersTotal: /807\.25/.test(txt)
    };
  });
  ok(Q.vendor === "Great Collections" && Q.shipping === 4.5 && /^\d{4}-\d{2}-\d{2}$/.test(Q.date),
    "Q1 item 6: mapWorkbookRowToCoin() now reads Seller_Link/Shipping/PurchaseDate — it read none of them before");
  ok(Q.blankVendor === "" && Q.blankShipping === null && Q.blankDate === "",
    "Q2 -- a row with none of them maps to sane blanks, not NaN/undefined");
  ok(Q.rendersSeller && Q.rendersDate && Q.rendersShipping,
    "Q3 -- and Purchase Details finally populates for a real coin instead of only demo rows");
  ok(Q.rendersTotal, "Q4 -- Total is computed from the real Cost + Shipping");

  const R = await page.evaluate(() => {
    navigate("browse"); showBrowseTab("coins");
    const gridIds = [...document.querySelectorAll(".coin-card .card-id")].map(e => e.textContent);
    document.querySelectorAll(".coin-card")[0].click();
    const first = { id: currentBrowseCoin.id, prevHidden: document.getElementById("browseDetailPrevBtn").classList.contains("hidden") };
    document.getElementById("browseDetailNextBtn").click();
    const second = currentBrowseCoin.id;
    document.getElementById("browseDetailPrevBtn").click();
    const backAgain = currentBrowseCoin.id;
    // Walk to the end and confirm Next hides there.
    let guard = 0;
    while (!document.getElementById("browseDetailNextBtn").classList.contains("hidden") && guard++ < 200) {
      document.getElementById("browseDetailNextBtn").click();
    }
    const last = { id: currentBrowseCoin.id, nextHidden: document.getElementById("browseDetailNextBtn").classList.contains("hidden") };
    return { gridIds, first, second, backAgain, last };
  });
  ok(R.first.id === R.gridIds[0] && R.first.prevHidden,
    "R1 item 7: Previous is hidden on the first coin of the list");
  ok(R.second === R.gridIds[1] && R.backAgain === R.gridIds[0],
    "R2 Next/Previous step through the list in the order actually rendered");
  ok(R.last.id === R.gridIds[R.gridIds.length - 1] && R.last.nextHidden,
    "R3 -- and Next hides at the end rather than wrapping around");

  const S = await page.evaluate(() => {
    navigate("browse"); showBrowseTab("coins");
    browseSelectedMetalKeys.clear(); browseSelectedMetalKeys.add("Silver");
    applyCoinsTabFilters();
    const silverIds = [...document.querySelectorAll(".coin-card .card-id")].map(e => e.textContent);
    document.querySelectorAll(".coin-card")[0].click();
    const seq = [currentBrowseCoin.id];
    let guard = 0;
    while (!document.getElementById("browseDetailNextBtn").classList.contains("hidden") && guard++ < 200) {
      document.getElementById("browseDetailNextBtn").click();
      seq.push(currentBrowseCoin.id);
    }
    browseSelectedMetalKeys.clear();
    return { silverIds, seq };
  });
  ok(S.seq.length === S.silverIds.length && S.seq.every((id, i) => id === S.silverIds[i]),
    "R4 stepping respects the ACTIVE FILTER — it walks exactly the filtered list, in order: " + JSON.stringify(S.seq));

  const T = await page.evaluate(() => {
    // Arriving with no list at all (a Spotlight tap) falls back to
    // CollectionID order rather than leaving the arrows dead.
    navigate("dashboard");
    browseStepIds.length = 0;
    const coin = FAKE_COINS.find(c => c.id === "AY-00003");
    navigate("browse"); browseStepIds.length = 0;
    showBrowseDetail(coin);
    const nextHidden = document.getElementById("browseDetailNextBtn").classList.contains("hidden");
    document.getElementById("browseDetailNextBtn").click();
    return { landed: currentBrowseCoin.id, nextHidden };
  });
  ok(!T.nextHidden && T.landed === "AY-00004",
    "R5 arriving unfiltered steps in CollectionID order (AY-00003 -> " + T.landed + ")");

  const T2 = await page.evaluate(() => {
    navigate("browse"); showBrowseTab("coins");
    // Arriving at a coin that ISN'T in the last rendered list (a "Belongs
    // to" chip, say) falls back to the global order rather than showing no
    // arrows at all.
    browseStepIds.length = 0; browseStepIds.push("AY-00001", "AY-00002");
    showBrowseDetail(FAKE_COINS.find(c => c.id === "AY-00009"));
    const chip = { nextHidden: document.getElementById("browseDetailNextBtn").classList.contains("hidden") };
    // A Set child lives in its own nested lookup, never in an owned-rows
    // list — stepping from one into an unrelated top-level coin would be a
    // jump, not a step, so it gets no arrows at all.
    const child = setChildrenFor(FAKE_COINS.find(c => c.id === "AY-00022"))[0];
    showBrowseDetail(child);
    return { chip, childId: child.id,
      childPrevHidden: document.getElementById("browseDetailPrevBtn").classList.contains("hidden"),
      childNextHidden: document.getElementById("browseDetailNextBtn").classList.contains("hidden") };
  });
  ok(!T2.chip.nextHidden,
    "R6 a coin reached outside the rendered list still gets arrows, stepping the global order");
  ok(T2.childPrevHidden && T2.childNextHidden,
    "R7 -- while a Set child (" + T2.childId + ") correctly gets none, since it belongs to no browsable list");

  // ---------- Nav + overflow smoke, both viewports ----------
  for (const vp of [PHONE, TABLET]) {
    const pg = vp === PHONE ? page : await openApp(TABLET);
    const U = await pg.evaluate(() => {
      const routes = ["dashboard", "browse", "albums", "sets", "wishlist", "stats",
        "acquisitions", "needsdbcoins", "staging", "addcoin", "addset", "inprogresssets"];
      const bad = [];
      routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
      navigate("browse");
      showBrowseDetail(FAKE_COINS.find(c => c.id === "AY-00022"));
      return { bad, overflow: document.body.scrollWidth > window.innerWidth };
    });
    ok(U.bad.length === 0, "U1 every route navigates cleanly at " + vp.width + "px: " + U.bad.join("; "));
    ok(U.overflow === false, "U2 no horizontal overflow at " + vp.width + "px, including a Set's now-cornerless detail view");
    if (pg !== page) await pg.close();
  }
}, module);
