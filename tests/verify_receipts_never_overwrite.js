// Receipts never overwrite (backlog item t, Ray's Q1 on the "Replace never
// overwrites a photo file" fix, 27 Oct 2026).
//
// WHAT WAS BROKEN. commitReceiptCapture() treated ANY filename match on the
// Receipts tab as "this is the same document" and skipped the upload —
// correct for the intended multi-coin-receipt sharing (RC-00001 already
// covers three real coins), wrong the moment two UNRELATED documents happen
// to share a name (two sellers' own invoice.pdf): the second coin's row
// would point at the FIRST seller's file, and nothing would ever upload for
// the second. A re-photographed {ID}_receipt.pdf hit the identical bug from
// the other side — since that fixed name is always this coin's own, the
// "dedupe" always found this coin's own existing row and skipped the real
// upload entirely, so Replace did nothing at all.
//
// THE FIX. Same NO_OVERWRITE / free-name approach the "Replace never
// overwrites a photo file" work already gave photos: which of the two
// readings applies is now decided by BYTES (sameFileBytes(), the same check
// moveFileWithoutOverwrite() already uses for the identical ambiguity on a
// promotion move), never by the filename alone. A byte-fetch failure is
// treated as "different" (Ray's Q2) — a spurious extra file is cheap and
// visible; silently reusing the wrong ReceiptID is not. And one ReceiptID
// must never end up pointing at two different files: before a replace keeps
// this coin's own existing id, this checks whether any OTHER coin's row
// still carries it — if one does, this coin gets a freshly-minted id
// instead, and the other coin's row and file are left completely alone
// (Ray's addition).
//
//   SELF the shared check helper's must-fail self-check
//   A   receiptIdUsedByOtherCoin() in isolation
//   B   freeReceiptFilename()/receiptFilenameIsFree() in isolation
//   C   two sellers' own invoice.pdf: the second coin gets a free name,
//       uploads for real, and gets its OWN ReceiptID — the first coin's
//       row and file are untouched
//   D   the SAME document picked by two coins still reuses one ReceiptID
//       and performs no second upload — the dedupe this exists to protect
//   E   a re-photographed {ID}_receipt.pdf really replaces what the row
//       shows: new free-named file, SAME ReceiptID kept, old file untouched
//   F   the new invariant — a coin on a shared ReceiptID that replaces its
//       receipt mints its OWN fresh id; the other coin sharing that id
//       keeps its original file and id, completely untouched (both a
//       photographed-fixed-name replace and an unrelated new pick)
//   G   every receipt upload — commitReceiptCapture, the Staging-edit
//       receipt branch, and a brand-new Add Coin draft's own upload — asks
//       for no-overwrite
//   H   a 409 mid-race (the chosen free name is taken between the check and
//       the PUT) leaves the coin's row untouched; the next attempt resolves
//       to a different free name and lands
//   I   a byte-fetch failure while comparing is treated as "different" —
//       free-named rather than risking a false dedupe (Ray's Q2)
//   K   uploadStagingEditFiles()'s own receipt branch (Phase B): a replace
//       never overwrites the old Staging file in place either
//   NEG two verified negative controls: the literal pre-fix function
//       reproduces the two-sellers collision AND the do-nothing replace;
//       a version of the new function with the sharing guard removed
//       reproduces a shared id pointing at two different files

const { defineSuite } = require("./harness");

const RECEIPT_HEADERS = ["ReceiptID", "CollectionID", "Filename", "DateAdded"];
function receiptSheet(rows, blanks) {
  const out = [RECEIPT_HEADERS.slice()].concat(rows || []);
  for (let i = 0; i < (blanks == null ? 6 : blanks); i++) out.push(new Array(RECEIPT_HEADERS.length).fill(""));
  return out;
}
function seed(rows, blanks) {
  return { sheets: { Receipts: receiptSheet(rows, blanks) } };
}

module.exports = defineSuite("receipts-never-overwrite", async ({ openApp, check, selfCheck, PHONE }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);

  // ---------- A. receiptIdUsedByOtherCoin() in isolation ----------------
  const A = await page.evaluate(() => {
    const rows = [
      { CollectionID: "AY-00001", ReceiptID: "RC-00001" },
      { CollectionID: "AY-00002", ReceiptID: "RC-00001" },
      { CollectionID: "AY-00003", ReceiptID: "RC-00002" }
    ];
    return {
      sharedExceptOwner: receiptIdUsedByOtherCoin(rows, "RC-00001", "AY-00001"),
      sharedExceptOther: receiptIdUsedByOtherCoin(rows, "RC-00001", "AY-00002"),
      notShared: receiptIdUsedByOtherCoin(rows, "RC-00002", "AY-00003"),
      unrelatedId: receiptIdUsedByOtherCoin(rows, "RC-99999", "AY-00001")
    };
  });
  ok("A1 a shared id is reported used-by-other when excepting one of its two owners", A.sharedExceptOwner === true, A);
  ok("A2 and the same when excepting the OTHER owner", A.sharedExceptOther === true, A);
  ok("A3 an id only this coin has is not shared", A.notShared === false, A);
  ok("A4 an id nobody has is not shared", A.unrelatedId === false, A);

  // ---------- B. freeReceiptFilename()/receiptFilenameIsFree() ----------
  const B = await page.evaluate(async (s) => {
    const mock = createMockGraphClient(s);
    __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest();
    const rows = [{ Filename: "invoice.pdf" }, { Filename: "invoice_02.pdf" }];
    // invoice_02 is taken by a ROW; invoice_03 is taken by a bare FILE with
    // no row at all — both must count as taken.
    await mock.uploadFile(writePaths().coinReceipts + "/invoice_03.pdf", new Blob(["orphan"]));
    const free1 = await receiptFilenameIsFree("invoice.pdf", rows);
    const free2 = await receiptFilenameIsFree("invoice_02.pdf", rows);
    const free3 = await receiptFilenameIsFree("invoice_03.pdf", rows);
    const free4 = await receiptFilenameIsFree("invoice_04.pdf", rows);
    const chosen = await freeReceiptFilename("invoice.pdf", rows);
    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest();
    return { free1, free2, free3, free4, chosen };
  }, seed());
  ok("B1 the base name is reported taken (it's already known taken by the caller)", B.free1 === false, B);
  ok("B2 a name claimed by a ROW is not free", B.free2 === false, B);
  ok("B3 a bare FILE with no row is ALSO not free — the orphan-leftover case", B.free3 === false, B);
  ok("B4 a genuinely untouched name is free", B.free4 === true, B);
  ok("B5 freeReceiptFilename skips both and lands on _04, never re-offering the base name", B.chosen === "invoice_04.pdf", B);

  // ---------- C. Two sellers' own invoice.pdf ----------------------------
  const C = await page.evaluate(async (s) => {
    const mock = createMockGraphClient(s);
    __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest(); __resetMintedIdsForTest();
    __setAddCoinWriteEnabledForTest(true);
    const a = await commitReceiptCapture("AY-00700",
      { blob: new Blob(["SELLER-A"]), filename: "invoice.pdf", sourceWasPdf: true });
    // A different coin, a DIFFERENT document, the SAME filename.
    const d = await commitReceiptCapture("AY-00703",
      { blob: new Blob(["SELLER-D"]), filename: "invoice.pdf", sourceWasPdf: true });
    const aBytesNow = await mock.getFileBytes(writePaths().coinReceipts + "/invoice.pdf");
    const g = mock._grids.Receipts;
    const out = {
      a, d,
      aFileUnchanged: (await (aBytesNow && aBytesNow.text ? aBytesNow.text() : null)) === "SELLER-A",
      aRow: g.find(r => r[1] === "AY-00700"), dRow: g.find(r => r[1] === "AY-00703")
    };
    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest(); __setAddCoinWriteEnabledForTest(null);
    return out;
  }, seed());
  ok("C1 the second coin's own name collides, but the bytes DIFFER, so it is never marked reused",
    C.d.reused === false, C);
  ok("C2 it gets a FREE name instead of the colliding one", C.d.filename === "invoice_02.pdf", C);
  ok("C3 and its own, genuinely different ReceiptID", !!C.d.receiptId && C.d.receiptId !== C.a.receiptId, C);
  ok("C4 the first coin's stored file is untouched — still seller A's own bytes", C.aFileUnchanged === true, C);
  ok("C5 the first coin's row still names its own file", !!C.aRow && C.aRow[2] === "invoice.pdf", C);
  ok("C6 the second coin's row names its OWN new free-named file",
    !!C.dRow && C.dRow[2] === "invoice_02.pdf" && C.dRow[0] === C.d.receiptId, C);

  // ---------- D. The genuine dedupe this all protects -------------------
  const D = await page.evaluate(async (s) => {
    const mock = createMockGraphClient(s);
    let uploads = 0;
    const realUpload = mock.uploadFile.bind(mock);
    mock.uploadFile = (p, f, o) => { uploads++; return realUpload(p, f, o); };
    __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest(); __resetMintedIdsForTest();
    __setAddCoinWriteEnabledForTest(true);
    const prepared = { blob: new Blob(["SAME-DOC"]), filename: "statement.pdf", sourceWasPdf: true };
    const a = await commitReceiptCapture("AY-00710", prepared);
    const uploadsAfterA = uploads;
    // A second coin picking the literal same bytes under the same name.
    const b = await commitReceiptCapture("AY-00711", prepared);
    const out = { a, b, uploadsAfterA, uploadsAfterB: uploads };
    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest(); __setAddCoinWriteEnabledForTest(null);
    return out;
  }, seed());
  ok("D1 one upload for the first coin", D.uploadsAfterA === 1, D);
  ok("D2 the identical document for a second coin performs NO second upload",
    D.uploadsAfterB === 1, D);
  ok("D3 and reuses the first coin's ReceiptID", D.b.reused === true && D.b.receiptId === D.a.receiptId, D);

  // ---------- E. A re-photographed receipt really replaces -------------
  const E = await page.evaluate(async (s) => {
    const mock = createMockGraphClient(s);
    __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest(); __resetMintedIdsForTest();
    __setAddCoinWriteEnabledForTest(true);
    const first = await commitReceiptCapture("AY-00720",
      { blob: new Blob(["FIRST-PHOTO"]), filename: "image.jpg", sourceWasPdf: false });
    // Re-photographed: new bytes, the same per-coin fixed name convention.
    const second = await commitReceiptCapture("AY-00720",
      { blob: new Blob(["SECOND-PHOTO"]), filename: "image2.jpg", sourceWasPdf: false });
    const oldBytes = await mock.getFileBytes(writePaths().coinReceipts + "/AY-00720_receipt.pdf");
    const newBytes = await mock.getFileBytes(writePaths().coinReceipts + "/" + second.filename);
    const g = mock._grids.Receipts;
    const out = {
      first, second,
      oldFileIntact: (await (oldBytes && oldBytes.text ? oldBytes.text() : null)) === "FIRST-PHOTO",
      newFileLanded: (await (newBytes && newBytes.text ? newBytes.text() : null)) === "SECOND-PHOTO",
      rowsForCoin: g.filter(r => r[1] === "AY-00720").length,
      row: g.find(r => r[1] === "AY-00720")
    };
    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest(); __setAddCoinWriteEnabledForTest(null);
    return out;
  }, seed());
  ok("E1 the first capture lands at the plain fixed name", E.first.filename === "AY-00720_receipt.pdf", E);
  ok("E2 the replace does NOT reuse that name — a free one instead", E.second.filename === "AY-00720_receipt_02.pdf", E);
  ok("E3 the OLD file's bytes are completely untouched", E.oldFileIntact === true, E);
  ok("E4 the NEW file actually landed (the reported bug: a replace used to upload nothing at all)",
    E.newFileLanded === true, E);
  ok("E5 still exactly ONE row for this coin", E.rowsForCoin === 1, E);
  ok("E6 the row keeps the SAME ReceiptID across the replace — it really REPLACES what the row shows",
    E.second.receiptId === E.first.receiptId, E);
  ok("E7 and now points at the new file", E.row[2] === "AY-00720_receipt_02.pdf" && E.row[0] === E.first.receiptId, E);

  // ---------- F. The shared-ReceiptID invariant --------------------------
  const F = await page.evaluate(async (s) => {
    const mock = createMockGraphClient(s);
    __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest(); __resetMintedIdsForTest();
    __setAddCoinWriteEnabledForTest(true);

    // F1: two coins genuinely share one receipt (the real multi-coin case).
    const shared = { blob: new Blob(["SHARED-DOC"]), filename: "shared.pdf", sourceWasPdf: true };
    const owner = await commitReceiptCapture("AY-00730", shared);
    const sharer = await commitReceiptCapture("AY-00731", shared);
    // Now the SHARER photographs a brand-new, unrelated receipt — a
    // non-colliding name, so nothing about the upload itself is in doubt;
    // only whether its OWN (shared) id gets carried onto the new file.
    const replaced = await commitReceiptCapture("AY-00731",
      { blob: new Blob(["UNRELATED-NEW"]), filename: "unrelated.pdf", sourceWasPdf: true });
    const sharedBytesNow = await mock.getFileBytes(writePaths().coinReceipts + "/shared.pdf");
    const g1 = mock._grids.Receipts;

    // F2: the same invariant on the OTHER phrasing — a re-photographed
    // FIXED name whose existing row happens to share its id with another
    // coin (seeded directly, the one state this mechanism must never let a
    // replace perpetuate).
    mock._grids.Receipts = [
      ["ReceiptID", "CollectionID", "Filename", "DateAdded"],
      ["RC-00050", "AY-00740", "AY-00740_receipt.pdf", 46000],
      ["RC-00050", "AY-00741", "AY-00741_receipt.pdf", 46000],
      ["", "", "", ""], ["", "", "", ""], ["", "", "", ""]
    ];
    await mock.uploadFile(writePaths().coinReceipts + "/AY-00740_receipt.pdf", new Blob(["OLD-740"]));
    await mock.uploadFile(writePaths().coinReceipts + "/AY-00741_receipt.pdf", new Blob(["OLD-741"]));
    __resetSheetHeaderMapsForTest();
    const rePhotographed = await commitReceiptCapture("AY-00740",
      { blob: new Blob(["NEW-740"]), filename: "x.jpg", sourceWasPdf: false });
    const g2 = mock._grids.Receipts;

    const out = {
      owner, sharer, replaced,
      sharedFileUnchanged: (await (sharedBytesNow && sharedBytesNow.text ? sharedBytesNow.text() : null)) === "SHARED-DOC",
      ownerRowAfter: g1.find(r => r[1] === "AY-00730"),
      rePhotographed,
      row740: g2.find(r => r[1] === "AY-00740"),
      row741: g2.find(r => r[1] === "AY-00741")
    };
    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest(); __setAddCoinWriteEnabledForTest(null);
    return out;
  }, seed());
  ok("F1 the two coins genuinely share one ReceiptID to start", F.sharer.receiptId === F.owner.receiptId, F);
  ok("F2 replacing the SHARER's receipt mints a FRESH id for it, never the shared one",
    F.replaced.receiptId !== F.owner.receiptId && !!F.replaced.receiptId, F);
  ok("F3 the OWNER's row is left completely untouched", F.ownerRowAfter[0] === F.owner.receiptId &&
    F.ownerRowAfter[2] === "shared.pdf", F);
  ok("F4 and the OWNER's own stored file is untouched", F.sharedFileUnchanged === true, F);
  ok("F5 a re-photograph of a fixed-name receipt that happens to share its id ALSO mints fresh",
    F.rePhotographed.receiptId !== "RC-00050" && !!F.rePhotographed.receiptId, F);
  ok("F6 that coin's own row is updated to the new file and the new id",
    !!F.row740 && F.row740[2] === "AY-00740_receipt_02.pdf" && F.row740[0] === F.rePhotographed.receiptId, F);
  ok("F7 the OTHER coin sharing the old id is completely untouched — same id, same file",
    !!F.row741 && F.row741[0] === "RC-00050" && F.row741[2] === "AY-00741_receipt.pdf", F);

  // ---------- F3. New Receipts rows CLAIM a blank row, never append ----
  // Standing rule (Ray, 27 Oct 2026): every write that creates a new row,
  // on any table, claims the first blank row below the last row that has
  // an id — the same read-before-create pattern createAllSheetRow() uses
  // — never a plain append past a table's own trailing blank rows.
  // writeReceiptRow()'s new-row path already goes through writeRecordRow()
  // (shared with Photos), which already does this; this is the explicit,
  // Receipts-specific proof, covering BOTH callers that can create a brand
  // new Receipts row: commitReceiptCapture() directly, and the Staging/
  // promotion path (recordPromotedCoinRecords(), a coin draft's receipt
  // recorded for the first time once its file has landed).
  const F3 = await page.evaluate(async (s) => {
    const mock = createMockGraphClient(s);
    __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest(); __resetMintedIdsForTest();
    __setAddCoinWriteEnabledForTest(true);

    const direct = await commitReceiptCapture("AY-01000",
      { blob: new Blob(["DIRECT"]), filename: "direct.pdf", sourceWasPdf: true });
    const gridAfterDirect = mock._grids.Receipts;
    const rowCountAfterDirect = gridAfterDirect.length;

    const draft = { collectionID: "AY-01001", photos: [], receiptPhoto: "AY-01001_receipt.pdf" };
    await mock.uploadBytes(writePaths().coinReceipts + "/AY-01001_receipt.pdf", new Uint8Array([9]));
    const promoted = await recordPromotedCoinRecords(draft);
    const gridAfterPromote = mock._grids.Receipts;

    const out = {
      direct, directRow: gridAfterDirect[direct.row - 1], rowCountAfterDirect,
      promotedReceipt: promoted.receipt, promotedRow: gridAfterPromote[promoted.receipt.row - 1],
      rowCountAfterPromote: gridAfterPromote.length
    };
    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest(); __setAddCoinWriteEnabledForTest(null);
    return out;
  }, seed([
    ["RC-00001", "AY-00001", "existing-1.pdf", 46000],
    ["RC-00002", "AY-00002", "existing-2.pdf", 46000]
  ], 8)); // 2 real rows (sheet rows 2-3), then 8 trailing blanks
  ok("F3-1 commitReceiptCapture() claims the FIRST blank row (sheet row 4), not past the trailing blanks",
    F3.direct.row === 4, F3);
  ok("F3-2 the table did not grow for it", F3.rowCountAfterDirect === 11, F3);
  ok("F3-3 and the claimed row really holds this coin's data",
    F3.directRow[1] === "AY-01000" && F3.directRow[2] === "direct.pdf", F3);
  ok("F3-4 the Staging/promotion path's own new-row write ALSO claims a blank row (the next one, row 5), not the end",
    F3.promotedReceipt.row === 5, F3);
  ok("F3-5 the table still did not grow", F3.rowCountAfterPromote === 11, F3);
  ok("F3-6 and it holds the promoted coin's own receipt",
    F3.promotedRow[1] === "AY-01001" && F3.promotedRow[2] === "AY-01001_receipt.pdf", F3);

  // ---------- G. Every receipt upload asks for no-overwrite -------------
  const G = await page.evaluate(async (s) => {
    const mock = createMockGraphClient(s);
    const calls = [];
    const realUpload = mock.uploadFile.bind(mock);
    mock.uploadFile = (p, f, o) => { calls.push({ path: String(p), noOverwrite: !!(o && o.noOverwrite) }); return realUpload(p, f, o); };
    __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest(); __resetMintedIdsForTest();
    __setAddCoinWriteEnabledForTest(true);
    await commitReceiptCapture("AY-00750", { blob: new Blob(["x"]), filename: "a.pdf", sourceWasPdf: true });

    // A fresh Add Coin draft's own first-save upload.
    receiptFiles["receiptPreview"] = { blob: new Blob(["y"]) };
    await uploadCoinDraftReceipt("AY-00751");
    delete receiptFiles["receiptPreview"];

    // The Staging-edit receipt branch.
    const folder = writePaths().stagingBase + "/AY-00752";
    await mock.uploadJson(folder + "/coin.json", { type: "coin", version: 1, collectionID: "AY-00752", status: "Draft", photos: [], receiptPhoto: "" });
    receiptFiles["receiptPreview"] = { blob: new Blob(["z"]) };
    await uploadStagingEditFiles("AY-00752");
    delete receiptFiles["receiptPreview"];

    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest(); __setAddCoinWriteEnabledForTest(null);
    return { calls };
  }, seed());
  ok("G1 at least the three expected uploads were observed", G.calls.length >= 3, G);
  ok("G2 every single one of them asked for no-overwrite — never just some",
    G.calls.every(c => c.noOverwrite === true), G);

  // ---------- H. A 409 mid-race ------------------------------------------
  const H = await page.evaluate(async (s) => {
    const mock = createMockGraphClient(s);
    __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest(); __resetMintedIdsForTest();
    __setAddCoinWriteEnabledForTest(true);
    await mock.uploadFile(writePaths().coinReceipts + "/raced.pdf", new Blob(["EXISTING"]));
    await writeReceiptRow("AY-00800", "raced.pdf", null);
    const racedPath = writePaths().coinReceipts + "/raced_02.pdf";
    const realUpload = mock.uploadFile.bind(mock);
    let rejectNext = true;
    mock.uploadFile = (p, f, o) => {
      if (String(p) === racedPath && rejectNext) {
        rejectNext = false;
        // The race itself: a rival write genuinely lands bytes there in the
        // instant between our own free-name check and our own PUT — this is
        // what makes it unavailable on the very next attempt too, not just
        // a bare rejection with nothing actually there.
        mock._store.set(p, { kind: "bytes", value: new Blob(["RIVAL"]) });
        return Promise.reject(uploadError(p, 409, "nameAlreadyExists"));
      }
      return realUpload(p, f, o);
    };
    let threw = false;
    try {
      await commitReceiptCapture("AY-00801", { blob: new Blob(["NEWDOC"]), filename: "raced.pdf", sourceWasPdf: true });
    } catch (e) { threw = true; }
    const rowsAfterFail = (await readRecordRows(RECEIPTS_SHEET_NAME, RECEIPTS_TABLE_NAME, "ReceiptID"))
      .filter(r => r.CollectionID === "AY-00801").length;
    const retry = await commitReceiptCapture("AY-00801", { blob: new Blob(["NEWDOC"]), filename: "raced.pdf", sourceWasPdf: true });
    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest(); __setAddCoinWriteEnabledForTest(null);
    return { threw, rowsAfterFail, retry };
  }, seed());
  ok("H1 the race (chosen name taken between the check and the PUT) throws rather than silently succeeding", H.threw === true, H);
  ok("H2 nothing was recorded for the coin after that failure", H.rowsAfterFail === 0, H);
  ok("H3 a retry picks a DIFFERENT free name rather than looping on the same taken one",
    H.retry.filename === "raced_03.pdf", H);
  ok("H4 and the retry actually lands", !!H.retry.receiptId, H);

  // ---------- I. A byte-fetch failure is treated as "different" (Q2) ----
  const I = await page.evaluate(async (s) => {
    const mock = createMockGraphClient(s);
    __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest(); __resetMintedIdsForTest();
    __setAddCoinWriteEnabledForTest(true);
    const original = await commitReceiptCapture("AY-00810",
      { blob: new Blob(["ORIGINAL"]), filename: "flaky.pdf", sourceWasPdf: true });
    const target = writePaths().coinReceipts + "/flaky.pdf";
    const realGet = mock.getFileBytes.bind(mock);
    mock.getFileBytes = (p) => (String(p) === target) ? Promise.reject(new Error("network blip")) : realGet(p);
    const second = await commitReceiptCapture("AY-00811",
      { blob: new Blob(["ORIGINAL"]), filename: "flaky.pdf", sourceWasPdf: true }); // SAME bytes — would dedupe if readable
    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest(); __setAddCoinWriteEnabledForTest(null);
    return { original, second };
  }, seed());
  ok("I1 a byte-fetch failure is never treated as a match", I.second.reused === false, I);
  ok("I2 it is free-named instead", I.second.filename === "flaky_02.pdf", I);
  ok("I3 and gets its OWN id rather than risking the wrong one", I.second.receiptId !== I.original.receiptId, I);

  // ---------- K. uploadStagingEditFiles()'s own receipt branch -----------
  const K = await page.evaluate(async (s) => {
    const mock = createMockGraphClient(s);
    __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest();
    const id = "AY-00900";
    const folder = writePaths().stagingBase + "/" + id;
    await mock.uploadJson(folder + "/coin.json",
      { type: "coin", version: 1, collectionID: id, status: "Draft", photos: [], receiptPhoto: id + "_receipt.pdf" });
    await mock.uploadFile(folder + "/" + id + "_receipt.pdf", new Blob(["STAGING-OLD"]));
    const calls = [];
    const realUpload = mock.uploadFile.bind(mock);
    mock.uploadFile = (p, f, o) => { calls.push({ path: String(p), noOverwrite: !!(o && o.noOverwrite) }); return realUpload(p, f, o); };
    receiptFiles["receiptPreview"] = { blob: new Blob(["STAGING-NEW"]) };
    const failed = await uploadStagingEditFiles(id);
    const stagingName = receiptFiles["receiptPreview"].stagingName;
    const oldBytes = await mock.getFileBytes(folder + "/" + id + "_receipt.pdf");
    const newBytes = stagingName ? await mock.getFileBytes(folder + "/" + stagingName) : null;
    delete receiptFiles["receiptPreview"];
    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest();
    return {
      failed, stagingName,
      oldFileIntact: (await (oldBytes && oldBytes.text ? oldBytes.text() : null)) === "STAGING-OLD",
      newFileLanded: (await (newBytes && newBytes.text ? newBytes.text() : null)) === "STAGING-NEW",
      upload: calls.find(c => stagingName && c.path.endsWith(stagingName))
    };
  }, seed());
  ok("K1 nothing failed", K.failed.length === 0, K);
  ok("K2 the replacement lands under a FREE name within the draft's own folder", K.stagingName === "AY-00900_receipt_02.pdf", K);
  ok("K3 the OLD Staging file is completely untouched", K.oldFileIntact === true, K);
  ok("K4 the NEW file actually landed", K.newFileLanded === true, K);
  ok("K5 that upload asked for no-overwrite too", !!K.upload && K.upload.noOverwrite === true, K);

  // ---------- NEG. Verified negative controls -----------------------------
  const NEG = await page.evaluate(async (s) => {
    // The exact pre-fix body: a filename match alone was treated as "the
    // same document," unconditionally.
    async function legacyCommitReceiptCapture(collectionId, prepared) {
      const filename = storedReceiptFilename(collectionId, prepared);
      let receiptId = await findExistingReceiptByFilename(filename);
      const reused = !!receiptId;
      if (!reused) {
        await graph().uploadFile(writePaths().coinReceipts + "/" + filename, prepared.blob);
        receiptId = null;
      }
      const res = await writeReceiptRow(collectionId, filename, receiptId);
      return { ...res, filename, reused };
    }
    const mock1 = createMockGraphClient(s);
    __setGraphClientForTest(mock1); __resetSheetHeaderMapsForTest(); __resetMintedIdsForTest();
    __setAddCoinWriteEnabledForTest(true);
    const a = await legacyCommitReceiptCapture("AY-00920",
      { blob: new Blob(["SELLER-A"]), filename: "invoice.pdf", sourceWasPdf: true });
    const d = await legacyCommitReceiptCapture("AY-00923",
      { blob: new Blob(["SELLER-D"]), filename: "invoice.pdf", sourceWasPdf: true });
    const twoSellersCollided = d.reused === true && d.receiptId === a.receiptId; // the bug

    const first = await legacyCommitReceiptCapture("AY-00924",
      { blob: new Blob(["FIRST-PHOTO"]), filename: "image.jpg", sourceWasPdf: false });
    const second = await legacyCommitReceiptCapture("AY-00924",
      { blob: new Blob(["SECOND-PHOTO"]), filename: "image2.jpg", sourceWasPdf: false });
    const newBytes = await mock1.getFileBytes(writePaths().coinReceipts + "/AY-00924_receipt.pdf");
    const replaceDidNothing = second.reused === true &&
      (await (newBytes && newBytes.text ? newBytes.text() : null)) === "FIRST-PHOTO"; // the other bug
    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest(); __setAddCoinWriteEnabledForTest(null);

    // A version of the real fix with the sharing guard removed: always
    // keeps thisRow's own id on a non-reused write, unconditionally.
    async function commitReceiptCaptureNoSharingGuard(collectionId, prepared) {
      const rows = await readRecordRows(RECEIPTS_SHEET_NAME, RECEIPTS_TABLE_NAME, "ReceiptID");
      const thisRow = rows.find(r => r.CollectionID === collectionId);
      const candidate = storedReceiptFilename(collectionId, prepared);
      const sameNameRow = rows.find(r => r.Filename && r.Filename.toLowerCase() === candidate.toLowerCase());
      let storedBytes = null;
      try { storedBytes = await graph().getFileBytes(writePaths().coinReceipts + "/" + candidate); } catch (e) { storedBytes = null; }
      let sameDoc = false;
      if (storedBytes != null) { try { sameDoc = await sameFileBytes(storedBytes, prepared.blob); } catch (e) { sameDoc = false; } }
      let filename = candidate;
      const reused = !!(sameNameRow && sameDoc);
      if (!reused && (sameNameRow || storedBytes != null)) filename = await freeReceiptFilename(candidate, rows);
      let receiptId;
      if (reused) { receiptId = sameNameRow.ReceiptID; }
      else {
        await graph().uploadFile(writePaths().coinReceipts + "/" + filename, prepared.blob, NO_OVERWRITE);
        receiptId = (thisRow && thisRow.ReceiptID) ? thisRow.ReceiptID : null; // the guard removed
      }
      const res = await writeReceiptRow(collectionId, filename, receiptId);
      return { ...res, filename, reused };
    }
    const mock2 = createMockGraphClient(s);
    __setGraphClientForTest(mock2); __resetSheetHeaderMapsForTest(); __resetMintedIdsForTest();
    __setAddCoinWriteEnabledForTest(true);
    const sharedDoc = { blob: new Blob(["SHARED-DOC"]), filename: "shared.pdf", sourceWasPdf: true };
    const owner = await commitReceiptCaptureNoSharingGuard("AY-00930", sharedDoc);
    const sharer = await commitReceiptCaptureNoSharingGuard("AY-00931", sharedDoc);
    const replaced = await commitReceiptCaptureNoSharingGuard("AY-00931",
      { blob: new Blob(["UNRELATED-NEW"]), filename: "unrelated.pdf", sourceWasPdf: true });
    const violatesInvariant = replaced.receiptId === owner.receiptId; // one id, two different files now
    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest(); __setAddCoinWriteEnabledForTest(null);

    return { twoSellersCollided, replaceDidNothing, violatesInvariant };
  }, seed());
  ok("NEG1 the literal pre-fix function reproduces the two-sellers collision", NEG.twoSellersCollided === true, NEG);
  ok("NEG2 and reproduces the do-nothing replace bug", NEG.replaceDidNothing === true, NEG);
  ok("NEG3 removing only the sharing guard reproduces one id pointing at two different files",
    NEG.violatesInvariant === true, NEG);
}, module);
