// The Add Coin Phase 2 promote path's write-safety guarantees.
//
// WHY THIS SUITE EXISTS. A live Promote against the _Testing copy wrote TWO
// rows for AY-00706: one holding the full coin, one holding nothing but the
// CollectionID and CoinID. Both calls reported success and nothing in the
// app could tell. Root-causing it turned up two independent defects in the
// same function, one of which needed no user error at all:
//
//   1. check-then-act — the "does a row already exist?" guard was read by
//      both submissions before either had written its keys, so both appended;
//   2. the write target was arithmetic on a read taken BEFORE the append, so
//      any row appended in between (a second promote, or Copilot working in
//      Excel) made the key write land on a DIFFERENT COIN'S ROW, overwriting
//      its CollectionID and CoinID. The old verify could not catch this: it
//      looked the id up and found it exactly where it had just been written.
//
// Both scenarios are reproduced here against the mock Graph client with real
// per-call latency, so a regression fails loudly rather than surfacing in the
// workbook a day later.

const { defineSuite } = require("./harness");

const ALL_HEADERS = [
  "CollectionID", "CoinID", "Denomination", "Category", "Year", "MintMark",
  "Variety", "Description", "Finish", "Designation", "Grade", "GradeSource",
  "SerNo", "CACBean", "Cost", "Shipping", "Total", "Seller_Link",
  "PurchaseDate", "SpotValue", "Value", "StorageLocation", "Container",
  "Remarks", "Reviewed", "LastModified", "Error"
];

const MATCH_ROW = {
  denom: "1C", year: 1943, mint: "S", variety: "", description: "Lincoln Wheat",
  finish: "Business Strike", designation: "", gsid: "", pcgs: "", mintage: 0,
  coinId: "C-1943-S-1C-01", composition: "Steel"
};

function seedMock() {
  return { sheets: { All: [ALL_HEADERS.slice(), ["AY-00001", "C-OLD", "$1", "", 1889, "CC"]] } };
}

const READY_DRAFT = {
  type: "coin", version: 1, collectionID: "AY-00706", status: "Ready",
  denom: "1C", year: "1943", mint: "S", variety: "", description: "Lincoln Wheat",
  finish: "Business Strike", grade: "MS-66", gradeSource: "PCGS",
  coinId: "C-1943-S-1C-01", photos: [], allRowWritten: false, forceAdded: false
};

module.exports = defineSuite("promote-race", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // Helpers installed page-side once; every block below reuses them.
  await page.evaluate(() => {
    // Wraps a mock client so every call takes real time, which is what makes
    // two concurrent promotes actually interleave rather than resolving in
    // one microtask drain.
    window.__slowClient = (mock, latencyMs) => {
      const slow = {};
      for (const k of Object.keys(mock)) {
        slow[k] = typeof mock[k] === "function"
          ? (...a) => new Promise(r => setTimeout(r, latencyMs)).then(() => mock[k](...a))
          : mock[k];
      }
      slow._grids = mock._grids;
      slow._store = mock._store;
      return slow;
    };
    window.__rowsFor = (grid, headers, id) => {
      const at = n => headers.indexOf(n);
      const out = [];
      for (let i = 1; i < grid.length; i++) {
        const r = grid[i];
        if (r && String(r[at("CollectionID")] || "").trim() === id) {
          out.push({
            sheetRow: i + 1,
            coinId: r[at("CoinID")],
            nonKeyPopulated: r.filter((v, c) =>
              c !== at("CollectionID") && c !== at("CoinID") &&
              v !== null && v !== undefined && v !== "").length
          });
        }
      }
      return out;
    };
    window.__teardown = () => {
      __setLiveDbCoinsForTest(null);
      __setAddCoinWriteEnabledForTest(null);
      __setGraphClientForTest(null);
      __resetAllHeaderMapForTest();
    };
  });

  // ---------- A. THE ORIGINAL BUG: two concurrent promotes ----------
  const A = await page.evaluate(async ({ seed, headers, row, draft }) => {
    const mock = createMockGraphClient(seed);
    const LAT = 12;
    __setGraphClientForTest(__slowClient(mock, LAT));
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([row]);
    __resetAllHeaderMapForTest();
    await mock.uploadJson(writePaths().stagingBase + "/AY-00706/coin.json",
      Object.assign({}, draft, { status: COIN_DRAFT_STATUS.READY, createdDate: new Date().toISOString() }));

    // The second click lands while the first is still in flight — exactly an
    // impatient re-click on a button that looked like it had done nothing.
    const p1 = promoteCoinDraftToAllSheet("AY-00706");
    await new Promise(r => setTimeout(r, LAT * 2 + 5));
    const p2 = promoteCoinDraftToAllSheet("AY-00706");
    const [r1, r2] = await Promise.all([p1, p2]);

    const grid = mock._grids.All;
    const out = {
      r1: { ok: r1.ok, rowNumber: r1.rowNumber, coalesced: !!r1.coalesced },
      r2: { ok: r2.ok, rowNumber: r2.rowNumber, coalesced: !!r2.coalesced },
      matches: __rowsFor(grid, headers, "AY-00706"),
      totalRows: grid.length
    };
    __teardown();
    return out;
  }, { seed: seedMock(), headers: ALL_HEADERS, row: MATCH_ROW, draft: READY_DRAFT });

  ok(A.matches.length === 1,
    "A1 THE BUG: two concurrent promotes produce exactly ONE row, not two — got " +
      A.matches.length + " (" + JSON.stringify(A.matches) + ")");
  ok(A.matches.length === 1 && A.matches[0].nonKeyPopulated > 0,
    "A2 -- and that row holds the coin's real data, not just its two key cells");
  ok(A.totalRows === 3,
    "A3 -- no stray blank row is left behind either (rows: " + A.totalRows + ")");
  ok(A.r1.ok === true && A.r1.coalesced === false,
    "A4 the first call performs the write and is not marked coalesced");
  ok(A.r2.ok === true && A.r2.coalesced === true && A.r2.rowNumber === A.r1.rowNumber,
    "A5 the second coalesces onto it — same row, reported as success rather than an error");

  // ---------- B. Coalescing suppresses the duplicate post-write chain ----------
  const B = await page.evaluate(async ({ seed, row, draft }) => {
    const mock = createMockGraphClient(seed);
    const LAT = 10;
    __setGraphClientForTest(__slowClient(mock, LAT));
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([row]);
    __resetAllHeaderMapForTest();
    await mock.uploadJson(writePaths().stagingBase + "/AY-00706/coin.json",
      Object.assign({}, draft, { status: COIN_DRAFT_STATUS.READY, createdDate: new Date().toISOString() }));

    const toasts = [];
    const realToast = window.showToast;
    window.showToast = (m) => { toasts.push(String(m)); };
    try {
      const p1 = promoteCoinDraft("AY-00706");
      await new Promise(r => setTimeout(r, LAT * 2 + 5));
      const p2 = promoteCoinDraft("AY-00706");
      await Promise.all([p1, p2]);
    } finally { window.showToast = realToast; }

    const out = { written: toasts.filter(t => /written to the All sheet/.test(t)).length, toasts };
    __teardown();
    return out;
  }, { seed: seedMock(), row: MATCH_ROW, draft: READY_DRAFT });

  ok(B.written === 1,
    "B1 a coalesced promote does NOT re-run the post-write chain — exactly one success toast, not two (got " +
      B.written + ": " + JSON.stringify(B.toasts) + ")");

  // ---------- C. Success is reported BEFORE the slow follow-up chain ----------
  const C = await page.evaluate(async ({ seed, row, draft }) => {
    const mock = createMockGraphClient(seed);
    const events = [];
    // The first uploadJson of the whole operation can only come from
    // finishCoinDraftWrite() — promoteCoinDraftToAllSheet() never writes the
    // draft. So its position relative to the toast IS the ordering under test.
    const wrapped = Object.assign({}, mock, {
      uploadJson: (p, o) => { events.push("chain"); return mock.uploadJson(p, o); }
    });
    wrapped._grids = mock._grids;
    await mock.uploadJson(writePaths().stagingBase + "/AY-00706/coin.json",
      Object.assign({}, draft, { status: COIN_DRAFT_STATUS.READY, createdDate: new Date().toISOString() }));
    events.length = 0; // the seeding write above isn't part of the operation

    __setGraphClientForTest(wrapped);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([row]);
    __resetAllHeaderMapForTest();

    const realToast = window.showToast;
    window.showToast = (m) => { if (/written to the All sheet/.test(String(m))) events.push("toast"); };
    try { await promoteCoinDraft("AY-00706"); }
    finally { window.showToast = realToast; }

    __teardown();
    return { events, toastFirst: events.indexOf("toast") !== -1 && events.indexOf("toast") < events.indexOf("chain") };
  }, { seed: seedMock(), row: MATCH_ROW, draft: READY_DRAFT });

  ok(C.toastFirst,
    "C1 the success toast fires BEFORE the photo-move/refresh chain, not after ~10s of silence — order: " +
      JSON.stringify(C.events));

  // ---------- D. An external append can no longer clobber another coin ----------
  const D = await page.evaluate(async ({ seed, headers }) => {
    const mock = createMockGraphClient(seed);
    const LAT = 12;
    __setGraphClientForTest(__slowClient(mock, LAT));
    __setAddCoinWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();

    // No second click anywhere here: one promote, and Copilot appends a real
    // coin row in Excel while it is mid-flight.
    const pending = createAllSheetRow("AY-00706", "C-1943-S-1C-01");
    await new Promise(r => setTimeout(r, LAT + 4));
    mock._grids.All.push(["AY-99999", "C-EXTERNAL", "25C", "", 1932, "D"]);

    let verified = null, err = null;
    try { verified = await pending; } catch (e) { err = String(e && e.message || e); }

    const grid = mock._grids.All;
    const at = n => headers.indexOf(n);
    const out = {
      verified, err,
      externalIntact: grid.some(r =>
        String(r[at("CollectionID")] || "") === "AY-99999" && String(r[at("CoinID")] || "") === "C-EXTERNAL"),
      ourRows: __rowsFor(grid, headers, "AY-00706")
    };
    __teardown();
    return out;
  }, { seed: seedMock(), headers: ALL_HEADERS });

  ok(D.externalIntact,
    "D1 THE SILENT ONE: a row appended externally mid-write keeps its own CollectionID and CoinID — " +
      "the key write no longer lands on top of it");
  ok(D.ourRows.length === 1 && D.ourRows[0].sheetRow === D.verified,
    "D2 -- and the new coin claims its own genuinely-new row, verified before any data is written");

  // ---------- E. It refuses rather than clobbering when no blank row exists ----------
  const E = await page.evaluate(async ({ seed, headers }) => {
    const mock = createMockGraphClient(seed);
    // A client whose append is a no-op: nothing blank is ever created, so
    // every candidate row is occupied. Stands in for any future state where
    // the index arithmetic and the table disagree — the point is what the
    // layer does when it cannot prove a row is free.
    const noAppend = Object.assign({}, mock, {
      addTableRow: () => Promise.resolve({ index: mock._grids.All.length - 2 })
    });
    noAppend._grids = mock._grids;
    __setGraphClientForTest(noAppend);
    __setAddCoinWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();

    const before = JSON.stringify(mock._grids.All);
    let err = null;
    try { await createAllSheetRow("AY-00706", "C-1943-S-1C-01"); }
    catch (e) { err = String(e && e.message || e); }
    const out = { err, gridUnchanged: JSON.stringify(mock._grids.All) === before };
    __teardown();
    return out;
  }, { seed: seedMock(), headers: ALL_HEADERS });

  ok(E.err && /no blank row/i.test(E.err),
    "E1 with no blank row to claim it throws instead of writing over an occupied one: " + E.err);
  ok(E.gridUnchanged,
    "E2 -- and leaves every existing cell exactly as it found it");

  // ---------- F. Tripwire: the id already being on the sheet ----------
  const F = await page.evaluate(async ({ seed, headers }) => {
    const s = JSON.parse(JSON.stringify(seed));
    s.sheets.All.push(["AY-00706", "C-EXISTING", "1C", "", 1943, "S"]);
    const mock = createMockGraphClient(s);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();
    let err = null;
    try { await createAllSheetRow("AY-00706", "C-1943-S-1C-01"); }
    catch (e) { err = String(e && e.message || e); }
    const out = {
      err,
      originalKept: __rowsFor(mock._grids.All, headers, "AY-00706")
        .some(r => r.coinId === "C-EXISTING")
    };
    __teardown();
    return out;
  }, { seed: seedMock(), headers: ALL_HEADERS });

  ok(F.err && /already appears/i.test(F.err),
    "F1 a CollectionID that turned up on the sheet underneath the write is reported, not written over: " + F.err);
  ok(F.originalKept, "F2 -- the row that was already there keeps its own CoinID");

  // ---------- G. The duplicate-aware lookup, and the untouched original ----------
  const G = await page.evaluate(async ({ seed }) => {
    const s = JSON.parse(JSON.stringify(seed));
    s.sheets.All.push(["AY-00706", "C-FIRST", "1C", "", 1943, "S"]);   // sheet row 3
    s.sheets.All.push(["AY-00002", "C-OTHER", "5C", "", 1943, "P"]);   // sheet row 4
    s.sheets.All.push(["AY-00706", "C-SECOND", "1C", "", 1943, "S"]);  // sheet row 5
    const mock = createMockGraphClient(s);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();
    const all = await findAllSheetRowNumbersFor("AY-00706");
    const first = await findAllSheetRowNumber("AY-00706");
    const none = await findAllSheetRowNumbersFor("AY-99999");
    const single = await findAllSheetRowNumbersFor("AY-00002");
    __teardown();
    return { all, first, none, single };
  }, { seed: seedMock() });

  ok(G.all.length === 2 && G.all[0] === 3 && G.all[1] === 5,
    "G1 findAllSheetRowNumbersFor() reports EVERY row carrying the id — " + JSON.stringify(G.all));
  ok(G.first === 3,
    "G2 findAllSheetRowNumber() is unchanged: still the first match, so Browse Edit's behaviour is untouched");
  ok(G.none.length === 0 && G.single.length === 1 && G.single[0] === 4,
    "G3 -- and it handles the absent and the ordinary single-match cases");

  // ---------- H. The pending-state helper ----------
  const H = await page.evaluate(async () => {
    const btn = document.createElement("button");
    btn.textContent = "Promote";
    document.body.appendChild(btn);

    let release;
    const gate = new Promise(r => { release = r; });
    let calls = 0;
    const op = () => { calls++; return gate; };

    const running = runWithButtonPending(btn, "Promoting…", op);
    const during = { disabled: btn.disabled, label: btn.textContent };

    // A repeat click while it is running must not start a second operation.
    await runWithButtonPending(btn, "Promoting…", op);
    const afterRepeat = { calls };

    release();
    await running;
    const after = { disabled: btn.disabled, label: btn.textContent };

    // A button removed by the re-render its own operation triggers must not
    // be resurrected by the finally block.
    const gone = document.createElement("button");
    gone.textContent = "Promote";
    document.body.appendChild(gone);
    await runWithButtonPending(gone, "Promoting…", async () => { gone.remove(); });

    btn.remove();
    return { during, afterRepeat, after, detachedStillDisabled: gone.disabled, detachedLabel: gone.textContent };
  });

  ok(H.during.disabled === true && H.during.label === "Promoting…",
    "H1 the button disables and relabels immediately on click, before any await resolves");
  ok(H.afterRepeat.calls === 1,
    "H2 a repeat click while it is running starts nothing — the operation ran once");
  ok(H.after.disabled === false && H.after.label === "Promote",
    "H3 -- and it is restored afterwards when it is still on the page");
  ok(H.detachedStillDisabled === true && H.detachedLabel === "Promoting…",
    "H4 a button its own operation removed from the DOM is left alone, not pointlessly restored");

  // ---------- I. Both Promote surfaces are wired through it ----------
  const I = await page.evaluate(async ({ seed, row, draft }) => {
    const mock = createMockGraphClient(seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([row]);
    __resetAllHeaderMapForTest();
    await mock.uploadJson(writePaths().stagingBase + "/AY-00706/coin.json",
      Object.assign({}, draft, { status: COIN_DRAFT_STATUS.READY, createdDate: new Date().toISOString() }));
    await refreshCoinDraftCache();

    const out = {};
    // Surface 1: the Docket's Staging section.
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 300));
    const docketBtn = document.querySelector("#docketStagingContainer .docket-promote");
    out.docketHasPromote = !!docketBtn;
    if (docketBtn) {
      docketBtn.click();
      out.docketPending = docketBtn.disabled === true && /Promoting/.test(docketBtn.textContent);
    }
    await new Promise(r => setTimeout(r, 400));

    // Surface 2: Staging Review. Re-seed, since the coin above is now promoted.
    await mock.uploadJson(writePaths().stagingBase + "/AY-00708/coin.json",
      Object.assign({}, draft, {
        collectionID: "AY-00708", status: COIN_DRAFT_STATUS.READY,
        createdDate: new Date().toISOString()
      }));
    await refreshCoinDraftCache();
    await renderStagingList();
    await new Promise(r => setTimeout(r, 300));
    const stagingBtn = document.querySelector("#view-staging .staging-promote-row");
    out.stagingHasPromote = !!stagingBtn;
    if (stagingBtn) {
      stagingBtn.click();
      out.stagingPending = stagingBtn.disabled === true && /Promoting/.test(stagingBtn.textContent);
    }
    await new Promise(r => setTimeout(r, 400));

    __teardown();
    return out;
  }, { seed: seedMock(), row: MATCH_ROW, draft: READY_DRAFT });

  ok(I.docketHasPromote && I.docketPending === true,
    "I1 the Docket's Promote button shows its pending state on click");
  ok(I.stagingHasPromote && I.stagingPending === true,
    "I2 Staging Review's Promote button does too — both surfaces, one helper");

  // ---------- J. An ordinary single promote is unaffected ----------
  const J = await page.evaluate(async ({ seed, headers, row, draft }) => {
    const mock = createMockGraphClient(seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([row]);
    __resetAllHeaderMapForTest();
    await mock.uploadJson(writePaths().stagingBase + "/AY-00706/coin.json",
      Object.assign({}, draft, {
        status: COIN_DRAFT_STATUS.READY, errorDesc: "Off-Center Strike",
        createdDate: new Date().toISOString()
      }));
    const res = await promoteCoinDraftToAllSheet("AY-00706");
    const grid = mock._grids.All;
    const at = n => headers.indexOf(n);
    const r = grid[res.rowNumber - 1] || [];
    const out = {
      ok: res.ok, coalesced: !!res.coalesced, rows: __rowsFor(grid, headers, "AY-00706").length,
      grade: r[at("Grade")], error: r[at("Error")],
      total: r[at("Total")], spot: r[at("SpotValue")]
    };
    __teardown();
    return out;
  }, { seed: seedMock(), headers: ALL_HEADERS, row: MATCH_ROW, draft: READY_DRAFT });

  ok(J.ok === true && J.coalesced === false && J.rows === 1,
    "J1 a plain single promote still writes exactly one row and is never marked coalesced");
  ok(J.grade === "MS-66" && J.error === "Off-Center Strike",
    "J2 -- with its data intact, including the Error column added last round");
  ok(J.total === null && J.spot === null,
    "J3 -- and both live formula cells still untouched by the whole cycle");

  await page.close();
}, module);
