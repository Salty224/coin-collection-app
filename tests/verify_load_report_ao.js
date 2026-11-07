// (ao) Stage 1 — load report and workbook version probe (read-only).
//
// What it proves:
//   - every startup sheet read records how long it took and how many bytes
//     its body held (UTF-8 bytes, not characters);
//   - the full 11-sheet read produces a "Launch read" report (sheets, size,
//     wall time, slowest sheet, sheets not read), a refresh after a save is
//     reported separately, an attempt with no token is ignored, failed
//     attempts before the launch read are counted, and a read superseded by
//     Retry reports nothing;
//   - the Docket shows it just above the Build line, checks the workbook version
//     once on its own (live only), and "Check again" compares with the
//     previous check (CHANGED / same) and lists the checks;
//   - the version lookup is one OneDrive item GET (not an Excel request) on
//     the session's workbook, and NOTHING in this stage sends anything but
//     GETs;
//   - in the offline mockup the report is hidden and nothing is requested.
//
// Real MSAL can't load here, so the token (window.acquireGraphToken) and the
// network (window.fetch) are stubbed, the same technique as
// verify_startup_connection.js.

const { defineSuite } = require("./harness");

const INSTALL_FAKE = () => {
  splashConnectGeneration++; // stop the page's own splash loop
  __setSplashTimingsForTest(null);
  __setLiveCoinsForTest(null);
  LIVE_DB_SETS = null;
  liveNavDataFetchPromise = null;
  __resetLiveNavOptionalForTest();
  __resetLiveNavDataDiagnosticsForTest();
  __resetLoadReportForTest();
  __setLiveDataModeForTest(null);
  window.__fakeCalls = [];
  window.__realFetch = window.__realFetch || window.fetch;
  window.acquireGraphToken = () => Promise.resolve("fake-token");
  window.__version = { id: "ITEM1", eTag: "\"{AAA},5\"", cTag: "\"c:{AAA},4\"", size: 1843201, lastModifiedDateTime: "2026-11-06T14:32:05Z" };
  window.__versionMode = "ok";
  window.__sheetDelay = {};
  window.__sheetFail = {};
  const bodies = {
    All: [["CollectionID", "Year", "Denomination", "Notes"], ["AY-90001", 1909, "1C", "Café"], ["AY-90002", 1910, "5C", ""]],
    DB_Sets: [["SetID", "Lineage", "Description", "Year"], ["S-1", "Proof Set", "Test Proof Set", 1999]]
  };
  window.__bodies = bodies;
  window.fetch = (url, init) => {
    const u = String(url);
    const m = /worksheets\('([^']+)'\)/.exec(u);
    const isVersion = /\?\$select=id,eTag,cTag,size,lastModifiedDateTime$/.test(u);
    const key = m ? decodeURIComponent(m[1]) : (isVersion ? "version" : "other");
    window.__fakeCalls.push({ key, url: u, method: (init && init.method) || "GET" });
    if (key === "version") {
      if (window.__versionMode === "503") return Promise.resolve(new Response("{}", { status: 503 }));
      if (window.__versionMode === "hang") {
        return new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true }));
      }
      return Promise.resolve(new Response(JSON.stringify(window.__version), { status: 200 }));
    }
    if (!m) return new Promise(() => {});
    if (window.__sheetFail[key]) return Promise.resolve(new Response("{}", { status: window.__sheetFail[key] }));
    const body = JSON.stringify({ values: bodies[key] || [["Header"]] });
    const delay = window.__sheetDelay[key] || 0;
    return new Promise(r => setTimeout(() => r(new Response(body, { status: 200 })), delay));
  };
};

module.exports = defineSuite("load-report-ao", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);

  // ---- L1: per-sheet time and bytes -------------------------------------
  await page.evaluate(INSTALL_FAKE);
  const L1 = await page.evaluate(async () => {
    window.__sheetDelay.All = 120;
    const rows = await fetchWorkbookSheetRows("All");
    const d = __getLiveNavDataDiagnosticsForTest().All;
    const body = JSON.stringify({ values: window.__bodies.All });
    return { rowCount: rows && rows.length, d, chars: body.length, utf8: new TextEncoder().encode(body).length };
  });
  ok("L1 a sheet read still returns its rows (" + L1.rowCount + ")", L1.rowCount === 2);
  ok("L2 its diagnostic records the body size in UTF-8 bytes, not characters (" + JSON.stringify(L1.d) + ", chars " + L1.chars + ", bytes " + L1.utf8 + ")",
    L1.d && L1.d.kind === "ok" && L1.d.bytes === L1.utf8 && L1.utf8 === L1.chars + 1);
  ok("L3 ...and the time from request to body (" + (L1.d && L1.d.ms) + " ms against a 120 ms delay)",
    L1.d && typeof L1.d.ms === "number" && L1.d.ms >= 100 && L1.d.ms < 2000);

  // ---- L4: the launch read report -----------------------------------------
  await page.evaluate(INSTALL_FAKE);
  const L4 = await page.evaluate(async () => {
    window.__sheetDelay.DB_Coins = 200;
    window.__sheetFail.Photos = 500;
    const result = await ensureLiveNavDataFetch();
    const r = __getLoadReportForTest();
    const diag = __getLiveNavDataDiagnosticsForTest();
    const sum = FULL_READ_SHEETS.filter(n => n !== "Photos").reduce((n, s) => n + diag[s].bytes, 0);
    return { result, launch: r.launch, last: r.last, sum, coins: activeCoins().map(c => c.id),
      line: loadReportReadLine("Launch read", r.launch) };
  });
  ok("L4 the full read still loads the app's data (" + JSON.stringify(L4.coins) + ")", L4.result === true && L4.coins.includes("AY-90001"));
  ok("L5 it is reported as the launch read, all 11 sheets listed in order", L4.launch && L4.launch.reason === "launch" &&
    L4.launch.sheets.map(x => x.name).join() === "All,DB_Sets,DB_Coins,Lookup_MetalContent,Lookup_Graders,Photos,Receipts,Albums,Wishlist,Lookup_Errors,Lookup_Categories" &&
    L4.last === L4.launch);
  ok("L6 10 of 11 read, total bytes = the sum of the sheets read (" + (L4.launch && L4.launch.totalBytes) + " vs " + L4.sum + ")",
    L4.launch && L4.launch.okCount === 10 && L4.launch.totalBytes === L4.sum && L4.sum > 0);
  ok("L7 slowest is the delayed sheet, wall time at least its delay (" + JSON.stringify(L4.launch && L4.launch.slowest) + ", " + (L4.launch && L4.launch.wallMs) + " ms)",
    L4.launch && L4.launch.slowest && L4.launch.slowest.name === "DB_Coins" && L4.launch.wallMs >= 180);
  ok("L8 the line names counts, size, time, slowest and the sheet not read: " + L4.line,
    /^Launch read \(\d\d:\d\d:\d\d\): 10 of 11 sheets, \d+(\.\d)? KB, \d+\.\d s \(slowest DB_Coins \d+\.\d s\); not read: Photos HTTP 500$/.test(L4.line));

  // ---- L9: a refresh after a save is reported separately -------------------
  const L9 = await page.evaluate(async () => {
    window.__sheetFail = {};
    const before = __getLoadReportForTest().launch;
    await refreshLiveCoinsAfterWrite();
    const r = __getLoadReportForTest();
    return { sameLaunch: r.launch === before, lastReason: r.last && r.last.reason, lastOk: r.last && r.last.okCount };
  });
  ok("L9 a refresh after a save keeps the launch report and adds its own (" + JSON.stringify(L9) + ")",
    L9.sameLaunch && L9.lastReason === "refresh after a save" && L9.lastOk === 11);

  // ---- L10: no token, failed attempts, superseded --------------------------
  await page.evaluate(INSTALL_FAKE);
  const L10 = await page.evaluate(async () => {
    window.acquireGraphToken = () => Promise.resolve(null);
    const noToken = await ensureLiveNavDataFetch();
    const afterNoToken = __getLoadReportForTest();
    window.acquireGraphToken = () => Promise.resolve("fake-token");
    window.__sheetFail.All = 500;
    await ensureLiveNavDataFetch();
    const afterFail = __getLoadReportForTest();
    window.__sheetFail = {};
    await ensureLiveNavDataFetch();
    const afterOk = __getLoadReportForTest();
    return {
      noToken, noTokenLaunch: afterNoToken.launch, noTokenLast: afterNoToken.last,
      failLaunch: afterFail.launch, failReason: afterFail.last && afterFail.last.reason,
      okReason: afterOk.launch && afterOk.launch.reason, failedBefore: afterOk.launch && afterOk.launch.failedBefore && afterOk.launch.failedBefore.length,
      line: afterOk.launch ? loadReportReadLine("Launch read", afterOk.launch) : ""
    };
  });
  ok("L10 outside a live session a read with no token (the mockup, the sandbox) reports nothing", L10.noToken === false && L10.noTokenLaunch === null && L10.noTokenLast === null);
  ok("L11 a read whose core sheet failed is a failed attempt, not the launch read", L10.failLaunch === null && L10.failReason === "failed attempt");
  ok("L12 the next good read is the launch read and counts the attempt before it: " + L10.line,
    L10.okReason === "launch" && L10.failedBefore === 1 &&
    /; before it 1 failed attempt: \d+\.\d s HTTP 500 ×1; launch total \d+\.\d s$/.test(L10.line));

  await page.evaluate(INSTALL_FAKE);
  const L13 = await page.evaluate(async () => {
    window.__sheetDelay.All = 150;
    const p = ensureLiveNavDataFetch();
    liveNavFetchGeneration++; // what Retry does
    await p;
    return __getLoadReportForTest();
  });
  ok("L13 a read superseded by Retry reports nothing", L13.launch === null && L13.last === null);

  // ---- L14: the Docket shows it, checks the version once (live) ------------
  await page.evaluate(INSTALL_FAKE);
  const L14 = await page.evaluate(async () => {
    __setLiveDataModeForTest("live");
    await ensureLiveNavDataFetch();
    // (ao) Stage 2: a live full read asks for the version alongside the
    // sheets; the Docket's own automatic check is counted from here.
    const beforeDocket = window.__fakeCalls.filter(c => c.key === "version").length;
    navigate("needsdbcoins");
    const aboutBody = document.getElementById("docketAboutBody");
    const aboutCollapsed = aboutBody.classList.contains("hidden");
    document.getElementById("docketAboutHeader").click(); // the diagnostics live in the collapsed About section
    await new Promise(r => setTimeout(r, 50));
    if (workbookVersionCheckInFlight) await workbookVersionCheckInFlight;
    const el = document.getElementById("docketLoadReport");
    const build = document.getElementById("docketBuildLine");
    const versionCalls = window.__fakeCalls.filter(c => c.key === "version").slice(beforeDocket);
    return {
      readVersionCalls: beforeDocket,
      shown: el.style.display !== "none" && el.offsetParent !== null,
      aboveBuild: aboutBody.contains(el) && document.getElementById("docketAboutAccordion").nextElementSibling === build &&
        build.parentElement.lastElementChild === build && aboutCollapsed,
      launch: (document.getElementById("docketLaunchReadLine") || {}).textContent || "",
      version: (document.getElementById("docketVersionLine") || {}).textContent || "",
      btn: (document.getElementById("docketVersionCheckBtn") || {}).textContent || "",
      versionCalls: versionCalls.length, versionUrl: versionCalls[0] && versionCalls[0].url,
      perSheet: el.querySelectorAll("details li").length
    };
  });
  ok("L14 the report is in the Docket's About section (collapsed until opened), directly above the Build line, which stays last", L14.shown && L14.aboveBuild);
  ok("L15 it shows the launch read: " + L14.launch, /^Launch read \(\d\d:\d\d:\d\d\): 11 of 11 sheets, \d+(\.\d)? KB, \d+\.\d s \(slowest /.test(L14.launch));
  ok("L16 per-sheet detail lists all 11 sheets (" + L14.perSheet + ")", L14.perSheet === 11);
  ok("L17 the first Docket visit checked the version exactly once (" + L14.versionCalls + "; the full read itself asked " + L14.readVersionCalls + ")",
    L14.versionCalls === 1 && L14.readVersionCalls === 1);
  ok("L18 the lookup is one OneDrive item GET on the session's workbook, not an Excel request: " + L14.versionUrl,
    L14.versionUrl === "https://graph.microsoft.com/v1.0/me/drive/root:/CoinCollection/_Testing/CoinCollection%20(AI)%20COPY.xlsx?$select=id,eTag,cTag,size,lastModifiedDateTime");
  ok("L19 the version line shows last-changed, tag tails and size: " + L14.version,
    /^Workbook version: \d\d:\d\d:\d\d · last changed 6 Nov \d\d:\d\d:05 · eTag …AAA},5 · cTag …AAA},4 · size 1,843,201 · \d+\.\d s$/.test(L14.version) && L14.btn === "Check again");

  // ---- L20: Check again compares with the previous check -------------------
  const L20 = await page.evaluate(async () => {
    window.__version = Object.assign({}, window.__version, { eTag: "\"{AAA},6\"", lastModifiedDateTime: "2026-11-06T14:41:10Z" });
    document.getElementById("docketVersionCheckBtn").click();
    const busy = (document.getElementById("docketVersionCheckBtn") || {}).textContent;
    await workbookVersionCheckInFlight;
    const changedLine = document.getElementById("docketVersionLine").textContent;
    const el = document.getElementById("docketLoadReport");
    const hist = [...el.querySelectorAll("details")].find(d => /Version checks this session/.test(d.querySelector("summary").textContent));
    window.__version = Object.assign({}, window.__version);
    await checkWorkbookVersion();
    const same = __getLoadReportForTest().checks.slice(-1)[0];
    return {
      busy,
      version: changedLine,
      histSummary: hist ? hist.querySelector("summary").textContent : "",
      histItems: hist ? hist.querySelectorAll("li").length : 0,
      same,
      versionCalls: window.__fakeCalls.filter(c => c.key === "version").length
    };
  });
  ok("L20 the button says Checking… while a check is out (" + L20.busy + ")", L20.busy === "Checking…");
  ok("L21 a changed eTag and last-changed time are marked CHANGED, an unchanged cTag and size 'same': " + L20.version,
    /last changed 6 Nov \d\d:41:10 CHANGED · eTag …AAA},6 CHANGED · cTag …AAA},4 same · size 1,843,201 same · /.test(L20.version));
  ok("L22 the checks are listed newest first (" + L20.histSummary + ", " + L20.histItems + " items)", L20.histSummary === "Version checks this session (2)" && L20.histItems === 2);
  ok("L23 an unchanged version is 'same' on every field (" + JSON.stringify([L20.same.eTagChanged, L20.same.cTagChanged, L20.same.sizeChanged, L20.same.modifiedChanged]) + ")",
    L20.same.eTagChanged === false && L20.same.cTagChanged === false && L20.same.sizeChanged === false && L20.same.modifiedChanged === false && L20.versionCalls === 4);

  // ---- L24: failures -------------------------------------------------------
  const L24 = await page.evaluate(async () => {
    window.__versionMode = "503";
    const a = await checkWorkbookVersion();
    __setSplashTimingsForTest({ request: 200 });
    window.__versionMode = "hang";
    const b = await checkWorkbookVersion();
    __setSplashTimingsForTest(null);
    return { a, b, line: document.getElementById("docketVersionLine").textContent };
  });
  ok("L24 an HTTP error is reported as a failed check (" + JSON.stringify(L24.a) + ")", L24.a.ok === false && L24.a.reason === "HTTP 503");
  ok("L25 a lookup that never answers times out at the request deadline: " + L24.line, L24.b.ok === false && /check failed: timed out$/.test(L24.line));

  // ---- L26: nothing but GETs ------------------------------------------------
  const L26 = await page.evaluate(() => window.__fakeCalls.filter(c => c.method !== "GET").map(c => c.method + " " + c.url));
  ok("L26 nothing in this stage sent anything but a GET (" + JSON.stringify(L26) + ")", L26.length === 0);

  // ---- L27: the offline mockup ----------------------------------------------
  const page2 = await openApp(PHONE);
  const L27 = await page2.evaluate(async () => {
    window.__calls = [];
    const real = window.fetch;
    window.fetch = (u, i) => { window.__calls.push(String(u)); return real(u, i); };
    navigate("needsdbcoins");
    await new Promise(r => setTimeout(r, 100));
    const el = document.getElementById("docketLoadReport");
    return { mode: liveDataMode(), hidden: el.style.display === "none", text: el.textContent,
      versionCalls: window.__calls.filter(u => /lastModifiedDateTime/.test(u)).length };
  });
  ok("L27 in the offline mockup the report is hidden and no version lookup is sent (" + JSON.stringify(L27) + ")",
    L27.mode !== "live" && L27.hidden && L27.text === "" && L27.versionCalls === 0);

  // ---- L28-L31: the content-lag probe (Ray's B1) -------------------------------
  await page.evaluate(INSTALL_FAKE);
  const L28 = await page.evaluate(async () => {
    __setLiveDataModeForTest("live");
    __setLagProbeTimingsForTest({ every: 60, max: 5000 });
    const wait = ms => new Promise(r => setTimeout(r, ms));
    navigate("needsdbcoins");
    const btnText = () => (document.getElementById("docketLagProbeBtn") || {}).textContent;
    const idle = btnText();
    document.getElementById("docketLagProbeBtn").click();
    await wait(150);
    const running = btnText();
    // The file version moves first; the content follows two samples later.
    window.__version = Object.assign({}, window.__version, { eTag: "\"{AAA},9\"", lastModifiedDateTime: new Date(Date.now() - 1000).toISOString() });
    await wait(150);
    window.__bodies.All = window.__bodies.All.concat([["AY-00099", 1950, "1C", ""]]);
    for (let i = 0; i < 40 && !(__getLagProbeForTest() && __getLagProbeForTest().contentChangedAt); i++) await wait(50);
    await wait(100);
    const p = __getLagProbeForTest();
    const out = { idle, running, after: btnText(), summary: (document.getElementById("docketLagProbeLine") || {}).textContent || "",
      vAt: p.versionChangedAt, cAt: p.contentChangedAt, stillRunning: p.running,
      methods: window.__fakeCalls.filter(c => c.method !== "GET").length };
    __setLagProbeTimingsForTest(null);
    return out;
  });
  ok("L28 the probe starts and stops from the About section (" + JSON.stringify([L28.idle, L28.running, L28.after]) + ")",
    L28.idle === "Start content-lag probe" && L28.running === "Stop content-lag probe" && L28.after === "Start content-lag probe" && L28.stillRunning === false);
  ok("L29 it sees the version move first and the content later (" + (L28.cAt - L28.vAt) + " ms apart)", L28.vAt > 0 && L28.cAt > L28.vAt);
  ok("L30 the summary gives the content lag after the last-changed time: " + L28.summary,
    /version changed by \d\d:\d\d:\d\d \(workbook last changed .+\); content changed by \d\d:\d\d:\d\d: content lag at most \d+\.\d s after the last-changed time$/.test(L28.summary));
  ok("L31 the probe sends GETs only (" + L28.methods + " other requests)", L28.methods === 0);
});
