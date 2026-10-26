import test from "node:test";
import assert from "node:assert/strict";
import {
  computeDatasetDiagnostics,
  projectToExactMoments,
  synthesizeGeometricDataset,
  studentTTwoSidedPValue,
  studentTCritical95,
  computeSpearmanRank
} from "../js/math-engine.js";
import { PRESET_DATASETS } from "../js/presets.js";

test("Anscombe's Quartet I-IV share identical summary moments to 2+ decimal places", () => {
  const keys = ["anscombe_1", "anscombe_2", "anscombe_3", "anscombe_4"];
  for (const key of keys) {
    const diag = computeDatasetDiagnostics(PRESET_DATASETS[key].points);
    assert.equal(diag.valid, true, `${key} should be valid`);
    assert.equal(diag.n, 11);
    assert.ok(Math.abs(diag.meanX - 9.0) < 1e-4, `${key} meanX`);
    assert.ok(Math.abs(diag.sdX - 3.3166) < 1e-3, `${key} sdX`);
    assert.ok(Math.abs(diag.meanY - 7.50) < 1e-2, `${key} meanY`);
    assert.ok(Math.abs(diag.sdY - 2.031) < 1e-2, `${key} sdY`);
    assert.ok(Math.abs(diag.r - 0.816) < 1e-2, `${key} Pearson r`);
    assert.ok(Math.abs(diag.slope - 0.500) < 1e-2, `${key} OLS slope`);
    assert.ok(Math.abs(diag.intercept - 3.00) < 1e-2, `${key} OLS intercept`);
  }
});

test("Anscombe Quartet II quadratic fit achieves R^2 > 0.999", () => {
  const diag = computeDatasetDiagnostics(PRESET_DATASETS.anscombe_2.points);
  assert.ok(diag.quadraticFit !== null);
  assert.ok(diag.quadraticFit.r2 > 0.999, `Expected quadratic R2 > 0.999, got ${diag.quadraticFit.r2}`);
});

test("Anscombe Quartet III flags Observation 3 as Influential (Cook's D > 1.0)", () => {
  const diag = computeDatasetDiagnostics(PRESET_DATASETS.anscombe_3.points);
  const obs3 = diag.points[2];
  assert.equal(obs3.isInfluential, true);
  assert.ok(obs3.cooksD > 1.0, `Expected Cook's D > 1.0, got ${obs3.cooksD}`);
  assert.equal(obs3.primaryFlag, "INFLUENTIAL");
});

test("Anscombe Quartet IV flags Observation 8 with extreme leverage h_i = 1.0", () => {
  const diag = computeDatasetDiagnostics(PRESET_DATASETS.anscombe_4.points);
  const obs8 = diag.points[7];
  assert.ok(Math.abs(obs8.leverage - 1.0) < 1e-9, `Expected leverage 1.0, got ${obs8.leverage}`);
  assert.equal(obs8.isHighLeverage, true);
});

test("projectToExactMoments converges to exact sample moments to 1e-10 precision", () => {
  const target = {
    meanX: 50.0,
    sdX: 12.5,
    meanY: 120.0,
    sdY: 25.0,
    r: -0.725
  };
  const projected = projectToExactMoments(PRESET_DATASETS.anscombe_2.points, target);
  const diag = computeDatasetDiagnostics(projected);
  assert.ok(Math.abs(diag.meanX - target.meanX) < 1e-10, `meanX=${diag.meanX}`);
  assert.ok(Math.abs(diag.sdX - target.sdX) < 1e-10, `sdX=${diag.sdX}`);
  assert.ok(Math.abs(diag.meanY - target.meanY) < 1e-10, `meanY=${diag.meanY}`);
  assert.ok(Math.abs(diag.sdY - target.sdY) < 1e-10, `sdY=${diag.sdY}`);
  assert.ok(Math.abs(diag.r - target.r) < 1e-10, `r=${diag.r}`);

  const expectedSlope = target.r * (target.sdY / target.sdX);
  assert.ok(Math.abs(diag.slope - expectedSlope) < 1e-10);
});

test("projectToExactMoments handles degenerate collinear or constant X inputs gracefully", () => {
  const degenerate = [
    { x: 5, y: 10 },
    { x: 5, y: 20 },
    { x: 5, y: 30 },
    { x: 5, y: 40 },
    { x: 5, y: 50 }
  ];
  const target = { meanX: 10, sdX: 2, meanY: 20, sdY: 4, r: 0.6 };
  const projected = projectToExactMoments(degenerate, target);
  const diag = computeDatasetDiagnostics(projected);
  assert.equal(diag.valid, true);
  assert.ok(Math.abs(diag.meanX - 10) < 1e-9);
  assert.ok(Math.abs(diag.sdX - 2) < 1e-9);
  assert.ok(Math.abs(diag.r - 0.6) < 1e-9);
});

test("synthesizeGeometricDataset produces exact moments across all 6 patterns", () => {
  const patterns = [
    "parabola",
    "ring",
    "clusters",
    "heteroscedastic",
    "outlier_leverage",
    "linear_noise"
  ];
  const target = { meanX: 15, sdX: 4, meanY: 30, sdY: 8, r: 0.55 };
  for (const pat of patterns) {
    const pts = synthesizeGeometricDataset(pat, 18, target);
    assert.equal(pts.length, 18);
    const diag = computeDatasetDiagnostics(pts);
    assert.ok(Math.abs(diag.meanX - 15) < 1e-9, `${pat} meanX`);
    assert.ok(Math.abs(diag.sdX - 4) < 1e-9, `${pat} sdX`);
    assert.ok(Math.abs(diag.meanY - 30) < 1e-9, `${pat} meanY`);
    assert.ok(Math.abs(diag.sdY - 8) < 1e-9, `${pat} sdY`);
    assert.ok(Math.abs(diag.r - 0.55) < 1e-9, `${pat} r`);
  }
});

test("Student-t p-values and 95% critical values match statistical reference tables", () => {
  // For df = 9, t = 4.2426 gives two-sided p ≈ 0.002165
  const p = studentTTwoSidedPValue(4.24264, 9);
  assert.ok(Math.abs(p - 0.002165) < 1e-4, `p=${p}`);

  // For df = 9, t_{0.975, 9} ≈ 2.26216
  const tCrit = studentTCritical95(9, 0.05);
  assert.ok(Math.abs(tCrit - 2.26216) < 1e-3, `tCrit=${tCrit}`);

  // Spearman rank on monotonic sequence is 1.0
  const rho = computeSpearmanRank([
    { x: 1, y: 2 },
    { x: 2, y: 5 },
    { x: 3, y: 10 },
    { x: 4, y: 100 }
  ]);
  assert.ok(Math.abs(rho - 1.0) < 1e-12);
});

test("computeDatasetDiagnostics rejects datasets with fewer than 3 observations", () => {
  const res = computeDatasetDiagnostics([{ x: 1, y: 2 }, { x: 3, y: 4 }]);
  assert.equal(res.valid, false);
});
