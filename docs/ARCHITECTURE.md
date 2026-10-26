# System Architecture and Mathematical Specification.

QuartetLab is a static browser application. It uses semantic HTML5, CSS custom properties, and zero-dependency ES2022 JavaScript modules. Each statistical calculation, matrix projection, and canvas draw runs locally in the user's browser tab.

## 1. Module Boundaries.

- `index.html`: Application shell, ARIA landmarks, and modal dialogs.
- `DESIGN.md`: Open DESIGN.md specification and visual tokens.
- `css/tokens.css`: Light archival and dark instrument color and type tokens.
- `css/base.css`: Reset rules, responsive bento grid layout, and focus rings.
- `css/components.css`: Interactive panels, tables, buttons, and form controls.
- `css/print.css`: Classroom FRQ worksheet print stylesheet.
- `js/app.js`: State coordinator, undo/redo history, and DOM event handlers.
- `js/math-engine.js`: OLS solver, Gram-Schmidt moment projector, and Student-$t$ distributions.
- `js/presets.js`: Eight curated statistical, physics, culinary, and sports datasets.
- `js/renderer.js`: High-DPI HTML5 Canvas 2D plotting engine.
- `js/exporters.js`: CSV, R, Python, TI-84, LaTeX, and URL hash serializers.
- `js/storage.js`: Safe `localStorage` wrapper and privacy audit tools.
- `tests/`: Automated Node.js unit tests and Python static build checks.

## 2. Exact Sample Moment Projection Algorithm.

Given a point cloud $\{(x_i, y_i)\}_{i=1}^n$ with $n \ge 3$, QuartetLab projects the coordinates onto any target sample means $(\mu_x^*, \mu_y^*)$, sample standard deviations $(s_x^* > 0, s_y^* > 0)$, and Pearson correlation $r^* \in (-1, 1)$. The projection preserves the orthogonal residual structure.

### Step 1: Centering and Standardization of X.

Compute the sample means $\bar{x}$ and $\bar{y}$. Form the centered vectors $u_i = x_i - \bar{x}$ and $v_i = y_i - \bar{y}$. Normalize $\mathbf{u}$ to unit sample variance using $s_u = \sqrt{\frac{1}{n-1}\sum u_i^2}$ so that $z_{x,i} = u_i / s_u$. If all $x_i$ values are equal ($s_u < 10^{-12}$), the solver initializes a linear ramp $u_i = i - (n+1)/2$ first.

### Step 2: Gram-Schmidt Orthogonalization of Y Against X.

Subtract the linear projection of $\mathbf{v}$ onto $\mathbf{z}_x$ to form the orthogonal residual vector $w_i = v_i - c \cdot z_{x,i}$, where $c = \frac{1}{n-1}\sum z_{x,j} v_j$. Re-center $w_i$ to eliminate floating-point drift, then divide by its sample standard deviation $s_w$ to obtain $z_{\perp,i}$. By construction, $\mathbf{z}_{\perp}$ has sample mean $0$, sample standard deviation $1$, and exact zero correlation with $\mathbf{z}_x$.

### Step 3: Affine Synthesis of Target Correlation and Moments.

Combine $\mathbf{z}_x$ and $\mathbf{z}_{\perp}$ to form the standardized response vector $z_{y,i} = r^* z_{x,i} + \sqrt{1 - (r^*)^2} z_{\perp,i}$. Shift and scale both standardized vectors to the target moments: $x_i^{\text{new}} = \mu_x^* + s_x^* z_{x,i}$ and $y_i^{\text{new}} = \mu_y^* + s_y^* z_{y,i}$. This closed-form step runs in $O(n)$ time and matches all five target moments to machine precision ($10^{-14}$).

## 3. Regression Diagnostics and Distribution Functions.

For each observation $i \in \{1, \dots, n\}$, `js/math-engine.js` computes five diagnostic quantities.

- **Fitted Value and Raw Residual**: Computes $\hat{y}_i = \hat{\beta}_0 + \hat{\beta}_1 x_i$ and $e_i = y_i - \hat{y}_i$.
- **Hat Matrix Diagonal ($h_i$)**: Measures horizontal distance from $\bar{x}$ via $h_i = \frac{1}{n} + (x_i - \bar{x})^2 / \sum (x_j - \bar{x})^2$.
- **Internally Studentized Residual ($r_i$)**: Scales the residual by $s_e \sqrt{1 - h_i}$.
- **Cook's Distance ($D_i$)**: Combines residual size and hat value via $D_i = \frac{r_i^2}{2} \cdot \frac{h_i}{1 - h_i}$.
- **Exact Two-Sided $p$-Values**: Evaluates the Student-$t$ statistic $t = \hat{\beta}_1 / SE(\hat{\beta}_1)$ with $df = n - 2$ using Lentz's continued-fraction incomplete beta function $I_x(\frac{df}{2}, \frac{1}{2})$ and Lanczos log-gamma coefficients.

## 4. Subpath-Safe Static Deployment.

GitHub Pages often serves project sites from a repository subpath such as `https://rkohnmn.github.io/quartetlab/`. QuartetLab enforces three rules so subpath hosting works without configuration.

1. Each link in `index.html` uses an explicit relative path (`./css/...`, `./js/...`, `./assets/...`).
2. Shareable dataset URLs store state in the browser hash fragment (`#state=...`) instead of server query routes.
3. The static verifier (`tests/verify-build.py`) fails the build if any root-absolute path (`href="/..."`) or external runtime script appears.
