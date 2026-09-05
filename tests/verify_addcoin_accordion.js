// Add Coin accordion restructure — the long flat form rebuilt to mirror
// Edit Coin / Browse detail section-for-section, with a bounded
// Grading & Certification section first and no drill-down subviews.
// See CLAUDE.md "Add Coin: accordion restructure".

const { defineSuite } = require("./harness");

module.exports = defineSuite("addcoin-accordion", async ({ ok, openApp, PHONE, TABLET }) => {
  const page = await openApp(PHONE);

  // ---------- A. Section structure ----------
  const A = await page.evaluate(() => {
    navigate('addcoin');
    const hs = [...document.querySelectorAll('#view-addcoin .accordion-header')];
    return {
      order: hs.map(h => h.querySelector('span').textContent.trim()),
      expanded: hs.map(h => h.getAttribute('aria-expanded')),
      // The drill-down subviews and their summary rows must be GONE, not hidden.
      subviewsGone: !document.getElementById('addCoinPurchaseView') &&
                    !document.getElementById('addCoinStorageView') &&
                    !document.getElementById('purchaseInfoRow') &&
                    !document.getElementById('storageAlbumRow'),
      fnsRetired: typeof showAddCoinSubview === 'undefined' && typeof updateFormRowSummaries === 'undefined'
    };
  });
  // "Grading & Certification" was renamed to "Identification" in a later
  // pass (it grew beyond PCGS decode alone — Mint Item Number and GSID
  // lookups joined it) -- following the real design change, not weakened.
  ok(JSON.stringify(A.order) === JSON.stringify(
      ["Identification", "Overview", "Photos", "Notes & Facts", "Purchase Details", "Storage"]),
    "A1 sections in RECORD_SECTIONS order with Identification first: " + A.order.join(" | "));
  ok(!A.order.includes("Specifications"),
    "A2 no Specifications section — composition/weight/diameter belong in DB_Coins, not Add Coin");
  ok(JSON.stringify(A.expanded) === JSON.stringify(["false", "true", "false", "false", "false", "false"]),
    "A3 Overview opens by default, every other section collapsed (matches Edit Coin)");
  ok(A.subviewsGone, "A4 the Purchase/Storage drill-down cards and their summary rows are removed from the DOM");
  ok(A.fnsRetired, "A5 showAddCoinSubview() and updateFormRowSummaries() are retired, not left dangling");

  // ---------- B. Field homes ----------
  const B = await page.evaluate(() => {
    navigate('addcoin');
    const inSection = (bodyId, fieldId) => !!document.querySelector('#' + bodyId + ' #' + fieldId);
    return {
      grading: ['addCoinGrader', 'pcgsLabelInput', 'certTypeNumber'].every(f => inSection('addCoinGradingBody', f)),
      overview: ['denomination', 'addCoinBullionToggle', 'year', 'mintMark', 'description', 'varietySelect',
                 'finish', 'gradeFrom', 'gradeSource', 'designation', 'errorSelect']
                 .every(f => inSection('addCoinOverviewBody', f)),
      photos: ['photoToggle', 'obversePhotoBox', 'reversePhotoBox', 'addCoinGallery']
                 .every(f => inSection('addCoinPhotosBody', f)),
      notes: inSection('addCoinNotesBody', 'notesField'),
      purchase: ['purchasePrice', 'shippingCost', 'purchaseDate', 'vendor', 'receiptPreview']
                 .every(f => inSection('addCoinPurchaseBody', f)),
      storage: ['storageLocation', 'container', 'assignAlbum'].every(f => inSection('addCoinStorageBody', f)),
      // The match-count indicator moved out of the save area into Overview,
      // directly under the identity fields that produce it.
      matchBannersInOverview: ['dbMatchBanner', 'dbNoMatchBanner', 'dbAmbiguousBanner']
                 .every(f => inSection('addCoinOverviewBody', f)),
      // Save controls stay OUTSIDE every accordion — they act on the whole form.
      saveOutside: !document.querySelector('#view-addcoin .accordion-body #saveToStagingBtn') &&
                   !!document.getElementById('saveToStagingBtn')
    };
  });
  ok(B.grading, "B1 Grading & Certification holds the grader, PCGS label and cert-number fields");
  ok(B.overview, "B2 Overview holds every identity/grade field, including Error and Finish");
  ok(B.photos, "B3 Photos holds the obverse/reverse toggle, both photo boxes and the gallery");
  ok(B.notes, "B4 Notes & Facts holds the Notes textarea (Fun Fact is DB_Coins catalog data, not captured here)");
  ok(B.purchase, "B5 Purchase Details holds price/shipping/date/vendor/receipt, inline");
  ok(B.storage, "B6 Storage holds storage location, container and Assign to Album");
  ok(B.matchBannersInOverview, "B7 the catalog match-count indicator now lives in Overview, under the identity fields");
  ok(B.saveOutside, "B8 the save buttons stay outside the accordions");

  // ---------- C. Grading sits ahead of Denomination ----------
  const C = await page.evaluate(() => {
    navigate('addcoin');
    const grader = document.getElementById('addCoinGrader');
    const denom = document.getElementById('denomination');
    const toggle = document.getElementById('addCoinBullionToggle');
    const year = document.getElementById('year');
    return {
      graderFirst: !!(grader.compareDocumentPosition(denom) & Node.DOCUMENT_POSITION_FOLLOWING),
      // Batch 7's placement must survive the restructure.
      toggleAfterSelect: !!(denom.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING),
      toggleBeforeYear: !!(toggle.compareDocumentPosition(year) & Node.DOCUMENT_POSITION_FOLLOWING)
    };
  });
  ok(C.graderFirst, "C1 Grading Service still precedes Denomination — the decode has to run before identity is filled");
  ok(C.toggleAfterSelect && C.toggleBeforeYear,
    "C2 batch 7's Bullion-toggle placement (under the Denomination dropdown, above Year) survives the restructure");

  // ---------- D. Expand / collapse / reset ----------
  const D = await page.evaluate(() => {
    navigate('addcoin');
    document.getElementById('addCoinPurchaseHeader').click();
    const opened = !document.getElementById('addCoinPurchaseBody').classList.contains('hidden');
    const aria = document.getElementById('addCoinPurchaseHeader').getAttribute('aria-expanded');
    document.getElementById('addCoinOverviewHeader').click();
    const overviewClosed = document.getElementById('addCoinOverviewBody').classList.contains('hidden');
    // Leaving and re-entering must restore the defaults, same rule live-run
    // bug #1 established for the fields themselves.
    navigate('dashboard'); navigate('addcoin');
    return {
      opened, aria, overviewClosed,
      purchaseReset: document.getElementById('addCoinPurchaseBody').classList.contains('hidden'),
      overviewReset: !document.getElementById('addCoinOverviewBody').classList.contains('hidden')
    };
  });
  ok(D.opened && D.aria === 'true', "D1 a collapsed section opens on click with aria-expanded set");
  ok(D.overviewClosed, "D2 Overview can be collapsed too");
  ok(D.purchaseReset && D.overviewReset, "D3 re-entering Add Coin resets sections to their default open/closed state");

  // ---------- E. Behaviour survives the move ----------
  const E = await page.evaluate(() => {
    navigate('addcoin');
    // Identity fields drive the live flip labels, which live in the
    // COLLAPSED Photos section now. Add Coin's own updateFlipLabels() uses
    // plain textContent (it never calls the scrollWidth-measuring
    // renderTypeDenomCorner()), so a hidden subtree can't break it — this
    // pins that down rather than leaving it to be re-discovered.
    document.getElementById('denomination').value = '10C';
    document.getElementById('year').value = '1916';
    document.getElementById('mintMark').value = 'D';
    document.getElementById('denomination').dispatchEvent(new Event('change'));
    const labelsWhileCollapsed = {
      tl: document.getElementById('flipObverseTL').textContent,
      tr: document.getElementById('flipObverseTR').textContent
    };
    document.getElementById('addCoinPhotosHeader').click();
    const labelsAfterOpen = {
      tl: document.getElementById('flipObverseTL').textContent,
      tr: document.getElementById('flipObverseTR').textContent
    };
    // The series picker and match banners still react from inside Overview.
    checkDbCoinsMatch();
    const bannerVisible = ['dbMatchBanner', 'dbNoMatchBanner', 'dbAmbiguousBanner']
      .some(id => !document.getElementById(id).classList.contains('hidden'));
    return { labelsWhileCollapsed, labelsAfterOpen, bannerVisible };
  });
  ok(E.labelsWhileCollapsed.tl === '1916-D' && E.labelsWhileCollapsed.tr === '10C',
    "E1 flip-card corner labels still populate correctly while the Photos section is collapsed");
  ok(JSON.stringify(E.labelsAfterOpen) === JSON.stringify(E.labelsWhileCollapsed),
    "E2 ... and are unchanged once it is expanded (no hidden-measurement dependency)");
  ok(E.bannerVisible, "E3 the match indicator still reacts to identity edits from its new Overview home");

  // A real save must still collect fields out of collapsed sections.
  const F = await page.evaluate(async () => {
    __setLiveDbCoinsForTest([]);
    navigate('addcoin');
    document.getElementById('denomination').value = '10C';
    document.getElementById('year').value = '1916';
    document.getElementById('mintMark').value = 'D';
    document.getElementById('description').value = 'Mercury Dime';
    // These three sit in sections that are COLLAPSED right now.
    document.getElementById('notesField').value = 'Bought at a show';
    document.getElementById('purchasePrice').value = '45.50';
    document.getElementById('storageLocation').value = 'Safe';
    checkDbCoinsMatch();
    const before = FAKE_STAGING.length;
    // Read the draft shape too: the in-memory FAKE_STAGING row comes from
    // buildCoinRecordFromForm(), which has no Notes field at all (Notes only
    // ever reaches the durable coin.json draft, as `notes`), so covering
    // Notes means checking the draft reader rather than the mock row.
    const draftShape = readAddCoinFormForDraft();
    await new Promise(r => { saveAddCoinForm('staging'); setTimeout(r, 400); });
    const row = FAKE_STAGING[FAKE_STAGING.length - 1];
    __setLiveDbCoinsForTest(null);
    return { added: FAKE_STAGING.length - before, row, draftShape };
  });
  ok(F.added === 1, "F1 a save still completes with the form in accordion form");
  ok(F.row && Number(F.row.cost) === 45.5 && F.row.storageLocation === 'Safe',
    "F2 fields inside COLLAPSED sections are still collected by the save");
  ok(F.draftShape.notes === 'Bought at a show' && Number(F.draftShape.cost) === 45.5 &&
     F.draftShape.storageLocation === 'Safe',
    "F3 the durable-draft reader also picks up every collapsed-section field, Notes included");

  // ---------- G. Layout ----------
  for (const [name, vp] of [["phone", PHONE], ["tablet", TABLET]]) {
    const p = await openApp(vp);
    const G = await p.evaluate(() => {
      navigate('addcoin');
      ['addCoinGradingHeader', 'addCoinPhotosHeader', 'addCoinNotesHeader',
       'addCoinPurchaseHeader', 'addCoinStorageHeader'].forEach(id => document.getElementById(id).click());
      return {
        overflow: document.body.scrollWidth > window.innerWidth,
        allOpen: [...document.querySelectorAll('#view-addcoin .accordion-body')]
          .every(b => !b.classList.contains('hidden'))
      };
    });
    ok(G.allOpen, "G1 every section expands (" + name + ")");
    ok(G.overflow === false, "G2 no horizontal overflow with every section open (" + name + ")");
    await p.close();
  }

  // ---------- H. Nav smoke ----------
  const H = await page.evaluate(() => {
    const routes = ["dashboard", "browse", "albums", "sets", "wishlist", "stats", "acquisitions",
      "needsdbcoins", "staging", "addcoin", "addset", "inprogresssets"];
    const bad = [];
    routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    navigate('addcoin');
    return { bad };
  });
  ok(H.bad.length === 0, "H1 every route still navigates cleanly: " + H.bad.join("; "));
}, module);
