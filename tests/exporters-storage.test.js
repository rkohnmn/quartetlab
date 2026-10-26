import test from "node:test";
import assert from "node:assert/strict";
import { computeDatasetDiagnostics } from "../js/math-engine.js";
import { PRESET_DATASETS } from "../js/presets.js";
import {
  exportToCSV,
  exportToRScript,
  exportToPythonScript,
  exportToTI84Command,
  exportToLaTeXTable,
  parseDelimitedText,
  encodeStateToHash,
  decodeStateFromHash
} from "../js/exporters.js";

test("CSV, R, Python, TI-84, and LaTeX exporters produce valid non-empty outputs", () => {
  const preset = PRESET_DATASETS.anscombe_1;
  const diag = computeDatasetDiagnostics(preset.points);

  const csv = exportToCSV(preset, diag, 4);
  const csvLines = csv.trim().split("\n");
  assert.equal(csvLines.length, 12); // header + 11 rows
  assert.ok(csvLines[0].includes("cooks_distance"));

  const rCode = exportToRScript(preset, diag, 4);
  assert.ok(rCode.includes("lm(response_y1 ~ explanatory_x1"));
  assert.ok(rCode.includes("cooks.distance(fit)"));

  const pyCode = exportToPythonScript(preset, diag, 4);
  assert.ok(pyCode.includes("stats.linregress"));
  assert.ok(pyCode.includes("pd.DataFrame"));

  const ti84 = exportToTI84Command(preset, diag, 3);
  assert.ok(ti84.includes("->L1"));
  assert.ok(ti84.includes("->L2"));
  assert.ok(ti84.includes("LinReg(a+bx) L1,L2,Y1"));

  const latex = exportToLaTeXTable(preset, diag);
  assert.ok(latex.includes("\\begin{tabular}{lrrrr}"));
  assert.ok(latex.includes("\\toprule"));
});

test("parseDelimitedText parses CSV with headers, 3-column labels, and whitespace input", () => {
  const csvInput = [
    "Length_m, PeriodSq_s2",
    "0.20, 0.82",
    "0.40, 1.63",
    "0.60, 2.41",
    "0.80, 3.22"
  ].join("\n");

  const parsed = parseDelimitedText(csvInput);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.points.length, 4);
  assert.equal(parsed.xLabel, "Length_m");
  assert.equal(parsed.yLabel, "PeriodSq_s2");
  assert.equal(parsed.points[0].x, 0.2);
  assert.equal(parsed.points[0].y, 0.82);

  // 3-column input with label first
  const labeledInput = "TrialA, 10.5, 22.1\nTrialB, 12.0, 25.4\nTrialC, 15.0, 31.0";
  const parsed2 = parseDelimitedText(labeledInput);
  assert.equal(parsed2.points.length, 3);
  assert.equal(parsed2.points[0].label, "TrialA");
  assert.equal(parsed2.points[2].x, 15.0);
});

test("encodeStateToHash and decodeStateFromHash round-trip dataset state losslessly", () => {
  const original = {
    title: "Physics Pendulum Test",
    xLabel: "Length L",
    xUnit: "m",
    yLabel: "Period Squared T²",
    yUnit: "s²",
    contextPrompt: "Pendulum lab check.",
    points: [
      { id: "1", label: "T1", x: 0.25, y: 1.01 },
      { id: "2", label: "T2", x: 0.5, y: 2.01 },
      { id: "3", label: "T3", x: 0.75, y: 3.02 },
      { id: "4", label: "T4", x: 1.0, y: 4.03 }
    ]
  };

  const hash = encodeStateToHash(original);
  assert.ok(hash.startsWith("state="));

  const decoded = decodeStateFromHash(`#${hash}`);
  assert.ok(decoded !== null);
  assert.equal(decoded.title, original.title);
  assert.equal(decoded.xLabel, original.xLabel);
  assert.equal(decoded.yUnit, original.yUnit);
  assert.equal(decoded.points.length, 4);
  assert.equal(decoded.points[2].x, 0.75);
  assert.equal(decoded.points[2].label, "T3");
});
