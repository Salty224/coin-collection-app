// (ao) Stage 3 — the device's saved copy of the workbook (IndexedDB) and the
// offline read-only view.
//
// What it proves (docs/ref/PLATFORM.md "Device cache (ao)"):
//   D1   a launch full read whose version can be trusted saves all 12 sheets (11 before (ar) added Lookup_Finishes),
//        in this target's own database, with account, build and version;
//   D2   the next launch with the same version paints the copy and sends NO
//        sheet read; the session is checked and writes are allowed;
//   D3   a changed workbook: the copy is shown read-only, writes refused,
//        the full read replaces it and the copy is rewritten;
//   D4   a slow version check: "checking with the workbook…" after 1.5 s,
//        then checked;
//   D5   can't reach OneDrive / offline: the copy read-only, the approved rows;
//        back online: checked, the row goes;
//   D6   a workbook changed in the last 10 minutes is re-read despite a match;
//   D7   POISONED COPY: the copy says Year 1909 and has no Grade column, the
//        workbook says 1910 and has one: the edit snapshot, the header map
//        and the write all follow the workbook (invariant 17);
//   D8   TEST / LIVE never mix: a "live" copy is never read by this build and
//        the other target's database is deleted at launch; a record with the
//        wrong target, account, build, format or sheets is deleted, unused;
//   D9   nothing is saved when the version can't be trusted;
//   D10  a workbook write deletes the copy BEFORE its first request, even
//        when the write then fails;
//   D11  IndexedDB throwing or hanging: the launch is exactly today's;
//   D12  the Docket's data line and "Refresh from workbook".
//
// The app launches once per page; a "relaunch" here resets the in-memory
// data and launches again in the same page, so IndexedDB carries over the
// way it does on the phone. Token and network stubbed as in
// verify_startup_connection.js; the write layer goes to the mock client.

const { defineSuite } = require("./harness");

const INSTALL = () => {
  splashConnectGeneration++;
  __setSplashTimingsForTest(null);
  __setConnectionTimingsForTest(null);
  window.__toasts = [];
  window.showToast = (m) => { window.__toasts.push(m); };
  window.__realFetch = window.__realFetch || window.fetch;
  window.acquireGraphToken = () => Promise.resolve("fake-token");
  window.__wait = (ms) => new Promise(r => setTimeout(r, ms));
  window.__oldModified = "2026-01-01T10:00:00Z";
  window.__version = { id: "ITEM1", eTag: "\"{AAA},5\"", cTag: "\"c:{AAA},4\"", size: 100, lastModifiedDateTime: window.__oldModified };
  window.__versionMode = "ok";
  window.__versionDelay = 0;
  window.__sheetMode = "ok";
  window.__bodies = {
    All: [["CollectionID", "Year", "Denomination", "Description"], ["AY-00001", 1909, "1C", "Lincoln Wheat"]],
    DB_Sets: [["SetID", "Lineage", "Description", "Year"], ["S-1", "Proof Set", "Test Proof Set", 1999]]
  };
  window.__fakeCalls = [];
  window.fetch = (url, init) => {
    const u = String(url);
    const m = /worksheets\('([^']+)'\)/.exec(u);
    const isVersion = /\?\$select=id,eTag,cTag,size,lastModifiedDateTime$/.test(u);
    const key = m ? decodeURIComponent(m[1]) : (isVersion ? "version" : "other");
    window.__fakeCalls.push({ key, method: (init && init.method) || "GET" });
    if (key === "version") {
      if (window.__versionMode === "fail") return Promise.reject(new TypeError("Failed to fetch"));
      const body = JSON.stringify(window.__version);
      return new Promise(r => setTimeout(() => r(new Response(body, { status: 200 })), window.__versionDelay));
    }
    if (!m) return new Promise(() => {});
    if (window.__sheetMode === "hang") return new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true }));
    return Promise.resolve(new Response(JSON.stringify({ values: window.__bodies[m[1]] || [["Header"]] }), { status: 200 }));
  };
  // A fresh launch of the app in this page: no data in memory, no session.
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
    __setWorkbookCacheForTest({ launchTried: false, savedCopyLaunch: null });
    __setWorkbookSessionForTest({ source: "none", verified: false, dataAt: 0, dataVersion: null, connection: "ok",
      connectionReason: "", updating: false, checking: false, checkingSince: 0, ownWriteSinceData: false, lastCheckAt: 0 });
    window.__fakeCalls = [];
    window.__toasts = [];
  };
  window.__sheetCalls = () => window.__fakeCalls.filter(c => c.key !== "version" && c.key !== "other").length;
  window.__record = () => idbCacheGet(WRITE_TARGET);
  window.__dbNames = async () => (await indexedDB.databases()).map(d => d.name).filter(n => /^salty-cabinet-cache-/.test(n)).sort();
  __setLiveDataModeForTest("live");
  __setWorkbookCacheForTest({ account: "acct-1", timings: null });
};

module.exports = defineSuite("device-cache-ao", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);
  await page.evaluate(INSTALL);

  // ---- D1: the first launch saves the copy ---------------------------------
  const D1 = await page.evaluate(async () => {
    await idbDropDatabase("copy"); await idbDropDatabase("live");
    __relaunch();
    const res = await ensureLiveNavDataFetch();
    await __wait(80);
    const r = await __record();
    return { res, sheetCalls: __sheetCalls(), source: __getWorkbookSessionForTest().source,
      rec: r && { target: r.target, account: r.accountId, build: r.buildCommit, format: r.formatVersion, path: r.workbookPath,
        eTag: r.version.eTag, sheets: Object.keys(r.sheets), all: r.sheets.All },
      dbs: await __dbNames() };
  });
  ok("D1 a first launch reads the workbook (12 sheet reads; 11 before (ar)) as today (" + D1.sheetCalls + ", " + D1.source + ")", D1.res === true && D1.sheetCalls === 12 && D1.source === "workbook");
  ok("D2 ...and saves all 12 sheets' raw values in this target's own database (" + JSON.stringify(D1.rec && D1.rec.sheets) + ", " + JSON.stringify(D1.dbs) + ")",
    D1.rec && D1.rec.sheets.length === 12 && JSON.stringify(D1.rec.all) === JSON.stringify([["CollectionID", "Year", "Denomination", "Description"], ["AY-00001", 1909, "1C", "Lincoln Wheat"]]) &&
    JSON.stringify(D1.dbs) === JSON.stringify(["salty-cabinet-cache-copy"]));
  ok("D3 ...stamped with target, account, build, format, workbook and version (" + JSON.stringify(D1.rec && Object.assign({}, D1.rec, { sheets: undefined, all: undefined })) + ")",
    D1.rec && D1.rec.target === "copy" && D1.rec.account === "acct-1" && D1.rec.build === "unstamped" && D1.rec.format === 2 && /* 2 since (ar): 12 sheets */
    D1.rec.path === "CoinCollection/_Testing/CoinCollection (AI) COPY.xlsx" && D1.rec.eTag === "\"{AAA},5\"");

  // ---- D4: same version -> the copy, no sheet reads ------------------------------
  const D4 = await page.evaluate(async () => {
    __relaunch();
    window.__sheetMode = "hang";
    const t0 = Date.now();
    const res = await ensureLiveNavDataFetch();
    const s = __getWorkbookSessionForTest();
    navigate("needsdbcoins");
    await __wait(30);
    const out = { res, ms: Date.now() - t0, sheetCalls: __sheetCalls(), coins: activeCoins().map(c => c.id + ":" + c.year),
      source: s.source, verified: s.verified, allowed: workbookWritesAllowed().ok,
      dataLine: document.querySelector("#docketDataLine .docket-data-text").textContent,
      savedLine: (document.getElementById("docketSavedCopyLine") || {}).textContent || "",
      versionLine: (document.getElementById("docketVersionLine") || {}).textContent || "",
      launchLine: (document.getElementById("docketLaunchReadLine") || {}).textContent || "",
      bar: document.getElementById("sessionBar").classList.contains("hidden") };
    window.__sheetMode = "ok";
    return out;
  });
  ok("D4 same version: the copy is on screen with NO sheet read (" + D4.sheetCalls + " reads, " + D4.ms + " ms, " + JSON.stringify(D4.coins) + ")",
    D4.res === true && D4.sheetCalls === 0 && JSON.stringify(D4.coins) === JSON.stringify(["AY-00001:1909"]));
  ok("D5 ...the session is checked, writes allowed, no top row (" + JSON.stringify([D4.source, D4.verified, D4.allowed, D4.bar]) + ")",
    D4.source === "saved-copy" && D4.verified === true && D4.allowed === true && D4.bar === true);
  ok("D6 ...and the Docket says so: \"" + D4.dataLine + "\" / \"" + D4.savedLine + "\" / \"" + D4.launchLine + "\"",
    /^Data: checked with the workbook \d\d:\d\d \(saved copy matched\)$/.test(D4.dataLine) &&
    /^Saved copy at launch \(\d\d:\d\d:\d\d\): matched the workbook in \d+\.\d s; no sheet reads$/.test(D4.savedLine) &&
    D4.launchLine === "Launch read: none (the saved copy was used)");
  ok("D6b the version line shows the launch's own check, not \"not checked yet\" (Ray's B4): " + D4.versionLine,
    /^Workbook version: \d\d:\d\d:\d\d \(launch\) · last changed /.test(D4.versionLine));

  // ---- D7: a changed workbook -> copy read-only, re-read, rewritten ----------------
  const D7 = await page.evaluate(async () => {
    __relaunch();
    window.__version = Object.assign({}, window.__version, { eTag: "\"{AAA},6\"", cTag: "\"c:{AAA},5\"" });
    window.__bodies.All = [["CollectionID", "Year", "Denomination", "Description"], ["AY-00001", 1909, "1C", "Lincoln Wheat"], ["AY-00002", 1910, "5C", "Buffalo"]];
    // Hold the full read so the in-between state can be seen.
    window.__sheetMode = "ok";
    const realFetch = window.fetch;
    let openGate; const gate = new Promise(r => { openGate = r; });
    window.fetch = (u, i) => /worksheets/.test(String(u)) ? gate.then(() => realFetch(u, i)) : realFetch(u, i);
    const res = await ensureLiveNavDataFetch();
    await __wait(20);
    const s = __getWorkbookSessionForTest();
    const between = { res, coins: activeCoins().map(c => c.id), source: s.source, verified: s.verified, updating: s.updating,
      bar: document.getElementById("sessionBarText").textContent, allowed: workbookWritesAllowed() };
    let refused = "";
    __setGraphClientForTest(createMockGraphClient({})); // an ungated write would land here, not hang
    try { await graph().uploadJson("CoinCollection/_Testing/Staging/x.json", { a: 1 }); refused = "wrote"; } catch (e) { refused = e.name + ":" + e.reason; }
    __setGraphClientForTest(null);
    window.fetch = realFetch;
    openGate();
    for (let i = 0; i < 40 && __getWorkbookSessionForTest().source !== "workbook"; i++) await __wait(25);
    await __wait(80);
    const after = __getWorkbookSessionForTest();
    const r = await __record();
    return { between, refused, after: { source: after.source, coins: activeCoins().map(c => c.id), allowed: workbookWritesAllowed().ok },
      recETag: r && r.version.eTag, recRows: r && r.sheets.All.length };
  });
  ok("D7 a changed workbook: the copy is shown at once (" + JSON.stringify(D7.between.coins) + "), \"" + D7.between.bar + "\"",
    D7.between.res === true && JSON.stringify(D7.between.coins) === JSON.stringify(["AY-00001"]) &&
    D7.between.bar === "" && D7.between.updating === true && D7.between.verified === false); // Ray, 7 Nov: no "updating…" row
  ok("D8 ...read-only meanwhile: a write is refused (" + D7.refused + ")", D7.between.allowed.ok === false && D7.refused === "ReadOnlyError:unchecked");
  ok("D9 ...then the full read replaces it, writes come back (" + JSON.stringify(D7.after) + ")",
    D7.after.source === "workbook" && D7.after.coins.includes("AY-00002") && D7.after.allowed === true);
  ok("D10 ...and the copy is rewritten with the new version (" + D7.recETag + ", " + D7.recRows + " All rows)", D7.recETag === "\"{AAA},6\"" && D7.recRows === 3);

  // ---- D11: slow check -> "checking…" row, then checked -------------------------
  const D11 = await page.evaluate(async () => {
    __relaunch();
    __setWorkbookCacheForTest({ timings: { open: 1500, splash: 200 } });
    window.__versionDelay = 2200;
    window.__sheetMode = "hang";
    const res = await ensureLiveNavDataFetch();
    const early = { coins: activeCoins().length, verified: __getWorkbookSessionForTest().verified, bar: document.getElementById("sessionBarText").textContent };
    await __wait(1600);
    const mid = document.getElementById("sessionBarText").textContent;
    await __wait(900);
    const s = __getWorkbookSessionForTest();
    const out = { res, early, mid, late: document.getElementById("sessionBar").classList.contains("hidden"), verified: s.verified, sheetCalls: __sheetCalls() };
    window.__versionDelay = 0; window.__sheetMode = "ok";
    __setWorkbookCacheForTest({ timings: null });
    return out;
  });
  ok("D11 a slow check: the splash stops waiting and the copy shows read-only, no row in the first 1.5 s (" + JSON.stringify(D11.early) + ")",
    D11.res === true && D11.early.coins >= 1 && D11.early.verified === false && D11.early.bar === "");
  ok("D12 ...and no \"checking…\" row even after 1.5 s (Ray, 7 Nov) (\"" + D11.mid + "\")", D11.mid === "");
  ok("D13 ...and when the answer matches: checked, the row goes, still no sheet read (" + JSON.stringify([D11.verified, D11.late, D11.sheetCalls]) + ")",
    D11.verified === true && D11.late === true && D11.sheetCalls === 0);

  // ---- D14: can't reach OneDrive at launch, then back ---------------------------
  const D14 = await page.evaluate(async () => {
    __relaunch();
    __setConnectionTimingsForTest({ retry: 300, resume: 60000 });
    window.__versionMode = "fail";
    window.__sheetMode = "hang";
    const res = await ensureLiveNavDataFetch();
    await __wait(20);
    const bar = document.getElementById("sessionBarText").textContent;
    const allowed = workbookWritesAllowed();
    window.__versionMode = "ok";
    await __wait(500);
    const s = __getWorkbookSessionForTest();
    const out = { res, bar, allowed, coins: activeCoins().length, after: { conn: s.connection, verified: s.verified }, toasts: window.__toasts.slice(),
      hidden: document.getElementById("sessionBar").classList.contains("hidden") };
    window.__sheetMode = "ok";
    __setConnectionTimingsForTest(null);
    return out;
  });
  ok("D14 OneDrive unreachable at launch: the copy, read-only, \"" + D14.bar + "\"",
    D14.res === true && D14.coins >= 1 && D14.allowed.ok === false && D14.allowed.reason === "unreachable" &&
    /^Can't reach OneDrive · read-only · saved copy from \w{3} \d+ \w{3}, \d\d:\d\d$/.test(D14.bar));
  ok("D15 ...the retry finds it again: checked, \"Back online · data is current\", the row goes (" + JSON.stringify(D14.after) + ", " + JSON.stringify(D14.toasts) + ")",
    D14.after.conn === "ok" && D14.after.verified === true && D14.toasts.includes("Back online") && D14.hidden);

  // ---- D16: changed in the last 10 minutes -> re-read ---------------------------
  const D16 = await page.evaluate(async () => {
    // Make sure a copy exists with the current version first.
    __relaunch(); await ensureLiveNavDataFetch(); await __wait(80);
    const saved = !!(await __record());
    __relaunch();
    window.__version = Object.assign({}, window.__version, { lastModifiedDateTime: new Date(Date.now() - 5 * 60000).toISOString() });
    await ensureLiveNavDataFetch();
    for (let i = 0; i < 40 && __getWorkbookSessionForTest().source !== "workbook"; i++) await __wait(25);
    const out = { saved, sheetCalls: __sheetCalls(), source: __getWorkbookSessionForTest().source,
      savedLine: savedCopyLaunch && savedCopyLaunch.outcome };
    await __wait(60);
    window.__version = Object.assign({}, window.__version, { lastModifiedDateTime: window.__oldModified });
    return out;
  });
  ok("D16 a workbook changed 5 minutes ago is re-read even though its version matches (" + JSON.stringify(D16) + ")",
    D16.saved && D16.sheetCalls === 12 && D16.source === "workbook" && D16.savedLine === "workbook changed in the last 10 minutes; re-read");

  // ---- D17: POISONED COPY never reaches the write layer ---------------------------
  const D17 = await page.evaluate(async () => {
    // The device copy: Year 1909, no Grade column (the launch reads go
    // through the fake network, which still serves that).
    __relaunch(); await ensureLiveNavDataFetch(); await __wait(80);
    __relaunch();
    window.__sheetMode = "hang";
    await ensureLiveNavDataFetch();
    const fromCopy = activeCoins().find(c => c.id === "AY-00001");
    // The workbook the write layer reads: Year 1910 and a Grade column the
    // copy has never seen, inserted before Remarks.
    const headers = ["CollectionID", "Year", "Denomination", "Description", "Grade", "Remarks", "Reviewed", "LastModified"];
    const mock = createMockGraphClient({ sheets: { All: [headers, ["AY-00001", 1910, "1C", "Lincoln Wheat", "MS-64", "old", "", ""], headers.map(() => "")] } });
    __setGraphClientForTest(mock);
    __setBrowseEditWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();
    const map = await ensureAllHeaderMap({ fresh: true });
    const rowNumber = await findAllSheetRowNumber("AY-00001");
    const snap = await readAllRowWritableValues(rowNumber);
    const res = await saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap, { Remarks: "new" }), snap);
    const g = mock._grids.All;
    const out = { copyYear: fromCopy && fromCopy.year, verified: __getWorkbookSessionForTest().verified,
      mapHasGrade: !!(map && (map.Grade || (map.get && map.get("Grade")))), rowNumber, snapYear: snap.Year, snapGrade: snap.Grade,
      res: res.ok, remarks: g[1][headers.indexOf("Remarks")], grade: g[1][headers.indexOf("Grade")] };
    __setGraphClientForTest(null);
    __setBrowseEditWriteEnabledForTest(null);
    window.__sheetMode = "ok";
    return out;
  });
  ok("D17 the screen shows the copy's Year 1909 (" + D17.copyYear + "), checked (" + D17.verified + ")", String(D17.copyYear) === "1909" && D17.verified === true);
  ok("D18 ...but the edit snapshot reads the workbook: Year " + D17.snapYear + ", Grade " + D17.snapGrade,
    String(D17.snapYear) === "1910" && D17.snapGrade === "MS-64" && D17.rowNumber === 2);
  ok("D19 ...the header map is the workbook's (has the Grade column the copy lacks: " + D17.mapHasGrade + ")", D17.mapHasGrade === true);
  ok("D20 ...and the write lands in the workbook's Remarks column, Grade untouched (" + JSON.stringify([D17.res, D17.remarks, D17.grade]) + ")",
    D17.res === true && D17.remarks === "new" && D17.grade === "MS-64");

  // ---- D21: TEST / LIVE and bad records ------------------------------------------
  const D21 = await page.evaluate(async () => {
    const good = await (async () => { __relaunch(); await ensureLiveNavDataFetch(); await __wait(80); return __record(); })();
    const results = {};
    // A LIVE copy on the device: never read by this (copy) build, and deleted.
    await idbCachePut("live", Object.assign({}, good, { target: "live", sheets: Object.assign({}, good.sheets, { All: [["CollectionID"], ["AY-LIVE"]] }) }));
    await idbCacheDelete("copy");
    __relaunch();
    await ensureLiveNavDataFetch();
    await __wait(80);
    results.live = { coins: activeCoins().map(c => c.id), sheetCalls: __sheetCalls(), dbs: await __dbNames() };
    for (const [label, patch, account] of [
      ["target", { target: "live" }], ["account", {}, "acct-2"], ["build", { buildCommit: "0".repeat(40) }],
      ["format", { formatVersion: 99 }], ["sheets", { sheets: { All: [] } }], ["workbook", { workbookPath: "CoinCollection/CoinCollection (AI).xlsx" }]]) {
      await idbCachePut("copy", Object.assign({}, good, patch));
      __relaunch();
      if (account) __setWorkbookCacheForTest({ account });
      await ensureLiveNavDataFetch();
      const used = __getWorkbookSessionForTest().source === "saved-copy";
      const outcome = savedCopyLaunch && savedCopyLaunch.outcome;
      await __wait(80);
      const after = await __record();
      results[label] = { used, outcome, sheetCalls: __sheetCalls(), afterAccount: after && after.accountId };
      __setWorkbookCacheForTest({ account: "acct-1" });
    }
    return results;
  });
  ok("D21 a LIVE copy on the device is never shown by a TEST build (" + JSON.stringify(D21.live.coins) + ") and its database is deleted (" + JSON.stringify(D21.live.dbs) + ")",
    !D21.live.coins.includes("AY-LIVE") && D21.live.sheetCalls === 12 && !D21.live.dbs.includes("salty-cabinet-cache-live"));
  for (const label of ["target", "account", "build", "format", "sheets", "workbook"]) {
    const r = D21[label];
    ok("D22-" + label + " a record with the wrong " + label + " is deleted unused and the workbook is read (" + JSON.stringify(r) + ")",
      r.used === false && r.outcome === "saved copy not used (" + label + "), deleted" && r.sheetCalls === 12);
  }

  // ---- D23: nothing saved when the version can't be trusted ------------------------
  const D23 = await page.evaluate(async () => {
    await idbCacheDelete("copy");
    __relaunch();
    window.__version = Object.assign({}, window.__version, { lastModifiedDateTime: new Date(Date.now() - 30000).toISOString() });
    await ensureLiveNavDataFetch();
    await __wait(100);
    const rec = await __record();
    window.__version = Object.assign({}, window.__version, { lastModifiedDateTime: window.__oldModified });
    return { saved: !!rec, source: __getWorkbookSessionForTest().source };
  });
  ok("D23 a workbook changed 30 s before the read: the read is used, but no copy is saved (" + JSON.stringify(D23) + ")", D23.source === "workbook" && D23.saved === false);

  // ---- D24: a workbook write deletes the copy BEFORE its first request ---------------
  const D24 = await page.evaluate(async () => {
    const out = {};
    for (const fail of [false, true]) {
      __relaunch(); await ensureLiveNavDataFetch(); await __wait(80);
      const had = !!(await __record());
      const mock = createMockGraphClient({ sheets: { All: [["CollectionID", "Remarks"], ["AY-00001", "x"]] } });
      let seenAtWrite = "not called";
      const realPatch = mock.patchWorkbookRanges;
      mock.patchWorkbookRanges = async (...a) => {
        seenAtWrite = (await idbCacheGet(WRITE_TARGET)) ? "copy still there" : "copy gone";
        if (fail) throw new Error("boom");
        return realPatch.apply(mock, a);
      };
      __setGraphClientForTest(mock);
      let threw = false;
      try { await graph().patchWorkbookRanges(writePaths().workbook, "All", [{ address: "B2", values: [["y"]], _columns: ["Remarks"] }]); } catch (e) { threw = true; }
      out[fail ? "failing" : "ok"] = { had, seenAtWrite, threw, after: !!(await __record()) };
      __setGraphClientForTest(null);
    }
    // A file upload (not the workbook) leaves the copy alone.
    __relaunch(); await ensureLiveNavDataFetch(); await __wait(80);
    __setGraphClientForTest(createMockGraphClient({}));
    await graph().uploadJson("CoinCollection/_Testing/Staging/a.json", { a: 1 });
    out.upload = !!(await __record());
    __setGraphClientForTest(null);
    return out;
  });
  ok("D24 a workbook write deletes the copy before its request reaches the client (" + JSON.stringify(D24.ok) + ")",
    D24.ok.had && D24.ok.seenAtWrite === "copy gone" && D24.ok.after === false && D24.ok.threw === false);
  ok("D25 ...also when that write then fails (" + JSON.stringify(D24.failing) + ")",
    D24.failing.had && D24.failing.seenAtWrite === "copy gone" && D24.failing.threw && D24.failing.after === false);
  ok("D26 a file upload does not touch the copy (" + D24.upload + ")", D24.upload === true);

  // ---- D27: IndexedDB broken -> today's launch -------------------------------------
  const D27 = await page.evaluate(async () => {
    const out = {};
    const realOpen = IDBFactory.prototype.open;
    for (const mode of ["throws", "hangs"]) {
      __relaunch();
      __setWorkbookCacheForTest({ timings: { open: 200, splash: 3000 } });
      IDBFactory.prototype.open = mode === "throws" ? function () { throw new Error("blocked"); } : function () { return {}; };
      const t0 = Date.now();
      const res = await ensureLiveNavDataFetch();
      out[mode] = { res, ms: Date.now() - t0, sheetCalls: __sheetCalls(), source: __getWorkbookSessionForTest().source };
      IDBFactory.prototype.open = realOpen;
    }
    __setWorkbookCacheForTest({ timings: null });
    return out;
  });
  ok("D27 IndexedDB that throws: the launch reads the workbook as today (" + JSON.stringify(D27.throws) + ")",
    D27.throws.res === true && D27.throws.sheetCalls === 12 && D27.throws.source === "workbook");
  ok("D28 IndexedDB that never answers: the same, after the 1.5 s deadline (200 ms here) (" + JSON.stringify(D27.hangs) + ")",
    D27.hangs.res === true && D27.hangs.sheetCalls === 12 && D27.hangs.source === "workbook" && D27.hangs.ms < 2000);

  // ---- D29: Refresh from workbook ---------------------------------------------------
  const D29 = await page.evaluate(async () => {
    __relaunch(); await ensureLiveNavDataFetch(); await __wait(80);
    __relaunch(); window.__sheetMode = "hang"; await ensureLiveNavDataFetch(); window.__sheetMode = "ok";
    navigate("needsdbcoins");
    await __wait(20);
    const before = document.querySelector("#docketDataLine .docket-data-text").textContent;
    window.__fakeCalls = [];
    document.getElementById("docketRefreshBtn").click();
    for (let i = 0; i < 40 && __getWorkbookSessionForTest().source !== "workbook"; i++) await __wait(25);
    await __wait(20);
    return { before, after: document.querySelector("#docketDataLine .docket-data-text").textContent, sheetCalls: __sheetCalls(), toasts: window.__toasts.slice() };
  });
  ok("D29 \"Refresh from workbook\" reads all 12 sheets now and says so (" + JSON.stringify(D29) + ")",
    /saved copy matched/.test(D29.before) && D29.sheetCalls === 12 && /^Data: read from the workbook \d\d:\d\d$/.test(D29.after) && D29.toasts.includes("Read from the workbook"));

  // ---- D30: the real offline switch -------------------------------------------------
  await page.context().setOffline(true);
  const D30 = await page.evaluate(async () => {
    __relaunch();
    const res = await ensureLiveNavDataFetch();
    await __wait(20);
    const bar = document.getElementById("sessionBarText").textContent;
    const allowed = workbookWritesAllowed();
    return { res, online: navigator.onLine, bar, allowed, coins: activeCoins().length };
  });
  ok("D30 a launch with the device offline shows the copy read-only: \"" + D30.bar + "\"",
    D30.res === true && D30.online === false && D30.coins >= 1 && D30.allowed.reason === "offline" &&
    /^Offline · read-only · saved copy from \w{3} \d+ \w{3}, \d\d:\d\d$/.test(D30.bar));
  await page.context().setOffline(false);
  const D31 = await page.evaluate(async () => {
    for (let i = 0; i < 40 && (__getWorkbookSessionForTest().connection !== "ok" || sessionCheckInFlight); i++) await __wait(25);
    const s = __getWorkbookSessionForTest();
    return { conn: s.connection, verified: s.verified, toasts: window.__toasts.slice(), hidden: document.getElementById("sessionBar").classList.contains("hidden") };
  });
  ok("D31 back online (the real online event): checked, \"Back online · data is current\", the row goes (" + JSON.stringify(D31) + ")",
    D31.conn === "ok" && D31.verified === true && D31.toasts.includes("Back online") && D31.hidden);
});
