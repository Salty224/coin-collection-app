// Status vocabulary simplification + the Sell/Remove action.
//
// All.Status now has exactly five selectable values: Owned, Sold, Gifted,
// Returned, Spent. "Retained" is being removed from Lookup_Statuses
// entirely and never existed as an app option; "At PCGS" is a real,
// pre-existing value on 4 real rows today but is retired from the picker
// going forward (it's moving to a still-undecided storage-related field,
// a separate task) — existing "At PCGS" rows must display correctly and
// be left untouched, never offered as a pick.
//
// The Sell/Remove action reuses Browse Edit's existing write path — this
// is not a second write mechanism. Selecting one of the four exit statuses
// reveals four existing All columns (SaleDate/Buyer/SalePrice/Platform),
// reused generically across all four reasons. Edit Set has no real write
// layer yet (a separate, larger task), so it stays session-only, matching
// its own Save button's existing honesty.
//
// The one real bug risk this feature had to design around: the Status
// select DISPLAYS "Owned" for a blank cell (blank already means Owned —
// Lookup_Statuses' own description says so), but if that display value
// were always sent to the write layer, an untouched blank row would get
// the literal string "Owned" WRITTEN the next time any unrelated field on
// the same form was saved — silently touching hundreds of real rows over
// time. Status is therefore included in the outgoing write ONLY when the
// user has genuinely interacted with the select this session (the same
// delegated touched-field tracking every other Browse Edit field already
// uses) — see readBrowseEditForm()'s own comment.
//
// See CLAUDE.md "Status vocabulary simplification + Sell/Remove action"
// (or the session log, if that section hasn't been written up yet).

const { defineSuite } = require("./harness");

module.exports = defineSuite("status-exit", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ================================================================
  // A. Vocabulary — exactly 5 options everywhere, never Retained/At PCGS
  // ================================================================
  const A = await page.evaluate(() => {
    navigate("addcoin");
    const addCoinOpts = Array.from(document.getElementById("addCoinStatus").options).map(o => o.value);

    navigate("browse");
    const coin = FAKE_COINS.find(c => c.id === "AY-00002"); // plain, blank Status
    showBrowseDetail(coin); showBrowseEditView(coin);
    const editCoinOpts = Array.from(document.getElementById("browseEditStatus").options).map(o => o.value);

    const setCoin = { id: "AY-TEST-SET-A", denom: "Multiple", name: "Test Set" };
    showBrowseDetail(setCoin);
    showBrowseEditSetView(setCoin);
    const editSetOpts = Array.from(document.getElementById("editSetStatus").options).map(o => o.value);

    return {
      addCoinOpts, editCoinOpts, editSetOpts,
      exitStatuses: EXIT_STATUSES.slice(),
      statusOptions: STATUS_OPTIONS.slice()
    };
  });
  const EXPECTED = ["Owned", "Sold", "Gifted", "Returned", "Spent"];
  ok(JSON.stringify(A.statusOptions) === JSON.stringify(EXPECTED), "A1 STATUS_OPTIONS is exactly the five real values, in order");
  ok(JSON.stringify(A.exitStatuses) === JSON.stringify(["Sold", "Gifted", "Returned", "Spent"]), "A2 EXIT_STATUSES excludes Owned");
  ok(JSON.stringify(A.addCoinOpts) === JSON.stringify(EXPECTED), "A3 Add Coin's Status select offers exactly the five real values");
  ok(JSON.stringify(A.editCoinOpts) === JSON.stringify(EXPECTED), "A4 Edit Coin's Status select -- same");
  ok(JSON.stringify(A.editSetOpts) === JSON.stringify(EXPECTED), "A5 Edit Set's Status select -- same");
  ok(!A.addCoinOpts.includes("At PCGS") && !A.editCoinOpts.includes("At PCGS") && !A.editSetOpts.includes("At PCGS"),
    "A6 'At PCGS' is never an offered option anywhere, despite being a real pre-existing Lookup_Statuses/All value");
  ok(!A.addCoinOpts.includes("Retained") && !A.editCoinOpts.includes("Retained"),
    "A7 'Retained' (being removed from Lookup_Statuses entirely) was never an app option to begin with");

  // ================================================================
  // B. statusSelectDisplayValue() + isExitStatus() in isolation
  // ================================================================
  const B = await page.evaluate(() => ({
    blank: statusSelectDisplayValue(""),
    nullish: statusSelectDisplayValue(null),
    owned: statusSelectDisplayValue("Owned"),
    sold: statusSelectDisplayValue("Sold"),
    atPcgs: statusSelectDisplayValue("At PCGS"),
    exitSold: isExitStatus("Sold"), exitGifted: isExitStatus("Gifted"),
    exitReturned: isExitStatus("Returned"), exitSpent: isExitStatus("Spent"),
    exitOwned: isExitStatus("Owned"), exitBlank: isExitStatus(""), exitAtPcgs: isExitStatus("At PCGS")
  }));
  ok(B.blank === "Owned" && B.nullish === "Owned", "B1 a blank/null cell displays as 'Owned'");
  ok(B.owned === "Owned" && B.sold === "Sold", "B2 an already-real value passes through unchanged");
  ok(B.atPcgs === "At PCGS", "B3 'At PCGS' passes through unchanged too -- never coerced to 'Owned' or blanked");
  ok(B.exitSold && B.exitGifted && B.exitReturned && B.exitSpent, "B4 all four exit statuses are recognized");
  ok(!B.exitOwned && !B.exitBlank && !B.exitAtPcgs, "B5 Owned/blank/At PCGS are NOT exit statuses (At PCGS never reveals the exit-detail fields)");

  // ================================================================
  // C. Edit Coin -- the real write path (mock Graph client, end-to-end).
  //    This is the block that actually proves the "don't stamp Owned onto
  //    a blank cell" fix, not just documents intent.
  // ================================================================
  const HEADERS = ["CollectionID", "Year", "MintMark", "Denomination", "Variety", "Description",
    "Value", "Cost", "Shipping", "Seller_Link", "PurchaseDate", "StorageLocation", "Container",
    "Grade", "GradeSource", "Designation", "SerNo", "CACBean", "Remarks", "Reviewed", "LastModified",
    "Finish", "CoinID", "Status", "SaleDate", "SalePrice", "Buyer", "Platform"];
  const C2 = await page.evaluate(async (headers) => {
    const row = ["AY-00001", 1889, "CC", "$1", "", "Morgan Dollar", 850, 620, 0, "", null,
      "Safe", "Capsule tray", "MS-64", "PCGS", "", "23456789", "", "", "", null,
      "Business Strike", "C-TEST-STATUS", "", null, null, "", ""]; // blank Status
    const mock = createMockGraphClient({ sheets: { All: [headers, row] } });
    __setGraphClientForTest(mock);
    __resetAllHeaderMapForTest();
    __setBrowseEditWriteEnabledForTest(true);

    const coin = FAKE_COINS.find(c => c.id === "AY-00001"); // reuse an existing demo coin's identity
    showBrowseDetail(coin);
    showBrowseEditView(coin);
    await loadBrowseEditSnapshot(coin);

    // Blank cell displays as "Owned" ...
    const displayedAsOwned = document.getElementById("browseEditStatus").value === "Owned";
    // ... but readBrowseEditForm() must NOT include Status at all, since the
    // user hasn't touched the select.
    const untouchedForm = readBrowseEditForm();
    const untouchedHasStatus = Object.prototype.hasOwnProperty.call(untouchedForm.workbook, "Status");

    // Make an unrelated edit (Notes) and save WITHOUT touching Status.
    document.getElementById("browseEditNotes").value = "unrelated edit";
    document.getElementById("browseEditNotes").dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("browseEditSaveBtn").click();
    await new Promise(r => setTimeout(r, 250));
    const statusAfterUnrelatedSave = mock._grids.All[1][headers.indexOf("Status")];

    // NOW genuinely touch Status -- pick Sold -- and save for real.
    document.getElementById("browseEditStatus").value = "Sold";
    document.getElementById("browseEditStatus").dispatchEvent(new Event("change", { bubbles: true }));
    const touchedForm = readBrowseEditForm();
    const touchedHasStatus = touchedForm.workbook.Status === "Sold";
    document.getElementById("browseEditSaveBtn").click();
    await new Promise(r => setTimeout(r, 250));
    const statusAfterExplicitSave = mock._grids.All[1][headers.indexOf("Status")];

    __setBrowseEditWriteEnabledForTest(null);
    __setGraphClientForTest(null);
    __resetAllHeaderMapForTest();

    return { displayedAsOwned, untouchedHasStatus, statusAfterUnrelatedSave, touchedHasStatus, statusAfterExplicitSave };
  }, HEADERS);
  ok(C2.displayedAsOwned, "C1 a blank Status cell displays as 'Owned' in the select");
  ok(!C2.untouchedHasStatus, "C2 readBrowseEditForm() omits Status entirely when the user hasn't touched the select");
  ok(C2.statusAfterUnrelatedSave === "" || C2.statusAfterUnrelatedSave == null,
    "C3 THE FIX: saving an unrelated field (Notes) with Status untouched leaves the blank cell blank -- 'Owned' is never silently stamped onto it");
  ok(C2.touchedHasStatus, "C4 once the select is genuinely changed, readBrowseEditForm() includes the real picked value");
  ok(C2.statusAfterExplicitSave === "Sold", "C5 an explicit pick of Sold is a real write -- the literal string lands in the workbook");

  // Verified negative control for C3: prove the omission is actually what
  // protects the cell, not a coincidence of the mock's own defaults --
  // simulate "touched" without a real user pick and confirm the same
  // unrelated save WOULD have stamped the display value.
  const C3neg = await page.evaluate(async (headers) => {
    const row = ["AY-00001", 1889, "CC", "$1", "", "Morgan Dollar", 850, 620, 0, "", null,
      "Safe", "Capsule tray", "MS-64", "PCGS", "", "23456789", "", "", "", null,
      "Business Strike", "C-TEST-STATUS-2", "", null, null, "", ""];
    const mock = createMockGraphClient({ sheets: { All: [headers, row] } });
    __setGraphClientForTest(mock);
    __resetAllHeaderMapForTest();
    __setBrowseEditWriteEnabledForTest(true);
    const coin = FAKE_COINS.find(c => c.id === "AY-00001");
    showBrowseDetail(coin);
    showBrowseEditView(coin);
    await loadBrowseEditSnapshot(coin);
    // Artificially mark the select touched WITHOUT a real user pick --
    // this reproduces what the old (buggy) unconditional-inclusion code
    // effectively did for every blank row, since it never checked touch
    // state at all.
    browseEditTouchedFields.add("browseEditStatus");
    document.getElementById("browseEditNotes").value = "unrelated edit 2";
    document.getElementById("browseEditNotes").dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("browseEditSaveBtn").click();
    await new Promise(r => setTimeout(r, 250));
    const stamped = mock._grids.All[1][headers.indexOf("Status")];
    __setBrowseEditWriteEnabledForTest(null);
    __setGraphClientForTest(null);
    __resetAllHeaderMapForTest();
    return { stamped };
  }, HEADERS);
  ok(C3neg.stamped === "Owned", "C6 negative control: with the select artificially marked touched (simulating the old unconditional-inclusion bug), the same unrelated save DOES stamp the literal 'Owned' -- proving the touched-gate in C3 is what's actually preventing it, not an unrelated mock quirk");

  // ================================================================
  // D. A real "At PCGS" row -- displays as-is, never coerced, never
  //    touched by an unrelated save.
  // ================================================================
  const D = await page.evaluate(async (headers) => {
    const row = ["AY-00001", 1889, "CC", "$1", "", "Morgan Dollar", 850, 620, 0, "", null,
      "Safe", "Capsule tray", "MS-64", "PCGS", "", "23456789", "", "", "", null,
      "Business Strike", "C-TEST-STATUS-3", "At PCGS", null, null, "", ""];
    const mock = createMockGraphClient({ sheets: { All: [headers, row] } });
    __setGraphClientForTest(mock);
    __resetAllHeaderMapForTest();
    __setBrowseEditWriteEnabledForTest(true);
    const coin = FAKE_COINS.find(c => c.id === "AY-00001");
    showBrowseDetail(coin);
    showBrowseEditView(coin);
    await loadBrowseEditSnapshot(coin);

    const sel = document.getElementById("browseEditStatus");
    const displayedAtPcgs = sel.value === "At PCGS";
    const injectedOption = Array.from(sel.options).some(o => o.value === "At PCGS" && o.dataset.injected === "1");

    document.getElementById("browseEditNotes").value = "unrelated edit 3";
    document.getElementById("browseEditNotes").dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("browseEditSaveBtn").click();
    await new Promise(r => setTimeout(r, 250));
    const stillAtPcgs = mock._grids.All[1][headers.indexOf("Status")];

    __setBrowseEditWriteEnabledForTest(null);
    __setGraphClientForTest(null);
    __resetAllHeaderMapForTest();
    return { displayedAtPcgs, injectedOption, stillAtPcgs };
  }, HEADERS);
  ok(D.displayedAtPcgs, "D1 a real 'At PCGS' row displays 'At PCGS' in the select, not blank/no-selection");
  ok(D.injectedOption, "D2 setSelectValuePreservingUnknown() injected a real <option> for it -- the same MintMark 'P' bug class this project has hit before");
  ok(D.stillAtPcgs === "At PCGS", "D3 an unrelated save leaves the existing 'At PCGS' value completely untouched");

  // ================================================================
  // E. Exit fields -- revealed only for an exit status, never auto-cleared
  //    on reverting to Owned, and always part of the write regardless of
  //    visibility.
  // ================================================================
  const E = await page.evaluate(async (headers) => {
    const row = ["AY-00001", 1889, "CC", "$1", "", "Morgan Dollar", 850, 620, 0, "", null,
      "Safe", "Capsule tray", "MS-64", "PCGS", "", "23456789", "", "", "", null,
      "Business Strike", "C-TEST-STATUS-4", "", null, null, "", ""];
    const mock = createMockGraphClient({ sheets: { All: [headers, row] } });
    __setGraphClientForTest(mock);
    __resetAllHeaderMapForTest();
    __setBrowseEditWriteEnabledForTest(true);
    const coin = FAKE_COINS.find(c => c.id === "AY-00001");
    showBrowseDetail(coin);
    showBrowseEditView(coin);
    await loadBrowseEditSnapshot(coin);

    const wrapHidden = () => getComputedStyle(document.getElementById("browseEditExitFieldsRow")).display === "none";
    const hiddenAtOwned = wrapHidden();

    document.getElementById("browseEditStatus").value = "Sold";
    document.getElementById("browseEditStatus").dispatchEvent(new Event("change", { bubbles: true }));
    const visibleAtSold = !wrapHidden();

    document.getElementById("browseEditSaleDate").value = "2026-06-01";
    document.getElementById("browseEditSaleDate").dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("browseEditBuyer").value = "Test Buyer";
    document.getElementById("browseEditBuyer").dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("browseEditSalePrice").value = "45";
    document.getElementById("browseEditSalePrice").dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("browseEditPlatform").value = "eBay";
    document.getElementById("browseEditPlatform").dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("browseEditSaveBtn").click();
    await new Promise(r => setTimeout(r, 250));
    const afterSoldSave = {
      status: mock._grids.All[1][headers.indexOf("Status")],
      buyer: mock._grids.All[1][headers.indexOf("Buyer")],
      salePrice: mock._grids.All[1][headers.indexOf("SalePrice")],
      platform: mock._grids.All[1][headers.indexOf("Platform")]
    };

    // Now revert to Owned and save again -- the exit block hides, but the
    // four fields must NOT be cleared (Ray's explicit call: preserve
    // history, don't auto-clear).
    document.getElementById("browseEditStatus").value = "Owned";
    document.getElementById("browseEditStatus").dispatchEvent(new Event("change", { bubbles: true }));
    const hiddenAfterRevert = wrapHidden();
    const fieldsStillShowValues = document.getElementById("browseEditBuyer").value === "Test Buyer" &&
      document.getElementById("browseEditSalePrice").value === "45";
    document.getElementById("browseEditSaveBtn").click();
    await new Promise(r => setTimeout(r, 250));
    const afterRevertSave = {
      status: mock._grids.All[1][headers.indexOf("Status")],
      buyer: mock._grids.All[1][headers.indexOf("Buyer")],
      salePrice: mock._grids.All[1][headers.indexOf("SalePrice")]
    };

    __setBrowseEditWriteEnabledForTest(null);
    __setGraphClientForTest(null);
    __resetAllHeaderMapForTest();
    return { hiddenAtOwned, visibleAtSold, afterSoldSave, hiddenAfterRevert, fieldsStillShowValues, afterRevertSave };
  }, HEADERS);
  ok(E.hiddenAtOwned, "E1 the exit-fields block is hidden while Status is Owned");
  ok(E.visibleAtSold, "E2 picking Sold reveals it");
  ok(E.afterSoldSave.status === "Sold" && E.afterSoldSave.buyer === "Test Buyer" &&
     Number(E.afterSoldSave.salePrice) === 45 && E.afterSoldSave.platform === "eBay",
     "E3 all four exit fields plus Status itself write correctly on a real save");
  ok(E.hiddenAfterRevert, "E4 the block hides again once Status is switched back to Owned");
  ok(E.fieldsStillShowValues, "E5 -- but the fields themselves are NOT cleared when hidden (Ray's explicit 'preserve history' call)");
  ok(E.afterRevertSave.status === "Owned", "E6 the revert to Owned is itself a real, explicit write");
  ok(E.afterRevertSave.buyer === "Test Buyer" && Number(E.afterRevertSave.salePrice) === 45,
    "E7 -- and the untouched exit fields still write back their unchanged values (no diff, but no data loss either)");

  // ================================================================
  // F. Gifted defaults Sale Price to 0 -- only when blank, never clobbering
  //    a value the user already typed.
  // ================================================================
  const F = await page.evaluate(() => {
    navigate("browse");
    const coin = FAKE_COINS.find(c => c.id === "AY-00001");
    showBrowseDetail(coin); showBrowseEditView(coin);

    document.getElementById("browseEditSalePrice").value = "";
    document.getElementById("browseEditStatus").value = "Gifted";
    document.getElementById("browseEditStatus").dispatchEvent(new Event("change", { bubbles: true }));
    const defaultedToZero = document.getElementById("browseEditSalePrice").value === "0";

    // Switch away and back with a real typed value in place -- must survive.
    document.getElementById("browseEditStatus").value = "Sold";
    document.getElementById("browseEditStatus").dispatchEvent(new Event("change", { bubbles: true }));
    document.getElementById("browseEditSalePrice").value = "125";
    document.getElementById("browseEditStatus").value = "Gifted";
    document.getElementById("browseEditStatus").dispatchEvent(new Event("change", { bubbles: true }));
    const preservedTypedValue = document.getElementById("browseEditSalePrice").value === "125";

    return { defaultedToZero, preservedTypedValue };
  });
  ok(F.defaultedToZero, "F1 picking Gifted with a blank Sale Price auto-fills 0");
  ok(F.preservedTypedValue, "F2 -- but never clobbers a Sale Price the user already typed");

  // ================================================================
  // G. Browse detail's read-only Overview -- omitted for Owned, shown (incl.
  //    a real $0) for an exit status. Uses the seeded FAKE_COINS demo rows.
  // ================================================================
  const G = await page.evaluate(() => {
    navigate("browse");
    function overviewRowText(id, label) {
      const coin = FAKE_COINS.find(c => c.id === id);
      showBrowseDetail(coin);
      const rows = Array.from(document.querySelectorAll(".detail-row"));
      const row = rows.find(r => (r.querySelector(".detail-label") || {}).textContent === label);
      return row ? row.querySelector(".detail-value").textContent.trim() : null;
    }
    return {
      soldStatus: overviewRowText("AY-00005", "Status"),
      soldPrice: overviewRowText("AY-00005", "Sale Price"),
      giftedStatus: overviewRowText("AY-00007", "Status"),
      giftedPrice: overviewRowText("AY-00007", "Sale Price"), // seeded salePrice: 0
      ownedStatus: overviewRowText("AY-00002", "Status") // blank Status, never seeded
    };
  });
  ok(G.soldStatus === "Sold", "G1 an exit-status coin (AY-00005, seeded Sold) shows a 'Status' Overview row");
  ok(G.soldPrice === "$690", "G2 -- and its Sale Price");
  ok(G.giftedStatus === "Gifted", "G3 the Gifted demo row (AY-00007) shows 'Gifted'");
  ok(G.giftedPrice === "$0", "G4 -- and its real $0 Sale Price is SHOWN, not omitted (!= null, not truthy -- Gifted's own convention)");
  ok(G.ownedStatus === null, "G5 a plain Owned/blank-Status coin shows no Status row at all -- omitted, not shown blank");

  // ================================================================
  // H. Add Coin -- plain 5-option select, no reveal, defaults to Owned,
  //    and the draft's own field is `allStatus`, never colliding with the
  //    draft's OWN workflow status (COIN_DRAFT_STATUS.DRAFT/READY/...).
  // ================================================================
  const H = await page.evaluate(() => {
    navigate("addcoin");
    const defaultsToOwned = document.getElementById("addCoinStatus").value === "Owned";
    const noRevealBlock = !document.getElementById("addCoinExitFieldsRow"); // never built for Add Coin at all

    document.getElementById("addCoinStatus").value = "Sold";
    const form = readAddCoinFormForDraft();
    const draftOwned = buildCoinDraft("AY-TEST-H1", Object.assign({}, form, { allStatus: "Owned" }), null);
    const draftSold = buildCoinDraft("AY-TEST-H2", Object.assign({}, form, { allStatus: "Sold" }), null);

    return {
      defaultsToOwned, noRevealBlock,
      formAllStatus: form.allStatus,
      draftOwnedAllStatus: draftOwned.allStatus,
      draftOwnedWorkflowStatus: draftOwned.status, // must still be COIN_DRAFT_STATUS.DRAFT, untouched
      allValuesOwned: coinDraftToAllValues(draftOwned).Status,
      allValuesSold: coinDraftToAllValues(draftSold).Status,
      coinDraftStatusConst: COIN_DRAFT_STATUS.DRAFT
    };
  });
  ok(H.defaultsToOwned, "H1 Add Coin's Status select defaults to Owned");
  ok(H.noRevealBlock, "H2 Add Coin has no exit-fields reveal block at all -- Ray's explicit scoping (rare edge case, 'add then edit')");
  ok(H.formAllStatus === "Sold", "H3 readAddCoinFormForDraft() reads the picked value into `allStatus`");
  ok(H.draftOwnedAllStatus === "Owned", "H4 buildCoinDraft() carries it through under the same name");
  ok(H.draftOwnedWorkflowStatus === H.coinDraftStatusConst, "H5 the draft's OWN workflow `status` field (Draft/Ready/Promoted) is completely untouched by allStatus -- no field collision");
  // Superseded (see tests/verify_status_owned_on_create.js): Copilot has
  // since backfilled every existing row to a literal "Owned", so a
  // brand-new row now matches that instead of the old blank convention --
  // this assertion follows the real design change rather than being
  // weakened.
  ok(H.allValuesOwned === "Owned", "H6 coinDraftToAllValues() writes the literal 'Owned' for the Owned default (matches Copilot's backfill of every existing row)");
  ok(H.allValuesSold === "Sold", "H7 -- and a genuine exit-status pick still writes its own real literal string");

  // ================================================================
  // I. Edit Set -- session-only (no real write layer), same as its
  //    existing Save button's own honesty. Status/exit fields still work
  //    as ordinary session-only fields.
  // ================================================================
  const I = await page.evaluate(() => {
    navigate("browse");
    const setCoin = { id: "AY-TEST-SET-1", denom: "Multiple", name: "Test Proof Set", year: 2021, value: 100 };
    showBrowseDetail(setCoin);
    showBrowseEditSetView(setCoin);

    const wrapHiddenAtOwned = getComputedStyle(document.getElementById("editSetExitFieldsRow")).display === "none";
    document.getElementById("editSetStatus").value = "Sold";
    document.getElementById("editSetStatus").dispatchEvent(new Event("change", { bubbles: true }));
    const wrapVisibleAtSold = getComputedStyle(document.getElementById("editSetExitFieldsRow")).display !== "none";
    document.getElementById("editSetBuyer").value = "Set Buyer";
    document.getElementById("editSetSalePrice").value = "300";

    document.getElementById("browseEditSetSaveBtn").click();
    const toast = document.getElementById("toast") ? document.getElementById("toast").textContent : "";

    return {
      wrapHiddenAtOwned, wrapVisibleAtSold,
      recordStatus: setCoin.status, recordBuyer: setCoin.buyer, recordSalePrice: setCoin.salePrice,
      sessionOnlyToast: /session only|not saved to OneDrive/i.test(toast)
    };
  });
  ok(I.wrapHiddenAtOwned, "I1 Edit Set's exit-fields block also hides for Owned");
  ok(I.wrapVisibleAtSold, "I2 -- and reveals for Sold, same mechanism as Edit Coin");
  ok(I.recordStatus === "Sold" && I.recordBuyer === "Set Buyer" && Number(I.recordSalePrice) === 300,
    "I3 the session-only Save writes Status + exit fields onto the in-memory record (real, just not persisted to OneDrive)");
  ok(I.sessionOnlyToast, "I4 the save toast still honestly says session-only/not saved to OneDrive -- Sell/Remove on a Set does NOT silently gain a real write path");

  // ================================================================
  // J. Ledger -- search finds Owned coins, excludes exited ones; exit
  //    history lists exited coins with their Status + Sale Price; a result
  //    row opens Browse detail with Back returning to Ledger.
  // ================================================================
  const J = await page.evaluate(() => {
    navigate("stats");
    const input = document.getElementById("ledgerSearchInput");

    // AY-00005 ("Indian Head Cent") is seeded Sold -- searching its own
    // name must NOT surface it as a still-Owned coin to act on.
    input.value = "Indian Head";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const soldExcludedFromSearch = document.getElementById("ledgerSearchResults").textContent.indexOf("AY-00005") === -1;

    // An ordinary Owned coin DOES show up.
    input.value = "Morgan";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const ownedFoundInSearch = document.getElementById("ledgerSearchResults").textContent.indexOf("AY-00001") !== -1;

    // Clearing the query clears results (don't dump every Owned row unasked).
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const emptyQueryShowsNothing = document.getElementById("ledgerSearchResults").children.length === 0;

    // Exit history lists both seeded exit coins.
    const historyText = document.getElementById("ledgerExitHistoryList").textContent;
    const soldInHistory = historyText.indexOf("AY-00005") !== -1 && historyText.indexOf("Sold") !== -1;
    const giftedInHistory = historyText.indexOf("AY-00007") !== -1 && historyText.indexOf("Gifted") !== -1 && historyText.indexOf("$0") !== -1;
    const emptyNoteHidden = document.getElementById("ledgerExitHistoryEmpty").classList.contains("hidden");

    // Clicking a search result opens Browse detail; Back returns to Ledger.
    input.value = "Morgan";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const resultRow = document.getElementById("ledgerSearchResults").querySelector(".wish-item");
    resultRow.click();
    const openedDetail = document.getElementById("view-browse").classList.contains("active") &&
      document.getElementById("browseDetailView").style.display !== "none";
    navBackHandler();
    const returnedToLedger = document.getElementById("view-stats").classList.contains("active");

    return { soldExcludedFromSearch, ownedFoundInSearch, emptyQueryShowsNothing, soldInHistory, giftedInHistory, emptyNoteHidden, openedDetail, returnedToLedger };
  });
  ok(J.soldExcludedFromSearch, "J1 a Sold coin is EXCLUDED from Ledger's own-coin search, even when its name matches -- this list is for coins still available to act on");
  ok(J.ownedFoundInSearch, "J2 an ordinary Owned coin IS found by the same search");
  ok(J.emptyQueryShowsNothing, "J3 an empty query shows no results (doesn't dump every Owned row unasked)");
  ok(J.soldInHistory, "J4 Exit History lists the seeded Sold coin with its Status");
  ok(J.giftedInHistory, "J5 -- and the seeded Gifted coin, including its real $0 Sale Price shown (not blank)");
  ok(J.emptyNoteHidden, "J6 the 'no exit history yet' placeholder is hidden once real exit rows exist");
  ok(J.openedDetail, "J7 clicking a search result opens that coin's Browse detail view (same 'row -> detail, Edit lives there' convention as every other coin list)");
  ok(J.returnedToLedger, "J8 Back from there returns to Ledger, not Browse's own grid -- same per-origin back-handler pattern as Spotlight/Albums");

  // Full nav smoke + overflow with every new UI piece visible at once.
  const N = await page.evaluate(() => {
    navigate("addcoin");
    document.getElementById("addCoinStatus").value = "Sold";
    navigate("browse");
    const coin = FAKE_COINS.find(c => c.id === "AY-00001");
    showBrowseDetail(coin); showBrowseEditView(coin);
    document.getElementById("browseEditStatus").value = "Sold";
    document.getElementById("browseEditStatus").dispatchEvent(new Event("change", { bubbles: true }));
    navigate("stats");
    document.getElementById("ledgerSearchInput").value = "a";
    document.getElementById("ledgerSearchInput").dispatchEvent(new Event("input", { bubbles: true }));
    return { noOverflow: document.body.scrollWidth <= window.innerWidth };
  });
  ok(N.noOverflow, "N1 no page-level horizontal overflow with every new UI piece visible at once");
}, module);
