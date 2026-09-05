// Docket layout redesign — the flat two-list hub ("Needs your action" /
// "Waiting on Copilot research") replaced by three collapsed-by-default
// sections: Staging, Awaiting Copilot Research, Other / Requires Photos.
// See CLAUDE.md "Docket: three collapsible sections".

const { defineSuite } = require("./harness");

module.exports = defineSuite("docket-sections", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // Page-side draft factory — defined inside the page so every
  // page.evaluate() below can build a realistic coin.json without repeating
  // the boilerplate. Status strings mirror COIN_DRAFT_STATUS exactly.
  await page.evaluate(() => {
    window.DRAFT = (o) => Object.assign({
      type: "coin", version: 1, status: "Draft — awaiting review",
      denom: "1C", year: "1909", mint: "S", variety: "", description: "Test Coin",
      photos: [], createdDate: new Date().toISOString()
    }, o);
  });

  // ---------- A. Structure ----------
  const A = await page.evaluate(() => {
    navigate('needsdbcoins');
    const headers = [...document.querySelectorAll('#view-needsdbcoins .accordion-header')];
    return {
      order: headers.map(h => h.querySelector('span').textContent.replace(/\s+\d+$/, '').trim()),
      collapsed: ['docketStagingBody', 'docketResearchBody', 'docketOtherBody']
        .map(id => document.getElementById(id).classList.contains('hidden')),
      // The old flat containers must be gone, not merely hidden.
      oldGone: !document.getElementById('needsActionContainer') && !document.getElementById('needsResearchContainer'),
      hasCounts: ['docketStagingCount', 'docketResearchCount', 'docketOtherCount'].every(id => !!document.getElementById(id))
    };
  });
  ok(JSON.stringify(A.order) === JSON.stringify(["Staging", "Awaiting Copilot Research", "Other / Requires Photos"]),
    "A1 three sections in the specified order: " + A.order.join(" | "));
  ok(A.collapsed.every(Boolean), "A2 all three sections collapsed by default");
  ok(A.oldGone, "A3 the old flat needsAction/needsResearch containers are removed, not just hidden");
  ok(A.hasCounts, "A4 every section header carries its own count element");

  const B = await page.evaluate(() => {
    navigate('needsdbcoins');
    document.getElementById('docketStagingHeader').click();
    const opened = !document.getElementById('docketStagingBody').classList.contains('hidden');
    const aria = document.getElementById('docketStagingHeader').getAttribute('aria-expanded');
    document.getElementById('docketStagingHeader').click();
    const reclosed = document.getElementById('docketStagingBody').classList.contains('hidden');
    return { opened, aria, reclosed };
  });
  ok(B.opened && B.aria === 'true', "A5 a section expands on click and reports aria-expanded");
  ok(B.reclosed, "A6 and collapses again on a second click");

  // ---------- C. Counts sum to the drawer badge ----------
  const C = await page.evaluate(async () => {
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 200));
    const n = id => Number(document.getElementById(id).textContent || "0");
    const badge = document.getElementById('needsAttentionBadge');
    const sum = n('docketStagingCount') + n('docketResearchCount') + n('docketOtherCount');
    const rowTotal = ['docketStagingContainer', 'docketResearchContainer', 'docketOtherContainer']
      .reduce((t, id) => t + document.getElementById(id).querySelectorAll('.wish-item').length, 0);
    return { sum, rowTotal, badge: Number(badge && badge.textContent || "0") };
  });
  ok(C.sum === C.badge, "C1 the three header counts sum to the Docket badge (" + C.sum + " vs " + C.badge + ")");
  ok(C.sum === C.rowTotal, "C2 each count equals the number of rows actually rendered in its section");

  // ---------- D. Bucketing with real coin drafts ----------
  const D = await page.evaluate(async () => {
    const mock = createMockGraphClient({});
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    // One catalog row so AY-01001 resolves and AY-01002 does not.
    __setLiveDbCoinsForTest([
      { denom: "1C", year: 1909, mint: "S", variety: "", description: "Lincoln Wheat Cent",
        finish: "", designation: "", coinId: "C-MATCH", pcgs: "", mintage: null, gsid: "" }
    ]);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-01001/coin.json",
      DRAFT({ collectionID: "AY-01001", description: "Matched Cent", coinId: "C-MATCH" }));
    await mock.uploadJson(base + "/AY-01002/coin.json",
      DRAFT({ collectionID: "AY-01002", description: "Unmatched Cent", year: "1799", coinId: "" }));
    await mock.uploadJson(base + "/AY-01003/coin.json",
      DRAFT({ collectionID: "AY-01003", description: "Handed Off Cent", status: "Ready for reconciliation" }));

    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 250));
    const staging = document.getElementById('docketStagingContainer').textContent;
    const research = document.getElementById('docketResearchContainer').textContent;
    const other = document.getElementById('docketOtherContainer').textContent;
    const stagingCount = Number(document.getElementById('docketStagingCount').textContent);
    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { staging, research, other, stagingCount };
  });
  ok(/AY-01001/.test(D.staging) && /AY-01002/.test(D.staging),
    "D1 every Draft-status coin gets its OWN row in Staging (no aggregate 'N coins' line)");
  ok(D.stagingCount === 2, "D2 the Staging count is the number of coins, not the number of aggregate rows");
  ok(/C-MATCH/.test(D.staging), "D3 a resolved draft's row shows its CoinID");
  ok(/CoinID pending/.test(D.staging), "D4 an unresolved draft's row says CoinID pending, inline");
  ok(!/AY-01002/.test(D.research),
    "D5 an unmatched staged coin is NOT also duplicated into Research (the old layout double-listed it)");
  ok(/AY-01003/.test(D.research) && !/AY-01003/.test(D.staging),
    "D6 a draft already marked ready moves to Research, out of Staging");
  ok(!/AY-0100/.test(D.other), "D7 no coin draft leaks into Other / Requires Photos");

  // ---------- E. Photo gaps live in Other; Set drafts live in Staging ----------
  const E = await page.evaluate(async () => {
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 200));
    const other = document.getElementById('docketOtherContainer').textContent;
    const staging = document.getElementById('docketStagingContainer').textContent;
    const research = document.getElementById('docketResearchContainer').textContent;
    return {
      photoInOther: /Missing photo/.test(other),
      photoNotElsewhere: !/Missing photo/.test(staging) && !/Missing photo/.test(research),
      dismissBtn: !!document.querySelector('#docketOtherContainer .docket-dismiss')
    };
  });
  ok(E.photoInOther, "E1 photo-gap rows render in Other / Requires Photos");
  ok(E.photoNotElsewhere, "E2 photo-gap rows appear in that section only");
  ok(E.dismissBtn, "E3 photo-gap rows keep their Dismiss action after the move");

  // ---------- F. Staging row still drills through to Staging Review ----------
  const F = await page.evaluate(async () => {
    const mock = createMockGraphClient({});
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-01010/coin.json", DRAFT({ collectionID: "AY-01010" }));
    navigate('needsdbcoins');
    await renderNeedsAttentionHub();
    await new Promise(r => setTimeout(r, 250));
    document.getElementById('docketStagingHeader').click();
    document.querySelector('#docketStagingContainer .wish-item').click();
    await new Promise(r => setTimeout(r, 200));
    const onStaging = document.getElementById('view-staging').classList.contains('active');
    __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { onStaging };
  });
  ok(F.onStaging, "F1 tapping a Staging row still drills through to the Staging Review page");

  // ---------- G. Mark-ready is advisory, with Re-check ----------
  const G = await page.evaluate(async () => {
    const mock = createMockGraphClient({});
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([]); // nothing matches yet
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-01020/coin.json",
      DRAFT({ collectionID: "AY-01020", description: "Pending Cent", coinId: "" }));
    await renderStagingList();
    await new Promise(r => setTimeout(r, 200));
    const row = document.querySelector('#stagingContainer .wish-item');
    const markReady = row.querySelector('.promote');
    const res = {
      flagShown: !!row.querySelector('.staging-pending-flag'),
      recheckShown: !!row.querySelector('.staging-recheck'),
      markReadyEnabled: !markReady.disabled,
      markReadyLabel: markReady.textContent
    };
    // Re-check with nothing in the catalog: must write nothing.
    row.querySelector('.staging-recheck').click();
    await new Promise(r => setTimeout(r, 200));
    res.guardShownOnZero = !document.getElementById('writeGuardOverlay').classList.contains('hidden');
    res.stillPending = !(await mock.getJson(base + "/AY-01020/coin.json")).coinId;
    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return res;
  });
  ok(G.flagShown, "G1 a CoinID-pending draft is flagged in Staging Review");
  ok(G.recheckShown, "G2 ... and offered a Re-check button");
  ok(G.markReadyEnabled && G.markReadyLabel === 'Mark ready',
    "G3 Mark ready stays ENABLED — advisory, not hard-blocked (a new variety may never get a CoinID)");
  ok(G.guardShownOnZero === false, "G4 Re-check with zero candidates opens no dialog");
  ok(G.stillPending, "G5 Re-check with zero candidates writes nothing");

  const H = await page.evaluate(async () => {
    const mock = createMockGraphClient({});
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setLiveDbCoinsForTest([
      { denom: "1C", year: 1909, mint: "S", variety: "", description: "Lincoln Wheat Cent",
        finish: "", designation: "", coinId: "C-LATE-ADD", pcgs: "", mintage: null, gsid: "" }
    ]);
    const base = writePaths().stagingBase;
    await mock.uploadJson(base + "/AY-01030/coin.json",
      DRAFT({ collectionID: "AY-01030", description: "Now Matchable", coinId: "" }));
    await renderStagingList();
    await new Promise(r => setTimeout(r, 200));
    document.querySelector('#stagingContainer .staging-recheck').click();
    await new Promise(r => setTimeout(r, 200));
    const dialogShown = !document.getElementById('writeGuardOverlay').classList.contains('hidden');
    const beforeConfirm = (await mock.getJson(base + "/AY-01030/coin.json")).coinId;
    // Confirm ("Link CoinID") is the primary button in the guard dialog.
    [...document.querySelectorAll('#writeGuardBtns button')]
      .find(b => /Link CoinID/.test(b.textContent)).click();
    await new Promise(r => setTimeout(r, 300));
    const after = await mock.getJson(base + "/AY-01030/coin.json");
    __setLiveDbCoinsForTest(null); __setAddCoinWriteEnabledForTest(null); __setGraphClientForTest(null);
    return { dialogShown, beforeConfirm, coinId: after.coinId, how: after.matchedHow };
  });
  ok(H.dialogShown, "H1 Re-check with one candidate opens a confirmation dialog");
  ok(H.beforeConfirm === "", "H2 ... and writes nothing until it is confirmed");
  ok(H.coinId === 'C-LATE-ADD', "H3 confirming writes the resolved CoinID onto the draft");
  ok(H.how === 'recheck', "H4 provenance records that the link came from a later re-check, not capture");

  // ---------- I. Nav smoke, no overflow ----------
  const I = await page.evaluate(() => {
    const routes = ["dashboard", "browse", "albums", "sets", "wishlist", "stats", "acquisitions",
      "needsdbcoins", "staging", "addcoin", "addset", "inprogresssets"];
    const bad = [];
    routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    navigate('needsdbcoins');
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(I.bad.length === 0, "I1 every route still navigates cleanly: " + I.bad.join("; "));
  ok(I.overflow === false, "I2 no horizontal page overflow at 412px");
}, module);
