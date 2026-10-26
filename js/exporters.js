/**
 * QuartetLab Multi-Format Exporters & Zero-Backend URL State Serializer
 * Supports:
 *  - CSV / TSV (RFC 4180 compliant)
 *  - Reproducible R script (base lm + ggplot2 + Cook's Distance)
 *  - Reproducible Python script (pandas + scipy.stats + statsmodels)
 *  - TI-84 Plus / CE Calculator list assignment & LinReg(a+bx) command
 *  - LaTeX booktabs table (Computer Regression Output + Observation Diagnostics)
 *  - URL Hash State encoding/decoding for serverless GitHub Pages sharing
 */

function sanitizeIdentifier(raw, fallback = "var") {
  const cleaned = String(raw || fallback)
    .trim()
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  if (!cleaned) return fallback;
  return /^[0-9]/.test(cleaned) ? `v_${cleaned}` : cleaned;
}

function escapeCsvCell(val) {
  const str = String(val ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate CSV text including raw coordinates and full regression diagnostics.
 * @param {object} meta
 * @param {object} diag
 * @param {number} decimals
 * @returns {string}
 */
export function exportToCSV(meta, diag, decimals = 4) {
  const xCol = meta.xLabel || "X";
  const yCol = meta.yLabel || "Y";
  const headers = [
    "obs_id",
    "label",
    xCol,
    yCol,
    "fitted_y",
    "residual",
    "leverage_h",
    "studentized_residual",
    "cooks_distance",
    "diagnostic_flag"
  ];
  const rows = [headers.map(escapeCsvCell).join(",")];
  for (const pt of diag.points) {
    rows.push(
      [
        pt.index + 1,
        pt.label || `Obs ${pt.index + 1}`,
        pt.x.toFixed(decimals),
        pt.y.toFixed(decimals),
        pt.yhat.toFixed(decimals),
        pt.residual.toFixed(decimals),
        pt.leverage.toFixed(decimals),
        pt.studentizedResidual.toFixed(decimals),
        pt.cooksD.toFixed(decimals),
        pt.primaryFlag
      ]
        .map(escapeCsvCell)
        .join(",")
    );
  }
  return rows.join("\n");
}

/**
 * Generate reproducible R script for RStudio / Posit Cloud.
 * @param {object} meta
 * @param {object} diag
 * @param {number} decimals
 * @returns {string}
 */
export function exportToRScript(meta, diag, decimals = 4) {
  const xVar = sanitizeIdentifier(meta.xLabel, "x");
  const yVar = sanitizeIdentifier(meta.yLabel, "y");
  const xVals = diag.points.map((p) => p.x.toFixed(decimals)).join(", ");
  const yVals = diag.points.map((p) => p.y.toFixed(decimals)).join(", ");

  return [
    `# QuartetLab Reproducible R Script — ${meta.title || "Custom Dataset"}`,
    `# Summary: n = ${diag.n}, mean(X) = ${diag.meanX.toFixed(4)}, sd(X) = ${diag.sdX.toFixed(4)}, r = ${diag.r.toFixed(4)}`,
    ``,
    `${xVar} <- c(${xVals})`,
    `${yVar} <- c(${yVals})`,
    `df <- data.frame(${xVar} = ${xVar}, ${yVar} = ${yVar})`,
    ``,
    `# Ordinary Least Squares Fit & Summary Table`,
    `fit <- lm(${yVar} ~ ${xVar}, data = df)`,
    `summary(fit)`,
    ``,
    `# Diagnostic Table: Fitted, Residuals, Leverage (h_i), Studentized Resids, Cook's D`,
    `diagnostics <- data.frame(`,
    `  df,`,
    `  fitted = fitted(fit),`,
    `  residual = resid(fit),`,
    `  leverage = hatvalues(fit),`,
    `  studentized_resid = rstandard(fit),`,
    `  cooks_d = cooks.distance(fit)`,
    `)`,
    `print(round(diagnostics, ${decimals}))`,
    ``,
    `# Plot Scatter + OLS Line and Residual Plot`,
    `par(mfrow = c(1, 2))`,
    `plot(df$${xVar}, df$${yVar}, pch = 19, col = "#141619",`,
    `     xlab = "${meta.xLabel} (${meta.xUnit || ""})", ylab = "${meta.yLabel} (${meta.yUnit || ""})",`,
    `     main = "Scatter Plot & OLS Fit")`,
    `abline(fit, col = "#0F6E56", lwd = 2)`,
    `plot(fitted(fit), resid(fit), pch = 19, col = "#D9381E",`,
    `     xlab = "Fitted Values", ylab = "Residuals", main = "Residual Plot")`,
    `abline(h = 0, lty = 2, col = "#525866")`
  ].join("\n");
}

/**
 * Generate reproducible Python script using pandas and scipy/statsmodels.
 * @param {object} meta
 * @param {object} diag
 * @param {number} decimals
 * @returns {string}
 */
export function exportToPythonScript(meta, diag, decimals = 4) {
  const xVar = sanitizeIdentifier(meta.xLabel, "x");
  const yVar = sanitizeIdentifier(meta.yLabel, "y");
  const xVals = diag.points.map((p) => Number(p.x.toFixed(decimals))).join(", ");
  const yVals = diag.points.map((p) => Number(p.y.toFixed(decimals))).join(", ");

  return [
    `# QuartetLab Reproducible Python Script — ${meta.title || "Custom Dataset"}`,
    `import numpy as np`,
    `import pandas as pd`,
    `from scipy import stats`,
    ``,
    `df = pd.DataFrame({`,
    `    "${xVar}": [${xVals}],`,
    `    "${yVar}": [${yVals}]`,
    `})`,
    ``,
    `res = stats.linregress(df["${xVar}"], df["${yVar}"])`,
    `print(f"OLS Equation: y_hat = {res.intercept:.4f} + {res.slope:.4f} * x")`,
    `print(f"Pearson r = {res.rvalue:.4f}, R^2 = {res.rvalue**2:.4f}, p-value = {res.pvalue:.4g}")`,
    ``,
    `df["fitted"] = res.intercept + res.slope * df["${xVar}"]`,
    `df["residual"] = df["${yVar}"] - df["fitted"]`,
    `print(df.round(${decimals}))`
  ].join("\n");
}

/**
 * Generate TI-84 Plus / CE calculator list entry command for classroom entry.
 * @param {object} meta
 * @param {object} diag
 * @param {number} decimals
 * @returns {string}
 */
export function exportToTI84Command(meta, diag, decimals = 3) {
  const xList = diag.points.map((p) => Number(p.x.toFixed(decimals))).join(",");
  const yList = diag.points.map((p) => Number(p.y.toFixed(decimals))).join(",");
  return [
    `REM TI-84 Plus / CE List Entry (${meta.title || "QuartetLab Dataset"})`,
    `{${xList}}->L1`,
    `{${yList}}->L2`,
    `LinReg(a+bx) L1,L2,Y1`,
    `REM Expected Output: a = ${diag.intercept.toFixed(4)}, b = ${diag.slope.toFixed(4)}, r = ${diag.r.toFixed(4)}, r^2 = ${diag.r2.toFixed(4)}`
  ].join("\n");
}

/**
 * Generate a publication-ready LaTeX booktabs computer regression output table.
 * @param {object} meta
 * @param {object} diag
 * @returns {string}
 */
export function exportToLaTeXTable(meta, diag) {
  const fmtP = (p) => (p < 0.0001 ? "< 0.0001" : p.toFixed(4));
  return [
    `% QuartetLab LaTeX Computer Regression Output (requires \\usepackage{booktabs})`,
    `\\begin{table}[htbp]`,
    `\\centering`,
    `\\caption{Ordinary Least Squares Regression: ${meta.yLabel || "Y"} on ${meta.xLabel || "X"} ($n = ${diag.n}$)}`,
    `\\begin{tabular}{lrrrr}`,
    `\\toprule`,
    `Predictor & Coef & SE Coef & $T$ & $P$ \\\\`,
    `\\midrule`,
    `Constant & ${diag.intercept.toFixed(4)} & ${diag.seIntercept.toFixed(4)} & ${diag.tIntercept.toFixed(2)} & ${fmtP(diag.pIntercept)} \\\\`,
    `${meta.xLabel || "X"} & ${diag.slope.toFixed(4)} & ${diag.seSlope.toFixed(4)} & ${diag.tSlope.toFixed(2)} & ${fmtP(diag.pSlope)} \\\\`,
    `\\midrule`,
    `\\multicolumn{5}{l}{$S = ${diag.sResid.toFixed(4)} \\quad R\\text{-Sq} = ${(diag.r2 * 100).toFixed(2)}\\% \\quad R\\text{-Sq(adj)} = ${(diag.r2Adj * 100).toFixed(2)}\\%$} \\\\`,
    `\\bottomrule`,
    `\\end{tabular}`,
    `\\end{table}`
  ].join("\n");
}

/**
 * Parse user-pasted CSV or whitespace-delimited text into points.
 * @param {string} rawText
 * @returns {{points: Array<{id: string, label: string, x: number, y: number}>, xLabel?: string, yLabel?: string, errors: string[]}}
 */
export function parseDelimitedText(rawText) {
  const errors = [];
  if (!rawText || typeof rawText !== "string") {
    return { points: [], errors: ["Input text is empty."] };
  }
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length === 0) {
    return { points: [], errors: ["No non-empty lines found."] };
  }

  const splitLine = (line) => {
    if (line.includes("\t")) return line.split("\t").map((s) => s.trim());
    if (line.includes(",")) return line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
    return line.split(/\s+/).map((s) => s.trim());
  };

  let xLabel;
  let yLabel;
  let startRow = 0;
  const firstTokens = splitLine(lines[0]);
  if (firstTokens.length >= 2) {
    const firstNums = firstTokens.map((t) => Number(t));
    if (Number.isNaN(firstNums[0]) && Number.isNaN(firstNums[1])) {
      if (firstTokens.length === 2) {
        [xLabel, yLabel] = firstTokens;
      } else {
        xLabel = firstTokens[1];
        yLabel = firstTokens[2];
      }
      startRow = 1;
    }
  }

  const points = [];
  for (let i = startRow; i < lines.length; i++) {
    const tokens = splitLine(lines[i]);
    if (tokens.length < 2) {
      errors.push(`Line ${i + 1}: Expected at least 2 columns.`);
      continue;
    }
    let label = `Obs ${points.length + 1}`;
    let xVal = Number(tokens[0]);
    let yVal = Number(tokens[1]);

    if ((Number.isNaN(xVal) || Number.isNaN(yVal)) && tokens.length >= 3) {
      label = tokens[0];
      xVal = Number(tokens[1]);
      yVal = Number(tokens[2]);
    }
    if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) {
      errors.push(`Line ${i + 1}: Could not parse numeric coordinates (${tokens.join(", ")}).`);
      continue;
    }
    points.push({
      id: `imp_${points.length + 1}`,
      label,
      x: xVal,
      y: yVal
    });
  }

  return { points, xLabel, yLabel, errors };
}

/**
 * Encode dataset state into a URL-safe hash string for serverless sharing.
 * @param {object} state
 * @returns {string}
 */
export function encodeStateToHash(state) {
  const payload = {
    v: 1,
    t: state.title || "Custom Dataset",
    xl: state.xLabel || "X",
    xu: state.xUnit || "",
    yl: state.yLabel || "Y",
    yu: state.yUnit || "",
    cp: state.contextPrompt || "",
    pts: (state.points || []).map((p) => [
      Number(Number(p.x).toFixed(4)),
      Number(Number(p.y).toFixed(4)),
      p.label || ""
    ])
  };
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `state=${b64}`;
}

/**
 * Decode a URL hash string back into a QuartetLab dataset state.
 * @param {string} hashString
 * @returns {object|null}
 */
export function decodeStateFromHash(hashString) {
  try {
    const clean = String(hashString || "").replace(/^#/, "");
    const match = clean.match(/(?:^|&)state=([A-Za-z0-9_-]+)/);
    if (!match) return null;
    let b64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || !Array.isArray(parsed.pts) || parsed.pts.length < 3) {
      return null;
    }
    return {
      title: String(parsed.t || "Shared Dataset"),
      xLabel: String(parsed.xl || "X"),
      xUnit: String(parsed.xu || ""),
      yLabel: String(parsed.yl || "Y"),
      yUnit: String(parsed.yu || ""),
      contextPrompt: String(parsed.cp || ""),
      points: parsed.pts.map((tuple, idx) => ({
        id: `sh_${idx + 1}`,
        x: Number(tuple[0]),
        y: Number(tuple[1]),
        label: tuple[2] ? String(tuple[2]) : `Obs ${idx + 1}`
      }))
    };
  } catch (_err) {
    return null;
  }
}
