// Four corrections made after reviewing the REAL workbook (2026-09-02),
// rather than reasoning from the mock:
//
//   1. A resolved DB_Coins row's own Description is written onto Add Coin's
//      form. DB_Coins already carries real per-design names ("Delaware State
//      Quarter", "Martha Washington First Spouse Gold $10") with Variety
//      blank, while Ref_Denominations tops out at the program level.
//   2. Edit Coin gains the Mint Mark "— none (Other) —" lookup, narrower than
//      Add Coin's: MintMark only, plus an AUTHORITATIVE catalog link for save.
//   3. Denomination codes corrected against the real Lookup_DenomCodes table.
//   4. Finish dropdown corrected against real DB_Coins.Finish values.
//
// See CLAUDE.md "Workbook-alignment batch" for the full write-up.

const { defineSuite } = require("./harness");

module.exports = defineSuite("workbook-alignment", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // Real-shaped rows, transcribed from the actual workbook: per-design name in
  // Description, Variety genuinely blank, Finish populated. This is exactly
  // the shape that makes the base matcher return several candidates that
  // differ ONLY by Description.
  await page.evaluate(() => {
    window.STATE_QUARTERS_1999D = [
      { denom: "25C", year: 1999, mint: "D", variety: "", description: "Delaware State Quarter",
        finish: "Business Strike", designation: "", coinId: "C-1999-D-25C-02", pcgs: "5945", mintage: null, gsid: "" },
      { denom: "25C", year: 1999, mint: "D", variety: "", description: "Connecticut State Quarter",
        finish: "Business Strike", designation: "", coinId: "C-1999-D-25C-01", pcgs: "5953", mintage: null, gsid: "" },
      { denom: "25C", year: 1999, mint: "D", variety: "", description: "Georgia State Quarter",
        finish: "Business Strike", designation: "", coinId: "C-1999-D-25C-03", pcgs: "5951", mintage: null, gsid: "" }
    ];
    window.FIRST_SPOUSE_2007W = [
      { denom: "$10", year: 2007, mint: "W", variety: "", description: "Martha Washington First Spouse Gold $10",
        finish: "Uncirculated", designation: "", coinId: "C-2007-W-$10-03", pcgs: "150886", mintage: null, gsid: "" }
    ];
  });

  // ================= 1. Description write-back =================

  // A single unambiguous candidate writes its own per-design name, replacing
  // whatever coarse series name Ref_Denominations had supplied. 25C/1999 is a
  // real case where Ref_Denominations can only offer "Washington State (1st
  // Design)" for the whole 1999-2008 program.
  const A = await page.evaluate(() => {
    __setLiveDbCoinsForTest([STATE_QUARTERS_1999D[0]]); // Delaware alone
    navigate('addcoin');
    document.getElementById('denomination').value = '25C';
    document.getElementById('year').value = '1999';
    document.getElementById('mintMark').value = 'D';
    maybeAutoFillDescription(); // whatever Ref_Denominations can offer, first
    const fromRefDenominations = document.getElementById('description').value;
    checkDbCoinsMatch();
    const res = {
      fromRefDenominations,
      description: document.getElementById('description').value,
      matchShown: !document.getElementById('dbMatchBanner').classList.contains('hidden')
    };
    __setLiveDbCoinsForTest(null);
    return res;
  });
  ok(A.description === "Delaware State Quarter",
    "1.1 a single DB_Coins candidate writes its own per-design Description onto the form (got: " + A.description + ")");
  ok(A.matchShown, "1.2 ... and the normal single-match banner still shows");
  ok(A.fromRefDenominations !== "Delaware State Quarter",
    "1.2b ... and it genuinely replaced something coarser — Ref_Denominations alone could not name the design (it had: \"" + A.fromRefDenominations + "\")");

  // The same mechanism through the Bullion path, which is how First Spouse is
  // actually captured ($10 is not in the classic dropdown at all): the
  // Bullion-tier option sets a generic category label, and the resolved
  // catalog row's real per-spouse name then wins.
  const A2 = await page.evaluate(() => {
    __setLiveDbCoinsForTest(FIRST_SPOUSE_2007W);
    navigate('addcoin');
    const toggle = document.getElementById('addCoinBullionToggle');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    const select = document.getElementById('denomination');
    const opt = [...select.options].find(o => o.textContent.trim() === 'First Spouse $10 Gold');
    opt.selected = true;
    select.dispatchEvent(new Event('change'));
    const fromBullionLabel = document.getElementById('description').value;
    document.getElementById('year').value = '2007';
    document.getElementById('mintMark').value = 'W';
    checkDbCoinsMatch();
    const res = { fromBullionLabel, description: document.getElementById('description').value };
    __setLiveDbCoinsForTest(null);
    return res;
  });
  ok(A2.fromBullionLabel === "First Spouse $10 Gold",
    "1.2c a Bullion-tier pick still starts from its own generic label (got: " + A2.fromBullionLabel + ")");
  ok(A2.description === "Martha Washington First Spouse Gold $10",
    "1.2d ... and the resolved catalog row's real per-spouse name then replaces it (got: " + A2.description + ")");

  // The ambiguous case: three real designs sharing Year+Mint+Denom+blank
  // Variety. Nothing is written until a human picks, then the PICKED row's
  // name lands — not the first candidate's.
  const B = await page.evaluate(async () => {
    __setLiveDbCoinsForTest(STATE_QUARTERS_1999D);
    navigate('addcoin');
    document.getElementById('denomination').value = '25C';
    document.getElementById('year').value = '1999';
    document.getElementById('mintMark').value = 'D';
    checkDbCoinsMatch();
    const beforePick = {
      description: document.getElementById('description').value,
      ambiguousShown: !document.getElementById('dbAmbiguousBanner').classList.contains('hidden')
    };
    // Drive the real save path so the real picker opens.
    let resolved = null;
    resolveAddCoinCatalogMatch(r => { resolved = r; }, () => {});
    const panelOpen = !document.getElementById('addCoinMatchAmbiguousPanel').classList.contains('hidden');
    const cards = [...document.querySelectorAll('#addCoinMatchAmbiguousList .ambiguous-match')];
    const cardCount = cards.length;
    // Deliberately the SECOND card (Connecticut), so "it just took the first"
    // cannot pass by accident.
    cards[1].click();
    const afterPick = {
      description: document.getElementById('description').value,
      resolvedImmediately: resolved !== null
    };
    // The pick must SURVIVE its own write-back. Writing the Description
    // changes what addCoinIdentityShape() reports (a Ref_Denominations series
    // name is passed to the matcher; a DB_Coins per-design name is not), so a
    // pick keyed to the PRE-write shape would be judged stale on the very next
    // call and silently discarded.
    const state = currentAddCoinMatchState();
    const res = {
      beforePick, cardCount, panelOpen, afterPick,
      pickSurvived: state.resolvedPick === true,
      survivingCoinId: state.candidates.length === 1 ? state.candidates[0].coinId : null
    };
    __setLiveDbCoinsForTest(null);
    return res;
  });
  ok(B.beforePick.ambiguousShown && B.cardCount === 3,
    "1.3 three real designs sharing Year+Mint+Denom+blank-Variety are genuinely ambiguous (" + B.cardCount + " candidates)");
  ok(B.beforePick.description !== "Delaware State Quarter" && B.beforePick.description !== "Connecticut State Quarter",
    "1.4 nothing is written while it is still ambiguous — no silent first-candidate guess");
  ok(B.afterPick.description === "Connecticut State Quarter",
    "1.5 picking the SECOND candidate writes THAT row's Description, not the first's (got: " + B.afterPick.description + ")");
  ok(B.afterPick.resolvedImmediately === false,
    "1.6 picking still does not save — unchanged from the established resolve-then-Save-again rule");
  ok(B.pickSurvived && B.survivingCoinId === "C-1999-D-25C-01",
    "1.7 the pick SURVIVES its own Description write-back (the shape key is recomputed after the write, not before)");

  // The pick-survival hazard, in the shape that actually triggers it.
  //
  // 1.7 above cannot: 25C/1999 has SEVERAL Ref_Denominations series, so the
  // field is cleared and shape.description is "" both before and after the
  // write — the key never moves, and a pre-write key would survive by luck.
  // 10C/1950 has exactly ONE series ("Roosevelt Silver"), so the field holds
  // a CONTROLLED value that addCoinIdentityShape() does pass to the matcher.
  // Replacing it with a per-design catalog name drops that back to "" and so
  // genuinely changes the shape key — which is what would strand the pick.
  const B2 = await page.evaluate(() => {
    __setLiveDbCoinsForTest([
      { denom: "10C", year: 1950, mint: "D", variety: "", description: "Roosevelt Dime",
        finish: "Business Strike", designation: "", coinId: "C-1950-D-10C-A", pcgs: "", mintage: null, gsid: "" },
      { denom: "10C", year: 1950, mint: "D", variety: "", description: "Roosevelt Dime (Doubled Die)",
        finish: "Business Strike", designation: "", coinId: "C-1950-D-10C-B", pcgs: "", mintage: null, gsid: "" }
    ]);
    navigate('addcoin');
    document.getElementById('denomination').value = '10C';
    document.getElementById('year').value = '1950';
    document.getElementById('mintMark').value = 'D';
    maybeAutoFillDescription();
    const seriesBefore = document.getElementById('description').value;
    const controlledBefore = addCoinIdentityShape().description;
    checkDbCoinsMatch();
    resolveAddCoinCatalogMatch(() => {}, () => {});
    const cards = [...document.querySelectorAll('#addCoinMatchAmbiguousList .ambiguous-match')];
    const cardCount = cards.length;
    cards[0].click();
    const state = currentAddCoinMatchState();
    const res = {
      seriesBefore, controlledBefore, cardCount,
      controlledAfter: addCoinIdentityShape().description,
      description: document.getElementById('description').value,
      pickSurvived: state.resolvedPick === true,
      survivingCoinId: state.candidates.length === 1 ? state.candidates[0].coinId : null
    };
    __setLiveDbCoinsForTest(null);
    return res;
  });
  ok(B2.cardCount === 2 && B2.controlledBefore === "Roosevelt Silver",
    "1.7b setup: the field holds a CONTROLLED series value that the matcher reads, and the catalog is ambiguous");
  ok(B2.controlledAfter === "",
    "1.7c the write-back genuinely moves the shape key (the per-design name is not controlled vocabulary)");
  ok(B2.description === "Roosevelt Dime" && B2.pickSurvived && B2.survivingCoinId === "C-1950-D-10C-A",
    "1.7d ... and the pick STILL survives, because it is keyed to the identity as it stands AFTER the write");

  // A description the user typed themselves is never overwritten.
  const C = await page.evaluate(() => {
    __setLiveDbCoinsForTest(FIRST_SPOUSE_2007W);
    navigate('addcoin');
    document.getElementById('denomination').value = '$10';
    document.getElementById('year').value = '2007';
    document.getElementById('mintMark').value = 'W';
    const descEl = document.getElementById('description');
    descEl.value = "My own wording";
    descEl.dispatchEvent(new Event('input'));
    checkDbCoinsMatch();
    const res = { description: descEl.value };
    __setLiveDbCoinsForTest(null);
    return res;
  });
  ok(C.description === "My own wording",
    "1.8 a user-typed Description is never overwritten by the catalog (got: " + C.description + ")");

  // A previously written catalog name IS replaceable by a genuinely different
  // catalog row — otherwise the first match's name would strand itself on a
  // later, different identity.
  const D = await page.evaluate(() => {
    __setLiveDbCoinsForTest([
      STATE_QUARTERS_1999D[0], // 1999-D Delaware
      { denom: "25C", year: 2000, mint: "D", variety: "", description: "Maryland State Quarter",
        finish: "Business Strike", designation: "", coinId: "C-2000-D-25C-01", pcgs: "5957", mintage: null, gsid: "" }
    ]);
    navigate('addcoin');
    document.getElementById('denomination').value = '25C';
    document.getElementById('year').value = '1999';
    document.getElementById('mintMark').value = 'D';
    checkDbCoinsMatch();
    const first = document.getElementById('description').value;
    document.getElementById('year').value = '2000';
    checkDbCoinsMatch();
    const second = document.getElementById('description').value;
    __setLiveDbCoinsForTest(null);
    return { first, second };
  });
  ok(D.first === "Delaware State Quarter" && D.second === "Maryland State Quarter",
    "1.9 a catalog-written Description is replaced when the identity resolves to a DIFFERENT row (got: " + D.second + ")");

  // ================= 2. Edit Coin Mint Mark "None (Other)" =================

  // The matched row's Description/Variety/Finish are deliberately DIFFERENT
  // from what the coin being edited already carries. That is what makes the
  // scope assertion below meaningful: if this lookup ever started filling
  // identity the way Add Coin's does, these values would visibly land on the
  // form, and 2.6 would fail.
  const MINT_ROWS = {
    single: [{ denom: "$1", year: 1921, mint: "", mintFull: "Denver", variety: "High Relief",
      description: "Peace Dollar (High Relief)",
      finish: "Matte Proof", designation: "", coinId: "C-MINT-SINGLE", pcgs: "", mintage: null, gsid: "" }],
    ambiguous: [
      { denom: "$1", year: 1921, mint: "", mintFull: "Denver", variety: "", description: "Peace Dollar",
        finish: "Business Strike", designation: "", coinId: "C-MINT-DENVER", pcgs: "", mintage: null, gsid: "" },
      { denom: "$1", year: 1921, mint: "", mintFull: "West Point", variety: "", description: "Peace Dollar",
        finish: "Business Strike", designation: "", coinId: "C-MINT-WESTPOINT", pcgs: "", mintage: null, gsid: "" }
    ],
    philadelphiaOnly: [{ denom: "$1", year: 1921, mint: "", mintFull: "Philadelphia", variety: "", description: "Peace Dollar",
      finish: "Business Strike", designation: "", coinId: "C-MINT-PHILLY", pcgs: "", mintage: null, gsid: "" }],
    multipleFacilities: [{ denom: "$1", year: 1921, mint: "", mintFull: "Multiple Facilities", variety: "", description: "Peace Dollar",
      finish: "Business Strike", designation: "", coinId: "C-MINT-MF", pcgs: "", mintage: null, gsid: "" }]
  };

  const E = await page.evaluate(() => {
    navigate('browse');
    const coin = FAKE_COINS.find(c => c.id === "AY-00007"); // Peace Dollar, 1928, blank mint
    showBrowseDetail(coin); showBrowseEditView(coin);
    const opts = [...document.querySelectorAll('#browseEditMintMark option')].map(o => o.value);
    const panel = document.getElementById('browseEditMintMarkOtherAmbiguousPanel');
    const mfOpt = document.getElementById('browseEditMintMarkOtherMultipleFacilitiesOption');
    return {
      opts,
      otherIndex: opts.indexOf('__OTHER_MINT__'),
      // The recurring trap in this file: there is no generic .hidden rule, so
      // a panel can report classList "hidden" while rendering fully visible.
      panelReallyHidden: panel.classList.contains('hidden') && getComputedStyle(panel).display === 'none',
      mfReallyHidden: mfOpt.classList.contains('hidden') && getComputedStyle(mfOpt).display === 'none'
    };
  });
  ok(E.otherIndex === 1,
    "2.1 \"— none (Other) —\" sits directly after the plain Philadelphia blank in Edit Coin's dropdown (index " + E.otherIndex + ")");
  ok(E.panelReallyHidden, "2.2 the ambiguous panel is GENUINELY hidden (computed display:none), not just classList-hidden");
  ok(E.mfReallyHidden, "2.3 the Multiple-Facilities option is genuinely hidden too");

  // A single real facility: banner, blank MintMark, and — the scope
  // guarantee — no other field touched.
  const F = await page.evaluate((rows) => {
    __setLiveDbCoinsForTest(rows.single);
    navigate('browse');
    const coin = FAKE_COINS.find(c => c.id === "AY-00007");
    showBrowseDetail(coin); showBrowseEditView(coin);
    document.getElementById('browseEditYear').value = '1921';
    document.getElementById('browseEditDenomination').value = '$1';
    const before = {
      description: document.getElementById('browseEditDescription').value,
      variety: document.getElementById('browseEditVariety').value,
      denom: document.getElementById('browseEditDenomination').value,
      year: document.getElementById('browseEditYear').value
    };
    const sel = document.getElementById('browseEditMintMark');
    sel.value = '__OTHER_MINT__';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    const after = {
      mintMark: sel.value,
      appliedShown: !document.getElementById('browseEditMintMarkOtherAppliedBanner').classList.contains('hidden'),
      appliedMsg: document.getElementById('browseEditMintMarkOtherAppliedMsg').textContent,
      description: document.getElementById('browseEditDescription').value,
      variety: document.getElementById('browseEditVariety').value,
      denom: document.getElementById('browseEditDenomination').value,
      year: document.getElementById('browseEditYear').value,
      touchedMintMark: browseEditTouchedFields.has('browseEditMintMark')
    };
    __setLiveDbCoinsForTest(null);
    return { before, after };
  }, MINT_ROWS);
  ok(F.after.mintMark === "", "2.4 the sentinel normalizes straight back to blank — never a stored MintMark value");
  ok(F.after.appliedShown && /Denver/.test(F.after.appliedMsg) && /C-MINT-SINGLE/.test(F.after.appliedMsg),
    "2.5 a single real-facility match names the mint and the CoinID it will link to");
  ok(F.after.description === F.before.description && F.after.variety === F.before.variety &&
     F.after.denom === F.before.denom && F.after.year === F.before.year,
    "2.6 SCOPE GUARANTEE: Description/Variety/Denomination/Year are untouched — unlike Add Coin's full-identity fill");
  ok(F.after.description !== "Peace Dollar (High Relief)" && F.after.variety !== "High Relief",
    "2.6b ... specifically NOT the matched row's own differing Description/Variety, which a full fill would have written");
  ok(F.after.touchedMintMark,
    "2.7 Mint Mark is still marked user-touched — choosing \"Other\" IS a real edit of the field to blank");

  // Philadelphia rows are excluded: they are the ordinary blank case the plain
  // option already covers, not what "Other" is for.
  const G = await page.evaluate((rows) => {
    __setLiveDbCoinsForTest(rows.philadelphiaOnly);
    navigate('browse');
    const coin = FAKE_COINS.find(c => c.id === "AY-00007");
    showBrowseDetail(coin); showBrowseEditView(coin);
    document.getElementById('browseEditYear').value = '1921';
    document.getElementById('browseEditDenomination').value = '$1';
    const sel = document.getElementById('browseEditMintMark');
    sel.value = '__OTHER_MINT__';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    const res = {
      notFound: !document.getElementById('browseEditMintMarkOtherNotFoundBanner').classList.contains('hidden'),
      mintMark: sel.value
    };
    __setLiveDbCoinsForTest(null);
    return res;
  }, MINT_ROWS);
  ok(G.notFound && G.mintMark === "",
    "2.8 a Philadelphia-only match reports not-found (and still clears Mint Mark) — Philadelphia is not what \"Other\" disambiguates");

  // 2+ real facilities: a deliberate human pick, and that pick becomes
  // AUTHORITATIVE for the save-time CoinID re-link.
  const H = await page.evaluate((rows) => {
    __setLiveDbCoinsForTest(rows.ambiguous);
    navigate('browse');
    const coin = FAKE_COINS.find(c => c.id === "AY-00007");
    showBrowseDetail(coin); showBrowseEditView(coin);
    document.getElementById('browseEditYear').value = '1921';
    document.getElementById('browseEditDenomination').value = '$1';
    const sel = document.getElementById('browseEditMintMark');
    sel.value = '__OTHER_MINT__';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    const panelOpen = !document.getElementById('browseEditMintMarkOtherAmbiguousPanel').classList.contains('hidden');
    const cards = [...document.querySelectorAll('#browseEditMintMarkOtherAmbiguousList .ambiguous-match')];
    const cardCount = cards.length;
    const cardText = cards.map(c => c.textContent);
    cards[1].click(); // the SECOND (West Point), so "took the first" cannot pass by accident
    const picked = browseEditResolvedMintPick ? browseEditResolvedMintPick.row.coinId : null;

    // The authoritative half: resolveDbCoinsForSave() must hand back the
    // picked row rather than re-deriving from the blank MintMark, which
    // cannot tell Denver from West Point from Philadelphia.
    const form = readBrowseEditForm();
    const shape = buildBrowseEditIdentityShape(coin, form.workbook);
    let handedBack = null, viaPicker = null;
    resolveDbCoinsForSave({ Year: 1928, MintMark: "", Denomination: "$1", Variety: "", Designation: "" },
      form.workbook, shape, (row, vp) => { handedBack = row ? row.coinId : null; viaPicker = vp; });

    const res = { panelOpen, cardCount, cardText, picked, handedBack, viaPicker };
    __setLiveDbCoinsForTest(null);
    return res;
  }, MINT_ROWS);
  ok(H.panelOpen && H.cardCount === 2, "2.9 two real facilities open the picker rather than guessing");
  ok(/Denver/.test(H.cardText[0]) && /West Point/.test(H.cardText[1]),
    "2.9b each card NAMES its mint — the candidates agree on every other field, so without this the choice is unanswerable");
  ok(H.cardText[0] !== H.cardText[1],
    "2.9c ... and the two cards are therefore not identical text (the Part-F failure mode, in the one picker where the mint IS the question)");
  ok(H.picked === "C-MINT-WESTPOINT", "2.10 picking the second candidate records THAT row (got: " + H.picked + ")");
  ok(H.handedBack === "C-MINT-WESTPOINT",
    "2.11 AUTHORITATIVE: the save-time resolution returns the picked row instead of re-deriving from a blank MintMark");
  ok(H.viaPicker === true,
    "2.12 ... flagged viaPicker, so the CoinID-change confirm does not re-ask a question the applied banner already answered");

  // The pick is self-invalidating: it belongs to one identity only.
  const I = await page.evaluate((rows) => {
    __setLiveDbCoinsForTest(rows.single);
    navigate('browse');
    const coin = FAKE_COINS.find(c => c.id === "AY-00007");
    showBrowseDetail(coin); showBrowseEditView(coin);
    document.getElementById('browseEditYear').value = '1921';
    document.getElementById('browseEditDenomination').value = '$1';
    const sel = document.getElementById('browseEditMintMark');
    sel.value = '__OTHER_MINT__';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    const pickedFor1921 = browseEditResolvedMintPick !== null;

    // Move the identity on. The pick was about a 1921 coin.
    document.getElementById('browseEditYear').value = '1922';
    const form = readBrowseEditForm();
    const shape = buildBrowseEditIdentityShape(coin, form.workbook);
    let handedBack = "untouched";
    resolveDbCoinsForSave({ Year: 1928, MintMark: "", Denomination: "$1", Variety: "", Designation: "" },
      form.workbook, shape, (row) => { handedBack = row ? row.coinId : null; });
    const res = { pickedFor1921, handedBack, cleared: browseEditResolvedMintPick === null };
    __setLiveDbCoinsForTest(null);
    return res;
  }, MINT_ROWS);
  ok(I.pickedFor1921, "2.13 sanity: the 1921 identity did resolve a mint");
  ok(I.handedBack !== "C-MINT-SINGLE" && I.cleared,
    "2.14 editing Year afterwards discards the pick — it belonged to one identity, not to the form");

  // Multiple Facilities keeps its own distinct wording.
  const J = await page.evaluate((rows) => {
    __setLiveDbCoinsForTest(rows.multipleFacilities);
    navigate('browse');
    const coin = FAKE_COINS.find(c => c.id === "AY-00007");
    showBrowseDetail(coin); showBrowseEditView(coin);
    document.getElementById('browseEditYear').value = '1921';
    document.getElementById('browseEditDenomination').value = '$1';
    const sel = document.getElementById('browseEditMintMark');
    sel.value = '__OTHER_MINT__';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    const msg = document.getElementById('browseEditMintMarkOtherAppliedMsg').textContent;
    const res = { msg, picked: browseEditResolvedMintPick ? browseEditResolvedMintPick.row.coinId : null };
    __setLiveDbCoinsForTest(null);
    return res;
  }, MINT_ROWS);
  ok(/multiple facilities/i.test(J.msg) && J.picked === "C-MINT-MF",
    "2.15 a Multiple-Facilities row applies with its own wording, never as if it were a place name");

  // Opening Edit for another coin must not inherit the previous resolution.
  const K = await page.evaluate((rows) => {
    __setLiveDbCoinsForTest(rows.single);
    navigate('browse');
    const first = FAKE_COINS.find(c => c.id === "AY-00007");
    showBrowseDetail(first); showBrowseEditView(first);
    document.getElementById('browseEditYear').value = '1921';
    document.getElementById('browseEditDenomination').value = '$1';
    const sel = document.getElementById('browseEditMintMark');
    sel.value = '__OTHER_MINT__';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    const had = browseEditResolvedMintPick !== null;
    const other = FAKE_COINS.find(c => c.id === "AY-00005");
    showBrowseDetail(other); showBrowseEditView(other);
    const res = {
      had,
      clearedOnReopen: browseEditResolvedMintPick === null,
      bannerHidden: document.getElementById('browseEditMintMarkOtherAppliedBanner').classList.contains('hidden')
    };
    __setLiveDbCoinsForTest(null);
    return res;
  }, MINT_ROWS);
  ok(K.had && K.clearedOnReopen && K.bannerHidden,
    "2.16 opening Edit for a different coin clears the pick and its banner — no leak between coins");

  // ================= 3. Denomination codes =================

  const L = await page.evaluate(() => {
    const codes = DENOM_CODE_INFO.map(d => d.code);
    return {
      codes,
      labelFor: c => 0, // placeholder, replaced below
      threeSilver: DENOM_CODE_INFO.find(d => d.code === '3CS'),
      threeNickel: DENOM_CODE_INFO.find(d => d.code === '3CN'),
      fiveOz: DENOM_CODE_INFO.find(d => d.code === '5oz'),
      scale: { h1c: DENOM_SCALE['H1C'], h10c: DENOM_SCALE['H10C'], s: DENOM_SCALE['3CS'], n: DENOM_SCALE['3CN'] },
      labels: { h1c: DENOM_LABELS['H1C'], h10c: DENOM_LABELS['H10C'], s: DENOM_LABELS['3CS'], n: DENOM_LABELS['3CN'], oz: DENOM_LABELS['5oz'] },
      order: STATS_DENOM_ORDER,
      denomsRows: FAKE_DENOMINATIONS.filter(r => r.denom === '3CS' || r.denom === '3CN' || r.denom === 'H1C' || r.denom === 'H10C').length,
      oldRows: FAKE_DENOMINATIONS.filter(r => r.denom === '0.5C' || r.denom === 'H5C' || r.denom === '3C').length
    };
  });
  ok(!L.codes.includes('0.5C') && !L.codes.includes('H5C') && !L.codes.includes('3C'),
    "3.1 the three invented codes (0.5C / H5C / merged 3C) are gone from DENOM_CODE_INFO");
  ok(L.codes.includes('H1C') && L.codes.includes('H10C'),
    "3.2 the real Lookup_DenomCodes values H1C (Half Cent) and H10C (Half Dime) are used instead");
  ok(L.threeSilver && L.threeSilver.label === 'Three-Cent Silver' && L.threeNickel && L.threeNickel.label === 'Three-Cent Nickel',
    "3.3 Three Cent is split into its two real codes, 3CS and 3CN, with distinct labels");
  ok(L.fiveOz && L.fiveOz.label === 'Five-Ounce Silver',
    "3.4 the real 5oz code exists, labelled Five-Ounce Silver");
  ok(L.scale.h1c === 0.70 && L.scale.h10c === 0.70 && L.scale.s === 0.70 && L.scale.n === 0.70,
    "3.5 every renamed/new code carries its own DENOM_SCALE entry rather than silently defaulting to 1.0");
  ok(L.labels.h1c === 'Half Cents' && L.labels.h10c === 'Half Dimes' && L.labels.s && L.labels.n && L.labels.oz,
    "3.6 DENOM_LABELS covers all of them, so Stats & Value can render a real breakdown row");
  ok(L.order.includes('H1C') && L.order.includes('H10C') && L.order.includes('3CS') && L.order.includes('3CN') && L.order.includes('5oz'),
    "3.7 STATS_DENOM_ORDER covers them too");
  ok(L.oldRows === 0 && L.denomsRows > 0,
    "3.8 FAKE_DENOMINATIONS itself carries the corrected codes, with no old ones left behind");
  // The 3CS/3CN year ranges overlap 1865-1873 — the concrete reason one
  // shared code could never have been right.
  const M = await page.evaluate(() => {
    const s = FAKE_DENOMINATIONS.find(r => r.denom === '3CS');
    const n = FAKE_DENOMINATIONS.find(r => r.denom === '3CN');
    return { s, n, overlap: s && n && n.yearStart <= s.yearEnd };
  });
  ok(M.overlap,
    "3.9 the two three-cent series genuinely overlap (" + M.n.yearStart + "-" + M.s.yearEnd + "), which is why one code could not serve both");

  // ================= 4. Finish values =================

  const N = await page.evaluate(() => {
    navigate('addcoin');
    const options = [...document.querySelectorAll('#finish option')].map(o => o.value).filter(Boolean);
    return {
      options,
      prefixMatteProof: FINISH_GRADE_PREFIX['Matte Proof'],
      prefixUncirculated: FINISH_GRADE_PREFIX['Uncirculated'],
      gradeMatteProof: numericGradeToCode(65, 'Matte Proof'),
      gradeUncirculated: numericGradeToCode(65, 'Uncirculated')
    };
  });
  // Lookup_Finishes' own 11 defined values, plus "Matte" which is in real use
  // in DB_Coins but absent from that table.
  ["Business Strike", "Proof", "Reverse Proof", "Uncirculated", "Burnished", "Satin Finish",
   "Enhanced Uncirculated", "Enhanced Reverse Proof", "SMS", "Matte Proof", "Specimen", "Matte"].forEach(v => {
    ok(N.options.includes(v), "4.1 Finish dropdown offers \"" + v + "\"");
  });
  ok(!N.options.includes("Circulated"), "4.2 \"Circulated\" is still not offered — a wear state, absent from Lookup_Finishes");
  ok(N.prefixMatteProof === 'PR' && N.gradeMatteProof === 'PR-65',
    "4.3 Matte Proof decodes as a PROOF grade (PR-65), not the MS-65 the generic fallback would have given");
  ok(N.prefixUncirculated === 'MS' && N.gradeUncirculated === 'MS-65',
    "4.4 Uncirculated decodes as MS-65");

  // The Finish tier still behaves: a real value that genuinely has no row for
  // this coin narrows to zero, an unrecognized one falls back softly.
  const O = await page.evaluate(() => {
    // A Proof row for an UNRELATED coin, so "Proof" is a globally-known
    // DB_Coins Finish value — which is the real-world condition the
    // hard-narrow tier keys on (knownDbCoinsFinishValues() scans the whole
    // catalog, not just this coin's candidates).
    __setLiveDbCoinsForTest(STATE_QUARTERS_1999D.concat([
      { denom: "10C", year: 1950, mint: "", variety: "", description: "Roosevelt Dime",
        finish: "Proof", designation: "", coinId: "C-UNRELATED-PROOF", pcgs: "", mintage: null, gsid: "" }
    ]));
    const withRealButAbsent = dbCoinsCandidatesFor({ denom: "25C", year: "1999", mint: "D", variety: "", finish: "Proof" }).length;
    const withUnknown = dbCoinsCandidatesFor({ denom: "25C", year: "1999", mint: "D", variety: "", finish: "Circulated" }).length;
    const withMatching = dbCoinsCandidatesFor({ denom: "25C", year: "1999", mint: "D", variety: "", finish: "Business Strike" }).length;
    __setLiveDbCoinsForTest(null);
    return { withRealButAbsent, withUnknown, withMatching };
  });
  ok(O.withMatching === 3, "4.5 a matching Finish leaves the candidate set intact");
  ok(O.withRealButAbsent === 0,
    "4.6 a REAL DB_Coins Finish value with no row for this coin still narrows to zero (unchanged behaviour)");
  ok(O.withUnknown === 3,
    "4.7 an All-only wear-state value still falls back softly to the full set (unchanged behaviour)");

  // ================= Smoke =================
  const P = await page.evaluate(() => {
    const routes = ["dashboard", "browse", "sets", "albums", "wishlist", "addcoin", "stats", "needsdbcoins", "staging"];
    const bad = [];
    routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    navigate('dashboard');
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(P.bad.length === 0, "5.1 every route still navigates cleanly: " + P.bad.join("; "));
  ok(P.overflow === false, "5.2 no horizontal page overflow at 412px");
}, module);
