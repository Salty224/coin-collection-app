// Receipts and photos alignment, Build 2: file naming for NEW receipt files,
// the INTERIM rule (Ray, 31 Oct 2026), claude/receipt-remove-and-shared-replace.
//
// RULE (Edit Coin and Edit Set only, until Batch Receipt is built). A picked PDF
// keeps its own name. A camera or gallery photo whose receipt ends up on TWO OR
// MORE coins at once ("Replace on all N coins") is named {ReceiptID}_receipt.pdf.
// Every other photo, "This coin only" on a shared receipt included, is
// {CollectionID}_receipt.pdf. Seller and purchase date play NO part in the slot
// flow (their helpers are kept, tested and unused, for Batch Receipt). Files
// already in the folder are never renamed; collisions are as before (same bytes
// = reuse / "already on file", different bytes = the next _NN). A single-coin
// receipt mints its ReceiptID inside the table lock after the upload (no early
// mint, so a failed upload leaves no gap).
//
//   SELF the shared check helper's must-fail self-check
//   N1  the pure helpers (seller cleaning, date, seller+date name, the interim
//       storedReceiptFilename, the app-made test)
//   N2  one coin, a coin WITH seller and date: {CollectionID}_receipt.pdf; the
//       seller and date, even edited before Save, change nothing
//   N3  one coin without seller or date; "This coin only" on a shared receipt
//   N4  Replace on all N coins: {ReceiptID}_receipt.pdf on every row, id kept
//   N5  a picked PDF keeps its name in every case
//   N6  re-picking what is stored stays "already on file"; collisions as before
//   N7  no early mint: a failed upload leaves no numbering gap, a competing
//       mint never repeats a number

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
    photoSingle: storedReceiptFilename("AY-00001", { sourceWasPdf: false, filename: "image.jpg" }, { seller: "Finders Keepers", purchaseDate: "2026-06-27" }),
    photoMulti: storedReceiptFilename("AY-00001", { sourceWasPdf: false, filename: "image.jpg" }, { receiptId: "RC-00012" }),
    pdfOwn: storedReceiptFilename("AY-00001", { sourceWasPdf: true, filename: "scan0001.pdf" }, { receiptId: "RC-00012" }),
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
  ok("N1e storedReceiptFilename (interim rule): a photo is {CollectionID}_receipt.pdf even when a seller and date are passed; with a ReceiptID (several coins) it is {ReceiptID}_receipt.pdf; a picked PDF keeps its own name",
    N1.photoSingle === "AY-00001_receipt.pdf" && N1.photoMulti === "RC-00012_receipt.pdf" && N1.pdfOwn === "scan0001.pdf", N1);
  ok("N1f RC-nnnnn_receipt.pdf counts as app-made (no early pdf.js load), a seller+date name does not",
    JSON.stringify(N1.appMade) === JSON.stringify([true, true, true, false, false]), N1.appMade);

  // ---------- N2: one coin, with a seller and date ----------------------
  const N2 = await page.evaluate(async () => {
    const W = __fn; await W.install(); await W.openEditCoin(W.fresh);
    const out = {};
    out.formValues = { v: document.getElementById("browseEditVendor").value, d: document.getElementById("browseEditPurchaseDate").value };
    await W.pickFile("browseEdit", W.file(W.jpegB, "IMG_0001.jpg"));
    // the seller and date are edited before Save: they must change nothing
    W.setv("browseEditVendor", "Heritage Auctions"); W.setv("browseEditPurchaseDate", "2026-09-01");
    W.events = []; W.uploads = [];
    await W.save("browseEdit");
    const row = W.rcRow("AY-00092");
    out.save = { uploads: W.uploads.slice(), row: row && row.slice(), coinRowSaved: W.events.indexOf("patch:All") !== -1, minted: pendingReceipts["AY-00092"] };
    return out;
  });
  ok("N2a the coin has a seller and a date (the test starts from real values)", N2.formValues.v === "Finders Keepers" && N2.formValues.d === "2026-07-04", N2.formValues);
  ok("N2b a photo on ONE coin is named {CollectionID}_receipt.pdf, never from the seller and date (edited or not); one upload, the row names it, a new ReceiptID",
    N2.save.uploads.join() === "AY-00092_receipt.pdf" && N2.save.row[2] === "AY-00092_receipt.pdf" && /^RC-\d{5}$/.test(N2.save.row[0]) && N2.save.coinRowSaved, N2.save);

  // ---------- N3: one coin, no seller / date; This coin only -------------
  const N3 = await page.evaluate(async () => {
    const W = __fn; const out = {};
    await W.install(); await W.openEditCoin(W.plain);
    await W.pickFile("browseEdit", W.file(W.jpegB, "IMG_0002.jpg"));
    W.uploads = [];
    await W.save("browseEdit");
    out.plain = { uploads: W.uploads.slice(), row: W.rcRow("AY-00098").slice() };
    // "This coin only" on a shared receipt: still one coin, so the coin's name, with a NEW ReceiptID
    await W.install(); await W.openEditCoin(W.fk);
    await W.pickFile("browseEdit", W.file(W.jpegB, "IMG_0003.jpg"));
    W.clickGuard("This coin only"); await W.sleep(40);
    W.uploads = [];
    await W.save("browseEdit");
    out.thisOnly = { uploads: W.uploads.slice(), row: W.rcRow("AY-00080").slice(), others: [W.rcRow("AY-00081").slice(), W.rcRow("AY-00082").slice()], oldFile: await W.fileText("old_shared.pdf") };
    return out;
  });
  ok("N3a a photo on a coin with no seller or date is {CollectionID}_receipt.pdf", N3.plain.uploads.join() === "AY-00098_receipt.pdf" && N3.plain.row[2] === "AY-00098_receipt.pdf", N3.plain);
  ok("N3b 'This coin only' on a shared receipt: {CollectionID}_receipt.pdf and a NEW ReceiptID (not RC-00030); the other coins and the old file untouched",
    N3.thisOnly.uploads.join() === "AY-00080_receipt.pdf" && N3.thisOnly.row[2] === "AY-00080_receipt.pdf" && N3.thisOnly.row[0] !== "RC-00030" && /^RC-\d{5}$/.test(N3.thisOnly.row[0]) &&
    N3.thisOnly.others.every(r => r[0] === "RC-00030" && r[2] === "old_shared.pdf") && N3.thisOnly.oldFile === "present", N3.thisOnly);

  // ---------- N4: Replace on all N coins ----------------------------------
  const N4 = await page.evaluate(async () => {
    const W = __fn; await W.install(); await W.openEditCoin(W.fk);
    await W.pickFile("browseEdit", W.file(W.jpegB, "IMG_0004.jpg"));
    W.clickGuard("Replace on all 3 coins"); await W.sleep(40);
    const idsBefore = W.rcGrid().map(r => r[0]).join();
    W.uploads = [];
    await W.save("browseEdit");
    return { uploads: W.uploads.slice(), rows: [3, 4, 5].map(n => W.rcGrid()[n - 1].slice()), oldFile: await W.fileText("old_shared.pdf"),
      idsSame: W.rcGrid().map(r => r[0]).join() === idsBefore, toast: W.toast() };
  });
  ok("N4a a photo replaced on all 3 coins is named {ReceiptID}_receipt.pdf: one upload, all three rows carry that name under RC-00030",
    N4.uploads.join() === "RC-00030_receipt.pdf" && N4.rows.every(r => r[0] === "RC-00030" && r[2] === "RC-00030_receipt.pdf"), N4);
  ok("N4b no ReceiptID is minted (the id already existed) and the old file is kept", N4.idsSame && N4.oldFile === "present" && /receipt replaced on 3 coins/.test(N4.toast), N4);

  // ---------- N5: a picked PDF keeps its name in every case ---------------
  const N5 = await page.evaluate(async () => {
    const W = __fn; const out = {};
    const pdf = () => new File(["PDFBYTES"], "scan0001.pdf", { type: "application/pdf" });
    await W.install(); await W.openEditCoin(W.cex);                   // one coin, with seller + date
    await W.pickFile("browseEdit", pdf());
    W.uploads = []; await W.save("browseEdit");
    out.single = { uploads: W.uploads.slice(), row: W.rcRow("AY-00099").slice() };
    await W.install(); await W.openEditCoin(W.fk);                    // This coin only
    await W.pickFile("browseEdit", pdf());
    W.clickGuard("This coin only"); await W.sleep(40);
    W.uploads = []; await W.save("browseEdit");
    out.thisOnly = { uploads: W.uploads.slice(), row: W.rcRow("AY-00080").slice() };
    await W.install(); await W.openEditCoin(W.fk);                    // Replace on all
    await W.pickFile("browseEdit", pdf());
    W.clickGuard("Replace on all 3 coins"); await W.sleep(40);
    W.uploads = []; await W.save("browseEdit");
    out.all = { uploads: W.uploads.slice(), rows: [3, 4, 5].map(n => W.rcGrid()[n - 1].slice()) };
    return out;
  });
  ok("N5a a picked PDF keeps its own name (even a generic one) on one coin, on 'This coin only' and on 'Replace on all'",
    N5.single.uploads.join() === "scan0001.pdf" && N5.single.row[2] === "scan0001.pdf" &&
    N5.thisOnly.uploads.join() === "scan0001.pdf" && N5.thisOnly.row[2] === "scan0001.pdf" &&
    N5.all.uploads.join() === "scan0001.pdf" && N5.all.rows.every(r => r[0] === "RC-00030" && r[2] === "scan0001.pdf"), N5);

  // ---------- N6: already on file; collisions as before --------------------
  const N6 = await page.evaluate(async () => {
    const W = __fn; const out = {};
    // (a) an old-style stored file; the same scan picked again
    await W.install(); await W.openEditCoin(W.old);
    W.rcRow("AY-00093")[3] = 46123;
    await W.pickFile("browseEdit", W.file(W.jpegA, "IMG_0005.jpg"));
    W.events = []; W.uploads = [];
    await W.save("browseEdit");
    out.old = { uploads: W.uploads.slice(), receiptPatches: W.events.filter(e => e === "patch:Receipts").length, row: W.rcRow("AY-00093").slice(), toast: W.toast() };
    // (b) a photo saved on one coin, then the same photo picked again: already on file
    await W.install(); await W.openEditCoin(W.fresh);
    await W.pickFile("browseEdit", W.file(W.jpegB, "IMG_0006.jpg"));
    await W.save("browseEdit");
    const first = W.rcRow("AY-00092").slice();
    await W.openEditCoin(W.fresh);
    await W.pickFile("browseEdit", W.file(W.jpegB, "IMG_0007.jpg"));
    W.events = []; W.uploads = [];
    await W.save("browseEdit");
    out.again = { first, row: W.rcRow("AY-00092").slice(), uploads: W.uploads.slice(), toast: W.toast(), rows: W.rcRows("AY-00092").length };
    // (c) a DIFFERENT photo on that coin takes _02 (as before), the first file untouched
    await W.openEditCoin(W.fresh);
    await W.pickFile("browseEdit", W.file(W.jpegA, "IMG_0008.jpg"));
    W.uploads = [];
    await W.save("browseEdit");
    out.diff = { uploads: W.uploads.slice(), row: W.rcRow("AY-00092").slice(), firstFile: await W.fileText("AY-00092_receipt.pdf") };
    // (d) Replace on all, then the same photo again on all three: already on file
    await W.install(); await W.openEditCoin(W.fk);
    await W.pickFile("browseEdit", W.file(W.jpegB, "IMG_0009.jpg"));
    W.clickGuard("Replace on all 3 coins"); await W.sleep(40);
    await W.save("browseEdit");
    await W.openEditCoin(W.fk);
    await W.pickFile("browseEdit", W.file(W.jpegB, "IMG_0010.jpg"));
    W.clickGuard("Replace on all 3 coins"); await W.sleep(40);
    W.events = []; W.uploads = [];
    await W.save("browseEdit");
    out.allAgain = { uploads: W.uploads.slice(), receiptPatches: W.events.filter(e => e === "patch:Receipts").length, toast: W.toast() };
    // (e) the stored file is RC-00030_receipt.pdf (a multi-coin name); the same photo picked as "This coin only":
    //     the candidate would be AY-00080_receipt.pdf, but this coin's OWN stored file already holds those bytes
    await W.openEditCoin(W.fk);
    await W.pickFile("browseEdit", W.file(W.jpegB, "IMG_0011.jpg"));
    W.clickGuard("This coin only"); await W.sleep(40);
    W.events = []; W.uploads = [];
    await W.save("browseEdit");
    out.ownName = { uploads: W.uploads.slice(), receiptPatches: W.events.filter(e => e === "patch:Receipts").length, row: W.rcRow("AY-00080").slice(), toast: W.toast() };
    // (f) a picked PDF with another name but the same bytes as the stored file
    await W.install(); await W.openEditCoin(W.fk);
    await W.pickFile("browseEdit", new File(["OLDSH"], "renamed_copy.pdf", { type: "application/pdf" }));
    W.clickGuard("This coin only"); await W.sleep(40);
    W.events = []; W.uploads = [];
    await W.save("browseEdit");
    out.pdfCopy = { uploads: W.uploads.slice(), receiptPatches: W.events.filter(e => e === "patch:Receipts").length, row: W.rcRow("AY-00080").slice(), toast: W.toast() };
    return out;
  });
  ok("N6a re-picking the same scan on a coin whose stored file has an OLD name stays 'already on file': nothing uploaded, no Receipts write, DateAdded kept, name kept",
    N6.old.uploads.length === 0 && N6.old.receiptPatches === 0 && N6.old.row[3] === 46123 && N6.old.row[2] === "AY-00093_receipt.pdf" && /already on file/.test(N6.old.toast), N6.old);
  ok("N6b a photo saved on one coin and picked again stays 'already on file': nothing uploaded, still one row, the same file",
    N6.again.uploads.length === 0 && /already on file/.test(N6.again.toast) && N6.again.rows === 1 && N6.again.row[2] === N6.again.first[2] && N6.again.first[2] === "AY-00092_receipt.pdf", N6.again);
  ok("N6c a DIFFERENT photo on that coin takes _02 as before; the first file is untouched",
    N6.diff.uploads.join() === "AY-00092_receipt_02.pdf" && N6.diff.row[2] === "AY-00092_receipt_02.pdf" && N6.diff.firstFile === "present", N6.diff);
  ok("N6d the same photo again after 'Replace on all 3 coins' stays 'already on file': nothing uploaded, no Receipts write",
    N6.allAgain.uploads.length === 0 && N6.allAgain.receiptPatches === 0 && /already on file/.test(N6.allAgain.toast), N6.allAgain);

  ok("N6e a stored file with a DIFFERENT name (RC-00030_receipt.pdf) holding the same bytes: the same photo as 'This coin only' stays 'already on file': no upload, no Receipts write, the row keeps its file and id",
    N6.ownName.uploads.length === 0 && N6.ownName.receiptPatches === 0 && N6.ownName.row[2] === "RC-00030_receipt.pdf" && N6.ownName.row[0] === "RC-00030" && /already on file/.test(N6.ownName.toast), N6.ownName);
  ok("N6f a picked PDF with another name but the same bytes as the stored file: 'already on file', nothing uploaded, the stored name kept",
    N6.pdfCopy.uploads.length === 0 && N6.pdfCopy.receiptPatches === 0 && N6.pdfCopy.row[2] === "old_shared.pdf" && /already on file/.test(N6.pdfCopy.toast), N6.pdfCopy);

  // ---------- N7: no early mint --------------------------------------------
  const N7 = await page.evaluate(async () => {
    const W = __fn; await W.install(); await W.openEditCoin(W.plain);
    await W.pickFile("browseEdit", W.file(W.jpegB, "IMG_0011.jpg"));
    W.failUploadOnce = true; W.uploads = [];
    await W.save("browseEdit");
    const afterFail = { pending: pendingReceiptCount("AY-00098"), minted: pendingReceipts["AY-00098"] && pendingReceipts["AY-00098"].mintedReceiptId, row: W.rcRow("AY-00098") };
    // a competing write mints meanwhile: the first free number, because the failed Save took none
    const other = await commitBinderReceipt("AY-00070");
    await W.save("browseEdit");
    const row = W.rcRow("AY-00098");
    const ids = W.rcGrid().slice(1).map(r => r[0]).filter(Boolean);
    return { afterFail, other: other.receiptId, row: row && row.slice(), uploads: W.uploads.slice(),
      otherCount: ids.filter(v => v === other.receiptId).length, rowCount: ids.filter(v => row && v === row[0]).length };
  });
  ok("N7a a failed upload keeps the pick, writes no row and reserves NO ReceiptID", N7.afterFail.pending === 1 && !N7.afterFail.minted && !N7.afterFail.row, N7.afterFail);
  ok("N7b a competing mint meanwhile gets the first free number (RC-00032: the failed Save took none, so no gap), and the retry gets the next one: no number is used twice",
    N7.other === "RC-00032" && N7.row && N7.row[0] === "RC-00033" && N7.row[2] === "AY-00098_receipt.pdf" && N7.otherCount === 1 && N7.rowCount === 1 && N7.uploads.join() === "AY-00098_receipt.pdf", N7);
}, module);
