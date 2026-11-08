// (ao) Stage 2 — session state, the read-only write gate, connection checks,
// no sign-in redirect for lack of network, failed-attempt detail in the
// launch report, and per-step save timing.
//
// What it proves (docs/ref/PLATFORM.md "Device cache (ao)"):
//   G  every Graph write method is gated; nothing outside RealGraphClient
//      sends a write; offline / unreachable / an unchecked saved copy refuse
//      every write with a ReadOnlyError and the mock workbook is untouched;
//      reads still work; writes come back when the session is fine again;
//   U  read-only UI: the top-strip row and its wording, dimmed buttons, a tap
//      on a Save button or a write entry point is stopped with the approved
//      toast and the feature's own handler never runs;
//   C  connection: the window offline / online events (live only), a check
//      that fails makes the session read-only and retries, the resume check
//      at most once a minute, a changed workbook is re-read in the background
//      with the right toast, a full read records the version only when the
//      workbook was not changed near it, startup file moves wait;
//   M  MSAL: a network failure never counts towards, or starts, a redirect;
//   R  the launch report keeps each failed attempt's duration and reason
//      (timeout / auth / HTTP), including one abandoned by Retry;
//   T  the last save's steps and Graph calls are timed and shown.
//
// Real MSAL can't load here; the token and the network are stubbed as in
// verify_startup_connection.js, the workbook writes go to the mock client.

const fs = require("fs");
const path = require("path");
const { defineSuite } = require("./harness");

const ALL_HEADERS = ["CollectionID", "CoinID", "Denomination", "Category", "Year", "MintMark", "Description",
  "Finish", "Grade", "Cost", "Remarks", "Status", "Reviewed", "LastModified"];
function allSeed() {
  const row = ALL_HEADERS.map(h => ({ CollectionID: "AY-00001", CoinID: "C-1943-S-1C-01", Denomination: "1C", Year: 1943,
    MintMark: "S", Description: "Lincoln Wheat", Finish: "Business Strike", Category: "Coin", Grade: "MS-64",
    Cost: 5, Remarks: "old remark", Status: "Owned" })[h] ?? "");
  const blank = ALL_HEADERS.map(() => "");
  return { sheets: { All: [ALL_HEADERS.slice(), row, blank.slice(), blank.slice()] } };
}

const INSTALL = () => {
  splashConnectGeneration++;
  __setSplashTimingsForTest(null);
  __setLiveCoinsForTest(null);
  LIVE_DB_SETS = null;
  liveNavDataFetchPromise = null;
  __resetLiveNavOptionalForTest();
  __resetLiveNavDataDiagnosticsForTest();
  __resetLoadReportForTest();
  __setLiveDataModeForTest(null);
  __setGraphClientForTest(null);
  __setConnectionTimingsForTest(null);
  __setWorkbookSessionForTest({ source: "none", verified: false, dataAt: 0, dataVersion: null, connection: "ok",
    connectionReason: "", updating: false, checking: false, checkingSince: 0, ownWriteSinceData: false, lastCheckAt: 0 });
  window.__toasts = [];
  if (!window.__realShowToast) {
    window.__realShowToast = window.showToast;
  }
  window.showToast = (m) => { window.__toasts.push(m); };
  window.__fakeCalls = [];
  window.__realFetch = window.__realFetch || window.fetch;
  window.acquireGraphToken = () => Promise.resolve("fake-token");
  window.__version = { id: "ITEM1", eTag: "\"{AAA},5\"", cTag: "\"c:{AAA},4\"", size: 100, lastModifiedDateTime: "2026-01-01T10:00:00Z" };
  window.__versionMode = "ok";
  window.__sheetMode = "ok";
  const bodies = {
    All: [["CollectionID", "Year", "Denomination"], ["AY-90001", 1909, "1C"]],
    DB_Sets: [["SetID", "Lineage", "Description", "Year"], ["S-1", "Proof Set", "Test Proof Set", 1999]]
  };
  window.__bodies = bodies;
  window.fetch = (url, init) => {
    const u = String(url);
    const m = /worksheets\('([^']+)'\)/.exec(u);
    const isVersion = /\?\$select=id,eTag,cTag,size,lastModifiedDateTime$/.test(u);
    const key = m ? decodeURIComponent(m[1]) : (isVersion ? "version" : (/\$batch$/.test(u) ? "batch" : "other"));
    window.__fakeCalls.push({ key, url: u, method: (init && init.method) || "GET", body: init && init.body });
    if (key === "batch") {
      const reqs = JSON.parse(init.body).requests;
      return new Promise(r => setTimeout(() => r(new Response(JSON.stringify({ responses: reqs.map(q => ({ id: q.id, status: 200, body: {} })) }), { status: 200 })), 30));
    }
    if (key === "version") {
      if (window.__versionMode === "fail") return Promise.reject(new TypeError("Failed to fetch"));
      if (window.__versionMode === "503") return Promise.resolve(new Response("{}", { status: 503 }));
      return Promise.resolve(new Response(JSON.stringify(window.__version), { status: 200 }));
    }
    if (!m) return new Promise(() => {});
    if (window.__sheetMode === "timeout") return new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true }));
    if (window.__sheetMode === "notoken") return Promise.resolve(new Response("{}", { status: 401 }));
    return Promise.resolve(new Response(JSON.stringify({ values: bodies[m[1]] || [["Header"]] }), { status: 200 }));
  };
  window.__wait = (ms) => new Promise(r => setTimeout(r, ms));
};

module.exports = defineSuite("session-gate-ao", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check;
  selfCheck(ok);

  // ---- G0: static: every write method gated, no write outside the client --
  const src = fs.readFileSync(path.resolve(__dirname, "..", "app.html"), "utf8");
  const clientStart = src.indexOf("  const RealGraphClient = {");
  const clientEnd = src.indexOf("\n  };\n", clientStart);
  // (bk, 8 Nov 2026): the ONE exception is postCreateSession(), the POST that
  // makes the Excel workbook session; it writes nothing to the workbook. It
  // is cut out by name and must target createSession only.
  const csStart = src.indexOf("  async function postCreateSession(");
  const csEnd = src.indexOf("\n  }\n", csStart);
  const csBody = csStart > 0 ? src.slice(csStart, csEnd) : "";
  const outsideSrc = src.slice(0, clientStart) + src.slice(clientEnd);
  const outside = (csStart > 0 ? outsideSrc.replace(csBody, "") : outsideSrc).match(/method:\s*"(PUT|POST|PATCH|DELETE)"/g) || [];
  ok("G0 no fetch outside RealGraphClient sends a PUT / POST / PATCH / DELETE, except the createSession POST (" + JSON.stringify(outside) + ")",
    clientStart > 0 && clientEnd > clientStart && outside.length === 0);
  ok("G0b the one allowed POST is createSession's and sends only persistChanges",
    csStart > 0 && /method:\s*"POST"/.test(csBody) && /persistChanges: true/.test(csBody) && !/values|PATCH/.test(csBody) &&
    /\/workbook\/createSession/.test(src.slice(src.indexOf("function createExcelSession("), src.indexOf("function createExcelSession(") + 3000)));

  const page = await openApp(PHONE);
  await page.evaluate(INSTALL);

  const G1 = await page.evaluate(() => {
    const realMethods = Object.keys(RealGraphClient).filter(k => typeof RealGraphClient[k] === "function");
    const mock = createMockGraphClient({});
    const mockMethods = Object.keys(mock).filter(k => typeof mock[k] === "function" && !k.startsWith("_"));
    const ungated = list => list.filter(k => !/^(get|read|list)/.test(k) && !GATED_GRAPH_METHODS.has(k));
    return { realMethods, ungatedReal: ungated(realMethods), ungatedMock: ungated(mockMethods), gated: [...GATED_GRAPH_METHODS] };
  });
  ok("G1 every RealGraphClient method that is not a get / read / list is gated (" + JSON.stringify(G1.gated) + ", ungated: " + JSON.stringify(G1.ungatedReal) + ")",
    G1.realMethods.length >= 10 && G1.ungatedReal.length === 0);
  ok("G2 ...and the mock client has no write method outside the gate either (" + JSON.stringify(G1.ungatedMock) + ")", G1.ungatedMock.length === 0);

  // ---- G3-G7: the gate refuses, reads work, writes come back ---------------
  const G3 = await page.evaluate(async (seed) => {
    const mock = createMockGraphClient(seed);
    __setGraphClientForTest(mock);
    __setBrowseEditWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();
    const before = JSON.stringify(mock._grids.All);
    const tryAll = async () => {
      const out = {};
      const calls = {
        putContent: () => graph().putContent("CoinCollection/_Testing/Staging/x.json", "{}", "application/json"),
        deleteItem: () => graph().deleteItem("CoinCollection/_Testing/Staging/x.json"),
        patchWorkbookRanges: () => graph().patchWorkbookRanges(writePaths().workbook, "All", [{ address: "K2", values: [["x"]], _columns: ["Remarks"] }]),
        addTableRow: () => graph().addTableRow(writePaths().workbook, "AllCoins"),
        uploadFile: () => graph().uploadFile("CoinCollection/_Testing/CoinPhotos/x.jpg", new Blob(["x"], { type: "image/jpeg" })),
        uploadBytes: () => graph().uploadBytes("CoinCollection/_Testing/CoinPhotos/y.jpg", new Uint8Array([1])),
        uploadJson: () => graph().uploadJson("CoinCollection/_Testing/Staging/z.json", { a: 1 })
      };
      for (const k of Object.keys(calls)) {
        try { await calls[k](); out[k] = "wrote"; } catch (e) { out[k] = (e && e.name) + ":" + (e && e.reason); }
      }
      return out;
    };
    const results = {};
    for (const [label, patch] of [["offline", { connection: "offline" }], ["unreachable", { connection: "unreachable" }],
      ["unchecked", { connection: "ok", source: "saved-copy", verified: false }]]) {
      __setWorkbookSessionForTest(Object.assign({ source: "workbook", verified: true, connection: "ok" }, patch));
      results[label] = await tryAll();
    }
    const same = JSON.stringify(mock._grids.All) === before;
    const stored = ["CoinCollection/_Testing/Staging/x.json", "CoinCollection/_Testing/CoinPhotos/x.jpg", "CoinCollection/_Testing/CoinPhotos/y.jpg",
      "CoinCollection/_Testing/Staging/z.json"];
    const filesWritten = [];
    for (const p of stored) { try { if (await mock.getItemMeta(p)) filesWritten.push(p); } catch (e) { /* none */ } }
    __setWorkbookSessionForTest({ connection: "offline", source: "workbook", verified: true });
    let readOk = false;
    try { readOk = Array.isArray((await graph().readTableHeaderRow(writePaths().workbook, "AllCoins")).values || []); } catch (e) { readOk = "threw " + e.message; }
    const snap = await readAllRowWritableValues(2);
    const save = await saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap, { Remarks: "new remark" }), snap);
    const sameAfterSave = JSON.stringify(mock._grids.All) === before;
    __setWorkbookSessionForTest({ connection: "ok", source: "saved-copy", verified: true });
    const save2 = await saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap, { Remarks: "new remark" }), snap);
    const remarksNow = mock._grids.All[1][ALL_HEADERS_INDEX("Remarks")];
    __setGraphClientForTest(null);
    __setBrowseEditWriteEnabledForTest(null);
    return { results, same, filesWritten, readOk, save, sameAfterSave, save2ok: save2.ok, remarksNow };
    function ALL_HEADERS_INDEX(h) { return mock._grids.All[0].indexOf(h); }
  }, allSeed());
  const allRefused = r => Object.values(r).every(v => /^ReadOnlyError:/.test(v)) && Object.keys(r).length === 7;
  ok("G3 offline: all seven write methods refuse with ReadOnlyError:offline (" + JSON.stringify(G3.results.offline) + ")",
    allRefused(G3.results.offline) && Object.values(G3.results.offline).every(v => v === "ReadOnlyError:offline"));
  ok("G4 can't reach OneDrive: all seven refuse (" + JSON.stringify(G3.results.unreachable) + ")",
    allRefused(G3.results.unreachable) && Object.values(G3.results.unreachable).every(v => v === "ReadOnlyError:unreachable"));
  ok("G5 a saved copy not yet checked: all seven refuse (" + JSON.stringify(G3.results.unchecked) + ")",
    allRefused(G3.results.unchecked) && Object.values(G3.results.unchecked).every(v => v === "ReadOnlyError:unchecked"));
  ok("G6 nothing reached the mock workbook or its files (" + JSON.stringify(G3.filesWritten) + "); reads still work while read-only (" + G3.readOk + ")",
    G3.same && G3.filesWritten.length === 0 && G3.readOk === true);
  ok("G7 an Edit Coin save while offline is refused with the approved message and writes nothing: " + JSON.stringify(G3.save),
    G3.save.ok === false && /^Offline: nothing was saved\. Your changes are still on this screen; Save again when back online\.$/.test(G3.save.message) && G3.sameAfterSave);
  ok("G8 once the saved copy is checked the same save goes through (" + G3.remarksNow + ")", G3.save2ok === true && G3.remarksNow === "new remark");

  // ---- G9-G12: the gate is an ALLOW-LIST (Ray, Q2) ----------------------------
  const G9 = await page.evaluate(async () => {
    const base = { source: "workbook", verified: true, dataAt: Date.now(), connection: "ok", updating: false, checking: false };
    const verdict = patch => { __setWorkbookSessionForTest(Object.assign({}, base, patch)); return workbookWritesAllowed(); };
    const mock = createMockGraphClient({});
    __setGraphClientForTest(mock);
    const tryWrite = async patch => {
      __setWorkbookSessionForTest(Object.assign({}, base, patch));
      try { await graph().uploadJson("CoinCollection/_Testing/Staging/g9.json", { a: 1 }); return "wrote"; }
      catch (e) { return e.name + ":" + e.reason; }
    };
    const out = {
      checkedWorkbook: verdict({}),
      checkedCopy: verdict({ source: "saved-copy", verified: true }),
      notRead: verdict({ source: "none", verified: false }),
      notReadButFlagged: verdict({ source: "none", verified: true }),
      readNotFlagged: verdict({ source: "workbook", verified: false }),
      verifiedTruthy: verdict({ verified: 1 }),
      unknownSource: verdict({ source: "something-added-later", verified: true }),
      unknownConnection: verdict({ connection: "reconnecting" }),
      unknownWrite: await tryWrite({ source: "something-added-later", verified: true }),
      unknownConnWrite: await tryWrite({ connection: "reconnecting" }),
      notReadWrite: await tryWrite({ source: "none", verified: false }),
      okWrite: await tryWrite({})
    };
    __setWorkbookSessionForTest(base);
    __setGraphClientForTest(null);
    return out;
  });
  ok("G9 allowed only when checked and online: a full read this session (" + JSON.stringify(G9.checkedWorkbook) + ") or a matched saved copy (" + JSON.stringify(G9.checkedCopy) + "), and the write lands (" + G9.okWrite + ")",
    G9.checkedWorkbook.ok === true && G9.checkedCopy.ok === true && G9.okWrite === "wrote");
  ok("G10 a session that has not read the workbook refuses, whatever its flag says (" + JSON.stringify([G9.notRead, G9.notReadButFlagged, G9.readNotFlagged, G9.verifiedTruthy, G9.notReadWrite]) + ")",
    G9.notRead.ok === false && G9.notRead.reason === "not-read" && G9.notReadButFlagged.ok === false &&
    G9.readNotFlagged.ok === false && G9.verifiedTruthy.ok === false && G9.notReadWrite === "ReadOnlyError:not-read");
  ok("G11 a NEW, unknown session state refuses writes (" + JSON.stringify([G9.unknownSource, G9.unknownWrite]) + ")",
    G9.unknownSource.ok === false && G9.unknownSource.reason === "unknown" && G9.unknownWrite === "ReadOnlyError:unknown");
  ok("G12 an unknown connection state refuses too (" + JSON.stringify([G9.unknownConnection, G9.unknownConnWrite]) + ")",
    G9.unknownConnection.ok === false && G9.unknownConnWrite === "ReadOnlyError:unknown");

  // ---- U: what the user sees ----------------------------------------------
  await page.evaluate(INSTALL);
  const U1 = await page.evaluate(async () => {
    __setLiveDataModeForTest("live");
    navigate("acquisitions");
    const t = new Date(2026, 10, 6, 14, 32).getTime();
    __setWorkbookSessionForTest({ source: "workbook", verified: true, dataAt: t, connection: "offline" });
    const bar = document.getElementById("sessionBar");
    const text = document.getElementById("sessionBarText").textContent;
    const strip = getComputedStyle(document.documentElement).getPropertyValue("--top-strip-h");
    const addCoin = document.getElementById("acqAddCoinBtn");
    const dim = getComputedStyle(addCoin).opacity;
    const viewBefore = document.querySelector(".view.active") && document.querySelector(".view.active").id;
    addCoin.click();
    await __wait(50);
    const viewAfter = document.querySelector(".view.active") && document.querySelector(".view.active").id;
    const entryToast = window.__toasts.slice(-1)[0];
    document.getElementById("browseEditSaveBtn").click();
    const saveToast = window.__toasts.slice(-1)[0];
    __setWorkbookSessionForTest({ connection: "unreachable" });
    const text2 = document.getElementById("sessionBarText").textContent;
    const retryShown = !document.getElementById("sessionBarRetry").classList.contains("hidden");
    const trouble = bar.classList.contains("is-trouble");
    __setWorkbookSessionForTest({ connection: "ok" });
    const hiddenAfter = bar.classList.contains("hidden");
    const dimAfter = getComputedStyle(addCoin).opacity;
    const roClass = document.body.classList.contains("session-read-only");
    return { text, strip, dim, viewBefore, viewAfter, entryToast, saveToast, text2, retryShown, trouble, hiddenAfter, dimAfter, roClass };
  });
  ok("U1 offline row: \"" + U1.text + "\"", U1.text === "Offline · read-only · data from Fri 6 Nov, 14:32");
  ok("U2 the row adds to the top strip's height (" + U1.strip + ")", parseInt(U1.strip, 10) >= 24);
  ok("U3 write entry points are dimmed while read-only (" + U1.dim + "), and not after (" + U1.dimAfter + ")", U1.dim === "0.45" && U1.dimAfter === "1" && U1.roClass === false);
  ok("U4 a tap on Add Coin is stopped with \"" + U1.entryToast + "\" and the screen does not change (" + U1.viewBefore + " -> " + U1.viewAfter + ")",
    U1.entryToast === "Read-only while offline" && U1.viewAfter === U1.viewBefore);
  ok("U5 a tap on Edit Coin's Save gives the approved message: " + U1.saveToast,
    U1.saveToast === "Offline: nothing was saved. Your changes are still on this screen; Save again when back online.");
  ok("U6 can't reach OneDrive: \"" + U1.text2 + "\", amber, with Retry", U1.text2 === "Can't reach OneDrive · read-only · data from Fri 6 Nov, 14:32" && U1.trouble && U1.retryShown);
  ok("U7 back to normal: the row goes", U1.hiddenAfter === true);

  // ---- C: connection ---------------------------------------------------------
  await page.evaluate(INSTALL);
  const C1 = await page.evaluate(async () => {
    window.dispatchEvent(new Event("offline"));
    const mockupConn = __getWorkbookSessionForTest().connection;
    __setLiveDataModeForTest("live");
    window.dispatchEvent(new Event("offline"));
    const liveConn = __getWorkbookSessionForTest().connection;
    return { mockupConn, liveConn };
  });
  ok("C1 the window offline event makes a live session read-only (" + C1.liveConn + "), never the mockup (" + C1.mockupConn + ")",
    C1.liveConn === "offline" && C1.mockupConn === "ok");

  const C2 = await page.evaluate(async () => {
    // Back online, the workbook unchanged.
    __setWorkbookSessionForTest({ source: "workbook", verified: true, dataAt: Date.now(), connection: "offline",
      dataVersion: Object.assign({ ok: true }, window.__version) });
    window.dispatchEvent(new Event("online"));
    await __wait(50);
    if (sessionCheckInFlight) await sessionCheckInFlight;
    const s = __getWorkbookSessionForTest();
    return { conn: s.connection, toasts: window.__toasts.slice(), sheetCalls: window.__fakeCalls.filter(c => c.key === "All").length };
  });
  ok("C2 online + unchanged workbook: writes back, toast \"Back online\", nothing re-read (" + JSON.stringify(C2) + ")",
    C2.conn === "ok" && C2.toasts.slice(-1)[0] === "Back online" && C2.sheetCalls === 0);

  const C3 = await page.evaluate(async () => {
    const run = async (newContent) => {
      window.__toasts = [];
      const before = window.__fakeCalls.filter(c => c.key === "All").length;
      if (newContent) window.__bodies.All = window.__bodies.All.concat([["AY-90009", 1911, "10C"]]);
      __setWorkbookSessionForTest({ source: "workbook", verified: true, dataAt: 1, connection: "offline",
        dataVersion: Object.assign({ ok: true }, window.__version, { eTag: "\"{AAA},4\"" }) });
      window.dispatchEvent(new Event("online"));
      await __wait(50);
      if (sessionCheckInFlight) await sessionCheckInFlight;
      const s = __getWorkbookSessionForTest();
      return { conn: s.connection, toasts: window.__toasts.slice(), sheetCalls: window.__fakeCalls.filter(c => c.key === "All").length - before,
        dataAt: s.dataAt, coins: activeCoins().map(c => c.id), updating: s.updating };
    };
    const lagging = await run(false); // the version moved but Excel sent the same content (Ray's B1)
    const changed = await run(true);
    return { lagging, changed };
  });
  ok("C3 online + changed version but the SAME content (Excel lagging): re-read, toast just \"Back online\" (" + JSON.stringify(C3.lagging) + ")",
    C3.lagging.conn === "ok" && C3.lagging.toasts.join() === "Back online" && C3.lagging.sheetCalls === 1 && C3.lagging.updating === false);
  ok("C3b online + really changed content: re-read, toast \"Back online · updated\" (" + JSON.stringify(C3.changed) + ")",
    C3.changed.conn === "ok" && C3.changed.toasts.join() === "Back online · updated" && C3.changed.sheetCalls === 1 &&
    C3.changed.dataAt > 1 && C3.changed.coins.includes("AY-90009"));

  const C4 = await page.evaluate(async () => {
    const runs = [];
    for (const [own, newContent] of [[false, false], [false, true], [true, true]]) {
      window.__toasts = [];
      if (newContent) window.__bodies.All = window.__bodies.All.concat([["AY-9100" + runs.length, 1912, "25C"]]);
      __setWorkbookSessionForTest({ connection: "ok", ownWriteSinceData: own, lastCheckAt: 0,
        dataVersion: Object.assign({ ok: true }, window.__version, { cTag: "\"c:{AAA},1\"" }) });
      const before = window.__fakeCalls.filter(c => c.key === "All").length;
      await checkSessionAgainstWorkbook("resume");
      runs.push({ own, newContent, toasts: window.__toasts.slice(), reread: window.__fakeCalls.filter(c => c.key === "All").length - before });
    }
    return runs;
  });
  ok("C4 mid-session: a re-read that brings the same content says nothing; one that changes the data says \"Updated\"; after the app's own write, silent (" + JSON.stringify(C4) + ")",
    C4[0].reread === 1 && C4[0].toasts.length === 0 && C4[1].reread === 1 && C4[1].toasts.join() === "Updated" &&
    C4[2].reread === 1 && C4[2].toasts.length === 0);

  const C5 = await page.evaluate(async () => {
    __setConnectionTimingsForTest({ retry: 150, resume: 60000 });
    window.__versionMode = "fail";
    __setWorkbookSessionForTest({ connection: "ok", lastCheckAt: 0 });
    await checkSessionAgainstWorkbook("resume");
    const afterFail = __getWorkbookSessionForTest();
    const roText = document.getElementById("sessionBarText").textContent;
    window.__versionMode = "ok";
    window.__toasts = [];
    await __wait(400);
    if (sessionCheckInFlight) await sessionCheckInFlight;
    const afterRetry = __getWorkbookSessionForTest();
    return { failConn: afterFail.connection, failReason: afterFail.connectionReason, roText, okConn: afterRetry.connection, toasts: window.__toasts.slice() };
  });
  ok("C5 a failed check makes the session read-only (" + C5.failConn + ", " + C5.failReason + ": \"" + C5.roText + "\")",
    C5.failConn === "unreachable" && /^Can't reach OneDrive · read-only/.test(C5.roText));
  ok("C6 ...and the retry timer checks again on its own and restores it (" + C5.okConn + ", " + JSON.stringify(C5.toasts) + ")",
    C5.okConn === "ok" && C5.toasts.includes("Back online"));

  const C7 = await page.evaluate(async () => {
    __setConnectionTimingsForTest(null);
    const count = () => window.__fakeCalls.filter(c => c.key === "version").length;
    __setWorkbookSessionForTest({ connection: "ok", lastCheckAt: Date.now() - 10000 });
    let n0 = count();
    document.dispatchEvent(new Event("visibilitychange"));
    await __wait(30);
    const recent = count() - n0;
    __setWorkbookSessionForTest({ lastCheckAt: Date.now() - 61000 });
    n0 = count();
    document.dispatchEvent(new Event("visibilitychange"));
    await __wait(30);
    if (sessionCheckInFlight) await sessionCheckInFlight;
    return { recent, old: count() - n0 };
  });
  ok("C7 a resume checks at most once a minute (10 s after a check: " + C7.recent + " requests; 61 s after: " + C7.old + ")", C7.recent === 0 && C7.old === 1);

  // Full read: the version goes out with the sheets and is kept only when the
  // workbook was not changed near the read.
  await page.evaluate(INSTALL);
  const C8 = await page.evaluate(async () => {
    __setLiveDataModeForTest("live");
    const out = {};
    for (const [label, modified] of [["old", "2026-01-01T10:00:00Z"], ["recent", new Date(Date.now() - 30000).toISOString()]]) {
      window.__version = Object.assign({}, window.__version, { lastModifiedDateTime: modified });
      window.__fakeCalls = [];
      await ensureLiveNavDataFetch({ force: true });
      await __wait(30);
      const order = window.__fakeCalls.map(c => c.key);
      out[label] = { dv: __getWorkbookSessionForTest().dataVersion, versionIndex: order.indexOf("version"), allIndex: order.indexOf("All"),
        source: __getWorkbookSessionForTest().source };
    }
    return out;
  });
  ok("C8 a full read asks for the version together with the sheets (version request #" + C8.old.versionIndex + ", All #" + C8.old.allIndex + ")",
    C8.old.versionIndex >= 0 && C8.old.allIndex >= 0 && C8.old.source === "workbook");
  ok("C9 ...keeps it when the workbook was last changed long before the read (" + JSON.stringify(C8.old.dv && C8.old.dv.eTag) + ")",
    C8.old.dv && C8.old.dv.eTag === "\"{AAA},5\"");
  ok("C10 ...and does not when it changed 30 s before (" + JSON.stringify(C8.recent.dv) + ")", C8.recent.dv === null);
  const C11 = await page.evaluate(() => ({
    a: fullReadVersionTrusted({ ok: true, lastModifiedDateTime: new Date(Date.now() - 601000).toISOString() }, Date.now()),
    b: fullReadVersionTrusted({ ok: true, lastModifiedDateTime: new Date(Date.now() - 599000).toISOString() }, Date.now()),
    c: fullReadVersionTrusted({ ok: false }, Date.now()),
    d: fullReadVersionTrusted({ ok: true, lastModifiedDateTime: "garbage" }, Date.now())
  }));
  ok("C11 the 10-minute margin (Ray's B1), exactly (" + JSON.stringify(C11) + ")", C11.a === true && C11.b === false && C11.c === false && C11.d === false);

  const C12 = await page.evaluate(async () => {
    __setLiveDataModeForTest("live");
    __setWorkbookSessionForTest({ source: "none", connection: "ok" });
    let settled = null;
    whenWritesAllowed(2000).then(v => { settled = v; });
    await __wait(300);
    const waiting = settled === null;
    __setWorkbookSessionForTest({ source: "workbook", verified: true });
    await __wait(400);
    const after = settled;
    __setWorkbookSessionForTest({ connection: "offline" });
    const ro = await whenWritesAllowed(300);
    __setWorkbookSessionForTest({ connection: "ok" });
    __setLiveDataModeForTest(null);
    const mockup = await whenWritesAllowed(0);
    return { waiting, after, ro, mockup };
  });
  ok("C12 startup file moves wait for a live launch to settle, never run read-only, and don't wait in the mockup (" + JSON.stringify(C12) + ")",
    C12.waiting && C12.after === true && C12.ro === false && C12.mockup === true);

  // ---- M: MSAL ----------------------------------------------------------------
  const M = await page.evaluate(() => {
    class IR extends Error {}
    const net = Object.assign(new Error("network"), { errorCode: "no_network_connectivity" });
    const other = Object.assign(new Error("server hiccup"), { errorCode: "server_error" });
    return {
      offlineNoAccount: tokenFailureAction(true, other, false, IR, 0),
      offlineThird: tokenFailureAction(true, other, true, IR, 3),
      netThird: tokenFailureAction(false, net, true, IR, 3),
      fetchFailed: tokenFailureAction(false, new TypeError("Failed to fetch"), true, IR, 5),
      onlineNoAccount: tokenFailureAction(false, other, false, IR, 0),
      onlineInteraction: tokenFailureAction(false, new IR("x"), true, IR, 1),
      onlineThird: tokenFailureAction(false, other, true, IR, 3),
      onlineFirst: tokenFailureAction(false, other, true, IR, 1),
      codes: ["no_network_connectivity", "network_request_failed", "post_request_failed", "get_request_failed", "endpoints_resolution_error"]
        .map(c => isMsalNetworkError({ errorCode: c })),
      notNet: isMsalNetworkError({ errorCode: "interaction_required", message: "AADSTS50058" })
    };
  });
  ok("M1 offline: never a redirect, not even with no account or on the 3rd failure (" + M.offlineNoAccount + ", " + M.offlineThird + ")",
    M.offlineNoAccount === "network" && M.offlineThird === "network");
  ok("M2 MSAL's own network errors and a failed fetch never redirect (" + M.netThird + ", " + M.fetchFailed + ", " + JSON.stringify(M.codes) + ")",
    M.netThird === "network" && M.fetchFailed === "network" && M.codes.every(Boolean) && M.notNet === false);
  ok("M3 online, today's rules are unchanged (" + [M.onlineNoAccount, M.onlineInteraction, M.onlineThird, M.onlineFirst].join(", ") + ")",
    M.onlineNoAccount === "redirect" && M.onlineInteraction === "redirect" && M.onlineThird === "redirect" && M.onlineFirst === "wait");

  // ---- R: failed attempts in the launch report ---------------------------------
  await page.evaluate(INSTALL);
  const R = await page.evaluate(async () => {
    __setLiveDataModeForTest("live");
    __setSplashTimingsForTest({ request: 150 });
    window.__sheetMode = "timeout";
    await ensureLiveNavDataFetch();
    window.__sheetMode = "notoken";
    window.acquireGraphToken = () => Promise.resolve(null);
    await ensureLiveNavDataFetch();
    window.acquireGraphToken = () => Promise.resolve("fake-token");
    window.__sheetMode = "timeout";
    __setSplashTimingsForTest({ request: 5000 });
    const p = ensureLiveNavDataFetch();
    await __wait(80);
    restartStartupFetches();
    await p;
    renderLoadReport();
    const notYet = (document.getElementById("docketLaunchReadLine") || {}).textContent || "";
    window.__sheetMode = "ok";
    __setSplashTimingsForTest(null);
    await ensureLiveNavDataFetch();
    const r = __getLoadReportForTest();
    return { failed: r.launch && r.launch.failedBefore, line: loadReportReadLine("Launch read", r.launch), notYet };
  });
  ok("R1 each failed attempt is kept with its duration and reason: timeout, auth, abandoned by Retry (" + JSON.stringify(R.failed) + ")",
    Array.isArray(R.failed) && R.failed.length === 3 && R.failed[0].reason === "timeout ×12" /* 12 launch sheets since (ar) */ && R.failed[0].wallMs >= 140 &&
    R.failed[1].reason === "auth (no token) ×12" && R.failed[2].reason === "abandoned by Retry");
  ok("R2 the launch line shows them and the launch total: " + R.line,
    /; before it 3 failed attempts: \d+\.\d s timeout ×12; \d+\.\d s auth \(no token\) ×12; \d+\.\d s abandoned by Retry; launch total \d+\.\d s$/.test(R.line));
  ok("R3 before the launch read lands, the Docket already lists them: " + R.notYet,
    /^Launch read: not finished yet; 3 failed attempts so far: /.test(R.notYet));

  // ---- T: save timing ----------------------------------------------------------
  await page.evaluate(INSTALL);
  const T = await page.evaluate(async (seed) => {
    __setWorkbookSessionForTest({ source: "workbook", verified: true, connection: "ok" }); // a checked session
    const mock = createMockGraphClient(seed);
    __setGraphClientForTest(mock);
    __setBrowseEditWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();
    const snap = await readAllRowWritableValues(2);
    await withEditSaveLock(() => saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap, { Remarks: "timed" }), snap), "Edit Coin AY-00001");
    const t = __getSaveTimingForTest().last;
    // Nested: the outer save owns the record.
    await withSaveTiming("outer", () => withSaveTiming("inner", async () => 1));
    const nested = __getSaveTimingForTest().last.label;
    __setGraphClientForTest(null);
    // The real client's $batch POSTs, timed one by one.
    await withSaveTiming("batches", () => RealGraphClient.patchWorkbookRanges(writePaths().workbook, "All",
      Array.from({ length: 25 }, (_, i) => ({ address: "A" + (i + 2), values: [["v"]], _columns: [i === 24 ? "LastModified" : "Remarks"] }))));
    const b = __getSaveTimingForTest().last;
    // Shown on the Docket.
    __setLiveDataModeForTest("live");
    lastSaveTiming = t;
    navigate("needsdbcoins");
    await __wait(30);
    const line = (document.getElementById("docketLastSaveLine") || {}).textContent || "";
    const steps = [...document.querySelectorAll("#docketLoadReport details")].find(d => /Save steps/.test(d.querySelector("summary").textContent));
    __setBrowseEditWriteEnabledForTest(null);
    return { label: t.label, outcome: t.outcome, total: t.totalMs, names: t.steps.map(s => s.name), nested,
      batchNames: b.steps.map(s => s.name), line, stepItems: steps ? steps.querySelectorAll("li").length : 0 };
  }, allSeed());
  const has = (re) => T.names.some(n => re.test(n));
  ok("T1 the save's named steps are timed (" + JSON.stringify(T.names) + ")",
    has(/^header re-read$/) && has(/^row lookup$/) && has(/^row re-read for the conflict check$/) && has(/^build the cell edits$/) &&
    has(/^write \(\d+ ranges, LastModified last\)$/) && T.outcome === "saved" && typeof T.total === "number");
  ok("T2 ...and so is every Graph call inside it", has(/^Graph readTableHeaderRow AllCoins$/) && has(/^Graph patchWorkbookRanges All \d+ ranges$/));
  ok("T3 a nested save does not replace the outer record (" + T.nested + ")", T.nested === "outer");
  // (ax) Stage 1 added the text-date check, the token, each answer's read
  // and the three main-thread / background lines to the same list; the
  // $batch POST lines themselves are unchanged and still checked exactly.
  const posts = T.batchNames.filter(n => /^\$batch \d+ of \d+: \d+ range writes/.test(n));
  ok("T4 each $batch POST is timed, the one carrying LastModified named (" + JSON.stringify(T.batchNames) + ")",
    posts.length === 2 && posts[0] === "$batch 1 of 2: 20 range writes" && posts[1] === "$batch 2 of 2: 5 range writes (includes LastModified)" &&
    T.batchNames.includes("text-date check") && T.batchNames.some(n => /^token \(/.test(n)) &&
    T.batchNames.includes("$batch 1 of 2: reading the answer") && T.batchNames.includes("$batch 2 of 2: reading the answer") &&
    T.batchNames.includes("main thread: longest stall (heartbeat late)") && T.batchNames.some(n => /^background work during the save: /.test(n)));
  ok("T5 the Docket shows the last save and its steps: " + T.line,
    /^Last save \(\d\d:\d\d:\d\d, Edit Coin AY-00001\): \d+\.\d s, saved, \d+ steps$/.test(T.line) && T.stepItems === T.names.length);

  // ---- T6-T8: the outcome says what happened (Ray's B3) ---------------------------
  const T6 = await page.evaluate(async (seed) => {
    __setWorkbookSessionForTest({ source: "workbook", verified: true, connection: "ok" });
    const mock = createMockGraphClient(seed);
    __setGraphClientForTest(mock);
    __setBrowseEditWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();
    const snap = await readAllRowWritableValues(2);
    const out = {};
    // Refused: the row changed since the form opened (Ray's case).
    mock._grids.All[1][mock._grids.All[0].indexOf("Remarks")] = "changed by Copilot";
    await withEditSaveLock(() => saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap, { Cost: 9 }), snap), "Edit Coin AY-00001");
    out.conflict = __getSaveTimingForTest().last;
    // Refused: read-only.
    __setWorkbookSessionForTest({ connection: "offline" });
    const snap2 = await readAllRowWritableValues(2);
    await withEditSaveLock(() => saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap2, { Cost: 9 }), snap2), "Edit Coin AY-00001");
    out.offline = __getSaveTimingForTest().last.outcome;
    __setWorkbookSessionForTest({ connection: "ok" });
    // Partly saved: the second $batch chunk fails.
    const real = mock.patchWorkbookRanges;
    mock.patchWorkbookRanges = () => { const e = new Error("boom"); e.landed = [0]; return Promise.reject(e); };
    await withEditSaveLock(() => saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap2, { Cost: 11, Grade: "MS-65" }), snap2), "Edit Coin AY-00001");
    out.partial = __getSaveTimingForTest().last.outcome;
    mock.patchWorkbookRanges = real;
    // Nothing reported: says so instead of claiming success.
    await withSaveTiming("silent", async () => undefined);
    out.silent = __getSaveTimingForTest().last.outcome;
    __setGraphClientForTest(null);
    __setBrowseEditWriteEnabledForTest(null);
    return { conflictOutcome: out.conflict.outcome, conflictSteps: out.conflict.steps.map(s => s.name), offline: out.offline, partial: out.partial, silent: out.silent };
  }, allSeed());
  ok("T6 a save refused by the conflict check says so, and no write step ran (" + JSON.stringify(T6.conflictOutcome) + ", " + JSON.stringify(T6.conflictSteps) + ")",
    T6.conflictOutcome === "refused (changed in the workbook: Remarks)" && !T6.conflictSteps.some(n => /^write /.test(n)) &&
    T6.conflictSteps.includes("row re-read for the conflict check"));
  ok("T7 read-only and part-landed saves say so (" + JSON.stringify([T6.offline, T6.partial]) + ")",
    T6.offline === "refused (read-only: Offline)" && /^partly saved \(/.test(T6.partial));
  ok("T8 a save that reports nothing never claims \"saved\" (" + T6.silent + ")", T6.silent === "finished (no outcome reported)");
});
