// Receipts and photos alignment, Build 1 (Oct 2026,
// claude/receipts-photos-alignment).
//
// WHY. The Photos and Receipts tabs are now the ONLY record of a record's
// photos and receipt. The old flat All columns (Obverse, Reverse,
// Obverse_Original, Reverse_Original, Photo3, Photo4, OGPPhoto, Receipt)
// used to be read as a fallback, so a removed photo came back on reload and
// the two sources could disagree. After this build is LIVE, Copilot turns
// those columns into formulas over the tabs and renames them (Holder_Front,
// Holder_Back, References, COA_Photos, OGP_Photos, Other_Photos; Obverse,
// Reverse and Receipt keep their names). The app must work with the old
// names, the new names, or the columns gone, and must never write any of
// them, so the formulas survive.
//
//   SELF the shared check helper's must-fail self-check
//   R    read side: no All fallback anywhere (mapper, flip card, Manage Photos,
//        Docket missing-photo, Purge, receipt slot, detail page); a removed
//        photo stays gone once the index is rebuilt from the sheets; the
//        legacy-only code is gone from app.html
//   F    a coin's receipt is its FIRST Receipts row (index, slot, detail);
//        2+ rows refused on Save and flagged on the Docket
//   B    Binder rows: detail and slot "Not scanned (paper receipt in
//        binder)", never opened as a file, ignored by the filename checks;
//        the "Not scanned, paper in binder" button shows ONLY while the slot
//        has no receipt (hidden over a stored or pending scan and over a
//        Binder); its pick is pending (guard, dimmed Save, Discard, ✕) and
//        Save writes a Binder row with a NEW ReceiptID; a scan over a Binder
//        row keeps its ReceiptID
//   AC   Add Coin and the Staging-draft edit: the Binder option, coin.json's
//        receiptBinder, "Replaces … when you save", ✕ undo, promotion writes
//        a Binder row
//   AS   Add Set: the Binder option rides on the Set draft and promotion
//        writes a Binder row
//   D    Docket drift rows: only after the rename, by new name only, the
//        comparison rules, one row per column, no Dismiss
//   W    no write ever touches a media column, under the old names, the new
//        names, or with the columns missing: Edit Coin Save, promotion,
//        Force Add, CoinID / OriginSetID / Purged cells; formula cells
//        survive; a blank row whose media formulas show something is still
//        claimed; the static list of every All write site

const fs = require("fs");
const path = require("path");
const { defineSuite } = require("./harness");

const RECEIPT_HEADERS = ["ReceiptID", "CollectionID", "Filename", "DateAdded"];
const PHOTO_HEADERS = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"];

// All, with the media columns placed BETWEEN writable columns, so a write
// that merged across a gap would land on one.
const ALL_BASE = ["CollectionID", "Year", "MintMark", "Denomination", "Variety", "Description",
  "@0", "@1", "Value", "@2", "@3", "Cost", "Shipping", "@4", "Seller_Link", "PurchaseDate", "@5",
  "StorageLocation", "Container", "Grade", "GradeSource", "Designation", "SerNo", "CACBean", "Remarks",
  "@6", "@7", "@8", "Reviewed", "LastModified", "Finish", "CoinID", "Status", "SaleDate", "SalePrice",
  "Buyer", "Platform", "OriginSetID", "Purged", "Category", "Error", "FaceValue", "ValueSource",
  "ValueDate", "Total", "SpotValue"];
const MEDIA_OLD = ["Obverse", "Obverse_Original", "Reverse", "Reverse_Original", "Photo3", "Photo4", "OGPPhoto", "Receipt"];
const MEDIA_NEW = ["Obverse", "Holder_Front", "Reverse", "Holder_Back", "References", "COA_Photos", "OGP_Photos", "Other_Photos", "Receipt"];
function allHeaders(variant) {
  const media = variant === "old" ? MEDIA_OLD : variant === "new" ? MEDIA_NEW : [];
  return ALL_BASE.map(h => {
    if (h[0] !== "@") return h;
    return media[Number(h.slice(1))] || null;
  }).filter(Boolean);
}

const CATALOG = [
  { denom: "5C", year: 1938, mint: "D", variety: "", description: "Buffalo Nickel",
    finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0,
    coinId: "C-1938-D-5C-01", composition: "75% Copper, 25% Nickel" }
];
const DRAFT_ID = "AY-00754";
const BASE_DRAFT = {
  type: "coin", version: 1, collectionID: DRAFT_ID, status: "Draft",
  denom: "5C", category: "", year: "1938", mint: "D", variety: "",
  description: "Buffalo Nickel", finish: "Business Strike", designation: "",
  errorDesc: "", grade: "PR-66", gradeSource: "PCGS", serNo: "44556677",
  cacBean: "", cost: 30, shippingCost: 5, purchaseDate: "2026-10-20",
  vendor: "Seller", storageLocation: "Safe", container: "",
  assignAlbum: "", remarks: "", itemNumber: "", gsid: "",
  coinId: "C-1938-D-5C-01", matchedHow: "single",
  photos: [], receiptPhoto: DRAFT_ID + "_receipt.pdf",
  researchNote: "", allRowWritten: false, forceAdded: false, filesMovedOnPromotion: false,
  savedVia: "staging",
  createdDate: "2026-10-20T17:57:36Z"
};

async function setup(page) {
  await page.evaluate(({ RECEIPT_HEADERS, PHOTO_HEADERS }) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
    const colIndex = (letters) => { let n = 0; for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64); return n; };
    window.__ra = {
      sleep, events: [], uploads: [], patches: [], reads: [], mock: null, allPatchLog: [],
      coin: { id: "AY-00099", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" },
      other: { id: "AY-00095", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" },
      two: { id: "AY-00097", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" },
      binder: { id: "AY-00093", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" },
      none: { id: "AY-00094", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" },
      set: { id: "AY-00090", name: "1957 Proof Set", denom: "Multiple", year: 1957, mint: "", category: "Proof Set" },
      // A Proxy over the mock that records uploads, byte reads and every patch.
      wrap(mock) {
        const self = this;
        return new Proxy(mock, { get(t, k) {
          const v = t[k];
          if (typeof v !== "function") return v;
          return async (...a) => {
            if (k === "uploadFile" || k === "uploadBytes") { const n = String(a[0]).split("/").pop(); self.uploads.push(n); self.events.push("upload:" + n); }
            if (k === "getFileBytes") self.reads.push(String(a[0]).split("/").pop());
            if (k === "patchWorkbookRanges") {
              if (a[1] === "All") self.allPatchLog.push(a[2].map(e => e.address).join(","));
              self.events.push("patch:" + a[1]);
              self.patches.push({ sheet: a[1], addresses: a[2].map(e => e.address) });
            }
            return v.apply(t, a);
          };
        } });
      },
      // Columns (1-based) an A1 address covers.
      columnsOf(address) {
        const m = String(address).match(/^([A-Z]+)\d+(?::([A-Z]+)\d+)?$/);
        if (!m) return [];
        const a = colIndex(m[1]), b = colIndex(m[2] || m[1]);
        const out = []; for (let c = a; c <= b; c++) out.push(c); return out;
      },
      resetState() {
        const ov0 = document.getElementById("writeGuardOverlay"); if (ov0) ov0.classList.add("hidden");
        try { discardUnsavedPhotoEdits(); } catch (e) { /* not ready */ }
        browseEditTouchedFields.clear();
        try { resetAddCoinForm(); clearCoinDraftEditContext(); } catch (e) { /* not ready */ }
        Object.keys(pendingReceipts).forEach(k => delete pendingReceipts[k]);
        __resetMediaChangedForTest();
        navigateNow("dashboard");
      },
      // The receipt / photo world for B and F.
      async install() {
        this.resetState();
        const ALL = ["CollectionID", "Year", "MintMark", "Denomination", "Variety", "Description",
          "Value", "Cost", "Shipping", "Seller_Link", "PurchaseDate", "StorageLocation", "Container",
          "Grade", "GradeSource", "Designation", "SerNo", "CACBean", "Remarks", "Reviewed", "LastModified",
          "Finish", "CoinID", "Status", "Receipt", "Obverse"];
        const allRow = (id, denom, receipt) => [id, 1916, "D", denom || "10C", "", "Mercury Dime", 40, 30, 0, "", null,
          "Safe", "", "VF-20", "Owner", "", "", "", "", "", null, "Business Strike", "C-1916-D-10C-01", "Owned",
          receipt || "", ""];
        const mock = createMockGraphClient({ sheets: {
          All: [ALL, allRow("AY-00099", "10C", "AY-00099_receipt.pdf"), allRow("AY-00095", "10C", "shared.pdf"),
                allRow("AY-00097", "10C", "two_a.pdf"), allRow("AY-00093", "10C", "Binder"), allRow("AY-00094"),
                allRow("AY-00090", "Multiple")],
          Receipts: [RECEIPT_HEADERS,
            ["RC-00001", "AY-00099", "AY-00099_receipt.pdf", 46000],
            ["RC-00002", "AY-00095", "shared.pdf", 46000],
            ["RC-00002", "AY-00051", "shared.pdf", 46000],
            ["RC-00007", "AY-00097", "two_a.pdf", 46000],
            ["RC-00008", "AY-00097", "two_b.pdf", 46001],
            ["RC-00009", "AY-00093", "Binder", 46000],
            ["RC-00009", "AY-00052", "Binder", 46000],
            ["", "", "", ""], ["", "", "", ""], ["", "", "", ""], ["", "", "", ""]],
          Photos: [PHOTO_HEADERS,
            ["PH-00001", "AY-00099", "Obverse", "", "AY-00099_obverse_cropped.jpg", "", 46000, ""],
            ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""]]
        } });
        const rp = writePaths().coinReceipts + "/";
        await mock.uploadFile(rp + "AY-00099_receipt.pdf", new Blob(["OLD99"]));
        await mock.uploadFile(rp + "shared.pdf", new Blob(["SHARED"]));
        await mock.uploadFile(rp + "two_a.pdf", new Blob(["TWOA"]));
        await mock.uploadFile(rp + "two_b.pdf", new Blob(["TWOB"]));
        this.mock = mock;
        __setGraphClientForTest(this.wrap(mock));
        __resetSheetHeaderMapsForTest(); __resetAllHeaderMapForTest(); __resetMintedIdsForTest();
        __setAddCoinWriteEnabledForTest(true);
        __setBrowseEditWriteEnabledForTest(true);
        __setLiveCoinsForTest([this.coin, this.other, this.two, this.binder, this.none, this.set]);
        this.rebuildIndexes();
        __setCoinPhotoCacheForTest("AY-00099_obverse_cropped.jpg", URL.createObjectURL(new Blob([new Uint8Array([1])], { type: "image/jpeg" })));
        ["AY-00099", "AY-00095", "AY-00097", "AY-00093", "AY-00094", "AY-00090"].forEach(id => { delete galleryStore[id]; });
        closeImageSourceChooser();
        this.clearToast();
        this.events = []; this.uploads = []; this.patches = []; this.reads = [];
      },
      // Header-keyed objects from a mock grid, as fetchWorkbookSheetRows gives them.
      sheetObjects(name) {
        const g = this.mock._grids[name]; const h = g[0];
        return g.slice(1).map(r => { const o = {}; h.forEach((k, i) => { if (k) o[k] = r[i] == null ? "" : r[i]; }); return o; });
      },
      // What a reload would build: both indexes from the sheets as they are now.
      rebuildIndexes() {
        __setStoredPhotosForTest(buildPhotoIndex(this.sheetObjects("Photos")));
        __setStoredReceiptsForTest(buildReceiptIndex(this.sheetObjects("Receipts")));
      },
      rcGrid() { return this.mock._grids.Receipts; },
      rcRows(id) { return this.rcGrid().slice(1).filter(r => r[1] === id); },
      async openEditCoin(coin) {
        coin = coin || this.coin;
        navigate("browse"); showBrowseDetail(coin); showBrowseEditView(coin);
        await loadBrowseEditSnapshot(coin);
        await sleep(120);
        ["editCoinPhotosHeader", "browseEditReceiptAccordionHeader"].forEach(id => {
          const h = document.getElementById(id); if (h.getAttribute("aria-expanded") !== "true") h.click();
        });
        return true;
      },
      async openEditSet() {
        navigate("browse"); showBrowseDetail(this.set); showBrowseEditSetView(this.set);
        await sleep(80);
        ["editSetPhotosHeader", "editSetReceiptAccordionHeader"].forEach(id => {
          const h = document.getElementById(id); if (h.getAttribute("aria-expanded") !== "true") h.click();
        });
        return true;
      },
      async pick(prefix, name, text) {
        const input = document.getElementById(prefix + "ReceiptLibraryInput");
        const dt = new DataTransfer();
        dt.items.add(new File([text], name, { type: "application/pdf" }));
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        await sleep(120);
      },
      slot(prefix) {
        const stored = document.getElementById(prefix + "ReceiptStored");
        const rm = document.getElementById(prefix + "ReceiptRemoveBtn");
        const bb = document.getElementById(prefix + "ReceiptBinderBtn");
        const preview = document.getElementById(prefix + "ReceiptPreview");
        const box = preview.closest(".photo-box");
        const note = box.querySelector(".receipt-upload-state");
        const ph = document.getElementById(prefix + "ReceiptPlaceholder");
        return {
          stored: stored.textContent, storedBtn: !!stored.querySelector(".receipt-stored-btn"),
          removeShown: rm.style.display !== "none",
          binderShown: !!bb && !bb.classList.contains("hidden") && bb.offsetParent !== null,
          status: note && note.style.display !== "none" ? note.textContent : "",
          placeholder: ph ? ph.textContent : ""
        };
      },
      saveBtn(prefix) { return document.getElementById(prefix === "editSet" ? "browseEditSetSaveBtn" : "browseEditSaveBtn"); },
      dim(prefix) { const b = this.saveBtn(prefix); return { clean: b.classList.contains("is-clean"), disabled: b.disabled }; },
      async save(prefix) { this.saveBtn(prefix).click(); await sleep(60); await this.waitFor(() => !editSaveInFlight, 4000); await sleep(200); },
      async waitFor(fn, ms) { const end = Date.now() + (ms || 3000); while (Date.now() < end) { if (fn()) return true; await sleep(30); } return !!fn(); },
      toast() { const t = document.getElementById("toast"); return t.classList.contains("show") ? t.textContent : ""; },
      clearToast() { const t = document.getElementById("toast"); t.classList.remove("show"); t.textContent = ""; },
      guardOpen() { const o = document.getElementById("writeGuardOverlay"); return !!o && !o.classList.contains("hidden"); },
      guardText() { return (document.getElementById("writeGuardTitle").textContent || "") + " | " + (document.getElementById("writeGuardBody").textContent || ""); },
      clickGuard(label) {
        const b = [...document.querySelectorAll("#writeGuardBtns button")].find(x => x.textContent === label);
        if (!b) return false; b.click(); return true;
      },
      detailReceiptRow() {
        const rows = [...document.querySelectorAll("#browseDetailView .detail-row, #browseDetailView tr, #browseDetailView .kv-row")];
        const r = rows.find(x => /^\s*Receipt/.test(x.textContent));
        return r ? r.textContent.replace(/\s+/g, " ").trim() : null;
      },
      viewerOpen() { const v = document.getElementById("mediaViewer") || document.getElementById("mediaViewerOverlay"); return !!v && !v.classList.contains("hidden") && v.style.display !== "none"; }
    };
  }, { RECEIPT_HEADERS, PHOTO_HEADERS });
}

module.exports = defineSuite("receipts-photos-alignment", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);
  await setup(page);

  // ---------- R. read side: no All fallback ------------------------------
  const R = await page.evaluate(async () => {
    const W = __ra; await W.install();
    const out = {};
    const rowOld = { CollectionID: "AY-00300", Description: "Mercury Dime", Denomination: "10C", Year: 1916,
      Obverse: "AY-00300_obverse.jpg", Reverse: "AY-00300_reverse.jpg", Obverse_Original: "AY-00300_slab_obverse.jpg",
      Reverse_Original: "x.jpg", Photo3: "AY-00300_combined.jpg", Photo4: "y.jpg", OGPPhoto: "z.jpg",
      Receipt: "AY-00300_receipt.pdf" };
    const rowNew = Object.assign({}, rowOld, { CollectionID: "AY-00301", Holder_Front: "h.jpg", Holder_Back: "", References: "a; b",
      COA_Photos: "", OGP_Photos: "", Other_Photos: "" });
    delete rowNew.Obverse_Original; delete rowNew.Reverse_Original; delete rowNew.Photo3; delete rowNew.Photo4; delete rowNew.OGPPhoto;
    const rowNone = { CollectionID: "AY-00302", Description: "Mercury Dime", Denomination: "10C", Year: 1916 };
    const cOld = mapWorkbookRowToCoin(rowOld), cNew = mapWorkbookRowToCoin(rowNew), cNone = mapWorkbookRowToCoin(rowNone);
    const legacyKeys = ["obversePhotoFile", "reversePhotoFile", "receiptFile", "hasObversePhoto", "hasReversePhoto"];
    out.noLegacyKeys = [cOld, cNew, cNone].every(c => legacyKeys.every(k => !(k in c)));
    out.mediaOld = Object.keys(cOld.mediaCells).sort();
    out.mediaNew = Object.keys(cNew.mediaCells).sort();
    out.mediaNone = Object.keys(cNone.mediaCells);
    __setLiveCoinsForTest([cOld, cNew, cNone, W.coin]);
    out.flip = [storedPhotoFilename(cOld, "obverse"), storedPhotoFilename(cOld, "reverse"), storedPhotoFilename(cNew, "obverse")];
    out.missing = [coinMissingPhoto(cOld), coinMissingPhoto(cNew), coinMissingPhoto(cNone)];
    out.hydrate = hydrateStoredPhotos("AY-00300").length;
    out.purgeable = purgeablePhotosFor("AY-00300").length;
    out.receipt = [storedReceiptFor(cOld), storedReceiptFor(cNew)];
    // Detail page and edit slot of an All.Receipt-only coin.
    navigate("browse"); showBrowseDetail(cOld); await W.sleep(80);
    out.detailReceipt = W.detailReceiptRow();
    out.detailLink = !!document.getElementById("detailReceiptLink");
    showBrowseEditView(cOld); await W.sleep(120);
    out.slot = document.getElementById("browseEditReceiptStored").textContent;
    // Manage Photos of the All.Obverse-only coin draws no stored photo.
    galleryFor("AY-00300");
    out.manageEntries = galleryFor("AY-00300").filter(e => e.stored).length;
    // A Sets bundle with only All.Obverse is a missing photo too.
    out.setMissing = coinMissingPhoto(mapWorkbookRowToCoin({ CollectionID: "AY-00303", Denomination: "Multiple", Obverse: "set.jpg" }));
    W.resetState();
    return out;
  });
  ok("R1 mapWorkbookRowToCoin carries none of obversePhotoFile / reversePhotoFile / receiptFile / hasObversePhoto / hasReversePhoto, under old, new or no media headers",
    R.noLegacyKeys);
  ok("R2 mediaCells keeps only the NEW-named columns the row actually has (old-only names never; none when the columns are gone): " + JSON.stringify([R.mediaOld, R.mediaNew, R.mediaNone]),
    JSON.stringify(R.mediaOld) === JSON.stringify(["Obverse", "Receipt", "Reverse"]) &&
     JSON.stringify(R.mediaNew) === JSON.stringify(["COA_Photos", "Holder_Back", "Holder_Front", "OGP_Photos", "Obverse", "Other_Photos", "Receipt", "References", "Reverse"]) &&
     R.mediaNone.length === 0);
  ok("R3 the flip card / albums read no All.Obverse / All.Reverse: " + JSON.stringify(R.flip),
    R.flip.every(f => f === ""));
  ok("R4 the Docket's missing-photo check reads the Photos tab only (coin and Set): " + JSON.stringify([R.missing, R.setMissing]),
    R.missing.every(Boolean) && R.setMissing);
  ok("R5 Manage Photos / Edit Coin hydrate nothing from All.Obverse (no legacyOnly entry): " + JSON.stringify([R.hydrate, R.manageEntries]),
    R.hydrate === 0 && R.manageEntries === 0);
  ok("R6 Purge sees no photo recorded only in the All columns: " + R.purgeable,
    R.purgeable === 0);
  ok("R7 storedReceiptFor reads no All.Receipt: " + JSON.stringify(R.receipt),
    R.receipt.every(r => r === null));
  ok("R8 the detail page shows no Receipt row for an All.Receipt-only coin: " + R.detailReceipt,
    R.detailReceipt === null && !R.detailLink);
  ok("R9 the Edit Coin slot says 'No receipt on file' for it: " + R.slot,
    R.slot === "No receipt on file");

  // A removed photo stays gone after a "reload" (indexes rebuilt from the sheets).
  const R10 = await page.evaluate(async () => {
    const W = __ra; await W.install();
    // The coin's All row still names the photo in the old Obverse column.
    const coin = mapWorkbookRowToCoin({ CollectionID: "AY-00099", Description: "Mercury Dime", Denomination: "10C",
      Year: 1916, MintMark: "D", Obverse: "AY-00099_obverse_cropped.jpg", Receipt: "AY-00099_receipt.pdf" });
    coin.name = "1916-D Mercury Dime";
    __setLiveCoinsForTest([coin, W.other, W.two, W.binder, W.none, W.set]);
    W.coin = coin;
    await W.openEditCoin(coin);
    const entry = galleryFor("AY-00099").find(e => e.type === "obverse" && e.stored);
    const before = !!entry;
    confirmRemoveGalleryPhoto("AY-00099", entry, null, () => {});
    const dialog = W.guardText();
    W.clickGuard("Remove");
    await W.save("browseEdit");
    const rowBlank = W.mock._grids.Photos[1].every(v => v === "" || v == null);
    W.rebuildIndexes();
    delete galleryStore["AY-00099"];
    const after = { flip: storedPhotoFilename(coin, "obverse"), hydrated: hydrateStoredPhotos("AY-00099").length,
      missing: coinMissingPhoto(coin) };
    W.resetState();
    return { before, dialog, rowBlank, after };
  });
  ok("R10 a photo removed on Edit Coin stays gone after the indexes are rebuilt from the sheets, even with All.Obverse still naming it: " + JSON.stringify(R10),
    R10.before && R10.rowBlank && R10.after.flip === "" && R10.after.hydrated === 0 && R10.after.missing);
  ok("R11 the Remove dialog no longer mentions the old All columns: " + R10.dialog,
    !/All<\/strong> sheet|old All|keep showing/i.test(R10.dialog));

  const src = fs.readFileSync(path.join(__dirname, "..", "app.html"), "utf8");
  const gone = ["legacyOnly", "legacyStoredRowsFor", "legacyFallbackFilenameFor", "looksLikeReceiptFilename",
    "obversePhotoFile", "reversePhotoFile", "PHOTO_LABEL_LEGACY_TEXT", "gc-label-legacy",
    "it will keep showing from there", "recorded only in the old All-sheet columns", "Can't remove this one"];
  const stillThere = gone.filter(s => {
    // A comment may mention a name to say it is gone; code may not.
    return src.split("\n").some(line => line.includes(s) && !/^\s*\/\//.test(line));
  });
  ok("R12 the legacy-only code is gone from app.html (outside comments): " + JSON.stringify(stillThere),
    stillThere.length === 0);

  // ---------- F. first row; 2+ rows ----------------------------------------
  const F = await page.evaluate(async () => {
    const W = __ra; await W.install();
    const out = {};
    const idx = buildReceiptIndex([
      { ReceiptID: "RC-1", CollectionID: "AY-1", Filename: "first.pdf" },
      { ReceiptID: "RC-2", CollectionID: "AY-1", Filename: "second.pdf" },
      { ReceiptID: "RC-3", CollectionID: "AY-2", Filename: "Binder" },
      { ReceiptID: "", CollectionID: "", Filename: "" }]);
    out.idx = idx;
    out.stored = storedReceiptFor(W.two);
    navigate("browse"); showBrowseDetail(W.two); await W.sleep(80);
    out.detail = (document.getElementById("detailReceiptLink") || {}).textContent || null;
    await W.openEditCoin(W.two);
    out.slot = W.slot("browseEdit").stored;
    // Save is refused for a 2+ row coin (a scan pick; the Binder button is
    // not offered over its stored scan, and commitBinderReceipt's own
    // refusal is B14).
    await W.pick("browseEdit", "new97.pdf", "NEW97");
    const before = JSON.stringify(W.rcGrid());
    await W.save("browseEdit");
    out.refusedToast = W.toast();
    out.unchanged = JSON.stringify(W.rcGrid()) === before;
    W.resetState();
    // The Docket flags it, with no Dismiss, and a tap opens the coin.
    await renderNeedsAttentionHub();
    const rows = [...document.querySelectorAll("#docketOtherContainer .wish-item")];
    const row = rows.find(r => /2 rows on the Receipts tab/.test(r.textContent));
    out.docket = row ? row.textContent : null;
    out.docketDismiss = row ? !!row.querySelector(".docket-dismiss") : null;
    out.docketOthers = rows.filter(r => /rows on the Receipts tab/.test(r.textContent)).length;
    if (row) { row.click(); await W.sleep(120); }
    out.opened = currentBrowseCoin && currentBrowseCoin.id;
    out.detailShown = document.getElementById("browseDetailView").style.display !== "none";
    W.resetState();
    return out;
  });
  ok("F1 buildReceiptIndex keeps the FIRST row per coin, counts the rows, and marks a Binder row: " + JSON.stringify(F.idx),
    F.idx["AY-1"].filename === "first.pdf" && F.idx["AY-1"].receiptId === "RC-1" && F.idx["AY-1"].rowCount === 2 &&
     F.idx["AY-2"].binder === true && !F.idx[""]);
  ok("F2 a coin with two Receipts rows shows its FIRST row on the detail page and in the Edit slot (the row a Save would change): " + JSON.stringify([F.stored, F.detail, F.slot]),
    F.stored && F.stored.filename === "two_a.pdf" && F.detail === "two_a.pdf" && /two_a\.pdf/.test(F.slot));
  ok("F3 a Save for a coin with 2+ Receipts rows is refused and writes nothing: " + F.refusedToast,
    /2 rows on the Receipts tab/.test(F.refusedToast) && F.unchanged);
  ok("F4 the Docket flags the 2+ row coin (only it), naming the coin, with no Dismiss: " + JSON.stringify([F.docket, F.docketDismiss, F.docketOthers]),
    F.docket && /AY-00097 has 2 rows on the Receipts tab/.test(F.docket) && F.docketDismiss === false && F.docketOthers === 1);
  ok("F5 a tap on that Docket row opens the coin's detail page",
    F.opened === "AY-00097" && F.detailShown);

  // ---------- B. Binder rows -----------------------------------------------
  const B1 = await page.evaluate(async () => {
    const W = __ra; await W.install();
    const out = {};
    out.names = ["Binder", " binder ", "BINDER", "Binder.pdf", "binders", "", null].map(isBinderReceiptName);
    out.stored = storedReceiptFor(W.binder);
    navigate("browse"); showBrowseDetail(W.binder); await W.sleep(80);
    out.detail = W.detailReceiptRow();
    out.detailBinder = (document.getElementById("detailReceiptBinder") || {}).textContent || null;
    out.detailLink = !!document.getElementById("detailReceiptLink");
    await W.openEditCoin(W.binder);
    out.slot = W.slot("browseEdit");
    // Never opened or fetched as a file.
    W.reads = [];
    openReceiptInViewer(W.binder, "Binder");
    await W.sleep(80);
    out.viewer = W.viewerOpen();
    out.reads = W.reads.slice();
    out.bytes = await ensureReceiptBytes("Binder");
    out.url = await getCachedReceiptWebUrl("Binder");
    // The filename checks ignore Binder rows.
    const rows = await readRecordRows(RECEIPTS_SHEET_NAME, RECEIPTS_TABLE_NAME, "ReceiptID");
    out.findBinder = await findExistingReceiptByFilename("Binder");
    out.usedByOther = receiptIdUsedByOtherCoin(rows, "RC-00009", "AY-00093");
    out.usedByOtherFile = receiptIdUsedByOtherCoin(rows, "RC-00002", "AY-00095");
    out.free = await receiptFilenameIsFree("binder", rows);
    W.resetState();
    return out;
  });
  ok("B1 a Binder row is Filename exactly 'Binder' (any case, trimmed, no extension): " + JSON.stringify(B1.names),
    JSON.stringify(B1.names) === JSON.stringify([true, true, true, false, false, false, false]));
  ok("B2 the detail page shows 'Not scanned (paper receipt in binder)' as plain text, no viewer button or link: " + JSON.stringify([B1.stored, B1.detail, B1.detailBinder]),
    B1.stored && B1.stored.binder === true && B1.detailBinder === "Not scanned (paper receipt in binder)" && !B1.detailLink);
  ok("B3 the Edit slot says 'Not scanned (paper receipt in binder)', nothing to tap, no Binder button (it is already that); the ✕ is the double-checked removal (Build 2): " + JSON.stringify(B1.slot),
    B1.slot.stored === "Not scanned (paper receipt in binder)" && !B1.slot.storedBtn && !B1.slot.binderShown && B1.slot.removeShown);
  ok("B4 'Binder' is never opened or fetched as a file (viewer, bytes, OneDrive link): " + JSON.stringify([B1.viewer, B1.reads, B1.bytes, B1.url]),
    !B1.viewer && B1.reads.length === 0 && B1.bytes.attempted === false && B1.url === null);
  ok("B5 the filename checks ignore Binder rows (find by filename, used by another coin, free name) and still see real files: " + JSON.stringify([B1.findBinder, B1.usedByOther, B1.usedByOtherFile, B1.free]),
    B1.findBinder === null && B1.usedByOther === false && B1.usedByOtherFile === true && B1.free === true);

  // The Binder button shows ONLY while the slot has no receipt at all (Ray,
  // device test of Build 1): hidden over a stored scan, a pending scan, a
  // stored Binder and a pending Binder. Then the pick itself, on a coin with
  // no receipt.
  const B2 = await page.evaluate(async () => {
    const W = __ra; await W.install();
    const out = {};
    // A stored scan: hidden, and the function refuses even if called.
    await W.openEditCoin();
    out.overStored = W.slot("browseEdit");
    W.events = [];
    document.getElementById("browseEditReceiptBinderBtn").click();
    pickBinderReceipt("browseEditReceiptPreview");
    await W.sleep(40);
    out.overStoredAfter = { pending: pendingReceiptCount("AY-00099"), events: W.events.slice(), dim: W.dim("browseEdit") };
    W.resetState();
    // Nothing stored: shown; a pending scan hides it; ✕ shows it again.
    await W.openEditCoin(W.none);
    out.open = W.slot("browseEdit"); out.openDim = W.dim("browseEdit");
    await W.pick("browseEdit", "scan94.pdf", "SCAN94");
    out.pendingScan = W.slot("browseEdit");
    pickBinderReceipt("browseEditReceiptPreview"); await W.sleep(30);
    out.pendingScanKept = pendingReceipts["AY-00094"] && !pendingReceipts["AY-00094"].binder;
    document.getElementById("browseEditReceiptRemoveBtn").click(); W.clickGuard("Remove"); await W.sleep(40);
    out.afterScanRemoved = W.slot("browseEdit");
    // The Binder pick.
    W.events = [];
    document.getElementById("browseEditReceiptBinderBtn").click();
    await W.sleep(60);
    out.pick = W.slot("browseEdit"); out.dim = W.dim("browseEdit");
    out.events = W.events.slice();
    const u = unsavedEditsForView(); out.counts = u && u.counts; out.text = u && u.text;
    // ✕ drops it (nothing stored, so no undo dialog).
    document.getElementById("browseEditReceiptRemoveBtn").click();
    out.removeDialog = W.guardText();
    W.clickGuard("Remove"); await W.sleep(60);
    out.removed = { slot: W.slot("browseEdit"), dim: W.dim("browseEdit"), unsaved: unsavedEditsForView() };
    // Binder again, Discard
    document.getElementById("browseEditReceiptBinderBtn").click(); await W.sleep(40);
    discardUnsavedPhotoEdits(); await W.sleep(40);
    out.discarded = { pending: pendingReceiptCount("AY-00094"), slot: W.slot("browseEdit") };
    // Binder again and Save
    document.getElementById("browseEditReceiptBinderBtn").click(); await W.sleep(40);
    W.events = []; W.uploads = [];
    await W.save("browseEdit");
    out.toast = W.toast();
    out.rows = W.rcRows("AY-00094");
    out.rowIndex = W.rcGrid().findIndex(r => r[1] === "AY-00094");
    out.uploads = W.uploads.slice();
    out.after = W.slot("browseEdit");
    out.index = LIVE_RECEIPTS["AY-00094"];
    out.today = excelSerialToday();
    out.allPatched = W.events.filter(e => e === "patch:All").length;
    W.resetState();
    return out;
  });
  ok("B6 the Binder button is HIDDEN over a stored scan, and pressing / calling it there does nothing: " + JSON.stringify([B2.overStored, B2.overStoredAfter]),
    !B2.overStored.binderShown && B2.overStoredAfter.pending === 0 && B2.overStoredAfter.events.length === 0 && B2.overStoredAfter.dim.clean);
  ok("B6b with no receipt on file it shows; a pending scan hides it (and the function refuses); ✕ on that scan brings it back: " + JSON.stringify([B2.open.binderShown, B2.pendingScan.binderShown, B2.pendingScanKept, B2.afterScanRemoved.binderShown]),
    B2.open.binderShown && B2.openDim.clean && !B2.pendingScan.binderShown && B2.pendingScanKept && B2.afterScanRemoved.binderShown);
  ok("B7 'Not scanned, paper in binder' is a pending pick: no Graph call, 'Not saved yet', the slot shows 'Not scanned (paper receipt in binder)', ✕ shown, the button hidden: " + JSON.stringify([B2.events, B2.pick]),
    B2.events.length === 0 && /Not saved yet/.test(B2.pick.status) && !/replaces/.test(B2.pick.status) &&
     /Not scanned \(paper receipt in binder\)/.test(B2.pick.placeholder) && B2.pick.removeShown && !B2.pick.binderShown);
  ok("B8 the dimmed Save and the leave guard count it ('1 receipt'): " + JSON.stringify([B2.dim, B2.counts, B2.text]),
    !B2.dim.clean && !B2.dim.disabled && B2.counts && B2.counts.receipts === 1 && /1 receipt/.test(B2.text || ""));
  ok("B9 ✕ drops the pick (writes nothing) and the form is clean again, button back: " + JSON.stringify([B2.removeDialog, B2.removed]),
    /hasn't been saved yet/.test(B2.removeDialog) && B2.removed.dim.clean && !B2.removed.unsaved && B2.removed.slot.binderShown);
  ok("B10 Discard drops a Binder pick",
    B2.discarded.pending === 0 && B2.discarded.slot.binderShown);
  ok("B11 Save writes a Binder row in the first blank row, a new ReceiptID, today's DateAdded: " + JSON.stringify([B2.rows, B2.rowIndex, B2.today]),
    B2.rows.length === 1 && B2.rows[0][2] === "Binder" && /^RC-\d{5}$/.test(B2.rows[0][0]) && B2.rows[0][3] === B2.today && B2.rowIndex === 8);
  ok("B12 no upload, and the coin row is not written: " + JSON.stringify([B2.uploads, B2.allPatched]),
    B2.uploads.length === 0 && B2.allPatched === 0);
  ok("B13 the toast says so, and the slot and index show the Binder row at once (button hidden): " + JSON.stringify([B2.toast, B2.index, B2.after]),
    /paper copy in the binder/.test(B2.toast) && B2.index && B2.index.binder && B2.after.stored === "Not scanned (paper receipt in binder)" && !B2.after.binderShown);

  // Edit Set; commitBinderReceipt over a coin's own row; scan over a Binder row.
  const B3 = await page.evaluate(async () => {
    const W = __ra; await W.install();
    const out = {};
    // commitBinderReceipt itself, on a coin whose own row names a file
    // (unreachable from the screens now, kept correct): its row becomes a
    // Binder row with a NEW id; other coins on its old id and the file stay.
    const res = await commitBinderReceipt("AY-00095");
    out.direct = { res, rows: W.rcRows("AY-00095"), other: W.rcRows("AY-00051"),
      fileStill: !!(await W.mock.getItemMeta(writePaths().coinReceipts + "/shared.pdf")) };
    out.directAgain = await commitBinderReceipt("AY-00095");
    out.directRefused = await commitBinderReceipt("AY-00097").then(() => null, e => !!(e && e.multiRow));
    // Edit Set
    await W.openEditSet();
    out.setOpen = W.slot("editSet");
    document.getElementById("editSetReceiptBinderBtn").click(); await W.sleep(40);
    out.setDim = W.dim("editSet");
    await W.save("editSet");
    out.setRows = W.rcRows("AY-00090");
    W.resetState();
    // Stored Binder: a scan picked over it says so; the button stays hidden;
    // ✕ puts the Binder back.
    await W.openEditCoin(W.binder);
    await W.pick("browseEdit", "scan93.pdf", "SCAN93");
    out.scanPick = W.slot("browseEdit");
    pickBinderReceipt("browseEditReceiptPreview"); await W.sleep(30);
    out.scanKept = pendingReceipts["AY-00093"] && !pendingReceipts["AY-00093"].binder;
    document.getElementById("browseEditReceiptRemoveBtn").click(); W.clickGuard("Put it back"); await W.sleep(40);
    out.backToBinder = { pending: pendingReceiptCount("AY-00093"), dim: W.dim("browseEdit"), slot: W.slot("browseEdit") };
    // Scan over the Binder row keeps its ReceiptID (other coin's Binder row shares it).
    await W.pick("browseEdit", "scan93.pdf", "SCAN93");
    await W.save("browseEdit");
    out.scanRows = W.rcRows("AY-00093");
    out.otherBinder = W.rcRows("AY-00052");
    W.resetState();
    return out;
  });
  ok("B14 commitBinderReceipt over a coin's own file row: a Binder row with a NEW ReceiptID; the other coin on the old id and the file stay; a second call writes nothing; 2+ rows refused: " + JSON.stringify(B3.direct),
    B3.direct.rows.length === 1 && B3.direct.rows[0][2] === "Binder" && B3.direct.rows[0][0] !== "RC-00002" &&
     B3.direct.other.length === 1 && B3.direct.other[0][0] === "RC-00002" && B3.direct.other[0][2] === "shared.pdf" && B3.direct.fileStill &&
     B3.directAgain.unchanged === true && B3.directRefused === true);
  ok("B16 Edit Set: the Binder option, counted, and saved as a Binder row: " + JSON.stringify(B3.setRows),
    B3.setOpen.binderShown && !B3.setDim.clean && B3.setRows.length === 1 && B3.setRows[0][2] === "Binder");
  ok("B17 over a stored Binder row a scan pick says it replaces the paper receipt, the button stays hidden, and ✕ puts the Binder back (clean): " + JSON.stringify([B3.scanPick, B3.scanKept, B3.backToBinder]),
    /replaced when you save\): Not scanned \(paper receipt in binder\)/.test(B3.scanPick.stored) && !B3.scanPick.binderShown && B3.scanKept &&
     B3.backToBinder.pending === 0 && B3.backToBinder.dim.clean && !B3.backToBinder.slot.binderShown);
  ok("B18 scanning over a Binder row keeps its ReceiptID (Q7) even though another coin's Binder row shares it; that row is untouched: " + JSON.stringify([B3.scanRows, B3.otherBinder]),
    B3.scanRows.length === 1 && B3.scanRows[0][0] === "RC-00009" && B3.scanRows[0][2] === "scan93.pdf" &&
     B3.otherBinder.length === 1 && B3.otherBinder[0][2] === "Binder");

  // ---------- AC. Add Coin and the Staging-draft edit ----------------------
  await page.evaluate(({ catalog }) => {
    window.__ac = {
      async setup() {
        __ra.resetState();
        const blank = (n) => new Array(n).fill("");
        const mock = createMockGraphClient({ sheets: {
          All: [["CollectionID", "CoinID", "Receipt"]],
          Photos: [["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"]]
            .concat([1, 2, 3].map(() => blank(8))),
          Receipts: [["ReceiptID", "CollectionID", "Filename", "DateAdded"]].concat([1, 2, 3].map(() => blank(4)))
        } });
        __ra.mock = mock;
        __ra.events = []; __ra.uploads = []; __ra.patches = [];
        __setGraphClientForTest(__ra.wrap(mock));
        __setAddCoinWriteEnabledForTest(true);
        __resetAllHeaderMapForTest(); __resetSheetHeaderMapsForTest(); __resetMintedIdsForTest();
        __setLiveDbCoinsForTest(catalog);
        return mock;
      },
      draftPath(id) { return writePaths().stagingBase + "/" + id + "/coin.json"; },
      async openEdit(mock, draft, files) {
        const folder = writePaths().stagingBase + "/" + draft.collectionID;
        for (const name of (files || [])) await mock.uploadFile(folder + "/" + name, new Blob(["%PDF-" + name], { type: "application/pdf" }));
        await mock.uploadJson(this.draftPath(draft.collectionID), draft);
        await beginCoinDraftEdit(draft.collectionID);
        await __ra.sleep(80);
      },
      saveEdit() {
        return new Promise((resolve, reject) => {
          resolveAddCoinCatalogMatch((m) => completeAddCoinSave("staging", m).then(resolve, reject), () => resolve("cancelled"));
        });
      },
      slot() {
        const line = document.getElementById("addCoinReceiptStored");
        const bb = document.getElementById("receiptBinderBtn");
        return {
          placeholder: document.getElementById("receiptPlaceholder").textContent,
          line: line.style.display === "none" ? "" : line.textContent,
          remove: document.getElementById("receiptRemoveBtn").style.display !== "none",
          binderShown: !bb.classList.contains("hidden")
        };
      },
      async pickPdf(name) {
        const input = document.getElementById("receiptLibraryInput");
        const dt = new DataTransfer(); dt.items.add(new File(["%PDF-new"], name, { type: "application/pdf" }));
        input.files = dt.files; input.dispatchEvent(new Event("change", { bubbles: true }));
        await __ra.sleep(100);
      }
    };
  }, { catalog: CATALOG });

  const AC = await page.evaluate(async ({ base, id }) => {
    const W = __ra, A = __ac;
    const out = {};
    W.allPatchLog = []; // AC and AS together: Add Coin, the Staging edit, Add Set and their promotion records
    // AC1 a new coin: Binder pick counts; a file pick replaces it and hides
    // the button (a scan is picked); ✕ drops the scan and the button is back.
    await A.setup();
    navigate("addcoin"); await W.sleep(60);
    out.newOpen = A.slot();
    document.getElementById("receiptBinderBtn").click(); await W.sleep(40);
    out.newPick = A.slot();
    out.newUnsaved = unsavedEditsForView();
    await A.pickPdf("seller.pdf");
    out.afterFile = { binder: addCoinBinderPick, slot: A.slot() };
    document.getElementById("receiptBinderBtn").click(); pickAddCoinBinderReceipt(); await W.sleep(40);
    out.binderAgain = { binder: addCoinBinderPick, file: !!receiptFiles["receiptPreview"] };
    document.getElementById("receiptRemoveBtn").click();
    out.newRemoveDialog = W.guardText(); W.clickGuard("Remove"); await W.sleep(40);
    out.newRemoved = { binder: addCoinBinderPick, unsaved: unsavedEditsForView(), slot: A.slot() };
    // Discard (navigation resets the form)
    document.getElementById("receiptBinderBtn").click(); await W.sleep(20);
    resetAddCoinForm();
    out.reset = { binder: addCoinBinderPick, slot: A.slot() };
    W.resetState();

    // AC2 a new coin saved with a Binder pick: coin.json receiptBinder, no receipt upload.
    const mock = await A.setup();
    navigate("addcoin"); await W.sleep(60);
    applyCoinDraftToForm(Object.assign({}, base, { collectionID: "" }));
    document.getElementById("receiptBinderBtn").click(); await W.sleep(20);
    W.uploads = [];
    await A.saveEdit(); await W.sleep(150);
    const kids = await mock.listChildren(writePaths().stagingBase);
    const ids = (kids || []).map(k => typeof k === "string" ? k : k.name).filter(n => /^AY-\d{5}$/.test(n));
    const newId = ids.sort().pop();
    out.newDraft = newId ? await mock.getJson(A.draftPath(newId)) : null;
    out.newUploads = W.uploads.filter(n => /receipt/i.test(n));
    // Promotion writes a Binder row.
    if (out.newDraft) {
      await recordPromotedCoinRecords(out.newDraft);
      out.promotedRows = W.mock._grids.Receipts.slice(1).filter(r => r[1] === newId);
      await recordPromotedCoinRecords(out.newDraft); // a re-run writes no second row
      out.promotedRows2 = W.mock._grids.Receipts.slice(1).filter(r => r[1] === newId);
    }
    W.resetState();

    // AC3 a Staging edit over a stored receipt file: no Binder button (and
    // the function refuses); ✕ takes the file off, then the button shows.
    {
      const m = await A.setup();
      await A.openEdit(m, Object.assign({}, base), [id + "_receipt.pdf"]);
      out.edOpen = A.slot();
      document.getElementById("receiptBinderBtn").click(); pickAddCoinBinderReceipt(); await W.sleep(40);
      out.edRefused = { binder: addCoinBinderPick, unsaved: unsavedEditsForView() };
      document.getElementById("receiptRemoveBtn").click(); W.clickGuard("Remove"); await W.sleep(40);
      out.edRemoved = A.slot();
      document.getElementById("receiptBinderBtn").click(); await W.sleep(40);
      out.edPick = A.slot(); out.edUnsaved = unsavedEditsForView();
      await A.saveEdit(); await W.sleep(120);
      out.edSaved = await m.getJson(A.draftPath(id));
      out.edOldKept = !!(await m.getItemMeta(writePaths().stagingBase + "/" + id + "/" + id + "_receipt.pdf"));
      out.edToast = W.toast();
      W.resetState();
    }
    // AC4 a Staging edit whose receipt is the binder.
    {
      const m = await A.setup();
      await A.openEdit(m, Object.assign({}, base, { receiptPhoto: "", receiptBinder: true }), []);
      out.bdOpen = A.slot(); out.bdUnsaved = unsavedEditsForView();
      await A.pickPdf("scan.pdf");
      out.bdPick = A.slot();
      document.getElementById("receiptRemoveBtn").click();
      out.bdUndoDialog = W.guardText(); W.clickGuard("Put it back"); await W.sleep(40);
      out.bdUndone = { slot: A.slot(), unsaved: unsavedEditsForView() };
      // ✕ with nothing picked takes the Binder off at Save; the Binder button undoes that.
      document.getElementById("receiptRemoveBtn").click(); W.clickGuard("Remove"); await W.sleep(40);
      out.bdRemoved = { unsaved: !!unsavedEditsForView(), slot: A.slot() };
      document.getElementById("receiptBinderBtn").click(); await W.sleep(40);
      out.bdBack = { unsaved: unsavedEditsForView(), slot: A.slot() };
      // Remove and save: receiptBinder off coin.json
      document.getElementById("receiptRemoveBtn").click(); W.clickGuard("Remove"); await W.sleep(40);
      await A.saveEdit(); await W.sleep(120);
      out.bdSaved = await m.getJson(A.draftPath(id));
      W.resetState();
    }
    return out;
  }, { base: BASE_DRAFT, id: DRAFT_ID });
  ok("AC1 a new coin's receipt slot offers 'Not scanned, paper in binder' (no ✕ until something is picked)",
    AC.newOpen.binderShown && !AC.newOpen.remove);
  ok("AC2 the Binder pick shows in the slot and the leave guard counts it: " + JSON.stringify([AC.newPick, AC.newUnsaved && AC.newUnsaved.counts]),
    /Not scanned \(paper receipt in binder\)/.test(AC.newPick.placeholder) && !AC.newPick.binderShown && AC.newPick.remove &&
     AC.newUnsaved && AC.newUnsaved.counts && AC.newUnsaved.counts.receipts === 1);
  ok("AC3 a file pick replaces a Binder pick and HIDES the button; the button / function then does nothing (the scan stays): " + JSON.stringify([AC.afterFile, AC.binderAgain]),
    AC.afterFile.binder === false && !AC.afterFile.slot.binderShown && !AC.binderAgain.binder && AC.binderAgain.file);
  ok("AC4 ✕ drops the scan on a new coin (button back); resetting the form (Discard / navigation) drops a Binder pick: " + JSON.stringify([AC.newRemoved, AC.reset]),
    /hasn't been saved yet/.test(AC.newRemoveDialog) && AC.newRemoved.binder === false && !AC.newRemoved.unsaved && AC.newRemoved.slot.binderShown &&
     AC.reset.binder === false && AC.reset.slot.binderShown);
  ok("AC5 a new coin saved with the Binder pick: coin.json has receiptBinder true, no receipt file uploaded: " + JSON.stringify([AC.newDraft && { b: AC.newDraft.receiptBinder, p: AC.newDraft.receiptPhoto }, AC.newUploads]),
    AC.newDraft && AC.newDraft.receiptBinder === true && AC.newDraft.receiptPhoto === "" && AC.newUploads.length === 0);
  ok("AC6 promotion writes a Binder Receipts row (and a re-run writes nothing more): " + JSON.stringify([AC.promotedRows, AC.promotedRows2]),
    AC.promotedRows && AC.promotedRows.length === 1 && AC.promotedRows[0][2] === "Binder" && /^RC-\d{5}$/.test(AC.promotedRows[0][0]) &&
     AC.promotedRows2.length === 1 && AC.promotedRows2[0][0] === AC.promotedRows[0][0]);
  ok("AC7 a Staging edit shows its stored receipt file and does NOT offer the Binder option (the function refuses too): " + JSON.stringify([AC.edOpen, AC.edRefused]),
    new RegExp(DRAFT_ID + "_receipt\\.pdf \\(in Staging\\)").test(AC.edOpen.placeholder) && !AC.edOpen.binderShown && AC.edOpen.line === "" &&
     AC.edRefused.binder === false && !AC.edRefused.unsaved);
  ok("AC8 ✕ takes the stored file off; then the Binder button shows, and its pick is counted (no 'Replaces' line: nothing stored any more): " + JSON.stringify([AC.edRemoved, AC.edPick]),
    AC.edRemoved.binderShown && AC.edPick.line === "" && !AC.edPick.binderShown && AC.edUnsaved && AC.edUnsaved.counts.receipts === 1);
  ok("AC10 Save changes writes receiptBinder into coin.json, and the removed file is deleted as ✕ said: " + JSON.stringify([AC.edSaved && { b: AC.edSaved.receiptBinder, p: AC.edSaved.receiptPhoto }, AC.edOldKept, AC.edToast]),
    AC.edSaved && AC.edSaved.receiptBinder === true && AC.edSaved.receiptPhoto === "" && !AC.edOldKept && /paper copy in the binder/.test(AC.edToast));
  ok("AC11 a draft whose receipt is the binder shows 'Not scanned (paper receipt in binder)', with no Binder button, and opens clean: " + JSON.stringify(AC.bdOpen),
    /^📒Not scanned \(paper receipt in binder\)$/.test(AC.bdOpen.placeholder) && !AC.bdOpen.binderShown && AC.bdOpen.remove && !AC.bdUnsaved);
  ok("AC12 a file picked over it says it replaces the paper receipt; ✕ puts the Binder back (clean): " + JSON.stringify([AC.bdPick, AC.bdUndone]),
    /Replaces the paper receipt in the binder when you save/.test(AC.bdPick.line) && !AC.bdPick.binderShown && /Put the previous receipt back/.test(AC.bdUndoDialog) && !AC.bdUndone.unsaved);
  ok("AC13 ✕ with nothing picked takes the Binder off (a change); the Binder button puts it back (clean): " + JSON.stringify([AC.bdRemoved, AC.bdBack]),
    AC.bdRemoved.unsaved && AC.bdRemoved.slot.binderShown && !AC.bdBack.unsaved);
  ok("AC14 saving with the Binder taken off drops receiptBinder from coin.json: " + JSON.stringify(AC.bdSaved && { b: AC.bdSaved.receiptBinder, p: AC.bdSaved.receiptPhoto }),
    AC.bdSaved && !("receiptBinder" in AC.bdSaved) && AC.bdSaved.receiptPhoto === "");

  // ---------- AS. Add Set ---------------------------------------------------
  const AS = await page.evaluate(async () => {
    const W = __ra, A = __ac;
    const out = {};
    const mock = await A.setup();
    navigate("addset"); await W.sleep(60);
    const bb = document.getElementById("addSetReceiptBinderBtn");
    out.shown = !bb.classList.contains("hidden");
    bb.click(); await W.sleep(20);
    out.flag = addSetReceiptBinder;
    out.note = (document.querySelector("#addSetReceiptPreview") && document.getElementById("addSetReceiptPreview").closest(".photo-box").textContent) || "";
    out.hiddenAfter = bb.classList.contains("hidden");
    document.getElementById("addSetName").value = "Proof Set";
    document.getElementById("addSetYear").value = "1957";
    document.getElementById("addSetTrackIndividually").checked = false;
    updateAddSetTrackIndividuallyVisibility();
    W.uploads = [];
    await startSetCapture(); await W.sleep(120);
    const drafts = await listSetDrafts();
    const d = drafts.find(x => x.setName && /Proof Set/.test(x.setName));
    out.draft = d ? { receiptBinder: d.receiptBinder, receiptPhoto: d.receiptPhoto, id: d.collectionID } : null;
    out.uploads = W.uploads.filter(n => /receipt/i.test(n));
    if (d) {
      await recordPromotedSetRecords(d);
      out.rows = W.mock._grids.Receipts.slice(1).filter(r => r[1] === d.collectionID);
    }
    // A file pick clears the Binder pick; clearing the slot does too.
    navigate("addset"); await W.sleep(40);
    bb.click(); await W.sleep(20);
    const input = document.getElementById("addSetReceiptLibraryInput");
    const dt = new DataTransfer(); dt.items.add(new File(["%PDF-s"], "s.pdf", { type: "application/pdf" }));
    input.files = dt.files; input.dispatchEvent(new Event("change", { bubbles: true }));
    await W.sleep(80);
    out.afterFile = addSetReceiptBinder;
    out.afterFileHidden = bb.classList.contains("hidden");
    bb.click(); pickAddSetBinderReceipt(); await W.sleep(20);
    out.afterFileRefused = { binder: addSetReceiptBinder, file: !!addSetPhotoFiles.receipt };
    addSetClearPhoto("receipt", "addSetReceiptPreview");
    out.afterClear = { binder: addSetReceiptBinder, shown: !bb.classList.contains("hidden") };
    // Resuming a draft: a stored Binder shows the wording; a stored file hides the button.
    if (d) {
      resumeSetDraftAtStep1(Object.assign({}, d)); await W.sleep(60);
      out.resumeBinder = { hidden: bb.classList.contains("hidden"),
        note: document.getElementById("addSetReceiptPreview").closest(".photo-box").textContent };
      resumeSetDraftAtStep1(Object.assign({}, d, { receiptPhoto: "receipt.pdf", receiptBinder: false })); await W.sleep(60);
      out.resumeFile = { hidden: bb.classList.contains("hidden") };
      bb.click(); pickAddSetBinderReceipt(); await W.sleep(20);
      out.resumeFileRefused = addSetReceiptBinder;
    }
    W.resetState();
    return out;
  });
  ok("AS1 Add Set's receipt slot offers 'Not scanned, paper in binder', and shows the pick as 'Not scanned (paper receipt in binder)': " + JSON.stringify([AS.shown, AS.flag, AS.note]),
    AS.shown && AS.flag && AS.hiddenAfter && /Not scanned \(paper receipt in binder\)/.test(AS.note));
  ok("AS2 the Set draft records receiptBinder, no receipt uploaded: " + JSON.stringify([AS.draft, AS.uploads]),
    AS.draft && AS.draft.receiptBinder === true && AS.draft.receiptPhoto === "" && AS.uploads.length === 0);
  ok("AS3 Set promotion writes a Binder Receipts row: " + JSON.stringify(AS.rows),
    AS.rows && AS.rows.length === 1 && AS.rows[0][2] === "Binder");
  ok("AS4 a file pick drops the Binder pick and hides the button (the function refuses while a scan is picked); clearing the slot brings it back: " + JSON.stringify([AS.afterFile, AS.afterFileHidden, AS.afterFileRefused, AS.afterClear]),
    AS.afterFile === false && AS.afterFileHidden && AS.afterFileRefused.binder === false && AS.afterFileRefused.file &&
     AS.afterClear.binder === false && AS.afterClear.shown);
  ok("AS4b resuming a Set draft: a stored Binder shows the wording with no button; a stored receipt file hides the button (refused): " + JSON.stringify([AS.resumeBinder, AS.resumeFile, AS.resumeFileRefused]),
    AS.resumeBinder && AS.resumeBinder.hidden && /Not scanned \(paper receipt in binder\)/.test(AS.resumeBinder.note) &&
     AS.resumeFile.hidden && AS.resumeFileRefused === false);
  const acAsAll = await page.evaluate(() => __ra.allPatchLog.slice());
  ok("AS5 Add Coin, the Staging-draft edit, Add Set and their promotion records (Receipts / Photos rows) wrote nothing to the All sheet: " + JSON.stringify(acAsAll),
    acAsAll.length === 0);

  // ---------- D. drift rows -------------------------------------------------
  const D = await page.evaluate(async () => {
    const W = __ra; await W.install();
    const out = {};
    const mk = (id, cells) => Object.assign(mapWorkbookRowToCoin(Object.assign({ CollectionID: id, Description: "Dime", Denomination: "10C", Year: 1916 }, cells)), { name: "Dime " + id });
    __setStoredPhotosForTest({
      "AY-00401": [
        { photoId: "1", photoType: "Obverse", galleryType: "obverse", filename: "o1.jpg" },
        { photoId: "2", photoType: "Obverse", galleryType: "obverse", filename: "o2.jpg" },
        { photoId: "3", photoType: "Slab_Obverse", galleryType: "slab_obverse", filename: "hf.jpg" },
        { photoId: "4", photoType: "Reference", galleryType: "reference", filename: "r1.jpg" },
        { photoId: "5", photoType: "Reference", galleryType: "reference", filename: "r2.jpg" },
        { photoId: "6", photoType: "OGP_Reverse", galleryType: "ogp_reverse", filename: "ogpB.jpg" },
        { photoId: "7", photoType: "OGP", galleryType: "ogp", filename: "ogp.jpg" },
        { photoId: "8", photoType: "SubGroup_Obverse", galleryType: "subgroup_obverse", filename: "sg.jpg" }
      ],
      "AY-00402": [{ photoId: "9", photoType: "Obverse", galleryType: "obverse", filename: "x.jpg" }],
      "AY-00404": [{ photoId: "10", photoType: "Other", galleryType: "other", filename: "oth.jpg" }]
    });
    __setStoredReceiptsForTest({ "AY-00401": { receiptId: "RC-1", filename: "rc.pdf" }, "AY-00403": { receiptId: "RC-2", filename: "Binder" } });
    const good = { Obverse: "o1.jpg", Reverse: "", Holder_Front: "HF.JPG ", Holder_Back: "", References: "r1.jpg; r2.jpg",
      COA_Photos: "", OGP_Photos: "ogpB.jpg; ogp.jpg", Other_Photos: "", Receipt: "rc.pdf" };
    const c401 = mk("AY-00401", good);
    const c402 = mk("AY-00402", { Obverse: "#N/A", Reverse: "", Holder_Front: "", Holder_Back: "", References: "", COA_Photos: "", OGP_Photos: "", Other_Photos: "", Receipt: "stale.pdf" });
    const c403 = mk("AY-00403", { Obverse: "", Reverse: "", Holder_Front: "", Holder_Back: "", References: "", COA_Photos: "", OGP_Photos: "", Other_Photos: "", Receipt: "BINDER" });
    const c404 = mk("AY-00404", { Obverse: "", Other_Photos: "" });  // a partial set of columns: only those present count
    const c405 = mk("AY-00405", { Obverse: "typed.jpg" });          // changed this session: skipped
    out.matches = allMediaDriftFor(c401, true);
    out.d402 = allMediaDriftFor(c402, true);
    out.d403 = allMediaDriftFor(c403, true);
    out.d404 = allMediaDriftFor(c404, true);
    mediaChangedThisSession.add("AY-00405");
    out.d405 = allMediaDriftFor(c405, true);
    // Before the rename (old names only): nothing is checked.
    const oldOnly = mk("AY-00406", { Obverse: "wrong.jpg", Reverse: "", Receipt: "wrong.pdf", Photo3: "p3.jpg", Obverse_Original: "oo.jpg" });
    __setLiveCoinsForTest([oldOnly]);
    out.renamedOld = allMediaColumnsRenamed();
    out.dOld = allMediaDriftFor(oldOnly);
    await renderNeedsAttentionHub();
    out.docketOld = [...document.querySelectorAll("#docketOtherContainer .docket-media-drift")].length;
    // Columns missing: nothing either.
    const noCols = mk("AY-00407", {});
    __setLiveCoinsForTest([noCols]);
    out.renamedNone = allMediaColumnsRenamed();
    // After the rename: rows, one per differing column, no Dismiss, tap opens the coin.
    __setLiveCoinsForTest([c401, c402, c403, c404]);
    out.renamedNew = allMediaColumnsRenamed();
    await renderNeedsAttentionHub();
    const rows = [...document.querySelectorAll("#docketOtherContainer .wish-item")].filter(r => r.querySelector(".docket-media-drift"));
    out.docket = rows.map(r => r.querySelector(".docket-media-drift").textContent);
    out.dismiss = rows.some(r => !!r.querySelector(".docket-dismiss"));
    out.count = document.getElementById("docketOtherCount").textContent;
    if (rows[0]) { rows[0].click(); await W.sleep(100); }
    out.opened = currentBrowseCoin && currentBrowseCoin.id;
    // Photos not loaded yet: nothing.
    __setStoredPhotosForTest(null);
    out.unloaded = allMediaDriftFor(c402, true);
    __resetMediaChangedForTest();
    W.resetState();
    return out;
  });
  ok("D1 no drift when every new-named cell matches (first Obverse row; Holder_Front = Slab_Obverse; References / OGP_Photos joined '; ' in table order, OGP_Obverse/Reverse included; trim and case ignored; SubGroup feeds nothing): " + JSON.stringify(D.matches),
    D.matches.length === 0);
  ok("D2 a formula error and a stale value are drift; both-blank columns are a match: " + JSON.stringify(D.d402),
    JSON.stringify(D.d402) === JSON.stringify([{ column: "Obverse", allValue: "#N/A", sheetValue: "x.jpg" }, { column: "Receipt", allValue: "stale.pdf", sheetValue: "" }]));
  ok("D3 a Binder Receipts row matches All.Receipt 'Binder'; only the columns the sheet has are compared: " + JSON.stringify([D.d403, D.d404]),
    D.d403.length === 0 && JSON.stringify(D.d404) === JSON.stringify([{ column: "Other_Photos", allValue: "", sheetValue: "oth.jpg" }]));
  ok("D4 a record whose photos/receipt this session changed is skipped (its All cells are stale until a reload)",
    D.d405.length === 0);
  ok("D5 before the rename (old names) or with the columns gone, nothing is checked and the Docket shows no drift rows: " + JSON.stringify([D.renamedOld, D.dOld, D.docketOld, D.renamedNone]),
    D.renamedOld === false && D.dOld.length === 0 && D.docketOld === 0 && D.renamedNone === false);
  ok("D6 after the rename the Docket shows one row per differing column, naming the column and both values, with no Dismiss: " + JSON.stringify(D.docket),
    D.renamedNew && D.docket.length === 3 &&
     D.docket.some(t => /AY-00402 · All\.Obverse says “#N\/A”, but the Photos tab gives “x\.jpg”/.test(t)) &&
     D.docket.some(t => /AY-00402 · All\.Receipt says “stale\.pdf”, but the Receipts tab gives blank/.test(t)) &&
     D.docket.some(t => /AY-00404 · All\.Other_Photos says blank, but the Photos tab gives “oth\.jpg”/.test(t)) && !D.dismiss);
  ok("D7 a tap opens the coin; with the Photos tab not loaded nothing is flagged",
    D.opened === "AY-00402" && D.unloaded.length === 0);

  // ---------- W. no write touches a media column ---------------------------
  const runWrites = async (variant) => page.evaluate(async ({ variant, headers, mediaNames }) => {
    const W = __ra; W.resetState();
    const out = { variant };
    const H = headers;
    const idx = n => H.indexOf(n);
    const mediaIdx = H.map((h, i) => mediaNames.indexOf(h) !== -1 ? i + 1 : 0).filter(Boolean);
    const row = (vals) => H.map(h => (h in vals) ? vals[h] : (mediaNames.indexOf(h) !== -1 ? "MEDIA:" + h : (h === "Total" || h === "SpotValue" ? 0 : null)));
    const data = [
      row({ CollectionID: "AY-00099", Year: 1916, MintMark: "D", Denomination: "10C", Description: "Mercury Dime", Value: 40, Cost: 30, Shipping: 0, Status: "Owned", CoinID: "C-1916-D-10C-01", Finish: "Business Strike", GradeSource: "Owner" }),
      row({ CollectionID: "AY-00080", Year: 1917, Denomination: "10C", Description: "Mercury Dime", Status: "Sold" }),
      row({ CollectionID: "AY-00081", Year: 1918, Denomination: "10C", Description: "Mercury Dime", Status: "Owned" }),
      row({ CollectionID: "AY-00090", Year: 1957, Denomination: "Multiple", Description: "1957 Proof Set", Status: "Owned" })
    ];
    // Trailing blank rows: CollectionID blank, but the media formulas show
    // something (an error, or a blank-looking result) and Total/SpotValue 0.
    const blankRow = () => H.map(h => mediaNames.indexOf(h) !== -1 ? (h === "Receipt" || h === "References" ? "#N/A" : "") : (h === "Total" || h === "SpotValue" ? 0 : null));
    const grid = [H].concat(data, [blankRow(), blankRow(), blankRow()]);
    const formulas = grid.map((r, ri) => ri === 0 ? [] : H.map((h, ci) => mediaNames.indexOf(h) !== -1 ? "=MEDIA(" + ci + ")" : undefined));
    const mock = createMockGraphClient({ sheets: { All: grid,
      Receipts: [["ReceiptID", "CollectionID", "Filename", "DateAdded"], ["", "", "", ""]],
      Photos: [["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"], new Array(8).fill("")] },
      formulas: { All: formulas } });
    W.mock = mock; W.patches = []; W.events = [];
    __setGraphClientForTest(W.wrap(mock));
    __resetAllHeaderMapForTest(); __resetSheetHeaderMapsForTest(); __resetMintedIdsForTest();
    __setAddCoinWriteEnabledForTest(true); __setBrowseEditWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([{ denom: "10C", year: 1916, mint: "D", variety: "", description: "Mercury Dime", finish: "Business Strike",
      designation: "", gsid: "", pcgs: "", mintage: 0, coinId: "C-1916-D-10C-01", composition: "90% Silver" }]);
    const coin = { id: "AY-00099", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime", value: 40, cost: 30 };
    __setLiveCoinsForTest([coin]);
    __setStoredPhotosForTest({}); __setStoredReceiptsForTest({});
    const mediaBefore = grid.slice(1, 5).map(r => mediaIdx.map(c => r[c - 1]));

    // 1. Edit Coin Save Changes, many fields at once.
    navigate("browse"); showBrowseDetail(coin); showBrowseEditView(coin);
    await loadBrowseEditSnapshot(coin); await W.sleep(120);
    const setv = (id, v) => { const el = document.getElementById(id); if (!el) return; el.focus(); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
    setv("browseEditValue", "55"); setv("browseEditCost", "31"); setv("browseEditShippingCost", "2");
    setv("browseEditVendor", "Shop"); setv("browseEditNotes", "a note"); setv("browseEditContainer", "Box 1");
    setv("browseEditPurchaseDate", "2026-10-01");
    await W.save("browseEdit");
    out.editToast = W.toast();
    const r99 = mock._grids.All[1];
    out.editWrote = { value: r99[idx("Value")], cost: r99[idx("Cost")], remarks: r99[idx("Remarks")] };
    W.resetState();

    // 2. Add Coin promotion and 3. Force Add (both claim blank rows).
    const base = writePaths().stagingBase;
    const draft = (id, coinId) => ({ type: "coin", version: 1, collectionID: id, status: COIN_DRAFT_STATUS.READY,
      denom: "10C", category: "", year: "1916", mint: "D", variety: "", description: "Mercury Dime",
      finish: "Business Strike", designation: "", grade: "VG-8", gradeSource: "PCGS", serNo: "123", cacBean: "",
      cost: 9, shippingCost: 1, purchaseDate: "2024-05-02", vendor: "GC", storageLocation: "Safe", container: "",
      remarks: "r", errorDesc: "", coinId, photos: [], receiptPhoto: "", receiptBinder: true,
      allRowWritten: false, forceAdded: false, createdDate: new Date().toISOString() });
    await mock.uploadJson(base + "/AY-00700/coin.json", draft("AY-00700", "C-1916-D-10C-01"));
    await mock.uploadJson(base + "/AY-00701/coin.json", draft("AY-00701", ""));
    const p1 = await promoteCoinDraftToAllSheet("AY-00700");
    const p2 = await promoteCoinDraftToAllSheet("AY-00701", { force: true });
    out.promote = { r1: p1 && p1.rowNumber, r2: p2 && p2.rowNumber, ok1: !!(p1 && p1.ok !== false), ok2: !!(p2 && p2.ok !== false) };
    out.gridLen = mock._grids.All.length;
    // 4. CoinID, OriginSetID (attach and detach), Purged cells.
    await writeCoinIdCell(2, "C-1916-D-10C-02");
    await writeOriginSetIdCell(4, "AY-00090");
    await writeOriginSetIdCell(4, "");
    await writePurgedCell(3, "Y");

    // Every All patch, and the columns it covered.
    const allPatches = W.patches.filter(p => p.sheet === "All");
    const covered = new Set();
    allPatches.forEach(p => p.addresses.forEach(a => W.columnsOf(a).forEach(c => covered.add(c))));
    out.allPatchCount = allPatches.length;
    out.touchedMedia = mediaIdx.filter(c => covered.has(c)).map(c => H[c - 1]);
    out.otherSheets = [...new Set(W.patches.map(p => p.sheet))];
    // The pre-existing rows' media values, and every media formula, survive.
    const mediaAfter = mock._grids.All.slice(1, 5).map(r => mediaIdx.map(c => r[c - 1]));
    out.mediaValuesSame = JSON.stringify(mediaBefore) === JSON.stringify(mediaAfter);
    const f = mock._formulas.All;
    out.formulasSurvive = f.slice(1).every((r, ri) => mediaIdx.every(c => r[c - 1] === "=MEDIA(" + (c - 1) + ")"));
    out.claimedRowsMedia = [p1, p2].filter(Boolean).map(p => mediaIdx.map(c => mock._grids.All[p.rowNumber - 1][c - 1]));
    out.mediaCount = mediaIdx.length;
    W.resetState();
    __setLiveDbCoinsForTest(null);
    return out;
  }, { variant, headers: allHeaders(variant), mediaNames: MEDIA_OLD.concat(MEDIA_NEW) });

  for (const variant of ["old", "new", "none"]) {
    const X = await runWrites(variant);
    const expectMedia = variant === "old" ? 8 : variant === "new" ? 9 : 0;
    ok(`W1 [${variant} names] Edit Coin Save Changes writes its fields (Value, Cost, Remarks …): ` + JSON.stringify([X.editToast, X.editWrote]),
    X.mediaCount === expectMedia && /Saved AY-00099/.test(X.editToast) && X.editWrote.value === 55 && X.editWrote.cost === 31 && X.editWrote.remarks === "a note");
    ok(`W2 [${variant} names] promotion and Force Add claim the first blank rows even though their media formulas show '#N/A' (nothing appended): ` + JSON.stringify([X.promote, X.gridLen]),
    X.promote.r1 === 6 && X.promote.r2 === 7 && X.gridLen === 8);
    ok(`W3 [${variant} names] no All write (Save Changes, promotion, Force Add, CoinID / OriginSetID / Purged cells) covers a media column: ` + JSON.stringify(X.touchedMedia),
    X.allPatchCount > 0 && X.touchedMedia.length === 0);
    ok(`W4 [${variant} names] every media formula survives, and the claimed rows' media cells were never written: ` + JSON.stringify([X.mediaValuesSame, X.formulasSurvive, X.claimedRowsMedia]),
    X.mediaValuesSame && X.formulasSurvive && X.claimedRowsMedia.every(r => r.every(v => v === "" || v === "#N/A")));
  }

  // The static list: every workbook write call in app.html, by the sheet it
  // names. Only six functions name All; every other call names a sheet that
  // is not All (Photos / Receipts through patchRecordRow / writeRecordRow,
  // Ref_SpotPrices for the Ledger), or is the Graph client itself.
  const lines = src.split("\n");
  const allWriteSites = [];
  const otherTargets = new Set();
  lines.forEach((line, i) => {
    const m = line.match(/(?:patchWorkbookRanges|addTableRow)\((?:[^,()]|\([^)]*\))*,\s*([A-Za-z_]+)/);
    if (!m || /^\s*\/\//.test(line)) return;
    const fn = ((lines.slice(0, i + 1).reverse().find(l => /^\s*(async )?function \w+|^\s*(async )?\w+\([^)]*\) \{\s*$/.test(l)) || "")
      .match(/function (\w+)|^\s*(?:async )?(\w+)\(/) || []).slice(1).find(Boolean);
    if (m[1] === "ALL_SHEET_NAME" || m[1] === "ALL_TABLE_NAME") allWriteSites.push(fn);
    else otherTargets.add(m[1] + "@" + fn);
  });
  ok("W5a every other workbook write names a non-All sheet (Photos / Receipts helpers, the Ledger's Ref_SpotPrices) or is the client itself: " + JSON.stringify([...otherTargets]),
    [...otherTargets].every(t => /^(sheetName|tableName|PHOTOS_SHEET_NAME|SPOT_PRICE_SHEET|sheet)@/.test(t)) &&
     [...otherTargets].some(t => /^SPOT_PRICE_SHEET@/.test(t)));
  const expectedSites = ["saveCoinRowToWorkbook", "writeCoinIdCell", "writeNewRowKeyCells", "createAllSheetRow", "writeOriginSetIdCell", "writePurgedCell"];
  const helperArgs = [...new Set((src.match(/(?:patchRecordRow|writeRecordRow)\(([A-Za-z_]+)/g) || []).map(x => x.split("(")[1]))];
  ok("W5b the row helpers (patchRecordRow / writeRecordRow) are only ever called for Photos or Receipts: " + JSON.stringify(helperArgs),
    helperArgs.every(a => ["PHOTOS_SHEET_NAME", "RECEIPTS_SHEET_NAME", "sheetName"].indexOf(a) !== -1));
  ok("W5 app.html writes the All sheet in exactly six functions, every one exercised by W1-W4 (Ledger, Batch Receipt, Add Set and Staging never write All): " + JSON.stringify(allWriteSites),
    JSON.stringify([...new Set(allWriteSites)].sort()) === JSON.stringify(expectedSites.slice().sort()));
  const neverList = await page.evaluate(() => ({ never: ALL_NEVER_WRITE_COLUMNS.slice(), writable: ALL_WRITABLE_COLUMNS.slice() }));
  const allMedia = [...new Set(MEDIA_OLD.concat(MEDIA_NEW))];
  ok("W6 every media column, old and new names, is on ALL_NEVER_WRITE_COLUMNS and none is on the write allow-list",
    allMedia.every(n => neverList.never.indexOf(n) !== -1) && allMedia.every(n => neverList.writable.indexOf(n) === -1));
});
