// Two fixes from Ray's tablet test of 0a0cbd1 (Oct 2026,
// claude/photos-wait-for-save). The device-Back fixes from the same test are
// in verify_device_back_everywhere.js.
//
//   SELF the shared check helper's must-fail self-check
//   M1  Add Coin: picking "— none (Other) —" keeps the box on "— none
//       (Other) —" (it used to jump back to "— none (Philadelphia) —"),
//       through the lookup, a single match applied, and a pick from the
//       ambiguous list; the field's value stays "" (writes a blank MintMark)
//   M2  Edit Coin: the same, and opening a coin already linked to an
//       unmarked non-Philadelphia catalog row shows "— none (Other) —"; one
//       linked to a Philadelphia row shows "— none (Philadelphia) —"
//   M3  a Staging draft opened for edit shows "— none (Other) —" the same way
//   T1  "Tap to label" opens the viewer with the label field focused; a tap
//       on the photo itself opens it without focusing the field

const { defineSuite } = require("./harness");

module.exports = defineSuite("tablet-retest-0a0cbd1", async ({ openApp, check, selfCheck, PHONE }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);
  await page.evaluate(() => {
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
    window.__t = {
      sleep: (ms) => new Promise(r => setTimeout(r, ms)),
      shown(sel) { const o = sel.selectedOptions[0]; return o ? o.textContent.trim() : "(none)"; },
    };
  });

  // ---------- M1 Add Coin --------------------------------------------------
  const M1 = await page.evaluate(async () => {
    const T = __t;
    const run = (denom, year) => {
      navigate("addcoin");
      const d = document.getElementById("denomination"); d.value = denom; d.dispatchEvent(new Event("change"));
      const y = document.getElementById("year"); y.value = year; y.dispatchEvent(new Event("input"));
      const mm = document.getElementById("mintMark");
      selectMintMarkOther(mm); mm.dispatchEvent(new Event("change"));
      return mm;
    };
    const out = {};
    // Year left blank: the lookup can't run, the box still says Other.
    navigate("addcoin");
    const mm0 = document.getElementById("mintMark");
    selectMintMarkOther(mm0); mm0.dispatchEvent(new Event("change"));
    out.noLookup = { shown: T.shown(mm0), value: mm0.value };
    // A single match: the form is filled from the row, the box still says Other.
    let mm = run("1C", "1875");
    out.single = { shown: T.shown(mm), value: mm.value,
      applied: !document.getElementById("mintMarkOtherAppliedBanner").classList.contains("hidden") };
    // Two candidates: picking one keeps Other.
    mm = run("5C", "1913");
    out.ambiguousOpen = T.shown(mm);
    document.querySelectorAll("#mintMarkOtherAmbiguousList .ambiguous-match")[1].click();
    out.picked = { shown: T.shown(mm), value: mm.value };
    // What the draft would save.
    out.draftMint = readAddCoinFormForDraft().mint;
    // Choosing an ordinary option still works; Philadelphia shows Philadelphia.
    mm.value = "D"; mm.dispatchEvent(new Event("change"));
    out.d = { shown: T.shown(mm), value: mm.value };
    mm.value = ""; mm.dispatchEvent(new Event("change"));
    out.phil = { shown: T.shown(mm), value: mm.value };
    return out;
  });
  ok("M1a Add Coin: \"— none (Other) —\" stays shown even when the lookup can't run; value \"\"",
    M1.noLookup.shown === "— none (Other) —" && M1.noLookup.value === "", M1);
  ok("M1b Add Coin: after a single match fills the form, the box still shows \"— none (Other) —\"; value \"\"",
    M1.single.applied && M1.single.shown === "— none (Other) —" && M1.single.value === "", M1);
  ok("M1c Add Coin: picking from the ambiguous list keeps \"— none (Other) —\"; the draft's MintMark is blank",
    M1.ambiguousOpen === "— none (Other) —" && M1.picked.shown === "— none (Other) —" && M1.picked.value === "" && M1.draftMint === "", M1);
  ok("M1d ordinary options still show and write themselves: D writes \"D\", Philadelphia shows Philadelphia and writes \"\"",
    M1.d.shown === "D — Denver" && M1.d.value === "D" && M1.phil.shown === "— none (Philadelphia) —" && M1.phil.value === "", M1);

  // ---------- M2 Edit Coin ---------------------------------------------------
  const M2 = await page.evaluate(async () => {
    const T = __t;
    __setBrowseEditWriteEnabledForTest(false);
    const coin = FAKE_COINS.find(c => c.id === "AY-00007");
    const saved = { coinId: coin.coinId, mint: coin.mint, year: coin.year, denom: coin.denom };
    const out = {};
    try {
      // Picking Other on Edit Coin.
      navigate("browse"); showBrowseDetail(coin); showBrowseEditView(coin);
      document.getElementById("browseEditYear").value = "1875";
      document.getElementById("browseEditDenomination").value = "1C";
      const sel = document.getElementById("browseEditMintMark");
      selectMintMarkOther(sel); sel.dispatchEvent(new Event("change", { bubbles: true }));
      out.picked = { shown: T.shown(sel), value: sel.value, form: readBrowseEditForm().workbook.MintMark,
        applied: !document.getElementById("browseEditMintMarkOtherAppliedBanner").classList.contains("hidden") };
      // A coin already linked to a San Francisco unmarked row opens on Other.
      Object.assign(coin, { coinId: "C-1875-M-1C-01", mint: "", year: 1875, denom: "1C" });
      showBrowseEditView(coin);
      out.openOther = { shown: T.shown(sel), value: sel.value };
      // Linked to a Philadelphia row: Philadelphia.
      Object.assign(coin, { coinId: "C-2005-M-10C-09", mint: "", year: 2005, denom: "10C" });
      showBrowseEditView(coin);
      out.openPhil = { shown: T.shown(sel), value: sel.value };
      // A real mint mark shows itself.
      Object.assign(coin, { coinId: "C-1875-M-1C-01", mint: "S" });
      showBrowseEditView(coin);
      out.openS = T.shown(sel);
    } finally {
      Object.assign(coin, saved);
      __setBrowseEditWriteEnabledForTest(null);
      navigateNow("dashboard");
    }
    return out;
  });
  ok("M2a Edit Coin: picking \"— none (Other) —\" keeps it shown; MintMark still saves blank",
    M2.picked.applied && M2.picked.shown === "— none (Other) —" && M2.picked.value === "" && M2.picked.form === "", M2);
  ok("M2b Edit Coin opens on \"— none (Other) —\" for a coin linked to an unmarked San Francisco row", M2.openOther.shown === "— none (Other) —" && M2.openOther.value === "", M2);
  ok("M2c Edit Coin opens on \"— none (Philadelphia) —\" for a coin linked to an unmarked Philadelphia row, and on S for an S coin",
    M2.openPhil.shown === "— none (Philadelphia) —" && M2.openS === "S — San Francisco", M2);

  // ---------- M3 a Staging draft opened for edit ------------------------------
  const M3 = await page.evaluate(async () => {
    const T = __t;
    navigate("addcoin");
    applyCoinDraftToForm({ denom: "1C", year: "1875", mint: "", coinId: "C-1875-M-1C-01", description: "Indian Head Cent" });
    const a = T.shown(document.getElementById("mintMark"));
    navigate("addcoin");
    applyCoinDraftToForm({ denom: "10C", year: "2005", mint: "", coinId: "C-2005-M-10C-09", description: "Roosevelt Dime" });
    const b = T.shown(document.getElementById("mintMark"));
    navigateNow("dashboard");
    return { a, b };
  });
  ok("M3 a draft linked to an unmarked non-Philadelphia row opens on \"— none (Other) —\"; a Philadelphia one on Philadelphia",
    M3.a === "— none (Other) —" && M3.b === "— none (Philadelphia) —", M3);

  // ---------- T1 Tap to label --------------------------------------------------
  const file = await page.evaluate(async () => {
    navigate("addcoin");
    const c = document.createElement("canvas"); c.width = 200; c.height = 120;
    c.getContext("2d").fillRect(0, 0, 200, 120);
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
    const filename = ADDCOIN_GALLERY_ID + "_reference_01.jpg";
    addGalleryEntry(ADDCOIN_GALLERY_ID, { type: "reference", url: URL.createObjectURL(blob), caption: "", filename });
    renderAddCoinPhotos();
    // Open the Photos section and every section inside it.
    for (let i = 0; i < 3; i++) {
      document.querySelectorAll('#view-addcoin [aria-expanded="false"]').forEach(h => {
        if (h.id === "addCoinPhotosHeader" || h.closest("#addCoinPhotoSections")) h.click();
      });
      await __t.sleep(40);
    }
    return filename;
  });
  const lineSel = `#addCoinPhotoSections .gc-thumb[data-file="${file}"] .gc-label-line`;
  const imgSel = `#addCoinPhotoSections .gc-thumb[data-file="${file}"] .gc-img`;
  const lineText = await page.textContent(lineSel);
  await page.click(lineSel); await page.waitForTimeout(150);
  const T1a = await page.evaluate(() => ({ open: mediaViewerIsOpen(), active: document.activeElement && document.activeElement.id,
    field: !document.getElementById("mediaViewerLabel").classList.contains("hidden") }));
  await page.evaluate(() => { document.getElementById("mediaViewerLabelCancel").click(); });
  await page.waitForTimeout(150);
  await page.click(imgSel); await page.waitForTimeout(150);
  const T1b = await page.evaluate(() => ({ open: mediaViewerIsOpen(), active: document.activeElement && document.activeElement.id,
    field: !document.getElementById("mediaViewerLabel").classList.contains("hidden") }));
  await page.evaluate(() => { document.getElementById("mediaViewerLabelCancel").click(); navigateNow("dashboard"); });
  ok("T1a \"Tap to label\" opens the viewer with the label field focused (keyboard up)",
    lineText === "Tap to label" && T1a.open && T1a.field && T1a.active === "mediaViewerLabelInput", { lineText, T1a });
  ok("T1b a tap on the photo itself opens the viewer with the field shown but not focused",
    T1b.open && T1b.field && T1b.active !== "mediaViewerLabelInput", T1b);
}, module);
