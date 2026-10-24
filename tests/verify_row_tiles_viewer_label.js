// Photo tiles at one row height, labels edited in the full-screen viewer,
// and the Manage Photos footer (Oct 2026, Ray's tablet test of
// claude/photo-label-save-changes at 22c407f; replaces the half-width
// letterboxed tiles and the inline label box / full-width editor).
//
//   T  Reference / COA / Other tiles on every chooser screen (Edit Coin,
//      Manage Photos coin, Edit Set, Manage Photos Set, Add Coin, a
//      Staging-draft edit), at 360x800, 412x915 and 1024x768: every photo is
//      its own shape at the row height (110px, 200px from 700px wide), no
//      bars, never wider than the row (a wider one scaled down whole), tops
//      aligned per row, tiles at least 80px wide with a narrow photo centred,
//      the "+" tile a square at the row height, ✕ on the photo's corner, and
//      one centred label line ("Tap to label" when empty, … when long).
//   V  tapping the photo opens the full-screen viewer with a label field at
//      the top (above where the keyboard comes up), holding the label, with
//      the line saying what will save it.
//   B  Done applies the text, unsaved (no write; Save labels appears);
//      Cancel / Esc / phone Back change nothing; Enter applies; the label
//      line opens it too; ✕ and ↻ keep their jobs; a redraw while open;
//      leaving the screen applies nothing; Discard restores; Save labels
//      writes one cell; legacy photos get no field.
//   G  draft mode (Add Coin) and Edit Coin's Save Changes.
//   P  a pair-slot photo opens the viewer VIEW ONLY; ✕ / Replace don't.
//   C  the coin page's Photos strip (and a Set's page): same height, tops
//      aligned, category captions centred and wrapping, no label; the parent
//      Set's COA on the three coin screens the same way.
//   K  Add Set (C4) is untouched: its gallery tiles and step 2's parent-COA
//      copy keep their old look.
//   F3 the Manage Photos footer says what really happens.

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
      child: { id: "AY-00090-A", name: "1957 Lincoln Cent", denom: "1C", year: 1957, mint: "", description: "Lincoln Wheat Cent", originSetId: "AY-00090" },
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
          ["PH-00005", "AY-00099", "Reference", "", "AY-00099_reference_04.jpg", "Panorama", 46000, ""],
          ["PH-00010", "AY-00090", "OGP_Obverse", "", "AY-00090_ogp_obverse.jpg", "", 46000, ""],
          ["PH-00011", "AY-00090", "COA", "", "AY-00090_coa_01.jpg", LONG, 46000, ""],
          ["PH-00012", "AY-00090", "COA", "", "AY-00090_coa_02.jpg", "page 2", 46000, ""],
          ["PH-00013", "AY-00090", "COA", "", "AY-00090_coa_03.jpg", "", 46000, ""],
          ["PH-00014", "AY-00090", "COA", "", "AY-00090_coa_04.jpg", "Panorama", 46000, ""],
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
        __setLiveCoinsForTest([this.coin, this.set, this.child]);
        const idx = (r) => ({ photoId: r[0], photoType: r[2], galleryType: galleryTypeForPhotoType(r[2]),
          subGroupId: "", filename: r[4], originalFilename: "", label: r[5] });
        __setStoredPhotosForTest({
          "AY-00099": rows.filter(r => r[1] === "AY-00099").map(idx),
          "AY-00090": rows.filter(r => r[1] === "AY-00090").map(idx),
        });
        // A wide photo (2:1), a tall one (1:1.6), a square one and a 6:1
        // panorama (wider than any row, so it is capped).
        const shapes = { "_01.jpg": [400, 200, "#2a6"], "_02.jpg": [200, 320, "#a62"], "_03.jpg": [300, 300, "#26a"],
          "_04.jpg": [1200, 200, "#62a"] };
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
        if (mediaViewerIsOpen()) hideMediaViewer();
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
          for (const [f, cap] of [["_reference_01.jpg", LONG], ["_reference_02.jpg", "Tall slab"], ["_reference_03.jpg", ""], ["_reference_04.jpg", "Panorama"]]) {
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
          for (const [f, wh] of [["_reference_01.jpg", [400, 200]], ["_reference_02.jpg", [200, 320]], ["_reference_03.jpg", [300, 300]], ["_reference_04.jpg", [1200, 200]]]) {
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
              { type: "reference", filename: id + "_reference_03.jpg", caption: "" },
              { type: "reference", filename: id + "_reference_04.jpg", caption: "Panorama" }
            ],
            researchNote: "", allRowWritten: false, forceAdded: false, filesMovedOnPromotion: false,
            savedVia: "staging", createdDate: "2026-10-20T17:57:36Z"
          });
          await beginCoinDraftEdit(id);
          await this.waitFor(() => galleryFor(ADDCOIN_GALLERY_ID).filter(e => e.type === "reference" && e.url).length >= 4, 3000);
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
      // The open-ended list on this screen, measured. Rows: a new row starts
      // where a tile's left edge is not right of the previous one.
      async settle(o) {
        await this.waitFor(() => [...o.host.querySelectorAll(".gc-row-sizer")].every(i => i.complete), 3000);
        await this.sleep(60);
      },
      measure(o) {
        const R = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
        const body = this.section(o.host, o.list);
        const grid = body && body.querySelector(".gc-chooser-grid");
        if (!grid) return { found: false };
        const rowH = parseFloat(getComputedStyle(grid).getPropertyValue("--gc-row-h"));
        const tiles = [...grid.children].filter(c => c.classList.contains("gc-thumb") || c.classList.contains("gc-add-tile"));
        const thumbs = tiles.filter(c => c.classList.contains("gc-thumb"));
        const add = tiles.find(c => c.classList.contains("gc-add-tile"));
        const gridR = R(grid);
        const photos = thumbs.map(t => {
          const b = t.querySelector(".gc-img");
          const s = getComputedStyle(b);
          const sizer = b.querySelector(".gc-row-sizer");
          const line = t.querySelector(".gc-label-line");
          const ls = line ? getComputedStyle(line) : null;
          const x = t.querySelector(".gc-remove");
          const br = R(b), tr = R(t), xr = x ? R(x) : null;
          return {
            file: t.dataset.file, tileW: tr.w, tileL: tr.l, tileR: tr.r, w: br.w, h: br.h,
            ar: sizer && sizer.naturalHeight ? sizer.naturalWidth / sizer.naturalHeight : null,
            size: s.backgroundSize, color: s.backgroundColor, img: s.backgroundImage !== "none",
            centreOff: Math.abs((br.l + br.r) / 2 - (tr.l + tr.r) / 2),
            xOnCorner: !!xr && Math.abs(xr.r - br.r - 6) < 2 && Math.abs(xr.t - br.t + 6) < 2,
            line: line ? { text: line.textContent, cls: line.className, white: ls.whiteSpace, ellipsis: ls.textOverflow,
              align: ls.textAlign, w: R(line).w, overflows: line.scrollWidth > line.clientWidth + 1,
              h: R(line).h, fs: parseFloat(ls.fontSize) } : null,
          };
        });
        const rects = tiles.map(R);
        const rows = [];
        rects.forEach((r, i) => { if (!i || r.l <= rects[i - 1].l) rows.push([r]); else rows[rows.length - 1].push(r); });
        const box = add && add.querySelector(".gc-add-box");
        return {
          found: true, count: thumbs.length, rowH, gridW: gridR.w, photos,
          rows: rows.map(row => row.map(r => Math.round(r.t))),
          inside: rects.every(r => r.l >= gridR.l - 1 && r.r <= gridR.r + 1),
          addBox: box ? { w: R(box).w, h: R(box).h, tileW: R(add).w } : null,
          hScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
        };
      },
      thumb(host, file) { return [...host.querySelectorAll(".gc-thumb")].find(t => t.dataset.file === file) || null; },
      viewer() {
        const ov = document.getElementById("mediaViewerOverlay");
        const lab = document.getElementById("mediaViewerLabel");
        const img = document.querySelector("#mediaViewerStage img");
        return { open: !ov.classList.contains("hidden"), field: !lab.classList.contains("hidden"),
          value: document.getElementById("mediaViewerLabelInput").value,
          title: document.getElementById("mediaViewerTitle").textContent,
          note: document.getElementById("mediaViewerLabelNote").textContent,
          footer: document.getElementById("mediaViewerFooter").textContent,
          img: img ? img.getAttribute("src") : null };
      },
      input() { return document.getElementById("mediaViewerLabelInput"); },
    };
  }, { HEADER, ALL_HEADERS, LONG });
}

const AR = { "_01.jpg": 2, "_02.jpg": 0.625, "_03.jpg": 1, "_04.jpg": 6 };
const arOf = (file) => AR[Object.keys(AR).find(k => String(file).endsWith(k))];
const near = (a, b, d) => Math.abs(a - b) <= (d == null ? 1.5 : d);

module.exports = defineSuite("row-tiles-viewer-label", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);
  await setup(page);

  // ---------- T + V: layout and the viewer, every screen, three viewports ----
  for (const [w, h] of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    const wantRowH = w >= 700 ? 200 : 110;
    for (const screen of SCREENS) {
      const tag = screen + " @" + w + "x" + h;
      const M = await page.evaluate(async (screen) => {
        const T = __tw;
        const o = await T.open(screen);
        await T.sleep(150);
        T.openAll(o.host.id);
        await T.settle(o);
        const m = T.measure(o);
        // V: tap the long-label photo.
        const body = T.section(o.host, o.list);
        const t = body && [...body.querySelectorAll(".gc-thumb")].find(x => /_01\.jpg$/.test(x.dataset.file));
        if (t) {
          t.querySelector(".gc-img").dispatchEvent(new MouseEvent("click", { bubbles: true }));
          await T.sleep(30);
          m.viewer = T.viewer();
          const fr = document.getElementById("mediaViewerLabel").getBoundingClientRect();
          const sr = document.getElementById("mediaViewerStage").getBoundingClientRect();
          m.viewer.fieldTop = fr.top; m.viewer.fieldBottom = fr.bottom; m.viewer.stageTop = sr.top;
          m.viewer.vh = window.innerHeight;
          T.closeAll();
        }
        // A row whose tiles differ in height: one photo still saving has an
        // extra "Saving…" line, so its tile is taller than its neighbours.
        if (screen === "manageCoin") {
          const tall = galleryFor("AY-00099").find(e => e.storedFilename === "AY-00099_reference_02.jpg");
          tall.uploadPending = true;
          renderManagePhotos(); T.openAll("managePhotosSections");
          await T.settle(o);
          const grid = T.section(o.host, o.list).querySelector(".gc-chooser-grid");
          const tiles = [...grid.children].filter(c => c.classList.contains("gc-thumb") || c.classList.contains("gc-add-tile"));
          const rs = tiles.map(t => t.getBoundingClientRect());
          const rows = [];
          rs.forEach((r, i) => { if (!i || r.left <= rs[i - 1].left) rows.push([r]); else rows[rows.length - 1].push(r); });
          m.mixed = rows.filter(r => r.length > 1 && r.some(x => Math.abs(x.height - r[0].height) > 4))
            .map(r => r.map(x => [Math.round(x.top), Math.round(x.height)]));
          tall.uploadPending = false;
        }
        return m;
      }, screen);
      ok(M.found && M.count === 4, "T1 " + tag + " the list has its 4 photos: " + JSON.stringify([M.found, M.count]));
      if (!M.found) continue;
      ok(near(M.rowH, wantRowH, 0.1), "T2 " + tag + " the row height is " + wantRowH + "px: " + M.rowH);
      const shapeOk = M.photos.every(p => {
        const ar = arOf(p.file);
        const wantW = Math.min(M.rowH * ar, M.gridW);
        return ar && near(p.w, wantW) && near(p.w / p.h, ar, ar * 0.03);
      });
      ok(shapeOk, "T3 " + tag + " each photo is its own shape at the row height, a wider one scaled down whole to the row: " +
        JSON.stringify(M.photos.map(p => [p.file.slice(-7), Math.round(p.w), Math.round(p.h)])));
      const capped = M.photos.find(p => arOf(p.file) === 6);
      ok(capped && near(capped.w, M.gridW) && capped.h < M.rowH - 5 && M.inside && !M.hScroll,
        "T4 " + tag + " a photo wider than the row (6:1) is capped at the row width, shorter, nothing past the section edge: " +
        JSON.stringify([capped && Math.round(capped.w), Math.round(M.gridW), capped && Math.round(capped.h), M.inside, M.hScroll]));
      ok(M.photos.every(p => p.img && p.size === "cover" && !/^rgba?\(0, 0, 0(, 1)?\)$/.test(p.color)),
        "T5 " + tag + " no bars: the box is the photo's shape (cover) on a non-black background: " +
        JSON.stringify(M.photos.map(p => [p.size, p.color])));
      ok(M.rows.length >= 2 && M.rows.every(r => r.every(t => Math.abs(t - r[0]) <= 1)),
        "T6 " + tag + " rows wrap and the tops in each row line up: " + JSON.stringify(M.rows));
      if (screen === "manageCoin") {
        ok(M.mixed && M.mixed.length >= 1 && M.mixed.every(r => r.every(x => Math.abs(x[0] - r[0][0]) <= 1)),
          "T6b " + tag + " in a row whose tiles differ in height (one still saving), the tops still line up: " + JSON.stringify(M.mixed));
      }
      const tall = M.photos.find(p => arOf(p.file) === 0.625);
      ok(M.photos.every(p => p.tileW >= 80 - 0.5 && p.centreOff <= 1) && tall && near(tall.tileW, Math.max(80, tall.w)),
        "T7 " + tag + " every tile is at least 80px wide, a narrower photo centred in it: " +
        JSON.stringify(M.photos.map(p => [Math.round(p.tileW), Math.round(p.w), p.centreOff.toFixed(1)])));
      ok(M.addBox && near(M.addBox.w, M.rowH) && near(M.addBox.h, M.rowH) && near(M.addBox.tileW, M.rowH),
        "T8 " + tag + " the + tile is a square at the row height: " + JSON.stringify(M.addBox));
      ok(M.photos.every(p => p.xOnCorner), "T9 " + tag + " ✕ sits on each photo's own corner");
      const lines = M.photos.map(p => p.line);
      const longL = M.photos.find(p => arOf(p.file) === 2).line;
      const emptyL = M.photos.find(p => arOf(p.file) === 1).line;
      ok(lines.every(l => l && l.white === "nowrap" && l.ellipsis === "ellipsis" && l.align === "center" &&
          l.h < l.fs * 2.4 + 8) && M.photos.every(p => near(p.line.w, p.tileW)),
        "T10 " + tag + " one centred label line per tile, as wide as the tile: " + JSON.stringify(lines.map(l => l && [l.white, l.align, Math.round(l.w)])));
      ok(longL.text === LONG && longL.overflows && emptyL.text === "Tap to label" && /gc-label-empty/.test(emptyL.cls),
        "T11 " + tag + " a long label ends in …; an empty one reads a muted \"Tap to label\": " + JSON.stringify([longL.overflows, emptyL.text, emptyL.cls]));
      const V = M.viewer || {};
      const wantNote = screen === "addCoin" || screen === "stagingEdit" ? /tap Save\./ : /^manage/.test(screen) ? /Save labels/ : /Save Changes/;
      ok(V.open && V.field && V.value === LONG && V.img && wantNote.test(V.note),
        "V1 " + tag + " tapping the photo opens the full-screen viewer with the label field, its label and the right save note: " +
        JSON.stringify([V.open, V.field, V.value === LONG, !!V.img, V.note]));
      ok(V.fieldBottom != null && V.fieldBottom <= V.vh * 0.5 && V.fieldTop < V.stageTop,
        "V2 " + tag + " the field is at the top, above the photo, clear of where the keyboard comes up: " +
        JSON.stringify([Math.round(V.fieldTop), Math.round(V.fieldBottom), V.vh]));
    }
  }
  await page.setViewportSize(PHONE);

  // ---------- B: the viewer's behaviour ---------------------------------
  const D = await page.evaluate(async () => {
    const T = __tw;
    const out = {};
    let o = await T.open("manageCoin");
    T.openAll("managePhotosSections");
    T.calls = [];
    const host = document.getElementById("managePhotosSections");
    const tile = () => T.thumb(host, "AY-00099_reference_01.jpg");
    const photo = () => tile().querySelector(".gc-img");
    const line = () => tile().querySelector(".gc-label-line");
    const entry = () => galleryFor("AY-00099").find(e => e.storedFilename === "AY-00099_reference_01.jpg");
    const saveBtn = () => document.getElementById("managePhotosSaveLabelsBtn").style.display !== "none";
    const tap = (el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const writes = () => T.calls.filter(c => /patch|upload/i.test(c)).length;
    out.btnBefore = saveBtn();
    // Done
    tap(photo()); T.input().value = "Heritage lot 4411";
    document.getElementById("mediaViewerLabelDone").click();
    await T.sleep(60);
    out.done = { open: T.viewer().open, line: line().textContent, title: line().title, caption: entry().caption,
      unsaved: photoLabelUnsaved(entry()), btn: saveBtn(), writes: writes() };
    // Cancel
    tap(photo()); T.input().value = "should not stick";
    document.getElementById("mediaViewerLabelCancel").click();
    await T.sleep(60);
    out.cancel = { open: T.viewer().open, caption: entry().caption, line: line().textContent };
    // Esc
    tap(photo()); T.input().value = "esc text";
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await T.sleep(60);
    out.esc = { open: T.viewer().open, caption: entry().caption };
    // The phone's Back button (history back)
    tap(photo()); T.input().value = "back text";
    // Only press Back while the viewer's own history entry is on top; with no
    // viewer open it would leave the app and end the test without a result.
    const viewerOnTop = T.viewer().open && !!(history.state && history.state.mediaViewer);
    if (viewerOnTop) { history.back(); await T.waitFor(() => !T.viewer().open, 2000); }
    out.back = { viewerOnTop, open: T.viewer().open, caption: entry().caption };
    // Enter applies, a newline becomes a space
    tap(photo()); T.input().value = "line one\nline two";
    T.input().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await T.sleep(60);
    out.enter = { open: T.viewer().open, caption: entry().caption };
    // The label line opens it too
    tap(line()); await T.sleep(20);
    out.lineOpen = { open: T.viewer().open, field: T.viewer().field, value: T.viewer().value };
    T.closeAll();
    // ✕ on the photo asks to remove, it doesn't open the viewer
    tile().querySelector(".gc-remove").click(); await T.sleep(20);
    const wg = document.getElementById("writeGuardOverlay");
    out.remove = { viewer: T.viewer().open, guard: !!wg && !wg.classList.contains("hidden") };
    T.closeAll();
    // A redraw while it is open: Done lands on the tile now on screen
    tap(photo()); T.input().value = "after redraw";
    renderManagePhotos(); T.openAll("managePhotosSections");
    document.getElementById("mediaViewerLabelDone").click();
    await T.sleep(60);
    out.redraw = { caption: entry().caption, line: line().textContent };
    // Leaving the screen applies nothing
    tap(photo()); T.input().value = "never applied";
    navigate("dashboard");
    await T.sleep(60);
    out.nav = { open: T.viewer().open, caption: entry().caption };
    out.writesTotal = writes();
    // Discard puts the saved label back
    o = await T.open("manageCoin"); T.openAll("managePhotosSections");
    tap(photo()); T.input().value = "to discard";
    document.getElementById("mediaViewerLabelDone").click(); await T.sleep(60);
    discardPhotoLabels("AY-00099");
    out.discard = { caption: entry().caption, line: line().textContent };
    // Save labels writes the edited label, one cell
    tap(photo()); T.input().value = "Heritage lot 4411";
    document.getElementById("mediaViewerLabelDone").click(); await T.sleep(60);
    T.patches = [];
    document.getElementById("managePhotosSaveLabelsBtn").click();
    await T.waitFor(() => T.mock._grids.Photos.find(r => r[0] === "PH-00002")[5] === "Heritage lot 4411", 3000);
    out.saved = { cell: T.mock._grids.Photos.find(r => r[0] === "PH-00002")[5], patches: T.patches.slice() };
    // A legacy photo: the viewer has no field, and says how to label it
    const leg = galleryFor("AY-00099").find(e => e.storedFilename === "AY-00099_reference_03.jpg");
    leg.legacyOnly = true; renderManagePhotos(); T.openAll("managePhotosSections");
    const legTile = T.thumb(host, "AY-00099_reference_03.jpg");
    tap(legTile.querySelector(".gc-img")); await T.sleep(20);
    out.legacy = Object.assign(T.viewer(), { line: legTile.querySelector(".gc-label-line").textContent,
      cls: legTile.querySelector(".gc-label-line").className });
    T.closeAll();
    leg.legacyOnly = false;
    // A failed photo: ↻ retries, it doesn't open the viewer
    const failed = entry(); failed.uploadError = "boom"; renderManagePhotos(); T.openAll("managePhotosSections");
    let retried = false;
    const realRetry = window.retryGalleryPhotoCommit;
    tile().querySelector(".gc-retry").click(); await T.sleep(20);
    out.retry = { viewer: T.viewer().open };
    failed.uploadError = ""; T.closeAll();
    // The coin page viewer has no field
    navigate("browse"); showBrowseDetail(T.coin);
    const strip = document.getElementById("detailPhotoStrip");
    const st = strip && [...strip.querySelectorAll(".gc-thumb")].find(b => b.dataset.photoType === "reference");
    if (st) st.click(); await T.sleep(20);
    out.coinPage = T.viewer();
    T.closeAll();
    return out;
  });
  ok(!D.btnBefore && !D.done.open && D.done.caption === "Heritage lot 4411" && D.done.line === "Heritage lot 4411" && D.done.title === "Heritage lot 4411",
    "B1 Done closes the viewer and puts the text on the photo's label line: " + JSON.stringify(D.done));
  ok(D.done.unsaved && D.done.btn && D.done.writes === 0,
    "B2 -- still unsaved: no write, and \"Save labels\" appears: " + JSON.stringify(D.done));
  ok(!D.cancel.open && D.cancel.caption === "Heritage lot 4411" && D.cancel.line === "Heritage lot 4411",
    "B3 Cancel changes nothing: " + JSON.stringify(D.cancel));
  ok(!D.esc.open && D.esc.caption === "Heritage lot 4411", "B4 Esc changes nothing: " + JSON.stringify(D.esc));
  ok(D.back.viewerOnTop && !D.back.open && D.back.caption === "Heritage lot 4411", "B5 the phone's Back button closes it and changes nothing: " + JSON.stringify(D.back));
  ok(!D.enter.open && D.enter.caption === "line one line two", "B6 Enter applies, and a newline becomes a space: " + JSON.stringify(D.enter));
  ok(D.lineOpen.open && D.lineOpen.field && D.lineOpen.value === "line one line two",
    "B7 tapping the label line opens the viewer too: " + JSON.stringify(D.lineOpen));
  ok(!D.remove.viewer && D.remove.guard, "B8 ✕ asks to remove the photo and doesn't open the viewer: " + JSON.stringify(D.remove));
  ok(D.redraw.caption === "after redraw" && D.redraw.line === "after redraw",
    "B9 a redraw while the viewer is open: Done lands on the tile on screen now: " + JSON.stringify(D.redraw));
  ok(!D.nav.open && D.nav.caption !== "never applied" && D.writesTotal === 0,
    "B10 leaving the screen closes the viewer and applies nothing; nothing written: " + JSON.stringify([D.nav, D.writesTotal]));
  ok(D.discard.caption === LONG && D.discard.line === LONG, "B11 Discard puts the saved label back: " + JSON.stringify(D.discard));
  ok(D.saved.cell === "Heritage lot 4411" && D.saved.patches.length === 1 && /^Photos!F(\d+)(:F\1)?$/.test(D.saved.patches[0]),
    "B12 Save labels then writes the edited label, one cell: " + JSON.stringify(D.saved));
  ok(D.legacy.open && !D.legacy.field && /Replace this photo to give it a label/.test(D.legacy.footer) &&
      D.legacy.line === "Replace this photo to give it a label" && /gc-label-legacy/.test(D.legacy.cls),
    "B13 a legacy photo opens with no label field, and says to Replace it to give it a label: " + JSON.stringify(D.legacy));
  ok(!D.retry.viewer, "B14 ↻ on a failed photo retries; it doesn't open the viewer");
  ok(D.coinPage.open && !D.coinPage.field, "B15 the coin page's viewer is view only (no label field): " + JSON.stringify(D.coinPage));

  // ---------- G: draft mode and Edit Coin Save Changes ----------------------
  const G = await page.evaluate(async () => {
    const T = __tw;
    const out = {};
    let o = await T.open("addCoin");
    T.calls = [];
    let t = T.thumb(o.host, ADDCOIN_GALLERY_ID + "_reference_01.jpg");
    t.querySelector(".gc-img").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    out.note = T.viewer().note;
    T.input().value = "Draft label";
    document.getElementById("mediaViewerLabelDone").click(); await T.sleep(60);
    const e = galleryFor(ADDCOIN_GALLERY_ID).find(x => x.filename === ADDCOIN_GALLERY_ID + "_reference_01.jpg");
    out.draft = { caption: e && e.caption, writes: T.calls.length,
      line: T.thumb(o.host, ADDCOIN_GALLERY_ID + "_reference_01.jpg").querySelector(".gc-label-line").textContent };
    o = await T.open("editCoin");
    t = T.thumb(o.host, "AY-00099_reference_01.jpg");
    t.querySelector(".gc-img").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    out.editNote = T.viewer().note;
    T.input().value = "Edited in viewer";
    document.getElementById("mediaViewerLabelDone").click(); await T.sleep(60);
    T.patches = [];
    document.getElementById("browseEditSaveBtn").click();
    await T.waitFor(() => T.mock._grids.Photos.find(r => r[0] === "PH-00002")[5] === "Edited in viewer", 3000);
    out.saved = { cell: T.mock._grids.Photos.find(r => r[0] === "PH-00002")[5], photoPatches: T.patches.filter(p => p.indexOf("Photos!") === 0) };
    return out;
  });
  ok(/tap Save\./.test(G.note) && G.draft.caption === "Draft label" && G.draft.line === "Draft label" && G.draft.writes === 0,
    "G1 draft mode (Add Coin): Done changes the draft's label in memory, nothing written: " + JSON.stringify([G.note, G.draft]));
  ok(/Save Changes/.test(G.editNote) && G.saved.cell === "Edited in viewer" && G.saved.photoPatches.length === 1,
    "G2 Edit Coin: the viewer says Save Changes, and Save Changes writes the label (one cell): " + JSON.stringify([G.editNote, G.saved]));

  // ---------- P: a pair-slot photo opens the viewer, view only --------------
  for (const screen of ["editCoin", "manageSet", "addCoin"]) {
    const P = await page.evaluate(async (screen) => {
      const T = __tw;
      const o = await T.open(screen);
      T.openAll(o.host.id);
      const out = { screen };
      if (screen === "addCoin") {
        galleryFor(ADDCOIN_GALLERY_ID).push({ type: "slab_obverse", url: T.urls["AY-00099_slab_obverse.jpg"],
          blob: await T.image(10, 10, "#000"), filename: ADDCOIN_GALLERY_ID + "_slab_obverse.jpg", caption: "" });
        renderAddCoinPhotos(); T.openAll(o.host.id);
      }
      await T.sleep(150);
      const body = T.section(o.host, o.pair);
      const face = body && body.querySelector(".sg-photo-slot .sg-photo-face");
      out.found = !!face;
      if (!face) return out;
      const img = face.querySelector(".sg-photo-img");
      face.dispatchEvent(new MouseEvent("click", { bubbles: true })); await T.sleep(20);
      out.view = T.viewer(); out.src = img && img.getAttribute("src");
      T.closeAll();
      face.querySelector(".sg-photo-remove").click(); await T.sleep(20);
      const wg = document.getElementById("writeGuardOverlay");
      out.remove = { viewer: T.viewer().open, guard: !!wg && !wg.classList.contains("hidden") };
      T.closeAll();
      const slot = face.closest(".sg-photo-slot");
      slot.querySelector('[data-act="replace"]').click(); await T.sleep(20);
      const ch = document.getElementById("imageSourceChooser");
      out.replace = { viewer: T.viewer().open, chooser: !!ch && !ch.classList.contains("hidden") };
      T.closeAll();
      return out;
    }, screen);
    ok(P.found && P.view && P.view.open && !P.view.field && P.view.img && P.view.img === P.src,
      "P1 " + screen + " tapping a pair-slot photo opens it full screen, view only (no label field): " + JSON.stringify([P.found, P.view && [P.view.open, P.view.field, P.view.title]]));
    ok(P.found && !P.remove.viewer && P.remove.guard && !P.replace.viewer && P.replace.chooser,
      "P2 " + screen + " the pair's ✕ and Replace keep their own jobs: " + JSON.stringify([P.remove, P.replace]));
  }

  // ---------- C: coin page strip and the parent Set's COA --------------------
  for (const [w, h] of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    const wantRowH = w >= 700 ? 200 : 110;
    const tag = "@" + w + "x" + h;
    const C = await page.evaluate(async () => {
      const T = __tw;
      await T.install();
      const R = (el) => el.getBoundingClientRect();
      const strip = (id) => {
        const s = document.getElementById(id) || document.querySelector(id);
        if (!s) return null;
        const tiles = [...s.querySelectorAll(":scope > .gc-thumb")];
        const rows = [];
        tiles.forEach((t, i) => { const r = R(t); if (!i || r.left <= R(tiles[i - 1]).left) rows.push([Math.round(r.top)]); else rows[rows.length - 1].push(Math.round(r.top)); });
        return {
          rowH: parseFloat(getComputedStyle(s).getPropertyValue("--gc-row-h")),
          rows, sRight: R(s).right,
          tiles: tiles.map(t => {
            const b = t.querySelector(".gc-img"), cap = t.querySelector(".gc-type"), cs = getComputedStyle(cap);
            const sizer = b.querySelector(".gc-row-sizer");
            return { w: R(b).width, h: R(b).height, right: R(t).right, tileW: R(t).width,
              ar: sizer && sizer.naturalHeight ? sizer.naturalWidth / sizer.naturalHeight : null,
              cap: cap.textContent, align: cs.textAlign, white: cs.whiteSpace, capW: R(cap).width, capH: R(cap).height,
              lh: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25 };
          })
        };
      };
      navigate("browse"); showBrowseDetail(T.coin);
      await T.waitFor(() => [...document.querySelectorAll("#detailPhotoStrip .gc-row-sizer")].length >= 5 &&
        [...document.querySelectorAll("#detailPhotoStrip .gc-row-sizer")].every(i => i.complete), 3000);
      await T.sleep(60);
      const coin = strip("detailPhotoStrip");
      navigate("browse"); showBrowseDetail(T.child);
      await T.waitFor(() => [...document.querySelectorAll('#detailParentCoa .gc-row-sizer')].every(i => i.complete) &&
        document.querySelectorAll('#detailParentCoa .gc-thumb').length >= 4, 3000);
      await T.sleep(60);
      const parentCoa = strip('#detailParentCoa [data-role="coa-strip"]');
      navigate("browse"); showBrowseDetail(T.set);
      const sacc = [...document.querySelectorAll("#detailAccordions .accordion-header")].find(x => /Photos/.test(x.textContent));
      if (sacc && sacc.getAttribute("aria-expanded") !== "true") sacc.click();
      await T.waitFor(() => [...document.querySelectorAll("#detailPhotoStrip .gc-row-sizer")].every(i => i.complete), 3000);
      await T.sleep(60);
      const set = strip("detailPhotoStrip");
      // Edit Coin and Manage Photos for the child coin: the parent's COA
      showBrowseEditView(T.child);
      await T.sleep(100);
      const ep = document.getElementById("editCoinPhotosHeader"); if (ep.getAttribute("aria-expanded") !== "true") ep.click();
      await T.waitFor(() => [...document.querySelectorAll('#browseEditPhotosSections [data-role="coa-strip"] .gc-row-sizer')].every(i => i.complete) &&
        document.querySelectorAll('#browseEditPhotosSections [data-role="coa-strip"] .gc-thumb').length >= 4, 3000);
      const editCoa = strip('#browseEditPhotosSections [data-role="coa-strip"]');
      openManagePhotos(Object.assign(buildManagePhotosCtx(T.child), { backTo: () => {} }));
      await T.waitFor(() => document.querySelectorAll('#managePhotosSections [data-role="coa-strip"] .gc-thumb').length >= 4, 3000);
      await T.sleep(60);
      const manageCoa = strip('#managePhotosSections [data-role="coa-strip"]');
      return { coin, parentCoa, set, editCoa, manageCoa,
        hScroll: document.documentElement.scrollWidth > window.innerWidth + 1 };
    });
    const check = (S, name, wantCaps) => {
      if (!S) { ok(false, name + " " + tag + " strip found"); return; }
      ok(near(S.rowH, wantRowH, 0.1) && S.tiles.length >= 1 && S.tiles.every(t => t.ar && near(t.w, Math.min(S.rowH * t.ar, t.tileW + 0.5)) &&
          near(t.w / t.h, t.ar, t.ar * 0.03) && t.right <= S.sRight + 1),
        "C1 " + name + " " + tag + " every photo is its own shape at the " + wantRowH + "px row height, inside the strip: " +
        JSON.stringify(S.tiles.map(t => [Math.round(t.w), Math.round(t.h)])));
      ok(S.rows.every(r => r.every(t => Math.abs(t - r[0]) <= 1)), "C2 " + name + " " + tag + " tops aligned per row: " + JSON.stringify(S.rows));
      ok(S.tiles.every(t => t.align === "center" && t.white === "normal" && near(t.capW, t.tileW)) && wantCaps(S.tiles.map(t => t.cap)),
        "C3 " + name + " " + tag + " category captions centred under each photo, wrapping, no specific label: " + JSON.stringify(S.tiles.map(t => t.cap)));
    };
    check(C.coin, "coin page", caps => caps.includes("Reference photo") && caps.includes("Holder — front") && !caps.some(c => c.indexOf(LONG) >= 0 || /Tall slab|Panorama/.test(c)));
    check(C.parentCoa, "coin page parent COA", caps => caps.length >= 4 && caps.every(c => c === "COA / certificate"));
    check(C.editCoa, "Edit Coin parent COA", caps => caps.length >= 4 && caps.every(c => c === "COA / certificate"));
    check(C.manageCoa, "Manage Photos parent COA", caps => caps.length >= 4 && caps.every(c => c === "COA / certificate"));
    check(C.set, "Set page", caps => caps.includes("COA / certificate") && !caps.some(c => c.indexOf(LONG) >= 0));
    const narrow = C.coin && C.coin.tiles.find(t => t.ar && t.ar < 1);
    ok(w >= 700 || (narrow && narrow.capH > narrow.lh * 1.5 && near(narrow.capW, narrow.tileW)),
      "C4 " + tag + " a caption wider than its photo wraps downward under it: " + JSON.stringify(narrow));
    ok(!C.hScroll, "C5 " + tag + " no sideways scroll on the coin screens");
  }
  await page.setViewportSize(PHONE);

  // ---------- K: Add Set (C4) is untouched -----------------------------------
  const K = await page.evaluate(async () => {
    const T = __tw;
    await T.install();
    navigate("addset");
    const tid = addSetGalleryTargetId();
    galleryFor(tid).push({ type: "coa", url: T.urls["AY-00090_coa_01.jpg"], filename: tid + "_coa_01.jpg", caption: "page 1" });
    const g = document.getElementById("addSetGallery");
    if (g && g._galleryRender) g._galleryRender();
    const th = g && g.querySelector(".gc-thumb");
    const thImg = th && th.querySelector(".gc-img");
    const out = th ? { w: th.getBoundingClientRect().width, cls: th.className, input: !!th.querySelector("input.gc-caption"),
      imgW: parseFloat(getComputedStyle(thImg).width), imgH: parseFloat(getComputedStyle(thImg).height), line: !!th.querySelector(".gc-label-line") } : null;
    galleryFor(tid).length = 0;
    const host = document.createElement("div"); document.body.appendChild(host);
    renderParentCoaReadThrough(host, "AY-00090", "1957 Proof Set");
    const pt = [...host.querySelectorAll(".gc-thumb")];
    const step2 = { count: pt.length, shaped: pt.every(t => /gc-shaped/.test(t.className) && !/gc-row-tile/.test(t.className)),
      caps: pt.map(t => t.querySelector(".gc-type").textContent) };
    host.remove();
    return { gallery: out, step2 };
  });
  ok(K.gallery && K.gallery.input && !K.gallery.line && !/gc-row-tile/.test(K.gallery.cls) && near(K.gallery.imgW, 88) && near(K.gallery.imgH, 88),
    "K1 Add Set's gallery tiles are unchanged: 88px squares with their own label box: " + JSON.stringify(K.gallery));
  ok(K.step2.count >= 4 && K.step2.shaped && K.step2.caps.includes(LONG) && K.step2.caps.includes("page 2"),
    "K2 Add Set step 2's parent-COA copy is unchanged: shaped tiles captioned with each page's label: " + JSON.stringify(K.step2));

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
