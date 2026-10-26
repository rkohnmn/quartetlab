/**
 * QuartetLab Curated Pedagogical & Domain Presets
 * Includes classic statistical quartets, physics linearization labs,
 * culinary yield/costing models, and sports analytics scenarios.
 */

export const PRESET_DATASETS = {
  anscombe_1: {
    id: "anscombe_1",
    name: "Anscombe's Quartet I — Well-Behaved Linear",
    category: "Classic Quartets",
    xLabel: "Explanatory X1",
    xUnit: "units",
    yLabel: "Response Y1",
    yUnit: "units",
    contextPrompt:
      "Francis Anscombe (1973) constructed four datasets with identical summary statistics (mean(X) = 9.0, sd(X) = 3.32, mean(Y) = 7.50, sd(Y) = 2.03, r = 0.816). Set I exhibits a linear relationship with homoscedastic, unstructured residuals.",
    points: [
      { id: "a1_1", label: "Case 1", x: 10.0, y: 8.04 },
      { id: "a1_2", label: "Case 2", x: 8.0, y: 6.95 },
      { id: "a1_3", label: "Case 3", x: 13.0, y: 7.58 },
      { id: "a1_4", label: "Case 4", x: 9.0, y: 8.81 },
      { id: "a1_5", label: "Case 5", x: 11.0, y: 8.33 },
      { id: "a1_6", label: "Case 6", x: 14.0, y: 9.96 },
      { id: "a1_7", label: "Case 7", x: 6.0, y: 7.24 },
      { id: "a1_8", label: "Case 8", x: 4.0, y: 4.26 },
      { id: "a1_9", label: "Case 9", x: 12.0, y: 10.84 },
      { id: "a1_10", label: "Case 10", x: 7.0, y: 4.82 },
      { id: "a1_11", label: "Case 11", x: 5.0, y: 5.68 }
    ]
  },

  anscombe_2: {
    id: "anscombe_2",
    name: "Anscombe's Quartet II — Unmodeled Quadratic Curvature",
    category: "Classic Quartets",
    xLabel: "Explanatory X2",
    xUnit: "units",
    yLabel: "Response Y2",
    yUnit: "units",
    contextPrompt:
      "Anscombe Set II shares the exact same sample means, standard deviations, correlation (r = 0.816), and OLS line (y = 3.00 + 0.500x) as Set I, but the residual plot reveals a deterministic quadratic arch (quadratic R² = 1.000).",
    points: [
      { id: "a2_1", label: "Case 1", x: 10.0, y: 9.14 },
      { id: "a2_2", label: "Case 2", x: 8.0, y: 8.14 },
      { id: "a2_3", label: "Case 3", x: 13.0, y: 8.74 },
      { id: "a2_4", label: "Case 4", x: 9.0, y: 8.77 },
      { id: "a2_5", label: "Case 5", x: 11.0, y: 9.26 },
      { id: "a2_6", label: "Case 6", x: 14.0, y: 8.10 },
      { id: "a2_7", label: "Case 7", x: 6.0, y: 6.13 },
      { id: "a2_8", label: "Case 8", x: 4.0, y: 3.10 },
      { id: "a2_9", label: "Case 9", x: 12.0, y: 9.13 },
      { id: "a2_10", label: "Case 10", x: 7.0, y: 7.26 },
      { id: "a2_11", label: "Case 11", x: 5.0, y: 4.74 }
    ]
  },

  anscombe_3: {
    id: "anscombe_3",
    name: "Anscombe's Quartet III — High-Influence Vertical Outlier",
    category: "Classic Quartets",
    xLabel: "Explanatory X3",
    xUnit: "units",
    yLabel: "Response Y3",
    yUnit: "units",
    contextPrompt:
      "Ten observations in Anscombe Set III lie on a tight line (y = 4.00 + 0.345x), while a single influential observation at (13.0, 12.74) with Cook's Distance D = 1.39 pulls the OLS slope to 0.500 and reduces r from 1.000 to 0.816.",
    points: [
      { id: "a3_1", label: "Case 1", x: 10.0, y: 7.46 },
      { id: "a3_2", label: "Case 2", x: 8.0, y: 6.77 },
      { id: "a3_3", label: "Outlier 3", x: 13.0, y: 12.74 },
      { id: "a3_4", label: "Case 4", x: 9.0, y: 7.11 },
      { id: "a3_5", label: "Case 5", x: 11.0, y: 7.81 },
      { id: "a3_6", label: "Case 6", x: 14.0, y: 8.84 },
      { id: "a3_7", label: "Case 7", x: 6.0, y: 6.08 },
      { id: "a3_8", label: "Case 8", x: 4.0, y: 5.39 },
      { id: "a3_9", label: "Case 9", x: 12.0, y: 8.15 },
      { id: "a3_10", label: "Case 10", x: 7.0, y: 6.42 },
      { id: "a3_11", label: "Case 11", x: 5.0, y: 5.73 }
    ]
  },

  anscombe_4: {
    id: "anscombe_4",
    name: "Anscombe's Quartet IV — Extreme Leverage Point (h = 1.00)",
    category: "Classic Quartets",
    xLabel: "Explanatory X4",
    xUnit: "units",
    yLabel: "Response Y4",
    yUnit: "units",
    contextPrompt:
      "Ten observations in Anscombe Set IV have identical explanatory values (x = 8.0), while a single extreme-leverage observation at (19.0, 12.50) has leverage h_8 = 1.000 and single-handedly determines the slope of 0.500.",
    points: [
      { id: "a4_1", label: "Case 1", x: 8.0, y: 6.58 },
      { id: "a4_2", label: "Case 2", x: 8.0, y: 5.76 },
      { id: "a4_3", label: "Case 3", x: 8.0, y: 7.71 },
      { id: "a4_4", label: "Case 4", x: 8.0, y: 8.84 },
      { id: "a4_5", label: "Case 5", x: 8.0, y: 8.47 },
      { id: "a4_6", label: "Case 6", x: 8.0, y: 7.04 },
      { id: "a4_7", label: "Case 7", x: 8.0, y: 5.25 },
      { id: "a4_8", label: "Leverage 8", x: 19.0, y: 12.50 },
      { id: "a4_9", label: "Case 9", x: 8.0, y: 5.56 },
      { id: "a4_10", label: "Case 10", x: 8.0, y: 7.91 },
      { id: "a4_11", label: "Case 11", x: 8.0, y: 6.89 }
    ]
  },

  physics_pendulum: {
    id: "physics_pendulum",
    name: "Physics Lab — Simple Pendulum Linearization (T² vs. Length L)",
    category: "STEM & Lab Scenarios",
    xLabel: "Cord Length L",
    xUnit: "m",
    yLabel: "Period Squared T²",
    yUnit: "s²",
    contextPrompt:
      "Students in an introductory physics lab measure the oscillation period T of a simple pendulum across 10 cord lengths L (meters) and plot T² (s²) against L to estimate gravitational acceleration g from the theoretical slope 4π²/g ≈ 4.024 s²/m. Trial 9 (L = 1.10 m) contains a stopwatch reaction error.",
    points: [
      { id: "p_1", label: "Trial 1 (0.20m)", x: 0.20, y: 0.82 },
      { id: "p_2", label: "Trial 2 (0.30m)", x: 0.30, y: 1.21 },
      { id: "p_3", label: "Trial 3 (0.40m)", x: 0.40, y: 1.63 },
      { id: "p_4", label: "Trial 4 (0.50m)", x: 0.50, y: 2.00 },
      { id: "p_5", label: "Trial 5 (0.65m)", x: 0.65, y: 2.62 },
      { id: "p_6", label: "Trial 6 (0.75m)", x: 0.75, y: 3.04 },
      { id: "p_7", label: "Trial 7 (0.85m)", x: 0.85, y: 3.41 },
      { id: "p_8", label: "Trial 8 (0.95m)", x: 0.95, y: 3.83 },
      { id: "p_9", label: "Trial 9 (Miscount)", x: 1.10, y: 3.75 },
      { id: "p_10", label: "Trial 10 (1.25m)", x: 1.25, y: 5.04 }
    ]
  },

  culinary_yield: {
    id: "culinary_yield",
    name: "Culinary Operations — Butcher Trim Yield % vs. Edible Portion Cost",
    category: "Applied & Industry",
    xLabel: "Edible Trim Yield",
    xUnit: "%",
    yLabel: "Net Portion Cost (6 oz EP)",
    yUnit: "USD",
    contextPrompt:
      "A kitchen operations audit records the butcher trim yield percentage (Edible Portion weight divided by As-Purchased weight) and the resulting net 6-ounce portion cost (USD) across 12 protein and seafood items. Dry-aged ribeye (Item 11) acts as a high-cost residual outlier due to 28-day moisture loss.",
    points: [
      { id: "c_1", label: "Whole Branzino", x: 46.0, y: 8.40 },
      { id: "c_2", label: "Peking Duck Breast", x: 52.0, y: 7.85 },
      { id: "c_3", label: "Untrimmed Beef Tenderloin", x: 58.0, y: 7.40 },
      { id: "c_4", label: "Rack of Lamb", x: 62.0, y: 6.95 },
      { id: "c_5", label: "Atlantic Halibut Side", x: 66.0, y: 6.50 },
      { id: "c_6", label: "St. Louis Spare Ribs", x: 70.0, y: 5.20 },
      { id: "c_7", label: "Strip Loin Subprimal", x: 74.0, y: 5.55 },
      { id: "c_8", label: "Pork Shoulder Butt", x: 78.0, y: 3.90 },
      { id: "c_9", label: "Duck Leg Confit", x: 81.0, y: 4.35 },
      { id: "c_10", label: "Skin-On Chicken Airline", x: 85.0, y: 3.45 },
      { id: "c_11", label: "Dry-Aged Prime Ribeye", x: 60.0, y: 9.85 },
      { id: "c_12", label: "Center-Cut Salmon Fillet", x: 91.0, y: 3.15 }
    ]
  },

  sports_oline: {
    id: "sports_oline",
    name: "Sports Analytics — Pass-Block Win Rate % vs. Clean Pocket Time",
    category: "Applied & Industry",
    xLabel: "Pass-Block Win Rate",
    xUnit: "%",
    yLabel: "Clean Pocket Time",
    yUnit: "sec",
    contextPrompt:
      "Across a 12-game football season, analysts track an offensive line's Pass-Block Win Rate (%)—the percentage of snaps blocks hold for at least 2.5 seconds—and the quarterback's average time to throw in a clean pocket (seconds).",
    points: [
      { id: "s_1", label: "Week 1", x: 51.2, y: 2.38 },
      { id: "s_2", label: "Week 2", x: 54.8, y: 2.46 },
      { id: "s_3", label: "Week 3", x: 57.5, y: 2.55 },
      { id: "s_4", label: "Week 4", x: 59.0, y: 2.59 },
      { id: "s_5", label: "Week 5", x: 61.4, y: 2.66 },
      { id: "s_6", label: "Week 6", x: 63.2, y: 2.71 },
      { id: "s_7", label: "Week 7 (Quick Game)", x: 68.5, y: 2.34 },
      { id: "s_8", label: "Week 8", x: 65.0, y: 2.76 },
      { id: "s_9", label: "Week 9", x: 67.1, y: 2.82 },
      { id: "s_10", label: "Week 10", x: 70.4, y: 2.91 },
      { id: "s_11", label: "Week 11", x: 72.8, y: 2.97 },
      { id: "s_12", label: "Week 12", x: 75.0, y: 3.04 }
    ]
  },

  heteroscedastic_fan: {
    id: "heteroscedastic_fan",
    name: "Diagnostic Violation — Heteroscedastic Fan (Non-Constant Variance)",
    category: "STEM & Lab Scenarios",
    xLabel: "Household Income",
    xUnit: "$1,000s",
    yLabel: "Annual Travel Expenditure",
    yUnit: "$1,000s",
    contextPrompt:
      "A survey of 14 households measures annual income ($1,000s) and annual international travel expenditure ($1,000s). While the linear correlation is strong (r = 0.81), the residual plot displays a pronounced megaphone fan, violating the constant-variance condition required for standard OLS t-inference.",
    points: [
      { id: "h_1", label: "HH 1", x: 42.0, y: 1.4 },
      { id: "h_2", label: "HH 2", x: 48.0, y: 1.7 },
      { id: "h_3", label: "HH 3", x: 55.0, y: 2.1 },
      { id: "h_4", label: "HH 4", x: 64.0, y: 1.9 },
      { id: "h_5", label: "HH 5", x: 72.0, y: 3.4 },
      { id: "h_6", label: "HH 6", x: 85.0, y: 2.2 },
      { id: "h_7", label: "HH 7", x: 94.0, y: 5.1 },
      { id: "h_8", label: "HH 8", x: 108.0, y: 2.9 },
      { id: "h_9", label: "HH 9", x: 118.0, y: 7.4 },
      { id: "h_10", label: "HH 10", x: 132.0, y: 3.8 },
      { id: "h_11", label: "HH 11", x: 145.0, y: 9.6 },
      { id: "h_12", label: "HH 12", x: 160.0, y: 4.5 },
      { id: "h_13", label: "HH 13", x: 175.0, y: 12.2 },
      { id: "h_14", label: "HH 14", x: 190.0, y: 6.1 }
    ]
  }
};
