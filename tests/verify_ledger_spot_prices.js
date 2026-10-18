// Ledger: spot prices from Ref_SpotPrices, READ ONLY (Ray, Oct 2026).
//
// Drives the REAL read path — loadSpotPrices() -> fetchWorkbookSheetRows()
// -> fetch(GET usedRange) — with only the token and the network stubbed, and
// spies on every outgoing request plus the Graph write client to prove the
// feature never writes. Covers fresh and stale rows, a missing sheet (404),
// an empty sheet, a failed read, and demo/offline mode.

const { defineSuite } = require("./harness");

module.exports = defineSuite("ledger-spot-prices", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  await page.evaluate(() => {
    window.__requests = [];
    window.__graphCalls = [];
    // Any graph() client method call is recorded — the feature must make none.
    const spy = new Proxy({}, { get: (_, k) => (...args) => { window.__graphCalls.push(String(k)); return Promise.resolve(null); } });
    __setGraphClientForTest(spy);
    window.__realFetch = window.fetch;
    window.__realToken = window.getLiveNavToken;
    window.getLiveNavToken = async () => "test-token";
    window.__sheetResponse = null; // { status, values }
    window.fetch = async (url, opts) => {
      const method = (opts && opts.method) || "GET";
      window.__requests.push({ url: String(url), method });
      if (String(url).includes("Ref_SpotPrices") && window.__sheetResponse) {
        const r = window.__sheetResponse;
        return new Response(JSON.stringify({ values: r.values || [] }), { status: r.status, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 404 });
    };
    window.__run = async (response) => {
      window.__sheetResponse = response;
      __resetSpotPricesForTest();
      __setLiveDataModeForTest("live");
      navigate("stats");
      await loadSpotPrices();
      const rows = [...document.querySelectorAll("#statsSpotPrices .spot-price-row")].map(r => ({
        metal: r.dataset.metal, stale: r.dataset.stale,
        value: r.querySelector(".spot-price-value").textContent.trim(),
        meta: r.querySelector(".spot-price-meta").textContent.trim()
      }));
      const note = document.getElementById("spotPriceNote");
      return { rows, note: note ? note.textContent.trim() : null, overflow: document.documentElement.scrollWidth > window.innerWidth };
    };
  });

  const H = ["Metal", "PricePerTroyOz", "LastUpdated", "Source"];
  const today = await page.evaluate(() => excelSerialToday());

  // ---------- A. fresh, stale, boundary, no date ----------
  const A = await page.evaluate((v) => window.__run({ status: 200, values: v }), [
    H,
    ["Silver", 31.42, today - 2, "Kitco"],
    ["Gold", 2650.5, today - 10, "Kitco"],
    ["Platinum", 980, today - 7, "Kitco"],
    ["Palladium", 1012.25, "", "Kitco"],
    ["Copper", 0.2841, today, "Manual"],
    ["Nickel", 0.4902, today - 30, "Manual"],
    ["", "", "", ""]
  ]);
  const r = m => A.rows.find(x => x.metal === m) || {};
  ok(A.rows.map(x => x.metal).join(",") === "Gold,Silver,Platinum,Palladium,Copper,Nickel", `A1 all six prices shown in fixed order, blank row skipped (got ${A.rows.map(x => x.metal).join(",")})`);
  ok(r("Silver").stale === "false" && !/stale/.test(r("Silver").meta), "A2 a price updated 2 days ago is fresh");
  ok(r("Gold").stale === "true" && /· stale$/.test(r("Gold").meta), `A3 STALE DATE SHOWN AS STALE: 10 days old is marked stale ("${r("Gold").meta}")`);
  ok(r("Platinum").stale === "false", "A4 exactly 7 days old is not stale (more than 7 is)");
  ok(r("Palladium").stale === "true" && /no date/.test(r("Palladium").meta), "A5 a blank LastUpdated shows 'no date' and counts as stale");
  ok(r("Nickel").stale === "true", "A6 30 days old is stale");
  ok(r("Silver").value === "$31.42 / oz" && r("Gold").value === "$2,650.50 / oz", "A7 prices per troy oz formatted as currency");
  ok(r("Copper").value === "$0.2841 / oz", "A8 a sub-$10 price keeps 4 decimals");
  const expectDate = await page.evaluate(t => excelSerialToISODate(t - 2), today);
  ok(r("Silver").meta === "Updated " + expectDate + " · Kitco", `A9 last-updated date and source shown ("${r("Silver").meta}")`);
  ok(!A.overflow, "A10 no horizontal overflow");

  // ---------- B. ISO-text date tolerated ----------
  const isoToday = await page.evaluate(t => excelSerialToISODate(t), today);
  const B = await page.evaluate((v) => window.__run({ status: 200, values: v }), [H, ["Silver", 30, isoToday, "Kitco"]]);
  ok(B.rows.length === 1 && B.rows[0].stale === "false", "B1 an ISO-text LastUpdated is read as a date");

  // ---------- C. missing, empty, failed ----------
  const C1 = await page.evaluate(() => window.__run({ status: 404 }));
  ok(C1.rows.length === 0 && C1.note === "No Ref_SpotPrices sheet found in the workbook.", `C1 missing sheet: plain message (${C1.note})`);
  const C2 = await page.evaluate(() => window.__run({ status: 200, values: [] }));
  ok(C2.rows.length === 0 && C2.note === "No spot prices on file in Ref_SpotPrices.", `C2 empty sheet: plain message (${C2.note})`);
  const C3 = await page.evaluate(() => window.__run({ status: 200, values: [["Metal", "PricePerTroyOz", "LastUpdated", "Source"]] }));
  ok(C3.note === "No spot prices on file in Ref_SpotPrices.", "C3 header-only sheet: same plain message");
  const C4 = await page.evaluate(() => window.__run({ status: 500 }));
  ok(C4.note === "Couldn't load spot prices; will try again when you reopen the Ledger.", `C4 failed read: plain message (${C4.note})`);

  // ---------- D. zero writes ----------
  const D = await page.evaluate(() => {
    const spot = window.__requests.filter(x => x.url.includes("Ref_SpotPrices"));
    return {
      spotCount: spot.length,
      spotAllGet: spot.every(x => x.method === "GET" && /usedRange\(valuesOnly=true\)/.test(x.url)),
      nonGet: window.__requests.filter(x => x.method !== "GET"),
      graphCalls: window.__graphCalls.slice()
    };
  });
  ok(D.spotCount >= 6 && D.spotAllGet, `D1 every Ref_SpotPrices request is a GET usedRange read (${D.spotCount} requests)`);
  ok(D.nonGet.length === 0, `D2 zero non-GET requests of any kind (got ${JSON.stringify(D.nonGet)})`);
  ok(D.graphCalls.length === 0, `D3 zero Graph write-client calls (got ${D.graphCalls.join(",") || "none"})`);

  // ---------- E. offline / demo mode: no fetch, no demo prices ----------
  const E = await page.evaluate(async () => {
    const spotReqs = () => window.__requests.filter(x => x.url.includes("Ref_SpotPrices")).length;
    const before = spotReqs();
    __resetSpotPricesForTest();
    __setLiveDataModeForTest("offline");
    navigate("stats");
    await loadSpotPrices();
    const note = document.getElementById("spotPriceNote");
    return { fetched: spotReqs() - before, rows: document.querySelectorAll("#statsSpotPrices .spot-price-row").length, note: note && note.textContent };
  });
  ok(E.fetched === 0 && E.rows === 0 && /signed in/.test(E.note || ""), "E1 offline mode makes no request and shows no prices, just a note");

  await page.evaluate(() => {
    window.fetch = window.__realFetch; window.getLiveNavToken = window.__realToken;
    __setGraphClientForTest(null); __setLiveDataModeForTest(null); __resetSpotPricesForTest(); navigate("dashboard");
  });
}, module);
