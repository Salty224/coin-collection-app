// Failure injection (B6, Build 2): Purge of a Sold coin's photos (an
// Obverse crop with its original, and a Reference: a full purge, so the
// Purged flag is written too). Every write request in turn fails, or lands
// with its answer lost; then Purge again. C3 (nothing deleted that is still
// referenced) is the check that matters here: Purge must detach a row
// BEFORE deleting its file (invariant 14). See tests/fi_lib.js.

const { defineSuite } = require("./harness");
const { sweepFlow, assertKnown } = require("./fi_lib");

const FLOW = () => {
  const ID = "AY-90001";
  const ALL = ["CollectionID", "CoinID", "Denomination", "MintMark", "Year", "Description", "Grade", "GradeSource",
    "Value", "Cost", "Status", "SalePrice", "Buyer", "Purged", "Reviewed", "LastModified", "Remarks"];
  const PH = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"];
  const blank = (n) => new Array(n).fill("");
  const FILES = [ID + "_obverse_cropped.jpg", ID + "_obverse_original.jpg", ID + "_reference_01.jpg"];
  window.__flow = {
    sheets: ["All", "Photos"],
    async setup() {
      const mock = createMockGraphClient({ sheets: {
        All: [ALL.slice(), [ID, "C-1", "$1", "CC", 1889, "Morgan Dollar", "MS-64", "PCGS", 900, 800, "Sold", 900, "Bob", "", "Yes", "", "keep me"]],
        Photos: [PH.slice(),
          ["PH-00001", ID, "Obverse", "", FILES[0], "", 46000, FILES[1]],
          ["PH-00002", ID, "Reference", "", FILES[2], "Auction listing", 46000, ""],
          blank(PH.length), blank(PH.length)]
      } });
      FILES.forEach((f, i) => mock._store.set(writePaths().coinPhotos + "/" + f, { kind: "bytes", value: new Uint8Array([i + 1, 2, 3]) }));
      __setGraphClientForTest(mock);
      __setPurgeWriteEnabledForTest(true);
      __resetAllHeaderMapForTest(); __resetSheetHeaderMapsForTest();
      __setLiveCoinsForTest([{ id: ID, name: "Morgan Dollar", denom: "$1", year: 1889, mint: "CC", grade: "MS-64", gradeSource: "PCGS",
        status: "Sold", salePrice: 900, buyer: "Bob", purged: "", obversePhotoFile: "", reversePhotoFile: "", value: 900, cost: 800 }]);
      __setStoredPhotosForTest({ [ID]: [
        { photoId: "PH-00001", photoType: "Obverse", galleryType: "obverse", subGroupId: "", filename: FILES[0], originalFilename: FILES[1], label: "" },
        { photoId: "PH-00002", photoType: "Reference", galleryType: "reference", subGroupId: "", filename: FILES[2], originalFilename: "", label: "Auction listing" }
      ] });
      return mock;
    },
    async run() {
      const res = await purgeCoinPhotos(ID, fileRowsForPhotos(purgeablePhotosFor(ID)));
      return { said: res.ok && !res.failed.length ? "saved" : "failed",
        text: "deleted " + res.deleted.length + ", failed " + res.failed.length + (res.failed[0] ? " (" + res.failed[0].stage + ")" : "") };
    },
    // Purge again whatever is still listed.
    async retry() {
      const left = fileRowsForPhotos(purgeablePhotosFor(ID));
      if (left.length) await purgeCoinPhotos(ID, left);
      else await finalisePurgedFlag(ID).catch(() => null);
    }
  };
};

// Violations the sweep finds today, each tagged with its finding. None is
// in the review; all three are new in Build 2 (no data lost in any):
// N2 a file delete that fails AFTER its row was detached leaves the file in
//    CoinPhotos with no row; Purge again cannot see it (it lists rows).
// N3 the Purged flag write fails, yet Purge reports success; the flag stays
//    blank (the coin still looks partly purged).
// N4 the detach's row write lands but its answer is lost (or the second
//    PATCH of the detach fails): the files are kept (right), but Purge again
//    skips the photo because its row is gone, so the files and the flag
//    are never finished.
// The list only shrinks: a build that fixes one deletes its line.
const KNOWN = [
  ["N2", "fail deleteItem CoinPhotos/AY-90001_obverse_cropped.jpg: C5 after retry, vs a clean run: files +1 in CoinPhotos"],
  ["N2", "fail deleteItem CoinPhotos/AY-90001_obverse_original.jpg: C5 after retry, vs a clean run: files +1 in CoinPhotos"],
  ["N2", "fail deleteItem CoinPhotos/AY-90001_reference_01.jpg: C5 after retry, vs a clean run: files +1 in CoinPhotos"],
  ["N3", "fail patchWorkbookRanges All!N#,P#: C4 reported saved, but vs a clean run: All +1/-1"],
  ["N4", "fail patchWorkbookRanges Photos!G#:G# #2: C5 after retry, vs a clean run: All +1/-1; files +1 in CoinPhotos"],
  ["N4", "fail patchWorkbookRanges Photos!G#:G#: C5 after retry, vs a clean run: All +1/-1; files +2 in CoinPhotos"],
  ["N4", "lost patchWorkbookRanges Photos!A#:H# #2: C5 after retry, vs a clean run: All +1/-1; files +1 in CoinPhotos"],
  ["N4", "lost patchWorkbookRanges Photos!A#:H#: C5 after retry, vs a clean run: All +1/-1; files +2 in CoinPhotos"],
  ["N4", "lost patchWorkbookRanges Photos!G#:G# #2: C5 after retry, vs a clean run: All +1/-1; files +1 in CoinPhotos"],
  ["N4", "lost patchWorkbookRanges Photos!G#:G#: C5 after retry, vs a clean run: All +1/-1; files +2 in CoinPhotos"]
];

module.exports = defineSuite("fi-purge", async ({ check, selfCheck, openApp, appReady, PHONE }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp(PHONE);
  const r = await sweepFlow(page, appReady, FLOW, {});
  ok("clean run: done, no violations, the retry changes nothing", r.cleanProblems.length === 0, r.cleanProblems);
  ok("the flow makes write requests to sweep (" + r.K + ": " + r.calls.join(" | ") + ")", r.K >= 4, r.calls);
  assertKnown(ok, "fi-purge", r, KNOWN);
}, module);
