// Two related fixes to the saved-coin flip card:
//
// 1. Reverse face now has its own distinct corner content instead of
//    silently repeating the obverse's four corners (applyFlipCorners() used
//    to write the same TL/TR/BL/BR regardless of which face was showing —
//    the actual bug behind "the reverse just shows the same thing"). TL =
//    Obverse-side Error text (or the whole string, unparsed), BL =
//    Reverse-side Error text, BR = Cost, TR unused. See
//    applyReverseFlipCorners()/splitErrorBySide() in app.html.
//
// 2. A Set's own detail view (isSetRow — Denomination "Multiple") no longer
//    shows a flip card at all — a plain static image instead, no corner
//    text, no tap/swipe/click interaction. Individual coins (Browse, or a
//    Set's own "Coins in this Set" accordion) are unaffected.
//
// See CLAUDE.md's own section on this pass for the full design reasoning.

const { defineSuite } = require("./harness");

module.exports = defineSuite("reverse-face-and-set-flip", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ================= PART 1: Reverse-face corner content =================

  // ---------- A. splitErrorBySide() in isolation ----------
  const A = await page.evaluate(() => {
    const cases = [
      ["Obv. Die Polish Lines, Rev. Die Crack", { obverse: "Obv. Die Polish Lines", reverse: "Rev. Die Crack" }],
      ["Obverse: Die Polish Lines; Reverse: Die Crack", { obverse: "Obverse: Die Polish Lines", reverse: "Reverse: Die Crack" }],
      ["obv die polish lines, rev die crack", { obverse: "obv die polish lines", reverse: "rev die crack" }],
      ["OBV. X, REV. Y", { obverse: "OBV. X", reverse: "REV. Y" }]
    ];
    const positives = cases.map(([input, expected]) => {
      const got = splitErrorBySide(input);
      return got && got.obverse === expected.obverse && got.reverse === expected.reverse;
    });
    const negatives = [
      "Off-Center Strike, approx. 5%",     // single unprefixed error
      "DDO",                                // bare abbreviation, side baked in but unparseable
      "Obv. Die Polish Lines",              // only one side prefixed
      "Rev. Die Crack, Obv. Die Polish Lines", // reversed order -- not supported
      "",
      null
    ].map(t => splitErrorBySide(t) === null);
    return { positives, negatives };
  });
  ok(A.positives.every(Boolean), "A1 splitErrorBySide() parses every forgiving wording variant, verbatim prefix kept: " + JSON.stringify(A.positives));
  ok(A.negatives.every(Boolean), "A2 splitErrorBySide() returns null for every case it must NOT guess at: " + JSON.stringify(A.negatives));

  // ---------- B. Obverse corners are genuinely untouched (regression guard) ----------
  const B = await page.evaluate(() => {
    navigate("browse");
    const coin = FAKE_COINS.find(c => c.id === "AY-00001"); // Morgan Dollar, error + cost both set
    showBrowseDetail(coin);
    return {
      TL: document.getElementById("browseDetailTL").textContent,
      TR: document.getElementById("browseDetailTR").textContent,
      BL: document.getElementById("browseDetailBL").textContent,
      BR: document.getElementById("browseDetailBR").textContent,
      side: browseDetailSide
    };
  });
  ok(B.side === "obverse", "B0 opening a detail view always starts on obverse");
  ok(B.TL === "1889-CC" && B.TR === "Morgan$1" && B.BL === "MS-64" && B.BR === "90%Silver",
    "B1 obverse corners are completely unaffected by this change, even for a coin that HAS Error+Cost data: " + JSON.stringify(B));

  // ---------- C. Reverse: clean Obv./Rev. split ----------
  const C = await page.evaluate(() => {
    const coin = FAKE_COINS.find(c => c.id === "AY-00001"); // error: "Obv. Die Polish Lines, Rev. Die Crack", cost: 620
    showBrowseDetail(coin);
    toggleBrowseDetailSide();
    const tl = document.getElementById("browseDetailTL");
    return {
      TL: tl.textContent, TR: document.getElementById("browseDetailTR").textContent,
      BL: document.getElementById("browseDetailBL").textContent,
      BR: Array.from(document.getElementById("browseDetailBR").querySelectorAll(".corner-line")).map(l => l.textContent),
      TLwide: tl.classList.contains("corner-wide"),
      TLfits: (() => { const l = tl.querySelector(".corner-line"); return !l || l.scrollWidth <= l.clientWidth; })()
    };
  });
  ok(C.TL === "Obv. Die Polish Lines" && C.BL === "Rev. Die Crack",
    "C1 a clean split puts the Obv.-half in TL and the Rev.-half in BL, prefix kept: " + JSON.stringify(C));
  ok(C.TR === "", "C2 TR is unused on the reverse face — confirmed nothing else claims it");
  ok(JSON.stringify(C.BR) === JSON.stringify(["Cost", "$620"]), "C3 BR shows Cost, stacked two lines, not Value: " + JSON.stringify(C.BR));
  ok(C.TLwide, "C4 TL gets the corner-wide class on the reverse face (allowed to use TR's territory)");
  ok(C.TLfits, "C5 -- and the text genuinely fits within that widened box (real measurement, not just rendered without visible clipping)");

  // ---------- D. Reverse: unstructured fallback (whole string, one corner) ----------
  const D = await page.evaluate(() => {
    const coin = FAKE_COINS.find(c => c.id === "AY-00003"); // error: "Off-Center Strike, approx. 5%", cost: 950
    showBrowseDetail(coin);
    toggleBrowseDetailSide();
    return {
      TL: document.getElementById("browseDetailTL").textContent,
      BL: document.getElementById("browseDetailBL").textContent,
      TLwide: document.getElementById("browseDetailTL").classList.contains("corner-wide")
    };
  });
  ok(D.TL === "Off-Center Strike, approx. 5%", "D1 an unparseable Error string renders WHOLE and unmangled in TL, never truncated/guessed at");
  ok(D.BL === "", "D2 BL is blank -- nothing left to say once TL already carries the full string");
  ok(D.TLwide, "D3 TL still gets corner-wide for the fallback case too (it's the only corner holding text either way)");

  // ---------- E. Reverse: no Error at all, Cost still shows ----------
  const E = await page.evaluate(() => {
    const coin = FAKE_COINS.find(c => c.id === "AY-00005"); // no error field, cost: 800
    showBrowseDetail(coin);
    toggleBrowseDetailSide();
    return {
      TL: document.getElementById("browseDetailTL").textContent,
      BL: document.getElementById("browseDetailBL").textContent,
      BR: document.getElementById("browseDetailBR").textContent,
      TLwide: document.getElementById("browseDetailTL").classList.contains("corner-wide")
    };
  });
  ok(E.TL === "" && E.BL === "", "E1 no Error at all -> TL and BL both blank");
  ok(E.BR === "Cost$800", "E2 -- but Cost still renders normally");
  ok(E.TLwide === false, "E3 -- and TL's corner-wide class is correctly NOT left on when there's nothing to render there");

  // ---------- F. Reverse: no Cost, Error still shows ----------
  const F = await page.evaluate(() => {
    const coin = { id: "AY-TESTF", name: "Test Coin F", denom: "1C", year: 2000, mint: "", grade: "MS-63", error: "Obv. A, Rev. B" }; // no cost field at all
    FAKE_COINS.push(coin);
    showBrowseDetail(coin);
    toggleBrowseDetailSide();
    const out = {
      TL: document.getElementById("browseDetailTL").textContent,
      BL: document.getElementById("browseDetailBL").textContent,
      BR: document.getElementById("browseDetailBR").textContent
    };
    FAKE_COINS.pop();
    return out;
  });
  ok(F.TL === "Obv. A" && F.BL === "Rev. B", "F1 Error still renders with no Cost present");
  ok(F.BR === "", "F2 -- BR is blank when coin.cost is falsy, not \"Cost $0\" or similar");

  // ---------- G. Reverse: neither Error nor Cost -> completely blank ----------
  const G = await page.evaluate(() => {
    const coin = { id: "AY-TESTG", name: "Test Coin G", denom: "1C", year: 2000, mint: "", grade: "MS-63" };
    FAKE_COINS.push(coin);
    showBrowseDetail(coin);
    toggleBrowseDetailSide();
    const out = {
      TL: document.getElementById("browseDetailTL").textContent,
      TR: document.getElementById("browseDetailTR").textContent,
      BL: document.getElementById("browseDetailBL").textContent,
      BR: document.getElementById("browseDetailBR").textContent
    };
    FAKE_COINS.pop();
    return out;
  });
  ok(G.TL === "" && G.TR === "" && G.BL === "" && G.BR === "",
    "G1 a coin with neither Cost nor Error shows a COMPLETELY BLANK reverse -- confirmed intentional: " + JSON.stringify(G));

  // ---------- H. Toggling back to obverse restores obverse content (both directions work) ----------
  const H = await page.evaluate(() => {
    const coin = FAKE_COINS.find(c => c.id === "AY-00001");
    showBrowseDetail(coin);
    toggleBrowseDetailSide(); // -> reverse
    toggleBrowseDetailSide(); // -> obverse again
    return {
      side: browseDetailSide,
      TL: document.getElementById("browseDetailTL").textContent,
      TR: document.getElementById("browseDetailTR").textContent,
      TLwide: document.getElementById("browseDetailTL").classList.contains("corner-wide")
    };
  });
  ok(H.side === "obverse" && H.TL === "1889-CC" && H.TR === "Morgan$1",
    "H1 flipping back to obverse genuinely re-renders the obverse corners (the real mechanical bug this fixes -- toggleBrowseDetailSide() used to never re-call applyFlipCorners() at all)");
  ok(H.TLwide === false, "H2 -- and corner-wide is cleared, doesn't leak from the reverse render into the obverse one");

  // ---------- I. Spotlight also gets reverse-specific content ----------
  const I = await page.evaluate(async () => {
    navigate("dashboard");
    spotlightIndex = 0; spotlightSide = "obverse";
    renderSpotlight();
    await new Promise(r => setTimeout(r, 300));
    const obv = { TL: document.getElementById("spotlightTL").textContent, TR: document.getElementById("spotlightTR").textContent };
    spotlightSide = "reverse";
    renderSpotlight();
    await new Promise(r => setTimeout(r, 300));
    const rev = { TL: document.getElementById("spotlightTL").textContent, TR: document.getElementById("spotlightTR").textContent, BR: document.getElementById("spotlightBR").textContent };
    return { obv, rev };
  });
  ok(I.obv.TL === "1889-CC" && I.obv.TR === "Morgan$1", "I1 Spotlight's obverse is unaffected: " + JSON.stringify(I.obv));
  ok(I.rev.TL === "Obv. Die Polish Lines" && I.rev.TR === "" && I.rev.BR === "Cost$620",
    "I2 Spotlight's reverse now shows the same distinct content Browse detail does (it already re-invoked applyFlipCorners() every cycle -- just needed the side threaded through): " + JSON.stringify(I.rev));

  // ---------- J. sr-only summary is face-aware too ----------
  const J = await page.evaluate(() => {
    const coin = FAKE_COINS.find(c => c.id === "AY-00001");
    showBrowseDetail(coin);
    const srObverse = document.getElementById("browseDetailSR").textContent;
    toggleBrowseDetailSide();
    const srReverse = document.getElementById("browseDetailSR").textContent;
    return { srObverse, srReverse };
  });
  ok(/grade MS-64/.test(J.srObverse) && !/reverse/.test(J.srObverse), "J1 obverse sr-only text is unchanged (grade/composition/value, no \"reverse\" tag): " + J.srObverse);
  ok(/Obv\. Die Polish Lines/.test(J.srReverse) && /Rev\. Die Crack/.test(J.srReverse) && /cost \$620/.test(J.srReverse) && /reverse/.test(J.srReverse),
    "J2 reverse sr-only text describes the reverse-specific facts instead, screen readers aren't left with stale obverse-face text: " + J.srReverse);

  // ---------- K. mapWorkbookRowToCoin() reads the real Error column ----------
  const K = await page.evaluate(() => {
    const mapped = mapWorkbookRowToCoin({ "CollectionID": "AY-TEST", "Error": "Obv. X, Rev. Y", "Denomination": "1C", "Year": "2000" });
    const blank = mapWorkbookRowToCoin({ "CollectionID": "AY-TEST2", "Denomination": "1C", "Year": "2000" });
    return { error: mapped.error, blankError: blank.error };
  });
  ok(K.error === "Obv. X, Rev. Y", "K1 mapWorkbookRowToCoin() reads the real All.Error column into coin.error");
  ok(K.blankError === "", "K2 -- and a row with no Error value maps to a blank string, not undefined/throw");

  // ================= PART 2: Set detail view is a plain static image =================

  // ---------- L. A childless Set's flip-frame shows no corner text ----------
  const L = await page.evaluate(() => {
    navigate("browse");
    const set = FAKE_COINS.find(c => c.id === "AY-00018"); // childless bundle, has its own cost
    showBrowseDetail(set);
    return {
      TL: document.getElementById("browseDetailTL").textContent,
      TR: document.getElementById("browseDetailTR").textContent,
      BL: document.getElementById("browseDetailBL").textContent,
      BR: document.getElementById("browseDetailBR").textContent,
      SR: document.getElementById("browseDetailSR").textContent,
      combinedBadgeHidden: document.getElementById("browseDetailCombinedBadge").classList.contains("hidden"),
      frameVisible: document.getElementById("browseDetailFlipFrame").style.display !== "none"
    };
  });
  ok(L.TL === "" && L.TR === "" && L.BL === "" && L.BR === "",
    "L1 a childless Set shows NO corner text at all, even though it has its own Cost: " + JSON.stringify(L));
  ok(L.SR === "", "L2 the sr-only span is cleared too -- nothing corner-driven left to announce");
  ok(L.combinedBadgeHidden, "L3 the combined-photo badge is defensively hidden (not left stale from a prior coin's view)");
  ok(L.frameVisible, "L4 the frame/disc itself is still shown -- this is a static IMAGE, not a hidden element");

  // ---------- M. A multi-child Set gets the identical treatment ----------
  const M = await page.evaluate(() => {
    const set = FAKE_COINS.find(c => c.id === "AY-00022"); // 3 real children
    showBrowseDetail(set);
    return {
      TL: document.getElementById("browseDetailTL").textContent,
      TR: document.getElementById("browseDetailTR").textContent,
      BL: document.getElementById("browseDetailBL").textContent,
      BR: document.getElementById("browseDetailBR").textContent
    };
  });
  ok(M.TL === "" && M.TR === "" && M.BL === "" && M.BR === "",
    "M1 a multi-child Set ALSO shows no corner text (both childless and multi-child Sets are in scope): " + JSON.stringify(M));

  // ---------- N. No flip interaction on a Set: click/tap does nothing ----------
  const N = await page.evaluate(() => {
    const set = FAKE_COINS.find(c => c.id === "AY-00018");
    showBrowseDetail(set);
    const sideBefore = browseDetailSide;
    toggleBrowseDetailSide(); // direct call, same as what the click/touch handler invokes
    const sideAfterDirectCall = browseDetailSide;
    document.getElementById("browseDetailFlipFrame").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return {
      sideBefore, sideAfterDirectCall, sideAfterClick: browseDetailSide,
      TLafter: document.getElementById("browseDetailTL").textContent
    };
  });
  ok(N.sideBefore === "obverse" && N.sideAfterDirectCall === "obverse" && N.sideAfterClick === "obverse",
    "N1 toggleBrowseDetailSide() genuinely no-ops for a Set -- browseDetailSide never changes: " + JSON.stringify(N));
  ok(N.TLafter === "", "N2 -- and no corner text appears even after attempting to flip");

  // ---------- O. Individual coins are UNCHANGED -- still get the full flip card ----------
  const O = await page.evaluate(() => {
    const coin = FAKE_COINS.find(c => c.id === "AY-00001");
    showBrowseDetail(coin);
    const before = {
      TL: document.getElementById("browseDetailTL").textContent,
      side: browseDetailSide
    };
    toggleBrowseDetailSide();
    return {
      before,
      afterTL: document.getElementById("browseDetailTL").textContent,
      afterSide: browseDetailSide
    };
  });
  ok(O.before.TL === "1889-CC" && O.before.side === "obverse", "O1 an ordinary coin's detail view is completely unaffected: normal obverse corners");
  ok(O.afterSide === "reverse" && O.afterTL === "Obv. Die Polish Lines", "O2 -- and it still flips normally, unlike a Set");

  // A Set's own "Coins in this Set" accordion still opens a CHILD's detail
  // view, which is an ordinary coin row -- confirmed via setChildrenFor()
  // returning real coin-shaped rows for AY-00022, each with a real denom
  // (never "Multiple"), so isSetRow() is false for any child and the normal
  // flip path applies untouched.
  const P = await page.evaluate(() => {
    const children = setChildrenFor(FAKE_COINS.find(c => c.id === "AY-00022"));
    return { count: children.length, anyIsSet: children.some(c => isSetRow(c)) };
  });
  ok(P.count > 0 && P.anyIsSet === false, "P1 a Set's own children are ordinary coin rows, never isSetRow() themselves -- their detail view is untouched by this change");

  // ---------- Q. Nav + overflow smoke ----------
  const Q = await page.evaluate(() => {
    const routes = ["dashboard", "browse", "albums", "sets", "wishlist", "stats"];
    const bad = [];
    routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    navigate("browse");
    showBrowseDetail(FAKE_COINS.find(c => c.id === "AY-00022"));
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(Q.bad.length === 0, "Q1 every route still navigates cleanly: " + Q.bad.join("; "));
  ok(Q.overflow === false, "Q2 no horizontal overflow at 412px, including on a Set's own (now cornerless) detail view");
}, module);
