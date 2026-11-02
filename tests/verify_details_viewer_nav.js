// Details photo viewer: next / previous (Build B, claude/details-viewer-next-prev).
//
// WHY. The viewer opened from a coin's or Set's Details page showed one photo;
// to see the next one Ray had to close it and tap again. Now the viewer is
// handed the page's photo list and steps through it: footer buttons with a
// "3 / 7" counter, swipe on touch, arrow keys on a keyboard. Stops at both
// ends. Receipts are never in the list. A Set's list is its OWN photos (its
// tiles moved from the old photo-grid panel onto this viewer, Q3). Edit-screen
// viewers are unchanged (Q7). Display only: the write spy must stay at zero.
//
//   A  order = the order the Details page shows (faces first; the child
//      coin's parent-Set COA last, with its footer); the tapped tile is the start
//   B  receipts are not in the list; a receipt opened with the viewer already
//      showing a sequence clears it; Binder
//   C  both ends stop (no wrap); a list of one has no controls
//   D  Previous / Next buttons: counter, disabled at the ends, caption follows
//   E  keyboard arrows (and when they are ignored)
//   F  swipe (and when it is ignored)
//   G  history: stepping adds no entries; one Back closes and the page stays
//   H  slow fetches cannot paint over the current photo; neighbours prefetched
//   I  Set Details: its own photos only, in strip order, no child coins
//   J  a photo that fails to load stays in the sequence
//   K  layout at 360, 412 and 1024 wide
//   L  edit-screen viewers have no next / previous
//   M  nothing wrote anything

const { defineSuite } = require("./harness");

module.exports = defineSuite("details-viewer-nav", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp(PHONE);

  // ---------- Setup ---------------------------------------------------------
  await page.evaluate(async () => {
    const base = FAKE_COINS.find(c => c.id === "AY-00003");
    const setBase = FAKE_COINS.find(c => c.id === "AY-00018");
    const coin = (id, extra) => Object.assign({}, base, {
      id, name: "Test Coin " + id, obversePhotoFile: "", reversePhotoFile: "", receiptFile: "" }, extra || {});
    const aSet = (id, extra) => Object.assign({}, setBase, {
      id, name: "Test Set " + id, denom: "Multiple", receiptFile: "" }, extra || {});
    window.__COINS = [
      coin("AY-90601"), coin("AY-90602"), coin("AY-90603"), coin("AY-90604"), coin("AY-90605"), coin("AY-90606"),
      aSet("AY-90610"), coin("AY-90611", { originSetId: "AY-90610" }), coin("AY-90612", { originSetId: "AY-90610" }),
      aSet("AY-90620")
    ];
    __setLiveDataModeForTest("live");
    __setLiveCoinsForTest(window.__COINS.map(c => Object.assign({}, c)));
    let n = 0;
    const row = (type, gtype, filename, label) => ({
      photoId: "PH-" + (++n), photoType: type, galleryType: gtype, subGroupId: "",
      filename, originalFilename: "", label: label || "" });
    window.__FILES = [];
    const R = (id, list) => list.map(([type, gtype, suffix, label]) => {
      const f = id + suffix; window.__FILES.push(f); return row(type, gtype, f, label);
    });
    __setStoredPhotosForTest({
      // Deliberately NOT in page order, so the order has to come from the page rule.
      "AY-90601": R("AY-90601", [
        ["Other", "other", "_other_01.jpg", "Box"],
        ["Reference", "reference", "_reference_01.jpg", "Lot"],
        ["Slab_Reverse", "slab_reverse", "_slab_reverse.jpg"],
        ["Reverse", "reverse", "_reverse_cropped.jpg"],
        ["OGP", "ogp", "_ogp_01.jpg", "Closed"],
        ["Obverse", "obverse", "_obverse_cropped.jpg"],
        ["Slab_Obverse", "slab_obverse", "_slab_obverse.jpg"],
        ["Reference", "reference", "_reference_02.jpg", "Lot 2"]
      ]),
      "AY-90602": R("AY-90602", [["Reference", "reference", "_reference_01.jpg", "Only one"]]),
      "AY-90603": R("AY-90603", [["Obverse", "obverse", "_obverse_cropped.jpg"], ["Reverse", "reverse", "_reverse_cropped.jpg"]]),
      "AY-90604": R("AY-90604", [["Obverse", "obverse", "_obverse_cropped.jpg"], ["Reverse", "reverse", "_reverse_cropped.jpg"]]),
      // Uncached files: the race test controls when (and whether) they arrive.
      "AY-90605": R("AY-90605", [["Reference", "reference", "_r1.jpg"], ["Reference", "reference", "_r2.jpg"], ["Reference", "reference", "_r3.jpg"]]),
      // Middle photo is never cached and the fetch fails: it stays in the sequence.
      "AY-90606": R("AY-90606", [["Obverse", "obverse", "_obverse_cropped.jpg"], ["Reverse", "reverse", "_failing.jpg"], ["Slab_Obverse", "slab_obverse", "_slab_obverse.jpg"]]),
      "AY-90610": R("AY-90610", [
        ["Other", "other", "_other_01.jpg", "Box"],
        ["OGP", "ogp", "_ogp_01.jpg", "Closed"],
        ["SubGroup_Obverse", "subgroup_obverse", "_whole_front.jpg"],
        ["COA", "coa", "_coa_01.jpg", "page 1"],
        ["COA", "coa", "_coa_02.jpg", "page 2"]
      ]),
      "AY-90611": R("AY-90611", [["Obverse", "obverse", "_obverse_cropped.jpg"], ["Reverse", "reverse", "_reverse_cropped.jpg"], ["Reference", "reference", "_reference_01.jpg", "Child ref"]]),
      "AY-90612": R("AY-90612", [["Obverse", "obverse", "_obverse_cropped.jpg"]]),
      "AY-90620": R("AY-90620", [["OGP", "ogp", "_ogp_01.jpg", "Only"]])
    });
    __setStoredReceiptsForTest({
      "AY-90603": { receiptId: "RC-90603", filename: "scan.pdf" },
      "AY-90604": { receiptId: "RC-90604", filename: "Binder" }
    });
    // Real blob URLs, one per file, so "which photo is showing" is exact.
    window.__URLNAME = {};
    const tiny = async (i) => {
      const c = document.createElement("canvas"); c.width = 4; c.height = 4;
      const x = c.getContext("2d"); x.fillStyle = "hsl(" + ((i * 37) % 360) + ",60%,50%)"; x.fillRect(0, 0, 4, 4);
      return URL.createObjectURL(await new Promise(r => c.toBlob(r, "image/png")));
    };
    const skip = (f) => /_r[123]\.jpg$|_failing\.jpg$/.test(f);
    let i = 0;
    for (const f of window.__FILES) {
      if (skip(f)) continue;
      const u = await tiny(++i);
      window.__URLNAME[u] = f;
      __setCoinPhotoCacheForTest(f, u);
    }
    window.__R3 = await tiny(99); window.__URLNAME[window.__R3] = "AY-90605_r3.jpg";
    window.__R1 = await tiny(98); window.__URLNAME[window.__R1] = "AY-90605_r1.jpg";
    window.__R2 = await tiny(97); window.__URLNAME[window.__R2] = "AY-90605_r2.jpg";
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";

    // Mock Graph client + write spy.
    const g = createMockGraphClient({});
    window.__WRITES = [];
    ["uploadFile", "uploadBytes", "uploadJson", "putContent", "patchWorkbookRanges", "addTableRow", "deleteItem"].forEach(m => {
      const orig = g[m].bind(g);
      g[m] = function () { window.__WRITES.push(m); return orig.apply(null, arguments); };
    });
    const realFetch = window.fetch.bind(window);
    window.fetch = function (url, opts) {
      const method = String((opts && opts.method) || "GET").toUpperCase();
      if (method !== "GET") window.__WRITES.push("fetch:" + method + " " + url);
      return realFetch(url, opts);
    };
    __setGraphClientForTest(g);
    // history.length can stay put when entries ahead are dropped, so count the
    // pushState calls themselves.
    window.__PUSHES = 0;
    const realPush = history.pushState.bind(history);
    history.pushState = function () { window.__PUSHES++; return realPush.apply(history, arguments); };
  });

  // ---------- Helpers -------------------------------------------------------
  const wait = (ms) => page.waitForTimeout(ms);
  const openCoin = (id) => page.evaluate((id) => {
    closeMediaViewer && closeMediaViewer();
    navigate("browse");
    showBrowseDetail(activeCoins().find(c => c.id === id));
  }, id);
  const tapTile = (n) => page.evaluate((n) => {
    const tiles = document.querySelectorAll("#detailPhotoStrip .gc-thumb");
    if (tiles[n]) tiles[n].click();
    return tiles.length;
  }, n);
  const stripTypes = () => page.evaluate(() =>
    [...document.querySelectorAll("#detailPhotoStrip .gc-thumb")].map(t => t.dataset.photoType));
  const state = () => page.evaluate(() => {
    const ov = document.getElementById("mediaViewerOverlay");
    const st = document.getElementById("mediaViewerStage");
    const img = st.querySelector("img");
    const nav = document.getElementById("mediaViewerNav");
    return {
      open: !ov.classList.contains("hidden"),
      name: img ? (window.__URLNAME[img.getAttribute("src")] || img.getAttribute("src")) : null,
      stageText: st.textContent.trim(),
      footer: document.getElementById("mediaViewerFooter").textContent,
      navShown: !nav.classList.contains("hidden"),
      counter: document.getElementById("mediaViewerCounter").textContent,
      prevDisabled: document.getElementById("mediaViewerPrevBtn").disabled,
      nextDisabled: document.getElementById("mediaViewerNextBtn").disabled,
      histLen: history.length,
      pushes: window.__PUSHES,
      histState: history.state
    };
  });
  const suffix = (name) => name ? name.replace(/^AY-\d+/, "") : name;
  const closeViewer = async () => { await page.evaluate(() => closeMediaViewer()); await wait(120); };
  // Steps through the whole sequence with the Next button and returns the file names.
  const walk = async () => {
    const names = [(await state()).name];
    for (let i = 0; i < 20; i++) {
      const s = await state();
      if (s.nextDisabled || !s.navShown) break;
      await page.evaluate(() => document.getElementById("mediaViewerNextBtn").click());
      names.push((await state()).name);
    }
    return names;
  };
  const key = async (k, opts) => { await page.keyboard.press(k); await wait(60); };
  const swipe = (dx, dy, fingers) => page.evaluate(([dx, dy, fingers]) => {
    const st = document.getElementById("mediaViewerStage");
    const mk = (x, y, id) => new Touch({ identifier: id, target: st, clientX: x, clientY: y });
    const x0 = 200, y0 = 300;
    const t0 = [mk(x0, y0, 1)]; if (fingers === 2) t0.push(mk(x0 + 40, y0, 2));
    const init = (touches, changed) => ({ touches, targetTouches: touches, changedTouches: changed, bubbles: true, cancelable: true });
    st.dispatchEvent(new TouchEvent("touchstart", init(t0, t0)));
    const end = [mk(x0 + dx, y0 + dy, 1)];
    st.dispatchEvent(new TouchEvent("touchend", init(fingers === 2 ? [mk(x0 + 40, y0, 2)] : [], end)));
  }, [dx, dy, fingers || 1]);

  const EXPECT_601 = ["_obverse_cropped.jpg", "_reverse_cropped.jpg", "_slab_obverse.jpg", "_slab_reverse.jpg",
    "_other_01.jpg", "_reference_01.jpg", "_ogp_01.jpg", "_reference_02.jpg"].map(s => "AY-90601" + s);

  // ---------- A. Order ------------------------------------------------------
  await openCoin("AY-90601");
  const A0 = await stripTypes();
  ok("A1 the Details strip lists faces first, then the rest in record order",
    JSON.stringify(A0) === JSON.stringify(["obverse", "reverse", "slab_obverse", "slab_reverse", "other", "reference", "ogp", "reference"]), A0);
  await tapTile(0);
  const A2 = await state();
  ok("A2 tapping the first tile opens the first photo, counter 1 / 8",
    A2.open && A2.name === EXPECT_601[0] && A2.counter === "1 / 8" && A2.navShown, A2);
  const A3 = await walk();
  ok("A3 stepping through shows every photo once, in the strip's order", JSON.stringify(A3) === JSON.stringify(EXPECT_601), A3);
  await closeViewer();
  await tapTile(5);
  const A4 = await state();
  ok("A4 the tapped tile is the start (6th tile -> 6 / 8, that photo, its label)",
    A4.name === EXPECT_601[5] && A4.counter === "6 / 8" && /Reference photo — Lot/.test(A4.footer) && A4.prevDisabled === false && A4.nextDisabled === false, A4);
  await closeViewer();

  // A child coin: its own strip, then the parent Set's COA pages, last, with their footer.
  await openCoin("AY-90611");
  await tapTile(0);
  const A5 = await walk();
  ok("A5 a child coin's list is its own photos, then the parent Set's COA pages (and nothing else of the Set's)",
    JSON.stringify(A5.map(suffix)) === JSON.stringify(["_obverse_cropped.jpg", "_reverse_cropped.jpg", "_reference_01.jpg", "_coa_01.jpg", "_coa_02.jpg"])
      && A5.slice(3).every(n => /^AY-90610/.test(n)), A5);
  const A6 = await state();
  ok("A6 a parent COA page keeps its \"from parent Set\" footer", /COA — from parent Set — page 2/.test(A6.footer) && A6.counter === "5 / 5", A6);
  await closeViewer();
  // Opened from the parent COA block itself, it is the same list at that page.
  await page.evaluate(() => { document.querySelectorAll("#detailParentCoa .gc-thumb")[0].click(); });
  const A7 = await state();
  ok("A7 a parent COA tile opens the same list at that page (4 / 5)", A7.name === "AY-90610_coa_01.jpg" && A7.counter === "4 / 5", A7);
  await closeViewer();

  // ---------- B. Receipts are not in the list ------------------------------
  await openCoin("AY-90603");
  await tapTile(0);
  const B1 = await walk();
  ok("B1 a coin with a receipt: the list is just its two photos (receipt not in it)",
    JSON.stringify(B1.map(suffix)) === JSON.stringify(["_obverse_cropped.jpg", "_reverse_cropped.jpg"]), B1);
  // Receipt opened while the viewer is up (the viewer was last on a sequence).
  await page.evaluate(() => openReceiptInViewer(activeCoins().find(c => c.id === "AY-90603"), "scan.pdf"));
  await wait(200);
  const B2 = await state();
  ok("B2 a receipt shows no next / previous", B2.open && B2.navShown === false && /Receipt/.test(await page.evaluate(() => document.getElementById("mediaViewerTitle").textContent)), B2);
  await key("ArrowRight"); await key("ArrowLeft");
  const B3 = await state();
  ok("B3 arrow keys do nothing on a receipt (still the receipt, no photo)", B3.open && B3.name === null && B3.navShown === false, B3);
  await swipe(-150, 0);
  const B3b = await state();
  ok("B3b nor does a swipe", B3b.name === null && B3b.navShown === false, B3b);
  await closeViewer();
  await openCoin("AY-90604");
  await tapTile(0);
  const B4 = await walk();
  ok("B4 a coin whose receipt is a Binder row: just its photos", JSON.stringify(B4.map(suffix)) === JSON.stringify(["_obverse_cropped.jpg", "_reverse_cropped.jpg"]), B4);
  await closeViewer();

  // ---------- C. Ends: stop, never wrap ------------------------------------
  await openCoin("AY-90601");
  await tapTile(0);
  const C1 = await state();
  ok("C1 on the first photo Previous is disabled and Next is not", C1.prevDisabled && !C1.nextDisabled, C1);
  await page.evaluate(() => document.getElementById("mediaViewerPrevBtn").click());
  await key("ArrowLeft"); await swipe(150, 0);
  const C2 = await state();
  ok("C2 Previous, ArrowLeft and a right swipe on the first photo do nothing (no wrap)", C2.name === EXPECT_601[0] && C2.counter === "1 / 8", C2);
  await closeViewer();
  await tapTile(7);
  const C3 = await state();
  ok("C3 on the last photo Next is disabled and Previous is not", C3.nextDisabled && !C3.prevDisabled && C3.counter === "8 / 8", C3);
  await page.evaluate(() => document.getElementById("mediaViewerNextBtn").click());
  await key("ArrowRight"); await swipe(-150, 0);
  const C4 = await state();
  ok("C4 Next, ArrowRight and a left swipe on the last photo do nothing (no wrap)", C4.name === EXPECT_601[7] && C4.counter === "8 / 8", C4);
  await closeViewer();
  await openCoin("AY-90602");
  await tapTile(0);
  const C5 = await state();
  await key("ArrowRight"); await swipe(-150, 0);
  const C5b = await state();
  ok("C5 a coin with one photo: the viewer opens it with no controls and no counter, and arrows do nothing",
    C5.open && C5.navShown === false && C5.name === "AY-90602_reference_01.jpg" && C5b.name === C5.name, [C5, C5b]);
  await closeViewer();

  // ---------- D. Buttons ----------------------------------------------------
  await openCoin("AY-90601");
  await tapTile(2);
  await page.evaluate(() => document.getElementById("mediaViewerNextBtn").click());
  const D1 = await state();
  ok("D1 Next moves forward: photo, counter and caption all follow (4 / 8, Holder — back)",
    D1.name === EXPECT_601[3] && D1.counter === "4 / 8" && /Holder — back/.test(D1.footer), D1);
  await page.evaluate(() => document.getElementById("mediaViewerPrevBtn").click());
  await page.evaluate(() => document.getElementById("mediaViewerPrevBtn").click());
  const D2 = await state();
  ok("D2 Previous moves back (2 / 8, Reverse)", D2.name === EXPECT_601[1] && D2.counter === "2 / 8" && /^Reverse/.test(D2.footer), D2);
  const D3 = await page.evaluate(() => ({
    title: document.getElementById("mediaViewerTitle").textContent,
    close: !!document.getElementById("mediaViewerCloseBtn"),
    labelHidden: document.getElementById("mediaViewerLabel").classList.contains("hidden")
  }));
  ok("D3 the title still names the coin; Close is there; no label field on Details", /Test Coin AY-90601/.test(D3.title) && D3.close && D3.labelHidden, D3);
  await closeViewer();

  // ---------- E. Keyboard ---------------------------------------------------
  await tapTile(0);
  await key("ArrowRight"); await key("ArrowRight"); await key("ArrowLeft");
  const E1 = await state();
  ok("E1 ArrowRight / ArrowRight / ArrowLeft lands on photo 2", E1.name === EXPECT_601[1] && E1.counter === "2 / 8", E1);
  await key("Shift+ArrowRight"); await key("Control+ArrowRight"); await key("Alt+ArrowRight");
  const E2 = await state();
  ok("E2 arrows with Shift, Ctrl or Alt held do nothing", E2.name === EXPECT_601[1], E2);
  const E3 = await page.evaluate(async () => {
    const input = document.createElement("input"); input.id = "__probeInput"; input.type = "text";
    document.body.appendChild(input); input.focus();
    return document.activeElement === input;
  });
  await key("ArrowRight");
  const E3b = await state();
  await page.evaluate(() => document.getElementById("__probeInput").remove());
  ok("E3 arrows typed into a text field do not change the photo", E3 && E3b.name === EXPECT_601[1], [E3, E3b]);
  await closeViewer();
  await key("ArrowRight");
  const E4 = await state();
  ok("E4 with the viewer closed, arrows do nothing to it", E4.open === false, E4);
  const E5 = await page.evaluate(() => { const e = new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true, bubbles: true }); document.dispatchEvent(e); return e.defaultPrevented; });
  ok("E5 and the key press is left alone (not prevented) when no sequence is showing", E5 === false, E5);

  // ---------- F. Swipe ------------------------------------------------------
  await openCoin("AY-90601");
  await tapTile(2);
  await swipe(-120, 10);
  const F1 = await state();
  ok("F1 swipe left = next (4 / 8)", F1.counter === "4 / 8" && F1.name === EXPECT_601[3], F1);
  await swipe(120, -10);
  const F2 = await state();
  ok("F2 swipe right = previous (3 / 8)", F2.counter === "3 / 8", F2);
  await swipe(-30, 0);
  const F3 = await state();
  ok("F3 a short drag (30px) does nothing", F3.counter === "3 / 8", F3);
  await swipe(-120, 200);
  const F4 = await state();
  ok("F4 a mostly vertical drag does nothing", F4.counter === "3 / 8", F4);
  await swipe(-120, 0, 2);
  const F5 = await state();
  ok("F5 a two-finger gesture does nothing", F5.counter === "3 / 8", F5);
  await page.evaluate(() => Object.defineProperty(window.visualViewport, "scale", { configurable: true, get: () => 2 }));
  await swipe(-120, 0);
  const F6 = await state();
  await page.evaluate(() => { delete window.visualViewport.scale; });
  ok("F6 while the page is pinch-zoomed a swipe does nothing", F6.counter === "3 / 8", F6);
  await swipe(-120, 0);
  const F7 = await state();
  ok("F7 and it works again once the zoom is gone (4 / 8)", F7.counter === "4 / 8", F7);
  await closeViewer();

  // ---------- G. History ----------------------------------------------------
  await openCoin("AY-90601");
  const urlBefore = page.url();
  const histBefore = await page.evaluate(() => ({ len: history.length, pushes: window.__PUSHES }));
  await tapTile(0);
  const G1 = await state();
  for (let i = 0; i < 5; i++) await page.evaluate(() => document.getElementById("mediaViewerNextBtn").click());
  await key("ArrowLeft"); await swipe(-120, 0);
  const G2 = await state();
  ok("G1 opening pushes one history entry; 7 steps push none",
    G1.pushes === histBefore.pushes + 1 && G2.pushes === G1.pushes && G2.histState && G2.histState.mediaViewer === true, { histBefore, G1: G1.pushes, G2: G2.pushes });
  await page.evaluate(() => history.back());
  await wait(350);
  const G3 = await state();
  const onPage = await page.evaluate(() => document.getElementById("browseDetailView").style.display !== "none");
  ok("G2 one Back from the 7th photo closes the viewer and the page is not left",
    G3.open === false && page.url() === urlBefore && onPage && !(G3.histState && G3.histState.mediaViewer), { G3, onPage });
  await openCoin("AY-90601");
  await tapTile(0);
  await page.evaluate(() => document.getElementById("mediaViewerNextBtn").click());
  await key("Escape"); await wait(250);
  const G4 = await state();
  ok("G3 Escape after stepping closes it and steps back out of the viewer's one entry", G4.open === false && !(G4.histState && G4.histState.mediaViewer), G4);

  // ---------- H. Slow fetches; neighbours prefetched -----------------------
  await page.evaluate(() => {
    window.__ECALLS = []; window.__DEFER = {};
    window.__origEnsure = window.ensureCoinPhotoFetch;
    window.ensureCoinPhotoFetch = (fn) => {
      window.__ECALLS.push(fn);
      if (/_r3\.jpg$/.test(fn)) return Promise.resolve(window.__R3);
      return new Promise(res => { (window.__DEFER[fn] = window.__DEFER[fn] || []).push(res); });
    };
  });
  await openCoin("AY-90605");
  await tapTile(0);
  await page.evaluate(() => document.getElementById("mediaViewerNextBtn").click());
  await page.evaluate(() => document.getElementById("mediaViewerNextBtn").click());
  await wait(80);
  const H1 = await state();
  ok("H1 stepping on to photo 3 shows it at once while 1 and 2 are still loading", H1.name === "AY-90605_r3.jpg" && H1.counter === "3 / 3", H1);
  await page.evaluate(() => {
    (window.__DEFER["AY-90605_r1.jpg"] || []).forEach(r => r(window.__R1));
    (window.__DEFER["AY-90605_r2.jpg"] || []).forEach(r => r(window.__R2));
  });
  await wait(150);
  const H2 = await state();
  ok("H2 photos 1 and 2 arriving late do not paint over photo 3", H2.name === "AY-90605_r3.jpg" && /Reference photo/.test(H2.footer), H2);
  await closeViewer();
  await page.evaluate(() => { window.__ECALLS.length = 0; });
  await openCoin("AY-90605");
  await page.evaluate(() => {
    for (const e of galleryFor("AY-90605")) { e.url = null; }  // forget the urls the earlier steps put on the entries
  });
  await tapTile(1);
  await wait(80);
  const H3 = await page.evaluate(() => window.__ECALLS.slice());
  ok("H3 opening on photo 2 also asks for the photos either side (and no others)",
    H3.includes("AY-90605_r1.jpg") && H3.includes("AY-90605_r3.jpg") && H3.every(f => /^AY-90605_r[123]\.jpg$/.test(f)), H3);
  await closeViewer();
  await page.evaluate(() => { window.ensureCoinPhotoFetch = window.__origEnsure; });

  // ---------- I. Set Details ------------------------------------------------
  await openCoin("AY-90610");
  const I0 = await page.evaluate(() => ({
    tag: document.querySelector("#detailPhotoStrip .gc-thumb") && document.querySelector("#detailPhotoStrip .gc-thumb").tagName,
    n: document.querySelectorAll("#detailPhotoStrip .gc-thumb").length,
    types: [...document.querySelectorAll("#detailPhotoStrip .gc-thumb")].map(t => t.dataset.photoType)
  }));
  ok("I1 a Set's tiles are real buttons, one per photo of its own, in record order",
    I0.tag === "BUTTON" && JSON.stringify(I0.types) === JSON.stringify(["other", "ogp", "subgroup_obverse", "coa", "coa"]), I0);
  // The Photos section is collapsed on a Set; the tile click works regardless.
  await tapTile(0);
  const I2 = await state();
  const gridOpen = await page.evaluate(() => !document.getElementById("galleryViewerOverlay").classList.contains("hidden"));
  ok("I2 tapping a Set tile opens the one-photo viewer (not the old grid panel), counter 1 / 5",
    I2.open && gridOpen === false && I2.counter === "1 / 5" && I2.name === "AY-90610_other_01.jpg", { I2, gridOpen });
  const I3 = await walk();
  ok("I3 stepping covers the Set's own five photos in order, and none of its child coins' photos",
    JSON.stringify(I3.map(suffix)) === JSON.stringify(["_other_01.jpg", "_ogp_01.jpg", "_whole_front.jpg", "_coa_01.jpg", "_coa_02.jpg"])
      && I3.every(n => /^AY-90610_/.test(n)), I3);
  await closeViewer();
  await openCoin("AY-90620");
  await tapTile(0);
  const I4 = await state();
  await key("ArrowRight");
  ok("I4 a Set with a single photo opens it with no controls", I4.open && I4.navShown === false && I4.name === "AY-90620_ogp_01.jpg", I4);
  await closeViewer();

  // ---------- J. A photo that fails to load stays in the sequence ----------
  await openCoin("AY-90606");
  await tapTile(0);
  await page.evaluate(() => document.getElementById("mediaViewerNextBtn").click());
  await wait(250);
  const J1 = await state();
  ok("J1 the photo that can't be loaded says so, and the controls still show 2 / 3",
    J1.name === null && /couldn't be loaded/.test(J1.stageText) && J1.counter === "2 / 3" && J1.navShown && !J1.nextDisabled && !J1.prevDisabled, J1);
  await page.evaluate(() => document.getElementById("mediaViewerNextBtn").click());
  const J2 = await state();
  await page.evaluate(() => document.getElementById("mediaViewerPrevBtn").click());
  await page.evaluate(() => document.getElementById("mediaViewerPrevBtn").click());
  const J3 = await state();
  ok("J2 Next leaves it (3 / 3, the next photo shows) and Previous comes back through it to photo 1",
    J2.counter === "3 / 3" && J2.name === "AY-90606_slab_obverse.jpg" && J3.counter === "1 / 3" && J3.name === "AY-90606_obverse_cropped.jpg", [J2, J3]);
  await closeViewer();

  // ---------- K. Layout -----------------------------------------------------
  for (const vp of [{ width: 360, height: 800 }, { width: 412, height: 915 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(vp);
    await wait(150);
    await openCoin("AY-90601");
    await tapTile(1);
    const K = await page.evaluate(() => {
      const r = (id) => document.getElementById(id).getBoundingClientRect();
      const nav = r("mediaViewerNav"), foot = r("mediaViewerFooter"), stage = r("mediaViewerStage");
      const prev = r("mediaViewerPrevBtn"), next = r("mediaViewerNextBtn");
      const img = document.querySelector("#mediaViewerStage img").getBoundingClientRect();
      return {
        vw: innerWidth, vh: innerHeight,
        inside: nav.left >= 0 && nav.right <= innerWidth && nav.bottom <= innerHeight && foot.bottom <= innerHeight + 1,
        tap: Math.min(prev.width, prev.height, next.width, next.height),
        order: stage.bottom <= nav.top + 1 && nav.bottom <= foot.top + 1,
        imgClear: img.bottom <= nav.top + 1,
        noHScroll: document.documentElement.scrollWidth <= innerWidth
      };
    });
    ok("K " + vp.width + "px: bar inside the screen, buttons at least 44px, stage / bar / caption stacked without overlap, no sideways scroll",
      K.inside && K.tap >= 44 && K.order && K.imgClear && K.noHScroll, K);
    await closeViewer();
  }
  await page.setViewportSize(PHONE);

  // ---------- L. Edit-screen viewers are unchanged -------------------------
  await openCoin("AY-90601");
  const L = await page.evaluate(() => {
    const list = galleryFor("AY-90601");
    const out = {};
    openGalleryPhotoInViewer(list[0], { title: "Obverse" });
    out.plain = !document.getElementById("mediaViewerNav").classList.contains("hidden");
    closeMediaViewer();
    openGalleryPhotoInViewer(list[1], { title: "Photo", label: { draft: null, hint: "", title: "Label", focus: false } });
    out.withLabel = !document.getElementById("mediaViewerNav").classList.contains("hidden");
    out.labelShown = !document.getElementById("mediaViewerLabel").classList.contains("hidden");
    out.before = document.getElementById("mediaViewerFooter").textContent;
    return out;
  });
  await key("ArrowRight"); await swipe(-150, 0);
  const L2 = await page.evaluate(() => ({ footer: document.getElementById("mediaViewerFooter").textContent }));
  ok("L1 an edit-screen viewer (view only, and with its label field) shows no next / previous; arrows and swipe do nothing",
    L.plain === false && L.withLabel === false && L.labelShown && L2.footer === L.before, { L, L2 });
  const L3 = await page.evaluate(() => {
    const ta = document.getElementById("mediaViewerLabelInput");
    ta.value = "abc"; ta.focus();
    return document.activeElement === ta;
  });
  await key("ArrowLeft"); await key("ArrowRight");
  const L4 = await page.evaluate(() => document.getElementById("mediaViewerLabelInput").value);
  ok("L2 arrow keys in the label box just move the caret", L3 && L4 === "abc", [L3, L4]);
  await page.evaluate(() => closeMediaViewer());
  await wait(200);

  // ---------- M. Display only ----------------------------------------------
  const M = await page.evaluate(() => window.__WRITES.slice());
  ok("M1 nothing above wrote anything: no Graph write call, no non-GET fetch (got " + JSON.stringify(M) + ")", M.length === 0, M);
}, module);
