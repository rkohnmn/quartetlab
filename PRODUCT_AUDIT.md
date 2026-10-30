# QuartetLab: Studio quality improvements

Review date: October 29, 2026. Publication to main was authorized after local verification. GitHub Actions records the deployment and remote validation results.

## Product direction

The application keeps its existing paper/emerald palette, serif headings, and numerical typography. Responsive layout fixes keep controls within the viewport while allowing dense tables and navigation to scroll in their own containers. Existing print styling remains separate from the screen-specific product stylesheet.

Preserved product strengths: Equal-summary dataset exploration, exact-moment synthesis, regression diagnostics, and interactive plotting.

## Implemented changes

- Heading, summary-number, and control spacing follow the shared product direction. Phone summaries use two columns.
- CSV/TSV import preserves quoted commas, embedded newlines, and numeric labels. Missing or invalid coordinates reject the import instead of becoming zero or silently dropping rows.
- Byte, row, and cell bounds are enforced before a replacement dataset is applied.
- Import errors remain beside the input. The dialog cycles keyboard focus, closes with Escape, restores focus, and preserves native text-editing shortcuts.

## Import limits

Interactive imports accept at most 2 MiB, 5,000 rows, 40 columns, and 100,000 cells. These are deliberate UI bounds, not a claim that every permitted dataset runs quickly. Choose a representative subset for larger datasets. Each lab retains its format-specific semantics; the preparation lab can preview malformed rows that the analytical labs reject.

## Repeatable validation

```sh
npm test
npm run verify
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
npm run test:browser
```

The new parser regression cases exercise size limits, quoted records, and missing-value behavior, alongside the existing numerical tests. The Chromium suite visits 1 main workspace(s) at 320, 390, 768, 1024, and 1440 pixels in both themes. It exercises the changed import and keyboard workflows, checks for page overflow and uncaught errors, and saves representative screenshots plus results to `artifacts/browser/` (ignored by Git).

`.github/workflows/product-quality.yml` runs unit/static/browser checks on pull requests and manual dispatch with read-only repository permissions. Remote run results are recorded in GitHub Actions. Existing deployment workflows are unchanged.

## Local verification results

`npm test` passed all 18 tests, `npm run verify` passed, and the per-repository Chromium suite passed. Representative light/dark desktop/phone screenshots were inspected. The results and screenshots are retained locally in `artifacts/browser/`.

## Remaining work

Automatic header detection remains heuristic. This pass does not change the exact-moment solver, regression calculations, or other dialogs' accessibility behavior.

Chromium checks do not replace Firefox/Safari, physical-device, screen-reader, comprehensive contrast, or performance testing. Imports are synchronous within the documented limits; no background-worker migration is claimed.
