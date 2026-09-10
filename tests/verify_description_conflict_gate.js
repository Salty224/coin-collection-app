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
    // And the draft Re-check shape carries no `description`, by design — so
    // the Description gate is genuinely unreachable from there.
    const hasDescription = Object.prototype.hasOwnProperty.call(draftShape, "description");
    __setLiveDbCoinsForTest(null);
    return { withHardCategory, withoutCategory, hasDescription };
  });
  ok(L.withHardCategory === 0,
    "L1 ACKNOWLEDGED, NOT ZERO: a coin-draft Re-check carrying a confirmed hard Category now rejects a disagreeing lone candidate too (was 1) — same safe direction, but a real change outside Add Coin");
  ok(L.withoutCategory === 1, "L2 -- a draft with no Category is completely unaffected, which is nearly all of them");
  ok(L.hasDescription === false, "L3 the Description gate remains genuinely unreachable from the draft Re-check path");

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
