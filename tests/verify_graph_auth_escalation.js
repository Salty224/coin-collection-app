// Live-blocking regression fix: shouldStartInteractiveRedirect() alone (see
// "Real Graph API reads" / Bug A in CLAUDE.md) has no memory — a genuinely
// persistent silent acquireTokenSilent() failure that ISN'T a confirmed
// InteractionRequiredAuthError (e.g. a mobile-Chrome silent-iframe
// BrowserAuthError like monitor_window_timeout, when third-party cookies
// are restricted) was correctly treated as "retry silently" for a one-off
// blip, but with no ceiling it never escalated to a real interactive
// redirect no matter how many times it repeated — reproduced live as
// "Couldn't connect," with Retry restarting the identical doomed silent
// loop every time.
//
// shouldEscalateAfterSilentFailures() widens the rule with a failure-count
// ceiling (GRAPH_SILENT_FAILURE_ESCALATION_THRESHOLD, 3) on the "retry
// silently" branch specifically. Pure/directly-testable, same reasoning as
// shouldStartInteractiveRedirect() itself — this sandbox can never load
// real MSAL to exercise acquireGraphToken() end-to-end (graphMsalInstance
// is a `const`, always null here with no real MSAL loaded, and there is no
// test seam to substitute it — same acknowledged limitation
// shouldStartInteractiveRedirect() already carries; see block C below and
// CLAUDE.md's own "Not verified" note for that fix). See CLAUDE.md for the
// full write-up of this follow-up.

const { defineSuite } = require("./harness");

module.exports = defineSuite("graph-auth-escalation", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  // ================================================================
  // A. shouldEscalateAfterSilentFailures() in isolation — a fake
  //    InteractionRequiredAuthError class, since real MSAL never loads here.
  // ================================================================
  const A = await page.evaluate(() => {
    class FakeInteractionRequired extends Error {}
    class OtherError extends Error {}
    const T = GRAPH_SILENT_FAILURE_ESCALATION_THRESHOLD;
    return {
      threshold: T,
      // Missing account -> always escalate, regardless of count (mirrors
      // shouldStartInteractiveRedirect()'s own immediate-escalation rule).
      noAccountCount0: shouldEscalateAfterSilentFailures(false, new OtherError(), FakeInteractionRequired, 0),
      noAccountHighCount: shouldEscalateAfterSilentFailures(false, new OtherError(), FakeInteractionRequired, 999),
      // A confirmed InteractionRequiredAuthError -> always escalate
      // immediately too, count irrelevant.
      confirmedInteractionRequired: shouldEscalateAfterSilentFailures(true, new FakeInteractionRequired(), FakeInteractionRequired, 0),
      // The actual fix: a non-InteractionRequiredAuthError failure with an
      // account present does NOT escalate below the threshold...
      belowThreshold: shouldEscalateAfterSilentFailures(true, new OtherError(), FakeInteractionRequired, T - 1),
      // ...but DOES escalate once the count reaches it.
      atThreshold: shouldEscalateAfterSilentFailures(true, new OtherError(), FakeInteractionRequired, T),
      // And stays escalated past it (never flips back off on its own).
      pastThreshold: shouldEscalateAfterSilentFailures(true, new OtherError(), FakeInteractionRequired, T + 5),
      // A genuine one-off blip (count 1, well under threshold) must still
      // be absorbed silently — the whole point of the original rule.
      oneOffBlip: shouldEscalateAfterSilentFailures(true, new OtherError(), FakeInteractionRequired, 1),
      zeroCount: shouldEscalateAfterSilentFailures(true, new OtherError(), FakeInteractionRequired, 0),
    };
  });
  ok(A.threshold >= 2 && A.threshold <= 5, "A0 threshold is a small, sane ceiling (not 1 — would defeat the one-off-blip absorption; not huge — would leave the user stuck for long): " + A.threshold);
  ok(A.noAccountCount0 === true, "A1 no account -> escalate immediately regardless of failure count");
  ok(A.noAccountHighCount === true, "A1b no account -> escalate immediately even at a high count (unaffected by the ceiling logic)");
  ok(A.confirmedInteractionRequired === true, "A2 a confirmed InteractionRequiredAuthError -> escalate immediately regardless of failure count");
  ok(A.zeroCount === false, "A3a a non-InteractionRequiredAuthError failure at count 0 does NOT escalate");
  ok(A.belowThreshold === false, "A3b a non-InteractionRequiredAuthError failure just below the threshold does NOT escalate — a genuine one-off/short blip must still be absorbed");
  ok(A.atThreshold === true, "A4 the SAME failure repeating THRESHOLD times DOES escalate — this is the actual fix for the reported infinite-silent-loop regression");
  ok(A.pastThreshold === true, "A5 stays escalated past the threshold too");
  ok(A.oneOffBlip === false, "A7 a genuine one-off blip (count 1) is still absorbed silently, not escalated — confirms the fix didn't regress the original Bug A behavior");

  // ================================================================
  // B. Negative control — reproduces the exact reported symptom: without
  //    the ceiling (shouldStartInteractiveRedirect() alone, the pre-fix
  //    decision), a persistent non-InteractionRequiredAuthError failure
  //    NEVER escalates, no matter how many times it repeats. Proves A4
  //    exercises a real fix, not a tautology.
  // ================================================================
  const B = await page.evaluate(() => {
    class FakeInteractionRequired extends Error {}
    class OtherError extends Error {}
    // Recreate the pre-fix decision (shouldStartInteractiveRedirect() alone,
    // with no failure-count widening) and drive it as if it were called
    // repeatedly, exactly like acquireGraphToken()'s own retry loop would
    // (the splash calls it roughly every SPLASH_RETRY_INTERVAL_MS for up to
    // SPLASH_DATA_TIMEOUT_MS — ~12 times per boot attempt).
    let escalatedEver = false;
    for (let i = 0; i < 50; i++) {
      if (shouldStartInteractiveRedirect(true, new OtherError(), FakeInteractionRequired)) escalatedEver = true;
    }
    return { escalatedEver };
  });
  ok(B.escalatedEver === false, "B1 negative control: shouldStartInteractiveRedirect() ALONE never escalates a persistent non-InteractionRequiredAuthError failure no matter how many times it repeats — reproduces the exact reported infinite-loop symptom, confirming A4 exercises a real fix and not just a restatement of the old rule");

  // ================================================================
  // C. acquireGraphToken()/graphMsalInstance itself — acknowledged, NOT
  //    exercisable end-to-end from this sandbox, same standing limitation
  //    shouldStartInteractiveRedirect()'s own Bug A fix already carries
  //    (CLAUDE.md: "Not verified: Bug A's actual live-device fix...
  //    graphMsalInstance is always null in this sandbox — real MSAL never
  //    loads here"). graphMsalInstance is declared `const` at module scope
  //    and has no test seam to substitute — confirmed directly below rather
  //    than assumed, so a future change adding such a seam has something to
  //    update. The real integration (acquireGraphToken()'s catch block
  //    actually incrementing/reading graphSilentFailureCount and calling
  //    acquireTokenRedirect()) needs Ray's own live-device pass, same as
  //    Bug A's own fix did.
  // ================================================================
  const C = await page.evaluate(() => ({
    msalInstanceIsNull: graphMsalInstance === null,
    // Regression check: with no MSAL instance, acquireGraphToken() must
    // still short-circuit to null immediately (this fix didn't touch that
    // branch) rather than throwing or hanging.
    resetSeamCallable: (() => { try { __resetGraphTokenStateForTest(); return true; } catch (e) { return false; } })()
  }));
  ok(C.msalInstanceIsNull === true, "C1 confirms graphMsalInstance is null in this sandbox (no real MSAL loaded) — this is WHY acquireGraphToken()'s real catch-block integration (the counter increment + acquireTokenRedirect() call) cannot be driven end-to-end here, same acknowledged limitation as shouldStartInteractiveRedirect()'s own Bug A coverage");
  ok(C.resetSeamCallable === true, "C2 __resetGraphTokenStateForTest() (now also clearing graphSilentFailureCount) is still callable without throwing");

  const C3 = await page.evaluate(async () => {
    __resetGraphTokenStateForTest();
    const token = await acquireGraphToken();
    __resetGraphTokenStateForTest();
    return token;
  });
  ok(C3 === null, "C3 regression: with no MSAL instance, acquireGraphToken() still resolves to null immediately (unaffected by this fix's new counter logic) — the null-instance short-circuit runs before any of the new code");
}, module);
