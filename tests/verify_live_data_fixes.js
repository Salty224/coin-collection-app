// Two live-device bugs from Ray's Docket review (2026-09-06), both the same
// underlying shape: a display path that was never wired to live data and so
// kept reading a demo-only lookup in a real session.
//
// Bug 1 — the Dashboard flip above the cabinet nav showed FAKE coins in a
// live session. `const spotlightCoins = FAKE_COINS.slice(0, 5)` was a
// module-level const evaluated once at load with no live path at all.
//
// Bug 2 — AY-00002, Ray's real 1909 Lincoln Wheat CENT, showed
// "Silver — 0.3617 oz", 12.5 g, 30.6 mm, Reeded under Specifications.
// Confirmed by exact value match: FAKE_METAL_CONTENT["AY-00002"] is a
// Walking Liberty HALF. metalContentFor() looked its argument up in that
// mock by CollectionID with no live path, so a real coin inherited a demo
// coin's figures purely because their IDs collided.
//
// See CLAUDE.md "Live Spotlight + real Specifications source".

const { defineSuite } = require("./harness");

// Real-shaped DB_Coins / Lookup_MetalContent rows. Header names are the
// confirmed real ones the mapper reads (see colVal()'s candidates).
const CENT_ROW = {
  CoinID: "C-1909-S-1C-01", Composition: "95% Copper, 5% Tin and Zinc",
  Weight: 3.11, Diameter: 19.05, Thickness: 1.55, Edge: "Plain",
  MetalContentType: "Wheat Cent", ReedCount: "", SilverOz: "", GoldOz: ""
};
const TOPUP_ROW = {
  CoinID: "C-1921-P-$1-01", Composition: "", Weight: "",
  Diameter: 38.1, Edge: "Reeded", MetalContentType: "Morgan Dollar", SilverOz: ""
};
const TYPE_ROWS = [
  { CoinType: "Wheat Cent", MetalCategory: "Copper", Composition: "95% Copper", TotalWeight: 3.11, SilverOz: "" },
  { CoinType: "Morgan Dollar", MetalCategory: "Silver", Composition: "90% Silver", TotalWeight: 26.73, SilverOz: 0.7734 }
];

module.exports = defineSuite("live-data-fixes", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ---------- A. metalContentFor(): the demo fallback is gated on demo MODE ----------
  // The fix is specifically NOT a per-coin fallback. A per-coin fallback is
  // exactly what let a live coin borrow a demo coin's row when their IDs
  // collided; gating on "are we in demo mode at all" is what closes it.
  const A = await page.evaluate(() => {
    __setLiveCoinsForTest(null);
    const demo = metalContentFor(FAKE_COINS.find(c => c.id === "AY-00002"));

    // A real cent that happens to carry the colliding CollectionID, with no
    // specs resolved for it — the exact reported case.
    const liveCent = { id: "AY-00002", denom: "1C", year: 1909, mint: "S", coinId: "C-1909-S-1C-01" };
    __setLiveCoinsForTest([liveCent]);
    const liveNoSpecs = metalContentFor(liveCent);
    const liveNoSpecsRows = specificationRows(liveCent);

    const liveWithSpecs = metalContentFor(Object.assign({}, liveCent, {
      specs: { composition: "95% Copper, 5% Tin and Zinc", weight: 3.11, diameterMm: 19.05, edge: "Plain", silverOz: null }
    }));
    __setLiveCoinsForTest(null);
    return { demo, liveNoSpecs, liveNoSpecsRows, liveWithSpecs };
  });
  ok(A.demo && A.demo.silverOz === 0.3617, "A1 demo mode is unchanged: AY-00002 still resolves to its FAKE_METAL_CONTENT row (the mockup keeps working)");
  ok(Object.keys(A.liveNoSpecs).length === 0, "A2 THE BUG: in a live session a coin with no resolved specs gets {} — it no longer inherits the demo AY-00002 (Walking Liberty Half) row");
  ok(A.liveNoSpecsRows.length === 0, "A3 and so the Specifications panel renders NO rows for it, rather than a half dollar's weight/diameter/edge");
  ok(A.liveWithSpecs.weight === 3.11 && A.liveWithSpecs.diameterMm === 19.05 && A.liveWithSpecs.edge === "Plain",
     "A4 a live coin with real specs gets its OWN figures (3.11 g / 19.05 mm / Plain), not the demo row's 12.5 g / 30.6 mm / Reeded");

  // The reported symptom, asserted as the exact strings Ray saw.
  const A2 = await page.evaluate(() => {
    const liveCent = { id: "AY-00002", denom: "1C", year: 1909, mint: "S", coinId: "C-1909-S-1C-01",
      specs: { composition: "95% Copper, 5% Tin and Zinc", weight: 3.11, diameterMm: 19.05, edge: "Plain" } };
    __setLiveCoinsForTest([liveCent]);
    const rows = specificationRows(liveCent);
    const comp = compositionTextFor(liveCent);
    __setLiveCoinsForTest(null);
    return { rows, comp };
  });
  ok(!/Silver/.test(A2.comp), "A5 compositionTextFor() no longer reports \"Silver — 0.3617 oz\" for the cent");
  ok(A2.comp === "95% Copper, 5% Tin and Zinc", "A5b it reports the cent's own stated composition instead — a coin with no precious-metal oz used to render a BLANK Composition row even with a real string in the same record");
  ok(!A2.rows.some(r => /12\.5|30\.6|Reeded/.test(String(r[1]))), "A6 none of the demo half dollar's figures survive anywhere in the cent's Specifications rows");

  // Negative control: the pre-fix body (unconditional per-coin mock lookup)
  // must reproduce the reported symptom exactly.
  const NEG_A = await page.evaluate(() => {
    const orig = window.metalContentFor;
    window.metalContentFor = function (coin) {
      if (!coin) return {};
      return FAKE_METAL_CONTENT[coin.id] || {};   // pre-fix
    };
    const liveCent = { id: "AY-00002", denom: "1C", year: 1909, mint: "S", coinId: "C-1909-S-1C-01" };
    __setLiveCoinsForTest([liveCent]);
    const comp = compositionTextFor(liveCent);
    const rows = specificationRows(liveCent);
    __setLiveCoinsForTest(null);
    window.metalContentFor = orig;
    return { comp, rows };
  });
  ok(/Silver — 0\.3617 oz/.test(NEG_A.comp), "A7 negative control: the pre-fix lookup DOES reproduce Ray's exact \"Silver — 0.3617 oz\" on the cent — proves A2/A5 exercise the real fix");
  ok(NEG_A.rows.some(r => String(r[1]) === "12.5 g"), "A8 negative control: it also reproduces the Walking Liberty's 12.5 g weight");

  // The precious-metal breakdown is what melt value hinges on, so it must
  // survive alongside the stated string rather than being replaced by it.
  const A3 = await page.evaluate(() => {
    __setLiveCoinsForTest(null);
    const morgan = compositionTextFor(FAKE_COINS.find(c => c.id === "AY-00001"));   // 90% Silver + 0.7734 oz
    const bronze = compositionTextFor(FAKE_COINS.find(c => c.id === "AY-00005"));   // Bronze, no oz at all
    return { morgan, bronze };
  });
  ok(/0\.7734 oz/.test(A3.morgan) && /90% Silver/.test(A3.morgan),
     "A9 a silver coin keeps its oz breakdown AND gains its stated composition (melt value is why this row exists for Rolls): " + A3.morgan);
  ok(A3.bronze === "Bronze", "A10 a coin with no precious-metal content shows its stated composition rather than the blank row it used to render");

  // ---------- B. buildCoinSpecsIndexes() / resolveCoinSpecs() ----------
  const B = await page.evaluate(([cent, topup, types]) => {
    const idx = buildCoinSpecsIndexes([cent, topup], types);
    return {
      own: resolveCoinSpecs("C-1909-S-1C-01", "Wheat Cent", idx),
      toppedUp: resolveCoinSpecs("C-1921-P-$1-01", "Morgan Dollar", idx),
      noRow: resolveCoinSpecs("C-9999-X-1C-99", "Wheat Cent", idx),
      noType: resolveCoinSpecs("C-1909-S-1C-01", "", idx),
      unknownType: resolveCoinSpecs("C-1909-S-1C-01", "Not A Real Type", idx)
    };
  }, [CENT_ROW, TOPUP_ROW, TYPE_ROWS]);
  ok(B.own.weight === 3.11 && B.own.diameterMm === 19.05 && B.own.edge === "Plain" && B.own.thicknessMm === 1.55,
     "B1 a coin's specs come from its OWN DB_Coins row (weight/diameter/thickness/edge)");
  ok(B.own.silverOz === null && B.own.reedCount === null,
     "B2 blank numeric cells become null, never NaN or 0 — a blank column must not render as a real figure");
  ok(B.toppedUp.composition === "90% Silver" && B.toppedUp.weight === 26.73 && B.toppedUp.silverOz === 0.7734,
     "B3 fields DB_Coins leaves blank are topped up per coin TYPE from Lookup_MetalContent");
  ok(B.toppedUp.diameterMm === 38.1 && B.toppedUp.edge === "Reeded",
     "B4 the top-up never touches fields only DB_Coins carries (diameter/edge survive it)");
  ok(B.own.composition === "95% Copper, 5% Tin and Zinc",
     "B5 a value DB_Coins genuinely HAS is never overridden by the type row's own (\"95% Copper\")");
  ok(B.noRow === null, "B6 a CoinID that resolves to no catalog row gets NULL specs — deliberately empty rather than borrowed (this is the whole point of the fix)");
  ok(B.noType && B.noType.weight === 3.11 && B.unknownType && B.unknownType.weight === 3.11,
     "B7 a blank or unrecognized MetalContentType degrades to the coin's own values, no throw");

  // Negative control: a per-coin fallback inside resolveCoinSpecs would
  // reintroduce exactly the borrowing this fix removes.
  const NEG_B = await page.evaluate(([cent, types]) => {
    const idx = buildCoinSpecsIndexes([cent], types);
    const orig = window.resolveCoinSpecs;
    window.resolveCoinSpecs = function (coinId, contentType, indexes) {
      const own = indexes.byCoinId[coinId];
      if (own) return own;
      return indexes.byContentType[contentType] || null;   // borrowing "fallback"
    };
    const borrowed = resolveCoinSpecs("C-9999-X-1C-99", "Wheat Cent", idx);
    window.resolveCoinSpecs = orig;
    return { borrowed };
  }, [CENT_ROW, TYPE_ROWS]);
  ok(NEG_B.borrowed && NEG_B.borrowed.composition === "95% Copper",
     "B8 negative control: a borrowing fallback DOES hand an unmatched CoinID somebody else's figures — proves B6 is load-bearing");

  // ---------- C. Spotlight reads live data, chosen at RANDOM ----------
  // Supersedes an earlier "first five in workbook order" version of this
  // fix — Ray's explicit follow-up: a fixed first-five is the same five
  // coins forever, every session. Now random, session-stable (see
  // spotlightCoinList()'s own comment for the exact contract). Order can no
  // longer be asserted literally, so these check membership/exclusion
  // instead, with Math.random mocked where an exact outcome matters.
  const C = await page.evaluate(() => {
    __resetSpotlightSelectionForTest();
    __setLiveCoinsForTest(null);
    const demo = spotlightCoinList().map(c => c.id);
    const demoIds = FAKE_COINS.map(c => c.id);

    // Exactly SPOTLIGHT_COUNT (5) valid candidates -- so membership is
    // deterministic (all 5 MUST be picked; only their order is random) even
    // without mocking Math.random here, alongside a Set and a blank-id row
    // that must be excluded regardless of how many valid rows remain.
    __setLiveCoinsForTest([
      { id: "AY-00500", denom: "1C", year: 1909, mint: "S", name: "Lincoln Wheat Cent" },
      { id: "AY-00501", denom: "Multiple", year: 2021, mint: "", name: "2021 Silver Proof Set" },
      { id: "AY-00502", denom: "10C", year: 1916, mint: "D", name: "Mercury Dime" },
      { id: "", denom: "5C", year: 1938, mint: "", name: "Blank row" },
      { id: "AY-00503", denom: "25C", year: 1932, mint: "D", name: "Washington Quarter" },
      { id: "AY-00504", denom: "50C", year: 1921, mint: "", name: "Walking Liberty Half" },
      { id: "AY-00506", denom: "Medal", year: 1976, mint: "", name: "Bicentennial Medal" }
    ]);
    const live = spotlightCoinList().map(c => c.id);
    const hasSet = spotlightCoinList().some(c => isSetRow(c));
    __setLiveCoinsForTest(null);
    const restored = spotlightCoinList().map(c => c.id);
    return { demo, demoIds, live, hasSet, restored };
  });
  const LIVE_CANDIDATES = ["AY-00500", "AY-00502", "AY-00503", "AY-00504", "AY-00506"];
  ok(C.demo.length === 5 && C.demo.every(id => C.demoIds.includes(id)),
     "C1 demo mode picks 5 real FAKE_COINS ids (order no longer asserted — it's now random, not always the first five)");
  ok(C.live.length === 5 && LIVE_CANDIDATES.every(id => C.live.includes(id)),
     "C2 THE BUG: in a live session Spotlight shows all 5 of the real live coins, not FAKE_COINS (got " + C.live.join(",") + ")");
  ok(new Set(C.live).size === 5, "C2b no duplicate picked twice");
  ok(C.hasSet === false && !C.live.includes("AY-00501"),
     "C3 a Denomination=\"Multiple\" Set row is EXCLUDED — load-bearing: the Set flip-card removal relies on Spotlight never seeing one");
  ok(!C.live.includes(""), "C4 a blank/malformed row with no CollectionID never reaches Spotlight");
  ok(C.live.includes("AY-00506"), "C4b a Denomination=\"Medal\" row IS a valid candidate — \"all coins and medals\", only Sets are excluded");
  ok(C.restored.length === 5 && C.restored.every(id => C.demoIds.includes(id)),
     "C5 clearing the live override falls back to FAKE_COINS again (a fresh random pick from it, not still holding onto live ids)");

  // ---------- C-RAND. genuinely random, not a disguised first-N ----------
  // Math.random mocked to two different fixed values, each fully
  // determining the Fisher-Yates trace (worked out by hand): 0 swaps every
  // element down to index 0 in turn (drops the FIRST pool entry); a value
  // just under 1 makes every swap a no-op (keeps the array in original
  // order, drops the LAST pool entry). Two different, fully-known outcomes
  // from the same 6-item pool proves the selection genuinely depends on
  // Math.random, not just pool order.
  const RAND = await page.evaluate(() => {
    const pool = [
      { id: "R1", denom: "1C" }, { id: "R2", denom: "1C" }, { id: "R3", denom: "1C" },
      { id: "R4", denom: "1C" }, { id: "R5", denom: "1C" }, { id: "R6", denom: "1C" }
    ];
    const origRandom = Math.random;

    __resetSpotlightSelectionForTest();
    __setLiveCoinsForTest(pool.slice());
    Math.random = () => 0;
    const zeroPick = spotlightCoinList().map(c => c.id);

    __resetSpotlightSelectionForTest();
    __setLiveCoinsForTest(pool.slice());
    Math.random = () => 0.999999;
    const nearOnePick = spotlightCoinList().map(c => c.id);

    Math.random = origRandom;
    __setLiveCoinsForTest(null);
    return { zeroPick, nearOnePick };
  });
  ok(RAND.zeroPick.join(",") === "R2,R3,R4,R5,R6",
     "R1 Math.random pinned to 0 produces the worked-out Fisher-Yates result (drops the first pool entry): " + RAND.zeroPick.join(","));
  ok(RAND.nearOnePick.join(",") === "R1,R2,R3,R4,R5",
     "R2 Math.random pinned to 0.999999 produces the OTHER worked-out result (drops the last pool entry, keeps original order): " + RAND.nearOnePick.join(","));
  ok(RAND.zeroPick.join(",") !== RAND.nearOnePick.join(","),
     "R3 the two mocked seeds genuinely produce different selections from the identical pool — this could not happen if the code were still a disguised pool.slice(0, N)");

  // Negative control: revert to the pre-randomization `pool.slice(0, N)`
  // body — both mocked-random cases above must then produce the SAME
  // (unshuffled, first-N) result, since a plain slice never reads
  // Math.random at all.
  const NEG_RAND = await page.evaluate(() => {
    const pool = [
      { id: "R1", denom: "1C" }, { id: "R2", denom: "1C" }, { id: "R3", denom: "1C" },
      { id: "R4", denom: "1C" }, { id: "R5", denom: "1C" }, { id: "R6", denom: "1C" }
    ];
    const orig = window.spotlightCoinList;
    window.spotlightCoinList = function () {
      return activeCoins().filter(c => c && c.id && !isSetRow(c)).slice(0, SPOTLIGHT_COUNT);
    };
    __setLiveCoinsForTest(pool.slice());
    const a = spotlightCoinList().map(c => c.id);
    __setLiveCoinsForTest(pool.slice());
    const b = spotlightCoinList().map(c => c.id);
    window.spotlightCoinList = orig;
    __setLiveCoinsForTest(null);
    return { a, b };
  });
  ok(NEG_RAND.a.join(",") === "R1,R2,R3,R4,R5" && NEG_RAND.b.join(",") === "R1,R2,R3,R4,R5",
     "R4 negative control: the pre-fix plain slice(0, N) always returns the same first-N order regardless of Math.random — proves R1-R3 exercise real randomization, not incidental pool ordering");

  // ---------- C-STABLE. session-stable: no reshuffle on repeated calls ----------
  const STABLE = await page.evaluate(() => {
    const pool = [{ id: "S1" }, { id: "S2" }, { id: "S3" }, { id: "S4" }, { id: "S5" }, { id: "S6" }];
    const origRandom = Math.random;
    __resetSpotlightSelectionForTest();
    __setLiveCoinsForTest(pool.slice());
    Math.random = () => 0;
    const first = spotlightCoinList().map(c => c.id);
    // Same source (no __setLiveCoinsForTest/__reset in between) — a real
    // re-render, or the auto-cycle advancing — with Math.random now
    // returning something that would shuffle differently if re-rolled.
    Math.random = () => 0.5;
    const second = spotlightCoinList().map(c => c.id);
    const third = spotlightCoinList().map(c => c.id);
    Math.random = origRandom;
    __setLiveCoinsForTest(null);
    return { first, second, third };
  });
  ok(STABLE.second.join(",") === STABLE.first.join(",") && STABLE.third.join(",") === STABLE.first.join(","),
     "S1 the SAME live-data array is picked from only ONCE — changing Math.random afterward with no data change has zero effect, proving the pick is cached per session, not re-rolled every render");

  const NEG_STABLE = await page.evaluate(() => {
    const pool = [{ id: "S1" }, { id: "S2" }, { id: "S3" }, { id: "S4" }, { id: "S5" }, { id: "S6" }];
    const orig = window.spotlightCoinList;
    // The pre-caching body: reshuffles on every call, no source check.
    window.spotlightCoinList = function () {
      const p = activeCoins().filter(c => c && c.id && !isSetRow(c));
      const shuffled = p.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
      }
      return shuffled.slice(0, SPOTLIGHT_COUNT);
    };
    const origRandom = Math.random;
    __setLiveCoinsForTest(pool.slice());
    Math.random = () => 0;
    const first = spotlightCoinList().map(c => c.id);
    Math.random = () => 0.999999;
    const second = spotlightCoinList().map(c => c.id);
    Math.random = origRandom;
    window.spotlightCoinList = orig;
    __setLiveCoinsForTest(null);
    return { first, second };
  });
  ok(NEG_STABLE.first.join(",") !== NEG_STABLE.second.join(","),
     "S2 negative control: a version with no session-cache DOES reshuffle on every call when Math.random changes — proves S1 is exercising the real caching, not a coincidence");

  const NEG_C = await page.evaluate(() => {
    const orig = window.spotlightCoinList;
    window.spotlightCoinList = function () { return FAKE_COINS.slice(0, 5); };  // pre-live-data-fix
    __resetSpotlightSelectionForTest();
    __setLiveCoinsForTest([{ id: "AY-00500", denom: "1C", year: 1909, mint: "S", name: "Lincoln Wheat Cent" }]);
    const live = spotlightCoinList().map(c => c.id);
    __setLiveCoinsForTest(null);
    window.spotlightCoinList = orig;
    return { live };
  });
  ok(NEG_C.live[0] === "AY-00001" && NEG_C.live.length === 5,
     "C6 negative control: the pre-fix FAKE_COINS.slice(0,5) ignores the live override entirely — proves C2 exercises the real fix");

  // ---------- D. the index survives the list changing underneath it ----------
  const D = await page.evaluate(() => {
    __setLiveCoinsForTest(null);
    renderSpotlight();
    // Advance to the last demo coin, then let a shorter live list land — the
    // exact shape of a real fetch resolving while Spotlight is mid-rotation.
    spotlightIndex = 4;
    __setLiveCoinsForTest([{ id: "AY-00500", denom: "1C", year: 1909, mint: "S", name: "Lincoln Wheat Cent" }]);
    let threw = null;
    try { renderSpotlight(); } catch (e) { threw = e.message; }
    const idx = spotlightIndex;
    __setLiveCoinsForTest(null);
    spotlightIndex = 0;
    renderSpotlight();
    return { threw, idx };
  });
  ok(D.threw === null, "D1 renderSpotlight() does not throw when live data lands with a shorter list than the current index: " + D.threw);
  ok(D.idx === 0, "D2 the index is clamped back into range rather than left pointing past the end");

  // ---------- E. the Dashboard primes and re-renders on live data ----------
  const E = await page.evaluate(() => {
    let fetches = 0, renders = 0;
    const of = window.ensureLiveNavDataFetch, orr = window.renderSpotlight;
    window.ensureLiveNavDataFetch = function () { fetches++; return Promise.resolve(false); };
    window.renderSpotlight = function (...a) { renders++; return orr.apply(this, a); };
    navigate("dashboard");
    window.ensureLiveNavDataFetch = of; window.renderSpotlight = orr;
    return { fetches, renders };
  });
  ok(E.fetches === 1, "E1 navigate(\"dashboard\") primes the live fetch — Spotlight is live-backed now, so the landing view has to ask for the data");
  ok(E.renders >= 1, "E2 navigate(\"dashboard\") re-renders Spotlight with whatever is currently available");

  // Mirrors ensureLiveNavDataFetch()'s own post-fetch branch, the same way
  // the stats suite does — this environment has no Graph session to drive a
  // real round trip.
  const F = await page.evaluate(() => {
    navigate("dashboard");
    let renders = 0;
    const orr = window.renderSpotlight;
    window.renderSpotlight = function (...a) { renders++; return orr.apply(this, a); };
    const activeView = document.querySelector(".view.active");
    const isDash = activeView && activeView.id === "view-dashboard";
    if (activeView && activeView.id === "view-dashboard") renderSpotlight();
    window.renderSpotlight = orr;
    return { isDash, renders };
  });
  ok(F.isDash, "F0 sanity: the Dashboard is genuinely the active view");
  ok(F.renders === 1, "F1 the fetch-completion branch re-renders Spotlight when the Dashboard is on screen — it only covered view-browse/view-stats before this fix");

  const G = await page.evaluate(() => {
    const src = document.documentElement.innerHTML;
    return {
      hasStaleConst: /const\s+spotlightCoins\s*=\s*FAKE_COINS/.test(src),
      dashBranch: /view-dashboard["']\s*\)\s*renderSpotlight\(\)/.test(src)
    };
  });
  ok(G.hasStaleConst === false, "G1 the pre-fix `const spotlightCoins = FAKE_COINS.slice(...)` is genuinely gone from the source, not just shadowed");
  ok(G.dashBranch, "G2 the fetch's own success path really does carry a view-dashboard re-render branch (not only the mirrored test above)");

  // ---------- H. nav smoke / overflow ----------
  const H = await page.evaluate(() => {
    __setLiveCoinsForTest(null);
    const routes = ["dashboard", "browse", "stats", "albums", "wishlist", "dashboard"];
    const bad = [];
    routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    navigate("dashboard");
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(H.bad.length === 0, "H1 every route still navigates cleanly: " + H.bad.join("; "));
  ok(H.overflow === false, "H2 no horizontal page overflow at 412px");
}, module);
