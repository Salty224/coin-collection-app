// Catalog: Finish tag on list-view rows + a Finish filter pill row.
// See CLAUDE.md "Catalog: Finish tag on list rows + Finish filter".
// FAKE_COINS rows carry no finish, so the live-data seam drives everything.

const { defineSuite } = require("./harness");

const LONG_NAME = "Washington Crossing the Delaware Quarter";
const SEED = [
  { id: "AY-91001", name: "Roosevelt Dime", denom: "10C", year: 1964, mint: "", grade: "PR-67", value: 12, finish: "Proof" },
  { id: "AY-91002", name: "Roosevelt Dime", denom: "10C", year: 1964, mint: "D", grade: "MS-64", value: 5, finish: "Business Strike" },
  { id: "AY-91003", name: "Lincoln Memorial Cent", denom: "1C", year: 1970, mint: "S", grade: "", value: 1, finish: "Uncirculated" },
  { id: "AY-91004", name: "Kennedy Half Dollar", denom: "50C", year: 1971, mint: "S", grade: "PR-68", value: 8, finish: "" },
  { id: "AY-91005", name: "Washington Quarter", denom: "25C", year: 1970, mint: "", grade: "", value: 4, finish: "Various" },
  { id: "AY-91006", name: "Jefferson Nickel", denom: "5C", year: 1938, mint: "D", grade: "PR-65", value: 30, finish: "Matte Proof" },
  { id: "AY-91007", name: "Silver Eagle", denom: "$1", year: 2006, mint: "P", grade: "PR-70", value: 300, finish: "Reverse Proof" },
  { id: "AY-91008", name: LONG_NAME, denom: "25C", year: 2021, mint: "S", grade: "PR-69", value: 20, finish: "Enhanced Reverse Proof" },
  { id: "AY-91009", name: "Silver Eagle", denom: "$1", year: 2006, mint: "W", grade: "MS-69", value: 60, finish: "Burnished" },
  { id: "AY-91010", name: "Roosevelt Dime", denom: "10C", year: 1965, mint: "", grade: "MS-66", value: 3, finish: "  sms  " },
  { id: "AY-91011", name: "Lincoln Memorial Cent", denom: "1C", year: 2019, mint: "W", grade: "", value: 2, finish: "Enhanced Uncirculated" },
  { id: "AY-91012", name: "Kennedy Half Dollar", denom: "50C", year: 1998, mint: "S", grade: "", value: 15, finish: "Matte" },
  { id: "AY-91013", name: "Roosevelt Dime", denom: "10C", year: 2005, mint: "D", grade: "", value: 1, finish: "Satin Finish" },
  { id: "AY-91014", name: "Morgan Dollar", denom: "$1", year: 1921, mint: "", grade: "SP-64", value: 400, finish: "Specimen" }
];

module.exports = defineSuite("catalog-finish-filter", async ({ ok, openApp, PHONE, TABLET }) => {
  const page = await openApp(PHONE);
  await page.evaluate((seed) => { window.__SEED = seed; }, SEED);

  // In-page helpers: render the Catalog in a given view and read each row.
  await page.evaluate(() => {
    window.__open = (view) => {
      __setLiveCoinsForTest(window.__SEED);
      navigate("browse");
      document.getElementById(view === "list" ? "browseListViewBtn" : "browseGridViewBtn").click();
      applyCoinsTabFilters();
    };
    window.__rows = () => {
      const out = {};
      document.querySelectorAll("#browseGrid .coin-card").forEach(c => {
        const id = c.querySelector(".card-id").textContent.trim();
        const tag = c.querySelector(".name .finish-tag");
        out[id] = {
          name: c.querySelector(".name").textContent,
          tag: tag ? tag.textContent : null,
          tagVisible: !!(tag && tag.getBoundingClientRect().width > 0),
          yearMint: c.querySelector(".year-mint").textContent,
          grade: c.querySelector(".grade-badge") ? c.querySelector(".grade-badge").textContent : null,
          value: c.querySelector(".value").textContent
        };
      });
      return out;
    };
    window.__pill = (key) => document.querySelector('#browseFinishFilters .filter-chip[data-key="' + key + '"]').click();
    window.__shownIds = () => Object.keys(window.__rows()).sort();
    window.__count = () => document.getElementById("browseResultCount").textContent.trim();
  });

  // ---------- A. The list-view tag ----------
  const A = await page.evaluate(() => { __open("list"); return __rows(); });
  ok(A["AY-91001"].name === "Roosevelt Dime · Proof" && A["AY-91001"].tagVisible,
    "A1 a Proof coin's list row reads 'Roosevelt Dime · Proof': " + JSON.stringify(A["AY-91001"].name));
  ok(A["AY-91002"].tag === null && A["AY-91002"].name === "Roosevelt Dime",
    "A2 Business Strike shows no tag: " + JSON.stringify(A["AY-91002"].name));
  ok(A["AY-91003"].tag === null && A["AY-91003"].name === "Lincoln Memorial Cent",
    "A3 Uncirculated shows no tag: " + JSON.stringify(A["AY-91003"].name));
  ok(A["AY-91004"].tag === null && A["AY-91004"].name === "Kennedy Half Dollar" && !A["AY-91004"].name.includes("·"),
    "A4 a blank Finish shows no tag and no stray separator: " + JSON.stringify(A["AY-91004"].name));
  ok(A["AY-91010"].name === "Roosevelt Dime · sms",
    "A5 the tag shows the stored value trimmed: " + JSON.stringify(A["AY-91010"].name));
  ok(A["AY-91001"].yearMint === "1964" && A["AY-91001"].grade === "PR-67" && A["AY-91001"].value === "$12.00" &&
     A["AY-91002"].yearMint === "1964-D" && A["AY-91002"].grade === "MS-64",
    "A6 year-mint, ID, grade pill and value are unchanged: " + JSON.stringify(A["AY-91001"]));
  const A7 = await page.evaluate(() => {
    __setLiveCoinsForTest([{ id: "AY-91099", name: "X", denom: "1C", year: 2000, mint: "", value: 1, finish: "<b>Proof</b>" }]);
    applyCoinsTabFilters();
    const c = document.querySelector("#browseGrid .coin-card .name");
    return { text: c.textContent, bold: !!c.querySelector("b") };
  });
  ok(A7.text === "X · <b>Proof</b>" && !A7.bold, "A7 the tag text is escaped, not parsed as markup: " + JSON.stringify(A7));

  // ---------- B. Grid view: no tag ----------
  const B = await page.evaluate(() => { __open("grid"); return __rows(); });
  ok(B["AY-91001"].tag === null && B["AY-91008"].tag === null && !/Proof/.test(B["AY-91001"].name),
    "B1 grid view carries no finish tag at all");
  const B2 = await page.evaluate(() => {
    document.getElementById("browseListViewBtn").click();   // the real toggle, no manual re-render
    const toList = __rows()["AY-91001"].name;
    document.getElementById("browseGridViewBtn").click();
    const toGrid = __rows()["AY-91001"].tag;
    return { toList, toGrid };
  });
  ok(B2.toList === "Roosevelt Dime · Proof" && B2.toGrid === null,
    "B2 the view toggle itself adds the tag in list view and removes it in grid view: " + JSON.stringify(B2));

  // ---------- C. Each pill shows exactly its group ----------
  const C = await page.evaluate(() => {
    __open("list");
    const res = { all: __shownIds() };
    for (const key of ["strike", "proof", "revproof", "special"]) {
      __pill("all"); __pill(key); res[key] = __shownIds();
    }
    __pill("all");
    res.allAgain = __shownIds();
    res.labels = [...document.querySelectorAll("#browseFinishFilters .filter-chip")].map(c => [c.textContent, c.title, c.getAttribute("aria-label")]);
    return res;
  });
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  ok(C.all.length === 14 && eq(C.allAgain, C.all), "C1 All shows every row (14), and returning to All restores them");
  ok(eq(C.strike, ["AY-91002", "AY-91003"]), "C2 Strike = Business Strike + Uncirculated: " + JSON.stringify(C.strike));
  ok(eq(C.proof, ["AY-91001", "AY-91006"]), "C3 Proof = Proof + Matte Proof: " + JSON.stringify(C.proof));
  ok(eq(C.revproof, ["AY-91007", "AY-91008"]), "C4 Rev. Proof = Reverse Proof + Enhanced Reverse Proof: " + JSON.stringify(C.revproof));
  ok(eq(C.special, ["AY-91009", "AY-91010", "AY-91011", "AY-91012", "AY-91013", "AY-91014"]),
    "C5 Special = Burnished, SMS (any case), Enhanced Uncirculated, Matte, Satin Finish, Specimen: " + JSON.stringify(C.special));
  const inSomeGroup = new Set([...C.strike, ...C.proof, ...C.revproof, ...C.special]);
  ok(!inSomeGroup.has("AY-91004") && !inSomeGroup.has("AY-91005") && C.all.includes("AY-91004") && C.all.includes("AY-91005"),
    "C6 blank Finish and an unknown value ('Various') appear only under All");
  ok(eq(C.labels.map(l => l[0]), ["All", "Strike", "Proof", "Rev. Proof", "Special"]) &&
     C.labels.every(l => l[1] && l[1] === l[2]) && C.labels[3][1].includes("Enhanced Reverse Proof"),
    "C7 pill labels are All/Strike/Proof/Rev. Proof/Special, each with a full-name title and aria-label");
  const C8 = await page.evaluate(() => { __pill("all"); __pill("proof"); __pill("revproof"); const r = __shownIds(); __pill("all"); return r; });
  ok(eq(C8, ["AY-91001", "AY-91006", "AY-91007", "AY-91008"]), "C8 two pills together OR their groups: " + JSON.stringify(C8));

  // ---------- D. Combines with another filter; count updates; reset ----------
  const D = await page.evaluate(() => {
    __open("list");
    const before = __count();
    __pill("proof");
    const proofCount = __count();
    // Denomination: Dimes
    document.querySelector('#browseFilters .filter-chip[data-key="10C"]') ?
      document.querySelector('#browseFilters .filter-chip[data-key="10C"]').click() :
      [...document.querySelectorAll("#browseFilters .filter-chip")].find(c => c.textContent === "Dimes").click();
    const both = __shownIds();
    const bothCount = __count();
    navigate("dashboard"); navigate("browse");
    const afterReentry = { ids: __shownIds().length, activeKeys: [...document.querySelectorAll("#browseFinishFilters .filter-chip.active")].map(c => c.dataset.key) };
    return { before, proofCount, both, bothCount, afterReentry };
  });
  ok(D.before === "Showing 14 of 14" && D.proofCount === "Showing 2 of 14",
    "D1 'Showing x of y' updates with the Finish filter: " + D.before + " -> " + D.proofCount);
  ok(eq(D.both, ["AY-91001"]) && D.bothCount === "Showing 1 of 14",
    "D2 Finish ANDs with Denomination (Proof + Dimes = the one Proof dime): " + JSON.stringify(D.both) + " " + D.bothCount);
  ok(D.afterReentry.ids === 14 && eq(D.afterReentry.activeKeys, ["all"]),
    "D3 re-entering Catalog resets the Finish filter to All: " + JSON.stringify(D.afterReentry));

  // ---------- E. Search matches Finish ----------
  const E = await page.evaluate(() => {
    __open("list");
    const input = document.getElementById("browseSearchInput");
    input.value = "matte proof"; input.dispatchEvent(new Event("input"));
    const r = __shownIds();
    input.value = ""; input.dispatchEvent(new Event("input"));
    return r;
  });
  ok(eq(E, ["AY-91006"]), "E1 Catalog search matches Finish ('matte proof'): " + JSON.stringify(E));

  // ---------- F. No sideways scroll; the pill row fits one line ----------
  for (const [label, vp] of [["360", { width: 360, height: 800 }], ["412", PHONE], ["1024x768", TABLET]]) {
    await page.setViewportSize(vp);
    const F = await page.evaluate(() => {
      __open("list");
      const row = document.getElementById("browseFinishFilters");
      const chips = [...row.querySelectorAll(".filter-chip")];
      const tops = new Set(chips.map(c => Math.round(c.getBoundingClientRect().top)));
      const longCard = [...document.querySelectorAll("#browseGrid .coin-card")].find(c => c.querySelector(".card-id").textContent.trim() === "AY-91008");
      const cr = longCard.getBoundingClientRect();
      const tag = longCard.querySelector(".finish-tag").getBoundingClientRect();
      return {
        pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
        rowOverflow: row.scrollWidth - row.clientWidth,
        oneLine: tops.size === 1,
        tagInside: tag.right <= cr.right + 0.5 && tag.width > 0,
        name: longCard.querySelector(".name").textContent
      };
    });
    ok(F.pageOverflow <= 0, "F1(" + label + ") no horizontal page scroll in list view: " + F.pageOverflow);
    ok(F.rowOverflow <= 0 && F.oneLine, "F2(" + label + ") the Finish pill row fits one line: overflow " + F.rowOverflow + ", oneLine " + F.oneLine);
    ok(F.tagInside && F.name === "Washington Crossing the Delaware Quarter · Enhanced Reverse Proof",
      "F3(" + label + ") the long name + 'Enhanced Reverse Proof' stays inside its row: " + JSON.stringify(F));
  }

  await page.close();
});
