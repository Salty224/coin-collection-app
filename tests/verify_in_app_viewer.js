// In-app media viewer (claude/in-app-image-viewer). Ray's three asks:
//   1. a coin's receipt opens inside the app, full screen, view only — not
//      the OneDrive link that fails in the OneDrive app;
//   2. the coin page shows all of the coin's photos (obverse, reverse, slab,
//      reference) as thumbnails without going into Edit, each opening the
//      same viewer on that one photo;
//   3. Close, Escape and the phone's back button all close the viewer, and
//      back does NOT leave the page.
// Display only: a Graph-write spy wraps every write method of the mock
// client (and every non-GET fetch) for the whole suite and must stay at zero.
// Coins only — a Set keeps its old strip, viewer panel and receipt link.

const { defineSuite, APP_URL } = require("./harness");

module.exports = defineSuite("in-app-viewer", async ({ ok, openApp, PHONE, TABLET }) => {
  const page = await openApp(PHONE);

  // ---------- Setup: live mode, synthetic coins, mock Graph + write spy --
  // A function so the suite can re-run it if a reverted negative control
  // lets the back button leave the page (B9), instead of throwing.
  const setup = async (page) => {
  await page.evaluate(async () => {
    const base = FAKE_COINS.find(c => c.id === "AY-00003");
    const mk = (id, extra) => Object.assign({}, base, {
      id, name: "Test Coin " + id, obversePhotoFile: "", reversePhotoFile: "", receiptFile: "" }, extra || {});
    window.__COINS = [
      mk("AY-00001"),                                  // collides with a demo gallery key on purpose
      mk("AY-90502", { reversePhotoFile: "AY-90502_reverse.jpg" }), // legacy column only
      mk("AY-90503"),                                  // no photos at all
      mk("AY-90510", { receiptFile: "Binder" }),
      Object.assign({}, FAKE_COINS.find(c => c.id === "AY-00018"), { id: "AY-90520", receiptFile: "" })
    ];
    __setLiveDataModeForTest("live");
    __setLiveCoinsForTest(window.__COINS.map(c => Object.assign({}, c)));
    __setStoredPhotosForTest({
      "AY-00001": [
        { photoId: "PH-1", photoType: "Reference", galleryType: "reference", subGroupId: "", filename: "AY-00001_reference_01.jpg", originalFilename: "", label: "Auction lot" },
        { photoId: "PH-2", photoType: "Slab_Obverse", galleryType: "slab_obverse", subGroupId: "", filename: "AY-00001_slab_obverse.jpg", originalFilename: "", label: "" },
        { photoId: "PH-3", photoType: "Reverse", galleryType: "reverse", subGroupId: "", filename: "AY-00001_reverse_cropped.jpg", originalFilename: "", label: "" },
        { photoId: "PH-4", photoType: "Obverse", galleryType: "obverse", subGroupId: "", filename: "AY-00001_obverse_cropped.jpg", originalFilename: "", label: "" }
      ],
      "AY-90520": [
        { photoId: "PH-9", photoType: "OGP_Obverse", galleryType: "ogp_obverse", subGroupId: "", filename: "AY-90520_ogp_obverse.jpg", originalFilename: "", label: "" }
      ]
    });
    __setStoredReceiptsForTest({});
    // Cached thumbnails for three of AY-00001's four photos; the slab one is
    // left uncached so the viewer has to go through ensureCoinPhotoFetch().
    // Real blob URLs (a fake "blob:..." string is a console error).
    const tiny = async (color) => {
      const c = document.createElement("canvas"); c.width = 4; c.height = 4;
      const x = c.getContext("2d"); x.fillStyle = color; x.fillRect(0, 0, 4, 4);
      return URL.createObjectURL(await new Promise(r => c.toBlob(r, "image/png")));
    };
    window.__URLS = { obv: await tiny("#c0c0c0"), rev: await tiny("#808080"), ref: await tiny("#404040") };
    __setCoinPhotoCacheForTest("AY-00001_obverse_cropped.jpg", window.__URLS.obv);
    __setCoinPhotoCacheForTest("AY-00001_reverse_cropped.jpg", window.__URLS.rev);
    __setCoinPhotoCacheForTest("AY-00001_reference_01.jpg", window.__URLS.ref);
    // The splash is irrelevant here; get it out of the way of real clicks.
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";

    // Mock Graph client + write spy.
    const g = createMockGraphClient({});
    window.__WRITES = [];
    ["uploadFile", "uploadBytes", "uploadJson", "putContent", "patchWorkbookRanges", "addTableRow", "deleteItem"].forEach(m => {
      const orig = g[m].bind(g);
      g[m] = function () { if (!window.__SEEDING) window.__WRITES.push(m); return orig.apply(null, arguments); };
    });
    const realFetch = window.fetch.bind(window);
    window.fetch = function (url, opts) {
      const method = String((opts && opts.method) || "GET").toUpperCase();
      if (method !== "GET") window.__WRITES.push("fetch:" + method + " " + url);
      return realFetch(url, opts);
    };
    __setGraphClientForTest(g);
    window.__G = g;
  });

  // Receipt fixtures, built through the app's OWN PDF writer so tier 2 is
  // exercised against exactly the bytes a real capture would store.
  await page.evaluate(async () => {
    window.__SEEDING = true;
    function mk(type) {
      const c = document.createElement("canvas"); c.width = 40; c.height = 20;
      const x = c.getContext("2d");
      x.fillStyle = "#0000ff"; x.fillRect(0, 0, 40, 20);
      x.fillStyle = "#ff0000"; x.fillRect(0, 0, 20, 10); // red marks the TOP-LEFT quadrant
      return new Promise(r => c.toBlob(r, type, 0.95));
    }
    // An EXIF APP1 segment with Orientation=6 (90° clockwise), inserted
    // after SOI — what a phone camera writes for a portrait shot.
    function withExif(jpg, orient) {
      const exif = new Uint8Array([0x45,0x78,0x69,0x66,0,0, 0x49,0x49,0x2A,0,8,0,0,0, 1,0,
        0x12,0x01,3,0,1,0,0,0,orient,0,0,0, 0,0,0,0]);
      const len = exif.length + 2;
      const o = new Uint8Array(jpg.length + 4 + exif.length);
      o.set(jpg.slice(0, 2), 0); o.set([0xFF, 0xE1, len >> 8, len & 255], 2);
      o.set(exif, 6); o.set(jpg.slice(2), 6 + exif.length);
      return o;
    }
    const jpg = new Uint8Array(await (await mk("image/jpeg")).arrayBuffer());
    const pdfRot = new Uint8Array(await (await wrapImageFileAsPdf(new File([withExif(jpg, 6)], "r.jpg", { type: "image/jpeg" }))).arrayBuffer());
    const pdfFlat = new Uint8Array(await (await wrapImageFileAsPdf(new File([jpg], "f.jpg", { type: "image/jpeg" }))).arrayBuffer());
    const pdfPng = new Uint8Array(await (await wrapImageFileAsPdf(new File([await mk("image/png")], "p.png", { type: "image/png" }))).arrayBuffer());
    const external = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF");
    const base = writePaths().coinReceipts;
    const put = (n, b) => window.__G.uploadBytes(base + "/" + n, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    await put("rot.pdf", pdfRot);
    await put("flat.pdf", pdfFlat);
    await put("png.pdf", pdfPng);
    await put("FindersKeepers_2026-06-27_receipt.pdf", external);
    await put("photo.jpg", jpg);
    window.__PDFROT_HAS_ROTATE = new TextDecoder("latin1").decode(pdfRot).includes("/Rotate 90");
    window.__SEEDING = false;
  });
  };
  await setup(page);

  const openCoin = (id) => page.evaluate((id) => {
    navigate("browse");
    showBrowseDetail(activeCoins().find(c => c.id === id));
  }, id);
  const viewerState = () => page.evaluate(() => {
    const ov = document.getElementById("mediaViewerOverlay");
    const st = document.getElementById("mediaViewerStage");
    return {
      open: !ov.classList.contains("hidden"),
      title: document.getElementById("mediaViewerTitle").textContent,
      footer: document.getElementById("mediaViewerFooter").textContent,
      stageText: st.textContent.trim(),
      imgSrc: st.querySelector("img") ? st.querySelector("img").getAttribute("src") : null,
      canvas: !!st.querySelector("canvas"),
      historyState: history.state
    };
  });
  const wait = (ms) => page.waitForTimeout(ms);
  // Null-safe click: a reverted negative control can remove an element or
  // leave the viewer covering the page; the suite must then FAIL BY NAME on
  // the assertions that check it, never throw and skip the rest.
  const clickSafe = (sel) => page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.click();
    return !!el;
  }, sel);
  let urls = await page.evaluate(() => window.__URLS);

  // ---------- A. Thumbnails on the coin page ----------------------------
  await openCoin("AY-00001");
  const A = await page.evaluate(() => {
    const strip = document.getElementById("detailPhotoStrip");
    const header = [...document.querySelectorAll("#detailAccordions .accordion-header")]
      .find(h => h.textContent.includes("Photos"));
    return {
      types: strip ? [...strip.querySelectorAll(".gc-thumb")].map(t => t.dataset.photoType) : null,
      buttons: strip ? [...strip.querySelectorAll(".gc-thumb")].every(t => t.tagName === "BUTTON") : false,
      open: header ? header.getAttribute("aria-expanded") === "true" : null,
      demoLeak: galleryFor("AY-00001").some(e => e.demoSeed)
    };
  });
  ok(JSON.stringify(A.types) === JSON.stringify(["obverse", "reverse", "slab_obverse", "reference"]),
    "A1 a coin's Photos section lists obverse, reverse, slab and reference — faces first (got " + JSON.stringify(A.types) + ")");
  ok(A.open === true, "A2 the Photos section is open by default when the coin has photos");
  ok(A.buttons === true, "A3 every coin thumbnail is a real button");
  ok(A.demoLeak === false && A.types && A.types.indexOf("coa") === -1,
    "A4 in a live session no demo gallery entry shows, even on a coin whose id collides with a demo key");

  await openCoin("AY-90502");
  const A5 = await page.evaluate(() => {
    const strip = document.getElementById("detailPhotoStrip");
    return strip ? [...strip.querySelectorAll(".gc-thumb")].map(t => t.dataset.photoType) : null;
  });
  ok(JSON.stringify(A5) === JSON.stringify(["reverse"]), "A5 a reverse recorded only in the legacy All.Reverse column still shows");

  await openCoin("AY-90503");
  const A6 = await page.evaluate(() => ({
    strip: !!document.getElementById("detailPhotoStrip"),
    photosHeader: [...document.querySelectorAll("#detailAccordions .accordion-header")].some(h => h.textContent.includes("Photos"))
  }));
  ok(A6.strip === false && A6.photosHeader === false, "A6 a coin with no photos gets no Photos section at all");

  // ---------- B. A thumbnail opens THAT photo full screen ----------------
  await openCoin("AY-00001");
  const histBefore = await page.evaluate(() => history.length);
  await clickSafe('#detailPhotoStrip .gc-thumb[data-photo-type="reverse"]');
  await wait(150);
  const B1 = await viewerState();
  ok(B1.open === true && B1.imgSrc === urls.rev, "B1 tapping the reverse thumbnail shows the reverse photo itself, full screen");
  ok(/Reverse/.test(B1.footer) && /Test Coin AY-00001/.test(B1.title), "B2 the viewer names the coin and which photo it is");
  ok(B1.historyState && B1.historyState.mediaViewer === true, "B3 opening the viewer adds one history entry");

  // View only: nothing that edits, deletes or captures.
  const B4 = await page.evaluate(() => {
    const ov = document.getElementById("mediaViewerOverlay");
    const buttons = [...ov.querySelectorAll("button")];
    return {
      inputs: ov.querySelectorAll("input, select, textarea").length,
      buttonIds: buttons.map(b => b.id),
      forbidden: /remove|delete|replace|adjust|edit|capture|camera|library|trash/i.test(ov.innerText + " " + buttons.map(b => b.getAttribute("aria-label") || "").join(" "))
    };
  });
  ok(B4.inputs === 0, "B4 the viewer contains no inputs (no capture, no file picker)");
  ok(JSON.stringify(B4.buttonIds) === JSON.stringify(["mediaViewerCloseBtn"]) && B4.forbidden === false,
    "B5 its only control is Close — no edit, delete, replace, adjust or capture");

  // Close button: closes, and gives the history entry back.
  await clickSafe("#mediaViewerCloseBtn");
  await wait(250);
  const B6 = await viewerState();
  const histAfterClose = await page.evaluate(() => history.length);
  ok(B6.open === false && !(B6.historyState && B6.historyState.mediaViewer),
    "B6 Close hides the viewer and steps back out of its history entry");

  // The phone back button.
  const urlBefore = page.url();
  await clickSafe('#detailPhotoStrip .gc-thumb[data-photo-type="obverse"]');
  await wait(150);
  ok((await viewerState()).imgSrc === urls.obv, "B7 the obverse thumbnail opens the obverse photo");
  await page.goBack({ waitUntil: "commit", timeout: 3000 }).catch(() => null);
  await wait(250);
  const B8 = await page.evaluate(() => {
    const ov = document.getElementById("mediaViewerOverlay");
    const vb = document.getElementById("view-browse");
    return {
      open: ov ? !ov.classList.contains("hidden") : null,
      onBrowse: !!vb && vb.classList.contains("active"),
      detailShown: !!document.getElementById("detailPhotoStrip")
    };
  }).catch(() => ({ open: null, onBrowse: false, detailShown: false }));
  ok(B8.open === false, "B8 the back button closes the viewer");
  const stayed = page.url() === urlBefore && B8.onBrowse && B8.detailShown;
  ok(stayed, "B9 and stays on the same coin page instead of leaving it");
  if (!stayed) {
    // Back left the app (B9 has already failed by name). Reopen it and redo
    // the setup so every later assertion still runs and reports.
    await page.goto(APP_URL, { waitUntil: "load" });
    await page.waitForTimeout(600);
    await setup(page);
    urls = await page.evaluate(() => window.__URLS);
    await openCoin("AY-00001");
  }

  // Escape.
  await clickSafe('#detailPhotoStrip .gc-thumb[data-photo-type="reference"]');
  await wait(150);
  const B10 = await viewerState();
  ok(B10.imgSrc === urls.ref && /Auction lot/.test(B10.footer), "B10 a reference photo opens with its own label");
  await page.keyboard.press("Escape");
  await wait(250);
  ok((await viewerState()).open === false, "B11 Escape closes the viewer");
  const histEnd = await page.evaluate(() => history.length);
  ok(histEnd <= histBefore + 1 && histAfterClose <= histBefore + 1,
    "B12 opening and closing several times leaves no pile-up of history entries");

  // An uncached stored photo goes through the existing CoinPhotos read;
  // with no token here it reports, rather than showing a wrong image.
  await clickSafe('#detailPhotoStrip .gc-thumb[data-photo-type="slab_obverse"]');
  await wait(400);
  const B13 = await viewerState();
  ok(B13.open && B13.imgSrc === null && /couldn't be loaded/.test(B13.stageText),
    "B13 a photo whose file can't be fetched says so instead of showing another image");
  await clickSafe("#mediaViewerCloseBtn");
  await wait(200);

  // ---------- C. Receipts --------------------------------------------------
  const openReceiptFor = async (filename) => {
    await page.evaluate((f) => { __setStoredReceiptsForTest({ "AY-00001": { receiptId: "RC-T", filename: f } }); }, filename);
    await openCoin("AY-00001");
    await page.evaluate(() => {
      const h = [...document.querySelectorAll("#detailAccordions .accordion-header")].find(x => x.textContent.includes("Purchase"));
      if (h && h.getAttribute("aria-expanded") !== "true") h.click();
    });
    const isButton = await page.evaluate(() => {
      const el = document.getElementById("detailReceiptLink");
      return !!el && el.tagName === "BUTTON";
    });
    if (isButton) await clickSafe("#detailReceiptLink");
    await wait(700);
    return isButton;
  };
  const pix = () => page.evaluate(() => {
    const c = document.querySelector("#mediaViewerStage canvas");
    if (!c) return null;
    const px = (x, y) => Array.from(c.getContext("2d").getImageData(x, y, 1, 1).data.slice(0, 3));
    return { w: c.width, h: c.height, tl: px(2, 2), tr: px(c.width - 3, 2) };
  });
  const isRed = p => p && p[0] > 180 && p[1] < 80 && p[2] < 80;
  const isBlue = p => p && p[2] > 180 && p[0] < 80 && p[1] < 80;

  const c1 = await openReceiptFor("photo.jpg");
  const C1 = await viewerState();
  ok(c1 === true, "C1 a coin's Receipt row is a button, not the OneDrive link");
  ok(C1.open && C1.imgSrc && C1.imgSrc.startsWith("blob:") && /^Receipt/.test(C1.title),
    "C2 an image receipt opens inside the app as an image");
  ok(/Open in OneDrive/.test(C1.footer), "C3 a small Open in OneDrive link lives inside the receipt viewer");
  await clickSafe("#mediaViewerCloseBtn"); await wait(200);

  await openReceiptFor("flat.pdf");
  const C4 = await pix();
  ok(C4 && C4.w === 40 && C4.h === 20 && isRed(C4.tl) && isBlue(C4.tr),
    "C4 a PDF this app made is unwrapped to its embedded JPEG and shown (got " + JSON.stringify(C4) + ")");
  await clickSafe("#mediaViewerCloseBtn"); await wait(200);

  await openReceiptFor("rot.pdf");
  const C5 = await pix();
  const rotHas = await page.evaluate(() => window.__PDFROT_HAS_ROTATE);
  ok(rotHas === true && C5 && C5.w === 20 && C5.h === 40 && isBlue(C5.tl) && isRed(C5.tr),
    "C5 its /Rotate 90 is honoured exactly once — top-left red turns to top-right (got " + JSON.stringify(C5) + ")");
  await clickSafe("#mediaViewerCloseBtn"); await wait(200);

  await openReceiptFor("png.pdf");
  const C6 = await pix();
  ok(C6 && C6.w === 40 && C6.h === 20 && isRed(C6.tl) && isBlue(C6.tr),
    "C6 a wrapped PNG receipt is inflated with DecompressionStream and shown (got " + JSON.stringify(C6) + ")");
  await clickSafe("#mediaViewerCloseBtn"); await wait(200);

  await openReceiptFor("FindersKeepers_2026-06-27_receipt.pdf");
  const C7 = await viewerState();
  const C7b = await page.evaluate(() => {
    const a = document.getElementById("mediaViewerOpenFile");
    return a ? { tag: a.tagName, download: a.getAttribute("download"), href: a.getAttribute("href") } : null;
  });
  ok(/This PDF can't be displayed inside the app\./.test(C7.stageText) && /FindersKeepers_2026-06-27_receipt\.pdf/.test(C7.stageText) && !C7.canvas,
    "C7 any other PDF says it can't be displayed here, naming the file");
  ok(C7b && C7b.tag === "A" && C7b.download === "FindersKeepers_2026-06-27_receipt.pdf" && /^blob:/.test(C7b.href),
    "C8 with an Open file button that hands over the file's own bytes");
  await clickSafe("#mediaViewerCloseBtn"); await wait(200);

  await openReceiptFor("missing.pdf");
  const C9 = await viewerState();
  ok(/wasn't found/.test(C9.stageText), "C9 a receipt recorded but not in OneDrive says so");
  await clickSafe("#mediaViewerCloseBtn"); await wait(200);

  await page.evaluate(() => __setStoredReceiptsForTest({}));
  await openCoin("AY-90510");
  const C10 = await page.evaluate(() => {
    const html = document.getElementById("detailAccordions").innerHTML;
    return { el: !!document.getElementById("detailReceiptLink"), notScanned: html.includes("Binder (not scanned)"), btn: /<button[^>]*>Binder/.test(html) };
  });
  ok(C10.el === false && C10.notScanned && !C10.btn, "C10 \"Binder (not scanned)\" stays plain, untappable text");

  // ---------- D. Sets are deliberately unchanged ----------------------------
  await page.evaluate(() => __setStoredReceiptsForTest({ "AY-90520": { receiptId: "RC-S", filename: "photo.jpg" } }));
  await openCoin("AY-90520");
  const D = await page.evaluate(() => {
    const header = [...document.querySelectorAll("#detailAccordions .accordion-header")].find(h => h.textContent.includes("Photos"));
    const thumb = document.querySelector("#detailPhotoStrip .gc-thumb");
    const receipt = document.getElementById("detailReceiptLink");
    return { open: header ? header.getAttribute("aria-expanded") : null, tag: thumb ? thumb.tagName : null, receiptTag: receipt ? receipt.tagName : null };
  });
  ok(D.open === "false" && D.tag === "DIV", "D1 a Set's Photos section keeps its old collapsed strip");
  ok(D.receiptTag === "SPAN", "D2 a Set's receipt keeps its old filename-to-link behaviour");
  await page.evaluate(() => { document.querySelector("#detailPhotoStrip .gc-thumb").click(); });
  await wait(150);
  const D3 = await page.evaluate(() => ({
    panel: !document.getElementById("galleryViewerOverlay").classList.contains("hidden"),
    viewer: !document.getElementById("mediaViewerOverlay").classList.contains("hidden")
  }));
  ok(D3.panel === true && D3.viewer === false, "D3 a Set's thumbnail still opens openGalleryViewer(), not the new viewer");
  await page.evaluate(() => closeGalleryViewer());

  // ---------- E. Display only ----------------------------------------------
  const E = await page.evaluate(() => window.__WRITES.slice());
  ok(E.length === 0, "E1 nothing above wrote anything — no Graph write call, no non-GET fetch (got " + JSON.stringify(E) + ")");

  // ---------- F. Layout at phone and tablet --------------------------------
  const layout = async (pg) => pg.evaluate(async () => {
    openReceiptInViewer(activeCoins().find(c => c.id === "AY-00001"), "rot.pdf");
    await new Promise(r => setTimeout(r, 700));
    const ov = document.getElementById("mediaViewerOverlay").getBoundingClientRect();
    const close = document.getElementById("mediaViewerCloseBtn").getBoundingClientRect();
    const stage = document.getElementById("mediaViewerStage").getBoundingClientRect();
    const media = document.querySelector("#mediaViewerStage canvas, #mediaViewerStage img");
    const m = media ? media.getBoundingClientRect() : null;
    const out = {
      covers: Math.round(ov.width) === window.innerWidth && Math.round(ov.height) === window.innerHeight,
      closeVisible: close.top >= 0 && close.bottom <= window.innerHeight && close.right <= window.innerWidth && close.width >= 36,
      mediaFits: !!m && m.right <= stage.right + 1 && m.bottom <= stage.bottom + 1 && m.left >= stage.left - 1,
      noOverflow: document.documentElement.scrollWidth <= window.innerWidth
    };
    closeMediaViewer();
    return out;
  });
  const FP = await layout(page);
  ok(FP.covers && FP.closeVisible && FP.mediaFits && FP.noOverflow,
    "F1 phone: the viewer fills the screen, Close is on screen and the receipt fits (got " + JSON.stringify(FP) + ")");

  const tablet = await openApp(TABLET);
  await tablet.evaluate(async () => {
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setLiveDataModeForTest("live");
    __setLiveCoinsForTest([Object.assign({}, FAKE_COINS.find(c => c.id === "AY-00001"))]);
    const g = createMockGraphClient({});
    __setGraphClientForTest(g);
    const c = document.createElement("canvas"); c.width = 40; c.height = 20;
    c.getContext("2d").fillRect(0, 0, 40, 20);
    const jpg = new Uint8Array(await (await new Promise(r => c.toBlob(r, "image/jpeg", 0.9))).arrayBuffer());
    const pdf = new Uint8Array(await (await wrapImageFileAsPdf(new File([jpg], "r.jpg", { type: "image/jpeg" }))).arrayBuffer());
    await g.uploadBytes(writePaths().coinReceipts + "/rot.pdf", pdf.buffer);
  });
  const FT = await layout(tablet);
  ok(FT.covers && FT.closeVisible && FT.mediaFits && FT.noOverflow,
    "F2 tablet: the same holds (got " + JSON.stringify(FT) + ")");
}, module);
