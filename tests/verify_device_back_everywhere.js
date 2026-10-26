// Device Back on every screen, the Dashboard's "Leave Salty's Cabinet?",
// Back inside a dialog, and two C2 follow-ups (Oct 2026,
// claude/photos-wait-for-save; Ray's tablet test of C2 at 79b4f90).
//
// WHY. C2 caught the device's Back on the editing screens only; everywhere
// else it left the app. Now the app keeps ONE history entry of its own on
// top at all times and the device's Back runs the app's own Back
// (navBackHandler, the same up-one-level the chrome Back uses).
//
//   W1  the discard dialog says "…and haven't saved." (no "them")
//   F1  Edit Set's Fun Fact is read-only text, the Set's own catalog fact;
//       hidden when there is none; never counted by the leave warning
//   K1  device Back = the app's own Back on: Catalog, a coin's page, a
//       Set's page, the album list, an open album, Docket, Staging Review,
//       Ledger, Acquisitions
//   D1  Dashboard Back asks "Leave Salty's Cabinet?" (Stay / Leave); Stay
//       keeps the app, the entry back on top
//   D2  Back with that prompt open = Stay
//   D3  Leave steps back out of the page; with nothing behind it tries
//       window.close() and then says to press Back once more; the app no
//       longer catches Back until it is touched again
//   D4  Leave walks past entries left by an earlier page load
//   Q1  Back inside a confirmation dialog runs its Cancel (never the
//       other button); an OK-only dialog closes; one with no safe button
//       just closes, running nothing
//   Q2  Back inside the discard dialog = Keep editing (text kept)
//   P1  Back with the year-filter panel or the photo viewer open closes
//       just that
//   S1  one entry at a time: many screen changes and Backs leave
//       history.length where it was and push one entry per Back caught
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
        navigateNow("dashboard");
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
  });
}

module.exports = defineSuite("device-back-everywhere", async ({ openApp, ok: okRaw, PHONE }) => {
  const ok = (label, cond, data) => okRaw(!!cond, label + (cond ? "" : ": " + JSON.stringify(data)));
  const page = await openApp(PHONE);
  await setup(page);

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

  // ---------- D1/D2 the Dashboard's Back ------------------------------------
  const D1 = await page.evaluate(async () => {
    const D = __db; D.reset(); await D.sleep(40);
    await D.back();
    const d = D.dialog(); const topWhileOpen = D.top();
    // D2: Back again with the prompt open = Stay.
    await D.back();
    const afterSecondBack = { open: D.dialogOpen(), view: D.view(), top: D.top() };
    await D.back();
    const reopened = D.dialogOpen();
    D.click("Stay"); await D.sleep(40);
    return { d, topWhileOpen, afterSecondBack, reopened, afterStay: { open: D.dialogOpen(), view: D.view(), top: D.top(), leaving: leaveGuard.leaving } };
  });
  ok("D1a Back on the Dashboard asks \"Leave Salty's Cabinet?\" with Stay / Leave",
    D1.d.open && D1.d.title === "Leave Salty's Cabinet?" && JSON.stringify(D1.d.buttons) === '["Stay","Leave"]' && D1.topWhileOpen, D1);
  ok("D1b Stay closes the prompt and keeps the app on the Dashboard, the entry back on top",
    D1.reopened && !D1.afterStay.open && D1.afterStay.view === "dashboard" && D1.afterStay.top && !D1.afterStay.leaving, D1);
  ok("D2 Back with the prompt open acts as Stay", !D1.afterSecondBack.open && D1.afterSecondBack.view === "dashboard" && D1.afterSecondBack.top, D1);

  // ---------- D3/D4 Leave ---------------------------------------------------
  const D3 = await page.evaluate(async () => {
    const D = __db; D.reset(); await D.sleep(40);
    // Below our entry: floorA (the page itself) and floorB (stand-in for
    // whatever came before the page), so stepping out stays in the test page.
    history.pushState({ testFloor: "B" }, ""); history.pushState({ testFloor: "A" }, "");
    leaveGuard.armed = false; armLeaveGuard();
    const closes = []; const realClose = window.close; window.close = () => closes.push(1);
    let r;
    try {
      D.clearToast();
      await D.back();
      D.click("Leave"); await D.sleep(900);
      r = { state: history.state, closes: closes.length, toast: D.toast(), leaving: leaveGuard.leaving, top: D.top(), view: D.view() };
      // While leaving, a screen change does not re-arm.
      setNavBack(() => navigate("dashboard")); await D.sleep(20);
      r.stillUnarmed = !D.top();
    } finally { window.close = realClose; }
    return r;
  });
  ok("D3a Leave steps back out past the page's own entry (to what came before it)", D3.state && D3.state.testFloor === "B", D3);
  ok("D3b with nothing to step back to it tries window.close(), then says to press Back once more",
    D3.closes === 1 && D3.toast === "Press Back once more to close Salty's Cabinet.", D3);
  ok("D3c after Leave the app no longer catches Back (even on a redraw)", D3.leaving && !D3.top && D3.stillUnarmed, D3);
  const D3b = await page.evaluate(async () => { await __db.sleep(30); return { leaving: leaveGuard.leaving, top: leaveGuardIsTop() }; });
  await page.mouse.click(5, 300); await page.waitForTimeout(80);
  const D3c = await page.evaluate(() => ({ leaving: leaveGuard.leaving, top: leaveGuardIsTop() }));
  ok("D3d touching the app again after Leave catches Back again", D3b.leaving && !D3c.leaving && D3c.top, { D3b, D3c });

  const D4 = await page.evaluate(async () => {
    const D = __db; D.reset(); await D.sleep(40);
    history.pushState({ testFloor: "B" }, ""); history.pushState({ testFloor: "A" }, "");
    // An earlier page load left an old guard entry and a viewer entry, and
    // this load's own entry sits on top of them.
    history.pushState({ coinLeaveGuard: "left-by-a-reload" }, ""); history.pushState({ mediaViewer: true }, "");
    const token = "test-own"; history.pushState({ coinLeaveGuard: token }, "");
    leaveGuard.token = token; leaveGuard.armed = true;
    const realClose = window.close; window.close = () => {};
    let r;
    try {
      await D.back();
      const asked = D.dialog().title;
      D.click("Leave"); await D.sleep(1000);
      r = { asked, state: history.state };
    } finally { window.close = realClose; leaveGuard.leaving = false; armLeaveGuard(); }
    return r;
  });
  ok("D4 Leave walks past entries an earlier page load left (an old guard entry, an old viewer entry)",
    D4.asked === "Leave Salty's Cabinet?" && D4.state && D4.state.testFloor === "B", D4);

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

  // ---------- S1/S2 one entry at a time -------------------------------------
  const S1 = await page.evaluate(async () => {
    const D = __db; D.reset(); await D.sleep(40);
    let pushes = 0, replaces = 0;
    const rp = history.pushState.bind(history), rr = history.replaceState.bind(history);
    history.pushState = (st, t, u) => { if (st && st.coinLeaveGuard) pushes++; return rp(st, t, u); };
    history.replaceState = (st, t, u) => { if (st && st.coinLeaveGuard) replaces++; return rr(st, t, u); };
    const len0 = history.length;
    let backs = 0, lenFirst = null;
    try {
      const coin = activeCoins().find(c => c.id === "AY-00001");
      for (let i = 0; i < 2; i++) {
        navigate("browse"); await D.sleep(20); showBrowseDetail(coin); await D.sleep(20);
        showBrowseDetail(coin); // a redraw
        await D.back(); backs++;
        if (lenFirst === null) lenFirst = history.length; // forward entries left by earlier blocks are gone now
        navigate("albums"); await D.sleep(20); await showAlbumDetail(0); await D.sleep(20);
        await D.back(); backs++;
        navigate("needsdbcoins"); await D.sleep(20);
        await D.back(); backs++;
        navigate("stats"); await D.sleep(20);
      }
    } finally { history.pushState = rp; history.replaceState = rr; }
    return { len0, lenFirst, len1: history.length, pushes, replaces, backs, top: D.top() };
  });
  ok("S1 many screen changes and Backs: history.length unchanged, one push per Back caught, nothing else",
    S1.lenFirst <= S1.len0 && S1.len1 === S1.lenFirst && S1.pushes === S1.backs && S1.replaces === 0 && S1.top, S1);

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
