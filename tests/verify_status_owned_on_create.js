// Every code path that creates a brand-new All row now stamps the literal
// string "Owned" into Status at creation time, rather than leaving it
// blank. Copilot backfilled every existing row (556 total: 535 were blank,
// 21 already said "Owned") to a real "Owned" — this is what keeps a
// freshly-created row consistent with that going forward.
//
// All of Add Coin's real write, Force Add, and Promote turn out to be ONE
// shared code path — createAllSheetRow()/writeNewRowKeyCells() claim or
// append the row and write only its key cells (CollectionID/CoinID);
// coinDraftToAllValues() maps every other field, Status included, and
// that's the one place this fix lives. Verified here end-to-end through
// the real mock Graph client, not just as a unit check on the mapper
// (see verify_status_exit.js's own H6/H7 for that).
//
// Deliberately does NOT touch Sell/Remove's own protection on Edit Coin
// (Status is only written there when the user has actually touched the
// select this session) — that guards against stamping "Owned" onto an
// EXISTING blank/legacy row during an unrelated edit, a different moment
// from a row's one-time creation, and is unaffected by this change.
//
// Add Set's write layer has no code path that creates an All row at all
// (confirmed by direct search — it only ever writes Staging JSON; moving
// data into a real All row is still the external/manual reconciliation
// step). There is nothing to fix there today.

const { defineSuite } = require("./harness");

const ALL_HEADERS = [
  "CollectionID", "CoinID", "Denomination", "Category", "Year", "MintMark",
  "Variety", "Description", "Finish", "Designation", "Grade", "GradeSource",
  "SerNo", "CACBean", "Cost", "Shipping", "Total", "Seller_Link",
  "PurchaseDate", "SpotValue", "Value", "StorageLocation", "Container",
  "Remarks", "Reviewed", "LastModified", "Error", "Status"
];

function seedMock() {
  return { sheets: { All: [ALL_HEADERS.slice(), ["AY-00001", "C-OLD", "$1", "", 1889, "CC"]] } };
}

module.exports = defineSuite("status-owned-on-create", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  await page.evaluate(() => {
    window.__teardown = () => {
      __setAddCoinWriteEnabledForTest(null);
      __setGraphClientForTest(null);
      __resetAllHeaderMapForTest();
    };
  });

  // ---------- A. Promote (a matched draft) stamps "Owned" on creation ----
  const A = await page.evaluate(async ({ seed, headers }) => {
    const mock = createMockGraphClient(seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();
    const draft = {
      type: "coin", version: 1, collectionID: "AY-00801", status: "Ready",
      denom: "1C", year: "1943", mint: "S", variety: "", description: "Lincoln Wheat",
      finish: "Business Strike", grade: "MS-66", gradeSource: "PCGS",
      coinId: "C-1943-S-1C-01", allStatus: "Owned", photos: [],
      allRowWritten: false, forceAdded: false
    };
    await mock.uploadJson(writePaths().stagingBase + "/AY-00801/coin.json", draft);
    const result = await promoteCoinDraftToAllSheet("AY-00801");
    const row = mock._grids.All.find(r => r[0] === "AY-00801");
    const status = row ? row[headers.indexOf("Status")] : null;
    __teardown();
    return { ok: result && result.ok, status };
  }, { seed: seedMock(), headers: ALL_HEADERS });
  ok(A.ok, "A1 sanity: the promote itself succeeded");
  ok(A.status === "Owned", "A2 Promote stamps the literal 'Owned' into Status on the newly-created row");

  // ---------- B. Force Add (an unmatched draft) stamps "Owned" too -------
  const B = await page.evaluate(async ({ seed, headers }) => {
    const mock = createMockGraphClient(seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();
    const draft = {
      type: "coin", version: 1, collectionID: "AY-00802", status: "Ready",
      denom: "5C", year: "1971", mint: "", variety: "", description: "Jefferson Nickel",
      allStatus: "Owned", coinId: "", photos: [], allRowWritten: false, forceAdded: false
    };
    await mock.uploadJson(writePaths().stagingBase + "/AY-00802/coin.json", draft);
    const result = await promoteCoinDraftToAllSheet("AY-00802", { force: true });
    const row = mock._grids.All.find(r => r[0] === "AY-00802");
    const status = row ? row[headers.indexOf("Status")] : null;
    __teardown();
    return { ok: result && result.ok, status };
  }, { seed: seedMock(), headers: ALL_HEADERS });
  ok(B.ok, "B1 sanity: Force Add itself succeeded");
  ok(B.status === "Owned", "B2 Force Add also stamps 'Owned' on the newly-created (unlinked) row");

  // ---------- C. A genuine exit-status pick at add-time still wins -------
  // (the rare "logging a coin that's already left the collection" case —
  // must NOT be clobbered into "Owned" by this fix).
  const C = await page.evaluate(async ({ seed, headers }) => {
    const mock = createMockGraphClient(seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();
    const draft = {
      type: "coin", version: 1, collectionID: "AY-00803", status: "Ready",
      denom: "10C", year: "1964", mint: "D", variety: "", description: "Roosevelt Dime",
      allStatus: "Sold", coinId: "C-TEST", photos: [], allRowWritten: false, forceAdded: false
    };
    await mock.uploadJson(writePaths().stagingBase + "/AY-00803/coin.json", draft);
    const result = await promoteCoinDraftToAllSheet("AY-00803");
    const row = mock._grids.All.find(r => r[0] === "AY-00803");
    const status = row ? row[headers.indexOf("Status")] : null;
    __teardown();
    return { ok: result && result.ok, status };
  }, { seed: seedMock(), headers: ALL_HEADERS });
  ok(C.ok, "C1 sanity: the promote succeeded");
  ok(C.status === "Sold", "C2 a genuine exit-status pick at add-time still writes its own real value, not overridden to 'Owned'");

  // ---------- D. A legacy draft with no allStatus field at all -----------
  // (written before this field existed) still defaults to "Owned", not a
  // blank/undefined cell.
  const D = await page.evaluate(async ({ seed, headers }) => {
    const mock = createMockGraphClient(seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();
    const draft = {
      type: "coin", version: 1, collectionID: "AY-00804", status: "Ready",
      denom: "25C", year: "2021", mint: "S", variety: "", description: "Washington Quarter",
      coinId: "C-TEST-2", photos: [], allRowWritten: false, forceAdded: false
      // no allStatus at all
    };
    await mock.uploadJson(writePaths().stagingBase + "/AY-00804/coin.json", draft);
    const result = await promoteCoinDraftToAllSheet("AY-00804");
    const row = mock._grids.All.find(r => r[0] === "AY-00804");
    const status = row ? row[headers.indexOf("Status")] : null;
    __teardown();
    return { ok: result && result.ok, status };
  }, { seed: seedMock(), headers: ALL_HEADERS });
  ok(D.ok, "D1 sanity: the promote succeeded");
  ok(D.status === "Owned", "D2 a legacy draft with no allStatus field at all still defaults to 'Owned', never a blank cell");

  // ---------- E. Negative control: a direct call with the OLD default-arg
  // shape reproduces blank, proving A/B/D above are exercising a real,
  // meaningful branch rather than always landing on the same value by luck.
  const E = await page.evaluate(() => {
    // The exact shape the old (pre-fix) code would have produced for the
    // Owned/default case: a falsy allStatus mapped to blank rather than
    // "Owned". If coinDraftToAllValues() ever regressed to that, this
    // would still read "" here.
    const oldStyleResult = (function oldCoinDraftStatus(draft) {
      return (draft.allStatus && draft.allStatus !== "Owned") ? draft.allStatus : "";
    })({ allStatus: "" });
    const realResult = coinDraftToAllValues({ allStatus: "" }).Status;
    return { oldStyleResult, realResult };
  });
  ok(E.oldStyleResult === "", "E1 sanity: the pre-fix formula really did produce blank for the default case");
  ok(E.realResult === "Owned", "E2 the REAL function now produces 'Owned' for the identical input -- confirms this is a genuine behavior change, not a coincidence of the mock setup");

  // Nav/overflow smoke.
  const N = await page.evaluate(() => {
    navigate("addcoin");
    return { noOverflow: document.body.scrollWidth <= window.innerWidth };
  });
  ok(N.noOverflow, "N1 no page-level horizontal overflow (no UI change in this task, but confirms nothing else broke)");
}, module);
