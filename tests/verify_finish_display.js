// Finish on the coin detail page (All.Finish only — never DB_Coins.Finish).
//
// Two places, both on Browse detail:
//  - a quiet "Finish: <value>" label line under the page title, in the empty
//    area to the left of the flip card (in flow under the title on a phone,
//    where that area is only ~50px wide);
//  - a FINISH row in the Overview accordion, after Variety and before Grade.
// The flip card itself must be untouched, front and back.

const { defineSuite } = require("./harness");

const FINISHES = ["Business Strike", "Proof", "Burnished", "Reverse Proof", "Various", "SMS",
  "Enhanced Uncirculated", "Uncirculated", "Specimen", "Matte"];

module.exports = defineSuite("finish-display", async ({ ok, openApp, PHONE, TABLET }) => {
  for (const [vpName, vp] of [["phone", PHONE], ["tablet", TABLET]]) {
    const page = await openApp(vp);
    const tag = (s) => s + " [" + vpName + "]";

    await page.evaluate(() => {
      const base = { name: "American Silver Eagle Dollar", description: "American Silver Eagle Dollar",
        denom: "$1", year: 1994, mint: "", variety: "Some Variety", grade: "MS-69", gradeSource: "PCGS",
        value: 40, cost: 30, designation: "", status: "Owned", coinId: "", setId: "", originSetId: "",
        rollId: "", category: "", vendor: "", purchaseDate: "", remarks: "", receiptFile: "" };
      window.__mk = (id, finish, extra) => Object.assign({}, base, { id, finish }, extra || {});
      window.__show = (coin) => {
        __setLiveDataModeForTest("live");
        __setLiveCoinsForTest([coin]);
        navigate("browse");
        showBrowseDetail(coin);
      };
      window.__overviewRows = () => {
        const acc = document.querySelector("#detailAccordions .detail-accordion");
        return Array.from(acc.querySelectorAll(".detail-row")).map(r => [
          (r.querySelector(".detail-label") || {}).textContent, (r.querySelector(".detail-value") || {}).textContent]);
      };
    });

    // ---------- A. The page line, every value in use ----------
    const A = await page.evaluate((finishes) => {
      return finishes.map((fin, i) => {
        window.__show(window.__mk("AY-9" + String(1000 + i), fin));
        const el = document.getElementById("browseDetailFinish");
        const title = document.querySelector(".detail-title-row").getBoundingClientRect();
        const flip = document.getElementById("browseDetailFlipFrame").getBoundingClientRect();
        const r = el.getBoundingClientRect();
        return { fin, text: el.textContent.replace(/\s+/g, " ").trim(), shown: getComputedStyle(el).display !== "none" && r.height > 0,
          belowTitle: r.top >= title.bottom - 1, leftOfOrAboveCard: r.right <= flip.left + 1 || r.bottom <= flip.top + 1,
          inView: r.left >= 0 && r.right <= window.innerWidth, overlapsCard: !(r.right <= flip.left || r.left >= flip.right || r.bottom <= flip.top || r.top >= flip.bottom) };
      });
    }, FINISHES);
    ok(A.every(a => a.shown && a.text === "Finish: " + a.fin), tag("A1 the page shows 'Finish: <value>' for every Finish value in use"), A.filter(a => !(a.shown && a.text === "Finish: " + a.fin)));
    ok(A.every(a => a.belowTitle), tag("A2 the Finish line sits directly under the page title"));
    ok(A.every(a => a.leftOfOrAboveCard && !a.overlapsCard), tag("A3 the Finish line never overlaps the flip card (left of it, or above it on a phone)"), A.filter(a => a.overlapsCard));
    ok(A.every(a => a.inView), tag("A4 the longest Finish value stays on screen"));

    // ---------- B. Placement detail, per viewport ----------
    const B = await page.evaluate(() => {
      window.__show(window.__mk("AY-91100", "Proof"));
      const el = document.getElementById("browseDetailFinish");
      const flip = document.getElementById("browseDetailFlipFrame").getBoundingClientRect();
      const title = document.querySelector(".detail-title-row").getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const label = el.querySelector(".detail-label");
      return { leftOfCard: r.right <= flip.left, alignedTop: Math.abs(r.top - flip.top) <= 2,
        flipGapToTitle: Math.round(flip.top - title.bottom), leftAligned: Math.abs(r.left - title.left) <= 2,
        labelClass: !!label, labelFont: label && getComputedStyle(label).fontSize };
    });
    if (vpName === "tablet") {
      ok(B.leftOfCard && B.alignedTop, tag("B1 on a wide screen the line sits in the empty area left of the card, level with its top"), B);
      ok(B.flipGapToTitle <= 12, tag("B2 on a wide screen the card does not move down (it stays right under the title)"), B.flipGapToTitle);
    } else {
      ok(B.leftAligned, tag("B1 on a phone the line sits left-aligned in flow under the title"), B);
      ok(B.flipGapToTitle > 12, tag("B2 on a phone the card moves down by the one line"), B.flipGapToTitle);
    }
    ok(B.labelClass && B.labelFont === "11px", tag("B3 'Finish:' uses the page's existing .detail-label styling"), B);

    // ---------- C. Blank Finish shows nothing ----------
    const C = await page.evaluate(() => {
      const out = [];
      for (const fin of ["", "   ", undefined, null]) {
        window.__show(window.__mk("AY-91200", fin));
        const el = document.getElementById("browseDetailFinish");
        const r = el.getBoundingClientRect();
        out.push({ fin: String(fin), text: el.textContent.trim(), visible: getComputedStyle(el).display !== "none" && r.height > 0,
          overviewHasFinish: window.__overviewRows().some(([l]) => /finish/i.test(l || "")) });
      }
      return out;
    });
    ok(C.every(c => !c.visible && c.text === ""), tag("C1 a blank Finish shows no page line at all — no label, no placeholder"), C);
    ok(C.every(c => !c.overviewHasFinish), tag("C2 a blank Finish adds no Overview row"));

    // ---------- D. Overview row order ----------
    const D = await page.evaluate(() => {
      window.__show(window.__mk("AY-91300", "Reverse Proof"));
      return window.__overviewRows().map(([l, v]) => [l.trim(), (v || "").trim()]);
    });
    const labels = D.map(r => r[0]);
    const iV = labels.indexOf("Variety"), iF = labels.indexOf("Finish"), iG = labels.indexOf("Grade");
    ok(iF !== -1 && D[iF][1] === "Reverse Proof", tag("D1 the Overview carries a Finish row with the value"), D);
    ok(iV !== -1 && iG !== -1 && iF === iV + 1 && iG === iF + 1, tag("D2 Finish sits after Variety and before Grade"), labels);

    // ---------- E. Sets and Set children ----------
    const E = await page.evaluate(() => {
      const set = window.__mk("AY-91400", "Proof", { denom: "Multiple", name: "1994 Proof Set", description: "1994 Proof Set", variety: "", grade: "" });
      const child = window.__mk("AY-91400-A", "Proof", { denom: "50C", name: "Kennedy Half", originSetId: "AY-91400" });
      const blankSet = window.__mk("AY-91500", "", { denom: "Multiple", name: "1995 Mint Set", variety: "", grade: "" });
      __setLiveDataModeForTest("live");
      __setLiveCoinsForTest([set, child, blankSet]);
      navigate("browse");
      const read = (c) => { showBrowseDetail(c); const el = document.getElementById("browseDetailFinish");
        return { text: el.textContent.replace(/\s+/g, " ").trim(), visible: el.getBoundingClientRect().height > 0,
          ov: window.__overviewRows().find(([l]) => /^Finish$/.test((l || "").trim())) }; };
      return { set: read(set), child: read(child), blankSet: read(blankSet) };
    });
    ok(E.set.visible && E.set.text === "Finish: Proof" && E.set.ov, tag("E1 a Set with a Finish shows it (page line + Overview)"), E.set);
    ok(E.child.visible && E.child.text === "Finish: Proof" && E.child.ov, tag("E2 a Set child with a Finish shows it"), E.child);
    ok(!E.blankSet.visible && !E.blankSet.ov, tag("E3 a Set with no Finish shows neither"), E.blankSet);

    // ---------- F. The flip card is unchanged ----------
    const F = await page.evaluate(() => {
      const coin = window.__mk("AY-91600", "Enhanced Uncirculated");
      const noFin = Object.assign({}, coin, { finish: "" }); // same id, Finish blank
      __setLiveDataModeForTest("live");
      navigate("browse");
      const snap = (c, side) => {
        __setLiveCoinsForTest([c]);
        showBrowseDetail(c);
        if (side === "reverse") toggleBrowseDetailSide();
        const f = document.getElementById("browseDetailFlipFrame");
        return { text: f.textContent, hasFinishWord: /Enhanced|Finish/i.test(f.textContent),
          kids: Array.from(f.children).map(k => k.id).join(",") };
      };
      return { obv: snap(coin, "obverse"), obvNo: snap(noFin, "obverse"), rev: snap(coin, "reverse"), revNo: snap(noFin, "reverse") };
    });
    ok(!F.obv.hasFinishWord && !F.rev.hasFinishWord, tag("F1 Finish never appears on the flip card, front or back"), F.obv.text);
    ok(F.obv.text === F.obvNo.text && F.rev.text === F.revNo.text, tag("F2 the flip card's front and back read identically with and without a Finish"), [F.obv.text, F.obvNo.text]);
    ok(F.obv.kids === "browseDetailTL,browseDetailTR,browseDetailDisc,browseDetailBL,browseDetailBR,browseDetailSR",
      tag("F3 the flip card's own markup is unchanged (same six children, same order)"), F.obv.kids);

    // ---------- G. Other screens unchanged ----------
    const G = await page.evaluate(() => {
      const coin = window.__mk("AY-91700", "Proof");
      __setLiveDataModeForTest("live");
      __setLiveCoinsForTest([coin]);
      navigate("browse");
      const grid = document.getElementById("browseGrid").textContent;
      navigate("dashboard");
      const spot = document.getElementById("spotlightFlipFrame").textContent;
      return { grid: /Proof|Finish/.test(grid), spot: /Proof|Finish/.test(spot) };
    });
    ok(!G.grid && !G.spot, tag("G1 Catalog cards and the Spotlight flip card show no Finish"), G);

    await page.evaluate(() => { __setLiveCoinsForTest(null); __setLiveDataModeForTest(null); });
    await page.context().close();
  }
}, module);
