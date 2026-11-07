// (ar) Add Coin's Finish list from Lookup_Finishes (ParkingLot 304, Nov 2026).
//
// WHY. The Finish dropdown (#finish) was a fixed list in app.html; the app
// never read Lookup_Finishes. Ray needs "Diamond Field" (Lookup_Finishes A15,
// added 6 Nov 2026) selectable before the 2026-P Diamond Field Morgan and
// Peace set arrives. The rule now:
//   F1  the list is Lookup_Finishes column A in the sheet's order: blank rows,
//       "═" dividers, repeats and "Various" (set-level only, by exact name)
//       are dropped; text is kept as written (trimmed only);
//   F2  the sheet fails / hasn't arrived: FINISH_FALLBACK_LIST (today's 12
//       plus Diamond Field = 13) and, in a live session, a note; a later
//       refetch switches to the sheet's list;
//   F3  a header-only sheet: the fallback, never an empty list;
//   F4  a restored draft keeps its Finish; one the list doesn't offer
//       (e.g. "Various") stays as "<value> — existing value";
//   F5  a catalog row's Diamond Field gives "Use Diamond Field (from the
//       catalog)"; a catalog fill with an unknown Finish keeps the pick;
//   F6  the launch reads 12 sheets, the saved copy stores 12, a launch from
//       the saved copy shows the sheet's list with no sheet read;
//   F7  an 11-sheet format-1 saved copy is refused ("format") and deleted;
//   F8  the sheet landing after a pick keeps the pick.
//
// F1, F2, F4, F5, F6, F7 fail on main (fixed 12-option list, no Diamond
// Field, 11 launch sheets, format 1). Negative controls (by hand, recorded
// in docs/HISTORY.md): drop the "Various" exclusion -> F1 fails; drop the
// "═" filter -> F1 fails; plain .value = in the draft restore -> F4 fails;
// Lookup_Finishes out of FULL_READ_SHEETS -> F6 fails.

const { defineSuite } = require("./harness");

const SHEET = [
  ["Finish", "Description", "TypicalUse"],
  ["Business Strike", "Regular circulation strike", ""],
  ["Proof", "", ""],
  ["", "", ""],
  ["═══ SPECIAL ═══", "", ""],
  ["  Reverse Proof  ", "", ""],
  ["Various", "Set-level only; CoinID blank", ""],
  ["Matte", "", ""],
  ["Proof", "", ""],
  ["Diamond Field", "2026 Morgan and Peace", ""]
];
const SHEET_LIST = ["Business Strike", "Proof", "Reverse Proof", "Matte", "Diamond Field"];
const FALLBACK = ["Business Strike", "Proof", "Reverse Proof", "SMS", "Burnished", "Satin Finish",
  "Enhanced Reverse Proof", "Enhanced Uncirculated", "Uncirculated", "Specimen", "Matte", "Matte Proof", "Diamond Field"];

const INSTALL = (sheet) => {
  const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
  splashConnectGeneration++;
  __setSplashTimingsForTest(null);
  __setConnectionTimingsForTest(null);
  window.showToast = () => {};
  window.acquireGraphToken = () => Promise.resolve("fake-token");
  window.__wait = (ms) => new Promise(r => setTimeout(r, ms));
  window.__version = { id: "ITEM1", eTag: "\"{AAA},5\"", cTag: "\"c:{AAA},4\"", size: 100, lastModifiedDateTime: "2026-01-01T10:00:00Z" };
  window.__bodies = {
    All: [["CollectionID", "Year", "Denomination", "Description"], ["AY-00001", 1909, "1C", "Lincoln Wheat"]],
    DB_Sets: [["SetID", "Lineage", "Description", "Year"], ["S-1", "Proof Set", "Test Proof Set", 1999]],
    Lookup_Categories: [["Category"], ["Coin"]],
    Lookup_Finishes: sheet
  };
  window.__sheetFail = {};
  window.__fakeCalls = [];
  window.fetch = (url, init) => {
    const u = String(url);
    const m = /worksheets\('([^']+)'\)/.exec(u);
    const isVersion = /\?\$select=id,eTag,cTag,size,lastModifiedDateTime$/.test(u);
    const key = m ? decodeURIComponent(m[1]) : (isVersion ? "version" : "other");
    window.__fakeCalls.push({ key });
    if (key === "version") return Promise.resolve(new Response(JSON.stringify(window.__version), { status: 200 }));
    if (!m) return new Promise(() => {});
    if (window.__sheetFail[key]) return Promise.resolve(new Response("{}", { status: window.__sheetFail[key] }));
    return Promise.resolve(new Response(JSON.stringify({ values: window.__bodies[key] || [["Header"]] }), { status: 200 }));
  };
  window.__relaunch = () => {
    splashConnectGeneration++;
    abortStartupRequests();
    liveNavFetchGeneration++;
    __setLiveCoinsForTest(null);
    LIVE_DB_SETS = null;
    liveNavDataFetchPromise = null;
    __resetLiveNavOptionalForTest();
    __resetLiveNavDataDiagnosticsForTest();
    __resetLoadReportForTest();
    __setLiveLookupFinishesForTest(null, false);
    __setWorkbookCacheForTest({ launchTried: false, savedCopyLaunch: null });
    __setWorkbookSessionForTest({ source: "none", verified: false, dataAt: 0, dataVersion: null, connection: "ok",
      connectionReason: "", updating: false, checking: false, checkingSince: 0, ownWriteSinceData: false, lastCheckAt: 0 });
    window.__fakeCalls = [];
  };
  // A launch with no saved copy on the device, so the sheets are really read.
  window.__freshLaunch = async () => { await idbDropDatabase("copy"); __relaunch(); return ensureLiveNavDataFetch(); };
  window.__sheetCalls = () => window.__fakeCalls.filter(c => c.key !== "version" && c.key !== "other").length;
  window.__finishCalls = () => window.__fakeCalls.filter(c => c.key === "Lookup_Finishes").length;
  window.__options = () => [...document.getElementById("finish").options].map(o => o.value);
  window.__labels = () => [...document.getElementById("finish").options].map(o => o.textContent);
  window.__noteShown = () => getComputedStyle(document.getElementById("finishListNote")).display !== "none";
  window.__shown = (id) => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== "none" && !e.classList.contains("hidden"); };
  __setLiveDataModeForTest("live");
  __setWorkbookCacheForTest({ account: "acct-1", timings: null });
};

module.exports = defineSuite("finish-list-ar", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);

  // ---- F0: the offline mockup (no live data) shows the fallback, no note ------
  const F0 = await page.evaluate(() => ({
    options: [...document.getElementById("finish").options].map(o => o.value),
    note: getComputedStyle(document.getElementById("finishListNote")).display !== "none"
  }));
  ok("F0 before any read the dropdown is — not recorded — plus the 13-value fallback, Diamond Field last, no note (" + JSON.stringify(F0) + ")",
    JSON.stringify(F0.options) === JSON.stringify([""].concat(FALLBACK)) && F0.note === false);

  await page.evaluate(INSTALL, SHEET);

  // ---- F1 / F6: a launch read brings the sheet's list --------------------------
  const F1 = await page.evaluate(async () => {
    await idbDropDatabase("copy"); await idbDropDatabase("live");
    __relaunch();
    const res = await ensureLiveNavDataFetch();
    await __wait(80);
    const r = await idbCacheGet(WRITE_TARGET);
    return { res, options: __options(), note: __noteShown(), sheetCalls: __sheetCalls(), finishCalls: __finishCalls(),
      recSheets: r && Object.keys(r.sheets), recFinishes: r && r.sheets.Lookup_Finishes, format: r && r.formatVersion };
  });
  ok("F1 the Finish list is Lookup_Finishes column A in sheet order: no blank, no ═ divider, no repeat, trimmed (" + JSON.stringify(F1.options) + ")",
    F1.res === true && JSON.stringify(F1.options) === JSON.stringify([""].concat(SHEET_LIST)) && F1.note === false);
  ok("F1b \"Various\" (set-level only) is never offered", !F1.options.includes("Various"));
  ok("F1c Diamond Field is offered, and nothing from the fallback that the sheet lacks (SMS, Matte Proof)",
    F1.options.includes("Diamond Field") && !F1.options.includes("SMS") && !F1.options.includes("Matte Proof"));
  ok("F6 the launch reads 12 sheets, Lookup_Finishes once (" + F1.sheetCalls + ", " + F1.finishCalls + ")", F1.sheetCalls === 12 && F1.finishCalls === 1);
  ok("F6b the saved copy (format 2) stores all 12 sheets, Lookup_Finishes included (" + JSON.stringify(F1.recSheets) + ")",
    F1.format === 2 && F1.recSheets && F1.recSheets.length === 12 && JSON.stringify(F1.recFinishes) === JSON.stringify(SHEET));

  // ---- F6c: a launch from the saved copy shows the sheet's list, no sheet read --
  const F6 = await page.evaluate(async () => {
    __relaunch();
    __setLiveLookupFinishesForTest(null, false); // as on a fresh page: the fallback is showing
    const before = __options().length;
    const res = await ensureLiveNavDataFetch();
    await __wait(80);
    return { res, before, source: __getWorkbookSessionForTest().source, options: __options(), sheetCalls: __sheetCalls() };
  });
  ok("F6c a launch from the saved copy shows the sheet's list with zero sheet reads (" + JSON.stringify(F6) + ")",
    F6.res === true && F6.before === 14 && F6.source === "saved-copy" && F6.sheetCalls === 0 &&
    JSON.stringify(F6.options) === JSON.stringify([""].concat(SHEET_LIST)));

  // ---- F7: an old 11-sheet, format-1 saved copy is refused and deleted ----------
  const F7 = await page.evaluate(async () => {
    const good = await idbCacheGet(WRITE_TARGET);
    const old = Object.assign({}, good, { formatVersion: 1, sheets: Object.assign({}, good.sheets) });
    delete old.sheets.Lookup_Finishes;
    await idbCachePut(WRITE_TARGET, old);
    __relaunch();
    await ensureLiveNavDataFetch();
    const outcome = savedCopyLaunch && savedCopyLaunch.outcome;
    await __wait(80);
    const after = await idbCacheGet(WRITE_TARGET);
    return { outcome, source: __getWorkbookSessionForTest().source, sheetCalls: __sheetCalls(), afterFormat: after && after.formatVersion };
  });
  ok("F7 an 11-sheet format-1 saved copy is refused as \"format\", deleted, and the workbook is read (" + JSON.stringify(F7) + ")",
    F7.outcome === "saved copy not used (format), deleted" && F7.source === "workbook" && F7.sheetCalls === 12 && F7.afterFormat === 2);

  // ---- F2: the sheet fails -> fallback + note; a refetch switches -----------------
  const F2 = await page.evaluate(async () => {
    await idbDropDatabase("copy");
    window.__sheetFail.Lookup_Finishes = 500;
    __relaunch();
    const res = await ensureLiveNavDataFetch();
    await __wait(50);
    const out = { res, options: __options(), note: __noteShown(), noteText: document.getElementById("finishListNote").textContent };
    const rec = await idbCacheGet(WRITE_TARGET);
    out.savedCopy = !!rec;
    window.__sheetFail = {};
    const re = await refetchMissingLiveNavSheets();
    await __wait(20);
    out.re = re; out.after = __options(); out.noteAfter = __noteShown();
    return out;
  });
  ok("F2 Lookup_Finishes fails (HTTP 500): the 13-value fallback with Diamond Field, and the note (" + JSON.stringify(F2.options) + ", \"" + F2.noteText + "\")",
    F2.res === true && JSON.stringify(F2.options) === JSON.stringify([""].concat(FALLBACK)) && F2.note === true &&
    /Lookup_Finishes couldn.t be read/.test(F2.noteText));
  ok("F2b ...no saved copy from a read that missed a sheet (" + F2.savedCopy + ")", F2.savedCopy === false);
  ok("F2c ...and the background refetch switches to the sheet's list, note gone (" + JSON.stringify(F2.after) + ")",
    F2.re === true && JSON.stringify(F2.after) === JSON.stringify([""].concat(SHEET_LIST)) && F2.noteAfter === false);

  // ---- F3: header-only / divider-only -> fallback, never empty ---------------------
  const F3 = await page.evaluate(async () => {
    const out = {};
    for (const [label, body] of [["header", [["Finish"]]], ["dividers", [["Finish"], ["═══"], [""], ["Various"]]], ["empty", []]]) {
      window.__bodies.Lookup_Finishes = body;
      await __freshLaunch();
      await __wait(20);
      out[label] = __options();
    }
    out.direct = [buildLookupFinishList([]), buildLookupFinishList(null), buildLookupFinishList([{ Finish: "  Proof " }, { Finish: "Various" }])];
    return out;
  });
  for (const label of ["header", "dividers", "empty"]) {
    ok("F3-" + label + " a Lookup_Finishes with nothing offerable gives the fallback, not an empty list (" + F3[label].length + " options)",
      JSON.stringify(F3[label]) === JSON.stringify([""].concat(FALLBACK)));
  }
  ok("F3b buildLookupFinishList: [] and null -> null; text trimmed, Various dropped (" + JSON.stringify(F3.direct) + ")",
    F3.direct[0] === null && F3.direct[1] === null && JSON.stringify(F3.direct[2]) === JSON.stringify(["Proof"]));

  // Back to the real sheet for the form checks.
  await page.evaluate((sheet) => { window.__bodies.Lookup_Finishes = sheet; }, SHEET);
  await page.evaluate(async () => { await __freshLaunch(); await __wait(20); });

  // ---- F4: a restored draft keeps its Finish --------------------------------------
  const F4 = await page.evaluate(() => {
    const out = {};
    navigate("addcoin");
    resetAddCoinForm();
    applyCoinDraftToForm({ finish: "Diamond Field" });
    out.diamond = document.getElementById("finish").value;
    resetAddCoinForm();
    applyCoinDraftToForm({ finish: "Various" });
    const sel = document.getElementById("finish");
    out.various = sel.value;
    out.variousLabel = sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].textContent;
    resetAddCoinForm();
    out.afterReset = __options();
    return out;
  });
  ok("F4 a draft restored with Finish Diamond Field keeps it (\"" + F4.diamond + "\")", F4.diamond === "Diamond Field");
  ok("F4b a draft with Finish \"Various\" (not offered) keeps it as an existing value (\"" + F4.various + "\", \"" + F4.variousLabel + "\")",
    F4.various === "Various" && F4.variousLabel === "Various — existing value");
  ok("F4c a new form after that drops the kept option (" + JSON.stringify(F4.afterReset) + ")",
    JSON.stringify(F4.afterReset) === JSON.stringify([""].concat(SHEET_LIST)));

  // ---- F5: the catalog row's Diamond Field; an unknown catalog Finish keeps the pick
  const F5 = await page.evaluate(() => {
    const out = {};
    const el = (id) => document.getElementById(id);
    __setLiveDbCoinsForTest([{ denom: "$1", year: 2026, mint: "P", variety: "", description: "Morgan Dollar",
      finish: "Diamond Field", designation: "", gsid: "", pcgs: "", mintage: 0, coinId: "C-2026-P-$1-99", composition: "x" }]);
    navigate("addcoin");
    resetAddCoinForm();
    el("denomination").value = "$1";
    el("denomination").dispatchEvent(new Event("change"));
    el("year").value = "2026";
    el("mintMark").value = "P";
    el("year").dispatchEvent(new Event("input"));
    checkDbCoinsMatch();
    out.useBtn = __shown("addCoinUseCatalogFinishBtn");
    out.useText = el("addCoinUseCatalogFinishBtn").textContent;
    el("addCoinCategoryCoinBtn").click();
    el("addCoinUseCatalogFinishBtn").click();
    out.finish = el("finish").value;
    out.confident = isConfidentMatch();
    out.dbBtn = __shown("saveToDatabaseBtn");
    out.msg = el("saveNotConfidentMsg").textContent;

    // A catalog fill whose Finish the list doesn't offer keeps the pick.
    resetAddCoinForm();
    el("finish").value = "Proof";
    applyDbCoinsRowToForm({ denom: "1C", year: 1999, mint: "S", variety: "", description: "Lincoln Cent",
      finish: "Weird Finish", designation: "", coinId: "C-1999-S-1C-01" });
    out.keptPick = el("finish").value;
    // ...and one it offers (by normField) is taken.
    resetAddCoinForm();
    applyDbCoinsRowToForm({ denom: "1C", year: 1999, mint: "S", variety: "", description: "Lincoln Cent",
      finish: "diamond field", designation: "", coinId: "C-1999-S-1C-01" });
    out.taken = el("finish").value;
    resetAddCoinForm();
    __setLiveDbCoinsForTest(null);
    return out;
  });
  ok("F5 a catalog row with Finish Diamond Field shows \"Use Diamond Field (from the catalog)\" (" + F5.useBtn + ", \"" + F5.useText + "\")",
    F5.useBtn === true && /Use Diamond Field \(from the catalog\)/.test(F5.useText));
  ok("F5b ...which fills it, and with Category Coin Save to Database is offered (" + JSON.stringify([F5.finish, F5.confident, F5.dbBtn, F5.msg]) + ")",
    F5.finish === "Diamond Field" && F5.confident === true && F5.dbBtn === true);
  ok("F5c a catalog fill with a Finish the list doesn't offer keeps the pick (\"" + F5.keptPick + "\")", F5.keptPick === "Proof");
  ok("F5d a catalog fill with an offered Finish (any case) takes the list's own text (\"" + F5.taken + "\")", F5.taken === "Diamond Field");

  // ---- F8: the sheet landing after a pick keeps the pick ---------------------------
  const F8 = await page.evaluate(async () => {
    const out = {};
    window.__sheetFail.Lookup_Finishes = 500;
    await __freshLaunch();
    navigate("addcoin");
    resetAddCoinForm();
    document.getElementById("finish").value = "Diamond Field";
    window.__sheetFail = {};
    await refetchMissingLiveNavSheets();
    out.inList = document.getElementById("finish").value;
    // A pick the sheet's list doesn't have (SMS) stays as an existing value.
    window.__sheetFail.Lookup_Finishes = 500;
    await __freshLaunch();
    resetAddCoinForm();
    document.getElementById("finish").value = "SMS";
    window.__sheetFail = {};
    await refetchMissingLiveNavSheets();
    const sel = document.getElementById("finish");
    out.notInList = sel.value;
    out.notInListLabel = sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].textContent;
    resetAddCoinForm();
    return out;
  });
  ok("F8 a Finish picked from the fallback stays picked when the sheet lands (\"" + F8.inList + "\")", F8.inList === "Diamond Field");
  ok("F8b a picked Finish the sheet lacks stays, as an existing value (\"" + F8.notInList + "\", \"" + F8.notInListLabel + "\")",
    F8.notInList === "SMS" && F8.notInListLabel === "SMS — existing value");

  // ---- F9: the Catalog Finish filter groups Diamond Field under Special (Q4) ------
  const F9 = await page.evaluate(() => catalogFinishGroupKey("Diamond Field"));
  ok("F9 the Catalog Finish pills put Diamond Field under Special (\"" + F9 + "\")", F9 === "special");

  await page.evaluate(async () => {
    await idbDropDatabase("copy"); await idbDropDatabase("live");
    __setLiveLookupFinishesForTest(null, false);
    __setLiveDataModeForTest(null);
  });
});
