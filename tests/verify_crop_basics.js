// (bs) Build 3: crop-screen basics (claude/crop-basics-bs, 11 Nov 2026).
//
// WHY. Ray's (ak) TEST found two crop-screen faults: F1 a Holder's crop box
// starts at the whole photo, so its handles sat on the panel edge and were
// hard to grab; F2 a wide photo ran off the right of the screen (the stage
// was a fixed 360 px, wider than the panel on a phone). Plus the crop
// basics he asked for in the image round: no long-press menu, nudge arrows,
// 0.5° steps with a 0.1° slider, a reset to exactly 0°, a centre mark.
// Ray's answers Q1-Q9, 11 Nov 2026.
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
//   F  angle: -0.5 / +0.5 / 0° buttons and readout on both stages, 0.1°
//      slider, rounding; an untouched Holder whose angle was changed and
//      reset to 0° saves the original's own bytes (Ray's addition to Q6)
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
    const btn = (d) => document.querySelector('#bgCropNudgeRow button[data-nudge="' + d + '"]');
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
    const btn = (d) => document.querySelector('#photoAdjustNudgeRow button[data-nudge="' + d + '"]');
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
    const btn = (row, a) => document.querySelector("#" + row + ' button[data-angle="' + a + '"]');
    const out = {};
    out.steps = [document.getElementById("bgCropStraighten").step, document.getElementById("photoAdjustRotate").step];
    out.round = { residue: roundCropAngle(0.1 + 0.2 - 0.3), negZero: Object.is(roundCropAngle(-0.04), 0), clampHi: steppedCropAngle(45, 0.5), clampLo: roundCropAngle(-50) };
    // Stage 1.
    const s = await C.open(await C.toBlob(C.halves(1600, 1200), "image/jpeg", 0.9), "other");
    for (let i = 0; i < 3; i++) btn("bgCropAngleRow", "0.5").click();
    out.s1Plus = { v: s.rotateFine, slider: document.getElementById("bgCropStraighten").value, text: document.getElementById("bgCropAngleReadout").textContent };
    for (let i = 0; i < 4; i++) btn("bgCropAngleRow", "-0.5").click();
    out.s1Minus = { v: s.rotateFine, text: document.getElementById("bgCropAngleReadout").textContent };
    const sl = document.getElementById("bgCropStraighten");
    sl.value = "0.3"; sl.dispatchEvent(new Event("input", { bubbles: true }));
    out.s1Slider = { v: s.rotateFine, text: document.getElementById("bgCropAngleReadout").textContent };
    await C.settle();
    // A 0.1° turn is a real turn: it reaches the bake (the photo is no longer untouched).
    sl.value = "0.1"; sl.dispatchEvent(new Event("input", { bubbles: true }));
    await C.settle();
    await C.finish();
    out.fine = __getLastBgCropResultForTest().kind;
    // Stage 2.
    await C.open(await C.toBlob(C.halves(1600, 1600), "image/jpeg", 0.9), "obverse");
    await C.useStage1();
    await C.waitFor(() => photoAdjustState, 15000);
    btn("photoAdjustAngleRow", "0.5").click(); btn("photoAdjustAngleRow", "0.5").click();
    out.s2Plus = { v: photoAdjustState.rotateFine, text: document.getElementById("photoAdjustAngleReadout").textContent,
      transform: document.getElementById("photoAdjustImg").style.transform };
    const r2 = document.getElementById("photoAdjustRotate");
    r2.value = "-7.3"; r2.dispatchEvent(new Event("input", { bubbles: true }));
    out.s2Slider = { v: photoAdjustState.rotateFine, text: document.getElementById("photoAdjustAngleReadout").textContent };
    btn("photoAdjustAngleRow", "reset").click();
    out.s2Reset = { v: photoAdjustState.rotateFine, isZero: Object.is(photoAdjustState.rotateFine, 0), slider: r2.value,
      text: document.getElementById("photoAdjustAngleReadout").textContent, transform: document.getElementById("photoAdjustImg").style.transform };
    cancelPhotoAdjust();
    return out;
  });
  ok("F1 both sliders move in 0.1° steps: " + JSON.stringify(F.steps), F.steps[0] === "0.1" && F.steps[1] === "0.1", F);
  ok("F2 angles are rounded to 0.1°, a float residue is exactly 0 (never -0), and ±45 holds: " + JSON.stringify(F.round),
    F.round.residue === 0 && Object.is(F.round.residue, 0) && F.round.negZero && F.round.clampHi === 45 && F.round.clampLo === -45, F);
  ok("F3 Stage 1: +0.5 three times = +1.5°, slider and readout in step: " + JSON.stringify(F.s1Plus),
    F.s1Plus.v === 1.5 && F.s1Plus.slider === "1.5" && F.s1Plus.text === "Straighten +1.5°", F);
  ok("F4 Stage 1: then -0.5 four times = −0.5°: " + JSON.stringify(F.s1Minus), F.s1Minus.v === -0.5 && F.s1Minus.text === "Straighten −0.5°", F);
  ok("F5 Stage 1: the slider at 0.3 reads +0.3°: " + JSON.stringify(F.s1Slider), F.s1Slider.v === 0.3 && F.s1Slider.text === "Straighten +0.3°", F);
  ok("F6 a 0.1° straighten is a real turn: it reaches the full-resolution bake (" + F.fine + ")", F.fine === "trimmed-fullres", F);
  ok("F7 Stage 2: +0.5 twice = +1.0°, on screen: " + JSON.stringify(F.s2Plus),
    F.s2Plus.v === 1 && F.s2Plus.text === "Straighten +1.0°" && /rotate\(1deg\)/.test(F.s2Plus.transform), F);
  ok("F8 Stage 2: the slider at −7.3 reads −7.3°: " + JSON.stringify(F.s2Slider), F.s2Slider.v === -7.3 && F.s2Slider.text === "Straighten −7.3°", F);
  ok("F9 Stage 2: 0° resets to exactly 0 (slider, readout, picture): " + JSON.stringify(F.s2Reset),
    F.s2Reset.isZero && F.s2Reset.slider === "0" && F.s2Reset.text === "Straighten 0°" && /rotate\(0deg\)/.test(F.s2Reset.transform), F);

  // Ray's addition to Q6: change the angle on an untouched Holder, reset to
  // 0°, Save. The uploaded file must be the original's own bytes.
  const F10 = await page.evaluate(async ({ PHOTOS_HEADER }) => {
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
    const btn = (a) => document.querySelector('#bgCropAngleRow button[data-angle="' + a + '"]');
    btn("0.5").click(); btn("0.5").click(); btn("0.5").click(); await C.settle();
    const sl = document.getElementById("bgCropStraighten");
    sl.value = "2.7"; sl.dispatchEvent(new Event("input", { bubbles: true })); await C.settle();
    const turned = { v: s.rotateFine, boxW: s.box.right - s.box.left, dispW: s.dispW };
    btn("reset").click(); await C.settle(); await C.sleep(30);
    const reset = { v: s.rotateFine, isZero: Object.is(s.rotateFine, 0), text: document.getElementById("bgCropAngleReadout").textContent,
      slider: sl.value, whole: s.box.left <= 0.5 && s.box.top <= 0.5 && s.box.right >= s.dispW - 0.5 && s.box.bottom >= s.dispH - 0.5 };
    const entry = await C.finish();
    const kind = __getLastBgCropResultForTest().kind;
    entry.pendingSave = true;
    galleryFor("AY-00099").push(entry);
    const res = await savePendingPhotos("AY-00099");
    const up = uploads[0];
    const same = up ? await C.sameBytes(up.blob, src) : false;
    __setGraphClientForTest(null);
    return { turned, reset, kind, res, uploads: uploads.map(u => u.path), same, srcSize: src.size, upSize: up ? up.blob.size : 0 };
  }, { PHOTOS_HEADER });
  ok("F10 an untouched Holder turned to +1.5° then 2.7° is reset by 0° to exactly 0 (readout, slider), its box still the whole photo: " + JSON.stringify([F10.turned, F10.reset]),
    F10.turned.v === 2.7 && F10.reset.isZero && F10.reset.text === "Straighten 0°" && F10.reset.slider === "0" && F10.reset.whole, F10);
  ok("F11 ... and Save uploads the original's own bytes, byte for byte (" + F10.upSize + " of " + F10.srcSize + "; " + F10.kind + "): " + JSON.stringify(F10.uploads),
    F10.kind === "original-bytes" && F10.res.added === 1 && F10.uploads.length === 1 && /AY-00099_slab_obverse\.jpg$/.test(F10.uploads[0]) && F10.same, F10);

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

  // ---------- H. no writes --------------------------------------------------
  const H = await page.evaluate(() => __cb.writes.slice());
  ok("H1 cropping, nudging, turning and resizing send no write of any kind (F10's Save goes to a mock client): " + JSON.stringify(H), H.length === 0, H);
}, module);
