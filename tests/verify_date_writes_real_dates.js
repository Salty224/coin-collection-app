// Dates the app writes are real Excel dates (branch claude/date-writes-real-dates).
//
// Background: LIVE All.ValueDate on AY-00759 held the TEXT
// "2026-10-27T04:00:00.000Z" (Copilot's shape: a JS Date at local midnight in
// New York, sent through Office.js). The app's own paths already sent serials,
// but nothing at the choke points stopped a Date or ISO text getting through,
// the reads hid a text date as blank, and a Photos / Receipts row rewrite
// dropped a text DateAdded. This suite pins the one rule:
//   - every date written goes through toWorkbookDate(): a whole serial number,
//     the user's LOCAL calendar day, with numberFormat yyyy-mm-dd in the same
//     request;
//   - patchWorkbookRanges() (real and mock) refuses a Date object or an ISO
//     date-time string in ANY cell, naming the cell, writing nothing;
//   - reads accept a serial or text (workbookDateToISO);
//   - the Docket lists every date cell stored as text.
//
// N1-N5 are the negative controls: each fails on main at 716a5e3.
// The page runs in America/New_York with the clock fixed at 23:30 local on
// 4 Nov 2026, which is 04:30 UTC on 5 Nov, so a UTC-day bug shows.
const { defineSuite } = require("./harness");

const TZ = "America/New_York";
const FIXED = "2026-11-04T23:30:00-05:00"; // local 4 Nov, UTC 5 Nov

module.exports = defineSuite("date-writes-real-dates", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp(PHONE, { timezoneId: TZ, fixedTime: FIXED });
  await page.evaluate(() => {
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
    window.S = iso => excelSerialFromISODate(iso);
    window.ALL_HEADERS = ["CollectionID", "CoinID", "Year", "MintMark", "Denomination", "Description", "Value",
      "ValueSource", "ValueDate", "Cost", "Shipping", "Seller_Link", "PurchaseDate", "Remarks", "Reviewed",
      "LastModified", "Status", "SaleDate", "SalePrice", "OriginSetID", "Purged", "Grade"];
    window.allGrid = (rows) => [ALL_HEADERS.slice()].concat(rows.map(r => ALL_HEADERS.map(h => (h in r ? r[h] : ""))));
    window.col = h => ALL_HEADERS.indexOf(h);
    window.useMock = (sheets) => {
      const mock = createMockGraphClient({ sheets });
      __setGraphClientForTest(mock); __resetAllHeaderMapForTest();
      __setBrowseEditWriteEnabledForTest(true);
      return mock;
    };
    window.done = () => { __setGraphClientForTest(null); __resetAllHeaderMapForTest(); __setBrowseEditWriteEnabledForTest(null); };
  });

  const env = await page.evaluate(() => ({
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    utcDay: new Date().toISOString().slice(0, 10),
    localDay: new Date().getFullYear() + "-" + (new Date().getMonth() + 1) + "-" + new Date().getDate()
  }));
  ok("E0 the page runs in New York at 23:30 local on 4 Nov (UTC is already 5 Nov): " + JSON.stringify(env),
    env.tz === TZ && env.utcDay === "2026-11-05" && env.localDay === "2026-11-4");

  // ================= N1: the All choke point converts every date ==========
  const N1 = await page.evaluate(async () => {
    useMock({ All: allGrid([{ CollectionID: "AY-00759" }]) });
    const out = {};
    for (const [label, v] of [["date", new Date(2026, 9, 27)], ["iso", "2026-10-27T04:00:00.000Z"], ["ymd", "2026-10-27"]]) {
      try {
        const edits = await buildRowCellEdits(2, { ValueDate: v, Value: 70 });
        const e = edits.find(x => x._columns.includes("ValueDate"));
        out[label] = { value: e.values[0][0], type: typeof e.values[0][0], fmt: e.numberFormat && e.numberFormat[0][0] };
      } catch (err) { out[label] = { threw: String(err.message || err) }; }
    }
    out.want = S("2026-10-27");
    done();
    return out;
  });
  ["date", "iso", "ymd"].forEach(k => ok("N1-" + k + " buildRowCellEdits sends ValueDate given as " + k +
    " as the whole serial of 27 Oct with yyyy-mm-dd: " + JSON.stringify(N1[k]),
    N1[k].type === "number" && N1[k].value === N1.want && N1[k].fmt === "yyyy-mm-dd"));

  // ================= N2: the final refusal in patchWorkbookRanges ==========
  const N2 = await page.evaluate(async () => {
    const mock = useMock({ All: allGrid([{ CollectionID: "AY-00759", ValueDate: 46000 }]) });
    const out = {};
    const tryPatch = async (client, edits) => {
      try { await client.patchWorkbookRanges("wb.xlsx", "All", edits); return "wrote"; }
      catch (e) { return String(e.message || e); }
    };
    out.mockIso = await tryPatch(mock, [{ address: "G2:I2", values: [[70, "PCGS", "2026-10-27T04:00:00.000Z"]] }]);
    out.mockCell = mock._grids.All[1][col("ValueDate")];
    out.mockValue = mock._grids.All[1][col("Value")];
    out.mockDate = await tryPatch(mock, [{ address: "M2", values: [[new Date(2026, 9, 27)]] }]);
    out.realIso = await tryPatch(RealGraphClient, [{ address: "AB12", values: [["2026-10-27T04:00:00.000Z"]] }]);
    // Free text that merely contains a timestamp is not a date cell: allowed.
    out.remarks = await tryPatch(mock, [{ address: "N2", values: [["Bought 2026-10-27T04:00:00.000Z at a show"]] }]);
    done();
    return out;
  });
  ok("N2a the mock refuses an ISO date-time string and names the cell: " + N2.mockIso,
    /Refused to write a date as text: All!I2/.test(N2.mockIso));
  ok("N2b ... and writes nothing in that batch (Value untouched, ValueDate still the old serial): " + JSON.stringify([N2.mockValue, N2.mockCell]),
    N2.mockCell === 46000 && N2.mockValue === "");
  ok("N2c a Date object is refused too: " + N2.mockDate, /Refused to write a date as text: All!M2 would get a Date object/.test(N2.mockDate));
  ok("N2d the REAL client refuses before any token or request: " + N2.realIso,
    /Refused to write a date as text: All!AB12/.test(N2.realIso));
  ok("N2e free text that only contains a timestamp is still written: " + N2.remarks, N2.remarks === "wrote");

  // ================= N3: a row rewrite keeps or repairs a text DateAdded ===
  const N3 = await page.evaluate(async () => {
    const H = ["ReceiptID", "CollectionID", "Filename", "DateAdded"];
    const mock = useMock({ Receipts: [H,
      ["RC-00002", "AY-00095", "shared.pdf", "2026-10-28T02:00:00.000Z"],  // 22:00 on 27 Oct in New York
      ["RC-00002", "AY-00051", "shared.pdf", "sometime in Oct"],           // unreadable text
      ["RC-00002", "AY-00052", "shared.pdf", 46000]] });
    const map = await ensureSheetHeaderMap(RECEIPTS_SHEET_NAME);
    const rows = await readRecordRows(RECEIPTS_SHEET_NAME, RECEIPTS_TABLE_NAME, "ReceiptID");
    for (const hit of rows) {
      await patchRecordRow(RECEIPTS_SHEET_NAME, hit.__row, map, buildPhotoRowPatch(hit, map, { Filename: "new.pdf" }));
    }
    const g = mock._grids.Receipts;
    const out = { iso: g[1][3], junk: g[2][3], serial: g[3][3], file: g[1][2], want27: S("2026-10-27") };
    done();
    return out;
  });
  ok("N3a a rewrite (as in Replace on all) turns an ISO-text DateAdded into the real LOCAL day (27 Oct, not the UTC 28th): " + JSON.stringify(N3),
    N3.iso === N3.want27);
  ok("N3b ... keeps unreadable text exactly as it was (never blanked, never NaN): " + JSON.stringify(N3.junk),
    N3.junk === "sometime in Oct");
  ok("N3c ... and a real date stays the same serial, a number: " + JSON.stringify(N3.serial), N3.serial === 46000);

  // ================= N4: reads accept a text date =========================
  const N4 = await page.evaluate(() => {
    const row = { CollectionID: "AY-00759", Description: "Roosevelt Dime", Denomination: "10C", Year: 2015, MintMark: "W",
      ValueDate: "2026-10-27T04:00:00.000Z", PurchaseDate: "2026-10-03", SaleDate: S("2026-10-30") };
    const c = mapWorkbookRowToCoin(row);
    return { valueDate: c.valueDate, purchaseDate: c.purchaseDate, saleDate: c.saleDate, textDates: c.textDates };
  });
  ok("N4a the coin mapper reads a text ValueDate as its local day: " + JSON.stringify(N4), N4.valueDate === "2026-10-27");
  ok("N4b ... a 'YYYY-MM-DD' text PurchaseDate and a serial SaleDate too", N4.purchaseDate === "2026-10-03" && N4.saleDate === "2026-10-30");
  ok("N4c ... and lists the two text cells for the Docket: " + JSON.stringify(N4.textDates),
    JSON.stringify(N4.textDates) === JSON.stringify([{ column: "PurchaseDate", text: "2026-10-03" }, { column: "ValueDate", text: "2026-10-27T04:00:00.000Z" }]));

  // Edit Coin's form fill (applySnapshotToEditFormInner) through the same reader.
  const N4E = await page.evaluate(() => {
    ["browseEditValueDate", "browseEditPurchaseDate", "browseEditSaleDate"].forEach(id => { document.getElementById(id).value = ""; });
    browseEditTouchedFields.clear();
    applySnapshotToEditFormInner({ ValueDate: "2026-10-27T04:00:00.000Z", PurchaseDate: "2026-10-03", SaleDate: S("2026-10-30") }, { id: "AY-00759" });
    return ["browseEditValueDate", "browseEditPurchaseDate", "browseEditSaleDate"].map(id => document.getElementById(id).value);
  });
  ok("N4d Edit Coin's form shows the text dates as dates, not blank: " + JSON.stringify(N4E),
    JSON.stringify(N4E) === JSON.stringify(["2026-10-27", "2026-10-03", "2026-10-30"]));

  // ================= N5: the conflict dialog formats every date column =====
  const N5 = await page.evaluate(() => ({
    value: guardValueText("ValueDate", S("2026-10-27")),
    sale: guardValueText("SaleDate", S("2026-10-30")),
    text: guardValueText("ValueDate", "2026-10-27T04:00:00.000Z"),
    plain: guardValueText("Value", 70)
  }));
  ok("N5a the conflict dialog shows ValueDate and SaleDate as dates, not serials: " + JSON.stringify(N5),
    N5.value === "2026-10-27" && N5.sale === "2026-10-30");
  ok("N5b ... a text date shows its day and says it is text; other columns unchanged",
    N5.text.indexOf("2026-10-27 (stored as text") === 0 && N5.plain === "70");

  // ================= H: the helper itself ==================================
  const H = await page.evaluate(() => {
    const t = v => { try { return toWorkbookDate(v); } catch (e) { return "THROW"; } };
    return {
      serial: t(46322), serialFrac: t(46322.75), digits: t("46322"), ymd: t("2026-10-27"), ymdTime: t("2026-10-27 00:00"),
      isoZ: t("2026-10-27T04:00:00.000Z"), isoLateZ: t("2026-10-28T02:00:00.000Z"), isoOffset: t("2026-10-27T03:00:00+09:00"),
      dateObj: t(new Date(2026, 9, 27, 23, 59)), blank: t(""), nul: t(null), undef: t(undefined),
      junk: t("soon"), badDay: t("2026-02-30"), zero: t(0), nan: t(NaN), badDate: t(new Date("x")),
      want: S("2026-10-27"), today: workbookDateToday(), wantToday: S("2026-11-04"),
      isoToday: localISODateToday(), legacyToday: excelSerialToday(),
      read: [workbookDateToISO(46322), workbookDateToISO("2026-10-28T02:00:00.000Z"), workbookDateToISO("soon"), workbookDateToISO("")],
      roundTrip: excelSerialToISODate(toWorkbookDate("2026-10-27")),
      cols: WORKBOOK_DATE_COLUMNS
    };
  });
  ok("H1 a serial (fractions floored, digits as text too) stays that day: " + JSON.stringify([H.serial, H.serialFrac, H.digits]),
    H.serial === 46322 && H.serialFrac === 46322 && H.digits === 46322);
  ok("H2 'YYYY-MM-DD' (with or without a time after a space) is that day", H.ymd === H.want && H.ymdTime === H.want);
  ok("H3 an ISO date-time or a Date is the LOCAL day of that instant (02:00Z on the 28th is the 27th in New York; 03:00 on the 27th at +09:00 is the 26th): " +
    JSON.stringify([H.isoZ, H.isoLateZ, H.isoOffset, H.dateObj]),
    H.isoZ === H.want && H.isoLateZ === H.want && H.isoOffset === H.want - 1 && H.dateObj === H.want);
  ok("H4 blank, null and undefined are blank", H.blank === "" && H.nul === "" && H.undef === "");
  ok("H5 junk, an impossible day, zero, NaN and an invalid Date throw: " + JSON.stringify([H.junk, H.badDay, H.zero, H.nan, H.badDate]),
    [H.junk, H.badDay, H.zero, H.nan, H.badDate].every(v => v === "THROW"));
  ok("H6 today is the LOCAL day (4 Nov), not the UTC day (5 Nov): " + JSON.stringify([H.today, H.wantToday, H.isoToday]),
    H.today === H.wantToday && H.legacyToday === H.wantToday && H.isoToday === "2026-11-04");
  ok("H7 the reader never throws and reads text as its local day: " + JSON.stringify(H.read),
    JSON.stringify(H.read) === JSON.stringify(["2026-10-27", "2026-10-27", "", ""]));
  ok("H8 a written date reads back as the same day", H.roundTrip === "2026-10-27");
  ok("H9 WORKBOOK_DATE_COLUMNS lists every date column the app writes: " + JSON.stringify(H.cols),
    JSON.stringify(H.cols) === JSON.stringify({ All: ["PurchaseDate", "ValueDate", "SaleDate", "LastModified"],
      Photos: ["DateAdded"], Receipts: ["DateAdded"], Ref_SpotPrices: ["LastUpdated"] }));

  // ================= P: every write path ===================================
  // P1 Edit Coin: ValueDate / PurchaseDate / SaleDate / LastModified.
  const P1 = await page.evaluate(async () => {
    const mock = useMock({ All: allGrid([{ CollectionID: "AY-00759", ValueDate: "2026-10-27T04:00:00.000Z", Value: 70 }]) });
    const res = await saveCoinRowToWorkbook("AY-00759",
      { Value: 70, ValueDate: S("2026-10-27"), PurchaseDate: S("2026-10-03"), SaleDate: S("2026-10-30") }, null, { gate: () => true });
    const g = mock._grids.All[1];
    const out = { ok: res.ok, written: res.written,
      v: g[col("ValueDate")], p: g[col("PurchaseDate")], s: g[col("SaleDate")], lm: g[col("LastModified")] };
    done();
    return out;
  });
  ok("P1a Edit Coin writes ValueDate, PurchaseDate and SaleDate as serials: " + JSON.stringify(P1),
    P1.ok && P1.v === await page.evaluate(() => S("2026-10-27")) && P1.p === await page.evaluate(() => S("2026-10-03")) &&
    P1.s === await page.evaluate(() => S("2026-10-30")));
  ok("P1b ... and a text ValueDate on the row is repaired by any save that reads it (the form shows it as a date)",
    typeof P1.v === "number" && P1.written.indexOf("ValueDate") !== -1);
  ok("P1c ... and LastModified is today's LOCAL day", P1.lm === await page.evaluate(() => S("2026-11-04")));

  const P1F = await page.evaluate(async () => {
    const mock = useMock({ All: allGrid([{ CollectionID: "AY-00759" }]) });
    const calls = [];
    const orig = mock.patchWorkbookRanges.bind(mock);
    mock.patchWorkbookRanges = (wb, sheet, edits) => { calls.push(JSON.parse(JSON.stringify(edits))); return orig(wb, sheet, edits); };
    await saveCoinRowToWorkbook("AY-00759", { ValueDate: S("2026-10-27"), Remarks: "x" }, null, { gate: () => true });
    const flat = calls.flat();
    const dateEdits = flat.filter(e => e._columns && e._columns.some(c => ["ValueDate", "LastModified"].includes(c)));
    const out = { formats: dateEdits.map(e => e.numberFormat && e.numberFormat[0][0]), n: dateEdits.length,
      remarksFmt: flat.filter(e => e._columns && e._columns.includes("Remarks")).map(e => !!e.numberFormat) };
    done();
    return out;
  });
  ok("P1d every All date edit carries yyyy-mm-dd in the SAME request; Remarks gets none: " + JSON.stringify(P1F),
    P1F.n === 2 && P1F.formats.every(f => f === "yyyy-mm-dd") && P1F.remarksFmt.every(x => x === false));

  const P1J = await page.evaluate(async () => {
    const mock = useMock({ All: allGrid([{ CollectionID: "AY-00759", ValueDate: 46000 }]) });
    const res = await saveCoinRowToWorkbook("AY-00759", { ValueDate: "soon", Value: 5 }, null, { gate: () => true });
    const g = mock._grids.All[1];
    const out = { ok: res.ok, message: res.message, v: g[col("ValueDate")], value: g[col("Value")] };
    done();
    return out;
  });
  ok("P1e a value that is not a date refuses the Save with a message and writes nothing: " + JSON.stringify(P1J),
    P1J.ok === false && /Not a date/.test(P1J.message) && P1J.v === 46000 && P1J.value === "");

  // P2 Add Coin promote / Force Add (same mapper + choke point).
  const P2 = await page.evaluate(async () => {
    const mock = useMock({ All: allGrid([{ CollectionID: "AY-00800" }]) });
    const vals = coinDraftToAllValues({ collectionID: "AY-00800", denom: "10C", year: "2015", mint: "W", description: "Roosevelt Dime",
      purchaseDate: "2026-10-03", valueDate: "2026-10-27", value: "70" });
    const res = await saveCoinRowToWorkbook("AY-00800", vals, null, { gate: () => true });
    const g = mock._grids.All[1];
    const out = { ok: res.ok, p: g[col("PurchaseDate")], v: g[col("ValueDate")], lm: g[col("LastModified")] };
    done();
    return out;
  });
  ok("P2 promote / Force Add write PurchaseDate and ValueDate as serials, LastModified as today: " + JSON.stringify(P2),
    P2.ok && P2.p === await page.evaluate(() => S("2026-10-03")) && P2.v === await page.evaluate(() => S("2026-10-27")) &&
    P2.lm === await page.evaluate(() => S("2026-11-04")));

  // P3 Set attach / detach and Purge stamp LastModified.
  const P3 = await page.evaluate(async () => {
    const mock = useMock({ All: allGrid([{ CollectionID: "AY-00801" }, { CollectionID: "AY-00802" }]) });
    const calls = [];
    const orig = mock.patchWorkbookRanges.bind(mock);
    mock.patchWorkbookRanges = (wb, sheet, edits) => { calls.push(JSON.parse(JSON.stringify(edits))); return orig(wb, sheet, edits); };
    await writeOriginSetIdCell(2, "AY-00700");
    await writePurgedCell(3, "Y");
    const g = mock._grids.All;
    const lmEdits = calls.flat().filter(e => e.numberFormat);
    const out = { a: g[1][col("LastModified")], b: g[2][col("LastModified")], fmts: lmEdits.map(e => e.numberFormat[0][0]) };
    done();
    return out;
  });
  ok("P3 Set attach/detach and Purge stamp LastModified as today's local serial with yyyy-mm-dd: " + JSON.stringify(P3),
    P3.a === await page.evaluate(() => S("2026-11-04")) && P3.b === P3.a && P3.fmts.length === 2 && P3.fmts.every(f => f === "yyyy-mm-dd"));

  // P4 / P5 new Photos and Receipts rows, P6 a Receipts row replaced in place.
  const P4 = await page.evaluate(async () => {
    const PH = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded", "OriginalFilename"];
    const RH = ["ReceiptID", "CollectionID", "Filename", "DateAdded"];
    const mock = useMock({
      Photos: [PH, ["PH-00001", "AY-00001", "Obverse", "", "a.jpg", "", 46000, ""], new Array(8).fill("")],
      Receipts: [RH, ["RC-00001", "AY-00001", "a.pdf", "2026-10-27T04:00:00.000Z"], ["", "", "", ""], ["", "", "", ""]] });
    const calls = [];
    const orig = mock.patchWorkbookRanges.bind(mock);
    mock.patchWorkbookRanges = (wb, sheet, edits) => { calls.push({ sheet, edits: JSON.parse(JSON.stringify(edits)) }); return orig(wb, sheet, edits); };
    await writeRecordRow(PHOTOS_SHEET_NAME, PHOTOS_TABLE_NAME, "PhotoID",
      { PhotoID: "PH-00002", CollectionID: "AY-00002", PhotoType: "Obverse", Filename: "b.jpg", DateAdded: excelSerialToday() }, null);
    await writeReceiptRow("AY-00002", "b.pdf", null);
    await writeReceiptRow("AY-00001", "a2.pdf", "RC-00001");  // replaces AY-00001's own row
    const fmtCalls = calls.filter(c => c.edits.some(e => e.numberFormat));
    const out = {
      photo: mock._grids.Photos[2][6], receiptNew: mock._grids.Receipts[2][3], receiptOwn: mock._grids.Receipts[1][3],
      fmts: fmtCalls.map(c => c.sheet + ":" + c.edits[0].address + ":" + c.edits[0].numberFormat[0][0] + ":" + typeof c.edits[0].values[0][0])
    };
    done();
    return out;
  });
  const today = await page.evaluate(() => S("2026-11-04"));
  ok("P4 a new Photos row's DateAdded is today's local serial: " + JSON.stringify(P4), P4.photo === today);
  ok("P5 a new Receipts row's DateAdded is today's local serial", P4.receiptNew === today);
  ok("P6 a Receipts row rewritten in place gets today's serial (its old text date is gone)", P4.receiptOwn === today);
  ok("P7 each of those DateAdded cells got a number AND yyyy-mm-dd in the same request: " + JSON.stringify(P4.fmts),
    P4.fmts.length === 3 && P4.fmts.every(f => /:yyyy-mm-dd:number$/.test(f)) &&
    P4.fmts.some(f => f.startsWith("Photos:G3")) && P4.fmts.some(f => f.startsWith("Receipts:D3")) && P4.fmts.some(f => f.startsWith("Receipts:D2")));

  // P8 the spot-price writer: LastUpdated a serial; a Text ("@") format is never kept.
  const P8 = await page.evaluate(() => {
    const detail = {
      address: "Ref_SpotPrices!A1:D3",
      values: [["Metal", "PricePerTroyOz", "LastUpdated", "Source"], ["Gold", 2500, 46000, "Kitco"], ["Silver", 30, "2026-10-01T04:00:00.000Z", "Kitco"]],
      formulas: [["", "", "", ""], ["", "", "", ""], ["", "", "", ""]],
      numberFormat: [["General", "General", "General", "General"], ["General", "General", "@", "General"], ["General", "General", "@", "General"]]
    };
    const snapshot = { Gold: { price: 2500 }, Silver: { price: 30 } };
    const validated = { changes: [{ metal: "Silver", newPrice: 31 }], dateSerial: S("2026-11-04"), source: "Kitco" };
    const plan = planSpotPriceWrite(detail, validated, snapshot);
    const cell = plan.edits && plan.edits[0] && plan.edits[0].cells.find(c => /^C/.test(c.address));
    return { refusal: plan.refusal, value: cell && cell.values[0][0], fmt: cell && cell.numberFormat[0][0],
      readIso: spotPriceDateSerial("2026-10-01T04:00:00.000Z") === S("2026-10-01"),
      readLate: spotPriceDateSerial("2026-10-02T02:00:00.000Z") === S("2026-10-01") };
  });
  ok("P8a the spot-price LastUpdated goes out as a serial with yyyy-mm-dd, never a Text '@' format: " + JSON.stringify(P8),
    !P8.refusal && P8.value === today && P8.fmt === "yyyy-mm-dd");
  ok("P8b spotPriceDateSerial reads ISO text as the local day (02:00Z on the 2nd is the 1st in New York)", P8.readIso && P8.readLate);

  // P9 Staging / Docket JSON dates are the local day.
  const fs = require("fs");
  const src = fs.readFileSync(require("path").join(__dirname, "..", "app.html"), "utf8");
  const utcSlices = (src.match(/new Date\(\)\.toISOString\(\)\.slice\(0, ?10\)/g) || []).length;
  ok("P9a no Staging / Docket JSON date takes the UTC day any more (toISOString().slice(0, 10)): " + utcSlices, utcSlices === 0);
  const P9b = await page.evaluate(() => localISODateToday());
  ok("P9b the local-day helper Staging and the Docket JSON use gives 4 Nov at 23:30 New York time: " + P9b, P9b === "2026-11-04");

  // ================= D: the Docket "Date stored as text" row ===============
  const D = await page.evaluate(async () => {
    const mk = (row) => mapWorkbookRowToCoin(Object.assign({ Description: "Roosevelt Dime", Denomination: "10C", Year: 2015, MintMark: "W" }, row));
    const bad = mk({ CollectionID: "AY-00759", ValueDate: "2026-10-27T04:00:00.000Z" });
    const good = mk({ CollectionID: "AY-00757", ValueDate: S("2026-10-27") });
    const tabs = mk({ CollectionID: "AY-00760", ValueDate: S("2026-10-27") });
    __setLiveCoinsForTest([bad, good, tabs]);
    applyLiveNavOptionalRows({
      Photos: [{ PhotoID: "PH-00090", CollectionID: "AY-00760", PhotoType: "Obverse", Filename: "x.jpg", DateAdded: "2026-10-27T04:00:00.000Z" },
               { PhotoID: "PH-00091", CollectionID: "AY-00757", PhotoType: "Reverse", Filename: "y.jpg", DateAdded: 46000 }],
      Receipts: [{ ReceiptID: "RC-00090", CollectionID: "AY-00760", Filename: "r.pdf", DateAdded: "Oct 27" }]
    });
    navigateNow("needsdbcoins");
    await renderNeedsAttentionHub();
    const rows = [...document.querySelectorAll("#docketOtherContainer .wish-item")].filter(r => r.querySelector(".docket-text-date"));
    const out = { texts: rows.map(r => r.querySelector(".docket-text-date").textContent),
      dismiss: rows.some(r => !!r.querySelector(".docket-dismiss")) };
    if (rows[0]) { rows[0].click(); await new Promise(r => setTimeout(r, 100)); }
    out.opened = currentBrowseCoin && currentBrowseCoin.id;
    // Fixed in Excel: the next load has real dates, and the rows are gone.
    __setLiveCoinsForTest([mk({ CollectionID: "AY-00759", ValueDate: S("2026-10-27") }), good, tabs]);
    applyLiveNavOptionalRows({
      Photos: [{ PhotoID: "PH-00090", CollectionID: "AY-00760", PhotoType: "Obverse", Filename: "x.jpg", DateAdded: 46322 }],
      Receipts: [{ ReceiptID: "RC-00090", CollectionID: "AY-00760", Filename: "r.pdf", DateAdded: 46322 }]
    });
    navigateNow("needsdbcoins");
    await renderNeedsAttentionHub();
    out.after = document.querySelectorAll("#docketOtherContainer .docket-text-date").length;
    __setLiveCoinsForTest(null);
    __setStoredPhotosForTest(null); __setStoredReceiptsForTest(null);
    navigateNow("dashboard");
    return out;
  });
  ok("D1 the Docket lists each date stored as text: the All cell, a Photos and a Receipts DateAdded, and nothing for real dates: " + JSON.stringify(D.texts),
    D.texts.length === 3 &&
    D.texts.some(t => /AY-00759 · All\.ValueDate holds “2026-10-27T04:00:00\.000Z”, not a real date \(reads as 2026-10-27\)/.test(t)) &&
    D.texts.some(t => /Photos PH-00090 \(AY-00760\) · DateAdded/.test(t)) &&
    D.texts.some(t => /Receipts RC-00090 \(AY-00760\) · DateAdded holds “Oct 27”, not a real date\. Fix it in Excel/.test(t)));
  ok("D2 ... with no Dismiss", D.dismiss === false);
  ok("D3 ... and a tap opens the coin: " + D.opened, D.opened === "AY-00759");
  ok("D4 once the cells hold real dates the rows clear themselves: " + D.after, D.after === 0);
}, module);
