// Add Coin's live preview card gets the same flip-text treatment as the
// saved-coin card: FLIP_TEXT_ABBREVIATIONS, the overflow clamp
// (clampFlipCorners) and the shared fit (renderFittedCornerLines).
//
// What the preview draws (updateFlipLabels): front TL Year-Mint, TR the
// denomination code ONLY, BL Grade + grading service, BR Variety over
// Designation; back TL Error, BR Purchase Price. The Description is not
// drawn on the preview card at all, so a long Description cannot overflow
// it and the trailing-denomination rule has nothing to act on there — the
// long text the preview can actually carry is Variety and Error, which is
// where these tests put the two Marine Corps strings.
// Display only: what Add Coin saves stays exactly as typed.

const { defineSuite } = require("./harness");

const REAL = ["U.S. Marine Corps 250th Anniversary Privy Mark", "U.S. Marine Corps 250th Anniversary Proof Silver $1"];
const EXTREME = "U.S. Marine Corps 250th Anniversary Commemorative Proof Silver Dollar Special Edition Privy Mark Collector Release";
const DESKTOP = { width: 1440, height: 900 };

module.exports = defineSuite("addcoin-preview-fit", async ({ ok, openApp, PHONE, TABLET }) => {
  for (const [vpName, vp] of [["phone", PHONE], ["tablet", TABLET], ["desktop", DESKTOP]]) {
    const page = await openApp(vp);
    const tag = (s) => s + " [" + vpName + "]";

    await page.evaluate(() => {
      window.__measure = (frame) => {
        const f = frame.getBoundingClientRect();
        const inks = [];
        const corners = [...frame.querySelectorAll(".flip-label")].map(el => {
          const lines = [...el.querySelectorAll(".corner-line")];
          (lines.length ? lines : [el]).forEach(n => {
            if (!n.textContent.trim()) return;
            const rg = document.createRange(); rg.selectNodeContents(n);
            const r = rg.getBoundingClientRect();
            inks.push({ k: el.id, l: r.left, r: r.right, t: r.top, b: r.bottom });
          });
          return { id: el.id, text: lines.length ? lines.map(l => l.textContent).join(" | ") : el.textContent,
            fits: el.scrollWidth <= el.clientWidth, fs: parseFloat(getComputedStyle(el).fontSize) };
        });
        const outside = inks.filter(i => i.l < f.left - 0.5 || i.r > f.right + 0.5 || i.t < f.top - 0.5 || i.b > f.bottom + 0.5).map(i => i.k);
        const overlaps = [];
        for (let a = 0; a < inks.length; a++) for (let b = a + 1; b < inks.length; b++) {
          const A = inks[a], B = inks[b];
          if (A.k !== B.k && A.l < B.r && B.l < A.r && A.t < B.b && B.t < A.b) overlaps.push(A.k + "/" + B.k);
        }
        return { corners, outside, overlaps, allFit: corners.every(c => c.fits), laidOut: f.width > 0 };
      };
      window.__fill = (fields) => {
        navigate("addcoin");
        const set = (id, v) => { const el = document.getElementById(id); el.value = v; };
        set("denomination", "$1"); set("year", "2025"); set("mintMark", "P");
        set("description", fields.description || ""); set("variety", fields.variety || "");
        set("designation", fields.designation || ""); set("errorDesc", fields.error || "");
        set("gradeFrom", fields.grade || "PR-70"); set("gradeSource", "PCGS");
        set("purchasePrice", fields.price || "");
        if (fields.openPhotos !== false) {
          const body = document.getElementById("addCoinPhotosBody");
          if (body.classList.contains("hidden")) document.getElementById("addCoinPhotosHeader").click();
        }
        updateFlipLabels();
      };
      window.__front = () => window.__measure(document.querySelector("#obversePhotoBox .flip-frame"));
      window.__back = () => { document.getElementById("showReverseBtn").click();
        const m = window.__measure(document.querySelector("#reversePhotoBox .flip-frame"));
        document.getElementById("showObverseBtn").click(); return m; };
    });

    // ---------- A. The two descriptions typed into Description ----------
    const A = await page.evaluate((REAL) => REAL.map(d => { window.__fill({ description: d, designation: "DCAM" }); return window.__front(); }), REAL);
    ok(A.every(m => m.laidOut && !m.outside.length && !m.overlaps.length && m.allFit), tag("A1 typed into Description, both stay inside the preview card with no overlaps"), A.map(m => [m.outside, m.overlaps]));
    ok(A.every(m => m.corners.find(c => c.id === "flipObverseTR").text === "$1"), tag("A2 the preview's top-right is the denomination only — the Description is not drawn there"), A.map(m => m.corners));

    // ---------- B. The same strings in Variety, which IS drawn (BR) ----------
    const B = await page.evaluate((REAL) => REAL.map(v => { window.__fill({ variety: v, designation: "DCAM" }); return window.__front(); }), REAL);
    B.forEach((m, i) => {
      const br = m.corners.find(c => c.id === "flipObverseBR").text;
      ok(m.laidOut && !m.outside.length && !m.overlaps.length && m.allFit, tag(`B${i}.1 Variety "${REAL[i].slice(-15)}": inside the card, no overlaps, every corner fits`), [m.outside, m.overlaps, m.corners]);
      ok(/USMC/.test(br) && !/Marine|Anniversary/.test(br) && /DCAM/.test(br), tag(`B${i}.2 the preview shows it abbreviated, Designation still shown`), br);
    });

    // ---------- C. The back face: Error ----------
    const C = await page.evaluate(() => { window.__fill({ error: "Obv. U.S. Marine Corps privy doubled, Rev. Anniversary date filled", price: "95" }); return window.__back(); });
    const ctl = C.corners.find(c => c.id === "flipReverseTL").text;
    ok(C.laidOut && !C.outside.length && !C.overlaps.length && C.allFit, tag("C1 back of the preview: Error stays inside the card with no overlaps"), [C.outside, C.overlaps, C.corners]);
    ok(/USMC/.test(ctl) && /Ann\./.test(ctl) && !/Marine Corps|Anniversary/.test(ctl), tag("C2 the abbreviations apply on the back of the preview too"), ctl);

    // ---------- D. Clamp safety net ----------
    const D = await page.evaluate((EXTREME) => { window.__fill({ variety: EXTREME + ", " + EXTREME, designation: "DCAM" }); return window.__front(); }, EXTREME);
    ok(D.laidOut && !D.outside.length && !D.overlaps.length && D.allFit, tag("D1 an extreme Variety still stays inside the preview card with no overlaps"), [D.outside, D.overlaps, D.corners]);
    ok(D.corners.every(c => c.fs >= 9) && /…/.test(D.corners.find(c => c.id === "flipObverseBR").text), tag("D2 the clamp truncates with an ellipsis and never goes under 9px"), D.corners);

    // ---------- E. Typed while the Photos section is closed, then opened ----------
    const E = await page.evaluate((EXTREME) => {
      navigate("addcoin");
      const body = document.getElementById("addCoinPhotosBody");
      if (!body.classList.contains("hidden")) document.getElementById("addCoinPhotosHeader").click();
      window.__fill({ variety: EXTREME, designation: "DCAM", openPhotos: false });
      document.getElementById("addCoinPhotosHeader").click(); // open it now
      return window.__front();
    }, EXTREME);
    ok(E.laidOut && !E.outside.length && !E.overlaps.length && E.allFit, tag("E1 text set while Photos was closed is re-fitted when Photos opens"), [E.outside, E.overlaps, E.corners]);

    // ---------- F. What is saved stays exactly as typed ----------
    const F = await page.evaluate((REAL) => {
      window.__fill({ description: REAL[1], variety: REAL[0], designation: "DCAM", error: "Rev. Anniversary date filled" });
      const draft = readAddCoinFormForDraft();
      return { description: draft.description, variety: draft.variety, errorDesc: draft.errorDesc,
        input: document.getElementById("variety").value };
    }, REAL);
    ok(F.description === REAL[1] && F.variety === REAL[0] && F.errorDesc === "Rev. Anniversary date filled" && F.input === REAL[0],
      tag("F1 the values Add Coin saves are the full, unabbreviated text"), F);

    // ---------- G. Ordinary values render as before ----------
    const G = await page.evaluate(() => { window.__fill({ variety: "VDB", designation: "RD", grade: "MS-65" });
      const t = (id) => document.getElementById(id).textContent;
      return { tl: t("flipObverseTL"), tr: t("flipObverseTR"), bl: t("flipObverseBL"),
        br: [...document.getElementById("flipObverseBR").querySelectorAll(".corner-line")].map(n => n.textContent),
        sizes: ["TL", "TR", "BL", "BR"].map(k => document.getElementById("flipObverse" + k).style.fontSize) }; });
    ok(G.tl === "2025-P" && G.tr === "$1" && G.bl === "MS-65 PCGS" && G.br.join("|") === "VDB|RD", tag("G1 short values read exactly as before"), G);
    ok(G.sizes.every(s => s === ""), tag("G2 short values stay at their natural size (no shrink, no clamp)"), G.sizes);

    await page.context().close();
  }
}, module);
