// Editing a Staging coin draft: photos, receipt and the research note
// (Phase B, plus two silent-drop fixes found while planning it).
//
// Live report (AY-00754): Ray opened a Staging draft for edit, picked slab
// photos through Files, cropped them and saved. Nothing reached Staging and
// coin.json still said "photos": []. The edit save never uploaded anything,
// and the form reset that followed deleted the picks from memory.
//
// Everything here runs against the mock Graph client. Nothing touches a real
// workbook or a real OneDrive folder.

const { defineSuite } = require("./harness");

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

module.exports = defineSuite("staging-edit-photos", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

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
      async galleryPick(typeRe, color) {
        const gal = document.getElementById("addCoinGallery");
        const before = this.newCount();
        // C3: the + tile, then the type, then the chooser's Files source.
        const tile = gal.querySelector('button.gc-add-tile[data-role="add"]');
        if (!tile) return false;
        tile.click();
        const item = [...document.querySelectorAll(".gtp-item")].find(b => typeRe.test(b.textContent));
        if (!item) return false;
        item.click();
        const input = this.viaChooserFiles();
        if (!input) return false;
        this.pick(input, await this.file(color));
        return this.finishCrop(before);
      },
      async slotPick(type, color) {
        const before = this.newCount();
        // C3: the slot's + circle (or Replace when filled), then Files.
        const ph = document.getElementById(type + "Placeholder");
        const rep = document.getElementById(type + "ReplaceBtn");
        const trigger = ph && ph.offsetParent !== null ? ph : rep;
        if (!trigger) return false;
        trigger.click();
        const input = this.viaChooserFiles();
        if (!input) return false;
        this.pick(input, await this.file(color));
        return this.finishCrop(before);
      },
      // Taps 📁 Files in the open chooser and returns its input (null if the
      // chooser didn't open).
      viaChooserFiles() {
        const btn = document.querySelector('#imageSourceChooser:not(.hidden) .image-chooser-btn[data-source="files"]');
        if (!btn) return null;
        btn.click();
        return document.getElementById("imageChooserFilesInput");
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

  // ---------- R. The research note survives an edit (plan item 5b) ----------
  const R = await page.evaluate(async ({ base, catalog, id }) => {
    const out = {};
    const run = async (overrides, mutate) => {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      await mock.uploadJson(__draftPath(id), Object.assign({}, base, overrides));
      await beginCoinDraftEdit(id);
      const label = __val("pcgsLabelInput");
      if (mutate) mutate();
      document.getElementById("notesField").value = "edited";
      await __saveEdit();
      const saved = await mock.getJson(__draftPath(id));
      __teardown();
      return { label, saved };
    };

    // R1: a no-match draft with a stored raw label and an upload-failure line.
    out.r1 = await run({
      coinId: "", matchedHow: "none", year: "1938", variety: "X-not-in-catalog",
      pcgsLabelRaw: "3966.66/44556677",
      researchNote: "No DB_Coins match at capture — CoinID pending, needs a catalog entry.\n" +
        "Captured but unresolved: PCGS label 3966.66/44556677.\n" +
        "Some captured files failed to upload at capture: " + id + "_slab_obverse.jpg."
    });
    // R2: a draft written before pcgsLabelRaw was stored — label only in the note.
    out.r2 = await run({
      coinId: "", matchedHow: "none", variety: "X-not-in-catalog",
      researchNote: "No DB_Coins match at capture — CoinID pending, needs a catalog entry.\n" +
        "Captured but unresolved: GSID GS-9; PCGS label 3966.66/44556677."
    });
    // R3: a picked link stays "picked from 3", not rewritten as "from 1".
    out.r3 = await run({
      matchedHow: "picked",
      researchNote: "CoinID C-1938-D-5C-01 chosen from 3 ambiguous DB_Coins candidates at capture — confirm at reconciliation."
    });
    // R4: a single link stays single, with no invented "chosen from" line.
    out.r4 = await run({ matchedHow: "single", researchNote: "" });
    // R5: the rebuild still works — an edit that resolves the gap clears it.
    out.r5 = await run({
      coinId: "", matchedHow: "none", variety: "X-not-in-catalog",
      researchNote: "No DB_Coins match at capture — CoinID pending, needs a catalog entry."
    }, () => {
      document.getElementById("varietySelect").value = "";
      document.getElementById("variety").value = "";
      document.getElementById("varietyOther").value = "";
      checkDbCoinsMatch();
    });
    return out;
  }, { base: BASE_DRAFT, catalog: CATALOG, id: ID });

  ok(R.r1.label === "3966.66/44556677",
    "R1 the stored raw PCGS label is put back on the edit form: " + JSON.stringify(R.r1.label));
  ok(/PCGS label 3966\.66\/44556677/.test(R.r1.saved.researchNote) &&
     R.r1.saved.pcgsLabelRaw === "3966.66/44556677",
    "R2 -- so the \"PCGS label\" line survives the edit, and the raw label stays stored: " +
      JSON.stringify(R.r1.saved.researchNote));
  ok(/Some captured files failed to upload at capture/.test(R.r1.saved.researchNote),
    "R3 the upload-failure line written at first save survives an edit");
  ok(R.r2.label === "3966.66/44556677" && /PCGS label 3966\.66\/44556677/.test(R.r2.saved.researchNote),
    "R4 an older draft (label only in its note) keeps the label too: " + JSON.stringify(R.r2));
  ok(R.r3.saved.matchedHow === "picked" && /chosen from 3 ambiguous/.test(R.r3.saved.researchNote) &&
     !/chosen from 1 /.test(R.r3.saved.researchNote),
    "R5 an unchanged picked link keeps \"chosen from 3\" and its provenance: " +
      JSON.stringify([R.r3.saved.matchedHow, R.r3.saved.researchNote]));
  ok(R.r4.saved.matchedHow === "single" && !/chosen from/.test(R.r4.saved.researchNote),
    "R6 an unchanged single link stays single, with no invented \"chosen from 1\" line: " +
      JSON.stringify([R.r4.saved.matchedHow, R.r4.saved.researchNote]));
  ok(R.r5.saved.coinId === "C-1938-D-5C-01" && !/No DB_Coins match/.test(R.r5.saved.researchNote),
    "R7 an edit that resolves the gap still clears the old no-match line (the note is still rebuilt): " +
      JSON.stringify([R.r5.saved.coinId, R.r5.saved.researchNote]));

  // ---------- AA. Assign to Album survives an edit (plan item 5c) ----------
  // The dropdown holds only OPEN slots of the albums loaded right now. A
  // draft's saved value can be missing from it (albums not loaded yet in a
  // live session, or the list rebuilt when they arrive mid-edit). Before any
  // fix, this block was written to find out whether that loses the value.
  const AA = await page.evaluate(async ({ base, catalog, id }) => {
    const firstOpen = (() => {
      for (const a of FAKE_ALBUMS) for (const s of a.slots) if (!s.filledBy) return a.name + " :: " + s.coinId;
      return "";
    })();
    const run = async (beforeOpen, afterOpen) => {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      if (beforeOpen) beforeOpen();
      await mock.uploadJson(__draftPath(id), Object.assign({}, base, { assignAlbum: firstOpen }));
      await beginCoinDraftEdit(id);
      const shown = __val("assignAlbum");
      if (afterOpen) afterOpen();
      const afterRebuild = __val("assignAlbum");
      document.getElementById("notesField").value = "edited";
      await __saveEdit();
      const saved = await mock.getJson(__draftPath(id));
      __setLiveAlbumsForTest(null);
      populateAssignAlbumOptions();
      __teardown();
      return { shown, afterRebuild, saved: saved.assignAlbum };
    };
    return {
      firstOpen,
      loaded: await run(null, null),
      notLoaded: await run(() => { __setLiveAlbumsForTest([]); populateAssignAlbumOptions(); }, null),
      rebuiltMidEdit: await run(null, () => { __setLiveAlbumsForTest([]); populateAssignAlbumOptions(); })
    };
  }, { base: BASE_DRAFT, catalog: CATALOG, id: ID });

  ok(!!AA.firstOpen && AA.loaded.shown === AA.firstOpen && AA.loaded.saved === AA.firstOpen,
    "AA1 with albums loaded, the draft's album slot is shown and kept on save: " + JSON.stringify(AA.loaded));
  ok(AA.notLoaded.saved === AA.firstOpen,
    "AA2 with albums NOT loaded when the edit opens, the saved album slot is still kept: " +
      JSON.stringify(AA.notLoaded));
  ok(AA.rebuiltMidEdit.saved === AA.firstOpen,
    "AA3 when the album list is rebuilt mid-edit (albums arriving late), the selection is kept: " +
      JSON.stringify(AA.rebuiltMidEdit));

  const AA4 = await page.evaluate(async () => {
    const sel = document.getElementById("assignAlbum");
    setSelectValuePreservingUnknown(sel, "Gone Album :: C-0000-X-1C-01");
    navigate("addcoin"); // a fresh entry resets the form
    return { value: sel.value, injectedLeft: [...sel.options].filter(o => o.dataset.injected).length };
  });
  ok(AA4.value === "" && AA4.injectedLeft === 0,
    "AA4 a kept (injected) slot from an edit is not offered to the next coin entered: " + JSON.stringify(AA4));

  // ---------- P. Phase B1: existing photos load; add and replace ----------
  const P = await page.evaluate(async ({ base, catalog, id }) => {
    const out = {};
    const folder = writePaths().stagingBase + "/" + id;
    const openEdit = async (mock, draft, files) => {
      for (const [name, color] of Object.entries(files || {})) await mock.uploadFile(folder + "/" + name, await __ph.jpeg(color));
      await mock.uploadJson(__draftPath(id), draft);
      await beginCoinDraftEdit(id);
      const body = document.getElementById("addCoinPhotosBody");
      if (body.classList.contains("hidden")) document.getElementById("addCoinPhotosHeader").click();
    };

    // P1: Ray's exact sequence — a draft holding only its receipt; pick a
    // slab front through the gallery's Files button; Save changes.
    {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      await mock.uploadFile(folder + "/" + id + "_receipt.pdf", new Blob(["%PDF-receipt"], { type: "application/pdf" }));
      await openEdit(mock, Object.assign({}, base));
      const receiptBefore = await __ph.bytesOf(mock, folder + "/" + id + "_receipt.pdf");
      out.picked = await __ph.galleryPick(/Slab — front/);
      await __saveEdit();
      const saved = await mock.getJson(__draftPath(id));
      out.p1 = {
        photos: saved.photos, receiptPhoto: saved.receiptPhoto,
        fileThere: !!(await mock.getItemMeta(folder + "/" + id + "_slab_obverse.jpg")),
        receiptSame: (await __ph.bytesOf(mock, folder + "/" + id + "_receipt.pdf")) === receiptBefore,
        onStaging: document.getElementById("view-staging").classList.contains("active")
      };
      __teardown();
    }

    // P2: a draft that already has photos shows them on opening.
    {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, {
        photos: [
          { type: "obverse", filename: id + "_obverse_cropped.jpg", caption: "" },
          { type: "obverse", filename: id + "_obverse_original.jpg", caption: "original" },
          { type: "slab_obverse", filename: id + "_slab_obverse.jpg", caption: "holder" },
          { type: "reference", filename: id + "_reference_01.jpg", caption: "auction" }
        ]
      }), { [id + "_obverse_cropped.jpg"]: "#a33", [id + "_obverse_original.jpg"]: "#3a3",
            [id + "_slab_obverse.jpg"]: "#33a", [id + "_reference_01.jpg"]: "#aa3" });
      await __ph.sleep(100);
      const list = galleryFor(ADDCOIN_GALLERY_ID);
      const prev = document.getElementById("obversePreview");
      const thumbs = [...document.querySelectorAll("#addCoinGallery .gc-thumb")];
      out.p2 = {
        entries: list.map(e => [e.type, e.stagingStored, !!e.url, (e.stagingFiles || []).length]),
        obvShown: prev.style.display === "block" && /^blob:/.test(prev.src),
        adjustShown: document.getElementById("obverseAdjustBtn").style.display === "flex",
        // C3: the filled slot's own Replace button (its 📷/🖼️/📁 titles are gone).
        replaceTitle: document.getElementById("obverseReplaceBtn").style.display !== "none" ? document.getElementById("obverseReplaceBtn").textContent : "",
        adjustSource: !!slotFiles["obverseFrame"],
        thumbStates: thumbs.map(t => (t.querySelector(".photo-upload-state") || {}).textContent || ""),
        thumbImgs: thumbs.map(t => /blob:/.test(t.querySelector(".gc-img").style.backgroundImage)),
        captions: thumbs.map(t => t.querySelector(".gc-caption").value),
        receipt: document.getElementById("receiptPhotoBox") ? document.getElementById("receiptPhotoBox").textContent : document.body.textContent.indexOf(id + "_receipt.pdf (in Staging)") !== -1
      };
      // Saving with no photo change keeps coin.json's photos exactly.
      await __saveEdit();
      out.p2.photosAfter = (await mock.getJson(__draftPath(id))).photos;
      __teardown();
    }

    // P3: an older draft with bare-string photos (the verify_staging_edit
    // fixture shape) loads as ONE obverse, and an unrelated edit leaves the
    // list byte-for-byte as it was.
    {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      const bare = [id + "_obverse_cropped.jpg", id + "_obverse_original.jpg", "Some_Hand_Named.jpg"];
      await openEdit(mock, Object.assign({}, base, { photos: bare }),
        { [id + "_obverse_cropped.jpg"]: "#a33", [id + "_obverse_original.jpg"]: "#3a3" });
      const list = galleryFor(ADDCOIN_GALLERY_ID);
      out.p3 = { entries: list.map(e => [e.type, e.filename, e.rawFilename]) };
      await __saveEdit();
      out.p3.after = (await mock.getJson(__draftPath(id))).photos;
      __teardown();
    }

    // P4: replacing an obverse overwrites its own pair; promotion then moves
    // exactly one obverse, with a Photos row.
    {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, {
        photos: [
          { type: "obverse", filename: id + "_obverse_cropped.jpg", caption: "" },
          { type: "obverse", filename: id + "_obverse_original.jpg", caption: "original" }
        ]
      }), { [id + "_obverse_cropped.jpg"]: "#a33", [id + "_obverse_original.jpg"]: "#3a3" });
      await mock.uploadFile(folder + "/" + id + "_receipt.pdf", new Blob(["%PDF-receipt"], { type: "application/pdf" }));
      await __ph.sleep(100);
      const cropBefore = await __ph.bytesOf(mock, folder + "/" + id + "_obverse_cropped.jpg");
      const rawBefore = await __ph.bytesOf(mock, folder + "/" + id + "_obverse_original.jpg");
      out.p4picked = await __ph.slotPick("obverse", "#33f");
      await __saveEdit();
      const saved = await mock.getJson(__draftPath(id));
      const names = await mock.listChildren(folder);
      out.p4 = {
        photos: saved.photos,
        cropChanged: (await __ph.bytesOf(mock, folder + "/" + id + "_obverse_cropped.jpg")) !== cropBefore,
        rawChanged: (await __ph.bytesOf(mock, folder + "/" + id + "_obverse_original.jpg")) !== rawBefore,
        jpgsInFolder: names.filter(n => /\.jpg$/.test(n)).sort()
      };
      saved.status = "Promoted";
      const moved = await movePromotedCoinFiles(saved);
      const p = writePaths();
      const rows = mock._grids.Photos.filter(r => r[1] === id);
      out.p4.promote = {
        allOk: moved.allOk,
        obverseMoves: moved.moves.filter(m => /_obverse_cropped\.jpg$/.test(m.dest)).length,
        inCoinPhotos: !!(await mock.getItemMeta(p.coinPhotos + "/" + id + "_obverse_cropped.jpg")),
        rows: rows.map(r => [r[2], r[4], r[7]]),
        flag: (await mock.getJson(__draftPath(id))).filesMovedOnPromotion
      };
      __teardown();
    }

    // P5: adding a reference when _01 already exists writes _02 and leaves
    // _01's bytes alone.
    {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, {
        photos: [{ type: "reference", filename: id + "_reference_01.jpg", caption: "" }]
      }), { [id + "_reference_01.jpg"]: "#aa3" });
      const r1Before = await __ph.bytesOf(mock, folder + "/" + id + "_reference_01.jpg");
      out.p5picked = await __ph.galleryPick(/Reference/);
      await __saveEdit();
      const saved = await mock.getJson(__draftPath(id));
      out.p5 = {
        names: saved.photos.map(coinDraftPhotoFilename),
        r1Same: (await __ph.bytesOf(mock, folder + "/" + id + "_reference_01.jpg")) === r1Before
      };
      __teardown();
    }

    // P5b: the case session-only numbering gets wrong. coin.json lists only
    // _02 (its _01 dropped earlier, the file left in the folder), so the
    // gallery holds ONE reference and "count in the gallery + 1" names the
    // new one _02 — over the existing file. It has to be _03, from the folder.
    {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, {
        photos: [{ type: "reference", filename: id + "_reference_02.jpg", caption: "" }]
      }), { [id + "_reference_01.jpg"]: "#a00", [id + "_reference_02.jpg"]: "#0a0" });
      const before = [await __ph.bytesOf(mock, folder + "/" + id + "_reference_01.jpg"),
                      await __ph.bytesOf(mock, folder + "/" + id + "_reference_02.jpg")];
      out.p5bpicked = await __ph.galleryPick(/Reference/);
      await __saveEdit();
      const saved = await mock.getJson(__draftPath(id));
      out.p5b = {
        names: saved.photos.map(coinDraftPhotoFilename),
        untouched: (await __ph.bytesOf(mock, folder + "/" + id + "_reference_01.jpg")) === before[0] &&
                   (await __ph.bytesOf(mock, folder + "/" + id + "_reference_02.jpg")) === before[1]
      };
      __teardown();
    }

    // P6: a failed upload records nothing, keeps the photo, and the retry
    // lands it.
    {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base));
      const jsonBefore = JSON.stringify(await mock.getJson(__draftPath(id)));
      out.p6picked = await __ph.galleryPick(/Slab — back/);
      const realUpload = mock.uploadFile;
      mock.uploadFile = (path, f) => /_slab_reverse/.test(path) ? Promise.reject(new Error("network down")) : realUpload(path, f);
      document.getElementById("notesField").value = "typed during the failed save";
      await __saveEdit();
      const entry = galleryFor(ADDCOIN_GALLERY_ID).find(e => e.type === "slab_reverse");
      out.p6 = {
        jsonSame: JSON.stringify(await mock.getJson(__draftPath(id))) === jsonBefore,
        kept: !!(entry && entry.blob), error: !!(entry && entry.uploadError),
        stillEditing: document.getElementById("view-addcoin").classList.contains("active") && editingCoinDraftId === id,
        notes: __val("notesField"),
        badge: [...document.querySelectorAll("#addCoinGallery .photo-upload-state.failed")].map(n => n.textContent.trim()),
        retryBtn: !!document.querySelector("#addCoinGallery .staging-retry-btn"),
        toast: document.getElementById("toast").textContent
      };
      mock.uploadFile = realUpload;
      const retryBtn = document.querySelector("#addCoinGallery .staging-retry-btn");
      if (retryBtn) retryBtn.click();
      await __ph.waitFor(() => document.getElementById("view-staging").classList.contains("active"), 4000);
      const saved = await mock.getJson(__draftPath(id));
      out.p6.retry = {
        photos: saved.photos.map(coinDraftPhotoFilename),
        remarks: saved.remarks,
        fileThere: !!(await mock.getItemMeta(folder + "/" + id + "_slab_reverse.jpg"))
      };
      __teardown();
    }

    // P7: the gate — no Staging edit once the coin has been written to the
    // All sheet or its files have left Staging.
    {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      await mock.uploadJson(__draftPath(id), Object.assign({}, base, { status: "Ready", allRowWritten: true }));
      navigate("staging");
      out.p7a = { opened: await beginCoinDraftEdit(id), toast: document.getElementById("toast").textContent };
      await mock.uploadJson(__draftPath(id), Object.assign({}, base, { filesMovedOnPromotion: true }));
      out.p7b = { opened: await beginCoinDraftEdit(id), toast: document.getElementById("toast").textContent };
      out.p7 = { binding: editingCoinDraftId };
      __teardown();
    }

    // P8: a receipt picked during an edit replaces the receipt file.
    {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      await mock.uploadFile(folder + "/" + id + "_receipt.pdf", new Blob(["%PDF-old"], { type: "application/pdf" }));
      await openEdit(mock, Object.assign({}, base));
      const pdf = new File(["%PDF-1.4 new receipt"], "invoice.pdf", { type: "application/pdf" });
      __ph.pick(document.getElementById("receiptLibraryInput"), pdf);
      await __ph.waitFor(() => !!receiptFiles["receiptPreview"]);
      await __saveEdit();
      const saved = await mock.getJson(__draftPath(id));
      const v = await mock.getFileBytes(folder + "/" + id + "_receipt.pdf");
      out.p8 = { receiptPhoto: saved.receiptPhoto, content: v instanceof Blob ? await v.text() : String(v) };
      __teardown();
    }
    return out;
  }, { base: BASE_DRAFT, catalog: CATALOG, id: ID });

  const slabEntry = (P.p1 && P.p1.photos || []).find(e => e && e.filename === ID + "_slab_obverse.jpg");
  ok(P.picked && P.p1.fileThere && slabEntry && slabEntry.type === "slab_obverse",
    "P1 Ray's sequence: a slab front picked via Files lands in Staging/" + ID + "/ and coin.json lists it: " +
      JSON.stringify(P.p1));
  ok(P.p1.receiptPhoto === ID + "_receipt.pdf" && P.p1.receiptSame && P.p1.photos.length === 1,
    "P2 -- the receipt is untouched (same name, same bytes) and nothing else was added");
  ok(P.p1.onStaging, "P3 -- and a successful save returns to Staging Review as before");
  ok(JSON.stringify(P.p2.entries) === JSON.stringify([["obverse", true, true, 2], ["slab_obverse", true, true, 1], ["reference", true, true, 1]]),
    "P4 opening an edit loads the draft's photos (the obverse with its _original as one) with their images: " +
      JSON.stringify(P.p2.entries));
  ok(P.p2.obvShown && P.p2.adjustShown && P.p2.adjustSource && /Replace/.test(P.p2.replaceTitle),
    "P5 -- the obverse slot shows the stored photo, offers Adjust (from the original) and says Replace: " +
      JSON.stringify([P.p2.obvShown, P.p2.adjustShown, P.p2.adjustSource, P.p2.replaceTitle]));
  ok(P.p2.thumbStates.every(t => t === "In Staging") && P.p2.thumbImgs.every(Boolean) &&
     JSON.stringify(P.p2.captions) === JSON.stringify(["holder", "auction"]),
    "P6 -- the gallery shows the slab and reference photos, marked In Staging, with their captions: " +
      JSON.stringify(P.p2));
  ok(P.p2.receipt === true || /_receipt\.pdf \(in Staging\)/.test(String(P.p2.receipt)),
    "P7 -- and the receipt on file is shown");
  ok(P.p2.photosAfter.length === 4 && P.p2.photosAfter.every(e => typeof e === "object"),
    "P8 saving an edit that changes no photo keeps coin.json's photos as they were: " + JSON.stringify(P.p2.photosAfter));
  ok(JSON.stringify(P.p3.entries) === JSON.stringify([["obverse", ID + "_obverse_cropped.jpg", ID + "_obverse_original.jpg"]]),
    "P9 bare-string photos (older drafts) load as one obverse with its original; an unknown name is not loaded: " +
      JSON.stringify(P.p3.entries));
  ok(JSON.stringify(P.p3.after) === JSON.stringify([ID + "_obverse_cropped.jpg", ID + "_obverse_original.jpg", "Some_Hand_Named.jpg"]),
    "P10 -- and an unrelated edit leaves that list exactly as it was, unknown name included: " + JSON.stringify(P.p3.after));
  const obv = (P.p4.photos || []).map(coinDraftName => coinDraftName && coinDraftName.filename);
  ok(P.p4picked && P.p4.cropChanged && P.p4.rawChanged,
    "P11 replacing the obverse overwrites its own file AND its _original in Staging: " + JSON.stringify(P.p4));
  ok(JSON.stringify(obv.sort()) === JSON.stringify([ID + "_obverse_cropped.jpg", ID + "_obverse_original.jpg"]) &&
     JSON.stringify(P.p4.jpgsInFolder) === JSON.stringify([ID + "_obverse_cropped.jpg", ID + "_obverse_original.jpg"]),
    "P12 -- coin.json lists one obverse pair, and the folder holds no second copy: " + JSON.stringify([obv, P.p4.jpgsInFolder]));
  ok(P.p4.promote.allOk && P.p4.promote.obverseMoves === 1 && P.p4.promote.inCoinPhotos,
    "P13 promotion moves exactly one obverse into CoinPhotos: " + JSON.stringify(P.p4.promote));
  ok(JSON.stringify(P.p4.promote.rows) === JSON.stringify([["Obverse", ID + "_obverse_cropped.jpg", ID + "_obverse_original.jpg"]]) &&
     P.p4.promote.flag === true,
    "P14 -- with one Photos row (the original on it) and filesMovedOnPromotion set: " + JSON.stringify(P.p4.promote));
  ok(P.p5picked && JSON.stringify(P.p5.names) === JSON.stringify([ID + "_reference_01.jpg", ID + "_reference_02.jpg"]) && P.p5.r1Same,
    "P15 a reference added when _01 exists is written as _02, and _01's bytes are unchanged: " + JSON.stringify(P.p5));
  ok(P.p5bpicked && JSON.stringify(P.p5b.names) === JSON.stringify([ID + "_reference_02.jpg", ID + "_reference_03.jpg"]) &&
     P.p5b.untouched,
    "P15b with _01 and _02 in the folder but only _02 listed, the new reference is _03 and no existing file is overwritten: " +
      JSON.stringify(P.p5b));
  ok(P.p6picked && P.p6.jsonSame,
    "P16 a failed upload leaves coin.json unchanged: " + JSON.stringify(P.p6));
  ok(P.p6.kept && P.p6.error && P.p6.stillEditing && P.p6.notes === "typed during the failed save",
    "P17 -- the photo (with its Blob) and the typed fields stay; the form is not reset or left");
  ok(P.p6.badge.some(t => /Not saved — tap/.test(t)) && P.p6.retryBtn && /Couldn't save/.test(P.p6.toast),
    "P18 -- it says \"Not saved — tap ↻\" with a retry button, and a toast says so");
  ok(P.p6.retry.fileThere && P.p6.retry.photos.indexOf(ID + "_slab_reverse.jpg") !== -1 &&
     P.p6.retry.remarks === "typed during the failed save",
    "P19 -- tapping ↻ lands the photo and the edit: " + JSON.stringify(P.p6.retry));
  ok(P.p7a.opened === false && /already written to the All sheet/.test(P.p7a.toast),
    "P20 the edit is refused once the coin was written to the All sheet (allRowWritten): " + JSON.stringify(P.p7a));
  ok(P.p7b.opened === false && /already left Staging/.test(P.p7b.toast) && P.p7.binding === null,
    "P21 -- and once its files have left Staging (filesMovedOnPromotion): " + JSON.stringify(P.p7b));
  ok(P.p8.receiptPhoto === ID + "_receipt.pdf" && /new receipt/.test(P.p8.content),
    "P22 a receipt picked during an edit replaces the receipt file in Staging: " + JSON.stringify(P.p8));

  // ---------- Q. Phase B2: remove ----------
  const Q = await page.evaluate(async ({ base, catalog, id }) => {
    const out = {};
    const folder = writePaths().stagingBase + "/" + id;
    const guardOpen = () => !document.getElementById("writeGuardOverlay").classList.contains("hidden");
    const clickGuard = (label) => {
      const b = [...document.querySelectorAll("#writeGuardBtns button")].find(x => x.textContent.trim() === label);
      if (b) b.click();
      return !!b;
    };
    const openEdit = async (mock, draft, files) => {
      for (const [name, color] of Object.entries(files || {})) await mock.uploadFile(folder + "/" + name, await __ph.jpeg(color));
      await mock.uploadJson(__draftPath(id), draft);
      await beginCoinDraftEdit(id);
      const body = document.getElementById("addCoinPhotosBody");
      if (body.classList.contains("hidden")) document.getElementById("addCoinPhotosHeader").click();
      await __ph.sleep(50);
    };
    // Records the order of coin.json writes and file deletes.
    const trace = (mock) => {
      const ops = [];
      const ru = mock.uploadJson, rd = mock.deleteItem;
      mock.uploadJson = (path, o) => { ops.push("json"); return ru(path, o); };
      mock.deleteItem = (path) => { ops.push("delete:" + path.split("/").pop()); return rd(path); };
      return ops;
    };
    const twoPhotos = {
      photos: [
        { type: "obverse", filename: id + "_obverse_cropped.jpg", caption: "" },
        { type: "obverse", filename: id + "_obverse_original.jpg", caption: "original" },
        { type: "slab_obverse", filename: id + "_slab_obverse.jpg", caption: "" }
      ]
    };
    const twoFiles = { [id + "_obverse_cropped.jpg"]: "#a33", [id + "_obverse_original.jpg"]: "#3a3",
                       [id + "_slab_obverse.jpg"]: "#33a" };

    // Q1: ✕ on a stored gallery photo asks first; Cancel changes nothing.
    // Remove + Save writes coin.json without it FIRST, then deletes the file.
    {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      await mock.uploadFile(folder + "/" + id + "_receipt.pdf", new Blob(["%PDF"], { type: "application/pdf" }));
      await openEdit(mock, Object.assign({}, base, twoPhotos), twoFiles);
      const x = () => document.querySelector("#addCoinGallery .gc-thumb .gc-remove") || { click() {} };
      out.q1hasX = !!document.querySelector("#addCoinGallery .gc-thumb .gc-remove");
      x().click();
      out.q1asked = guardOpen();
      clickGuard("Cancel");
      out.q1afterCancel = galleryFor(ADDCOIN_GALLERY_ID).filter(e => e.type === "slab_obverse").length;
      x().click();
      clickGuard("Remove");
      out.q1beforeSave = !!(await mock.getItemMeta(folder + "/" + id + "_slab_obverse.jpg"));
      const ops = trace(mock);
      await __saveEdit();
      const saved = await mock.getJson(__draftPath(id));
      out.q1 = {
        names: saved.photos.map(coinDraftPhotoFilename),
        gone: !(await mock.getItemMeta(folder + "/" + id + "_slab_obverse.jpg")),
        ops, toast: document.getElementById("toast").textContent
      };
      __teardown();
    }

    // Q2: ✕ on the obverse slot removes the crop AND its _original.
    {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      await mock.uploadFile(folder + "/" + id + "_receipt.pdf", new Blob(["%PDF"], { type: "application/pdf" }));
      await openEdit(mock, Object.assign({}, base, twoPhotos), twoFiles);
      const btn = document.getElementById("obverseRemoveBtn");
      out.q2shown = btn.style.display !== "none";
      btn.click();
      clickGuard("Remove");
      out.q2slotEmpty = document.getElementById("obversePreview").style.display === "none";
      await __saveEdit();
      const saved = await mock.getJson(__draftPath(id));
      out.q2 = {
        names: saved.photos.map(coinDraftPhotoFilename),
        cropGone: !(await mock.getItemMeta(folder + "/" + id + "_obverse_cropped.jpg")),
        rawGone: !(await mock.getItemMeta(folder + "/" + id + "_obverse_original.jpg"))
      };
      __teardown();
    }

    // Q3: a failed delete leaves coin.json correct and the file as an orphan.
    {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      await mock.uploadFile(folder + "/" + id + "_receipt.pdf", new Blob(["%PDF"], { type: "application/pdf" }));
      await openEdit(mock, Object.assign({}, base, twoPhotos), twoFiles);
      const qx = document.querySelector("#addCoinGallery .gc-thumb .gc-remove");
      if (qx) qx.click();
      clickGuard("Remove");
      mock.deleteItem = () => Promise.reject(new Error("locked"));
      await __saveEdit();
      const saved = await mock.getJson(__draftPath(id));
      out.q3 = {
        names: saved.photos.map(coinDraftPhotoFilename),
        orphan: !!(await mock.getItemMeta(folder + "/" + id + "_slab_obverse.jpg")),
        toast: document.getElementById("toast").textContent,
        onStaging: document.getElementById("view-staging").classList.contains("active")
      };
      __teardown();
    }

    // Q4: removing the receipt clears receiptPhoto and deletes the file.
    {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      await mock.uploadFile(folder + "/" + id + "_receipt.pdf", new Blob(["%PDF"], { type: "application/pdf" }));
      await openEdit(mock, Object.assign({}, base));
      const r = document.getElementById("receiptRemoveBtn");
      out.q4shown = r.style.display !== "none";
      r.click();
      clickGuard("Remove");
      await __saveEdit();
      const saved = await mock.getJson(__draftPath(id));
      out.q4 = { receiptPhoto: saved.receiptPhoto, gone: !(await mock.getItemMeta(folder + "/" + id + "_receipt.pdf")) };
      __teardown();
    }

    // Q5: replacing a photo stored under another name (an older draft's
    // hand name) lists the new pair and deletes the old file.
    {
      const mock = await __setup();
      __setLiveDbCoinsForTest(catalog);
      await mock.uploadFile(folder + "/" + id + "_receipt.pdf", new Blob(["%PDF"], { type: "application/pdf" }));
      await openEdit(mock, Object.assign({}, base, {
        photos: [{ type: "obverse", filename: id + "_obv_old.jpg", caption: "" }]
      }), { [id + "_obv_old.jpg"]: "#999" });
      out.q5picked = await __ph.slotPick("obverse", "#0f0");
      await __saveEdit();
      const saved = await mock.getJson(__draftPath(id));
      out.q5 = {
        names: saved.photos.map(coinDraftPhotoFilename).sort(),
        oldGone: !(await mock.getItemMeta(folder + "/" + id + "_obv_old.jpg"))
      };
      __teardown();
    }

    // Q6: a fresh Add Coin shows no Staging states and no receipt ✕. C3
    // changed one thing on purpose: a filled obverse now shows its ✕ on a new
    // draft too (Ray's layout: "filled photo with ✕ in its corner"); it
    // removes from the draft only. The empty reverse shows none.
    {
      const mock = await __setup();
      navigate("addcoin");
      const body = document.getElementById("addCoinPhotosBody");
      if (body.classList.contains("hidden")) document.getElementById("addCoinPhotosHeader").click();
      out.q6picked = await __ph.slotPick("obverse", "#f00");
      out.q6 = ["obverseRemoveBtn", "reverseRemoveBtn", "receiptRemoveBtn"].map(i => document.getElementById(i).style.display);
      out.q6gallery = !document.querySelector("#addCoinGallery .photo-upload-state");
      navigate("addcoin");
      __teardown();
    }
    return out;
  }, { base: BASE_DRAFT, catalog: CATALOG, id: ID });

  ok(Q.q1hasX && Q.q1asked && Q.q1afterCancel === 1,
    "Q1 ✕ on a stored photo asks first, and Cancel keeps it: " + JSON.stringify([Q.q1hasX, Q.q1asked, Q.q1afterCancel]));
  ok(Q.q1beforeSave === true,
    "Q2 -- nothing is deleted before Save changes");
  ok(JSON.stringify(Q.q1.names) === JSON.stringify([ID + "_obverse_cropped.jpg", ID + "_obverse_original.jpg"]) && Q.q1.gone,
    "Q3 Remove + Save: coin.json no longer lists it and the file is deleted: " + JSON.stringify(Q.q1));
  const iJson = Q.q1.ops.indexOf("json"), iDel = Q.q1.ops.indexOf("delete:" + ID + "_slab_obverse.jpg");
  ok(iJson !== -1 && iDel !== -1 && iJson < iDel,
    "Q4 -- coin.json is written BEFORE the file is deleted: " + JSON.stringify(Q.q1.ops));
  ok(/1 photo removed/.test(Q.q1.toast), "Q5 -- and the toast says so: " + JSON.stringify(Q.q1.toast));
  ok(Q.q2shown && Q.q2slotEmpty && JSON.stringify(Q.q2.names) === JSON.stringify([ID + "_slab_obverse.jpg"]) &&
     Q.q2.cropGone && Q.q2.rawGone,
    "Q6 removing the obverse removes its crop AND its _original, from coin.json and from Staging: " + JSON.stringify(Q.q2));
  ok(JSON.stringify(Q.q3.names) === JSON.stringify([ID + "_obverse_cropped.jpg", ID + "_obverse_original.jpg"]) &&
     Q.q3.orphan && Q.q3.onStaging,
    "Q7 a failed delete leaves coin.json correct and the file as a harmless orphan: " + JSON.stringify(Q.q3));
  ok(/couldn't be deleted from Staging/.test(Q.q3.toast), "Q8 -- and the toast says the old file couldn't be deleted");
  ok(Q.q4shown && Q.q4.receiptPhoto === "" && Q.q4.gone,
    "Q9 removing the receipt clears receiptPhoto and deletes the file: " + JSON.stringify(Q.q4));
  ok(Q.q5picked && JSON.stringify(Q.q5.names) === JSON.stringify([ID + "_obverse_cropped.jpg", ID + "_obverse_original.jpg"]) &&
     Q.q5.oldGone,
    "Q10 replacing a photo stored under another name lists the new pair and deletes the old file: " + JSON.stringify(Q.q5));
  ok(Q.q6picked && Q.q6[0] === "flex" && Q.q6[1] === "none" && Q.q6[2] === "none" && Q.q6gallery,
    "Q11 a fresh Add Coin shows no Staging states and no receipt ✕; since C3 the filled obverse has its ✕ (draft-only) and the empty reverse none: " + JSON.stringify(Q.q6));

  // @@NEXT@@
}, module);
