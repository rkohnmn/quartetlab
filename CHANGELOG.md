# Changelog.

This file tracks notable changes to QuartetLab. The project follows Semantic Versioning (`MAJOR.MINOR.PATCH`).

## Release 1.0.0 (2026-10-26).

1. **Dual-Canvas Workbench.** Built a high-DPI scatter plot paired with Residual and Q-Q plots.
2. **Exact-Moment Solver.** Added Gram-Schmidt projection (`projectToExactMoments`) to match target sample moments.
3. **Shape Synthesizer.** Added six geometric residual generators for arches, rings, clusters, and fans.
4. **Domain Presets.** Added eight datasets across Anscombe's Quartet (I–IV), physics, and culinary yields.
5. **Point Diagnostics.** Computed fitted values $\hat{y}_i$, residuals $e_i$, hat values $h_i$, and Cook's Distance $D_i$.
6. **Computer Output Table.** Rendered Minitab and R tables showing `Coef`, `SE Coef`, `T`, `P`, and `R-Sq`.
7. **Export Suite.** Added one-click exports for CSV, R, Python, TI-84 `L1/L2` lists, and LaTeX tables.
8. **Printable FRQ Studio.** Built a print handout view with charts, a regression table, and an answer rubric.
9. **Local Persistence.** Added safe `localStorage` session restore, snapshots, and `#state=...` URL sharing.
