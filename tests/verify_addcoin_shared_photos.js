// Add Coin uses Edit Coin's photo section (branch claude/addcoin-shared-photos).
//
// S3 — SAVE OUTPUT IS PINNED. The whole point of moving Add Coin onto Edit
// Coin's photo section is that what Ray SEES changes and what Save WRITES
// does not. This block drives a fixed set of picks through the real Add Coin
// screen and real crop tool, saves a new draft to Staging (mock Graph), and
// compares coin.json's photo list and the files uploaded into the draft
// folder with a golden recording taken from the Add Coin screen as it was on
// main 38b0207, before any of this branch's changes.
//
// The recording lives in tests/fixtures/addcoin_photo_save_golden.json. To
// re-record (only ever on purpose, and say so in the commit):
//   RECORD_ADDCOIN_GOLDEN=1 node tests/verify_addcoin_shared_photos.js
//
// `pickAll` is the ONLY part that knows which buttons exist. When the screen
// changes, pickAll changes and the golden does not.

const fs = require("fs");
const path = require("path");
const { defineSuite } = require("./harness");

const GOLDEN = path.join(__dirname, "fixtures", "addcoin_photo_save_golden.json");
const RECORD = process.env.RECORD_ADDCOIN_GOLDEN === "1";

// The fixed pick set: type, colour (so each file's bytes differ), label.
// Labels only on repeatable photos.
const PICKS = [
  { type: "obverse",      color: "#c33", caption: "" },
  { type: "reverse",      color: "#3c3", caption: "" },
  { type: "slab_obverse", color: "#33c", caption: "" },
  { type: "slab_reverse", color: "#cc3", caption: "" },
  { type: "reference",    color: "#3cc", caption: "TrueView obverse" },
  { type: "reference",    color: "#c3c", caption: "TrueView reverse" },
  { type: "other",        color: "#999", caption: "Mint box" }
];

module.exports = defineSuite("addcoin-shared-photos", async ({ ok, openApp, PHONE }) => {
  const page = await openApp(PHONE);

  const S3 = await page.evaluate(async (PICKS) => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const waitFor = async (fn, ms) => { const end = Date.now() + (ms || 4000); while (Date.now() < end) { if (fn()) return true; await sleep(40); } return !!fn(); };
    const open = (id) => { const o = document.getElementById(id); return !!o && !o.classList.contains("hidden"); };
    const file = async (color) => {
      const c = document.createElement("canvas"); c.width = 300; c.height = 300;
      const x = c.getContext("2d"); x.fillStyle = color; x.fillRect(0, 0, 300, 300);
      x.fillStyle = "#da3"; x.beginPath(); x.arc(150, 150, 110, 0, Math.PI * 2); x.fill();
      const b = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
      return new File([b], "pick.jpg", { type: "image/jpeg" });
    };
    const feed = (input, f) => {
      const dt = new DataTransfer(); dt.items.add(f);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const count = () => galleryFor(ADDCOIN_GALLERY_ID).length;
    const finishCrop = async (before) => {
      if (!(await waitFor(() => open("bgCropOverlay")))) return false;
      document.getElementById("bgCropUseBtn").click();
      if (await waitFor(() => open("photoAdjustOverlay"), 1500)) document.getElementById("photoAdjustUseBtn").click();
      return await waitFor(() => count() > before);
    };
    const GALLERY_LABEL = { slab_obverse: /Slab — front|Holder — front/, slab_reverse: /Slab — back|Holder — back/,
                            reference: /Reference/, other: /Other/ };

    // ---- pickAll: main 38b0207's Add Coin (📷 🖼️ 📁 slots + gallery) ----
    async function pickOne(p) {
      const before = count();
      if (p.type === "obverse" || p.type === "reverse") {
        feed(document.getElementById(p.type + "FilesInput"), await file(p.color));
      } else {
        const gal = document.getElementById("addCoinGallery");
        gal.querySelector('[data-role="add-files"]').click();
        const item = [...document.querySelectorAll(".gtp-item")].find(b => GALLERY_LABEL[p.type].test(b.textContent));
        if (!item) return false;
        item.click();
        feed(gal.querySelector('input[data-role="files"]'), await file(p.color));
      }
      if (!(await finishCrop(before))) return false;
      if (p.caption) {
        // Type the label into the new photo's own label box.
        const entry = galleryFor(ADDCOIN_GALLERY_ID)[count() - 1];
        const thumbs = [...document.querySelectorAll("#addCoinGallery .gc-thumb")];
        const nonFlip = galleryFor(ADDCOIN_GALLERY_ID).filter(e => !(galleryTypeDef(e.type) || {}).flipSource);
        const thumb = thumbs[nonFlip.indexOf(entry)];
        const box = thumb && thumb.querySelector(".gc-caption");
        if (!box) return false;
        box.value = p.caption;
        box.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return true;
    }
    async function pickAll() {
      const done = [];
      for (const p of PICKS) done.push(await pickOne(p));
      return done;
    }

    // ---- setup: a clean Add Coin form, a mock OneDrive, one catalog row ----
    const sp = document.getElementById("splashScreen"); if (sp) sp.style.display = "none";
    const mock = createMockGraphClient({ workbookColumns: { "All::CollectionID": ["AY-00500"] } });
    const uploads = [];
    const realUpload = mock.uploadFile.bind(mock);
    mock.uploadFile = (p, f) => { uploads.push(p); return realUpload(p, f); };
    __setGraphClientForTest(mock);
    __setAddCoinWriteEnabledForTest(true);
    __setDocketWriteEnabledForTest(false);
    __setLiveDbCoinsForTest([
      { denom: "10C", year: 1916, mint: "D", variety: "", description: "Mercury Dime",
        finish: "Business Strike", designation: "", coinId: "C-1916-D-10C-01", pcgs: "4682", mintage: 264000, gsid: "" }
    ]);
    navigate("addcoin");
    document.getElementById("denomination").value = "10C";
    document.getElementById("year").value = "1916";
    document.getElementById("mintMark").value = "D";
    document.getElementById("description").value = "Mercury Dime";
    document.getElementById("finish").value = "Business Strike";
    checkDbCoinsMatch();

    const picked = await pickAll();
    const inMemory = galleryFor(ADDCOIN_GALLERY_ID).map(e => ({ type: e.type, caption: e.caption || "" }));
    const res = await new Promise((resolve, reject) => {
      resolveAddCoinCatalogMatch(
        (m) => completeAddCoinSave("staging", m).then(resolve, reject),
        () => resolve("cancelled"));
    });
    const id = "AY-00501";
    const folder = writePaths().stagingBase + "/" + id + "/";
    const draft = await mock.getJson(folder + "coin.json");
    const out = {
      picked, inMemory, cancelled: res === "cancelled",
      collectionID: draft && draft.collectionID,
      photos: draft ? (draft.photos || []).map(p => (typeof p === "string") ? { filename: p } :
        { type: p.type, filename: p.filename, caption: p.caption || "" }) : null,
      receiptPhoto: draft ? draft.receiptPhoto || "" : null,
      uploads: uploads.filter(p => p.indexOf(folder) === 0 && !/coin\.json$/.test(p))
        .map(p => p.slice(folder.length)).sort(),
      uploadsOutsideDraft: uploads.filter(p => p.indexOf(folder) !== 0).length
    };
    __setLiveDbCoinsForTest(null);
    __setDocketWriteEnabledForTest(null);
    __setAddCoinWriteEnabledForTest(null);
    __setGraphClientForTest(null);
    return out;
  }, PICKS);

  ok(S3.picked.length === PICKS.length && S3.picked.every(Boolean),
    "S3.1 every pick in the fixed set went through the crop tool");
  ok(JSON.stringify(S3.inMemory.map(e => e.type)) === JSON.stringify(PICKS.map(p => p.type)),
    "S3.2 the form held the picks in pick order");
  ok(!S3.cancelled && S3.collectionID === "AY-00501", "S3.3 the save wrote a new draft at AY-00501");
  ok(S3.uploadsOutsideDraft === 0, "S3.4 nothing was uploaded outside the draft's Staging folder");

  const now = { collectionID: S3.collectionID, photos: S3.photos, receiptPhoto: S3.receiptPhoto, uploads: S3.uploads };
  if (RECORD) {
    fs.mkdirSync(path.dirname(GOLDEN), { recursive: true });
    fs.writeFileSync(GOLDEN, JSON.stringify(Object.assign({
      _note: "Recorded from main 38b0207's Add Coin (before claude/addcoin-shared-photos). " +
             "Do not edit by hand; see tests/verify_addcoin_shared_photos.js."
    }, now), null, 2) + "\n");
    ok(true, "S3.R golden recorded to " + path.relative(process.cwd(), GOLDEN));
    return;
  }
  const golden = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
  ok(JSON.stringify(now.photos) === JSON.stringify(golden.photos),
    "S3.5 coin.json's photo list (type, filename, label, order) equals the golden");
  ok(JSON.stringify(now.uploads) === JSON.stringify(golden.uploads),
    "S3.6 the files uploaded to the draft folder equal the golden");
  ok(now.receiptPhoto === golden.receiptPhoto, "S3.7 the receipt field equals the golden");
}, module);
