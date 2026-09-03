// Catalog grid TL/BL corners — Variety and Designation (ParkingLot Row 2).
// Confirmed on a real device: a 1909 VDB cent rendered identically to a
// plain 1909 in the Catalog grid, because renderBrowseGrid() built its TL/BL
// corners by plain string interpolation into the card's innerHTML and never
// included either field. See CLAUDE.md "Catalog grid: Variety/Designation".

const { defineSuite } = require("./harness");

// A VDB cent (Variety + Designation), its plain sibling, and a coin with
// neither. No FAKE_COINS row carries a variety at all, so the live-data seam
// is what exercises the real render path here.
const SEED = [
  { id: "AY-90001", name: "Lincoln Wheat Cent", description: "Lincoln Wheat", denom: "1C",
    year: 1909, mint: "S", variety: "VDB", grade: "MS-65", designation: "RD",
    value: 3200, cost: 2000, coinId: "C-A" },
  { id: "AY-90002", name: "Lincoln Wheat Cent", description: "Lincoln Wheat", denom: "1C",
    year: 1909, mint: "S", variety: "", grade: "MS-65", designation: "",
    value: 120, cost: 80, coinId: "C-B" },
  { id: "AY-90003", name: "Morgan Dollar", description: "Morgan", denom: "$1",
    year: 1889, mint: "CC", variety: "", grade: "", designation: "",
    value: 900, cost: 800, coinId: "C-C" }
];

module.exports = defineSuite("catalog-grid-corners", async ({ ok, openApp, PHONE, TABLET }) => {
  for (const [label, vp] of [["phone", PHONE], ["tablet", TABLET]]) {
    const page = await openApp(vp);
    await page.evaluate((seed) => { window.__SEED = seed; }, SEED);

    // ---------- A. The reported bug: Variety renders in the grid ----------
    const A = await page.evaluate(() => {
      __setLiveCoinsForTest(window.__SEED);
      navigate("browse");
      const cards = [...document.querySelectorAll("#browseGrid .coin-card")];
      const byId = {};
      cards.forEach(c => {
        const id = c.querySelector(".card-id").textContent.trim();
        const grab = sel => {
          const e = c.querySelector(sel);
          return { lines: [...e.querySelectorAll(".corner-line")].map(l => l.textContent), text: e.textContent };
        };
        byId[id] = { tl: grab(".flip-label.tl"), bl: grab(".flip-label.bl") };
      });
      return byId;
    });
    ok(JSON.stringify(A["AY-90001"].tl.lines) === JSON.stringify(["1909-S", "VDB"]),
      "A1(" + label + ") the VDB cent's TL shows Year-Mint over Variety as two stacked lines: " + JSON.stringify(A["AY-90001"].tl.lines));
    ok(A["AY-90001"].bl.lines.length === 1 && A["AY-90001"].bl.lines[0] === "MS-65RD",
      "A2(" + label + ") ... and BL concatenates Grade+Designation with no space, matching the full flip card: " + JSON.stringify(A["AY-90001"].bl.lines));
    // The whole point: the two 1909-S cents must no longer look identical.
    ok(A["AY-90001"].tl.text !== A["AY-90002"].tl.text,
      "A3(" + label + ") the VDB cent and its plain sibling are no longer indistinguishable in the grid");
    ok(JSON.stringify(A["AY-90002"].tl.lines) === JSON.stringify(["1909-S"]),
      "A4(" + label + ") a coin with no Variety renders a SINGLE TL line, not a blank second one");
    ok(JSON.stringify(A["AY-90002"].bl.lines) === JSON.stringify(["MS-65"]),
      "A5(" + label + ") ... and Grade alone when Designation is blank, no trailing artifact");
    ok(A["AY-90003"].bl.lines.length === 0 && A["AY-90003"].bl.text === "",
      "A6(" + label + ") a coin with neither Grade nor Designation renders an empty BL, not an empty box");

    // ---------- B. Fitted: clears the disc, stays in the frame ----------
    const B = await page.evaluate(() => {
      __setLiveCoinsForTest([
        // A genuinely long real variety — this is what forces the fitting to
        // do something, and what plain string-appending could never handle.
        { id: "AY-90010", name: "Lincoln Wheat Cent", description: "Lincoln Wheat", denom: "1C",
          year: 1955, mint: "", variety: "Doubled Die Obverse", grade: "MS-64", designation: "RB",
          value: 1, cost: 1, coinId: "C-D" }
      ]);
      navigate("browse");
      const card = document.querySelector("#browseGrid .coin-card");
      const frame = card.querySelector(".flip-frame-mini").getBoundingClientRect();
      const el = card.querySelector(".flip-label.tl");
      const boxes = [...el.querySelectorAll(".corner-line")].map(b => b.getBoundingClientRect());
      return {
        lines: [...el.querySelectorAll(".corner-line")].map(l => l.textContent),
        font: parseFloat(getComputedStyle(el).fontSize),
        clears: cornerClearsDisc(el),
        withinFrame: boxes.every(r => r.right <= frame.right + 0.5 && r.bottom <= frame.bottom + 0.5),
        // the full variety text is preserved, never truncated away
        keptFullVariety: el.textContent.indexOf("Doubled Die Obverse") !== -1
      };
    });
    ok(B.lines.length === 2 && B.keptFullVariety,
      "B1(" + label + ") a long Variety is kept in full across two stacked lines, never truncated: " + JSON.stringify(B.lines));
    ok(B.clears, "B2(" + label + ") ... and the shrunk corner genuinely clears the coin disc");
    ok(B.font < 14, "B3(" + label + ") ... having actually shrunk from the natural 14px to fit: " + B.font + "px");
    ok(B.withinFrame, "B4(" + label + ") ... and stays inside the card's frame");

    // ---------- C. The clearance check must not be a no-op here ----------
    // .flip-frame-mini is a SEPARATE class from .flip-frame, so
    // cornerClearsDisc()'s closest() lookup used to return null on a Catalog
    // card and short-circuit to `true` — meaning TR/BR never had clearance
    // protection here either. Found while wiring TL/BL.
    //
    // NOTE: asserting cornerClearsDisc() is TRUE proves nothing — the broken
    // version returned true too, by early-exit. A first version of this block
    // did exactly that and passed against the narrowed selector. The only
    // assertion that discriminates is a corner that genuinely OVERLAPS the
    // disc: real enforcement returns false, a no-op returns true.
    const C = await page.evaluate(() => {
      __setLiveCoinsForTest(window.__SEED);
      navigate("browse");
      const card = document.querySelector("#browseGrid .coin-card");
      const el = card.querySelector(".flip-label.tl");
      const disc = card.querySelector(".coin-disc");
      const before = cornerClearsDisc(el);

      // Park the corner directly on top of the disc's centre. Nothing about
      // its own box changes — it still fits its width — so ONLY a working
      // clearance test can report this.
      const d = disc.getBoundingClientRect();
      const f = card.querySelector(".flip-frame-mini").getBoundingClientRect();
      el.style.top = (d.top - f.top + d.height / 2 - 6) + "px";
      el.style.left = (d.left - f.left + d.width / 2 - 6) + "px";
      el.style.right = "auto";
      const overlapping = cornerClearsDisc(el);
      const stillFitsItsBox = el.scrollWidth <= el.clientWidth;
      el.style.top = el.style.left = el.style.right = "";

      return {
        findsPlainFrame: !!el.closest(".flip-frame"),
        before, overlapping, stillFitsItsBox
      };
    });
    ok(C.findsPlainFrame === false,
      "C1(" + label + ") a Catalog card is .flip-frame-mini, NOT .flip-frame — the old selector could never match it");
    ok(C.before === true,
      "C2(" + label + ") a normally-placed corner clears the disc");
    ok(C.stillFitsItsBox === true,
      "C3(" + label + ") the overlap case still fits its own box, so a width-only check cannot see it");
    ok(C.overlapping === false,
      "C4(" + label + ") a corner parked ON the disc is genuinely reported as NOT clearing — proves the clearance test is live on mini cards, not short-circuiting to true");

    // ---------- D. No regression to TR/BR on the same card ----------
    const D = await page.evaluate(() => {
      __setLiveCoinsForTest(window.__SEED);
      navigate("browse");
      const cards = [...document.querySelectorAll("#browseGrid .coin-card")];
      const morgan = cards.find(c => /AY-90003/.test(c.querySelector(".card-id").textContent));
      const tr = morgan.querySelector(".flip-label.tr");
      return {
        trLines: [...tr.querySelectorAll(".corner-line")].map(l => l.textContent),
        trFont: parseFloat(getComputedStyle(tr).fontSize),
        noOverflow: document.body.scrollWidth <= window.innerWidth
      };
    });
    ok(JSON.stringify(D.trLines) === JSON.stringify(["Morgan", "$1"]),
      "D1(" + label + ") TR still renders series over denom code, unchanged: " + JSON.stringify(D.trLines));
    ok(D.trFont === 14, "D2(" + label + ") ... at its natural size — enabling clearance on mini cards did not over-shrink it");
    ok(D.noOverflow, "D3(" + label + ") no horizontal page overflow");

    await page.evaluate(() => __setLiveCoinsForTest(null));
  }
}, module);
