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
      // Gold/bullion codes now DO exist (the follow-up round), but must not
      // leak into the default/classic dropdown view — see the Bullion
      // toggle block below for where they actually show up.
      noBullionCodeInClassicView: !options.includes('AGE-1OZ') && !options.includes('APE-1OZ') && !options.includes('GBUF') && !options.includes('APDE'),
      hasClassicGoldCode: options.includes('G$5') // classic pre-1933 gold DOES show in the default view
    };
  });
  ok(B8.hasHalfCent && B8.hasTwoCent && B8.hasThreeCent && B8.hasTwentyCent && B8.hasHalfDime,
    "8.1 the five new denom codes Ray named (Half Cent/Two Cent/Three Cent/Twenty Cent/Half Dime) are all real dropdown options now");
  ok(B8.hasMedal, "8.2 Medal is now a real dropdown option too (a real Ref_Denominations row, a low-risk side effect)");
  ok(B8.halfCentScale === 0.70, "8.3 the new codes got a real DENOM_SCALE entry (floored at 0.70) instead of silently defaulting to 1.0");
  ok(B8.noBullionCodeInClassicView, "8.6a bullion-era codes (Gold/Platinum Eagle, Buffalo, Palladium) are hidden in the default classic view");
  ok(B8.hasClassicGoldCode, "8.6b classic pre-1933 gold (Half Eagle) shows in the default classic view, unlike bullion");
  ok(B8.statsOrderIncludesHalfCent, "8.4 STATS_DENOM_ORDER extended so Stats & Value can show a real breakdown row for the new codes");
  ok(B8.denomLabelsHasTwoCent === "Two Cents", "8.5 DENOM_LABELS extended with a real plural label");

  // ---------- #8 follow-up: gold/bullion tier + Bullion toggle ----------
  const B8g = await page.evaluate(() => {
    navigate('addcoin');
    const classicOptions = [...document.querySelectorAll('#denomination option')].map(o => o.value);
    const toggle = document.getElementById('addCoinBullionToggle');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    const bullionOptions = [...document.querySelectorAll('#denomination option')].map(o => o.value);
    const bullionLabels = [...document.querySelectorAll('#denomination option')].map(o => o.textContent);
    // The Denomination select gets reset (its own "change" handler fires,
    // clearing the flip labels etc.) -- confirm it's actually blank after
    // toggling, not left on a stale classic-mode selection.
    const denomClearedAfterToggle = document.getElementById('denomination').value === '';

    // Series matching still works correctly for the new codes.
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    document.getElementById('denomination').value = 'G$5'; // classic Half Eagle
    document.getElementById('year').value = '1900';
    maybeAutoFillDescription();
    const classicGoldSeries = document.getElementById('description').value;

    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    document.getElementById('denomination').value = 'AGE-1OZ';
    document.getElementById('year').value = '2000';
    maybeAutoFillDescription();
    const bullionSeries = document.getElementById('description').value;

    // Silver Eagle and Dollar are two differently-labeled options sharing
    // the identical underlying code -- confirm both really do write "$1".
    const silverEagleOption = [...document.querySelectorAll('#denomination option')].find(o => o.textContent.includes('American Silver Eagle'));
    const silverEagleValue = silverEagleOption ? silverEagleOption.value : null;

    return {
      classicOptions, bullionOptions, bullionLabels, denomClearedAfterToggle,
      classicGoldSeries, bullionSeries, silverEagleValue,
      hasAGE: bullionOptions.includes('AGE-1OZ') && bullionOptions.includes('AGE-1/2OZ') && bullionOptions.includes('AGE-1/4OZ') && bullionOptions.includes('AGE-1/10OZ'),
      hasAPE: bullionOptions.includes('APE-1OZ') && bullionOptions.includes('APE-1/2OZ') && bullionOptions.includes('APE-1/4OZ') && bullionOptions.includes('APE-1/10OZ'),
      hasGBUF: bullionOptions.includes('GBUF'),
      hasAPDE: bullionOptions.includes('APDE'),
      noClassicCodeInBullionView: !bullionOptions.includes('0.5C') && !bullionOptions.includes('G$5')
    };
  });
  ok(B8g.hasAGE, "8g.1 all four American Gold Eagle sizes appear as real, size-distinct codes");
  ok(B8g.hasAPE, "8g.2 all four American Platinum Eagle sizes appear as real, size-distinct codes");
  ok(B8g.hasGBUF && B8g.hasAPDE, "8g.3 American Buffalo and Palladium Eagle appear in the Bullion view");
  ok(B8g.noClassicCodeInBullionView, "8g.4 classic/everyday codes are hidden in the Bullion view (the two lists don't overlap, aside from the deliberate Silver Eagle/$1 case)");
  ok(B8g.denomClearedAfterToggle, "8g.5 toggling Bullion resets the current Denomination selection rather than leaving a stale pick from the other list");
  ok(B8g.classicGoldSeries === 'Liberty Head Motto', "8g.6 a classic gold code (Half Eagle, G$5) still resolves the correct series for its year (1900)");
  ok(B8g.bullionSeries === 'Liberty/Family of Eagles Type 1', "8g.7 a bullion code (1 oz American Gold Eagle) resolves the correct series for its year (2000)");
  ok(B8g.silverEagleValue === '$1', "8g.8 the 'American Silver Eagle' bullion-view option writes the IDENTICAL '$1' code the classic 'Dollar' option does");

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
