// Failure injection (B6, Build 2): Manage Photos / Edit Coin's photo Save.
// One Save of a saved coin with two new photos (a Reference and an Other),
// one changed label and one removal (savePhotosAndLabels, the same call
// Edit Coin, Edit Set and Manage Photos make). Every write request in turn
// fails, or lands with its answer lost; then Save again. See tests/fi_lib.js.

const { defineSuite } = require("./harness");
const { sweepFlow, assertKnown } = require("./fi_lib");

const FLOW = () => {
  const ID = "AY-00099";
  const PH = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"];
  const ALL = ["CollectionID", "Year", "MintMark", "Denomination", "Description", "Status", "LastModified", "Reviewed"];
  const blank = () => new Array(PH.length).fill("");
  const tagged = (tag, size) => { const b = new Blob([new Uint8Array(size)], { type: "image/jpeg" }); b.__fiTag = tag; return b; };
  window.__flow = {
    sheets: ["All", "Photos"],
    async setup() {
      const mock = createMockGraphClient({ sheets: {
        All: [ALL.slice(), [ID, 1916, "D", "10C", "Mercury Dime", "Owned", "", ""]],
        Photos: [PH.slice(),
          ["PH-00001", ID, "Obverse", "", ID + "_obverse_cropped.jpg", "", 46000, ""],
          ["PH-00002", ID, "Reference", "", ID + "_reference_01.jpg", "PCGS photo", 46000, ""],
          ["PH-00003", ID, "Other", "", ID + "_other_01.jpg", "", 46000, ""],
          blank(), blank(), blank(), blank(), blank(), blank()]
      } });
      const P = writePaths();
      for (const [f, t] of [["_obverse_cropped.jpg", "obv"], ["_reference_01.jpg", "ref1"], ["_other_01.jpg", "oth1"]])
        mock._store.set(P.coinPhotos + "/" + ID + f, { kind: "bytes", value: tagged(t, 100) });
      __setGraphClientForTest(mock);
      __resetSheetHeaderMapsForTest(); __resetAllHeaderMapForTest();
      __setAddCoinWriteEnabledForTest(true); __setBrowseEditWriteEnabledForTest(true);
      __setDocketWriteEnabledForTest(false);
      __setLiveCoinsForTest([{ id: ID, name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" }]);
      __setStoredPhotosForTest({ [ID]: [
        { photoId: "PH-00001", photoType: "Obverse", galleryType: "obverse", subGroupId: "", filename: ID + "_obverse_cropped.jpg", originalFilename: "", label: "" },
        { photoId: "PH-00002", photoType: "Reference", galleryType: "reference", subGroupId: "", filename: ID + "_reference_01.jpg", originalFilename: "", label: "PCGS photo" },
        { photoId: "PH-00003", photoType: "Other", galleryType: "other", subGroupId: "", filename: ID + "_other_01.jpg", originalFilename: "", label: "" }
      ] });
      delete galleryStore[ID];
      renderManagePhotosInto("managePhotosSections", { id: ID, name: "Test coin", meta: ID, kind: "coin" });
      const list = galleryFor(ID);
      // The picks: two new photos, a label, a removal.
      const ref = tagged("newref", 300), oth = tagged("newoth", 400);
      addGalleryEntryAndCommit(ID, { type: "reference", blob: ref, url: URL.createObjectURL(ref), caption: "Slab label" }, null);
      addGalleryEntryAndCommit(ID, { type: "other", blob: oth, url: URL.createObjectURL(oth), caption: "" }, null);
      const refStored = list.find(e => e.storedFilename === ID + "_reference_01.jpg");
      refStored.caption = "PCGS photo, front";
      const othStored = list.find(e => e.storedFilename === ID + "_other_01.jpg");
      othStored.pendingRemove = true;
      if (!pendingPhotoCount(ID) || !unsavedPhotoLabelCount(ID)) throw new Error("flow setup: the picks are not pending");
      return mock;
    },
    async run() {
      const res = await savePhotosAndLabels(ID, null);
      return { said: photoEditsAllSaved(res) ? "saved" : "failed", text: photoSaveHeadline(ID, res) + photoSaveFailureText(res, "Save") };
    },
    async retry() { return savePhotosAndLabels(ID, null); },
    // C1: each pick is still pending on screen, or landed in full.
    async picksLost(mock) {
      const lost = [];
      const list = galleryFor(ID);
      const rows = __fi.rowsOf(mock, "Photos").filter(r => r.CollectionID === ID);
      const P = writePaths();
      const landed = (tag) => rows.some(r => { const e = mock._store.get(P.coinPhotos + "/" + r.Filename); return e && e.value && e.value.__fiTag === tag; });
      for (const tag of ["newref", "newoth"]) {
        const pending = list.some(e => e.pendingSave && e.blob && e.blob.__fiTag === tag);
        if (!pending && !landed(tag)) lost.push("the new photo " + tag + " is neither pending nor saved");
      }
      const refRow = rows.find(r => r.Filename === ID + "_reference_01.jpg");
      const refEntry = list.find(e => e.storedFilename === ID + "_reference_01.jpg");
      if (!(refRow && refRow.Label === "PCGS photo, front") && !(refEntry && photoLabelUnsaved(refEntry)))
        lost.push("the label change is neither pending nor saved");
      const othRow = rows.find(r => r.Filename === ID + "_other_01.jpg");
      const othEntry = list.find(e => e.storedFilename === ID + "_other_01.jpg");
      if (othRow && !(othEntry && othEntry.pendingRemove)) lost.push("the removal is neither pending nor done");
      return lost;
    }
  };
};

// Violations the sweep finds today, each tagged with its review finding.
// The list only shrinks: a build that fixes one deletes its line.
// A5: the row lands (or its date-format PATCH fails) but the save reports
// failure; Save again writes a SECOND row for the same file.
// A14: the upload lands, its answer is lost; Save again gets 409 and still
// fails, so after one retry the photo has no row (a third Save picks _03).
// Fixed in Build 5 and deleted: A5 (12 lines) and A14 (2 lines). Nothing is left.
const KNOWN = [
];

module.exports = defineSuite("fi-manage-photos", async ({ check, selfCheck, openApp, appReady, PHONE }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp(PHONE);
  const r = await sweepFlow(page, appReady, FLOW, {});
  ok("clean run: saved, no violations, the retry changes nothing", r.cleanProblems.length === 0, r.cleanProblems);
  ok("the flow makes write requests to sweep (" + r.K + ": " + r.calls.join(" | ") + ")", r.K >= 6, r.calls);
  const k = assertKnown(ok, "fi-manage-photos", r, KNOWN);
  if (k.unexpected.length) console.log("UNEXPECTED:\n  " + k.unexpected.join("\n  "));
}, module);
