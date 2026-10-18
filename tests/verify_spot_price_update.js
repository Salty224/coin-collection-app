// Ledger: manual "Update prices" panel for Ref_SpotPrices (Ray, Oct 2026).
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
      let calls = 0;
      const WRITE_METHODS = ["patchWorkbookRanges", "addTableRow", "uploadJson", "uploadFile", "uploadBytes", "putContent", "deleteItem"];
      const spy = new Proxy(mock, { get(target, k) {
        const v = target[k];
        if (!WRITE_METHODS.includes(k) || typeof v !== "function") return typeof v === "function" ? v.bind(target) : v;
        return (...args) => {
          calls++;
          if (k === "patchWorkbookRanges") {
            window.__writes.push({ sheet: args[1], addresses: args[2].map(e => e.address), edits: JSON.parse(JSON.stringify(args[2])) });
            if (window.__failOnCall === calls) return Promise.reject(new Error("simulated Graph 503"));
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
      if (opts && "source" in opts) document.getElementById("spotEditSource").value = opts.source;
      if (opts && "date" in opts) document.getElementById("spotEditDate").value = opts.date;
    };
    // Returns a copy of the stage at this moment (the live state object is mutated later).
    window.__review = () => { document.getElementById("spotEditReviewBtn").click(); return { stage: __getSpotUpdateStateForTest().stage }; };
    window.__errors = () => {
      const out = {};
      ["Silver", "Gold", "Platinum", "Palladium", "Source", "Date"].forEach(k => { const e = document.getElementById("spotErr" + k); if (e && e.textContent) out[k] = e.textContent; });
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
      editable: ["Silver", "Gold", "Platinum", "Palladium"].map(m => inp(m) && inp(m).type === "text" && inp(m).inputMode === "decimal" && inp(m).value === ""),
      copperInput: !!inp("Copper"), nickelInput: !!inp("Nickel"),
      readonlyShown: [...document.querySelectorAll(".spot-edit-readonly")].map(r => r.dataset.metal).join(","),
      goldNow: document.querySelector('.spot-edit-row[data-metal="Gold"] .spot-edit-now').textContent,
      source: document.getElementById("spotEditSource").value,
      date: document.getElementById("spotEditDate").value,
      max: document.getElementById("spotEditDate").max,
      today: excelSerialToISODate(window.__T),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      writes: window.__writes.length
    };
  });
  ok(B.editable.every(Boolean), "B1 Silver/Gold/Platinum/Palladium each have a blank text input with a decimal keypad");
  ok(!B.copperInput && !B.nickelInput && B.readonlyShown === "Copper,Nickel", "B2 Copper and Nickel are shown read-only with no input");
  ok(/Now \$2,650\.50 · \d{4}-\d{2}-\d{2}/.test(B.goldNow), `B3 each metal shows its current price and last-updated date (${B.goldNow})`);
  ok(B.source === "Kitco", "B4 Source prefilled from the sheet");
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
  ok(C9.stage === "edit" && /source/i.test(C9.errors.Source || ""), "C9 a blank Source is rejected");

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
    __setup(); __open(); __fill({ Silver: "32.10" });
    __review();
    const result = await __confirm();
    return { result, writes: window.__writes, sheet: __sheet(), base: window.__baseGrid(), fmt: window.__mock._numberFormats.Ref_SpotPrices[2][2], text: __resultText(), reloads: window.__reloads,
      shown: (document.querySelector('#statsSpotPrices .spot-price-row[data-metal="Silver"] .spot-price-value') || {}).textContent };
  });
  ok(F.writes.length === 1 && F.writes[0].sheet === "Ref_SpotPrices", "F1 one metal: one write call, to Ref_SpotPrices only");
  ok(JSON.stringify(F.writes[0].addresses) === JSON.stringify(["B3", "C3", "D3"]), `F2 EXACT ADDRESSES for one metal: B3, C3, D3 (got ${JSON.stringify(F.writes[0].addresses)})`);
  ok(F.sheet[2][1] === 32.1 && F.sheet[2][2] === F.base[2][2] + 2 && F.sheet[2][3] === "Kitco", "F3 Silver's price, today's date (as a serial number) and Source written");
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

  // ---------- H. Copper / Nickel can't be edited ----------
  const H = await page.evaluate(() => {
    __setup(); __open();
    setSpotPriceInputs({ Copper: "0.30", Nickel: "0.5" });
    const v = validateSpotPriceUpdate({ prices: { Copper: "0.30", Nickel: "0.5" }, bigOk: {}, source: "x", date: excelSerialToISODate(window.__T) }, {}, window.__T);
    const forged = planSpotPriceWrite({ address: "Ref_SpotPrices!A1:D11", values: window.__baseGrid(), formulas: [], numberFormat: [] },
      { changes: [{ metal: "Copper", newPrice: 0.3 }], dateSerial: window.__T, source: "x" }, spotPriceSnapshot(spotDetailToRows({ values: window.__baseGrid() })));
    return { copperInput: !!document.getElementById("spotEditCopper"), changes: v.changes.length, nothing: v.nothing, forged: forged.refusal || null, forgedEdits: (forged.edits || []).length };
  });
  ok(!H.copperInput && H.changes === 0 && H.nothing, "H1 Copper/Nickel values never become a change");
  ok(H.forged && /Copper can't be updated here/.test(H.forged) && H.forgedEdits === 0, `H2 COPPER ROW NEVER WRITTEN: even a forged Copper change is refused (${H.forged})`);

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
