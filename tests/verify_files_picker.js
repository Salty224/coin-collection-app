// Add Coin: the 📁 Files button and the "isn't a photo" guard.
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
  ["obverseCameraInput", "image/*", "environment"],
  ["obverseLibraryInput", "image/*", "-"],
  ["reverseCameraInput", "image/*", "environment"],
  ["reverseLibraryInput", "image/*", "-"],
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
const NEW_INPUTS = {
  obverseFilesInput: FILES_ACCEPT,
  reverseFilesInput: FILES_ACCEPT,
  "role:files": "${FILES_PICKER_ACCEPT}",
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
  const appExisting = appInputs.filter(r => !(r[0] in NEW_INPUTS));
  const appNew = appInputs.filter(r => r[0] in NEW_INPUTS);
  ok(MAIN_APP_INPUTS.length + MAIN_STAGE_INPUTS.length === 42,
    "B0 the pinned list covers 42 pre-existing inputs (34 app.html + 8 stage.html)");
  ok(JSON.stringify(appExisting) === JSON.stringify(MAIN_APP_INPUTS),
    "B1 every pre-existing app.html file input keeps its exact accept and capture: " +
    JSON.stringify(appExisting.filter((r, i) => JSON.stringify(r) !== JSON.stringify(MAIN_APP_INPUTS[i]))));
  ok(JSON.stringify(stageInputs) === JSON.stringify(MAIN_STAGE_INPUTS),
    "B2 stage.html's 8 file inputs are unchanged");
  ok(appInputs.length === 37 && appNew.length === 3,
    "B3 app.html has exactly the 3 new inputs on top of the 34: " + appInputs.length);
  const cams = appInputs.concat(stageInputs).filter(r => /camera|cam\b|cam-input/i.test(r[0]));
  ok(cams.length === 21 && cams.every(r => r[2] === "environment" && r[1] === "image/*"),
    "C1 all 21 camera inputs still have accept image/* and capture=environment");
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
        this.clearToast();
      },
      // Runs a pick through Stage 1 and Stage 2 to a finished entry.
      async pickAndFinish(input, file) {
        this.pick(input, file);
        if (!(await this.waitFor(() => this.overlayOpen("bgCropOverlay")))) return { stage1: false };
        const title = document.getElementById("bgCropTitle").textContent;
        document.getElementById("bgCropUseBtn").click();
        const stage2 = await this.waitFor(() => this.overlayOpen("photoAdjustOverlay"));
        if (stage2) document.getElementById("photoAdjustUseBtn").click();
        await this.waitFor(() => galleryFor(ADDCOIN_GALLERY_ID).length > 0);
        const e = galleryFor(ADDCOIN_GALLERY_ID).slice(-1)[0] || {};
        return { stage1: true, title, stage2, type: e.type, filename: e.filename, rawFilename: e.rawFilename,
                 blobType: e.blob && e.blob.type, hasCircle: !!e.circleUrl,
                 preview: document.getElementById("obversePreview").style.display };
      },
      // Picks a refused file and reports what the screen did.
      async refused(input, file) {
        const before = galleryFor(ADDCOIN_GALLERY_ID).length;
        this.pick(input, file);
        await this.waitFor(() => this.toast() !== "", 3000);
        await sleep(300);
        return { toast: this.toast(), crop: this.overlayOpen("bgCropOverlay"),
                 added: galleryFor(ADDCOIN_GALLERY_ID).length - before,
                 graph: this.graphCalls, fetches: this.fetches };
      },
    };
  }, { TOAST });

  // ---------- A. The new Files inputs, as rendered ------------------------
  const A = await page.evaluate(() => {
    __fp.freshAddCoin();
    const attrs = (el) => el ? { accept: el.getAttribute("accept"), capture: el.hasAttribute("capture"), shown: el.offsetParent !== null } : null;
    const gal = document.getElementById("addCoinGallery");
    const btnText = (id) => { const b = document.getElementById(id); return b ? b.textContent.trim() : null; };
    return {
      obv: attrs(document.getElementById("obverseFilesInput")),
      rev: attrs(document.getElementById("reverseFilesInput")),
      gal: attrs(gal.querySelector('input[data-role="files"]')),
      obvBtn: btnText("obverseFilesBtn"), obvBtnTitle: document.getElementById("obverseFilesBtn").title,
      galBtn: (gal.querySelector('[data-role="add-files"]') || {}).textContent,
      galLabels: [...gal.querySelectorAll(".gc-add-btn")].map(b => b.textContent.trim()),
      constant: FILES_PICKER_ACCEPT,
      // Opt-in: every other gallery and pair slot is untouched.
      addSetGalFiles: document.querySelectorAll('#addSetGallery input[data-role="files"], #addSetChildRefGallery input[data-role="files"]').length,
      addSetGalLabels: [...document.querySelectorAll("#addSetGallery .gc-add-btn")].map(b => b.textContent.trim()),
      filesInputsOutsideAddCoin: [...document.querySelectorAll('input[type="file"]')].filter(i =>
        /application\/pdf/.test(i.accept) && !/receipt/i.test(i.id) && !i.closest("#view-addcoin")).length,
    };
  });
  ok(A.obv && A.obv.accept === "image/*,application/pdf" && !A.obv.capture, "A2 Obverse Files input: accept exact, no capture");
  ok(A.rev && A.rev.accept === "image/*,application/pdf" && !A.rev.capture, "A3 Reverse Files input: accept exact, no capture");
  ok(A.gal && A.gal.accept === "image/*,application/pdf" && !A.gal.capture, "A4 Add photo gallery Files input: accept exact, no capture");
  ok(A.constant === "image/*,application/pdf", "A5 FILES_PICKER_ACCEPT is exactly image/*,application/pdf");
  ok(A.obvBtn === "📁" && A.obvBtnTitle === "Files", "A6 Obverse slot shows the 📁 button titled Files");
  ok(A.galBtn === "📁 Files" && JSON.stringify(A.galLabels) === JSON.stringify(["📷 Camera", "🖼️ Library", "📁 Files"]),
    "A7 Add photo row reads 📷 Camera / 🖼️ Library / 📁 Files: " + JSON.stringify(A.galLabels));
  ok(A.addSetGalFiles === 0 && JSON.stringify(A.addSetGalLabels) === JSON.stringify(["📷 Take photo", "🖼️ Choose photo"]),
    "A8 Add Set's gallery is unchanged (no Files button, original labels): " + JSON.stringify(A.addSetGalLabels));
  ok(A.filesInputsOutsideAddCoin === 0, "A9 no Files-style input exists outside Add Coin (receipts excepted)");

  // ---------- D. JPEG through Files == JPEG through Library ---------------
  const D = await page.evaluate(async () => {
    __fp.installCounters();
    const blob = await __fp.jpeg();
    __fp.freshAddCoin();
    const viaLib = await __fp.pickAndFinish(document.getElementById("obverseLibraryInput"), __fp.file("jpeg", blob));
    __fp.freshAddCoin();
    const viaFiles = await __fp.pickAndFinish(document.getElementById("obverseFilesInput"), __fp.file("jpeg", blob));
    __fp.freshAddCoin();
    document.getElementById("showReverseBtn").click();
    const revFiles = await __fp.pickAndFinish(document.getElementById("reverseFilesInput"), __fp.file("jpeg", blob));
    return { viaLib, viaFiles, revFiles, toast: __fp.toast(), graph: __fp.graphCalls, fetches: __fp.fetches };
  });
  ok(D.viaLib.stage1 && D.viaLib.stage2, "D1 control: a JPEG through Library opens both crop stages");
  ok(D.viaFiles.stage1 && D.viaFiles.stage2, "D2 a JPEG through Files opens both crop stages");
  const same = ["title", "type", "filename", "rawFilename", "blobType", "hasCircle", "preview"]
    .every(k => D.viaLib[k] === D.viaFiles[k]);
  ok(same, "D3 Files produces the same entry as Library (type, filenames, JPEG blob, circle, preview): " +
    JSON.stringify({ lib: D.viaLib, files: D.viaFiles }));
  ok(D.viaFiles.blobType === "image/jpeg" && D.viaFiles.type === "obverse", "D4 the stored crop is a JPEG obverse entry");
  ok(D.revFiles.stage1 && /Reverse/.test(D.revFiles.title || "") && D.revFiles.type === "reverse",
    "D5 Reverse's Files button runs the reverse crop: " + JSON.stringify(D.revFiles));
  ok(D.toast === "", "D6 a good JPEG shows no refusal toast");
  ok(D.graph === 0 && D.fetches === 0, "H1 picking and cropping on Add Coin sends no Graph request before Save: " +
    JSON.stringify({ graph: D.graph, fetches: D.fetches }));

  // ---------- E. Refused files ---------------------------------------------
  const E = await page.evaluate(async () => {
    __fp.installCounters();
    const out = {};
    __fp.freshAddCoin();
    out.pdfFiles = await __fp.refused(document.getElementById("obverseFilesInput"), __fp.file("pdf"));
    __fp.freshAddCoin();
    out.brokenFiles = await __fp.refused(document.getElementById("obverseFilesInput"), __fp.file("broken"));
    __fp.freshAddCoin();
    out.heicFiles = await __fp.refused(document.getElementById("obverseFilesInput"), __fp.file("heic"));
    __fp.freshAddCoin();
    out.brokenLib = await __fp.refused(document.getElementById("obverseLibraryInput"), __fp.file("broken"));
    __fp.freshAddCoin();
    out.pdfLib = await __fp.refused(document.getElementById("obverseLibraryInput"), __fp.file("pdf"));
    // The gallery: pick a type first, as a person does, then the file.
    __fp.freshAddCoin();
    const gal = document.getElementById("addCoinGallery");
    gal.querySelector('[data-role="add-files"]').click();
    const item = [...document.querySelectorAll(".gtp-item")].find(b => /Slab/.test(b.textContent));
    if (item) item.click();
    out.galPdf = await __fp.refused(gal.querySelector('input[data-role="files"]'), __fp.file("pdf"));
    out.typeChosen = !!item;
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
  ok(refusedOk(E.brokenLib), "E4 the guard covers the existing 🖼️ Library input too (broken JPEG): " + JSON.stringify(E.brokenLib));
  ok(refusedOk(E.pdfLib), "E5 a PDF forced onto 🖼️ Library is refused: " + JSON.stringify(E.pdfLib));
  ok(E.typeChosen && refusedOk(E.galPdf), "E6 Add photo gallery: a PDF through Files is refused: " + JSON.stringify(E.galPdf));
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
      const out = { obv: row(document.querySelector("#obversePhotoBox .photo-btns")) };
      document.getElementById("showReverseBtn").click();
      out.rev = row(document.querySelector("#reversePhotoBox .photo-btns"));
      out.gal = row(document.querySelector("#addCoinGallery .gc-add-row"));
      out.pageScroll = document.documentElement.scrollWidth > window.innerWidth;
      out.inner = window.innerWidth;
      return out;
    });
    const tag = vp.width + "x" + vp.height;
    const good = (r, n) => r.count === n && r.lines === 1 && !r.overflow && r.clipped === 0 && r.right <= L.inner;
    ok(good(L.obv, 3) && good(L.rev, 3), `I1 ${tag}: Obverse and Reverse rows (📷 🖼️ 📁) are one line: ` + JSON.stringify([L.obv, L.rev]));
    ok(good(L.gal, 3), `I2 ${tag}: Add photo row (Camera / Library / Files) is one line, no clipped label: ` + JSON.stringify(L.gal));
    ok(!L.pageScroll, `I3 ${tag}: no sideways page scroll`);
    if (p !== page) await p.close();
  }
}, module);
