// (ak) Holder / Reference at full resolution (claude/holder-fullres-ak, 9 Nov 2026).
//
// WHY. A phone photo of a slab was cut to 1400 px (about 250 KB) on the way
// in, and the guided Obverse / Reverse crop was then cut from that, so a
// coin that was photographed once kept a soft, small picture for good. Ray's
// rule: Holder, Reference, Other, COA, Package and Set photos may be TRIMMED
// but never downscaled; Obverse / Reverse stay at 1400 px, JPEG 0.92.
//
//   A  untouched trim-only pick = the picked file's own bytes; the box
//      starts at the whole photo; a PNG is encoded once, full size
//   B  a trimmed pick: full-resolution pixels of exactly the box, JPEG 0.95
//   C  turns map onto the original: 90° swaps the sides, a marker lands in
//      the right corner; a fine straighten keeps the box's centre pixel
//   D  a flip source: Stage 1 hands PIXELS to Stage 2, cut from the
//      original; the stored crop is capped at 1400
//   E  a guided crop from a full-resolution holder pick is sharp (well over
//      the old ~500-700 px)
//   F  tiles: a pending pick's tile is a small copy, the viewer shows the
//      full picture; a stored trim-only tile reads OneDrive's thumbnail and
//      falls back to the file; the viewer swaps the thumbnail for the file
//   G  upload session when a simple upload answers 413 (no-overwrite kept,
//      chunks without Authorization, a failed chunk cancels the session)
//   H  over about 60 MP: decoded at 8192 px on the long edge, with a toast
//   I  About's Save steps name each upload's size
//   J  nothing in A-F writes anything

const { defineSuite } = require("./harness");

module.exports = defineSuite("photo-fullres", async ({ openApp, check, selfCheck, PHONE }) => {
  const ok = check; selfCheck(ok);
  const __near = (rgb, want) => Array.isArray(rgb) && rgb.every((v, i) => Math.abs(v - want[i]) < 60);
  const page = await openApp(PHONE);

  // Shared helpers inside the page.
  await page.evaluate(() => {
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const waitFor = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 10000)) { if (fn()) return true; await sleep(15); } return false; };
    // A test picture: four coloured quadrants (TL red, TR green, BL blue,
    // BR yellow) with a white disc in the middle, w x h.
    const picture = (w, h) => {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const x = c.getContext("2d");
      x.fillStyle = "#ff0000"; x.fillRect(0, 0, w / 2, h / 2);
      x.fillStyle = "#00ff00"; x.fillRect(w / 2, 0, w / 2, h / 2);
      x.fillStyle = "#0000ff"; x.fillRect(0, h / 2, w / 2, h / 2);
      x.fillStyle = "#ffff00"; x.fillRect(w / 2, h / 2, w / 2, h / 2);
      x.fillStyle = "#ffffff"; x.beginPath(); x.arc(w / 2, h / 2, Math.min(w, h) * 0.2, 0, Math.PI * 2); x.fill();
      return c;
    };
    const toBlob = (c, type, q) => new Promise(r => c.toBlob(r, type || "image/jpeg", q == null ? 0.92 : q));
    const dims = async (blob) => { const b = await createImageBitmap(blob); const o = { w: b.width, h: b.height }; b.close(); return o; };
    // The colour at a fraction (fx, fy) of a blob / canvas.
    const colourAt = async (src, fx, fy) => {
      const b = src instanceof HTMLCanvasElement ? src : await createImageBitmap(src);
      const c = document.createElement("canvas"); c.width = b.width; c.height = b.height;
      const g = c.getContext("2d"); g.drawImage(b, 0, 0);
      const d = g.getImageData(Math.min(b.width - 1, Math.floor(b.width * fx)), Math.min(b.height - 1, Math.floor(b.height * fy)), 1, 1).data;
      return [d[0], d[1], d[2]];
    };
    const near = (rgb, want) => rgb.every((v, i) => Math.abs(v - want[i]) < 60);
    const sameBytes = async (a, b) => {
      if (a.size !== b.size) return false;
      const x = new Uint8Array(await a.arrayBuffer()), y = new Uint8Array(await b.arrayBuffer());
      for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
      return true;
    };
    // Runs the REAL pipeline for one type; `adjust(state)` may change the
    // Stage 1 box / turns before Use; Stage 2 (a flip source) is accepted
    // as it opens unless `stage2(state)` says otherwise.
    const run = (blob, type, adjust, stage2) => new Promise((resolve) => {
      delete galleryStore["AY-00002"];
      let stage2Seen = null;
      runCropPipeline(blob, type, "AY-00002", (entry) => resolve({ entry, stage2Seen }), null);
      (async () => {
        await waitFor(() => bgCropState && bgCropState.dispW > 0);
        if (adjust) adjust(bgCropState);
        document.getElementById("bgCropUseBtn").click();
        await waitFor(() => !bgCropState, 15000);
        if (!galleryTypeDef(type).flipSource) return;
        await waitFor(() => photoAdjustState, 15000);
        stage2Seen = { naturalWidth: photoAdjustState.naturalWidth, hasCanvas: !!photoAdjustState.sourceCanvas,
          canvasW: photoAdjustState.sourceCanvas ? photoAdjustState.sourceCanvas.width : 0 };
        if (stage2) stage2(photoAdjustState);
        document.getElementById("photoAdjustUseBtn").click();
      })();
    });
    // Any Graph write during the crop sections counts against J.
    const writes = [];
    const origFetch = window.fetch.bind(window);
    window.__fr = { sleep, waitFor, picture, toBlob, dims, colourAt, near, sameBytes, run, writes, origFetch };
    window.fetch = (url, opts) => {
      const m = (opts && opts.method) || "GET";
      if (m !== "GET") writes.push(m + " " + url);
      return origFetch(url, opts);
    };
  });

  // ---------- A. untouched = the original bytes --------------------------
  const A = await page.evaluate(async () => {
    const F = __fr;
    const src = await F.toBlob(F.picture(4000, 3000), "image/jpeg", 0.9);
    let boxWhole = null;
    const r = await F.run(src, "slab_obverse", (s) => { boxWhole = { l: s.box.left, t: s.box.top, r: s.box.right - s.dispW, b: s.box.bottom - s.dispH, disp: Math.max(s.dispW, s.dispH) }; });
    const info = __getLastBgCropResultForTest();
    const same = await F.sameBytes(r.entry.blob, src);
    const pngSrc = await F.toBlob(F.picture(1800, 1200), "image/png");
    const r2 = await F.run(pngSrc, "reference");
    const info2 = __getLastBgCropResultForTest();
    const d2 = await F.dims(r2.entry.blob);
    const head = new Uint8Array(await r2.entry.blob.slice(0, 3).arrayBuffer());
    // Every non-flip type is trim-only; the flip sources are not.
    const trimOnly = GALLERY_TYPES.filter(d => galleryTypeTrimOnly(d)).map(d => d.key);
    return { boxWhole, same, size: r.entry.blob.size, srcSize: src.size, kind: info.kind, w: info.width, h: info.height,
      kind2: info2.kind, d2, jpeg2: head[0] === 0xFF && head[1] === 0xD8, trimOnly,
      flipTrim: ["obverse", "reverse"].map(k => galleryTypeTrimOnly(galleryTypeDef(k))) };
  });
  ok("A1 a trim-only crop box starts at the whole photo: " + JSON.stringify(A.boxWhole),
    A.boxWhole && Math.abs(A.boxWhole.l) < 0.01 && Math.abs(A.boxWhole.t) < 0.01 && Math.abs(A.boxWhole.r) < 0.01 && Math.abs(A.boxWhole.b) < 0.01 && A.boxWhole.disp <= 360, A.boxWhole);
  ok("A2 Use on an untouched JPEG holder keeps the picked file's own bytes (" + A.size + " of " + A.srcSize + ")", A.same && A.kind === "original-bytes", A);
  ok("A3 ... and reports the original's full size, 4000 x 3000", A.w === 4000 && A.h === 3000, A);
  ok("A4 an untouched PNG Reference is encoded once as a JPEG at its full 1800 x 1200: " + JSON.stringify(A.d2),
    A.kind2 === "trimmed-fullres" && A.d2.w === 1800 && A.d2.h === 1200 && A.jpeg2, A);
  ok("A5 trim-only = every non-flip type (Holder, Reference, Other, COA, Package, Set photos): " + A.trimOnly.join(", "),
    ["slab_obverse", "slab_reverse", "reference", "ogp_obverse", "ogp_reverse", "coa", "ogp", "subgroup_obverse", "subgroup_reverse", "other"].every(k => A.trimOnly.includes(k)) &&
    A.flipTrim.every(v => v === false), A);

  // ---------- B. a trimmed pick: full-resolution pixels of the box -------
  const B = await page.evaluate(async () => {
    const F = __fr;
    const src = await F.toBlob(F.picture(4000, 3000), "image/jpeg", 0.95);
    // The right half of the photo only.
    const r = await F.run(src, "slab_reverse", (s) => { s.box = { left: s.dispW / 2, top: 0, right: s.dispW, bottom: s.dispH }; });
    const info = __getLastBgCropResultForTest();
    const d = await F.dims(r.entry.blob);
    return { d, kind: info.kind, tl: await F.colourAt(r.entry.blob, 0.1, 0.1), bl: await F.colourAt(r.entry.blob, 0.1, 0.9),
      bytes: r.entry.blob.size, notSame: !(await F.sameBytes(r.entry.blob, src)) };
  });
  ok("B1 a trimmed Holder keeps full resolution: the right half of 4000 x 3000 is 2000 x 3000: " + JSON.stringify(B.d),
    Math.abs(B.d.w - 2000) <= 2 && Math.abs(B.d.h - 3000) <= 2 && B.kind === "trimmed-fullres", B);
  ok("B2 ... of exactly the box (green top-left, yellow bottom-left): " + JSON.stringify([B.tl, B.bl]),
    __near(B.tl, [0, 255, 0]) && __near(B.bl, [255, 255, 0]), B);
  ok("B3 ... as new bytes (it was encoded, once)", B.notSame, B);

  // ---------- C. turns map onto the original ----------------------------
  const C = await page.evaluate(async () => {
    const F = __fr;
    const src = await F.toBlob(F.picture(3200, 2000), "image/jpeg", 0.95);
    const r90 = await F.run(src, "other", (s) => { s.rotateQuick = 90; refreshBgCropSource(false); s.box = { left: 0, top: 0, right: s.dispW, bottom: s.dispH }; });
    const d90 = await F.dims(r90.entry.blob);
    // Turned clockwise: red (top-left) goes to the top-right corner.
    const tr = await F.colourAt(r90.entry.blob, 0.9, 0.1), tl = await F.colourAt(r90.entry.blob, 0.1, 0.1);
    // A 12° straighten with a small box round the centre: the centre stays
    // the white disc, and the box keeps its size in original pixels.
    let boxDisp = null, k = null;
    const rFine = await F.run(src, "coa", (s) => {
      s.rotateFine = 12; refreshBgCropSource(false);
      const cx = s.dispW / 2, cy = s.dispH / 2;
      s.box = { left: cx - 40, top: cy - 30, right: cx + 40, bottom: cy + 30 };
      boxDisp = { w: 80 * s.naturalW / s.dispW, h: 60 * s.naturalH / s.dispH };
      k = s.baseCanvas.width / 3200;
    });
    const dFine = await F.dims(rFine.entry.blob);
    return { d90, tr, tl, dFine, want: { w: boxDisp.w / k, h: boxDisp.h / k }, centre: await F.colourAt(rFine.entry.blob, 0.5, 0.5) };
  });
  ok("C1 a 90° turn is applied to the original: 3200 x 2000 becomes 2000 x 3200: " + JSON.stringify(C.d90),
    Math.abs(C.d90.w - 2000) <= 2 && Math.abs(C.d90.h - 3200) <= 2, C);
  ok("C2 ... clockwise (red top-left moves to the top-right; blue to the top-left): " + JSON.stringify([C.tr, C.tl]),
    __near(C.tr, [255, 0, 0]) && __near(C.tl, [0, 0, 255]), C);
  ok("C3 a fine straighten keeps the box's size in original pixels: " + JSON.stringify([C.dFine, C.want]),
    Math.abs(C.dFine.w - C.want.w) <= 3 && Math.abs(C.dFine.h - C.want.h) <= 3 && C.dFine.w > 150, C);
  ok("C4 ... and its centre (the white disc stays in the middle): " + JSON.stringify(C.centre), __near(C.centre, [255, 255, 255]), C);

  // ---------- D. a flip source: pixels to Stage 2, cap 1400 --------------
  const D = await page.evaluate(async () => {
    const F = __fr;
    const src = await F.toBlob(F.picture(4000, 4000), "image/jpeg", 0.95);
    // The whole square (Stage 1 box set to it): 4000 px across, handed on at 2000.
    const r = await F.run(src, "obverse", (s) => { s.box = { left: 0, top: 0, right: s.dispW, bottom: s.dispH }; });
    const info = __getLastBgCropResultForTest();
    const d = await F.dims(r.entry.blob);
    return { stage2: r.stage2Seen, kind: info.kind, handW: info.width, d, rawKept: !!r.entry.rawUrl };
  });
  ok("D1 Stage 1 hands a flip source to Stage 2 as pixels (a canvas), not a JPEG: " + JSON.stringify(D.stage2),
    D.kind === "pixels" && D.stage2 && D.stage2.hasCanvas && D.stage2.canvasW === D.handW, D);
  ok("D2 ... cut from the original, at most 2000 across (4000 in, " + D.handW + " handed on)", D.handW === 2000, D);
  ok("D3 the stored Obverse is capped at 1400 px: " + JSON.stringify(D.d), D.d.w === 1400 && D.d.h === 1400, D);
  ok("D4 a direct Obverse pick still keeps its untouched original (rawUrl)", D.rawKept, D);

  // ---------- E. guided crop from a full-resolution holder ---------------
  const E = await page.evaluate(async () => {
    const F = __fr;
    // A 4000 x 3000 holder whose coin (the white disc) is 1200 px across.
    const holderSrc = await F.toBlob(F.picture(4000, 3000), "image/jpeg", 0.92);
    const holder = (await F.run(holderSrc, "slab_obverse")).entry;
    holder.pendingSave = true;
    const srcBlob = await loadCropSourceBlob(holder, false);
    const srcDims = await F.dims(srcBlob);
    // Frame the coin in Stage 1: a square round the disc (1300 original px).
    const r = await F.run(srcBlob, "obverse", (s) => {
      const k = s.baseCanvas.width / 4000; // original -> display copy
      const sideDisp = 1300 * k * s.dispW / s.naturalW; // display copy -> screen
      const cx = s.dispW / 2, cy = s.dispH / 2;
      s.box = { left: cx - sideDisp / 2, top: cy - sideDisp / 2, right: cx + sideDisp / 2, bottom: cy + sideDisp / 2 };
    }, (st) => { st.zoom = 1.1; applyPhotoAdjustTransform(); });
    const d = await F.dims(r.entry.blob);
    return { srcDims, d, handed: r.stage2Seen };
  });
  ok("E1 the guided crop's source is the holder at full resolution: " + JSON.stringify(E.srcDims), E.srcDims.w === 4000 && E.srcDims.h === 3000, E);
  ok("E2 the coin reaches Stage 2 at its own size (about 1300 px), not cut from a 1400 px holder: " + JSON.stringify(E.handed),
    E.handed && E.handed.canvasW >= 1250 && E.handed.canvasW <= 1350, E);
  ok("E3 the stored guided Obverse is over 1100 px (was about 500-700): " + JSON.stringify(E.d), E.d.w >= 1100 && E.d.w <= 1400, E);

  // ---------- F. tiles and the viewer ------------------------------------
  const F1 = await page.evaluate(async () => {
    const F = __fr;
    const src = await F.toBlob(F.picture(3000, 2000), "image/jpeg", 0.9);
    const r = await F.run(src, "slab_obverse");
    const tile = await F.dims(await fetch(r.entry.url).then(x => x.blob()));
    const full = await F.dims(await fetch(r.entry.fullUrl).then(x => x.blob()));
    // The edit-screen viewer shows the full picture.
    openCoinPhotoInViewer({ id: "AY-00002" }, r.entry);
    await F.waitFor(() => { const img = document.querySelector("#mediaViewerOverlay img"); return img && img.src; });
    const shown = document.querySelector("#mediaViewerOverlay img").src;
    hideMediaViewer();
    // Saved: the read cache points at the full picture, not the tile copy.
    return { tile, full, viewerFull: shown === r.entry.fullUrl, tileIsSmall: r.entry.url !== r.entry.fullUrl };
  });
  ok("F1 a pending trim-only pick's tile is a small copy (640 px at most): " + JSON.stringify(F1.tile),
    F1.tileIsSmall && Math.max(F1.tile.w, F1.tile.h) <= 640, F1);
  ok("F2 ... while its full picture is kept (3000 x 2000): " + JSON.stringify(F1.full), F1.full.w === 3000 && F1.full.h === 2000, F1);
  ok("F3 the viewer shows the full picture, not the tile copy", F1.viewerFull, F1);

  const F2 = await page.evaluate(async () => {
    const F = __fr;
    const reqs = [];
    const thumbBytes = await F.toBlob(F.picture(800, 600), "image/jpeg", 0.8);
    const fullBytes = await F.toBlob(F.picture(3000, 2250), "image/jpeg", 0.9);
    let thumbStatus = 200;
    const prevFetch = window.fetch;
    window.getWriteToken = async () => "tok";
    window.fetch = async (url, opts) => {
      if (String(url).indexOf("graph.microsoft.com") === -1) return prevFetch(url, opts);
      reqs.push(String(url));
      if (/\/thumbnails\/0\/large\/content$/.test(url)) return thumbStatus === 200 ? new Response(thumbBytes, { status: 200 }) : new Response("no", { status: 404 });
      if (/:\/content$/.test(url)) { await F.sleep(150); return new Response(fullBytes, { status: 200 }); }
      return new Response("?", { status: 404 });
    };
    __resetCoinPhotoCacheForTest();
    const holder = { type: "slab_obverse", stored: true, storedFilename: "AY-00002_slab_obverse_77.jpg", url: null };
    const crop = { type: "obverse", stored: true, storedFilename: "AY-00002_obverse_cropped_77.jpg", url: null };
    const tHolder = await storedTileFetch(holder);
    const tCrop = await storedTileFetch(crop);
    // CoinPhotos requests only: a background docket.json read can land in this window.
    const afterTiles = reqs.filter(u => /\/CoinPhotos\//.test(u));
    // A thumbnail OneDrive has not made yet: the file itself.
    thumbStatus = 404;
    const late = { type: "reference", stored: true, storedFilename: "AY-00002_reference_77.jpg", url: null };
    const tLate = await storedTileFetch(late);
    const lateDims = tLate ? await F.dims(await fetch(tLate).then(x => x.blob())) : null;
    // The viewer: the thumbnail at once, then the file.
    holder.url = tHolder;
    openCoinPhotoInViewer({ id: "AY-00002" }, holder);
    await F.sleep(20);
    const first = document.querySelector("#mediaViewerOverlay img").src;
    await F.waitFor(() => holder.fullUrl && document.querySelector("#mediaViewerOverlay img").src === holder.fullUrl);
    const second = document.querySelector("#mediaViewerOverlay img").src;
    hideMediaViewer();
    window.fetch = prevFetch;
    const fullDims = holder.fullUrl ? await F.dims(await fetch(holder.fullUrl).then(x => x.blob())) : null;
    return { afterTiles, tHolderThumb: tHolder && tHolder !== null, first: first === tHolder, second: second === holder.fullUrl, fullDims,
      lateDims, reqs };
  });
  ok("F4 a stored Holder's tile reads OneDrive's thumbnail; a stored Obverse crop's tile reads the file: " + JSON.stringify(F2.afterTiles),
    F2.afterTiles.length === 2 && /AY-00002_slab_obverse_77\.jpg:\/thumbnails\/0\/large\/content$/.test(F2.afterTiles[0]) &&
    /AY-00002_obverse_cropped_77\.jpg:\/content$/.test(F2.afterTiles[1]), F2);
  ok("F5 no thumbnail yet: the tile falls back to the file itself: " + JSON.stringify(F2.lateDims), F2.lateDims && F2.lateDims.w === 3000, F2);
  ok("F6 the viewer shows the thumbnail first, then the full file: " + JSON.stringify([F2.first, F2.second, F2.fullDims]),
    F2.first && F2.second && F2.fullDims && F2.fullDims.w === 3000, F2);

  // ---------- J. nothing above wrote anything ----------------------------
  const J = await page.evaluate(() => __fr.writes.slice());
  ok("J1 cropping, tiles and the viewer send no write of any kind: " + JSON.stringify(J), J.length === 0, J);

  // ---------- G. upload session after a 413 ------------------------------
  const G = await page.evaluate(async () => {
    const F = __fr;
    window.getWriteToken = async () => "tok";
    const log = [];
    let mode = "ok";
    const prevFetch = window.fetch;
    const bytes = new Uint8Array(7 * 1024 * 1024 + 123); for (let i = 0; i < bytes.length; i += 4096) bytes[i] = i & 255;
    const blob = new Blob([bytes], { type: "image/jpeg" });
    let received = [];
    window.fetch = async (url, opts) => {
      const m = (opts && opts.method) || "GET";
      const h = (opts && opts.headers) || {};
      log.push({ m, url: String(url), auth: !!h.Authorization, range: h["Content-Range"] || "", body: opts && typeof opts.body === "string" ? opts.body : "" });
      if (m === "PUT" && /:\/content\?/.test(url)) return new Response("too big", { status: 413 });
      if (m === "POST" && /:\/createUploadSession$/.test(url)) {
        if (mode === "conflict") return new Response("taken", { status: 409 });
        return new Response(JSON.stringify({ uploadUrl: "https://upload.example/session1" }), { status: 200 });
      }
      if (m === "PUT" && /upload\.example/.test(url)) {
        const part = new Uint8Array(await opts.body.arrayBuffer());
        received.push(part);
        const end = Number(/bytes (\d+)-(\d+)\/(\d+)/.exec(h["Content-Range"])[2]);
        const total = Number(/\/(\d+)$/.exec(h["Content-Range"])[1]);
        if (mode === "fail" && received.length === 2) return new Response("broken", { status: 500 });
        if (end + 1 < total) return new Response("{}", { status: 202 });
        return new Response(JSON.stringify({ id: "X1", name: "big.jpg" }), { status: 201 });
      }
      if (m === "DELETE" && /upload\.example/.test(url)) return new Response(null, { status: 204 });
      return prevFetch(url, opts);
    };
    const out = {};
    try { out.done = await RealGraphClient.putContent("CoinCollection/_Testing/CoinPhotos/big.jpg", blob, "image/jpeg", NO_OVERWRITE); }
    catch (e) { out.err = String(e.message || e); }
    const joined = new Uint8Array(received.reduce((n, p) => n + p.length, 0));
    let o = 0; received.forEach(p => { joined.set(p, o); o += p.length; });
    out.bytesMatch = joined.length === bytes.length && joined.every((v, i) => v === bytes[i]);
    out.log1 = log.slice();
    // A failed piece cancels the session.
    log.length = 0; received = []; mode = "fail";
    try { await RealGraphClient.putContent("CoinCollection/_Testing/CoinPhotos/big.jpg", blob, "image/jpeg", NO_OVERWRITE); out.failThrew = false; }
    catch (e) { out.failThrew = true; out.failStatus = e.status; }
    out.log2 = log.map(x => x.m + " " + x.url.replace(/^https:\/\/[^/]+/, ""));
    // A taken name answers 409 at create: a conflict, nothing sent.
    log.length = 0; received = []; mode = "conflict";
    try { await RealGraphClient.putContent("CoinCollection/_Testing/CoinPhotos/big.jpg", blob, "image/jpeg", NO_OVERWRITE); }
    catch (e) { out.conflict = !!e.conflict; }
    out.log3 = log.length;
    window.fetch = prevFetch;
    return out;
  });
  const create = (G.log1 || []).find(x => x.m === "POST");
  const chunks = (G.log1 || []).filter(x => /upload\.example/.test(x.url));
  ok("G1 a simple upload answered 413 goes through an upload session and lands: " + JSON.stringify(G.done || G.err),
    G.done && G.done.id === "X1" && G.log1[0].m === "PUT", G);
  ok("G2 ... created with conflictBehavior fail (no overwrite): " + (create && create.body), create && /"@microsoft.graph.conflictBehavior":"fail"/.test(create.body), G);
  ok("G3 ... in 320 KiB-multiple pieces with Content-Range, without the Authorization header: " + chunks.map(c => c.range).join(" | "),
    chunks.length === 3 && chunks.every(c => !c.auth) && chunks[0].range === "bytes 0-3276799/7340155" && chunks[2].range === "bytes 6553600-7340154/7340155", G);
  ok("G4 ... every byte arrives in order", G.bytesMatch, G);
  ok("G5 a failed piece cancels the session (DELETE) and fails loudly: " + JSON.stringify(G.log2),
    G.failThrew && G.failStatus === 500 && G.log2[G.log2.length - 1] === "DELETE /session1", G);
  ok("G6 a name already taken answers 409 at create: a conflict, no piece sent", G.conflict && G.log3 === 2, G);

  // ---------- H. over about 60 MP --------------------------------------
  const H = await page.evaluate(async () => {
    const F = __fr;
    const c = document.createElement("canvas"); c.width = 9000; c.height = 7000; // 63 MP
    const x = c.getContext("2d"); x.fillStyle = "#808080"; x.fillRect(0, 0, 9000, 7000);
    const big = await F.toBlob(c, "image/jpeg", 0.5);
    c.width = c.height = 0;
    const toasts = [];
    const prevToast = window.showToast;
    window.showToast = (m) => { toasts.push(String(m)); };
    let frac = 1;
    // Touched (one display px off the right edge), so it is baked: the
    // width is that share of the 8192 px the original was decoded at.
    const r = await F.run(big, "slab_obverse", (s) => { s.box.right -= 1; frac = (s.dispW - 1) / s.dispW; });
    window.showToast = prevToast;
    const info = __getLastBgCropResultForTest();
    const d = await F.dims(r.entry.blob);
    return { d, safety: info.safetyScaled, toasts, wantW: Math.round(8192 * frac), wantH: Math.round(7000 * 8192 / 9000) };
  });
  ok("H1 a 63 MP photo is decoded at 8192 px on its long edge (9000 x 7000 -> 8192 x 6372, less the one px trimmed): " + JSON.stringify(H),
    H.safety && Math.abs(H.d.w - H.wantW) <= 2 && Math.abs(H.d.h - H.wantH) <= 2, H);
  ok("H2 ... and says so: " + JSON.stringify(H.toasts), H.toasts.some(t => /over 60 MP/.test(t) && /8192/.test(t)), H);

  // ---------- I. About's Save steps name each upload's size ---------------
  const I = await page.evaluate(() => {
    const b = new Blob([new Uint8Array(2.5 * 1024 * 1024)]);
    return { up: describeGraphCall("uploadFile", ["CoinCollection/_Testing/CoinPhotos/AY-00002_slab_obverse.jpg", b, NO_OVERWRITE]),
      small: describeGraphCall("uploadFile", ["x/AY-00002_obverse_cropped.jpg", new Blob([new Uint8Array(300 * 1024)])]),
      patch: describeGraphCall("patchWorkbookRanges", [writePaths().workbook, "All", [{}, {}]]) };
  });
  ok("I1 an upload's Save step names its size: " + I.up + " / " + I.small, /AY-00002_slab_obverse\.jpg 2\.50 MB$/.test(I.up) && / 300 KB$/.test(I.small), I);
  ok("I2 a workbook step is described as before: " + I.patch, I.patch === "patchWorkbookRanges All 2 ranges", I);
});
