// (bs) Build 3: crop-screen basics (claude/crop-basics-bs, 11 Nov 2026).
//
// WHY. Ray's (ak) TEST found two crop-screen faults: F1 a Holder's crop box
// starts at the whole photo, so its handles sat on the panel edge and were
// hard to grab; F2 a wide photo ran off the right of the screen (the stage
// was a fixed 360 px, wider than the panel on a phone). Plus the crop
// basics he asked for in the image round: no long-press menu, nudge arrows,
// 0.5° steps with a 0.1° slider, a centre mark.
// Ray's answers Q1-Q9, 11 Nov 2026; the fix round after his TEST of Build
// 119 (14 Nov 2026): the 0° button is gone, a snap to 0 within ±0.3° and a
// 0° tick instead, one control pad per stage, circle zoom − / +, Use on
// screen at 384 x 740.
//
//   A  long-press: no context menu on either crop screen, only there
//   B  F2: the stage fits the panel at 360 / 384 / 412 / 768 for wide,
//      16:9, tall and turned photos (cap 360 x 300 kept); a short screen
//      scrolls instead of shrinking the picture below 200 px; a resize
//      keeps the box on the same part of the photo; a crop made on a
//      narrower stage still maps onto the original's pixels
//   C  F1: a whole-photo box's 8 handles sit on the dark margin, on screen,
//      grabbable, with ~44 px touch areas; box positions are on the photo,
//      not the margin; a real drag in and back out still keeps the bytes
//   D  Stage 1 arrows: 2 px a tap, never past the photo, greyed when they
//      cannot move, and the nudge reaches the full-resolution crop
//   E  Stage 2 arrows: move the picture like a drag, within its limits,
//      and the nudge reaches the stored Obverse
//   F  angle: ↺ / ↻ and the readout on both stages, the 0.1° slider, the
//      snap to exactly 0 within ±0.3°, rounding; an untouched Holder whose
//      slider was moved and let go near 0 saves the original's own bytes
//   K  the pad layout (rows, columns, nothing beside ← →, no zoom on the
//      rectangle crop), 44 / 40 px buttons, the 0° tick, Use on screen at
//      384 x 740 and 360 x 700
//   Z  circle zoom − / + (about 1% a tap, the slider follows, 100-300%)
//   G  centre mark: always on the circle, on Stage 1 only with Lock to
//      square, never in a saved picture
//   H  nothing above writes anything (apart from the one Save in F)

const { defineSuite } = require("./harness");

const PHOTOS_HEADER = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "", "OriginalFilename"];

module.exports = defineSuite("crop-basics", async ({ openApp, check, selfCheck, PHONE }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp(PHONE);

  await page.evaluate(() => {
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const waitFor = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 10000)) { if (fn()) return true; await sleep(15); } return false; };
    // Left half red, right half green (a sharp edge down the middle), w x h.
    const halves = (w, h) => {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const x = c.getContext("2d");
      x.fillStyle = "#ff0000"; x.fillRect(0, 0, w / 2, h);
      x.fillStyle = "#00ff00"; x.fillRect(w / 2, 0, w / 2, h);
      return c;
    };
    const plain = (w, h, colour) => {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const x = c.getContext("2d"); x.fillStyle = colour; x.fillRect(0, 0, w, h); return c;
    };
    const toBlob = (c, type, q) => new Promise(r => c.toBlob(r, type || "image/jpeg", q == null ? 0.92 : q));
    const sameBytes = async (a, b) => {
      if (!a || !b || a.size !== b.size) return false;
      const x = new Uint8Array(await a.arrayBuffer()), y = new Uint8Array(await b.arrayBuffer());
      for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
      return true;
    };
    const colourAt = async (blob, fx, fy) => {
      const b = await createImageBitmap(blob);
      const c = document.createElement("canvas"); c.width = b.width; c.height = b.height;
      const g = c.getContext("2d"); g.drawImage(b, 0, 0);
      const d = g.getImageData(Math.min(b.width - 1, Math.floor(b.width * fx)), Math.min(b.height - 1, Math.floor(b.height * fy)), 1, 1).data;
      b.close();
      return [d[0], d[1], d[2]];
    };
    const dims = async (blob) => { const b = await createImageBitmap(blob); const o = { w: b.width, h: b.height }; b.close(); return o; };
    // Opens the REAL pipeline for one type and leaves Stage 1 open; finish()
    // taps Use (and Use again on Stage 2 for a flip source) and returns the entry.
    let pending = null;
    const open = async (blob, type, id) => {
      const target = id || "AY-00002";
      delete galleryStore[target];
      pending = new Promise((resolve) => runCropPipeline(blob, type, target, (entry) => resolve(entry), null));
      await waitFor(() => bgCropState && bgCropState.dispW > 0);
      await sleep(30);
      return bgCropState;
    };
    const useStage1 = async () => {
      document.getElementById("bgCropUseBtn").click();
      await waitFor(() => !bgCropState, 15000);
    };
    const finish = async (stage2) => {
      const flip = bgCropState && bgCropState.handOffCanvas;
      await useStage1();
      if (flip) {
        await waitFor(() => photoAdjustState, 15000);
        if (stage2) await stage2(photoAdjustState);
        document.getElementById("photoAdjustUseBtn").click();
      }
      return pending;
    };
    const rect = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
    const visibleHandles = () => [...document.querySelectorAll("#bgCropBox .bg-crop-handle")].filter(e => getComputedStyle(e).display !== "none");
    const settle = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const writes = [];
    const origFetch = window.fetch.bind(window);
    window.fetch = (url, opts) => {
      const m = (opts && opts.method) || "GET";
      if (m !== "GET") writes.push(m + " " + url);
      return origFetch(url, opts);
    };
    window.__cb = { sleep, waitFor, halves, plain, toBlob, sameBytes, colourAt, dims, open, useStage1, finish, rect, visibleHandles, settle, writes };
  });

  // ---------- A. long-press ------------------------------------------------
  const A = await page.evaluate(async () => {
    const C = __cb;
    const fire = (el) => { const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true }); el.dispatchEvent(ev); return ev.defaultPrevented; };
    await C.open(await C.toBlob(C.halves(1600, 1200)), "obverse");
    const s1 = { img: fire(document.getElementById("bgCropImg")), box: fire(document.getElementById("bgCropBox")),
      margin: fire(document.getElementById("bgCropStage")), panel: fire(document.querySelector("#bgCropOverlay .bg-crop-panel")) };
    await C.useStage1();
    await C.waitFor(() => photoAdjustState, 15000);
    const s2 = { circle: fire(document.getElementById("photoAdjustCircle")), panel: fire(document.querySelector("#photoAdjustOverlay .photo-adjust-panel")) };
    const sel = ["bgCropOverlay", "photoAdjustOverlay"].map(id => getComputedStyle(document.getElementById(id)).userSelect);
    cancelPhotoAdjust();
    const elsewhere = fire(document.querySelector("main") || document.body);
    return { s1, s2, sel, elsewhere };
  });
  ok("A1 Stage 1: a long-press (contextmenu) on the photo, the box, the margin or the panel is cancelled: " + JSON.stringify(A.s1),
    Object.values(A.s1).every(v => v === true), A);
  ok("A2 Stage 2: a long-press on the circle or the panel is cancelled: " + JSON.stringify(A.s2), Object.values(A.s2).every(v => v === true), A);
  ok("A3 neither crop screen allows text selection: " + JSON.stringify(A.sel), A.sel.every(v => v === "none"), A);
  ok("A4 ... and only the crop screens: a long-press elsewhere in the app is left alone (Q8)", A.elsewhere === false, A);

  // ---------- B. F2: the stage fits the screen -----------------------------
  const fitAt = async (width, height) => {
    await page.setViewportSize({ width, height });
    return page.evaluate(async () => {
      const C = __cb;
      const out = [];
      const cases = [["slab_obverse", 4000, 3000, 0], ["reverse", 1920, 1080, 0], ["slab_obverse", 3000, 4000, 0], ["other", 4000, 3000, 90]];
      for (const [type, w, h, turn] of cases) {
        await C.open(await C.toBlob(C.halves(w, h), "image/jpeg", 0.8), type);
        if (turn) { document.getElementById("bgCropRotateRightBtn").click(); await C.settle(); }
        const s = bgCropState;
        const panel = document.querySelector("#bgCropOverlay .bg-crop-panel");
        const ps = getComputedStyle(panel), pr = C.rect(panel);
        const inner = { l: pr.l + parseFloat(ps.paddingLeft) + 1, r: pr.r - parseFloat(ps.paddingRight) - 1 };
        const stage = C.rect(document.getElementById("bgCropStage"));
        const handles = C.visibleHandles().map(e => ({ h: e.dataset.h, ...C.rect(e) }));
        out.push({ type, w, h, turn, dispW: s.dispW, dispH: s.dispH, stage, inner, vw: innerWidth,
          stageInPanel: stage.l >= inner.l - 0.5 && stage.r <= inner.r + 0.5,
          handlesOnScreen: handles.length > 0 && handles.every(x => x.l >= 0 && x.r <= innerWidth),
          capped: s.dispW <= 360 && s.dispH <= 300 });
        cancelBgCrop();
      }
      return out;
    });
  };
  const B = {};
  for (const [w, h] of [[360, 740], [384, 832], [412, 915], [768, 1024]]) B[w] = await fitAt(w, h);
  for (const w of [360, 384, 412, 768]) {
    const bad = B[w].filter(c => !(c.stageInPanel && c.handlesOnScreen && c.capped));
    ok("B1 at " + w + " px wide the crop stage sits inside the panel and every handle is on screen (4:3, 16:9 Reverse, 3:4, 4:3 turned 90°)" +
      (bad.length ? ": " + JSON.stringify(bad) : ""), bad.length === 0, B[w]);
  }
  ok("B2 the 360 x 300 cap is kept: a 4:3 photo on a tablet is 360 x 270: " + JSON.stringify([B[768][0].dispW, B[768][0].dispH]),
    B[768][0].dispW === 360 && B[768][0].dispH === 270, B[768]);
  ok("B3 on a phone the picture shrinks to fit (412 px wide: under 360): " + B[412][0].dispW, B[412][0].dispW < 360 && B[412][0].dispW >= 280, B[412]);

  // A short screen: the picture keeps at least 200 px of height and the panel scrolls.
  await page.setViewportSize({ width: 412, height: 520 });
  const B4 = await page.evaluate(async () => {
    const C = __cb;
    await C.open(await C.toBlob(C.halves(3000, 4000), "image/jpeg", 0.8), "slab_obverse");
    const ov = document.getElementById("bgCropOverlay");
    ov.scrollTop = 0; await C.settle();
    const panelTop = C.rect(ov.querySelector(".bg-crop-panel")).t;
    const scrolls = ov.scrollHeight > ov.clientHeight + 1;
    ov.scrollTop = ov.scrollHeight; await C.settle();
    const use = C.rect(document.getElementById("bgCropUseBtn"));
    const r = { dispH: bgCropState.dispH, panelTop, scrolls, useBottom: use.b, vh: innerHeight };
    cancelBgCrop();
    return r;
  });
  ok("B4 on a short screen (412 x 520) the picture stays at least 200 px tall: " + B4.dispH, B4.dispH >= 200, B4);
  ok("B5 ... and the panel scrolls: its top is not cut off, and Use Crop can be scrolled into view: " + JSON.stringify(B4),
    B4.scrolls && B4.panelTop >= 0 && B4.useBottom <= B4.vh + 0.5, B4);

  // A resize mid-crop keeps the box on the same part of the photo.
  await page.setViewportSize({ width: 412, height: 915 });
  await page.evaluate(async () => {
    const C = __cb;
    const s = await C.open(await C.toBlob(C.halves(4000, 3000), "image/jpeg", 0.9), "slab_reverse");
    s.box = { left: s.dispW * 0.25, top: s.dispH * 0.2, right: s.dispW * 0.5, bottom: s.dispH * 0.8 };
    renderBgCrop();
    window.__cbB6 = { before: s.dispW };
  });
  await page.setViewportSize({ width: 360, height: 740 });
  const B6 = await page.evaluate(async () => {
    const C = __cb;
    await C.sleep(100);
    const s = bgCropState, b = s.box;
    const frac = [b.left / s.dispW, b.top / s.dispH, b.right / s.dispW, b.bottom / s.dispH];
    // The crop of exactly the box, made on the narrower stage: the photo's
    // middle-left quarter strip (red, ending on the red / green edge).
    const entry = await C.finish();
    const d = await C.dims(entry.blob);
    return { before: window.__cbB6.before, after: s.dispW, frac, d, left: await C.colourAt(entry.blob, 0.1, 0.5), right: await C.colourAt(entry.blob, 0.9, 0.5) };
  });
  ok("B6 turning the phone / a resize re-fits the stage (" + B6.before + " -> " + B6.after + " px) and keeps the box on the same part of the photo: " + JSON.stringify(B6.frac.map(v => v.toFixed(3))),
    B6.after < B6.before && Math.abs(B6.frac[0] - 0.25) < 0.01 && Math.abs(B6.frac[1] - 0.2) < 0.01 && Math.abs(B6.frac[2] - 0.5) < 0.01 && Math.abs(B6.frac[3] - 0.8) < 0.01, B6);
  ok("B7 ... and the crop still maps onto the original at full resolution (1000 x 1800 of 4000 x 3000, red to the edge): " + JSON.stringify([B6.d, B6.left, B6.right]),
    Math.abs(B6.d.w - 1000) <= 3 && Math.abs(B6.d.h - 1800) <= 3 && B6.left[0] > 200 && B6.left[1] < 60 && B6.right[0] > 200 && B6.right[1] < 60, B6);

  // ---------- C. F1: grabbable handles on a whole-photo box ----------------
  for (const [w, h] of [[384, 832], [412, 915]]) {
    await page.setViewportSize({ width: w, height: h });
    const C1 = await page.evaluate(async () => {
      const C = __cb;
      const s = await C.open(await C.toBlob(C.halves(4000, 3000), "image/jpeg", 0.9), "slab_obverse");
      const stage = C.rect(document.getElementById("bgCropStage"));
      const img = C.rect(document.getElementById("bgCropImg"));
      const box = C.rect(document.getElementById("bgCropBox"));
      const handles = C.visibleHandles().map(e => {
        const r = C.rect(e), cx = (r.l + r.r) / 2, cy = (r.t + r.b) / 2;
        // 15 px further INTO the box (diagonally for a corner): still the handle (the touch area).
        const dx = /w/.test(e.dataset.h) ? 15 : /e/.test(e.dataset.h) ? -15 : 0;
        const dy = /n/.test(e.dataset.h) ? 15 : /s/.test(e.dataset.h) ? -15 : 0;
        return { h: e.dataset.h, inStage: r.l >= stage.l && r.r <= stage.r && r.t >= stage.t && r.b <= stage.b,
          onScreen: r.l >= 0 && r.r <= innerWidth, hit: document.elementFromPoint(cx, cy) === e,
          touch: document.elementFromPoint(cx + dx, cy + dy) === e };
      });
      const r = { whole: s.box.left === 0 && s.box.top === 0 && s.box.right === s.dispW && s.box.bottom === s.dispH,
        margin: [img.l - stage.l, stage.r - img.r, img.t - stage.t, stage.b - img.b], boxOnPhoto: Math.abs(box.l - img.l) < 0.5 && Math.abs(box.r - img.r) < 0.5,
        handles };
      cancelBgCrop();
      return r;
    });
    ok("C1 at " + w + " px: a Holder's box starts at the whole photo, measured on the photo (box edges = picture edges): " + JSON.stringify(C1.margin.map(v => Math.round(v))),
      C1.whole && C1.boxOnPhoto && C1.margin.every(v => v >= 16 && v <= 18), C1);
    ok("C2 at " + w + " px: all 8 handles sit inside the stage (on the dark margin), on screen, and a touch on each lands on it",
      C1.handles.length === 8 && C1.handles.every(x => x.inStage && x.onScreen && x.hit), C1.handles);
    ok("C3 at " + w + " px: each handle answers a touch up to ~22 px from its centre (15 px into the box still grabs it, not 'move')",
      C1.handles.every(x => x.touch), C1.handles);
  }

  // A real drag: the corner in, then back out to the whole photo; untouched bytes kept.
  const holderSrc = await page.evaluate(async () => {
    const C = __cb;
    window.__cbHolder = await C.toBlob(C.halves(4000, 3000), "image/jpeg", 0.9);
    await C.open(window.__cbHolder, "slab_obverse");
    const se = document.querySelector("#bgCropBox .bg-crop-handle.se");
    const r = C.rect(se);
    return { x: (r.l + r.r) / 2, y: (r.t + r.b) / 2, dispW: bgCropState.dispW, dispH: bgCropState.dispH };
  });
  await page.mouse.move(holderSrc.x, holderSrc.y);
  await page.mouse.down();
  await page.mouse.move(holderSrc.x - 60, holderSrc.y - 40, { steps: 5 });
  await page.mouse.up();
  const C4 = await page.evaluate(() => ({ right: bgCropState.box.right, bottom: bgCropState.box.bottom }));
  ok("C4 a real drag of the bottom-right handle pulls the box in (no Lock to square needed): " + JSON.stringify(C4),
    Math.abs(C4.right - (holderSrc.dispW - 60)) < 1.5 && Math.abs(C4.bottom - (holderSrc.dispH - 40)) < 1.5, C4);
  const seNow = await page.evaluate(() => { const r = document.querySelector("#bgCropBox .bg-crop-handle.se").getBoundingClientRect(); return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 }; });
  await page.mouse.move(seNow.x, seNow.y);
  await page.mouse.down();
  await page.mouse.move(seNow.x + 200, seNow.y + 200, { steps: 5 });
  await page.mouse.up();
  const C5 = await page.evaluate(async () => {
    const C = __cb;
    const whole = bgCropState.box.right === bgCropState.dispW && bgCropState.box.bottom === bgCropState.dispH;
    const entry = await C.finish();
    return { whole, kind: __getLastBgCropResultForTest().kind, same: await C.sameBytes(entry.blob, window.__cbHolder) };
  });
  ok("C5 ... dragged back out, it stops at the photo's edge (the whole photo again) and Use keeps the original's own bytes: " + JSON.stringify(C5),
    C5.whole && C5.kind === "original-bytes" && C5.same, C5);

  // ---------- D. Stage 1 arrows --------------------------------------------
  const D = await page.evaluate(async () => {
    const C = __cb;
    const btn = (d) => document.querySelector('#bgCropPad button[data-nudge="' + d + '"]');
    const states = () => ["left", "up", "down", "right"].map(d => btn(d).disabled);
    const s = await C.open(await C.toBlob(C.halves(4000, 3000), "image/jpeg", 0.95), "slab_reverse");
    const wholeGrey = states();
    // The left half of the photo: left and up and down cannot move, right can.
    s.box = { left: 0, top: 0, right: s.dispW / 2, bottom: s.dispH }; renderBgCrop();
    const halfGrey = states();
    btn("right").click();
    const one = s.box.left;
    for (let i = 0; i < 9; i++) btn("right").click();
    const ten = { left: s.box.left, width: s.box.right - s.box.left, leftGrey: btn("left").disabled };
    // Clamp: one px from the right edge, one tap lands exactly on it.
    const w = s.box.right - s.box.left;
    s.box.left = s.dispW - w - 1; s.box.right = s.dispW - 1; renderBgCrop();
    btn("right").click();
    const clamp = { right: s.box.right, dispW: s.dispW, rightGrey: btn("right").disabled, width: s.box.right - s.box.left };
    // Back to the left half nudged 10 taps right (20 px), then Use: the red /
    // green edge moves left in the crop by 20 px x (original / screen).
    s.box = { left: 0, top: 0, right: s.dispW / 2, bottom: s.dispH }; renderBgCrop();
    for (let i = 0; i < 10; i++) btn("right").click();
    const dispW = s.dispW;
    const entry = await C.finish();
    const d = await C.dims(entry.blob);
    const off = 20 * 4000 / dispW, edge = (2000 - off) / 2000;
    return { wholeGrey, halfGrey, one, ten, clamp, d, edge,
      before: await C.colourAt(entry.blob, edge - 0.03, 0.5), after: await C.colourAt(entry.blob, edge + 0.03, 0.5) };
  });
  ok("D1 an untouched whole-photo box greys all four arrows (Q5): " + JSON.stringify(D.wholeGrey), D.wholeGrey.every(v => v === true), D);
  ok("D2 a box at the photo's left edge greys left, up and down, not right: " + JSON.stringify(D.halfGrey),
    JSON.stringify(D.halfGrey) === JSON.stringify([true, true, true, false]), D);
  ok("D3 one tap moves the box 2 screen px; ten taps 20 px, same size, and left is no longer greyed: " + JSON.stringify([D.one, D.ten]),
    D.one === 2 && D.ten.left === 20 && Math.abs(D.ten.width - D.clamp.width) < 0.01 && D.ten.leftGrey === false, D);
  ok("D4 a tap never goes past the photo's edge (1 px left: it stops on the edge) and then greys: " + JSON.stringify(D.clamp),
    D.clamp.right === D.clamp.dispW && D.clamp.rightGrey === true, D);
  ok("D5 the nudge reaches the full-resolution crop (still 2000 x 3000; the red / green edge moved by 20 screen px): " + JSON.stringify(D),
    Math.abs(D.d.w - 2000) <= 3 && Math.abs(D.d.h - 3000) <= 3 && D.before[0] > 200 && D.before[1] < 60 && D.after[1] > 200 && D.after[0] < 60, D);

  // ---------- E. Stage 2 arrows --------------------------------------------
  const E = await page.evaluate(async () => {
    const C = __cb;
    const btn = (d) => document.querySelector('#photoAdjustPad button[data-nudge="' + d + '"]');
    const out = {};
    // A square photo: red left half, green right half, the edge in the middle.
    await C.open(await C.toBlob(C.halves(2000, 2000), "image/jpeg", 0.95), "obverse");
    const s = bgCropState; s.box = { left: 0, top: 0, right: s.dispW, bottom: s.dispH }; renderBgCrop();
    const entry = await C.finish(async (st) => {
      btn("right").click();
      out.one = { x: st.offsetX, y: st.offsetY, transform: document.getElementById("photoAdjustImg").style.transform };
      btn("down").click(); btn("up").click();
      out.upDown = st.offsetY;
      for (let i = 0; i < 40; i++) btn("right").click();
      const scale = st.baseScale * st.zoom, maxX = Math.max(0, (st.effWidth * scale - st.circleSize) / 2);
      out.clamp = { x: st.offsetX, maxX, notGreyed: !btn("right").disabled };
      out.shift = st.offsetX / st.circleSize;
    });
    // The picture moved right: more of the red half shows, the edge moves right.
    out.at = await C.colourAt(entry.blob, 0.5 + out.shift / 2, 0.5);
    out.mid = await C.colourAt(entry.blob, 0.47, 0.5);
    return out;
  });
  ok("E1 on the circle one tap moves the picture 2 px right, like a drag (Q4): " + JSON.stringify(E.one),
    E.one.x === 2 && E.one.y === 0 && /translate\(2px, 0px\)/.test(E.one.transform), E);
  ok("E2 down then up comes back to where it was", E.upDown === 0, E);
  ok("E3 taps stop at the picture's own pan limit (as a drag does): " + JSON.stringify(E.clamp),
    E.clamp.maxX > 4 && Math.abs(E.clamp.x - E.clamp.maxX) < 0.001, E);
  ok("E4 the nudge reaches the stored Obverse (the red / green edge moved right of centre): " + JSON.stringify([E.mid, E.at]),
    E.at[0] > 200 && E.at[1] < 60 && E.mid[0] > 200, E);

  // ---------- F. angle ------------------------------------------------------
  const F = await page.evaluate(async () => {
    const C = __cb;
    const btn = (pad, a) => document.querySelector("#" + pad + ' button[data-angle="' + a + '"]');
    const slide = (el, v) => { el.value = String(v); el.dispatchEvent(new Event("input", { bubbles: true })); };
    const out = {};
    out.steps = [document.getElementById("bgCropStraighten").step, document.getElementById("photoAdjustRotate").step];
    out.round = { residue: roundCropAngle(0.1 + 0.2 - 0.3), negZero: Object.is(roundCropAngle(-0.04), 0), clampHi: steppedCropAngle(45, 0.5), clampLo: roundCropAngle(-50) };
    out.noResetButton = document.querySelectorAll('[data-angle="reset"], #bgCropAngleReset, #photoAdjustAngleReset').length;
    // Stage 1.
    const s = await C.open(await C.toBlob(C.halves(1600, 1200), "image/jpeg", 0.9), "other");
    for (let i = 0; i < 3; i++) btn("bgCropPad", "0.5").click();
    out.s1Plus = { v: s.rotateFine, slider: document.getElementById("bgCropStraighten").value, text: document.getElementById("bgCropAngleReadout").textContent };
    for (let i = 0; i < 4; i++) btn("bgCropPad", "-0.5").click();
    out.s1Minus = { v: s.rotateFine, slider: document.getElementById("bgCropStraighten").value, text: document.getElementById("bgCropAngleReadout").textContent };
    const sl = document.getElementById("bgCropStraighten");
    // The snap: within ±0.3° of 0 the slider gives exactly 0; 0.4 is a turn.
    out.snap = [];
    for (const v of ["0.3", "-0.3", "0.2", "-0.1", "0.4", "-0.4", "1.3"]) {
      slide(sl, v);
      out.snap.push({ v, got: s.rotateFine, isZero: Object.is(s.rotateFine, 0), slider: sl.value, text: document.getElementById("bgCropAngleReadout").textContent });
    }
    await C.settle();
    // A 0.4° turn is a real turn: it reaches the bake (the photo is no longer untouched).
    slide(sl, "0.4");
    await C.settle();
    await C.finish();
    out.fine = __getLastBgCropResultForTest().kind;
    // Stage 2.
    await C.open(await C.toBlob(C.halves(1600, 1600), "image/jpeg", 0.9), "obverse");
    await C.useStage1();
    await C.waitFor(() => photoAdjustState, 15000);
    btn("photoAdjustPad", "0.5").click(); btn("photoAdjustPad", "0.5").click();
    const r2 = document.getElementById("photoAdjustRotate");
    out.s2Plus = { v: photoAdjustState.rotateFine, slider: r2.value, text: document.getElementById("photoAdjustAngleReadout").textContent,
      transform: document.getElementById("photoAdjustImg").style.transform };
    slide(r2, "-7.3");
    out.s2Slider = { v: photoAdjustState.rotateFine, text: document.getElementById("photoAdjustAngleReadout").textContent };
    slide(r2, "0.2");
    out.s2Snap = { v: photoAdjustState.rotateFine, isZero: Object.is(photoAdjustState.rotateFine, 0), slider: r2.value,
      text: document.getElementById("photoAdjustAngleReadout").textContent, transform: document.getElementById("photoAdjustImg").style.transform };
    cancelPhotoAdjust();
    return out;
  });
  ok("F1 both sliders move in 0.1° steps: " + JSON.stringify(F.steps), F.steps[0] === "0.1" && F.steps[1] === "0.1", F);
  ok("F2 angles are rounded to 0.1°, a float residue is exactly 0 (never -0), and ±45 holds: " + JSON.stringify(F.round),
    F.round.residue === 0 && Object.is(F.round.residue, 0) && F.round.negZero && F.round.clampHi === 45 && F.round.clampLo === -45, F);
  ok("F3 the 0° button is gone from both stages (Ray, 14 Nov 2026)", F.noResetButton === 0, F);
  ok("F4 Stage 1: ↻ three times = +1.5°, the slider follows and the readout says so: " + JSON.stringify(F.s1Plus),
    F.s1Plus.v === 1.5 && F.s1Plus.slider === "1.5" && F.s1Plus.text === "Straighten +1.5°", F);
  ok("F5 Stage 1: then ↺ four times = −0.5°, slider in step: " + JSON.stringify(F.s1Minus),
    F.s1Minus.v === -0.5 && F.s1Minus.slider === "-0.5" && F.s1Minus.text === "Straighten −0.5°", F);
  const snapOk = (v, want) => { const r = F.snap.find(x => x.v === v); return r && r.got === want && (want !== 0 || r.isZero); };
  ok("F6 the slider snaps to exactly 0 within ±0.3° (0.3, −0.3, 0.2, −0.1 -> 0; slider and readout at 0): " + JSON.stringify(F.snap.slice(0, 4)),
    ["0.3", "-0.3", "0.2", "-0.1"].every(v => snapOk(v, 0)) && F.snap.slice(0, 4).every(r => r.slider === "0" && r.text === "Straighten 0°"), F.snap);
  ok("F7 ... and not beyond it (0.4 -> +0.4°, −0.4 -> −0.4°, 1.3 -> +1.3°): " + JSON.stringify(F.snap.slice(4)),
    snapOk("0.4", 0.4) && snapOk("-0.4", -0.4) && snapOk("1.3", 1.3) && F.snap[4].text === "Straighten +0.4°", F.snap);
  ok("F8 a 0.4° straighten is a real turn: it reaches the full-resolution bake (" + F.fine + ")", F.fine === "trimmed-fullres", F);
  ok("F9 Stage 2: ↻ twice = +1.0°, slider and picture follow: " + JSON.stringify(F.s2Plus),
    F.s2Plus.v === 1 && F.s2Plus.slider === "1" && F.s2Plus.text === "Straighten +1.0°" && /rotate\(1deg\)/.test(F.s2Plus.transform), F);
  ok("F10 Stage 2: the slider at −7.3 reads −7.3°: " + JSON.stringify(F.s2Slider), F.s2Slider.v === -7.3 && F.s2Slider.text === "Straighten −7.3°", F);
  ok("F11 Stage 2: the slider brought to 0.2 snaps to exactly 0 (slider, readout, picture): " + JSON.stringify(F.s2Snap),
    F.s2Snap.isZero && F.s2Snap.slider === "0" && F.s2Snap.text === "Straighten 0°" && /rotate\(0deg\)/.test(F.s2Snap.transform), F);

  // Ray's check (14 Nov 2026): on an untouched Holder move the angle slider,
  // bring it NEAR 0, Save. The snap leaves no turn, so the uploaded file must
  // be the original's own bytes.
  const F12 = await page.evaluate(async ({ PHOTOS_HEADER }) => {
    const C = __cb;
    const coin = { id: "AY-00099", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" };
    const mock = createMockGraphClient({ sheets: { Photos: [PHOTOS_HEADER, ["", "", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", "", ""]] } });
    const uploads = [];
    __setGraphClientForTest(new Proxy(mock, { get(t, k) {
      const v = t[k];
      if (typeof v !== "function") return v;
      return async (...a) => { if (k === "uploadFile") uploads.push({ path: String(a[0]), blob: a[1] }); return v.apply(t, a); };
    } }));
    __resetSheetHeaderMapsForTest();
    __setBrowseEditWriteEnabledForTest(true);
    __setLiveCoinsForTest([coin]);
    __setStoredPhotosForTest({ "AY-00099": [] });
    const src = await C.toBlob(C.halves(4000, 3000), "image/jpeg", 0.9);
    const s = await C.open(src, "slab_obverse", "AY-00099");
    const sl = document.getElementById("bgCropStraighten");
    const slide = (v) => { sl.value = String(v); sl.dispatchEvent(new Event("input", { bubbles: true })); };
    // A drag across the slider: out to 2.7°, back down, and let go at 0.2°.
    for (const v of ["0.6", "1.4", "2.7", "1.9", "0.8", "0.2"]) { slide(v); await C.settle(); }
    await C.sleep(30);
    const near = { v: s.rotateFine, isZero: Object.is(s.rotateFine, 0), text: document.getElementById("bgCropAngleReadout").textContent,
      slider: sl.value, whole: s.box.left <= 0.5 && s.box.top <= 0.5 && s.box.right >= s.dispW - 0.5 && s.box.bottom >= s.dispH - 0.5 };
    const entry = await C.finish();
    const kind = __getLastBgCropResultForTest().kind;
    entry.pendingSave = true;
    galleryFor("AY-00099").push(entry);
    const res = await savePendingPhotos("AY-00099");
    const up = uploads[0];
    const same = up ? await C.sameBytes(up.blob, src) : false;
    __setGraphClientForTest(null);
    return { near, kind, res, uploads: uploads.map(u => u.path), same, srcSize: src.size, upSize: up ? up.blob.size : 0 };
  }, { PHOTOS_HEADER });
  ok("F12 an untouched Holder's angle slider taken out to 2.7° and let go at 0.2° snaps to exactly 0, its box still the whole photo: " + JSON.stringify(F12.near),
    F12.near.isZero && F12.near.text === "Straighten 0°" && F12.near.slider === "0" && F12.near.whole, F12);
  ok("F13 ... and Save uploads the original's own bytes, byte for byte (" + F12.upSize + " of " + F12.srcSize + "; " + F12.kind + "): " + JSON.stringify(F12.uploads),
    F12.kind === "original-bytes" && F12.res.added === 1 && F12.uploads.length === 1 && /AY-00099_slab_obverse\.jpg$/.test(F12.uploads[0]) && F12.same, F12);

  // ---------- G. centre mark ------------------------------------------------
  const G = await page.evaluate(async () => {
    const C = __cb;
    const out = {};
    const centre = (r) => [(r.l + r.r) / 2, (r.t + r.b) / 2];
    const s = await C.open(await C.toBlob(C.plain(1600, 1200, "#ff0000"), "image/jpeg", 0.95), "other");
    const mark1 = document.getElementById("bgCropCentreMark");
    out.s1Off = getComputedStyle(mark1).display;
    document.getElementById("bgCropAspectLock").click();
    out.s1On = getComputedStyle(mark1).display;
    const mc = centre(C.rect(mark1)), bc = centre(C.rect(document.getElementById("bgCropBox")));
    out.s1Centred = Math.abs(mc[0] - bc[0]) < 1.5 && Math.abs(mc[1] - bc[1]) < 1.5;
    out.s1Hit = document.elementFromPoint(mc[0], mc[1]) !== mark1;
    cancelBgCrop();
    // Stage 2 on a plain red photo: the white cross is on screen, not in the saved picture.
    await C.open(await C.toBlob(C.plain(1600, 1600, "#ff0000"), "image/jpeg", 0.95), "obverse");
    const entry = await C.finish(async () => {
      const mark2 = document.getElementById("photoAdjustCentreMark");
      out.s2Shown = getComputedStyle(mark2).display !== "none" && mark2.offsetWidth > 0;
      const m = centre(C.rect(mark2)), c = centre(C.rect(document.getElementById("photoAdjustCircle")));
      out.s2Centred = Math.abs(m[0] - c[0]) < 1.5 && Math.abs(m[1] - c[1]) < 1.5;
      out.s2Hit = document.elementFromPoint(m[0], m[1]) === document.getElementById("photoAdjustCircle");
    });
    out.baked = await C.colourAt(entry.blob, 0.5, 0.5);
    return out;
  });
  ok("G1 the circle always shows a centre mark, at its centre: " + JSON.stringify([G.s2Shown, G.s2Centred]), G.s2Shown && G.s2Centred, G);
  ok("G2 Stage 1: no centre mark on a free box; Lock to square shows it at the box centre (Q7): " + JSON.stringify([G.s1Off, G.s1On, G.s1Centred]),
    G.s1Off === "none" && G.s1On !== "none" && G.s1Centred, G);
  ok("G3 the marks never catch a touch (a drag on the centre still drags)", G.s1Hit && G.s2Hit, G);
  ok("G4 the mark is never in the saved picture (a plain red photo saves red at its centre): " + JSON.stringify(G.baked),
    G.baked[0] > 200 && G.baked[1] < 60 && G.baked[2] < 60, G);

  // ---------- K. the control pad, the 0° tick, Use on screen ---------------
  // Ray's layout (14 Nov 2026), both stages:   −   ↑   +
  //                                              ←   →
  //                                            ↺   ↓   ↻
  const padAt = async (width, height) => {
    await page.setViewportSize({ width, height });
    return page.evaluate(async () => {
      const C = __cb;
      const cells = (padId) => {
        const pad = document.getElementById(padId);
        const at = (sel) => { const b = pad.querySelector(sel); if (!b) return null; const r = C.rect(b); return { x: (r.l + r.r) / 2, y: (r.t + r.b) / 2, w: r.w, h: r.h }; };
        const c = { out: at('[data-zoom="out"]'), up: at('[data-nudge="up"]'), inn: at('[data-zoom="in"]'), left: at('[data-nudge="left"]'),
          right: at('[data-nudge="right"]'), ccw: at('[data-angle="-0.5"]'), down: at('[data-nudge="down"]'), cw: at('[data-angle="0.5"]') };
        const col = c.up.x - c.left.x; // half a column step: ← sits between columns 1 and 3
        const isBtn = (x, y) => { const e = document.elementFromPoint(x, y); return !!(e && e.closest && e.closest("#" + padId + " button")); };
        const ccwX = c.ccw.x, cwX = c.cw.x;
        c.empty = { beforeLeft: isBtn(ccwX, c.left.y), between: isBtn(c.up.x, c.left.y), afterRight: isBtn(cwX, c.left.y),
          topLeft: isBtn(ccwX, c.up.y), topRight: isBtn(cwX, c.up.y) };
        c.col = col;
        return c;
      };
      const tick = (sliderId) => {
        const sl = C.rect(document.getElementById(sliderId)), t = document.getElementById(sliderId).parentElement.querySelector(".crop-slider-tick");
        if (!t) return null;
        const r = C.rect(t);
        return { off: (r.l + r.r) / 2 - (sl.l + sl.r) / 2, visible: r.w > 0 && r.h > sl.h * 0.5, pe: getComputedStyle(t).pointerEvents };
      };
      const useBox = (ovId, btnId) => {
        const ov = document.getElementById(ovId); ov.scrollTop = 0;
        const u = C.rect(document.getElementById(btnId));
        return { top: u.t, bottom: u.b, vh: innerHeight, scrolled: ov.scrollTop };
      };
      const out = { vw: innerWidth, vh: innerHeight };
      await C.open(await C.toBlob(C.halves(3000, 4000), "image/jpeg", 0.8), "obverse"); // tall: the worst case for height
      await C.settle();
      out.s1 = cells("bgCropPad"); out.s1Tick = tick("bgCropStraighten"); out.s1UseTall = useBox("bgCropOverlay", "bgCropUseBtn");
      out.s1DispH = bgCropState.dispH;
      out.s1Zoom = document.querySelectorAll("#bgCropPad [data-zoom]").length;
      await C.useStage1();
      await C.waitFor(() => photoAdjustState, 15000); await C.settle();
      out.s2 = cells("photoAdjustPad"); out.s2Tick = tick("photoAdjustRotate"); out.s2Use = useBox("photoAdjustOverlay", "photoAdjustUseBtn");
      cancelPhotoAdjust();
      await C.open(await C.toBlob(C.halves(4000, 3000), "image/jpeg", 0.8), "slab_obverse"); await C.settle();
      out.s1UseWide = useBox("bgCropOverlay", "bgCropUseBtn");
      cancelBgCrop();
      return out;
    });
  };
  const near = (a, b) => Math.abs(a - b) < 1.5;
  const layoutOk = (c, zoom) => {
    const rows = near(c.up.y, c.down.y - 2 * (c.down.y - c.left.y)) && near(c.ccw.y, c.down.y) && near(c.cw.y, c.down.y) &&
      c.left.y > c.up.y + 10 && c.left.y < c.down.y - 10 && near(c.left.y, c.right.y);
    const cols = near(c.up.x, c.down.x) && near(c.ccw.x + 2 * c.col, c.up.x) && near(c.cw.x - 2 * c.col, c.up.x) &&
      near(c.left.x + c.col, c.up.x) && near(c.right.x - c.col, c.up.x) && c.ccw.x < c.left.x && c.cw.x > c.right.x;
    const zoomOk = zoom ? (c.out && c.inn && near(c.out.x, c.ccw.x) && near(c.inn.x, c.cw.x) && near(c.out.y, c.up.y) && near(c.inn.y, c.up.y)) : (!c.out && !c.inn);
    const empties = !c.empty.beforeLeft && !c.empty.between && !c.empty.afterRight && (zoom || (!c.empty.topLeft && !c.empty.topRight));
    return rows && cols && zoomOk && empties;
  };
  const K412 = await padAt(412, 915);
  ok("K1 circle pad: − ↑ + on the top row, ← → in the middle, ↺ ↓ ↻ at the bottom; − over ↺ on the left, + over ↻ on the right; nothing beside ← or →: " +
    JSON.stringify({ col: K412.s2.col, empty: K412.s2.empty }), layoutOk(K412.s2, true), K412.s2);
  ok("K2 rectangle-crop pad: the same, with the − and + spots empty (no zoom there): " + JSON.stringify({ zoomButtons: K412.s1Zoom, empty: K412.s1.empty }),
    layoutOk(K412.s1, false) && K412.s1Zoom === 0, K412.s1);
  ok("K3 the pad buttons are 44 x 44 px at 412 px wide: " + JSON.stringify([K412.s2.up.w, K412.s2.up.h, K412.s1.ccw.w, K412.s1.ccw.h]),
    [K412.s2.up, K412.s2.cw, K412.s2.out, K412.s1.ccw, K412.s1.down].every(b => near(b.w, 44) && near(b.h, 44)), K412);
  ok("K4 a 0° tick sits under the middle of both angle sliders, display only: " + JSON.stringify([K412.s1Tick, K412.s2Tick]),
    [K412.s1Tick, K412.s2Tick].every(t => t && t.visible && Math.abs(t.off) < 1 && t.pe === "none"), K412);
  const K384 = await padAt(384, 740);
  ok("K5 at 384 x 740 (upright phone) Use Crop is on screen without scrolling, for a tall and a wide photo: " + JSON.stringify([K384.s1UseTall, K384.s1UseWide, K384.s1DispH]),
    [K384.s1UseTall, K384.s1UseWide].every(u => u.scrolled === 0 && u.top >= 0 && u.bottom <= u.vh) && K384.s1DispH >= 200, K384);
  ok("K6 ... and so is Use Photo on the circle: " + JSON.stringify(K384.s2Use), K384.s2Use.scrolled === 0 && K384.s2Use.top >= 0 && K384.s2Use.bottom <= K384.s2Use.vh, K384);
  ok("K7 ... with the same layout and 44 px buttons: " + JSON.stringify([K384.s2.up.w, K384.s2.up.h]),
    layoutOk(K384.s2, true) && layoutOk(K384.s1, false) && near(K384.s2.up.w, 44) && near(K384.s2.up.h, 44), K384);
  const K360 = await padAt(360, 700);
  ok("K8 on a narrow screen (360 x 700) the buttons stay at least 40 px, the layout holds and Use is on screen: " + JSON.stringify([K360.s2.up.w, K360.s2.up.h, K360.s1UseTall]),
    [K360.s2.up, K360.s2.cw, K360.s1.ccw].every(b => b.w >= 40 - 0.5 && b.h >= 40 - 0.5) && layoutOk(K360.s2, true) && layoutOk(K360.s1, false) &&
    K360.s1UseTall.bottom <= K360.s1UseTall.vh && K360.s2Use.bottom <= K360.s2Use.vh, K360);
  await page.setViewportSize(PHONE);

  // ---------- Z. circle zoom − / + -----------------------------------------
  const Z = await page.evaluate(async () => {
    const C = __cb;
    const pad = (z) => document.querySelector('#photoAdjustPad [data-zoom="' + z + '"]');
    const zs = document.getElementById("photoAdjustZoom");
    await C.open(await C.toBlob(C.halves(1600, 1600), "image/jpeg", 0.9), "obverse");
    await C.useStage1();
    await C.waitFor(() => photoAdjustState, 15000);
    const st = photoAdjustState;
    const scaleOf = () => { const m = /scale\(([\d.]+)\)/.exec(document.getElementById("photoAdjustImg").style.transform); return m ? Number(m[1]) : null; };
    const out = { start: { z: st.zoom, slider: zs.value, scale: scaleOf() } };
    pad("in").click();
    out.in1 = { z: st.zoom, slider: zs.value, scale: scaleOf() };
    pad("out").click(); pad("out").click();
    out.out2 = { z: st.zoom, slider: zs.value };
    for (let i = 0; i < 30; i++) pad("out").click();
    out.floor = { z: st.zoom, slider: zs.value };
    for (let i = 0; i < 200; i++) pad("in").click();
    out.ceil = { z: st.zoom, slider: zs.value };
    // After zooming in, panning room grows; a − tap that shrinks it keeps the picture inside the circle.
    for (let i = 0; i < 40; i++) document.querySelector('#photoAdjustPad [data-nudge="right"]').click();
    for (let i = 0; i < 120; i++) pad("out").click();
    const scale = st.baseScale * st.zoom, maxX = Math.max(0, (st.effWidth * scale - st.circleSize) / 2);
    out.clamped = { x: st.offsetX, maxX };
    cancelPhotoAdjust();
    return out;
  });
  ok("Z1 the circle starts at 110% (unchanged), the zoom slider at 110: " + JSON.stringify(Z.start), near(Z.start.z * 100, 110) && Z.start.slider === "110", Z);
  ok("Z2 + zooms in by about 1% (110% -> 111.1%), the slider and the picture follow: " + JSON.stringify(Z.in1),
    Math.abs(Z.in1.z - 1.111) < 0.0005 && Z.in1.slider === "111" && Z.in1.scale > Z.start.scale, Z);
  ok("Z3 − twice from there: about 1% a tap the other way (109%): " + JSON.stringify(Z.out2), Math.abs(Z.out2.z - 1.111 / 1.0201) < 0.0005 && Z.out2.slider === "109", Z);
  ok("Z4 − stops at 100% (the smallest zoom that still covers the circle) and + at 300%: " + JSON.stringify([Z.floor, Z.ceil]),
    Z.floor.z === 1 && Z.floor.slider === "100" && Z.ceil.z === 3 && Z.ceil.slider === "300", Z);
  ok("Z5 zooming out keeps the picture inside its pan limit: " + JSON.stringify(Z.clamped), Math.abs(Z.clamped.x) <= Z.clamped.maxX + 1e-9, Z);

  // ---------- H. no writes --------------------------------------------------
  const H = await page.evaluate(() => __cb.writes.slice());
  ok("H1 cropping, nudging, turning and resizing send no write of any kind (F10's Save goes to a mock client): " + JSON.stringify(H), H.length === 0, H);
}, module);
