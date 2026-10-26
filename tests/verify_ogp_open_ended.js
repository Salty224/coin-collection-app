// Open-ended Package / OGP (Oct 2026, claude/photos-wait-for-save, commit
// C3; backlog n, Ray's Q7 and Q8).
//
// WHY. Package/OGP was a fixed Front/Back pair. It is now open-ended like
// COA: any number of photos, each labelled ("Closed", "Open"…), PhotoType
// "OGP", files {ID}_ogp_NN.jpg. Existing OGP_Obverse / OGP_Reverse rows are
// mapped on read with no workbook write: they join the list, Front first,
// and while their label is blank show "Front" / "Back" on screen only.
//
//   O1  coin and Set screens: Package is tiles with a "+", no pair slots
//   O2  old Front/Back rows join the list, Front first, then Back, then the
//       rest; a blank label shows "Front"/"Back"; a real label shows itself
//   O3  reading writes nothing (no patch, no upload)
//   O4  two new labelled Package photos save as OGP rows {ID}_ogp_NN.jpg
//       with their labels; numbering continues past a stored _ogp_01
//   O5  Replace on the old Front: one row kept (PhotoID, PhotoType
//       OGP_Obverse, blank Label), only its file cells written; it stays
//       first and still reads "Front"
//   O6  the viewer's label field for an old Front is blank (the "Front" text
//       is never written)
//   O7  ✕ on the old Back removes it at Save (row blanked, file kept)
//   O8  the Set's flip photo: whole-set front first; then the first Package
//       photo in screen order (an old OGP_Obverse first); the back side
//       keeps the old OGP_Reverse
//   O9  Add Coin (draft mode): Package is open-ended; picks name as
//       {ID}_ogp_01/02 with their labels; promotion writes OGP rows
//   O10 the Staging-draft edit: _ogp_NN is read back as Package and the
//       next free name continues the numbering
//   O11 Add Set untouched: its Package Front/Back pair stays and its type
//       picker never offers the open-ended type
//   O12 layout at 360x800, 412x915 and 1024x768: tiles inside the screen

const { defineSuite } = require("./harness");

const HEADER = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "", "OriginalFilename"];

async function setup(page) {
  await page.evaluate(({ HEADER }) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
    window.__og = {
      sleep, patches: [], uploads: [], mock: null,
      coin: { id: "AY-00099", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" },
      set: { id: "AY-00090", name: "1957 Proof Set", denom: "Multiple", year: 1957, mint: "", category: "Proof Set" },
      // rows: [PhotoID, CollectionID, PhotoType, Filename, Label]
      install(rows) {
        const self = this;
        const ov = document.getElementById("writeGuardOverlay"); ov.classList.add("hidden");
        discardUnsavedPhotoEdits(); browseEditTouchedFields.clear(); addCoinTouchedFields.clear();
        if (mediaViewerIsOpen()) closeMediaViewer();
        closeImageSourceChooser();
        navigateNow("dashboard");
        const sheet = [HEADER].concat(rows.map(r => [r[0], r[1], r[2], "", r[3], r[4] || "", 46000, "keep-me", ""]))
          .concat([["", "", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", "", ""]]);
        const mock = createMockGraphClient({ sheets: { Photos: sheet } });
        this.mock = mock; this.patches = []; this.uploads = [];
        __setGraphClientForTest(new Proxy(mock, { get(t, k) {
          const v = t[k];
          if (typeof v !== "function") return v;
          return async (...a) => {
            if (k === "patchWorkbookRanges") self.patches.push(a[1] + "!" + a[2].map(e => e.address).join(","));
            if (k === "uploadFile" || k === "uploadBytes") self.uploads.push(String(a[0]).split("/").pop());
            return v.apply(t, a);
          };
        } }));
        __resetSheetHeaderMapsForTest();
        __setAddCoinWriteEnabledForTest(true);
        __setBrowseEditWriteEnabledForTest(true);
        __setLiveCoinsForTest([this.coin, this.set]);
        const idx = {};
        rows.forEach(r => (idx[r[1]] = idx[r[1]] || []).push({ photoId: r[0], photoType: r[2], galleryType: galleryTypeForPhotoType(r[2]),
          subGroupId: "", filename: r[3], originalFilename: "", label: r[4] || "" }));
        __setStoredPhotosForTest(idx);
        this.urls = {};
        rows.forEach(r => { const u = URL.createObjectURL(new Blob([new Uint8Array([1])], { type: "image/jpeg" })); this.urls[r[3]] = u; __setCoinPhotoCacheForTest(r[3], u); });
        delete galleryStore["AY-00099"]; delete galleryStore["AY-00090"]; delete galleryStore[ADDCOIN_GALLERY_ID];
      },
      rows(id) { return this.mock._grids.Photos.filter(r => r[1] === id).map(r => ({ id: r[0], type: r[2], file: r[4], label: r[5], date: r[6], extra: r[7] })); },
      openAll(host) {
        [...host.querySelectorAll(".accordion-header")].forEach(h => { if (h.getAttribute("aria-expanded") !== "true") h.click(); });
        return host;
      },
      section(host, re) {
        const h = [...host.querySelectorAll(".accordion-header")].find(x => re.test(x.textContent));
        return h ? h.nextElementSibling : null;
      },
      async open(screen) {
        if (screen === "editCoin") { navigate("browse"); showBrowseDetail(this.coin); showBrowseEditView(this.coin); await sleep(60); return this.openAll(document.getElementById("browseEditPhotosSections")); }
        if (screen === "manageCoin") { openManagePhotos({ id: this.coin.id, name: "x", meta: "", kind: "coin", backTo: () => {} }); await sleep(30); return this.openAll(document.getElementById("managePhotosSections")); }
        if (screen === "editSet") { navigate("browse"); showBrowseDetail(this.set); showBrowseEditSetView(this.set); await sleep(60); return this.openAll(document.getElementById("editSetPhotosSections")); }
        if (screen === "manageSet") { openManagePhotos({ id: this.set.id, name: "x", meta: "", kind: "set", backTo: () => {} }); await sleep(30); return this.openAll(document.getElementById("managePhotosSections")); }
      },
      pkg(host) { return this.section(host, /Package \/ OGP/); },
      tiles(host) {
        const b = this.pkg(host);
        return b ? [...b.querySelectorAll(".gc-thumb")].map(t => ({ file: t.dataset.file, label: (t.querySelector(".gc-label-line") || {}).textContent })) : null;
      },
      async jpeg() {
        const c = document.createElement("canvas"); c.width = 300; c.height = 200;
        const x = c.getContext("2d"); x.fillStyle = "#2a6"; x.fillRect(0, 0, 300, 200);
        const b = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
        return new File([b], "box.jpg", { type: "image/jpeg" });
      },
      async waitFor(fn, ms) { const end = Date.now() + (ms || 3000); while (Date.now() < end) { if (fn()) return true; await sleep(30); } return !!fn(); },
      async addVia(trigger) {
        if (!trigger) return false;
        const file = await this.jpeg();
        trigger.click();
        if (document.getElementById("imageSourceChooser").classList.contains("hidden")) return false;
        document.querySelector('#imageSourceChooser .image-chooser-btn[data-source="files"]').click();
        const input = document.getElementById("imageChooserFilesInput");
        const dt = new DataTransfer(); dt.items.add(file);
        input.files = dt.files; input.dispatchEvent(new Event("change", { bubbles: true }));
        const open = (id) => !document.getElementById(id).classList.contains("hidden");
        if (!(await this.waitFor(() => open("bgCropOverlay")))) return false;
        document.getElementById("bgCropUseBtn").click();
        if (await this.waitFor(() => open("photoAdjustOverlay"), 800)) document.getElementById("photoAdjustUseBtn").click();
        await sleep(150);
        return true;
      },
      // Types a label through the full-screen viewer, as the user does.
      label(thumb, text) {
        thumb.querySelector(".gc-label-line").click();
        const input = document.getElementById("mediaViewerLabelInput");
        input.value = text; input.dispatchEvent(new Event("input", { bubbles: true }));
        document.getElementById("mediaViewerLabelDone").click();
      },
    };
  }, { HEADER });
}

module.exports = defineSuite("ogp-open-ended", async ({ openApp, ok: okRaw, PHONE, TABLET }) => {
  const ok = (label, cond, data) => okRaw(!!cond, label + (cond ? "" : ": " + JSON.stringify(data)));
  const page = await openApp(PHONE);
  await setup(page);

  // ---------- O1/O2/O3 the four screens, with old Front/Back rows ------------
  const O1 = await page.evaluate(async () => {
    const G = __og;
    const out = {};
    for (const screen of ["editCoin", "manageCoin", "editSet", "manageSet"]) {
      const id = screen.endsWith("Coin") ? "AY-00099" : "AY-00090";
      // Index order deliberately NOT screen order: the new type first.
      G.install([
        ["PH-1", id, "OGP", id + "_ogp_01.jpg", "Closed"],
        ["PH-2", id, "OGP_Reverse", id + "_ogp_reverse.jpg", ""],
        ["PH-3", id, "OGP_Obverse", id + "_ogp_obverse.jpg", ""],
        ["PH-4", id, "OGP", id + "_ogp_02.jpg", "Open"],
      ]);
      const host = await G.open(screen);
      await G.sleep(120);
      const body = G.pkg(host);
      const header = body && body.previousElementSibling.textContent.replace(/\s+/g, " ");
      // A redraw too.
      if (photoHostRenders[id]) photoHostRenders[id].render();
      await G.sleep(60);
      out[screen] = {
        found: !!body, pairSlots: body ? body.querySelectorAll(".sg-photo-slot").length : -1,
        plus: body && body.querySelector("button.gc-add-tile") ? body.querySelector("button.gc-add-tile .sg-photo-add-label").textContent : null,
        hint: body ? (body.querySelector("p") || {}).textContent : null,
        tiles: G.tiles(host), header,
        writes: G.patches.length, uploads: G.uploads.length,
      };
    }
    return out;
  });
  const order = (id) => [[id + "_ogp_obverse.jpg", "Front"], [id + "_ogp_reverse.jpg", "Back"], [id + "_ogp_01.jpg", "Closed"], [id + "_ogp_02.jpg", "Open"]];
  for (const [screen, r] of Object.entries(O1)) {
    const id = screen.endsWith("Coin") ? "AY-00099" : "AY-00090";
    ok(`O1 ${screen}: Package / OGP is tiles with a "+ Package" tile and the label hint, no Front/Back pair slots`,
      r.found && r.pairSlots === 0 && r.plus === "Package" && /label each one/.test(r.hint || "") && /Closed/.test(r.hint || ""), r);
    ok(`O2 ${screen}: old rows join the list Front first, then Back, then the rest; blank labels read Front/Back on screen; real labels show themselves`,
      JSON.stringify((r.tiles || []).map(t => [t.file, t.label])) === JSON.stringify(order(id)) && /4 photos/.test(r.header || ""), r);
    ok(`O3 ${screen}: reading and redrawing write nothing (no patch, no upload)`, r.writes === 0 && r.uploads === 0, r);
  }

  // ---------- O4 two new labelled Package photos -----------------------------
  const O4 = await page.evaluate(async () => {
    const G = __og; const ID = "AY-00099";
    G.install([["PH-3", ID, "OGP_Obverse", ID + "_ogp_obverse.jpg", ""], ["PH-1", ID, "OGP", ID + "_ogp_01.jpg", "Closed"]]);
    let host = await G.open("editCoin");
    // A pick that is discarded first: it must not use up a number.
    const a0 = await G.addVia(G.pkg(host).querySelector("button.gc-add-tile"));
    discardUnsavedPhotoEdits(ID); photoHostRenders[ID].render(); await G.sleep(60);
    host = document.getElementById("browseEditPhotosSections");
    const a1 = await G.addVia(G.pkg(host).querySelector("button.gc-add-tile"));
    const a2 = await G.addVia(G.pkg(host).querySelector("button.gc-add-tile"));
    host = document.getElementById("browseEditPhotosSections");
    const pend = [...G.pkg(host).querySelectorAll(".gc-thumb")].filter(t => !/_ogp_(obverse|01)\.jpg$/.test(t.dataset.file));
    if (pend[0]) G.label(pend[0], "Inner tray");
    await G.sleep(60);
    host = document.getElementById("browseEditPhotosSections");
    const pend2 = [...G.pkg(host).querySelectorAll(".gc-thumb")].filter(t => !/_ogp_(obverse|01)\.jpg$/.test(t.dataset.file));
    if (pend2[1]) G.label(pend2[1], "Sleeve");
    await G.sleep(60);
    const before = { patches: G.patches.length, uploads: G.uploads.length };
    await savePhotosAndLabels(ID, null);
    await G.sleep(150);
    return { a0, a1, a2, before, rows: G.rows(ID), uploads: G.uploads.slice(),
      tiles: G.tiles(document.getElementById("browseEditPhotosSections")) };
  });
  const newRows = O4.rows.filter(r => r.type === "OGP" && r.id !== "PH-1");
  ok("O4a picks wait for Save: nothing written or uploaded before it", O4.a0 && O4.a1 && O4.a2 && O4.before.patches === 0 && O4.before.uploads === 0, O4);
  ok("O4b Save writes two new OGP rows {ID}_ogp_02/03.jpg with their typed labels (the discarded pick used no number)",
    JSON.stringify(newRows.map(r => [r.file, r.label])) === JSON.stringify([["AY-00099_ogp_02.jpg", "Inner tray"], ["AY-00099_ogp_03.jpg", "Sleeve"]]) &&
    JSON.stringify(O4.uploads) === JSON.stringify(["AY-00099_ogp_02.jpg", "AY-00099_ogp_03.jpg"]), O4);
  ok("O4c the old Front and the stored OGP row are untouched; the list still starts with Front",
    O4.rows.some(r => r.id === "PH-3" && r.type === "OGP_Obverse" && r.file === "AY-00099_ogp_obverse.jpg") &&
    O4.tiles && O4.tiles[0] && O4.tiles[0].label === "Front" && O4.tiles.length === 4, O4);

  // ---------- O5/O6 Replace on the old Front; its viewer field ---------------
  const O5 = await page.evaluate(async () => {
    const G = __og; const ID = "AY-00090";
    G.install([["PH-2", ID, "OGP_Reverse", ID + "_ogp_reverse.jpg", ""], ["PH-3", ID, "OGP_Obverse", ID + "_ogp_obverse.jpg", ""]]);
    let host = await G.open("editSet");
    const front = G.pkg(host).querySelector(`.gc-thumb[data-file="${ID}_ogp_obverse.jpg"]`);
    if (!front) return { missing: true, tiles: G.tiles(host) };
    // O6: the viewer's label field is blank, and Done with it blank changes nothing.
    front.querySelector(".gc-label-line").click(); await G.sleep(30);
    const field = document.getElementById("mediaViewerLabelInput").value;
    document.getElementById("mediaViewerLabelDone").click(); await G.sleep(30);
    const labelsAfterDone = unsavedPhotoLabelCount(ID);
    // O5: Replace it.
    host = document.getElementById("editSetPhotosSections");
    const rep = G.pkg(host).querySelector(`.gc-thumb[data-file="${ID}_ogp_obverse.jpg"] [data-role="replace"]`);
    const picked = await G.addVia(rep);
    host = document.getElementById("editSetPhotosSections");
    const before = G.tiles(host);
    G.patches = [];
    await savePhotosAndLabels(ID, null);
    await G.sleep(150);
    return { field, labelsAfterDone, picked, before, after: G.tiles(document.getElementById("editSetPhotosSections")),
      rows: G.rows(ID), patches: G.patches.slice(), uploads: G.uploads.slice() };
  });
  const r3 = (O5.rows || []).find(r => r.id === "PH-3") || {};
  ok("O5a Replace on the old Front keeps its row: same PhotoID, PhotoType OGP_Obverse, blank Label, DateAdded and the extra column kept, new file {ID}_ogp_01.jpg",
    O5.picked && r3.type === "OGP_Obverse" && r3.label === "" && r3.date === 46000 && r3.extra === "keep-me" && r3.file === "AY-00090_ogp_01.jpg" &&
    (O5.rows || []).filter(r => /^OGP/.test(r.type)).length === 2, O5);
  ok("O5b only the file cells are written (Filename, OriginalFilename), nothing else",
    !!O5.patches && O5.patches.length >= 1 && O5.patches.every(p => /^Photos!((E|I)\d+:(E|I)\d+,?)+$/.test(p)), O5);
  ok("O5c the replaced photo stays first and still reads \"Front\" (before and after Save)",
    O5.before && O5.before[0].label === "Front" && O5.after && O5.after[0].label === "Front" && O5.after[0].file === "AY-00090_ogp_01.jpg" && O5.after[1].label === "Back", O5);
  ok("O6 the viewer's label field for an old Front is blank, and Done leaves nothing to save (the \"Front\" text is never written)",
    O5.field === "" && O5.labelsAfterDone === 0, O5);

  // ---------- O7 ✕ on the old Back -------------------------------------------
  const O7 = await page.evaluate(async () => {
    const G = __og; const ID = "AY-00099";
    G.install([["PH-2", ID, "OGP_Reverse", ID + "_ogp_reverse.jpg", ""], ["PH-3", ID, "OGP_Obverse", ID + "_ogp_obverse.jpg", ""]]);
    const host = await G.open("manageCoin");
    const back = G.pkg(host).querySelector(`.gc-thumb[data-file="${ID}_ogp_reverse.jpg"] .gc-remove`);
    if (!back) return { missing: true, beforeSave: {}, tiles: G.tiles(host) };
    back.click(); await G.sleep(30);
    const b = [...document.querySelectorAll("#writeGuardBtns button")].find(x => x.textContent === "Remove"); if (b) b.click();
    await G.sleep(30);
    const beforeSave = { tiles: G.tiles(document.getElementById("managePhotosSections")), patches: G.patches.length };
    await savePhotosAndLabels(ID, null); await G.sleep(150);
    const row2 = G.mock._grids.Photos.find(r => r[4] === ID + "_ogp_reverse.jpg");
    return { beforeSave, rowGone: !row2, front: G.rows(ID).find(r => r.id === "PH-3"),
      tiles: G.tiles(document.getElementById("managePhotosSections")) };
  });
  ok("O7 ✕ on the old Back hides it until Save, writes nothing before; Save blanks its row and leaves Front",
    O7.beforeSave.patches === 0 && !!O7.beforeSave.tiles && O7.beforeSave.tiles.length === 1 && O7.rowGone && O7.front && O7.front.type === "OGP_Obverse" &&
    !!O7.tiles && O7.tiles.length === 1 && O7.tiles[0].label === "Front", O7);

  // ---------- O8 the Set's flip photo -----------------------------------------
  const O8 = await page.evaluate(async () => {
    const G = __og; const ID = "AY-00090"; const set = G.set;
    const u = (n) => "blob:test-" + n;
    const run = (entries) => { delete galleryStore[ID]; entries.forEach(e => galleryFor(ID).push(e)); return [setFlipPhotoUrl(set, "obverse"), setFlipPhotoUrl(set, "reverse")]; };
    const r = {
      oldFrontOnly: run([{ type: "ogp_obverse", url: u("front") }]),
      newFirstInList: run([{ type: "ogp", url: u("closed") }, { type: "ogp_reverse", url: u("back") }, { type: "ogp_obverse", url: u("front") }]),
      newOnly: run([{ type: "ogp", url: u("closed") }, { type: "ogp", url: u("open") }]),
      wholeWins: run([{ type: "ogp_obverse", url: u("front") }, { type: "subgroup_obverse", subGroupId: DEFAULT_SUBGROUP_ID, url: u("whole") }]),
      replacedFront: run([{ type: "ogp", url: u("closed") }, { type: "ogp", packageSide: "front", url: u("newfront") }]),
    };
    // The Set's page paints it.
    run([{ type: "ogp", url: u("closed") }, { type: "ogp_obverse", url: u("front") }]);
    const el = document.createElement("div"); renderSetStaticPhoto(el, set);
    r.page = el.innerHTML.indexOf("blob:test-front") !== -1 || (el.style.backgroundImage || "").indexOf("blob:test-front") !== -1;
    delete galleryStore[ID];
    return r;
  });
  ok("O8a an existing Set with only an OGP_Obverse photo shows the same flip photo as before", O8.oldFrontOnly[0] === "blob:test-front", O8);
  ok("O8b with an old Front and new Package photos, the old Front still leads (screen order, not list order); the back keeps OGP_Reverse",
    O8.newFirstInList[0] === "blob:test-front" && O8.newFirstInList[1] === "blob:test-back", O8);
  ok("O8c with only new Package photos the first one is the front; nothing for the back", O8.newOnly[0] === "blob:test-closed" && O8.newOnly[1] === null, O8);
  ok("O8d the whole-set front still comes first", O8.wholeWins[0] === "blob:test-whole", O8);
  ok("O8e a replaced old Front keeps leading", O8.replacedFront[0] === "blob:test-newfront", O8);
  ok("O8f the Set's own page paints that photo", O8.page, O8);

  // ---------- O9 Add Coin (draft mode) ----------------------------------------
  const O9 = await page.evaluate(async () => {
    const G = __og;
    G.install([]);
    navigate("addcoin"); await G.sleep(60);
    renderAddCoinPhotos();
    let host = G.openAll(document.getElementById("addCoinPhotoSections"));
    const body = G.pkg(host);
    const shape = { pairSlots: body ? body.querySelectorAll(".sg-photo-slot").length : -1, plus: !!(body && body.querySelector("button.gc-add-tile")) };
    const a1 = await G.addVia(body && body.querySelector("button.gc-add-tile"));
    host = document.getElementById("addCoinPhotoSections");
    const a2 = await G.addVia(G.pkg(host).querySelector("button.gc-add-tile"));
    host = document.getElementById("addCoinPhotoSections");
    let thumbs = [...G.pkg(host).querySelectorAll(".gc-thumb")];
    if (thumbs[0]) G.label(thumbs[0], "Closed"); await G.sleep(40);
    thumbs = [...G.pkg(document.getElementById("addCoinPhotoSections")).querySelectorAll(".gc-thumb")];
    if (thumbs[1]) G.label(thumbs[1], "Open"); await G.sleep(40);
    const writesBefore = G.patches.length + G.uploads.length;
    const up = await uploadCoinDraftPhotos("AY-00501");
    const draft = { collectionID: "AY-00501", photos: up.uploaded };
    __setLiveCoinsForTest([G.coin, G.set, { id: "AY-00501", name: "x", denom: "10C", year: 1916 }]);
    const rec = await recordPromotedCoinRecords(draft);
    const out = { shape, a1, a2, writesBefore, uploaded: up.uploaded, failed: up.failed, rows: G.rows("AY-00501"), recFailed: rec.failed };
    resetAddCoinForm(); clearCoinDraftEditContext();
    navigateNow("dashboard");
    return out;
  });
  ok("O9a Add Coin's Package is open-ended too (tiles and a +, no pair)", O9.shape.pairSlots === 0 && O9.shape.plus && O9.a1 && O9.a2, O9);
  ok("O9b nothing is written before the draft is saved", O9.writesBefore === 0, O9);
  ok("O9c the draft's Package photos are {ID}_ogp_01/02.jpg, type ogp, with their labels",
    JSON.stringify(O9.uploaded.map(e => [e.type, e.filename, e.caption])) ===
      JSON.stringify([["ogp", "AY-00501_ogp_01.jpg", "Closed"], ["ogp", "AY-00501_ogp_02.jpg", "Open"]]) && O9.failed.length === 0, O9);
  ok("O9d promotion writes them as OGP rows with their labels",
    JSON.stringify(O9.rows.map(r => [r.type, r.file, r.label])) ===
      JSON.stringify([["OGP", "AY-00501_ogp_01.jpg", "Closed"], ["OGP", "AY-00501_ogp_02.jpg", "Open"]]) && O9.recFailed.length === 0, O9);

  // ---------- O10 the Staging-draft edit's names -------------------------------
  const O10 = await page.evaluate(async () => {
    const G = __og; G.install([]);
    const t = (n) => stagingPhotoTypeFromFilename("AY-00501", n);
    const next = await nextFreeStagingRepeatableFilename("AY-00501", "ogp", new Set(["AY-00501_ogp_01.jpg", "AY-00501_ogp_02.jpg", "AY-00501_ogp_obverse.jpg"]));
    return { n03: t("AY-00501_ogp_03.jpg"), front: t("AY-00501_ogp_obverse.jpg"), back: t("AY-00501_ogp_reverse.jpg"), next };
  });
  ok("O10a a Staging draft's {ID}_ogp_NN file reads back as Package; old _ogp_obverse/_ogp_reverse files as the old Front/Back",
    O10.n03 && O10.n03.type === "ogp" && O10.front && O10.front.type === "ogp_obverse" && O10.back && O10.back.type === "ogp_reverse", O10);
  ok("O10b the next free Staging name continues the numbering (_ogp_03), old Front files not counted", O10.next === "AY-00501_ogp_03.jpg", O10);

  // ---------- O11 Add Set untouched -------------------------------------------
  const O11 = await page.evaluate(async () => {
    const G = __og; G.install([]);
    navigate("addset"); await G.sleep(60);
    if (typeof renderAddSetDocs === "function") renderAddSetDocs();
    const docs = document.getElementById("addSetDocsSlots");
    const names = docs ? [...docs.querySelectorAll(".name")].map(n => n.textContent) : [];
    const pkgWrap = docs ? [...docs.children].find(c => /Package \/ OGP/.test(c.textContent)) : null;
    openGalleryTypePicker("set", () => {});
    const picker = [...document.querySelectorAll("#galleryTypePickerList .gtp-item")].map(b => b.textContent);
    document.getElementById("galleryTypePickerOverlay").classList.add("hidden");
    openGalleryTypePicker("coin", () => {});
    const pickerCoin = [...document.querySelectorAll("#galleryTypePickerList .gtp-item")].map(b => b.textContent);
    document.getElementById("galleryTypePickerOverlay").classList.add("hidden");
    navigateNow("dashboard");
    return { names, pairSlots: pkgWrap ? pkgWrap.querySelectorAll(".sg-photo-slot").length : -1, picker, pickerCoin };
  });
  ok("O11a Add Set keeps its own Package Front/Back pair", O11.pairSlots === 2, O11);
  ok("O11b Add Set's type picker (and the coin one) never offer the open-ended Package type; the old Front/Back still listed for a Set",
    !O11.picker.some(t => /^📦Package$/.test(t.replace(/\s+/g, ""))) && !O11.pickerCoin.some(t => /^📦Package$/.test(t.replace(/\s+/g, ""))) &&
    O11.picker.some(t => /Package \(OGP\) — front/.test(t)), O11);

  // ---------- O12 layout -----------------------------------------------------
  for (const vp of [{ width: 360, height: 800 }, PHONE, TABLET]) {
    for (const screen of ["editCoin", "manageSet"]) {
      const p = await openApp(vp);
      await setup(p);
      const L = await p.evaluate(async (screen) => {
        const G = __og;
        const id = screen === "editCoin" ? "AY-00099" : "AY-00090";
        G.install([["PH-3", id, "OGP_Obverse", id + "_ogp_obverse.jpg", ""], ["PH-2", id, "OGP_Reverse", id + "_ogp_reverse.jpg", ""],
                   ["PH-1", id, "OGP", id + "_ogp_01.jpg", "Closed with a long label that runs on"], ["PH-4", id, "OGP", id + "_ogp_02.jpg", "Open"]]);
        const host = await G.open(screen);
        await G.sleep(200);
        const body = G.pkg(host);
        const inner = window.innerWidth;
        const br = body.getBoundingClientRect();
        const items = [...body.querySelectorAll(".gc-thumb, button.gc-add-tile")].map(t => t.getBoundingClientRect());
        const reps = [...body.querySelectorAll(".gc-thumb")].map(t => {
          const tr = t.getBoundingClientRect(); const b = t.querySelector('[data-role="replace"]').getBoundingClientRect();
          return b.left >= tr.left - 0.5 && b.right <= tr.right + 0.5;
        });
        return { inner, inBody: items.every(r => r.left >= br.left - 0.5 && r.right <= br.right + 0.5), reps,
          n: items.length, pageScroll: document.documentElement.scrollWidth > inner };
      }, screen);
      const tag = screen + " " + vp.width + "x" + vp.height;
      ok(`O12 ${tag}: four Package tiles and the + inside the card, each Replace inside its tile, no sideways scroll`,
        L.n === 5 && L.inBody && L.reps.length === 4 && L.reps.every(Boolean) && !L.pageScroll, L);
      await p.close();
    }
  }
}, module);
