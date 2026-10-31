// Receipt PDFs the app did not make, rendered in-app with pdf.js
// (vendor/pdfjs/, pinned 6.3.289 legacy build).
//
// SERVED MODE. Every other suite opens app.html from file://, where Chromium
// blocks module scripts and module workers — so pdf.js cannot load there and
// the viewer correctly falls back. This suite serves the repo over a local
// http server instead, so the REAL pdf.js renders the committed fixture PDFs
// headless. Every non-local request (Graph, sign-in, the MSAL CDN) is
// aborted, and OneDrive is the usual mock client.
//
// Display only: a Graph-write spy wraps every write method of the mock and
// every non-GET fetch, and must stay at zero.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { defineSuite } = require("./harness");

const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript",
  ".json": "application/json", ".wasm": "application/wasm", ".pdf": "application/pdf" };

function startServer() {
  const requests = [];
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]);
    requests.push(rel);
    const file = path.join(ROOT, rel);
    if (file.indexOf(ROOT) === 0 && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      res.end(fs.readFileSync(file));
    } else { res.writeHead(404); res.end(); }
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve({ server, requests, port: server.address().port })));
}

module.exports = defineSuite("pdf-receipt-viewer", async ({ ok, openApp, PHONE }) => {
  const srv = await startServer();
  try {
    const page = await openApp(PHONE);
    await page.route("**/*", route => route.request().url().startsWith("http://127.0.0.1:" + srv.port + "/")
      ? route.continue() : route.abort());
    srv.requests.length = 0;
    await page.goto("http://127.0.0.1:" + srv.port + "/app.html", { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const vendorRequests = () => srv.requests.filter(r => r.indexOf("/vendor/") === 0);

    // ---------- S. Never loaded at startup -----------------------------
    const S = await page.evaluate(() => __pdfjsImportAttemptsForTest());
    ok(vendorRequests().length === 0, "S1 nothing under vendor/ is requested at startup");
    ok(S === 0, "S2 pdf.js is not imported at startup");

    // ---------- Setup: live coins, receipts, mock Graph + write spy ------
    const fixture = (n) => [...fs.readFileSync(path.join(__dirname, "fixtures", n))];
    await page.evaluate(async (fx) => {
      const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
      const base = FAKE_COINS.find(c => c.id === "AY-00003");
      const mk = (id, receipt) => Object.assign({}, base, { id, name: "Test Coin " + id,
        obversePhotoFile: "", reversePhotoFile: "", receiptFile: receipt });
      __setLiveDataModeForTest("live");
      __setLiveCoinsForTest([
        mk("AY-90601", "Seller_invoice_3page.pdf"),
        mk("AY-90602", "AY-90602_receipt.pdf"),     // app-made
        mk("AY-90603", "Seller_onepage.pdf"),
        mk("AY-90604", "Broken.pdf")
      ]);
      __setStoredPhotosForTest({});
      // The receipts are Receipts rows: since the receipts and photos
      // alignment (Build 1) the old All.Receipt column (receiptFile) is not read.
      __setStoredReceiptsForTest({
        "AY-90601": { receiptId: "RC-90601", filename: "Seller_invoice_3page.pdf" },
        "AY-90602": { receiptId: "RC-90602", filename: "AY-90602_receipt.pdf" },
        "AY-90603": { receiptId: "RC-90603", filename: "Seller_onepage.pdf" },
        "AY-90604": { receiptId: "RC-90604", filename: "Broken.pdf" }
      });
      const g = createMockGraphClient({});
      window.__WRITES = [];
      window.__SEEDING = true;
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
      const put = (n, bytes) => g.uploadBytes(writePaths().coinReceipts + "/" + n, new Uint8Array(bytes).buffer);
      await put("Seller_invoice_3page.pdf", fx.three);
      await put("Seller_onepage.pdf", fx.one);
      await put("Broken.pdf", [...new TextEncoder().encode("%PDF-1.7\nthis is not a real pdf\n%%EOF")]);
      // An app-made receipt, built by the app's own PDF writer.
      const c = document.createElement("canvas"); c.width = 40; c.height = 20;
      const x = c.getContext("2d"); x.fillStyle = "#0000ff"; x.fillRect(0, 0, 40, 20);
      const jpg = await new Promise(r => c.toBlob(r, "image/jpeg", 0.95));
      const pdf = await wrapImageFileAsPdf(new File([jpg], "r.jpg", { type: "image/jpeg" }));
      await put("AY-90602_receipt.pdf", [...new Uint8Array(await pdf.arrayBuffer())]);
      window.__SEEDING = false;
      window.__coin = (id) => activeCoins().find(c => c.id === id);
      window.__sleep = (ms) => new Promise(r => setTimeout(r, ms));
      // Waits for the viewer to settle: a pdf viewer with drawn pages, or a message.
      window.__settle = async (wantPdf) => {
        for (let i = 0; i < 150; i++) {
          const st = __pdfViewerStateForTest();
          const stage = document.getElementById("mediaViewerStage");
          if (wantPdf && st && st.drawn.length && !document.querySelector("#mediaViewerPdf .pdfv-page:empty ~ x")) {
            await window.__sleep(150); return;
          }
          if (!wantPdf && stage && !/Loading/.test(stage.textContent) && (stage.querySelector(".mv-message, canvas, img"))) {
            await window.__sleep(150); return;
          }
          await window.__sleep(50);
        }
      };
      // Finds whether a canvas contains a pixel of roughly the given colour.
      window.__hasColour = (canvas, want) => {
        if (!canvas) return false;
        const d = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 0; i < d.length; i += 16) {
          if (Math.abs(d[i] - want[0]) < 60 && Math.abs(d[i + 1] - want[1]) < 60 && Math.abs(d[i + 2] - want[2]) < 60) return true;
        }
        return false;
      };
      window.__pageCanvas = (n) => document.querySelector('#mediaViewerPdf .pdfv-page[data-page="' + n + '"] canvas');
      window.__viewerText = () => document.getElementById("mediaViewerStage").textContent;
    }, { three: fixture("receipt-3page.pdf"), one: fixture("receipt-1page.pdf") });

    // ---------- A. App-made PDFs stay on the fast unwrap path ------------
    const A = await page.evaluate(async () => {
      openReceiptInViewer(window.__coin("AY-90602"), "AY-90602_receipt.pdf");
      await window.__settle(false);
      const out = {
        unwrapCanvas: !!document.getElementById("mediaViewerReceiptCanvas"),
        pdfViewer: !!document.getElementById("mediaViewerPdf"),
        imports: __pdfjsImportAttemptsForTest()
      };
      closeMediaViewer(); await window.__sleep(100);
      return out;
    });
    ok(A.unwrapCanvas, "A1 an app-made receipt PDF still shows through the fast unwrap path");
    ok(!A.pdfViewer, "A2 and never through the pdf.js viewer");
    ok(A.imports === 0 && vendorRequests().length === 0, "A3 opening it does not load pdf.js");

    // ---------- E. Early start from the coin page -----------------------
    const E1 = await page.evaluate(async () => {
      navigate("browse"); showBrowseDetail(window.__coin("AY-90602"));
      await window.__sleep(300);
      return __pdfjsImportAttemptsForTest();
    });
    ok(E1 === 0, "E1 a coin page whose receipt is app-made does not start loading pdf.js");
    const E2 = await page.evaluate(async () => {
      showBrowseDetail(window.__coin("AY-90601"));
      await window.__sleep(800);
      return { imports: __pdfjsImportAttemptsForTest(), viewerOpen: mediaViewerIsOpen() };
    });
    ok(E2.imports === 1 && !E2.viewerOpen, "E2 a coin page whose receipt is another PDF starts loading pdf.js before it's tapped");
    ok(vendorRequests().indexOf("/vendor/pdfjs/pdf.min.mjs") !== -1, "E3 the library is fetched from vendor/pdfjs/ on this site");
    ok(srv.requests.every(r => r.indexOf("http") !== 0), "E4 nothing is fetched from another host");

    // ---------- R. A 3-page PDF renders ---------------------------------
    const R = await page.evaluate(async () => {
      document.getElementById("detailReceiptLink").click();
      await window.__settle(true);
      const st = __pdfViewerStateForTest();
      const scroll = document.getElementById("pdfScroll");
      const p1 = document.querySelector('#mediaViewerPdf .pdfv-page[data-page="1"]');
      const out = {
        viewer: !!document.getElementById("mediaViewerPdf"),
        count: st && st.count,
        drawnFirst: st ? st.drawn.slice() : [],
        red1: window.__hasColour(window.__pageCanvas(1), [255, 0, 0]),
        green2: window.__hasColour(window.__pageCanvas(2), [0, 153, 0]),
        fitWidth: !!(p1 && scroll) && Math.abs(p1.getBoundingClientRect().width - (scroll.clientWidth - 16)) <= 1,
        fallback: /can't be displayed/.test(window.__viewerText()),
        footer: document.getElementById("mediaViewerFooter").textContent
      };
      if (!scroll) { out.drawnBottom = []; out.blue3 = false; return out; }
      scroll.scrollTop = scroll.scrollHeight;
      await window.__sleep(200); await window.__settle(true); await window.__sleep(300);
      const st2 = __pdfViewerStateForTest();
      out.drawnBottom = st2 ? st2.drawn.slice() : [];
      out.blue3 = window.__hasColour(window.__pageCanvas(3), [0, 0, 255]);
      out.red1AfterScroll = window.__hasColour(window.__pageCanvas(1), [255, 0, 0]);
      return out;
    });
    ok(R.viewer && !R.fallback, "R1 a seller's PDF renders in the app instead of 'can't be displayed'");
    ok(R.count === 3, "R2 all three pages are laid out", R.count);
    ok(R.red1, "R3 page 1 is drawn with its real content (red block)");
    ok(R.green2, "R4 page 2 is drawn with its real content (green block)");
    // (Lazy release of far pages is proven at 300% zoom in Z5, where page 3
    // is genuinely far from the view; at 100% all three short pages sit
    // within the draw window.)
    ok(R.drawnFirst.indexOf(1) !== -1 && R.drawnFirst.indexOf(2) !== -1, "R5 the pages in and near the view are drawn on open", R.drawnFirst);
    ok(R.drawnBottom.indexOf(3) !== -1 && R.blue3, "R6 scrolling down draws page 3 (blue block)", R.drawnBottom);
    ok(R.fitWidth, "R7 pages are fitted to the viewer width");
    ok(/Seller_invoice_3page\.pdf/.test(R.footer), "R8 the footer still names the file");

    // ---------- C. Page counter and step buttons ------------------------
    const C = await page.evaluate(async () => {
      const scroll = document.getElementById("pdfScroll");
      if (!scroll || !document.getElementById("pdfPageCounter")) {
        const none = { counter: "(no viewer)", prev: null, next: null };
        return { atTop: none, after1: none, after2: none, after3: none, back: none, scrolledTop: none };
      }
      const ui = () => ({
        counter: document.getElementById("pdfPageCounter").textContent,
        prev: document.getElementById("pdfPrevPage").disabled,
        next: document.getElementById("pdfNextPage").disabled
      });
      const tick = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 80)));
      scroll.scrollTop = 0; await tick();
      const atTop = ui();
      document.getElementById("pdfNextPage").click(); await tick();
      const after1 = ui();
      document.getElementById("pdfNextPage").click(); await tick();
      const after2 = ui();
      document.getElementById("pdfNextPage").click(); await tick();
      const after3 = ui();
      document.getElementById("pdfPrevPage").click(); await tick();
      const back = ui();
      scroll.scrollTop = 0; await tick();
      const scrolledTop = ui();
      return { atTop, after1, after2, after3, back, scrolledTop };
    });
    ok(C.atTop.counter === "Page 1 of 3", "C1 the counter starts at 'Page 1 of 3'", C.atTop.counter);
    ok(C.atTop.prev === true && C.atTop.next === false, "C2 on page 1, Prev is disabled and Next is enabled", C.atTop);
    ok(C.after1.counter === "Page 2 of 3" && !C.after1.prev && !C.after1.next, "C3 Next goes to page 2; both buttons enabled", C.after1);
    ok(C.after2.counter === "Page 3 of 3", "C4 Next again goes to page 3", C.after2.counter);
    ok(C.after2.next === true && C.after2.prev === false, "C5 on the last page, Next is disabled and Prev is enabled", C.after2);
    ok(C.after3.counter === "Page 3 of 3", "C6 Next on the last page does nothing", C.after3.counter);
    ok(C.back.counter === "Page 2 of 3", "C7 Prev goes back one page", C.back.counter);
    ok(C.scrolledTop.counter === "Page 1 of 3", "C8 the counter follows ordinary scrolling", C.scrolledTop.counter);

    // ---------- Z. Zoom ---------------------------------------------------
    const Z = await page.evaluate(async () => {
      const tick = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 120)));
      const scroll = document.getElementById("pdfScroll");
      if (!scroll || !document.getElementById("pdfZoomIn")) return { missing: true, drawnAt300: [] };
      const width = () => document.querySelector('#mediaViewerPdf .pdfv-page[data-page="1"]').getBoundingClientRect().width;
      const w100 = width();
      const out = { outDisabledAt100: document.getElementById("pdfZoomOut").disabled };
      document.getElementById("pdfNextPage").click(); await tick();
      document.getElementById("pdfZoomIn").click(); await tick(); await window.__settle(true);
      out.label125 = document.getElementById("pdfZoomLabel").textContent;
      out.ratio125 = width() / w100;
      out.stayedOnPage = document.getElementById("pdfPageCounter").textContent;
      for (let i = 0; i < 6; i++) { document.getElementById("pdfZoomIn").click(); await tick(); }
      out.label300 = document.getElementById("pdfZoomLabel").textContent;
      out.inDisabledAt300 = document.getElementById("pdfZoomIn").disabled;
      scroll.scrollTop = 0; await tick(); await window.__settle(true); await window.__sleep(200);
      const st = __pdfViewerStateForTest();
      out.drawnAt300 = st ? st.drawn.slice() : [];
      const c1 = window.__pageCanvas(1);
      out.px = c1 ? c1.width * c1.height : 0;
      // Back to 100% for the rest of the suite.
      for (let i = 0; i < 6; i++) { document.getElementById("pdfZoomOut").click(); await tick(); }
      out.backTo100 = document.getElementById("pdfZoomLabel").textContent;
      return out;
    });
    ok(Z.outDisabledAt100, "Z1 zoom out is disabled at 100%");
    ok(Z.label125 === "125%" && Math.abs(Z.ratio125 - 1.25) < 0.02, "Z2 + zooms to 125% and the page grows to match", Z);
    ok(Z.stayedOnPage === "Page 2 of 3", "Z3 zooming keeps the reader on the same page", Z.stayedOnPage);
    ok(Z.label300 === "300%" && Z.inDisabledAt300, "Z4 zoom stops at 300%, where + is disabled", Z.label300);
    ok(Z.drawnAt300.indexOf(3) === -1 && Z.drawnAt300.indexOf(1) !== -1,
      "Z5 at 300% only pages near the view are drawn; far pages are released", Z.drawnAt300);
    ok(Z.px > 0 && Z.px <= 4000000, "Z6 a page canvas never exceeds the 4-megapixel sharpness cap", Z.px);
    ok(Z.backTo100 === "100%", "Z7 − zooms back down to 100%");

    // ---------- X. Inert by design ---------------------------------------
    const X = await page.evaluate(() => {
      const o = __lastPdfOptionsForTest() || {};
      const root = document.getElementById("mediaViewerPdf");
      return {
        xfa: o.enableXfa, evalOk: o.isEvalSupported,
        sameOrigin: [o.cMapUrl, o.standardFontDataUrl, o.wasmUrl, o.iccUrl].every(u => String(u || "").indexOf(location.origin + "/vendor/pdfjs/") === 0),
        links: root ? root.querySelectorAll("a, .annotationLayer, .linkAnnotation").length : -1
      };
    });
    ok(X.xfa === false && X.evalOk === false, "X1 XFA forms and eval are off for every PDF opened", X);
    ok(!srv.requests.some(r => /pdf\.sandbox/.test(r)), "X2 the PDF scripting sandbox is never requested");
    ok(X.links === 0, "X3 no links or annotation layer inside the rendered pages");
    ok(X.sameOrigin, "X4 fonts, cmaps and decoders all load from vendor/pdfjs/ on this site");

    // ---------- L. Closing releases the document -------------------------
    const L = await page.evaluate(async () => {
      closeMediaViewer(); await window.__sleep(150);
      return { state: __pdfViewerStateForTest(), pdfMode: document.getElementById("mediaViewerStage").classList.contains("pdf-mode"),
               open: mediaViewerIsOpen() };
    });
    ok(!L.open && L.state === null, "L1 closing the viewer destroys the PDF document");
    ok(!L.pdfMode, "L2 and the viewer stage returns to its normal layout");

    // ---------- O. A single-page PDF ---------------------------------------
    const O = await page.evaluate(async () => {
      openReceiptInViewer(window.__coin("AY-90603"), "Seller_onepage.pdf");
      await window.__settle(true);
      const st = __pdfViewerStateForTest();
      const out = {
        count: st && st.count,
        red: window.__hasColour(window.__pageCanvas(1), [255, 0, 0]),
        counter: !!document.getElementById("pdfPageCounter"),
        prev: !!document.getElementById("pdfPrevPage"), next: !!document.getElementById("pdfNextPage"),
        zoom: !!document.getElementById("pdfZoomIn") && !!document.getElementById("pdfZoomOut")
      };
      closeMediaViewer(); await window.__sleep(100);
      return out;
    });
    ok(O.count === 1 && O.red, "O1 a one-page PDF renders", O);
    ok(!O.counter, "O2 a one-page PDF shows no page counter");
    ok(!O.prev && !O.next, "O3 and no Prev / Next buttons");
    ok(O.zoom, "O4 zoom is still offered");

    // ---------- F. Failure falls back to today's message ---------------
    const F = await page.evaluate(async () => {
      const fb = () => ({
        msg: /This PDF can't be displayed inside the app\./.test(window.__viewerText()),
        openFile: !!document.getElementById("mediaViewerOpenFile"),
        pdf: !!document.getElementById("mediaViewerPdf")
      });
      openReceiptInViewer(window.__coin("AY-90604"), "Broken.pdf");
      await window.__settle(false); await window.__sleep(300);
      const broken = fb();
      closeMediaViewer(); await window.__sleep(100);
      // Library unreachable (a fresh load against a path that isn't there).
      __setPdfjsBaseForTest("vendor/missing-pdfjs/");
      openReceiptInViewer(window.__coin("AY-90601"), "Seller_invoice_3page.pdf");
      await window.__settle(false); await window.__sleep(300);
      const noLib = fb();
      closeMediaViewer(); await window.__sleep(100);
      // Restored: the failure was not cached.
      __setPdfjsBaseForTest(null);
      openReceiptInViewer(window.__coin("AY-90601"), "Seller_invoice_3page.pdf");
      await window.__settle(true);
      const restored = !!document.getElementById("mediaViewerPdf");
      closeMediaViewer(); await window.__sleep(100);
      return { broken, noLib, restored };
    });
    ok(F.broken.msg && F.broken.openFile && !F.broken.pdf, "F1 a damaged PDF falls back to 'can't be displayed' with Open file", F.broken);
    ok(F.noLib.msg && F.noLib.openFile && !F.noLib.pdf, "F2 if pdf.js can't load, the same fallback shows", F.noLib);
    ok(F.restored, "F3 a failed load isn't remembered — the next open renders");

    // ---------- W. View only --------------------------------------------
    const W = await page.evaluate(() => window.__WRITES.slice());
    ok(W.length === 0, "W1 no writes of any kind (Graph-write spy clean)", W);

    // ---------- H. Layout -------------------------------------------------
    const H = await page.evaluate(async () => {
      openReceiptInViewer(window.__coin("AY-90601"), "Seller_invoice_3page.pdf");
      await window.__settle(true);
      const barEl = document.querySelector("#mediaViewerPdf .pdfv-bar");
      const out = { overflow: document.documentElement.scrollWidth > window.innerWidth, barH: barEl ? barEl.getBoundingClientRect().height : 999 };
      closeMediaViewer();
      return out;
    });
    ok(!H.overflow, "H1 no horizontal page overflow on a phone");
    ok(H.barH < 60, "H2 the zoom and page controls fit on one row on a phone", H.barH);
  } finally {
    srv.server.close();
  }
}, module);
