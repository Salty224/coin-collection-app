// Browse detail -> Notes & Facts: the DB_Coins.Notes block is labelled just
// "CATALOG NOTES" (rendered uppercase), with no trailing "catalog reference"
// descriptor. Display only — the notes text itself, the data read, and the
// other Notes & Facts labels are unchanged.

const { defineSuite } = require("./harness");

module.exports = defineSuite("catalog-notes-label", async ({ ok, openApp, PHONE, TABLET }) => {
  for (const [vpName, vp] of [["phone", PHONE], ["tablet", TABLET]]) {
    const page = await openApp(vp);
    const tag = (s) => s + " [" + vpName + "]";

    const R = await page.evaluate(() => {
      __setLiveDataModeForTest("live");
      __setLiveDbCoinsForTest([{
        denom: "10C", year: 1916, mint: "D", variety: "", description: "Mercury Dime",
        finish: "Business Strike", designation: "", coinId: "C-1916-D-10C-01", pcgs: "", mintage: null,
        gsid: "", funFact: "A famously low mintage.", notes: "Counterfeits are common; check the mintmark."
      }]);
      const coin = { id: "AY-92001", name: "Mercury Dime", description: "Mercury Dime", denom: "10C", year: 1916,
        mint: "D", variety: "", grade: "VG-8", gradeSource: "PCGS", value: 1200, finish: "Business Strike",
        coinId: "C-1916-D-10C-01", status: "Owned", remarks: "Kept in the blue Whitman folder." };
      __setLiveCoinsForTest([coin]);
      navigate("browse");
      showBrowseDetail(coin);
      const acc = document.getElementById("detailAccordions");
      acc.querySelectorAll(".accordion-header").forEach(h => { if (h.getAttribute("aria-expanded") !== "true") h.click(); });
      const labels = [...acc.querySelectorAll(".detail-label")];
      const cat = labels.find(l => /^Catalog Notes/i.test(l.textContent.trim()));
      const fun = labels.find(l => /^Fun Fact/i.test(l.textContent.trim()));
      const own = labels.find(l => /^Notes\b/i.test(l.textContent.trim()));
      const out = {
        found: !!cat,
        rendered: cat ? cat.innerText.trim() : null,
        text: cat ? cat.textContent.trim() : null,
        childCount: cat ? cat.children.length : null,
        notesText: cat && cat.nextElementSibling ? cat.nextElementSibling.textContent.trim() : null,
        funTag: fun ? (fun.querySelector(".field-origin") || {}).textContent : null,
        ownTag: own ? (own.querySelector(".field-origin") || {}).textContent : null,
      };
      __setLiveDbCoinsForTest(null); __setLiveCoinsForTest(null); __setLiveDataModeForTest(null);
      return out;
    });
    ok(R.found, tag("A0 fixture: the coin's Notes & Facts shows a Catalog Notes block"), R);
    ok(R.rendered === "CATALOG NOTES" && R.text === "Catalog Notes" && R.childCount === 0,
      tag("A1 the label reads exactly 'CATALOG NOTES' with nothing after it"), R);
    ok(R.notesText === "Counterfeits are common; check the mintmark.", tag("A2 the catalog notes text itself still renders under the label"), R.notesText);
    // Guards on scope: only Catalog Notes changed.
    ok(R.funTag === "catalog reference" && R.ownTag === "yours", tag("A3 Fun Fact and Notes keep their own tags (unchanged by this commit)"), R);

    await page.context().close();
  }
}, module);
