// Notes & Facts labels (display only).
//  Browse detail: "Catalog Notes" and "Fun Fact" carry no trailing
//  descriptor; the coin's own "Notes" keeps its "yours" tag.
//  Edit Coin: the tags are shortened to what tells Ray whether he can change
//  the field — "Fun Fact read-only", "Catalog Notes read-only",
//  "Notes editable".
// The texts themselves, the data reads and the column mapping are unchanged.

const { defineSuite } = require("./harness");

const CATALOG_NOTES = "Counterfeits are common; check the mintmark.";
const FUN_FACT = "A famously low mintage.";
const OWN_NOTES = "Kept in the blue Whitman folder.";

module.exports = defineSuite("catalog-notes-label", async ({ ok, openApp, PHONE, TABLET }) => {
  for (const [vpName, vp] of [["phone", PHONE], ["tablet", TABLET]]) {
    const page = await openApp(vp);
    const tag = (s) => s + " [" + vpName + "]";

    const R = await page.evaluate(({ CATALOG_NOTES, FUN_FACT, OWN_NOTES }) => {
      __setLiveDataModeForTest("live");
      __setBrowseEditWriteEnabledForTest(false);
      __setLiveDbCoinsForTest([{
        denom: "10C", year: 1916, mint: "D", variety: "", description: "Mercury Dime",
        finish: "Business Strike", designation: "", coinId: "C-1916-D-10C-01", pcgs: "", mintage: null,
        gsid: "", funFact: FUN_FACT, notes: CATALOG_NOTES
      }]);
      const coin = { id: "AY-92001", name: "Mercury Dime", description: "Mercury Dime", denom: "10C", year: 1916,
        mint: "D", variety: "", grade: "VG-8", gradeSource: "PCGS", value: 1200, finish: "Business Strike",
        coinId: "C-1916-D-10C-01", status: "Owned", remarks: OWN_NOTES };
      __setLiveCoinsForTest([coin]);
      navigate("browse");

      // --- Browse detail, Notes & Facts ---
      showBrowseDetail(coin);
      const acc = document.getElementById("detailAccordions");
      acc.querySelectorAll(".accordion-header").forEach(h => { if (h.getAttribute("aria-expanded") !== "true") h.click(); });
      const labels = [...acc.querySelectorAll(".detail-label")];
      const read = (re) => {
        const l = labels.find(x => re.test(x.textContent.trim()));
        return l ? { rendered: l.innerText.replace(/\s+/g, " ").trim(), kids: l.children.length,
          tagText: (l.querySelector(".field-origin") || {}).textContent || null,
          body: l.nextElementSibling ? l.nextElementSibling.textContent.trim() : null } : null;
      };
      const detail = { cat: read(/^Catalog Notes/i), fun: read(/^Fun Fact/i), own: read(/^Notes\b/i) };

      // --- Edit Coin, Notes & Facts ---
      showBrowseEditView(coin);
      const body = document.getElementById("editCoinNotesBody");
      const edit = {
        labels: [...body.querySelectorAll("label")].map(l => l.textContent.replace(/\s+/g, " ").trim()),
        funText: document.getElementById("browseEditFunFact").textContent.trim(),
        catText: document.getElementById("browseEditCatalogNotes").textContent.trim(),
        ownText: document.getElementById("browseEditNotes").value,
      };

      __setBrowseEditWriteEnabledForTest(null);
      __setLiveDbCoinsForTest(null); __setLiveCoinsForTest(null); __setLiveDataModeForTest(null);
      return { detail, edit };
    }, { CATALOG_NOTES, FUN_FACT, OWN_NOTES });

    const D = R.detail, E = R.edit;
    ok(D.cat && D.fun && D.own, tag("A0 fixture: Notes & Facts shows Catalog Notes, Fun Fact and Notes"), D);
    // Browse detail
    ok(D.cat && D.cat.rendered === "CATALOG NOTES" && D.cat.kids === 0, tag("A1 detail: the label reads exactly 'CATALOG NOTES' with nothing after it"), D.cat);
    ok(D.cat && D.cat.body === CATALOG_NOTES, tag("A2 detail: the catalog notes text still renders under the label"), D.cat);
    ok(D.fun && D.fun.rendered === "FUN FACT" && D.fun.kids === 0, tag("A3 detail: the label reads exactly 'FUN FACT' with no 'catalog reference' tag"), D.fun);
    ok(D.fun && D.fun.body === FUN_FACT, tag("A4 detail: the fun fact text still renders under the label"), D.fun);
    ok(D.own && D.own.tagText === "yours" && D.own.body === OWN_NOTES, tag("A5 detail: the coin's own Notes keeps its 'yours' tag and its text (unchanged)"), D.own);
    // Edit Coin
    ok(E.labels.includes("Catalog Notes read-only"), tag("B1 Edit Coin: 'Catalog Notes read-only'"), E.labels);
    ok(E.labels.includes("Fun Fact read-only"), tag("B2 Edit Coin: 'Fun Fact read-only'"), E.labels);
    ok(E.labels.includes("Notes editable"), tag("B3 Edit Coin: 'Notes editable'"), E.labels);
    ok(!E.labels.some(l => /catalog reference|yours/i.test(l)), tag("B4 Edit Coin: no 'catalog reference' or 'yours' left on any label"), E.labels);
    ok(E.catText === CATALOG_NOTES && E.funText === FUN_FACT && E.ownText === OWN_NOTES, tag("B5 Edit Coin: catalog notes, fun fact and own notes texts still render"), E);

    await page.context().close();
  }
}, module);
