// Three items from the same session:
//   1. CACBean UI (Add Coin + Edit Coin) — two mutually-exclusive checkboxes
//      for one underlying All!CACBean value (blank/Green/Gold, data-
//      validated on the real sheet). Add Coin has no write path to All in
//      Phase 1 (captured on the Staging draft); Edit Coin (Browse Edit) has
//      a real write path, so CACBean is threaded through it for real.
//   2. Value field currency formatting — browseEditValue/editSetValue can be
//      populated from a live computed Value/SpotValue cell with full float
//      precision; roundToCents() rounds it on populate, and a $ prefix label
//      sits beside the input (a plain number input can't show one inline).
// See CLAUDE.md "CACBean UI in Add Coin and Edit Coin" and "Value field
// currency formatting".

const { defineSuite } = require("./harness");

module.exports = defineSuite("cacbean-and-value-rounding", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ================================================================
  // A. Add Coin — CACBean UI (draft-only, no write path to All)
  // ================================================================
  const A = await page.evaluate(() => {
    navigate("addcoin");
    const green = document.getElementById("cacGreen");
    const gold = document.getElementById("cacGold");
    const inCertRow = !!document.getElementById("certTypeNumberRow").querySelector("#cacGreen") &&
      !!document.getElementById("certTypeNumberRow").querySelector("#cacGold");

    // Mutual exclusivity
    green.checked = true; green.dispatchEvent(new Event("change", { bubbles: true }));
    const afterGreen = { green: green.checked, gold: gold.checked };
    gold.checked = true; gold.dispatchEvent(new Event("change", { bubbles: true }));
    const afterGold = { green: green.checked, gold: gold.checked };
    // Unchecking the currently-checked one directly leaves both unchecked —
    // the blank state, not a forced fallback to the other.
    gold.checked = false; gold.dispatchEvent(new Event("change", { bubbles: true }));
    const afterUncheck = { green: green.checked, gold: gold.checked, value: cacBeanValueFrom("cacGreen", "cacGold") };

    green.checked = true; green.dispatchEvent(new Event("change", { bubbles: true }));
    const draftForm = readAddCoinFormForDraft();
    const draft = buildCoinDraft("AY-TEST01", draftForm, null);

    resetAddCoinForm();
    const afterReset = { green: green.checked, gold: gold.checked };

    return { inCertRow, afterGreen, afterGold, afterUncheck, draftCacBean: draft.cacBean, afterReset };
  });
  ok(A.inCertRow, "A1 cacGreen/cacGold checkboxes exist, positioned inside certTypeNumberRow (to the right of Cert/Type Number)");
  ok(A.afterGreen.green === true && A.afterGreen.gold === false, "A2 checking Green leaves Gold unchecked");
  ok(A.afterGold.green === false && A.afterGold.gold === true, "A3 checking Gold clears Green — mutually exclusive despite being two separate elements");
  ok(A.afterUncheck.green === false && A.afterUncheck.gold === false && A.afterUncheck.value === "",
    "A4 unchecking the currently-checked box directly leaves both unchecked (blank state), not a forced fallback");
  ok(A.draftCacBean === "Green", "A5 buildCoinDraft() captures cacBean on the Staging draft, same posture as category/itemNumber/gsid");
  ok(A.afterReset.green === false && A.afterReset.gold === false, "A6 resetAddCoinForm() clears both checkboxes");

  // ================================================================
  // B. Edit Coin — CACBean UI mechanics
  // ================================================================
  const B = await page.evaluate(() => {
    const inBadgeRow = !!document.getElementById("browseEditCertTypeNumber").closest(".cert-badge-row").querySelector("#browseEditCacGreen");
    return {
      inBadgeRow,
      isWritable: ALL_WRITABLE_COLUMNS.indexOf("CACBean") !== -1,
      neverWrite: ALL_NEVER_WRITE_COLUMNS.indexOf("CACBean") !== -1,
      isIdentity: IDENTITY_COLUMNS.indexOf("CACBean") !== -1
    };
  });
  ok(B.inBadgeRow, "B1 browseEditCacGreen/Gold checkboxes exist inside .cert-badge-row, beside the cert-lookup link icon");
  ok(B.isWritable, "B2 CACBean is in ALL_WRITABLE_COLUMNS — Edit Coin has a real write path, unlike Add Coin");
  ok(!B.neverWrite, "B3 -- and correctly absent from ALL_NEVER_WRITE_COLUMNS");
  ok(!B.isIdentity, "B4 -- and NOT an identity field (no overwrite-confirmation dialog for a CAC status change, same as Designation)");

  // Mutual exclusivity, prefill from a seeded demo coin, and the touched-
  // field mechanics conflict detection depends on.
  const B2 = await page.evaluate(() => {
    navigate("browse");
    __setBrowseEditWriteEnabledForTest(false); // demo/session-only path for this block
    const gold = FAKE_COINS.find(c => c.id === "AY-00001"); // seeded cacBean: "Gold"
    const green = FAKE_COINS.find(c => c.id === "AY-00003"); // seeded cacBean: "Green"
    const blank = FAKE_COINS.find(c => c.id === "AY-00002"); // no cacBean seeded

    showBrowseDetail(gold); showBrowseEditView(gold);
    const goldPrefill = { green: document.getElementById("browseEditCacGreen").checked, gold: document.getElementById("browseEditCacGold").checked };

    showBrowseDetail(green); showBrowseEditView(green);
    const greenPrefill = { green: document.getElementById("browseEditCacGreen").checked, gold: document.getElementById("browseEditCacGold").checked };

    showBrowseDetail(blank); showBrowseEditView(blank);
    const blankPrefill = { green: document.getElementById("browseEditCacGreen").checked, gold: document.getElementById("browseEditCacGold").checked };

    // Mutual exclusivity on this form too — one shared helper, not two.
    // Starts from Gold CHECKED (the "gold" coin's own prefill, still current
    // from goldPrefill above) so checking Green actually has to clear an
    // already-true Gold to pass — starting from both-false would pass this
    // assertion even with exclusivity silently broken.
    showBrowseDetail(gold); showBrowseEditView(gold);
    const gEl = document.getElementById("browseEditCacGreen"), oEl = document.getElementById("browseEditCacGold");
    const before = { green: gEl.checked, gold: oEl.checked };
    gEl.checked = true; gEl.dispatchEvent(new Event("change", { bubbles: true }));
    const exclusive = { green: gEl.checked, gold: oEl.checked };

    // conflictFieldIsUserEdited — touching EITHER checkbox counts, same
    // dual-id pattern as Grade's dropdown/"Other" pair.
    const touchedViaGreen = conflictFieldIsUserEdited("CACBean");
    browseEditTouchedFields.clear();
    oEl.checked = true; oEl.dispatchEvent(new Event("change", { bubbles: true }));
    const touchedViaGold = conflictFieldIsUserEdited("CACBean");
    browseEditTouchedFields.clear();
    const untouched = conflictFieldIsUserEdited("CACBean");

    return { goldPrefill, greenPrefill, blankPrefill, before, exclusive, touchedViaGreen, touchedViaGold, untouched };
  });
  ok(B2.goldPrefill.gold === true && B2.goldPrefill.green === false, "B5 opening a coin seeded CACBean:'Gold' pre-checks Gold");
  ok(B2.greenPrefill.green === true && B2.greenPrefill.gold === false, "B6 -- and one seeded 'Green' pre-checks Green");
  ok(B2.blankPrefill.green === false && B2.blankPrefill.gold === false, "B7 -- and one with no CACBean leaves both unchecked");
  ok(B2.before.gold === true, "B8a setup check: Gold was genuinely checked before this assertion (so B8b actually exercises the exclusion, not a no-op)");
  ok(B2.exclusive.green === true && B2.exclusive.gold === false, "B8b mutual exclusivity holds on Edit Coin's own checkbox pair too — checking Green clears an already-checked Gold");
  ok(B2.touchedViaGreen === true, "B9 conflictFieldIsUserEdited('CACBean') is true once Green is touched");
  ok(B2.touchedViaGold === true, "B10 -- and true once Gold is touched (the OR check, mirroring Grade's own pattern)");
  ok(B2.untouched === false, "B11 -- and false when neither has been touched");

  // Session-only save path (write layer off) — same as every other field.
  const B3 = await page.evaluate(() => {
    const coin = FAKE_COINS.find(c => c.id === "AY-00002");
    showBrowseDetail(coin); showBrowseEditView(coin);
    document.getElementById("browseEditCacGold").checked = true;
    document.getElementById("browseEditCacGold").dispatchEvent(new Event("change", { bubbles: true }));
    const form = readBrowseEditForm();
    applyEditsToRecord(coin, form.record);
    return { workbookField: form.workbook.CACBean, recordField: form.record.row.cacBean, appliedToRecord: coin.cacBean };
  });
  ok(B3.workbookField === "Gold", "B12 readBrowseEditForm().workbook.CACBean reflects the checked state");
  ok(B3.recordField === "Gold", "B13 -- and record.row.cacBean matches (one reader, both shapes, per readBrowseEditForm()'s own comment)");
  ok(B3.appliedToRecord === "Gold", "B14 the session-only apply path (applyEditsToRecord) sets coin.cacBean generically, same as every other field");

  // Clearing back to blank writes "" — a real, intentional value, not a
  // dropped/undefined key (Designation/Container already work this way).
  const B4 = await page.evaluate(() => {
    document.getElementById("browseEditCacGold").checked = false;
    document.getElementById("browseEditCacGold").dispatchEvent(new Event("change", { bubbles: true }));
    const form = readBrowseEditForm();
    return { workbookField: form.workbook.CACBean, isPresent: "CACBean" in form.workbook };
  });
  ok(B4.isPresent && B4.workbookField === "", "B15 clearing both checkboxes writes CACBean:'' — a real write, not a dropped key");

  // ================================================================
  // C. Edit Coin — the REAL write path (mock Graph client, end-to-end)
  // ================================================================
  const C = await page.evaluate(async () => {
    const headers = ["CollectionID", "Year", "MintMark", "Denomination", "Variety", "Description",
      "Value", "Cost", "Shipping", "Seller_Link", "PurchaseDate", "StorageLocation", "Container",
      "Grade", "GradeSource", "Designation", "SerNo", "CACBean", "Remarks", "Reviewed", "LastModified",
      "Finish", "CoinID"];
    const row = ["AY-00001", 1889, "CC", "$1", "", "Morgan Dollar", 850, 620, 0, "", null,
      "Safe", "Capsule tray", "MS-64", "PCGS", "", "23456789", "Green", "", "", null,
      "Business Strike", "C-TEST-CACBEAN"];
    const mock = createMockGraphClient({ sheets: { All: [headers, row] } });
    __setGraphClientForTest(mock);
    __resetAllHeaderMapForTest();
    __setBrowseEditWriteEnabledForTest(true);

    const coin = FAKE_COINS.find(c => c.id === "AY-00001");
    showBrowseDetail(coin);
    showBrowseEditView(coin);
    await loadBrowseEditSnapshot(coin); // deterministic completion point for the async fetch

    // The live snapshot re-base pre-fills from the WORKBOOK's real cell
    // ("Green"), not whatever coin.cacBean happened to hold in memory.
    const liveGreen = document.getElementById("browseEditCacGreen").checked;
    const liveGold = document.getElementById("browseEditCacGold").checked;

    // Check Gold and save for real.
    document.getElementById("browseEditCacGreen").checked = false;
    document.getElementById("browseEditCacGold").checked = true;
    document.getElementById("browseEditCacGold").dispatchEvent(new Event("change", { bubbles: true }));
    document.getElementById("browseEditSaveBtn").click();
    await new Promise(r => setTimeout(r, 250)); // async save + any guard dialog settling

    const gridAfterFirstSave = mock._grids.All[1][headers.indexOf("CACBean")];

    // Clear to blank and save again — "" must actually be WRITTEN, not
    // skipped because it looks falsy.
    document.getElementById("browseEditCacGold").checked = false;
    document.getElementById("browseEditCacGold").dispatchEvent(new Event("change", { bubbles: true }));
    document.getElementById("browseEditSaveBtn").click();
    await new Promise(r => setTimeout(r, 250));
    const gridAfterSecondSave = mock._grids.All[1][headers.indexOf("CACBean")];

    __setBrowseEditWriteEnabledForTest(null);
    __setGraphClientForTest(null);
    __resetAllHeaderMapForTest();

    return { liveGreen, liveGold, gridAfterFirstSave, gridAfterSecondSave };
  });
  ok(C.liveGreen === true && C.liveGold === false, "C1 the live snapshot re-base pre-fills CAC checkboxes from the REAL workbook cell, not the in-memory coin.cacBean stub");
  ok(C.gridAfterFirstSave === "Gold", "C2 checking Gold and clicking Save actually writes 'Gold' into the workbook (mock grid)");
  ok(C.gridAfterSecondSave === "", "C3 clearing both and saving again writes '' — a real clear, not silently skipped");

  // ================================================================
  // D. Value field currency formatting (item 2)
  // ================================================================
  const D = await page.evaluate(() => ({
    fromFraction: roundToCents(0.039914798),
    fromBlank: [roundToCents(null), roundToCents(undefined), roundToCents("")],
    fromZero: roundToCents(0),
    fromString: roundToCents("12.005"),
    nonFinite: roundToCents("not a number")
  }));
  ok(D.fromFraction === 0.04, "D1 roundToCents(0.039914798) === 0.04 — the exact real-reported bug value");
  ok(D.fromBlank.every(v => v === ""), "D2 null/undefined/'' all pass through as blank, same convention every other populate helper uses");
  ok(D.fromZero === 0, "D3 a genuine zero value round-trips as 0, not blank");
  ok(D.fromString === 12.01, "D4 a numeric string is coerced and rounded (Math.round(1200.5)/100)");
  ok(D.nonFinite === "", "D5 a non-finite input degrades to blank rather than NaN");

  // The two actually-affected inputs, both populate sites each.
  const D2 = await page.evaluate(() => {
    __setBrowseEditWriteEnabledForTest(false);
    const coin = FAKE_COINS.find(c => c.id === "AY-00001");
    const origValue = coin.value;
    coin.value = 0.039914798; // simulate a live formula-computed melt value
    showBrowseDetail(coin); showBrowseEditView(coin);
    const browseEditFromCoin = document.getElementById("browseEditValue").value;

    showBrowseEditSetView(coin);
    const editSetFromCoin = document.getElementById("editSetValue").value;

    coin.value = origValue; // restore the demo row
    return { browseEditFromCoin, editSetFromCoin };
  });
  ok(D2.browseEditFromCoin === "0.04", "D6 browseEditValue shows the ROUNDED value when populated from coin.value ('0.04', not '0.039914798')");
  ok(D2.editSetFromCoin === "0.04", "D7 editSetValue has the identical fix at its own populate site");

  // The live snapshot re-base site (the real write-layer path) — a second,
  // independent populate site for browseEditValue that had the same bug.
  const D3 = await page.evaluate(async () => {
    const headers = ["CollectionID", "Year", "MintMark", "Denomination", "Variety", "Description",
      "Value", "Cost", "Shipping", "Seller_Link", "PurchaseDate", "StorageLocation", "Container",
      "Grade", "GradeSource", "Designation", "SerNo", "CACBean", "Remarks", "Reviewed", "LastModified",
      "Finish", "CoinID"];
    const row = ["AY-00001", 1889, "CC", "$1", "", "Morgan Dollar", 0.039914798, 620, 0, "", null,
      "Safe", "Capsule tray", "MS-64", "PCGS", "", "23456789", "", "", "", null,
      "Business Strike", "C-TEST-VALUE"];
    const mock = createMockGraphClient({ sheets: { All: [headers, row] } });
    __setGraphClientForTest(mock);
    __resetAllHeaderMapForTest();
    __setBrowseEditWriteEnabledForTest(true);

    const coin = FAKE_COINS.find(c => c.id === "AY-00001");
    showBrowseDetail(coin);
    showBrowseEditView(coin);
    await loadBrowseEditSnapshot(coin);
    const shown = document.getElementById("browseEditValue").value;

    __setBrowseEditWriteEnabledForTest(null);
    __setGraphClientForTest(null);
    __resetAllHeaderMapForTest();
    return { shown };
  });
  ok(D3.shown === "0.04", "D8 the live snapshot re-base site is rounded too — the same field had TWO unrounded populate sites");

  // The $ prefix wrapper, and that a manual user edit is left completely
  // alone (populate-time rounding only, per Q3c).
  const D4 = await page.evaluate(() => {
    __setBrowseEditWriteEnabledForTest(false);
    const coin = FAKE_COINS.find(c => c.id === "AY-00001");
    showBrowseDetail(coin); showBrowseEditView(coin);
    const browseEditWrap = document.getElementById("browseEditValue").closest(".currency-input-row");
    const browseEditPrefix = browseEditWrap ? browseEditWrap.querySelector(".currency-prefix").textContent : null;

    showBrowseEditSetView(coin);
    const editSetWrap = document.getElementById("editSetValue").closest(".currency-input-row");
    const editSetPrefix = editSetWrap ? editSetWrap.querySelector(".currency-prefix").textContent : null;

    // A user's own typed entry must NOT be rounded out from under them.
    showBrowseDetail(coin); showBrowseEditView(coin);
    const valueInput = document.getElementById("browseEditValue");
    valueInput.value = "12.3456789";
    valueInput.dispatchEvent(new Event("input", { bubbles: true }));
    const afterTyping = valueInput.value;

    // Scope check (Q3a): Cost/Shipping/Purchase Price never received this
    // treatment — nothing else is ever fed a computed value today.
    const costWrapped = !!document.getElementById("browseEditCost").closest(".currency-input-row");

    return { browseEditPrefix, editSetPrefix, afterTyping, costWrapped };
  });
  ok(D4.browseEditPrefix === "$", "D9 browseEditValue sits in a .currency-input-row with a '$' prefix label");
  ok(D4.editSetPrefix === "$", "D10 -- and editSetValue has the identical wrapper");
  ok(D4.afterTyping === "12.3456789", "D11 a user's own typed entry is left completely alone — rounding is populate-time only, never applied to live typing");
  ok(!D4.costWrapped, "D12 scope check: browseEditCost (Purchase Price) was NOT given the $ treatment — nothing feeds it a computed value today, per the narrower fix Ray confirmed (Q3)");

  // Full nav smoke + overflow, both new UI additions visible at once.
  const N = await page.evaluate(() => {
    navigate("addcoin");
    document.getElementById("addCoinGrader").value = "NGC";
    applyGraderDependentVisibility("NGC");
    document.getElementById("addCoinGradingHeader").click();
    navigate("browse");
    const coin = FAKE_COINS.find(c => c.id === "AY-00001");
    showBrowseDetail(coin); showBrowseEditView(coin);
    return { noOverflow: document.body.scrollWidth <= window.innerWidth };
  });
  ok(N.noOverflow, "N1 no page-level horizontal overflow with both new UI pieces visible");
}, module);
