// Build 3 of the November 2026 review: data safety, part 1 (A1, A12, A2,
// A4, A16, B1). The failure sweeps (verify_fi_*.js) prove the end states
// under every single fault; this suite pins what they do not look at:
//
//   SELF the shared check helper's must-fail self-check
//   P1  A1: the REAL client lists a Staging folder of 250 drafts served in
//       pages of 100 (@odata.nextLink), asking $top=999; the reservation
//       sees the newest (AY-00250) and hands out AY-00251
//   P2  ...the stub really pages: its first page alone lacks AY-00250 (so P1
//       fails without the paging loop; the negative control)
//   P3  a listing whose second page fails THROWS (no partial list), and the
//       reservation refuses instead of guessing
//   N1  A12: only names that are exactly AY-##### count in Staging (the old
//       stage.html name 20261114-213000, "2026 old", AY-0009, AY-000099,
//       _Docket and a child-style AY-00012-A folder do not); All's own
//       column still reads AY-00012-A as 12, so the next id is AY-00013
//   W1  A1: a new draft's first write is refused when its file is already
//       there with another save's token (DRAFT_ID_IN_USE), nothing changed
//   W2  ...carries on ("already") when the file there carries THIS save's
//       token (an earlier attempt whose answer was lost)
//   W3  ...is refused when the folder holds anything else (a Set draft)
//   W4  ...is sent with conflictBehavior=fail by the real client
//   D1  A2 + the double-row case: Save to Database whose final draft write
//       fails puts nothing on All, does not say "nothing was written", and
//       turns the form into the edit of the same id ("Save again", banner,
//       unsaved); Save again puts exactly ONE row on All for that id,
//       reserves no second id, and leaves Add Coin on a new coin
//   D2  A2: a photo whose upload fails stays on the form with its crop and
//       its reason; the toast names the file and why; the draft in Staging
//       lists the files that did land
//   R1  A4: Reject refuses a draft whose coin is on All though its own flag
//       says not written (fresh read), and deletes nothing
//   R2  ...refuses when that read fails (it can't be told)
//   R3  a Promote whose draft write fails twice: the new toast (Mark as
//       promoted; no "retry at next launch"), the loaded rows are refreshed;
//       then, with a read of All that lags, Reject still refuses (this
//       session sent that row's keys) and deletes nothing
//   R4  ...and an ordinary draft not on All is still rejected (deleted)
//   B1  B1: the save log keeps the last 10 saves, newest first; the Docket
//       shows all 10 and a Copy button; the copied text is the log
//   B2  ...a failed Graph call inside a save names its reason in the step
// Added in the TEST round (Ray's device TEST of Build 129, 15 Nov 2026):
//   S1  B-1: Add Set's start saves EVERY photo its photo section holds (the
//       Whole set front / back, Package back, COA), not only the Package
//       front (set.jpg); set.json lists them; the toast counts the files
//       (main dropped all but set.jpg behind "set saved")
//   S2  ...a promotion moves them to CoinPhotos and writes their Photos rows
//   S3  F-1: the start is in the save log, with what it saved
//   L1  F-2 / F-3: the save log says a first save did not finish and why,
//       and names the Save again that finished it and promoted it to All
//   L2  F-5: a clean Save to Staging counts its files as Staging Review
//       does (photos and the receipt: 3, not 2)
//   L3  F-4: a long toast stays up long enough to read (short ones as before)
//   L4  F-6: a failed photo's tile says "Save again" while the button does

const { defineSuite } = require("./harness");

module.exports = defineSuite("build3-data-safety", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp(PHONE);
  await page.evaluate(() => {
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
  });

  // ---------- P: A1 paging on the real client ----------
  const P = await page.evaluate(async () => {
    const base = writePaths().stagingBase;
    const names = Array.from({ length: 250 }, (_, i) => "AY-" + String(i + 1).padStart(5, "0")).concat(["_Docket"]);
    const urls = [];
    let failPage2 = false;
    const prevFetch = window.fetch, prevTok = window.getWriteToken, prevAll = window.readMaxCollectionIdFromAll;
    window.getWriteToken = async () => "tok";
    window.readMaxCollectionIdFromAll = async () => 10;
    window.fetch = async (url, opts) => {
      const u = String(url);
      if (u.indexOf("graph.microsoft.com") === -1) return prevFetch(url, opts);
      if (/\/children/.test(u)) {
        urls.push(u);
        const m = /\$skiptoken=(\d+)/.exec(u);
        const start = m ? parseInt(m[1], 10) : 0;
        if (failPage2 && start > 0) return new Response("busy", { status: 503 });
        const slice = names.slice(start, start + 100).map(name => ({ name }));
        const body = { value: slice };
        if (start + 100 < names.length) body["@odata.nextLink"] = "https://graph.microsoft.com/v1.0/me/drive/root:/x:/children?$select=name&$skiptoken=" + (start + 100);
        return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("?", { status: 404 });
    };
    __setGraphClientForTest(null); // the real client
    const out = {};
    try {
      const listed = await RealGraphClient.listChildren(base);
      out.count = listed.length; out.hasNewest = listed.includes("AY-00250");
      out.firstUrl = urls[0]; out.requests = urls.length;
      out.reserved = await reserveNextCollectionId();
      // P2: the first page alone (what the old single request saw).
      const first = await (await window.fetch(urls[0])).json();
      out.firstPageHasNewest = first.value.some(c => c.name === "AY-00250");
      out.firstPageCount = first.value.length;
      // P3
      failPage2 = true;
      try { await RealGraphClient.listChildren(base); out.partialThrew = false; } catch (e) { out.partialThrew = true; out.partialMsg = String(e.message); }
      try { out.reservedDuringFailure = await reserveNextCollectionId(); } catch (e) { out.reserveRefused = String(e.message); }
    } finally {
      window.fetch = prevFetch; window.getWriteToken = prevTok; window.readMaxCollectionIdFromAll = prevAll;
    }
    return out;
  });
  ok("P1 the real client follows @odata.nextLink (250 names in 3 pages, $top=999) and the reservation sees the newest: " + JSON.stringify(P),
    P.count === 251 && P.hasNewest && P.requests === 3 && /\$top=999/.test(P.firstUrl) && P.reserved === "AY-00251");
  ok("P2 control: the stub's first page alone lacks AY-00250 (one request would miss it)",
    P.firstPageCount === 100 && P.firstPageHasNewest === false);
  ok("P3 a second page that fails throws (no partial list) and the reservation refuses: " + (P.partialMsg || "") + " / " + (P.reserveRefused || P.reservedDuringFailure),
    P.partialThrew === true && /503 \(page 2\)/.test(P.partialMsg) && !!P.reserveRefused && !P.reservedDuringFailure);

  // ---------- N: A12 names ----------
  const N = await page.evaluate(async () => {
    const base = writePaths().stagingBase;
    const mock = createMockGraphClient({ workbookColumns: { "All::CollectionID": ["AY-00003", "AY-00012-A"] } });
    ["AY-00007/coin.json", "20261114-213000/coin.json", "AY-00012-A/set.json", "2026 old/a.jpg", "_Docket/docket.json",
     "AY-0009/coin.json", "AY-000099/coin.json"].forEach(p => mock._store.set(base + "/" + p, { kind: "json", value: {} }));
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    return { staging: await readMaxReservedIdFromStaging(), next: await reserveNextCollectionId() };
  });
  ok("N1 Staging counts only exact AY-##### names (7, not 20261114 / 99 / 12); All still reads AY-00012-A as 12 -> AY-00013: " + JSON.stringify(N),
    N.staging === 7 && N.next === "AY-00013");

  // ---------- W: the new draft's first write ----------
  const W = await page.evaluate(async () => {
    const base = writePaths().stagingBase;
    const mock = createMockGraphClient({});
    mock._store.set(base + "/AY-00020/coin.json", { kind: "json", value: { collectionID: "AY-00020", firstWriteToken: "other", marker: 1 } });
    mock._store.set(base + "/AY-00021/coin.json", { kind: "json", value: { collectionID: "AY-00021", firstWriteToken: "mine", marker: 2 } });
    mock._store.set(base + "/AY-00022/set.json", { kind: "json", value: { collectionID: "AY-00022", type: "set" } });
    __setGraphClientForTest(mock);
    const out = {};
    try { await writeNewDraftJson(base + "/AY-00020", "coin.json", { collectionID: "AY-00020", firstWriteToken: "mine" }); out.w1 = "written"; }
    catch (e) { out.w1 = e.code; out.w1msg = e.message; }
    out.w1kept = mock._store.get(base + "/AY-00020/coin.json").value.marker === 1;
    out.w2 = await writeNewDraftJson(base + "/AY-00021", "coin.json", { collectionID: "AY-00021", firstWriteToken: "mine" });
    out.w2kept = mock._store.get(base + "/AY-00021/coin.json").value.marker === 2;
    try { await writeNewDraftJson(base + "/AY-00022", "coin.json", { collectionID: "AY-00022", firstWriteToken: "mine" }); out.w3 = "written"; }
    catch (e) { out.w3 = e.code; }
    out.w3none = !mock._store.has(base + "/AY-00022/coin.json");
    out.w0 = await writeNewDraftJson(base + "/AY-00023", "coin.json", { collectionID: "AY-00023", firstWriteToken: "t" });
    // W4: the real client's PUT for uploadJson with NO_OVERWRITE.
    const prevFetch = window.fetch, prevTok = window.getWriteToken;
    let putUrl = "";
    window.getWriteToken = async () => "tok";
    window.fetch = async (url, opts) => {
      if (String(url).indexOf("graph.microsoft.com") === -1) return prevFetch(url, opts);
      if (opts && opts.method === "PUT") putUrl = String(url);
      return new Response(JSON.stringify({ name: "coin.json" }), { status: 201 });
    };
    try { await RealGraphClient.uploadJson(base + "/AY-00024/coin.json", { a: 1 }, NO_OVERWRITE); }
    finally { window.fetch = prevFetch; window.getWriteToken = prevTok; }
    out.putUrl = putUrl;
    return out;
  });
  ok("W1 a first write onto another save's draft: DRAFT_ID_IN_USE, nothing overwritten: " + W.w1msg,
    W.w1 === "DRAFT_ID_IN_USE" && W.w1kept && /nothing was overwritten/.test(W.w1msg));
  ok("W2 the same save's own earlier write (its token): carries on, nothing rewritten", W.w2 === "already" && W.w2kept);
  ok("W3 a folder that already holds a Set draft: refused, no coin.json written", W.w3 === "DRAFT_ID_IN_USE" && W.w3none);
  ok("W4 an empty folder is written, and the real client asks conflictBehavior=fail: " + W.putUrl,
    W.w0 === "written" && /conflictBehavior=fail/.test(W.putUrl));

  // ---------- D: Add Coin's first save that does not finish ----------
  const setupAddCoin = () => {
    const PH = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"];
    const RH = ["ReceiptID", "CollectionID", "Filename", "DateAdded"];
    const ALL = ["CollectionID", "CoinID", "Denomination", "Category", "Year", "MintMark", "Variety", "Description", "Finish",
      "Designation", "Grade", "GradeSource", "SerNo", "CACBean", "Cost", "Shipping", "Seller_Link", "PurchaseDate", "Value",
      "StorageLocation", "Container", "Remarks", "Reviewed", "LastModified", "Error", "Status", "FaceValue"];
    const blank = (n) => new Array(n).fill("");
    window.__b3 = window.__b3 || {};
    window.__b3.tagged = (tag, size, type) => {
      const a = new Uint8Array(size); for (let i = 0; i < size; i++) a[i] = (tag.charCodeAt(i % tag.length) * 3 + i) & 255;
      const b = new Blob([a], { type: type || "image/jpeg" }); b.__tag = tag; return b;
    };
    window.__b3.addCoin = () => {
      const mock = createMockGraphClient({
        workbookColumns: { "All::CollectionID": ["AY-00500"] },
        sheets: {
          All: [ALL.slice(), ["AY-00500", "C-OLD", "$1", "Coin", 1889, "CC"], blank(ALL.length), blank(ALL.length)],
          Photos: [PH.slice(), ...Array.from({ length: 4 }, () => blank(PH.length))],
          Receipts: [RH.slice(), ...Array.from({ length: 3 }, () => blank(RH.length))]
        }
      });
      __setGraphClientForTest(mock);
      __setAddCoinWriteEnabledForTest(true); __setBrowseEditWriteEnabledForTest(true);
      __resetAllHeaderMapForTest(); __resetSheetHeaderMapsForTest();
      __setFinishWriteRetryMsForTest(0);
      __setLiveDbCoinsForTest([{ denom: "10C", year: 1916, mint: "D", variety: "", description: "Mercury Dime",
        finish: "Business Strike", designation: "", coinId: "C-1916-D-10C-01", pcgs: "4682", mintage: 264000, gsid: "" }]);
      navigate("addcoin");
      ["denomination:10C", "year:1916", "mintMark:D", "description:Mercury Dime", "finish:Business Strike"].forEach(kv => {
        const [k, v] = kv.split(":"); document.getElementById(k).value = v; });
      const coinBtn = document.getElementById("addCoinCategoryCoinBtn"); if (coinBtn) coinBtn.click();
      checkDbCoinsMatch();
      const h = window.__b3.tagged("holder", 900), r = window.__b3.tagged("ref", 700);
      addGalleryEntry(ADDCOIN_GALLERY_ID, { type: "slab_obverse", blob: h, url: URL.createObjectURL(h), caption: "" });
      addGalleryEntry(ADDCOIN_GALLERY_ID, { type: "reference", blob: r, url: URL.createObjectURL(r), caption: "PCGS photo" });
      if (!window.__b3.toastHooked) {
        window.__b3.toastHooked = true;
        const orig = window.showToast;
        window.showToast = function (msg, ...rest) { window.__b3.toasts.push(String(msg)); return orig.call(this, msg, ...rest); };
      }
      window.__b3.toasts = [];
      return mock;
    };
    window.__b3.save = (mode) => new Promise((resolve, reject) => resolveAddCoinCatalogMatch(
      (m) => completeAddCoinSave(mode, m).then(resolve, reject), () => resolve("cancelled")));
    window.__b3.allRowsFor = (mock, id) => mock._grids.All.filter(r => r && r[0] === id).length;
  };
  await page.evaluate(setupAddCoin);

  const D1 = await page.evaluate(async () => {
    const B = window.__b3;
    const mock = B.addCoin();
    const base = writePaths().stagingBase;
    // The draft's FINAL write (the 2nd coin.json) fails once: the photos have landed.
    let coinJsonWrites = 0;
    const realUp = mock.uploadJson.bind(mock);
    mock.uploadJson = (p, ...rest) => {
      if (/AY-00501\/coin\.json$/.test(p) && ++coinJsonWrites === 2) return Promise.reject(new Error("Network error (signal cut)"));
      return realUp(p, ...rest);
    };
    await B.save("database");
    const first = {
      rows: B.allRowsFor(mock, "AY-00501"), toast: B.toasts.join(" / "),
      editing: editingCoinDraftId, btn: document.getElementById("saveToStagingBtn").textContent,
      banner: !document.getElementById("editDraftBanner").classList.contains("hidden"),
      bannerText: document.getElementById("editDraftMsg").textContent,
      unsaved: !!unsavedEditsForView(), picks: galleryFor(ADDCOIN_GALLERY_ID).filter(e => e.blob && e.blob.__tag).length,
      dbBtnHidden: document.getElementById("saveToDatabaseBtn").style.display === "none"
    };
    const log1 = { label: recentSaveTimings[0].label, outcome: recentSaveTimings[0].outcome };
    B.toasts = [];
    await B.save("database");
    const log2 = { label: recentSaveTimings[0].label, outcome: recentSaveTimings[0].outcome };
    first.log = log1; first.log2 = log2;
    const folders = [...new Set([...mock._store.keys()].filter(k => k.indexOf(base + "/") === 0).map(k => k.slice(base.length + 1).split("/")[0]))];
    const draft = mock._store.get(base + "/AY-00501/coin.json").value;
    return { first, second: { rows: B.allRowsFor(mock, "AY-00501"), rows502: B.allRowsFor(mock, "AY-00502"), folders,
      status: draft.status, allRowWritten: draft.allRowWritten, editing: editingCoinDraftId, toast: B.toasts.join(" / "),
      formYear: document.getElementById("year").value } };
  });
  ok("D1a the final draft write fails: nothing on All, no \"nothing was written\", the form is now the edit of AY-00501 (Save again, banner, unsaved, picks kept): " + JSON.stringify(D1.first),
    D1.first.rows === 0 && !/nothing was written/i.test(D1.first.toast) && /Couldn't finish AY-00501's draft/.test(D1.first.toast) &&
    D1.first.editing === "AY-00501" && D1.first.btn === "Save again" && D1.first.banner && /put the coin on the All sheet/.test(D1.first.bannerText) &&
    D1.first.unsaved && D1.first.picks === 2 && D1.first.dbBtnHidden);
  ok("D1b Save again: exactly ONE All row for AY-00501, no second id, the draft promoted, Add Coin back to a new coin: " + JSON.stringify(D1.second),
    D1.second.rows === 1 && D1.second.rows502 === 0 && JSON.stringify(D1.second.folders) === JSON.stringify(["AY-00501"]) &&
    /Promoted/i.test(D1.second.status) && D1.second.allRowWritten === true && D1.second.editing === null && D1.second.formYear === "");

  const D2 = await page.evaluate(async () => {
    const B = window.__b3;
    const mock = B.addCoin();
    const base = writePaths().stagingBase;
    const realUp = mock.uploadFile.bind(mock);
    let failOnce = true;
    mock.uploadFile = (p, ...rest) => {
      if (failOnce && /AY-00501_reference_01\.jpg$/.test(p)) { failOnce = false; return Promise.reject(new Error("PUT failed: 503 busy")); }
      return realUp(p, ...rest);
    };
    await B.save("staging");
    const ref = galleryFor(ADDCOIN_GALLERY_ID).find(e => e.type === "reference");
    const draft = mock._store.get(base + "/AY-00501/coin.json").value;
    renderAddCoinPhotos();
    const host = document.getElementById("addCoinPhotoSections");
    [...host.querySelectorAll(".accordion-header")].forEach(h => { if (h.getAttribute("aria-expanded") !== "true") h.click(); });
    const tileText = host.textContent || "";
    const first = { tileSaysSaveAgain: /Not saved — tap Save again/.test(tileText) && !/Save changes again/.test(tileText),
      log: { label: recentSaveTimings[0].label, outcome: recentSaveTimings[0].outcome },
      toast: B.toasts.join(" / "), refOnForm: !!(ref && ref.blob && ref.blob.__tag === "ref"),
      refStored: !!(ref && ref.stagingStored), refError: ref ? ref.uploadError : "",
      listed: (draft.photos || []).map(p => p.filename), editing: editingCoinDraftId,
      holderStored: !!galleryFor(ADDCOIN_GALLERY_ID).find(e => e.type === "slab_obverse" && e.stagingStored) };
    B.toasts = [];
    await B.save("staging");
    const after = mock._store.get(base + "/AY-00501/coin.json").value;
    return { first, second: { listed: (after.photos || []).map(p => p.filename), note: after.researchNote || "", editedDate: "editedDate" in after,
      editing: editingCoinDraftId, toast: B.toasts.join(" / ") } };
  });
  ok("D2a a failed photo stays on the form with its reason; the toast names it and why; the draft lists what landed: " + JSON.stringify(D2.first),
    D2.first.refOnForm && !D2.first.refStored && /uploading the photo: PUT failed: 503 busy/.test(D2.first.refError) &&
    /1 file didn't upload: AY-00501_reference_01\.jpg — uploading the photo: PUT failed: 503 busy/.test(D2.first.toast) &&
    JSON.stringify(D2.first.listed) === JSON.stringify(["AY-00501_slab_obverse.jpg"]) && D2.first.editing === "AY-00501" && D2.first.holderStored);
  ok("L1 the save log: a first save that did not finish says so and why; the Save again that finished it says it promoted to All: " +
    JSON.stringify([D1.first.log, D1.first.log2, D2.first.log]),
    D1.first.log.label === "Add Coin: Save to Database" && /^not finished: the draft's final write failed \(Network error \(signal cut\)\)/.test(D1.first.log.outcome) &&
    /nothing on All/.test(D1.first.log.outcome) &&
    D1.first.log2.label === "Add Coin: Save again, finishing AY-00501 (then Promote to All)" && D1.first.log2.outcome === "draft finished; promoted AY-00501 to All" &&
    /^not finished: 1 file didn't upload \(AY-00501_reference_01\.jpg — uploading the photo: PUT failed: 503 busy\)/.test(D2.first.log.outcome));
  ok("L4 the failed photo's tile says \"Not saved — tap Save again\", as the button does", D2.first.tileSaysSaveAgain === true);

  const L2 = await page.evaluate(async () => {
    const B = window.__b3;
    const mock = B.addCoin();
    receiptFiles["receiptPreview"] = { blob: B.tagged("rcpt", 300, "application/pdf"), filename: "receipt.pdf" };
    await B.save("staging");
    const base = writePaths().stagingBase;
    const files = [...mock._store.keys()].filter(k => k.indexOf(base + "/AY-00501/") === 0 && !/coin\.json$/.test(k)).length;
    return { toast: B.toasts.join(" / "), files, log: recentSaveTimings[0].outcome };
  });
  ok("L2 a clean Save to Staging counts its files as Staging Review does (Holder + Reference + receipt = 3): " + L2.toast,
    L2.files === 3 && /Saved AY-00501 to Staging on OneDrive \(copy\) with 3 files/.test(L2.toast) && L2.log === "saved AY-00501 to Staging with 3 files");

  const L3 = await page.evaluate(() => {
    const prev = window.setTimeout; const delays = [];
    window.setTimeout = (fn, ms, ...r) => { delays.push(ms); return prev(fn, ms, ...r); };
    try { showToast("x".repeat(60)); const shortMs = delays[delays.length - 1]; showToast("y".repeat(300)); return { shortMs, longMs: delays[delays.length - 1] }; }
    finally { window.setTimeout = prev; }
  });
  ok("L3 a 300-character toast stays up about 22.8 s (was 7 s); a 60-character one is unchanged (4.2 s): " + JSON.stringify(L3),
    L3.longMs === 22800 && L3.shortMs === 4200);
  ok("D2b Save again uploads it; the draft ends as a clean first save writes it (form order, no failure note, no editedDate): " + JSON.stringify(D2.second),
    JSON.stringify(D2.second.listed) === JSON.stringify(["AY-00501_slab_obverse.jpg", "AY-00501_reference_01.jpg"]) &&
    !/failed to upload/.test(D2.second.note) && D2.second.editedDate === false && D2.second.editing === null && /every file is in now/.test(D2.second.toast));

  // ---------- R: Reject (A4) ----------
  const R = await page.evaluate(async () => {
    const ALLH = ["CollectionID", "CoinID", "Denomination", "Category", "Year", "MintMark", "Variety", "Description", "Finish",
      "Designation", "Grade", "GradeSource", "SerNo", "CACBean", "Cost", "Shipping", "Seller_Link", "PurchaseDate", "Value",
      "StorageLocation", "Container", "Remarks", "Reviewed", "LastModified", "Error", "Status", "FaceValue"];
    const PH = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"];
    const RH = ["ReceiptID", "CollectionID", "Filename", "DateAdded"];
    const blank = (n) => new Array(n).fill("");
    const ID = "AY-00706";
    const toasts = [];
    const origToast = window.showToast;
    window.showToast = (m) => { toasts.push(String(m)); };
    const make = (onAll) => {
      const all = [ALLH.slice()];
      if (onAll) { const r = blank(ALLH.length); r[0] = ID; all.push(r); }
      all.push(blank(ALLH.length), blank(ALLH.length), blank(ALLH.length));
      const mock = createMockGraphClient({ sheets: { All: all,
        Photos: [PH.slice(), ...Array.from({ length: 4 }, () => blank(PH.length))],
        Receipts: [RH.slice(), ...Array.from({ length: 3 }, () => blank(RH.length))] } });
      const folder = coinDraftFolder(ID);
      mock._store.set(folder + "/" + ID + "_obverse_cropped.jpg", { kind: "bytes", value: new Blob(["obv"]) });
      mock._store.set(folder + "/coin.json", { kind: "json", value: {
        type: "coin", version: 1, collectionID: ID, status: COIN_DRAFT_STATUS.READY, denom: "1C", year: "1943", mint: "S",
        description: "Lincoln Wheat", finish: "Business Strike", category: "Coin", coinId: "C-1943-S-1C-01",
        allRowWritten: false, forceAdded: false, photos: [{ type: "obverse", filename: ID + "_obverse_cropped.jpg", caption: "" }], receiptPhoto: "" } });
      __setGraphClientForTest(mock);
      __setAddCoinWriteEnabledForTest(true); __setBrowseEditWriteEnabledForTest(true);
      __resetAllHeaderMapForTest(); __resetSheetHeaderMapsForTest();
      __setFinishWriteRetryMsForTest(0);
      __setLiveDbCoinsForTest([{ denom: "1C", year: 1943, mint: "S", variety: "", description: "Lincoln Wheat", finish: "Business Strike",
        designation: "", gsid: "", pcgs: "", mintage: 0, coinId: "C-1943-S-1C-01", composition: "Steel" }]);
      return mock;
    };
    const folderThere = (mock) => mock._store.has(coinDraftFolder(ID) + "/coin.json") && mock._store.has(coinDraftFolder(ID) + "/" + ID + "_obverse_cropped.jpg");
    const out = {};
    try {
      // R1
      let mock = make(true);
      toasts.length = 0; await performRejectStagedCoin(ID);
      out.r1 = { kept: folderThere(mock), toast: toasts.join(" / ") };
      // R2
      mock = make(false);
      mock.readTableColumn = () => Promise.reject(new Error("Workbook read failed: 503"));
      toasts.length = 0; await performRejectStagedCoin(ID);
      out.r2 = { kept: folderThere(mock), toast: toasts.join(" / ") };
      // R3: Promote; every coin.json write after the row fails.
      mock = make(false);
      const realUp = mock.uploadJson.bind(mock);
      mock.uploadJson = (p, ...rest) => /coin\.json$/.test(p) ? Promise.reject(new Error("Network error")) : realUp(p, ...rest);
      let refreshed = 0;
      const prevRefresh = window.refreshLiveCoinsAfterWrite;
      window.refreshLiveCoinsAfterWrite = async () => { refreshed++; return true; };
      const ce = console.error; console.error = () => {};
      toasts.length = 0;
      try { await promoteCoinDraft(ID); } finally { console.error = ce; window.refreshLiveCoinsAfterWrite = prevRefresh; }
      const promoteToast = toasts.join(" / ");
      const onAll = mock._grids.All.filter(r => r && r[0] === ID).length;
      // A read of All that lags behind the write: the row is not in it.
      const realCol = mock.readTableColumn.bind(mock);
      mock.readTableColumn = (...a) => realCol(...a).then(col => col.map(v => v === ID ? "" : v));
      toasts.length = 0; await performRejectStagedCoin(ID);
      out.r3 = { onAll, promoteToast, refreshed, kept: folderThere(mock), rejectToast: toasts.join(" / ") };
      // R4
      mock = make(false);
      toasts.length = 0; await performRejectStagedCoin(ID);
      out.r4 = { gone: !mock._store.has(coinDraftFolder(ID) + "/coin.json"), toast: toasts.join(" / ") };
    } finally { window.showToast = origToast; }
    return out;
  });
  ok("R1 Reject refuses a draft whose coin is on All (fresh read) though its flag says not written; nothing deleted: " + R.r1.toast,
    R.r1.kept && /is on the All sheet \(row \d+, read just now\)/.test(R.r1.toast) && /Mark as promoted/.test(R.r1.toast) && /Nothing was deleted/.test(R.r1.toast));
  ok("R2 Reject refuses when the read of All fails: " + R.r2.toast,
    R.r2.kept && /Couldn't check the All sheet/.test(R.r2.toast) && /nothing was deleted/.test(R.r2.toast));
  ok("R3 a Promote whose draft write fails twice: the row is on All, the toast says Mark as promoted (no \"retry at next launch\"), the loaded rows are refreshed; Reject with a lagging read still refuses: " + JSON.stringify(R.r3),
    R.r3.onAll === 1 && /is on the All sheet, but updating its draft failed/.test(R.r3.promoteToast) && /tap Mark as promoted/.test(R.r3.promoteToast) &&
    !/retry at next launch/.test(R.r3.promoteToast) && R.r3.refreshed >= 1 && R.r3.kept && /written to the All sheet in this session/.test(R.r3.rejectToast));
  ok("R4 an ordinary draft not on All is still rejected (deleted): " + R.r4.toast, R.r4.gone && /rejected —/.test(R.r4.toast));

  // ---------- S: Add Set saves every photo (B-1, F-1) ----------
  const S = await page.evaluate(async () => {
    const B = window.__b3;
    const PH = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"];
    const blank = (n) => new Array(n).fill("");
    const mock = createMockGraphClient({ workbookColumns: { "All::CollectionID": ["AY-00500"] },
      sheets: { All: [["CollectionID"], ["AY-00500"]], Photos: [PH.slice(), ...Array.from({ length: 8 }, () => blank(PH.length))] } });
    __setGraphClientForTest(mock); __setAddCoinWriteEnabledForTest(true);
    __resetSheetHeaderMapsForTest();
    const toasts = []; const prevToast = window.showToast; window.showToast = (m) => toasts.push(String(m));
    try {
      navigate("addset");
      document.getElementById("addSetName").value = "Proof Set";
      document.getElementById("addSetYear").value = "1957";
      document.getElementById("addSetTrackIndividually").checked = false;
      updateAddSetTrackIndividuallyVisibility();
      const add = (type, tag, extra) => { const b = B.tagged(tag, 400); addGalleryEntry(ADDSET_GALLERY_ID, Object.assign({ type, blob: b, url: URL.createObjectURL(b), caption: "" }, extra || {})); return b; };
      add("subgroup_obverse", "wsf", { subGroupId: DEFAULT_SUBGROUP_ID });
      add("subgroup_reverse", "wsb", { subGroupId: DEFAULT_SUBGROUP_ID });
      addSetPhotoFiles.whole = add("ogp_obverse", "ogpf"); // what the Package front slot's onChange does
      add("ogp_reverse", "ogpb");
      add("coa", "coa1", { caption: "Certificate" });
      await startSetCapture();
      const base = writePaths().stagingBase, P = writePaths();
      const files = [...mock._store.keys()].filter(k => k.indexOf(base + "/AY-00501/") === 0).map(k => k.slice((base + "/AY-00501/").length)).sort();
      const draft = mock._store.get(base + "/AY-00501/set.json").value;
      const log = { label: recentSaveTimings[0].label, outcome: recentSaveTimings[0].outcome };
      // S2: Copilot marks it Promoted; the launch-time move runs.
      draft.status = SET_STATUS.PROMOTED;
      mock._store.set(base + "/AY-00501/set.json", { kind: "json", value: JSON.parse(JSON.stringify(draft)) });
      await processPromotedSetDrafts();
      const moved = [...mock._store.keys()].filter(k => k.indexOf(P.coinPhotos + "/") === 0).map(k => k.slice(P.coinPhotos.length + 1)).sort();
      const rows = mock._grids.Photos.slice(1).filter(r => r[1]).map(r => r[2] + ":" + r[4] + (r[5] ? ":" + r[5] : "")).sort();
      const after = mock._store.get(base + "/AY-00501/set.json").value;
      return { toast: toasts.join(" / "), files, photos: draft.photos, log, moved, rows, movedFlag: after.filesMovedOnPromotion };
    } finally { window.showToast = prevToast; }
  });
  ok("S1 Add Set's start saves every photo of its photo section, set.json lists them, the toast counts 5 files: " + JSON.stringify({ files: S.files, toast: S.toast }),
    JSON.stringify(S.files) === JSON.stringify(["AY-00501_coa_01.jpg", "AY-00501_obverse.jpg", "AY-00501_ogp_reverse.jpg", "AY-00501_reverse.jpg", "set.jpg", "set.json"]) &&
    JSON.stringify(S.photos.map(p => p.type + ":" + p.filename + ":" + p.subGroupId)) === JSON.stringify([
      "subgroup_obverse:AY-00501_obverse.jpg:" + "__default__", "subgroup_reverse:AY-00501_reverse.jpg:__default__",
      "ogp_reverse:AY-00501_ogp_reverse.jpg:", "coa:AY-00501_coa_01.jpg:"]) &&
    /^Reserved AY-00501 — set saved \(not tracked coin-by-coin\), with 5 files\.$/.test(S.toast));
  ok("S2 a promotion moves them to CoinPhotos and writes a Photos row for each (with the COA's label): " + JSON.stringify({ moved: S.moved, rows: S.rows }),
    JSON.stringify(S.moved) === JSON.stringify(["AY-00501_coa_01.jpg", "AY-00501_obverse.jpg", "AY-00501_ogp_reverse.jpg", "AY-00501_reverse.jpg", "AY-00501_set.jpg"]) &&
    S.rows.length === 5 && S.rows.some(r => /^COA:AY-00501_coa_01\.jpg:Certificate$/.test(r)) && S.movedFlag === true);
  ok("S3 the start is in the save log with what it saved: " + JSON.stringify(S.log),
    S.log.label === "Add Set: reserve and save" && S.log.outcome === "saved: reserved AY-00501, with 5 files");

  // ---------- B: the save log (B1) ----------
  const B = await page.evaluate(async () => {
    __resetLoadReportForTest();
    for (let i = 1; i <= 12; i++) await withSaveTiming("S" + i, async () => ({ ok: true }));
    const labels = recentSaveTimings.map(t => t.label);
    renderLoadReport();
    const shown = document.querySelectorAll("#docketLoadReport #docketLastSaveLine, #docketLoadReport [data-save-log]").length;
    const copyBtn = document.getElementById("docketSaveLogCopyBtn");
    let copied = null;
    const prevClip = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t) => { copied = t; } } });
    try { await copySaveLog(); } finally { Object.defineProperty(navigator, "clipboard", { configurable: true, value: prevClip }); }
    const text = saveLogText();
    // B2: a failed Graph call inside a save.
    const mock = createMockGraphClient({});
    mock.getJson = () => Promise.reject(new Error("GET json failed: 503 boom"));
    __setGraphClientForTest(mock);
    try { await withSaveTiming("F", () => graph().getJson("x/coin.json")); } catch (e) { /* expected */ }
    const failedStep = (recentSaveTimings[0].steps.find(s => /\(failed/.test(s.name)) || {}).name || "";
    // The log's first line carries the time it was made (to the ms), so the
    // copy and this read are compared without that clock.
    const noClock = (t) => String(t).replace(/^(Salty's Cabinet save log, )\S+/, "$1<now>");
    return { labels, shown, copyLabel: copyBtn ? copyBtn.textContent : "", copiedIsLog: !!copied && noClock(copied) === noClock(text),
      order: text.indexOf("S12)") !== -1 && text.indexOf("S12)") < text.indexOf("S11)") && text.indexOf("S2)") === -1,
      headlines: (text.match(/^(Last save|Save before that) \(/mg) || []).length, failedStep };
  });
  ok("B1 the save log keeps the last 10, newest first; the Docket shows 10 and Copy; the copied text is the log: " + JSON.stringify(B),
    JSON.stringify(B.labels) === JSON.stringify(["S12", "S11", "S10", "S9", "S8", "S7", "S6", "S5", "S4", "S3"]) &&
    B.shown === 10 && /Copy the save log \(10\)/.test(B.copyLabel) && B.copiedIsLog && B.order && B.headlines === 10);
  ok("B2 a failed Graph call inside a save names its reason in the step: " + B.failedStep,
    /^Graph getJson x\/coin\.json \(failed: GET json failed: 503 boom\)$/.test(B.failedStep));
}, module);
