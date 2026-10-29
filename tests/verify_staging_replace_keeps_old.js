// Staging draft edit: Replace, Recrop and Crop-from-another keep the old
// file (Ray, 29 Oct 2026, backlog w). Before this, finishStagingEditFiles()
// deleted every loaded file coin.json stopped listing, so a Replace deleted
// the photo it replaced. Now only X, after its confirm, deletes; a replaced
// photo's files stay in Staging, unlisted and byte-identical.
//
// Runs against the mock Graph client; nothing touches a real OneDrive.
//
//   A  Replace obverse (pair slot): old pair kept, coin.json lists the new
//   B  Recrop: old pair kept
//   C  Crop from another photo into Obverse: old pair kept, source untouched
//   D  Replace a Holder photo (fixed name) and a Reference (repeatable)
//   E  two Replaces in separate edits: all generations on disk, newest listed,
//      the next edit loads one slot
//   F  Replace, Recrop, Replace in one edit keeps the ORIGINAL stored files
//   G  X on a stored photo: nothing deleted before Save, deleted after
//   H  X on a pick that replaced a stored photo deletes the stored files,
//      with the stored-photo dialog wording
//   I  Replace then leave without Save: folder and coin.json unchanged
//   J  a failed upload leaves the old files and coin.json untouched
//   K  toast wording: all replaced, mixed, receipt too
//   L  Reject dialog names the kept files; Reject removes the whole folder
//   M  promotion moves only the listed files; kept ones stay in Staging

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

module.exports = defineSuite("staging-replace-keeps-old", async ({ openApp, check, selfCheck, PHONE }) => {
  selfCheck(check);
  // Local wrapper: condition first, label second (check() takes the label first).
  const ok = (cond, label) => check(label, !!cond);
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
      // Add Coin's photos are Edit Coin's section in draft mode
      // (claude/addcoin-shared-photos, commit 4): every pick is a "+" or a
      // Replace -> chooser -> Files -> the crop tool.
      section(re) {
        const host = document.getElementById("addCoinPhotoSections");
        const h = [...host.querySelectorAll(".accordion-header")].find(x => re.test(x.textContent));
        if (!h) return null;
        if (h.getAttribute("aria-expanded") !== "true") h.click();
        return h.nextElementSibling;
      },
      slot(sectionRe, i) { const b = this.section(sectionRe); return b ? b.querySelectorAll(".sg-photo-slot")[i] : null; },
      async chooserPick(trigger, color) {
        const before = this.newCount();
        if (!trigger) return false;
        trigger.click();
        const files = document.querySelector('#imageSourceChooser .image-chooser-btn[data-source="files"]');
        if (!files) return false;
        files.click();
        this.pick(document.getElementById("imageChooserFilesInput"), await this.file(color));
        return this.finishCrop(before);
      },
      async galleryPick(typeRe, color) {
        let trigger = null;
        if (/Holder/.test(typeRe.source)) {
          const slot = this.slot(/Holder/, /back/.test(typeRe.source) ? 1 : 0);
          trigger = slot && slot.querySelector('[data-act="add"], [data-act="replace"]');
        } else {
          const b = this.section(/Reference photos/);
          trigger = b && b.querySelector('[data-role="add"]');
        }
        return this.chooserPick(trigger, color);
      },
      async slotPick(type, color) {
        const slot = this.slot(/Obverse &/, type === "reverse" ? 1 : 0);
        return this.chooserPick(slot && slot.querySelector('[data-act="add"], [data-act="replace"]'), color);
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


  const R = await page.evaluate(async ({ base, catalog, id }) => {
    const out = {};
    const folder = writePaths().stagingBase + "/" + id;
    const openEdit = async (mock, draft, files) => {
      for (const [name, color] of Object.entries(files || {})) await mock.uploadFile(folder + "/" + name, await __ph.jpeg(color));
      await mock.uploadJson(__draftPath(id), draft);
      await beginCoinDraftEdit(id);
      const body = document.getElementById("addCoinPhotosBody");
      if (body.classList.contains("hidden")) document.getElementById("addCoinPhotosHeader").click();
      await __ph.sleep(80);
    };
    const clickGuard = (label) => {
      const b = [...document.querySelectorAll("#writeGuardBtns button")].find(x => x.textContent.trim() === label);
      if (b) b.click();
      return !!b;
    };
    const guardText = () => (document.getElementById("writeGuardBody") || document.getElementById("writeGuardOverlay") || {}).textContent || "";
    const jpgs = async (mock) => (await mock.listChildren(folder)).filter(n => /\.jpg$/.test(n)).sort();
    const bytes = (mock, n) => __ph.bytesOf(mock, folder + "/" + n);
    const obvPair = [
      { type: "obverse", filename: id + "_obverse_cropped.jpg", caption: "" },
      { type: "obverse", filename: id + "_obverse_original.jpg", caption: "original" }
    ];
    const obvFiles = { [id + "_obverse_cropped.jpg"]: "#a33", [id + "_obverse_original.jpg"]: "#3a3" };
    const listed = async (mock) => (await mock.getJson(__draftPath(id))).photos.map(coinDraftPhotoFilename).sort();
    const toast = () => document.getElementById("toast").textContent;
    // Recrop the obverse; done when the gallery holds a NEW obverse entry
    // (a count of picks can't tell, since a pick replaced by a pick is flat).
    const recrop = async () => {
      const slot = __ph.slot(/Obverse &/, 0);
      const was = galleryFor(ADDCOIN_GALLERY_ID).find(e => e.type === "obverse");
      slot.querySelector('[data-act="adjust"]').click();
      if (!(await __ph.waitFor(() => __ph.open("bgCropOverlay") || __ph.open("photoAdjustOverlay")))) return false;
      if (__ph.open("bgCropOverlay")) document.getElementById("bgCropUseBtn").click();
      if (await __ph.waitFor(() => __ph.open("photoAdjustOverlay"), 1500)) document.getElementById("photoAdjustUseBtn").click();
      return await __ph.waitFor(() => galleryFor(ADDCOIN_GALLERY_ID).find(e => e.type === "obverse") !== was);
    };
    // Replace the obverse; done when the gallery holds a NEW obverse entry.
    const replaceObv = async (color) => {
      const was = galleryFor(ADDCOIN_GALLERY_ID).find(e => e.type === "obverse");
      const slot = __ph.slot(/Obverse &/, 0);
      slot.querySelector('[data-act="replace"], [data-act="add"]').click();
      document.querySelector('#imageSourceChooser .image-chooser-btn[data-source="files"]').click();
      __ph.pick(document.getElementById("imageChooserFilesInput"), await __ph.file(color));
      if (!(await __ph.waitFor(() => __ph.open("bgCropOverlay")))) return false;
      document.getElementById("bgCropUseBtn").click();
      if (await __ph.waitFor(() => __ph.open("photoAdjustOverlay"), 1500)) document.getElementById("photoAdjustUseBtn").click();
      return await __ph.waitFor(() => galleryFor(ADDCOIN_GALLERY_ID).find(e => e.type === "obverse") !== was);
    };
    const O = id + "_obverse_cropped.jpg", OR = id + "_obverse_original.jpg";
    const O2 = id + "_obverse_cropped_02.jpg", OR2 = id + "_obverse_original_02.jpg";
    const O3 = id + "_obverse_cropped_03.jpg", OR3 = id + "_obverse_original_03.jpg";

    // A: Replace the obverse.
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      const b = [await bytes(mock, O), await bytes(mock, OR)];
      out.aPicked = await __ph.slotPick("obverse", "#33f");
      await __saveEdit();
      out.a = { listed: await listed(mock), folder: await jpgs(mock),
        same: (await bytes(mock, O)) === b[0] && (await bytes(mock, OR)) === b[1] };
      __teardown();
    }
    // B: Recrop.
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      const b = [await bytes(mock, O), await bytes(mock, OR)];
      out.bDone = await recrop();
      await __saveEdit();
      out.b = { listed: await listed(mock), folder: await jpgs(mock),
        same: (await bytes(mock, O)) === b[0] && (await bytes(mock, OR)) === b[1] };
      __teardown();
    }
    // C: crop from another photo into Obverse (driven through the real
    // draft-mode placement, with the crop result stood in by a Blob).
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair.concat([{ type: "slab_obverse", filename: id + "_slab_obverse.jpg", caption: "" }]) }),
        Object.assign({ [id + "_slab_obverse.jpg"]: "#55c" }, obvFiles));
      const b = [await bytes(mock, O), await bytes(mock, OR), await bytes(mock, id + "_slab_obverse.jpg")];
      const list = galleryFor(ADDCOIN_GALLERY_ID);
      const src = list.find(e => e.type === "slab_obverse");
      const blob = await __ph.jpeg("#c3c");
      saveDraftCropFromUpload(ADDCOIN_GALLERY_ID, "obverse", src,
        { type: "obverse", blob, url: URL.createObjectURL(blob), rawUrl: null, rawFilename: null, caption: "", filename: "x.jpg" }, () => {});
      await __saveEdit();
      out.c = { listed: await listed(mock), folder: await jpgs(mock),
        same: (await bytes(mock, O)) === b[0] && (await bytes(mock, OR)) === b[1],
        srcSame: (await bytes(mock, id + "_slab_obverse.jpg")) === b[2] };
      __teardown();
    }
    // D: Holder photo (fixed name) and a Reference (repeatable).
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: [
        { type: "slab_obverse", filename: id + "_slab_obverse.jpg", caption: "" },
        { type: "reference", filename: id + "_reference_01.jpg", caption: "auction" }] }),
        { [id + "_slab_obverse.jpg"]: "#55c", [id + "_reference_01.jpg"]: "#aa3" });
      const b = [await bytes(mock, id + "_slab_obverse.jpg"), await bytes(mock, id + "_reference_01.jpg")];
      const holder = __ph.slot(/Holder/, 0);
      out.dHolder = await __ph.chooserPick(holder.querySelector('[data-act="replace"]'), "#f0f");
      const refBody = __ph.section(/Reference photos/);
      out.dRef = await __ph.chooserPick(refBody.querySelector('[data-role="replace"]'), "#0ff");
      await __saveEdit();
      out.d = { listed: await listed(mock), folder: await jpgs(mock),
        same: (await bytes(mock, id + "_slab_obverse.jpg")) === b[0] && (await bytes(mock, id + "_reference_01.jpg")) === b[1] };
      __teardown();
    }
    // E: two Replaces in separate edits.
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      out.e1 = await __ph.slotPick("obverse", "#33f");
      await __saveEdit();
      const s1 = await mock.getJson(__draftPath(id));
      await openEdit(mock, Object.assign({}, s1));
      out.eLoaded = galleryFor(ADDCOIN_GALLERY_ID).map(e => e.filename).sort();
      out.e2 = await __ph.slotPick("obverse", "#f93");
      await __saveEdit();
      out.e = { listed: await listed(mock), folder: await jpgs(mock) };
      __teardown();
    }
    // F: Replace, Recrop, Replace in one edit.
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      const b = [await bytes(mock, O), await bytes(mock, OR)];
      out.f1 = await replaceObv("#33f");
      out.f2 = await recrop();
      out.f3 = await replaceObv("#f93");
      await __saveEdit();
      out.fOk = [out.f1, out.f2, out.f3];
      out.f = { listed: await listed(mock), folder: await jpgs(mock),
        same: (await bytes(mock, O)) === b[0] && (await bytes(mock, OR)) === b[1] };
      __teardown();
    }
    // G: X on a stored photo.
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      __ph.slot(/Obverse &/, 0).querySelector('[data-act="remove"]').click();
      out.gBody = guardText();
      clickGuard("Remove");
      out.gBefore = await jpgs(mock);
      await __saveEdit();
      out.g = { listed: await listed(mock), folder: await jpgs(mock) };
      __teardown();
    }
    // H: Replace, then X on the pick is an UNDO (Ray, 29 Oct 2026): the
    // original stored photo comes back, nothing is deleted or uploaded.
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      const b = [await bytes(mock, O), await bytes(mock, OR)];
      const obvEntry = () => galleryFor(ADDCOIN_GALLERY_ID).find(e => e.type === "obverse");
      const original = obvEntry();
      out.hPicked = await __ph.slotPick("obverse", "#33f");
      __ph.slot(/Obverse &/, 0).querySelector('[data-act="remove"]').click();
      out.hTitle = (document.getElementById("writeGuardTitle") || {}).textContent || "";
      out.hBody = guardText();
      clickGuard("Put it back");
      await __ph.sleep(80);
      out.hRestored = obvEntry() === original && original.stagingStored === true;
      out.hShown = !!(__ph.slot(/Obverse &/, 0) && __ph.slot(/Obverse &/, 0).querySelector('[data-act="remove"]'));
      await __saveEdit();
      out.h = { listed: await listed(mock), folder: await jpgs(mock), toast: toast(),
        same: (await bytes(mock, O)) === b[0] && (await bytes(mock, OR)) === b[1] };
      __teardown();
    }
    // H2: X on the restored original is the ordinary stored-photo remove.
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      await __ph.slotPick("obverse", "#33f");
      __ph.slot(/Obverse &/, 0).querySelector('[data-act="remove"]').click();
      clickGuard("Put it back"); await __ph.sleep(80);
      __ph.slot(/Obverse &/, 0).querySelector('[data-act="remove"]').click();
      out.h2Body = guardText();
      clickGuard("Remove");
      out.h2Before = await jpgs(mock);
      await __saveEdit();
      out.h2 = { listed: await listed(mock), folder: await jpgs(mock) };
      __teardown();
    }
    // H3: Replace, Recrop, Replace, then X restores the ORIGINAL stored photo.
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      const obvEntry = () => galleryFor(ADDCOIN_GALLERY_ID).find(e => e.type === "obverse");
      const original = obvEntry();
      out.h3a = await replaceObv("#33f");
      out.h3b = await recrop();
      out.h3c = await replaceObv("#f93");
      __ph.slot(/Obverse &/, 0).querySelector('[data-act="remove"]').click();
      clickGuard("Put it back"); await __ph.sleep(80);
      out.h3Restored = obvEntry() === original;
      await __saveEdit();
      out.h3 = { listed: await listed(mock), folder: await jpgs(mock) };
      __teardown();
    }
    // H4: crop from another photo into Obverse counts as a Replace; X undoes it.
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair.concat([{ type: "slab_obverse", filename: id + "_slab_obverse.jpg", caption: "" }]) }),
        Object.assign({ [id + "_slab_obverse.jpg"]: "#55c" }, obvFiles));
      const obvEntry = () => galleryFor(ADDCOIN_GALLERY_ID).find(e => e.type === "obverse");
      const original = obvEntry();
      const src = galleryFor(ADDCOIN_GALLERY_ID).find(e => e.type === "slab_obverse");
      const blob = await __ph.jpeg("#c3c");
      saveDraftCropFromUpload(ADDCOIN_GALLERY_ID, "obverse", src,
        { type: "obverse", blob, url: URL.createObjectURL(blob), rawUrl: null, rawFilename: null, caption: "", filename: "x.jpg" }, () => {});
      renderAddCoinPhotos(); await __ph.sleep(60);
      out.h4IsReplace = !!(obvEntry().stagingReplacedEntry === original);
      __ph.slot(/Obverse &/, 0).querySelector('[data-act="remove"]').click();
      clickGuard("Put it back"); await __ph.sleep(80);
      out.h4Restored = obvEntry() === original;
      await __saveEdit();
      out.h4 = { listed: await listed(mock), folder: await jpgs(mock) };
      __teardown();
    }
    // I: Replace, leave without saving.
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      const json0 = JSON.stringify(await mock.getJson(__draftPath(id)));
      out.iPicked = await __ph.slotPick("obverse", "#33f");
      clearCoinDraftEditContext(); resetAddCoinAfterSave();
      out.i = { same: JSON.stringify(await mock.getJson(__draftPath(id))) === json0, folder: await jpgs(mock) };
      __teardown();
    }
    // J: failed upload.
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      const json0 = JSON.stringify(await mock.getJson(__draftPath(id)));
      out.jPicked = await __ph.slotPick("obverse", "#33f");
      const ru = mock.uploadFile;
      mock.uploadFile = () => Promise.reject(new Error("boom"));
      await __saveEdit();
      mock.uploadFile = ru;
      out.j = { same: JSON.stringify(await mock.getJson(__draftPath(id))) === json0, folder: await jpgs(mock) };
      __teardown();
    }
    // K: toast wording.
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      await __ph.slotPick("obverse", "#33f");
      await __saveEdit();
      out.k1 = toast();
      __teardown();
    }
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      await __ph.slotPick("obverse", "#33f");
      await __ph.galleryPick(/Reference/, "#aa3");
      await __saveEdit();
      out.k2 = toast();
      __teardown();
    }
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair.concat([{ type: "reference", filename: id + "_reference_01.jpg", caption: "" }]) }),
        Object.assign({ [id + "_reference_01.jpg"]: "#aa3" }, obvFiles));
      await __ph.slotPick("obverse", "#33f");
      await __ph.chooserPick(__ph.section(/Reference photos/).querySelector('[data-role="replace"]'), "#0ff");
      await __saveEdit();
      out.k3 = toast();
      __teardown();
    }
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await mock.uploadFile(folder + "/" + id + "_receipt.pdf", new Blob(["%PDF-old"], { type: "application/pdf" }));
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      await __ph.slotPick("obverse", "#33f");
      __ph.pick(document.getElementById("receiptLibraryInput"), new File(["%PDF-1.4 new"], "inv.pdf", { type: "application/pdf" }));
      await __ph.waitFor(() => !!receiptFiles["receiptPreview"]);
      await __saveEdit();
      out.k4 = toast();
      __teardown();
    }
    // L: Reject dialog wording, then Reject removes the folder.
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      await __ph.slotPick("obverse", "#33f");
      await __saveEdit();
      rejectStagedCoin(id);
      out.lBody = guardText();
      clickGuard("Reject");
      await __ph.waitFor(() => false, 300);
      out.lGone = (await mock.listChildren(folder)).length === 0 && !(await mock.getItemMeta(__draftPath(id)));
      __teardown();
    }
    // M: promotion.
    {
      const mock = await __setup(); __setLiveDbCoinsForTest(catalog);
      await mock.uploadFile(folder + "/" + id + "_receipt.pdf", new Blob(["%PDF-r"], { type: "application/pdf" }));
      await openEdit(mock, Object.assign({}, base, { photos: obvPair }), obvFiles);
      await __ph.slotPick("obverse", "#33f");
      await __saveEdit();
      const saved = await mock.getJson(__draftPath(id));
      saved.status = "Promoted";
      const moved = await movePromotedCoinFiles(saved);
      const p = writePaths();
      out.m = {
        allOk: moved.allOk,
        moved: moved.moves.map(m => m.src.split("/").pop()).sort(),
        oldInStaging: !!(await mock.getItemMeta(folder + "/" + O)) && !!(await mock.getItemMeta(folder + "/" + OR)),
        oldNotInCoinPhotos: !(await mock.getItemMeta(p.coinPhotos + "/" + O)) && !(await mock.getItemMeta(p.coinPhotos + "/" + OR)),
        newInCoinPhotos: !!(await mock.getItemMeta(p.coinPhotos + "/" + O2))
      };
      __teardown();
    }
    return out;
  }, { base: BASE_DRAFT, catalog: CATALOG, id: ID });

  const J = (v) => JSON.stringify(v);
  const O = ID + "_obverse_cropped.jpg", OR = ID + "_obverse_original.jpg";
  const O2 = ID + "_obverse_cropped_02.jpg", OR2 = ID + "_obverse_original_02.jpg";
  const O3 = ID + "_obverse_cropped_03.jpg", OR3 = ID + "_obverse_original_03.jpg";
  const all2 = [O, O2, OR, OR2].sort();

  ok(R.aPicked && J(R.a.listed) === J([O2, OR2]) && J(R.a.folder) === J(all2) && R.a.same,
    "A Replace: coin.json lists the new pair, the old pair stays in the folder byte-identical: " + J(R.a));
  ok(R.bDone && R.b.listed.length === 2 && R.b.folder.length === 4 && R.b.folder.indexOf(O) !== -1 && R.b.folder.indexOf(OR) !== -1 && R.b.same,
    "B Recrop keeps the old pair (and writes a second original, per Q2): " + J(R.b));
  ok(J(R.c.listed) === J([ID + "_slab_obverse.jpg", O2].sort()) && R.c.folder.indexOf(O) !== -1 && R.c.folder.indexOf(OR) !== -1 && R.c.same && R.c.srcSame,
    "C Crop from another photo into Obverse keeps the old pair, and the source photo is untouched: " + J(R.c));
  ok(R.dHolder && R.dRef && R.d.same &&
     R.d.folder.indexOf(ID + "_slab_obverse.jpg") !== -1 && R.d.folder.indexOf(ID + "_slab_obverse_02.jpg") !== -1 &&
     R.d.folder.indexOf(ID + "_reference_01.jpg") !== -1 && R.d.folder.indexOf(ID + "_reference_02.jpg") !== -1 &&
     J(R.d.listed) === J([ID + "_reference_02.jpg", ID + "_slab_obverse_02.jpg"]),
    "D Replacing a Holder photo (fixed name) and a Reference (repeatable) keeps both old files: " + J(R.d));
  ok(R.e1 && R.e2 && J(R.eLoaded) === J([O2]) && J(R.e.listed) === J([O3, OR3]) &&
     J(R.e.folder) === J([O, O2, O3, OR, OR2, OR3].sort()),
    "E two Replaces in separate edits: the second edit loads one slot, all three generations stay, the newest is listed: " + J([R.eLoaded, R.e]));
  ok(R.f1 && R.f2 && R.f3 && R.f.same && R.f.folder.indexOf(O) !== -1 && R.f.folder.indexOf(OR) !== -1 && R.f.listed.length === 2,
    "F Replace + Recrop + Replace in one edit keeps the ORIGINAL stored files: " + J([R.f1, R.f2, R.f3, R.f]));
  ok(/Remove photo\?|Remove/.test(R.gBody) && /its file is deleted from Staging then/.test(R.gBody) &&
     J(R.gBefore) === J([O, OR].sort()) && R.g.listed.length === 0 && R.g.folder.length === 0,
    "G X on a stored photo: the dialog says its file is deleted, nothing is deleted before Save, both files go on Save: " + J([R.gBody, R.gBefore, R.g]));
  ok(R.hPicked && /Put the previous photo back\?/.test(R.hTitle) && /Nothing is deleted/.test(R.hBody) &&
     !/removed|deleted from Staging/.test(R.hBody) && R.hRestored && R.hShown &&
     J(R.h.listed) === J([O, OR].sort()) && J(R.h.folder) === J([O, OR].sort()) && R.h.same,
    "H Replace then X on the pick UNDOES it: the original is back in its slot, nothing deleted or uploaded, coin.json unchanged: " + J([R.hTitle, R.hBody, R.hRestored, R.h]));
  ok(/its file is deleted from Staging then/.test(R.h2Body) && J(R.h2Before) === J([O, OR].sort()) &&
     R.h2.listed.length === 0 && R.h2.folder.length === 0,
    "H2 X on the restored original is the ordinary remove: stored-photo wording, both files deleted on Save only: " + J([R.h2Body, R.h2Before, R.h2]));
  ok(R.h3a && R.h3b && R.h3c && R.h3Restored && J(R.h3.listed) === J([O, OR].sort()) && J(R.h3.folder) === J([O, OR].sort()),
    "H3 Replace + Recrop + Replace then X restores the ORIGINAL stored photo, nothing uploaded: " + J([R.h3a, R.h3b, R.h3c, R.h3Restored, R.h3]));
  ok(R.h4IsReplace && R.h4Restored && J(R.h4.listed) === J([ID + "_slab_obverse.jpg", O, OR].sort()) && R.h4.folder.length === 3,
    "H4 Crop from another photo into Obverse counts as a Replace, and X undoes it: " + J([R.h4IsReplace, R.h4Restored, R.h4]));
  ok(R.iPicked && R.i.same && J(R.i.folder) === J([O, OR].sort()),
    "I Replace then leave without Save: coin.json and the folder are unchanged: " + J(R.i));
  ok(R.jPicked && R.j.same && J(R.j.folder) === J([O, OR].sort()),
    "J a failed upload leaves coin.json and the old files untouched: " + J(R.j));
  ok(/^Saved changes to .*\. 1 photo saved to Staging \(the old file is kept there\)\.$/.test(R.k1),
    "K1 all replaced: 1 photo saved to Staging (the old file is kept there): " + R.k1);
  ok(/2 photos saved to Staging \(1 replaced; its old file is kept there\)\./.test(R.k2),
    "K2 mixed: 2 photos saved to Staging (1 replaced; its old file is kept there): " + R.k2);
  ok(/2 photos saved to Staging \(the old files are kept there\)\./.test(R.k3),
    "K3 two replaced: the old files are kept there: " + R.k3);
  ok(/1 photo saved to Staging \(the old file is kept there\), receipt saved to Staging \(the old file is kept there\)\./.test(R.k4),
    "K4 photo and receipt both say the old file is kept: " + R.k4);
  ok(/older files kept after a Replace/.test(R.lBody) && R.lGone,
    "L the Reject dialog names the kept files, and Reject removes the whole folder: " + J([R.lBody, R.lGone]));
  ok(R.m.allOk && J(R.m.moved) === J([O2, OR2, ID + "_receipt.pdf"].sort()) && R.m.oldInStaging && R.m.oldNotInCoinPhotos && R.m.newInCoinPhotos,
    "M promotion moves only the listed files (and the receipt); the kept old pair stays in Staging: " + J(R.m));
}, module);
