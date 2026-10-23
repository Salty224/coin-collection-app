// Open-ended photo tiles at pair width, the one-line label box with its
// full-width editor, and the Manage Photos footer (Oct 2026, Ray's tablet
// test of claude/photo-label-save-changes at c90b51b).
//
//   F1  Reference / COA / Other tiles, and their "+" tile, are each half the
//       section wide (two per row), the same width as a pair slot on the same
//       screen, whatever the photo's shape; the whole photo is drawn inside a
//       120px box (contain). Edit Coin, Manage Photos (coin), Edit Set,
//       Manage Photos (Set), Add Coin, a Staging-draft edit; at 360x800,
//       412x915 and 1024x768.
//   F2  the label box is one line ending in "…" (no wrapping); tapping it
//       opens a full-width editor showing the whole label; Done (or Enter,
//       or a backdrop tap) puts the text back in the box, still unsaved;
//       Cancel / Esc change nothing; leaving the screen closes it without
//       applying; draft mode too; Save Changes then writes the edited label.
//   F3  the Manage Photos footer says what really happens (no stale "no
//       OneDrive write happens yet").

const { defineSuite } = require("./harness");

const HEADER = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"];
const ALL_HEADERS = ["CollectionID", "Year", "MintMark", "Denomination", "Variety", "Description",
  "Value", "Cost", "Shipping", "Seller_Link", "PurchaseDate", "StorageLocation", "Container",
  "Grade", "GradeSource", "Designation", "SerNo", "CACBean", "Remarks", "Reviewed", "LastModified",
  "Finish", "CoinID", "Status", "SaleDate", "SalePrice", "Buyer", "Platform"];
const LONG = "PCGS TrueView obverse and reverse, from the auction listing, lot 4411 (Heritage, Oct 2026)";
const VIEWPORTS = [[360, 800], [412, 915], [1024, 768]];
const SCREENS = ["editCoin", "manageCoin", "editSet", "manageSet", "addCoin", "stagingEdit"];

async function setup(page) {
  await page.evaluate(({ HEADER, ALL_HEADERS, LONG }) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
    window.__tw = {
      sleep, LONG,
      coin: { id: "AY-00099", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" },
      set: { id: "AY-00090", name: "1957 Proof Set", denom: "Multiple", year: 1957, mint: "", category: "Proof Set" },
      calls: [], patches: [], mock: null, urls: {},
      // A real decodable image of a given shape, so "the whole photo shows"
      // means something.
      async image(w, h, color) {
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const x = c.getContext("2d"); x.fillStyle = color; x.fillRect(0, 0, w, h);
        x.fillStyle = "#fff"; x.fillRect(4, 4, w - 8, 6);
        return await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
      },
      async install() {
        const self = this;
        const allRow = ["AY-00099", 1916, "D", "10C", "", "Mercury Dime", 40, 30, 0, "", null,
          "Safe", "", "VF-20", "Owner", "", "", "", "", "", null,
          "Business Strike", "C-1916-D-10C-01", "Owned", null, null, "", ""];
        const rows = [
          ["PH-00001", "AY-00099", "Slab_Obverse", "", "AY-00099_slab_obverse.jpg", "", 46000, ""],
          ["PH-00002", "AY-00099", "Reference", "", "AY-00099_reference_01.jpg", LONG, 46000, ""],
          ["PH-00003", "AY-00099", "Reference", "", "AY-00099_reference_02.jpg", "Tall slab", 46000, ""],
          ["PH-00004", "AY-00099", "Reference", "", "AY-00099_reference_03.jpg", "", 46000, ""],
          ["PH-00010", "AY-00090", "OGP_Obverse", "", "AY-00090_ogp_obverse.jpg", "", 46000, ""],
          ["PH-00011", "AY-00090", "COA", "", "AY-00090_coa_01.jpg", LONG, 46000, ""],
          ["PH-00012", "AY-00090", "COA", "", "AY-00090_coa_02.jpg", "page 2", 46000, ""],
          ["PH-00013", "AY-00090", "COA", "", "AY-00090_coa_03.jpg", "", 46000, ""],
        ];
        const blank = () => new Array(HEADER.length).fill("");
        const mock = createMockGraphClient({ sheets: {
          All: [ALL_HEADERS, allRow],
          Photos: [HEADER].concat(rows).concat([blank(), blank(), blank()]),
          Receipts: [["ReceiptID", "CollectionID", "Filename", "DateAdded"], ["", "", "", ""]]
        } });
        this.mock = mock; this.calls = []; this.patches = [];
        __setGraphClientForTest(new Proxy(mock, { get(t, k) {
          const v = t[k];
          if (typeof v !== "function") return v;
          return async (...a) => {
            self.calls.push(k);
            if (k === "patchWorkbookRanges") self.patches.push(a[1] + "!" + a[2].map(e => e.address).join(","));
            return v.apply(t, a);
          };
        } }));
        __resetSheetHeaderMapsForTest();
        __resetAllHeaderMapForTest();
        __setAddCoinWriteEnabledForTest(true);
        __setBrowseEditWriteEnabledForTest(true);
        __setLiveCoinsForTest([this.coin, this.set]);
        const idx = (r) => ({ photoId: r[0], photoType: r[2], galleryType: galleryTypeForPhotoType(r[2]),
          subGroupId: "", filename: r[4], originalFilename: "", label: r[5] });
        __setStoredPhotosForTest({
          "AY-00099": rows.filter(r => r[1] === "AY-00099").map(idx),
          "AY-00090": rows.filter(r => r[1] === "AY-00090").map(idx),
        });
        // A wide photo (2:1), a tall one (1:1.6) and a square one.
        const shapes = { "_01.jpg": [400, 200, "#2a6"], "_02.jpg": [200, 320, "#a62"], "_03.jpg": [300, 300, "#26a"] };
        for (const r of rows) {
          const key = Object.keys(shapes).find(k => r[4].endsWith(k)) || "_03.jpg";
          const [w, h, c] = shapes[key];
          const url = URL.createObjectURL(await this.image(w, h, c));
          this.urls[r[4]] = url;
          __setCoinPhotoCacheForTest(r[4], url);
        }
        delete galleryStore["AY-00099"]; delete galleryStore["AY-00090"];
        this.closeAll();
      },
      closeAll() {
        closeImageSourceChooser();
        closePhotoLabelEditor(false);
        if (typeof closeBgCrop === "function") closeBgCrop();
        document.getElementById("photoAdjustOverlay").classList.add("hidden");
        const ov = document.getElementById("writeGuardOverlay"); if (ov) ov.classList.add("hidden");
      },
      openAll(hostId) {
        const host = document.getElementById(hostId);
        [...host.querySelectorAll(".accordion-header")].forEach(h => { if (h.getAttribute("aria-expanded") !== "true") h.click(); });
        return host;
      },
      async waitFor(fn, ms) { const end = Date.now() + (ms || 3000); while (Date.now() < end) { if (fn()) return true; await sleep(30); } return !!fn(); },
      async open(screen) {
        await this.install();
        if (screen === "editCoin") {
          navigate("browse"); showBrowseDetail(this.coin); showBrowseEditView(this.coin);
          await loadBrowseEditSnapshot(this.coin); await sleep(100);
          const oh = document.getElementById("editCoinPhotosHeader");
          if (oh.getAttribute("aria-expanded") !== "true") oh.click();
          this.closeAll();
          return { host: this.openAll("browseEditPhotosSections"), list: /Reference/, pair: /Holder/ };
        }
        if (screen === "manageCoin") {
          openManagePhotos({ id: this.coin.id, name: "x", meta: this.coin.id, kind: "coin", backTo: () => {} });
          this.closeAll();
          return { host: this.openAll("managePhotosSections"), list: /Reference/, pair: /Holder/ };
        }
        if (screen === "editSet") {
          navigate("browse"); showBrowseDetail(this.set); showBrowseEditSetView(this.set);
          const oh = document.getElementById("editSetPhotosHeader");
          if (oh.getAttribute("aria-expanded") !== "true") oh.click();
          this.closeAll();
          return { host: this.openAll("editSetPhotosSections"), list: /COA/, pair: /Package/ };
        }
        if (screen === "manageSet") {
          openManagePhotos({ id: this.set.id, name: "x", meta: this.set.id, kind: "set", backTo: () => {} });
          this.closeAll();
          return { host: this.openAll("managePhotosSections"), list: /COA/, pair: /Package/ };
        }
        if (screen === "addCoin") {
          navigate("addcoin");
          const g = galleryFor(ADDCOIN_GALLERY_ID);
          g.length = 0;
          for (const [f, cap] of [["_reference_01.jpg", LONG], ["_reference_02.jpg", "Tall slab"], ["_reference_03.jpg", ""]]) {
            const name = ADDCOIN_GALLERY_ID + f;
            g.push({ type: "reference", url: this.urls["AY-00099" + f], blob: await this.image(10, 10, "#000"),
              filename: name, caption: cap });
          }
          renderAddCoinPhotos();
          const body = document.getElementById("addCoinPhotosBody");
          if (body.classList.contains("hidden")) document.getElementById("addCoinPhotosHeader").click();
          this.closeAll();
          return { host: this.openAll("addCoinPhotoSections"), list: /Reference/, pair: /Holder/ };
        }
        if (screen === "stagingEdit") {
          const id = "AY-00754";
          const folder = writePaths().stagingBase + "/" + id;
          for (const [f, wh] of [["_reference_01.jpg", [400, 200]], ["_reference_02.jpg", [200, 320]], ["_reference_03.jpg", [300, 300]]]) {
            await this.mock.uploadFile(folder + "/" + id + f, await this.image(wh[0], wh[1], "#2a6"));
          }
          await this.mock.uploadJson(folder + "/coin.json", {
            type: "coin", version: 1, collectionID: id, status: "Draft", denom: "5C", category: "", year: "1938",
            mint: "D", variety: "", description: "Buffalo Nickel", finish: "Business Strike", designation: "",
            errorDesc: "", grade: "", gradeSource: "", serNo: "", cacBean: "", cost: null, shippingCost: null,
            purchaseDate: "", vendor: "", storageLocation: "", container: "", assignAlbum: "", remarks: "",
            itemNumber: "", gsid: "", coinId: "", matchedHow: "none", receiptPhoto: "",
            photos: [
              { type: "reference", filename: id + "_reference_01.jpg", caption: LONG },
              { type: "reference", filename: id + "_reference_02.jpg", caption: "Tall slab" },
              { type: "reference", filename: id + "_reference_03.jpg", caption: "" }
            ],
            researchNote: "", allRowWritten: false, forceAdded: false, filesMovedOnPromotion: false,
            savedVia: "staging", createdDate: "2026-10-20T17:57:36Z"
          });
          await beginCoinDraftEdit(id);
          await this.waitFor(() => galleryFor(ADDCOIN_GALLERY_ID).filter(e => e.type === "reference" && e.url).length >= 3, 3000);
          renderAddCoinPhotos();
          const body = document.getElementById("addCoinPhotosBody");
          if (body.classList.contains("hidden")) document.getElementById("addCoinPhotosHeader").click();
          this.closeAll();
          return { host: this.openAll("addCoinPhotoSections"), list: /Reference/, pair: /Holder/ };
        }
      },
      section(host, re) {
        const h = [...host.querySelectorAll(".accordion-header")].find(x => re.test(x.textContent));
        return h ? h.nextElementSibling : null;
      },
      measure(o) {
        const R = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height, r: r.right }; };
        const body = this.section(o.host, o.list);
        const grid = body && body.querySelector(".gc-chooser-grid");
        const pairBody = this.section(o.host, o.pair);
        const pairSlot = pairBody && pairBody.querySelector(".sg-photo-pair .sg-photo-slot");
        if (!grid) return { found: false };
        const tiles = [...grid.children].filter(c => c.classList.contains("gc-thumb") || c.classList.contains("gc-add-tile"));
        const thumbs = tiles.filter(c => c.classList.contains("gc-thumb"));
        const add = tiles.find(c => c.classList.contains("gc-add-tile"));
        const cs = getComputedStyle(grid);
        const gap = parseFloat(cs.columnGap) || 0;
        const half = (grid.clientWidth - gap) / 2;
        const imgs = thumbs.map(t => {
          const b = t.querySelector(".gc-img");
          const s = getComputedStyle(b);
          return { w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height,
            size: s.backgroundSize, img: s.backgroundImage !== "none" };
        });
        const box = add && add.querySelector(".gc-add-box");
        return {
          found: true, count: thumbs.length, gap,
          half, gridW: grid.clientWidth,
          widths: tiles.map(t => R(t).w),
          rects: tiles.map(R),
          pairW: pairSlot ? R(pairSlot).w : null,
          imgs,
          addBox: box ? { w: box.getBoundingClientRect().width, h: box.getBoundingClientRect().height } : null,
          removeOnCorner: thumbs.every(t => {
            const x = t.querySelector(".gc-remove"), img = t.querySelector(".gc-img");
            if (!x || !img) return false;
            const a = x.getBoundingClientRect(), b = img.getBoundingClientRect();
            return Math.abs(a.right - b.right - 6) < 2 && Math.abs(a.top - b.top + 6) < 2;
          }),
          hScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
          inside: tiles.every(t => R(t).l >= R(grid).l - 1 && R(t).r <= R(grid).r + 1),
        };
      },
      longBox(host, re) {
        const body = this.section(host, re);
        if (!body) return null;
        return [...body.querySelectorAll(".gc-thumb .gc-caption")].find(b => b.value === LONG) || null;
      },
      editorOpen() { const o = document.getElementById("photoLabelEditor"); return !!o && !o.classList.contains("hidden"); },
      editorInput() { return document.getElementById("photoLabelEditorInput"); },
    };
  }, { HEADER, ALL_HEADERS, LONG });
}

module.exports = defineSuite("tile-width-label-editor", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);
  await setup(page);

  // ---------- F1 + F2 layout, every screen, three viewports -----------------
  for (const [w, h] of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    for (const screen of SCREENS) {
      const tag = screen + " @" + w + "x" + h;
      const M = await page.evaluate(async (screen) => {
        const T = __tw;
        const o = await T.open(screen);
        await T.sleep(150);
        const m = T.measure(o);
        const box = T.longBox(o.host, o.list);
        if (box) {
          const s = getComputedStyle(box);
          const lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.25;
          m.box = { white: s.whiteSpace, ellipsis: s.textOverflow, overflow: s.overflowX,
            overflows: box.scrollWidth > box.clientWidth + 1, h: box.getBoundingClientRect().height,
            lh, readOnly: box.readOnly, value: box.value };
          box.click();
          m.editor = { open: T.editorOpen(), value: T.editorInput().value };
          const panel = document.querySelector("#photoLabelEditor .label-editor-panel");
          const pr = panel.getBoundingClientRect();
          const inp = T.editorInput();
          m.editor.panelW = pr.width; m.editor.left = pr.left; m.editor.right = pr.right;
          m.editor.wholeLabel = inp.scrollHeight <= inp.clientHeight + 1;
          m.editor.vw = window.innerWidth;
          T.closeAll();
        }
        return m;
      }, screen);
      ok(M.found && M.count === 3, "F1a " + tag + " the list has its 3 photos: " + JSON.stringify([M.found, M.count]));
      if (!M.found) continue;
      const near = (a, b) => Math.abs(a - b) <= 1.5;
      ok(M.widths.length === 4 && M.widths.every(x => near(x, M.half)),
        "F1b " + tag + " every tile and the + tile are half the section wide (" + M.half.toFixed(1) + "px): " + JSON.stringify(M.widths.map(Math.round)));
      ok(M.pairW != null && near(M.widths[0], M.pairW),
        "F1c " + tag + " the tiles are as wide as a pair slot on the same screen: " + JSON.stringify([Math.round(M.widths[0]), M.pairW && Math.round(M.pairW)]));
      const r = M.rects;
      ok(near(r[0].t, r[1].t) && near(r[2].t, r[3].t) && r[2].t > r[0].t + 20 && near(r[0].l, r[2].l) && near(r[1].l, r[3].l),
        "F1d " + tag + " two per row: " + JSON.stringify(r.map(x => [Math.round(x.l), Math.round(x.t)])));
      ok(M.imgs.every(i => i.img && i.size === "contain" && near(i.w, M.half) && near(i.h, 120)),
        "F1e " + tag + " each photo (2:1, 1:1.6, 1:1) is drawn whole (contain) in a " + Math.round(M.half) + "x120 box: " + JSON.stringify(M.imgs));
      ok(M.addBox && near(M.addBox.w, M.half) && near(M.addBox.h, 120),
        "F1f " + tag + " the + box fills its tile, 120px tall like the pair slot's +: " + JSON.stringify(M.addBox));
      ok(M.removeOnCorner && M.inside && !M.hScroll,
        "F1g " + tag + " ✕ on each photo's corner, tiles inside the section, no sideways scroll: " + JSON.stringify([M.removeOnCorner, M.inside, M.hScroll]));
      const B = M.box || {};
      ok(B.white === "nowrap" && B.ellipsis === "ellipsis" && (B.overflow === "hidden" || B.overflow === "clip") && B.overflows && B.h < 2 * B.lh + 8 && B.readOnly,
        "F2a " + tag + " the long label is one line ending in …, no wrapping: " + JSON.stringify(B));
      const E = M.editor || {};
      const want = Math.min(E.vw - 20, 640);
      ok(E.open && E.value === B.value && near(E.panelW, want) && E.wholeLabel,
        "F2b " + tag + " tapping it opens a full-width editor showing the whole label: " + JSON.stringify(E));
    }
  }
  await page.setViewportSize(PHONE);

  // ---------- F2 behaviour: Done / Enter / backdrop / Cancel / Esc -----------
  const D = await page.evaluate(async () => {
    const T = __tw;
    const out = {};
    let o = await T.open("manageCoin");
    T.calls = [];
    const box = () => T.longBox(document.getElementById("managePhotosSections"), /Reference/)
      || [...document.querySelectorAll("#managePhotosSections .gc-thumb")].find(t => t.dataset.file === "AY-00099_reference_01.jpg").querySelector(".gc-caption");
    const entry = () => galleryFor("AY-00099").find(e => e.storedFilename === "AY-00099_reference_01.jpg");
    const saveBtn = () => document.getElementById("managePhotosSaveLabelsBtn").style.display !== "none";
    out.btnBefore = saveBtn();
    // Done
    box().click();
    out.note = document.getElementById("photoLabelEditorNote").textContent;
    T.editorInput().value = "Heritage lot 4411";
    document.getElementById("photoLabelEditorDone").click();
    out.done = { open: T.editorOpen(), box: box().value, caption: entry().caption, title: box().title,
      unsaved: photoLabelUnsaved(entry()), btn: saveBtn(), writes: T.calls.filter(c => /patch|upload/i.test(c)).length };
    // Cancel changes nothing
    box().click();
    T.editorInput().value = "should not stick";
    document.getElementById("photoLabelEditorCancel").click();
    out.cancel = { open: T.editorOpen(), box: box().value, caption: entry().caption };
    // Esc changes nothing
    box().click();
    T.editorInput().value = "esc text";
    T.editorInput().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    out.esc = { open: T.editorOpen(), box: box().value };
    // Enter applies (and a pasted newline becomes a space)
    box().click();
    T.editorInput().value = "line one\nline two";
    T.editorInput().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    out.enter = { open: T.editorOpen(), box: box().value };
    // Backdrop tap applies
    box().click();
    T.editorInput().value = "backdrop text";
    const ov = document.getElementById("photoLabelEditor");
    ov.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    out.backdrop = { open: T.editorOpen(), box: box().value };
    // Enter / Space on the box itself opens it (keyboard)
    box().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    out.keyOpen = T.editorOpen();
    T.closeAll();
    // A redraw while it is open: Done writes to the redrawn box
    box().click();
    T.editorInput().value = "after redraw";
    renderManagePhotos(); T.openAll("managePhotosSections");
    document.getElementById("photoLabelEditorDone").click();
    out.redraw = { box: box().value, caption: entry().caption };
    // Leaving the screen closes it and applies nothing
    box().click();
    T.editorInput().value = "never applied";
    navigate("dashboard");
    out.nav = { open: T.editorOpen(), caption: entry().caption };
    out.writesTotal = T.calls.filter(c => /patch|upload/i.test(c)).length;
    // Save labels writes the edited label (one cell)
    o = await T.open("manageCoin");
    box().click(); T.editorInput().value = "Heritage lot 4411";
    document.getElementById("photoLabelEditorDone").click();
    T.patches = [];
    document.getElementById("managePhotosSaveLabelsBtn").click();
    await T.waitFor(() => T.mock._grids.Photos.find(r => r[0] === "PH-00002")[5] === "Heritage lot 4411", 3000);
    out.saved = { cell: T.mock._grids.Photos.find(r => r[0] === "PH-00002")[5], patches: T.patches.slice() };
    // A legacyOnly box never opens the editor
    const leg = galleryFor("AY-00099").find(e => e.type === "reference" && e.storedFilename === "AY-00099_reference_03.jpg");
    leg.legacyOnly = true; renderManagePhotos(); T.openAll("managePhotosSections");
    const legBox = [...document.querySelectorAll("#managePhotosSections .gc-thumb")].find(t => t.dataset.file === "AY-00099_reference_03.jpg").querySelector(".gc-caption");
    legBox.click();
    out.legacy = { open: T.editorOpen(), cls: legBox.className };
    T.closeAll();
    return out;
  });
  ok(!D.btnBefore && /Save labels/.test(D.note), "F2c the editor says the label saves with Save labels on Manage Photos: " + JSON.stringify([D.btnBefore, D.note]));
  ok(!D.done.open && D.done.box === "Heritage lot 4411" && D.done.caption === "Heritage lot 4411" && D.done.title === "Heritage lot 4411",
    "F2d Done puts the text back in the box (and its tooltip): " + JSON.stringify(D.done));
  ok(D.done.unsaved && D.done.btn && D.done.writes === 0,
    "F2e -- still unsaved: no write, and \"Save labels\" appears: " + JSON.stringify(D.done));
  ok(!D.cancel.open && D.cancel.box === "Heritage lot 4411" && D.cancel.caption === "Heritage lot 4411",
    "F2f Cancel changes nothing: " + JSON.stringify(D.cancel));
  ok(!D.esc.open && D.esc.box === "Heritage lot 4411", "F2g Esc changes nothing: " + JSON.stringify(D.esc));
  ok(!D.enter.open && D.enter.box === "line one line two", "F2h Enter applies, and a newline becomes a space: " + JSON.stringify(D.enter));
  ok(!D.backdrop.open && D.backdrop.box === "backdrop text", "F2i a backdrop tap applies: " + JSON.stringify(D.backdrop));
  ok(D.keyOpen, "F2j Enter on the box opens the editor (keyboard)");
  ok(D.redraw.box === "after redraw" && D.redraw.caption === "after redraw",
    "F2k a redraw while the editor is open: Done writes to the box on screen now: " + JSON.stringify(D.redraw));
  ok(!D.nav.open && D.nav.caption !== "never applied" && D.writesTotal === 0,
    "F2l leaving the screen closes the editor and applies nothing; nothing written: " + JSON.stringify([D.nav, D.writesTotal]));
  ok(D.saved.cell === "Heritage lot 4411" && D.saved.patches.length === 1 && /^Photos!F(\d+)(:F\1)?$/.test(D.saved.patches[0]),
    "F2m Save labels then writes the edited label, one cell: " + JSON.stringify(D.saved));
  ok(!D.legacy.open && /gc-caption-legacy/.test(D.legacy.cls), "F2n a legacyOnly box never opens the editor: " + JSON.stringify(D.legacy));

  // ---------- F2 draft mode and Edit Coin Save Changes ----------------------
  const G = await page.evaluate(async () => {
    const T = __tw;
    const out = {};
    let o = await T.open("addCoin");
    T.calls = [];
    let box = T.longBox(o.host, /Reference/);
    box.click();
    out.note = document.getElementById("photoLabelEditorNote").textContent;
    T.editorInput().value = "Draft label";
    document.getElementById("photoLabelEditorDone").click();
    const e = galleryFor(ADDCOIN_GALLERY_ID).find(x => x.filename === ADDCOIN_GALLERY_ID + "_reference_01.jpg");
    out.draft = { caption: e && e.caption, writes: T.calls.length };
    o = await T.open("editCoin");
    box = T.longBox(o.host, /Reference/);
    box.click();
    out.editNote = document.getElementById("photoLabelEditorNote").textContent;
    T.editorInput().value = "Edited in editor";
    document.getElementById("photoLabelEditorDone").click();
    T.patches = [];
    document.getElementById("browseEditSaveBtn").click();
    await T.waitFor(() => T.mock._grids.Photos.find(r => r[0] === "PH-00002")[5] === "Edited in editor", 3000);
    out.saved = { cell: T.mock._grids.Photos.find(r => r[0] === "PH-00002")[5], photoPatches: T.patches.filter(p => p.indexOf("Photos!") === 0) };
    return out;
  });
  ok(/Save\b/.test(G.note) && G.draft.caption === "Draft label" && G.draft.writes === 0,
    "F2o draft mode (Add Coin): Done changes the draft's label in memory, nothing written: " + JSON.stringify([G.note, G.draft]));
  ok(/Save Changes/.test(G.editNote) && G.saved.cell === "Edited in editor" && G.saved.photoPatches.length === 1,
    "F2p Edit Coin: the editor says Save Changes, and Save Changes writes the edited label (one cell): " + JSON.stringify([G.editNote, G.saved]));

  // ---------- F3 the Manage Photos footer -----------------------------------
  const F3 = await page.evaluate(async () => {
    const T = __tw;
    await T.open("manageCoin");
    const owned = document.getElementById("managePhotosNote").textContent;
    openManagePhotos({ id: "AY-00888", name: "Set in progress", meta: "AY-00888", kind: "set", draft: {}, backTo: () => {} });
    const draft = document.getElementById("managePhotosNote").textContent;
    const html = document.documentElement.innerHTML;
    return { owned, draft, stale: /Photos are held for this session only — no OneDrive write happens yet/.test(html) };
  });
  ok(/save to OneDrive/.test(F3.owned) && /Save labels/.test(F3.owned) && !/no OneDrive write/.test(F3.owned),
    "F3a an owned record's footer says photos save to OneDrive and labels save with Save labels: " + JSON.stringify(F3.owned));
  ok(/isn't on the All sheet yet/.test(F3.draft) && /session only/.test(F3.draft),
    "F3b a record not on the All sheet yet says its photos are kept for this session only: " + JSON.stringify(F3.draft));
  ok(!F3.stale, "F3c the old \"no OneDrive write happens yet\" footer is gone from the page");

  await page.evaluate(() => {
    __setLiveCoinsForTest(null); __setStoredPhotosForTest(null);
    __setAddCoinWriteEnabledForTest(null); __setBrowseEditWriteEnabledForTest(null);
    __setGraphClientForTest(null);
  });
}, module);
