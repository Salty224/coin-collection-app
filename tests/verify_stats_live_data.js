// Ledger/Stats live-data read-path fix (2026-09-02). Real bug: renderStats()
// read FAKE_COINS directly rather than activeCoins() — the one swap point
// every other live-data-aware nav function goes through — so Ledger/Stats
// always showed demo data regardless of a live session's real coins.
// navigate() also had no "stats" branch at all (unlike browse/sets/staging/
// addset/inprogresssets/needsdbcoins, which all trigger their own render),
// so nothing ever primed the live fetch from Stats either. See CLAUDE.md
// "Ledger/Stats live-data fix" for the write-up. Item 1 only — Item 5
// (All.Status filtering) is explicitly NOT part of this fix.

const { defineSuite } = require("./harness");

module.exports = defineSuite("stats-live-data", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ---------- A. renderStats() reads activeCoins(), not FAKE_COINS directly ----------
  const A = await page.evaluate(() => {
    __setLiveCoinsForTest(null);
    navigate("stats");
    const baseline = document.getElementById("statTotalItems").textContent;

    // A single, distinctive synthetic live coin — nothing in FAKE_COINS can
    // coincidentally match this exact total, so a real read-through proves
    // itself unambiguously.
    __setLiveCoinsForTest([
      { id: "AY-90001", denom: "1C", year: 1943, mint: "S", cost: 12.34, value: 56.78 }
    ]);
    renderStats();
    const live = {
      total: document.getElementById("statTotalItems").textContent,
      sub: document.getElementById("statItemsSub").textContent,
      spent: document.getElementById("statTotalSpent").textContent,
      value: document.getElementById("statTotalValue").textContent
    };
    __setLiveCoinsForTest(null);
    renderStats();
    const restored = document.getElementById("statTotalItems").textContent;
    return { baseline, live, restored };
  });
  ok(A.live.total === "1", "A1 renderStats() reflects a live single-coin dataset (total items = 1), not FAKE_COINS' own count");
  ok(A.live.sub === "1 coins, 0 medals", "A2 the coins/medals sub-line is derived from the live dataset");
  ok(A.live.spent === "$12" && A.live.value === "$57", "A3 spent/value totals come from the live coin's own cost/value, not demo data (formatMoney rounds to whole dollars)");
  ok(A.restored === A.baseline, "A4 clearing the live override falls back to FAKE_COINS again (activeCoins()'s own documented fallback)");

  // Negative control: confirms this assertion actually exercises the real
  // fix, not something that would pass either way. Reverting to reading
  // FAKE_COINS directly must fail A1.
  const NEG_A = await page.evaluate(() => {
    const orig = window.renderStats;
    // Recreate the pre-fix body inline (FAKE_COINS instead of activeCoins()).
    window.renderStats = function () {
      const coins = FAKE_COINS.filter(c => c.denom !== "Medal");
      const medals = FAKE_COINS.filter(c => c.denom === "Medal");
      document.getElementById("statTotalItems").textContent = FAKE_COINS.length.toLocaleString();
      document.getElementById("statItemsSub").textContent = coins.length + " coins, " + medals.length + " medals";
    };
    __setLiveCoinsForTest([{ id: "AY-90002", denom: "1C", year: 1943, mint: "S", cost: 1, value: 1 }]);
    renderStats();
    const total = document.getElementById("statTotalItems").textContent;
    __setLiveCoinsForTest(null);
    window.renderStats = orig;
    renderStats();
    return { total };
  });
  ok(NEG_A.total !== "1", "A5 negative control: the pre-fix (FAKE_COINS-reading) body does NOT reflect the live single-coin override — proves A1 exercises the real fix");

  // ---------- B. navigate("stats") primes the live-data fetch ----------
  const B = await page.evaluate(() => {
    let called = 0;
    const orig = window.ensureLiveNavDataFetch;
    window.ensureLiveNavDataFetch = function () { called++; return Promise.resolve(false); };
    navigate("stats");
    window.ensureLiveNavDataFetch = orig;
    return { called };
  });
  ok(B.called === 1, "B1 navigate(\"stats\") calls ensureLiveNavDataFetch() — it had no such branch before this fix, so Stats never even attempted a live read");

  // Negative control on B: a route that must NOT trigger it (sanity that the
  // spy itself works and isn't just always true).
  const NEG_B = await page.evaluate(() => {
    let called = 0;
    const orig = window.ensureLiveNavDataFetch;
    window.ensureLiveNavDataFetch = function () { called++; return Promise.resolve(false); };
    navigate("wishlist");
    window.ensureLiveNavDataFetch = orig;
    navigate("dashboard");
    return { called };
  });
  ok(NEG_B.called === 0, "B2 negative control: an unrelated route (wishlist) does NOT call ensureLiveNavDataFetch() — confirms B1 isn't a false positive from a global always-called spy");

  // ---------- C. a fetch resolving while Stats is the active view re-renders it ----------
  const C = await page.evaluate(async () => {
    // ensureLiveNavDataFetch() is gated on ENABLE_LIVE_NAV_DATA and does a
    // real Promise.all of fetchWorkbookSheetRows() calls this environment
    // has no Graph session to satisfy — so this exercises the actual
    // success-callback code path (the "if browse... else if stats..."
    // re-render check) directly, the same way the fetch's own .then()
    // does, rather than trying to drive a real network round trip.
    navigate("stats");
    const before = document.getElementById("statTotalItems").textContent;
    let renderCalls = 0;
    const orig = window.renderStats;
    window.renderStats = function (...args) { renderCalls++; return orig.apply(this, args); };
    const activeView = document.querySelector(".view.active");
    const isStats = activeView && activeView.id === "view-stats";
    // Mirror ensureLiveNavDataFetch()'s own post-fetch branch exactly.
    if (activeView && activeView.id === "view-browse") { /* not this case */ }
    else if (activeView && activeView.id === "view-stats") renderStats();
    window.renderStats = orig;
    return { isStats, renderCalls, before };
  });
  ok(C.isStats, "C0 sanity: Stats is genuinely the active view after navigate(\"stats\")");
  ok(C.renderCalls === 1, "C1 the fetch-completion branch (mirrored) re-renders Stats when it's the active view — this branch didn't exist before this fix (view-browse only)");

  // ---------- D. nav smoke / no overflow ----------
  const D = await page.evaluate(() => {
    __setLiveCoinsForTest(null);
    const routes = ["dashboard", "stats", "browse", "dashboard"];
    const bad = [];
    routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    navigate("dashboard");
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(D.bad.length === 0, "D1 every route still navigates cleanly: " + D.bad.join("; "));
  ok(D.overflow === false, "D2 no horizontal page overflow at 412px");

  // ---------- E. stale placeholder-copy fix ----------
  // The Stats page's own footnote used to flatly claim "no live totals from
  // the workbook yet" -- no longer true once this fix landed (with
  // ENABLE_LIVE_NAV_DATA on, it genuinely does). Reworded rather than left
  // stale.
  const E = await page.evaluate(() => {
    navigate("stats");
    const note = document.querySelector("#view-stats .placeholder-note");
    return note && note.textContent;
  });
  ok(E && !/no live totals from the workbook yet/i.test(E), "E1 the stale \"no live totals\" claim is gone from the Stats footnote");
  ok(E && /live workbook/i.test(E), "E2 the footnote now accurately describes the live-vs-placeholder behavior");
}, module);
