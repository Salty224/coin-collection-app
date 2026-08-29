// Composition as a real matcher input, and on the saved coin's flip card.
//
// Two related pieces, both from Copilot's 2026-08-29 composition research
// (109 true Clad/Silver Proof pairs, 99 of them colliding on the matcher's
// own Year+Denom+MintMark+Variety key) plus a live-testing observation that
// the flip card's bottom-right corner was unused:
//
//   1. DB_Coins.Composition is now mapped and narrows dbCoinsCandidatesFor()
//      as the one HARD tier — a supplied Composition that matches no row
//      returns No Match rather than silently linking to a
//      different-composition row. With Composition unknown, candidates that
//      differ only by it stay ambiguous and reach the shared picker, which
//      now shows Composition as the differentiator.
//   2. applyFlipCorners() writes a precious-metal coin's Composition into the
//      BR corner (Browse detail + Spotlight; Add Coin deliberately excluded).
//
// See CLAUDE.md "Composition: a real matcher input + flip-card display".

const { defineSuite } = require("./harness");

// A synthetic Clad/Silver Proof pair — identical on every field the matcher
// reads and the picker displays except Composition. This is the exact shape
// of the 99 real colliding pairs.
const PAIR = [
  { denom: "10C", year: 1998, mint: "S", variety: "", description: "Roosevelt Dime",
    finish: "Proof", designation: "", gsid: "", pcgs: "5397", mintage: 2086507,
    coinId: "C-TEST-CLAD", composition: "Copper-Nickel Clad" },
  { denom: "10C", year: 1998, mint: "S", variety: "", description: "Roosevelt Dime",
    finish: "Proof", designation: "", gsid: "", pcgs: "5398", mintage: 878792,
    coinId: "C-TEST-SILVER", composition: "90% Silver" }
];

module.exports = defineSuite("composition", async ({ ok, openApp, PHONE, TABLET }) => {
  const page = await openApp(PHONE);

  // ---------------------------------------------------------------- A. Mapper
  const A = await page.evaluate(() => ({
    real: mapWorkbookRowToDbCoin({ "Composition": "90% Silver" }).composition,
    blank: mapWorkbookRowToDbCoin({}).composition,
    blankType: typeof mapWorkbookRowToDbCoin({}).composition
  }));
  ok(A.real === "90% Silver", "A1 mapWorkbookRowToDbCoin() reads DB_Coins.Composition (it read nothing before this pass)");
  ok(A.blank === "" && A.blankType === "string", "A2 a row with no Composition maps to a blank string, not undefined");

  // ------------------------------------------------------- B. normComposition
  const B = await page.evaluate(() => ({
    caseTrim: normComposition("  90% silver ") === normComposition("90% Silver"),
    punct: normComposition("90% Silver, 10% Copper") === normComposition("90% Silver,10% Copper"),
    slash: normComposition("Copper/Nickel") === normComposition("Copper Nickel"),
    distinctPurity: normComposition(".999 Fine Silver") !== normComposition("99.9% Silver"),
    distinctMetal: normComposition("90% Silver") !== normComposition("90% Gold"),
    blank: normComposition("") === "" && normComposition(undefined) === ""
  }));
  ok(B.caseTrim, "B1 normalizes case and surrounding whitespace");
  ok(B.punct, "B2 collapses separator punctuation/whitespace ('90% Silver, 10% Copper' == '90% Silver,10% Copper')");
  ok(B.slash, "B3 treats a slash separator the same as a space");
  ok(B.distinctPurity, "B4 Q2: does NOT canonicalize across wordings — '.999 Fine Silver' stays distinct from '99.9% Silver'");
  ok(B.distinctMetal, "B5 different metals at the same purity stay distinct");
  ok(B.blank, "B6 blank/undefined normalize to '' without throwing");

  // ------------------------------------------- C. The hard tier (the real fix)
  const C = await page.evaluate((pair) => {
    __setLiveDbCoinsForTest(pair);
    const base = { denom: "10C", year: 1998, mint: "S", variety: "" };
    const ids = s => dbCoinsCandidatesFor(s).map(c => c.coinId);
    const out = {
      silver: ids(Object.assign({}, base, { composition: "90% Silver" })),
      clad: ids(Object.assign({}, base, { composition: "Copper-Nickel Clad" })),
      lowercase: ids(Object.assign({}, base, { composition: "90% silver" })),
      absent: ids(Object.assign({}, base, { composition: "40% Silver" }))
    };
    // Single-candidate contradiction: one row only, wrong composition supplied.
    __setLiveDbCoinsForTest([pair[0]]);
    out.singleContradicted = ids(Object.assign({}, base, { composition: "90% Silver" }));
    out.singleAgreeing = ids(Object.assign({}, base, { composition: "Copper-Nickel Clad" }));
    __setLiveDbCoinsForTest(null);
    return out;
  }, PAIR);
  ok(C.silver.length === 1 && C.silver[0] === "C-TEST-SILVER",
    "C1 a supplied Composition of '90% Silver' resolves to the silver row alone");
  ok(C.clad.length === 1 && C.clad[0] === "C-TEST-CLAD",
    "C2 '-- and 'Copper-Nickel Clad' resolves to the clad row alone");
  ok(C.lowercase.length === 1 && C.lowercase[0] === "C-TEST-SILVER",
    "C3 matching is normalized, not literal (lowercase input still matches)");
  ok(C.absent.length === 0,
    "C4 THE BUG FIX: a Composition no row carries returns No Match — never a silent fall back to a different-composition row");
  ok(C.singleContradicted.length === 0,
    "C5 the hard tier is NOT guarded by candidates.length > 1: a lone candidate whose Composition contradicts is still the wrong row");
  ok(C.singleAgreeing.length === 1,
    "C6 -- while a lone candidate whose Composition agrees still resolves");

  // ------------------------------------------- D. No-op when nothing supplies it
  const D = await page.evaluate((pair) => {
    __setLiveDbCoinsForTest(pair);
    const base = { denom: "10C", year: 1998, mint: "S", variety: "" };
    const noKey = dbCoinsCandidatesFor(base).length;                                  // Browse Edit / Docket shape
    const emptyStr = dbCoinsCandidatesFor(Object.assign({}, base, { composition: "" })).length;
    const blanky = dbCoinsCandidatesFor(Object.assign({}, base, { composition: "   " })).length;
    __setLiveDbCoinsForTest(null);
    return { noKey, emptyStr, blanky };
  }, PAIR);
  ok(D.noKey === 2, "D1 a shape with no `composition` key at all is a true no-op — Browse Edit and the Docket are unaffected");
  ok(D.emptyStr === 2 && D.blanky === 2, "D2 an empty/whitespace Composition is also a no-op, not a filter to zero");

  // --------------------------------------- E. Ambiguous path (Q3: no silent pick)
  const E = await page.evaluate(() => {
    // The committed FAKE_DB_COINS pair, so this holds with live data off.
    const cands = dbCoinsCandidatesFor({ denom: "10C", year: 1999, mint: "S", variety: "" });
    const displayed = c => [c.year + "-" + c.mint, c.denom, c.description, c.finish, c.variety, c.designation].join("|");
    return {
      count: cands.length,
      ids: cands.map(c => c.coinId),
      identicalOnEverythingElse: cands.length === 2 && displayed(cands[0]) === displayed(cands[1]),
      compositionsDiffer: cands.length === 2 && cands[0].composition !== cands[1].composition,
      compositions: cands.map(c => c.composition)
    };
  });
  ok(E.count === 2, "E1 Composition unknown + 2 rows differing only by it => 2 candidates (ambiguous), no silent preference of any kind");
  ok(E.identicalOnEverythingElse, "E2 those 2 candidates are identical on every OTHER field the picker displays — Composition is the only differentiator");
  ok(E.compositionsDiffer && E.compositions.includes("90% Silver"), "E3 -- and their Compositions genuinely differ");

  // ------------------------------------ F. The picker actually surfaces it
  const F = await page.evaluate(() => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const rows = dbCoinsCandidatesFor({ denom: "10C", year: 1999, mint: "S", variety: "" });
    renderAmbiguousMatchList(host, rows, () => {});
    const cards = Array.from(host.querySelectorAll(".ambiguous-match"));
    const texts = cards.map(c => c.textContent);
    const out = {
      cardCount: cards.length,
      showsSilver: texts.some(t => t.indexOf("90% Silver") !== -1),
      showsClad: texts.some(t => t.indexOf("Copper-Nickel Clad") !== -1),
      distinguishable: cards.length === 2 && texts[0] !== texts[1],
      // Composition must lead the detail line, ahead of PCGS#.
      compositionLeadsDetail: texts.every(t => {
        const ci = t.indexOf("Silver") === -1 ? t.indexOf("Clad") : t.indexOf("Silver");
        return ci !== -1 && ci < t.indexOf("PCGS#");
      })
    };
    host.remove();
    return out;
  });
  ok(F.cardCount === 2, "F1 the shared ambiguous picker renders both candidates");
  ok(F.showsSilver && F.showsClad, "F2 each card shows its own Composition");
  ok(F.distinguishable, "F3 the two cards are no longer textually identical (the Part-F 'nothing to choose between' bug)");
  ok(F.compositionLeadsDetail, "F4 Composition leads the detail line, ahead of PCGS#/GSID/Mintage");

  // ------------------------------------------ G. Precious-metal detection (item 2)
  const G = await page.evaluate(() => {
    const q = isPreciousMetalComposition;
    return {
      gold: q("90% Gold"), silver: q("90% Silver"), plat: q("99.95% Platinum"),
      pall: q(".9995 Fine Palladium"),
      clad: q("Copper-Nickel Clad"), bronze: q("Bronze"), zinc: q("Copper-Plated Zinc"),
      blank: q("") || q(undefined),
      // Palladium is bucketed under "Other" in Lookup_MetalContent, so the
      // category path structurally cannot see it — this is why detection
      // reads the composition string.
      palladiumCategoryIsOther: METAL_CATEGORIES.indexOf("Palladium") === -1
    };
  });
  ok(G.gold && G.silver && G.plat, "G1 gold/silver/platinum compositions qualify as precious metal");
  ok(G.pall, "G2 palladium qualifies too — the reason detection reads the composition string, not metalCategoryFor()");
  ok(G.palladiumCategoryIsOther, "G3 -- confirmed: Palladium is not a MetalCategory bucket, so the category path could not have caught it");
  ok(!G.clad && !G.bronze && !G.zinc, "G4 clad/bronze/zinc do not qualify");
  ok(!G.blank, "G5 blank/undefined does not qualify and does not throw");

  const H = await page.evaluate(() => {
    const byId = id => FAKE_COINS.find(c => c.id === id);
    const f = preciousMetalCompositionFor;
    return {
      silverCoin: f(byId("AY-00001")),          // Morgan Dollar, 90% Silver
      cladCoin: f(byId("AY-00013")),            // Roosevelt Dime, clad
      roll: f(byId("AY-00023")),                // silver roll — included
      set: f(byId("AY-00018")),                 // Denomination="Multiple" — excluded
      unresolved: f({ id: "AY-99999", denom: "10C" }),   // no composition, no category
      liveWins: f({ id: "AY-00013", denom: "10C", composition: "90% Silver" }),
      categoryFallback: f({ id: "AY-99999", denom: "$1", metalCategory: "Gold" }),
      categoryFallbackClad: f({ id: "AY-99999", denom: "25C", metalCategory: "Clad" })
    };
  });
  ok(H.silverCoin === "90% Silver", "H1 a silver coin returns its fineness/percentage string");
  ok(H.cladCoin === "", "H2 a clad coin returns '' — no corner text for a non-precious-metal coin");
  ok(H.roll === "90% Silver", "H3 a Roll is included (melt value is exactly why composition matters there)");
  ok(H.set === "", "H4 a Set bundle (Denomination='Multiple') is excluded — no single composition to state");
  ok(H.unresolved === "", "H5 Q5: a coin with no composition and no category shows nothing, silently, with no fallback");
  ok(H.liveWins === "90% Silver", "H6 a live coin's own joined composition wins over the FAKE_METAL_CONTENT mockup");
  ok(H.categoryFallback === "Gold", "H7 Q6 fallback: no composition string but a precious MetalCategory shows the bare metal name");
  ok(H.categoryFallbackClad === "", "H8 -- and the fallback does not fire for a non-precious category");

  // ------------------------------------------------- I. The flip card itself
  // BR now stacks a value/metal split across two lines (renderCornerLines(),
  // same mechanism TL/TR already use) rather than one reduced line — see
  // splitCompositionForStacking()'s own comment for the measured collision-
  // risk reasoning against a long "Details" grade in BL. .textContent
  // concatenates the two .corner-line children with no separator ("90%" +
  // "Silver" = "90%Silver"), so these checks read the lines themselves.
  const I = await page.evaluate(() => {
    const brExists = !!document.getElementById("browseDetailBR");
    const spotExists = !!document.getElementById("spotlightBR");
    navigate("browse");
    showBrowseDetail(FAKE_COINS.find(c => c.id === "AY-00001"));
    const silverLines = Array.from(document.getElementById("browseDetailBR").querySelectorAll(".corner-line")).map(el => el.textContent);
    const sr = document.getElementById("browseDetailSR").textContent;
    showBrowseDetail(FAKE_COINS.find(c => c.id === "AY-00013"));
    const clad = document.getElementById("browseDetailBR").textContent;
    const cladSr = document.getElementById("browseDetailSR").textContent;
    showBrowseDetail(FAKE_COINS.find(c => c.id === "AY-00018"));
    const set = document.getElementById("browseDetailBR").textContent;
    return {
      brExists, spotExists, silverLines, clad, set,
      srHasComposition: sr.indexOf("composition 90% Silver") !== -1,
      cladSrHasNoComposition: cladSr.indexOf("composition") === -1,
      brAriaHidden: document.getElementById("browseDetailBR").getAttribute("aria-hidden") === "true"
    };
  });
  ok(I.brExists, "I1 browseDetailBR exists (there was no BR span on this frame at all before this pass)");
  ok(I.spotExists, "I2 spotlightBR exists — Spotlight shares applyFlipCorners(), so it gets the same corner");
  ok(JSON.stringify(I.silverLines) === JSON.stringify(["90%", "Silver"]),
    "I3 Browse detail's BR corner stacks a silver coin's composition as value/metal lines: " + I.silverLines.join(" / "));
  ok(I.clad === "", "I4 -- and stays empty for a clad coin");
  ok(I.set === "", "I5 -- and stays empty for a Set bundle");
  ok(I.brAriaHidden, "I6 the BR span is aria-hidden like every other flip label");
  ok(I.srHasComposition, "I7 composition rides into the sr-only summary, since the visible corner is aria-hidden");
  ok(I.cladSrHasNoComposition, "I8 -- and is omitted there for a coin that doesn't qualify");

  // Spotlight uses the same renderer; drive it directly rather than waiting
  // out the carousel's own timer.
  const J = await page.evaluate(() => {
    applyFlipCorners("spotlight", FAKE_COINS.find(c => c.id === "AY-00001"));
    const silverLines = Array.from(document.getElementById("spotlightBR").querySelectorAll(".corner-line")).map(el => el.textContent);
    applyFlipCorners("spotlight", FAKE_COINS.find(c => c.id === "AY-00013"));
    return { silverLines, clad: document.getElementById("spotlightBR").textContent };
  });
  ok(JSON.stringify(J.silverLines) === JSON.stringify(["90%", "Silver"]) && J.clad === "",
    "J1 Spotlight's BR corner behaves identically (one shared render path)");

  // applyFlipCorners() must actually STACK/FIT the text, not just write it
  // raw. Asserted through the real render path rather than by calling
  // setCompositionCornerText() directly — otherwise the suite would still
  // pass if applyFlipCorners() stopped using it and went back to plain
  // textContent, the exact "green suite hiding a real bug" trap this
  // project has hit before (see CLAUDE.md's visibility-gap note).
  const JF = await page.evaluate(() => {
    const mk = composition => ({ id: "AY-TEST", denom: "$1", year: 1889, mint: "CC",
      name: "Test Dollar", grade: "MS-64", variety: "", designation: "", composition });
    const br = document.getElementById("browseDetailBR");
    const runStacked = c => {
      applyFlipCorners("browseDetail", mk(c));
      return { lines: Array.from(br.querySelectorAll(".corner-line")).map(el => el.textContent),
        fits: br.scrollWidth <= br.clientWidth };
    };
    const runSingle = c => {
      applyFlipCorners("browseDetail", mk(c));
      return { shown: br.textContent, fits: br.scrollWidth <= br.clientWidth };
    };
    return {
      long: runStacked(".9995 Fine Palladium"), multi: runStacked("90% Silver, 10% Copper"),
      short: runStacked("91.67% Gold"),
      // Q5, confirmed: 2+ precious metals named has no single value/metal
      // pair to stack, so it falls back to ONE fitted line — no coin in
      // this collection is bimetallic, but the fallback itself is real code.
      bimetal: runSingle("50% Gold, 50% Silver")
    };
  });
  ok(JSON.stringify(JF.long.lines) === JSON.stringify([".9995", "Palladium"]) && JF.long.fits,
    "J2 applyFlipCorners() itself stacks an overlong composition (not just splitCompositionForStacking called directly), \"Fine\" dropped");
  ok(JSON.stringify(JF.multi.lines) === JSON.stringify(["90%", "Silver"]) && JF.multi.fits,
    "J3 -- and drops a balance metal through the real render path before splitting");
  ok(JSON.stringify(JF.short.lines) === JSON.stringify(["91.67%", "Gold"]) && JF.short.fits,
    "J4 -- and a value that already fit under the old single-line design still splits cleanly");
  // Real, measured finding: this exact synthetic string does NOT fit its box
  // (scrollWidth 159 vs clientWidth 139 at phone width) — the single-line
  // fallback has no further reduction to shrink into once both terms are
  // precious metals (compositionLabelCandidates() correctly keeps both per
  // its own M3 coverage). Confirmed with Ray (Q5): build no layout for this
  // — no coin in the collection is bimetallic. A documented, accepted
  // known-gap for a zero-real-rows case, same posture as several other
  // "not worth the tradeoff" calls already recorded in this file — not
  // silently ignored, and not requiring it to fit here, which would demand
  // either unrequested display logic or a false failure on a case nothing
  // exercises.
  ok(JF.bimetal.shown === "50% Gold, 50% Silver",
    "J5 -- while a composition naming 2+ precious metals falls back to ONE joined, UNSPLIT line (may not itself fit the box — known, accepted gap for a case zero real coins exercise)");

  // ------------------------------- K. Scope guard: Add Coin deliberately untouched
  const K = await page.evaluate(() => {
    navigate("addcoin");
    document.getElementById("denomination").value = "$1";
    document.getElementById("year").value = "1889";
    document.getElementById("mintMark").value = "CC";
    document.getElementById("variety").value = "Test Variety";
    document.getElementById("designation").value = "PL";
    updateFlipLabels();
    const br = document.getElementById("flipObverseBR");
    return {
      text: br.textContent,
      lineCount: br.querySelectorAll(".corner-line").length,
      hasComposition: br.textContent.indexOf("Silver") !== -1 || br.textContent.indexOf("%") !== -1
    };
  });
  ok(K.lineCount === 2 && !K.hasComposition,
    "K1 Add Coin's live-entry BR still holds Variety+Designation only — composition is deliberately NOT added there (documented clipping history; composition often unknown at entry)");
  ok(K.text.indexOf("Test Variety") !== -1 && K.text.indexOf("PL") !== -1,
    "K2 -- and both of its existing values still render");

  // ------------------------------------ M. The reduction chain, in isolation
  const M = await page.evaluate(() => ({
    verbatimFirst: compositionLabelCandidates("90% Silver")[0] === "90% Silver",
    singleTermNoDupes: compositionLabelCandidates("90% Silver").length === 1,
    dropsBalance: compositionLabelCandidates("90% Silver, 10% Copper")[1] === "90% Silver",
    // Both terms precious => nothing to drop, so the chain dedupes down to
    // the single verbatim value rather than producing a "reduced" duplicate.
    keepsBothPrecious: JSON.stringify(compositionLabelCandidates("50% Gold, 50% Silver")) === JSON.stringify(["50% Gold, 50% Silver"]),
    dropsFine: compositionLabelCandidates(".9995 Fine Palladium").slice(-1)[0] === ".9995 Palladium",
    blank: compositionLabelCandidates("").length === 0 && compositionLabelCandidates(undefined).length === 0,
    // Reduction only ever shortens — it must never alter a purity figure.
    purityIntact: compositionLabelCandidates(".9995 Fine Palladium").every(c => c.indexOf(".9995") !== -1)
  }));
  ok(M.verbatimFirst && M.singleTermNoDupes, "M1 the stored value is always the first candidate, and a value already at its shortest yields exactly one");
  ok(M.dropsBalance, "M2 a non-precious balance term is dropped ('90% Silver, 10% Copper' -> '90% Silver')");
  ok(M.keepsBothPrecious, "M3 -- but a composition naming two precious metals keeps both");
  ok(M.dropsFine, "M4 the filler word 'Fine' is dropped as the last resort");
  ok(M.purityIntact, "M5 reduction never alters the purity figure — what shows is still the stored value, just shorter");
  ok(M.blank, "M6 blank/undefined yields no candidates and does not throw");

  // --------------------------------- L. Layout, at both viewports (BR populated)
  for (const [vp, name] of [[PHONE, "phone"], [TABLET, "tablet"]]) {
    const p = await openApp(vp);
    const L = await p.evaluate(() => {
      navigate("browse");
      showBrowseDetail(FAKE_COINS.find(c => c.id === "AY-00001"));
      const br = document.getElementById("browseDetailBR");
      const disc = document.getElementById("browseDetailDisc");
      const bl = document.getElementById("browseDetailBL");
      const b = br.getBoundingClientRect(), d = disc.getBoundingClientRect(), l = bl.getBoundingClientRect();
      const frame = document.getElementById("browseDetailFlipFrame").getBoundingClientRect();
      // Every corner label's BOX overlaps the disc's box by design — the disc
      // is a circle and the labels live in the empty corners around it — so a
      // box-intersection test would be meaningless here. What actually
      // matters, and what genuinely broke during this build, is that the text
      // stays inside its own box (nowrap + no overflow:hidden + right-anchored
      // means the excess spills RIGHTWARD past the frame and gets cut), that
      // it stays inside the frame, and that it sits in the same vertical band
      // as the Grade label it shares a row with.
      const shownOf = el => {
        const lines = Array.from(el.querySelectorAll(".corner-line")).map(x => x.textContent);
        return lines.length ? lines.join(" ") : el.textContent;
      };
      const worst = [];
      [".9995 Fine Palladium", "99.95% Platinum", "90% Silver, 10% Copper",
       ".999 Fine Silver", "91.67% Gold"].forEach(t => {
        setCompositionCornerText(br, t);
        const wb = br.getBoundingClientRect();
        worst.push({ input: t, shown: shownOf(br), stacked: br.querySelectorAll(".corner-line").length === 2,
          fits: br.scrollWidth <= br.clientWidth,
          insideFrame: wb.right <= frame.right + 1 && wb.left >= frame.left - 1 });
      });
      setCompositionCornerText(br, "90% Silver");
      return {
        shown: shownOf(br),
        visible: getComputedStyle(br).display !== "none" && b.width > 0,
        fitsBox: br.scrollWidth <= br.clientWidth,
        sameBandAsGrade: Math.abs(b.bottom - l.bottom) <= 1,
        clearsGradeLabel: b.left >= l.right,
        insideFrame: b.right <= frame.right + 1,
        belowDiscCentre: b.top > d.top + d.height / 2,
        noOverflow: document.body.scrollWidth <= window.innerWidth,
        worst
      };
    });
    ok(L.shown === "90% Silver" && L.visible, `L1-${name} the BR corner renders visibly at ${name} width`);
    ok(L.fitsBox, `L2-${name} -- with its text inside its own box (no rightward spill past the frame)`);
    ok(L.clearsGradeLabel && L.sameBandAsGrade, `L3-${name} -- sharing the Grade label's band without running into it`);
    ok(L.insideFrame && L.belowDiscCentre, `L4-${name} -- anchored in the frame's bottom-right corner space`);
    ok(L.noOverflow, `L5-${name} no page-level horizontal overflow`);
    ok(L.worst.every(w => w.fits && w.insideFrame),
      `L6-${name} every realistic composition fits, incl. the measured worst cases: ` +
      L.worst.filter(w => !w.fits || !w.insideFrame).map(w => w.input).join(", "));
    ok(L.worst.every(w => w.stacked), `L6b-${name} -- and every one of them stacks as two lines (all five split cleanly)`);
    ok(L.worst.find(w => w.input === "90% Silver, 10% Copper").shown === "90% Silver",
      `L7-${name} a balance metal is dropped rather than overflowing ("90% Silver, 10% Copper" -> "90% Silver")`);
    ok(L.worst.find(w => w.input === ".9995 Fine Palladium").shown === ".9995 Palladium",
      `L8-${name} the filler word "Fine" is always dropped for the split, not just when needed to fit`);
    ok(L.worst.find(w => w.input === "99.95% Platinum").shown === "99.95% Platinum",
      `L9-${name} -- and a value that already fit under the old single-line design still splits, verbatim per line`);
    await p.close();
  }

  // --------------- N. The actual motivating case: BL/BR collision safety
  // Real measurement (not assumed) drove the switch to two-line stacking: at
  // 360px, a long free-typed "Details" grade in BL (which has NO overflow
  // protection of its own, unlike TR and now BR) genuinely overlapped an
  // unreduced single-line composition in BR (-9px gap). The two-line layout
  // turns that into a comfortable positive gap. BL's own lack of protection
  // is a separate, pre-existing gap (flagged in CLAUDE.md, not fixed here) —
  // this only proves BR's own footprint shrank enough to matter.
  const pn = await openApp({ width: 360, height: 800 });
  const N = await pn.evaluate(() => {
    navigate("browse");
    showBrowseDetail(FAKE_COINS.find(c => c.id === "AY-00001"));
    const bl = document.getElementById("browseDetailBL");
    const br = document.getElementById("browseDetailBR");
    // The exact worst-case pairing measured during this build: BL's longest
    // realistic free-typed "Details" string, BR's own worst-case composition
    // (one requiring no reduction, so the old single-line design gave BR no
    // help from its own shortening).
    bl.textContent = "XF Details - Improperly Cleaned";
    setCompositionCornerText(br, "99.95% Platinum");
    const b = bl.getBoundingClientRect(), c = br.getBoundingClientRect();
    return {
      gap: Math.round(c.left - b.right),
      lines: Array.from(br.querySelectorAll(".corner-line")).map(el => el.textContent)
    };
  });
  ok(N.gap > 0, "N1 the exact real-measured collision case (long BL Details grade + unreduced BR composition, 360px) no longer overlaps — gap: " + N.gap + "px");
  ok(JSON.stringify(N.lines) === JSON.stringify(["99.95%", "Platinum"]), "N2 -- via the real two-line stack, not a coincidence of some other change");
  await pn.close();

  // --------------- O. Composition on Catalog grid-mini flip cards (item 5)
  // renderBrowseGrid() is a genuinely separate render path from
  // applyFlipCorners() (Browse detail/Spotlight), which is why it never
  // inherited Composition automatically when that was first built.
  const O = await page.evaluate(() => {
    navigate("browse"); showBrowseTab("coins");
    const cards = Array.from(document.querySelectorAll(".coin-card"));
    const silverCard = cards.find(c => c.querySelector(".card-id").textContent === "AY-00001");
    const cladCard = cards.find(c => c.querySelector(".card-id").textContent === "AY-00013");
    const lines = el => Array.from(el.querySelectorAll(".flip-label.br .corner-line")).map(x => x.textContent);
    return {
      brExists: !!silverCard.querySelector(".flip-label.br"),
      silverLines: lines(silverCard),
      cladText: cladCard.querySelector(".flip-label.br").textContent
    };
  });
  ok(O.brExists, "O1 the Catalog grid-mini card's BR span exists (it never had one before this pass)");
  ok(JSON.stringify(O.silverLines) === JSON.stringify(["90%", "Silver"]), "O2 a silver coin's mini card shows its composition, stacked the same way as the full flip-frame");
  ok(O.cladText === "", "O3 -- and stays empty for a clad coin, same precious-metal-only rule");

  // --------------- P. Collision-based per-instance sizing (item 6)
  // Supersedes a blanket "#browseDetailBR, #spotlightBR { font-size: 22px }"
  // CSS rule that used to shrink EVERY coin uniformly. Now: natural size by
  // default, shrunk only for the specific coin whose text actually needs it.
  const P = await page.evaluate(() => {
    navigate("browse");
    showBrowseDetail(FAKE_COINS.find(c => c.id === "AY-00001"));
    const br = document.getElementById("browseDetailBR");
    const naturalSize = () => { br.style.fontSize = ""; return parseFloat(getComputedStyle(br).fontSize); };
    const base = naturalSize();

    // Every realistic single-metal composition now fits at the CORNER'S OWN
    // natural size (27px) once stacked — no shrink needed at all. This is
    // the actual, measured reason the blanket 22px rule became removable.
    const noShrinkNeeded = [];
    ["90% Silver", ".9995 Fine Palladium", "99.95% Platinum", "40% Silver"].forEach(t => {
      setCompositionCornerText(br, t);
      noShrinkNeeded.push({ input: t, size: getComputedStyle(br).fontSize, fits: br.scrollWidth <= br.clientWidth });
    });

    // A genuinely extreme value (both stack candidates still too wide) DOES
    // get shrunk, and shrunk only as far as needed.
    setCompositionCornerText(br, "50% Really Long Gold Alloy Name, 50% Another Really Long Silver Alloy Name");
    const extreme = { size: getComputedStyle(br).fontSize, smallerThanBase: parseFloat(getComputedStyle(br).fontSize) < base };

    // Reset behaviour: browseDetailBR is a real, reused DOM element across
    // many different coins as Ray browses — a previous coin's shrink must
    // never leak into the next coin's render.
    const afterExtreme = getComputedStyle(br).fontSize;
    setCompositionCornerText(br, "90% Silver");
    const afterShortAgain = getComputedStyle(br).fontSize;

    // Catalog grid-mini gets the identical mechanism at its own natural
    // size (14px) — same function, no context-specific hardcoding.
    navigate("browse"); showBrowseTab("coins");
    const miniBr = document.querySelector(".coin-card .flip-frame-mini .flip-label.br");
    miniBr.style.fontSize = "";
    const miniNatural = getComputedStyle(miniBr).fontSize;

    return { base, noShrinkNeeded, extreme, afterExtreme, afterShortAgain, miniNatural };
  });
  ok(P.base === 27, "P1 the full flip-frame's BR corner has NO font-size override at rest — its natural size is the shared 27px every other corner uses");
  ok(P.noShrinkNeeded.every(x => x.size === "27px" && x.fits),
    "P2 every realistic single-metal composition fits at that full natural size — no shrink applied: " + JSON.stringify(P.noShrinkNeeded));
  ok(P.extreme.smallerThanBase, "P3 a genuinely extreme composition DOES get shrunk, per-instance, only when its own text actually needs it");
  ok(P.afterExtreme !== P.afterShortAgain, "P4 -- and reset correctly: the SAME reused DOM element returns to full size for the next coin, not stuck at the previous coin's shrink");
  ok(P.afterShortAgain === "27px", "P4b -- specifically back to 27px, not some other stale value");
  ok(P.miniNatural === "14px", "P5 the Catalog grid-mini corner's own natural size (14px) is likewise unaffected — one shared mechanism, no per-context hardcoding");

  // --------------- Q. renderTypeDenomCorner(): shrink-then-wrap, never a
  // destructive last-word truncation (real cases already in the data).
  // Real measurement, not a guess: "Martha Washington First Spouse Gold $10"
  // is 401px unclamped against a 139px box — no DENOM_NAME_SUFFIXES word
  // matches "$10", so nothing strips, and the OLD last-word fallback reduced
  // this to literally "$10", losing which spouse the coin is entirely.
  const Q = await page.evaluate(() => {
    navigate("browse");
    showBrowseDetail(FAKE_COINS.find(c => c.id === "AY-00001"));
    const tr = document.getElementById("browseDetailTR");
    const linesOf = () => Array.from(tr.querySelectorAll(".corner-line")).map(el => el.textContent);
    const fits = () => tr.scrollWidth <= tr.clientWidth;

    // Q-A: First Spouse — no suffix strips at all, worst case.
    renderTypeDenomCorner(tr, { name: "Martha Washington First Spouse Gold $10", denom: "$10" });
    const firstSpouse = { lines: linesOf(), fits: fits(), size: getComputedStyle(tr).fontSize };

    // Q-B: a long ATB/quarter name — suffix IS stripped ("Quarter"), but the
    // remainder ("Washington Crossing the Delaware") still overflows on its
    // own and must wrap rather than truncate.
    renderTypeDenomCorner(tr, { name: "Washington Crossing the Delaware Quarter", denom: "25C" });
    const atb = { lines: linesOf(), fits: fits(), size: getComputedStyle(tr).fontSize };

    // Q-C: regression guard — the ORIGINAL motivating case for the shrink
    // mechanism ("Lincoln Memorial") must still resolve via shrink ALONE,
    // never wrapped, and must NOT end up taller than the untouched baseline.
    renderTypeDenomCorner(tr, { name: "Lincoln Memorial Cent", denom: "1C" });
    const lincolnMemorial = { lines: linesOf(), fits: fits(), size: getComputedStyle(tr).fontSize, height: tr.getBoundingClientRect().height };

    // Q-D: untouched baseline — a short type name that always fit — stays
    // completely unshrunk, un-wrapped, one line.
    renderTypeDenomCorner(tr, { name: "Morgan Dollar", denom: "$1" });
    const baseline = { lines: linesOf(), fits: fits(), size: getComputedStyle(tr).fontSize, height: tr.getBoundingClientRect().height };

    return { firstSpouse, atb, lincolnMemorial, baseline };
  });
  ok(Q.firstSpouse.lines.length === 3 && Q.firstSpouse.lines.join(" ").includes("Martha Washington") &&
     Q.firstSpouse.lines.join(" ").includes("First Spouse Gold $10") && Q.firstSpouse.lines[2] === "$10",
    "Q1 First Spouse (no suffix strips at all): full identity preserved across wrapped lines, never truncated to just \"$10\" — " + JSON.stringify(Q.firstSpouse.lines));
  ok(Q.firstSpouse.fits, "Q2 -- and the rendered box actually fits (no overflow) at whatever size it landed on: " + Q.firstSpouse.size);
  ok(Q.atb.lines.length === 3 && Q.atb.lines[0] + " " + Q.atb.lines[1] === "Washington Crossing the Delaware" && Q.atb.lines[2] === "25C",
    "Q3 long ATB/quarter name: suffix (\"Quarter\") correctly stripped, remainder wraps rather than truncating to one word — " + JSON.stringify(Q.atb.lines));
  ok(Q.atb.fits, "Q4 -- and fits: " + Q.atb.size);
  ok(Q.lincolnMemorial.lines.length === 2 && JSON.stringify(Q.lincolnMemorial.lines) === JSON.stringify(["Lincoln Memorial", "1C"]),
    "Q5 regression guard: \"Lincoln Memorial\" (the original motivating case) still resolves via SHRINK ALONE, never wrapped to a 3rd line — " + JSON.stringify(Q.lincolnMemorial.lines));
  ok(Q.lincolnMemorial.fits && Q.lincolnMemorial.size !== "27px",
    "Q6 -- fits by shrinking below the natural 27px (not by wrapping): " + Q.lincolnMemorial.size);
  ok(Q.lincolnMemorial.height <= Q.baseline.height,
    "Q7 -- and the shrunk-only case is no taller than the untouched baseline (no unnecessary vertical creep toward the coin disc): " +
    Q.lincolnMemorial.height + " vs baseline " + Q.baseline.height);
  ok(JSON.stringify(Q.baseline.lines) === JSON.stringify(["Morgan", "$1"]) && Q.baseline.fits && Q.baseline.size === "27px",
    "Q8 untouched baseline (\"Morgan Dollar\" -> seriesLabel strips \"Dollar\", always fit): stays one type line, natural 27px, no shrink and no wrap — " + JSON.stringify(Q.baseline));
}, module);
