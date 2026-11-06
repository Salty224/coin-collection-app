// Guided Obverse / Reverse crop (Build A, claude/guided-obverse-reverse-crop).
//
// WHY. A Holder or Reference image added in a session offers to crop the
// coin's Obverse / Reverse out of itself, so one photo of a slab can fill four
// slots. Add Coin, the Staging-draft edit and Edit Coin only. Everything waits
// for Save; the crops are ordinary pending entries.
//
//   A  where the offer appears: Holder front -> Obverse, Holder back ->
//      Reverse, Reference -> Obverse then Reverse; "Replace" wording when the
//      side exists; never for Obverse / Reverse / Other picks, Manage Photos,
//      Edit Set, a redraw, a Recrop or a Discard
//   B  Skip writes nothing; Crop leaves a pending entry and writes nothing;
//      a cancelled crop counts as Skip (the next offer still comes)
//   C  Replace: ✕ on the crop puts the previous side back (owned and draft)
//   D  one Save writes the holder and both crops: names, rows, distinct
//      PhotoIDs; a failed crop does not stop the others and its retry sends
//      only what is missing
//   E  Discard drops all of it; ✕ / Replace of the holder after a crop leaves
//      the crop alone
//   F  pending Holder / Reference / Other picks are sources in Crop from
//      another photo (owned); a ✕'d one is not
//   G  the (z) rules: change then undo is clean
//   H  Staging-draft edit and Add Coin new draft: offer, crop, save listing

const { defineSuite } = require("./harness");

const HEADER = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "", "OriginalFilename"];
const ALL_HEADERS = ["CollectionID", "Year", "MintMark", "Denomination", "Variety", "Description",
  "Value", "Cost", "Shipping", "Seller_Link", "PurchaseDate", "StorageLocation", "Container",
  "Grade", "GradeSource", "Designation", "SerNo", "CACBean", "Remarks", "Reviewed", "LastModified",
  "Finish", "CoinID", "Status", "SaleDate", "SalePrice", "Buyer", "Platform"];

const CATALOG = [
  { denom: "5C", year: 1938, mint: "D", variety: "", description: "Buffalo Nickel",
    finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0,
    coinId: "C-1938-D-5C-01", composition: "75% Copper, 25% Nickel" }
];
const DID = "AY-00754";
const BASE_DRAFT = {
  type: "coin", version: 1, collectionID: DID, status: "Draft",
  denom: "5C", category: "", year: "1938", mint: "D", variety: "",
  description: "Buffalo Nickel", finish: "Business Strike", designation: "",
  errorDesc: "", grade: "PR-66", gradeSource: "PCGS", serNo: "44556677",
  cacBean: "", cost: 30, shippingCost: 5, purchaseDate: "2026-10-20",
  vendor: "Seller", storageLocation: "Safe", container: "",
  assignAlbum: "", remarks: "", itemNumber: "", gsid: "",
  coinId: "C-1938-D-5C-01", matchedHow: "single",
  photos: [], receiptPhoto: "", researchNote: "", allRowWritten: false, forceAdded: false,
  filesMovedOnPromotion: false, savedVia: "staging", createdDate: "2026-10-20T17:57:36Z"
};

module.exports = defineSuite("guided-crop", async ({ openApp, check, selfCheck, PHONE }) => {
  selfCheck(check);
  const ok = (label, cond, data) => check(label, !!cond, data);
  const page = await openApp(PHONE);

  await page.evaluate(({ HEADER, ALL_HEADERS }) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
    const open = (id) => { const o = document.getElementById(id); return !!o && !o.classList.contains("hidden"); };
    window.__g = {
      sleep, open,
      coin: { id: "AY-00099", name: "1916-D Mercury Dime", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" },
      set: { id: "AY-00090", name: "1957 Proof Set", denom: "Multiple", year: 1957, mint: "", category: "Proof Set" },
      uploads: [], failNames: {}, calls: 0,
      async waitFor(fn, ms) { const end = Date.now() + (ms || 3000); while (Date.now() < end) { if (fn()) return true; await sleep(30); } return !!fn(); },
      async jpeg(color) {
        const c = document.createElement("canvas"); c.width = 300; c.height = 300;
        const x = c.getContext("2d"); x.fillStyle = color || "#2a6"; x.fillRect(0, 0, 300, 300);
        x.fillStyle = "#da3"; x.beginPath(); x.arc(150, 150, 110, 0, Math.PI * 2); x.fill();
        return await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
      },
      async file(color) { return new File([await this.jpeg(color)], "pick.jpg", { type: "image/jpeg" }); },
      pick(input, file) { const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files; input.dispatchEvent(new Event("change", { bubbles: true })); },
      install() {
        const self = this;
        const ov0 = document.getElementById("writeGuardOverlay"); if (ov0) ov0.classList.add("hidden");
        discardUnsavedPhotoEdits(); browseEditTouchedFields.clear();
        navigateNow("dashboard");
        const allRow = ["AY-00099", 1916, "D", "10C", "", "Mercury Dime", 40, 30, 0, "", null,
          "Safe", "", "VF-20", "Owner", "", "", "", "", "", null,
          "Business Strike", "C-1916-D-10C-01", "Owned", null, null, "", ""];
        const mock = createMockGraphClient({ sheets: {
          All: [ALL_HEADERS, allRow],
          Photos: [HEADER,
            ["PH-00001", "AY-00099", "Obverse", "", "AY-00099_obverse_cropped.jpg", "", 46000, "", ""],
            ["PH-00002", "AY-00099", "Reference", "", "AY-00099_reference_01.jpg", "PCGS photo", 46000, "", ""],
            ["PH-00003", "AY-00099", "Other", "", "AY-00099_other_01.jpg", "", 46001, "", ""],
            ["", "", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", "", ""]] } });
        this.mock = mock; this.uploads = []; this.failNames = {}; this.calls = 0;
        __setGraphClientForTest(new Proxy(mock, { get(t, k) {
          const v = t[k];
          if (typeof v !== "function") return v;
          return async (...a) => {
            self.calls++;
            if (k === "uploadFile") {
              const name = String(a[0]).split("/").pop();
              if (self.failNames[name]) throw new Error("offline");
              self.uploads.push(name);
            }
            return v.apply(t, a);
          };
        } }));
        __resetSheetHeaderMapsForTest(); __resetAllHeaderMapForTest();
        __setAddCoinWriteEnabledForTest(true); __setBrowseEditWriteEnabledForTest(true);
        __setLiveCoinsForTest([this.coin, this.set]);
        __setStoredPhotosForTest({ "AY-00099": [
          { photoId: "PH-00001", photoType: "Obverse", galleryType: "obverse", subGroupId: "", filename: "AY-00099_obverse_cropped.jpg", originalFilename: "", label: "" },
          { photoId: "PH-00002", photoType: "Reference", galleryType: "reference", subGroupId: "", filename: "AY-00099_reference_01.jpg", originalFilename: "", label: "PCGS photo" },
          { photoId: "PH-00003", photoType: "Other", galleryType: "other", subGroupId: "", filename: "AY-00099_other_01.jpg", originalFilename: "", label: "" }
        ] });
        const url = () => URL.createObjectURL(new Blob([new Uint8Array([1])], { type: "image/jpeg" }));
        ["AY-00099_obverse_cropped.jpg", "AY-00099_reference_01.jpg", "AY-00099_other_01.jpg"].forEach(f => __setCoinPhotoCacheForTest(f, url()));
        delete galleryStore["AY-00099"];
        closeImageSourceChooser();
        if (ov0) ov0.classList.add("hidden");
      },
      guardOpen() { return open("writeGuardOverlay"); },
      guardTitle() { return this.guardOpen() ? document.getElementById("writeGuardTitle").textContent : ""; },
      guardBody() { return this.guardOpen() ? document.getElementById("writeGuardBody").textContent : ""; },
      guardButtons() { return [...document.querySelectorAll("#writeGuardBtns button")].map(b => b.textContent.trim()); },
      clickGuard(label) {
        const b = [...document.querySelectorAll("#writeGuardBtns button")].find(x => x.textContent.trim() === label);
        if (!b) return false; b.click(); return true;
      },
      closeGuard() { document.getElementById("writeGuardOverlay").classList.add("hidden"); document.getElementById("writeGuardBtns").innerHTML = ""; },
      openAll(hostId) {
        const host = document.getElementById(hostId);
        [...host.querySelectorAll(".accordion-header")].forEach(h => { if (h.getAttribute("aria-expanded") !== "true") h.click(); });
        return host;
      },
      closeOverlays() { if (typeof closeBgCrop === "function") closeBgCrop(); document.getElementById("photoAdjustOverlay").classList.add("hidden"); },
      async openEditCoin() {
        navigate("browse"); showBrowseDetail(this.coin); showBrowseEditView(this.coin);
        await loadBrowseEditSnapshot(this.coin);
        await sleep(120);
        const oh = document.getElementById("editCoinPhotosHeader");
        if (oh.getAttribute("aria-expanded") !== "true") oh.click();
        this.closeOverlays();
        return this.openAll("browseEditPhotosSections");
      },
      editHost() { return this.openAll("browseEditPhotosSections"); },
      openManageCoin() {
        openManagePhotos({ id: this.coin.id, name: "x", meta: this.coin.id, kind: "coin", backTo: () => {} });
        this.closeOverlays();
        return this.openAll("managePhotosSections");
      },
      openEditSet() {
        navigate("browse"); showBrowseDetail(this.set); showBrowseEditSetView(this.set);
        const oh = document.getElementById("editSetPhotosHeader");
        if (oh.getAttribute("aria-expanded") !== "true") oh.click();
        this.closeOverlays();
        return this.openAll("editSetPhotosSections");
      },
      section(host, re) {
        const h = [...host.querySelectorAll(".accordion-header")].find(x => re.test(x.textContent));
        if (!h) return null;
        if (h.getAttribute("aria-expanded") !== "true") h.click();
        return h.nextElementSibling;
      },
      slot(host, re, i) { const b = this.section(host, re); return b ? b.querySelectorAll(".sg-photo-slot")[i] : null; },
      trigger(slot) { return slot && slot.querySelector('[data-act="add"], [data-act="replace"]'); },
      refAdd(host) { const b = this.section(host, /Reference photos/); return b && b.querySelector('[data-role="add"]'); },
      // Chooser -> Files -> the crop tool(s), to a finished pick.
      async pickVia(trigger, flip) {
        if (!trigger) return false;
        trigger.click();
        const btn = document.querySelector('#imageSourceChooser .image-chooser-btn[data-source="files"]');
        if (!btn) return false;
        btn.click();
        this.pick(document.getElementById("imageChooserFilesInput"), await this.file());
        return this.finishCrop(flip);
      },
      async finishCrop(flip) {
        if (!(await this.waitFor(() => open("bgCropOverlay")))) return false;
        document.getElementById("bgCropUseBtn").click();
        // Stage 2 (the circle adjuster, flip sources only) opens in the same task that hides the
        // crop overlay, so wait for the overlay to go, then look. No timed wait for something that may never open.
        await this.waitFor(() => !open("bgCropOverlay"), 10000);
        if (flip && open("photoAdjustOverlay")) document.getElementById("photoAdjustUseBtn").click();
        await sleep(80);
        return true;
      },
      // The offer's Crop button, then the crop tool to a finished crop.
      async takeCrop() {
        if (!this.clickGuard("Crop")) return false;
        const ok = await this.finishCrop(true);
        await sleep(80);
        return ok;
      },
      async cancelCrop() {
        if (!this.clickGuard("Crop")) return false;
        if (!(await this.waitFor(() => open("bgCropOverlay")))) return false;
        document.getElementById("bgCropCancelBtn").click();
        await sleep(80);
        return true;
      },
      pendings(id) { return galleryFor(id).filter(e => e.pendingSave).map(e => e.type + (e.pendingReplaces ? "(replaces)" : "")).sort(); },
      photoRows(id) { return this.mock._grids.Photos.filter(r => r[1] === id && r[0]).map(r => r[0] + ":" + r[2] + ":" + r[4]); },
      async save() { document.getElementById("browseEditSaveBtn").click(); await sleep(60); await this.waitFor(() => !editSaveInFlight, 4000); await sleep(150); },
      saveDimmed() { return document.getElementById("browseEditSaveBtn").classList.contains("is-clean"); },
      toast() { const t = document.getElementById("toast"); return t.classList.contains("show") ? t.textContent : ""; }
    };
  }, { HEADER, ALL_HEADERS });

  // ---------- A. Where the offer appears (Edit Coin, owned) ------------------
  const A = await page.evaluate(async () => {
    const G = __g; G.install();
    const out = {};
    let host = await G.openEditCoin();
    // Holder front -> Obverse offer; the coin already has an Obverse -> Replace.
    out.f = await G.pickVia(G.trigger(G.slot(host, /Holder/, 0)), false);
    out.fTitle = G.guardTitle(); out.fButtons = G.guardButtons(); out.fBody = G.guardBody();
    G.clickGuard("Skip"); await G.sleep(50);
    // Holder back -> Reverse offer (no Reverse yet -> Crop wording).
    host = G.editHost();
    out.b = await G.pickVia(G.trigger(G.slot(host, /Holder/, 1)), false);
    out.bTitle = G.guardTitle();
    G.clickGuard("Skip"); await G.sleep(50);
    out.afterBackSkip = G.guardOpen();
    // Reference add -> Obverse offer, then the Reverse offer.
    host = G.editHost();
    out.r = await G.pickVia(G.refAdd(host), false);
    out.r1 = G.guardTitle();
    G.clickGuard("Skip"); await G.sleep(50);
    out.r2 = G.guardTitle(); out.r2Body = G.guardBody();
    G.clickGuard("Skip"); await G.sleep(50);
    out.rDone = G.guardOpen();
    out.pendingAfterSkips = G.pendings("AY-00099");
    out.uploadsAfterSkips = G.uploads.length;
    // Obverse, Reverse and Other picks never offer anything.
    host = G.editHost();
    out.obv = await G.pickVia(G.trigger(G.slot(host, /Obverse &/, 0)), true);
    out.obvOffer = G.guardOpen();
    host = G.editHost();
    const other = G.section(host, /Other photos/);
    out.oth = await G.pickVia(other && other.querySelector('[data-role="add"]'), false);
    out.othOffer = G.guardOpen();
    // A redraw and a Recrop do not re-offer.
    host = G.editHost();
    const adj = G.slot(host, /Obverse &/, 0).querySelector('[data-act="adjust"]');
    if (adj) { adj.click(); await G.sleep(100); await G.finishCrop(true); }
    out.recropOffer = G.guardOpen();
    G.editHost();
    out.redrawOffer = G.guardOpen();
    // A Replace of the holder is a new image, so it offers.
    host = G.editHost();
    out.rep = await G.pickVia(G.trigger(G.slot(host, /Holder/, 0)), false);
    out.repTitle = G.guardTitle();
    G.closeGuard();
    return out;
  });
  ok("A1 Holder front adds, then offers to REPLACE the Obverse that is there", A.f && /^Replace the Obverse from this photo\?$/.test(A.fTitle), A);
  ok("A2 the offer has Skip and Crop, names the photo, says nothing is written until Save",
    A.fButtons.join() === "Skip,Crop" && /Holder — front/.test(A.fBody) && /Nothing is written until you save/.test(A.fBody), A);
  ok("A3 Holder back offers the Reverse (Crop wording: no Reverse yet)", A.b && A.bTitle === "Crop the Reverse from this photo?", A);
  ok("A4 nothing else is offered after a single-side Skip", A.afterBackSkip === false, A);
  ok("A5 a Reference offers the Obverse first (Replace: one is there)", A.r && A.r1 === "Replace the Obverse from this photo?", A);
  ok("A6 ... then the Reverse, and says nothing more after that", A.r2 === "Crop the Reverse from this photo?" && A.rDone === false, A);
  ok("A7 skipping everything leaves only the three picks and no crop",
    A.pendingAfterSkips.join() === "reference,slab_obverse,slab_reverse", A);
  ok("A7b ... and nothing was uploaded", A.uploadsAfterSkips === 0, A);
  ok("A8 an Obverse pick offers nothing", A.obv && A.obvOffer === false, A);
  ok("A9 an Other pick offers nothing", A.oth && A.othOffer === false, A);
  ok("A10 a Recrop and a redraw offer nothing", A.recropOffer === false && A.redrawOffer === false, A);
  ok("A11 Replacing the holder is a new image: it offers again", A.rep && A.repTitle === "Replace the Obverse from this photo?", A);

  // ---------- A2. Never on Manage Photos or Edit Set -------------------------
  const A2 = await page.evaluate(async () => {
    const G = __g; G.install();
    const out = {};
    let host = G.openManageCoin();
    out.m = await G.pickVia(G.trigger(G.slot(host, /Holder/, 0)), false);
    out.mOffer = G.guardOpen();
    out.mRef = await G.pickVia(G.refAdd(host), false);
    out.mRefOffer = G.guardOpen();
    discardUnsavedPhotoEdits();
    host = G.openEditSet();
    out.setSections = [...host.querySelectorAll(".accordion-header")].map(h => h.textContent.trim());
    const ogp = G.section(host, /Package/);
    out.s = await G.pickVia(ogp && ogp.querySelector('[data-role="add"]'), false);
    out.sOffer = G.guardOpen();
    discardUnsavedPhotoEdits();
    return out;
  });
  ok("A12 Manage Photos: a Holder pick and a Reference pick offer nothing", A2.m && A2.mRef && !A2.mOffer && !A2.mRefOffer, A2);
  ok("A13 Edit Set: a pick offers nothing", A2.s && !A2.sOffer, A2);

  // ---------- B / C / D / E. Crop, undo, Save, failure, Discard --------------
  const B = await page.evaluate(async () => {
    const G = __g; G.install();
    const out = {};
    let host = await G.openEditCoin();
    const callsAtStart = G.calls;
    // Holder back -> Reverse crop.
    out.b = await G.pickVia(G.trigger(G.slot(host, /Holder/, 1)), false);
    out.bOffer = G.guardTitle();
    out.bCrop = await G.takeCrop();
    out.afterBackCrop = G.pendings("AY-00099");
    out.uploadsBeforeSave = G.uploads.length;
    out.callsBeforeSave = G.calls - callsAtStart;
    const rev = galleryFor("AY-00099").find(e => e.type === "reverse");
    out.revPending = !!(rev && rev.pendingSave && !rev.pendingReplaces && rev.blob && !rev.rawUrl);
    // Holder front -> Obverse REPLACE; the crop is a Replace of the stored one.
    host = G.editHost();
    out.f = await G.pickVia(G.trigger(G.slot(host, /Holder/, 0)), false);
    out.fTitle = G.guardTitle();
    out.fCrop = await G.takeCrop();
    const obv = galleryFor("AY-00099").find(e => e.type === "obverse");
    out.obvReplaces = !!(obv && obv.pendingSave && obv.pendingReplaces && obv.pendingReplaces.storedFilename === "AY-00099_obverse_cropped.jpg");
    out.noExtraAsk = G.guardOpen();
    // ✕ on the Obverse crop puts the stored one back (undo dialog).
    host = G.editHost();
    const obvSlot = G.slot(host, /Obverse &/, 0);
    const rm = obvSlot.querySelector('[data-act="remove"]');
    rm.click(); await G.sleep(40);
    out.undoTitle = G.guardTitle();
    G.clickGuard("Put it back"); await G.sleep(60);
    const back = galleryFor("AY-00099").find(e => e.type === "obverse");
    out.undone = !!(back && !back.pendingSave && back.storedFilename === "AY-00099_obverse_cropped.jpg");
    // Take the Obverse crop again, then Save everything in one go.
    host = G.editHost();
    out.f2 = await G.pickVia(G.trigger(G.slot(host, /Holder/, 0)), false);
    out.f2Crop = await G.takeCrop();
    out.pendingBeforeSave = G.pendings("AY-00099");
    G.uploads.length = 0;
    await G.save();
    out.uploads = G.uploads.slice();
    out.rows = G.photoRows("AY-00099");
    out.pendingAfter = G.pendings("AY-00099");
    const ids = G.mock._grids.Photos.filter(r => r[0]).map(r => r[0]);
    out.idsDistinct = new Set(ids).size === ids.length;
    out.toast = G.toast();
    return out;
  });
  ok("B1 Holder back + Crop leaves a pending Reverse (no raw, no replace), the holder pending too",
    B.b && /^Crop the Reverse/.test(B.bOffer) && B.bCrop && B.revPending && B.afterBackCrop.join() === "reverse,slab_reverse", B);
  ok("B2 nothing uploaded or written before Save (no Graph call at all)", B.uploadsBeforeSave === 0 && B.callsBeforeSave === 0, B);
  ok("B3 a Replace offer: Crop goes straight in, no second 'Replace?' question", B.f && B.fCrop && B.noExtraAsk === false, B);
  ok("B4 the Obverse crop replaces the stored Obverse (pendingReplaces)", B.obvReplaces, B);
  ok("C1 ✕ on the crop asks 'Put the previous photo back?' and restores the stored Obverse", /Put the previous photo back/.test(B.undoTitle) && B.undone, B);
  ok("D1 one Save writes the holder front, holder back, Obverse and Reverse",
    B.uploads.length === 4 && B.uploads.includes("AY-00099_slab_obverse.jpg") && B.uploads.includes("AY-00099_slab_reverse.jpg") &&
    B.uploads.includes("AY-00099_obverse_cropped_02.jpg") && B.uploads.includes("AY-00099_reverse_cropped.jpg"), B);
  ok("D2 the Photos rows: Obverse replaced in place (PH-00001), three new rows, PhotoIDs distinct",
    B.rows.some(r => r === "PH-00001:Obverse:AY-00099_obverse_cropped_02.jpg") &&
    B.rows.some(r => /:Slab_Obverse:/.test(r)) && B.rows.some(r => /:Slab_Reverse:/.test(r)) &&
    B.rows.some(r => /:Reverse:AY-00099_reverse_cropped\.jpg$/.test(r)) && B.idsDistinct, B);
  ok("D3 nothing is left pending after the Save", B.pendingAfter.length === 0, B);

  // ---------- D4 failure of one crop; E Discard and holder edits -------------
  const D = await page.evaluate(async () => {
    const G = __g; G.install();
    const out = {};
    let host = await G.openEditCoin();
    await G.pickVia(G.trigger(G.slot(host, /Holder/, 1)), false);
    await G.takeCrop();
    host = G.editHost();
    await G.pickVia(G.trigger(G.slot(host, /Holder/, 0)), false);
    await G.takeCrop();
    G.failNames["AY-00099_reverse_cropped.jpg"] = true;
    G.uploads.length = 0;
    await G.save();
    out.firstUploads = G.uploads.slice();
    out.pendingAfterFail = G.pendings("AY-00099");
    const rev = galleryFor("AY-00099").find(e => e.type === "reverse");
    out.revError = !!(rev && rev.pendingSave && rev.uploadError);
    out.formOpen = document.getElementById("browseEditView").style.display !== "none";
    G.failNames = {}; G.uploads.length = 0;
    await G.save();
    out.retryUploads = G.uploads.slice();
    out.pendingAfterRetry = G.pendings("AY-00099");
    out.rowsAfter = G.photoRows("AY-00099");
    return out;
  });
  ok("D4 a failed crop does not stop the others (holder x2 and the Obverse saved)",
    D.firstUploads.length === 3 && !D.firstUploads.includes("AY-00099_reverse_cropped.jpg") && D.revError && D.formOpen, D);
  ok("D5 the retry sends only the Reverse and everything lands",
    D.retryUploads.join() === "AY-00099_reverse_cropped.jpg" && D.pendingAfterRetry.length === 0 &&
    D.rowsAfter.some(r => /:Reverse:AY-00099_reverse_cropped\.jpg$/.test(r)), D);

  const E = await page.evaluate(async () => {
    const G = __g; G.install();
    const out = {};
    let host = await G.openEditCoin();
    await G.pickVia(G.trigger(G.slot(host, /Holder/, 1)), false);
    await G.takeCrop();
    host = G.editHost();
    await G.pickVia(G.trigger(G.slot(host, /Holder/, 0)), false);
    await G.takeCrop();
    out.pending = G.pendings("AY-00099");
    // ✕ the holder front: the Obverse crop stays.
    host = G.editHost();
    G.slot(host, /Holder/, 0).querySelector('[data-act="remove"]').click(); await G.sleep(40);
    G.clickGuard("Remove"); await G.sleep(60);
    out.afterHolderX = G.pendings("AY-00099");
    // Replace the holder back: the Reverse crop stays; a new offer comes.
    host = G.editHost();
    await G.pickVia(G.trigger(G.slot(host, /Holder/, 1)), false);
    out.repOffer = G.guardTitle();
    G.clickGuard("Skip"); await G.sleep(40);
    out.afterHolderReplace = G.pendings("AY-00099");
    // Discard drops everything and restores the Obverse.
    discardUnsavedPhotoEdits();
    out.afterDiscard = G.pendings("AY-00099");
    const obv = galleryFor("AY-00099").find(e => e.type === "obverse");
    out.obvBack = !!(obv && obv.storedFilename === "AY-00099_obverse_cropped.jpg" && !obv.pendingSave);
    out.revGone = !galleryFor("AY-00099").some(e => e.type === "reverse");
    out.offerAfterDiscard = G.guardOpen();
    out.uploads = G.uploads.length;
    return out;
  });
  ok("E1 the two crops and two holders are pending", E.pending.join() === "obverse(replaces),reverse,slab_obverse,slab_reverse", E);
  ok("E2 ✕ on the holder leaves the Obverse crop alone", E.afterHolderX.includes("obverse(replaces)") && !E.afterHolderX.includes("slab_obverse"), E);
  ok("E3 Replacing the holder keeps the Reverse crop and offers again (now a Replace of that crop)", /^Replace the Reverse/.test(E.repOffer) && E.afterHolderReplace.includes("reverse"), E);
  ok("E4 Discard drops every pending entry, restores the stored Obverse, writes and offers nothing",
    E.afterDiscard.length === 0 && E.obvBack && E.revGone && !E.offerAfterDiscard && E.uploads === 0, E);

  // ---------- B5 a cancelled crop counts as Skip -----------------------------
  const B5 = await page.evaluate(async () => {
    const G = __g; G.install();
    const out = {};
    const host = await G.openEditCoin();
    out.r = await G.pickVia(G.refAdd(host), false);
    out.first = G.guardTitle();
    out.cancelled = await G.cancelCrop();
    out.second = G.guardTitle();
    G.clickGuard("Skip"); await G.sleep(40);
    out.pending = G.pendings("AY-00099");
    return out;
  });
  ok("B5 cancelling the crop tool counts as Skip: the Reverse offer still comes, nothing else is added",
    B5.r && B5.cancelled && /Obverse/.test(B5.first) && /Reverse/.test(B5.second) && B5.pending.join() === "reference", B5);

  // ---------- F. Pending sources in Crop from another photo ------------------
  const F = await page.evaluate(async () => {
    const G = __g; G.install();
    const out = {};
    let host = await G.openEditCoin();
    await G.pickVia(G.trigger(G.slot(host, /Holder/, 0)), false); G.clickGuard("Skip"); await G.sleep(40);
    await G.pickVia(G.refAdd(G.editHost()), false); G.clickGuard("Skip"); await G.sleep(30); G.clickGuard("Skip"); await G.sleep(40);
    host = G.editHost();
    const body = G.section(host, /Crop from another photo/);
    const tiles = () => [...G.section(G.editHost(), /Crop from another photo/).querySelectorAll(".crop-src-tile")];
    out.tiles = tiles().length;           // stored reference + stored other + holder pick + reference pick
    out.sources = cropSourceEntriesFor("AY-00099", null).map(e => e.type + (e.pendingSave ? "*" : ""));
    // Crop from the pending holder through the tile.
    const tile = tiles().find(t => /Holder — front/.test(t.getAttribute("aria-label") || ""));
    out.tileFound = !!tile;
    if (tile) {
      tile.click(); await G.sleep(40);
      G.clickGuard("Reverse"); await G.sleep(40);
      if (G.guardOpen()) G.clickGuard("Crop and replace");
      await G.finishCrop(true);
    }
    out.pendingReverse = galleryFor("AY-00099").some(e => e.type === "reverse" && e.pendingSave && e.blob);
    // A ✕'d holder is not a source.
    G.editHost().querySelector("#browseEditPhotosSections");
    const h = galleryFor("AY-00099").find(e => e.type === "slab_obverse");
    h.pendingRemove = true;
    out.afterX = cropSourceEntriesFor("AY-00099", null).some(e => e.type === "slab_obverse");
    h.pendingRemove = false;
    // One being saved right now is not.
    h.uploadPending = true;
    out.whileSaving = cropSourceEntriesFor("AY-00099", null).some(e => e.type === "slab_obverse");
    h.uploadPending = false;
    discardUnsavedPhotoEdits();
    return out;
  });
  ok("F1 pending Holder and Reference picks are sources next to the stored ones",
    F.sources.includes("slab_obverse*") && F.sources.includes("reference*") && F.sources.includes("reference") && F.sources.includes("other"), F);
  ok("F2 a pending holder's tile crops it into a pending Reverse, with no OneDrive read", F.tileFound && F.pendingReverse, F);
  ok("F3 a ✕'d pick and a pick being saved are not sources", F.afterX === false && F.whileSaving === false, F);

  // ---------- G. (z): change then undo is clean ------------------------------
  const Gz = await page.evaluate(async () => {
    const G = __g; G.install();
    const out = {};
    let host = await G.openEditCoin();
    await G.sleep(100);
    out.cleanAtStart = G.saveDimmed();
    await G.pickVia(G.trigger(G.slot(host, /Holder/, 1)), false);
    await G.takeCrop();
    await G.sleep(60);
    out.dirty = !G.saveDimmed();
    out.leaveCount = pendingPhotoCount("AY-00099");
    host = G.editHost();
    // Undo both: ✕ the crop (no previous side: it just goes), ✕ the holder.
    G.slot(host, /Obverse &/, 1).querySelector('[data-act="remove"]').click(); await G.sleep(40);
    G.clickGuard("Remove"); await G.sleep(60);
    host = G.editHost();
    G.slot(host, /Holder/, 1).querySelector('[data-act="remove"]').click(); await G.sleep(40);
    G.clickGuard("Remove"); await G.sleep(80);
    out.pendingAfter = G.pendings("AY-00099");
    out.cleanAgain = G.saveDimmed();
    return out;
  });
  ok("G1 Save starts dimmed, lights up with a holder and a crop, and counts both for the leave guard",
    Gz.cleanAtStart && Gz.dirty && Gz.leaveCount === 2, Gz);
  ok("G2 taking both off again makes the form clean (Save dimmed)", Gz.pendingAfter.length === 0 && Gz.cleanAgain, Gz);

  // ---------- H. Staging-draft edit and Add Coin (draft mode) ----------------
  await page.evaluate(() => {
    const G = __g;
    G.dsection = (re) => {
      const host = document.getElementById("addCoinPhotoSections");
      const h = [...host.querySelectorAll(".accordion-header")].find(x => re.test(x.textContent));
      if (!h) return null;
      if (h.getAttribute("aria-expanded") !== "true") h.click();
      return h.nextElementSibling;
    };
    G.dslot = (re, i) => { const b = G.dsection(re); return b ? b.querySelectorAll(".sg-photo-slot")[i] : null; };
    G.dpick = async (trigger, flip) => {
      if (!trigger) return false;
      trigger.click();
      const btn = document.querySelector('#imageSourceChooser .image-chooser-btn[data-source="files"]');
      if (!btn) return false;
      btn.click();
      G.pick(document.getElementById("imageChooserFilesInput"), await G.file());
      return G.finishCrop(flip);
    };
    G.dpend = () => galleryFor(ADDCOIN_GALLERY_ID).filter(e => e.blob && !e.stagingStored).map(e => e.type + (e.stagingReplaces ? "(replaces)" : "")).sort();
  });
  const H = await page.evaluate(async ({ base, catalog, id }) => {
    const G = __g;
    const out = {};
    const folder = writePaths().stagingBase + "/" + id;
    const blank = (n) => new Array(n).fill("");
    const mock = createMockGraphClient({ sheets: {
      All: [["CollectionID", "CoinID"]],
      Photos: [["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"]].concat([1, 2, 3, 4, 5, 6].map(() => blank(8))),
      Receipts: [["ReceiptID", "CollectionID", "Filename", "DateAdded"]].concat([1, 2, 3].map(() => blank(4)))
    } });
    const ups = []; const fail = {};
    __setGraphClientForTest(new Proxy(mock, { get(t, k) {
      const v = t[k];
      if (typeof v !== "function") return v;
      return async (...a) => {
        if (k === "uploadFile") {
          const n = String(a[0]).split("/").pop();
          if (fail[n]) { const e = new Error("conflict"); e.conflict = true; throw e; }
          ups.push(n);
        }
        return v.apply(t, a);
      };
    } }));
    __setAddCoinWriteEnabledForTest(true); __resetAllHeaderMapForTest(); __resetSheetHeaderMapsForTest();
    __setLiveDbCoinsForTest(catalog);
    G.closeOverlays();
    const O = id + "_obverse_cropped.jpg", OR = id + "_obverse_original.jpg";
    await mock.uploadFile(folder + "/" + O, await G.jpeg("#a33"));
    await mock.uploadFile(folder + "/" + OR, await G.jpeg("#3a3"));
    await mock.uploadJson(writePaths().stagingBase + "/" + id + "/coin.json", Object.assign({}, base, { photos: [
      { type: "obverse", filename: O, caption: "" }, { type: "obverse", filename: OR, caption: "original" }] }));
    await beginCoinDraftEdit(id);
    const body = document.getElementById("addCoinPhotosBody");
    if (body.classList.contains("hidden")) document.getElementById("addCoinPhotosHeader").click();
    await G.sleep(80);
    // Holder back -> Reverse (Crop); Holder front -> Obverse (Replace of the stored one).
    out.b = await G.dpick(G.dslot(/Holder/, 1).querySelector('[data-act="add"], [data-act="replace"]'), false);
    out.bTitle = G.guardTitle();
    out.bCrop = await G.takeCrop();
    out.f = await G.dpick(G.dslot(/Holder/, 0).querySelector('[data-act="add"], [data-act="replace"]'), false);
    out.fTitle = G.guardTitle();
    out.fCrop = await G.takeCrop();
    out.pending = G.dpend();
    out.uploadsBefore = ups.length;
    // Save through the real path, with the new Reverse crop's name refused once.
    await new Promise((resolve, reject) => resolveAddCoinCatalogMatch(
      (m) => completeAddCoinSave("staging", m).then(resolve, reject), () => resolve("cancelled")));
    out.uploads = ups.slice();
    const draft = await mock.getJson(writePaths().stagingBase + "/" + id + "/coin.json");
    out.listed = draft.photos.map(coinDraftPhotoFilename).sort();
    out.folder = (await mock.listChildren(folder)).filter(n => /\.jpg$/.test(n)).sort();
    out.oldKept = out.folder.includes(O) && out.folder.includes(OR);
    __setGraphClientForTest(null);
    return out;
  }, { base: BASE_DRAFT, catalog: CATALOG, id: DID });
  ok("H1 Staging edit: Holder back offers the Reverse, Holder front offers to REPLACE the Obverse",
    H.b && /^Crop the Reverse/.test(H.bTitle) && H.f && /^Replace the Obverse/.test(H.fTitle), H);
  ok("H2 both crops are pending draft entries, the Obverse one standing in for the stored pair; nothing uploaded yet",
    H.bCrop && H.fCrop && H.pending.join() === "obverse(replaces),reverse,slab_obverse,slab_reverse" && H.uploadsBefore === 0, H);
  ok("H3 one Save uploads all four and coin.json lists them; the replaced pair stays on disk",
    H.uploads.length === 4 && H.listed.includes("AY-00754_reverse_cropped.jpg") && H.listed.includes("AY-00754_slab_obverse.jpg") &&
    H.listed.includes("AY-00754_slab_reverse.jpg") && H.listed.includes("AY-00754_obverse_cropped_02.jpg") &&
    !H.listed.includes("AY-00754_obverse_cropped.jpg") && H.oldKept, H);

  // A 409 on a crop: the holder still lands, the failed crop's own files are cleaned, a re-save finishes.
  const H2 = await page.evaluate(async ({ base, catalog, id }) => {
    const G = __g;
    const out = {};
    const folder = writePaths().stagingBase + "/" + id;
    const blank = (n) => new Array(n).fill("");
    const mock = createMockGraphClient({ sheets: {
      All: [["CollectionID", "CoinID"]],
      Photos: [["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"]].concat([1, 2, 3, 4, 5, 6].map(() => blank(8))),
      Receipts: [["ReceiptID", "CollectionID", "Filename", "DateAdded"]].concat([1, 2, 3].map(() => blank(4)))
    } });
    const ups = []; const fail = {};
    __setGraphClientForTest(new Proxy(mock, { get(t, k) {
      const v = t[k];
      if (typeof v !== "function") return v;
      return async (...a) => {
        if (k === "uploadFile") {
          const n = String(a[0]).split("/").pop();
          if (fail[n]) { const e = new Error("conflict"); e.conflict = true; throw e; }
          ups.push(n);
        }
        return v.apply(t, a);
      };
    } }));
    __setAddCoinWriteEnabledForTest(true); __resetAllHeaderMapForTest(); __resetSheetHeaderMapsForTest();
    __setLiveDbCoinsForTest(catalog);
    G.closeOverlays();
    await mock.uploadJson(writePaths().stagingBase + "/" + id + "/coin.json", Object.assign({}, base, { photos: [] }));
    await beginCoinDraftEdit(id);
    const body = document.getElementById("addCoinPhotosBody");
    if (body.classList.contains("hidden")) document.getElementById("addCoinPhotosHeader").click();
    await G.sleep(80);
    await G.dpick(G.dslot(/Holder/, 1).querySelector('[data-act="add"], [data-act="replace"]'), false);
    await G.takeCrop();
    fail[id + "_reverse_cropped.jpg"] = true;
    const save = () => new Promise((resolve, reject) => resolveAddCoinCatalogMatch(
      (m) => completeAddCoinSave("staging", m).then(resolve, reject), () => resolve("cancelled")));
    await save();
    out.firstUploads = ups.slice();
    out.firstFolder = (await mock.listChildren(folder)).filter(n => /\.jpg$/.test(n)).sort();
    out.pendingAfterFail = G.dpend();
    delete fail[id + "_reverse_cropped.jpg"];
    ups.length = 0;
    await save();
    out.secondUploads = ups.slice();
    const draft = await mock.getJson(writePaths().stagingBase + "/" + id + "/coin.json");
    out.listed = draft.photos.map(coinDraftPhotoFilename).sort();
    __setGraphClientForTest(null);
    return out;
  }, { base: BASE_DRAFT, catalog: CATALOG, id: DID });
  ok("H4 a refused crop name does not stop the holder, nothing half-written is left behind",
    H2.firstUploads.join() === "AY-00754_slab_reverse.jpg" && H2.firstFolder.join() === "AY-00754_slab_reverse.jpg", H2);
  ok("H5 the re-save takes a free name for the crop (the refused one is skipped) and lists both",
    H2.secondUploads.length === 1 && /^AY-00754_reverse_cropped_02\.jpg$/.test(H2.secondUploads[0]) &&
    H2.listed.includes("AY-00754_slab_reverse.jpg") && H2.listed.includes("AY-00754_reverse_cropped_02.jpg"), H2);

  // Add Coin, a NEW draft.
  const H3 = await page.evaluate(async () => {
    const G = __g;
    const out = {};
    G.closeOverlays(); G.closeGuard();
    navigate("addcoin");
    resetAddCoinForm(); clearCoinDraftEditContext();
    renderAddCoinPhotos();
    const hdr = document.getElementById("addCoinPhotosHeader");
    const body = document.getElementById("addCoinPhotosBody");
    if (body.classList.contains("hidden")) hdr.click();
    await G.sleep(60);
    out.f = await G.dpick(G.dslot(/Holder/, 0).querySelector('[data-act="add"], [data-act="replace"]'), false);
    out.fTitle = G.guardTitle();
    out.fCrop = await G.takeCrop();
    out.pending = G.dpend();
    // A second Holder front now Replaces a draft pick; the Obverse offer reads Replace.
    out.f2 = await G.dpick(G.dslot(/Holder/, 0).querySelector('[data-act="add"], [data-act="replace"]'), false);
    out.f2Title = G.guardTitle();
    G.clickGuard("Skip"); await G.sleep(40);
    // Crop from another photo lists the pending holder.
    const sec = G.dsection(/Crop from another photo/);
    out.sources = cropSourceEntriesFor(ADDCOIN_GALLERY_ID, true).map(e => e.type);
    out.noOffer = !G.guardOpen();
    resetAddCoinForm(); clearCoinDraftEditContext();
    return out;
  });
  ok("H6 Add Coin (new draft): the Holder front offers the Obverse (Crop), the crop is a pending entry",
    H3.f && /^Crop the Obverse/.test(H3.fTitle) && H3.fCrop && H3.pending.join() === "obverse,slab_obverse", H3);
  ok("H7 a second Holder front replaces the pick and offers again, now as a Replace", H3.f2 && /^Replace the Obverse/.test(H3.f2Title), H3);
  ok("H8 the pending holder is a source in Crop from another photo", H3.sources.includes("slab_obverse"), H3);
}, module);
