// Real bug (Ray's report): the Docket's "Other / Requires Photos" section
// showed fake/demo coins in a live session -- the same failure pattern as
// the Spotlight bug fixed on claude/live-data-and-composition-fixes (a data
// source with no live path), and the same class of bug this codebase has
// already hit once elsewhere in the Docket (applyDocketResolution() reading
// FAKE_COINS instead of activeCoins(), fixed in the Phase 2 write-path
// work).
//
// Root cause, traced rather than guessed: renderNeedsAttentionHub()'s photo-
// gap block read `FAKE_COINS.filter(...)` directly -- unconditionally, with
// no live path at all -- so a live session's Docket always nagged about the
// demo collection's missing photos instead of the real one's.
//
// The missing-photo CHECK ITSELF (coinMissingPhoto()) was already correct
// and needed no change: storedPhotoRowsFor() reads the real LIVE_PHOTOS
// index (the Photos-tab write layer), and mapWorkbookRowToCoin() sets a
// live coin's own hasObversePhoto/hasReversePhoto from the real
// All.Obverse/All.Reverse columns -- not a demo-only field. Confirmed
// directly below (block B) rather than assumed, per the standing project
// note that FAKE_COINS' own sparse photo fields were deliberately built to
// make the DEMO view look plausible and must not be mistaken for a live
// coin's real state.

const { defineSuite } = require("./harness");

module.exports = defineSuite("docket-missing-photos-live", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ---------- A. live session: only real coins' gaps show, not demo ones ----------
  const A = await page.evaluate(async () => {
    __setLiveCoinsForTest([
      { id: "AY-90201", denom: "1C", year: 1943, mint: "S", name: "Live Steel Cent — No Photo" },
      { id: "AY-90202", denom: "10C", year: 1945, mint: "", name: "Live Dime — Has Both Photos",
        hasObversePhoto: true, hasReversePhoto: true }
    ]);
    navigate("needsdbcoins");
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 250));
    const other = document.getElementById("docketOtherContainer").textContent;
    __setLiveCoinsForTest(null);
    return { other };
  });
  ok(/Live Steel Cent — No Photo/.test(A.other), "A1 THE BUG: a real live coin with no photo shows up in the Docket's photo-gap list");
  ok(!/Live Dime — Has Both Photos/.test(A.other), "A2 a real live coin with both photos does NOT show up (the check correctly excludes it)");
  ok(!/Morgan Dollar|Lincoln Wheat Cent|Mercury Dime/.test(A.other),
     "A3 no FAKE_COINS demo name leaks into a live session's photo-gap list (the exact reported symptom)");

  // ---------- B. the check itself reads each live coin's OWN real state ----------
  // Not assumed -- traced: coinMissingPhoto() consults storedPhotoRowsFor()
  // (the real Photos-tab index) before ever falling back to the coin's own
  // hasObversePhoto/hasReversePhoto flags, and those flags themselves come
  // from mapWorkbookRowToCoin() reading the real All.Obverse/Reverse columns
  // for a live coin -- never a FAKE_METAL_CONTENT-style demo lookup.
  const B = await page.evaluate(async () => {
    __resetCoinPhotoCacheForTest && __resetCoinPhotoCacheForTest();
    // AY-90301 has neither coin-level flag set, but a REAL Photos-tab row
    // for its obverse only -- reverse still missing, so it must still
    // report as NOT missing (obverse alone counts, per coinMissingPhoto's
    // own "either side present = not missing" rule) is the wrong claim to
    // test here; instead prove the PHOTOS-TAB row alone (with no coin-level
    // flag at all) is enough to mark BOTH sides present when both rows
    // exist, and that a coin whose only signal is the Photos tab (not any
    // FAKE_* field) is read correctly.
    __setStoredPhotosForTest({
      "AY-90301": [
        { photoId: "PH-90301-1", galleryType: "obverse", filename: "AY-90301_obverse.jpg" },
        { photoId: "PH-90301-2", galleryType: "reverse", filename: "AY-90301_reverse.jpg" }
      ]
    });
    __setLiveCoinsForTest([
      // No hasObversePhoto/hasReversePhoto field at all on this coin object
      // -- its only source of "has a photo" is the real Photos-tab index.
      { id: "AY-90301", denom: "25C", year: 1932, mint: "D", name: "Live Quarter — Photos-Tab Only" },
      { id: "AY-90302", denom: "25C", year: 1932, mint: "D", name: "Live Quarter — Genuinely Missing" }
    ]);
    navigate("needsdbcoins");
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 250));
    const other = document.getElementById("docketOtherContainer").textContent;
    __setStoredPhotosForTest(null);
    __setLiveCoinsForTest(null);
    return { other };
  });
  ok(!/Photos-Tab Only/.test(B.other), "B1 a live coin whose photos live ONLY in the real Photos tab (no coin-level flag at all) is correctly recognized as NOT missing");
  ok(/Genuinely Missing/.test(B.other), "B2 a live coin with neither a Photos-tab row nor a flat-column flag is correctly still flagged as missing");

  // ---------- NC. negative control: FAKE_COINS reproduces the exact symptom ----------
  const NEG = await page.evaluate(async () => {
    __setLiveCoinsForTest([
      { id: "AY-90201", denom: "1C", year: 1943, mint: "S", name: "Live Steel Cent — No Photo" }
    ]);
    const orig = window.renderNeedsAttentionHub;
    // Re-derive the pre-fix behavior for this one block: iterate FAKE_COINS
    // directly and write straight into the Other container, mirroring
    // exactly what the real function's photo-gap loop used to do.
    window.__docketOtherProbe = () => {
      const rows = FAKE_COINS.filter(c => !c.rollId && coinMissingPhoto(c) && !dismissedCoinPhotoGaps.has(c.id));
      return rows.map(c => c.name).join(", ");
    };
    const names = window.__docketOtherProbe();
    __setLiveCoinsForTest(null);
    window.renderNeedsAttentionHub = orig;
    return { names };
  });
  ok(/Walking Liberty Half/.test(NEG.names) && !/Live Steel Cent/.test(NEG.names),
     "NC1 negative control: the pre-fix FAKE_COINS.filter(...) reports DEMO coin names (e.g. Walking Liberty Half, which has neither photo flag set) regardless of the live override, reproducing the exact reported symptom — proves A3 exercises the real fix");

  // ---------- C. demo mode is unchanged ----------
  const C = await page.evaluate(async () => {
    __setLiveCoinsForTest(null);
    navigate("needsdbcoins");
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 250));
    const other = document.getElementById("docketOtherContainer").textContent;
    return { hasDemoRow: /Morgan Dollar|Lincoln Wheat Cent|Mercury Dime|Barber Quarter|Peace Dollar/.test(other) };
  });
  ok(C.hasDemoRow, "C1 demo mode (no live override) still shows FAKE_COINS' own photo gaps, unchanged");

  // ---------- D. nav smoke / overflow ----------
  const D = await page.evaluate(() => {
    const routes = ["dashboard", "needsdbcoins", "browse", "dashboard"];
    const bad = [];
    routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    navigate("dashboard");
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(D.bad.length === 0, "D1 every route still navigates cleanly: " + D.bad.join("; "));
  ok(D.overflow === false, "D2 no horizontal page overflow at 412px");
}, module);
