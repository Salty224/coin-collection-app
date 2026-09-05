// Editing a coin while it sits in Staging (Phase A).
//
// Mark Ready used to be a one-way blind commit — nothing could reopen what
// had been captured, unlike an in-progress Set draft. This is the coin-side
// equivalent, scoped to FIELDS: photos and the receipt are carried forward
// untouched (Phase B, deliberately deferred), so an edit can never lose a
// captured file.
//
// The two things most likely to go wrong, and the reason most of this suite
// exists: an edit must reuse the draft's own CollectionID rather than
// reserving a new one (which would orphan the original folder and its
// photos), and it must not reset the bookkeeping a fresh capture would
// legitimately set from scratch.

const { defineSuite } = require("./harness");

const CATALOG = [
  { denom: "1C", year: 1943, mint: "S", variety: "", description: "Lincoln Wheat",
    finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0,
    coinId: "C-1943-S-1C-01", composition: "Steel" }
];

const BASE_DRAFT = {
  type: "coin", version: 1, collectionID: "AY-00800",
  denom: "1C", category: "", year: "1943", mint: "S", variety: "",
  description: "Lincoln Wheat", finish: "Business Strike", designation: "",
  errorDesc: "", grade: "MS-66", gradeSource: "PCGS", serNo: "12345678",
  cacBean: "Green", cost: 42.5, shippingCost: 4.25, purchaseDate: "2024-05-02",
  vendor: "Great Collections", storageLocation: "Safe", container: "",
  assignAlbum: "", remarks: "original note", itemNumber: "21RJ", gsid: "GS-1044",
  coinId: "C-1943-S-1C-01", matchedHow: "single",
  photos: ["AY-00800_obverse_cropped.jpg", "AY-00800_obverse_original.jpg"],
  receiptPhoto: "AY-00800_receipt.pdf",
  researchNote: "", allRowWritten: false, forceAdded: false,
  createdDate: "2024-05-02T10:00:00.000Z"
};

module.exports = defineSuite("staging-edit", async ({ ok, openApp, PHONE, TABLET }) => {
  const page = await openApp(PHONE);

  await page.evaluate(() => {
    window.__setup = async (draftOverrides) => {
      const mock = createMockGraphClient({ sheets: { All: [["CollectionID", "CoinID"]] } });
      __setGraphClientForTest(mock);
      __setAddCoinWriteEnabledForTest(true);
      __resetAllHeaderMapForTest();
      return mock;
    };
    window.__teardown = () => {
      __setLiveDbCoinsForTest(null);
      __setAddCoinWriteEnabledForTest(null);
      __setGraphClientForTest(null);
      __resetAllHeaderMapForTest();
    };
    window.__val = (id) => { const el = document.getElementById(id); return el ? el.value : null; };
  });

  // ---------- A. Every captured field comes back into the form ----------
  const A = await page.evaluate(async ({ draft, catalog }) => {
    const mock = await __setup();
    __setLiveDbCoinsForTest(catalog);
    await mock.uploadJson(writePaths().stagingBase + "/AY-00800/coin.json", draft);
    await beginCoinDraftEdit("AY-00800");

    const out = {
      denom: __val("denomination"), year: __val("year"), mint: __val("mintMark"),
      description: __val("description"), finish: __val("finish"),
      grade: __val("gradeFrom"), gradeSource: __val("gradeSource"),
      serNo: __val("certTypeNumber"),
      cacGreen: document.getElementById("cacGreen").checked,
      cacGold: document.getElementById("cacGold").checked,
      cost: __val("purchasePrice"), shipping: __val("shippingCost"),
      purchaseDate: __val("purchaseDate"), vendor: __val("vendor"),
      storage: __val("storageLocation"), notes: __val("notesField"),
      itemNumber: __val("mintItemNumber"), gsid: __val("gsidInput"),
      bannerShown: !document.getElementById("editDraftBanner").classList.contains("hidden"),
      bannerText: document.getElementById("editDraftMsg").textContent,
      saveLabel: document.getElementById("saveToStagingBtn").textContent,
      dbBtnShown: document.getElementById("saveToDatabaseBtn").style.display !== "none",
      interimShown: !document.getElementById("addCoinInterimBanner").classList.contains("hidden"),
      confidentBannerShown: !document.getElementById("saveConfidentBanner").classList.contains("hidden"),
      onAddCoin: document.getElementById("view-addcoin").classList.contains("active")
    };
    __teardown();
    return out;
  }, { draft: BASE_DRAFT, catalog: CATALOG });

  ok(A.onAddCoin && A.denom === "1C" && A.year === "1943" && A.mint === "S",
    "A1 the draft's identity fields are restored into Add Coin's own form: " + JSON.stringify(A));
  ok(A.description === "Lincoln Wheat" && A.finish === "Business Strike",
    "A2 -- description and finish too");
  ok(A.grade === "MS-66" && A.gradeSource === "PCGS" && A.serNo === "12345678",
    "A3 -- grade, grade source and cert number");
  ok(A.cacGreen === true && A.cacGold === false,
    "A4 -- and the CAC checkbox pair, which is a derived UI state stored as one value");
  ok(A.cost === "42.5" && A.shipping === "4.25" && A.purchaseDate === "2024-05-02" &&
     A.vendor === "Great Collections" && A.storage === "Safe" && A.notes === "original note",
    "A5 purchase, storage and notes all come back");
  ok(A.itemNumber === "21RJ" && A.gsid === "GS-1044",
    "A6 -- as do the identification lookups");
  ok(A.bannerShown && /AY-00800/.test(A.bannerText) && A.saveLabel === "Save changes",
    "A7 the form says which draft it is bound to, and Save is relabelled");
  ok(A.dbBtnShown === false,
    "A8 \"Save to Database\" is hidden while editing — there is only ONE meaningful action here, " +
      "and offering a second that routes to the same place implies an outcome that does not exist");
  ok(A.interimShown === false && A.confidentBannerShown === false,
    "A9 -- and the capture-destination notices go with it; they answer a question nobody is asking mid-edit");

  // ---------- B. THE ONE THAT MATTERS: no new CollectionID, no orphaned folder ----------
  const B = await page.evaluate(async ({ draft, catalog }) => {
    const mock = await __setup();
    __setLiveDbCoinsForTest(catalog);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00800/coin.json", draft);
    await beginCoinDraftEdit("AY-00800");
    document.getElementById("notesField").value = "edited note";
    document.getElementById("storageLocation").value = "Box 4";

    // Record every draft path the save writes. This is the direct evidence
    // for "no new CollectionID was reserved" — a folder count alone is not,
    // because saveCoinDraftEdit() refuses outright when the draft it is
    // handed does not exist, so a wrongly-reserved id fails to write at all
    // rather than leaving a visible second folder behind.
    const writtenPaths = [];
    const realUpload = mock.uploadJson;
    mock.uploadJson = (path, obj) => { writtenPaths.push(path); return realUpload(path, obj); };
    await completeAddCoinSave("staging", { coinId: draft.coinId, how: "single", row: null });
    mock.uploadJson = realUpload;

    const folders = await mock.listChildren(base);
    const saved = await mock.getJson(base + "/AY-00800/coin.json");
    const out = {
      folders: folders.filter(f => /^AY-/.test(f)),
      writtenPaths: writtenPaths.map(x => x.replace(base + "/", "")),
      notes: saved.remarks, storage: saved.storageLocation,
      collectionID: saved.collectionID,
      photos: saved.photos, receipt: saved.receiptPhoto,
      createdDate: saved.createdDate, editedDate: !!saved.editedDate,
      landedOnStaging: document.getElementById("view-staging").classList.contains("active")
    };
    __teardown();
    return out;
  }, { draft: BASE_DRAFT, catalog: CATALOG });

  ok(B.writtenPaths.length === 1 && B.writtenPaths[0] === "AY-00800/coin.json",
    "B1 THE ONE THAT MATTERS: the save writes back to the draft's OWN CollectionID — no fresh id " +
      "reserved, so the original folder and its photos cannot be orphaned (wrote: " +
      JSON.stringify(B.writtenPaths) + ")");
  ok(B.folders.length === 1 && B.folders[0] === "AY-00800",
    "B1b -- and Staging still holds exactly that one folder afterwards (" + JSON.stringify(B.folders) + ")");
  ok(B.notes === "edited note" && B.storage === "Box 4",
    "B2 the edited values are what got written");
  ok(B.photos && B.photos.length === 2 && B.receipt === "AY-00800_receipt.pdf",
    "B3 photos and the receipt are carried forward untouched — Phase A cannot lose a captured file");
  ok(B.createdDate === "2024-05-02T10:00:00.000Z" && B.editedDate === true,
    "B4 createdDate still records the capture, with the edit recorded separately");
  ok(B.landedOnStaging, "B5 saving returns to Staging Review, where the edit started");

  // ---------- C. Bookkeeping an edit must not reset ----------
  const C = await page.evaluate(async ({ draft, catalog }) => {
    const mock = await __setup();
    __setLiveDbCoinsForTest(catalog);
    const base = writePaths().stagingBase;
    // A draft that has been marked ready AND force-added onto the All sheet:
    // every flag a fresh capture would set from scratch is already set here.
    await mock.uploadJson(base + "/AY-00801/coin.json", Object.assign({}, draft, {
      collectionID: "AY-00801", status: COIN_DRAFT_STATUS.READY,
      allRowWritten: true, forceAdded: true, forceAddedDate: "2024-06-01",
      savedVia: "direct", filesMovedOnPromotion: true
    }));
    await beginCoinDraftEdit("AY-00801");
    document.getElementById("notesField").value = "touched";
    await completeAddCoinSave("staging", { coinId: draft.coinId, how: "single", row: null });
    const saved = await mock.getJson(base + "/AY-00801/coin.json");
    const out = {
      status: saved.status, expectedStatus: COIN_DRAFT_STATUS.READY,
      allRowWritten: saved.allRowWritten, forceAdded: saved.forceAdded,
      forceAddedDate: saved.forceAddedDate, savedVia: saved.savedVia,
      filesMoved: saved.filesMovedOnPromotion, notes: saved.remarks
    };
    __teardown();
    return out;
  }, { draft: BASE_DRAFT, catalog: CATALOG });

  ok(C.status === C.expectedStatus,
    "C1 a Ready draft stays Ready — an edit does not knock it back to Draft (got " + C.status + ")");
  ok(C.allRowWritten === true && C.forceAdded === true && C.forceAddedDate === "2024-06-01",
    "C2 Phase 2 bookkeeping survives: a coin already on the All sheet stays marked as such");
  ok(C.savedVia === "direct" && C.filesMoved === true,
    "C3 -- as do savedVia and the photo-move flag");
  ok(C.notes === "touched", "C4 -- while the edit itself still lands");

  // ---------- D. A promoted draft is refused ----------
  const D = await page.evaluate(async ({ draft, catalog }) => {
    const mock = await __setup();
    __setLiveDbCoinsForTest(catalog);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00802/coin.json", Object.assign({}, draft, {
      collectionID: "AY-00802", status: COIN_DRAFT_STATUS.PROMOTED
    }));
    navigate("dashboard");
    const started = await beginCoinDraftEdit("AY-00802");
    const out = {
      started,
      onAddCoin: document.getElementById("view-addcoin").classList.contains("active"),
      missing: await beginCoinDraftEdit("AY-09999")
    };
    __teardown();
    return out;
  }, { draft: BASE_DRAFT, catalog: CATALOG });

  ok(D.started === false && D.onAddCoin === false,
    "D1 a PROMOTED draft is refused — its row belongs to the All sheet and Browse Edit owns it now");
  ok(D.missing === false, "D2 a draft that isn't there is reported, not crashed on");

  // ---------- E. The edit binding cannot leak into a fresh capture ----------
  const E = await page.evaluate(async ({ draft, catalog }) => {
    const mock = await __setup();
    __setLiveDbCoinsForTest(catalog);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00803/coin.json",
      Object.assign({}, draft, { collectionID: "AY-00803" }));
    await beginCoinDraftEdit("AY-00803");
    const boundDuring = !document.getElementById("editDraftBanner").classList.contains("hidden");
    // Walk away mid-edit and come back to Add Coin the ordinary way.
    navigate("dashboard");
    navigate("addcoin");
    const out = {
      boundDuring,
      bannerAfter: !document.getElementById("editDraftBanner").classList.contains("hidden"),
      saveLabelAfter: document.getElementById("saveToStagingBtn").textContent,
      yearAfter: __val("year")
    };
    __teardown();
    return out;
  }, { draft: BASE_DRAFT, catalog: CATALOG });

  ok(E.boundDuring === true, "E1 the edit binding is live while editing");
  ok(E.bannerAfter === false && E.saveLabelAfter === "Save to Staging" && E.yearAfter === "",
    "E2 leaving mid-edit and re-entering Add Coin drops the binding — a new coin cannot be saved " +
      "over the draft that was being edited, on a form that looks blank");

  // ---------- F. Reversing resolveGrade()'s three collapsed states ----------
  const F = await page.evaluate(async ({ draft, catalog }) => {
    const mock = await __setup();
    __setLiveDbCoinsForTest(catalog);
    const base = writePaths().stagingBase;
    const read = async (grade, id) => {
      await mock.uploadJson(base + "/" + id + "/coin.json",
        Object.assign({}, draft, { collectionID: id, grade }));
      await beginCoinDraftEdit(id);
      return {
        from: __val("gradeFrom"), to: __val("gradeTo"), other: __val("gradeOther"),
        range: document.getElementById("gradeRangeToggle").checked,
        resolved: resolveGrade()
      };
    };
    const out = {
      plain: await read("VF-20", "AY-00810"),
      // Both halves contain a hyphen of their own — the split point cannot be
      // guessed from the string, only found by testing against the real list.
      range: await read("G-4-VG-8", "AY-00811"),
      other: await read("XF Details - Improperly Cleaned", "AY-00812"),
      blank: await read("", "AY-00813")
    };
    __teardown();
    return out;
  }, { draft: BASE_DRAFT, catalog: CATALOG });

  ok(F.plain.from === "VF-20" && F.plain.range === false && F.plain.resolved === "VF-20",
    "F1 a plain grade restores as a plain pick and round-trips");
  ok(F.range.from === "G-4" && F.range.to === "VG-8" && F.range.range === true &&
     F.range.resolved === "G-4-VG-8",
    "F2 a RANGE splits at the right hyphen despite both halves containing one: " + JSON.stringify(F.range));
  ok(F.other.from === "__other__" && F.other.other === "XF Details - Improperly Cleaned" &&
     F.other.resolved === "XF Details - Improperly Cleaned",
    "F3 free text restores through the Other override, not as a bogus range");
  ok(F.blank.from === "" && F.blank.resolved === "",
    "F4 a blank grade stays blank rather than becoming an empty Other");

  // ---------- G. Derived UI: variety/error overrides and bullion ----------
  const G = await page.evaluate(async ({ draft, catalog }) => {
    const mock = await __setup();
    __setLiveDbCoinsForTest(catalog);
    const base = writePaths().stagingBase;

    await mock.uploadJson(base + "/AY-00820/coin.json", Object.assign({}, draft, {
      collectionID: "AY-00820", variety: "Some Unlisted Variety",
      errorDesc: "A one-off error nobody catalogued"
    }));
    await beginCoinDraftEdit("AY-00820");
    const overrides = {
      varietySelect: __val("varietySelect"), varietyOther: __val("varietyOther"),
      varietyHidden: __val("variety"),
      varietyOtherShown: document.getElementById("varietyOther").style.display !== "none",
      errorSelect: __val("errorSelect"), errorOther: __val("errorOther"),
      errorHidden: __val("errorDesc"),
      errorOtherShown: document.getElementById("errorOther").style.display !== "none"
    };

    // A bullion draft: denom is a plain face value shared with other types,
    // so only denom+category together identify the right dropdown option.
    await mock.uploadJson(base + "/AY-00821/coin.json", Object.assign({}, draft, {
      collectionID: "AY-00821", denom: "$1", category: "Silver Eagle",
      description: "American Silver Eagle", year: "2017", mint: "W", variety: ""
    }));
    await beginCoinDraftEdit("AY-00821");
    const denomSel = document.getElementById("denomination");
    const bullion = {
      toggle: document.getElementById("addCoinBullionToggle").checked,
      denom: denomSel.value,
      category: addCoinBullionCategory,
      optionCategory: denomSel.selectedOptions.length ? denomSel.selectedOptions[0].dataset.category : null,
      readBack: readAddCoinFormForDraft().category
    };
    __teardown();
    return { overrides, bullion };
  }, { draft: BASE_DRAFT, catalog: CATALOG });

  ok(G.overrides.varietySelect === "__other__" && G.overrides.varietyOtherShown &&
     G.overrides.varietyOther === "Some Unlisted Variety" &&
     G.overrides.varietyHidden === "Some Unlisted Variety",
    "G1 a variety outside the filtered list restores through the Other override, box shown");
  ok(G.overrides.errorSelect === "__other__" && G.overrides.errorOtherShown &&
     G.overrides.errorHidden === "A one-off error nobody catalogued",
    "G2 an uncatalogued Error does the same");
  ok(G.bullion.toggle === true && G.bullion.denom === "$1" &&
     G.bullion.category === "Silver Eagle" && G.bullion.optionCategory === "Silver Eagle",
    "G3 a bullion draft re-checks the toggle and lands on the option matching denom AND category, " +
      "not just the shared face value: " + JSON.stringify(G.bullion));
  ok(G.bullion.readBack === "Silver Eagle",
    "G4 -- so reading the form straight back gives the same Category it was stored with");

  // ---------- H. The Edit button, and who gets one ----------
  const H = await page.evaluate(async ({ draft, catalog }) => {
    const mock = await __setup();
    __setLiveDbCoinsForTest(catalog);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00830/coin.json",
      Object.assign({}, draft, { collectionID: "AY-00830", status: COIN_DRAFT_STATUS.DRAFT }));
    await mock.uploadJson(base + "/AY-00831/coin.json",
      Object.assign({}, draft, { collectionID: "AY-00831", status: COIN_DRAFT_STATUS.READY }));
    await mock.uploadJson(base + "/AY-00832/coin.json",
      Object.assign({}, draft, { collectionID: "AY-00832", status: COIN_DRAFT_STATUS.PROMOTED }));
    await refreshCoinDraftCache();
    await renderStagingList();
    await new Promise(r => setTimeout(r, 400));

    const rowFor = (id) => [...document.querySelectorAll("#view-staging .staging-id")]
      .map(el => el.closest(".case") || el.parentElement.parentElement)
      .find(el => el && new RegExp(id).test(el.textContent));
    const out = {
      draftHasEdit: !!(rowFor("AY-00830") && rowFor("AY-00830").querySelector(".staging-edit")),
      readyHasEdit: !!(rowFor("AY-00831") && rowFor("AY-00831").querySelector(".staging-edit")),
      promotedHasEdit: !!(rowFor("AY-00832") && rowFor("AY-00832").querySelector(".staging-edit"))
    };

    // The button really opens the editor.
    const btn = rowFor("AY-00830").querySelector(".staging-edit");
    btn.click();
    await new Promise(r => setTimeout(r, 400));
    out.opened = document.getElementById("view-addcoin").classList.contains("active") &&
      /AY-00830/.test(document.getElementById("editDraftMsg").textContent);
    __teardown();
    return out;
  }, { draft: BASE_DRAFT, catalog: CATALOG });

  ok(H.draftHasEdit && H.readyHasEdit,
    "H1 both a Draft and a marked-Ready row offer Edit — Mark Ready is no longer a one-way commit");
  ok(H.promotedHasEdit === false,
    "H2 a promoted row does not, matching the guard inside beginCoinDraftEdit()");
  ok(H.opened, "H3 the button opens the editor bound to that draft");

  // ---------- I. Inert with the write layer off ----------
  const I = await page.evaluate(async () => {
    __setAddCoinWriteEnabledForTest(false);
    const started = await beginCoinDraftEdit("AY-00800");
    __setAddCoinWriteEnabledForTest(null);
    return { started, noCrash: true };
  });
  ok(I.noCrash && I.started === false,
    "I1 with the write layer off there is no draft to read, and it reports rather than throwing");

  // ---------- J. Layout ----------
  for (const vp of [PHONE, TABLET]) {
    const pg = await openApp(vp);
    const overflow = await pg.evaluate(async ({ draft, catalog }) => {
      const mock = createMockGraphClient({ sheets: { All: [["CollectionID", "CoinID"]] } });
      __setGraphClientForTest(mock);
      __setAddCoinWriteEnabledForTest(true);
      __setLiveDbCoinsForTest(catalog);
      await mock.uploadJson(writePaths().stagingBase + "/AY-00800/coin.json", draft);
      await beginCoinDraftEdit("AY-00800");
      const o = document.body.scrollWidth <= window.innerWidth + 1;
      __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
      return o;
    }, { draft: BASE_DRAFT, catalog: CATALOG });
    ok(overflow, "J" + (vp === PHONE ? "1" : "2") + " no horizontal overflow with the edit banner shown at " +
      vp.width + "px");
    if (pg !== page) await pg.close();
  }
}, module);
