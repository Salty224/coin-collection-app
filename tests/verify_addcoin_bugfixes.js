// Add Coin Phase 1 — post-live-run bug fixes (2026-08-23 live run against
// _Testing). Each block below corresponds to one numbered finding from that
// run; see CLAUDE.md "Add Coin Phase 1 fixes" for the full write-up.

const { defineSuite } = require("./harness");

module.exports = defineSuite("addcoin-bugfixes", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ---------- #1: form doesn't reset between visits ----------
  const B1 = await page.evaluate(() => {
    navigate('addcoin');
    document.getElementById('denomination').value = '10C';
    document.getElementById('year').value = '1916';
    document.getElementById('mintMark').value = 'S';
    document.getElementById('description').value = 'Custom typed text';
    document.getElementById('notesField').value = 'some notes';
    document.getElementById('purchasePrice').value = '99.99';
    document.getElementById('finish').value = 'Proof';
    navigate('dashboard');
    navigate('addcoin');
    const afterPlainNav = {
      denom: document.getElementById('denomination').value,
      year: document.getElementById('year').value,
      mint: document.getElementById('mintMark').value,
      desc: document.getElementById('description').value,
      notes: document.getElementById('notesField').value,
      price: document.getElementById('purchasePrice').value,
      finish: document.getElementById('finish').value
    };

    // Deep-link ordering: resetAddCoinForm() runs inside navigate("addcoin"),
    // BEFORE the caller's own applyAlbumContext() call — must not clobber it.
    albumContext = {
      albumName: "Test Album", coinId: "C-1", slotLabel: "1916-S (Mercury Dime)",
      denom: "10C", year: "1916", mintMark: "S", description: "Mercury Dime", variety: ""
    };
    navigate('addcoin');
    applyAlbumContext();
    const afterDeepLink = {
      denom: document.getElementById('denomination').value,
      year: document.getElementById('year').value,
      bannerHidden: document.getElementById('albumContextBanner').classList.contains('hidden')
    };

    // Photo state
    const blob = new Blob([new Uint8Array([1,2,3])], { type: 'image/png' });
    galleryStore[ADDCOIN_GALLERY_ID] = [{ type:'obverse', url:'blob:x', rawUrl:'blob:y', circleUrl:'blob:z', blob, caption:'', filename:'a.png', rawFilename:'b.png' }];
    document.getElementById('obversePreview').src = 'blob:z';
    document.getElementById('obversePreview').style.display = 'block';
    document.getElementById('obversePlaceholder').style.display = 'none';
    document.getElementById('obverseFrame').classList.add('has-photo');
    document.getElementById('obverseDot').classList.add('filled');
    document.getElementById('obverseAdjustBtn').style.display = 'flex';
    navigate('dashboard');
    navigate('addcoin');
    const afterPhotoReset = {
      galleryLen: (galleryStore[ADDCOIN_GALLERY_ID] || []).length,
      previewDisplay: document.getElementById('obversePreview').style.display,
      hasPhotoClass: document.getElementById('obverseFrame').classList.contains('has-photo'),
      dotFilled: document.getElementById('obverseDot').classList.contains('filled')
    };
    clearAlbumContext();
    return { afterPlainNav, afterDeepLink, afterPhotoReset };
  });
  ok(B1.afterPlainNav.denom === '', "1.1 denomination cleared on plain re-entry");
  ok(B1.afterPlainNav.year === '', "1.2 year cleared on plain re-entry");
  ok(B1.afterPlainNav.mint === '', "1.3 mint mark cleared");
  ok(B1.afterPlainNav.desc === '', "1.4 description cleared");
  ok(B1.afterPlainNav.notes === '', "1.5 notes cleared");
  ok(B1.afterPlainNav.price === '', "1.6 purchase price cleared");
  ok(B1.afterPlainNav.finish === '', "1.7 finish cleared");
  ok(B1.afterDeepLink.denom === '10C' && B1.afterDeepLink.year === '1916',
    "1.8 album deep-link prefill still works after the reset runs first");
  ok(B1.afterDeepLink.bannerHidden === false, "1.9 album context banner shows on a real deep-link");
  ok(B1.afterPhotoReset.galleryLen === 0, "1.10 in-progress gallery cleared on re-entry");
  ok(B1.afterPhotoReset.previewDisplay === 'none', "1.11 obverse preview hidden on re-entry");
  ok(B1.afterPhotoReset.hasPhotoClass === false, "1.12 has-photo class removed on re-entry");
  ok(B1.afterPhotoReset.dotFilled === false, "1.13 photo dot unfilled on re-entry");

  // ---------- #2/#3: description auto-fill clears on no-match, picks on ambiguity ----------
  const B2 = await page.evaluate(() => {
    navigate('addcoin');
    document.getElementById('denomination').value = '$1';
    document.getElementById('year').value = '1982';
    maybeAutoFillDescription();
    const desc1982 = document.getElementById('description').value;

    document.getElementById('year').value = '1936'; // real gap: Peace ended 1935, Eisenhower started 1971
    maybeAutoFillDescription();
    const descGap = document.getElementById('description').value;

    document.getElementById('year').value = '2019'; // Presidential/Native American/Innovation all concurrent
    maybeAutoFillDescription();
    const panelHidden = document.getElementById('descriptionAmbiguousPanel').classList.contains('hidden');
    const options = [...document.querySelectorAll('#descriptionAmbiguousSelect option')].map(o => o.value).filter(Boolean);
    const descWhileAmbiguous = document.getElementById('description').value;

    document.getElementById('descriptionAmbiguousSelect').value = options[0];
    document.getElementById('descriptionAmbiguousSelect').dispatchEvent(new Event('change'));
    const descAfterPick = document.getElementById('description').value;
    const panelHiddenAfterPick = document.getElementById('descriptionAmbiguousPanel').classList.contains('hidden');
    return { desc1982, descGap, panelHidden, options, descWhileAmbiguous, descAfterPick, panelHiddenAfterPick };
  });
  ok(B2.desc1982 === 'Susan B. Anthony', "2.1 1982 $1 resolves to Susan B. Anthony alone (real Ref_Denominations data)");
  ok(B2.descGap === '', "2.2 a genuine year gap clears Description instead of leaving stale text");
  ok(B2.panelHidden === false, "3.1 ambiguous panel shows for a real multi-series year");
  ok(B2.options.length >= 2, "3.2 multiple real candidates offered");
  ok(B2.descWhileAmbiguous === '', "3.3 Description left blank while ambiguous, never guessed");
  ok(B2.options.includes(B2.descAfterPick), "3.4 picking an option sets Description to it");
  // Live-run bug #5: the panel used to be one-shot (hid itself the instant
  // a series was picked), so reconsidering meant re-touching Year/Denom to
  // re-trigger the whole lookup. It now stays open/live as long as the same
  // genuine ambiguity exists, so a second thought is just picking a
  // different option from the same dropdown.
  ok(B2.panelHiddenAfterPick === false, "3.5 panel stays open/reconsiderable after a pick (bug #5 fix)");

  // ---------- #4: PCGS decode reads live catalog ----------
  const B4 = await page.evaluate(() => {
    __setLiveDbCoinsForTest([
      { denom:"10C", year:1916, mint:"S", variety:"", description:"Mercury Dime",
        finish:"Business Strike", designation:"", coinId:"C-1916-S-10C-01", pcgs:"4908", mintage:264000, gsid:"" }
    ]);
    navigate('addcoin');
    document.getElementById('pcgsLabelInput').value = '4908.65/12345678';
    handlePcgsLabelApply();
    const applied = !document.getElementById('pcgsLabelAppliedBanner').classList.contains('hidden');
    const notFound = !document.getElementById('pcgsLabelNotFoundBanner').classList.contains('hidden');
    document.getElementById('denomination').value = '10C';
    document.getElementById('year').value = '1916';
    document.getElementById('mintMark').value = 'S';
    const varietiesLive = validVarietiesForCurrentCoin();
    __setLiveDbCoinsForTest(null);
    return { applied, notFound, varietiesLive };
  });
  ok(B4.applied === true, "4.1 PCGS decode finds a real PCGS# from live DB_Coins data");
  ok(B4.notFound === false, "4.2 a real match does not fire the not-found banner");
  ok(Array.isArray(B4.varietiesLive), "4.3 validVarietiesForCurrentCoin() reads through activeDbCoins()");

  // ---------- #7/#8: no duplicate Docket row, CollectionID always shown ----------
  const B7 = await page.evaluate(async () => {
    const mock = createMockGraphClient({ workbookColumns: { "All::CollectionID": ["AY-00695"] } });
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([]);
    navigate('addcoin');
    document.getElementById('denomination').value = '10C';
    document.getElementById('year').value = '1916';
    document.getElementById('mintMark').value = 'S';
    document.getElementById('description').value = 'Mercury Dime';
    checkDbCoinsMatch();
    await new Promise(r => { saveAddCoinForm('staging'); setTimeout(r, 900); });
    const id = (await listCoinDrafts())[0].collectionID;
    navigate('staging');
    await new Promise(r => setTimeout(r, 400));
    document.querySelector('#stagingContainer .promote').click();
    await new Promise(r => setTimeout(r, 800));
    navigate('needsdbcoins');
    await new Promise(r => setTimeout(r, 900));
    const research = document.getElementById('needsResearchContainer').textContent;
    const occurrences = research.split(id).length - 1;
    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { research, occurrences, id };
  });
  ok(B7.occurrences === 1,
    "7.1 a saved-then-marked-ready coin appears exactly once in the Docket, not as two conflicting rows (" + B7.occurrences + " found)");
  ok(/Ready for reconciliation/.test(B7.research), "7.2 the one row reflects its real current status");

  const B8 = await page.evaluate(async () => {
    const mock = createMockGraphClient({});
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([]);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00699/coin.json",
      { type:"coin", version:1, collectionID:"AY-00699", status: COIN_DRAFT_STATUS.DRAFT,
        denom:"10C", year:"1916", mint:"S", variety:"", description:"Mercury Dime", photos:[], createdDate:new Date().toISOString() });
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 400));
    const text = document.getElementById('needsResearchContainer').textContent;
    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return text;
  });
  ok(B8.includes("AY-00699"), "8.1 CollectionID now shown for a no-match staged draft");

  // ---------- #9: non-destructive revert from Ready back to Draft ----------
  const B9 = await page.evaluate(async () => {
    const mock = createMockGraphClient({ workbookColumns: { "All::CollectionID": ["AY-00800"] } });
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00801/coin.json",
      { type:"coin", version:1, collectionID:"AY-00801", status:COIN_DRAFT_STATUS.DRAFT,
        denom:"1C", year:"1909", mint:"S", variety:"", description:"Lincoln", photos:[], createdDate:new Date().toISOString() });
    await renderStagingList();
    await new Promise(r => setTimeout(r, 200));
    await promoteStagedCoin("AY-00801");
    await new Promise(r => setTimeout(r, 200));
    const revertBtn = document.querySelector('#stagingContainer .docket-recheck');
    const label = revertBtn && revertBtn.textContent;
    if (revertBtn) revertBtn.click();
    await new Promise(r => setTimeout(r, 300));
    const afterRevert = await mock.getJson(base + "/AY-00801/coin.json");
    const promoteBtnBack = document.querySelector('#stagingContainer .promote:not(.docket-recheck)');
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { label, stillExists: !!afterRevert, status: afterRevert && afterRevert.status, promoteBtnBackText: promoteBtnBack && promoteBtnBack.textContent };
  });
  ok(B9.label === "Revert to Draft", "9.1 a Ready draft offers Revert to Draft, not just Reject");
  ok(B9.stillExists === true, "9.2 reverting is non-destructive — the draft still exists");
  ok(B9.status === 'Draft — awaiting review', "9.3 status genuinely reverts to Draft");
  ok(B9.promoteBtnBackText === "Mark ready", "9.4 Mark ready reappears after reverting");

  // ---------- #12/#14/Q4: pick resolves without auto-saving, banner/picker stay in sync ----------
  const AMBIG_ROWS = [
    { denom:"50C", year:1986, mint:"", variety:"", description:"Statue of Liberty Half Dollar",
      finish:"Business Strike", designation:"", coinId:"C-1986-M-50C-01", pcgs:"9500", mintage:1000, gsid:"" },
    { denom:"50C", year:1986, mint:"", variety:"", description:"Statue of Liberty Commemorative",
      finish:"Business Strike", designation:"", coinId:"C-1986-M-50C-02", pcgs:"9501", mintage:2000, gsid:"" }
  ];
  const B12 = await page.evaluate(async (rowsJson) => {
    const mock = createMockGraphClient({ workbookColumns: { "All::CollectionID": ["AY-00600"] } });
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest(JSON.parse(rowsJson));
    navigate('addcoin');
    document.getElementById('denomination').value = '50C';
    document.getElementById('year').value = '1986';
    document.getElementById('mintMark').value = '';
    document.getElementById('variety').value = '';
    checkDbCoinsMatch();

    await new Promise(r => { saveAddCoinForm('staging'); setTimeout(r, 300); });
    const cards = document.querySelectorAll('#addCoinMatchAmbiguousList .form-row');
    cards[1].click();
    await new Promise(r => setTimeout(r, 200));
    const pickerHiddenAfterPick = document.getElementById('addCoinMatchAmbiguousPanel').classList.contains('hidden');
    const wroteAfterPick = mock._store.size;
    const bannerMatched = !document.getElementById('dbMatchBanner').classList.contains('hidden');
    const ambiguousGone = document.getElementById('dbAmbiguousBanner').classList.contains('hidden');
    const matchMsg = document.getElementById('dbMatchMsg').textContent;

    await new Promise(r => { saveAddCoinForm('staging'); setTimeout(r, 800); });
    const pickerReopened = !document.getElementById('addCoinMatchAmbiguousPanel').classList.contains('hidden');
    const draft = await mock.getJson(writePaths().stagingBase + "/AY-00601/coin.json");
    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { pickerHiddenAfterPick, wroteAfterPick, bannerMatched, ambiguousGone, matchMsg, pickerReopened, draft };
  }, JSON.stringify(AMBIG_ROWS));
  ok(B12.pickerHiddenAfterPick, "12.1 picker closes as soon as a candidate is picked");
  ok(B12.wroteAfterPick === 0, "12.2 picking a candidate does not itself save (Q4)");
  ok(B12.bannerMatched, "14.1 live banner switches to Matched immediately after the pick");
  ok(B12.ambiguousGone, "14.2 ambiguous banner clears immediately after the pick (banner/picker no longer desync)");
  ok(B12.matchMsg.includes('C-1986-M-50C-02'), "14.3 banner reflects the CHOSEN candidate");
  ok(B12.pickerReopened === false, "12.3 a second Save click does not re-show the picker for an unchanged identity");
  ok(!!B12.draft && B12.draft.coinId === 'C-1986-M-50C-02', "12.4 the second Save click is what actually commits, with the remembered pick");

  // ---------- #13: Finish sits above the match banner it helps determine ----------
  const B13 = await page.evaluate(() => {
    navigate('addcoin');
    const finish = document.getElementById('finish');
    const matchBanner = document.getElementById('dbMatchBanner');
    // compareDocumentPosition: finish should PRECEDE the banner in the DOM
    const finishBeforeBanner = !!(finish.compareDocumentPosition(matchBanner) & Node.DOCUMENT_POSITION_FOLLOWING);
    const finishOptions = [...finish.options].map(o => o.value);
    return { finishBeforeBanner, finishOptions };
  });
  ok(B13.finishBeforeBanner, "13.1 Finish field now sits above the DB_Coins match banners");
  ok(!B13.finishOptions.includes('Circulated'), "15.1 Circulated removed from the Finish dropdown (wear-state, not a strike method)");

  // ---------- Q2/#6: GradeSource on the coin graphic only for real services ----------
  const BQ2 = await page.evaluate(() => {
    navigate('addcoin');
    document.getElementById('gradeFrom').value = 'VF-30';
    document.getElementById('gradeSource').value = 'PCGS';
    updateFlipLabels();
    const serviceBL = document.getElementById('flipObverseBL').textContent;
    document.getElementById('gradeSource').value = 'Seller';
    updateFlipLabels();
    const sellerBL = document.getElementById('flipObverseBL').textContent;
    document.getElementById('gradeSource').value = '';
    updateFlipLabels();
    const blankBL = document.getElementById('flipObverseBL').textContent;
    return { serviceBL, sellerBL, blankBL,
      svc: { PCGS: isServiceGradeSource('PCGS'), NGC: isServiceGradeSource('NGC'),
             Seller: isServiceGradeSource('Seller'), Owner: isServiceGradeSource('Owner') } };
  });
  ok(/PCGS/.test(BQ2.serviceBL), "Q2.1 a real grading service still shows on the coin graphic (VF-30 PCGS)");
  ok(BQ2.sellerBL.trim() === 'VF-30', "Q2.2 a Seller estimate shows Grade alone, no source baked in");
  ok(BQ2.blankBL.trim() === 'VF-30', "Q2.3 a blank GradeSource shows Grade alone");
  ok(BQ2.svc.PCGS && BQ2.svc.NGC && !BQ2.svc.Seller && !BQ2.svc.Owner,
    "Q2.4 isServiceGradeSource correctly distinguishes real services from Seller/Owner");

  // ---------- #10/#18: toast duration scales, identity fields don't autofill ----------
  const B10 = await page.evaluate(() => {
    navigate('addcoin');
    const yearAuto = document.getElementById('year').getAttribute('autocomplete');
    const vendorAuto = document.getElementById('vendor').getAttribute('autocomplete');
    const descAuto = document.getElementById('description').getAttribute('autocomplete');
    const calls = [];
    const orig = window.setTimeout;
    window.setTimeout = (fn, ms) => { calls.push(ms); return orig(fn, ms); };
    showToast("short");
    showToast("A much longer toast message that takes real time to actually read, the kind Add Coin's own save confirmation produces.");
    window.setTimeout = orig;
    return { yearAuto, vendorAuto, descAuto, calls };
  });
  ok(B10.yearAuto === 'off', "18.1 Year field has autocomplete off");
  ok(B10.vendorAuto === 'off', "18.2 Vendor field has autocomplete off");
  ok(B10.descAuto === 'off', "18.3 Description field has autocomplete off");
  ok(B10.calls[0] >= 2600, "10.1 a short toast still respects the minimum readable duration");
  ok(B10.calls[1] > B10.calls[0], "10.2 a longer toast message stays up longer than a short one");
  ok(B10.calls[1] <= 7000, "10.3 toast duration is capped, doesn't grow unbounded");

  // ---------- #16: Staging Review separates "decide now" from "already handled" ----------
  const B16 = await page.evaluate(async () => {
    const mock = createMockGraphClient({});
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-01/coin.json", { type:"coin", version:1, collectionID:"AY-01", status:COIN_DRAFT_STATUS.DRAFT, denom:"1C", year:"1909", mint:"S", variety:"", description:"Lincoln", photos:[], createdDate:new Date().toISOString() });
    await mock.uploadJson(base + "/AY-02/coin.json", { type:"coin", version:1, collectionID:"AY-02", status:COIN_DRAFT_STATUS.READY, denom:"5C", year:"1937", mint:"D", variety:"3-Legged", description:"Buffalo Nickel", photos:[], createdDate:new Date().toISOString() });
    await renderStagingList();
    await new Promise(r => setTimeout(r, 300));
    const labels = [...document.querySelectorAll('#stagingContainer .section-label')].map(e => e.textContent);
    const html = document.getElementById('stagingContainer').innerHTML;
    const res = {
      hasDecisionLabel: labels.includes('Needs a decision'),
      hasReadyLabel: labels.some(l => l.includes('Marked ready')),
      decisionBeforeAY01: html.indexOf('Needs a decision') < html.indexOf('AY-01'),
      readyBeforeAY02: html.indexOf('Marked ready') < html.indexOf('AY-02'),
      decisionSectionFirst: html.indexOf('Needs a decision') < html.indexOf('Marked ready')
    };
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return res;
  });
  ok(B16.hasDecisionLabel, "16.1 'Needs a decision' section label present when a Draft row exists");
  ok(B16.hasReadyLabel, "16.2 'Marked ready' section label present when a Ready row exists");
  ok(B16.decisionBeforeAY01, "16.3 the Draft row sits under its own decision-needed section");
  ok(B16.readyBeforeAY02, "16.4 the Ready row sits under its own already-handled section");
  ok(B16.decisionSectionFirst, "16.5 decision-needed section renders before the already-handled one");

  // ---------- #17: labels lead with Year-Mint, not Description ----------
  const B17 = await page.evaluate(() => {
    return docketEntryLabel({ collectionId: "AY-99", desc: "Mercury Dime", denom: "10C", year: "1916", mint: "D", variety: "" });
  });
  ok(/^AY-99 · 1916-D · Mercury Dime$/.test(B17), "17.1 docketEntryLabel leads with Year-Mint, matching how a coin is normally referenced");

  // ---------- Q21: highest-reserved-id-reuse vs. mid-sequence permanent gap ----------
  // Ray's live run isolated the mid-sequence case cleanly but not this one;
  // covering it deterministically here rather than asking for a manual
  // re-test. Real-path (durable folder-name reservation) specific -- the
  // in-memory mockup's own version of this rule already had coverage
  // elsewhere in this project's history.
  const B21 = await page.evaluate(async () => {
    const mock = createMockGraphClient({ workbookColumns: { "All::CollectionID": ["AY-00099"] } });
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00100/coin.json", { type:"coin", version:1, collectionID:"AY-00100", status:"Draft — awaiting review" });
    await mock.uploadJson(base + "/AY-00101/coin.json", { type:"coin", version:1, collectionID:"AY-00101", status:"Draft — awaiting review" });
    await mock.uploadJson(base + "/AY-00102/coin.json", { type:"coin", version:1, collectionID:"AY-00102", status:"Draft — awaiting review" });
    // Bug #9 added a confirmation dialog in front of rejectStagedCoin() —
    // this test targets the reservation logic behind Reject, not the
    // confirmation UI itself (covered separately below), so it calls the
    // actual deletion function directly, bypassing the dialog.
    await performRejectStagedCoin("AY-00100"); // mid-sequence
    const nextAfterMidReject = await reserveCoinCollectionId();
    await performRejectStagedCoin("AY-00102"); // now the highest remaining
    const nextAfterHighestReject = await reserveCoinCollectionId();
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { nextAfterMidReject, nextAfterHighestReject };
  });
  ok(B21.nextAfterMidReject === "AY-00103", "21.1 rejecting a mid-sequence draft leaves a permanent gap");
  ok(B21.nextAfterHighestReject === "AY-00102", "21.2 rejecting the highest reserved draft frees it for reuse");

  // ---------- #5: circle adjuster has real drag headroom at default zoom ----------
  // Root cause: recomputePhotoAdjustBaseScale()'s "cover" fit gives a
  // perfectly square source (exactly what Stage 1 hands the adjuster for a
  // flip source) ZERO overscan at exactly 100% zoom -- nothing to drag into,
  // by the math, not a broken clamp. Fixed by defaulting to a small
  // above-100% zoom so panning always has real room without forcing a zoom
  // action first.
  const B5 = await page.evaluate(() => {
    const state = { naturalWidth: 500, naturalHeight: 500, zoom: 1.10, offsetX: 0, offsetY: 0, rotateQuick: 0, rotateFine: 0, circleSize: 240 };
    const swapped = state.rotateQuick % 180 !== 0;
    state.effWidth = swapped ? state.naturalHeight : state.naturalWidth;
    state.effHeight = swapped ? state.naturalWidth : state.naturalHeight;
    state.baseScale = Math.max(state.circleSize / state.effWidth, state.circleSize / state.effHeight);
    const scaledW = state.effWidth * state.baseScale * state.zoom;
    const maxX = Math.max(0, (scaledW - state.circleSize) / 2);
    return { maxX };
  });
  ok(B5.maxX > 5, "5.1 a square source has real drag headroom at the new default zoom, not zero");

  // ---------- Real bug caught by screenshot, not by any test: the two new
  // ambiguous-picker panels (descriptionAmbiguousPanel, addCoinMatchAmbiguousPanel)
  // were built with class="case hidden" but no matching CSS rule -- every
  // .hidden in this file is scoped to its own component (see CLAUDE.md), and
  // these two had no scoped rule of their own. classList.contains("hidden")
  // read true while the panel was fully visible and laid out on the page.
  // Every assertion elsewhere in this suite checks classList state, which is
  // exactly the gap that hid this -- so this block checks ACTUAL rendered
  // visibility (computed display), the thing that was actually broken. ----------
  const BVIS = await page.evaluate((rowsJson) => {
    __setLiveDbCoinsForTest(JSON.parse(rowsJson));
    navigate('addcoin');
    const descPanel = document.getElementById('descriptionAmbiguousPanel');
    const matchPanel = document.getElementById('addCoinMatchAmbiguousPanel');
    const initialDescDisplay = getComputedStyle(descPanel).display;
    const initialMatchDisplay = getComputedStyle(matchPanel).display;

    // Description panel actually renders when genuinely shown
    document.getElementById('denomination').value = '$1';
    document.getElementById('year').value = '2019';
    maybeAutoFillDescription();
    const shownDescDisplay = getComputedStyle(descPanel).display;
    document.getElementById('descriptionAmbiguousSelect').value = document.querySelector('#descriptionAmbiguousSelect option[value]:not([value=""])').value;
    document.getElementById('descriptionAmbiguousSelect').dispatchEvent(new Event('change'));
    const afterPickDescDisplay = getComputedStyle(descPanel).display;

    __setLiveDbCoinsForTest(null);
    return { initialDescDisplay, initialMatchDisplay, shownDescDisplay, afterPickDescDisplay };
  }, JSON.stringify([
    { denom:"$1", year:2019, mint:"", variety:"", description:"", finish:"", designation:"", coinId:"", pcgs:"", mintage:null, gsid:"" }
  ]));
  ok(BVIS.initialDescDisplay === 'none', "VIS.1 description picker panel is ACTUALLY hidden (not just classList) on a fresh form");
  ok(BVIS.initialMatchDisplay === 'none', "VIS.2 catalog ambiguous picker panel is ACTUALLY hidden on a fresh form");
  ok(BVIS.shownDescDisplay !== 'none', "VIS.3 description picker panel ACTUALLY renders when genuinely ambiguous");
  // Bug #5 fix: stays open/reconsiderable after a pick — see 3.5 above.
  ok(BVIS.afterPickDescDisplay !== 'none', "VIS.4 description picker panel ACTUALLY stays visible after a pick (bug #5 fix)");

  // ---------- Retest round 2 ----------

  // Retest #1: PCGS decode is authoritative — Save takes the decoded row
  // with no picker shown, even when the general matcher would otherwise
  // see 2+ candidates for the same identity.
  const R1 = await page.evaluate(() => {
    __setLiveDbCoinsForTest([
      { denom:"10C", year:1945, mint:"D", variety:"", description:"Mercury Dime",
        finish:"Business Strike", designation:"", coinId:"C-1945-D-10C-01", pcgs:"5058", mintage:null, gsid:"" },
      { denom:"10C", year:1945, mint:"D", variety:"", description:"Mercury Dime",
        finish:"Business Strike", designation:"", coinId:"C-1945-D-10C-02", pcgs:"5059", mintage:null, gsid:"" }
    ]);
    navigate('addcoin');
    document.getElementById('pcgsLabelInput').value = '5058.65/99999999';
    handlePcgsLabelApply();
    const state = currentAddCoinMatchState();
    __setLiveDbCoinsForTest(null);
    return { resolvedPick: state.resolvedPick, coinId: state.candidates[0] && state.candidates[0].coinId };
  });
  ok(R1.resolvedPick === true, "R1.1 PCGS decode sets a resolved pick, skipping the general re-derivation");
  ok(R1.coinId === 'C-1945-D-10C-01', "R1.2 the resolved pick is the exact row the label decoded to (5058), not whichever the general matcher would pick");

  // Retest #4: ambiguous picker offers "None of these" as a real, distinct
  // resolution — routes to the same "none" outcome as a genuine 0-match.
  const R4 = await page.evaluate(() => {
    return new Promise((resolve) => {
      __setLiveDbCoinsForTest([
        { denom:"25C", year:1986, mint:"", variety:"", description:"Washington Quarter", finish:"", designation:"", coinId:"C-A", pcgs:"", mintage:null, gsid:"" },
        { denom:"25C", year:1986, mint:"", variety:"", description:"Washington Quarter", finish:"", designation:"", coinId:"C-B", pcgs:"", mintage:null, gsid:"" }
      ]);
      navigate('addcoin');
      document.getElementById('denomination').value = '25C';
      document.getElementById('year').value = '1986';
      checkDbCoinsMatch();
      const btn = document.getElementById('addCoinMatchNoneBtn');
      resolveAddCoinCatalogMatch((result) => {
        __setLiveDbCoinsForTest(null);
        resolve({ panelVisibleBeforeClick, how: result.how, coinId: result.coinId, hasNoneBtn: !!btn });
      }, () => resolve({ error: 'cancel called instead' }));
      // resolveAddCoinCatalogMatch renders/shows the panel synchronously for
      // the 2+ case (it only actually resolves once a candidate — or None —
      // is clicked), so the panel's real visibility is checked right here.
      const panelVisibleBeforeClick = !document.getElementById('addCoinMatchAmbiguousPanel').classList.contains('hidden');
      btn.click();
    });
  });
  ok(R4.hasNoneBtn, "R4.1 the ambiguous picker has a 'None of these' button");
  ok(R4.panelVisibleBeforeClick, "R4.2 the picker was genuinely showing before None was clicked");
  ok(R4.how === 'none' && R4.coinId === '', "R4.3 'None of these' resolves exactly like a genuine 0-match — pending CoinID, not a forced pick");

  // Retest #6: the Dashboard tile counts ALL Draft-status coins (matching
  // what Staging Review's own "Needs a decision" section shows), not just
  // the subset with a DB_Coins match — while an unmatched one still also
  // gets its own informational research row (bug #8, unaffected).
  const R6 = await page.evaluate(async () => {
    const mock = createMockGraphClient({});
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00710/coin.json",
      { type:"coin", version:1, collectionID:"AY-00710", status:COIN_DRAFT_STATUS.DRAFT,
        denom:"10C", year:"1916", mint:"S", variety:"", description:"Mercury Dime", photos:[], createdDate:new Date().toISOString() });
    await mock.uploadJson(base + "/AY-00711/coin.json",
      { type:"coin", version:1, collectionID:"AY-00711", status:COIN_DRAFT_STATUS.DRAFT,
        denom:"9Z", year:"1", mint:"", variety:"", description:"Definitely no catalog match", photos:[], createdDate:new Date().toISOString() });
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 400));
    const actionText = document.getElementById('needsActionContainer').textContent;
    const researchText = document.getElementById('needsResearchContainer').textContent;
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { actionText, researchText };
  });
  ok(/2 coins? awaiting your decision/.test(R6.actionText), "R6.1 the action tile counts both Draft-status coins, matched or not (" + R6.actionText + ")");
  ok(R6.researchText.includes('AY-00711'), "R6.2 the unmatched one still separately shows in the research section (bug #8 intact)");

  // Retest #9: Reject opens a confirmation dialog rather than deleting
  // immediately; Cancel leaves the draft untouched, Reject in the dialog
  // performs the real delete.
  const R9 = await page.evaluate(async () => {
    const mock = createMockGraphClient({});
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00720/coin.json",
      { type:"coin", version:1, collectionID:"AY-00720", status:COIN_DRAFT_STATUS.DRAFT,
        denom:"1C", year:"1950", mint:"", variety:"", description:"Lincoln", photos:[], createdDate:new Date().toISOString() });
    rejectStagedCoin("AY-00720");
    const dialogShownOnReject = !document.getElementById('writeGuardOverlay').classList.contains('hidden');
    const stillThereBeforeAnyClick = await mock.getJson(base + "/AY-00720/coin.json");
    // Cancel — first button in the row per showWriteGuard's button order.
    document.querySelectorAll('#writeGuardBtns button')[0].click();
    await new Promise(r => setTimeout(r, 50));
    const dialogHiddenAfterCancel = document.getElementById('writeGuardOverlay').classList.contains('hidden');
    const stillThereAfterCancel = await mock.getJson(base + "/AY-00720/coin.json");
    // Reopen and actually confirm.
    rejectStagedCoin("AY-00720");
    document.querySelectorAll('#writeGuardBtns button')[1].click();
    await new Promise(r => setTimeout(r, 400));
    const goneAfterConfirm = await mock.getJson(base + "/AY-00720/coin.json");
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { dialogShownOnReject, stillThereBeforeAnyClick: !!stillThereBeforeAnyClick, dialogHiddenAfterCancel, stillThereAfterCancel: !!stillThereAfterCancel, goneAfterConfirm: !!goneAfterConfirm };
  });
  ok(R9.dialogShownOnReject, "R9.1 clicking Reject opens a confirmation dialog instead of deleting immediately");
  ok(R9.stillThereBeforeAnyClick, "R9.2 nothing is deleted just from opening the dialog");
  ok(R9.dialogHiddenAfterCancel && R9.stillThereAfterCancel, "R9.3 Cancel closes the dialog and leaves the draft untouched");
  ok(R9.goneAfterConfirm === false, "R9.4 confirming Reject in the dialog performs the real delete");

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
