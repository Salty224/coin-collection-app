// Ledger: value by metal + fine ounces held (Ray, Oct 2026).
//
// Recorded = All.Value ONLY, Melt = All.SpotValue ONLY. A blank Value is
// "no recorded value", never melt — coin.value (which falls back to
// SpotValue) is deliberately left alone for the coin page and the existing
// totals. Each coin's whole value goes in its main metal bucket ("Other"
// for none); fine ounces come from DB_Coins via the CoinID specs join.
// Owned coins only, same coin set as the By Denomination view.

const { defineSuite } = require("./harness");

module.exports = defineSuite("ledger-value-by-metal", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ---------- A. mapper keeps the two columns apart ----------
  const A = await page.evaluate(() => {
    const base = { CollectionID: "AY-1", Denomination: "1C", Year: 1900 };
    const both = mapWorkbookRowToCoin(Object.assign({}, base, { Value: 30, SpotValue: 25 }));
    const blankValue = mapWorkbookRowToCoin(Object.assign({}, base, { Value: "", SpotValue: 66.16 }));
    const neither = mapWorkbookRowToCoin(Object.assign({}, base, { Value: "", SpotValue: "" }));
    const zero = mapWorkbookRowToCoin(Object.assign({}, base, { Value: 0, SpotValue: 0.01 }));
    return { both, blankValue, neither, zero };
  });
  ok(A.both.recordedValue === 30 && A.both.meltValue === 25, "A1 Value and SpotValue map to recordedValue / meltValue");
  ok(A.blankValue.recordedValue === null, `A2 a blank Value maps to recordedValue null, not SpotValue (got ${A.blankValue.recordedValue})`);
  ok(A.blankValue.meltValue === 66.16, "A3 meltValue is SpotValue on its own");
  ok(A.blankValue.value === 66.16, "A4 coin.value still falls back to SpotValue (left unchanged, Ray's call)");
  ok(A.neither.recordedValue === null && A.neither.meltValue === null, "A5 both blank map to null, not 0");
  ok(A.zero.recordedValue === 0, "A6 a real 0 Value stays a recorded 0 (not blank)");

  const specsHasCuNi = await page.evaluate(() => {
    const idx = buildCoinSpecsIndexes([{ CoinID: "C-1", CopperOz: 0.25, NickelOz: 0.08 }], []);
    return idx.byCoinId["C-1"];
  });
  ok(specsHasCuNi.copperOz === 0.25 && specsHasCuNi.nickelOz === 0.08, "A7 DB_Coins CopperOz / NickelOz reach coin specs");

  // ---------- B. the Ledger view itself ----------
  const fixtures = () => page.evaluate(() => {
    const c = (o) => Object.assign({ status: "Owned", cost: 0, value: 0, faceValue: null, metalCategory: "",
      composition: "", specs: {}, recordedValue: null, meltValue: null, name: "x", year: 1900, mint: "" }, o);
    __setLiveDataModeForTest("live");
    __setLiveCoinsForTest([
      // Silver, Value set
      c({ id: "AY-80001", denom: "$1", metalCategory: "Silver", recordedValue: 30, meltValue: 25, value: 30, specs: { silverOz: 0.7734 } }),
      // Mixed metal: 40% silver half — whole value in Silver, oz split in the fine-oz list
      c({ id: "AY-80002", denom: "50C", metalCategory: "Silver", recordedValue: 12, meltValue: 6, value: 12, specs: { silverOz: 0.1479, copperOz: 0.2 } }),
      // No metal: Other, Value set, SpotValue blank
      c({ id: "AY-80003", denom: "1C", metalCategory: "", recordedValue: 5, meltValue: null, value: 5 }),
      // Blank Value, SpotValue set — coin.value falls back to melt exactly as the mapper does
      c({ id: "AY-80004", denom: "$1", metalCategory: "Gold", recordedValue: null, meltValue: 2000, value: 2000, specs: { goldOz: 1 } }),
      // Excluded: exited and medal
      c({ id: "AY-80005", denom: "$1", metalCategory: "Silver", status: "Sold", recordedValue: 999, meltValue: 999, value: 999, specs: { silverOz: 5 } }),
      c({ id: "AY-80006", denom: "Medal", metalCategory: "Silver", recordedValue: 777, meltValue: 777, value: 777, specs: { silverOz: 7 } })
    ]);
    navigate("stats");
    const rows = [...document.querySelectorAll("#statsMetalBreakdown .metal-row")].map(r => ({
      metal: r.dataset.metal,
      count: r.querySelector(".metal-count").textContent.trim(),
      recorded: r.querySelector(".metal-recorded").textContent.trim(),
      melt: r.querySelector(".metal-melt").textContent.trim(),
      text: r.textContent.replace(/\s+/g, " ").trim()
    }));
    const oz = [...document.querySelectorAll("#statsFineOunces .fine-oz-row")].map(r => ({
      metal: r.dataset.metal, text: r.querySelector(".stat-row-value").textContent.trim()
    }));
    const overflow = document.documentElement.scrollWidth > window.innerWidth;
    __setLiveCoinsForTest(null);
    __setLiveDataModeForTest(null);
    navigate("dashboard");
    return { rows, oz, overflow };
  });

  const B = await fixtures();
  const row = m => B.rows.find(r => r.metal === m) || {};
  ok(B.rows.map(r => r.metal).join(",") === "Gold,Silver,Other", `B1 buckets in metal order: Gold, Silver, Other (got ${B.rows.map(r => r.metal).join(",")})`);
  ok(row("Silver").count === "2 coins", `B2 mixed-metal coin counted once, in its main bucket (Silver count ${row("Silver").count})`);
  ok(row("Silver").recorded === "Recorded $42.00" && row("Silver").melt === "Melt $31.00", `B3 Silver recorded/melt summed separately (${row("Silver").recorded} / ${row("Silver").melt})`);
  ok(row("Other").count === "1 coin" && row("Other").recorded === "Recorded $5.00", "B4 no-metal coin lands in Other with its recorded value");
  ok(row("Other").melt === "Melt —" && /\(1 blank\)/.test(row("Other").text), "B5 a blank SpotValue shows as no melt value, with a blank count");
  ok(row("Gold").recorded === "Recorded —", `B6 BLANK VALUE IS NOT COUNTED AS RECORDED VALUE (Gold shows "${row("Gold").recorded}")`);
  ok(row("Gold").melt === "Melt $2,000.00", "B7 the same coin's melt still shows under Melt");
  ok(!B.rows.some(r => /\$999|\$777/.test(r.text)), "B8 exited and medal rows excluded");
  const oz = m => (B.oz.find(r => r.metal === m) || {}).text;
  ok(oz("Silver") === "0.9213 oz", `B9 fine silver oz summed across owned coins (${oz("Silver")})`);
  ok(oz("Copper") === "0.2000 oz" && oz("Gold") === "1.0000 oz", "B10 mixed coin's copper oz listed separately; gold oz listed");
  ok(B.oz.map(r => r.metal).join(",") === "Gold,Silver,Copper", `B11 metals with no content are omitted (got ${B.oz.map(r => r.metal).join(",")})`);
  ok(!B.overflow, "B12 no horizontal overflow");

  // ---------- C. no demo or filler data ----------
  const C = await page.evaluate(() => {
    const out = {};
    for (const mode of ["offline", "live"]) {
      __setLiveDataModeForTest(mode);
      __setLiveCoinsForTest(null);
      navigate("stats");
      out[mode] = {
        metal: document.getElementById("statsMetalBreakdown").textContent.trim(),
        oz: document.getElementById("statsFineOunces").textContent.trim(),
        rows: document.querySelectorAll("#statsMetalBreakdown .metal-row, #statsFineOunces .fine-oz-row").length
      };
    }
    __setLiveDataModeForTest(null);
    navigate("dashboard");
    return out;
  });
  for (const mode of ["offline", "live"]) {
    ok(C[mode].rows === 0 && /Shows once the live workbook has loaded/.test(C[mode].metal) && /Shows once/.test(C[mode].oz),
      `C1 [${mode}] with no live coins loaded, both views say so and show no figures (no demo data)`);
  }

  // ---------- D. existing denomination view untouched ----------
  const D = await page.evaluate(() => {
    __setLiveDataModeForTest("live");
    __setLiveCoinsForTest([{ id: "AY-80010", denom: "$1", status: "Owned", cost: 0, value: 66.16, recordedValue: null, meltValue: 66.16, metalCategory: "Silver", specs: {} }]);
    navigate("stats");
    const denom = document.querySelector("#statsBreakdown .stat-row-value").textContent.trim();
    const total = document.getElementById("statTotalValue").textContent.trim();
    __setLiveCoinsForTest(null); __setLiveDataModeForTest(null); navigate("dashboard");
    return { denom, total };
  });
  ok(D.denom === "1 · $66.16" && D.total === "$66.16", `D1 existing By Denomination / Est. value still read coin.value unchanged (${D.denom}, ${D.total})`);
  // ---------- E. gold bullion denominations join the metal views ----------
  // By Denomination lists only STATS_DENOM_ORDER, which has no $5/$10/$25/
  // $50/$100. The metal views now count any owned non-medal coin with metal
  // content too, so Gold Eagles land under Gold. Sets stay out. By
  // Denomination and the tiles must be exactly what they were.
  const E = await page.evaluate(() => {
    const c = (o) => Object.assign({ status: "Owned", cost: 0, value: 0, faceValue: null, metalCategory: "",
      composition: "", specs: {}, recordedValue: null, meltValue: null, name: "x", year: 2000, mint: "" }, o);
    __setLiveDataModeForTest("live");
    __setLiveCoinsForTest([
      c({ id: "AY-81001", denom: "$1", metalCategory: "Silver", recordedValue: 30, meltValue: 25, value: 30, specs: { silverOz: 0.7734 } }),
      // $50 American Gold Eagle, 1 oz
      c({ id: "AY-81002", denom: "$50", metalCategory: "Gold", recordedValue: 2900, meltValue: 2700, value: 2900, specs: { goldOz: 1 } }),
      // $5 gold (Half Eagle), 0.2419 oz
      c({ id: "AY-81003", denom: "$5", metalCategory: "Gold", recordedValue: 600, meltValue: 650, value: 600, specs: { goldOz: 0.2419 } }),
      // Unlisted denomination with NO metal content: stays out
      c({ id: "AY-81004", denom: "$3", metalCategory: "", recordedValue: 40, meltValue: null, value: 40 }),
      // Set bundle carrying metal: stays out
      c({ id: "AY-81005", denom: "Multiple", metalCategory: "Silver", recordedValue: 100, meltValue: 90, value: 100, specs: { silverOz: 2 } })
    ]);
    navigate("stats");
    const text = el => el.textContent.replace(/\s+/g, " ").trim();
    const out = {
      metal: [...document.querySelectorAll("#statsMetalBreakdown .metal-row")].map(r => ({
        metal: r.dataset.metal, count: text(r.querySelector(".metal-count")),
        recorded: text(r.querySelector(".metal-recorded")), melt: text(r.querySelector(".metal-melt")) })),
      oz: [...document.querySelectorAll("#statsFineOunces .fine-oz-row")].map(r => [r.dataset.metal, text(r.querySelector(".stat-row-value"))]),
      denom: [...document.querySelectorAll("#statsBreakdown .stat-row")].map(r => [text(r.querySelector(".stat-row-label")), text(r.querySelector(".stat-row-value"))]),
      tiles: ["statTotalItems", "statItemsSub", "statTotalSpent", "statTotalValue", "statNetGain"].map(id => text(document.getElementById(id)))
    };
    __setLiveCoinsForTest(null); __setLiveDataModeForTest(null); navigate("dashboard");
    return out;
  });
  const eRow = m => E.metal.find(r => r.metal === m) || {};
  ok(eRow("Gold").count === "2 coins", `E1 GOLD BULLION IN BY METAL: $50 Gold Eagle and $5 gold coin counted under Gold (count ${eRow("Gold").count || "none"})`);
  ok(eRow("Gold").recorded === "Recorded $3,500.00" && eRow("Gold").melt === "Melt $3,350.00", `E2 Gold recorded/melt include both bullion coins (${eRow("Gold").recorded} / ${eRow("Gold").melt})`);
  const eOz = Object.fromEntries(E.oz);
  ok(eOz.Gold === "1.2419 oz", `E3 GOLD BULLION IN FINE OUNCES: bullion gold ounces counted (Gold ${eOz.Gold || "none"})`);
  ok(eRow("Silver").count === "1 coin" && eOz.Silver === "0.7734 oz", "E4 Set bundle excluded from By Metal and Fine Ounces (Silver is the $1 alone)");
  ok(!E.metal.some(r => r.metal === "Other"), "E5 an unlisted denomination with no metal content stays out");
  ok(JSON.stringify(E.denom) === JSON.stringify([["Dollars", "1 · $30.00"]]),
    `E6 By Denomination rows unchanged: bullion, Set and $3 rows still not listed (got ${JSON.stringify(E.denom)})`);
  ok(JSON.stringify(E.tiles) === JSON.stringify(["5", "5 coins, 0 medals", "$0.00", "$3,670.00", "+$3,670.00"]),
    `E7 Ledger totals unchanged (got ${JSON.stringify(E.tiles)})`);
}, module);
