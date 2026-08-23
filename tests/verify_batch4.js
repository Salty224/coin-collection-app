// Batch 4 — live spot-check findings on top of batch 3's Category-narrowing
// fix (2026-08-23). See CLAUDE.md "Add Coin Phase 1: batch 4" for the full
// write-up.

const { defineSuite } = require("./harness");

module.exports = defineSuite("batch4", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ---------- #1: Bullion toggle sits directly above Denomination ----------
  // Superseded (batch 6): batch 4 moved this below Notes; Ray's live-device
  // review corrected that back -- the toggle determines how Denomination/
  // Category get captured together and reads disconnected from that field
  // when it sits down near Notes. This assertion now checks the CORRECTED
  // (original) placement, not weakened -- see CLAUDE.md "batch 6".
  const B1 = await page.evaluate(() => {
    navigate('addcoin');
    const toggle = document.getElementById('addCoinBullionToggle');
    const denomination = document.getElementById('denomination');
    const notes = document.getElementById('notesField');
    // The toggle must sit immediately above Denomination (only the note
    // paragraph between them) and BEFORE Notes -- not down near it anymore.
    const immediatelyAboveDenom = !!(toggle.compareDocumentPosition(denomination) & Node.DOCUMENT_POSITION_FOLLOWING);
    const beforeNotes = !!(toggle.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING);
    return { immediatelyAboveDenom, beforeNotes };
  });
  ok(B1.immediatelyAboveDenom, "4.1.1 Bullion toggle sits directly above Denomination (batch 6: corrected back from batch 4's move)");
  ok(B1.beforeNotes, "4.1.2 Bullion toggle is no longer positioned down near Notes");

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
  ok(!B3.options.includes("Specimen"), "4.3.2 \"Specimen\" removed from the Finish dropdown -- matches zero real DB_Coins rows");
  ok(!B3.options.includes("Uncirculated"), "4.3.3 \"Uncirculated\" (172 rows) deliberately excluded -- a condition-vs-finish data-cleanup issue, not a dropdown gap");
  ok(!B3.options.includes("Circulated"), "4.3.4 \"Circulated\" stays excluded (unchanged from batch-3/earlier fix)");
  ok(B3.options.length === 9, "4.3.5 exactly 9 options total (blank + 8 confirmed real values)");

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
