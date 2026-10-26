/**
 * QuartetLab High-DPI Canvas Plotting Engine
 * Renders:
 *  1. Primary Bivariate Scatter Canvas (with OLS fit, 95% CI ribbon, optional Quadratic overlay,
 *     mean fulcrum crosshairs, residual drop-lines, and Cook's Distance / Leverage halos)
 *  2. Synchronized Residual Plot (e_i vs. fitted y_hat_i or x_i)
 *  3. Synchronized Normal Quantile-Quantile (Q-Q) Plot of Studentized Residuals
 */

function getThemePalette() {
  if (typeof window === "undefined" || !window.getComputedStyle) {
    return {
      bg: "#FFFFFF",
      gridMinor: "#F0EDE4",
      gridMajor: "#DDD8C8",
      axis: "#525866",
      text: "#141619",
      point: "#141619",
      pointHover: "#1D4ED8",
      ols: "#0F6E56",
      ci: "rgba(15, 110, 86, 0.14)",
      altModel: "#7C3AED",
      residual: "#D9381E",
      fulcrum: "#B45309"
    };
  }
  const style = window.getComputedStyle(document.documentElement);
  const read = (prop, fallback) => style.getPropertyValue(prop).trim() || fallback;
  return {
    bg: read("--canvas-bg", "#FFFFFF"),
    gridMinor: read("--canvas-grid-minor", "#F0EDE4"),
    gridMajor: read("--canvas-grid-major", "#DDD8C8"),
    axis: read("--canvas-axis", "#525866"),
    text: read("--color-text", "#141619"),
    point: read("--canvas-point", "#141619"),
    pointHover: read("--canvas-point-hover", "#1D4ED8"),
    ols: read("--canvas-ols", "#0F6E56"),
    ci: read("--canvas-ci", "rgba(15, 110, 86, 0.14)"),
    altModel: read("--canvas-alt-model", "#7C3AED"),
    residual: read("--canvas-residual", "#D9381E"),
    fulcrum: read("--canvas-fulcrum", "#B45309")
  };
}

/**
 * Compute nice tick intervals for a numeric range.
 */
export function computeNiceBounds(minVal, maxVal, padFraction = 0.12) {
  let lo = Number.isFinite(minVal) ? minVal : 0;
  let hi = Number.isFinite(maxVal) ? maxVal : 10;
  if (Math.abs(hi - lo) < 1e-6) {
    lo -= 5;
    hi += 5;
  }
  const span = hi - lo;
  const paddedLo = lo - span * padFraction;
  const paddedHi = hi + span * padFraction;
  const rawStep = (paddedHi - paddedLo) / 6;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 1e-9))));
  const norm = rawStep / mag;
  let step = mag;
  if (norm > 5) step = 10 * mag;
  else if (norm > 2) step = 5 * mag;
  else if (norm > 1) step = 2 * mag;

  const niceMin = Math.floor(paddedLo / step) * step;
  const niceMax = Math.ceil(paddedHi / step) * step;
  const ticks = [];
  for (let v = niceMin; v <= niceMax + step * 0.001; v += step) {
    ticks.push(Number(v.toFixed(8)));
  }
  return { min: niceMin, max: niceMax, step, ticks };
}

function setupHiDPICanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = Math.max(240, Math.floor(rect.width || canvas.width || 600));
  const h = Math.max(160, Math.floor(rect.height || canvas.height || 360));
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: w, height: h };
}

function formatTick(val, step) {
  if (Math.abs(val) < 1e-10) return "0";
  if (step >= 1) return String(Math.round(val * 100) / 100);
  if (step >= 0.1) return val.toFixed(1);
  if (step >= 0.01) return val.toFixed(2);
  return val.toFixed(3);
}

/**
 * Render the primary interactive scatter canvas and return coordinate transforms.
 */
export function renderScatterCanvas(canvas, diag, meta, uiState = {}) {
  const { ctx, width, height } = setupHiDPICanvas(canvas);
  const palette = getThemePalette();
  const pad = { top: 20, right: 24, bottom: 44, left: 56 };
  const plotW = Math.max(60, width - pad.left - pad.right);
  const plotH = Math.max(60, height - pad.top - pad.bottom);

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  if (!diag || !diag.valid) {
    ctx.fillStyle = palette.axis;
    ctx.font = "500 13px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("Add at least 3 points to compute regression.", width / 2, height / 2);
    return null;
  }

  const xBounds = uiState.lockedBounds
    ? uiState.lockedBounds.x
    : computeNiceBounds(diag.minX, diag.maxX, 0.14);
  const yBounds = uiState.lockedBounds
    ? uiState.lockedBounds.y
    : computeNiceBounds(diag.minY, diag.maxY, 0.16);

  const toScreenX = (x) => pad.left + ((x - xBounds.min) / (xBounds.max - xBounds.min)) * plotW;
  const toScreenY = (y) => pad.top + plotH - ((y - yBounds.min) / (yBounds.max - yBounds.min)) * plotH;
  const toDataX = (px) => xBounds.min + ((px - pad.left) / plotW) * (xBounds.max - xBounds.min);
  const toDataY = (py) => yBounds.min + ((pad.top + plotH - py) / plotH) * (yBounds.max - yBounds.min);

  // Gridlines & tick labels
  ctx.lineWidth = 1;
  ctx.font = "500 11px 'JetBrains Mono', monospace";

  for (const tx of xBounds.ticks) {
    const sx = toScreenX(tx);
    if (sx < pad.left - 1 || sx > pad.left + plotW + 1) continue;
    ctx.strokeStyle = palette.gridMajor;
    ctx.beginPath();
    ctx.moveTo(sx, pad.top);
    ctx.lineTo(sx, pad.top + plotH);
    ctx.stroke();

    ctx.fillStyle = palette.axis;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(formatTick(tx, xBounds.step), sx, pad.top + plotH + 6);
  }

  for (const ty of yBounds.ticks) {
    const sy = toScreenY(ty);
    if (sy < pad.top - 1 || sy > pad.top + plotH + 1) continue;
    ctx.strokeStyle = palette.gridMajor;
    ctx.beginPath();
    ctx.moveTo(pad.left, sy);
    ctx.lineTo(pad.left + plotW, sy);
    ctx.stroke();

    ctx.fillStyle = palette.axis;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatTick(ty, yBounds.step), pad.left - 8, sy);
  }

  // Plot border
  ctx.strokeStyle = palette.axis;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(pad.left, pad.top, plotW, plotH);

  // Clip plotting region for curves and bands
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.left, pad.top, plotW, plotH);
  ctx.clip();

  // 95% Confidence Interval Band for Mean Response
  if (uiState.showCIBand !== false && diag.ssx > 1e-9 && diag.n >= 4) {
    const steps = 48;
    ctx.fillStyle = palette.ci;
    ctx.beginPath();
    for (let k = 0; k <= steps; k++) {
      const xVal = xBounds.min + (k / steps) * (xBounds.max - xBounds.min);
      const yHat = diag.intercept + diag.slope * xVal;
      const seMean = diag.sResid * Math.sqrt(1 / diag.n + Math.pow(xVal - diag.meanX, 2) / diag.ssx);
      const upper = yHat + diag.tCrit95 * seMean;
      const sx = toScreenX(xVal);
      const sy = toScreenY(upper);
      if (k === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    for (let k = steps; k >= 0; k--) {
      const xVal = xBounds.min + (k / steps) * (xBounds.max - xBounds.min);
      const yHat = diag.intercept + diag.slope * xVal;
      const seMean = diag.sResid * Math.sqrt(1 / diag.n + Math.pow(xVal - diag.meanX, 2) / diag.ssx);
      const lower = yHat - diag.tCrit95 * seMean;
      ctx.lineTo(toScreenX(xVal), toScreenY(lower));
    }
    ctx.closePath();
    ctx.fill();
  }

  // Mean Fulcrum Crosshairs (meanX, meanY)
  if (uiState.showFulcrum !== false) {
    const fx = toScreenX(diag.meanX);
    const fy = toScreenY(diag.meanY);
    ctx.save();
    ctx.strokeStyle = palette.fulcrum;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(fx, pad.top);
    ctx.lineTo(fx, pad.top + plotH);
    ctx.moveTo(pad.left, fy);
    ctx.lineTo(pad.left + plotW, fy);
    ctx.stroke();
    ctx.restore();
  }

  // Optional Quadratic Overlay Curve
  if (uiState.showQuadratic && diag.quadraticFit) {
    const { b0, b1, b2 } = diag.quadraticFit;
    ctx.save();
    ctx.strokeStyle = palette.altModel;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    const steps = 60;
    for (let k = 0; k <= steps; k++) {
      const xVal = xBounds.min + (k / steps) * (xBounds.max - xBounds.min);
      const yVal = b0 + b1 * xVal + b2 * xVal * xVal;
      const sx = toScreenX(xVal);
      const sy = toScreenY(yVal);
      if (k === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Residual vertical drop-lines
  if (uiState.showResidualLines !== false) {
    ctx.save();
    ctx.strokeStyle = palette.residual;
    ctx.lineWidth = 1.25;
    ctx.globalAlpha = 0.55;
    for (const pt of diag.points) {
      const sx = toScreenX(pt.x);
      const sy = toScreenY(pt.y);
      const syHat = toScreenY(pt.yhat);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, syHat);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Primary OLS Regression Line
  const xStart = xBounds.min;
  const xEnd = xBounds.max;
  const yStart = diag.intercept + diag.slope * xStart;
  const yEnd = diag.intercept + diag.slope * xEnd;
  ctx.strokeStyle = palette.ols;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(toScreenX(xStart), toScreenY(yStart));
  ctx.lineTo(toScreenX(xEnd), toScreenY(yEnd));
  ctx.stroke();

  // Fulcrum Pivot Marker at (meanX, meanY)
  if (uiState.showFulcrum !== false) {
    const fx = toScreenX(diag.meanX);
    const fy = toScreenY(diag.meanY);
    ctx.fillStyle = palette.fulcrum;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 6);
    ctx.lineTo(fx + 6, fy + 5);
    ctx.lineTo(fx - 6, fy + 5);
    ctx.closePath();
    ctx.fill();
  }

  // Observation Points & Diagnostic Halos
  for (const pt of diag.points) {
    const sx = toScreenX(pt.x);
    const sy = toScreenY(pt.y);
    const isHovered = uiState.activeIndex === pt.index;

    // Influential Cook's D Halo
    if (pt.isInfluential) {
      ctx.save();
      ctx.strokeStyle = palette.residual;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([3, 2.5]);
      ctx.beginPath();
      ctx.arc(sx, sy, 11, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    } else if (pt.isHighLeverage) {
      ctx.save();
      ctx.strokeStyle = palette.fulcrum;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 9.5, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = isHovered
      ? palette.pointHover
      : pt.isInfluential
      ? palette.residual
      : palette.point;
    ctx.strokeStyle = palette.bg;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(sx, sy, isHovered ? 7 : 5.2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();

  // Axis Titles
  ctx.fillStyle = palette.text;
  ctx.font = "600 12px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const xTitle = meta.xUnit ? `${meta.xLabel} (${meta.xUnit})` : meta.xLabel || "Explanatory X";
  ctx.fillText(xTitle, pad.left + plotW / 2, height - 6);

  ctx.save();
  ctx.translate(14, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const yTitle = meta.yUnit ? `${meta.yLabel} (${meta.yUnit})` : meta.yLabel || "Response Y";
  ctx.fillText(yTitle, 0, 0);
  ctx.restore();

  return {
    xBounds,
    yBounds,
    pad,
    plotW,
    plotH,
    toScreenX,
    toScreenY,
    toDataX,
    toDataY
  };
}

/**
 * Render the synchronized Residual Plot (e_i vs. Fitted y_hat_i).
 */
export function renderResidualCanvas(canvas, diag, uiState = {}) {
  const { ctx, width, height } = setupHiDPICanvas(canvas);
  const palette = getThemePalette();
  const pad = { top: 16, right: 18, bottom: 38, left: 50 };
  const plotW = Math.max(50, width - pad.left - pad.right);
  const plotH = Math.max(50, height - pad.top - pad.bottom);

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  if (!diag || !diag.valid) return null;

  const xVals = diag.points.map((p) => p.yhat);
  const minX = Math.min(...xVals);
  const maxX = Math.max(...xVals);
  const maxAbsE = Math.max(0.5, ...diag.points.map((p) => Math.abs(p.residual)));

  const xBounds = computeNiceBounds(minX, maxX, 0.12);
  const yBounds = computeNiceBounds(-maxAbsE, maxAbsE, 0.15);

  const toScreenX = (x) => pad.left + ((x - xBounds.min) / (xBounds.max - xBounds.min)) * plotW;
  const toScreenY = (y) => pad.top + plotH - ((y - yBounds.min) / (yBounds.max - yBounds.min)) * plotH;

  ctx.font = "500 10px 'JetBrains Mono', monospace";
  for (const tx of xBounds.ticks) {
    const sx = toScreenX(tx);
    if (sx < pad.left || sx > pad.left + plotW) continue;
    ctx.strokeStyle = palette.gridMinor;
    ctx.beginPath();
    ctx.moveTo(sx, pad.top);
    ctx.lineTo(sx, pad.top + plotH);
    ctx.stroke();

    ctx.fillStyle = palette.axis;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(formatTick(tx, xBounds.step), sx, pad.top + plotH + 5);
  }

  for (const ty of yBounds.ticks) {
    const sy = toScreenY(ty);
    if (sy < pad.top || sy > pad.top + plotH) continue;
    ctx.strokeStyle = palette.gridMinor;
    ctx.beginPath();
    ctx.moveTo(pad.left, sy);
    ctx.lineTo(pad.left + plotW, sy);
    ctx.stroke();

    ctx.fillStyle = palette.axis;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatTick(ty, yBounds.step), pad.left - 6, sy);
  }

  // Zero reference line (e = 0)
  const yZero = toScreenY(0);
  if (yZero >= pad.top && yZero <= pad.top + plotH) {
    ctx.save();
    ctx.strokeStyle = palette.ols;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, yZero);
    ctx.lineTo(pad.left + plotW, yZero);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = palette.axis;
  ctx.lineWidth = 1;
  ctx.strokeRect(pad.left, pad.top, plotW, plotH);

  // Plot stems and residual points
  for (const pt of diag.points) {
    const sx = toScreenX(pt.yhat);
    const sy = toScreenY(pt.residual);
    const isHovered = uiState.activeIndex === pt.index;

    ctx.strokeStyle = palette.residual;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx, yZero);
    ctx.lineTo(sx, sy);
    ctx.stroke();

    ctx.fillStyle = isHovered ? palette.pointHover : palette.residual;
    ctx.beginPath();
    ctx.arc(sx, sy, isHovered ? 6 : 4.2, 0, 2 * Math.PI);
    ctx.fill();
  }

  ctx.fillStyle = palette.text;
  ctx.font = "600 11px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Fitted Value (ŷ)", pad.left + plotW / 2, height - 5);

  return { toScreenX, toScreenY };
}

/**
 * Render the Normal Quantile-Quantile (Q-Q) Plot of Studentized Residuals.
 */
export function renderQQCanvas(canvas, diag, uiState = {}) {
  const { ctx, width, height } = setupHiDPICanvas(canvas);
  const palette = getThemePalette();
  const pad = { top: 16, right: 18, bottom: 38, left: 50 };
  const plotW = Math.max(50, width - pad.left - pad.right);
  const plotH = Math.max(50, height - pad.top - pad.bottom);

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  if (!diag || !diag.valid || !diag.qqPoints.length) return null;

  const zMax = Math.max(2.2, ...diag.qqPoints.map((q) => Math.abs(q.theoreticalZ)));
  const rMax = Math.max(2.2, ...diag.qqPoints.map((q) => Math.abs(q.standardizedResidual)));
  const bound = Math.ceil(Math.max(zMax, rMax) * 2) / 2;

  const xBounds = computeNiceBounds(-bound, bound, 0.05);
  const yBounds = computeNiceBounds(-bound, bound, 0.05);

  const toScreenX = (x) => pad.left + ((x - xBounds.min) / (xBounds.max - xBounds.min)) * plotW;
  const toScreenY = (y) => pad.top + plotH - ((y - yBounds.min) / (yBounds.max - yBounds.min)) * plotH;

  ctx.font = "500 10px 'JetBrains Mono', monospace";
  for (const tx of xBounds.ticks) {
    const sx = toScreenX(tx);
    if (sx < pad.left || sx > pad.left + plotW) continue;
    ctx.strokeStyle = palette.gridMinor;
    ctx.beginPath();
    ctx.moveTo(sx, pad.top);
    ctx.lineTo(sx, pad.top + plotH);
    ctx.stroke();

    ctx.fillStyle = palette.axis;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(formatTick(tx, xBounds.step), sx, pad.top + plotH + 5);
  }

  for (const ty of yBounds.ticks) {
    const sy = toScreenY(ty);
    if (sy < pad.top || sy > pad.top + plotH) continue;
    ctx.strokeStyle = palette.gridMinor;
    ctx.beginPath();
    ctx.moveTo(pad.left, sy);
    ctx.lineTo(pad.left + plotW, sy);
    ctx.stroke();

    ctx.fillStyle = palette.axis;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatTick(ty, yBounds.step), pad.left - 6, sy);
  }

  // Identity reference line (y = x)
  ctx.save();
  ctx.strokeStyle = palette.ols;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(toScreenX(xBounds.min), toScreenY(xBounds.min));
  ctx.lineTo(toScreenX(xBounds.max), toScreenY(xBounds.max));
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = palette.axis;
  ctx.lineWidth = 1;
  ctx.strokeRect(pad.left, pad.top, plotW, plotH);

  for (const qp of diag.qqPoints) {
    const sx = toScreenX(qp.theoreticalZ);
    const sy = toScreenY(qp.standardizedResidual);
    const isHovered = uiState.activeIndex === qp.index;

    ctx.fillStyle = isHovered
      ? palette.pointHover
      : qp.primaryFlag !== "OK"
      ? palette.residual
      : palette.point;
    ctx.beginPath();
    ctx.arc(sx, sy, isHovered ? 6 : 4.2, 0, 2 * Math.PI);
    ctx.fill();
  }

  ctx.fillStyle = palette.text;
  ctx.font = "600 11px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Theoretical Normal Quantile (z)", pad.left + plotW / 2, height - 5);

  return { toScreenX, toScreenY };
}
