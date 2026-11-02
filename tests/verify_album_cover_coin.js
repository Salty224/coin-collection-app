// Albums list: random daily cover coin (card only). Display only: nothing is
// written. Sections:
//   A  candidate filter (owned, physically in the album, Photos-tab Obverse)
//   B  the pick: stable for a date, no Math.random, can change on another date
//   C  no candidate / demo mode keeps the generic icon
//   D  loading: icon first, lazy, max 4 in flight, one request per file,
//      cache reuse, full photo reuse, thumbnail URL only (no full size)
//   E  failure keeps the icon and retries on the next visit
//   F  late swap skipped when the card is gone
//   G  nothing wrote anything

const { defineSuite } = require("./harness");

module.exports = defineSuite("album-cover-coin", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp(PHONE);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // ---------- shared page-side helpers ----------------------------------
  await page.evaluate(() => {
    window.__coin = (id, extra) => Object.assign({ id, coinId: "C-X-" + id, status: "Owned", denom: "1C",
      year: 1909, mint: "", name: "Cent", value: 1, grade: "", gradeNum: null, gradeSource: "" }, extra || {});
    window.__slot = (setId, year, coinId, filledBy) => ({ Status: filledBy ? "Filled" : "Open", Year: year, MintMark: "",
      Variety: "", Description: "Lincoln Cent", AlbumName: "x", AlbumID: setId, CoinID: coinId, FilledBy: filledBy || "" });
    window.__photos = (map) => { const idx = {}; Object.keys(map).forEach((id, i) => {
      idx[id] = [{ photoId: "PH-" + i, photoType: "Obverse", galleryType: "obverse", subGroupId: "", filename: map[id], originalFilename: "", label: "" }]; });
      __setStoredPhotosForTest(idx); };
    window.__install = (coins, albumRows, dbSetsRows) => {
      __setLiveDataModeForTest("live");
      __setLiveCoinsForTest(coins);
      __setLiveAlbumsForTest(buildLiveAlbums(albumRows, dbSetsRows, [], []));
      navigate("albums"); // the Albums view must be on screen for layout and the observer
    };
    // Recording fetch stub for the CoinPhotos thumbnail GETs.
    window.__fx = { urls: [], files: [], inflight: 0, maxInflight: 0, mode: {}, holds: {}, writes: [] };
    const origFetch = window.fetch.bind(window);
    window.getWriteToken = async () => "tok";
    window.fetch = (url, opts) => {
      const u = String(url);
      if (opts && opts.method && opts.method !== "GET") window.__fx.writes.push(opts.method + " " + u);
      if (!u.includes("graph.microsoft.com") || !u.includes("CoinPhotos")) return origFetch(url, opts);
      const file = decodeURIComponent(u.split("CoinPhotos/")[1].split(":/")[0]);
      window.__fx.urls.push(u); window.__fx.files.push(file);
      window.__fx.inflight++; window.__fx.maxInflight = Math.max(window.__fx.maxInflight, window.__fx.inflight);
      const finish = () => { window.__fx.inflight--;
        return window.__fx.mode[file] === "fail"
          ? { ok: false, status: 500, blob: async () => new Blob([]) }
          : { ok: true, status: 200, blob: async () => new Blob(["x"], { type: "image/jpeg" }) }; };
      if (window.__fx.mode[file] === "hold" || window.__fx.mode["*"] === "hold") {
        return new Promise(res => { (window.__fx.holds[file] = window.__fx.holds[file] || []).push(() => res(finish())); });
      }
      return Promise.resolve(finish());
    };
    window.__release = () => { Object.keys(window.__fx.holds).forEach(f => { const q = window.__fx.holds[f]; delete window.__fx.holds[f]; q.forEach(fn => fn()); }); };
    __setAlbumCoverDateForTest("2026-11-02");
  });

  // ================= A. candidate filter =================================
  const A = await page.evaluate(() => {
    const SET = "S-1900-AL-01";
    const coins = [
      __coin("AY-00001"), __coin("AY-00002"),
      __coin("AY-00003", { status: "Sold" }),          // not owned
      __coin("AY-00004"),                              // no obverse photo
      __coin("AY-00005", { coinId: "C-1912--1C-04" }), // owned, has photo, NOT in the album (Best-of outside coin)
      __coin("AY-00007")                               // owned, has photo, slot filled
    ];
    const rows = [
      __slot(SET, 1909, "C-1909--1C-01", "AY-00001"),
      __slot(SET, 1910, "C-1910--1C-02", "AY-00003"),
      __slot(SET, 1911, "C-1911--1C-03", ""),           // empty slot
      __slot(SET, 1912, "C-1912--1C-04", ""),           // empty slot: AY-00005 would be a Best-of fill
      __slot(SET, 1913, "C-1913--1C-05", "AY-00004"),
      __slot(SET, 1914, "C-1914--1C-06", "AY-00002"),
      __slot(SET, 1915, "C-1915--1C-07", "AY-99999"),   // filled by an id that is not a coin
      __slot(SET, 1916, "C-1916--1C-08", "AY-00001")    // duplicate filledBy
    ];
    __install(coins, rows, [{ SetID: SET, Description: "Test Folder", Year: 1909, Lineage: "" }]);
    __photos({ "AY-00001": "AY-00001_obv.jpg", "AY-00002": "AY-00002_obv.jpg", "AY-00003": "AY-00003_obv.jpg",
               "AY-00005": "AY-00005_obv.jpg", "AY-00007": "AY-00007_obv.jpg" });
    const album = activeAlbums()[0];
    return { ids: albumCoverCandidates(album).map(c => c.coin.id), files: albumCoverCandidates(album).map(c => c.filename) };
  });
  ok("A1 candidates are exactly the owned coins physically in the album with an obverse photo, in slot order (got " + JSON.stringify(A.ids) + ")",
    JSON.stringify(A.ids) === JSON.stringify(["AY-00001", "AY-00002"]), A);
  ok("A2 the file used is the Photos-tab Obverse filename", JSON.stringify(A.files) === JSON.stringify(["AY-00001_obv.jpg", "AY-00002_obv.jpg"]), A);
  ok("A3 a sold coin, an empty slot, a coin without an obverse photo, a Best-of outside coin and a missing coin are all excluded",
    !A.ids.includes("AY-00003") && !A.ids.includes("AY-00004") && !A.ids.includes("AY-00005") && !A.ids.includes("AY-99999"), A);

  // ================= B. the pick =========================================
  const B = await page.evaluate(() => {
    const SET = "S-1900-AL-01";
    const album = activeAlbums()[0];
    const first = pickAlbumCoverCoin(album, "2026-11-02").coin.id;
    const repeats = new Set(); for (let i = 0; i < 25; i++) repeats.add(pickAlbumCoverCoin(album, "2026-11-02").coin.id);
    // random must not matter
    const realRandom = Math.random; let n = 0; Math.random = () => (n++ % 2 ? 0.01 : 0.99);
    const underRandom = new Set(); for (let i = 0; i < 25; i++) underRandom.add(pickAlbumCoverCoin(album, "2026-11-02").coin.id);
    Math.random = realRandom;
    // a bigger candidate pool, so different dates have room to differ
    const coins = []; const rows = [];
    for (let i = 1; i <= 6; i++) { coins.push(__coin("AY-0010" + i)); rows.push(__slot(SET, 1900 + i, "C-190" + i + "--1C-01", "AY-0010" + i)); }
    const ph = {}; coins.forEach(c => ph[c.id] = c.id + "_obv.jpg"); __photos(ph);
    __install(coins, rows, [{ SetID: SET, Description: "Test Folder", Year: 1909, Lineage: "" }]);
    const big = activeAlbums()[0];
    const dates = []; for (let d = 1; d <= 30; d++) dates.push("2026-11-" + String(d).padStart(2, "0"));
    const perDate = dates.map(d => pickAlbumCoverCoin(big, d).coin.id);
    // redraws and a chip tap on the same date give the same coin on the card
    __setAlbumCoverDateForTest("2026-11-02");
    document.getElementById("albumsListView").style.display = "block";
    renderAlbumsList(); const c1 = document.querySelector(".album-card-icon").dataset.coverCoin;
    renderAlbumsList(); const c2 = document.querySelector(".album-card-icon").dataset.coverCoin;
    albumsSelectedDenoms.add("1C"); renderAlbumsList(); const c3 = document.querySelector(".album-card-icon").dataset.coverCoin;
    albumsSelectedDenoms.clear(); renderAlbumsList();
    // local date key
    __setAlbumCoverDateForTest(null);
    const d = new Date(); const two = x => String(x).padStart(2, "0");
    const expectKey = d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate());
    const key = albumCoverDateKey();
    __setAlbumCoverDateForTest("2026-11-02");
    return { first, repeats: [...repeats], underRandom: [...underRandom], distinct: [...new Set(perDate)], perDate, c1, c2, c3, key, expectKey,
             inPool: perDate.every(id => coins.some(c => c.id === id)) };
  });
  ok("B1 the same date always gives the same coin (25 calls)", B.repeats.length === 1 && B.repeats[0] === B.first, B);
  ok("B2 Math.random has no effect on the pick", B.underRandom.length === 1 && B.underRandom[0] === B.first, B);
  ok("B3 different dates can give a different coin (distinct picks over 30 dates: " + B.distinct.length + ")", B.distinct.length > 1, B);
  ok("B4 every pick is one of the candidates", B.inPool, B);
  ok("B5 the card shows the same coin across redraws and a chip tap on the same date", B.c1 && B.c1 === B.c2 && B.c2 === B.c3, B);
  ok("B6 the date key is the LOCAL calendar day (got " + B.key + ")", B.key === B.expectKey, B);

  // ================= C. icon stays =======================================
  const C = await page.evaluate(() => {
    const SET = "S-1900-AL-01", SET2 = "S-1901-AL-01";
    // album 1: nothing qualifies (no photos); album 2: one candidate
    __photos({ "AY-00201": "AY-00201_obv.jpg" });
    __install([__coin("AY-00200"), __coin("AY-00201")],
      [__slot(SET, 1909, "C-1", "AY-00200"), __slot(SET2, 1910, "C-2", "AY-00201")],
      [{ SetID: SET, Description: "Empty Folder", Year: 1909, Lineage: "" }, { SetID: SET2, Description: "Photo Folder", Year: 1910, Lineage: "" }]);
    window.__fx.mode["*"] = "hold";
    renderAlbumsList();
    const cards = [...document.querySelectorAll(".album-card")];
    const info = cards.map(c => { const i = c.querySelector(".album-card-icon"); return { name: c.querySelector(".album-card-name").textContent,
      text: i.textContent.trim(), coin: i.dataset.coverCoin || "", has: i.classList.contains("has-cover") }; });
    return info;
  });
  const emptyCard = C.find(c => c.name === "Empty Folder"), photoCard = C.find(c => c.name === "Photo Folder");
  ok("C1 an album with no candidates keeps the generic icon and gets no cover coin", emptyCard && emptyCard.text === "🪙" && !emptyCard.coin && !emptyCard.has, C);
  ok("C2 an album with a candidate still shows the icon until the photo arrives (A: icon first)", photoCard && photoCard.text === "🪙" && photoCard.coin === "AY-00201" && !photoCard.has, C);
  await page.evaluate(() => { window.__fx.mode["*"] = ""; __release(); });
  await wait(300);
  const C3 = await page.evaluate(() => { const i = [...document.querySelectorAll(".album-card")].find(c => c.querySelector(".album-card-name").textContent === "Photo Folder").querySelector(".album-card-icon");
    return { has: i.classList.contains("has-cover"), bg: i.style.backgroundImage, radius: getComputedStyle(i).borderRadius, w: i.getBoundingClientRect().width, h: i.getBoundingClientRect().height }; });
  ok("C3 then the photo swaps in as a circle in the 52 px box (got " + JSON.stringify(C3) + ")",
    C3.has && /blob:/.test(C3.bg) && C3.w === 52 && C3.h === 52 && /50%|26px/.test(C3.radius), C3);

  // demo mode: no live photos at all
  const demo = await page.evaluate(async () => {
    window.__fx.urls.length = 0; __resetAlbumCoverForTest();
    __setStoredPhotosForTest(null); __setLiveAlbumsForTest(null); __setLiveCoinsForTest(null);
    __setLiveDataModeForTest("offline");
    renderAlbumsList(); await new Promise(r => setTimeout(r, 300));
    return { requests: window.__fx.urls.length, covers: document.querySelectorAll(".album-card-icon.has-cover").length,
             cards: document.querySelectorAll(".album-card").length };
  });
  ok("C4 demo mode keeps the icon on every card and makes no thumbnail request", demo.cards > 0 && demo.covers === 0 && demo.requests === 0, demo);

  // ================= D. loading ==========================================
  // 14 albums with one candidate each: only the first screenful is visible.
  const D0 = await page.evaluate(() => {
    __resetAlbumCoverForTest(); const coins = [], rows = [], sets = [], ph = {};
    for (let i = 1; i <= 14; i++) { const id = "AY-03" + String(i).padStart(2, "0"), set = "S-19" + String(i).padStart(2, "0") + "-AL-01";
      coins.push(__coin(id)); rows.push(__slot(set, 1900 + i, "C-" + i, id)); sets.push({ SetID: set, Description: "Folder " + i, Year: 1900 + i, Lineage: "" }); ph[id] = id + "_obv.jpg"; }
    __photos(ph); __install(coins, rows, sets);
    Object.assign(window.__fx, { urls: [], files: [], inflight: 0, maxInflight: 0, mode: { "*": "hold" }, holds: {} });
    showAlbumsList();
    return { visible: [...document.querySelectorAll(".album-card")].filter(c => c.getBoundingClientRect().top < innerHeight + 100).length };
  });
  await wait(400);
  const D1 = await page.evaluate(() => ({ n: window.__fx.files.length, inflight: window.__fx.inflight, max: window.__fx.maxInflight, files: window.__fx.files.slice() }));
  ok("D1 off-screen cards fetch nothing: " + D1.n + " requested of 14 cards, " + D0.visible + " near the viewport", D1.n > 0 && D1.n < 14 && D1.n <= D0.visible, { D0, D1 });
  ok("D2 at most 4 requests are in flight at once (in flight " + D1.inflight + ")", D1.inflight <= 4 && D1.max <= 4 && (D0.visible < 4 || D1.inflight === 4), { D0, D1 });
  ok("D3 every request is the medium thumbnail URL, never the full /content", await page.evaluate(() =>
    window.__fx.urls.length > 0 && window.__fx.urls.every(u => /:\/thumbnails\/0\/medium\/content$/.test(u))), D1);
  const D4 = await page.evaluate(() => [...document.querySelectorAll(".album-card-icon")].filter(i => i.classList.contains("has-cover")).length);
  ok("D4 nothing is swapped in before a photo has arrived", D4 === 0, D4);
  await page.evaluate(() => { window.__fx.mode["*"] = ""; __release(); });
  await wait(500);
  const D5 = await page.evaluate(() => ({ n: window.__fx.files.length, max: window.__fx.maxInflight, covers: document.querySelectorAll(".album-card-icon.has-cover").length }));
  ok("D5 the queue drains (4 held, then every near-viewport card) without ever exceeding 4 in flight", D5.n > D1.n && D5.n <= D0.visible && D5.max <= 4 && D5.covers === D5.n, { D0, D1, D5 });
  ok("D5b after the queue drained, cards far below the viewport have still not been requested (" + D5.n + " of 14)", D5.n < 14 && D5.n <= D0.visible, { D0, D5 });
  await page.evaluate(() => { const cards = document.querySelectorAll(".album-card"); cards[cards.length - 1].scrollIntoView(); });
  await wait(500);
  const D6 = await page.evaluate(() => ({ n: window.__fx.files.length, uniq: new Set(window.__fx.files).size, max: window.__fx.maxInflight }));
  ok("D6 scrolling to the end loads the rest, one request per file (" + D6.n + " requests, " + D6.uniq + " files)", D6.uniq === 14 && D6.n === 14 && D6.max <= 4, D6);
  const D7 = await page.evaluate(async () => {
    const before = window.__fx.files.length;
    renderAlbumsList();                                   // chip tap / data arrival
    const syncCovers = [...document.querySelectorAll(".album-card-icon")].filter(i => i.dataset.coverCoin && i.classList.contains("has-cover")).length;
    const withCoin = [...document.querySelectorAll(".album-card-icon")].filter(i => i.dataset.coverCoin).length;
    await new Promise(r => setTimeout(r, 300));
    return { before, after: window.__fx.files.length, syncCovers, withCoin };
  });
  ok("D7 a redraw reuses the cache: no new request, and every already-loaded card is photo-ready immediately", D7.after === D7.before && D7.syncCovers > 0, D7);
  const D8 = await page.evaluate(async () => {
    __resetAlbumCoverForTest(); window.__fx.files.length = 0; window.__fx.urls.length = 0;
    const album = activeAlbums()[0]; const pick = pickAlbumCoverCoin(album);
    const FULL = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    __setCoinPhotoCacheForTest(pick.filename, FULL);
    renderAlbumsList(); await new Promise(r => setTimeout(r, 300));
    const first = [...document.querySelectorAll(".album-card")].find(c => c.querySelector(".album-card-icon").dataset.coverCoin === pick.coin.id).querySelector(".album-card-icon");
    return { bg: first.style.backgroundImage, requestedPick: window.__fx.files.includes(pick.filename), has: first.classList.contains("has-cover") };
  });
  ok("D8 a full photo already in coinPhotoCache is used with no request for that file", D8.has && D8.bg.includes("R0lGODlhAQABAAAAACw") && !D8.requestedPick, D8);

  // ================= E. failure retries next visit =======================
  const E = await page.evaluate(async () => {
    __resetAlbumCoverForTest();
    const SET = "S-1950-AL-01"; __photos({ "AY-00401": "AY-00401_obv.jpg" });
    __install([__coin("AY-00401")], [__slot(SET, 1950, "C-9", "AY-00401")], [{ SetID: SET, Description: "Fail Folder", Year: 1950, Lineage: "" }]);
    Object.assign(window.__fx, { urls: [], files: [], inflight: 0, maxInflight: 0, mode: { "AY-00401_obv.jpg": "fail" }, holds: {} });
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const icon = () => document.querySelector(".album-card-icon");
    showAlbumsList(); await sleep(300);
    const afterFirst = { reqs: window.__fx.files.length, has: icon().classList.contains("has-cover"), text: icon().textContent.trim() };
    renderAlbumsList(); await sleep(300);                       // chip tap, same visit
    const afterChip = { reqs: window.__fx.files.length };
    window.__fx.mode["AY-00401_obv.jpg"] = "";
    showAlbumsList(); await sleep(300);                         // next visit
    return { afterFirst, afterChip, afterVisit: { reqs: window.__fx.files.length, has: icon().classList.contains("has-cover") } };
  });
  ok("E1 a failed thumbnail keeps the generic icon", !E.afterFirst.has && E.afterFirst.text === "🪙" && E.afterFirst.reqs === 1, E);
  ok("E2 it is not retried on a redraw or chip tap in the same visit", E.afterChip.reqs === 1, E);
  ok("E3 it is retried the next time the list is opened, and then the photo appears", E.afterVisit.reqs === 2 && E.afterVisit.has, E);

  // ================= F. late swap =======================================
  const F = await page.evaluate(async () => {
    __resetAlbumCoverForTest();
    const SET = "S-1960-AL-01"; __photos({ "AY-00501": "AY-00501_obv.jpg" });
    __install([__coin("AY-00501")], [__slot(SET, 1960, "C-8", "AY-00501")], [{ SetID: SET, Description: "Late Folder", Year: 1960, Lineage: "" }]);
    Object.assign(window.__fx, { urls: [], files: [], inflight: 0, maxInflight: 0, mode: { "*": "hold" }, holds: {} });
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    showAlbumsList(); await sleep(300);
    const oldIcon = document.querySelector(".album-card-icon");
    renderAlbumsList(); await sleep(100);                       // list rebuilt while the request is in flight
    const newIcon = document.querySelector(".album-card-icon");
    window.__fx.mode["*"] = ""; __release(); await sleep(300);
    const requests = window.__fx.files.length;
    // now a swap landing after every card is gone
    __resetAlbumCoverForTest(); window.__fx.mode["*"] = "hold";
    renderAlbumsList(); await sleep(300);
    document.getElementById("albumsListContainer").innerHTML = "";
    window.__fx.mode["*"] = ""; __release(); await sleep(300);
    return { oldDetached: !document.contains(oldIcon), oldHas: oldIcon.classList.contains("has-cover"), newHas: newIcon.classList.contains("has-cover"),
             requests, goneCached: Object.keys(albumCoverThumbCache).length };
  });
  ok("F1 one request serves the rebuilt card; the old detached card is not touched", F.requests === 1 && F.oldDetached && !F.oldHas && F.newHas, F);
  ok("F2 a swap that lands after the list is gone is skipped without error (and the image is cached for next time)", F.goneCached === 1, F);

  // ================= G. nothing wrote ====================================
  const G = await page.evaluate(() => window.__fx.writes.slice());
  ok("G1 no write of any kind (no non-GET fetch): " + JSON.stringify(G), G.length === 0, G);
}, module);
