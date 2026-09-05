// Add Coin: "Identification" section (renamed from "Grading & Certification")
// gains two more single-field ID lookups alongside PCGS decode — U.S. Mint
// Item Number and GSID — plus a Docket/Staging-Review research note that
// lists every captured-but-unresolved ID. See CLAUDE.md "Add Coin:
// Identification section — Mint Item Number + GSID matching".

const { defineSuite } = require("./harness");

module.exports = defineSuite("addcoin-identification", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ---------- A. Section rename + field order ----------
  const A = await page.evaluate(() => {
    navigate('addcoin');
    const header = document.querySelector('#addCoinGradingHeader span').textContent.trim();
    document.getElementById('addCoinGradingHeader').click();
    const labels = [...document.querySelectorAll('#addCoinGradingBody label')].map(l => l.textContent.trim());
    return { header, labels };
  });
  ok(A.header === "Identification", "A1 section renamed from \"Grading & Certification\" to \"Identification\"");
  // "Green"/"Gold" are the CAC Bean checkboxes' own <label> wrappers,
  // positioned to the right of Cert/Type Number (see CLAUDE.md "CACBean UI
  // in Add Coin and Edit Coin") — real, expected additions to this list,
  // not a regression.
  ok(JSON.stringify(A.labels) === JSON.stringify(
      ["U.S. Mint Item Number", "Grading Service", "PCGS Label #", "Cert / Type Number", "Green", "Gold", "GSID"]),
    "A2 field order: Mint Item Number first, Grader/PCGS block unchanged, CAC Bean checkboxes beside Cert/Type Number, GSID last: " + A.labels.join(" | "));

  // Real bug caught by screenshot before shipping, same recurring trap this
  // file has hit before (no generic .hidden rule -- every .hidden is scoped
  // to its own component): the two new ambiguous panels were built with
  // class="case hidden" copying the PCGS/Description panels' look, but
  // needed their OWN #id.hidden rule. classList alone can't catch this --
  // it correctly reports "hidden" even when nothing actually hides the
  // element -- so this checks the real computed style, not just the class.
  const A3 = await page.evaluate(() => {
    navigate('addcoin');
    document.getElementById('addCoinGradingHeader').click();
    const mi = document.getElementById('mintItemAmbiguousPanel');
    const gs = document.getElementById('gsidAmbiguousPanel');
    return {
      miHiddenClass: mi.classList.contains('hidden'), miDisplay: getComputedStyle(mi).display,
      gsHiddenClass: gs.classList.contains('hidden'), gsDisplay: getComputedStyle(gs).display
    };
  });
  ok(A3.miHiddenClass && A3.miDisplay === 'none',
    "A3 mintItemAmbiguousPanel is GENUINELY hidden (computed display:none), not just classList-hidden");
  ok(A3.gsHiddenClass && A3.gsDisplay === 'none',
    "A4 gsidAmbiguousPanel is GENUINELY hidden (computed display:none), not just classList-hidden");

  // ---------- B. Mint Item Number: match / no-match / clean reset ----------
  const B = await page.evaluate(() => {
    navigate('addcoin');
    document.getElementById('mintItemNumber').value = '21RJ'; // real seeded FAKE_DB_COINS value
    handleMintItemNumberApply();
    const matched = {
      denom: document.getElementById('denomination').value,
      year: document.getElementById('year').value,
      mint: document.getElementById('mintMark').value,
      appliedShown: !document.getElementById('mintItemAppliedBanner').classList.contains('hidden'),
      appliedMsg: document.getElementById('mintItemAppliedMsg').textContent,
      // No PCGS-specific side effects (Ray's explicit call, item 3).
      grader: document.getElementById('addCoinGrader').value,
      gradeSource: document.getElementById('gradeSource').value
    };

    navigate('addcoin'); // resets the form
    document.getElementById('mintItemNumber').value = 'NOPE-NOT-REAL';
    handleMintItemNumberApply();
    const noMatch = {
      notFoundShown: !document.getElementById('mintItemNotFoundBanner').classList.contains('hidden'),
      appliedHidden: document.getElementById('mintItemAppliedBanner').classList.contains('hidden'),
      denomStillBlank: document.getElementById('denomination').value === ''
    };
    return { matched, noMatch };
  });
  ok(B.matched.denom === '10C' && B.matched.year === '1916' && B.matched.mint === 'D',
    "B1 a Mint Item Number match autofills identity fields, same as a PCGS decode");
  ok(B.matched.appliedShown && /21RJ|C-1916-M-10C-01/.test(B.matched.appliedMsg + JSON.stringify(B.matched)),
    "B2 applied banner shown after a match");
  ok(B.matched.grader === '' && B.matched.gradeSource === '',
    "B3 no PCGS-specific side effects — Grader/GradeSource untouched by a Mint Item Number match");
  ok(B.noMatch.notFoundShown && B.noMatch.appliedHidden && B.noMatch.denomStillBlank,
    "B4 a genuine miss shows the not-found banner and touches no identity field");

  // ---------- C. GSID: match / no-match ----------
  const C = await page.evaluate(() => {
    navigate('addcoin');
    document.getElementById('gsidInput').value = 'gs-1044'; // case-insensitive, real seeded value
    handleGsidApply();
    const matched = {
      denom: document.getElementById('denomination').value,
      variety: document.getElementById('variety').value,
      appliedShown: !document.getElementById('gsidAppliedBanner').classList.contains('hidden'),
      grader: document.getElementById('addCoinGrader').value
    };
    navigate('addcoin');
    document.getElementById('gsidInput').value = 'GS-9999';
    handleGsidApply();
    const noMatch = { notFoundShown: !document.getElementById('gsidNotFoundBanner').classList.contains('hidden') };
    return { matched, noMatch };
  });
  ok(C.matched.denom === '1C' && C.matched.variety === 'VDB',
    "C1 a GSID match (case-insensitive) autofills identity fields");
  ok(C.matched.appliedShown && C.matched.grader === '', "C2 applied, and again no Grader side effect");
  ok(C.noMatch.notFoundShown, "C3 a genuine GSID miss shows the not-found banner");

  // ---------- D. The resolved pick actually sticks through Save ----------
  // Forces the flag off via the test seam so this exercises the session-
  // only mockup save path (a direct FAKE_STAGING push) it was written
  // against — ENABLE_ADDCOIN_WRITE now ships on by default (see CLAUDE.md
  // "Real-Graph flags always on..."), and without this the real write path
  // would try a Graph call with no mock client configured and throw.
  const D = await page.evaluate(async () => {
    __setAddCoinWriteEnabledForTest(false);
    navigate('addcoin');
    document.getElementById('mintItemNumber').value = '21RJ';
    handleMintItemNumberApply();
    const before = FAKE_STAGING.length;
    await new Promise(r => { saveAddCoinForm('staging'); setTimeout(r, 400); });
    const row = FAKE_STAGING[FAKE_STAGING.length - 1];
    const res = { added: FAKE_STAGING.length - before, coinId: row && row.coinId };
    __setAddCoinWriteEnabledForTest(null);
    return res;
  });
  ok(D.added === 1 && D.coinId === 'C-1916-M-10C-01',
    "D1 the Mint-Item-Number-resolved pick is what Save actually commits");

  // ---------- E. Draft persists raw captures + extends the research note ----------
  const E = await page.evaluate(async () => {
    __setLiveDbCoinsForTest([]); // force a genuine catalog miss
    navigate('addcoin');
    document.getElementById('denomination').value = '25C';
    document.getElementById('denomination').dispatchEvent(new Event('change'));
    document.getElementById('year').value = '2024';
    document.getElementById('mintItemNumber').value = '24XY';
    handleMintItemNumberApply(); // no match (empty catalog) -- captured anyway
    document.getElementById('gsidInput').value = 'GS-7777';
    handleGsidApply();
    document.getElementById('pcgsLabelInput').value = '9999.65/12345';
    checkDbCoinsMatch();
    const draftShape = readAddCoinFormForDraft();
    const draft = buildCoinDraft('AY-TEST-01', draftShape, { coinId: '', how: 'none' });
    __setLiveDbCoinsForTest(null);
    return { draftShape, draft };
  });
  ok(E.draftShape.itemNumber === '24XY' && E.draftShape.gsid === 'GS-7777' && E.draftShape.pcgsLabelRaw === '9999.65/12345',
    "E1 raw captured values are read off the form regardless of match outcome");
  ok(E.draft.itemNumber === '24XY' && E.draft.gsid === 'GS-7777',
    "E2 the persisted draft carries both new fields");
  ok(/Captured but unresolved/.test(E.draft.researchNote) &&
     /24XY/.test(E.draft.researchNote) && /GS-7777/.test(E.draft.researchNote) && /9999\.65\/12345/.test(E.draft.researchNote),
    "E3 the research note lists every captured-but-unresolved ID: Mint Item Number, GSID, AND the raw PCGS label — " + E.draft.researchNote);

  // A resolved coin must NOT get the "captured but unresolved" line, even if
  // it happens to also carry a value in one of these fields.
  const F = await page.evaluate(() => {
    const draft = buildCoinDraft('AY-TEST-02', { itemNumber: '21RJ', gsid: '', pcgsLabelRaw: '', finish: 'Business Strike' },
      { coinId: 'C-1916-M-10C-01', how: 'single' });
    return { researchNote: draft.researchNote };
  });
  ok(!/Captured but unresolved/.test(F.researchNote), "F1 a resolved coin's note has no \"captured but unresolved\" line");

  // ---------- G. researchNote surfaces in BOTH the Docket and Staging Review ----------
  const G = await page.evaluate(async () => {
    const mock = createMockGraphClient({});
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([]); // nothing matches
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-02001/coin.json", {
      type: "coin", version: 1, collectionID: "AY-02001", status: "Draft — awaiting review",
      denom: "25C", year: "2024", mint: "", variety: "", description: "New Release Quarter",
      itemNumber: "24XY", gsid: "", researchNote: "No DB_Coins match at capture — CoinID pending, needs a catalog entry.\nCaptured but unresolved: U.S. Mint Item Number 24XY.",
      photos: [], createdDate: new Date().toISOString()
    });
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 250));
    const docketText = document.getElementById('docketStagingContainer').textContent;

    await renderStagingList();
    await new Promise(r => setTimeout(r, 250));
    const stagingReviewText = document.getElementById('stagingContainer').textContent;

    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { docketText, stagingReviewText };
  });
  ok(/24XY/.test(G.docketText), "G1 the researchNote's captured ID shows on the Docket's Staging row");
  ok(/24XY/.test(G.stagingReviewText), "G2 ... and on the Staging Review row too");

  // ---------- H. Reset clears everything ----------
  const H = await page.evaluate(() => {
    navigate('addcoin');
    document.getElementById('mintItemNumber').value = '21RJ';
    handleMintItemNumberApply();
    document.getElementById('gsidInput').value = 'GS-1044';
    handleGsidApply();
    resetAddCoinForm();
    return {
      mintVal: document.getElementById('mintItemNumber').value,
      gsidVal: document.getElementById('gsidInput').value,
      mintBannerHidden: document.getElementById('mintItemAppliedBanner').classList.contains('hidden'),
      gsidBannerHidden: document.getElementById('gsidAppliedBanner').classList.contains('hidden')
    };
  });
  ok(H.mintVal === '' && H.gsidVal === '', "H1 resetAddCoinForm() clears both new input fields");
  ok(H.mintBannerHidden && H.gsidBannerHidden, "H2 ... and hides both applied banners");

  // ---------- I. Nav smoke ----------
  const I = await page.evaluate(() => {
    const routes = ["dashboard", "browse", "albums", "sets", "wishlist", "stats", "acquisitions",
      "needsdbcoins", "staging", "addcoin", "addset", "inprogresssets"];
    const bad = [];
    routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    navigate('addcoin');
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(I.bad.length === 0, "I1 every route still navigates cleanly: " + I.bad.join("; "));
  ok(I.overflow === false, "I2 no horizontal overflow at 412px");
}, module);
