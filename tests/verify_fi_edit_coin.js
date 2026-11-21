// Failure injection (B6, Build 2): Edit Coin's Save Changes with a field
// change (My notes) AND a new photo (a Reference) in the same Save: the
// fields save (conflict check, LastModified stamp), then the photo.
// Every write request in turn fails, or lands with its answer lost; then
// Save Changes again while the form still has unsaved edits.
// The Save is driven by its real button; the flow waits for the toast that
// ends every Save (a condition with a 10 s ceiling, never a fixed wait).
// See tests/fi_lib.js.

const { defineSuite } = require("./harness");
const { sweepFlow, assertKnown } = require("./fi_lib");

const FLOW = () => {
  const ID = "AY-00099";
  const ALL = ["CollectionID", "Year", "MintMark", "Denomination", "Variety", "Description",
    "Value", "Cost", "Shipping", "Seller_Link", "PurchaseDate", "StorageLocation", "Container",
    "Grade", "GradeSource", "Designation", "SerNo", "CACBean", "Remarks", "Reviewed", "LastModified",
    "Finish", "CoinID", "Status", "SaleDate", "SalePrice", "Buyer", "Platform"];
  const PH = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"];
  const blank = (n) => new Array(n).fill("");
  const NOTE = "Bought at the show (Build 2 sweep)";
  const tagged = (tag, size) => {
    const a = new Uint8Array(size); for (let i = 0; i < size; i++) a[i] = (tag.charCodeAt(i % tag.length) * 3 + i) & 255;
    const b = new Blob([a], { type: "image/jpeg" }); b.__fiTag = tag; return b;
  };
  const coin = { id: ID, name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" };
  window.__flow = {
    sheets: ["All", "Photos"],
    async setup() {
      const row = [ID, 1916, "D", "10C", "", "Mercury Dime", 40, 30, 0, "", null, "Safe", "", "VF-20", "Owner", "", "", "", "",
        "", null, "Business Strike", "C-1916-D-10C-01", "Owned", null, null, "", ""];
      const mock = createMockGraphClient({ sheets: {
        All: [ALL.slice(), row],
        Photos: [PH.slice(), ["PH-00001", ID, "Obverse", "", ID + "_obverse_cropped.jpg", "", 46000, ""],
          blank(PH.length), blank(PH.length), blank(PH.length)]
      } });
      mock._store.set(writePaths().coinPhotos + "/" + ID + "_obverse_cropped.jpg", { kind: "bytes", value: tagged("obv", 100) });
      __setGraphClientForTest(mock);
      __resetAllHeaderMapForTest(); __resetSheetHeaderMapsForTest();
      __setAddCoinWriteEnabledForTest(true); __setBrowseEditWriteEnabledForTest(true);
      __setDocketWriteEnabledForTest(false);
      __setLiveCoinsForTest([coin]);
      __setStoredPhotosForTest({ [ID]: [
        { photoId: "PH-00001", photoType: "Obverse", galleryType: "obverse", subGroupId: "", filename: ID + "_obverse_cropped.jpg", originalFilename: "", label: "" }
      ] });
      delete galleryStore[ID];
      if (!window.__fiToastHooked) {
        window.__fiToastHooked = true;
        const orig = window.showToast;
        window.showToast = function (msg, ...rest) {
          window.__fiToasts = (window.__fiToasts || []).concat([String(msg)]);
          const w = window.__fiToastWaiter; window.__fiToastWaiter = null; if (w) w(String(msg));
          return orig.call(this, msg, ...rest);
        };
      }
      window.__fiToasts = [];
      navigate("browse");
      showBrowseDetail(coin);
      showBrowseEditView(coin);
      await loadBrowseEditSnapshot(coin);
      renderManagePhotosInto("browseEditPhotosSections", buildManagePhotosCtx(coin), { showSetChildren: false });
      const notes = document.getElementById("browseEditNotes");
      notes.value = NOTE; notes.dispatchEvent(new Event("input", { bubbles: true }));
      const r = tagged("newref", 600);
      addGalleryEntryAndCommit(ID, { type: "reference", blob: r, url: URL.createObjectURL(r), caption: "" }, null);
      if (!unsavedEditsForView() || !pendingPhotoCount(ID)) throw new Error("flow setup: the edits are not pending: " + JSON.stringify({ unsaved: unsavedEditsForView(), photos: pendingPhotoCount(ID), commit: photoCommitTargetId(ID), view: (document.querySelector(".view.active") || {}).id, cur: currentBrowseCoin && currentBrowseCoin.id }));
      return mock;
    },
    // Taps Save Changes and waits for the toast that ends the Save.
    async tapSave() {
      window.__fiToasts = [];
      const done = new Promise(res => { window.__fiToastWaiter = res; });
      document.getElementById("browseEditSaveBtn").click();
      const ceiling = new Promise(res => setTimeout(() => res("(no toast within 10 s)"), 10000));
      const first = await Promise.race([done, ceiling]);
      // The Save may add a second toast (a photo result after the fields): wait
      // for the lock to clear, on its condition with the same ceiling.
      for (let i = 0; i < 500 && editSaveInFlight; i++) await new Promise(r => setTimeout(r, 20));
      return (window.__fiToasts || []).join(" / ") || first;
    },
    async run() {
      const text = await this.tapSave();
      if (/Nothing was saved|nothing was written/i.test(text)) return { said: "nothing", text };
      if (/Couldn't|not saved|failed|refused|changed since/i.test(text)) return { said: "failed", text };
      return { said: "saved", text };
    },
    async retry() {
      if (currentBrowseCoin && unsavedEditsForView()) await this.tapSave();
    },
    async picksLost(mock) {
      const lost = [];
      const row = __fi.rowsOf(mock, "All").find(r => r.CollectionID === ID) || {};
      const formHas = currentBrowseCoin && document.getElementById("browseEditNotes").value === NOTE && unsavedEditsForView();
      if (row.Remarks !== NOTE && !formHas) lost.push("the notes edit is neither on the form nor saved");
      const pending = galleryFor(ID).some(e => e.pendingSave && e.blob && e.blob.__fiTag === "newref");
      const P = writePaths();
      const landed = __fi.rowsOf(mock, "Photos").some(r => { const e = mock._store.get(P.coinPhotos + "/" + r.Filename); return e && e.value && e.value.__fiTag === "newref"; });
      if (!pending && !landed) lost.push("the new photo is neither pending nor saved");
      return lost;
    }
  };
};

// Violations the sweep finds today, each tagged with its review finding:
// A8 the fields write lands but its answer is lost: Save Changes again is
//    refused as "changed since you opened" (the app's own write), so the
//    photo never saves (Build 8's agreed rule fixes this);
// A5 the Photos row (or its date format) lands but the Save reports
//    failure: Save again writes a second row; A14 the upload's answer is lost.
// The list only shrinks: a build that fixes one deletes its line.
// Fixed in Build 5 and deleted: A5 (6 lines; the row and its date format are one request,
// and Save again reuses the row with this CollectionID and Filename) and A14
// (1; a 409 with the same bytes and no row naming the file is adopted).
const KNOWN = [
  ["A8", "lost patchWorkbookRanges All!S#:T#,U#: C5 after retry, vs a clean run: Photos +0/-1; files -1 from CoinPhotos"]
];

module.exports = defineSuite("fi-edit-coin", async ({ check, selfCheck, openApp, appReady, PHONE }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp(PHONE);
  const r = await sweepFlow(page, appReady, FLOW, {});
  ok("clean run: saved, no violations, the retry changes nothing", r.cleanProblems.length === 0, r.cleanProblems);
  // (Build 5, A5) A new Photos row and its date format are ONE request, so
  // the flow is exactly these three writes (it was four).
  ok("the flow makes write requests to sweep (" + r.K + ": " + r.calls.join(" | ") + ")",
    r.K === 3 && r.calls.join(" | ") === "patchWorkbookRanges All!S#:T#,U# | uploadFile CoinPhotos/AY-00099_reference_01.jpg | patchWorkbookRanges Photos!A#:H#,G#:G#", r.calls);
  assertKnown(ok, "fi-edit-coin", r, KNOWN);
}, module);
