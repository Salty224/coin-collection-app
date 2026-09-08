// Set attach/detach — the real OriginSetID write layer.
//
// The app's first CROSS-ROW-TARGET write: initiated from a Set's Edit form
// but landing on a DIFFERENT row entirely (the coin's). Until this, Edit
// Set's "Link a coin to this Set" picker was session-only and there was no
// detach UI at all — confirmed directly, not assumed: FAKE_SET_CHILDREN was
// only ever pushed to, originSetId was only ever assigned, and
// buildSetChildRow() rendered no remove control anywhere.
//
// Design points this suite pins, all of them deliberate divergences or
// narrow exceptions that a future change could quietly undo:
//   - OriginSetID stays on ALL_NEVER_WRITE_COLUMNS; the write goes through
//     its own narrow audited path (writeCoinIdCell()'s precedent).
//   - conflict detection is a FIELD-SCOPED fresh read immediately before
//     the write, not a whole-row form-open snapshot.
//   - LastModified is stamped; Reviewed is deliberately NOT blanked.
//   - the detach control is opt-in per call site, so read-only surfaces
//     structurally cannot render it.
//   - ensureOriginSetId()'s OS-LOCAL fake-linking is hard-guarded off once
//     the real layer is on.

const { defineSuite } = require("./harness");

const ALL_HEADERS = [
  "CollectionID", "CoinID", "Denomination", "MintMark", "Year", "Description",
  "Grade", "Value", "Cost", "OriginSetID", "SetID", "Reviewed", "LastModified", "Remarks"
];

// A real-shaped Set + two of its children + one unattached coin + one coin
// already claimed by a DIFFERENT Set.
function seedGrid() {
  return {
    sheets: {
      All: [
        ALL_HEADERS.slice(),
        ["AY-90555",   "",      "Multiple", "", 1967, "1967 Special Mint Set", "",      40, 30, "",          "", "Yes", "", ""],
        ["AY-90555-A", "C-1C",  "1C",       "", 1967, "Lincoln Memorial Cent", "MS-65",  3,  2, "AY-90555",  "", "Yes", "", ""],
        ["AY-90555-B", "C-5C",  "5C",       "", 1967, "Jefferson Nickel",      "MS-65",  4,  3, "AY-90555",  "", "",    "", ""],
        ["AY-90600",   "C-$1",  "$1",       "CC", 1889, "Morgan Dollar",       "MS-64", 900, 800, "",        "", "",    "", ""],
        ["AY-90700-A", "C-5C2", "5C",       "D", 1937, "Buffalo Nickel",       "MS-62",  55,  60, "AY-90700", "", "",   "", ""]
      ]
    }
  };
}

// The same rows as live coin objects, so activeCoins() and the sheet agree.
function seedCoins() {
  return [
    { id: "AY-90555",   name: "1967 Special Mint Set", denom: "Multiple", year: 1967, mint: "", grade: "", value: 40, cost: 30, originSetId: "", coinId: "" },
    { id: "AY-90555-A", name: "Lincoln Memorial Cent", denom: "1C", year: 1967, mint: "", grade: "MS-65", value: 3, cost: 2, originSetId: "AY-90555", coinId: "C-1C" },
    { id: "AY-90555-B", name: "Jefferson Nickel",      denom: "5C", year: 1967, mint: "", grade: "MS-65", value: 4, cost: 3, originSetId: "AY-90555", coinId: "C-5C" },
    { id: "AY-90600",   name: "Morgan Dollar",         denom: "$1", year: 1889, mint: "CC", grade: "MS-64", value: 900, cost: 800, originSetId: "", coinId: "C-$1" },
    { id: "AY-90700-A", name: "Buffalo Nickel",        denom: "5C", year: 1937, mint: "D", grade: "MS-62", value: 55, cost: 60, originSetId: "AY-90700", coinId: "C-5C2" }
  ];
}

module.exports = defineSuite("set-link-write", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);
  await page.evaluate((a) => { window.__H = a.headers; window.__SEED = a.seed; window.__COINS = a.coins; },
    { headers: ALL_HEADERS, seed: seedGrid(), coins: seedCoins() });

  // Fresh mock + live coins for each block; every block tears its own down.
  await page.evaluate(() => {
    window.__setup = () => {
      const mock = createMockGraphClient(JSON.parse(JSON.stringify(window.__SEED)));
      __setGraphClientForTest(mock);
      __setSetLinkWriteEnabledForTest(true);
      __resetAllHeaderMapForTest();
      __setLiveCoinsForTest(JSON.parse(JSON.stringify(window.__COINS)));
      return mock;
    };
    window.__teardown = () => {
      __setSetLinkWriteEnabledForTest(null);
      __setGraphClientForTest(null);
      __resetAllHeaderMapForTest();
      __setLiveCoinsForTest(null);
    };
    window.__cell = (mock, id, header) => {
      const g = mock._grids.All;
      const c = g[0].indexOf(header);
      const r = g.findIndex(row => row[0] === id);
      return r === -1 ? undefined : g[r][c];
    };
  });

  // ---------- A. The never-write list is genuinely untouched ----------
  const A = await page.evaluate(() => ({
    stillNeverWrite: ALL_NEVER_WRITE_COLUMNS.indexOf("OriginSetID") !== -1,
    notAllowListed: ALL_WRITABLE_COLUMNS.indexOf("OriginSetID") === -1,
    ownFlag: typeof ENABLE_SET_LINK_WRITE === "boolean",
    foldedIntoWriteLayer: WRITE_LAYER_ENABLED === true
  }));
  ok(A.stillNeverWrite, "A1 OriginSetID is STILL on ALL_NEVER_WRITE_COLUMNS — the exception is a narrow audited path, not a loosening of the list");
  ok(A.notAllowListed, "A2 ... and is NOT on ALL_WRITABLE_COLUMNS, so the general PATCH machinery still has no code path to it");
  ok(A.ownFlag, "A3 ENABLE_SET_LINK_WRITE exists as its own flag");
  ok(A.foldedIntoWriteLayer, "A4 ... and is folded into WRITE_LAYER_ENABLED (write-capable scope)");

  // ---------- B. Attach writes the real cell ----------
  const B = await page.evaluate(async () => {
    const mock = window.__setup();
    const parent = activeCoins().find(c => c.id === "AY-90555");
    const res = await linkCoinToSetWrite(parent, "AY-90600");
    const out = {
      ok: res.ok,
      cell: window.__cell(mock, "AY-90600", "OriginSetID"),
      inMemory: activeCoins().find(c => c.id === "AY-90600").originSetId,
      lastModified: window.__cell(mock, "AY-90600", "LastModified"),
      reviewed: window.__cell(mock, "AY-90600", "Reviewed"),
      // Nothing else on the row may move.
      grade: window.__cell(mock, "AY-90600", "Grade"),
      value: window.__cell(mock, "AY-90600", "Value"),
      // And no OTHER row may be touched — the cross-row worry.
      parentOriginSetId: window.__cell(mock, "AY-90555", "OriginSetID"),
      siblingUntouched: window.__cell(mock, "AY-90555-A", "OriginSetID")
    };
    window.__teardown();
    return out;
  });
  ok(B.ok === true, "B1 attach reports ok");
  ok(B.cell === "AY-90555", "B2 the CHILD's own OriginSetID cell now holds the PARENT's CollectionID: " + B.cell);
  ok(B.inMemory === "AY-90555", "B3 the in-memory record is updated to match (after the write, not before)");
  ok(typeof B.lastModified === "number" && B.lastModified > 0, "B4 LastModified is stamped — the app really did touch this row: " + B.lastModified);
  ok(B.reviewed === "", "B5 Reviewed is deliberately NOT blanked (this layer's one divergence from the blanket save rule) — re-parenting doesn't invalidate a review of the coin's own attributes");
  ok(B.grade === "MS-64" && B.value === 900, "B6 no other column on the row moved");
  ok(B.parentOriginSetId === "" && B.siblingUntouched === "AY-90555",
    "B7 no OTHER row was written — the parent's own OriginSetID stays blank (real convention) and a sibling is untouched");

  // ---------- C. Detach clears the cell ----------
  const C = await page.evaluate(async () => {
    const mock = window.__setup();
    const parent = activeCoins().find(c => c.id === "AY-90555");
    const child = activeCoins().find(c => c.id === "AY-90555-A");
    const res = await unlinkCoinFromSetWrite(parent, child);
    const out = {
      ok: res.ok,
      cell: window.__cell(mock, "AY-90555-A", "OriginSetID"),
      inMemory: activeCoins().find(c => c.id === "AY-90555-A").originSetId,
      // The CollectionID is a never-write key regardless of Set membership,
      // even though it still encodes the parent (AY-90555-A).
      collectionId: window.__cell(mock, "AY-90555-A", "CollectionID"),
      reviewed: window.__cell(mock, "AY-90555-A", "Reviewed"),
      siblingUntouched: window.__cell(mock, "AY-90555-B", "OriginSetID")
    };
    window.__teardown();
    return out;
  });
  ok(C.ok === true, "C1 detach reports ok");
  ok(C.cell === "", "C2 the child's OriginSetID is cleared: " + JSON.stringify(C.cell));
  ok(C.inMemory === "", "C3 the in-memory record matches");
  ok(C.collectionId === "AY-90555-A", "C4 the CollectionID is NEVER rewritten, even though it encodes the parent");
  ok(C.reviewed === "Yes", "C5 Reviewed survives a detach too — same rule as attach");
  ok(C.siblingUntouched === "AY-90555", "C6 the other child is untouched");

  // ---------- D. Field-scoped conflict detection ----------
  const D = await page.evaluate(async () => {
    const mock = window.__setup();
    const parent = activeCoins().find(c => c.id === "AY-90555");

    // Attach against a coin something else claimed since the picker was
    // built: the SHEET says AY-90700, the stale in-memory record says blank.
    const stale = activeCoins().find(c => c.id === "AY-90600");
    const g = mock._grids.All;
    g[g.findIndex(r => r[0] === "AY-90600")][window.__H.indexOf("OriginSetID")] = "AY-90700";
    const attachRes = await applySetLinkageWrite("AY-90600", "", parent.id);
    const attachCell = window.__cell(mock, "AY-90600", "OriginSetID");

    // Detach when the sheet no longer names the parent we think it does.
    g[g.findIndex(r => r[0] === "AY-90555-B")][window.__H.indexOf("OriginSetID")] = "AY-90999";
    const detachRes = await applySetLinkageWrite("AY-90555-B", parent.id, "");
    const detachCell = window.__cell(mock, "AY-90555-B", "OriginSetID");

    const missing = await applySetLinkageWrite("AY-NOPE", "", parent.id);
    const out = {
      attachReason: attachRes.reason, attachCurrent: attachRes.current, attachCell,
      detachReason: detachRes.reason, detachCurrent: detachRes.current, detachCell,
      missingReason: missing.reason,
      staleStillBlankInMemory: stale.originSetId
    };
    window.__teardown();
    return out;
  });
  ok(D.attachReason === "conflict" && D.attachCurrent === "AY-90700",
    "D1 attach refuses when the cell isn't blank at write time, and reports what it actually says: " + JSON.stringify([D.attachReason, D.attachCurrent]));
  ok(D.attachCell === "AY-90700", "D2 ... and writes NOTHING — the other Set's claim survives");
  ok(D.detachReason === "conflict" && D.detachCurrent === "AY-90999",
    "D3 detach refuses when the cell no longer names the parent being detached from: " + JSON.stringify([D.detachReason, D.detachCurrent]));
  ok(D.detachCell === "AY-90999", "D4 ... and writes nothing");
  ok(D.missingReason === "not-found", "D5 a coin that isn't on the sheet reports not-found rather than throwing");
  ok(D.staleStillBlankInMemory === "", "D6 a refused attach leaves the in-memory record alone too (non-optimistic in both directions)");

  // ---------- E. Blank-vs-blank: the two helpers are NOT interchangeable ----------
  const E = await page.evaluate(() => ({
    cellBlankMatchesBlank: originSetCellEquals("", ""),
    cellTrims: originSetCellEquals("  AY-90555 ", "AY-90555"),
    cellDiffers: originSetCellEquals("AY-1", "AY-2"),
    keysBlankNeverMatch: originSetIdKeysMatch("", "")
  }));
  ok(E.cellBlankMatchesBlank === true, "E1 originSetCellEquals treats blank-vs-blank as a MATCH — an unattached coin's cell really is \"\"");
  ok(E.keysBlankNeverMatch === false, "E2 ... while originSetIdKeysMatch still refuses blank-vs-blank, since that would link every parentless coin to every childless Set — two similar helpers, two different jobs");
  ok(E.cellTrims === true, "E3 the cell comparison trims");
  ok(E.cellDiffers === false, "E4 ... and still distinguishes real values");

  // ---------- F. The per-child lock coalesces a double-tap ----------
  const F = await page.evaluate(async () => {
    const mock = window.__setup();
    let patches = 0;
    const realPatch = mock.patchWorkbookRanges.bind(mock);
    mock.patchWorkbookRanges = (...args) => { patches++; return realPatch(...args); };
    const parent = activeCoins().find(c => c.id === "AY-90555");
    const [r1, r2] = await Promise.all([
      linkCoinToSetWrite(parent, "AY-90600"),
      linkCoinToSetWrite(parent, "AY-90600")
    ]);
    const out = {
      bothOk: r1.ok === true && r2.ok === true,
      coalesced: r2.coalesced === true || r1.coalesced === true,
      patches,
      cell: window.__cell(mock, "AY-90600", "OriginSetID")
    };
    window.__teardown();
    return out;
  });
  ok(F.bothOk, "F1 a double-tap resolves as success for both callers, not an error for the loser");
  ok(F.coalesced, "F2 ... because the second coalesced onto the first rather than starting its own write");
  ok(F.patches === 1, "F3 exactly ONE workbook write happened, not two: " + F.patches);
  ok(F.cell === "AY-90555", "F4 and the coin ended up correctly linked");

  // ---------- G. ensureOriginSetId is hard-guarded once the real layer is on ----------
  const G = await page.evaluate(() => {
    __setSetLinkWriteEnabledForTest(true);
    const parent = { id: "AY-90555", denom: "Multiple", originSetId: "" };
    let threw = false;
    try { ensureOriginSetId(parent); } catch (e) { threw = true; }
    const stampedWhileOn = parent.originSetId;
    __setSetLinkWriteEnabledForTest(false);
    const demo = { id: "AY-00019", denom: "Multiple", originSetId: "" };
    const demoVal = ensureOriginSetId(demo);
    __setSetLinkWriteEnabledForTest(null);
    return { threw, stampedWhileOn, demoVal };
  });
  ok(G.threw === true, "G1 ensureOriginSetId() THROWS when the real write layer is on — a real parent's OriginSetID must stay blank");
  ok(G.stampedWhileOn === "", "G2 ... and stamps nothing onto the real parent on the way out");
  ok(G.demoVal === "OS-LOCAL-AY-00019", "G3 the demo-mode path is completely unchanged: " + G.demoVal);

  // ---------- H. The detach control is opt-in, so read-only surfaces can't render it ----------
  const H = await page.evaluate(() => {
    const mock = window.__setup();
    const parent = activeCoins().find(c => c.id === "AY-90555");
    // Browse detail's own "Coins in this Set" passes no onDetach.
    navigate("browse");
    showBrowseDetail(parent);
    const headers = [...document.querySelectorAll("#detailAccordions .accordion-header")];
    const acc = headers.find(h => h.querySelector("span").textContent === "Coins in this Set");
    const detailBtns = acc
      ? acc.closest(".detail-accordion").querySelectorAll(".set-child-detach").length
      : -1;
    // A row built with no onDetach has no button at all, by construction.
    const bare = buildSetChildRow(activeCoins().find(c => c.id === "AY-90555-A"), parent);
    const withDetach = buildSetChildRow(activeCoins().find(c => c.id === "AY-90555-A"), parent, null, () => {});
    const out = {
      detailBtns,
      bareHas: !!bare.querySelector(".set-child-detach"),
      optInHas: !!withDetach.querySelector(".set-child-detach")
    };
    window.__teardown();
    return out;
  });
  ok(H.detailBtns === 0, "H1 Browse detail's read-only child list renders ZERO detach controls (it passes no onDetach): " + H.detailBtns);
  ok(H.bareHas === false, "H2 buildSetChildRow() without onDetach cannot render one — structural, not styling");
  ok(H.optInHas === true, "H3 ... and does render one when a caller opts in");

  // ---------- I. Detach control stops propagation (the row is a nav target) ----------
  const I = await page.evaluate(() => {
    const mock = window.__setup();
    const parent = activeCoins().find(c => c.id === "AY-90555");
    let navigated = 0, detached = 0;
    const row = buildSetChildRow(activeCoins().find(c => c.id === "AY-90555-A"), parent,
      () => { navigated++; }, () => { detached++; });
    document.body.appendChild(row);
    row.querySelector(".set-child-detach").click();
    const afterDetachClick = { navigated, detached };
    row.remove();
    window.__teardown();
    return afterDetachClick;
  });
  ok(I.detached === 1, "I1 clicking the detach control fires the detach handler");
  ok(I.navigated === 0, "I2 ... and does NOT also navigate into the child — stopPropagation is doing real work, since the row itself is a click target");

  // ---------- J. Real end-to-end through Edit Set's own UI ----------
  const J = await page.evaluate(async () => {
    const mock = window.__setup();
    const parent = activeCoins().find(c => c.id === "AY-90555");
    navigate("browse");
    showBrowseDetail(parent);
    showBrowseEditSetView(parent);
    const rowsBefore = document.querySelectorAll("#editSetChildrenRows .album-card").length;
    const detachBtns = document.querySelectorAll("#editSetChildrenRows .set-child-detach").length;
    const noteText = document.getElementById("editSetLinkCoinNote").textContent.trim();

    // Attach through the real button.
    document.getElementById("editSetLinkCoinSelect").value = "AY-90600";
    document.getElementById("editSetLinkCoinBtn").click();
    await new Promise(r => setTimeout(r, 400));
    const out = {
      rowsBefore, detachBtns, noteText,
      rowsAfter: document.querySelectorAll("#editSetChildrenRows .album-card").length,
      cell: window.__cell(mock, "AY-90600", "OriginSetID"),
      // the just-linked coin must drop out of the picker
      stillOffered: [...document.querySelectorAll("#editSetLinkCoinSelect option")].some(o => o.value === "AY-90600")
    };
    window.__teardown();
    return out;
  });
  ok(J.rowsBefore === 2, "J0 sanity: Edit Set lists the Set's 2 real children: " + J.rowsBefore);
  ok(J.detachBtns === 2, "J1 each child row carries a detach control when the write layer is on: " + J.detachBtns);
  ok(/writes OriginSetID/.test(J.noteText), "J2 the picker's note tells the truth about what Link will do: " + J.noteText);
  ok(J.rowsAfter === 3, "J3 real end-to-end: clicking Link through the actual UI adds the coin to the list: " + J.rowsAfter);
  ok(J.cell === "AY-90555", "J4 ... and the workbook cell was really written: " + J.cell);
  ok(J.stillOffered === false, "J5 ... and the linked coin drops out of the picker");

  // ---------- K. Detach through the real UI, including its confirmation ----------
  const K = await page.evaluate(async () => {
    const mock = window.__setup();
    const parent = activeCoins().find(c => c.id === "AY-90555");
    navigate("browse");
    showBrowseDetail(parent);
    showBrowseEditSetView(parent);
    document.querySelector("#editSetChildrenRows .set-child-detach").click();
    const overlayShown = !document.getElementById("writeGuardOverlay").classList.contains("hidden");
    const dialogText = document.getElementById("writeGuardBody").textContent;
    const cellWhileDialogOpen = window.__cell(mock, "AY-90555-A", "OriginSetID");

    // Cancel writes nothing.
    [...document.querySelectorAll("#writeGuardBtns button")].find(b => b.textContent === "Cancel").click();
    const cellAfterCancel = window.__cell(mock, "AY-90555-A", "OriginSetID");
    const rowsAfterCancel = document.querySelectorAll("#editSetChildrenRows .album-card").length;

    // Confirm really removes.
    document.querySelector("#editSetChildrenRows .set-child-detach").click();
    [...document.querySelectorAll("#writeGuardBtns button")].find(b => b.textContent === "Remove").click();
    await new Promise(r => setTimeout(r, 400));
    const out = {
      overlayShown, dialogText,
      cellWhileDialogOpen, cellAfterCancel, rowsAfterCancel,
      cellAfterConfirm: window.__cell(mock, "AY-90555-A", "OriginSetID"),
      rowsAfterConfirm: document.querySelectorAll("#editSetChildrenRows .album-card").length,
      backOffered: [...document.querySelectorAll("#editSetLinkCoinSelect option")].some(o => o.value === "AY-90555-A")
    };
    window.__teardown();
    return out;
  });
  ok(K.overlayShown, "K1 detach opens a confirmation dialog");
  ok(/isn't recoverable/.test(K.dialogText) && /OriginSetID/.test(K.dialogText),
    "K2 ... which states plainly that the value is destroyed and not recoverable elsewhere (stronger than the photo-detach wording, where the file survives)");
  ok(K.cellWhileDialogOpen === "AY-90555", "K3 nothing is written while the dialog is merely open");
  ok(K.cellAfterCancel === "AY-90555" && K.rowsAfterCancel === 2, "K4 Cancel writes nothing and changes nothing locally");
  ok(K.cellAfterConfirm === "", "K5 Confirm really clears the workbook cell: " + JSON.stringify(K.cellAfterConfirm));
  ok(K.rowsAfterConfirm === 1, "K6 ... and the row leaves the list only after the write landed (non-optimistic): " + K.rowsAfterConfirm);
  ok(K.backOffered === true, "K7 ... and the detached coin becomes an attachable candidate again");

  // ---------- L. Flag off: nothing real, session-only path intact ----------
  const L = await page.evaluate(async () => {
    const mock = createMockGraphClient(JSON.parse(JSON.stringify(window.__SEED)));
    __setGraphClientForTest(mock);
    __setSetLinkWriteEnabledForTest(false);
    __resetAllHeaderMapForTest();
    __setLiveCoinsForTest(JSON.parse(JSON.stringify(window.__COINS)));
    let patches = 0;
    const realPatch = mock.patchWorkbookRanges.bind(mock);
    mock.patchWorkbookRanges = (...args) => { patches++; return realPatch(...args); };

    const parent = activeCoins().find(c => c.id === "AY-90555");
    navigate("browse");
    showBrowseDetail(parent);
    showBrowseEditSetView(parent);
    const detachBtns = document.querySelectorAll("#editSetChildrenRows .set-child-detach").length;
    const noteText = document.getElementById("editSetLinkCoinNote").textContent;
    const res = await applySetLinkageWrite("AY-90600", "", "AY-90555");
    const out = {
      detachBtns, noteText, reason: res.reason, patches,
      cell: window.__cell(mock, "AY-90600", "OriginSetID")
    };
    window.__teardown();
    return out;
  });
  ok(L.detachBtns === 0, "L1 flag off: NO detach controls render — there is nothing real to undo");
  ok(/session only/.test(L.noteText), "L2 ... and the picker note says linking is session-only: " + L.noteText.trim());
  ok(L.reason === "disabled", "L3 the write path itself reports disabled");
  ok(L.patches === 0 && L.cell === "", "L4 ... and makes zero workbook writes");

  // ---------- N. Non-optimistic: a FAILED write changes nothing locally ----------
  // This block exists because a negative control caught the suite missing it:
  // making the detach optimistic (mutating in memory before/regardless of the
  // write) failed NO assertion, because every other block only exercises the
  // SUCCESS path, where optimistic and non-optimistic look identical. The
  // discriminating case is a write that fails.
  const N = await page.evaluate(async () => {
    const mock = window.__setup();
    const parent = activeCoins().find(c => c.id === "AY-90555");

    // Detach whose write will fail: make patchWorkbookRanges throw, so the
    // failure happens AFTER the conflict check passes — i.e. at exactly the
    // point where an optimistic implementation has already mutated memory.
    const child = activeCoins().find(c => c.id === "AY-90555-A");
    mock.patchWorkbookRanges = () => Promise.reject(new Error("simulated network failure"));
    const detachRes = await unlinkCoinFromSetWrite(parent, child);
    const detachMemory = activeCoins().find(c => c.id === "AY-90555-A").originSetId;
    const detachCell = window.__cell(mock, "AY-90555-A", "OriginSetID");

    // Same for attach.
    const free = activeCoins().find(c => c.id === "AY-90600");
    const attachRes = await linkCoinToSetWrite(parent, "AY-90600");
    const attachMemory = activeCoins().find(c => c.id === "AY-90600").originSetId;

    // And the UI must not drop the row either.
    navigate("browse");
    showBrowseDetail(parent);
    showBrowseEditSetView(parent);
    const rows = document.querySelectorAll("#editSetChildrenRows .album-card").length;

    const out = {
      detachOk: detachRes.ok, detachMemory, detachCell,
      attachOk: attachRes.ok, attachMemory, rows
    };
    window.__teardown();
    return out;
  });
  ok(N.detachOk === false, "N1 a detach whose workbook write fails reports failure");
  ok(N.detachMemory === "AY-90555",
    "N2 ... and leaves the in-memory record STILL LINKED — non-optimistic: local state changes only after the write is confirmed: " + JSON.stringify(N.detachMemory));
  ok(N.detachCell === "AY-90555", "N3 ... and the workbook cell is untouched");
  ok(N.attachOk === false, "N4 an attach whose write fails reports failure");
  ok(N.attachMemory === "", "N5 ... and leaves the in-memory record STILL UNLINKED: " + JSON.stringify(N.attachMemory));
  ok(N.rows === 2, "N6 ... and the child list still shows both children — the row never left the screen: " + N.rows);

  // ---------- M. Nav smoke ----------
  const M = await page.evaluate(() => {
    __setLiveCoinsForTest(null);
    navigate("dashboard");
    return { overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(M.overflow === false, "M1 no horizontal overflow back at the Dashboard");
}, module);
