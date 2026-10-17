// The deploy workflow (.github/workflows/deploy.yml).
//
// The workflow itself can only really run on GitHub. What CAN be proved here:
//   - its shape: "Run workflow" only (no push trigger), the branch input, the
//     three permissions, branch-only checkout, upload and deploy;
//   - its STAMP SCRIPT, extracted verbatim from the YAML and run with node in
//     a temporary git repo exactly as the workflow runs it, and the stamped
//     app.html it produces, served at the real Pages URL (outside requests
//     aborted), behaving as LIVE for main and TEST for anything else.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync, execFileSync } = require("child_process");
const { defineSuite } = require("./harness");

const REPO_ROOT = path.resolve(__dirname, "..");
const WF_PATH = path.join(REPO_ROOT, ".github", "workflows", "deploy.yml");
const LIVE_URL = "https://salty224.github.io/coin-collection-app/app.html";

function stampScript(yml) {
  const begin = yml.indexOf("// --- stamp-build (begin) ---");
  const end = yml.indexOf("// --- stamp-build (end) ---");
  if (begin === -1 || end === -1) return null;
  const lineStart = yml.lastIndexOf("\n", begin) + 1;
  const indent = begin - lineStart;
  return yml.slice(lineStart, yml.indexOf("\n", end))
    .split("\n").map(l => l.slice(Math.min(indent, l.length - l.trimStart().length))).join("\n");
}

// A throwaway git repo holding `appHtml`, so `git rev-parse HEAD` is real.
function tempRepo(appHtml) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deploy-wf-"));
  fs.writeFileSync(path.join(dir, "app.html"), appHtml);
  const git = (...a) => execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], { cwd: dir, stdio: "pipe" });
  git("init", "-q");
  git("add", "app.html");
  git("commit", "-q", "-m", "fixture");
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir }).toString().trim();
  return { dir, commit };
}

function runStamp(script, dir, branch, number) {
  return spawnSync("node", ["-"], { input: script, cwd: dir, encoding: "utf8",
    env: { ...process.env, BUILD_BRANCH: branch, BUILD_NUMBER: number } });
}

async function openServed(openApp, url, html, extra) {
  const page = await openApp();
  const base = url.slice(0, url.lastIndexOf("/") + 1);
  await page.route("**/*", async route => {
    const u = route.request().url();
    if (u.split("?")[0] === url) return route.fulfill({ status: 200, contentType: "text/html", body: html });
    if (extra && u.split("?")[0] === base + "build-info.json") {
      return route.fulfill({ status: 200, contentType: "application/json", body: extra });
    }
    if (u.indexOf(base) === 0) return route.fulfill({ status: 404, body: "" });
    return route.abort();
  });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(700);
  return page;
}

const readState = page => page.evaluate(() => ({
  target: WRITE_TARGET,
  banner: document.getElementById("testBanner").classList.contains("hidden") ? "" : document.getElementById("testBanner").textContent,
  line: document.getElementById("splashBuildLine").textContent,
  newer: !document.getElementById("newerBuildBar").classList.contains("hidden")
}));

module.exports = defineSuite("deploy-workflow", async ({ ok, openApp }) => {
  ok(fs.existsSync(WF_PATH), "D0 .github/workflows/deploy.yml exists");
  const yml = fs.readFileSync(WF_PATH, "utf8");

  // ---- Shape -------------------------------------------------------
  const onBlock = yml.slice(yml.indexOf("\non:"), yml.indexOf("\npermissions:"));
  ok(/workflow_dispatch:/.test(onBlock) && !/\b(push|pull_request|pull_request_target|schedule|workflow_run|release)\s*:/.test(onBlock),
    "D1 the only trigger is \"Run workflow\" (no push, PR, schedule or other trigger)");
  ok(/branch:\s*\n\s+description:[^\n]*\n\s+required: true\s*\n\s+default: main\s*\n\s+type: string/.test(onBlock),
    "D2 it takes a required branch input that defaults to main");
  const perms = yml.slice(yml.indexOf("\npermissions:"), yml.indexOf("\nconcurrency:"));
  ok(/contents: read/.test(perms) && /pages: write/.test(perms) && /id-token: write/.test(perms) &&
     (perms.match(/^ {2}[a-z-]+:/gm) || []).length === 3,
    "D3 permissions are exactly contents: read, pages: write, id-token: write");
  ok(/ref: refs\/heads\/\$\{\{ inputs\.branch \}\}/.test(yml), "D4 it checks out the chosen BRANCH only (refs/heads/…)");
  ok(/uses: actions\/upload-pages-artifact@v\d+/.test(yml) && /uses: actions\/deploy-pages@v\d+/.test(yml) &&
     /environment:\s*\n\s+name: github-pages/.test(yml), "D5 it uploads with upload-pages-artifact and deploys with deploy-pages to github-pages");
  const script = stampScript(yml);
  ok(!!script && script.indexOf("${{") === -1 && /BUILD_BRANCH: \$\{\{ inputs\.branch \}\}/.test(yml),
    "D6 the stamp script takes the branch through an environment variable, never pasted into the script");

  // ---- The stamp script, run for real ------------------------------
  const appSrc = fs.readFileSync(path.join(REPO_ROOT, "app.html"), "utf8");
  const dirs = [];
  try {
    const main = tempRepo(appSrc); dirs.push(main.dir);
    const r = runStamp(script, main.dir, "main", "57");
    const out = fs.readFileSync(path.join(main.dir, "app.html"), "utf8");
    const m = out.match(/^  const BUILD_STAMP = (\{.*\});$/m);
    let stamp = null; try { stamp = m && JSON.parse(m[1]); } catch (e) { /* stays null */ }
    ok(r.status === 0 && !/@build-stamp/.test(out) && !!stamp, "D7 the script replaces the placeholder line with a stamp");
    const age = stamp ? Date.now() - Date.parse(stamp.date) : Infinity;
    ok(stamp && stamp.branch === "main" && stamp.commit === main.commit && stamp.number === "57" && age >= 0 && age < 120000,
      "D8 the stamp carries the branch, the real checked-out commit, the run number and the current UTC date");
    ok(out.split("\n").length === appSrc.split("\n").length &&
       out.split("\n").filter((l, i) => l !== appSrc.split("\n")[i]).length === 1,
      "D9 nothing else in app.html changes");

    const liveP = await openServed(openApp, LIVE_URL, out);
    const L = await readState(liveP);
    const short = main.commit.slice(0, 7);
    ok(L.target === "live" && L.banner === "", "D10 the stamped main, served from the real URL, runs LIVE with no TEST bar");
    ok(new RegExp("^Build 57 · \\d{1,2} [A-Z][a-z]{2} · " + short + "$").test(L.line), "D11 and shows \"Build 57 · {D Mon} · " + short + "\"");
    await liveP.close();

    const feat = tempRepo(appSrc); dirs.push(feat.dir);
    runStamp(script, feat.dir, "claude/try-something", "58");
    const featP = await openServed(openApp, LIVE_URL, fs.readFileSync(path.join(feat.dir, "app.html"), "utf8"));
    const F = await readState(featP);
    ok(F.target === "copy" && F.banner === "TEST · claude/try-something", "D12 a stamped feature branch runs TEST and names itself in the bar");
    await featP.close();

    // A branch name that tries to break out of the script tag.
    const hostile = 'x</script><b id="pwn">"q\'';
    const hr = tempRepo(appSrc); dirs.push(hr.dir);
    runStamp(script, hr.dir, hostile, "59");
    const hP = await openServed(openApp, LIVE_URL, fs.readFileSync(path.join(hr.dir, "app.html"), "utf8"));
    const H = await readState(hP);
    const pwn = await hP.evaluate(() => !!document.getElementById("pwn"));
    ok(H.target === "copy" && H.banner === "TEST · " + hostile && !pwn, "D13 a hostile branch name is shown as text, never as markup");
    await hP.close();

    // Placeholder missing or duplicated: the build fails and app.html is untouched.
    const none = tempRepo(appSrc.replace("  const BUILD_STAMP = null; // @build-stamp", "  const BUILD_STAMP = null;")); dirs.push(none.dir);
    const before = fs.readFileSync(path.join(none.dir, "app.html"), "utf8");
    const rn = runStamp(script, none.dir, "main", "60");
    ok(rn.status !== 0 && /found 0 time/.test(rn.stderr) && fs.readFileSync(path.join(none.dir, "app.html"), "utf8") === before,
      "D14 no placeholder line: the build fails and app.html is left untouched");
    const two = tempRepo(appSrc.replace("  const BUILD_STAMP = null; // @build-stamp",
      "  const BUILD_STAMP = null; // @build-stamp\n  const BUILD_STAMP = null; // @build-stamp")); dirs.push(two.dir);
    const rt = runStamp(script, two.dir, "main", "61");
    ok(rt.status !== 0 && /found 2 time/.test(rt.stderr), "D15 two placeholder lines: the build fails");
    const blank = tempRepo(appSrc); dirs.push(blank.dir);
    const rb = runStamp(script, blank.dir, "   ", "62");
    ok(rb.status !== 0, "D16 an empty branch name: the build fails");
  } finally {
    dirs.forEach(d => fs.rmSync(d, { recursive: true, force: true }));
  }
  ok(dirs.every(d => !fs.existsSync(d)), "D17 the temporary repos were deleted");
}, module);
