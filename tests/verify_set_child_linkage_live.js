// Set/child linkage — live-data path added to setChildrenFor() and
// resolveChildParentSet(), which were both 100% demo-only before this:
// they read FAKE_SET_CHILDREN / FAKE_COINS directly, with no live-data
// path at all, so a real Set's "Coins in this Set" accordion and a real
// child's "Belongs to → Set" chip both rendered nothing regardless of how
// correctly OriginSetID was populated in the real workbook.
//
// Root cause per Ray's report: a real 1967 SMS Set broken out into 5 real
// children (e.g. AY-00555-A), each with OriginSetID confirmed populated
// pointing at the PARENT's own CollectionID — the same convention the
// app's own real Add Set write path already uses (addChildToSetDraft():
// `originSetId: draft.collectionID`). The demo/mockup data uses a
// DIFFERENT convention (parent and children share one derived "OS-..."
// string), which is why the old code never worked for real data even in
// principle. See CLAUDE.md "Multi-coin Set display" / "Add Set + real
// write layer" for the two conventions' own history.

const { defineSuite } = require("./harness");

module.exports = defineSuite("set-child-linkage-live", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ---------- A. originSetIdKeysMatch() in isolation ----------
  const A = await page.evaluate(() => {
    return {
      exact: originSetIdKeysMatch("AY-00555", "AY-00555"),
      whitespace: originSetIdKeysMatch("  AY-00555  ", "AY-00555"),
      bothWhitespace: originSetIdKeysMatch(" AY-00555", "AY-00555 "),
      mismatch: originSetIdKeysMatch("AY-00555", "AY-00556"),
      bothBlank: originSetIdKeysMatch("", ""),
      oneBlank: originSetIdKeysMatch("AY-00555", ""),
      nullish: originSetIdKeysMatch(null, undefined)
    };
  });
  ok(A.exact === true, "A1 exact match");
  ok(A.whitespace === true, "A2 leading/trailing whitespace on one side is trimmed away — this is the exact real-data risk Ray flagged, since colVal() does no trimming of its own");
  ok(A.bothWhitespace === true, "A3 whitespace on both sides");
  ok(A.mismatch === false, "A4 genuinely different values never match");
  ok(A.bothBlank === false, "A5 two blanks must NOT match — would otherwise wrongly link every parentless coin to every childless Set");
  ok(A.oneBlank === false, "A6 one real value against blank doesn't match");
  ok(A.nullish === false, "A7 null/undefined never throws and never matches");

  // ---------- B. setChildrenFor(): real/live tier, simulating Ray's exact scenario ----------
  const SEED = [
    // The parent Set — a real live Set row carries NO OriginSetID of its
    // own (only children do); this is the exact condition the OLD guard
    // (`!coin.originSetId` on the PARENT) got backwards.
    { id: "AY-90555", name: "1967 Special Mint Set", denom: "Multiple", year: 1967,
      mint: "", grade: "", value: 40, cost: 30, originSetId: "", coinId: "" },
    // 5 real children, OriginSetID pointing at the parent's own
    // CollectionID directly — the real convention, not the demo one.
    { id: "AY-90555-A", name: "Lincoln Memorial Cent", denom: "1C", year: 1967, mint: "",
      grade: "MS-65", finish: "SMS", value: 3, cost: 2, originSetId: "AY-90555", coinId: "" },
    { id: "AY-90555-B", name: "Jefferson Nickel", denom: "5C", year: 1967, mint: "",
      grade: "MS-65", finish: "SMS", value: 4, cost: 3, originSetId: "AY-90555", coinId: "" },
    { id: "AY-90555-C", name: "Roosevelt Dime", denom: "10C", year: 1967, mint: "",
      grade: "MS-66", finish: "SMS", value: 5, cost: 4, originSetId: "AY-90555", coinId: "" },
    { id: "AY-90555-D", name: "Washington Quarter", denom: "25C", year: 1967, mint: "",
      grade: "MS-65", finish: "SMS", value: 6, cost: 5, originSetId: "AY-90555", coinId: "" },
    { id: "AY-90555-E", name: "Kennedy Half Dollar", denom: "50C", year: 1967, mint: "",
      grade: "MS-64", finish: "SMS", value: 8, cost: 7, originSetId: "AY-90555", coinId: "" },
    // A control: an ordinary unrelated live coin with no OriginSetID at all.
    { id: "AY-90600", name: "Morgan Dollar", denom: "$1", year: 1889, mint: "CC",
      grade: "MS-64", value: 900, cost: 800, originSetId: "", coinId: "" },
    // A second control: a coin whose OriginSetID points at a DIFFERENT
    // parent — must never leak into AY-90555's own children.
    { id: "AY-90700-A", name: "Buffalo Nickel", denom: "5C", year: 1937, mint: "D",
      grade: "MS-62", value: 55, cost: 60, originSetId: "AY-90700", coinId: "" }
  ];
  await page.evaluate((seed) => { window.__SEED = seed; }, SEED);

  const B = await page.evaluate(() => {
    __setLiveCoinsForTest(window.__SEED);
    const parent = window.__SEED.find(c => c.id === "AY-90555");
    const children = setChildrenFor(parent);
    return {
      count: children.length,
      ids: children.map(c => c.id).sort(),
      anyIsSet: children.some(c => isSetRow(c)),
      selfIncluded: children.some(c => c.id === parent.id)
    };
  });
  ok(B.count === 5, "B1 all 5 real children found via the live-data path — this is the reported bug, now fixed: " + B.count);
  ok(JSON.stringify(B.ids) === JSON.stringify(["AY-90555-A", "AY-90555-B", "AY-90555-C", "AY-90555-D", "AY-90555-E"]),
    "B2 exactly the right 5, no leakage from the AY-90700 control: " + JSON.stringify(B.ids));
  ok(B.anyIsSet === false, "B3 no Set row ever comes back as its own child");
  ok(B.selfIncluded === false, "B4 the parent never includes itself");

  // ---------- C. setChildrenFor(): unrelated/childless real Sets stay empty ----------
  const C = await page.evaluate(() => {
    const unrelatedParent = window.__SEED.find(c => c.id === "AY-90600"); // not even a Set
    const childlessSet = { id: "AY-90999", name: "Empty Set", denom: "Multiple", year: 2020, originSetId: "" };
    return {
      notASet: setChildrenFor(unrelatedParent).length,
      noChildrenYet: setChildrenFor(childlessSet).length
    };
  });
  ok(C.notASet === 0, "C1 a non-Set coin always returns []");
  ok(C.noChildrenYet === 0, "C2 a real Set with no matching live children returns [] (the childless-backlog case), not a throw");

  // ---------- D. setChildrenFor(): demo/mockup fallback still works (AY-00022, no live override) ----------
  const D = await page.evaluate(() => {
    __setLiveCoinsForTest(null);
    const parent = FAKE_COINS.find(c => c.id === "AY-00022");
    const children = setChildrenFor(parent);
    return { count: children.length, anyIsSet: children.some(c => isSetRow(c)) };
  });
  ok(D.count === 3, "D1 the pre-existing demo Set (AY-00022, shared-originSetId-string convention) still resolves its 3 children unchanged: " + D.count);
  ok(D.anyIsSet === false, "D2 -- and they're still ordinary coin rows");

  // ---------- E. resolveChildParentSet(): real/live tier ----------
  const E = await page.evaluate(() => {
    __setLiveCoinsForTest(window.__SEED);
    const childA = window.__SEED.find(c => c.id === "AY-90555-A");
    const parent = resolveChildParentSet(childA);
    const unrelated = resolveChildParentSet(window.__SEED.find(c => c.id === "AY-90600")); // no originSetId
    const parentItself = resolveChildParentSet(window.__SEED.find(c => c.id === "AY-90555")); // isSetRow -> always null
    const wrongParent = resolveChildParentSet(window.__SEED.find(c => c.id === "AY-90700-A")); // points at a Set that doesn't exist in this seed
    return {
      parentId: parent && parent.id,
      parentName: parent && parent.name,
      unrelated,
      parentItself,
      wrongParent
    };
  });
  ok(E.parentId === "AY-90555", "E1 a real child's chip resolves back to its real live parent — this is the other half of the reported bug: " + E.parentId);
  ok(E.parentName === "1967 Special Mint Set", "E2 the resolved parent carries its real name");
  ok(E.unrelated === null, "E3 a coin with no OriginSetID resolves to null, not a throw");
  ok(E.parentItself === null, "E4 a Set never resolves a parent for itself (isSetRow guard)");
  ok(E.wrongParent === null, "E5 a child pointing at a Set that isn't in the live pool resolves to null rather than a stale/wrong match");

  // ---------- F. resolveChildParentSet(): demo/mockup fallback still works ----------
  const F = await page.evaluate(() => {
    __setLiveCoinsForTest(null);
    const demoParent = FAKE_COINS.find(c => c.id === "AY-00022");
    const demoChild = setChildrenFor(demoParent)[0];
    const resolved = resolveChildParentSet(demoChild);
    return { childId: demoChild.id, resolvedId: resolved && resolved.id };
  });
  ok(F.resolvedId === "AY-00022", "F1 a demo child (shared-string convention) still resolves back to its demo parent unchanged: " + JSON.stringify(F));

  // ---------- G. Real end-to-end render: "Coins in this Set" accordion ----------
  const G = await page.evaluate(() => {
    __setLiveCoinsForTest(window.__SEED);
    navigate("browse");
    const parent = window.__SEED.find(c => c.id === "AY-90555");
    showBrowseDetail(parent);
    const headers = [...document.querySelectorAll("#detailAccordions .accordion-header")];
    const setChildrenHeader = headers.find(h => h.querySelector("span").textContent === "Coins in this Set");
    if (!setChildrenHeader) return { found: false };
    const body = setChildrenHeader.closest(".detail-accordion").querySelector(".accordion-body");
    const rows = [...body.querySelectorAll(".album-card")];
    return {
      found: true,
      rowCount: rows.length,
      names: rows.map(r => r.querySelector(".album-card-name") ? r.querySelector(".album-card-name").textContent : r.textContent)
    };
  });
  ok(G.found, "G0 sanity: the \"Coins in this Set\" accordion actually renders for a real live Set");
  ok(G.rowCount === 5, "G1 real end-to-end: the accordion shows all 5 real children, driven through showBrowseDetail() -> renderDetailAccordions() -> setChildrenFor(), not just the function in isolation: " + JSON.stringify(G));

  // ---------- H. Real end-to-end render: child's own "Belongs to → Set" chip ----------
  const H = await page.evaluate(() => {
    navigate("browse");
    const childA = window.__SEED.find(c => c.id === "AY-90555-A");
    showBrowseDetail(childA);
    const chips = [...document.querySelectorAll("#detailAccordions .linkage-chip")];
    const setChip = chips.find(c => {
      const kind = c.querySelector(".linkage-kind");
      return kind && kind.textContent === "Set";
    });
    return {
      found: !!setChip,
      name: setChip && setChip.querySelector(".linkage-name").textContent
    };
  });
  ok(H.found, "H0 sanity: a real live child renders a \"Set\" linkage chip at all — this is the exact symptom Ray reported (no chip appeared)");
  ok(H.name === "1967 Special Mint Set", "H1 real end-to-end: the chip names the real parent, driven through showBrowseDetail() -> renderLinkageChipsInto() -> resolveChildParentSet(): " + H.name);

  // ---------- I. Real end-to-end: the chip actually navigates to the parent ----------
  const I = await page.evaluate(() => {
    navigate("browse");
    const childA = window.__SEED.find(c => c.id === "AY-90555-A");
    showBrowseDetail(childA);
    const chips = [...document.querySelectorAll("#detailAccordions .linkage-chip")];
    const setChip = chips.find(c => {
      const kind = c.querySelector(".linkage-kind");
      return kind && kind.textContent === "Set";
    });
    setChip.click();
    const titleEl = document.getElementById("browseDetailName");
    return { title: titleEl ? titleEl.textContent : null };
  });
  ok(I.title === "1967 Special Mint Set", "I1 clicking the chip actually opens the real parent Set's own detail view: " + I.title);

  // ---------- J. Nav smoke / no overflow, live override cleared ----------
  const J = await page.evaluate(() => {
    __setLiveCoinsForTest(null);
    navigate("dashboard");
    return { overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(J.overflow === false, "J1 no horizontal overflow back at the Dashboard");
}, module);
