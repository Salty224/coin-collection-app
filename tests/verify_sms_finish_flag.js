// SMS finish indicator on the flip card — Ray's request: surface
// Finish="SMS" (Special Mint Set, 1965-67 issues) as a trailing " (SMS)"
// flag on the Grade+Designation corner, since SMS coins carry no mint mark
// despite being struck at San Francisco and the flag explains a
// certification-relevant fact (why a service might eventually grade one
// Specimen rather than Mint State). Scoped to the exact "SMS" Finish value
// only — not a general "show any non-default Finish" rule — and applies
// across every denomination that can appear in an SMS set (cent through
// half dollar), keyed purely on coin.finish with no denom branch.
//
// This is a real display change on TWO genuinely separate render paths —
// applyFlipCorners() (shared by Browse detail + Spotlight) and
// renderBrowseGrid()'s own Catalog-grid corner build — per the Designation/
// Variety saga documented in CLAUDE.md ("Catalog grid: Variety +
// Designation on the mini flip card"), where assuming shared code meant
// shared behavior was wrong before. Both are wired and verified explicitly
// here, not assumed from one passing.

const { defineSuite } = require("./harness");

module.exports = defineSuite("sms-finish-flag", async ({ ok, openApp, PHONE, TABLET }) => {
  const page = await openApp(PHONE);

  // ---------- A. gradeDesignationCornerText() in isolation ----------
  const A = await page.evaluate(() => {
    return {
      noSms: gradeDesignationCornerText({ grade: "MS-65", designation: "", finish: "Business Strike" }),
      gradeOnly: gradeDesignationCornerText({ grade: "MS-65", designation: "", finish: "SMS" }),
      withDesignation: gradeDesignationCornerText({ grade: "MS-67", designation: "FB", finish: "SMS" }),
      neitherGradeNorDesignation: gradeDesignationCornerText({ grade: "", designation: "", finish: "SMS" }),
      otherFinish: gradeDesignationCornerText({ grade: "MS-65", designation: "", finish: "Proof" }),
      satinFinish: gradeDesignationCornerText({ grade: "MS-65", designation: "", finish: "Satin Finish" }),
      blankFinish: gradeDesignationCornerText({ grade: "MS-65", designation: "", finish: "" }),
      undefinedFinish: gradeDesignationCornerText({ grade: "MS-65", designation: "" })
    };
  });
  ok(A.noSms === "MS-65", "A1 non-SMS finish leaves the corner unchanged: " + A.noSms);
  ok(A.gradeOnly === "MS-65 (SMS)", "A2 Grade + SMS, no Designation: " + A.gradeOnly);
  ok(A.withDesignation === "MS-67FB (SMS)", "A3 Grade+Designation + SMS, per the exact examples given: " + A.withDesignation);
  ok(A.neitherGradeNorDesignation === "(SMS)", "A4 blank Grade+Designation shows \"(SMS)\" alone, no leading space: " + JSON.stringify(A.neitherGradeNorDesignation));
  ok(A.otherFinish === "MS-65", "A5 a real, non-default Finish (Proof) does NOT get the flag — scoped to the exact literal \"SMS\" value only: " + A.otherFinish);
  ok(A.satinFinish === "MS-65", "A6 ... same for Satin Finish, another real non-default value: " + A.satinFinish);
  ok(A.blankFinish === "MS-65", "A7 a blank Finish string is not SMS");
  ok(A.undefinedFinish === "MS-65", "A8 an entirely missing finish field doesn't throw and isn't SMS");

  // ---------- B. Finish IS already mapped onto live coins from All ----------
  const B = await page.evaluate(() => {
    const row = { CollectionID: "AY-91001", Denomination: "5C", Year: 1966, MintMark: "",
      Description: "Jefferson Nickel", Grade: "MS-65", Finish: "SMS" };
    const coin = mapWorkbookRowToCoin(row);
    return { finish: coin.finish };
  });
  ok(B.finish === "SMS", "B1 mapWorkbookRowToCoin() already reads All.Finish onto the coin object — no new wiring needed: " + B.finish);

  // ---------- C. Real Browse-detail render path, across several denoms ----------
  const SEED = [
    // Nickel — grade only, no Designation.
    { id: "AY-91001", name: "Jefferson Nickel", description: "Jefferson Nickel", denom: "5C",
      year: 1966, mint: "", grade: "MS-65", designation: "", finish: "SMS", value: 20, cost: 15, coinId: "C-1" },
    // Cent — grade + Designation, the second worked example.
    { id: "AY-91002", name: "Lincoln Memorial Cent", description: "Lincoln Memorial", denom: "1C",
      year: 1967, mint: "", grade: "MS-67", designation: "FB", finish: "SMS", value: 5, cost: 3, coinId: "C-2" },
    // Quarter — same rule, different denom, confirming no denom branch.
    { id: "AY-91003", name: "Washington Quarter", description: "Washington", denom: "25C",
      year: 1966, mint: "", grade: "MS-66", designation: "", finish: "SMS", value: 25, cost: 18, coinId: "C-3" },
    // Half dollar — same rule again.
    { id: "AY-91004", name: "Kennedy Half Dollar", description: "Kennedy", denom: "50C",
      year: 1967, mint: "", grade: "MS-64", designation: "", finish: "SMS", value: 30, cost: 22, coinId: "C-4" },
    // A control: same shape, but Finish="Business Strike" — must NOT show (SMS).
    { id: "AY-91005", name: "Roosevelt Dime", description: "Roosevelt", denom: "10C",
      year: 1966, mint: "", grade: "MS-65", designation: "", finish: "Business Strike", value: 4, cost: 3, coinId: "C-5" }
  ];
  await page.evaluate((seed) => { window.__SEED = seed; }, SEED);

  const C = await page.evaluate(() => {
    __setLiveCoinsForTest(window.__SEED);
    navigate("browse");
    const read = (id) => {
      showBrowseDetail(window.__SEED.find(c => c.id === id));
      return document.getElementById("browseDetailBL").textContent;
    };
    return {
      nickel: read("AY-91001"),
      cent: read("AY-91002"),
      quarter: read("AY-91003"),
      half: read("AY-91004"),
      controlDime: read("AY-91005")
    };
  });
  ok(C.nickel === "MS-65 (SMS)", "C1 Browse detail, Nickel SMS coin, grade only: " + C.nickel);
  ok(C.cent === "MS-67FB (SMS)", "C2 Browse detail, Cent SMS coin with Designation: " + C.cent);
  ok(C.quarter === "MS-66 (SMS)", "C3 Browse detail, Quarter SMS coin — confirms the rule isn't cent-specific: " + C.quarter);
  ok(C.half === "MS-64 (SMS)", "C4 Browse detail, Half Dollar SMS coin: " + C.half);
  ok(C.controlDime === "MS-65", "C5 Browse detail control — Finish=Business Strike shows no flag: " + C.controlDime);

  // ---------- D. Real Spotlight render path (applyFlipCorners("spotlight", ...) directly, same pattern verify_composition.js already uses) ----------
  const D = await page.evaluate(() => {
    applyFlipCorners("spotlight", window.__SEED.find(c => c.id === "AY-91002"));
    const withSms = document.getElementById("spotlightBL").textContent;
    applyFlipCorners("spotlight", window.__SEED.find(c => c.id === "AY-91005"));
    const withoutSms = document.getElementById("spotlightBL").textContent;
    return { withSms, withoutSms };
  });
  ok(D.withSms === "MS-67FB (SMS)", "D1 Spotlight shares applyFlipCorners() with Browse detail — same flag renders there too: " + D.withSms);
  ok(D.withoutSms === "MS-65", "D2 Spotlight control coin shows no flag: " + D.withoutSms);

  // ---------- E. Real Catalog-grid render path (renderBrowseGrid()'s OWN separate corner build) ----------
  const E = await page.evaluate(() => {
    __setLiveCoinsForTest(window.__SEED);
    navigate("browse");
    const blOf = (id) => {
      const card = [...document.querySelectorAll("#browseGrid .coin-card")]
        .find(c => c.querySelector(".card-id").textContent.trim() === id);
      const el = card.querySelector(".flip-label.bl");
      // The grid's narrower box can legitimately WRAP a long value across
      // two .corner-line divs (same fitted renderer as Browse detail, just
      // less room) — join with a space, same convention
      // catalog-grid-corners.js already established, since .textContent
      // concatenates block children with no separator of its own.
      return [...el.querySelectorAll(".corner-line")].map(l => l.textContent).join(" ");
    };
    return {
      nickel: blOf("AY-91001"),
      cent: blOf("AY-91002"),
      quarter: blOf("AY-91003"),
      half: blOf("AY-91004"),
      controlDime: blOf("AY-91005")
    };
  });
  ok(E.nickel === "MS-65 (SMS)", "E1 Catalog grid, Nickel SMS coin: " + E.nickel);
  ok(E.cent === "MS-67FB (SMS)", "E2 Catalog grid, Cent SMS coin with Designation: " + E.cent);
  ok(E.quarter === "MS-66 (SMS)", "E3 Catalog grid, Quarter SMS coin: " + E.quarter);
  ok(E.half === "MS-64 (SMS)", "E4 Catalog grid, Half Dollar SMS coin: " + E.half);
  ok(E.controlDime === "MS-65", "E5 Catalog grid control — no flag for Business Strike: " + E.controlDime);

  // ---------- F. Overflow/collision risk — the worst realistic case, both surfaces, both viewports ----------
  // The longest BL value this app already documents (from the reverse-face/
  // flip-card work): a free-typed Details grade. Appending " (SMS)" makes an
  // already-long string longer still — test explicitly rather than assume
  // the existing fitted renderer absorbs it silently.
  const WORST = { id: "AY-91099", name: "Test Coin", description: "Test", denom: "10C",
    year: 1966, mint: "", grade: "XF Details - Improperly Cleaned", designation: "",
    finish: "SMS", value: 1, cost: 1, coinId: "C-W" };

  for (const [label, vp] of [["phone", PHONE], ["tablet", TABLET]]) {
    const p = await openApp(vp);
    await p.evaluate((w) => { window.__WORST = w; }, WORST);

    const detailCheck = await p.evaluate(() => {
      __setLiveCoinsForTest([window.__WORST]);
      navigate("browse");
      showBrowseDetail(window.__WORST);
      const bl = document.getElementById("browseDetailBL");
      const frame = bl.closest(".flip-frame").getBoundingClientRect();
      const boxes = [...bl.querySelectorAll(".corner-line")].map(b => b.getBoundingClientRect());
      const text = [...bl.querySelectorAll(".corner-line")].map(b => b.textContent).join(" ");
      return {
        containsSms: text.indexOf("(SMS)") !== -1,
        clearsDisc: cornerClearsDisc(bl),
        withinFrame: boxes.every(r => r.right <= frame.right + 0.5 && r.bottom <= frame.bottom + 0.5)
      };
    });
    ok(detailCheck.containsSms, "F1(" + label + ") full flip card: the SMS flag survives on an already-long Details grade, not dropped: " + JSON.stringify(detailCheck));
    ok(detailCheck.clearsDisc, "F2(" + label + ") full flip card: still clears the coin disc with the flag appended: " + JSON.stringify(detailCheck));
    ok(detailCheck.withinFrame, "F3(" + label + ") full flip card: still stays inside the frame: " + JSON.stringify(detailCheck));

    const gridCheck = await p.evaluate(() => {
      __setLiveCoinsForTest([window.__WORST]);
      navigate("browse");
      const card = document.querySelector("#browseGrid .coin-card");
      const bl = card.querySelector(".flip-label.bl");
      const frame = card.querySelector(".flip-frame-mini").getBoundingClientRect();
      const boxes = [...bl.querySelectorAll(".corner-line")].map(b => b.getBoundingClientRect());
      const text = [...bl.querySelectorAll(".corner-line")].map(b => b.textContent).join(" ");
      return {
        containsSms: text.indexOf("(SMS)") !== -1,
        clearsDisc: cornerClearsDisc(bl),
        withinFrame: boxes.every(r => r.right <= frame.right + 0.5 && r.bottom <= frame.bottom + 0.5),
        overflow: document.body.scrollWidth > window.innerWidth
      };
    });
    ok(gridCheck.containsSms, "G1(" + label + ") Catalog grid (narrower card): the SMS flag survives on the same worst-case value: " + JSON.stringify(gridCheck));
    ok(gridCheck.clearsDisc, "G2(" + label + ") Catalog grid: still clears the disc — this is the surface with the least room: " + JSON.stringify(gridCheck));
    ok(gridCheck.withinFrame, "G3(" + label + ") Catalog grid: still stays inside the mini frame: " + JSON.stringify(gridCheck));
    ok(gridCheck.overflow === false, "G4(" + label + ") no page-level horizontal overflow: " + JSON.stringify(gridCheck));
  }

  // ---------- H. Nav smoke / no overflow at rest ----------
  const H = await page.evaluate(() => {
    __setLiveCoinsForTest(null);
    navigate("dashboard");
    return { overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(H.overflow === false, "H1 no horizontal overflow back at the Dashboard");
}, module);
