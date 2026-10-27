// A Replace never writes over an existing photo file (Oct 2026,
// claude/photos-wait-for-save, Ray's tablet test of 826e2d4).
//
// WHY. AY-00724's Holder back was replaced on the tablet: row PH-00038 kept
// Filename AY-00724_slab_reverse.jpg and the new picture was uploaded OVER
// the old file. Every fixed-name type (Obverse, Reverse, Holder front/back,
// a Set's whole-set and sub-group pairs) did this on Replace and Recrop —
// on main too. Numbered types (_reference_NN…) were already safe.
//
//   SELF the shared check helper's must-fail self-check
//   R1  Holder back Replace: the new photo is AY-00724_slab_reverse_02.jpg,
//       the old file's bytes are untouched, row PH-00038 points at _02
//       (DateAdded and the row count unchanged)
//   R2  a second Replace takes _03; _02 is untouched
//   R3  Obverse Replace with its original: _obverse_cropped_02 and
//       _obverse_original_02 (one number), both old files untouched, both
//       cells point at the new pair
//   R4  Recrop from the original: the row keeps the original it came from;
//       only the new crop is uploaded (no second copy of the original)
//   R5  a first photo for an empty slot takes the plain name; a file with no
//       row already under that name is never written over (_02 instead)
//   R6  a file that appears under the chosen name after the check: the
//       upload is refused (409), nothing is overwritten, the photo stays
//       "not saved", and the next Save picks a free name and lands
//   R7  every CoinPhotos upload and every new Staging photo asks for
//       no-overwrite (conflictBehavior=fail on the real client)
//   R8  promotion moves never overwrite: a different file at the destination
//       is refused (source kept), the same bytes finish an interrupted move,
//       an empty destination is copied with no-overwrite
//   R9  Staging-draft edit: a fixed-name Replace takes _02 (crop and
//       original together); the numbered names are read back correctly
//   R10 the crop/original pairing handles numbered names
//   I1  PhotoID: two photos committed at the same moment get different ids
//       (PH-00129 was on two AY-00212 rows); a lagging column read still
//       can't repeat an id; two new receipts at once get different ReceiptIDs

const { defineSuite } = require("./harness");

const HEADER = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"];

module.exports = defineSuite("replace-never-overwrites", async ({ openApp, check, selfCheck, PHONE }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);
  await page.evaluate((HEADER) => {
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
    const ID = "AY-00724";
    window.__r = {
      ID, HEADER,
      blob(tag) { return new Blob([new TextEncoder().encode(tag)], { type: "image/jpeg" }); },
      url(tag) { return URL.createObjectURL(this.blob(tag)); },
      async text(v) { return v == null ? null : (typeof v.text === "function" ? await v.text() : String(v)); },
      install(extraRows, extraFiles) {
        const self = this;
        discardUnsavedPhotoEdits();
        const rows = [HEADER,
          ["PH-00038", ID, "Slab_Reverse", "", ID + "_slab_reverse.jpg", "", 46300, ""],
          ["PH-00040", ID, "Obverse", "", ID + "_obverse_cropped.jpg", "", 46301, ID + "_obverse_original.jpg"]]
          .concat(extraRows || []);
        for (let i = 0; i < 6; i++) rows.push(["", "", "", "", "", "", "", ""]);
        const mock = createMockGraphClient({ sheets: { Photos: rows } });
        this.mock = mock;
        this.uploads = []; this.opts = []; this.lieAbout = {};
        const cp = writePaths().coinPhotos + "/";
        this.cp = cp;
        const files = Object.assign({
          [ID + "_slab_reverse.jpg"]: "OLD-HOLDER-BACK",
          [ID + "_obverse_cropped.jpg"]: "OLD-OBV-CROP",
          [ID + "_obverse_original.jpg"]: "OLD-OBV-ORIGINAL",
        }, extraFiles || {});
        Object.keys(files).forEach(n => mock._store.set(cp + n, { kind: "bytes", value: this.blob(files[n]) }));
        __setGraphClientForTest(new Proxy(mock, { get(t, k) {
          const v = t[k];
          if (typeof v !== "function") return v;
          return (...a) => {
            if (k === "uploadFile" || k === "uploadBytes") { self.uploads.push(String(a[0])); self.opts.push({ path: String(a[0]), noOverwrite: !!(a[2] && a[2].noOverwrite) }); }
            if (k === "getItemMeta" && self.lieAbout[String(a[0]).split("/").pop()]) return Promise.resolve(null);
            return v.apply(t, a);
          };
        } }));
        __resetSheetHeaderMapsForTest();
        __resetMintedIdsForTest();
        __setAddCoinWriteEnabledForTest(true);
        __setBrowseEditWriteEnabledForTest(true);
        __setLiveCoinsForTest([{ id: ID, name: "2026 Holder test", denom: "1C", year: 2026, mint: "", description: "Lincoln Cent" }]);
        __setStoredPhotosForTest({ [ID]: [
          { photoId: "PH-00038", photoType: "Slab_Reverse", galleryType: "slab_reverse", subGroupId: "", filename: ID + "_slab_reverse.jpg", originalFilename: "", label: "" },
          { photoId: "PH-00040", photoType: "Obverse", galleryType: "obverse", subGroupId: "", filename: ID + "_obverse_cropped.jpg", originalFilename: ID + "_obverse_original.jpg", label: "" },
        ] });
        Object.keys(files).forEach(n => __setCoinPhotoCacheForTest(n, this.url(files[n])));
        delete galleryStore[ID];
        galleryStore[ID] = [
          { type: "slab_reverse", url: this.url("x"), stored: true, filename: ID + "_slab_reverse.jpg", storedFilename: ID + "_slab_reverse.jpg", storedPhotoId: "PH-00038", savedLabel: "", caption: "" },
          { type: "obverse", url: this.url("x"), stored: true, filename: ID + "_obverse_cropped.jpg", storedFilename: ID + "_obverse_cropped.jpg", storedOriginalFilename: ID + "_obverse_original.jpg", storedPhotoId: "PH-00040", savedLabel: "", caption: "" },
        ];
      },
      entry(type) { return galleryFor(this.ID).find(e => e.type === type); },
      async file(name) { const e = this.mock._store.get(this.cp + name); return e ? await this.text(e.value) : null; },
      row(pid) { const r = this.mock._grids.Photos.find(x => x[0] === pid); return r ? { filename: r[4], original: r[7], date: r[6], type: r[2] } : null; },
      rowCount() { return this.mock._grids.Photos.filter(r => r[0]).length; },
      // A new pick for a type, as the crop pipeline hands it over (named with
      // the type's plain convention name, as runCropPipeline does).
      pick(type, tag, withRaw) {
        const n = galleryFilenameFor(this.ID, type, 0, "");
        return { type, url: this.url(tag), blob: this.blob(tag), caption: "", filename: n.cropped,
          rawUrl: withRaw ? this.url(tag + "-RAW") : null, rawFilename: withRaw ? n.raw : null };
      },
      async replace(type, tag, withRaw, tweak) {
        const ne = this.pick(type, tag, withRaw);
        if (tweak) tweak(ne);
        replaceGalleryEntryAndCommit(this.ID, this.entry(type), ne, () => {});
        const res = await savePendingPhotos(this.ID);
        return { res, ne };
      },
    };
  }, HEADER);

  // ---------- R1 / R2 Holder back --------------------------------------------
  const R1 = await page.evaluate(async () => {
    const R = __r; R.install();
    const before = R.rowCount();
    const { res, ne } = await R.replace("slab_reverse", "NEW-HOLDER-BACK-1");
    const out = { res, name: ne.filename, rowAfter: R.row("PH-00038"), before, after: R.rowCount(),
      oldBytes: await R.file(R.ID + "_slab_reverse.jpg"), newBytes: await R.file(R.ID + "_slab_reverse_02.jpg"),
      pending: !!ne.pendingSave, error: ne.uploadError || "" };
    const second = await R.replace("slab_reverse", "NEW-HOLDER-BACK-2");
    out.name2 = second.ne.filename;
    out.row2 = R.row("PH-00038");
    out.bytes02 = await R.file(R.ID + "_slab_reverse_02.jpg");
    out.bytes03 = await R.file(R.ID + "_slab_reverse_03.jpg");
    out.oldBytes2 = await R.file(R.ID + "_slab_reverse.jpg");
    return out;
  });
  ok("R1a Holder back Replace uploads under a new name (_slab_reverse_02)", R1.name === "AY-00724_slab_reverse_02.jpg" && R1.newBytes === "NEW-HOLDER-BACK-1", R1);
  ok("R1b the old Holder back file is untouched", R1.oldBytes === "OLD-HOLDER-BACK", R1);
  ok("R1c row PH-00038 now points at _02, DateAdded kept, no row added",
    R1.rowAfter && R1.rowAfter.filename === "AY-00724_slab_reverse_02.jpg" && R1.rowAfter.date === 46300 && R1.after === R1.before, R1);
  ok("R1d the photo saved (not pending, no error, counted as replaced)", !R1.pending && !R1.error && R1.res.replaced === 1, R1);
  ok("R2a a second Replace takes _03", R1.name2 === "AY-00724_slab_reverse_03.jpg" && R1.row2.filename === "AY-00724_slab_reverse_03.jpg", R1);
  ok("R2b _02 and the original file are both untouched", R1.bytes02 === "NEW-HOLDER-BACK-1" && R1.bytes03 === "NEW-HOLDER-BACK-2" && R1.oldBytes2 === "OLD-HOLDER-BACK", R1);

  // ---------- R3 Obverse with its original -----------------------------------
  const R3 = await page.evaluate(async () => {
    const R = __r; R.install();
    const { ne } = await R.replace("obverse", "NEW-OBV", true);
    return { crop: ne.filename, raw: ne.rawFilename, row: R.row("PH-00040"),
      oldCrop: await R.file(R.ID + "_obverse_cropped.jpg"), oldRaw: await R.file(R.ID + "_obverse_original.jpg"),
      newCrop: await R.file(R.ID + "_obverse_cropped_02.jpg"), newRaw: await R.file(R.ID + "_obverse_original_02.jpg") };
  });
  ok("R3a Obverse Replace: crop and original take one new number",
    R3.crop === "AY-00724_obverse_cropped_02.jpg" && R3.raw === "AY-00724_obverse_original_02.jpg" && R3.newCrop === "NEW-OBV" && R3.newRaw === "NEW-OBV-RAW", R3);
  ok("R3b the old crop and the old original are untouched", R3.oldCrop === "OLD-OBV-CROP" && R3.oldRaw === "OLD-OBV-ORIGINAL", R3);
  ok("R3c the row's Filename and OriginalFilename point at the new pair",
    R3.row.filename === "AY-00724_obverse_cropped_02.jpg" && R3.row.original === "AY-00724_obverse_original_02.jpg", R3);

  // ---------- R4 Recrop from the original ------------------------------------
  const R4 = await page.evaluate(async () => {
    const R = __r; R.install();
    const src = await resolveStoredAdjustSource(R.entry("obverse"));
    const { ne } = await R.replace("obverse", "RECROP", true, (e) => { e.rawFilename = src.filename; e.rawStored = true; });
    return { src: src && { filename: src.filename, fromRaw: src.fromRaw }, crop: ne.filename, row: R.row("PH-00040"),
      uploads: R.uploads.slice(), oldCrop: await R.file(R.ID + "_obverse_cropped.jpg"), oldRaw: await R.file(R.ID + "_obverse_original.jpg"),
      // The two call sites hand a stored original over this way.
      wiredStored: /if \(src\.fromRaw\) \{ newEntry\.rawFilename = src\.filename; newEntry\.rawStored = true; \}/.test(adjustStoredPhoto.toString()),
    };
  });
  ok("R4a Recrop opens on the stored original", R4.src && R4.src.fromRaw && R4.src.filename === "AY-00724_obverse_original.jpg", R4);
  ok("R4b only the new crop is uploaded, under _cropped_02",
    R4.crop === "AY-00724_obverse_cropped_02.jpg" && R4.uploads.length === 1 && /_obverse_cropped_02\.jpg$/.test(R4.uploads[0]), R4);
  ok("R4c the row keeps the original it came from; old files untouched",
    R4.row.filename === "AY-00724_obverse_cropped_02.jpg" && R4.row.original === "AY-00724_obverse_original.jpg" &&
    R4.oldCrop === "OLD-OBV-CROP" && R4.oldRaw === "OLD-OBV-ORIGINAL", R4);
  ok("R4d Recrop from the original hands the stored original over", R4.wiredStored, R4);

  // ---------- R5 first photo for an empty slot --------------------------------
  const R5 = await page.evaluate(async () => {
    const R = __r;
    R.install(null, { "AY-00724_slab_obverse.jpg": "STRAY-NO-ROW" });
    const e1 = R.pick("slab_obverse", "NEW-HOLDER-FRONT");
    addGalleryEntryAndCommit(R.ID, e1, () => {});
    await savePendingPhotos(R.ID);
    const stray = await R.file("AY-00724_slab_obverse.jpg");
    // An empty slot with nothing on file: the plain name.
    R.install();
    const e2 = R.pick("reverse", "NEW-REV", true);
    addGalleryEntryAndCommit(R.ID, e2, () => {});
    await savePendingPhotos(R.ID);
    return { name1: e1.filename, stray, name2: e2.filename, raw2: e2.rawFilename };
  });
  ok("R5a a file with no row under the plain name is never written over (_02 instead)",
    R5.name1 === "AY-00724_slab_obverse_02.jpg" && R5.stray === "STRAY-NO-ROW", R5);
  ok("R5b an empty slot with nothing on file takes the plain names",
    R5.name2 === "AY-00724_reverse_cropped.jpg" && R5.raw2 === "AY-00724_reverse_original.jpg", R5);

  // ---------- R6 a file appears after the check ------------------------------
  const R6 = await page.evaluate(async () => {
    const R = __r; R.install();
    R.lieAbout["AY-00724_slab_reverse_02.jpg"] = true;
    // _02 exists, but the name check is told it doesn't (written elsewhere
    // between the check and the upload).
    R.mock._store.set(R.cp + "AY-00724_slab_reverse_02.jpg", { kind: "bytes", value: R.blob("SOMEONE-ELSES") });
    const { ne, res } = await R.replace("slab_reverse", "MINE");
    const first = { failed: res.failed.length, error: ne.uploadError || "", pending: !!ne.pendingSave,
      resolved: !!ne.filenameResolved, theirs: await R.file("AY-00724_slab_reverse_02.jpg"),
      old: await R.file("AY-00724_slab_reverse.jpg"), row: R.row("PH-00038") };
    R.lieAbout = {};
    const res2 = await savePendingPhotos(R.ID);
    return { first, second: { failed: res2.failed.length, name: ne.filename, row: R.row("PH-00038"),
      mine: await R.file(ne.filename), theirs: await R.file("AY-00724_slab_reverse_02.jpg") } };
  });
  ok("R6a the upload is refused: their file and the old file are untouched, the row unchanged",
    R6.first.failed === 1 && R6.first.theirs === "SOMEONE-ELSES" && R6.first.old === "OLD-HOLDER-BACK" &&
    R6.first.row.filename === "AY-00724_slab_reverse.jpg", R6);
  ok("R6b the photo stays not-saved with a message, and its name will be chosen again",
    R6.first.pending && /nothing was overwritten/.test(R6.first.error) && !R6.first.resolved, R6);
  ok("R6c the next Save picks a free name and lands",
    R6.second.failed === 0 && R6.second.name === "AY-00724_slab_reverse_03.jpg" && R6.second.mine === "MINE" &&
    R6.second.theirs === "SOMEONE-ELSES" && R6.second.row.filename === "AY-00724_slab_reverse_03.jpg", R6);

  // ---------- R7 every photo upload asks for no-overwrite --------------------
  const R7 = await page.evaluate(async () => {
    const R = __r; R.install();
    await R.replace("slab_reverse", "A");
    await R.replace("obverse", "B", true);
    const gallery = R.opts.slice();
    // A fresh Add Coin draft's photos go to a new Staging folder.
    R.install();
    resetAddCoinForm();
    const e = R.pick("obverse", "DRAFT", true);
    addGalleryEntry(ADDCOIN_GALLERY_ID, e);
    await uploadCoinDraftPhotos("AY-00999");
    const draft = R.opts.slice();
    // A Staging-draft edit's new photo.
    R.install();
    const src = uploadStagingEditFiles.toString();
    // The real client turns the option into conflictBehavior=fail.
    const real = RealGraphClient.putContent.toString();
    resetAddCoinForm();
    return { gallery, draft, stagingPassesIt: /uploadFile\(folder \+ "\/" \+ name, blob, NO_OVERWRITE\)/.test(src),
      realQuery: real.indexOf("@microsoft.graph.conflictBehavior=fail") !== -1 };
  });
  ok("R7a every CoinPhotos upload from a Save asks for no-overwrite", R7.gallery.length === 3 && R7.gallery.every(o => o.noOverwrite), R7);
  ok("R7b a new Add Coin draft's photos ask for no-overwrite", R7.draft.length === 2 && R7.draft.every(o => o.noOverwrite), R7);
  ok("R7c a Staging-draft edit's uploads ask for no-overwrite", R7.stagingPassesIt, R7);
  ok("R7d the real client sends conflictBehavior=fail", R7.realQuery, R7);

  // ---------- R8 promotion moves ---------------------------------------------
  const R8 = await page.evaluate(async () => {
    const R = __r; R.install();
    const st = (p, tag) => R.mock._store.set(p, { kind: "bytes", value: R.blob(tag) });
    const S = "CoinCollection/_Testing/Staging/AY-00888/";
    const D = R.cp;
    st(S + "a.jpg", "SRC-A"); st(D + "a.jpg", "SOMETHING-ELSE");      // different file there
    st(S + "b.jpg", "SRC-B"); st(D + "b.jpg", "SRC-B");               // interrupted earlier copy
    st(S + "c.jpg", "SRC-C");                                          // empty destination
    const a = await moveFileWithoutOverwrite({ src: S + "a.jpg", dest: D + "a.jpg" });
    const b = await moveFileWithoutOverwrite({ src: S + "b.jpg", dest: D + "b.jpg" });
    R.opts = [];
    const c = await moveFileWithoutOverwrite({ src: S + "c.jpg", dest: D + "c.jpg" });
    return { a: { ok: a.ok, reason: a.reason, dest: await R.text(R.mock._store.get(D + "a.jpg").value), srcKept: R.mock._store.has(S + "a.jpg") },
      b: { ok: b.ok, srcGone: !R.mock._store.has(S + "b.jpg"), dest: await R.text(R.mock._store.get(D + "b.jpg").value) },
      c: { ok: c.ok, dest: await R.text(R.mock._store.get(D + "c.jpg").value), srcGone: !R.mock._store.has(S + "c.jpg"), opts: R.opts.slice() },
      coinUses: /moveFileWithoutOverwrite\(m\)/.test(movePromotedCoinFiles.toString()),
      setUses: /moveFileWithoutOverwrite\(m\)/.test(movePromotedSetFiles.toString()) };
  });
  ok("R8a a different file at the destination is refused: nothing overwritten, source kept",
    !R8.a.ok && R8.a.dest === "SOMETHING-ELSE" && R8.a.srcKept && /nothing overwritten/.test(R8.a.reason), R8);
  ok("R8b the same bytes at the destination finish an interrupted move", R8.b.ok && R8.b.srcGone && R8.b.dest === "SRC-B", R8);
  ok("R8c an empty destination is copied with no-overwrite, then the source deleted",
    R8.c.ok && R8.c.dest === "SRC-C" && R8.c.srcGone && R8.c.opts.length === 1 && R8.c.opts[0].noOverwrite, R8);
  ok("R8d coin and Set promotion both move this way", R8.coinUses && R8.setUses, R8);

  // ---------- R9 Staging-draft edit names --------------------------------------
  const R9 = await page.evaluate(async () => {
    const R = __r; R.install();
    const id = "AY-00777";
    const folder = coinDraftFolder(id) + "/";
    R.mock._store.set(folder + id + "_slab_reverse.jpg", { kind: "bytes", value: R.blob("x") });
    const taken = new Set([id + "_slab_reverse.jpg", id + "_obverse_cropped.jpg", id + "_obverse_original.jpg"]);
    const holder = await stagingEditNamesFor(id, { type: "slab_reverse", rawUrl: null }, taken);
    const obv = await stagingEditNamesFor(id, { type: "obverse", rawUrl: "blob:x" }, taken);
    const fresh = await stagingEditNamesFor(id, { type: "reverse", rawUrl: "blob:x" }, taken);
    const groups = stagingPhotoGroups({ collectionID: id, photos: [id + "_obverse_cropped_02.jpg", id + "_obverse_original_02.jpg", id + "_slab_reverse_02.jpg"] });
    return { holder, obv, fresh, groups: groups.map(g => ({ type: g.type, cropped: g.cropped, raw: g.raw })),
      parsed: stagingPhotoTypeFromFilename(id, id + "_slab_reverse_02.jpg") };
  });
  ok("R9a a fixed-name Replace in a Staging draft takes _02", R9.holder.cropped === "AY-00777_slab_reverse_02.jpg" && R9.holder.raw === "", R9);
  ok("R9b crop and original take one number; a free slot keeps the plain names",
    R9.obv.cropped === "AY-00777_obverse_cropped_02.jpg" && R9.obv.raw === "AY-00777_obverse_original_02.jpg" &&
    R9.fresh.cropped === "AY-00777_reverse_cropped.jpg" && R9.fresh.raw === "AY-00777_reverse_original.jpg", R9);
  ok("R9c numbered names are read back (types, and the crop paired with its original)",
    R9.parsed && R9.parsed.type === "slab_reverse" && R9.groups.length === 2 &&
    R9.groups.some(g => g.type === "obverse" && g.cropped === "AY-00777_obverse_cropped_02.jpg" && g.raw === "AY-00777_obverse_original_02.jpg") &&
    R9.groups.some(g => g.type === "slab_reverse" && g.cropped === "AY-00777_slab_reverse_02.jpg"), R9);

  // ---------- R10 pairing helpers ----------------------------------------------
  const R10 = await page.evaluate(() => ({
    a: rawNameForCropped("X_obverse_cropped.jpg"), b: rawNameForCropped("X_obverse_cropped_02.jpg"),
    c: rawNameForCropped("X_slab_reverse.jpg"), d: croppedNameForRaw("X_reverse_original_03.jpg"),
    e: storedRawFilenameFor({ stored: true, storedFilename: "X_obverse_cropped_02.jpg" }),
  }));
  ok("R10 crop/original pairing handles numbered names",
    R10.a === "X_obverse_original.jpg" && R10.b === "X_obverse_original_02.jpg" && R10.c === "" &&
    R10.d === "X_reverse_cropped_03.jpg" && R10.e === "X_obverse_original_02.jpg", R10);

  // ---------- I1 ids ---------------------------------------------------------
  const I1 = await page.evaluate(async () => {
    const R = __r; R.install();
    // Two photos committed at the same moment (main saves on pick).
    const [a, b] = await Promise.all([
      writePhotoRow(R.ID, { type: "slab_obverse", caption: "" }, R.ID + "_slab_obverse.jpg", ""),
      writePhotoRow(R.ID, { type: "reference", caption: "" }, R.ID + "_reference_01.jpg", ""),
    ]);
    // A column read that lags behind the write just made.
    R.install();
    const real = R.mock.readTableColumn.bind(R.mock);
    let stale = null;
    R.mock.readTableColumn = async (wb, table, col) => {
      const v = await real(wb, table, col);
      if (table === PHOTOS_TABLE_NAME && col === "PhotoID") { if (!stale) stale = v.slice(); return stale.slice(); }
      return v;
    };
    const c = await writePhotoRow(R.ID, { type: "slab_obverse", caption: "" }, R.ID + "_slab_obverse.jpg", "");
    const d = await writePhotoRow(R.ID, { type: "reference", caption: "" }, R.ID + "_reference_01.jpg", "");
    R.mock.readTableColumn = real;
    // Two new receipts at once.
    R.install();
    R.mock._grids.Receipts = [["ReceiptID", "CollectionID", "Filename", "DateAdded"], ["RC-00005", "AY-00001", "a.pdf", 46000],
      ["", "", "", ""], ["", "", "", ""], ["", "", "", ""]];
    __resetSheetHeaderMapsForTest();
    const [r1, r2] = await Promise.all([writeReceiptRow("AY-00701", "x.pdf", null), writeReceiptRow("AY-00702", "y.pdf", null)]);
    return { a: a.photoId, b: b.photoId, c: c.photoId, d: d.photoId, r1: r1.receiptId, r2: r2.receiptId,
      rcRows: R.mock._grids.Receipts.filter(r => r[0]).map(r => r[0]) };
  });
  ok("I1a two photos committed at the same moment get different PhotoIDs", I1.a && I1.b && I1.a !== I1.b, I1);
  ok("I1b a lagging column read can't repeat a PhotoID", I1.c === "PH-00041" && I1.d === "PH-00042", I1);
  ok("I1c two new receipts at once get different ReceiptIDs",
    I1.r1 && I1.r2 && I1.r1 !== I1.r2 && I1.rcRows.indexOf(I1.r1) !== -1 && I1.rcRows.indexOf(I1.r2) !== -1, I1);

  await page.evaluate(() => { discardUnsavedPhotoEdits(); __setGraphClientForTest(null); });
});
