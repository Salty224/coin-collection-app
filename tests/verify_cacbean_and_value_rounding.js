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
    // Real bug fix (batch round 2): the CAC checkboxes used to live INSIDE
    // certTypeNumberRow, which only shows for a non-PCGS grader — so they
    // were hidden exactly when PCGS was picked, backwards, since CAC almost
    // exclusively stickers PCGS/NGC coins. Now they're their own row
    // (#cacBeanRow), gated on "any grader picked" alone, independent of
    // certTypeNumberRow's own narrower visibility.
    const inOwnRow = !!document.getElementById("cacBeanRow").querySelector("#cacGreen") &&
      !!document.getElementById("cacBeanRow").querySelector("#cacGold");
    const notInCertRow = !document.getElementById("certTypeNumberRow").contains(document.getElementById("cacGreen"));

    document.getElementById("addCoinGrader").value = "";
    applyGraderDependentVisibility("");
    const visibleNoGrader = getComputedStyle(document.getElementById("cacBeanRow")).display !== "none";

    document.getElementById("addCoinGrader").value = "PCGS";
    applyGraderDependentVisibility("PCGS");
    const visiblePcgs = getComputedStyle(document.getElementById("cacBeanRow")).display !== "none";
    const certRowVisiblePcgs = getComputedStyle(document.getElementById("certTypeNumberRow")).display !== "none";

    document.getElementById("addCoinGrader").value = "NGC";
    applyGraderDependentVisibility("NGC");
    const visibleNgc = getComputedStyle(document.getElementById("cacBeanRow")).display !== "none";

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

    return {
      inOwnRow, notInCertRow, visibleNoGrader, visiblePcgs, certRowVisiblePcgs, visibleNgc,
      afterGreen, afterGold, afterUncheck, draftCacBean: draft.cacBean, afterReset
    };
  });
  ok(A.inOwnRow, "A1 cacGreen/cacGold checkboxes exist inside their own #cacBeanRow");
  ok(A.notInCertRow, "A1b -- and are genuinely NOT inside certTypeNumberRow anymore (the bug's root cause)");
  ok(!A.visibleNoGrader, "A1c hidden when no grader is picked (a raw/ungraded coin can't carry a CAC bean)");
  ok(A.visiblePcgs, "A1d THE BUG FIX: visible for PCGS specifically — this is exactly the grader it was wrongly hidden for before");
  ok(!A.certRowVisiblePcgs, "A1e -- while certTypeNumberRow itself correctly stays hidden for PCGS (its own cert number is auto-decoded, unrelated to this fix)");
  ok(A.visibleNgc, "A1f -- and still visible for a non-PCGS grader too, same as before this fix");
  ok(A.afterGreen.green === true && A.afterGreen.gold === false, "A2 checking Green leaves Gold unchecked");
  ok(A.afterGold.green === false && A.afterGold.gold === true, "A3 checking Gold clears Green — mutually exclusive despite being two separate elements");
  ok(A.afterUncheck.green === false && A.afterUncheck.gold === false && A.afterUncheck.value === "",
    "A4 unchecking the currently-checked box directly leaves both unchecked (blank state), not a forced fallback");
  ok(A.draftCacBean === "Green", "A5 buildCoinDraft() captures cacBean on the Staging draft, same posture as category/itemNumber/gsid");
  ok(A.afterReset.green === false && A.afterReset.gold === false, "A6 resetAddCoinForm() clears both checkboxes");

  // Item 2: a visible "CAC Bean" caption above the pair, in both forms.
  const A2 = await page.evaluate(() => {
    const addCoinHeading = document.querySelector("#cacBeanRow .cac-bean-heading");
    const browseEditHeading = document.querySelector(".cert-badge-row .cac-bean-heading");
    return {
      addCoinText: addCoinHeading ? addCoinHeading.textContent : null,
      browseEditText: browseEditHeading ? browseEditHeading.textContent : null
    };
  });
  ok(A2.addCoinText === "CAC Bean", "A7 Add Coin's CAC group has a visible 'CAC Bean' caption");
  ok(A2.browseEditText === "CAC Bean", "A8 Edit Coin's CAC group has the identical caption, without needing any structural change to its own row");

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

  // Item 3: read-only in Browse detail's Overview — a deliberate reversal
  // of the earlier "edit-surface only" scope call, not an oversight.
  const B5 = await page.evaluate(() => {
    const rowText = id => {
      const coin = FAKE_COINS.find(c => c.id === id);
      showBrowseDetail(coin);
      const rows = Array.from(document.querySelectorAll(".detail-row"));
      const row = rows.find(r => (r.querySelector(".detail-label") || {}).textContent === "CAC Bean");
      return row ? row.querySelector(".detail-value").textContent.trim() : null;
    };
    const gold = rowText("AY-00001"); // seeded "Gold"
    const green = rowText("AY-00003"); // seeded "Green"
    // AY-00004, not AY-00002: AY-00002 was mutated to cacBean:"Gold" by B3's
    // own applyEditsToRecord() call earlier in this suite (a genuine
    // in-memory session-only write, working as intended) and B4 never wrote
    // a blank value back over it — so it's no longer actually blank by the
    // time this runs. AY-00004 is untouched anywhere else in this file.
    const blank = rowText("AY-00004"); // no cacBean seeded
    return { gold, green, blank };
  });
  ok(B5.gold === "Gold", "B16 Browse detail's Overview shows a 'CAC Bean' row reading 'Gold' for a seeded Gold coin");
  ok(B5.green === "Green", "B17 -- 'Green' for a seeded Green coin");
  ok(B5.blank === null, "B18 -- and the row is omitted entirely (not shown blank) when CACBean is blank, same as Grade/Designation");

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

    return { browseEditPrefix, editSetPrefix, afterTyping };
  });
  ok(D4.browseEditPrefix === "$", "D9 browseEditValue sits in a .currency-input-row with a '$' prefix label");
  ok(D4.editSetPrefix === "$", "D10 -- and editSetValue has the identical wrapper");
  ok(D4.afterTyping === "12.3456789", "D11 a user's own typed entry is left completely alone — rounding is populate-time only, never applied to live typing");

  // Item 4 (batch round 2): the $ prefix treatment EXTENDED to Purchase
  // Price and Shipping Cost, across every form instance of the two fields
  // — supersedes the earlier D12 scope check ("Cost was NOT given the $
  // treatment"), which was correct for round 1 and is now a deliberate,
  // real extension, not a regression. Static markup, so no navigation
  // needed — these elements exist in the DOM from load, just hidden until
  // their section is opened.
  const D5 = await page.evaluate(() => {
    const wrapped = id => !!document.getElementById(id).closest(".currency-input-row");
    const prefixOf = id => {
      const wrap = document.getElementById(id).closest(".currency-input-row");
      return wrap ? wrap.querySelector(".currency-prefix").textContent : null;
    };
    const fields = ["browseEditCost", "browseEditShippingCost", "editSetCost", "editSetShippingCost",
      "wishlistPurchasePrice", "wishlistShippingCost", "purchasePrice", "shippingCost",
      "addSetCost", "addSetShippingCost"];
    return {
      allWrapped: fields.every(wrapped),
      allDollar: fields.every(id => prefixOf(id) === "$"),
      missing: fields.filter(id => !wrapped(id))
    };
  });
  ok(D5.allWrapped, "D12 all 10 Purchase Price/Shipping Cost instances across every form now sit in a .currency-input-row: " + JSON.stringify(D5.missing));
  ok(D5.allDollar, "D13 -- each with a '$' prefix label, same as Value");

  // Scope boundary held: item 4 is the VISUAL treatment only — Purchase
  // Price/Shipping Cost are hand-typed, never computed, so they get no
  // roundToCents() call anywhere. A populate from a stored (already
  // full-precision-free, since it was typed) value stays exactly what was
  // stored.
  const D6b = await page.evaluate(() => {
    __setBrowseEditWriteEnabledForTest(false);
    const coin = FAKE_COINS.find(c => c.id === "AY-00001");
    const origCost = coin.cost;
    coin.cost = 12.3456789; // a hypothetical unrounded value, same shape as the real Value bug
    showBrowseDetail(coin); showBrowseEditView(coin);
    const shown = document.getElementById("browseEditCost").value;
    coin.cost = origCost;
    return { shown };
  });
  ok(D6b.shown === "12.3456789", "D14 -- confirmed: browseEditCost populates VERBATIM, no rounding applied (item 4 never touched roundToCents' call sites)");

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
