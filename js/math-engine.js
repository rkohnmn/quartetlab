/**
 * QuartetLab Mathematical & Statistical Engine
 * Zero-dependency ES module implementing:
 *  - Ordinary Least Squares (OLS) regression & ANOVA decomposition
 *  - Exact Sample Moment Projection via Gram-Schmidt orthogonalization
 *  - Point-level diagnostics: Leverage (h_i), Studentized Residuals (r_i, t_i), Cook's Distance (D_i)
 *  - Normal Q-Q theoretical quantiles (Blom plotting positions + inverse normal CDF)
 *  - Exact Student-t and F distribution p-values via continued-fraction incomplete beta function
 *  - Alternative model comparison (Quadratic polynomial & Log-Linear fits)
 */

const EPSILON = 1e-12;

/**
 * Log-gamma function via Lanczos approximation (accurate to ~15 digits).
 * @param {number} z
 * @returns {number}
 */
export function logGamma(z) {
  const g = 7;
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  let x = p[0];
  const zm1 = z - 1;
  for (let i = 1; i < g + 2; i++) {
    x += p[i] / (zm1 + i);
  }
  const t = zm1 + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (zm1 + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Regularized incomplete beta function I_x(a, b) via Lentz's continued fraction.
 * @param {number} x
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function regularizedBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaContinuedFraction(x, a, b)) / a;
  }
  return 1 - (bt * betaContinuedFraction(1 - x, b, a)) / b;
}

function betaContinuedFraction(x, a, b) {
  const maxIter = 200;
  const eps = 3e-14;
  const fpmin = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpmin) d = fpmin;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1.0) < eps) break;
  }
  return h;
}

/**
 * Two-sided p-value for a Student-t statistic with df degrees of freedom.
 * @param {number} tStat
 * @param {number} df
 * @returns {number}
 */
export function studentTTwoSidedPValue(tStat, df) {
  if (!Number.isFinite(tStat) || df <= 0) return NaN;
  if (tStat === 0) return 1.0;
  const x = df / (df + tStat * tStat);
  return Math.min(1, Math.max(0, regularizedBeta(x, 0.5 * df, 0.5)));
}

/**
 * Inverse Standard Normal CDF Phi^-1(p) via Acklam's rational approximation.
 * @param {number} p
 * @returns {number}
 */
export function inverseNormalCDF(p) {
  const prob = Math.min(1 - 1e-12, Math.max(1e-12, p));
  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  if (prob < pLow) {
    const q = Math.sqrt(-2 * Math.log(prob));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (prob <= pHigh) {
    const q = prob - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - prob));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
          ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/**
 * Critical value t_{1 - alpha/2, df} via Cornish-Fisher / Hill expansion + Newton step.
 * @param {number} df
 * @param {number} alpha
 * @returns {number}
 */
export function studentTCritical95(df, alpha = 0.05) {
  if (df <= 0) return 1.96;
  if (df === 1) return Math.tan((Math.PI * (1 - alpha)) / 2);
  if (df === 2) return Math.sqrt(2 / (alpha * (2 - alpha)) - 2);
  const z = inverseNormalCDF(1 - alpha / 2);
  const z2 = z * z;
  let t = z + (z * (z2 + 1)) / (4 * df) +
          (z * (5 * z2 * z2 + 16 * z2 + 3)) / (96 * df * df);
  for (let iter = 0; iter < 6; iter++) {
    const pTwo = studentTTwoSidedPValue(t, df);
    const err = pTwo - alpha;
    if (Math.abs(err) < 1e-10) break;
    const pdf = Math.exp(
      logGamma((df + 1) / 2) - logGamma(df / 2) -
      0.5 * Math.log(df * Math.PI) -
      ((df + 1) / 2) * Math.log(1 + (t * t) / df)
    );
    t += err / (2 * Math.max(pdf, 1e-12));
  }
  return t;
}

/**
 * Quantile helper (linear interpolation, type 7).
 * @param {number[]} sorted
 * @param {number} q
 * @returns {number}
 */
function quantileSorted(sorted, q) {
  if (!sorted.length) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

/**
 * Spearman rank correlation rho_s with tie-averaging.
 * @param {Array<{x: number, y: number}>} points
 * @returns {number}
 */
export function computeSpearmanRank(points) {
  const n = points.length;
  if (n < 2) return 0;
  const rankVector = (vals) => {
    const indexed = vals.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(n);
    let idx = 0;
    while (idx < n) {
      let end = idx;
      while (end + 1 < n && indexed[end + 1].v === indexed[idx].v) end++;
      const avgRank = (idx + end) / 2 + 1;
      for (let k = idx; k <= end; k++) {
        ranks[indexed[k].i] = avgRank;
      }
      idx = end + 1;
    }
    return ranks;
  };
  const rx = rankVector(points.map((p) => p.x));
  const ry = rankVector(points.map((p) => p.y));
  const meanR = (n + 1) / 2;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < n; i++) {
    const dx = rx[i] - meanR;
    const dy = ry[i] - meanR;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  const denom = Math.sqrt(vx * vy);
  return denom > EPSILON ? cov / denom : 0;
}

/**
 * Fit a quadratic polynomial y = b0 + b1*x + b2*x^2 via 3x3 normal equations.
 * @param {Array<{x: number, y: number}>} points
 * @param {number} meanY
 * @param {number} sst
 * @returns {{b0: number, b1: number, b2: number, r2: number} | null}
 */
export function fitQuadraticModel(points, meanY, sst) {
  const n = points.length;
  if (n < 4 || sst <= EPSILON) return null;
  let sx1 = 0, sx2 = 0, sx3 = 0, sx4 = 0;
  let sy = 0, sxy = 0, sx2y = 0;
  for (let i = 0; i < n; i++) {
    const x = points[i].x;
    const y = points[i].y;
    const x2 = x * x;
    sx1 += x;
    sx2 += x2;
    sx3 += x2 * x;
    sx4 += x2 * x2;
    sy += y;
    sxy += x * y;
    sx2y += x2 * y;
  }
  const A = [
    [n, sx1, sx2, sy],
    [sx1, sx2, sx3, sxy],
    [sx2, sx3, sx4, sx2y]
  ];
  // Gaussian elimination with partial pivoting
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[pivot][col])) pivot = row;
    }
    if (Math.abs(A[pivot][col]) < 1e-11) return null;
    [A[col], A[pivot]] = [A[pivot], A[col]];
    const div = A[col][col];
    for (let j = col; j < 4; j++) A[col][j] /= div;
    for (let row = 0; row < 3; row++) {
      if (row !== col) {
        const factor = A[row][col];
        for (let j = col; j < 4; j++) A[row][j] -= factor * A[col][j];
      }
    }
  }
  const [b0, b1, b2] = [A[0][3], A[1][3], A[2][3]];
  let sseQuad = 0;
  for (let i = 0; i < n; i++) {
    const x = points[i].x;
    const yhat = b0 + b1 * x + b2 * x * x;
    const err = points[i].y - yhat;
    sseQuad += err * err;
  }
  const r2 = Math.max(0, Math.min(1, 1 - sseQuad / sst));
  return { b0, b1, b2, r2 };
}

/**
 * Compute full bivariate statistics, OLS inference, ANOVA, and point-level diagnostics.
 * @param {Array<{id?: string|number, x: number, y: number, label?: string}>} points
 * @returns {object}
 */
export function computeDatasetDiagnostics(points) {
  const n = Array.isArray(points) ? points.length : 0;
  if (n < 3) {
    return {
      valid: false,
      n,
      reason: "At least 3 observations are required for OLS regression inference."
    };
  }

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += Number(points[i].x);
    sumY += Number(points[i].y);
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let ssx = 0;
  let ssy = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = Number(points[i].x) - meanX;
    const dy = Number(points[i].y) - meanY;
    ssx += dx * dx;
    ssy += dy * dy;
    sxy += dx * dy;
  }

  const sdX = Math.sqrt(ssx / (n - 1));
  const sdY = Math.sqrt(ssy / (n - 1));
  const denomR = Math.sqrt(ssx * ssy);
  const r = denomR > EPSILON ? Math.max(-1, Math.min(1, sxy / denomR)) : 0;
  const r2 = r * r;
  const r2Adj = n > 2 ? 1 - ((1 - r2) * (n - 1)) / (n - 2) : r2;

  const slope = ssx > EPSILON ? sxy / ssx : 0;
  const intercept = meanY - slope * meanX;

  let sse = 0;
  let ssr = 0;
  const rawResiduals = new Array(n);
  const fittedValues = new Array(n);

  for (let i = 0; i < n; i++) {
    const yhat = intercept + slope * Number(points[i].x);
    const resid = Number(points[i].y) - yhat;
    fittedValues[i] = yhat;
    rawResiduals[i] = resid;
    sse += resid * resid;
    ssr += (yhat - meanY) * (yhat - meanY);
  }

  const df = n - 2;
  const sResid = df > 0 ? Math.sqrt(Math.max(0, sse) / df) : 0;
  const seSlope = ssx > EPSILON ? sResid / Math.sqrt(ssx) : Infinity;
  const seIntercept = ssx > EPSILON
    ? sResid * Math.sqrt(1 / n + (meanX * meanX) / ssx)
    : Infinity;

  const tSlope = seSlope > EPSILON && Number.isFinite(seSlope) ? slope / seSlope : 0;
  const tIntercept = seIntercept > EPSILON && Number.isFinite(seIntercept) ? intercept / seIntercept : 0;
  const pSlope = studentTTwoSidedPValue(tSlope, df);
  const pIntercept = studentTTwoSidedPValue(tIntercept, df);
  const fStat = tSlope * tSlope;
  const tCrit95 = studentTCritical95(df, 0.05);
  const slopeCI95 = [slope - tCrit95 * seSlope, slope + tCrit95 * seSlope];

  // Thresholds for diagnostic flags
  const leverageThreshold = (2 * 2) / n; // 2p / n where p = 2 parameters
  const cooksThreshold = 4 / n;

  const pointDiagnostics = points.map((pt, i) => {
    const x = Number(pt.x);
    const y = Number(pt.y);
    const yhat = fittedValues[i];
    const resid = rawResiduals[i];
    const h = ssx > EPSILON ? 1 / n + ((x - meanX) * (x - meanX)) / ssx : 1 / n;
    const oneMinusH = Math.max(EPSILON, 1 - h);
    const internalStdResid = sResid > EPSILON ? resid / (sResid * Math.sqrt(oneMinusH)) : 0;
    const r2Int = internalStdResid * internalStdResid;
    const jackknifeDenom = Math.max(EPSILON, n - 2 - r2Int);
    const externalStdResid = n > 3
      ? internalStdResid * Math.sqrt((n - 3) / jackknifeDenom)
      : internalStdResid;
    const cooksD = (r2Int / 2) * (h / oneMinusH);

    const isHighLeverage = h > leverageThreshold && n >= 5;
    const isInfluential = cooksD > Math.max(cooksThreshold, 0.25);
    const isOutlier = Math.abs(internalStdResid) > 2.0;

    let primaryFlag = "OK";
    if (isInfluential) primaryFlag = "INFLUENTIAL";
    else if (isHighLeverage) primaryFlag = "HIGH LEV";
    else if (isOutlier) primaryFlag = "OUTLIER";

    return {
      index: i,
      id: pt.id ?? `pt_${i + 1}`,
      label: pt.label ?? `Obs ${i + 1}`,
      x,
      y,
      yhat,
      residual: resid,
      leverage: h,
      studentizedResidual: internalStdResid,
      jackknifeResidual: externalStdResid,
      cooksD,
      isHighLeverage,
      isInfluential,
      isOutlier,
      primaryFlag
    };
  });

  // Normal Q-Q Plot pairs sorted by raw residual
  const sortedForQQ = [...pointDiagnostics]
    .sort((a, b) => a.residual - b.residual)
    .map((item, rankIdx) => {
      const p = (rankIdx + 1 - 0.375) / (n + 0.25);
      const theoZ = inverseNormalCDF(p);
      return {
        index: item.index,
        id: item.id,
        theoreticalZ: theoZ,
        standardizedResidual: item.studentizedResidual,
        rawResidual: item.residual,
        primaryFlag: item.primaryFlag
      };
    });

  // Univariate 5-number summaries
  const sortedX = points.map((p) => Number(p.x)).sort((a, b) => a - b);
  const sortedY = points.map((p) => Number(p.y)).sort((a, b) => a - b);

  const spearmanRho = computeSpearmanRank(points);
  const quadraticFit = fitQuadraticModel(points, meanY, ssy);

  return {
    valid: true,
    n,
    df,
    meanX,
    sdX,
    medianX: quantileSorted(sortedX, 0.5),
    iqrX: quantileSorted(sortedX, 0.75) - quantileSorted(sortedX, 0.25),
    minX: sortedX[0],
    maxX: sortedX[n - 1],
    meanY,
    sdY,
    medianY: quantileSorted(sortedY, 0.5),
    iqrY: quantileSorted(sortedY, 0.75) - quantileSorted(sortedY, 0.25),
    minY: sortedY[0],
    maxY: sortedY[n - 1],
    r,
    spearmanRho,
    r2,
    r2Adj,
    slope,
    intercept,
    seSlope,
    seIntercept,
    tSlope,
    tIntercept,
    pSlope,
    pIntercept,
    fStat,
    tCrit95,
    slopeCI95,
    sResid,
    ssx,
    ssy,
    sxy,
    ssr,
    sse,
    sst: ssy,
    leverageThreshold,
    cooksThreshold,
    points: pointDiagnostics,
    qqPoints: sortedForQQ,
    quadraticFit
  };
}

/**
 * Exact Sample Moment Projection Solver.
 * Projects an existing point cloud (n >= 3) onto the exact manifold of datasets
 * having sample mean (meanX, meanY), sample SD (sdX, sdY), and Pearson correlation r,
 * while preserving the orthogonal residual structure via Gram-Schmidt orthogonalization.
 *
 * @param {Array<{id?: string|number, x: number, y: number, label?: string}>} points
 * @param {{meanX: number, sdX: number, meanY: number, sdY: number, r: number}} targets
 * @returns {Array<{id: string|number, x: number, y: number, label?: string}>}
 */
export function projectToExactMoments(points, targets) {
  const n = points.length;
  if (n < 3) return points.map((p) => ({ ...p }));

  const targetMeanX = Number.isFinite(targets.meanX) ? Number(targets.meanX) : 9.0;
  const targetSdX = Math.max(1e-6, Number.isFinite(targets.sdX) ? Number(targets.sdX) : 3.3166);
  const targetMeanY = Number.isFinite(targets.meanY) ? Number(targets.meanY) : 7.50;
  const targetSdY = Math.max(1e-6, Number.isFinite(targets.sdY) ? Number(targets.sdY) : 2.0316);
  const targetR = Math.max(-0.9999, Math.min(0.9999, Number.isFinite(targets.r) ? Number(targets.r) : 0.8164));

  // Step 1: Center X and Y
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += Number(points[i].x);
    my += Number(points[i].y);
  }
  mx /= n;
  my /= n;

  const u = new Array(n);
  const v = new Array(n);
  let ssu = 0;
  for (let i = 0; i < n; i++) {
    u[i] = Number(points[i].x) - mx;
    v[i] = Number(points[i].y) - my;
    ssu += u[i] * u[i];
  }

  // Fallback if all X coordinates were identical
  if (ssu < EPSILON) {
    ssu = 0;
    for (let i = 0; i < n; i++) {
      u[i] = i - (n - 1) / 2;
      ssu += u[i] * u[i];
    }
  }

  const su = Math.sqrt(ssu / (n - 1));
  const zx = u.map((val) => val / su);

  // Step 2: Gram-Schmidt orthogonalization of v against zx (and constant 1)
  let dot = 0;
  for (let i = 0; i < n; i++) {
    dot += zx[i] * v[i];
  }
  const projCoeff = dot / (n - 1);

  let w = new Array(n);
  let meanW = 0;
  for (let i = 0; i < n; i++) {
    w[i] = v[i] - projCoeff * zx[i];
    meanW += w[i];
  }
  meanW /= n;

  let ssw = 0;
  for (let i = 0; i < n; i++) {
    w[i] -= meanW;
    ssw += w[i] * w[i];
  }

  // Fallback if input points were strictly collinear
  if (ssw < EPSILON) {
    for (let i = 0; i < n; i++) {
      w[i] = Math.cos((2 * Math.PI * i) / n) + ((i % 2 === 0) ? 0.25 : -0.25);
    }
    let mw = w.reduce((a, b) => a + b, 0) / n;
    w = w.map((val) => val - mw);
    let d2 = 0;
    for (let i = 0; i < n; i++) d2 += zx[i] * w[i];
    const c2 = d2 / (n - 1);
    ssw = 0;
    for (let i = 0; i < n; i++) {
      w[i] -= c2 * zx[i];
      ssw += w[i] * w[i];
    }
  }

  const sw = Math.sqrt(ssw / (n - 1));
  const zPerp = w.map((val) => val / sw);

  // Step 3: Combine zx and zPerp to achieve exact sample correlation targetR
  const orthWeight = Math.sqrt(Math.max(0, 1 - targetR * targetR));
  return points.map((pt, i) => {
    const zy = targetR * zx[i] + orthWeight * zPerp[i];
    return {
      ...pt,
      id: pt.id ?? `pt_${i + 1}`,
      x: targetMeanX + targetSdX * zx[i],
      y: targetMeanY + targetSdY * zy
    };
  });
}

/**
 * Synthesize a geometric residual pattern and project it onto exact target moments.
 * @param {'linear_noise'|'parabola'|'ring'|'clusters'|'heteroscedastic'|'outlier_leverage'} pattern
 * @param {number} n
 * @param {{meanX: number, sdX: number, meanY: number, sdY: number, r: number}} targets
 * @returns {Array<{id: string, x: number, y: number, label: string}>}
 */
export function synthesizeGeometricDataset(pattern, n = 16, targets = {
  meanX: 9.0,
  sdX: 3.31662479,
  meanY: 7.50090909,
  sdY: 2.03156814,
  r: 0.81642052
}) {
  const count = Math.max(5, Math.min(200, Math.round(n)));
  const raw = [];

  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0.5;
    const centeredT = 2 * t - 1; // [-1, 1]
    let x = centeredT;
    let y = 0;

    if (pattern === "parabola") {
      x = centeredT;
      y = -(centeredT * centeredT) + 0.35 * centeredT;
    } else if (pattern === "ring") {
      const angle = (2 * Math.PI * i) / count;
      x = Math.cos(angle);
      y = Math.sin(angle);
    } else if (pattern === "clusters") {
      const group = i % 3;
      const localAngle = (2 * Math.PI * i) / count;
      const centers = [
        [-0.85, -0.75],
        [0.0, 0.85],
        [0.9, -0.1]
      ];
      x = centers[group][0] + 0.22 * Math.cos(localAngle * 3);
      y = centers[group][1] + 0.22 * Math.sin(localAngle * 3);
    } else if (pattern === "heteroscedastic") {
      x = t + 0.1;
      const sign = i % 2 === 0 ? 1 : -1;
      const mag = (0.15 + 0.85 * t) * (0.5 + 0.5 * Math.sin(i * 1.7));
      y = sign * mag;
    } else if (pattern === "outlier_leverage") {
      if (i < count - 1) {
        x = -0.35 + (0.5 * i) / Math.max(1, count - 2);
        y = 0.25 * x + 0.08 * Math.sin(i * 2.1);
      } else {
        x = 2.4;
        y = -1.6;
      }
    } else {
      // Deterministic quasi-random Halton/trigonometric scatter
      x = centeredT;
      y = 0.45 * Math.sin(i * 2.39996) + 0.25 * Math.cos(i * 1.37);
    }

    raw.push({
      id: `pt_${i + 1}`,
      label: `Obs ${i + 1}`,
      x,
      y
    });
  }

  return projectToExactMoments(raw, targets);
}
