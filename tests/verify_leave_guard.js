// The leave guard (Oct 2026, claude/photos-wait-for-save, commit C2;
// backlog l and o, Ray's Q4 and Q6).
//
// WHY. Unsaved edits used to be thrown away silently by every way off an
// editing screen except the in-form Back: Close Drawer, any other
// navigate(), and the phone's own Back button (which left the app). Now one
// check (unsavedEditsForView) asks first everywhere, with one dialog:
//   "Discard unsaved edits?" / "You've changed {count} on {ID} and haven't
//   saved them. Discard leaves this screen and loses those changes. Keep
//   editing stays here so you can save."
//
//   G1  Close Drawer on Edit Coin with a field typed asks; Keep editing
//       stays (the text kept); Discard leaves; nothing written
//   G2  Close Drawer on Edit Coin with nothing changed leaves at once
//   G3  Edit Set: a changed field counts (Q4), on Back and on Close Drawer
//   G4  Manage Photos: a pending photo asks; Discard drops it
//   G5  Add Coin: a typed field asks ("on this new coin"); Discard resets
//   G6  Add Coin from an album slot with no typing leaves without asking
//       (the deep-link prefill is not an edit)
//   G7  Add Coin editing a Staging draft: the draft's own values are not
//       edits; a change asks and names the draft
//   G8  Edit Set's "Coins in this Set" row asks before leaving the form
//   G9  navigate() while a Save runs: lock toast, nothing leaves
//   H1  opening an editing screen pushes ONE history entry; redraws and
//       re-renders never stack another
//   H2  device Back with nothing unsaved leaves as the in-app Back would
//   H3  device Back with something unsaved asks; Keep editing stays and
//       re-arms; the next Back asks again; Discard leaves
//   H4  leaving by the in-app Back steps back over the entry
//   H5  device Back inside the photo viewer closes only the viewer
//   H6  Manage Photos and Add Coin arm the guard too; a Save that leaves
//       steps back over it
//   H7  an old guard entry left by a reload never swallows a Back
//   H8  device Back with the chooser or the crop tool open closes that and
//       stays
//   E1  a label changed and then ✕'d on the same photo: Save writes the
//       removal only; the row ends fully blank; no Label cell after it

const { defineSuite } = require("./harness");

const HEADER = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "", "OriginalFilename"];
const ALL_HEADERS = ["CollectionID", "Year", "MintMark", "Denomination", "Variety", "Description",
  "Value", "Cost", "Shipping", "Seller_Link", "PurchaseDate", "StorageLocation", "Container",
  "Grade", "GradeSource", "Designation", "SerNo", "CACBean", "Remarks", "Reviewed", "LastModified",
  "Finish", "CoinID", "Status", "SaleDate", "SalePrice", "Buyer", "Platform"];

const DIALOG_BODY = /^You've changed (.+) on (.+) and haven't saved them\.Discard leaves this screen and loses those changes\. Keep editing stays here so you can save\.$/;

async function setup(page) {
  await page.evaluate(({ HEADER, ALL_HEADERS }) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
    window.__lg = {
      sleep, graphCalls: 0, patches: [], mock: null,
      coin: { id: "AY-00099", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" },
      set: { id: "AY-00090", name: "1957 Proof Set", denom: "Multiple", year: 1957, mint: "", category: "Proof Set" },
      install() {
        const self = this;
        // Whatever the last block left on screen goes first, without asking.
        const ov = document.getElementById("writeGuardOverlay"); if (ov) ov.classList.add("hidden");
        discardUnsavedPhotoEdits(); browseEditTouchedFields.clear(); addCoinTouchedFields.clear();
        if (typeof closeMediaViewer === "function") closeMediaViewer();
        closeImageSourceChooser();
        navigateNow("dashboard");
        const allRow = ["AY-00099", 1916, "D", "10C", "", "Mercury Dime", 40, 30, 0, "", null,
          "Safe", "", "VF-20", "Owner", "", "", "", "", "", null,
          "Business Strike", "C-1916-D-10C-01", "Owned", null, null, "", ""];
        const mock = createMockGraphClient({ sheets: {
          All: [ALL_HEADERS, allRow],
          Photos: [
            HEADER,
            ["PH-00001", "AY-00099", "Obverse", "", "AY-00099_obverse_cropped.jpg", "", 46000, "keep-me", ""],
            ["PH-00002", "AY-00099", "Reference", "", "AY-00099_reference_01.jpg", "PCGS photo", 46000, "keep-me", ""],
            ["PH-00003", "AY-00099", "Other", "", "AY-00099_other_01.jpg", "", 46001, "keep-me", ""],
            ["PH-00010", "AY-00090", "OGP_Obverse", "", "AY-00090_ogp_obverse.jpg", "", 46000, "keep-me", ""],
            ["PH-00011", "AY-00090", "COA", "", "AY-00090_coa_01.jpg", "page 1", 46000, "keep-me", ""],
            ["", "", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", "", ""],
          ] } });
        this.mock = mock; this.patches = [];
        __setGraphClientForTest(new Proxy(mock, { get(t, k) {
          const v = t[k];
          if (typeof v !== "function") return v;
          return async (...a) => {
            self.graphCalls++;
            if (k === "patchWorkbookRanges") self.patches.push(a[1] + "!" + a[2].map(e => e.address).join(","));
            return v.apply(t, a);
          };
        } }));
        __resetSheetHeaderMapsForTest();
        __resetAllHeaderMapForTest();
        __setAddCoinWriteEnabledForTest(true);
        __setBrowseEditWriteEnabledForTest(true);
        __setLiveCoinsForTest([this.coin, this.set]);
        __setStoredPhotosForTest({
          "AY-00099": [
            { photoId: "PH-00001", photoType: "Obverse", galleryType: "obverse", subGroupId: "", filename: "AY-00099_obverse_cropped.jpg", originalFilename: "", label: "" },
            { photoId: "PH-00002", photoType: "Reference", galleryType: "reference", subGroupId: "", filename: "AY-00099_reference_01.jpg", originalFilename: "", label: "PCGS photo" },
            { photoId: "PH-00003", photoType: "Other", galleryType: "other", subGroupId: "", filename: "AY-00099_other_01.jpg", originalFilename: "", label: "" },
          ],
          "AY-00090": [
            { photoId: "PH-00010", photoType: "OGP_Obverse", galleryType: "ogp_obverse", subGroupId: "", filename: "AY-00090_ogp_obverse.jpg", originalFilename: "", label: "" },
            { photoId: "PH-00011", photoType: "COA", galleryType: "coa", subGroupId: "", filename: "AY-00090_coa_01.jpg", originalFilename: "", label: "page 1" },
          ],
        });
        const url = () => URL.createObjectURL(new Blob([new Uint8Array([1])], { type: "image/jpeg" }));
        ["AY-00099_obverse_cropped.jpg", "AY-00099_reference_01.jpg", "AY-00099_other_01.jpg",
         "AY-00090_ogp_obverse.jpg", "AY-00090_coa_01.jpg"].forEach(f => __setCoinPhotoCacheForTest(f, url()));
        delete galleryStore["AY-00099"]; delete galleryStore["AY-00090"];
        this.clearToast();
        this.graphCalls = 0;
      },
      view() { const v = document.querySelector(".view.active"); return v ? v.id.replace("view-", "") : ""; },
      editOpen() { return document.getElementById("browseEditView").style.display === "block"; },
      editSetOpen() { return document.getElementById("browseEditSetView").style.display === "block"; },
      detailOpen() { return document.getElementById("browseDetailView").style.display === "block"; },
      openAll(hostId) {
        const host = document.getElementById(hostId);
        [...host.querySelectorAll(".accordion-header")].forEach(h => { if (h.getAttribute("aria-expanded") !== "true") h.click(); });
        return host;
      },
      section(host, re) {
        const h = [...host.querySelectorAll(".accordion-header")].find(x => re.test(x.textContent));
        return h ? h.nextElementSibling : null;
      },
      closeOverlays() {
        if (typeof closeBgCrop === "function") closeBgCrop();
        document.getElementById("photoAdjustOverlay").classList.add("hidden");
      },
      async openEditCoin() {
        navigate("browse"); showBrowseDetail(this.coin); showBrowseEditView(this.coin);
        await loadBrowseEditSnapshot(this.coin);
        await sleep(120);
        const oh = document.getElementById("editCoinPhotosHeader");
        if (oh.getAttribute("aria-expanded") !== "true") oh.click();
        this.closeOverlays();
        await sleep(30);
        return this.openAll("browseEditPhotosSections");
      },
      async openEditSet() {
        navigate("browse"); showBrowseDetail(this.set); showBrowseEditSetView(this.set);
        await sleep(30);
        return document.getElementById("browseEditSetView");
      },
      async openManageCoin(backTo) {
        openManagePhotos({ id: this.coin.id, name: "x", meta: this.coin.id, kind: "coin", backTo: backTo || (() => navigate("needsdbcoins")) });
        this.closeOverlays();
        await sleep(30);
        return this.openAll("managePhotosSections");
      },
      typeInto(id, text) {
        const n = document.getElementById(id);
        n.value = text; n.dispatchEvent(new Event("input", { bubbles: true }));
      },
      toast() { const t = document.getElementById("toast"); return t.classList.contains("show") ? t.textContent : ""; },
      clearToast() { const t = document.getElementById("toast"); t.classList.remove("show"); t.textContent = ""; },
      guardOpen() { const o = document.getElementById("writeGuardOverlay"); return !!o && !o.classList.contains("hidden"); },
      guardTitle() { return document.getElementById("writeGuardTitle").textContent || ""; },
      guardBody() { return document.getElementById("writeGuardBody").textContent || ""; },
      guardButtons() { return [...document.querySelectorAll("#writeGuardBtns button")].map(b => b.textContent); },
      clickGuard(label) {
        const b = [...document.querySelectorAll("#writeGuardBtns button")].find(x => x.textContent === label);
        if (!b) return false; b.click(); return true;
      },
      dialog() { return { open: this.guardOpen(), title: this.guardTitle(), body: this.guardBody(), buttons: this.guardButtons() }; },
      closeDrawer() { document.getElementById("navHomeBtn").click(); },
      chromeBack() { document.getElementById("navBackBtn").click(); },
      async waitFor(fn, ms) { const end = Date.now() + (ms || 3000); while (Date.now() < end) { if (fn()) return true; await sleep(30); } return !!fn(); },
      guardTop() { return leaveGuardIsTop(); },
      // The device Back. When neither our entry nor the viewer's is on top,
      // a real Back would leave the page (that IS the bug a broken guard
      // shows), so a same-page entry is pushed first: the check then fails
      // by name instead of the suite losing its page.
      async back() {
        if (!leaveGuardIsTop() && !(history.state && history.state.mediaViewer)) history.pushState({ testFloor: true }, "");
        history.back(); await sleep(150);
      },
      async jpeg() {
        const c = document.createElement("canvas"); c.width = 300; c.height = 300;
        const x = c.getContext("2d"); x.fillStyle = "#2a6"; x.fillRect(0, 0, 300, 300);
        const b = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
        return new File([b], "coin.jpg", { type: "image/jpeg" });
      },
      chooserOpen() { const o = document.getElementById("imageSourceChooser"); return !!o && !o.classList.contains("hidden"); },
      async addVia(trigger) {
        if (!trigger) return false;
        const file = await this.jpeg();
        trigger.click();
        if (!this.chooserOpen()) return false;
        document.querySelector('#imageSourceChooser .image-chooser-btn[data-source="files"]').click();
        const input = document.getElementById("imageChooserFilesInput");
        const dt = new DataTransfer(); dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        const open = (id) => { const o = document.getElementById(id); return !!o && !o.classList.contains("hidden"); };
        if (!(await this.waitFor(() => open("bgCropOverlay")))) return false;
        document.getElementById("bgCropUseBtn").click();
        if (await this.waitFor(() => open("photoAdjustOverlay"), 1200)) document.getElementById("photoAdjustUseBtn").click();
        await sleep(150);
        return true;
      },
      plusIn(host, re) {
        const b = this.section(host, re);
        return b ? [...b.querySelectorAll("button")].find(x => /Add|＋|\+/.test(x.getAttribute("aria-label") || x.textContent)) : null;
      },
    };
  }, { HEADER, ALL_HEADERS });
}

module.exports = defineSuite("leave-guard", async ({ ok: okRaw, openApp, PHONE }) => {
  // check(label, condition, data): the label comes first here for reading;
  // the harness's own ok() takes (condition, label).
  const ok = (label, cond, data) => okRaw(!!cond, label + (cond ? "" : ": " + JSON.stringify(data)));
  const page = await openApp(PHONE);
  await setup(page);

  // ---------- G1 Close Drawer on Edit Coin with a field typed ---------------
  const G1 = await page.evaluate(async () => {
    const L = __lg; L.install();
    await L.openEditCoin();
    L.typeInto("browseEditNotes", "Bought at the show");
    L.graphCalls = 0;
    L.closeDrawer(); await L.sleep(40);
    const first = L.dialog();
    const stayedOpen = L.editOpen() && L.view() === "browse";
    L.clickGuard("Keep editing"); await L.sleep(40);
    const kept = { edit: L.editOpen(), text: document.getElementById("browseEditNotes").value, dialog: L.guardOpen() };
    L.closeDrawer(); await L.sleep(40);
    L.clickGuard("Discard"); await L.sleep(60);
    return { first, stayedOpen, kept, view: L.view(), writes: L.graphCalls, touched: browseEditTouchedFields.size };
  });
  ok("G1a Close Drawer on Edit Coin with a typed field shows \"Discard unsaved edits?\" with Ray's wording",
    G1.first.open && G1.first.title === "Discard unsaved edits?" && DIALOG_BODY.test(G1.first.body) &&
    /You've changed 1 field on AY-00099 and/.test(G1.first.body) &&
    JSON.stringify(G1.first.buttons) === JSON.stringify(["Keep editing", "Discard"]) && G1.stayedOpen, G1);
  ok("G1b Keep editing stays on Edit Coin with the typed text kept", G1.kept.edit && G1.kept.text === "Bought at the show" && !G1.kept.dialog, G1);
  ok("G1c Discard leaves to the Dashboard and writes nothing", G1.view === "dashboard" && G1.writes === 0 && G1.touched === 0, G1);

  // ---------- G2 nothing changed: Close Drawer leaves at once ----------------
  const G2 = await page.evaluate(async () => {
    const L = __lg; L.install();
    await L.openEditCoin();
    L.closeDrawer(); await L.sleep(60);
    return { dialog: L.guardOpen(), view: L.view() };
  });
  ok("G2 Close Drawer on an unchanged Edit Coin leaves at once (no dialog)", !G2.dialog && G2.view === "dashboard", G2);

  // ---------- G3 Edit Set fields count (Q4) --------------------------------
  const G3 = await page.evaluate(async () => {
    const L = __lg; L.install();
    await L.openEditSet();
    L.typeInto("editSetNotes", "box is dented");
    L.chromeBack(); await L.sleep(40);
    const back = L.dialog();
    L.clickGuard("Keep editing"); await L.sleep(30);
    L.closeDrawer(); await L.sleep(40);
    const drawer = L.dialog();
    L.clickGuard("Discard"); await L.sleep(60);
    const left = L.view();
    // An unchanged Edit Set leaves at once.
    await L.openEditSet();
    L.closeDrawer(); await L.sleep(60);
    return { back, drawer, left, cleanDialog: L.guardOpen(), cleanView: L.view() };
  });
  ok("G3a Edit Set Back with a changed field asks (\"1 field on AY-00090\")",
    G3.back.open && /You've changed 1 field on AY-00090 and haven't saved them\./.test(G3.back.body), G3);
  ok("G3b Edit Set Close Drawer asks the same, Discard leaves", G3.drawer.open && /1 field on AY-00090/.test(G3.drawer.body) && G3.left === "dashboard", G3);
  ok("G3c an unchanged Edit Set leaves without asking", !G3.cleanDialog && G3.cleanView === "dashboard", G3);

  // ---------- G4 Manage Photos: a pending photo asks -------------------------
  const G4 = await page.evaluate(async () => {
    const L = __lg; L.install();
    const host = await L.openManageCoin();
    const added = await L.addVia(L.plusIn(host, /Reference/));
    const pending = pendingPhotoCount("AY-00099");
    L.graphCalls = 0;
    L.closeDrawer(); await L.sleep(40);
    const d = L.dialog();
    L.clickGuard("Discard"); await L.sleep(60);
    return { added, pending, d, view: L.view(), after: pendingPhotoCount("AY-00099"), writes: L.graphCalls };
  });
  ok("G4a Close Drawer on Manage Photos with a pending photo asks (\"1 photo on AY-00099\")",
    G4.added && G4.pending === 1 && G4.d.open && /You've changed 1 photo on AY-00099 and/.test(G4.d.body), G4);
  ok("G4b Discard leaves, drops the pick and writes nothing", G4.view === "dashboard" && G4.after === 0 && G4.writes === 0, G4);

  // ---------- G5 Add Coin: a typed field asks -------------------------------
  await page.evaluate(() => { __lg.install(); navigate("addcoin"); });
  await page.fill("#year", "1916");
  const G5 = await page.evaluate(async () => {
    const L = __lg;
    L.closeDrawer(); await L.sleep(40);
    const d = L.dialog();
    L.clickGuard("Keep editing"); await L.sleep(30);
    const stayed = { view: L.view(), year: document.getElementById("year").value };
    L.chromeBack(); await L.sleep(40);
    const back = L.dialog();
    L.clickGuard("Discard"); await L.sleep(60);
    const left = L.view();
    navigate("addcoin"); await L.sleep(30);
    return { d, stayed, back, left, yearAfter: document.getElementById("year").value };
  });
  ok("G5a Close Drawer on Add Coin with a typed Year asks (\"1 field on this new coin\")",
    G5.d.open && /You've changed 1 field on this new coin and haven't saved them\./.test(G5.d.body), G5);
  ok("G5b Keep editing stays on Add Coin with the Year kept", G5.stayed.view === "addcoin" && G5.stayed.year === "1916", G5);
  ok("G5c Back asks too; Discard leaves and the next Add Coin is blank",
    G5.back.open && G5.left === "acquisitions" && G5.yearAfter === "", G5);

  // A photo picked on Add Coin counts as a photo.
  const G5d = await page.evaluate(async () => {
    const L = __lg; L.install(); navigate("addcoin"); await L.sleep(40);
    const host = L.openAll("addCoinPhotoSections");
    const added = await L.addVia(L.plusIn(host, /Reference/));
    L.closeDrawer(); await L.sleep(40);
    const d = L.dialog();
    L.clickGuard("Discard"); await L.sleep(60);
    return { added, d, view: L.view(), picks: (galleryStore[ADDCOIN_GALLERY_ID] || []).length };
  });
  ok("G5d a photo picked on Add Coin asks (\"1 photo on this new coin\"); Discard clears it",
    G5d.added && G5d.d.open && /1 photo on this new coin/.test(G5d.d.body) && G5d.view === "dashboard" && G5d.picks === 0, G5d);

  // ---------- G6 album slot deep link, no typing ----------------------------
  const G6 = await page.evaluate(async () => {
    const L = __lg; L.install();
    navigate("albums"); await L.sleep(30);
    let slot = null;
    for (let p = 0; p < 8 && !slot; p++) {
      await openAlbumAtPage(0, p); await L.sleep(60);
      slot = document.querySelector("#albumsDetailContainer .slot-cell.want");
    }
    if (!slot) return { slot: false };
    slot.click(); await L.sleep(60);
    const prefill = { view: L.view(), year: document.getElementById("year").value, banner: !document.getElementById("albumContextBanner").classList.contains("hidden") };
    L.closeDrawer(); await L.sleep(60);
    return { slot: true, prefill, dialog: L.guardOpen(), view: L.view(), touched: addCoinTouchedFields.size };
  });
  ok("G6 Add Coin opened from an album slot, no typing: Close Drawer leaves without asking",
    G6.slot && G6.prefill.view === "addcoin" && G6.prefill.year !== "" && G6.prefill.banner && !G6.dialog && G6.view === "dashboard", G6);

  // ---------- G7 Add Coin editing a Staging draft ---------------------------
  const G7 = await page.evaluate(async () => {
    const L = __lg; L.install();
    const draft = { type: COIN_DRAFT_TYPE, collectionID: "AY-00777", status: COIN_DRAFT_STATUS.DRAFT,
      denom: "10C", year: "1916", mint: "D", description: "Mercury Dime", photos: [], receiptPhoto: "" };
    await L.mock.uploadJson(coinDraftFolder("AY-00777") + "/coin.json", draft);
    const opened = await beginCoinDraftEdit("AY-00777"); await L.sleep(80);
    const loaded = { view: L.view(), year: document.getElementById("year").value };
    L.closeDrawer(); await L.sleep(40);
    const cleanDialog = L.guardOpen();
    const cleanView = L.view();
    await beginCoinDraftEdit("AY-00777"); await L.sleep(80);
    return { opened, loaded, cleanDialog, cleanView };
  });
  await page.fill("#year", "1917");
  const G7b = await page.evaluate(async () => {
    const L = __lg;
    L.closeDrawer(); await L.sleep(40);
    const d = L.dialog();
    L.clickGuard("Discard"); await L.sleep(60);
    return { d, view: L.view(), binding: editingCoinDraftId };
  });
  ok("G7a a Staging draft loaded into Add Coin is not an edit: Close Drawer leaves without asking",
    G7.opened && G7.loaded.view === "addcoin" && G7.loaded.year === "1916" && !G7.cleanDialog && G7.cleanView === "dashboard", G7);
  ok("G7b a change to the draft asks and names it (\"1 field on AY-00777\"); Discard drops the edit binding",
    G7b.d.open && /1 field on AY-00777 and/.test(G7b.d.body) && G7b.view === "dashboard" && !G7b.binding, G7b);

  // ---------- G8 Edit Set's child row asks before leaving -------------------
  const G8 = await page.evaluate(async () => {
    const L = __lg; L.install();
    const child = { id: "AY-00090-A", name: "1957 Proof Cent", denom: "1C", year: 1957, mint: "", originSetId: "AY-00090" };
    __setLiveCoinsForTest([L.coin, L.set, child]);
    await L.openEditSet();
    const row = document.querySelector("#editSetChildrenRows .album-card");
    if (!row) return { row: false };
    L.typeInto("editSetNotes", "box is dented");
    row.click(); await L.sleep(40);
    const d = L.dialog();
    const stillEdit = L.editSetOpen();
    L.clickGuard("Keep editing"); await L.sleep(30);
    row.click(); await L.sleep(40);
    L.clickGuard("Discard"); await L.sleep(60);
    return { row: true, d, stillEdit, nowDetail: L.detailOpen() && !L.editSetOpen(), current: currentBrowseCoin && currentBrowseCoin.id };
  });
  ok("G8 Edit Set's \"Coins in this Set\" row asks first; Discard opens the child",
    G8.row && G8.d.open && /1 field on AY-00090/.test(G8.d.body) && G8.stillEdit && G8.nowDetail && G8.current === "AY-00090-A", G8);

  // ---------- G9 navigate during a Save is locked -----------------------------
  const G9 = await page.evaluate(async () => {
    const L = __lg; L.install();
    await L.openEditCoin();
    editSaveInFlight = true;
    let r;
    try { r = navigate("dashboard"); } finally { editSaveInFlight = false; }
    await L.sleep(30);
    return { r, toast: L.toast(), view: L.view(), edit: L.editOpen(), dialog: L.guardOpen() };
  });
  ok("G9 navigate() while a Save runs leaves nothing and toasts \"Still saving — wait for it to finish\"",
    G9.r === false && G9.toast === "Still saving — wait for it to finish" && G9.view === "browse" && G9.edit && !G9.dialog, G9);

  // ---------- H1 one history entry, never stacked ---------------------------
  const H1 = await page.evaluate(async () => {
    const L = __lg; L.install(); await L.sleep(200);
    // Count the guard's own pushes (history.length can't tell a push from a
    // replaced forward entry).
    let pushes = 0;
    const realPush = history.pushState.bind(history);
    history.pushState = (st, t, u) => { if (st && st.coinLeaveGuard) pushes++; return realPush(st, t, u); };
    const topBefore = L.guardTop();
    try {
      await L.openEditCoin(); await L.sleep(60);
      var afterOpen = pushes;
      // Redraws and Back-target resets must not push again.
      photoHostRenders["AY-00099"].render();
      setNavBack(() => leaveBrowseEditGuarded());
      L.openAll("browseEditPhotosSections");
      showBrowseEditView(L.coin); // re-opening the same form
      await L.sleep(60);
    } finally { history.pushState = realPush; }
    return { topBefore, afterOpen, afterRedraw: pushes, top: L.guardTop() };
  });
  ok("H1a opening Edit Coin pushes exactly one history entry, on top", !H1.topBefore && H1.afterOpen === 1 && H1.top, H1);
  ok("H1b redraws, Back-target resets and re-opening the form push nothing more", H1.afterRedraw === 1, H1);

  // ---------- H2 device Back, nothing unsaved -------------------------------
  const H2 = await page.evaluate(async () => {
    const L = __lg;
    await L.back();
    return { dialog: L.guardOpen(), detail: L.detailOpen(), edit: L.editOpen(), view: L.view(), top: L.guardTop() };
  });
  ok("H2 device Back with nothing unsaved leaves Edit Coin for the coin's page, as the in-app Back does",
    !H2.dialog && H2.detail && !H2.edit && H2.view === "browse" && !H2.top, H2);

  // ---------- H3 device Back, something unsaved -----------------------------
  const H3 = await page.evaluate(async () => {
    const L = __lg; L.install(); await L.sleep(200);
    await L.openEditCoin(); await L.sleep(60);
    L.typeInto("browseEditNotes", "Bought at the show");
    const len = history.length;
    await L.back();
    const d1 = L.dialog();
    const stayed = L.editOpen();
    L.clickGuard("Keep editing"); await L.sleep(60);
    const rearmed = { top: L.guardTop(), edit: L.editOpen(), text: document.getElementById("browseEditNotes").value };
    await L.back();
    const d2 = L.dialog();
    L.patches = [];
    L.clickGuard("Discard"); await L.sleep(80);
    return { len, d1, stayed, rearmed, d2, detail: L.detailOpen(), edit: L.editOpen(), top: L.guardTop(), writes: L.patches.length,
      lenAfter: history.length };
  });
  ok("H3a device Back on Edit Coin with a typed field asks with the same dialog",
    H3.d1.open && /1 field on AY-00099/.test(H3.d1.body) && DIALOG_BODY.test(H3.d1.body) && H3.stayed, H3);
  ok("H3b Keep editing stays, keeps the text and re-arms the guard", H3.rearmed.top && H3.rearmed.edit && H3.rearmed.text === "Bought at the show", H3);
  ok("H3c the next device Back asks again; Discard leaves for the coin's page and writes nothing",
    H3.d2.open && H3.detail && !H3.edit && !H3.top && H3.writes === 0, H3);

  // ---------- H4 in-app Back steps back over the entry ----------------------
  const H4 = await page.evaluate(async () => {
    const L = __lg; L.install(); await L.sleep(200);
    await L.openEditCoin(); await L.sleep(60);
    const armed = L.guardTop();
    L.chromeBack(); await L.sleep(200);
    const afterBack = { top: L.guardTop(), detail: L.detailOpen(), dialog: L.guardOpen() };
    // Close Drawer from Edit Coin likewise.
    await L.openEditCoin(); await L.sleep(60);
    const armed2 = L.guardTop();
    L.closeDrawer(); await L.sleep(200);
    return { armed, afterBack, armed2, afterDrawer: { top: L.guardTop(), view: L.view() } };
  });
  ok("H4a the chrome Back steps back over the entry (it is no longer on top)", H4.armed && !H4.afterBack.top && H4.afterBack.detail && !H4.afterBack.dialog, H4);
  ok("H4b Close Drawer steps back over it too", H4.armed2 && !H4.afterDrawer.top && H4.afterDrawer.view === "dashboard", H4);

  // ---------- H5 device Back inside the photo viewer -------------------------
  const H5 = await page.evaluate(async () => {
    const L = __lg; L.install(); await L.sleep(200);
    const host = await L.openEditCoin(); await L.sleep(60);
    L.typeInto("browseEditNotes", "Bought at the show");
    const photo = host.querySelector('.gc-thumb[data-file="AY-00099_reference_01.jpg"] .gc-img');
    if (!photo) return { photo: false };
    photo.click(); await L.sleep(80);
    const viewerOpen = mediaViewerIsOpen();
    const viewerTop = !!(history.state && history.state.mediaViewer);
    await L.back(); await L.sleep(60);
    return { photo: true, viewerOpen, viewerTop, after: { viewer: mediaViewerIsOpen(), edit: L.editOpen(), dialog: L.guardOpen(), top: L.guardTop() } };
  });
  ok("H5 device Back inside the photo viewer closes only the viewer: Edit Coin stays, no dialog, the guard still armed",
    H5.photo && H5.viewerOpen && H5.viewerTop && !H5.after.viewer && H5.after.edit && !H5.after.dialog && H5.after.top, H5);
  // The viewer's own Close button behaves the same way.
  const H5b = await page.evaluate(async () => {
    const L = __lg;
    const host = document.getElementById("browseEditPhotosSections");
    host.querySelector('.gc-thumb[data-file="AY-00099_reference_01.jpg"] .gc-img').click(); await L.sleep(80);
    document.getElementById("mediaViewerCloseBtn").click(); await L.sleep(200);
    return { viewer: mediaViewerIsOpen(), edit: L.editOpen(), dialog: L.guardOpen(), top: L.guardTop() };
  });
  ok("H5b closing the viewer with its ✕ leaves Edit Coin and the guard as they were", !H5b.viewer && H5b.edit && !H5b.dialog && H5b.top, H5b);

  // ---------- H6 Manage Photos and Add Coin arm; a Save that leaves -----------
  const H6 = await page.evaluate(async () => {
    const L = __lg; L.install(); await L.sleep(200);
    await L.openManageCoin(); await L.sleep(60);
    const manage = L.guardTop();
    await L.back();
    const manageBack = { view: L.view(), dialog: L.guardOpen() };
    L.install(); await L.sleep(200);
    navigate("addcoin"); await L.sleep(60);
    const add = L.guardTop();
    await L.back();
    const addBack = { view: L.view(), dialog: L.guardOpen() };
    // Edit Coin: change a field, Save Changes (it leaves for the coin's page).
    L.install(); await L.sleep(200);
    await L.openEditCoin(); await L.sleep(60);
    L.typeInto("browseEditNotes", "Bought at the show");
    document.getElementById("browseEditSaveBtn").click();
    await L.waitFor(() => !L.editOpen(), 3000); await L.sleep(250);
    return { manage, manageBack, add, addBack, saved: { detail: L.detailOpen(), top: L.guardTop(), dialog: L.guardOpen() } };
  });
  ok("H6a Manage Photos arms the guard; device Back with nothing unsaved goes where its Back goes",
    H6.manage && H6.manageBack.view === "needsdbcoins" && !H6.manageBack.dialog, H6);
  ok("H6b Add Coin arms the guard; device Back with nothing typed goes to Acquisitions",
    H6.add && H6.addBack.view === "acquisitions" && !H6.addBack.dialog, H6);
  ok("H6c a Save that leaves Edit Coin steps back over the entry", H6.saved.detail && !H6.saved.top && !H6.saved.dialog, H6);

  // ---------- H7 an entry left by a reload is not mistaken for ours ----------
  const H7 = await page.evaluate(async () => {
    const L = __lg; L.install(); await L.sleep(200);
    // A reload on an editing screen leaves the page on top of an old entry.
    history.pushState({ coinLeaveGuard: "left-by-a-reload" }, "");
    await L.openEditCoin(); await L.sleep(60);
    const armed = L.guardTop();
    await L.back();
    return { armed, dialog: L.guardOpen(), detail: L.detailOpen(), edit: L.editOpen() };
  });
  ok("H7 an old guard entry (left by a reload) doesn't swallow Back: one device Back still leaves Edit Coin",
    H7.armed && !H7.dialog && H7.detail && !H7.edit, H7);

  // ---------- H8 device Back with the chooser or the crop tool open ----------
  const H8 = await page.evaluate(async () => {
    const L = __lg; L.install(); await L.sleep(200);
    const host = await L.openEditCoin(); await L.sleep(60);
    const plus = L.plusIn(host, /Reference/);
    plus.click(); await L.sleep(30);
    const chooserOpened = L.chooserOpen();
    await L.back();
    const afterChooser = { chooser: L.chooserOpen(), edit: L.editOpen(), top: L.guardTop(), dialog: L.guardOpen() };
    // Into the crop tool, then Back.
    const file = await L.jpeg();
    plus.click(); await L.sleep(30);
    document.querySelector('#imageSourceChooser .image-chooser-btn[data-source="files"]').click();
    const input = document.getElementById("imageChooserFilesInput");
    const dt = new DataTransfer(); dt.items.add(file);
    input.files = dt.files; input.dispatchEvent(new Event("change", { bubbles: true }));
    const cropOpen = await L.waitFor(() => !document.getElementById("bgCropOverlay").classList.contains("hidden"));
    await L.back();
    return { chooserOpened, afterChooser, cropOpen,
      afterCrop: { crop: !document.getElementById("bgCropOverlay").classList.contains("hidden"), edit: L.editOpen(),
        top: L.guardTop(), dialog: L.guardOpen(), pending: pendingPhotoCount("AY-00099") } };
  });
  ok("H8a device Back with the image chooser open closes the chooser and stays on Edit Coin",
    H8.chooserOpened && !H8.afterChooser.chooser && H8.afterChooser.edit && H8.afterChooser.top && !H8.afterChooser.dialog, H8);
  ok("H8b device Back with the crop tool open cancels the crop and stays on Edit Coin (nothing added)",
    H8.cropOpen && !H8.afterCrop.crop && H8.afterCrop.edit && H8.afterCrop.top && !H8.afterCrop.dialog && H8.afterCrop.pending === 0, H8);

  // ---------- E1 label changed, then ✕ the same photo, then Save -------------
  const E1 = await page.evaluate(async () => {
    const L = __lg; L.install();
    const host = await L.openEditCoin();
    const thumb = host.querySelector('.gc-thumb[data-file="AY-00099_reference_01.jpg"]');
    const line = thumb && thumb.querySelector(".gc-label-line");
    if (!line) return { line: false };
    line.click();
    const input = document.getElementById("mediaViewerLabelInput");
    input.value = "Changed label"; input.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("mediaViewerLabelDone").click(); await L.sleep(250);
    const typed = (galleryFor("AY-00099").find(e => e.storedFilename === "AY-00099_reference_01.jpg") || {}).caption;
    thumb.querySelector(".gc-remove").click(); await L.sleep(30);
    L.clickGuard("Remove"); await L.sleep(40);
    L.patches = []; L.clearToast();
    document.getElementById("browseEditSaveBtn").click();
    await L.waitFor(() => !L.editOpen(), 3000); await L.sleep(150);
    const rowIdx = 2; // sheet row 3 held PH-00002
    const row = L.mock._grids.Photos[rowIdx];
    const photoPatches = L.patches.filter(p => p.indexOf("Photos!") === 0);
    const detachAt = photoPatches.findIndex(p => /Photos!A3:/.test(p));
    const after = detachAt === -1 ? [] : photoPatches.slice(detachAt + 1);
    return { line: true, typed, toast: L.toast(), row, photoPatches, after,
      labelCells: photoPatches.filter(p => /Photos!F\d+:F\d+/.test(p)) };
  });
  ok("E1a the toast reports the removal only (\"1 photo removed\", no label)",
    E1.line && E1.typed === "Changed label" && /^Saved AY-00099 — 1 photo removed\.$/.test(E1.toast), E1);
  ok("E1b the Photos row ends fully blank", Array.isArray(E1.row) && E1.row.every(c => c === "" || c == null), E1);
  ok("E1c no Label cell is written, before or after the detach", E1.labelCells.length === 0 && E1.after.every(p => !/Photos!F/.test(p)), E1);
}, module);
