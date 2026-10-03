// Ray's live Add Coin repro: Year 2026 / no mint / $1 / Business Strike with
// "Trump" typed into Description silently auto-matched C-2026--$1-01 — a
// different real 2026 dollar — behind a green "Matched DB_Coins" banner, with
// no picker shown. Investigated first; two independent causes, both confirmed
// by driving the real form headlessly rather than by reading the code:
//
//   1. addCoinIdentityShape() blanks a FREE-TYPED Description before the
//      matcher sees it (only Ref_Denominations' controlled series values pass
//      through). Working as designed.
//   2. Even a CONTROLLED Description could not have stopped it — the
//      Description tier is `candidates.length > 1`-guarded and soft, so it can
//      never validate a LONE candidate. Same structural blind spot FIX A
//      closed for Finish (2026-09-08).
//
// THE FIX, in three parts:
//   A. A Description CONSISTENCY GATE at the confidence layer beside
//      isVarietyRecognized() — NOT a matcher tier. Free-typed Description
//      only; controlled series values exempt; token overlap, never string
//      equality (equality would refuse every State Quarter / ATB / First
//      Spouse, whose per-design catalog names legitimately differ from
//      Ref_Denominations' program-level series names).
//   B. The green banner is suppressed on refusal, not just the direct-write
//      button — a confident-looking banner beside a row we have privately
//      decided not to trust hides the Staging-unmatched review meant to catch
//      it.
//   C. The Category tier's identical `length > 1` gap closed, mirroring FIX A.
//
// See CLAUDE.md for the full writeup, including the one place where the
// zero-blast-radius requirement and part C are in genuine tension
// (recheckCoinDraftMatch(), the only non-Add-Coin caller that passes
// `category`).

const { defineSuite } = require("./harness");

// Stand-in for whatever real row sits at C-2026--$1-01. Deliberately NOT a
// Trump dollar: the point is that a DIFFERENT real 2026 blank-mint $1 row
// absorbs the match.
const OTHER_2026_DOLLAR = {
  denom: "$1", year: 2026, mint: "", variety: "", finish: "Business Strike",
  description: "American Silver Eagle Dollar", designation: "",
  coinId: "C-2026--$1-01", pcgs: "9999", mintage: 123456, gsid: "", composition: ""
};

// The per-design naming case the fix must NOT refuse: DB_Coins carries the
// individual design name while Ref_Denominations tops out at the program.
const ATB_QUARTER = {
  denom: "25C", year: 2010, mint: "P", variety: "", finish: "Business Strike",
  description: "Grand Canyon Quarter", designation: "",
  coinId: "C-2010-P-25C-01", pcgs: "", mintage: null, gsid: "", composition: ""
};

// Fills the Add Coin identity fields the way a person would, firing the real
// listeners so the live banner/confidence UI actually re-evaluate.
const FILL = `(function (f) {
  const set = (id, v) => {
    const el = document.getElementById(id);
    el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  set("denomination", f.denom);
  set("year", f.year);
  set("mintMark", f.mint);
  set("variety", f.variety || "");
  set("finish", f.finish || "");
  set("description", f.description);
})`;

module.exports = defineSuite("description-conflict-gate", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ================= A. Token overlap in isolation =================
  const A = await page.evaluate(() => {
    const share = (a, b) => descriptionsShareIdentity(a, b);
    return {
      trumpVsEagle:        share("Trump", "American Silver Eagle Dollar"),
      trumpDollarVsEagle:  share("Trump Dollar", "American Silver Eagle Dollar"),
      grandCanyon:         share("Grand Canyon", "Grand Canyon Quarter"),
      delaware:            share("Delaware", "Delaware State Quarter"),
      firstSpouse:         share("Martha Washington", "Martha Washington First Spouse Gold $10"),
      shortenedForm:       share("Canyon", "Grand Canyons Quarter"),
      silverEagleAgrees:   share("Silver Eagle", "American Silver Eagle Dollar"),
      goldVsSilverEagle:   share("Gold Eagle", "American Silver Eagle Dollar"),
      goldVsSilverTokens:  [descriptionIdentityTokens("Gold Eagle"), descriptionIdentityTokens("American Silver Eagle Dollar")],
      // Fail-safe cases: nothing identity-bearing survives on one side, so
      // there is no signal and the gate must never refuse.
      onlyGenericTyped:    share("Dollar", "American Silver Eagle Dollar"),
      onlyCountryTyped:    share("American", "American Silver Eagle Dollar"),
      onlyNumericTyped:    share("2026", "American Innovation Dollar"),
      blankTyped:          share("", "American Silver Eagle Dollar"),
      blankRow:            share("Trump", ""),
      tokens:              descriptionIdentityTokens("American Silver Eagle Dollar")
    };
  });
  ok(A.trumpVsEagle === false, "A1 the reported case: \"Trump\" shares no identity word with \"American Silver Eagle Dollar\"");
  ok(A.trumpDollarVsEagle === false,
    "A2 \"Trump Dollar\" still disagrees — the generic word DOLLAR is stripped, which is the whole reason for the stopword list");
  ok(A.grandCanyon === true, "A3 \"Grand Canyon\" agrees with \"Grand Canyon Quarter\" (the ATB per-design case equality would have refused)");
  ok(A.delaware === true, "A4 \"Delaware\" agrees with \"Delaware State Quarter\"");
  ok(A.firstSpouse === true, "A5 \"Martha Washington\" agrees with \"Martha Washington First Spouse Gold $10\"");
  ok(A.shortenedForm === true, "A6 a shortened form still agrees (containment, not exact token equality)");
  ok(A.silverEagleAgrees === true, "A7 \"Silver Eagle\" agrees with \"American Silver Eagle Dollar\"");
  // KNOWN, ACCEPTED LIMIT, asserted rather than left implicit. One shared
  // identity word is the threshold, and "Gold Eagle" / "American Silver Eagle
  // Dollar" genuinely share EAGLE — so this gate alone does NOT separate the
  // bullion families. It does not need to: a Bullion-tier pick carries a
  // Category, and the Category tier hard-rejects exactly this pair (block G).
  // The gate is the backstop for FREE-TYPED text, not a second matcher.
  ok(A.goldVsSilverEagle === true,
    "A8 known limit: \"Gold Eagle\" vs \"American Silver Eagle Dollar\" share EAGLE and so pass this gate — the Category tier (block G) is what separates the bullion families, not this");
  ok(A.goldVsSilverTokens[0].indexOf("GOLD") !== -1 && A.goldVsSilverTokens[1].indexOf("SILVER") !== -1,
    "A8b -- GOLD and SILVER are nonetheless preserved as identity tokens and must never be added to the stopword list");
  ok(A.onlyGenericTyped === true, "A9 fail-safe: a typed value that is ONLY a generic word never refuses");
  ok(A.onlyCountryTyped === true, "A10 fail-safe: \"American\" alone never refuses");
  ok(A.onlyNumericTyped === true, "A11 fail-safe: a pure-numeric typed value never refuses (Year is already the matcher's own base key)");
  ok(A.blankTyped === true, "A12 fail-safe: a blank Description never refuses");
  ok(A.blankRow === true, "A13 fail-safe: a row with no Description of its own never refuses");
  ok(A.tokens.join(",") === "SILVER,EAGLE", "A14 identity tokens drop AMERICAN and DOLLAR, keep SILVER and EAGLE");

  // ============ B. isDescriptionConsistentWithMatch exemptions ============
  const B = await page.evaluate((args) => {
    const set = (id, v) => { document.getElementById(id).value = v; };
    set("denomination", "$1"); set("year", "2026");
    const controlledSeries = lookupDescriptionCandidates("$1", "2026").map(c => c.series);
    set("description", "Trump");
    const freeTypedConflict = isDescriptionConsistentWithMatch(args.row);
    // A CONTROLLED Ref_Denominations series is exempt: those are
    // program-level by nature and legitimately differ from a per-design
    // catalog name, which is exactly the false-positive class to avoid.
    set("description", controlledSeries[0]);
    const controlledExempt = isDescriptionConsistentWithMatch(args.row);
    set("description", "");
    const blankExempt = isDescriptionConsistentWithMatch(args.row);
    set("description", "Trump");
    const noRowDescription = isDescriptionConsistentWithMatch({ description: "" });
    const nullRow = isDescriptionConsistentWithMatch(null);
    return { controlledSeries, freeTypedConflict, controlledExempt, blankExempt, noRowDescription, nullRow };
  }, { row: OTHER_2026_DOLLAR });
  ok(B.freeTypedConflict === false, "B1 a free-typed Description that shares nothing with the matched row is inconsistent");
  ok(B.controlledSeries.length > 1 && B.controlledSeries.indexOf("Trump") === -1,
    "B2 $1/2026's controlled vocabulary genuinely offers no Trump option (" + B.controlledSeries.join(" / ") + ")");
  ok(B.controlledExempt === true, "B3 a CONTROLLED series value is exempt even when it shares nothing with the row");
  ok(B.blankExempt === true, "B4 a blank Description is exempt");
  ok(B.noRowDescription === true, "B5 a row with no Description is exempt");
  ok(B.nullRow === true, "B6 a null row never throws and never refuses");

  // ============ C. The reported repro, end to end through the real UI ============
  const C = await page.evaluate((args) => {
    __setLiveDbCoinsForTest([args.row]);
    eval(args.fill)({ denom: "$1", year: "2026", mint: "", variety: "", finish: "Business Strike", description: "Trump" });
    const vis = (id) => !document.getElementById(id).classList.contains("hidden");
    const out = {
      candidateCount: dbCoinsCandidatesFor(addCoinIdentityShape()).length,
      conflictFlag: currentAddCoinMatchState().descriptionConflict,
      confident: isConfidentMatch(),
      greenBannerVisible: vis("dbMatchBanner"),
      conflictBannerVisible: vis("dbDescriptionConflictBanner"),
      noMatchBannerVisible: vis("dbNoMatchBanner"),
      ambiguousBannerVisible: vis("dbAmbiguousBanner"),
      conflictText: document.getElementById("dbDescriptionConflictMsg").textContent,
      saveToDbDisplay: document.getElementById("saveToDatabaseBtn").style.display,
      notConfidentVisible: vis("saveNotConfidentBanner"),
      notConfidentText: document.getElementById("saveNotConfidentMsg").textContent,
      formDescription: document.getElementById("description").value
    };
    __setLiveDbCoinsForTest(null);
    return out;
  }, { row: OTHER_2026_DOLLAR, fill: FILL });
  ok(C.candidateCount === 1, "C1 the matcher itself is untouched — it still resolves to the same single candidate");
  ok(C.conflictFlag === true, "C2 the derived descriptionConflict flag is set for that lone candidate");
  ok(C.confident === false, "C3 confidence is withheld, exactly as an unrecognized Variety does");
  ok(C.greenBannerVisible === false, "C4 the green \"Matched DB_Coins\" banner is SUPPRESSED (the reported symptom)");
  ok(C.conflictBannerVisible === true, "C5 an honest conflict banner is shown in its place");
  ok(C.noMatchBannerVisible === false && C.ambiguousBannerVisible === false,
    "C6 -- and neither the no-match nor the ambiguous banner is shown, since neither is what happened");
  ok(/American Silver Eagle Dollar/.test(C.conflictText) && /C-2026--\$1-01/.test(C.conflictText),
    "C7 the conflict banner NAMES the row and its CoinID so the disagreement is checkable, not mysterious");
  ok(C.saveToDbDisplay === "none", "C8 Save to Database is withheld");
  ok(C.notConfidentVisible === true && /doesn't look like the Description/.test(C.notConfidentText),
    "C9 the not-confident banner gives the fourth, Description-specific reason rather than blaming Variety or a missing catalog row");
  ok(C.formDescription === "Trump",
    "C10 the contested row's own name is NOT written over what the user typed — that would erase the very disagreement being reported");

  // ============ D. The false-positive guard: per-design naming ============
  const D = await page.evaluate((args) => {
    __setLiveDbCoinsForTest([args.row]);
    // Free-typed (NOT a controlled series value), and a genuine partial of
    // the catalog's per-design name — this must be accepted.
    eval(args.fill)({ denom: "25C", year: "2010", mint: "P", variety: "", finish: "Business Strike", description: "Grand Canyon" });
    const vis = (id) => !document.getElementById(id).classList.contains("hidden");
    const out = {
      isControlled: lookupDescriptionCandidates("25C", "2010").some(c => normField(c.series) === normField("Grand Canyon")),
      conflictFlag: currentAddCoinMatchState().descriptionConflict,
      confident: isConfidentMatch(),
      greenBannerVisible: vis("dbMatchBanner"),
      conflictBannerVisible: vis("dbDescriptionConflictBanner"),
      saveToDbDisplay: document.getElementById("saveToDatabaseBtn").style.display
    };
    __setLiveDbCoinsForTest(null);
    return out;
  }, { row: ATB_QUARTER, fill: FILL });
  ok(D.isControlled === false, "D1 \"Grand Canyon\" is genuinely free-typed here, not a controlled series value — so the gate really does evaluate it");
  ok(D.conflictFlag === false, "D2 -- and it is accepted: a per-design catalog name sharing a word with what was typed is NOT a conflict");
  ok(D.confident === true && D.greenBannerVisible === true && D.saveToDbDisplay !== "none",
    "D3 the normal confident path is completely unaffected (green banner, direct write offered)");
  ok(D.conflictBannerVisible === false, "D4 no conflict banner on a legitimate match");

  // ============ E. A deliberate pick is exempt ============
  const E = await page.evaluate((args) => {
    const second = Object.assign({}, args.row, { coinId: "C-2026--$1-02", description: "Native American Dollar" });
    __setLiveDbCoinsForTest([args.row, second]);
    eval(args.fill)({ denom: "$1", year: "2026", mint: "", variety: "", finish: "Business Strike", description: "Trump" });
    const ambiguousFirst = currentAddCoinMatchState().candidates.length;
    // Simulate the user resolving the picker onto a row their typed
    // Description contradicts. They saw the candidates (the list renders each
    // row's Description) and chose anyway — that is the strongest signal in
    // this system and must not be second-guessed.
    addCoinResolvedPick = { row: args.row, forShape: addCoinIdentityShapeKey(addCoinIdentityShape()), candidateCount: 2 };
    const state = currentAddCoinMatchState();
    const out = { ambiguousFirst, resolvedPick: state.resolvedPick, conflictFlag: state.descriptionConflict, confident: isConfidentMatch() };
    addCoinResolvedPick = null;
    __setLiveDbCoinsForTest(null);
    return out;
  }, { row: OTHER_2026_DOLLAR, fill: FILL });
  ok(E.ambiguousFirst === 2, "E1 two candidates reach the picker as before (the gate never touches the 2+ path)");
  ok(E.resolvedPick === true && E.conflictFlag === false,
    "E2 a DELIBERATE pick is exempt from the gate — the human already looked and chose");
  ok(E.confident === true, "E3 -- and confidence is restored by that pick");

  // ============ F. Save path: the CoinID is withheld, not just the button ============
  const F = await page.evaluate((args) => {
    __setLiveDbCoinsForTest([args.row]);
    eval(args.fill)({ denom: "$1", year: "2026", mint: "", variety: "", finish: "Business Strike", description: "Trump" });
    const conflicted = new Promise(res => resolveAddCoinCatalogMatch(res, () => res(null)));
    return conflicted.then(m => {
      // Control: the same coin with an agreeing Description still resolves normally.
      eval(args.fill)({ denom: "$1", year: "2026", mint: "", variety: "", finish: "Business Strike", description: "Silver Eagle" });
      return new Promise(res => resolveAddCoinCatalogMatch(res, () => res(null))).then(clean => {
        const draft = buildCoinDraft("AY-99999", { denom: "$1", year: "2026", description: "Trump", finish: "Business Strike" }, m);
        __setLiveDbCoinsForTest(null);
        return {
          how: m.how, coinId: m.coinId, flag: m.descriptionConflict,
          conflictingRow: m.conflictingRow ? m.conflictingRow.coinId : null,
          cleanHow: clean.how, cleanCoinId: clean.coinId,
          draftCoinId: draft.coinId, draftMatchedHow: draft.matchedHow, note: draft.researchNote || ""
        };
      });
    });
  }, { row: OTHER_2026_DOLLAR, fill: FILL });
  ok(F.how === "none" && F.coinId === "",
    "F1 THE POINT OF THE FIX: at save time a conflicted match resolves UNMATCHED — the contested CoinID is not attached at all");
  ok(F.flag === true && F.conflictingRow === "C-2026--$1-01",
    "F2 -- while still carrying which row was withheld, so downstream wording can be honest");
  ok(F.cleanHow === "single" && F.cleanCoinId === "C-2026--$1-01",
    "F3 control: an agreeing Description on the identical coin still resolves to the row normally");
  ok(F.draftCoinId === "" && F.draftMatchedHow === "none",
    "F4 the Staging draft therefore carries no CoinID — so Promote cannot later write the contested link into All");
  ok(/CoinID withheld at capture/.test(F.note) && /C-2026--\$1-01/.test(F.note),
    "F5 the draft's research note says a link was WITHHELD, not that no catalog row exists — different problems, different fixes");

  // ============ G. Category: the same length>1 gap, closed ============
  const G = await page.evaluate(() => {
    const LONE = {
      denom: "$1", year: 2026, mint: "", variety: "", finish: "Business Strike",
      description: "Native American Dollar", designation: "", coinId: "C-2026--$1-07",
      pcgs: "", mintage: null, gsid: "", composition: ""
    };
    __setLiveDbCoinsForTest([LONE]);
    const base = { denom: "$1", year: "2026", mint: "", variety: "", finish: "", designation: "", gradeSource: "" };
    const n = (extra) => dbCoinsCandidatesFor(Object.assign({}, base, extra)).length;
    const out = {
      noCategory:        n({}),
      hardMiss:          n({ category: "Silver Eagle" }),      // CONFIRMED wording, disagrees -> 0
      softMiss:          n({ category: "Commemorative Gold" }), // unconfirmed/collision-prone -> unchanged
      hardHit: (function () {
        __setLiveDbCoinsForTest([Object.assign({}, LONE, { description: "American Silver Eagle Dollar" })]);
        return dbCoinsCandidatesFor(Object.assign({}, base, { category: "Silver Eagle" })).length;
      })()
    };
    __setLiveDbCoinsForTest(null);
    return out;
  });
  ok(G.noCategory === 1, "G1 baseline: a lone candidate with no Category supplied is unaffected");
  ok(G.hardMiss === 0,
    "G2 a CONFIRMED hard Category disagreeing with a LONE candidate now rejects it (previously impossible — the tier never ran below 2 candidates)");
  ok(G.softMiss === 1, "G3 an unconfirmed/soft Category still never manufactures a miss, lone candidate or not");
  ok(G.hardHit === 1, "G4 -- and a hard Category that agrees still matches normally");

  // ============ H. ZERO BLAST RADIUS ============
  const H = await page.evaluate(() => {
    const LONE = {
      denom: "1C", year: 1909, mint: "S", variety: "", finish: "Business Strike",
      description: "Lincoln Wheat Cent", designation: "", coinId: "C-1909-S-1C-01",
      pcgs: "", mintage: null, gsid: "", composition: ""
    };
    __setLiveDbCoinsForTest([LONE]);
    // Browse Edit's own shape, built by the real function.
    const beShape = buildBrowseEditIdentityShape(
      { id: "AY-00001", finish: "Business Strike" },
      { Denomination: "1C", Year: "1909", MintMark: "S", Variety: "", Designation: "", GradeSource: "" }
    );
    const out = {
      beHasDescription: Object.prototype.hasOwnProperty.call(beShape, "description"),
      beHasCategory: Object.prototype.hasOwnProperty.call(beShape, "category"),
      beResult: dbCoinsCandidatesFor(beShape).length,
      // A Docket QUEUE entry's shape (docketRecheckEntry) carries neither field.
      docketEntryResult: dbCoinsCandidatesFor({
        denom: "1C", year: "1909", mint: "S", variety: "", finish: "Business Strike",
        designation: "", gradeSource: ""
      }).length,
      // Even if a conflicting free-typed Description were somehow passed in,
      // dbCoinsCandidatesFor() itself must be unchanged by this work: the
      // Description tier is still length>1-guarded and soft, so a lone
      // candidate survives. The gate lives entirely OUTSIDE the matcher.
      matcherIgnoresConflictingDescription: dbCoinsCandidatesFor({
        denom: "1C", year: "1909", mint: "S", variety: "", finish: "Business Strike",
        designation: "", gradeSource: "", description: "Trump"
      }).length
    };
    __setLiveDbCoinsForTest(null);
    return out;
  });
  ok(H.beHasDescription === false && H.beHasCategory === false,
    "H1 Browse Edit's identity shape carries neither `description` nor `category`, so neither change can reach it");
  ok(H.beResult === 1, "H2 -- and it still resolves its lone candidate exactly as before");
  ok(H.docketEntryResult === 1, "H3 a Docket queue entry's shape (no description, no category) is likewise unaffected");
  ok(H.matcherIgnoresConflictingDescription === 1,
    "H4 dbCoinsCandidatesFor() itself is unchanged for Description: a conflicting one still does NOT narrow a lone candidate — the gate is entirely outside the matcher");

  // ============ I. Negative controls ============
  const I = await page.evaluate((args) => {
    __setLiveDbCoinsForTest([args.row]);
    eval(args.fill)({ denom: "$1", year: "2026", mint: "", variety: "", finish: "Business Strike", description: "Trump" });
    const state = currentAddCoinMatchState();
    // Reproduce the PRE-FIX confidence rule verbatim.
    const oldConfident = !!state && (state.resolvedPick || state.candidates.length === 1);

    // Reproduce the PRE-FIX Category guard verbatim against a lone mismatch.
    const LONE = Object.assign({}, args.row, { description: "Native American Dollar" });
    __setLiveDbCoinsForTest([LONE]);
    let candidates = activeDbCoins().filter(c =>
      normField(c.denom) === "$1" && String(c.year) === "2026" &&
      normField(c.mint) === "" && normField(c.variety || "") === "");
    const hints = BULLION_CATEGORY_MATCH_HINTS["Silver Eagle"];
    if (candidates.length > 1) { // <- the OLD guard
      const byCategory = candidates.filter(c => hints.some(h => normField(c.description || "").indexOf(h) !== -1));
      if (byCategory.length) candidates = byCategory;
      else candidates = [];
    }
    const oldCategoryResult = candidates.length;
    __setLiveDbCoinsForTest(null);
    return { oldConfident, newConfident: isConfidentMatch(), oldCategoryResult };
  }, { row: OTHER_2026_DOLLAR, fill: FILL });
  ok(I.oldConfident === true && I.newConfident === false,
    "I1 NEGATIVE CONTROL: the pre-fix confidence rule WOULD have accepted this exact coin — proving C3/C8 exercise a real fix, not already-passing behavior");
  ok(I.oldCategoryResult === 1,
    "I2 NEGATIVE CONTROL: the pre-fix Category guard WOULD have returned the mismatched lone candidate — proving G2 is a real change");

  // ============ L. The ONE place blast radius is not zero ============
  // Flagged rather than buried. recheckCoinDraftMatch() (the Docket's
  // coin-draft Re-check) is the only non-Add-Coin caller that passes
  // `category` into dbCoinsCandidatesFor(), so removing the `length > 1`
  // guard reaches it too — a confirmed hard Category disagreeing with a lone
  // candidate now yields "still nothing found" instead of offering that
  // candidate for confirmation. That is the same direction of change as the
  // fix itself (refuse a wrong lone match rather than propose it), it can only
  // fire on a draft whose Category came from the controlled Bullion-tier
  // dropdown, and Re-check never auto-applied anyway — but it IS a behaviour
  // change outside Add Coin and is asserted here so it cannot be forgotten.
  const L = await page.evaluate(() => {
    const LONE = {
      denom: "$1", year: 2026, mint: "", variety: "", finish: "Business Strike",
      description: "Native American Dollar", designation: "", coinId: "C-2026--$1-07",
      pcgs: "", mintage: null, gsid: "", composition: ""
    };
    __setLiveDbCoinsForTest([LONE]);
    // Exactly the shape recheckCoinDraftMatch() builds from a stored draft.
    const draftShape = {
      denom: "$1", year: "2026", mint: "", variety: "", finish: "Business Strike",
      designation: "", gradeSource: "", category: "Silver Eagle"
    };
    const withHardCategory = dbCoinsCandidatesFor(draftShape).length;
    const withoutCategory = dbCoinsCandidatesFor(Object.assign({}, draftShape, { category: "" })).length;
    // The draft Re-check shape still carries no `description` — the MATCHER
    // is untouched, so nothing there can select or narrow on free text.
    const hasDescription = Object.prototype.hasOwnProperty.call(draftShape, "description");
    // But the gate now reaches the draft AFTER the matcher, as a confidence
    // check on the result. L3 is INVERTED from its original form on purpose
    // (see block M): it used to assert the gate was unreachable from here,
    // which Ray's live test on d3439a4 showed was a hole, not a boundary —
    // a withheld CoinID could be re-attached in one tap with no warning.
    const gateReachesDraft = typeof coinDraftWithheldRow === "function" &&
      !!coinDraftWithheldRow({ description: "Trump", denom: "$1", year: "2026" }, [LONE]);
    __setLiveDbCoinsForTest(null);
    return { withHardCategory, withoutCategory, hasDescription, gateReachesDraft };
  });
  ok(L.withHardCategory === 0,
    "L1 ACKNOWLEDGED, NOT ZERO: a coin-draft Re-check carrying a confirmed hard Category now rejects a disagreeing lone candidate too (was 1) — same safe direction, but a real change outside Add Coin");
  ok(L.withoutCategory === 1, "L2 -- a draft with no Category is completely unaffected, which is nearly all of them");
  ok(L.hasDescription === false,
    "L3a the MATCHER shape still carries no description — dbCoinsCandidatesFor() cannot select or narrow on free text, unchanged");
  ok(L.gateReachesDraft === true,
    "L3b INVERTED from the original L3, following a real design change: the Description gate now DOES reach a stored draft, as a post-matcher confidence check (block M)");

  // ============ K. The two recovery paths the banner promises ============
  // A refusal that cannot be undone from the form would just be a dead end.
  // The banner tells the user to clear or correct the Description; both must
  // actually restore the match, live, without re-entering the coin.
  const K = await page.evaluate((args) => {
    __setLiveDbCoinsForTest([args.row]);
    const set = (id, v) => {
      const el = document.getElementById(id);
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const vis = (id) => !document.getElementById(id).classList.contains("hidden");
    const snap = () => ({
      conflict: vis("dbDescriptionConflictBanner"),
      green: vis("dbMatchBanner"),
      btn: document.getElementById("saveToDatabaseBtn").style.display
    });
    eval(args.fill)({ denom: "$1", year: "2026", mint: "", variety: "", finish: "Business Strike", description: "Trump" });
    const conflicted = snap();
    set("description", "");            // recovery 1: clear it
    const cleared = snap();
    set("description", "Trump");       // back into conflict
    const reconflicted = snap();
    set("description", "Silver Eagle"); // recovery 2: correct it to agree
    const corrected = snap();
    __setLiveDbCoinsForTest(null);
    return { conflicted, cleared, reconflicted, corrected };
  }, { row: OTHER_2026_DOLLAR, fill: FILL });
  ok(K.conflicted.conflict === true && K.conflicted.green === false, "K1 starts in the refused state");
  ok(K.cleared.conflict === false && K.cleared.green === true && K.cleared.btn !== "none",
    "K2 clearing the Description restores the match and the direct-write button, live");
  ok(K.reconflicted.conflict === true && K.reconflicted.green === false,
    "K3 -- and re-typing the conflicting value refuses again (the gate is live, not one-shot)");
  ok(K.corrected.conflict === false && K.corrected.green === true && K.corrected.btn !== "none",
    "K4 correcting the Description to one that agrees also restores it");

  // ============ M. The gate on Re-check (live finding on d3439a4) ============
  // Ray's live test: staged draft AY-00724 (2026, Description "Trump", CoinID
  // deliberately WITHHELD for C-2026--$1-01) offered, on one tap of Re-check,
  // "One match found: DB_Coins now has a match" with a Link CoinID button and
  // no warning at all. Two separate defects in that:
  //
  //   1. The gate never ran. isDescriptionConsistentWithMatch() read the live
  //      form, so it was structurally unreachable from a stored draft — the
  //      withheld link was one tap from being re-attached, defeating the Part
  //      B decision (withhold the CoinID, not just the button).
  //   2. "now has a match" is false for a withheld row. Nothing appeared; the
  //      row was always there and was deliberately not trusted.
  //
  // Not academic: applyCoinDraftMatch() writes the CoinID onto a real All row
  // via writeCoinIdCell() when the draft is force-added, and flips it to
  // PROMOTED. AY-00724 wasn't, so it stopped at the JSON — the same tap on a
  // force-added draft reaches the sheet.
  // type/status use the app's OWN constant values, not plausible-looking
  // stand-ins: listCoinDrafts() filters on `type === COIN_DRAFT_TYPE` and the
  // Docket/Staging-Review splits branch on the exact status strings, so a
  // fixture that merely looks right is silently invisible to both. (A first
  // version of this block used "coin-draft"/"Draft" and passed anyway,
  // because recheckCoinDraftMatch() is handed the object directly — the
  // note-site block N is what caught it.)
  const WITHHELD_DRAFT = {
    collectionID: "AY-00724", type: "coin", version: 1,
    status: "Draft — awaiting review",
    denom: "$1", year: "2026", mint: "", variety: "", description: "Trump",
    finish: "Business Strike", designation: "", gradeSource: "", category: "",
    coinId: "", matchedHow: "none", allRowWritten: false, forceAdded: false,
    researchNote: "CoinID withheld at capture", photos: [], receiptPhoto: ""
  };

  await page.evaluate(() => {
    window.__mSetup = async () => {
      const mock = createMockGraphClient({ sheets: { All: [["CollectionID", "CoinID"]] } });
      __setGraphClientForTest(mock);
      __setAddCoinWriteEnabledForTest(true);
      __resetAllHeaderMapForTest();
      return mock;
    };
    window.__mTeardown = () => {
      __setLiveDbCoinsForTest(null);
      __setAddCoinWriteEnabledForTest(null);
      __setGraphClientForTest(null);
      __resetAllHeaderMapForTest();
      document.getElementById("writeGuardOverlay").classList.add("hidden");
    };
    // The guard dialog as the user sees it: title, body text, button labels,
    // and which button carries the gold `primary` styling.
    window.__guard = () => {
      const btns = Array.from(document.querySelectorAll("#writeGuardBtns button"));
      return {
        open: !document.getElementById("writeGuardOverlay").classList.contains("hidden"),
        title: document.getElementById("writeGuardTitle").textContent,
        body: document.getElementById("writeGuardBody").textContent,
        labels: btns.map(b => b.textContent),
        primary: (btns.find(b => b.style.fontWeight === "700") || {}).textContent || null
      };
    };
    // Null-safe on purpose. A NEGATIVE CONTROL that removes the reframed
    // dialog also removes its "Link anyway" button — and a throw here would
    // abort the whole evaluate and take every later assertion with it, so
    // the control would hide behind a crashed suite instead of failing by
    // name. Same lesson this project has already recorded twice.
    window.__clickGuard = (label) => {
      const b = Array.from(document.querySelectorAll("#writeGuardBtns button"))
        .find(x => x.textContent === label);
      if (!b) return false;
      b.click();
      return true;
    };
  });

  // --- M1-M5: a withheld draft gets the reframed dialog, and Cancel writes nothing.
  const M = await page.evaluate(async ({ draft, row }) => {
    const mock = await __mSetup();
    __setLiveDbCoinsForTest([row]);
    await mock.uploadJson(coinDraftPath(draft.collectionID), draft);
    await recheckCoinDraftMatch(draft);
    const dlg = __guard();
    __clickGuard("Cancel");
    await new Promise(r => setTimeout(r, 60));
    const after = await mock.getJson(coinDraftPath(draft.collectionID));
    const closed = document.getElementById("writeGuardOverlay").classList.contains("hidden");
    __mTeardown();
    return { dlg, closed, coinId: after.coinId, matchedHow: after.matchedHow, status: after.status };
  }, { draft: WITHHELD_DRAFT, row: OTHER_2026_DOLLAR });

  ok(M.dlg.open === true && M.dlg.title === "One possible match — may not be this coin",
    "M1 a withheld draft's Re-check opens the REFRAMED dialog, not 'One match found': " + JSON.stringify(M.dlg.title));
  ok(M.dlg.body.indexOf("now has a match") === -1,
    "M2 -- and never claims DB_Coins 'now has a match' for a row that was always there");
  ok(M.dlg.body.indexOf("Trump") !== -1 && M.dlg.body.indexOf("American Silver Eagle Dollar") !== -1 &&
     M.dlg.body.indexOf("withheld at capture") !== -1,
    "M3 the body states the conflict plainly: both Descriptions named, and why the CoinID was withheld");
  ok(M.dlg.labels.join("|") === "Cancel|Link anyway" && M.dlg.primary === "Cancel",
    "M4 Cancel is first AND carries the primary styling; the write is demoted to 'Link anyway': " + JSON.stringify(M.dlg));
  // Tied to the reframed title deliberately. "Cancel writes nothing" is true
  // of the PRE-FIX dialog too, so on its own this would be an assertion whose
  // broken case also returns the passing value — the trap this project has
  // hit several times. Asserting it cancelled the REFRAMED dialog is what
  // makes it discriminate.
  ok(M.dlg.title === "One possible match — may not be this coin" &&
     M.coinId === "" && M.matchedHow === "none" &&
     M.status === "Draft — awaiting review" && M.closed === true,
    "M5 cancelling the REFRAMED dialog writes absolutely nothing — CoinID still withheld, matchedHow and status untouched");

  // --- M6: "Link anyway" is a real, working override. The gate's job is to stop
  // a SILENT link, not to forbid an informed one — the row may genuinely be
  // right with a Description that merely reads oddly, and the deliberate click
  // is the confirmation (same rule the 2+ picker works by).
  const M6 = await page.evaluate(async ({ draft, row }) => {
    const mock = await __mSetup();
    __setLiveDbCoinsForTest([row]);
    await mock.uploadJson(coinDraftPath(draft.collectionID), draft);
    await recheckCoinDraftMatch(draft);
    const clicked = __clickGuard("Link anyway");
    await new Promise(r => setTimeout(r, 120));
    const after = await mock.getJson(coinDraftPath(draft.collectionID));
    __mTeardown();
    return { clicked, coinId: after.coinId, matchedHow: after.matchedHow };
  }, { draft: WITHHELD_DRAFT, row: OTHER_2026_DOLLAR });
  ok(M6.clicked === true && M6.coinId === "C-2026--$1-01" && M6.matchedHow === "recheck",
    "M6 'Link anyway' still performs the real link — an informed override, not a dead end: " + JSON.stringify(M6));

  // --- M7-M8: a draft whose Description AGREES is completely unaffected.
  const M7 = await page.evaluate(async ({ draft, row }) => {
    const mock = await __mSetup();
    __setLiveDbCoinsForTest([row]);
    const agreeing = Object.assign({}, draft, { description: "Silver Eagle" });
    await mock.uploadJson(coinDraftPath(agreeing.collectionID), agreeing);
    await recheckCoinDraftMatch(agreeing);
    const dlg = __guard();
    __clickGuard("Link CoinID");
    await new Promise(r => setTimeout(r, 120));
    const after = await mock.getJson(coinDraftPath(agreeing.collectionID));
    __mTeardown();
    return { dlg, coinId: after.coinId };
  }, { draft: WITHHELD_DRAFT, row: OTHER_2026_DOLLAR });
  ok(M7.dlg.title === "One match found" && M7.dlg.labels.join("|") === "Cancel|Link CoinID" &&
     M7.dlg.primary === "Link CoinID",
    "M7 an AGREEING draft keeps the original dialog, wording and primary button verbatim: " + JSON.stringify(M7.dlg));
  ok(M7.coinId === "C-2026--$1-01", "M8 -- and still links on one tap, unchanged");

  // --- M9: the 2+ ambiguous branch is deliberately NOT gated. A deliberate pick
  // from a list that renders each row's own Description IS the confirmation —
  // the same exemption the Add Coin path makes (block D).
  const M9 = await page.evaluate(async ({ draft, row }) => {
    const mock = await __mSetup();
    const second = Object.assign({}, row, { coinId: "C-2026--$1-09", variety: "" });
    __setLiveDbCoinsForTest([row, second]);
    await mock.uploadJson(coinDraftPath(draft.collectionID), draft);
    await recheckCoinDraftMatch(draft);
    const out = {
      picker: !document.getElementById("docketMatchOverlay").classList.contains("hidden"),
      guard: !document.getElementById("writeGuardOverlay").classList.contains("hidden")
    };
    document.getElementById("docketMatchOverlay").classList.add("hidden");
    __mTeardown();
    return out;
  }, { draft: WITHHELD_DRAFT, row: OTHER_2026_DOLLAR });
  ok(M9.picker === true && M9.guard === false,
    "M9 2+ candidates still go straight to the shared picker, ungated — the deliberate pick is the confirmation");

  // --- M10: a genuine zero-candidate draft is unchanged (toast, no dialog).
  const M10 = await page.evaluate(async ({ draft }) => {
    const mock = await __mSetup();
    __setLiveDbCoinsForTest([]);
    await mock.uploadJson(coinDraftPath(draft.collectionID), draft);
    await recheckCoinDraftMatch(draft);
    const out = { guard: !document.getElementById("writeGuardOverlay").classList.contains("hidden") };
    __mTeardown();
    return out;
  }, { draft: WITHHELD_DRAFT });
  ok(M10.guard === false, "M10 a genuine catalog gap still just says so — no dialog, nothing to confirm");

  // --- M11-M12: NEGATIVE CONTROL. Reproduce the pre-fix branch verbatim against
  // the identical draft + catalog and confirm it WOULD have offered the one-tap
  // link with no warning — i.e. the exact reported bug — proving M1-M5 exercise
  // a real fix rather than already-passing behaviour.
  const MNEG = await page.evaluate(({ draft, row }) => {
    __setLiveDbCoinsForTest([row]);
    const candidates = dbCoinsCandidatesFor({
      denom: draft.denom, year: draft.year, mint: draft.mint, variety: draft.variety,
      finish: draft.finish, designation: draft.designation,
      gradeSource: draft.gradeSource, category: draft.category
    });
    // The pre-fix branch had no gate at all: lone candidate -> offer the link.
    const oldWouldOfferLink = candidates.length === 1;
    const oldTitle = "One match found";
    // The fix's own signal, same inputs.
    const nowWithheld = !!coinDraftWithheldRow(draft, candidates);
    __setLiveDbCoinsForTest(null);
    return { oldWouldOfferLink, oldTitle, nowWithheld, n: candidates.length };
  }, { draft: WITHHELD_DRAFT, row: OTHER_2026_DOLLAR });
  ok(MNEG.n === 1 && MNEG.oldWouldOfferLink === true && MNEG.oldTitle === "One match found",
    "M11 NEGATIVE CONTROL: the pre-fix branch WOULD have offered the one-tap link under 'One match found' for this exact draft");
  ok(MNEG.nowWithheld === true,
    "M12 -- while the fix's own signal flags the same inputs as withheld, so M1-M5 are not vacuous");

  // ============ N. The three "no DB_Coins match" notes (same pass, own commit) ============
  // Three strings all told the user "no DB_Coins match yet" for a draft whose
  // CoinID was WITHHELD rather than missing. A row does exist; it was
  // distrusted. Telling someone to research a catalog gap that isn't there
  // sends them to fix the wrong thing — the same class of misdirection as the
  // "now has a match" dialog wording above, three rungs further out.
  //   app.html Docket / Staging section      (stagedCoins.forEach)
  //   app.html Docket / Research section     (stagedHandedOff.forEach)
  //   app.html Staging Review pending note   (buildStagingRowEl)
  const N = await page.evaluate(async ({ draft, row }) => {
    const out = {};
    // --- Staging Review's own pending note, driven through the real render.
    let mock = await __mSetup();
    __setLiveDbCoinsForTest([row]);
    await mock.uploadJson(coinDraftPath(draft.collectionID), draft);
    await renderStagingList();
    await new Promise(r => setTimeout(r, 200));
    const item = document.querySelector("#stagingContainer .wish-item");
    out.stagingNote = item ? (item.querySelector(".staging-pending-flag") || {}).textContent || "" : "";
    out.stagingMarkReady = item ? !item.querySelector(".promote").disabled : null;
    // --- and with an EMPTY catalog, i.e. a genuine gap: unchanged wording.
    __setLiveDbCoinsForTest([]);
    await renderStagingList();
    await new Promise(r => setTimeout(r, 200));
    const gapItem = document.querySelector("#stagingContainer .wish-item");
    out.stagingGapNote = gapItem ? (gapItem.querySelector(".staging-pending-flag") || {}).textContent || "" : "";

    // --- Docket Staging section (draft still in Draft status).
    __setLiveDbCoinsForTest([row]);
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 250));
    out.docketStaging = (document.getElementById("docketStagingContainer") || {}).textContent || "";

    // --- Docket Research section (same draft marked READY, still no CoinID).
    const ready = Object.assign({}, draft, { status: "Ready for reconciliation" });
    await mock.uploadJson(coinDraftPath(ready.collectionID), ready);
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 250));
    out.docketResearch = (document.getElementById("docketResearchContainer") || {}).textContent || "";

    // --- Research section for a GENUINE gap: unchanged wording.
    __setLiveDbCoinsForTest([]);
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 250));
    out.docketResearchGap = (document.getElementById("docketResearchContainer") || {}).textContent || "";

    __mTeardown();
    return out;
  }, { draft: WITHHELD_DRAFT, row: OTHER_2026_DOLLAR });

  ok(N.stagingNote.indexOf("withheld") !== -1 &&
     N.stagingNote.indexOf("American Silver Eagle Dollar") !== -1 &&
     N.stagingNote.indexOf("no DB_Coins match yet") === -1,
    "N1 Staging Review's pending note says the CoinID was WITHHELD and names the row, instead of 'no DB_Coins match yet': " + JSON.stringify(N.stagingNote.slice(0, 140)));
  ok(N.stagingMarkReady === true,
    "N2 -- and Mark ready stays enabled: this is a wording fix, not a new hard gate");
  ok(N.stagingGapNote.indexOf("no DB_Coins match yet") !== -1 &&
     N.stagingGapNote.indexOf("withheld") === -1,
    "N3 a GENUINE catalog gap keeps the original wording verbatim: " + JSON.stringify(N.stagingGapNote.slice(0, 90)));
  ok(N.docketStaging.indexOf("withheld") !== -1 &&
     N.docketStaging.indexOf("no DB_Coins match yet") === -1,
    "N4 the Docket's Staging-section note says withheld too: " + JSON.stringify(N.docketStaging.slice(0, 160)));
  ok(N.docketResearch.indexOf("withheld") !== -1 &&
     N.docketResearch.indexOf("research the catalog gap") === -1,
    "N5 the Docket's Research-section note stops telling the user to research a gap that isn't there: " + JSON.stringify(N.docketResearch.slice(0, 180)));
  ok(N.docketResearchGap.indexOf("research the catalog gap") !== -1 &&
     N.docketResearchGap.indexOf("withheld") === -1,
    "N6 -- while a genuine gap still reads exactly as before: " + JSON.stringify(N.docketResearchGap.slice(0, 120)));

  // NEGATIVE CONTROL for the note sites: the shared signal they all read must
  // actually distinguish the two cases, or all six assertions above would be
  // reporting on wording alone.
  const NNEG = await page.evaluate(({ draft, row }) => {
    __setLiveDbCoinsForTest([row]);
    const conflicting = coinDraftWithheldRowFor(draft);
    __setLiveDbCoinsForTest([]);
    const genuineGap = coinDraftWithheldRowFor(draft);
    __setLiveDbCoinsForTest([row]);
    const alreadyLinked = coinDraftWithheldRowFor(Object.assign({}, draft, { coinId: "C-X" }));
    const notADraft = coinDraftWithheldRowFor({ description: "Trump" });
    __setLiveDbCoinsForTest(null);
    return {
      conflicting: conflicting && conflicting.coinId,
      genuineGap, alreadyLinked, notADraft
    };
  }, { draft: WITHHELD_DRAFT, row: OTHER_2026_DOLLAR });
  ok(NNEG.conflicting === "C-2026--$1-01", "N7 the shared signal returns the conflicting row for a withheld draft");
  ok(NNEG.genuineGap === null, "N8 -- null for a genuine catalog gap, so the old wording still shows");
  ok(NNEG.alreadyLinked === null, "N9 -- null for a draft that already has a CoinID (nothing to report)");
  ok(NNEG.notADraft === null, "N10 -- and null, not a throw, for an object that isn't a real draft");

  // ============ O. Force Add's route, named correctly (own commit) ============
  // Ray went looking for Force Add on the Staging Review card after this copy
  // promised it "from there". It isn't on that card and shouldn't be: Force
  // Add renders only in the Docket's Research section, which a draft reaches
  // by being marked ready (stagedHandedOff = READY && no CoinID). Mark ready
  // is a real decision point and Force Add writes a real All row, so a
  // Draft-status card is the wrong place to offer it. Copy fix, no new button.
  const O = await page.evaluate(({ row, fill }) => {
    __setLiveDbCoinsForTest([row]);
    eval(fill)({ denom: "$1", year: "2026", mint: "", variety: "", finish: "Business Strike", description: "Trump" });
    const conflictMsg = document.getElementById("saveNotConfidentMsg").textContent;
    // The genuine-miss branch of the same message, for the second copy site.
    __setLiveDbCoinsForTest([]);
    eval(fill)({ denom: "$1", year: "2026", mint: "", variety: "", finish: "Business Strike", description: "Trump" });
    const gapMsg = document.getElementById("saveNotConfidentMsg").textContent;
    __setLiveDbCoinsForTest(null);
    return { conflictMsg, gapMsg };
  }, { row: OTHER_2026_DOLLAR, fill: FILL });

  ok(/Mark ready/.test(O.conflictMsg) && /Force Add/.test(O.conflictMsg) &&
     !/Force Added from there/.test(O.conflictMsg),
    "O1 the conflict message names the real route (Mark ready, then Force Add from the Docket): " + JSON.stringify(O.conflictMsg.slice(-130)));
  ok(/Mark ready/.test(O.gapMsg) && /from the Docket/.test(O.gapMsg),
    "O2 -- and so does the genuine-miss message: " + JSON.stringify(O.gapMsg.slice(-110)));

  // Force Add is still rendered in exactly ONE place, and only for a READY
  // draft with no CoinID. Asserted on the real source so a future change
  // can't quietly move it onto a Draft-status card without a test noticing.
  const src = require("fs").readFileSync(
    require("path").join(__dirname, "..", "app.html"), "utf8");
  const O3 = {
    forceAddSites: (src.match(/onForceAdd:/g) || []).length,
    gatedOnHandedOff: /stagedHandedOff = all\.filter\(d => d\.status === COIN_DRAFT_STATUS\.READY && !d\.coinId\)/.test(src),
    noneOnStagingReview: !/staging-forceadd/.test(src)
  };
  ok(O3.forceAddSites === 1, "O3 Force Add is wired at exactly one call site (the Docket's Research rows): " + O3.forceAddSites);
  ok(O3.gatedOnHandedOff === true, "O4 -- reached only once a draft is READY with no CoinID, which is why Mark ready comes first");
  ok(O3.noneOnStagingReview === true, "O5 -- and no Force Add button exists on the Staging Review card, as intended");

  // ============ J. Nav / overflow smoke ============
  const J = await page.evaluate(() => {
    const routes = ["dashboard", "browse", "albums", "wishlist", "stats", "acquisitions", "needsdbcoins", "addcoin"];
    let threw = null;
    try { routes.forEach(r => navigate(r)); navigate("dashboard"); } catch (e) { threw = String(e); }
    return { threw, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(J.threw === null, "J1 every top-level route still navigates without throwing");
  ok(J.overflow === false, "J2 no horizontal page overflow at phone width");
}, module);
