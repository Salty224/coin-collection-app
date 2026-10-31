// Receipts and photos alignment, Build 2: file naming for NEW receipt files
// (Ray, 31 Oct 2026), claude/receipt-remove-and-shared-replace.
//
// RULE. A photographed / camera receipt (no usable name) is named
// {Seller}_{YYYY-MM-DD}_receipt.pdf from the seller and purchase date, and
// {ReceiptID}_receipt.pdf when either is missing. Never from the coin. A picked
// PDF with its own name keeps it. Existing files are never renamed. Edit Coin
// and Edit Set only (Add Coin / Staging / Add Set are untouched).
//
//   SELF the shared check helper's must-fail self-check
//   N1  the pure helpers (seller cleaning, date, name, app-made test)
//   N2  Edit Coin photo -> Seller_Date name; the name uses the values at SAVE
//   N3  fallback to the ReceiptID: neither / seller only / date only; the id is
//       minted BEFORE the upload; a failed Save keeps it; a competing mint never
//       hands the same number out (PH-00129)
//   N4  Edit Set uses the coin RECORD's seller and date, not its session-only form
//   N5  re-picking what is already on file stays "already on file", whatever
//       the stored file is called and whatever the seller / date now say
//   N6  _02 under the new name; attach to another coin's identical file; an
//       unclaimed identical file is adopted (new ReceiptID)
//   N7  a picked PDF keeps its own name (generic names too); old files are never
//       renamed; Replace on all N coins names the file for this coin's seller/date

const { defineSuite } = require("./harness");

const RECEIPT_HEADERS = ["ReceiptID", "CollectionID", "Filename", "DateAdded"];
const PHOTO_HEADERS = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "", "OriginalFilename"];
const ALL_HEADERS = ["CollectionID", "Year", "MintMark", "Denomination", "Variety", "Description",
  "Value", "Cost", "Shipping", "Seller_Link", "PurchaseDate", "StorageLocation", "Container",
  "Grade", "GradeSource", "Designation", "SerNo", "CACBean", "Remarks", "Reviewed", "LastModified",
  "Finish", "CoinID", "Status", "SaleDate", "SalePrice", "Buyer", "Platform"];

async function setup(page) {
  await page.evaluate(async ({ RECEIPT_HEADERS, PHOTO_HEADERS, ALL_HEADERS }) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
    const mkJpeg = async (color) => {
      const c = document.createElement("canvas"); c.width = 200; c.height = 300;
      const x = c.getContext("2d"); x.fillStyle = color; x.fillRect(0, 0, 200, 300);
      return await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
    };
    const jpegA = await mkJpeg("#c63"), jpegB = await mkJpeg("#36c");
    const wrapA = (await prepareReceiptFile(new File([jpegA], "a.jpg", { type: "image/jpeg" }))).blob;
    const mk = (id, vendor, date) => ({ id, name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D",
      description: "Mercury Dime", vendor: vendor || "", purchaseDate: date || "" });
    window.__fn = {
      sleep, events: [], uploads: [], deletes: [], failUploadOnce: false, mock: null, jpegA, jpegB, wrapA,
      cex: mk("AY-00099", "Charleston Coin Exchange", "2026-10-02"),
      plain: mk("AY-00098"), vOnly: mk("AY-00097", "Heritage Auctions", ""), dOnly: mk("AY-00096", "", "2026-09-01"),
      old: mk("AY-00093", "Finders Keepers", "2026-06-27"), fk: mk("AY-00080", "Finders Keepers", "2026-06-27"),
      stray: mk("AY-00094", "Charleston Coin Exchange", "2026-11-05"),
      fresh: mk("AY-00092", "Finders Keepers", "2026-07-04"),
      set: { id: "AY-00090", name: "1957 Proof Set", denom: "Multiple", year: 1957, mint: "", category: "Proof Set",
             vendor: "Heritage Auctions", purchaseDate: "2026-09-01" },
      file(blob, name, type) { return new File([blob], name, { type: type || "image/jpeg" }); },
      async install() {
        const self = this;
        const ov0 = document.getElementById("writeGuardOverlay"); if (ov0) ov0.classList.add("hidden");
        discardUnsavedPhotoEdits(); browseEditTouchedFields.clear();
        try { resetAddCoinForm(); clearCoinDraftEditContext(); } catch (e) { /* not ready */ }
        Object.keys(pendingReceipts).forEach(k => delete pendingReceipts[k]);
        navigateNow("dashboard");
        const serial = iso => iso ? excelSerialFromISODate(iso) : null;
        const allRow = (c) => [c.id, 1916, "D", c.denom, "", "Mercury Dime", 40, 30, 0, c.vendor || "", serial(c.purchaseDate),
          "Safe", "", "VF-20", "Owner", "", "", "", "", "", null,
          "Business Strike", "C-1916-D-10C-01", "Owned", null, null, "", ""];
        const blank = n => Array.from({ length: n }, () => new Array(9).fill(""));
        const coins = [this.cex, this.plain, this.vOnly, this.dOnly, this.old, this.fk, this.stray, this.fresh, this.set];
        const mock = createMockGraphClient({ sheets: {
          All: [ALL_HEADERS, ...coins.map(allRow)],
          Receipts: [RECEIPT_HEADERS,
            ["RC-00020", "AY-00093", "AY-00093_receipt.pdf", 46000],                              // 2: an old-style name
            ["RC-00030", "AY-00080", "old_shared.pdf", 46000],                                     // 3 \
            ["RC-00030", "AY-00081", "old_shared.pdf", 46001],                                     // 4  } one receipt, three coins
            ["RC-00030", "AY-00082", "old_shared.pdf", 46002],                                     // 5 /
            ["RC-00031", "AY-00079", "CharlestonCoinExchange_2026-10-02_receipt.pdf", 46003],      // 6: another coin's seller+date file
            ["", "", "", ""], ["", "", "", ""], ["", "", "", ""], ["", "", "", ""]],
          Photos: [PHOTO_HEADERS, ...blank(4)]
        } });
        const rp = writePaths().coinReceipts + "/";
        await mock.uploadFile(rp + "AY-00093_receipt.pdf", this.wrapA);
        await mock.uploadFile(rp + "old_shared.pdf", new Blob(["OLDSH"]));
        await mock.uploadFile(rp + "CharlestonCoinExchange_2026-10-02_receipt.pdf", this.wrapA);
        await mock.uploadFile(rp + "CharlestonCoinExchange_2026-11-05_receipt.pdf", this.wrapA); // no row claims it
        this.mock = mock;
        this.events = []; this.uploads = []; this.deletes = []; this.failUploadOnce = false;
        __setGraphClientForTest(new Proxy(mock, { get(t, k) {
          const v = t[k];
          if (typeof v !== "function") return v;
          return async (...a) => {
            if (k === "uploadFile") {
              const name = String(a[0]).split("/").pop();
              if (self.failUploadOnce) { self.failUploadOnce = false; throw new Error("offline"); }
              self.uploads.push(name); self.events.push("upload:" + name);
            }
            if (k === "deleteItem") self.deletes.push(String(a[0]));
            if (k === "patchWorkbookRanges") self.events.push("patch:" + a[1]);
            return v.apply(t, a);
          };
        } }));
        __resetSheetHeaderMapsForTest(); __resetAllHeaderMapForTest(); __resetMintedIdsForTest();
        __setAddCoinWriteEnabledForTest(true);
        __setBrowseEditWriteEnabledForTest(true);
        __setLiveCoinsForTest(coins);
        __setStoredReceiptsForTest({
          "AY-00093": { receiptId: "RC-00020", filename: "AY-00093_receipt.pdf" },
          "AY-00080": { receiptId: "RC-00030", filename: "old_shared.pdf" },
          "AY-00081": { receiptId: "RC-00030", filename: "old_shared.pdf" },
          "AY-00082": { receiptId: "RC-00030", filename: "old_shared.pdf" },
          "AY-00079": { receiptId: "RC-00031", filename: "CharlestonCoinExchange_2026-10-02_receipt.pdf" }
        });
        __setStoredPhotosForTest({});
        closeImageSourceChooser();
        const ov = document.getElementById("writeGuardOverlay"); if (ov) ov.classList.add("hidden");
        this.clearToast();
        this.events = []; this.uploads = []; this.deletes = [];
      },
      rcGrid() { return this.mock._grids.Receipts; },
      rcRows(id) { return this.rcGrid().slice(1).filter(r => r[1] === id); },
      rcRow(id) { return this.rcRows(id)[0] || null; },
      async fileText(name) {
        const b = await this.mock.getFileBytes(writePaths().coinReceipts + "/" + name);
        return b ? "present" : null;
      },
      async openEditCoin(coin) {
        navigate("browse"); showBrowseDetail(coin); showBrowseEditView(coin);
        await loadBrowseEditSnapshot(coin);
        await sleep(120);
        ["editCoinPhotosHeader", "browseEditReceiptAccordionHeader"].forEach(id => {
          const h = document.getElementById(id); if (h.getAttribute("aria-expanded") !== "true") h.click();
        });
      },
      async openEditSet() {
        navigate("browse"); showBrowseDetail(this.set); showBrowseEditSetView(this.set);
        await sleep(80);
        ["editSetPhotosHeader", "editSetReceiptAccordionHeader"].forEach(id => {
          const h = document.getElementById(id); if (h.getAttribute("aria-expanded") !== "true") h.click();
        });
      },
      async pickFile(prefix, file) {
        const input = document.getElementById(prefix + "ReceiptLibraryInput");
        const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        await sleep(300);
      },
      saveBtn(prefix) { return document.getElementById(prefix === "editSet" ? "browseEditSetSaveBtn" : "browseEditSaveBtn"); },
      async save(prefix) { this.saveBtn(prefix).click(); await sleep(60); await this.waitFor(() => !editSaveInFlight, 4000); await sleep(200); },
      async waitFor(fn, ms) { const end = Date.now() + (ms || 3000); while (Date.now() < end) { if (fn()) return true; await sleep(30); } return !!fn(); },
      setv(id, v) { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); },
      toast() { const t = document.getElementById("toast"); return t.classList.contains("show") ? t.textContent : ""; },
      clearToast() { const t = document.getElementById("toast"); t.classList.remove("show"); t.textContent = ""; },
      guardOpen() { const o = document.getElementById("writeGuardOverlay"); return !!o && !o.classList.contains("hidden"); },
      clickGuard(label) {
        const b = [...document.querySelectorAll("#writeGuardBtns button")].find(x => x.textContent === label);
        if (!b) return false; b.click(); return true;
      }
    };
  }, { RECEIPT_HEADERS, PHOTO_HEADERS, ALL_HEADERS });
}

module.exports = defineSuite("receipt-file-naming", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);
  await setup(page);

  // ---------- N1: the pure helpers -----------------------------------------
  const N1 = await page.evaluate(() => ({
    clean: ["Charleston Coin Exchange", "Finders Keepers", "Joe's Coins & Co.", "Café Müller", "  ", "!!!", "eBay seller", "x".repeat(60),
      "finders keepers", "heritage AUCTIONS", "FINDERS keepers", "élan coins", "Élan coins", "  spaced   out  ", "joe's coins & co.", "coin-shop"]
      .map(cleanSellerForFilename),
    dates: ["2026-10-02", "2026-02-30", "10/02/2026", "", "2026-1-2", null].map(receiptPurchaseDatePart),
    full: receiptSellerDateName("Charleston Coin Exchange", "2026-10-02"),
    noSeller: receiptSellerDateName("  !! ", "2026-10-02"), noDate: receiptSellerDateName("Heritage", ""),
    byId: receiptIdFallbackName("RC-00012"),
    photoName: storedReceiptFilename("AY-00001", { sourceWasPdf: false, filename: "image.jpg" }, { seller: "Finders Keepers", purchaseDate: "2026-06-27" }),
    photoFallback: storedReceiptFilename("AY-00001", { sourceWasPdf: false, filename: "image.jpg" }, { seller: "", purchaseDate: "2026-06-27", receiptId: "RC-00012" }),
    pdfOwn: storedReceiptFilename("AY-00001", { sourceWasPdf: true, filename: "scan0001.pdf" }, { seller: "Finders Keepers", purchaseDate: "2026-06-27", receiptId: "RC-00012" }),
    appMade: ["RC-00012_receipt.pdf", "RC-00012_receipt_02.pdf", "AY-00099_receipt.pdf", "CharlestonCoinExchange_2026-10-02_receipt.pdf", "scan0001.pdf"].map(receiptFilenameLooksAppMade)
  }));
  ok("N1a seller cleaning: first letter of each word capitalised, the rest of the word as typed, spaces / punctuation removed, accents dropped, empty stays empty, capped at 40",
    JSON.stringify(N1.clean.slice(0, 8)) === JSON.stringify(["CharlestonCoinExchange", "FindersKeepers", "JoesCoinsCo", "CafeMuller", "", "", "EBaySeller", "X" + "x".repeat(39)]), N1.clean);
  ok("N1a2 all-lowercase words are capitalised; mixed case already present is kept ('AUCTIONS', 'FINDERS' are not lowercased); a word starting with an accent is capitalised after the accent is dropped; extra spaces and punctuation vanish",
    JSON.stringify(N1.clean.slice(8)) === JSON.stringify(["FindersKeepers", "HeritageAUCTIONS", "FINDERSKeepers", "ElanCoins", "ElanCoins", "SpacedOut", "JoesCoinsCo", "Coinshop"]), N1.clean.slice(8));
  ok("N1b only a real YYYY-MM-DD date counts", JSON.stringify(N1.dates) === JSON.stringify(["2026-10-02", "", "", "", "", ""]), N1.dates);
  ok("N1c Seller_Date name when both are present; empty when either is missing",
    N1.full === "CharlestonCoinExchange_2026-10-02_receipt.pdf" && N1.noSeller === "" && N1.noDate === "", N1);
  ok("N1d the ReceiptID fallback name", N1.byId === "RC-00012_receipt.pdf", N1.byId);
  ok("N1e storedReceiptFilename: seller+date wins for a photo, the ReceiptID when one is missing, a picked PDF keeps its own name",
    N1.photoName === "FindersKeepers_2026-06-27_receipt.pdf" && N1.photoFallback === "RC-00012_receipt.pdf" && N1.pdfOwn === "scan0001.pdf", N1);
  ok("N1f RC-nnnnn_receipt.pdf counts as app-made (no early pdf.js load), a seller+date name does not",
    JSON.stringify(N1.appMade) === JSON.stringify([true, true, true, false, false]), N1.appMade);

  // ---------- N2: Edit Coin, seller + date --------------------------------
  const N2 = await page.evaluate(async () => {
    const W = __fn; await W.install(); await W.openEditCoin(W.fresh);
    const out = {};
    out.formValues = { v: document.getElementById("browseEditVendor").value, d: document.getElementById("browseEditPurchaseDate").value };
    await W.pickFile("browseEdit", W.file(W.jpegB, "IMG_0001.jpg"));
    W.events = []; W.uploads = [];
    await W.save("browseEdit");
    const row = W.rcRow("AY-00092");
    out.save = { uploads: W.uploads.slice(), row: row && row.slice(), toast: W.toast() };
    // edited between pick and Save: the name uses the values at SAVE
    await W.install(); await W.openEditCoin(W.fresh);
    await W.pickFile("browseEdit", W.file(W.jpegB, "IMG_0002.jpg"));
    W.setv("browseEditVendor", "Heritage Auctions"); W.setv("browseEditPurchaseDate", "2026-09-01");
    W.events = []; W.uploads = [];
    await W.save("browseEdit");
    const row2 = W.rcRow("AY-00092");
    out.edited = { uploads: W.uploads.slice(), row: row2 && row2.slice(), coinRowSaved: W.events.indexOf("patch:All") !== -1 };
    return out;
  });
  ok("N2a the form shows the coin's seller and date (the test starts from real values)", N2.formValues.v === "Finders Keepers" && N2.formValues.d === "2026-07-04", N2.formValues);
  ok("N2b a photographed receipt is named from the seller and purchase date: one upload, the row names the same file, a new ReceiptID, never the coin's id",
    N2.save.uploads.join() === "FindersKeepers_2026-07-04_receipt.pdf" && N2.save.row[2] === "FindersKeepers_2026-07-04_receipt.pdf" &&
    /^RC-\d{5}$/.test(N2.save.row[0]) && !/AY-/.test(N2.save.row[2]), N2.save);
  ok("N2c the name is built at SAVE from the edited form: Heritage Auctions on 2026-09-01, and the coin row is saved in the same Save",
    N2.edited.uploads.join() === "HeritageAuctions_2026-09-01_receipt.pdf" && N2.edited.row[2] === "HeritageAuctions_2026-09-01_receipt.pdf" && N2.edited.coinRowSaved, N2.edited);

  // ---------- N3: fallback to the ReceiptID, minted before the upload -----
  const N3 = await page.evaluate(async () => {
    const W = __fn; const out = {};
    for (const [key, coin] of [["neither", W.plain], ["sellerOnly", W.vOnly], ["dateOnly", W.dOnly]]) {
      await W.install(); await W.openEditCoin(coin);
      await W.pickFile("browseEdit", W.file(W.jpegB, "IMG_0003.jpg"));
      W.events = []; W.uploads = [];
      await W.save("browseEdit");
      const row = W.rcRow(coin.id);
      out[key] = { uploads: W.uploads.slice(), row: row && row.slice(), uploadBeforeRow: W.events.indexOf("upload:" + (row && row[2])) !== -1 &&
        W.events.indexOf("upload:" + (row && row[2])) < W.events.lastIndexOf("patch:Receipts") };
    }
    // the next id is max+1 of the column: RC-00031 is the highest seeded
    out.expectedId = "RC-00032";
    return out;
  });
  const idNamed = (r) => r.row && r.row[2] === r.row[0] + "_receipt.pdf" && r.uploads.join() === r.row[2];
  ok("N3a neither seller nor date: the file is named for its ReceiptID (and the row carries that id), not for the coin", idNamed(N3.neither) && N3.neither.row[0] === N3.expectedId, N3.neither);
  ok("N3b seller only: the ReceiptID name", idNamed(N3.sellerOnly), N3.sellerOnly);
  ok("N3c date only: the ReceiptID name", idNamed(N3.dateOnly), N3.dateOnly);
  ok("N3d the file is uploaded before its row is written", N3.neither.uploadBeforeRow && N3.sellerOnly.uploadBeforeRow && N3.dateOnly.uploadBeforeRow, N3);

  const N3b = await page.evaluate(async () => {
    const W = __fn; await W.install(); await W.openEditCoin(W.plain);
    await W.pickFile("browseEdit", W.file(W.jpegB, "IMG_0004.jpg"));
    W.failUploadOnce = true; W.uploads = [];
    await W.save("browseEdit");
    const minted = pendingReceipts["AY-00098"] && pendingReceipts["AY-00098"].mintedReceiptId;
    const failToast = W.toast();
    const rowAfterFail = W.rcRow("AY-00098");
    // another receipt is written meanwhile (a Binder for a different coin): it must NOT get the number the failed Save pre-minted
    const other = await commitBinderReceipt("AY-00070");
    W.lastOtherId = other.receiptId;
    W.uploads = [];
    await W.save("browseEdit");
    const row = W.rcRow("AY-00098");
    const ids = W.rcGrid().slice(1).map(r => r[0]).filter(Boolean);
    return { minted, failToast, rowAfterFail, other: other.receiptId, row: row && row.slice(), uploads: W.uploads.slice(),
      mintedCount: ids.filter(v => v === minted).length, otherCount: ids.filter(v => v === W.lastOtherId).length, pending: pendingReceiptCount("AY-00098") };
  });
  ok("N3e a failed upload keeps the pre-minted ReceiptID on the pending pick and writes no row", /^RC-\d{5}$/.test(N3b.minted) && !N3b.rowAfterFail && /not saved|Receipt not saved/i.test(N3b.failToast), N3b);
  ok("N3f a competing mint never hands out the same number (PH-00129 protection holds with a pre-minted id)", N3b.other !== N3b.minted && N3b.mintedCount === 1 && N3b.otherCount === 1, N3b);
  ok("N3g the retry reuses the SAME id: the file is named for it and the row carries it", N3b.row && N3b.row[0] === N3b.minted && N3b.row[2] === N3b.minted + "_receipt.pdf" && N3b.uploads.join() === N3b.minted + "_receipt.pdf" && N3b.pending === 0, N3b);

  // ---------- N4: Edit Set uses the coin record ---------------------------
  const N4 = await page.evaluate(async () => {
    const W = __fn; await W.install(); await W.openEditSet();
    W.setv("editSetVendor", "Other Seller"); W.setv("editSetPurchaseDate", "2020-01-01"); // session-only form fields
    await W.pickFile("editSet", W.file(W.jpegB, "IMG_0005.jpg"));
    W.uploads = [];
    await W.save("editSet");
    const row = W.rcRow("AY-00090");
    return { uploads: W.uploads.slice(), row: row && row.slice(), form: document.getElementById("editSetVendor").value };
  });
  ok("N4 Edit Set names the file from the record's workbook seller and date (Heritage Auctions, 2026-09-01), not from its session-only form",
    N4.uploads.join() === "HeritageAuctions_2026-09-01_receipt.pdf" && N4.row[2] === "HeritageAuctions_2026-09-01_receipt.pdf", N4);

  // ---------- N5: already on file stays already on file -------------------
  const N5 = await page.evaluate(async () => {
    const W = __fn; const out = {};
    // (a) the stored file is an old AY-00093_receipt.pdf name; the same scan is picked again
    await W.install(); await W.openEditCoin(W.old);
    W.rcRow("AY-00093")[3] = 46123;
    await W.pickFile("browseEdit", W.file(W.jpegA, "IMG_0006.jpg"));
    W.events = []; W.uploads = [];
    await W.save("browseEdit");
    out.old = { uploads: W.uploads.slice(), events: W.events.slice(), row: W.rcRow("AY-00093").slice(), toast: W.toast(),
      oldFile: await W.fileText("AY-00093_receipt.pdf"), newName: await W.fileText("FindersKeepers_2026-06-27_receipt.pdf") };
    // (b) saved under seller A, then the seller is edited and the same scan is picked again
    await W.install(); await W.openEditCoin(W.cex);
    await W.pickFile("browseEdit", W.file(W.jpegA, "IMG_0007.jpg")); // wrap = the file another coin already has -> attaches
    await W.save("browseEdit");
    const firstRow = W.rcRow("AY-00099").slice();
    await W.openEditCoin(W.cex);
    W.setv("browseEditVendor", "Heritage Auctions");
    await W.pickFile("browseEdit", W.file(W.jpegA, "IMG_0008.jpg"));
    W.events = []; W.uploads = [];
    await W.save("browseEdit");
    out.edited = { firstRow, row: W.rcRow("AY-00099").slice(), uploads: W.uploads.slice(), copy: await W.fileText("HeritageAuctions_2026-10-02_receipt.pdf"), rows: W.rcRows("AY-00099").length };
    return out;
  });
  ok("N5a re-picking the same scan on a coin whose receipt is an OLD-style name stays 'already on file': nothing uploaded, no Receipts write, DateAdded kept",
    N5.old.uploads.length === 0 && N5.old.events.filter(e => e === "patch:Receipts").length === 0 && N5.old.row[3] === 46123 && /already on file/.test(N5.old.toast), N5.old);
  ok("N5b ...and the old file keeps its name (never renamed) and no new-named copy appears",
    N5.old.row[2] === "AY-00093_receipt.pdf" && N5.old.oldFile === "present" && N5.old.newName === null, N5.old);
  ok("N5c a seller edited between two picks of the same scan makes no second copy: nothing uploaded, still one row, still the first file",
    N5.edited.uploads.length === 0 && N5.edited.copy === null && N5.edited.rows === 1 && N5.edited.row[2] === N5.edited.firstRow[2], N5.edited);

  // ---------- N6: _02, attach, adopt under the new name -------------------
  const N6 = await page.evaluate(async () => {
    const W = __fn; const out = {};
    // (a) different bytes under the same seller + date: _02, the other coin's file untouched
    await W.install(); await W.openEditCoin(W.cex);
    await W.pickFile("browseEdit", W.file(W.jpegB, "IMG_0009.jpg"));
    W.uploads = [];
    await W.save("browseEdit");
    out.diff = { uploads: W.uploads.slice(), row: W.rcRow("AY-00099").slice(), other: W.rcRow("AY-00079").slice() };
    // (b) the identical scan another coin already filed under that name: attach, no upload, no _02
    await W.install(); await W.openEditCoin(W.cex);
    await W.pickFile("browseEdit", W.file(W.jpegA, "IMG_0010.jpg"));
    W.uploads = [];
    await W.save("browseEdit");
    out.same = { uploads: W.uploads.slice(), row: W.rcRow("AY-00099").slice(), toast: W.toast() };
    // (c) an unclaimed file with the same bytes: adopted with a NEW ReceiptID, nothing uploaded
    await W.install(); await W.openEditCoin(W.stray);
    await W.pickFile("browseEdit", W.file(W.jpegA, "IMG_0011.jpg"));
    W.uploads = [];
    await W.save("browseEdit");
    out.adopt = { uploads: W.uploads.slice(), row: W.rcRow("AY-00094") && W.rcRow("AY-00094").slice(), twoCopy: await W.fileText("CharlestonCoinExchange_2026-11-05_receipt_02.pdf") };
    return out;
  });
  ok("N6a different bytes under an existing seller+date name take _02; the other coin's file and row are untouched",
    N6.diff.uploads.join() === "CharlestonCoinExchange_2026-10-02_receipt_02.pdf" && N6.diff.row[2] === "CharlestonCoinExchange_2026-10-02_receipt_02.pdf" &&
    N6.diff.other[0] === "RC-00031" && N6.diff.other[2] === "CharlestonCoinExchange_2026-10-02_receipt.pdf", N6.diff);
  ok("N6b the identical scan another coin filed under that name attaches to its ReceiptID: nothing uploaded, no _02",
    N6.same.uploads.length === 0 && N6.same.row[0] === "RC-00031" && N6.same.row[2] === "CharlestonCoinExchange_2026-10-02_receipt.pdf" && /attached/.test(N6.same.toast), N6.same);
  ok("N6c an unclaimed file with the same bytes is reused (no upload, no _02) and gets a NEW ReceiptID",
    N6.adopt.uploads.length === 0 && N6.adopt.twoCopy === null && N6.adopt.row && N6.adopt.row[2] === "CharlestonCoinExchange_2026-11-05_receipt.pdf" &&
    /^RC-\d{5}$/.test(N6.adopt.row[0]) && !["RC-00020", "RC-00030", "RC-00031"].includes(N6.adopt.row[0]), N6.adopt);

  // ---------- N7: own PDF names, Replace on all ---------------------------
  const N7 = await page.evaluate(async () => {
    const W = __fn; const out = {};
    await W.install(); await W.openEditCoin(W.cex);
    await W.pickFile("browseEdit", new File(["PDFBYTES"], "scan0001.pdf", { type: "application/pdf" }));
    W.uploads = [];
    await W.save("browseEdit");
    out.pdf = { uploads: W.uploads.slice(), row: W.rcRow("AY-00099").slice() };
    // Replace on all N coins with a photo: named for THIS coin's seller and date
    await W.install(); await W.openEditCoin(W.fk);
    await W.pickFile("browseEdit", W.file(W.jpegB, "IMG_0012.jpg"));
    W.clickGuard("Replace on all 3 coins"); await W.sleep(40);
    const idsBefore = W.rcGrid().map(r => r[0]).join();
    W.uploads = [];
    await W.save("browseEdit");
    out.all = { uploads: W.uploads.slice(), rows: [3, 4, 5].map(n => W.rcGrid()[n - 1].slice()), oldFile: await W.fileText("old_shared.pdf"),
      idsSame: W.rcGrid().map(r => r[0]).join() === idsBefore, toast: W.toast() };
    return out;
  });
  ok("N7a a picked PDF keeps its own name even when the coin has a seller and date, and even a generic one (scan0001.pdf)",
    N7.pdf.uploads.join() === "scan0001.pdf" && N7.pdf.row[2] === "scan0001.pdf", N7.pdf);
  ok("N7b Replace on all N coins with a photo: the new file is named FindersKeepers_2026-06-27_receipt.pdf and all three rows carry it under RC-00030; no id is minted; the old file stays",
    N7.all.uploads.join() === "FindersKeepers_2026-06-27_receipt.pdf" && N7.all.rows.every(r => r[0] === "RC-00030" && r[2] === "FindersKeepers_2026-06-27_receipt.pdf") &&
    N7.all.idsSame && N7.all.oldFile === "present", N7.all);
}, module);
