// Add Coin uses Edit Coin's photo section (branch claude/addcoin-shared-photos).
//
// S3 — SAVE OUTPUT IS PINNED. The whole point of moving Add Coin onto Edit
// Coin's photo section is that what Ray SEES changes and what Save WRITES
// does not. This block drives a fixed set of picks through the real Add Coin
// screen and real crop tool, saves a new draft to Staging (mock Graph), and
// compares coin.json's photo list and the files uploaded into the draft
// folder with a golden recording taken from the Add Coin screen as it was on
// main 38b0207, before any of this branch's changes.
//
// The recording lives in tests/fixtures/addcoin_photo_save_golden.json. To
// re-record (only ever on purpose, and say so in the commit):
//   RECORD_ADDCOIN_GOLDEN=1 node tests/verify_addcoin_shared_photos.js
//
// `pickAll` is the ONLY part that knows which buttons exist. When the screen
// changes, pickAll changes and the golden does not.
//
// Commit 1 of the branch (wording, crop sources, OGP/COA on coin screens):
//   W   wording on Edit Coin and Manage Photos for a coin, the crop dialogs,
//       the type labels and Add Set's text (Ray's 22 Oct list, lines 1-17)
//   CS  crop sources are Holder, Reference and Other; destinations Front,
//       Back, Reference; a crop from an Other photo lands as the Front
//   OC  the coin screens gain Package (OGP) and COA: stored rows now show,
//       a new OGP front and a labelled COA page commit like every other
//       photo; a coin inside a Set has no COA slot of its own unless it
//       already has COA photos
//   L   layout of the coin screens at 360x800, 412x915 and 1024x768

const fs = require("fs");
const path = require("path");
const { defineSuite } = require("./harness");

const GOLDEN = path.join(__dirname, "fixtures", "addcoin_photo_save_golden.json");
const RECORD = process.env.RECORD_ADDCOIN_GOLDEN === "1";

// The fixed pick set: type, colour (so each file's bytes differ), label.
// Labels only on repeatable photos.
const PICKS = [
  { type: "obverse",      color: "#c33", caption: "" },
  { type: "reverse",      color: "#3c3", caption: "" },
  { type: "slab_obverse", color: "#33c", caption: "" },
  { type: "slab_reverse", color: "#cc3", caption: "" },
  { type: "reference",    color: "#3cc", caption: "TrueView obverse" },
  { type: "reference",    color: "#c3c", caption: "TrueView reverse" },
  { type: "other",        color: "#999", caption: "Mint box" }
];

module.exports = defineSuite("addcoin-shared-photos", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ---- helpers for the coin screens (commit 1) ----------------------------
  const installHelpers = (pg) => pg.evaluate(() => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
    const HEAD = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"];
    window.__sp = {
      ID: "AY-00099",
      coin: { id: "AY-00099", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" },
      sleep,
      // rows: [photoId, PhotoType, galleryType, filename, label]
      install(rows, extraCoins) {
        const sheet = [HEAD.slice()].concat(rows.map(r => [r[0], this.ID, r[1], "", r[3], r[4] || "", 46000, ""]));
        for (let i = 0; i < 6; i++) sheet.push(new Array(HEAD.length).fill(""));
        const mock = createMockGraphClient({ sheets: { Photos: sheet } });
        const uploads = [];
        const realUpload = mock.uploadFile.bind(mock);
        mock.uploadFile = (path, f) => { uploads.push(path); return realUpload(path, f); };
        this.mock = mock; this.uploads = uploads;
        __setGraphClientForTest(mock);
        __resetSheetHeaderMapsForTest();
        __setAddCoinWriteEnabledForTest(true);
        __setLiveCoinsForTest([this.coin].concat(extraCoins || []));
        __setStoredPhotosForTest({ [this.ID]: rows.map(r => ({ photoId: r[0], photoType: r[1], galleryType: r[2],
          subGroupId: "", filename: r[3], originalFilename: "", label: r[4] || "" })) });
        __resetCoinPhotoCacheForTest();
        rows.forEach(r => __setCoinPhotoCacheForTest(r[3], URL.createObjectURL(new Blob([new Uint8Array([1])], { type: "image/jpeg" }))));
        delete galleryStore[this.ID];
        closeImageSourceChooser();
      },
      teardown() {
        document.getElementById("writeGuardOverlay").classList.add("hidden");
        document.getElementById("writeGuardBtns").innerHTML = "";
        delete galleryStore[this.ID];
        __setStoredPhotosForTest(null); __resetCoinPhotoCacheForTest();
        __setLiveCoinsForTest(null);
        __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
      },
      openEditCoin() {
        navigate("browse"); showBrowseDetail(this.coin); showBrowseEditView(this.coin);
        const oh = document.getElementById("editCoinPhotosHeader");
        if (oh.getAttribute("aria-expanded") !== "true") oh.click();
        this.closeOverlays();
        return document.getElementById("browseEditPhotosSections");
      },
      openManage(extraCtx) {
        openManagePhotos(Object.assign({ id: this.ID, name: "x", meta: this.ID, kind: "coin", backTo: () => {} }, extraCtx || {}));
        this.closeOverlays();
        return document.getElementById("managePhotosSections");
      },
      closeOverlays() {
        if (typeof closeBgCrop === "function") closeBgCrop();
        document.getElementById("photoAdjustOverlay").classList.add("hidden");
      },
      titles(host) { return [...host.querySelectorAll(".accordion-header > span:first-child")].map(s => s.textContent); },
      section(host, re) {
        const h = [...host.querySelectorAll(".accordion-header")].find(x => re.test(x.textContent));
        if (h && h.getAttribute("aria-expanded") !== "true") h.click();
        return h ? h.nextElementSibling : null;
      },
      openAll(host) {
        [...host.querySelectorAll(".accordion-header")].forEach(h => { if (h.getAttribute("aria-expanded") !== "true") h.click(); });
        return host;
      },
      guardOpen() { return !document.getElementById("writeGuardOverlay").classList.contains("hidden"); },
      guardTitle() { return this.guardOpen() ? document.getElementById("writeGuardTitle").textContent : ""; },
      guardBody() { return this.guardOpen() ? document.getElementById("writeGuardBody").textContent : ""; },
      guardButtons() { return [...document.querySelectorAll("#writeGuardBtns button")].map(b => b.textContent); },
      clickGuard(label) {
        const b = [...document.querySelectorAll("#writeGuardBtns button")].find(x => x.textContent === label);
        if (!b) return false; b.click(); return true;
      },
      async waitFor(fn, ms) { const end = Date.now() + (ms || 3000); while (Date.now() < end) { if (fn()) return true; await sleep(40); } return !!fn(); },
      overlayOpen(id) { const o = document.getElementById(id); return !!o && !o.classList.contains("hidden"); },
      async jpeg() {
        const c = document.createElement("canvas"); c.width = 300; c.height = 300;
        const x = c.getContext("2d"); x.fillStyle = "#2a6"; x.fillRect(0, 0, 300, 300);
        x.fillStyle = "#da3"; x.beginPath(); x.arc(150, 150, 110, 0, Math.PI * 2); x.fill();
        const b = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
        return new File([b], "coin.jpg", { type: "image/jpeg" });
      },
      // "+"/Replace -> chooser -> Library -> crop to the end. Never throws.
      async pickVia(trigger) {
        if (!trigger) return false;
        trigger.click();
        const ch = document.getElementById("imageSourceChooser");
        if (!ch || ch.classList.contains("hidden")) return false;
        const btn = ch.querySelector('.image-chooser-btn[data-source="library"]');
        if (!btn) return false;
        btn.click();
        const input = document.getElementById("imageChooserLibraryInput");
        const dt = new DataTransfer(); dt.items.add(await this.jpeg());
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        if (!(await this.waitFor(() => this.overlayOpen("bgCropOverlay")))) return false;
        document.getElementById("bgCropUseBtn").click();
        if (await this.waitFor(() => this.overlayOpen("photoAdjustOverlay"), 1200)) document.getElementById("photoAdjustUseBtn").click();
        return true;
      },
      rows() { return this.mock._grids.Photos.filter(r => r[1] === this.ID).map(r => ({ id: r[0], type: r[2], file: r[4], label: r[5] })); }
    };
  });
  await installHelpers(page);

  const COIN_TITLES = ["✂️ Crop from another photo", "🪙 Obverse & reverse", "🔲 Holder (slab or flip)",
    "🔗 Reference photos", "📦 Package / OGP", "📜 COA / certificates", "🖼️ Other photos"];

  // ---------- W. Wording ---------------------------------------------------
  const W = await page.evaluate(async () => {
    const c = window.__sp;
    c.install([["PH-1", "Obverse", "obverse", "AY-00099_obverse_cropped.jpg"]]);
    const out = {};
    for (const [k, host] of [["edit", c.openEditCoin()], ["manage", c.openManage()]]) {
      c.openAll(host);
      await c.sleep(60);
      const hints = [...host.querySelectorAll(".accordion-body p")].map(p => p.textContent);
      const attrs = [...host.querySelectorAll("[title],[aria-label],[placeholder]")]
        .map(e => [e.title || "", e.getAttribute("aria-label") || "", e.getAttribute("placeholder") || ""].join(" | ")).join("\n");
      out[k] = { titles: c.titles(host), hints, text: host.textContent + "\n" + attrs,
                 adjustTitle: (host.querySelector('[data-act="adjust"]') || {}).title || "" };
    }
    // Slot labels: Obverse/Reverse on the coin's own pair, Front/Back only on the Holder.
    {
      const host = c.openAll(c.openEditCoin());
      await c.sleep(60);
      const labelsOf = (re) => {
        const h = [...host.querySelectorAll(".accordion-header")].find(x => re.test(x.textContent));
        return h ? [...h.nextElementSibling.querySelectorAll(".sg-photo-slot")].map(sl =>
          (sl.querySelector(".sg-photo-label, .sg-photo-add-label") || {}).textContent || "") : null;
      };
      out.faceSlots = labelsOf(/Obverse & reverse/);
      out.holderSlots = labelsOf(/Holder/);
    }
    out.typeLabels = ["obverse", "reverse", "slab_obverse", "slab_reverse"].map(t => galleryTypeDef(t).label);
    // Add Coin's type picker (still the old gallery until commit 3).
    openGalleryTypePicker("coin", () => {});
    out.picker = [...document.querySelectorAll(".gtp-item")].map(b => b.textContent);
    document.getElementById("galleryTypePickerOverlay").classList.add("hidden");
    // Add Set (text only, Q6).
    out.addSetHolder = (document.querySelector("#addSetChildSlabHeader > span") || {}).textContent || "";
    out.addSetHolderHint = (document.querySelector("#addSetChildSlabBody > p") || {}).textContent || "";
    out.addSetRef = (document.querySelector("#addSetChildRefGallery p") || {}).textContent || "";
    c.teardown();
    return out;
  });
  for (const k of ["edit", "manage"]) {
    const t = W[k];
    ok(JSON.stringify(t.titles) === JSON.stringify(COIN_TITLES),
      `W1-${k} the coin photo sections read, in order: ` + COIN_TITLES.join(" / ") + " — got " + JSON.stringify(t.titles));
    ok(t.hints.includes("The coin itself — the images the app shows for this coin. Cropped square, then framed into the circle."),
      `W2-${k} Obverse & reverse hint (line 2, unchanged)`);
    ok(t.hints.includes("The holder itself, front and back: a slab (rectangle) or a flip (square — tick Lock to square)."),
      `W3-${k} Holder hint (line 4)`);
    ok(t.hints.includes("Professional images of this coin or its type — PCGS TrueView, auction listings and similar."),
      `W4-${k} Reference hint (line 7)`);
    ok(t.hints.includes("Tap a Holder, Reference or Other photo to crop this coin's Obverse, Reverse or a Reference image out of it. The photo you tap is never changed."),
      `W5-${k} crop section hint: Obverse, Reverse or a Reference`);
    // "slab or flip" inside "Holder (slab or flip)" is Ray's own wording for
    // the holder; what must be gone is "flip card" and the word "Slab" as a
    // name (case-sensitive), plus the other retired phrases — in visible
    // text, titles, aria-labels and placeholders alike.
    ok(!/flip[- ]card|beyond the flip|for comparison, not photos|uploaded photo|Extra image|Adjust crop/i.test(t.text) &&
       !/\bSlab\b/.test(t.text),
      `W6-${k} no "flip card", "Slab", "uploaded photo", "Extra image" or "Adjust crop" text left on the screen`);
    ok(t.adjustTitle === "Recrop (from the original)" || t.adjustTitle === "Recrop (from the saved photo)",
      `W7-${k} the Recrop button's title (line 14): ` + t.adjustTitle);
  }
  ok(JSON.stringify(W.typeLabels) === JSON.stringify(["Obverse", "Reverse", "Holder — front", "Holder — back"]),
    "W8 type labels: Obverse, Reverse, Holder — front, Holder — back: " + JSON.stringify(W.typeLabels));
  ok(JSON.stringify(W.faceSlots) === JSON.stringify(["Obverse", "Reverse"]),
    "W12 the coin's own pair slots read Obverse and Reverse: " + JSON.stringify(W.faceSlots));
  ok(JSON.stringify(W.holderSlots) === JSON.stringify(["Front", "Back"]),
    "W13 the Holder's slots still read Front and Back: " + JSON.stringify(W.holderSlots));
  ok(W.picker.some(x => /Holder — front/.test(x)) && !W.picker.some(x => /Slab/.test(x)),
    "W9 Add Coin's type picker says Holder, not Slab");
  ok(W.addSetHolder === "🔲 Holder (slab or flip)" && /slab \(rectangle\) or a flip/.test(W.addSetHolderHint),
    "W10 Add Set's holder section is renamed (line 17)");
  ok(W.addSetRef === "Professional images of this coin or its type — PCGS TrueView, auction listings and similar.",
    "W11 Add Set's reference text matches the coin screens (line 17)");

  // ---------- CS. Crop sources and destinations ----------------------------
  const CS = await page.evaluate(async () => {
    const c = window.__sp, ID = c.ID;
    const rows = [["PH-1", "Obverse", "obverse", ID + "_obverse_cropped.jpg"], ["PH-2", "Reverse", "reverse", ID + "_reverse_cropped.jpg"],
                  ["PH-3", "Slab_Obverse", "slab_obverse", ID + "_slab_obverse.jpg"], ["PH-4", "Slab_Reverse", "slab_reverse", ID + "_slab_reverse.jpg"],
                  ["PH-5", "Reference", "reference", ID + "_reference_01.jpg"], ["PH-6", "Other", "other", ID + "_other_01.jpg"]];
    c.install(rows);
    // Real stored bytes for the Other photo, so the crop can load it.
    const src = ID + "_other_01.jpg";
    const srcBlob = await c.jpeg();
    await c.mock.uploadFile(writePaths().coinPhotos + "/" + src, srcBlob);
    __setCoinPhotoCacheForTest(src, URL.createObjectURL(srcBlob));
    c.uploads.length = 0;
    const out = {};
    for (const [k, open] of [["edit", () => c.openEditCoin()], ["manage", () => c.openManage()]]) {
      const host = open();
      const body = c.section(host, /Crop from another photo/);
      out[k] = body ? [...body.querySelectorAll(".crop-src-tile")].map(t => t.dataset.filename) : null;
    }
    // A crop from the Other photo into the Front, through Edit Coin.
    const host = c.openEditCoin();
    const body = c.section(host, /Crop from another photo/);
    const tile = body && body.querySelector('.crop-src-tile[data-filename="' + src + '"]');
    if (tile) tile.click();
    out.chooser = { title: c.guardTitle(), buttons: c.guardButtons() };
    c.clickGuard("Obverse");
    await c.sleep(40);
    out.confirm = { title: c.guardTitle(), body: c.guardBody() };
    c.clickGuard("Crop and replace");
    if (await c.waitFor(() => c.overlayOpen("bgCropOverlay"))) {
      out.cropTitle = (document.getElementById("bgCropTitle") || {}).textContent || "";
      document.getElementById("bgCropUseBtn").click();
      if (await c.waitFor(() => c.overlayOpen("photoAdjustOverlay"), 1200)) document.getElementById("photoAdjustUseBtn").click();
    }
    await c.waitFor(() => c.uploads.length > 0 && !galleryFor(ID).some(e => e.uploadPending), 4000);
    await c.sleep(60);
    out.uploads = c.uploads.slice();
    out.front = c.rows().filter(r => r.type === "Obverse");
    out.srcRow = c.rows().find(r => r.id === "PH-6") || null;
    // The Reverse's replace question, asked the same way (then cancelled).
    confirmCropDestination(ID, galleryFor(ID).find(e => e.type === "other"), "reverse", () => {});
    out.confirmRev = { title: c.guardTitle(), body: c.guardBody() };
    c.clickGuard("Cancel");
    c.teardown();
    return out;
  });
  const wantTiles = ["AY-00099_slab_obverse.jpg", "AY-00099_slab_reverse.jpg", "AY-00099_reference_01.jpg", "AY-00099_other_01.jpg"];
  for (const k of ["edit", "manage"]) {
    ok(CS[k] && JSON.stringify(CS[k].slice().sort()) === JSON.stringify(wantTiles.slice().sort()),
      `CS1-${k} crop sources are exactly Holder front/back, Reference and Other: ` + JSON.stringify(CS[k]));
  }
  ok(CS.chooser.title === "Crop this photo into…" &&
     JSON.stringify(CS.chooser.buttons) === JSON.stringify(["Obverse", "Reverse", "Reference", "Cancel"]),
    "CS2 destinations are Obverse, Reverse, Reference: " + JSON.stringify(CS.chooser));
  ok(CS.confirm.title === "Replace the obverse?" && /Your new crop becomes this coin's obverse image\./.test(CS.confirm.body),
    "CS3 replacing the Obverse asks first: \"Replace the obverse?\" / \"…this coin's obverse image.\"");
  ok(CS.confirmRev.title === "Replace the reverse?" && /Your new crop becomes this coin's reverse image\./.test(CS.confirmRev.body),
    "CS3b replacing the Reverse asks the same way: " + JSON.stringify(CS.confirmRev));
  ok(/^Crop — Obverse \(from /.test(CS.cropTitle), "CS3c the crop tool's title names the Obverse: " + CS.cropTitle);
  ok(CS.uploads.length === 1 && /AY-00099_obverse_cropped_02\.jpg$/.test(CS.uploads[0]) &&
     CS.front.length === 1 && CS.front[0].id === "PH-1" && CS.front[0].file === "AY-00099_obverse_cropped_02.jpg",
    "CS4 a crop from an Other photo lands as the Obverse: one upload, the Front row updated in place: " + JSON.stringify([CS.uploads, CS.front]));
  ok(CS.srcRow && CS.srcRow.file === "AY-00099_other_01.jpg" && CS.srcRow.type === "Other",
    "CS5 the Other photo it was cropped from is unchanged");

  // ---------- OC. Package (OGP) and COA on the coin screens ----------------
  const OC = await page.evaluate(async () => {
    const c = window.__sp, ID = c.ID;
    const out = {};
    // 1. Stored OGP/COA rows for a coin now show (they were hydrated and
    //    then shown nowhere).
    c.install([["PH-7", "OGP_Obverse", "ogp_obverse", ID + "_ogp_obverse.jpg"],
               ["PH-8", "COA", "coa", ID + "_coa_01.jpg", "page 1"]]);
    for (const [k, open] of [["edit", () => c.openEditCoin()], ["manage", () => c.openManage()]]) {
      const host = open();
      const ogp = c.section(host, /Package \/ OGP/);
      const coa = c.section(host, /COA \/ certificates/);
      await c.sleep(60);
      out[k] = {
        ogpFront: !!(ogp && ogp.querySelector('.sg-photo-slot [data-act="replace"]')),
        ogpBackEmpty: !!(ogp && ogp.querySelectorAll('.sg-photo-slot [data-act="add"]').length === 1),
        coaCaption: coa ? [...coa.querySelectorAll(".gc-thumb .gc-caption")].map(i => i.value) : null,
        coaTile: !!(coa && coa.querySelector("button.gc-add-tile")),
        ogpCount: ((ogp && ogp.previousElementSibling.textContent) || "").replace(/\s+/g, " ")
      };
    }
    // 2. A new OGP back and a labelled COA page, through the chooser.
    const host = c.openEditCoin();
    const ogp = c.section(host, /Package \/ OGP/);
    out.pickOgp = await c.pickVia(ogp && ogp.querySelector('.sg-photo-slot [data-act="add"]'));
    await c.waitFor(() => c.rows().some(r => r.type === "OGP_Reverse") && !galleryFor(ID).some(e => e.uploadPending), 4000);
    const coa = c.section(c.openEditCoin(), /COA \/ certificates/);
    out.pickCoa = await c.pickVia(coa && coa.querySelector("button.gc-add-tile"));
    await c.waitFor(() => c.rows().filter(r => r.type === "COA").length === 2 && !galleryFor(ID).some(e => e.uploadPending), 4000);
    await c.sleep(60);
    out.rows = c.rows();
    out.uploads = c.uploads.slice();
    c.teardown();
    // 3. A coin inside a Set: no COA slot of its own (the parent's applies)…
    c.install([]);
    let h = c.openManage({ parentSetId: "AY-00022", parentSetName: "1986 Statue of Liberty Set" });
    out.childNoCoa = !c.titles(h).some(t => /COA/.test(t));
    out.childHasOgp = c.titles(h).some(t => /Package \/ OGP/.test(t));
    c.teardown();
    // …unless it already has COA photos, which are never hidden.
    c.install([["PH-9", "COA", "coa", ID + "_coa_01.jpg", "page 1"]]);
    h = c.openManage({ parentSetId: "AY-00022", parentSetName: "1986 Statue of Liberty Set" });
    out.childStoredCoa = c.titles(h).some(t => /COA \/ certificates/.test(t));
    c.teardown();
    return out;
  });
  for (const k of ["edit", "manage"]) {
    const o = OC[k];
    ok(o.ogpFront && o.ogpBackEmpty, `OC1-${k} a stored OGP front shows in Package / OGP, with Replace; the back is an empty +`);
    ok(JSON.stringify(o.coaCaption) === JSON.stringify(["page 1"]) && o.coaTile,
      `OC2-${k} a stored COA page shows with its label, and a + tile to add another: ` + JSON.stringify(o.coaCaption));
  }
  const ogpRow = OC.rows.find(r => r.type === "OGP_Reverse");
  const coaRows = OC.rows.filter(r => r.type === "COA");
  ok(OC.pickOgp && ogpRow && ogpRow.file === "AY-00099_ogp_reverse.jpg",
    "OC3 a new OGP back on a coin saves as {ID}_ogp_reverse.jpg with an OGP_Reverse row: " + JSON.stringify(OC.rows));
  ok(OC.pickCoa && coaRows.length === 2 && coaRows.some(r => r.file === "AY-00099_coa_02.jpg"),
    "OC4 a new COA page on a coin saves as the next _coa_NN with a COA row");
  ok(OC.uploads.length === 2, "OC5 exactly two uploads for the two picks: " + JSON.stringify(OC.uploads));
  ok(OC.childNoCoa && OC.childHasOgp, "OC6 a coin inside a Set has Package / OGP but no COA slot of its own");
  ok(OC.childStoredCoa, "OC7 …unless it already has COA photos, which still show");

  // ---------- L. Layout of the coin screens --------------------------------
  for (const vp of [{ width: 360, height: 800 }, { width: 412, height: 915 }, { width: 1024, height: 768 }]) {
    for (const surface of ["edit", "manage"]) {
      const p = await openApp(vp);
      await installHelpers(p);
      const L = await p.evaluate(async (surface) => {
        const c = window.__sp, ID = c.ID;
        c.install([["PH-1", "Obverse", "obverse", ID + "_obverse_cropped.jpg"],
                   ["PH-7", "OGP_Obverse", "ogp_obverse", ID + "_ogp_obverse.jpg"],
                   ["PH-8", "COA", "coa", ID + "_coa_01.jpg", "page 1"],
                   ["PH-9", "COA", "coa", ID + "_coa_02.jpg", "page 2"]]);
        const host = surface === "edit" ? c.openEditCoin() : c.openManage();
        c.openAll(host);
        await c.sleep(200);
        const inner = window.innerWidth;
        const inside = (r, box) => r.left >= box.left - 0.5 && r.right <= box.right + 0.5;
        const pairs = [...host.querySelectorAll(".sg-photo-pair")].map(pr => {
          const title = pr.closest(".accordion-body").previousElementSibling.textContent.replace(/\s+/g, " ").trim();
          const body = pr.closest(".accordion-body").getBoundingClientRect();
          const slots = [...pr.querySelectorAll(".sg-photo-slot")].map(s => s.getBoundingClientRect());
          return { title, widths: slots.map(r => Math.round(r.width)), inBody: slots.every(r => inside(r, body)) };
        });
        const thumbs = [...host.querySelectorAll(".gc-thumb")].map(t => {
          const tr = t.getBoundingClientRect(); const b = t.querySelector('[data-role="replace"]');
          return !!b && inside(b.getBoundingClientRect(), tr) && tr.right <= inner + 0.5;
        });
        const titlesOneLine = [...host.querySelectorAll(".accordion-header")].every(h => h.scrollWidth <= h.clientWidth + 1);
        const out = { inner, pairs, thumbs, titlesOneLine, pageScroll: document.documentElement.scrollWidth > inner };
        c.teardown();
        return out;
      }, surface);
      const tag = surface + " " + vp.width + "x" + vp.height;
      console.log("    coin layout " + tag + ": " + JSON.stringify(L.pairs.map(x => [x.title.slice(0, 12), x.widths])));
      const front = L.pairs.find(x => /Obverse & reverse/.test(x.title));
      const ogp = L.pairs.find(x => /Package/.test(x.title));
      const holder = L.pairs.find(x => /Holder/.test(x.title));
      ok(!L.pageScroll, `L1 ${tag}: no horizontal page scroll`);
      ok(L.pairs.length === 3 && L.pairs.every(x => x.inBody && x.widths.length === 2 && x.widths[0] === x.widths[1]),
        `L2 ${tag}: Obverse & reverse, Holder and Package pairs each sit inside their card, both slots the same width: ` + JSON.stringify(L.pairs));
      ok(front && ogp && holder && ogp.widths[0] === front.widths[0] && holder.widths[0] === front.widths[0],
        `L3 ${tag}: the Package / OGP slots are the same width as Obverse & reverse's`);
      ok(L.thumbs.length === 2 && L.thumbs.every(Boolean), `L4 ${tag}: each COA page's Replace stays inside its thumbnail, inside the screen`);
      ok(L.titlesOneLine, `L5 ${tag}: every section title, "Holder (slab or flip)" included, fits on one line`);
      await p.close();
    }
  }

  // ---------- SH. Non-circle photos at their own shape ---------------------
  // Ray's T1 follow-up: Holder, Reference, Package/OGP, COA and Other (and a
  // Set's whole-set pair) are drawn at the image's own shape instead of a
  // square crop. Wide test image 800x400 (2:1, a TrueView), tall 500x800
  // (1:1.6, a slab). Front stays as it was.
  const installShapes = (pg) => pg.evaluate(async () => {
    const mk = async (w, h, fill) => {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const x = c.getContext("2d"); x.fillStyle = fill; x.fillRect(0, 0, w, h);
      x.fillStyle = "#da3"; x.beginPath(); x.arc(w / 4, h / 2, Math.min(w, h) / 4, 0, Math.PI * 2); x.fill();
      const b = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
      return URL.createObjectURL(b);
    };
    const WIDE = 2, TALL = 500 / 800, SQUARE = 1;
    const urls = { [WIDE]: await mk(800, 400, "#246"), [TALL]: await mk(500, 800, "#642"), [SQUARE]: await mk(600, 600, "#264") };
    const COIN = "AY-00099", SET = "AY-00090", CHILD = "AY-00090-A";
    // [photoId, owner, PhotoType, galleryType, filename, label, ratio]
    const ROWS = [
      ["PH-1", COIN, "Obverse", "obverse", COIN + "_obverse_cropped.jpg", "", SQUARE],
      ["PH-2", COIN, "Slab_Obverse", "slab_obverse", COIN + "_slab_obverse.jpg", "", TALL],
      ["PH-3", COIN, "Reference", "reference", COIN + "_reference_01.jpg", "TrueView", WIDE],
      ["PH-4", COIN, "Reference", "reference", COIN + "_reference_02.jpg", "Slab shot", TALL],
      ["PH-5", COIN, "OGP_Obverse", "ogp_obverse", COIN + "_ogp_obverse.jpg", "", WIDE],
      ["PH-6", COIN, "COA", "coa", COIN + "_coa_01.jpg", "page 1", TALL],
      ["PH-7", COIN, "Other", "other", COIN + "_other_01.jpg", "Mint box", WIDE],
      ["PH-10", SET, "OGP_Obverse", "ogp_obverse", SET + "_ogp_obverse.jpg", "", WIDE],
      ["PH-11", SET, "COA", "coa", SET + "_coa_01.jpg", "page 1", TALL],
      ["PH-12", SET, "Other", "other", SET + "_other_01.jpg", "Box", WIDE],
      ["PH-13", SET, "SubGroup_Obverse", "subgroup_obverse", SET + "_obverse.jpg", "", WIDE]
    ];
    const HEAD = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"];
    const coin = { id: COIN, name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" };
    const set = { id: SET, name: "1957 United States Proof Set", denom: "Multiple", year: 1957, mint: "", category: "Proof Set" };
    const child = { id: CHILD, name: "1957 Franklin Half", denom: "50C", year: 1957, mint: "", description: "Franklin Half Dollar", originSetId: SET };
    const urlRatio = {};
    window.__sh = {
      COIN, SET, CHILD, coin, set, child, WIDE, TALL,
      ratioOfUrl(u) { const m = /url\(["']?([^"')]+)/.exec(u || ""); return m ? urlRatio[m[1]] : urlRatio[u]; },
      install() {
        const sheet = [HEAD.slice()].concat(ROWS.map(r => [r[0], r[1], r[2], "", r[4], r[5], 46000, ""]));
        for (let i = 0; i < 6; i++) sheet.push(new Array(HEAD.length).fill(""));
        __setGraphClientForTest(createMockGraphClient({ sheets: { Photos: sheet } }));
        __resetSheetHeaderMapsForTest();
        __setAddCoinWriteEnabledForTest(true);
        __setLiveCoinsForTest([coin, set, child]);
        const byOwner = {};
        ROWS.forEach(r => (byOwner[r[1]] = byOwner[r[1]] || []).push({ photoId: r[0], photoType: r[2], galleryType: r[3],
          subGroupId: "", filename: r[4], originalFilename: "", label: r[5] }));
        __setStoredPhotosForTest(byOwner);
        __resetCoinPhotoCacheForTest();
        ROWS.forEach(r => { __setCoinPhotoCacheForTest(r[4], urls[r[6]]); urlRatio[urls[r[6]]] = r[6]; });
        [COIN, SET, CHILD].forEach(id => delete galleryStore[id]);
        closeImageSourceChooser();
      },
      teardown() {
        [COIN, SET, CHILD].forEach(id => delete galleryStore[id]);
        __setStoredPhotosForTest(null); __resetCoinPhotoCacheForTest(); __setLiveCoinsForTest(null);
        __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
        document.getElementById("galleryViewerOverlay").classList.add("hidden");
      },
      closeOverlays() {
        if (typeof closeBgCrop === "function") closeBgCrop();
        document.getElementById("photoAdjustOverlay").classList.add("hidden");
      },
      openAll(host) {
        [...host.querySelectorAll(".accordion-header")].forEach(h => { if (h.getAttribute("aria-expanded") !== "true") h.click(); });
        return host;
      },
      open(screen) {
        if (screen === "coin-edit" || screen === "child-edit") {
          const rec = screen === "coin-edit" ? coin : child;
          navigate("browse"); showBrowseDetail(rec); showBrowseEditView(rec);
          const oh = document.getElementById("editCoinPhotosHeader");
          if (oh.getAttribute("aria-expanded") !== "true") oh.click();
          this.closeOverlays();
          return document.getElementById("browseEditPhotosSections");
        }
        if (screen === "coin-manage") { openManagePhotos({ id: COIN, name: "x", meta: COIN, kind: "coin", backTo: () => {} }); this.closeOverlays(); return document.getElementById("managePhotosSections"); }
        if (screen === "set-manage") { openManagePhotos({ id: SET, name: "x", meta: SET, kind: "set", backTo: () => {} }); this.closeOverlays(); return document.getElementById("managePhotosSections"); }
        if (screen === "set-edit") {
          navigate("browse"); showBrowseDetail(set); showBrowseEditSetView(set);
          const oh = document.getElementById("editSetPhotosHeader");
          if (oh.getAttribute("aria-expanded") !== "true") oh.click();
          this.closeOverlays();
          return document.getElementById("editSetPhotosSections");
        }
        if (screen === "coin-page") { navigate("browse"); showBrowseDetail(coin); return document.getElementById("detailPhotoStrip"); }
        return null;
      },
      measure(host) {
        const R = (el) => el ? el.getBoundingClientRect() : null;
        const r1 = (n) => Math.round(n * 10) / 10;
        const thumbs = [...host.querySelectorAll(".gc-thumb")].map(t => {
          const img = t.querySelector(".gc-img"), ir = R(img);
          const ratio = this.ratioOfUrl(img && img.style.backgroundImage);
          const rm = R(t.querySelector(".gc-remove")), cap = R(t.querySelector(".gc-caption")), rep = R(t.querySelector('[data-role="replace"]'));
          return { kind: "thumb", shaped: t.classList.contains("gc-shaped"), want: ratio, got: ir && Math.round(ir.width / ir.height * 1000) / 1000,
            w: ir && r1(ir.width), h: ir && r1(ir.height), right: R(t).right,
            xdr: rm && r1(rm.right - ir.right), xdt: rm && r1(rm.top - ir.top),
            capW: cap && r1(cap.width), repW: rep && r1(rep.width) };
        }).filter(x => x.want);
        const slots = [...host.querySelectorAll(".sg-photo-slot")].map(s => {
          const img = s.querySelector(".sg-photo-img"); if (!img) return null;
          const ir = R(img), sr = R(s);
          const title = s.closest(".accordion-body").previousElementSibling.textContent;
          const rm = R(s.querySelector(".sg-photo-remove")), lab = R(s.querySelector(".sg-photo-label")), rep = R(s.querySelector('[data-act="replace"]'));
          return { kind: "pair", title: title.replace(/\s+/g, " ").trim().slice(0, 14), shaped: s.classList.contains("sg-shaped"),
            want: urlRatio[img.getAttribute("src")], got: Math.round(ir.width / ir.height * 1000) / 1000, w: r1(ir.width), h: r1(ir.height), slotW: r1(sr.width), right: sr.right,
            xdr: rm && r1(rm.right - ir.right), xdt: rm && r1(rm.top - ir.top), labW: lab && r1(lab.width), repW: rep && r1(rep.width) };
        }).filter(Boolean);
        const plus = [...host.querySelectorAll(".gc-add-box")].map(b => { const r = R(b); return [Math.round(r.width), Math.round(r.height)]; });
        const pairAdd = [...host.querySelectorAll(".sg-photo-add")].map(b => Math.round(R(b).height));
        return { thumbs, slots, plus, pairAdd };
      }
    };
  });

  const SH_SCREENS = ["coin-edit", "coin-manage", "set-edit", "set-manage", "coin-page"];
  for (const vp of [{ width: 360, height: 800 }, { width: 412, height: 915 }, { width: 1024, height: 768 }]) {
    const p = await openApp(vp);
    await installHelpers(p);
    await installShapes(p);
    const SH = await p.evaluate(async (screens) => {
      const s = window.__sh, out = {};
      for (const screen of screens) {
        s.install();
        const host = s.open(screen);
        if (screen !== "coin-page") s.openAll(host);
        await window.__sp.sleep(400);
        out[screen] = Object.assign(s.measure(host), { inner: window.innerWidth,
          pageScroll: document.documentElement.scrollWidth > window.innerWidth });
        s.teardown();
      }
      return out;
    }, SH_SCREENS);
    const tag = vp.width + "x" + vp.height;
    for (const screen of SH_SCREENS) {
      const m = SH[screen], t = screen + " " + tag;
      const nonFace = m.thumbs.filter(x => x.want !== 1).concat(m.slots.filter(x => x.want !== 1));
      const faces = m.thumbs.filter(x => x.want === 1).concat(m.slots.filter(x => x.want === 1));
      const close = (a, b) => Math.abs(a - b) / b <= 0.03;
      console.log("    shapes " + t + ": " + JSON.stringify(nonFace.map(x => [x.kind[0], x.want === 2 ? "W" : "T", x.w, x.h])));
      const wantCount = { "coin-edit": 6, "coin-manage": 6, "set-edit": 4, "set-manage": 4, "coin-page": 6 }[screen];
      ok(nonFace.length === wantCount && nonFace.every(x => x.shaped),
        `SH1 ${t}: every Holder/Reference/Package/COA/Other/whole-set photo is drawn at its own shape (${nonFace.length}/${wantCount})`);
      ok(nonFace.length && nonFace.filter(x => x.want === 2).every(x => close(x.got, 2)),
        `SH2 ${t}: a wide 2:1 image's thumbnail is 2:1: ` + JSON.stringify(nonFace.filter(x => x.want === 2).map(x => x.got)));
      ok(nonFace.length && nonFace.filter(x => x.want !== 2).every(x => close(x.got, 0.625)),
        `SH3 ${t}: a tall 1:1.6 image's thumbnail is 1:1.6: ` + JSON.stringify(nonFace.filter(x => x.want !== 2).map(x => x.got)));
      ok(nonFace.every(x => x.kind === "thumb"
          ? (x.want === 2 ? x.w <= 177 : Math.abs(x.h - 88) <= 1)
          : (x.h <= 120.5 && (x.h >= 119 || x.w >= x.slotW - 1))),
        `SH4 ${t}: same height as before (88px thumbnail, 120px pair photo) unless the width cap applies: ` +
        JSON.stringify(nonFace.map(x => [x.w, x.h])));
      ok(!m.pageScroll && nonFace.every(x => x.right <= m.inner + 0.5 && (x.kind === "thumb" || x.w <= x.slotW + 0.5)),
        `SH5 ${t}: no sideways scroll, every photo stays on the screen and inside its own slot: ` +
        JSON.stringify(nonFace.filter(x => x.kind === "pair").map(x => [x.w, x.slotW])));
      if (screen !== "coin-page") {
        ok(nonFace.every(x => Math.abs(x.xdr - 6) <= 1 && Math.abs(x.xdt + 6) <= 1),
          `SH6 ${t}: the ✕ sits on each image's own top-right corner: ` + JSON.stringify(nonFace.map(x => [x.xdr, x.xdt])));
        ok(nonFace.every(x => x.kind === "thumb"
            ? (Math.abs(x.capW - x.w) <= 1 && Math.abs(x.repW - x.w) <= 1)
            : (Math.abs(x.labW - x.w) <= 1 && Math.abs(x.repW - x.w) <= 1)),
          `SH7 ${t}: the label box and Replace are exactly as wide as the photo: ` +
          JSON.stringify(nonFace.map(x => [x.w, x.capW || x.labW, x.repW])));
        ok(m.plus.length && m.plus.every(b => b[0] === 88 && b[1] === 88) && m.pairAdd.every(h => h === 120),
          `SH8 ${t}: the + boxes keep their square size: ` + JSON.stringify([m.plus, m.pairAdd]));
      }
      if (screen.indexOf("coin") === 0) {
        ok(faces.length === 1 && faces.every(x => !x.shaped && (x.kind === "pair"
            ? (x.w === x.slotW && x.h === 120) : (x.w === 88 && x.h === 88))),
          `SH9 ${t}: Front is unchanged (not reshaped): ` + JSON.stringify(faces));
      }
    }
    await p.close();
  }

  // ---------- CR. A coin inside a Set still shows the Set's COA, linked ----
  // Ray's firm condition on Q1. The Set's COA comes from the Photos tab, and
  // the coin's screen must show it even when the Set's own screen hasn't
  // been opened this session.
  {
    const p = await openApp(PHONE);
    await installHelpers(p);
    await installShapes(p);
    const CR = await p.evaluate(async () => {
      const s = window.__sh, out = {};
      for (const screen of ["child-edit", "child-manage"]) {
        s.install();
        let host;
        if (screen === "child-edit") host = s.open("child-edit");
        else { openManagePhotos(Object.assign({ id: s.CHILD, name: "x", meta: s.CHILD, kind: "coin", backTo: () => {} },
          { parentSetId: s.SET, parentSetName: s.set.name })); s.closeOverlays(); host = document.getElementById("managePhotosSections"); }
        await window.__sp.sleep(400);
        const thumbs = [...host.querySelectorAll('[data-role="coa-strip"] .gc-thumb')];
        const first = thumbs[0], img = first && first.querySelector(".gc-img"), r = img && img.getBoundingClientRect();
        const ownCoa = [...host.querySelectorAll(".accordion-header")].some(h => /COA \/ certificates/.test(h.textContent));
        const strip = host.querySelector('[data-role="coa-strip"]');
        const align = strip && first ? { gap: Math.round(first.getBoundingClientRect().left - strip.getBoundingClientRect().left),
          justify: getComputedStyle(strip).justifyContent } : null;
        if (first) first.click();
        await window.__sp.sleep(200);
        const mv = document.getElementById("mediaViewerOverlay");
        out[screen] = { thumbs: thumbs.length, ownCoa, align,
          heading: (host.textContent.match(/COA — from parent Set/) || [""])[0],
          ratio: r ? Math.round(r.width / r.height * 1000) / 1000 : null, shaped: !!(first && first.classList.contains("gc-shaped")),
          viewerOpen: !mv.classList.contains("hidden"),
          footer: document.getElementById("mediaViewerFooter").textContent,
          viewerImg: !!document.querySelector("#mediaViewerStage img"),
          gallery: !document.getElementById("galleryViewerOverlay").classList.contains("hidden"),
          button: !!(first && first.tagName === "BUTTON") };
        if (typeof closeMediaViewer === "function") closeMediaViewer();
        s.teardown();
      }
      return out;
    });
    for (const k of ["child-edit", "child-manage"]) {
      const o = CR[k];
      ok(o.heading && o.thumbs === 1 && !o.ownCoa,
        `CR1-${k} a coin inside a Set shows the Set's COA (no COA section of its own), without the Set's screen opened first: ` + JSON.stringify(o));
      ok(o.shaped && Math.abs(o.ratio - 0.625) / 0.625 <= 0.03, `CR2-${k} the Set's COA page shows at its own shape: ${o.ratio}`);
      ok(o.button && o.viewerOpen && /COA — from parent Set — page 1/.test(o.footer) && o.viewerImg && !o.gallery,
        `CR3-${k} tapping it opens that page full screen in the in-app viewer, labelled as the parent Set's (Q3): ` + JSON.stringify([o.footer, o.viewerOpen, o.viewerImg, o.gallery]));
      ok(o.align && o.align.gap <= 1 && o.align.justify === "flex-start",
        `CR4-${k} the parent COA thumbnails are left-aligned, not centred: ` + JSON.stringify(o.align));
    }
    await p.close();
  }

  // ---------- DK. A child coin's page shows its Set's COA, read-only -------
  // Ray's T1 follow-up: the coin page's (Docket) Photos strip shows the
  // parent Set's COA, labelled as the parent's (same wording as Edit), and
  // tapping one opens it in the in-app viewer. No ✕, no Replace.
  {
    const p = await openApp(PHONE);
    await installHelpers(p);
    await installShapes(p);
    const DK = await p.evaluate(async () => {
      const s = window.__sh, sleep = window.__sp.sleep, out = {};
      const page = (rec) => { navigate("browse"); showBrowseDetail(rec); return document.getElementById("browseDetailView") || document.body; };
      const coaBlock = () => document.getElementById("detailParentCoa");
      // 1. A coin inside a Set, the Set's own screen never opened.
      s.install();
      page(s.child);
      await sleep(400);
      const blk = coaBlock();
      const thumbs = blk ? [...blk.querySelectorAll(".gc-thumb")] : [];
      const setImgs = new Set([s.SET + "_ogp_obverse.jpg", s.SET + "_obverse.jpg", s.SET + "_other_01.jpg"]
        .map(f => getCachedCoinPhotoUrl(f)).filter(Boolean));
      const shown = [...document.querySelectorAll("#browseDetailView .gc-img, #browseDetailView img")]
        .map(e => (/url\(["']?([^"')]+)/.exec(e.style.backgroundImage || "") || [])[1] || e.getAttribute("src") || "");
      out.child = {
        inPhotos: !!(blk && blk.closest(".accordion-body")),
        photosTitle: blk ? (blk.closest(".accordion-body").previousElementSibling.textContent || "").replace(/\s+/g, " ").trim() : "",
        heading: blk ? (blk.textContent.match(/📜 COA — from parent Set/) || [""])[0] : "",
        names: blk ? blk.textContent.indexOf(s.set.name) !== -1 : false,
        thumbs: thumbs.length,
        labels: thumbs.map(t => (t.querySelector(".gc-type") || {}).textContent),
        readOnly: blk ? blk.querySelectorAll(".gc-remove, [data-role='replace'], [data-act], input").length === 0 : false,
        buttons: thumbs.every(t => t.tagName === "BUTTON"),
        align: (() => { const st = blk && blk.querySelector('[data-role="coa-strip"]'); if (!st || !thumbs[0]) return null;
          const ps = document.getElementById("detailPhotoStrip");
          return { gap: Math.round(thumbs[0].getBoundingClientRect().left - st.getBoundingClientRect().left),
            justify: getComputedStyle(st).justifyContent }; })(),
        parentOtherShown: shown.some(u => setImgs.has(u))
      };
      if (thumbs[0]) thumbs[0].click();
      await sleep(200);
      const mv = document.getElementById("mediaViewerOverlay");
      out.viewer = { open: !mv.classList.contains("hidden"),
        footer: document.getElementById("mediaViewerFooter").textContent,
        img: !!document.querySelector("#mediaViewerStage img"),
        gallery: !document.getElementById("galleryViewerOverlay").classList.contains("hidden") };
      closeMediaViewer();
      s.teardown();
      // 2. A coin with no parent Set.
      s.install();
      page(s.coin);
      await sleep(300);
      out.noParent = { block: !!coaBlock(), heading: /COA — from parent Set/.test(document.getElementById("browseDetailView").textContent) };
      s.teardown();
      // 3. A child whose Set has no COA photos.
      s.install();
      const rows = { [s.SET]: [{ photoId: "PH-10", photoType: "OGP_Obverse", galleryType: "ogp_obverse", subGroupId: "",
        filename: s.SET + "_ogp_obverse.jpg", originalFilename: "", label: "" }] };
      __setStoredPhotosForTest(rows);
      delete galleryStore[s.SET];
      page(s.child);
      await sleep(300);
      out.noCoa = { block: !!coaBlock(), heading: /COA — from parent Set/.test(document.getElementById("browseDetailView").textContent) };
      s.teardown();
      return out;
    });
    console.log("    child Docket: " + JSON.stringify(DK.child) + " parent's Package/OGP or other photos shown on the child: " + DK.child.parentOtherShown);
    ok(DK.child.inPhotos && /Photos/.test(DK.child.photosTitle) && DK.child.heading && DK.child.names && DK.child.thumbs === 1 &&
       JSON.stringify(DK.child.labels) === JSON.stringify(["page 1"]),
      "DK1 a coin inside a Set shows the Set's COA in its page's Photos section, headed \"COA — from parent Set\" with the Set's name: " + JSON.stringify(DK.child));
    ok(DK.child.readOnly && DK.child.buttons, "DK2 the parent's COA on the coin page is read-only: no ✕, no Replace, no label box");
    ok(DK.viewer.open && /COA — from parent Set/.test(DK.viewer.footer) && /page 1/.test(DK.viewer.footer) && DK.viewer.img && !DK.viewer.gallery,
      "DK3 tapping it opens that page in the in-app viewer, labelled as the parent Set's: " + JSON.stringify(DK.viewer));
    ok(DK.child.align && DK.child.align.gap <= 1 && DK.child.align.justify === "flex-start",
      "DK6 on the coin page the parent COA thumbnails are left-aligned like the Photos strip, not centred: " + JSON.stringify(DK.child.align));
    ok(!DK.noParent.block && !DK.noParent.heading, "DK4 a coin with no parent Set shows no parent COA");
    ok(!DK.noCoa.block && !DK.noCoa.heading, "DK5 a coin whose parent Set has no COA photos shows none");
    await p.close();
  }

  // ---------- DM. Draft mode in the shared blocks (commit 2) ---------------
  // Add Coin and the Staging-draft edit use Edit Coin's own blocks with
  // opts.draft: a pick, Replace, Recrop or ✕ changes the in-memory gallery
  // only. Driven on a REAL owned coin id with the write layer on, so the
  // only thing keeping these off OneDrive is draft mode itself.
  {
    const DM = await page.evaluate(async () => {
      const s = window.__sp, out = {};
      s.install([]);
      const calls = [];
      Object.keys(Object.getPrototypeOf(s.mock)).concat(Object.keys(s.mock)).forEach(k => {
        if (typeof s.mock[k] !== "function" || k.charAt(0) === "_") return;
        const f = s.mock[k].bind(s.mock);
        s.mock[k] = (...a) => { calls.push(k); return f(...a); };
      });
      const host = document.createElement("div"); host.id = "dmHost"; document.body.appendChild(host);
      const removed = [];
      const draft = { onRemove: (e) => removed.push(e.type) };
      const ctx = { id: s.ID, name: "x", meta: s.ID, kind: "coin" };
      const render = () => renderManagePhotosInto("dmHost", ctx, { draft });
      render(); s.openAll(host);
      out.titles = s.titles(host);
      const sec = (re) => s.section(host, re);
      // Obverse pick
      await s.pickVia(sec(/Obverse &/).querySelector('[data-act="add"]'));
      await s.sleep(150);
      const obv = galleryFor(s.ID).find(e => e.type === "obverse");
      out.obv = { has: !!obv, url: !!(obv && obv.url), pending: !!(obv && obv.uploadPending), calls: calls.slice(),
        saving: /Saving…/.test(host.textContent), retry: host.querySelectorAll(".sg-photo-retry, .gc-retry").length };
      // Reference pick
      await s.pickVia(sec(/Reference photos/).querySelector('[data-role="add"]'));
      await s.sleep(150);
      out.ref = { n: galleryFor(s.ID).filter(e => e.type === "reference").length, calls: calls.slice(),
        thumbs: sec(/Reference photos/).querySelectorAll(".gc-thumb").length, saving: /Saving…/.test(host.textContent) };
      // Replace obverse
      const before = galleryFor(s.ID).find(e => e.type === "obverse");
      await s.pickVia(sec(/Obverse &/).querySelector('[data-act="replace"]'));
      await s.sleep(150);
      const obvs = galleryFor(s.ID).filter(e => e.type === "obverse");
      out.rep = { n: obvs.length, changed: obvs[0] !== before, calls: calls.slice() };
      // Recrop obverse
      const beforeRe = galleryFor(s.ID).find(e => e.type === "obverse");
      const rc = sec(/Obverse &/).querySelector('[data-act="adjust"]');
      out.recropBtn = !!rc;
      if (rc) {
        rc.click();
        if (await s.waitFor(() => s.overlayOpen("bgCropOverlay"))) document.getElementById("bgCropUseBtn").click();
        if (await s.waitFor(() => s.overlayOpen("photoAdjustOverlay"), 1200)) document.getElementById("photoAdjustUseBtn").click();
        await s.sleep(200);
      }
      const afterRe = galleryFor(s.ID).filter(e => e.type === "obverse");
      out.recrop = { n: afterRe.length, changed: afterRe[0] !== beforeRe, raw: !!(afterRe[0] && afterRe[0].rawUrl), calls: calls.slice() };
      // ✕ on a fresh pick
      sec(/Reference photos/).querySelector(".gc-remove").click();
      out.rm = { title: s.guardTitle(), body: s.guardBody() };
      s.clickGuard("Remove"); await s.sleep(50);
      out.rm.left = galleryFor(s.ID).filter(e => e.type === "reference").length;
      out.rm.removed = removed.slice(); out.rm.calls = calls.slice();
      // ✕ on a photo already saved in the Staging draft
      draftPlaceGalleryEntry(s.ID, null, { type: "other", url: obvs[0].url, caption: "box", stored: true, stagingStored: true,
        storedFilename: s.ID + "_other_01.jpg", filename: s.ID + "_other_01.jpg" }, render);
      s.openAll(host);
      sec(/Other photos/).querySelector(".gc-remove").click();
      out.rmS = { body: s.guardBody(), buttons: s.guardButtons() };
      s.clickGuard("Cancel"); await s.sleep(30);
      out.rmS.kept = galleryFor(s.ID).some(e => e.type === "other");
      sec(/Other photos/).querySelector(".gc-remove").click();
      s.clickGuard("Remove"); await s.sleep(30);
      out.rmS.gone = !galleryFor(s.ID).some(e => e.type === "other");
      out.rmS.removed = removed.slice();
      // A failed save and a save in flight
      galleryFor(s.ID).forEach(e => { e.uploadError = "boom"; });
      draftPlaceGalleryEntry(s.ID, null, { type: "reference", url: obvs[0].url, caption: "x", uploadPending: true }, render);
      s.openAll(host);
      out.failed = { text: (host.textContent.match(/Not saved — tap Save changes again/g) || []).length,
        oldText: /Not saved — tap ↻/.test(host.textContent), retry: host.querySelectorAll(".sg-photo-retry, .gc-retry").length,
        saving: /Saving…/.test(host.textContent), arrow: host.textContent.indexOf("↻") !== -1 };
      out.calls = calls.slice();
      host.remove();
      s.teardown();
      return out;
    });
    const noCalls = (c) => c.length === 0;
    console.log("    draft mode: " + JSON.stringify(DM));
    ok(JSON.stringify(DM.titles) === JSON.stringify(COIN_TITLES.filter(t => !/Crop/.test(t))),
      "DM1 draft mode shows Edit Coin's sections (crop from another photo comes in a later commit): " + JSON.stringify(DM.titles));
    ok(DM.obv.has && DM.obv.url && !DM.obv.pending && noCalls(DM.obv.calls) && !DM.obv.saving && DM.obv.retry === 0,
      "DM2 an Obverse pick goes into the draft only: no Graph call, no Saving…, no ↻: " + JSON.stringify(DM.obv));
    ok(DM.ref.n === 1 && DM.ref.thumbs === 1 && noCalls(DM.ref.calls) && !DM.ref.saving,
      "DM3 a Reference pick goes into the draft only: " + JSON.stringify(DM.ref));
    ok(DM.rep.n === 1 && DM.rep.changed && noCalls(DM.rep.calls), "DM4 Replace swaps the photo in the draft, still one Obverse, nothing written");
    ok(DM.recropBtn && DM.recrop.n === 1 && DM.recrop.changed && DM.recrop.raw && noCalls(DM.recrop.calls),
      "DM5 Recrop works from the draft's own photo and keeps its original, nothing written: " + JSON.stringify(DM.recrop));
    ok(DM.rm.title === "Remove photo?" && /hasn't been saved yet/.test(DM.rm.body) && DM.rm.left === 0 &&
       JSON.stringify(DM.rm.removed) === '["reference"]' && noCalls(DM.rm.calls),
      "DM6 ✕ on a pick asks, says nothing is written, and removes it with no write: " + JSON.stringify(DM.rm));
    ok(/Save changes/.test(DM.rmS.body) && DM.rmS.kept && DM.rmS.gone && DM.rmS.removed.indexOf("other") !== -1,
      "DM7 ✕ on a photo saved in the Staging draft says it comes off at Save changes; Cancel keeps it, Remove takes it off: " + JSON.stringify(DM.rmS));
    ok(DM.failed.text >= 1 && !DM.failed.oldText && DM.failed.retry === 0 && !DM.failed.arrow && !DM.failed.saving,
      "DM8 a failed save reads \"Not saved — tap Save changes again\"; no ↻ and no Saving… in draft mode: " + JSON.stringify(DM.failed));
    ok(noCalls(DM.calls), "DM9 nothing in draft mode touched OneDrive: " + JSON.stringify(DM.calls));
  }

  // ---------- CT. Crop-from-another-photo source tiles at their own shape --
  // Ray's Q2 (22 Oct): the Holder/Reference/Other tiles in "Crop from another
  // photo" follow the photo's own shape, like the gallery thumbs.
  for (const vp of [{ width: 360, height: 800 }, { width: 412, height: 915 }, { width: 1024, height: 768 }]) {
    const p = await openApp(vp);
    await installHelpers(p);
    await installShapes(p);
    const CT = await p.evaluate(async () => {
      const s = window.__sh, out = {};
      for (const screen of ["coin-edit", "coin-manage"]) {
        s.install();
        const host = s.open(screen);
        s.openAll(host);
        await window.__sp.sleep(400);
        const tiles = [...host.querySelectorAll(".crop-src-tile")].map(t => {
          const img = t.querySelector(".gc-img"), ir = img.getBoundingClientRect(), tr = t.getBoundingClientRect();
          const lab = t.querySelector(".gc-type").getBoundingClientRect();
          return { want: s.ratioOfUrl(img.style.backgroundImage), got: Math.round(ir.width / ir.height * 1000) / 1000,
            w: Math.round(ir.width * 10) / 10, h: Math.round(ir.height * 10) / 10, tileW: Math.round(tr.width * 10) / 10,
            labW: Math.round(lab.width * 10) / 10, right: tr.right, shaped: t.classList.contains("gc-shaped") };
        });
        out[screen] = { tiles, inner: window.innerWidth, pageScroll: document.documentElement.scrollWidth > window.innerWidth };
        s.teardown();
      }
      return out;
    });
    const tag = vp.width + "x" + vp.height;
    for (const screen of ["coin-edit", "coin-manage"]) {
      const m = CT[screen], t = screen + " " + tag, close = (a, b) => Math.abs(a - b) / b <= 0.03;
      ok(m.tiles.length === 4 && m.tiles.every(x => x.shaped && x.want),
        `CT1 ${t}: the 4 crop sources (Holder, 2 Reference, Other) are shaped tiles: ` + JSON.stringify(m.tiles.map(x => [x.shaped, x.want])));
      ok(m.tiles.length && m.tiles.every(x => close(x.got, x.want === 2 ? 2 : 0.625)),
        `CT2 ${t}: each source tile keeps its photo's own shape (2:1 and 1:1.6): ` + JSON.stringify(m.tiles.map(x => [x.want, x.got])));
      ok(m.tiles.length && m.tiles.every(x => (x.want === 2 ? x.w <= 177 : Math.abs(x.h - 88) <= 1) && Math.abs(x.tileW - x.w) <= 1 && Math.abs(x.labW - x.w) <= 1),
        `CT3 ${t}: 88px tall (width capped for a wide photo), tile and label as wide as the photo: ` + JSON.stringify(m.tiles.map(x => [x.w, x.h, x.tileW, x.labW])));
      ok(!m.pageScroll && m.tiles.every(x => x.right <= m.inner + 0.5), `CT4 ${t}: no sideways scroll, every tile on screen`);
    }
    await p.close();
  }

  const S3 = await page.evaluate(async (PICKS) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const waitFor = async (fn, ms) => { const end = Date.now() + (ms || 4000); while (Date.now() < end) { if (fn()) return true; await sleep(40); } return !!fn(); };
    const open = (id) => { const o = document.getElementById(id); return !!o && !o.classList.contains("hidden"); };
    const file = async (color) => {
      const c = document.createElement("canvas"); c.width = 300; c.height = 300;
      const x = c.getContext("2d"); x.fillStyle = color; x.fillRect(0, 0, 300, 300);
      x.fillStyle = "#da3"; x.beginPath(); x.arc(150, 150, 110, 0, Math.PI * 2); x.fill();
      const b = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
      return new File([b], "pick.jpg", { type: "image/jpeg" });
    };
    const feed = (input, f) => {
      const dt = new DataTransfer(); dt.items.add(f);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const count = () => galleryFor(ADDCOIN_GALLERY_ID).length;
    const finishCrop = async (before) => {
      if (!(await waitFor(() => open("bgCropOverlay")))) return false;
      document.getElementById("bgCropUseBtn").click();
      if (await waitFor(() => open("photoAdjustOverlay"), 1500)) document.getElementById("photoAdjustUseBtn").click();
      return await waitFor(() => count() > before);
    };
    const GALLERY_LABEL = { slab_obverse: /Slab — front|Holder — front/, slab_reverse: /Slab — back|Holder — back/,
                            reference: /Reference/, other: /Other/ };

    // ---- pickAll: main 38b0207's Add Coin (📷 🖼️ 📁 slots + gallery) ----
    async function pickOne(p) {
      const before = count();
      if (p.type === "obverse" || p.type === "reverse") {
        feed(document.getElementById(p.type + "FilesInput"), await file(p.color));
      } else {
        const gal = document.getElementById("addCoinGallery");
        gal.querySelector('[data-role="add-files"]').click();
        const item = [...document.querySelectorAll(".gtp-item")].find(b => GALLERY_LABEL[p.type].test(b.textContent));
        if (!item) return false;
        item.click();
        feed(gal.querySelector('input[data-role="files"]'), await file(p.color));
      }
      if (!(await finishCrop(before))) return false;
      if (p.caption) {
        // Type the label into the new photo's own label box.
        const entry = galleryFor(ADDCOIN_GALLERY_ID)[count() - 1];
        const thumbs = [...document.querySelectorAll("#addCoinGallery .gc-thumb")];
        const nonFlip = galleryFor(ADDCOIN_GALLERY_ID).filter(e => !(galleryTypeDef(e.type) || {}).flipSource);
        const thumb = thumbs[nonFlip.indexOf(entry)];
        const box = thumb && thumb.querySelector(".gc-caption");
        if (!box) return false;
        box.value = p.caption;
        box.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return true;
    }
    async function pickAll() {
      const done = [];
      for (const p of PICKS) done.push(await pickOne(p));
      return done;
    }

    // ---- setup: a clean Add Coin form, a mock OneDrive, one catalog row ----
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    const mock = createMockGraphClient({ workbookColumns: { "All::CollectionID": ["AY-00500"] } });
    const uploads = [];
    const realUpload = mock.uploadFile.bind(mock);
    mock.uploadFile = (p, f) => { uploads.push(p); return realUpload(p, f); };
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setDocketWriteEnabledForTest(false);
    __setLiveDbCoinsForTest([
      { denom: "10C", year: 1916, mint: "D", variety: "", description: "Mercury Dime",
        finish: "Business Strike", designation: "", coinId: "C-1916-D-10C-01", pcgs: "4682", mintage: 264000, gsid: "" }
    ]);
    navigate("addcoin");
    document.getElementById("denomination").value = "10C";
    document.getElementById("year").value = "1916";
    document.getElementById("mintMark").value = "D";
    document.getElementById("description").value = "Mercury Dime";
    document.getElementById("finish").value = "Business Strike";
    checkDbCoinsMatch();

    const picked = await pickAll();
    const inMemory = galleryFor(ADDCOIN_GALLERY_ID).map(e => ({ type: e.type, caption: e.caption || "" }));
    const res = await new Promise((resolve, reject) => {
      resolveAddCoinCatalogMatch(
        (m) => completeAddCoinSave("staging", m).then(resolve, reject),
        () => resolve("cancelled"));
    });
    const id = "AY-00501";
    const folder = writePaths().stagingBase + "/" + id + "/";
    const draft = await mock.getJson(folder + "coin.json");
    const out = {
      picked, inMemory, cancelled: res === "cancelled",
      collectionID: draft && draft.collectionID,
      photos: draft ? (draft.photos || []).map(p => (typeof p === "string") ? { filename: p } :
        { type: p.type, filename: p.filename, caption: p.caption || "" }) : null,
      receiptPhoto: draft ? draft.receiptPhoto || "" : null,
      uploads: uploads.filter(p => p.indexOf(folder) === 0 && !/coin\.json$/.test(p))
        .map(p => p.slice(folder.length)).sort(),
      uploadsOutsideDraft: uploads.filter(p => p.indexOf(folder) !== 0).length
    };
    __setLiveDbCoinsForTest(null);
    __setDocketWriteEnabledForTest(null);
    __setAddCoinWriteEnabledForTest(null);
    __setGraphClientForTest(null);
    return out;
  }, PICKS);

  ok(S3.picked.length === PICKS.length && S3.picked.every(Boolean),
    "S3.1 every pick in the fixed set went through the crop tool");
  ok(JSON.stringify(S3.inMemory.map(e => e.type)) === JSON.stringify(PICKS.map(p => p.type)),
    "S3.2 the form held the picks in pick order");
  ok(!S3.cancelled && S3.collectionID === "AY-00501", "S3.3 the save wrote a new draft at AY-00501");
  ok(S3.uploadsOutsideDraft === 0, "S3.4 nothing was uploaded outside the draft's Staging folder");

  const now = { collectionID: S3.collectionID, photos: S3.photos, receiptPhoto: S3.receiptPhoto, uploads: S3.uploads };
  if (RECORD) {
    fs.mkdirSync(path.dirname(GOLDEN), { recursive: true });
    fs.writeFileSync(GOLDEN, JSON.stringify(Object.assign({
      _note: "Recorded from main 38b0207's Add Coin (before claude/addcoin-shared-photos). " +
             "Do not edit by hand; see tests/verify_addcoin_shared_photos.js."
    }, now), null, 2) + "\n");
    ok(true, "S3.R golden recorded to " + path.relative(process.cwd(), GOLDEN));
    return;
  }
  const golden = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
  ok(JSON.stringify(now.photos) === JSON.stringify(golden.photos),
    "S3.5 coin.json's photo list (type, filename, label, order) equals the golden");
  ok(JSON.stringify(now.uploads) === JSON.stringify(golden.uploads),
    "S3.6 the files uploaded to the draft folder equal the golden");
  ok(now.receiptPhoto === golden.receiptPhoto, "S3.7 the receipt field equals the golden");
}, module);
