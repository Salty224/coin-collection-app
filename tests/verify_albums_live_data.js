// Albums live-wiring (read-only). Swaps FAKE_ALBUMS for real Albums-sheet +
// DB_Sets(AL) + Wishlist data, following the exact same ensureLiveNavDataFetch()/
// fetchWorkbookSheetRows()/activeX() accessor pattern already used for
// Catalog/Sets/Metal. See CLAUDE.md "Albums (live)" for the write-up. No
// write capability is added by this — every assertion here is read-only.

const { defineSuite } = require("./harness");

// Synthetic raw sheet rows, shaped exactly like fetchWorkbookSheetRows()'
// own output (plain objects keyed by the header row's own text) — never the
// mapped FAKE_ALBUMS shape. Two real albums (Lincoln Cents, Mercury Dimes),
// one non-Album DB_Sets row (must be excluded), and one Album-type DB_Sets
// row with no matching Albums-sheet rows at all (must also be excluded —
// nothing to render).
function rawAlbumRows() {
  return [
    // Lincoln Cents — S-2020-AL-01 — 3 rows, 2 filled. FilledBy uses the
    // AY-9xxxx convention (same as verify_stats_live_data.js's own live
    // fixtures) — nothing in FAKE_COINS can coincidentally match, so a
    // real read-through proves itself unambiguously rather than passing by
    // accident because a demo row happens to share the same id.
    { Status: "Filled", Year: 1909, MintMark: "", Variety: "", Description: "Lincoln Wheat Cent",
      AlbumName: "Lincoln Cents", AlbumID: "S-2020-AL-01", CoinID: "C-1909--1C-01", FilledBy: "AY-90004" },
    { Status: "Filled", Year: 1909, MintMark: "S", Variety: "VDB", Description: "Lincoln Wheat Cent",
      AlbumName: "Lincoln Cents", AlbumID: "S-2020-AL-01", CoinID: "C-1909-S-1C-02", FilledBy: "AY-90099" },
    { Status: "Open", Year: 1910, MintMark: "", Variety: "", Description: "Lincoln Wheat Cent",
      AlbumName: "Lincoln Cents", AlbumID: "S-2020-AL-01", CoinID: "C-1910--1C-01", FilledBy: "" },
    // Mercury Dimes — S-2021-AL-02 — 1 row, open, matched by a Wishlist row
    { Status: "Open", Year: 1916, MintMark: "D", Variety: "", Description: "Mercury Dime",
      AlbumName: "Mercury Dimes", AlbumID: "S-2021-AL-02", CoinID: "C-1916-D-10C-01", FilledBy: "" }
  ];
}

function rawDbSetsRows() {
  return [
    // Deliberately NOT "Lincoln Cents — Whitman Folder Vol. 1" — that's
    // FAKE_ALBUMS' own first entry's exact name, and reusing it would let a
    // negative control (still reading FAKE_ALBUMS) pass by pure name
    // coincidence rather than actually proving the live swap.
    { SetID: "S-2020-AL-01", Description: "Lincoln Cents — LIVE TEST Folder",
      MfgProductID: "LCF18", ContainerName: "Shelf B", Coins: 8, Lineage: "" },
    { SetID: "S-2021-AL-02", Description: "Mercury Dimes — LIVE TEST Folder",
      MfgProductID: "", ContainerName: "", Coins: 5, Lineage: "" },
    // A real Album-type row with no matching Albums-sheet data — must be
    // skipped (renderAlbumsList()'s own fill-% math divides by slots.length).
    { SetID: "S-2019-AL-03", Description: "Buffalo Nickels — orphan product row",
      MfgProductID: "", ContainerName: "", Coins: 0, Lineage: "" },
    // Not an Album at all — must never leak into LIVE_ALBUMS via a loose match.
    { SetID: "S-2021-PR-01", Description: "2021 United States Proof Set",
      MfgProductID: "", ContainerName: "", Coins: 0, Lineage: "Proof Set" }
  ];
}

function rawWishlistRows() {
  return [
    { AlbumID: "S-2021-AL-02", SlotCoinID: "C-1916-D-10C-01" }
  ];
}

// DB_Coins rows for the key-date star badge join. The 1909-S VDB slot
// (C-1909-S-1C-02) is a confirmed real-style "Semi-Key Date" value; every
// other slot's CoinID either has no matching row here at all, or a row
// with a blank KeyDate — both must resolve to keyDate:false.
function rawDbCoinsRows() {
  return [
    { CoinID: "C-1909-S-1C-02", KeyDate: "Semi-Key Date" },
    { CoinID: "C-1909--1C-01", KeyDate: "" },
    { CoinID: "C-1916-D-10C-01", KeyDate: "" }
  ];
}

module.exports = defineSuite("albums-live-data", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ---------- A. denomFromCoinId() — both real and mock mint-segment conventions ----------
  const A = await page.evaluate(() => ({
    mockNoMint: denomFromCoinId("C-1909-M-1C-01"),      // FAKE_ALBUMS' own "-M-" placeholder
    realBlankMint: denomFromCoinId("C-1909--1C-03"),    // real workbook's double-dash
    realMintPresent: denomFromCoinId("C-1916-D-10C-01"),
    dollarDenom: denomFromCoinId("C-1878-M-$1-01"),
    malformed: denomFromCoinId("garbage"),
    blank: denomFromCoinId(""),
    nully: denomFromCoinId(null)
  }));
  ok(A.mockNoMint === "1C", "A1 mock's own \"-M-\" convention still yields the correct denom segment");
  ok(A.realBlankMint === "1C", "A2 the real double-dash (blank mint) convention yields the same denom segment — CRITICAL gotcha, both conventions parse identically");
  ok(A.realMintPresent === "10C", "A3 a real populated mint segment doesn't shift the denom segment's position");
  ok(A.dollarDenom === "$1", "A4 a $-prefixed denom code (no internal dash) parses correctly");
  ok(A.malformed === "" && A.blank === "" && A.nully === "", "A5 malformed/blank/null input degrades to \"\" rather than throwing");

  // ---------- B. buildLiveAlbums() — full mapping from synthetic raw rows ----------
  const B = await page.evaluate(({ albumRows, dbSetsRows, wishlistRows }) => {
    const albums = buildLiveAlbums(albumRows, dbSetsRows, wishlistRows);
    return {
      count: albums.length,
      names: albums.map(a => a.name),
      lincoln: albums.find(a => a.setId === "S-2020-AL-01"),
      mercury: albums.find(a => a.setId === "S-2021-AL-02"),
      orphanIncluded: albums.some(a => a.setId === "S-2019-AL-03"),
      proofSetIncluded: albums.some(a => a.setId === "S-2021-PR-01")
    };
  }, { albumRows: rawAlbumRows(), dbSetsRows: rawDbSetsRows(), wishlistRows: rawWishlistRows() });
  ok(B.count === 2, "B1 exactly 2 live albums built (the two AL rows with real slot data) — " + B.count);
  ok(!B.orphanIncluded, "B2 an AL-pattern DB_Sets row with zero matching Albums-sheet rows is skipped, not rendered with a NaN fill percentage");
  ok(!B.proofSetIncluded, "B3 a non-Album DB_Sets row (Lineage=\"Proof Set\") never leaks into LIVE_ALBUMS via a loose SetID match");
  ok(!!B.lincoln, "B4 the Lincoln Cents AL row produced a live album entry");
  ok(B.lincoln && B.lincoln.name === "Lincoln Cents — LIVE TEST Folder", "B5 name comes from DB_Sets.Description");
  ok(B.lincoln && B.lincoln.denom === "1C", "B6 denom derived from the first slot's CoinID segment, not DB_Sets.FaceValue (which this row doesn't even carry)");
  ok(B.lincoln && B.lincoln.icon === "🪙", "B7 icon defaults to the generic placeholder");
  ok(B.lincoln && B.lincoln.folderStyle === "littleton", "B8 folderStyle defaults to littleton regardless of MfgProductID");
  ok(B.lincoln && B.lincoln.mfgProductId === "LCF18", "B9 mfgProductId pulled from DB_Sets.MfgProductID");
  ok(B.lincoln && B.lincoln.containerName === "Shelf B", "B10 containerName pulled from DB_Sets.ContainerName (extended mapWorkbookRowToDbSet())");
  ok(B.lincoln && B.lincoln.coinsCount === 8, "B11 coinsCount pulled from DB_Sets.Coins as a real number");
  ok(B.lincoln && B.lincoln.history === "", "B12 history is now wired from DB_Sets.History (see block P) — this fixture row has no History cell, so it maps to \"\", not undefined, and falls through to renderAlbumPageContent()'s existing fallback text");
  ok(B.lincoln && B.lincoln.slots.length === 3, "B13 Lincoln Cents got all 3 of its Albums-sheet rows as slots");
  ok(B.mercury && B.mercury.denom === "10C", "B14 Mercury Dimes' denom derived correctly from its own slot");

  // ---------- C. slot shape + the "want" flag ----------
  const C = await page.evaluate(({ albumRows, dbSetsRows, wishlistRows }) => {
    const albums = buildLiveAlbums(albumRows, dbSetsRows, wishlistRows);
    const lincoln = albums.find(a => a.setId === "S-2020-AL-01");
    const mercury = albums.find(a => a.setId === "S-2021-AL-02");
    const filled = lincoln.slots.find(s => s.coinId === "C-1909--1C-01");
    const filledVdb = lincoln.slots.find(s => s.coinId === "C-1909-S-1C-02");
    const open = lincoln.slots.find(s => s.coinId === "C-1910--1C-01");
    const wanted = mercury.slots.find(s => s.coinId === "C-1916-D-10C-01");
    return { filled, filledVdb, open, wanted };
  }, { albumRows: rawAlbumRows(), dbSetsRows: rawDbSetsRows(), wishlistRows: rawWishlistRows() });
  ok(C.filled && C.filled.filledBy === "AY-90004", "C1 a filled slot's filledBy is the real CollectionID string");
  ok(C.open && C.open.filledBy === null, "C2 an open slot's filledBy is null, not \"\" — matches FAKE_ALBUMS' own convention");
  ok(C.filledVdb && C.filledVdb.mintMark === "S" && C.filledVdb.variety === "VDB", "C3 mintMark/variety come straight from their own real columns, never parsed out of CoinID");
  ok("variety" in C.open, "C4 every mapped slot carries a real `variety` key (even blank) so slotDescription()/slotVariety() never fall back to the legacy comma-split convention");
  ok(C.open && C.open.want === false, "C5 an open slot with no Wishlist match has want:false");
  ok(C.wanted && C.wanted.want === true, "C6 an open slot whose AlbumID+CoinID matches a real Wishlist row has want:true");
  ok(C.filled && C.filled.want === false, "C7 a FILLED slot never reports want:true even if something coincidentally matched (filledBy gates it)");

  // ---------- D. activeAlbums() fallback / live override ----------
  const D = await page.evaluate(({ albumRows, dbSetsRows, wishlistRows }) => {
    __setLiveAlbumsForTest(null);
    const demoCount = activeAlbums().length;
    const demoIsFake = activeAlbums() === FAKE_ALBUMS;
    const live = buildLiveAlbums(albumRows, dbSetsRows, wishlistRows);
    __setLiveAlbumsForTest(live);
    const liveCount = activeAlbums().length;
    __setLiveAlbumsForTest(null);
    const restoredCount = activeAlbums().length;
    return { demoCount, demoIsFake, liveCount, restoredCount };
  }, { albumRows: rawAlbumRows(), dbSetsRows: rawDbSetsRows(), wishlistRows: rawWishlistRows() });
  ok(D.demoIsFake, "D1 activeAlbums() returns FAKE_ALBUMS itself when no live override is set");
  ok(D.liveCount === 2, "D2 activeAlbums() reflects the live override once set");
  ok(D.restoredCount === D.demoCount, "D3 clearing the override falls back to FAKE_ALBUMS again");

  // ---------- E. renderAlbumsList() reads activeAlbums() ----------
  const E = await page.evaluate(({ albumRows, dbSetsRows, wishlistRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, wishlistRows);
    __setLiveAlbumsForTest(live);
    navigate("albums");
    const cards = [...document.querySelectorAll("#albumsListContainer .album-card-name")].map(el => el.textContent);
    const progress = [...document.querySelectorAll("#albumsListContainer .album-card-progress")].map(el => el.textContent);
    __setLiveAlbumsForTest(null);
    return { cards, progress };
  }, { albumRows: rawAlbumRows(), dbSetsRows: rawDbSetsRows(), wishlistRows: rawWishlistRows() });
  ok(E.cards.includes("Lincoln Cents — LIVE TEST Folder"), "E1 the live album's real name renders in the Albums list, not a FAKE_ALBUMS demo name");
  ok(E.progress.includes("2 / 3 filled"), "E2 the fill count comes from the live slots' own filledBy data");

  // ---------- F. populateAssignAlbumOptions() reads activeAlbums(), refreshed on fetch-landing ----------
  const F = await page.evaluate(({ albumRows, dbSetsRows, wishlistRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, wishlistRows);
    __setLiveAlbumsForTest(live);
    populateAssignAlbumOptions();
    const select = document.getElementById("assignAlbum");
    const values = [...select.options].map(o => o.value);
    const placeholderStillFirst = select.options[0].value === "";
    __setLiveAlbumsForTest(null);
    populateAssignAlbumOptions(); // restore demo options so later suites aren't affected
    return { values, placeholderStillFirst };
  }, { albumRows: rawAlbumRows(), dbSetsRows: rawDbSetsRows(), wishlistRows: rawWishlistRows() });
  ok(F.values.some(v => v.startsWith("Lincoln Cents — LIVE TEST Folder :: C-1910--1C-01")), "F1 the Assign-to-Album dropdown offers the live album's real open slot");
  ok(!F.values.some(v => v.startsWith("Lincoln Cents — LIVE TEST Folder :: C-1909--1C-01")), "F2 a FILLED live slot is never offered as assignable");
  ok(F.placeholderStillFirst, "F3 the static \"— not part of an album —\" placeholder option survives a repopulate");

  // ---------- G. the whole book-rendering chain (showAlbumDetail/openAlbumAtPage/buildAlbumPages/renderAlbumBook) ----------
  const G = await page.evaluate(async ({ albumRows, dbSetsRows, wishlistRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, wishlistRows);
    __setLiveAlbumsForTest(live);
    // A live DB_Coins row so slotMintage() (also swapped to activeDbCoins()
    // this pass) has something real to resolve against.
    __setLiveDbCoinsForTest([
      { coinId: "C-1909--1C-01", mintage: 72700420 }
    ]);
    navigate("albums");
    const index = live.findIndex(a => a.setId === "S-2020-AL-01");
    // showAlbumDetail() now returns a Promise (Part 2, image-prefetch gate)
    // that resolves once the book is actually rendered — await it rather
    // than reading DOM state that's mid-loading-spinner.
    await showAlbumDetail(index);
    const cover = document.querySelector("#albumsDetailContainer .album-page-cover h3");
    // Turn forward twice: cover -> history -> first coins page (obverse).
    document.getElementById("albumPageNextBtn").click();
    document.getElementById("albumPageNextBtn").click();
    const labels = [...document.querySelectorAll("#albumsDetailContainer .slot-label")].map(el => el.textContent);
    const mintageLine = document.querySelector("#albumsDetailContainer .slot-mintage");
    __setLiveDbCoinsForTest(null);
    __setLiveAlbumsForTest(null);
    return { coverName: cover && cover.textContent, labels, mintage: mintageLine && mintageLine.textContent };
  }, { albumRows: rawAlbumRows(), dbSetsRows: rawDbSetsRows(), wishlistRows: rawWishlistRows() });
  ok(G.coverName === "Lincoln Cents — LIVE TEST Folder", "G1 the book's cover shows the live album's real name");
  ok(G.labels.some(l => l === "1909"), "G2 a slot's rendered label comes from the live slot's own year/mintMark");
  ok(G.mintage === "Mintage 72,700,420", "G3 slotMintage() now resolves through activeDbCoins() — a live catalog row's mintage renders for a live album slot");

  // ---------- H. tapping a FILLED slot resolves via activeCoins(), not FAKE_COINS ----------
  const H = await page.evaluate(async ({ albumRows, dbSetsRows, wishlistRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, wishlistRows);
    __setLiveAlbumsForTest(live);
    // Full FAKE_COINS-shaped fixture (not a minimal stub) — navigate("browse")
    // renders the Catalog grid for whatever activeCoins() returns, and a
    // sparse coin object crashes real render code (e.g. formatting a missing
    // value/cost) that has nothing to do with Albums itself.
    __setLiveCoinsForTest([
      { id: "AY-90004", name: "Lincoln Wheat Cent — live", denom: "1C", year: 1909, mint: "",
        grade: "F-12", value: 650, cost: 500, category: "", rollId: "", gradeSource: "", serNo: "",
        designation: "", storageLocation: "", container: "", variety: "" }
    ]);
    navigate("albums");
    const index = live.findIndex(a => a.setId === "S-2020-AL-01");
    await showAlbumDetail(index);
    document.getElementById("albumPageNextBtn").click();
    document.getElementById("albumPageNextBtn").click();
    const filledCell = document.querySelector('#albumsDetailContainer .slot-cell[data-coin-id="C-1909--1C-01"]');
    filledCell.click();
    const activeViewId = document.querySelector(".view.active").id;
    const openedCoinId = currentBrowseCoin && currentBrowseCoin.id;
    __setLiveCoinsForTest(null);
    __setLiveAlbumsForTest(null);
    return { activeViewId, openedCoinId };
  }, { albumRows: rawAlbumRows(), dbSetsRows: rawDbSetsRows(), wishlistRows: rawWishlistRows() });
  ok(H.activeViewId === "view-browse", "H1 tapping a live album's filled slot navigates to Browse detail");
  ok(H.openedCoinId === "AY-90004", "H2 the coin resolved is the LIVE coin (activeCoins()) — with the old FAKE_COINS-only lookup this CollectionID wouldn't exist there at all");

  // ---------- I. tapping an OPEN slot prefills Add Coin from the live album's own data ----------
  const I = await page.evaluate(async ({ albumRows, dbSetsRows, wishlistRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, wishlistRows);
    __setLiveAlbumsForTest(live);
    navigate("albums");
    const index = live.findIndex(a => a.setId === "S-2021-AL-02"); // Mercury Dimes, denom 10C
    await showAlbumDetail(index);
    document.getElementById("albumPageNextBtn").click();
    document.getElementById("albumPageNextBtn").click();
    const openCell = document.querySelector('#albumsDetailContainer .slot-cell[data-coin-id="C-1916-D-10C-01"]');
    openCell.click();
    const denomValue = document.getElementById("denomination").value;
    const yearValue = document.getElementById("year").value;
    const mintValue = document.getElementById("mintMark").value;
    __setLiveAlbumsForTest(null);
    return { denomValue, yearValue, mintValue };
  }, { albumRows: rawAlbumRows(), dbSetsRows: rawDbSetsRows(), wishlistRows: rawWishlistRows() });
  ok(I.denomValue === "10C", "I1 Add Coin's Denomination prefills from the live album's own derived denom (10C, Mercury Dimes) — not some other album's/FAKE_ALBUMS' value");
  ok(I.yearValue === "1916" && I.mintValue === "D", "I2 Year/MintMark prefill from the tapped live slot's own real columns");

  // ---------- J. resolveCoinAlbumLink() reads activeAlbums() ----------
  const J = await page.evaluate(({ albumRows, dbSetsRows, wishlistRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, wishlistRows);
    __setLiveAlbumsForTest(live);
    const link = resolveCoinAlbumLink({ id: "AY-90099" }); // the VDB Lincoln slot's filledBy
    __setLiveAlbumsForTest(null);
    return link && { albumName: link.albumName, slotYear: link.slot.year, slotMint: link.slot.mintMark };
  }, { albumRows: rawAlbumRows(), dbSetsRows: rawDbSetsRows(), wishlistRows: rawWishlistRows() });
  ok(J && J.albumName === "Lincoln Cents — LIVE TEST Folder", "J1 resolveCoinAlbumLink() finds a live coin's album via activeAlbums()");
  ok(J && J.slotYear === 1909 && J.slotMint === "S", "J2 the matched slot's own real data (year/mint) is returned for the linkage chip's sub-line");

  // ---------- K. mapWorkbookRowToDbSet() extension is harmless for non-Album rows too ----------
  const K = await page.evaluate(() => {
    const mapped = mapWorkbookRowToDbSet({ SetID: "S-2021-PR-01", Description: "2021 United States Proof Set", Lineage: "Proof Set", MfgProductID: "", ContainerName: "", Coins: "" });
    return { lineage: mapped.lineage, mfgProductId: mapped.mfgProductId, coinsCount: mapped.coinsCount };
  });
  ok(K.lineage === "Proof Set", "K1 an ordinary (non-Album) DB_Sets row still maps its existing fields correctly");
  ok(K.mfgProductId === "", "K2 a blank MfgProductID maps to \"\", not undefined/null");
  ok(K.coinsCount === null, "K3 a blank Coins cell maps to null, not NaN or 0");

  // ---------- L. navigate(\"albums\") primes the live fetch; showAlbumsList() re-renders fresh ----------
  const L = await page.evaluate(({ albumRows, dbSetsRows, wishlistRows }) => {
    let called = 0;
    const orig = window.ensureLiveNavDataFetch;
    window.ensureLiveNavDataFetch = function () { called++; return Promise.resolve(false); };
    navigate("albums");
    window.ensureLiveNavDataFetch = orig;

    // showAlbumsList() itself re-renders on every call — simulate a fetch
    // landing "earlier" (e.g. from a prior Catalog visit) by setting the
    // live override AFTER init, then re-entering the Albums list purely via
    // showAlbumsList() (not navigate(), so this isolates the render call
    // from the fetch-priming call above).
    const live = buildLiveAlbums(albumRows, dbSetsRows, wishlistRows);
    __setLiveAlbumsForTest(live);
    showAlbumsList();
    const namesAfter = [...document.querySelectorAll("#albumsListContainer .album-card-name")].map(el => el.textContent);
    __setLiveAlbumsForTest(null);
    return { called, namesAfter };
  }, { albumRows: rawAlbumRows(), dbSetsRows: rawDbSetsRows(), wishlistRows: rawWishlistRows() });
  ok(L.called === 1, "L1 navigate(\"albums\") calls ensureLiveNavDataFetch() — it had no such call before this feature, so Albums never even attempted a live read");
  ok(L.namesAfter.includes("Lincoln Cents — LIVE TEST Folder"), "L2 showAlbumsList() renders the list fresh on every entry, so a fetch that resolved during an earlier visit elsewhere is reflected immediately, not just the next time this fetch itself resolves");

  // ---------- M. negative controls ----------
  // M1: reverting renderAlbumsList() to read FAKE_ALBUMS directly must NOT
  // show the live album name — proves E1 exercises the real fix.
  const NEG_M1 = await page.evaluate(({ albumRows, dbSetsRows, wishlistRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, wishlistRows);
    __setLiveAlbumsForTest(live);
    const orig = window.renderAlbumsList;
    window.renderAlbumsList = function () {
      const listContainer = document.getElementById("albumsListContainer");
      listContainer.innerHTML = "";
      FAKE_ALBUMS.forEach((album) => {
        const card = document.createElement("div");
        card.className = "case album-card";
        card.innerHTML = `<div class="album-card-name">${album.name}</div>`;
        listContainer.appendChild(card);
      });
    };
    navigate("albums");
    const cards = [...document.querySelectorAll("#albumsListContainer .album-card-name")].map(el => el.textContent);
    window.renderAlbumsList = orig;
    __setLiveAlbumsForTest(null);
    navigate("albums");
    return { cards };
  }, { albumRows: rawAlbumRows(), dbSetsRows: rawDbSetsRows(), wishlistRows: rawWishlistRows() });
  ok(!NEG_M1.cards.includes("Lincoln Cents — LIVE TEST Folder"), "M1 negative control: a FAKE_ALBUMS-reading renderAlbumsList() does NOT show the live album — confirms E1 isn't a coincidental pass");

  // M2: reverting the filled-slot click handler's coin lookup to FAKE_COINS
  // must fail to resolve a live-only CollectionID — proves H2 exercises the
  // real fix (this is exactly the bug this task's own book-rendering-chain
  // swap prevents).
  const NEG_M2 = await page.evaluate(({ albumRows, dbSetsRows, wishlistRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, wishlistRows);
    const liveCoin = { id: "AY-90004", denom: "1C", year: 1909, mint: "", name: "Lincoln Wheat Cent — live" };
    const slot = live.find(a => a.setId === "S-2020-AL-01").slots.find(s => s.coinId === "C-1909--1C-01");
    // Reproduce the pre-fix lookup directly rather than the real click path,
    // since FAKE_COINS.find() would throw on the live slot's own filledBy
    // if it genuinely doesn't exist there — that thrown state IS the bug.
    const foundInFake = FAKE_COINS.find(c => c.id === slot.filledBy);
    return { foundInFake: !!foundInFake, liveCoinId: liveCoin.id };
  }, { albumRows: rawAlbumRows(), dbSetsRows: rawDbSetsRows(), wishlistRows: rawWishlistRows() });
  ok(!NEG_M2.foundInFake, "M2 negative control: the live coin's CollectionID (AY-90004) genuinely does not resolve against FAKE_COINS — confirms H2's activeCoins() swap is load-bearing, not incidental");

  // ---------- O. key-date star badge, wired to real DB_Coins.KeyDate ----------
  const O = await page.evaluate(() => ({
    keyDateFull: buildAlbumKeyDateIndex([{ CoinID: "C-1", KeyDate: "Key Date" }]).has("C-1"),
    semiKeyDate: buildAlbumKeyDateIndex([{ CoinID: "C-2", KeyDate: "Semi-Key Date" }]).has("C-2"),
    semiKeyShort: buildAlbumKeyDateIndex([{ CoinID: "C-3", KeyDate: "Semi-Key" }]).has("C-3"),
    keyUpper: buildAlbumKeyDateIndex([{ CoinID: "C-4", KeyDate: "KEY" }]).has("C-4"),
    blank: buildAlbumKeyDateIndex([{ CoinID: "C-5", KeyDate: "" }]).has("C-5"),
    missingColumn: buildAlbumKeyDateIndex([{ CoinID: "C-6" }]).has("C-6"),
    whitespaceOnly: buildAlbumKeyDateIndex([{ CoinID: "C-7", KeyDate: "   " }]).has("C-7"),
    noCoinsAtAll: buildAlbumKeyDateIndex(null).size,
    noRowsMatchingIrrelevant: buildAlbumKeyDateIndex([{ CoinID: "C-1", KeyDate: "Key Date" }]).has("C-999")
  }));
  ok(O.keyDateFull, "O1 \"Key Date\" is truthy");
  ok(O.semiKeyDate, "O2 \"Semi-Key Date\" is truthy");
  ok(O.semiKeyShort, "O3 \"Semi-Key\" is truthy");
  ok(O.keyUpper, "O4 \"KEY\" is truthy");
  ok(!O.blank, "O5 a blank KeyDate cell is not key-date-ish");
  ok(!O.missingColumn, "O6 a row missing the KeyDate column entirely doesn't throw and is not key-date-ish");
  ok(!O.whitespaceOnly, "O7 a whitespace-only cell is treated as blank (trimmed)");
  ok(O.noCoinsAtAll === 0, "O8 a null dbCoinsRows array degrades to an empty index, not a throw");
  ok(!O.noRowsMatchingIrrelevant, "O9 a CoinID with no matching row is not key-date-ish");

  const O2 = await page.evaluate(({ albumRows, dbSetsRows, wishlistRows, dbCoinsRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, wishlistRows, dbCoinsRows);
    const lincoln = live.find(a => a.setId === "S-2020-AL-01");
    const keyDateSlot = lincoln.slots.find(s => s.coinId === "C-1909-S-1C-02"); // the VDB — Semi-Key Date
    const plainSlot = lincoln.slots.find(s => s.coinId === "C-1909--1C-01");    // matched row, blank KeyDate
    const noMatchSlot = lincoln.slots.find(s => s.coinId === "C-1910--1C-01");  // no DB_Coins row at all
    return { keyDate: keyDateSlot.keyDate, plain: plainSlot.keyDate, noMatch: noMatchSlot.keyDate };
  }, { albumRows: rawAlbumRows(), dbSetsRows: rawDbSetsRows(), wishlistRows: rawWishlistRows(), dbCoinsRows: rawDbCoinsRows() });
  ok(O2.keyDate === true, "O10 buildLiveAlbums() end-to-end: the Semi-Key Date coin's slot gets keyDate:true");
  ok(O2.plain === false, "O11 a slot with a matched DB_Coins row but a blank KeyDate cell gets keyDate:false, not true from mere presence in the index-building rows");
  ok(O2.noMatch === false, "O12 a slot whose CoinID has no DB_Coins row at all gets keyDate:false, not undefined/throw");

  // Real render check — the badge/`.key-date` class mechanism already
  // existed (built for FAKE_ALBUMS' own hand-set flags) and needed no CSS
  // change; this confirms it genuinely lights up for a live slot fed real
  // data, not just that the data field is set correctly in isolation.
  const O3 = await page.evaluate(async ({ albumRows, dbSetsRows, wishlistRows, dbCoinsRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, wishlistRows, dbCoinsRows);
    __setLiveAlbumsForTest(live);
    navigate("albums");
    const index = live.findIndex(a => a.setId === "S-2020-AL-01");
    await showAlbumDetail(index);
    document.getElementById("albumPageNextBtn").click();
    document.getElementById("albumPageNextBtn").click();
    const keyDateCell = document.querySelector('#albumsDetailContainer .slot-cell[data-coin-id="C-1909-S-1C-02"]');
    const plainCell = document.querySelector('#albumsDetailContainer .slot-cell[data-coin-id="C-1909--1C-01"]');
    const result = {
      keyDateHasClass: keyDateCell.classList.contains("key-date"),
      keyDateHasBadge: !!keyDateCell.querySelector(".key-date-badge"),
      plainHasClass: plainCell.classList.contains("key-date"),
      plainHasBadge: !!plainCell.querySelector(".key-date-badge")
    };
    __setLiveAlbumsForTest(null);
    return result;
  }, { albumRows: rawAlbumRows(), dbSetsRows: rawDbSetsRows(), wishlistRows: rawWishlistRows(), dbCoinsRows: rawDbCoinsRows() });
  ok(O3.keyDateHasClass && O3.keyDateHasBadge, "O13 a live key-date slot renders the existing .key-date class + ★ badge — the pre-built mechanism lights up for real data");
  ok(!O3.plainHasClass && !O3.plainHasBadge, "O14 an ordinary live slot gets neither, confirming O13 isn't just always-on");

  // Negative control against the REAL app code: revert groupAlbumSlotsByAlbumId()
  // to not set keyDate at all and confirm the badge disappears — proves
  // O13/O10 exercise the real wiring, not a coincidence of the fixture.
  const NEG_O = await page.evaluate(({ albumRows, dbSetsRows, wishlistRows, dbCoinsRows }) => {
    const orig = window.groupAlbumSlotsByAlbumId;
    window.groupAlbumSlotsByAlbumId = function (rows, wantIndex) {
      const byAlbumId = {};
      (rows || []).forEach(row => {
        const albumId = String(colVal(row, "AlbumID"));
        if (!albumId) return;
        const coinId = String(colVal(row, "CoinID"));
        const filledByRaw = colVal(row, "FilledBy");
        const filledBy = filledByRaw ? String(filledByRaw) : null;
        const slot = { year: colVal(row, "Year"), mintMark: String(colVal(row, "MintMark")),
          description: String(colVal(row, "Description")), variety: String(colVal(row, "Variety")),
          coinId, filledBy, want: false }; // no keyDate key at all — the pre-fix shape
        (byAlbumId[albumId] || (byAlbumId[albumId] = [])).push(slot);
      });
      return byAlbumId;
    };
    const live = buildLiveAlbums(albumRows, dbSetsRows, wishlistRows, dbCoinsRows);
    window.groupAlbumSlotsByAlbumId = orig;
    const lincoln = live.find(a => a.setId === "S-2020-AL-01");
    const keyDateSlot = lincoln.slots.find(s => s.coinId === "C-1909-S-1C-02");
    return { keyDate: keyDateSlot.keyDate };
  }, { albumRows: rawAlbumRows(), dbSetsRows: rawDbSetsRows(), wishlistRows: rawWishlistRows(), dbCoinsRows: rawDbCoinsRows() });
  ok(!NEG_O.keyDate, "O15 negative control: reverting groupAlbumSlotsByAlbumId() to not set keyDate reproduces the pre-fix (undefined/falsy) state — confirms O10 isn't a coincidental pass");

  // ---------- P. DB_Sets.History wired to the album history page ----------
  const P = await page.evaluate(({ albumRows, dbSetsRows, wishlistRows }) => {
    const dbSetsWithHistory = dbSetsRows.map(r =>
      r.SetID === "S-2020-AL-01"
        ? { ...r, History: "Introduced in 1909, the Lincoln cent was the first US coin to feature a real person." }
        : r
    ); // S-2021-AL-02 deliberately left with no History cell — must fall back
    const live = buildLiveAlbums(albumRows, dbSetsWithHistory, wishlistRows);
    const lincoln = live.find(a => a.setId === "S-2020-AL-01");
    const mercury = live.find(a => a.setId === "S-2021-AL-02");

    // mapWorkbookRowToDbSet() in isolation, both populated and blank.
    const mappedWith = mapWorkbookRowToDbSet({ SetID: "S-1909-AL-01", History: "Real blurb text." });
    const mappedBlank = mapWorkbookRowToDbSet({ SetID: "S-1916-AL-01" });

    // Render the actual history PAGE content for both albums, through the
    // real renderAlbumPageContent() the book uses — not just the mapped
    // field — so this proves the real fallback text still renders for the
    // no-History album via the unmodified rendering path.
    const historyPage = { type: "history" };
    const lincolnHtml = renderAlbumPageContent(historyPage, lincoln, false);
    const mercuryHtml = renderAlbumPageContent(historyPage, mercury, false);

    return {
      lincolnHistory: lincoln.history,
      mercuryHistory: mercury.history,
      mappedWith: mappedWith.history,
      mappedBlank: mappedBlank.history,
      lincolnHtml, mercuryHtml
    };
  }, { albumRows: rawAlbumRows(), dbSetsRows: rawDbSetsRows(), wishlistRows: rawWishlistRows() });
  ok(P.mappedWith === "Real blurb text.", "P1 mapWorkbookRowToDbSet() reads a populated History cell verbatim");
  ok(P.mappedBlank === "", "P2 a row with no History column at all maps to \"\", not undefined — falls through to the fallback rather than throwing");
  ok(P.lincolnHistory === "Introduced in 1909, the Lincoln cent was the first US coin to feature a real person.", "P3 buildLiveAlbums() carries a populated DB_Sets.History through onto album.history");
  ok(P.mercuryHistory === "", "P4 an album with no History cell gets \"\" (falsy), not a fabricated value");
  ok(P.lincolnHtml.includes("Introduced in 1909, the Lincoln cent was the first US coin"), "P5 the real history page renders the actual DB_Sets.History text for a populated album");
  ok(!P.lincolnHtml.includes("No history notes on file"), "P6 a populated album's history page does NOT show the fallback text");
  ok(P.mercuryHtml.includes("No history notes on file for this set yet."), "P7 an unpopulated album's history page still shows the existing fallback text unchanged");

  // Negative control: reverting buildLiveAlbums() to omit `history` entirely
  // (its pre-fix state) must reproduce the fallback for BOTH albums, even
  // the one with real History data — proving P3/P5 depend on the real wiring.
  const NEG_P = await page.evaluate(({ albumRows, dbSetsRows, wishlistRows }) => {
    const dbSetsWithHistory = dbSetsRows.map(r =>
      r.SetID === "S-2020-AL-01" ? { ...r, History: "Real blurb text that must NOT appear." } : r
    );
    const origBuild = window.buildLiveAlbums;
    window.buildLiveAlbums = function (albumRows, dbSetsRows, wishlistRows, dbCoinsRows) {
      const live = origBuild(albumRows, dbSetsRows, wishlistRows, dbCoinsRows);
      live.forEach(a => { delete a.history; }); // simulate the pre-fix "deliberately left unset" state
      return live;
    };
    const live = window.buildLiveAlbums(albumRows, dbSetsWithHistory, wishlistRows);
    const lincoln = live.find(a => a.setId === "S-2020-AL-01");
    const html = renderAlbumPageContent({ type: "history" }, lincoln, false);
    window.buildLiveAlbums = origBuild;
    return { html };
  }, { albumRows: rawAlbumRows(), dbSetsRows: rawDbSetsRows(), wishlistRows: rawWishlistRows() });
  ok(NEG_P.html.includes("No history notes on file for this set yet."), "P8 negative control: without wiring album.history, even a populated DB_Sets row shows the fallback — confirms P5 exercises the real fix");
  ok(!NEG_P.html.includes("Real blurb text"), "P9 negative control: the real History text is genuinely absent when the wiring is reverted");

  // ---------- Q. Albums list sort: Denomination (ALBUMS_DENOM_CODES order), then Year ----------
  // albumsDenomSortIndex()/albumYearSortValue()/compareAlbumsForList() in isolation.
  const Q1 = await page.evaluate(() => ({
    // ALBUMS_DENOM_CODES order is 1C,5C,10C,25C,50C,$1 — NOT alphabetical
    // ("$1" would sort before "10C" alphabetically; it must not here).
    order: ["1C", "5C", "10C", "25C", "50C", "$1"].map(d => albumsDenomSortIndex(d)),
    dollarBeforeDime: albumsDenomSortIndex("$1") > albumsDenomSortIndex("10C"),
    unknownSortsLast: albumsDenomSortIndex("Multiple") > albumsDenomSortIndex("$1"),
    blankYear: albumYearSortValue(""),
    nullYear: albumYearSortValue(null),
    numYear: albumYearSortValue(1916),
    stringNumYear: albumYearSortValue("1916")
  }));
  ok(JSON.stringify(Q1.order) === JSON.stringify([0, 1, 2, 3, 4, 5]), "Q1 albumsDenomSortIndex() follows ALBUMS_DENOM_CODES' own array order exactly");
  ok(Q1.dollarBeforeDime, "Q2 $1 (Dollars) sorts AFTER 10C (Dimes) — proves this is array-index order, not alphabetical (which would put \"$1\" first)");
  ok(Q1.unknownSortsLast, "Q3 an unrecognized/mixed denom (not one of the 6 named codes) sorts after every named denomination, not before (indexOf's own -1 would otherwise put it first)");
  ok(Q1.blankYear === Infinity && Q1.nullYear === Infinity, "Q4 a blank/null Year sorts to the end of its own denomination group rather than corrupting the sort with NaN");
  ok(Q1.numYear === 1916 && Q1.stringNumYear === 1916, "Q5 a numeric or numeric-string Year compares correctly either way");

  // The real end-to-end check: the exact 6 real albums named in the task,
  // fed in DELIBERATELY SCRAMBLED input order (never the expected output
  // order) so a passing assertion can only mean the sort actually ran, not
  // that insertion order happened to already match.
  function sixRealAlbumsFixture() {
    const defs = [
      { name: "Lincoln Wheat Cents 1909-1929",   setId: "S-1909-AL-01", denom: "1C",  year: 1909, coinId: "C-1909--1C-01" },
      { name: "Lincoln Cents 1930-1958",         setId: "S-1930-AL-01", denom: "1C",  year: 1930, coinId: "C-1930--1C-01" },
      { name: "Lincoln Memorial Cents 1959-1998",setId: "S-1959-AL-01", denom: "1C",  year: 1959, coinId: "C-1959--1C-01" },
      { name: "Lincoln Cents 1999-2025",         setId: "S-1999-AL-01", denom: "1C",  year: 1999, coinId: "C-1999--1C-01" },
      { name: "Mercury Dimes 1916-1945",         setId: "S-1916-AL-01", denom: "10C", year: 1916, coinId: "C-1916--10C-01" },
      { name: "Roosevelt Dimes 1946-1964",       setId: "S-1946-AL-01", denom: "10C", year: 1946, coinId: "C-1946--10C-01" }
    ];
    // Scrambled: neither the expected output order nor plain alphabetical.
    const scrambleOrder = [3, 0, 5, 1, 4, 2];
    const dbSetsRows = scrambleOrder.map(i => ({ SetID: defs[i].setId, Description: defs[i].name, Year: defs[i].year, Lineage: "" }));
    const albumRows = scrambleOrder.map(i => ({ AlbumID: defs[i].setId, Year: defs[i].year, MintMark: "", Variety: "", Description: defs[i].name, CoinID: defs[i].coinId, FilledBy: "" }));
    return { dbSetsRows, albumRows, defs };
  }
  const Q6 = await page.evaluate(({ dbSetsRows, albumRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, []);
    __setLiveAlbumsForTest(live);
    renderAlbumsList();
    const names = [...document.querySelectorAll("#albumsListContainer .album-card-name")].map(el => el.textContent);
    __setLiveAlbumsForTest(null);
    return { names };
  }, sixRealAlbumsFixture());
  const expectedOrder = [
    "Lincoln Wheat Cents 1909-1929", "Lincoln Cents 1930-1958", "Lincoln Memorial Cents 1959-1998",
    "Lincoln Cents 1999-2025", "Mercury Dimes 1916-1945", "Roosevelt Dimes 1946-1964"
  ];
  ok(JSON.stringify(Q6.names) === JSON.stringify(expectedOrder), "Q6 the exact real-album order from a scrambled input: all four 1C albums oldest-to-newest, then both 10C albums oldest-to-newest — got " + JSON.stringify(Q6.names));

  // The click handler must still open the CORRECT album after reordering —
  // the sorted list's 3rd rendered card ("Lincoln Memorial Cents 1959-1998")
  // is NOT activeAlbums()[2] in the scrambled input order, so this would
  // fail if renderAlbumsList() started using sorted-list position instead
  // of the original activeAlbums() index for its click handler.
  const Q7 = await page.evaluate(async ({ dbSetsRows, albumRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, []);
    __setLiveAlbumsForTest(live);
    renderAlbumsList();
    const cards = [...document.querySelectorAll("#albumsListContainer .album-card")];
    const targetCard = cards[2]; // "Lincoln Memorial Cents 1959-1998" per Q6's expected order
    // currentAlbumIndex is set synchronously at the very top of
    // openAlbumAtPage() (the click handler's own target), so it — and the
    // read right below — are already correct the instant .click() returns.
    // But the ACTUAL book render is now async (Part 2's image-prefetch
    // gate), so without waiting for it here, cleanup below
    // (__setLiveAlbumsForTest(null)) would run out from under that still-
    // pending render — a real page-error race, not a test artifact: the
    // delayed renderAlbumBook() call reads activeAlbums()[currentAlbumIndex]
    // AFTER the live override is gone, against a currentAlbumIndex (5) that
    // has no matching FAKE_ALBUMS entry. Waiting for the render to actually
    // settle first avoids that dangling async call entirely.
    targetCard.click();
    await new Promise(r => setTimeout(r, 100));
    const openedName = currentAlbumPages[0] ? currentAlbumIndex : null;
    const opened = activeAlbums()[currentAlbumIndex];
    showAlbumsList();
    __setLiveAlbumsForTest(null);
    return { openedName: opened && opened.name };
  }, sixRealAlbumsFixture());
  ok(Q7.openedName === "Lincoln Memorial Cents 1959-1998", "Q7 clicking the 3rd SORTED card opens the correct album (index preserved through the sort, not re-derived from sorted-list position) — got " + Q7.openedName);

  // FAKE_ALBUMS (flag-off / demo path) gets the identical sort mechanism —
  // Lincoln Cents (1C/1909), Jefferson Nickels (5C/1971), Morgan Dollars
  // ($1/1878) — same 1C-before-5C-before-$1 order even though $1's own
  // year (1878) is numerically the smallest of the three, proving Year is
  // only ever a secondary key.
  const Q8 = await page.evaluate(() => {
    __setLiveAlbumsForTest(null);
    renderAlbumsList();
    const names = [...document.querySelectorAll("#albumsListContainer .album-card-name")].map(el => el.textContent);
    return { names };
  });
  ok(Q8.names[0] === "Lincoln Cents — Whitman Folder Vol. 1", "Q8a FAKE_ALBUMS (flag-off) sorts 1C first");
  ok(Q8.names[1] === "Jefferson Nickels — Littleton Folder Vol. 3", "Q8b then 5C");
  ok(Q8.names[2] === "Morgan Dollars — Complete Date Set (P)", "Q8c then $1 LAST — despite 1878 being the smallest Year of the three, proving denom always wins over year");

  // Negative control: reverting renderAlbumsList() to its pre-fix
  // (unsorted, plain-iteration) body must reproduce the raw scrambled
  // input order rather than Q6's expected sorted order.
  const NEG_Q = await page.evaluate(({ dbSetsRows, albumRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, []);
    __setLiveAlbumsForTest(live);
    const listContainer = document.getElementById("albumsListContainer");
    listContainer.innerHTML = "";
    // The exact pre-fix body: plain forEach, no filter/sort.
    live.forEach((album, index) => {
      const card = document.createElement("div");
      card.className = "case album-card";
      card.innerHTML = `<div class="album-card-name">${album.name}</div>`;
      listContainer.appendChild(card);
    });
    const names = [...document.querySelectorAll("#albumsListContainer .album-card-name")].map(el => el.textContent);
    __setLiveAlbumsForTest(null);
    renderAlbumsList();
    return { names };
  }, sixRealAlbumsFixture());
  ok(NEG_Q.names[0] === "Lincoln Cents 1999-2025", "Q9 negative control: the pre-fix unsorted body reproduces the raw scrambled input order (first item = defs[3]) — confirms Q6 exercises the real sort, not a coincidence of fixture order");
  ok(JSON.stringify(NEG_Q.names) !== JSON.stringify(expectedOrder), "Q10 negative control: the unsorted order is genuinely different from the expected sorted order");

  // ---------- N. nav / overflow smoke ----------
  const N = await page.evaluate(() => {
    __setLiveAlbumsForTest(null);
    __setLiveCoinsForTest(null);
    __setLiveDbCoinsForTest(null);
    const routes = ["dashboard", "albums", "browse", "dashboard"];
    const bad = [];
    routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    navigate("dashboard");
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(N.bad.length === 0, "N1 every route still navigates cleanly: " + N.bad.join("; "));
  ok(N.overflow === false, "N2 no horizontal page overflow at 412px");
}, module);
