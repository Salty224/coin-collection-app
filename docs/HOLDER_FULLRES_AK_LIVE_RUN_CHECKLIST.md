# (ak) Full-resolution photos: TEST checklist (branch `claude/holder-fullres-ak`)

Run on the TEST build (blue "TEST · claude/holder-fullres-ak" bar), on _Testing coins, phone first, then tablet. Write-up: [docs/ref/PHOTOS.md](ref/PHOTOS.md) "(ak) Full-resolution Holder, Reference and other trim-only photos".

1. Edit Coin, Holder front, 📷 Camera. The crop box starts at the whole photo. Use it untouched, Skip the guided offer, Save. In OneDrive (_Testing/CoinPhotos) the file should be MB, not KB, at the camera's own pixel size (file details).
2. Same, but trim to the slab and straighten about 2°. The file is the trimmed area at full resolution; the slab edge is crisp and straight.
3. Accept the guided "Crop the Obverse" offer on a full holder. The stored `_obverse_cropped` should be about 1100-1400 px, visibly sharper than before.
4. Holder via 🖼️ Library (a photo from the Samsung Gallery), untouched. Its OneDrive size should equal the Gallery file's size exactly.
5. Reference via 📁 Files (from OneDrive).
6. Coin Details: tiles appear quickly (OneDrive's thumbnails); tapping one shows the photo, then it sharpens when the full file lands.
7. Add Coin with a holder, Save to Staging, then Promote. File sizes in CoinPhotos match what was picked.
8. Replace an existing coin's holder with an original. The same PhotoID; Filename `..._02.jpg`; the old file still in CoinPhotos; the existing Obverse unchanged when you Skip.
9. Switch the camera to 50 MP and add a holder. No tab crash. The upload (over 4 MB) lands. Docket, About, Save steps: a line "simple upload refused (413 ...) goes through an upload session" means OneDrive's 4 MB limit is real and the session path was used; no such line means the simple upload took it.
10. Take a photo with the app's 📷 Camera, then open the Samsung Gallery: is that photo there?
11. Save on a weak signal (or switch to airplane mode mid-save). A failure stays pending; Retry sends only it.
12. Timing: the same save (holder pair plus two guided crops on one coin) on wifi, once on LIVE and once on this TEST build. After each, Docket, About, "Last save" and "Save steps": note the total, each "Graph uploadFile ... (size)" line, and the workbook lines (header / row reads, patchWorkbookRanges, addTableRow).
