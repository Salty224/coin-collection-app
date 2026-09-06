// Two independent timing/fallback mechanisms, one task: the splash screen's
// fake timer is replaced with real data-readiness gating (Part 1), and
// opening an album now waits (bounded) for its first VISIBLE page's own
// images before revealing the book (Part 2). See CLAUDE.md for the write-up.
//
// Both share one design principle, worth stating once: a 5s ceiling that is
// failed-open, never failed-closed. Part 1's ceiling falls back to the
// existing (previously dev-only) error box with a real Retry; Part 2's
// ceiling falls back to the SAME progressive-fill behavior the book already
// has for every page beyond the first — revealing with whatever's ready,
// never blocking indefinitely.

const { defineSuite, APP_URL } = require("./harness");

// A live album shaped for the Part 2 scoping tests: two DISTINCT series (so
// each chunk's reference-image lookup is independently observable), forced
// through a small fixed chunkSize (2) so the exact page boundaries are known
// rather than guessed from live viewport geometry.
function twoSeriesAlbumFixture() {
  const albumRows = [
    { AlbumID: "S-1900-AL-01", Year: 1909, MintMark: "", Variety: "", Description: "Lincoln Wheat Cent", CoinID: "C-1909--1C-01", FilledBy: "AY-90501" },
    { AlbumID: "S-1900-AL-01", Year: 1910, MintMark: "", Variety: "", Description: "Lincoln Wheat Cent", CoinID: "C-1910--1C-01", FilledBy: "AY-90502" },
    { AlbumID: "S-1900-AL-01", Year: 1916, MintMark: "D", Variety: "", Description: "Mercury Dime", CoinID: "C-1916-D-10C-01", FilledBy: "AY-90503" },
    { AlbumID: "S-1900-AL-01", Year: 1917, MintMark: "", Variety: "", Description: "Mercury Dime", CoinID: "C-1917--10C-01", FilledBy: "AY-90504" }
  ];
  const dbSetsRows = [
    { SetID: "S-1900-AL-01", Description: "Two-Series Test Folder", Year: 1909, Lineage: "" }
  ];
  return { albumRows, dbSetsRows };
}

module.exports = defineSuite("splash-and-album-prefetch", async ({ ok, openApp, PHONE }) => {
  // ================================================================
  // PART 1 — splash screen: real data-readiness gating
  // ================================================================
  const page = await openApp(PHONE);

  // ---------- A. the splash hides once the real fetch resolves ----------
  // In this sandboxed environment MSAL never loads (confirmed by every
  // other real-Graph test in this suite already relying on it), so
  // ensureLiveNavDataFetch() resolves fast (no cached session, no hang) —
  // exactly the "text data should essentially never hit the 5s ceiling"
  // case the task describes. Splash should already be hidden well inside it.
  const A = await page.evaluate(() => ({
    hidden: document.getElementById("splashScreen").classList.contains("hidden")
  }));
  ok(A.hidden, "A1 the splash has already hidden itself after the real fetch resolved, well under the 5s ceiling");

  // ---------- B. hides as soon as the fetch resolves — not before, and ----------
  // not forced to wait out the full timeout if it's faster (stubbed fetch,
  // deterministic timing).
  const B = await page.evaluate(async () => {
    const origFetch = window.ensureLiveNavDataFetch;
    let resolveFetch;
    window.ensureLiveNavDataFetch = () => new Promise(resolve => { resolveFetch = resolve; });
    runSplashConnect();
    await new Promise(r => setTimeout(r, 150));
    const hiddenBeforeResolve = document.getElementById("splashScreen").classList.contains("hidden");
    resolveFetch(false); // a real "no answer yet" outcome — still a resolution, not a rejection
    await new Promise(r => setTimeout(r, 500)); // well under the 5s ceiling, plenty past the 320ms fade
    const hiddenAfterResolve = document.getElementById("splashScreen").classList.contains("hidden");
    window.ensureLiveNavDataFetch = origFetch;
    return { hiddenBeforeResolve, hiddenAfterResolve };
  });
  ok(B.hiddenBeforeResolve === false, "B1 the splash stays visible while the real fetch is still pending, not hidden on a fixed timer");
  ok(B.hiddenAfterResolve === true, "B2 the splash hides as soon as the fetch resolves — including a `false` (no real answer yet) outcome, since \"resolves\" is the gate, not \"succeeds\"");

  // ---------- C. 5s timeout: falls back to the error box, not a hang ----------
  const C = await page.evaluate(async () => {
    const origFetch = window.ensureLiveNavDataFetch;
    window.ensureLiveNavDataFetch = () => new Promise(() => {}); // never resolves
    const t0 = Date.now();
    runSplashConnect();
    const shownAt = await new Promise(resolve => {
      const iv = setInterval(() => {
        const box = document.getElementById("splashErrorBox");
        if (box && !box.classList.contains("hidden")) { clearInterval(iv); resolve(Date.now() - t0); }
      }, 50);
      setTimeout(() => { clearInterval(iv); resolve(null); }, 6500);
    });
    const splashStillVisible = !document.getElementById("splashScreen").classList.contains("hidden");
    window.ensureLiveNavDataFetch = origFetch;
    return { shownAt, splashStillVisible };
  });
  ok(C.shownAt !== null, "C1 the error box appears within a reasonable window of the 5s ceiling when the fetch never resolves — real timeout, not a silent hang");
  ok(C.shownAt >= 4700 && C.shownAt <= 5700, `C2 the error box appears at ~5000ms, not before and not much after (${C.shownAt}ms)`);
  ok(C.splashStillVisible, "C3 the splash overlay itself stays up (with the error box now showing inside it), never silently dropping into a half-loaded app");

  // ---------- D. a fetch that resolves AFTER the timeout does not silently ----------
  // hide the already-shown error box out from under the user.
  const D = await page.evaluate(async () => {
    let resolveFetch;
    const origFetch = window.ensureLiveNavDataFetch;
    window.ensureLiveNavDataFetch = () => new Promise(resolve => { resolveFetch = resolve; });
    runSplashConnect();
    await new Promise(r => setTimeout(r, 5300)); // past the 5s ceiling
    const errorShownAfterTimeout = !document.getElementById("splashErrorBox").classList.contains("hidden");
    resolveFetch(true); // the late answer finally arrives
    await new Promise(r => setTimeout(r, 400));
    const errorStillShown = !document.getElementById("splashErrorBox").classList.contains("hidden");
    window.ensureLiveNavDataFetch = origFetch;
    return { errorShownAfterTimeout, errorStillShown };
  });
  ok(D.errorShownAfterTimeout, "D1 sanity: the error box is genuinely showing before the late resolution arrives");
  ok(D.errorStillShown, "D2 a late-resolving fetch after the timeout already fired does NOT silently hide the error box — the settled guard holds");

  // ---------- E. ?splashError=1 still works as a dev-only demo toggle, ----------
  // independent of real data state, and Retry re-triggers it.
  await page.goto(APP_URL + "?splashError=1", { waitUntil: "load" });
  const shownE = await page.waitForFunction(() => {
    const el = document.getElementById("splashErrorBox");
    return el && !el.classList.contains("hidden");
  }, { timeout: 3000 }).then(() => true).catch(() => false);
  ok(shownE, "E1 ?splashError=1 still forces the error path for demoing/testing it");
  await page.click("#splashRetryBtn");
  const hiddenRightAfterRetry = await page.evaluate(() => document.getElementById("splashErrorBox").classList.contains("hidden"));
  ok(hiddenRightAfterRetry, "E2 clicking Retry re-runs the connect attempt, hiding the error box again first");
  const shownAgainE = await page.waitForFunction(() => {
    const el = document.getElementById("splashErrorBox");
    return el && !el.classList.contains("hidden");
  }, { timeout: 3000 }).then(() => true).catch(() => false);
  ok(shownAgainE, "E3 Retry genuinely re-runs the same forced-error demo path, not a one-shot");

  // ================================================================
  // PART 2 — album open: bounded image prefetch for the first visible page
  // ================================================================
  const page2 = await openApp(PHONE);

  // ---------- F. showAlbumDetail()/openAlbumAtPage() now return a Promise ----------
  const F = await page2.evaluate(() => {
    const ret = showAlbumDetail(0); // FAKE_ALBUMS' own demo album — no live override needed
    const isPromise = ret && typeof ret.then === "function";
    return { isPromise };
  });
  ok(F.isPromise, "F1 showAlbumDetail() returns a Promise (openAlbumAtPage()'s own image-prefetch gate)");
  await page2.waitForTimeout(200); // let that open settle before the next block reuses the container

  // ---------- G. the loading indicator shows while the prefetch is pending, ----------
  // and the real book reveals only once it resolves — not before.
  const G = await page2.evaluate(async ({ albumRows, dbSetsRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, []);
    __setLiveAlbumsForTest(live);
    navigate("albums");
    const origPrefetch = window.prefetchAlbumSlotImages;
    let resolvePrefetch;
    window.prefetchAlbumSlotImages = () => new Promise(resolve => { resolvePrefetch = resolve; });
    const openPromise = showAlbumDetail(0);
    await new Promise(r => setTimeout(r, 50));
    const loadingVisibleBefore = !!document.querySelector("#albumsDetailContainer .section-loading");
    const bookVisibleBefore = !!document.querySelector("#albumsDetailContainer .album-page-cover");
    resolvePrefetch();
    await openPromise;
    const loadingVisibleAfter = !!document.querySelector("#albumsDetailContainer .section-loading");
    const bookVisibleAfter = !!document.querySelector("#albumsDetailContainer .album-page-cover");
    window.prefetchAlbumSlotImages = origPrefetch;
    __setLiveAlbumsForTest(null);
    return { loadingVisibleBefore, bookVisibleBefore, loadingVisibleAfter, bookVisibleAfter };
  }, twoSeriesAlbumFixture());
  ok(G.loadingVisibleBefore, "G1 the shared spinning-coin loading indicator shows while the prefetch is still pending");
  ok(!G.bookVisibleBefore, "G2 the real book content is NOT revealed while the prefetch is still pending");
  ok(!G.loadingVisibleAfter, "G3 the loading indicator is gone once the prefetch resolves");
  ok(G.bookVisibleAfter, "G4 the real book is revealed once the prefetch resolves");

  // ---------- H. the 5s ceiling: a hung prefetch still reveals the book, ----------
  // with whatever's ready — the SAME progressive-fill fallback the app
  // already has for pages beyond the first (failing open is a no-op, not
  // a regression).
  const H = await page2.evaluate(async ({ albumRows, dbSetsRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, []);
    __setLiveAlbumsForTest(live);
    navigate("albums");
    const origPrefetch = window.prefetchAlbumSlotImages;
    window.prefetchAlbumSlotImages = () => new Promise(() => {}); // never resolves
    const t0 = Date.now();
    await showAlbumDetail(0);
    const elapsed = Date.now() - t0;
    const bookRevealed = !!document.querySelector("#albumsDetailContainer .album-page-cover");
    window.prefetchAlbumSlotImages = origPrefetch;
    __setLiveAlbumsForTest(null);
    return { elapsed, bookRevealed };
  }, twoSeriesAlbumFixture());
  ok(H.elapsed >= 4700 && H.elapsed <= 5700, `H1 a hung prefetch reveals the book at ~5000ms, the same fixed ceiling as Part 1 (${H.elapsed}ms)`);
  ok(H.bookRevealed, "H2 the book is revealed anyway once the ceiling fires, not left stuck on the loading indicator forever");

  // ---------- I. scoping: prefetch targets the page(s) about to be VISIBLE, ----------
  // not a hardcoded "first coins page" — a fresh open (pageIndex 0, the
  // cover) fetches nothing; reopening at a LATER coins page (mirroring the
  // filled-slot Browse-detail "Back" round trip) fetches exactly THAT
  // page's own series, never the album's first chunk. computeAlbumChunkSize()
  // is stubbed to a fixed 2 so page boundaries are known, not derived from
  // live viewport geometry.
  const I = await page2.evaluate(async ({ albumRows, dbSetsRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, []);
    __setLiveAlbumsForTest(live);
    navigate("albums");
    const origChunk = window.computeAlbumChunkSize;
    window.computeAlbumChunkSize = () => 2;
    const origRef = window.ensureReferenceImageFetch;
    const calls = [];
    window.ensureReferenceImageFetch = (seriesKey, side) => { calls.push(seriesKey); return origRef(seriesKey, side); };

    // Fresh open — lands on the cover (pageIndex 0), which has no slots.
    await showAlbumDetail(0);
    const coverCallCount = calls.length;

    // Reopen at pageIndex 4 — buildAlbumPages() layout is
    // [cover, history, coins(chunk0 obv), coins(chunk0 rev), coins(chunk1 obv), ...],
    // so index 4 is chunk1's Obverse page — the Mercury Dime pair, NOT the
    // Lincoln Wheat Cent pair that sits in chunk0 (pages 2-3).
    calls.length = 0;
    await openAlbumAtPage(0, 4);
    const chunk1Calls = calls.slice();

    window.computeAlbumChunkSize = origChunk;
    window.ensureReferenceImageFetch = origRef;
    __setLiveAlbumsForTest(null);
    return { coverCallCount, chunk1Calls };
  }, twoSeriesAlbumFixture());
  ok(I.coverCallCount === 0, "I1 opening fresh (landing on the cover) kicks off zero reference-image fetches — the cover has no slots to prefetch");
  ok(I.chunk1Calls.includes("mercury_dime"), `I2 reopening directly at the second coins page prefetches THAT page's own series (mercury_dime) — got ${JSON.stringify(I.chunk1Calls)}`);
  ok(!I.chunk1Calls.includes("lincoln_wheat_cent"), `I3 it does NOT prefetch the album's first chunk (lincoln_wheat_cent) just because that's chunk 0 — confirms this isn't a hardcoded "first coins page" assumption — got ${JSON.stringify(I.chunk1Calls)}`);

  // Negative control: reverting the scoping to the (plausible-sounding but
  // wrong) "always prefetch the first coins page" reads I2 the same either
  // way — hardcoding chunk0 would ALSO show mercury_dime absent and
  // lincoln_wheat_cent present, i.e. the OPPOSITE of I2/I3, which is exactly
  // what this control reproduces by hardcoding page index 2.
  const NEG_I = await page2.evaluate(async ({ albumRows, dbSetsRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, []);
    __setLiveAlbumsForTest(live);
    navigate("albums");
    window.computeAlbumChunkSize = () => 2;
    const origRef = window.ensureReferenceImageFetch;
    const calls = [];
    window.ensureReferenceImageFetch = (seriesKey, side) => { calls.push(seriesKey); return origRef(seriesKey, side); };
    // Simulate the rejected "always page 2" design directly, rather than
    // editing the real function: prefetch page index 2's slots regardless
    // of the real target (4).
    currentAlbumIndex = 0;
    currentAlbumPages = buildAlbumPages(activeAlbums()[0], 2);
    await prefetchAlbumSlotImages([currentAlbumPages[2]]); // hardcoded chunk0, ignoring the real target page (4)
    window.ensureReferenceImageFetch = origRef;
    __setLiveAlbumsForTest(null);
    return { calls };
  }, twoSeriesAlbumFixture());
  ok(NEG_I.calls.includes("lincoln_wheat_cent") && !NEG_I.calls.includes("mercury_dime"),
    `negative control: hardcoding "always chunk 0" fetches lincoln_wheat_cent instead of mercury_dime — the wrong series for a reopen at page 4, confirming I2/I3 depend on the real computeVisibleIndices()-driven scoping, not a coincidence — got ${JSON.stringify(NEG_I.calls)}`);

  // ---------- J. staleness guard: a superseded open never paints over a ----------
  // newer one that already rendered.
  const J = await page2.evaluate(async ({ albumRows, dbSetsRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, []);
    __setLiveAlbumsForTest(live);
    navigate("albums");
    const origPrefetch = window.prefetchAlbumSlotImages;
    let resolveFirst;
    let call = 0;
    window.prefetchAlbumSlotImages = () => {
      call++;
      if (call === 1) return new Promise(resolve => { resolveFirst = resolve; }); // the stale open — hangs
      return Promise.resolve(); // the newer open — resolves immediately
    };
    const staleOpen = openAlbumAtPage(0, 0); // starts first, never resolves its own prefetch yet
    await new Promise(r => setTimeout(r, 20));
    await openAlbumAtPage(0, 4); // supersedes it, resolves fast
    const nameAfterNewerOpen = document.querySelector("#albumsDetailContainer .book-page-indicator")?.textContent;
    // Now let the STALE prefetch finally resolve — it must NOT re-render
    // over what the newer open already painted.
    resolveFirst();
    await staleOpen;
    await new Promise(r => setTimeout(r, 50));
    const nameAfterStaleResolves = document.querySelector("#albumsDetailContainer .book-page-indicator")?.textContent;
    window.prefetchAlbumSlotImages = origPrefetch;
    __setLiveAlbumsForTest(null);
    return { nameAfterNewerOpen, nameAfterStaleResolves };
  }, twoSeriesAlbumFixture());
  ok(J.nameAfterNewerOpen && J.nameAfterNewerOpen.includes("5"), `J1 the newer open (page index 4, "Page 5...") renders correctly even though the stale open started first — got "${J.nameAfterNewerOpen}"`);
  ok(J.nameAfterStaleResolves === J.nameAfterNewerOpen, `J2 the stale open resolving LATER does not overwrite the newer open's already-rendered page — got "${J.nameAfterStaleResolves}" vs "${J.nameAfterNewerOpen}"`);

  // ---------- K. prefetchAlbumSlotImages() in isolation ----------
  const K = await page2.evaluate(({ albumRows, dbSetsRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, []);
    const coinsPage = { type: "coins", side: "obverse", slots: live[0].slots.slice(0, 2) }; // both Lincoln slots
    const nonCoinsPage = { type: "history" };
    const emptyPage = { type: "coins", side: "obverse", slots: [{ coinId: "x", filledBy: null }] }; // a "want" slot, nothing to fetch
    return {
      nonCoinsIsPromise: typeof prefetchAlbumSlotImages([nonCoinsPage]).then === "function",
      emptyIsPromise: typeof prefetchAlbumSlotImages([emptyPage]).then === "function",
      coinsIsPromise: typeof prefetchAlbumSlotImages([coinsPage]).then === "function",
      noPagesIsPromise: typeof prefetchAlbumSlotImages(null).then === "function"
    };
  }, twoSeriesAlbumFixture());
  ok(K.nonCoinsIsPromise && K.emptyIsPromise && K.coinsIsPromise && K.noPagesIsPromise,
    "K1 prefetchAlbumSlotImages() always returns a Promise — non-coins pages, an unfilled/want-only slot, real filled slots, and a null/empty pages argument all resolve cleanly with no throw");

  // ---------- L. nav / overflow smoke ----------
  const L = await page2.evaluate(() => {
    __setLiveAlbumsForTest(null);
    const routes = ["dashboard", "albums", "browse", "dashboard"];
    const bad = [];
    routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    navigate("dashboard");
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(L.bad.length === 0, "L1 every route still navigates cleanly: " + L.bad.join("; "));
  ok(L.overflow === false, "L2 no horizontal page overflow at 412px");
}, module);
