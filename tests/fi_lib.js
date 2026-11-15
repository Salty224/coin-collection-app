// Failure injection for the write paths (review B6, Build 2, 15 Nov 2026).
//
// Not a suite (the runner discovers only tests/verify_*.js). Each
// verify_fi_*.js suite describes ONE flow and calls sweepFlow() below.
//
// THE WRAPPER (in the page, window.__fi.wrap). It sits round the mock Graph
// client and counts calls: every method, or the write methods only (the
// app's own GATED_GRAPH_METHODS: uploads, deletes, workbook PATCHes, row
// adds). At call N it injects one of two faults:
//   "fail"  request N fails and nothing is applied (the call is never made);
//   "lost"  request N is applied, then its answer is lost (the call is made,
//           then the promise rejects as if the network dropped);
//   "none"  nothing is injected (the negative control: a sweep with
//           injection off must report no violations).
// Both reject with a plain network-style Error, the way a dropped fetch does.
//
// THE SWEEP (node side, sweepFlow). For one flow:
//   1. clean run: count the requests K and keep the end state E;
//   2. for every N in 1..K and both kinds: a fresh page (reload), the flow's
//      setup, the flow's action with the fault at N; then the four checks:
//        C1 no pick lost         every pick is still pending on screen or
//                                landed in full
//        C2 no row duplicated    All (CollectionID), Photos (PhotoID; the
//                                same file on two rows), Receipts (ReceiptID
//                                on two files; a coin on two rows)
//        C3 nothing deleted that is still referenced
//                                every file a Photos / Receipts row or a
//                                Staging draft names exists
//        C4 the message matches what landed
//                                "saved" -> the state is E; "nothing
//                                written" -> the state is the starting state
//      then the flow's retry (Save again / Promote again / relaunch) with no
//      fault, and
//        C5 the end state equals the clean run's
//   3. every violation is a line "<kind> <method> <target>[#k]: <check>".
// The suite then asserts the lines equal its KNOWN list EXACTLY (each entry
// tagged with its review finding): a new violation fails, and a fixed one
// fails until its entry is deleted. The list only shrinks; deleting an
// entry is that fix's negative control.
//
// No fixed real-time waits (Ray, 15 Nov 2026): the flows call the app's own
// async functions and await them; the only wait is on __appReady after a
// reload, through the harness.
//
// THE WRAPPER'S OWN NEGATIVE CONTROL (wrapperControls): with injection off
// a sweep reports nothing; with one seeded fault (a flow whose check is made
// to fail at one known request) it reports exactly that one.

const IN_PAGE = () => {
  const fi = window.__fi = {};
  const WRITE_METHODS = [...GATED_GRAPH_METHODS];
  fi.netError = (kind, method) => {
    const e = new Error(kind === "lost" ? "Network error (injected: the answer was lost)" : "Network error (injected: request failed)");
    e.injected = kind; e.method = method;
    return e;
  };
  // What a call is about, for the violation line: the path or the sheet.
  fi.target = (method, args) => {
    const a0 = args[0];
    if (/^(putContent|putContentInSession|uploadFile|uploadBytes|uploadJson|deleteItem|getJson|getFileBytes|getItemMeta|listChildren|getFolderWebUrl)$/.test(method)) {
      const s = String(a0 || "");
      return s.replace(/^.*?CoinCollection\/(_Testing\/)?/, "");
    }
    if (method === "patchWorkbookRanges") return String(args[1]) + "!" + (args[2] || []).map(e => String(e.address).replace(/\d+/g, "#")).join(",");
    if (method === "addTableRow" || method === "readTableHeaderRow" || method === "readTableColumn") return String(args[1]) + (args[2] ? "." + args[2] : "");
    if (/^read/.test(method)) return String(args[1]) + (args[2] ? "!" + String(args[2]).replace(/\d+/g, "#") : "");
    return "";
  };
  // inj: null (count only) or { kind: "fail"|"lost", n, writesOnly }
  fi.wrap = (client, inj, writesOnly) => {
    fi.calls = []; fi.injected = null;
    const seen = {};
    return new Proxy(client, { get(t, k) {
      const v = t[k];
      if (typeof v !== "function" || typeof k !== "string" || k.startsWith("_")) return v;
      return (...args) => {
        const counted = !writesOnly || WRITE_METHODS.includes(k);
        if (!counted) return v.apply(t, args);
        const tgt = fi.target(k, args);
        const key = k + " " + tgt;
        seen[key] = (seen[key] || 0) + 1;
        const label = key + (seen[key] > 1 ? " #" + seen[key] : "");
        fi.calls.push(label);
        const n = fi.calls.length;
        // kind "none": counts, never injects (the wrapper's own control).
        if (inj && inj.n === n && inj.kind !== "none") {
          fi.injected = { kind: inj.kind, n, label };
          if (inj.kind === "fail") return Promise.reject(fi.netError("fail", k));
          return Promise.resolve(v.apply(t, args)).then(() => { throw fi.netError("lost", k); }, () => { throw fi.netError("lost", k); });
        }
        return v.apply(t, args);
      };
    } });
  };

  // ---- state helpers --------------------------------------------------
  const bytesKey = (v) => {
    if (v == null) return "null";
    if (typeof v === "string") return "s:" + v.length + ":" + v.slice(0, 40);
    if (v instanceof Blob) return "b:" + v.size + ":" + (v.__fiTag || "");
    if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) return "a:" + (v.byteLength || 0);
    return "o:" + JSON.stringify(v).length;
  };
  fi.bytesKey = bytesKey;
  const DATE_COLS = /^(LastModified|DateAdded|ValueDate|PurchaseDate|SaleDate|Reviewed)$/;
  const ID_COLS = /^(PhotoID|ReceiptID)$/;
  // One sheet as rows of {header: value}, blank rows dropped.
  fi.rowsOf = (mock, sheet) => {
    const g = (mock._grids || {})[sheet];
    if (!g || !g.length) return [];
    const h = g[0];
    const out = [];
    for (let i = 1; i < g.length; i++) {
      const r = g[i] || [];
      if (!r.some(v => v !== null && v !== undefined && v !== "")) continue;
      const o = { __row: i + 1 };
      h.forEach((name, c) => { if (name) o[name] = r[c] === undefined || r[c] === null ? "" : r[c]; });
      out.push(o);
    }
    return out;
  };
  // Normalised: dates and minted ids reduced to "set / blank", rows sorted,
  // file bytes reduced to size + tag. JSON drafts keep every field but the
  // time stamps the flow names.
  fi.snapshot = (mock, opts) => {
    const o = opts || {};
    const sheets = {};
    for (const s of o.sheets || ["All", "Photos", "Receipts"]) {
      sheets[s] = fi.rowsOf(mock, s).map(r => {
        const n = {};
        Object.keys(r).filter(k => k !== "__row").sort().forEach(k => {
          const v = r[k];
          n[k] = (DATE_COLS.test(k) || ID_COLS.test(k)) ? (v === "" ? "" : "<set>") : v;
        });
        return JSON.stringify(n);
      }).sort();
    }
    const files = {};
    const dropKeys = new Set(o.jsonDropKeys || []);
    for (const [path, e] of mock._store.entries()) {
      const p = path.replace(/^.*?CoinCollection\/(_Testing\/)?/, "");
      if (e.kind === "json") {
        files[p] = JSON.stringify(e.value, (k, v) => dropKeys.has(k) ? undefined : v);
      } else files[p] = bytesKey(e.value);
    }
    return { sheets, files };
  };
  // C2 and C3 on the workbook and the store.
  fi.rowChecks = (mock) => {
    const v = [];
    const all = fi.rowsOf(mock, "All");
    const ids = {};
    all.forEach(r => { const id = String(r.CollectionID || "").trim(); if (id) ids[id] = (ids[id] || 0) + 1; });
    Object.keys(ids).filter(k => ids[k] > 1).forEach(k => v.push("C2 All has " + ids[k] + " rows for " + k));
    const photos = fi.rowsOf(mock, "Photos");
    const pid = {}, pfile = {};
    photos.forEach(r => {
      if (r.PhotoID) pid[r.PhotoID] = (pid[r.PhotoID] || 0) + 1;
      if (r.Filename) pfile[r.Filename] = (pfile[r.Filename] || 0) + 1;
    });
    Object.keys(pid).filter(k => pid[k] > 1).forEach(k => v.push("C2 Photos has PhotoID " + k + " on " + pid[k] + " rows"));
    Object.keys(pfile).filter(k => pfile[k] > 1).forEach(k => v.push("C2 Photos has " + k + " on " + pfile[k] + " rows"));
    const receipts = fi.rowsOf(mock, "Receipts");
    const rid = {}, rcoin = {};
    receipts.forEach(r => {
      const f = r.Filename || r.ReceiptFile || "";
      if (r.ReceiptID) (rid[r.ReceiptID] = rid[r.ReceiptID] || new Set()).add(f);
      if (r.CollectionID) rcoin[r.CollectionID] = (rcoin[r.CollectionID] || 0) + 1;
    });
    Object.keys(rid).filter(k => rid[k].size > 1).forEach(k => v.push("C2 Receipts: " + k + " points at " + rid[k].size + " files"));
    Object.keys(rcoin).filter(k => rcoin[k] > 1).forEach(k => v.push("C2 Receipts has " + rcoin[k] + " rows for " + k));
    const P = writePaths();
    const has = (dir, name) => mock._store.has(dir + "/" + name);
    photos.forEach(r => {
      if (r.Filename && !has(P.coinPhotos, r.Filename)) v.push("C3 Photos row names " + r.Filename + ", which is not in CoinPhotos");
      if (r.OriginalFilename && !has(P.coinPhotos, r.OriginalFilename)) v.push("C3 Photos row names " + r.OriginalFilename + " (original), which is not in CoinPhotos");
    });
    receipts.forEach(r => {
      const f = r.Filename || "";
      if (f && !/^binder$/i.test(f) && !has(P.coinReceipts, f)) v.push("C3 Receipts row names " + f + ", which is not in CoinReceipts");
    });
    // Staging drafts: every photo a coin.json names is in its folder.
    for (const [path, e] of mock._store.entries()) {
      const m = /\/Staging\/([^/]+)\/(coin|set)\.json$/.exec(path);
      if (!m || e.kind !== "json" || !e.value) continue;
      const dir = path.slice(0, path.lastIndexOf("/"));
      const names = [];
      (e.value.photos || []).forEach(ph => { if (ph && ph.filename) names.push(ph.filename); if (ph && ph.rawFilename) names.push(ph.rawFilename); });
      if (e.value.receipt && e.value.receipt.filename) names.push(e.value.receipt.filename);
      // A file mid-move may already be in its final folder before the
      // draft says so; only a file that is nowhere counts.
      names.forEach(n => {
        if (!mock._store.has(dir + "/" + n) && !has(P.coinPhotos, n) && !has(P.coinReceipts, n))
          v.push("C3 draft " + m[1] + " names " + n + ", which is in neither its Staging folder nor CoinPhotos / CoinReceipts");
      });
    }
    return v;
  };
};

// Node side --------------------------------------------------------------

async function freshPage(page, appReady, flowSrc, flowArg) {
  await page.reload({ waitUntil: "load" });
  await appReady(page);
  await page.evaluate(IN_PAGE);
  await page.evaluate(() => {
    if (typeof __setPromoteRelookMsForTest === "function") __setPromoteRelookMsForTest(0);
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
  });
  await page.evaluate(flowSrc, flowArg);
}

// One run of a flow: setup, the action under an optional fault, the checks,
// then (optionally) the retry. Returns the raw facts; sweepFlow judges them.
async function runOnce(page, inj, opts) {
  return page.evaluate(async ({ inj, opts }) => {
    const fi = window.__fi, F = window.__flow;
    const mock = await F.setup();
    __setGraphClientForTest(fi.wrap(mock, inj, opts.writesOnly));
    const snapOpts = { sheets: F.sheets, jsonDropKeys: F.jsonDropKeys };
    const before = fi.snapshot(mock, snapOpts);
    let res, threw = "";
    try { res = await F.run(); } catch (e) { threw = String(e && e.message || e); res = { said: "failed", text: threw }; }
    const calls = fi.calls.slice();
    const injected = fi.injected;
    // Stop counting / injecting for the checks and the retry.
    __setGraphClientForTest(mock);
    const after = fi.snapshot(mock, snapOpts);
    const facts = {
      calls, injected, said: res && res.said, text: (res && res.text) || threw,
      rowViolations: fi.rowChecks(mock),
      picksLost: F.picksLost ? await F.picksLost(mock) : [],
      before, after
    };
    if (opts.retry && F.retry) {
      try { await F.retry(); } catch (e) { facts.retryThrew = String(e && e.message || e); }
      facts.retried = fi.snapshot(mock, snapOpts);
      facts.retryRowViolations = fi.rowChecks(mock);
    }
    return facts;
  }, { inj, opts });
}

// opts: { writesOnly (default true), kinds (default both), retry (default true),
//         flowArg, log }
async function sweepFlow(page, appReady, flowSrc, opts) {
  const o = Object.assign({ writesOnly: true, kinds: ["fail", "lost"], retry: true }, opts || {});
  const t0 = Date.now();
  await freshPage(page, appReady, flowSrc, o.flowArg);
  const clean = await runOnce(page, null, o);
  const K = clean.calls.length;
  const E = clean.retried || clean.after;
  const cleanProblems = [];
  if (clean.said !== "saved") cleanProblems.push("the clean run did not report saved: " + clean.said + " " + clean.text);
  clean.rowViolations.concat(clean.picksLost).forEach(x => cleanProblems.push("clean run: " + x));
  const cleanDiff = diffNode(clean.after, E);
  if (cleanDiff.length) cleanProblems.push("clean run: the retry changed the end state: " + cleanDiff.join("; "));
  const violations = new Set();
  const runs = [];
  for (const kind of o.kinds) {
    for (let n = 1; n <= K; n++) {
      await freshPage(page, appReady, flowSrc, o.flowArg);
      const f = await runOnce(page, { kind, n }, o);
      const where = kind + " " + (f.injected ? f.injected.label : "#" + n + " (not reached)");
      const add = (what) => violations.add(where + ": " + what);
      f.picksLost.forEach(x => add("C1 " + x));
      f.rowViolations.forEach(x => add(x));
      if (f.said === "saved") {
        const d = diffNode(E, f.after);
        if (d.length) add("C4 reported saved, but vs a clean run: " + d.join("; "));
      }
      if (f.said === "nothing") { const d = diffNode(f.before, f.after); if (d.length) add("C4 reported nothing written, but: " + d.join("; ")); }
      if (f.retried) {
        (f.retryRowViolations || []).forEach(x => { if (!f.rowViolations.includes(x)) add("after retry " + x); });
        const d = diffNode(E, f.retried);
        if (d.length) add("C5 after retry, vs a clean run: " + d.join("; "));
      }
      runs.push({ kind, n, label: f.injected && f.injected.label, said: f.said });
    }
  }
  return { K, calls: clean.calls, cleanProblems, violations: [...violations].sort(), runs, seconds: (Date.now() - t0) / 1000 };
}

// Compact, stable text: per sheet "+more/-fewer" rows, then file counts
// (added / gone / changed) with the folders they are in.
function diffNode(a, b) {
  const out = [];
  for (const s of new Set([...Object.keys(a.sheets), ...Object.keys(b.sheets)])) {
    const x = a.sheets[s] || [], y = b.sheets[s] || [];
    if (JSON.stringify(x) === JSON.stringify(y)) continue;
    const cnt = (arr) => arr.reduce((m, r) => (m[r] = (m[r] || 0) + 1, m), {});
    const cx = cnt(x), cy = cnt(y);
    let extra = 0, missing = 0;
    for (const r of new Set([...x, ...y])) { const d = (cy[r] || 0) - (cx[r] || 0); if (d > 0) extra += d; else missing -= d; }
    out.push(s + " +" + extra + "/-" + missing);
  }
  const folders = (names) => [...new Set(names.map(n => n.split("/").slice(0, -1).join("/").replace(/\/AY-\d+$/, "/{id}")))].sort().join(",");
  const added = Object.keys(b.files).filter(k => !(k in a.files));
  const gone = Object.keys(a.files).filter(k => !(k in b.files));
  const changed = Object.keys(a.files).filter(k => k in b.files && a.files[k] !== b.files[k]);
  if (added.length) out.push("files +" + added.length + " in " + folders(added));
  if (gone.length) out.push("files -" + gone.length + " from " + folders(gone));
  if (changed.length) out.push("changed " + changed.map(n => n.split("/").pop()).sort().join(","));
  return out;
}

// The suite's assertion: the violations equal the KNOWN list exactly.
// known: [["A5", "<exact violation line>"], ...] (the finding tag first)
function assertKnown(check, label, result, known) {
  // FI_PRINT=1 prints every violation, for writing a KNOWN list.
  if (process.env.FI_PRINT) console.log(label + " VIOLATIONS:\n" + result.violations.map(v => "  " + JSON.stringify(v)).join("\n"));
  const want = known.map(k => k[1]).sort();
  const got = result.violations;
  const unexpected = got.filter(x => !want.includes(x));
  const fixed = want.filter(x => !got.includes(x));
  check(label + ": the sweep's violations equal the KNOWN list exactly (" + got.length + " found, " + want.length + " known; " +
    result.K + " requests, " + result.runs.length + " faulted runs)",
    unexpected.length === 0 && fixed.length === 0,
    { unexpected, fixedDeleteFromKnown: fixed });
  return { unexpected, fixed };
}

module.exports = { sweepFlow, assertKnown, diffNode, freshPage, runOnce, IN_PAGE };
