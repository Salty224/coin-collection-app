// Three confirmed bugs from Ray's live-device test of Add Coin → Promote →
// Catalog/Ledger, all fixed together in this pass (see CLAUDE.md for the
// full write-up of each):
//
// FIX 1 — the Add Coin/Staging "Interim behaviour (Phase 1)" banner still
// claimed "Copilot reconciliation moves the row across", which stopped
// being true once the real in-app Promote step landed. Reworded, keeping
// the still-true "Save to Database writes to the same Staging draft as
// Save to Staging" claim intact.
//
// FIX 2 — coinDraftToAllValues() (the promotion write) never included
// FaceValue at all, so valueWithFaceFloor() (which depends entirely on
// All.FaceValue being populated) silently applied no floor to any
// newly-promoted coin — the $0.00 Value symptom Ray hit. Fixed with a
// small hardcoded denom-code -> dollar-value table
// (faceValueForDenomCode()), since no numeric face-value column exists
// anywhere in the workbook to read from.
//
// FIX 3 — Catalog never checked Status at all: a Sold/Gifted/Returned/
// Spent coin displayed exactly like an owned one. The same gap
// independently existed in Sets, Rolls, Stats' own totals, Spotlight, and
// Ledger's own coin search. One shared ownedCoins() helper
// (activeCoins() filtered to !isExitStatus) now backs every one of those
// list/grid surfaces. Deliberately NOT applied to Ledger's own Exit
// History or to activeCoins() itself (direct single-coin lookups still
// need every row, exit-status included).

const { defineSuite } = require("./harness");

const ALL_HEADERS = [
  "CollectionID", "CoinID", "Denomination", "Category", "Year", "MintMark",
  "Variety", "Description", "Finish", "Designation", "Grade", "GradeSource",
  "SerNo", "CACBean", "Cost", "Shipping", "Total", "Seller_Link",
  "PurchaseDate", "SpotValue", "Value", "FaceValue", "StorageLocation",
  "Container", "Remarks", "Reviewed", "LastModified", "Error", "Status"
];

function seedMock() {
  return { sheets: { All: [ALL_HEADERS.slice(), ["AY-00001", "C-OLD", "$1", "", 1889, "CC"]] } };
}

module.exports = defineSuite("promote-catalog-fixes", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ================================================================
  // FIX 1 — banner wording, both surfaces.
  // ================================================================
  const A = await page.evaluate(() => {
    const addCoin = document.getElementById("addCoinInterimBanner").textContent;
    const staging = document.getElementById("stagingInterimBanner").textContent;
    return { addCoin, staging };
  });
  ok(!A.addCoin.includes("Copilot reconciliation"), "A1 Add Coin banner no longer claims Copilot reconciliation moves the row across");
  ok(!A.staging.includes("Copilot reconciliation"), "A2 Staging Review banner no longer claims Copilot reconciliation moves the row across");
  ok(!A.addCoin.includes("Phase 1") && !A.addCoin.includes("Phase 2"), "A3 Add Coin banner drops the stale numbered-phase framing");
  ok(!A.staging.includes("Phase 1") && !A.staging.includes("Phase 2"), "A4 Staging Review banner drops the stale numbered-phase framing");
  ok(A.addCoin.includes("Save to Database") && A.addCoin.includes("Save to Staging") && A.addCoin.includes("same"),
     "A5 Add Coin banner keeps the still-true claim that Save to Database writes to the same Staging draft as Save to Staging");
  ok(/promote/i.test(A.addCoin), "A6 Add Coin banner now mentions a real Promote step");
  ok(/promote/i.test(A.staging), "A7 Staging Review banner now mentions Promote as the real write action");

  // ================================================================
  // FIX 2 — faceValueForDenomCode(), the exact reference table given.
  // ================================================================
  const B = await page.evaluate(() => ({
    H1C: faceValueForDenomCode("H1C"),
    c1C: faceValueForDenomCode("1C"),
    c2C: faceValueForDenomCode("2C"),
    c3CS: faceValueForDenomCode("3CS"),
    c3CN: faceValueForDenomCode("3CN"),
    H10C: faceValueForDenomCode("H10C"),
    c5C: faceValueForDenomCode("5C"),
    c10C: faceValueForDenomCode("10C"),
    c20C: faceValueForDenomCode("20C"),
    c25C: faceValueForDenomCode("25C"),
    c50C: faceValueForDenomCode("50C"),
    d1: faceValueForDenomCode("$1"),
    d2_5: faceValueForDenomCode("$2.5"),
    d3: faceValueForDenomCode("$3"),
    d5: faceValueForDenomCode("$5"),
    d10: faceValueForDenomCode("$10"),
    d20: faceValueForDenomCode("$20"),
    d25: faceValueForDenomCode("$25"),
    d50: faceValueForDenomCode("$50"),
    d100: faceValueForDenomCode("$100"),
    fiveOz: faceValueForDenomCode("5oz"),
    medal: faceValueForDenomCode("Medal"),
    blank: faceValueForDenomCode(""),
    nullish: faceValueForDenomCode(null),
    unknown: faceValueForDenomCode("XYZ-9")
  }));
  ok(B.H1C === 0.005, "B1 H1C (Half Cent) = 0.005");
  ok(B.c1C === 0.01, "B2 1C (Cent) = 0.01");
  ok(B.c2C === 0.02, "B3 2C (Two-Cent Piece) = 0.02");
  ok(B.c3CS === 0.03, "B4 3CS (Three-Cent Silver) = 0.03");
  ok(B.c3CN === 0.03, "B5 3CN (Three-Cent Nickel) = 0.03 — same value as 3CS, different metal");
  ok(B.H10C === 0.05, "B6 H10C (Half Dime) = 0.05 — its own historical denomination, NOT half of 10C");
  ok(B.c5C === 0.05, "B7 5C (Nickel) = 0.05");
  ok(B.c10C === 0.10, "B8 10C (Dime) = 0.10");
  ok(B.c20C === 0.20, "B9 20C (Twenty-Cent Piece) = 0.20");
  ok(B.c25C === 0.25, "B10 25C (Quarter) = 0.25");
  ok(B.c50C === 0.50, "B11 50C (Half Dollar) = 0.50");
  ok(B.d1 === 1, "B12 $1 parses as 1 via the $N pattern, not a table entry");
  ok(B.d2_5 === 2.5, "B13 $2.5 parses as 2.5 (a real Quarter Eagle/commemorative bullion code)");
  ok(B.d3 === 3 && B.d5 === 5 && B.d10 === 10 && B.d20 === 20 && B.d25 === 25 && B.d50 === 50 && B.d100 === 100,
     "B14 every other $N bullion code (3/5/10/20/25/50/100) parses directly as its own dollar amount");
  ok(B.fiveOz === null, "B15 5oz is not a face value at all — leaves FaceValue unset, not a wrong guess");
  ok(B.medal === null, "B16 Medal has no face value — leaves FaceValue unset");
  ok(B.blank === null && B.nullish === null, "B17 blank/null denom -> null, no throw");
  ok(B.unknown === null, "B18 a genuinely unrecognized code -> null (checked with Ray, not guessed at) rather than a wrong number");

  // Negative control: the exact prefixed/suffixed-code trap the task named
  // — a naive numeric-extraction regex over EVERY code would wrongly pull
  // digits out of H1C/3CS/H10C. Prove the real function does NOT do that.
  const B_NEG = await page.evaluate(() => {
    const naive = (code) => { const m = String(code).match(/[\d.]+/); return m ? Number(m[0]) : null; };
    return { naiveH1C: naive("H1C"), naive3CS: naive("3CS"), naiveH10C: naive("H10C") };
  });
  ok(B_NEG.naiveH1C === 1 && B_NEG.naive3CS === 3 && B_NEG.naiveH10C === 10,
     "B19 negative control: a naive numeric-extraction regex WOULD get these wrong (H1C->1, 3CS->3, H10C->10) — confirms the real function's table-first approach is load-bearing, not redundant caution");

  // ================================================================
  // FIX 2 — coinDraftToAllValues() actually includes FaceValue now.
  // ================================================================
  const C = await page.evaluate(() => ({
    cent: coinDraftToAllValues({ denom: "1C" }).FaceValue,
    halfDime: coinDraftToAllValues({ denom: "H10C" }).FaceValue,
    silverEagle: coinDraftToAllValues({ denom: "$1", category: "Silver Eagle" }).FaceValue,
    goldEagle50: coinDraftToAllValues({ denom: "$50", category: "Gold Eagle" }).FaceValue,
    unmatched: Object.prototype.hasOwnProperty.call(coinDraftToAllValues({ denom: "5oz" }), "FaceValue"),
    noDenom: Object.prototype.hasOwnProperty.call(coinDraftToAllValues({}), "FaceValue")
  }));
  ok(C.cent === 0.01, "C1 a promoted Cent draft's mapped row carries FaceValue 0.01");
  ok(C.halfDime === 0.05, "C2 a promoted Half Dime draft carries FaceValue 0.05 (not 0.10, not confused with 10C)");
  ok(C.silverEagle === 1, "C3 a bullion-tier pick (American Silver Eagle, denom $1) carries its real $1 legal face value, not its market value");
  ok(C.goldEagle50 === 50, "C4 a $50 Gold Eagle carries FaceValue 50, distinct from its market value — exactly the case the floor exists to protect");
  ok(C.unmatched === false, "C5 an unmatched denom code (5oz) leaves FaceValue OFF the mapped row entirely, not set to a wrong number");
  ok(C.noDenom === false, "C6 no denom at all -> FaceValue omitted, no throw");

  // ================================================================
  // FIX 2 — ALL_WRITABLE_COLUMNS / ALL_NEVER_WRITE_COLUMNS membership.
  // ================================================================
  const D = await page.evaluate(() => ({
    writable: ALL_WRITABLE_COLUMNS.includes("FaceValue"),
    neverWrite: ALL_NEVER_WRITE_COLUMNS.includes("FaceValue")
  }));
  ok(D.writable === true, "D1 FaceValue is on ALL_WRITABLE_COLUMNS — otherwise buildRowCellEdits() would silently drop it regardless of the mapping fix");
  ok(D.neverWrite === false, "D2 FaceValue is NOT on ALL_NEVER_WRITE_COLUMNS (it's a plain writable column, not a live formula)");

  // ================================================================
  // FIX 2 — full end-to-end: a real Promote through the mock Graph client
  // writes FaceValue for real, and valueWithFaceFloor() then floors a
  // sub-face-value estimate correctly — the actual reported symptom.
  // ================================================================
  const E = await page.evaluate(async ({ seed, headers }) => {
    window.__teardown = () => {
      __setAddCoinWriteEnabledForTest(null);
      __setGraphClientForTest(null);
      __resetAllHeaderMapForTest();
    };
    const mock = createMockGraphClient(seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();
    const draft = {
      type: "coin", version: 1, collectionID: "AY-00811", status: "Ready",
      denom: "1C", year: "1943", mint: "S", variety: "", description: "Lincoln Wheat Steel Cent",
      finish: "Business Strike", grade: "AU-50", gradeSource: "Owner",
      coinId: "C-1943-S-1C-01", allStatus: "Owned", photos: [],
      // A real, low estimate — exactly the reported $0.00-ish symptom: an
      // Owner-estimated low-value coin with nothing to floor it before
      // this fix.
      value: 0,
      allRowWritten: false, forceAdded: false
    };
    await mock.uploadJson(writePaths().stagingBase + "/AY-00811/coin.json", draft);
    const result = await promoteCoinDraftToAllSheet("AY-00811");
    const row = mock._grids.All.find(r => r[0] === "AY-00811");
    const faceValueCell = row ? row[headers.indexOf("FaceValue")] : null;
    const flooredDisplay = valueWithFaceFloor(0, faceValueCell);
    window.__teardown();
    return { ok: result && result.ok, faceValueCell, flooredDisplay };
  }, { seed: seedMock(), headers: ALL_HEADERS });
  ok(E.ok, "E1 sanity: the promote itself succeeded");
  ok(E.faceValueCell === 0.01, "E2 THE FIX: the real workbook write includes FaceValue=0.01 for a promoted Cent — this is what was previously silently absent");
  ok(E.flooredDisplay === 0.01, "E3 THE SYMPTOM FIXED: a freshly-promoted low-value coin's displayed Value is floored to its real face value (0.01), not $0.00");

  // Negative control: reproduce the OLD mapping (no FaceValue key at all)
  // and confirm the identical promote scenario would have left the sheet
  // with a blank/undefined FaceValue cell and an unfloored $0 display —
  // proves E2/E3 exercise a real fix, not a coincidence of the mock.
  const E_NEG = await page.evaluate(async ({ seed, headers }) => {
    window.__teardown = () => {
      __setAddCoinWriteEnabledForTest(null);
      __setGraphClientForTest(null);
      __resetAllHeaderMapForTest();
    };
    const mock = createMockGraphClient(seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();
    const origFn = window.coinDraftToAllValues;
    window.coinDraftToAllValues = function (draft) {
      const v = origFn(draft);
      delete v.FaceValue; // the exact pre-fix omission
      return v;
    };
    const draft = {
      type: "coin", version: 1, collectionID: "AY-00812", status: "Ready",
      denom: "1C", year: "1944", mint: "", variety: "", description: "Lincoln Wheat",
      coinId: "C-TEST-812", allStatus: "Owned", photos: [], value: 0,
      allRowWritten: false, forceAdded: false
    };
    await mock.uploadJson(writePaths().stagingBase + "/AY-00812/coin.json", draft);
    await promoteCoinDraftToAllSheet("AY-00812");
    window.coinDraftToAllValues = origFn;
    const row = mock._grids.All.find(r => r[0] === "AY-00812");
    const faceValueCell = row ? row[headers.indexOf("FaceValue")] : null;
    const flooredDisplay = valueWithFaceFloor(0, faceValueCell || null);
    window.__teardown();
    return { faceValueCell, flooredDisplay };
  }, { seed: seedMock(), headers: ALL_HEADERS });
  ok(!E_NEG.faceValueCell, "E4 negative control: without the fix, the promoted row's FaceValue cell is genuinely blank/undefined, reproducing the reported gap");
  ok(E_NEG.flooredDisplay === 0, "E5 negative control: without FaceValue on the sheet, the display stays at the unfloored $0 — the exact symptom Ray hit");

  // ================================================================
  // FIX 3 — ownedCoins() itself.
  // ================================================================
  const F = await page.evaluate(() => {
    __setLiveCoinsForTest([
      { id: "AY-00900", denom: "1C", status: "Owned" },
      { id: "AY-00901", denom: "5C", status: "" },
      { id: "AY-00902", denom: "10C", status: "Sold" },
      { id: "AY-00903", denom: "25C", status: "Gifted" },
      { id: "AY-00904", denom: "50C", status: "Returned" },
      { id: "AY-00905", denom: "$1", status: "Spent" },
      { id: "AY-00906", denom: "Medal", status: "At PCGS" }
    ]);
    const ids = ownedCoins().map(c => c.id);
    __setLiveCoinsForTest(null);
    return { ids };
  });
  ok(F.ids.includes("AY-00900") && F.ids.includes("AY-00901"), "F1 Owned and blank-status coins are included");
  ok(F.ids.includes("AY-00906"), "F2 a non-exit status like 'At PCGS' is included — only the four real exit statuses are excluded");
  ok(!F.ids.includes("AY-00902") && !F.ids.includes("AY-00903") && !F.ids.includes("AY-00904") && !F.ids.includes("AY-00905"),
     "F3 all four exit statuses (Sold/Gifted/Returned/Spent) are excluded");
  ok(F.ids.length === 3, "F4 exactly the 3 non-exited rows survive");

  // ================================================================
  // FIX 3 — Catalog: coinsTabBaseRows() / medalTabBaseRows().
  // ================================================================
  const G = await page.evaluate(() => {
    __setLiveCoinsForTest([
      { id: "AY-01000", denom: "1C", status: "Owned", rollId: "" },
      { id: "AY-01001", denom: "10C", status: "Returned", rollId: "" },
      { id: "AY-01002", denom: "Medal", status: "Owned", rollId: "" },
      { id: "AY-01003", denom: "Medal", status: "Sold", rollId: "" }
    ]);
    const coins = coinsTabBaseRows().map(c => c.id);
    const medals = medalTabBaseRows().map(c => c.id);
    __setLiveCoinsForTest(null);
    return { coins, medals };
  });
  ok(G.coins.includes("AY-01000") && !G.coins.includes("AY-01001"), "G1 THE BUG: Catalog's Coins base rows exclude a Returned coin");
  ok(G.medals.includes("AY-01002") && !G.medals.includes("AY-01003"), "G2 Catalog's Medal base rows exclude a Sold medal too");

  // ================================================================
  // FIX 3 — Rolls: applyRollsTabFilters() base set.
  // ================================================================
  const H = await page.evaluate(() => {
    __setLiveCoinsForTest([
      { id: "AY-01100", denom: "$1", status: "Owned", rollId: "R-1" },
      { id: "AY-01101", denom: "$1", status: "Spent", rollId: "R-2" }
    ]);
    navigate("browse");
    showBrowseTab("rolls");
    const childCount = document.getElementById("browseGrid").children.length;
    const resultCountText = document.getElementById("browseResultCount").textContent;
    __setLiveCoinsForTest(null);
    return { childCount, resultCountText };
  });
  ok(H.childCount === 1, "H1 THE BUG: Rolls tab renders exactly 1 card (the Owned roll), excluding the Spent one");
  ok(H.resultCountText.includes("1"), "H2 the result count also reflects the excluded row (got " + H.resultCountText + ")");

  // ================================================================
  // FIX 3 — Sets: list mode (applySetsTabFilters) and ownedSetForSetId().
  // ================================================================
  const I = await page.evaluate(() => {
    __setLiveCoinsForTest([
      { id: "AY-01200", denom: "Multiple", status: "Owned", category: "", setId: "S-2021-PR-01" },
      { id: "AY-01201", denom: "Multiple", status: "Gifted", category: "", setId: "S-2021-PR-02" }
    ]);
    navigate("browse");
    showBrowseTab("sets");
    const childCount = document.getElementById("browseGrid").children.length;
    const ownedGifted = ownedSetForSetId("S-2021-PR-02");
    const ownedNormal = ownedSetForSetId("S-2021-PR-01");
    __setLiveCoinsForTest(null);
    return { childCount, ownedGifted, ownedNormal: !!ownedNormal };
  });
  ok(I.childCount === 1, "I1 THE BUG: Sets tab list mode renders exactly 1 card (the Owned bundle), excluding the Gifted one");
  ok(I.ownedGifted === null, "I2 ownedSetForSetId() (feeds the completeness checklist's 'owned' tile) returns null for a Gifted Set bundle — it must never show as owned there");
  ok(I.ownedNormal === true, "I3 sanity: an ordinary Owned Set bundle still resolves as owned");

  // ================================================================
  // FIX 3 — Stats: renderStats() totals exclude exit-status coins, but
  // Exit History still shows them (explicit non-exclusion).
  // ================================================================
  const J = await page.evaluate(() => {
    __setLiveCoinsForTest([
      { id: "AY-01300", denom: "1C", status: "Owned", cost: 10, value: 20, faceValue: null },
      { id: "AY-01301", denom: "$1", status: "Sold", cost: 500, value: 9999, faceValue: null, saleDate: "2026-01-01", salePrice: 600 }
    ]);
    navigate("stats");
    const totalItems = document.getElementById("statTotalItems").textContent;
    const totalValue = document.getElementById("statTotalValue").textContent;
    const exitHtml = document.getElementById("ledgerExitHistoryList").innerHTML;
    __setLiveCoinsForTest(null);
    return { totalItems, totalValue, exitHtml };
  });
  ok(J.totalItems === "1", "J1 THE BUG: Ledger's total item count excludes the Sold coin (1, not 2)");
  ok(J.totalValue === "$20.00", "J2 THE BUG: Total Value is exactly the Owned coin's own $20.00 — the Sold coin's huge $9,999 value is NOT summed in (got " + J.totalValue + ")");
  ok(J.exitHtml.includes("AY-01301"), "J3 explicit non-exclusion: Exit History still shows the Sold coin — it specifically wants exited coins");

  // ================================================================
  // FIX 3 — Ledger's own "Find a Coin" search stays excluded (already
  // correct before this task; re-verified after the refactor to
  // ownedCoins()).
  // ================================================================
  const K = await page.evaluate(() => {
    __setLiveCoinsForTest([
      { id: "AY-01400", denom: "1C", status: "Owned", name: "UniqueSearchTermCoin", year: 1943, mint: "" },
      { id: "AY-01401", denom: "1C", status: "Returned", name: "UniqueSearchTermCoin", year: 1943, mint: "" }
    ]);
    navigate("stats");
    const input = document.getElementById("ledgerSearchInput");
    input.value = "UniqueSearchTermCoin";
    renderLedgerCoinSearch();
    const html = document.getElementById("ledgerSearchResults").innerHTML;
    input.value = "";
    __setLiveCoinsForTest(null);
    return { hasOwned: html.includes("AY-01400"), hasReturned: html.includes("AY-01401") };
  });
  ok(K.hasOwned && !K.hasReturned, "K1 Ledger's coin search finds the Owned match and excludes the Returned one with the identical name");

  // ================================================================
  // FIX 3 — Spotlight: spotlightCoinList() excludes exit-status coins even
  // when there are exactly SPOTLIGHT_COUNT non-exited candidates.
  // ================================================================
  const L = await page.evaluate(() => {
    __resetSpotlightSelectionForTest();
    __setLiveCoinsForTest([
      { id: "AY-01500", denom: "1C", year: 1909, mint: "S", name: "A", status: "Owned" },
      { id: "AY-01501", denom: "5C", year: 1913, mint: "", name: "B", status: "Owned" },
      { id: "AY-01502", denom: "10C", year: 1916, mint: "D", name: "C", status: "Owned" },
      { id: "AY-01503", denom: "25C", year: 1932, mint: "D", name: "D", status: "Owned" },
      { id: "AY-01504", denom: "50C", year: 1921, mint: "", name: "E", status: "Owned" },
      // A 6th, exit-status candidate that must NEVER be picked, even
      // though including it would make a valid 5-of-6 selection.
      { id: "AY-01505", denom: "$1", year: 1928, mint: "", name: "F", status: "Sold" }
    ]);
    const picks = spotlightCoinList().map(c => c.id);
    __setLiveCoinsForTest(null);
    __resetSpotlightSelectionForTest();
    return { picks };
  });
  ok(L.picks.length === 5, "L1 sanity: 5 picked from the 5 real candidates");
  ok(!L.picks.includes("AY-01505"), "L2 THE BUG: the Sold coin is never surfaced on the dashboard, even though it would otherwise be a valid 6th candidate");

  // Negative control: reverting spotlightCoinList()'s pool filter to drop
  // the isExitStatus() check reproduces the Sold coin being eligible.
  const L_NEG = await page.evaluate(() => {
    __resetSpotlightSelectionForTest();
    __setLiveCoinsForTest([
      { id: "AY-01600", denom: "1C", year: 1909, mint: "S", name: "A", status: "Owned" },
      { id: "AY-01601", denom: "$1", year: 1928, mint: "", name: "F", status: "Sold" }
    ]);
    const orig = window.spotlightCoinList;
    window.spotlightCoinList = function () {
      // The exact pre-fix pool filter (no isExitStatus check).
      return activeCoins().filter(c => c && c.id && !isSetRow(c));
    };
    const picks = spotlightCoinList().map(c => c.id);
    window.spotlightCoinList = orig;
    __setLiveCoinsForTest(null);
    __resetSpotlightSelectionForTest();
    return { picks };
  });
  ok(L_NEG.picks.includes("AY-01601"), "L3 negative control: the pre-fix pool filter DOES surface a Sold coin — proves L2 exercises a real fix, not incidental pool ordering");

  // ================================================================
  // Explicit non-exclusions, restated directly: activeCoins() itself
  // (the raw source every direct single-coin lookup uses) is untouched.
  // ================================================================
  const M = await page.evaluate(() => {
    __setLiveCoinsForTest([
      { id: "AY-01700", denom: "1C", status: "Returned", name: "Direct Lookup Coin" }
    ]);
    const direct = activeCoins().find(c => c.id === "AY-01700");
    __setLiveCoinsForTest(null);
    return { found: !!direct, name: direct && direct.name };
  });
  ok(M.found && M.name === "Direct Lookup Coin", "M1 a direct single-coin CollectionID lookup via activeCoins() still finds an exited coin — individually viewable, per the explicit scope boundary");

  // Nav/overflow smoke.
  const N = await page.evaluate(() => {
    navigate("addcoin");
    navigate("stats");
    return { noOverflow: document.body.scrollWidth <= window.innerWidth };
  });
  ok(N.noOverflow, "N1 no page-level horizontal overflow");
}, module);
