// Three items from Ray's live Add Coin testing, all built together in one
// pass since B builds directly on A's now-trustworthy signal:
//
// FIX A — dbCoinsCandidatesFor()'s Finish tier used to be gated by
// `candidates.length > 1`, so a real Finish MISMATCH against the one and
// only candidate was never checked at all — the lone (wrong) candidate was
// accepted unconditionally. Confirmed root cause of a real 2025 Reverse
// Proof cent silently matching a Business-Strike-only catalog row. Fixed:
// a single candidate whose own Finish disagrees with a real, RECOGNIZED
// supplied Finish now resolves to No Match, same "route to a closer look"
// outcome the multi-candidate tier already gives a genuine disagreement.
// An unrecognized/blank Finish still never manufactures a miss — same
// protection the multi-candidate branch already gives All-only values
// (Circulated/Various).
//
// FEATURE B — the real direct-write path. "Save to Database" now writes
// the Staging draft AND immediately reuses promoteCoinDraft()'s own real
// write path when the match resolves to exactly one clean, unambiguous
// DB_Coins row (match.how !== "none") — no separate manual Promote step.
// Ambiguous, conflicting (per Fix A), or unmatched coins keep "Save to
// Database" unavailable; "Save to Staging" is unaffected and always works.
//
// FEATURE C — a visible loading indicator (a spinning coin disc reusing
// the splash screen's own splashSpin keyframes) during a real write —
// covered here for the Add Coin Save button specifically; the shared
// runWithButtonPending() mechanism (Promote on Staging Review/the Docket)
// has its own dedicated coverage in verify_promote_race.js's H block.
//
// See CLAUDE.md for the full design writeup.

const { defineSuite } = require("./harness");

const ALL_HEADERS = [
  "CollectionID", "CoinID", "Denomination", "Category", "Year", "MintMark",
  "Variety", "Description", "Finish", "Designation", "Grade", "GradeSource",
  "SerNo", "CACBean", "Cost", "Shipping", "Total", "Seller_Link",
  "PurchaseDate", "SpotValue", "Value", "FaceValue", "StorageLocation", "Container",
  "Remarks", "Reviewed", "LastModified", "Error", "Status"
];

// A single candidate matching the base key with Finish "Business Strike",
// alongside an UNRELATED row that makes "Reverse Proof" a real, recognized
// DB_Coins Finish value elsewhere in the catalog — reproducing the exact
// shape of the reported bug (a real Reverse Proof cent whose own date/mint
// has only a Business Strike row, while Reverse Proof is a real category
// DB_Coins does track, just not for this coin).
const LONE_CANDIDATE = {
  denom: "1C", year: 2025, mint: "S", variety: "",
  description: "Lincoln Shield Cent", finish: "Business Strike",
  designation: "", coinId: "C-2025-S-1C-01", pcgs: "", mintage: null, gsid: "", composition: ""
};
const UNRELATED_PROOF_ROW = {
  denom: "10C", year: 2020, mint: "S", variety: "",
  description: "Roosevelt Dime", finish: "Reverse Proof",
  designation: "", coinId: "C-2020-S-10C-09", pcgs: "", mintage: null, gsid: "", composition: ""
};

function seedMock() {
  return { sheets: { All: [ALL_HEADERS.slice()] }, workbookColumns: { "All::CollectionID": [] } };
}

module.exports = defineSuite("finish-conflict-and-direct-write", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ============ A. FIX A — single-candidate Finish narrowing ============
  const A = await page.evaluate((args) => {
    const LONE_CANDIDATE = args.lone, UNRELATED_PROOF_ROW = args.unrelated;
    const shape = (finish) => ({ denom: "1C", year: "2025", mint: "S", variety: "", finish });

    __setLiveDbCoinsForTest([LONE_CANDIDATE, UNRELATED_PROOF_ROW]);
    const mismatchRecognized = dbCoinsCandidatesFor(shape("Reverse Proof")).length;   // real, known, disagreeing -> 0
    const matching = dbCoinsCandidatesFor(shape("Business Strike")).length;            // agrees -> 1
    const blankFinish = dbCoinsCandidatesFor(shape("")).length;                        // nothing recorded -> unaffected, 1
    const unrecognizedFinish = dbCoinsCandidatesFor(shape("Circulated")).length;        // real but not in THIS catalog -> soft, 1

    // Sanity: the multi-candidate branch (length > 1) is untouched by this
    // restructure — two candidates, one Finish match, narrows to exactly 1.
    __setLiveDbCoinsForTest([
      Object.assign({}, LONE_CANDIDATE, { coinId: "C-2025-S-1C-01" }),
      Object.assign({}, LONE_CANDIDATE, { coinId: "C-2025-S-1C-02", finish: "Proof" })
    ]);
    const multiNarrows = dbCoinsCandidatesFor(shape("Proof")).length;

    __setLiveDbCoinsForTest(null);
    return { mismatchRecognized, matching, blankFinish, unrecognizedFinish, multiNarrows };
  }, { lone: LONE_CANDIDATE, unrelated: UNRELATED_PROOF_ROW });
  ok(A.mismatchRecognized === 0,
    "A1 FIX A: a lone candidate whose Finish disagrees with a real, recognized supplied Finish now resolves to No Match (was silently accepted before this fix)");
  ok(A.matching === 1, "A2 -- and still resolves normally when Finish genuinely agrees");
  ok(A.blankFinish === 1, "A3 -- a blank supplied Finish never narrows the lone candidate (nothing recorded, nothing to disagree with)");
  ok(A.unrecognizedFinish === 1,
    "A4 -- an unrecognized/All-only Finish value (Circulated — not in this fixture's own catalog) never manufactures a false miss, same protection the multi-candidate branch already gives");
  ok(A.multiNarrows === 1, "A5 -- the pre-existing multi-candidate (length > 1) branch is untouched: still narrows normally");

  // Negative control: reproduce the OLD rule verbatim (Finish only ever
  // checked when candidates.length > 1) against the exact same fixture and
  // confirm it WOULD have silently accepted the mismatched row — proving
  // A1 exercises a real fix, not a restatement of already-passing behavior.
  const NEG = await page.evaluate((args) => {
    __setLiveDbCoinsForTest([args.lone, args.unrelated]);
    const shape = { denom: "1C", year: "2025", mint: "S", variety: "", finish: "Reverse Proof" };
    let candidates = activeDbCoins().filter(c =>
      normField(c.denom) === normField(shape.denom) && String(c.year) === String(shape.year) &&
      normField(c.mint) === normField(shape.mint) && normField(c.variety || "") === normField(shape.variety || "")
    );
    // The OLD guard: Finish narrowing only ever ran when length > 1.
    if (candidates.length > 1 && normField(shape.finish || "")) {
      candidates = candidates.filter(c => normField(c.finish || "") === normField(shape.finish));
    }
    const oldRuleResult = candidates.length;
    const realFixedResult = dbCoinsCandidatesFor(shape).length;
    __setLiveDbCoinsForTest(null);
    return { oldRuleResult, realFixedResult };
  }, { lone: LONE_CANDIDATE, unrelated: UNRELATED_PROOF_ROW });
  ok(NEG.oldRuleResult === 1,
    "NEG1 the OLD single-candidate rule reproduces the exact reported bug: it would have silently kept the mismatched Business-Strike-only row as if it matched a Reverse Proof coin");
  ok(NEG.realFixedResult === 0,
    "NEG2 the REAL, currently-shipping dbCoinsCandidatesFor() correctly reports No Match for the identical input");

  // ============ B. FEATURE B — readiness banners at the UI level ============
  const B = await page.evaluate((args) => {
    const LONE_CANDIDATE = args.lone, UNRELATED_PROOF_ROW = args.unrelated;
    const read = () => ({
      btnDisplay: getComputedStyle(document.getElementById("saveToDatabaseBtn")).display,
      confidentMsg: document.getElementById("saveConfidentMsg").textContent,
      notConfidentMsg: document.getElementById("saveNotConfidentMsg").textContent
    });
    const fill = (y, d, m, finish) => {
      navigate("addcoin");
      document.getElementById("denomination").value = d;
      document.getElementById("denomination").dispatchEvent(new Event("change"));
      document.getElementById("year").value = y;
      document.getElementById("mintMark").value = m || "";
      document.getElementById("finish").value = finish || "";
      document.getElementById("year").dispatchEvent(new Event("input"));
      checkDbCoinsMatch();
      return read();
    };

    __setLiveDbCoinsForTest([LONE_CANDIDATE, UNRELATED_PROOF_ROW]);
    const clean = fill("2025", "1C", "S", "Business Strike");
    // FIX A engaged: a single candidate whose Finish now disagrees with a
    // real recognized value resolves to zero, so this reads exactly like a
    // genuine catalog miss at the UI level too.
    const finishConflict = fill("2025", "1C", "S", "Reverse Proof");

    __setLiveDbCoinsForTest([
      Object.assign({}, LONE_CANDIDATE, { coinId: "C-2025-S-1C-01" }),
      Object.assign({}, LONE_CANDIDATE, { coinId: "C-2025-S-1C-02", finish: "Proof" })
    ]);
    const ambiguous = fill("2025", "1C", "S", "");

    __setLiveDbCoinsForTest([]);
    const noMatch = fill("2025", "1C", "S", "");

    __setLiveDbCoinsForTest(null);
    return { clean, finishConflict, ambiguous, noMatch };
  }, { lone: LONE_CANDIDATE, unrelated: UNRELATED_PROOF_ROW });
  ok(B.clean.btnDisplay !== "none",
    "B1 Save to Database is offered for a genuinely clean, unambiguous match");
  ok(/writes this coin straight to the All sheet in one step/.test(B.clean.confidentMsg),
    "B2 the ✅ banner now describes the REAL readiness check (direct write), not the old static Variety-only claim: " + B.clean.confidentMsg);
  ok(B.finishConflict.btnDisplay === "none",
    "B3 FIX A + FEATURE B together: a Finish conflict on what would have been the sole candidate makes Save to Database unavailable");
  ok(/No single DB_Coins entry resolved/.test(B.finishConflict.notConfidentMsg),
    "B4 -- reading exactly like a genuine catalog miss, since dbCoinsCandidatesFor() now correctly reports zero candidates for it");
  ok(B.ambiguous.btnDisplay === "none",
    "B5 an unresolved 2+ ambiguous match also keeps Save to Database unavailable");
  ok(/catalog entries match this coin, and none is picked yet/.test(B.ambiguous.notConfidentMsg),
    "B6 -- with its OWN distinct wording now, not the generic \"no catalog row\" message a real ambiguous match used to get: " + B.ambiguous.notConfidentMsg);
  ok(B.noMatch.btnDisplay === "none" && /No single DB_Coins entry resolved/.test(B.noMatch.notConfidentMsg),
    "B7 a genuine zero-candidate miss keeps its own original wording, unaffected by the new ambiguous-specific branch");

  // ============ C. FEATURE B — the real write, end to end ============
  // A clean match promotes straight to All in one click; no separate manual
  // Promote is needed, and the draft ends up PROMOTED, not sitting in
  // Staging Review's "Needs a decision" list.
  const C = await page.evaluate(async (args) => {
    const ALL_HEADERS = args.headers;
    navigate("addcoin");
    const mock = createMockGraphClient(args.seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([args.row]);

    document.getElementById("denomination").value = "1C";
    document.getElementById("denomination").dispatchEvent(new Event("change"));
    document.getElementById("year").value = "2025";
    document.getElementById("mintMark").value = "S";
    document.getElementById("finish").value = "Business Strike";
    document.getElementById("purchasePrice").value = "3.50";
    checkDbCoinsMatch();

    // Spy on promoteCoinDraft() — FEATURE B must REUSE it, never duplicate
    // its write path. Wrap it so the real function still runs.
    let promoteCalledWith = null;
    const realPromote = window.promoteCoinDraft;
    window.promoteCoinDraft = (id) => { promoteCalledWith = id; return realPromote(id); };

    await new Promise(r => { saveAddCoinForm("database"); setTimeout(r, 900); });

    const idx = n => ALL_HEADERS.indexOf(n);
    const g = mock._grids.All;
    // Row 2 (index 1) is the first blank row claimed, since the sheet was
    // seeded with only a header row.
    const row = g[1] || [];
    const draft = await mock.getJson(writePaths().stagingBase + "/AY-00001/coin.json");

    window.promoteCoinDraft = realPromote;
    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return {
      promoteCalledWith,
      collectionId: row[idx("CollectionID")], coinId: row[idx("CoinID")],
      finish: row[idx("Finish")], cost: row[idx("Cost")],
      draftStatus: draft && draft.status, savedVia: draft && draft.savedVia
    };
  }, { seed: seedMock(), row: LONE_CANDIDATE, headers: ALL_HEADERS });
  ok(C.promoteCalledWith === "AY-00001",
    "C1 FEATURE B reuses promoteCoinDraft() itself for the reserved id — not a second copy of the write path");
  ok(C.collectionId === "AY-00001" && C.coinId === "C-2025-S-1C-01",
    "C2 the coin lands directly in the All sheet in this same save, both keys written: " + JSON.stringify(C));
  ok(C.finish === "Business Strike" && C.cost === 3.5,
    "C3 -- with the rest of the captured data too");
  ok(C.draftStatus === "Promoted",
    "C4 the draft's own status is PROMOTED — it never sits waiting in Staging Review's \"Needs a decision\" list");
  ok(C.savedVia === "direct", "C5 savedVia still records which button was actually pressed");

  // ============ D. Save to Staging never auto-promotes, even for the SAME clean match ============
  const D = await page.evaluate(async (args) => {
    const ALL_HEADERS = args.headers;
    navigate("addcoin");
    const mock = createMockGraphClient(args.seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([args.row]);

    document.getElementById("denomination").value = "1C";
    document.getElementById("denomination").dispatchEvent(new Event("change"));
    document.getElementById("year").value = "2025";
    document.getElementById("mintMark").value = "S";
    document.getElementById("finish").value = "Business Strike";
    checkDbCoinsMatch();

    let promoteCalled = false;
    const realPromote = window.promoteCoinDraft;
    window.promoteCoinDraft = (id) => { promoteCalled = true; return realPromote(id); };

    await new Promise(r => { saveAddCoinForm("staging"); setTimeout(r, 700); });

    const rowsAfter = mock._grids.All.length;
    const draft = await mock.getJson(writePaths().stagingBase + "/AY-00001/coin.json");

    window.promoteCoinDraft = realPromote;
    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { promoteCalled, rowsAfter, draftStatus: draft && draft.status, coinId: draft && draft.coinId };
  }, { seed: seedMock(), row: LONE_CANDIDATE, headers: ALL_HEADERS });
  ok(D.promoteCalled === false,
    "D1 Save to Staging never invokes the immediate-promote path, even for an identically clean match");
  ok(D.rowsAfter === 1, "D2 -- the All sheet is untouched (still just its header row)");
  ok(D.draftStatus === "Draft — awaiting review" && D.coinId === "C-2025-S-1C-01",
    "D3 -- the draft is written as an ordinary Staging draft, catalog match already recorded, waiting on a manual Promote as before");

  // ============ E. A "database" click that resolves to no match falls back cleanly ============
  // Defensive path: match.how can legitimately be "none" for a database-
  // destination save (an identity edit or a "None of these" pick landing
  // between render and click) — this must fall through to the ordinary
  // Staging-only save, never attempt to promote with no CoinID.
  const E = await page.evaluate(async (args) => {
    const mock = createMockGraphClient(args.seed);
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    let promoteCalled = false;
    const realPromote = window.promoteCoinDraft;
    window.promoteCoinDraft = (id) => { promoteCalled = true; return realPromote(id); };
    let err = null;
    try {
      await completeAddCoinSave("database", { coinId: "", row: null, how: "none", candidateCount: 0 });
    } catch (e) { err = String(e && e.message || e); }
    window.promoteCoinDraft = realPromote;
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { promoteCalled, err, rows: mock._grids.All.length };
  }, { seed: seedMock() });
  ok(E.err === null, "E1 a database save that resolves to no match doesn't throw: " + E.err);
  ok(E.promoteCalled === false, "E2 -- and never attempts to promote a coin with no resolved CoinID");
  ok(E.rows === 1, "E3 -- the All sheet stays untouched, exactly the safe fallback the guard exists for");

  // ============ F. FEATURE C — Add Coin's own Save button ============
  const F = await page.evaluate(async (args) => {
    navigate("addcoin");
    const mock = createMockGraphClient(args.seed);
    // Gate the write so the pending state is observable mid-flight.
    let release;
    const gate = new Promise(r => { release = r; });
    const realUpload = mock.uploadJson.bind(mock);
    mock.uploadJson = async (...a) => { await gate; return realUpload(...a); };
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    document.getElementById("denomination").value = "1C";
    document.getElementById("denomination").dispatchEvent(new Event("change"));
    document.getElementById("year").value = "1943";
    checkDbCoinsMatch();

    const btn = document.getElementById("saveToStagingBtn");
    const before = { disabled: btn.disabled, hasSpinDisc: !!btn.querySelector(".btn-spin-disc") };
    const running = new Promise(r => { saveAddCoinForm("staging"); setTimeout(r, 50); });
    await running;
    const during = { disabled: btn.disabled, hasSpinDisc: !!btn.querySelector(".btn-spin-disc"), label: btn.textContent };
    release();
    await new Promise(r => setTimeout(r, 500));
    const after = { disabled: btn.disabled, hasSpinDisc: !!btn.querySelector(".btn-spin-disc") };

    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { before, during, after };
  }, { seed: seedMock() });
  ok(F.before.hasSpinDisc === false, "F1 no spinning disc before the save starts");
  ok(F.during.disabled === true && F.during.hasSpinDisc === true,
    "F2 FEATURE C: the same splashSpin-keyframed coin disc appears on Add Coin's own Save button while the real write is in flight");
  ok(/Saving…/.test(F.during.label), "F3 -- alongside the existing \"Saving…\" label text");
  ok(F.after.disabled === false && F.after.hasSpinDisc === false,
    "F4 -- and is fully cleaned up once the write settles");

  // ---------- nav / overflow smoke ----------
  const G = await page.evaluate(() => {
    const routes = ["dashboard", "addcoin", "staging", "needsdbcoins", "dashboard"];
    const bad = [];
    routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    navigate("dashboard");
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(G.bad.length === 0, "G1 every route still navigates cleanly: " + G.bad.join("; "));
  ok(G.overflow === false, "G2 no horizontal page overflow at 412px");
}, module);
