// Failure injection (B6, Build 2): receipt Save on a saved coin, two flows:
//   own     a coin's own receipt replaced by a new scan;
//   shared  a receipt two coins share, replaced "on all coins".
// savePhotosAndLabels -> savePendingReceipt, the same call Edit Coin and
// Edit Set make. Every write request in turn fails, or lands with its
// answer lost; then Save again. See tests/fi_lib.js.

const { defineSuite } = require("./harness");
const { sweepFlow, assertKnown } = require("./fi_lib");

const FLOW = (mode) => {
  const ID = mode === "shared" ? "AY-00095" : "AY-00099";
  const RH = ["ReceiptID", "CollectionID", "Filename", "DateAdded"];
  const ALL = ["CollectionID", "Year", "MintMark", "Denomination", "Description", "Status", "LastModified", "Reviewed"];
  const tagged = (tag, size) => { const b = new Blob([new Uint8Array(size)], { type: "application/pdf" }); b.__fiTag = tag; return b; };
  window.__flow = {
    sheets: ["All", "Receipts"],
    async setup() {
      const mock = createMockGraphClient({ sheets: {
        All: [ALL.slice(), ["AY-00099", 1916, "D", "10C", "Mercury Dime", "Owned", "", ""],
              ["AY-00095", 1916, "D", "10C", "Mercury Dime", "Owned", "", ""],
              ["AY-00051", 1916, "D", "10C", "Mercury Dime", "Owned", "", ""]],
        Receipts: [RH.slice(),
          ["RC-00001", "AY-00099", "AY-00099_receipt.pdf", 46000],
          ["RC-00002", "AY-00095", "shared.pdf", 46000],
          ["RC-00002", "AY-00051", "shared.pdf", 46000],
          ["", "", "", ""], ["", "", "", ""], ["", "", "", ""], ["", "", "", ""], ["", "", "", ""]]
      } });
      const R = writePaths().coinReceipts;
      mock._store.set(R + "/AY-00099_receipt.pdf", { kind: "bytes", value: tagged("old99", 50) });
      mock._store.set(R + "/shared.pdf", { kind: "bytes", value: tagged("shared", 60) });
      __setGraphClientForTest(mock);
      __resetSheetHeaderMapsForTest(); __resetAllHeaderMapForTest();
      __setAddCoinWriteEnabledForTest(true); __setBrowseEditWriteEnabledForTest(true);
      __setDocketWriteEnabledForTest(false);
      const coin = (id) => ({ id, name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" });
      __setLiveCoinsForTest([coin("AY-00099"), coin("AY-00095"), coin("AY-00051")]);
      __setStoredReceiptsForTest({
        "AY-00099": { receiptId: "RC-00001", filename: "AY-00099_receipt.pdf", binder: false, rowCount: 1 },
        "AY-00095": { receiptId: "RC-00002", filename: "shared.pdf", binder: false, rowCount: 1 },
        "AY-00051": { receiptId: "RC-00002", filename: "shared.pdf", binder: false, rowCount: 1 }
      });
      // The pick, exactly as holdPendingReceipt leaves it (no UI).
      const blob = tagged("newscan", 700);
      pendingReceipts[ID] = {
        previewId: "browseEditReceiptPreview", prepared: { blob, filename: ID + "_receipt.pdf", sourceWasPdf: true },
        pdf: true, previewSrc: "", replaces: storedReceiptSnapshot(ID), afterRemoval: false,
        scope: mode === "shared" ? "all" : "", scopeCoins: mode === "shared" ? 2 : 0,
        landedName: "", saving: false, error: "", refused: false
      };
      if (!pendingReceiptCount(ID)) throw new Error("flow setup: the receipt pick is not pending");
      return mock;
    },
    async run() {
      const res = await savePhotosAndLabels(ID, null);
      return { said: photoEditsAllSaved(res) ? "saved" : "failed", text: photoSaveHeadline(ID, res) + photoSaveFailureText(res, "Save") };
    },
    async retry() { return savePhotosAndLabels(ID, null); },
    async picksLost(mock) {
      const p = pendingReceipts[ID];
      if (p && p.prepared && p.prepared.blob && p.prepared.blob.__fiTag === "newscan") return [];
      const R = writePaths().coinReceipts;
      const rows = __fi.rowsOf(mock, "Receipts").filter(r => r.CollectionID === ID);
      const e = rows[0] && mock._store.get(R + "/" + rows[0].Filename);
      return e && e.value && e.value.__fiTag === "newscan" ? [] : ["the new receipt is neither pending nor saved"];
    }
  };
};

// N1 (new in Build 2; not in the review, which says receipts are idempotent
// on retry): the upload lands, its answer is lost, so landedName is never
// set; Save again picks the next free name and uploads a second copy.
const KNOWN_OWN = [
];
// A17: the "all coins" update writes one row per coin; a failure between
// them leaves one ReceiptID on two files until Save again (which heals it).
// Build 5: N1 fixed and its line deleted (the name is noted before the upload
// is sent, so the retry adopts the copy that landed). A5 sends a Receipts row
// and its DateAdded format in ONE request, so A17's two lines on the row
// request carry the new label ("Receipts!A#:D#,D#:D#") and its two lines on
// the separate format request are gone: that request no longer exists to fail.
// A17 is NOT fixed (Build 7).
const KNOWN_SHARED = [
  ["A17", "fail patchWorkbookRanges Receipts!A#:D#,D#:D# #2: C2 Receipts: RC-00002 points at 2 files"],
  ["A17", "lost patchWorkbookRanges Receipts!A#:D#,D#:D#: C2 Receipts: RC-00002 points at 2 files"]
];

module.exports = defineSuite("fi-receipts", async ({ check, selfCheck, openApp, appReady, PHONE }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp(PHONE);
  for (const [mode, known] of [["own", KNOWN_OWN], ["shared", KNOWN_SHARED]]) {
    const r = await sweepFlow(page, appReady, FLOW, { flowArg: mode });
    ok(mode + ": clean run: saved, no violations, the retry changes nothing", r.cleanProblems.length === 0, r.cleanProblems);
    ok(mode + ": the flow makes write requests to sweep (" + r.K + ": " + r.calls.join(" | ") + ")", r.K >= 2, r.calls);
    assertKnown(ok, "fi-receipts " + mode, r, known);
  }
}, module);
