// Add Coin: Mint Mark "— none (Other) —" — a coin with genuinely no mint
// mark struck somewhere OTHER than Philadelphia. DB_Coins.MintMark is blank
// for these rows too (same as an ordinary Philadelphia coin), so the base
// matcher's normal key can't tell them apart; this reads DB_Coins.Mint (the
// FULL facility name, backfilled 2026-08-29 on all 236 real blank-MintMark
// rows) via a dedicated lookup, with "Multiple Facilities" (an anonymous
// bullion Eagle documented as struck at more than one facility with no
// distinguishing mark) surfaced as its own distinct outcome rather than a
// normal candidate. See CLAUDE.md's Mint Mark "None (Other)" section.

const { defineSuite } = require("./harness");

module.exports = defineSuite("addcoin-mintmark-other", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  function setup(denom, year, variety) {
    return page.evaluate(({ denom, year, variety }) => {
      navigate("addcoin");
      document.getElementById("denomination").value = denom;
      document.getElementById("denomination").dispatchEvent(new Event("change"));
      document.getElementById("year").value = year;
      document.getElementById("year").dispatchEvent(new Event("input"));
      if (variety !== undefined) document.getElementById("variety").value = variety;
      const mm = document.getElementById("mintMark");
      mm.value = "__OTHER_MINT__";
      mm.dispatchEvent(new Event("change"));
    }, { denom, year, variety });
  }

  function readState() {
    return page.evaluate(() => ({
      mmValue: document.getElementById("mintMark").value,
      notFoundShown: !document.getElementById("mintMarkOtherNotFoundBanner").classList.contains("hidden"),
      appliedShown: !document.getElementById("mintMarkOtherAppliedBanner").classList.contains("hidden"),
      appliedMsg: document.getElementById("mintMarkOtherAppliedMsg").innerHTML,
      panelShown: !document.getElementById("mintMarkOtherAmbiguousPanel").classList.contains("hidden"),
      candidateRows: document.querySelectorAll("#mintMarkOtherAmbiguousList .ambiguous-match").length,
      mfOptionShown: !document.getElementById("mintMarkOtherMultipleFacilitiesOption").classList.contains("hidden"),
      description: document.getElementById("description").value
    }));
  }

  // ---------- A. Dropdown option present, correct position, real codes untouched ----------
  const A = await page.evaluate(() => {
    navigate("addcoin");
    const opts = [...document.querySelectorAll("#mintMark option")].map(o => ({ value: o.value, text: o.textContent.trim() }));
    return opts;
  });
  ok(JSON.stringify(A) === JSON.stringify([
    { value: "", text: "— none (Philadelphia) —" },
    { value: "__OTHER_MINT__", text: "— none (Other) —" },
    { value: "P", text: "P — Philadelphia (explicit)" },
    { value: "D", text: "D — Denver" },
    { value: "S", text: "S — San Francisco" },
    { value: "CC", text: "CC — Carson City" },
    { value: "O", text: "O — New Orleans" },
    { value: "W", text: "W — West Point" }
  ]), "A1 \"— none (Other) —\" added right after Philadelphia; every real code (P/D/S/CC/O/W) unchanged, same order — " + JSON.stringify(A));

  // ---------- B. Missing prerequisites (Year or Denom blank): no lookup fires ----------
  const B = await page.evaluate(() => {
    navigate("addcoin");
    document.getElementById("denomination").value = "1C";
    document.getElementById("denomination").dispatchEvent(new Event("change"));
    // Year deliberately left blank.
    const mm = document.getElementById("mintMark");
    mm.value = "__OTHER_MINT__";
    mm.dispatchEvent(new Event("change"));
    return {
      mmValue: mm.value,
      anyBannerShown: !document.getElementById("mintMarkOtherNotFoundBanner").classList.contains("hidden") ||
                      !document.getElementById("mintMarkOtherAppliedBanner").classList.contains("hidden") ||
                      !document.getElementById("mintMarkOtherAmbiguousPanel").classList.contains("hidden")
    };
  });
  ok(B.mmValue === "", "B1 the select still normalizes back to \"\" even when the lookup can't run");
  ok(B.anyBannerShown === false, "B2 with Year blank, no banner/panel opens — nothing to search on yet");

  // ---------- C. Single non-Philadelphia match applies directly ----------
  await setup("1C", "1875");
  const C = await readState();
  ok(C.mmValue === "", "C1 \"None (Other)\" never itself writes a persisted MintMark value — stays \"\", same as Philadelphia (Q2)");
  ok(C.appliedShown && /San Francisco/.test(C.appliedMsg) && /C-1875-M-1C-01/.test(C.appliedMsg),
    "C2 a single real-facility match applies directly, naming the actual mint — " + C.appliedMsg);
  ok(C.description === "Indian Head Cent", "C3 identity fields (Description, etc.) autofill from the matched row, same as any other lookup");

  // ---------- D. 2+ real candidates, no Multiple Facilities: normal ambiguous picker ----------
  await setup("5C", "1913");
  const D = await readState();
  ok(D.panelShown && D.candidateRows === 2, "D1 two real candidates (Denver, San Francisco) both surface in the picker");
  ok(D.mfOptionShown === false, "D2 no Multiple Facilities option shown when none exists for this Year+Denom");

  // Picking the second candidate applies it (not the first) — proves this is
  // a real, unforced choice, not an accidental auto-pick.
  const Dpick = await page.evaluate(() => {
    const cards = document.querySelectorAll("#mintMarkOtherAmbiguousList .ambiguous-match");
    cards[1].click();
    return {
      appliedMsg: document.getElementById("mintMarkOtherAppliedMsg").innerHTML,
      panelHidden: document.getElementById("mintMarkOtherAmbiguousPanel").classList.contains("hidden")
    };
  });
  ok(/San Francisco/.test(Dpick.appliedMsg) && /C-1913-M-5C-06/.test(Dpick.appliedMsg) && Dpick.panelHidden,
    "D3 clicking the SECOND candidate applies that one (San Francisco), panel closes — " + Dpick.appliedMsg);

  // ---------- E. Variety soft narrow (Q4) ----------
  await setup("10C", "1944", "Doubled Die");
  const E = await readState();
  ok(E.appliedShown && /San Francisco/.test(E.appliedMsg) && /C-1944-M-10C-08/.test(E.appliedMsg),
    "E1 a typed Variety that matches exactly one candidate narrows straight to it (soft narrow, per Q4) — " + E.appliedMsg);

  await setup("10C", "1944", "");
  const E2 = await readState();
  ok(E2.panelShown && E2.candidateRows === 2,
    "E2 -- same Year+Denom with Variety blank stays genuinely ambiguous (2 candidates), confirming the narrow is variety-driven, not automatic");

  // ---------- F. Sole "Multiple Facilities" match: its own distinct outcome ----------
  await setup("$1", "1986");
  const F = await readState();
  ok(F.appliedShown && !F.panelShown, "F1 a sole Multiple-Facilities match applies directly (nothing to disambiguate), not through the picker");
  ok(/Struck at multiple facilities/.test(F.appliedMsg) && /mint not individually identifiable/.test(F.appliedMsg) && /C-1986-M-\$1-05/.test(F.appliedMsg),
    "F2 -- worded as its own distinct outcome, never as if \"Multiple Facilities\" were a place name — " + F.appliedMsg);

  // ---------- G. Mixed real + Multiple Facilities: real candidates in the list, MF offered separately ----------
  await setup("$1", "2001");
  const G = await readState();
  ok(G.panelShown && G.candidateRows === 1,
    "G1 the picker list shows ONLY the real candidate (West Point) — Multiple Facilities is not mixed into it as a peer");
  ok(G.mfOptionShown, "G2 Multiple Facilities is offered as its own separate, clearly-labeled option below the list");

  const Gclick = await page.evaluate(() => {
    document.getElementById("mintMarkOtherMultipleFacilitiesOption").click();
    return {
      appliedMsg: document.getElementById("mintMarkOtherAppliedMsg").innerHTML,
      panelHidden: document.getElementById("mintMarkOtherAmbiguousPanel").classList.contains("hidden")
    };
  });
  ok(/Struck at multiple facilities/.test(Gclick.appliedMsg) && /C-2001-M-\$1-08/.test(Gclick.appliedMsg) && Gclick.panelHidden,
    "G3 clicking the Multiple Facilities option applies IT (not the real West Point candidate) with the distinct wording — " + Gclick.appliedMsg);

  // ---------- H. Philadelphia itself is excluded, even when Mint is explicitly populated ----------
  await setup("10C", "2005"); // only seeded row for this Year+Denom has mintFull "Philadelphia"
  const H = await readState();
  ok(H.notFoundShown, "H1 a blank-mint-mark row whose real Mint IS Philadelphia is correctly excluded — reports not-found, not a false match");

  // ---------- I. Genuine miss (no DB_Coins data at all for this Year+Denom) ----------
  await setup("50C", "1955");
  const I = await readState();
  ok(I.notFoundShown, "I1 a Year+Denom with no blank-mint-mark DB_Coins rows at all reports not-found cleanly");

  // ---------- J. The resolved pick actually sticks through Save, and mint stays blank on the draft ----------
  // Forces the flag off via the test seam so this exercises the session-
  // only mockup save path (a direct FAKE_STAGING push) it was written
  // against — ENABLE_ADDCOIN_WRITE now ships on by default (see CLAUDE.md
  // "Real-Graph flags always on..."), and without this the real write path
  // would try a Graph call with no mock client configured and throw.
  const J = await page.evaluate(async () => {
    __setAddCoinWriteEnabledForTest(false);
    navigate("addcoin");
    document.getElementById("denomination").value = "1C";
    document.getElementById("denomination").dispatchEvent(new Event("change"));
    document.getElementById("year").value = "1875";
    document.getElementById("year").dispatchEvent(new Event("input"));
    const mm = document.getElementById("mintMark");
    mm.value = "__OTHER_MINT__";
    mm.dispatchEvent(new Event("change"));
    const before = FAKE_STAGING.length;
    await new Promise(r => { saveAddCoinForm("staging"); setTimeout(r, 400); });
    const row = FAKE_STAGING[FAKE_STAGING.length - 1];
    const res = { added: FAKE_STAGING.length - before, coinId: row && row.coinId, mint: row && row.mint };
    __setAddCoinWriteEnabledForTest(null);
    return res;
  });
  ok(J.added === 1 && J.coinId === "C-1875-M-1C-01", "J1 the \"Other\"-resolved pick is what Save actually commits");
  ok(J.mint === "", "J2 -- and the saved draft's own MintMark field is blank, never a leftover \"Other\" marker");

  // ---------- K. Reset clears every new element ----------
  const K = await page.evaluate(() => {
    navigate("addcoin");
    document.getElementById("denomination").value = "5C";
    document.getElementById("denomination").dispatchEvent(new Event("change"));
    document.getElementById("year").value = "1913";
    document.getElementById("year").dispatchEvent(new Event("input"));
    const mm = document.getElementById("mintMark");
    mm.value = "__OTHER_MINT__";
    mm.dispatchEvent(new Event("change")); // leaves the ambiguous panel open
    resetAddCoinForm();
    return {
      mmVal: document.getElementById("mintMark").value,
      notFoundHidden: document.getElementById("mintMarkOtherNotFoundBanner").classList.contains("hidden"),
      appliedHidden: document.getElementById("mintMarkOtherAppliedBanner").classList.contains("hidden"),
      panelHidden: document.getElementById("mintMarkOtherAmbiguousPanel").classList.contains("hidden"),
      mfHidden: document.getElementById("mintMarkOtherMultipleFacilitiesOption").classList.contains("hidden")
    };
  });
  ok(K.mmVal === "" && K.notFoundHidden && K.appliedHidden && K.panelHidden && K.mfHidden,
    "K1 resetAddCoinForm() clears the select and hides every new banner/panel/option: " + JSON.stringify(K));

  // ---------- L. mapWorkbookRowToDbCoin() reads the real Mint column into mintFull ----------
  const L = await page.evaluate(() => {
    const mapped = mapWorkbookRowToDbCoin({ "CoinID": "C-TEST", "Year": "2001", "MintMark": "", "Mint": "Multiple Facilities", "Denomination": "$1" });
    const mappedBlank = mapWorkbookRowToDbCoin({ "CoinID": "C-TEST2", "Year": "2001", "MintMark": "", "Denomination": "$1" });
    return { mintFull: mapped.mintFull, blankMintFull: mappedBlank.mintFull };
  });
  ok(L.mintFull === "Multiple Facilities", "L1 mapWorkbookRowToDbCoin() reads the real DB_Coins.Mint column into mintFull");
  ok(L.blankMintFull === "", "L2 -- and a row with no Mint value maps to a blank string, not undefined/throw");

  // ---------- M. Real bug trap: the new panel/option have their OWN scoped .hidden rule ----------
  // Same recurring trap this file has hit before (no generic .hidden rule) —
  // check real computed display, not just classList.
  const M = await page.evaluate(() => {
    navigate("addcoin");
    const panel = document.getElementById("mintMarkOtherAmbiguousPanel");
    const mfOpt = document.getElementById("mintMarkOtherMultipleFacilitiesOption");
    return {
      panelHiddenClass: panel.classList.contains("hidden"), panelDisplay: getComputedStyle(panel).display,
      mfHiddenClass: mfOpt.classList.contains("hidden"), mfDisplay: getComputedStyle(mfOpt).display
    };
  });
  ok(M.panelHiddenClass && M.panelDisplay === "none", "M1 mintMarkOtherAmbiguousPanel is GENUINELY hidden (computed display:none), not just classList-hidden");
  ok(M.mfHiddenClass && M.mfDisplay === "none", "M2 mintMarkOtherMultipleFacilitiesOption is GENUINELY hidden too");

  // ---------- N. Nav smoke ----------
  const N = await page.evaluate(() => {
    const routes = ["dashboard", "browse", "albums", "sets", "wishlist", "stats", "acquisitions", "addcoin"];
    const bad = [];
    routes.forEach(r => { try { navigate(r); } catch (e) { bad.push(r + ": " + e.message); } });
    navigate("addcoin");
    return { bad, overflow: document.body.scrollWidth > window.innerWidth };
  });
  ok(N.bad.length === 0, "N1 every route still navigates cleanly: " + N.bad.join("; "));
  ok(N.overflow === false, "N2 no horizontal overflow at 412px");
}, module);
