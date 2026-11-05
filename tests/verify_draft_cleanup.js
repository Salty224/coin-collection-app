// Staging draft cleanup (Nov 2026, Ray): a coin that is already on the All
// sheet must not leave a live draft behind, and Promote must be safe to repeat.
//
// WHY. After a direct save, AY-00760's Staging draft stayed open: the
// bookkeeping that follows a write to All (finishCoinDraftWrite) re-read
// coin.json with no try/catch, so a failed read left the draft Ready; and
// Ray's second Promote error fits the createAllSheetRow tripwire ("already
// appears on the All sheet at row N") after a column read missed a row that
// had just been written.
//   S1  finishCoinDraftWrite never aborts on a failed re-read: it falls back
//       to the in-memory draft and writes Promoted + allRowWritten first,
//       retrying that write once.
//   S2  a draft whose CollectionID is on the loaded All rows shows "Already on
//       the All sheet (row N)" with ONE action, "Mark as promoted" (no Mark
//       ready / Promote / Edit / Reject); only on Ray's tap, never automatic;
//       it reads the sheet fresh first and writes no All row.
//   S3  Mark ready, Back to draft and Edit refuse a draft whose coin is on All.
//   S4  Promote is idempotent: it looks again after a short wait before
//       creating a row, and adopts a lone existing row when the tripwire fires.
//
// Negative controls (each FAILS on main): S-a (a throwing re-read), S-d (a
// column read that lags once).

const { defineSuite } = require("./harness");

const ALL_HEADERS = [
  "CollectionID", "CoinID", "Denomination", "Category", "Year", "MintMark",
  "Variety", "Description", "Finish", "Designation", "Grade", "GradeSource",
  "SerNo", "CACBean", "Cost", "Shipping", "Total", "Seller_Link",
  "PurchaseDate", "SpotValue", "Value", "StorageLocation", "Container",
  "Remarks", "Reviewed", "LastModified", "Error", "Status"
];
const PHOTO_HEADERS = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"];
const RECEIPT_HEADERS = ["ReceiptID", "CollectionID", "Filename", "DateAdded"];

function seed(extraAllRows, extraPhotoRows) {
  return { sheets: {
    All: [ALL_HEADERS.slice(), ["AY-00500", "C-OLD", "$1", "Coin", 1889, "CC"]].concat(extraAllRows || []),
    Photos: [PHOTO_HEADERS.slice()].concat(extraPhotoRows || []),
    Receipts: [RECEIPT_HEADERS.slice()]
  } };
}

const DRAFT = (id, extra) => Object.assign({
  type: "coin", version: 1, collectionID: id, status: "Ready for reconciliation",
  denom: "1C", category: "Coin", year: "2026", mint: "", variety: "", description: "Lincoln Shield Cent",
  finish: "Business Strike", designation: "", errorDesc: "", grade: "MS-66", gradeSource: "PCGS", serNo: "",
  cacBean: "", cost: 3, shippingCost: 0, purchaseDate: "2026-10-01", vendor: "", storageLocation: "",
  container: "", assignAlbum: "", remarks: "", itemNumber: "", gsid: "",
  coinId: "C-2026--1C-01", matchedHow: "single", photos: [], receiptPhoto: "",
  researchNote: "", allRowWritten: false, forceAdded: false, filesMovedOnPromotion: false,
  createdDate: "2026-10-20T17:57:36Z"
}, extra || {});

module.exports = defineSuite("draft-cleanup", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);

  await page.evaluate(({ draftFn, seedObj, headers }) => {
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    window.__seedFor = seedObj;
    window.ALL_HEADERS_FOR_PAGE = () => headers.slice();
    window.__draftOf = (id, extra) => Object.assign(JSON.parse(draftFn), { collectionID: id }, extra || {});
    window.__setup = (s) => {
      const mock = createMockGraphClient(s);
      __setGraphClientForTest(mock);
      __setAddCoinWriteEnabledForTest(true);
      __resetAllHeaderMapForTest();
      __setFinishWriteRetryMsForTest(0);
      return mock;
    };
    window.__teardown = () => {
      __setLiveCoinsForTest(null);
      __setPromoteRelookMsForTest(0);
      __setFinishWriteRetryMsForTest(800);
      __setAddCoinWriteEnabledForTest(null);
      __setGraphClientForTest(null);
      __resetAllHeaderMapForTest();
    };
    window.__wait = (ms) => new Promise(r => setTimeout(r, ms));
    window.__toast = () => { const t = document.getElementById("toast"); return t.classList.contains("show") ? t.textContent : ""; };
    window.__idRows = (mock, id) => mock._grids.All.filter((r, i) => i > 0 && r[0] === id);
  }, { draftFn: JSON.stringify(DRAFT("X")), seedObj: seed(), headers: ALL_HEADERS });

  // ============ S-a. S1: the bookkeeping cannot lose "Promoted" ============
  const A2 = await page.evaluate(async () => {
    const out = {};
    const base = () => writePaths().stagingBase;
    {
      const mock = __setup(JSON.parse(JSON.stringify(window.__seedFor)));
      await mock.uploadJson(base() + "/AY-00800/coin.json", __draftOf("AY-00800"));
      const realGet = mock.getJson.bind(mock);
      let draftReads = 0;
      mock.getJson = async (p, ...r) => {
        if (/AY-00800\/coin\.json$/.test(p) && ++draftReads === 2) throw new Error("simulated re-read failure");
        return realGet(p, ...r);
      };
      const ok1 = await promoteCoinDraft("AY-00800");
      const d = await realGet(base() + "/AY-00800/coin.json");
      out.a = { ok1, status: d.status, allRowWritten: d.allRowWritten, rows: __idRows(mock, "AY-00800").length, draftReads };
      __teardown();
    }
    {
      const mock = __setup(JSON.parse(JSON.stringify(window.__seedFor)));
      await mock.uploadJson(base() + "/AY-00801/coin.json", __draftOf("AY-00801"));
      const realUp = mock.uploadJson.bind(mock);
      let failed = 0;
      mock.uploadJson = async (p, ...r) => {
        if (/AY-00801\/coin\.json$/.test(p) && __idRows(mock, "AY-00801").length === 1 && failed === 0) { failed++; throw new Error("simulated write failure"); }
        return realUp(p, ...r);
      };
      await promoteCoinDraft("AY-00801");
      const d = await mock.getJson(base() + "/AY-00801/coin.json");
      out.b = { failed, status: d.status, allRowWritten: d.allRowWritten };
      __teardown();
    }
    {
      const mock = __setup(JSON.parse(JSON.stringify(window.__seedFor)));
      await mock.uploadJson(base() + "/AY-00802/coin.json", __draftOf("AY-00802"));
      const realUp = mock.uploadJson.bind(mock);
      mock.uploadJson = async (p, ...r) => {
        if (/AY-00802\/coin\.json$/.test(p) && __idRows(mock, "AY-00802").length === 1) throw new Error("simulated write failure");
        return realUp(p, ...r);
      };
      const ce = console.error; console.error = () => {}; // the app logs this failure on purpose
      await promoteCoinDraft("AY-00802");
      console.error = ce;
      out.c = { toast: __toast(), rows: __idRows(mock, "AY-00802").length };
      __teardown();
    }
    return out;
  });
  ok("S-a NEGATIVE CONTROL: the coin.json re-read throws during the bookkeeping; the draft still ends Promoted + allRowWritten (the row is on the sheet): " + JSON.stringify(A2.a),
    A2.a.ok1 === true && /Promoted/i.test(A2.a.status) && A2.a.allRowWritten === true && A2.a.rows === 1 && A2.a.draftReads >= 2);
  ok("S-a2 a status write that fails once is retried and lands: " + JSON.stringify(A2.b),
    A2.b.failed === 1 && /Promoted/i.test(A2.b.status) && A2.b.allRowWritten === true);
  ok("S-a3 if the retry fails too, the failure is reported, never swallowed: " + A2.c.toast,
    A2.c.rows === 1 && /on the All sheet, but tidying up afterwards failed/.test(A2.c.toast));

  // ============ S-b. S2: a leftover draft shows ONE action ============
  const B = await page.evaluate(async () => {
    const out = {};
    const base = () => writePaths().stagingBase;
    const coinRow = (id, coinId) => [id, coinId || "C-2026--1C-01", "1C", "Coin", 2026, "", "", "Lincoln Shield Cent", "Business Strike"];
    const mock = __setup({ sheets: {
      All: [ALL_HEADERS_FOR_PAGE(), ["AY-00500", "C-OLD", "$1", "Coin", 1889, "CC"], coinRow("AY-00810"), coinRow("AY-00814")],
      Photos: [["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"]],
      Receipts: [["ReceiptID", "CollectionID", "Filename", "DateAdded"]]
    } });
    await mock.uploadJson(base() + "/AY-00810/coin.json", __draftOf("AY-00810"));                       // leftover (Ready)
    await mock.uploadJson(base() + "/AY-00814/coin.json", __draftOf("AY-00814", { status: "Draft — awaiting review", coinId: "" })); // leftover (Draft)
    await mock.uploadJson(base() + "/AY-00811/coin.json", __draftOf("AY-00811"));                       // ordinary, not on All
    __setLiveCoinsForTest([{ id: "AY-00500" }, { id: "AY-00810" }, { id: "AY-00814" }]);
    const itemOf = (container, id) => [...document.querySelectorAll(container + " .wish-item")].find(x => x.textContent.indexOf(id) !== -1);
    const buttons = (el) => el ? [...el.querySelectorAll("button")].map(b => b.textContent.trim()) : null;
    navigate("staging"); await renderStagingList(); await __wait(300);
    const s810 = itemOf("#stagingContainer", "AY-00810"), s814 = itemOf("#stagingContainer", "AY-00814"), s811 = itemOf("#stagingContainer", "AY-00811");
    out.review = {
      text810: s810 ? s810.textContent.replace(/\s+/g, " ") : "", buttons810: buttons(s810),
      buttons814: buttons(s814), buttons811: buttons(s811)
    };
    navigate("needsdbcoins"); await renderNeedsAttentionHub(); await __wait(300);
    const d810 = itemOf("#docketStagingContainer", "AY-00810");
    out.docket = {
      text810: d810 ? d810.textContent.replace(/\s+/g, " ") : "", buttons810: buttons(d810),
      inResearch: /AY-00810|AY-00814/.test(document.getElementById("docketResearchContainer").textContent),
      stagingCount: document.querySelectorAll("#docketStagingContainer .wish-item").length
    };
    // Nothing happened by itself: the drafts are untouched.
    const still = await mock.getJson(base() + "/AY-00810/coin.json");
    out.untouched = { status: still.status, allRowWritten: still.allRowWritten };

    // The tap (on the Staging Review card).
    const rowsBefore = JSON.stringify(mock._grids.All);
    navigate("staging"); await renderStagingList(); await __wait(200);
    itemOf("#stagingContainer", "AY-00810").querySelector(".staging-mark-promoted").click();
    await __wait(1200);
    const after = await mock.getJson(base() + "/AY-00810/coin.json");
    out.tap = { status: after.status, allRowWritten: after.allRowWritten, rowsSame: JSON.stringify(mock._grids.All) === rowsBefore, toast: __toast() };
    // Again: harmless.
    await markCoinDraftAlreadyPromoted("AY-00810");
    const again = await mock.getJson(base() + "/AY-00810/coin.json");
    out.again = { status: again.status, rowsSame: JSON.stringify(mock._grids.All) === rowsBefore };
    await renderStagingList(); await __wait(200);
    out.gone = !itemOf("#stagingContainer", "AY-00810");

    // Loaded rows say it is on the sheet, the sheet read just now says it is not: nothing changes.
    await mock.uploadJson(base() + "/AY-00815/coin.json", __draftOf("AY-00815"));
    __setLiveCoinsForTest([{ id: "AY-00815" }]);
    const res = await markCoinDraftAlreadyPromoted("AY-00815");
    const d815 = await mock.getJson(base() + "/AY-00815/coin.json");
    out.notThere = { res, status: d815.status, allRowWritten: d815.allRowWritten, toast: __toast() };
    __teardown();
    return out;
  }).catch(e => ({ threw: String(e) }));
  ok("S-b1 Staging Review: a leftover draft says 'Already on the All sheet (row 3)' with exactly ONE action: " + JSON.stringify(B.review),
    /Already on the All sheet \(row 3\)/.test(B.review.text810) && JSON.stringify(B.review.buttons810) === JSON.stringify(["Mark as promoted"]) &&
    JSON.stringify(B.review.buttons814) === JSON.stringify(["Mark as promoted"]));
  ok("S-b1b -- an ordinary draft (not on the sheet) keeps its normal actions: " + JSON.stringify(B.review.buttons811),
    B.review.buttons811.indexOf("Reject") !== -1 && B.review.buttons811.indexOf("Mark as promoted") === -1);
  ok("S-b2 the Docket lists it once, in Staging, with Mark as promoted only (no Promote / Re-check / Edit / Force Add), not in research: " + JSON.stringify(B.docket),
    /Already on the All sheet \(row 3\)/.test(B.docket.text810) && JSON.stringify(B.docket.buttons810) === JSON.stringify(["Mark as promoted"]) && B.docket.inResearch === false);
  ok("S-b3 nothing is automatic: the draft is untouched until the tap: " + JSON.stringify(B.untouched),
    /Ready/.test(B.untouched.status) && B.untouched.allRowWritten === false);
  ok("S-b4 the tap closes the draft (Promoted + allRowWritten) and writes NO All row: " + JSON.stringify(B.tap),
    /Promoted/i.test(B.tap.status) && B.tap.allRowWritten === true && B.tap.rowsSame === true && /No row was written/.test(B.tap.toast));
  ok("S-b4b -- repeating it is harmless and the card is gone from Staging Review: " + JSON.stringify([B.again, B.gone]),
    /Promoted/i.test(B.again.status) && B.again.rowsSame === true && B.gone === true);
  ok("S-b5 when the fresh sheet read does not find the row, nothing changes: " + JSON.stringify(B.notThere),
    B.notThere.res === false && /Ready/.test(B.notThere.status) && B.notThere.allRowWritten === false && /isn.t on the All sheet/.test(B.notThere.toast));

  // ============ S-b6. Q7: Mark as promoted never duplicates Photos rows ============
  const Q = await page.evaluate(async () => {
    const out = {};
    const base = () => writePaths().stagingBase;
    const coinRow = (id) => [id, "C-2026--1C-01", "1C", "Coin", 2026, "", "", "Lincoln Shield Cent", "Business Strike"];
    // The coin already has a Photos row (a repeatable type, the kind that would be duplicated by a second record pass).
    const mock = __setup({ sheets: {
      All: [ALL_HEADERS_FOR_PAGE(), coinRow("AY-00820")],
      Photos: [["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"],
               ["PH-00001", "AY-00820", "Reference", "", "AY-00820_reference_01.jpg", "", 45000, ""]],
      Receipts: [["ReceiptID", "CollectionID", "Filename", "DateAdded"]]
    } });
    await mock.uploadJson(base() + "/AY-00820/coin.json", __draftOf("AY-00820",
      { photos: [{ type: "reference", filename: "AY-00820_reference_01.jpg", caption: "" }] }));
    __setLiveCoinsForTest([{ id: "AY-00820" }]);
    const photoRowsBefore = mock._grids.Photos.length;
    await markCoinDraftAlreadyPromoted("AY-00820");
    const d = await mock.getJson(base() + "/AY-00820/coin.json");
    out.recorded = { photoRowsBefore, photoRowsAfter: mock._grids.Photos.length, status: d.status, filesMoved: d.filesMovedOnPromotion, toast: __toast() };
    // No records and nothing to move: it just closes, and the draft's own flag is set by the (empty) move.
    await mock.uploadJson(base() + "/AY-00821/coin.json", __draftOf("AY-00821"));
    mock._grids.All.push(coinRow("AY-00821"));
    __setLiveCoinsForTest([{ id: "AY-00820" }, { id: "AY-00821" }]);
    await markCoinDraftAlreadyPromoted("AY-00821");
    const d2 = await mock.getJson(base() + "/AY-00821/coin.json");
    out.empty = { status: d2.status, filesMoved: d2.filesMovedOnPromotion };
    __teardown();
    return out;
  }).catch(e => ({ threw: String(e) }));
  ok("S-b6 photos already recorded: no move, no second Photos row, the flag is set so the launch retry cannot record them again: " + JSON.stringify(Q.recorded),
    Q.recorded.photoRowsAfter === Q.recorded.photoRowsBefore && /Promoted/i.test(Q.recorded.status) &&
    Q.recorded.filesMoved === true && /already recorded, so none were moved/.test(Q.recorded.toast));
  ok("S-b6b a draft with no photos and no records simply closes: " + JSON.stringify(Q.empty), /Promoted/i.test(Q.empty.status));

  // ============ S-c. S3: Mark ready / Back to draft / Edit refuse a coin on All ============
  const C = await page.evaluate(async () => {
    const out = {};
    const base = () => writePaths().stagingBase;
    const mock = __setup(window.__seedFor);
    await mock.uploadJson(base() + "/AY-00830/coin.json", __draftOf("AY-00830", { status: "Draft — awaiting review" })); // flags clean, but on the loaded rows
    await mock.uploadJson(base() + "/AY-00831/coin.json", __draftOf("AY-00831", { status: "Draft — awaiting review", allRowWritten: true }));
    await mock.uploadJson(base() + "/AY-00832/coin.json", __draftOf("AY-00832", { status: "Draft — awaiting review" })); // an ordinary draft
    await mock.uploadJson(base() + "/AY-00833/coin.json", __draftOf("AY-00833"));                                       // Ready, on loaded rows
    __setLiveCoinsForTest([{ id: "AY-00830" }, { id: "AY-00833" }]);
    const attempt = async (fn) => { try { await fn(); return null; } catch (e) { return e.message; } };
    out.readyLoaded = await attempt(() => markCoinDraftReady("AY-00830"));
    out.readyFlag = await attempt(() => markCoinDraftReady("AY-00831"));
    out.readyOrdinary = await attempt(() => markCoinDraftReady("AY-00832"));
    out.statusAfter830 = (await mock.getJson(base() + "/AY-00830/coin.json")).status;
    out.statusAfter832 = (await mock.getJson(base() + "/AY-00832/coin.json")).status;
    out.revertLoaded = await attempt(() => revertCoinDraftToDraft("AY-00833"));
    out.statusAfter833 = (await mock.getJson(base() + "/AY-00833/coin.json")).status;
    out.editLoaded = coinDraftEditRefusal(await mock.getJson(base() + "/AY-00830/coin.json"));
    out.editOrdinary = coinDraftEditRefusal(await mock.getJson(base() + "/AY-00832/coin.json"));
    // The UI path: the Mark ready tap on a stale card reports it and changes nothing.
    const ce = console.error; console.error = () => {}; // the app logs this refusal on purpose
    await promoteStagedCoin("AY-00830");
    console.error = ce;
    out.toast = __toast();
    __teardown();
    return out;
  }).catch(e => ({ threw: String(e) }));
  ok("S-c1 Mark ready refuses a coin on the loaded All rows even when the stored flags are clean (a stale read can't overwrite Promoted): " + JSON.stringify([C.readyLoaded, C.statusAfter830]),
    /already on the All sheet/.test(C.readyLoaded || "") && /Draft/.test(C.statusAfter830));
  ok("S-c2 ... and one whose allRowWritten flag is set: " + C.readyFlag, /already on the All sheet/.test(C.readyFlag || ""));
  ok("S-c3 control: an ordinary draft still marks ready: " + JSON.stringify([C.readyOrdinary, C.statusAfter832]),
    C.readyOrdinary === null && /Ready/.test(C.statusAfter832));
  ok("S-c4 Back to draft refuses a Ready draft whose coin is on the loaded rows: " + JSON.stringify([C.revertLoaded, C.statusAfter833]),
    /already on the All sheet/.test(C.revertLoaded || "") && /Ready/.test(C.statusAfter833));
  ok("S-c5 Edit refuses it too, and an ordinary draft is still editable: " + JSON.stringify([C.editLoaded, C.editOrdinary]),
    /already on the All sheet/.test(C.editLoaded) && C.editOrdinary === "");
  ok("S-c6 the Mark ready tap on such a card says so: " + C.toast, /already on the All sheet/.test(C.toast || ""));

  // ============ S-d. S4: Promote is idempotent ============
  const D = await page.evaluate(async () => {
    const out = {};
    const base = () => writePaths().stagingBase;
    const staleFor = (mock, n) => {            // the first n CollectionID column reads miss this coin's row
      const real = mock.readTableColumn.bind(mock);
      let calls = 0;
      mock.readTableColumn = async (...a) => {
        const col = await real(...a);
        if (a[2] === "CollectionID" && calls++ < n) return col.map((v, i) => (i > 0 && /^AY-008[4-9]/.test(String(v)) ? "" : v));
        return col;
      };
      return () => calls;
    };
    const promoteTwice = async (mock, id, staleReads) => {
      await mock.uploadJson(base() + "/" + id + "/coin.json", __draftOf(id));
      const first = await promoteCoinDraftToAllSheet(id);                // writes the row
      await mock.uploadJson(base() + "/" + id + "/coin.json", __draftOf(id)); // the draft never reached Promoted
      const rowsBefore = JSON.stringify(mock._grids.All);
      const calls = staleFor(mock, staleReads);
      const second = await promoteCoinDraftToAllSheet(id);
      return { first, second, rowsSame: JSON.stringify(mock._grids.All) === rowsBefore, rowCount: __idRows(mock, id).length, calls: calls() };
    };

    // d1) NEGATIVE CONTROL: the first column read lags once; Promote finishes on the existing row.
    {
      const mock = __setup(window.__seedFor);
      __setPromoteRelookMsForTest(0);
      out.d1 = await promoteTwice(mock, "AY-00840", 1);
      __teardown();
    }
    // d2) both looks miss; the tripwire in createAllSheetRow finds exactly one row and Promote adopts it.
    {
      const mock = __setup(window.__seedFor);
      __setPromoteRelookMsForTest(0);
      out.d2 = await promoteTwice(mock, "AY-00841", 2);
      __teardown();
    }
    // d3) NEGATIVE CONTROL: an adopted row that differs from the draft by ONE field (Cost) is never overwritten.
    //     Found on the second look (d3) and named by the tripwire (d3b): no write to All, the draft stays as it
    //     was (not Promoted, files not moved), and the message names the field with both values.
    for (const [key, id, stale] of [["d3", "AY-00842", 1], ["d3b", "AY-00847", 2]]) {
      const mock = __setup(window.__seedFor);
      __setPromoteRelookMsForTest(0);
      await mock.uploadJson(base() + "/" + id + "/coin.json", __draftOf(id, { photos: [{ type: "reference", filename: id + "_reference_01.jpg", caption: "" }] }));
      await promoteCoinDraftToAllSheet(id);
      const H = mock._grids.All[0];
      mock._grids.All.find(x => x[0] === id)[H.indexOf("Cost")] = 4; // a hand edit in Excel (the draft says 3)
      await mock.uploadJson(base() + "/" + id + "/coin.json", __draftOf(id, { photos: [{ type: "reference", filename: id + "_reference_01.jpg", caption: "" }] }));
      staleFor(mock, stale); // the first call below goes through adoption
      const before = JSON.stringify(mock._grids.All);
      const patches = []; const realPatch = mock.patchWorkbookRanges.bind(mock);
      mock.patchWorkbookRanges = async (...a) => { patches.push(a[1]); return realPatch(...a); };
      const res = await promoteCoinDraftToAllSheet(id);
      staleFor(mock, stale); // ... and so does the second (each wrapper counts its own lagging reads)
      const promoted = await promoteCoinDraft(id);              // the button path: toast, no bookkeeping
      const d = await mock.getJson(base() + "/" + id + "/coin.json");
      out[key] = { ok: res.ok, reason: res.reason, message: res.message, promoted, patches: patches.length,
        unchanged: JSON.stringify(mock._grids.All) === before, status: d.status, allRowWritten: d.allRowWritten,
        filesMoved: d.filesMovedOnPromotion, toast: __toast(), rowCount: __idRows(mock, id).length };
      __teardown();
    }
    // d4) the existing row carries a DIFFERENT CoinID: refused, nothing written.
    {
      const mock = __setup(window.__seedFor);
      __setPromoteRelookMsForTest(0);
      await mock.uploadJson(base() + "/AY-00843/coin.json", __draftOf("AY-00843"));
      await promoteCoinDraftToAllSheet("AY-00843");
      const H = mock._grids.All[0];
      mock._grids.All.find(x => x[0] === "AY-00843")[H.indexOf("CoinID")] = "C-SOMETHING-ELSE";
      await mock.uploadJson(base() + "/AY-00843/coin.json", __draftOf("AY-00843"));
      staleFor(mock, 1);
      const before = JSON.stringify(mock._grids.All);
      const second = await promoteCoinDraftToAllSheet("AY-00843");
      out.d4 = { ok: second.ok, message: second.message, unchanged: JSON.stringify(mock._grids.All) === before };
      __teardown();
    }
    // d5) two rows already carry the id: still a hard error (no guessing which is the coin's).
    {
      const mock = __setup(window.__seedFor);
      __setPromoteRelookMsForTest(0);
      await mock.uploadJson(base() + "/AY-00844/coin.json", __draftOf("AY-00844"));
      await promoteCoinDraftToAllSheet("AY-00844");
      mock._grids.All.push(["AY-00844", "C-2026--1C-01"]);
      await mock.uploadJson(base() + "/AY-00844/coin.json", __draftOf("AY-00844"));
      staleFor(mock, 2);
      const before = JSON.stringify(mock._grids.All);
      const second = await promoteCoinDraftToAllSheet("AY-00844");
      out.d5 = { ok: second.ok, message: second.message, unchanged: JSON.stringify(mock._grids.All) === before };
      __teardown();
    }
    // d6) the wait: a normal promote of a NEW coin looks twice with a pause, so it takes at least the wait.
    {
      const mock = __setup(window.__seedFor);
      await mock.uploadJson(base() + "/AY-00845/coin.json", __draftOf("AY-00845"));
      __setPromoteRelookMsForTest(600);
      const t0 = Date.now();
      const r = await promoteCoinDraftToAllSheet("AY-00845");
      const slow = Date.now() - t0;
      await mock.uploadJson(base() + "/AY-00846/coin.json", __draftOf("AY-00846"));
      __setPromoteRelookMsForTest(0);
      const t1 = Date.now();
      await promoteCoinDraftToAllSheet("AY-00846");
      out.d6 = { ok: r.ok, slow, fast: Date.now() - t1 };
      __teardown();
    }
    return out;
  }).catch(e => ({ threw: String(e) }));
  ok("S-d1 NEGATIVE CONTROL: a column read that lags once no longer fails with 'already appears'; Promote finishes on the existing row, one row, nothing rewritten: " + JSON.stringify([D.d1 && D.d1.second, D.d1 && D.d1.rowCount, D.d1 && D.d1.rowsSame]),
    D.d1 && D.d1.first.ok === true && D.d1.second.ok === true && D.d1.second.adopted === true && D.d1.rowCount === 1 && D.d1.rowsSame === true);
  ok("S-d2 if both looks miss, the tripwire's lone row is adopted: " + JSON.stringify([D.d2 && D.d2.second, D.d2 && D.d2.rowCount]),
    D.d2 && D.d2.second.ok === true && D.d2.second.adopted === true && D.d2.rowCount === 1 && D.d2.rowsSame === true);
  for (const k of ["d3", "d3b"]) {
    const X = D[k];
    ok("S-" + k + " NEGATIVE CONTROL: an adopted row differing by one field (Cost) is NEVER overwritten: no write to All, the draft is not Promoted and its files are not moved: " + JSON.stringify(X && { ok: X.ok, reason: X.reason, patches: X.patches, unchanged: X.unchanged, status: X.status, allRowWritten: X.allRowWritten, filesMoved: X.filesMoved }),
      X && X.ok === false && X.reason === "row-differs" && X.patches === 0 && X.unchanged === true &&
      /^Ready/.test(X.status) && X.allRowWritten === false && X.filesMoved === false && X.promoted === false && X.rowCount === 1);
    ok("S-" + k + " (message) -- the message names the field with both values and the way out: " + (X && X.message),
      X && /Cost: on the sheet 4, in the draft 3/.test(X.message) && /Fix the row or the draft, or use Mark as promoted\./.test(X.message) &&
      /Couldn.t promote AY-008/.test(X.toast));
  }
  ok("S-d4 a row with a DIFFERENT CoinID is never adopted or overwritten: " + JSON.stringify(D.d4),
    D.d4 && D.d4.ok === false && /different CoinID/.test(D.d4.message) && D.d4.unchanged === true);
  ok("S-d5 two rows with the id stay a hard error, nothing written: " + JSON.stringify(D.d5),
    D.d5 && D.d5.ok === false && /already appears on the All sheet at row \d+ and row \d+/.test(D.d5.message) && D.d5.unchanged === true);
  ok("S-d6 the look-again wait is real (600 ms set) and a zero setting skips it: " + JSON.stringify(D.d6),
    D.d6 && D.d6.ok === true && D.d6.slow >= 550 && D.d6.fast < D.d6.slow);
}, module);
