// Album "Best of" view (Ray, Oct 2026). VIEW ONLY: a checkbox on an open album
// shows, per slot, the best OWNED coin with the slot's CoinID instead of the
// coin physically in the album, with a marker (▲ better than the album's coin,
// ◆ fills a slot the album leaves empty). Nothing is written; slot objects and
// FilledBy are never changed.
//
// Rules: same CoinID only (Finish ignored); higher GradeNum wins; any GradeNum
// beats none; on equal GradeNum a third-party grade beats Owner/Seller/AI-est/
// blank (trimmed, case-insensitive); a full tie keeps the album's coin; ties
// among outside coins go to the lowest CollectionID; each coin used once per
// album; an exited album coin can be replaced; a mismatched-CoinID album coin
// stays the incumbent and is compared normally.

const { defineSuite } = require("./harness");

const DESKTOP = { width: 1440, height: 900 };

// coin(id, coinId, gradeNum, gradeSource, extra)
const coin = (id, coinId, gradeNum, gradeSource, extra) =>
  Object.assign({ id, coinId, gradeNum, gradeSource, status: "Owned", denom: "10C", year: 1916, mint: "", name: "Mercury Dime", value: 1 }, extra || {});

function fixtures() {
  const coins = [
    // s1: 1916-S — album AY-00716 (Owner 30) vs AY-00208 (PCGS MS-64): upgrade
    coin("AY-00716", "C-1916-S-10C-01", 30, "Owner"),
    coin("AY-00208", "C-1916-S-10C-01", 64, "PCGS"),
    // s2: full tie (40, both third-party) — album coin stays even though the outside id is lower
    coin("AY-00101", "C-1917--10C-02", 40, "PCGS"),
    coin("AY-00100", "C-1917--10C-02", 40, "NGC"),
    // s3: equal 45, outside is third-party (spelled " pcgs ") — upgrade
    coin("AY-00111", "C-1918--10C-03", 45, "Owner"),
    coin("AY-00112", "C-1918--10C-03", 45, " pcgs "),
    // s4: album 20 Owner vs outside ungraded PCGS — album stays
    coin("AY-00121", "C-1919--10C-04", 20, "Owner"),
    coin("AY-00122", "C-1919--10C-04", null, "PCGS", { grade: "Circulated" }),
    // s5: empty; outside ungraded and outside graded 12 — fill with the graded one
    coin("AY-00131", "C-1920--10C-05", null, "Owner"),
    coin("AY-00132", "C-1920--10C-05", 12, "Seller"),
    // s6: empty; only an ungraded coin — it fills
    coin("AY-00141", "C-1921--10C-06", null, ""),
    // s7: album coin Sold (66); an owned 10 replaces it
    coin("AY-00151", "C-1923--10C-07", 66, "PCGS", { status: "Sold" }),
    coin("AY-00152", "C-1923--10C-07", 10, "Owner"),
    // s8: album coin has a different CoinID (50); outside slot-CoinID coin 40 — album stays
    coin("AY-00161", "C-1924--10C-14", 50, "Owner"),
    coin("AY-00162", "C-1924--10C-08", 40, "PCGS", { finish: "Proof" }),
    // s9/s10: two slots share a CoinID, both empty; three owned coins 60/50/40
    coin("AY-00171", "C-1925--10C-09", 40, "PCGS"),
    coin("AY-00172", "C-1925--10C-09", 60, "PCGS"),
    coin("AY-00173", "C-1925--10C-09", 50, "PCGS"),
    // s11: album 10; two outside coins tie at 30 PCGS — lowest CollectionID wins
    coin("AY-00181", "C-1926--10C-11", 10, "Owner"),
    coin("AY-00900", "C-1926--10C-11", 30, "PCGS"),
    coin("AY-00899", "C-1926--10C-11", 30, "PCGS"),
    // s12: Finish differs from the album coin's — still a match
    coin("AY-00191", "C-1927--10C-12", 20, "Owner", { finish: "Business Strike" }),
    coin("AY-00192", "C-1927--10C-12", 25, "Owner", { finish: "Proof" }),
    // s13: AY-00201 is physically in ANOTHER album (B) — may still show here
    coin("AY-00201", "C-1928--10C-13", 63, "NGC"),
    // album B's other coin
    coin("AY-00301", "C-1999--1C-01", 60, "PCGS", { denom: "1C" })
  ];
  const slot = (setId, year, coinId, filledBy) => ({ Status: filledBy ? "Filled" : "Open", Year: year, MintMark: "", Variety: "",
    Description: "Mercury Dime", AlbumName: "x", AlbumID: setId, CoinID: coinId, FilledBy: filledBy || "" });
  const A = "S-1916-AL-01";
  const albumRows = [
    slot(A, 1916, "C-1916-S-10C-01", "AY-00716"),   // s1
    slot(A, 1917, "C-1917--10C-02", "AY-00101"),    // s2
    slot(A, 1918, "C-1918--10C-03", "AY-00111"),    // s3
    slot(A, 1919, "C-1919--10C-04", "AY-00121"),    // s4
    slot(A, 1920, "C-1920--10C-05", ""),            // s5
    slot(A, 1921, "C-1921--10C-06", ""),            // s6
    slot(A, 1922, "C-1922--10C-99", ""),            // nothing owned: stays empty
    slot(A, 1923, "C-1923--10C-07", "AY-00151"),    // s7
    slot(A, 1924, "C-1924--10C-08", "AY-00161"),    // s8 (mismatched CoinID incumbent)
    slot(A, 1924, "C-1924--10C-14", ""),            // s14: must NOT pull AY-00161 out of s8
    slot(A, 1925, "C-1925--10C-09", ""),            // s9
    slot(A, 1925, "C-1925--10C-09", ""),            // s10
    slot(A, 1926, "C-1926--10C-11", "AY-00181"),    // s11
    slot(A, 1927, "C-1927--10C-12", "AY-00191"),    // s12
    slot(A, 1928, "C-1928--10C-13", ""),            // s13
    slot("S-1999-AL-01", 1999, "C-1999--1C-01", "AY-00301"),
    slot("S-1999-AL-01", 1928, "C-1928--10C-13", "AY-00201")
  ];
  const dbSetsRows = [
    { SetID: A, Year: 1916, Description: "Mercury Dimes 1916-1945", MfgProductID: "", ContainerName: "Binder", Coins: 15, Lineage: "" },
    { SetID: "S-1999-AL-01", Year: 1999, Description: "Other Album", MfgProductID: "", ContainerName: "", Coins: 2, Lineage: "" }
  ];
  const dbCoinsRows = [{ CoinID: "C-1916-S-10C-01", KeyDate: "Key Date", Mintage: 10450000 }];
  return { coins, albumRows, dbSetsRows, dbCoinsRows };
}

module.exports = defineSuite("album-best-of", async ({ ok, openApp }) => {
  const page = await openApp(DESKTOP);

  await page.evaluate((fx) => {
    const splash = document.getElementById("splashScreen");
    if (splash) { splash.style.display = "none"; splash.style.pointerEvents = "none"; }
    // Photo loads: in-page stub, 50 ms, cached once landed; records which coin files were asked for.
    const TINY = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    window.__photoCache = {}; window.__photoAsked = [];
    const inflight = {};
    window.storedPhotoFilename = (c, side) => /^AY-/.test(c.id) ? c.id + "_" + side + ".jpg" : null;
    window.getCachedCoinPhotoUrl = n => window.__photoCache[n] || null;
    window.ensureCoinPhotoFetch = n => {
      window.__photoAsked.push(n);
      if (window.__photoCache[n]) return Promise.resolve(window.__photoCache[n]);
      if (!inflight[n]) inflight[n] = new Promise(r => setTimeout(() => { window.__photoCache[n] = TINY; delete inflight[n]; r(TINY); }, 50));
      return inflight[n];
    };
    // A write spy round the mock client: Best-of must never reach any of these.
    window.__writeCalls = [];
    const mock = createMockGraphClient({ sheets: {} });
    const WRITES = ["patchWorkbookRanges", "addTableRow", "uploadJson", "uploadFile", "uploadBytes", "putContent", "deleteItem"];
    __setGraphClientForTest(new Proxy(mock, { get(t, k) {
      const v = t[k];
      if (WRITES.includes(k)) return (...a) => { window.__writeCalls.push(k); return v.apply(t, a); };
      return typeof v === "function" ? v.bind(t) : v;
    } }));
    window.__fx = fx;
    window.__load = () => {
      __setLiveDataModeForTest("live");
      __setLiveCoinsForTest(fx.coins);
      __setLiveAlbumsForTest(buildLiveAlbums(fx.albumRows, fx.dbSetsRows, [], fx.dbCoinsRows));
      navigate("albums");
    };
    window.__mercury = () => activeAlbums().findIndex(a => a.setId === "S-1916-AL-01");
    window.__slotEl = (year, nth) => [...document.querySelectorAll("#albumsDetailContainer .album-page-coins")][0]
      .querySelectorAll(".slot-cell")[nth];
    window.__toFirstCoins = () => { document.getElementById("albumPageNextBtn").click(); }; // cover -> History + Obverse (instant)
    window.__label = () => (document.querySelector(".book-page-indicator") || {}).textContent || "";
    window.__toggle = (on) => { const b = document.getElementById("albumBestOfToggle"); b.checked = on; b.dispatchEvent(new Event("change")); };
    window.__load();
  }, fixtures());

  // ---------- A. the picking rules (pure) ----------
  const A = await page.evaluate(() => {
    const album = activeAlbums()[__mercury()];
    const map = computeAlbumBestOf(album, ownedCoins(), activeCoins());
    const at = i => { const a = map.get(album.slots[i]); return a ? a.id + ":" + a.kind : "keep"; };
    const other = activeAlbums().find(a => a.setId === "S-1999-AL-01");
    const otherMap = computeAlbumBestOf(other, ownedCoins(), activeCoins());
    const slotsBefore = JSON.stringify(album.slots);
    computeAlbumBestOf(album, ownedCoins(), activeCoins());
    return { r: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(at), otherSize: otherMap.size,
      untouched: JSON.stringify(album.slots) === slotsBefore };
  });
  ok(A.r[0] === "AY-00208:upgrade", `A1 1916-S: PCGS MS-64 AY-00208 replaces the album's AY-00716 (${A.r[0]})`);
  ok(A.r[1] === "keep", `A2 A FULL TIE KEEPS THE ALBUM'S COIN, even against a lower CollectionID (${A.r[1]})`);
  ok(A.r[2] === "AY-00112:upgrade", `A3 EQUAL GRADENUM: THIRD-PARTY BEATS OWNER, with " pcgs " matched trimmed and case-insensitive (${A.r[2]})`);
  ok(A.r[3] === "keep", `A4 AN UNGRADED COIN NEVER REPLACES A GRADED ONE, even third-party (${A.r[3]})`);
  ok(A.r[4] === "AY-00132:fill", `A5 an empty slot is filled, the graded coin beating the ungraded one (${A.r[4]})`);
  ok(A.r[5] === "AY-00141:fill" && A.r[6] === "keep", `A6 an ungraded coin fills when nothing graded competes; nothing owned leaves the slot empty (${A.r[5]}, ${A.r[6]})`);
  ok(A.r[7] === "AY-00152:upgrade", `A7 an EXITED album coin is replaced by any owned coin, even a lower grade (${A.r[7]})`);
  ok(A.r[8] === "keep" && A.r[9] === "keep",
    `A8 a mismatched-CoinID album coin stays and is compared normally, and is never pulled into the slot its own CoinID matches (${A.r[8]}, ${A.r[9]})`);
  ok(A.r[10] === "AY-00172:fill" && A.r[11] === "AY-00173:fill", `A9 two slots sharing a CoinID get the best two coins, each used once (${A.r[10]}, ${A.r[11]})`);
  ok(A.r[12] === "AY-00899:upgrade", `A10 outside coins that tie go to the lowest CollectionID (${A.r[12]})`);
  ok(A.r[13] === "AY-00192:upgrade", `A11 Finish is not part of the match (${A.r[13]})`);
  ok(A.r[14] === "AY-00201:fill" && A.otherSize === 0, `A12 a coin physically in another album may show here; that album is decided on its own (${A.r[14]}, other album changes ${A.otherSize})`);
  ok(A.untouched, "A13 computing Best-of never changes the slot objects");

  // ---------- B. rendering: off is unchanged, on swaps with markers ----------
  const B = await page.evaluate(async () => {
    await showAlbumDetail(__mercury());
    const boxOff = document.getElementById("albumBestOfToggle").checked;
    const coverOff = (document.querySelector(".cover-sub") || {}).textContent;
    __toFirstCoins();
    const offHtml = document.getElementById("albumsDetailContainer").innerHTML;
    const offMarkers = document.querySelectorAll(".best-of-badge, .best-of-upgrade, .best-of-fill").length;
    window.__photoAsked = [];
    __toggle(true);
    const s1 = __slotEl(1916, 0), s5 = __slotEl(1920, 4);
    const on = {
      s1Class: s1.className, s1Badge: (s1.querySelector(".best-of-badge") || {}).textContent,
      s5Class: s5.className, s5Badge: (s5.querySelector(".best-of-badge") || {}).textContent,
      s2Badge: !!__slotEl(1917, 1).querySelector(".best-of-badge"),
      s1Star: !!s1.querySelector(".key-date-badge"), s1Label: s1.querySelector(".slot-label").textContent,
      barShown: !document.getElementById("albumBestOfBar").classList.contains("hidden"),
      asked208: window.__photoAsked.some(n => n.startsWith("AY-00208_")),
      asked716: window.__photoAsked.some(n => n.startsWith("AY-00716_"))
    };
    __toggle(false);
    const offAgain = document.getElementById("albumsDetailContainer").innerHTML;
    // Cover count with Best-of on.
    __toggle(true);
    document.getElementById("albumPagePrevBtn").click(); // back to the cover (instant)
    const coverOn = (document.querySelector(".cover-sub") || {}).textContent;
    __toggle(false);
    return { boxOff, coverOff, coverOn, offMarkers, on, sameOff: offAgain === offHtml };
  });
  ok(B.boxOff === false, "B1 the checkbox starts off on open");
  ok(B.offMarkers === 0 && B.sameOff, "B2 WITH BEST-OF OFF THE BOOK RENDERS EXACTLY AS BEFORE (no markers; on then off returns identical HTML)");
  ok(/\bbest-of-upgrade\b/.test(B.on.s1Class) && B.on.s1Badge === "▲", `B3 the upgraded 1916-S slot carries the ▲ marker (${B.on.s1Class})`);
  ok(/\bbest-of-fill\b/.test(B.on.s5Class) && B.on.s5Badge === "◆" && !/\bwant\b/.test(B.on.s5Class),
    `B4 AN EMPTY SLOT FILLED BY BEST-OF HAS ITS OWN ◆ MARKER and is no longer an empty (Add Coin) slot (${B.on.s5Class})`);
  ok(!B.on.s2Badge, "B5 a slot that keeps the album's coin has no marker");
  ok(B.on.s1Star && /1916/.test(B.on.s1Label), "B6 the key-date star and label stay with the slot");
  ok(B.on.asked208 && !B.on.asked716, "B7 the photo shown is the best coin's (AY-00208's file asked for, not AY-00716's)");
  ok(B.on.barShown, "B8 the Best of checkbox shows in the top bar while a book is open");
  ok(B.coverOff === B.coverOn && /filled/.test(B.coverOn), `B9 THE COVER COUNT STAYS PHYSICAL (${B.coverOff} / ${B.coverOn})`);

  const B10 = await page.evaluate(async () => {
    showAlbumsList();
    const before = [...document.querySelectorAll("#albumsListContainer .album-card")].map(c => c.textContent).join("|");
    await showAlbumDetail(__mercury()); __toggle(true); showAlbumsList();
    const after = [...document.querySelectorAll("#albumsListContainer .album-card")].map(c => c.textContent).join("|");
    const barOnList = !document.getElementById("albumBestOfBar").classList.contains("hidden");
    await showAlbumDetail(__mercury());
    navigate("stats");
    const barElsewhere = !document.getElementById("albumBestOfBar").classList.contains("hidden");
    navigate("albums");
    return { same: before === after, barOnList, barElsewhere };
  });
  ok(B10.same, "B10 the album list card's count stays physical");
  ok(!B10.barOnList && !B10.barElsewhere, "B11 the checkbox is hidden on the album list and on other screens");

  // ---------- C. tap, step list, round trip ----------
  const C = await page.evaluate(async () => {
    await showAlbumDetail(__mercury()); __toFirstCoins(); __toggle(true);
    __slotEl(1916, 0).click();
    const opened = currentBrowseCoin && currentBrowseCoin.id;
    const steps = browseStepIds.slice();
    browseDetailBackHandler();
    await new Promise(r => setTimeout(r, 300));
    const backOn = document.getElementById("albumBestOfToggle").checked && albumBestOfOn;
    const backPage = __label();
    const backMarker = !!document.querySelector("#albumsDetailContainer .best-of-badge");
    __slotEl(1920, 4).click();
    const openedFill = currentBrowseCoin && currentBrowseCoin.id;
    browseDetailBackHandler();
    await new Promise(r => setTimeout(r, 300));
    showAlbumsList();
    await showAlbumDetail(__mercury());
    const fromList = document.getElementById("albumBestOfToggle").checked || albumBestOfOn;
    return { opened, openedFill, steps, backOn, backPage, backMarker, fromList };
  });
  ok(C.opened === "AY-00208", `C1 tapping the upgraded slot opens the coin it shows (${C.opened})`);
  ok(C.openedFill === "AY-00132", `C2 tapping a ◆ slot opens that coin, not Add Coin (${C.openedFill})`);
  ok(C.steps.includes("AY-00208") && !C.steps.includes("AY-00716") && C.steps.includes("AY-00132"),
    `C3 prev/next from the detail page walks the coins shown (${C.steps.slice(0, 6).join(",")}…)`);
  ok(C.backOn && C.backMarker && /^Page 2–3 /.test(C.backPage), `C4 Back from the detail page keeps Best-of on, on the same page (${C.backPage})`);
  ok(!C.fromList, "C5 opening the album from the list resets Best-of to off");

  // ---------- D. page turns ----------
  const D = await page.evaluate(async () => {
    await showAlbumDetail(__mercury()); __toFirstCoins();
    document.getElementById("albumPageNextBtn").click();      // 2-3 -> 4-5 starts animating
    await new Promise(r => setTimeout(r, 60));
    const turning = albumTurnInProgress;
    __toggle(true);                                            // during the turn
    const appliedMidTurn = albumBestOfOn;
    const stillTurning = albumTurnInProgress;
    await new Promise(r => setTimeout(r, 1200));
    const after = { label: __label(), on: albumBestOfOn, box: document.getElementById("albumBestOfToggle").checked, turning: albumTurnInProgress };
    document.getElementById("albumPagePrevBtn").click();
    await new Promise(r => setTimeout(r, 1200));
    const back = { label: __label(), turning: albumTurnInProgress, marker: !!document.querySelector("#albumsDetailContainer .best-of-badge") };
    return { turning, appliedMidTurn, stillTurning, after, back };
  });
  ok(D.turning && !D.appliedMidTurn && D.stillTurning, `D1 A TOGGLE DURING A TURN WAITS: the turn keeps running (applied ${D.appliedMidTurn}, turning ${D.stillTurning})`);
  ok(/^Page 4–5 /.test(D.after.label) && D.after.on && D.after.box && !D.after.turning,
    `D2 the turn completes and Best-of applies when it ends (${JSON.stringify(D.after)})`);
  ok(/^Page 2–3 /.test(D.back.label) && !D.back.turning && D.back.marker, `D3 SPREAD FLIP WORKS WITH BEST-OF ON, and the arrows still respond (${JSON.stringify(D.back)})`);

  // ---------- E. view only ----------
  ok((await page.evaluate(() => window.__writeCalls.length)) === 0, "E1 THE WRITE SPY RECORDED ZERO CALLS through everything above");
  const E2 = await page.evaluate(() => {
    const s = activeAlbums()[__mercury()].slots;
    return s[0].filledBy === "AY-00716" && s[4].filledBy === null && !ALL_WRITABLE_COLUMNS.includes("GradeNum");
  });
  ok(E2, "E2 FilledBy is unchanged on every slot, and GradeNum is on no write list");

  // ---------- F. GradeNum mapping ----------
  const F = await page.evaluate(() => [
    mapWorkbookRowToCoin({ CollectionID: "X", GradeNum: 64 }).gradeNum,
    mapWorkbookRowToCoin({ CollectionID: "X", GradeNum: "" }).gradeNum,
    mapWorkbookRowToCoin({ CollectionID: "X", GradeNum: "Circulated" }).gradeNum,
    mapWorkbookRowToCoin({ CollectionID: "X" }).gradeNum
  ]);
  ok(F[0] === 64 && F[1] === null && F[2] === null && F[3] === null, `F1 GradeNum maps as a number; blank, text or missing is ungraded (${JSON.stringify(F)})`);

  await page.evaluate(() => { __setLiveAlbumsForTest(null); __setLiveCoinsForTest(null); __setLiveDataModeForTest(null); __setGraphClientForTest(null); navigate("dashboard"); });
}, module);
