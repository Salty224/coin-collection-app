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
//   X  scope after C3: only Add Set and Wishlist keep old buttons
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
//   T  the gallery type picker overlay sits below the chooser (S3 pins it)
//   L  layout at 360x800, 412x915 and 1024x768 with a long name
//   AC* stage C3, Add Coin (new draft and Staging-draft edit): + circle and
//      Replace open the chooser, the gallery's type picker runs first, guard
//      refusals, Cancel adds nothing, Replace keeps place/type/label, ✕
//      removes from the draft only, Save writes the same Staging data,
//      backlog (d) ✕ at once in a Staging edit, layout ACL1-ACL8

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

// Stage C3 helpers: Add Coin (a new draft, and a Staging-draft edit).
const AC_ID = "AY-00754";
async function setupAddCoin(page) {
  await page.evaluate(({ AC_ID }) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    window.__ac = {
      id: AC_ID, mock: null, graphCalls: 0,
      list() { return galleryFor(ADDCOIN_GALLERY_ID); },
      installMock(extra) {
        const self = this;
        const blank = (n) => new Array(n).fill("");
        const mock = createMockGraphClient(Object.assign({ workbookColumns: { "All::CollectionID": ["AY-00500"] }, sheets: {
          All: [["CollectionID", "CoinID"]],
          Photos: [["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"]].concat([1, 2, 3].map(() => blank(8))),
          Receipts: [["ReceiptID", "CollectionID", "Filename", "DateAdded"]].concat([1, 2].map(() => blank(4))),
        } }, extra || {}));
        this.mock = mock;
        __setGraphClientForTest(new Proxy(mock, { get(t, k) {
          const v = t[k]; return typeof v === "function" ? (...a) => { self.graphCalls++; return v.apply(t, a); } : v;
        } }));
        __resetAllHeaderMapForTest(); __resetSheetHeaderMapsForTest();
        __setAddCoinWriteEnabledForTest(true);
        this.graphCalls = 0;
        return mock;
      },
      openPhotos() {
        const body = document.getElementById("addCoinPhotosBody");
        if (body.classList.contains("hidden")) document.getElementById("addCoinPhotosHeader").click();
        __ic.closeOverlays(); closeImageSourceChooser();
        document.getElementById("galleryTypePickerOverlay").classList.add("hidden");
      },
      fresh() {
        this.installMock();
        navigate("addcoin");
        this.openPhotos();
        this.graphCalls = 0;
        return document.getElementById("addCoinPhotosBody");
      },
      // A Staging draft with a stored obverse (+ its original), a stored
      // Reference labelled "PCGS photo" and a stored slab front, opened for edit.
      async staging() {
        const mock = this.installMock();
        const id = this.id, folder = coinDraftFolder(id);
        const bytes = async () => new Uint8Array(await (await __ic.jpeg()).arrayBuffer());
        for (const f of ["_obverse_cropped.jpg", "_obverse_original.jpg", "_reference_01.jpg", "_slab_obverse.jpg"]) {
          await mock.uploadFile(folder + "/" + id + f, new Blob([await bytes()], { type: "image/jpeg" }));
        }
        await mock.uploadJson(folder + "/coin.json", {
          type: "coin", version: 1, collectionID: id, status: "Draft", denom: "5C", category: "", year: "1938", mint: "D",
          variety: "", description: "Buffalo Nickel", finish: "Business Strike", designation: "", errorDesc: "", grade: "",
          gradeSource: "", serNo: "", cacBean: "", cost: null, shippingCost: null, purchaseDate: "", vendor: "",
          storageLocation: "", container: "", assignAlbum: "", remarks: "", itemNumber: "", gsid: "",
          coinId: "", matchedHow: "none", receiptPhoto: "", researchNote: "", allRowWritten: false, forceAdded: false,
          filesMovedOnPromotion: false, savedVia: "staging", createdDate: "2026-10-20T17:57:36Z",
          photos: [
            { type: "obverse", filename: id + "_obverse_cropped.jpg", caption: "" },
            { type: "obverse", filename: id + "_obverse_original.jpg", caption: "original" },
            { type: "reference", filename: id + "_reference_01.jpg", caption: "PCGS photo" },
            { type: "slab_obverse", filename: id + "_slab_obverse.jpg", caption: "" },
          ] });
        await beginCoinDraftEdit(id);
        this.openPhotos();
        await this.waitFor(() => document.getElementById("obverseFrame").classList.contains("has-photo"), 4000);
        await sleep(150);
        this.graphCalls = 0;
        return document.getElementById("addCoinPhotosBody");
      },
      gallery() { return document.getElementById("addCoinGallery"); },
      tile() { return this.gallery().querySelector('button.gc-add-tile[data-role="add"]'); },
      thumbs() { return [...this.gallery().querySelectorAll(".gc-thumb")]; },
      shown(id) { const el = document.getElementById(id); return !!el && el.style.display !== "none" && el.offsetParent !== null; },
      slot(type) {
        const s = (id) => document.getElementById(type + id);
        return { add: s("Placeholder"), remove: s("RemoveBtn"), replace: s("ReplaceBtn"), recrop: s("AdjustBtn"),
                 label: s("SlotLabel"), frame: s("Frame"), box: s("PhotoBox") };
      },
      slotState(type) {
        const s = this.slot(type);
        const vis = (el) => !!el && getComputedStyle(el).display !== "none" && el.offsetParent !== null;
        return { filled: s.frame.classList.contains("has-photo"), addShown: vis(s.add),
                 addLabel: (s.add.querySelector(".sg-photo-add-label") || {}).textContent || null,
                 addPlus: !!s.add.querySelector(".sg-photo-add-plus"),
                 remove: vis(s.remove), replace: vis(s.replace), recrop: vis(s.recrop), label: vis(s.label),
                 labelText: s.label.textContent, removeText: s.remove.textContent.trim(),
                 recropText: s.recrop.textContent.trim(), replaceText: s.replace.textContent.trim(),
                 entries: this.list().filter(e => e.type === type).length };
      },
      // Pick a gallery type in the open type picker.
      chooseType(re) {
        const item = [...document.querySelectorAll("#galleryTypePickerOverlay .gtp-item")].find(b => re.test(b.textContent));
        if (item) item.click();
        return !!item;
      },
      // Type picker, then the chooser source, then the file.
      galleryAdd(re, source, file) {
        const t = this.tile();
        if (!t) return false;
        t.click();
        if (!this.chooseType(re)) return false;
        if (!__ic.chooserOpen()) return false;
        const btn = __ic.chooser().querySelector('.image-chooser-btn[data-source="' + source + '"]');
        btn.click();
        const input = __ic.inputFor(source);
        const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      },
      waitFor(fn, ms) { return __ic.waitFor(fn, ms); },
      clickGuard(label) {
        const b = [...document.querySelectorAll("#writeGuardOverlay button")].find(x => x.textContent.trim() === label);
        if (b) b.click();
        return !!b;
      },
      guardTitle() { const o = document.getElementById("writeGuardOverlay"); return o && !o.classList.contains("hidden") ? (document.getElementById("writeGuardTitle") || {}).textContent || o.textContent : ""; },
      teardown() {
        __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
        __resetAllHeaderMapForTest(); __setLiveDbCoinsForTest(null);
      },
    };
  }, { AC_ID });
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
                      chooser: ac.querySelectorAll(".addcoin-flip-add, .gc-add-tile").length };
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
     X.addCoin.old === 0 && X.addCoin.chooser === 3 && X.addSet.old > 0 && X.addSet.chooser === 0 &&
     X.wishlist.old === 3 && X.wishlist.chooser === 0,
    "X1 scope after C3: Edit Set, Manage Photos for a Set and Add Coin use the chooser; only Add Set and Wishlist keep their old 📷/🖼️ buttons: " + JSON.stringify(X));

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
      out.galleryFiles = galleryFor("AY-00090").filter(e => e.type === "coa").map(e => e.filename);
      out.uploads = up.length;
      return out;
    }, surface);
    ok(SR.p && SR.pc && JSON.stringify(SR.ogpRows) === JSON.stringify(["PH-00010"]) && SR.ogpSlots === 2 && SR.ogpEntries === 1 && SR.backEmpty,
      `SR1-${surface} Replace on the stored OGP front keeps one row, PH-00010; the pair still renders two slots with one front entry and Back empty: ` + JSON.stringify(SR));
    ok(SR.added && SR.c1 && SR.replaced && SR.c2 && SR.replaced1 && SR.c3 && SR.rows.length === 2 && SR.sameId &&
       SR.newLabel === "Test" && SR.newFile !== SR.addedFile && SR.oldOnDisk &&
       SR.p1File && SR.p1File !== "AY-00090_coa_01.jpg" && SR.p1Label === "page 1" && SR.uploads === 3,
      `SR2-${surface} COA: add + Files, label, Replace + Library, then Replace page 1: still two COA rows, each updated in place with its PhotoID and Label kept, old file left on disk, three uploads: ` + JSON.stringify(SR));
    ok(JSON.stringify(SR.thumbsAfterSecond) === JSON.stringify(["page 1", "Test"]) && SR.gallery === 2,
      `SR3-${surface} after Replace on the last COA (Test) the live list is page 1, then Test, in that order — no leftover thumbnail: ` + JSON.stringify(SR));
    ok(JSON.stringify(SR.thumbs) === JSON.stringify(["page 1", "Test"]) &&
       SR.galleryFiles.length === 2 && SR.galleryFiles[0] === SR.p1File && SR.galleryFiles[1] === SR.newFile,
      `SR4-${surface} Replace on a COA that is NOT last (page 1, first) keeps it first in the live list, matching the saved order — it does not move to the end: ` + JSON.stringify(SR));
  }

  // ---------- RM. Remove: the live list matches the saved rows ------------
  // S25 on 7f83aad (main has it too): ✕ on a photo still saving let the
  // add's own write finish AFTER the detach — DateAdded landed on the blanked
  // row, the row went back into the session index and the photo came back on
  // screen until a restart. Every screen, open-ended and pair: a just-added
  // photo removed WHILE SAVING, one removed after it saved, and one stored
  // before the screen opened. After each remove the rendered photos and their
  // order must equal the saved rows, the row must be fully blank and the file
  // left on disk.
  for (const screen of ["coin-edit", "coin-manage", "set-edit", "set-manage"]) {
    const RM = await page.evaluate(async (screen) => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const isSet = screen.startsWith("set");
      if (isSet) __ic.installSet(); else __ic.install();
      let hostId;
      if (screen === "coin-edit") hostId = __ic.openEditCoin().id;
      else if (screen === "coin-manage") { openManagePhotos({ id: "AY-00099", name: "x", meta: "AY-00099", kind: "coin", backTo: () => {} }); __ic.closeOverlays(); hostId = "managePhotosSections"; }
      else hostId = screen === "set-edit" ? __ic.openEditSet().id : __ic.openManageSet().id;
      await sleep(150);
      const openType = isSet ? "coa" : "reference", openPT = isSet ? "COA" : "Reference";
      const pairTypes = isSet ? ["ogp_obverse", "ogp_reverse"] : ["obverse", "reverse"];
      const pairPTs = isSet ? ["OGP_Obverse", "OGP_Reverse"] : ["Obverse", "Reverse"];
      const openSec = () => __ic.openSection(hostId, isSet ? /COA/ : /Reference/);
      const pairSec = () => __ic.openSection(hostId, isSet ? /OGP/ : /obverse/);
      // One-shot slow Photos write: applied at once, answered 3s later — the
      // window in which the S25 showed "Saving…" with the ✕ already there.
      const realPatch = __ic.mock.patchWorkbookRanges.bind(__ic.mock);
      let armed = false;
      __ic.mock.patchWorkbookRanges = async (...a) => {
        const r = await realPatch(...a);
        if (armed && a[1] === "Photos") { armed = false; await sleep(3000); }
        return r;
      };
      const confirm = () => { const b = [...document.querySelectorAll("#writeGuardBtns button")].find(x => x.textContent.trim() === "Remove"); if (b) b.click(); return !!b; };
      const allRows = () => __ic.mock._grids.Photos;
      const rowById = (id) => [...(allRows().find(r => r[0] === id) || [])];
      const blank = (n) => (allRows()[n - 1] || []).every(v => v === "" || v === undefined || v === null);
      const saved = (pts) => __ic.photoRows().filter(r => pts.indexOf(r[2]) !== -1);
      const onDisk = async (f) => !!(f && await __ic.mock.getItemMeta("CoinCollection/_Testing/CoinPhotos/" + f));
      const openView = () => ({
        thumbs: [...openSec().querySelectorAll(".gc-thumb")].map(t => (t.querySelector(".gc-caption") || {}).value),
        files: galleryFor(__ic.id).filter(e => e.type === openType).map(e => e.storedFilename || e.filename),
        savedLabels: saved([openPT]).map(r => r[5]), savedFiles: saved([openPT]).map(r => r[4]),
      });
      const pairView = () => {
        const slots = [...pairSec().querySelectorAll(".sg-photo-slot")];
        return {
          filled: slots.map(sl => !!sl.querySelector(".sg-photo-remove")),
          files: pairTypes.map(t => { const e = galleryFor(__ic.id).find(x => x.type === t); return e ? (e.storedFilename || e.filename) : null; }),
          saved: pairTypes.map((t, i) => { const r = saved([pairPTs[i]])[0]; return r ? r[4] : null; }),
        };
      };
      const out = { screen };
      // Open-ended. A: added, saved, kept for now. B: added, removed WHILE saving.
      const before = saved([openPT]).length;
      out.addA = __ic.pickVia(openSec().querySelector('[data-role="add"]'), "files", await __ic.jpeg());
      out.cropA = await __ic.finishCrop();
      await __ic.waitFor(() => saved([openPT]).length === before + 1 && !galleryFor(__ic.id).some(e => e.uploadPending), 5000);
      await sleep(200);
      const rowA = [...saved([openPT]).find(r => r[0] !== (isSet ? "PH-00011" : "PH-00002"))];
      armed = true;
      out.addB = __ic.pickVia(openSec().querySelector('[data-role="add"]'), "files", await __ic.jpeg());
      out.cropB = await __ic.finishCrop();
      await __ic.waitFor(() => saved([openPT]).length === before + 2, 5000);
      const rowB = [...saved([openPT]).find(r => r[0] !== rowA[0] && r[0] !== (isSet ? "PH-00011" : "PH-00002"))];
      const rowBn = allRows().findIndex(r => r[0] === rowB[0]) + 1;
      // Hold the entry itself: once removed it leaves the gallery, so waiting
      // on "nothing in the gallery is pending" would end before its own
      // delayed write resumes — exactly the moment the bug happens.
      const entB = galleryFor(__ic.id).find(e => e.uploadPending);
      out.bPending = !!entB;
      const thumbsB = [...openSec().querySelectorAll(".gc-thumb")];
      const rmB = thumbsB.length ? thumbsB[thumbsB.length - 1].querySelector(".gc-remove") : null;
      if (rmB) rmB.click();
      out.confirmB = confirm();
      await __ic.waitFor(() => !(entB && entB.uploadPending) && blank(rowBn), 6000);
      await sleep(400);
      out.afterB = openView(); out.bBlank = blank(rowBn); out.bOnDisk = await onDisk(rowB[4]);
      out.bIndex = storedPhotoRowsFor(__ic.id).some(r => r.filename === rowB[4]);
      // A: removed after it saved.
      const rowAn = allRows().findIndex(r => r[0] === rowA[0]) + 1;
      const thumbsA = [...openSec().querySelectorAll(".gc-thumb")];
      const rmA = thumbsA.length ? thumbsA[thumbsA.length - 1].querySelector(".gc-remove") : null;
      if (rmA) rmA.click();
      out.confirmA = confirm();
      await __ic.waitFor(() => blank(rowAn), 4000);
      await sleep(300);
      out.afterA = openView(); out.aBlank = blank(rowAn); out.aOnDisk = await onDisk(rowA[4]);
      // The photo stored before the screen opened.
      const storedId = isSet ? "PH-00011" : "PH-00002";
      const rowSn = allRows().findIndex(r => r[0] === storedId) + 1;
      const rmS = openSec().querySelector(".gc-thumb .gc-remove");
      if (rmS) rmS.click();
      out.confirmS = confirm();
      await __ic.waitFor(() => blank(rowSn), 4000);
      await sleep(300);
      out.afterS = openView(); out.sBlank = blank(rowSn);
      // Pair. Back: added, removed WHILE saving. Front: stored before opening.
      const backBefore = saved([pairPTs[1]]).length;
      armed = true;
      const backSlot = pairSec().querySelectorAll(".sg-photo-slot")[1];
      out.addBack = __ic.pickVia(backSlot && backSlot.querySelector('[data-act="add"]'), "files", await __ic.jpeg());
      out.cropBack = await __ic.finishCrop();
      await __ic.waitFor(() => saved([pairPTs[1]]).length === backBefore + 1, 5000);
      const rowBk = [...(saved([pairPTs[1]])[0] || [])];
      const rowBkn = allRows().findIndex(r => r[0] === rowBk[0]) + 1;
      const entBk = galleryFor(__ic.id).find(e => e.uploadPending);
      out.backPending = !!entBk;
      const rmBk = pairSec().querySelectorAll(".sg-photo-slot")[1].querySelector(".sg-photo-remove");
      if (rmBk) rmBk.click();
      out.confirmBack = confirm();
      await __ic.waitFor(() => !(entBk && entBk.uploadPending) && rowBkn > 0 && blank(rowBkn), 6000);
      await sleep(400);
      out.afterBack = pairView(); out.backBlank = rowBkn > 0 && blank(rowBkn); out.backOnDisk = await onDisk(rowBk[4]);
      const frontId = isSet ? "PH-00010" : "PH-00001";
      const rowFn = allRows().findIndex(r => r[0] === frontId) + 1;
      const rmF = pairSec().querySelectorAll(".sg-photo-slot")[0].querySelector(".sg-photo-remove");
      if (rmF) rmF.click();
      out.confirmFront = confirm();
      await __ic.waitFor(() => blank(rowFn), 4000);
      await sleep(300);
      out.afterFront = pairView(); out.frontBlank = blank(rowFn);
      out.storedLabel = isSet ? "page 1" : "PCGS photo";
      return out;
    }, screen);
    const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    ok(RM.addB && RM.cropB && RM.bPending && RM.confirmB && RM.bBlank && RM.bOnDisk && !RM.bIndex &&
       eq(RM.afterB.thumbs, [RM.storedLabel, ""]) && eq(RM.afterB.files, RM.afterB.savedFiles) && eq(RM.afterB.thumbs, RM.afterB.savedLabels),
      `RM1-${RM.screen} open-ended: ✕ on a just-added photo WHILE it is still saving — its row ends fully blank (no stray DateAdded), its file stays on disk, and the live list right after is exactly the saved rows in order: ` + JSON.stringify(RM));
    ok(RM.confirmA && RM.aBlank && RM.aOnDisk && eq(RM.afterA.thumbs, [RM.storedLabel]) &&
       eq(RM.afterA.files, RM.afterA.savedFiles) && eq(RM.afterA.thumbs, RM.afterA.savedLabels),
      `RM2-${RM.screen} open-ended: ✕ on a just-added photo after it saved — the live list matches the saved rows, file on disk: ` + JSON.stringify(RM.afterA));
    ok(RM.confirmS && RM.sBlank && eq(RM.afterS.thumbs, []) && eq(RM.afterS.files, []) && eq(RM.afterS.savedFiles, []),
      `RM3-${RM.screen} open-ended: ✕ on the photo stored before the screen opened — no thumbnail left, no saved row: ` + JSON.stringify(RM.afterS));
    ok(RM.addBack && RM.cropBack && RM.backPending && RM.confirmBack && RM.backBlank && RM.backOnDisk &&
       eq(RM.afterBack.filled, [true, false]) && RM.afterBack.files[1] === null && eq(RM.afterBack.files, RM.afterBack.saved),
      `RM4-${RM.screen} pair: ✕ on a just-added Back photo WHILE it is still saving — row fully blank, file on disk, the Back slot is "+" again and the slots match the saved rows: ` + JSON.stringify(RM.afterBack) + " " + JSON.stringify([RM.backPending, RM.backBlank, RM.backOnDisk]));
    ok(RM.confirmFront && RM.frontBlank && eq(RM.afterFront.filled, [false, false]) && eq(RM.afterFront.files, [null, null]) && eq(RM.afterFront.saved, [null, null]),
      `RM5-${RM.screen} pair: ✕ on the Front stored before the screen opened — both slots empty, matching the saved rows: ` + JSON.stringify(RM.afterFront));
  }

  // UNS. A photo that was NEVER SAVED (its upload failed) has no Photos row,
  // so the ✕ removes it from the screen with no write at all. Same
  // confirmation. Both list kinds on all four screens: force a failed save,
  // ✕, confirm — the thumbnail is gone, zero Graph calls during the remove,
  // the live list matches the saved rows. Then ↻ still saves a failed photo
  // when ✕ isn't used.
  for (const screen of ["coin-edit", "coin-manage", "set-edit", "set-manage"]) {
    const U = await page.evaluate(async (screen) => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const isSet = screen.startsWith("set");
      if (isSet) __ic.installSet(); else __ic.install();
      let hostId;
      if (screen === "coin-edit") hostId = __ic.openEditCoin().id;
      else if (screen === "coin-manage") { openManagePhotos({ id: "AY-00099", name: "x", meta: "AY-00099", kind: "coin", backTo: () => {} }); __ic.closeOverlays(); hostId = "managePhotosSections"; }
      else hostId = screen === "set-edit" ? __ic.openEditSet().id : __ic.openManageSet().id;
      await sleep(150);
      const openType = isSet ? "coa" : "reference", openPT = isSet ? "COA" : "Reference";
      const pairTypes = isSet ? ["ogp_obverse", "ogp_reverse"] : ["obverse", "reverse"];
      const pairPTs = isSet ? ["OGP_Obverse", "OGP_Reverse"] : ["Obverse", "Reverse"];
      const openSec = () => __ic.openSection(hostId, isSet ? /COA/ : /Reference/);
      const pairSec = () => __ic.openSection(hostId, isSet ? /OGP/ : /obverse/);
      // Every upload fails while armed: no file lands, no row is written.
      const realUpload = __ic.mock.uploadFile.bind(__ic.mock);
      let failing = false;
      __ic.mock.uploadFile = async (...a) => { if (failing) throw new Error("network down (test)"); return realUpload(...a); };
      const confirm = () => { const b = [...document.querySelectorAll("#writeGuardBtns button")].find(x => x.textContent.trim() === "Remove"); if (b) b.click(); return !!b; };
      const title = () => (document.getElementById("writeGuardTitle") || {}).textContent || "";
      const saved = (pts) => __ic.photoRows().filter(r => pts.indexOf(r[2]) !== -1);
      const openView = () => ({
        thumbs: [...openSec().querySelectorAll(".gc-thumb")].map(t => (t.querySelector(".gc-caption") || {}).value),
        files: galleryFor(__ic.id).filter(e => e.type === openType).map(e => e.storedFilename || e.filename),
        savedLabels: saved([openPT]).map(r => r[5]), savedFiles: saved([openPT]).map(r => r[4]),
      });
      const pairView = () => {
        const slots = [...pairSec().querySelectorAll(".sg-photo-slot")];
        return {
          filled: slots.map(sl => !!sl.querySelector(".sg-photo-remove")),
          plus: slots.map(sl => !!sl.querySelector(".sg-photo-add")),
          files: pairTypes.map(t => { const e = galleryFor(__ic.id).find(x => x.type === t); return e ? (e.storedFilename || e.filename) : null; }),
          saved: pairTypes.map((t, i) => { const r = saved([pairPTs[i]])[0]; return r ? r[4] : null; }),
        };
      };
      const failedEntry = (type) => galleryFor(__ic.id).find(e => e.type === type && e.uploadError && !e.uploadPending);
      const out = { screen, storedLabel: isSet ? "page 1" : "PCGS photo" };

      // 1. Open-ended: failed save, then ✕.
      failing = true;
      out.addO = __ic.pickVia(openSec().querySelector('[data-role="add"]'), "files", await __ic.jpeg());
      out.cropO = await __ic.finishCrop();
      await __ic.waitFor(() => !!failedEntry(openType), 5000);
      const entO = failedEntry(openType);
      out.oFailed = !!entO; out.oRowsBefore = saved([openPT]).length;
      out.oThumbsBefore = openSec().querySelectorAll(".gc-thumb").length;
      const thumbsO = [...openSec().querySelectorAll(".gc-thumb")];
      const rmO = thumbsO.length ? thumbsO[thumbsO.length - 1].querySelector(".gc-remove") : null;
      __ic.clearToast();
      const callsO = __ic.graphCalls;
      if (rmO) rmO.click();
      out.oTitle = title();
      out.confirmO = confirm();
      await __ic.waitFor(() => openSec().querySelectorAll(".gc-thumb").length === out.oThumbsBefore - 1, 3000);
      await sleep(300);
      out.oGraph = __ic.graphCalls - callsO;
      out.oToast = __ic.toast();
      out.afterO = openView();
      out.oGone = !galleryFor(__ic.id).includes(entO);

      // 2. Pair (Back): failed save, then ✕.
      const backSlot = pairSec().querySelectorAll(".sg-photo-slot")[1];
      out.addP = __ic.pickVia(backSlot && backSlot.querySelector('[data-act="add"]'), "files", await __ic.jpeg());
      out.cropP = await __ic.finishCrop();
      await __ic.waitFor(() => !!failedEntry(pairTypes[1]), 5000);
      const entP = failedEntry(pairTypes[1]);
      out.pFailed = !!entP;
      out.pRetryShown = !!pairSec().querySelectorAll(".sg-photo-slot")[1].querySelector('[data-act="retry"]');
      const rmP = pairSec().querySelectorAll(".sg-photo-slot")[1].querySelector(".sg-photo-remove");
      __ic.clearToast();
      const callsP = __ic.graphCalls;
      if (rmP) rmP.click();
      out.pTitle = title();
      out.confirmP = confirm();
      await __ic.waitFor(() => !galleryFor(__ic.id).includes(entP), 3000);
      await sleep(300);
      out.pGraph = __ic.graphCalls - callsP;
      out.afterP = pairView();

      // 3. Open-ended: failed save, then ↻ with the network back. Starts
      // from a freshly opened screen so ↻ is tested on its own, not after
      // whatever steps 1-2 left behind.
      __ic.mock.uploadFile = realUpload;
      if (isSet) __ic.installSet(); else __ic.install();
      if (screen === "coin-edit") hostId = __ic.openEditCoin().id;
      else if (screen === "coin-manage") { openManagePhotos({ id: "AY-00099", name: "x", meta: "AY-00099", kind: "coin", backTo: () => {} }); __ic.closeOverlays(); hostId = "managePhotosSections"; }
      else hostId = screen === "set-edit" ? __ic.openEditSet().id : __ic.openManageSet().id;
      await sleep(150);
      const realUpload2 = __ic.mock.uploadFile.bind(__ic.mock);
      __ic.mock.uploadFile = async (...a) => { if (failing) throw new Error("network down (test)"); return realUpload2(...a); };
      failing = true;
      out.oRowsBefore = saved([openPT]).length;
      out.addR = __ic.pickVia(openSec().querySelector('[data-role="add"]'), "files", await __ic.jpeg());
      out.cropR = await __ic.finishCrop();
      await __ic.waitFor(() => !!failedEntry(openType), 5000);
      const entR = failedEntry(openType);
      failing = false;
      const thumbsR = [...openSec().querySelectorAll(".gc-thumb")];
      const retryO = thumbsR.length ? thumbsR[thumbsR.length - 1].querySelector(".gc-retry") : null;
      out.rRetryShown = !!retryO;
      if (retryO) retryO.click();
      await __ic.waitFor(() => entR && !entR.uploadPending && !entR.uploadError && saved([openPT]).length === out.oRowsBefore + 1, 5000);
      await sleep(300);
      out.rSaved = !!entR && !entR.uploadError && !!entR.storedFilename && saved([openPT]).some(r => r[4] === entR.storedFilename);
      out.afterR = openView();

      // 4. Pair (Back): failed save, then ↻.
      failing = true;
      const backSlot2 = pairSec().querySelectorAll(".sg-photo-slot")[1];
      out.addR2 = __ic.pickVia(backSlot2 && backSlot2.querySelector('[data-act="add"]'), "files", await __ic.jpeg());
      out.cropR2 = await __ic.finishCrop();
      await __ic.waitFor(() => !!failedEntry(pairTypes[1]), 5000);
      const entR2 = failedEntry(pairTypes[1]);
      failing = false;
      const retryP = pairSec().querySelectorAll(".sg-photo-slot")[1].querySelector('[data-act="retry"]');
      out.r2RetryShown = !!retryP;
      if (retryP) retryP.click();
      await __ic.waitFor(() => entR2 && !entR2.uploadPending && !entR2.uploadError && saved([pairPTs[1]]).length === 1, 5000);
      await sleep(300);
      out.r2Saved = !!entR2 && !entR2.uploadError && saved([pairPTs[1]]).some(r => r[4] === entR2.storedFilename);
      out.afterR2 = pairView();
      __ic.mock.uploadFile = realUpload2;
      return out;
    }, screen);
    const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    ok(U.addO && U.cropO && U.oFailed && U.oTitle === "Remove photo?" && U.confirmO && U.oGone && U.oGraph === 0 &&
       eq(U.afterO.thumbs, [U.storedLabel]) && eq(U.afterO.files, U.afterO.savedFiles) && eq(U.afterO.thumbs, U.afterO.savedLabels) &&
       /never saved/.test(U.oToast),
      `UNS1-${U.screen} open-ended: ✕ on a photo whose save failed — same "Remove photo?" confirmation, the thumbnail is gone, zero Graph calls during the remove, and the live list matches the saved rows: ` + JSON.stringify(U));
    ok(U.addP && U.cropP && U.pFailed && U.pRetryShown && U.pTitle === "Remove photo?" && U.confirmP && U.pGraph === 0 &&
       eq(U.afterP.filled, [true, false]) && U.afterP.plus[1] === true && eq(U.afterP.files, U.afterP.saved),
      `UNS2-${U.screen} pair: ✕ on a Back photo whose save failed — same confirmation, zero Graph calls, the Back slot shows "+" again and the slots match the saved rows: ` + JSON.stringify([U.pFailed, U.pRetryShown, U.pTitle, U.pGraph, U.afterP]));
    ok(U.addR && U.cropR && U.rRetryShown && U.rSaved && eq(U.afterR.files, U.afterR.savedFiles),
      `UNS3-${U.screen} open-ended: ↻ on a failed save (✕ not used) still saves it — row written, the live list matches the saved rows: ` + JSON.stringify([U.rRetryShown, U.rSaved, U.afterR]));
    ok(U.addR2 && U.cropR2 && U.r2RetryShown && U.r2Saved && eq(U.afterR2.filled, [true, true]) && eq(U.afterR2.files, U.afterR2.saved),
      `UNS4-${U.screen} pair: ↻ on a failed Back save (✕ not used) still saves it — row written, both slots filled and matching the saved rows: ` + JSON.stringify([U.r2RetryShown, U.r2Saved, U.afterR2]));
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
      out.uploads = [...up];
      // Now Replace the photo that is NOT last — PCGS photo, PH-00002, first
      // in the list. It must stay first (the saved rows keep their order;
      // the live list must match without a restart).
      const firstThumb = [...sec().querySelectorAll(".gc-thumb")][0];
      out.r5picked = __ic.pickVia(firstThumb && firstThumb.querySelector('[data-role="replace"]'), "files", await __ic.jpeg());
      out.r5crop = await __ic.finishCrop();
      await __ic.waitFor(() => (__ic.photoRows().find(r => r[0] === "PH-00002") || [])[4] !== "AY-00099_reference_01.jpg", 4000);
      await new Promise(r => setTimeout(r, 300));
      const p2 = __ic.photoRows().find(r => r[0] === "PH-00002") || [];
      out.r5file = p2[4];
      out.r5thumbs = [...sec().querySelectorAll(".gc-thumb")].map(t => (t.querySelector(".gc-caption") || {}).value);
      out.r5gallery = galleryFor("AY-00099").filter(e => e.type === "reference").map(e => e.filename);
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
    ok(RR.r5picked && RR.r5crop && RR.r5file && RR.r5file !== "AY-00099_reference_01.jpg" &&
       JSON.stringify(RR.r5thumbs) === JSON.stringify(["PCGS photo", "Test"]) &&
       RR.r5gallery.length === 2 && RR.r5gallery[0] === RR.r5file && RR.r5gallery[1] === RR.newFile,
      `R5-${surface} Replace on a Reference that is NOT last (PCGS photo, first) keeps it first in the live list, matching the saved order — it does not move to the end: ` + JSON.stringify(RR));
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
        const iconEls = [...s.querySelectorAll('.sg-photo-actions button, [data-act="retry"]')];
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
          const iconEls = [...s.querySelectorAll('.sg-photo-actions button, [data-act="retry"]')];
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

  // ---------- RC. ↻ on a failed save is centred on the photo -----------------
  // Ray's tablet test of ce5b6be: the 20px corner ↻ sat right next to the
  // neighbouring photo's ✕. On all four screens, at three sizes: each ↻ is
  // centred on its own image box (both axes, within 2px), at least 44px,
  // over a dim of that image, overlapping no ✕ (its own or any other), and
  // is the element actually under the image's centre. Then (412x915) a real
  // failed save is retried by tapping the image centre, and it saves.
  const RC_SCREENS = ["coin-edit", "coin-manage", "set-edit", "set-manage"];
  for (const vp of [{ width: 360, height: 800 }, PHONE, TABLET]) {
    const p = vp === PHONE ? page : await openApp(vp);
    if (p !== page) await setup(p);
    const tag = vp.width + "x" + vp.height;
    for (const screen of RC_SCREENS) {
      const R = await p.evaluate(async (screen) => {
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const isSet = screen.startsWith("set");
        if (isSet) __ic.installSet(); else __ic.install();
        const u = () => URL.createObjectURL(new Blob([new Uint8Array([1])], { type: "image/jpeg" }));
        const types = isSet ? ["coa", "coa", "ogp_obverse", "ogp_reverse"] : ["reference", "reference", "obverse", "reverse"];
        types.forEach((t, i) => galleryFor(__ic.id).push({ type: t, url: u(), rawUrl: u(), filename: __ic.id + "_rc" + i + ".jpg", caption: "", uploadError: "test" }));
        let host;
        if (screen === "coin-edit") host = __ic.openEditCoin();
        else if (screen === "coin-manage") { openManagePhotos({ id: "AY-00099", name: "x", meta: "AY-00099", kind: "coin", backTo: () => {} }); __ic.closeOverlays(); host = document.getElementById("managePhotosSections"); }
        else host = screen === "set-edit" ? __ic.openEditSet() : __ic.openManageSet();
        __ic.openAll(host.id);
        await sleep(200);
        const xs = [...host.querySelectorAll(".gc-remove, .sg-photo-remove")].map(b => b.getBoundingClientRect());
        const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        const rs = [...host.querySelectorAll('.gc-retry, .sg-photo-face [data-act="retry"]')].map(btn => {
          const thumb = btn.closest(".gc-thumb"), face = btn.closest(".sg-photo-face");
          const img = thumb ? thumb.querySelector(".gc-img") : face && face.querySelector(".sg-photo-img, .sg-photo-empty");
          const dim = thumb ? thumb.querySelector(".gc-failed-dim") : face && face.querySelector(".sg-photo-failed-dim");
          const holder = thumb || btn.closest(".sg-photo-slot");
          btn.scrollIntoView({ block: "center" });
          const r = btn.getBoundingClientRect(), ir = img ? img.getBoundingClientRect() : null, dr = dim ? dim.getBoundingClientRect() : null;
          const under = ir ? document.elementFromPoint(ir.left + ir.width / 2, ir.top + ir.height / 2) : null;
          return {
            kind: thumb ? "thumb" : "pair",
            dx: ir ? Math.round((r.left + r.width / 2 - (ir.left + ir.width / 2)) * 10) / 10 : null,
            dy: ir ? Math.round((r.top + r.height / 2 - (ir.top + ir.height / 2)) * 10) / 10 : null,
            w: Math.round(r.width), h: Math.round(r.height),
            overX: [...host.querySelectorAll(".gc-remove, .sg-photo-remove")].filter(x => hit(r, x.getBoundingClientRect())).length,
            dimCovers: !!(dr && ir && Math.abs(dr.left - ir.left) < 1.5 && Math.abs(dr.top - ir.top) < 1.5 && Math.abs(dr.width - ir.width) < 1.5 && Math.abs(dr.height - ir.height) < 1.5),
            dimBg: dim ? getComputedStyle(dim).backgroundColor : null,
            underIsBtn: under === btn,
            stateText: !!(holder && [...holder.querySelectorAll(".photo-upload-state.failed")].some(e => e.textContent.trim() === "Not saved — tap ↻")),
            xKept: !!(holder && holder.querySelector(thumb ? ".gc-remove" : ".sg-photo-face > .sg-photo-remove")),
            replaceKept: !!(holder && holder.querySelector('[data-act="replace"], [data-role="replace"]')),
            inRow: !!btn.closest(".sg-photo-actions"),
          };
        });
        return { n: xs.length, rs, pageScroll: document.documentElement.scrollWidth > window.innerWidth };
      }, screen);
      const thumbs = R.rs.filter(r => r.kind === "thumb"), pairs = R.rs.filter(r => r.kind === "pair");
      ok(thumbs.length >= 2 && pairs.length >= 2 && R.rs.every(r => r.dx !== null && Math.abs(r.dx) <= 2 && Math.abs(r.dy) <= 2 && !r.inRow),
        `RC1-${screen} ${tag}: every ↻ on a failed save is centred on its own image box (both axes, within 2px), not in the button row: ` + JSON.stringify(R.rs));
      ok(R.rs.length >= 4 && R.rs.every(r => r.w >= 44 && r.h >= 44),
        `RC2-${screen} ${tag}: ↻ is at least a 44px tap target: ` + JSON.stringify(R.rs.map(r => [r.w, r.h])));
      ok(R.rs.length >= 4 && R.n >= 4 && R.rs.every(r => r.overX === 0 && r.underIsBtn),
        `RC3-${screen} ${tag}: ↻ overlaps no ✕ (its own or a neighbour's) and is the element under the image's centre: ` + JSON.stringify(R.rs.map(r => [r.kind, r.overX, r.underIsBtn])));
      ok(R.rs.length >= 4 && R.rs.every(r => r.dimCovers && r.dimBg && r.dimBg !== "rgba(0, 0, 0, 0)" && r.stateText && r.xKept && r.replaceKept) && !R.pageScroll,
        `RC4-${screen} ${tag}: a light dim covers the image; "Not saved — tap ↻", the ✕ and Replace are all still there; no sideways scroll: ` + JSON.stringify(R.rs));
    }
    if (p !== page) await p.close();
  }
  // Tapping the centred ↻ still retries and saves (real failed upload, then
  // a tap at the image's centre with the network back), both list kinds.
  for (const screen of RC_SCREENS) {
    const T = await page.evaluate(async (screen) => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const isSet = screen.startsWith("set");
      if (isSet) __ic.installSet(); else __ic.install();
      let hostId;
      if (screen === "coin-edit") hostId = __ic.openEditCoin().id;
      else if (screen === "coin-manage") { openManagePhotos({ id: "AY-00099", name: "x", meta: "AY-00099", kind: "coin", backTo: () => {} }); __ic.closeOverlays(); hostId = "managePhotosSections"; }
      else hostId = screen === "set-edit" ? __ic.openEditSet().id : __ic.openManageSet().id;
      await sleep(150);
      const openType = isSet ? "coa" : "reference", openPT = isSet ? "COA" : "Reference";
      const backType = isSet ? "ogp_reverse" : "reverse", backPT = isSet ? "OGP_Reverse" : "Reverse";
      const openSec = () => __ic.openSection(hostId, isSet ? /COA/ : /Reference/);
      const pairSec = () => __ic.openSection(hostId, isSet ? /OGP/ : /obverse/);
      const realUpload = __ic.mock.uploadFile.bind(__ic.mock);
      let failing = true;
      __ic.mock.uploadFile = async (...a) => { if (failing) throw new Error("network down (test)"); return realUpload(...a); };
      const rows = (pt) => __ic.photoRows().filter(r => r[2] === pt);
      const failedEntry = (type) => galleryFor(__ic.id).find(e => e.type === type && e.uploadError && !e.uploadPending);
      const tapCentre = (img) => { if (!img) return false; img.scrollIntoView({ block: "center" });
        const r = img.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const ok = !!(el && (el.classList.contains("gc-retry") || el.dataset.act === "retry")); if (ok) el.click(); return ok; };
      const out = {};
      // Open-ended.
      const before = rows(openPT).length;
      out.addO = __ic.pickVia(openSec().querySelector('[data-role="add"]'), "files", await __ic.jpeg());
      out.cropO = await __ic.finishCrop();
      await __ic.waitFor(() => !!failedEntry(openType), 5000);
      const eO = failedEntry(openType);
      failing = false;
      const tO = [...openSec().querySelectorAll(".gc-thumb")].pop();
      out.tapO = tapCentre(tO && tO.querySelector(".gc-img"));
      await __ic.waitFor(() => eO && !eO.uploadPending && !eO.uploadError && rows(openPT).length === before + 1, 5000);
      await sleep(200);
      out.savedO = !!eO && !eO.uploadError && rows(openPT).some(r => r[4] === eO.storedFilename);
      // Pair (Back).
      failing = true;
      const back = pairSec().querySelectorAll(".sg-photo-slot")[1];
      out.addP = __ic.pickVia(back && back.querySelector('[data-act="add"]'), "files", await __ic.jpeg());
      out.cropP = await __ic.finishCrop();
      await __ic.waitFor(() => !!failedEntry(backType), 5000);
      const eP = failedEntry(backType);
      failing = false;
      const back2 = pairSec().querySelectorAll(".sg-photo-slot")[1];
      out.tapP = tapCentre(back2 && back2.querySelector(".sg-photo-face .sg-photo-img, .sg-photo-face .sg-photo-empty"));
      await __ic.waitFor(() => eP && !eP.uploadPending && !eP.uploadError && rows(backPT).length === 1, 5000);
      await sleep(200);
      out.savedP = !!eP && !eP.uploadError && rows(backPT).some(r => r[4] === eP.storedFilename);
      __ic.mock.uploadFile = realUpload;
      return out;
    }, screen);
    ok(T.addO && T.cropO && T.tapO && T.savedO && T.addP && T.cropP && T.tapP && T.savedP,
      `RC5-${screen}: tapping the centred ↻ on a failed save (open-ended and pair) retries and saves — row written: ` + JSON.stringify(T));
  }
  // ======================================================================
  // STAGE C3 — ADD COIN (a new draft, and a Staging-draft edit)
  // ======================================================================
  // Obverse/Reverse: the circle is the "+" box with the side's name inside;
  // a filled circle has a ✕ on its rim, the side's name under it, Replace,
  // and a Recrop pill where ⤢ showed. The gallery: thumbnails with photo,
  // type, label box, Replace and ✕; a "+" tile runs the type picker first,
  // then the chooser. Photos stay in memory until Save (no Saving…/↻ on a
  // pick, zero Graph requests); ✕ removes from the draft only; Save writes
  // the same Staging data as the old buttons did.
  await setupAddCoin(page);

  // ---------- AU. What Add Coin renders (new draft) ------------------------
  const AU = await page.evaluate(async () => {
    const body = __ac.fresh();
    const obv = __ac.slotState("obverse");
    document.getElementById("showReverseBtn").click();
    const rev = __ac.slotState("reverse");
    document.getElementById("showObverseBtn").click();
    const view = document.getElementById("view-addcoin");
    const tile = __ac.tile();
    return {
      obv, rev,
      oldBtns: ["obverseCameraBtn", "obverseLibraryBtn", "obverseFilesBtn", "reverseCameraBtn", "reverseLibraryBtn", "reverseFilesBtn"]
        .filter(i => document.getElementById(i)).length + body.querySelectorAll(".gc-add-row, .gc-add-btn, .photo-btns").length,
      flipInputs: document.querySelectorAll('#obversePhotoBox input[type="file"], #reversePhotoBox input[type="file"]').length,
      galInputs: __ac.gallery().querySelectorAll('input[type="file"]').length,
      tile: !!tile, tileLast: !!tile && tile.parentElement.lastElementChild === tile,
      tileLabel: tile && tile.querySelector(".sg-photo-add-label").textContent,
      chooserGrid: __ac.gallery().querySelector(".gc-grid").classList.contains("gc-chooser-grid"),
      receiptKept: !!document.getElementById("receiptCameraBtn") && !!document.getElementById("receiptLibraryInput"),
    };
  });
  ok(AU.obv.addShown && AU.obv.addPlus && AU.obv.addLabel === "Obverse" && !AU.obv.remove && !AU.obv.replace && !AU.obv.recrop && !AU.obv.label &&
     AU.rev.addShown && AU.rev.addLabel === "Reverse" && !AU.rev.remove && !AU.rev.replace,
    "ACU1 an empty Obverse/Reverse is one + circle with the side's name inside, and no ✕, label, Replace or Recrop: " + JSON.stringify([AU.obv, AU.rev]));
  ok(AU.oldBtns === 0 && AU.flipInputs === 0 && AU.galInputs === 0,
    "ACU2 no 📷/🖼️/📁 buttons, no add row and no file input anywhere in Add Coin's photos: " + JSON.stringify(AU));
  ok(AU.tile && AU.tileLast && AU.tileLabel === "Add photo" && AU.chooserGrid,
    "ACU3 the gallery ends with a + tile labelled Add photo, in the top-aligned chooser grid: " + JSON.stringify(AU));
  ok(AU.receiptKept, "ACU4 the receipt slot is untouched (C5 is separate): its 📷/🖼️ buttons and inputs remain");

  // ---------- AC. Chooser from +, pick, crop: in memory only ---------------
  const AC = await page.evaluate(async () => {
    __ac.fresh();
    const out = {};
    const s = __ac.slot("obverse");
    s.add.click();
    out.chooserFromPlus = __ic.chooserOpen();
    out.titlePlus = document.getElementById("imageSourceChooserTitle").textContent;
    closeImageSourceChooser();
    out.picked = __ic.pickVia(s.add, "library", await __ic.jpeg());
    out.crop = await __ic.finishCrop();
    await __ac.waitFor(() => __ac.slotState("obverse").filled, 3000);
    out.after = __ac.slotState("obverse");
    const e = __ac.list().find(x => x.type === "obverse");
    out.entry = e ? { pending: !!e.uploadPending, error: e.uploadError || "", blob: !!e.blob } : null;
    out.saving = /Saving…/.test(s.box.textContent) || !!s.box.querySelector(".gc-retry, .sg-photo-retry, .staging-retry-btn");
    out.graph = __ac.graphCalls;
    // Replace opens the chooser too, worded Replace.
    s.replace.click();
    out.chooserFromReplace = __ic.chooserOpen();
    out.titleReplace = document.getElementById("imageSourceChooserTitle").textContent;
    closeImageSourceChooser();
    // Reverse through Files.
    document.getElementById("showReverseBtn").click();
    out.revPicked = __ic.pickVia(__ac.slot("reverse").add, "files", await __ic.jpeg());
    out.revCrop = await __ic.finishCrop();
    await __ac.waitFor(() => __ac.slotState("reverse").filled, 3000);
    out.rev = __ac.slotState("reverse");
    document.getElementById("showObverseBtn").click();
    out.graphAll = __ac.graphCalls;
    return out;
  });
  ok(AC.chooserFromPlus && AC.titlePlus === "Add obverse photo" && AC.chooserFromReplace && AC.titleReplace === "Replace obverse photo",
    "ACC1 the + circle opens the chooser (Add obverse photo) and Replace opens it too (Replace obverse photo): " + JSON.stringify(AC));
  ok(AC.picked && AC.crop && AC.after.filled && !AC.after.addShown && AC.after.remove && AC.after.removeText === "✕" &&
     AC.after.label && AC.after.labelText === "Obverse" && AC.after.replace && AC.after.replaceText === "Replace" &&
     AC.after.recrop && AC.after.recropText === "Recrop" && AC.after.entries === 1,
    "ACC2 after a pick and crop: the photo, ✕ on its rim, Obverse under it, Replace and a Recrop pill: " + JSON.stringify(AC.after));
  ok(AC.entry && !AC.entry.pending && !AC.entry.error && AC.entry.blob && !AC.saving && AC.graphAll === 0,
    "ACC3 the pick stays in memory: no Saving…, no ↻, zero Graph requests: " + JSON.stringify([AC.entry, AC.saving, AC.graphAll]));
  ok(AC.revPicked && AC.revCrop && AC.rev.filled && AC.rev.remove && AC.rev.replace,
    "ACC4 the reverse fills the same way, through Files: " + JSON.stringify(AC.rev));

  // ---------- AR. Replace on obverse: same slot, one entry -----------------
  const AR = await page.evaluate(async () => {
    __ac.fresh();
    __ic.pickVia(__ac.slot("obverse").add, "library", await __ic.jpeg());
    await __ic.finishCrop();
    await __ac.waitFor(() => __ac.slotState("obverse").filled, 3000);
    const first = __ac.list().find(e => e.type === "obverse");
    const at = __ac.list().indexOf(first);
    const picked = __ic.pickVia(__ac.slot("obverse").replace, "camera", await __ic.jpeg());
    const crop = await __ic.finishCrop();
    await __ac.waitFor(() => __ac.list().find(e => e.type === "obverse") !== first, 3000);
    const now = __ac.list().filter(e => e.type === "obverse");
    return { picked, crop, n: now.length, replaced: now[0] !== first, sameAt: __ac.list().indexOf(now[0]) === at,
             type: now[0] && now[0].type, state: __ac.slotState("obverse"), graph: __ac.graphCalls };
  });
  ok(AR.picked && AR.crop && AR.n === 1 && AR.replaced && AR.sameAt && AR.type === "obverse" && AR.state.remove && AR.graph === 0,
    "ACR1 Replace on the obverse swaps the photo in place: one obverse entry, same position, still filled, no Graph request: " + JSON.stringify(AR));

  // ---------- AT. The type picker runs before the chooser ------------------
  const AT = await page.evaluate(async () => {
    __ac.fresh();
    const out = {};
    __ac.tile().click();
    out.pickerOpen = __ic.overlayOpen("galleryTypePickerOverlay");
    out.chooserBefore = __ic.chooserOpen();
    out.chose = __ac.chooseType(/Reference/);
    out.pickerClosed = !__ic.overlayOpen("galleryTypePickerOverlay");
    out.chooserAfter = __ic.chooserOpen();
    out.title = document.getElementById("imageSourceChooserTitle").textContent;
    closeImageSourceChooser();
    out.picked = __ac.galleryAdd(/Reference/, "library", await __ic.jpeg());
    out.crop = await __ic.finishCrop();
    await __ac.waitFor(() => __ac.thumbs().length === 1, 3000);
    const t = __ac.thumbs()[0];
    out.thumb = t ? {
      type: (t.querySelector(".gc-type") || {}).textContent,
      label: !!t.querySelector(".gc-caption"), labelPh: (t.querySelector(".gc-caption") || {}).placeholder,
      replace: (t.querySelector('[data-role="replace"]') || {}).textContent, remove: !!t.querySelector(".gc-remove"),
      order: [...t.children].map(c => c.classList.contains("gc-img") ? "photo" : c.classList.contains("gc-type") ? "type"
        : c.classList.contains("gc-caption") ? "label" : c.dataset.role === "replace" ? "replace" : null).filter(Boolean),
      saving: /Saving…/.test(t.textContent) || !!t.querySelector(".gc-retry"),
    } : null;
    out.entryType = (__ac.list().find(e => !galleryTypeDef(e.type).flipSource) || {}).type;
    out.tileStillLast = __ac.tile() && __ac.tile().parentElement.lastElementChild === __ac.tile();
    out.graph = __ac.graphCalls;
    return out;
  });
  ok(AT.pickerOpen && !AT.chooserBefore && AT.chose && AT.pickerClosed && AT.chooserAfter && AT.title === "Add reference photo",
    "ACT1 the + tile opens the what-kind-of-photo picker first; the chooser opens only after a type is picked: " + JSON.stringify(AT));
  ok(AT.picked && AT.crop && AT.thumb && AT.entryType === "reference" && AT.thumb.type === "Reference photo" &&
     JSON.stringify(AT.thumb.order) === JSON.stringify(["photo", "type", "label", "replace"]) && AT.thumb.remove &&
     AT.thumb.labelPh === "Label…" && AT.thumb.replace === "Replace" && !AT.thumb.saving && AT.tileStillLast && AT.graph === 0,
    "ACT2 the picked photo lands as a Reference thumbnail: photo, type, label box, Replace and ✕; no Saving…; + tile still last; no Graph request: " + JSON.stringify(AT));

  // ---------- ACX. Cancel adds nothing --------------------------------------
  const ACX = await page.evaluate(async () => {
    __ac.fresh();
    const out = {};
    __ac.slot("obverse").add.click();
    document.getElementById("imageSourceChooserCancel").click();
    out.flipCancel = { closed: !__ic.chooserOpen(), entries: __ac.list().length, filled: __ac.slotState("obverse").filled };
    __ac.tile().click();
    document.getElementById("galleryTypePickerCancelBtn").click();
    out.typeCancel = { pickerClosed: !__ic.overlayOpen("galleryTypePickerOverlay"), chooser: __ic.chooserOpen(), entries: __ac.list().length };
    __ac.tile().click(); __ac.chooseType(/Slab/);
    __ic.chooser().click();   // backdrop
    out.backdrop = { closed: !__ic.chooserOpen(), entries: __ac.list().length };
    __ac.slot("obverse").add.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    out.esc = { closed: !__ic.chooserOpen(), entries: __ac.list().length };
    // A source picked, then the OS picker cancelled (no change event): nothing.
    __ac.slot("obverse").add.click();
    __ic.chooser().querySelector('.image-chooser-btn[data-source="library"]').click();
    await new Promise(r => setTimeout(r, 200));
    out.osCancel = { entries: __ac.list().length, crop: __ic.overlayOpen("bgCropOverlay") };
    out.thumbs = __ac.thumbs().length; out.graph = __ac.graphCalls;
    return out;
  });
  ok(ACX.flipCancel.closed && ACX.flipCancel.entries === 0 && !ACX.flipCancel.filled && ACX.typeCancel.pickerClosed && !ACX.typeCancel.chooser &&
     ACX.typeCancel.entries === 0 && ACX.backdrop.closed && ACX.esc.closed && ACX.osCancel.entries === 0 && !ACX.osCancel.crop &&
     ACX.thumbs === 0 && ACX.graph === 0,
    "ACX1 Cancel (chooser or type picker), a backdrop tap, Esc, or an abandoned OS picker add nothing and write nothing: " + JSON.stringify(ACX));

  // ---------- AG. Guard refusals --------------------------------------------
  const AG = await page.evaluate(async () => {
    const out = {};
    const refuse = async (trigger, source, file) => {
      __ic.closeOverlays();
      const before = __ac.list().length, calls = __ac.graphCalls;
      const picked = __ic.pickVia(trigger, source, file);
      await __ic.waitFor(() => __ic.toast() !== "", 3000);
      await new Promise(r => setTimeout(r, 250));
      return { picked, toast: __ic.toast(), crop: __ic.overlayOpen("bgCropOverlay"), added: __ac.list().length - before, graph: __ac.graphCalls - calls };
    };
    __ac.fresh();
    out.pdfFiles = await refuse(__ac.slot("obverse").add, "files", __ic.file("pdf"));
    out.brokenLib = await refuse(__ac.slot("obverse").add, "library", __ic.file("broken"));
    out.heicFiles = await refuse(__ac.slot("obverse").add, "files", __ic.file("heic"));
    // Gallery: type first, then a PDF through Files.
    __ic.closeOverlays();
    const before = __ac.list().length;
    out.galPicked = __ac.galleryAdd(/Slab/, "files", __ic.file("pdf"));
    await __ic.waitFor(() => __ic.toast() !== "", 3000);
    await new Promise(r => setTimeout(r, 250));
    out.gal = { toast: __ic.toast(), crop: __ic.overlayOpen("bgCropOverlay"), added: __ac.list().length - before };
    // Camera is not guarded: an untyped, extension-less capture still crops.
    __ic.closeOverlays();
    const f = new File([await (await __ic.jpeg()).arrayBuffer()], "capture", { type: "" });
    out.cam = { picked: __ic.pickVia(__ac.slot("obverse").add, "camera", f), crop: await __ic.waitFor(() => __ic.overlayOpen("bgCropOverlay"), 3000),
                toast: __ic.toast(), pickable: await isPickableImage(f) };
    __ic.closeOverlays();
    out.graph = __ac.graphCalls;
    return out;
  });
  const acRefused = (r) => r && r.picked !== false && r.toast === TOAST && !r.crop && r.added === 0;
  ok(acRefused(AG.pdfFiles) && acRefused(AG.brokenLib) && acRefused(AG.heicFiles),
    "ACG1 obverse +: a PDF and an undecodable HEIC through Files, and a broken JPEG through Library, are refused with the toast; no crop, nothing added: " + JSON.stringify([AG.pdfFiles, AG.brokenLib, AG.heicFiles]));
  ok(AG.galPicked && AG.gal.toast === TOAST && !AG.gal.crop && AG.gal.added === 0,
    "ACG2 gallery +: after the type, a PDF through Files is refused the same way: " + JSON.stringify(AG.gal));
  ok(AG.cam.picked && AG.cam.crop && AG.cam.toast !== TOAST && AG.cam.pickable === false && AG.graph === 0,
    "ACG3 Camera is not guarded (a file the guard would refuse still opens the crop); refusals sent no Graph request: " + JSON.stringify(AG));

  // ---------- AP. Gallery Replace keeps place, type and label (backlog c) --
  const AP = await page.evaluate(async () => {
    __ac.fresh();
    const out = {};
    for (const [re, lbl] of [[/Reference/, "first"], [/Slab — front/, "middle"], [/Other/, "last"]]) {
      __ac.galleryAdd(re, "library", await __ic.jpeg());
      await __ic.finishCrop();
      await __ac.waitFor(() => __ac.thumbs().length === ["first", "middle", "last"].indexOf(lbl) + 1, 3000);
      const t = __ac.thumbs().slice(-1)[0];
      if (!t) break;   // null-safe: a missing step fails ACP1 by name
      const cap = t.querySelector(".gc-caption"); cap.value = lbl; cap.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const before = __ac.list().map(e => ({ type: e.type, caption: e.caption }));
    const old = __ac.list()[1];
    const midThumb = __ac.thumbs()[1];
    out.picked = __ic.pickVia(midThumb && midThumb.querySelector('[data-role="replace"]'), "library", await __ic.jpeg());
    out.title = document.getElementById("imageSourceChooserTitle").textContent;
    out.crop = out.picked ? await __ic.finishCrop() : false;
    await __ac.waitFor(() => __ac.list()[1] !== old, out.picked ? 3000 : 1);
    out.before = before;
    out.after = __ac.list().map(e => ({ type: e.type, caption: e.caption }));
    out.newObject = __ac.list()[1] !== old && __ac.list().indexOf(old) === -1;
    out.thumbLabels = __ac.thumbs().map(t => (t.querySelector(".gc-caption") || {}).value);
    out.graph = __ac.graphCalls;
    return out;
  });
  ok(AP.picked && AP.crop && AP.newObject && JSON.stringify(AP.after) === JSON.stringify(AP.before) &&
     JSON.stringify(AP.thumbLabels) === JSON.stringify(["first", "middle", "last"]) && AP.graph === 0,
    "ACP1 Replace on the middle gallery photo swaps the photo and keeps its place, type and label (backlog c): " + JSON.stringify(AP));

  // ---------- AM. ✕ removes from the draft only ------------------------------
  const AM = await page.evaluate(async () => {
    __ac.fresh();
    const out = {};
    __ic.pickVia(__ac.slot("obverse").add, "library", await __ic.jpeg());
    await __ic.finishCrop();
    await __ac.waitFor(() => __ac.slotState("obverse").filled, 3000);
    __ac.galleryAdd(/Reference/, "library", await __ic.jpeg());
    await __ic.finishCrop();
    await __ac.waitFor(() => __ac.thumbs().length === 1, 3000);
    // Flip ✕: asked first; Cancel keeps it.
    __ac.slot("obverse").remove.click();
    out.asked = __ac.guardTitle();
    out.cancelled = __ac.clickGuard("Cancel");
    out.afterCancel = __ac.slotState("obverse");
    __ac.slot("obverse").remove.click();
    out.removed = __ac.clickGuard("Remove");
    out.afterRemove = __ac.slotState("obverse");
    // Gallery ✕.
    const t0 = __ac.thumbs()[0];
    if (t0) t0.querySelector(".gc-remove").click();
    out.thumbAsked = __ac.guardTitle();
    __ac.clickGuard("Remove");
    out.thumbsLeft = __ac.thumbs().length;
    out.entriesLeft = __ac.list().length;
    out.graph = __ac.graphCalls;
    return out;
  });
  ok(/Remove the obverse photo\?/.test(AM.asked) && AM.cancelled && AM.afterCancel.filled && AM.afterCancel.entries === 1,
    "ACM1 the obverse ✕ asks first, and Cancel keeps the photo: " + JSON.stringify([AM.asked, AM.afterCancel]));
  ok(AM.removed && !AM.afterRemove.filled && AM.afterRemove.entries === 0 && AM.afterRemove.addShown && !AM.afterRemove.remove && !AM.afterRemove.replace,
    "ACM2 Remove takes it off the draft: the slot is a + circle again: " + JSON.stringify(AM.afterRemove));
  ok(/Remove this reference photo\?/.test(AM.thumbAsked) && AM.thumbsLeft === 0 && AM.entriesLeft === 0 && AM.graph === 0,
    "ACM3 a gallery ✕ asks, then removes from the draft only; nothing is written: " + JSON.stringify(AM));

  // ---------- AS. Save writes the same Staging data as before ---------------
  const AS = await page.evaluate(async () => {
    __ac.fresh();
    __setLiveDbCoinsForTest([{ denom: "10C", year: 1916, mint: "D", variety: "", description: "Mercury Dime",
      finish: "Business Strike", designation: "", coinId: "C-1916-M-10C-01", pcgs: "4682", mintage: 264000, gsid: "" }]);
    const set = (id, v) => { document.getElementById(id).value = v; };
    set("denomination", "10C"); set("year", "1916"); set("mintMark", "D"); set("description", "Mercury Dime"); set("finish", "Business Strike");
    checkDbCoinsMatch();
    __ic.pickVia(__ac.slot("obverse").add, "library", await __ic.jpeg());
    await __ic.finishCrop();
    await __ac.waitFor(() => __ac.slotState("obverse").filled, 3000);
    __ac.galleryAdd(/Reference/, "files", await __ic.jpeg());
    await __ic.finishCrop();
    await __ac.waitFor(() => __ac.thumbs().length === 1, 3000);
    const cap = __ac.thumbs()[0] && __ac.thumbs()[0].querySelector(".gc-caption");
    if (cap) { cap.value = "PCGS photo"; cap.dispatchEvent(new Event("input", { bubbles: true })); }
    const pickGraph = __ac.graphCalls;
    await new Promise(r => { saveAddCoinForm("staging"); setTimeout(r, 1200); });
    const base = writePaths().stagingBase + "/AY-00501";
    const draft = await __ac.mock.getJson(base + "/coin.json");
    const paths = [...__ac.mock._store.keys()].filter(p => p.startsWith(base + "/") && !p.endsWith("coin.json")).map(p => p.slice(base.length + 1)).sort();
    __ac.teardown();
    return { pickGraph, photos: draft && draft.photos, paths };
  });
  const AS_PHOTOS = [
    { type: "obverse", filename: "AY-00501_obverse_cropped.jpg", caption: "" },
    { type: "obverse", filename: "AY-00501_obverse_original.jpg", caption: "original" },
    { type: "reference", filename: "AY-00501_reference_01.jpg", caption: "PCGS photo" },
  ];
  ok(AS.pickGraph === 0 && JSON.stringify(AS.photos) === JSON.stringify(AS_PHOTOS) &&
     JSON.stringify(AS.paths) === JSON.stringify(["AY-00501_obverse_cropped.jpg", "AY-00501_obverse_original.jpg", "AY-00501_reference_01.jpg"]),
    "ACS1 Save to Staging writes the same draft as before: the obverse crop and its original, the Reference with its label, under the real CollectionID: " + JSON.stringify(AS));

  // ---------- AE. Staging-draft edit (Phase B) --------------------------------
  const AE = await page.evaluate(async () => {
    const out = {};
    await __ac.staging();
    out.loaded = __ac.slotState("obverse");
    const ref = __ac.thumbs().find(t => /Reference/.test(t.textContent));
    out.refLoaded = ref ? { label: ref.querySelector(".gc-caption").value, replace: !!ref.querySelector('[data-role="replace"]'),
      remove: !!ref.querySelector(".gc-remove"), inStaging: /In Staging/.test(ref.textContent) } : null;
    out.loadGraph = __ac.graphCalls;
    // Replace the stored obverse through the chooser: ✕ there at once.
    const oldObv = __ac.list().find(e => e.type === "obverse");
    out.repPicked = __ic.pickVia(__ac.slot("obverse").replace, "library", await __ic.jpeg());
    out.repCrop = await __ic.finishCrop();
    await __ac.waitFor(() => __ac.list().find(e => e.type === "obverse") !== oldObv, 3000);
    out.afterReplace = __ac.slotState("obverse");
    // Replace the stored Reference: place, type and label kept.
    const refEntry = __ac.list().find(e => e.type === "reference");
    const refAt = __ac.list().indexOf(refEntry);
    const refThumb = __ac.thumbs().find(t => /Reference/.test(t.textContent));
    out.refPicked = __ic.pickVia(refThumb && refThumb.querySelector('[data-role="replace"]'), "files", await __ic.jpeg());
    out.refCrop = out.refPicked ? await __ic.finishCrop() : false;
    await __ac.waitFor(() => __ac.list()[refAt] !== refEntry, out.refPicked ? 3000 : 1);
    const nr = __ac.list()[refAt] || {};
    out.refAfter = { type: nr.type, caption: nr.caption, stored: !!nr.stagingStored };
    // ✕ on the stored slab front: the Staging wording.
    const slab = __ac.thumbs().find(t => /Slab/.test(t.textContent));
    if (slab) slab.querySelector(".gc-remove").click();
    out.slabAsk = document.getElementById("writeGuardOverlay").textContent;
    __ac.clickGuard("Remove");
    out.slabGone = !__ac.list().some(e => e.type === "slab_obverse");
    out.pickGraph = __ac.graphCalls;
    // Save changes.
    const id = __ac.id, folder = coinDraftFolder(id);
    await new Promise((resolve) => resolveAddCoinCatalogMatch((m) => completeAddCoinSave("staging", m).then(resolve, resolve), () => resolve()));
    const draft = await __ac.mock.getJson(folder + "/coin.json");
    out.photos = draft.photos;
    out.files = [...__ac.mock._store.keys()].filter(p => p.startsWith(folder + "/") && !p.endsWith("coin.json")).map(p => p.slice(folder.length + 1)).sort();
    __ac.teardown();
    return out;
  });
  ok(AE.loaded.filled && AE.loaded.remove && AE.loaded.replace && AE.loaded.recrop && AE.loaded.label && !AE.loaded.addShown &&
     AE.refLoaded && AE.refLoaded.label === "PCGS photo" && AE.refLoaded.replace && AE.refLoaded.remove && AE.refLoaded.inStaging,
    "ACE1 opening a Staging draft for edit: the stored obverse shows ✕, its name, Replace and Recrop; the stored Reference shows its label, Replace, ✕ and In Staging: " + JSON.stringify([AE.loaded, AE.refLoaded]));
  ok(AE.repPicked && AE.repCrop && AE.afterReplace.filled && AE.afterReplace.remove && AE.afterReplace.replace && AE.afterReplace.entries === 1,
    "ACE2 Replace on the stored obverse through the chooser: one obverse, ✕ and Replace still there: " + JSON.stringify(AE.afterReplace));
  ok(AE.refPicked && AE.refCrop && AE.refAfter.type === "reference" && AE.refAfter.caption === "PCGS photo" && !AE.refAfter.stored,
    "ACE3 Replace on the stored Reference keeps its place, type and label: " + JSON.stringify(AE.refAfter));
  ok(/Save changes/.test(AE.slabAsk) && AE.slabGone && AE.pickGraph === 0,
    "ACE4 ✕ on a stored photo uses the Staging wording (comes off on Save changes); no Graph request before Save: " + JSON.stringify([AE.slabAsk, AE.pickGraph]));
  const AE_PHOTOS = [
    { type: "obverse", filename: AC_ID + "_obverse_cropped.jpg", caption: "" },
    { type: "obverse", filename: AC_ID + "_obverse_original.jpg", caption: "original" },
    { type: "reference", filename: AC_ID + "_reference_02.jpg", caption: "PCGS photo" },
  ];
  ok(JSON.stringify(AE.photos) === JSON.stringify(AE_PHOTOS) &&
     JSON.stringify(AE.files) === JSON.stringify([AC_ID + "_obverse_cropped.jpg", AC_ID + "_obverse_original.jpg", AC_ID + "_reference_02.jpg"]),
    "ACE5 Save changes writes what Phase B always wrote: the replaced obverse in place, the new Reference as _02 with its label, the old Reference and the removed slab deleted: " + JSON.stringify([AE.photos, AE.files]));

  // ---------- AD. Backlog (d): ✕ shows at once in a Staging edit -------------
  const AD = await page.evaluate(async () => {
    const out = {};
    await __ac.staging();
    // Remove the stored obverse, then pick a new one: its ✕ must show
    // straight after the pick, with nothing redrawing the screen.
    __ac.slot("obverse").remove.click();
    __ac.clickGuard("Remove");
    out.emptied = __ac.slotState("obverse");
    __ic.pickVia(__ac.slot("obverse").add, "library", await __ic.jpeg());
    await __ic.finishCrop();
    await __ac.waitFor(() => __ac.slotState("obverse").filled, 3000);
    out.picked = __ac.slotState("obverse");
    // A receipt picked during the edit: its ✕ shows at once too.
    out.receiptBefore = __ac.shown("receiptRemoveBtn");
    const purchase = document.getElementById("addCoinPurchaseBody");
    if (purchase.classList.contains("hidden")) document.getElementById("addCoinPurchaseHeader").click();
    const lib = document.getElementById("receiptLibraryInput");
    const dt = new DataTransfer(); dt.items.add(__ic.file("pdf")); lib.files = dt.files;
    lib.dispatchEvent(new Event("change", { bubbles: true }));
    await __ac.waitFor(() => !!receiptFiles["receiptPreview"], 3000);
    await new Promise(r => setTimeout(r, 100));
    out.receiptAfter = __ac.shown("receiptRemoveBtn");
    // The new-draft ✕ on the picked (not stored) photo uses the form wording.
    __ac.slot("obverse").remove.click();
    out.newAsk = document.getElementById("writeGuardOverlay").textContent;
    __ac.clickGuard("Cancel");
    __ac.teardown();
    return out;
  });
  ok(!AD.emptied.filled && AD.emptied.addShown && !AD.emptied.remove && AD.picked.filled && AD.picked.remove && AD.picked.replace,
    "ACD1 backlog (d): in a Staging edit, a newly picked obverse shows its ✕ straight away (no redraw needed): " + JSON.stringify([AD.emptied, AD.picked]));
  ok(!AD.receiptBefore && AD.receiptAfter,
    "ACD2 backlog (d): a receipt attached during a Staging edit shows its ✕ straight away: " + JSON.stringify(AD));
  ok(/comes off this form only/.test(AD.newAsk) && !/Save changes/.test(AD.newAsk),
    "ACD3 ✕ on a photo picked during the edit (not yet in Staging) uses the form wording, not the Save-changes wording: " + JSON.stringify(AD.newAsk));

  // ---------- AL. Add Coin layout, new draft and Staging edit -----------------
  for (const vp of [{ width: 360, height: 800 }, PHONE, TABLET]) {
    for (const mode of ["new", "staging"]) {
      const p = await openApp(vp);
      await setup(p);
      await setupAddCoin(p);
      const L = await p.evaluate(async (mode) => {
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        // Long values in every flip corner, so ✕ is measured against the worst case.
        const longCorners = () => {
          const set = (id, v) => { document.getElementById(id).value = v; };
          set("denomination", "10C"); set("year", "1916"); set("mintMark", "D");
          set("description", "Mercury Dime Winged Liberty Head"); set("variety", "Doubled Die Obverse"); set("designation", "FB");
          set("gradeFrom", "VF-20"); set("gradeSource", "Owner");
          updateFlipLabels();
        };
        if (mode === "new") {
          __ac.fresh();
          longCorners();
          __ic.pickVia(__ac.slot("obverse").add, "library", await __ic.jpeg());
          await __ic.finishCrop();
          await __ac.waitFor(() => __ac.slotState("obverse").filled, 3000);
          for (const re of [/Reference/, /Slab — front/]) {
            const n = __ac.thumbs().length;
            __ac.galleryAdd(re, "library", await __ic.jpeg());
            await __ic.finishCrop();
            await __ac.waitFor(() => __ac.thumbs().length === n + 1, 3000);
          }
        } else {
          await __ac.staging();
          longCorners();
        }
        updateFlipLabels();
        document.getElementById("obversePhotoBox").scrollIntoView({ block: "center" });
        await sleep(150);
        const inner = window.innerWidth;
        const R = (el) => el.getBoundingClientRect();
        const inside = (r, box) => r.left >= box.left - 0.5 && r.right <= box.right + 0.5;
        const s = __ac.slot("obverse");
        const box = R(s.box), frame = R(s.frame), x = R(s.remove), lab = R(s.label), rep = R(s.replace), rc = R(s.recrop);
        const cx = frame.left + frame.width / 2, cy = frame.top + frame.height / 2, rr = frame.width / 2;
        const xc = { x: x.left + x.width / 2, y: x.top + x.height / 2 };
        const labels = [...document.querySelectorAll("#obversePhotoBox .flip-label")].flatMap(l => {
          const lr = R(l);
          const lines = l.querySelectorAll(".corner-line").length ? [...l.querySelectorAll(".corner-line")] : [l];
          return lines.filter(e => e.textContent.trim()).map(e => { const er = R(e); const w = e.scrollWidth;
            return l.classList.contains("tr") || l.classList.contains("br") ? { left: er.right - w, right: er.right, top: er.top, bottom: er.bottom } : { left: er.left, right: er.left + w, top: er.top, bottom: er.bottom }; });
        });
        const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        const under = document.elementFromPoint(xc.x, xc.y);
        const thumbs = __ac.thumbs().map(t => { const tr = R(t), b = t.querySelector('[data-role="replace"]'), img = t.querySelector(".gc-img"), rm = t.querySelector(".gc-remove");
          if (!b || !img || !rm) return { inside: false, h: 0, rowTop: Math.round(tr.top), off: null, img: [0, 0], top: 0 };
          return { inside: !!b && inside(R(b), tr), h: b ? Math.round(R(b).height) : 0, rowTop: Math.round(tr.top),
                   off: { dr: Math.round(R(rm).right - R(img).right), dt: Math.round(R(rm).top - R(img).top), w: Math.round(R(rm).width) },
                   img: [Math.round(R(img).width), Math.round(R(img).height)], top: Math.round(R(img).top) }; });
        const addBox = __ac.tile().querySelector(".gc-add-box");
        const ab = R(addBox);
        const tileRowTop = Math.round(R(__ac.tile()).top);
        openImageSourceChooser({ onFile() {} });
        const panel = R(document.querySelector("#imageSourceChooser .image-chooser-panel"));
        closeImageSourceChooser();
        // The empty reverse: the + fills the circle.
        document.getElementById("showReverseBtn").click();
        const rv = __ac.slot("reverse");
        const revEmpty = rv.frame.classList.contains("has-photo") ? null : { add: [Math.round(R(rv.add).width), Math.round(R(rv.add).height)], frame: [Math.round(R(rv.frame).width), Math.round(R(rv.frame).height)],
          labelInside: inside(R(rv.add.querySelector(".sg-photo-add-label")), R(rv.frame)) };
        document.getElementById("showObverseBtn").click();
        return {
          inner,
          x: { dist: Math.round(Math.hypot(xc.x - cx, xc.y - cy)), r: Math.round(rr), w: Math.round(x.width), h: Math.round(x.height),
               overLabel: labels.filter(l => hit(x, l)).length, underIsX: under === s.remove, nLabels: labels.length },
          order: { labelBelowFrame: lab.top >= frame.bottom - 0.5, replaceBelowLabel: rep.top >= lab.bottom - 0.5, recropBelowReplace: rc.top >= rep.bottom - 0.5 },
          btns: [rep, rc].map(r => ({ inBox: inside(r, box), inScreen: r.left >= 0 && r.right <= inner, h: Math.round(r.height) })),
          oneLine: [s.replace, s.recrop].every(b => b.scrollWidth <= b.clientWidth + 1),
          thumbs, plus: { w: Math.round(ab.width), h: Math.round(ab.height), top: Math.round(ab.top), rowTop: tileRowTop },
          tileInScreen: R(__ac.tile()).right <= inner,
          revEmpty,
          chooser: { inside: panel.left >= 0 && panel.right <= inner, bottomGap: Math.round(window.innerHeight - panel.bottom) },
          pageScroll: document.documentElement.scrollWidth > inner,
        };
      }, mode);
      const tag = mode + " " + vp.width + "x" + vp.height;
      console.log("    add coin layout " + tag + ": " + JSON.stringify({ x: L.x, plus: L.plus }));
      ok(L.btns.every(b => b.inBox && b.inScreen && b.h >= 32) && L.oneLine,
        `ACL1 ${tag}: Replace and Recrop are one line, 32px+, inside the photo box and the screen: ` + JSON.stringify(L.btns));
      ok(L.revEmpty && L.revEmpty.add[0] === L.revEmpty.frame[0] - 4 && L.revEmpty.add[1] === L.revEmpty.frame[1] - 4 && L.revEmpty.labelInside,
        `ACL2 ${tag}: an empty side's + fills its circle (inside the 2px border), with the side's name inside: ` + JSON.stringify(L.revEmpty));
      ok(L.x.w === 20 && L.x.h === 20 && L.x.dist + 10 <= L.x.r && L.x.underIsX,
        `ACL3 ${tag}: the ✕ is a 20px circle on the photo, inside the coin's rim, and is what a tap there hits: ` + JSON.stringify(L.x));
      ok(L.x.nLabels >= 3 && L.x.overLabel === 0,
        `ACL4 ${tag}: the ✕ overlaps no flip-label text (long values in every corner): ` + JSON.stringify(L.x));
      ok(L.order.labelBelowFrame && L.order.replaceBelowLabel && L.order.recropBelowReplace,
        `ACL5 ${tag}: under the photo come its name, then Replace, then the Recrop pill: ` + JSON.stringify(L.order));
      ok(L.thumbs.length >= 2 && L.thumbs.every(t => t.inside && t.h >= 28 && t.off && JSON.stringify(t.off) === JSON.stringify(L.thumbs[0].off) && t.off.w === 20) && L.tileInScreen,
        `ACL6 ${tag}: each gallery thumbnail's Replace stays inside it, every ✕ sits at the same corner offset, the + tile is on screen: ` + JSON.stringify(L.thumbs));
      // Top-aligned with the thumbnails sharing its row; at 360px with two
      // thumbs the tile wraps to a row of its own (flex-wrap), where there is
      // nothing beside it to align with.
      const sameRow = L.thumbs.filter(t => t.rowTop === L.plus.rowTop);
      ok(L.thumbs.length >= 1 && L.plus.w === L.thumbs[0].img[0] && L.plus.h === L.thumbs[0].img[1] &&
         sameRow.every(t => t.top === L.plus.top) && (vp.width < 400 || sameRow.length >= 1),
        `ACL7 ${tag}: the + tile's box is the thumbnail image's size and top-aligned with the thumbnails in its row: ` + JSON.stringify([L.plus, L.thumbs]));
      ok(L.chooser.inside && !L.pageScroll && (vp.width >= 700 || L.chooser.bottomGap === 0),
        `ACL8 ${tag}: the chooser fits the screen (a bottom sheet on a phone), no sideways page scroll: ` + JSON.stringify(L.chooser));
      await p.close();
    }
  }
}, module);
