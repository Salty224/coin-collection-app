// Add Coin: the 📁 Files button and the "isn't a photo" guard.
//
// SINCE claude/addcoin-shared-photos (commit 6): Add Coin's own 📷 🖼️ 📁
// slots and gallery are gone; its photos are Edit Coin's section, and every
// pick goes through the shared image chooser (Camera / Library / Files).
// This suite now drives the chooser FROM Add Coin's section: the same
// accept, the same guard, the same entry from Files as from Library. The
// pinned inventory below no longer lists the six retired Add Coin inputs.
//
// WHY. On Ray's phone (Chrome, Android) an image-only accept opens the
// Photos-style picker, whose only cloud source is Google Photos, so a photo
// in OneDrive could not be reached from Add Coin. An accept that also allows
// a non-image type makes Android open the Files screen instead, where the
// OneDrive app is listed. Tests CANNOT show which picker Android opens; they
// pin the attributes that decide it and the behaviour after a file arrives.
//
// What must hold, and which block proves it:
//   A  the new Files inputs: accept exactly "image/*,application/pdf", no
//      capture, on Obverse, Reverse and the Add photo gallery only
//   B  every one of the 42 pre-existing file inputs (34 in app.html, 8 in
//      stage.html) keeps its exact accept and capture — any change fails
//   C  every camera input still has capture="environment"
//   D  a JPEG through Files behaves exactly like the same JPEG through Library
//   E  a PDF, broken JPEG bytes and an undecodable HEIC are refused with the
//      toast: no crop screen, nothing added, zero Graph requests
//   F  control: main's handler (no guard) on the same PDF opens no crop
//      screen, shows no message and rejects — today's silent failure
//   G  receipt slots unchanged: a PDF still attaches on the receipt Library
//   H  picking on Add Coin sends no Graph request before Save
//   I  each button row is one line with no sideways scroll at 360, 412 and
//      1024x768

const fs = require("fs");
const path = require("path");
const { defineSuite } = require("./harness");

const ROOT = path.resolve(__dirname, "..");
const FILES_ACCEPT = "image/*,application/pdf";
const TOAST = "That file isn't a photo. Nothing was added.";

// Every <input type="file"> as it stood on main 4f6577b, in source order:
// [key, accept, capture or "-"]. A template input is keyed by its data-role.
const MAIN_APP_INPUTS = [
  ["browseEditReceiptCameraInput", "image/*", "environment"],
  ["browseEditReceiptLibraryInput", "image/*,application/pdf", "-"],
  ["editSetReceiptCameraInput", "image/*", "environment"],
  ["editSetReceiptLibraryInput", "image/*,application/pdf", "-"],
  ["wishlistReceiptCameraInput", "image/*", "environment"],
  ["wishlistReceiptLibraryInput", "image/*,application/pdf", "-"],
  ["wishlistObverseCameraInput", "image/*", "environment"],
  ["wishlistObverseLibraryInput", "image/*", "-"],
  ["wishlistReverseCameraInput", "image/*", "environment"],
  ["wishlistReverseLibraryInput", "image/*", "-"],
  ["wishlistAdditionalCameraInput", "image/*", "environment"],
  ["wishlistAdditionalLibraryInput", "image/*", "-"],
  // Add Coin's obverse/reverse camera and library inputs: retired with its
  // preview card (claude/addcoin-shared-photos, commit 6).
  ["receiptCameraInput", "image/*", "environment"],
  ["receiptLibraryInput", "image/*,application/pdf", "-"],
  ["batchReceiptCameraInput", "image/*", "environment"],
  ["batchReceiptLibraryInput", "image/*,application/pdf", "-"],
  ["addSetReceiptCameraInput", "image/*", "environment"],
  ["addSetReceiptLibraryInput", "image/*,application/pdf", "-"],
  ["addSetChildObvCameraInput", "image/*", "environment"],
  ["addSetChildObvLibraryInput", "image/*", "-"],
  ["addSetChildRevCameraInput", "image/*", "environment"],
  ["addSetChildRevLibraryInput", "image/*", "-"],
  ["role:cam", "image/*", "environment"],            // buildPhotoPairSlot
  ["role:lib", "image/*", "-"],
  ["role:rep-cam-input", "image/*", "environment"],  // manageOpenEndedBlock replace
  ["role:rep-lib-input", "image/*", "-"],
  ["role:cam", "image/*", "environment"],            // manageOpenEndedBlock add
  ["role:lib", "image/*", "-"],
  ["role:cam", "image/*", "environment"],            // initGalleryCapture
  ["role:lib", "image/*", "-"],
];
const MAIN_STAGE_INPUTS = [
  ["obverseCameraInput", "image/*", "environment"],
  ["obverseLibraryInput", "image/*", "-"],
  ["reverseCameraInput", "image/*", "environment"],
  ["reverseLibraryInput", "image/*", "-"],
  ["receiptCameraInput", "image/*", "environment"],
  ["receiptLibraryInput", "image/*", "-"],
  ["${id}_cameraInput", "image/*", "environment"],
  ["${id}_libraryInput", "image/*", "-"],
];
// The three inputs this branch adds. The gallery one's accept is a template
// expression in source; its rendered value is checked in block A.
// Add Coin's obverseFilesInput/reverseFilesInput are retired with its slots
// (commit 6); the gallery widget keeps its opt-in Files input (no caller
// uses it now).
const NEW_INPUTS = {
  "role:files": "${FILES_PICKER_ACCEPT}",
};
// The unified image chooser's three shared inputs (verify_image_chooser.js
// covers their behaviour). Kept out of the pinned list and checked here.
const CHOOSER_INPUTS = {
  imageChooserCameraInput: ["image/*", "environment"],
  imageChooserLibraryInput: ["image/*", "-"],
  imageChooserFilesInput: [FILES_ACCEPT, "-"],
};

function fileInputsIn(file) {
  const src = fs.readFileSync(path.join(ROOT, file), "utf8");
  return (src.match(/<input type="file"[^>]*>/g) || []).map(tag => {
    const id = tag.match(/\bid="([^"]+)"/);
    const role = tag.match(/data-role="([^"]+)"/);
    const accept = tag.match(/\baccept="([^"]*)"/);
    const capture = tag.match(/\bcapture="([^"]*)"/);
    return [id ? id[1] : "role:" + (role ? role[1] : "?"),
            accept ? accept[1] : "(none)", capture ? capture[1] : "-"];
  });
}

module.exports = defineSuite("files-picker", async ({ ok, openApp, PHONE, TABLET }) => {
  // ---------- B / C. Source inventory -------------------------------------
  const appInputs = fileInputsIn("app.html");
  const stageInputs = fileInputsIn("stage.html");
  const appExisting = appInputs.filter(r => !(r[0] in NEW_INPUTS) && !(r[0] in CHOOSER_INPUTS));
  const appChooser = appInputs.filter(r => r[0] in CHOOSER_INPUTS);
  const appNew = appInputs.filter(r => r[0] in NEW_INPUTS);
  ok(MAIN_APP_INPUTS.length + MAIN_STAGE_INPUTS.length === 38,
    "B0 the pinned list covers 38 inputs (30 app.html + 8 stage.html; Add Coin's 4 slot inputs retired)");
  ok(JSON.stringify(appExisting) === JSON.stringify(MAIN_APP_INPUTS),
    "B1 every pre-existing app.html file input keeps its exact accept and capture: " +
    JSON.stringify(appExisting.filter((r, i) => JSON.stringify(r) !== JSON.stringify(MAIN_APP_INPUTS[i]))));
  ok(JSON.stringify(stageInputs) === JSON.stringify(MAIN_STAGE_INPUTS),
    "B2 stage.html's 8 file inputs are unchanged");
  ok(appInputs.length === 34 && appNew.length === 1 && appChooser.length === 3 &&
     !appInputs.some(r => /^(obverse|reverse)(Camera|Library|Files)Input$/.test(r[0])),
    "B3 app.html has the 30 pinned inputs, the gallery's Files input and the 3 chooser inputs, and no Add Coin slot inputs: " + appInputs.length);
  ok(appChooser.every(r => JSON.stringify([r[1], r[2]]) === JSON.stringify(CHOOSER_INPUTS[r[0]])),
    "B4 the chooser's inputs: Camera image/*+capture, Library image/*, Files image/*,application/pdf no capture: " + JSON.stringify(appChooser));
  const cams = appInputs.concat(stageInputs).filter(r => /camera|cam\b|cam-input/i.test(r[0]));
  ok(cams.length === 20 && cams.every(r => r[2] === "environment" && r[1] === "image/*"),
    "C1 all 20 camera inputs (19 + the chooser's) still have accept image/* and capture=environment");
  ok(appNew.every(r => r[2] === "-" && r[1] === NEW_INPUTS[r[0]]),
    "A1 source: the new Files inputs have the expected accept and no capture: " + JSON.stringify(appNew));

  const page = await openApp(PHONE);

  // In-page helpers, defined once.
  await page.evaluate(({ TOAST }) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    // The splash's Docket retry loop calls graph() in the background; keep it
    // out of this suite's Graph-request counts.
    __setDocketWriteEnabledForTest(false);
    window.__fp = {
      graphCalls: 0, fetches: 0,
      async jpeg() {
        const c = document.createElement("canvas"); c.width = 300; c.height = 300;
        const x = c.getContext("2d"); x.fillStyle = "#2a6"; x.fillRect(0, 0, 300, 300);
        x.fillStyle = "#da3"; x.beginPath(); x.arc(150, 150, 110, 0, Math.PI * 2); x.fill();
        return await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
      },
      file(kind, blob) {
        if (kind === "jpeg") return new File([blob], "coin.jpg", { type: "image/jpeg" });
        if (kind === "pdf") return new File(["%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"], "receipt.pdf", { type: "application/pdf" });
        if (kind === "broken") return new File([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4, 5, 6, 7, 8])], "broken.jpg", { type: "image/jpeg" });
        if (kind === "heic") {
          const b = new Uint8Array(64); b.set([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], 0);
          return new File([b], "IMG_0001.HEIC", { type: "image/heic" });
        }
      },
      // Puts a file on an input exactly as a picker does, then fires change.
      pick(input, file) {
        const dt = new DataTransfer(); dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      },
      overlayOpen(id) { const o = document.getElementById(id); return !!o && !o.classList.contains("hidden"); },
      toast() { const t = document.getElementById("toast"); return t.classList.contains("show") ? t.textContent : ""; },
      clearToast() { const t = document.getElementById("toast"); t.classList.remove("show"); t.textContent = ""; },
      async waitFor(fn, ms) { const end = Date.now() + (ms || 3000); while (Date.now() < end) { if (fn()) return true; await sleep(40); } return !!fn(); },
      // A Graph client and a fetch wrapper that only count; nothing on these
      // paths may reach either.
      installCounters() {
        const self = this;
        const mock = createMockGraphClient({});
        __setGraphClientForTest(new Proxy(mock, { get(t, k) {
          const v = t[k]; return typeof v === "function" ? (...a) => { self.graphCalls++; return v.apply(t, a); } : v;
        } }));
        if (!window.__fpFetchWrapped) {
          const orig = window.fetch;
          window.fetch = (...a) => { if (/graph\.microsoft\.com/.test(String(a[0] && a[0].url || a[0]))) self.fetches++; return orig(...a); };
          window.__fpFetchWrapped = true;
        }
        this.graphCalls = 0; this.fetches = 0;
      },
      freshAddCoin() {
        navigate("addcoin");
        const body = document.getElementById("addCoinPhotosBody");
        if (body.classList.contains("hidden")) document.getElementById("addCoinPhotosHeader").click();
        if (typeof closeBgCrop === "function") closeBgCrop();
        document.getElementById("photoAdjustOverlay").classList.add("hidden");
        closeImageSourceChooser();
        this.clearToast();
      },
      // A slot's "+" (or Replace) in Add Coin's photo section.
      slotTrigger(sectionRe, i) {
        const h = [...document.querySelectorAll("#addCoinPhotoSections .accordion-header")].find(x => sectionRe.test(x.textContent));
        if (h.getAttribute("aria-expanded") !== "true") h.click();
        return h.nextElementSibling.querySelectorAll(".sg-photo-slot")[i].querySelector('[data-act="add"], [data-act="replace"]');
      },
      // "+" -> the chooser's Library or Files button -> the file on its input.
      viaChooser(trigger, source, file) {
        trigger.click();
        document.querySelector('#imageSourceChooser .image-chooser-btn[data-source="' + source + '"]').click();
        this.pick(document.getElementById(source === "files" ? "imageChooserFilesInput" : "imageChooserLibraryInput"), file);
      },
      // Runs a pick through Stage 1 and Stage 2 to a finished entry.
      async pickAndFinish(trigger, source, file) {
        this.viaChooser(trigger, source, file);
        if (!(await this.waitFor(() => this.overlayOpen("bgCropOverlay")))) return { stage1: false };
        const title = document.getElementById("bgCropTitle").textContent;
        document.getElementById("bgCropUseBtn").click();
        const stage2 = await this.waitFor(() => this.overlayOpen("photoAdjustOverlay"));
        if (stage2) document.getElementById("photoAdjustUseBtn").click();
        await this.waitFor(() => galleryFor(ADDCOIN_GALLERY_ID).length > 0);
        const e = galleryFor(ADDCOIN_GALLERY_ID).slice(-1)[0] || {};
        return { stage1: true, title, stage2, type: e.type, filename: e.filename, rawFilename: e.rawFilename,
                 blobType: e.blob && e.blob.type, hasCircle: !!e.circleUrl,
                 preview: !!document.querySelector("#addCoinPhotoSections .sg-photo-img") };
      },
      // Picks a refused file and reports what the screen did.
      async refused(trigger, source, file) {
        const before = galleryFor(ADDCOIN_GALLERY_ID).length;
        this.viaChooser(trigger, source, file);
        await this.waitFor(() => this.toast() !== "", 3000);
        await sleep(300);
        return { toast: this.toast(), crop: this.overlayOpen("bgCropOverlay"),
                 added: galleryFor(ADDCOIN_GALLERY_ID).length - before,
                 graph: this.graphCalls, fetches: this.fetches };
      },
    };
  }, { TOAST });

  // ---------- A. Add Coin's Files route, as rendered ----------------------
  const A = await page.evaluate(() => {
    __fp.freshAddCoin();
    const attrs = (el) => el ? { accept: el.getAttribute("accept"), capture: el.hasAttribute("capture") } : null;
    const trig = __fp.slotTrigger(/Obverse &/, 0);
    trig.click();
    const labels = [...document.querySelectorAll("#imageSourceChooser .image-chooser-btn")].map(b => b.textContent.replace(/\s+/g, " ").trim());
    closeImageSourceChooser();
    return {
      files: attrs(document.getElementById("imageChooserFilesInput")),
      labels,
      addCoinInputs: [...document.querySelectorAll('#view-addcoin input[type="file"]')].map(i => i.id),
      constant: FILES_PICKER_ACCEPT,
      addSetGalFiles: document.querySelectorAll('#addSetGallery input[data-role="files"], #addSetChildRefGallery input[data-role="files"]').length,
      addSetGalLabels: [...document.querySelectorAll("#addSetGallery .gc-add-btn")].map(b => b.textContent.trim()),
      filesInputsOutsideChooser: [...document.querySelectorAll('input[type="file"]')].filter(i =>
        /application\/pdf/.test(i.accept) && !/receipt/i.test(i.id) && !i.closest("#imageSourceChooser")).length,
      chooserFilesInputs: document.querySelectorAll('#imageSourceChooser input[accept="image/*,application/pdf"]').length,
    };
  });
  ok(A.files && A.files.accept === "image/*,application/pdf" && !A.files.capture,
    "A2 Add Coin's Files route is the chooser's Files input: accept exact, no capture");
  ok(JSON.stringify(A.addCoinInputs) === JSON.stringify(["receiptCameraInput", "receiptLibraryInput"]),
    "A3 Add Coin has no photo file inputs of its own any more, only the receipt's: " + JSON.stringify(A.addCoinInputs));
  ok(A.constant === "image/*,application/pdf", "A5 FILES_PICKER_ACCEPT is exactly image/*,application/pdf");
  ok(A.labels.length === 3 && /Camera/.test(A.labels[0]) && /Library/.test(A.labels[1]) && /Files/.test(A.labels[2]),
    "A6 Add Coin's Obverse \"+\" offers Camera / Library / Files: " + JSON.stringify(A.labels));
  ok(A.addSetGalFiles === 0 && JSON.stringify(A.addSetGalLabels) === JSON.stringify(["📷 Take photo", "🖼️ Choose photo"]),
    "A8 Add Set's gallery is unchanged (no Files button, original labels): " + JSON.stringify(A.addSetGalLabels));
  ok(A.filesInputsOutsideChooser === 0 && A.chooserFilesInputs === 1,
    "A9 the only Files-style input is the shared chooser's (receipts excepted): " + JSON.stringify([A.filesInputsOutsideChooser, A.chooserFilesInputs]));

  // ---------- D. JPEG through Files == JPEG through Library ---------------
  const D = await page.evaluate(async () => {
    __fp.installCounters();
    const blob = await __fp.jpeg();
    __fp.freshAddCoin();
    const viaLib = await __fp.pickAndFinish(__fp.slotTrigger(/Obverse &/, 0), "library", __fp.file("jpeg", blob));
    __fp.freshAddCoin();
    const viaFiles = await __fp.pickAndFinish(__fp.slotTrigger(/Obverse &/, 0), "files", __fp.file("jpeg", blob));
    __fp.freshAddCoin();
    const revFiles = await __fp.pickAndFinish(__fp.slotTrigger(/Obverse &/, 1), "files", __fp.file("jpeg", blob));
    return { viaLib, viaFiles, revFiles, toast: __fp.toast(), graph: __fp.graphCalls, fetches: __fp.fetches };
  });
  ok(D.viaLib.stage1 && D.viaLib.stage2, "D1 control: a JPEG through Library opens both crop stages");
  ok(D.viaFiles.stage1 && D.viaFiles.stage2, "D2 a JPEG through Files opens both crop stages");
  const same = ["title", "type", "filename", "rawFilename", "blobType", "hasCircle", "preview"]
    .every(k => D.viaLib[k] === D.viaFiles[k]);
  ok(same, "D3 Files produces the same entry as Library (type, filenames, JPEG blob, circle, preview): " +
    JSON.stringify({ lib: D.viaLib, files: D.viaFiles }));
  ok(D.viaFiles.blobType === "image/jpeg" && D.viaFiles.type === "obverse", "D4 the stored crop is a JPEG obverse entry");
  ok(D.revFiles.stage1 && /Crop — Reverse/.test(D.revFiles.title || "") && D.revFiles.type === "reverse",
    "D5 Files from the Reverse slot runs the reverse crop: " + JSON.stringify(D.revFiles));
  ok(D.toast === "", "D6 a good JPEG shows no refusal toast");
  ok(D.graph === 0 && D.fetches === 0, "H1 picking and cropping on Add Coin sends no Graph request before Save: " +
    JSON.stringify({ graph: D.graph, fetches: D.fetches }));

  // ---------- E. Refused files ---------------------------------------------
  const E = await page.evaluate(async () => {
    __fp.installCounters();
    const out = {};
    const obv = () => __fp.slotTrigger(/Obverse &/, 0);
    __fp.freshAddCoin();
    out.pdfFiles = await __fp.refused(obv(), "files", __fp.file("pdf"));
    __fp.freshAddCoin();
    out.brokenFiles = await __fp.refused(obv(), "files", __fp.file("broken"));
    __fp.freshAddCoin();
    out.heicFiles = await __fp.refused(obv(), "files", __fp.file("heic"));
    __fp.freshAddCoin();
    out.brokenLib = await __fp.refused(obv(), "library", __fp.file("broken"));
    __fp.freshAddCoin();
    out.pdfLib = await __fp.refused(obv(), "library", __fp.file("pdf"));
    // A non-coin photo: the Holder front's "+".
    __fp.freshAddCoin();
    out.galPdf = await __fp.refused(__fp.slotTrigger(/Holder/, 0), "files", __fp.file("pdf"));
    out.typeChosen = true;
    out.decodes = {
      jpeg: await isPickableImage(__fp.file("jpeg", await __fp.jpeg())),
      pdf: await isPickableImage(__fp.file("pdf")), broken: await isPickableImage(__fp.file("broken")),
      heic: await isPickableImage(__fp.file("heic")), none: await isPickableImage(null),
    };
    return out;
  });
  const refusedOk = (r) => r && r.toast === TOAST && !r.crop && r.added === 0;
  ok(refusedOk(E.pdfFiles), "E1 a PDF through Files: toast, no crop screen, nothing added: " + JSON.stringify(E.pdfFiles));
  ok(refusedOk(E.brokenFiles), "E2 broken JPEG bytes through Files are refused: " + JSON.stringify(E.brokenFiles));
  ok(refusedOk(E.heicFiles), "E3 an undecodable HEIC through Files is refused: " + JSON.stringify(E.heicFiles));
  ok(refusedOk(E.brokenLib), "E4 the guard covers Library too (broken JPEG): " + JSON.stringify(E.brokenLib));
  ok(refusedOk(E.pdfLib), "E5 a PDF forced onto Library is refused: " + JSON.stringify(E.pdfLib));
  ok(E.typeChosen && refusedOk(E.galPdf), "E6 the Holder slot: a PDF through Files is refused: " + JSON.stringify(E.galPdf));
  ok(E.galPdf.graph === 0 && E.galPdf.fetches === 0, "E7 refused picks made zero Graph requests");
  ok(E.decodes.jpeg === true && !E.decodes.pdf && !E.decodes.broken && !E.decodes.heic && !E.decodes.none,
    "E8 isPickableImage: JPEG yes; PDF, broken, HEIC, null no: " + JSON.stringify(E.decodes));

  // ---------- F. Control: main's handler on the same PDF -------------------
  // Main's Library handler called runCropPipeline() -> openBgCrop() with no
  // check and no catch. Driven directly (with a catch, so the rejection is
  // observed rather than escaping as a page error), it shows today's failure.
  const F = await page.evaluate(async () => {
    __fp.freshAddCoin();
    let rejected = false;
    try { await openBgCrop(__fp.file("pdf"), { title: "Crop — Obverse", aspectLock: true }); }
    catch (e) { rejected = true; }
    return { rejected, crop: __fp.overlayOpen("bgCropOverlay"), toast: __fp.toast() };
  });
  ok(F.rejected && !F.crop && F.toast === "",
    "F1 control: main's handler on a PDF rejects silently — no crop screen and no message: " + JSON.stringify(F));

  // ---------- G. Receipt slots unchanged ----------------------------------
  const G = await page.evaluate(async () => {
    __fp.freshAddCoin();
    const lib = document.getElementById("receiptLibraryInput");
    __fp.pick(lib, __fp.file("pdf"));
    await __fp.waitFor(() => !!receiptFiles["receiptPreview"], 3000);
    const r = receiptFiles["receiptPreview"];
    return { accept: lib.getAttribute("accept"), attached: !!r && r.sourceWasPdf === true, toast: __fp.toast(),
             filesBtn: !!document.querySelector("#view-addcoin #receiptFilesBtn") };
  });
  ok(G.accept === "image/*,application/pdf" && G.attached && G.toast === "" && !G.filesBtn,
    "G1 Add Coin's receipt still accepts and attaches a PDF, unguarded, with no Files button: " + JSON.stringify(G));

  // ---------- I. Layout: one line, no sideways scroll ----------------------
  for (const vp of [{ width: 360, height: 780 }, PHONE, TABLET]) {
    const p = vp === PHONE ? page : await openApp(vp);
    const L = await p.evaluate(() => {
      const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
      navigate("addcoin");
      const body = document.getElementById("addCoinPhotosBody");
      if (body.classList.contains("hidden")) document.getElementById("addCoinPhotosHeader").click();
      const row = (el) => {
        const kids = [...el.children].filter(k => k.offsetParent !== null);
        return { lines: new Set(kids.map(k => Math.round(k.getBoundingClientRect().top))).size, count: kids.length,
                 overflow: el.scrollWidth > el.clientWidth, clipped: kids.filter(k => k.scrollWidth > k.clientWidth).length,
                 right: el.getBoundingClientRect().right };
      };
      // Add Coin moved onto Edit Coin's photo section (claude/addcoin-shared-
      // photos, commit 3): the 📷 🖼️ 📁 rows and the old gallery are retired.
      // Every "+" opens the shared chooser; its Camera / Library / Files
      // buttons are the row to check now.
      const host = document.getElementById("addCoinPhotoSections");
      const h = [...host.querySelectorAll(".accordion-header")].find(x => /Obverse &/.test(x.textContent));
      if (h.getAttribute("aria-expanded") !== "true") h.click();
      const out = { legacyRows: [...document.querySelectorAll("#view-addcoin .photo-btns, #view-addcoin .gc-add-row")]
        .filter(e => e.offsetParent !== null).length };
      h.nextElementSibling.querySelector('[data-act="add"]').click();
      const btns = [...document.querySelectorAll('#imageSourceChooser .image-chooser-btn')].filter(k => k.offsetParent !== null);
      out.chooser = { count: btns.length, labels: btns.map(b => b.textContent.replace(/\s+/g, " ").trim()),
        clipped: btns.filter(b => b.scrollWidth > b.clientWidth).length,
        onScreen: btns.every(b => b.getBoundingClientRect().right <= window.innerWidth && b.getBoundingClientRect().left >= 0) };
      closeImageSourceChooser();
      out.pageScroll = document.documentElement.scrollWidth > window.innerWidth;
      out.inner = window.innerWidth;
      return out;
    });
    const tag = vp.width + "x" + vp.height;
    const good = (r, n) => r.count === n && r.lines === 1 && !r.overflow && r.clipped === 0 && r.right <= L.inner;
    ok(L.legacyRows === 0, `I1 ${tag}: Add Coin shows no 📷 🖼️ 📁 rows any more (retired with the preview card): ` + L.legacyRows);
    ok(L.chooser.count === 3 && /Camera/.test(L.chooser.labels[0]) && /Library/.test(L.chooser.labels[1]) && /Files/.test(L.chooser.labels[2]) &&
       L.chooser.clipped === 0 && L.chooser.onScreen,
      `I2 ${tag}: Add Coin's "+" opens Camera / Library / Files, every label whole and on screen: ` + JSON.stringify(L.chooser));
    ok(!L.pageScroll, `I3 ${tag}: no sideways page scroll`);
    if (p !== page) await p.close();
  }
}, module);
