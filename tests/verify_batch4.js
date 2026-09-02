// Batch 4 — live spot-check findings on top of batch 3's Category-narrowing
// fix (2026-08-23). See CLAUDE.md "Add Coin Phase 1: batch 4" for the full
// write-up.

const { defineSuite } = require("./harness");

module.exports = defineSuite("batch4", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ---------- #1: Bullion toggle sits underneath the Denomination dropdown ----------
  // Superseded again (batch 7, Ray's explicit confirmation): batch 6 put
  // this back BETWEEN the "Denomination" label and the dropdown -- Ray's
  // actual ask (stated twice) was for it to sit AFTER/underneath the
  // dropdown itself, which no prior version had ever done. This assertion
  // checks that placement, following the real design change, not weakened
  // -- see CLAUDE.md "batch 7".
  const B1 = await page.evaluate(() => {
    navigate('addcoin');
    const toggle = document.getElementById('addCoinBullionToggle');
    const denomination = document.getElementById('denomination');
    const notes = document.getElementById('notesField');
    const year = document.getElementById('year');
    // The toggle must sit AFTER the Denomination select itself, and before
    // Year -- not sandwiched between the label and the dropdown anymore.
    const afterDenomSelect = !!(denomination.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING);
    const beforeYear = !!(toggle.compareDocumentPosition(year) & Node.DOCUMENT_POSITION_FOLLOWING);
    const beforeNotes = !!(toggle.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING);
    return { afterDenomSelect, beforeYear, beforeNotes };
  });
  ok(B1.afterDenomSelect, "4.1.1 Bullion toggle sits AFTER the Denomination dropdown itself (batch 7: Ray's explicit, confirmed placement)");
  ok(B1.beforeYear, "4.1.2 Bullion toggle sits before Year (immediately under Denomination, not further down the form)");
  ok(B1.beforeNotes, "4.1.3 Bullion toggle is nowhere near Notes");

  // ---------- #2: Grading Service section-label header removed ----------
  const B1B = await page.evaluate(() => {
    navigate('addcoin');
    const grader = document.getElementById('addCoinGrader');
    // No element anywhere in the Add Coin view should carry the old
    // "Grading Service" section-label text -- confirmed removed, not just
    // restyled.
    const stillHasHeader = [...document.querySelectorAll('#view-addcoin .section-label')]
      .some(el => /grading service/i.test(el.textContent));
    const denomination = document.getElementById('denomination');
    const graderBeforeDenom = !!(grader.compareDocumentPosition(denomination) & Node.DOCUMENT_POSITION_FOLLOWING);
    return {
      stillHasHeader,
      graderLabelText: grader.previousElementSibling && grader.previousElementSibling.textContent,
      graderBeforeDenom
    };
  });
  ok(B1B.stillHasHeader === false, "4.1.4 the old bold \"Grading Service\" section-label header is gone (Ray: it read as though Denomination/Year/etc. fell under it)");
  ok(B1B.graderLabelText === "Grading Service", "4.1.5 the Grader field's own label is renamed to \"Grading Service\" (Ray's option b), styled the same plain way as any other field label");
  ok(B1B.graderBeforeDenom, "4.1.6 Grading Service is still positioned near the top, ahead of Denomination");

  // ---------- #2: series picker must not fire once Category already resolves identity ----------
  const B2 = await page.evaluate(() => {
    navigate('addcoin');
    document.getElementById('addCoinBullionToggle').checked = true;
    document.getElementById('addCoinBullionToggle').dispatchEvent(new Event('change'));
    const select = document.getElementById('denomination');
    const opt = [...select.options].find(o => o.textContent.trim() === 'American Silver Eagle');
    opt.selected = true;
    select.dispatchEvent(new Event('change'));
    document.getElementById('year').value = '2017';
    const descAfterPick = document.getElementById('description').value;
    const panelHiddenAfterPick = document.getElementById('descriptionAmbiguousPanel').classList.contains('hidden');
    // Real bug repro: editing Year after a Bullion pick used to re-run the
    // classic denom+year series lookup against the shared "$1" code and pop
    // the classic-dollar ambiguous picker (Various Issues/Presidential/
    // Native American) for a coin that was never actually ambiguous.
    document.getElementById('year').dispatchEvent(new Event('input'));
    const descAfterYearEdit = document.getElementById('description').value;
    const panelHiddenAfterYearEdit = document.getElementById('descriptionAmbiguousPanel').classList.contains('hidden');
    // Direct function-level check too, not just via the year listener.
    maybeAutoFillDescription();
    const descAfterDirectCall = document.getElementById('description').value;
    const panelHiddenAfterDirectCall = document.getElementById('descriptionAmbiguousPanel').classList.contains('hidden');
    return {
      descAfterPick, panelHiddenAfterPick,
      descAfterYearEdit, panelHiddenAfterYearEdit,
      descAfterDirectCall, panelHiddenAfterDirectCall
    };
  });
  ok(B2.descAfterPick === "American Silver Eagle" && B2.panelHiddenAfterPick, "4.2.1 picking American Silver Eagle sets Description and never shows the series picker");
  ok(B2.descAfterYearEdit === "American Silver Eagle" && B2.panelHiddenAfterYearEdit, "4.2.2 editing Year afterward does NOT re-trigger the classic series picker (real bug fix)");
  ok(B2.descAfterDirectCall === "American Silver Eagle" && B2.panelHiddenAfterDirectCall, "4.2.3 maybeAutoFillDescription() itself is Category-aware, not just its callers");

  // Control: the classic (non-bullion) path still shows the picker when it
  // genuinely should -- this fix must not have suppressed it universally.
  const B2CTRL = await page.evaluate(() => {
    navigate('addcoin');
    document.getElementById('denomination').value = '$1';
    document.getElementById('denomination').dispatchEvent(new Event('change'));
    document.getElementById('year').value = '2019';
    document.getElementById('year').dispatchEvent(new Event('input'));
    return {
      panelHidden: document.getElementById('descriptionAmbiguousPanel').classList.contains('hidden'),
      optionCount: document.getElementById('descriptionAmbiguousSelect').options.length
    };
  });
  ok(B2CTRL.panelHidden === false && B2CTRL.optionCount > 1, "4.2.4 control: a genuine classic multi-series year (1$/2019) still shows the series picker -- the fix is scoped to Bullion picks only");

  // ---------- #3: Finish dropdown matches real DB_Coins values ----------
  const B3 = await page.evaluate(() => {
    navigate('addcoin');
    const options = [...document.querySelectorAll('#finish option')].map(o => o.value);
    return { options };
  });
  ["Business Strike", "Proof", "Reverse Proof", "SMS", "Burnished", "Satin Finish", "Enhanced Reverse Proof", "Enhanced Uncirculated"].forEach(v => {
    ok(B3.options.includes(v), "4.3.1 Finish dropdown includes real confirmed value \"" + v + "\"");
  });
  // 4.3.2/4.3.3/4.3.5 REVERSED 2026-09-02 against the real workbook, which
  // contradicted the reasoning they were written on -- following confirmed
  // data, not weakening. Specimen was removed for "matching zero real rows"
  // and matches 9; Uncirculated was excluded as a condition-vs-finish mix-up
  // and is both a real populated value (211 rows) and one of
  // Lookup_Finishes' own 11 defined values.
  ok(B3.options.includes("Specimen"), "4.3.2 \"Specimen\" is BACK in the Finish dropdown -- it matches 9 real DB_Coins rows, so removing it was wrong");
  ok(B3.options.includes("Uncirculated"), "4.3.3 \"Uncirculated\" is BACK -- 211 real DB_Coins rows and a defined Lookup_Finishes value, not a hygiene artifact");
  ok(B3.options.includes("Matte") && B3.options.includes("Matte Proof"),
    "4.3.3b \"Matte\" (3 real rows, modern silver medals) and \"Matte Proof\" (Lookup_Finishes' historic 1908-1916 gold value) are both offered, as genuinely different finishes");
  ok(!B3.options.includes("Circulated"), "4.3.4 \"Circulated\" stays excluded -- a wear state, and absent from Lookup_Finishes (unchanged)");
  ok(B3.options.length === 13, "4.3.5 exactly 13 options total (blank + Lookup_Finishes' 11 defined values + the in-use \"Matte\")");

  // "Enhanced Uncirculated" must remain a distinct option, never conflated
  // with a plain "Uncirculated" value -- and it should still narrow the
  // matcher correctly like any other Finish value (Finish tier, unchanged
  // logic, just confirming the new value flows through it).
  const B3B = await page.evaluate(() => {
    __setLiveDbCoinsForTest([
      { denom:"$1", year:2011, mint:"S", variety:"", description:"American Silver Eagle Dollar", finish:"Enhanced Uncirculated", designation:"", coinId:"C-EU", pcgs:"", mintage:null, gsid:"" },
      { denom:"$1", year:2011, mint:"S", variety:"", description:"American Silver Eagle Dollar", finish:"Business Strike", designation:"", coinId:"C-BS", pcgs:"", mintage:null, gsid:"" }
    ]);
    const match = dbCoinsCandidatesFor({ denom:"$1", year:"2011", mint:"S", variety:"", finish:"Enhanced Uncirculated", category:"Silver Eagle" });
    __setLiveDbCoinsForTest(null);
    return { len: match.length, id: match[0] && match[0].coinId };
  });
  ok(B3B.len === 1 && B3B.id === "C-EU", "4.3.6 \"Enhanced Uncirculated\" narrows the Finish tier correctly and is never conflated with Business Strike");

  // ---------- Full nav smoke, no overflow ----------
  const H = await page.evaluate(() => {
    const routes = ["dashboard", "browse", "sets", "albums", "wishlist", "addcoin", "stats", "needsdbcoins"];
    const bad = [];
    routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    navigate('dashboard');
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(H.bad.length === 0, "every route still navigates cleanly: " + H.bad.join("; "));
  ok(H.overflow === false, "no horizontal page overflow at 412px");
}, module);
