// Live retest round 2 (2026-09-03). Fix A (force-added drafts leave Staging),
// Fix B (verify through the write's own endpoint family, with retries),
// the "Save to Database" rule reversal, Edit-from-Research, and the 1787
// Fugio Cent flip-card TL/TR collision. See CLAUDE.md "Live retest round 2".

const { defineSuite } = require("./harness");

const HEADERS = ["CollectionID","CoinID","Year","MintMark","Description","Denomination","Variety",
  "Grade","GradeSource","Designation","SerNo","CACBean","Category","Finish","Error","Value",
  "ValueSource","ValueDate","Cost","Shipping","Total","SpotValue","Seller_Link","PurchaseDate",
  "StorageLocation","Container","Remarks","Reviewed","LastModified"];

module.exports = defineSuite("retest-round2", async ({ ok, openApp, PHONE, TABLET }) => {
  const page = await openApp(PHONE);
  await page.evaluate((h) => {
    window.__H = h;
    window.__GRID = () => {
      const g = [h.slice()];
      const r = new Array(h.length).fill(""); r[0] = "AY-00700"; g.push(r);
      for (let i = 0; i < 5; i++) { const b = new Array(h.length).fill(null); b[20] = 0; b[21] = 0; g.push(b); }
      return g;
    };
    window.__DRAFT = (o) => Object.assign({
      type: "coin", version: 1, status: "Ready for reconciliation",
      denom: "Medal", year: "2030", mint: "", variety: "", description: "Test Medal",
      grade: "MS-65", coinId: "", photos: [], createdDate: new Date().toISOString(),
      allRowWritten: false, forceAdded: false
    }, o);
  }, HEADERS);

  // ============ A. Force-added draft leaves Staging (Fix A) ============
  const A = await page.evaluate(async () => {
    const mock = createMockGraphClient({ sheets: { All: __GRID() } });
    __setGraphClientForTest(mock); __setAddCoinWriteEnabledForTest(true); __resetAllHeaderMapForTest();
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00710/coin.json", __DRAFT({ collectionID: "AY-00710" }));
    await mock.uploadJson(base + "/AY-00711/coin.json",
      __DRAFT({ collectionID: "AY-00711", status: COIN_DRAFT_STATUS.DRAFT }));

    await forceAddCoinDraft("AY-00710");
    const d = await readCoinDraft("AY-00710");

    navigate("staging"); await renderStagingList(); await new Promise(r => setTimeout(r, 250));
    const listed = id => [...document.querySelectorAll("#stagingContainer .wish-item")]
      .some(x => new RegExp(id).test(x.textContent));

    await renderNeedsAttentionHub(); await new Promise(r => setTimeout(r, 250));
    const res = {
      allRowWritten: d.allRowWritten, status: d.status,
      forceAddedInStagingReview: listed("AY-00710"),
      ordinaryDraftStillListed: listed("AY-00711"),
      inDocketResearch: /AY-00710/.test(document.getElementById("docketResearchContainer").textContent),
      inDocketStaging: /AY-00710/.test(document.getElementById("docketStagingContainer").textContent),
      draftFileKept: !!(await readCoinDraft("AY-00710"))
    };
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return res;
  });
  ok(A.allRowWritten === true && A.status === "Ready for reconciliation", "A0 sanity: Force Add leaves the draft READY with allRowWritten set");
  ok(A.forceAddedInStagingReview === false, "A1 a force-added draft no longer appears in Staging Review (it used to, offering Revert/Reject on a coin already in the database)");
  ok(A.ordinaryDraftStillListed, "A2 an ordinary Draft is unaffected and still listed");
  ok(A.inDocketResearch && !A.inDocketStaging, "A3 it lives under Awaiting Copilot Research only — where Reject isn't offered");
  ok(A.draftFileKept, "A4 the draft FILE is still kept (audit trail + photo-move retry), same rule as PROMOTED");

  // Revert and Reject must both refuse once the row exists.
  const A2 = await page.evaluate(async () => {
    const mock = createMockGraphClient({ sheets: { All: __GRID() } });
    __setGraphClientForTest(mock); __setAddCoinWriteEnabledForTest(true); __resetAllHeaderMapForTest();
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00712/coin.json", __DRAFT({ collectionID: "AY-00712" }));
    await forceAddCoinDraft("AY-00712");

    let revertErr = null;
    try { await revertCoinDraftToDraft("AY-00712"); } catch (e) { revertErr = e.message; }
    const afterRevert = await readCoinDraft("AY-00712");

    await performRejectStagedCoin("AY-00712");
    const afterReject = await readCoinDraft("AY-00712");
    const g = mock._grids.All;
    let rn = null; for (let i = 1; i < g.length; i++) if (g[i][0] === "AY-00712") rn = i + 1;

    const res = {
      revertErr, statusAfterRevert: afterRevert && afterRevert.status,
      draftSurvivedReject: !!afterReject,
      allRowStillThere: rn, allRowData: rn ? g[rn - 1][4] : null
    };
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return res;
  });
  ok(/already on the All sheet/.test(A2.revertErr || ""), "A5 Revert to Draft is refused once the row exists: " + A2.revertErr);
  ok(A2.statusAfterRevert === "Ready for reconciliation", "A6 ... and the status is genuinely unchanged, not half-applied");
  ok(A2.draftSurvivedReject, "A7 Reject is refused too — the draft is NOT deleted");
  ok(A2.allRowStillThere && A2.allRowData === "Test Medal", "A8 ... which matters because the All row survives a Reject and would otherwise lose its only tracking record");

  // ============ B. Verify tolerates read-after-write lag (Fix B) ============
  const B = await page.evaluate(async () => {
    const mock = createMockGraphClient({ sheets: { All: __GRID() } });
    // Reproduce the live failure: the table-column read right after the key
    // write does not yet see it. The worksheet-range read (a different
    // endpoint family) does.
    let armed = false;
    const realPatch = mock.patchWorkbookRanges.bind(mock);
    mock.patchWorkbookRanges = (...a) => { armed = true; return realPatch(...a); };
    const realCol = mock.readTableColumn.bind(mock);
    let staleReads = 0;
    mock.readTableColumn = async (...a) => {
      const fresh = await realCol(...a);
      if (armed) { armed = false; staleReads++; return fresh.map(v => String(v || "").trim() === "AY-00713" ? "" : v); }
      return fresh;
    };
    __setGraphClientForTest(mock); __setAddCoinWriteEnabledForTest(true); __resetAllHeaderMapForTest();
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00713/coin.json", __DRAFT({ collectionID: "AY-00713" }));

    const r = await promoteCoinDraftToAllSheet("AY-00713", { force: true });
    const g = mock._grids.All;
    let rn = null, count = 0;
    for (let i = 1; i < g.length; i++) if (g[i][0] === "AY-00713") { rn = i + 1; count++; }
    const res = {
      ok: r.ok, message: r.message || null, staleReads,
      row: rn, duplicates: count, description: rn ? g[rn - 1][4] : null, grade: rn ? g[rn - 1][7] : null
    };
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return res;
  });
  ok(B.staleReads > 0, "B0 sanity: the stale read-back genuinely fired");
  ok(B.ok === true, "B1 a stale table-column read no longer fails the write — it used to throw \"reports it at row (none)\": " + (B.message || ""));
  ok(B.duplicates === 1 && B.description === "Test Medal" && B.grade === "MS-65",
    "B2 ... and the row is written once, in full, on the first attempt (no keys-only row left for a retry to finish)");

  // A row that genuinely landed somewhere else must STILL fail — the
  // uniqueness check is the valuable half and retries must not weaken it.
  const B2 = await page.evaluate(async () => {
    const grid = __GRID();
    grid[3][0] = "AY-00714"; // already present at a different row
    const mock = createMockGraphClient({ sheets: { All: grid } });
    __setGraphClientForTest(mock); __resetAllHeaderMapForTest();
    let err = null;
    try { await createAllSheetRow("AY-00714", ""); } catch (e) { err = e.message; }
    __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return { err };
  });
  ok(/already appears on the All sheet/.test(B2.err || ""), "B3 a duplicate is still caught and still fails loudly: " + B2.err);

  // The genuinely-lost-write case keeps failing, with actionable wording.
  const B3 = await page.evaluate(async () => {
    const mock = createMockGraphClient({ sheets: { All: __GRID() } });
    const realPatch = mock.patchWorkbookRanges.bind(mock);
    mock.patchWorkbookRanges = () => Promise.resolve({ written: 0 }); // write silently does nothing
    __setGraphClientForTest(mock); __resetAllHeaderMapForTest();
    let err = null;
    try { await createAllSheetRow("AY-00715", ""); } catch (e) { err = e.message; }
    mock.patchWorkbookRanges = realPatch;
    __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return { err };
  });
  ok(/reads back empty/.test(B3.err || ""), "B4 a write that truly didn't land still fails: " + B3.err);
  ok(/again/.test(B3.err || "") && !/duplicate row/.test(B3.err || ""),
    "B5 ... with wording that says to retry, not the old misleading \"check for a duplicate row\"");

  // ============ C. Save to Database requires a resolved match ============
  const C = await page.evaluate(() => {
    __setLiveDbCoinsForTest([
      // mint "" to match the form, which is left on the blank/Philadelphia
      // option — a seeded "S" here matches nothing and tests the wrong thing.
      { denom: "1C", year: 1909, mint: "", variety: "", description: "Lincoln Wheat",
        finish: "", designation: "", coinId: "C-ONE", pcgs: "", mintage: null, gsid: "" }
    ]);
    const read = () => ({
      btn: getComputedStyle(document.getElementById("saveToDatabaseBtn")).display,
      msg: document.getElementById("saveNotConfidentMsg").textContent
    });
    const fill = (y, d) => {
      navigate("addcoin");
      document.getElementById("denomination").value = d;
      document.getElementById("denomination").dispatchEvent(new Event("change"));
      document.getElementById("year").value = y;
      document.getElementById("year").dispatchEvent(new Event("input"));
      checkDbCoinsMatch();
      return read();
    };
    const matched = fill("1909", "1C");
    const unmatched = fill("2030", "1C"); // no catalog row at all
    __setLiveDbCoinsForTest(null);
    return { matched, unmatched };
  });
  ok(C.matched.btn !== "none", "C1 \"Save to Database\" is still offered when exactly one catalog row matches");
  ok(C.unmatched.btn === "none", "C2 ... and is NOT offered when nothing matches (reverses the old rule — Phase 2 can't promote an unmatched coin anyway)");
  ok(/No single DB_Coins entry resolved/.test(C.unmatched.msg),
    "C3 ... with a reason that names the real problem rather than blaming the Variety field: " + C.unmatched.msg);

  // ============ D. Edit from Awaiting Copilot Research ============
  const D = await page.evaluate(async () => {
    // A coin that EXISTS in All -> Browse Edit.
    __setLiveCoinsForTest([{ id: "AY-00720", name: "Morgan Dollar", description: "Morgan",
      denom: "$1", year: 1889, mint: "CC", variety: "", grade: "MS-64", designation: "",
      value: 900, cost: 800, coinId: "" }]);
    openEditForDocketRow("AY-00720", null);
    const wentToBrowseEdit = document.querySelector(".view.active").id === "view-browse" &&
      document.getElementById("browseEditView").style.display === "block";

    // A draft with NO All row -> the draft editor.
    const mock = createMockGraphClient({ sheets: { All: __GRID() } });
    __setGraphClientForTest(mock); __setAddCoinWriteEnabledForTest(true); __resetAllHeaderMapForTest();
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00721/coin.json",
      __DRAFT({ collectionID: "AY-00721", status: COIN_DRAFT_STATUS.DRAFT }));
    openEditForDocketRow("AY-00721", { collectionID: "AY-00721" });
    await new Promise(r => setTimeout(r, 300));
    const wentToDraftEditor = document.querySelector(".view.active").id === "view-addcoin";

    const res = { wentToBrowseEdit, wentToDraftEditor };
    __setLiveCoinsForTest(null); __setAddCoinWriteEnabledForTest(null);
    __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return res;
  });
  ok(D.wentToBrowseEdit, "D1 a Research row whose coin IS on the All sheet opens Browse Edit (Ray's identity-edit case)");
  ok(D.wentToDraftEditor, "D2 a Research row with no All row opens the draft editor instead — routed by the row's existence, not its kind");

  const D2 = await page.evaluate(async () => {
    const mock = createMockGraphClient({ sheets: { All: __GRID() } });
    __setGraphClientForTest(mock); __setAddCoinWriteEnabledForTest(true); __resetAllHeaderMapForTest();
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-00722/coin.json", __DRAFT({ collectionID: "AY-00722" }));
    navigate("needsdbcoins");
    await renderNeedsAttentionHub(); await new Promise(r => setTimeout(r, 250));
    const row = [...document.querySelectorAll("#docketResearchContainer .wish-item")]
      .find(x => /AY-00722/.test(x.textContent));
    const res = { hasEdit: !!(row && row.querySelector(".docket-edit")) };
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null); __resetAllHeaderMapForTest();
    return res;
  });
  ok(D2.hasEdit, "D3 Research rows render an Edit button");

  // applyDocketResolution must see live coins, not just FAKE_COINS.
  const D3 = await page.evaluate(() => {
    const src = applyDocketResolution.toString();
    return { usesActive: /activeCoins\(\)\.find/.test(src), usesFakeOnly: /FAKE_COINS\.find\(c => c\.id === entry\.collectionId\)/.test(src) };
  });
  ok(D3.usesActive && !D3.usesFakeOnly, "D4 applyDocketResolution() looks the coin up through activeCoins(), so a live-fetched coin is no longer silently missed");

  // ============ E. Flip-card corner collision (1787 Fugio Cent) ============
  for (const [label, vp] of [["phone", PHONE], ["tablet", TABLET]]) {
    const p2 = await openApp(vp);
    const E = await p2.evaluate(() => {
      const mk = (o) => Object.assign({ id: "AY-00001", name: "Fugio Cent", description: "Fugio",
        denom: "1C", year: 1787, mint: "S", variety: "", grade: "", designation: "",
        value: 1, cost: 1, coinId: "C-F" }, o);
      const measure = (coin) => {
        __setLiveCoinsForTest([coin]);
        navigate("browse"); showBrowseDetail(activeCoins()[0]);
        const frame = document.getElementById("browseDetailFlipFrame").getBoundingClientRect();
        const info = (id) => {
          const e = document.getElementById(id);
          const ls = [...e.querySelectorAll(".corner-line")];
          const rects = ls.length ? ls.map(l => l.getBoundingClientRect()) : [e.getBoundingClientRect()];
          return { el: e, text: e.textContent, lines: ls.map(l => l.textContent),
                   font: parseFloat(getComputedStyle(e).fontSize),
                   overflows: e.scrollWidth > e.clientWidth,
                   inkRight: Math.max(...rects.map(r => r.left)) + e.scrollWidth, rects };
        };
        const tl = info("browseDetailTL"), tr = info("browseDetailTR");
        const bl = info("browseDetailBL"), br = info("browseDetailBR");
        // Overlap must be measured on INK, not on the boxes. A .corner-line
        // is nowrap with max-width:100%, so its BOX is clamped to the parent
        // while the text spills visibly past it (.flip-label deliberately has
        // no overflow:hidden). A box-rect test therefore reports 0 overlap
        // for exactly the case being tested — confirmed: it passed against
        // the unfitted code that produced the reported collision.
        const inkRects = (info) => [...info.el.querySelectorAll(".corner-line")].map(l => {
          const r = l.getBoundingClientRect();
          const isRightAligned = /\b(tr|br)\b/.test(info.el.className);
          const w = l.scrollWidth;
          return { left: isRightAligned ? r.right - w : r.left,
                   right: isRightAligned ? r.right : r.left + w,
                   top: r.top, bottom: r.bottom };
        });
        const overlap = (a, b) => {
          let m = 0;
          const ra = inkRects(a).length ? inkRects(a) : a.rects;
          const rb = inkRects(b).length ? inkRects(b) : b.rects;
          ra.forEach(x => rb.forEach(y => {
            const h = Math.min(x.right, y.right) - Math.max(x.left, y.left);
            const v = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
            if (h > 0 && v > 0) m = Math.max(m, h);
          }));
          return m;
        };
        return {
          tlLines: tl.lines, tlFont: tl.font, tlOverflows: tl.overflows,
          blText: bl.text, blFont: bl.font, blOverflows: bl.overflows,
          tlVsTr: overlap(tl, tr), blVsBr: overlap(bl, br),
          tlInkPastFrame: tl.inkRight - frame.right,
          blInkPastFrame: bl.inkRight - frame.right,
          tlClearsDisc: cornerClearsDisc(tl.el), blClearsDisc: cornerClearsDisc(bl.el)
        };
      };
      const out = {
        fugio: measure(mk({ variety: "Newman 15-H, Pointed Rays, 4 Cinq., R-4" })),
        worst: measure(mk({ name: "Washington Crossing the Delaware Quarter",
          description: "Washington Crossing the Delaware", denom: "25C",
          variety: "Newman 15-H, Pointed Rays, 4 Cinq., R-4" })),
        ordinary: measure(mk({ name: "Morgan Dollar", description: "Morgan", denom: "$1",
          year: 1889, mint: "CC", grade: "MS-64" })),
        longGrade: measure(mk({ name: "Morgan Dollar", description: "Morgan", denom: "$1",
          year: 1893, mint: "S", grade: "XF Details - Improperly Cleaned" }))
      };
      __setLiveCoinsForTest(null);
      return out;
    });

    ok(E.fugio.tlOverflows === false,
      "E1(" + label + ") the Fugio's long Variety no longer overflows its TL box — it used to run 390px of ink through a 139px box");
    ok(E.fugio.tlLines.length === 3 && E.fugio.tlLines.join(" ").indexOf("Newman 15-H, Pointed Rays, 4 Cinq., R-4") !== -1,
      "E2(" + label + ") ... wrapped across real lines with the full Variety preserved: " + JSON.stringify(E.fugio.tlLines));
    ok(E.fugio.tlVsTr === 0,
      "E3(" + label + ") ... and no longer collides with the TR corner (the reported symptom)");
    ok(E.fugio.tlInkPastFrame <= 0.5 && E.fugio.tlClearsDisc,
      "E4(" + label + ") ... staying inside the frame and clear of the coin");
    ok(E.worst.tlVsTr === 0,
      "E5(" + label + ") a deliberate worst case — long Variety AND long type name — also shows zero TL/TR overlap");
    ok(E.ordinary.tlFont === 27 && E.ordinary.blFont === 27,
      "E6(" + label + ") an ordinary coin's corners are untouched at the natural 27px — fitting only engages when needed");
    // Row 6, closed in the same round.
    ok(E.longGrade.blOverflows === false,
      "E7(" + label + ") a long Details grade no longer overflows BL (ParkingLot Row 6) — measured at 295px of ink in a 139px box");
    ok(E.longGrade.blVsBr === 0 && E.longGrade.blInkPastFrame <= 0.5 && E.longGrade.blClearsDisc,
      "E8(" + label + ") ... no longer running 88.7px into the composition corner or 26px past the frame");
  }

  // ============ F. Nav smoke ============
  const F = await page.evaluate(() => {
    const routes = ["dashboard", "browse", "sets", "albums", "wishlist", "addcoin", "stats", "needsdbcoins", "staging"];
    const bad = [];
    routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    navigate("dashboard");
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(F.bad.length === 0, "F1 every route navigates cleanly: " + F.bad.join("; "));
  ok(F.overflow === false, "F2 no horizontal page overflow");
}, module);
