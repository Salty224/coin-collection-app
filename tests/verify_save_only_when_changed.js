// Save only when something changed (task z, Oct 2026,
// claude/save-only-when-changed).
//
// WHY. The "changed" test used to be a set of boxes the user had touched,
// which only ever grew: type something and put it back and the form still
// counted as changed (and Save was never dimmed on any form). Now a form is
// dirty only while it differs from what it was loaded with, in the shape
// Save would write; Edit Coin, Edit Set and the Staging-draft edit dim Save
// ("No changes to save.") while clean; a label edit on a photo already in a
// Staging draft counts; a clean Save click writes nothing.
//
//   A   Edit Coin fields: open is clean; type + put back; 1 vs 1.00; trimmed
//       text; select and back; Grade Other box; CAC pair; Status; date;
//       Gifted Sale Price (Q4); an app-made change is never dirty; conflict
//       re-base; a clean Save click writes nothing (Q6)
//   B   Edit Coin photos and labels: Replace + Put it back; add + X; X on a
//       saved photo then Discard; label edit and revert
//   C   Edit Coin saves: a failed photo after saved fields leaves only the
//       photo dirty; the button belongs to a Save in flight
//   D   Edit Set: numbers, text, Gifted, a label, a clean Save click
//   E   Manage Photos keeps hiding Save when clean
//   F   Add Coin (new coin): typed then cleared is clean for the guard; Save
//       stays enabled (Q2)
//   G   Staging-draft edit: open is clean; field revert; Replace + Put it
//       back; Recrop-free label edit counted and reverted; X; receipt; a
//       failed half-pair save keeps the pick dirty; a clean Save writes
//       nothing and the button

const { defineSuite, APP_URL } = require("./harness");

const HEADER = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "", "OriginalFilename"];
const ALL_HEADERS = ["CollectionID", "Year", "MintMark", "Denomination", "Variety", "Description",
  "Value", "Cost", "Shipping", "Seller_Link", "PurchaseDate", "StorageLocation", "Container",
  "Grade", "GradeSource", "Designation", "SerNo", "CACBean", "Remarks", "Reviewed", "LastModified",
  "Finish", "CoinID", "Status", "SaleDate", "SalePrice", "Buyer", "Platform"];

async function setup(page) {
  await page.evaluate(({ HEADER, ALL_HEADERS }) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
    window.__ws = {
      HEADER, ALL_HEADERS, sleep,
      graphCalls: 0, patches: [], mock: null, uploadGate: null, failUpload: false, failNames: {}, uploads: [],
      coin: { id: "AY-00099", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" },
      set: { id: "AY-00090", name: "1957 Proof Set", denom: "Multiple", year: 1957, mint: "", category: "Proof Set" },
      install() {
        const self = this;
        // Whatever the last block left unsaved goes first, without asking
        // (C2: leaving an editing screen with unsaved edits asks).
        const ov0 = document.getElementById("writeGuardOverlay"); if (ov0) ov0.classList.add("hidden");
        discardUnsavedPhotoEdits(); browseEditTouchedFields.clear();
        navigateNow("dashboard");
        // Column H has a blank header: it is NOT in the header map. Its
        // cells carry "keep-me" so a whole-row rewrite would show as blanked.
        const allRow = ["AY-00099", 1916, "D", "10C", "", "Mercury Dime", 40, 30, 0, "", null,
          "Safe", "", "VF-20", "Owner", "", "", "", "", "", null,
          "Business Strike", "C-1916-D-10C-01", "Owned", null, null, "", ""];
        const mock = createMockGraphClient({ sheets: {
          All: [ALL_HEADERS, allRow],
          Photos: [
            HEADER,
            ["PH-00001", "AY-00099", "Obverse", "", "AY-00099_obverse_cropped.jpg", "", 46000, "keep-me", ""],
            ["PH-00002", "AY-00099", "Reference", "", "AY-00099_reference_01.jpg", "PCGS photo", 46000, "keep-me", ""],
            ["PH-00003", "AY-00099", "Other", "", "AY-00099_other_01.jpg", "", 46001, "keep-me", ""],
            ["PH-00010", "AY-00090", "OGP_Obverse", "", "AY-00090_ogp_obverse.jpg", "", 46000, "keep-me", ""],
            ["PH-00011", "AY-00090", "COA", "", "AY-00090_coa_01.jpg", "page 1", 46000, "keep-me", ""],
            ["", "", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", "", ""],
          ] } });
        this.mock = mock;
        this.patches = []; this.calls = [];
        this.uploadGate = null; this.failUpload = false; this.failNames = {}; this.uploads = [];
        __setGraphClientForTest(new Proxy(mock, { get(t, k) {
          const v = t[k];
          if (typeof v !== "function") return v;
          return async (...a) => {
            self.graphCalls++; self.calls.push(k);
            if (k === "uploadFile") {
              if (self.uploadGate) await self.uploadGate;
              const name = String(a[0]).split("/").pop();
              if (self.failUpload || self.failNames[name]) throw new Error("offline");
              self.uploads.push(name);
            }
            if (k === "patchWorkbookRanges") self.patches.push(a[1] + "!" + a[2].map(e => e.address).join(","));
            return v.apply(t, a);
          };
        } }));
        __resetSheetHeaderMapsForTest();
        __resetAllHeaderMapForTest();
        __setAddCoinWriteEnabledForTest(true);
        __setBrowseEditWriteEnabledForTest(true);
        __setLiveCoinsForTest([this.coin, this.set]);
        __setStoredPhotosForTest({
          "AY-00099": [
            { photoId: "PH-00001", photoType: "Obverse", galleryType: "obverse", subGroupId: "", filename: "AY-00099_obverse_cropped.jpg", originalFilename: "", label: "" },
            { photoId: "PH-00002", photoType: "Reference", galleryType: "reference", subGroupId: "", filename: "AY-00099_reference_01.jpg", originalFilename: "", label: "PCGS photo" },
            { photoId: "PH-00003", photoType: "Other", galleryType: "other", subGroupId: "", filename: "AY-00099_other_01.jpg", originalFilename: "", label: "" },
          ],
          "AY-00090": [
            { photoId: "PH-00010", photoType: "OGP_Obverse", galleryType: "ogp_obverse", subGroupId: "", filename: "AY-00090_ogp_obverse.jpg", originalFilename: "", label: "" },
            { photoId: "PH-00011", photoType: "COA", galleryType: "coa", subGroupId: "", filename: "AY-00090_coa_01.jpg", originalFilename: "", label: "page 1" },
          ],
        });
        const url = () => URL.createObjectURL(new Blob([new Uint8Array([1])], { type: "image/jpeg" }));
        ["AY-00099_obverse_cropped.jpg", "AY-00099_reference_01.jpg", "AY-00099_other_01.jpg",
         "AY-00090_ogp_obverse.jpg", "AY-00090_coa_01.jpg"].forEach(f => __setCoinPhotoCacheForTest(f, url()));
        delete galleryStore["AY-00099"]; delete galleryStore["AY-00090"];
        closeImageSourceChooser();
        const ov = document.getElementById("writeGuardOverlay"); if (ov) ov.classList.add("hidden");
        this.clearToast();
        this.graphCalls = 0;
      },
      row(pid) { return this.mock._grids.Photos.find(r => r[0] === pid) || null; },
      allRow() { return this.mock._grids.All[1]; },
      allCell(name) { return this.mock._grids.All[1][ALL_HEADERS.indexOf(name)]; },
      photoPatches() { return this.patches.filter(p => p.indexOf("Photos!") === 0); },
      allPatches() { return this.patches.filter(p => p.indexOf("All!") === 0); },
      rowCount() { return this.mock._grids.Photos.filter(r => r[0]).length; },
      gridLength() { return this.mock._grids.Photos.length; },
      openAll(hostId) {
        const host = document.getElementById(hostId);
        [...host.querySelectorAll(".accordion-header")].forEach(h => { if (h.getAttribute("aria-expanded") !== "true") h.click(); });
        return host;
      },
      closeOverlays() {
        if (typeof closeBgCrop === "function") closeBgCrop();
        document.getElementById("photoAdjustOverlay").classList.add("hidden");
      },
      async openEditCoin() {
        navigate("browse"); showBrowseDetail(this.coin); showBrowseEditView(this.coin);
        await loadBrowseEditSnapshot(this.coin);
        await sleep(120);
        const oh = document.getElementById("editCoinPhotosHeader");
        if (oh.getAttribute("aria-expanded") !== "true") oh.click();
        this.closeOverlays();
        return this.openAll("browseEditPhotosSections");
      },
      editHost() { return this.openAll("browseEditPhotosSections"); },
      openManageCoin(backTo) {
        openManagePhotos({ id: this.coin.id, name: "x", meta: this.coin.id, kind: "coin", backTo: backTo || (() => {}) });
        this.closeOverlays();
        return this.openAll("managePhotosSections");
      },
      openEditSet() {
        navigate("browse"); showBrowseDetail(this.set); showBrowseEditSetView(this.set);
        const oh = document.getElementById("editSetPhotosHeader");
        if (oh.getAttribute("aria-expanded") !== "true") oh.click();
        this.closeOverlays();
        return this.openAll("editSetPhotosSections");
      },
      openManageSet(backTo) {
        openManagePhotos({ id: this.set.id, name: "x", meta: this.set.id, kind: "set", backTo: backTo || (() => {}) });
        this.closeOverlays();
        return this.openAll("managePhotosSections");
      },
      // A photo's label line (Oct 2026: the label is edited in the
      // full-screen viewer, which the line or the photo opens).
      boxFor(host, filename) {
        const t = [...host.querySelectorAll(".gc-thumb")].find(x => x.dataset.file === filename);
        return t ? t.querySelector(".gc-label-line") : null;
      },
      val(line) { return line ? line.title : null; },
      entry(targetId, filename) { return galleryFor(targetId).find(e => (e.storedFilename || e.filename) === filename) || null; },
      // Tap the label line, type in the viewer's field, tap Done.
      type(line, text) {
        if (!line) return false;
        line.click();
        const lab = document.getElementById("mediaViewerLabel");
        if (lab.classList.contains("hidden")) return false;
        const input = document.getElementById("mediaViewerLabelInput");
        input.focus(); input.value = text; input.dispatchEvent(new Event("input", { bubbles: true }));
        document.getElementById("mediaViewerLabelDone").click();
        return true;
      },
      // Typing in the field and leaving it (no Done) applies nothing.
      blur(line) {
        if (!line) return false;
        line.click();
        const input = document.getElementById("mediaViewerLabelInput");
        input.focus(); input.dispatchEvent(new Event("change", { bubbles: true })); input.blur();
        closeMediaViewer();
        return true;
      },
      // Enter in the field applies the text (Done).
      enter(line) {
        if (!line) return false;
        line.click();
        const input = document.getElementById("mediaViewerLabelInput");
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        return true;
      },
      typeNotes(text) {
        const n = document.getElementById("browseEditNotes");
        n.value = text; n.dispatchEvent(new Event("input", { bubbles: true }));
      },
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
      // Done when the Save has run and released its lock (the button itself may stay dimmed once nothing is left to save, task z).
      async save() { document.getElementById("browseEditSaveBtn").click(); await sleep(60); await this.waitFor(() => !editSaveInFlight, 3000); await sleep(150); },
      async waitFor(fn, ms) { const end = Date.now() + (ms || 3000); while (Date.now() < end) { if (fn()) return true; await sleep(30); } return !!fn(); },
      async jpeg() {
        const c = document.createElement("canvas"); c.width = 300; c.height = 300;
        const x = c.getContext("2d"); x.fillStyle = "#2a6"; x.fillRect(0, 0, 300, 300);
        const b = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
        return new File([b], "coin.jpg", { type: "image/jpeg" });
      },
      chooserOpen() { const o = document.getElementById("imageSourceChooser"); return !!o && !o.classList.contains("hidden"); },
      pickVia(trigger, file) {
        if (!trigger) return false;
        trigger.click();
        if (!this.chooserOpen()) return false;
        const btn = document.querySelector('#imageSourceChooser .image-chooser-btn[data-source="files"]');
        if (!btn) return false;
        btn.click();
        const input = document.getElementById("imageChooserFilesInput");
        const dt = new DataTransfer(); dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      },
      async finishCrop() {
        const open = (id) => { const o = document.getElementById(id); return !!o && !o.classList.contains("hidden"); };
        if (!(await this.waitFor(() => open("bgCropOverlay")))) return false;
        document.getElementById("bgCropUseBtn").click();
        if (await this.waitFor(() => open("photoAdjustOverlay"), 1200)) document.getElementById("photoAdjustUseBtn").click();
        return true;
      },
      section(host, re) {
        const h = [...host.querySelectorAll(".accordion-header")].find(x => re.test(x.textContent));
        return h ? h.nextElementSibling : null;
      },
    };
  }, { HEADER, ALL_HEADERS });
}


const CATALOG = [
  { denom: "5C", year: 1938, mint: "D", variety: "", description: "Buffalo Nickel",
    finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0,
    coinId: "C-1938-D-5C-01", composition: "75% Copper, 25% Nickel" },
  { denom: "5C", year: 1938, mint: "D", variety: "D/S", description: "Buffalo Nickel",
    finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0,
    coinId: "C-1938-D-5C-02", composition: "75% Copper, 25% Nickel" }
];

const ID = "AY-00754";

const BASE_DRAFT = {
  type: "coin", version: 1, collectionID: ID, status: "Draft",
  denom: "5C", category: "", year: "1938", mint: "D", variety: "",
  description: "Buffalo Nickel", finish: "Business Strike", designation: "",
  errorDesc: "", grade: "PR-66", gradeSource: "PCGS", serNo: "44556677",
  cacBean: "", cost: 30, shippingCost: 5, purchaseDate: "2026-10-20",
  vendor: "Seller", storageLocation: "Safe", container: "",
  assignAlbum: "", remarks: "", itemNumber: "", gsid: "",
  coinId: "C-1938-D-5C-01", matchedHow: "single",
  photos: [], receiptPhoto: ID + "_receipt.pdf",
  researchNote: "", allRowWritten: false, forceAdded: false, filesMovedOnPromotion: false,
  savedVia: "staging",
  createdDate: "2026-10-20T17:57:36Z"
};


module.exports = defineSuite("save-only-when-changed", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check; selfCheck(ok);
  const __c = (s) => !!s && s.disabled && s.dim && s.hint && s.counts === null;   // clean: dimmed, hint, nothing unsaved
  const __d = (s) => !!s && !s.disabled && !s.dim && !s.hint && s.counts !== null; // dirty: enabled, no hint, something unsaved
  const page = await openApp(PHONE);
  await setup(page);
  const addExtras = () => page.evaluate(() => {
    const W = __ws;
    W.thumb = (host, file) => [...host.querySelectorAll(".gc-thumb")].find(x => x.dataset.file === file) || null;
    W.slotFor = (host, re, label) => {
      const b = W.section(host, re); if (!b) return null;
      return [...b.querySelectorAll(".sg-photo-slot")].find(s => (s.textContent || "").indexOf(label) !== -1) || null;
    };
    W.addVia = async (trigger) => { const f = await W.jpeg(); if (!W.pickVia(trigger, f)) return false; return W.finishCrop(); };
    W.plus = (host, re) => { const b = W.section(host, re); return b ? [...b.querySelectorAll("button")].find(x => /Add|＋|\+/.test(x.getAttribute("aria-label") || x.textContent)) : null; };
    W.obv = (host) => W.slotFor(host, /Obverse/, "Obverse") || W.slotFor(host, /Obverse/, "Front");
    // How a Save button looks: disabled + dimmed + hint = clean.
    W.state = (btnId, hintId) => {
      const b = document.getElementById(btnId), h = document.getElementById(hintId);
      const u = unsavedEditsForView();
      return { disabled: b.disabled, dim: b.classList.contains("is-clean"), hint: h.classList.contains("show"),
        hintText: h.textContent, counts: u ? u.counts : null };
    };
    W.cs = () => W.state("browseEditSaveBtn", "browseEditSaveHint");
    W.ss = () => W.state("browseEditSetSaveBtn", "editSetSaveHint");
    W.setv = (id, v, evt) => { const n = document.getElementById(id); n.value = v; n.dispatchEvent(new Event(evt || "input", { bubbles: true })); };
    W.isClean = (s) => s.disabled && s.dim && s.hint && s.counts === null;
    W.isDirty = (s) => !s.disabled && !s.dim && !s.hint && s.counts !== null;
  });
  // A clean page for each group, so a group cannot be disturbed by what an earlier one left behind.
  const fresh = async () => { await page.goto(APP_URL, { waitUntil: "load" }); await page.waitForTimeout(600); await setup(page); await addExtras(); };
  await addExtras();

  // ---------- A  Edit Coin fields ---------------------------------------------
  const A = await page.evaluate(async () => {
    const W = __ws; const out = {};
    W.install(); await W.openEditCoin();
    out.open = W.cs();
    W.setv("browseEditNotes", "hello"); out.typed = W.cs();
    W.setv("browseEditNotes", ""); out.back = W.cs();
    // numbers: Cost loaded 30
    const cost = document.getElementById("browseEditCost").value;
    W.setv("browseEditCost", "30.00"); out.cost3000 = W.cs();
    W.setv("browseEditCost", "31"); out.cost31 = W.cs();
    W.setv("browseEditCost", cost); out.costBack = W.cs();
    // trimmed text
    const d = document.getElementById("browseEditDescription").value;
    W.setv("browseEditDescription", "  " + d + "  "); out.trim = W.cs();
    W.setv("browseEditDescription", d + " x"); out.wsReal = W.cs();
    W.setv("browseEditDescription", d); out.descBack = W.cs();
    // select and back
    const dn = document.getElementById("browseEditDenomination"), dv = dn.value;
    W.setv("browseEditDenomination", "5C", "change"); out.denom = W.cs();
    W.setv("browseEditDenomination", dv, "change"); out.denomBack = W.cs();
    // Grade: Other box and back
    const gf = document.getElementById("browseEditGradeFrom"), gv = gf.value;
    W.setv("browseEditGradeFrom", "__other__", "change");
    W.setv("browseEditGradeOther", "XF Details"); out.gradeOther = W.cs();
    W.setv("browseEditGradeFrom", gv, "change"); out.gradeBack = W.cs();
    // CAC pair toggled twice
    const g = document.getElementById("browseEditCacGreen");
    g.checked = true; g.dispatchEvent(new Event("change", { bubbles: true })); out.cac = W.cs();
    g.checked = false; g.dispatchEvent(new Event("change", { bubbles: true })); out.cacBack = W.cs();
    // Status and back
    const st = document.getElementById("browseEditStatus"), sv = st.value;
    W.setv("browseEditStatus", "Sold", "change"); out.status = W.cs();
    W.setv("browseEditStatus", sv, "change"); out.statusBack = W.cs();
    // date set then cleared
    W.setv("browseEditPurchaseDate", "2026-01-02"); out.date = W.cs();
    W.setv("browseEditPurchaseDate", ""); out.dateBack = W.cs();
    // Q4 Gifted
    W.setv("browseEditStatus", "Gifted", "change");
    out.giftedPrice = document.getElementById("browseEditSalePrice").value; out.gifted = W.cs();
    W.setv("browseEditStatus", sv, "change");
    out.giftedOffPrice = document.getElementById("browseEditSalePrice").value; out.giftedOff = W.cs();
    W.setv("browseEditStatus", "Gifted", "change"); W.setv("browseEditSalePrice", "5");
    W.setv("browseEditStatus", sv, "change");
    out.typedPriceKept = document.getElementById("browseEditSalePrice").value; out.typedPrice = W.cs();
    return out;
  });
  ok("A1 Edit Coin opens clean: Save disabled and dimmed, \"No changes to save.\" shown, guard says nothing unsaved",
    A.open.disabled && A.open.dim && A.open.hint && A.open.hintText === "No changes to save." && A.open.counts === null, A.open);
  ok("A2 typing enables Save (hint gone, 1 field); typing the original back makes it clean again", __d(A.typed) && __c(A.back), [A.typed, A.back]);
  ok("A3 numbers: 30.00 is the loaded 30 (clean), 31 is a change, putting 30 back is clean", __c(A.cost3000) && __d(A.cost31) && __c(A.costBack), [A.cost3000, A.cost31, A.costBack]);
  ok("A4 text: leading/trailing spaces are not a change; a real edit is; putting it back is clean", __c(A.trim) && __d(A.wsReal) && __c(A.descBack), [A.trim, A.wsReal, A.descBack]);
  ok("A5 a dropdown changed and put back is clean", __d(A.denom) && __c(A.denomBack), [A.denom, A.denomBack]);
  ok("A6 Grade Other box typed then the dropdown put back is clean", __d(A.gradeOther) && __c(A.gradeBack), [A.gradeOther, A.gradeBack]);
  ok("A7 CAC Bean checked then unchecked is clean", __d(A.cac) && __c(A.cacBack), [A.cac, A.cacBack]);
  ok("A8 Status changed and put back is clean", __d(A.status) && __c(A.statusBack), [A.status, A.statusBack]);
  ok("A9 a date entered then cleared is clean", __d(A.date) && __c(A.dateBack), [A.date, A.dateBack]);
  ok("A10 Gifted fills Sale Price 0 (a change); Status moved off Gifted with the price untouched takes the 0 back: clean",
    A.giftedPrice === "0" && __d(A.gifted) && A.giftedOffPrice === "" && __c(A.giftedOff), A);
  ok("A11 a Sale Price the user typed stays when Status leaves Gifted, and counts", A.typedPriceKept === "5" && __d(A.typedPrice), A.typedPrice);

  const A2 = await page.evaluate(async () => {
    const W = __ws; const out = {};
    W.install(); await W.openEditCoin();
    // An app-made change (the live row landing with other values) is never dirty.
    const vals = Object.assign({}, browseEditSnapshot.values, { Remarks: "changed elsewhere", Cost: 77 });
    applySnapshotToEditForm(vals, W.coin);
    out.programmatic = { notes: document.getElementById("browseEditNotes").value, state: W.cs() };
    // Conflict re-base: a touched Notes is re-based onto the row's value.
    W.typeNotes("mine");
    out.mine = W.cs();
    resolveConflictAndRebaseline(W.coin, Object.assign({}, browseEditSnapshot.values, { Remarks: "theirs" }));
    out.afterConflict = { notes: document.getElementById("browseEditNotes").value, state: W.cs() };
    W.typeNotes("theirs");
    out.matchesRow = W.cs();
    // Q6: a clean Save click writes nothing.
    W.install(); await W.openEditCoin();
    const btn = document.getElementById("browseEditSaveBtn");
    W.clearToast(); W.graphCalls = 0; btn.disabled = false; btn.click();
    await W.sleep(150);
    out.cleanClick = { toast: W.toast(), calls: W.graphCalls, patches: W.patches.length, stillOpen: W.editOpen(), cellLM: W.allCell("LastModified") };
    return out;
  });
  ok("A12 the live row landing in the form is not a change, whatever the app does to a box",
    A2.programmatic.notes === "changed elsewhere" && __c(A2.programmatic.state), A2.programmatic);
  ok("A13 after a conflict re-base the user's untouched-by-row text is dirty against the row's value, and typing the row's value is clean",
    A2.afterConflict.notes === "mine" && __d(A2.afterConflict.state) && __c(A2.matchesRow), A2);
  ok("A14 a Save click on a clean form: toast \"No changes to save.\", no Graph call, no patch, LastModified untouched, form stays open",
    A2.cleanClick.toast === "No changes to save." && A2.cleanClick.calls === 0 && A2.cleanClick.patches === 0 &&
    A2.cleanClick.stillOpen && !A2.cleanClick.cellLM, A2.cleanClick);

  // ---------- B  Edit Coin photos and labels ------------------------------------
  await fresh();
  const B = await page.evaluate(async () => {
    const W = __ws; const out = {};
    W.install(); let host = await W.openEditCoin();
    const saved = galleryFor("AY-00099").find(e => e.type === "obverse");
    // Replace, then Put it back
    out.rep = await W.addVia(W.obv(host).querySelector('[data-act="replace"]'));
    await W.sleep(120); host = W.editHost(); out.repState = W.cs();
    await W.sleep(400); W.obv(host).querySelector('[data-act="remove"]').click(); W.clickGuard("Put it back");
    await W.sleep(100); host = W.editHost(); out.undoState = W.cs();
    out.restored = galleryFor("AY-00099").find(e => e.type === "obverse") === saved;
    // add a Reference pick, then X it
    await W.addVia(W.plus(host, /Reference/)); await W.sleep(100); host = W.editHost(); out.addState = W.cs();
    const pick = [...W.section(host, /Reference/).querySelectorAll(".gc-thumb")].find(t => /Not saved yet/.test(t.textContent));
    pick.querySelector(".gc-remove").click(); W.clickGuard("Remove"); await W.sleep(80); host = W.editHost(); out.addRemoved = W.cs();
    // X on a saved photo, then Discard brings it back
    const ref = W.thumb(host, "AY-00099_reference_01.jpg");
    ref.querySelector(".gc-remove").click(); W.clickGuard("Remove"); await W.sleep(80); out.xSaved = W.cs();
    discardUnsavedPhotoEdits("AY-00099"); refreshEditSaveState(); out.discarded = W.cs();
    // label edit and revert
    renderManagePhotosInto("browseEditPhotosSections", buildManagePhotosCtx(W.coin), { showSetChildren: false });
    host = W.editHost();
    W.type(W.boxFor(host, "AY-00099_reference_01.jpg"), "new label"); out.label = W.cs();
    W.type(W.boxFor(host, "AY-00099_reference_01.jpg"), "PCGS photo"); out.labelBack = W.cs();
    return out;
  });
  ok("B1 Replace enables Save (1 photo); ✕ + Put it back returns the form to loaded: dimmed again",
    B.rep && __d(B.repState) && B.repState.counts.photos === 1 && B.restored && __c(B.undoState), B);
  ok("B2 a new photo enables Save; ✕ on that never-saved pick makes it clean", __d(B.addState) && __c(B.addRemoved), [B.addState, B.addRemoved]);
  ok("B3 ✕ on a saved photo enables Save; Discard brings it back and Save dims", __d(B.xSaved) && __c(B.discarded), [B.xSaved, B.discarded]);
  ok("B4 a label edit enables Save (1 photo label); typing the saved label back is clean", __d(B.label) && B.label.counts.labels === 1 && __c(B.labelBack), [B.label, B.labelBack]);

  // ---------- E  Manage Photos keeps hiding Save ---------------------------------
  await fresh();
  const E = await page.evaluate(async () => {
    const W = __ws; const out = {};
    W.install(); let host = W.openManageCoin(); await W.sleep(60); host = W.openAll("managePhotosSections");
    const shown = () => document.getElementById("managePhotosSaveLabelsBtn").style.display !== "none";
    out.open = shown();
    W.type(W.boxFor(host, "AY-00099_reference_01.jpg"), "zzz"); out.label = shown();
    W.type(W.boxFor(host, "AY-00099_reference_01.jpg"), "PCGS photo"); out.labelBack = shown();
    out.rep = await W.addVia(W.obv(host).querySelector('[data-act="replace"]'));
    await W.sleep(100); host = W.openAll("managePhotosSections"); out.replaced = shown();
    await W.sleep(400); W.obv(host).querySelector('[data-act="remove"]').click(); W.clickGuard("Put it back"); await W.sleep(100); out.undone = shown();
    navigateNow("dashboard"); await W.sleep(300); // leave Manage Photos before the next block
    return out;
  });
  ok("E1 Manage Photos: Save hidden when clean, shown for a label or a Replace, hidden again when put back",
    !E.open && E.label && !E.labelBack && E.rep && E.replaced && !E.undone, E);

  // ---------- C  Edit Coin saves ----------------------------------------------
  await fresh();
  const C = await page.evaluate(async () => {
    const W = __ws; const out = {};
    // fields saved, photo fails: only the photo stays dirty
    W.install(); let host = await W.openEditCoin();
    W.setv("browseEditCost", "31");
    await W.addVia(W.plus(host, /Reference/)); await W.sleep(100);
    out.before = W.cs();
    W.failUpload = true;
    document.getElementById("browseEditSaveBtn").click();
    await W.waitFor(() => W.allCell("Cost") === 31, 4000); await W.sleep(400);
    out.after1 = Object.assign({ cost: W.allCell("Cost"), open: W.editOpen(), allPatches: W.allPatches().length }, W.cs());
    // second Save: nothing left to write on the row; the photo goes
    W.failUpload = false; W.clearToast();
    document.getElementById("browseEditSaveBtn").click();
    await W.waitFor(() => !W.editOpen(), 4000); await W.sleep(300);
    out.after2 = { open: W.editOpen(), allPatches: W.allPatches().length, uploads: W.uploads.slice() };
    return out;
  });
  await page.waitForTimeout(800);
  // A Save in flight keeps its button (its own block: the first Save's redraw has settled).
  const C4 = await page.evaluate(async () => {
    const W = __ws; const out = {};
    W.install(); let host = await W.openEditCoin();
    W.setv("browseEditCost", "32");
    await W.addVia(W.plus(host, /Reference/)); await W.sleep(100);
    let release; W.uploadGate = new Promise(r => { release = r; });
    document.getElementById("browseEditSaveBtn").click();
    await W.waitFor(() => editSaveInFlight, 3000); await W.sleep(300);
    refreshEditSaveState();
    const b = document.getElementById("browseEditSaveBtn");
    out.inflight = { flight: editSaveInFlight, disabled: b.disabled, dim: b.classList.contains("is-clean"), text: b.textContent.trim().slice(0, 40) };
    release(); W.uploadGate = null;
    await W.waitFor(() => !editSaveInFlight, 4000); await W.sleep(200);
    out.done = { flight: editSaveInFlight, disabled: b.disabled };
    return out;
  });
  ok("C1 fields saved + photo failed: the form stays open with only the photo dirty (Save enabled, 0 fields, 1 photo)",
    C.before.counts.fields === 1 && C.after1.cost === 31 && C.after1.open && !C.after1.disabled && !C.after1.dim &&
    C.after1.counts && C.after1.counts.fields === 0 && C.after1.counts.photos === 1, C);
  ok("C2 the next Save writes only the photo: no second row patch, the photo uploaded, form left",
    C.after2.allPatches === C.after1.allPatches && !C.after2.open && C.after2.uploads.length > 0, C.after2);
  ok("C3 while a Save is in flight the button stays disabled, not dimmed as clean, however often the state refreshes; it is free after",
    C4.inflight.flight && C4.inflight.disabled && !C4.inflight.dim && !C4.done.flight, C4);

  // ---------- D  Edit Set -------------------------------------------------------
  await fresh();
  const D = await page.evaluate(async () => {
    const W = __ws; const out = {};
    W.install(); await W.openEditSet();
    out.open = W.ss();
    W.setv("editSetYearField", "1957.0"); out.year = W.ss();
    return out;
  });
  const D2 = await page.evaluate(async () => {
    const W = __ws; const out = {};
    W.install(); await W.openEditSet(); await W.sleep(150);
    let host = W.openAll("editSetPhotosSections");
    const desc = document.getElementById("editSetDescription").value;
    W.setv("editSetDescription", desc + "!"); out.text = W.ss();
    W.setv("editSetDescription", desc); out.textBack = W.ss();
    const sv = document.getElementById("editSetStatus").value;
    W.setv("editSetStatus", "Gifted", "change"); out.gifted = Object.assign({ price: document.getElementById("editSetSalePrice").value }, W.ss());
    W.setv("editSetStatus", sv, "change"); out.giftedOff = Object.assign({ price: document.getElementById("editSetSalePrice").value }, W.ss());
    W.type(W.boxFor(host, "AY-00090_coa_01.jpg"), "x"); out.label = W.ss();
    W.type(W.boxFor(host, "AY-00090_coa_01.jpg"), "page 1"); out.labelBack = W.ss();
    W.clearToast(); W.graphCalls = 0;
    const btn = document.getElementById("browseEditSetSaveBtn"); btn.disabled = false; btn.click(); await W.sleep(150);
    out.cleanClick = { toast: W.toast(), calls: W.graphCalls, open: W.editSetOpen() };
    return out;
  });
  ok("D1 Edit Set opens clean (dimmed, hint); 1957.0 is the loaded 1957 year", __c(D.open) && __c(D.year), D);
  ok("D2 a changed Set field enables Save and counts (Q3); put back it is clean", __d(D2.text) && D2.text.counts.fields === 1 && __c(D2.textBack), D2);
  ok("D3 Gifted fills Sale Price 0; Status back with the price untouched is clean", D2.gifted.price === "0" && __d(D2.gifted) && D2.giftedOff.price === "" && __c(D2.giftedOff), D2);
  ok("D4 a photo label edit enables Save; the saved label typed back is clean", __d(D2.label) && __c(D2.labelBack), [D2.label, D2.labelBack]);
  ok("D5 a clean Save click on Edit Set: \"No changes to save.\", no Graph call, stays on the form",
    D2.cleanClick.toast === "No changes to save." && D2.cleanClick.calls === 0 && D2.cleanClick.open, D2.cleanClick);

  // ---------- F  Add Coin, a new coin -------------------------------------------
  await fresh();
  await page.evaluate(() => { __ws.install(); navigate("addcoin"); });
  const F0 = await page.evaluate(() => ({ dis: document.getElementById("saveToStagingBtn").disabled, dim: document.getElementById("saveToStagingBtn").classList.contains("is-clean"), clean: unsavedEditsForView() === null }));
  await page.fill("#year", "1916");
  const F1 = await page.evaluate(() => ({ u: unsavedEditsForView(), dis: document.getElementById("saveToStagingBtn").disabled }));
  await page.fill("#year", "");
  const F2 = await page.evaluate(() => ({ clean: unsavedEditsForView() === null, dis: document.getElementById("saveToStagingBtn").disabled, dim: document.getElementById("saveToStagingBtn").classList.contains("is-clean") }));
  ok("F1 a new coin's Save is never dimmed (Q2), clean or not", !F0.dis && !F0.dim && F0.clean && !F1.dis && !F2.dis && !F2.dim, [F0, F1, F2]);
  ok("F2 typing a Year counts for the leave guard; clearing it is clean again", F1.u && F1.u.counts.fields === 1 && F2.clean, [F1, F2]);
  await page.evaluate(() => { document.getElementById("navHomeBtn").click(); });

  // ---------- G  Staging-draft edit ---------------------------------------------

  const SS = (page2) => page2; // (same page)
  await page.evaluate(() => { document.getElementById("writeGuardOverlay").classList.add("hidden"); });
  // Stage helpers (the Staging suites' own).
  await page.evaluate(() => {
    window.__setup = async () => {
      const blank = (n) => new Array(n).fill("");
      const mock = createMockGraphClient({ sheets: {
        All: [["CollectionID", "CoinID"]],
        Photos: [["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"]]
          .concat([1, 2, 3, 4, 5, 6].map(() => blank(8))),
        Receipts: [["ReceiptID", "CollectionID", "Filename", "DateAdded"]].concat([1, 2, 3].map(() => blank(4)))
      } });
      __setGraphClientForTest(mock);
      __setAddCoinWriteEnabledForTest(true);
      __resetAllHeaderMapForTest();
      __resetSheetHeaderMapsForTest();
      const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
      if (typeof closeBgCrop === "function") closeBgCrop();
      document.getElementById("photoAdjustOverlay").classList.add("hidden");
      return mock;
    };
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    window.__ph = {
      sleep,
      async jpeg(color) {
        const c = document.createElement("canvas"); c.width = 300; c.height = 300;
        const x = c.getContext("2d"); x.fillStyle = color || "#2a6"; x.fillRect(0, 0, 300, 300);
        x.fillStyle = "#da3"; x.beginPath(); x.arc(150, 150, 110, 0, Math.PI * 2); x.fill();
        return await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
      },
      async file(color) { return new File([await this.jpeg(color)], "pick.jpg", { type: "image/jpeg" }); },
      async waitFor(fn, ms) { const end = Date.now() + (ms || 4000); while (Date.now() < end) { if (fn()) return true; await sleep(40); } return !!fn(); },
      open(id) { const o = document.getElementById(id); return !!o && !o.classList.contains("hidden"); },
      pick(input, file) {
        const dt = new DataTransfer(); dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      },
      // A pick through Stage 1 (and Stage 2 for obverse/reverse) to a
      // finished entry, the same steps a person takes.
      async finishCrop(countBefore) {
        if (!(await this.waitFor(() => this.open("bgCropOverlay")))) return false;
        document.getElementById("bgCropUseBtn").click();
        if (await this.waitFor(() => this.open("photoAdjustOverlay"), 1500)) document.getElementById("photoAdjustUseBtn").click();
        return await this.waitFor(() => this.newCount() > countBefore);
      },
      newCount() { return galleryFor(ADDCOIN_GALLERY_ID).filter(e => e.blob && !e.stagingStored).length; },
      // Add Coin's photos are Edit Coin's section in draft mode
      // (claude/addcoin-shared-photos, commit 4): every pick is a "+" or a
      // Replace -> chooser -> Files -> the crop tool.
      section(re) {
        const host = document.getElementById("addCoinPhotoSections");
        const h = [...host.querySelectorAll(".accordion-header")].find(x => re.test(x.textContent));
        if (!h) return null;
        if (h.getAttribute("aria-expanded") !== "true") h.click();
        return h.nextElementSibling;
      },
      slot(sectionRe, i) { const b = this.section(sectionRe); return b ? b.querySelectorAll(".sg-photo-slot")[i] : null; },
      async chooserPick(trigger, color) {
        const before = this.newCount();
        if (!trigger) return false;
        trigger.click();
        const files = document.querySelector('#imageSourceChooser .image-chooser-btn[data-source="files"]');
        if (!files) return false;
        files.click();
        this.pick(document.getElementById("imageChooserFilesInput"), await this.file(color));
        return this.finishCrop(before);
      },
      async galleryPick(typeRe, color) {
        let trigger = null;
        if (/Holder/.test(typeRe.source)) {
          const slot = this.slot(/Holder/, /back/.test(typeRe.source) ? 1 : 0);
          trigger = slot && slot.querySelector('[data-act="add"], [data-act="replace"]');
        } else {
          const b = this.section(/Reference photos/);
          trigger = b && b.querySelector('[data-role="add"]');
        }
        return this.chooserPick(trigger, color);
      },
      async slotPick(type, color) {
        const slot = this.slot(/Obverse &/, type === "reverse" ? 1 : 0);
        return this.chooserPick(slot && slot.querySelector('[data-act="add"], [data-act="replace"]'), color);
      },
      async bytesOf(mock, path) {
        const v = await mock.getFileBytes(path);
        if (v == null) return null;
        const buf = v instanceof Blob ? await v.arrayBuffer() : v;
        return Array.from(new Uint8Array(buf)).slice(0, 4000).join(",");
      }
    };
    window.__teardown = () => {
      __setLiveDbCoinsForTest(null);
      __setAddCoinWriteEnabledForTest(null);
      __setGraphClientForTest(null);
      __resetAllHeaderMapForTest();
    };
    window.__val = (id) => { const el = document.getElementById(id); return el ? el.value : null; };
    window.__draftPath = (id) => writePaths().stagingBase + "/" + id + "/coin.json";
    // Saves through the real path: the same match resolution the button runs,
    // then completeAddCoinSave(), awaited.
    window.__saveEdit = () => new Promise((resolve, reject) => {
      resolveAddCoinCatalogMatch(
        (m) => completeAddCoinSave("staging", m).then(resolve, reject),
        () => resolve("cancelled"));
    });
  });



  const G = await page.evaluate(async ({ base, catalog, id }) => {
    const out = {};
    const folder = writePaths().stagingBase + "/" + id;
    const st = () => {
      const b = document.getElementById("saveToStagingBtn"), h = document.getElementById("stagingEditSaveHint");
      const u = unsavedEditsForView();
      return { disabled: b.disabled, dim: b.classList.contains("is-clean"), hint: h.classList.contains("show"), counts: u ? u.counts : null };
    };
    const openEdit = async (mock, draft, files) => {
      for (const [name, color] of Object.entries(files || {})) await mock.uploadFile(folder + "/" + name, await __ph.jpeg(color));
      await mock.uploadJson(__draftPath(id), draft);
      await beginCoinDraftEdit(id);
      const body = document.getElementById("addCoinPhotosBody");
      if (body.classList.contains("hidden")) document.getElementById("addCoinPhotosHeader").click();
      await __ph.sleep(80);
    };
    const clickGuard = (label) => { const b = [...document.querySelectorAll("#writeGuardBtns button")].find(x => x.textContent.trim() === label); if (b) b.click(); return !!b; };
    const toast = () => document.getElementById("toast").textContent;
    // What leaving Add Coin does, so the next block starts on a clean screen.
    const endEdit = () => { clearCoinDraftEditContext(); resetAddCoinForm(); navigateNow("dashboard"); __teardown(); };
    const obvPair = [
      { type: "obverse", filename: id + "_obverse_cropped.jpg", caption: "Front" },
      { type: "obverse", filename: id + "_obverse_original.jpg", caption: "original" }
    ];
    const obvFiles = { [id + "_obverse_cropped.jpg"]: "#a33", [id + "_obverse_original.jpg"]: "#3a3" };
    const obvEntry = () => galleryFor(ADDCOIN_GALLERY_ID).find(e => e.type === "obverse");
    const replaceObv = async (color) => {
      const was = obvEntry();
      const slot = __ph.slot(/Obverse &/, 0);
      slot.querySelector('[data-act="replace"], [data-act="add"]').click();
      document.querySelector('#imageSourceChooser .image-chooser-btn[data-source="files"]').click();
      __ph.pick(document.getElementById("imageChooserFilesInput"), await __ph.file(color));
      if (!(await __ph.waitFor(() => __ph.open("bgCropOverlay")))) return false;
      document.getElementById("bgCropUseBtn").click();
      if (await __ph.waitFor(() => __ph.open("photoAdjustOverlay"), 1500)) document.getElementById("photoAdjustUseBtn").click();
      return await __ph.waitFor(() => obvEntry() !== was);
    };
    // G1 open is clean; label edit counts and reverts
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      out.open = st();
      applyPhotoLabelText(obvEntry(), "Face", true); out.label = st();
      applyPhotoLabelText(obvEntry(), "Front", true); out.labelBack = st();
      // G2 Replace then Put it back
      out.rep = await replaceObv("#33f"); await __ph.sleep(80); out.repState = st();
      __ph.slot(/Obverse &/, 0).querySelector('[data-act="remove"]').click(); clickGuard("Put it back");
      await __ph.sleep(100); out.undoState = st();
      // G3 X on the stored photo (no undo for a plain remove)
      __ph.slot(/Obverse &/, 0).querySelector('[data-act="remove"]').click(); clickGuard("Remove");
      await __ph.sleep(80); out.xState = st();
      endEdit();
    }
    // G5 receipt: removing a stored one is a change; removing a pick the draft never had is not
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair, receiptPhoto: id + "_receipt.pdf" }), Object.assign({}, obvFiles));
      out.rcOpen = st();
      removeStagingEditReceipt(); out.rcRemoved = st();
      endEdit();
    }
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair, receiptPhoto: "" }), obvFiles);
      receiptFiles["receiptPreview"] = { blob: new Blob(["%PDF-1.4"], { type: "application/pdf" }), filename: "r.pdf" };
      refreshEditSaveState(); out.rcPick = st();
      removeStagingEditReceipt(); out.rcPickGone = st();
      endEdit();
    }
    // G6 a clean Save writes nothing
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      const json0 = JSON.stringify(await mock.getJson(__draftPath(id)));
      const puts = []; const ru = mock.uploadFile, rj = mock.uploadJson;
      mock.uploadFile = (...a) => { puts.push(String(a[0])); return ru.apply(mock, a); };
      mock.uploadJson = (...a) => { puts.push(String(a[0])); return rj.apply(mock, a); };
      document.getElementById("toast").textContent = "";
      saveAddCoinForm("staging"); await __ph.sleep(200);
      out.cleanSave = { toast: toast(), puts, same: JSON.stringify(await mock.getJson(__draftPath(id))) === json0, still: editingCoinDraftId === id };
      endEdit();
    }
    // G7 a failed half-pair save: the pick stays and the form stays dirty
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      const ru = mock.uploadFile;
      mock.uploadFile = (p, f, o) => {
        if (/_obverse_original_02\.jpg$/.test(String(p))) { const e = new Error("nameAlreadyExists"); e.conflict = true; return Promise.reject(e); }
        return ru.call(mock, p, f, o);
      };
      await replaceObv("#33f"); await __ph.sleep(60);
      await __saveEdit();
      out.failed = st();
      out.failedPick = galleryFor(ADDCOIN_GALLERY_ID).some(e => e.blob && !e.stagingStored);
      endEdit();
    }
    return out;
  }, { base: BASE_DRAFT, catalog: CATALOG, id: ID });
  ok("G1 a Staging draft opens clean: Save dimmed with the hint, nothing unsaved", __c(G.open), G.open);
  ok("G2 a label edit on a stored photo counts (Save enabled, \"1 photo label\"); typing it back is clean", __d(G.label) && G.label.counts.labels === 1 && __c(G.labelBack), [G.label, G.labelBack]);
  ok("G3 Replace enables Save (1 photo); ✕ + Put it back returns it to clean", G.rep && __d(G.repState) && G.repState.counts.photos === 1 && __c(G.undoState), [G.repState, G.undoState]);
  ok("G4 ✕ on a stored photo is a change (1 photo)", __d(G.xState) && G.xState.counts.photos === 1, G.xState);
  ok("G5 removing the draft's stored receipt is a change; a draft with no receipt: a picked receipt is a change and ✕ on that pick is clean",
    __c(G.rcOpen) && __d(G.rcRemoved) && __d(G.rcPick) && __c(G.rcPickGone), [G.rcOpen, G.rcRemoved, G.rcPick, G.rcPickGone]);
  ok("G6 a Save on a clean Staging edit: \"No changes to save.\", no upload, coin.json byte-identical, form still open",
    G.cleanSave.toast === "No changes to save." && G.cleanSave.puts.length === 0 && G.cleanSave.same && G.cleanSave.still, G.cleanSave);
  ok("G7 a failed half-pair save leaves the pick in memory and the form dirty (Save enabled, 1 photo)",
    G.failedPick && __d(G.failed) && G.failed.counts.photos === 1, [G.failed, G.failedPick]);

  // ---------- H  Staging draft: text field typed and put back (trusted typing) ----
  await page.evaluate(async ({ base, catalog, id }) => {
    const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
    await mock.uploadJson(__draftPath(id), Object.assign({}, base, { photos: [] }));
    await beginCoinDraftEdit(id); await __ph.sleep(80);
  }, { base: BASE_DRAFT, catalog: CATALOG, id: ID });
  const H0 = await page.evaluate(() => unsavedEditsForView() === null && document.getElementById("saveToStagingBtn").disabled);
  await page.fill("#year", "1939");
  const H1 = await page.evaluate(() => { const b = document.getElementById("saveToStagingBtn"); const u = unsavedEditsForView(); return { fields: u && u.counts.fields, dis: b.disabled }; });
  await page.fill("#year", "1938");
  const H2 = await page.evaluate(() => { const b = document.getElementById("saveToStagingBtn"); return { clean: unsavedEditsForView() === null, dis: b.disabled, dim: b.classList.contains("is-clean") }; });
  ok("H1 Staging edit: a typed field enables Save (1 field); typing the loaded value back dims it", H0 && H1.fields === 1 && !H1.dis && H2.clean && H2.dis && H2.dim, [H0, H1, H2]);
  const H3 = await page.evaluate(() => {
    // leaving to a new coin puts Save back to a normal button
    clearCoinDraftEditContext(); resetAddCoinForm();
    const b = document.getElementById("saveToStagingBtn");
    const out = { dis: b.disabled, dim: b.classList.contains("is-clean"), hint: document.getElementById("stagingEditSaveHint").classList.contains("show") };
    __teardown();
    return out;
  });
  ok("H2 after the edit ends the Staging Save button is a normal enabled Save again (no dim, no hint)", !H3.dis && !H3.dim && !H3.hint, H3);
}, module);
