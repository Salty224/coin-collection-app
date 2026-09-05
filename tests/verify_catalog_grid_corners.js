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
        // the full variety text is preserved, never truncated away. Lines are
        // joined with a space because .textContent concatenates .corner-line
        // children with no separator — a wrapped "Doubled Die Obverse" would
        // otherwise read as "DoubledDie Obverse".
        keptFullVariety: [...el.querySelectorAll(".corner-line")].map(l => l.textContent).join(" ")
          .indexOf("Doubled Die Obverse") !== -1
      };
    });
    // Line count is no longer pinned at 2: the grid now routes TL through
    // renderFittedCornerLines(), which may WRAP the variety across two lines
    // rather than shrinking it into illegibility. What matters is that the
    // full string survives, at whatever line count the fit lands on.
    ok(B.lines.length >= 2 && B.keptFullVariety,
      "B1(" + label + ") a long Variety is kept in full across stacked lines, never truncated: " + JSON.stringify(B.lines));
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

    // ---------- E. The 1787 Fugio Cent, AT GRID DIMENSIONS ----------
    // The full detail card's TL was fixed in the previous round and came back
    // clean on a real device — the Catalog GRID still collided, because the
    // grid used a shrink-only renderer (setStackedCornerText(), now retired)
    // while the grid's own TR and the full card's TL both use the shrink+wrap
    // chain. The earlier "0px worst-case overlap" measurement was taken at the
    // full card's 139px corner box; the grid's is ~34-38px, roughly a quarter
    // of it. Everything here is measured at the grid's real dimensions.
    //
    // OVERLAP IS MEASURED ON INK, NOT ON BOXES. A .corner-line is nowrap with
    // max-width:100%, so its BOX is clamped to the parent while the text
    // spills visibly past it — a box-rect test reports 0 overlap for exactly
    // the broken case. Same trap this project has hit before; measure
    // scrollWidth, and measure right-anchored corners from their right edge.
    const E = await page.evaluate(() => {
      __setLiveCoinsForTest([
        { id: "AY-90020", name: "Fugio Cent", description: "Fugio", denom: "1C",
          year: 1787, mint: "S", variety: "Newman 15-H, Pointed Rays, 4 Cinq., R-4",
          grade: "VF-30", designation: "", value: 1, cost: 1, coinId: "C-F" },
        // Deliberate worst case: a long Variety AND a long type name, so TL and
        // TR are each at maximum width simultaneously.
        { id: "AY-90021", name: "Washington Crossing the Delaware Quarter",
          description: "Washington Crossing the Delaware", denom: "25C",
          year: 2021, mint: "S", variety: "Newman 15-H, Pointed Rays, 4 Cinq., R-4",
          grade: "XF Details - Improperly Cleaned", designation: "", value: 1, cost: 1, coinId: "C-W" }
      ]);
      navigate("browse");
      const inkWidth = el => {
        const lines = [...el.querySelectorAll(".corner-line")];
        return lines.length ? Math.max(...lines.map(l => l.scrollWidth)) : el.scrollWidth;
      };
      const read = id => {
        const card = [...document.querySelectorAll("#browseGrid .coin-card")]
          .find(c => c.querySelector(".card-id").textContent.indexOf(id) !== -1);
        const tl = card.querySelector(".flip-label.tl"), tr = card.querySelector(".flip-label.tr");
        const frame = card.querySelector(".flip-frame-mini").getBoundingClientRect();
        const boxes = [...tl.querySelectorAll(".corner-line")].map(b => b.getBoundingClientRect());
        // TL is left-anchored: ink runs rightward from its left edge.
        // TR is right-anchored: ink runs leftward from its right edge.
        const tlInkRight = tl.getBoundingClientRect().left + inkWidth(tl);
        const trInkLeft = tr.getBoundingClientRect().right - inkWidth(tr);
        return {
          tlLines: [...tl.querySelectorAll(".corner-line")].map(l => l.textContent),
          tlFont: parseFloat(getComputedStyle(tl).fontSize),
          tlBox: Math.round(tl.clientWidth),
          tlFits: tl.scrollWidth <= tl.clientWidth,
          tlClears: cornerClearsDisc(tl),
          withinFrame: boxes.every(r => r.right <= frame.right + 0.5 && r.bottom <= frame.bottom + 0.5),
          inkOverlap: Math.round((tlInkRight - trInkLeft) * 10) / 10
        };
      };
      return { fugio: read("AY-90020"), worst: read("AY-90021") };
    });
    ok(E.fugio.tlBox < 60,
      "E1(" + label + ") the grid's TL box really is a fraction of the full card's ~139px: " + E.fugio.tlBox + "px");
    ok(E.fugio.inkOverlap <= 0,
      "E2(" + label + ") the Fugio Cent's TL ink no longer runs into the TR corner at grid width (<=0 means clear): " + E.fugio.inkOverlap + "px");
    ok(E.fugio.tlFits && E.fugio.tlClears && E.fugio.withinFrame,
      "E3(" + label + ") ... and its TL fits its own box, clears the disc, and stays inside the frame");
    ok(E.fugio.tlFont >= 14 * 0.67 - 0.01,
      "E4(" + label + ") ... at a legible size, not the 6.72px floor the shrink-only renderer bottomed out at: " + E.fugio.tlFont + "px");
    ok(E.worst.inkOverlap <= 0,
      "E5(" + label + ") the worst case (long Variety AND long type name, both corners at max width) also has zero ink overlap: " + E.worst.inkOverlap + "px");
    ok(E.worst.tlFits && E.worst.tlClears && E.worst.withinFrame,
      "E6(" + label + ") ... with TL still fitting, clearing the disc, and inside the frame — box-fitting IS sufficient at grid width, no mutual clearance check needed");

    // ---------- F. Comma-segment truncation, grid only ----------
    const F = await page.evaluate(() => {
      const read = () => {
        const tl = document.querySelector("#browseGrid .coin-card .flip-label.tl");
        return {
          text: [...tl.querySelectorAll(".corner-line")].map(l => l.textContent).join(" "),
          font: parseFloat(getComputedStyle(tl).fontSize)
        };
      };
      const out = {};
      // A comma-segmented Variety too long to fit legibly in full.
      __setLiveCoinsForTest([{ id: "AY-90030", name: "Fugio Cent", description: "Fugio", denom: "1C",
        year: 1787, mint: "S", variety: "Newman 15-H, Pointed Rays, 4 Cinq., R-4",
        grade: "VF-30", designation: "", value: 1, cost: 1, coinId: "C-F" }]);
      navigate("browse");
      out.truncated = read();
      // No comma to reduce along — must keep the full string rather than clip it.
      __setLiveCoinsForTest([{ id: "AY-90031", name: "Lincoln Wheat Cent", description: "Lincoln Wheat",
        denom: "1C", year: 1955, mint: "", variety: "Doubled Die Obverse",
        grade: "MS-64", designation: "RB", value: 1, cost: 1, coinId: "C-D" }]);
      navigate("browse");
      out.noComma = read();
      // Short enough to fit at natural size — must not be touched at all.
      __setLiveCoinsForTest([{ id: "AY-90032", name: "Lincoln Wheat Cent", description: "Lincoln Wheat",
        denom: "1C", year: 1909, mint: "S", variety: "VDB",
        grade: "MS-65", designation: "RD", value: 1, cost: 1, coinId: "C-V" }]);
      navigate("browse");
      out.short = read();
      out.helper = {
        splits: firstVarietySegment("Newman 15-H, Pointed Rays, 4 Cinq., R-4"),
        noComma: firstVarietySegment("Doubled Die Obverse"),
        leadingComma: firstVarietySegment(", Pointed Rays"),
        blank: firstVarietySegment("")
      };
      return out;
    });
    ok(F.helper.splits === "Newman 15-H",
      "F1(" + label + ") firstVarietySegment() reduces along the real comma boundary: " + F.helper.splits);
    ok(F.helper.noComma === null && F.helper.leadingComma === null && F.helper.blank === null,
      "F2(" + label + ") ... and returns null when there is nothing to gain (no comma, leading comma, blank)");
    ok(F.truncated.text.indexOf("Newman 15-H") !== -1 && F.truncated.text.indexOf("Pointed Rays") === -1,
      "F3(" + label + ") the Fugio's grid TL shows the first segment only: " + JSON.stringify(F.truncated.text));
    ok(F.truncated.text.indexOf("\u2026") !== -1,
      "F4(" + label + ") ... with an ellipsis, so the reduction is visible rather than silent");
    ok(F.truncated.font > 6.72 + 0.01,
      "F5(" + label + ") ... and it actually bought legibility over the un-truncated 6.72px floor: " + F.truncated.font + "px");
    ok(F.noComma.text.indexOf("Doubled Die Obverse") !== -1 && F.noComma.text.indexOf("\u2026") === -1,
      "F6(" + label + ") a Variety with no comma is kept in full, never clipped: " + JSON.stringify(F.noComma.text));
    ok(F.short.text.indexOf("VDB") !== -1 && F.short.font === 14,
      "F7(" + label + ") a short Variety is untouched at natural size — truncation only fires below the legibility floor");

    // The full string is never lost: the coin's own detail page still shows it.
    const F2 = await page.evaluate(() => {
      __setLiveCoinsForTest([{ id: "AY-90030", name: "Fugio Cent", description: "Fugio", denom: "1C",
        year: 1787, mint: "S", variety: "Newman 15-H, Pointed Rays, 4 Cinq., R-4",
        grade: "VF-30", designation: "", value: 1, cost: 1, coinId: "C-F" }]);
      navigate("browse");
      document.querySelector("#browseGrid .coin-card").click();
      const tl = document.getElementById("browseDetailTL");
      return {
        text: [...tl.querySelectorAll(".corner-line")].map(l => l.textContent).join(" "),
        fits: tl.scrollWidth <= tl.clientWidth
      };
    });
    ok(F2.text.indexOf("Pointed Rays") !== -1 && F2.text.indexOf("R-4") !== -1,
      "F8(" + label + ") the detail page still shows the COMPLETE Variety — truncation is scoped to the mini card: " + JSON.stringify(F2.text));
    ok(F2.fits, "F9(" + label + ") ... and still fits its own (much wider) corner box there");

    // ---------- G. Escaping moved into renderCornerLines() ----------
    // The grid used to pre-escape its corner text with escapeHtmlText().
    // Routing TL through the WRAPPING fitter made that unsafe:
    // wrapTextToTwoLines() splits on whitespace, so an already-escaped
    // "&amp;" could be sliced into "&am" + "p;" across a line break. Escaping
    // now happens once, on the final text, inside renderCornerLines() — so
    // every caller passes raw and none of them can double-escape.
    const G = await page.evaluate(() => {
      __setLiveCoinsForTest([{ id: "AY-90040", name: "Lincoln Wheat Cent", description: "Lincoln Wheat",
        denom: "1C", year: 1909, mint: "S", variety: "Doubled & <Repunched> Mintmark",
        grade: "MS-65", designation: "", value: 1, cost: 1, coinId: "C-E" }]);
      navigate("browse");
      const tl = document.querySelector("#browseGrid .coin-card .flip-label.tl");
      return {
        text: [...tl.querySelectorAll(".corner-line")].map(l => l.textContent).join(" "),
        html: tl.innerHTML
      };
    });
    ok(G.text.indexOf("&") !== -1 && G.text.indexOf("<Repunched>") !== -1,
      "G1(" + label + ") an ampersand/angle-bracket Variety renders as the literal characters, not an entity or markup: " + JSON.stringify(G.text));
    ok(G.text.indexOf("&amp;") === -1,
      "G2(" + label + ") ... and is not double-escaped — escaping happens once, inside renderCornerLines()");
    ok(G.html.indexOf("&lt;Repunched&gt;") !== -1,
      "G3(" + label + ") ... while the underlying markup IS escaped, so raw input can never inject elements");

    await page.evaluate(() => __setLiveCoinsForTest(null));
  }
}, module);
