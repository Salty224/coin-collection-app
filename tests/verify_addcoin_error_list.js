// Add Coin's Error dropdown reads the real Lookup_Errors sheet (Oct 2026).
// In a live session the 8 demo values (FAKE_LOOKUP_ERRORS) never show: the
// dropdown offers only "— none —" and "Other" until the real list loads, with
// an "Error list not loaded" note after a failed load. The offline mockup
// keeps the 8 demo values. See CLAUDE.md "Add Coin Error dropdown: real
// Lookup_Errors list".

const { defineSuite } = require("./harness");

// Mock Lookup_Errors rows, keyed by header like fetchWorkbookSheetRows()
// returns them. Includes a divider with a blank Category, a divider that
// has a Category, a blank name, an untrimmed name and a duplicate.
const MOCK_ROWS = [
  { "Error Type": "═══ PLANCHET ERRORS ═══", "Category": "" },
  { "Error Type": "Clipped Planchet", "Category": "Planchet" },
  { "Error Type": "  Lamination Peel  ", "Category": "Planchet" },
  { "Error Type": "═══ STRIKE ERRORS ═══", "Category": "Strike" },
  { "Error Type": "Off-Center Strike", "Category": "Strike" },
  { "Error Type": "Clipped Planchet", "Category": "Planchet" },
  { "Error Type": "", "Category": "Strike" },
  { "Error Type": "Unlisted Category Row", "Category": "  " },
  { "Error Type": "Struck Through Grease", "Category": "Strike" }
];
const EXPECTED = ["Clipped Planchet", "Lamination Peel", "Off-Center Strike", "Struck Through Grease"];

module.exports = defineSuite("addcoin-error-list", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);
  await page.evaluate((rows) => { window.__MOCK_ERR_ROWS = rows; }, MOCK_ROWS);

  // Choices currently offered (excluding the two static options).
  const CHOICES = `(() => [...document.getElementById("errorSelect").options]
      .map(o => o.value).filter(v => v !== "" && v !== "__other__"))()`;

  // A. Offline mockup keeps the 8 demo values.
  const A = await page.evaluate(`(() => {
    __setLiveDataModeForTest("offline"); __setLiveLookupErrorsForTest(null, false);
    return { choices: ${CHOICES}, fake: FAKE_LOOKUP_ERRORS.slice() };
  })()`);
  ok(JSON.stringify(A.choices) === JSON.stringify(A.fake) && A.fake.length === 8,
    "A1 offline mockup shows the 8 demo error values: " + JSON.stringify(A.choices));

  // B. Live, before the list loads: no fake values, only none + Other, no note yet.
  const B = await page.evaluate(`(() => {
    __setLiveDataModeForTest("live"); __setLiveLookupErrorsForTest(null, false);
    const sel = document.getElementById("errorSelect");
    return {
      choices: ${CHOICES},
      statics: [...sel.options].map(o => o.value),
      fakeShown: FAKE_LOOKUP_ERRORS.some(f => [...sel.options].some(o => o.value === f)),
      noteShown: document.getElementById("errorListNote").style.display !== "none"
    };
  })()`);
  ok(!B.fakeShown && B.choices.length === 0, "B1 no fake values in a live session before the list loads: " + JSON.stringify(B.choices));
  ok(JSON.stringify(B.statics) === JSON.stringify(["", "__other__"]), "B2 only \"— none —\" and \"Other\" remain: " + JSON.stringify(B.statics));
  ok(!B.noteShown, "B3 no \"not loaded\" note while the list is simply still loading");

  // C. The sheet arrives through the real optional-sheet path and the
  //    dropdown refills in place with exactly the cleaned mock list.
  const C = await page.evaluate(`(async () => {
    __setLiveDataModeForTest("live"); __setLiveLookupErrorsForTest(null, false);
    __resetLiveNavOptionalForTest();
    const realFetch = window.fetchWorkbookSheetRows;
    window.fetchWorkbookSheetRows = (sheet) => Promise.resolve(sheet === "Lookup_Errors" ? window.__MOCK_ERR_ROWS : []);
    let result;
    try { result = await refetchMissingLiveNavSheets(); } finally { window.fetchWorkbookSheetRows = realFetch; }
    const opts = [...document.getElementById("errorSelect").options].map(o => o.value);
    return {
      result, choices: ${CHOICES},
      dividerShown: opts.some(v => v.startsWith("═")),
      dupCount: opts.filter(v => v === "Clipped Planchet").length,
      otherLast: opts[opts.length - 1] === "__other__",
      noteShown: document.getElementById("errorListNote").style.display !== "none"
    };
  })()`);
  ok(JSON.stringify(C.choices) === JSON.stringify(EXPECTED),
    "C1 the real list arrives and the dropdown refills with exactly the cleaned list: " + JSON.stringify(C.choices));
  ok(!C.dividerShown, "C2 divider rows (\"═══ … ═══\") never appear as choices");
  ok(C.dupCount === 1, "C3 duplicate names collapse to one choice (" + C.dupCount + ")");
  ok(C.otherLast && !C.noteShown, "C4 \"Other\" stays last and no failure note shows after a good load");

  // D. buildLookupErrorList in isolation: header missing -> null; cleaning rules.
  const D = await page.evaluate(`(() => ({
    noHeader: buildLookupErrorList([{ "Name": "Off-Center Strike", "Category": "Strike" }]),
    empty: buildLookupErrorList([]),
    notArray: buildLookupErrorList(null),
    clean: buildLookupErrorList(window.__MOCK_ERR_ROWS)
  }))()`);
  ok(D.noHeader === null && D.empty === null && D.notArray === null,
    "D1 no \"Error Type\" header (or no rows) gives null, not a list");
  ok(JSON.stringify(D.clean) === JSON.stringify(EXPECTED),
    "D2 trims, skips blank names, blank Category and \"═\" dividers, drops duplicates: " + JSON.stringify(D.clean));

  // E. A header-less sheet arriving gives the none/Other state with the note.
  const E = await page.evaluate(`(async () => {
    __setLiveDataModeForTest("live"); __setLiveLookupErrorsForTest(null, false);
    __resetLiveNavOptionalForTest();
    const realFetch = window.fetchWorkbookSheetRows;
    window.fetchWorkbookSheetRows = (sheet) => Promise.resolve(sheet === "Lookup_Errors" ? [{ "Wrong Header": "Off-Center Strike", "Category": "Strike" }] : []);
    try { await refetchMissingLiveNavSheets(); } finally { window.fetchWorkbookSheetRows = realFetch; }
    return { choices: ${CHOICES}, noteShown: document.getElementById("errorListNote").style.display !== "none",
             noteText: document.getElementById("errorListNote").textContent.trim() };
  })()`);
  ok(E.choices.length === 0, "E1 a header-less Lookup_Errors gives the none/Other state: " + JSON.stringify(E.choices));
  ok(E.noteShown && E.noteText === "Error list not loaded", "E2 ...with the \"Error list not loaded\" note");

  // F. A failed load (no answer for the sheet) keeps none/Other working, note shown.
  const F = await page.evaluate(`(async () => {
    __setLiveDataModeForTest("live"); __setLiveLookupErrorsForTest(null, false);
    __resetLiveNavOptionalForTest();
    const realFetch = window.fetchWorkbookSheetRows;
    window.fetchWorkbookSheetRows = (sheet) => Promise.resolve(sheet === "Lookup_Errors" ? null : []);
    try { await refetchMissingLiveNavSheets(); } finally { window.fetchWorkbookSheetRows = realFetch; }
    const sel = document.getElementById("errorSelect");
    sel.value = "__other__"; sel.dispatchEvent(new Event("change"));
    const other = document.getElementById("errorOther");
    other.value = "Rotated Die 45°"; other.dispatchEvent(new Event("input"));
    return { choices: ${CHOICES}, noteShown: document.getElementById("errorListNote").style.display !== "none",
             otherShown: other.style.display !== "none", desc: document.getElementById("errorDesc").value,
             stillMissing: missingLiveNavOptionalSheets().includes("Lookup_Errors") };
  })()`);
  ok(F.choices.length === 0 && F.noteShown, "F1 a failed load shows none/Other plus the \"not loaded\" note");
  ok(F.otherShown && F.desc === "Rotated Die 45°", "F2 \"Other\" free text still works after a failed load (" + JSON.stringify(F.desc) + ")");
  ok(F.stillMissing, "F3 the sheet stays marked missing, so the next navigation retries it");

  // G. Picked value reaches the draft unchanged; restore of in-list vs not-in-list.
  const G = await page.evaluate(`(() => {
    __setLiveDataModeForTest("live"); __setLiveLookupErrorsForTest(${JSON.stringify(EXPECTED)}, false);
    const sel = document.getElementById("errorSelect");
    sel.value = "Off-Center Strike"; sel.dispatchEvent(new Event("change"));
    const picked = readAddCoinFormForDraft().errorDesc;
    resetAddCoinForm();
    applyCoinDraftToForm({ errorDesc: "Clipped Planchet" });
    const inList = { sel: sel.value, otherShown: document.getElementById("errorOther").style.display !== "none", desc: document.getElementById("errorDesc").value };
    resetAddCoinForm();
    applyCoinDraftToForm({ errorDesc: "Broadstrike" }); // a demo value, not in the real list
    const notInList = { sel: sel.value, other: document.getElementById("errorOther").value, desc: document.getElementById("errorDesc").value };
    resetAddCoinForm();
    return { picked, inList, notInList };
  })()`);
  ok(G.picked === "Off-Center Strike", "G1 a picked value reaches the draft unchanged (" + JSON.stringify(G.picked) + ")");
  ok(G.inList.sel === "Clipped Planchet" && !G.inList.otherShown && G.inList.desc === "Clipped Planchet",
    "G2 a saved Error that is in the real list restores as that option: " + JSON.stringify(G.inList));
  ok(G.notInList.sel === "__other__" && G.notInList.other === "Broadstrike" && G.notInList.desc === "Broadstrike",
    "G3 a saved Error not in the list restores as \"Other\" with its text unchanged: " + JSON.stringify(G.notInList));

  // H. A refill while a pick is showing never changes the saved value.
  const H = await page.evaluate(`(() => {
    __setLiveDataModeForTest("live"); __setLiveLookupErrorsForTest(["Old Only Value"], false);
    const sel = document.getElementById("errorSelect");
    sel.value = "Old Only Value"; sel.dispatchEvent(new Event("change"));
    __setLiveLookupErrorsForTest(${JSON.stringify(EXPECTED)}, false);
    const out = { sel: sel.value, other: document.getElementById("errorOther").value, desc: document.getElementById("errorDesc").value };
    resetAddCoinForm();
    __setLiveDataModeForTest(null); __setLiveLookupErrorsForTest(null, false);
    return out;
  })()`);
  ok(H.desc === "Old Only Value" && H.sel === "__other__" && H.other === "Old Only Value",
    "H1 a refill that drops the current pick moves it to \"Other\" with its text kept; the saved value is unchanged: " + JSON.stringify(H));


  // I. Grading Help placeholder text is gone and the dialog still opens.
  const I = await page.evaluate(() => {
    showGradingHelp("lincoln_wheat_cent", "Lincoln Wheat Cent");
    const body = document.getElementById("gradingHelpBody").textContent;
    document.getElementById("gradingHelpOverlay").classList.add("hidden");
    return { gone: typeof FAKE_GRADING_HELP === "undefined", body };
  });
  ok(I.gone, "I1 FAKE_GRADING_HELP no longer exists");
  ok(/No grading guidance on file yet/.test(I.body) && /PCGS PhotoGrade/.test(I.body) && !/Placeholder only/.test(I.body),
    "I2 Grading Help shows the empty message and the PCGS/NGC links, no placeholder text");

  // J. Category column handling. No Category column at all -> only the "═"
  //    divider check applies; Category column present -> blank-Category rows
  //    are still skipped; "Error Type" header still required.
  const J = await page.evaluate(`(() => {
    const noCat = buildLookupErrorList([
      { "Error Type": "═══ PLANCHET ERRORS ═══" },
      { "Error Type": "Clipped Planchet" },
      { "Error Type": "  Lamination Peel  " },
      { "Error Type": "═══ STRIKE ERRORS ═══" },
      { "Error Type": "Off-Center Strike" },
      { "Error Type": "Clipped Planchet" },
      { "Error Type": "" }
    ]);
    const withCat = buildLookupErrorList([
      { "Error Type": "Off-Center Strike", "Category": "Strike" },
      { "Error Type": "Blank Category Row", "Category": "" },
      { "Error Type": "Missing Category Cell" },
      { "Error Type": "Clipped Planchet", "Category": "Planchet" }
    ]);
    const noHeader = buildLookupErrorList([{ "Name": "Off-Center Strike" }, { "Name": "Clipped Planchet" }]);
    return { noCat, withCat, noHeader };
  })()`);
  ok(JSON.stringify(J.noCat) === JSON.stringify(["Clipped Planchet", "Lamination Peel", "Off-Center Strike"]),
    "J1 a sheet with no Category column gives the cleaned list without divider rows: " + JSON.stringify(J.noCat));
  ok(JSON.stringify(J.withCat) === JSON.stringify(["Off-Center Strike", "Clipped Planchet"]),
    "J2 a sheet with a Category column still skips blank-Category rows: " + JSON.stringify(J.withCat));
  ok(J.noHeader === null, "J3 a missing \"Error Type\" header is still a failed load (null), with or without Category");
}, module);
