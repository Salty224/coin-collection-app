// Unified image chooser (Oct 2026) — stage C1: the shared chooser sheet and
// the coin branch of renderManagePhotosInto() (Edit Coin and the standalone
// Manage Photos screen for a coin).
//
// WHY. Ray's S25 test of the per-slot 📷 🖼️ 📁 rows: every image interaction
// should work the same way. An empty slot is one "+" box; a filled slot shows
// the photo, its label and ONE "Replace" button; both open one chooser
// (📷 Camera / 🖼️ Library / 📁 Files). Behind the chooser nothing changes:
// Camera unguarded, Library and Files checked by isPickableImage(), the same
// crop pipeline, the same commit, Replace keeps PhotoID and Label. Tests
// CANNOT show which picker Android opens; they pin the attributes that decide
// it and the behaviour after a file arrives.
//
//   S  the chooser itself: three separate inputs with exact accept/capture,
//      z-index between the sheets (200) and the crop overlays (210), closes
//      on Cancel / backdrop / Esc, a source tap closes it before the picker
//   U  Edit Coin's coin screens: "+" boxes with the label inside, filled
//      slots with one Replace and the icon row, no 📷/🖼️/📁 row, no file
//      input inside any slot; Reference/Other get a "+" tile and a Replace
//      per thumbnail; the same on Manage Photos for a coin
//   X  scope after C2: only Add Coin, Add Set and Wishlist keep old buttons
//   V/SC/SJ/SR/SG/SL  the Set screens (C2): Edit Set and Manage Photos for
//      a Set — layout, Cancel, a JPEG commit, Replace keeps PhotoID and
//      Label with no leftover thumbnail, guard refusals, layout L1-L8
//   C  Cancel / backdrop / Esc add nothing and write nothing
//   J  a JPEG through Library and through Files commits like before: crop,
//      one upload, one Photos row
//   R  Replace on a stored Reference updates PH-00002 in place, Label kept
//   G  a PDF, broken JPEG and undecodable HEIC through Files, and a PDF
//      through Library, are refused with the toast: no crop, nothing added,
//      zero Graph requests; the stored photo stays
//   K  Camera is not guarded: a camera pick opens the crop screen
//   T  the gallery type picker overlay sits below the chooser (Add Coin's
//      gallery keeps its own order until C3; this pins the stacking)
//   L  layout at 360x800, 412x915 and 1024x768 with a long name

const { defineSuite } = require("./harness");

const FILES_ACCEPT = "image/*,application/pdf";
const TOAST = "That file isn't a photo. Nothing was added.";
const LONG_NAME = "1916-D Mercury Dime Winged Liberty Head Full Bands Key Date Extremely Long Description";

async function setup(page) {
  await page.evaluate(({ LONG_NAME }) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
    window.__ic = {
      graphCalls: 0, mock: null, id: "AY-00099",
      coin: { id: "AY-00099", name: LONG_NAME, denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" },
      stored() {
        return { "AY-00099": [
          { photoId: "PH-00001", photoType: "Obverse", galleryType: "obverse", subGroupId: "",
            filename: "AY-00099_obverse_cropped.jpg", originalFilename: "", label: "" },
          { photoId: "PH-00002", photoType: "Reference", galleryType: "reference", subGroupId: "",
            filename: "AY-00099_reference_01.jpg", originalFilename: "", label: "PCGS photo" },
        ] };
      },
      install() {
        const self = this;
        this.id = "AY-00099";
        const mock = createMockGraphClient({ sheets: { Photos: [
          ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"],
          ["PH-00001", "AY-00099", "Obverse", "", "AY-00099_obverse_cropped.jpg", "", 46000, ""],
          ["PH-00002", "AY-00099", "Reference", "", "AY-00099_reference_01.jpg", "PCGS photo", 46000, ""],
          ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""],
        ] } });
        this.mock = mock;
        __setGraphClientForTest(new Proxy(mock, { get(t, k) {
          const v = t[k]; return typeof v === "function" ? (...a) => { self.graphCalls++; return v.apply(t, a); } : v;
        } }));
        __resetSheetHeaderMapsForTest();
        __setAddCoinWriteEnabledForTest(true);
        __setLiveCoinsForTest([this.coin]);
        __setStoredPhotosForTest(this.stored());
        const url = () => URL.createObjectURL(new Blob([new Uint8Array([1])], { type: "image/jpeg" }));
        __setCoinPhotoCacheForTest("AY-00099_obverse_cropped.jpg", url());
        __setCoinPhotoCacheForTest("AY-00099_reference_01.jpg", url());
        delete galleryStore[this.id];
        closeImageSourceChooser();
        this.graphCalls = 0;
      },
      openSection(hostId, re) {
        const host = document.getElementById(hostId);
        const h = [...host.querySelectorAll(".accordion-header")].find(x => re.test(x.textContent));
        if (h && h.getAttribute("aria-expanded") !== "true") h.click();
        return h ? h.nextElementSibling : null;
      },
      openAll(hostId) {
        const host = document.getElementById(hostId);
        [...host.querySelectorAll(".accordion-header")].forEach(h => { if (h.getAttribute("aria-expanded") !== "true") h.click(); });
        return host;
      },
      openEditCoin() {
        navigate("browse"); showBrowseDetail(this.coin); showBrowseEditView(this.coin);
        const oh = document.getElementById("editCoinPhotosHeader");
        if (oh.getAttribute("aria-expanded") !== "true") oh.click();
        this.closeOverlays();
        return document.getElementById("browseEditPhotosSections");
      },
      closeOverlays() {
        if (typeof closeBgCrop === "function") closeBgCrop();
        document.getElementById("photoAdjustOverlay").classList.add("hidden");
        this.clearToast();
      },
      async jpeg() {
        const c = document.createElement("canvas"); c.width = 300; c.height = 300;
        const x = c.getContext("2d"); x.fillStyle = "#2a6"; x.fillRect(0, 0, 300, 300);
        x.fillStyle = "#da3"; x.beginPath(); x.arc(150, 150, 110, 0, Math.PI * 2); x.fill();
        const b = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
        return new File([b], "coin.jpg", { type: "image/jpeg" });
      },
      file(kind) {
        if (kind === "pdf") return new File(["%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"], "receipt.pdf", { type: "application/pdf" });
        if (kind === "broken") return new File([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4, 5, 6, 7, 8])], "broken.jpg", { type: "image/jpeg" });
        if (kind === "heic") {
          const b = new Uint8Array(64); b.set([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], 0);
          return new File([b], "IMG_0001.HEIC", { type: "image/heic" });
        }
      },
      chooser() { return document.getElementById("imageSourceChooser"); },
      chooserOpen() { const o = this.chooser(); return !!o && !o.classList.contains("hidden"); },
      inputFor(source) {
        return document.getElementById({ camera: "imageChooserCameraInput", library: "imageChooserLibraryInput", files: "imageChooserFilesInput" }[source]);
      },
      // Tap a slot's "+"/Replace, then a source in the chooser, then hand the
      // file to that source's input. Never throws: a missing step returns
      // false so the assertion fails by name.
      pickVia(trigger, source, file) {
        if (!trigger) return false;
        trigger.click();
        if (!this.chooserOpen()) return false;
        const btn = this.chooser().querySelector('.image-chooser-btn[data-source="' + source + '"]');
        if (!btn) return false;
        btn.click();
        const input = this.inputFor(source);
        if (!input) return false;
        const dt = new DataTransfer(); dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      },
      overlayOpen(id) { const o = document.getElementById(id); return !!o && !o.classList.contains("hidden"); },
      toast() { const t = document.getElementById("toast"); return t.classList.contains("show") ? t.textContent : ""; },
      clearToast() { const t = document.getElementById("toast"); t.classList.remove("show"); t.textContent = ""; },
      async waitFor(fn, ms) { const end = Date.now() + (ms || 3000); while (Date.now() < end) { if (fn()) return true; await sleep(40); } return !!fn(); },
      photoRows() { return this.mock._grids.Photos.filter(r => r[1] === this.id); },
      // Stage C2: a Set (AY-00090) with a stored OGP front (PH-00010) and a
      // stored COA page labelled "page 1" (PH-00011), plus a named sub-group.
      set: { id: "AY-00090", name: "1957 United States Proof Set With An Extremely Long Description", denom: "Multiple", year: 1957, mint: "", category: "Proof Set" },
      installSet() {
        const self = this;
        const mock = createMockGraphClient({ sheets: { Photos: [
          ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"],
          ["PH-00010", "AY-00090", "OGP_Obverse", "", "AY-00090_ogp_obverse.jpg", "", 46000, ""],
          ["PH-00011", "AY-00090", "COA", "", "AY-00090_coa_01.jpg", "page 1", 46000, ""],
          ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""],
        ] } });
        this.mock = mock;
        __setGraphClientForTest(new Proxy(mock, { get(t, k) {
          const v = t[k]; return typeof v === "function" ? (...a) => { self.graphCalls++; return v.apply(t, a); } : v;
        } }));
        __resetSheetHeaderMapsForTest();
        __setAddCoinWriteEnabledForTest(true);
        __setLiveCoinsForTest([this.set]);
        __setStoredPhotosForTest({ "AY-00090": [
          { photoId: "PH-00010", photoType: "OGP_Obverse", galleryType: "ogp_obverse", subGroupId: "",
            filename: "AY-00090_ogp_obverse.jpg", originalFilename: "", label: "" },
          { photoId: "PH-00011", photoType: "COA", galleryType: "coa", subGroupId: "",
            filename: "AY-00090_coa_01.jpg", originalFilename: "", label: "page 1" },
        ] });
        const url = () => URL.createObjectURL(new Blob([new Uint8Array([1])], { type: "image/jpeg" }));
        __setCoinPhotoCacheForTest("AY-00090_ogp_obverse.jpg", url());
        __setCoinPhotoCacheForTest("AY-00090_coa_01.jpg", url());
        delete galleryStore[this.set.id];
        // A named sub-group, so the Sub-groups section renders a pair.
        galleryFor(this.set.id).push({ type: "subgroup_reverse", subGroupId: "SG-P", url: url(),
          filename: "AY-00090_SG-P_reverse.jpg", caption: "" });
        closeImageSourceChooser();
        this.id = this.set.id;
        this.graphCalls = 0;
      },
      openEditSet() {
        navigate("browse"); showBrowseDetail(this.set); showBrowseEditSetView(this.set);
        const oh = document.getElementById("editSetPhotosHeader");
        if (oh.getAttribute("aria-expanded") !== "true") oh.click();
        this.closeOverlays();
        return document.getElementById("editSetPhotosSections");
      },
      openManageSet() {
        openManagePhotos({ id: this.set.id, name: "x", meta: this.set.id, kind: "set", backTo: () => {} });
        this.closeOverlays();
        return document.getElementById("managePhotosSections");
      },
      async finishCrop() {
        if (!(await this.waitFor(() => this.overlayOpen("bgCropOverlay")))) return false;
        document.getElementById("bgCropUseBtn").click();
        if (await this.waitFor(() => this.overlayOpen("photoAdjustOverlay"), 1500)) document.getElementById("photoAdjustUseBtn").click();
        return true;
      },
      async refused(trigger, source, file) {
        this.closeOverlays();
        const before = galleryFor(this.id).length;
        const calls = this.graphCalls;
        const picked = this.pickVia(trigger, source, file);
        await this.waitFor(() => this.toast() !== "", 3000);
        await sleep(250);
        return { picked, toast: this.toast(), crop: this.overlayOpen("bgCropOverlay"),
                 added: galleryFor(this.id).length - before, graph: this.graphCalls - calls };
      },
    };
  }, { LONG_NAME });
}

module.exports = defineSuite("image-chooser", async ({ ok, openApp, PHONE, TABLET }) => {
  const page = await openApp(PHONE);
  await setup(page);

  // ---------- S. The chooser itself --------------------------------------
  const S = await page.evaluate(async () => {
    __ic.install();
    const o = __ic.chooser();
    const inp = (s) => { const i = __ic.inputFor(s); return i ? [i.getAttribute("accept"), i.getAttribute("capture")] : null; };
    const btns = [...o.querySelectorAll(".image-chooser-btn")].map(b => b.textContent.trim());
    let got = null;
    openImageSourceChooser({ title: "Add Front photo", onFile: (f, s) => { got = s; } });
    const z = Number(getComputedStyle(o).zIndex);
    const zCrop = Number(getComputedStyle(document.getElementById("bgCropOverlay")).zIndex);
    const zSheet = Number(getComputedStyle(document.getElementById("galleryTypePickerOverlay")).zIndex);
    const title = document.getElementById("imageSourceChooserTitle").textContent;
    const btnH = Math.min(...[...o.querySelectorAll(".image-chooser-btn")].map(b => b.getBoundingClientRect().height));
    // A source tap closes the sheet before the picker opens.
    o.querySelector('.image-chooser-btn[data-source="files"]').click();
    const closedOnSource = !__ic.chooserOpen();
    return { cam: inp("camera"), lib: inp("library"), files: inp("files"), btns, z, zCrop, zSheet, title, btnH, closedOnSource };
  });
  ok(JSON.stringify(S.cam) === JSON.stringify(["image/*", "environment"]) &&
     JSON.stringify(S.lib) === JSON.stringify(["image/*", null]) &&
     JSON.stringify(S.files) === JSON.stringify([FILES_ACCEPT, null]),
    "S1 three separate inputs: Camera image/*+capture, Library image/*, Files image/*,application/pdf with no capture: " + JSON.stringify(S));
  ok(JSON.stringify(S.btns) === JSON.stringify(["📷 Camera", "🖼️ Library", "📁 Files"]) && S.btnH >= 44,
    "S2 the chooser offers 📷 Camera / 🖼️ Library / 📁 Files, each at least 44px tall: " + JSON.stringify([S.btns, S.btnH]));
  ok(S.z > S.zSheet && S.z < S.zCrop, "S3 chooser z-index sits above the sheets and below the crop overlays: " + JSON.stringify([S.zSheet, S.z, S.zCrop]));
  ok(S.title === "Add Front photo" && S.closedOnSource, "S4 the title is the caller's, and a source tap closes the sheet: " + JSON.stringify(S));

  // ---------- U. What the coin screens render ------------------------------
  const U = await page.evaluate(async () => {
    __ic.install();
    const host = __ic.openEditCoin();
    const obv = __ic.openSection("browseEditPhotosSections", /obverse/);
    const slots = [...obv.querySelectorAll(".sg-photo-slot")].map(s => ({
      filled: !!s.querySelector(".sg-photo-img, .sg-photo-empty"),
      addBox: !!s.querySelector('button.sg-photo-add[data-act="add"]'),
      addLabelInside: (s.querySelector(".sg-photo-add .sg-photo-add-label") || {}).textContent || null,
      replace: (s.querySelector('[data-act="replace"]') || {}).textContent || null,
      icons: [...s.querySelectorAll(".sg-photo-actions button")].map(b => b.dataset.act),
      trash: s.querySelectorAll("button").length && [...s.querySelectorAll("button")].filter(b => b.textContent.includes("🗑")).length,
      removeInFace: !!s.querySelector('.sg-photo-face > [data-act="remove"]'),
      removeText: (s.querySelector('[data-act="remove"]') || {}).textContent || null,
      recrop: (s.querySelector('button.sg-photo-replace-btn[data-act="adjust"]') || {}).textContent || null,
      recropRightAfterReplace: (() => { const r = s.querySelector('[data-act="replace"]');
        return !!(r && r.nextElementSibling && r.nextElementSibling.dataset.act === "adjust"); })(),
      oldBtns: s.querySelectorAll('[data-act="camera"], [data-act="library"], [data-act="files"]').length,
      inputs: s.querySelectorAll('input[type="file"]').length,
      labelAfterImg: (() => { const l = s.querySelector(".sg-photo-label"); const im = s.querySelector(".sg-photo-img, .sg-photo-empty");
        return !!(l && im && (im.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING)); })(),
    }));
    const ref = __ic.openSection("browseEditPhotosSections", /Reference/);
    await new Promise(r => setTimeout(r, 150));
    const thumb = ref.querySelector(".gc-thumb");
    const tile = ref.querySelector('button.gc-add-tile[data-role="add"]');
    const other = __ic.openSection("browseEditPhotosSections", /Other photos/);
    const all = __ic.openAll("browseEditPhotosSections");
    return {
      slots,
      ref: { thumbs: ref.querySelectorAll(".gc-thumb").length,
             replace: thumb && (thumb.querySelector('[data-role="replace"]') || {}).textContent,
             remove: !!(thumb && thumb.querySelector(".gc-remove")),
             caption: thumb && thumb.querySelector(".gc-caption").value,
             order: thumb && [...thumb.children].map(c => c.classList.contains("gc-img") ? "photo"
               : c.classList.contains("gc-caption") ? "label" : c.dataset.role === "replace" ? "replace" : null).filter(Boolean),
             recrop: thumb ? thumb.querySelectorAll('[data-act="adjust"], [data-role="adjust"]').length + [...thumb.querySelectorAll("button")].filter(b => /recrop|⤢/i.test(b.textContent)).length : null,
             tile: !!tile, tileLast: tile && tile.parentElement.lastElementChild === tile,
             tileLabel: tile && tile.querySelector(".sg-photo-add-label").textContent },
      otherTile: !!other.querySelector("button.gc-add-tile"),
      oldRows: all.querySelectorAll(".gc-add-row, .gc-replace-row, [data-act='camera'], [data-act='library']").length,
      inputs: all.querySelectorAll('input[type="file"]').length,
    };
  });
  const [obvSlot, revSlot] = U.slots;
  ok(U.slots.length === 2 && obvSlot.filled && obvSlot.replace === "Replace" && obvSlot.labelAfterImg &&
     obvSlot.icons.length === 0 && obvSlot.trash === 0,
    "U1 a filled slot: photo, its label under it, one Replace, no icon row and no 🗑️: " + JSON.stringify(obvSlot));
  ok(obvSlot.removeInFace && obvSlot.removeText === "✕",
    "U7 a filled pair slot's delete is a ✕ inside the photo's own box: " + JSON.stringify(obvSlot));
  ok(obvSlot.recrop === "Recrop" && obvSlot.recropRightAfterReplace,
    "U8 a filled obverse has a Recrop pill (the old ⤢ action) directly under Replace: " + JSON.stringify(obvSlot));
  ok(JSON.stringify(U.ref.order) === JSON.stringify(["photo", "label", "replace"]),
    "U9 Reference thumbnail order is photo, label box, Replace: " + JSON.stringify(U.ref.order));
  ok(U.ref.recrop === 0, "U10 Reference thumbnails have no recrop action (none added): " + JSON.stringify(U.ref));
  ok(revSlot.addBox && revSlot.addLabelInside === "Back" && !revSlot.replace && revSlot.icons.length === 0,
    "U2 an empty slot is one + box with its label inside and no other buttons: " + JSON.stringify(revSlot));
  ok(U.slots.every(s => s.oldBtns === 0 && s.inputs === 0), "U3 no 📷/🖼️/📁 buttons and no file input inside any pair slot");
  ok(U.ref.thumbs === 1 && U.ref.replace === "Replace" && U.ref.remove && U.ref.caption === "PCGS photo" &&
     U.ref.tile && U.ref.tileLast && U.ref.tileLabel === "Reference photo" && U.otherTile,
    "U4 Reference: one Replace per thumbnail, ✕ and label kept, a + tile ends the grid; Other has its tile: " + JSON.stringify(U.ref));
  ok(U.oldRows === 0 && U.inputs === 0, "U5 no add row, no 📷/🖼️ replace row and no file input anywhere on Edit Coin's photos: " + JSON.stringify(U));

  const UM = await page.evaluate(async () => {
    __ic.install();
    openManagePhotos({ id: "AY-00099", name: "x", meta: "AY-00099", kind: "coin", backTo: () => {} });
    const host = __ic.openAll("managePhotosSections");
    await new Promise(r => setTimeout(r, 150));
    return { add: host.querySelectorAll('button.sg-photo-add, button.gc-add-tile').length,
             replace: host.querySelectorAll('[data-act="replace"], [data-role="replace"]').length,
             old: host.querySelectorAll(".gc-add-row, .gc-replace-row, [data-act='camera']").length,
             inputs: host.querySelectorAll('input[type="file"]').length };
  });
  ok(UM.add >= 4 && UM.replace >= 2 && UM.old === 0 && UM.inputs === 0,
    "U6 standalone Manage Photos for a coin renders the same + / Replace, no old rows or inputs: " + JSON.stringify(UM));

  // ---------- X. Scope after C2 ---------------------------------------------
  const X = await page.evaluate(async () => {
    __ic.installSet();
    const es = __ic.openAll(__ic.openEditSet().id);
    const editSet = { old: es.querySelectorAll('[data-act="camera"], [data-act="library"], .gc-add-row, .gc-replace-row').length,
                      chooser: es.querySelectorAll(".sg-photo-add, .gc-add-tile, [data-act='replace'], [data-role='replace']").length };
    const ms = __ic.openAll(__ic.openManageSet().id);
    const manageSet = { old: ms.querySelectorAll('[data-act="camera"], [data-act="library"], .gc-add-row, .gc-replace-row').length,
                        chooser: ms.querySelectorAll(".sg-photo-add, .gc-add-tile, [data-act='replace'], [data-role='replace']").length };
    navigate("addcoin");
    const ac = document.getElementById("view-addcoin");
    const addCoin = { old: !!document.getElementById("obverseCameraBtn") + ac.querySelectorAll(".gc-add-row").length,
                      chooser: ac.querySelectorAll(".sg-photo-add, .gc-add-tile").length };
    navigate("addset");
    if (typeof renderAddSetDocs === "function") renderAddSetDocs();
    const ad = document.getElementById("addSetDocsSlots");
    const addSet = { old: ad.querySelectorAll('[data-act="camera"]').length, chooser: ad.querySelectorAll(".sg-photo-add").length };
    const wv = document.getElementById("view-wishlist");
    const wishlist = { old: ["wishlistObverseCameraBtn", "wishlistReverseCameraBtn", "wishlistAdditionalCameraBtn"].filter(i => document.getElementById(i)).length,
                       chooser: wv.querySelectorAll(".sg-photo-add, .gc-add-tile").length };
    return { editSet, manageSet, addCoin, addSet, wishlist };
  });
  ok(X.editSet.old === 0 && X.editSet.chooser > 0 && X.manageSet.old === 0 && X.manageSet.chooser > 0 &&
     X.addCoin.old > 0 && X.addCoin.chooser === 0 && X.addSet.old > 0 && X.addSet.chooser === 0 &&
     X.wishlist.old === 3 && X.wishlist.chooser === 0,
    "X1 scope after C2: Edit Set and Manage Photos for a Set use the chooser; only Add Coin, Add Set and Wishlist keep their old 📷/🖼️ buttons: " + JSON.stringify(X));

  // ---------- V. The Set screens (C2) -----------------------------------------
  for (const surface of ["edit", "manage"]) {
    const V = await page.evaluate(async (surface) => {
      __ic.installSet();
      const host = surface === "edit" ? __ic.openEditSet() : __ic.openManageSet();
      __ic.openAll(host.id);
      await new Promise(r => setTimeout(r, 200));
      const sec = (re) => { const h = [...host.querySelectorAll(".accordion-header")].find(x => re.test(x.textContent)); return h ? h.nextElementSibling : null; };
      const slotInfo = (s) => ({
        filled: !!s.querySelector(".sg-photo-img, .sg-photo-empty"),
        addBox: !!s.querySelector('button.sg-photo-add[data-act="add"]'),
        addLabel: (s.querySelector(".sg-photo-add .sg-photo-add-label") || {}).textContent || null,
        replace: (s.querySelector('[data-act="replace"]') || {}).textContent || null,
        removeInFace: !!s.querySelector('.sg-photo-face > [data-act="remove"]'),
        removeText: (s.querySelector('.sg-photo-face > [data-act="remove"]') || {}).textContent || null,
        icons: [...s.querySelectorAll(".sg-photo-actions button")].map(b => b.dataset.act),
        trash: [...s.querySelectorAll("button")].filter(b => b.textContent.includes("🗑")).length,
        recrop: s.querySelectorAll('[data-act="adjust"]').length,
        old: s.querySelectorAll('[data-act="camera"], [data-act="library"], [data-act="files"]').length,
        labelAfterImg: (() => { const l = s.querySelector(".sg-photo-label"); const im = s.querySelector(".sg-photo-img, .sg-photo-empty");
          return !!(l && im && (im.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING)); })(),
      });
      const pair = (re) => { const b = sec(re); return b ? [...b.querySelectorAll(".sg-photo-slot")].map(slotInfo) : []; };
      const coa = sec(/COA/); const coaThumb = coa && coa.querySelector(".gc-thumb");
      const coaTile = coa && coa.querySelector('button.gc-add-tile[data-role="add"]');
      const other = sec(/Other photos/);
      const receipt = document.getElementById("editSetReceiptCameraInput");
      return {
        ogp: pair(/OGP/), whole: pair(/Whole set/), sub: pair(/Sub-groups/),
        coa: { thumbs: coa ? coa.querySelectorAll(".gc-thumb").length : 0,
               order: coaThumb && [...coaThumb.children].map(c => c.classList.contains("gc-img") ? "photo"
                 : c.classList.contains("gc-caption") ? "label" : c.dataset.role === "replace" ? "replace" : null).filter(Boolean),
               caption: coaThumb && coaThumb.querySelector(".gc-caption").value,
               remove: !!(coaThumb && coaThumb.querySelector(".gc-remove")),
               tileLast: !!coaTile && coaTile.parentElement.lastElementChild === coaTile,
               tileLabel: coaTile && coaTile.querySelector(".sg-photo-add-label").textContent },
        otherTile: !!(other && other.querySelector("button.gc-add-tile")),
        oldAll: host.querySelectorAll(".gc-add-row, .gc-replace-row, [data-act='camera'], [data-act='library']").length,
        inputs: host.querySelectorAll('input[type="file"]').length,
        receipt: receipt ? [receipt.getAttribute("accept"), receipt.getAttribute("capture"),
          !!document.getElementById("editSetReceiptCameraBtn"), !!document.getElementById("editSetReceiptLibraryBtn"),
          (document.getElementById("editSetReceiptLibraryInput") || {}).getAttribute && document.getElementById("editSetReceiptLibraryInput").getAttribute("accept")] : null,
      };
    }, surface);
    const [ogpF, ogpB] = V.ogp;
    ok(V.ogp.length === 2 && ogpF.filled && ogpF.replace === "Replace" && ogpF.labelAfterImg && ogpF.removeInFace &&
       ogpF.removeText === "✕" && ogpF.icons.length === 0 && ogpF.trash === 0 && ogpF.recrop === 0,
      `V1-${surface} a filled Set pair slot (OGP front): photo, label, Replace, ✕ in the photo's corner, no icon row, no 🗑️, no Recrop (⤢ never showed on Set photos): ` + JSON.stringify(ogpF));
    ok(ogpB && ogpB.addBox && ogpB.addLabel === "Back" && !ogpB.replace && ogpB.icons.length === 0 &&
       V.whole.length === 2 && V.whole.every(x => x.addBox) && V.sub.length === 2 && V.sub[1].filled && V.sub[0].addBox,
      `V2-${surface} empty Set slots (OGP back, whole set, sub-group) are one + box with the label inside: ` + JSON.stringify([ogpB, V.whole, V.sub]));
    ok([...V.ogp, ...V.whole, ...V.sub].every(x => x.old === 0) && V.oldAll === 0 && V.inputs === 0,
      `V3-${surface} no 📷/🖼️/📁 buttons, no add/replace rows and no file input anywhere on the Set photos: ` + JSON.stringify([V.oldAll, V.inputs]));
    ok(V.coa.thumbs === 1 && JSON.stringify(V.coa.order) === JSON.stringify(["photo", "label", "replace"]) &&
       V.coa.caption === "page 1" && V.coa.remove && V.coa.tileLast && V.coa.tileLabel === "COA / certificate" && V.otherTile,
      `V4-${surface} COA: photo, label box, Replace, ✕ in the corner, + tile last; Other has its tile: ` + JSON.stringify(V.coa));
    if (surface === "edit")
      ok(JSON.stringify(V.receipt) === JSON.stringify(["image/*", "environment", true, true, "image/*,application/pdf"]),
        "V5 Edit Set's receipt keeps its own 📷/🖼️ buttons and inputs, untouched: " + JSON.stringify(V.receipt));
  }

  // Set: Cancel writes nothing; a JPEG through Files commits one row.
  const SC = await page.evaluate(async () => {
    __ic.installSet();
    const host = __ic.openEditSet();
    __ic.openAll(host.id);
    await new Promise(r => setTimeout(r, 300));
    const before = galleryFor("AY-00090").length, calls = __ic.graphCalls, rows = __ic.photoRows().length;
    const add = () => host.querySelector('.sg-photo-slot [data-act="add"]');
    const out = {};
    if (add()) add().click(); out.opened = __ic.chooserOpen();
    document.getElementById("imageSourceChooserCancel").click(); out.cancel = !__ic.chooserOpen();
    if (add()) add().click();
    __ic.chooser().dispatchEvent(new MouseEvent("click", { bubbles: true })); out.backdrop = !__ic.chooserOpen();
    const lib = __ic.inputFor("library");
    const dt = new DataTransfer(); dt.items.add(await __ic.jpeg()); lib.files = dt.files;
    lib.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    out.noCrop = !__ic.overlayOpen("bgCropOverlay");
    out.added = galleryFor("AY-00090").length - before; out.graph = __ic.graphCalls - calls; out.rows = __ic.photoRows().length - rows;
    // Whole set front through Files.
    const whole = __ic.openSection(host.id, /Whole set/);
    const r0 = __ic.photoRows().length;
    out.picked = __ic.pickVia(whole && whole.querySelector('.sg-photo-slot [data-act="add"]'), "files", await __ic.jpeg());
    out.crop = await __ic.finishCrop();
    await __ic.waitFor(() => __ic.photoRows().length > r0, 4000);
    const row = __ic.photoRows().find(r => r[2] === "SubGroup_Obverse");
    out.rowsAdded = __ic.photoRows().length - r0; out.file = row && row[4];
    out.uploaded = !!(row && await __ic.mock.getItemMeta("CoinCollection/_Testing/CoinPhotos/" + row[4]));
    return out;
  });
  ok(SC.opened && SC.cancel && SC.backdrop && SC.noCrop && SC.added === 0 && SC.graph === 0 && SC.rows === 0,
    "SC1 Set: + opens the chooser; Cancel and a backdrop tap close it; nothing added, zero Graph calls, no row: " + JSON.stringify(SC));
  ok(SC.picked && SC.crop && SC.rowsAdded === 1 && SC.uploaded && /^AY-00090_.*\.jpg$/.test(SC.file || ""),
    "SJ1 Set: a JPEG through Files on the whole-set front crops, uploads and writes one SubGroup_Obverse row: " + JSON.stringify(SC));

  // Set Replace: pair slot keeps its PhotoID; COA keeps PhotoID and Label; the
  // live list shows no leftover (the b2c7ec2 hydrate fix, on the Set screens).
  for (const surface of ["edit", "manage"]) {
    const SR = await page.evaluate(async (surface) => {
      __ic.installSet();
      const hostId = surface === "edit" ? __ic.openEditSet().id : __ic.openManageSet().id;
      const out = { surface };
      const ogp = () => __ic.openSection(hostId, /OGP/);
      await new Promise(r => setTimeout(r, 150));
      out.p = __ic.pickVia(ogp().querySelector('.sg-photo-slot [data-act="replace"]'), "library", await __ic.jpeg());
      out.pc = await __ic.finishCrop();
      await __ic.waitFor(() => (__ic.photoRows().find(r => r[0] === "PH-00010") || [])[4] !== "AY-00090_ogp_obverse.jpg", 4000);
      await new Promise(r => setTimeout(r, 300));
      const ogps = __ic.photoRows().filter(r => r[2] === "OGP_Obverse");
      out.ogpRows = ogps.map(r => r[0]);
      const slots = [...ogp().querySelectorAll(".sg-photo-slot")];
      out.ogpSlots = slots.length; out.ogpEntries = galleryFor("AY-00090").filter(e => e.type === "ogp_obverse").length;
      out.backEmpty = !!slots[1] && !!slots[1].querySelector(".sg-photo-add");
      // COA: + Files adds a second page; label it; Replace -> Library.
      const sec = () => __ic.openSection(hostId, /COA/);
      const up = []; const realUp = __ic.mock.uploadFile.bind(__ic.mock);
      __ic.mock.uploadFile = (path, f) => { up.push(path.split("/").pop()); return realUp(path, f); };
      out.added = __ic.pickVia(sec().querySelector('[data-role="add"]'), "files", await __ic.jpeg());
      out.c1 = await __ic.finishCrop();
      await __ic.waitFor(() => __ic.photoRows().filter(r => r[2] === "COA").length === 2, 4000);
      await new Promise(r => setTimeout(r, 300));
      const second = [...sec().querySelectorAll(".gc-thumb")][1];
      const cap = second && second.querySelector(".gc-caption");
      if (cap) { cap.value = "Test"; cap.dispatchEvent(new Event("input", { bubbles: true })); }
      // Copy the row: the mock updates its row arrays in place.
      const addedRow = [...(__ic.photoRows().find(r => r[2] === "COA" && r[0] !== "PH-00011") || [])];
      out.thumbsAfterFirst = [...sec().querySelectorAll(".gc-thumb")].map(t => (t.querySelector(".gc-caption") || {}).value);
      out.replaced = __ic.pickVia(second && second.querySelector('[data-role="replace"]'), "library", await __ic.jpeg());
      out.c2 = await __ic.finishCrop();
      await __ic.waitFor(() => (__ic.photoRows().find(r => r[0] === addedRow[0]) || [])[4] !== addedRow[4], 4000);
      await new Promise(r => setTimeout(r, 300));
      out.thumbsAfterSecond = [...sec().querySelectorAll(".gc-thumb")].map(t => (t.querySelector(".gc-caption") || {}).value);
      // And Replace on the stored page 1 itself.
      const first = [...sec().querySelectorAll(".gc-thumb")][0];
      out.replaced1 = __ic.pickVia(first && first.querySelector('[data-role="replace"]'), "files", await __ic.jpeg());
      out.c3 = await __ic.finishCrop();
      await __ic.waitFor(() => (__ic.photoRows().find(r => r[0] === "PH-00011") || [])[4] !== "AY-00090_coa_01.jpg", 4000);
      await new Promise(r => setTimeout(r, 300));
      const coas = __ic.photoRows().filter(r => r[2] === "COA");
      out.rows = coas.map(r => [r[0], r[4], r[5]]);
      out.addedFile = addedRow[4];
      const newRow = coas.find(r => r[0] === addedRow[0]) || [];
      const p1 = coas.find(r => r[0] === "PH-00011") || [];
      out.sameId = !!newRow[0]; out.newLabel = newRow[5]; out.newFile = newRow[4];
      out.p1File = p1[4]; out.p1Label = p1[5];
      out.oldOnDisk = !!(await __ic.mock.getItemMeta("CoinCollection/_Testing/CoinPhotos/" + out.addedFile));
      out.thumbs = [...sec().querySelectorAll(".gc-thumb")].map(t => (t.querySelector(".gc-caption") || {}).value);
      out.gallery = galleryFor("AY-00090").filter(e => e.type === "coa").length;
      out.uploads = up.length;
      return out;
    }, surface);
    ok(SR.p && SR.pc && JSON.stringify(SR.ogpRows) === JSON.stringify(["PH-00010"]) && SR.ogpSlots === 2 && SR.ogpEntries === 1 && SR.backEmpty,
      `SR1-${surface} Replace on the stored OGP front keeps one row, PH-00010; the pair still renders two slots with one front entry and Back empty: ` + JSON.stringify(SR));
    ok(SR.added && SR.c1 && SR.replaced && SR.c2 && SR.replaced1 && SR.c3 && SR.rows.length === 2 && SR.sameId &&
       SR.newLabel === "Test" && SR.newFile !== SR.addedFile && SR.oldOnDisk &&
       SR.p1File && SR.p1File !== "AY-00090_coa_01.jpg" && SR.p1Label === "page 1" && SR.uploads === 3,
      `SR2-${surface} COA: add + Files, label, Replace + Library, then Replace page 1: still two COA rows, each updated in place with its PhotoID and Label kept, old file left on disk, three uploads: ` + JSON.stringify(SR));
    ok(JSON.stringify(SR.thumbsAfterSecond) === JSON.stringify(["page 1", "Test"]) &&
       SR.thumbs.length === 2 && JSON.stringify([...SR.thumbs].sort()) === JSON.stringify(["Test", "page 1"]) && SR.gallery === 2,
      `SR3-${surface} the live COA list after each Replace holds exactly page 1 and Test — no leftover thumbnail (a replaced photo moves to the end of the list, as on the coin screens): ` + JSON.stringify(SR));
  }

  // Set: guard refusals, zero Graph calls.
  const SG = await page.evaluate(async () => {
    __ic.installSet();
    const host = __ic.openEditSet();
    __ic.openAll(host.id);
    await new Promise(r => setTimeout(r, 600));
    const ogpRep = () => __ic.openSection(host.id, /OGP/).querySelector('.sg-photo-slot [data-act="replace"]');
    const coa = () => __ic.openSection(host.id, /COA/);
    const out = {};
    out.pdfFiles = await __ic.refused(ogpRep(), "files", __ic.file("pdf"));
    out.heicFiles = await __ic.refused(ogpRep(), "files", __ic.file("heic"));
    out.pdfLib = await __ic.refused(coa().querySelector('[data-role="add"]'), "library", __ic.file("pdf"));
    out.brokenRep = await __ic.refused(coa().querySelector('[data-role="replace"]'), "files", __ic.file("broken"));
    out.rowsKept = JSON.stringify(__ic.photoRows().map(r => r[4])) === JSON.stringify(["AY-00090_ogp_obverse.jpg", "AY-00090_coa_01.jpg"]);
    return out;
  });
  ok([SG.pdfFiles, SG.heicFiles, SG.pdfLib, SG.brokenRep].every(r => r && r.picked && r.toast === TOAST && !r.crop && r.added === 0 && r.graph === 0) && SG.rowsKept,
    "SG1 Set: PDF and HEIC through Files on OGP Replace, a PDF through Library on the COA +, a broken JPEG on COA Replace — all refused with the toast, no crop, nothing added, zero Graph calls, rows untouched: " + JSON.stringify(SG));

  // ---------- C. Cancel / backdrop / Esc ------------------------------------
  const C = await page.evaluate(async () => {
    __ic.install();
    __ic.openEditCoin();
    await new Promise(r => setTimeout(r, 600));
    const rev = () => [...__ic.openSection("browseEditPhotosSections", /obverse/).querySelectorAll(".sg-photo-slot")][1];
    const before = galleryFor("AY-00099").length, calls = __ic.graphCalls, rows = __ic.photoRows().length;
    // Null-safe so a missing + fails C1 by name rather than throwing.
    const clickAdd = () => { const b = rev() && rev().querySelector('[data-act="add"]'); if (b) b.click(); };
    const out = {};
    clickAdd(); out.opened = __ic.chooserOpen();
    document.getElementById("imageSourceChooserCancel").click(); out.cancel = !__ic.chooserOpen();
    clickAdd();
    __ic.chooser().dispatchEvent(new MouseEvent("click", { bubbles: true })); out.backdrop = !__ic.chooserOpen();
    clickAdd();
    // A click on the panel itself must NOT close it.
    __ic.chooser().querySelector(".image-chooser-panel").click(); out.panelKeeps = __ic.chooserOpen();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); out.esc = !__ic.chooserOpen();
    // A file arriving on an input after a Cancel goes nowhere.
    const lib = __ic.inputFor("library");
    const dt = new DataTransfer(); dt.items.add(await __ic.jpeg()); lib.files = dt.files;
    lib.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    out.noCrop = !__ic.overlayOpen("bgCropOverlay");
    out.added = galleryFor("AY-00099").length - before; out.graph = __ic.graphCalls - calls; out.rows = __ic.photoRows().length - rows;
    return out;
  });
  ok(C.opened && C.cancel && C.backdrop && C.panelKeeps && C.esc,
    "C1 the + opens the chooser; Cancel, a backdrop tap and Esc close it; a tap on the panel does not: " + JSON.stringify(C));
  ok(C.noCrop && C.added === 0 && C.graph === 0 && C.rows === 0,
    "C2 after closing, nothing is added and nothing is written: " + JSON.stringify(C));

  // ---------- J. JPEG through Library and Files commits ----------------------
  for (const source of ["library", "files"]) {
    const J = await page.evaluate(async (source) => {
      __ic.install();
      __ic.openEditCoin();
      const body = __ic.openSection("browseEditPhotosSections", /Slab/);
      const slot = body.querySelector(".sg-photo-slot");
      const rowsBefore = __ic.photoRows().length;
      const picked = __ic.pickVia(slot.querySelector('[data-act="add"]'), source, await __ic.jpeg());
      const crop = await __ic.finishCrop();
      await __ic.waitFor(() => __ic.photoRows().length > rowsBefore, 4000);
      const slab = __ic.photoRows().find(r => r[2] === "Slab_Obverse");
      const file = slab ? await __ic.mock.getItemMeta("CoinCollection/_Testing/CoinPhotos/" + slab[4]) : null;
      return { picked, crop, toast: __ic.toast(), rowsAdded: __ic.photoRows().length - rowsBefore,
               slabFile: slab && slab[4], uploaded: !!file };
    }, source);
    ok(J.picked && J.crop && J.toast !== TOAST && J.rowsAdded === 1 && J.uploaded && /^AY-00099_slab_obverse.*\.jpg$/.test(J.slabFile || ""),
      `J-${source} a JPEG through ${source} opens the crop, uploads a JPEG to CoinPhotos and writes one Photos row: ` + JSON.stringify(J));
  }

  // ---------- R. Replace keeps PhotoID and Label, and the LIVE list matches -
  // S25 finding on 92a1152: after a Replace on a Reference photo the live
  // Edit Coin list showed the new photo AND the old one again (blank label)
  // at the end. The saved rows were right; only the rendered list was wrong.
  // So every R assertion now also counts what is RENDERED, not only rows.
  const R = await page.evaluate(async () => {
    __ic.install();
    __ic.openEditCoin();
    const body = __ic.openSection("browseEditPhotosSections", /Reference/);
    await new Promise(r => setTimeout(r, 150));
    const thumb = body.querySelector(".gc-thumb");
    const picked = __ic.pickVia(thumb && thumb.querySelector('[data-role="replace"]'), "files", await __ic.jpeg());
    const crop = await __ic.finishCrop();
    await __ic.waitFor(() => (__ic.photoRows().find(r => r[0] === "PH-00002") || [])[4] !== "AY-00099_reference_01.jpg", 4000);
    await new Promise(r => setTimeout(r, 300));
    const refs = __ic.photoRows().filter(r => r[2] === "Reference");
    const row = refs.find(r => r[0] === "PH-00002");
    const host = __ic.openSection("browseEditPhotosSections", /Reference/);
    const thumbs = [...host.querySelectorAll(".gc-thumb")].map(t => (t.querySelector(".gc-caption") || {}).value);
    return { picked, crop, refs: refs.length, filename: row && row[4], label: row && row[5],
             thumbs, gallery: galleryFor("AY-00099").filter(e => e.type === "reference").length };
  });
  ok(R.picked && R.crop && R.refs === 1 && R.filename && R.filename !== "AY-00099_reference_01.jpg" && R.label === "PCGS photo",
    "R1 Replace on a stored Reference updates PH-00002 in place, new file, Label kept, no second row: " + JSON.stringify(R));
  ok(R.thumbs.length === 1 && R.thumbs[0] === "PCGS photo" && R.gallery === 1,
    "R1b after that Replace Edit Coin renders exactly one Reference thumbnail, labelled PCGS photo — the old one does not come back: " + JSON.stringify(R));

  // Ray's exact sequence, on Edit Coin and on Manage Photos for a coin:
  // + -> Files adds a second Reference; type a label; Replace -> Library.
  for (const surface of ["edit", "manage"]) {
    const RR = await page.evaluate(async (surface) => {
      __ic.install();
      const hostId = surface === "edit" ? "browseEditPhotosSections" : "managePhotosSections";
      if (surface === "edit") __ic.openEditCoin();
      else openManagePhotos({ id: "AY-00099", name: "x", meta: "AY-00099", kind: "coin", backTo: () => {} });
      const sec = () => __ic.openSection(hostId, /Reference/);
      await new Promise(r => setTimeout(r, 150));
      const up = []; const realUp = __ic.mock.uploadFile.bind(__ic.mock);
      __ic.mock.uploadFile = (path, f) => { up.push(path.split("/").pop()); return realUp(path, f); };
      const out = { surface };
      out.added = __ic.pickVia(sec().querySelector('[data-role="add"]'), "files", await __ic.jpeg());
      out.crop1 = await __ic.finishCrop();
      await __ic.waitFor(() => __ic.photoRows().filter(r => r[2] === "Reference").length === 2, 4000);
      await new Promise(r => setTimeout(r, 300));
      const second = [...sec().querySelectorAll(".gc-thumb")][1];
      const cap = second && second.querySelector(".gc-caption");
      if (cap) { cap.value = "Test"; cap.dispatchEvent(new Event("input", { bubbles: true })); }
      const addedRow = __ic.photoRows().find(r => r[2] === "Reference" && r[0] !== "PH-00002") || [];
      out.addedFile = addedRow[4];
      out.replaced = __ic.pickVia(second && second.querySelector('[data-role="replace"]'), "library", await __ic.jpeg());
      out.crop2 = await __ic.finishCrop();
      await __ic.waitFor(() => (__ic.photoRows().find(r => r[0] === addedRow[0]) || [])[4] !== addedRow[4], 4000);
      await new Promise(r => setTimeout(r, 300));
      const refs = __ic.photoRows().filter(r => r[2] === "Reference");
      const newRow = refs.find(r => r[0] === addedRow[0]) || [];
      out.rows = refs.map(r => [r[0], r[4], r[5]]);
      out.sameId = newRow[0] === addedRow[0];
      out.newLabel = newRow[5];
      out.newFile = newRow[4];
      out.oldFileOnDisk = !!(await __ic.mock.getItemMeta("CoinCollection/_Testing/CoinPhotos/" + out.addedFile));
      out.newFileOnDisk = !!(await __ic.mock.getItemMeta("CoinCollection/_Testing/CoinPhotos/" + out.newFile));
      out.thumbs = [...sec().querySelectorAll(".gc-thumb")].map(t => (t.querySelector(".gc-caption") || {}).value);
      out.gallery = galleryFor("AY-00099").filter(e => e.type === "reference").map(e => e.filename);
      out.index = storedPhotoRowsFor("AY-00099").filter(r => r.galleryType === "reference").map(r => r.filename);
      out.uploads = up;
      return out;
    }, surface);
    ok(RR.added && RR.crop1 && RR.replaced && RR.crop2 && RR.rows.length === 2 && RR.sameId &&
       RR.newLabel === "Test" && RR.newFile !== RR.addedFile && RR.oldFileOnDisk && RR.newFileOnDisk &&
       RR.uploads.length === 2 && RR.uploads[0] === RR.addedFile && RR.uploads[1] === RR.newFile,
      `R3-${surface} add + Files, label, Replace + Library: still two Reference rows, the added row updated in place with the new file and label Test, the old file left on disk, exactly two uploads: ` + JSON.stringify(RR));
    ok(RR.thumbs.length === 2 && RR.thumbs[0] === "PCGS photo" && RR.thumbs[1] === "Test" &&
       RR.gallery.length === 2 && RR.gallery[1] === RR.newFile &&
       RR.index.length === 2 && RR.index.indexOf(RR.addedFile) === -1,
      `R4-${surface} the live list right after that Replace is PCGS, then the new photo labelled Test — no third thumbnail, no restart: ` + JSON.stringify(RR));
  }

  const R2 = await page.evaluate(async () => {
    __ic.install();
    __ic.openEditCoin();
    const obv = () => __ic.openSection("browseEditPhotosSections", /obverse/).querySelector(".sg-photo-slot");
    const picked = __ic.pickVia(obv().querySelector('[data-act="replace"]'), "library", await __ic.jpeg());
    const crop = await __ic.finishCrop();
    await __ic.waitFor(() => (__ic.photoRows().find(r => r[0] === "PH-00001") || [])[4] !== "AY-00099_obverse_cropped.jpg", 4000);
    await new Promise(r => setTimeout(r, 300));
    const obvs = __ic.photoRows().filter(r => r[2] === "Obverse");
    const slots = [...__ic.openSection("browseEditPhotosSections", /obverse/).querySelectorAll(".sg-photo-slot")];
    const faceUrl = (sl) => { const f = sl && sl.querySelector(".sg-photo-face"); return f ? (f.innerHTML.match(/blob:[^"')]+/) || [""])[0] : ""; };
    const obvEntries = galleryFor("AY-00099").filter(e => e.type === "obverse");
    return { picked, crop, obvs: obvs.length, id: obvs[0] && obvs[0][0], slots: slots.length,
             obvEntries: obvEntries.length, newShown: !!obvEntries[0] && faceUrl(slots[0]) === obvEntries[0].url && !obvEntries[0].stored,
             revEmpty: !!slots[1] && !!slots[1].querySelector(".sg-photo-add") };
  });
  ok(R2.picked && R2.crop && R2.obvs === 1 && R2.id === "PH-00001",
    "R2 Replace on the stored obverse keeps one Obverse row, PH-00001: " + JSON.stringify(R2));
  ok(R2.slots === 2 && R2.obvEntries === 1 && R2.newShown && R2.revEmpty,
    "R2b after that Replace the Front/Back pair still renders two slots: Front shows the new photo (one obverse entry, the old one not re-added), Back still empty: " + JSON.stringify(R2));

  // ---------- G. Non-photos refused ------------------------------------------
  const G = await page.evaluate(async () => {
    __ic.install();
    __ic.openEditCoin();
    __ic.openSection("browseEditPhotosSections", /obverse/);
    await new Promise(r => setTimeout(r, 600));
    const obvRep = () => document.getElementById("browseEditPhotosSections").querySelector('.sg-photo-slot [data-act="replace"]');
    const out = {};
    out.pdfFiles = await __ic.refused(obvRep(), "files", __ic.file("pdf"));
    out.brokenFiles = await __ic.refused(obvRep(), "files", __ic.file("broken"));
    out.heicFiles = await __ic.refused(obvRep(), "files", __ic.file("heic"));
    out.pdfLib = await __ic.refused(obvRep(), "library", __ic.file("pdf"));
    const obv = galleryFor("AY-00099").find(e => e.type === "obverse");
    out.storedKept = !!obv && obv.filename === "AY-00099_obverse_cropped.jpg";
    out.rowKept = (__ic.photoRows().find(r => r[0] === "PH-00001") || [])[4] === "AY-00099_obverse_cropped.jpg";
    const ref = __ic.openSection("browseEditPhotosSections", /Reference/);
    await new Promise(r => setTimeout(r, 150));
    out.pdfAdd = await __ic.refused(ref.querySelector('[data-role="add"]'), "files", __ic.file("pdf"));
    out.pdfRep = await __ic.refused(ref.querySelector('[data-role="replace"]'), "library", __ic.file("pdf"));
    return out;
  });
  const refusedOk = (r) => r && r.picked && r.toast === TOAST && !r.crop && r.added === 0 && r.graph === 0;
  ok(refusedOk(G.pdfFiles), "G1 a PDF through 📁 Files is refused: toast, no crop, nothing added, zero Graph calls: " + JSON.stringify(G.pdfFiles));
  ok(refusedOk(G.brokenFiles) && refusedOk(G.heicFiles), "G2 broken JPEG and undecodable HEIC through Files are refused: " + JSON.stringify([G.brokenFiles, G.heicFiles]));
  ok(refusedOk(G.pdfLib), "G3 a PDF forced onto 🖼️ Library is refused too: " + JSON.stringify(G.pdfLib));
  ok(G.storedKept && G.rowKept, "G4 the stored obverse and its Photos row are untouched: " + JSON.stringify(G));
  ok(refusedOk(G.pdfAdd) && refusedOk(G.pdfRep), "G5 Reference: a PDF through the + tile and through Replace is refused: " + JSON.stringify([G.pdfAdd, G.pdfRep]));

  // ---------- K. Camera unguarded -------------------------------------------
  const K = await page.evaluate(async () => {
    __ic.install();
    __ic.openEditCoin();
    const body = __ic.openSection("browseEditPhotosSections", /Slab/);
    const slot = [...body.querySelectorAll(".sg-photo-slot")][1];
    // A file with no type and no image extension: the guard would refuse it,
    // so the crop opening proves Camera skips the guard entirely.
    const f = new File([await (await __ic.jpeg()).arrayBuffer()], "capture", { type: "" });
    const picked = __ic.pickVia(slot.querySelector('[data-act="add"]'), "camera", f);
    const opened = await __ic.waitFor(() => __ic.overlayOpen("bgCropOverlay"), 3000);
    const toast = __ic.toast();
    __ic.closeOverlays();
    return { picked, opened, toast, pickable: await isPickableImage(f) };
  });
  ok(K.picked && K.opened && K.toast !== TOAST && K.pickable === false,
    "K1 Camera is not guarded: a file the guard would refuse still opens the crop screen from Camera: " + JSON.stringify(K));

  // ---------- L. Layout ------------------------------------------------------
  for (const vp of [{ width: 360, height: 800 }, PHONE, TABLET]) {
    const p = vp === PHONE ? page : await openApp(vp);
    if (p !== page) await setup(p);
    const L = await p.evaluate(async () => {
      __ic.install();
      // The busiest slots: obverse as a failed session capture (⤢ ↻ 🗑️) and
      // slab front failed too (↻ 🗑️). A session entry wins over the stored one.
      const u = () => URL.createObjectURL(new Blob([new Uint8Array([1])], { type: "image/jpeg" }));
      const g = galleryFor("AY-00099");
      g.push({ type: "obverse", url: u(), rawUrl: u(), filename: "AY-00099_obverse_cropped.jpg", caption: "", uploadError: "test" });
      g.push({ type: "slab_obverse", url: u(), filename: "AY-00099_slab_obverse.jpg", caption: "", uploadError: "test" });
      const host = __ic.openEditCoin();
      __ic.openAll("browseEditPhotosSections");
      await new Promise(r => setTimeout(r, 200));
      const inner = window.innerWidth;
      const inside = (r, box) => r.left >= box.left - 0.5 && r.right <= box.right + 0.5;
      const slots = [...host.querySelectorAll(".sg-photo-slot")].map(s => {
        const sr = s.getBoundingClientRect();
        const iconEls = [...s.querySelectorAll(".sg-photo-actions button")];
        const icons = iconEls.map(b => b.getBoundingClientRect());
        const rep = s.querySelector('[data-act="replace"]');
        const add = s.querySelector('[data-act="add"]');
        const img = s.querySelector(".sg-photo-img, .sg-photo-empty");
        const rm = s.querySelector('.sg-photo-face > [data-act="remove"]');
        const rc = s.querySelector('[data-act="adjust"]');
        const off = (rm && img) ? (() => { const a = rm.getBoundingClientRect(), b = img.getBoundingClientRect();
          return { dr: Math.round(a.right - b.right), dt: Math.round(a.top - b.top), w: Math.round(a.width), h: Math.round(a.height) }; })() : null;
        return { w: Math.round(sr.width), n: icons.length, off,
                 recropH: rc ? Math.round(rc.getBoundingClientRect().height) : null,
                 recropBelow: (rc && rep) ? rc.getBoundingClientRect().top >= rep.getBoundingClientRect().bottom - 0.5 : null,
                 // A flex row that can't wrap squeezes its buttons instead of
                 // spilling them, so "inside the slot" alone can't see it.
                 squeezed: iconEls.filter(b => b.scrollWidth > b.clientWidth + 1).length,
                 lines: new Set(icons.map(r => Math.round(r.top))).size,
                 clipped: icons.filter(r => !inside(r, sr)).length + (rep && !inside(rep.getBoundingClientRect(), sr) ? 1 : 0)
                   + (rc && !inside(rc.getBoundingClientRect(), sr) ? 1 : 0),
                 repH: rep ? Math.round(rep.getBoundingClientRect().height) : null,
                 repOneLine: rep ? rep.scrollWidth <= rep.clientWidth + 1 : null,
                 addH: add ? Math.round(add.getBoundingClientRect().height) : null };
      });
      const thumbs = [...host.querySelectorAll(".gc-thumb")].map(t => {
        const tr = t.getBoundingClientRect(); const b = t.querySelector('[data-role="replace"]');
        return { inside: b ? inside(b.getBoundingClientRect(), tr) : false, h: b ? Math.round(b.getBoundingClientRect().height) : 0 };
      });
      const tiles = [...host.querySelectorAll("button.gc-add-tile")].map(t => t.getBoundingClientRect().right <= inner);
      // The reference ✕'s offset from its own image is the look a pair-slot ✕ must match.
      const rthumb = host.querySelector(".gc-thumb");
      const refOff = (() => { const a = rthumb.querySelector(".gc-remove").getBoundingClientRect(), b = rthumb.querySelector(".gc-img").getBoundingClientRect();
        return { dr: Math.round(a.right - b.right), dt: Math.round(a.top - b.top), w: Math.round(a.width), h: Math.round(a.height) }; })();
      // + box vs the thumbnail image in the same grid (Reference has one photo);
      // and in a grid with no photos at all (Other).
      const rImg = rthumb.querySelector(".gc-img").getBoundingClientRect();
      const rBox = rthumb.parentElement.querySelector(".gc-add-box").getBoundingClientRect();
      const plus = { w: Math.round(rBox.width), h: Math.round(rBox.height), dTop: Math.round(rBox.top - rImg.top),
                     imgW: Math.round(rImg.width), imgH: Math.round(rImg.height) };
      const emptyBoxes = [...host.querySelectorAll(".gc-grid")].filter(g => !g.querySelector(".gc-thumb"))
        .map(g => g.querySelector(".gc-add-box")).filter(Boolean)
        .map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
      openImageSourceChooser({ onFile() {} });
      const panel = document.querySelector("#imageSourceChooser .image-chooser-panel").getBoundingClientRect();
      const chooser = { inside: panel.left >= 0 && panel.right <= inner, bottomGap: Math.round(window.innerHeight - panel.bottom) };
      closeImageSourceChooser();
      return { inner, slots, thumbs, tiles, refOff, plus, emptyBoxes, chooser, pageScroll: document.documentElement.scrollWidth > inner };
    });
    const tag = vp.width + "x" + vp.height;
    console.log("    layout " + tag + ": " + JSON.stringify(L.slots));
    ok(L.slots.length >= 4 && L.slots.some(s => s.n === 1) && L.slots.every(s => s.clipped === 0 && s.squeezed === 0 && s.lines <= 1),
      `L1 ${tag}: every pair-slot button (Replace, Recrop and ↻) sits inside its slot at full size: ` + JSON.stringify(L.slots));
    const filledOffs = L.slots.filter(s => s.off);
    ok(filledOffs.length >= 2 && filledOffs.every(s => JSON.stringify(s.off) === JSON.stringify(L.refOff)),
      `L6 ${tag}: each filled pair slot's ✕ sits at the photo's top-right exactly as the Reference ✕ does: ` + JSON.stringify([L.refOff, filledOffs.map(s => s.off)]));
    ok(L.slots.filter(s => s.recropH !== null).length >= 1 && L.slots.filter(s => s.recropH !== null).every(s => s.recropH >= 32 && s.recropBelow),
      `L7 ${tag}: Recrop is a full pill (32px+) below Replace: ` + JSON.stringify(L.slots));
    ok(L.plus.w === L.plus.imgW && L.plus.h === L.plus.imgH && L.plus.dTop === 0 &&
       L.emptyBoxes.length >= 1 && L.emptyBoxes.every(([w, h]) => w === L.plus.imgW && h === L.plus.imgH),
      `L8 ${tag}: the + box is the thumbnail image's size and top-aligned with it, and keeps that size with no photos: ` + JSON.stringify([L.plus, L.emptyBoxes]));
    ok(L.slots.filter(s => s.repH !== null).every(s => s.repH >= 32 && s.repOneLine) && L.slots.filter(s => s.addH !== null).every(s => s.addH >= 100),
      `L2 ${tag}: Replace is one line and at least 32px tall; an empty + box is the full slot height: ` + JSON.stringify(L.slots));
    ok(L.thumbs.length >= 1 && L.thumbs.every(t => t.inside && t.h >= 28) && L.tiles.length >= 2 && L.tiles.every(Boolean),
      `L3 ${tag}: each thumbnail's Replace stays inside it, + tiles inside the screen: ` + JSON.stringify([L.thumbs, L.tiles]));
    ok(L.chooser.inside && !L.pageScroll, `L4 ${tag}: the chooser panel fits the screen, no sideways page scroll: ` + JSON.stringify(L.chooser));
    if (vp.width < 700) ok(L.chooser.bottomGap === 0, `L5 ${tag}: on a phone the chooser is a bottom sheet: ` + JSON.stringify(L.chooser));
    if (p !== page) await p.close();
  }

  // ---------- SL. Set screen layout (C2) --------------------------------------
  for (const vp of [{ width: 360, height: 800 }, PHONE, TABLET]) {
    for (const surface of ["edit", "manage"]) {
      const p = await openApp(vp);
      await setup(p);
      const L = await p.evaluate(async (surface) => {
        __ic.installSet();
        // The busiest slot: OGP front as a failed session capture (↻ shows).
        const u = () => URL.createObjectURL(new Blob([new Uint8Array([1])], { type: "image/jpeg" }));
        galleryFor("AY-00090").push({ type: "ogp_obverse", url: u(), filename: "AY-00090_ogp_obverse.jpg", caption: "", uploadError: "test" });
        const host = surface === "edit" ? __ic.openEditSet() : __ic.openManageSet();
        __ic.openAll(host.id);
        await new Promise(r => setTimeout(r, 200));
        const inner = window.innerWidth;
        const inside = (r, box) => r.left >= box.left - 0.5 && r.right <= box.right + 0.5;
        const slots = [...host.querySelectorAll(".sg-photo-slot")].map(s => {
          const sr = s.getBoundingClientRect();
          const body = s.closest(".accordion-body").getBoundingClientRect();
          const iconEls = [...s.querySelectorAll(".sg-photo-actions button")];
          const icons = iconEls.map(b => b.getBoundingClientRect());
          const rep = s.querySelector('[data-act="replace"]');
          const add = s.querySelector('[data-act="add"]');
          const img = s.querySelector(".sg-photo-img, .sg-photo-empty");
          const rm = s.querySelector('.sg-photo-face > [data-act="remove"]');
          const off = (rm && img) ? (() => { const a = rm.getBoundingClientRect(), b = img.getBoundingClientRect();
            return { dr: Math.round(a.right - b.right), dt: Math.round(a.top - b.top), w: Math.round(a.width), h: Math.round(a.height) }; })() : null;
          return { w: Math.round(sr.width), n: icons.length, off, inBody: inside(sr, body),
                   recrop: s.querySelectorAll('[data-act="adjust"]').length,
                   squeezed: iconEls.filter(b => b.scrollWidth > b.clientWidth + 1).length,
                   lines: new Set(icons.map(r => Math.round(r.top))).size,
                   clipped: icons.filter(r => !inside(r, sr)).length + (rep && !inside(rep.getBoundingClientRect(), sr) ? 1 : 0),
                   repH: rep ? Math.round(rep.getBoundingClientRect().height) : null,
                   repOneLine: rep ? rep.scrollWidth <= rep.clientWidth + 1 : null,
                   addH: add ? Math.round(add.getBoundingClientRect().height) : null };
        });
        // Pairs: the two slots in each row are the same width.
        const pairs = [...host.querySelectorAll(".sg-photo-slot")].reduce((m, s) => {
          const k = s.parentElement; (m.get(k) || m.set(k, []).get(k)).push(Math.round(s.getBoundingClientRect().width)); return m; }, new Map());
        const thumbs = [...host.querySelectorAll(".gc-thumb")].map(t => {
          const tr = t.getBoundingClientRect(); const b = t.querySelector('[data-role="replace"]');
          return { inside: b ? inside(b.getBoundingClientRect(), tr) : false, h: b ? Math.round(b.getBoundingClientRect().height) : 0 };
        });
        const tiles = [...host.querySelectorAll("button.gc-add-tile")].map(t => t.getBoundingClientRect().right <= inner);
        // Null-safe so a missing element fails L6/L8-set by name, not by throwing.
        const cthumb = host.querySelector(".gc-thumb");
        const q = (el, sel) => el && el.querySelector(sel);
        const refOff = (q(cthumb, ".gc-remove") && q(cthumb, ".gc-img")) ? (() => { const a = q(cthumb, ".gc-remove").getBoundingClientRect(), b = q(cthumb, ".gc-img").getBoundingClientRect();
          return { dr: Math.round(a.right - b.right), dt: Math.round(a.top - b.top), w: Math.round(a.width), h: Math.round(a.height) }; })() : null;
        const cImgEl = q(cthumb, ".gc-img"), cBoxEl = cthumb && q(cthumb.parentElement, ".gc-add-box");
        const plus = (cImgEl && cBoxEl) ? (() => { const cImg = cImgEl.getBoundingClientRect(), cBox = cBoxEl.getBoundingClientRect();
          return { w: Math.round(cBox.width), h: Math.round(cBox.height), dTop: Math.round(cBox.top - cImg.top),
                   imgW: Math.round(cImg.width), imgH: Math.round(cImg.height) }; })() : {};
        const emptyBoxes = [...host.querySelectorAll(".gc-grid")].filter(g => !g.querySelector(".gc-thumb"))
          .map(g => g.querySelector(".gc-add-box")).filter(Boolean)
          .map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
        return { inner, slots, pairs: [...pairs.values()], thumbs, tiles, refOff, plus, emptyBoxes,
                 pageScroll: document.documentElement.scrollWidth > inner };
      }, surface);
      const tag = surface + " " + vp.width + "x" + vp.height;
      console.log("    set layout " + tag + ": widths " + JSON.stringify(L.pairs));
      ok(L.slots.length >= 6 && L.slots.some(s => s.n === 1) && L.slots.every(s => s.clipped === 0 && s.squeezed === 0 && s.lines <= 1 && s.inBody) &&
         L.pairs.every(w => w.length !== 2 || w[0] === w[1]),
        `L1-set ${tag}: every Set pair-slot button (Replace and ↻) sits inside its slot at full size, each slot inside its card, both slots of a pair the same width: ` + JSON.stringify([L.pairs, L.slots]));
      ok(L.slots.filter(s => s.repH !== null).length >= 2 && L.slots.filter(s => s.repH !== null).every(s => s.repH >= 32 && s.repOneLine) &&
         L.slots.filter(s => s.addH !== null).every(s => s.addH >= 100),
        `L2-set ${tag}: Replace is one line and 32px+; an empty + box is the full slot height: ` + JSON.stringify(L.slots));
      ok(L.thumbs.length >= 1 && L.thumbs.every(t => t.inside && t.h >= 28) && L.tiles.length >= 2 && L.tiles.every(Boolean),
        `L3-set ${tag}: each COA thumbnail's Replace stays inside it, + tiles inside the screen: ` + JSON.stringify([L.thumbs, L.tiles]));
      ok(!L.pageScroll, `L4-set ${tag}: no sideways page scroll`);
      const filledOffs = L.slots.filter(s => s.off);
      ok(L.refOff && filledOffs.length >= 2 && filledOffs.every(s => JSON.stringify(s.off) === JSON.stringify(L.refOff)),
        `L6-set ${tag}: each filled Set pair slot's ✕ sits at the photo's top-right exactly as the COA ✕ does: ` + JSON.stringify([L.refOff, filledOffs.map(s => s.off)]));
      ok(L.slots.every(s => s.recrop === 0),
        `L7-set ${tag}: no Recrop on the Set screens (⤢ never showed there): ` + JSON.stringify(L.slots.map(s => s.recrop)));
      ok(L.plus.w === L.plus.imgW && L.plus.h === L.plus.imgH && L.plus.dTop === 0 &&
         L.emptyBoxes.length >= 1 && L.emptyBoxes.every(([w, h]) => w === L.plus.imgW && h === L.plus.imgH),
        `L8-set ${tag}: the + box is the COA thumbnail's size and top-aligned, and keeps that size with no photos: ` + JSON.stringify([L.plus, L.emptyBoxes]));
      await p.close();
    }
  }
}, module);
