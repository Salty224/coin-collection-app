// Live-testing finding: a successful Mint Item Number / GSID / PCGS-label
// match carries identity onto the form via applyDbCoinsRowToForm(), but that
// function never set Category or checked the Bullion toggle — so matching a
// real bullion-category coin (e.g. an American Silver Eagle) left the form
// showing a bare "$1" Dollar with the Bullion checkbox unchecked, even
// though the matched DB_Coins row unambiguously names it a Silver Eagle.
// Fixed by inferring Category from the matched row's own Description via
// the existing BULLION_CATEGORY_MATCH_HINTS table (run in reverse: category
// -> narrow already exists in dbCoinsCandidatesFor(); here it's
// description -> category), applied once inside applyDbCoinsRowToForm()
// itself so every caller (PCGS decode, Mint Item Number, GSID) is fixed
// uniformly. See CLAUDE.md "Add Coin Phase 1" live-testing batch notes.

const { defineSuite } = require("./harness");

module.exports = defineSuite("addcoin-category-autofill", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // A synthetic Silver Eagle row, seeded via __setLiveDbCoinsForTest so this
  // doesn't depend on FAKE_DB_COINS carrying a real bullion row.
  const SILVER_EAGLE_ROW = {
    denom: "$1", year: 2017, mint: "", variety: "", description: "American Silver Eagle Dollar",
    finish: "Business Strike", designation: "", coinId: "C-2017-SE-01", pcgs: "", mintage: null,
    gsid: "GS-8001", itemNumber: "17ASE"
  };
  // A plain, non-bullion control row -- must NOT flip the toggle on.
  const MORGAN_ROW = {
    denom: "$1", year: 1889, mint: "CC", variety: "", description: "Morgan Dollar",
    finish: "Business Strike", designation: "", coinId: "C-1889-M-$1-01", pcgs: "7162", mintage: 350000,
    gsid: "", itemNumber: ""
  };

  // ---------- A. inferBullionCategoryFromDescription() direct checks ----------
  const A = await page.evaluate(() => {
    return {
      silverEagle: inferBullionCategoryFromDescription("American Silver Eagle Dollar"),
      // The exact trap this fix exists to avoid: "Eagle"'s own bare hint is
      // a substring of "American Silver Eagle Dollar" and would win a
      // first-match scan -- longest-hint-wins must still land on the more
      // specific "Silver Eagle", not the generic "Eagle".
      goldEagle: inferBullionCategoryFromDescription("American Gold Eagle"),
      morgan: inferBullionCategoryFromDescription("Morgan Dollar"),
      blank: inferBullionCategoryFromDescription(""),
      undef: inferBullionCategoryFromDescription(undefined)
    };
  });
  ok(A.silverEagle === "Silver Eagle", "A1 longest-hint-wins: \"American Silver Eagle Dollar\" infers \"Silver Eagle\", not the generic \"Eagle\"");
  ok(A.goldEagle === "Gold Eagle", "A2 \"American Gold Eagle\" infers \"Gold Eagle\"");
  ok(A.morgan === "", "A3 an ordinary non-bullion description infers no category");
  ok(A.blank === "" && A.undef === "", "A4 blank/undefined description never throws, infers no category");

  // ---------- B. Mint Item Number match sets Category + checks the toggle ----------
  const B = await page.evaluate((row) => {
    __setLiveDbCoinsForTest([row]);
    navigate('addcoin');
    document.getElementById('addCoinGradingHeader').click();
    document.getElementById('mintItemNumber').value = row.itemNumber;
    handleMintItemNumberApply();
    const result = {
      toggleChecked: document.getElementById('addCoinBullionToggle').checked,
      denom: document.getElementById('denomination').value,
      selectedCategory: document.getElementById('denomination').selectedOptions[0] && document.getElementById('denomination').selectedOptions[0].dataset.category,
      description: document.getElementById('description').value
    };
    __setLiveDbCoinsForTest(null);
    return result;
  }, SILVER_EAGLE_ROW);
  ok(B.toggleChecked === true, "B1 a Mint Item Number match resolving to a bullion row checks the Bullion toggle");
  ok(B.denom === "$1" && B.selectedCategory === "Silver Eagle", "B2 the Denomination select lands on the $1 option carrying category \"Silver Eagle\"");
  ok(B.description === "American Silver Eagle Dollar", "B3 Description is the real DB_Coins row text, not overwritten by a dispatched change event's generic label");

  // ---------- C. GSID match: same fix, same function ----------
  const C = await page.evaluate((row) => {
    __setLiveDbCoinsForTest([row]);
    navigate('addcoin');
    document.getElementById('addCoinGradingHeader').click();
    document.getElementById('gsidInput').value = row.gsid;
    handleGsidApply();
    const result = {
      toggleChecked: document.getElementById('addCoinBullionToggle').checked,
      selectedCategory: document.getElementById('denomination').selectedOptions[0] && document.getElementById('denomination').selectedOptions[0].dataset.category
    };
    __setLiveDbCoinsForTest(null);
    return result;
  }, SILVER_EAGLE_ROW);
  ok(C.toggleChecked === true && C.selectedCategory === "Silver Eagle", "C1 a GSID match resolving to a bullion row also checks the toggle + sets Category (same shared function)");

  // ---------- D. PCGS label decode: same fix, same function ----------
  const D = await page.evaluate((row) => {
    __setLiveDbCoinsForTest([Object.assign({}, row, { pcgs: "9001" })]);
    navigate('addcoin');
    document.getElementById('addCoinGradingHeader').click();
    document.getElementById('addCoinGrader').value = 'PCGS';
    document.getElementById('addCoinGrader').dispatchEvent(new Event('change'));
    document.getElementById('pcgsLabelInput').value = '9001.65/12345678';
    handlePcgsLabelApply();
    const result = {
      toggleChecked: document.getElementById('addCoinBullionToggle').checked,
      selectedCategory: document.getElementById('denomination').selectedOptions[0] && document.getElementById('denomination').selectedOptions[0].dataset.category,
      grader: document.getElementById('addCoinGrader').value
    };
    __setLiveDbCoinsForTest(null);
    return result;
  }, SILVER_EAGLE_ROW);
  ok(D.toggleChecked === true && D.selectedCategory === "Silver Eagle", "D1 a PCGS label decode resolving to a bullion row also checks the toggle + sets Category");
  ok(D.grader === "PCGS", "D2 PCGS decode's own Grader side effect is unaffected by the Category fix");

  // ---------- E. A non-bullion match restores classic mode (no stale carry-over) ----------
  const E = await page.evaluate(({ silverEagle, morgan }) => {
    __setLiveDbCoinsForTest([silverEagle, morgan]);
    navigate('addcoin');
    document.getElementById('addCoinGradingHeader').click();
    // First resolve the bullion row, leaving the form in bullion mode...
    document.getElementById('mintItemNumber').value = silverEagle.itemNumber;
    handleMintItemNumberApply();
    const afterBullion = document.getElementById('addCoinBullionToggle').checked;
    // ...then a second, unrelated GSID match to a plain Morgan Dollar must
    // NOT leave the stale bullion state behind.
    document.getElementById('gsidInput').value = 'NOPE'; // miss, but re-uses PCGS-style helper path
    // Use the real Morgan row via its own coinId match instead (GSID blank on Morgan) --
    // simplest real repro is matching via Mint Item Number field left blank; instead
    // directly invoke the shared apply path with the Morgan row.
    applyIdentifierDbCoinsMatch(morgan);
    const result = {
      afterBullion,
      toggleAfterPlainMatch: document.getElementById('addCoinBullionToggle').checked,
      categoryAfterPlainMatch: addCoinBullionCategory,
      denomAfterPlainMatch: document.getElementById('denomination').value
    };
    __setLiveDbCoinsForTest(null);
    return result;
  }, { silverEagle: SILVER_EAGLE_ROW, morgan: MORGAN_ROW });
  ok(E.afterBullion === true, "E1 sanity: the bullion match did check the toggle first");
  ok(E.toggleAfterPlainMatch === false, "E2 a subsequent non-bullion match un-checks the Bullion toggle (no stale carry-over)");
  ok(E.categoryAfterPlainMatch === "", "E3 addCoinBullionCategory is cleared back to blank for the plain match");
  ok(E.denomAfterPlainMatch === "$1", "E4 Denomination still lands on the correct plain value in classic mode");

  // ---------- F. Nav smoke / no overflow ----------
  const F = await page.evaluate(() => {
    navigate('addcoin');
    return { overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(F.overflow === false, "F1 no horizontal overflow at 412px");
}, module);
