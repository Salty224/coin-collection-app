// Failure injection (B6, Build 2): Add Coin's first save, two flows:
//   staging   Save to Staging (a new draft: coin.json, photos, receipt);
//   database  Save to Database with a clean catalog match (the draft, then
//             Promote in the same motion).
// The form holds a Holder front, a Reference and a receipt. Every write
// request in turn fails, or lands with its answer lost; then Ray's next
// step: Save again if the form still holds the coin, Promote if a draft is
// left unpromoted, and a relaunch. See tests/fi_lib.js.

const { defineSuite } = require("./harness");
const { sweepFlow, assertKnown } = require("./fi_lib");

const FLOW = (mode) => {
  const PH = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"];
  const RH = ["ReceiptID", "CollectionID", "Filename", "DateAdded"];
  const ALL = ["CollectionID", "CoinID", "Denomination", "Category", "Year", "MintMark", "Variety", "Description", "Finish",
    "Designation", "Grade", "GradeSource", "SerNo", "CACBean", "Cost", "Shipping", "Seller_Link", "PurchaseDate", "Value",
    "StorageLocation", "Container", "Remarks", "Reviewed", "LastModified", "Error", "Status", "FaceValue"];
  const blank = (n) => new Array(n).fill("");
  const tagged = (tag, size, type) => {
    const a = new Uint8Array(size); for (let i = 0; i < size; i++) a[i] = (tag.charCodeAt(i % tag.length) * 7 + i) & 255;
    const b = new Blob([a], { type: type || "image/jpeg" }); b.__fiTag = tag; return b;
  };
  const TAGS = ["holder", "ref", "rcpt"];
  window.__flow = {
    sheets: ["All", "Photos", "Receipts"],
    // firstWriteToken (A1, Build 3): a random value per new draft, like a time stamp.
    jsonDropKeys: ["promotedDate", "forceAddedDate", "createdDate", "updatedDate", "lastSaved", "savedAt", "updatedAt", "modifiedDate", "firstWriteToken"],
    async setup() {
      const mock = createMockGraphClient({
        workbookColumns: { "All::CollectionID": ["AY-00500"] },
        sheets: {
          All: [ALL.slice(), ["AY-00500", "C-OLD", "$1", "Coin", 1889, "CC"], blank(ALL.length), blank(ALL.length), blank(ALL.length)],
          Photos: [PH.slice(), ...Array.from({ length: 6 }, () => blank(PH.length))],
          Receipts: [RH.slice(), ...Array.from({ length: 4 }, () => blank(RH.length))]
        }
      });
      __setGraphClientForTest(mock);
      __setAddCoinWriteEnabledForTest(true); __setBrowseEditWriteEnabledForTest(true);
      __setDocketWriteEnabledForTest(false);
      __resetAllHeaderMapForTest(); __resetSheetHeaderMapsForTest();
      __setFinishWriteRetryMsForTest(0);
      __setLiveDbCoinsForTest([{ denom: "10C", year: 1916, mint: "D", variety: "", description: "Mercury Dime",
        finish: "Business Strike", designation: "", coinId: "C-1916-D-10C-01", pcgs: "4682", mintage: 264000, gsid: "" }]);
      navigate("addcoin");
      ["denomination:10C", "year:1916", "mintMark:D", "description:Mercury Dime", "finish:Business Strike"].forEach(kv => {
        const [k, v] = kv.split(":"); document.getElementById(k).value = v; });
      const coinBtn = document.getElementById("addCoinCategoryCoinBtn"); if (coinBtn) coinBtn.click();
      checkDbCoinsMatch();
      const h = tagged("holder", 900), r = tagged("ref", 700);
      addGalleryEntry(ADDCOIN_GALLERY_ID, { type: "slab_obverse", blob: h, url: URL.createObjectURL(h), caption: "" });
      addGalleryEntry(ADDCOIN_GALLERY_ID, { type: "reference", blob: r, url: URL.createObjectURL(r), caption: "PCGS photo" });
      receiptFiles["receiptPreview"] = { blob: tagged("rcpt", 500, "application/pdf"), filename: "receipt.pdf" };
      if (!window.__fiToastHooked) {
        window.__fiToastHooked = true;
        const orig = window.showToast;
        window.showToast = function (msg, ...rest) { window.__fiToasts = (window.__fiToasts || []).concat([String(msg)]); return orig.call(this, msg, ...rest); };
      }
      window.__fiToasts = [];
      return mock;
    },
    async save() {
      return new Promise((resolve, reject) => resolveAddCoinCatalogMatch(
        (m) => completeAddCoinSave(mode, m).then(resolve, reject), () => resolve("cancelled")));
    },
    async run() {
      window.__fiToasts = [];
      await this.save();
      const text = (window.__fiToasts || []).join(" / ");
      if (/nothing was written/i.test(text)) return { said: "nothing", text };
      if (/Couldn't|didn't upload|failed/i.test(text)) return { said: "failed", text };
      return { said: "saved", text };
    },
    // Save again while the form still holds the coin; Promote a draft left
    // unpromoted (database mode); then a relaunch.
    async retry() {
      if (String(document.getElementById("year").value || "").trim()) await this.save();
      if (mode === "database") {
        const drafts = await listCoinDrafts().catch(() => []);
        for (const d of drafts) if (d.status !== COIN_DRAFT_STATUS.PROMOTED && !d.allRowWritten) await promoteCoinDraft(d.collectionID);
      }
      await processPromotedCoinDrafts();
    },
    // C1: each pick is still on the form, or landed (Staging or its final folder).
    async picksLost(mock) {
      const onForm = new Set();
      galleryFor(ADDCOIN_GALLERY_ID).forEach(e => { if (e.blob && e.blob.__fiTag) onForm.add(e.blob.__fiTag); });
      const rf = receiptFiles["receiptPreview"]; if (rf && rf.blob && rf.blob.__fiTag) onForm.add(rf.blob.__fiTag);
      const landed = new Set();
      for (const [, e] of mock._store.entries()) if (e && e.value && e.value.__fiTag) landed.add(e.value.__fiTag);
      return TAGS.filter(t => !onForm.has(t) && !landed.has(t)).map(t => "the " + t + " pick is neither on the form nor saved");
    }
  };
};

// Tags: A3 a failed file move or Photos / Receipts row after the Promote is
// silent and not retried; A5 a relaunch re-records rows, duplicating a
// Reference. The list only shrinks: a build that fixes one deletes its line.
// Fixed in Build 3 and deleted: A2 (30 lines: a pick whose upload failed was
// dropped from the form, and Save again reserved a NEW id and wrote a second
// draft, in database mode a second coin row on All; now the form becomes the
// Staging-draft edit of the same id) and, with it, 6 A8 lines ("nothing was
// written" after a failed or lost draft write while files had landed; that
// wording is gone from this path, since the save now carries on under the
// same id). A8's seventh line (verify_fi_edit_coin) stays for Build 8.
const KNOWN_STAGING = [];
const KNOWN_DATABASE = [
  ["A3", "fail deleteItem Staging/AY-00501/AY-00501_receipt.pdf: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +1 in Staging/{id}; changed coin.json"],
  ["A3", "fail deleteItem Staging/AY-00501/AY-00501_reference_01.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +2 in Staging/{id}; files -1 from CoinReceipts; changed coin.json"],
  ["A3", "fail deleteItem Staging/AY-00501/AY-00501_slab_obverse.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +3 in Staging/{id}; files -2 from CoinPhotos,CoinReceipts; changed coin.json"],
  ["A3", "fail patchWorkbookRanges Photos!A#:H# #2: C4 reported saved, but vs a clean run: Photos +0/-1"],
  ["A3", "fail patchWorkbookRanges Photos!A#:H# #2: C5 after retry, vs a clean run: Photos +0/-1"],
  ["A3", "fail patchWorkbookRanges Photos!A#:H#: C4 reported saved, but vs a clean run: Photos +0/-1"],
  ["A3", "fail patchWorkbookRanges Photos!A#:H#: C5 after retry, vs a clean run: Photos +0/-1"],
  ["A3", "fail patchWorkbookRanges Receipts!A#:D#: C4 reported saved, but vs a clean run: Receipts +0/-1"],
  ["A3", "fail patchWorkbookRanges Receipts!A#:D#: C5 after retry, vs a clean run: Receipts +0/-1"],
  ["A3", "fail uploadBytes CoinPhotos/AY-00501_reference_01.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +2 in Staging/{id}; files -2 from CoinPhotos,CoinReceipts; changed coin.json"],
  ["A3", "fail uploadBytes CoinPhotos/AY-00501_slab_obverse.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +3 in Staging/{id}; files -3 from CoinPhotos,CoinReceipts; changed coin.json"],
  ["A3", "fail uploadBytes CoinReceipts/AY-00501_receipt.pdf: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +1 in Staging/{id}; files -1 from CoinReceipts; changed coin.json"],
  ["A3", "fail uploadJson Staging/AY-00501/coin.json #4: C4 reported saved, but vs a clean run: changed coin.json"],
  ["A5", "fail uploadJson Staging/AY-00501/coin.json #4: C5 after retry, vs a clean run: Photos +1/-0"],
  ["A5", "fail uploadJson Staging/AY-00501/coin.json #4: after retry C2 Photos has AY-00501_reference_01.jpg on 2 rows"],
  ["A3", "lost deleteItem Staging/AY-00501/AY-00501_receipt.pdf: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; changed coin.json"],
  ["A3", "lost deleteItem Staging/AY-00501/AY-00501_reference_01.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +1 in Staging/{id}; files -1 from CoinReceipts; changed coin.json"],
  ["A3", "lost deleteItem Staging/AY-00501/AY-00501_slab_obverse.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +2 in Staging/{id}; files -2 from CoinPhotos,CoinReceipts; changed coin.json"],
  ["A3", "lost uploadBytes CoinPhotos/AY-00501_reference_01.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +2 in Staging/{id}; files -1 from CoinReceipts; changed coin.json"],
  ["A3", "lost uploadBytes CoinPhotos/AY-00501_slab_obverse.jpg: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +3 in Staging/{id}; files -2 from CoinPhotos,CoinReceipts; changed coin.json"],
  ["A3", "lost uploadBytes CoinReceipts/AY-00501_receipt.pdf: C4 reported saved, but vs a clean run: Photos +0/-2; Receipts +0/-1; files +1 in Staging/{id}; changed coin.json"],
];

module.exports = defineSuite("fi-addcoin", async ({ check, selfCheck, openApp, appReady, PHONE }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp(PHONE);
  for (const [mode, known] of [["staging", KNOWN_STAGING], ["database", KNOWN_DATABASE]]) {
    const r = await sweepFlow(page, appReady, FLOW, { flowArg: mode });
    ok(mode + ": clean run: saved, no violations, the retry changes nothing", r.cleanProblems.length === 0, r.cleanProblems);
    ok(mode + ": the flow makes write requests to sweep (" + r.K + ": " + r.calls.join(" | ") + ")", r.K >= 3, r.calls);
    assertKnown(ok, "fi-addcoin " + mode, r, known);
  }
}, module);
