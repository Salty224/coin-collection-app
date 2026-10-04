// The flip card's corners must be fitted against the coin's NEW size when
// the denomination changes. .coin-disc animates its width (0.15s), so at
// the moment the corners are fitted its on-screen rect is still the
// previous coin's size. cornerClearsDisc() now measures the target size
// (the inline width sizeCoinElement() just set) around the unmoving centre.
//
// Method: fit a corner on a coin rendered fresh (a coin of the same size
// shown before it), then fit the same corner straight after a coin of the
// OTHER size; the two must match. The candidate texts are checked to be
// genuinely size-sensitive (fit differently on a cent vs a dollar), so the
// equality can't pass vacuously.

const { defineSuite } = require("./harness");

const CANDIDATES = ["MS-65 RD", "MS-65 RDCAM", "XF-45 Cleaned", "AU-58 Details", "PR-69 DCAM", "MS-66+ RD", "VF-35 Corroded"];

module.exports = defineSuite("disc-resize-fit", async ({ ok, openApp, PHONE, TABLET }) => {
  for (const [vpName, vp] of [["phone", PHONE], ["tablet", TABLET]]) {
    const page = await openApp(vp);
    const tag = (s) => s + " [" + vpName + "]";

    const R = await page.evaluate(async (CANDIDATES) => {
      const mk = (id, denom, grade) => Object.assign({}, FAKE_COINS[0], { id, name: "Test Coin", description: "Test Coin",
        denom, year: 1999, mint: "D", variety: "", grade, designation: "", composition: "", specs: {}, error: "", cost: 0 });
      __setLiveDataModeForTest("live");
      const fsOf = () => document.getElementById("browseDetailBL").style.fontSize || "natural";
      // Step from coin to coin the way the prev/next arrows do — without
      // leaving the detail view in between. Leaving it (navigate to the
      // grid) hides the coin, and a hidden coin doesn't animate, which
      // would hide the very bug being tested.
      const show = (c) => showBrowseDetail(c);
      const out = [];
      for (const g of CANDIDATES) {
        const cent = mk("AY-99001", "1C", g), cent2 = mk("AY-99002", "1C", g);
        const dollar = mk("AY-99003", "$1", g), dollar2 = mk("AY-99004", "$1", g);
        __setLiveCoinsForTest([cent, cent2, dollar, dollar2]); navigate("browse");
        // "Fresh" = the coin is already at this size and has finished
        // animating, so its rect is the real size even without the fix.
        const settle = () => new Promise(r => setTimeout(r, 300));
        show(cent); await settle(); show(cent2); const centFresh = fsOf();
        show(dollar); await settle(); show(dollar2); const dollarFresh = fsOf();
        show(dollar); await settle(); show(cent); const centAfterDollar = fsOf();
        show(cent); await settle(); show(dollar); const dollarAfterCent = fsOf();
        out.push({ g, centFresh, dollarFresh, centAfterDollar, dollarAfterCent });
      }
      __setLiveCoinsForTest(null); __setLiveDataModeForTest(null);
      return out;
    }, CANDIDATES);

    const sensitive = R.filter(r => r.centFresh !== r.dollarFresh);
    ok(sensitive.length > 0, tag("A0 fixture: at least one candidate fits differently on a cent vs a dollar"), R);
    ok(R.every(r => r.centAfterDollar === r.centFresh), tag("A1 a cent shown straight after a $1 is fitted for the cent's size, not the $1's"),
      R.filter(r => r.centAfterDollar !== r.centFresh));
    ok(R.every(r => r.dollarAfterCent === r.dollarFresh), tag("A2 a $1 shown straight after a cent is fitted for the $1's size, not the cent's"),
      R.filter(r => r.dollarAfterCent !== r.dollarFresh));

    // After the animation finishes, the corners really do clear the coin.
    const B = await page.evaluate(async (CANDIDATES) => {
      const out = [];
      __setLiveDataModeForTest("live");
      for (const g of CANDIDATES) {
        const cent = Object.assign({}, FAKE_COINS[0], { id: "AY-99011", denom: "1C", grade: g, designation: "", variety: "", composition: "", specs: {} });
        const dollar = Object.assign({}, FAKE_COINS[0], { id: "AY-99012", denom: "$1", grade: g, designation: "", variety: "", composition: "", specs: {} });
        __setLiveCoinsForTest([cent, dollar]); navigate("browse");
        showBrowseDetail(cent); showBrowseDetail(dollar);
        await new Promise(r => setTimeout(r, 300));
        const bl = document.getElementById("browseDetailBL");
        out.push({ g, clears: cornerClearsDisc(bl) });
      }
      __setLiveCoinsForTest(null); __setLiveDataModeForTest(null);
      return out;
    }, CANDIDATES);
    ok(B.every(b => b.clears), tag("B1 cent -> $1: once the coin has grown to full size, the bottom-left text clears it"), B.filter(b => !b.clears));

    await page.context().close();
  }
}, module);
