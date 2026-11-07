// After a successful Edit Coin save, the app shows the values it just wrote,
// even while Excel is still answering reads with the OLD content (Ray's TEST
// of (ao), 7 Nov 2026, bug B2: Graph reads returned pre-save content for
// minutes; Details kept the old value and a re-opened Edit Coin form showed
// the old value with Save lit up).
//
// The mock client is wrapped so that, while `lag` is on, every READ sees the
// workbook as it was before the save (exactly what Ray saw) while writes land
// for real. Written to run against main's app.html too (it only uses seams
// main has), so the report can say which checks fail where.
//
//   W1  the save reaches the workbook;
//   W2  Details shows the new value at once;
//   W3  re-opening Edit Coin while Excel lags shows the new value, and Save
//       is not highlighted (nothing to save);
//   W4  a full re-read that lands while Excel lags keeps the new value on
//       Details (the re-read of the whole collection);
//   W5  somebody else's DIFFERENT value is shown as read (the app only
//       covers for its own write, never hides another change);
//   W6  once Excel catches up, the reads are used as they are again.

const { defineSuite } = require("./harness");

const HEADERS = ["CollectionID", "CoinID", "Denomination", "Category", "Year", "MintMark", "Description",
  "Finish", "Grade", "Cost", "Remarks", "Status", "Reviewed", "LastModified"];

module.exports = defineSuite("save-shows-written-values", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);

  const R = await page.evaluate(async (HEADERS) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const waitFor = async (fn, ms) => { const t0 = Date.now(); while (!fn() && Date.now() - t0 < ms) await sleep(25); return fn(); };
    window.showToast = () => {};
    const row = HEADERS.map(h => ({ CollectionID: "AY-00001", CoinID: "C-1943-S-1C-01", Denomination: "1C", Category: "Coin",
      Year: 1943, MintMark: "S", Description: "Lincoln Wheat", Finish: "Business Strike", Grade: "MS-64", Cost: 5,
      Remarks: "TEST7", Status: "Owned" })[h] ?? "");
    const mock = createMockGraphClient({ sheets: { All: [HEADERS.slice(), row, HEADERS.map(() => "")] } });
    // Excel's lag: while on, reads see `stale` (the workbook before the save).
    const lag = { on: false, stale: null };
    const lagging = new Proxy(mock, { get(t, k) {
      const v = t[k];
      if (typeof v !== "function" || !/^read/.test(String(k))) return v;
      return (...a) => {
        if (!lag.on) return v.apply(t, a);
        const live = t._grids.All.map(r => r.slice());
        lag.stale.forEach((r, i) => { t._grids.All[i] = r.slice(); });
        try { return v.apply(t, a); } finally { live.forEach((r, i) => { t._grids.All[i] = r; }); }
      };
    } });
    __setGraphClientForTest(lagging);
    __setBrowseEditWriteEnabledForTest(true);
    __resetAllHeaderMapForTest();
    if (typeof __resetSheetHeaderMapsForTest === "function") __resetSheetHeaderMapsForTest();
    const rowObj = {}; HEADERS.forEach((h, i) => { rowObj[h] = row[i]; });
    const coin = mapWorkbookRowToCoin(rowObj);
    __setLiveCoinsForTest([coin]);
    const remarksCol = HEADERS.indexOf("Remarks");
    const listed = () => activeCoins().find(c => c.id === "AY-00001");
    const detailsShows = text => {
      const v = document.getElementById("browseDetailView");
      return !!v && v.style.display !== "none" && v.textContent.indexOf(text) !== -1;
    };
    const saveBtn = () => document.getElementById("browseEditSaveBtn");
    const saveLit = () => !saveBtn().disabled && !saveBtn().classList.contains("is-clean");
    const openEdit = async c => {
      navigate("browse"); showBrowseDetail(c); showBrowseEditView(c);
      await loadBrowseEditSnapshot(c);
      await sleep(80);
      refreshEditSaveState();
    };
    const out = {};

    // Edit Remarks TEST7 -> TEST8 and Save; Excel lags from the moment of the write.
    await openEdit(coin);
    out.formBefore = document.getElementById("browseEditNotes").value;
    const notes = document.getElementById("browseEditNotes");
    notes.value = "TEST8";
    notes.dispatchEvent(new Event("input", { bubbles: true }));
    lag.stale = mock._grids.All.map(r => r.slice());
    lag.on = true;
    saveBtn().click();
    await sleep(50);
    await waitFor(() => !editSaveInFlight, 4000);
    await sleep(150);
    out.W1 = mock._grids.All[1][remarksCol];
    out.W2 = { record: listed() && listed().remarks, details: detailsShows("TEST8"), oldGone: !detailsShows("TEST7") };

    // Re-open Edit Coin while Excel still answers with TEST7.
    await openEdit(listed());
    out.W3 = { form: document.getElementById("browseEditNotes").value, lit: saveLit(), record: listed().remarks };
    navigate("browse"); showBrowseDetail(listed());

    // A whole-collection re-read lands while Excel still lags.
    window.acquireGraphToken = () => Promise.resolve("t");
    const realFetch = window.fetch;
    window.fetch = (u, i) => {
      const m = /worksheets\('([^']+)'\)/.exec(String(u));
      if (!m) return new Promise(() => {});
      const sheet = decodeURIComponent(m[1]);
      const values = sheet === "All" ? lag.stale : sheet === "DB_Sets" ? [["SetID", "Lineage", "Description", "Year"], ["S-1", "Proof Set", "P", 1999]] : [["Header"]];
      return Promise.resolve(new Response(JSON.stringify({ values }), { status: 200 }));
    };
    const reread = await refreshLiveCoinsAfterWrite();
    await sleep(50);
    showBrowseDetail(listed());
    out.W4 = { reread, record: listed() && listed().remarks, details: detailsShows("TEST8") };

    // Somebody else changes it to COPILOT; Excel then shows that (no lag).
    lag.on = false;
    mock._grids.All[1][remarksCol] = "COPILOT";
    await openEdit(listed());
    out.W5 = { form: document.getElementById("browseEditNotes").value, record: listed().remarks };
    navigate("browse");

    // Excel caught up with our own value: nothing is covered any more.
    mock._grids.All[1][remarksCol] = "TEST8";
    await openEdit(listed());
    out.W6 = { form: document.getElementById("browseEditNotes").value,
      pending: typeof __recentRowWritesForTest === "function" ? __recentRowWritesForTest().size : "n/a (main)" };
    window.fetch = realFetch;
    navigate("browse");
    __setGraphClientForTest(null);
    __setBrowseEditWriteEnabledForTest(null);
    return out;
  }, HEADERS);

  ok("W0 the form opened with the workbook's value (" + R.formBefore + ")", R.formBefore === "TEST7");
  ok("W1 the save reached the workbook (" + R.W1 + ")", R.W1 === "TEST8");
  ok("W2 Details shows the new value at once (" + JSON.stringify(R.W2) + ")", R.W2.record === "TEST8" && R.W2.details && R.W2.oldGone);
  ok("W3 re-opening Edit Coin while Excel lags shows the new value and Save is not highlighted (" + JSON.stringify(R.W3) + ")",
    R.W3.form === "TEST8" && R.W3.lit === false && R.W3.record === "TEST8");
  ok("W4 a full re-read that lands while Excel lags keeps the new value on Details (" + JSON.stringify(R.W4) + ")",
    R.W4.record === "TEST8" && R.W4.details);
  ok("W5 somebody else's different value is shown as read, never covered (" + JSON.stringify(R.W5) + ")",
    R.W5.form === "COPILOT" && R.W5.record === "COPILOT");
  ok("W6 once Excel shows our value, reads are used as they are (" + JSON.stringify(R.W6) + ")",
    R.W6.form === "TEST8" && (R.W6.pending === 0 || R.W6.pending === "n/a (main)"));
});
