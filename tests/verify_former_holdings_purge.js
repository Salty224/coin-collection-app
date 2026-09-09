// Former Holdings (the Ledger sub-catalog that replaced "Exit History") and
// the Purge action.
//
// WHY THIS IS THE MOST SAFETY-CRITICAL SUITE IN THE PROJECT. Purge is the
// app's first genuinely DESTRUCTIVE write. graph().deleteItem() itself is
// not new — the promotion move has always used it — but every existing use
// deletes a source only AFTER a verified copy exists somewhere else. This
// one deletes bytes with nothing to recover from, so the assertions that
// matter most are the NEGATIVE ones: what it must never touch.
//
// The hard boundaries pinned here, any of which a future change could
// quietly undo:
//   - the All row, the CollectionID and Receipts are NEVER touched (a
//     receipt routinely covers several coins);
//   - an UNCHECKED photo keeps both its file and its Photos row;
//   - a LEGACY-ONLY photo (recorded solely in the old flat All.Obverse/
//     Reverse columns, no Photos row) is refused, because this app never
//     writes those columns and deleting the file would leave them pointing
//     at nothing — so such a coin can never reach fully-purged;
//   - the row is detached BEFORE the file is deleted, so a failure leaves a
//     pointer to a file that still exists rather than a row pointing at
//     bytes that don't;
//   - Purged is written only at FULL purge, and derived at write time.
//
// The one deliberate exception recorded here: Purge DOES delete the
// _original raw, overriding the crop-commit convention's "never deleted"
// rule (Ray's explicit call). That rule protects re-cropping an OWNED coin,
// which cannot apply to an exited one, and the raw is usually the larger
// file.

const { defineSuite } = require("./harness");

const ALL_HEADERS = [
  "CollectionID", "CoinID", "Denomination", "MintMark", "Year", "Description",
  "Grade", "GradeSource", "Value", "Cost", "Status", "SalePrice", "Buyer",
  "Purged", "Obverse", "Reverse", "Receipt", "Reviewed", "LastModified", "Remarks"
];
const PHOTO_HEADERS = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"];
const RECEIPT_HEADERS = ["ReceiptID", "CollectionID", "Filename", "DateAdded"];

// AY-90001  Sold coin, TWO photos, one of which retained an _original raw.
// AY-90002  Gifted coin, ONE photo — the full-purge case.
// AY-90004  Returned coin already fully purged (Purged="Y").
// AY-90007  Sold coin whose only photo is LEGACY-ONLY (All.Obverse, no row).
function seed() {
  const blank = n => new Array(n).fill("");
  return {
    sheets: {
      All: [
        ALL_HEADERS.slice(),
        ["AY-90001", "C-1", "$1",  "CC", 1889, "Morgan Dollar",  "MS-64", "PCGS",   900, 800, "Sold",     900, "Bob", "", "", "", "r1.pdf", "Yes", "", "keep me"],
        ["AY-90002", "C-2", "10C", "D",  1916, "Mercury Dime",   "VG-8",  "Seller",  55,  40, "Gifted",     0, "Ann", "", "", "", "",       "Yes", "", ""],
        ["AY-90003", "C-3", "1C",  "S",  1909, "Lincoln Cent",   "AU-50", "NGC",     70,  60, "Owned",     "", "",    "", "", "", "",       "Yes", "", ""],
        ["AY-90004", "C-4", "1C",  "",   1910, "Purged Coin",    "",      "",         5,   4, "Returned",  "", "",   "Y", "", "", "",       "",    "", ""],
        ["AY-90007", "C-7", "5C",  "",   1938, "Legacy Nickel",  "MS-63", "PCGS",    30,  25, "Sold",      30, "Cy",  "", "AY-90007_obverse.jpg", "", "", "", "", ""]
      ],
      Photos: [
        PHOTO_HEADERS.slice(),
        ["PH-00001", "AY-90001", "Obverse", "", "AY-90001_obverse_cropped.jpg", "", "", "AY-90001_obverse_original.jpg"],
        ["PH-00002", "AY-90001", "Reference", "", "AY-90001_reference_01.jpg", "Auction listing", "", ""],
        ["PH-00003", "AY-90002", "Obverse", "", "AY-90002_obverse_cropped.jpg", "", "", ""],
        blank(PHOTO_HEADERS.length),
        blank(PHOTO_HEADERS.length),
        blank(PHOTO_HEADERS.length)
      ],
      Receipts: [
        RECEIPT_HEADERS.slice(),
        ["RC-00001", "AY-90001", "r1.pdf", ""],
        ["RC-00001", "AY-90099", "r1.pdf", ""],
        blank(RECEIPT_HEADERS.length)
      ]
    }
  };
}

// The mapped-coin shape the app's own read paths produce, matching the grid.
function seedCoins() {
  return [
    { id: "AY-90001", name: "Morgan Dollar", denom: "$1",  year: 1889, mint: "CC", grade: "MS-64", gradeSource: "PCGS",   status: "Sold",     salePrice: 900, buyer: "Bob", purged: "", obversePhotoFile: "", reversePhotoFile: "", value: 900, cost: 800 },
    { id: "AY-90002", name: "Mercury Dime",  denom: "10C", year: 1916, mint: "D",  grade: "VG-8",  gradeSource: "Seller", status: "Gifted",   salePrice: 0,   buyer: "Ann", purged: "", obversePhotoFile: "", reversePhotoFile: "", value: 55,  cost: 40 },
    { id: "AY-90003", name: "Lincoln Cent",  denom: "1C",  year: 1909, mint: "S",  grade: "AU-50", gradeSource: "NGC",    status: "Owned",    purged: "", obversePhotoFile: "", reversePhotoFile: "", value: 70, cost: 60 },
    { id: "AY-90004", name: "Purged Coin",   denom: "1C",  year: 1910, mint: "",   grade: "",      gradeSource: "",       status: "Returned", purged: "Y", obversePhotoFile: "", reversePhotoFile: "", value: 5, cost: 4 },
    { id: "AY-90005", name: "1957 Proof Set", denom: "Multiple", year: 1957, mint: "", status: "Spent",  purged: "", obversePhotoFile: "", reversePhotoFile: "", value: 155, cost: 150 },
    { id: "AY-90006", name: "Roll of Dimes", denom: "10C", year: 1964, mint: "", rollId: "R-1",    status: "Sold",     salePrice: 120, purged: "", obversePhotoFile: "", reversePhotoFile: "", value: 120, cost: 100 },
    { id: "AY-90007", name: "Legacy Nickel", denom: "5C",  year: 1938, mint: "",   grade: "MS-63", gradeSource: "PCGS",   status: "Sold", salePrice: 30, buyer: "Cy", purged: "", obversePhotoFile: "AY-90007_obverse.jpg", reversePhotoFile: "", value: 30, cost: 25 },
    { id: "AY-90008", name: "At-PCGS Coin",  denom: "25C", year: 1932, mint: "D",  grade: "",      gradeSource: "",       status: "At PCGS", purged: "", obversePhotoFile: "", reversePhotoFile: "", value: 200, cost: 180 }
  ];
}

// The session Photos index, matching the Photos sheet above.
function seedPhotoIndex() {
  return {
    "AY-90001": [
      { photoId: "PH-00001", photoType: "Obverse",   galleryType: "obverse",   subGroupId: "", filename: "AY-90001_obverse_cropped.jpg", originalFilename: "AY-90001_obverse_original.jpg", label: "" },
      { photoId: "PH-00002", photoType: "Reference", galleryType: "reference", subGroupId: "", filename: "AY-90001_reference_01.jpg",   originalFilename: "", label: "Auction listing" }
    ],
    "AY-90002": [
      { photoId: "PH-00003", photoType: "Obverse", galleryType: "obverse", subGroupId: "", filename: "AY-90002_obverse_cropped.jpg", originalFilename: "", label: "" }
    ]
  };
}

module.exports = defineSuite("former-holdings-purge", async ({ ok, openApp, PHONE, TABLET }) => {
  const page = await openApp(PHONE);
  await page.evaluate(a => {
    window.__SEED = a.seed; window.__COINS = a.coins; window.__PHOTOS = a.photos;
    window.__setup = () => {
      const mock = createMockGraphClient(JSON.parse(JSON.stringify(window.__SEED)));
      // Real photo bytes on disk, so a delete is a real delete of something.
      ["AY-90001_obverse_cropped.jpg", "AY-90001_obverse_original.jpg",
       "AY-90001_reference_01.jpg", "AY-90002_obverse_cropped.jpg",
       "AY-90007_obverse.jpg"].forEach(f => {
        mock._store.set(writePaths().coinPhotos + "/" + f, { kind: "bytes", value: new Uint8Array([1, 2, 3]) });
      });
      mock._store.set(writePaths().coinReceipts + "/r1.pdf", { kind: "bytes", value: new Uint8Array([9]) });
      __setGraphClientForTest(mock);
      __setPurgeWriteEnabledForTest(true);
      __resetAllHeaderMapForTest();
      __resetSheetHeaderMapsForTest();
      __setLiveCoinsForTest(JSON.parse(JSON.stringify(window.__COINS)));
      __setStoredPhotosForTest(JSON.parse(JSON.stringify(window.__PHOTOS)));
      return mock;
    };
    window.__teardown = () => {
      __setPurgeWriteEnabledForTest(null);
      __setGraphClientForTest(null);
      __resetAllHeaderMapForTest();
      __resetSheetHeaderMapsForTest();
      __setLiveCoinsForTest(null);
      __setStoredPhotosForTest(null);
    };
    window.__cell = (mock, id, header) => {
      const g = mock._grids.All;
      const c = g[0].indexOf(header);
      const r = g.findIndex(row => row[0] === id);
      return r === -1 ? undefined : g[r][c];
    };
    window.__photoRows = mock => mock._grids.Photos.slice(1).filter(r => r[0] !== "");
    window.__hasFile = (mock, name) => mock._store.has(writePaths().coinPhotos + "/" + name);
  }, { seed: seed(), coins: seedCoins(), photos: seedPhotoIndex() });

  // ---------- A. Schema and flag invariants ---------------------------
  const A = await page.evaluate(() => ({
    allowListed: ALL_WRITABLE_COLUMNS.indexOf("Purged") !== -1,
    notNeverWrite: ALL_NEVER_WRITE_COLUMNS.indexOf("Purged") === -1,
    ownFlag: typeof ENABLE_PURGE_WRITE === "boolean",
    inWriteLayer: WRITE_LAYER_ENABLED === true,
    // Every existing never-write guarantee still holds — Purge must not
    // have loosened any of them on its way in.
    idsStillNeverWrite: ["CollectionID", "CoinID", "OriginSetID"].every(c => ALL_NEVER_WRITE_COLUMNS.indexOf(c) !== -1),
    mapped: mapWorkbookRowToCoin({ CollectionID: "AY-1", Purged: "Y" }).purged,
    mappedBlank: mapWorkbookRowToCoin({ CollectionID: "AY-1" }).purged,
    fpY: isFullyPurged({ purged: "Y" }),
    fpLower: isFullyPurged({ purged: "y" }),
    fpPadded: isFullyPurged({ purged: " Y " }),
    fpBlank: isFullyPurged({ purged: "" }),
    fpMissing: isFullyPurged({}),
    fpNull: isFullyPurged(null)
  }));
  ok(A.allowListed, "A1 Purged is on ALL_WRITABLE_COLUMNS so the general machinery can't silently drop it");
  ok(A.notNeverWrite, "A2 ... and is not on the never-write list (it is a real, writable column)");
  ok(A.ownFlag, "A3 ENABLE_PURGE_WRITE exists as its own flag");
  ok(A.inWriteLayer, "A4 ... and is folded into WRITE_LAYER_ENABLED");
  ok(A.idsStillNeverWrite, "A5 CollectionID/CoinID/OriginSetID are STILL never-write — Purge loosened nothing");
  ok(A.mapped === "Y", "A6 the mapper reads All.Purged");
  ok(A.mappedBlank === "", "A7 a missing Purged column maps to blank, never undefined");
  ok(A.fpY && A.fpLower && A.fpPadded, "A8 isFullyPurged accepts Y regardless of case/padding");
  ok(!A.fpBlank && !A.fpMissing && !A.fpNull, "A9 blank / missing / null are all NOT fully purged");

  // ---------- B. formerHoldings() scope -------------------------------
  const B = await page.evaluate(() => {
    __setLiveCoinsForTest(JSON.parse(JSON.stringify(window.__COINS)));
    const ids = formerHoldings().map(c => c.id);
    // The pre-fix behaviour: every exit-status row, purged or not.
    const preFix = activeCoins().filter(c => isExitStatus(c.status)).map(c => c.id);
    const owned = ownedCoins().map(c => c.id);
    __setLiveCoinsForTest(null);
    return { ids, preFix, owned };
  });
  ok(B.ids.indexOf("AY-90001") !== -1 && B.ids.indexOf("AY-90002") !== -1,
    "B1 Former Holdings includes Sold and Gifted coins");
  ok(B.ids.indexOf("AY-90005") !== -1, "B2 ... a Set bundle (Denomination=Multiple, Spent) too");
  ok(B.ids.indexOf("AY-90006") !== -1, "B3 ... and a Roll (Sold) — all three record kinds, one All sheet");
  ok(B.ids.indexOf("AY-90003") === -1, "B4 an Owned coin is excluded");
  ok(B.ids.indexOf("AY-90008") === -1, '"B5 "At PCGS" is not an exit status and is excluded');
  ok(B.ids.indexOf("AY-90004") === -1, "B6 a FULLY PURGED coin is excluded");
  ok(B.preFix.indexOf("AY-90004") !== -1,
    "B7 NEGATIVE CONTROL: the pre-fix filter (exit status alone) DOES include the purged coin, so B6 is load-bearing");
  ok(B.owned.indexOf("AY-90004") === -1 && B.owned.indexOf("AY-90001") === -1,
    "B8 ownedCoins() still excludes every exited row, purged or not");

  // ---------- C. Rename + list render ---------------------------------
  const C = await page.evaluate(() => {
    __setLiveCoinsForTest(JSON.parse(JSON.stringify(window.__COINS)));
    navigate("stats");
    const labels = [...document.querySelectorAll("#view-stats .section-label")].map(e => e.textContent.trim());
    const rows = [...document.querySelectorAll("#ledgerExitHistoryList .wish-item")];
    const out = {
      labels,
      ids: rows.map(r => (r.textContent.match(/AY-\d+/) || [""])[0]),
      count: document.getElementById("formerResultCount").textContent,
      purgeBtns: rows.filter(r => [...r.querySelectorAll("button")].some(b => b.textContent === "Purge")).length,
      bodyText: document.getElementById("view-stats").textContent
    };
    __setLiveCoinsForTest(null);
    return out;
  });
  ok(C.labels.indexOf("Former Holdings") !== -1, "C1 the section is titled 'Former Holdings'");
  ok(C.labels.indexOf("Exit History") === -1 && !/Exit History/.test(C.bodyText),
    "C2 'Exit History' is gone from the page entirely, not just renamed in one place");
  ok(C.ids.join(",") === "AY-90001,AY-90002,AY-90007,AY-90005,AY-90006",
    "C3 rows are sorted by Year then MintMark (a sub-catalog), not left in sheet order: " + C.ids.join(","));
  ok(C.count === "Showing 5 of 5", "C4 a result count renders: " + C.count);
  ok(C.purgeBtns === 5, "C5 every row offers Purge");

  // ---------- D. Filters ----------------------------------------------
  const D = await page.evaluate(() => {
    __setLiveCoinsForTest(JSON.parse(JSON.stringify(window.__COINS)));
    navigate("stats");
    const shown = () => [...document.querySelectorAll("#ledgerExitHistoryList .wish-item")]
      .map(r => (r.textContent.match(/AY-\d+/) || [""])[0]);
    const clickChip = (row, label) => {
      const c = [...document.querySelectorAll("#" + row + " .filter-chip")].find(x => x.textContent === label);
      c.click();
      return shown();
    };
    const out = {};
    out.coinsOnly = clickChip("formerKindFilters", "Coins");
    out.setsOnly = (clickChip("formerKindFilters", "Coins"), clickChip("formerKindFilters", "Sets"));
    out.rollsOnly = (clickChip("formerKindFilters", "Sets"), clickChip("formerKindFilters", "Rolls"));
    clickChip("formerKindFilters", "All");
    out.sold = clickChip("formerReasonFilters", "Sold");
    out.soldOrGifted = clickChip("formerReasonFilters", "Gifted");
    clickChip("formerReasonFilters", "All");
    out.dimes = clickChip("formerDenomFilters", "Dimes");
    clickChip("formerDenomFilters", "All");
    out.pcgs = clickChip("formerGradingServiceFilters", "PCGS");
    clickChip("formerGradingServiceFilters", "All");
    // AND across axes: Sold + Dimes should be the Roll alone.
    clickChip("formerReasonFilters", "Sold");
    out.soldDimes = clickChip("formerDenomFilters", "Dimes");
    clickChip("formerDenomFilters", "All");
    clickChip("formerReasonFilters", "All");
    // Search
    document.getElementById("formerSearchInput").value = "morgan";
    document.getElementById("formerSearchInput").dispatchEvent(new Event("input"));
    out.search = shown();
    document.getElementById("formerSearchInput").value = "";
    document.getElementById("formerSearchInput").dispatchEvent(new Event("input"));
    // Former's OWN year filter, independent of Catalog's
    formerYearFilter.begin = 1916; formerYearFilter.end = null;
    renderFormerHoldings();
    out.year = shown();
    out.catalogYearUntouched = JSON.stringify(yearFilterByTab.coins);
    formerYearFilter.begin = null; formerYearFilter.end = null;
    renderFormerHoldings();
    out.restored = shown();
    out.emptyMsg = (formerSelectedReasonKeys.add("Returned"), renderFormerHoldings(),
      document.getElementById("ledgerExitHistoryList").textContent.trim());
    formerSelectedReasonKeys.clear();
    renderFormerHoldings();
    __setLiveCoinsForTest(null);
    return out;
  });
  ok(D.coinsOnly.join(",") === "AY-90001,AY-90002,AY-90007",
    "D1 the Coins kind chip excludes the Set bundle and the Roll: " + D.coinsOnly.join(","));
  ok(D.setsOnly.join(",") === "AY-90005", "D2 the Sets chip shows only the bundle");
  ok(D.rollsOnly.join(",") === "AY-90006", "D3 the Rolls chip shows only the Roll");
  ok(D.sold.join(",") === "AY-90001,AY-90007,AY-90006", "D4 exit-reason Sold narrows correctly");
  ok(D.soldOrGifted.indexOf("AY-90002") !== -1 && D.soldOrGifted.indexOf("AY-90001") !== -1,
    "D5 exit reasons multi-select as OR (Sold + Gifted)");
  ok(D.dimes.join(",") === "AY-90002,AY-90006", "D6 a Denomination chip narrows, reusing Catalog's own chip tests");
  ok(D.dimes.indexOf("AY-90005") === -1,
    "D7 ... and correctly cannot match the Set bundle (Denomination=Multiple) — which is exactly why the kind chip row exists");
  ok(D.pcgs.join(",") === "AY-90001,AY-90007", "D8 a Grading Service chip narrows");
  ok(D.soldDimes.join(",") === "AY-90006", "D9 axes AND together (Sold + Dimes = the Roll alone)");
  ok(D.search.join(",") === "AY-90001", "D10 free-text search narrows");
  ok(D.year.join(",") === "AY-90002", "D11 Former Holdings has its OWN year filter");
  ok(D.catalogYearUntouched === '{"begin":null,"end":null}',
    "D12 ... which leaves Catalog's own year state completely untouched");
  ok(D.restored.length === 5, "D13 clearing the year filter restores every row");
  ok(/No former holdings match these filters/.test(D.emptyMsg),
    "D14 a filter combination matching nothing says so rather than rendering blank");

  // ---------- E. What Purge offers ------------------------------------
  const E = await page.evaluate(() => {
    __setLiveCoinsForTest(JSON.parse(JSON.stringify(window.__COINS)));
    __setStoredPhotosForTest(JSON.parse(JSON.stringify(window.__PHOTOS)));
    const p1 = purgeablePhotosFor("AY-90001");
    const legacy = purgeablePhotosFor("AY-90007");
    const none = purgeablePhotosFor("AY-90005");
    const out = {
      p1Count: p1.length,
      obverseFiles: (p1.find(p => p.galleryType === "obverse") || {}).files,
      refFiles: (p1.find(p => p.galleryType === "reference") || {}).files,
      refLabel: purgePhotoLabel(p1.find(p => p.galleryType === "reference")),
      legacyCount: legacy.length,
      legacyFlagged: legacy.every(p => p.legacyOnly),
      noneCount: none.length
    };
    __setLiveCoinsForTest(null); __setStoredPhotosForTest(null);
    return out;
  });
  ok(E.p1Count === 2, "E1 both of AY-90001's photos are offered");
  ok(E.obverseFiles.length === 2 &&
     E.obverseFiles.indexOf("AY-90001_obverse_original.jpg") !== -1,
    "E2 a flip source offers BOTH its crop and its _original raw — the deliberate exception to 'never deleted'");
  ok(E.refFiles.length === 1, "E3 a photo with no retained raw offers exactly one file");
  ok(/Auction listing/.test(E.refLabel), "E4 a photo's own Label rides into its purge label");
  ok(E.legacyCount === 1 && E.legacyFlagged,
    "E5 a legacy-only photo (All.Obverse, no Photos row) is surfaced but flagged legacyOnly");
  ok(E.noneCount === 0, "E6 a record with no stored photos offers nothing");

  // ---------- F. The dialog -------------------------------------------
  const F = await page.evaluate(async () => {
    window.__setup();
    navigate("stats");
    const rowFor = id => [...document.querySelectorAll("#ledgerExitHistoryList .wish-item")]
      .find(r => r.textContent.indexOf(id) !== -1);
    const purgeBtnFor = id => [...rowFor(id).querySelectorAll("button")].find(b => b.textContent === "Purge");
    purgeBtnFor("AY-90001").click();
    const boxes = [...document.querySelectorAll(".purge-photo-check")];
    const out = {
      dialogOpen: !document.getElementById("writeGuardOverlay").classList.contains("hidden"),
      title: document.getElementById("writeGuardTitle").textContent,
      boxCount: boxes.length,
      allChecked: boxes.every(b => b.checked),
      body: document.getElementById("writeGuardBody").textContent
    };
    // Uncheck the reference photo, continue -> stage 2 names the exact files.
    boxes[1].checked = false;
    [...document.querySelectorAll("#writeGuardBtns button")].find(b => b.textContent === "Continue").click();
    out.confirmTitle = document.getElementById("writeGuardTitle").textContent;
    out.confirmBody = document.getElementById("writeGuardBody").textContent;
    // Cancel writes nothing.
    [...document.querySelectorAll("#writeGuardBtns button")].find(b => b.textContent === "Cancel").click();
    await new Promise(r => setTimeout(r, 60));
    out.legacyDialog = (purgeBtnFor("AY-90007").click(),
      document.getElementById("writeGuardTitle").textContent + "|" +
      document.getElementById("writeGuardBody").textContent);
    [...document.querySelectorAll("#writeGuardBtns button")].find(b => b.textContent === "OK").click();
    return out;
  });
  ok(F.dialogOpen && /Purge photos for AY-90001/.test(F.title), "F1 Purge opens a dialog naming the coin");
  ok(F.boxCount === 2 && F.allChecked, "F2 every photo gets its own checkbox, all checked by default");
  ok(/AY-90001_obverse_original\.jpg/.test(F.body) && /photo and its original/.test(F.body),
    "F3 the picker states that a flip source's original is covered too");
  ok(/Permanently delete 2 file\(s\)\?/.test(F.confirmTitle),
    "F4 stage 2 counts the files, not the photos: " + F.confirmTitle);
  ok(/AY-90001_obverse_cropped\.jpg/.test(F.confirmBody) &&
     /AY-90001_obverse_original\.jpg/.test(F.confirmBody) &&
     !/AY-90001_reference_01\.jpg/.test(F.confirmBody),
    "F5 the confirmation names EXACTLY the checked files and not the unchecked one");
  ok(/cannot be undone/i.test(F.confirmBody), "F6 ... says plainly that it is permanent");
  ok(/receipts/i.test(F.confirmBody) && /unchecked photo/i.test(F.confirmBody),
    "F7 ... and states what is KEPT: the record, receipts, and the unchecked photo");
  ok(/Nothing to purge/.test(F.legacyDialog) && /old \*?\*?All/.test(F.legacyDialog.replace(/\s+/g, " ")),
    "F8 a legacy-only coin is refused with the reason, not silently offered");

  // ---------- G. Execution: what is deleted, and what is NOT -----------
  const G = await page.evaluate(async () => {
    const mock = window.__setup();
    const chosen = purgeablePhotosFor("AY-90001").filter(p => p.galleryType === "obverse");
    const res = await purgeCoinPhotos("AY-90001", chosen);
    const out = {
      deleted: res.deleted.slice(),
      failed: res.failed.length,
      cropGone: !window.__hasFile(mock, "AY-90001_obverse_cropped.jpg"),
      rawGone: !window.__hasFile(mock, "AY-90001_obverse_original.jpg"),
      refKept: window.__hasFile(mock, "AY-90001_reference_01.jpg"),
      receiptKept: mock._store.has(writePaths().coinReceipts + "/r1.pdf"),
      receiptRows: mock._grids.Receipts.slice(1).filter(r => r[0] !== "").length,
      photoRowIds: window.__photoRows(mock).map(r => r[0]),
      allRowStillThere: window.__cell(mock, "AY-90001", "CollectionID"),
      remarksUntouched: window.__cell(mock, "AY-90001", "Remarks"),
      receiptCellUntouched: window.__cell(mock, "AY-90001", "Receipt"),
      purgedFlag: window.__cell(mock, "AY-90001", "Purged"),
      fullyPurged: res.flag.fullyPurged,
      stillListed: formerHoldings().map(c => c.id).indexOf("AY-90001") !== -1
    };
    window.__teardown();
    return out;
  });
  ok(G.deleted.length === 2 && G.failed === 0, "G1 both files of the checked photo were deleted");
  ok(G.cropGone && G.rawGone, "G2 the crop AND its _original are both really gone from OneDrive");
  ok(G.refKept, "G3 the UNCHECKED photo's file is untouched");
  ok(G.photoRowIds.join(",") === "PH-00002,PH-00003",
    "G4 only the purged photo's Photos row was detached; the unchecked one's row survives");
  ok(G.receiptKept && G.receiptRows === 2,
    "G5 RECEIPTS ARE NEVER TOUCHED — neither the file nor either of the two rows sharing RC-00001");
  ok(G.allRowStillThere === "AY-90001" && G.remarksUntouched === "keep me" && G.receiptCellUntouched === "r1.pdf",
    "G6 the All row, its CollectionID and its other cells are all untouched");
  ok(G.purgedFlag === "" && G.fullyPurged === false,
    "G7 a PARTIAL purge does not set Purged — one photo remains");
  ok(G.stillListed, "G8 ... and the coin stays visible in Former Holdings, exactly as a partial purge should");

  // ---------- H. Full purge, and what it changes ----------------------
  const H = await page.evaluate(async () => {
    const mock = window.__setup();
    const res = await purgeCoinPhotos("AY-90002", purgeablePhotosFor("AY-90002"));
    const out = {
      fullyPurged: res.flag.fullyPurged,
      purgedCell: window.__cell(mock, "AY-90002", "Purged"),
      lastModified: window.__cell(mock, "AY-90002", "LastModified") !== "",
      reviewedUntouched: window.__cell(mock, "AY-90002", "Reviewed"),
      inMemory: activeCoins().find(c => c.id === "AY-90002").purged,
      goneFromList: formerHoldings().map(c => c.id).indexOf("AY-90002") === -1,
      // ... but still reachable by ID.
      byId: !!activeCoins().find(c => c.id === "AY-90002"),
      goneFromOwned: ownedCoins().map(c => c.id).indexOf("AY-90002") === -1,
      goneFromCatalog: coinsTabBaseRows().map(c => c.id).indexOf("AY-90002") === -1
    };
    window.__teardown();
    return out;
  });
  ok(H.fullyPurged && H.purgedCell === "Y",
    "H1 removing the LAST photo writes Purged=Y — derived at write time, from what the purge actually left");
  ok(H.lastModified, "H2 LastModified is stamped (the app did touch the row)");
  ok(H.reviewedUntouched === "Yes",
    "H3 Reviewed is deliberately NOT blanked — deleting photos changes no attribute a human reviewed");
  ok(H.inMemory === "Y", "H4 the in-memory record is kept in step, so no re-fetch is needed");
  ok(H.goneFromList, "H5 a fully purged coin drops out of Former Holdings");
  ok(H.goneFromOwned && H.goneFromCatalog, "H6 ... and remains absent from ownedCoins()/Catalog");
  ok(H.byId, "H7 ... but is STILL reachable by direct CollectionID lookup");

  // ---------- I. The boundaries that must never move ------------------
  const I = await page.evaluate(async () => {
    const mock = window.__setup();
    // A legacy-only photo can never be purged, so its coin can never reach
    // fully-purged.
    const res = await purgeCoinPhotos("AY-90007", purgeablePhotosFor("AY-90007"));
    const out = {
      deleted: res.deleted.length,
      skipped: res.skipped.length,
      skipReason: (res.skipped[0] || {}).reason,
      fileKept: window.__hasFile(mock, "AY-90007_obverse.jpg"),
      allObverseUntouched: window.__cell(mock, "AY-90007", "Obverse"),
      purgedCell: window.__cell(mock, "AY-90007", "Purged"),
      stillListed: formerHoldings().map(c => c.id).indexOf("AY-90007") !== -1
    };
    window.__teardown();
    return out;
  });
  ok(I.deleted === 0 && I.skipped === 1, "I1 a legacy-only photo is skipped, never deleted");
  // I1 alone does NOT prove the explicit legacyOnly guard exists: removing
  // it still yields deleted=0/skipped=1, because a legacy-only photo has no
  // Photos row and the row-must-exist rule catches it a step later. (That is
  // real defence in depth, not redundancy — but it means the outcome can't
  // discriminate.) The REASON can, so it is what this asserts. Verified by
  // negative control: deleting the guard flips this one assertion and only
  // this one.
  ok(/old All-sheet columns/.test(I.skipReason || ""),
    "I1b ... skipped by the EXPLICIT legacy-only guard, not incidentally by the row-must-exist rule: " + I.skipReason);
  ok(I.fileKept, "I2 ... its file survives, so All.Obverse can't be left pointing at nothing");
  ok(I.allObverseUntouched === "AY-90007_obverse.jpg",
    "I3 ... and the never-written All.Obverse column is genuinely untouched");
  ok(I.purgedCell === "" && I.stillListed,
    "I4 such a coin can never reach fully-purged, and stays in Former Holdings");

  // ---------- J. Failure handling, idempotence, locking ---------------
  const J = await page.evaluate(async () => {
    const mock = window.__setup();
    const chosen = purgeablePhotosFor("AY-90001");
    // Fail the SECOND file delete only. The row is already detached by then,
    // which is the exact case the row-then-file order is chosen for.
    const realDelete = mock.deleteItem.bind(mock);
    let n = 0;
    mock.deleteItem = p => (++n === 2 ? Promise.reject(new Error("boom")) : realDelete(p));
    const res = await purgeCoinPhotos("AY-90001", chosen);
    const out = {
      deleted: res.deleted.length,
      failed: res.failed.length,
      failedFile: res.failed[0] && res.failed[0].file,
      failedStage: res.failed[0] && res.failed[0].stage,
      // The photo AFTER the failing one was still processed — one failure
      // never abandons the rest.
      refGone: !window.__hasFile(mock, "AY-90001_reference_01.jpg"),
      // Not fully purged: a file is still on disk... but every ROW is gone,
      // so the flag is written. That is the documented, accepted gap.
      purgedCell: window.__cell(mock, "AY-90001", "Purged")
    };
    mock.deleteItem = realDelete;
    // Idempotent re-run: rows are already gone, so nothing is deleted again
    // and nothing throws.
    const again = await purgeCoinPhotos("AY-90001", chosen);
    out.rerunDeleted = again.deleted.length;
    out.rerunSkipped = again.skipped.length;
    out.rerunOk = again.ok === true;
    window.__teardown();
    return out;
  });
  ok(J.deleted === 2 && J.failed === 1, "J1 a per-file failure is recorded while the other files still go");
  ok(J.failedFile === "AY-90001_obverse_original.jpg" && J.failedStage === "file",
    "J2 the failure names the exact file and the stage it failed at");
  ok(J.refGone, "J3 one photo failing never abandons the photos after it");
  ok(J.purgedCell === "Y",
    "J4 the flag follows the ROWS (all detached), which is the documented consequence of row-then-file order");
  ok(J.rerunDeleted === 0 && J.rerunSkipped === 2 && J.rerunOk,
    "J5 a re-run is idempotent — rows already gone, nothing deleted twice, no throw");

  // The assertion that actually pins ROW-THEN-FILE order. If the file were
  // deleted first, a failing row detach would leave the bytes destroyed and
  // the row still pointing at them — the worse of the two failure shapes,
  // and the whole reason the order was chosen. Nothing else in this suite
  // discriminates between the two orders.
  const J2 = await page.evaluate(async () => {
    const mock = window.__setup();
    const chosen = purgeablePhotosFor("AY-90001");
    const realPatch = mock.patchWorkbookRanges.bind(mock);
    // Fail exactly the Photos-sheet detach; leave every other write alone.
    mock.patchWorkbookRanges = (wb, sheet, edits) =>
      sheet === "Photos" ? Promise.reject(new Error("detach failed")) : realPatch(wb, sheet, edits);
    const res = await purgeCoinPhotos("AY-90001", chosen);
    const out = {
      deleted: res.deleted.length,
      failedStages: res.failed.map(f => f.stage),
      cropIntact: window.__hasFile(mock, "AY-90001_obverse_cropped.jpg"),
      rawIntact: window.__hasFile(mock, "AY-90001_obverse_original.jpg"),
      refIntact: window.__hasFile(mock, "AY-90001_reference_01.jpg"),
      rows: window.__photoRows(mock).length,
      purgedCell: window.__cell(mock, "AY-90001", "Purged")
    };
    mock.patchWorkbookRanges = realPatch;
    window.__teardown();
    return out;
  });
  ok(J2.deleted === 0, "J6 ROW-THEN-FILE: a failing row detach deletes NO file at all");
  ok(J2.cropIntact && J2.rawIntact && J2.refIntact,
    "J7 ... every file is still on disk, so nothing was destroyed on a failed write");
  ok(J2.failedStages.every(st => st === "row") && J2.failedStages.length === 2,
    "J8 ... and both photos report failing at the ROW stage, never the file stage");
  ok(J2.rows === 3 && J2.purgedCell === "",
    "J9 ... no Photos row was detached and Purged was not written");

  const K = await page.evaluate(async () => {
    const mock = window.__setup();
    const chosen = purgeablePhotosFor("AY-90001").filter(p => p.galleryType === "obverse");
    let calls = 0;
    const realDelete = mock.deleteItem.bind(mock);
    mock.deleteItem = p => { calls++; return realDelete(p); };
    const [a, b] = await Promise.all([
      purgeCoinPhotos("AY-90001", chosen),
      purgeCoinPhotos("AY-90001", chosen)
    ]);
    const out = { calls, coalesced: !!(a.coalesced || b.coalesced), deletedA: a.deleted.length };
    window.__teardown();
    return out;
  });
  ok(K.calls === 2, "K1 a double-tap deletes each file exactly once, not twice");
  ok(K.coalesced, "K2 ... because the second call coalesces onto the first via the per-coin lock");

  // ---------- L. Flag off = completely inert --------------------------
  const L = await page.evaluate(async () => {
    const mock = window.__setup();
    __setPurgeWriteEnabledForTest(false);
    let touched = false;
    const realDelete = mock.deleteItem.bind(mock);
    mock.deleteItem = p => { touched = true; return realDelete(p); };
    const res = await purgeCoinPhotos("AY-90001", purgeablePhotosFor("AY-90001"));
    navigate("stats");
    const row = [...document.querySelectorAll("#ledgerExitHistoryList .wish-item")]
      .find(r => r.textContent.indexOf("AY-90001") !== -1);
    [...row.querySelectorAll("button")].find(b => b.textContent === "Purge").click();
    const out = {
      disabled: res.disabled === true,
      touched,
      filesIntact: window.__hasFile(mock, "AY-90001_obverse_cropped.jpg"),
      rows: window.__photoRows(mock).length,
      dialogTitle: document.getElementById("writeGuardTitle").textContent
    };
    [...document.querySelectorAll("#writeGuardBtns button")].find(b => b.textContent === "OK").click();
    window.__teardown();
    return out;
  });
  ok(L.disabled && !L.touched, "L1 with the flag off nothing reaches Graph at all");
  ok(L.filesIntact && L.rows === 3, "L2 ... no file and no Photos row is touched");
  ok(/Purge unavailable/.test(L.dialogTitle), "L3 ... and the UI says so rather than appearing to work");

  // ---------- M. Open by CollectionID ---------------------------------
  const M = await page.evaluate(() => {
    __setLiveCoinsForTest(JSON.parse(JSON.stringify(window.__COINS)));
    navigate("stats");
    const open = v => {
      document.getElementById("ledgerOpenByIdInput").value = v;
      document.getElementById("ledgerOpenByIdBtn").click();
      return {
        view: document.querySelector(".view.active") && document.querySelector(".view.active").id,
        title: (document.getElementById("browseDetailName") || {}).textContent || ""
      };
    };
    const purged = open("AY-90004");
    navigate("stats");
    const owned = open("AY-90003");
    navigate("stats");
    const lower = open("ay-90001");
    navigate("stats");
    const missing = open("AY-99999");
    __setLiveCoinsForTest(null);
    return { purged, owned, lower, missing };
  });
  ok(M.purged.view === "view-browse" && /Purged Coin/.test(M.purged.title),
    "M1 a FULLY PURGED coin — in no list anywhere — is still reachable by CollectionID");
  ok(M.owned.view === "view-browse" && /Lincoln Cent/.test(M.owned.title),
    "M2 an Owned coin opens too — this surface deliberately does not filter by status");
  ok(/Morgan Dollar/.test(M.lower.title), "M3 the lookup is case-insensitive");
  ok(M.missing.view === "view-stats", "M4 an unknown ID stays put rather than opening something wrong");

  // ---------- N. browseStepListFallback no longer leaks ---------------
  const N = await page.evaluate(() => {
    __setLiveCoinsForTest(JSON.parse(JSON.stringify(window.__COINS)));
    const ids = browseStepListFallback();
    const preFix = activeCoins().slice()
      .sort((a, b) => String(a.id).localeCompare(String(b.id))).map(c => c.id);
    __setLiveCoinsForTest(null);
    return { ids, preFix };
  });
  ok(N.ids.indexOf("AY-90001") === -1 && N.ids.indexOf("AY-90004") === -1,
    "N1 prev/next can no longer step from an owned coin into an exited or purged one");
  ok(N.ids.indexOf("AY-90003") !== -1, "N2 ... while owned coins still step normally");
  ok(N.preFix.indexOf("AY-90001") !== -1,
    "N3 NEGATIVE CONTROL: the pre-fix fallback (raw activeCoins) DID include exited coins");

  // ---------- N2. Both Ledger search boxes are actually styled ---------
  // input[type=search] is NOT covered by the generic input rule (which
  // lists text/number/date/textarea/select), so #ledgerSearchInput has
  // rendered as an unstyled white box on this dark page since it was built
  // — a real pre-existing bug, fixed here rather than left sitting next to
  // the new one. Asserted on computed style, not on the class attribute:
  // the class being present proves nothing if the rule doesn't apply.
  const P = await page.evaluate(() => {
    navigate("stats");
    const read = id => {
      const cs = getComputedStyle(document.getElementById(id));
      return { bg: cs.backgroundColor, color: cs.color };
    };
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    return { former: read("formerSearchInput"), find: read("ledgerSearchInput"), bodyBg };
  });
  ok(P.former.bg !== "rgb(255, 255, 255)" && P.find.bg !== "rgb(255, 255, 255)",
    "P1 neither Ledger search box renders as an unstyled white input on the dark page");
  ok(P.former.bg === P.find.bg && P.former.color === P.find.color,
    "P2 ... and the two are styled identically to each other");

  // ---------- O. Layout ------------------------------------------------
  for (const [vp, name] of [[PHONE, "phone"], [TABLET, "tablet"]]) {
    const p = await openApp(vp);
    const o = await p.evaluate(a => {
      __setLiveCoinsForTest(a);
      navigate("stats");
      return {
        overflow: document.body.scrollWidth > window.innerWidth + 1,
        rows: document.querySelectorAll("#ledgerExitHistoryList .wish-item").length
      };
    }, seedCoins());
    ok(!o.overflow, "O1 no horizontal overflow on " + name);
    ok(o.rows === 5, "O2 Former Holdings renders on " + name);
    await p.close();
  }
});
