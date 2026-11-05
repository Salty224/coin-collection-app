// Add Coin's Finish / Category gate (Nov 2026, Ray).
//
// WHY. AY-00760 (2026 Lincoln Shield Cent) reached the All sheet with Finish
// and Category BLANK even though its one catalog row says Business Strike:
// a single matching row made the form "confident" while the form's Finish was
// blank, and nothing asked for either. The rule now:
//   G1  a catalog match alone is not enough; the form also needs a Finish AND
//       a Category before Save to Database is offered. Save to Staging never
//       needs either.
//   G2  one-tap buttons, never a silent fill: "Use <Finish> (from the
//       catalog)" and, beside the Category dropdown, "Coin".
//   G3  completeAddCoinSave() promotes only when the form has both; otherwise
//       the coin is saved to Staging and the toast says why.
//   G4  Promote from Staging needs the draft's finish and category too, EXCEPT
//       Force Add.
// Category is a dropdown filled from the workbook's Lookup_Categories (column
// A, read only; the app never adds a value). A bullion pick keeps its own
// Category and locks the dropdown.
//
// The negative controls (A1, C1) assert on what only the gated code produces:
// each FAILS on main (a lone catalog row with a blank Finish used to be
// confident, and a blank-Finish draft used to promote).

const { defineSuite } = require("./harness");

const ALL_HEADERS = [
  "CollectionID", "CoinID", "Denomination", "Category", "Year", "MintMark",
  "Variety", "Description", "Finish", "Designation", "Grade", "GradeSource",
  "SerNo", "CACBean", "Cost", "Shipping", "Total", "Seller_Link",
  "PurchaseDate", "SpotValue", "Value", "StorageLocation", "Container",
  "Remarks", "Reviewed", "LastModified", "Error", "Status",
  // FaceValue (al F6): the real All sheet has it and Promote writes it; the
  // mock lacked it, so the write was silently dropped before F6.
  "FaceValue"
];
function seedMock() {
  return { sheets: { All: [ALL_HEADERS.slice(), ["AY-00500", "C-OLD", "$1", "", 1889, "CC"]] } };
}

// The AY-00760 situation: one catalog row, Business Strike.
const SHIELD = {
  denom: "1C", year: 2026, mint: "", variety: "", description: "Lincoln Shield Cent",
  finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0,
  coinId: "C-2026--1C-01", composition: "Copper-plated zinc"
};

const DRAFT = (id, extra) => Object.assign({
  type: "coin", version: 1, collectionID: id, status: "Ready for reconciliation",
  denom: "1C", category: "", year: "2026", mint: "", variety: "", description: "Lincoln Shield Cent",
  finish: "", designation: "", errorDesc: "", grade: "MS-66", gradeSource: "PCGS", serNo: "",
  cacBean: "", cost: 3, shippingCost: 0, purchaseDate: "2026-10-01", vendor: "", storageLocation: "",
  container: "", assignAlbum: "", remarks: "", itemNumber: "", gsid: "",
  coinId: "C-2026--1C-01", matchedHow: "single", photos: [], receiptPhoto: "",
  researchNote: "", allRowWritten: false, forceAdded: false, filesMovedOnPromotion: false,
  createdDate: "2026-10-20T17:57:36Z"
}, extra || {});

module.exports = defineSuite("addcoin-finish-category-gate", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);

  await page.evaluate((seed) => {
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    window.__setup = (extraSeed) => {
      const mock = createMockGraphClient(extraSeed || seed);
      __setGraphClientForTest(mock);
      __setAddCoinWriteEnabledForTest(true);
      __resetAllHeaderMapForTest();
      return mock;
    };
    window.__teardown = () => {
      try { resetAddCoinForm(); } catch (e) {}
      __setLiveDbCoinsForTest(null);
      __setLiveLookupCategoriesForTest(null, false);
      __setLiveDataModeForTest(null);
      __setAddCoinWriteEnabledForTest(null);
      __setGraphClientForTest(null);
      __resetAllHeaderMapForTest();
    };
    window.__fill = (o) => {
      navigate("addcoin");
      resetAddCoinForm();
      const el = (id) => document.getElementById(id);
      el("denomination").value = o.denom || "1C";
      el("denomination").dispatchEvent(new Event("change"));
      el("year").value = o.year || "2026";
      el("mintMark").value = o.mint || "";
      el("finish").value = o.finish || "";
      el("year").dispatchEvent(new Event("input"));
      checkDbCoinsMatch();
    };
    window.__shown = (id) => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== "none" && !e.classList.contains("hidden"); };
    window.__toast = () => { const t = document.getElementById("toast"); return t.classList.contains("show") ? t.textContent : ""; };
    window.__wait = (ms) => new Promise(r => setTimeout(r, ms));
  }, seedMock());

  // ============ A. G1 / G2: the form ============
  // A1 is the negative control: on main this lone-candidate, blank-Finish form
  // is confident and Save to Database is shown.
  const A = await page.evaluate(() => {
    __setLiveDbCoinsForTest([{ denom: "1C", year: 2026, mint: "", variety: "", description: "Lincoln Shield Cent",
      finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0, coinId: "C-2026--1C-01", composition: "x" }]);
    const out = {};
    const snap = () => ({
      confident: isConfidentMatch(),
      dbBtn: __shown("saveToDatabaseBtn"),
      notConfident: __shown("saveNotConfidentBanner"),
      msg: document.getElementById("saveNotConfidentMsg").textContent,
      useBtn: __shown("addCoinUseCatalogFinishBtn"),
      useBtnText: document.getElementById("addCoinUseCatalogFinishBtn").textContent,
      finish: document.getElementById("finish").value,
      category: addCoinCategoryValue()
    });

    // A1: one candidate, Finish blank, Category blank.
    __fill({});
    out.blank = snap();

    // A2: Finish picked by hand, Category still blank.
    __fill({ finish: "Business Strike" });
    out.finishOnly = snap();

    // A3: Category via the Coin button, Finish blank: the catalog Finish button appears.
    __fill({});
    document.getElementById("addCoinCategoryCoinBtn").click();
    out.categoryOnly = snap();
    out.selectShowsCoin = document.getElementById("addCoinCategory").value;
    // The one-tap Finish fill.
    document.getElementById("addCoinUseCatalogFinishBtn").click();
    out.afterUseFinish = snap();

    // A4: both set by hand is confident, and stays editable: clearing Finish again drops it.
    document.getElementById("finish").value = "";
    document.getElementById("finish").dispatchEvent(new Event("change"));
    out.finishCleared = snap();

    // A5: a catalog Finish the dropdown has no option for: no button, but the banner still names it.
    __setLiveDbCoinsForTest([{ denom: "1C", year: 2026, mint: "", variety: "", description: "Lincoln Shield Cent",
      finish: "Weird Finish", designation: "", gsid: "", pcgs: "", mintage: 0, coinId: "C-2026--1C-02", composition: "x" }]);
    __fill({});
    out.noOption = snap();
    // A6: a catalog row with no Finish at all.
    __setLiveDbCoinsForTest([{ denom: "1C", year: 2026, mint: "", variety: "", description: "Lincoln Shield Cent",
      finish: "", designation: "", gsid: "", pcgs: "", mintage: 0, coinId: "C-2026--1C-03", composition: "x" }]);
    __fill({});
    out.noCatalogFinish = snap();
    __teardown();
    return out;
  });
  ok("A1 NEGATIVE CONTROL: one catalog row + Finish blank + Category blank is NOT confident and Save to Database is hidden: " + JSON.stringify(A.blank),
    A.blank.confident === false && A.blank.dbBtn === false && A.blank.notConfident === true);
  ok("A1b -- the banner names what is missing and the catalog's own Finish: " + A.blank.msg,
    /Pick a Finish and a Category to save straight to the database/.test(A.blank.msg) && /the catalog entry says Business Strike/.test(A.blank.msg) &&
    /Save to Staging stays available/.test(A.blank.msg));
  ok("A1c -- and the one-tap button reads exactly 'Use Business Strike (from the catalog)': " + A.blank.useBtnText,
    A.blank.useBtn === true && A.blank.useBtnText === "Use Business Strike (from the catalog)");
  ok("A2 a Finish alone is not enough: still not confident, the banner now names only the Category, no Finish button: " + A.finishOnly.msg,
    A.finishOnly.confident === false && /Pick a Category to save straight/.test(A.finishOnly.msg) &&
    !/Finish/.test(A.finishOnly.msg.split("Save to Staging")[0]) && A.finishOnly.useBtn === false);
  ok("A3 the Coin button records Category 'Coin' (the dropdown shows it) but Finish still gates: " + JSON.stringify(A.categoryOnly),
    A.categoryOnly.category === "Coin" && A.selectShowsCoin === "Coin" && A.categoryOnly.confident === false &&
    /Pick a Finish to save straight/.test(A.categoryOnly.msg) && A.categoryOnly.useBtn === true);
  ok("A3b tapping 'Use Business Strike' fills Finish: confident, Save to Database shown, button gone: " + JSON.stringify(A.afterUseFinish),
    A.afterUseFinish.finish === "Business Strike" && A.afterUseFinish.confident === true &&
    A.afterUseFinish.dbBtn === true && A.afterUseFinish.useBtn === false);
  ok("A4 both choices stay editable: clearing the Finish again makes it not confident: " + JSON.stringify(A.finishCleared),
    A.finishCleared.finish === "" && A.finishCleared.confident === false && A.finishCleared.dbBtn === false);
  ok("A5 a catalog Finish the dropdown cannot hold gets no button (nothing is filled that the form cannot show): " + JSON.stringify(A.noOption),
    A.noOption.useBtn === false && /the catalog entry says Weird Finish/.test(A.noOption.msg));
  ok("A6 a catalog row with no Finish: banner asks for one, no button, nothing invented: " + JSON.stringify(A.noCatalogFinish),
    A.noCatalogFinish.useBtn === false && !/the catalog entry says/.test(A.noCatalogFinish.msg) && A.noCatalogFinish.confident === false);

  // ============ B. G3: the save-time belt ============
  const B = await page.evaluate(async () => {
    const out = {};
    // B1: a forced direct save with a blank Finish writes no All row.
    {
      const mock = __setup();
      __setLiveDbCoinsForTest([{ denom: "1C", year: 2026, mint: "", variety: "", description: "Lincoln Shield Cent",
        finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0, coinId: "C-2026--1C-01", composition: "x" }]);
      __fill({});
      document.getElementById("addCoinCategoryCoinBtn").click(); // Category yes, Finish blank
      const rowsBefore = mock._grids.All.length;
      saveAddCoinForm("database"); // forced: the button is hidden, the function is not
      await __wait(900);
      const draft = await mock.getJson(writePaths().stagingBase + "/AY-00001/coin.json");
      out.b1 = { rowsBefore, rowsAfter: mock._grids.All.length, status: draft && draft.status, savedVia: draft && draft.savedVia,
        category: draft && draft.category, toast: __toast() };
      __teardown();
    }
    // B2: both missing: the toast names both.
    {
      const mock = __setup();
      __setLiveDbCoinsForTest([{ denom: "1C", year: 2026, mint: "", variety: "", description: "Lincoln Shield Cent",
        finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0, coinId: "C-2026--1C-01", composition: "x" }]);
      __fill({});
      saveAddCoinForm("database");
      await __wait(900);
      out.b2 = { rowsAfter: mock._grids.All.length, toast: __toast() };
      __teardown();
    }
    // B3: positive control: Finish + Category present, the same save writes the row with both.
    {
      const mock = __setup();
      __setLiveDbCoinsForTest([{ denom: "1C", year: 2026, mint: "", variety: "", description: "Lincoln Shield Cent",
        finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0, coinId: "C-2026--1C-01", composition: "x" }]);
      __fill({ finish: "Business Strike" });
      document.getElementById("addCoinCategoryCoinBtn").click();
      saveAddCoinForm("database");
      await __wait(1500);
      const H = mock._grids.All[0];
      const row = mock._grids.All.find(r => r[0] === "AY-00001");
      const draft = await mock.getJson(writePaths().stagingBase + "/AY-00001/coin.json");
      out.b3 = { row: !!row, finish: row && row[H.indexOf("Finish")], category: row && row[H.indexOf("Category")],
        status: draft && draft.status, savedVia: draft && draft.savedVia };
      __teardown();
    }
    return out;
  });
  ok("B1 a forced Save to Database with a blank Finish writes NO All row and leaves a Staging draft: " + JSON.stringify(B.b1),
    B.b1.rowsAfter === B.b1.rowsBefore && /^Draft/.test(B.b1.status || "") && B.b1.savedVia === "staging" && B.b1.category === "Coin");
  ok("B1b -- and the toast says it was not written and why: " + B.b1.toast,
    /NOT written to the All sheet/.test(B.b1.toast) && /Finish is needed first/.test(B.b1.toast));
  ok("B2 with neither Finish nor Category the toast names both: " + B.b2.toast,
    /Finish and Category are needed first/.test(B.b2.toast));
  ok("B2b -- and still no All row: " + B.b2.rowsAfter, B.b2.rowsAfter === 2);
  ok("B3 positive control: with Finish and Category the same save writes the row, both columns filled, draft PROMOTED: " + JSON.stringify(B.b3),
    B.b3.row === true && B.b3.finish === "Business Strike" && B.b3.category === "Coin" && B.b3.savedVia === "direct" && /Promoted|PROMOTED/i.test(B.b3.status || ""));

  // ============ C. G4: Promote from Staging ============
  const C = await page.evaluate(async (draftFn) => {
    const out = {};
    const draftOf = (id, extra) => Object.assign(JSON.parse(draftFn), { collectionID: id }, extra || {});
    const mock = __setup();
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00770/coin.json", draftOf("AY-00770"));                              // both blank
    await mock.uploadJson(base + "/AY-00771/coin.json", draftOf("AY-00771", { finish: "Business Strike" })); // Category blank
    await mock.uploadJson(base + "/AY-00772/coin.json", draftOf("AY-00772", { category: "Coin" }));          // Finish blank
    await mock.uploadJson(base + "/AY-00773/coin.json", draftOf("AY-00773", { finish: "Business Strike", category: "Coin" }));
    await mock.uploadJson(base + "/AY-00774/coin.json", draftOf("AY-00774", { coinId: "" }));                // Force Add, both blank
    const before = mock._grids.All.length;
    out.c1 = await promoteCoinDraftToAllSheet("AY-00770");
    out.c1rows = mock._grids.All.length - before;
    out.c2 = await promoteCoinDraftToAllSheet("AY-00771");
    out.c3 = await promoteCoinDraftToAllSheet("AY-00772");
    out.c4 = await promoteCoinDraftToAllSheet("AY-00773");
    out.c5 = await promoteCoinDraftToAllSheet("AY-00774", { force: true });
    const H = mock._grids.All[0];
    const row = (id) => mock._grids.All.find(r => r[0] === id);
    out.row773 = row("AY-00773") ? { finish: row("AY-00773")[H.indexOf("Finish")], category: row("AY-00773")[H.indexOf("Category")] } : null;
    out.row774 = row("AY-00774") ? { finish: row("AY-00774")[H.indexOf("Finish")], category: row("AY-00774")[H.indexOf("Category")] } : null;
    out.row770 = !!row("AY-00770"); out.row771 = !!row("AY-00771"); out.row772 = !!row("AY-00772");
    __teardown();
    return out;
  }, JSON.stringify(DRAFT("X")));
  ok("C1 NEGATIVE CONTROL: Promote of a draft with a blank Finish AND Category is refused, writes no row: " + JSON.stringify([C.c1.ok, C.c1.reason, C.c1.message, C.c1rows]),
    C.c1.ok === false && C.c1.reason === "needs-finish-category" && C.c1rows === 0 && C.row770 === false);
  ok("C1b -- the message names both and points at Edit: " + C.c1.message,
    /needs Finish and Category before it can be promoted/.test(C.c1.message) && /Edit the draft/.test(C.c1.message));
  ok("C2 a missing Category alone refuses, naming Category only: " + C.c2.message,
    C.c2.ok === false && C.c2.reason === "needs-finish-category" && /needs Category before/.test(C.c2.message) && C.row771 === false);
  ok("C3 a missing Finish alone refuses, naming Finish only: " + C.c3.message,
    C.c3.ok === false && /needs Finish before/.test(C.c3.message) && C.row772 === false);
  ok("C4 positive control: with both the same Promote writes the row, Finish and Category in their columns: " + JSON.stringify([C.c4.ok, C.row773]),
    C.c4.ok === true && C.row773 && C.row773.finish === "Business Strike" && C.row773.category === "Coin");
  ok("C5 THE EXCEPTION: Force Add still records a coin with blank Finish and Category (row created, those cells blank): " + JSON.stringify([C.c5.ok, C.row774]),
    C.c5.ok === true && C.row774 && !C.row774.finish && !C.row774.category);

  // ============ C6. The Promote buttons say it before the tap ============
  const C6 = await page.evaluate(async (draftFn) => {
    const out = {};
    const draftOf = (id, extra) => Object.assign(JSON.parse(draftFn), { collectionID: id }, extra || {});
    const mock = __setup();
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00780/coin.json", draftOf("AY-00780"));                                              // gaps
    await mock.uploadJson(base + "/AY-00781/coin.json", draftOf("AY-00781", { finish: "Business Strike", category: "Coin" })); // ready
    navigate("staging"); await renderStagingList(); await __wait(300);
    const itemOf = (container, id) => [...document.querySelectorAll(container + " .wish-item")].find(x => x.textContent.indexOf(id) !== -1);
    const s780 = itemOf("#stagingContainer", "AY-00780"), s781 = itemOf("#stagingContainer", "AY-00781");
    out.review = {
      gapPromote: !!(s780 && s780.querySelector(".staging-promote-row")),
      gapNote: s780 ? (s780.querySelector(".staging-gate-note") || {}).textContent || "" : "",
      gapEdit: !!(s780 && s780.querySelector(".staging-edit")),
      gapRevert: !!(s780 && s780.querySelector(".staging-revert")),
      okPromote: !!(s781 && s781.querySelector(".staging-promote-row"))
    };
    navigate("needsdbcoins"); await renderNeedsAttentionHub(); await __wait(300);
    const d780 = itemOf("#docketStagingContainer", "AY-00780"), d781 = itemOf("#docketStagingContainer", "AY-00781");
    out.docket = {
      gapPromote: !!(d780 && d780.querySelector(".docket-promote")),
      gapText: d780 ? d780.textContent : "",
      gapEdit: !!(d780 && d780.querySelector(".docket-edit")),
      okPromote: !!(d781 && d781.querySelector(".docket-promote"))
    };
    __teardown();
    return out;
  }, JSON.stringify(DRAFT("X")));
  ok("C6 Staging Review: a Ready draft with gaps has NO Promote, a 'Needs Finish and Category — Edit' note, Edit and Revert: " + JSON.stringify(C6.review),
    C6.review.gapPromote === false && /Needs Finish and Category — Edit/.test(C6.review.gapNote) && C6.review.gapEdit && C6.review.gapRevert);
  ok("C6b -- and a complete draft still has Promote: " + C6.review.okPromote, C6.review.okPromote === true);
  ok("C7 Docket: the same draft shows no Promote, 'needs Finish and Category — Edit', and an Edit button: " + C6.docket.gapText.replace(/\s+/g, " ").slice(0, 160),
    C6.docket.gapPromote === false && /needs Finish and Category — Edit/.test(C6.docket.gapText) && C6.docket.gapEdit === true);
  ok("C7b -- and a complete draft still has Promote on the Docket: " + C6.docket.okPromote, C6.docket.okPromote === true);

  // ============ D. The Category control and Lookup_Categories ============
  const D = await page.evaluate(() => {
    const out = {};
    const sel = () => document.getElementById("addCoinCategory");
    const optionValues = () => [...sel().options].map(o => o.value);
    // D1: column A of the sheet, header excluded; blanks, dividers, duplicates dropped; other columns ignored.
    out.list = buildLookupCategoryList([
      { "Category": "Coin", "Notes": "everyday" }, { "Category": " Proof Set ", "Notes": "x" },
      { "Category": "Coin", "Notes": "dup" }, { "Category": "", "Notes": "blank" },
      { "Category": "═══ SETS ═══" }, { "Category": "Commemorative" }
    ]);
    out.emptyHeaderOnly = buildLookupCategoryList([]);
    out.notArray = buildLookupCategoryList(null);

    // D2: dropdown filled from the list; the Coin button works; a dropdown pick is explicit.
    __setLiveDataModeForTest("live");
    __setLiveLookupCategoriesForTest(["Coin", "Proof Set", "Commemorative"], false);
    __fill({});
    out.options = optionValues();
    out.noteLoaded = document.getElementById("addCoinCategoryNote").textContent;
    sel().value = "Commemorative"; sel().dispatchEvent(new Event("change"));
    out.pick = { value: addCoinCategoryValue(), formCategory: readAddCoinFormForDraft().category };
    document.getElementById("addCoinCategoryCoinBtn").click();
    out.afterCoin = { value: addCoinCategoryValue(), shown: sel().value };
    sel().value = ""; sel().dispatchEvent(new Event("change"));
    out.cleared = addCoinCategoryValue();

    // D3: the list cannot be read (a live session): short note, the dropdown holds only the blank, Coin still works.
    __setLiveLookupCategoriesForTest(null, true);
    __fill({});
    out.unavail = {
      options: optionValues(), note: document.getElementById("addCoinCategoryNote").textContent,
      btnDisabled: document.getElementById("addCoinCategoryCoinBtn").disabled,
      selectDisabled: sel().disabled
    };
    document.getElementById("addCoinCategoryCoinBtn").click();
    out.unavailAfter = { value: addCoinCategoryValue(), shown: sel().value, formCategory: readAddCoinFormForDraft().category };

    // D4: the list loaded but has no 'Coin': the button is off and says so; a listed value still works.
    __setLiveLookupCategoriesForTest(["Proof Set", "Mint Set"], false);
    __fill({});
    out.noCoin = { btnDisabled: document.getElementById("addCoinCategoryCoinBtn").disabled, note: document.getElementById("addCoinCategoryNote").textContent };
    sel().value = "Mint Set"; sel().dispatchEvent(new Event("change"));
    out.noCoinPick = addCoinCategoryValue();

    // D5: a bullion pick and a dropdown Category can never both be set.
    __setLiveLookupCategoriesForTest(["Coin", "Commemorative", "Silver Eagle"], false);
    __fill({ denom: "1C" });
    sel().value = "Commemorative"; sel().dispatchEvent(new Event("change"));
    const before = { plain: addCoinPlainCategory, bullion: addCoinBullionCategory };
    const toggle = document.getElementById("addCoinBullionToggle");
    toggle.checked = true; toggle.dispatchEvent(new Event("change"));
    const denomSel = document.getElementById("denomination");
    const opt = [...denomSel.options].find(o => o.dataset.category === "Silver Eagle");
    denomSel.value = opt.value; denomSel.selectedIndex = opt.index; denomSel.dispatchEvent(new Event("change"));
    document.getElementById("year").value = "2026"; document.getElementById("year").dispatchEvent(new Event("input"));
    checkDbCoinsMatch();
    out.bullion = {
      before, plain: addCoinPlainCategory, bullion: addCoinBullionCategory, value: addCoinCategoryValue(),
      formCategory: readAddCoinFormForDraft().category, selectDisabled: sel().disabled, shown: sel().value,
      btnDisabled: document.getElementById("addCoinCategoryCoinBtn").disabled,
      note: document.getElementById("addCoinCategoryNote").textContent
    };
    document.getElementById("addCoinCategoryCoinBtn").click(); // disabled: must change nothing
    out.bullionAfterCoinTap = { plain: addCoinPlainCategory, value: addCoinCategoryValue() };
    // ... back to everyday coins: the bullion Category goes, the dropdown is free again and still empty.
    toggle.checked = false; toggle.dispatchEvent(new Event("change"));
    checkDbCoinsMatch();
    out.backToClassic = { plain: addCoinPlainCategory, bullion: addCoinBullionCategory, selectDisabled: sel().disabled, shown: sel().value };

    // D6: Category never reaches the DB_Coins matcher (the identity shape carries the bullion Category only).
    __fill({});
    document.getElementById("addCoinCategoryCoinBtn").click();
    out.shapeCategory = addCoinIdentityShape().category;
    __teardown();
    return out;
  });
  ok("D1 Lookup_Categories is read as column A: trimmed, deduped, blanks and ═ dividers dropped, other columns ignored: " + JSON.stringify(D.list),
    JSON.stringify(D.list) === JSON.stringify(["Coin", "Proof Set", "Commemorative"]));
  ok("D1b -- a header-only sheet is an empty list (not a failure) and a non-array is null (a failed read)",
    Array.isArray(D.emptyHeaderOnly) && D.emptyHeaderOnly.length === 0 && D.notArray === null);
  ok("D2 the dropdown offers '— not recorded —' then exactly the sheet's values: " + JSON.stringify(D.options),
    JSON.stringify(D.options) === JSON.stringify(["", "Coin", "Proof Set", "Commemorative"]));
  ok("D2b a dropdown pick is an explicit choice that reaches the draft's category: " + JSON.stringify(D.pick),
    D.pick.value === "Commemorative" && D.pick.formCategory === "Commemorative");
  ok("D2c the Coin button overrides it and the dropdown shows Coin; clearing the dropdown clears the Category: " + JSON.stringify([D.afterCoin, D.cleared]),
    D.afterCoin.value === "Coin" && D.afterCoin.shown === "Coin" && D.cleared === "");
  ok("D3 LIST UNAVAILABLE: only '— not recorded —' is offered, a short note says so, nothing is disabled: " + JSON.stringify(D.unavail),
    JSON.stringify(D.unavail.options) === JSON.stringify([""]) && /Category list unavailable/.test(D.unavail.note) &&
    D.unavail.btnDisabled === false && D.unavail.selectDisabled === false);
  ok("D3b -- and the Coin button still works (the value shows even though the list lacks it): " + JSON.stringify(D.unavailAfter),
    D.unavailAfter.value === "Coin" && D.unavailAfter.shown === "Coin" && D.unavailAfter.formCategory === "Coin");
  ok("D4 a loaded list without 'Coin' switches the button off and says why; a listed value still works: " + JSON.stringify([D.noCoin, D.noCoinPick]),
    D.noCoin.btnDisabled === true && /isn.t in Lookup_Categories/.test(D.noCoin.note) && D.noCoinPick === "Mint Set");
  ok("D5 BULLION vs DROPDOWN: a bullion pick clears the dropdown Category and locks it; only the bullion Category is set: " + JSON.stringify(D.bullion),
    D.bullion.before.plain === "Commemorative" && D.bullion.plain === "" && D.bullion.bullion === "Silver Eagle" &&
    D.bullion.value === "Silver Eagle" && D.bullion.formCategory === "Silver Eagle" && D.bullion.selectDisabled === true &&
    D.bullion.shown === "Silver Eagle" && D.bullion.btnDisabled === true && /Bullion pick/.test(D.bullion.note));
  ok("D5b -- the disabled Coin button changes nothing: " + JSON.stringify(D.bullionAfterCoinTap),
    D.bullionAfterCoinTap.plain === "" && D.bullionAfterCoinTap.value === "Silver Eagle");
  ok("D5c -- back to everyday coins the bullion Category is gone, the dropdown is free again and empty: " + JSON.stringify(D.backToClassic),
    D.backToClassic.bullion === "" && D.backToClassic.plain === "" && D.backToClassic.selectDisabled === false && D.backToClassic.shown === "");
  ok("D6 the Category never feeds the DB_Coins matcher (shape.category stays blank for a plain Category): " + JSON.stringify(D.shapeCategory),
    D.shapeCategory === "");

  // ============ E. Staging edit: restore, dirty, save ============
  const E = await page.evaluate(async (draftFn) => {
    const out = {};
    const draftOf = (id, extra) => Object.assign(JSON.parse(draftFn), { collectionID: id }, extra || {});
    const mock = __setup();
    __setLiveDbCoinsForTest([{ denom: "1C", year: 2026, mint: "", variety: "", description: "Lincoln Shield Cent",
      finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0, coinId: "C-2026--1C-01", composition: "x" }]);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00790/coin.json", draftOf("AY-00790", { finish: "Business Strike" })); // no Category
    await mock.uploadJson(base + "/AY-00791/coin.json", draftOf("AY-00791", { finish: "Business Strike", category: "Coin" }));
    await mock.uploadJson(base + "/AY-00792/coin.json", draftOf("AY-00792", { finish: "Business Strike", category: "Commemorative" }));
    await mock.uploadJson(base + "/AY-00793/coin.json", draftOf("AY-00793", { denom: "$1", finish: "Proof", category: "Silver Eagle", coinId: "" }));
    const state = () => ({
      plain: addCoinPlainCategory, bullion: addCoinBullionCategory, shown: document.getElementById("addCoinCategory").value,
      bullionToggle: document.getElementById("addCoinBullionToggle").checked,
      controlVisible: __shown("addCoinCategoryRow"), dbBtn: __shown("saveToDatabaseBtn")
    });
    // Category 'Coin' restores into the plain control (not mistaken for bullion).
    await beginCoinDraftEdit("AY-00791"); out.coin = state(); resetAddCoinForm(); clearCoinDraftEditContext();
    // A dropdown Category restores too.
    await beginCoinDraftEdit("AY-00792"); out.comm = state(); resetAddCoinForm(); clearCoinDraftEditContext();
    // A real bullion pick still restores as bullion.
    await beginCoinDraftEdit("AY-00793"); out.bullion = state(); resetAddCoinForm(); clearCoinDraftEditContext();

    // The edit of a Category-less draft: clean until the Coin tap, dirty after, and Save writes it.
    await beginCoinDraftEdit("AY-00790");
    out.openClean = { dirty: unsavedEditsForView() !== null, shown: document.getElementById("addCoinCategory").value };
    document.getElementById("addCoinCategoryCoinBtn").click();
    out.afterTap = { dirty: unsavedEditsForView() !== null, ids: addCoinDirtyFieldIds() };
    saveAddCoinForm("staging");
    await __wait(1200);
    const saved = await mock.getJson(base + "/AY-00790/coin.json");
    out.saved = { category: saved.category, status: saved.status, finish: saved.finish, coinId: saved.coinId };
    out.afterSave = { dirty: unsavedEditsForView() !== null };
    __teardown();
    return out;
  }, JSON.stringify(DRAFT("X")));
  ok("E1 a draft saved with Category 'Coin' reopens with it in the dropdown, bullion toggle OFF: " + JSON.stringify(E.coin),
    E.coin.plain === "Coin" && E.coin.bullion === "" && E.coin.shown === "Coin" && E.coin.bullionToggle === false && E.coin.controlVisible === true);
  ok("E2 a dropdown Category reopens as a plain Category: " + JSON.stringify(E.comm),
    E.comm.plain === "Commemorative" && E.comm.bullion === "" && E.comm.bullionToggle === false);
  ok("E3 a real bullion Category still reopens as bullion with the dropdown locked on it: " + JSON.stringify(E.bullion),
    E.bullion.bullion === "Silver Eagle" && E.bullion.plain === "" && E.bullion.bullionToggle === true && E.bullion.shown === "Silver Eagle");
  ok("E4 the Category control shows on a Staging edit while Save to Database stays hidden: " + JSON.stringify(E.coin),
    E.coin.controlVisible === true && E.coin.dbBtn === false);
  ok("E5 opened clean; the Coin tap makes the edit dirty (Save and the leave guard see it): " + JSON.stringify([E.openClean, E.afterTap]),
    E.openClean.dirty === false && E.afterTap.dirty === true && E.afterTap.ids.indexOf("addCoinCategory") !== -1);
  ok("E6 Save changes writes the Category onto the same draft, status and CoinID untouched, and the form is clean again: " + JSON.stringify([E.saved, E.afterSave]),
    E.saved.category === "Coin" && E.saved.finish === "Business Strike" && E.saved.coinId === "C-2026--1C-01" &&
    /Ready/.test(E.saved.status) && E.afterSave.dirty === false);
}, module);
