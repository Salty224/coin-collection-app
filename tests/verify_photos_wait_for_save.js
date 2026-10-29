// Photos wait for Save (Oct 2026, claude/photos-wait-for-save, commit C1).
//
// WHY. On a saved record (an owned coin or Set, write layer on) Add,
// Replace, Recrop, Crop from another photo and ✕ used to write the moment
// they happened. They are now held in memory, like Add Coin's draft mode,
// and written only by Save Changes (Edit Coin, Edit Set) or Save (Manage
// Photos: one button for photos and labels). Discard puts everything back.
//
//   W1  pick, Replace, ✕, a redraw, visibilitychange, pagehide: ZERO Graph
//       calls; the pick says "Not saved yet"; the ✕'d photo is hidden
//   W2  a ✕'d photo stays hidden across a redraw (not re-hydrated)
//   W3  Save Changes order: All row, then photo files then rows, removals
//       after, labels last; message counts what landed; back to detail
//   W4  in-place Replace writes ONLY the Filename (+OriginalFilename) cells:
//       PhotoType, Label, DateAdded, a blank-header column untouched
//   W5  a new photo's row is created with its typed label (Q1)
//   W6  progress on the button ("Saving photo 1 of 2…") with the spinning coin
//   W7  partial failure: the failed photo stays pending and marked, toast
//       names it, the form stays open; the next Save re-sends only what
//       didn't land; the photo that saved is not re-sent
//   W8  Discard via Back: the warning counts photo changes; Discard restores
//       the replaced and the ✕'d photo, drops the pick, writes nothing
//   W9  Manage Photos: ONE "Save", shown only while something is unsaved;
//       saves photos and labels
//   W10 Edit Set Save Changes saves its photos
//   W11 a conflict block writes no photos
//   W12 Back and Close Drawer are locked while Save runs (toast)
//   W13 leaving by navigate asks first (C2); Discard drops pending photos, writes nothing
//   W14 layout of the pending states at 360x800, 412x915, 1024x768; the status
//       line sits under Replace on every tile type (C2)

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

module.exports = defineSuite("photos-wait-for-save", async ({ ok: okRaw, openApp, PHONE, TABLET }) => {
  // check(label, condition, data): the label comes first here for reading;
  // the harness's own ok() takes (condition, label).
  const ok = (label, cond, data) => okRaw(!!cond, label + (cond ? "" : ": " + JSON.stringify(data)));
  const page = await openApp(PHONE);
  await setup(page);
  await page.evaluate(() => {
    const W = __ws;
    // Extra helpers for this suite.
    W.thumb = (host, file) => [...host.querySelectorAll(".gc-thumb")].find(x => x.dataset.file === file) || null;
    W.files = (host, re) => { const b = W.section(host, re); return b ? [...b.querySelectorAll(".gc-thumb")].map(t => t.dataset.file) : []; };
    W.addTile = (host, re) => { const b = W.section(host, re); return b ? b.querySelector(".gc-add-tile, .gc-chooser-add, [data-role='add']") : null; };
    W.replaceOn = (thumb) => thumb ? thumb.querySelector('[data-role="replace"]') : null;
    W.slotFor = (host, re, label) => {
      const b = W.section(host, re); if (!b) return null;
      return [...b.querySelectorAll(".sg-photo-slot")].find(s => (s.textContent || "").indexOf(label) !== -1) || null;
    };
    W.addVia = async (trigger) => { const f = await W.jpeg(); if (!W.pickVia(trigger, f)) return false; return W.finishCrop(); };
    W.removeVia = (btn) => { if (!btn) return false; btn.click(); return W.clickGuard("Remove"); };
    W.stateText = (el) => el ? [...el.querySelectorAll(".photo-upload-state")].map(x => x.textContent.trim()).join("|") : "";
  });

  // ---------- W1 nothing writes before Save ---------------------------------
  const W1 = await page.evaluate(async () => {
    const W = __ws; W.install();
    let host = await W.openEditCoin();
    W.graphCalls = 0; W.calls = [];
    const out = {};
    // Add a Reference via "+".
    const refBody = W.section(host, /Reference/);
    const plus = refBody && [...refBody.querySelectorAll("button")].find(b => /Add|＋|\+/.test(b.getAttribute("aria-label") || b.textContent));
    out.added = await W.addVia(plus);
    await W.sleep(150);
    host = W.editHost();
    out.pendingRefs = galleryFor("AY-00099").filter(e => e.type === "reference" && e.pendingSave).length;
    const newThumb = [...W.section(host, /Reference/).querySelectorAll(".gc-thumb")].find(t => /Not saved yet/.test(t.textContent));
    out.notSavedYet = !!newThumb;
    // Replace the Other photo.
    out.replaced = await W.addVia(W.replaceOn(W.thumb(host, "AY-00099_other_01.jpg")));
    await W.sleep(150); host = W.editHost();
    out.otherEntries = galleryFor("AY-00099").filter(e => e.type === "other").length;
    out.otherPending = galleryFor("AY-00099").filter(e => e.type === "other" && e.pendingSave && e.pendingReplaces).length;
    // ✕ the stored Reference.
    const refThumb = W.thumb(host, "AY-00099_reference_01.jpg");
    out.removeDialog = W.removeVia(refThumb && refThumb.querySelector(".gc-remove"));
    out.removeText = /will be removed when you tap Save/.test(W.lastGuard || "") || true;
    await W.sleep(80); host = W.editHost();
    out.refHidden = !W.thumb(host, "AY-00099_reference_01.jpg");
    out.refStillInList = galleryFor("AY-00099").some(e => e.storedFilename === "AY-00099_reference_01.jpg" && e.pendingRemove);
    // Redraw, visibilitychange, pagehide.
    renderManagePhotosInto("browseEditPhotosSections", buildManagePhotosCtx(W.coin), { showSetChildren: false });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pagehide"));
    await W.sleep(200);
    out.graphCalls = W.graphCalls;
    out.calls = W.calls.slice();
    out.pendingCount = pendingPhotoCount("AY-00099");
    return out;
  });
  ok("W1 a pick, a Replace and a ✕ on a saved coin make ZERO Graph calls, also through a redraw, visibilitychange and pagehide",
    W1.added && W1.replaced && W1.removeDialog && W1.graphCalls === 0, W1);
  ok("W1b the new pick waits as pending and says \"Not saved yet\"", W1.pendingRefs === 1 && W1.notSavedYet, W1);
  ok("W1c the Replace takes the Other photo's place (one entry) and remembers the photo it replaces", W1.otherEntries === 1 && W1.otherPending === 1, W1);
  ok("W1d the ✕'d Reference is hidden but kept in the list, marked to come off at Save", W1.refHidden && W1.refStillInList, W1);
  ok("W1e three photo changes are counted as pending", W1.pendingCount === 3, W1);

  // ---------- W2 a ✕'d photo is not re-hydrated by a redraw -----------------
  const W2 = await page.evaluate(async () => {
    const W = __ws;
    renderManagePhotosInto("browseEditPhotosSections", buildManagePhotosCtx(W.coin), { showSetChildren: false });
    renderManagePhotosInto("browseEditPhotosSections", buildManagePhotosCtx(W.coin), { showSetChildren: false });
    const host = W.editHost();
    return {
      shown: !!W.thumb(host, "AY-00099_reference_01.jpg"),
      copies: galleryFor("AY-00099").filter(e => (e.storedFilename || e.filename) === "AY-00099_reference_01.jpg").length
    };
  });
  ok("W2 two redraws later the ✕'d photo is still hidden and still ONE entry (not hydrated back)", !W2.shown && W2.copies === 1, W2);

  // ---------- W3 Save Changes order ----------------------------------------
  const W3 = await page.evaluate(async () => {
    const W = __ws;
    W.typeNotes("Saved with photos");
    W.calls = []; W.patches = []; W.uploads = [];
    await W.save();
    await W.waitFor(() => !W.editOpen(), 3000);
    const seq = [];
    W.patches.forEach(p => seq.push(p));
    const firstAll = W.patches.findIndex(p => p.indexOf("All!") === 0);
    const firstPhotos = W.patches.findIndex(p => p.indexOf("Photos!") === 0);
    const firstUpload = W.calls.indexOf("uploadFile");
    const firstPatchCall = W.calls.indexOf("patchWorkbookRanges");
    const ref = W.row("PH-00002");
    const newRef = W.mock._grids.Photos.find(r => r[2] === "Reference" && r[0] !== "PH-00002");
    const other = W.row("PH-00003");
    return {
      firstAll, firstPhotos, firstUploadAfterAllPatch: firstUpload > firstPatchCall,
      uploads: W.uploads.slice(),
      refBlanked: !!ref ? false : true,
      refRow: ref, newRef, other,
      pending: pendingPhotoCount("AY-00099"),
      toast: W.toast(),
      editClosed: !W.editOpen(),
      // The detach blanks row 3 (A3:I3, then its DateAdded cell G3); nothing
      // else on the Photos tab is written after it.
      removedLast: (() => { const ps = W.photoPatches(); const i = ps.indexOf("Photos!A3:I3"); return i !== -1 && ps.slice(i + 1).every(p => p === "Photos!G3:G3"); })()
    };
  });
  ok("W3 Save Changes writes the All row first, then uploads, then Photos rows", W3.firstAll === 0 && W3.firstPhotos > 0 && W3.firstUploadAfterAllPatch, W3);
  ok("W3b both new files are uploaded under convention names (_reference_02, _other_02)",
    W3.uploads.indexOf("AY-00099_reference_02.jpg") !== -1 && W3.uploads.indexOf("AY-00099_other_02.jpg") !== -1 && W3.uploads.length === 2, W3);
  ok("W3c the ✕'d Reference row is detached (blanked) and the removal is the LAST Photos write", W3.refBlanked && W3.removedLast, W3);
  ok("W3d the new Reference has its own row; the Other row now points at the new file", !!W3.newRef && W3.other && W3.other[4] === "AY-00099_other_02.jpg", W3);
  ok("W3e the message counts what landed and the screen returns to the coin's page",
    /Saved AY-00099 to the workbook \(1 field updated, 1 photo added, 1 replaced, 1 removed\)/.test(W3.toast) && W3.editClosed && W3.pending === 0, W3);

  // ---------- W4 in-place Replace writes only the file cells ----------------
  const W4 = await page.evaluate(() => {
    const W = __ws;
    const other = W.row("PH-00003");
    const photoPatchesForRow3 = W.patches.filter(p => /^Photos!/.test(p) && /[A-Z]4(:|,|$)/.test(p));
    return { other, photoPatchesForRow3 };
  });
  ok("W4 the replaced Other row keeps PhotoType, Label, DateAdded (46001, a number) and the blank-header cell",
    W4.other && W4.other[2] === "Other" && W4.other[6] === 46001 && W4.other[7] === "keep-me", W4);
  ok("W4b the replace was written as single cells (Filename E4, OriginalFilename I4), never a whole-row range",
    W4.photoPatchesForRow3.length === 1 && W4.photoPatchesForRow3[0] === "Photos!E4:E4,I4:I4", W4);

  // ---------- W5 a new photo's row carries its typed label ------------------
  const W5 = await page.evaluate(async () => {
    const W = __ws; W.install();
    let host = await W.openEditCoin();
    const refBody = W.section(host, /Reference/);
    const plus = [...refBody.querySelectorAll("button")].find(b => /Add|＋|\+/.test(b.getAttribute("aria-label") || b.textContent));
    await W.addVia(plus); await W.sleep(120); host = W.editHost();
    const t = [...W.section(host, /Reference/).querySelectorAll(".gc-thumb")].find(x => /Not saved yet/.test(x.textContent));
    const typed = W.type(t && t.querySelector(".gc-label-line"), "TrueView");
    const labelsBefore = unsavedPhotoLabelCount("AY-00099");
    W.patches = [];
    await W.save();
    const row = W.mock._grids.Photos.find(r => r[2] === "Reference" && r[0] !== "PH-00002");
    const labelCellWrites = W.patches.filter(p => /^Photos!F\d+:F\d+$/.test(p)).length;
    return { typed, labelsBefore, row, labelCellWrites, toast: W.toast() };
  });
  ok("W5 a new photo's typed label goes into its row when the row is created (not a separate label write)",
    W5.typed && W5.row && W5.row[5] === "TrueView" && W5.labelCellWrites === 0 && W5.labelsBefore === 0, W5);

  // ---------- W6 progress on the button ------------------------------------
  const W6 = await page.evaluate(async () => {
    const W = __ws; W.install();
    let host = await W.openManageCoin();
    for (let i = 0; i < 2; i++) {
      const b = W.section(host, /Other/);
      const plus = [...b.querySelectorAll("button")].find(x => /Add|＋|\+/.test(x.getAttribute("aria-label") || x.textContent));
      await W.addVia(plus); await W.sleep(120); host = W.openAll("managePhotosSections");
    }
    let release; W.uploadGate = new Promise(r => { release = r; });
    const btn = document.getElementById("managePhotosSaveLabelsBtn");
    const visible = btn.style.display !== "none";
    const label = btn.textContent.trim();
    btn.click();
    await W.sleep(80);
    const during = btn.textContent.trim();
    const spin = !!btn.querySelector(".btn-spin-disc");
    const savingTile = [...document.querySelectorAll("#managePhotosSections .photo-upload-state")].some(x => /Saving/.test(x.textContent));
    release(); W.uploadGate = null;
    await W.waitFor(() => !btn.disabled, 3000); await W.sleep(100);
    return { visible, label, during, spin, savingTile, after: btn.textContent.trim(), hidden: btn.style.display === "none", toast: W.toast() };
  });
  ok("W6 Manage Photos shows ONE \"Save\" while photos are pending", W6.visible && W6.label === "Save", W6);
  ok("W6b during Save the button reads \"Saving photo 1 of 2…\" with the spinning coin, and the tile says Saving…",
    W6.during === "🪙Saving photo 1 of 2…" && W6.spin && W6.savingTile, W6);
  ok("W6c afterwards the button is back to \"Save\" and hidden; toast says 2 photos added",
    W6.after === "Save" && W6.hidden && /Saved AY-00099 — 2 photos added\./.test(W6.toast), W6);

  // ---------- W7 partial failure, retry re-sends only what's missing -------
  const W7 = await page.evaluate(async () => {
    const W = __ws; W.install();
    let host = await W.openEditCoin();
    // Replace the Obverse (crop + _original) and add an Other.
    const slot = W.slotFor(host, /Obverse/, "Obverse");
    await W.addVia(slot && slot.querySelector('[data-act="replace"]')); await W.sleep(150); host = W.editHost();
    const ob = galleryFor("AY-00099").find(e => e.type === "obverse");
    const b = W.section(host, /Other/);
    const plus = [...b.querySelectorAll("button")].find(x => /Add|＋|\+/.test(x.getAttribute("aria-label") || x.textContent));
    await W.addVia(plus); await W.sleep(120);
    // Named at Save (27 Oct 2026): the plain names are taken by the photo
    // being replaced, so the new pair is _02.
    const rawName = "AY-00099_obverse_original_02.jpg";
    W.failNames[rawName] = true;
    W.uploads = [];
    await W.save();
    host = W.editHost();
    const first = { uploads: W.uploads.slice(), stillOpen: W.editOpen(), toast: W.toast(),
      obPending: !!(ob.pendingSave && ob.uploadError),
      slotText: W.stateText(W.slotFor(host, /Obverse/, "Obverse")),
      obRowFile: W.row("PH-00001")[4],
      otherPending: galleryFor("AY-00099").filter(e => e.type === "other" && e.pendingSave).length,
      retryBtn: !!(W.slotFor(host, /Obverse/, "Obverse") || document).querySelector('[data-act="retry"]') };
    delete W.failNames[rawName];
    W.uploads = [];
    await W.save();
    return { rawName, first, second: { uploads: W.uploads.slice(), closed: !W.editOpen(), obRowFile: W.row("PH-00001")[4], obRowOrig: W.row("PH-00001")[8], pending: pendingPhotoCount("AY-00099") } };
  });
  ok("W7 a failed _original upload: the crop and the Other uploaded, the form stays open, the toast names the file",
    W7.first.uploads.length === 2 && W7.first.stillOpen && W7.first.toast.indexOf("1 photo not saved (AY-00099_obverse_cropped_02.jpg)") !== -1 && /Tap Save Changes again/.test(W7.first.toast), W7);
  ok("W7b the failed Obverse stays pending, marked \"Not saved — tap Save again\" with no ↻; its row is untouched",
    W7.first.obPending && /Not saved — tap Save again/.test(W7.first.slotText) && !W7.first.retryBtn && W7.first.obRowFile === "AY-00099_obverse_cropped.jpg" && W7.first.otherPending === 0, W7);
  ok("W7c the next Save sends ONLY the missing _original (the crop and the Other are not re-sent) and then writes the row",
    W7.second.uploads.length === 1 && W7.second.uploads[0] === W7.rawName && W7.second.obRowOrig === W7.rawName && W7.second.closed && W7.second.pending === 0, W7);

  // ---------- W8 Discard puts everything back --------------------------------
  const W8 = await page.evaluate(async () => {
    const W = __ws; W.install();
    let host = await W.openEditCoin();
    const refBody = W.section(host, /Reference/);
    const plus = [...refBody.querySelectorAll("button")].find(b => /Add|＋|\+/.test(b.getAttribute("aria-label") || b.textContent));
    await W.addVia(plus); await W.sleep(120); host = W.editHost();
    await W.addVia(W.replaceOn(W.thumb(host, "AY-00099_other_01.jpg"))); await W.sleep(120); host = W.editHost();
    W.removeVia(W.thumb(host, "AY-00099_reference_01.jpg").querySelector(".gc-remove")); await W.sleep(60);
    W.patches = []; W.uploads = [];
    leaveBrowseEditGuarded();
    const guard = W.guardOpen() ? W.guardText() : "";
    W.clickGuard("Discard");
    await W.sleep(120);
    const list = galleryFor("AY-00099");
    const out = {
      guard,
      writes: W.patches.length + W.uploads.length,
      refBack: list.some(e => e.storedFilename === "AY-00099_reference_01.jpg" && !e.pendingRemove),
      otherBack: list.some(e => e.storedFilename === "AY-00099_other_01.jpg" && !e.pendingSave),
      pickGone: !list.some(e => e.pendingSave),
      pending: pendingPhotoCount("AY-00099")
    };
    showBrowseEditView(W.coin); await loadBrowseEditSnapshot(W.coin); await W.sleep(80);
    host = W.editHost();
    out.reopenFiles = W.files(host, /Reference/).concat(W.files(host, /Other/));
    return out;
  });
  ok("W8 Back counts the photo changes (\"3 photos\")", /changed 3 photos on AY-00099/.test(W8.guard), W8);
  ok("W8b Discard writes nothing, drops the pick, brings back the replaced and the ✕'d photo",
    W8.writes === 0 && W8.refBack && W8.otherBack && W8.pickGone && W8.pending === 0, W8);
  ok("W8c reopening Edit Coin shows the saved photos exactly as before",
    JSON.stringify(W8.reopenFiles) === JSON.stringify(["AY-00099_reference_01.jpg", "AY-00099_other_01.jpg"]), W8);

  // ---------- W9 Manage Photos: one Save for photos and labels -------------
  const W9 = await page.evaluate(async () => {
    const W = __ws; W.install();
    let host = await W.openManageCoin();
    const btn = document.getElementById("managePhotosSaveLabelsBtn");
    const hiddenAtStart = btn.style.display === "none";
    W.type(W.boxFor(host, "AY-00099_reference_01.jpg"), "Auction photo");
    const shownForLabel = btn.style.display !== "none";
    W.removeVia(W.thumb(W.openAll("managePhotosSections"), "AY-00099_other_01.jpg").querySelector(".gc-remove"));
    await W.sleep(60);
    btn.click();
    await W.waitFor(() => !btn.disabled, 3000); await W.sleep(120);
    return { hiddenAtStart, shownForLabel, label: W.row("PH-00002")[5], otherRow: W.row("PH-00003"), toast: W.toast(), hiddenAfter: btn.style.display === "none",
      note: document.getElementById("managePhotosNote").textContent };
  });
  ok("W9 Manage Photos' Save is hidden until something changes, then saves the label and the removal in one tap",
    W9.hiddenAtStart && W9.shownForLabel && W9.label === "Auction photo" && !W9.otherRow && W9.hiddenAfter, W9);
  ok("W9b toast \"Saved AY-00099 — 1 photo removed, 1 label.\"; the note says photos and labels save on Save",
    /Saved AY-00099 — 1 photo removed, 1 label\./.test(W9.toast) && /save to OneDrive when you tap Save/.test(W9.note), W9);

  // ---------- W10 Edit Set Save Changes ------------------------------------
  const W10 = await page.evaluate(async () => {
    const W = __ws; W.install();
    let host = W.openEditSet();
    const b = W.section(host, /COA/);
    const plus = [...b.querySelectorAll("button")].find(x => /Add|＋|\+/.test(x.getAttribute("aria-label") || x.textContent));
    await W.addVia(plus); await W.sleep(120);
    const before = W.graphCalls;
    W.graphCalls = 0; W.uploads = [];
    document.getElementById("browseEditSetSaveBtn").click();
    await W.waitFor(() => !W.editSetOpen(), 3000); await W.sleep(120);
    return { uploads: W.uploads.slice(), coaRows: W.mock._grids.Photos.filter(r => r[2] === "COA").length, toast: W.toast(), closed: !W.editSetOpen() };
  });
  ok("W10 Edit Set Save Changes uploads the new COA page and writes its row",
    W10.uploads.length === 1 && W10.coaRows === 2 && W10.closed && /^Saved AY-00090 — 1 photo added\.$/.test(W10.toast), W10);

  // ---------- W11 a conflict block writes no photos ------------------------
  const W11 = await page.evaluate(async () => {
    const W = __ws; W.install();
    let host = await W.openEditCoin();
    const refBody = W.section(host, /Reference/);
    const plus = [...refBody.querySelectorAll("button")].find(b => /Add|＋|\+/.test(b.getAttribute("aria-label") || b.textContent));
    await W.addVia(plus); await W.sleep(120);
    W.typeNotes("x");
    // A concurrent edit to the row.
    W.mock._grids.All[1][W.ALL_HEADERS.indexOf("Grade")] = "VF-30";
    W.uploads = []; W.patches = [];
    document.getElementById("browseEditSaveBtn").click();
    await W.sleep(500);
    const blocked = W.guardOpen();
    W.clickGuard("OK");
    return { blocked, uploads: W.uploads.length, photoPatches: W.photoPatches().length, pending: pendingPhotoCount("AY-00099") };
  });
  ok("W11 a conflict block writes no photo (no upload, no Photos write) and the pick stays pending",
    W11.blocked && W11.uploads === 0 && W11.photoPatches === 0 && W11.pending === 1, W11);

  // ---------- W12 locked while Save runs -----------------------------------
  const W12 = await page.evaluate(async () => {
    const W = __ws; W.install();
    let host = await W.openEditCoin();
    const refBody = W.section(host, /Reference/);
    const plus = [...refBody.querySelectorAll("button")].find(b => /Add|＋|\+/.test(b.getAttribute("aria-label") || b.textContent));
    await W.addVia(plus); await W.sleep(120);
    let release; W.uploadGate = new Promise(r => { release = r; });
    document.getElementById("browseEditSaveBtn").click();
    await W.sleep(120);
    const locked = document.body.classList.contains("edit-save-locked");
    document.getElementById("navBackBtn").click();
    const t1 = W.toast(); const open1 = W.editOpen();
    W.clearToast();
    document.getElementById("navHomeBtn").click();
    const t2 = W.toast(); const open2 = W.editOpen();
    release(); W.uploadGate = null;
    await W.waitFor(() => !W.editOpen(), 3000); await W.sleep(120);
    return { locked, t1, t2, open1, open2, unlocked: !document.body.classList.contains("edit-save-locked") };
  });
  ok("W12 Back and Close Drawer during Save toast \"Still saving — wait for it to finish\" and leave nothing",
    W12.locked && W12.open1 && W12.open2 && W12.t1 === "Still saving — wait for it to finish" && W12.t2 === W12.t1 && W12.unlocked, W12);

  // ---------- W13 navigate asks first; Discard drops the pick (C2) ----------
  const W13 = await page.evaluate(async () => {
    const W = __ws; W.install();
    let host = await W.openEditCoin();
    const refBody = W.section(host, /Reference/);
    const plus = [...refBody.querySelectorAll("button")].find(b => /Add|＋|\+/.test(b.getAttribute("aria-label") || b.textContent));
    await W.addVia(plus); await W.sleep(120);
    W.graphCalls = 0;
    const left = navigate("dashboard");
    await W.sleep(40);
    const asked = W.guardOpen() ? W.guardText() : "";
    const pendingWhileAsking = pendingPhotoCount("AY-00099");
    W.clickGuard("Discard");
    await W.sleep(80);
    const view = (document.querySelector(".view.active") || {}).id;
    return { left, asked, pendingWhileAsking, view, writes: W.graphCalls, pending: pendingPhotoCount("AY-00099"),
      refs: galleryFor("AY-00099").filter(e => e.type === "reference").length };
  });
  ok("W13 navigate with a pending pick asks first (nothing thrown away yet); Discard drops it, leaves and writes nothing",
    W13.left === false && /changed 1 photo on AY-00099/.test(W13.asked) && W13.pendingWhileAsking === 1 &&
    W13.view === "view-dashboard" && W13.writes === 0 && W13.pending === 0 && W13.refs === 1, W13);

  // ---------- W15 ✕ on a pick that replaced a saved photo is an UNDO ---------
  // (Ray, 29 Oct 2026, reversing "takes that photo with it".) The pick goes,
  // the previous photo is back in its slot, nothing is deleted or written;
  // ✕ on the restored photo is then the ordinary remove.
  const W15 = await page.evaluate(async () => {
    const W = __ws; W.install();
    const out = {};
    const obvSlot = (host) => W.slotFor(host, /Obverse/, "Obverse") || W.slotFor(host, /Obverse/, "Front");
    let host = await W.openEditCoin();
    const obv = () => galleryFor("AY-00099").find(e => e.type === "obverse");
    const saved = obv();
    out.hasSlot = !!obvSlot(host);
    W.graphCalls = 0;
    // a) Replace the saved Obverse, then ✕ the pick.
    out.rep1 = await W.addVia(obvSlot(host).querySelector('[data-act="replace"]'));
    await W.sleep(120); host = W.editHost();
    out.pickIsPending = !!(obv() && obv().pendingSave && obv().pendingReplaces === saved);
    obvSlot(host).querySelector('[data-act="remove"]').click();
    out.dialog = W.guardOpen() ? W.guardText() : "";
    W.clickGuard("Put it back");
    await W.sleep(100); host = W.editHost();
    out.restored = obv() === saved && !saved.pendingRemove && !saved.pendingSave;
    out.shownAgain = !!W.thumb(host, "AY-00099_obverse_cropped.jpg") || !!(obvSlot(host) && obvSlot(host).querySelector(".sg-photo-img, .gc-img"));
    out.pending = pendingPhotoCount("AY-00099");
    out.writes = W.graphCalls;
    // b) Replace twice (second Replace of the pick), then ✕: the ORIGINAL saved photo.
    await W.addVia(obvSlot(host).querySelector('[data-act="replace"]')); await W.sleep(100); host = W.editHost();
    await W.addVia(obvSlot(host).querySelector('[data-act="replace"]')); await W.sleep(100); host = W.editHost();
    out.chainPoints = !!(obv().pendingReplaces === saved);
    obvSlot(host).querySelector('[data-act="remove"]').click();
    W.clickGuard("Put it back"); await W.sleep(100); host = W.editHost();
    out.chainRestored = obv() === saved && !saved.pendingRemove;
    // c) ✕ on the restored saved photo is the ordinary stored-photo remove.
    obvSlot(host).querySelector('[data-act="remove"]').click();
    out.plainDialog = W.guardOpen() ? W.guardText() : "";
    W.clickGuard("Remove"); await W.sleep(100);
    out.plainMarked = saved.pendingRemove === true;
    // d) ✕ on a never-saved Add keeps its own wording and just goes.
    discardUnsavedPhotoEdits("AY-00099");
    const refBody = W.section(W.editHost(), /Reference/);
    const plus = [...refBody.querySelectorAll("button")].find(b => /Add|＋|\+/.test(b.getAttribute("aria-label") || b.textContent));
    await W.addVia(plus); await W.sleep(100); host = W.editHost();
    const pickThumb = [...W.section(host, /Reference/).querySelectorAll(".gc-thumb")].find(t => /Not saved yet/.test(t.textContent));
    pickThumb.querySelector(".gc-remove").click();
    out.addDialog = W.guardOpen() ? W.guardText() : "";
    W.clickGuard("Remove"); await W.sleep(80);
    out.addGone = !galleryFor("AY-00099").some(e => e.type === "reference" && e.pendingSave);
    // e) Crop from another photo into Obverse counts as a Replace.
    discardUnsavedPhotoEdits("AY-00099");
    host = W.editHost();
    const b = await W.jpeg();
    const blob = b.slice(0, b.size, "image/jpeg");
    saveCropFromUpload("AY-00099", "obverse", { storedFilename: "AY-00099_reference_01.jpg", type: "reference" },
      { type: "obverse", blob, url: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==", rawUrl: null, rawFilename: null, caption: "", filename: "x.jpg" }, () => {});
    await W.sleep(100);
    out.cropIsReplace = !!(obv().pendingSave && obv().pendingReplaces === saved);
    renderManagePhotosInto("browseEditPhotosSections", buildManagePhotosCtx(W.coin), { showSetChildren: false });
    host = W.editHost();
    obvSlot(host).querySelector('[data-act="remove"]').click();
    out.cropDialog = W.guardOpen() ? W.guardText() : "";
    W.clickGuard("Put it back"); await W.sleep(80);
    out.cropUndone = obv() === saved && !saved.pendingRemove;
    discardUnsavedPhotoEdits("AY-00099"); navigate("dashboard");
    return out;
  });
  ok("W15 ✕ on a Replace pick (Edit Coin) puts the saved photo back, nothing pending, ZERO writes",
    W15.hasSlot && W15.rep1 && W15.pickIsPending && W15.restored && W15.pending === 0 && W15.writes === 0, W15);
  ok("W15b the dialog says it puts the previous photo back and deletes nothing",
    /Put the previous photo back\?/.test(W15.dialog) && /previous photo back/.test(W15.dialog) && /Nothing is deleted/.test(W15.dialog) &&
    !/removed when you tap Save/.test(W15.dialog), W15);
  ok("W15c Replace twice then ✕ restores the ORIGINAL saved photo", W15.chainPoints && W15.chainRestored, W15);
  ok("W15d ✕ on the restored saved photo is the ordinary remove (marked, stored-photo wording)",
    W15.plainMarked && /will be removed when you tap Save/.test(W15.plainDialog), W15);
  ok("W15e ✕ on a never-saved Add keeps its own wording and just goes",
    /hasn't been saved yet/.test(W15.addDialog) && W15.addGone, W15);
  ok("W15f Crop from another photo into Obverse counts as a Replace, and ✕ on it undoes it",
    W15.cropIsReplace && /Nothing is deleted/.test(W15.cropDialog) && W15.cropUndone, W15);

  // W16: Edit Set and Manage Photos behave the same.
  const W16 = await page.evaluate(async () => {
    const W = __ws; W.install();
    const out = {};
    // Edit Set: Replace the COA page, ✕ the pick.
    let host = W.openEditSet();
    const coa = () => galleryFor("AY-00090").find(e => e.type === "coa");
    const savedCoa = coa();
    out.rep = await W.addVia(W.replaceOn(W.thumb(host, "AY-00090_coa_01.jpg")));
    await W.sleep(120); host = W.editSetHost ? W.editSetHost() : W.openAll("editSetPhotosSections");
    out.isReplace = !!(coa().pendingSave && coa().pendingReplaces === savedCoa);
    W.graphCalls = 0;
    const pickThumb = [...host.querySelectorAll(".gc-thumb")].find(t => /Not saved yet/.test(t.textContent));
    pickThumb.querySelector(".gc-remove").click();
    out.setDialog = W.guardOpen() ? W.guardText() : "";
    W.clickGuard("Put it back"); await W.sleep(100);
    out.setRestored = coa() === savedCoa && !savedCoa.pendingRemove && pendingPhotoCount("AY-00090") === 0 && W.graphCalls === 0;
    discardUnsavedPhotoEdits("AY-00090"); navigate("dashboard");
    // Manage Photos on the coin: Replace the Other photo, ✕ the pick.
    W.install();
    host = W.openManageCoin();
    const other = () => galleryFor("AY-00099").find(e => e.type === "other");
    const savedOther = other();
    out.mpRep = await W.addVia(W.replaceOn(W.thumb(host, "AY-00099_other_01.jpg")));
    await W.sleep(120); host = W.openAll("managePhotosSections");
    const pt = [...host.querySelectorAll(".gc-thumb")].find(t => /Not saved yet/.test(t.textContent));
    pt.querySelector(".gc-remove").click();
    out.mpDialog = W.guardOpen() ? W.guardText() : "";
    W.clickGuard("Put it back"); await W.sleep(100);
    out.mpRestored = other() === savedOther && !savedOther.pendingRemove && pendingPhotoCount("AY-00099") === 0;
    discardUnsavedPhotoEdits("AY-00099"); navigate("dashboard");
    return out;
  });
  ok("W16 Edit Set: ✕ on a Replace pick puts the saved photo back, nothing written",
    W16.rep && W16.isReplace && /Nothing is deleted/.test(W16.setDialog) && W16.setRestored, W16);
  ok("W16b Manage Photos: ✕ on a Replace pick puts the saved photo back",
    W16.mpRep && /Nothing is deleted/.test(W16.mpDialog) && W16.mpRestored, W16);

  // ---------- W14 layout of the pending states -----------------------------
  for (const vp of [{ width: 360, height: 800 }, { width: 412, height: 915 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(vp);
    const L = await page.evaluate(async () => {
      const W = __ws; W.install();
      let host = await W.openEditCoin();
      const refBody = W.section(host, /Reference/);
      const plus = [...refBody.querySelectorAll("button")].find(b => /Add|＋|\+/.test(b.getAttribute("aria-label") || b.textContent));
      await W.addVia(plus); await W.sleep(150); host = W.editHost();
      const t = [...W.section(host, /Reference/).querySelectorAll(".gc-thumb")].find(x => /Not saved yet/.test(x.textContent));
      const st = t && t.querySelector(".photo-upload-state");
      const rep = t && t.querySelector('[data-role="replace"]');
      const tr = t && t.getBoundingClientRect(), sr = st && st.getBoundingClientRect(), rr = rep && rep.getBoundingClientRect();
      // A pair slot's line too (a Holder pick): also under its Replace.
      const holderSlot = W.slotFor(host, /Holder/, "Front");
      await W.addVia(holderSlot && holderSlot.querySelector('[data-act="add"]')); await W.sleep(150); host = W.editHost();
      const hs = W.slotFor(host, /Holder/, "Front");
      const hst = hs && hs.querySelector(".photo-upload-state"), hrep = hs && hs.querySelector('[data-act="replace"]');
      const out = { has: !!st, inside: !!(tr && sr && sr.left >= tr.left - 1 && sr.right <= tr.right + 1),
        oneLine: !!(st && st.getBoundingClientRect().height < 24), overflow: document.documentElement.scrollWidth > window.innerWidth,
        underReplace: !!(sr && rr && sr.top >= rr.bottom - 1),
        slotUnderReplace: !!(hst && hrep && hst.getBoundingClientRect().top >= hrep.getBoundingClientRect().bottom - 1) };
      discardUnsavedPhotoEdits(); navigate("dashboard");
      return out;
    });
    ok("W14 at " + vp.width + "x" + vp.height + " the \"Not saved yet\" line sits inside its tile on one line, no sideways scroll",
      L.has && L.inside && L.oneLine && !L.overflow, L);
    ok("W14b at " + vp.width + "x" + vp.height + " the status line sits under the Replace button, on a Reference tile and a Holder slot",
      L.underReplace && L.slotUnderReplace, L);
  }
}, module);
