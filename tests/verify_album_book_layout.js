// Two real Albums-book layout bugs found on Ray's live-device pass against
// the Albums live-wiring branch, both invisible with FAKE_ALBUMS' own 8-slot
// mocks (too small to expose either) and both reproduced here against a
// realistically-sized live album (90 slots, modeled on the real Mercury
// Dimes 1916-1945 folder). See CLAUDE.md "Albums book layout: cover sizing +
// page-flip clip fix" for the write-up. A third reported bug (a coin image
// rendering undersized inside its own disc, on both an Albums slot AND
// Browse detail) was investigated and diagnosed as NOT a code bug — see the
// same CLAUDE.md section — so it has no fix and no coverage here.

const { defineSuite } = require("./harness");

// 97 slots deliberately (a prime, not the real album's own 82-90-ish count)
// — a computed chunkSize that happens to divide evenly into a round total
// would make every coins page the same size, masking the exact mismatch
// this bug needs to reproduce (a prime total can only divide evenly if the
// computed chunkSize is 1 or 97, vanishingly unlikely at any real viewport).
function buildBigAlbumFixture() {
  const albumRows = [];
  let seq = 1;
  for (let y = 1916; y <= 1945; y++) {
    ["", "D", "S"].forEach(mm => {
      albumRows.push({
        Status: "Open", Year: y, MintMark: mm, Variety: "", Description: "Mercury Dime",
        AlbumName: "Mercury Dimes", AlbumID: "S-1916-AL-01",
        CoinID: `C-${y}-${mm}-10C-${String(seq).padStart(2, "0")}`, FilledBy: ""
      });
      seq++;
    });
  }
  for (let y = 1946; y <= 1952 && albumRows.length < 97; y++) {
    albumRows.push({
      Status: "Open", Year: y, MintMark: "", Variety: "", Description: "Mercury Dime",
      AlbumName: "Mercury Dimes", AlbumID: "S-1916-AL-01",
      CoinID: `C-${y}--10C-${String(seq).padStart(2, "0")}`, FilledBy: ""
    });
    seq++;
  }
  const dbSetsRows = [
    { SetID: "S-1916-AL-01", Description: "Mercury Dimes 1916-1945", MfgProductID: "", ContainerName: "", Coins: albumRows.length, Lineage: "" }
  ];
  return { albumRows, dbSetsRows };
}

module.exports = defineSuite("album-book-layout", async ({ ok, openApp, PHONE, TABLET }) => {
  // ---------- A. cover page matches the interior pages' computed height (phone, non-spread) ----------
  const phone = await openApp(PHONE);
  const A = await phone.evaluate(({ albumRows, dbSetsRows }) => {
    __setLiveAlbumsForTest(buildLiveAlbums(albumRows, dbSetsRows, [], []));
    navigate("albums");
    showAlbumDetail(0);
    const coverH = document.querySelector(".album-page-cover").getBoundingClientRect().height;
    document.getElementById("albumPageNextBtn").click(); // -> History (single-page mode, non-spread)
    const historyH = document.querySelector(".album-page-history").getBoundingClientRect().height;
    document.getElementById("albumPageNextBtn").click(); // -> first Obverse coins page
    const coinsH = document.querySelector(".album-page-coins").getBoundingClientRect().height;
    __setLiveAlbumsForTest(null);
    return { coverH, historyH, coinsH };
  }, buildBigAlbumFixture());
  ok(A.coverH === A.coinsH, `A1 cover page height (${A.coverH}) matches a real coins page's computed height (${A.coinsH}) at phone width — was a bare 360px floor before this fix`);
  ok(A.historyH === A.coinsH, `A2 the History page (also minimal content) matches too — confirms this isn't cover-specific special-casing, every page type shares one computed height`);
  ok(A.coverH > 400, `A3 sanity: the computed height is genuinely viewport-driven, not a coincidental small value (${A.coverH})`);

  // ---------- B onward: spread mode + the animated page turn need real width ----------
  const tablet = await openApp(TABLET);

  const B = await tablet.evaluate(({ albumRows, dbSetsRows }) => {
    __setLiveAlbumsForTest(buildLiveAlbums(albumRows, dbSetsRows, [], []));
    navigate("albums");
    showAlbumDetail(0);
    const coverH = document.querySelector(".album-page-cover").getBoundingClientRect().height;
    document.getElementById("albumPageNextBtn").click(); // -> History+Obverse spread (instant, cover boundary)
    const pages = [...document.querySelectorAll("#albumsDetailContainer .album-page")].map(p => p.getBoundingClientRect().height);
    __setLiveAlbumsForTest(null);
    return { coverH, pages, spread: isAlbumSpreadWidth() };
  }, buildBigAlbumFixture());
  ok(B.spread, "B0 sanity: tablet width is genuinely in spread mode");
  ok(B.pages.length === 2 && B.pages[0] === B.pages[1], `B1 History+Obverse spread pair render at equal heights (${JSON.stringify(B.pages)}) — align-items:stretch already handled this correctly, unaffected by this fix`);
  ok(B.coverH === B.pages[0], `B2 the (never-paired) cover matches that same computed height in spread mode too (${B.coverH} vs ${B.pages[0]})`);

  // ---------- C. page-flip: a shorter revealed page no longer clips against a taller sibling ----------
  const C = await tablet.evaluate(({ albumRows, dbSetsRows }) => {
    __setLiveAlbumsForTest(buildLiveAlbums(albumRows, dbSetsRows, [], []));
    navigate("albums");
    showAlbumDetail(0);
    const pages = currentAlbumPages.map(p => p.type + (p.slots ? ":" + p.slots.length : ""));
    // Search for a real "next" turn whose revealed (static-under) page
    // genuinely differs in slot count from the sibling page staying
    // visible — mirrors turnAlbumPage()'s own siblingOldIdx/staticNewIdx
    // logic exactly, rather than guessing a fixed offset (which page sizes
    // land where depends on live viewport math, not a fixed layout). A 97-
    // slot fixture (not evenly divisible, like the real album) plus this
    // search is what actually finds the real mismatch, wherever it falls.
    const total = currentAlbumPages.length;
    const pageSize = i => (currentAlbumPages[i].slots ? currentAlbumPages[i].slots.length : null);
    let startIndex = null;
    for (let i = 1; i < total - 1; i++) {
      const oldIdx = computeVisibleIndices(i, true, total);
      const newIdx = computeVisibleIndices(nextAlbumPageIndex(i, true, total), true, total);
      if (newIdx.length < 2) continue;
      const siblingSize = pageSize(oldIdx[0]);
      const staticSize = pageSize(newIdx[1]);
      if (siblingSize != null && staticSize != null && siblingSize !== staticSize) { startIndex = i; break; }
    }
    currentPageIndex = startIndex;
    renderAlbumBook();
    document.getElementById("albumPageNextBtn").click(); // real animated 2<->2 turn into the shorter revealed page
    return new Promise(resolve => {
      setTimeout(() => {
        const turnSlot = document.querySelector(".book-turn-slot");
        const staticUnder = document.querySelector(".static-under");
        const leaf = document.getElementById("albumLeafTurn");
        resolve({
          pages,
          turnSlotH: turnSlot && turnSlot.getBoundingClientRect().height,
          staticUnderH: staticUnder && staticUnder.getBoundingClientRect().height,
          leafH: leaf && leaf.getBoundingClientRect().height
        });
      }, 150); // mid-animation (transition runs 650ms)
    });
  }, buildBigAlbumFixture());
  const coinsPageSizes = new Set(C.pages.filter(p => p.startsWith("coins:")));
  ok(coinsPageSizes.size > 1, `C0 sanity: this album's pages include coins-pages of more than one size (${[...coinsPageSizes].join(", ")}) — a real slot count that doesn't divide evenly, same as the real album`);
  ok(C.turnSlotH != null, "C1 the animated turn fired — .book-turn-slot exists mid-flip");
  ok(C.staticUnderH === C.turnSlotH, `C2 .static-under (the revealed page, a genuinely different slot count than its sibling here) now matches .book-turn-slot's real stretched height (${C.staticUnderH} vs ${C.turnSlotH}) — this exact class of mismatch (360 vs 606) reproduced the reported "bottom edge clips" symptom before this fix`);
  ok(C.leafH === C.turnSlotH, `C3 the turning leaf itself also matches (${C.leafH}) — unaffected by this bug, confirming the fix is scoped to static-under specifically`);
  // Let any pending transition finish before the next block re-renders the book.
  await tablet.waitForTimeout(700);

  // ---------- D. negative controls — real CSS overrides, not just re-describing the fix ----------
  // A temporary <style> tag with !important reproduces the exact pre-fix
  // rules (both were bare, unconditioned declarations — nothing else in
  // this file competes with them on specificity, so !important isn't
  // masking some other real rule, only standing in for the removed one).
  const NEG_COVER = await tablet.evaluate(({ albumRows, dbSetsRows }) => {
    const style = document.createElement("style");
    style.textContent = ".album-page { min-height: 360px !important; }"; // the pre-fix rule
    document.head.appendChild(style);
    __setLiveAlbumsForTest(buildLiveAlbums(albumRows, dbSetsRows, [], []));
    navigate("albums");
    showAlbumDetail(0);
    const coverH = document.querySelector(".album-page-cover").getBoundingClientRect().height;
    document.getElementById("albumPageNextBtn").click();
    const coinsH = document.querySelector(".album-page-history").getBoundingClientRect().height;
    style.remove();
    __setLiveAlbumsForTest(null);
    return { coverH, coinsH };
  }, buildBigAlbumFixture());
  ok(NEG_COVER.coverH === 360, `D1 negative control: forcing the pre-fix bare 360px min-height reproduces the exact reported undersized cover (${NEG_COVER.coverH})`);
  ok(NEG_COVER.coverH !== NEG_COVER.coinsH, "D2 negative control: with the fix reverted, cover and interior-page heights genuinely diverge again — confirms A1/B2 aren't a coincidental pass");

  const NEG_FLIP = await tablet.evaluate(({ albumRows, dbSetsRows }) => {
    const style = document.createElement("style");
    // Reverting static-under's height:100% ALONE isn't enough to reproduce
    // this — found while writing this very control: the D1/D2 fix (every
    // .album-page floored to --page-min-height) already makes a short
    // page's own child at least as tall as its sibling, independent of
    // whether static-under itself stretches. That's a real, useful
    // interaction (defense in depth — the two fixes reinforce each other),
    // but it means isolating THIS fix's own contribution — which was
    // independently reproducible before EITHER fix existed, per the
    // original measurement (360 vs 606, with the old bare 360px min-height
    // rule also in place at the time) — needs both pre-fix rules back
    // together, matching the actual originally-measured bug.
    style.textContent = ".book-turn-slot .static-under { height: auto !important; } " +
      ".album-page { min-height: 360px !important; }";
    document.head.appendChild(style);
    __setLiveAlbumsForTest(buildLiveAlbums(albumRows, dbSetsRows, [], []));
    navigate("albums");
    showAlbumDetail(0);
    // Same search as block C — find the real mismatched transition rather
    // than assuming a fixed offset.
    const total = currentAlbumPages.length;
    const pageSize = i => (currentAlbumPages[i].slots ? currentAlbumPages[i].slots.length : null);
    let startIndex = null;
    for (let i = 1; i < total - 1; i++) {
      const oldIdx = computeVisibleIndices(i, true, total);
      const newIdx = computeVisibleIndices(nextAlbumPageIndex(i, true, total), true, total);
      if (newIdx.length < 2) continue;
      const siblingSize = pageSize(oldIdx[0]);
      const staticSize = pageSize(newIdx[1]);
      if (siblingSize != null && staticSize != null && siblingSize !== staticSize) { startIndex = i; break; }
    }
    currentPageIndex = startIndex;
    renderAlbumBook();
    document.getElementById("albumPageNextBtn").click();
    return new Promise(resolve => {
      setTimeout(() => {
        const turnSlot = document.querySelector(".book-turn-slot");
        const staticUnder = document.querySelector(".static-under");
        const result = {
          turnSlotH: turnSlot && turnSlot.getBoundingClientRect().height,
          staticUnderH: staticUnder && staticUnder.getBoundingClientRect().height
        };
        style.remove();
        __setLiveAlbumsForTest(null);
        resolve(result);
      }, 150);
    });
  }, buildBigAlbumFixture());
  ok(NEG_FLIP.staticUnderH < NEG_FLIP.turnSlotH, `D3 negative control: forcing BOTH pre-fix rules back together reproduces the exact reported clip — static-under (${NEG_FLIP.staticUnderH}) falls short of the turn slot's real height (${NEG_FLIP.turnSlotH}) again (D1/D2's own fix alone does NOT reproduce this — see that block's comment)`);
  await tablet.waitForTimeout(700);

  // ---------- E. nav / overflow smoke ----------
  const E = await tablet.evaluate(() => {
    __setLiveAlbumsForTest(null);
    const routes = ["dashboard", "albums", "browse", "dashboard"];
    const bad = [];
    routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    navigate("dashboard");
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(E.bad.length === 0, "E1 every route still navigates cleanly: " + E.bad.join("; "));
  ok(E.overflow === false, "E2 no horizontal page overflow at tablet width");
}, module);
