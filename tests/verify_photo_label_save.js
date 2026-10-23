// Photo labels save with Save Changes (Oct 2026, claude/photo-label-save-changes).
//
// WHY. A label typed on a saved photo (Reference, COA, Other) works like the
// coin's other fields: typing changes it in memory only; Save Changes (Edit
// Coin, Edit Set) or "Save labels" (Manage Photos) writes it; Back offers
// Discard; any other way of leaving throws it away. Nothing writes a label on
// blur, Enter, a redraw, navigation or the app going to the background.
// Capture, Replace and ↻ write the photo's SAVED label, never the box text.
// Draft mode (Add Coin, a Staging edit) is unchanged.
//
//   N1  with a changed label: blur, Enter, a redraw, visibilitychange,
//       pagehide make ZERO writes; the box keeps the text
//   S1  Save Changes with a field and a label: the All row is written first,
//       then ONE Label cell; every other Photos cell kept (incl. a column
//       with a blank header and DateAdded as a number); the table doesn't
//       grow; message counts both; back to the detail page
//   S2  a fields-only save leaves every label alone
//   S3  a conflict block writes no labels; the text stays unsaved
//   S4  a failed field save writes no labels
//   S5  a labels-only save never touches the coin row (no LastModified /
//       Reviewed stamp)
//   L4  a redraw keeps an unsaved label; a cleared label stays cleared
//   L5  a brand-new photo: its row starts with a blank Label even if text is
//       typed while it saves; Save Changes waits for the save, then writes it
//   L6  a never-saved photo: Save Changes writes nothing for it, says so,
//       keeps the text; ↻ writes the row blank; Save Changes then writes it
//   L7  label write fails after the fields save: red line, text kept, the
//       screen stays; the next Save Changes writes only the label
//   L9  Replace writes the SAVED label and keeps the PhotoID; the typed text
//       stays unsaved; Save Changes writes it
//   D   Edit Coin Back: the warning counts labels; Keep editing keeps the
//       text; Discard restores the sheet label and reopening shows it; the
//       in-form Back is guarded too; navigate (Close Drawer) discards silently
//   L10 draft mode unchanged
//   L11 Edit Set Save Changes, Manage Photos coin and Set "Save labels"
//       (shown only while a label is unsaved) and their Back + Discard
//   L12 legacyOnly entry: read-only box with the Replace hint
//   LL  the red line's layout at 360x800, 412x915, 1024x768

const { defineSuite } = require("./harness");

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
    window.__lb = {
      HEADER, ALL_HEADERS, sleep,
      graphCalls: 0, patches: [], mock: null, uploadGate: null, failUpload: false,
      coin: { id: "AY-00099", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" },
      set: { id: "AY-00090", name: "1957 Proof Set", denom: "Multiple", year: 1957, mint: "", category: "Proof Set" },
      install() {
        const self = this;
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
        this.uploadGate = null; this.failUpload = false;
        __setGraphClientForTest(new Proxy(mock, { get(t, k) {
          const v = t[k];
          if (typeof v !== "function") return v;
          return async (...a) => {
            self.graphCalls++; self.calls.push(k);
            if (k === "uploadFile") {
              if (self.uploadGate) await self.uploadGate;
              if (self.failUpload) throw new Error("offline");
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
      boxFor(host, filename) {
        const t = [...host.querySelectorAll(".gc-thumb")].find(x => x.dataset.file === filename);
        return t ? t.querySelector(".gc-caption") : null;
      },
      entry(targetId, filename) { return galleryFor(targetId).find(e => (e.storedFilename || e.filename) === filename) || null; },
      type(box, text) { if (!box) return false; box.focus(); box.value = text; box.dispatchEvent(new Event("input", { bubbles: true })); return true; },
      blur(box) { if (!box) return false; box.dispatchEvent(new Event("change", { bubbles: true })); box.blur(); return true; },
      enter(box) { if (!box) return false; box.focus(); box.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); return true; },
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
      async save() { document.getElementById("browseEditSaveBtn").click(); await this.waitFor(() => !document.getElementById("browseEditSaveBtn").disabled, 3000); await sleep(150); },
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

module.exports = defineSuite("photo-label-save", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);
  await setup(page);

  // ---------- N1 nothing is written before Save ----------------------------
  const N = await page.evaluate(async () => {
    const L = __lb; L.install();
    let host = await L.openEditCoin();
    L.graphCalls = 0; L.calls = []; L.patches = [];
    let box = L.boxFor(host, "AY-00099_reference_01.jpg");
    const out = { found: !!box };
    L.type(box, "Not yet saved");
    L.blur(box); await L.sleep(80);
    out.afterBlur = L.calls.length;
    box = L.boxFor(L.editHost(), "AY-00099_reference_01.jpg");
    L.enter(box); await L.sleep(80);
    out.afterEnter = L.calls.length;
    // A redraw (e.g. another photo finishing) keeps the text and writes nothing.
    renderManagePhotosInto("browseEditPhotosSections", buildManagePhotosCtx(L.coin));
    await L.sleep(80);
    out.afterRedraw = L.calls.filter(c => c === "patchWorkbookRanges").length;
    box = L.boxFor(L.editHost(), "AY-00099_reference_01.jpg");
    out.boxAfterRedraw = box && box.value;
    // App switch / page close.
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    delete document.visibilityState;
    window.dispatchEvent(new Event("pagehide"));
    await L.sleep(80);
    out.patchesTotal = L.patches.slice();
    out.row = L.row("PH-00002")[5];
    out.caption = L.entry("AY-00099", "AY-00099_reference_01.jpg").caption;
    out.toast = L.toast();
    return out;
  });
  ok(N.found && N.afterBlur === 0 && N.afterEnter === 0, "N1a blur and Enter on a changed label make no Graph request: " + JSON.stringify([N.found, N.afterBlur, N.afterEnter]));
  ok(N.afterRedraw === 0 && N.boxAfterRedraw === "Not yet saved", "N1b a redraw writes nothing and keeps the typed label (hydration fix): " + JSON.stringify([N.afterRedraw, N.boxAfterRedraw]));
  ok(N.patchesTotal.length === 0 && N.row === "PCGS photo", "N1c visibilitychange (hidden) and pagehide write nothing; the row is unchanged: " + JSON.stringify([N.patchesTotal, N.row]));
  ok(N.caption === "Not yet saved" && !/Label saved/.test(N.toast), "N1d the label stays in memory, and there is no \"Label saved.\" toast: " + JSON.stringify([N.caption, N.toast]));

  // ---------- S1 fields + label: order, single cell, message ----------------
  const S1 = await page.evaluate(async () => {
    const L = __lb; L.install();
    const host = await L.openEditCoin();
    const before = L.row("PH-00002").slice();
    const lenBefore = L.gridLength();
    L.typeNotes("Found at a show");
    L.type(L.boxFor(host, "AY-00099_reference_01.jpg"), "TrueView obverse");
    L.patches = []; L.clearToast();
    await L.save();
    const after = L.row("PH-00002");
    return {
      label: after[5], others: before.map((v, i) => i === 5 ? true : v === after[i]),
      extra: after[7], dateType: typeof after[6], lenSame: L.gridLength() === lenBefore,
      patches: L.patches.slice(), remarks: L.allCell("Remarks"),
      toast: L.toast(), editOpen: L.editOpen(),
      saved: L.entry("AY-00099", "AY-00099_reference_01.jpg").savedLabel,
      index: storedPhotoRowsFor("AY-00099").find(r => r.photoId === "PH-00002").label,
    };
  });
  const allIdx = S1.patches.findIndex(p => p.indexOf("All!") === 0);
  const phIdx = S1.patches.findIndex(p => p.indexOf("Photos!") === 0);
  ok(S1.remarks === "Found at a show" && S1.label === "TrueView obverse", "S1a Save Changes writes the field and the label: " + JSON.stringify([S1.remarks, S1.label]));
  ok(allIdx >= 0 && phIdx > allIdx, "S1b the coin row is written before the label: " + JSON.stringify(S1.patches));
  ok(S1.patches.filter(p => p.indexOf("Photos!") === 0).length === 1 && S1.patches[phIdx] === "Photos!F3:F3",
    "S1c the label is ONE single-cell write (F3:F3): " + JSON.stringify(S1.patches));
  ok(S1.others.every(Boolean) && S1.extra === "keep-me" && S1.dateType === "number" && S1.lenSame,
    "S1d every other Photos cell kept, incl. the blank-header column and DateAdded as a number; the table doesn't grow: " + JSON.stringify(S1));
  ok(/\(1 field updated, 1 label\)/.test(S1.toast) && !/Label saved\./.test(S1.toast),
    "S1e one message counts both: " + S1.toast);
  ok(!S1.editOpen && S1.saved === "TrueView obverse" && S1.index === "TrueView obverse",
    "S1f back to the detail page; savedLabel and the session index follow the write: " + JSON.stringify([S1.editOpen, S1.saved, S1.index]));

  // ---------- S2 fields only ------------------------------------------------
  const S2 = await page.evaluate(async () => {
    const L = __lb; L.install();
    await L.openEditCoin();
    L.typeNotes("Only a note");
    L.patches = [];
    await L.save();
    return { photos: L.photoPatches(), all: L.allPatches().length, label: L.row("PH-00002")[5] };
  });
  ok(S2.photos.length === 0 && S2.all > 0 && S2.label === "PCGS photo", "S2 a fields-only save leaves every label alone: " + JSON.stringify(S2));

  // ---------- S3 conflict block --------------------------------------------
  const S3 = await page.evaluate(async () => {
    const L = __lb; L.install();
    const host = await L.openEditCoin();
    L.typeNotes("Conflicting");
    L.type(L.boxFor(host, "AY-00099_reference_01.jpg"), "Blocked label");
    // Someone else edits the row after the form opened.
    L.allRow()[L.ALL_HEADERS.indexOf("Value")] = 999;
    L.patches = [];
    document.getElementById("browseEditSaveBtn").click();
    await L.waitFor(() => L.guardOpen(), 3000);
    await L.sleep(150);
    const out = { dialog: L.guardOpen(), patches: L.patches.slice(), label: L.row("PH-00002")[5],
      caption: L.entry("AY-00099", "AY-00099_reference_01.jpg").caption,
      unsaved: unsavedPhotoLabelCount("AY-00099") };
    const first = document.querySelector("#writeGuardBtns button"); if (first) first.click();
    return out;
  });
  ok(S3.dialog && S3.patches.length === 0 && S3.label === "PCGS photo" && S3.caption === "Blocked label" && S3.unsaved === 1,
    "S3 a conflict block writes no labels; the text stays unsaved in the box: " + JSON.stringify(S3));

  // ---------- S4 field save fails -------------------------------------------
  const S4 = await page.evaluate(async () => {
    const L = __lb; L.install();
    const host = await L.openEditCoin();
    L.typeNotes("Will not land");
    L.type(L.boxFor(host, "AY-00099_reference_01.jpg"), "Not with a failed save");
    L.allRow()[0] = "AY-00098";          // the row is gone (not-found)
    L.patches = []; L.clearToast();
    await L.save();
    return { photos: L.photoPatches(), label: L.row("PH-00002")[5], toast: L.toast(), editOpen: L.editOpen(),
      caption: L.entry("AY-00099", "AY-00099_reference_01.jpg").caption };
  });
  ok(S4.photos.length === 0 && S4.label === "PCGS photo" && /Couldn't save AY-00099/.test(S4.toast) && S4.editOpen && S4.caption === "Not with a failed save",
    "S4 a failed field save writes no labels; the form stays with the text: " + JSON.stringify(S4));

  // ---------- S5 labels only -----------------------------------------------
  const S5 = await page.evaluate(async () => {
    const L = __lb; L.install();
    const host = await L.openEditCoin();
    const lm = L.allCell("LastModified"), rv = L.allCell("Reviewed");
    L.type(L.boxFor(host, "AY-00099_other_01.jpg"), "Box lid");
    L.patches = []; L.calls = []; L.clearToast();
    await L.save();
    return { all: L.allPatches(), photos: L.photoPatches(), label: L.row("PH-00003")[5],
      lmSame: L.allCell("LastModified") === lm, rvSame: L.allCell("Reviewed") === rv,
      toast: L.toast(), editOpen: L.editOpen() };
  });
  ok(S5.all.length === 0 && S5.lmSame && S5.rvSame && S5.photos.length === 1 && S5.label === "Box lid",
    "S5a a labels-only save writes only the label cell — no coin-row write, no LastModified/Reviewed stamp: " + JSON.stringify(S5));
  ok(/^Saved AY-00099 — 1 label updated\.$/.test(S5.toast) && !S5.editOpen, "S5b its message, then the detail page: " + JSON.stringify([S5.toast, S5.editOpen]));

  // ---------- L4 hydration: redraw keeps; cleared stays cleared -------------
  const B = await page.evaluate(async () => {
    const L = __lb; L.install();
    let host = await L.openEditCoin();
    L.type(L.boxFor(host, "AY-00099_reference_01.jpg"), "");
    hydrateStoredPhotos("AY-00099");
    renderManagePhotosInto("browseEditPhotosSections", buildManagePhotosCtx(L.coin));
    const keptBlank = L.boxFor(L.editHost(), "AY-00099_reference_01.jpg").value;
    await L.save();
    const row = L.row("PH-00002")[5];
    // Reopen: the cleared label stays cleared on screen too.
    showBrowseEditView(L.coin); await L.sleep(100);
    hydrateStoredPhotos("AY-00099");
    host = await L.openEditCoin();
    return { keptBlank, row, box: L.boxFor(host, "AY-00099_reference_01.jpg").value };
  });
  ok(B.keptBlank === "", "L4a a redraw keeps an unsaved (cleared) label instead of putting the sheet label back: " + JSON.stringify(B.keptBlank));
  ok(B.row === "" && B.box === "", "L4b once saved, the cleared label stays cleared (sheet and screen): " + JSON.stringify([B.row, B.box]));

  // ---------- L5 brand-new photo typed while saving -------------------------
  const C = await page.evaluate(async () => {
    const L = __lb; L.install();
    const host = await L.openEditCoin();
    let release; L.uploadGate = new Promise(r => { release = r; });
    const out = {};
    out.picked = L.pickVia(L.section(host, /Other/).querySelector('[data-role="add"]'), await L.jpeg());
    out.crop = await L.finishCrop();
    await L.waitFor(() => galleryFor("AY-00099").some(e => e.type === "other" && e.uploadPending), 3000);
    const e = galleryFor("AY-00099").find(x => x.type === "other" && x.uploadPending);
    out.pending = !!e;
    const thumb = [...L.section(L.editHost(), /Other/).querySelectorAll(".gc-thumb")].pop();
    L.type(thumb.querySelector(".gc-caption"), "Mint box");
    out.unsavedWhilePending = unsavedPhotoLabelCount("AY-00099");
    L.patches = []; L.clearToast();
    // Save while the photo is still saving: it waits, then writes the label.
    const clicked = document.getElementById("browseEditSaveBtn"); clicked.click();
    await L.sleep(150);
    out.photoPatchesWhileHeld = L.photoPatches().length;
    L.uploadGate = null; release();
    await L.waitFor(() => !document.getElementById("browseEditSaveBtn").disabled && !!e.storedPhotoId && e.savedLabel === "Mint box", 4000);
    await L.sleep(100);
    const row = L.row(e.storedPhotoId);
    out.label = row && row[5];
    out.patches = L.photoPatches();
    out.toast = L.toast();
    return out;
  });
  ok(C.picked && C.crop && C.pending && C.unsavedWhilePending === 1, "L5a a new Other photo is still saving and has a typed label: " + JSON.stringify(C));
  ok(C.photoPatchesWhileHeld === 0, "L5b Save Changes waits for the photo's own save: " + C.photoPatchesWhileHeld);
  ok(C.label === "Mint box" && C.patches.length >= 2 && /F\d+:F\d+$/.test(C.patches[C.patches.length - 1]) &&
     !/F\d+:F\d+$/.test(C.patches[0]),
    "L5c the photo's row is written first (with a blank Label), then the label cell: " + JSON.stringify(C.patches));

  // L5d: the row a brand-new photo's own save writes has a blank Label, even
  // with text typed while it was saving (no Save Changes pressed).
  const C5 = await page.evaluate(async () => {
    const L = __lb; L.install();
    const host = await L.openEditCoin();
    let release; L.uploadGate = new Promise(r => { release = r; });
    L.pickVia(L.section(host, /Other/).querySelector('[data-role="add"]'), await L.jpeg());
    await L.finishCrop();
    await L.waitFor(() => galleryFor("AY-00099").some(e => e.type === "other" && e.uploadPending), 3000);
    const e = galleryFor("AY-00099").find(x => x.type === "other" && x.uploadPending);
    const thumb = [...L.section(L.editHost(), /Other/).querySelectorAll(".gc-thumb")].pop();
    L.type(thumb.querySelector(".gc-caption"), "Typed, not saved");
    L.uploadGate = null; release();
    await L.waitFor(() => !!e.storedPhotoId, 4000);
    await L.sleep(100);
    const row = L.row(e.storedPhotoId);
    return { label: row && row[5], caption: e.caption, unsaved: unsavedPhotoLabelCount("AY-00099") };
  });
  ok(C5.label === "" && C5.caption === "Typed, not saved" && C5.unsaved === 1,
    "L5d a new photo's row starts with a blank Label; the typed text stays unsaved until Save Changes: " + JSON.stringify(C5));

  // ---------- L6 never-saved photo -----------------------------------------
  const D = await page.evaluate(async () => {
    const L = __lb; L.install();
    const host = await L.openEditCoin();
    L.failUpload = true;
    const out = {};
    out.picked = L.pickVia(L.section(host, /Other/).querySelector('[data-role="add"]'), await L.jpeg());
    out.crop = await L.finishCrop();
    await L.waitFor(() => galleryFor("AY-00099").some(e => e.type === "other" && e.uploadError), 4000);
    const e = galleryFor("AY-00099").find(x => x.type === "other" && x.uploadError);
    out.failed = !!e;
    const sec = () => L.section(L.editHost(), /Other/);
    L.type([...sec().querySelectorAll(".gc-thumb")].pop().querySelector(".gc-caption"), "Slab label");
    L.patches = []; L.clearToast();
    await L.save();
    out.photoPatches = L.photoPatches().length;
    out.all = L.allPatches().length;
    out.toast = L.toast();
    out.caption = e.caption;
    out.editOpen = L.editOpen();
    out.line = !!e.labelError;
    // ↻ with the network back: the row is written with a blank Label.
    L.failUpload = false;
    const retry = [...sec().querySelectorAll(".gc-thumb")].pop().querySelector(".gc-retry");
    out.hasRetry = !!retry;
    if (retry) retry.click();
    await L.waitFor(() => !e.uploadPending && !e.uploadError && !!e.storedPhotoId, 4000);
    await L.sleep(100);
    out.rowAfterRetry = L.row(e.storedPhotoId) && L.row(e.storedPhotoId)[5];
    await L.save();
    out.rowAfterSave = L.row(e.storedPhotoId) && L.row(e.storedPhotoId)[5];
    return out;
  });
  ok(D.picked && D.crop && D.failed, "L6a a new Other photo fails to save: " + JSON.stringify([D.picked, D.crop, D.failed]));
  ok(D.photoPatches === 0 && D.all === 0 && /1 label not saved — its photo isn't saved yet\. Tap ↻ on the photo, then Save Changes\./.test(D.toast),
    "L6b Save Changes writes nothing for a never-saved photo and says so: " + JSON.stringify([D.photoPatches, D.all, D.toast]));
  ok(D.caption === "Slab label" && D.editOpen && D.line, "L6c the text is kept, the screen stays, the red line shows: " + JSON.stringify([D.caption, D.editOpen, D.line]));
  ok(D.hasRetry && D.rowAfterRetry === "" && D.rowAfterSave === "Slab label",
    "L6d ↻ writes the row with a blank Label; the next Save Changes writes the label: " + JSON.stringify([D.hasRetry, D.rowAfterRetry, D.rowAfterSave]));

  // ---------- L7 label write fails after the fields save --------------------
  const E = await page.evaluate(async () => {
    const L = __lb; L.install();
    const host = await L.openEditCoin();
    L.typeNotes("Fields land");
    L.type(L.boxFor(host, "AY-00099_reference_01.jpg"), "Will fail first");
    // The label lookup fails: the Photos row no longer belongs to this coin.
    L.row("PH-00002")[1] = "AY-00098";
    L.clearToast();
    await L.save();
    const out = { remarks: L.allCell("Remarks"), row: L.row("PH-00002")[5], toast: L.toast(), editOpen: L.editOpen() };
    const box = L.boxFor(L.editHost(), "AY-00099_reference_01.jpg");
    const thumb = box.closest(".gc-thumb");
    const line = thumb.querySelector(".gc-label-failed");
    out.boxValue = box.value;
    out.line = line ? line.textContent : null;
    out.lineVisible = !!line && line.getBoundingClientRect().height > 0;
    // Fixed: the next Save Changes writes only the label.
    L.row("PH-00002")[1] = "AY-00099";
    L.patches = []; L.clearToast();
    const lm = L.allCell("LastModified");
    await L.save();
    out.retryAll = L.allPatches().length;
    out.lmSame = L.allCell("LastModified") === lm;
    out.row2 = L.row("PH-00002")[5];
    out.lineGone = !thumb.isConnected || !thumb.querySelector(".gc-label-failed");
    out.toast2 = L.toast();
    out.editOpen2 = L.editOpen();
    return out;
  });
  ok(E.remarks === "Fields land" && E.row === "PCGS photo" && E.editOpen,
    "L7a the fields save, the label doesn't, and the form stays open: " + JSON.stringify([E.remarks, E.row, E.editOpen]));
  ok(/Saved AY-00099 to the workbook \(1 field updated\)\..*1 label not saved — it's still in the box\. Tap Save Changes to try again\./.test(E.toast),
    "L7b the message says which part didn't save: " + E.toast);
  ok(E.boxValue === "Will fail first" && E.line === "Label not saved" && E.lineVisible,
    "L7c the text stays in the box with a red \"Label not saved\" line: " + JSON.stringify([E.boxValue, E.line, E.lineVisible]));
  ok(E.retryAll === 0 && E.lmSame && E.row2 === "Will fail first" && E.lineGone && !E.editOpen2,
    "L7d the next Save Changes writes only the label, the line goes, back to detail: " + JSON.stringify(E));

  // ---------- L9 Replace writes the saved label ----------------------------
  const G = await page.evaluate(async () => {
    const L = __lb; L.install();
    const host = await L.openEditCoin();
    const box = L.boxFor(host, "AY-00099_reference_01.jpg");
    L.type(box, "Edited, not saved");
    const rows = L.rowCount();
    const rep = box.closest(".gc-thumb").querySelector('[data-role="replace"]');
    const out = { picked: L.pickVia(rep, await L.jpeg()), crop: await L.finishCrop() };
    await L.waitFor(() => galleryFor("AY-00099").some(e => e.type === "reference" && !e.stored && !e.uploadPending && e.storedFilename), 4000);
    await L.sleep(100);
    const row = L.row("PH-00002");
    out.label = row[5]; out.file = row[4]; out.rowsSame = L.rowCount() === rows;
    const e = galleryFor("AY-00099").find(x => x.type === "reference" && !x.stored);
    out.caption = e && e.caption; out.photoId = e && e.storedPhotoId;
    const b2 = [...L.section(L.editHost(), /Reference/).querySelectorAll(".gc-caption")][0];
    out.box = b2 && b2.value;
    await L.save();
    out.label2 = L.row("PH-00002")[5];
    return out;
  });
  ok(G.picked && G.crop && G.label === "PCGS photo" && G.file !== "AY-00099_reference_01.jpg" && G.rowsSame && G.photoId === "PH-00002",
    "L9a Replace updates PH-00002 in place with the SAVED label, not the typed one: " + JSON.stringify(G));
  ok(G.caption === "Edited, not saved" && G.box === "Edited, not saved" && G.label2 === "Edited, not saved",
    "L9b the typed text stays unsaved in the box; Save Changes writes it: " + JSON.stringify([G.caption, G.box, G.label2]));

  // ---------- D Edit Coin Back / Discard / navigate -------------------------
  const F = await page.evaluate(async () => {
    const L = __lb; L.install();
    let host = await L.openEditCoin();
    L.type(L.boxFor(host, "AY-00099_reference_01.jpg"), "Typed then discarded");
    L.patches = [];
    document.getElementById("navBackBtn").click();
    const out = { dialog: L.guardOpen(), text: L.guardText() };
    L.clickGuard("Keep editing");
    out.keepOpen = L.editOpen();
    out.keepBox = L.boxFor(L.editHost(), "AY-00099_reference_01.jpg").value;
    L.typeNotes("A field too");
    document.getElementById("navBackBtn").click();
    out.text2 = L.guardText();
    L.clickGuard("Discard");
    out.leftEdit = !L.editOpen();
    out.caption = L.entry("AY-00099", "AY-00099_reference_01.jpg").caption;
    out.patches = L.patches.slice();
    host = await L.openEditCoin();
    out.reopenBox = L.boxFor(host, "AY-00099_reference_01.jpg").value;
    // The in-form Back is guarded too.
    L.type(L.boxFor(host, "AY-00099_other_01.jpg"), "In-form back");
    document.getElementById("browseEditBackBtn").click();
    out.inFormDialog = L.guardOpen();
    L.clickGuard("Discard");
    out.inFormCaption = L.entry("AY-00099", "AY-00099_other_01.jpg").caption;
    // navigate (Close Drawer) discards silently.
    host = await L.openEditCoin();
    L.type(L.boxFor(host, "AY-00099_reference_01.jpg"), "Left via Close Drawer");
    document.getElementById("navHomeBtn").click();
    out.navDialog = L.guardOpen();
    out.navCaption = L.entry("AY-00099", "AY-00099_reference_01.jpg").caption;
    out.patchesEnd = L.photoPatches();
    out.row = L.row("PH-00002")[5];
    // No unsaved edits: Back leaves without asking.
    host = await L.openEditCoin();
    document.getElementById("navBackBtn").click();
    out.cleanNoDialog = !L.guardOpen() && !L.editOpen();
    return out;
  });
  ok(F.dialog && /Discard unsaved edits\?/.test(F.text) && /1 photo label on AY-00099/.test(F.text),
    "D1 Edit Coin Back with a changed label asks first: " + F.text);
  ok(F.keepOpen && F.keepBox === "Typed then discarded", "D2 Keep editing keeps the text: " + JSON.stringify([F.keepOpen, F.keepBox]));
  ok(/1 field and 1 photo label/.test(F.text2), "D3 the warning counts fields and labels together: " + F.text2);
  ok(F.leftEdit && F.caption === "PCGS photo" && F.patches.length === 0 && F.reopenBox === "PCGS photo",
    "D4 Discard restores the sheet label, writes nothing, and reopening shows it: " + JSON.stringify([F.leftEdit, F.caption, F.patches, F.reopenBox]));
  ok(F.inFormDialog && F.inFormCaption === "", "D5 the form's own Back is guarded the same way: " + JSON.stringify([F.inFormDialog, F.inFormCaption]));
  ok(!F.navDialog && F.navCaption === "PCGS photo" && F.patchesEnd.length === 0 && F.row === "PCGS photo",
    "D6 navigate (Close Drawer) discards without asking and writes nothing: " + JSON.stringify([F.navDialog, F.navCaption, F.patchesEnd, F.row]));
  ok(F.cleanNoDialog, "D7 with nothing unsaved, Back leaves without asking");

  // ---------- L10 draft mode ---------------------------------------------
  const H = await page.evaluate(async () => {
    const L = __lb; L.install();
    navigate("addcoin");
    const id = ADDCOIN_GALLERY_ID;
    galleryFor(id).push({ type: "reference", url: URL.createObjectURL(new Blob([new Uint8Array([1])], { type: "image/jpeg" })),
      blob: new Blob([new Uint8Array([1])], { type: "image/jpeg" }), filename: id + "_reference_01.jpg", caption: "" });
    renderAddCoinPhotos();
    const host = L.openAll("addCoinPhotoSections");
    const box = host.querySelector('.gc-thumb[data-file="' + id + '_reference_01.jpg"] .gc-caption');
    L.graphCalls = 0;
    const out = { typed: L.type(box, "Draft label") };
    L.blur(box);
    await L.sleep(80);
    out.calls = L.graphCalls;
    out.counted = unsavedPhotoLabelCount(id);
    // Leaving the screen keeps a draft's label (navigate's discard skips drafts).
    discardPhotoLabels();
    out.caption = galleryFor(id)[galleryFor(id).length - 1].caption;
    galleryStore[id] = [{ type: "reference", stagingStored: true, storedFilename: "AY-00800_reference_01.jpg",
      stagingFiles: ["AY-00800_reference_01.jpg"], caption: "New label" }];
    const fresh = { photos: [
      { type: "obverse", filename: "AY-00800_obverse_cropped.jpg", caption: "" },
      { type: "reference", filename: "AY-00800_reference_01.jpg", caption: "Old label" },
    ], receiptPhoto: "" };
    out.merged = mergeStagingEditFiles("AY-00800", fresh).photos;
    delete galleryStore[id];
    navigate("dashboard");
    return out;
  });
  ok(H.typed && H.calls === 0 && H.counted === 0, "L10a Add Coin (draft): typing and blur send no Graph request; nothing counts as an unsaved label: " + JSON.stringify(H));
  ok(H.caption === "Draft label", "L10b the draft label stays in memory for Save, even through a discard: " + H.caption);
  ok(JSON.stringify(H.merged) === JSON.stringify([
      { type: "obverse", filename: "AY-00800_obverse_cropped.jpg", caption: "" },
      { type: "reference", filename: "AY-00800_reference_01.jpg", caption: "New label" }]),
    "L10c Staging edit Save: a label-only change changes only that caption in coin.json: " + JSON.stringify(H.merged));

  // ---------- L11 Edit Set and Manage Photos --------------------------------
  const R1 = await page.evaluate(async () => {
    const L = __lb; L.install();
    let host = L.openEditSet();
    L.type(L.boxFor(host, "AY-00090_coa_01.jpg"), "Certificate front");
    L.patches = []; L.clearToast();
    document.getElementById("browseEditSetSaveBtn").click();
    await L.waitFor(() => L.row("PH-00011")[5] === "Certificate front", 3000);
    await L.sleep(100);
    const out = { label: L.row("PH-00011")[5], patches: L.patches.slice(), extra: L.row("PH-00011")[7],
      toast: L.toast(), left: !L.editSetOpen() };
    // Back with a changed label: Discard restores it.
    host = L.openEditSet();
    L.type(L.boxFor(host, "AY-00090_coa_01.jpg"), "Discard me");
    document.getElementById("navBackBtn").click();
    out.dialog = L.guardOpen(); out.text = L.guardText();
    L.clickGuard("Discard");
    out.caption = L.entry("AY-00090", "AY-00090_coa_01.jpg").caption;
    out.left2 = !L.editSetOpen();
    return out;
  });
  ok(R1.label === "Certificate front" && R1.patches.length === 1 && R1.patches[0] === "Photos!F6:F6" && R1.extra === "keep-me",
    "L11a Edit Set Save Changes writes the changed label for real, one cell: " + JSON.stringify(R1));
  ok(/for this session only — not saved to OneDrive\. 1 photo label saved to the workbook\./.test(R1.toast) && R1.left,
    "L11b Edit Set's message says the label was saved: " + R1.toast);
  ok(R1.dialog && /1 photo label on AY-00090/.test(R1.text) && R1.caption === "Certificate front" && R1.left2,
    "L11c Edit Set Back asks, and Discard restores the label on the sheet (the one just saved): " + JSON.stringify([R1.dialog, R1.text, R1.caption]));

  for (const [name, opener, target, file, pid, cell] of [
    ["coin", "openManageCoin", "AY-00099", "AY-00099_reference_01.jpg", "PH-00002", "F3:F3"],
    ["set", "openManageSet", "AY-00090", "AY-00090_coa_01.jpg", "PH-00011", "F6:F6"],
  ]) {
    const R = await page.evaluate(async ({ opener, target, file, pid, name }) => {
      const L = __lb; L.install();
      const btn = document.getElementById("managePhotosSaveLabelsBtn");
      const shown = () => btn.style.display !== "none";
      let host = L[opener]();
      const out = { hiddenAtStart: !shown() };
      L.type(L.boxFor(host, file), "Manage " + name);
      out.shownAfterType = shown();
      L.type(L.boxFor(host, file), L.entry(target, file).savedLabel);   // typed back to the saved text
      out.hiddenWhenSame = !shown();
      L.type(L.boxFor(host, file), "Manage " + name);
      L.patches = []; L.clearToast();
      btn.click();
      await L.waitFor(() => L.row(pid)[5] === "Manage " + name && !btn.disabled, 3000);
      await L.sleep(80);
      out.label = L.row(pid)[5]; out.patches = L.patches.slice(); out.toast = L.toast(); out.hiddenAfter = !shown();
      // Back with a changed label asks; Discard restores and then goes back.
      let wentBack = 0;
      host = L[opener](() => { wentBack++; });
      L.type(L.boxFor(host, file), "Unsaved " + name);
      out.shownAgain = shown();
      document.getElementById("managePhotosBackBtn").click();
      out.dialog = L.guardOpen();
      L.clickGuard("Discard");
      out.wentBack = wentBack;
      out.caption = L.entry(target, file).caption;
      out.hiddenAfterDiscard = !shown();
      return out;
    }, { opener, target, file, pid, name });
    ok(R.hiddenAtStart && R.shownAfterType && R.hiddenWhenSame, `L11-${name}a Manage Photos: "Save labels" shows only while a label differs from the saved one: ` + JSON.stringify(R));
    ok(R.label === "Manage " + name && R.patches.length === 1 && R.patches[0] === "Photos!" + cell && /^Saved .* — 1 label updated\.$/.test(R.toast) && R.hiddenAfter,
      `L11-${name}b "Save labels" writes the label (one cell) and hides again: ` + JSON.stringify([R.label, R.patches, R.toast]));
    ok(R.shownAgain && R.dialog && R.wentBack === 1 && R.caption === "Manage " + name && R.hiddenAfterDiscard,
      `L11-${name}c Back asks first; Discard restores the saved label and goes back: ` + JSON.stringify([R.dialog, R.wentBack, R.caption]));
  }

  // ---------- L12 legacyOnly box is read-only ------------------------------
  const I = await page.evaluate(async () => {
    const L = __lb; L.install();
    let host = await L.openEditCoin();
    galleryFor("AY-00099").push({ type: "other", url: null, stored: true, legacyOnly: true,
      filename: "AY-00099_legacy.jpg", storedFilename: "AY-00099_legacy.jpg", caption: "", savedLabel: "" });
    renderManagePhotosInto("browseEditPhotosSections", buildManagePhotosCtx(L.coin));
    host = L.openAll("browseEditPhotosSections");
    const box = L.boxFor(host, "AY-00099_legacy.jpg");
    return { found: !!box, readOnly: box && box.readOnly, placeholder: box && box.placeholder,
             normalReadOnly: L.boxFor(host, "AY-00099_other_01.jpg").readOnly };
  });
  ok(I.found && I.readOnly && I.placeholder === "Replace this photo to give it a label" && I.normalReadOnly === false,
    "L12 a photo with no Photos row (legacyOnly) gets a read-only box saying \"Replace this photo to give it a label\": " + JSON.stringify(I));

  // ---------- LL layout of the red line -----------------------------------
  for (const [w, h] of [[360, 800], [412, 915], [1024, 768]]) {
    await page.setViewportSize({ width: w, height: h });
    const K = await page.evaluate(async () => {
      const L = __lb; L.install();
      const host = await L.openEditCoin();
      L.type(L.boxFor(host, "AY-00099_reference_01.jpg"), "A long label that will not save");
      L.row("PH-00002")[1] = "AY-00098";
      await L.save();
      L.row("PH-00002")[1] = "AY-00099";
      const box = L.boxFor(L.editHost(), "AY-00099_reference_01.jpg");
      const thumb = box.closest(".gc-thumb");
      const line = thumb.querySelector(".gc-label-failed");
      const tr = thumb.getBoundingClientRect(), lr = line ? line.getBoundingClientRect() : null;
      const out = { line: !!line, inside: !!lr && lr.left >= tr.left - 1 && lr.right <= tr.right + 1,
        below: !!lr && lr.top >= box.getBoundingClientRect().bottom - 1,
        noScroll: document.documentElement.scrollWidth <= window.innerWidth };
      discardPhotoLabels("AY-00099");
      navigate("dashboard");
      return out;
    });
    ok(K.line && K.inside && K.below && K.noScroll, `LL ${w}x${h}: "Label not saved" sits under the box, inside the thumb, no sideways scroll: ` + JSON.stringify(K));
  }

  await page.evaluate(() => {
    __setBrowseEditWriteEnabledForTest(null);
    __setAddCoinWriteEnabledForTest(null);
    __setGraphClientForTest(null);
    __resetAllHeaderMapForTest();
    __resetSheetHeaderMapsForTest();
  });
}, module);
