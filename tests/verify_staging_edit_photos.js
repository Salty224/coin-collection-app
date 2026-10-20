// Editing a Staging coin draft: photos, receipt and the research note
// (Phase B, plus two silent-drop fixes found while planning it).
//
// Live report (AY-00754): Ray opened a Staging draft for edit, picked slab
// photos through Files, cropped them and saved. Nothing reached Staging and
// coin.json still said "photos": []. The edit save never uploaded anything,
// and the form reset that followed deleted the picks from memory.
//
// Everything here runs against the mock Graph client. Nothing touches a real
// workbook or a real OneDrive folder.

const { defineSuite } = require("./harness");

const CATALOG = [
  { denom: "5C", year: 1938, mint: "D", variety: "", description: "Buffalo Nickel",
    finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0,
    coinId: "C-1938-D-5C-01", composition: "75% Copper, 25% Nickel" },
  { denom: "5C", year: 1938, mint: "D", variety: "D/S", description: "Buffalo Nickel",
    finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0,
    coinId: "C-1938-D-5C-02", composition: "75% Copper, 25% Nickel" }
];

const ID = "AY-00754";

const BASE_DRAFT = {
  type: "coin", version: 1, collectionID: ID, status: "Draft",
  denom: "5C", category: "", year: "1938", mint: "D", variety: "",
  description: "Buffalo Nickel", finish: "Business Strike", designation: "",
  errorDesc: "", grade: "PR-66", gradeSource: "PCGS", serNo: "44556677",
  cacBean: "", cost: 30, shippingCost: 5, purchaseDate: "2026-10-20",
  vendor: "Seller", storageLocation: "Safe", container: "",
  assignAlbum: "", remarks: "", itemNumber: "", gsid: "",
  coinId: "C-1938-D-5C-01", matchedHow: "single",
  photos: [], receiptPhoto: ID + "_receipt.pdf",
  researchNote: "", allRowWritten: false, forceAdded: false, filesMovedOnPromotion: false,
  savedVia: "staging",
  createdDate: "2026-10-20T17:57:36Z"
};

module.exports = defineSuite("staging-edit-photos", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  await page.evaluate(() => {
    window.__setup = async () => {
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
    window.__draftPath = (id) => writePaths().stagingBase + "/" + id + "/coin.json";
    // Saves through the real path: the same match resolution the button runs,
    // then completeAddCoinSave(), awaited.
    window.__saveEdit = () => new Promise((resolve, reject) => {
      resolveAddCoinCatalogMatch(
        (m) => completeAddCoinSave("staging", m).then(resolve, reject),
        () => resolve("cancelled"));
    });
  });

  // ---------- R. The research note survives an edit (plan item 5b) ----------
  const R = await page.evaluate(async ({ base, catalog, id }) => {
    const out = {};
    const run = async (overrides, mutate) => {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      await mock.uploadJson(__draftPath(id), Object.assign({}, base, overrides));
      await beginCoinDraftEdit(id);
      const label = __val("pcgsLabelInput");
      if (mutate) mutate();
      document.getElementById("notesField").value = "edited";
      await __saveEdit();
      const saved = await mock.getJson(__draftPath(id));
      __teardown();
      return { label, saved };
    };

    // R1: a no-match draft with a stored raw label and an upload-failure line.
    out.r1 = await run({
      coinId: "", matchedHow: "none", year: "1938", variety: "X-not-in-catalog",
      pcgsLabelRaw: "3966.66/44556677",
      researchNote: "No DB_Coins match at capture — CoinID pending, needs a catalog entry.\n" +
        "Captured but unresolved: PCGS label 3966.66/44556677.\n" +
        "Some captured files failed to upload at capture: " + id + "_slab_obverse.jpg."
    });
    // R2: a draft written before pcgsLabelRaw was stored — label only in the note.
    out.r2 = await run({
      coinId: "", matchedHow: "none", variety: "X-not-in-catalog",
      researchNote: "No DB_Coins match at capture — CoinID pending, needs a catalog entry.\n" +
        "Captured but unresolved: GSID GS-9; PCGS label 3966.66/44556677."
    });
    // R3: a picked link stays "picked from 3", not rewritten as "from 1".
    out.r3 = await run({
      matchedHow: "picked",
      researchNote: "CoinID C-1938-D-5C-01 chosen from 3 ambiguous DB_Coins candidates at capture — confirm at reconciliation."
    });
    // R4: a single link stays single, with no invented "chosen from" line.
    out.r4 = await run({ matchedHow: "single", researchNote: "" });
    // R5: the rebuild still works — an edit that resolves the gap clears it.
    out.r5 = await run({
      coinId: "", matchedHow: "none", variety: "X-not-in-catalog",
      researchNote: "No DB_Coins match at capture — CoinID pending, needs a catalog entry."
    }, () => {
      document.getElementById("varietySelect").value = "";
      document.getElementById("variety").value = "";
      document.getElementById("varietyOther").value = "";
      checkDbCoinsMatch();
    });
    return out;
  }, { base: BASE_DRAFT, catalog: CATALOG, id: ID });

  ok(R.r1.label === "3966.66/44556677",
    "R1 the stored raw PCGS label is put back on the edit form: " + JSON.stringify(R.r1.label));
  ok(/PCGS label 3966\.66\/44556677/.test(R.r1.saved.researchNote) &&
     R.r1.saved.pcgsLabelRaw === "3966.66/44556677",
    "R2 -- so the \"PCGS label\" line survives the edit, and the raw label stays stored: " +
      JSON.stringify(R.r1.saved.researchNote));
  ok(/Some captured files failed to upload at capture/.test(R.r1.saved.researchNote),
    "R3 the upload-failure line written at first save survives an edit");
  ok(R.r2.label === "3966.66/44556677" && /PCGS label 3966\.66\/44556677/.test(R.r2.saved.researchNote),
    "R4 an older draft (label only in its note) keeps the label too: " + JSON.stringify(R.r2));
  ok(R.r3.saved.matchedHow === "picked" && /chosen from 3 ambiguous/.test(R.r3.saved.researchNote) &&
     !/chosen from 1 /.test(R.r3.saved.researchNote),
    "R5 an unchanged picked link keeps \"chosen from 3\" and its provenance: " +
      JSON.stringify([R.r3.saved.matchedHow, R.r3.saved.researchNote]));
  ok(R.r4.saved.matchedHow === "single" && !/chosen from/.test(R.r4.saved.researchNote),
    "R6 an unchanged single link stays single, with no invented \"chosen from 1\" line: " +
      JSON.stringify([R.r4.saved.matchedHow, R.r4.saved.researchNote]));
  ok(R.r5.saved.coinId === "C-1938-D-5C-01" && !/No DB_Coins match/.test(R.r5.saved.researchNote),
    "R7 an edit that resolves the gap still clears the old no-match line (the note is still rebuilt): " +
      JSON.stringify([R.r5.saved.coinId, R.r5.saved.researchNote]));

  // ---------- AA. Assign to Album survives an edit (plan item 5c) ----------
  // The dropdown holds only OPEN slots of the albums loaded right now. A
  // draft's saved value can be missing from it (albums not loaded yet in a
  // live session, or the list rebuilt when they arrive mid-edit). Before any
  // fix, this block was written to find out whether that loses the value.
  const AA = await page.evaluate(async ({ base, catalog, id }) => {
    const firstOpen = (() => {
      for (const a of FAKE_ALBUMS) for (const s of a.slots) if (!s.filledBy) return a.name + " :: " + s.coinId;
      return "";
    })();
    const run = async (beforeOpen, afterOpen) => {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      if (beforeOpen) beforeOpen();
      await mock.uploadJson(__draftPath(id), Object.assign({}, base, { assignAlbum: firstOpen }));
      await beginCoinDraftEdit(id);
      const shown = __val("assignAlbum");
      if (afterOpen) afterOpen();
      const afterRebuild = __val("assignAlbum");
      document.getElementById("notesField").value = "edited";
      await __saveEdit();
      const saved = await mock.getJson(__draftPath(id));
      __setLiveAlbumsForTest(null);
      populateAssignAlbumOptions();
      __teardown();
      return { shown, afterRebuild, saved: saved.assignAlbum };
    };
    return {
      firstOpen,
      loaded: await run(null, null),
      notLoaded: await run(() => { __setLiveAlbumsForTest([]); populateAssignAlbumOptions(); }, null),
      rebuiltMidEdit: await run(null, () => { __setLiveAlbumsForTest([]); populateAssignAlbumOptions(); })
    };
  }, { base: BASE_DRAFT, catalog: CATALOG, id: ID });

  ok(!!AA.firstOpen && AA.loaded.shown === AA.firstOpen && AA.loaded.saved === AA.firstOpen,
    "AA1 with albums loaded, the draft's album slot is shown and kept on save: " + JSON.stringify(AA.loaded));
  ok(AA.notLoaded.saved === AA.firstOpen,
    "AA2 with albums NOT loaded when the edit opens, the saved album slot is still kept: " +
      JSON.stringify(AA.notLoaded));
  ok(AA.rebuiltMidEdit.saved === AA.firstOpen,
    "AA3 when the album list is rebuilt mid-edit (albums arriving late), the selection is kept: " +
      JSON.stringify(AA.rebuiltMidEdit));

  const AA4 = await page.evaluate(async () => {
    const sel = document.getElementById("assignAlbum");
    setSelectValuePreservingUnknown(sel, "Gone Album :: C-0000-X-1C-01");
    navigate("addcoin"); // a fresh entry resets the form
    return { value: sel.value, injectedLeft: [...sel.options].filter(o => o.dataset.injected).length };
  });
  ok(AA4.value === "" && AA4.injectedLeft === 0,
    "AA4 a kept (injected) slot from an edit is not offered to the next coin entered: " + JSON.stringify(AA4));

  // @@NEXT@@
}, module);
