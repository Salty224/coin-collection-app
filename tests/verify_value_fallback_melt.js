// Task (g): value fallback, display only (Ray, 27-30 Oct 2026).
//
// A blank All.Value no longer shows melt (All.SpotValue) as if it were value.
// coinValueFigure() says valued / melt / face / none; the 12 display sites
// label melt "melt", the Ledger keeps Valued, Melt and face-only apart, Sets
// get a Variety line (default "Standard"), and the album star is filled for
// Key Date / Key Variety, outline for Semi-Key Date, none otherwise.
// Nothing here writes to the workbook.

const { defineSuite } = require("./harness");

module.exports = defineSuite("value-fallback-melt", async ({ check, selfCheck, openApp, PHONE }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp(PHONE);

  // Live coins as the real mapper builds them, so the fields are the real ones.
  await page.evaluate(() => {
    window.__mk = (id, o) => {
      const row = Object.assign({ CollectionID: id, Denomination: "1C", Year: 1964, Status: "Owned", Cost: 0 }, o || {});
      return mapWorkbookRowToCoin(row);
    };
    window.__txt = el => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);
  });

  // ---------- A. the helper matrix ----------
  const A = await page.evaluate(() => {
    const f = o => coinValueFigure(__mk("AY-1", o));
    return {
      valued: f({ Value: 30, SpotValue: 25 }),
      meltOnly: f({ Value: "", SpotValue: 66.16 }),
      meltZeroNoFace: f({ Value: "", SpotValue: 0 }),
      meltZeroFace: f({ Value: "", SpotValue: 0, FaceValue: 0.01 }),
      neither: f({ Value: "", SpotValue: "" }),
      neitherFace: f({ Value: "", SpotValue: "", FaceValue: 0.25 }),
      recordedZero: f({ Value: 0, SpotValue: 5 }),
      belowFace: f({ Value: 0.004, SpotValue: 5, FaceValue: 0.01 }),
      meltBelowFace: f({ Value: "", SpotValue: 0.003, FaceValue: 0.01 }),
      meltEqualFace: f({ Value: "", SpotValue: 0.01, FaceValue: 0.01 }),
      meltAboveFace: f({ Value: "", SpotValue: 0.011, FaceValue: 0.01 }),
      meltBelowFaceDime: f({ Value: "", SpotValue: 0.09, FaceValue: 0.1 }),
      meltNoFace: f({ Value: "", SpotValue: 0.003 }),
      meltBelowFaceRaw: __mk("AY-3", { Value: "", SpotValue: 0.003, FaceValue: 0.01 }).meltValue,
      demo: coinValueFigure({ id: "AY-D", value: 850 }),
      demoBlank: coinValueFigure({ id: "AY-D2" }),
      mappedValue: __mk("AY-2", { Value: "", SpotValue: 66.16 }).value
    };
  });
  ok("A1 a recorded Value is basis valued, SpotValue ignored", A.valued.basis === "valued" && A.valued.amount === 30, A.valued);
  ok("A2 blank Value + SpotValue > 0 is basis melt, amount = SpotValue as read", A.meltOnly.basis === "melt" && A.meltOnly.amount === 66.16, A.meltOnly);
  ok("A3 SpotValue = 0 is NOT melt: no face -> none", A.meltZeroNoFace.basis === "none" && A.meltZeroNoFace.amount === 0, A.meltZeroNoFace);
  ok("A4 SpotValue = 0 with a face value -> face", A.meltZeroFace.basis === "face" && A.meltZeroFace.amount === 0.01, A.meltZeroFace);
  ok("A5 neither Value nor SpotValue, no face -> none", A.neither.basis === "none", A.neither);
  ok("A6 neither Value nor melt, with face -> face at the face amount", A.neitherFace.basis === "face" && A.neitherFace.amount === 0.25, A.neitherFace);
  ok("A7 a recorded 0 is still a recorded value (valued), not melt", A.recordedZero.basis === "valued" && A.recordedZero.amount === 0, A.recordedZero);
  ok("A8 recorded Value below face stays 'valued' and is floored to face", A.belowFace.basis === "valued" && A.belowFace.amount === 0.01, A.belowFace);
  ok("A9 melt above 0 but BELOW face is basis face at the face amount (Ray, 30 Oct), not melt", A.meltBelowFace.basis === "face" && A.meltBelowFace.amount === 0.01 && A.meltBelowFaceDime.basis === "face" && A.meltBelowFaceDime.amount === 0.1, { c: A.meltBelowFace, d: A.meltBelowFaceDime });
  ok("A9b melt EQUAL to face stays melt, amount = SpotValue", A.meltEqualFace.basis === "melt" && A.meltEqualFace.amount === 0.01, A.meltEqualFace);
  ok("A9c melt just above face stays melt at the unrounded SpotValue (no floor, nothing calculated)", A.meltAboveFace.basis === "melt" && A.meltAboveFace.amount === 0.011, A.meltAboveFace);
  ok("A9d melt above 0 with NO face value is still melt", A.meltNoFace.basis === "melt" && A.meltNoFace.amount === 0.003, A.meltNoFace);
  ok("A9e meltValue itself is still exactly All.SpotValue for a below-face coin", A.meltBelowFaceRaw === 0.003, A.meltBelowFaceRaw);
  ok("A10 a demo row (no recordedValue/meltValue) counts its value as valued", A.demo.basis === "valued" && A.demo.amount === 850, A.demo);
  ok("A11 a demo row with nothing is none", A.demoBlank.basis === "none", A.demoBlank);
  ok("A12 coin.value no longer falls back to SpotValue (0 on a melt-only row)", A.mappedValue === 0, A.mappedValue);

  // ---------- B. compact figures on cards ----------
  const B = await page.evaluate(() => {
    const coins = [
      __mk("AY-B1", { Value: 850, Description: "Valued", Year: 1900 }),
      __mk("AY-B2", { Value: "", SpotValue: 12.4, Description: "Melt", Year: 1901 }),
      __mk("AY-B3", { Value: "", SpotValue: "", FaceValue: 0.01, Description: "Face", Year: 1902 }),
      __mk("AY-B4", { Value: "", SpotValue: "", Description: "None", Year: 1903 })
    ];
    const grid = document.getElementById("browseGrid");
    renderBrowseGrid(coins);
    const cards = [...grid.querySelectorAll(".coin-card")].map(c => ({
      id: c.querySelector(".card-id").textContent, v: __txt(c.querySelector(".value")), none: c.querySelector(".value").classList.contains("no-value") }));
    const roll = coins.map(c => Object.assign({}, c, { rollId: "R-1" }));
    renderRollsGrid(roll);
    const rolls = [...grid.querySelectorAll(".roll-card-meta")].map(e => __txt(e));
    const sets = [
      __mk("AY-S1", { Denomination: "Multiple", Value: 180, Category: "Proof Set", Year: 1999, Variety: "" }),
      __mk("AY-S2", { Denomination: "Multiple", Value: "", SpotValue: 40, Category: "Silver Set", Year: 1998, Variety: "Deep Cameo" }),
      __mk("AY-S3", { Denomination: "Multiple", Value: "", SpotValue: "", Category: "Empty Set", Year: 1997, Variety: "  " })
    ];
    renderSetsGrid(sets);
    const setCards = [...grid.querySelectorAll(".album-card-info")].map(e => ({
      prog: __txt(e.querySelector(".set-card-progress")), variety: __txt(e.querySelector(".set-card-variety")) }));
    const childRow = buildSetChildRow(__mk("AY-S1-A", { Value: "", SpotValue: 25, Grade: "PR-69", Year: 1986 }), sets[0]);
    const childValued = buildSetChildRow(__mk("AY-S1-B", { Value: 60, Grade: "PR-69", Year: 1986 }), sets[0]);
    return { cards, rolls, setCards, child: __txt(childRow.querySelector(".roll-card-meta")), childValued: __txt(childValued.querySelector(".roll-card-meta")) };
  });
  ok("B1 Catalog card: valued shows the plain figure", B.cards[0].v === "$850.00", B.cards[0]);
  ok("B2 Catalog card: melt shows '$12.40 melt' (no date on compact cards)", B.cards[1].v === "$12.40 melt", B.cards[1]);
  ok("B3 Catalog card: face-only shows '$0.01 face'", B.cards[2].v === "$0.01 face", B.cards[2]);
  ok("B4 Catalog card: nothing shows 'No value', not '$0.00'", B.cards[3].v === "No value" && B.cards[3].none, B.cards[3]);
  ok("B5 Rolls card carries the same wording", /\$850\.00$/.test(B.rolls[0]) && /\$12\.40 melt$/.test(B.rolls[1]) && /\$0\.01 face$/.test(B.rolls[2]) && !/\$/.test(B.rolls[3]), B.rolls);
  ok("B6 Sets card: valued / melt / nothing in the category line",
    B.setCards[0].prog === "Proof Set · $180.00" && B.setCards[1].prog === "Silver Set · $40.00 melt" && B.setCards[2].prog === "Empty Set", B.setCards);
  ok("B7 Sets card Variety line: blank or whitespace -> 'Standard', a real value shows", B.setCards[0].variety === "Variety: Standard" && B.setCards[1].variety === "Variety: Deep Cameo" && B.setCards[2].variety === "Variety: Standard", B.setCards);
  ok("B8 Set child rows: melt is labelled, valued is not", /PR-69 · \$25\.00 melt/.test(B.child) && /PR-69 · \$60\.00$/.test(B.childValued), { c: B.child, v: B.childValued });

  // ---------- C. detail page, SR line, share text, melt date ----------
  const C = await page.evaluate(async () => {
    const out = {};
    const serial = iso => excelSerialFromISODate(iso);
    const spot = (metal, iso, price) => ({ Metal: metal, PricePerTroyOz: price, LastUpdated: serial(iso), Source: "t" });
    const rowsFor = prices => [spot("Gold", "2026-10-29", prices.gold), spot("Silver", "2026-10-28", prices.silver),
      spot("Platinum", "2026-10-29", 1000), spot("Palladium", "2026-10-29", 1000), spot("Copper", "2026-10-20", 4), spot("Nickel", "2026-10-29", 8)];
    __setLiveDataModeForTest("live");
    const melt = __mk("AY-C1", { Value: "", SpotValue: 12.4, Description: "Silver Dime", Year: 1964, Denomination: "10C" });
    melt.specs = { silverOz: 0.07234 };
    const valued = __mk("AY-C2", { Value: 850, SpotValue: 12.4, Description: "Valued", Year: 1900 });
    const face = __mk("AY-C3", { Value: "", SpotValue: "", FaceValue: 0.01, Description: "Cent", Year: 1970 });
    const none = __mk("AY-C4", { Value: "", SpotValue: "", Description: "Nothing", Year: 1971 });
    const set = __mk("AY-C5", { Denomination: "Multiple", Value: "", SpotValue: 40, Description: "Silver Set", Year: 1998, Variety: "" });
    __setLiveCoinsForTest([melt, valued, face, none, set]);
    const rows = () => [...document.querySelectorAll("#detailAccordions .detail-row")].map(r => __txt(r.querySelector(".detail-label")) + " " + __txt(r.querySelector(".detail-value")));
    const hasRow = (label) => rows().find(t => t.startsWith(label));

    // no spot rows loaded yet -> melt label without a date
    __resetSpotPricesForTest();
    showBrowseDetail(melt);
    out.noDate = hasRow("Melt value");
    // spot rows arrive -> the date is the oldest among the metals the coin holds (silver only here)
    __setSpotPriceRowsForTest(rowsFor({ gold: 4000, silver: 30 }));
    showBrowseDetail(melt);
    out.withDate = hasRow("Melt value");
    out.noPlainValueRow = rows().some(t => /^Value\b/.test(t));
    out.sr = __txt(document.getElementById("browseDetailSR"));
    // a price change in Ref_SpotPrices must NOT change the displayed melt (it follows SpotValue only)
    __setSpotPriceRowsForTest(rowsFor({ gold: 9000, silver: 99 }));
    showBrowseDetail(melt);
    out.afterPriceChange = hasRow("Melt value");
    out.cardAfterPriceChange = (() => { renderBrowseGrid([melt]); return __txt(document.querySelector("#browseGrid .coin-card .value")); })();
    // coin with no specs -> oldest of all six metals
    const nospec = __mk("AY-C6", { Value: "", SpotValue: 5, Description: "No specs", Year: 1960 });
    __setLiveCoinsForTest([nospec]);
    showBrowseDetail(nospec);
    out.noSpecs = hasRow("Melt value");
    __setLiveCoinsForTest([melt, valued, face, none, set]);
    // share text
    let shared = null;
    window.shareContent = o => { shared = o.text; };
    showBrowseDetail(melt); document.getElementById("browseDetailShareBtn").click(); out.shareMelt = shared;
    showBrowseDetail(valued); document.getElementById("browseDetailShareBtn").click(); out.shareValued = shared; out.srValued = __txt(document.getElementById("browseDetailSR"));
    // valued / face / none overview rows
    showBrowseDetail(valued); out.valuedRow = hasRow("Value"); out.noMeltRowOnValued = !hasRow("Melt value");
    showBrowseDetail(face); out.faceRow = hasRow("Face value");
    showBrowseDetail(none); out.noneRows = rows().filter(t => /^(Value|Melt value|Face value)/.test(t));
    // Set page: Variety row (default Standard) + melt label
    showBrowseDetail(set); out.setVariety = hasRow("Variety"); out.setMelt = hasRow("Melt value");
    __setLiveCoinsForTest(null); __setLiveDataModeForTest(null);
    return out;
  });
  ok("C1 melt row before the spot rows load: labelled, no date", C.noDate === "Melt value $12.40", C.noDate);
  ok("C2 melt row once loaded: carries the oldest LastUpdated of the coin's metals (silver 2026-10-28, not copper 2026-10-20)", C.withDate === "Melt value $12.40 · spot 2026-10-28", C.withDate);
  ok("C3 no plain 'Value' row appears for a melt-only coin", C.noPlainValueRow === false, C.noPlainValueRow);
  ok("C4 screen-reader line says 'melt value' (the date is on the page and in the share text)", /, melt value \$12\.40 \(AY-C1\)/.test(C.sr), C.sr);
  ok("C5 CHANGING a Ref_SpotPrices price does not change the melt figure (follows SpotValue only)", C.afterPriceChange === C.withDate && C.cardAfterPriceChange === "$12.40 melt", { a: C.afterPriceChange, c: C.cardAfterPriceChange });
  ok("C6 a coin with no specs uses the oldest of all six metals (copper 2026-10-20)", C.noSpecs === "Melt value $5.00 · spot 2026-10-20", C.noSpecs);
  ok("C7 share text names it a melt value with the date", / melt value \$12\.40 \(spot prices 2026-10-28\)/.test(C.shareMelt), C.shareMelt);
  ok("C8 share and SR text for a valued coin are unchanged ('value')", /, value \$850\.00/.test(C.shareValued) && /value \$850\.00/.test(C.srValued) && !/melt/.test(C.shareValued), { s: C.shareValued, sr: C.srValued });
  ok("C9 valued overview row is 'Value $850.00' with no melt row", C.valuedRow === "Value $850.00" && C.noMeltRowOnValued, { v: C.valuedRow });
  ok("C10 face-only overview row says 'Face value'", C.faceRow === "Face value $0.01", C.faceRow);
  ok("C11 a coin with nothing shows no value row at all", C.noneRows.length === 0, C.noneRows);
  ok("C12 Set page has a Variety row defaulting to Standard, and a labelled melt row", C.setVariety === "Variety Standard" && /^Melt value \$40\.00/.test(C.setMelt), { v: C.setVariety, m: C.setMelt });

  // ---------- D. the detail page loads the spot rows itself for a melt coin ----------
  const D = await page.evaluate(async () => {
    window.__reqs = [];
    window.__realFetch2 = window.fetch;
    window.getLiveNavToken = async () => "test-token";
    const serial = excelSerialFromISODate("2026-10-27");
    window.fetch = async (url) => {
      window.__reqs.push(String(url));
      if (String(url).includes("Ref_SpotPrices")) {
        return new Response(JSON.stringify({ values: [["Metal", "PricePerTroyOz", "LastUpdated", "Source"], ["Silver", 30, serial, "t"]] }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("{}", { status: 404 });
    };
    __setLiveDataModeForTest("live");
    __resetSpotPricesForTest();
    const melt = __mk("AY-D1", { Value: "", SpotValue: 7.5, Description: "Silver", Year: 1964, Denomination: "10C" });
    melt.specs = { silverOz: 0.07 };
    __setLiveCoinsForTest([melt]);
    showBrowseDetail(melt);
    const before = [...document.querySelectorAll("#detailAccordions .detail-row")].map(r => __txt(r.querySelector(".detail-label")) + " " + __txt(r.querySelector(".detail-value"))).find(t => t.startsWith("Melt value"));
    await new Promise(r => setTimeout(r, 400));
    const after = [...document.querySelectorAll("#detailAccordions .detail-row")].map(r => __txt(r.querySelector(".detail-label")) + " " + __txt(r.querySelector(".detail-value"))).find(t => t.startsWith("Melt value"));
    const spotReads = window.__reqs.filter(u => u.includes("Ref_SpotPrices")).length;
    window.fetch = window.__realFetch2;
    __setLiveCoinsForTest(null); __setLiveDataModeForTest(null); __resetSpotPricesForTest();
    return { before, after, spotReads };
  });
  ok("D1 opening a melt coin reads Ref_SpotPrices once and re-renders with the date", D.before === "Melt value $7.50" && D.after === "Melt value $7.50 · spot 2026-10-27" && D.spotReads === 1, D);

  // ---------- E. Ledger tiles, denominations, face line ----------
  const E = await page.evaluate(async () => {
    const serial = excelSerialFromISODate("2026-10-28");
    __setSpotPriceRowsForTest(["Gold", "Silver", "Platinum", "Palladium", "Copper", "Nickel"].map((m, i) => ({ Metal: m, PricePerTroyOz: 10, LastUpdated: serial - (m === "Copper" ? 8 : 0), Source: "t" })));
    const coins = [
      __mk("AY-E1", { Denomination: "$1", Value: 100, Cost: 80 }),
      __mk("AY-E2", { Denomination: "$1", Value: 50, SpotValue: 99, Cost: 40 }),
      __mk("AY-E3", { Denomination: "$1", Value: "", SpotValue: 30, Cost: 25 }),
      __mk("AY-E4", { Denomination: "10C", Value: "", SpotValue: 5, Cost: 4 }),
      __mk("AY-E5", { Denomination: "1C", Value: "", SpotValue: "", FaceValue: 0.01, Cost: 1 }),
      __mk("AY-E6", { Denomination: "1C", Value: "", SpotValue: 0, FaceValue: 0.01, Cost: 2 }),
      __mk("AY-E7", { Denomination: "Multiple", Value: "", SpotValue: "", Cost: 3 }),
      __mk("AY-E8", { Denomination: "$1", Value: 999, Status: "Sold", Cost: 1 })
    ];
    coins[3].specs = { silverOz: 0.07 };
    coins[2].specs = { silverOz: 0.8, copperOz: 0.1 };
    __setLiveCoinsForTest(coins);
    __setLiveDataModeForTest("live");
    navigate("stats");
    const t = id => __txt(document.getElementById(id));
    const out = {
      valued: t("statTotalValue"), valuedSub: t("statValuedSub"), melt: t("statTotalMelt"), meltSub: t("statMeltSub"),
      net: t("statNetGain"), netSub: t("statNetSub"), spent: t("statTotalSpent"), face: t("statFaceLine"),
      faceHidden: document.getElementById("statFaceLine").classList.contains("hidden"),
      netLabel: __txt(document.getElementById("statNetGain").parentElement.querySelector(".stat-label")),
      denom: [...document.querySelectorAll("#statsBreakdown .stat-row")].map(r => [__txt(r.querySelector(".stat-row-label")), __txt(r.querySelector(".stat-row-value")), r.querySelectorAll(".stat-row-bar-fill").length]),
      metalLabel: __txt(document.querySelector("#statsMetalBreakdown .metal-recorded"))
    };
    __setLiveCoinsForTest(null); __setLiveDataModeForTest(null); __resetSpotPricesForTest(); navigate("dashboard");
    return out;
  });
  ok("E1 Valued total = recorded values only (100 + 50), coins counted, sold coin excluded", E.valued === "$150.00" && E.valuedSub === "2 coins with a recorded value", { v: E.valued, s: E.valuedSub });
  ok("E2 Melt total = melt-only coins only (30 + 5); the recorded coin's SpotValue is not in it", E.melt === "$35.00" && /^2 coins with melt only/.test(E.meltSub), { m: E.melt, s: E.meltSub });
  ok("E3 Melt tile names the OLDEST spot price among the melt coins' metals (copper 2026-10-20)", / · oldest spot price 2026-10-20$/.test(E.meltSub), E.meltSub);
  ok("E4 Net is on valued coins only: 150 - (80+40) = +$30.00, labelled '(valued coins)'", E.net === "+$30.00" && E.netLabel === "Net gain/loss (valued coins)" && /^2 coins, cost \$120\.00$/.test(E.netSub), { n: E.net, l: E.netLabel, s: E.netSub });
  ok("E5 Total spent still counts every owned coin (80+40+25+4+1+2+3)", E.spent === "$155.00", E.spent);
  ok("E6 face line: 2 coins at face only, $0.02; the empty Set is 'no value or face value'; none of them in the totals",
    E.face === "2 coins at face only · $0.02 · 1 coin with no value or face value" && !E.faceHidden, { f: E.face, h: E.faceHidden });
  const dollars = E.denom.find(r => r[0] && /Dollar/i.test(r[0]));
  ok("E7 By Denomination: valued, then '+ melt' with a two-tone bar", dollars && dollars[1] === "3 · $150.00 + $30.00 melt" && dollars[2] === 2, dollars);
  const dime = E.denom.find(r => r[0] && /Dime/i.test(r[0]));
  ok("E8 a melt-only denomination shows '$0.00 + $5.00 melt'", dime && dime[1] === "1 · $0.00 + $5.00 melt", dime);
  const cent = E.denom.find(r => r[0] && /Cent/i.test(r[0]));
  ok("E9 a denomination with only face-only coins shows no melt part and $0.00 valued", cent && cent[1] === "2 · $0.00", cent);
  ok("E10 By Metal says 'Valued', not 'Recorded'", /^Valued /.test(E.metalLabel || ""), E.metalLabel);

  // ---------- F. the Melt tile fills its date when the spot rows arrive late ----------
  const F = await page.evaluate(async () => {
    const coin = __mk("AY-F1", { Denomination: "$1", Value: "", SpotValue: 30 });
    coin.specs = { silverOz: 0.8 };
    __setLiveCoinsForTest([coin]);
    __setLiveDataModeForTest("live");
    __resetSpotPricesForTest();
    navigate("stats");
    const before = __txt(document.getElementById("statMeltSub"));
    __setSpotPriceRowsForTest([{ Metal: "Silver", PricePerTroyOz: 30, LastUpdated: excelSerialFromISODate("2026-10-25"), Source: "t" }]);
    renderSpotPrices();
    const after = __txt(document.getElementById("statMeltSub"));
    __setLiveCoinsForTest(null); __setLiveDataModeForTest(null); __resetSpotPricesForTest(); navigate("dashboard");
    return { before, after };
  });
  ok("F1 Melt tile subtitle gains the date when the rows land", F.before === "1 coin with melt only" && F.after === "1 coin with melt only · oldest spot price 2026-10-25", F);

  // ---------- G. Ledger Find a Coin ----------
  const G = await page.evaluate(async () => {
    const a = __mk("AY-G1", { Description: "Melt Coin", Value: "", SpotValue: 12.4, Year: 1964 });
    const b = __mk("AY-G2", { Description: "Valued Coin", Value: 70, Year: 1964 });
    const c = __mk("AY-G3", { Description: "Empty Coin", Value: "", SpotValue: "", Year: 1964 });
    __setLiveCoinsForTest([a, b, c]);
    __setLiveDataModeForTest("live");
    navigate("stats");
    const input = document.getElementById("ledgerSearchInput");
    input.value = "1964"; input.dispatchEvent(new Event("input", { bubbles: true }));
    const rows = [...document.querySelectorAll("#ledgerSearchResults .wish-item")].map(r => [r.querySelector(".wish-desc").textContent, __txt(r.querySelector(".wish-price"))]);
    __setLiveCoinsForTest(null); __setLiveDataModeForTest(null); navigate("dashboard");
    return rows;
  });
  const gp = id => (G.find(r => r[0].startsWith(id)) || [])[1];
  ok("G1 Find a Coin: melt labelled, valued plain, nothing blank", gp("AY-G1") === "$12.40 melt" && gp("AY-G2") === "$70.00" && gp("AY-G3") === "", G);

  // ---------- H. Edit forms: a melt-only coin opens with a BLANK Value ----------
  const H = await page.evaluate(() => {
    __setBrowseEditWriteEnabledForTest(false);
    const melt = __mk("AY-H1", { Value: "", SpotValue: 12.4, Description: "Melt", Year: 1964 });
    const valued = __mk("AY-H2", { Value: 85.5, SpotValue: 12.4, Description: "Valued", Year: 1964 });
    const set = __mk("AY-H3", { Denomination: "Multiple", Value: "", SpotValue: 40, Description: "Set", Year: 1998 });
    const setValued = __mk("AY-H4", { Denomination: "Multiple", Value: 180, SpotValue: 40, Description: "Set2", Year: 1998 });
    const out = {};
    showBrowseDetail(melt); showBrowseEditView(melt); out.coinMelt = document.getElementById("browseEditValue").value;
    showBrowseDetail(valued); showBrowseEditView(valued); out.coinValued = document.getElementById("browseEditValue").value;
    showBrowseDetail(set); showBrowseEditSetView(set); out.setMelt = document.getElementById("editSetValue").value;
    showBrowseDetail(setValued); showBrowseEditSetView(setValued); out.setValued = document.getElementById("editSetValue").value;
    const demo = FAKE_COINS.find(c => c.id === "AY-00001");
    showBrowseDetail(demo); showBrowseEditView(demo); out.demo = document.getElementById("browseEditValue").value;
    return out;
  });
  ok("H1 Edit Coin: melt-only coin opens with a blank Value box", H.coinMelt === "", H);
  ok("H2 Edit Coin: recorded value pre-fills as before; demo coin too", H.coinValued === "85.5" && H.demo === "850", H);
  ok("H3 Edit Set: melt-only Set opens blank; recorded Set pre-fills", H.setMelt === "" && H.setValued === "180", H);

  // ---------- I. Rolls sort uses the labelled figure, not raw coin.value ----------
  const I = await page.evaluate(() => {
    const a = __mk("AY-I1", { Value: "", SpotValue: 500, Description: "Melt roll", Year: 1921 });
    const b = __mk("AY-I2", { Value: 100, Description: "Valued roll", Year: 1922 });
    const c = __mk("AY-I3", { Value: 900, Description: "Top", Year: 1923 });
    rollsSortKey = "value-desc";
    return sortRollRows([b, a, c]).map(x => x.id);
  });
  ok("I1 Rolls value-desc orders by the displayed amount (melt 500 sits between 900 and 100)", I.join() === "AY-I3,AY-I1,AY-I2", I);

  // ---------- M. melt below face is face (Ray, 30 Oct 2026) ----------
  const M = await page.evaluate(async () => {
    const out = {};
    const belowCent = __mk("AY-M1", { Denomination: "1C", Value: "", SpotValue: 0.008, FaceValue: 0.01, Cost: 1, Year: 1990, Description: "Zinc Cent" });
    const belowDime = __mk("AY-M2", { Denomination: "10C", Value: "", SpotValue: 0.09, FaceValue: 0.1, Cost: 2, Year: 1990, Description: "Clad Dime" });
    const meltQuarter = __mk("AY-M3", { Denomination: "25C", Value: "", SpotValue: 4.2, FaceValue: 0.25, Cost: 3, Year: 1964, Description: "Silver Quarter" });
    const equalCent = __mk("AY-M4", { Denomination: "1C", Value: "", SpotValue: 0.01, FaceValue: 0.01, Cost: 1, Year: 1991, Description: "Equal Cent" });
    const valuedDollar = __mk("AY-M5", { Denomination: "$1", Value: 10, Cost: 6, Year: 1990, Description: "Valued Dollar" });
    const coins = [belowCent, belowDime, meltQuarter, equalCent, valuedDollar];
    coins[2].specs = { silverOz: 0.18 };
    __setLiveCoinsForTest(coins);
    __setLiveDataModeForTest("live");
    out.compact = coins.map(c => compactValueText(c));
    // detail of a below-face coin: Face value row, no melt row, no spot date, no Ref_SpotPrices read
    window.__reqsM = [];
    const realFetch = window.fetch;
    window.getLiveNavToken = async () => "test-token";
    window.fetch = async (url) => { window.__reqsM.push(String(url)); return new Response("{}", { status: 404 }); };
    __resetSpotPricesForTest();
    const rows = () => [...document.querySelectorAll("#detailAccordions .detail-row")].map(r => __txt(r.querySelector(".detail-label")) + " " + __txt(r.querySelector(".detail-value")));
    showBrowseDetail(belowCent);
    await new Promise(r => setTimeout(r, 300));
    out.belowRows = rows().filter(t => /^(Value|Melt value|Face value)/.test(t));
    out.belowSR = __txt(document.getElementById("browseDetailSR"));
    let shared = null; window.shareContent = o => { shared = o.text; };
    document.getElementById("browseDetailShareBtn").click(); out.belowShare = shared;
    out.spotReads = window.__reqsM.filter(u => u.includes("Ref_SpotPrices")).length;
    window.fetch = realFetch;
    // equal-to-face coin keeps the melt label
    __setSpotPriceRowsForTest([{ Metal: "Copper", PricePerTroyOz: 4, LastUpdated: excelSerialFromISODate("2026-10-20"), Source: "t" }]);
    showBrowseDetail(equalCent);
    out.equalRows = rows().filter(t => /^(Value|Melt value|Face value)/.test(t));
    // Ledger
    __setSpotPriceRowsForTest(["Gold", "Silver", "Platinum", "Palladium", "Copper", "Nickel"].map(m => ({ Metal: m, PricePerTroyOz: 10, LastUpdated: excelSerialFromISODate("2026-10-28"), Source: "t" })));
    navigate("stats");
    const t = id => __txt(document.getElementById(id));
    out.led = { valued: t("statTotalValue"), valuedSub: t("statValuedSub"), melt: t("statTotalMelt"), meltSub: t("statMeltSub"), net: t("statNetGain"), netSub: t("statNetSub"), face: t("statFaceLine"),
      cents: (() => { const r = [...document.querySelectorAll("#statsBreakdown .stat-row")].find(x => /Cent/i.test(x.textContent)); return r && __txt(r.querySelector(".stat-row-value")); })() };
    __setLiveCoinsForTest(null); __setLiveDataModeForTest(null); __resetSpotPricesForTest(); navigate("dashboard");
    return out;
  });
  ok("M1 compact figures: below-face melt reads '$0.01 face' / '$0.10 face'; melt at face and above stay 'melt'",
    M.compact[0] === "$0.01 face" && M.compact[1] === "$0.10 face" && M.compact[2] === "$4.20 melt" && M.compact[3] === "$0.01 melt" && M.compact[4] === "$10.00", M.compact);
  ok("M2 detail Overview for a below-face coin: 'Face value' only, no Melt value row, no spot date", M.belowRows.length === 1 && M.belowRows[0] === "Face value $0.01", M.belowRows);
  ok("M3 screen-reader line and share text say 'face value' (no melt, no spot date)", /, face value \$0\.01 \(AY-M1\)/.test(M.belowSR) && / face value \$0\.01/.test(M.belowShare) && !/melt|spot/.test(M.belowSR + M.belowShare), { sr: M.belowSR, share: M.belowShare });
  ok("M4 a below-face coin never triggers the Ref_SpotPrices read (no date to show)", M.spotReads === 0, M.spotReads);
  ok("M5 melt equal to face keeps the 'Melt value' row with its spot date", M.equalRows.length === 1 && M.equalRows[0] === "Melt value $0.01 · spot 2026-10-20", M.equalRows);
  ok("M6 Ledger: Melt total and count hold only melt at or above face (4.20 + 0.01, 2 coins)", M.led.melt === "$4.21" && /^2 coins with melt only/.test(M.led.meltSub), M.led);
  ok("M7 Ledger: below-face coins are on the face-only line (0.01 + 0.10), not in Melt", M.led.face === "2 coins at face only · $0.11", M.led);
  ok("M8 Ledger: Net is on valued coins only (10 - 6) and ignores melt and face-only coins", M.led.valued === "$10.00" && M.led.net === "+$4.00" && M.led.netSub === "1 coin, cost $6.00", M.led);
  ok("M9 By Denomination: a below-face cent adds nothing to melt; the at-face cent is the only melt in Cents", M.led.cents === "2 · $0.00 + $0.01 melt", M.led.cents);

  // ---------- J. star rule ----------
  const J = await page.evaluate(() => {
    const vals = ["Key Date", "KEY", "key date", "Key Variety", "key-variety", "Semi-Key Date", "Semi-Key", "One-Year Design", "One-Year Dual Date", "Better Date", "", null, undefined];
    return vals.map(v => [v, keyDateKindOf(v)]);
  });
  const kind = v => (J.find(r => r[0] === v) || [])[1];
  ok("J1 Key Date, KEY, Key Variety (any casing/punctuation) -> filled", kind("Key Date") === "key" && kind("KEY") === "key" && kind("key date") === "key" && kind("Key Variety") === "key" && kind("key-variety") === "key", J);
  ok("J2 Semi-Key Date / Semi-Key -> outline", kind("Semi-Key Date") === "semi" && kind("Semi-Key") === "semi", J);
  ok("J3 One-Year Design, One-Year Dual Date, an unknown wording and blanks -> no star", kind("One-Year Design") === null && kind("One-Year Dual Date") === null && kind("Better Date") === null && kind("") === null && kind(null) === null, J);
  const K = await page.evaluate(() => {
    const idx = buildAlbumKeyDateIndex([
      { CoinID: "C-1", KeyDate: "Key Date" }, { CoinID: "C-2", KeyDate: "Key Variety" }, { CoinID: "C-3", KeyDate: "Semi-Key Date" },
      { CoinID: "C-4", KeyDate: "One-Year Design" }, { CoinID: "C-5", KeyDate: "One-Year Dual Date" }, { CoinID: "C-6", KeyDate: "" }]);
    return { map: [...idx.entries()], legend: [...document.querySelectorAll("#albumBestOfHelp div")].map(d => __txt(d)) };
  });
  ok("K1 the album index holds only key / semi coins (One-Year ones are not in it, so no star and no gold ring)",
    JSON.stringify(K.map) === JSON.stringify([["C-1", "key"], ["C-2", "key"], ["C-3", "semi"]]), K.map);
  ok("K2 the album legend reads 'Key date or key variety' / 'Semi-key date'", K.legend.some(t => /★ Key date or key variety/.test(t)) && K.legend.some(t => /☆ Semi-key date/.test(t)), K.legend);

  // ---------- L. nothing in (g) writes to the workbook ----------
  const L = await page.evaluate(() => {
    const src = [coinValueFigure, compactValueText, valueSentenceText, meltSpotDateSerial, renderLedgerValueTiles, ledgerValueTotals, setVarietyText].map(f => f.toString()).join("\n");
    return /patchWorkbookRanges|addTableRow|uploadFile|method:\s*"(PATCH|POST|PUT)"/.test(src);
  });
  ok("L1 the new display helpers contain no write calls", L === false, L);
}, module);
