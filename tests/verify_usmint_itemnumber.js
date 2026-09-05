// DB_Coins.USMint# standardized to match DB_Sets' own naming/terminology
// (Ray's explicit ask) — exposed internally as `itemNumber` on both sides,
// using the Mint's own "Item Number" wording in the UI. See CLAUDE.md
// "U.S. Mint Item Number: naming standardized across DB_Coins/DB_Sets".

const { defineSuite } = require("./harness");

module.exports = defineSuite("usmint-itemnumber", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  const A = await page.evaluate(() => {
    const real = mapWorkbookRowToDbCoin({ "USMint#": "21RJ" });
    const fallbackItemNumber = mapWorkbookRowToDbCoin({ "ItemNumber": "21RJ" });
    const fallbackItemNumberSpaced = mapWorkbookRowToDbCoin({ "Item Number": "21RJ" });
    const blank = mapWorkbookRowToDbCoin({});
    return {
      real: real.itemNumber,
      fallbackItemNumber: fallbackItemNumber.itemNumber,
      fallbackItemNumberSpaced: fallbackItemNumberSpaced.itemNumber,
      blank: blank.itemNumber
    };
  });
  ok(A.real === "21RJ", "A1 mapWorkbookRowToDbCoin() reads the real column, USMint#, into itemNumber");
  ok(A.fallbackItemNumber === "21RJ", "A2 falls back to ItemNumber if the workbook column is ever renamed to match DB_Sets");
  ok(A.fallbackItemNumberSpaced === "21RJ", "A3 falls back to 'Item Number' (spaced) too");
  ok(A.blank === "", "A4 a row with none of the three candidates maps to a blank string, not undefined/throw");

  const B = await page.evaluate(() => {
    const label = document.querySelector('label[for="addSetProductCode"]');
    return { text: label ? label.textContent.trim() : null };
  });
  ok(B.text === "U.S. Mint Item Number (if known)",
    "B1 Add Set's field label uses the Mint's own \"Item Number\" terminology, matching DB_Sets.ItemNumber");
}, module);
