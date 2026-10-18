# pdf.js — vendored, pinned

**Version:** 6.3.289 (npm `pdfjs-dist@6.3.289`, released 2026-08-29), **legacy build**.
**Licence:** Apache-2.0 (`LICENSE`). Bundled data carries its own licences:
`standard_fonts/LICENSE_FOXIT`, `standard_fonts/LICENSE_LIBERATION`, and the
`wasm/LICENSE_*` files (OpenJPEG, JBIG2, QCMS).

Copied unchanged from the npm package:

| Here | From the package |
|---|---|
| `pdf.min.mjs` | `legacy/build/pdf.min.mjs` |
| `pdf.worker.min.mjs` | `legacy/build/pdf.worker.min.mjs` |
| `cmaps/`, `standard_fonts/`, `wasm/`, `iccs/` | same names at the package root |

SHA-256:
- `pdf.min.mjs` f401927e692efc7735e0cd528c490d0dd31b7f0972c122b7040df805be45cce4
- `pdf.worker.min.mjs` a33cfe728c584fdba4fcc1fd54bcdc2f9f2f13889ddbb5b2bd1d0f8cbe49b84e

**Deliberately NOT vendored:** `pdf.sandbox.min.mjs` (PDF JavaScript), the
`web/` viewer, source maps.

**How the app uses it:** only the receipt viewer, only for a PDF the app did
not make, loaded on demand (never at startup). See CLAUDE.md, "Receipt PDFs:
pdf.js on demand".

**Upgrading:** replace the files above from the new version's package, update
this note (version, date, hashes), and re-run `npm test`. Pick a version at
least two weeks old.
