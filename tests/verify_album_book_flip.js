// Album page flip on a desktop (spread) viewport — Ray's PC report on 97bdf5f:
// in "Mercury Dimes Proof 1936-1942" (S-1936-AL-01) flipping 2-3 -> 4-5 started,
// snapped back to 2-3, and then the arrows stopped responding; in the Mercury
// 1916-1945 binder he couldn't flip at all, and after reopening, not past 2-3.
//
// Root cause (reproduced here): a turn renders the next page's slots, which
// starts their photo fetches. When one lands during the 0.65 s turn,
// renderSlotCell()'s redraw-on-land callback found the slot's coin on the
// still-current page (its check matches filledBy without regard to side, so the
// coin's reverse photo matches its obverse on the visible page) and called
// renderAlbumBook() at the OLD page. That replaced the turning leaf, so its
// transitionend never fired and albumTurnInProgress stayed true for the rest of
// the page's life — in that album and every album opened after it. Spread mode
// only: single-page mode (phone, portrait tablet) never animates.
//
// Photo fetches are stubbed (in-page, 300 ms, cached once landed) — no Graph,
// no real workbook.

const { defineSuite } = require("./harness");

const DESKTOP = { width: 1440, height: 900 };

function fixtures(includeNew) {
  const albumRows = [];
  const dbSetsRows = [];
  const coins = [];
  let ay = 1;
  const add = (setId, name, denom, year, mm, filled) => {
    const id = filled ? "AY-" + String(ay++).padStart(5, "0") : "";
    if (id) coins.push({ id, denom, year, mint: mm, name, status: "Owned", value: 1 });
    albumRows.push({ Status: id ? "Filled" : "Open", Year: year, MintMark: mm, Variety: "", Description: name,
      AlbumName: name, AlbumID: setId, CoinID: `C-${year}-${mm}-${denom}-${String(albumRows.length + 1).padStart(2, "0")}`, FilledBy: id });
  };
  // Six existing albums (sizes realistic, contents synthetic).
  const lincoln = (setId, label, from, to) => {
    dbSetsRows.push({ SetID: setId, Year: from, Description: label, MfgProductID: "", ContainerName: "", Coins: 0, Lineage: "" });
    for (let y = from; y <= to; y++) add(setId, "Lincoln Cent", "1C", y, "", y % 3 !== 0);
  };
  lincoln("S-1909-AL-01", "Lincoln Wheat Cents", 1909, 1929);
  lincoln("S-1930-AL-01", "Lincoln Cents 1930-1958", 1930, 1958);
  lincoln("S-1959-AL-01", "Lincoln Memorial Cents", 1959, 1998);
  lincoln("S-1999-AL-01", "Lincoln Cents 1999-2025", 1999, 2025);
  dbSetsRows.push({ SetID: "S-1916-AL-01", Year: 1916, Description: "Mercury Dimes 1916-1945", MfgProductID: "", ContainerName: "Binder", Coins: 82, Lineage: "" });
  let n = 0;
  for (let y = 1916; y <= 1945 && n < 82; y++) ["", "D", "S"].forEach(mm => { if (n++ < 82) add("S-1916-AL-01", "Mercury Dime", "10C", y, mm, n % 4 !== 0); });
  dbSetsRows.push({ SetID: "S-1946-AL-01", Year: 1946, Description: "Roosevelt Dimes 1946-1964", MfgProductID: "", ContainerName: "", Coins: 0, Lineage: "" });
  for (let y = 1946; y <= 1964; y++) add("S-1946-AL-01", "Roosevelt Dime", "10C", y, "", y % 2 === 0);
  if (includeNew) {
    // Last DB_Sets row, but it sorts between the 1916 and 1946 albums.
    dbSetsRows.push({ SetID: "S-1936-AL-01", Year: 1936, Description: "Mercury Dimes Proof 1936-1942", MfgProductID: "", ContainerName: "", Coins: 7, Lineage: "" });
    for (let y = 1936; y <= 1942; y++) add("S-1936-AL-01", "Mercury Dime", "10C", y, "", y !== 1938 && y !== 1941);
  }
  return { albumRows, dbSetsRows, coins };
}

module.exports = defineSuite("album-book-flip", async ({ ok, openApp }) => {
  const page = await openApp(DESKTOP);

  await page.evaluate(() => {
    // The sandbox never gets live data, so the splash overlay stays up and would
    // swallow real mouse clicks. Hide it; it plays no part in the flip.
    const splash = document.getElementById("splashScreen");
    if (splash) { splash.style.display = "none"; splash.style.pointerEvents = "none"; }
    const TINY = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    window.__photoCache = {};
    window.__photoDelay = 300;
    const inflight = {};
    window.storedPhotoFilename = (coin, side) => /^AY-/.test(coin.id) ? coin.id + "_" + side + ".jpg" : null;
    window.getCachedCoinPhotoUrl = n => window.__photoCache[n] || null;
    window.ensureCoinPhotoFetch = n => {
      if (window.__photoCache[n]) return Promise.resolve(window.__photoCache[n]);
      if (!inflight[n]) inflight[n] = new Promise(r => setTimeout(() => { window.__photoCache[n] = TINY; delete inflight[n]; r(TINY); }, window.__photoDelay));
      return inflight[n];
    };
    window.__load = (fx) => {
      window.__photoCache = {};
      __setLiveDataModeForTest("live");
      __setLiveCoinsForTest(fx.coins);
      __setLiveAlbumsForTest(buildLiveAlbums(fx.albumRows, fx.dbSetsRows, [], []));
      navigate("albums");
    };
    window.__label = () => (document.querySelector(".book-page-indicator") || {}).textContent || "";
    window.__state = () => ({ label: window.__label(), turning: albumTurnInProgress,
      prevDisabled: !!(document.getElementById("albumPagePrevBtn") || {}).disabled,
      nextDisabled: !!(document.getElementById("albumPageNextBtn") || {}).disabled });
    window.__swipe = (dx) => {
      const el = document.querySelector("#albumsDetailContainer .book-pages");
      const t = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 300 });
      el.dispatchEvent(new TouchEvent("touchstart", { touches: [t(600)], changedTouches: [t(600)], bubbles: true }));
      el.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [t(600 + dx)], bubbles: true }));
    };
  });

  const openByName = async (name) => page.evaluate(async (name) => {
    const i = activeAlbums().findIndex(a => a.name === name);
    await showAlbumDetail(i);
    return i;
  }, name);
  const settle = (ms) => page.waitForTimeout(ms || 1200);
  const clickNextMouse = async () => {
    const box = await page.locator("#albumPageNextBtn").boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  };
  const st = () => page.evaluate(() => window.__state());

  for (const includeNew of [false, true]) {
    const tag = includeNew ? "7 albums" : "6 albums";
    await page.evaluate((fx) => window.__load(fx), fixtures(includeNew));

    // ---------- Mercury binder, real mouse ----------
    const mi = await openByName("Mercury Dimes 1916-1945");
    ok(mi >= 0 && (await page.evaluate(() => isAlbumSpreadWidth())), `A0 [${tag}] desktop viewport is in spread mode and the binder opens`);
    await clickNextMouse();                 // cover -> 2-3 (instant)
    const s23 = await st();
    await clickNextMouse();                 // 2-3 -> 4-5: reverse photos start fetching and land mid-turn
    await settle();
    const s45 = await st();
    await clickNextMouse();                 // must still respond
    await settle();
    const s67 = await st();
    ok(s23.label === "Page 2–3 of " + s23.label.split(" of ")[1], `A1 [${tag}] cover -> pages 2-3 (${s23.label})`);
    ok(/^Page 4–5 /.test(s45.label) && !s45.turning,
      `A2 [${tag}] MERCURY BINDER, MOUSE: 2-3 -> 4-5 COMPLETES and does not snap back (${JSON.stringify(s45)})`);
    ok(/^Page 6–7 /.test(s67.label) && !s67.turning, `A3 [${tag}] the arrows still respond after that flip (${s67.label})`);
    // Flip on to the binder's last page (desktop pages are large, so it's short).
    const total = await page.evaluate(() => currentAlbumPages.length);
    for (let i = 0; i < 12 && !(await st()).nextDisabled; i++) { await clickNextMouse(); await settle(900); }
    const sEnd = await st();
    ok(sEnd.label === `Page ${total} of ${total}` && !sEnd.turning,
      `A4 [${tag}] repeated mouse flips run the binder to its last page (${sEnd.label}, ${total} pages)`);

    // Mouse drag on the pages: no handler exists (touch swipe only) — it must not wedge anything.
    const pagesBox = await page.locator("#albumsDetailContainer .book-pages").boundingBox();
    await page.mouse.move(pagesBox.x + pagesBox.width * 0.2, pagesBox.y + 200);
    await page.mouse.down();
    await page.mouse.move(pagesBox.x + pagesBox.width * 0.8, pagesBox.y + 200, { steps: 8 });
    await page.mouse.up();
    await settle(300);
    const afterDrag = await st();
    const prevBox = await page.locator("#albumPagePrevBtn").boundingBox();
    await page.mouse.click(prevBox.x + prevBox.width / 2, prevBox.y + prevBox.height / 2);
    await settle();
    const afterDragClick = await st();
    ok(afterDrag.label === sEnd.label && afterDragClick.label !== sEnd.label && !afterDragClick.turning,
      `A5 [${tag}] a mouse drag does nothing (no mouse-swipe), and the arrows still work after it (${afterDrag.label} -> ${afterDragClick.label})`);

    // ---------- Mercury binder, touch swipe ----------
    await openByName("Mercury Dimes 1916-1945");
    await page.evaluate(() => window.__swipe(-120));   // cover -> 2-3
    await page.evaluate(() => window.__swipe(-120));   // 2-3 -> 4-5
    await settle();
    const t45 = await st();
    await page.evaluate(() => window.__swipe(-120));
    await settle();
    const t67 = await st();
    ok(/^Page 4–5 /.test(t45.label) && /^Page 6–7 /.test(t67.label) && !t67.turning,
      `B1 [${tag}] MERCURY BINDER, TOUCH SWIPE: 2-3 -> 4-5 -> 6-7 (${t45.label}, ${t67.label})`);

    if (includeNew) {
      // ---------- the seven-slot album, through to its last page ----------
      const ni = await openByName("Mercury Dimes Proof 1936-1942");
      const total = await page.evaluate(() => currentAlbumPages.length);
      await clickNextMouse();  // -> 2-3
      await clickNextMouse();  // -> 4-5
      await settle();
      const n45 = await st();
      await clickNextMouse();  // -> last page (back cover, alone)
      await settle();
      const nLast = await st();
      ok(ni >= 0 && /^Page 4–5 /.test(n45.label) && !n45.turning,
        `C1 SEVEN-SLOT ALBUM, MOUSE: 2-3 -> 4-5 completes (${JSON.stringify(n45)})`);
      ok(nLast.label === `Page ${total} of ${total}` && nLast.nextDisabled && !nLast.turning,
        `C2 it reaches its last page, Next disabled there (${nLast.label}, ${total} pages)`);
      await page.evaluate(() => document.getElementById("albumPagePrevBtn").click());
      await settle();
      ok(/^Page 4–5 /.test((await st()).label), "C3 Previous works back from the last page");

      // A stuck flip in one album must not carry over to the next one opened.
      await page.evaluate(async () => {
        document.getElementById("albumPagePrevBtn").click(); // 4-5 -> 2-3, animating
        await new Promise(r => setTimeout(r, 50));
        // Leave mid-turn: open another album straight away.
        await showAlbumDetail(activeAlbums().findIndex(a => a.name === "Mercury Dimes 1916-1945"));
      });
      await clickNextMouse(); await clickNextMouse(); await settle();
      const carry = await st();
      ok(/^Page 4–5 /.test(carry.label) && !carry.turning,
        `C4 opening another album mid-flip leaves its arrows working (${JSON.stringify(carry)})`);

      // The old book's turn must not finish INTO the newly opened one: with a
      // slow album-open prefetch, the turn's fallback timer fires before the
      // new book renders and would drag it to the old turn's page.
      const C5 = await page.evaluate(async () => {
        await showAlbumDetail(activeAlbums().findIndex(a => a.name === "Mercury Dimes Proof 1936-1942"));
        document.getElementById("albumPageNextBtn").click();          // -> 2-3
        await new Promise(r => setTimeout(r, 400));
        window.__photoCache = {}; window.__photoDelay = 1600;          // the next open waits on its prefetch
        document.getElementById("albumPageNextBtn").click();          // 2-3 -> 4-5 starts animating
        await new Promise(r => setTimeout(r, 50));
        await showAlbumDetail(activeAlbums().findIndex(a => a.name === "Mercury Dimes 1916-1945"));
        window.__photoDelay = 300;
        return window.__state();
      });
      ok(C5.label === "Page 1 of " + C5.label.split(" of ")[1] && !C5.turning,
        `C5 a turn left behind in one album never finishes into the next one opened (it opens on its cover: ${C5.label})`);
    }

    // ---------- a refresh during a flip ----------
    await openByName("Mercury Dimes 1916-1945");
    await clickNextMouse();
    await settle(400);
    const r = await page.evaluate(async () => {
      document.getElementById("albumPageNextBtn").click();          // turn starts
      await new Promise(r => setTimeout(r, 100));
      const mid = albumTurnInProgress;
      renderAlbumBook();                                             // a re-render lands mid-turn
      const afterRender = albumTurnInProgress;
      await new Promise(r => setTimeout(r, 1200));
      return { mid, afterRender, s: window.__state() };
    });
    await clickNextMouse(); await settle();
    const rAfter = await st();
    ok(r.mid === true && r.afterRender === false && !r.s.turning,
      `D1 [${tag}] a re-render during a flip clears the flipping state (mid ${r.mid}, after ${r.afterRender})`);
    ok(/^Page \d+–\d+ /.test(rAfter.label) && rAfter.label !== r.s.label && !rAfter.turning,
      `D2 [${tag}] the arrows respond after a refresh during a flip (${r.s.label} -> ${rAfter.label})`);
  }

  // ---------- a turn whose animation never completes ----------
  const E = await page.evaluate(async () => {
    await showAlbumDetail(activeAlbums().findIndex(a => a.name === "Mercury Dimes 1916-1945"));
    document.getElementById("albumPageNextBtn").click();             // -> 2-3
    window.__photoCache = new Proxy({}, { get: () => "data:," });    // nothing in flight
    const style = document.createElement("style");
    style.textContent = ".leaf-turn { transition: none !important; }"; // transitionend will never fire
    document.head.appendChild(style);
    document.getElementById("albumPageNextBtn").click();
    await new Promise(r => setTimeout(r, 2000));
    const s = window.__state();
    style.remove();
    return s;
  });
  ok(/^Page 4–5 /.test(E.label) && !E.turning, `E1 A FLIP WHOSE ANIMATION NEVER ENDS STILL FINISHES and frees the arrows (${JSON.stringify(E)})`);

  await page.evaluate(() => { __setLiveAlbumsForTest(null); __setLiveCoinsForTest(null); __setLiveDataModeForTest(null); navigate("dashboard"); });
}, module);
