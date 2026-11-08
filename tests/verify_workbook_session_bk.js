// (bk) Workbook session (8 Nov 2026). Every Graph workbook request carries one
// Excel workbook session (createSession, persistChanges true, the
// `workbook-session-id` header, on every $batch sub-request too), so a write
// step's reads see the workbook its write lands on.
//
// The page's fetch is replaced by a small fake Graph. Its one modelling
// choice: while `lag` is on, a request WITHOUT a valid session reads the
// workbook as it was when the lag started, and a request WITH a valid
// session reads it as it is now (writes always land on "now"). That is the
// hypothesis Ray's TEST (a)-(e) checks on the real workbook; these checks
// prove the app sends the session everywhere it must, keeps every step's
// reads and write in one session, and falls back safely when it can't.
//
//   K1  source: every /workbook/ request goes through excelWorkbookFetch (createSession excepted)
//   K2  after launch a session is made in the background; a cold-launch read has none; a later background read has it
//   K3  a save makes a session at its start ("Excel session: created in N s"), and every read and EVERY $batch sub-request carries it
//   K4  two steps starting together make ONE createSession
//   K5  createSession fails (500): the save lands without a session; no new attempt during the cool-down; one after it
//   K5b a 202 or no answer in time: "none", the save still lands
//   K6  a session idle past the limit is replaced at the next step start ("created", new id, generation moves on)
//   K7  Graph rejects the session on a read: one new session, the read re-sent, the write refused before sending, the step reads again and lands ONCE
//   K8  rejected on the first range of the write: nothing landed, the step reads again and lands once
//   K8b rejected after a range landed: "partial", nothing re-sent
//   K9  the session changes again during the re-read: refused with "Try again", nothing written
//   K10 a step pinned to an earlier step's generation (Edit Coin's re-link) is refused once the session changed; nothing sent
//   K11 the (ax) step 6 case: a row inserted in Excel while reads lag; with the session the save writes the coin's (moved) row; without it, the wrong row
//   K12 Promote while reads lag: with the session it completes in one go (no "not showing yet"); without it, "not showing yet"
//   K13 Save then Save while reads lag (QA4): with the session no lag exception is needed; without, the exception is used; both land
//   K14 QA4: in the SAME session a read showing an earlier own state is compared as read (refused); without a session it is treated as lag
//   K15 an account change drops the session; the next step makes a new one
//   K16 Docket > About shows the session line
//   K17 a mock client (other suites): no session, no "Excel session" line
//   K18 no workbook write outside a write step in these flows; one outside IS counted and noted
//
// Negative controls (run by hand, 8 Nov 2026; docs/HISTORY.md (bk)).

const fs = require("fs");
const path = require("path");
const { defineSuite } = require("./harness");

const ALL = ["CollectionID", "CoinID", "Denomination", "Category", "Year", "MintMark", "Variety", "Description",
  "Finish", "Designation", "Grade", "GradeSource", "Cost", "Remarks", "Reviewed", "LastModified", "Status", "FaceValue"];
const MATCH_ROW = {
  denom: "1C", year: 1943, mint: "S", variety: "", description: "Lincoln Wheat",
  finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0,
  coinId: "C-1943-S-1C-01", composition: "Steel"
};
const READY_DRAFT = {
  type: "coin", version: 1, collectionID: "AY-00760",
  denom: "1C", year: "1943", mint: "S", variety: "", description: "Lincoln Wheat",
  finish: "Business Strike", category: "Coin", grade: "MS-66", gradeSource: "PCGS",
  coinId: "C-1943-S-1C-01", photos: [], allRowWritten: false, forceAdded: false
};

// Installed in the page: the fake Graph (window.__fg) and the setup helpers.
const INSTALL = (H) => {
  window.__ALL = H;
  const letters = (s) => s.split("").reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);
  const parseRange = (a) => {
    const m = /^(?:[^!]*!)?\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?$/.exec(a);
    return { c1: letters(m[1]), r1: +m[2], c2: letters(m[3] || m[1]), r2: +(m[4] || m[2]) };
  };
  const colName = (n) => { let s = ""; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  const json = (status, body) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  const sessionError = () => ({ error: { code: "InvalidSessionReCreatable", message: "The session specified in the request does not exist or is invalid." } });
  const fg = {
    grid: [], lagGrid: null, sessions: new Set(), next: 1, createMode: "ok",
    rejectReadsOn: new Set(), rejectBatchSub: null,
    calls: [], creates: 0, batches: 0, appliedBatches: 0,
    reset(grid) {
      fg.grid = grid.map(r => r.slice()); fg.lagGrid = null; fg.sessions = new Set(); fg.next = 1; fg.createMode = "ok";
      fg.rejectReadsOn = new Set(); fg.rejectBatchSub = null; fg.calls = []; fg.creates = 0; fg.batches = 0; fg.appliedBatches = 0;
    },
    startLag() { fg.lagGrid = fg.grid.map(r => r.slice()); },
    view(sid) { return fg.lagGrid && !(sid && fg.sessions.has(sid)) ? fg.lagGrid : fg.grid; },
    cell(g, r, c) { const row = g[r - 1]; return row && row[c - 1] !== undefined ? row[c - 1] : ""; },
    rangeOf(g, a) {
      const p = parseRange(a);
      const values = [];
      for (let r = p.r1; r <= p.r2; r++) { const row = []; for (let c = p.c1; c <= p.c2; c++) row.push(fg.cell(g, r, c)); values.push(row); }
      return { address: "All!" + a, values, formulas: values.map(r => r.slice()), numberFormat: values.map(r => r.map(() => "General")),
        text: values.map(r => r.map(v => String(v))) };
    },
    write(a, values) {
      const p = parseRange(a);
      for (let r = p.r1; r <= p.r2; r++) {
        while (fg.grid.length < r) fg.grid.push(fg.grid[0].map(() => ""));
        for (let c = p.c1; c <= p.c2; c++) fg.grid[r - 1][c - 1] = values[r - p.r1][c - p.c1];
      }
    },
    rowsWith(id) { return fg.grid.map((r, i) => ({ r, row: i + 1 })).filter(x => x.row > 1 && x.r[0] === id).map(x => x.row); },
    col(name) { return fg.grid[0].indexOf(name); }
  };
  window.__fg = fg;
  window.__realFetch = window.__realFetch || window.fetch;
  window.fetch = (url, init) => {
    const u = decodeURIComponent(String(url));
    const method = (init && init.method) || "GET";
    const h = (init && init.headers) || {};
    const sid = h["workbook-session-id"] || null;
    const call = { url: u, method, sid };
    fg.calls.push(call);
    if (/\/workbook\/createSession$/.test(u)) {
      call.kind = "create";
      fg.creates++;
      if (fg.createMode === "500") return json(500, { error: { code: "generalException" } });
      if (fg.createMode === "202") return json(202, {});
      if (fg.createMode === "hang") return new Promise((_, reject) => init.signal && init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true }));
      const id = "S" + (fg.next++);
      fg.sessions.add(id);
      call.made = id;
      return json(201, { id, persistChanges: true });
    }
    if (/\/v1\.0\/\$batch$/.test(u)) {
      call.kind = "batch";
      fg.batches++;
      const reqs = JSON.parse(init.body).requests;
      call.subSids = reqs.map(q => (q.headers || {})["workbook-session-id"] || null);
      const responses = [];
      let failed = false;
      reqs.forEach((q, i) => {
        if (failed) { responses.push({ id: q.id, status: 424, body: {} }); return; }
        const qsid = (q.headers || {})["workbook-session-id"];
        if (fg.rejectBatchSub === i || (qsid && !fg.sessions.has(qsid))) {
          if (qsid) fg.sessions.delete(qsid);
          responses.push({ id: q.id, status: 404, body: sessionError() }); failed = true; return;
        }
        const m = /range\(address='([^']+)'\)/.exec(decodeURIComponent(q.url));
        fg.write(m[1], q.body.values);
        responses.push({ id: q.id, status: 200, body: {} });
      });
      if (fg.rejectBatchSub !== null) fg.rejectBatchSub = null;
      if (!failed || responses.some(r => r.status === 200)) fg.appliedBatches++;
      return json(200, { responses });
    }
    if (sid && (!fg.sessions.has(sid) || fg.rejectReadsOn.has(sid))) {
      fg.sessions.delete(sid);
      call.kind = "rejected";
      return json(404, sessionError());
    }
    const g = fg.view(sid);
    let m;
    if (/tables\('AllCoins'\)\/headerRowRange/.test(u)) {
      call.kind = "header";
      return json(200, { address: "All!A1:" + colName(g[0].length) + "1", values: [g[0].slice()] });
    }
    if ((m = /tables\('AllCoins'\)\/columns\('([^']+)'\)/.exec(u))) {
      call.kind = "column";
      const c = g[0].indexOf(m[1]);
      return json(200, { values: g.map(r => [r[c] === undefined ? "" : r[c]]) });
    }
    if (/tables\('AllCoins'\)\/rows\/add/.test(u)) {
      call.kind = "add";
      fg.grid.push(fg.grid[0].map(() => ""));
      return json(201, { index: fg.grid.length - 2 });
    }
    if ((m = /worksheets\('All'\)\/range\(address='([^']+)'\)/.exec(u))) {
      call.kind = "range";
      return json(200, fg.rangeOf(g, m[1]));
    }
    if (/worksheets\('([^']+)'\)\/usedRange/.test(u)) {
      call.kind = "used";
      return json(200, { address: "All!A1", values: g.map(r => r.slice()) });
    }
    call.kind = "other";
    return json(404, { error: { code: "itemNotFound" } });
  };
  window.__coinRow = (id, remarks) => H.map(h => ({ CollectionID: id, CoinID: "C-1943-S-1C-01", Denomination: "1C", Category: "Coin",
    Year: 1943, MintMark: "S", Description: "Lincoln Wheat", Finish: "Business Strike", Grade: "MS-64", Cost: 5,
    Remarks: remarks || "", Status: "Owned" })[h] ?? "");
  window.__blank = () => H.map(() => "");
  // The workbook methods go to the REAL client (and so through the fake
  // fetch); Staging files stay on the mock.
  const WB = ["readWorkbookColumn", "readWorkbookRange", "readTableHeaderRow", "readWorkbookRangeDetail", "readRangeValuesAndText",
    "readUsedRangeDetail", "readTableColumn", "patchWorkbookRanges", "addTableRow"];
  window.__setup = (grid, o) => {
    o = o || {};
    fg.reset(grid);
    const mock = createMockGraphClient({});
    const hybrid = new Proxy(mock, { get(t, k) { return WB.indexOf(k) !== -1 ? RealGraphClient[k].bind(RealGraphClient) : t[k]; } });
    __setGraphClientForTest(hybrid);
    __setExcelSessionsApplyForTest(o.sessions !== false);
    __resetExcelSessionForTest();
    __setExcelSessionTimingsForTest(Object.assign({ idle: 60000, timeout: 2000, cooldown: 60000 }, o.timings || {}));
    if (o.sessions === false) fg.createMode = "500";
    __resetAllHeaderMapForTest();
    __resetSheetHeaderMapsForTest();
    __setWorkbookSessionForTest({ source: "workbook", verified: true, connection: "ok" });
    __setBrowseEditWriteEnabledForTest(true);
    __setAddCoinWriteEnabledForTest(true);
    __setWorkbookCacheForTest({ account: "acct-1" });
    window.acquireGraphToken = () => Promise.resolve("fake-token");
    return mock;
  };
  window.__teardown = () => {
    __setGraphClientForTest(null);
    __setExcelSessionsApplyForTest(false);
    __setExcelSessionTimingsForTest(null);
    __resetAllHeaderMapForTest();
    __setBrowseEditWriteEnabledForTest(null);
    __setAddCoinWriteEnabledForTest(null);
    __setLiveDbCoinsForTest(null);
    __setLiveDataModeForTest(null);
    __setWorkbookCacheForTest({ account: undefined });
  };
  // One timed top-level field save, like Edit Coin's (snapshot read first).
  window.__save = async (id, patch, opts) => {
    const snap = (opts && opts.snapshot) || await readAllRowWritableValues(await findAllSheetRowNumber(id));
    const r = await withSaveTiming("Edit Coin " + id, () => saveCoinRowToWorkbook(id, Object.assign({}, snap, patch), snap, opts && opts.saveOpts));
    return { ok: r.ok, reason: r.reason, message: r.message, row: r.rowNumber, values: r.values,
      steps: __getSaveTimingForTest().last.steps.map(s => s.name) };
  };
  window.__wait = (ms) => new Promise(r => setTimeout(r, ms));
};

module.exports = defineSuite("workbook-session-bk", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check;
  selfCheck(ok);

  // ---- K1: source ---------------------------------------------------------
  const src = fs.readFileSync(path.resolve(__dirname, "..", "app.html"), "utf8");
  const sites = [];
  let at = src.indexOf(":/workbook/");
  while (at !== -1) {
    const win = src.slice(at, at + 1200);
    const m = /(excelWorkbookFetch|postCreateSession|[^.\w]fetch)\(/.exec(win);
    // patchWorkbookRanges builds sub-request URLs (`const base = ...`) for a
    // $batch POST: there the session must be on every sub-request (K3).
    const batchBase = /const base = "\/me\/drive\/root:\/"\s*\+\s*$/.test(src.slice(Math.max(0, at - 200), at).replace(/graphEncodePath\(workbookPath\)\s*\+\s*"?$/, ""));
    sites.push(batchBase ? "batch" : m ? m[1].trim() : "none");
    at = src.indexOf(":/workbook/", at + 1);
  }
  const bare = sites.filter(s => ["excelWorkbookFetch", "postCreateSession", "batch"].indexOf(s) === -1);
  const pwr = src.slice(src.indexOf("    async patchWorkbookRanges("), src.indexOf("    async patchWorkbookRanges(") + 4000);
  ok("K1 every /workbook/ request goes through excelWorkbookFetch (createSession through postCreateSession; $batch sub-requests carry the id): " + JSON.stringify(sites),
    sites.length >= 11 && bare.length === 0 && sites.filter(s => s === "postCreateSession").length === 1 &&
    sites.filter(s => s === "batch").length === 1 && /"workbook-session-id": sid/.test(pwr));

  const page = await openApp(PHONE);
  await page.evaluate(INSTALL, ALL);

  // ---- K2: after launch ---------------------------------------------------
  const K2 = await page.evaluate(async () => {
    __setup([__ALL.slice(), __coinRow("AY-00001")]);
    __setLiveDataModeForTest("live");
    await fetchWorkbookSheetRows("All");
    const cold = __fg.calls.filter(c => c.kind === "used").map(c => c.sid);
    startExcelSessionAfterLaunch();
    await __wait(50);
    const creates = __fg.creates;
    await fetchWorkbookSheetRows("All");
    const later = __fg.calls.filter(c => c.kind === "used").map(c => c.sid);
    // An idle session is not used by a background read.
    __setExcelSessionTimingsForTest({ idle: 1, timeout: 2000, cooldown: 60000 });
    await __wait(10);
    await fetchWorkbookSheetRows("All");
    const idle = __fg.calls.filter(c => c.kind === "used").map(c => c.sid);
    __teardown();
    return { cold, creates, later, idle };
  });
  ok("K2 the cold-launch read has no session; after launch ONE session is made in the background; a later background read carries it, an idle one is not used: " + JSON.stringify(K2),
    K2.cold.length === 1 && K2.cold[0] === null && K2.creates === 1 && K2.later[1] === "S1" && K2.idle[2] === null);

  // ---- K3: a save makes a session and carries it everywhere ---------------
  const K3 = await page.evaluate(async () => {
    __setup([__ALL.slice(), __coinRow("AY-00001", "old")]);
    __fg.calls = [];
    const r = await __save("AY-00001", { Remarks: "new" });
    const inSave = __fg.calls.slice(__fg.calls.findIndex(c => c.kind === "create"));
    const reads = inSave.filter(c => ["header", "column", "range"].indexOf(c.kind) !== -1).map(c => c.sid);
    const batch = inSave.find(c => c.kind === "batch");
    const out = { ok: r.ok, steps: r.steps.filter(n => /Excel session/.test(n)), reads, subSids: batch && batch.subSids,
      remarks: __fg.grid[1][__fg.col("Remarks")], creates: __fg.creates };
    __teardown();
    return out;
  });
  ok("K3 a save makes the session at its start (Save steps \"Excel session: created in N s\"), and every read and EVERY $batch sub-request carries it: " + JSON.stringify(K3),
    K3.ok && K3.remarks === "new" && K3.creates === 1 && K3.steps.length === 1 && /^Excel session: created in [\d.]+ s/.test(K3.steps[0]) &&
    K3.reads.length >= 3 && K3.reads.every(s => s === "S1") && K3.subSids && K3.subSids.length >= 2 && K3.subSids.every(s => s === "S1"));

  // ---- K4: one createSession for two callers ------------------------------
  const K4 = await page.evaluate(async () => {
    __setup([__ALL.slice(), __coinRow("AY-00001")]);
    const both = await Promise.all([prepareExcelSessionForStep("a"), prepareExcelSessionForStep("b")]);
    const out = { creates: __fg.creates, outcomes: both.map(b => b.outcome) };
    __teardown();
    return out;
  });
  ok("K4 two steps starting together make ONE createSession: " + JSON.stringify(K4), K4.creates === 1 && K4.outcomes.every(o => o === "created"));

  // ---- K5: createSession fails --------------------------------------------
  const K5 = await page.evaluate(async () => {
    __setup([__ALL.slice(), __coinRow("AY-00001", "old")], { timings: { cooldown: 300 } });
    __fg.createMode = "500";
    const a = await __save("AY-00001", { Remarks: "a" });
    const batchA = __fg.calls.filter(c => c.kind === "batch").pop();
    const createsA = __fg.creates;
    const b = await __save("AY-00001", { Remarks: "b" }, { snapshot: a.values });
    const createsB = __fg.creates;
    __fg.createMode = "ok";
    await __wait(350);
    const c = await __save("AY-00001", { Remarks: "c" }, { snapshot: b.values });
    const out = { a: [a.ok, a.steps.filter(n => /Excel session/.test(n))], subA: batchA.subSids, createsA, createsB,
      b: [b.ok, b.steps.filter(n => /Excel session/.test(n))], c: [c.ok, c.steps.filter(n => /Excel session/.test(n))], creates: __fg.creates,
      remarks: __fg.grid[1][__fg.col("Remarks")] };
    __teardown();
    return out;
  });
  ok("K5 createSession fails (500): the save lands without a session; the next save in the cool-down tries no createSession; one after it does: " + JSON.stringify(K5),
    K5.a[0] && /^Excel session: none \(HTTP 500\)/.test(K5.a[1][0]) && K5.subA.every(s => s === null) && K5.createsA === 1 &&
    K5.b[0] && K5.createsB === 1 && /^Excel session: none \(waiting after a failed attempt/.test(K5.b[1][0]) &&
    K5.c[0] && /^Excel session: created/.test(K5.c[1][0]) && K5.creates === 2 && K5.remarks === "c");

  const K5b = await page.evaluate(async () => {
    __setup([__ALL.slice(), __coinRow("AY-00001", "old")], { timings: { timeout: 150 } });
    __fg.createMode = "202";
    const a = await __save("AY-00001", { Remarks: "a" });
    __resetExcelSessionForTest();
    __fg.createMode = "hang";
    const t0 = Date.now();
    const b = await __save("AY-00001", { Remarks: "b" }, { snapshot: a.values });
    const out = { a: [a.ok, a.steps.filter(n => /Excel session/.test(n))], b: [b.ok, b.steps.filter(n => /Excel session/.test(n))],
      ms: Date.now() - t0, remarks: __fg.grid[1][__fg.col("Remarks")] };
    __teardown();
    return out;
  });
  ok("K5b a 202 or no answer in time: \"none\", and the save still lands: " + JSON.stringify(K5b),
    K5b.a[0] && /^Excel session: none \(Graph answered 202/.test(K5b.a[1][0]) &&
    K5b.b[0] && /^Excel session: none \(no answer in/.test(K5b.b[1][0]) && K5b.remarks === "b" && K5b.ms < 2000);

  // ---- K6: idle renewal ---------------------------------------------------
  const K6 = await page.evaluate(async () => {
    __setup([__ALL.slice(), __coinRow("AY-00001", "old")], { timings: { idle: 200 } });
    const a = await __save("AY-00001", { Remarks: "a" });
    const g1 = __getExcelSessionForTest().generation;
    const b = await __save("AY-00001", { Remarks: "b" }, { snapshot: a.values });
    await __wait(260);
    const c = await __save("AY-00001", { Remarks: "c" }, { snapshot: b.values });
    const s = __getExcelSessionForTest();
    const lastBatch = __fg.calls.filter(x => x.kind === "batch").pop();
    const out = { a: a.steps.filter(n => /Excel session/.test(n))[0], b: b.steps.filter(n => /Excel session/.test(n))[0],
      c: c.steps.filter(n => /Excel session/.test(n))[0], id: s.id, genMoved: s.generation > g1, sub: lastBatch.subSids,
      events: s.events.map(e => e.text), ok: [a.ok, b.ok, c.ok] };
    __teardown();
    return out;
  });
  ok("K6 a session idle past the limit is replaced at the next step start (\"created\", a new id, the generation moves on): " + JSON.stringify(K6),
    K6.ok.every(Boolean) && /^Excel session: created/.test(K6.a) && /^Excel session: reused/.test(K6.b) && /^Excel session: created/.test(K6.c) &&
    K6.id === "S2" && K6.genMoved && K6.sub.every(s => s === "S2") && K6.events.some(t => /^dropped: idle/.test(t)));

  // ---- K7: rejected on a read ----------------------------------------------
  const K7 = await page.evaluate(async () => {
    __setup([__ALL.slice(), __coinRow("AY-00001", "old")]);
    const a = await __save("AY-00001", { Remarks: "a" });
    __fg.rejectReadsOn.add("S1");
    const batchesBefore = __fg.batches;
    const b = await __save("AY-00001", { Remarks: "b" }, { snapshot: a.values });
    const out = { ok: b.ok, steps: b.steps.filter(n => /session/i.test(n)), creates: __fg.creates, batches: __fg.batches - batchesBefore,
      sub: __fg.calls.filter(c => c.kind === "batch").pop().subSids, remarks: __fg.grid[1][__fg.col("Remarks")] };
    __teardown();
    return out;
  });
  ok("K7 Graph rejects the session on a read: ONE new session, the read re-sent, the write refused before sending, the step reads again and lands once: " + JSON.stringify(K7),
    K7.ok && K7.remarks === "b" && K7.creates === 2 && K7.batches === 1 && K7.sub.every(s => s === "S2") &&
    K7.steps.some(n => /^Excel session rejected by Graph \(InvalidSessionReCreatable\): read again/.test(n)) &&
    K7.steps.some(n => /^workbook session changed after field save AY-00001 read the workbook/.test(n)) &&
    K7.steps.some(n => /^the workbook session changed before anything was written: field save AY-00001 reads again/.test(n)));

  // ---- K8: rejected on the write --------------------------------------------
  const K8 = await page.evaluate(async () => {
    __setup([__ALL.slice(), __coinRow("AY-00001", "old")]);
    const a = await __save("AY-00001", { Remarks: "a" });
    __fg.rejectBatchSub = 0;
    const before = __fg.batches;
    const b = await __save("AY-00001", { Remarks: "b" }, { snapshot: a.values });
    const out = { ok: b.ok, batches: __fg.batches - before, applied: __fg.appliedBatches, remarks: __fg.grid[1][__fg.col("Remarks")],
      steps: b.steps.filter(n => /session/i.test(n)), creates: __fg.creates };
    // K8b: rejected after a range landed.
    __fg.rejectBatchSub = 1;
    const before2 = __fg.batches;
    const c = await __save("AY-00001", { Remarks: "c" }, { snapshot: Object.assign({}, a.values, { Remarks: "b" }) });
    out.b2 = { ok: c.ok, reason: c.reason, batches: __fg.batches - before2, remarks: __fg.grid[1][__fg.col("Remarks")] };
    __teardown();
    return out;
  });
  ok("K8 Graph rejects the session on the first range of the write: nothing landed, the step reads again and lands once: " + JSON.stringify(K8),
    K8.ok && K8.remarks === "b" && K8.batches === 2 && K8.creates === 2 &&
    K8.steps.some(n => /^Excel session rejected by Graph \(InvalidSessionReCreatable\): nothing written/.test(n)) &&
    K8.steps.some(n => /reads again/.test(n)));
  ok("K8b rejected after a range landed: reported as partly written, nothing re-sent: " + JSON.stringify(K8.b2),
    K8.b2.ok === false && K8.b2.reason === "partial" && K8.b2.batches === 1);

  // ---- K9: changes again during the re-read ----------------------------------
  const K9 = await page.evaluate(async () => {
    __setup([__ALL.slice(), __coinRow("AY-00001", "old")]);
    const a = await __save("AY-00001", { Remarks: "a" });
    ["S1", "S2", "S3", "S4", "S5", "S6"].forEach(id => __fg.rejectReadsOn.add(id)); // every new session is rejected too
    const before = __fg.batches;
    const b = await __save("AY-00001", { Remarks: "b" }, { snapshot: a.values });
    const out = { ok: b.ok, message: b.message, batches: __fg.batches - before, remarks: __fg.grid[1][__fg.col("Remarks")] };
    __teardown();
    return out;
  });
  ok("K9 the session changes again during the re-read: refused with \"Try again\", nothing written: " + JSON.stringify(K9),
    K9.ok === false && /workbook session changed during this save .*Try again\./.test(K9.message) && K9.batches === 0 && K9.remarks === "a");

  // ---- K10: a pinned step -----------------------------------------------------
  const K10 = await page.evaluate(async () => {
    __setup([__ALL.slice(), __coinRow("AY-00001", "old")]);
    const a = await withSaveTiming("Edit Coin", () => saveCoinRowToWorkbook("AY-00001",
      Object.assign({}, { Remarks: "a" }), null));
    const pin = a.sessionGeneration;
    const same = await runWorkbookStep("re-link", () => writeCoinIdCell(2, "C-1943-S-1C-02"), { pinGeneration: pin }).then(() => "written", e => e.code);
    const before = __fg.batches;
    await prepareExcelSessionForStep("other"); // reused: nothing moves
    dropExcelSession("test"); // the session changes
    const moved = await runWorkbookStep("re-link", () => writeCoinIdCell(2, "C-1943-S-1C-03"), { pinGeneration: pin }).then(() => "written", e => e.code);
    const out = { same, moved, batches: __fg.batches - before, coinId: __fg.grid[1][__fg.col("CoinID")] };
    __teardown();
    return out;
  });
  ok("K10 a step pinned to the field save's generation (the re-link) writes while the session is the same, and is refused, nothing sent, once it changed: " + JSON.stringify(K10),
    K10.same === "written" && K10.moved === "SESSION_CHANGED" && K10.batches === 0 && K10.coinId === "C-1943-S-1C-02");

  // ---- K11: the (ax) step 6 case ------------------------------------------------
  const K11 = await page.evaluate(async () => {
    const run = async (sessions) => {
      __setup([__ALL.slice(), __coinRow("AY-00001", "one"), __coinRow("AY-00002", "two"), __blank(), __blank()], { sessions });
      const warm = await __save("AY-00002", { Remarks: "two-a" });
      const snapshot = warm.values;
      __fg.startLag();
      __fg.grid.splice(2, 0, __blank()); // Excel inserts a blank row above AY-00002: it moves to row 4
      const r = await __save("AY-00002", { Remarks: "two-b" }, { snapshot, saveOpts: { rowGuess: { rowNumber: 3, width: __ALL.length } } });
      const out = { ok: r.ok, row: r.row, row3: __fg.grid[2].filter(v => v !== "").length, rows: __fg.rowsWith("AY-00002"),
        remarks4: __fg.grid[3][__fg.col("Remarks")] };
      __teardown();
      return out;
    };
    return { withSession: await run(true), without: await run(false) };
  });
  ok("K11 (ax) step 6: a row inserted in Excel while reads lag; with the session the save writes AY-00002's moved row 4 and the inserted row stays blank: " + JSON.stringify(K11.withSession),
    K11.withSession.ok && K11.withSession.row === 4 && K11.withSession.row3 === 0 && K11.withSession.remarks4 === "two-b");
  ok("K11b ...and without a session (the fake's lag model) the same save writes into the inserted row 3, the failure (bk) is for: " + JSON.stringify(K11.without),
    K11.without.row === 3 && K11.without.row3 > 0);

  // ---- K12: Promote while reads lag ---------------------------------------------
  const K12 = await page.evaluate(async ({ row, draft }) => {
    const run = async (sessions) => {
      const mock = __setup([__ALL.slice(), __coinRow("AY-00001", "a"), __blank(), __blank(), __blank()], { sessions });
      __setLiveDbCoinsForTest([row]);
      await mock.uploadJson(writePaths().stagingBase + "/AY-00760/coin.json",
        Object.assign({}, draft, { status: COIN_DRAFT_STATUS.READY, createdDate: new Date().toISOString() }));
      __fg.startLag();
      const r = await withSaveTiming("Promote AY-00760", () => promoteCoinDraftToAllSheet("AY-00760"));
      const rows = __fg.rowsWith("AY-00760");
      const out = { ok: r.ok, message: r.message, rows, grade: rows.length ? __fg.grid[rows[0] - 1][__fg.col("Grade")] : null,
        notShowing: __getSaveTimingForTest().last.steps.some(s => /not showing AY-00760 yet/.test(s.name)) };
      __teardown();
      return out;
    };
    return { withSession: await run(true), without: await run(false) };
  }, { row: MATCH_ROW, draft: READY_DRAFT });
  ok("K12 Promote while reads lag, with the session: keys and data on one row in one go, no \"not showing yet\": " + JSON.stringify(K12.withSession),
    K12.withSession.ok === true && K12.withSession.rows.length === 1 && K12.withSession.grade === "MS-66" && !K12.withSession.notShowing);
  ok("K12b ...without a session (the fake's lag model): \"not showing yet\", keys only (as (ax) C'): " + JSON.stringify(K12.without),
    K12.without.ok === false && K12.without.notShowing && K12.without.rows.length === 1);

  // ---- K13 / K14: Save then Save, QA4 ----------------------------------------------
  const K13 = await page.evaluate(async () => {
    const run = async (sessions) => {
      __setup([__ALL.slice(), __coinRow("AY-00001", "old")], { sessions });
      const snap = await readAllRowWritableValues(2);
      __fg.startLag(); // reads without a session now show the row as it was before save "a"
      const a = await __save("AY-00001", { Remarks: "a" }, { snapshot: snap });
      const b = await __save("AY-00001", { Remarks: "b" }, { snapshot: a.values });
      const out = { ok: b.ok, lagNote: b.steps.some(n => /Excel hasn't caught up/.test(n)), remarks: __fg.grid[1][__fg.col("Remarks")] };
      __teardown();
      return out;
    };
    return { withSession: await run(true), without: await run(false) };
  });
  ok("K13 Save then Save while reads lag (QA4): with the session the second save lands with no lag exception; without one it lands through the exception: " + JSON.stringify(K13),
    K13.withSession.ok && !K13.withSession.lagNote && K13.withSession.remarks === "b" &&
    K13.without.ok && K13.without.lagNote && K13.without.remarks === "b");

  const K14 = await page.evaluate(async () => {
    const run = async (sessions) => {
      __setup([__ALL.slice(), __coinRow("AY-00001", "old")], { sessions });
      const before = __fg.grid[1].slice();
      const a = await __save("AY-00001", { Remarks: "a" });
      // Someone puts the row back exactly as it was before the app's save
      // (an Excel undo or version restore), with no read lag at all.
      __fg.grid[1] = before.slice();
      const b = await __save("AY-00001", { Remarks: "b" }, { snapshot: a.values });
      const out = { ok: b.ok, reason: b.reason, remarks: __fg.grid[1][__fg.col("Remarks")], lagNote: b.steps.some(n => /Excel hasn't caught up/.test(n)) };
      __teardown();
      return out;
    };
    return { withSession: await run(true), without: await run(false) };
  });
  ok("K14 QA4: in the SAME session a read showing the app's earlier state is compared as read: refused, the restore kept: " + JSON.stringify(K14.withSession),
    K14.withSession.ok === false && K14.withSession.reason === "conflict" && K14.withSession.remarks === "old" && !K14.withSession.lagNote);
  ok("K14b ...without a session it is still treated as Excel's delay (the (ax) Part 3 exception, kept for writes without a session): " + JSON.stringify(K14.without),
    K14.without.ok === true && K14.without.lagNote);

  // ---- K15: account change -----------------------------------------------------------
  const K15 = await page.evaluate(async () => {
    __setup([__ALL.slice(), __coinRow("AY-00001", "old")]);
    const a = await __save("AY-00001", { Remarks: "a" });
    __setWorkbookCacheForTest({ account: "acct-2" });
    const b = await __save("AY-00001", { Remarks: "b" }, { snapshot: a.values });
    const s = __getExcelSessionForTest();
    const out = { b: b.steps.filter(n => /Excel session/.test(n))[0], id: s.id, events: s.events.map(e => e.text), key: s.key };
    __teardown();
    return out;
  });
  ok("K15 an account change drops the session and the next step makes a new one for the new key: " + JSON.stringify(K15),
    /^Excel session: created/.test(K15.b) && K15.id === "S2" && K15.events.some(t => /^dropped: workbook or account changed/.test(t)) && /\|acct-2$/.test(K15.key));

  // ---- K16: Docket > About ---------------------------------------------------------------
  const K16 = await page.evaluate(async () => {
    __setup([__ALL.slice(), __coinRow("AY-00001", "old")]);
    await __save("AY-00001", { Remarks: "a" });
    __setLiveDataModeForTest("live");
    renderLoadReport();
    const line = (document.getElementById("docketExcelSessionLine") || {}).textContent || "";
    const steps = (document.getElementById("docketLoadReport") || {}).textContent || "";
    __teardown();
    return { line, hasStep: /Excel session: created in/.test(steps) };
  });
  ok("K16 Docket > About shows the session line and the Save steps line: " + JSON.stringify(K16),
    /^Excel session: held since \d\d:\d\d:\d\d \(made in [\d.]+ s\), last used \d+ s ago$/.test(K16.line) && K16.hasStep);

  // ---- K17: a plain mock client -------------------------------------------------------------
  const K17 = await page.evaluate(async () => {
    __resetExcelSessionForTest();
    const H = __ALL;
    const mock = createMockGraphClient({ sheets: { All: [H.slice(), __coinRow("AY-00001", "old")] } });
    __setGraphClientForTest(mock);
    __resetAllHeaderMapForTest();
    __setWorkbookSessionForTest({ source: "workbook", verified: true, connection: "ok" });
    __setBrowseEditWriteEnabledForTest(true);
    window.__fg.calls = [];
    const snap = await readAllRowWritableValues(2);
    const r = await withSaveTiming("Edit Coin", () => saveCoinRowToWorkbook("AY-00001", Object.assign({}, snap, { Remarks: "m" }), snap));
    const out = { ok: r.ok, lines: __getSaveTimingForTest().last.steps.filter(s => /Excel session/.test(s.name)).length,
      fetches: window.__fg.calls.length, outside: __workbookWritesOutsideStepForTest() };
    __teardown();
    return out;
  });
  ok("K17 a mock client (every other suite): no session, no request, no \"Excel session\" line, the write still inside a step: " + JSON.stringify(K17),
    K17.ok && K17.lines === 0 && K17.fetches === 0 && K17.outside === 0);

  // ---- K18: writes outside a step ---------------------------------------------------------------
  const K18 = await page.evaluate(async () => {
    const before = __workbookWritesOutsideStepForTest();
    __setup([__ALL.slice(), __coinRow("AY-00001", "old")]);
    await __save("AY-00001", { Remarks: "a" });
    const inSteps = __workbookWritesOutsideStepForTest();
    await withSaveTiming("bare", () => writeCoinIdCell(2, "C-1943-S-1C-09"));
    const after = __workbookWritesOutsideStepForTest();
    const note = __getSaveTimingForTest().last.steps.some(s => /^workbook write outside a write step \(no session check\)/.test(s.name));
    __teardown();
    return { before, inSteps, after, note };
  });
  ok("K18 a save's writes are inside a write step (none counted outside); a bare write IS counted and noted: " + JSON.stringify(K18),
    K18.inSteps === 0 && K18.after === 1 && K18.note);
});
