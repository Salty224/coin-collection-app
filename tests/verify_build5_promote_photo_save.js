// Build 5 of the November 2026 review (A5, B3, A3, B4, A18, A14, N1, (bv)).
// Plan: docs/REVIEW_BUILD_PLAN_2026-11.md "Build 5 full plan".
//
//   R  A5: a new Photos row is ONE request (row + DateAdded format); a retry
//      finds the row its earlier attempt wrote (same CollectionID + Filename).
//   Q  B3: one Photos read per Save; ids minted and rows claimed from it in
//      one lock; one request per row; the first failed row stops the rest.
//   P  A3: a promotion is finished only when every file moved AND every row
//      landed; the launch retry covers every coin on All; the Docket row.
//   M  B4: Graph's move (moveItem), look first, never re-sent blind.
//   Z  A18: the destination's size must equal the source's.
//   U  A14: a CoinPhotos 409 with the same bytes and no row is adopted.
//   V  N1: a receipt whose upload answer was lost is adopted by bytes.
//   W  (bv): "replaced" only for a Replace / Recrop pick.
//   T  the TEST-only "skip the look first" switch.
// Fixtures copy status values from the code (COIN_DRAFT_STATUS, SET_STATUS).
// No fixed real-time waits: every step awaits the app's own async functions.

const { defineSuite } = require("./harness");
const { DRAFT_FLOW, ALL_HEADERS } = require("./fi_draft_flows");

// In-page helpers: a spying client that can fail / lose chosen calls, and
// the Manage Photos fixture (coin AY-00099) used by the R / Q / U / W checks.
const HELPERS = () => {
  const B = window.__b5 = {};
  B.describe = (k, a) => {
    if (k === "patchWorkbookRanges") return a[1] + "!" + (a[2] || []).map(e => e.address).join(",");
    if (/^read/.test(k)) return String(a[1]) + (a[2] ? " " + a[2] : "");
    return String(a[0] || "").split("/").pop();
  };
  // rules: { match(label, k, a), kind: "fail" | "lost" | "fn", fn(target, a, v), times }
  B.spy = (mock) => {
    const S = { calls: [], rules: [] };
    S.client = new Proxy(mock, { get(t, k) {
      const v = t[k];
      if (typeof v !== "function" || typeof k !== "string") return v;
      return (...a) => {
        const label = k + " " + B.describe(k, a);
        S.calls.push(label);
        const r = S.rules.find(r => (r.times === undefined || r.times > 0) && r.match(label, k, a));
        if (r) {
          if (r.times !== undefined) r.times--;
          if (r.kind === "fail") return Promise.reject(new Error("injected failure: " + label));
          if (r.kind === "lost") return Promise.resolve(v.apply(t, a)).then(() => { throw new Error("injected: the answer was lost: " + label); });
          if (r.kind === "fn") return r.fn(t, a, v);
        }
        return v.apply(t, a);
      };
    } });
    S.count = (re) => S.calls.filter(c => re.test(c)).length;
    return S;
  };
  B.PH = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"];
  B.blank = (n) => new Array(n).fill("");
  B.blob = (tag, size) => { const a = new Uint8Array(size || 100); for (let i = 0; i < a.length; i++) a[i] = (tag.charCodeAt(i % tag.length) + i) & 255; const b = new Blob([a], { type: "image/jpeg" }); b.__tag = tag; return b; };
  B.toasts = [];
  if (!B.hooked) { const orig = window.showToast; window.showToast = function (m, ...r) { B.toasts.push(String(m)); return orig.call(this, m, ...r); }; B.hooked = true; }
  // Manage Photos fixture. rows: extra Photos rows; files: { name: tag } in CoinPhotos.
  B.photoFixture = (opts) => {
    const o = opts || {};
    const ID = o.id || "AY-00099";
    const ALL = ["CollectionID", "Year", "MintMark", "Denomination", "Description", "Status", "LastModified", "Reviewed"];
    const rows = o.rows || [["PH-00001", ID, "Obverse", "", ID + "_obverse_cropped.jpg", "", 46000, ""]];
    const blanks = Array.from({ length: o.blankRows || 10 }, () => B.blank(B.PH.length));
    const mock = createMockGraphClient({ sheets: {
      All: [ALL.slice(), [ID, 1916, "D", "10C", "Mercury Dime", "Owned", "", ""]].concat((o.moreCoins || []).map(c => [c, 1917, "", "10C", "x", "Owned", "", ""])),
      Photos: [B.PH.slice()].concat(rows).concat(blanks),
      Receipts: [["ReceiptID", "CollectionID", "Filename", "DateAdded"], ["", "", "", ""], ["", "", "", ""]]
    } });
    const P = writePaths();
    Object.keys(o.files || {}).forEach(n => mock._store.set(P.coinPhotos + "/" + n, { kind: "bytes", value: B.blob(o.files[n]) }));
    const S = B.spy(mock);
    __setGraphClientForTest(S.client);
    __resetSheetHeaderMapsForTest(); __resetAllHeaderMapForTest();
    __setAddCoinWriteEnabledForTest(true); __setBrowseEditWriteEnabledForTest(true); __setDocketWriteEnabledForTest(false);
    const ids = [ID].concat(o.moreCoins || []);
    __setLiveCoinsForTest(ids.map(id => ({ id, name: id + " coin", denom: "10C", year: 1916, mint: "D", description: "Mercury Dime" })));
    const stored = {};
    ids.forEach(id => { stored[id] = []; });
    rows.forEach(r => { if (stored[r[1]]) stored[r[1]].push({ photoId: r[0], photoType: r[2], galleryType: galleryTypeForPhotoType(r[2]), subGroupId: r[3], filename: r[4], originalFilename: r[7] || "", label: r[5] }); });
    __setStoredPhotosForTest(stored);
    ids.forEach(id => { delete galleryStore[id]; });
    renderManagePhotosInto("managePhotosSections", { id: ID, name: "Test coin", meta: ID, kind: "coin" });
    B.toasts = [];
    return { ID, mock, S, P, grid: () => mock._grids.Photos, rowsFor: (id) => mock._grids.Photos.filter(r => r[1] === id) };
  };
  B.pick = (id, type, tag, size, extra) => {
    const b = B.blob(tag, size);
    const e = Object.assign({ type, blob: b, url: URL.createObjectURL(b), caption: "" }, extra || {});
    addGalleryEntryAndCommit(id, e, null);
    return e;
  };
  // The Promote fixture (tests/fi_draft_flows.js): AY-00706 with an Obverse
  // (crop + original), a Reference and a receipt in Staging.
  B.draftFixture = async (mode) => {
    const mock = await window.__flow.setup();
    const S = B.spy(mock);
    __setGraphClientForTest(S.client);
    __resetSheetHeaderMapsForTest(); __resetAllHeaderMapForTest();
    B.toasts = [];
    return { mock, S, P: writePaths(), folder: coinDraftFolder("AY-00706") };
  };
  B.rows = (mock, sheet) => (mock._grids[sheet] || []).slice(1).filter(r => r[0]);
  B.docketUnfinishedText = () => [...document.querySelectorAll("#docketOtherContainer .docket-promotion-unfinished")].map(e => e.textContent);
};

module.exports = defineSuite("build5-promote-photo-save", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp(PHONE);
  await page.evaluate(HELPERS);
  await page.evaluate(DRAFT_FLOW, { mode: "promote", ALL_HEADERS });

  // ================= R: A5 =================
  const R = await page.evaluate(async () => {
    const B = window.__b5, out = {};
    // R1: the first Save's row lands but its answer is lost; Save again reuses it.
    let F = B.photoFixture();
    F.S.rules.push({ match: l => /^patchWorkbookRanges Photos!A\d+:H\d+,G\d+:G\d+$/.test(l), kind: "lost", times: 1 });
    const e1 = B.pick(F.ID, "reference", "ref-new", 300);
    const r1 = await savePhotosAndLabels(F.ID, null);
    const afterFirst = F.rowsFor(F.ID).filter(r => r[2] === "Reference").map(r => r[0] + ":" + r[4]);
    const r2 = await savePhotosAndLabels(F.ID, null);
    const refs = F.rowsFor(F.ID).filter(r => r[2] === "Reference");
    out.R1 = { firstFailed: r1.photos.failed.length, afterFirst, rows: refs.map(r => r[0] + ":" + r[4]), secondOk: r2.photos.added, pending: pendingPhotoCount(F.ID) };
    // R2: a clean new row is ONE call carrying the row and its DateAdded format.
    F = B.photoFixture();
    B.pick(F.ID, "other", "oth", 200);
    await savePhotosAndLabels(F.ID, null);
    const pc = F.S.calls.filter(c => /^patchWorkbookRanges Photos!/.test(c));
    const rowIdx = F.grid().findIndex(r => r[2] === "Other");
    out.R2 = { patches: pc, fmt: (F.mock._numberFormats.Photos || [])[rowIdx] && F.mock._numberFormats.Photos[rowIdx][6], want: WORKBOOK_DATE_FORMAT,
      dateIsNumber: typeof F.grid()[rowIdx][6] === "number" };
    // R3: the batch part-lands (the row, not its format); the photo stays pending; Save again: one row, with its format.
    F = B.photoFixture();
    F.S.rules.push({ match: l => /^patchWorkbookRanges Photos!A\d+:H\d+,G\d+:G\d+$/.test(l), kind: "fn", times: 1,
      fn: (t, a) => t.patchWorkbookRanges(a[0], a[1], [a[2][0]]).then(() => { throw batchWriteError(a[1], a[2], [0], 1, "injected: the format did not land"); }) });
    B.pick(F.ID, "reference", "ref3", 250);
    const q1 = await savePhotosAndLabels(F.ID, null);
    const pendAfterPartial = pendingPhotoCount(F.ID);
    await savePhotosAndLabels(F.ID, null);
    const ri = F.grid().findIndex(r => r[2] === "Reference");
    out.R3 = { failed: q1.photos.failed.length, pendAfterPartial, refRows: F.rowsFor(F.ID).filter(r => r[2] === "Reference").length,
      fmt: (F.mock._numberFormats.Photos || [])[ri] && F.mock._numberFormats.Photos[ri][6], pending: pendingPhotoCount(F.ID) };
    // R4 / R5: direct batch calls.
    F = B.photoFixture({ rows: [
      ["PH-00001", "AY-00099", "Reference", "", "AY-00099_reference_01.jpg", "mine", 46000, ""],
      ["PH-00002", "AY-00098", "Reference", "", "X_shared.jpg", "theirs", 46000, ""]], moreCoins: ["AY-00098"] });
    const b4 = await writePhotoRowsBatch("AY-00099", [{ type: "reference", filename: "X_shared.jpg", caption: "" }]);
    const b5 = await writePhotoRowsBatch("AY-00099", [{ type: "reference", filename: "AY-00099_reference_02.jpg", caption: "" }]);
    out.R4 = { ok: b4[0].ok, theirs: F.grid().filter(r => r[4] === "X_shared.jpg").map(r => r[0] + ":" + r[1] + ":" + r[5]) };
    out.R5 = { ok: b5[0].ok, mine: F.grid().filter(r => r[0] === "PH-00001").map(r => r[4] + ":" + r[5]),
      newIds: F.rowsFor("AY-00099").map(r => r[0]) };
    return out;
  });
  ok("R1 A5: a row whose answer was lost is reused by Save again: one Reference row, the same PhotoID, nothing pending",
    R.R1.firstFailed === 1 && R.R1.afterFirst.length === 1 && R.R1.rows.length === 1 && R.R1.rows[0] === R.R1.afterFirst[0] && R.R1.pending === 0, R.R1);
  ok("R2 A5: a new Photos row is ONE patch call (row range + its DateAdded cell), the date a number with yyyy-mm-dd",
    R.R2.patches.length === 1 && /^patchWorkbookRanges Photos!A\d+:H\d+,G\d+:G\d+$/.test(R.R2.patches[0]) && R.R2.fmt === R.R2.want && R.R2.dateIsNumber, R.R2);
  ok("R3 A5: a part-landed batch keeps the photo pending; Save again writes the SAME row, now with its format",
    R.R3.failed === 1 && R.R3.pendAfterPartial === 1 && R.R3.refRows === 1 && R.R3.fmt === "yyyy-mm-dd" && R.R3.pending === 0, R.R3);
  ok("R4 A5: the same Filename under ANOTHER CollectionID is never reused (its row is untouched; a new row for this coin)",
    R.R4.ok && R.R4.theirs.length === 2 && R.R4.theirs.indexOf("PH-00002:AY-00098:theirs") !== -1, R.R4);
  ok("R5 A5: an earlier Reference of the same coin (another Filename) is never touched",
    R.R5.ok && R.R5.mine.length === 1 && R.R5.mine[0] === "AY-00099_reference_01.jpg:mine" && R.R5.newIds.length === 3, R.R5);

  // ================= Q: B3 =================
  const Q = await page.evaluate(async () => {
    const B = window.__b5, out = {};
    // Q1 / Q2: four new photos.
    let F = B.photoFixture({ rows: [["PH-00007", "AY-00099", "Obverse", "", "AY-00099_obverse_cropped.jpg", "", 46000, ""]] });
    [["reference", 300], ["other", 400], ["coa", 500], ["slab_obverse", 600]].forEach(([t, n]) => B.pick(F.ID, t, t, n));
    const before = F.S.calls.length;
    const res = await savePhotosAndLabels(F.ID, null);
    const calls = F.S.calls.slice(before);
    out.Q1 = { n: calls.length, calls, summary: photoSaveSummaryText(res) };
    out.Q2 = { rows: F.grid().slice(1).map((r, i) => r[0] ? (i + 2) + ":" + r[0] + ":" + r[2] : "").filter(Boolean) };
    // Q3: two coins' Saves at the same time.
    F = B.photoFixture({ moreCoins: ["AY-00098"] });
    B.pick("AY-00099", "reference", "a", 111); B.pick("AY-00098", "reference", "b", 222);
    await Promise.all([savePhotosAndLabels("AY-00099", null), savePhotosAndLabels("AY-00098", null)]);
    const refs = F.grid().filter(r => r[2] === "Reference");
    out.Q3 = { refs: refs.map(r => r[0] + ":" + r[1]), distinctIds: new Set(refs.map(r => r[0])).size, distinctRows: new Set(refs.map(r => F.grid().indexOf(r))).size };
    // Q4: two Saves in a row read the Photos header twice in all (once each).
    F = B.photoFixture();
    B.pick(F.ID, "reference", "q4a", 120); await savePhotosAndLabels(F.ID, null);
    B.pick(F.ID, "other", "q4b", 130); await savePhotosAndLabels(F.ID, null);
    out.Q4 = { headerReads: F.S.count(/^readTableHeaderRow Photos/), gridReads: F.S.count(/^readWorkbookRange Photos A2:/) };
    // Q6: the second of three rows fails: the third is not sent; Save again finishes with no duplicate.
    F = B.photoFixture();
    let n = 0;
    F.S.rules.push({ match: l => /^patchWorkbookRanges Photos!A\d+:H\d+,G/.test(l) && (++n === 2), kind: "fail", times: 1 });
    const e1 = B.pick(F.ID, "reference", "q6a", 140), e2 = B.pick(F.ID, "other", "q6b", 150), e3 = B.pick(F.ID, "coa", "q6c", 160);
    const q6 = await savePhotosAndLabels(F.ID, null);
    const sentFirst = F.S.count(/^patchWorkbookRanges Photos!A\d+:H\d+,G/);
    out.Q6 = { failed: q6.photos.failed.length, added: q6.photos.added, sentFirst, e3Why: e3.uploadError ? (q6.photos.failedReasons || {})[e3.filename] : "", pending: pendingPhotoCount(F.ID) };
    await savePhotosAndLabels(F.ID, null);
    const names = F.rowsFor(F.ID).map(r => r[4]);
    out.Q6.after = { pending: pendingPhotoCount(F.ID), names, dup: names.length !== new Set(names).size };
    // Q7: a Replace writes only the file cells after a one-row read; a row that moved refuses.
    F = B.photoFixture({ rows: [["PH-00001", "AY-00099", "Reference", "", "AY-00099_reference_01.jpg", "lbl", 46000, ""]] });
    const s0 = F.S.calls.length;
    const q7 = await writePhotoRowsBatch("AY-00099", [{ type: "reference", filename: "AY-00099_reference_02.jpg", replacePhotoId: "PH-00001" }]);
    const q7calls = F.S.calls.slice(s0);
    let moved;
    await withPhotoSaveScope(async () => {
      await readPhotosTableForWrite();
      F.mock._grids.Photos[1][0] = "PH-00050"; // another photo now sits on that row
      moved = await writePhotoRowsBatch("AY-00099", [{ type: "reference", filename: "AY-00099_reference_03.jpg", replacePhotoId: "PH-00001" }]);
    });
    out.Q7 = { ok: q7[0].ok, replaced: q7[0].ok && q7[0].res.replaced, calls: q7calls, row: F.grid()[1].slice(0, 6),
      movedOk: moved[0].ok, movedErr: moved[0].ok ? "" : String(moved[0].error.message) };
    // Q8: a new photo, a label and a removal in one Save: the Photos tab is read once.
    F = B.photoFixture({ rows: [
      ["PH-00001", "AY-00099", "Reference", "", "AY-00099_reference_01.jpg", "old", 46000, ""],
      ["PH-00002", "AY-00099", "Other", "", "AY-00099_other_01.jpg", "", 46000, ""]] });
    const list = galleryFor(F.ID);
    B.pick(F.ID, "coa", "q8", 170);
    list.find(e => e.storedFilename === "AY-00099_reference_01.jpg").caption = "new label";
    list.find(e => e.storedFilename === "AY-00099_other_01.jpg").pendingRemove = true;
    const q8 = await savePhotosAndLabels(F.ID, null);
    out.Q8 = { headerReads: F.S.count(/^readTableHeaderRow Photos/), columnReads: F.S.count(/^readTableColumn Photos/),
      tableReads: F.S.calls.filter(c => { const m = /^readWorkbookRange Photos A(\d+):H(\d+)$/.exec(c); return m && m[1] !== m[2]; }).length,
      oneRowReads: F.S.calls.filter(c => { const m = /^readWorkbookRange Photos A(\d+):H(\d+)$/.exec(c); return m && m[1] === m[2]; }).length,
      label: (F.grid().find(r => r[0] === "PH-00001") || [])[5], otherGone: !F.grid().some(r => r[0] === "PH-00002"),
      coa: F.rowsFor(F.ID).filter(r => r[2] === "COA").length, summary: photoSaveSummaryText(q8) };
    return out;
  });
  const Q1want = ["getItemMeta AY-00099_reference_01.jpg", "uploadFile AY-00099_reference_01.jpg", "getItemMeta AY-00099_other_01.jpg",
    "uploadFile AY-00099_other_01.jpg", "getItemMeta AY-00099_coa_01.jpg", "uploadFile AY-00099_coa_01.jpg",
    "getItemMeta AY-00099_slab_obverse.jpg", "uploadFile AY-00099_slab_obverse.jpg",
    "readTableHeaderRow Photos", "readTableColumn Photos PhotoID", "readWorkbookRange Photos A2:H12"];
  ok("Q1 B3: four new photos = exactly 15 requests (4 name checks, 4 uploads, 3 reads, 4 row writes; it was 38)",
    Q.Q1.n === 15 && Q1want.every((c, i) => Q.Q1.calls[i] === c) && Q.Q1.calls.slice(11).every(c => /^patchWorkbookRanges Photos!A\d+:H\d+,G\d+:G\d+$/.test(c)) &&
    Q.Q1.summary === "4 photos added", Q.Q1);
  ok("Q2 B3: consecutive PhotoIDs from the column's max + 1, in the first blank rows (3, 4, 5, 6)",
    JSON.stringify(Q.Q2.rows) === JSON.stringify(["2:PH-00007:Obverse", "3:PH-00008:Reference", "4:PH-00009:Other", "5:PH-00010:COA", "6:PH-00011:Slab_Obverse"]), Q.Q2);
  ok("Q3 B3: two coins' Saves at the same time get different rows and different PhotoIDs (the lock)",
    Q.Q3.refs.length === 2 && Q.Q3.distinctIds === 2 && Q.Q3.distinctRows === 2, Q.Q3);
  ok("Q4 B3: each Save reads the Photos tab once: two Saves, two header reads, two table reads (never carried over)",
    Q.Q4.headerReads === 2 && Q.Q4.gridReads === 2, Q.Q4);
  ok("Q6 B3: the second of three rows fails: the third is NOT sent and stays pending (not tried); Save again finishes, no duplicate",
    Q.Q6.failed === 2 && Q.Q6.added === 1 && Q.Q6.sentFirst === 2 && /not tried/.test(Q.Q6.e3Why || "") && Q.Q6.pending === 2 &&
    Q.Q6.after.pending === 0 && Q.Q6.after.names.length === 4 && !Q.Q6.after.dup, Q.Q6);
  ok("Q7 B3: a Replace reads its ONE row, then writes only the Filename cell; a row that moved since the Save's read refuses",
    Q.Q7.ok && Q.Q7.replaced && Q.Q7.calls.filter(c => /^readWorkbookRange Photos A2:H2$/.test(c)).length === 1 &&
    Q.Q7.calls.filter(c => /^patchWorkbookRanges/.test(c)).length === 1 && Q.Q7.calls.some(c => /^patchWorkbookRanges Photos!E2:E2,H2:H2$/.test(c)) &&
    Q.Q7.row[5] === "lbl" && !Q.Q7.movedOk && /changed before it could be written/.test(Q.Q7.movedErr), Q.Q7);
  ok("Q8 B3: a new photo, a label and a removal in one Save read the Photos tab ONCE (each existing row checked by a one-row read)",
    Q.Q8.headerReads === 1 && Q.Q8.columnReads === 1 && Q.Q8.tableReads === 1 && Q.Q8.oneRowReads === 2 &&
    Q.Q8.label === "new label" && Q.Q8.otherGone && Q.Q8.coa === 1, Q.Q8);

  // ================= P / M / Z: A3, B4, A18 =================
  const P = await page.evaluate(async () => {
    const B = window.__b5, out = {}, ID = "AY-00706";
    const tail = (re, S) => S.calls.filter(c => re.test(c));
    // P1 / P2 / M1: the first Photos row fails during Promote.
    let F = await B.draftFixture();
    F.S.rules.push({ match: l => /^patchWorkbookRanges Photos!/.test(l), kind: "fail", times: 1 });
    await promoteCoinDraft(ID);
    let d = await readCoinDraft(ID);
    await renderNeedsAttentionHub();
    out.P1 = { toasts: B.toasts.join(" / "), allRowWritten: d.allRowWritten, moved: d.filesMovedOnPromotion, docket: B.docketUnfinishedText(),
      retryBtn: !!document.querySelector("#docketOtherContainer .docket-retry"),
      moves: tail(/^moveItem /, F.S).length, copies: tail(/^(uploadBytes|deleteItem|getFileBytes) /, F.S).length };
    await processPromotedCoinDrafts();
    d = await readCoinDraft(ID);
    await renderNeedsAttentionHub();
    const ph = B.rows(F.mock, "Photos");
    out.P2 = { moved: d.filesMovedOnPromotion, photos: ph.map(r => r[2] + ":" + r[4]), receipts: B.rows(F.mock, "Receipts").length, docket: B.docketUnfinishedText() };
    // P3: Force Add whose Photos row fails: the draft stays Ready; the launch retry still finishes it.
    window.__flow = null;
    return out;
  });
  ok("P1 A3: a Photos row that fails during Promote: a second toast says the photos are not finished (naming the file); allRowWritten, NOT filesMovedOnPromotion; the Docket's Other section lists it with Try again",
    /AY-00706 is on the All sheet, but its photos are not finished: AY-00706_obverse_cropped\.jpg — Photos row: injected failure/.test(P.P1.toasts) &&
    P.P1.allRowWritten === true && P.P1.moved !== true && P.P1.docket.length === 1 && /AY-00706 is on All, but its photos are not finished/.test(P.P1.docket[0]) &&
    /Last try: AY-00706_obverse_cropped\.jpg/.test(P.P1.docket[0]) && P.P1.retryBtn, P.P1);
  ok("M1 B4: a Promote moves each of its 4 files with ONE moveItem each: no download, no upload, no delete",
    P.P1.moves === 4 && P.P1.copies === 0, P.P1);
  ok("P2 A3: the launch retry writes the missing rows, sets the flag, no duplicate; the Docket row is gone",
    P.P2.moved === true && JSON.stringify(P.P2.photos) === JSON.stringify(["Obverse:AY-00706_obverse_cropped.jpg", "Reference:AY-00706_reference_01.jpg"]) &&
    P.P2.receipts === 1 && P.P2.docket.length === 0, P.P2);

  const P3 = await page.evaluate(async () => {
    const B = window.__b5, out = {}, ID = "AY-00706";
    // Re-install the flow in force mode.
    return out;
  });
  await page.evaluate(DRAFT_FLOW, { mode: "force", ALL_HEADERS });
  const PF = await page.evaluate(async () => {
    const B = window.__b5, out = {}, ID = "AY-00706";
    let F = await B.draftFixture();
    F.S.rules.push({ match: l => /^patchWorkbookRanges Receipts!/.test(l), kind: "fail", times: 1 });
    await forceAddCoinDraft(ID);
    let d = await readCoinDraft(ID);
    out.before = { status: d.status, forceAdded: d.forceAdded, allRowWritten: d.allRowWritten, moved: d.filesMovedOnPromotion, toast: B.toasts.join(" / ") };
    await processPromotedCoinDrafts();
    d = await readCoinDraft(ID);
    out.after = { moved: d.filesMovedOnPromotion, receipts: B.rows(F.mock, "Receipts").length, photos: B.rows(F.mock, "Photos").length };
    // P4: a draft WITHOUT allRowWritten is never retried.
    F = await B.draftFixture();
    const s0 = F.S.calls.length;
    await processPromotedCoinDrafts();
    out.P4 = { moves: F.S.calls.slice(s0).filter(c => /^(moveItem|getItemMeta) /.test(c)).length };
    return out;
  });
  ok("P3 A3/A4: a Force Added coin (status Ready) whose Receipts row failed is retried at launch and finished",
    PF.before.status === "Ready for reconciliation" && PF.before.forceAdded === true && PF.before.allRowWritten === true && PF.before.moved !== true &&
    /photos are not finished/.test(PF.before.toast) && PF.after.moved === true && PF.after.receipts === 1 && PF.after.photos === 2, PF);
  ok("P4 A3: a draft without allRowWritten is never touched by the launch retry", PF.P4.moves === 0, PF.P4);

  await page.evaluate(DRAFT_FLOW, { mode: "promote", ALL_HEADERS });
  const PM = await page.evaluate(async () => {
    const B = window.__b5, out = {}, ID = "AY-00706";
    const since = (S, s0, re) => S.calls.slice(s0).filter(c => re.test(c));
    // P5 / Z: a different file of ANOTHER size at the Reference's destination.
    let F = await B.draftFixture();
    F.mock._store.set(F.P.coinPhotos + "/AY-00706_reference_01.jpg", { kind: "bytes", value: B.blob("someone-else", 999) });
    await promoteCoinDraft(ID);
    let d = await readCoinDraft(ID);
    await renderNeedsAttentionHub();
    out.P5 = { toast: B.toasts.join(" / "), moved: d.filesMovedOnPromotion, kept: F.mock._store.get(F.P.coinPhotos + "/AY-00706_reference_01.jpg").value.__tag,
      srcKept: F.mock._store.has(F.folder + "/AY-00706_reference_01.jpg"), downloads: F.S.count(/^getFileBytes /), docket: B.docketUnfinishedText() };
    const s0 = F.S.calls.length;
    await processPromotedCoinDrafts();
    out.P5.retryDownloads = since(F.S, s0, /^getFileBytes /).length;
    out.P5.retryMoves = since(F.S, s0, /^moveItem /).length;
    // P5b: the same size but different bytes: compared, refused.
    F = await B.draftFixture();
    const src = F.mock._store.get(F.folder + "/AY-00706_reference_01.jpg").value;
    F.mock._store.set(F.P.coinPhotos + "/AY-00706_reference_01.jpg", { kind: "bytes", value: B.blob("other-bytes", src.size) });
    await promoteCoinDraft(ID);
    out.P5b = { moved: (await readCoinDraft(ID)).filesMovedOnPromotion, kept: F.mock._store.get(F.P.coinPhotos + "/AY-00706_reference_01.jpg").value.__tag,
      downloads: F.S.count(/^getFileBytes /) };
    // M2: identical bytes already at the destination (an earlier run's copy): compare, then the Staging copy goes.
    F = await B.draftFixture();
    F.mock._store.set(F.P.coinPhotos + "/AY-00706_reference_01.jpg", { kind: "bytes", value: F.mock._store.get(F.folder + "/AY-00706_reference_01.jpg").value });
    await promoteCoinDraft(ID);
    out.M2 = { moved: (await readCoinDraft(ID)).filesMovedOnPromotion, srcGone: !F.mock._store.has(F.folder + "/AY-00706_reference_01.jpg"),
      deletes: F.S.count(/^deleteItem /), moves: F.S.count(/^moveItem /) };
    // M3: the name looks free, then a file appears before the move (a 409): compared, refused, nothing overwritten.
    F = await B.draftFixture();
    let looked = false;
    F.S.rules.push({ match: l => l === "moveItem AY-00706_reference_01.jpg", kind: "fn", times: 1, fn: (t, a, v) => {
      t._store.set(F.P.coinPhotos + "/AY-00706_reference_01.jpg", { kind: "bytes", value: B.blob("appeared", 77) });
      return v.apply(t, a);
    } });
    await promoteCoinDraft(ID);
    out.M3 = { moved: (await readCoinDraft(ID)).filesMovedOnPromotion, kept: F.mock._store.get(F.P.coinPhotos + "/AY-00706_reference_01.jpg").value.__tag,
      srcKept: F.mock._store.has(F.folder + "/AY-00706_reference_01.jpg"), toast: B.toasts.join(" / ") };
    // M4: a move whose answer is lost: both ends looked at, counted as moved, never sent twice.
    F = await B.draftFixture();
    F.S.rules.push({ match: l => /^moveItem /.test(l), kind: "lost", times: 1 });
    await promoteCoinDraft(ID);
    out.M4 = { moved: (await readCoinDraft(ID)).filesMovedOnPromotion, moves: F.S.count(/^moveItem /), toast: B.toasts.join(" / ") };
    // M5: a move that fails (not applied): the source is kept, not finished; the launch retry finishes it.
    F = await B.draftFixture();
    F.S.rules.push({ match: l => /^moveItem /.test(l), kind: "fail", times: 1 });
    await promoteCoinDraft(ID);
    out.M5 = { moved: (await readCoinDraft(ID)).filesMovedOnPromotion, srcKept: F.mock._store.has(F.folder + "/AY-00706_obverse_cropped.jpg"), toast: B.toasts.join(" / ") };
    await processPromotedCoinDrafts();
    out.M5.after = (await readCoinDraft(ID)).filesMovedOnPromotion;
    // Z1: the destination's size differs after the move: not finished, nothing deleted.
    F = await B.draftFixture();
    F.S.rules.push({ match: l => l === "moveItem AY-00706_receipt.pdf", kind: "fn", times: 1, fn: (t, a, v) => v.apply(t, a).then(r => {
      t._store.set(a[1], { kind: "bytes", value: B.blob("truncated", 3) }); return r; }) });
    await promoteCoinDraft(ID);
    out.Z1 = { moved: (await readCoinDraft(ID)).filesMovedOnPromotion, toast: B.toasts.join(" / "), deletes: F.S.count(/^deleteItem /) };
    // P6: every row lands, then marking the draft finished fails: not finished; the next launch re-records with no duplicate.
    F = await B.draftFixture();
    let jsonWrites = 0;
    F.S.rules.push({ match: l => /^uploadJson coin\.json/.test(l) && (++jsonWrites === 2), kind: "fail", times: 1 });
    await promoteCoinDraft(ID);
    out.P6 = { moved: (await readCoinDraft(ID)).filesMovedOnPromotion, toast: B.toasts.join(" / ") };
    await processPromotedCoinDrafts();
    out.P6.after = { moved: (await readCoinDraft(ID)).filesMovedOnPromotion, photos: B.rows(F.mock, "Photos").map(r => r[4]), receipts: B.rows(F.mock, "Receipts").length };
    // P9: two runs for one id at the same time run once.
    F = await B.draftFixture();
    const dd = await readCoinDraft(ID);
    dd.allRowWritten = true;
    await Promise.all([movePromotedCoinFiles(dd), movePromotedCoinFiles(Object.assign({}, dd))]);
    out.P9 = { moves: F.S.count(/^moveItem /) };
    return out;
  });
  ok("P5 A3/A18: a different file of another size at the destination: refused with no download, both kept, the toast and the Docket row say so; a launch retry repeats the refusal, still with no download",
    PM.P5.moved !== true && PM.P5.kept === "someone-else" && PM.P5.srcKept && PM.P5.downloads === 0 &&
    /AY-00706_reference_01\.jpg — a different file is already in CoinPhotos under that name — nothing overwritten/.test(PM.P5.toast) &&
    PM.P5.docket.length === 1 && /a different file is already in CoinPhotos/.test(PM.P5.docket[0]) && PM.P5.retryDownloads === 0 && PM.P5.retryMoves === 0, PM.P5);
  ok("P5b the same size but different bytes: compared by bytes, refused, nothing overwritten",
    PM.P5b.moved !== true && PM.P5b.kept === "other-bytes" && PM.P5b.downloads === 2, PM.P5b);
  ok("M2 B4: identical bytes already at the destination: the Staging copy is deleted after the compare; the other three move",
    PM.M2.moved === true && PM.M2.srcGone && PM.M2.deletes === 1 && PM.M2.moves === 3, PM.M2);
  ok("M3 B4: a file that appears between the look and the move (409): compared, refused, nothing overwritten, the source kept",
    PM.M3.moved !== true && PM.M3.kept === "appeared" && PM.M3.srcKept && /a different file is already in CoinPhotos/.test(PM.M3.toast), PM.M3);
  ok("M4 B4: a move whose answer is lost is looked at, counted as moved, and never sent twice",
    PM.M4.moved === true && PM.M4.moves === 4 && !/not finished/.test(PM.M4.toast), PM.M4);
  ok("M5 B4: a move that fails keeps the source, says not finished; the launch retry finishes it",
    PM.M5.moved !== true && PM.M5.srcKept && /moving it failed/.test(PM.M5.toast) && PM.M5.after === true, PM.M5);
  ok("Z1 A18: the destination's size differs after the move: not finished, \"size differs\", nothing deleted",
    PM.Z1.moved !== true && /size differs after the move \(3 vs \d+ bytes\)/.test(PM.Z1.toast) && PM.Z1.deletes === 0, PM.Z1);
  ok("P6 A3: every row lands but marking the draft finished fails: not finished; the next launch re-records with NO duplicate",
    PM.P6.moved !== true && /marking the draft finished failed/.test(PM.P6.toast) && PM.P6.after.moved === true &&
    JSON.stringify(PM.P6.after.photos) === JSON.stringify(["AY-00706_obverse_cropped.jpg", "AY-00706_reference_01.jpg"]) && PM.P6.after.receipts === 1, PM.P6);
  ok("P9 A3: two runs for one id at the same time run once (4 moves, not 8)", PM.P9.moves === 4, PM.P9);

  // P7 / M6: the Set side (movePromotedSetFiles), renamed moves and the finished rule.
  const PS = await page.evaluate(async () => {
    const B = window.__b5, out = {};
    const ID = "AY-00760";
    const mock = createMockGraphClient({ sheets: {
      Photos: [B.PH.slice()].concat(Array.from({ length: 8 }, () => B.blank(B.PH.length))),
      Receipts: [["ReceiptID", "CollectionID", "Filename", "DateAdded"], ["", "", "", ""]] } });
    const S = B.spy(mock);
    __setGraphClientForTest(S.client);
    __resetSheetHeaderMapsForTest();
    const folder = setDraftFolder(ID), P = writePaths();
    ["set.jpg", ID + "_coa_01.jpg", ID + "-A_obverse.jpg", ID + "-A_reverse.jpg", "receipt.pdf"].forEach((n, i) =>
      mock._store.set(folder + "/" + n, { kind: "bytes", value: B.blob(n, 50 + i) }));
    const draft = { type: "set", collectionID: ID, status: SET_STATUS.PROMOTED, filesMovedOnPromotion: false,
      wholeSetPhoto: "set.jpg", receiptPhoto: "receipt.pdf", photos: [{ type: "coa", subGroupId: "", filename: ID + "_coa_01.jpg", caption: "" }],
      children: [{ collectionID: ID + "-A", photos: { obverse: ID + "-A_obverse.jpg", reverse: ID + "-A_reverse.jpg" } }] };
    await mock.uploadJson(folder + "/set.json", draft);
    S.rules.push({ match: l => /^patchWorkbookRanges Photos!/.test(l), kind: "fail", times: 1 });
    await processPromotedSetDrafts();
    const d1 = await mock.getJson(folder + "/set.json");
    out.P7 = { moved: d1.filesMovedOnPromotion, rowsAfterFail: B.rows(mock, "Photos").length };
    await processPromotedSetDrafts();
    const d2 = await mock.getJson(folder + "/set.json");
    out.P7.after = { moved: d2.filesMovedOnPromotion, photos: B.rows(mock, "Photos").map(r => r[1] + ":" + r[2] + ":" + r[4]), receipts: B.rows(mock, "Receipts").map(r => r[1] + ":" + r[2]) };
    out.M6 = { files: [...mock._store.keys()].filter(k => k.indexOf(P.coinPhotos + "/") === 0 || k.indexOf(P.coinReceipts + "/") === 0).map(k => k.split("/").pop()).sort(),
      moves: S.calls.filter(c => /^moveItem /.test(c)).length, uploads: S.count(/^uploadBytes /) };
    return out;
  });
  ok("P7 A3: the Set side: a Photos row failure leaves filesMovedOnPromotion unset; the next launch finishes it with no duplicate row",
    PS.P7.moved !== true && PS.P7.after.moved === true && PS.P7.after.photos.length === 4 && new Set(PS.P7.after.photos).size === 4 &&
    PS.P7.after.photos.indexOf("AY-00760:OGP_Obverse:AY-00760_set.jpg") !== -1 && PS.P7.after.photos.indexOf("AY-00760-A:Obverse:AY-00760-A_obverse.jpg") !== -1 &&
    JSON.stringify(PS.P7.after.receipts) === JSON.stringify(["AY-00760:AY-00760_receipt.pdf"]), PS.P7);
  ok("M6 B4: a Set's files are moved (and renamed: set.jpg -> {id}_set.jpg, receipt.pdf -> {id}_receipt.pdf) with Graph's move, no upload",
    JSON.stringify(PS.M6.files) === JSON.stringify(["AY-00760-A_obverse.jpg", "AY-00760-A_reverse.jpg", "AY-00760_coa_01.jpg", "AY-00760_receipt.pdf", "AY-00760_set.jpg"]) &&
    PS.M6.moves === 5 && PS.M6.uploads === 0, PS.M6);

  // P8: Mark as promoted on a coin that already has one of its two Photos rows (its files already moved).
  await page.evaluate(DRAFT_FLOW, { mode: "mark", ALL_HEADERS });
  const PK = await page.evaluate(async () => {
    const B = window.__b5, ID = "AY-00706";
    const F = await B.draftFixture();
    // The Obverse was recorded and moved by an earlier run; the Reference was not.
    F.mock._grids.Photos[1] = ["PH-00001", ID, "Obverse", "", ID + "_obverse_cropped.jpg", "", 46000, ID + "_obverse_original.jpg"];
    ["_obverse_cropped.jpg", "_obverse_original.jpg"].forEach(n => {
      F.mock._store.set(F.P.coinPhotos + "/" + ID + n, F.mock._store.get(F.folder + "/" + ID + n));
      F.mock._store.delete(F.folder + "/" + ID + n);
    });
    await markCoinDraftAlreadyPromoted(ID);
    const d = await readCoinDraft(ID);
    return { moved: d.filesMovedOnPromotion, status: d.status, photos: B.rows(F.mock, "Photos").map(r => r[0] + ":" + r[4]), receipts: B.rows(F.mock, "Receipts").length };
  });
  ok("P8 A3 (Ray's Q2): Mark as promoted with one of two Photos rows already there: no skip; the other file moves, 2 rows in all, finished",
    PK.moved === true && PK.status === "Promoted" && PK.photos.length === 2 && PK.photos[0] === "PH-00001:AY-00706_obverse_cropped.jpg" &&
    PK.photos[1].endsWith(":AY-00706_reference_01.jpg") && PK.receipts === 1, PK);

  // ================= M7 / M8: the real client's move =================
  const M7 = await page.evaluate(async () => {
    const prevFetch = window.fetch, prevTok = window.getWriteToken;
    const reqs = [];
    window.getWriteToken = async () => "tok";
    let conflictNext = false;
    window.fetch = async (url, init) => {
      reqs.push({ url: String(url), method: (init && init.method) || "GET", body: init && init.body ? String(init.body) : "" });
      if (!init || !init.method || init.method === "GET") return new Response(JSON.stringify({ id: "FOLDER-ID-1", name: "CoinPhotos" }), { status: 200 });
      if (conflictNext) { conflictNext = false; return new Response("nameAlreadyExists", { status: 409 }); }
      return new Response(JSON.stringify({ id: "x", name: "moved", size: 5 }), { status: 200 });
    };
    const out = {};
    try {
      delete RealGraphClient._folderIds;
      for (const n of ["a.jpg", "b.jpg", "c.jpg"]) await RealGraphClient.moveItem("CoinCollection/_Testing/Staging/AY-00001/" + n, "CoinCollection/_Testing/CoinPhotos/" + n, NO_OVERWRITE);
      conflictNext = true;
      try { await RealGraphClient.moveItem("CoinCollection/_Testing/Staging/AY-00001/d.jpg", "CoinCollection/_Testing/CoinPhotos/d.jpg", NO_OVERWRITE); out.conflict = "no error"; }
      catch (e) { out.conflict = e.conflict === true ? "conflict" : String(e.message); }
    } finally { window.fetch = prevFetch; window.getWriteToken = prevTok; delete RealGraphClient._folderIds; }
    out.gets = reqs.filter(r => r.method === "GET").map(r => r.url);
    const patch = reqs.find(r => r.method === "PATCH");
    out.patch = patch ? { url: patch.url, body: JSON.parse(patch.body) } : null;
    out.patches = reqs.filter(r => r.method === "PATCH").length;
    out.gated = GATED_GRAPH_METHODS.has("moveItem");
    return out;
  });
  ok("M7 B4: the real client PATCHes the source path with conflictBehavior=fail and { parentReference.id, name }; ONE folder lookup for several moves; a 409 is e.conflict",
    M7.patches === 4 && M7.gets.length === 1 && /\/CoinPhotos$/.test(M7.gets[0]) && M7.patch &&
    /\/me\/drive\/root:\/CoinCollection\/_Testing\/Staging\/AY-00001\/a\.jpg\?@microsoft\.graph\.conflictBehavior=fail$/.test(M7.patch.url) &&
    M7.patch.body.parentReference.id === "FOLDER-ID-1" && M7.patch.body.name === "a.jpg" && M7.conflict === "conflict", M7);
  ok("M8 B4: moveItem is a gated write method (refused while writes are not allowed)", M7.gated === true, M7);

  // ================= U: A14, V: N1, W: (bv) =================
  const U = await page.evaluate(async () => {
    const B = window.__b5, out = {};
    // U1: the upload lands, its answer is lost; Save again: 409, same bytes, no row: adopted.
    let F = B.photoFixture();
    F.S.rules.push({ match: l => l === "uploadFile AY-00099_reference_01.jpg", kind: "lost", times: 1 });
    B.pick(F.ID, "reference", "u1", 210);
    const a = await savePhotosAndLabels(F.ID, null);
    const b = await savePhotosAndLabels(F.ID, null);
    out.U1 = { first: a.photos.failed.length, second: b.photos.added, pending: pendingPhotoCount(F.ID),
      files: [...F.mock._store.keys()].filter(k => /reference/.test(k)).map(k => k.split("/").pop()),
      rows: F.rowsFor(F.ID).filter(r => r[2] === "Reference").map(r => r[4]), uploads: F.S.count(/^uploadFile AY-00099_reference/) };
    // U2: a 409 with DIFFERENT bytes: nothing overwritten; the next Save takes the next name.
    F = B.photoFixture();
    const e = B.pick(F.ID, "reference", "u2", 220);
    F.S.rules.push({ match: l => l === "uploadFile AY-00099_reference_01.jpg", kind: "fn", times: 1, fn: (t, a2, v) => {
      t._store.set(a2[0], { kind: "bytes", value: B.blob("stranger", 220) }); return v.apply(t, a2); } });
    const c = await savePhotosAndLabels(F.ID, null);
    const d = await savePhotosAndLabels(F.ID, null);
    out.U2 = { first: c.photos.failed.length, stranger: F.mock._store.get(F.P.coinPhotos + "/AY-00099_reference_01.jpg").value.__tag,
      rows: F.rowsFor(F.ID).filter(r => r[2] === "Reference").map(r => r[4]), pending: pendingPhotoCount(F.ID) };
    // U3: the same bytes, but a Photos row already names that file: not adopted.
    F = B.photoFixture({ rows: [["PH-00001", "AY-00099", "Obverse", "", "AY-00099_obverse_cropped.jpg", "", 46000, ""]] });
    const pick = B.pick(F.ID, "reference", "u3", 230);
    F.S.rules.push({ match: l => l === "uploadFile AY-00099_reference_01.jpg", kind: "fn", times: 1, fn: (t, a3, v) => {
      t._store.set(a3[0], { kind: "bytes", value: pick.blob });
      t._grids.Photos[2] = ["PH-00002", "AY-00098", "Reference", "", "AY-00099_reference_01.jpg", "", 46000, ""];
      return v.apply(t, a3); } });
    const g = await savePhotosAndLabels(F.ID, null);
    out.U3 = { failed: g.photos.failed.length, why: Object.values(g.photos.failedReasons || {}).join(" ") };
    // U4: the kept original gets the same rule (adopted after a lost answer).
    F = B.photoFixture({ rows: [] });
    const crop = B.blob("crop", 260), raw = B.blob("raw", 270);
    addGalleryEntryAndCommit(F.ID, { type: "obverse", blob: crop, url: URL.createObjectURL(crop), rawUrl: URL.createObjectURL(raw), caption: "" }, null);
    F.S.rules.push({ match: l => l === "uploadFile AY-00099_obverse_original.jpg", kind: "lost", times: 1 });
    const h1 = await savePhotosAndLabels(F.ID, null);
    const h2 = await savePhotosAndLabels(F.ID, null);
    out.U4 = { first: h1.photos.failed.length, second: h2.photos.added, originals: [...F.mock._store.keys()].filter(k => /obverse_original/.test(k)).map(k => k.split("/").pop()),
      row: (F.rowsFor(F.ID).find(r => r[2] === "Obverse") || []).slice(4, 8) };
    // W1: a retry of an ADD whose row its first attempt wrote says "added".
    F = B.photoFixture({ rows: [] });
    F.S.rules.push({ match: l => /^patchWorkbookRanges Photos!/.test(l), kind: "lost", times: 1 });
    B.pick(F.ID, "slab_reverse", "w1", 280);
    await savePhotosAndLabels(F.ID, null);
    const w1 = await savePhotosAndLabels(F.ID, null);
    out.W1 = { summary: photoSaveSummaryText(w1), rows: F.rowsFor(F.ID).length };
    // W2: a Replace says "replaced" (first try, and after a failed first try).
    F = B.photoFixture({ rows: [["PH-00001", "AY-00099", "Slab_Reverse", "", "AY-00099_slab_reverse.jpg", "", 46000, ""]], files: { "AY-00099_slab_reverse.jpg": "old" } });
    const old = galleryFor(F.ID).find(x => x.storedFilename === "AY-00099_slab_reverse.jpg");
    const rb = B.blob("w2", 290);
    const repl = { type: "slab_reverse", blob: rb, url: URL.createObjectURL(rb), caption: "" };
    replaceGalleryEntryAndCommit(F.ID, old, repl, null);
    const w2 = await savePhotosAndLabels(F.ID, null);
    out.W2 = { summary: photoSaveSummaryText(w2) };
    F = B.photoFixture({ rows: [["PH-00001", "AY-00099", "Slab_Reverse", "", "AY-00099_slab_reverse.jpg", "", 46000, ""]], files: { "AY-00099_slab_reverse.jpg": "old" } });
    const old2 = galleryFor(F.ID).find(x => x.storedFilename === "AY-00099_slab_reverse.jpg");
    const rb2 = B.blob("w2b", 300);
    replaceGalleryEntryAndCommit(F.ID, old2, { type: "slab_reverse", blob: rb2, url: URL.createObjectURL(rb2), caption: "" }, null);
    F.S.rules.push({ match: l => /^patchWorkbookRanges Photos!/.test(l), kind: "fail", times: 1 });
    await savePhotosAndLabels(F.ID, null);
    const w2b = await savePhotosAndLabels(F.ID, null);
    out.W2.retry = photoSaveSummaryText(w2b);
    return out;
  });
  ok("U1 A14: the upload lands, its answer is lost; Save again meets its own file (409, same bytes, no row) and adopts it: one file, one row, no _02",
    U.U1.first === 1 && U.U1.second === 1 && U.U1.pending === 0 && JSON.stringify(U.U1.files) === JSON.stringify(["AY-00099_reference_01.jpg"]) &&
    JSON.stringify(U.U1.rows) === JSON.stringify(["AY-00099_reference_01.jpg"]) && U.U1.uploads === 2, U.U1);
  ok("U2 A14: a 409 with DIFFERENT bytes is never overwritten; the next Save takes the next name",
    U.U2.first === 1 && U.U2.stranger === "stranger" && JSON.stringify(U.U2.rows) === JSON.stringify(["AY-00099_reference_02.jpg"]) && U.U2.pending === 0, U.U2);
  ok("U3 A14: the same bytes, but a Photos row already names that file: not adopted (it fails as a taken name)",
    U.U3.failed === 1 && /already there/.test(U.U3.why), U.U3);
  ok("U4 A14: the kept original gets the same rule: adopted after a lost answer, one original, its name on the Obverse row",
    U.U4.first === 1 && U.U4.second === 1 && JSON.stringify(U.U4.originals) === JSON.stringify(["AY-00099_obverse_original.jpg"]) &&
    U.U4.row[0] === "AY-00099_obverse_cropped.jpg" && U.U4.row[3] === "AY-00099_obverse_original.jpg", U.U4);
  ok("W1 (bv): a retry of an ADD whose row its first attempt wrote says \"added\", never \"replaced\"",
    U.W1.summary === "1 photo added" && U.W1.rows === 1, U.W1);
  ok("W2 (bv): a Replace says \"replaced\", on its first Save and on a retry after a failed first Save",
    U.W2.summary === "1 photo replaced" && U.W2.retry === "1 photo replaced", U.W2);

  const V = await page.evaluate(async () => {
    const B = window.__b5, out = {};
    // V1: the receipt upload lands at _02, its answer is lost; Save again adopts it by bytes.
    let F = B.photoFixture();
    F.mock._grids.Receipts[1] = ["RC-00001", "AY-00099", "AY-00099_receipt.pdf", 46000];
    F.mock._store.set(F.P.coinReceipts + "/AY-00099_receipt.pdf", { kind: "bytes", value: B.blob("old-receipt", 90) });
    __setStoredReceiptsForTest({ "AY-00099": [{ receiptId: "RC-00001", filename: "AY-00099_receipt.pdf" }] });
    const pdf = new Blob([new Uint8Array(120).fill(7)], { type: "application/pdf" });
    const prepared = { blob: pdf, filename: "AY-00099_receipt.pdf" };
    const p = { landedName: "", sentName: "" };
    const opts = () => ({ landedName: p.landedName || p.sentName || "", onSending: n => { p.sentName = n; }, onUploaded: n => { p.landedName = n; } });
    F.S.rules.push({ match: l => /^uploadFile AY-00099_receipt/.test(l), kind: "lost", times: 1 });
    let first = "ok";
    try { await commitReceiptCapture("AY-00099", prepared, opts()); } catch (e) { first = String(e.message); }
    const second = await commitReceiptCapture("AY-00099", prepared, opts());
    out.V1 = { first, sentName: p.sentName, filename: second.filename, files: [...F.mock._store.keys()].filter(k => /CoinReceipts\//.test(k)).map(k => k.split("/").pop()).sort(),
      rows: B.rows(F.mock, "Receipts").map(r => r[0] + ":" + r[2]), uploads: F.S.count(/^uploadFile AY-00099_receipt/) };
    // V2: the sent name now holds DIFFERENT bytes: not adopted; a free name; nothing overwritten.
    F = B.photoFixture();
    F.mock._grids.Receipts[1] = ["RC-00001", "AY-00099", "AY-00099_receipt.pdf", 46000];
    F.mock._store.set(F.P.coinReceipts + "/AY-00099_receipt.pdf", { kind: "bytes", value: B.blob("old-receipt", 90) });
    F.mock._store.set(F.P.coinReceipts + "/AY-00099_receipt_02.pdf", { kind: "bytes", value: B.blob("someone", 95) });
    const r2 = await commitReceiptCapture("AY-00099", prepared, { landedName: "AY-00099_receipt_02.pdf" });
    out.V2 = { filename: r2.filename, stranger: F.mock._store.get(F.P.coinReceipts + "/AY-00099_receipt_02.pdf").value.__tag };
    return out;
  });
  ok("V1 N1: a receipt upload whose answer was lost: Save again adopts the copy that landed (by bytes): one file, one row, no _03",
    /lost/.test(V.V1.first) && V.V1.sentName === "AY-00099_receipt_02.pdf" && V.V1.filename === "AY-00099_receipt_02.pdf" &&
    JSON.stringify(V.V1.files) === JSON.stringify(["AY-00099_receipt.pdf", "AY-00099_receipt_02.pdf"]) && V.V1.rows.length === 1 &&
    /AY-00099_receipt_02\.pdf$/.test(V.V1.rows[0]) && V.V1.uploads === 1, V.V1);
  ok("V2 N1: the sent name now holds DIFFERENT bytes: not adopted, a free name, nothing overwritten",
    V.V2.filename === "AY-00099_receipt_03.pdf" && V.V2.stranger === "someone", V.V2);

  // ================= T: the TEST-only switch =================
  await page.evaluate(DRAFT_FLOW, { mode: "promote", ALL_HEADERS });
  const T = await page.evaluate(async () => {
    const B = window.__b5, ID = "AY-00706", out = {};
    out.visible = document.getElementById("docketSkipLookLine").style.display !== "none" && WRITE_TARGET !== "live";
    out.liveGuards = /WRITE_TARGET !== "live"/.test(moveFileWithoutOverwrite.toString()) && /WRITE_TARGET === "live" \? "none"/.test(syncSkipLookSwitch.toString());
    const F = await B.draftFixture();
    F.mock._store.set(F.P.coinPhotos + "/AY-00706_obverse_cropped.jpg", { kind: "bytes", value: B.blob("taken", 12) });
    const box = document.getElementById("docketSkipLookSwitch");
    box.checked = true; box.dispatchEvent(new Event("change"));
    await promoteCoinDraft(ID);
    const firstMoveAt = F.S.calls.findIndex(c => /^moveItem /.test(c));
    out.firstMove = F.S.calls[firstMoveAt];
    out.lookedBefore = F.S.calls.slice(0, firstMoveAt).some(c => /^getItemMeta AY-00706_obverse_cropped\.jpg/.test(c));
    out.kept = F.mock._store.get(F.P.coinPhotos + "/AY-00706_obverse_cropped.jpg").value.__tag;
    out.switchOff = !box.checked;
    out.toast = B.toasts.join(" / ");
    return out;
  });
  ok("T1 the \"skip the look first\" switch shows on a TEST build and is guarded off on LIVE (WRITE_TARGET \"live\")", T.visible && T.liveGuards, T);
  ok("T2 the switch sends ONE move with no look first; Graph's (mock's) 409 is compared and refused, nothing overwritten; the switch turns itself off",
    T.firstMove === "moveItem AY-00706_obverse_cropped.jpg" && !T.lookedBefore && T.kept === "taken" && T.switchOff &&
    /a different file is already in CoinPhotos/.test(T.toast), T);
}, module);
