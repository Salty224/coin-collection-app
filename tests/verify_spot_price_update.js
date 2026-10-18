// Ledger: manual "Update prices" panel for Ref_SpotPrices (Ray, Oct 2026).
//
// Copper and Nickel are editable like the other four (ranges 0.10-3.00 and
// 0.10-5.00); Source starts blank and is required whenever a price changed;
// a plain StackerScan link sits above the inputs.
//
// Everything runs against the mock workbook with a write spy wrapped round
// it. The mock sheet mirrors the real one: header, six metals, one blank
// row, three instruction rows. Assertions cover the exact cell addresses
// written, nothing written before Confirm or after Cancel, Copper/Nickel
// never written, input checks, the big-change tick, the changed-since-opened
// abort, formula / missing header / missing row refusals, honest partial
// failure, and the All.SpotValue / All.Total formula counts.

const { defineSuite } = require("./harness");

module.exports = defineSuite("spot-price-update", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  await page.evaluate(() => {
    const T = excelSerialToday();
    window.__T = T;
    window.__baseGrid = () => [
      ["Metal", "PricePerTroyOz", "LastUpdated", "Source"],
      ["Gold", 2650.5, T - 10, "Kitco"],
      ["Silver", 31.42, T - 2, "Kitco"],
      ["Platinum", 980, T - 7, "Kitco"],
      ["Palladium", 1012.25, T - 3, "Kitco"],
      ["Copper", 0.2841, T, "Manual"],
      ["Nickel", 0.4902, T - 30, "Manual"],
      ["", "", "", ""],
      ["Instructions:", "", "", ""],
      ["Update PricePerTroyOz values with current spot prices.", "", "", ""],
      ["These values are used to calculate spot value of coins in your collection.", "", "", ""]
    ];
    window.__setup = (mutate) => {
      const grid = window.__baseGrid();
      const formats = grid.map((r, i) => (i >= 1 && i <= 6) ? [undefined, undefined, "m/d/yyyy", undefined] : []);
      const allGrid = [
        ["CollectionID", "Total", "SpotValue", "Value"],
        ["AY-1", 10, 20, 30], ["AY-2", 11, 21, 31], ["AY-3", 12, 22, 32]
      ];
      const allFormulas = [[], [undefined, "=B2", "=X2"], [undefined, "=B3", "=X3"], [undefined, "=B4", "=X4"]];
      const seed = { sheets: { Ref_SpotPrices: grid, All: allGrid },
        formulas: { All: allFormulas, Ref_SpotPrices: [] }, numberFormats: { Ref_SpotPrices: formats } };
      if (mutate) mutate(seed);
      const mock = createMockGraphClient(seed);
      window.__mock = mock;
      window.__writes = [];
      window.__failOnCall = null;
      window.__hangOnCall = null;   // that write call never answers
      window.__landOnCall = null;   // that write call lands, then reports a failure
      window.__holdWrites = null;   // a promise every write waits on (to observe "Writing")
      window.__staleReads = 0;      // this many Ref_SpotPrices reads after a write show the old date/Source
      window.__preWriteGrid = null; // the sheet as it stood just before the first write
      window.__spotReads = 0;       // Ref_SpotPrices reads made after the first write
      __setSpotPricePatienceDelaysForTest([10, 20, 40]);
      let calls = 0;
      const WRITE_METHODS = ["patchWorkbookRanges", "addTableRow", "uploadJson", "uploadFile", "uploadBytes", "putContent", "deleteItem"];
      const spy = new Proxy(mock, { get(target, k) {
        const v = target[k];
        if (k === "readUsedRangeDetail") return (wb, sheet) => v.call(target, wb, sheet).then(d => {
          if (sheet !== "Ref_SpotPrices" || !window.__preWriteGrid) return d;
          window.__spotReads++;
          if (window.__staleReads <= 0) return d;
          window.__staleReads--;
          // A lagging read: new price, but date and Source as they were.
          const values = d.values.map((row, r) => row.map((cell, c) =>
            (r >= 1 && r <= 6 && (c === 2 || c === 3)) ? window.__preWriteGrid[r][c] : cell));
          return Object.assign({}, d, { values });
        });
        if (!WRITE_METHODS.includes(k) || typeof v !== "function") return typeof v === "function" ? v.bind(target) : v;
        return (...args) => {
          calls++;
          if (k === "patchWorkbookRanges") {
            if (!window.__preWriteGrid) window.__preWriteGrid = JSON.parse(JSON.stringify(target._grids.Ref_SpotPrices));
            window.__writes.push({ sheet: args[1], addresses: args[2].map(e => e.address), edits: JSON.parse(JSON.stringify(args[2])) });
            if (window.__failOnCall === calls) return Promise.reject(new Error("simulated Graph 503"));
            if (window.__hangOnCall === calls) return new Promise(() => {});
            if (window.__landOnCall === calls) return v.apply(target, args).then(() => { throw new Error("simulated 504 after the write landed"); });
            if (window.__holdWrites) { const n = calls; return window.__holdWrites.then(() => v.apply(target, args)); }
          } else window.__writes.push({ method: k });
          return v.apply(target, args);
        };
      } });
      __setGraphClientForTest(spy);
      __resetAllHeaderMapForTest();
      __setLiveDataModeForTest("live");
      __setLiveCoinsForTest([{ id: "AY-1", denom: "1C", status: "Owned", value: 1 }]);
      window.__reloads = 0;
      window.__origRefresh = window.__origRefresh || window.refreshLiveCoinsAfterWrite;
      window.refreshLiveCoinsAfterWrite = () => { window.__reloads++; return Promise.resolve(true); };
      // Load the sheet as the read path would have.
      const d = { values: seed.sheets.Ref_SpotPrices || window.__baseGrid() };
      __setSpotPriceRowsForTest(spotDetailToRows(d));
      navigate("stats");
      return true;
    };
    window.__open = () => { const b = document.getElementById("spotPriceUpdateBtn"); if (!b) return false; b.click(); return true; };
    window.__fill = (prices, opts) => {
      Object.keys(prices || {}).forEach(m => { const el = document.getElementById("spotEdit" + m); if (el) { el.value = prices[m]; el.dispatchEvent(new Event("input")); } });
      Object.keys((opts && opts.big) || {}).forEach(m => { const t = document.getElementById("spotBig" + m); if (t) t.checked = true; });
      // Source starts blank; this helper types "Kitco" unless the test sets
      // Source itself, so flows that aren't about Source can still proceed.
      document.getElementById("spotEditSource").value = (opts && "source" in opts) ? opts.source : "Kitco";
      if (opts && "date" in opts) document.getElementById("spotEditDate").value = opts.date;
    };
    // Returns a copy of the stage at this moment (the live state object is mutated later).
    window.__review = () => { document.getElementById("spotEditReviewBtn").click(); return { stage: __getSpotUpdateStateForTest().stage }; };
    window.__errors = () => {
      const out = {};
      ["Silver", "Gold", "Platinum", "Palladium", "Copper", "Nickel", "Source", "Date"].forEach(k => { const e = document.getElementById("spotErr" + k); if (e && e.textContent) out[k] = e.textContent; });
      const m = document.getElementById("spotEditMessage"); if (m && m.textContent) out.message = m.textContent;
      return out;
    };
    window.__confirm = async () => {
      document.getElementById("spotReviewConfirmBtn").click();
      for (let i = 0; i < 200; i++) {
        const st = __getSpotUpdateStateForTest();
        if (st && st.stage === "result") return st.result;
        await new Promise(r => setTimeout(r, 10));
      }
      return null;
    };
    window.__waitStage = async (stages, ms) => {
      for (let i = 0; i < (ms || 3000) / 10; i++) {
        const st = __getSpotUpdateStateForTest();
        if (st && stages.includes(st.stage)) return st.stage;
        await new Promise(r => setTimeout(r, 10));
      }
      const st = __getSpotUpdateStateForTest();
      return st ? "stuck:" + st.stage : "closed";
    };
    window.__resultText = () => { const b = document.getElementById("spotUpdateResult"); return b ? b.textContent : ""; };
    window.__sheet = () => window.__mock._grids.Ref_SpotPrices ? JSON.parse(JSON.stringify(window.__mock._grids.Ref_SpotPrices)) : null;
  });

  // ---------- A. visibility ----------
  const A = await page.evaluate(() => {
    __setup();
    const live = !!document.getElementById("spotPriceUpdateBtn");
    __setLiveDataModeForTest("offline"); navigate("stats");
    const offline = !!document.getElementById("spotPriceUpdateBtn");
    __setLiveDataModeForTest("live"); __setLiveCoinsForTest(null); navigate("stats");
    const noCoins = !!document.getElementById("spotPriceUpdateBtn");
    return { live, offline, noCoins };
  });
  ok(A.live, "A1 'Update prices' button shows when signed in with live data loaded");
  ok(!A.offline, "A2 hidden in offline mode");
  ok(!A.noCoins, "A3 hidden while live coins are not loaded");

  // ---------- B. panel contents ----------
  const B = await page.evaluate(() => {
    __setup(); __open();
    const inp = m => document.getElementById("spotEdit" + m);
    return {
      editable: ["Silver", "Gold", "Platinum", "Palladium", "Copper", "Nickel"].map(m => inp(m) && inp(m).type === "text" && inp(m).inputMode === "decimal" && inp(m).value === ""),
      copperInput: !!inp("Copper"), nickelInput: !!inp("Nickel"),
      readonlyShown: [...document.querySelectorAll(".spot-edit-readonly")].map(r => r.dataset.metal).join(","),
      goldNow: document.querySelector('.spot-edit-row[data-metal="Gold"] .spot-edit-now').textContent,
      copperNow: document.querySelector('.spot-edit-row[data-metal="Copper"] .spot-edit-now').textContent,
      source: document.getElementById("spotEditSource").value,
      date: document.getElementById("spotEditDate").value,
      max: document.getElementById("spotEditDate").max,
      today: excelSerialToISODate(window.__T),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      writes: window.__writes.length
    };
  });
  ok(B.editable.every(Boolean), "B1 all six metals, Copper and Nickel included, have a blank text input with a decimal keypad");
  ok(B.copperInput && B.nickelInput && B.readonlyShown === "", "B2 Copper and Nickel are editable — no read-only rows remain");
  ok(/Now \$2,650\.50 · \d{4}-\d{2}-\d{2}/.test(B.goldNow) && /^Now \$0\.2841 · /.test(B.copperNow), `B3 each metal shows its current price (Copper to four decimals) and last-updated date (${B.goldNow} / ${B.copperNow})`);
  ok(B.source === "", `B4 SOURCE STARTS EMPTY when the panel opens (got "${B.source}")`);
  ok(B.date === B.today && B.max === B.today, "B5 Date defaults to today and cannot be picked past today");
  ok(!B.overflow, "B6 no horizontal overflow at phone width");
  ok(B.writes === 0, "B7 opening the panel writes nothing");

  // ---------- C. input checks ----------
  const check = (prices, opts) => page.evaluate(({ prices, opts }) => {
    __setup(); __open(); __fill(prices, opts);
    const st = __review();
    return { stage: st.stage, errors: __errors(), writes: window.__writes.length };
  }, { prices, opts });
  const C0 = await check({});
  ok(C0.stage === "edit" && /Nothing to update/.test(C0.errors.message || ""), "C1 nothing entered: says there is nothing to update");
  const cases = [
    ["C2 out of range (Silver 5)", { Silver: "5" }, "Silver", /between \$10\.00 and \$200\.00/],
    ["C3 out of range (Gold 12000)", { Gold: "12000" }, "Gold", /between/],
    ["C4 zero", { Platinum: "0" }, "Platinum", /greater than 0/],
    ["C5 negative", { Palladium: "-900" }, "Palladium", /greater than 0/],
    ["C6 non-numeric", { Silver: "abc" }, "Silver", /Enter a number/],
    ["C7 exponent text", { Gold: "2e3" }, "Gold", /Enter a number/]
  ];
  for (const [name, prices, metal, re] of cases) {
    const r = await check(prices);
    ok(r.stage === "edit" && re.test(r.errors[metal] || "") && r.writes === 0, `${name} is rejected next to the field (${r.errors[metal] || "no error"})`);
  }
  const future = await page.evaluate(() => excelSerialToISODate(window.__T + 1));
  const C8 = await check({ Silver: "32" }, { date: future });
  ok(C8.stage === "edit" && /future/.test(C8.errors.Date || ""), "C8 a future date is rejected");
  const C9 = await check({ Silver: "32" }, { source: "  " });
  ok(C9.stage === "edit" && C9.errors.Source === "Enter where these prices came from", `C9 BLANK SOURCE BLOCKS THE REVIEW when a price is entered (${C9.errors.Source || "no error"})`);
  const C10 = await check({}, { source: "" });
  ok(C10.stage === "edit" && !C10.errors.Source && /Nothing to update/.test(C10.errors.message || ""), "C10 with no price entered, a blank Source isn't flagged — it's just nothing to update");

  // ---------- D. big change needs the tick ----------
  const D = await page.evaluate(() => {
    __setup(); __open(); __fill({ Silver: "60" });
    const tickShown = !document.getElementById("spotBigWrapSilver").classList.contains("hidden");
    const st1 = __review();
    const err = __errors().Silver || "";
    __fill({}, { big: { Silver: true } });
    const st2 = __review();
    return { tickShown, stage1: st1.stage, err, stage2: st2.stage };
  });
  ok(D.tickShown && D.stage1 === "edit" && /91\.0% change/.test(D.err), `D1 a >50% change is held until the extra tick (${D.err})`);
  ok(D.stage2 === "review", "D2 with 'Yes, this big change is right' ticked it goes to review");

  // ---------- E. review; nothing written before Confirm; Cancel writes nothing ----------
  const E = await page.evaluate(async () => {
    __setup(); __open(); __fill({ Silver: "32.10", Gold: "2700" }, { source: "APMEX" });
    const st = __review();
    // Give any stray async write time to land before counting.
    await new Promise(r => setTimeout(r, 300));
    const rows = [...document.querySelectorAll(".spot-review-row")].map(r => r.textContent.replace(/\s+/g, " ").trim());
    const meta = document.getElementById("spotReviewMeta").textContent;
    const writesAtReview = window.__writes.length;
    document.getElementById("spotReviewCancelBtn").click();
    const backToEdit = __getSpotUpdateStateForTest().stage;
    const keptValue = document.getElementById("spotEditSilver").value;
    document.getElementById("spotEditCancelBtn").click();
    await new Promise(r => setTimeout(r, 300));
    const closed = __getSpotUpdateStateForTest() === null && !!document.getElementById("spotPriceUpdateBtn");
    return { stage: st.stage, rows, meta, writesAtReview, backToEdit, keptValue, closed, writesAfter: window.__writes.length, sheet: __sheet(), base: window.__baseGrid() };
  });
  ok(E.stage === "review" && E.rows.length === 2, "E1 review lists each changed metal");
  ok(E.rows[0] === "Silver $31.42 → $32.10 (+2.2%)" && E.rows[1] === "Gold $2,650.50 → $2,700.00 (+1.9%)", `E2 old price, new price and percent change (${E.rows.join(" | ")})`);
  ok(/Date \d{4}-\d{2}-\d{2} · Source APMEX/.test(E.meta), "E3 the date and Source that will be written are shown");
  ok(E.writesAtReview === 0, "E4 ZERO WRITES BEFORE CONFIRM");
  ok(E.backToEdit === "edit" && E.keptValue === "32.10", "E5 review Cancel returns to the form with the typed values kept");
  ok(E.closed && E.writesAfter === 0 && JSON.stringify(E.sheet) === JSON.stringify(E.base), "E6 ZERO WRITES AFTER CANCEL; the sheet is untouched");

  // ---------- F. one metal: exact addresses ----------
  const F = await page.evaluate(async () => {
    __setup(); __open(); __fill({ Silver: "32.10" }, { source: "APMEX" });
    __review();
    const result = await __confirm();
    return { result, writes: window.__writes, sheet: __sheet(), base: window.__baseGrid(), fmt: window.__mock._numberFormats.Ref_SpotPrices[2][2], text: __resultText(), reloads: window.__reloads,
      shown: (document.querySelector('#statsSpotPrices .spot-price-row[data-metal="Silver"] .spot-price-value') || {}).textContent };
  });
  ok(F.writes.length === 1 && F.writes[0].sheet === "Ref_SpotPrices", "F1 one metal: one write call, to Ref_SpotPrices only");
  ok(JSON.stringify(F.writes[0].addresses) === JSON.stringify(["B3", "C3", "D3"]), `F2 EXACT ADDRESSES for one metal: B3, C3, D3 (got ${JSON.stringify(F.writes[0].addresses)})`);
  ok(F.sheet[2][1] === 32.1 && F.sheet[2][2] === F.base[2][2] + 2 && F.sheet[2][3] === "APMEX", "F3 Silver's price, today's date (as a serial number) and the typed Source written");
  ok(typeof F.sheet[2][2] === "number" && F.fmt === "m/d/yyyy", `F4 LastUpdated is a real Excel date with the sheet's own format (${F.fmt})`);
  const untouched = [1, 3, 4, 5, 6, 7, 8, 9, 10].every(i => JSON.stringify(F.sheet[i]) === JSON.stringify(F.base[i])) && JSON.stringify(F.sheet[0]) === JSON.stringify(F.base[0]);
  ok(untouched, "F5 every other row — Gold, Platinum, Palladium, Copper, Nickel, the blank row, the three note rows and the header — is untouched");
  ok(F.result.ok && F.result.perMetal[0].status === "written" && /confirmed in the workbook/.test(F.text), "F6 the written cells were re-read and confirmed");
  ok(/SpotValue 3 formulas, 0 errors; Total 3 formulas, 0 errors/.test(F.text) &&
    JSON.stringify(F.result.formulasBefore) === JSON.stringify(F.result.formulasAfter), `F7 All.SpotValue/All.Total formula counts checked before and after, unchanged (${JSON.stringify(F.result.formulasAfter)})`);
  ok(F.reloads === 1 && F.shown === "$32.10 / oz", "F8 after the write the Ledger shows the new price and the coin data is reloaded");

  // ---------- G. four metals: exact addresses ----------
  const G = await page.evaluate(async () => {
    __setup(); __open(); __fill({ Silver: "32", Gold: "2700", Platinum: "990", Palladium: "1000" }, { source: "APMEX" });
    __review();
    const result = await __confirm();
    return { ok: result.ok, writes: window.__writes, sheet: __sheet(), base: window.__baseGrid() };
  });
  const all = G.writes.flatMap(w => w.addresses);
  ok(JSON.stringify(all) === JSON.stringify(["B3", "C3", "D3", "B2", "C2", "D2", "B4", "C4", "D4", "B5", "C5", "D5"]),
    `G1 EXACT ADDRESSES for four metals (got ${JSON.stringify(all)})`);
  ok(G.writes.every(w => w.sheet === "Ref_SpotPrices") && G.ok, "G2 every write is on Ref_SpotPrices and all four verified");
  ok(!all.some(a => /^[A-Z]+(6|7|8|9|10|11)$/.test(a)), "G3 no address in the Copper/Nickel rows, the blank row or the note rows");
  ok([5, 6, 7, 8, 9, 10].every(i => JSON.stringify(G.sheet[i]) === JSON.stringify(G.base[i])), "G4 Copper, Nickel, blank and note rows untouched after a four-metal write");
  ok(!all.some(a => /^[A-Z]+1$/.test(a)) && !all.some(a => /^A/.test(a)), "G5 never the header row and never the Metal column");
  const G6 = await page.evaluate(async () => {
    __setup(); __open(); __fill({ Silver: "32", Gold: "2700", Platinum: "990", Palladium: "1000", Copper: "0.30", Nickel: "0.50" });
    __review();
    const result = await __confirm();
    return { ok: result.ok, writes: window.__writes, sheet: __sheet(), base: window.__baseGrid() };
  });
  const six = G6.writes.flatMap(w => w.addresses);
  ok(JSON.stringify(six) === JSON.stringify(["B3", "C3", "D3", "B2", "C2", "D2", "B4", "C4", "D4", "B5", "C5", "D5", "B6", "C6", "D6", "B7", "C7", "D7"]) && G6.ok,
    `G6 EXACT ADDRESSES for all six metals, Copper (row 6) and Nickel (row 7) included (got ${JSON.stringify(six)})`);
  ok([7, 8, 9, 10].every(i => JSON.stringify(G6.sheet[i]) === JSON.stringify(G6.base[i])), "G7 blank and note rows untouched after a six-metal write");

  // ---------- H. Copper / Nickel edits ----------
  const Hc = (prices, opts) => check(prices, opts);
  const H1 = await Hc({ Copper: "0.30", Nickel: "0.52" });
  ok(H1.stage === "review" && !H1.errors.Copper && !H1.errors.Nickel, "H1 Copper 0.30 and Nickel 0.52 are accepted (in range)");
  const H1b = await Hc({ Nickel: "4.50" }, { big: { Nickel: true } });
  ok(H1b.stage === "review", "H1b Nickel 4.50 is in range (accepted once the big-change tick is set)");
  const H2 = await Hc({ Copper: "3.50" });
  ok(H2.stage === "edit" && /Copper must be between \$0\.10 and \$3\.00/.test(H2.errors.Copper || ""), `H2 OUT-OF-RANGE COPPER REJECTED: 3.50 (${H2.errors.Copper || "no error"})`);
  const H3 = await Hc({ Copper: "0.05" });
  ok(H3.stage === "edit" && /between \$0\.10 and \$3\.00/.test(H3.errors.Copper || ""), "H3 Copper 0.05 rejected (below range)");
  const H4 = await Hc({ Nickel: "5.50" });
  ok(H4.stage === "edit" && /Nickel must be between \$0\.10 and \$5\.00/.test(H4.errors.Nickel || ""), "H4 Nickel 5.50 rejected (above range)");
  const H5 = await page.evaluate(() => {
    __setup(); __open(); __fill({ Copper: "0.60" });
    const tick = !document.getElementById("spotBigWrapCopper").classList.contains("hidden");
    const st = __review();
    return { tick, stage: st.stage, err: __errors().Copper || "" };
  });
  ok(H5.tick && H5.stage === "edit" && /change from \$0\.2841/.test(H5.err), "H5 a >50% Copper change needs the extra tick too");
  const H6 = await page.evaluate(async () => {
    __setup(); __open(); __fill({ Silver: "32", Copper: "0.30" });
    __review();
    const rows = [...document.querySelectorAll(".spot-review-row")].map(r => r.textContent.replace(/\s+/g, " ").trim());
    const result = await __confirm();
    return { rows, result, writes: window.__writes, sheet: __sheet() };
  });
  ok(H6.rows[1] === "Copper $0.2841 → $0.3000 (+5.6%)", `H6 Copper shown in the review to four decimals (${H6.rows[1]})`);
  const h6 = H6.writes.flatMap(w => w.addresses);
  ok(JSON.stringify(h6) === JSON.stringify(["B3", "C3", "D3", "B6", "C6", "D6"]) && H6.result.ok, `H7 Copper row written only when changed, at its three cells (${JSON.stringify(h6)})`);
  ok(H6.sheet[5][1] === 0.3 && H6.sheet[5][3] === "Kitco" && H6.sheet[6][1] === 0.4902 && H6.sheet[6][3] === "Manual", "H8 Copper's new price and the typed Source are in its row; Nickel's row keeps its own values");
  ok(!h6.some(a => /7$/.test(a)), "H9 COPPER/NICKEL ROW NOT WRITTEN WHEN LEFT BLANK: Nickel (row 7) untouched");

  // ---------- I. refusals: changed since opened, formula, missing header, missing row ----------
  const refuse = (mutateAfterOpen, mutateSeed) => page.evaluate(async ({ a, b }) => {
    __setup(b ? new Function("seed", b) : undefined);
    if (!__open()) return { result: null, writes: window.__writes.length, text: "panel did not open", sheet: null };
    __fill({ Silver: "32", Palladium: "1000" });
    __review();
    if (a) new Function("mock", a)(window.__mock);
    const result = await __confirm();
    return { result, writes: window.__writes.length, text: __resultText(), sheet: __sheet() };
  }, { a: mutateAfterOpen, b: mutateSeed });
  const I1 = await refuse("mock._grids.Ref_SpotPrices[1][1] = 2700;");
  ok(I1.writes === 0 && I1.text.includes("Prices changed in the workbook since you opened this; reopen to continue"),
    `I1 CHANGED SINCE OPENED: a workbook price changed between open and Confirm aborts with no write (${I1.text})`);
  const I2 = await refuse("mock._formulas.Ref_SpotPrices[2] = [undefined, '=GOOGLEFINANCE(\"x\")'];");
  ok(I2.writes === 0 && /Silver's PricePerTroyOz cell \(B3\) contains a formula/.test(I2.text), `I2 a formula in a target cell refuses the write (${I2.text})`);
  const I3 = await refuse("mock._grids.Ref_SpotPrices[0][3] = 'Src';");
  ok(I3.writes === 0 && /no "Source" header/.test(I3.text), `I3 a missing header refuses the write (${I3.text})`);
  const I4 = await refuse("mock._grids.Ref_SpotPrices[4][0] = '';");
  ok(I4.writes === 0 && /no Palladium row/.test(I4.text), `I4 a missing row refuses the write (${I4.text})`);
  const I5 = await refuse(null, "delete seed.sheets.Ref_SpotPrices;");
  ok(I5.writes === 0 && /Couldn't re-read Ref_SpotPrices .*Nothing was written/.test(I5.text), `I5 a sheet that can't be re-read writes nothing (${I5.text})`);

  // ---------- J. partial failure is reported honestly ----------
  const J = await page.evaluate(async () => {
    __setup(); __open(); __fill({ Silver: "32", Gold: "2700", Platinum: "990" });
    __review();
    window.__failOnCall = 2; // the Gold write fails
    const result = await __confirm();
    return { result, text: __resultText(), title: document.querySelector("#spotPriceUpdatePanel .spot-update-title").textContent, sheet: __sheet() };
  });
  const st = m => (J.result.perMetal.find(p => p.metal === m) || {}).status;
  ok(!J.result.ok && J.title === "Not updated" && !/confirmed in the workbook/.test(J.text), "J1 a failed write never shows success");
  ok(st("Silver") === "written" && st("Gold") === "not written" && st("Platinum") === "not written",
    `J2 says exactly which metals were written (Silver ${st("Silver")}, Gold ${st("Gold")}, Platinum ${st("Platinum")})`);
  ok(/Write failed on Gold: simulated Graph 503/.test(J.text) && J.result.perMetal.find(p => p.metal === "Platinum").sent === "not attempted",
    "J3 names the failing metal and the error; later metals were not attempted");
  ok(J.sheet[2][1] === 32 && J.sheet[1][1] === 2650.5 && J.sheet[3][1] === 980, "J4 the sheet holds exactly what the report says");

  // ---------- L. StackerScan link ----------
  await page.route("**/*stackerscan*/**", r => r.abort());
  const popups = [];
  page.context().on("page", p => { popups.push(p.url()); p.close().catch(() => {}); });
  const L = await page.evaluate(async () => {
    __setup(); __open();
    const a = document.getElementById("spotPriceSourceLink");
    const note = document.getElementById("spotPriceSourceNote");
    const inputs = document.querySelectorAll("#spotPriceUpdatePanel .spot-edit-input");
    const linkAboveInputs = !!(a && inputs[0] && (a.compareDocumentPosition(inputs[0]) & Node.DOCUMENT_POSITION_FOLLOWING));
    let fetches = 0;
    const realFetch = window.fetch;
    window.fetch = (...args) => { fetches++; return realFetch(...args); };
    const writesBefore = window.__writes.length;
    a.click();
    await new Promise(r => setTimeout(r, 300));
    window.fetch = realFetch;
    return {
      text: a && a.textContent, href: a && a.getAttribute("href"), target: a && a.getAttribute("target"), rel: a && a.getAttribute("rel"),
      note: note && note.textContent, linkAboveInputs, constant: STACKERSCAN_SPOT_PRICES_URL,
      fetches, writes: window.__writes.length - writesBefore,
      inputsBlank: [...inputs].every(i => i.value === ""), stage: __getSpotUpdateStateForTest() && __getSpotUpdateStateForTest().stage
    };
  });
  ok(L.text === "Open StackerScan spot prices" && L.linkAboveInputs, "L1 the link is labelled and sits above the price inputs");
  ok(L.href === "https://www.stackerscan.com/metal-prices" && L.constant === L.href, "L2 exact address, from the one named constant");
  ok(L.target === "_blank" && L.rel === "noopener noreferrer", `L3 opens in a new tab with rel="noopener noreferrer" (${L.target} / ${L.rel})`);
  ok(L.note === "This site lists gold, silver, platinum and palladium only.", "L4 the note under the link");
  ok(L.fetches === 0 && L.writes === 0, `L5 clicking the link makes no app request and no write (fetches ${L.fetches}, writes ${L.writes})`);
  ok(L.inputsBlank && L.stage === "edit", "L6 nothing is pre-filled from the link; the panel stays as it was");

  // ---------- M. Done, progress, timeout, check, safe retry ----------
  const M1 = await page.evaluate(async () => {
    __setup(); __open(); __fill({ Silver: "32.10" });
    __review();
    let release; window.__holdWrites = new Promise(r => { release = r; });
    document.getElementById("spotReviewConfirmBtn").click();
    await new Promise(r => setTimeout(r, 50));
    const progress = (document.getElementById("spotWriteProgress") || {}).textContent || "";
    // Re-render mid-write (as a background list refresh does): progress must survive, no buttons back.
    renderSpotPrices();
    const progressAfterRerender = (document.getElementById("spotWriteProgress") || {}).textContent || "";
    const buttonsMidWrite = document.querySelectorAll("#spotPriceUpdatePanel button").length;
    release(); window.__holdWrites = null;
    const stage = await __waitStage(["result"]);
    const done = document.getElementById("spotResultDoneBtn");
    const hadDone = !!done;
    if (done) done.click();
    return { progress, progressAfterRerender, buttonsMidWrite, stage, hadDone,
      closed: __getSpotUpdateStateForTest() === null && !document.getElementById("spotPriceUpdatePanel"),
      button: !!document.getElementById("spotPriceUpdateBtn"),
      silverShown: (document.querySelector('#statsSpotPrices .spot-price-row[data-metal="Silver"] .spot-price-value') || {}).textContent };
  });
  ok(M1.progress === "Writing to the workbook… this can take up to a minute. Please keep this page open.",
    `M1 progress text shown while writing ("${M1.progress}")`);
  ok(M1.progressAfterRerender === M1.progress && M1.buttonsMidWrite === 0,
    `M1b a re-render mid-write keeps the progress text and brings no buttons back (${M1.buttonsMidWrite} buttons)`);
  ok(M1.stage === "result" && M1.hadDone, "M2 the success screen has a Done button");
  ok(M1.closed && M1.button && M1.silverShown === "$32.10 / oz", `M3 DONE CLOSES THE PANEL and the Spot Prices list already shows the new value (${M1.silverShown})`);

  const M4 = await page.evaluate(async () => {
    __setup(); __setSpotPriceTimeoutForTest(300);
    __open(); __fill({ Silver: "32", Gold: "2700" });
    __review();
    window.__hangOnCall = 1;
    document.getElementById("spotReviewConfirmBtn").click();
    const stage = await __waitStage(["result"], 3000);
    const writesAtEnd = window.__writes.length;
    await new Promise(r => setTimeout(r, 600));
    const out = { stage, text: __resultText(), writesAtEnd, writesLater: window.__writes.length,
      hasCheck: !!document.getElementById("spotCheckBtn"), hasRetry: !!document.getElementById("spotRetryBtn"),
      title: (document.querySelector("#spotPriceUpdatePanel .spot-update-title") || {}).textContent };
    __setSpotPriceTimeoutForTest(null);
    return out;
  });
  ok(M4.stage === "result" && /Not updated: the workbook didn't respond/.test(M4.text) && M4.title === "Not updated",
    `M4 A HUNG WRITE ENDS IN THE TIMEOUT MESSAGE (${M4.stage}: ${M4.text.slice(0, 80)})`);
  ok(M4.writesAtEnd === 1 && M4.writesLater === 1, `M5 no further writes after the timeout (Gold never attempted; ${M4.writesLater} write call)`);
  ok(M4.hasCheck && !M4.hasRetry, "M6 after a timeout the only way on is 'Check what's in the workbook' — no direct retry");

  const M7 = await page.evaluate(async () => {
    __setup(); __open(); __fill({ Silver: "32", Gold: "2700", Platinum: "990" }, { source: "APMEX" });
    __review();
    window.__failOnCall = 2; // Silver lands, Gold fails, Platinum not attempted
    await __confirm();
    const writesBeforeCheck = window.__writes.length;
    // Make Gold half-done behind the app's back: new price, old date and source.
    window.__mock._grids.Ref_SpotPrices[1][1] = 2700;
    document.getElementById("spotCheckBtn").click();
    const stage = await __waitStage(["checked"]);
    const st = __getSpotUpdateStateForTest();
    return { stage, statuses: Object.fromEntries(((st.check || {}).perMetal || []).map(p => [p.metal, p.status])),
      text: __resultText(), writesAfterCheck: window.__writes.length - writesBeforeCheck, hasRetry: !!document.getElementById("spotRetryBtn") };
  });
  ok(M7.stage === "checked" && M7.statuses.Silver === "written" && M7.statuses.Gold === "partly written" && M7.statuses.Platinum === "not written",
    `M7 THE CHECK REPORTS EACH METAL after a partial failure (${JSON.stringify(M7.statuses)})`);
  ok(M7.writesAfterCheck === 0 && M7.hasRetry, "M8 the check writes nothing and only then offers Try again");

  const M9 = await page.evaluate(async () => {
    __setup(); __open(); __fill({ Silver: "32", Gold: "2700" }, { source: "APMEX" });
    __review();
    window.__landOnCall = 1; // Silver lands but reports failure, so Gold is never attempted
    const first = await __confirm();
    const writesAfterFirst = window.__writes.length;
    document.getElementById("spotCheckBtn").click();
    await __waitStage(["checked"]);
    const checked = Object.fromEntries((((__getSpotUpdateStateForTest().check) || {}).perMetal || []).map(p => [p.metal, p.status]));
    const retryBtn = document.getElementById("spotRetryBtn");
    if (retryBtn) retryBtn.click();
    await new Promise(r => setTimeout(r, 20));
    await __waitStage(["result"]);
    const st = __getSpotUpdateStateForTest();
    const retryAddresses = window.__writes.slice(writesAfterFirst).flatMap(w => w.addresses || []);
    return { firstOk: first.ok, checked, retryOk: st.result.ok, retryAddresses, sheet: __sheet() };
  });
  ok(!M9.firstOk && M9.checked.Silver === "written" && M9.checked.Gold === "not written", `M9 a write that landed but reported failure is found by the check (${JSON.stringify(M9.checked)})`);
  ok(M9.retryOk && JSON.stringify(M9.retryAddresses) === JSON.stringify(["B2", "C2", "D2"]),
    `M10 RETRY DOES NOT WRITE AGAIN WHAT ALREADY LANDED: only Gold's cells (got ${JSON.stringify(M9.retryAddresses)})`);
  ok(M9.sheet[2][1] === 32 && M9.sheet[1][1] === 2700 && M9.sheet[1][3] === "APMEX", "M11 both metals end up written");

  const M12 = await page.evaluate(async () => {
    __setup(); __open(); __fill({ Silver: "32" }, { source: "APMEX" });
    __review();
    window.__landOnCall = 1;
    await __confirm();
    const writes = window.__writes.length;
    document.getElementById("spotCheckBtn").click();
    await __waitStage(["result"]);
    const st = __getSpotUpdateStateForTest();
    return { ok: st.result.ok, text: __resultText(), newWrites: window.__writes.length - writes, done: !!document.getElementById("spotResultDoneBtn") };
  });
  ok(M12.ok && /earlier attempt had in fact completed/.test(M12.text) && M12.newWrites === 0 && M12.done,
    `M12 when everything had landed, the check shows success with a note, writes nothing, and offers Done (new writes ${M12.newWrites})`);

  const M13 = await page.evaluate(async () => {
    __setup(); __open(); __fill({ Silver: "32" }, { source: "APMEX" });
    __review();
    const st = __getSpotUpdateStateForTest();
    // Already in the workbook exactly as intended: commit writes nothing.
    window.__mock._grids.Ref_SpotPrices[2][1] = 32; window.__mock._grids.Ref_SpotPrices[2][2] = window.__T; window.__mock._grids.Ref_SpotPrices[2][3] = "APMEX";
    const r1 = await commitSpotPriceUpdate(st.validated, st.snapshot);
    const w1 = window.__writes.length;
    // A different Silver price than the one being written: still refused.
    window.__mock._grids.Ref_SpotPrices[2][1] = 33;
    const r2 = await commitSpotPriceUpdate(st.validated, st.snapshot);
    // An untouched metal changed underneath: still refused.
    window.__mock._grids.Ref_SpotPrices[2][1] = 31.42;
    window.__mock._grids.Ref_SpotPrices[1][1] = 2700;
    const r3 = await commitSpotPriceUpdate(st.validated, st.snapshot);
    return { r1ok: r1.ok, r1already: r1.alreadyComplete, w1, r2: r2.message, r3: r3.message, wEnd: window.__writes.length };
  });
  ok(M13.r1ok && M13.r1already && M13.w1 === 0, "M13 the changed-since check doesn't misfire when the cells already hold the intended values — and nothing is rewritten");
  ok(/Prices changed in the workbook since you opened this; reopen to continue/.test(M13.r2 || "") &&
    /Prices changed in the workbook/.test(M13.r3 || "") && M13.wEnd === 0,
    "M14 CHANGED-SINCE STILL REFUSES when the price really changed to something else (same metal, or another metal)");

  // ---------- P. patient read-back, spinner, reload line ----------
  // The writes and the read-back are separate sessionless Graph calls, so the
  // first read can lag behind a successful write (seen live on Copper).
  const P1 = await page.evaluate(async () => {
    __setup(); __open(); __fill({ Copper: "0.30" }, { source: "Test" });
    __review();
    window.__staleReads = 2; // read-back and first re-read stale, second re-read correct
    const r = await __confirm();
    return { ok: r && r.ok, patience: r && r.patienceReads, writes: window.__writes.filter(w => w.sheet).length,
      addresses: window.__writes.flatMap(w => w.addresses || []), spotReads: window.__spotReads,
      title: (document.querySelector("#spotPriceUpdatePanel .spot-update-title") || {}).textContent, text: __resultText(),
      done: !!document.getElementById("spotResultDoneBtn"), sheet: __sheet() };
  });
  ok(P1.ok && P1.title === "Prices updated" && P1.done, `P1 A LAGGING READ-BACK ENDS IN "Prices updated" once a re-read sees all three cells (${P1.title}: ${P1.text.slice(0, 80)})`);
  ok(P1.writes === 1 && JSON.stringify(P1.addresses) === JSON.stringify(["B6", "C6", "D6"]),
    `P2 EXACTLY ONE SET OF WRITES — the re-reads never write (${P1.writes} write calls: ${JSON.stringify(P1.addresses)})`);
  ok(P1.patience === 2 && P1.spotReads === 3, `P3 it stopped re-reading as soon as everything matched (patience reads ${P1.patience}, sheet reads ${P1.spotReads})`);
  ok(P1.sheet[5][1] === 0.3 && P1.sheet[5][3] === "Test", "P4 the mock sheet holds the Copper values");

  const P5 = await page.evaluate(async () => {
    __setup(); __open(); __fill({ Copper: "0.30" }, { source: "Test" });
    __review();
    window.__staleReads = 99; // never matches
    const r = await __confirm();
    const copper = ((r && r.perMetal) || []).find(p => p.metal === "Copper") || {};
    return { ok: r && r.ok, patience: r && r.patienceReads, writes: window.__writes.filter(w => w.sheet).length,
      status: copper.status, detail: copper.detail, title: (document.querySelector("#spotPriceUpdatePanel .spot-update-title") || {}).textContent,
      text: __resultText(), check: !!document.getElementById("spotCheckBtn"), retry: !!document.getElementById("spotRetryBtn") };
  });
  ok(!P5.ok && P5.title === "Not updated" && P5.status === "partly written" && /source is "Manual", expected "Test"/.test(P5.detail || ""),
    `P5 A READ-BACK THAT NEVER MATCHES ends "partly written" with the details (${P5.status}: ${P5.detail})`);
  ok(P5.patience === 3 && P5.writes === 1, `P6 three re-reads at most, and still only one set of writes (patience ${P5.patience}, writes ${P5.writes})`);
  ok(P5.check && !P5.retry && /Check what's in the workbook before trying again/.test(P5.text), "P7 the way on is 'Check what's in the workbook' — no direct retry");

  const P8 = await page.evaluate(async () => {
    __setup(); __open(); __fill({ Silver: "32" }, { source: "Test" });
    __review();
    window.__failOnCall = 1; window.__staleReads = 99;
    const single = await __confirm();
    const singleReads = window.__spotReads;
    // Two metals: Silver's write lands, Gold's write call fails. Gold must get no patience.
    __setup(); __open(); __fill({ Silver: "32", Gold: "2700" }, { source: "Test" });
    __review();
    window.__failOnCall = 2;
    const two = await __confirm();
    const statuses = Object.fromEntries(((two && two.perMetal) || []).map(p => [p.metal, p.status]));
    return { singlePatience: single && single.patienceReads, singleReads, twoPatience: two && two.patienceReads, twoReads: window.__spotReads,
      statuses, writes: window.__writes.filter(w => w.sheet).length };
  });
  ok(P8.singlePatience === 0 && P8.singleReads === 1, `P8 A FAILED WRITE CALL GETS NO PATIENCE RE-READS (patience ${P8.singlePatience}, sheet reads ${P8.singleReads})`);
  ok(P8.twoPatience === 0 && P8.twoReads === 1 && P8.statuses.Silver === "written" && P8.statuses.Gold === "not written",
    `P9 with Silver written and Gold's call failed, Gold is reported as it stands with no re-reads (patience ${P8.twoPatience}, ${JSON.stringify(P8.statuses)})`);

  const P10 = await page.evaluate(async () => {
    __setup(); __open(); __fill({ Copper: "0.30" }, { source: "Test" });
    __review();
    let release; window.__holdWrites = new Promise(r => { release = r; });
    __setSpotPricePatienceDelaysForTest([400, 20, 40]);
    window.__staleReads = 1;
    document.getElementById("spotReviewConfirmBtn").click();
    await new Promise(r => setTimeout(r, 50));
    const look = () => ({
      stage: __getSpotUpdateStateForTest().stage,
      disc: !!document.querySelector("#spotPriceUpdatePanel .section-loading .section-loading-disc"),
      text: (document.getElementById("spotWriteProgress") || {}).textContent || "",
      buttons: document.querySelectorAll("#spotPriceUpdatePanel button").length });
    const writing = look();
    release(); window.__holdWrites = null;
    await __waitStage(["verifying"]);
    const verifying = look();
    const stage = await __waitStage(["result"], 3000);
    // The Checking stage, via the check button after a never-matching attempt.
    __setup(); __open(); __fill({ Copper: "0.30" }, { source: "Test" });
    __review(); window.__staleReads = 99;
    await __confirm();
    window.__staleReads = 0;
    document.getElementById("spotCheckBtn").click();
    const checking = look();
    await __waitStage(["result", "checked"]);
    return { writing, verifying, checking, stage };
  });
  const keep = "this can take up to a minute. Please keep this page open.";
  ok(P10.writing.stage === "writing" && P10.writing.disc && P10.writing.buttons === 0 && P10.writing.text === "Writing to the workbook… " + keep,
    `P10 WRITING shows the spinning coin, the keep-open wording and no buttons (${JSON.stringify(P10.writing)})`);
  ok(P10.verifying.stage === "verifying" && P10.verifying.disc && P10.verifying.buttons === 0 && P10.verifying.text.endsWith(keep),
    `P11 VERIFYING shows the spinning coin and no buttons (${JSON.stringify(P10.verifying)})`);
  ok(P10.checking.stage === "checking" && P10.checking.disc && P10.checking.buttons === 0 && P10.checking.text.endsWith(keep),
    `P12 CHECKING shows the spinning coin and no buttons (${JSON.stringify(P10.checking)})`);
  ok(P10.stage === "result", "P13 the verifying stage then reaches the result");

  const P14 = await page.evaluate(async () => {
    __setup();
    let resolveReload; window.refreshLiveCoinsAfterWrite = () => { window.__reloads++; return new Promise(r => { resolveReload = r; }); };
    __open(); __fill({ Silver: "32" }, { source: "Test" }); __review();
    await __confirm();
    const pending = __resultText();
    resolveReload(true);
    await new Promise(r => setTimeout(r, 30));
    const done = __resultText();
    __setup();
    window.refreshLiveCoinsAfterWrite = () => Promise.resolve(false);
    __open(); __fill({ Silver: "33" }, { source: "Test" }); __review();
    await __confirm();
    await new Promise(r => setTimeout(r, 30));
    const failed = __resultText();
    return { pending, done, failed };
  });
  ok(/Reloading coin data so melt values use the new prices/.test(P14.pending), "P14 the reload line shows while the reload runs");
  ok(/Coin data reloaded\./.test(P14.done) && !/Reloading coin data/.test(P14.done), `P15 THE RELOAD LINE RESOLVES to "Coin data reloaded." (${P14.done.slice(-60)})`);
  ok(/Couldn't reload coin data just now/.test(P14.failed) && !/Reloading coin data/.test(P14.failed), "P16 a failed reload says so instead of spinning forever");

  // ---------- K. flag ----------
  const K = await page.evaluate(() => {
    __setup(); __setSpotPriceWriteEnabledForTest(false); navigate("stats");
    const shown = !!document.getElementById("spotPriceUpdateBtn");
    __setSpotPriceWriteEnabledForTest(null);
    return { shown, flag: ENABLE_SPOT_PRICE_WRITE };
  });
  ok(K.flag === true && !K.shown, "K1 gated by ENABLE_SPOT_PRICE_WRITE (on in both targets); off hides the button");

  await page.evaluate(() => {
    window.refreshLiveCoinsAfterWrite = window.__origRefresh;
    __setGraphClientForTest(null); __setLiveDataModeForTest(null); __setLiveCoinsForTest(null);
    __resetSpotPricesForTest(); __resetAllHeaderMapForTest(); navigate("dashboard");
  });
}, module);
