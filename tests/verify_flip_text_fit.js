// Flip-card text: display-only abbreviations + overflow clamp.
//
// Two real 2025-P American Silver Eagle descriptions ran past the flip
// card's right edge (TR corner, one unwrapped line at the 12.96px floor).
// FLIP_TEXT_ABBREVIATIONS shortens text drawn on the flip card only; the
// clamp (clampFlipCorners) is the safety net for anything still too long.
//
// The short-text golden (tests/fixtures/flip_short_text_golden.json) was
// captured from the PREVIOUS app.html (commit 6, before this change) by
// running snapshotShortCoins() below against it, so "identical" here means
// identical to what shipped before, not to itself. One intended edit since:
// commit 10 (Ray) put a space between Grade and Designation, so AY-93001's
// bottom-left reads "MS-65 RD" (was "MS-65RD") — nothing else in it changed.

const { defineSuite } = require("./harness");
const GOLDEN = require("./fixtures/flip_short_text_golden.json");

const REAL = [
  { id: "AY-97000", name: "U.S. Marine Corps 250th Anniversary Privy Mark", grade: "MS-70", designation: "", finish: "Business Strike" },
  { id: "AY-97001", name: "U.S. Marine Corps 250th Anniversary Proof Silver $1", grade: "PR-70", designation: "DCAM", finish: "Proof" },
];
const EXTREME = "U.S. Marine Corps 250th Anniversary Commemorative Proof Silver Dollar Special Edition Privy Mark Collector Release";
const DESKTOP = { width: 1440, height: 900 };

// Must stay byte-identical to the function used to capture the golden.
function snapshotShortCoins() {
  const coins = [
    Object.assign({}, FAKE_COINS[0]),
    Object.assign({}, FAKE_COINS[0], { id: "AY-93001", name: "Lincoln Memorial Cent", description: "Lincoln Memorial Cent", denom: "1C", year: 1999, mint: "D", variety: "", grade: "MS-65", designation: "RD", error: "", cost: 0 }),
    Object.assign({}, FAKE_COINS[0], { id: "AY-93002", name: "Morgan Dollar", description: "Morgan Dollar", denom: "$1", year: 1889, mint: "CC", variety: "VAM-1", grade: "XF-45", designation: "", composition: "90% Silver", specs: { composition: "90% Silver" } }),
  ];
  __setLiveDataModeForTest("live");
  __setLiveCoinsForTest(coins);
  navigate("browse");
  const corner = (el) => el ? { html: el.innerHTML, fs: el.style.fontSize, cls: el.className } : null;
  const out = {};
  coins.forEach(c => {
    showBrowseDetail(c);
    const f = (p) => ["TL", "TR", "BL", "BR"].map(k => corner(document.getElementById(p + k)));
    const obv = f("browseDetail");
    toggleBrowseDetailSide();
    const rev = f("browseDetail");
    out[c.id] = { obv, rev };
  });
  showBrowseGrid();
  out.grid = [...document.querySelectorAll("#browseGrid .coin-card")].map(card =>
    [...card.querySelectorAll(".flip-frame-mini .flip-label")].map(corner));
  __setLiveCoinsForTest(null); __setLiveDataModeForTest(null);
  return out;
}

module.exports = defineSuite("flip-text-fit", async ({ ok, openApp, PHONE, TABLET }) => {
  for (const [vpName, vp] of [["phone", PHONE], ["tablet", TABLET], ["desktop", DESKTOP]]) {
    const page = await openApp(vp);
    const tag = (s) => s + " [" + vpName + "]";

    await page.evaluate(({ REAL, EXTREME }) => {
      const base = Object.assign({}, FAKE_COINS[0], { year: 2025, mint: "P", denom: "$1", variety: "", gradeSource: "PCGS",
        composition: ".999 Fine Silver", specs: { composition: ".999 Fine Silver" }, coinId: "", cost: 95,
        error: "Obv. Die Polish Lines, Rev. Die Crack" });
      window.__coins = REAL.map(r => Object.assign({}, base, r, { description: r.name }));
      window.__extreme = Object.assign({}, base, { id: "AY-97002", name: EXTREME, description: EXTREME, grade: "PR-70", designation: "DCAM",
        variety: "Privy Mark, Anniversary Issue, U.S. Marines Tribute" });
      // Ink-level measurement of every corner inside one frame.
      window.__measure = (frame) => {
        const f = frame.getBoundingClientRect();
        const inks = [];
        const corners = [...frame.querySelectorAll(".flip-label")].map(el => {
          const lines = [...el.querySelectorAll(".corner-line")];
          (lines.length ? lines : [el]).forEach(n => {
            if (!n.textContent.trim()) return;
            const rg = document.createRange(); rg.selectNodeContents(n);
            const r = rg.getBoundingClientRect();
            inks.push({ k: el.className, l: r.left, r: r.right, t: r.top, b: r.bottom });
          });
          return { cls: el.className, text: lines.map(l => l.textContent).join(" | ") || el.textContent,
            fits: el.scrollWidth <= el.clientWidth, fs: parseFloat(getComputedStyle(el).fontSize) };
        });
        const outside = inks.filter(i => i.l < f.left - 0.5 || i.r > f.right + 0.5 || i.t < f.top - 0.5 || i.b > f.bottom + 0.5).map(i => i.k);
        const overlaps = [];
        for (let a = 0; a < inks.length; a++) for (let b = a + 1; b < inks.length; b++) {
          const A = inks[a], B = inks[b];
          if (A.k !== B.k && A.l < B.r && B.l < A.r && A.t < B.b && B.t < A.b) overlaps.push(A.k + "/" + B.k);
        }
        return { corners, outside, overlaps, allFit: corners.every(c => c.fits) };
      };
      window.__detail = (coin, side) => {
        __setLiveDataModeForTest("live"); __setLiveCoinsForTest([coin]); navigate("browse"); showBrowseDetail(coin);
        if (side === "reverse") toggleBrowseDetailSide();
        return window.__measure(document.getElementById("browseDetailFlipFrame"));
      };
    }, { REAL, EXTREME });

    // ---------- A. The two real descriptions, Browse detail, both faces ----------
    const A = await page.evaluate(() => window.__coins.map(c => ({ name: c.name,
      obv: window.__detail(c, "obverse"), rev: window.__detail(c, "reverse") })));
    A.forEach((a, i) => {
      const n = i ? "Proof Silver $1" : "Privy Mark";
      ok(a.obv.outside.length === 0 && a.rev.outside.length === 0, tag(`A${i}.1 ${n}: every flip text stays inside the card (front and back)`), [a.obv.outside, a.rev.outside, a.obv.corners]);
      ok(a.obv.overlaps.length === 0 && a.rev.overlaps.length === 0, tag(`A${i}.2 ${n}: no two flip texts overlap (front and back)`), [a.obv.overlaps, a.rev.overlaps]);
      ok(a.obv.allFit && a.rev.allFit, tag(`A${i}.3 ${n}: every corner fits its own box`), a.obv.corners);
      const tr = a.obv.corners.find(c => / tr/.test(c.cls)).text;
      ok(/USMC/.test(tr) && /Ann\./.test(tr) && !/Marine|Anniversary/.test(tr), tag(`A${i}.4 ${n}: the flip card shows the abbreviated text`), tr);
      ok(!/…/.test(tr), tag(`A${i}.5 ${n}: abbreviation alone is enough — nothing truncated`), tr);
    });
    // Reverse face carries the Error split: abbreviation applies there too.
    const AR = await page.evaluate(() => {
      const c = Object.assign({}, window.__coins[0], { error: "Obv. U.S. Marine Corps privy doubled, Rev. Anniversary date filled" });
      const m = window.__detail(c, "reverse");
      return m.corners.map(x => x.text).join(" || ");
    });
    ok(/USMC/.test(AR) && /Ann\./.test(AR) && !/Marine Corps|Anniversary/.test(AR), tag("A2 the abbreviations apply on the back of the card too"), AR);

    // ---------- B. Spotlight and the Catalog mini card ----------
    const B = await page.evaluate(() => {
      const out = {};
      navigate("dashboard");
      out.spot = window.__coins.map(c => { applyFlipCorners("spotlight", c, "obverse");
        return window.__measure(document.getElementById("spotlightFlipFrame")); });
      __setLiveDataModeForTest("live"); __setLiveCoinsForTest(window.__coins.slice()); navigate("browse"); showBrowseGrid();
      out.grid = [...document.querySelectorAll("#browseGrid .coin-card .flip-frame-mini")].map(f => window.__measure(f));
      return out;
    });
    ok(B.spot.every(m => !m.outside.length && !m.overlaps.length && m.allFit), tag("B1 Spotlight: both descriptions stay inside the card with no overlaps"), B.spot.map(m => [m.outside, m.overlaps]));
    ok(B.grid.length === 2 && B.grid.every(m => !m.outside.length && !m.overlaps.length && m.allFit), tag("B2 Catalog mini card: both stay inside the card with no overlaps"), B.grid.map(m => [m.outside, m.overlaps, m.corners]));
    ok(B.grid.every(m => !/Marine Corps|Anniversary/.test(m.corners.map(c => c.text).join(" "))), tag("B3 Catalog mini card flip text is abbreviated"), B.grid.map(m => m.corners.map(c => c.text)));

    // ---------- C. Full text everywhere else ----------
    const C = await page.evaluate(() => {
      const c = window.__coins[1], full = c.name;
      __setLiveDataModeForTest("live"); __setLiveCoinsForTest(window.__coins.slice()); navigate("browse");
      showBrowseDetail(c);
      const title = document.getElementById("browseDetailName").textContent;
      const sr = document.getElementById("browseDetailSR").textContent;
      const acc = document.getElementById("detailAccordions").textContent;
      showBrowseEditView(c);
      const edit = document.getElementById("browseEditDescription").value;
      // Catalog: list-mode text of the card, and search by full words.
      navigate("browse"); showBrowseGrid();
      const cardText = [...document.querySelectorAll("#browseGrid .coin-card")].map(k => k.textContent).join(" ");
      const search = ["Anniversary", "Marine Corps", "U.S. Marine Corps 250th Anniversary"].map(q => coinMatchesSearchQuery(c, q));
      const searchAbbr = ["USMC", "Ann."].map(q => coinMatchesSearchQuery(c, q));
      // A Set's Overview carries its Description.
      const set = Object.assign({}, c, { id: "AY-97010", denom: "Multiple", name: "U.S. Marine Corps 250th Anniversary Set", description: "U.S. Marine Corps 250th Anniversary Set" });
      __setLiveCoinsForTest([set]); showBrowseDetail(set);
      const setOverview = document.getElementById("detailAccordions").textContent;
      // Albums list.
      __setLiveAlbumsForTest([{ name: "U.S. Marine Corps 250th Anniversary Folder", icon: "🪙", denom: "$1", year: 2025,
        folderStyle: "littleton", mfgProductId: "", history: "", slots: [{ year: 2025, mint: "P", description: full, coinId: "", filledBy: null }] }]);
      navigate("albums");
      const albums = document.getElementById("view-albums").textContent;
      __setLiveAlbumsForTest(null); __setLiveCoinsForTest(null); __setLiveDataModeForTest(null);
      return { full, title, sr, acc, edit, cardText, search, searchAbbr, setOverview, albums, stored: c.name };
    });
    ok(C.title.includes(C.full), tag("C1 the page title keeps the full description"), C.title);
    ok(C.sr.includes(C.full), tag("C2 the flip card's screen-reader summary keeps the full description"), C.sr);
    ok(!/USMC|Ann\./.test(C.acc) && C.setOverview.includes("U.S. Marine Corps 250th Anniversary Set"), tag("C3 Overview shows the full text, never the abbreviation"), C.setOverview.slice(0, 200));
    ok(C.edit === C.full, tag("C4 Edit's Description field holds the full text"), C.edit);
    ok(C.cardText.includes(C.full), tag("C5 Catalog card text keeps the full description"));
    ok(C.search.every(Boolean) && !C.searchAbbr.some(Boolean), tag("C6 search matches the full words, not the abbreviations"), [C.search, C.searchAbbr]);
    ok(C.albums.includes("U.S. Marine Corps 250th Anniversary Folder") && !/USMC|Ann\./.test(C.albums), tag("C7 Albums show the full text"), C.albums.slice(0, 200));
    ok(C.stored === "U.S. Marine Corps 250th Anniversary Proof Silver $1", tag("C8 the stored coin record is not modified"), C.stored);

    // ---------- D. The abbreviation rule itself ----------
    const D = await page.evaluate(() => ({
      none: ["Morgan Dollar", "Washington Crossing the Delaware", "Newman 15-H, Pointed Rays, 4 Cinq., R-4", ""].map(abbreviateFlipText),
      cases: ["u.s. marine corps 250th", "US MARINE CORPS", "United States Marine Corps Ann", "U.S. Marines Tribute", "US Marines",
        "50th anniversary proof", "Anniversary,", "Anniversaryx", "Preanniversary", "USMarines", "Marine Corps"].map(abbreviateFlipText),
      list: Array.isArray(FLIP_TEXT_ABBREVIATIONS) && FLIP_TEXT_ABBREVIATIONS.length >= 2,
    }));
    ok(JSON.stringify(D.none) === JSON.stringify(["Morgan Dollar", "Washington Crossing the Delaware", "Newman 15-H, Pointed Rays, 4 Cinq., R-4", ""]), tag("D1 text with nothing to abbreviate is unchanged"), D.none);
    ok(JSON.stringify(D.cases) === JSON.stringify(["USMC 250th", "USMC", "USMC Ann", "USMC Tribute", "USMC",
      "50th Ann. proof", "Ann.,", "Anniversaryx", "Preanniversary", "USMarines", "Marine Corps"]),
      tag("D2 whole-word, case-insensitive, rest of the text keeps its case"), D.cases);
    ok(D.list, tag("D3 the map is one named constant (FLIP_TEXT_ABBREVIATIONS)"));

    // ---------- E. Clamp safety net: still too long after abbreviation ----------
    const E = await page.evaluate(() => {
      const obv = window.__detail(window.__extreme, "obverse");
      __setLiveCoinsForTest([window.__extreme]); navigate("browse"); showBrowseGrid();
      const grid = window.__measure(document.querySelector("#browseGrid .coin-card .flip-frame-mini"));
      return { obv, grid };
    });
    ok(!E.obv.outside.length && !E.obv.overlaps.length && E.obv.allFit, tag("E1 an extreme description stays inside the card with no overlaps (detail)"), [E.obv.outside, E.obv.overlaps, E.obv.corners]);
    ok(!E.grid.outside.length && !E.grid.overlaps.length && E.grid.allFit, tag("E2 an extreme description stays inside the card with no overlaps (Catalog mini card)"), [E.grid.outside, E.grid.overlaps, E.grid.corners]);
    ok(E.obv.corners.every(c => c.fs >= 9) && E.grid.corners.every(c => c.fs >= 9), tag("E3 no flip text goes below the 9px floor"), [E.obv.corners.map(c => c.fs), E.grid.corners.map(c => c.fs)]);
    ok(/…/.test(E.obv.corners.find(c => / tr/.test(c.cls)).text), tag("E4 the clamp truncates with an ellipsis rather than overflowing"), E.obv.corners);

    // ---------- F. Short-text coins render exactly as before ----------
    const F = await page.evaluate("(" + snapshotShortCoins.toString() + ")()");
    ok(JSON.stringify(F) === JSON.stringify(GOLDEN[vpName]), tag("F1 short-text coins' corners (detail front/back + Catalog) are byte-identical to before this change"),
      JSON.stringify(F).slice(0, 300));

    await page.evaluate(() => { __setLiveCoinsForTest(null); __setLiveDataModeForTest(null); });
    await page.context().close();
  }
}, module);
