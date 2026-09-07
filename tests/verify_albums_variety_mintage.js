// Three related Albums display fixes/additions, all scoped with Ray:
//
//   1. BUG FIX — the variety sub-label (renderSlotCell()'s .slot-variety
//      line) used to only render when a slot was ALSO flagged key-date
//      (`slot.keyDate && slotVariety(slot)`), an accidental coupling of two
//      unrelated things. A variety must show whenever the slot HAS one,
//      independent of key-date status — the key-date star badge itself is
//      a separate, untouched mechanism that merely shared this one gating
//      condition by mistake.
//   2. NEW — rounded Mintage display, Albums book view ONLY: >= 1,000,000
//      shows as "X.X Million" (one decimal); below 1,000,000 shows the
//      exact comma-formatted figure, unchanged. Browse detail, Catalog,
//      Edit, and every other mintage display in the app are untouched —
//      they read the exact figure through their own separate code paths.
//   3. NEW — DB_Coins.MintageInclusive="Y" (a die variety/designation the
//      Mint never tallied separately, so its Mintage is copied from its
//      parent date/mint) displays as the plain word "Included" instead of
//      a number, replacing the number entirely (nothing to round).
//
// See CLAUDE.md for the full write-up. Demo data: FAKE_ALBUMS' Lincoln
// Cents album gained two new slots (a non-key-date "Doubled Die" variety,
// and the 1945-S Micro S MintageInclusive example) with matching
// FAKE_DB_COINS rows — not directly exercised by this suite (which builds
// its own precisely-controlled fixture instead, so tests don't have to
// hunt through however many pages the larger, evolving demo album
// computes), but worth knowing the same shape now lives there too for
// anyone spot-checking the mockup by eye.

const { defineSuite } = require("./harness");

// A small, self-contained live fixture — precise control over slot count
// (all 6 fit on one coins page at phone width, confirmed directly) so
// every assertion below reads from one render with no page-hunting.
function buildFixture() {
  const albumRows = [
    // Key date WITH a variety (VDB) — must still show both label and star.
    { Year: 1909, MintMark: "S", Variety: "VDB", Description: "Lincoln Wheat Cent",
      AlbumID: "S-2027-AL-01", CoinID: "C-TEST-1909-S-1C-VDB", FilledBy: "" },
    // Plain, no variety, no key date — the ordinary case, unaffected.
    { Year: 1910, MintMark: "", Variety: "", Description: "Lincoln Wheat Cent",
      AlbumID: "S-2027-AL-01", CoinID: "C-TEST-1910-1C-01", FilledBy: "" },
    // THE BUG FIX: a real variety, NOT a key date. Its DB_Coins mintage
    // (500,000) is also under 1,000,000 — exercises the "exact figure, no
    // rounding" branch on the same slot.
    { Year: 1912, MintMark: "D", Variety: "Doubled Die", Description: "Lincoln Wheat Cent",
      AlbumID: "S-2027-AL-01", CoinID: "C-TEST-1912-D-1C-DD", FilledBy: "" },
    // Million-rounding: a real, large mintage (175,090,000 -> "175.1 Million").
    { Year: 1944, MintMark: "", Variety: "", Description: "Lincoln Wheat Cent",
      AlbumID: "S-2027-AL-01", CoinID: "C-TEST-1944-1C-BIG", FilledBy: "" },
    // MintageInclusive="Y": 1945-S Micro S, the exact example named when
    // this column was introduced.
    { Year: 1945, MintMark: "S", Variety: "Micro S", Description: "Lincoln Wheat Cent",
      AlbumID: "S-2027-AL-01", CoinID: "C-TEST-1945-S-1C-MICROS", FilledBy: "" },
    // No DB_Coins match at all -> no mintage line, unaffected.
    { Year: 1946, MintMark: "", Variety: "", Description: "Lincoln Wheat Cent",
      AlbumID: "S-2027-AL-01", CoinID: "C-TEST-1946-1C-NOMATCH", FilledBy: "" }
  ];
  const dbSetsRows = [
    { SetID: "S-2027-AL-01", Description: "Test Album", MfgProductID: "", ContainerName: "", Coins: albumRows.length, Lineage: "" }
  ];
  const dbCoinsRows = [
    { CoinID: "C-TEST-1909-S-1C-VDB", Mintage: 1825000, KeyDate: "Key Date" },
    { CoinID: "C-TEST-1910-1C-01", Mintage: 500000, KeyDate: "" },
    { CoinID: "C-TEST-1912-D-1C-DD", Mintage: 500000, KeyDate: "" }, // NOT key date, per the bug fix
    { CoinID: "C-TEST-1944-1C-BIG", Mintage: 175090000, KeyDate: "" },
    { CoinID: "C-TEST-1945-S-1C-MICROS", Mintage: 181770000, MintageInclusive: "Y", KeyDate: "" }
    // C-TEST-1946-1C-NOMATCH: deliberately no DB_Coins row at all.
  ];
  return { albumRows, dbSetsRows, dbCoinsRows };
}

module.exports = defineSuite("albums-variety-mintage", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);
  const fixture = buildFixture();

  // ================================================================
  // A. THE BUG FIX — a variety shows whenever the slot has one, whether or
  //    not it's also a key date. buildLiveAlbums()'s own key-date index
  //    (dbCoinsRows) is enough for this block; slotMintage()'s separate
  //    activeDbCoins() catalog isn't needed until block B.
  // ================================================================
  const A = await page.evaluate(async (fx) => {
    const live = buildLiveAlbums(fx.albumRows, fx.dbSetsRows, [], fx.dbCoinsRows);
    __setLiveAlbumsForTest(live);
    navigate("albums");
    await showAlbumDetail(0);
    document.getElementById("albumPageNextBtn").click(); // cover -> history
    document.getElementById("albumPageNextBtn").click(); // history -> the one coins page (all 6 slots fit)
    function varietyInfo(coinId) {
      const cell = document.querySelector(`#albumsDetailContainer .slot-cell[data-coin-id="${coinId}"]`);
      const el = cell && cell.querySelector(".slot-variety");
      return { hasCell: !!cell, hasKeyDateClass: cell ? cell.classList.contains("key-date") : null, varietyText: el ? el.textContent : null };
    }
    const keyDateWithVariety = varietyInfo("C-TEST-1909-S-1C-VDB");
    const notKeyDateWithVariety = varietyInfo("C-TEST-1912-D-1C-DD"); // THE bug fix case
    const plainNoVariety = varietyInfo("C-TEST-1910-1C-01");
    __setLiveAlbumsForTest(null);
    return { keyDateWithVariety, notKeyDateWithVariety, plainNoVariety };
  }, fixture);
  ok(A.keyDateWithVariety.hasCell, "A0 sanity: the key-date+variety slot rendered");
  ok(A.keyDateWithVariety.hasKeyDateClass === true, "A1 sanity: that slot IS flagged key-date (as it always was)");
  ok(A.keyDateWithVariety.varietyText === "VDB", "A2 a key-date slot with a variety still shows it (unchanged behavior)");
  ok(A.notKeyDateWithVariety.hasKeyDateClass === false, "A3 sanity: the Doubled Die slot is genuinely NOT flagged key-date");
  ok(A.notKeyDateWithVariety.varietyText === "Doubled Die", "A4 THE BUG FIX: a non-key-date slot's variety now shows — this is the exact case the old `slot.keyDate && slotVariety(slot)` gate used to hide");
  ok(A.plainNoVariety.varietyText === null, "A5 a slot with no variety at all still shows no variety line, either way");

  // Negative control — reproduces the pre-fix gate inline against the SAME
  // rendered slot, confirming it genuinely would have hidden the Doubled
  // Die variety (proving A4 exercises a real fix, not a tautology).
  const NEG_A = await page.evaluate((fx) => {
    const live = buildLiveAlbums(fx.albumRows, fx.dbSetsRows, [], fx.dbCoinsRows);
    const slot = live[0].slots.find(s => s.coinId === "C-TEST-1912-D-1C-DD");
    const oldGateResult = (slot.keyDate && slotVariety(slot)) ? slotVariety(slot) : null;
    return { oldGateResult, keyDate: slot.keyDate, variety: slotVariety(slot) };
  }, fixture);
  ok(NEG_A.variety === "Doubled Die" && NEG_A.keyDate === false, "NEG_A0 sanity: the slot genuinely has a variety and genuinely is not key-date");
  ok(NEG_A.oldGateResult === null, "NEG_A1 negative control: the OLD gate formula (slot.keyDate && slotVariety(slot)) evaluates to null/hidden for this exact slot — confirms A4 is a real fix, not a coincidental pass");

  // ================================================================
  // B. Million-rounding — Albums book view only. slotMintage() resolves
  //    through activeDbCoins() (LIVE_DB_COINS || FAKE_DB_COINS), a
  //    SEPARATE catalog from buildLiveAlbums()'s own key-date index — both
  //    need to be seeded from the same raw dbCoinsRows via
  //    mapWorkbookRowToDbCoin(), the real mapper, not a hand-shaped mock.
  // ================================================================
  const B = await page.evaluate(async (fx) => {
    const live = buildLiveAlbums(fx.albumRows, fx.dbSetsRows, [], fx.dbCoinsRows);
    __setLiveAlbumsForTest(live);
    __setLiveDbCoinsForTest(fx.dbCoinsRows.map(mapWorkbookRowToDbCoin));
    navigate("albums");
    await showAlbumDetail(0);
    document.getElementById("albumPageNextBtn").click();
    document.getElementById("albumPageNextBtn").click();
    function mintageText(coinId) {
      const cell = document.querySelector(`#albumsDetailContainer .slot-cell[data-coin-id="${coinId}"]`);
      const el = cell && cell.querySelector(".slot-mintage");
      return el ? el.textContent : (cell ? "(no mintage line)" : "(no cell)");
    }
    const result = {
      big: mintageText("C-TEST-1944-1C-BIG"),          // 175,090,000 -> rounded
      small: mintageText("C-TEST-1912-D-1C-DD"),        // 500,000 -> exact
      noMatch: mintageText("C-TEST-1946-1C-NOMATCH")    // no DB_Coins row -> no line
    };
    __setLiveAlbumsForTest(null);
    __setLiveDbCoinsForTest(null);
    return result;
  }, fixture);
  ok(B.big === "175.1 Million", "B1 a large mintage (175,090,000) rounds to one decimal + \" Million\" — matches the exact worked example from the task (no \"Mintage\" label prefix, per Ray's follow-up correction)");
  ok(B.small === "500,000", "B2 a mintage under 1,000,000 (500,000) still shows the exact comma-formatted figure, unrounded");
  ok(B.noMatch === "(no mintage line)", "B3 a slot with no DB_Coins match at all still shows no mintage line, unchanged");

  // ================================================================
  // C. MintageInclusive="Y" -> "Included", replacing the number entirely.
  // ================================================================
  const C = await page.evaluate(async (fx) => {
    const live = buildLiveAlbums(fx.albumRows, fx.dbSetsRows, [], fx.dbCoinsRows);
    __setLiveAlbumsForTest(live);
    __setLiveDbCoinsForTest(fx.dbCoinsRows.map(mapWorkbookRowToDbCoin));
    navigate("albums");
    await showAlbumDetail(0);
    document.getElementById("albumPageNextBtn").click();
    document.getElementById("albumPageNextBtn").click();
    const cell = document.querySelector('#albumsDetailContainer .slot-cell[data-coin-id="C-TEST-1945-S-1C-MICROS"]');
    const mintageEl = cell && cell.querySelector(".slot-mintage");
    const varietyEl = cell && cell.querySelector(".slot-variety");
    const result = {
      mintageText: mintageEl ? mintageEl.textContent : null,
      varietyText: varietyEl ? varietyEl.textContent : null // independent axis — must still show "Micro S"
    };
    __setLiveAlbumsForTest(null);
    __setLiveDbCoinsForTest(null);
    return result;
  }, fixture);
  ok(C.mintageText === "Included", "C1 a MintageInclusive=\"Y\" row shows the word \"Included\" in place of any number — the exact 1945-S Micro S example named in the task (no \"Mintage\" label prefix)");
  ok(C.varietyText === "Micro S", "C2 the variety label (a completely independent field) still shows normally on the same slot — MintageInclusive doesn't affect it");

  // Negative control — a coin with a large mintage and NO inclusive flag
  // must NOT read "Included" (confirms C1 isn't a default/always-on state).
  const NEG_C = await page.evaluate((fx) => {
    const mapped = mapWorkbookRowToDbCoin(fx.dbCoinsRows.find(r => r.CoinID === "C-TEST-1944-1C-BIG"));
    return { text: formatAlbumMintage({ inclusive: false, value: mapped.mintage }) };
  }, fixture);
  ok(NEG_C.text === "175.1 Million", "NEG_C1 negative control: a normal large-mintage row (no MintageInclusive flag) formats as the rounded number, not \"Included\" — confirms C1 depends on the real flag");

  // ================================================================
  // D. formatAlbumMintage()/slotMintage() in isolation — every branch,
  //    including the boundary at exactly 1,000,000, and mapWorkbookRowToDbCoin()
  //    reading the real MintageInclusive column.
  // ================================================================
  const D = await page.evaluate(() => ({
    exactlyOneMillion: formatAlbumMintage({ inclusive: false, value: 1000000 }),
    justUnder: formatAlbumMintage({ inclusive: false, value: 999999 }),
    small: formatAlbumMintage({ inclusive: false, value: 72664 }),
    // Even with a huge value also present, the inclusive flag wins outright
    // — inclusive-ness is independent of magnitude, checked first.
    inclusiveWinsOverValue: formatAlbumMintage({ inclusive: true, value: 999999999 }),
    slotMintageNoDbCoinRow: (() => {
      const orig = window.activeDbCoins;
      window.activeDbCoins = () => [];
      const r = slotMintage({ coinId: "NOPE" });
      window.activeDbCoins = orig;
      return r;
    })(),
    slotMintageInclusiveNoNumber: (() => {
      const orig = window.activeDbCoins;
      window.activeDbCoins = () => [{ coinId: "X", mintage: null, mintageInclusive: "Y" }];
      const r = slotMintage({ coinId: "X" });
      window.activeDbCoins = orig;
      return r;
    })(),
    // mapWorkbookRowToDbCoin() reads the real MintageInclusive column —
    // covers a populated "Y", a blank cell, and a row with no such column
    // present at all (never throws, never a false "Y").
    mapperY: mapWorkbookRowToDbCoin({ CoinID: "X", MintageInclusive: "Y" }).mintageInclusive,
    mapperBlank: mapWorkbookRowToDbCoin({ CoinID: "X", MintageInclusive: "" }).mintageInclusive,
    mapperMissing: mapWorkbookRowToDbCoin({ CoinID: "X" }).mintageInclusive
  }));
  ok(D.exactlyOneMillion === "1.0 Million", "D1 exactly 1,000,000 rounds (the boundary belongs to the Million branch, not the exact-figure one)");
  ok(D.justUnder === "999,999", "D2 999,999 (just under the boundary) stays exact, comma-formatted");
  ok(D.small === "72,664", "D3 an ordinary small mintage formats exactly, unchanged from before this feature");
  ok(D.inclusiveWinsOverValue === "Included", "D4 the inclusive flag wins outright regardless of what value happens to be present");
  ok(D.slotMintageNoDbCoinRow === null, "D5 slotMintage() returns null (not a throw, not an object) when there's no DB_Coins match at all");
  ok(D.slotMintageInclusiveNoNumber && D.slotMintageInclusiveNoNumber.inclusive === true, "D6 a row flagged inclusive with no numeric mintage at all still reports inclusive:true — the flag doesn't depend on a number being present");
  ok(D.mapperY === "Y", "D7 mapWorkbookRowToDbCoin() reads a real MintageInclusive=\"Y\" cell");
  ok(D.mapperBlank === "", "D8 a blank MintageInclusive cell maps to an empty string, not \"Y\"/undefined");
  ok(D.mapperMissing === "", "D9 a row with no MintageInclusive column at all still maps cleanly to \"\", never a throw");

  // ================================================================
  // E. nav smoke / no overflow
  // ================================================================
  const E = await page.evaluate(() => {
    __setLiveAlbumsForTest(null);
    __setLiveDbCoinsForTest(null);
    const bad = [];
    ["dashboard", "albums", "dashboard"].forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(E.bad.length === 0, "E1 nav still works cleanly: " + E.bad.join("; "));
  ok(E.overflow === false, "E2 no horizontal page overflow at 412px");
}, module);
