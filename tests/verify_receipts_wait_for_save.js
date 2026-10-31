// Receipts wait for Save (task x, Oct 2026, claude/receipts-wait-for-save).
//
// WHY. A receipt picked on Edit Coin or Edit Set used to upload and write its
// Receipts row the moment it was picked, so the leave guard and the dimmed
// Save never knew about it. It is now held in memory like a photo and written
// only by Save Changes (the last step of savePhotosAndLabels); Discard and
// leaving drop it; the guard and the dimmed Save count it ("1 receipt").
// There is NO way to remove a stored receipt here (Ray, 31 Oct 2026): the ✕
// appears only on a pending pick.
//
//   SELF the shared check helper's must-fail self-check
//   A   a pick on Edit Coin: zero Graph calls, "Not saved yet", the ✕, Save
//       enabled, the guard counts "1 receipt"; a redraw / visibilitychange /
//       pagehide writes nothing; a JPEG pick is held too
//   B   Save: receipt-only (coin row untouched), order with fields and a
//       photo (receipt LAST), the same document already on file (no upload,
//       no row rewrite, DateAdded kept), attach to another coin's file, a
//       shared ReceiptID gets a fresh one, a coin with no receipt, a taken
//       name takes _02 and the old file stays
//   C   Discard via Back / Close Drawer; Keep editing; reopening; opening
//       another record drops the first's pick
//   D   change then undo ends clean: pick over stored then ✕ / Put it back,
//       Cancel, pick A pick B ✕ (back to the stored one, not A), nothing
//       stored then ✕; no ✕ and no remove for a stored receipt
//   F   partial failure: upload fails and stays pending; the next Save
//       works; the file landed but the row write failed -> the retry uploads
//       NO second copy; a failed photo removal does not stop the receipt; a
//       field conflict writes no receipt; 2+ Receipts rows refuses, naming
//       the coin
//   G   Edit Set: pick, Save (with and without a field change), Discard, undo
//   H   each refreshEditSaveState() call this task added, in isolation
//   I   the Receipts row wins over All.Receipt whenever it exists (slot and
//       detail); since the receipts and photos alignment (Build 1) a coin
//       with only All.Receipt shows NO receipt (the column is not read), a
//       pick creates a Receipts row that then shows; "Binder" in All.Receipt
//       is not read, a Binder Receipts row is the paper receipt
//   J   Add Coin's receipt slot is untouched; write layer off -> nothing held
//   M   layout at phone and tablet widths

const { defineSuite } = require("./harness");

const RECEIPT_HEADERS = ["ReceiptID", "CollectionID", "Filename", "DateAdded"];
const PHOTO_HEADERS = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "", "OriginalFilename"];
const ALL_HEADERS = ["CollectionID", "Year", "MintMark", "Denomination", "Variety", "Description",
  "Value", "Cost", "Shipping", "Seller_Link", "PurchaseDate", "StorageLocation", "Container",
  "Grade", "GradeSource", "Designation", "SerNo", "CACBean", "Remarks", "Reviewed", "LastModified",
  "Finish", "CoinID", "Status", "SaleDate", "SalePrice", "Buyer", "Platform"];

async function setup(page) {
  await page.evaluate(({ RECEIPT_HEADERS, PHOTO_HEADERS, ALL_HEADERS }) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
    window.__rs = {
      sleep, events: [], uploads: [], failUploadOnce: false, failPatchSheet: null, failPatchOnce: false, mock: null,
      coin: { id: "AY-00099", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime", receiptFile: "AY-00099_receipt.pdf" },
      shared: { id: "AY-00095", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime", receiptFile: "shared.pdf" },
      two: { id: "AY-00097", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime", receiptFile: "two_a.pdf" },
      legacy: { id: "AY-00098", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime", receiptFile: "legacy98.pdf" },
      binder: { id: "AY-00093", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime", receiptFile: "Binder" },
      none: { id: "AY-00094", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" },
      set: { id: "AY-00090", name: "1957 Proof Set", denom: "Multiple", year: 1957, mint: "", category: "Proof Set" },
      async install() {
        const self = this;
        const ov0 = document.getElementById("writeGuardOverlay"); if (ov0) ov0.classList.add("hidden");
        discardUnsavedPhotoEdits(); browseEditTouchedFields.clear();
        try { resetAddCoinForm(); clearCoinDraftEditContext(); } catch (e) { /* not ready */ }
        Object.keys(pendingReceipts).forEach(k => delete pendingReceipts[k]);
        navigateNow("dashboard");
        const allRow = (id, denom) => [id, 1916, "D", denom || "10C", "", "Mercury Dime", 40, 30, 0, "", null,
          "Safe", "", "VF-20", "Owner", "", "", "", "", "", null,
          "Business Strike", "C-1916-D-10C-01", "Owned", null, null, "", ""];
        const blank = n => Array.from({ length: n }, () => new Array(9).fill(""));
        const mock = createMockGraphClient({ sheets: {
          All: [ALL_HEADERS, allRow("AY-00099"), allRow("AY-00095"), allRow("AY-00097"), allRow("AY-00098"),
                allRow("AY-00094"), allRow("AY-00093"), allRow("AY-00090", "Multiple")],
          Receipts: [RECEIPT_HEADERS,
            ["RC-00001", "AY-00099", "AY-00099_receipt.pdf", 46000],
            ["RC-00002", "AY-00095", "shared.pdf", 46000],
            ["RC-00002", "AY-00051", "shared.pdf", 46000],
            ["RC-00007", "AY-00097", "two_a.pdf", 46000],
            ["RC-00008", "AY-00097", "two_b.pdf", 46001],
            ["", "", "", ""], ["", "", "", ""], ["", "", "", ""], ["", "", "", ""]],
          Photos: [PHOTO_HEADERS,
            ["PH-00001", "AY-00099", "Obverse", "", "AY-00099_obverse_cropped.jpg", "", 46000, "keep-me", ""],
            ...blank(4)]
        } });
        const rp = writePaths().coinReceipts + "/";
        await mock.uploadFile(rp + "AY-00099_receipt.pdf", new Blob(["OLD99"]));
        await mock.uploadFile(rp + "shared.pdf", new Blob(["SHARED"]));
        await mock.uploadFile(rp + "two_a.pdf", new Blob(["TWOA"]));
        await mock.uploadFile(rp + "two_b.pdf", new Blob(["TWOB"]));
        await mock.uploadFile(rp + "legacy98.pdf", new Blob(["LEGACY98"]));
        this.mock = mock;
        this.events = []; this.uploads = []; this.failUploadOnce = false; this.failPatchSheet = null; this.failPatchOnce = false;
        __setGraphClientForTest(new Proxy(mock, { get(t, k) {
          const v = t[k];
          if (typeof v !== "function") return v;
          return async (...a) => {
            if (k === "uploadFile") {
              const name = String(a[0]).split("/").pop();
              if (self.failUploadOnce) { self.failUploadOnce = false; throw new Error("offline"); }
              self.uploads.push(name); self.events.push("upload:" + name);
            }
            if (k === "patchWorkbookRanges") {
              if (self.failPatchSheet && a[1] === self.failPatchSheet) {
                if (self.failPatchOnce) self.failPatchSheet = null;
                throw new Error("workbook busy");
              }
              self.events.push("patch:" + a[1]);
            }
            return v.apply(t, a);
          };
        } }));
        __resetSheetHeaderMapsForTest(); __resetAllHeaderMapForTest(); __resetMintedIdsForTest();
        __setAddCoinWriteEnabledForTest(true);
        __setBrowseEditWriteEnabledForTest(true);
        __setLiveCoinsForTest([this.coin, this.shared, this.two, this.legacy, this.binder, this.none, this.set]);
        __setStoredReceiptsForTest({
          "AY-00099": { receiptId: "RC-00001", filename: "AY-00099_receipt.pdf" },
          "AY-00095": { receiptId: "RC-00002", filename: "shared.pdf" },
          "AY-00051": { receiptId: "RC-00002", filename: "shared.pdf" },
          "AY-00097": { receiptId: "RC-00008", filename: "two_b.pdf" }
        });
        __setStoredPhotosForTest({
          "AY-00099": [{ photoId: "PH-00001", photoType: "Obverse", galleryType: "obverse", subGroupId: "", filename: "AY-00099_obverse_cropped.jpg", originalFilename: "", label: "" }]
        });
        __setCoinPhotoCacheForTest("AY-00099_obverse_cropped.jpg", URL.createObjectURL(new Blob([new Uint8Array([1])], { type: "image/jpeg" })));
        delete galleryStore["AY-00099"];
        closeImageSourceChooser();
        const ov = document.getElementById("writeGuardOverlay"); if (ov) ov.classList.add("hidden");
        this.clearToast();
        this.events = []; this.uploads = [];
      },
      rcGrid() { return this.mock._grids.Receipts; },
      rcRows(id) { return this.rcGrid().slice(1).filter(r => r[1] === id); },
      rcRow(id) { return this.rcRows(id)[0] || null; },
      rcPatches() { return this.events.filter(e => e === "patch:Receipts").length; },
      allPatches() { return this.events.filter(e => e === "patch:All").length; },
      async fileText(name) {
        const b = await this.mock.getFileBytes(writePaths().coinReceipts + "/" + name);
        return b ? await b.text() : null;
      },
      async openEditCoin(coin) {
        coin = coin || this.coin;
        navigate("browse"); showBrowseDetail(coin); showBrowseEditView(coin);
        await loadBrowseEditSnapshot(coin);
        await sleep(120);
        ["editCoinPhotosHeader", "browseEditReceiptAccordionHeader"].forEach(id => {
          const h = document.getElementById(id); if (h.getAttribute("aria-expanded") !== "true") h.click();
        });
        const host = document.getElementById("browseEditPhotosSections");
        [...host.querySelectorAll(".accordion-header")].forEach(h => { if (h.getAttribute("aria-expanded") !== "true") h.click(); });
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
      async pick(prefix, name, text, type) {
        const input = document.getElementById(prefix + "ReceiptLibraryInput");
        const dt = new DataTransfer();
        dt.items.add(new File([text], name, { type: type || "application/pdf" }));
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        await sleep(120);
      },
      async jpeg() {
        const c = document.createElement("canvas"); c.width = 200; c.height = 300;
        const x = c.getContext("2d"); x.fillStyle = "#c63"; x.fillRect(0, 0, 200, 300);
        const b = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
        return new File([b], "photo.jpg", { type: "image/jpeg" });
      },
      async pickFile(prefix, file) {
        const input = document.getElementById(prefix + "ReceiptLibraryInput");
        const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        await sleep(300);
      },
      slot(prefix) {
        const stored = document.getElementById(prefix + "ReceiptStored");
        const rm = document.getElementById(prefix + "ReceiptRemoveBtn");
        const preview = document.getElementById(prefix + "ReceiptPreview");
        const box = preview.closest(".photo-box");
        const note = box.querySelector(".receipt-upload-state");
        const btn = stored.querySelector(".receipt-stored-btn");
        return {
          stored: stored.textContent, storedBtn: btn ? btn.textContent : null, storedMuted: stored.classList.contains("is-replaced"),
          removeShown: rm.style.display !== "none", status: note && note.style.display !== "none" ? note.textContent : "",
          statusFailed: !!(note && note.classList.contains("failed")),
          previewShown: preview.style.display === "block", box
        };
      },
      saveBtn(prefix) { return document.getElementById(prefix === "editSet" ? "browseEditSetSaveBtn" : "browseEditSaveBtn"); },
      dim(prefix) { const b = this.saveBtn(prefix); return { clean: b.classList.contains("is-clean"), disabled: b.disabled }; },
      async save(prefix) { this.saveBtn(prefix).click(); await sleep(60); await this.waitFor(() => !editSaveInFlight, 4000); await sleep(200); },
      async waitFor(fn, ms) { const end = Date.now() + (ms || 3000); while (Date.now() < end) { if (fn()) return true; await sleep(30); } return !!fn(); },
      setv(id, v) { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); },
      toast() { const t = document.getElementById("toast"); return t.classList.contains("show") ? t.textContent : ""; },
      clearToast() { const t = document.getElementById("toast"); t.classList.remove("show"); t.textContent = ""; },
      guardOpen() { const o = document.getElementById("writeGuardOverlay"); return !!o && !o.classList.contains("hidden"); },
      guardText() { return (document.getElementById("writeGuardTitle").textContent || "") + " | " + (document.getElementById("writeGuardBody").textContent || ""); },
      clickGuard(label) {
        const b = [...document.querySelectorAll("#writeGuardBtns button")].find(x => x.textContent === label);
        if (!b) return false; b.click(); return true;
      },
      editOpen() { return document.getElementById("browseEditView").style.display !== "none"; },
      editSetOpen() { return document.getElementById("browseEditSetView").style.display !== "none"; },
      detailReceipt() {
        const el = document.getElementById("detailReceiptLink");
        return el ? el.dataset.receipt : null;
      }
    };
  }, { RECEIPT_HEADERS, PHOTO_HEADERS, ALL_HEADERS });
}

// A claimed row is written as a values patch then a date-format patch: two
// events for one row. Collapse repeats so the ORDER is what is asserted.
const dedupe = (events) => events.filter((e, i) => e !== events[i - 1]).join(",");

module.exports = defineSuite("receipts-wait-for-save", async ({ check, selfCheck, openApp, PHONE, TABLET }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);
  await setup(page);

  // ---------- A. a pick on Edit Coin is held ------------------------------
  const A = await page.evaluate(async () => {
    const W = __rs; await W.install(); await W.openEditCoin();
    const out = {};
    out.open = W.slot("browseEdit");
    out.openDim = W.dim("browseEdit");
    out.openUnsaved = unsavedEditsForView();
    W.events = [];
    await W.pick("browseEdit", "invoice99.pdf", "NEW99");
    out.pick = W.slot("browseEdit");
    out.events = W.events.slice();
    out.dim = W.dim("browseEdit");
    out.hint = document.getElementById("browseEditSaveHint").classList.contains("show");
    const u = unsavedEditsForView();
    out.counts = u && u.counts; out.text = u && u.text;
    out.rowBefore = W.rcRow("AY-00099").slice();
    out.pendingCount = pendingReceiptCount("AY-00099");
    // a redraw, visibilitychange, pagehide
    renderManagePhotosInto("browseEditPhotosSections", buildManagePhotosCtx(W.coin));
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pagehide"));
    await W.sleep(150);
    out.eventsAfterRedraw = W.events.slice();
    out.stillPending = pendingReceiptCount("AY-00099");
    // a JPEG pick
    W.events = [];
    await W.pickFile("browseEdit", await W.jpeg());
    out.jpeg = W.slot("browseEdit");
    out.jpegEvents = W.events.slice();
    out.jpegPending = pendingReceipts["AY-00099"] && pendingReceipts["AY-00099"].pdf;
    return out;
  });
  ok("A1 opening Edit Coin shows the receipt on file (tap-able name), not 'No receipt on file'", A.open.storedBtn === "AY-00099_receipt.pdf" && /On file:/.test(A.open.stored), A.open);
  ok("A2 nothing picked: no status, Save dimmed, nothing unsaved (the ✕ on a stored receipt is the Build 2 removal)", A.open.removeShown && A.open.status === "" && A.openDim.clean && A.openDim.disabled && A.openUnsaved === null, { o: A.open, d: A.openDim });
  ok("A3 a pick makes ZERO Graph writes (no upload, no Receipts patch)", A.events.length === 0, A.events);
  ok("A4 the pick says 'Not saved yet' and that it replaces the receipt on file", /Not saved yet/.test(A.pick.status) && /replaces/i.test(A.pick.status) && !A.pick.statusFailed, A.pick);
  ok("A5 the ✕ shows on the pick and the stored line is muted ('replaced when you save')", A.pick.removeShown && A.pick.storedMuted && /replaced when you save/.test(A.pick.stored), A.pick);
  ok("A6 Save Changes is enabled and the 'No changes' hint is hidden", !A.dim.clean && !A.dim.disabled && !A.hint, { d: A.dim, h: A.hint });
  ok("A7 the leave guard counts '1 receipt'", A.counts && A.counts.receipts === 1 && A.text === "1 receipt", { c: A.counts, t: A.text });
  ok("A8 the Receipts row is untouched by the pick", A.rowBefore[2] === "AY-00099_receipt.pdf" && A.rowBefore[0] === "RC-00001", A.rowBefore);
  ok("A9 a redraw, visibilitychange and pagehide still write nothing and the pick survives", A.eventsAfterRedraw.length === 0 && A.stillPending === 1, { e: A.eventsAfterRedraw, p: A.stillPending });
  ok("A10 a JPEG pick is held too (wrapped to a PDF, preview shown), zero writes", A.jpeg.previewShown && A.jpegEvents.length === 0 && A.jpegPending === false && /Not saved yet/.test(A.jpeg.status), { j: A.jpeg, e: A.jpegEvents, p: A.jpegPending });

  // ---------- B. Save writes it -------------------------------------------
  // B1: receipt only.
  const B1 = await page.evaluate(async () => {
    const W = __rs; await W.install(); await W.openEditCoin();
    await W.pick("browseEdit", "invoice99.pdf", "NEW99");
    W.events = []; W.uploads = [];
    const before = W.rcGrid().length;
    await W.save("browseEdit");
    const row = W.rcRow("AY-00099");
    return {
      events: W.events.slice(), uploads: W.uploads.slice(), row: row && row.slice(), rows: W.rcRows("AY-00099").length,
      grid: before === W.rcGrid().length, toast: W.toast(), editOpen: W.editOpen(),
      oldFile: await W.fileText("AY-00099_receipt.pdf"), newFile: await W.fileText("invoice99.pdf"),
      index: LIVE_RECEIPTS["AY-00099"], detail: W.detailReceipt(), pending: pendingReceiptCount("AY-00099"),
      allRowLast: W.mock._grids.All[1][ALL_HEADERS_IDX("LastModified")]
    };
    function ALL_HEADERS_IDX(n) { return ["CollectionID", "Year", "MintMark", "Denomination", "Variety", "Description", "Value", "Cost", "Shipping", "Seller_Link", "PurchaseDate", "StorageLocation", "Container", "Grade", "GradeSource", "Designation", "SerNo", "CACBean", "Remarks", "Reviewed", "LastModified"].indexOf(n); }
  });
  ok("B1a Save uploads the new file once and patches only the Receipts row (no All row, no Photos)", B1.uploads.length === 1 && B1.uploads[0] === "invoice99.pdf" && dedupe(B1.events) === "upload:invoice99.pdf,patch:Receipts", { u: B1.uploads, e: B1.events });
  ok("B1b the coin row is NOT written: no LastModified stamp", B1.allRowLast === null || B1.allRowLast === "" , B1.allRowLast);
  ok("B1c the same row now names the new file and keeps its ReceiptID", B1.row[0] === "RC-00001" && B1.row[2] === "invoice99.pdf" && B1.rows === 1, B1.row);
  ok("B1d the old file is untouched and the new one holds the new bytes", B1.oldFile === "OLD99" && B1.newFile === "NEW99", { o: B1.oldFile, n: B1.newFile });
  ok("B1e toast 'Saved AY-00099 — receipt replaced.' and the form closes to the detail page", B1.toast === "Saved AY-00099 — receipt replaced." && !B1.editOpen, { t: B1.toast, e: B1.editOpen });
  ok("B1f the session index and the detail page show the new receipt at once", B1.index && B1.index.filename === "invoice99.pdf" && B1.detail === "invoice99.pdf", { i: B1.index, d: B1.detail });
  ok("B1g nothing left pending", B1.pending === 0, B1.pending);

  // B2: order with fields and a photo.
  const B2 = await page.evaluate(async () => {
    const W = __rs; await W.install(); await W.openEditCoin();
    W.setv("browseEditNotes", "a note"); // a field
    const e = galleryFor("AY-00099").find(x => x.type === "obverse");
    e.pendingRemove = true; refreshManagePhotosSaveLabelsBtn(); // a saved photo taken off (the shortcut for the ✕)
    await W.pick("browseEdit", "invoice99.pdf", "NEW99");
    W.events = [];
    await W.save("browseEdit");
    const ev = W.events.slice();
    const first = n => ev.indexOf(n);
    return { ev, toast: W.toast(), allFirst: first("patch:All"), photosFirst: first("patch:Photos"), upload: first("upload:invoice99.pdf"), rc: first("patch:Receipts") };
  });
  ok("B2a all three were written in one Save", B2.allFirst >= 0 && B2.photosFirst >= 0 && B2.upload >= 0 && B2.rc >= 0, B2.ev);
  ok("B2b order: coin row, then the photo, then the receipt upload, then the Receipts row (receipt LAST)", B2.allFirst < B2.photosFirst && B2.photosFirst < B2.upload && B2.upload < B2.rc, B2.ev);
  ok("B2c the toast counts the field, the photo and the receipt", /1 field/.test(B2.toast) && /1 photo removed/.test(B2.toast) && /receipt replaced/.test(B2.toast), B2.toast);

  // B3: the same document already on file -> no upload, no row rewrite.
  const B3 = await page.evaluate(async () => {
    const W = __rs; await W.install(); await W.openEditCoin();
    // give the row a distinctive DateAdded so a rewrite would show
    W.rcRow("AY-00099")[3] = 46123;
    await W.pick("browseEdit", "AY-00099_receipt.pdf", "OLD99");
    const pending = pendingReceiptCount("AY-00099");
    const dim = W.dim("browseEdit");
    W.events = [];
    await W.save("browseEdit");
    return { pending, dim, events: W.events.slice(), date: W.rcRow("AY-00099")[3], toast: W.toast(), editOpen: W.editOpen(), after: pendingReceiptCount("AY-00099") };
  });
  ok("B3a the identical document still counts as a pick (Save enabled)", B3.pending === 1 && !B3.dim.disabled, B3);
  ok("B3b Save uploads nothing and does NOT rewrite the row: DateAdded unchanged", B3.events.length === 0 && B3.date === 46123, { e: B3.events, d: B3.date });
  ok("B3c it says so and closes; nothing left pending", /already on file/.test(B3.toast) && !B3.editOpen && B3.after === 0, B3);

  // B4: a shared ReceiptID -> this coin gets a fresh id; the other coin untouched.
  const B4 = await page.evaluate(async () => {
    const W = __rs; await W.install(); await W.openEditCoin(W.shared);
    await W.pick("browseEdit", "mine95.pdf", "MINE95");
    await W.save("browseEdit");
    return { mine: W.rcRow("AY-00095"), other: W.rcRow("AY-00051"), shared: await W.fileText("shared.pdf"), toast: W.toast() };
  });
  ok("B4a this coin gets a FRESH ReceiptID on its new file", B4.mine[0] !== "RC-00002" && /^RC-\d{5}$/.test(B4.mine[0]) && B4.mine[2] === "mine95.pdf", B4.mine);
  ok("B4b the other coin's row and the shared file are untouched", B4.other[0] === "RC-00002" && B4.other[2] === "shared.pdf" && B4.shared === "SHARED", { o: B4.other, s: B4.shared });

  // B5: attach to the document another coin already has.
  const B5 = await page.evaluate(async () => {
    const W = __rs; await W.install(); await W.openEditCoin(W.coin);
    await W.pick("browseEdit", "shared.pdf", "SHARED");
    W.events = [];
    await W.save("browseEdit");
    return { events: W.events.slice(), row: W.rcRow("AY-00099"), toast: W.toast(), uploads: W.uploads.slice() };
  });
  ok("B5a the same bytes as another coin's file: NO upload, this coin's row points at it with that ReceiptID", B5.uploads.length === 0 && B5.row[0] === "RC-00002" && B5.row[2] === "shared.pdf", B5);
  ok("B5b the toast says it was attached", /receipt attached \(RC-00002\)/.test(B5.toast), B5.toast);

  // B6: a coin with no receipt at all -> a new row in the first blank row.
  const B6 = await page.evaluate(async () => {
    const W = __rs; await W.install(); await W.openEditCoin(W.none);
    const s0 = W.slot("browseEdit");
    await W.pick("browseEdit", "new94.pdf", "NEW94");
    const s1 = W.slot("browseEdit");
    const firstBlank = W.rcGrid().findIndex((r, i) => i > 0 && !r[0]);
    await W.save("browseEdit");
    const idx = W.rcGrid().findIndex(r => r[1] === "AY-00094");
    return { s0, s1, firstBlank, idx, row: W.rcGrid()[idx], toast: W.toast(), detail: W.detailReceipt() };
  });
  ok("B6a a coin with no receipt shows 'No receipt on file'; the pick says nothing about replacing", B6.s0.stored === "No receipt on file" && !/replaces/i.test(B6.s1.status), { s0: B6.s0.stored, s1: B6.s1.status });
  ok("B6b Save claims the FIRST blank row (never appends past the blanks)", B6.idx === B6.firstBlank && B6.row[2] === "new94.pdf", { i: B6.idx, f: B6.firstBlank, r: B6.row });
  ok("B6c toast 'receipt added' and the detail page shows it", B6.toast === "Saved AY-00094 — receipt added." && B6.detail === "new94.pdf", { t: B6.toast, d: B6.detail });

  // B7: a taken name with different bytes takes _02; the old file stays.
  const B7 = await page.evaluate(async () => {
    const W = __rs; await W.install(); await W.openEditCoin();
    await W.pick("browseEdit", "AY-00099_receipt.pdf", "DIFFERENT");
    await W.save("browseEdit");
    return { row: W.rcRow("AY-00099"), old: await W.fileText("AY-00099_receipt.pdf"), fresh: await W.fileText("AY-00099_receipt_02.pdf") };
  });
  ok("B7 a re-photographed {ID}_receipt.pdf takes a free name; the old file keeps its bytes", B7.row[2] === "AY-00099_receipt_02.pdf" && B7.old === "OLD99" && B7.fresh === "DIFFERENT", B7);

  // ---------- C. Discard ---------------------------------------------------
  const C = await page.evaluate(async () => {
    const W = __rs; await W.install(); await W.openEditCoin();
    await W.pick("browseEdit", "invoice99.pdf", "NEW99");
    W.events = [];
    const out = {};
    // Back: dialog counts the receipt; Keep editing keeps it
    leaveBrowseEditGuarded();
    await W.sleep(50);
    out.guardOpen = W.guardOpen(); out.guardText = W.guardText();
    W.clickGuard("Keep editing"); await W.sleep(50);
    out.keptPending = pendingReceiptCount("AY-00099"); out.keptOpen = W.editOpen();
    // Back again -> Discard
    leaveBrowseEditGuarded(); await W.sleep(50);
    W.clickGuard("Discard"); await W.sleep(100);
    out.afterDiscardEvents = W.events.slice();
    out.pending = pendingReceiptCount("AY-00099");
    out.left = !W.editOpen();
    // reopen: clean, the stored receipt again
    await W.openEditCoin();
    out.reopen = W.slot("browseEdit"); out.reopenDim = W.dim("browseEdit");
    // Close Drawer / navigate asks the same way
    await W.pick("browseEdit", "invoice99.pdf", "NEW99");
    const left = navigate("dashboard");
    await W.sleep(50);
    out.navAsked = left === false && W.guardOpen() && /1 receipt/.test(W.guardText());
    W.clickGuard("Discard"); await W.sleep(100);
    out.navLeft = document.querySelector(".view.active").id; out.navPending = pendingReceiptCount("AY-00099");
    // opening another record drops the first one's pick (no guard in between)
    await W.openEditCoin();
    await W.pick("browseEdit", "invoice99.pdf", "NEW99");
    showBrowseEditView(W.shared); await W.sleep(120);
    out.otherSlot = W.slot("browseEdit");
    showBrowseEditView(W.coin); await W.sleep(120);
    out.firstAgain = W.slot("browseEdit"); out.firstPending = pendingReceiptCount("AY-00099");
    return out;
  });
  ok("C1 Back with a pending receipt asks, and the dialog counts '1 receipt'", C.guardOpen && /Discard unsaved edits/.test(C.guardText) && /1 receipt/.test(C.guardText), C.guardText);
  ok("C2 Keep editing keeps the form and the pick", C.keptOpen && C.keptPending === 1, { o: C.keptOpen, p: C.keptPending });
  ok("C3 Discard leaves, drops the pick and writes nothing", C.left && C.pending === 0 && C.afterDiscardEvents.length === 0, { l: C.left, p: C.pending, e: C.afterDiscardEvents });
  ok("C4 reopening shows the receipt on file again, no status, Save dimmed", C.reopen.storedBtn === "AY-00099_receipt.pdf" && C.reopen.status === "" && C.reopenDim.disabled, { s: C.reopen, d: C.reopenDim });
  ok("C5 Close Drawer / navigate asks too; Discard drops the pick", C.navAsked && C.navPending === 0, { a: C.navAsked, p: C.navPending, v: C.navLeft });
  ok("C6 opening another record drops the first one's pick; reopening it is clean", C.otherSlot.storedBtn === "shared.pdf" && C.otherSlot.status === "" && C.firstPending === 0 && C.firstAgain.status === "" , { o: C.otherSlot, f: C.firstAgain, p: C.firstPending });

  // ---------- D. change then undo ends clean -------------------------------
  const D = await page.evaluate(async () => {
    const W = __rs; await W.install(); await W.openEditCoin();
    const out = {};
    out.removeHiddenWithStored = !W.slot("browseEdit").removeShown;
    await W.pick("browseEdit", "invoice99.pdf", "NEW99");
    document.getElementById("browseEditReceiptRemoveBtn").click(); await W.sleep(50);
    out.undoDialog = W.guardOpen() ? W.guardText() : null;
    W.clickGuard("Cancel"); await W.sleep(30);
    out.cancelKept = pendingReceiptCount("AY-00099");
    document.getElementById("browseEditReceiptRemoveBtn").click(); await W.sleep(50);
    W.clickGuard("Put it back"); await W.sleep(60);
    out.slot = W.slot("browseEdit"); out.dim = W.dim("browseEdit");
    out.unsaved = unsavedEditsForView(); out.pending = pendingReceiptCount("AY-00099");
    W.events = [];
    document.getElementById("browseEditSaveBtn").click(); await W.sleep(80);
    out.cleanToast = W.toast(); out.cleanEvents = W.events.slice();
    // leaving is silent
    out.leftAtOnce = navigate("dashboard") === true && !W.guardOpen();
    // pick A, pick B, ✕ -> the STORED one is back, not A
    await W.openEditCoin();
    await W.pick("browseEdit", "a99.pdf", "AAA");
    await W.pick("browseEdit", "b99.pdf", "BBB");
    out.twoPicks = { name: pendingReceipts["AY-00099"].prepared.filename, replaces: pendingReceipts["AY-00099"].replaces && pendingReceipts["AY-00099"].replaces.filename };
    document.getElementById("browseEditReceiptRemoveBtn").click(); await W.sleep(50);
    W.clickGuard("Put it back"); await W.sleep(60);
    out.afterTwo = { pending: pendingReceiptCount("AY-00099"), slot: W.slot("browseEdit"), dim: W.dim("browseEdit") };
    navigateNow("dashboard");
    // nothing stored: pick then ✕ drops it
    await W.openEditCoin(W.none);
    await W.pick("browseEdit", "n94.pdf", "N94");
    document.getElementById("browseEditReceiptRemoveBtn").click(); await W.sleep(50);
    out.dropDialog = W.guardOpen() ? W.guardText() : null;
    W.clickGuard("Remove"); await W.sleep(60);
    out.dropped = { pending: pendingReceiptCount("AY-00094"), slot: W.slot("browseEdit"), dim: W.dim("browseEdit"), unsaved: unsavedEditsForView() };
    // a field + a receipt: undoing the receipt leaves only the field
    navigateNow("dashboard");
    await W.openEditCoin();
    W.setv("browseEditNotes", "a note");
    await W.pick("browseEdit", "invoice99.pdf", "NEW99");
    out.both = unsavedEditsForView().text;
    document.getElementById("browseEditReceiptRemoveBtn").click(); await W.sleep(50);
    W.clickGuard("Put it back"); await W.sleep(60);
    out.fieldOnly = unsavedEditsForView().text;
    return out;
  });
  ok("D1 a stored receipt shows the ✕ (Build 2: it asks before removing; the removal itself is in verify_receipt_remove_shared_replace)", D.removeHiddenWithStored === false, D);
  ok("D2 ✕ on a pick over a stored receipt asks 'Put the previous receipt back?' and says nothing is deleted", D.undoDialog && /Put the previous receipt back\?/.test(D.undoDialog) && /Nothing is deleted/.test(D.undoDialog), D.undoDialog);
  ok("D3 Cancel keeps the pick", D.cancelKept === 1, D.cancelKept);
  ok("D4 Put it back: the stored receipt is back as it was, no status, the stored ✕ is back", D.slot.storedBtn === "AY-00099_receipt.pdf" && D.slot.removeShown && D.slot.status === "" && !D.slot.storedMuted && D.pending === 0, D.slot);
  ok("D5 and the form is CLEAN: Save dimmed, nothing unsaved, a Save click on the dimmed button writes nothing", D.dim.clean && D.dim.disabled && D.unsaved === null && D.cleanEvents.length === 0, { d: D.dim, u: D.unsaved, t: D.cleanToast, e: D.cleanEvents });
  ok("D6 leaving a form that was changed and undone does not ask", D.leftAtOnce, D.leftAtOnce);
  ok("D7 pick A then pick B keeps 'replaces' on the STORED receipt, not on A", D.twoPicks.name === "b99.pdf" && D.twoPicks.replaces === "AY-00099_receipt.pdf", D.twoPicks);
  ok("D8 ✕ then Put it back restores the stored receipt (not A) and is clean", D.afterTwo.pending === 0 && D.afterTwo.slot.storedBtn === "AY-00099_receipt.pdf" && D.afterTwo.dim.disabled, D.afterTwo);
  ok("D9 nothing stored: ✕ asks 'Remove receipt?' (nothing saved) and drops the pick, clean again", D.dropDialog && /Remove receipt\?/.test(D.dropDialog) && /writes nothing/.test(D.dropDialog) && D.dropped.pending === 0 && D.dropped.slot.stored === "No receipt on file" && D.dropped.dim.disabled && D.dropped.unsaved === null, { dd: D.dropDialog, d: D.dropped });
  ok("D10 a field and a receipt count as two; undoing the receipt leaves only the field", D.both === "1 field and 1 receipt" && D.fieldOnly === "1 field", { b: D.both, f: D.fieldOnly });

  // ---------- F. partial failure ---------------------------------------------
  const F = await page.evaluate(async () => {
    const W = __rs; await W.install(); await W.openEditCoin();
    const out = {};
    // F1 the upload fails: the pick stays, the field that saved stays saved
    W.setv("browseEditNotes", "a note");
    await W.pick("browseEdit", "invoice99.pdf", "NEW99");
    W.failUploadOnce = true;
    await W.save("browseEdit");
    out.f1 = { toast: W.toast(), open: W.editOpen(), pending: pendingReceiptCount("AY-00099"), slot: W.slot("browseEdit"),
      row: W.rcRow("AY-00099").slice(), remarks: W.mock._grids.All[1][18], uploads: W.uploads.slice(), unsaved: unsavedEditsForView() && unsavedEditsForView().text };
    // F2 the next Save works
    W.clearToast(); W.events = []; W.uploads = [];
    await W.save("browseEdit");
    out.f2 = { toast: W.toast(), open: W.editOpen(), row: W.rcRow("AY-00099"), uploads: W.uploads.slice(), allPatches: W.allPatches() };
    // F3 the file lands, the Receipts row write fails; the retry uploads NO second copy
    await W.install(); await W.openEditCoin();
    await W.pick("browseEdit", "invoice99.pdf", "NEW99");
    W.failPatchSheet = "Receipts"; W.failPatchOnce = true;
    await W.save("browseEdit");
    out.f3a = { toast: W.toast(), open: W.editOpen(), pending: pendingReceiptCount("AY-00099"), landed: pendingReceipts["AY-00099"] && pendingReceipts["AY-00099"].landedName,
      row: W.rcRow("AY-00099")[2], uploads: W.uploads.slice() };
    W.uploads = [];
    await W.save("browseEdit");
    out.f3b = { uploads: W.uploads.slice(), row: W.rcRow("AY-00099")[2], toast: W.toast(), pending: pendingReceiptCount("AY-00099"),
      };
    out.f3b.second = await W.fileText("invoice99_02.pdf");
    // F4 a photo removal fails; the receipt still saves
    await W.install(); await W.openEditCoin();
    const e = galleryFor("AY-00099").find(x => x.type === "obverse");
    e.pendingRemove = true; refreshManagePhotosSaveLabelsBtn();
    await W.pick("browseEdit", "invoice99.pdf", "NEW99");
    W.failPatchSheet = "Photos";
    await W.save("browseEdit");
    out.f4 = { toast: W.toast(), open: W.editOpen(), row: W.rcRow("AY-00099")[2], photoPending: pendingPhotoCount("AY-00099"), receiptPending: pendingReceiptCount("AY-00099") };
    // F5 a field conflict writes no receipt at all
    await W.install(); await W.openEditCoin();
    W.setv("browseEditNotes", "my note");
    await W.pick("browseEdit", "invoice99.pdf", "NEW99");
    W.mock._grids.All[1][13] = "XF-40"; // Copilot changed Grade meanwhile
    W.events = []; W.uploads = [];
    await W.save("browseEdit");
    out.f5 = { guard: W.guardOpen(), uploads: W.uploads.slice(), rcPatches: W.rcPatches(), pending: pendingReceiptCount("AY-00099"), row: W.rcRow("AY-00099")[2] };
    W.clickGuard("OK"); W.clickGuard("Got it");
    // F7 a coin with 2+ Receipts rows is refused, naming the coin
    await W.install(); await W.openEditCoin(W.two);
    out.f7s = W.slot("browseEdit");
    await W.pick("browseEdit", "two_new.pdf", "TWONEW");
    W.events = []; W.uploads = [];
    await W.save("browseEdit");
    out.f7 = { toast: W.toast(), open: W.editOpen(), uploads: W.uploads.slice(), rcPatches: W.rcPatches(), pending: pendingReceiptCount("AY-00097"),
      slot: W.slot("browseEdit"), rows: W.rcRows("AY-00097").map(r => r[2]) };
    return out;
  });
  ok("F1a an upload failure keeps the pick pending and the form open, naming the receipt in the toast", F.f1.pending === 1 && F.f1.open && /Receipt not saved \(offline\)/.test(F.f1.toast) && /Tap Save Changes again/.test(F.f1.toast), F.f1);
  ok("F1b the slot says 'Not saved — tap Save changes again' in the failed style, ✕ still available", F.f1.slot.statusFailed && /Not saved/.test(F.f1.slot.status) && F.f1.slot.removeShown, F.f1.slot);
  ok("F1c the field saved before the receipt stays saved; the Receipts row is untouched; only the receipt is left unsaved", F.f1.remarks === "a note" && F.f1.row[2] === "AY-00099_receipt.pdf" && F.f1.unsaved === "1 receipt", { r: F.f1.remarks, row: F.f1.row, u: F.f1.unsaved });
  ok("F2 the next Save sends the receipt (one upload), writes only the receipt (no second All write) and closes", F.f2.uploads.length === 1 && F.f2.row[2] === "invoice99.pdf" && F.f2.allPatches === 0 && !F.f2.open, F.f2);
  ok("F3a the file landed but the row write failed: the pick stays pending and remembers the landed file", F.f3a.pending === 1 && F.f3a.open && F.f3a.landed === "invoice99.pdf" && F.f3a.uploads.length === 1 && F.f3a.row === "AY-00099_receipt.pdf", F.f3a);
  ok("F3b the retry uploads NO second copy and the row points at the landed file", F.f3b.uploads.length === 0 && F.f3b.row === "invoice99.pdf" && F.f3b.second === null && F.f3b.pending === 0, F.f3b);
  ok("F4 a photo removal that fails does not stop the receipt: the receipt saved, the photo is still pending, the form stays open", F.f4.row === "invoice99.pdf" && F.f4.receiptPending === 0 && F.f4.photoPending === 1 && F.f4.open && /receipt replaced/.test(F.f4.toast) && /not removed/.test(F.f4.toast), F.f4);
  ok("F5 a field conflict writes NO receipt (no upload, no Receipts patch) and the pick stays pending", F.f5.guard && F.f5.uploads.length === 0 && F.f5.rcPatches === 0 && F.f5.pending === 1 && F.f5.row === "AY-00099_receipt.pdf", F.f5);
  ok("F7a a coin with 2 Receipts rows shows the last one (as the detail page does) on the slot", F.f7s.storedBtn === "two_b.pdf", F.f7s);
  ok("F7b Save refuses: nothing uploaded or written, both rows as they were, the toast names the coin and says why", F.f7.uploads.length === 0 && F.f7.rcPatches === 0 && F.f7.rows.join(",") === "two_a.pdf,two_b.pdf" && /AY-00097/.test(F.f7.toast) && /Receipts tab/.test(F.f7.toast) && /Receipt not changed/.test(F.f7.toast), F.f7);
  ok("F7c the pick stays pending (so Discard can drop it), flagged 'Not changed', form open", F.f7.pending === 1 && F.f7.open && /Not changed/.test(F.f7.slot.status) && F.f7.slot.statusFailed, F.f7);

  // ---------- G. Edit Set -----------------------------------------------------
  const G = await page.evaluate(async () => {
    const W = __rs; await W.install(); await W.openEditSet();
    const out = {};
    out.open = W.slot("editSet"); out.openDim = W.dim("editSet");
    W.events = [];
    await W.pick("editSet", "set90.pdf", "SET90");
    out.pick = W.slot("editSet"); out.events = W.events.slice(); out.dim = W.dim("editSet");
    out.text = unsavedEditsForView().text;
    // undo is clean
    document.getElementById("editSetReceiptRemoveBtn").click(); await W.sleep(50);
    out.dropDialog = W.guardOpen() ? W.guardText() : null;
    W.clickGuard("Remove"); await W.sleep(60);
    out.undone = { dim: W.dim("editSet"), unsaved: unsavedEditsForView() };
    // receipt-only Save
    await W.pick("editSet", "set90.pdf", "SET90");
    W.events = [];
    await W.save("editSet");
    out.saved = { toast: W.toast(), row: W.rcRow("AY-00090") && W.rcRow("AY-00090")[2], open: W.editSetOpen(), events: W.events.slice() };
    // field + receipt
    await W.install(); await W.openEditSet();
    W.setv("editSetDescription", "1957 Proof Set (edited)");
    await W.pick("editSet", "set90b.pdf", "SET90B");
    out.both = unsavedEditsForView().text;
    await W.save("editSet");
    out.bothSaved = { toast: W.toast(), row: W.rcRow("AY-00090") && W.rcRow("AY-00090")[2] };
    // Discard through Back
    await W.install(); await W.openEditSet();
    await W.pick("editSet", "set90.pdf", "SET90");
    W.events = [];
    leaveBrowseEditSetGuarded(); await W.sleep(50);
    out.back = W.guardOpen() && /1 receipt/.test(W.guardText());
    W.clickGuard("Discard"); await W.sleep(100);
    out.backDone = { pending: pendingReceiptCount("AY-00090"), events: W.events.slice(), open: W.editSetOpen() };
    return out;
  });
  ok("G1 Edit Set shows 'No receipt on file' and a dimmed Save", G.open.stored === "No receipt on file" && G.openDim.disabled, G.open);
  ok("G2 a pick on Edit Set writes nothing; 'Not saved yet'; ✕; Save enabled; the guard counts '1 receipt'", G.events.length === 0 && /Not saved yet/.test(G.pick.status) && G.pick.removeShown && !G.dim.disabled && G.text === "1 receipt", G);
  ok("G3 ✕ on a pick with nothing stored drops it after asking; the form is clean again", G.dropDialog && /Remove receipt\?/.test(G.dropDialog) && G.undone.dim.disabled && G.undone.unsaved === null, G.undone);
  ok("G4 a receipt-only Save writes the Receipts row (new, claims a blank row), toast 'Saved AY-00090 — receipt added.', closes", G.saved.toast === "Saved AY-00090 — receipt added." && G.saved.row === "set90.pdf" && !G.saved.open && dedupe(G.saved.events) === "upload:set90.pdf,patch:Receipts", G.saved);
  ok("G5 a field and a receipt: counted as two; the toast keeps the session-only wording for the field and adds the receipt", G.both === "1 field and 1 receipt" && /for this session only/.test(G.bothSaved.toast) && /receipt added/.test(G.bothSaved.toast) && G.bothSaved.row === "set90b.pdf", G);
  ok("G6 Back asks, counting the receipt; Discard drops it and writes nothing", G.back && G.backDone.pending === 0 && G.backDone.events.length === 0 && !G.backDone.open, G);

  // ---------- H. each refreshEditSaveState() call added, in isolation ---------
  const H = await page.evaluate(async () => {
    const W = __rs; await W.install(); await W.openEditCoin();
    const out = {};
    const force = (clean) => { const b = W.saveBtn("browseEdit"); b.classList.toggle("is-clean", clean); b.disabled = clean; };
    // H1 a pick re-evaluates a drifted (dimmed) button
    force(true);
    await W.pick("browseEdit", "invoice99.pdf", "NEW99");
    out.pick = W.dim("browseEdit");
    // H2 ✕ / Put it back re-evaluates a drifted (enabled) button
    force(false);
    document.getElementById("browseEditReceiptRemoveBtn").click(); await W.sleep(50);
    W.clickGuard("Put it back"); await W.sleep(60);
    out.undo = W.dim("browseEdit");
    // H1b the same for a photographed (JPEG) pick, which has its own branch
    force(true);
    await W.pickFile("browseEdit", await W.jpeg());
    out.jpegPick = W.dim("browseEdit");
    document.getElementById("browseEditReceiptRemoveBtn").click(); await W.sleep(50);
    W.clickGuard("Put it back"); await W.sleep(60);
    // H3 Discard re-evaluates it (the receipt goes first, then the refresh sees it gone)
    await W.pick("browseEdit", "invoice99.pdf", "NEW99");
    force(false);
    discardUnsavedPhotoEdits("AY-00099");
    out.discard = W.dim("browseEdit");
    // H4 the end of a Save that leaves the receipt unsaved keeps Save enabled
    await W.pick("browseEdit", "invoice99.pdf", "NEW99");
    W.failUploadOnce = true;
    await W.save("browseEdit");
    out.failedSave = W.dim("browseEdit");
    return out;
  });
  ok("H1 a pick turns a drifted dimmed Save back on (the refresh in the pick handler)", !H.pick.disabled && !H.pick.clean, H.pick);
  ok("H1b a photographed (JPEG) pick turns a drifted dimmed Save back on too (its own refresh)", !H.jpegPick.disabled && !H.jpegPick.clean, H.jpegPick);
  ok("H2 Put it back dims a drifted enabled Save (the refresh in the undo)", H.undo.disabled && H.undo.clean, H.undo);
  ok("H3 Discard dims a drifted enabled Save (receipt discarded before the photo refresh)", H.discard.disabled && H.discard.clean, H.discard);
  ok("H4 after a Save whose receipt failed, Save stays enabled (the receipt is still unsaved)", !H.failedSave.disabled, H.failedSave);

  // ---------- I. the Receipts row is the only record ---------------------------
  // (Receipts and photos alignment, Build 1: All.Receipt is no longer read
  // at all, not even as a fallback; I3, I4a and I5 follow that design.)
  const I = await page.evaluate(async () => {
    const W = __rs; await W.install();
    const out = {};
    // I1 the Receipts row names a different file than All.Receipt (what a Replace leaves)
    W.coin.receiptFile = "old_all_sheet.pdf";
    __setStoredReceiptsForTest({ "AY-00099": { receiptId: "RC-00001", filename: "AY-00099_receipt.pdf" } });
    await W.openEditCoin();
    out.i1slot = W.slot("browseEdit").storedBtn;
    showBrowseDetail(W.coin); out.i1detail = W.detailReceipt();
    W.coin.receiptFile = "AY-00099_receipt.pdf";
    // I2 a Receipts row whose name has no extension still wins (a row is a row)
    __setStoredReceiptsForTest({ "AY-00099": { receiptId: "RC-00001", filename: "scan-no-ext" } });
    out.i2 = storedReceiptFor(W.coin);
    __setStoredReceiptsForTest({ "AY-00099": { receiptId: "RC-00001", filename: "AY-00099_receipt.pdf" } });
    // I3 only All.Receipt: the slot shows that file
    __setStoredReceiptsForTest({});
    navigateNow("dashboard");
    await W.openEditCoin(W.legacy);
    const s3 = W.slot("browseEdit");
    out.i3slot = s3.storedBtn;
    showBrowseDetail(W.legacy); out.i3detail = W.detailReceipt();
    out.i3snap = storedReceiptSnapshot("AY-00098");
    // I4 a pick creates a Receipts row that then wins over All.Receipt
    await W.openEditCoin(W.legacy);
    await W.pick("browseEdit", "new98.pdf", "NEW98");
    const pend = W.slot("browseEdit");
    out.i4status = pend.status; out.i4stored = pend.stored;
    const firstBlank = W.rcGrid().findIndex((r, i) => i > 0 && !r[0]);
    await W.save("browseEdit");
    const idx = W.rcGrid().findIndex(r => r[1] === "AY-00098");
    out.i4 = { idx, firstBlank, row: W.rcGrid()[idx], toast: W.toast(), detail: W.detailReceipt(), allSheetFile: W.legacy.receiptFile,
      legacyFile: await W.fileText("legacy98.pdf"), idx2: LIVE_RECEIPTS["AY-00098"] };
    await W.openEditCoin(W.legacy);
    out.i4slotAfter = W.slot("browseEdit").storedBtn;
    navigateNow("dashboard");
    // I5 "Binder" only in All.Receipt is not read; a Binder ROW is the paper receipt
    await W.openEditCoin(W.binder);
    out.i5slot = W.slot("browseEdit").stored;
    showBrowseDetail(W.binder);
    out.i5detail = { link: W.detailReceipt(), text: document.getElementById("browseDetailView").textContent.indexOf("Not scanned (paper receipt in binder)") !== -1 };
    __setStoredReceiptsForTest({ "AY-00093": { receiptId: "RC-00030", filename: "Binder" } });
    await W.openEditCoin(W.binder);
    out.i5rowSlot = W.slot("browseEdit").stored;
    showBrowseDetail(W.binder);
    out.i5rowDetail = { link: W.detailReceipt(), text: document.getElementById("browseDetailView").textContent.indexOf("Not scanned (paper receipt in binder)") !== -1 };
    return out;
  });
  ok("I1a a Receipts row beats a different name in All.Receipt: the SLOT shows the Receipts row", I.i1slot === "AY-00099_receipt.pdf", I.i1slot);
  ok("I1b ... and so does the DETAIL page", I.i1detail === "AY-00099_receipt.pdf", I.i1detail);
  ok("I2 a Receipts row wins whenever it exists (even a name without an extension)", I.i2 && I.i2.filename === "scan-no-ext" && !I.i2.legacy, I.i2);
  ok("I3a a coin with only All.Receipt shows NO receipt in the SLOT (All.Receipt is not read)", I.i3slot === null && I.i3snap === null, { s: I.i3slot, n: I.i3snap });
  ok("I3b ... nor on the DETAIL page", I.i3detail === null, I.i3detail);
  ok("I4a a pick on that coin is a plain add (nothing on file to replace)", /Not saved yet/.test(I.i4status) && !/replaces/i.test(I.i4status) && I.i4stored === "No receipt on file", { s: I.i4status, t: I.i4stored });
  ok("I4b Save creates a Receipts row in the FIRST blank row with a new ReceiptID; the old file and All.Receipt are untouched", I.i4.idx === I.i4.firstBlank && /^RC-\d{5}$/.test(I.i4.row[0]) && I.i4.row[2] === "new98.pdf" && I.i4.legacyFile === "LEGACY98" && I.i4.allSheetFile === "legacy98.pdf", I.i4);
  ok("I4c the new Receipts row now WINS over All.Receipt on the detail page and in the slot on reopening", I.i4.detail === "new98.pdf" && I.i4slotAfter === "new98.pdf" && I.i4.idx2.filename === "new98.pdf", { d: I.i4.detail, s: I.i4slotAfter });
  ok("I5 'Binder' only in All.Receipt is not read (slot 'No receipt on file', no Binder line on the detail page)", I.i5slot === "No receipt on file" && I.i5detail.link === null && !I.i5detail.text, I.i5detail);
  ok("I5b a Binder Receipts ROW is the paper receipt: the slot and the detail page say 'Not scanned (paper receipt in binder)', without a link", I.i5rowSlot === "Not scanned (paper receipt in binder)" && I.i5rowDetail.link === null && I.i5rowDetail.text, [I.i5rowSlot, I.i5rowDetail]);

  // ---------- J. other slots untouched ----------------------------------------
  const J = await page.evaluate(async () => {
    const W = __rs; await W.install();
    const out = {};
    out.targets = Object.keys(receiptCommitTargets).sort();
    // Add Coin's own slot
    navigate("addcoin"); await W.sleep(100);
    W.events = [];
    const input = document.getElementById("receiptLibraryInput");
    const dt = new DataTransfer(); dt.items.add(new File(["ADDCOIN"], "ac.pdf", { type: "application/pdf" }));
    input.files = dt.files; input.dispatchEvent(new Event("change", { bubbles: true }));
    await W.sleep(150);
    out.add = { held: !!(receiptFiles["receiptPreview"] && receiptFiles["receiptPreview"].blob), pendingMap: Object.keys(pendingReceipts).length,
      events: W.events.slice(), unsaved: addCoinUnsavedReceipt(), counts: unsavedEditsForView() && unsavedEditsForView().counts };
    delete receiptFiles["receiptPreview"];
    resetAddCoinForm(); clearCoinDraftEditContext(); navigateNow("dashboard");
    // write layer off: nothing is held, written or counted
    __setAddCoinWriteEnabledForTest(false);
    await W.openEditCoin();
    W.events = [];
    await W.pick("browseEdit", "invoice99.pdf", "NEW99");
    out.off = { pendingMap: Object.keys(pendingReceipts).length, events: W.events.slice(), held: !!receiptFiles["browseEditReceiptPreview"],
      unsaved: unsavedEditsForView(), dim: W.dim("browseEdit") };
    delete receiptFiles["browseEditReceiptPreview"];
    __setAddCoinWriteEnabledForTest(true);
    return out;
  });
  ok("J1 only the Edit Coin and Edit Set slots are registered to hold a pending receipt", J.targets.join(",") === "browseEditReceiptPreview,editSetReceiptPreview", J.targets);
  ok("J2 Add Coin's receipt slot is unchanged: held in receiptFiles, not in the pending map, nothing written, counted by its own rule", J.add.held && J.add.pendingMap === 0 && J.add.events.length === 0 && J.add.unsaved && J.add.counts && J.add.counts.receipts === 1, J.add);
  ok("J3 with the write layer off a pick on Edit Coin is not held, written or counted (as before)", J.off.pendingMap === 0 && J.off.events.length === 0 && J.off.held && J.off.unsaved === null && J.off.dim.disabled, J.off);

  // ---------- M. layout ---------------------------------------------------------
  async function layout(pg, label) {
    return pg.evaluate(async () => {
      const W = __rs; await W.install(); await W.openEditCoin();
      await W.pick("browseEdit", "a_rather_long_receipt_file_name_from_a_seller_2026-10-31.pdf", "LONG");
      const s = W.slot("browseEdit");
      const box = s.box.getBoundingClientRect();
      const inside = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.left >= box.left - 1 && r.right <= box.right + 1; };
      const stored = document.getElementById("browseEditReceiptStored");
      const note = s.box.querySelector(".receipt-upload-state");
      return {
        box: Math.round(box.width), storedIn: inside(stored), noteIn: inside(note),
        rmIn: inside(document.getElementById("browseEditReceiptRemoveBtn")),
        hScroll: document.documentElement.scrollWidth <= window.innerWidth + 1
      };
    });
  }
  const M1 = await layout(page, "phone");
  ok("M1 phone: the receipt on file, the status and the ✕ all sit inside the photo box, no sideways scroll", M1.storedIn && M1.noteIn && M1.rmIn && M1.hScroll, M1);
  const tab = await openApp(TABLET);
  await setup(tab);
  const M2 = await layout(tab, "tablet");
  ok("M2 tablet: same", M2.storedIn && M2.noteIn && M2.rmIn && M2.hScroll, M2);
}, module);
