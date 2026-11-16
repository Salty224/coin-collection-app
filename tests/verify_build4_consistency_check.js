// Build 4 of the November 2026 review: B7, the read-only consistency check
// (Docket > "Check files and rows"), with A19's check (rows whose
// CollectionID is not on All). Plan: docs/REVIEW_BUILD_PLAN_2026-11.md
// "Build 4 full plan"; write-up: docs/ref/DOCKET_STAGING.md
// "Consistency check (B7, Build 4)".
//
//   SELF the shared check helper's must-fail self-check
//   K1  a clean collection: every section "None found.", "No problems
//       found.", "Nothing was changed."
//   K2  one case of each kind of problem, seeded alone: exactly one line, in
//       its own section, naming its ids, file and row (E4); a file name that
//       differs only in letter case is NOT a problem
//   K3  kept originals beside their crop (_original.jpg, _original_02.png)
//       are counted, never listed; an original whose crop has no row is
//       listed
//   K4  receipts: a shared receipt (one ReceiptID, one file, two coins) and
//       Binder rows give no line; one ReceiptID naming two files does; two
//       rows for a Former Holdings coin do
//   K5  A19: the next id is max(All, Staging) + 1; a row for an id at or
//       above it "has not been handed out yet", below it "will not be handed
//       out again"; a child id on All gives no line
//   K6  Staging: odd names, an empty AY folder, an open draft whose coin is
//       on All, files still in Staging after a Promote, an open Set draft on
//       All, a Set draft whose photos list names a missing file, and one with
//       no photos list (saved before the B-1 fix; shown, not counted)
//   K7  paging on the REAL client (stubbed fetch, 2,500 files in 3 pages): a
//       no-row file on page 3 is found; a page 2 that fails gives "Could not
//       check" (never "None found") and "Incomplete"
//   K8  every read failing in turn, then every read getting no answer: the
//       parts that needed it say "Could not check", the others still report,
//       the summary says "Incomplete"
//   K9  read-only: a whole run calls no write method of the client, makes no
//       Excel session, never deletes the saved copy; the read-only view
//       throws on a write method
//   K10 refused while a save runs (nothing read); a save that runs during
//       the check is named; a double tap runs once
//   K11 Copy equals the screen (cap lifted); the screen caps a group at 20
//       with "and N more", Copy has every line
//   K12 the accordion sits between "Other / Requires Photos" and About; a
//       run with findings changes no Docket count; a 200-character file
//       name does not make the page scroll sideways at 384 px
//   K13 3,000 files and 1,500 rows compare in under 1 s

const { defineSuite } = require("./harness");

module.exports = defineSuite("build4-consistency-check", async ({ check, selfCheck, openApp }) => {
  const ok = check; selfCheck(ok);
  const page = await openApp({ width: 384, height: 740 });
  await page.evaluate(() => {
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
    __setLiveDataModeForTest("live");
    const PH = ["PhotoID", "CollectionID", "PhotoType", "SubGroupID", "Filename", "Label", "DateAdded"];
    const RH = ["ReceiptID", "CollectionID", "Filename", "DateAdded"];
    const row = (h, o) => h.map(k => (o[k] === undefined ? "" : o[k]));
    // The clean collection every case starts from. Next id: max(All 10,
    // Staging 12) + 1 = 13.
    window.__b4 = {
      fixture() {
        return {
          all: ["AY-00001", "AY-00002", "AY-00003-A", "AY-00004", "AY-00006", "AY-00010"],
          photos: [
            { PhotoID: "PH-00001", CollectionID: "AY-00001", PhotoType: "Obverse", Filename: "AY-00001_obverse_cropped.jpg" },
            { PhotoID: "PH-00002", CollectionID: "AY-00001", PhotoType: "Reverse", Filename: "AY-00001_reverse_cropped_02.jpg" },
            { PhotoID: "PH-00003", CollectionID: "AY-00002", PhotoType: "Reference", Filename: "AY-00002_reference_01.jpg" },
            { PhotoID: "PH-00004", CollectionID: "AY-00003-A", PhotoType: "Obverse", Filename: "AY-00003-A_obverse.jpg" }
          ],
          receipts: [
            { ReceiptID: "RC-00001", CollectionID: "AY-00001", Filename: "RC-00001_receipt.pdf" },
            { ReceiptID: "RC-00001", CollectionID: "AY-00002", Filename: "RC-00001_receipt.pdf" },
            { ReceiptID: "RC-00002", CollectionID: "AY-00004", Filename: "Binder" },
            { ReceiptID: "RC-00003", CollectionID: "AY-00010", Filename: "AY-00010_receipt.pdf" }
          ],
          photoFiles: ["AY-00001_obverse_cropped.jpg", "AY-00001_reverse_cropped_02.jpg", "AY-00002_reference_01.jpg",
            "AY-00003-A_obverse.jpg", "AY-00001_obverse_original.jpg", "AY-00001_reverse_original_02.png"],
          receiptFiles: ["RC-00001_receipt.pdf", "AY-00010_receipt.pdf"],
          staging: {
            "_Docket": { "docket.json": { type: "docket", entries: [] } },
            "AY-00011": { "coin.json": { type: COIN_DRAFT_TYPE, collectionID: "AY-00011", status: COIN_DRAFT_STATUS.DRAFT }, "AY-00011_obverse.jpg": "b" },
            "AY-00012": { "set.json": { type: "set", dismissedGaps: [], children: [], collectionID: "AY-00012", status: SET_STATUS.DRAFT, photos: [{ filename: "AY-00012_set_front.jpg" }] },
              "AY-00012_set_front.jpg": "b" }
          }
        };
      },
      make(fx) {
        const p = writePaths();
        const mock = createMockGraphClient({ sheets: {
          All: [["CollectionID", "Status"]].concat(fx.all.map(id => [id, "Owned"])),
          Photos: [PH.slice()].concat(fx.photos.map(o => row(PH, o))),
          Receipts: [RH.slice()].concat(fx.receipts.map(o => row(RH, o)))
        } });
        const bytes = () => ({ kind: "bytes", value: new Uint8Array([1, 2, 3]) });
        fx.photoFiles.forEach(n => mock._store.set(p.coinPhotos + "/" + n, bytes()));
        fx.receiptFiles.forEach(n => mock._store.set(p.coinReceipts + "/" + n, bytes()));
        Object.keys(fx.staging).forEach(folder => Object.keys(fx.staging[folder]).forEach(f => {
          const v = fx.staging[folder][f];
          mock._store.set(p.stagingBase + "/" + folder + "/" + f, typeof v === "string" ? bytes() : { kind: "json", value: v });
        }));
        return mock;
      },
      async run(fx, wrap) {
        __resetConsistencyCheckForTest();
        const mock = window.__b4.make(fx);
        __setGraphClientForTest(wrap ? wrap(mock) : mock);
        const r = await runConsistencyCheck();
        return window.__b4.sum(r);
      },
      sum(r) {
        if (!r) return null;
        const counts = {};
        r.sections.forEach(s => { counts[s.n] = s.failed ? "F" : consistencySectionCount(s); });
        const lines = {};
        r.sections.forEach(s => { lines[s.n] = [].concat(...s.groups.map(g => g.lines.map(t => (g.info ? "[info] " : "") + (g.title ? g.title + " | " : "") + t))); });
        return { counts, lines, failed: r.sections.filter(s => s.failed).map(s => s.n + ": " + s.failed),
          text: consistencyResultText(r), reads: r.reads, saveRan: r.saveRan };
      }
    };
  });

  // Sections that hold a line other than the one named.
  const others = (S, n) => Object.keys(S.counts).filter(k => Number(k) !== n && S.counts[k] !== 0);

  // ---------- K1 + K3 (clean) ----------
  const K1 = await page.evaluate(() => window.__b4.run(window.__b4.fixture()));
  ok("K1 clean: every section None found, No problems found, Nothing was changed: " + JSON.stringify(K1.counts) + " " + JSON.stringify(K1.failed),
    Object.values(K1.counts).every(c => c === 0) && /\nNo problems found\.\n/.test(K1.text) && /Nothing was changed\./.test(K1.text) &&
    (K1.text.match(/^None found\.$/gm) || []).length === 9 && !/Could not check/.test(K1.text));
  ok("K3 kept originals (_original.jpg, _original_02.png) counted, not listed: " + JSON.stringify(K1.lines[7]),
    K1.lines[7].length === 1 && K1.lines[7][0] === "[info] Kept originals beside their crop: 2 (expected).");
  ok("K1 the first lines: the Build line, then TEST (_Testing), the time and reads", /^Check files and rows · Build /.test(K1.text) &&
    /\nChecked \d+ [A-Z][a-z]{2} \d\d:\d\d · TEST \(_Testing\) · \d+\.\d s · \d+ reads · Nothing was changed\./.test(K1.text));

  // ---------- K2: one case of each kind ----------
  const cases = [
    { name: "1 Photos row, file missing", n: 1, re: /^PH-00005 · AY-00002 · Other · AY-00002_other_01\.jpg is not in CoinPhotos \(Photos row 6\)\.$/,
      seed: fx => fx.photos.push({ PhotoID: "PH-00005", CollectionID: "AY-00002", PhotoType: "Other", Filename: "AY-00002_other_01.jpg" }) },
    { name: "2 Receipts row, file missing", n: 2, re: /^RC-00004 · AY-00003-A · AY-00003-A_receipt\.pdf is not in CoinReceipts \(Receipts row 6\)\.$/,
      seed: fx => fx.receipts.push({ ReceiptID: "RC-00004", CollectionID: "AY-00003-A", Filename: "AY-00003-A_receipt.pdf" }) },
    { name: "3 row for an id not on All, not yet handed out", n: 3, re: /^PH-00006 · AY-00020 \(Photos row 6\): AY-00020 is not on All\. This id has not been handed out yet: the coin that gets it will show this photo\.$/,
      seed: fx => { fx.photos.push({ PhotoID: "PH-00006", CollectionID: "AY-00020", PhotoType: "Obverse", Filename: "AY-00020_obverse.jpg" }); fx.photoFiles.push("AY-00020_obverse.jpg"); } },
    { name: "4 one photo file on two rows", n: 4, re: /^Photos \| AY-00002_reference_01\.jpg is on Photos rows 4 \(PH-00003\) and 6 \(PH-00008\)\.$/,
      seed: fx => fx.photos.push({ PhotoID: "PH-00008", CollectionID: "AY-00002", PhotoType: "Reference", Filename: "AY-00002_reference_01.jpg" }) },
    { name: "4 one receipt file under two ReceiptIDs", n: 4, re: /^Receipts \| RC-00001_receipt\.pdf is under 2 ReceiptIDs: RC-00001 \(rows 2 and 3\), RC-00005 \(row 6\)\.$/,
      seed: fx => fx.receipts.push({ ReceiptID: "RC-00005", CollectionID: "AY-00006", Filename: "RC-00001_receipt.pdf" }) },
    { name: "5 duplicate PhotoID", n: 5, re: /^PH-00003 is on Photos rows 4 and 6\.$/,
      seed: fx => { fx.photos.push({ PhotoID: "PH-00003", CollectionID: "AY-00001", PhotoType: "Other", Filename: "AY-00001_other_01.jpg" }); fx.photoFiles.push("AY-00001_other_01.jpg"); } },
    { name: "7 file whose id is not on All", n: 7, re: /^No row, and the id is not on All .* \| AY-00030_obverse\.jpg: AY-00030 is not on All\.$/,
      seed: fx => fx.photoFiles.push("AY-00030_obverse.jpg") },
    { name: "7 file on a coin on All, same kind as its row", n: 7, re: /^No row; the coin is on All .* \| AY-00001_obverse_cropped_03\.jpg: same kind as AY-00001_obverse_cropped\.jpg on its row, probably an older copy/,
      seed: fx => fx.photoFiles.push("AY-00001_obverse_cropped_03.jpg") },
    { name: "7 file with no CollectionID", n: 7, re: /^Name has no CollectionID \| IMG_1234\.jpg$/,
      seed: fx => fx.photoFiles.push("IMG_1234.jpg") },
    { name: "8 receipt file of a coin on All, no row", n: 8, re: /^No row; the coin is on All \| AY-00001_receipt_02\.pdf: no Receipts row names it/,
      seed: fx => fx.receiptFiles.push("AY-00001_receipt_02.pdf") },
    { name: "8 receipt file for a ReceiptID no row carries", n: 8, re: /^Named for a ReceiptID \| RC-00009_receipt\.pdf: no Receipts row carries RC-00009\.$/,
      seed: fx => fx.receiptFiles.push("RC-00009_receipt.pdf") },
    { name: "8 receipt file, older copy of a ReceiptID's file", n: 8, re: /^Named for a ReceiptID \| RC-00003_receipt_02\.pdf: RC-00003 is on the Receipts tab, but its rows name AY-00010_receipt\.pdf/,
      seed: fx => fx.receiptFiles.push("RC-00003_receipt_02.pdf") },
    { name: "8 seller-date receipt with no row", n: 8, re: /^Name has no CollectionID \(seller-date and picked names\) \| FindersKeepers_2026-06-27_receipt\.pdf$/,
      seed: fx => fx.receiptFiles.push("FindersKeepers_2026-06-27_receipt.pdf") },
    { name: "9 folder name that is not a draft", n: 9, re: /^Not a draft folder name \| 2026 old is not a draft folder name; the app ignores it\.$/,
      seed: fx => { fx.staging["2026 old"] = { "a.jpg": "b" }; } }
  ];
  for (const c of cases) {
    const S = await page.evaluate(async src => {
      const fx = window.__b4.fixture();
      (new Function("return " + src))()(fx);
      return window.__b4.run(fx);
    }, c.seed.toString());
    const lines = S.lines[c.n].filter(l => !/^\[info\]/.test(l));
    ok("K2 " + c.name + ": one line, in section " + c.n + " only: " + JSON.stringify(lines) + " others " + JSON.stringify(others(S, c.n)),
      lines.length === 1 && c.re.test(lines[0]) && others(S, c.n).length === 0);
  }
  const CASE = await page.evaluate(() => {
    const fx = window.__b4.fixture();
    fx.photoFiles = fx.photoFiles.map(n => n === "AY-00002_reference_01.jpg" ? "ay-00002_REFERENCE_01.JPG" : n);
    return window.__b4.run(fx);
  });
  ok("K2 a file whose name differs from its row only in letter case is not a problem: " + JSON.stringify(CASE.counts),
    Object.values(CASE.counts).every(c => c === 0));

  // ---------- K3: an original whose crop has no row ----------
  const K3 = await page.evaluate(() => {
    const fx = window.__b4.fixture();
    fx.photoFiles.push("AY-00002_obverse_original_03.jpg");
    return window.__b4.run(fx);
  });
  ok("K3 an original whose crop has no row is listed (the coin is on All); the paired ones stay counted: " + JSON.stringify(K3.lines[7]),
    K3.counts[7] === 1 && K3.lines[7].some(l => /\| AY-00002_obverse_original_03\.jpg: nothing of this kind is on a row\.$/.test(l)) &&
    K3.lines[7].includes("[info] Kept originals beside their crop: 2 (expected)."));

  // ---------- K4: receipts ----------
  const K4 = await page.evaluate(async () => {
    const a = window.__b4.fixture();
    a.receipts.push({ ReceiptID: "RC-00003", CollectionID: "AY-00006", Filename: "AY-00006_receipt.pdf" });
    a.receiptFiles.push("AY-00006_receipt.pdf");
    const b = window.__b4.fixture();
    b.receipts.push({ ReceiptID: "RC-00006", CollectionID: "AY-00010", Filename: "Binder" });
    return { a: await window.__b4.run(a), b: await window.__b4.run(b) };
  });
  ok("K4 the clean fixture's shared receipt (RC-00001 on two coins) and Binder row gave no line (K1)", K1.counts[2] === 0 && K1.counts[4] === 0 && K1.counts[6] === 0);
  ok("K4 one ReceiptID naming two files: one line in section 4 only: " + JSON.stringify(K4.a.lines[4]),
    K4.a.counts[4] === 1 && /^Receipts \| RC-00003 names 2 files: AY-00010_receipt\.pdf \(row 5\), AY-00006_receipt\.pdf \(row 6\)\. One ReceiptID must point at one file\.$/.test(K4.a.lines[4][0]) &&
    others(K4.a, 4).length === 0);
  ok("K4 a Former Holdings coin with two Receipts rows (a file and a Binder): section 6 only: " + JSON.stringify(K4.b.lines[6]),
    K4.b.counts[6] === 1 && K4.b.lines[6][0] === "AY-00010 has 2 Receipts rows (5, 6)." && others(K4.b, 6).length === 0);

  // ---------- K5: A19 and the next id ----------
  const K5 = await page.evaluate(() => {
    const fx = window.__b4.fixture();
    fx.photos.push({ PhotoID: "PH-00012", CollectionID: "AY-00012", PhotoType: "Obverse", Filename: "AY-00012_obverse.jpg" });
    fx.photos.push({ PhotoID: "PH-00013", CollectionID: "AY-00013", PhotoType: "Obverse", Filename: "AY-00013_obverse.jpg" });
    fx.receipts.push({ ReceiptID: "RC-00009", CollectionID: "AY-00005", Filename: "Binder" });
    fx.photoFiles.push("AY-00012_obverse.jpg", "AY-00013_obverse.jpg");
    return window.__b4.run(fx);
  });
  const l5 = K5.lines[3] || [];
  ok("K5 Staging's AY-00012 is above All's max (10): the next id is 13, so AY-00012 will not be handed out again: " + JSON.stringify(l5),
    l5.some(l => /^PH-00012 · AY-00012 \(Photos row 6\): AY-00012 is not on All\. This id will not be handed out again\.$/.test(l)));
  ok("K5 AY-00013 (the next id) has not been handed out yet", l5.some(l => /^PH-00013 · AY-00013 .* This id has not been handed out yet: the coin that gets it will show this photo\.$/.test(l)));
  ok("K5 a Receipts row (a gap below the next id) is listed too, as a receipt", l5.some(l => /^RC-00009 · AY-00005 \(Receipts row 6\): AY-00005 is not on All\. This id will not be handed out again\.$/.test(l)));
  ok("K5 exactly those three; the child id AY-00003-A on All gave no line", l5.length === 3 && !l5.some(l => /AY-00003-A/.test(l)));

  // ---------- K6: Staging ----------
  const K6 = await page.evaluate(() => {
    const fx = window.__b4.fixture();
    Object.assign(fx.staging, {
      "202611142130000": { "coin.json": { type: COIN_DRAFT_TYPE } },
      "AY-00014": { "x.jpg": "b" },
      "AY-00001": { "coin.json": { type: COIN_DRAFT_TYPE, collectionID: "AY-00001", status: COIN_DRAFT_STATUS.DRAFT }, "AY-00001_obverse.jpg": "b" },
      "AY-00002": { "coin.json": { type: COIN_DRAFT_TYPE, collectionID: "AY-00002", status: COIN_DRAFT_STATUS.PROMOTED, allRowWritten: true, filesMovedOnPromotion: false },
        "AY-00002_obverse.jpg": "b", "AY-00002_reverse.jpg": "b" },
      "AY-00004": { "set.json": { type: "set", dismissedGaps: [], children: [], collectionID: "AY-00004", status: SET_STATUS.COMPLETE, photos: [] } },
      "AY-00015": { "set.json": { type: "set", dismissedGaps: [], children: [], collectionID: "AY-00015", status: SET_STATUS.DRAFT } },
      "AY-00016": { "set.json": { type: "set", dismissedGaps: [], children: [], collectionID: "AY-00016", status: SET_STATUS.PROMOTED, filesMovedOnPromotion: true, photos: [{ filename: "AY-00016_set_front.jpg" }] } }
    });
    fx.staging["AY-00012"]["set.json"].photos.push({ filename: "AY-00012_set_back.jpg" }, { filename: "AY-00012_coa.jpg" });
    fx.staging["AY-00012"]["AY-00012_coa.jpg"] = "b";
    return window.__b4.run(fx);
  });
  const l6 = K6.lines[9] || [];
  const has6 = re => l6.some(l => re.test(l));
  ok("K6 odd names listed, _Docket not: " + JSON.stringify(l6),
    has6(/^Not a draft folder name \| 202611142130000 is not a draft folder name/) && !has6(/_Docket/));
  ok("K6 an AY folder with no draft file", has6(/^Folder with no draft file \| AY-00014 holds no draft file \(1 file\); its id stays reserved\.$/));
  ok("K6 an open coin draft whose coin is on All: Mark as promoted", has6(/^On All, draft still open \| AY-00001 is on All but its draft is still open: use Mark as promoted\.$/));
  ok("K6 files still in Staging (the open draft's 1, the promoted draft's 2)",
    has6(/^On All, files still in Staging \| AY-00001 is on All; 1 file is still in Staging\/AY-00001 \(photos not moved\)\.$/) &&
    has6(/^On All, files still in Staging \| AY-00002 is on All; 2 files are still in Staging\/AY-00002 \(photos not moved\)\.$/));
  ok("K6 a promoted coin draft is not 'still open'", !has6(/AY-00002 is on All but its draft is still open/));
  ok("K6 an open Set draft whose parent is on All", has6(/^On All, draft still open \| AY-00004 \(a Set\) is on All but its draft is still open\.$/));
  ok("K6 a Set draft's photos list names a missing file (the second entry; the third is there)",
    has6(/^Set draft: a listed photo is not in its folder \| AY-00012 · set\.json lists AY-00012_set_back\.jpg, but it is not in Staging\/AY-00012\.$/) &&
    !has6(/AY-00012_coa\.jpg|AY-00012_set_front\.jpg/));
  ok("K6 a pre-B-1 Set draft: 'no photos list', shown but not counted; a promoted Set whose files moved is not checked",
    l6.includes("[info] Set drafts not checked | AY-00015 · no photos list (saved before the B-1 fix); not checked.") &&
    !has6(/AY-00016/) && K6.counts[9] === l6.filter(l => !/^\[info\]/.test(l)).length);
  ok("K6 exactly 7 counted lines in Staging, nothing in other sections: " + K6.counts[9] + " " + JSON.stringify(others(K6, 9)),
    K6.counts[9] === 7 && others(K6, 9).length === 0);

  // ---------- K7: paging on the real client ----------
  const K7 = await page.evaluate(async () => {
    const p = writePaths();
    const fx = window.__b4.fixture();
    const extra = Array.from({ length: 2500 }, (_, i) => "AY-00001_reference_" + String(i + 1).padStart(4, "0") + ".jpg");
    fx.photos = fx.photos.concat(extra.slice(0, 2499).map((n, i) => ({ PhotoID: "PH-1" + String(i).padStart(4, "0"), CollectionID: "AY-00001", PhotoType: "Reference", Filename: n })));
    const names = fx.photoFiles.concat(extra); // the last of extra (page 3) has no row
    let failPage2 = false;
    const prevFetch = window.fetch, prevTok = window.getWriteToken;
    window.getWriteToken = async () => "tok";
    window.fetch = async (url, opts) => {
      const u = String(url);
      if (u.indexOf("graph.microsoft.com") === -1) return prevFetch(url, opts);
      const m = /\$skiptoken=(\d+)/.exec(u);
      const start = m ? parseInt(m[1], 10) : 0;
      if (failPage2 && start > 0) return new Response("busy", { status: 503 });
      const body = { value: names.slice(start, start + 1000).map(name => ({ name })) };
      if (start + 1000 < names.length) body["@odata.nextLink"] = "https://graph.microsoft.com/v1.0/me/drive/root:/x:/children?$select=name&$skiptoken=" + (start + 1000);
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const wrap = mock => { const list = mock.listChildren; mock.listChildren = path => path === p.coinPhotos ? RealGraphClient.listChildren(path) : list.call(mock, path); return mock; };
    try {
      const a = await window.__b4.run(fx, wrap);
      failPage2 = true;
      const b = await window.__b4.run(fx, wrap);
      return { a, b };
    } finally { window.fetch = prevFetch; window.getWriteToken = prevTok; }
  });
  ok("K7 2,500 more files in 3 pages: the one with no row (on page 3) is found, nothing else: " + JSON.stringify(K7.a.lines[7].filter(l => !/^\[info\]/.test(l))),
    K7.a.counts[7] === 1 && K7.a.lines[7].some(l => /AY-00001_reference_2500\.jpg: same kind as/.test(l)) && K7.a.counts[1] === 0);
  ok("K7 page 2 fails: sections 1 and 7 say Could not check (never None found), Incomplete, the rest still report: " + JSON.stringify(K7.b.failed),
    K7.b.counts[1] === "F" && K7.b.counts[7] === "F" && /503 \(page 2\)/.test(K7.b.failed.join(" ")) &&
    /\nIncomplete: some parts could not be checked/.test(K7.b.text) && /\n1\. Photos rows whose file is missing\nCould not check: CoinPhotos: /.test(K7.b.text) &&
    K7.b.counts[4] === 0 && K7.b.counts[2] === 0);

  // ---------- K8: every read failing, then getting no answer ----------
  const K8 = await page.evaluate(async () => {
    const reads = CONSISTENCY_READ_METHODS;
    const sweep = async mode => {
      const clean = await window.__b4.run(window.__b4.fixture());
      const out = { K: clean.reads, bad: [] };
      __setConsistencyReadTimeoutForTest(mode === "lost" ? 40 : 60000);
      for (let n = 1; n <= clean.reads; n++) {
        let i = 0;
        const wrap = mock => new Proxy(mock, { get(t, prop) {
          const v = t[prop];
          if (typeof v !== "function" || reads.indexOf(prop) === -1) return v;
          return (...args) => { i++; if (i === n) return mode === "lost" ? new Promise(() => {}) : Promise.reject(new Error("injected " + n)); return v.apply(t, args); };
        } });
        const S = await window.__b4.run(window.__b4.fixture(), wrap);
        const failedN = Object.keys(S.counts).filter(k => S.counts[k] === "F");
        const good = failedN.length >= 1 && /\nIncomplete: /.test(S.text) &&
          Object.keys(S.counts).every(k => S.counts[k] === "F" || S.counts[k] === 0) &&
          (mode === "lost" ? /no answer in 0 s/.test(S.failed.join(" ")) : /injected/.test(S.failed.join(" "))) &&
          !/\nNo problems found\./.test(S.text);
        if (!good) out.bad.push({ n, counts: S.counts, failed: S.failed });
      }
      __setConsistencyReadTimeoutForTest(60000);
      return out;
    };
    return { fail: await sweep("fail"), lost: await sweep("lost") };
  });
  ok("K8 each of the " + K8.fail.K + " reads failing in turn: Could not check where needed, Incomplete, no false line: " + JSON.stringify(K8.fail.bad.slice(0, 2)),
    K8.fail.K >= 12 && K8.fail.bad.length === 0);
  ok("K8 each read getting no answer (ceiling shortened): the same: " + JSON.stringify(K8.lost.bad.slice(0, 2)),
    K8.lost.K === K8.fail.K && K8.lost.bad.length === 0);

  // ---------- K9: read-only ----------
  const K9 = await page.evaluate(async () => {
    const called = [];
    let deletes = 0;
    const prevDel = window.deleteWorkbookCacheForWrite;
    window.deleteWorkbookCacheForWrite = async (...a) => { deletes++; return prevDel.apply(null, a); };
    const gen = excelSession.generation, sid = excelSession.id;
    const fx = window.__b4.fixture();
    fx.photoFiles.push("AY-00030_obverse.jpg"); // a finding, so every comparison runs with something to say
    const S = await window.__b4.run(fx, mock => new Proxy(mock, { get(t, prop) {
      const v = t[prop];
      if (typeof v === "function" && typeof prop === "string") return (...args) => { called.push(prop); return v.apply(t, args); };
      return v;
    } }));
    window.deleteWorkbookCacheForWrite = prevDel;
    let threw = "";
    try { consistencyReadClient({ reads: 0 }).deleteItem("x"); } catch (e) { threw = e.message; }
    let threw2 = "";
    try { consistencyReadClient({ reads: 0 }).uploadJson("x", {}); } catch (e) { threw2 = e.message; }
    return { called: [...new Set(called)], gated: called.filter(m => GATED_GRAPH_METHODS.has(m)), deletes,
      sameSession: excelSession.generation === gen && excelSession.id === sid, threw, threw2, counts: S.counts };
  });
  ok("K9 a whole run calls only read methods (no gated write method): " + JSON.stringify(K9.called),
    K9.gated.length === 0 && K9.called.length > 0 && K9.called.every(m => ["listChildren", "getJson", "readTableHeaderRow", "readTableColumn", "readWorkbookRange"].includes(m)));
  ok("K9 no Excel session made or changed; the saved copy never deleted", K9.sameSession && K9.deletes === 0);
  ok("K9 the read-only view throws on a write method: " + K9.threw,
    /read-only: deleteItem is not allowed/.test(K9.threw) && /read-only: uploadJson is not allowed/.test(K9.threw2));

  // ---------- K10: saves and double taps ----------
  const K10 = await page.evaluate(async () => {
    const out = {};
    // Refused while a save runs.
    let reads = 0;
    __resetConsistencyCheckForTest();
    const mock = window.__b4.make(window.__b4.fixture());
    __setGraphClientForTest(new Proxy(mock, { get(t, prop) { const v = t[prop]; if (typeof v === "function") return (...a) => { reads++; return v.apply(t, a); }; return v; } }));
    const t = beginSaveTiming("test save");
    out.refused = await runConsistencyCheck();
    out.refusedMsg = document.getElementById("docketCheckMessage").textContent;
    out.refusedReads = reads;
    endSaveTiming(t, "ok");
    // A save that runs during the check.
    let release;
    const gate = new Promise(r => { release = r; });
    const fx = window.__b4.fixture();
    const slow = m => { const list = m.listChildren; m.listChildren = async path => { if (path === writePaths().coinReceipts) await gate; return list.call(m, path); }; return m; };
    __resetConsistencyCheckForTest();
    __setGraphClientForTest(slow(window.__b4.make(fx)));
    const running = runConsistencyCheck();
    const second = runConsistencyCheck(); // a double tap
    const s = beginSaveTiming("save during the check"); endSaveTiming(s, "ok");
    release();
    const r1 = await running, r2 = await second;
    out.oneRun = r1 === r2;
    out.saveRan = r1.saveRan;
    out.warn = /\nA save ran during this check, so some lines may be out of date: run it again\.\n/.test(consistencyResultText(r1));
    // A clean run has no such line.
    const clean = await window.__b4.run(window.__b4.fixture());
    out.cleanWarn = /A save ran during this check/.test(clean.text);
    return out;
  });
  ok("K10 refused while a save runs, nothing read: " + K10.refusedMsg,
    K10.refused === null && K10.refusedMsg === "A save is running: run the check when it has finished." && K10.refusedReads === 0);
  ok("K10 a save during the check is named; a clean run says nothing of it", K10.saveRan === true && K10.warn && K10.cleanWarn === false);
  ok("K10 a double tap runs once (the same result)", K10.oneRun);

  // ---------- K11: Copy and the screen ----------
  const K11 = await page.evaluate(async () => {
    const fx = window.__b4.fixture();
    for (let i = 0; i < 25; i++) fx.photoFiles.push("AY-0" + (4000 + i) + "_x.jpg");
    await window.__b4.run(fx);
    const r = __getConsistencyResultForTest();
    const screen = () => [...document.querySelectorAll("#docketCheckResult p")].map(p => p.textContent).join("\n");
    renderConsistencyCheck("");
    const capped = screen();
    __setConsistencyScreenCapForTest(Infinity);
    renderConsistencyCheck("");
    const full = screen();
    __setConsistencyScreenCapForTest(null);
    renderConsistencyCheck("");
    const copy = consistencyResultText(r);
    let clip = null;
    const prev = navigator.clipboard && navigator.clipboard.writeText;
    try { Object.defineProperty(navigator, "clipboard", { value: { writeText: async t => { clip = t; } }, configurable: true }); } catch (e) { /* ignore */ }
    await copyConsistencyResult();
    return { capped, full, copy, clip, copyShown: document.getElementById("docketCheckCopyBtn").style.display !== "none", hadClip: !!prev };
  });
  ok("K11 the screen with its cap lifted equals Copy, line for line", K11.full === K11.copy && K11.copy.split("\n").length > 30);
  ok("K11 the Copy button copies exactly that text", K11.clip === K11.copy && K11.copyShown);
  ok("K11 on screen a group stops at 20 with 'and 5 more'; Copy has all 25",
    /\nand 5 more \(all of them are in Copy\)\n/.test(K11.capped) && !/and \d+ more/.test(K11.copy) &&
    (K11.copy.match(/_x\.jpg: AY-0/g) || []).length === 25 && (K11.capped.match(/_x\.jpg: AY-0/g) || []).length === 20);

  // ---------- K12: the Docket ----------
  const K12 = await page.evaluate(async () => {
    const fx = window.__b4.fixture();
    fx.photoFiles.push("AY-00050_" + "x".repeat(190) + ".jpg");
    __resetConsistencyCheckForTest();
    __setGraphClientForTest(window.__b4.make(fx));
    navigate("needsdbcoins");
    const ids = [...document.querySelectorAll("#view-needsdbcoins .detail-accordion")].map(a => a.id || (a.querySelector(".accordion-header") || {}).id);
    const counts = () => ["docketStagingCount", "docketResearchCount", "docketOtherCount"].map(id => (document.getElementById(id) || {}).textContent)
      .concat([(document.getElementById("needsAttentionBadge") || { className: "none" }).className]);
    // Wait (on a condition, with a ceiling) for the Docket's own loads to settle.
    let last = "", same = 0;
    for (let i = 0; i < 100 && same < 3; i++) { await new Promise(r => setTimeout(r, 50)); const c = JSON.stringify(counts()); same = c === last ? same + 1 : 0; last = c; }
    const before = counts();
    let redraws = 0;
    const prevHub = window.renderNeedsAttentionHub, prevFob = window.updateDocketFob;
    window.renderNeedsAttentionHub = (...a) => { redraws++; return prevHub.apply(null, a); };
    window.updateDocketFob = (...a) => { redraws++; return prevFob.apply(null, a); };
    document.getElementById("docketCheckHeader").click();
    document.getElementById("docketCheckRunBtn").click();
    for (let i = 0; i < 200 && !__getConsistencyResultForTest(); i++) await new Promise(r => setTimeout(r, 10));
    await new Promise(r => setTimeout(r, 0));
    window.renderNeedsAttentionHub = prevHub; window.updateDocketFob = prevFob;
    const after = counts();
    const se = document.scrollingElement;
    const body = document.getElementById("docketCheckBody");
    return { ids, before, after, redraws, settled: same >= 3, ran: !!__getConsistencyResultForTest(), shown: /AY-00050_x{10}/.test(document.getElementById("docketCheckResult").textContent),
      open: !body.classList.contains("hidden"), noSideScroll: se.scrollWidth <= se.clientWidth + 1,
      btn: document.getElementById("docketCheckRunBtn").textContent };
  });
  const iOther = K12.ids.indexOf("docketOtherHeader"), iCheck = K12.ids.indexOf("docketCheckAccordion"), iAbout = K12.ids.indexOf("docketAboutAccordion");
  ok("K12 the accordion sits right after Other / Requires Photos and right before About: " + JSON.stringify(K12.ids),
    iCheck !== -1 && iOther !== -1 && iCheck === iOther + 1 && iAbout === iCheck + 1);
  ok("K12 the Run button runs it from the Docket and shows the result: " + K12.btn, K12.ran && K12.shown && K12.open && K12.btn === "Run it again");
  ok("K12 a run with findings changes no Docket count or the fob, and redraws neither: " + JSON.stringify(K12.before) + " -> " + JSON.stringify(K12.after) + " redraws " + K12.redraws,
    K12.settled && JSON.stringify(K12.before) === JSON.stringify(K12.after) && K12.redraws === 0);
  ok("K12 a 200-character file name does not scroll the page sideways at 384 px", K12.noSideScroll);

  // ---------- K13: size ----------
  const K13 = await page.evaluate(() => {
    const ok = v => ({ ok: true, value: v });
    const all = Array.from({ length: 1500 }, (_, i) => "AY-" + String(i + 1).padStart(5, "0"));
    const photos = all.map((id, i) => ({ __row: i + 2, PhotoID: "PH-" + String(i + 1).padStart(5, "0"), CollectionID: id, PhotoType: "Obverse", Filename: id + "_obverse_cropped.jpg" }));
    const files = [];
    all.forEach(id => files.push(id + "_obverse_cropped.jpg", id + "_obverse_original.jpg"));
    const t0 = performance.now();
    const sections = compareConsistency({ all: ok(all), photos: ok(photos), receipts: ok([]), photoFiles: ok(files.slice(0, 3000)), receiptFiles: ok([]), staging: ok([]) });
    return { ms: performance.now() - t0, originals: sections[6].groups.find(g => g.info).lines[0] };
  });
  ok("K13 3,000 files and 1,500 rows compare in under 1 s: " + Math.round(K13.ms) + " ms; " + K13.originals,
    K13.ms < 1000 && K13.originals === "Kept originals beside their crop: 1500 (expected).");
}, module);
