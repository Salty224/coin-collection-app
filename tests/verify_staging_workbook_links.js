// Staging Review: workbook link (once, near the top) + per-coin OneDrive
// folder link (per row) — live-testing item 3 of Ray's 4-item batch. See
// CLAUDE.md "Staging Review: workbook + per-coin folder links".

const { defineSuite } = require("./harness");

module.exports = defineSuite("staging-workbook-links", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  await page.evaluate(() => {
    window.DRAFT = (o) => Object.assign({
      type: "coin", version: 1, status: "Draft — awaiting review",
      denom: "1C", year: "1909", mint: "S", variety: "", description: "Test Coin",
      photos: [], createdDate: new Date().toISOString()
    }, o);
  });

  // ---------- A. Real drafts: page-level workbook link once, per-row folder links ----------
  const A = await page.evaluate(async () => {
    const mock = createMockGraphClient({});
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __resetWorkbookWebUrlCacheForTest();
    __resetFolderWebUrlCacheForTest();
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-02001/coin.json", DRAFT({ collectionID: "AY-02001", description: "First Coin" }));
    await mock.uploadJson(base + "/AY-02002/coin.json", DRAFT({ collectionID: "AY-02002", description: "Second Coin" }));
    await renderStagingList();
    await new Promise(r => setTimeout(r, 200));
    const rows = [...document.querySelectorAll('#stagingContainer .wish-item')];
    const folderLinks = rows.map(r => {
      const a = [...r.querySelectorAll('a')].find(a => /folder/i.test(a.textContent));
      return a ? a.getAttribute('href') : null;
    });
    const pageLinkHtml = document.getElementById('stagingWorkbookLinkRow').innerHTML;
    const pageLinkCountInWholeView = document.querySelectorAll('#view-staging a[href*="workbook"]').length;
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { rowCount: rows.length, folderLinks, pageLinkHtml, pageLinkCountInWholeView };
  });
  ok(A.rowCount === 2, "A0 sanity: both drafts rendered");
  ok(/Open workbook in Excel/.test(A.pageLinkHtml), "A1 the page-level workbook link renders once near the top of Staging Review");
  ok(A.pageLinkCountInWholeView === 1, "A2 the workbook link appears exactly ONCE in the whole view, not repeated per row");
  ok(A.folderLinks.length === 2 && A.folderLinks.every(Boolean), "A3 every real draft row gets its own OneDrive folder link");
  ok(A.folderLinks[0] !== A.folderLinks[1], "A4 the two rows' folder links genuinely differ (per-draft, not the same link twice)");
  ok(A.folderLinks.some(l => l.indexOf(encodeURIComponent("AY-02001")) !== -1) &&
     A.folderLinks.some(l => l.indexOf(encodeURIComponent("AY-02002")) !== -1),
    "A5 each row's folder link is actually derived from ITS OWN CollectionID's Staging folder path");

  // ---------- B. Mock (flag-off) rows: neither link shown, no crash ----------
  const B = await page.evaluate(async () => {
    __resetWorkbookWebUrlCacheForTest();
    __resetFolderWebUrlCacheForTest();
    await renderStagingList();
    await new Promise(r => setTimeout(r, 100));
    return {
      pageLinkEmpty: document.getElementById('stagingWorkbookLinkRow').innerHTML.trim() === "",
      anyFolderLink: !!document.querySelector('#stagingContainer a')
    };
  });
  ok(B.pageLinkEmpty, "B1 with the write layer off, the mock (FAKE_STAGING) path shows no workbook link");
  ok(!B.anyFolderLink, "B2 a mock row never shows a folder link either (no real Staging folder exists for it)");

  // ---------- C. Workbook link unavailable degrades to a note, not a broken link ----------
  const C = await page.evaluate(async () => {
    const mock = createMockGraphClient({ workbookWebUrl: null });
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __resetWorkbookWebUrlCacheForTest();
    __resetFolderWebUrlCacheForTest();
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-02003/coin.json", DRAFT({ collectionID: "AY-02003" }));
    await renderStagingList();
    await new Promise(r => setTimeout(r, 200));
    const res = {
      pageLinkEmpty: document.getElementById('stagingWorkbookLinkRow').innerHTML.trim() === "",
      noteShown: /unavailable/i.test(document.getElementById('stagingWorkbookNote').textContent)
    };
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    __resetWorkbookWebUrlCacheForTest();
    __resetFolderWebUrlCacheForTest();
    return res;
  });
  ok(C.pageLinkEmpty && C.noteShown, "C1 an unavailable workbook link shows an explanatory note, not a broken link");

  // ---------- D. Nav smoke / no overflow ----------
  const D = await page.evaluate(() => {
    navigate('needsdbcoins');
    navigate('staging');
    return { overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(D.overflow === false, "D1 no horizontal overflow at 412px");
}, module);
