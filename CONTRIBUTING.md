# Contributing to QuartetLab

Contributions that improve mathematical precision, accessibility, classroom workflows, or static deployment compatibility are welcome.

## 1. Architectural Constraints

QuartetLab is designed specifically for zero-backend static hosting on GitHub Pages. All pull requests must preserve three invariants:

1. **Zero External Runtime Dependencies**: Do not add CDN script tags, external font stylesheets, or npm runtime bundles that require a bundler to run `index.html`.
2. **Subpath Asset Safety**: Always reference local CSS, JavaScript, and SVG files using explicit relative paths (`./css/...`, `./js/...`, `./assets/...`). Never use root-relative paths (`/css/...`).
3. **100% Local Computation**: Do not introduce telemetry, analytics beacons, or external API calls.

## 2. Local Development Workflow

Clone the repository and serve the static directory with Python or any local HTTP server:

```bash
git clone https://github.com/rkohnmn/quartetlab.git
cd quartetlab
python3 -m http.server 8080
```

Open `http://localhost:8080` in your browser.

## 3. Running Automated Checks Before Submitting a PR

Run all three verification commands from the repository root:

```bash
# 1. Run Node.js unit and integration tests
npm test

# 2. Verify subpath asset paths and repository completeness
npm run verify

# 3. Audit documentation prose quality (must score >= 85.0)
npm run lint:docs
```

## 4. Adding a New Preset Dataset

To add a domain preset in `js/presets.js`:

1. Provide a unique `id`, descriptive `name`, `category`, `xLabel`, `xUnit`, `yLabel`, `yUnit`, and a realistic `contextPrompt`.
2. Supply at least 8 observations with `{ id, label, x, y }`.
3. Add a unit test in `tests/math-engine.test.js` verifying that `computeDatasetDiagnostics` produces the expected slope, correlation, and diagnostic flags for your preset.
