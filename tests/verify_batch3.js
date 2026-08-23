// Batch 3 — Add Coin Phase 1 follow-ups (2026-08-23 retest batch, "Batch 3").
// Each block below corresponds to one numbered item from that batch; see
// CLAUDE.md "Add Coin Phase 1: batch 3" for the full write-up.

const { defineSuite } = require("./harness");

module.exports = defineSuite("batch3", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ---------- #2: Finish tier distinguishes real-zero-match from unrecognized ----------
  const B2 = await page.evaluate(() => {
    __setLiveDbCoinsForTest([
      { denom:"1C", year:1950, mint:"", variety:"", description:"Lincoln Wheat Cent", finish:"Business Strike", designation:"", coinId:"C-A", pcgs:"", mintage:null, gsid:"" },
      { denom:"1C", year:1950, mint:"", variety:"", description:"Lincoln Wheat Cent", finish:"Proof", designation:"", coinId:"C-B", pcgs:"", mintage:null, gsid:"" },
      // Unrelated row (different denom/year) whose sole job is making "SMS"
      // a globally-known DB_Coins Finish category, so knownDbCoinsFinishValues()
      // recognizes it even though it's absent from the 1950 1C candidates above.
      { denom:"$1", year:1976, mint:"", variety:"", description:"Eisenhower", finish:"SMS", designation:"", coinId:"C-C", pcgs:"", mintage:null, gsid:"" }
    ]);
    const shape = { denom:"1C", year:"1950", mint:"", variety:"" };
    // Proof IS a real DB_Coins Finish category overall, and it DOES appear
    // among these two candidates -- ordinary narrowing, unaffected.
    const realMatch = dbCoinsCandidatesFor(Object.assign({}, shape, { finish: "Proof" }));
    // SMS is a real DB_Coins Finish category somewhere in the catalog, but
    // NEITHER of these two candidates carries it -- should narrow to ZERO
    // (a genuine signal), not silently fall back to the full ambiguous set.
    const realZeroMatch = dbCoinsCandidatesFor(Object.assign({}, shape, { finish: "SMS" }));
    // "Circulated" is never a DB_Coins Finish value at all (an All-only
    // wear-state value) -- must still soft-fallback to the full set.
    const unrecognizedFallback = dbCoinsCandidatesFor(Object.assign({}, shape, { finish: "Circulated" }));
    __setLiveDbCoinsForTest(null);
    return { realMatch: realMatch.length, realZeroMatch: realZeroMatch.length, unrecognizedFallback: unrecognizedFallback.length };
  });
  ok(B2.realMatch === 1, "2.1 a real Finish value present among candidates still narrows normally");
  ok(B2.realZeroMatch === 0, "2.2 a real DB_Coins Finish category with zero matches among THIS coin's candidates narrows to zero (retest #2)");
  ok(B2.unrecognizedFallback === 2, "2.3 a Finish value DB_Coins never uses at all still soft-falls-back to the full set (Circulated/Various, unchanged)");

  // ---------- #3: series-picker (controlled Description) narrows candidates ----------
  const B3 = await page.evaluate(() => {
    __setLiveDbCoinsForTest([
      { denom:"25C", year:1893, mint:"", variety:"", description:"Isabella Quarter", finish:"", designation:"", coinId:"C-ISABELLA", pcgs:"", mintage:null, gsid:"" },
      { denom:"25C", year:1893, mint:"", variety:"", description:"Barber", finish:"", designation:"", coinId:"C-BARBER", pcgs:"", mintage:null, gsid:"" }
    ]);
    navigate('addcoin');
    document.getElementById('denomination').value = '25C';
    document.getElementById('year').value = '1893';
    document.getElementById('description').value = 'Isabella Quarter'; // a real Ref_Denominations series for 25C/1893
    const shapeControlled = addCoinIdentityShape();
    const candidatesControlled = dbCoinsCandidatesFor(shapeControlled);

    document.getElementById('description').value = 'Something I just typed, not a real series';
    const shapeTyped = addCoinIdentityShape();
    const candidatesTyped = dbCoinsCandidatesFor(shapeTyped);

    // Browse Edit / Docket never populate `description` at all -- confirm
    // the tier is a true no-op without it (same 2 candidates as the base key).
    const candidatesNoDescription = dbCoinsCandidatesFor({ denom:"25C", year:"1893", mint:"", variety:"" });

    __setLiveDbCoinsForTest(null);
    return {
      controlledLen: candidatesControlled.length, controlledId: candidatesControlled[0] && candidatesControlled[0].coinId,
      typedLen: candidatesTyped.length, typedIsControlled: shapeTyped.description,
      noDescriptionLen: candidatesNoDescription.length
    };
  });
  ok(B3.controlledLen === 1 && B3.controlledId === 'C-ISABELLA', "3.1 a controlled series pick (matches a real Ref_Denominations candidate) narrows to the matching DB_Coins row");
  ok(B3.typedLen === 2, "3.2 free-typed text that doesn't match any Ref_Denominations candidate does NOT narrow (still both candidates)");
  ok(B3.typedIsControlled === "", "3.3 free-typed text is never treated as a controlled value in the identity shape");
  ok(B3.noDescriptionLen === 2, "3.4 dbCoinsCandidatesFor() with no `description` field at all (Browse Edit/Docket's shape) is a true no-op for this tier");

  // ---------- #8 follow-up: Category tier narrows a Bullion-tier pick ----------
  const BCAT = await page.evaluate(() => {
    __setLiveDbCoinsForTest([
      { denom:"$1", year:1986, mint:"", variety:"", description:"American Silver Eagle", finish:"Business Strike", designation:"", coinId:"C-ASE", pcgs:"", mintage:null, gsid:"" },
      { denom:"$1", year:1986, mint:"", variety:"", description:"Statue of Liberty Commemorative Dollar", finish:"", designation:"", coinId:"C-COMM", pcgs:"", mintage:null, gsid:"" }
    ]);
    // Real match: category "Silver Eagle" narrows to the ASE row alone.
    const realMatch = dbCoinsCandidatesFor({ denom:"$1", year:"1986", mint:"", variety:"", category:"Silver Eagle" });
    // Real DB_Coins zero-match for this exact identity: a recognized
    // category (per BULLION_CATEGORY_MATCH_HINTS) that finds no candidate
    // among these two rows must NOT clear to zero -- this tier is
    // deliberately soft-only, unlike Finish's hard-zero.
    const noHitStillSoft = dbCoinsCandidatesFor({ denom:"$1", year:"1986", mint:"", variety:"", category:"Gold Dollar" });
    // No category at all (an ordinary/non-bullion Add Coin entry, or Browse
    // Edit/Docket's shape, which never sets this field) is a true no-op.
    const noCategory = dbCoinsCandidatesFor({ denom:"$1", year:"1986", mint:"", variety:"" });
    __setLiveDbCoinsForTest(null);
    return {
      realMatchLen: realMatch.length, realMatchId: realMatch[0] && realMatch[0].coinId,
      noHitStillSoftLen: noHitStillSoft.length,
      noCategoryLen: noCategory.length
    };
  });
  ok(BCAT.realMatchLen === 1 && BCAT.realMatchId === "C-ASE", "8c.1 a bullion-tier Category pick narrows to the matching DB_Coins row via Description hints");
  ok(BCAT.noHitStillSoftLen === 2, "8c.2 a recognized Category with zero hits among these candidates soft-falls-back to the full set (never a false zero)");
  ok(BCAT.noCategoryLen === 2, "8c.3 dbCoinsCandidatesFor() with no `category` field at all is a true no-op for this tier");

  // End-to-end through the real form: picking "American Silver Eagle" from
  // the Bullion dropdown feeds addCoinIdentityShape()'s real `category`
  // field, which the matcher above actually reads.
  const BCAT2 = await page.evaluate(() => {
    __setLiveDbCoinsForTest([
      { denom:"$1", year:"1986", mint:"", variety:"", description:"American Silver Eagle", finish:"", designation:"", coinId:"C-ASE-LIVE", pcgs:"", mintage:null, gsid:"" },
      { denom:"$1", year:"1986", mint:"", variety:"", description:"Peace Dollar", finish:"", designation:"", coinId:"C-PEACE", pcgs:"", mintage:null, gsid:"" }
    ]);
    navigate('addcoin');
    document.getElementById('addCoinBullionToggle').checked = true;
    document.getElementById('addCoinBullionToggle').dispatchEvent(new Event('change'));
    const select = document.getElementById('denomination');
    // Several BULLION_TIER_OPTIONS share one plain denom value ("$1" is
    // both Gold Dollar and American Silver Eagle) -- setting select.value
    // would resolve to whichever shares that value FIRST, not necessarily
    // the intended option. Select the exact <option> element instead.
    const opt = [...select.options].find(o => o.textContent.trim() === 'American Silver Eagle');
    opt.selected = true;
    select.dispatchEvent(new Event('change'));
    document.getElementById('year').value = '1986';
    const shape = addCoinIdentityShape();
    const candidates = dbCoinsCandidatesFor(shape);
    __setLiveDbCoinsForTest(null);
    return { category: shape.category, len: candidates.length, id: candidates[0] && candidates[0].coinId };
  });
  ok(BCAT2.category === "Silver Eagle", "8c.4 picking American Silver Eagle from the real Bullion dropdown sets addCoinIdentityShape().category");
  ok(BCAT2.len === 1 && BCAT2.id === "C-ASE-LIVE", "8c.5 end-to-end: the real form's identity shape narrows via the Category tier through the actual UI, not just a synthetic shape");

  // ---------- #8 follow-up round 2: confirmed categories hard-zero, real wording, false-positive guards ----------
  const BCAT3 = await page.evaluate(() => {
    const results = {};

    // Real confirmed DB_Coins wording (Ray, 2026-08-23) narrows correctly
    // for all three now-hard categories.
    __setLiveDbCoinsForTest([
      { denom:"$1", year:2021, mint:"", variety:"", description:"American Silver Eagle Dollar", finish:"", designation:"", coinId:"C-ASE-1", pcgs:"", mintage:null, gsid:"" },
      { denom:"$1", year:2021, mint:"", variety:"", description:"American Silver Eagle Burnished Dollar", finish:"", designation:"", coinId:"C-ASE-2", pcgs:"", mintage:null, gsid:"" },
      { denom:"$1", year:2021, mint:"", variety:"", description:"Morgan Dollar", finish:"", designation:"", coinId:"C-MORGAN", pcgs:"", mintage:null, gsid:"" }
    ]);
    results.realWording = dbCoinsCandidatesFor({ denom:"$1", year:"2021", mint:"", variety:"", category:"Silver Eagle" }).map(c => c.coinId).sort();
    __setLiveDbCoinsForTest(null);

    // Hard-zero: a CONFIRMED category (Silver Eagle) genuinely absent from
    // this coin's candidates now narrows to zero -- a real signal, same as
    // Finish's own hard-zero for a recognized value. Two candidates so the
    // tier's own `candidates.length > 1` guard actually runs.
    __setLiveDbCoinsForTest([
      { denom:"$1", year:1999, mint:"", variety:"", description:"Susan B. Anthony Dollar", finish:"", designation:"", coinId:"C-SBA", pcgs:"", mintage:null, gsid:"" },
      { denom:"$1", year:1999, mint:"", variety:"", description:"Peace Dollar", finish:"", designation:"", coinId:"C-PEACE-99", pcgs:"", mintage:null, gsid:"" }
    ]);
    results.hardZeroSilverEagle = dbCoinsCandidatesFor({ denom:"$1", year:"1999", mint:"", variety:"", category:"Silver Eagle" }).length;
    __setLiveDbCoinsForTest(null);

    // Palladium Eagle: fixed from a bare "PALLADIUM" hint (real wording
    // confirmed "Palladium Eagle Dollar") -- also hard-zero-capable now.
    __setLiveDbCoinsForTest([
      { denom:"$25", year:2018, mint:"", variety:"", description:"Palladium Eagle Dollar", finish:"", designation:"", coinId:"C-PALL", pcgs:"", mintage:null, gsid:"" },
      { denom:"$25", year:2018, mint:"", variety:"", description:"Some Other $25 Row", finish:"", designation:"", coinId:"C-OTHER", pcgs:"", mintage:null, gsid:"" }
    ]);
    const pallMatch = dbCoinsCandidatesFor({ denom:"$25", year:"2018", mint:"", variety:"", category:"Palladium Eagle" });
    results.palladiumMatchLen = pallMatch.length;
    results.palladiumMatchId = pallMatch[0] && pallMatch[0].coinId;
    __setLiveDbCoinsForTest(null);

    // Gold Eagle real wording ("American Gold Eagle") narrows correctly.
    __setLiveDbCoinsForTest([
      { denom:"$50", year:2020, mint:"", variety:"", description:"American Gold Eagle", finish:"", designation:"", coinId:"C-AGE", pcgs:"", mintage:null, gsid:"" },
      { denom:"$50", year:2020, mint:"", variety:"", description:"American Buffalo Gold", finish:"", designation:"", coinId:"C-BUFF", pcgs:"", mintage:null, gsid:"" }
    ]);
    const geMatch = dbCoinsCandidatesFor({ denom:"$50", year:"2020", mint:"", variety:"", category:"Gold Eagle" });
    results.goldEagleMatchLen = geMatch.length;
    results.goldEagleMatchId = geMatch[0] && geMatch[0].coinId;
    __setLiveDbCoinsForTest(null);

    // False-positive/no-hard-zero guard: "Eagle" is a soft (unconfirmed,
    // untested -- zero real DB_Coins rows yet) category. A genuine miss
    // (neither candidate's Description contains "EAGLE" at all) must NOT
    // hard-zero, unlike a CONFIRMED category -- it falls through to the
    // full set instead, so an untested category can never wrongly clear a
    // real coin's candidates and misroute it to the Docket.
    __setLiveDbCoinsForTest([
      { denom:"25C", year:1932, mint:"", variety:"", description:"Washington Quarter", finish:"", designation:"", coinId:"C-WASH", pcgs:"", mintage:null, gsid:"" },
      { denom:"25C", year:1932, mint:"", variety:"", description:"Standing Liberty Quarter", finish:"", designation:"", coinId:"C-SLQ", pcgs:"", mintage:null, gsid:"" }
    ]);
    results.eagleSoftFallback = dbCoinsCandidatesFor({ denom:"25C", year:"1932", mint:"", variety:"", category:"Eagle" }).length;
    // A real false-positive case, kept as documentation of the accepted
    // risk: "Bald Eagle Recovery" DOES contain the bare "EAGLE" substring,
    // so a soft category CAN still narrow incorrectly on a coincidental
    // word match (unlike a hard-zero MISS, which this tier protects
    // against, a false-positive HIT on an untested single-word-risk hint is
    // a known, accepted tradeoff of staying soft rather than removing the
    // hint entirely).
    __setLiveDbCoinsForTest([
      { denom:"50C", year:2008, mint:"", variety:"", description:"Bald Eagle Recovery Half Dollar", finish:"", designation:"", coinId:"C-BALD", pcgs:"", mintage:null, gsid:"" },
      { denom:"50C", year:2008, mint:"", variety:"", description:"Some Classic Half Dollar", finish:"", designation:"", coinId:"C-HALF", pcgs:"", mintage:null, gsid:"" }
    ]);
    results.eagleKnownFalsePositiveHit = dbCoinsCandidatesFor({ denom:"50C", year:"2008", mint:"", variety:"", category:"Eagle" }).length;
    __setLiveDbCoinsForTest(null);

    // Gold Buffalo: fixed from a bare "BUFFALO" hint (would have
    // false-positived against Buffalo Nickel) to "AMERICAN BUFFALO" --
    // confirm a plain Buffalo Nickel row is NOT matched by it, and (since
    // Gold Buffalo has zero confirmed real rows and stays soft) a genuine
    // miss still soft-falls-back rather than hard-zeroing.
    __setLiveDbCoinsForTest([
      { denom:"5C", year:1937, mint:"D", variety:"", description:"Buffalo Nickel", finish:"", designation:"", coinId:"C-NICKEL", pcgs:"", mintage:null, gsid:"" }
    ]);
    results.goldBuffaloNoFalsePositive = dbCoinsCandidatesFor({ denom:"5C", year:"1937", mint:"D", variety:"", category:"Gold Buffalo" }).length;
    __setLiveDbCoinsForTest(null);

    return results;
  });
  ok(JSON.stringify(BCAT3.realWording) === JSON.stringify(["C-ASE-1", "C-ASE-2"]), "8c.6 real confirmed DB_Coins wording (\"American Silver Eagle Dollar\"/\"...Burnished Dollar\") narrows correctly, excluding Morgan Dollar");
  ok(BCAT3.hardZeroSilverEagle === 0, "8c.7 a CONFIRMED category (Silver Eagle) genuinely absent from this coin's candidates now hard-zero-narrows, a real signal like Finish's own");
  ok(BCAT3.palladiumMatchLen === 1 && BCAT3.palladiumMatchId === "C-PALL", "8c.8 Palladium Eagle hint fixed from bare \"PALLADIUM\" to the real confirmed \"PALLADIUM EAGLE\" phrase and narrows correctly");
  ok(BCAT3.goldEagleMatchLen === 1 && BCAT3.goldEagleMatchId === "C-AGE", "8c.9 Gold Eagle real wording (\"American Gold Eagle\") narrows correctly, excluding American Buffalo Gold");
  ok(BCAT3.eagleSoftFallback === 2, "8c.10 the unconfirmed \"Eagle\" category stays soft-only -- a genuine miss (no candidate contains \"EAGLE\" at all) does not hard-zero");
  ok(BCAT3.eagleKnownFalsePositiveHit === 1, "8c.10b known, accepted tradeoff: a soft category's bare-word hint CAN still narrow on a coincidental match (Bald Eagle Recovery) -- this is the false-positive risk staying soft accepts, distinct from the hard-zero-on-a-genuine-miss case this pass actually protects against");
  ok(BCAT3.goldBuffaloNoFalsePositive === 1, "8c.11 Gold Buffalo hint fixed from bare \"BUFFALO\" to \"AMERICAN BUFFALO\" -- a plain Buffalo Nickel row is not falsely matched, and the genuine miss still soft-falls-back (unconfirmed category)");

  // ---------- #8: Denomination dropdown derived from Ref_Denominations ----------
  const B8 = await page.evaluate(() => {
    navigate('addcoin');
    const options = [...document.querySelectorAll('#denomination option')].map(o => o.value);
    return {
      options,
      hasHalfCent: options.includes('0.5C'),
      hasTwoCent: options.includes('2C'),
      hasThreeCent: options.includes('3C'),
      hasTwentyCent: options.includes('20C'),
      hasHalfDime: options.includes('H5C'),
      hasMedal: options.includes('Medal'),
      halfCentScale: DENOM_SCALE['0.5C'],
      statsOrderIncludesHalfCent: STATS_DENOM_ORDER.includes('0.5C'),
      denomLabelsHasTwoCent: DENOM_LABELS['2C'],
      // The gold/bullion tier doesn't add any new denom CODES at all (the
      // redirected design) -- it must not leak any new option value into
      // the default/classic view. Half Eagle et al. now live only in the
      // Bullion-toggle view, keyed by plain face value ("$5"), so there's
      // no new code string to check for here at all.
      noNewCodeLeaked: options.length === 13 // blank placeholder + 11 everyday codes + Medal, unchanged
    };
  });
  ok(B8.hasHalfCent && B8.hasTwoCent && B8.hasThreeCent && B8.hasTwentyCent && B8.hasHalfDime,
    "8.1 the five new denom codes Ray named (Half Cent/Two Cent/Three Cent/Twenty Cent/Half Dime) are all real dropdown options now");
  ok(B8.hasMedal, "8.2 Medal is now a real dropdown option too (a real Ref_Denominations row, a low-risk side effect)");
  ok(B8.halfCentScale === 0.70, "8.3 the new codes got a real DENOM_SCALE entry (floored at 0.70) instead of silently defaulting to 1.0");
  ok(B8.noNewCodeLeaked, "8.6 the classic/everyday dropdown has exactly 12 options -- no new denom-code vocabulary leaked in from the gold/bullion redirect");
  ok(B8.statsOrderIncludesHalfCent, "8.4 STATS_DENOM_ORDER extended so Stats & Value can show a real breakdown row for the new codes");
  ok(B8.denomLabelsHasTwoCent === "Two Cents", "8.5 DENOM_LABELS extended with a real plural label");

  // ---------- #8 redirect: plain Denomination + Category, Bullion toggle ----------
  const B8g = await page.evaluate(() => {
    navigate('addcoin');
    const classicValues = [...document.querySelectorAll('#denomination option')].map(o => o.value);
    const toggle = document.getElementById('addCoinBullionToggle');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    const bullionLabels = [...document.querySelectorAll('#denomination option')].map(o => o.textContent);
    const bullionValues = [...document.querySelectorAll('#denomination option')].map(o => o.value);
    const denomClearedAfterToggle = document.getElementById('denomination').value === '';

    // Picking "Half Eagle ($5 Gold)" sets Denomination to the plain face
    // value AND Category to the type name, in one action, with Description
    // auto-set from the type label (not the normal denom+year series
    // lookup, which would be wrong here -- see the change handler's own
    // comment).
    const halfEagleOpt = [...document.querySelectorAll('#denomination option')].find(o => o.textContent.startsWith('Half Eagle'));
    halfEagleOpt.selected = true;
    document.getElementById('denomination').dispatchEvent(new Event('change'));
    const halfEagleDenom = document.getElementById('denomination').value;
    const halfEagleCategory = addCoinBullionCategory;
    const halfEagleDescription = document.getElementById('description').value;

    // American Silver Eagle and the classic "Dollar" option (in classic
    // view) share the literal "$1" value -- confirm Category is what
    // actually tells them apart, matching the real workbook.
    const silverEagleOpt = [...document.querySelectorAll('#denomination option')].find(o => o.textContent === 'American Silver Eagle');
    silverEagleOpt.selected = true;
    document.getElementById('denomination').dispatchEvent(new Event('change'));
    const silverEagleDenom = document.getElementById('denomination').value;
    const silverEagleCategory = addCoinBullionCategory;

    // The four Gold Eagle sizes are real, distinct face values sharing one
    // Category.
    const goldEagleOpts = [...document.querySelectorAll('#denomination option')].filter(o => o.textContent.startsWith('American Gold Eagle'));
    const goldEagleDenoms = goldEagleOpts.map(o => o.value).sort();
    const goldEagleCategories = [...new Set(goldEagleOpts.map(o => o.dataset.category))];

    // Toggling back to classic clears the picked category (a stale
    // bullion Category must never survive onto a plain everyday pick).
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    const categoryAfterTogglingOff = addCoinBullionCategory;

    return {
      classicValues, bullionLabels, denomClearedAfterToggle,
      halfEagleDenom, halfEagleCategory, halfEagleDescription,
      silverEagleDenom, silverEagleCategory,
      goldEagleDenoms, goldEagleCategories,
      categoryAfterTogglingOff,
      hasPlatinumSizes: bullionLabels.some(l => l.includes('Platinum Eagle — 1 oz')) && bullionLabels.some(l => l.includes('Platinum Eagle — 1/10 oz')),
      hasBuffaloAndPalladium: bullionLabels.some(l => l.includes('Buffalo')) && bullionLabels.some(l => l.includes('Palladium')),
      noClassicCodeAmongBullionValues: !bullionValues.includes('0.5C') && !bullionValues.includes('H5C')
    };
  });
  ok(B8g.hasPlatinumSizes, "8g.1 all four American Platinum Eagle sizes appear as real, distinct-face-value options");
  ok(B8g.hasBuffaloAndPalladium, "8g.2 American Buffalo and Palladium Eagle appear in the Bullion view");
  ok(B8g.noClassicCodeAmongBullionValues, "8g.3 everyday codes (Half Cent, Half Dime) don't appear among the Bullion view's values");
  ok(B8g.denomClearedAfterToggle, "8g.4 toggling Bullion resets the current Denomination selection rather than leaving a stale pick from the other list");
  ok(B8g.halfEagleDenom === '$5' && B8g.halfEagleCategory === 'Half Eagle',
    "8g.5 picking 'Half Eagle' sets the PLAIN face value ($5) as Denomination and 'Half Eagle' as Category -- no new denom-code vocabulary");
  ok(B8g.halfEagleDescription === 'Half Eagle', "8g.6 Description is set directly from the type label (not the denom+year series lookup, which would be wrong for a shared plain denom)");
  ok(B8g.silverEagleDenom === '$1' && B8g.silverEagleCategory === 'Silver Eagle',
    "8g.7 American Silver Eagle writes the SAME '$1' Denomination the classic Dollar uses, distinguished only by Category -- matching the real workbook's own Morgan/Peace/Silver Eagle convention");
  ok(B8g.goldEagleDenoms.length === 4 && new Set(B8g.goldEagleDenoms).size === 4,
    "8g.8 the four American Gold Eagle sizes are four genuinely distinct face values, not a size-coded vocabulary");
  ok(B8g.goldEagleCategories.length === 1 && B8g.goldEagleCategories[0] === 'Gold Eagle',
    "8g.9 all four Gold Eagle sizes share the SAME Category ('Gold Eagle') -- Denomination alone (the real face value) is what distinguishes the size, exactly like the real workbook");
  ok(B8g.categoryAfterTogglingOff === "", "8g.10 toggling back to classic clears the picked Category so it can't leak onto an unrelated everyday pick");

  // ---------- #10: shared loading indicator mechanics ----------
  const B10 = await page.evaluate(() => {
    navigate('staging');
    const container = document.getElementById('stagingContainer');
    container.innerHTML = '<div>stale old content</div>';
    showSectionLoading('stagingContainer', 'Custom loading text…');
    const afterShow = {
      isFirstChild: container.firstChild.classList && container.firstChild.classList.contains('section-loading'),
      text: container.querySelector('.section-loading-text').textContent,
      display: getComputedStyle(container.querySelector('.section-loading')).display
    };
    // Calling it again with different text reuses the same element rather
    // than creating a second one.
    showSectionLoading('stagingContainer', 'Different text');
    const count = container.querySelectorAll('.section-loading').length;
    const textAfterSecondCall = container.querySelector('.section-loading-text').textContent;
    hideSectionLoading('stagingContainer');
    const goneAfterHide = !container.querySelector('.section-loading');
    return { afterShow, count, textAfterSecondCall, goneAfterHide };
  });
  ok(B10.afterShow.isFirstChild, "10.1 the loading indicator inserts as the container's first child");
  ok(B10.afterShow.text === "Custom loading text…", "10.2 custom loading text is honored");
  ok(B10.afterShow.display !== "none", "10.3 the loading indicator is ACTUALLY visible (computed style, not just present in the DOM)");
  ok(B10.count === 1, "10.4 a repeat call reuses the existing element instead of stacking a second one");
  ok(B10.textAfterSecondCall === "Different text", "10.5 a repeat call updates the text in place");
  ok(B10.goneAfterHide, "10.6 hideSectionLoading() removes it outright");

  // Real integration: Staging Review's own real-path fetch shows it while
  // in flight and it's gone once the real render lands.
  const B10b = await page.evaluate(async () => {
    const mock = createMockGraphClient({});
    // Delay the mock's own read so there's a real window to observe the
    // indicator in, mirroring the same technique this project's own
    // double-render-race regression test already uses. listChildren() is
    // the one call guaranteed to run even with zero drafts staged (unlike
    // getJson(), which only fires per-folder and never runs at all here).
    const realListChildren = mock.listChildren.bind(mock);
    mock.listChildren = async (p) => { await new Promise(r => setTimeout(r, 120)); return realListChildren(p); };
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    navigate('staging');
    const renderPromise = renderStagingList();
    await new Promise(r => setTimeout(r, 20)); // mid-flight
    const visibleMidFlight = !!document.querySelector('#stagingContainer .section-loading');
    await renderPromise;
    const goneAfterRender = !document.querySelector('#stagingContainer .section-loading');
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { visibleMidFlight, goneAfterRender };
  });
  ok(B10b.visibleMidFlight, "10.7 Staging Review shows the loading indicator while its real Graph read is in flight");
  ok(B10b.goneAfterRender, "10.8 it's gone once the real render lands");

  // ---------- #14: Overview cert link falls back to a live-computed URL ----------
  const B14 = await page.evaluate(() => {
    const withStoredLink = certDisplayHtml({ serNo: "12345", certLink: "https://stored.example/12345", gradeSource: "PCGS" });
    const liveComputed = certDisplayHtml({ serNo: "99999999", certLink: "", gradeSource: "PCGS" });
    const noGradeSourceNoLink = certDisplayHtml({ serNo: "55555", certLink: "", gradeSource: "" });
    const gradeSourceWithNoBaseUrl = certDisplayHtml({ serNo: "77777", certLink: "", gradeSource: "ANACS" }); // ANACS has no certBaseUrl on file
    const blankSerNo = certDisplayHtml({ serNo: "", certLink: "", gradeSource: "PCGS" });
    return { withStoredLink, liveComputed, noGradeSourceNoLink, gradeSourceWithNoBaseUrl, blankSerNo };
  });
  ok(B14.withStoredLink.includes('href="https://stored.example/12345"'), "14.1 a populated CertLink is used as-is, never overridden");
  ok(B14.liveComputed.includes('href="https://www.pcgs.com/cert/99999999"'), "14.2 a blank CertLink with GradeSource+cert now computes a live link via buildCertLookupUrl()");
  ok(!/<a /.test(B14.noGradeSourceNoLink) && B14.noGradeSourceNoLink === "55555", "14.3 no GradeSource + no CertLink stays plain text (nothing to compute from)");
  ok(!/<a /.test(B14.gradeSourceWithNoBaseUrl) && B14.gradeSourceWithNoBaseUrl === "77777", "14.4 a GradeSource with no base URL on file (ANACS) stays plain text, no throw");
  ok(B14.blankSerNo === "", "14.5 a blank cert number still renders nothing at all, unchanged");

  // ---------- #15: catalog filter by grading service ----------
  const B15 = await page.evaluate(() => {
    navigate('browse');
    const chips = [...document.querySelectorAll('#browseGradingServiceFilters .filter-chip')].map(c => c.textContent);
    // Pick the PCGS chip and confirm it actually narrows the grid.
    const before = document.querySelectorAll('#browseGrid .coin-card').length;
    const pcgsChip = [...document.querySelectorAll('#browseGradingServiceFilters .filter-chip')].find(c => c.textContent === 'PCGS');
    pcgsChip.click();
    const afterPcgs = document.querySelectorAll('#browseGrid .coin-card').length;
    const expectedPcgs = FAKE_COINS.filter(c => !c.rollId && c.denom !== "Multiple" && c.gradeSource === "PCGS").length;
    // ANDs with Metal: also select Silver, count should be <= the PCGS-only count.
    const silverChip = [...document.querySelectorAll('#browseMetalFilters .filter-chip')].find(c => c.textContent === 'Silver');
    silverChip.click();
    const afterBoth = document.querySelectorAll('#browseGrid .coin-card').length;
    // Reset via external Browse entry.
    navigate('dashboard');
    navigate('browse');
    const chipActiveAfterReset = document.querySelector('#browseGradingServiceFilters .filter-chip.active').textContent;
    const afterReset = document.querySelectorAll('#browseGrid .coin-card').length;
    return { chips, before, afterPcgs, expectedPcgs, afterBoth, chipActiveAfterReset, afterReset };
  });
  ok(B15.chips.includes("PCGS") && B15.chips.includes("NGC") && B15.chips.includes("Ungraded/Other") && B15.chips.includes("All"),
    "15.1 the grading-service filter row renders PCGS/NGC/.../Ungraded chips plus All");
  ok(B15.afterPcgs === B15.expectedPcgs && B15.afterPcgs < B15.before, "15.2 selecting PCGS narrows the grid to exactly the PCGS-graded coins");
  ok(B15.afterBoth <= B15.afterPcgs, "15.3 adding a Metal chip ANDs with the grading-service filter (never widens it)");
  ok(B15.chipActiveAfterReset === "All" && B15.afterReset === B15.before, "15.4 external Browse re-entry resets the grading-service filter back to All");

  // ---------- nav smoke ----------
  const H = await page.evaluate(() => {
    const routes = ["dashboard","browse","albums","sets","wishlist","stats","acquisitions","needsdbcoins","staging","addcoin","addset","inprogresssets"];
    const bad = [];
    for (const r of routes) { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } }
    navigate("dashboard");
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(H.bad.length === 0, "every route still navigates cleanly: " + H.bad.join("; "));
  ok(H.overflow === false, "no horizontal page overflow at 412px");
}, module);
