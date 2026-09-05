// Photos/Receipts write layer + the stored-photo/receipt read side.
//
// WHAT WAS BROKEN. The gallery/crop UI produced real Blobs and real
// filenames and then dropped them into an in-memory store, so every capture
// outside Add Coin's own Staging flow vanished on reload. And NOTHING in
// the app had ever written a row to the Photos or Receipts tab, so even the
// files Add Coin did upload landed with nothing in the workbook pointing at
// them.
//
// The two facts that shape most of what's asserted here:
//   * Both tables overrun their data (Photos A1:G1030 holding 29 rows,
//     Receipts A1:D1073 holding 85), so APPENDING would drop new rows ~1000
//     past everything else. Rows are CLAIMED from the existing blanks, and
//     block C proves it by asserting the exact row number.
//   * One physical receipt legitimately covers several coins (RC-00001
//     already spans three), so a fresh RC per coin would produce duplicate
//     ids and byte-identical uploads on the COMMON path. Block G proves the
//     de-duplication, including that the second attach performs no upload.

const { defineSuite } = require("./harness");

const PHOTO_HEADERS = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded"];
const PHOTO_HEADERS_WITH_ORIG = PHOTO_HEADERS.concat(["OriginalFilename"]);
const RECEIPT_HEADERS = ["ReceiptID", "CollectionID", "Filename", "DateAdded"];

// A table shaped like the real one: a few real rows, then blank rows the
// claim logic is supposed to find.
function photoSheet(headers, blanks) {
  const rows = [headers.slice()];
  rows.push(["PH-00001", "AY-00002", "Obverse", "", "AY-00002_obverse.jpg", "", ""]);
  rows.push(["PH-00002", "AY-00002", "Reverse", "", "AY-00002_reverse.jpg", "", ""]);
  for (let i = 0; i < (blanks == null ? 6 : blanks); i++) rows.push(new Array(headers.length).fill(""));
  return rows;
}
function receiptSheet(blanks) {
  const rows = [RECEIPT_HEADERS.slice()];
  rows.push(["RC-00001", "AY-00209", "FindersKeepers_2026-06-27_receipt.pdf", ""]);
  rows.push(["RC-00001", "AY-00212", "FindersKeepers_2026-06-27_receipt.pdf", ""]);
  for (let i = 0; i < (blanks == null ? 6 : blanks); i++) rows.push(new Array(RECEIPT_HEADERS.length).fill(""));
  return rows;
}

function seed(opts) {
  opts = opts || {};
  return {
    sheets: {
      Photos: photoSheet(opts.photoHeaders || PHOTO_HEADERS, opts.blanks),
      Receipts: receiptSheet(opts.blanks)
    }
  };
}

module.exports = defineSuite("photo-receipt-write", async ({ ok, openApp, PHONE, TABLET }) => {
  const page = await openApp(PHONE);

  // ---------- A. Filename convention ----------------------------------
  // .jpg because both crop stages bake canvas.toBlob(..., "image/jpeg");
  // full type word + zero-padded index because that is what the 29 real
  // Photos rows already use (AY-00207_reference_01.jpg).
  const A = await page.evaluate(() => ({
    flip: galleryFilenameFor("AY-00001", "obverse", 0, null),
    ref0: galleryFilenameFor("AY-00001", "reference", 0, null).cropped,
    ref9: galleryFilenameFor("AY-00001", "reference", 9, null).cropped,
    other: galleryFilenameFor("AY-00001", "other", 0, null).cropped,
    coa: galleryFilenameFor("AY-00001", "coa", 1, null).cropped,
    slab: galleryFilenameFor("AY-00001", "slab_obverse", null, null).cropped,
    sgDefault: galleryFilenameFor("AY-00022", "subgroup_obverse", null, "__default__").cropped,
    sgNamed: galleryFilenameFor("AY-00022", "subgroup_obverse", null, "sg2").cropped
  }));
  ok(A.flip.cropped === "AY-00001_obverse_cropped.jpg", "A1 flip source cropped name is .jpg");
  ok(A.flip.raw === "AY-00001_obverse_original.jpg", "A2 retained raw is .jpg");
  ok(A.ref0 === "AY-00001_reference_01.jpg", "A3 repeatable type uses the full word + zero-padded index");
  ok(A.ref9 === "AY-00001_reference_10.jpg", "A4 index padding widens correctly past 9");
  ok(A.other === "AY-00001_other_01.jpg", "A5 'other' also uses its full type word");
  ok(A.coa === "AY-00001_coa_02.jpg", "A6 COA indexes from 1, zero-padded");
  ok(A.slab === "AY-00001_slab_obverse.jpg", "A7 single-instance type takes no index");
  ok(A.sgDefault === "AY-00022_obverse.jpg", "A8 implicit default sub-group adds no namespace");
  ok(A.sgNamed === "AY-00022_sg2_obverse.jpg", "A9 a NAMED sub-group is namespaced");
  ok(!JSON.stringify(A).includes(".png"), "A10 nothing still names a .png");

  // ---------- B. PhotoType vocabulary ---------------------------------
  const B = await page.evaluate(() => ({
    map: GALLERY_TYPES.map(t => [t.key, photoTypeForGalleryType(t.key)]),
    back: ["Obverse", "Slab_Reverse", "OGP_Obverse", "COA", "SubGroup_Reverse", "Other"]
      .map(v => galleryTypeForPhotoType(v)),
    caseInsensitive: galleryTypeForPhotoType("  slab_obverse  "),
    unknown: galleryTypeForPhotoType("Nonsense")
  }));
  ok(B.map.length === 11 && B.map.every(([, v]) => !!v), "B1 every gallery type has a PhotoType");
  const expected = {
    obverse: "Obverse", reverse: "Reverse", slab_obverse: "Slab_Obverse",
    slab_reverse: "Slab_Reverse", reference: "Reference", ogp_obverse: "OGP_Obverse",
    ogp_reverse: "OGP_Reverse", coa: "COA", subgroup_obverse: "SubGroup_Obverse",
    subgroup_reverse: "SubGroup_Reverse", other: "Other"
  };
  ok(B.map.every(([k, v]) => expected[k] === v), "B2 the five existing sheet values are matched exactly and the six new ones follow the same shape");
  ok(JSON.stringify(B.back) === JSON.stringify(["obverse", "slab_reverse", "ogp_obverse", "coa", "subgroup_reverse", "other"]),
    "B3 the reverse mapping round-trips");
  ok(B.caseInsensitive === "slab_obverse", "B4 reverse mapping tolerates case/whitespace from the sheet");
  ok(B.unknown === "", "B5 an unrecognised PhotoType maps to nothing rather than guessing");

  // ---------- C. Writing a Photos row CLAIMS a blank ------------------
  const C = await page.evaluate(async (s) => {
    const mock = createMockGraphClient(s);
    __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest();
    const res = await writePhotoRow("AY-00500", { type: "slab_obverse", caption: "PCGS holder" },
      "AY-00500_slab_obverse.jpg", "");
    const g = mock._grids.Photos;
    const out = { res, row: g[res.row - 1], rowCount: g.length };
    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest();
    return out;
  }, seed());
  ok(C.res.row === 4, "C1 claimed the FIRST blank row (4), rather than appending past every blank");
  ok(C.rowCount === 9, "C2 the table did not grow — nothing was appended");
  ok(C.res.photoId === "PH-00003", "C3 PhotoID minted as max+1");
  ok(C.row[1] === "AY-00500" && C.row[2] === "Slab_Obverse", "C4 CollectionID and PhotoType written");
  ok(C.row[4] === "AY-00500_slab_obverse.jpg", "C5 Filename written");
  ok(C.row[5] === "PCGS holder", "C6 the entry's caption becomes Label");
  ok(typeof C.row[6] === "number" && C.row[6] > 40000, "C7 DateAdded is an Excel serial, not ISO text");

  // ---------- D. Replace vs. add --------------------------------------
  const D = await page.evaluate(async (s) => {
    const mock = createMockGraphClient(s);
    __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest();
    const first = await writePhotoRow("AY-00500", { type: "obverse", caption: "" }, "AY-00500_obverse_cropped.jpg", "");
    const again = await writePhotoRow("AY-00500", { type: "obverse", caption: "" }, "AY-00500_obverse_cropped.jpg", "");
    const r1 = await writePhotoRow("AY-00500", { type: "reference", caption: "one" }, "AY-00500_reference_01.jpg", "");
    const r2 = await writePhotoRow("AY-00500", { type: "reference", caption: "two" }, "AY-00500_reference_02.jpg", "");
    const g = mock._grids.Photos;
    const out = {
      first, again, r1, r2,
      obverseRows: g.filter(r => r[1] === "AY-00500" && r[2] === "Obverse").length,
      refRows: g.filter(r => r[1] === "AY-00500" && r[2] === "Reference").length
    };
    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest();
    return out;
  }, seed());
  ok(D.again.replaced === true && D.again.row === D.first.row, "D1 re-capturing a single-instance type REPLACES its row in place");
  ok(D.again.photoId === D.first.photoId, "D2 the replacement keeps the original PhotoID");
  ok(D.obverseRows === 1, "D3 exactly one Obverse row exists for the coin, not two near-duplicates");
  ok(D.r2.replaced === false && D.r2.row !== D.r1.row, "D4 a repeatable type ADDS rather than replacing");
  ok(D.refRows === 2, "D5 both reference photos are recorded");

  // ---------- E. OriginalFilename -------------------------------------
  // Preferred over a second row: the raw is the uncropped source of the SAME
  // photo, and a second row would render as a duplicate gallery item.
  const E = await page.evaluate(async ({ withCol, without }) => {
    const run = async (s) => {
      const mock = createMockGraphClient(s);
      __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest();
      const res = await writePhotoRow("AY-00500", { type: "obverse", caption: "" },
        "AY-00500_obverse_cropped.jpg", "AY-00500_obverse_original.jpg");
      const g = mock._grids.Photos;
      const out = { row: g[res.row - 1], width: g[0].length, rows: g.filter(r => r[1] === "AY-00500").length };
      __setGraphClientForTest(null); __resetSheetHeaderMapsForTest();
      return out;
    };
    return { withCol: await run(withCol), without: await run(without) };
  }, { withCol: seed({ photoHeaders: PHOTO_HEADERS_WITH_ORIG }), without: seed() });
  ok(E.withCol.row[7] === "AY-00500_obverse_original.jpg", "E1 the raw is recorded in OriginalFilename when the column exists");
  ok(E.withCol.rows === 1, "E2 still exactly ONE row — the raw never gets its own");
  ok(E.without.rows === 1 && E.without.row.length <= 7, "E3 with no such column the write still succeeds and adds no second row");

  // ---------- F. Detach blanks the row, never deletes the file --------
  const F = await page.evaluate(async (s) => {
    const mock = createMockGraphClient(s);
    __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest();
    await mock.uploadFile("CoinCollection/_Testing/CoinPhotos/AY-00500_slab_obverse.jpg", new Uint8Array([1, 2]));
    const w = await writePhotoRow("AY-00500", { type: "slab_obverse", caption: "" }, "AY-00500_slab_obverse.jpg", "");
    const det = await detachPhotoRow("AY-00500", "slab_obverse", null);
    const g = mock._grids.Photos;
    // .slice() matters: the reclaim below writes into this very array, and
    // capturing the live reference would report the reclaimed row instead
    // of the blanked one.
    const rowAfter = g[w.row - 1].slice();
    const fileStillThere = !!(await mock.getItemMeta("CoinCollection/_Testing/CoinPhotos/AY-00500_slab_obverse.jpg"));
    // A blanked row goes back into the claimable pool — the same mechanism
    // from the other side.
    const reclaimed = (await writePhotoRow("AY-00501", { type: "obverse", caption: "" }, "AY-00501_obverse_cropped.jpg", "")).row;
    const out = { det, rowAfter, fileStillThere, reclaimed };
    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest();
    return out;
  }, seed());
  ok(F.det.detached === true, "F1 the row is detached");
  ok(F.rowAfter.every(c => c === "" || c === null), "F2 every cell in that row is now blank");
  ok(F.fileStillThere === true, "F3 the stored FILE is untouched — this layer never deletes one");
  ok(F.reclaimed === F.det.row, "F4 the blanked row returns to the claimable pool");

  // ---------- G. Receipts: one document, one id, one upload ----------
  const G = await page.evaluate(async (s) => {
    const mock = createMockGraphClient(s);
    // Count upload CALLS, not stored keys: a duplicate upload writes the
    // same path, so a key count cannot tell "skipped" from "re-uploaded".
    let uploads = 0;
    const realUpload = mock.uploadFile.bind(mock);
    mock.uploadFile = (path, f) => { uploads++; return realUpload(path, f); };
    __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest(); __setAddCoinWriteEnabledForTest(true);
    const prepared = { blob: new Blob(["x"]), filename: "ProfileCoins_2026-08-15_receipt.pdf", sourceWasPdf: true };
    const first = await commitReceiptCapture("AY-00600", prepared);
    const uploadsAfterFirst = uploads;
    const second = await commitReceiptCapture("AY-00601", prepared);
    const uploadsAfterSecond = uploads;
    // A photographed receipt is inherently per-coin.
    const photo = await commitReceiptCapture("AY-00602",
      { blob: new Blob(["y"]), filename: "image.pdf", sourceWasPdf: false });
    // Re-attaching to a coin that already has one replaces that coin's row.
    const replace = await commitReceiptCapture("AY-00600",
      { blob: new Blob(["z"]), filename: "Other_receipt.pdf", sourceWasPdf: true });
    const g = mock._grids.Receipts;
    const out = {
      first, second, photo, replace, uploadsAfterFirst, uploadsAfterSecond,
      rowsFor600: g.filter(r => r[1] === "AY-00600").length,
      allRows: g.filter(r => r[0]).map(r => [r[0], r[1], r[2]])
    };
    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest(); __setAddCoinWriteEnabledForTest(null);
    return out;
  }, seed());
  ok(G.first.receiptId === "RC-00002" && G.first.reused === false, "G1 a new document mints the next ReceiptID");
  ok(G.second.reused === true && G.second.receiptId === "RC-00002",
    "G2 the SAME document on a second coin reuses that ReceiptID — Ray's common buying pattern");
  ok(G.uploadsAfterFirst === 1 && G.uploadsAfterSecond === 1,
    "G3 and performs no second upload of byte-identical bytes");
  ok(G.second.row !== G.first.row, "G4 but each coin still gets its own row");
  ok(G.photo.filename === "AY-00602_receipt.pdf", "G5 a photographed receipt keeps the {ID}_receipt.pdf convention");
  ok(G.photo.receiptId === "RC-00003", "G6 and gets its own id");
  ok(G.replace.replaced === true && G.rowsFor600 === 1, "G7 re-attaching replaces THIS coin's row rather than adding a second");

  // ---------- H. storedReceiptFilename in isolation --------------------
  const H = await page.evaluate(() => ({
    pdf: storedReceiptFilename("AY-00700", { filename: "GreatCollections_2026-07-05_receipt.pdf", sourceWasPdf: true }),
    img: storedReceiptFilename("AY-00700", { filename: "image.pdf", sourceWasPdf: false }),
    unsafe: storedReceiptFilename("AY-00700", { filename: "a/b:c*receipt.pdf", sourceWasPdf: true }),
    none: storedReceiptFilename("AY-00700", null)
  }));
  ok(H.pdf === "GreatCollections_2026-07-05_receipt.pdf", "H1 a picked PDF keeps its own name — what makes de-dup reachable at all");
  ok(H.img === "AY-00700_receipt.pdf", "H2 a wrapped photo does not");
  ok(!/[\\/:*?"<>|]/.test(H.unsafe), "H3 a picked name is sanitised for path-hostile characters");
  ok(H.none === "AY-00700_receipt.pdf", "H4 no prepared file falls back to the per-coin convention");

  // ---------- I. Which captures commit directly ------------------------
  const I = await page.evaluate(async () => {
    __setAddCoinWriteEnabledForTest(true);
    const on = {
      owned: photoCommitTargetId("AY-00001"),
      addCoinTemp: photoCommitTargetId(ADDCOIN_GALLERY_ID),
      unknown: photoCommitTargetId("AY-99999"),
      child: photoCommitTargetId("AY-00022-A"),
      junk: photoCommitTargetId(null)
    };
    __setAddCoinWriteEnabledForTest(false);
    const off = photoCommitTargetId("AY-00001");
    __setAddCoinWriteEnabledForTest(null);
    return { on, off };
  });
  ok(I.on.owned === "AY-00001", "I1 an already-owned record commits directly");
  ok(I.on.addCoinTemp === null, "I2 Add Coin's temp draft key does NOT — it rides its own Staging flow");
  ok(I.on.unknown === null, "I3 an id with no All row does not commit");
  ok(I.on.child === "AY-00022-A", "I4 a Set's child coin does, keyed on its own CollectionID");
  ok(I.on.junk === null, "I5 a missing target is handled rather than throwing");
  ok(I.off === null, "I6 nothing commits while the write layer is off");

  // ---------- J. A failed upload is LOUD and loses nothing -------------
  // The whole point of this layer is that a capture never silently vanishes,
  // so a flaky connection has to leave the Blob in hand and offer a retry.
  const J = await page.evaluate(async (s) => {
    const mock = createMockGraphClient(s);
    let fail = true;
    const realUpload = mock.uploadFile.bind(mock);
    mock.uploadFile = (path, f) => fail ? Promise.reject(new Error("network down")) : realUpload(path, f);
    __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest(); __setAddCoinWriteEnabledForTest(true);
    galleryStore["AY-00001"] = [];
    const entry = { type: "slab_obverse", url: "blob:x", blob: new Blob(["p"]), caption: "",
      filename: "AY-00001_slab_obverse.jpg", rawFilename: null };
    await addGalleryEntryAndCommit("AY-00001", entry, () => {});
    const afterFail = {
      stillInGallery: galleryFor("AY-00001").indexOf(entry) !== -1,
      keptBlob: !!entry.blob,
      error: entry.uploadError,
      rows: mock._grids.Photos.filter(r => r[1] === "AY-00001").length
    };
    fail = false;
    await retryGalleryPhotoCommit("AY-00001", entry, () => {});
    const afterRetry = {
      error: entry.uploadError,
      rows: mock._grids.Photos.filter(r => r[1] === "AY-00001").length,
      uploaded: !!(await mock.getItemMeta("CoinCollection/_Testing/CoinPhotos/AY-00001_slab_obverse.jpg"))
    };
    delete galleryStore["AY-00001"];
    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest(); __setAddCoinWriteEnabledForTest(null);
    return { afterFail, afterRetry };
  }, seed());
  ok(J.afterFail.stillInGallery === true, "J1 a failed upload leaves the capture in the gallery");
  ok(J.afterFail.keptBlob === true, "J2 with its Blob intact, so a retry needs no re-capture");
  ok(/network down/.test(J.afterFail.error || ""), "J3 and records the real error");
  ok(J.afterFail.rows === 0, "J4 no Photos row is written for a failed upload");
  ok(!J.afterRetry.error, "J5 the retry clears the error");
  ok(J.afterRetry.rows === 1 && J.afterRetry.uploaded === true, "J6 and lands both the file and its row");

  // ---------- K. Promotion records a draft's photos and receipt --------
  const K = await page.evaluate(async (s) => {
    const mock = createMockGraphClient(s);
    __setGraphClientForTest(mock); __resetSheetHeaderMapsForTest(); __setAddCoinWriteEnabledForTest(true);
    const folder = "CoinCollection/_Testing/Staging/AY-00707";
    await mock.uploadBytes(folder + "/AY-00707_obverse_cropped.jpg", new Uint8Array([1]));
    await mock.uploadBytes(folder + "/AY-00707_obverse_original.jpg", new Uint8Array([2]));
    await mock.uploadBytes(folder + "/AY-00707_receipt.pdf", new Uint8Array([3]));
    const draft = {
      type: "coin", version: 1, collectionID: "AY-00707", status: "Promoted",
      photos: [
        { type: "obverse", filename: "AY-00707_obverse_cropped.jpg", caption: "" },
        { type: "obverse", filename: "AY-00707_obverse_original.jpg", caption: "original" }
      ],
      receiptPhoto: "AY-00707_receipt.pdf"
    };
    const planned = plannedCoinPromotionMoves(draft).map(m => m.src);
    const res = await movePromotedCoinFiles(draft);
    const g = mock._grids.Photos;
    const out = {
      planned, allOk: res.allOk,
      photoRows: g.filter(r => r[1] === "AY-00707").map(r => [r[2], r[4]]),
      receiptRows: mock._grids.Receipts.filter(r => r[1] === "AY-00707").map(r => [r[0], r[2]]),
      movedCropped: !!(await mock.getItemMeta("CoinCollection/_Testing/CoinPhotos/AY-00707_obverse_cropped.jpg")),
      movedRaw: !!(await mock.getItemMeta("CoinCollection/_Testing/CoinPhotos/AY-00707_obverse_original.jpg"))
    };
    __setGraphClientForTest(null); __resetSheetHeaderMapsForTest(); __setAddCoinWriteEnabledForTest(null);
    return out;
  }, seed());
  ok(!K.planned.some(p => /\[object Object\]/.test(p)),
    "K1 promotion move paths are real filenames — draft.photos entries are objects, and this used to concatenate one straight into the path");
  ok(K.allOk === true && K.movedCropped && K.movedRaw, "K2 both files reach CoinPhotos");
  ok(K.photoRows.length === 1, "K3 exactly ONE Photos row — the raw rides along, it does not get its own");
  ok(!!K.photoRows[0] && K.photoRows[0][0] === "Obverse" && K.photoRows[0][1] === "AY-00707_obverse_cropped.jpg",
    "K4 the row records the DISPLAYED file");
  ok(K.receiptRows.length === 1 && K.receiptRows[0] && K.receiptRows[0][1] === "AY-00707_receipt.pdf",
    "K5 the receipt gets its own row");

  // ---------- L. Read side --------------------------------------------
  const L = await page.evaluate(() => {
    __setStoredPhotosForTest({
      "AY-00900": [
        { photoType: "Obverse", galleryType: "obverse", subGroupId: "", filename: "AY-00900_obverse_cropped.jpg", originalFilename: "", label: "" },
        { photoType: "Slab_Obverse", galleryType: "slab_obverse", subGroupId: "", filename: "AY-00900_slab_obverse.jpg", originalFilename: "", label: "" }
      ]
    });
    __setStoredReceiptsForTest({ "AY-00900": { receiptId: "RC-00009", filename: "AY-00900_receipt.pdf" } });
    const fromTab = {
      obv: storedPhotoFilename({ id: "AY-00900" }, "obverse"),
      rev: storedPhotoFilename({ id: "AY-00900" }, "reverse")
    };
    // Legacy fallback: a coin recorded only the OLD way (AY-00706's
    // hand-entered flat columns) must not lose its photo.
    const legacy = storedPhotoFilename(
      { id: "AY-00706", obversePhotoFile: "AY-00706_slab_obverse.jpg", reversePhotoFile: "" }, "obverse");
    const missing = {
      photosTabOnly: coinMissingPhoto({ id: "AY-00900", denom: "1C", hasObversePhoto: false, hasReversePhoto: false }),
      legacyOnly: coinMissingPhoto({ id: "AY-00706", denom: "1C", hasObversePhoto: true, hasReversePhoto: false }),
      genuinelyNone: coinMissingPhoto({ id: "AY-00901", denom: "1C", hasObversePhoto: false, hasReversePhoto: false })
    };
    const receipts = {
      fromTab: storedReceiptFor({ id: "AY-00900" }),
      legacy: storedReceiptFor({ id: "AY-00902", receiptFile: "GreatCollections_2026-07-05_receipt.pdf" }),
      binder: storedReceiptFor({ id: "AY-00903", receiptFile: "Binder" }),
      none: storedReceiptFor({ id: "AY-00904", receiptFile: "" })
    };
    const guard = ["Binder", "", "  ", "x.pdf", "AY-1_receipt.jpg", "no-extension"].map(looksLikeReceiptFilename);
    __setStoredPhotosForTest(null); __setStoredReceiptsForTest(null);
    return { fromTab, legacy, missing, receipts, guard };
  });
  ok(L.fromTab.obv === "AY-00900_obverse_cropped.jpg", "L1 the Photos tab is the primary source for a coin's own photo");
  ok(L.fromTab.rev === "", "L2 a side with no row and no legacy value resolves to nothing");
  ok(L.legacy === "AY-00706_slab_obverse.jpg", "L3 the legacy flat column still works as a FALLBACK — nothing is lost by the repoint");
  ok(L.missing.photosTabOnly === false, "L4 a Photos row alone is enough to count as 'has a photo'");
  ok(L.missing.legacyOnly === false, "L5 so is the legacy flat column alone");
  ok(L.missing.genuinelyNone === true, "L6 a coin with neither is still flagged in the Docket");
  ok(L.receipts.fromTab && L.receipts.fromTab.receiptId === "RC-00009", "L7 the Receipts tab is the primary receipt source");
  ok(L.receipts.legacy && L.receipts.legacy.filename === "GreatCollections_2026-07-05_receipt.pdf", "L8 with the legacy column as fallback");
  ok(L.receipts.binder === null, '"L9 \\"Binder\\" is a not-yet-scanned placeholder, never treated as a filename"');
  ok(L.receipts.none === null, "L10 a blank receipt column resolves to nothing");
  ok(JSON.stringify(L.guard) === JSON.stringify([false, false, false, true, true, false]),
    "L11 looksLikeReceiptFilename accepts only something with a real extension");

  // ---------- M. Browse detail shows the stored receipt ----------------
  const M = await page.evaluate(() => {
    __setStoredReceiptsForTest({ "AY-00001": { receiptId: "RC-00009", filename: "AY-00001_receipt.pdf" } });
    const coin = FAKE_COINS.find(c => c.id === "AY-00001");
    showBrowseDetail(coin);
    // Purchase Details is a collapsed accordion, so its body is in the DOM
    // but excluded from innerText — read the markup, not the rendered text.
    const acc = document.getElementById("detailAccordions");
    const withFile = acc.innerHTML.includes("AY-00001_receipt.pdf");
    __setStoredReceiptsForTest(null);
    // "Binder" must render as text, never as a link.
    const binderCoin = Object.assign({}, FAKE_COINS.find(c => c.id === "AY-00003"), { receiptFile: "Binder" });
    showBrowseDetail(binderCoin);
    const el = document.getElementById("detailReceiptLink");
    const binderHtml = document.getElementById("detailAccordions").innerHTML;
    return {
      withFile,
      binderLinkEl: !!el,
      binderNotScanned: binderHtml.includes("not scanned"),
      binderNoAnchor: !/Binder[^<]*<\/a>/.test(binderHtml)
    };
  });
  ok(M.withFile === true, "M1 the stored receipt's filename renders on Browse detail");
  ok(M.binderLinkEl === false, "M2 a 'Binder' placeholder never becomes a link element");
  ok(M.binderNotScanned === true, "M3 and is labelled as not scanned rather than presented as a file");
  ok(M.binderNoAnchor === true, "M4 nor wrapped in an anchor that could only ever 404");

  // ---------- O. The flip card actually shows a stored photo -----------
  // The headline read-side change: before this, no coin's own stored photo
  // was displayed anywhere in the app — applyDiscContent() went straight
  // from a just-captured session blob to the SERIES reference image.
  const O = await page.evaluate(() => {
    __setStoredPhotosForTest({
      "AY-00001": [{ photoType: "Obverse", galleryType: "obverse", subGroupId: "",
                     filename: "AY-00001_obverse_cropped.jpg", originalFilename: "", label: "" }]
    });
    __setCoinPhotoCacheForTest("AY-00001_obverse_cropped.jpg", "blob:stored-photo");
    const coin = FAKE_COINS.find(c => c.id === "AY-00001");
    const disc = document.createElement("div");
    document.body.appendChild(disc);
    applyDiscContent(disc, coin, "obverse");
    const obv = { bg: disc.style.backgroundImage, title: disc.title, cls: disc.className, text: disc.textContent };
    // The reverse has no stored row and no cached file, so it must NOT
    // inherit the obverse's photo — resolved independently per side.
    const disc2 = document.createElement("div");
    document.body.appendChild(disc2);
    applyDiscContent(disc2, coin, "reverse");
    const rev = { bg: disc2.style.backgroundImage };
    disc.remove(); disc2.remove();
    __setStoredPhotosForTest(null); __resetCoinPhotoCacheForTest();
    return { obv, rev };
  });
  ok(O.obv.bg.includes("blob:stored-photo"), "O1 a coin's own STORED photo paints onto the flip card");
  ok(!O.obv.cls.includes("reference-image"), "O2 and is not styled as a generic series reference image");
  ok(O.obv.title === "Photo of this coin", "O3 with the right tooltip");
  ok(O.obv.text === "", "O4 the year-number placeholder is cleared");
  ok(!O.rev.bg.includes("blob:stored-photo"), "O5 the reverse does not inherit the obverse's photo");

  // ---------- N. Nav smoke + no overflow ------------------------------
  for (const [vp, name] of [[PHONE, "phone"], [TABLET, "tablet"]]) {
    const p2 = await openApp(vp);
    const res = await p2.evaluate(() => {
      const routes = ["dashboard", "browse", "albums", "sets", "wishlist", "addcoin",
        "addset", "stats", "needsdbcoins", "staging", "acquisitions", "batchreceipt"];
      routes.forEach(r => navigate(r));
      navigate("dashboard");
      return { overflow: document.body.scrollWidth > window.innerWidth + 1 };
    });
    ok(res.overflow === false, "N1 no horizontal overflow after a full nav sweep (" + name + ")");
    await p2.close();
  }
}, module);
