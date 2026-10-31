// Receipts and photos alignment, Build 2 (backlog (af)), Oct 2026,
// claude/receipt-remove-and-shared-replace.
//
//   SELF the shared check helper's must-fail self-check
//   R   remove a stored receipt (Edit Coin, Edit Set): ✕ on a stored scan or
//       Binder always asks first (shared: "N other coins" line; not shared:
//       without it); confirmed it is PENDING (leave guard, dimmed Save,
//       Discard, "Put it back"), nothing written until Save; Save re-reads the
//       sheet, refuses 2+ rows, blanks ONLY this coin's row (other coins' rows
//       and the file untouched, no file delete), the blank row goes back to
//       the pool; the Binder button is back; combinations with a new pick
//   S   Replace of a shared receipt: asked at pick time, N from a fresh read
//       (index fallback), "Replace on all N" (Filename + today's DateAdded on
//       every row of the ReceiptID, id kept, other ReceiptIDs untouched, even
//       with the same Filename) / "This coin only" (new ReceiptID) / Cancel
//   Q4  Replace on all where the picked bytes are already filed under another
//       ReceiptID: rows keep their id and point at that file; toast says so
//   U   the _02 fix: the candidate name exists with the same bytes and no row
//       claims it -> reused, new ReceiptID, nothing uploaded; other bytes still
//       take the next free name

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
    const mk = (id) => ({ id, name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" });
    window.__rr = {
      sleep, events: [], uploads: [], deletes: [], patchAddrs: [], failPatchSheet: null, failPatchOnce: false, failRead: false, mock: null,
      own: mk("AY-00099"), shared: mk("AY-00095"), two: mk("AY-00097"), binder: mk("AY-00093"), none: mk("AY-00094"),
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
          All: [ALL_HEADERS, allRow("AY-00099"), allRow("AY-00095"), allRow("AY-00097"),
                allRow("AY-00094"), allRow("AY-00093"), allRow("AY-00090", "Multiple")],
          Receipts: [RECEIPT_HEADERS,
            ["RC-00001", "AY-00099", "AY-00099_receipt.pdf", 46000],   // sheet row 2: not shared
            ["RC-00002", "AY-00095", "shared.pdf", 46000],              // 3 \
            ["RC-00002", "AY-00051", "shared.pdf", 46001],              // 4  } one receipt on three coins
            ["RC-00002", "AY-00052", "shared.pdf", 46002],              // 5 /
            ["RC-00009", "AY-00060", "other.pdf", 46000],               // 6: another receipt
            ["RC-00010", "AY-00061", "claimed.pdf", 46000],             // 7: a file filed under another id
            ["RC-00011", "AY-00062", "shared.pdf", 46003],              // 8: SAME filename, DIFFERENT ReceiptID
            ["RC-00007", "AY-00097", "two_a.pdf", 46000],               // 9 \ two rows for one coin
            ["RC-00008", "AY-00097", "two_b.pdf", 46001],               // 10 /
            ["RC-00038", "AY-00093", "Binder", 46000],                  // 11: paper receipt
            ["RC-00020", "AY-00090", "set_receipt.pdf", 46000],         // 12: the Set's receipt
            ["", "", "", ""], ["", "", "", ""], ["", "", "", ""], ["", "", "", ""]],
          Photos: [PHOTO_HEADERS, ...blank(4)]
        } });
        const rp = writePaths().coinReceipts + "/";
        const put = (n, t) => mock.uploadFile(rp + n, new Blob([t]));
        await put("AY-00099_receipt.pdf", "OLD99"); await put("shared.pdf", "SHARED"); await put("other.pdf", "OTHER");
        await put("claimed.pdf", "CLAIMED"); await put("two_a.pdf", "TWOA"); await put("two_b.pdf", "TWOB");
        await put("set_receipt.pdf", "SETR"); await put("stray.pdf", "STRAY"); // stray.pdf: a file no row claims
        this.mock = mock;
        this.events = []; this.uploads = []; this.deletes = []; this.patchAddrs = [];
        this.failPatchSheet = null; this.failPatchOnce = false; this.failRead = false;
        __setGraphClientForTest(new Proxy(mock, { get(t, k) {
          const v = t[k];
          if (typeof v !== "function") return v;
          return async (...a) => {
            if (k === "uploadFile") {
              const name = String(a[0]).split("/").pop();
              self.uploads.push(name); self.events.push("upload:" + name);
            }
            if (k === "deleteItem") { self.deletes.push(String(a[0])); self.events.push("delete"); }
            if (k === "readTableColumn" && self.failRead && a[1] === "Receipts") throw new Error("read failed");
            if (k === "patchWorkbookRanges") {
              if (self.failPatchSheet && a[1] === self.failPatchSheet) {
                if (self.failPatchOnce) self.failPatchSheet = null;
                throw new Error("workbook busy");
              }
              self.events.push("patch:" + a[1]);
              (a[2] || []).forEach(r => self.patchAddrs.push(a[1] + ":" + r.address));
            }
            return v.apply(t, a);
          };
        } }));
        __resetSheetHeaderMapsForTest(); __resetAllHeaderMapForTest(); __resetMintedIdsForTest();
        __setAddCoinWriteEnabledForTest(true);
        __setBrowseEditWriteEnabledForTest(true);
        __setLiveCoinsForTest([this.own, this.shared, this.two, this.binder, this.none, this.set]);
        __setStoredReceiptsForTest({
          "AY-00099": { receiptId: "RC-00001", filename: "AY-00099_receipt.pdf" },
          "AY-00095": { receiptId: "RC-00002", filename: "shared.pdf" },
          "AY-00051": { receiptId: "RC-00002", filename: "shared.pdf" },
          "AY-00052": { receiptId: "RC-00002", filename: "shared.pdf" },
          "AY-00060": { receiptId: "RC-00009", filename: "other.pdf" },
          "AY-00061": { receiptId: "RC-00010", filename: "claimed.pdf" },
          "AY-00062": { receiptId: "RC-00011", filename: "shared.pdf" },
          "AY-00097": { receiptId: "RC-00008", filename: "two_b.pdf", rowCount: 2 },
          "AY-00093": { receiptId: "RC-00038", filename: "Binder" },
          "AY-00090": { receiptId: "RC-00020", filename: "set_receipt.pdf" }
        });
        __setStoredPhotosForTest({});
        closeImageSourceChooser();
        const ov = document.getElementById("writeGuardOverlay"); if (ov) ov.classList.add("hidden");
        this.clearToast();
        this.events = []; this.uploads = []; this.deletes = []; this.patchAddrs = [];
      },
      rcGrid() { return this.mock._grids.Receipts; },
      rcRows(id) { return this.rcGrid().slice(1).filter(r => r[1] === id); },
      rcRow(id) { return this.rcRows(id)[0] || null; },
      rcSheetRow(n) { return (this.rcGrid()[n - 1] || []).slice(0, 4); },
      async fileText(name) {
        const b = await this.mock.getFileBytes(writePaths().coinReceipts + "/" + name);
        return b ? await b.text() : null;
      },
      async openEditCoin(coin) {
        coin = coin || this.own;
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
        await sleep(160);
      },
      async clickX(prefix) { document.getElementById(prefix + "ReceiptRemoveBtn").click(); await sleep(120); },
      async putBack(prefix) { document.getElementById(prefix + "ReceiptPutBackBtn").click(); await sleep(60); },
      async binderBtn(prefix) { document.getElementById(prefix + "ReceiptBinderBtn").click(); await sleep(60); },
      slot(prefix) {
        const stored = document.getElementById(prefix + "ReceiptStored");
        const rm = document.getElementById(prefix + "ReceiptRemoveBtn");
        const bb = document.getElementById(prefix + "ReceiptBinderBtn");
        const pb = document.getElementById(prefix + "ReceiptPutBackBtn");
        const preview = document.getElementById(prefix + "ReceiptPreview");
        const note = preview.closest(".photo-box").querySelector(".receipt-upload-state");
        const vis = el => !!el && !el.classList.contains("hidden") && el.offsetParent !== null;
        return {
          stored: stored.textContent, storedBtn: !!stored.querySelector(".receipt-stored-btn"),
          removeShown: rm.style.display !== "none", binderShown: vis(bb), putBackShown: vis(pb),
          status: note && note.style.display !== "none" ? note.textContent : ""
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
      guardButtons() { return [...document.querySelectorAll("#writeGuardBtns button")].map(b => b.textContent); },
      clickGuard(label) {
        const b = [...document.querySelectorAll("#writeGuardBtns button")].find(x => x.textContent === label);
        if (!b) return false; b.click(); return true;
      },
      unsaved() { const u = unsavedEditsForView(); return u ? u.text : null; },
      editOpen() { return document.getElementById("browseEditView").style.display !== "none"; }
    };
  }, { RECEIPT_HEADERS, PHOTO_HEADERS, ALL_HEADERS });
}

module.exports = defineSuite("receipt-remove-shared-replace", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);
  await setup(page);

  // ---------- R1-R5: remove a SHARED stored scan ---------------------------
  const R = await page.evaluate(async () => {
    const W = __rr; await W.install(); await W.openEditCoin(W.shared);
    const out = {};
    out.open = W.slot("browseEdit");
    W.events = [];
    await W.clickX("browseEdit");
    out.dialog = W.guardText(); out.dialogBtns = W.guardButtons();
    out.eventsAtAsk = W.events.slice();
    out.pendingAtAsk = pendingReceiptCount("AY-00095");
    W.clickGuard("Cancel"); await W.sleep(40);
    out.afterCancel = { pending: pendingReceiptCount("AY-00095"), dim: W.dim("browseEdit") };
    // confirm
    await W.clickX("browseEdit");
    W.clickGuard("Remove"); await W.sleep(80);
    out.pend = W.slot("browseEdit");
    out.pendDim = W.dim("browseEdit");
    out.pendCount = pendingReceiptCount("AY-00095"); out.pendText = W.unsaved();
    out.pendEvents = W.events.slice();
    out.pendRowStill = W.rcSheetRow(3);
    // Put it back
    await W.putBack("browseEdit");
    out.back = { slot: W.slot("browseEdit"), dim: W.dim("browseEdit"), count: pendingReceiptCount("AY-00095") };
    // remove again and Save
    await W.clickX("browseEdit"); W.clickGuard("Remove"); await W.sleep(80);
    const before = { r4: W.rcSheetRow(4), r5: W.rcSheetRow(5), r6: W.rcSheetRow(6), r8: W.rcSheetRow(8) };
    W.events = []; W.patchAddrs = []; W.uploads = []; W.deletes = [];
    await W.save("browseEdit");
    out.saved = {
      row3: W.rcSheetRow(3), r4: W.rcSheetRow(4), r5: W.rcSheetRow(5), r6: W.rcSheetRow(6), r8: W.rcSheetRow(8), before,
      patches: W.patchAddrs.filter(a => a.indexOf("Receipts:") === 0), uploads: W.uploads.slice(), deletes: W.deletes.slice(),
      file: await W.fileText("shared.pdf"), toast: W.toast(), index: LIVE_RECEIPTS["AY-00095"] || null,
      otherIndex: LIVE_RECEIPTS["AY-00051"], pending: pendingReceiptCount("AY-00095"), editOpen: W.editOpen()
    };
    // reopen: slot empty, Binder button offered
    await W.openEditCoin(W.shared);
    out.reopen = W.slot("browseEdit");
    // the blanked row returns to the pool: a Binder for another coin claims it
    await W.openEditCoin(W.none);
    await W.binderBtn("browseEdit");
    await W.save("browseEdit");
    out.claimed = { row3: W.rcSheetRow(3), len: W.rcGrid().length };
    return out;
  });
  ok("R1 a stored scan shows the ✕ (the slot is not pending)", R.open.removeShown && R.open.storedBtn && R.open.status === "" , R.open);
  ok("R2 ✕ asks first, with the shared wording, and writes nothing", /Remove this receipt from this coin\?/.test(R.dialog) &&
    /This receipt is on 2 other coins\. RC-00002 · shared\.pdf\./.test(R.dialog) &&
    /Remove it from this coin only\? The other coins keep it, and the file isn't deleted\./.test(R.dialog) &&
    R.dialogBtns.join("|") === "Cancel|Remove" && R.eventsAtAsk.length === 0 && R.pendingAtAsk === 0, { d: R.dialog, b: R.dialogBtns, e: R.eventsAtAsk });
  ok("R3 Cancel leaves nothing pending and Save dimmed", R.afterCancel.pending === 0 && R.afterCancel.dim.clean, R.afterCancel);
  ok("R4 Remove makes it PENDING: counted '1 receipt', Save enabled, 'Will be removed when you save.', Put it back + Binder button shown, no ✕, zero writes",
    R.pendCount === 1 && R.pendText === "1 receipt" && !R.pendDim.disabled && R.pend.status === "Will be removed when you save." &&
    R.pend.putBackShown && R.pend.binderShown && !R.pend.removeShown && R.pendEvents.length === 0 && R.pendRowStill[0] === "RC-00002", { s: R.pend, d: R.pendDim, c: R.pendCount, t: R.pendText, e: R.pendEvents });
  ok("R5 Put it back: the stored receipt is back, nothing pending, Save dimmed again, ✕ shown",
    R.back.count === 0 && R.back.dim.clean && R.back.dim.disabled && R.back.slot.storedBtn && R.back.slot.removeShown && !R.back.slot.putBackShown && !R.back.slot.binderShown, R.back);
  ok("R6 Save blanks ONLY this coin's row (sheet row 3): every column empty",
    R.saved.row3.every(v => v === "" || v === null), R.saved.row3);
  ok("R7 the other coins on RC-00002 and the other ReceiptIDs are byte-for-byte untouched",
    JSON.stringify([R.saved.r4, R.saved.r5, R.saved.r6, R.saved.r8]) === JSON.stringify([R.saved.before.r4, R.saved.before.r5, R.saved.before.r6, R.saved.before.r8]) &&
    R.saved.r4[0] === "RC-00002" && R.saved.r5[0] === "RC-00002" && R.saved.r8[0] === "RC-00011", { r4: R.saved.r4, r5: R.saved.r5, r8: R.saved.r8 });
  ok("R8 the file is never deleted: no delete call, no upload, shared.pdf still holds its bytes",
    R.saved.deletes.length === 0 && R.saved.uploads.length === 0 && R.saved.file === "SHARED", { d: R.saved.deletes, u: R.saved.uploads, f: R.saved.file });
  ok("R9 Save writes only row 3 on the Receipts tab", R.saved.patches.length > 0 && R.saved.patches.every(a => /Receipts:A3:/.test(a) || /Receipts:[A-Z]3:[A-Z]3/.test(a)), R.saved.patches);
  ok("R10 toast, the form closes, the session index drops this coin and keeps the others",
    R.saved.toast === "Saved AY-00095 — receipt removed from this coin (RC-00002)." && !R.saved.editOpen && R.saved.index === null &&
    R.saved.otherIndex && R.saved.otherIndex.filename === "shared.pdf" && R.saved.pending === 0, { t: R.saved.toast, i: R.saved.index, o: R.saved.otherIndex });
  ok("R11 after removal the slot says 'No receipt on file' and the Binder button is back, no ✕",
    /No receipt on file/.test(R.reopen.stored) && R.reopen.binderShown && !R.reopen.removeShown, R.reopen);
  ok("R12 the blanked row goes back to the pool: the next new row claims sheet row 3, no row appended",
    R.claimed.row3[1] === "AY-00094" && R.claimed.row3[2] === "Binder" && R.claimed.len === 16, R.claimed);

  // ---------- R13-R16: not shared, Binder, Edit Set -------------------------
  const R2 = await page.evaluate(async () => {
    const W = __rr; await W.install(); await W.openEditCoin(W.own);
    const out = {};
    await W.clickX("browseEdit");
    out.own = W.guardText();
    W.clickGuard("Remove"); await W.sleep(60);
    W.events = []; W.deletes = [];
    await W.save("browseEdit");
    out.ownRow = W.rcSheetRow(2); out.ownDeletes = W.deletes.slice(); out.ownToast = W.toast();
    out.ownFile = await W.fileText("AY-00099_receipt.pdf");
    // Binder
    await W.openEditCoin(W.binder);
    await W.clickX("browseEdit");
    out.binder = W.guardText();
    W.clickGuard("Remove"); await W.sleep(60);
    out.binderPend = W.slot("browseEdit");
    await W.save("browseEdit");
    out.binderRow = W.rcSheetRow(11); out.binderToast = W.toast();
    // Edit Set
    await W.openEditSet();
    out.setSlot = W.slot("editSet");
    await W.clickX("editSet");
    out.setDialog = W.guardText();
    W.clickGuard("Remove"); await W.sleep(60);
    out.setPend = { slot: W.slot("editSet"), dim: W.dim("editSet"), text: W.unsaved() };
    await W.save("editSet");
    out.setRow = W.rcSheetRow(12); out.setToast = W.toast(); out.setFile = await W.fileText("set_receipt.pdf");
    return out;
  });
  ok("R13 not shared: the dialog names the receipt, has no other-coins line", /RC-00001 · AY-00099_receipt\.pdf\./.test(R2.own) && !/other coin/.test(R2.own) && /Remove it from this coin\? The file isn't deleted\./.test(R2.own), R2.own);
  ok("R14 not shared: Save blanks the row, deletes nothing, keeps the file", R2.ownRow.every(v => v === "" || v === null) && R2.ownDeletes.length === 0 && R2.ownFile === "OLD99" && /receipt removed from this coin \(RC-00001\)/.test(R2.ownToast), { r: R2.ownRow, t: R2.ownToast });
  ok("R15 a Binder receipt asks too (Not scanned wording) and Save blanks the Binder row",
    /Remove this receipt from this coin\?/.test(R2.binder) && /RC-00038 · Not scanned \(paper receipt in binder\)/.test(R2.binder) &&
    R2.binderPend.putBackShown && R2.binderRow.every(v => v === "" || v === null) && /receipt removed from this coin \(RC-00038\)/.test(R2.binderToast), { d: R2.binder, r: R2.binderRow, t: R2.binderToast });
  ok("R16 Edit Set: ✕ on its stored receipt asks, goes pending (counted, Save enabled), Save blanks the row and keeps the file",
    R2.setSlot.removeShown && /set_receipt\.pdf/.test(R2.setDialog) && R2.setPend.slot.putBackShown && R2.setPend.text === "1 receipt" && !R2.setPend.dim.disabled &&
    R2.setRow.every(v => v === "" || v === null) && R2.setFile === "SETR" && /receipt removed from this coin/.test(R2.setToast), R2);

  // ---------- R17-R21: guard, refusals, changed under us --------------------
  const R3 = await page.evaluate(async () => {
    const W = __rr; await W.install(); await W.openEditCoin(W.own);
    const out = {};
    await W.clickX("browseEdit"); W.clickGuard("Remove"); await W.sleep(60);
    // leave guard counts it, Discard drops it
    out.leave = navigate("dashboard");
    out.guard = W.guardText();
    W.clickGuard("Discard"); await W.sleep(80);
    out.afterDiscard = { pending: pendingReceiptCount("AY-00099"), row: W.rcSheetRow(2) };
    // 2+ rows is refused at Save
    await W.openEditCoin(W.two);
    await W.clickX("browseEdit"); W.clickGuard("Remove"); await W.sleep(60);
    W.events = []; W.patchAddrs = [];
    await W.save("browseEdit");
    out.two = { toast: W.toast(), r9: W.rcSheetRow(9), r10: W.rcSheetRow(10), patches: W.patchAddrs.filter(a => a.indexOf("Receipts:") === 0), pending: pendingReceiptCount("AY-00097"), open: W.editOpen() };
    // changed since the form opened: the row now says something else
    await W.openEditCoin(W.own);
    await W.clickX("browseEdit"); W.clickGuard("Remove"); await W.sleep(60);
    W.rcGrid()[1][2] = "someone_else.pdf";
    W.patchAddrs = [];
    await W.save("browseEdit");
    out.changed = { toast: W.toast(), row: W.rcSheetRow(2), patches: W.patchAddrs.filter(a => a.indexOf("Receipts:") === 0), pending: pendingReceiptCount("AY-00099") };
    // already gone: the row was blanked by someone else before Save
    await W.install(); await W.openEditCoin(W.own);
    await W.clickX("browseEdit"); W.clickGuard("Remove"); await W.sleep(60);
    W.rcGrid()[1][0] = ""; W.rcGrid()[1][1] = ""; W.rcGrid()[1][2] = ""; W.rcGrid()[1][3] = "";
    W.patchAddrs = [];
    await W.save("browseEdit");
    out.gone = { toast: W.toast(), patches: W.patchAddrs.filter(a => a.indexOf("Receipts:") === 0), pending: pendingReceiptCount("AY-00099") };
    return out;
  });
  ok("R17 the leave guard counts a pending removal ('1 receipt') and Discard drops it, row intact", R3.leave === false && /1 receipt/.test(R3.guard) && R3.afterDiscard.pending === 0 && R3.afterDiscard.row[0] === "RC-00001", R3);
  ok("R18 a coin with 2+ Receipts rows is refused: both rows kept, nothing written, still pending", /Receipt not changed/.test(R3.two.toast) && /AY-00097 has 2 rows/.test(R3.two.toast) &&
    R3.two.r9[0] === "RC-00007" && R3.two.r10[0] === "RC-00008" && R3.two.patches.length === 0 && R3.two.pending === 1 && R3.two.open, R3.two);
  ok("R19 the row changed since the form opened: refused, nothing blanked", /Receipt not changed/.test(R3.changed.toast) && /someone_else\.pdf/.test(R3.changed.toast) &&
    R3.changed.row[2] === "someone_else.pdf" && R3.changed.patches.length === 0, R3.changed);
  ok("R20 the row is already gone: says so, writes nothing", /already removed/.test(R3.gone.toast) && R3.gone.patches.length === 0 && R3.gone.pending === 0, R3.gone);

  // ---------- R21: removal + a new pick (Q6) --------------------------------
  const Q6 = await page.evaluate(async () => {
    const W = __rr; await W.install(); await W.openEditCoin(W.own);
    const out = {};
    // a) scan after a pending removal = a Replace; its ✕ goes back to the removal; Put it back restores
    await W.clickX("browseEdit"); W.clickGuard("Remove"); await W.sleep(60);
    await W.pick("browseEdit", "new99.pdf", "NEW99");
    out.aPick = { slot: W.slot("browseEdit"), p: pendingReceipts["AY-00099"] && { replaces: pendingReceipts["AY-00099"].replaces && pendingReceipts["AY-00099"].replaces.filename, after: pendingReceipts["AY-00099"].afterRemoval, remove: !!pendingReceipts["AY-00099"].remove } };
    await W.clickX("browseEdit");
    out.aDialog = W.guardText(); W.clickGuard("Take it off"); await W.sleep(60);
    out.aBack = { slot: W.slot("browseEdit"), remove: !!(pendingReceipts["AY-00099"] && pendingReceipts["AY-00099"].remove) };
    await W.putBack("browseEdit");
    out.aRestored = { slot: W.slot("browseEdit"), count: pendingReceiptCount("AY-00099") };
    // b) Binder after removing a scan replaces the stored scan; other coins untouched
    await W.openEditCoin(W.shared);
    await W.clickX("browseEdit"); W.clickGuard("Remove"); await W.sleep(60);
    await W.binderBtn("browseEdit");
    out.bPend = { slot: W.slot("browseEdit"), binder: !!(pendingReceipts["AY-00095"] && pendingReceipts["AY-00095"].binder), replaces: pendingReceipts["AY-00095"] && pendingReceipts["AY-00095"].replaces && pendingReceipts["AY-00095"].replaces.filename };
    await W.save("browseEdit");
    out.bRow = W.rcSheetRow(3); out.bOther = W.rcSheetRow(4); out.bToast = W.toast();
    // c) Binder removed, then Binder picked: cancels the removal, nothing to save
    await W.install(); await W.openEditCoin(W.binder);
    await W.clickX("browseEdit"); W.clickGuard("Remove"); await W.sleep(60);
    const had = pendingReceiptCount("AY-00093");
    await W.binderBtn("browseEdit");
    out.c = { had, count: pendingReceiptCount("AY-00093"), dim: W.dim("browseEdit"), slot: W.slot("browseEdit") };
    return out;
  });
  ok("R21a a scan picked after a removal is a Replace of the stored receipt (replaces + afterRemoval), not a removal", Q6.aPick.p.replaces === "AY-00099_receipt.pdf" && Q6.aPick.p.after && !Q6.aPick.p.remove && /Not saved yet/.test(Q6.aPick.slot.status), Q6.aPick);
  ok("R21b its ✕ goes back to the pending removal (not to the stored receipt)", /Take this pick off\?/.test(Q6.aDialog) && Q6.aBack.remove && Q6.aBack.slot.status === "Will be removed when you save.", { d: Q6.aDialog, b: Q6.aBack });
  ok("R21c Put it back then restores the stored receipt, nothing pending", Q6.aRestored.count === 0 && Q6.aRestored.slot.storedBtn && !Q6.aRestored.slot.putBackShown, Q6.aRestored);
  ok("R21d Binder after removing a scan replaces that scan: Save writes the Binder row with a NEW id, other coins on the old id untouched",
    Q6.bPend.binder && Q6.bPend.replaces === "shared.pdf" && Q6.bRow[2] === "Binder" && Q6.bRow[0] !== "RC-00002" && Q6.bOther[0] === "RC-00002" && Q6.bOther[2] === "shared.pdf" && /paper copy in the binder/.test(Q6.bToast), { p: Q6.bPend, r: Q6.bRow, o: Q6.bOther, t: Q6.bToast });
  ok("R21e a removed Binder + Binder picked again cancels the removal: nothing pending, Save dimmed", Q6.c.had === 1 && Q6.c.count === 0 && Q6.c.dim.clean && Q6.c.slot.removeShown, Q6.c);

  // ---------- R22: N is a fresh read; the index is the fallback -------------
  const R4 = await page.evaluate(async () => {
    const W = __rr; await W.install(); await W.openEditCoin(W.shared);
    const out = {};
    // a fourth coin appears on RC-00002 in the workbook only (not in the session index)
    W.rcGrid()[W.rcGrid().length - 1] = ["RC-00002", "AY-00053", "shared.pdf", 46004];
    await W.clickX("browseEdit");
    out.fresh = W.guardText(); W.clickGuard("Cancel"); await W.sleep(30);
    W.failRead = true;
    await W.clickX("browseEdit");
    out.fallback = W.guardText(); W.clickGuard("Cancel"); await W.sleep(30);
    W.failRead = false;
    return out;
  });
  ok("R22a the other-coins count is a fresh read (3 other coins, including one the session index does not know)", /This receipt is on 3 other coins/.test(R4.fresh), R4.fresh);
  ok("R22b when the read fails the session index is used and the dialog says the count may be out of date", /This receipt is on 2 other coins/.test(R4.fallback) && /may be out of date/.test(R4.fallback), R4.fallback);

  // ---------- S: Replace of a shared receipt ---------------------------------
  const S = await page.evaluate(async () => {
    const W = __rr; await W.install(); await W.openEditCoin(W.shared);
    const out = {};
    W.events = [];
    await W.pick("browseEdit", "new95.pdf", "NEW95");
    out.ask = W.guardText(); out.askBtns = W.guardButtons(); out.askEvents = W.events.slice();
    // Cancel drops the pick
    W.clickGuard("Cancel"); await W.sleep(40);
    out.cancelled = { count: pendingReceiptCount("AY-00095"), dim: W.dim("browseEdit"), slot: W.slot("browseEdit") };
    // This coin only
    await W.pick("browseEdit", "new95.pdf", "NEW95");
    W.clickGuard("This coin only"); await W.sleep(40);
    out.thisStatus = W.slot("browseEdit").status;
    W.uploads = []; W.deletes = [];
    await W.save("browseEdit");
    out.this = { r3: W.rcSheetRow(3), r4: W.rcSheetRow(4), r5: W.rcSheetRow(5), r8: W.rcSheetRow(8), uploads: W.uploads.slice(), deletes: W.deletes.slice(), old: await W.fileText("shared.pdf"), toast: W.toast() };
    // Replace on all
    await W.install(); await W.openEditCoin(W.shared);
    const rowsBefore = { r6: W.rcSheetRow(6), r7: W.rcSheetRow(7), r8: W.rcSheetRow(8), r2: W.rcSheetRow(2) };
    await W.pick("browseEdit", "new95.pdf", "NEW95");
    W.clickGuard("Replace on all 3 coins"); await W.sleep(40);
    out.allStatus = W.slot("browseEdit").status;
    out.allPending = pendingReceiptCount("AY-00095");
    W.uploads = []; W.deletes = []; W.patchAddrs = [];
    await W.save("browseEdit");
    out.all = {
      r3: W.rcSheetRow(3), r4: W.rcSheetRow(4), r5: W.rcSheetRow(5), rowsBefore, r6: W.rcSheetRow(6), r7: W.rcSheetRow(7), r8: W.rcSheetRow(8), r2: W.rcSheetRow(2),
      today: excelSerialToday(), uploads: W.uploads.slice(), deletes: W.deletes.slice(), old: await W.fileText("shared.pdf"), neu: await W.fileText("new95.pdf"),
      toast: W.toast(), idx51: LIVE_RECEIPTS["AY-00051"], idx52: LIVE_RECEIPTS["AY-00052"], idx62: LIVE_RECEIPTS["AY-00062"], idx95: LIVE_RECEIPTS["AY-00095"]
    };
    return out;
  });
  ok("S1 a pick over a shared receipt asks at pick time: title, '<id> · <file> is on 3 coins.', three buttons; nothing written yet",
    /Replace a shared receipt\?/.test(S.ask) && /RC-00002 · shared\.pdf is on 3 coins\./.test(S.ask) &&
    S.askBtns.join("|") === "Replace on all 3 coins|This coin only|Cancel" && S.askEvents.length === 0, { a: S.ask, b: S.askBtns, e: S.askEvents });
  ok("S2 Cancel drops the pick: nothing pending, Save dimmed", S.cancelled.count === 0 && S.cancelled.dim.clean && S.cancelled.slot.status === "", S.cancelled);
  ok("S3 'This coin only' shows in the slot", /on this coin only/.test(S.thisStatus), S.thisStatus);
  ok("S4 this coin only: this coin's row gets the new file and a NEW ReceiptID; the other coins keep RC-00002 and shared.pdf; the old file stays; nothing deleted",
    S.this.r3[2] === "new95.pdf" && /^RC-\d{5}$/.test(S.this.r3[0]) && S.this.r3[0] !== "RC-00002" &&
    S.this.r4[0] === "RC-00002" && S.this.r4[2] === "shared.pdf" && S.this.r5[0] === "RC-00002" && S.this.r5[2] === "shared.pdf" && S.this.r8[2] === "shared.pdf" &&
    S.this.old === "SHARED" && S.this.deletes.length === 0 && S.this.uploads.length === 1, S.this);
  ok("S5 'Replace on all' shows N in the slot", /on all 3 coins/.test(S.allStatus) && S.allPending === 1, S.allStatus);
  ok("S6 replace on all: all three rows get the new Filename, keep RC-00002, one upload",
    [S.all.r3, S.all.r4, S.all.r5].every(r => r[0] === "RC-00002" && r[2] === "new95.pdf") && S.all.uploads.length === 1 && S.all.uploads[0] === "new95.pdf", S.all);
  ok("S7 replace on all: the other coins' rows get TODAY's DateAdded too (Q3), and their CollectionIDs are unchanged",
    [S.all.r3, S.all.r4, S.all.r5].every(r => r[3] === S.all.today) && S.all.r4[1] === "AY-00051" && S.all.r5[1] === "AY-00052", { t: S.all.today, r4: S.all.r4, r5: S.all.r5 });
  ok("S8 replace on all never touches another ReceiptID's rows, even one with the SAME Filename (RC-00011 on shared.pdf) or another receipt",
    JSON.stringify(S.all.r8) === JSON.stringify(S.all.rowsBefore.r8) && S.all.r8[0] === "RC-00011" && S.all.r8[2] === "shared.pdf" &&
    JSON.stringify(S.all.r6) === JSON.stringify(S.all.rowsBefore.r6) && JSON.stringify(S.all.r7) === JSON.stringify(S.all.rowsBefore.r7) && JSON.stringify(S.all.r2) === JSON.stringify(S.all.rowsBefore.r2), S.all);
  ok("S9 replace on all: the old file is kept untouched, nothing deleted, the new file holds the new bytes",
    S.all.old === "SHARED" && S.all.neu === "NEW95" && S.all.deletes.length === 0, { o: S.all.old, n: S.all.neu, d: S.all.deletes });
  ok("S10 the toast reports the real number and the session index follows for every coin on the receipt (and not for RC-00011)",
    S.all.toast === "Saved AY-00095 — receipt replaced on 3 coins (RC-00002)." && S.all.idx51.filename === "new95.pdf" && S.all.idx52.filename === "new95.pdf" &&
    S.all.idx95.filename === "new95.pdf" && S.all.idx62.filename === "shared.pdf", { t: S.all.toast, i51: S.all.idx51, i62: S.all.idx62 });

  // ---------- S11-S16: more shared-Replace cases ------------------------------
  const S2 = await page.evaluate(async () => {
    const W = __rr; await W.install();
    const out = {};
    // not shared: no dialog, today's behaviour (keeps RC-00001)
    await W.openEditCoin(W.own);
    await W.pick("browseEdit", "mine99.pdf", "MINE99");
    out.notSharedDialog = W.guardOpen();
    await W.save("browseEdit");
    out.notShared = W.rcSheetRow(2);
    // pick A (all), pick B asks again, Cancel returns to A with scope all
    await W.install(); await W.openEditCoin(W.shared);
    await W.pick("browseEdit", "a95.pdf", "AAA");
    W.clickGuard("Replace on all 3 coins"); await W.sleep(40);
    await W.pick("browseEdit", "b95.pdf", "BBB");
    out.askedAgain = W.guardOpen();
    W.clickGuard("Cancel"); await W.sleep(40);
    const p = pendingReceipts["AY-00095"];
    out.backToA = { name: p && p.prepared.filename, scope: p && p.scope, status: W.slot("browseEdit").status };
    // a pick over a stored Binder: no scope question (Binder is not shared)
    await W.install(); await W.openEditCoin(W.binder);
    await W.pick("browseEdit", "scan93.pdf", "S93");
    out.binderDialog = W.guardOpen();
    // the same document picked on a shared coin: still asks, Save says it is already on file (Q8)
    await W.install(); await W.openEditCoin(W.shared);
    await W.pick("browseEdit", "shared.pdf", "SHARED");
    out.sameAsked = W.guardOpen(); W.clickGuard("Replace on all 3 coins"); await W.sleep(40);
    W.events = []; W.uploads = [];
    await W.save("browseEdit");
    out.same = { toast: W.toast(), events: W.events.slice(), r3: W.rcSheetRow(3), r4: W.rcSheetRow(4) };
    // a failed Save keeps the pick (scope all); the retry finishes all rows with ONE upload in total
    await W.install(); await W.openEditCoin(W.shared);
    await W.pick("browseEdit", "retry95.pdf", "RETRY");
    W.clickGuard("Replace on all 3 coins"); await W.sleep(40);
    W.failPatchSheet = "Receipts"; W.failPatchOnce = true;
    W.uploads = [];
    await W.save("browseEdit");
    out.failed = { toast: W.toast(), pending: pendingReceiptCount("AY-00095"), scope: pendingReceipts["AY-00095"] && pendingReceipts["AY-00095"].scope, open: W.editOpen() };
    await W.save("browseEdit");
    out.retried = { rows: [W.rcSheetRow(3), W.rcSheetRow(4), W.rcSheetRow(5)], uploads: W.uploads.slice(), toast: W.toast() };
    return out;
  });
  ok("S11 a coin whose receipt is not shared gets no question and keeps its ReceiptID on a replace (as before)", S2.notSharedDialog === false && S2.notShared[0] === "RC-00001" && S2.notShared[2] === "mine99.pdf", S2);
  ok("S12 it asks EACH time: pick B asks again, Cancel goes back to pick A with its 'all' choice", S2.askedAgain && S2.backToA.name === "a95.pdf" && S2.backToA.scope === "all" && /on all 3 coins/.test(S2.backToA.status), S2.backToA);
  ok("S13 a scan over a stored Binder asks nothing", S2.binderDialog === false, S2.binderDialog);
  ok("S14 the same document on a shared coin still asks; at Save it is 'already on file', nothing written, all rows as they were (Q8)",
    S2.sameAsked && /already on file/.test(S2.same.toast) && S2.same.events.length === 0 && S2.same.r3[2] === "shared.pdf" && S2.same.r4[2] === "shared.pdf", S2.same);
  ok("S15 a failed Save keeps the pick with its choice and the form open", /Receipt not saved/.test(S2.failed.toast) && S2.failed.pending === 1 && S2.failed.scope === "all" && S2.failed.open, S2.failed);
  ok("S16 the retry finishes all three rows and the file was uploaded once in total (no second copy)",
    S2.retried.rows.every(r => r[0] === "RC-00002" && r[2] === "retry95.pdf") && S2.retried.uploads.length === 1 && /receipt replaced on 3 coins/.test(S2.retried.toast), S2.retried);

  // ---------- Q4: replace on all, picked bytes already filed under another id
  const Q4 = await page.evaluate(async () => {
    const W = __rr; await W.install(); await W.openEditCoin(W.shared);
    await W.pick("browseEdit", "claimed.pdf", "CLAIMED");
    W.clickGuard("Replace on all 3 coins"); await W.sleep(40);
    W.uploads = []; W.deletes = [];
    await W.save("browseEdit");
    return { rows: [W.rcSheetRow(3), W.rcSheetRow(4), W.rcSheetRow(5)], rc10: W.rcSheetRow(7), uploads: W.uploads.slice(), deletes: W.deletes.slice(), toast: W.toast(), n: W.rcGrid().length };
  });
  ok("Q4a the rows keep RC-00002 and now point at the existing claimed.pdf; nothing uploaded, no merge", Q4.rows.every(r => r[0] === "RC-00002" && r[2] === "claimed.pdf") && Q4.uploads.length === 0 && Q4.deletes.length === 0, Q4);
  ok("Q4b RC-00010's own row is untouched and the toast says RC-00002 was kept and the file is also RC-00010's",
    Q4.rc10[0] === "RC-00010" && Q4.rc10[1] === "AY-00061" && Q4.rc10[2] === "claimed.pdf" && Q4.rc10[3] === 46000 && /RC-00002 kept/.test(Q4.toast) && /RC-00010/.test(Q4.toast), { r: Q4.rc10, t: Q4.toast });

  // ---------- U: the _02 fix -------------------------------------------------
  const U = await page.evaluate(async () => {
    const W = __rr; await W.install();
    const out = {};
    // a file in CoinReceipts that no row claims, same bytes -> reused with a new id
    await W.openEditCoin(W.none);
    await W.pick("browseEdit", "stray.pdf", "STRAY");
    W.uploads = []; W.deletes = [];
    await W.save("browseEdit");
    out.same = { row: W.rcRows("AY-00094")[0], uploads: W.uploads.slice(), deletes: W.deletes.slice(), toast: W.toast(), stray: await W.fileText("stray.pdf"), twoCopy: await W.fileText("stray_02.pdf") };
    // same name, DIFFERENT bytes -> still the next free name, the stray untouched
    await W.install(); await W.openEditCoin(W.none);
    await W.pick("browseEdit", "stray.pdf", "DIFFERENT");
    W.uploads = [];
    await W.save("browseEdit");
    out.diff = { row: W.rcRows("AY-00094")[0], uploads: W.uploads.slice(), stray: await W.fileText("stray.pdf"), copy: await W.fileText("stray_02.pdf") };
    // a coin with its own unshared receipt: the reused file still gets a NEW ReceiptID
    await W.install(); await W.openEditCoin(W.own);
    await W.pick("browseEdit", "stray.pdf", "STRAY");
    W.uploads = [];
    await W.save("browseEdit");
    out.own = { row: W.rcSheetRow(2), uploads: W.uploads.slice(), rows: W.rcRows("AY-00099").length };
    return out;
  });
  ok("U1 the file already in CoinReceipts with no row and the same bytes is reused: nothing uploaded, no _02 copy, the file untouched",
    U.same.uploads.length === 0 && U.same.twoCopy === null && U.same.stray === "STRAY" && U.same.deletes.length === 0, U.same);
  ok("U2 it gets a NEW ReceiptID and a row naming stray.pdf", U.same.row && U.same.row[2] === "stray.pdf" && /^RC-\d{5}$/.test(U.same.row[0]) && !["RC-00001", "RC-00002", "RC-00007", "RC-00008", "RC-00009", "RC-00010", "RC-00011", "RC-00020", "RC-00038"].includes(U.same.row[0]) && /receipt added/.test(U.same.toast), { r: U.same.row, t: U.same.toast });
  ok("U3 the same name with DIFFERENT bytes still takes the next free name and leaves the stray alone", U.diff.uploads.join() === "stray_02.pdf" && U.diff.stray === "STRAY" && U.diff.copy === "DIFFERENT" && U.diff.row[2] === "stray_02.pdf", U.diff);
  ok("U4 a coin that already had a receipt: the reused file replaces its row with a NEW ReceiptID (not RC-00001)", U.own.row[2] === "stray.pdf" && U.own.row[0] !== "RC-00001" && U.own.uploads.length === 0 && U.own.rows === 1, U.own);
}, module);
