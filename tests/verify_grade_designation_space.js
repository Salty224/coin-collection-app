// Flip card bottom-left: Grade and Designation joined with ONE space
// ("VG-8 BN"), not run together ("VG-8BN"). gradeDesignationCornerText(),
// shared by Browse detail / Spotlight (applyFlipCorners) and the Catalog
// mini card. Flip card only — stored data and Overview's own Grade and
// Designation rows are unchanged. Add Coin's preview never ran them
// together (its Designation sits under Variety in the bottom-right), so it
// has nothing to change.

const { defineSuite } = require("./harness");

const DESKTOP = { width: 1440, height: 900 };

module.exports = defineSuite("grade-designation-space", async ({ ok, openApp, PHONE, TABLET }) => {
  for (const [vpName, vp] of [["phone", PHONE], ["tablet", TABLET], ["desktop", DESKTOP]]) {
    const page = await openApp(vp);
    const tag = (s) => s + " [" + vpName + "]";

    // ---------- A. The joining rule ----------
    const A = await page.evaluate(() => {
      const g = (grade, designation, finish) => gradeDesignationCornerText({ grade, designation, finish });
      return {
        both: g("VG-8", "BN"), noDesig: g("VG-8", ""), noGrade: g("", "BN"), neither: g("", ""),
        nulls: g(null, undefined), spaced: g("  MS-65   ", "  RD "), paren: g("VF-30 (PCGS)", "BN"),
        inner: g("XF  Details -   Improperly Cleaned", ""), sms: g("MS-67", "FB", "SMS"), smsOnly: g("", "", "SMS"),
      };
    });
    ok(A.both === "VG-8 BN", tag("A1 'VG-8 BN', exactly one space"), A.both);
    ok(A.noDesig === "VG-8", tag("A2 no Designation: no trailing space"), JSON.stringify(A.noDesig));
    ok(A.noGrade === "BN", tag("A3 no Grade: no leading space"), JSON.stringify(A.noGrade));
    ok(A.neither === "" && A.nulls === "", tag("A4 both blank (or missing): empty"), [A.neither, A.nulls]);
    ok(A.spaced === "MS-65 RD" && A.paren === "VF-30 (PCGS) BN" && A.inner === "XF Details - Improperly Cleaned",
      tag("A5 grades with their own spacing or a '(PCGS)' suffix never get a double space"), A);
    ok(A.sms === "MS-67 FB (SMS)" && A.smsOnly === "(SMS)", tag("A6 the SMS flag still follows, single-spaced"), [A.sms, A.smsOnly]);

    // ---------- B. Rendered on every flip card that shows it ----------
    const B = await page.evaluate(() => {
      const c = Object.assign({}, FAKE_COINS[0], { id: "AY-98001", name: "Lincoln Wheat Cent", description: "Lincoln Wheat Cent",
        denom: "1C", year: 1914, mint: "D", variety: "", grade: "VG-8", designation: "BN", gradeSource: "PCGS", finish: "Business Strike" });
      const bl = (el) => [...el.querySelectorAll(".corner-line")].map(n => n.textContent).join(" | ");
      __setLiveDataModeForTest("live"); __setLiveCoinsForTest([c]); navigate("browse"); showBrowseDetail(c);
      const detail = bl(document.getElementById("browseDetailBL"));
      const rows = [...document.querySelectorAll("#detailAccordions .detail-accordion .detail-row")].map(r =>
        [r.querySelector(".detail-label").textContent.trim(), r.querySelector(".detail-value").textContent.trim()]);
      navigate("dashboard"); applyFlipCorners("spotlight", c, "obverse");
      const spot = bl(document.getElementById("spotlightBL"));
      __setLiveCoinsForTest([c]); navigate("browse"); showBrowseGrid();
      const grid = bl(document.querySelector("#browseGrid .coin-card .flip-label.bl"));
      // Add Coin preview: Designation is its own line under Variety.
      navigate("addcoin");
      const set = (id, v) => { document.getElementById(id).value = v; };
      set("denomination", "1C"); set("year", "1914"); set("mintMark", "D"); set("gradeFrom", "VG-8"); set("gradeSource", "PCGS"); set("designation", "BN"); set("variety", "");
      updateFlipLabels();
      const addBL = document.getElementById("flipObverseBL").textContent, addBR = document.getElementById("flipObverseBR").textContent;
      __setLiveCoinsForTest(null); __setLiveDataModeForTest(null);
      return { detail, spot, grid, rows, addBL, addBR, stored: [c.grade, c.designation] };
    });
    ok(B.detail === "VG-8 BN", tag("B1 Browse detail shows 'VG-8 BN'"), B.detail);
    ok(B.spot === "VG-8 BN", tag("B2 Spotlight shows 'VG-8 BN'"), B.spot);
    ok(B.grid === "VG-8 BN", tag("B3 Catalog mini card shows 'VG-8 BN'"), B.grid);
    ok(!/VG-8BN/.test(B.addBL + B.addBR) && B.addBR === "BN", tag("B4 Add Coin preview never runs them together (Designation on its own line)"), [B.addBL, B.addBR]);
    const row = (l) => (B.rows.find(r => r[0] === l) || [])[1];
    ok(row("Grade") === "VG-8 (PCGS)" && row("Designation") === "BN", tag("B5 Overview's Grade and Designation rows are unchanged"), B.rows);
    ok(B.stored[0] === "VG-8" && B.stored[1] === "BN", tag("B6 the stored Grade and Designation are unchanged"), B.stored);

    // ---------- C. A long Grade + Designation still fits ----------
    const C = await page.evaluate(() => {
      const c = Object.assign({}, FAKE_COINS[0], { id: "AY-98002", name: "Indian Head Cent", description: "Indian Head Cent",
        denom: "1C", year: 1877, mint: "", variety: "", grade: "XF Details - Improperly Cleaned", designation: "BN", finish: "SMS",
        composition: "95% Copper", specs: {} });
      const measure = (frame) => {
        const f = frame.getBoundingClientRect(); const inks = [];
        const corners = [...frame.querySelectorAll(".flip-label")].map(el => {
          [...el.querySelectorAll(".corner-line")].forEach(n => { const rg = document.createRange(); rg.selectNodeContents(n);
            const r = rg.getBoundingClientRect(); if (r.width) inks.push({ k: el.className, l: r.left, r: r.right, t: r.top, b: r.bottom }); });
          return { fits: el.scrollWidth <= el.clientWidth, text: el.textContent };
        });
        const outside = inks.filter(i => i.l < f.left - 0.5 || i.r > f.right + 0.5 || i.t < f.top - 0.5 || i.b > f.bottom + 0.5);
        let overlaps = 0;
        for (let a = 0; a < inks.length; a++) for (let b = a + 1; b < inks.length; b++) {
          const A = inks[a], B = inks[b]; if (A.k !== B.k && A.l < B.r && B.l < A.r && A.t < B.b && B.t < A.b) overlaps++; }
        return { outside: outside.length, overlaps, fits: corners.every(x => x.fits) };
      };
      __setLiveDataModeForTest("live"); __setLiveCoinsForTest([c]); navigate("browse"); showBrowseDetail(c);
      const detail = measure(document.getElementById("browseDetailFlipFrame"));
      const blText = [...document.getElementById("browseDetailBL").querySelectorAll(".corner-line")].map(n => n.textContent).join(" ");
      showBrowseGrid();
      const grid = measure(document.querySelector("#browseGrid .coin-card .flip-frame-mini"));
      __setLiveCoinsForTest(null); __setLiveDataModeForTest(null);
      return { detail, grid, blText };
    });
    ok(C.detail.outside === 0 && C.detail.overlaps === 0 && C.detail.fits, tag("C1 a long Grade + Designation stays inside the detail card, no overlaps"), C.detail);
    ok(C.grid.outside === 0 && C.grid.overlaps === 0 && C.grid.fits, tag("C2 ... and inside the Catalog mini card"), C.grid);
    ok(/Cleaned BN/.test(C.blText) || /…/.test(C.blText), tag("C3 the long text keeps its single space (or is clamped with an ellipsis)"), C.blText);

    await page.context().close();
  }
}, module);
