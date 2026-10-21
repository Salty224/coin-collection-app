// Edit Coin: the 📁 Files button on its photo pickers, and the guard.
//
// WHY. Same cause as Add Coin's 📁 button (verify_files_picker.js): on Ray's
// S25 in Chrome an image-only accept opens the Photos-style picker, whose
// only cloud source is Google Photos, so a photo in OneDrive could not be
// reached from Edit Coin. An accept that also allows a PDF makes Android open
// the Files screen, where OneDrive is listed. Tests CANNOT show which picker
// Android opens; they pin the attributes that decide it, the behaviour after
// a file arrives, and the scope.
//
// Edit Coin's photo inputs are drawn by renderManagePhotosInto(), which is
// shared with Edit Set and the standalone Manage Photos screen (and its pair
// slot with Add Set). The Files button is opt-in (options.files) and only
// Edit Coin passes it.
//
//   E1  Edit Coin: Obverse/Reverse, Slab front/back, the Reference and Other
//       add rows and each Reference thumbnail's Replace show a 📁 button;
//       every Files input has accept "image/*,application/pdf" and no capture
//   E2  scope: Edit Set, standalone Manage Photos and Add Set render no
//       Files button and no Files input
//   E3  a JPEG through Files on an owned coin: crop opens, one upload, one
//       Photos row — the same path as Library
//   E4  a Files Replace on a stored Reference updates its row in place,
//       keeping PhotoID and Label
//   E5  a PDF, broken JPEG bytes and an undecodable HEIC through Files, and a
//       PDF forced onto Library, are refused with the toast: no crop screen,
//       no gallery entry, zero Graph requests; a stored photo being
//       replaced stays
//   E6  the Edit Coin receipt still attaches a PDF through its own Library
//       input, with no Files button
//   E7  Camera is not guarded: a camera pick still opens the crop screen
//   L   layout at 360, 412 and 1024x768 with a long name: no button clipped
//       by its slot, the 3-button add row one line, no sideways page scroll

const { defineSuite } = require("./harness");

const FILES_ACCEPT = "image/*,application/pdf";
const TOAST = "That file isn't a photo. Nothing was added.";
const LONG_NAME = "1916-D Mercury Dime Winged Liberty Head Full Bands Key Date Extremely Long Description";

// Installed once per page: fixture coin with a stored obverse and a stored
// Reference, a mock Graph client wrapped in a call counter, and helpers.
async function setup(page) {
  await page.evaluate(({ LONG_NAME }) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
    window.__ef = {
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
      photosSeed() {
        return { sheets: { Photos: [
          ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"],
          ["PH-00001", "AY-00099", "Obverse", "", "AY-00099_obverse_cropped.jpg", "", 46000, ""],
          ["PH-00002", "AY-00099", "Reference", "", "AY-00099_reference_01.jpg", "PCGS photo", 46000, ""],
          ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""],
        ] } };
      },
      install() {
        const self = this;
        const mock = createMockGraphClient(this.photosSeed());
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
        this.graphCalls = 0;
      },
      openSection(hostId, re) {
        const host = document.getElementById(hostId);
        const h = [...host.querySelectorAll(".accordion-header")].find(x => re.test(x.textContent));
        if (h && h.getAttribute("aria-expanded") !== "true") h.click();
        return h ? h.nextElementSibling : null;
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
      pick(input, file) {
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
      photoRows() { return this.mock._grids.Photos.filter(r => r[1] === "AY-00099"); },
      async finishCrop() {
        if (!(await this.waitFor(() => this.overlayOpen("bgCropOverlay")))) return false;
        document.getElementById("bgCropUseBtn").click();
        if (await this.waitFor(() => this.overlayOpen("photoAdjustOverlay"), 1500)) document.getElementById("photoAdjustUseBtn").click();
        return true;
      },
      // A refused pick: what the screen and the workbook did.
      async refused(input, file) {
        this.closeOverlays();
        const before = galleryFor(this.id).length;
        const calls = this.graphCalls;
        const picked = this.pick(input, file);
        await this.waitFor(() => this.toast() !== "", 3000);
        await sleep(250);
        return { picked, toast: this.toast(), crop: this.overlayOpen("bgCropOverlay"),
                 added: galleryFor(this.id).length - before, graph: this.graphCalls - calls };
      },
    };
  }, { LONG_NAME });
}

module.exports = defineSuite("edit-coin-files-picker", async ({ ok, openApp, PHONE, TABLET }) => {
  const page = await openApp(PHONE);
  await setup(page);

  // ---------- E1. What Edit Coin renders --------------------------------
  const E1 = await page.evaluate(async () => {
    __ef.install();
    const host = __ef.openEditCoin();
    const out = {};
    const pair = (re) => {
      const body = __ef.openSection("browseEditPhotosSections", re);
      return [...body.querySelectorAll(".sg-photo-slot")].map(s => ({
        btn: !!s.querySelector('[data-act="files"]'),
        accept: (s.querySelector('[data-role="files"]') || {}).accept || null,
        capture: s.querySelector('[data-role="files"]') ? s.querySelector('[data-role="files"]').hasAttribute("capture") : null,
      }));
    };
    out.obvRev = pair(/obverse/);
    out.slab = pair(/Slab/);
    const ref = __ef.openSection("browseEditPhotosSections", /Reference/);
    await new Promise(r => setTimeout(r, 150));
    const refRow = ref.querySelector(".gc-add-row");
    out.refAdd = { cls: refRow.className, labels: [...refRow.querySelectorAll("button")].map(b => b.textContent.trim()),
      accept: (refRow.querySelector('[data-role="files"]') || {}).accept || null,
      capture: refRow.querySelector('[data-role="files"]') ? refRow.querySelector('[data-role="files"]').hasAttribute("capture") : null };
    const thumb = ref.querySelector(".gc-thumb");
    out.refThumb = { thumbs: ref.querySelectorAll(".gc-thumb").length, btn: !!(thumb && thumb.querySelector('[data-role="rep-files"]')),
      accept: thumb && (thumb.querySelector('[data-role="rep-files-input"]') || {}).accept || null,
      capture: thumb && thumb.querySelector('[data-role="rep-files-input"]') ? thumb.querySelector('[data-role="rep-files-input"]').hasAttribute("capture") : null };
    const other = __ef.openSection("browseEditPhotosSections", /Other photos/);
    out.otherAdd = !!other.querySelector('.gc-add-row [data-role="files-btn"]');
    // Every Files input on the Photos host, wherever it is.
    out.allFiles = [...host.querySelectorAll('input[type="file"]')]
      .filter(i => /files/.test(i.dataset.role)).map(i => [i.accept, i.hasAttribute("capture")]);
    return out;
  });
  const filesInputOk = (a, c) => a === "image/*,application/pdf" && c === false;
  ok(E1.obvRev.length === 2 && E1.obvRev.every(s => s.btn && filesInputOk(s.accept, s.capture)),
    "E1a Obverse and Reverse each show 📁 with a Files-accept input and no capture: " + JSON.stringify(E1.obvRev));
  ok(E1.slab.length === 2 && E1.slab.every(s => s.btn && filesInputOk(s.accept, s.capture)),
    "E1b Slab front and back each show 📁: " + JSON.stringify(E1.slab));
  ok(/gc-add-row-3/.test(E1.refAdd.cls) && JSON.stringify(E1.refAdd.labels) === JSON.stringify(["📷 Camera", "🖼️ Library", "📁 Files"]) &&
     filesInputOk(E1.refAdd.accept, E1.refAdd.capture) && E1.otherAdd,
    "E1c Reference and Other add rows are Camera / Library / Files: " + JSON.stringify(E1.refAdd));
  ok(E1.refThumb.thumbs === 1 && E1.refThumb.btn && filesInputOk(E1.refThumb.accept, E1.refThumb.capture),
    "E1d the stored Reference thumbnail's Replace has 📁: " + JSON.stringify(E1.refThumb));
  ok(E1.allFiles.length >= 7 && E1.allFiles.every(([a, c]) => filesInputOk(a, c)),
    "E1e every Files input on Edit Coin's photos is image/*,application/pdf with no capture: " + JSON.stringify(E1.allFiles));

  // ---------- E2. Scope: nothing else gets it ---------------------------
  const E2 = await page.evaluate(async () => {
    __ef.install();
    const count = (el) => !el ? -1 : el.querySelectorAll('[data-act="files"], [data-role="files"], [data-role="files-btn"], [data-role="rep-files"], [data-role="rep-files-input"]').length;
    const openAll = (hostId) => {
      const host = document.getElementById(hostId);
      [...host.querySelectorAll(".accordion-header")].forEach(h => { if (h.getAttribute("aria-expanded") !== "true") h.click(); });
      return host;
    };
    // Through each screen's real entry point, not the shared renderer, so a
    // call site that wrongly passes files:true is caught.
    openManagePhotos({ id: "AY-00099", name: "x", meta: "AY-00099", kind: "coin", backTo: () => {} });
    const manage = count(openAll("managePhotosSections"));
    const manageInputs = document.getElementById("managePhotosSections").querySelectorAll('input[type="file"]').length;
    const set = { id: "AY-00090", name: "Proof Set", denom: "Multiple", year: 1957, mint: "", category: "Proof Set" };
    __setLiveCoinsForTest([__ef.coin, set]);
    navigate("browse"); showBrowseDetail(set); showBrowseEditSetView(set);
    const editSet = count(openAll("editSetPhotosSections"));
    const editSetInputs = document.getElementById("editSetPhotosSections").querySelectorAll('input[type="file"]').length;
    // Add Set's pair slots: the docs accordion and the sub-group sheet.
    navigate("addset");
    if (typeof renderAddSetDocs === "function") renderAddSetDocs();
    const addSet = count(document.getElementById("addSetDocsSlots"));
    return { manage, manageInputs, editSet, editSetInputs, addSet };
  });
  ok(E2.manage === 0 && E2.manageInputs > 0,
    "E2a standalone Manage Photos (same coin, same renderer) has no Files button or input: " + JSON.stringify(E2));
  ok(E2.editSet === 0 && E2.editSetInputs > 0, "E2b Edit Set's photos have no Files button or input: " + JSON.stringify(E2));
  ok(E2.addSet === 0, "E2c Add Set's pair slots have no Files button or input: " + JSON.stringify(E2));

  // ---------- E3. A JPEG through Files commits like Library -------------
  const E3 = await page.evaluate(async () => {
    __ef.install();
    __ef.openEditCoin();
    const body = __ef.openSection("browseEditPhotosSections", /Slab/);
    const slot = body.querySelector(".sg-photo-slot");
    const rowsBefore = __ef.photoRows().length;
    __ef.pick(slot.querySelector('[data-role="files"]'), await __ef.jpeg());
    const crop = await __ef.finishCrop();
    await __ef.waitFor(() => __ef.photoRows().length > rowsBefore, 4000);
    const rows = __ef.photoRows();
    const slab = rows.find(r => r[2] === "Slab_Obverse");
    const file = slab ? await __ef.mock.getItemMeta("CoinCollection/_Testing/CoinPhotos/" + slab[4]) : null;
    return { crop, toast: __ef.toast(), rowsAdded: rows.length - rowsBefore, slabFile: slab && slab[4], uploaded: !!file,
             entry: !!galleryFor("AY-00099").find(e => e.type === "slab_obverse") };
  });
  ok(E3.crop && E3.toast !== "That file isn't a photo. Nothing was added.",
    "E3a a JPEG through 📁 opens the crop screen, no refusal: " + JSON.stringify(E3));
  ok(E3.rowsAdded === 1 && E3.uploaded && E3.entry && /^AY-00099_slab_obverse/.test(E3.slabFile || ""),
    "E3b it uploads to CoinPhotos and writes one Photos row, as Library does: " + JSON.stringify(E3));

  // ---------- E4. Files Replace on a stored Reference ----------------------
  const E4 = await page.evaluate(async () => {
    __ef.install();
    __ef.openEditCoin();
    const body = __ef.openSection("browseEditPhotosSections", /Reference/);
    await new Promise(r => setTimeout(r, 150));
    const thumb = body.querySelector(".gc-thumb");
    __ef.pick(thumb && thumb.querySelector('[data-role="rep-files-input"]'), await __ef.jpeg());
    const crop = await __ef.finishCrop();
    await __ef.waitFor(() => (__ef.photoRows().find(r => r[0] === "PH-00002") || [])[4] !== "AY-00099_reference_01.jpg", 4000);
    const refs = __ef.photoRows().filter(r => r[2] === "Reference");
    const row = refs.find(r => r[0] === "PH-00002");
    return { crop, refs: refs.length, filename: row && row[4], label: row && row[5] };
  });
  ok(E4.crop && E4.refs === 1 && E4.filename && E4.filename !== "AY-00099_reference_01.jpg" && E4.label === "PCGS photo",
    "E4 a 📁 Replace updates PH-00002 in place, new file, Label kept, no second row: " + JSON.stringify(E4));

  // ---------- E5. Non-photos refused ---------------------------------------
  const E5 = await page.evaluate(async () => {
    __ef.install();
    __ef.openEditCoin();
    const out = {};
    let body = __ef.openSection("browseEditPhotosSections", /obverse/);
    // Opening Edit Coin starts its own reads (the row snapshot); let them
    // finish so the counts below see only what a pick does.
    await new Promise(r => setTimeout(r, 600));
    const obvSlot = () => document.getElementById("browseEditPhotosSections").querySelector(".sg-photo-slot");
    out.pdfFiles = await __ef.refused(obvSlot().querySelector('[data-role="files"]'), __ef.file("pdf"));
    out.brokenFiles = await __ef.refused(obvSlot().querySelector('[data-role="files"]'), __ef.file("broken"));
    out.heicFiles = await __ef.refused(obvSlot().querySelector('[data-role="files"]'), __ef.file("heic"));
    out.pdfLib = await __ef.refused(obvSlot().querySelector('[data-role="lib"]'), __ef.file("pdf"));
    const obv = galleryFor("AY-00099").find(e => e.type === "obverse");
    out.storedKept = !!obv && obv.filename === "AY-00099_obverse_cropped.jpg";
    out.rowKept = (__ef.photoRows().find(r => r[0] === "PH-00001") || [])[4] === "AY-00099_obverse_cropped.jpg";
    const ref = __ef.openSection("browseEditPhotosSections", /Reference/);
    await new Promise(r => setTimeout(r, 150));
    out.pdfAdd = await __ef.refused(ref.querySelector('.gc-add-row [data-role="files"]'), __ef.file("pdf"));
    out.pdfRep = await __ef.refused(ref.querySelector('[data-role="rep-files-input"]'), __ef.file("pdf"));
    out.pdfRepLib = await __ef.refused(ref.querySelector('[data-role="rep-lib-input"]'), __ef.file("pdf"));
    return out;
  });
  const refusedOk = (r) => r && r.picked && r.toast === TOAST && !r.crop && r.added === 0 && r.graph === 0;
  ok(refusedOk(E5.pdfFiles), "E5a Obverse: a PDF through 📁 is refused, no crop, nothing added, zero Graph calls: " + JSON.stringify(E5.pdfFiles));
  ok(refusedOk(E5.brokenFiles) && refusedOk(E5.heicFiles),
    "E5b Obverse: broken JPEG and undecodable HEIC through 📁 are refused: " + JSON.stringify([E5.brokenFiles, E5.heicFiles]));
  ok(refusedOk(E5.pdfLib), "E5c Obverse: a PDF forced onto 🖼️ Library is refused too: " + JSON.stringify(E5.pdfLib));
  ok(E5.storedKept && E5.rowKept, "E5d the stored obverse and its Photos row are untouched after the refusals: " + JSON.stringify(E5));
  ok(refusedOk(E5.pdfAdd) && refusedOk(E5.pdfRep) && refusedOk(E5.pdfRepLib),
    "E5e Reference: a PDF through the add row's 📁, the Replace 📁 and the Replace 🖼️ are all refused: " +
    JSON.stringify([E5.pdfAdd, E5.pdfRep, E5.pdfRepLib]));

  // ---------- E6. Receipt unchanged ----------------------------------------
  const E6 = await page.evaluate(async () => {
    __ef.install();
    __ef.openEditCoin();
    const lib = document.getElementById("browseEditReceiptLibraryInput");
    delete receiptFiles["browseEditReceiptPreview"];
    __ef.pick(lib, __ef.file("pdf"));
    await __ef.waitFor(() => !!receiptFiles["browseEditReceiptPreview"], 3000);
    const r = receiptFiles["browseEditReceiptPreview"];
    const acc = document.getElementById("browseEditReceiptAccordion");
    return { accept: lib.getAttribute("accept"), attached: !!r && r.sourceWasPdf === true, toast: __ef.toast(),
             filesBtn: !!acc.querySelector('[data-act="files"], [data-role="files"], [id*="Files"]') };
  });
  ok(E6.accept === FILES_ACCEPT && E6.attached && E6.toast === "" && !E6.filesBtn,
    "E6 the Edit Coin receipt still attaches a PDF through 🖼️, unguarded, with no Files button: " + JSON.stringify(E6));

  // ---------- E7. Camera unguarded -----------------------------------------
  const E7 = await page.evaluate(async () => {
    __ef.install();
    __ef.openEditCoin();
    const body = __ef.openSection("browseEditPhotosSections", /Slab/);
    const slot = [...body.querySelectorAll(".sg-photo-slot")][1];
    const cam = slot.querySelector('[data-role="cam"]');
    __ef.pick(cam, await __ef.jpeg());
    const opened = await __ef.waitFor(() => __ef.overlayOpen("bgCropOverlay"), 3000);
    __ef.closeOverlays();
    return { opened, capture: cam.getAttribute("capture"), accept: cam.getAttribute("accept") };
  });
  ok(E7.opened && E7.capture === "environment" && E7.accept === "image/*",
    "E7 Camera keeps image/* + capture=environment and still opens the crop screen: " + JSON.stringify(E7));

  // ---------- L. Layout ------------------------------------------------------
  for (const vp of [{ width: 360, height: 800 }, PHONE, TABLET]) {
    const p = vp === PHONE ? page : await openApp(vp);
    if (p !== page) await setup(p);
    const L = await p.evaluate(async () => {
      __ef.install();
      // The busiest slots: the obverse as a session capture whose upload
      // failed (📷 🖼️ 📁 ⤢ ↻ 🗑️, six buttons) and the slab front failed too
      // (📷 🖼️ 📁 ↻ 🗑️). A session entry wins over the stored one.
      const u = () => URL.createObjectURL(new Blob([new Uint8Array([1])], { type: "image/jpeg" }));
      const g = galleryFor("AY-00099");
      g.push({ type: "obverse", url: u(), rawUrl: u(), filename: "AY-00099_obverse_cropped.jpg", caption: "", uploadError: "test" });
      g.push({ type: "slab_obverse", url: u(), filename: "AY-00099_slab_obverse.jpg", caption: "", uploadError: "test" });
      const host = __ef.openEditCoin();
      [...host.querySelectorAll(".accordion-header")].forEach(h => { if (h.getAttribute("aria-expanded") !== "true") h.click(); });
      await new Promise(r => setTimeout(r, 200));
      const inner = window.innerWidth;
      const slots = [...host.querySelectorAll(".sg-photo-slot")].map(s => {
        const sr = s.getBoundingClientRect();
        const btns = [...s.querySelectorAll(".sg-photo-actions button")];
        const rs = btns.map(b => b.getBoundingClientRect());
        return { w: Math.round(sr.width), n: btns.length,
                 lines: new Set(rs.map(r => Math.round(r.top))).size,
                 clipped: rs.filter(r => r.left < sr.left - 0.5 || r.right > sr.right + 0.5).length,
                 btnW: rs.map(r => Math.round(r.width)), btnH: Math.min(...rs.map(r => Math.round(r.height))) };
      });
      const rows = [...host.querySelectorAll(".gc-add-row")].map(row => {
        const rr = row.getBoundingClientRect();
        const kids = [...row.children].filter(k => k.offsetParent !== null);
        return { lines: new Set(kids.map(k => Math.round(k.getBoundingClientRect().top))).size,
                 clipped: kids.filter(k => k.scrollWidth > k.clientWidth + 1).length,
                 inside: rr.right <= inner };
      });
      const thumbs = [...host.querySelectorAll(".gc-thumb")].map(t => {
        const tr = t.getBoundingClientRect();
        const kids = [...t.querySelectorAll(".gc-replace-row > *")].map(k => k.getBoundingClientRect());
        return { lines: new Set(kids.map(r => Math.round(r.top))).size,
                 out: kids.filter(r => r.right > tr.right + 0.5).length };
      });
      return { inner, slots, rows, thumbs, pageScroll: document.documentElement.scrollWidth > inner };
    });
    const tag = vp.width + "x" + vp.height;
    console.log("    layout " + tag + ": " + JSON.stringify(L.slots.map(s => ({ w: s.w, n: s.n, lines: s.lines, btnW: s.btnW }))));
    ok(L.slots.some(s => s.n === 6) && L.slots.length >= 4 && L.slots.every(s => s.clipped === 0 && s.lines <= 2 && s.btnH >= 28),
      `L1 ${tag}: every pair-slot button sits inside its slot, at most two lines, tap height kept: ` + JSON.stringify(L.slots));
    ok(L.rows.length >= 2 && L.rows.every(r => r.lines === 1 && r.clipped === 0 && r.inside),
      `L2 ${tag}: the Camera / Library / Files add rows are one line, no clipped label: ` + JSON.stringify(L.rows));
    ok(L.thumbs.length >= 1 && L.thumbs.every(t => t.out === 0),
      `L3 ${tag}: the Replace row's buttons stay inside the thumbnail: ` + JSON.stringify(L.thumbs));
    ok(!L.pageScroll, `L4 ${tag}: no sideways page scroll`);
    if (vp.width === 1024) ok(L.slots.every(s => s.lines === 1), "L5 1024x768: the pair-slot rows stay on one line");
    if (p !== page) await p.close();
  }
}, module);
