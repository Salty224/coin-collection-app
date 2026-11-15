// In-page flow definitions for the coin-draft failure sweeps (B6, Build 2):
// Promote, Force Add, Mark as promoted and Reject of a Staging coin draft
// with an Obverse (cropped + original), a Reference and a receipt.
// Not a suite; each verify_fi_<flow>.js passes its mode to sweepFlow.

const ALL_HEADERS = [
  "CollectionID", "CoinID", "Denomination", "Category", "Year", "MintMark",
  "Variety", "Description", "Finish", "Designation", "Grade", "GradeSource",
  "SerNo", "CACBean", "Cost", "Shipping", "Total", "Seller_Link",
  "PurchaseDate", "SpotValue", "Value", "StorageLocation", "Container",
  "Remarks", "Reviewed", "LastModified", "Error", "Status", "FaceValue"
];

const DRAFT_FLOW = ({ mode, ALL_HEADERS }) => {
  const ID = "AY-00706";
  const PH = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"];
  const RH = ["ReceiptID", "CollectionID", "Filename", "DateAdded"];
  const MATCH_ROW = { denom: "1C", year: 1943, mint: "S", variety: "", description: "Lincoln Wheat",
    finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0, coinId: "C-1943-S-1C-01", composition: "Steel" };
  // Distinct bytes per file, so sameFileBytes tells them apart.
  const tagged = (tag, size, type) => {
    const a = new Uint8Array(size); for (let i = 0; i < size; i++) a[i] = (tag.charCodeAt(i % tag.length) + i) & 255;
    const b = new Blob([a], { type: type || "image/jpeg" }); b.__fiTag = tag; return b;
  };
  const FILES = [
    [ID + "_obverse_cropped.jpg", "obvc"], [ID + "_obverse_original.jpg", "obvo"],
    [ID + "_reference_01.jpg", "ref1"], [ID + "_receipt.pdf", "rcpt"]
  ];
  const blankRow = (n) => new Array(n).fill("");
  window.__flow = {
    sheets: ["All", "Photos", "Receipts"],
    jsonDropKeys: ["promotedDate", "forceAddedDate", "createdDate", "lastSaved", "savedAt", "updatedAt", "updatedDate", "modifiedDate"],
    async setup() {
      const all = [ALL_HEADERS.slice(), ["AY-00001", "C-OLD", "$1", "", 1889, "CC"]];
      if (mode === "mark") {
        // The coin is already on All with the draft's values (Mark as promoted's case).
        const r = blankRow(ALL_HEADERS.length);
        const set = (k, v) => { r[ALL_HEADERS.indexOf(k)] = v; };
        set("CollectionID", ID); set("CoinID", "C-1943-S-1C-01"); set("Denomination", "1C"); set("Category", "Coin");
        set("Year", 1943); set("MintMark", "S"); set("Description", "Lincoln Wheat"); set("Finish", "Business Strike");
        set("Grade", "MS-66"); set("GradeSource", "PCGS"); set("Status", "Owned");
        all.push(r);
      }
      for (let i = 0; i < 4; i++) all.push(blankRow(ALL_HEADERS.length));
      const mock = createMockGraphClient({ sheets: {
        All: all,
        Photos: [PH.slice(), ...Array.from({ length: 6 }, () => blankRow(PH.length))],
        Receipts: [RH.slice(), ...Array.from({ length: 4 }, () => blankRow(RH.length))]
      } });
      const folder = coinDraftFolder(ID);
      FILES.forEach(([n, t]) => mock._store.set(folder + "/" + n, { kind: "bytes", value: tagged(t, 200 + n.length, /\.pdf$/.test(n) ? "application/pdf" : "image/jpeg") }));
      const draft = {
        type: "coin", version: 1, collectionID: ID, status: COIN_DRAFT_STATUS.READY,
        denom: "1C", year: "1943", mint: "S", variety: "", description: "Lincoln Wheat",
        finish: "Business Strike", category: "Coin", grade: "MS-66", gradeSource: "PCGS",
        coinId: mode === "force" ? "" : "C-1943-S-1C-01", allRowWritten: false, forceAdded: false,
        createdDate: "2026-11-15T10:00:00.000Z",
        photos: [
          { type: "obverse", filename: ID + "_obverse_cropped.jpg", caption: "" },
          { type: "obverse", filename: ID + "_obverse_original.jpg", caption: "original" },
          { type: "reference", filename: ID + "_reference_01.jpg", caption: "PCGS photo" }
        ],
        receiptPhoto: ID + "_receipt.pdf"
      };
      mock._store.set(folder + "/coin.json", { kind: "json", value: draft });
      __setGraphClientForTest(mock);
      __setAddCoinWriteEnabledForTest(true); __setBrowseEditWriteEnabledForTest(true);
      __setDocketWriteEnabledForTest(false);
      __setLiveDbCoinsForTest([MATCH_ROW]);
      __resetAllHeaderMapForTest(); __resetSheetHeaderMapsForTest();
      __setFinishWriteRetryMsForTest(0);
      if (!window.__fiToastHooked) {
        window.__fiToastHooked = true;
        const orig = window.showToast;
        window.showToast = function (msg, ...rest) { window.__fiToasts = (window.__fiToasts || []).concat([String(msg)]); return orig.call(this, msg, ...rest); };
      }
      window.__fiToasts = [];
      return mock;
    },
    async run() {
      window.__fiToasts = [];
      const toasts = () => (window.__fiToasts || []).join(" / ");
      if (mode === "promote" || mode === "force") {
        const okRun = mode === "promote" ? await promoteCoinDraft(ID) : await forceAddCoinDraft(ID);
        const text = toasts();
        if (!okRun) return { said: "failed", text };
        return { said: /failed/i.test(text) ? "failed" : "saved", text };
      }
      if (mode === "mark") {
        const done = await markCoinDraftAlreadyPromoted(ID);
        const text = toasts();
        return { said: done ? "saved" : /nothing was changed/.test(text) ? "nothing" : "failed", text };
      }
      if (mode === "reject") {
        await performRejectStagedCoin(ID);
        const text = toasts();
        return { said: /rejected —/.test(text) ? "saved" : "failed", text };
      }
      throw new Error("unknown mode " + mode);
    },
    // Ray's next step: tap the same button again if the draft is still open,
    // then a relaunch (the launch-time retry of promoted drafts).
    async retry() {
      const d = await readCoinDraft(ID).catch(() => null);
      if (mode === "promote" && d && d.status !== COIN_DRAFT_STATUS.PROMOTED) await promoteCoinDraft(ID);
      if (mode === "force" && d && !d.allRowWritten) await forceAddCoinDraft(ID);
      if (mode === "mark" && d && d.status !== COIN_DRAFT_STATUS.PROMOTED) await markCoinDraftAlreadyPromoted(ID);
      if (mode === "reject" && d) await performRejectStagedCoin(ID);
      await processPromotedCoinDrafts();
    },
    // C1: every captured file still exists (Staging or its final home) with
    // its own bytes — except after a Reject, whose whole point is deleting them.
    async picksLost(mock) {
      if (mode === "reject") return [];
      const lost = [];
      const P = writePaths(), folder = coinDraftFolder(ID);
      FILES.forEach(([n, t]) => {
        const homes = [folder + "/" + n, (/\.pdf$/.test(n) ? P.coinReceipts : P.coinPhotos) + "/" + n];
        if (!homes.some(h => { const e = mock._store.get(h); return e && e.value && e.value.__fiTag === t; }))
          lost.push(n + " is in neither Staging nor its final folder");
      });
      // A4's hazard: the coin is on All but its draft does not say so, so a
      // Reject would be allowed now and would delete files that exist only in Staging.
      const onAll = __fi.rowsOf(mock, "All").some(r => r.CollectionID === ID);
      const de = mock._store.get(folder + "/coin.json");
      const d = de && de.value;
      if (onAll && d && !d.allRowWritten && FILES.some(([n]) => mock._store.has(folder + "/" + n) && !mock._store.has((/\.pdf$/.test(n) ? P.coinReceipts : P.coinPhotos) + "/" + n)))
        lost.push("the coin is on All but its draft is not marked written, so Reject would delete the only copies (A4)");
      return lost;
    }
  };
};

module.exports = { DRAFT_FLOW, ALL_HEADERS };
