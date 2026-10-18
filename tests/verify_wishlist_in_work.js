// Wishlist "in work" placeholder (Ray, Oct 2026).
//
// The Wishlist screen has no live read, so renderWishlistGrid() rendered
// FAKE_WISHLIST (1916-D Mercury Dime, 1893-S Morgan Dollar, 1937-D 3-Legged
// Buffalo Nickel) in EVERY mode — a live session included. It now shows a
// plain "Wishlist: in work." note in the same container, the Share button is
// hidden (it would have shared the demo list), and the nav entry stays.
// Display only: nothing is written anywhere.

const { defineSuite } = require("./harness");

const DEMO_NAMES = ["1916-D Mercury Dime", "1893-S Morgan Dollar", "1937-D 3-Legged Buffalo Nickel"];

module.exports = defineSuite("wishlist-in-work", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  const check = (mode) => page.evaluate(({ mode, names }) => {
    __setLiveDataModeForTest(mode);
    navigate("wishlist");
    const container = document.getElementById("wishlistContainer");
    const view = document.getElementById("view-wishlist");
    const share = document.getElementById("wishlistShareBtn");
    const note = document.getElementById("wishlistInWorkNote");
    const text = view.innerText;
    const out = {
      active: view.classList.contains("active"),
      noteText: note ? note.textContent.trim() : null,
      noteInContainer: !!(note && container.contains(note)),
      noteVisible: !!(note && getComputedStyle(note).display !== "none" && note.offsetHeight > 0),
      demoShown: names.filter(n => text.includes(n)),
      wishRows: container.querySelectorAll(".wish-item").length,
      shareHidden: getComputedStyle(share).display === "none",
      heading: view.querySelector("h2") ? view.querySelector("h2").textContent.trim() : ""
    };
    __setLiveDataModeForTest(null);
    navigate("dashboard");
    return out;
  }, { mode, names: DEMO_NAMES });

  for (const mode of ["live", "offline"]) {
    const r = await check(mode);
    ok(r.active, `W1 [${mode}] Wishlist screen still opens (nav entry kept)`);
    ok(r.noteText === "Wishlist: in work.", `W2 [${mode}] shows "Wishlist: in work." (got ${JSON.stringify(r.noteText)})`);
    ok(r.noteInContainer && r.noteVisible, `W3 [${mode}] the note sits visibly in the same container the list used`);
    ok(r.demoShown.length === 0, `W4 [${mode}] no made-up Wishlist coin is shown (found: ${r.demoShown.join(", ") || "none"})`);
    ok(r.wishRows === 0, `W5 [${mode}] no Wishlist item rows render (got ${r.wishRows})`);
    ok(r.shareHidden, `W6 [${mode}] Share button is hidden (it would share the demo list)`);
    ok(r.heading === "Wishlist", `W7 [${mode}] heading unchanged`);
  }

  // The demo code is hidden, not deleted.
  const kept = await page.evaluate(() => typeof FAKE_WISHLIST !== "undefined" && FAKE_WISHLIST.length === 3
    && typeof showWishlistDetail === "function");
  ok(kept, "W8 FAKE_WISHLIST and the detail view code are kept (hidden, not deleted)");

  // Share handler is inert even if the button were clicked.
  const shared = await page.evaluate(() => {
    let called = 0;
    const orig = window.shareContent;
    window.shareContent = () => { called++; };
    navigate("wishlist");
    document.getElementById("wishlistShareBtn").click();
    window.shareContent = orig;
    navigate("dashboard");
    return called;
  });
  ok(shared === 0, `W9 Share never sends the demo list (shareContent calls: ${shared})`);

  // Smoke: no horizontal overflow on the Wishlist screen.
  const overflow = await page.evaluate(() => {
    navigate("wishlist");
    const o = document.documentElement.scrollWidth > window.innerWidth;
    navigate("dashboard");
    return o;
  });
  ok(!overflow, "W10 no horizontal overflow on the Wishlist screen");
}, module);
