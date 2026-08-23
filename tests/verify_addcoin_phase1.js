// Add Coin write layer — Phase 1 (ENABLE_ADDCOIN_WRITE).
//
// Covers: flag-off inertness, unified CollectionID reservation, coin.json
// draft round-trip, real photo upload under the reserved id, the ambiguous
// catalog picker (nothing written before a pick), Finish narrowing, Staging
// Review promote/reject, Docket integration, and picker legibility.
//
// Everything runs against the in-memory mock Graph client via
// __setGraphClientForTest, so no OneDrive session is involved and no real
// file is ever touched. Live verification is a separate, manual pass —
// docs/ADD_COIN_LIVE_RUN_CHECKLIST.md.

const { defineSuite } = require("./harness");

module.exports = defineSuite("addcoin-phase1", async ({ ok, openApp, PHONE, TABLET }) => {
  const page = await openApp(PHONE);
  const vpLabel = "412px";

  // ---------- A. Flag ships off / inert ----------
  const A = await page.evaluate(() => ({
    flag: ENABLE_ADDCOIN_WRITE,
    inWriteLayer: WRITE_LAYER_ENABLED,
    enabledFn: addCoinWriteEnabled(),
    target: WRITE_TARGET,
    hasStatus: typeof COIN_DRAFT_STATUS === 'object',
    finishExists: !!document.getElementById('finish'),
    pickerExists: !!document.getElementById('addCoinMatchAmbiguousPanel'),
    ambBanner: !!document.getElementById('dbAmbiguousBanner')
  }));
  ok(A.flag === false, "A1 ENABLE_ADDCOIN_WRITE ships false");
  ok(A.inWriteLayer === false, "A2 WRITE_LAYER_ENABLED still false with all flags off");
  ok(A.enabledFn === false, "A3 addCoinWriteEnabled() false by default");
  ok(A.target === 'copy', "A4 WRITE_TARGET is 'copy'");
  ok(A.hasStatus, "A5 COIN_DRAFT_STATUS defined");
  ok(A.finishExists, "A6 Finish input present on Add Coin");
  ok(A.pickerExists, "A7 save-time ambiguous picker panel present");
  ok(A.ambBanner, "A8 live ambiguous banner present");

  // flag OFF: a save must not touch Graph at all
  const AOff = await page.evaluate(async () => {
    const mock = createMockGraphClient({});
    let touched = false;
    const spy = new Proxy(mock, { get(t, k) {
      if (typeof t[k] === 'function' && k !== '_store' && k !== '_grids') {
        return (...a) => { touched = true; return t[k](...a); };
      }
      return t[k];
    }});
    __setGraphClientForTest(spy);
    document.getElementById('denomination').value = '10C';
    document.getElementById('year').value = '1916';
    document.getElementById('mintMark').value = 'D';
    checkDbCoinsMatch();
    const before = FAKE_STAGING.length;
    await new Promise(r => { saveAddCoinForm('staging'); setTimeout(r, 300); });
    const res = { touched, added: FAKE_STAGING.length - before, storeSize: mock._store.size };
    __setGraphClientForTest(null);
    return res;
  });
  ok(AOff.touched === false, "A9 flag off: save makes no Graph call");
  ok(AOff.added === 1, "A10 flag off: in-memory Staging path still works");
  ok(AOff.storeSize === 0, "A11 flag off: nothing written to the store");

  // ---------- B. Reservation unification ----------
  const B = await page.evaluate(async () => {
    const mock = createMockGraphClient({
      workbookColumns: { "All::CollectionID": ["AY-00100", "AY-00042"] }
    });
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    const base = writePaths().stagingBase;
    // a SET draft, a COIN draft, and a non-draft folder
    await mock.uploadJson(base + "/AY-00200/set.json", { type: "set", collectionID: "AY-00200" });
    await mock.uploadJson(base + "/AY-00305/coin.json", { type: "coin", collectionID: "AY-00305" });
    await mock.uploadJson(base + "/_Docket/docket.json", { type: "docket-queue", entries: [] });
    const maxStaging = await readMaxReservedIdFromStaging();
    const next = await reserveCoinCollectionId();
    // set-draft listing must not see the coin draft, and vice versa
    const sets = await listSetDrafts();
    const coins = await listCoinDrafts();
    __setAddCoinWriteEnabledForTest(null);
    __setGraphClientForTest(null);
    return { maxStaging, next, setIds: sets.map(d => d.collectionID), coinIds: coins.map(d => d.collectionID) };
  });
  ok(B.maxStaging === 305, "B1 Staging scan sees the COIN draft (was invisible via listSetDrafts)");
  ok(B.next === "AY-00306", "B2 reservation = max(All, all Staging folders) + 1");
  ok(B.setIds.length === 1 && B.setIds[0] === "AY-00200", "B3 listSetDrafts ignores coin drafts");
  ok(B.coinIds.length === 1 && B.coinIds[0] === "AY-00305", "B4 listCoinDrafts ignores set drafts");

  const B5 = await page.evaluate(async () => {
    const mock = createMockGraphClient({ workbookColumns: { "All::CollectionID": ["AY-00007"] } });
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    await mock.uploadJson(writePaths().stagingBase + "/_Docket/docket.json", { type: "docket-queue" });
    const n = await reserveCoinCollectionId();
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return n;
  });
  ok(B5 === "AY-00008", "B5 non-draft folders (_Docket) never count as a reservation");

  // ---------- C. Draft round-trip + real save + photos ----------
  const C = await page.evaluate(async () => {
    const mock = createMockGraphClient({ workbookColumns: { "All::CollectionID": ["AY-00500"] } });
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([
      { denom: "10C", year: 1916, mint: "D", variety: "", description: "Mercury Dime",
        finish: "Business Strike", designation: "", coinId: "C-1916-M-10C-01", pcgs: "4682", mintage: 264000, gsid: "" }
    ]);
    // fill the form
    document.getElementById('denomination').value = '10C';
    document.getElementById('year').value = '1916';
    document.getElementById('mintMark').value = 'D';
    document.getElementById('variety').value = '';
    document.getElementById('description').value = 'Mercury Dime';
    document.getElementById('finish').value = 'Business Strike';
    document.getElementById('purchasePrice').value = '45.00';
    document.getElementById('vendor').value = 'Test Seller';
    document.getElementById('notesField').value = 'a note';
    checkDbCoinsMatch();
    // a captured photo, exactly as the crop pipeline would leave it
    const blob = new Blob([new Uint8Array([1,2,3,4])], { type: 'image/png' });
    galleryStore[ADDCOIN_GALLERY_ID] = [{
      type: 'obverse', url: 'blob:x', rawUrl: URL.createObjectURL(blob), circleUrl: null,
      blob, caption: '', filename: '__addcoin_draft___obverse_cropped.png',
      rawFilename: '__addcoin_draft___obverse_original.png'
    }];
    await new Promise(r => { saveAddCoinForm('staging'); setTimeout(r, 900); });
    const paths = [...mock._store.keys()];
    const draft = await mock.getJson(writePaths().stagingBase + "/AY-00501/coin.json");
    const res = {
      paths,
      draft,
      // A full reset (added alongside the #1 stale-form fix) re-renders the
      // gallery widget after clearing it, and that render calls galleryFor()
      // -- which lazily re-creates an EMPTY array for the id it's given
      // (see galleryFor()'s own code). So the key is no longer simply
      // absent; the real invariant is "holds nothing," not "the key is
      // gone" -- check length, not truthiness.
      galleryCleared: !galleryStore[ADDCOIN_GALLERY_ID] || galleryStore[ADDCOIN_GALLERY_ID].length === 0,
      badge: document.getElementById('stagingBadge') ? document.getElementById('stagingBadge').textContent : null
    };
    __setLiveDbCoinsForTest(null);
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return res;
  });
  const base = "CoinCollection/_Testing/Staging/AY-00501";
  ok(!!C.draft, "C1 coin.json draft written at the reserved id");
  ok(C.draft && C.draft.type === 'coin' && C.draft.version === 1, "C2 draft carries its type + version marker");
  ok(C.draft && C.draft.collectionID === 'AY-00501', "C3 draft id = reserved id (max All + 1)");
  ok(C.draft && C.draft.coinId === 'C-1916-M-10C-01', "C4 single unambiguous match recorded on the draft");
  ok(C.draft && C.draft.matchedHow === 'single', "C5 match provenance recorded as 'single'");
  ok(C.draft && C.draft.finish === 'Business Strike', "C6 Finish captured onto the draft");
  ok(C.draft && C.draft.cost === 45 && C.draft.vendor === 'Test Seller', "C7 purchase fields captured");
  ok(C.draft && C.draft.remarks === 'a note', "C8 notes captured as remarks");
  ok(C.draft && C.draft.status === 'Draft — awaiting review', "C9 draft starts in the Draft status");
  ok(C.paths.includes(base + "/AY-00501_obverse_cropped.png"), "C10 cropped photo uploaded under the REAL CollectionID");
  ok(C.paths.includes(base + "/AY-00501_obverse_original.png"), "C11 raw original preserved alongside it");
  ok(!C.paths.some(p => p.includes('__addcoin_draft__')), "C12 no temp-draft filename leaked into OneDrive");
  ok(C.draft && C.draft.photos.length === 2, "C13 draft records both photo filenames");
  ok(C.galleryCleared, "C14 in-progress gallery cleared so the next coin can't reuse these photos");
  // (the old #stagingBadge element was retired when the Needs Attention hub
  //  absorbed Staging Review's dashboard tile — nothing to assert there.)

  // ---------- D. Ambiguity: 2+ candidates must reach a human ----------
  const AMBIG = "[{\"denom\": \"50C\", \"year\": 1986, \"mint\": \"\", \"variety\": \"\", \"description\": \"Statue of Liberty Half Dollar\", \"finish\": \"Business Strike\", \"designation\": \"\", \"coinId\": \"C-1986-M-50C-01\", \"pcgs\": \"9500\", \"mintage\": 1000, \"gsid\": \"\"}, {\"denom\": \"50C\", \"year\": 1986, \"mint\": \"\", \"variety\": \"\", \"description\": \"Statue of Liberty Commemorative\", \"finish\": \"Business Strike\", \"designation\": \"\", \"coinId\": \"C-1986-M-50C-02\", \"pcgs\": \"9501\", \"mintage\": 2000, \"gsid\": \"\"}]";
  const D = await page.evaluate(async (rowsJson) => {
    navigate('addcoin'); // fresh form -- clears any addCoinResolvedPick left by an earlier test on this same page
    const mock = createMockGraphClient({ workbookColumns: { "All::CollectionID": ["AY-00600"] } });
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest(JSON.parse(rowsJson));
    document.getElementById('denomination').value = '50C';
    document.getElementById('year').value = '1986';
    document.getElementById('mintMark').value = '';
    document.getElementById('variety').value = '';
    document.getElementById('description').value = 'Statue of Liberty';
    document.getElementById('finish').value = '';
    document.getElementById('designation').value = '';
    document.getElementById('gradeSource').value = '';
    delete galleryStore[ADDCOIN_GALLERY_ID];
    checkDbCoinsMatch();
    const bannerShown = !document.getElementById('dbAmbiguousBanner').classList.contains('hidden');
    const bannerText = document.getElementById('dbAmbiguousMsg').textContent;
    const claimsSingle = !document.getElementById('dbMatchBanner').classList.contains('hidden');

    await new Promise(r => { saveAddCoinForm('staging'); setTimeout(r, 400); });
    const pickerOpen = !document.getElementById('addCoinMatchAmbiguousPanel').classList.contains('hidden');
    const wroteBeforePick = mock._store.size;
    const optionCards = document.querySelectorAll('#addCoinMatchAmbiguousList .form-row').length;
    const optionTexts = [...document.querySelectorAll('#addCoinMatchAmbiguousList .fr-summary')].map(e => e.textContent);

    // pick the SECOND candidate — not the first — so "took candidates[0]"
    // could not pass this by accident
    const cards = document.querySelectorAll('#addCoinMatchAmbiguousList .form-row');
    cards[1].click();
    await new Promise(r => setTimeout(r, 200));
    // Q4 (Ray's explicit call): picking resolves the match but does NOT
    // save -- the picker closes, the banner updates, and nothing is written
    // until Save is pressed again. Both states are asserted before AND
    // after that second click, so a regression back to "pick auto-saves"
    // would be caught either way.
    const pickerHiddenAfterPick = document.getElementById('addCoinMatchAmbiguousPanel').classList.contains('hidden');
    const wroteAfterPickBeforeSecondSave = mock._store.size;
    const bannerAfterPick = document.getElementById('dbMatchMsg').textContent;
    await new Promise(r => { saveAddCoinForm('staging'); setTimeout(r, 700); });
    const pickerReopenedOnSecondSave = !document.getElementById('addCoinMatchAmbiguousPanel').classList.contains('hidden');
    const draft = await mock.getJson(writePaths().stagingBase + "/AY-00601/coin.json");
    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { bannerShown, bannerText, claimsSingle, pickerOpen, wroteBeforePick, optionCards, optionTexts,
      pickerHiddenAfterPick, wroteAfterPickBeforeSecondSave, bannerAfterPick, pickerReopenedOnSecondSave, draft };
  }, AMBIG);
  ok(D.bannerShown, "D1 live banner warns when several catalog rows match");
  ok(/2 catalog entries match/.test(D.bannerText), "D2 banner states the real candidate count");
  ok(D.claimsSingle === false, "D3 no 'Matched DB_Coins' claim while ambiguous");
  ok(D.pickerOpen, "D4 save opens the ambiguous picker instead of guessing");
  ok(D.wroteBeforePick === 0, "D5 NOTHING written to OneDrive before the user picks");
  ok(D.optionCards === 2, "D6 both candidates offered");
  ok(D.optionTexts.some(t => /Statue of Liberty Half Dollar/.test(t)) &&
     D.optionTexts.some(t => /Statue of Liberty Commemorative/.test(t)),
     "D7 picker distinguishes the rows by Description (the commemorative case)");
  ok(D.pickerHiddenAfterPick, "D8 picker closes immediately on a pick");
  ok(D.wroteAfterPickBeforeSecondSave === 0, "D9 Q4: picking a candidate does NOT save by itself");
  ok(D.bannerAfterPick.includes('C-1986-M-50C-02'), "D10 live banner updates to the CHOSEN candidate right after the pick (fixes the #14 desync)");
  ok(D.pickerReopenedOnSecondSave === false, "D11 the second Save click does not re-show the picker for the same identity");
  ok(D.draft && D.draft.coinId === 'C-1986-M-50C-02', "D12 the CHOSEN candidate is what actually gets saved, not the first");
  ok(D.draft && D.draft.matchedHow === 'picked', "D13 provenance recorded as a human pick");
  ok(D.draft && /ambiguous DB_Coins candidates/.test(D.draft.researchNote || ''),
     "D14 research note flags the ambiguity for reconciliation");

  // cancel writes nothing
  const DC = await page.evaluate(async (rowsJson) => {
    navigate('addcoin'); // fresh form -- same isolation reason as the D block above
    const mock = createMockGraphClient({ workbookColumns: { "All::CollectionID": ["AY-00700"] } });
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest(JSON.parse(rowsJson));
    document.getElementById('denomination').value = '50C';
    document.getElementById('year').value = '1986';
    document.getElementById('mintMark').value = '';
    document.getElementById('variety').value = '';
    checkDbCoinsMatch();
    await new Promise(r => { saveAddCoinForm('staging'); setTimeout(r, 400); });
    document.getElementById('addCoinMatchCancelBtn').click();
    await new Promise(r => setTimeout(r, 300));
    const res = {
      wrote: mock._store.size,
      hidden: document.getElementById('addCoinMatchAmbiguousPanel').classList.contains('hidden'),
      yearKept: document.getElementById('year').value
    };
    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return res;
  }, AMBIG);
  ok(DC.wrote === 0, "D15 cancelling the picker writes nothing and reserves nothing");
  ok(DC.hidden, "D16 picker closes on cancel");
  ok(DC.yearKept === '1986', "D17 the typed entry survives a cancelled save");

  // ---------- E. Finish narrows an otherwise-ambiguous pair ----------
  const E = await page.evaluate(() => {
    __setLiveDbCoinsForTest([
      { denom:"1C", year:1950, mint:"", variety:"", description:"Lincoln Wheat Cent",
        finish:"Business Strike", designation:"", coinId:"C-1950-M-1C-01", pcgs:"", mintage:null, gsid:"" },
      { denom:"1C", year:1950, mint:"", variety:"", description:"Lincoln Wheat Cent",
        finish:"Proof", designation:"", coinId:"C-1950-M-1C-03", pcgs:"", mintage:null, gsid:"" }
    ]);
    document.getElementById('denomination').value = '1C';
    document.getElementById('year').value = '1950';
    document.getElementById('mintMark').value = '';
    document.getElementById('variety').value = '';
    document.getElementById('designation').value = '';
    document.getElementById('gradeSource').value = '';
    document.getElementById('finish').value = '';
    const blank = dbCoinsCandidatesFor(addCoinIdentityShape()).length;
    document.getElementById('finish').value = 'Proof';
    const withFinish = dbCoinsCandidatesFor(addCoinIdentityShape());
    document.getElementById('finish').value = 'Circulated'; // All-only value, absent from DB_Coins
    const allOnly = dbCoinsCandidatesFor(addCoinIdentityShape()).length;
    __setLiveDbCoinsForTest(null);
    return { blank, withFinishLen: withFinish.length, picked: withFinish[0] && withFinish[0].coinId, allOnly };
  });
  ok(E.blank === 2, "E1 without Finish the pair stays ambiguous (the pre-existing Add Coin weakness)");
  ok(E.withFinishLen === 1 && E.picked === 'C-1950-M-1C-03', "E2 Finish narrows to the right catalog row");
  ok(E.allOnly === 2, "E3 an All-only Finish value falls back softly, never to zero");

  // ---------- F. Promote (interim) / reject ----------
  const F = await page.evaluate(async () => {
    const mock = createMockGraphClient({ workbookColumns: { "All::CollectionID": ["AY-00800"] } });
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00801/coin.json",
      { type:"coin", version:1, collectionID:"AY-00801", status:COIN_DRAFT_STATUS.DRAFT,
        denom:"1C", year:"1909", mint:"S", variety:"", description:"Lincoln", photos:[], createdDate:new Date().toISOString() });
    await mock.uploadBytes(base + "/AY-00801/AY-00801_obverse_cropped.png", new Uint8Array([1]));

    await renderStagingList();
    const interimShown = !document.getElementById('stagingInterimBanner').classList.contains('hidden');
    const mockNoteHidden = document.getElementById('stagingMockNote').style.display === 'none';
    const promoteLabel = document.querySelector('#stagingContainer .promote').textContent;

    await promoteStagedCoin("AY-00801");
    const afterPromote = await mock.getJson(base + "/AY-00801/coin.json");
    const rowStillOnSheet = !!mock._grids["All"];

    // Bug #9 (live-run) put a confirmation dialog in front of
    // rejectStagedCoin() — this test targets the actual deletion behavior,
    // covered separately by its own test, so it calls the underlying
    // function directly rather than clicking through the dialog.
    await performRejectStagedCoin("AY-00801");
    const leftover = [...mock._store.keys()].filter(k => k.includes("AY-00801"));
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { interimShown, mockNoteHidden, promoteLabel, status: afterPromote && afterPromote.status, rowStillOnSheet, leftover };
  });
  ok(F.interimShown, "F1 interim Phase-1 banner shown when the real path is active");
  ok(F.mockNoteHidden, "F2 the mockup 'nothing is written' note is hidden when writes are real");
  ok(F.promoteLabel === 'Mark ready', "F3 action is labelled 'Mark ready', not 'Promote'");
  ok(F.status === 'Ready for reconciliation', "F4 promote marks the draft ready for reconciliation");
  ok(F.rowStillOnSheet === false, "F5 promote does NOT create an All-sheet row in Phase 1");
  ok(F.leftover.length === 0, "F6 reject deletes the draft AND its photo files");

  // ---------- G. Docket sees real drafts ----------
  const G = await page.evaluate(async () => {
    const mock = createMockGraphClient({});
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([]); // nothing matches -> research row
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00901/coin.json",
      { type:"coin", version:1, collectionID:"AY-00901", status:COIN_DRAFT_STATUS.DRAFT,
        denom:"1C", year:"1909", mint:"S", variety:"", description:"Unmatched Cent", photos:[], createdDate:new Date().toISOString() });
    await mock.uploadJson(base + "/AY-00902/coin.json",
      { type:"coin", version:1, collectionID:"AY-00902", status:COIN_DRAFT_STATUS.READY,
        denom:"5C", year:"1937", mint:"D", variety:"", description:"Handed Off Nickel", photos:[], createdDate:new Date().toISOString() });
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 250));
    const text = document.getElementById('needsResearchContainer').textContent;
    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { text };
  });
  ok(/Unmatched Cent/.test(G.text), "G1 a real staged draft with no catalog match reaches the Docket");
  // Label ordering fix (#17, real live-run finding): Year-Mint now leads
  // ("1937-D · Buffalo Nickel"), and the CollectionID sits at the front of
  // the label line rather than glued onto "ready for reconciliation" in the
  // notes line -- both moved, so check for the id and the status text
  // separately rather than as one contiguous phrase.
  ok(G.text.includes("AY-00902") && /Ready for reconciliation/.test(G.text), "G2 a handed-off draft shows as waiting on reconciliation");

  // ---------- J. Picker must not truncate away the differentiator ----------
  // The whole reason a Description tier was NOT added to the matcher is that
  // the picker shows Description so a human can decide. That only holds if
  // the line is actually readable — a one-line ellipsis would hide a
  // differentiator that sits late in the string, which is exactly the case
  // for the commemorative pairs.
  const J = await page.evaluate(async () => {
    navigate('addcoin'); // fresh form -- same isolation reason as the D block above
    __setGraphClientForTest(createMockGraphClient({ workbookColumns: { "All::CollectionID": ["AY-01100"] } }));
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([
      { denom:"$1", year:1986, mint:"S", variety:"", description:"Statue of Liberty Silver Dollar Uncirculated",
        finish:"Business Strike", designation:"", coinId:"C-A", pcgs:"", mintage:null, gsid:"" },
      { denom:"$1", year:1986, mint:"S", variety:"", description:"Statue of Liberty Silver Dollar Proof Issue",
        finish:"Business Strike", designation:"", coinId:"C-B", pcgs:"", mintage:null, gsid:"" }
    ]);
    document.getElementById('denomination').value = '$1';
    document.getElementById('year').value = '1986';
    document.getElementById('mintMark').value = 'S';
    document.getElementById('variety').value = '';
    document.getElementById('finish').value = '';
    checkDbCoinsMatch();
    await new Promise(r => { saveAddCoinForm('staging'); setTimeout(r, 400); });
    const sums = [...document.querySelectorAll('#addCoinMatchAmbiguousList .fr-summary')];
    const truncated = sums.filter(e => e.scrollWidth > e.clientWidth + 1).length;
    const texts = sums.map(e => e.textContent);
    const hasClass = !!document.querySelector('#addCoinMatchAmbiguousList .form-row.ambiguous-match');
    document.getElementById('addCoinMatchCancelBtn').click();
    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { truncated, texts, hasClass };
  });
  ok(J.hasClass, "J1 candidate rows carry the no-truncate class");
  ok(J.truncated === 0, "J2 no candidate summary is visually truncated");
  ok(J.texts.some(t => /Uncirculated/.test(t)) && J.texts.some(t => /Proof Issue/.test(t)),
     "J3 the late-in-string differentiator is fully readable in both rows");

  // ---------- I. Phase-1 honesty: "Save to Database" writes a draft ----------
  const I = await page.evaluate(async () => {
    const mock = createMockGraphClient({ workbookColumns: { "All::CollectionID": ["AY-01000"] } });
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([]);
    document.getElementById('denomination').value = '1C';
    document.getElementById('year').value = '1909';
    document.getElementById('mintMark').value = 'S';
    document.getElementById('variety').value = '';
    document.getElementById('description').value = 'Lincoln Wheat Cent';
    document.getElementById('finish').value = '';
    delete galleryStore[ADDCOIN_GALLERY_ID];
    checkDbCoinsMatch();
    const interimShown = !document.getElementById('addCoinInterimBanner').classList.contains('hidden');
    await new Promise(r => { saveAddCoinForm('database'); setTimeout(r, 800); });
    const draft = await mock.getJson(writePaths().stagingBase + "/AY-01001/coin.json");
    const madeSheetRow = !!mock._grids["All"];
    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    updateSaveConfidenceUI();
    const interimHiddenWhenOff = document.getElementById('addCoinInterimBanner').classList.contains('hidden');
    return { interimShown, draft, madeSheetRow, interimHiddenWhenOff };
  });
  ok(I.interimShown, "I1 interim Phase-1 notice shown on Add Coin when the real path is active");
  ok(!!I.draft, "I2 'Save to Database' writes a real Staging draft in Phase 1");
  ok(I.draft && I.draft.savedVia === 'direct', "I3 the direct-save intent is recorded on the draft");
  ok(I.madeSheetRow === false, "I4 Phase 1 creates NO All-sheet row, as designed");
  ok(I.draft && I.draft.coinId === '' && I.draft.matchedHow === 'none', "I5 a genuine catalog miss leaves CoinID pending");
  ok(I.draft && /No DB_Coins match at capture/.test(I.draft.researchNote || ''), "I6 the miss is spelled out in the research note");
  ok(I.interimHiddenWhenOff, "I7 interim notice hidden again in the flag-off mockup build");

  // ---------- H. Nav smoke ----------
  const H = await page.evaluate(async () => {
    const routes = ["dashboard","browse","albums","sets","wishlist","stats","acquisitions","needsdbcoins","staging","addcoin","addset","inprogresssets"];
    const bad = [];
    for (const r of routes) {
      try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); }
    }
    navigate("dashboard");
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(H.bad.length === 0, "H1 every route still navigates cleanly: " + H.bad.join("; "));
  ok(H.overflow === false, "H2 no horizontal page overflow at " + vpLabel);


  // ---------- Layout-sensitive subset, re-run at tablet width ----------
  // The rest of this suite is logic (Graph writes, draft shape, matcher
  // resolution) and is viewport-independent, so running all of it twice
  // would only cost time. These two genuinely depend on layout: the picker
  // must stay legible, and the page must not overflow horizontally.
  {
    const tpage = await openApp(TABLET);
    const T = await tpage.evaluate(async () => {
      __setGraphClientForTest(createMockGraphClient({ workbookColumns: { "All::CollectionID": ["AY-01200"] } }));
      __setAddCoinWriteEnabledForTest(true);
      __setLiveDbCoinsForTest([
        { denom:"$1", year:1986, mint:"S", variety:"", description:"Statue of Liberty Silver Dollar Uncirculated",
          finish:"Business Strike", designation:"", coinId:"C-A", pcgs:"", mintage:null, gsid:"" },
        { denom:"$1", year:1986, mint:"S", variety:"", description:"Statue of Liberty Silver Dollar Proof Issue",
          finish:"Business Strike", designation:"", coinId:"C-B", pcgs:"", mintage:null, gsid:"" }
      ]);
      navigate('addcoin');
      document.getElementById('denomination').value = '$1';
      document.getElementById('year').value = '1986';
      document.getElementById('mintMark').value = 'S';
      document.getElementById('variety').value = '';
      document.getElementById('finish').value = '';
      checkDbCoinsMatch();
      await new Promise(r => { saveAddCoinForm('staging'); setTimeout(r, 400); });
      const sums = [...document.querySelectorAll('#addCoinMatchAmbiguousList .fr-summary')];
      const res = {
        truncated: sums.filter(e => e.scrollWidth > e.clientWidth + 1).length,
        cards: document.querySelectorAll('#addCoinMatchAmbiguousList .form-row').length,
        overflow: document.body.scrollWidth > window.innerWidth
      };
      document.getElementById('addCoinMatchCancelBtn').click();
      __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
      return res;
    });
    ok(T.cards === 2, "T1 picker offers both candidates at tablet width");
    ok(T.truncated === 0, "T2 no candidate summary truncated at tablet width");
    ok(T.overflow === false, "T3 no horizontal page overflow at 1024px");
    await tpage.close();
  }
}, module);
