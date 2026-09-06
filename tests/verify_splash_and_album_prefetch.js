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

  // ---------- A. BUG A FIX: a fast `false` real answer does NOT hide the splash ----------
  // In this sandboxed environment MSAL never loads (confirmed by every
  // other real-Graph test in this suite already relying on it), so the
  // REAL ensureLiveNavDataFetch() always resolves `false` fast (no cached
  // account to acquire a token from) — a different underlying cause than
  // the live-device report (a session that WAS valid, just still silently
  // refreshing), but the exact same SHAPE: a fast, non-`true` resolution.
  // Before this fix, ANY resolution hid the splash; now only a real success
  // does, so shortly after a real page load the splash should still be up
  // — not yet hidden, and not yet the error box either (the 5s ceiling
  // hasn't elapsed, it's still genuinely retrying).
  const A = await page.evaluate(() => ({
    hidden: document.getElementById("splashScreen").classList.contains("hidden"),
    errorShown: !document.getElementById("splashErrorBox").classList.contains("hidden")
  }));
  ok(!A.hidden, "A1 the splash has NOT hidden itself on the real (always-false-here) answer — confirms the gate is on success, not mere resolution");
  ok(!A.errorShown, "A2 nor has it jumped to the error box yet — the 5s ceiling hasn't elapsed, this is still the genuine retry window");

  // ---------- B. a `false` resolution keeps the splash up and retries — ----------
  // only a genuine `true` hides it. (stubbed fetch, deterministic timing)
  const B = await page.evaluate(async () => {
    const origFetch = window.ensureLiveNavDataFetch;
    let callCount = 0;
    const resolvers = [];
    window.ensureLiveNavDataFetch = () => new Promise(resolve => { callCount++; resolvers.push(resolve); });
    runSplashConnect();
    await new Promise(r => setTimeout(r, 150));
    const hiddenBeforeAnyAnswer = document.getElementById("splashScreen").classList.contains("hidden");
    resolvers[0](false); // the first attempt's real "no answer yet" outcome
    await new Promise(r => setTimeout(r, 600)); // past SPLASH_RETRY_INTERVAL_MS (400ms)
    const hiddenAfterFalse = document.getElementById("splashScreen").classList.contains("hidden");
    const retriedCount = callCount;
    resolvers[resolvers.length - 1](true); // the retry's genuine success
    await new Promise(r => setTimeout(r, 500)); // plenty past the 320ms fade
    const hiddenAfterTrue = document.getElementById("splashScreen").classList.contains("hidden");
    window.ensureLiveNavDataFetch = origFetch;
    return { hiddenBeforeAnyAnswer, hiddenAfterFalse, retriedCount, hiddenAfterTrue };
  });
  ok(B.hiddenBeforeAnyAnswer === false, "B1 the splash stays visible while the fetch is still pending, unaffected by this fix");
  ok(B.hiddenAfterFalse === false, "B2 BUG A FIX: a `false` resolution does NOT hide the splash — \"resolves\" is no longer the gate, \"succeeds\" is");
  ok(B.retriedCount >= 2, `B3 a \`false\` answer triggers a retry within the 5s budget rather than sitting idle until the timeout (calls made: ${B.retriedCount})`);
  ok(B.hiddenAfterTrue === true, "B4 a later genuine `true` resolution — from that retry — does hide it");

  // ---------- (generation guard) a superseded runSplashConnect() invocation's ----------
  // own leftover timer must never touch the DOM after a NEWER call has
  // taken over. Real bug caught while building this fix, not guessed at:
  // runSplashConnect() is called more than once in practice (Retry, or a
  // fast double-click on it) — every invocation used to start its own
  // independent 5s timeout with nothing canceling an older one's, so an
  // old invocation's timer could fire the error box back up well after a
  // newer, already-succeeded invocation had hidden the splash.
  const GEN = await page.evaluate(async () => {
    const origFetch = window.ensureLiveNavDataFetch;
    window.ensureLiveNavDataFetch = () => new Promise(() => {}); // OLDER invocation: hangs forever
    runSplashConnect(); // starts a 5s timer that (if unsuperseded) shows the error box at ~5000ms
    await new Promise(r => setTimeout(r, 200));
    window.ensureLiveNavDataFetch = () => Promise.resolve(true); // a NEWER invocation, genuinely fast
    runSplashConnect();
    await new Promise(r => setTimeout(r, 500));
    const hiddenAfterNewerSucceeds = document.getElementById("splashScreen").classList.contains("hidden");
    // Wait past where the OLDER invocation's own 5s timer would fire (it
    // started ~200ms before the newer call, so ~4800ms from here).
    await new Promise(r => setTimeout(r, 4900));
    const stillHiddenPastOldTimer = document.getElementById("splashScreen").classList.contains("hidden");
    const errorShownByStaleTimer = !document.getElementById("splashErrorBox").classList.contains("hidden");
    window.ensureLiveNavDataFetch = origFetch;
    return { hiddenAfterNewerSucceeds, stillHiddenPastOldTimer, errorShownByStaleTimer };
  });
  ok(GEN.hiddenAfterNewerSucceeds, "GEN1 a newer runSplashConnect() call still hides the splash normally, even with an older superseded invocation still pending");
  ok(GEN.stillHiddenPastOldTimer, "GEN2 the splash stays hidden well past when the OLDER (now-stale) invocation's own 5s timeout would have fired");
  ok(!GEN.errorShownByStaleTimer, "GEN3 the stale invocation's own leftover timer never shows the error box out from under the newer, already-succeeded one");

  // Negative control: the pre-fix body (no generation guard at all) DOES
  // reproduce this exact symptom — recreated inline with a short custom
  // timeout (1500ms) so the repro is fast rather than reusing the full 5s.
  const NEG_GEN = await page.evaluate(async () => {
    function preFixRunSplashConnect(timeoutMs) {
      const overlay = document.getElementById("splashScreen");
      const status = document.getElementById("splashStatus");
      const errorBox = document.getElementById("splashErrorBox");
      overlay.classList.remove("fade-out", "hidden");
      errorBox.classList.add("hidden");
      status.style.display = "block";
      let settled = false;
      function hideSplash() { overlay.classList.add("fade-out"); setTimeout(() => overlay.classList.add("hidden"), 320); }
      function showSplashError() { status.style.display = "none"; errorBox.classList.remove("hidden"); }
      ensureLiveNavDataFetch().then(success => { if (settled) return; if (success) { settled = true; hideSplash(); } });
      setTimeout(() => { if (settled) return; settled = true; showSplashError(); }, timeoutMs);
    }
    const origFetch = window.ensureLiveNavDataFetch;
    window.ensureLiveNavDataFetch = () => new Promise(() => {}); // OLDER: hangs forever
    preFixRunSplashConnect(1500);
    await new Promise(r => setTimeout(r, 200));
    window.ensureLiveNavDataFetch = () => Promise.resolve(true); // NEWER: succeeds fast
    preFixRunSplashConnect(1500);
    await new Promise(r => setTimeout(r, 500));
    const hiddenAfterNewerSucceeds = document.getElementById("splashScreen").classList.contains("hidden");
    await new Promise(r => setTimeout(r, 1200)); // past where the OLDER 1500ms timer fires
    const errorShownByStaleTimer = !document.getElementById("splashErrorBox").classList.contains("hidden");
    window.ensureLiveNavDataFetch = origFetch;
    return { hiddenAfterNewerSucceeds, errorShownByStaleTimer };
  });
  ok(NEG_GEN.hiddenAfterNewerSucceeds, "GEN4 negative control sanity: the pre-fix body also hides correctly when the newer call succeeds...");
  ok(NEG_GEN.errorShownByStaleTimer, "GEN5 negative control: ...but the OLDER invocation's own stale timer DOES fire the error box back up — reproducing the exact bug the generation guard fixes");

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
  // widened for a fresh open (BUG B FIX). A fresh open (pageIndex 0, the
  // cover) now ALSO warms the album's first real coins page — the cover
  // itself still has no slots of its own and displays first, unchanged,
  // but by the time the user turns past it that page's images are already
  // cached — while reopening at a LATER coins page (mirroring the
  // filled-slot Browse-detail "Back" round trip) still fetches exactly
  // THAT page's own series, never the album's first chunk on top of it.
  // computeAlbumChunkSize() is stubbed to a fixed 2 so page boundaries are
  // known, not derived from live viewport geometry.
  const I = await page2.evaluate(async ({ albumRows, dbSetsRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, []);
    __setLiveAlbumsForTest(live);
    navigate("albums");
    const origChunk = window.computeAlbumChunkSize;
    window.computeAlbumChunkSize = () => 2;
    const origRef = window.ensureReferenceImageFetch;
    const calls = [];
    window.ensureReferenceImageFetch = (seriesKey, side) => { calls.push(seriesKey); return origRef(seriesKey, side); };

    // Fresh open — lands on the cover (pageIndex 0), which has no slots of
    // its own, but BUG B's fix also warms the first real coins page.
    await showAlbumDetail(0);
    const freshOpenCalls = calls.slice();

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
    return { freshOpenCalls, chunk1Calls };
  }, twoSeriesAlbumFixture());
  ok(I.freshOpenCalls.includes("lincoln_wheat_cent"), `I1 BUG B FIX: opening fresh (landing on the cover) also warms the album's FIRST real coins page (lincoln_wheat_cent) — the cover itself has no slots, but the page the user turns to next is pre-fetched — got ${JSON.stringify(I.freshOpenCalls)}`);
  ok(!I.freshOpenCalls.includes("mercury_dime"), `I1b the fresh-open widening is scoped to only the FIRST coins page, not the whole album — mercury_dime (chunk 1) is not prefetched on a fresh open — got ${JSON.stringify(I.freshOpenCalls)}`);
  ok(I.chunk1Calls.includes("mercury_dime"), `I2 reopening directly at the second coins page prefetches THAT page's own series (mercury_dime) — got ${JSON.stringify(I.chunk1Calls)}`);
  ok(!I.chunk1Calls.includes("lincoln_wheat_cent"), `I3 it does NOT ALSO prefetch the album's first chunk (lincoln_wheat_cent) on a reopen at a later page — the fresh-open widening only applies when the visible set is genuinely just the cover — got ${JSON.stringify(I.chunk1Calls)}`);

  // Negative control: reverting the scoping to the (plausible-sounding but
  // wrong) "always prefetch the first coins page regardless of context"
  // reads I3 the same either way — always-chunk-0 would ALSO show
  // lincoln_wheat_cent present on the pageIndex-4 reopen, i.e. the opposite
  // of I3, which is exactly what this control reproduces.
  const NEG_I = await page2.evaluate(async ({ albumRows, dbSetsRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, []);
    __setLiveAlbumsForTest(live);
    navigate("albums");
    window.computeAlbumChunkSize = () => 2;
    const origRef = window.ensureReferenceImageFetch;
    const calls = [];
    window.ensureReferenceImageFetch = (seriesKey, side) => { calls.push(seriesKey); return origRef(seriesKey, side); };
    // Simulate the rejected "always page 2, regardless of the real target"
    // design directly, rather than editing the real function: prefetch
    // page index 2's slots (chunk0) even though the real reopen target is
    // page 4 (chunk1).
    currentAlbumIndex = 0;
    currentAlbumPages = buildAlbumPages(activeAlbums()[0], 2);
    await prefetchAlbumSlotImages([currentAlbumPages[2]]); // hardcoded chunk0, ignoring the real target page (4)
    window.ensureReferenceImageFetch = origRef;
    __setLiveAlbumsForTest(null);
    return { calls };
  }, twoSeriesAlbumFixture());
  ok(NEG_I.calls.includes("lincoln_wheat_cent") && !NEG_I.calls.includes("mercury_dime"),
    `negative control: hardcoding "always chunk 0" fetches lincoln_wheat_cent instead of mercury_dime — the wrong series for a reopen at page 4, confirming I2/I3 depend on the real computeVisibleIndices()-driven scoping (widened only for the cover-only case), not a coincidence — got ${JSON.stringify(NEG_I.calls)}`);

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

  // ================================================================
  // PART 3 — album book: live image redraw on the currently displayed
  // page (BUG C FIX). renderSlotCell() is a string-templated render, not
  // a live element reference like applyDiscContent() — a slot's own image
  // fetch resolving used to have nothing to notify, so a placeholder disc
  // just sat there until the user flipped away and back (which forces a
  // fresh render that finally reads the by-then-cached image). This
  // verifies a resolving fetch now redraws the page IN PLACE, with no
  // navigation, when the user is still looking at it — and does NOT when
  // they aren't.
  // ================================================================

  // ---------- M. albumBookIsShowingSlot() in isolation ----------
  // buildAlbumPages() layout with chunkSize=2 on this fixture is
  // [cover, history, coins(chunk0 obv - Lincoln), coins(chunk0 rev), ...],
  // so page index 2 is the Lincoln pair's Obverse page.
  const M = await page2.evaluate(async ({ albumRows, dbSetsRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, []);
    __setLiveAlbumsForTest(live);
    navigate("albums");
    window.computeAlbumChunkSize = () => 2;

    const notYetOpen = albumBookIsShowingSlot(s => s.filledBy === "AY-90501");

    await openAlbumAtPage(0, 2); // Lincoln Wheat Cent pair, Obverse
    const onVisiblePage = albumBookIsShowingSlot(s => s.filledBy === "AY-90501");
    const nonexistentSlot = albumBookIsShowingSlot(s => s.filledBy === "totally-fake-collection-id");
    const realSlotOnDifferentPage = albumBookIsShowingSlot(s => s.filledBy === "AY-90503"); // Mercury pair, page 4 — not visible

    showAlbumsList();
    const afterClosingBook = albumBookIsShowingSlot(s => s.filledBy === "AY-90501");

    __setLiveAlbumsForTest(null);
    return { notYetOpen, onVisiblePage, nonexistentSlot, realSlotOnDifferentPage, afterClosingBook };
  }, twoSeriesAlbumFixture());
  ok(M.notYetOpen === false, "M1 before any book is open (still on the list), albumBookIsShowingSlot() is false regardless of the slot");
  ok(M.onVisiblePage === true, "M2 once the book is open on the matching page, albumBookIsShowingSlot() correctly finds the slot");
  ok(M.nonexistentSlot === false, "M3 a slot ID that doesn't exist anywhere in the album returns false, not a throw");
  ok(M.realSlotOnDifferentPage === false, "M4 a REAL slot that exists in the album but sits on a currently-NOT-visible page (Mercury pair, page 4) returns false");
  ok(M.afterClosingBook === false, "M5 after closing the book back to the list, the same slot that was just visible now returns false again");

  // ---------- N. end-to-end: an image resolving while its page IS on screen ----------
  // redraws that page in place, autonomously — the test never calls
  // renderAlbumBook() itself after resolving the stub.
  //
  // IMPORTANT, found while BUILDING this test (a real bug in the test's own
  // first draft, not in the app): a stub that fully replaces
  // ensureReferenceImageFetch() but never reproduces its real CACHING side
  // effect (writing into referenceImageCache once a real answer lands)
  // creates an infinite render->fetch->render cycle — hasReferenceImage()
  // never sees a cache hit, so renderSlotCell()'s own miss branch keeps
  // re-calling ensureReferenceImageFetch() on every single redraw, and
  // since an ALREADY-RESOLVED promise's .then() fires on the very next
  // microtask, that becomes an unbounded cascade that starves the event
  // loop's macrotask queue (a real, reproduced hang — the test process sat
  // at 100%+ CPU for several minutes before this was root-caused). Fixed by
  // making the stub mimic the real function's cache-writing side effect
  // once "settled," not just its return value — the cascade then
  // self-terminates in a few renders, exactly like production.
  const N = await page2.evaluate(async ({ albumRows, dbSetsRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, []);
    __setLiveAlbumsForTest(live);
    navigate("albums");
    window.computeAlbumChunkSize = () => 2;
    delete referenceImageCache["lincoln_wheat_cent_obverse"]; // clean slate

    // Real (unstubbed) open first — in this sandbox ENABLE_REFERENCE_IMAGES
    // is on but no real MSAL session exists, so fetchReferenceImageBlob()
    // resolves {attempted:false} fast and is deliberately never cached (see
    // its own comment) — leaving every slot on this page a genuine,
    // still-open cache miss, exactly the real-world "mid-load" state this
    // bug is about.
    await openAlbumAtPage(0, 2); // Lincoln Wheat Cent pair, Obverse
    const discBefore = document.querySelector('[data-coin-id="C-1909--1C-01"] .coin-disc');
    const hadImageBefore = !!(discBefore && discBefore.style.backgroundImage);

    // Stub the fetch to a controllable pending promise, force a fresh
    // cache-miss render (mirroring the album's own re-render — the real
    // trigger for a fresh renderSlotCell() call per slot), then "resolve"
    // by flipping settled=true and firing the ONE shared pending promise —
    // once settled, the stub writes into referenceImageCache exactly like
    // the real function does, so the cascade above terminates naturally.
    const origRef = window.ensureReferenceImageFetch;
    let resolvePending;
    const pendingPromise = new Promise(resolve => { resolvePending = resolve; });
    let settled = false;
    let resolvedUrl = null;
    window.ensureReferenceImageFetch = (seriesKey, side) => {
      const key = seriesKey + "_" + side;
      if (settled) {
        referenceImageCache[key] = resolvedUrl;
        return Promise.resolve(resolvedUrl);
      }
      return pendingPromise;
    };
    renderAlbumBook();
    const discMidFlight = document.querySelector('[data-coin-id="C-1909--1C-01"] .coin-disc');
    const hadImageMidFlight = !!(discMidFlight && discMidFlight.style.backgroundImage);

    // Resolve — the test itself never calls renderAlbumBook() again from
    // here on; any redraw from this point is the app's own autonomous
    // wiring.
    settled = true;
    resolvedUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="; // a real, valid data URI — a fake blob: string makes Chromium log a real "not allowed to load local resource" console error, which the harness treats as a page-error failure
    resolvePending(resolvedUrl);
    await new Promise(r => setTimeout(r, 200));
    const discAfter = document.querySelector('[data-coin-id="C-1909--1C-01"] .coin-disc');
    const backgroundAfter = discAfter ? discAfter.style.backgroundImage : "";

    window.ensureReferenceImageFetch = origRef;
    delete referenceImageCache["lincoln_wheat_cent_obverse"];
    __setLiveAlbumsForTest(null);
    return { hadImageBefore, hadImageMidFlight, backgroundAfter };
  }, twoSeriesAlbumFixture());
  ok(N.hadImageBefore === false, "N1 sanity: with no real MSAL session, the Lincoln slot genuinely has no cached image yet after a real (unstubbed) open");
  ok(N.hadImageMidFlight === false, "N2 sanity: still no image while the stubbed fetch is pending — the miss hasn't resolved yet");
  ok(N.backgroundAfter.includes("data:image/png;base64"), `N3 BUG C FIX: once the stubbed fetch resolves, the page redraws AUTONOMOUSLY (the test never re-called renderAlbumBook()) and the slot's disc now shows the resolved image — got "${N.backgroundAfter}"`);

  // Negative control: the same setup, but the user navigates AWAY from the
  // book (back to the albums list) before the fetch resolves —
  // albumBookIsShowingSlot()'s guard must suppress the redraw entirely, not
  // just happen to redraw the same content either way.
  const NEG_N = await page2.evaluate(async ({ albumRows, dbSetsRows }) => {
    const live = buildLiveAlbums(albumRows, dbSetsRows, []);
    __setLiveAlbumsForTest(live);
    navigate("albums");
    window.computeAlbumChunkSize = () => 2;
    delete referenceImageCache["lincoln_wheat_cent_obverse"];
    await openAlbumAtPage(0, 2);

    const origRef = window.ensureReferenceImageFetch;
    let resolvePending;
    const pendingPromise = new Promise(resolve => { resolvePending = resolve; });
    let settled = false;
    let resolvedUrl = null;
    window.ensureReferenceImageFetch = (seriesKey, side) => {
      const key = seriesKey + "_" + side;
      if (settled) {
        referenceImageCache[key] = resolvedUrl;
        return Promise.resolve(resolvedUrl);
      }
      return pendingPromise;
    };
    renderAlbumBook();

    // Leave the book before the fetch resolves.
    showAlbumsList();
    const htmlBeforeResolve = document.getElementById("albumsDetailContainer").innerHTML;

    settled = true;
    resolvedUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="; // a real, valid data URI — a fake blob: string makes Chromium log a real "not allowed to load local resource" console error, which the harness treats as a page-error failure
    resolvePending(resolvedUrl);
    await new Promise(r => setTimeout(r, 200));
    const htmlAfterResolve = document.getElementById("albumsDetailContainer").innerHTML;

    window.ensureReferenceImageFetch = origRef;
    delete referenceImageCache["lincoln_wheat_cent_obverse"];
    __setLiveAlbumsForTest(null);
    return { unchanged: htmlBeforeResolve === htmlAfterResolve };
  }, twoSeriesAlbumFixture());
  ok(NEG_N.unchanged, "negative control: once the user has left the book (back to the list), a fetch resolving afterward does NOT redraw #albumsDetailContainer — proving albumBookIsShowingSlot()'s guard genuinely suppresses the redraw rather than it always happening regardless");
}, module);
