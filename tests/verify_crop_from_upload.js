// Crop from an uploaded photo (Edit Coin / Manage Photos, coins only).
//
// WHY. On Ray's phone the file picker opens Google Photos only, so a photo
// already in OneDrive for a coin could not be reached again to crop a better
// obverse/reverse out of it. This flow starts from the coin's own STORED
// photos — no file input — and saves through the ordinary gallery commit.
//
// What must hold, and which block proves it:
//   A  the entry point exists, coins only, only when a save is possible, and
//      contains no <input type=file>
//   B  the destination is chosen first; Cancel writes nothing
//   C  a first obverse crop is {ID}_obverse_cropped.jpg, no _original, the
//      source file and its row untouched
//   D  replacing asks first; an existing _cropped file is never overwritten
//      (_cropped_02 instead); a legacy {ID}_obverse.jpg is never touched
//   E  an extra image takes the next FREE _reference_NN, including past a
//      file that has no Photos row
//   F  the shared Camera/Library numbering fix (pre-existing bug)
//   G  nothing is written with the photo write flag off

const { defineSuite } = require("./harness");

const HEADERS = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded"];
const ID = "AY-00004"; // in FAKE_COINS, no FAKE_GALLERIES seed

module.exports = defineSuite("crop-from-upload", async ({ ok, openApp, PHONE, TABLET }) => {
  const page = await openApp(PHONE);

  // In-page helpers, defined once.
  await page.evaluate((args) => {
    const { HEADERS, ID } = args;
    const DIR = () => writePaths().coinPhotos + "/";
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    window.__cfu = {
      ID,
      async jpeg(color) {
        const c = document.createElement("canvas"); c.width = 400; c.height = 300;
        const x = c.getContext("2d"); x.fillStyle = color; x.fillRect(0, 0, 400, 300);
        x.fillStyle = "#000"; x.beginPath(); x.arc(200, 150, 100, 0, Math.PI * 2); x.fill();
        return await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
      },
      // rows: [{photoId, type, galleryType, filename, label}]; files: names that
      // exist in CoinPhotos (rowless ones included).
      async setup(rows, files) {
        const sheet = [HEADERS.slice()];
        rows.forEach(r => sheet.push([r.photoId, ID, r.type, "", r.filename, r.label || "", 46000]));
        for (let i = 0; i < 8; i++) sheet.push(new Array(HEADERS.length).fill(""));
        const mock = createMockGraphClient({ sheets: { Photos: sheet } });
        __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest();
        __setAddCoinWriteEnabledForTest(true);
        __resetCoinPhotoCacheForTest();
        const originals = {};
        for (const name of files) {
          const b = await this.jpeg("#" + (Math.abs(name.length * 2654435761) % 0xffffff).toString(16).padStart(6, "0"));
          await mock.uploadFile(DIR() + name, b);
          originals[name] = b;
          __setCoinPhotoCacheForTest(name, URL.createObjectURL(b));
        }
        __setStoredPhotosForTest({
          [ID]: rows.map(r => ({ photoId: r.photoId, photoType: r.type, galleryType: r.galleryType,
                                 subGroupId: "", filename: r.filename, originalFilename: "", label: r.label || "" }))
        });
        delete galleryStore[ID];
        const uploads = [];
        const realUpload = mock.uploadFile.bind(mock);
        mock.uploadFile = (path, f) => { uploads.push(path); return realUpload(path, f); };
        const deletes = [];
        const realDelete = mock.deleteItem.bind(mock);
        mock.deleteItem = (path) => { deletes.push(path); return realDelete(path); };
        this.mock = mock; this.originals = originals; this.uploads = uploads; this.deletes = deletes;
        return mock;
      },
      teardown() {
        document.getElementById("writeGuardOverlay").classList.add("hidden");
        document.getElementById("writeGuardBtns").innerHTML = "";
        delete galleryStore[ID];
        __setStoredPhotosForTest(null); __resetCoinPhotoCacheForTest();
        __setAddCoinWriteEnabledForTest(null);
      },
      render(kind) {
        renderManagePhotosInto("managePhotosSections", { id: ID, name: "Test coin", meta: ID, kind: kind || "coin" });
        return document.getElementById("managePhotosSections");
      },
      cropHeader(host) {
        return [...host.querySelectorAll(".accordion-header")]
          .find(h => /Crop from another photo/.test(h.textContent)) || null;
      },
      openCropSection(host) {
        const h = this.cropHeader(host);
        if (!h) return null;
        if (h.getAttribute("aria-expanded") !== "true") h.click();
        return h.nextElementSibling;
      },
      guardOpen() { return !document.getElementById("writeGuardOverlay").classList.contains("hidden"); },
      guardTitle() { return this.guardOpen() ? document.getElementById("writeGuardTitle").textContent : ""; },
      guardButtons() { return [...document.querySelectorAll("#writeGuardBtns button")].map(b => b.textContent); },
      clickGuard(label) {
        const b = [...document.querySelectorAll("#writeGuardBtns button")].find(x => x.textContent === label);
        if (!b) return false; b.click(); return true;
      },
      async drive() {
        for (let i = 0; i < 100 && !bgCropState; i++) await sleep(20);
        if (!bgCropState) return { stage1: false, stage2: false };
        document.getElementById("bgCropUseBtn").click();
        let stage2 = false;
        for (let i = 0; i < 30; i++) {
          await sleep(20);
          if (photoAdjustState) { stage2 = true; document.getElementById("photoAdjustUseBtn").click(); break; }
        }
        return { stage1: true, stage2 };
      },
      async settle(predicate) {
        for (let i = 0; i < 150; i++) { if (predicate()) return true; await sleep(20); }
        return false;
      },
      // Tap a source tile, pick a destination, confirm if asked, crop.
      async flow(srcFilename, destLabel) {
        const host = this.render();
        const body = this.openCropSection(host);
        const tile = body && body.querySelector('.crop-src-tile[data-filename="' + srcFilename + '"]');
        const out = { tile: !!tile, chooserTitle: "", chooserButtons: [], confirmTitle: "", confirmBody: "" };
        if (!tile) return out;
        tile.click();
        out.chooserTitle = this.guardTitle();
        out.chooserButtons = this.guardButtons();
        if (!this.clickGuard(destLabel)) return out;
        await sleep(30);
        if (this.guardOpen()) {
          out.confirmTitle = this.guardTitle();
          out.confirmBody = document.getElementById("writeGuardBody").textContent;
          this.clickGuard("Crop and replace");
        }
        const before = this.uploads.length;
        out.stages = await this.drive();
        out.settled = await this.settle(() => this.uploads.length > before &&
          !galleryFor(ID).some(e => e.uploadPending));
        await sleep(30);
        out.newUploads = this.uploads.slice(before);
        out.toast = document.getElementById("toast").textContent;
        return out;
      },
      fileIntact(name) {
        const e = this.mock._store.get(DIR() + name);
        return !!e && e.value === this.originals[name];
      },
      exists(name) { return this.mock._store.has(DIR() + name); },
      rows() { return this.mock._grids.Photos.filter(r => r[1] === ID).map(r => ({ id: r[0], type: r[2], file: r[4] })); },
      dir: DIR
    };
  }, { HEADERS, ID });

  // ---------- A. Entry point -------------------------------------------
  const A = await page.evaluate(async () => {
    const c = window.__cfu;
    await c.setup([
      { photoId: "PH-00101", type: "Obverse", galleryType: "obverse", filename: c.ID + "_obverse.jpg" },
      { photoId: "PH-00102", type: "Reverse", galleryType: "reverse", filename: c.ID + "_reverse.jpg" },
      { photoId: "PH-00103", type: "Slab_Obverse", galleryType: "slab_obverse", filename: c.ID + "_slab_obverse.jpg" },
      { photoId: "PH-00104", type: "Slab_Reverse", galleryType: "slab_reverse", filename: c.ID + "_slab_reverse.jpg" },
      { photoId: "PH-00105", type: "Reference", galleryType: "reference", filename: c.ID + "_reference_01.jpg" },
      { photoId: "PH-00106", type: "Other", galleryType: "other", filename: c.ID + "_other_01.jpg" }
    ], [c.ID + "_obverse.jpg", c.ID + "_reverse.jpg", c.ID + "_slab_obverse.jpg",
        c.ID + "_slab_reverse.jpg", c.ID + "_reference_01.jpg", c.ID + "_other_01.jpg"]);
    const host = c.render();
    const headers = [...host.querySelectorAll(".accordion-header > span:first-child")].map(s => s.textContent);
    const body = c.openCropSection(host);
    const tiles = body ? [...body.querySelectorAll(".crop-src-tile")] : [];
    const out = {
      first: headers[0] || "",
      tileNames: tiles.map(t => t.dataset.filename),
      tilesAreButtons: tiles.length > 0 && tiles.every(t => t.tagName === "BUTTON"),
      fileInputsInSection: body ? body.querySelectorAll('input[type="file"]').length : -1,
      tileBgs: tiles.filter(t => /url\(/.test(t.querySelector(".gc-img").style.backgroundImage)).length
    };
    // Flag off: the section is not offered at all.
    __setAddCoinWriteEnabledForTest(false);
    out.offWhenFlagOff = !c.cropHeader(c.render());
    __setAddCoinWriteEnabledForTest(true);
    // Sets never get it.
    out.notOnSets = !c.cropHeader(c.render("set"));
    c.teardown();
    return out;
  });
  ok(/Crop from another photo/.test(A.first), "A1 the crop section is the first Photos section on a coin");
  // Sources (Ray, 22 Oct 2026): Holder front/back, Reference and Other.
  ok(A.tileNames.length === 4, "A2 it lists exactly the four source types (holder ×2, reference, other)");
  ok(A.tileNames.some(n => /_other_/.test(n)), "A3 an 'Other' photo IS offered as a source");
  ok(!A.tileNames.some(n => /^AY-\d+_(obverse|reverse)\.jpg$/.test(n)), "A3b Front and Back are not offered as sources (Recrop covers them)");
  ok(A.tilesAreButtons, "A4 each source is a plain button");
  ok(A.fileInputsInSection === 0, "A5 NO file input anywhere in the crop section");
  ok(A.tileBgs === 4, "A6 every tile shows its stored photo");
  ok(A.offWhenFlagOff, "A7 the section is hidden when the photo write flag is off");
  ok(A.notOnSets, "A8 Sets do not get the section");

  // ---------- B. Destination first; Cancel writes nothing --------------
  const B = await page.evaluate(async () => {
    const c = window.__cfu;
    await c.setup([{ photoId: "PH-00103", type: "Slab_Obverse", galleryType: "slab_obverse", filename: c.ID + "_slab_obverse.jpg" }],
      [c.ID + "_slab_obverse.jpg"]);
    const host = c.render();
    const body = c.openCropSection(host);
    body.querySelector(".crop-src-tile").click();
    const out = { title: c.guardTitle(), buttons: c.guardButtons(), cropOpenBefore: !!bgCropState };
    c.clickGuard("Cancel");
    await new Promise(r => setTimeout(r, 100));
    out.cropOpenAfter = !!bgCropState;
    out.uploads = c.uploads.length;
    out.guardClosed = !c.guardOpen();
    c.teardown();
    return out;
  });
  ok(B.title === "Crop this photo into…", "B1 tapping a source asks where the crop goes before cropping");
  ok(JSON.stringify(B.buttons) === JSON.stringify(["Front", "Back", "Reference", "Cancel"]),
    "B2 the choices are Front, Back, Reference, Cancel");
  ok(!B.cropOpenBefore && !B.cropOpenAfter, "B3 the crop tool does not open until a destination is picked");
  ok(B.uploads === 0 && B.guardClosed, "B4 Cancel writes nothing");

  // ---------- C. First obverse crop, from a slab photo -----------------
  const C = await page.evaluate(async () => {
    const c = window.__cfu;
    const slab = c.ID + "_slab_obverse.jpg";
    await c.setup([{ photoId: "PH-00103", type: "Slab_Obverse", galleryType: "slab_obverse", filename: slab }], [slab]);
    const r = await c.flow(slab, "Front");
    const rows = c.rows();
    const out = Object.assign(r, {
      cropped: c.exists(c.ID + "_obverse_cropped.jpg"),
      original: c.exists(c.ID + "_obverse_original.jpg"),
      sourceIntact: c.fileIntact(slab),
      sourceRow: rows.find(x => x.id === "PH-00103") || null,
      obvRow: rows.find(x => x.type === "Obverse") || null,
      deletes: c.deletes.length
    });
    c.teardown();
    return out;
  });
  ok(C.tile && C.confirmTitle === "", "C1 no confirmation when the coin has no obverse yet");
  ok(C.stages && C.stages.stage1 && C.stages.stage2, "C2 the existing crop tool runs: square crop, then the circle step");
  ok(C.settled && C.cropped, "C3 saved as the standard {ID}_obverse_cropped.jpg on a first crop");
  ok(!C.original && !(C.newUploads || []).some(p => /_original/.test(p)), "C4 no _original copy is written");
  ok(C.sourceIntact, "C5 the source photo's file is unchanged");
  ok(C.sourceRow && C.sourceRow.file === "AY-00004_slab_obverse.jpg" && C.sourceRow.type === "Slab_Obverse",
    "C6 the source photo's Photos row is unchanged");
  ok(C.obvRow && C.obvRow.file === "AY-00004_obverse_cropped.jpg", "C7 a new Obverse row points at the crop");
  ok(C.deletes === 0, "C8 nothing is deleted");
  ok(/later Recrop works from this cropped image/.test(C.toast || ""), "C9 the toast says a later Recrop works from the cropped image");

  // ---------- D. Replacing: confirm first, never overwrite -------------
  const D = await page.evaluate(async () => {
    const c = window.__cfu;
    const slab = c.ID + "_slab_obverse.jpg";
    const crop1 = c.ID + "_obverse_cropped.jpg";
    const legacyRev = c.ID + "_reverse.jpg";
    await c.setup([
      { photoId: "PH-00101", type: "Obverse", galleryType: "obverse", filename: crop1 },
      { photoId: "PH-00102", type: "Reverse", galleryType: "reverse", filename: legacyRev },
      { photoId: "PH-00103", type: "Slab_Obverse", galleryType: "slab_obverse", filename: slab }
    ], [crop1, legacyRev, slab]);
    const obv = await c.flow(slab, "Front");
    const afterObv = {
      crop1Intact: c.fileIntact(crop1),
      crop2: c.exists(c.ID + "_obverse_cropped_02.jpg"),
      obvRow: c.rows().find(x => x.type === "Obverse") || null,
      obvRows: c.rows().filter(x => x.type === "Obverse").length
    };
    const rev = await c.flow(slab, "Back");
    const out = {
      obv, rev, afterObv,
      legacyIntact: c.fileIntact(legacyRev),
      revCropped: c.exists(c.ID + "_reverse_cropped.jpg"),
      revRow: c.rows().find(x => x.type === "Reverse") || null,
      slabIntact: c.fileIntact(slab),
      deletes: c.deletes.length,
      uploadsOverExisting: c.uploads.filter(p => [crop1, legacyRev, slab].some(n => p === c.dir() + n)).length
    };
    c.teardown();
    return out;
  });
  ok(D.obv.confirmTitle === "Replace the front?", "D1 replacing an existing front asks first");
  ok(/stays in OneDrive/.test(D.obv.confirmBody), "D2 and says the current file stays in OneDrive");
  ok(D.afterObv.crop1Intact, "D3 the existing {ID}_obverse_cropped.jpg is NOT overwritten");
  ok(D.afterObv.crop2, "D4 the new crop goes to {ID}_obverse_cropped_02.jpg instead");
  ok(D.afterObv.obvRow && D.afterObv.obvRow.file === "AY-00004_obverse_cropped_02.jpg" &&
     D.afterObv.obvRow.id === "PH-00101" && D.afterObv.obvRows === 1,
    "D5 the existing Obverse row is updated in place to point at the new file");
  ok(D.legacyIntact, "D6 a legacy {ID}_reverse.jpg is left untouched");
  ok(D.revCropped && D.revRow && D.revRow.file === "AY-00004_reverse_cropped.jpg",
    "D7 the Reverse row moves to the standard _reverse_cropped.jpg");
  ok(D.slabIntact, "D8 the source photo is still unchanged after two crops from it");
  ok(D.deletes === 0, "D9 no file is deleted by a replace");
  ok(D.uploadsOverExisting === 0, "D10 no upload ever lands on an existing file's name");

  // ---------- E. Extra image: next FREE _reference_NN ------------------
  const E = await page.evaluate(async () => {
    const c = window.__cfu;
    const r1 = c.ID + "_reference_01.jpg", r3 = c.ID + "_reference_03.jpg", r4 = c.ID + "_reference_04.jpg";
    // _04 exists in OneDrive with NO Photos row behind it.
    await c.setup([
      { photoId: "PH-00105", type: "Reference", galleryType: "reference", filename: r1 },
      { photoId: "PH-00107", type: "Reference", galleryType: "reference", filename: r3 }
    ], [r1, r3, r4]);
    const res = await c.flow(r1, "Reference");
    const out = Object.assign(res, {
      r5: c.exists(c.ID + "_reference_05.jpg"),
      intact: [r1, r3, r4].every(n => c.fileIntact(n)),
      refRows: c.rows().filter(x => x.type === "Reference").map(x => x.file).sort(),
      direct: {
        // The naming helper in isolation, same fixture.
        next: await nextFreeRepeatableFilename(c.ID, "reference", null)
      }
    });
    c.teardown();
    return out;
  });
  ok(E.confirmTitle === "", "E1 an extra image needs no confirmation");
  ok(E.stages && E.stages.stage1 && !E.stages.stage2, "E2 an extra image is a free crop with no circle step");
  ok(E.r5, "E3 saved as _reference_05: past the highest row (03) AND past a rowless file (04)");
  ok(E.intact, "E4 no existing _reference_NN file is overwritten");
  ok(JSON.stringify(E.refRows) === JSON.stringify(["AY-00004_reference_01.jpg", "AY-00004_reference_03.jpg", "AY-00004_reference_05.jpg"]),
    "E5 a new Reference row is added; the existing ones are untouched");
  ok(E.direct.next === "AY-00004_reference_06.jpg", "E6 the next name after that is _06");

  // ---------- F. Shared fix: Camera/Library numbering ------------------
  // Pre-existing bug: the next number was "gallery count + 1", so _01 and
  // _03 on file picked _03 and overwrote it.
  const F = await page.evaluate(async () => {
    const c = window.__cfu;
    const r1 = c.ID + "_reference_01.jpg", r3 = c.ID + "_reference_03.jpg";
    await c.setup([
      { photoId: "PH-00105", type: "Reference", galleryType: "reference", filename: r1 },
      { photoId: "PH-00107", type: "Reference", galleryType: "reference", filename: r3 }
    ], [r1, r3]);
    hydrateStoredPhotos(c.ID);
    // Exactly the name runCropPipeline builds for a third reference capture.
    const count = galleryFor(c.ID).filter(e => e.type === "reference").length;
    const built = galleryFilenameFor(c.ID, "reference", count).cropped;
    const entry = { type: "reference", url: null, rawUrl: null, blob: await c.jpeg("#3a6"), caption: "",
                    filename: built, rawFilename: null };
    await addGalleryEntryAndCommit(c.ID, entry, () => {});
    const out = { built, saved: entry.filename, r3Intact: c.fileIntact(r3), r1Intact: c.fileIntact(r1),
                  exists4: c.exists(c.ID + "_reference_04.jpg") };
    // A retry keeps the name it resolved the first time.
    entry.uploadError = "x";
    await retryGalleryPhotoCommit(c.ID, entry, () => {});
    out.retryName = entry.filename;
    c.teardown();
    return out;
  });
  ok(F.built === "AY-00004_reference_03.jpg", "F1 (setup) the old count rule really did propose _03, an existing file");
  ok(F.saved === "AY-00004_reference_04.jpg" && F.exists4, "F2 a Camera/Library reference capture now saves as _04");
  ok(F.r3Intact && F.r1Intact, "F3 the existing _01 and _03 are not overwritten");
  ok(F.retryName === "AY-00004_reference_04.jpg", "F4 a retry keeps the name it already resolved");

  // ---------- G. Nothing is written with the flag off -------------------
  const G = await page.evaluate(async () => {
    const c = window.__cfu;
    const slab = c.ID + "_slab_obverse.jpg";
    await c.setup([{ photoId: "PH-00103", type: "Slab_Obverse", galleryType: "slab_obverse", filename: slab }], [slab]);
    hydrateStoredPhotos(c.ID);
    const src = galleryFor(c.ID).find(e => e.type === "slab_obverse");
    __setAddCoinWriteEnabledForTest(false);
    const before = c.uploads.length;
    // 1. The entry point refuses.
    startCropFromUpload(c.ID, src, () => {});
    const guardShown = c.guardOpen();
    // 2. Even a crop that reached the save step writes nothing.
    await saveCropFromUpload(c.ID, "obverse", src, {
      type: "obverse", url: null, rawUrl: null, blob: await c.jpeg("#a33"), caption: "",
      filename: c.ID + "_obverse_cropped.jpg", rawFilename: null
    }, () => {});
    await new Promise(r => setTimeout(r, 100));
    const out = { guardShown, uploads: c.uploads.length - before,
                  rows: c.rows().length, toast: document.getElementById("toast").textContent };
    c.teardown();
    return out;
  });
  ok(!G.guardShown, "G1 with the flag off, tapping a source does not open the chooser");
  ok(G.uploads === 0, "G2 with the flag off, nothing is uploaded");
  ok(G.rows === 1, "G3 with the flag off, no Photos row is written");

  // ---------- H. Layout ------------------------------------------------
  for (const [label, vp] of [["phone", PHONE], ["tablet", TABLET]]) {
    const p = label === "phone" ? page : await openApp(vp);
    if (label !== "phone") {
      await p.evaluate((args) => { window.__ID = args.ID; }, { ID });
    }
    const H = await p.evaluate(async (id) => {
      navigate("managephotos");
      renderManagePhotosInto("managePhotosSections", { id, name: "Test coin", meta: id, kind: "coin" });
      return { overflow: document.documentElement.scrollWidth > window.innerWidth };
    }, ID);
    ok(!H.overflow, "H1 no horizontal overflow at " + label + " width");
  }
}, module);
