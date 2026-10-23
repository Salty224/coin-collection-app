// Label save on blur (Oct 2026, claude/label-save-on-blur).
//
// WHY. On the unified chooser a label typed on a saved photo (Reference,
// COA, Other) lived only in memory until the photo was next captured or
// replaced. Now it is written to the photo's Photos row when the box loses
// focus. Draft mode (Add Coin, a Staging edit) keeps it in memory until Save.
//
//   L1  blur writes Label by PhotoID; ONE cell; every other cell unchanged,
//       including a column with a blank header (not in the header map)
//       and DateAdded as a number; the table doesn't grow; "Label saved."
//   L2  an unchanged blur sends nothing; change + blur = one write
//   L3  Enter saves and leaves the box
//   L4  a redraw keeps an unsaved label and writes it; a cleared label sticks
//   L5  blur while a Replace is still saving: waits, the label PATCH comes
//       after the save's own row write, both land
//   L6  never-saved photo: no write, "Label kept" toast, ↻ saves both
//   L7  write failure: text kept, "Label not saved" line, next blur writes
//   L8  leaving the screen (navigate, Back) with the box focused writes it
//   L9  Replace keeps the edited label and the PhotoID
//   L10 draft mode: no Graph call on blur; Staging edit Save keeps the label
//   L11 the four live screens: Edit Coin, Manage Photos coin, Edit Set,
//       Manage Photos set
//   L12 legacyOnly entry: read-only box with the Replace hint
//   L13 visibilitychange (hidden) and pagehide write a changed label
//   LL  the red line's layout at 360x800, 412x915, 1024x768

const { defineSuite } = require("./harness");

const HEADER = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "", "OriginalFilename"];

async function setup(page) {
  await page.evaluate(({ HEADER }) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
    window.__lb = {
      HEADER, sleep,
      graphCalls: 0, patches: [], mock: null, id: "AY-00099",
      coin: { id: "AY-00099", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" },
      set: { id: "AY-00090", name: "1957 Proof Set", denom: "Multiple", year: 1957, mint: "", category: "Proof Set" },
      install() {
        const self = this;
        // Column H has a blank header: it is NOT in the header map. Its
        // cells carry "keep-me" so a whole-row rewrite would show as blanked.
        const mock = createMockGraphClient({ sheets: { Photos: [
          HEADER,
          ["PH-00001", "AY-00099", "Obverse", "", "AY-00099_obverse_cropped.jpg", "", 46000, "keep-me", ""],
          ["PH-00002", "AY-00099", "Reference", "", "AY-00099_reference_01.jpg", "PCGS photo", 46000, "keep-me", ""],
          ["PH-00003", "AY-00099", "Other", "", "AY-00099_other_01.jpg", "", 46001, "keep-me", ""],
          ["PH-00010", "AY-00090", "OGP_Obverse", "", "AY-00090_ogp_obverse.jpg", "", 46000, "keep-me", ""],
          ["PH-00011", "AY-00090", "COA", "", "AY-00090_coa_01.jpg", "page 1", 46000, "keep-me", ""],
          ["", "", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", "", ""],
        ] } });
        this.mock = mock;
        this.patches = [];
        __setGraphClientForTest(new Proxy(mock, { get(t, k) {
          const v = t[k];
          if (typeof v !== "function") return v;
          return (...a) => {
            self.graphCalls++; (self.calls = self.calls || []).push(k);
            if (k === "patchWorkbookRanges") self.patches.push(a[2].map(e => e.address).join(","));
            return v.apply(t, a);
          };
        } }));
        __resetSheetHeaderMapsForTest();
        __setAddCoinWriteEnabledForTest(true);
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
        this.clearToast();
        this.graphCalls = 0;
      },
      row(pid) { return this.mock._grids.Photos.find(r => r[0] === pid) || null; },
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
      openEditCoin() {
        navigate("browse"); showBrowseDetail(this.coin); showBrowseEditView(this.coin);
        const oh = document.getElementById("editCoinPhotosHeader");
        if (oh.getAttribute("aria-expanded") !== "true") oh.click();
        this.closeOverlays();
        return this.openAll("browseEditPhotosSections");
      },
      openManageCoin() {
        openManagePhotos({ id: this.coin.id, name: "x", meta: this.coin.id, kind: "coin", backTo: () => {} });
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
      openManageSet() {
        openManagePhotos({ id: this.set.id, name: "x", meta: this.set.id, kind: "set", backTo: () => {} });
        this.closeOverlays();
        return this.openAll("managePhotosSections");
      },
      // The label box of the thumb showing `filename` (thumbs carry data-file).
      boxFor(host, targetId, filename) {
        const t = [...host.querySelectorAll(".gc-thumb")].find(x => x.dataset.file === filename);
        return t ? t.querySelector(".gc-caption") : null;
      },
      entry(targetId, filename) { return galleryFor(targetId).find(e => (e.storedFilename || e.filename) === filename) || null; },
      type(box, text) { if (!box) return false; box.focus(); box.value = text; box.dispatchEvent(new Event("input", { bubbles: true })); return true; },
      blur(box) { if (!box) return false; box.dispatchEvent(new Event("change", { bubbles: true })); box.blur(); return true; },
      toast() { const t = document.getElementById("toast"); return t.classList.contains("show") ? t.textContent : ""; },
      clearToast() { const t = document.getElementById("toast"); t.classList.remove("show"); t.textContent = ""; },
      async waitFor(fn, ms) { const end = Date.now() + (ms || 3000); while (Date.now() < end) { if (fn()) return true; await sleep(30); } return !!fn(); },
      async settle(targetId, filename) {
        const e = this.entry(targetId, filename);
        if (e && e.labelPromise) await e.labelPromise;
        await sleep(30);
      },
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
    };
  }, { HEADER });
}

module.exports = defineSuite("label-save-on-blur", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);
  await setup(page);

  // ---------- L1 / L2 / L3 ------------------------------------------------
  const A = await page.evaluate(async () => {
    const L = __lb; L.install();
    const host = L.openEditCoin();
    await L.sleep(400);   // let Edit Coin's own snapshot read finish
    const before = L.row("PH-00002").slice();
    const lenBefore = L.gridLength();
    const box = L.boxFor(host, "AY-00099", "AY-00099_reference_01.jpg");
    const out = { found: !!box, boxValue: box && box.value };
    // L2a: focus + blur with nothing changed sends nothing.
    L.graphCalls = 0; L.calls = [];
    box.focus(); box.blur();
    await L.settle("AY-00099", "AY-00099_reference_01.jpg");
    out.unchangedCalls = L.graphCalls; out.unchangedWhich = L.calls.slice();
    // L1: change + blur.
    L.patches = []; L.clearToast();
    L.type(box, "TrueView obverse"); L.blur(box);
    await L.settle("AY-00099", "AY-00099_reference_01.jpg");
    await L.waitFor(() => L.row("PH-00002")[5] === "TrueView obverse", 2000);
    const after = L.row("PH-00002");
    out.label = after[5];
    out.others = before.map((v, i) => i === 5 ? true : v === after[i]);
    out.extra = after[7];
    out.dateType = typeof after[6];
    out.patches = L.patches.slice();
    out.toast = L.toast();
    out.lenSame = L.gridLength() === lenBefore;
    out.otherRowsExtra = L.mock._grids.Photos.slice(1).filter(r => r[0]).every(r => r[7] === "keep-me");
    out.index = (galleryFor("AY-00099"), (window.__lbIndex = null));
    // L2b: blur again with nothing new: nothing sent.
    L.patches = []; L.graphCalls = 0;
    box.focus(); box.blur();
    await L.settle("AY-00099", "AY-00099_reference_01.jpg");
    out.repeatCalls = L.graphCalls;
    // L3: Enter.
    L.patches = [];
    const box3 = L.boxFor(host, "AY-00099", "AY-00099_other_01.jpg");
    L.type(box3, "Mint box");
    box3.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    out.enterLeft = document.activeElement !== box3;
    await L.settle("AY-00099", "AY-00099_other_01.jpg");
    await L.waitFor(() => L.row("PH-00003")[5] === "Mint box", 2000);
    out.enterLabel = L.row("PH-00003")[5];
    out.enterPatches = L.patches.slice();
    return out;
  });
  ok(A.found && A.boxValue === "PCGS photo", "L0 Edit Coin shows the stored Reference label in its box: " + JSON.stringify([A.found, A.boxValue]));
  ok(A.unchangedCalls === 0, "L2a focus + blur with an unchanged label sends no Graph request: " + A.unchangedCalls + " " + JSON.stringify(A.unchangedWhich));
  ok(A.label === "TrueView obverse", "L1a blur writes the label to PH-00002's Label cell: " + A.label);
  ok(A.patches.length === 1 && A.patches[0] === "F3:F3", "L1b exactly ONE single-cell PATCH, the Label cell (F3): " + JSON.stringify(A.patches));
  ok(A.others.every(Boolean), "L1c every other cell of the row is unchanged: " + JSON.stringify(A.others));
  ok(A.extra === "keep-me" && A.otherRowsExtra, "L1d the blank-header column (not in the header map) keeps its value: " + JSON.stringify([A.extra, A.otherRowsExtra]));
  ok(A.dateType === "number", "L1e DateAdded is still a number: " + A.dateType);
  ok(A.lenSame, "L1f the Photos table did not grow");
  ok(/Label saved\./.test(A.toast), "L1g toast says \"Label saved.\": " + A.toast);
  ok(A.repeatCalls === 0, "L2b a second blur with no new change sends nothing: " + A.repeatCalls);
  ok(A.enterLeft && A.enterLabel === "Mint box", "L3 Enter leaves the box and saves the label: " + JSON.stringify([A.enterLeft, A.enterLabel]));
  ok(A.enterPatches.length === 1, "L3b Enter + the resulting blur write once, not twice: " + JSON.stringify(A.enterPatches));

  // ---------- L4 redraw keeps an unsaved label; clearing sticks ------------
  const B = await page.evaluate(async () => {
    const L = __lb; L.install();
    let host = L.openEditCoin();
    const box = L.boxFor(host, "AY-00099", "AY-00099_reference_01.jpg");
    L.type(box, "Typed before redraw");          // no blur
    // Something else redraws the section (e.g. another photo finishing).
    renderManagePhotosInto("browseEditPhotosSections", buildManagePhotosCtx(L.coin));
    host = L.openAll("browseEditPhotosSections");
    const kept = L.boxFor(host, "AY-00099", "AY-00099_reference_01.jpg");
    const out = { keptValue: kept && kept.value };
    await L.settle("AY-00099", "AY-00099_reference_01.jpg");
    await L.waitFor(() => L.row("PH-00002")[5] === "Typed before redraw", 2000);
    out.written = L.row("PH-00002")[5];
    // Clear to blank, blur, redraw: it stays blank (sheet and screen).
    const b2 = L.boxFor(host, "AY-00099", "AY-00099_reference_01.jpg");
    L.type(b2, ""); L.blur(b2);
    await L.settle("AY-00099", "AY-00099_reference_01.jpg");
    await L.waitFor(() => L.row("PH-00002")[5] === "", 2000);
    out.clearedRow = L.row("PH-00002")[5];
    renderManagePhotosInto("browseEditPhotosSections", buildManagePhotosCtx(L.coin));
    host = L.openAll("browseEditPhotosSections");
    const b3 = L.boxFor(host, "AY-00099", "AY-00099_reference_01.jpg");
    out.clearedBox = b3 && b3.value;
    return out;
  });
  ok(B.keptValue === "Typed before redraw", "L4a a redraw keeps the label typed but not yet saved: " + B.keptValue);
  ok(B.written === "Typed before redraw", "L4b the redraw writes it to the row: " + B.written);
  ok(B.clearedRow === "" && B.clearedBox === "", "L4c a label cleared to blank stays blank after a redraw: " + JSON.stringify([B.clearedRow, B.clearedBox]));

  // ---------- L5 blur while a Replace is still saving ---------------------
  const C = await page.evaluate(async () => {
    const L = __lb; L.install();
    const host = L.openEditCoin();
    const realUpload = L.mock.uploadFile;
    let release; const gate = new Promise(r => { release = r; });
    L.mock.uploadFile = async (...a) => { await gate; return realUpload.apply(L.mock, a); };
    const out = {};
    const oldEntry = L.entry("AY-00099", "AY-00099_reference_01.jpg");
    const thumbs = () => [...host.querySelectorAll(".gc-thumb")];
    const repBtn = (() => {
      const box = L.boxFor(host, "AY-00099", "AY-00099_reference_01.jpg");
      return box && box.closest(".gc-thumb").querySelector('[data-role="replace"]');
    })();
    out.picked = L.pickVia(repBtn, await L.jpeg());
    out.crop = await L.finishCrop();
    await L.waitFor(() => galleryFor("AY-00099").some(e => e.type === "reference" && e.uploadPending), 3000);
    const newEntry = galleryFor("AY-00099").find(e => e.type === "reference" && e.uploadPending);
    out.pending = !!newEntry;
    // Type and blur while the upload is held.
    const cur = L.openAll("browseEditPhotosSections");
    const sec = [...cur.querySelectorAll(".accordion-header")].find(h => /Reference/.test(h.textContent)).nextElementSibling;
    const box = sec.querySelector(".gc-caption");
    L.patches = [];
    L.type(box, "Typed while saving"); L.blur(box);
    await L.sleep(100);
    out.patchesWhileHeld = L.patches.slice();
    release();
    await L.waitFor(() => newEntry && !newEntry.uploadPending, 4000);
    if (newEntry && newEntry.labelPromise) await newEntry.labelPromise;
    await L.sleep(150);
    for (let i = 0; i < 5; i++) { flushPendingPhotoLabels(); if (newEntry.labelPromise) await newEntry.labelPromise; await L.sleep(40); }
    const row = L.row("PH-00002");
    out.label = row && row[5];
    out.filename = row && row[4];
    out.stored = newEntry && newEntry.storedFilename;
    out.patches = L.patches.slice();
    // The save's own row write (A3:...) comes before any Label-only write.
    const rowWrite = out.patches.findIndex(p => /^A3:/.test(p));
    const labelWrite = out.patches.findIndex(p => p === "F3:F3");
    out.order = { rowWrite, labelWrite };
    out.orderOk = rowWrite >= 0 && (labelWrite === -1 || labelWrite > rowWrite);
    L.mock.uploadFile = realUpload;
    return out;
  });
  ok(C.picked && C.crop && C.pending, "L5a a Replace on the Reference is in flight: " + JSON.stringify([C.picked, C.crop, C.pending]));
  ok(C.patchesWhileHeld.length === 0, "L5b blur while the photo is still saving writes nothing yet: " + JSON.stringify(C.patchesWhileHeld));
  ok(C.label === "Typed while saving" && C.filename === C.stored && !!C.stored,
    "L5c after the save lands, the row has the new photo AND the typed label: " + JSON.stringify([C.label, C.filename, C.stored]));
  ok(C.orderOk, "L5d no Label-only write runs before the save's own row write: " + JSON.stringify([C.order, C.patches]));

  // L5e: the wait itself. A real Replace has no saved label until its save
  // lands (so it is never "dirty" while pending, which already protects L5);
  // this drives commitPhotoLabel() on an entry that IS dirty while pending.
  const C2 = await page.evaluate(async () => {
    const L = __lb; L.install();
    L.openEditCoin();
    const e = L.entry("AY-00099", "AY-00099_reference_01.jpg");
    let release; e.uploadPending = true;
    e.commitPromise = new Promise(r => { release = () => { e.uploadPending = false; r(null); }; });
    e.caption = "Dirty while pending";
    L.patches = [];
    const p = commitPhotoLabel("AY-00099", e);
    await L.sleep(150);
    const during = L.patches.slice();
    release();
    await p;
    await L.sleep(30);
    return { during, after: L.patches.slice(), label: L.row("PH-00002")[5] };
  });
  ok(C2.during.length === 0 && C2.after.length === 1 && C2.label === "Dirty while pending",
    "L5e a dirty label on a still-saving photo waits for the save, then writes once: " + JSON.stringify(C2));

  // ---------- L6 never-saved photo ------------------------------------------
  const D = await page.evaluate(async () => {
    const L = __lb; L.install();
    let host = L.openEditCoin();
    const realUpload = L.mock.uploadFile;
    L.mock.uploadFile = async () => { throw new Error("offline"); };
    const sec = () => [...L.openAll("browseEditPhotosSections").querySelectorAll(".accordion-header")].find(h => /Other/.test(h.textContent)).nextElementSibling;
    const out = {};
    out.picked = L.pickVia(sec().querySelector('[data-role="add"]'), await L.jpeg());
    out.crop = await L.finishCrop();
    await L.waitFor(() => galleryFor("AY-00099").some(e => e.type === "other" && e.uploadError), 4000);
    const e = galleryFor("AY-00099").find(x => x.type === "other" && x.uploadError);
    out.failed = !!e;
    const thumb = [...sec().querySelectorAll(".gc-thumb")].pop();
    const box = thumb.querySelector(".gc-caption");
    L.patches = []; L.graphCalls = 0; L.clearToast();
    L.type(box, "Slab label"); L.blur(box);
    if (e.labelPromise) await e.labelPromise;
    await L.sleep(50);
    out.calls = L.graphCalls;
    out.toast = L.toast();
    out.caption = e.caption;
    out.rowsBefore = L.rowCount();
    // ↻ with the network back.
    L.mock.uploadFile = realUpload;
    const retry = [...sec().querySelectorAll(".gc-thumb")].pop().querySelector(".gc-retry");
    out.hasRetry = !!retry;
    if (retry) retry.click();
    await L.waitFor(() => !e.uploadPending && !e.uploadError && !!e.storedPhotoId, 4000);
    await L.sleep(100);
    const row = L.row(e.storedPhotoId);
    out.row = row && [row[2], row[5]];
    out.rowsAfter = L.rowCount();
    return out;
  });
  ok(D.picked && D.crop && D.failed, "L6a a new Other photo fails to save: " + JSON.stringify([D.picked, D.crop, D.failed]));
  ok(D.calls === 0, "L6b blur on a never-saved photo sends no Graph request: " + D.calls);
  ok(/Label kept — it saves with the photo when ↻ succeeds\./.test(D.toast) && D.caption === "Slab label",
    "L6c the label is kept and the toast says so: " + JSON.stringify([D.toast, D.caption]));
  ok(D.hasRetry && D.row && D.row[0] === "Other" && D.row[1] === "Slab label" && D.rowsAfter === D.rowsBefore + 1,
    "L6d ↻ saves the photo and its label in one new row: " + JSON.stringify(D));

  // ---------- L7 write failure -------------------------------------------
  const E = await page.evaluate(async () => {
    const L = __lb; L.install();
    const host = L.openEditCoin();
    const realPatch = L.mock.patchWorkbookRanges;
    L.mock.patchWorkbookRanges = async () => { throw new Error("Batch write failed: 503"); };
    const box = L.boxFor(host, "AY-00099", "AY-00099_reference_01.jpg");
    L.clearToast();
    L.type(box, "Will fail first"); L.blur(box);
    await L.settle("AY-00099", "AY-00099_reference_01.jpg");
    const out = {};
    out.toast = L.toast();
    out.boxValue = box.value;
    const thumb = box.closest(".gc-thumb");
    const line = thumb.querySelector(".gc-label-failed");
    out.line = line ? line.textContent : null;
    out.lineVisible = !!line && line.getBoundingClientRect().height > 0;
    out.row = L.row("PH-00002")[5];
    // Network back: tap the box and tap away.
    L.mock.patchWorkbookRanges = realPatch;
    box.focus(); box.blur();
    await L.settle("AY-00099", "AY-00099_reference_01.jpg");
    await L.waitFor(() => L.row("PH-00002")[5] === "Will fail first", 2000);
    out.row2 = L.row("PH-00002")[5];
    out.lineGone = !thumb.querySelector(".gc-label-failed");
    return out;
  });
  ok(/Couldn't save the label — it's still in the box/.test(E.toast), "L7a a failed write says so: " + E.toast);
  ok(E.boxValue === "Will fail first" && E.row === "PCGS photo", "L7b the typed text stays in the box; the row is unchanged: " + JSON.stringify([E.boxValue, E.row]));
  ok(E.line === "Label not saved" && E.lineVisible, "L7c a red \"Label not saved\" line shows under the box: " + JSON.stringify([E.line, E.lineVisible]));
  ok(E.row2 === "Will fail first" && E.lineGone, "L7d the next blur writes it and the line goes: " + JSON.stringify([E.row2, E.lineGone]));

  // ---------- L8 leaving the screen with the box focused -------------------
  const F = await page.evaluate(async () => {
    const L = __lb; L.install();
    let host = L.openEditCoin();
    let box = L.boxFor(host, "AY-00099", "AY-00099_reference_01.jpg");
    L.type(box, "Left via navigate");             // focused, no blur event
    navigate("dashboard");
    await L.settle("AY-00099", "AY-00099_reference_01.jpg");
    await L.waitFor(() => L.row("PH-00002")[5] === "Left via navigate", 2000);
    const out = { nav: L.row("PH-00002")[5] };
    host = L.openManageCoin();
    box = L.boxFor(host, "AY-00099", "AY-00099_other_01.jpg");
    L.type(box, "Left via Back");
    // Back can run a sub-screen handler that never calls navigate().
    setNavBack(() => {});
    document.getElementById("navBackBtn").click();
    await L.settle("AY-00099", "AY-00099_other_01.jpg");
    await L.waitFor(() => L.row("PH-00003")[5] === "Left via Back", 2000);
    out.back = L.row("PH-00003")[5];
    return out;
  });
  ok(F.nav === "Left via navigate", "L8a leaving the screen (navigate) writes a focused, changed label: " + F.nav);
  ok(F.back === "Left via Back", "L8b the Back button writes it even when its handler doesn't navigate: " + F.back);

  // ---------- L9 Replace keeps the edited label and PhotoID ---------------
  const G = await page.evaluate(async () => {
    const L = __lb; L.install();
    const host = L.openEditCoin();
    const box = L.boxFor(host, "AY-00099", "AY-00099_reference_01.jpg");
    L.type(box, "Edited then replaced"); L.blur(box);
    await L.settle("AY-00099", "AY-00099_reference_01.jpg");
    await L.waitFor(() => L.row("PH-00002")[5] === "Edited then replaced", 2000);
    const rows = L.rowCount();
    const rep = box.closest(".gc-thumb").querySelector('[data-role="replace"]');
    const out = { picked: L.pickVia(rep, await L.jpeg()), crop: await L.finishCrop() };
    await L.waitFor(() => galleryFor("AY-00099").some(e => e.type === "reference" && !e.stored && !e.uploadPending && e.storedFilename), 4000);
    await L.sleep(100);
    const row = L.row("PH-00002");
    out.label = row[5]; out.file = row[4]; out.rowsSame = L.rowCount() === rows;
    return out;
  });
  ok(G.picked && G.crop && G.label === "Edited then replaced" && G.file !== "AY-00099_reference_01.jpg" && G.rowsSame,
    "L9 Replace updates PH-00002 in place and keeps the edited label: " + JSON.stringify(G));

  // ---------- L10 draft mode ---------------------------------------------
  const H = await page.evaluate(async () => {
    const L = __lb; L.install();
    navigate("addcoin");
    const id = ADDCOIN_GALLERY_ID;
    galleryFor(id).push({ type: "reference", url: URL.createObjectURL(new Blob([new Uint8Array([1])], { type: "image/jpeg" })),
      blob: new Blob([new Uint8Array([1])], { type: "image/jpeg" }), filename: id + "_reference_01.jpg", caption: "" });
    renderAddCoinPhotos();
    const host = L.openAll("addCoinPhotoSections");
    const sec = [...host.querySelectorAll(".accordion-header")].find(h => /Reference/.test(h.textContent));
    const box = host.querySelector('.gc-thumb[data-file="' + id + '_reference_01.jpg"] .gc-caption');
    L.graphCalls = 0;
    const out = { heads: [...host.querySelectorAll(".gc-thumb")].map(t => t.dataset.file) };
    out.typed = L.type(box, "Draft label"); L.blur(box);
    await L.sleep(80);
    out.calls = L.graphCalls;
    out.caption = galleryFor(id)[galleryFor(id).length - 1].caption;
    out.noLine = !host.querySelector(".gc-label-failed");
    // Staging edit: changing only the label of a photo already in Staging
    // changes only that caption in coin.json.
    galleryStore[id] = [{ type: "reference", stagingStored: true, storedFilename: "AY-00800_reference_01.jpg",
      stagingFiles: ["AY-00800_reference_01.jpg"], caption: "New label" }];
    const fresh = { photos: [
      { type: "obverse", filename: "AY-00800_obverse_cropped.jpg", caption: "" },
      { type: "obverse", filename: "AY-00800_obverse_original.jpg", caption: "original" },
      { type: "reference", filename: "AY-00800_reference_01.jpg", caption: "Old label" },
    ], receiptPhoto: "" };
    const merged = mergeStagingEditFiles("AY-00800", fresh);
    out.merged = merged.photos;
    delete galleryStore[id];
    navigate("dashboard");
    return out;
  });
  ok(H.typed && H.calls === 0, "L10a Add Coin (draft): blur sends no Graph request: " + JSON.stringify([H.typed, H.calls, H.heads]));
  ok(H.caption === "Draft label" && H.noLine, "L10b the draft label stays in memory for Save: " + H.caption);
  ok(JSON.stringify(H.merged) === JSON.stringify([
      { type: "obverse", filename: "AY-00800_obverse_cropped.jpg", caption: "" },
      { type: "obverse", filename: "AY-00800_obverse_original.jpg", caption: "original" },
      { type: "reference", filename: "AY-00800_reference_01.jpg", caption: "New label" }]),
    "L10c Staging edit Save: a label-only change changes only that caption in coin.json: " + JSON.stringify(H.merged));

  // ---------- L11 the four live screens ------------------------------------
  const cases = [
    ["edit-coin", "openEditCoin", "AY-00099", "AY-00099_reference_01.jpg", "PH-00002"],
    ["manage-coin", "openManageCoin", "AY-00099", "AY-00099_reference_01.jpg", "PH-00002"],
    ["edit-set", "openEditSet", "AY-00090", "AY-00090_coa_01.jpg", "PH-00011"],
    ["manage-set", "openManageSet", "AY-00090", "AY-00090_coa_01.jpg", "PH-00011"],
  ];
  for (const [name, opener, target, file, pid] of cases) {
    const R = await page.evaluate(async ({ opener, target, file, pid, name }) => {
      const L = __lb; L.install();
      const host = L[opener]();
      const box = L.boxFor(host, target, file);
      if (!box) return { found: false };
      L.patches = [];
      const label = "Label on " + name;
      L.type(box, label); L.blur(box);
      await L.settle(target, file);
      await L.waitFor(() => L.row(pid)[5] === label, 2000);
      const row = L.row(pid);
      return { found: true, label: row[5], want: label, extra: row[7], patches: L.patches.slice() };
    }, { opener, target, file, pid, name });
    ok(R.found && R.label === R.want && R.extra === "keep-me" && R.patches.length === 1,
      `L11-${name}: blur writes the label to ${pid}, one single-cell write, the unmapped column kept: ` + JSON.stringify(R));
  }

  // ---------- L12 legacyOnly box is read-only ------------------------------
  const I = await page.evaluate(async () => {
    const L = __lb; L.install();
    let host = L.openEditCoin();
    galleryFor("AY-00099").push({ type: "other", url: null, stored: true, legacyOnly: true,
      filename: "AY-00099_legacy.jpg", storedFilename: "AY-00099_legacy.jpg", caption: "", savedLabel: "" });
    renderManagePhotosInto("browseEditPhotosSections", buildManagePhotosCtx(L.coin));
    host = L.openAll("browseEditPhotosSections");
    const box = L.boxFor(host, "AY-00099", "AY-00099_legacy.jpg");
    return { found: !!box, readOnly: box && box.readOnly, placeholder: box && box.placeholder,
             normalReadOnly: L.boxFor(host, "AY-00099", "AY-00099_other_01.jpg").readOnly };
  });
  ok(I.found && I.readOnly && I.placeholder === "Replace this photo to give it a label" && I.normalReadOnly === false,
    "L12 a photo with no Photos row (legacyOnly) gets a read-only box saying \"Replace this photo to give it a label\": " + JSON.stringify(I));

  // ---------- L13 app hidden / page closing --------------------------------
  const J = await page.evaluate(async () => {
    const L = __lb; L.install();
    const host = L.openEditCoin();
    let box = L.boxFor(host, "AY-00099", "AY-00099_reference_01.jpg");
    L.type(box, "Hidden page");
    const desc = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState");
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    delete document.visibilityState;
    await L.settle("AY-00099", "AY-00099_reference_01.jpg");
    await L.waitFor(() => L.row("PH-00002")[5] === "Hidden page", 2000);
    const out = { hidden: L.row("PH-00002")[5] };
    box = L.boxFor(host, "AY-00099", "AY-00099_other_01.jpg");
    L.type(box, "Page hide");
    window.dispatchEvent(new Event("pagehide"));
    await L.settle("AY-00099", "AY-00099_other_01.jpg");
    await L.waitFor(() => L.row("PH-00003")[5] === "Page hide", 2000);
    out.pagehide = L.row("PH-00003")[5];
    // visible again: does nothing extra.
    L.patches = [];
    document.dispatchEvent(new Event("visibilitychange"));
    await L.sleep(60);
    out.visibleNoop = L.patches.length;
    return out;
  });
  ok(J.hidden === "Hidden page", "L13a visibilitychange to hidden writes a changed label: " + J.hidden);
  ok(J.pagehide === "Page hide", "L13b pagehide writes a changed label: " + J.pagehide);
  ok(J.visibleNoop === 0, "L13c becoming visible again writes nothing: " + J.visibleNoop);

  // ---------- LL layout of the red line -----------------------------------
  for (const [w, h] of [[360, 800], [412, 915], [1024, 768]]) {
    await page.setViewportSize({ width: w, height: h });
    const K = await page.evaluate(async () => {
      const L = __lb; L.install();
      const host = L.openEditCoin();
      const realPatch = L.mock.patchWorkbookRanges;
      L.mock.patchWorkbookRanges = async () => { throw new Error("offline"); };
      const box = L.boxFor(host, "AY-00099", "AY-00099_reference_01.jpg");
      L.type(box, "A long label that will not save"); L.blur(box);
      await L.settle("AY-00099", "AY-00099_reference_01.jpg");
      L.mock.patchWorkbookRanges = realPatch;
      const thumb = box.closest(".gc-thumb");
      const line = thumb.querySelector(".gc-label-failed");
      const tr = thumb.getBoundingClientRect(), lr = line ? line.getBoundingClientRect() : null;
      const out = { line: !!line, inside: !!lr && lr.left >= tr.left - 1 && lr.right <= tr.right + 1,
        below: !!lr && lr.top >= box.getBoundingClientRect().bottom - 1,
        noScroll: document.documentElement.scrollWidth <= window.innerWidth };
      // tidy: write it so the next viewport starts clean
      box.focus(); box.blur(); await L.settle("AY-00099", "AY-00099_reference_01.jpg");
      return out;
    });
    ok(K.line && K.inside && K.below && K.noScroll, `LL ${w}x${h}: "Label not saved" sits under the box, inside the thumb, no sideways scroll: ` + JSON.stringify(K));
  }
}, module);
