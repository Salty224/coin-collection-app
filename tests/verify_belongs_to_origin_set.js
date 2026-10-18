// "Belongs to": Set membership from OriginSetID only (Ray's rule, Oct 2026).
//
// SetID is the catalog id of the product a coin was issued in, not
// membership. Matching it against owned Set rows produced three live bugs:
//   * AY-00463-B (SetID S-2026-BM-01, OriginSetID AY-00463) showed the same
//     Set TWICE — one chip from SetID, one from OriginSetID;
//   * AY-00706 (same SetID, OriginSetID blank — a standalone purchase)
//     linked to AY-00463, a set it was never in;
//   * twin owned Sets sharing a SetID (AY-00463/AY-00741,
//     AY-00611/AY-00711) linked to each other.
// Now: one chip, from OriginSetID only. A SetID naming a set the coin isn't
// in becomes a plain-text "Issued in <set> (purchased separately)" note —
// except for album (AL) and assembled-set (AS) SetIDs.

const { defineSuite } = require("./harness");

module.exports = defineSuite("belongs-to-origin-set", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  await page.evaluate(() => {
    const blank = { vendor: "", purchaseDate: "", receiptFile: "", remarks: "", shippingCost: null,
      cost: 0, value: 0, gradeSource: "", serNo: "", designation: "", storageLocation: "", container: "",
      category: "", rollId: "", setId: "", originSetId: "", coinId: "", status: "Owned", finish: "", grade: "" };
    const row = (o) => Object.assign({}, blank, o);
    window.__ROWS = [
      // Twin owned parent Sets sharing one SetID — deliberately DIFFERENT
      // names, so a link to the wrong twin is visible in the text.
      row({ id: "AY-00463", name: "Best of the Mint (first box)", denom: "Multiple", year: 2026, setId: "S-2026-BM-01" }),
      row({ id: "AY-00741", name: "Best of the Mint (second box)", denom: "Multiple", year: 2026, setId: "S-2026-BM-01" }),
      row({ id: "AY-00611", name: "2007 Proof Set (A)", denom: "Multiple", year: 2007, setId: "S-2007-PF-01" }),
      row({ id: "AY-00711", name: "2007 Proof Set (B)", denom: "Multiple", year: 2007, setId: "S-2007-PF-01" }),
      // A genuine component, in AY-00463.
      row({ id: "AY-00463-B", name: "Best of the Mint Medal", denom: "Medal", year: 2026, setId: "S-2026-BM-01", originSetId: "AY-00463" }),
      // A standalone purchase of the same product's medal.
      row({ id: "AY-00706", name: "Best of the Mint Medal", denom: "Medal", year: 2026, setId: "S-2026-BM-01" }),
      // An album coin: album SetID, no OriginSetID.
      row({ id: "AY-00003", name: "Lincoln Wheat Cent", denom: "1C", year: 1910, setId: "S-1909-AL-01" }),
      // An assembled-set SetID.
      row({ id: "AY-90401", name: "Morgan Dollar", denom: "$1", year: 1921, setId: "S-1921-AS-01" }),
      // Name fallbacks: an owned Set name only, then neither.
      row({ id: "AY-90410", name: "Silver Eagle", denom: "$1", year: 2007, setId: "S-2007-PF-01" }),
      row({ id: "AY-90420", name: "Kennedy Half", denom: "50C", year: 1999, setId: "S-1999-SD-09" }),
      // In a set whose SetID differs from the coin's own SetID.
      row({ id: "AY-90430", name: "Medal", denom: "Medal", year: 2026, setId: "S-2026-BM-01", originSetId: "AY-00611" })
    ];
    window.__go = () => {
      __setLiveDataModeForTest("live");
      __setLiveCoinsForTest(window.__ROWS.map(c => Object.assign({}, c)));
      __setLiveDbCoinsForTest([]);
      __setStoredPhotosForTest({});
      __setStoredReceiptsForTest({});
      LIVE_DB_SETS = [{ setId: "S-2026-BM-01", name: "2026 Best of the Mint Set", year: 2026, lineage: "" }];
    };
    window.__coin = (id) => activeCoins().find(c => c.id === id);
    window.__linkage = (id) => {
      const host = document.createElement("div");
      const count = renderLinkageChipsInto(host, window.__coin(id));
      const chips = [...host.querySelectorAll(".linkage-chip")];
      const setChips = chips.filter(b => /Set/.test((b.querySelector(".linkage-kind") || {}).textContent || ""));
      const remarkEl = host.querySelector(".linkage-remark");
      return {
        count,
        setChipNames: setChips.map(b => b.querySelector(".linkage-name").textContent),
        remark: remarkEl ? remarkEl.textContent : "",
        remarkIsLink: !!(remarkEl && (remarkEl.closest("a,button") || remarkEl.querySelector("a,button"))),
        host
      };
    };
  });

  // ---------- A. The standalone coin (AY-00706) -------------------------
  const A = await page.evaluate(() => {
    window.__go();
    const l = window.__linkage("AY-00706");
    showBrowseDetail(window.__coin("AY-00706"));
    const detail = document.getElementById("detailAccordions").textContent;
    return { setChipNames: l.setChipNames, remark: l.remark, remarkIsLink: l.remarkIsLink, detail };
  });
  ok(A.setChipNames.length === 0, "A1 standalone AY-00706 gets NO Set link", A.setChipNames);
  ok(A.remark === "Issued in 2026 Best of the Mint Set (purchased separately)",
    "A2 it shows the plain remark, named from DB_Sets", A.remark);
  ok(!A.remarkIsLink, "A3 the remark is plain text, not a link");
  ok(/Issued in 2026 Best of the Mint Set \(purchased separately\)/.test(A.detail) &&
     !/Best of the Mint \(first box\)|Best of the Mint \(second box\)/.test(A.detail),
    "A4 the coin page shows the remark and names neither owned twin Set");

  // ---------- B. A genuine component (AY-00463-B) ------------------------
  const B = await page.evaluate(() => {
    window.__go();
    const l = window.__linkage("AY-00463-B");
    const chip = [...l.host.querySelectorAll(".linkage-chip")].find(b => /Set/.test(b.textContent));
    let opened = "";
    if (chip) { chip.click(); opened = (currentBrowseCoin || {}).id || ""; }
    return { setChipNames: l.setChipNames, remark: l.remark, opened };
  });
  ok(B.setChipNames.length === 1, "B1 AY-00463-B shows exactly ONE Set chip (was two)", B.setChipNames);
  ok(B.setChipNames[0] === "Best of the Mint (first box)", "B2 and it is AY-00463, the Set its OriginSetID names", B.setChipNames);
  ok(B.remark === "", "B3 no 'purchased separately' remark for a member of a Set with that SetID");
  ok(B.opened === "AY-00463", "B4 tapping the chip opens AY-00463", B.opened);

  // ---------- C. Twin owned Sets sharing a SetID -------------------------
  const C = await page.evaluate(() => {
    window.__go();
    const out = {};
    ["AY-00463", "AY-00741", "AY-00611", "AY-00711"].forEach(id => {
      const l = window.__linkage(id);
      out[id] = { setChipNames: l.setChipNames, remark: l.remark, count: l.count };
    });
    // Edit Set's read-only "Belongs to" uses the same renderer.
    showBrowseEditSetView(window.__coin("AY-00463"));
    out.editSetHidden = document.getElementById("editSetLinkageWrap").classList.contains("hidden");
    out.editSetText = document.getElementById("editSetLinkageChips").textContent;
    return out;
  });
  ok(C["AY-00463"].setChipNames.length === 0 && C["AY-00741"].setChipNames.length === 0,
    "C1 twin Sets AY-00463 and AY-00741 no longer link to each other", [C["AY-00463"], C["AY-00741"]]);
  ok(C["AY-00611"].setChipNames.length === 0 && C["AY-00711"].setChipNames.length === 0,
    "C2 twin Sets AY-00611 and AY-00711 no longer link to each other", [C["AY-00611"], C["AY-00711"]]);
  ok(C["AY-00463"].remark === "" && C["AY-00741"].remark === "", "C3 a Set row never gets the 'purchased separately' remark");
  ok(C.editSetHidden && !/second box/.test(C.editSetText), "C4 Edit Set's Belongs-to is empty for AY-00463 too");

  // ---------- D. Album and assembled-set SetIDs --------------------------
  const D = await page.evaluate(() => {
    window.__go();
    return { album: window.__linkage("AY-00003"), as: window.__linkage("AY-90401"),
             kinds: [setIdKind("S-1909-AL-01"), setIdKind("S-1921-AS-01"), setIdKind("S-2026-BM-01"), setIdKind("junk")] };
  });
  ok(D.album.remark === "" && D.album.setChipNames.length === 0, "D1 an album coin (AL SetID) gets no remark and no Set link", D.album.remark);
  ok(D.as.remark === "" && D.as.setChipNames.length === 0, "D2 an assembled-set (AS) SetID gets no remark", D.as.remark);
  ok(JSON.stringify(D.kinds) === JSON.stringify(["AL", "AS", "BM", ""]), "D3 the SetID kind is read from the prefix", D.kinds);

  // ---------- E. Remark name fallbacks and the different-SetID member ----
  const E = await page.evaluate(() => {
    window.__go();
    return {
      ownedName: window.__linkage("AY-90410").remark,
      neither: window.__linkage("AY-90420").remark,
      member: window.__linkage("AY-90430")
    };
  });
  ok(E.ownedName === "Issued in 2007 Proof Set (A) (purchased separately)",
    "E1 with no DB_Sets row, the remark falls back to the owned Set's name", E.ownedName);
  ok(E.neither === "Issued in S-1999-SD-09 (purchased separately)",
    "E2 with neither name, the remark shows the SetID itself", E.neither);
  ok(E.member.setChipNames.length === 1 && E.member.setChipNames[0] === "2007 Proof Set (A)" &&
     E.member.remark === "Issued in 2026 Best of the Mint Set (purchased separately)",
    "E3 a coin in one Set but issued in another gets its one chip AND the remark", E.member);

  // ---------- F. Edit Coin uses the same rule -----------------------------
  const F = await page.evaluate(() => {
    window.__go();
    __setBrowseEditWriteEnabledForTest(false);
    showBrowseEditView(window.__coin("AY-00706"));
    const t1 = document.getElementById("browseEditLinkageChips").textContent;
    const chips1 = document.querySelectorAll("#browseEditLinkageChips .linkage-chip").length;
    showBrowseEditView(window.__coin("AY-00463-B"));
    const chips2 = [...document.querySelectorAll("#browseEditLinkageChips .linkage-chip")].map(b => b.textContent);
    __setBrowseEditWriteEnabledForTest(null);
    return { t1, chips1, chips2 };
  });
  ok(F.chips1 === 0 && /purchased separately/.test(F.t1), "F1 Edit Coin: AY-00706 shows the remark and no chip", F.t1);
  ok(F.chips2.length === 1 && /first box/.test(F.chips2[0]), "F2 Edit Coin: AY-00463-B shows exactly one Set chip", F.chips2);

  // ---------- G. Checklist ownership still uses SetID (unchanged) ---------
  const G = await page.evaluate(() => {
    window.__go();
    const hit = ownedSetForSetId("S-2026-BM-01");
    return { hit: hit && hit.id, gone: typeof resolveCoinSetLink === "undefined" };
  });
  ok(G.hit === "AY-00463", "G1 the Sets checklist still finds an owned Set by SetID (out-of-scope behaviour unchanged)", G.hit);
  ok(G.gone, "G2 the SetID membership matcher no longer exists, so nothing can call it");

  await page.evaluate(() => { LIVE_DB_SETS = null; __setLiveCoinsForTest(null); __setLiveDataModeForTest(null); });
}, module);
