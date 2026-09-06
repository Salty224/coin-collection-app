// Real bug (Ray's live-device report): the Sets drawer's catalog list (the
// "All" pill, list mode — showBrowseTab("sets") -> applySetsTabFilters()'s
// else-branch -> renderSetsGrid()) rendered several rows visually
// identical: "United States Proof Set / Proof Set · $155" repeated across
// six real owned rows, differing only in price, because the underlying
// Description column doesn't always carry the year and the list card never
// showed Year at all -- unlike the completeness checklist's own tiles
// (renderSetChecklist(), which already print row.year on every tile) and
// unlike drill-in (showBrowseDetail() -> detailTitleText(), "1957 United
// States Proof Set").
//
// Confirmed before touching display logic: this list is NOT on FAKE_SETS
// (that entity/picker model was retired -- see CLAUDE.md "Browse:
// navigation restructure") and it already reads through activeCoins()
// (live coins when loaded, FAKE_COINS fallback otherwise) -- so it was
// never stuck on mock data; it just never displayed Year at the list
// level. Fixed by reusing the exact same detailTitleText() helper drill-in
// already uses, so the two levels can't drift on the rule (skip prefixing
// a name that already starts with its own year).

const { defineSuite } = require("./harness");

module.exports = defineSuite("sets-list-year", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ---------- A. list mode reads activeCoins(), confirmed (not FAKE_SETS) ----------
  const A = await page.evaluate(() => {
    const src = document.documentElement.innerHTML;
    return {
      hasFakeSets: /FAKE_SETS\b/.test(src),
      readsActiveCoins: /activeCoins\(\)\.filter\(c => c\.denom === "Multiple"\)/.test(src)
    };
  });
  ok(A.hasFakeSets === false, "A1 FAKE_SETS (the retired entity/picker model) does not exist anywhere in the source");
  ok(A.readsActiveCoins, "A2 the Sets list-mode branch reads activeCoins() -- live coins when loaded, demo fallback otherwise -- confirming this was never stuck on mock data");

  // ---------- B. Year now appears on the list card, reusing detailTitleText() ----------
  const B = await page.evaluate(() => {
    __resetSpotlightSelectionForTest && __resetSpotlightSelectionForTest();
    __setLiveCoinsForTest([
      // Three real-shaped rows sharing an undated Description (the exact
      // reported symptom) -- distinguished only by Year and price before
      // this fix, exactly as Ray described.
      { id: "AY-90101", denom: "Multiple", year: 1955, mint: "", name: "United States Proof Set", category: "Proof Set", value: 220 },
      { id: "AY-90102", denom: "Multiple", year: 1956, mint: "", name: "United States Proof Set", category: "Proof Set", value: 155 },
      { id: "AY-90103", denom: "Multiple", year: 1957, mint: "", name: "United States Proof Set", category: "Proof Set", value: 165 },
      // A row whose name is ALREADY year-prefixed -- must not be doubled up.
      { id: "AY-90104", denom: "Multiple", year: 2021, mint: "", name: "2021 Silver Proof Set", category: "Silver Proof Set", value: 90 }
    ]);
    navigate("sets");
    const titles = [...document.querySelectorAll("#browseGrid .album-card-name")].map(el => el.textContent);
    __setLiveCoinsForTest(null);
    return { titles };
  });
  ok(B.titles.includes("1955 United States Proof Set"), "B1 the 1955 row's card title now leads with its year: " + JSON.stringify(B.titles));
  ok(B.titles.includes("1956 United States Proof Set"), "B2 the 1956 row is genuinely distinguishable from 1955 now (was identical before this fix)");
  ok(B.titles.includes("1957 United States Proof Set"), "B3 and the 1957 row too -- all three rows are now visually distinct");
  ok(new Set(B.titles.filter(t => /Proof Set$/.test(t) && !/Silver/.test(t))).size === 3,
     "B4 all three undated-Description rows produce three DISTINCT titles (the reported bug: they used to render identically)");
  ok(B.titles.includes("2021 Silver Proof Set"), "B5 a name that already starts with its own year is not doubled up (\"2021 2021 Silver Proof Set\")");

  // Negative control: the pre-fix card (bare coin.name, no year) reproduces
  // the exact reported symptom -- three rows rendering identically.
  const NEG = await page.evaluate(() => {
    __setLiveCoinsForTest([
      { id: "AY-90101", denom: "Multiple", year: 1955, mint: "", name: "United States Proof Set", category: "Proof Set", value: 220 },
      { id: "AY-90102", denom: "Multiple", year: 1956, mint: "", name: "United States Proof Set", category: "Proof Set", value: 155 },
      { id: "AY-90103", denom: "Multiple", year: 1957, mint: "", name: "United States Proof Set", category: "Proof Set", value: 165 }
    ]);
    const rows = activeCoins().filter(c => c.denom === "Multiple");
    const orig = window.renderSetsGrid;
    window.renderSetsGrid = function (rs) {
      const grid = document.getElementById("browseGrid");
      grid.innerHTML = "";
      rs.forEach(coin => {
        const card = document.createElement("div");
        card.className = "case album-card";
        card.innerHTML = `<div class="album-card-info"><div class="album-card-name">${coin.name}</div></div>`;
        grid.appendChild(card);
      });
    };
    renderSetsGrid(rows);
    const titles = [...document.querySelectorAll("#browseGrid .album-card-name")].map(el => el.textContent);
    window.renderSetsGrid = orig;
    __setLiveCoinsForTest(null);
    return { titles, distinctCount: new Set(titles).size };
  });
  ok(NEG.distinctCount === 1 && NEG.titles.length === 3,
     "NC1 negative control: the pre-fix bare-name card DOES render all three rows identically (\"" + NEG.titles[0] + "\") -- proves B1-B4 exercise the real fix");

  // ---------- C. nav smoke / overflow ----------
  const C = await page.evaluate(() => {
    const routes = ["dashboard", "sets", "browse", "dashboard"];
    const bad = [];
    routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    navigate("dashboard");
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(C.bad.length === 0, "C1 every route still navigates cleanly: " + C.bad.join("; "));
  ok(C.overflow === false, "C2 no horizontal page overflow at 412px");
}, module);
