// Docket: per-row "Handed Off" / "Research" tag inside the Research
// section — live-testing item 4 of Ray's 4-item batch (Staging vs.
// Awaiting Copilot Research read as nearly identical; Ray's latitude was
// to either rename the section or visually distinguish row kinds — this
// is the latter). See CLAUDE.md "Docket: Research row tags".

const { defineSuite } = require("./harness");

module.exports = defineSuite("docket-row-tags", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  await page.evaluate(() => {
    window.DRAFT = (o) => Object.assign({
      type: "coin", version: 1, status: "Draft — awaiting review",
      denom: "1C", year: "1909", mint: "S", variety: "", description: "Test Coin",
      photos: [], createdDate: new Date().toISOString()
    }, o);
  });

  // ---------- A. Section is still just three, not four (no split) ----------
  const A = await page.evaluate(() => {
    navigate('needsdbcoins');
    const headers = [...document.querySelectorAll('#view-needsdbcoins .accordion-header')];
    return headers.map(h => h.querySelector('span').textContent.replace(/\s+\d+$/, '').trim());
  });
  ok(JSON.stringify(A) === JSON.stringify(["Staging", "Awaiting Copilot Research", "Other / Requires Photos"]),
    "A1 still three sections — the distinction is a per-row tag, not a section rename/split: " + A.join(" | "));

  // ---------- B. A real Docket queue entry (genuine no-match) tags "Research" ----------
  const B = await page.evaluate(async () => {
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 200));
    const rows = [...document.querySelectorAll('#docketResearchContainer .wish-item')];
    // The two seeded FAKE_NEEDS_QUEUE demo rows are real Docket queue
    // entries — genuine no-catalog-match research items.
    const queueRow = rows.find(r => /1932|1943/.test(r.textContent));
    return {
      found: !!queueRow,
      tagText: queueRow && queueRow.querySelector('.docket-tag') && queueRow.querySelector('.docket-tag').textContent,
      tagClass: queueRow && queueRow.querySelector('.docket-tag') && queueRow.querySelector('.docket-tag').className
    };
  });
  ok(B.found, "B0 sanity: a seeded Docket queue row renders in Research");
  ok(B.tagText === "Research", "B1 a real Docket queue entry is tagged \"Research\"");
  ok(/docket-tag-research/.test(B.tagClass || ""), "B2 ... with the research-specific tag class");

  // ---------- C. A coin draft marked ready (handed off) tags "Handed Off" ----------
  const C = await page.evaluate(async () => {
    const mock = createMockGraphClient({});
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-04001/coin.json",
      DRAFT({ collectionID: "AY-04001", description: "Handed Off Cent", status: "Ready for reconciliation" }));
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 250));
    const row = [...document.querySelectorAll('#docketResearchContainer .wish-item')]
      .find(r => /AY-04001/.test(r.textContent));
    const res = {
      found: !!row,
      tagText: row && row.querySelector('.docket-tag') && row.querySelector('.docket-tag').textContent,
      tagClass: row && row.querySelector('.docket-tag') && row.querySelector('.docket-tag').className
    };
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return res;
  });
  ok(C.found, "C0 sanity: the handed-off draft renders in Research");
  ok(C.tagText === "Handed Off", "C1 a coin draft marked ready is tagged \"Handed Off\"");
  ok(/docket-tag-handoff/.test(C.tagClass || ""), "C2 ... with the handoff-specific tag class");

  // ---------- D. A Complete Set draft also tags "Handed Off" ----------
  const D = await page.evaluate(async () => {
    const mock = createMockGraphClient({});
    __setGraphClientForTest(mock);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-04002/set.json", {
      type: "set", version: 1, collectionID: "AY-04002", setName: "Test Set",
      status: "Complete — pending research", children: [], expectedChildCount: 0,
      confirmedChildCount: 0, createdDate: new Date().toISOString(),
      wholeSetPhoto: true, dismissedGaps: []
    });
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 250));
    const row = [...document.querySelectorAll('#docketResearchContainer .wish-item')]
      .find(r => /AY-04002/.test(r.textContent));
    const res = {
      found: !!row,
      tagText: row && row.querySelector('.docket-tag') && row.querySelector('.docket-tag').textContent
    };
    __setGraphClientForTest(null);
    return res;
  });
  ok(D.found, "D0 sanity: the Complete Set draft renders in Research");
  ok(D.tagText === "Handed Off", "D1 a Complete Set draft (finished capture, pending research) is also tagged \"Handed Off\"");

  // ---------- E. Staging/Other rows never carry a Research-section tag ----------
  const E = await page.evaluate(async () => {
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 200));
    return {
      stagingTags: document.querySelectorAll('#docketStagingContainer .docket-tag').length,
      otherTags: document.querySelectorAll('#docketOtherContainer .docket-tag').length
    };
  });
  ok(E.stagingTags === 0 && E.otherTags === 0, "E1 the tag is scoped to Research-section rows only, not Staging/Other");

  // ---------- F. Nav smoke / no overflow ----------
  const F = await page.evaluate(() => {
    navigate('needsdbcoins');
    document.getElementById('docketResearchHeader').click();
    return { overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(F.overflow === false, "F1 no horizontal overflow at 412px with Research expanded and tags visible");
}, module);
