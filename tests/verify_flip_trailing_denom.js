// Flip card only: a description whose LAST word repeats the denomination
// line drawn beneath it loses that word on the card ("... Proof Silver $1"
// over "$1" shows "$1" once). dropTrailingDenomToken(), applied in
// renderTypeDenomCorner() after FLIP_TEXT_ABBREVIATIONS and before the
// fit/clamp. Stored data and every other surface keep the full description.

const { defineSuite } = require("./harness");

const REAL = "U.S. Marine Corps 250th Anniversary Proof Silver $1";
const DESKTOP = { width: 1440, height: 900 };

module.exports = defineSuite("flip-trailing-denom", async ({ ok, openApp, PHONE, TABLET }) => {
  for (const [vpName, vp] of [["phone", PHONE], ["tablet", TABLET], ["desktop", DESKTOP]]) {
    const page = await openApp(vp);
    const tag = (s) => s + " [" + vpName + "]";

    await page.evaluate((REAL) => {
      window.__mk = (id, name, denom, extra) => Object.assign({}, FAKE_COINS[0], { id, name, description: name, denom,
        year: 2025, mint: "P", variety: "", grade: "PR-70", designation: "DCAM", coinId: "", error: "", cost: 0 }, extra || {});
      window.__trLines = (el) => [...el.querySelectorAll(".corner-line")].map(n => n.textContent);
      window.__detailTR = (coin) => {
        __setLiveDataModeForTest("live"); __setLiveCoinsForTest([coin]); navigate("browse"); showBrowseDetail(coin);
        return window.__trLines(document.getElementById("browseDetailTR"));
      };
      window.__real = window.__mk("AY-97101", REAL, "$1");
    }, REAL);

    // ---------- A. The real example, on every flip surface ----------
    const A = await page.evaluate(() => {
      const c = window.__real;
      const detail = window.__detailTR(c);
      navigate("dashboard"); applyFlipCorners("spotlight", c, "obverse");
      const spot = window.__trLines(document.getElementById("spotlightTR"));
      __setLiveCoinsForTest([c]); navigate("browse"); showBrowseGrid();
      const grid = window.__trLines(document.querySelector("#browseGrid .coin-card .flip-label.tr"));
      return { detail, spot, grid };
    });
    const count$1 = (lines) => lines.join(" ").split(/\s+/).filter(w => w === "$1").length;
    ok(count$1(A.detail) === 1 && A.detail[A.detail.length - 1] === "$1", tag("A1 Browse detail: '$1' shows once, on the denomination line"), A.detail);
    ok(count$1(A.spot) === 1, tag("A2 Spotlight: '$1' shows once"), A.spot);
    ok(count$1(A.grid) === 1, tag("A3 Catalog mini card: '$1' shows once"), A.grid);
    ok(/Proof Silver/.test(A.detail.join(" ")) && /USMC/.test(A.detail.join(" ")), tag("A4 the rest of the description is kept (after abbreviation)"), A.detail);

    // ---------- B. The rule's edges ----------
    const B = await page.evaluate(() => ({
      middle: window.__detailTR(window.__mk("AY-97102", "Silver $1 Commemorative", "$1")),
      noMatch: window.__detailTR(window.__mk("AY-97103", "Proof Silver $5", "$1")),
      onlyDenom: window.__detailTR(window.__mk("AY-97104", "$1", "$1")),
      caseIns: window.__detailTR(window.__mk("AY-97105", "Jefferson Return to Monticello 5c", "5C")),
      fn: {
        middle: dropTrailingDenomToken("Silver $1 Commemorative", "$1"),
        noDenomLine: dropTrailingDenomToken("Proof Silver $1", ""),
        only: dropTrailingDenomToken("$1", "$1"),
        spaced: dropTrailingDenomToken("  Proof Silver   $1  ", " $1 "),
      },
    }));
    const typeText = (lines) => lines.slice(0, -1).join(" ");
    ok(typeText(B.middle) === "Silver $1 Commemorative", tag("B1 '$1' in the middle of a description is left alone"), B.middle);
    ok(typeText(B.noMatch) === "Proof Silver $5", tag("B2 a last word that isn't the denomination is left alone"), B.noMatch);
    ok(B.onlyDenom.join("|") === "$1|$1", tag("B3 a description that is only the denomination is not emptied"), B.onlyDenom);
    ok(typeText(B.caseIns) === "Jefferson Return to Monticello", tag("B4 the match is case-insensitive"), B.caseIns);
    ok(B.fn.middle === "Silver $1 Commemorative" && B.fn.only === "$1" && B.fn.spaced === "Proof Silver",
      tag("B5 dropTrailingDenomToken(): middle kept, only-denomination kept, trimmed match dropped"), B.fn);
    ok(B.fn.noDenomLine === "Proof Silver $1", tag("B6 with no denomination line drawn, nothing is dropped"), B.fn.noDenomLine);

    // ---------- C. Every non-flip surface keeps the full description ----------
    const C = await page.evaluate((REAL) => {
      const c = window.__real;
      __setLiveDataModeForTest("live"); __setLiveCoinsForTest([c]); navigate("browse"); showBrowseDetail(c);
      const title = document.getElementById("browseDetailName").textContent;
      const sr = document.getElementById("browseDetailSR").textContent;
      showBrowseEditView(c);
      const edit = document.getElementById("browseEditDescription").value;
      navigate("browse"); showBrowseGrid();
      const card = document.querySelector("#browseGrid .coin-card .name");
      const set = window.__mk("AY-97110", "U.S. Marine Corps 250th Anniversary Set $1", "Multiple");
      __setLiveCoinsForTest([set]); showBrowseDetail(set);
      const overview = document.getElementById("detailAccordions").textContent;
      __setLiveCoinsForTest(null); __setLiveDataModeForTest(null);
      return { title, sr, edit, card: card ? card.textContent : null, overview, stored: c.name,
        search: coinMatchesSearchQuery(c, "Silver $1") };
    }, REAL);
    ok(C.title.endsWith("Proof Silver $1"), tag("C1 the page title keeps the trailing '$1'"), C.title);
    ok(C.sr.includes(REAL), tag("C2 the screen-reader summary keeps the full description"), C.sr);
    ok(C.edit === REAL, tag("C3 Edit's Description field keeps the full description"), C.edit);
    ok(C.card === REAL, tag("C4 the Catalog card's own name text keeps the full description"), C.card);
    ok(C.overview.includes("Anniversary Set $1"), tag("C5 Overview keeps the full description"));
    ok(C.stored === REAL && C.search, tag("C6 the stored record is unchanged and search still matches 'Silver $1'"), C);

    await page.context().close();
  }
}, module);
