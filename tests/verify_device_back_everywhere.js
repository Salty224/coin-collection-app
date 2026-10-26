// Device Back on every screen, the Dashboard's exit, Back inside a dialog,
// and two C2 follow-ups (Oct 2026, claude/photos-wait-for-save). Rebuilt
// after Ray's tablet test of 0a0cbd1: ONE Back always worked, a SECOND Back
// in a row left the app.
//
// WHY. Chrome skips, on Back, a history entry the page added another entry
// on top of without a tap in between. The guard used to put its entry back
// inside the Back handler (never a tap), so the entry under it was skipped.
// Now the app keeps a short stack, adds one entry per tap or key press, and
// a caught Back just steps down it. Headless Chromium doesn't apply Chrome's
// skip rule to script-driven Backs, so the C blocks EMULATE it (__chrome):
// every pushState records whether a tap came first, and the device Back
// skips entries the rule would skip. The old design fails C1–C5 by name.
//
//   SELF the shared check helper's must-fail self-check
//   W1  the discard dialog says "…and haven't saved." (no "them")
//   F1  Edit Set's Fun Fact is read-only text, the Set's own catalog fact;
//       hidden when there is none; never counted by the leave warning
//   K1  device Back = the app's own Back on: Catalog, a coin's page, a
//       Set's page, the album list, an open album, Docket, Staging Review,
//       Ledger, Acquisitions
//   C1  (Chrome rule) coin page -> Back -> grid -> Back -> Dashboard
//   C2  (Chrome rule) open album -> Back -> list -> Back -> Dashboard
//   C3  (Chrome rule) Edit Coin, Notes changed: Back asks; Back with the
//       dialog open = Keep editing (text kept, still in the app); Back asks
//       again
//   C4  (Chrome rule) Dashboard: Back says "Press Back again to exit"; a
//       second Back within 2 s leaves; after the window a tap re-arms and
//       Back says it again
//   C5  (Chrome rule) freshly opened: the first Back leaves (no tap yet,
//       Chrome skips); after one tap Back is caught (Ray's Q1)
//   D1  Dashboard Back: the toast, no dialog, steps down to the page's own
//       entry; the Stay / Leave prompt is gone
//   D2  after 2 s the entry is back and Back says it again; a tap during
//       the window cancels it
//   D3  the exit window landing on an older entry (left by a reload) walks
//       out past it
//   Q1  Back inside a confirmation dialog runs its Cancel (never the
//       other button); an OK-only dialog closes; one with no safe button
//       just closes, running nothing
//   Q2  Back inside the discard dialog = Keep editing (text kept)
//   P1  Back with the year-filter panel or the photo viewer open closes
//       just that
//   S1  entries are added only on a tap or key press (up to the stack's
//       depth); a caught Back adds nothing while one of ours is left
//   S2  an entry left by a reload is reused in place, never stacked on
//   S3  while a Save runs Back changes nothing; while the splash is up
//       Back is not caught (nothing is open yet)

const { defineSuite } = require("./harness");

async function setup(page) {
  await page.evaluate(() => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    __setDocketWriteEnabledForTest(false);
    window.__db = {
      sleep,
      reset() {
        const ov = document.getElementById("writeGuardOverlay"); ov.classList.add("hidden");
        document.getElementById("writeGuardBtns").innerHTML = "";
        if (mediaViewerIsOpen()) closeMediaViewer();
        leaveGuard.leaving = false;
        cancelDashboardExit();
        navigateNow("dashboard");
        if (!leaveGuardIsTop()) armLeaveGuard();
      },
      view() { const v = document.querySelector(".view.active"); return v ? v.id.replace("view-", "") : ""; },
      shown(id) { const el = document.getElementById(id); return !!el && el.style.display === "block"; },
      dialogOpen() { return !document.getElementById("writeGuardOverlay").classList.contains("hidden"); },
      dialog() {
        return { open: this.dialogOpen(), title: document.getElementById("writeGuardTitle").textContent,
          body: document.getElementById("writeGuardBody").textContent,
          buttons: [...document.querySelectorAll("#writeGuardBtns button")].map(b => b.textContent) };
      },
      click(label) { const b = [...document.querySelectorAll("#writeGuardBtns button")].find(x => x.textContent === label); if (b) b.click(); return !!b; },
      top() { return leaveGuardIsTop(); },
      toast() { const t = document.getElementById("toast"); return t.classList.contains("show") ? t.textContent : ""; },
      clearToast() { const t = document.getElementById("toast"); t.classList.remove("show"); t.textContent = ""; },
      // The device Back. With neither our entry nor the viewer's on top a
      // real Back would leave the page (the very bug a broken guard shows),
      // so a same-page floor is pushed first: the check fails by name
      // instead of the suite losing its page.
      async back() {
        if (!leaveGuardIsTop() && !(history.state && history.state.mediaViewer)) history.pushState({ testFloor: true }, "");
        history.back(); await sleep(150);
      },
      // What the screen looks like, to compare a device Back with the
      // chrome Back from the same starting point.
      snap() {
        return [this.view(), this.shown("browseDetailView"), this.shown("browseGridView"),
          this.shown("albumsDetailView") && this.view() === "albums",
          document.getElementById("browseTitle") ? document.getElementById("browseTitle").textContent : ""].join("|");
      },
    };
    // EMULATED CHROME BACK. stack mirrors history from two floors up:
    // [0] = outside the app, [1] = the page's own entry, then ours. A
    // pushState made with no tap since the page arrived on its current entry
    // (a tap credits one push; any history move clears the credit) marks
    // that entry as skippable (Chrome's rule); the device Back skips those.
    // A tap also clears the mark on every entry of the page. Landing on [0]
    // means the app was left: reported, not navigated to.
    const rp = history.pushState.bind(history), rb = history.back.bind(history), rg = history.go.bind(history);
    window.__chrome = {
      on: false, stack: [], idx: 0, credit: false, pushes: 0,
      install() {
        this.uninstall();
        const D = __db; D.reset();
        leaveGuard.expectPop = false; leaveGuard.rearmAfterPop = false;
        rp({ testFloor: "B" }, ""); rp({ testFloor: "A" }, "");
        this.stack = [{ skip: false }, { skip: false }]; this.idx = 1; this.credit = false; this.pushes = 0; this.on = true;
        const self = this;
        history.pushState = function (st, t, u) {
          if (self.on) {
            const had = self.credit; self.credit = false;
            if (!had) self.stack[self.idx].skip = true;
            self.stack = self.stack.slice(0, self.idx + 1); self.stack.push({ skip: false }); self.idx++;
            if (st && st.coinLeaveGuard) self.pushes++;
          }
          return rp(st, t, u);
        };
        history.back = function () { if (self.on) { self.idx--; self.credit = false; } return rb(); };
        history.go = function (n) { if (self.on) { self.idx += n; self.credit = false; } return rg(n); };
        // A fresh page: our first entry goes on with no tap.
        leaveGuard.depth = 0; armLeaveGuard();
      },
      uninstall() { this.on = false; history.pushState = rp; history.back = rb; history.go = rg; },
      // The device's Back under Chrome's rule.
      async press() {
        let j = this.idx - 1;
        while (j > 0 && this.stack[j].skip) j--;
        if (j <= 0) return "left the app";
        const n = j - this.idx; this.idx = j; this.credit = false; rg(n); await sleep(160);
        return "stayed";
      },
    };
    // A tap (Chrome: user activation) credits the next push and clears the
    // skip mark on every entry of the page.
    const credit = (e) => {
      const C = window.__chrome;
      if (!e.isTrusted || !C) return;
      C.credit = true;
      for (let i = 1; i < C.stack.length; i++) C.stack[i].skip = false;
    };
    window.addEventListener("pointerup", credit, true);
    window.addEventListener("keydown", credit, true);
  });
}

module.exports = defineSuite("device-back-everywhere", async ({ openApp, check, selfCheck, PHONE }) => {
  const ok = check;
  selfCheck(ok);
  const page = await openApp(PHONE);
  await setup(page);
  // A tap the app sees as the user's (a trusted key press: does nothing
  // else in the app).
  const tap = async (n) => { for (let i = 0; i < (n || 1); i++) { await page.keyboard.press("F2"); await page.waitForTimeout(30); } };

  // ---------- W1 the discard dialog wording ---------------------------------
  const W1 = await page.evaluate(async () => {
    const D = __db; D.reset();
    const coin = activeCoins().find(c => c.id === "AY-00022");
    navigate("browse"); showBrowseDetail(coin); showBrowseEditSetView(coin); await D.sleep(40);
    const n = document.getElementById("editSetNotes");
    n.value = "Box is a bit worn"; n.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("navHomeBtn").click(); await D.sleep(40);
    const d = D.dialog();
    D.click("Discard"); await D.sleep(40);
    return d;
  });
  ok("W1 the discard dialog reads \"You've changed 1 field on AY-00022 and haven't saved.\" then the Discard/Keep lines",
    W1.open && W1.body === "You've changed 1 field on AY-00022 and haven't saved.Discard leaves this screen and loses those changes. Keep editing stays here so you can save.", W1);

  // ---------- F1 Edit Set's Fun Fact is read-only ---------------------------
  const F1 = await page.evaluate(async () => {
    const D = __db; D.reset();
    const set = activeCoins().find(c => c.id === "AY-00022");
    const before = coinDetailsFor("AY-00022").funFact;
    navigate("browse"); showBrowseDetail(set); showBrowseEditSetView(set); await D.sleep(40);
    const el = document.getElementById("editSetFunFact");
    const label = document.getElementById("editSetFunFactLabel");
    const r = {
      tag: el.tagName, readonly: el.classList.contains("readonly-field"),
      text: el.textContent, expected: catalogFunFactFor(set), shown: !el.classList.contains("hidden") && !label.classList.contains("hidden"),
      labelText: label.textContent, inputs: el.querySelectorAll("input,textarea").length,
      inFieldIds: EDIT_SET_FIELD_IDS.includes("editSetFunFact"),
    };
    // Changing its text (it isn't editable, but even if something did)
    // counts nothing and asks nothing.
    el.textContent = "something else";
    r.count = editSetChangedFieldCount();
    document.getElementById("navHomeBtn").click(); await D.sleep(40);
    r.asked = D.dialogOpen();
    if (r.asked) D.click("Discard");
    // Save from Edit Set leaves the stored Fun Fact as it was.
    navigate("browse"); showBrowseDetail(set); showBrowseEditSetView(set); await D.sleep(40);
    document.getElementById("browseEditSetSaveBtn").click(); await D.sleep(150);
    r.before = before; r.after = coinDetailsFor("AY-00022").funFact;
    // A Set with none: no label, no box.
    const blank = activeCoins().find(c => c.id === "AY-00018");
    navigate("browse"); showBrowseDetail(blank); showBrowseEditSetView(blank); await D.sleep(40);
    r.blankExpected = catalogFunFactFor(blank);
    r.blankHidden = el.classList.contains("hidden") && label.classList.contains("hidden") && el.textContent === "";
    D.reset();
    return r;
  });
  ok("F1a Edit Set's Fun Fact is read-only text (a div, no input), labelled read-only, the Set's catalog fact",
    F1.tag === "DIV" && F1.readonly && F1.inputs === 0 && /read-only/.test(F1.labelText) && F1.shown && F1.text === F1.expected && !!F1.text, F1);
  ok("F1b Fun Fact is not a counted field: changing it counts 0 and Close Drawer leaves without asking",
    !F1.inFieldIds && F1.count === 0 && !F1.asked, F1);
  ok("F1c Save Changes on Edit Set leaves the stored Fun Fact untouched", F1.after === F1.before, F1);
  ok("F1d a Set with no Fun Fact shows no label and no box", F1.blankExpected === "" && F1.blankHidden, F1);

  // ---------- K1 device Back = the app's own Back on every kind of screen ---
  const K1 = await page.evaluate(async () => {
    const D = __db;
    const coin = activeCoins().find(c => c.id === "AY-00001");
    const set = activeCoins().find(c => c.id === "AY-00022");
    const screens = {
      catalog: async () => { navigate("browse"); },
      coinPage: async () => { navigate("browse"); showBrowseDetail(coin); },
      setPage: async () => { navigate("sets"); showBrowseDetail(set); },
      albumList: async () => { navigate("albums"); },
      albumOpen: async () => { navigate("albums"); await showAlbumDetail(0); },
      docket: async () => { navigate("needsdbcoins"); },
      staging: async () => { navigate("staging"); },
      ledger: async () => { navigate("stats"); },
      acquisitions: async () => { navigate("acquisitions"); },
    };
    const out = {};
    for (const [name, open] of Object.entries(screens)) {
      D.reset(); await open(); await D.sleep(60);
      const start = D.snap(); const topBefore = D.top();
      document.getElementById("navBackBtn").click(); await D.sleep(80);
      const viaChrome = D.snap();
      D.reset(); await open(); await D.sleep(60);
      await D.back(); await D.sleep(40);
      out[name] = { start, topBefore, viaChrome, viaDevice: D.snap(), dialog: D.dialogOpen(), top: D.top() };
    }
    return out;
  });
  for (const [name, r] of Object.entries(K1)) {
    ok(`K1 ${name}: device Back does what the app's own Back does (and stays in the app)`,
      r.topBefore && r.viaDevice === r.viaChrome && r.viaDevice !== r.start && !r.dialog && r.top, r);
  }

  // ---------- C1–C5 two Backs in a row, under Chrome's skip rule ------------
  const coinPageWithTaps = async () => {
    await page.evaluate(() => __chrome.install());
    await tap(); await page.evaluate(() => { navigate("browse"); });
    await tap(); await page.evaluate(() => { showBrowseDetail(activeCoins().find(c => c.id === "AY-00001")); });
    await tap();
  };
  await coinPageWithTaps();
  const C1 = await page.evaluate(async () => {
    const C = __chrome, D = __db; D.clearToast();
    const r = { detail: D.shown("browseDetailView") };
    const pushes0 = C.pushes;
    r.b1 = await C.press(); r.after1 = { grid: D.shown("browseGridView"), detail: D.shown("browseDetailView"), view: D.view() };
    r.b2 = await C.press(); r.after2 = { view: D.view(), dialog: D.dialogOpen() };
    r.b3 = await C.press(); r.after3 = { view: D.view(), toast: D.toast(), dialog: D.dialogOpen() };
    r.pushesDuringBacks = C.pushes - pushes0;
    C.uninstall(); D.reset();
    return r;
  });
  ok("C1a (Chrome rule) coin page: the first Back goes to the grid", C1.detail && C1.b1 === "stayed" && C1.after1.grid && !C1.after1.detail, C1);
  ok("C1b (Chrome rule) the second Back in a row goes to the Dashboard, not out of the app",
    C1.b2 === "stayed" && C1.after2.view === "dashboard" && !C1.after2.dialog, C1);
  ok("C1c (Chrome rule) a third Back on the Dashboard says \"Press Back again to exit\" and stays",
    C1.b3 === "stayed" && C1.after3.view === "dashboard" && C1.after3.toast === "Press Back again to exit" && !C1.after3.dialog, C1);
  ok("C1d a caught Back adds no history entry while one of ours is left", C1.pushesDuringBacks === 0, C1);

  await page.evaluate(() => __chrome.install());
  await tap(); await page.evaluate(() => { navigate("albums"); });
  await tap(); await page.evaluate(async () => { await showAlbumDetail(0); });
  await tap();
  const C2 = await page.evaluate(async () => {
    const C = __chrome, D = __db;
    const r = { open: D.shown("albumsDetailView") };
    r.b1 = await C.press(); r.after1 = { view: D.view(), open: D.shown("albumsDetailView") };
    r.b2 = await C.press(); r.after2 = { view: D.view() };
    C.uninstall(); D.reset();
    return r;
  });
  ok("C2a (Chrome rule) open album: the first Back goes to the album list", C2.open && C2.b1 === "stayed" && C2.after1.view === "albums" && !C2.after1.open, C2);
  ok("C2b (Chrome rule) the second Back in a row goes to the Dashboard, not out of the app", C2.b2 === "stayed" && C2.after2.view === "dashboard", C2);

  await page.evaluate(() => __chrome.install());
  await tap(); await page.evaluate(() => { navigate("browse"); showBrowseDetail(activeCoins().find(c => c.id === "AY-00001")); });
  await tap(); await page.evaluate(async () => {
    __setBrowseEditWriteEnabledForTest(false);
    showBrowseEditView(activeCoins().find(c => c.id === "AY-00001")); await __db.sleep(40);
  });
  await tap();
  const C3 = await page.evaluate(async () => {
    const C = __chrome, D = __db;
    const n = document.getElementById("browseEditNotes");
    n.value = "Bought at the show"; n.dispatchEvent(new Event("input", { bubbles: true }));
    const r = {};
    r.b1 = await C.press(); r.d1 = D.dialog();
    r.b2 = await C.press();
    r.after2 = { dialog: D.dialogOpen(), edit: D.shown("browseEditView"), text: n.value };
    r.b3 = await C.press(); r.d3 = D.dialog().title;
    D.click("Discard"); await D.sleep(40);
    r.afterDiscard = { detail: D.shown("browseDetailView"), edit: D.shown("browseEditView") };
    C.uninstall(); __setBrowseEditWriteEnabledForTest(null); D.reset();
    return r;
  });
  ok("C3a (Chrome rule) Edit Coin with Notes changed: Back asks \"Discard unsaved edits?\"",
    C3.b1 === "stayed" && C3.d1.open && C3.d1.title === "Discard unsaved edits?", C3);
  ok("C3b (Chrome rule) Back with that dialog open = Keep editing: still in the app, on Edit Coin, the Notes kept",
    C3.b2 === "stayed" && !C3.after2.dialog && C3.after2.edit && C3.after2.text === "Bought at the show", C3);
  ok("C3c (Chrome rule) a third Back asks again; Discard then leaves for the coin's page",
    C3.b3 === "stayed" && C3.d3 === "Discard unsaved edits?" && C3.afterDiscard.detail && !C3.afterDiscard.edit, C3);

  await page.evaluate(() => __chrome.install());
  await tap(2);
  const C4 = await page.evaluate(async () => {
    const C = __chrome, D = __db; D.clearToast();
    const r = {};
    r.b1 = await C.press(); r.after1 = { view: D.view(), toast: D.toast(), dialog: D.dialogOpen() };
    r.b2 = await C.press();
    C.uninstall(); D.reset();
    return r;
  });
  ok("C4a (Chrome rule) Dashboard Back says \"Press Back again to exit\", no dialog, still in the app",
    C4.b1 === "stayed" && C4.after1.view === "dashboard" && C4.after1.toast === "Press Back again to exit" && !C4.after1.dialog, C4);
  ok("C4b (Chrome rule) a second Back within 2 seconds leaves the app (two presses in all)", C4.b2 === "left the app", C4);
  await page.evaluate(() => __chrome.install());
  await tap(2);
  const C4c1 = await page.evaluate(async () => { __db.clearToast(); return await __chrome.press(); });
  await page.waitForTimeout(2300);
  await tap();
  const C4c = await page.evaluate(async () => {
    const C = __chrome, D = __db; D.clearToast();
    const r = { first: null };
    r.b = await C.press(); r.toast = D.toast(); r.view = D.view();
    C.uninstall(); D.reset();
    return r;
  });
  ok("C4c (Chrome rule) after the 2 seconds and a tap, Back says it again instead of leaving",
    C4c1 === "stayed" && C4c.b === "stayed" && C4c.toast === "Press Back again to exit" && C4c.view === "dashboard", { C4c1, C4c });

  await page.evaluate(() => __chrome.install());
  const C5a = await page.evaluate(async () => { const r = await __chrome.press(); __chrome.uninstall(); __db.reset(); return r; });
  await page.evaluate(() => __chrome.install());
  await tap();
  const C5b = await page.evaluate(async () => {
    const C = __chrome, D = __db; D.clearToast();
    const r = { b: await C.press(), toast: D.toast(), view: D.view() };
    C.uninstall(); D.reset();
    return r;
  });
  ok("C5a (Chrome rule) freshly opened, no tap yet: the first Back leaves (Chrome skips the entry; known, Ray's Q1)", C5a === "left the app", C5a);
  ok("C5b (Chrome rule) after one tap the first Back is caught", C5b.b === "stayed" && C5b.view === "dashboard" && C5b.toast === "Press Back again to exit", C5b);

  // ---------- D1–D3 the Dashboard's exit (plain history) ---------------------
  await page.evaluate(() => {
    const D = __db; D.reset();
    history.pushState({ testFloor: "B" }, ""); history.pushState({ testFloor: "A" }, "");
    leaveGuard.depth = 0; armLeaveGuard();
  });
  await tap();
  const D1 = await page.evaluate(async () => {
    const D = __db; D.clearToast();
    await D.back();
    return { toast: D.toast(), dialog: D.dialogOpen(), view: D.view(), state: history.state, armed: dashboardExitArmed(),
      leaveFn: typeof window.askLeaveApp };
  });
  ok("D1a Dashboard Back shows \"Press Back again to exit\" with no dialog", D1.toast === "Press Back again to exit" && !D1.dialog && D1.view === "dashboard", D1);
  ok("D1b it steps down to the page's own entry, so the next Back is the device's own", D1.state && D1.state.testFloor === "A" && D1.armed, D1);
  const src = require("fs").readFileSync(require("path").join(__dirname, "..", "app.html"), "utf8");
  ok("D1c the Stay / Leave prompt is gone", !/Leave Salty's Cabinet\?/.test(src) && !/function askLeaveApp/.test(src), null);
  await page.waitForTimeout(2300);
  const D2 = await page.evaluate(async () => {
    const D = __db; D.clearToast();
    const r = { armed: dashboardExitArmed(), top: D.top() };
    await D.back(); r.toast = D.toast(); r.stateAfter = history.state;
    return r;
  });
  ok("D2a after 2 seconds the entry is back on top and Back says it again",
    !D2.armed && D2.top && D2.toast === "Press Back again to exit" && D2.stateAfter && D2.stateAfter.testFloor === "A", D2);
  await page.mouse.click(5, 300); await page.waitForTimeout(80);
  const D2b = await page.evaluate(() => ({ armed: dashboardExitArmed(), top: leaveGuardIsTop(), view: __db.view(), hit: document.elementFromPoint(5, 300).tagName }));
  ok("D2b a tap during the window cancels it and puts the entry back", !D2b.armed && D2b.top && D2b.view === "dashboard", D2b);

  const D3 = await page.evaluate(async () => {
    const D = __db; D.reset(); await D.sleep(40);
    history.pushState({ testFloor: "B" }, ""); history.pushState({ testFloor: "A" }, "");
    // An earlier page load left an old guard entry and a viewer entry.
    history.pushState({ coinLeaveGuard: "left-by-a-reload" }, ""); history.pushState({ mediaViewer: true }, "");
    leaveGuard.depth = 0; armLeaveGuard(); // reuses the viewer entry in place
    const realClose = window.close; window.close = () => {};
    let r;
    try {
      D.clearToast();
      await D.back(); // lands on the old guard entry
      r = { toast: D.toast(), armed: dashboardExitArmed() };
      history.back(); await D.sleep(1000); // the second Back
      r.state = history.state;
    } finally { window.close = realClose; leaveGuard.leaving = false; cancelDashboardExit(); armLeaveGuard(); }
    return r;
  });
  ok("D3 the second Back landing on an older entry (left by a reload) walks out past it",
    D3.toast === "Press Back again to exit" && D3.armed && D3.state && D3.state.testFloor === "B", D3);

  // ---------- Q1/Q2 Back inside a dialog ------------------------------------
  const Q1 = await page.evaluate(async () => {
    const D = __db; D.reset();
    const coin = activeCoins().find(c => c.id === "AY-00001");
    navigate("browse"); showBrowseDetail(coin); await D.sleep(40);
    const ran = [];
    const ask = (buttons) => showWriteGuard({ title: "T", bodyHtml: "<p>b</p>", buttons });
    // Cancel first, a destructive primary second.
    ask([{ label: "Cancel", onClick: () => ran.push("cancel") }, { label: "Remove", primary: true, onClick: () => ran.push("remove") }]);
    await D.back();
    const a = { open: D.dialogOpen(), ran: ran.slice(), detail: D.shown("browseDetailView"), top: D.top() };
    // Cancel LAST (as in "Crop this photo into…") still wins.
    ran.length = 0;
    ask([{ label: "Obverse", primary: true, onClick: () => ran.push("obverse") }, { label: "Reverse", onClick: () => ran.push("reverse") }, { label: "Cancel", onClick: () => ran.push("cancel") }]);
    await D.back();
    const b = { open: D.dialogOpen(), ran: ran.slice() };
    // An acknowledgement: OK.
    ran.length = 0;
    ask([{ label: "OK", onClick: () => ran.push("ok") }]);
    await D.back();
    const c = { open: D.dialogOpen(), ran: ran.slice() };
    // No safe button at all: it just closes, running nothing.
    ran.length = 0;
    ask([{ label: "Go", onClick: () => ran.push("go") }, { label: "Do it", onClick: () => ran.push("do") }]);
    await D.back();
    const d = { open: D.dialogOpen(), ran: ran.slice(), buttonsLeft: document.querySelectorAll("#writeGuardBtns button").length,
      detail: D.shown("browseDetailView"), top: D.top() };
    return { a, b, c, d };
  });
  ok("Q1a Back inside Cancel / Remove runs Cancel only; the page stays", !Q1.a.open && JSON.stringify(Q1.a.ran) === '["cancel"]' && Q1.a.detail && Q1.a.top, Q1);
  ok("Q1b a Cancel listed last still wins", !Q1.b.open && JSON.stringify(Q1.b.ran) === '["cancel"]', Q1);
  ok("Q1c an OK-only dialog closes", !Q1.c.open && JSON.stringify(Q1.c.ran) === '["ok"]', Q1);
  ok("Q1d a dialog with no safe button just closes, running nothing", !Q1.d.open && Q1.d.ran.length === 0 && Q1.d.buttonsLeft === 0 && Q1.d.detail && Q1.d.top, Q1);

  const Q2 = await page.evaluate(async () => {
    const D = __db; D.reset();
    const set = activeCoins().find(c => c.id === "AY-00022");
    navigate("browse"); showBrowseDetail(set); showBrowseEditSetView(set); await D.sleep(40);
    const n = document.getElementById("editSetNotes");
    n.value = "Box is a bit worn"; n.dispatchEvent(new Event("input", { bubbles: true }));
    await D.back();
    const first = D.dialog().title;
    await D.back();
    const r = { first, open: D.dialogOpen(), editSet: D.shown("browseEditSetView"), text: n.value, top: D.top() };
    await D.back();
    r.asksAgain = D.dialog().title;
    D.click("Discard"); await D.sleep(40);
    r.leftTo = D.shown("browseDetailView");
    return r;
  });
  ok("Q2 Back inside the discard dialog = Keep editing: Edit Set stays, the text kept, the entry on top; the next Back asks again",
    Q2.first === "Discard unsaved edits?" && !Q2.open && Q2.editSet && Q2.text === "Box is a bit worn" && Q2.top && Q2.asksAgain === "Discard unsaved edits?" && Q2.leftTo, Q2);

  // ---------- P1 panels and the viewer close first --------------------------
  const P1 = await page.evaluate(async () => {
    const D = __db; D.reset();
    navigate("browse"); await D.sleep(40);
    document.getElementById("browseYearFilterBtn").click(); await D.sleep(30);
    const yearOpen = !document.getElementById("yearFilterOverlay").classList.contains("hidden");
    await D.back();
    const afterYear = { open: !document.getElementById("yearFilterOverlay").classList.contains("hidden"), view: D.view(), top: D.top() };
    const coin = activeCoins().find(c => c.id === "AY-00001");
    showBrowseDetail(coin); await D.sleep(30);
    const url = URL.createObjectURL(new Blob([new Uint8Array([1])], { type: "image/jpeg" }));
    openCoinPhotoInViewer(coin, { type: "reference", url, caption: "" }); await D.sleep(60);
    const viewerOpen = mediaViewerIsOpen();
    await D.back(); await D.sleep(40);
    return { yearOpen, afterYear, viewerOpen, afterViewer: { viewer: mediaViewerIsOpen(), detail: D.shown("browseDetailView"), dialog: D.dialogOpen(), top: D.top() } };
  });
  ok("P1a Back with the year-filter panel open closes just the panel, Catalog stays",
    P1.yearOpen && !P1.afterYear.open && P1.afterYear.view === "browse" && P1.afterYear.top, P1);
  ok("P1b Back with the photo viewer open on a coin's page closes just the viewer",
    P1.viewerOpen && !P1.afterViewer.viewer && P1.afterViewer.detail && !P1.afterViewer.dialog && P1.afterViewer.top, P1);

  // ---------- S1/S2 entries only on a tap ----------------------------------
  const S1a = await page.evaluate(async () => {
    const D = __db; D.reset(); await D.sleep(40);
    history.pushState({ testFloor: "B" }, ""); history.pushState({ testFloor: "A" }, "");
    leaveGuard.depth = 0; armLeaveGuard();
    window.__s1 = { pushes: 0 };
    const rp = history.pushState.bind(history);
    window.__s1.rp = rp;
    history.pushState = (st, t, u) => { if (st && st.coinLeaveGuard) window.__s1.pushes++; return rp(st, t, u); };
    return { depth: leaveGuard.depth };
  });
  await tap(10);
  const S1 = await page.evaluate(async () => {
    const D = __db, S = window.__s1;
    const r = { tapPushes: S.pushes, depthAfterTaps: guardDepthOf(history.state) };
    S.pushes = 0;
    try {
      const coin = activeCoins().find(c => c.id === "AY-00001");
      navigate("browse"); await D.sleep(20); showBrowseDetail(coin); await D.sleep(20);
      showBrowseDetail(coin); // a redraw
      await D.back(); // coin -> grid
      await D.back(); // grid -> Dashboard
      navigate("albums"); await D.sleep(20); await showAlbumDetail(0); await D.sleep(20);
      await D.back(); // album -> list
      r.caughtPushes = S.pushes; r.depthAfterBacks = guardDepthOf(history.state); r.top = D.top();
      await D.back(); // list -> Dashboard
      navigate("browse"); await D.sleep(20);
      await D.back(); // grid -> Dashboard: the last entry of ours used up
      r.lastPushes = S.pushes; r.topAfterLast = D.top(); r.view = D.view();
    } finally { history.pushState = S.rp; }
    return r;
  });
  ok("S1a taps add one entry each, up to the stack's depth (5), never more",
    S1a.depth === 1 && S1.tapPushes === 4 && S1.depthAfterTaps === 5, { S1a, S1 });
  ok("S1b caught Backs and redraws add nothing while an entry of ours is left", S1.caughtPushes === 0 && S1.depthAfterBacks === 2 && S1.top, S1);
  ok("S1c with the last entry used up, one goes back on without a tap", S1.lastPushes === 1 && S1.topAfterLast && S1.view === "dashboard", S1);

  const S2 = await page.evaluate(async () => {
    const D = __db; D.reset(); await D.sleep(40);
    // The page came back (reload) on top of an old guard entry: not ours.
    history.pushState({ coinLeaveGuard: "left-by-a-reload" }, "");
    leaveGuard.armed = false;
    let pushes = 0;
    const rp = history.pushState.bind(history);
    history.pushState = (st, t, u) => { if (st && st.coinLeaveGuard) pushes++; return rp(st, t, u); };
    const len0 = history.length;
    try { navigate("browse"); await D.sleep(40); } finally { history.pushState = rp; }
    const r = { pushes, sameLen: history.length === len0, top: D.top() };
    await D.back();
    r.after = { view: D.view(), dialog: D.dialogOpen(), top: D.top() };
    return r;
  });
  ok("S2 an entry left by a reload is reused in place (no push, no growth) and one Back still works",
    S2.pushes === 0 && S2.sameLen && S2.top && S2.after.view === "dashboard" && !S2.after.dialog && S2.after.top, S2);

  // ---------- S3 a Save running; the splash up ------------------------------
  const S3 = await page.evaluate(async () => {
    const D = __db; D.reset();
    // A coin's page: its Back (to the grid) doesn't go through navigate().
    const coin = activeCoins().find(c => c.id === "AY-00001");
    navigate("browse"); showBrowseDetail(coin); await D.sleep(30);
    D.clearToast();
    editSaveInFlight = true;
    let saving;
    try { await D.back(); saving = { view: D.view(), detail: D.shown("browseDetailView"), toast: D.toast(), top: D.top(), dialog: D.dialogOpen() }; }
    finally { editSaveInFlight = false; }
    // The splash up: Back isn't caught, so no prompt.
    D.reset(); await D.sleep(30);
    history.pushState({ testFloor: "B" }, ""); history.pushState({ testFloor: "A" }, "");
    leaveGuard.armed = false; armLeaveGuard();
    const sp = document.getElementById("splashScreen"); sp.style.display = "";
    const realClose = window.close; window.close = () => {};
    let splash;
    try {
      history.back(); await D.sleep(900);
      splash = { dialog: D.dialogOpen(), state: history.state, leaving: leaveGuard.leaving };
    } finally { window.close = realClose; sp.style.display = "none"; leaveGuard.leaving = false; armLeaveGuard(); }
    return { saving, splash };
  });
  ok("S3a while a Save runs, device Back changes nothing (lock toast, the entry stays on top)",
    S3.saving.view === "browse" && S3.saving.detail && S3.saving.toast === "Still saving — wait for it to finish" && S3.saving.top && !S3.saving.dialog, S3);
  ok("S3b while the splash is up, Back is not caught: no prompt, it steps out", !S3.splash.dialog && S3.splash.state && S3.splash.state.testFloor === "B", S3);
}, module);
