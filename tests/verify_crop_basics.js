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
//   V  view zoom on the rectangle crop (fix round 3): − / + 1.25x, 1x-4x,
//      about the last-touched handle or the view's centre, pinch, one-finger
//      pan outside the box, slide-along, pan limits with the margin (F1 at
//      4x), arrows 1 screen px; the four (ak) proofs (same bytes at any
//      zoom, drag / zoom, untouched bytes, no decode while zooming)
//   W  no button runs off its box at 360 / 384 / 412 px: the "Crop this
//      photo into…" chooser wraps two to a row when needed (44 px tall);
//      the crop screens' rows stay inside their panels
//   Z  circle zoom, Z-C (Ray, 14 Nov 2026): the square plus 25% of photo
//      handed to the circle; it starts with the square filling the circle
//      (a tick), zooms out to the smallest zoom that covers it (never
//      black, also at a turn, a corner square, a direct pick) and in to 6x,
//      on an even (log) slider; − / + about 1%; the saved Obverse is cut
//      from the original (matches the screen; a small coin at 5x stays sharp)
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
    const pendingNow = () => pending;
    window.__cb = { pendingNow, sleep, waitFor, halves, plain, toBlob, sameBytes, colourAt, dims, open, useStage1, finish, rect, visibleHandles, settle, writes };
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
    // Back to the left half nudged 10 taps right (10 x CROP_NUDGE_PX), then Use: the
    // red / green edge moves left in the crop by that x (original / screen).
    s.box = { left: 0, top: 0, right: s.dispW / 2, bottom: s.dispH }; renderBgCrop();
    for (let i = 0; i < 10; i++) btn("right").click();
    const dispW = s.dispW;
    const entry = await C.finish();
    const d = await C.dims(entry.blob);
    const off = 10 * CROP_NUDGE_PX * 4000 / dispW, edge = (2000 - off) / 2000;
    return { step: CROP_NUDGE_PX, wholeGrey, halfGrey, one, ten, clamp, d, edge,
      before: await C.colourAt(entry.blob, edge - 0.03, 0.5), after: await C.colourAt(entry.blob, edge + 0.03, 0.5) };
  });
  ok("D1 an untouched whole-photo box greys all four arrows (Q5): " + JSON.stringify(D.wholeGrey), D.wholeGrey.every(v => v === true), D);
  ok("D2 a box at the photo's left edge greys left, up and down, not right: " + JSON.stringify(D.halfGrey),
    JSON.stringify(D.halfGrey) === JSON.stringify([true, true, true, false]), D);
  ok("D3 one tap moves the box 1 screen px (fix round 3; was 2); ten taps 10 px, same size, and left is no longer greyed: " + JSON.stringify([D.step, D.one, D.ten]),
    D.step === 1 && D.one === 1 && D.ten.left === 10 && Math.abs(D.ten.width - D.clamp.width) < 0.01 && D.ten.leftGrey === false, D);
  ok("D4 a tap never goes past the photo's edge (1 px left: it stops on the edge) and then greys: " + JSON.stringify(D.clamp),
    D.clamp.right === D.clamp.dispW && D.clamp.rightGrey === true, D);
  ok("D5 the nudge reaches the full-resolution crop (still 2000 x 3000; the red / green edge moved by 10 screen px): " + JSON.stringify(D),
    Math.abs(D.d.w - 2000) <= 3 && Math.abs(D.d.h - 3000) <= 3 && D.before[0] > 200 && D.before[1] < 60 && D.after[1] > 200 && D.after[0] < 60, D);

  // ---------- E. Stage 2 arrows --------------------------------------------
  const E = await page.evaluate(async () => {
    const C = __cb;
    const btn = (d) => document.querySelector('#photoAdjustPad button[data-nudge="' + d + '"]');
    const out = {};
    // A square photo: red left half, green right half, the edge in the middle.
    await C.open(await C.toBlob(C.halves(2000, 2000), "image/jpeg", 0.95), "obverse");
    // The middle half as the square: the circle gets 25% of photo round it (Z-C), so room to move at the start.
    const s = bgCropState; s.box = { left: s.dispW / 4, top: s.dispH / 4, right: s.dispW * 3 / 4, bottom: s.dispH * 3 / 4 }; renderBgCrop();
    const entry = await C.finish(async (st) => {
      btn("right").click();
      out.one = { x: st.offsetX, y: st.offsetY, transform: document.getElementById("photoAdjustImg").style.transform };
      btn("down").click(); btn("up").click();
      out.upDown = st.offsetY;
      for (let i = 0; i < 100; i++) btn("right").click();
      const scale = st.baseScale * st.zoom, maxX = Math.max(0, (st.effWidth * scale - st.circleSize) / 2);
      out.clamp = { x: st.offsetX, maxX, notGreyed: !btn("right").disabled };
      out.shift = st.offsetX / st.circleSize;
    });
    // The picture moved right: more of the red half shows, the edge moves right.
    out.at = await C.colourAt(entry.blob, 0.5 + out.shift / 2, 0.5);
    out.mid = await C.colourAt(entry.blob, 0.47, 0.5);
    return out;
  });
  ok("E1 on the circle one tap moves the picture 1 px right (fix round 3; was 2), like a drag (Q4): " + JSON.stringify(E.one),
    E.one.x === 1 && E.one.y === 0 && /translate\(1px, 0px\)/.test(E.one.transform), E);
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
    for (const v of ["0.5", "-0.5", "0.4", "-0.1", "0.6", "-0.6", "1.3"]) {
      slide(sl, v);
      out.snap.push({ v, got: s.rotateFine, isZero: Object.is(s.rotateFine, 0), slider: sl.value, text: document.getElementById("bgCropAngleReadout").textContent });
    }
    await C.settle();
    // A 0.4° turn is a real turn: it reaches the bake (the photo is no longer untouched).
    slide(sl, "0.6");
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
  ok("F6 the slider snaps to exactly 0 within ±0.5° (fix round 3; was ±0.3°): 0.5, −0.5, 0.4, −0.1 -> 0, slider and readout at 0: " + JSON.stringify(F.snap.slice(0, 4)),
    ["0.5", "-0.5", "0.4", "-0.1"].every(v => snapOk(v, 0)) && F.snap.slice(0, 4).every(r => r.slider === "0" && r.text === "Straighten 0°"), F.snap);
  ok("F7 ... and not beyond it (0.6 -> +0.6°, −0.6 -> −0.6°, 1.3 -> +1.3°): " + JSON.stringify(F.snap.slice(4)),
    snapOk("0.6", 0.6) && snapOk("-0.6", -0.6) && snapOk("1.3", 1.3) && F.snap[4].text === "Straighten +0.6°", F.snap);
  ok("F8 a 0.6° straighten is a real turn: it reaches the full-resolution bake (" + F.fine + ")", F.fine === "trimmed-fullres", F);
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
    // Let go at 0.4°: inside the ±0.5° snap, outside the old ±0.3° one.
    for (const v of ["0.6", "1.4", "2.7", "1.9", "0.8", "0.4"]) { slide(v); await C.settle(); }
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
  ok("F12 an untouched Holder's angle slider taken out to 2.7° and let go at 0.4° snaps to exactly 0, its box still the whole photo: " + JSON.stringify(F12.near),
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
  ok("K2 rectangle-crop pad: the same layout, − / + now zooming the view (fix round 3): " + JSON.stringify({ zoomButtons: K412.s1Zoom, empty: K412.s1.empty }),
    layoutOk(K412.s1, true) && K412.s1Zoom === 2, K412.s1);
  ok("K3 the pad buttons are 44 x 44 px at 412 px wide: " + JSON.stringify([K412.s2.up.w, K412.s2.up.h, K412.s1.ccw.w, K412.s1.ccw.h]),
    [K412.s2.up, K412.s2.cw, K412.s2.out, K412.s1.ccw, K412.s1.down].every(b => near(b.w, 44) && near(b.h, 44)), K412);
  ok("K4 a 0° tick sits under the middle of both angle sliders, display only: " + JSON.stringify([K412.s1Tick, K412.s2Tick]),
    [K412.s1Tick, K412.s2Tick].every(t => t && t.visible && Math.abs(t.off) < 1 && t.pe === "none"), K412);
  const K384 = await padAt(384, 740);
  ok("K5 at 384 x 740 (upright phone) Use Crop is on screen without scrolling, for a tall and a wide photo: " + JSON.stringify([K384.s1UseTall, K384.s1UseWide, K384.s1DispH]),
    [K384.s1UseTall, K384.s1UseWide].every(u => u.scrolled === 0 && u.top >= 0 && u.bottom <= u.vh) && K384.s1DispH >= 200, K384);
  ok("K6 ... and so is Use Photo on the circle: " + JSON.stringify(K384.s2Use), K384.s2Use.scrolled === 0 && K384.s2Use.top >= 0 && K384.s2Use.bottom <= K384.s2Use.vh, K384);
  ok("K7 ... with the same layout and 44 px buttons: " + JSON.stringify([K384.s2.up.w, K384.s2.up.h]),
    layoutOk(K384.s2, true) && layoutOk(K384.s1, true) && near(K384.s2.up.w, 44) && near(K384.s2.up.h, 44), K384);
  const K360 = await padAt(360, 700);
  ok("K8 on a narrow screen (360 x 700) the buttons stay at least 40 px, the layout holds and Use is on screen: " + JSON.stringify([K360.s2.up.w, K360.s2.up.h, K360.s1UseTall]),
    [K360.s2.up, K360.s2.cw, K360.s1.ccw].every(b => b.w >= 40 - 0.5 && b.h >= 40 - 0.5) && layoutOk(K360.s2, true) && layoutOk(K360.s1, true) &&
    K360.s1UseTall.bottom <= K360.s1UseTall.vh && K360.s2Use.bottom <= K360.s2Use.vh, K360);
  await page.setViewportSize(PHONE);

  // ---------- Z. circle zoom, Z-C (Ray, 14 Nov 2026) ------------------------
  // The rectangle crop hands the circle its square plus up to 25% of photo
  // on every side. The circle starts with the square exactly filling it (a
  // tick marks that zoom), zooms out to the smallest zoom that still covers
  // the circle (never black) and in to 6x the start, on an even (log)
  // slider; − / + about 1% a tap. The saved Obverse is cut from the
  // full-resolution ORIGINAL with the circle's final position, zoom and turn.
  await page.evaluate(() => {
    // A smooth colour ramp (no edges), so any two cuts of the same framing
    // match colour for colour, and a wrong turn or offset shows at once.
    __cb.ramp = (w, h) => {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const g = c.getContext("2d");
      const gx = g.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, "#ff0000"); gx.addColorStop(1, "#00ff00");
      g.fillStyle = gx; g.fillRect(0, 0, w, h);
      const gy = g.createLinearGradient(0, 0, 0, h); gy.addColorStop(0, "rgba(0,0,255,0)"); gy.addColorStop(1, "rgba(0,0,255,1)");
      g.fillStyle = gy; g.fillRect(0, 0, w, h);
      return c;
    };
    // Opens Stage 1 on `blob`, sets the square with box(s), hands it on and
    // returns Stage 2's state (not yet Used).
    __cb.toCircle = async (blob, box, stage1) => {
      const C = __cb;
      await C.open(blob, "obverse");
      const s = bgCropState;
      if (stage1) { await stage1(s); await C.settle(); }
      if (box) { s.box = box(s); renderBgCrop(); }
      await C.useStage1();
      await C.waitFor(() => photoAdjustState && photoAdjustState.baseScale, 15000);
      await C.settle();
      return photoAdjustState;
    };
    // Taps Use on the circle and returns the stored Obverse (the entry's blob).
    __cb.useCircle = async () => {
      document.getElementById("photoAdjustUseBtn").click();
      return __cb.pendingNow();
    };
    // Every pixel of the saved circle (inside 0.97 of its radius) that is near black.
    __cb.blackInCircle = async (blob) => {
      const b = await createImageBitmap(blob);
      const c = document.createElement("canvas"); c.width = b.width; c.height = b.height;
      const g = c.getContext("2d"); g.drawImage(b, 0, 0); b.close();
      const d = g.getImageData(0, 0, c.width, c.height).data, R = c.width / 2;
      let black = 0, n = 0;
      for (let y = 0; y < c.height; y += 4) for (let x = 0; x < c.width; x += 4) {
        if ((x - R) * (x - R) + (y - R) * (y - R) > (0.97 * R) * (0.97 * R)) continue;
        n++; const i = (y * c.width + x) * 4;
        if (Math.max(d[i], d[i + 1], d[i + 2]) < 40) black++;
      }
      return { black, n };
    };
  });
  const Z = await page.evaluate(async () => {
    const C = __cb;
    const out = {};
    const slider = document.getElementById("photoAdjustZoom");
    const tick = document.getElementById("photoAdjustZoomTick");
    const pad = (z) => document.querySelector('#photoAdjustPad [data-zoom="' + z + '"]');
    // A 4000 x 4000 photo, the square its middle 2000: 500 px of photo on every side (25%).
    let st = await C.toCircle(await C.toBlob(C.ramp(4000, 4000), "image/jpeg", 0.95),
      (s) => ({ left: s.dispW / 4, top: s.dispH / 4, right: s.dispW * 3 / 4, bottom: s.dispH * 3 / 4 }));
    const g = st.geometry;
    out.handOff = { w: st.naturalWidth, h: st.naturalHeight, box: g && g.box };
    const scale = st.baseScale * st.zoom;
    out.fill = { boxOnScreen: g.box.w * scale, circle: st.circleSize, offX: st.offsetX, offY: st.offsetY };
    out.range = { min: st.zoomMin, start: st.zoomStart, max: st.zoomMax, zoom: st.zoom };
    out.sliderStart = Number(slider.value);
    const sl = C.rect(slider), tk = C.rect(tick);
    out.tick = { frac: ((tk.l + tk.r) / 2 - sl.l - 8) / (sl.w - 16), want: Math.log(st.zoomStart / st.zoomMin) / Math.log(st.zoomMax / st.zoomMin),
      pe: getComputedStyle(tick).pointerEvents };
    // Even scale: the middle of the slider is the geometric middle of the range.
    slider.value = "500"; slider.dispatchEvent(new Event("input", { bubbles: true }));
    out.mid = { z: st.zoom, want: Math.sqrt(st.zoomMin * st.zoomMax) };
    slider.value = "1000"; slider.dispatchEvent(new Event("input", { bubbles: true }));
    out.top = { z: st.zoom, ratio: st.zoom / st.zoomStart };
    slider.value = "0"; slider.dispatchEvent(new Event("input", { bubbles: true }));
    out.bottom = { z: st.zoom };
    // − / + about 1% a tap, the slider follows; they stop at the ends.
    slider.value = String(Math.round(out.sliderStart)); slider.dispatchEvent(new Event("input", { bubbles: true }));
    const z0 = st.zoom, p0 = Number(slider.value);
    pad("in").click();
    out.plus = { ratio: st.zoom / z0, slider: Number(slider.value) - p0 };
    pad("out").click(); pad("out").click();
    out.minus = { ratio: st.zoom / z0, slider: Number(slider.value) - p0 };
    for (let i = 0; i < 400; i++) pad("in").click();
    out.plusEnd = { z: st.zoom, max: st.zoomMax, slider: slider.value };
    for (let i = 0; i < 600; i++) pad("out").click();
    out.minusEnd = { z: st.zoom, min: st.zoomMin, slider: slider.value };
    cancelPhotoAdjust();
    return out;
  });
  ok("Z1 the circle is handed the square plus 25% of photo on every side (2000 px square -> a 3000 px area, shown at the 2000 px hand-off cap): " + JSON.stringify(Z.handOff),
    Z.handOff.w === 2000 && Z.handOff.h === 2000 && Z.handOff.box && Math.abs(Z.handOff.box.w - 2000 / 1.5) < 2 && Math.abs(Z.handOff.box.x - 1000 / 3) < 2, Z);
  ok("Z2 it starts with the square exactly filling the circle, centred: " + JSON.stringify(Z.fill),
    Math.abs(Z.fill.boxOnScreen - Z.fill.circle) < 0.5 && Math.abs(Z.fill.offX) < 0.01 && Math.abs(Z.fill.offY) < 0.01, Z);
  ok("Z3 zoom-out room: the start is 1.5x the smallest zoom that covers the circle (Ray: at least 1.25x): " + JSON.stringify(Z.range),
    Math.abs(Z.range.start / Z.range.min - 1.5) < 0.01 && Z.range.min === 1 && Z.range.zoom === Z.range.start, Z);
  ok("Z4 zoom-in reaches 6x the start (Ray: at least 5x; a 13 mm coin in a 66 mm square is 5.1x), at the slider's top: " + JSON.stringify(Z.top),
    Math.abs(Z.top.ratio - 6) < 0.001, Z);
  ok("Z5 a tick marks the start on the slider, display only: " + JSON.stringify(Z.tick),
    Math.abs(Z.tick.frac - Z.tick.want) < 0.01 && Z.tick.pe === "none" && Math.abs(Z.sliderStart / 1000 - Z.tick.want) < 0.002, Z);
  ok("Z6 the slider is even (log): its middle is the geometric middle of the range; its bottom the smallest zoom: " + JSON.stringify([Z.mid, Z.bottom]),
    Math.abs(Z.mid.z - Z.mid.want) < 0.001 && Z.bottom.z === 1, Z);
  ok("Z7 + is about 1% in and − about 1% out, and the slider moves with them: " + JSON.stringify([Z.plus, Z.minus]),
    Math.abs(Z.plus.ratio - 1.01) < 1e-9 && Z.plus.slider > 0 && Math.abs(Z.minus.ratio - 1 / 1.01) < 1e-9 && Z.minus.slider < 0, Z);
  ok("Z8 + stops at the top of the range and − at the smallest zoom: " + JSON.stringify([Z.plusEnd, Z.minusEnd]),
    Z.plusEnd.z === Z.plusEnd.max && Z.plusEnd.slider === "1000" && Z.minusEnd.z === 1 && Z.minusEnd.slider === "0", Z);

  // Never black at the smallest zoom: pushed to every edge, with and without a fine turn;
  // a square at the photo's corner (margin on two sides only); a direct pick with no margin.
  const ZB = await page.evaluate(async () => {
    const C = __cb;
    const out = {};
    const pushAll = async (st, label) => {
      const res = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
        st.offsetX = dx * 9999; st.offsetY = dy * 9999; clampPhotoAdjustOffsets(); applyPhotoAdjustTransform();
        // What the circle SHOWS (the hand-off, exactly as on screen) and what
        // is SAVED (cut from the original, which has more photo round it).
        let black = 0;
        for (const shot of [bakePhotoAdjustFromSource(st), await bakePhotoAdjustFromOriginal(st)]) {
          const blob = await new Promise(r => shot.toBlob(r, "image/jpeg", 0.92));
          black += (await C.blackInCircle(blob)).black;
        }
        res.push(black);
      }
      return res;
    };
    const minZoom = (st) => { const zs = document.getElementById("photoAdjustZoom"); zs.value = "0"; zs.dispatchEvent(new Event("input", { bubbles: true })); };
    const src = await C.toBlob(C.ramp(4000, 4000), "image/jpeg", 0.95);
    // Centred square, smallest zoom.
    let st = await C.toCircle(src, (s) => ({ left: s.dispW / 4, top: s.dispH / 4, right: s.dispW * 3 / 4, bottom: s.dispH * 3 / 4 }));
    minZoom(st); out.centred = await pushAll(st);
    // ... and with a 10° fine turn, at the smallest zoom and at the start
    // (where there is room to pan, so a diagonal push meets the turned edge).
    const r = document.getElementById("photoAdjustRotate"); r.value = "10"; r.dispatchEvent(new Event("input", { bubbles: true }));
    out.turned = await pushAll(st);
    setPhotoAdjustZoom(st.zoomStart);
    out.turnedStart = await pushAll(st);
    cancelPhotoAdjust();
    // The square at the photo's top-left corner: margin only right and below.
    st = await C.toCircle(src, (s) => ({ left: 0, top: 0, right: s.dispW / 2, bottom: s.dispH / 2 }));
    out.corner = { start: st.zoomStart, min: st.zoomMin, box: st.geometry.box, w: st.naturalWidth };
    out.cornerFill = { boxOnScreen: st.geometry.box.w * st.baseScale * st.zoom, circle: st.circleSize };
    minZoom(st); out.cornerBlack = await pushAll(st);
    cancelPhotoAdjust();
    // A direct pick of a tight coin photo with the square on the whole photo: no margin.
    st = await C.toCircle(await C.toBlob(C.ramp(1800, 1800), "image/jpeg", 0.95), (s) => ({ left: 0, top: 0, right: s.dispW, bottom: s.dispH }));
    out.direct = { start: st.zoomStart, min: st.zoomMin, max: st.zoomMax, slider: document.getElementById("photoAdjustZoom").value };
    out.directBlack = await pushAll(st);
    cancelPhotoAdjust();
    // A direct pick as it opens (the square at its usual 80%): the photo round it is the margin.
    st = await C.toCircle(await C.toBlob(C.ramp(3000, 2000), "image/jpeg", 0.95), null);
    out.directDefault = { start: st.zoomStart };
    cancelPhotoAdjust();
    return out;
  });
  ok("Z9 at the smallest zoom, pushed to every edge, the circle shows no black, on screen or saved: " + JSON.stringify(ZB.centred), ZB.centred.every(v => v === 0), ZB);
  ok("Z10 ... nor with a 10° straighten, at the smallest zoom or the start, pushed to every edge (the pan limit follows the turn): " + JSON.stringify([ZB.turned, ZB.turnedStart]),
    ZB.turned.every(v => v === 0) && ZB.turnedStart.every(v => v === 0), ZB);
  ok("Z11 a square at the photo's corner gets margin only where there is photo (1.25x zoom-out room), still starts filling the circle, and shows no black: " + JSON.stringify([ZB.corner, ZB.cornerBlack]),
    Math.abs(ZB.corner.start - 1.25) < 0.01 && Math.abs(ZB.corner.box.x) < 1 && Math.abs(ZB.corner.box.y) < 1 &&
    Math.abs(ZB.cornerFill.boxOnScreen - ZB.cornerFill.circle) < 0.5 && ZB.cornerBlack.every(v => v === 0), ZB);
  ok("Z12 a direct pick whose square is the whole photo: no margin, so it starts at the smallest zoom (tick at the left end), still zooms in 6x, never black: " + JSON.stringify([ZB.direct, ZB.directBlack]),
    ZB.direct.start === 1 && ZB.direct.min === 1 && ZB.direct.max === 6 && ZB.direct.slider === "0" && ZB.directBlack.every(v => v === 0), ZB);
  ok("Z13 a direct pick as it opens (its 80% square) has the photo round it as margin: start " + ZB.directDefault.start.toFixed(3),
    ZB.directDefault.start > 1.2, ZB);

  // The saved Obverse is cut from the ORIGINAL with the circle's final framing:
  // (1) it matches, colour for colour, the same framing cut from the hand-off on
  // screen, through both stages' turns, a pan and a zoom; (2) a small detailed
  // coin zoomed about 5x keeps its detail (the hand-off alone would blur it).
  const ZS = await page.evaluate(async () => {
    const C = __cb;
    const out = {};
    // (1) Same framing, two cuts.
    let st = await C.toCircle(await C.toBlob(C.ramp(4000, 3000), "image/jpeg", 0.95),
      (s) => ({ left: s.dispW * 0.3, top: s.dispH * 0.25, right: s.dispW * 0.3 + s.dispH * 0.5, bottom: s.dispH * 0.75 }),
      async (s) => { document.getElementById("bgCropRotateRightBtn").click(); await C.settle();
        const sl = document.getElementById("bgCropStraighten"); sl.value = "4"; sl.dispatchEvent(new Event("input", { bubbles: true })); await C.settle(); await C.sleep(30); });
    document.getElementById("photoAdjustRotateRightBtn").click();
    const r = document.getElementById("photoAdjustRotate"); r.value = "-3"; r.dispatchEvent(new Event("input", { bubbles: true }));
    setPhotoAdjustZoom(st.zoomStart * 1.7);
    for (let i = 0; i < 6; i++) document.querySelector('#photoAdjustPad [data-nudge="left"]').click();
    for (let i = 0; i < 4; i++) document.querySelector('#photoAdjustPad [data-nudge="down"]').click();
    const fromSource = bakePhotoAdjustFromSource(st);
    const fromOriginal = await bakePhotoAdjustFromOriginal(st);
    const px = (cv, fx, fy) => { const d = cv.getContext("2d").getImageData(Math.floor(cv.width * fx), Math.floor(cv.height * fy), 1, 1).data; return [d[0], d[1], d[2]]; };
    let worst = 0;
    for (const fy of [0.2, 0.35, 0.5, 0.65, 0.8]) for (const fx of [0.2, 0.35, 0.5, 0.65, 0.8]) {
      const a = px(fromSource, fx, fy), b = px(fromOriginal, fx, fy);
      worst = Math.max(worst, ...a.map((v, i) => Math.abs(v - b[i])));
    }
    out.match = { worst, sizes: [fromSource.width, fromOriginal.width], last: __getLastPhotoAdjustResultForTest() };
    cancelPhotoAdjust();
    // (2) A 500 px "coin" of 2 px black / white stripes in the middle of a
    // 4000 x 4000 grey photo; the square 3200 px wide (a tight crop of a big
    // holder). The hand-off is cut at 2000 px (half size: the stripes are
    // lost on screen). Zoomed about 5x and saved.
    const c = document.createElement("canvas"); c.width = 4000; c.height = 4000;
    const g = c.getContext("2d");
    g.fillStyle = "#808080"; g.fillRect(0, 0, 4000, 4000);
    g.save(); g.beginPath(); g.arc(2000, 2000, 250, 0, Math.PI * 2); g.clip();
    g.fillStyle = "#000000"; g.fillRect(1700, 1700, 600, 600);
    g.fillStyle = "#ffffff"; for (let x = 1700; x < 2300; x += 4) g.fillRect(x, 1700, 2, 600);
    g.restore();
    st = await C.toCircle(await C.toBlob(c, "image/jpeg", 0.95), (s) => ({ left: s.dispW * 0.1, top: s.dispH * 0.1, right: s.dispW * 0.9, bottom: s.dispH * 0.9 }));
    out.coinHandOff = { w: st.naturalWidth, start: st.zoomStart };
    setPhotoAdjustZoom(st.zoomStart * 5); syncPhotoAdjustZoomSlider();
    const entry = await C.useCircle();
    const info = __getLastPhotoAdjustResultForTest();
    const b = await createImageBitmap(entry.blob);
    const cv = document.createElement("canvas"); cv.width = b.width; cv.height = b.height;
    const cg = cv.getContext("2d"); cg.drawImage(b, 0, 0); b.close();
    const row = cg.getImageData(0, Math.floor(cv.height / 2), cv.width, 1).data;
    // The coin's middle third, across the row: neighbouring stripes 2 px apart.
    let diff = 0, n = 0, extreme = 0;
    const x0 = Math.floor(cv.width * 0.4), x1 = Math.floor(cv.width * 0.6);
    for (let x = x0; x < x1; x++) { diff += Math.abs(row[x * 4] - row[(x + 2) * 4]); n++; if (row[x * 4] < 50 || row[x * 4] > 205) extreme++; }
    out.sharp = { from: info && info.from, size: cv.width, pxAcross: info && info.pxAcross, contrast: Math.round(diff / n), extreme: Math.round(100 * extreme / n) };
    return out;
  });
  ok("Z14 the saved Obverse is cut from the full-resolution original (" + JSON.stringify(ZS.match.last) + ") and matches the framing on screen colour for colour, through both stages' turns, a pan and a zoom: worst difference " + ZS.match.worst + " of 255",
    ZS.match.last && ZS.match.last.from === "original" && ZS.match.worst <= 16, ZS);
  ok("Z15 a small detailed coin in a wide square, zoomed 5x, is saved from the original at its own size (about 640 px across, not the 480 px floor of a 320 px hand-off cut): " + JSON.stringify(ZS.sharp),
    ZS.sharp.from === "original" && Math.abs(ZS.sharp.pxAcross - 640) < 8 && ZS.sharp.size === ZS.sharp.pxAcross, ZS);
  ok("Z16 ... and keeps its detail: mean step " + ZS.sharp.contrast + " of 255 between neighbouring stripes, " + ZS.sharp.extreme + "% black or white",
    ZS.sharp.contrast >= 180 && ZS.sharp.extreme >= 80, ZS);

  // What is under the circle's centre stays there through a zoom and a 90° turn.
  const ZP = await page.evaluate(async () => {
    const C = __cb;
    const out = {};
    const centreColour = async (st) => { const cv = await bakePhotoAdjustFromOriginal(st); const d = cv.getContext("2d").getImageData(cv.width >> 1, cv.height >> 1, 1, 1).data; return [d[0], d[1], d[2]]; };
    const st = await C.toCircle(await C.toBlob(C.ramp(4000, 4000), "image/jpeg", 0.95),
      (s) => ({ left: s.dispW / 4, top: s.dispH / 4, right: s.dispW * 3 / 4, bottom: s.dispH * 3 / 4 }));
    for (let i = 0; i < 10; i++) document.querySelector('#photoAdjustPad [data-nudge="right"]').click();
    for (let i = 0; i < 6; i++) document.querySelector('#photoAdjustPad [data-nudge="up"]').click();
    const before = await centreColour(st);
    const off0 = [st.offsetX, st.offsetY];
    document.querySelector('#photoAdjustPad [data-zoom="in"]').click();
    out.zoom = { off0, off1: [st.offsetX, st.offsetY] };
    out.step = CROP_NUDGE_PX;
    const afterZoom = await centreColour(st);
    document.getElementById("photoAdjustRotateRightBtn").click();
    const afterTurn = await centreColour(st);
    document.getElementById("photoAdjustRotateLeftBtn").click();
    const back = await centreColour(st);
    const diff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    out.colours = { before, afterZoom, afterTurn, back, dZoom: diff(before, afterZoom), dTurn: diff(before, afterTurn), dBack: diff(before, back) };
    cancelPhotoAdjust();
    return out;
  });
  ok("Z17 a zoom keeps the point at the circle's centre where it is (the offset scales with the zoom: 10 px -> 10.1 px): " + JSON.stringify(ZP.zoom),
    Math.abs(ZP.zoom.off1[0] - ZP.zoom.off0[0] * 1.01) < 1e-6 && Math.abs(ZP.zoom.off1[1] - ZP.zoom.off0[1] * 1.01) < 1e-6 && ZP.zoom.off0[0] === 10 * ZP.step, ZP);
  ok("Z18 ... and so do a 90° turn and its undo (the same colour stays under the centre): " + JSON.stringify(ZP.colours),
    ZP.colours.dZoom <= 6 && ZP.colours.dTurn <= 6 && ZP.colours.dBack <= 6, ZP);

  // ---------- V. view zoom on the rectangle crop (fix round 3) -------------
  // Ray's Q1-Q7 (14 Nov 2026): − / + and pinch zoom the VIEW (1x-4x, 1.25x a
  // tap); the box stays in picture px at 1x, so (ak) is untouched. Proofs:
  // (i) the same box saves the same bytes at any zoom; (ii) a drag at 3x
  // moves the box a third as far, and saves what a 1x crop of that box saves;
  // (iii) an untouched Holder zoomed, pinched and panned still saves its own
  // bytes; (iv) nothing decodes the original while zooming.
  await page.setViewportSize(PHONE);
  await page.evaluate(() => {
    const frame = () => document.getElementById("bgCropFrame");
    const stage = () => document.getElementById("bgCropStage");
    const client = (x, y) => { const r = frame().getBoundingClientRect(); return { cx: r.left + x, cy: r.top + y }; };
    // A synthetic finger: down on whatever is at the point, move / up on the stage.
    const fire = (type, id, x, y) => {
      const { cx, cy } = client(x, y);
      const el = type === "pointerdown" ? document.elementFromPoint(cx, cy) : stage();
      if (!el) throw new Error("no element under the finger at " + x + "," + y + " (view px)");
      el.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: cx, clientY: cy, bubbles: true, cancelable: true, pointerType: "touch", isPrimary: id === 1 }));
    };
    const drag = (id, x0, y0, x1, y1, steps) => {
      fire("pointerdown", id, x0, y0);
      for (let i = 1; i <= (steps || 5); i++) fire("pointermove", id, x0 + (x1 - x0) * i / (steps || 5), y0 + (y1 - y0) * i / (steps || 5));
      fire("pointerup", id, x1, y1);
    };
    const view = () => Object.assign({}, bgCropState.view);
    const toView = (x, y) => { const v = bgCropState.view; return { x: x * v.z + v.panX, y: y * v.z + v.panY }; };
    const fromView = (x, y) => { const v = bgCropState.view; return { x: (x - v.panX) / v.z, y: (y - v.panY) / v.z }; };
    const handleAt = (h) => { const r = document.querySelector("#bgCropBox .bg-crop-handle." + h).getBoundingClientRect(), f = frame().getBoundingClientRect(); return { x: (r.left + r.right) / 2 - f.left, y: (r.top + r.bottom) / 2 - f.top }; };
    const pad = (z) => document.querySelector('#bgCropPad [data-zoom="' + z + '"]');
    const viewSize = () => ({ w: bgCropState.dispW + 32, h: bgCropState.dispH + 32 });
    window.__V = { fire, drag, view, toView, fromView, handleAt, pad, viewSize, frame };
  });

  const V1 = await page.evaluate(async () => {
    const C = __cb, V = __V, out = {};
    const s = await C.open(await C.toBlob(C.halves(4000, 3000), "image/jpeg", 0.9), "slab_obverse");
    const badge = document.getElementById("bgCropZoomBadge");
    out.open = { v: V.view(), badgeHidden: getComputedStyle(badge).display === "none", outGrey: V.pad("out").disabled, inGrey: V.pad("in").disabled };
    // No handle touched yet: + zooms about the view's centre (Ray's addition
    // to Q2), not the box's: an off-centre box tells the two apart.
    const whole = Object.assign({}, s.box);
    s.box = { left: s.dispW * 0.05, top: s.dispH * 0.05, right: s.dispW * 0.4, bottom: s.dispH * 0.35 }; renderBgCrop();
    const vs = V.viewSize(), c0 = V.fromView(vs.w / 2, vs.h / 2);
    V.pad("in").click();
    const c1 = V.fromView(vs.w / 2, vs.h / 2);
    out.centre = { before: c0, after: c1, z: s.view.z, anchor: s.view.anchor };
    s.box = whole; renderBgCrop();
    const zs = [s.view.z];
    for (let i = 0; i < 8; i++) { V.pad("in").click(); zs.push(s.view.z); }
    out.ins = { zs, inGrey: V.pad("in").disabled, badge: badge.textContent };
    V.pad("out").click(); V.pad("out").click(); V.pad("out").click(); V.pad("out").click(); V.pad("out").click();
    out.mid = { z: s.view.z, badge: badge.textContent, badgeShown: getComputedStyle(badge).display !== "none", badgePE: getComputedStyle(badge).pointerEvents };
    for (let i = 0; i < 10; i++) V.pad("out").click();
    out.back = { v: V.view(), outGrey: V.pad("out").disabled, badgeHidden: getComputedStyle(badge).display === "none" };
    // The last-touched handle: touch (no move) the bottom-right handle of a middle box, then + about it.
    s.box = { left: s.dispW * 0.25, top: s.dispH * 0.25, right: s.dispW * 0.75, bottom: s.dispH * 0.75 }; renderBgCrop();
    const h0 = V.handleAt("se");
    V.fire("pointerdown", 1, h0.x, h0.y); V.fire("pointerup", 1, h0.x, h0.y);
    out.anchor = s.view.anchor;
    V.pad("in").click(); V.pad("in").click();
    out.seKept = { before: h0, after: V.handleAt("se"), z: s.view.z, boxSame: s.box.right === s.dispW * 0.75 };
    cancelBgCrop();
    return out;
  });
  ok("V1 the rectangle crop opens at 1x: no badge, − greyed, + ready: " + JSON.stringify(V1.open),
    V1.open.v.z === 1 && V1.open.v.panX === 16 && V1.open.v.panY === 16 && V1.open.badgeHidden && V1.open.outGrey && !V1.open.inGrey, V1);
  ok("V2 with no handle touched yet, + zooms about the view's centre (Ray's addition): the picture point there stays put: " + JSON.stringify(V1.centre),
    V1.centre.z === 1.25 && Math.abs(V1.centre.before.x - V1.centre.after.x) < 0.01 && Math.abs(V1.centre.before.y - V1.centre.after.y) < 0.01, V1);
  ok("V3 + steps 1.25x and stops at 4x, where it greys out; the badge reads 4.0×: " + JSON.stringify(V1.ins),
    Math.abs(V1.ins.zs[1] - 1.5625) < 1e-9 && V1.ins.zs.slice(-3).every(z => z === 4) && V1.ins.zs[6] === 4 && Math.abs(V1.ins.zs[5] - Math.pow(1.25, 6)) < 1e-9 && V1.ins.inGrey && V1.ins.badge === "4.0×", V1);
  ok("V4 − steps back (5 taps from 4x: about 1.3x), the badge shows while zoomed and never catches a touch: " + JSON.stringify(V1.mid),
    Math.abs(V1.mid.z - 4 / Math.pow(1.25, 5)) < 1e-9 && V1.mid.badge === "1.3×" && V1.mid.badgeShown && V1.mid.badgePE === "none", V1);
  ok("V5 − stops at exactly 1x (back to the margin), greys out and hides the badge: " + JSON.stringify(V1.back),
    V1.back.v.z === 1 && V1.back.v.panX === 16 && V1.back.v.panY === 16 && V1.back.outGrey && V1.back.badgeHidden, V1);
  ok("V6 after a handle is touched (no move), + zooms about THAT handle: it stays where it was on screen, the box unchanged: " + JSON.stringify(V1.seKept),
    V1.anchor === "se" && Math.abs(V1.seKept.before.x - V1.seKept.after.x) < 0.6 && Math.abs(V1.seKept.before.y - V1.seKept.after.y) < 0.6 && V1.seKept.z > 1.5 && V1.seKept.boxSame, V1);

  // The four (ak) proofs.
  const VA = await page.evaluate(async () => {
    const C = __cb, V = __V, out = {};
    const src = await C.toBlob(C.halves(4000, 3000), "image/jpeg", 0.92);
    const boxOf = (s) => ({ left: s.dispW * 0.2, top: s.dispH * 0.3, right: s.dispW * 0.7, bottom: s.dispH * 0.8 });
    // (i) The same box, Used at 1x and after zooming to 3x, panning, and a handle out and back.
    let s = await C.open(src, "slab_reverse"); s.box = boxOf(s); renderBgCrop();
    const box1 = Object.assign({}, s.box);
    const e1 = await C.finish(); const kind1 = __getLastBgCropResultForTest().kind;
    s = await C.open(src, "slab_reverse"); s.box = boxOf(s); renderBgCrop();
    setBgCropView(3, null, { fx: 0.62, fy: 0.55 }); renderBgCrop(); // the right-hand handle in view
    const e = V.handleAt("e");
    V.fire("pointerdown", 1, e.x, e.y); V.fire("pointermove", 1, e.x - 30, e.y); V.fire("pointermove", 1, e.x - 50, e.y + 7); V.fire("pointermove", 1, e.x, e.y); V.fire("pointerup", 1, e.x, e.y);
    const box3 = Object.assign({}, s.box), z3 = s.view.z;
    const e3 = await C.finish();
    out.same = { kind1, z3, boxSame: JSON.stringify(box1) === JSON.stringify(box3), bytes: await C.sameBytes(e1.blob, e3.blob), sizes: [e1.blob.size, e3.blob.size] };
    // (ii) A 30 screen px drag of the right-hand handle at 3x moves the box 10 picture px ...
    s = await C.open(src, "slab_reverse"); s.box = boxOf(s); renderBgCrop();
    setBgCropView(3, null, { fx: 0.6, fy: 0.55 }); renderBgCrop();
    const right0 = s.box.right, h = V.handleAt("e");
    V.drag(1, h.x, h.y, h.x - 30, h.y, 6);
    out.moved = { by: right0 - s.box.right, z: s.view.z };
    const boxD = Object.assign({}, s.box);
    const eD = await C.finish();
    // ... and saves exactly what a 1x crop of that box saves.
    s = await C.open(src, "slab_reverse"); s.box = Object.assign({}, boxD); renderBgCrop();
    const e1D = await C.finish();
    out.moved.bytes = await C.sameBytes(eD.blob, e1D.blob);
    // (iii) + (iv) An untouched Holder: zoom in / out, pinch, pan; no decode; own bytes.
    let decodes = 0;
    const origCIB = window.createImageBitmap;
    s = await C.open(src, "slab_obverse");
    window.createImageBitmap = function (...a) { decodes++; return origCIB.apply(this, a); };
    V.pad("in").click(); V.pad("in").click();
    const vs = V.viewSize();
    V.fire("pointerdown", 1, vs.w / 2 - 40, vs.h / 2); V.fire("pointerdown", 2, vs.w / 2 + 40, vs.h / 2);
    V.fire("pointermove", 1, vs.w / 2 - 70, vs.h / 2); V.fire("pointermove", 2, vs.w / 2 + 70, vs.h / 2);
    V.fire("pointerup", 1, vs.w / 2 - 70, vs.h / 2); V.fire("pointerup", 2, vs.w / 2 + 70, vs.h / 2);
    V.pad("out").click();
    const pinched = s.view.z;
    out.untouchedBox = bgCropUntouched(s);
    out.decodesWhileZooming = decodes;
    window.createImageBitmap = origCIB;
    const eU = await C.finish();
    out.untouched = { pinched, kind: __getLastBgCropResultForTest().kind, same: await C.sameBytes(eU.blob, src) };
    return out;
  });
  ok("V7 (ak) proof (i): the same box saves byte-identical files at 1x and after zooming to 3x, panning and a handle dragged out and back: " + JSON.stringify(VA.same),
    VA.same.kind1 === "trimmed-fullres" && VA.same.z3 === 3 && VA.same.boxSame && VA.same.bytes, VA);
  ok("V8 (ak) proof (ii): at 3x a 30 screen px drag moves the box 10 picture px: " + JSON.stringify(VA.moved),
    Math.abs(VA.moved.by - 10) < 0.01 && VA.moved.z === 3, VA);
  ok("V9 ... and saves byte for byte what a 1x crop of that box saves", VA.moved.bytes === true, VA);
  ok("V10 (ak) proof (iii): an untouched Holder zoomed in, pinched, zoomed out and Used keeps its box at the whole photo and saves its own bytes: " + JSON.stringify(VA.untouched),
    VA.untouchedBox && VA.untouched.kind === "original-bytes" && VA.untouched.same && VA.untouched.pinched > 1, VA);
  ok("V11 (ak) proof (iv): nothing decodes the original while zooming (" + VA.decodesWhileZooming + " decodes)", VA.decodesWhileZooming === 0, VA);

  // Panning, pinching, limits, F1 at 4x, slide-along, arrows.
  const VP = await page.evaluate(async () => {
    const C = __cb, V = __V, out = {};
    const src = await C.toBlob(C.halves(4000, 3000), "image/jpeg", 0.9);
    let s = await C.open(src, "slab_reverse");
    s.box = { left: s.dispW * 0.3, top: s.dispH * 0.3, right: s.dispW * 0.7, bottom: s.dispH * 0.7 }; renderBgCrop();
    const box0 = JSON.stringify(s.box), vs = V.viewSize();
    // At 1x a drag outside the box (on the dimmed photo) does nothing.
    V.drag(1, 30, 30, 70, 50);
    out.at1 = { v: V.view(), boxSame: JSON.stringify(s.box) === box0 };
    // At 2x it pans the view; the box stays.
    setBgCropView(2, null, { fx: 0.5, fy: 0.5 }); renderBgCrop();
    const p0 = V.view();
    // A point well clear of the box and its handles' 44 px touch areas.
    const clear = { x: 6, y: vs.h / 2 };
    out.clearTarget = document.elementFromPoint(V.frame().getBoundingClientRect().left + clear.x, V.frame().getBoundingClientRect().top + clear.y).id;
    V.drag(1, clear.x, clear.y, clear.x + 20, clear.y + 10);
    const p1 = V.view();
    out.pan = { dx: p1.panX - p0.panX, dy: p1.panY - p0.panY, boxSame: JSON.stringify(s.box) === box0 };
    // A drag inside the box moves the box, by the finger's travel / zoom.
    const mid = V.toView((s.box.left + s.box.right) / 2, (s.box.top + s.box.bottom) / 2), l0 = s.box.left;
    V.drag(1, mid.x, mid.y, mid.x + 16, mid.y, 4);
    out.move = { by: s.box.left - l0, z: s.view.z, panSame: V.view().panX === p1.panX };
    // Pinch: two fingers 100 px apart spread to 200 about a middle point: 2x more, that point stays.
    setBgCropView(1, null, { fx: 0.5, fy: 0.5 }); renderBgCrop();
    const M = { x: vs.w / 2 + 20, y: vs.h / 2 - 10 }, q0 = V.fromView(M.x, M.y);
    V.fire("pointerdown", 1, M.x - 50, M.y); V.fire("pointerdown", 2, M.x + 50, M.y);
    for (let i = 1; i <= 5; i++) { V.fire("pointermove", 1, M.x - 50 - 10 * i, M.y); V.fire("pointermove", 2, M.x + 50 + 10 * i, M.y); }
    const q1 = V.fromView(M.x, M.y);
    out.pinch = { z: s.view.z, q0, q1 };
    // Two fingers moved together pan without zooming.
    const pz = V.view();
    V.fire("pointermove", 1, M.x - 100 + 20, M.y + 10); V.fire("pointermove", 2, M.x + 100 + 20, M.y + 10);
    const pz2 = V.view();
    V.fire("pointerup", 1, 0, 0); V.fire("pointerup", 2, 0, 0);
    out.twoPan = { dz: pz2.z - pz.z, dx: pz2.panX - pz.panX, dy: pz2.panY - pz.panY };
    // A second finger undoes the first finger's half-done box edit.
    const before = JSON.stringify(s.box), se = V.handleAt("se");
    V.fire("pointerdown", 1, se.x, se.y); V.fire("pointermove", 1, se.x - 25, se.y - 15);
    const midEdit = JSON.stringify(s.box) !== before;
    V.fire("pointerdown", 2, se.x - 120, se.y - 80);
    out.secondFinger = { midEdit, restored: JSON.stringify(s.box) === before };
    V.fire("pointerup", 1, 0, 0); V.fire("pointerup", 2, 0, 0);
    cancelBgCrop();
    // Pan limits at 4x and F1: a whole-photo Holder box, pushed to each corner,
    // keeps its corner handles fully on the margin and grabbable.
    s = await C.open(src, "slab_obverse");
    setBgCropView(4, null, { fx: 0.5, fy: 0.5 }); renderBgCrop();
    const corners = {};
    for (const [name, dx, dy] of [["nw", 1, 1], ["ne", -1, 1], ["sw", 1, -1], ["se", -1, -1]]) {
      s.view.panX += dx * 99999; s.view.panY += dy * 99999; clampBgCropPan(s); renderBgCrop();
      const v = V.view(), vw = V.viewSize();
      const left = v.panX, right = v.panX + s.dispW * v.z, top = v.panY, bottom = v.panY + s.dispH * v.z;
      const el = document.querySelector("#bgCropBox .bg-crop-handle." + name), r = el.getBoundingClientRect(), f = V.frame().getBoundingClientRect();
      const inside = r.left >= f.left && r.right <= f.right && r.top >= f.top && r.bottom <= f.bottom;
      const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2) === el;
      const edgeGap = name === "nw" ? [left, top] : name === "ne" ? [vw.w - right, top] : name === "sw" ? [left, vw.h - bottom] : [vw.w - right, vw.h - bottom];
      corners[name] = { edgeGap, inside, hit };
    }
    out.corners = corners;
    // Slide-along: at 3x hold the right-hand handle 8 px from the view's right edge.
    s.box = { left: s.dispW * 0.2, top: s.dispH * 0.3, right: s.dispW * 0.5, bottom: s.dispH * 0.7 }; renderBgCrop();
    setBgCropView(3, null, { fx: 0.4, fy: 0.5 }); renderBgCrop();
    const e = V.handleAt("e"), vw = V.viewSize(), pan0 = V.view().panX;
    V.fire("pointerdown", 1, e.x, e.y); V.fire("pointermove", 1, vw.w - 8, e.y);
    await C.sleep(250);
    const pan1 = V.view().panX;
    const underFinger = Math.abs(V.handleAt("e").x - (vw.w - 8)) < 0.6;
    V.fire("pointerup", 1, vw.w - 8, e.y);
    await C.sleep(60);
    out.follow = { pan0, pan1, underFinger, stopped: V.view().panX };
    // Arrows at 4x: one tap = 1 screen px = a quarter picture px; the view follows the edge.
    setBgCropView(4, null, { fx: 0.9, fy: 0.5 }); renderBgCrop(); // the box's left edge is off to the left
    const leftOff = V.toView(s.box.left, 0).x < 0;
    const lBefore = s.box.left;
    document.querySelector('#bgCropPad [data-nudge="left"]').click();
    out.arrow = { by: lBefore - s.box.left, leftOff, edgeNow: V.toView(s.box.left, 0).x, viewW: vw.w };
    cancelBgCrop();
    return out;
  });
  ok("V12 at 1x a drag outside the box does nothing (no room to pan; the box stays): " + JSON.stringify(VP.at1),
    VP.at1.v.z === 1 && VP.at1.v.panX === 16 && VP.at1.v.panY === 16 && VP.at1.boxSame, VP);
  ok("V13 zoomed, one finger dragged outside the box pans the view by the finger's travel and leaves the box alone: " + JSON.stringify(VP.pan),
    VP.pan.dx === 20 && VP.pan.dy === 10 && VP.pan.boxSame, VP);
  ok("V14 zoomed, a drag inside the box moves the box by the travel / zoom (16 px at 2x = 8 px), not the view: " + JSON.stringify(VP.move),
    Math.abs(VP.move.by - 8) < 0.01 && VP.move.panSame, VP);
  ok("V15 pinch: fingers 100 px apart spread to 200 zoom 2x about their middle (that picture point stays under it): " + JSON.stringify(VP.pinch),
    Math.abs(VP.pinch.z - 2) < 1e-9 && Math.abs(VP.pinch.q0.x - VP.pinch.q1.x) < 0.01 && Math.abs(VP.pinch.q0.y - VP.pinch.q1.y) < 0.01, VP);
  ok("V16 two fingers moved together pan without zooming: " + JSON.stringify(VP.twoPan),
    Math.abs(VP.twoPan.dz) < 1e-9 && Math.abs(VP.twoPan.dx - 20) < 0.01 && Math.abs(VP.twoPan.dy - 10) < 0.01, VP);
  ok("V17 a second finger undoes the first finger's half-done handle drag (a pinch never resizes the box): " + JSON.stringify(VP.secondFinger),
    VP.secondFinger.midEdit && VP.secondFinger.restored, VP);
  ok("V18 at 4x the view pans no further than the 16 px margin past the photo's edge, at every corner: " + JSON.stringify(Object.fromEntries(Object.entries(VP.corners).map(([k, v]) => [k, v.edgeGap]))),
    Object.values(VP.corners).every(c => c.edgeGap.every(g => Math.abs(g - 16) < 0.01)), VP);
  ok("V19 ... so a whole-photo Holder's corner handles stay fully on the margin and grabbable at 4x (F1 at every zoom): " + JSON.stringify(VP.corners),
    Object.values(VP.corners).every(c => c.inside && c.hit), VP);
  ok("V20 slide-along: a handle held near the view's edge slides the view along, the handle staying under the finger, and stops when let go: " + JSON.stringify(VP.follow),
    VP.follow.pan1 < VP.follow.pan0 - 8 && VP.follow.underFinger && VP.follow.stopped === VP.follow.pan1, VP);
  ok("V21 arrows at 4x: one tap moves the box 1 screen px (a quarter picture px), and the view follows that edge into sight: " + JSON.stringify(VP.arrow),
    Math.abs(VP.arrow.by - 0.25) < 1e-9 && VP.arrow.leftOff && VP.arrow.edgeNow >= 16 - 0.01 && VP.arrow.edgeNow <= VP.arrow.viewW - 16 + 0.01, VP);

  // What the zoom does on a turn, a straighten, Lock to square, a resize, Use / Cancel.
  const VQ = await page.evaluate(async () => {
    const C = __cb, V = __V, out = {};
    const src = await C.toBlob(C.halves(4000, 3000), "image/jpeg", 0.9);
    let s = await C.open(src, "slab_reverse");
    setBgCropView(2.5, null, { fx: 0.3, fy: 0.6 }); renderBgCrop();
    const vs = V.viewSize(), c0 = V.fromView(vs.w / 2, vs.h / 2), f0 = { fx: c0.x / s.dispW, fy: c0.y / s.dispH };
    const sl = document.getElementById("bgCropStraighten");
    sl.value = "3"; sl.dispatchEvent(new Event("input", { bubbles: true }));
    await C.settle(); await C.sleep(30);
    const vs2 = V.viewSize(), c1 = V.fromView(vs2.w / 2, vs2.h / 2);
    out.straighten = { z: s.view.z, f0, f1: { fx: c1.x / s.dispW, fy: c1.y / s.dispH } };
    // Lock to square keeps the zoom and shows the squared box.
    s.box = { left: s.dispW * 0.05, top: s.dispH * 0.1, right: s.dispW * 0.45, bottom: s.dispH * 0.3 }; renderBgCrop(); // squared: 0.2 of the height, fits the view at 4x
    setBgCropView(4, null, { fx: 0.9, fy: 0.9 }); renderBgCrop();
    document.getElementById("bgCropAspectLock").click();
    const b = s.box, a = V.toView(b.left, b.top), z = V.toView(b.right, b.bottom), vw = V.viewSize();
    out.lock = { z: s.view.z, inView: a.x >= 15.99 && a.y >= 15.99 && z.x <= vw.w - 15.99 && z.y <= vw.h - 15.99 };
    document.getElementById("bgCropAspectLock").click();
    // A 90° turn: back to 1x.
    document.getElementById("bgCropRotateRightBtn").click(); await C.settle();
    out.turn = V.view();
    cancelBgCrop();
    // Cancel, then reopen: 1x.
    s = await C.open(src, "slab_reverse");
    out.reopen = V.view();
    setBgCropView(3, null, { fx: 0.5, fy: 0.5 }); renderBgCrop();
    out.beforeResize = V.view();
    return out;
  });
  await page.setViewportSize({ width: 360, height: 740 });
  const VR = await page.evaluate(async () => {
    const C = __cb, V = __V;
    await C.sleep(120);
    const s = bgCropState, vs = V.viewSize(), c = V.fromView(vs.w / 2, vs.h / 2);
    const out = { z: s.view.z, dispW: s.dispW, fx: c.x / s.dispW, fy: c.y / s.dispH };
    await C.finish();
    const s2 = await C.open(await C.toBlob(C.halves(1600, 1200), "image/jpeg", 0.9), "other");
    out.afterUse = V.view();
    cancelBgCrop();
    return out;
  });
  await page.setViewportSize(PHONE);
  ok("V22 a straighten keeps the zoom and the point at the view's centre: " + JSON.stringify(VQ.straighten),
    VQ.straighten.z === 2.5 && Math.abs(VQ.straighten.f0.fx - VQ.straighten.f1.fx) < 0.01 && Math.abs(VQ.straighten.f0.fy - VQ.straighten.f1.fy) < 0.01, VQ);
  ok("V23 Lock to square keeps the zoom and moves the view to show the squared box: " + JSON.stringify(VQ.lock), VQ.lock.z === 4 && VQ.lock.inView, VQ);
  ok("V24 a 90° turn goes back to 1x: " + JSON.stringify(VQ.turn), VQ.turn.z === 1 && VQ.turn.panX === 16 && VQ.turn.panY === 16 && !VQ.turn.anchor, VQ);
  ok("V25 Cancel and reopen: 1x: " + JSON.stringify(VQ.reopen), VQ.reopen.z === 1 && VQ.reopen.panX === 16, VQ);
  ok("V26 a resize (the screen narrower) keeps the zoom and the centre point: " + JSON.stringify(VR),
    VR.z === 3 && VR.dispW < VQ.beforeResize.z * 1000 && Math.abs(VR.fx - 0.5) < 0.01 && Math.abs(VR.fy - 0.5) < 0.01, { VQ, VR });
  ok("V27 Use Crop, then the next crop opens at 1x: " + JSON.stringify(VR.afterUse), VR.afterUse.z === 1 && VR.afterUse.panX === 16, VR);

  // ---------- W. no button runs off its box (Ray's S25, 14 Nov 2026) ------
  // The "Crop this photo into…" chooser (Obverse / Reverse / Reference /
  // Cancel) ran Cancel off the dialog at about 384 px wide (older than (bs):
  // the same on main). Its buttons now wrap two to a row when one row does
  // not fit, each at least 44 px tall. The crop screens' rows are checked too.
  const rowsAt = async (width, height) => {
    await page.setViewportSize({ width, height });
    return page.evaluate(async () => {
      const C = __cb;
      const measure = (btnSel, boxSel) => {
        const box = document.querySelector(boxSel).getBoundingClientRect();
        return [...document.querySelectorAll(btnSel)].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect();
          return { t: b.textContent.trim(), l: r.left, r: r.right, top: Math.round(r.top), h: r.height,
            inside: r.left >= box.left - 0.5 && r.right <= box.right + 0.5 && r.right <= innerWidth + 0.5 }; });
      };
      const out = {};
      // The real chooser, as a Holder's "Crop from this photo" opens it.
      startCropFromUpload("AY-00002", { type: "slab_obverse", storedFilename: "AY-00002_slab_obverse.jpg" }, () => {}, true);
      out.chooser = measure("#writeGuardBtns button", "#writeGuardOverlay .photo-adjust-panel");
      out.wrapped = document.getElementById("writeGuardBtns").classList.contains("wrap2");
      document.querySelector("#writeGuardBtns button:last-child").click(); // Cancel
      // A two-button dialog stays on one row.
      showWriteGuard({ title: "t", bodyHtml: "<p>x</p>", buttons: [{ label: "Skip" }, { label: "Crop", primary: true }] });
      out.two = measure("#writeGuardBtns button", "#writeGuardOverlay .photo-adjust-panel");
      document.querySelector("#writeGuardBtns button").click();
      // The crop screens' rows.
      await C.open(await C.toBlob(C.halves(3000, 4000), "image/jpeg", 0.8), "obverse");
      out.s1 = measure("#bgCropOverlay button, #bgCropAspectRow", "#bgCropOverlay .bg-crop-panel");
      await C.useStage1();
      await C.waitFor(() => photoAdjustState, 15000); await C.settle();
      out.s2 = measure("#photoAdjustOverlay button", "#photoAdjustOverlay .photo-adjust-panel");
      cancelPhotoAdjust();
      return out;
    });
  };
  for (const [w, h] of [[360, 740], [384, 740], [412, 915], [768, 1024]]) {
    const R = await rowsAt(w, h);
    const by = (t) => R.chooser.find(b => b.t === t);
    ok("W1 at " + w + " px every button of the \"Crop this photo into…\" chooser stays inside the dialog and the screen, at least 44 px tall: " +
      JSON.stringify(R.chooser.map(b => [b.t, Math.round(b.l), Math.round(b.r), Math.round(b.h)])),
      R.chooser.length === 4 && R.chooser.every(b => b.inside && b.h >= 44 - 0.5), R);
    const pairs = R.wrapped && by("Obverse").top === by("Reverse").top && by("Reference").top === by("Cancel").top && by("Reference").top > by("Obverse").top;
    const oneRow = !R.wrapped && R.chooser.every(b => b.top === R.chooser[0].top);
    // The dialog is at most 360 px wide on every screen, so these four never fit one row:
    // two to a row at every width (a row that fits stays one row: W3).
    ok("W2 at " + w + " px they wrap two to a row: Obverse / Reverse, then Reference / Cancel", pairs && !oneRow, R);
    ok("W3 at " + w + " px a two-button dialog stays on one row, inside the box", R.two.length === 2 && R.two.every(b => b.inside && b.h >= 43.5) && R.two[0].top === R.two[1].top, R);
    const badRows = R.s1.concat(R.s2).filter(b => !b.inside);
    ok("W4 at " + w + " px no button on either crop screen runs off its panel" + (badRows.length ? ": " + JSON.stringify(badRows) : ""), badRows.length === 0 && R.s1.length >= 12 && R.s2.length >= 12, R);
  }
  await page.setViewportSize(PHONE);

  // ---------- H. no writes --------------------------------------------------
  const H = await page.evaluate(() => __cb.writes.slice());
  ok("H1 cropping, nudging, turning and resizing send no write of any kind (F10's Save goes to a mock client): " + JSON.stringify(H), H.length === 0, H);
}, module);
