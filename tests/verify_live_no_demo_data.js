// No demo data on real coins in a live session (Ray's rule, 2026-10-04).
//
// The demo lookups keyed by CollectionID — FAKE_COIN_DETAILS, FAKE_GALLERIES,
// FAKE_SET_FACTS, FAKE_SET_CHILDREN, COMBINED_PHOTO_COIN_IDS — collide with
// real ids. Found live on AY-00001, a real 1787 Fugio cent with blank
// Seller/PurchaseDate/Receipt/Remarks, which showed the demo Morgan's Fun
// Fact, a demo "yours" note and a demo PCGS slab + COA in place of its three
// real Photos rows. These assertions build REAL-shaped coins on exactly those
// colliding ids, with blank workbook fields, and check that a live session
// shows none of the demo content while the offline mockup still shows it.

const { defineSuite } = require("./harness");

module.exports = defineSuite("live-no-demo-data", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // Real-shaped live rows on every colliding demo id, workbook fields blank.
  await page.evaluate(() => {
    const blank = { vendor: "", purchaseDate: "", receiptFile: "", remarks: "", shippingCost: null,
      cost: 0, value: 0, gradeSource: "", serNo: "", designation: "", storageLocation: "", container: "",
      category: "", rollId: "", setId: "", originSetId: "", coinId: "", status: "Owned", finish: "" };
    const row = (o) => Object.assign({}, blank, o);
    window.__LIVE = [
      row({ id: "AY-00001", name: "Fugio Cent", description: "Fugio Cent", denom: "1C", year: 1787, mint: "", variety: "Newman 15-H", grade: "VF-30" }),
      row({ id: "AY-00003", name: "Lincoln Cent", denom: "1C", year: 1960, mint: "D", grade: "MS-63" }),
      row({ id: "AY-00006", name: "Jefferson Nickel", denom: "5C", year: 1950, mint: "", grade: "MS-64" }),
      row({ id: "AY-00007", name: "Washington Quarter", denom: "25C", year: 1965, mint: "", grade: "MS-63" }),
      row({ id: "AY-00010", name: "Roosevelt Dime", denom: "10C", year: 1955, mint: "", grade: "MS-65" }),
      row({ id: "AY-00014", name: "Kennedy Half", denom: "50C", year: 1964, mint: "", grade: "MS-64" }),
      // Real Sets on the demo Set ids. A real parent Set carries no
      // OriginSetID — but AY-00022 is given the DEMO key on purpose, so the
      // gate itself is what has to stop the demo children, not the blank.
      row({ id: "AY-00022", name: "1999 Proof Set", denom: "Multiple", year: 1999, originSetId: "OS-1986-STL-01" }),
      row({ id: "AY-00025", name: "2004 Mint Set", denom: "Multiple", year: 2004, originSetId: "OS-2026-BOM-01" }),
      // A real coin carrying the setId demo AY-00012 uses, with no live Set to match.
      row({ id: "AY-90100", name: "Washington Quarter", denom: "25C", year: 2021, mint: "S", setId: "S-2021-SP-01" }),
      // A real coin + a real Set sharing a real setId.
      row({ id: "AY-90110", name: "Kennedy Half", denom: "50C", year: 2010, mint: "S", setId: "S-2010-PR-01" }),
      row({ id: "AY-90120", name: "2010 Proof Set", denom: "Multiple", year: 2010, setId: "S-2010-PR-01" }),
      // A real Set for the session-only link check.
      row({ id: "AY-90300", name: "1965 SMS", denom: "Multiple", year: 1965 }),
      row({ id: "AY-90310", name: "Kennedy Half", denom: "50C", year: 1965, mint: "" })
    ];
    window.__PHOTOS = buildPhotoIndex([
      { PhotoID: "PH-10001", CollectionID: "AY-00001", PhotoType: "Obverse", SubGroupID: "", Filename: "AY-00001_obverse.jpg", Label: "", DateAdded: 46000 },
      { PhotoID: "PH-10002", CollectionID: "AY-00001", PhotoType: "Reference", SubGroupID: "", Filename: "AY-00001_reference_01.jpg", Label: "PCGS TrueView composite", DateAdded: 46000 },
      { PhotoID: "PH-10003", CollectionID: "AY-00001", PhotoType: "Reverse", SubGroupID: "", Filename: "AY-00001_reverse.jpg", Label: "", DateAdded: 46000 }
    ]);
    window.__resetGallery = () => { Object.keys(galleryStore).forEach(k => delete galleryStore[k]); };
    window.__goLive = () => {
      __setLiveDataModeForTest("live");
      __setLiveCoinsForTest(window.__LIVE.map(c => Object.assign({}, c)));
      __setLiveDbCoinsForTest([]);          // no catalog match: forces the Fun Fact fallback path
      __setStoredPhotosForTest(window.__PHOTOS);
      __setStoredReceiptsForTest({});
      window.__resetGallery();
    };
    window.__goOffline = () => {
      __setLiveDataModeForTest("offline");
      __setLiveCoinsForTest(null);
      __setLiveDbCoinsForTest(null);
      __setStoredPhotosForTest(null);
      __setStoredReceiptsForTest(null);
      window.__resetGallery();
    };
    window.__coin = (id) => activeCoins().find(c => c.id === id);
    window.__detailText = (id) => { showBrowseDetail(window.__coin(id)); return document.getElementById("detailAccordions").textContent; };
  });

  // ---------- A. AY-00001 detail page in a live session ----------
  const A = await page.evaluate(() => {
    window.__goLive();
    const text = window.__detailText("AY-00001");
    const thumbs = Array.from(document.querySelectorAll("#detailAccordions .gc-thumb .gc-type")).map(e => e.textContent);
    openGalleryViewer("AY-00001", "Fugio — photos");
    const caps = Array.from(document.querySelectorAll("#galleryViewerGrid .gv-cap")).map(e => e.textContent);
    closeGalleryViewer();
    return { text, thumbs, caps };
  });
  ok(!/Carson City/.test(A.text), "A1 no demo Fun Fact (Carson City Morgans) on the real Fugio cent", A.text.slice(0, 200));
  ok(!/Bought at auction/.test(A.text), "A2 no demo 'yours' note");
  ok(!/Heritage Auctions/.test(A.text), "A3 no demo Seller");
  ok(!/2019-03-14/.test(A.text), "A4 no demo Purchase Date");
  ok(!/\$12\.50/.test(A.text), "A5 no demo Shipping figure");
  ok(!/AY-00001_receipt/.test(A.text), "A6 no demo Receipt");
  ok(A.thumbs.length === 1 && A.thumbs[0] === "Reference photo", "A7 the Photos strip shows the real Reference row (flip covers obverse/reverse) and nothing else", A.thumbs);
  ok(!A.thumbs.some(t => /Slab|COA/.test(t)), "A8 no demo Slab / COA tiles in the strip");
  ok(A.caps.length === 3, "A9 the viewer lists exactly the three real Photos rows", A.caps);
  ok(A.caps.some(c => /PCGS TrueView composite/.test(c)), "A10 the real Reference label shows in the viewer");
  ok(!A.caps.some(c => /12345678|Slab|COA/.test(c)), "A11 no demo slab/COA captions in the viewer");

  // ---------- B. Edit Coin on AY-00001 (session-only path, write layer off) ----------
  const B = await page.evaluate(() => {
    window.__goLive();
    __setBrowseEditWriteEnabledForTest(false);
    const coin = window.__coin("AY-00001");
    showBrowseDetail(coin);
    showBrowseEditView(coin);
    const out = {
      notes: document.getElementById("browseEditNotes").value,
      vendor: document.getElementById("browseEditVendor").value,
      date: document.getElementById("browseEditPurchaseDate").value,
      ship: document.getElementById("browseEditShippingCost").value,
      funFact: document.getElementById("browseEditFunFact").textContent
    };
    __setBrowseEditWriteEnabledForTest(null);
    return out;
  });
  ok(B.notes === "" && B.vendor === "" && B.date === "" && B.ship === "", "B1 Edit Coin prefills no demo Notes/Seller/Date/Shipping", B);
  ok(!/Carson City/.test(B.funFact), "B2 Edit Coin's read-only Fun Fact shows no demo text", B.funFact);

  // ---------- C. Every other colliding demo id ----------
  const C = await page.evaluate(() => {
    window.__goLive();
    const out = {};
    ["AY-00003", "AY-00006", "AY-00010", "AY-00014", "AY-00022", "AY-00025"].forEach(id => {
      out[id] = window.__detailText(id);
      out[id + "_tiles"] = document.querySelectorAll("#detailAccordions .gc-thumb").length;
    });
    out.children22 = setChildrenFor(window.__coin("AY-00022")).length;
    out.children25 = setChildrenFor(window.__coin("AY-00025")).length;
    out.childRows22 = (function () { showBrowseDetail(window.__coin("AY-00022")); return document.querySelectorAll("#detailAccordions .set-child-row, #detailAccordions .wish-item").length; })();
    return out;
  });
  ok(!/Local coin shop|264,000/.test(C["AY-00003"]), "C1 AY-00003 shows no demo seller / Fun Fact");
  ok(!/coinguy88|Priced high/.test(C["AY-00006"]), "C2 AY-00006 shows no demo seller / note");
  ok(!/GreatCollections|cameo contrast|\$6\.00/.test(C["AY-00010"]), "C3 AY-00010 shows no demo seller / Fun Fact / shipping");
  ok(C["AY-00014_tiles"] === 0 && C["AY-00022_tiles"] === 0, "C4 AY-00014 and AY-00022 render no demo gallery tiles (OGP / COA / sub-group)", [C["AY-00014_tiles"], C["AY-00022_tiles"]]);
  ok(!/U\.S\. Mint|Statue of Liberty|\$6\.50|500,000|Coins in Set|Presentation case/.test(C["AY-00022"]),
    "C5 AY-00022 shows no demo seller, Fun Fact, Set facts, child count or gallery", C["AY-00022"].slice(0, 300));
  ok(!/\$0\.91|250,000|Coins in Set/.test(C["AY-00025"]), "C6 AY-00025 shows no demo Set facts / child count");
  ok(C.children22 === 0 && C.children25 === 0, "C7 a real Set carrying a demo originSetId gets no demo children", [C.children22, C.children25]);

  // ---------- D. Linkage, ownership and the other id-keyed demo markers ----------
  const D = await page.evaluate(() => {
    window.__goLive();
    const noSet = resolveCoinSetLink(window.__coin("AY-90100"));
    const realSet = resolveCoinSetLink(window.__coin("AY-90110"));
    showBrowseDetail(window.__coin("AY-90100"));
    const chipText = document.getElementById("detailAccordions").textContent;
    const ownDemoChild = photoCommitTargetId("AY-00022-A");
    const ownReal = photoCommitTargetId("AY-00001");
    showBrowseDetail(window.__coin("AY-00007"));
    const badgeHidden = document.getElementById("browseDetailCombinedBadge").classList.contains("hidden");
    // Session-only linking (write layer off) still works in live mode.
    __setSetLinkWriteEnabledForTest(false);
    const parent = window.__coin("AY-90300");
    linkCoinToSet(parent, "AY-90310");
    const sessionKids = setChildrenFor(parent).map(c => c.id);
    __setSetLinkWriteEnabledForTest(null);
    return { noSet: noSet && noSet.id, realSet: realSet && realSet.id, chipText, ownDemoChild, ownReal, badgeHidden, sessionKids };
  });
  ok(D.noSet === null, "D1 resolveCoinSetLink() no longer finds demo AY-00018 for a real coin with its setId", D.noSet);
  ok(!/2021 Silver Proof Set/.test(D.chipText), "D2 the Belongs-to chip names no demo Set");
  ok(D.realSet === "AY-90120", "D3 resolveCoinSetLink() finds the real live Set sharing the setId", D.realSet);
  ok(D.ownDemoChild === null, "D4 a demo Set child id is not treated as an owned record in live mode", D.ownDemoChild);
  ok(D.ownReal === "AY-00001", "D5 a real coin still commits photos directly");
  ok(D.badgeHidden === true, "D6 real AY-00007 gets no demo 'combined photo' badge");
  ok(D.sessionKids.length === 1 && D.sessionKids[0] === "AY-90310", "D7 session-only Set linking still shows its child in live mode", D.sessionKids);

  // ---------- E. Main fallbacks before live data loads ----------
  const E = await page.evaluate(() => {
    window.__goLive();
    __setLiveCoinsForTest(null);
    __setLiveDbCoinsForTest(null);
    const out = {
      coins: activeCoins().length, owned: ownedCoins().length, dbSets: activeDbSets().length,
      dbCoins: activeDbCoins().length, graders: activeLookupGraders().length,
      metal: Object.keys(metalContentFor({ id: "AY-00002", denom: "1C", year: 1909 })).length
    };
    const errs = [];
    const tryIt = (name, fn) => { try { fn(); } catch (e) { errs.push(name + ": " + e.message); } };
    tryIt("browse", () => navigate("browse"));
    out.gridCards = document.querySelectorAll("#browseGrid .coin-card").length;
    tryIt("sets", () => navigate("sets"));
    tryIt("stats", () => navigate("stats"));
    out.statsTotal = (document.getElementById("statsTotalItems") || {}).textContent;
    tryIt("spotlight", () => renderSpotlight());
    tryIt("dashboard", () => navigate("dashboard"));
    tryIt("addcoin", () => { navigate("addcoin"); checkDbCoinsMatch(); });
    tryIt("hub", () => renderNeedsAttentionHub());
    out.errs = errs;
    return out;
  });
  ok(E.coins === 0 && E.owned === 0, "E1 activeCoins()/ownedCoins() are empty in live mode before the real All sheet lands", E);
  ok(E.dbSets === 0 && E.dbCoins === 0, "E2 activeDbSets()/activeDbCoins() are empty in live mode before load (no demo catalog to mis-link against)");
  ok(E.graders > 0, "E3 activeLookupGraders() keeps its static reference fallback (the cert-protection guard depends on it)");
  ok(E.metal === 0, "E4 metalContentFor() gives a live coin no demo specs even before LIVE_COINS loads");
  ok(E.gridCards === 0, "E5 Catalog renders no demo coins in live mode before load", E.gridCards);
  ok(E.errs.length === 0, "E6 every screen renders without throwing on the empty live lists", E.errs);

  // ---------- F. Offline mockup is unchanged ----------
  const F = await page.evaluate(() => {
    window.__goOffline();
    const text = window.__detailText("AY-00001");
    const kids = setChildrenFor(FAKE_COINS.find(c => c.id === "AY-00022")).length;
    const setText = window.__detailText("AY-00022");
    return {
      text, kids, setText, same: activeCoins() === FAKE_COINS, dbc: activeDbCoins() === FAKE_DB_COINS,
      slab: galleryFor("AY-00001").some(e => e.type === "slab_obverse"),
      setLink: (resolveCoinSetLink(FAKE_COINS.find(c => c.id === "AY-00012")) || {}).id
    };
  });
  ok(/Carson City/.test(F.text) && /Heritage Auctions/.test(F.text), "F1 the offline mockup still shows the demo Fun Fact and Seller");
  ok(F.slab, "F2 the offline mockup still seeds the demo gallery");
  ok(F.kids === 3 && /\$6\.50/.test(F.setText), "F3 the offline mockup still shows demo Set children and facts", F.kids);
  ok(F.same && F.dbc, "F4 offline, activeCoins()/activeDbCoins() are still the demo arrays");
  ok(F.setLink === "AY-00018", "F5 offline, the demo Belongs-to Set link still resolves", F.setLink);

  // ---------- G. A gallery seeded before going live is cleaned in place ----------
  const G = await page.evaluate(() => {
    window.__goOffline();
    const list = galleryFor("AY-00001");
    const before = list.length;
    __setLiveDataModeForTest("live");
    const after = galleryFor("AY-00001");
    const res = { before, after: after.length, same: after === list };
    window.__goOffline();
    return res;
  });
  ok(G.before === 3 && G.after === 0 && G.same, "G1 demo-seeded entries are stripped from the SAME array once the session is live", G);

  // ---------- H. The photo viewer can always be closed ----------
  const H = await page.evaluate(async () => {
    window.__goLive();
    openGalleryViewer("AY-00001", "Fugio — photos");
    const overlay = document.getElementById("galleryViewerOverlay");
    const panel = overlay.querySelector(".photo-adjust-panel");
    const cells = Array.from(overlay.querySelectorAll(".gv-cell .gc-img")).map(e => Math.round(e.getBoundingClientRect().height));
    const panelTop = panel.getBoundingClientRect().top;
    const tall = panel.getBoundingClientRect().height > window.innerHeight;
    overlay.scrollTop = overlay.scrollHeight;
    await new Promise(r => setTimeout(r, 30));
    const btn = document.getElementById("galleryViewerCloseBtn").getBoundingClientRect();
    const btnReachable = btn.top >= 0 && btn.bottom <= window.innerHeight;
    document.getElementById("galleryViewerCloseBtn").click();
    const closedByButton = overlay.classList.contains("hidden");
    openGalleryViewer("AY-00001", "x");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    const closedByEscape = overlay.classList.contains("hidden");
    openGalleryViewer("AY-00001", "x");
    panel.click();
    const staysOpenOnPanel = !overlay.classList.contains("hidden");
    overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const closedByBackdrop = overlay.classList.contains("hidden");
    return { cells, panelTop, tall, btnReachable, closedByButton, closedByEscape, staysOpenOnPanel, closedByBackdrop };
  });
  ok(H.tall, "H1 three photos (none with a fetched image) make the viewer taller than a phone screen — the trigger needs no missing-file demo entry", H);
  ok(H.cells.length === 3 && H.cells.every(h => h === H.cells[0]), "H2 a cell with no image is the same height as any other — a real row whose file is missing triggers it too", H.cells);
  ok(H.panelTop >= 0, "H3 the panel's top is on screen (no longer centred off the top)", H.panelTop);
  ok(H.btnReachable, "H4 scrolling the overlay brings the Close button onto the screen");
  ok(H.closedByButton, "H5 Close closes it");
  ok(H.closedByEscape, "H6 Escape closes it");
  ok(H.staysOpenOnPanel, "H7 a tap inside the panel does not close it");
  ok(H.closedByBackdrop, "H8 a tap on the dimmed backdrop closes it");

  await page.evaluate(() => { window.__goOffline(); __setLiveDataModeForTest(null); });
}, module);
