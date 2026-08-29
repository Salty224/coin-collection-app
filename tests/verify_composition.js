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
  const I = await page.evaluate(() => {
    const brExists = !!document.getElementById("browseDetailBR");
    const spotExists = !!document.getElementById("spotlightBR");
    navigate("browse");
    showBrowseDetail(FAKE_COINS.find(c => c.id === "AY-00001"));
    const silver = document.getElementById("browseDetailBR").textContent;
    const sr = document.getElementById("browseDetailSR").textContent;
    showBrowseDetail(FAKE_COINS.find(c => c.id === "AY-00013"));
    const clad = document.getElementById("browseDetailBR").textContent;
    const cladSr = document.getElementById("browseDetailSR").textContent;
    showBrowseDetail(FAKE_COINS.find(c => c.id === "AY-00018"));
    const set = document.getElementById("browseDetailBR").textContent;
    return {
      brExists, spotExists, silver, clad, set,
      srHasComposition: sr.indexOf("composition 90% Silver") !== -1,
      cladSrHasNoComposition: cladSr.indexOf("composition") === -1,
      brAriaHidden: document.getElementById("browseDetailBR").getAttribute("aria-hidden") === "true"
    };
  });
  ok(I.brExists, "I1 browseDetailBR exists (there was no BR span on this frame at all before this pass)");
  ok(I.spotExists, "I2 spotlightBR exists — Spotlight shares applyFlipCorners(), so it gets the same corner");
  ok(I.silver === "90% Silver", "I3 Browse detail's BR corner shows a silver coin's composition");
  ok(I.clad === "", "I4 -- and stays empty for a clad coin");
  ok(I.set === "", "I5 -- and stays empty for a Set bundle");
  ok(I.brAriaHidden, "I6 the BR span is aria-hidden like every other flip label");
  ok(I.srHasComposition, "I7 composition rides into the sr-only summary, since the visible corner is aria-hidden");
  ok(I.cladSrHasNoComposition, "I8 -- and is omitted there for a coin that doesn't qualify");

  // Spotlight uses the same renderer; drive it directly rather than waiting
  // out the carousel's own timer.
  const J = await page.evaluate(() => {
    applyFlipCorners("spotlight", FAKE_COINS.find(c => c.id === "AY-00001"));
    const silver = document.getElementById("spotlightBR").textContent;
    applyFlipCorners("spotlight", FAKE_COINS.find(c => c.id === "AY-00013"));
    return { silver, clad: document.getElementById("spotlightBR").textContent };
  });
  ok(J.silver === "90% Silver" && J.clad === "", "J1 Spotlight's BR corner behaves identically (one shared render path)");

  // applyFlipCorners() must FIT the text, not just write it. Asserted through
  // the real render path rather than by calling setFittedCornerText()
  // directly — otherwise the suite would still pass if applyFlipCorners()
  // stopped using the fitter and went back to plain textContent, which is
  // exactly the "green suite hiding a real bug" trap this project has hit
  // before (see CLAUDE.md's visibility-gap note).
  const JF = await page.evaluate(() => {
    const mk = composition => ({ id: "AY-TEST", denom: "$1", year: 1889, mint: "CC",
      name: "Test Dollar", grade: "MS-64", variety: "", designation: "", composition });
    const br = document.getElementById("browseDetailBR");
    const run = c => { applyFlipCorners("browseDetail", mk(c));
      return { shown: br.textContent, fits: br.scrollWidth <= br.clientWidth }; };
    return { long: run(".9995 Fine Palladium"), multi: run("90% Silver, 10% Copper"),
             short: run("91.67% Gold") };
  });
  ok(JF.long.shown === ".9995 Palladium" && JF.long.fits,
    "J2 applyFlipCorners() itself fits an overlong composition (not just setFittedCornerText called directly)");
  ok(JF.multi.shown === "90% Silver" && JF.multi.fits,
    "J3 -- and drops a balance metal through the real render path");
  ok(JF.short.shown === "91.67% Gold" && JF.short.fits,
    "J4 -- while a value that already fits goes through untouched");

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
      const worst = [];
      [".9995 Fine Palladium", "99.95% Platinum", "90% Silver, 10% Copper",
       ".999 Fine Silver", "91.67% Gold"].forEach(t => {
        setFittedCornerText(br, t);
        const wb = br.getBoundingClientRect();
        worst.push({ input: t, shown: br.textContent,
          fits: br.scrollWidth <= br.clientWidth,
          insideFrame: wb.right <= frame.right + 1 && wb.left >= frame.left - 1 });
      });
      setFittedCornerText(br, "90% Silver");
      return {
        text: br.textContent,
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
    ok(L.text === "90% Silver" && L.visible, `L1-${name} the BR corner renders visibly at ${name} width`);
    ok(L.fitsBox, `L2-${name} -- with its text inside its own box (no rightward spill past the frame)`);
    ok(L.clearsGradeLabel && L.sameBandAsGrade, `L3-${name} -- sharing the Grade label's band without running into it`);
    ok(L.insideFrame && L.belowDiscCentre, `L4-${name} -- anchored in the frame's bottom-right corner space`);
    ok(L.noOverflow, `L5-${name} no page-level horizontal overflow`);
    ok(L.worst.every(w => w.fits && w.insideFrame),
      `L6-${name} every realistic composition fits, incl. the measured worst cases: ` +
      L.worst.filter(w => !w.fits || !w.insideFrame).map(w => w.input).join(", "));
    ok(L.worst.find(w => w.input === "90% Silver, 10% Copper").shown === "90% Silver",
      `L7-${name} a balance metal is dropped rather than overflowing ("90% Silver, 10% Copper" -> "90% Silver")`);
    ok(L.worst.find(w => w.input === ".9995 Fine Palladium").shown === ".9995 Palladium",
      `L8-${name} the filler word "Fine" is dropped only when needed to fit`);
    ok(L.worst.find(w => w.input === "99.95% Platinum").shown === "99.95% Platinum",
      `L9-${name} -- and a value that already fits is shown verbatim, unreduced`);
    await p.close();
  }
}, module);
