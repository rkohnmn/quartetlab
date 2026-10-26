# Market Research, Competitive Teardown & Product Rationale.

**Research Date:** October 26, 2026.  
**Selected Product:** QuartetLab — Interactive Bivariate Dataset Synthesizer, Exact-Moment Solver & Regression Diagnostic Studio.

## 1. Problem Statement and Underserved Market Need.

Statistics teachers, physics instructors, and data analysts build custom bivariate datasets each week. They need data that show specific regression behaviors. Common examples include non-linear residual arches, high hat-value points ($h_i > 4/n$), influential outliers (Cook's Distance $D_i > 4/n$), and heteroscedastic error fans. They also need Minitab-format computer regression tables, graphing calculator lists, and printable free-response handouts.

Current browser utilities split this workflow into separate steps. An instructor either sketches rough points by hand without exact summary statistics, or writes R and Python code to orthogonalize residuals and format tables manually.

## 2. Candidate Evaluation Matrix.

We scored three candidate static web products from 1 to 5 across ten criteria before selecting QuartetLab.

1. **Candidate 1: QuartetLab (Statistical Synthesizer & FRQ Studio).** Scored **50 / 50** (5 across all ten criteria: problem strength, demand evidence, differentiation, immediate utility, organic search reach, shareability, static feasibility, local privacy, visual depth, and maintainability).
2. **Candidate 2: TareLine (Culinary Yield & Recipe Costing).** Scored **39 / 50**. Operators on [r/Chefit](https://www.reddit.com/r/Chefit/comments/1lvufak/is_meez_worth_it_for_recipe_costing_for_my_small/) and [r/KitchenConfidential](https://www.reddit.com/r/KitchenConfidential/comments/1ae1upe/meez_alternative_recipe_costing_software_any/) compare [meez](https://www.getmeez.com/) and [ReciPal](https://www.recipal.com/blog/resources/best-food-cost-software) ($29 per recipe or $49 to $129 monthly) against spreadsheets. However, restaurants demand live supplier invoice OCR and POS sync, which require a backend server.
3. **Candidate 3: CleanCSV Local (Browser Schema Profiler).** Scored **39 / 50**. Developers launched local CSV cleaners on [r/SideProject](https://www.reddit.com/r/SideProject/comments/1w8llba/csv_cleanup_kit_local_processing_with_a/) in September 2026. That niche is already crowded with DuckDB-Wasm viewers.

## 3. Verified Market Evidence vs. Hypotheses.

### Verified Findings.

1. **Freehand dataset sketchers lack exact statistical precision.** Robert Grant launched [DrawMyData](https://robertgrantstats.co.uk/drawmydata.html) in August 2016 ([Introduction to the New Statistics](https://thenewstatistics.com/itns/2016/08/22/draw-your-own-data-tool/)). Alberto Cairo used it to draw the Datasaurus ([Experimentology](https://experimentology.io/015-viz.html)). Reviews of Python's `drawdata` library ([Python in Plain English, Jan 2025](https://python.plainenglish.io/drawdata-the-python-library-you-didnt-know-you-needed-b8c2f2ff328b)) point out a key flaw: hand-drawn point clouds do not match exact target moments without extra numerical refinement.
2. **Classroom applets analyze data passively.** Teachers on [r/matheducation](https://www.reddit.com/r/matheducation/comments/glclup/teaching_statistics_and_ap_statistics_for_the/) rely on [Stapplet Two Quantitative Variables](https://www.stapplet.net/quant2v.html) and Rossman/Chance applets. These tools compute regressions on pasted numbers, but they offer no point-dragging synthesis, no exact-moment solver, and no printable FRQ worksheet export.
3. **Calculator fluency and Minitab tables are weekly classroom bottlenecks.** High school statistics teachers on [r/matheducation](https://www.reddit.com/r/matheducation/comments/glclup/teaching_statistics_and_ap_statistics_for_the/) highlight two daily needs. Students must practice entering TI-84 calculator lists, and teachers must quiz students using Minitab computer regression output tables and free-response rubrics.
4. **Built-in textbook datasets lack editable scenario context.** Educators evaluating Lock5Stat on [r/matheducation](https://www.reddit.com/r/matheducation/comments/glclup/teaching_statistics_and_ap_statistics_for_the/) note that built-in datasets give bare column names without describing the real-world setting. Users on [r/statistics](https://www.reddit.com/r/statistics/comments/rpib1u/q_ap_statistics_hands_on_labs/) also report a shortage of zero-setup browser labs that build visual intuition without Jupyter setup.

### Explicit Hypotheses.

1. **Hypothesis H1**: High school AP Statistics and college introductory instructors will use the Printable FRQ Sheet generator to build unit quizzes in under three minutes.
2. **Hypothesis H2**: Sharing self-contained dataset links (`#state=...`) in teacher forums and GitHub discussions will drive organic peer adoption.

## 4. Competitive Teardown Across 12 Dimensions.

We scored four tools from 1 (Missing) to 5 (Strongest) across twelve product dimensions.

1. **Features (Synthesis + Diagnostics)**: QuartetLab **5**, DrawMyData **2**, Stapplet **3**, `drawdata` **2**.
2. **Pricing (Free / No Paywall)**: QuartetLab **5**, DrawMyData **5**, Stapplet **5**, `drawdata` **5**.
3. **UX and Immediate Manipulation**: QuartetLab **5**, DrawMyData **3**, Stapplet **4**, `drawdata` **2**.
4. **Performance (60fps Local Canvas)**: QuartetLab **5**, DrawMyData **4**, Stapplet **4**, `drawdata` **3**.
5. **Documentation and Math Transparency**: QuartetLab **5**, DrawMyData **2**, Stapplet **2**, `drawdata` **3**.
6. **Support and Reproducibility**: QuartetLab **4**, DrawMyData **2**, Stapplet **3**, `drawdata` **3**.
7. **Export and Workflow Integrations**: QuartetLab **5**, DrawMyData **2**, Stapplet **1**, `drawdata` **3**.
8. **Privacy and Local Security**: QuartetLab **5**, DrawMyData **5**, Stapplet **4**, `drawdata` **5**.
9. **Scalability (Subpath Static Hosting)**: QuartetLab **5**, DrawMyData **5**, Stapplet **4**, `drawdata` **2**.
10. **Brand and Visual Identity**: QuartetLab **5**, DrawMyData **2**, Stapplet **3**, `drawdata` **2**.
11. **Community Shareability (URL Hash)**: QuartetLab **5**, DrawMyData **1**, Stapplet **2**, `drawdata` **1**.
12. **Innovation (Gram-Schmidt Solver)**: QuartetLab **5**, DrawMyData **3**, Stapplet **2**, `drawdata` **2**.

**Total Scores (out of 60)**: QuartetLab **59**, Stapplet **37**, DrawMyData **36**, Python `drawdata` **33**.

## 5. SWOT Analysis.

### DrawMyData (`robertgrantstats.co.uk/drawmydata.html`).

1. **Strengths**: Runs in a single HTML file. Famous as the tool that created the Datasaurus dataset. Copies CSV tables fast.
2. **Weaknesses**: Cannot lock or solve for exact sample moments ($\bar{x}, s_x, \bar{y}, s_y, r$). Lacks an OLS line, a residual plot, a Q-Q plot, and Cook's Distance. Includes no undo button or URL sharing.
3. **Opportunities for QuartetLab**: Pair freehand point brushing with one-click Gram-Schmidt moment projection and live residual plots.
4. **Threats**: Holds longstanding backlinks across older university course pages.

### Stapplet (`stapplet.net/quant2v.html`).

1. **Strengths**: Uses textbook terminology aligned with *The Practice of Statistics*. Plots clean scatter and residual charts for pasted classroom numbers.
2. **Weaknesses**: Provides a read-only plotting canvas where users cannot drag or brush points. Omits hat values $h_i$, studentized residuals, and Cook's Distance $D_i$. Lacks R, Python, TI-84, LaTeX, or printable worksheet exports.
3. **Opportunities for QuartetLab**: Act as the dataset creation and FRQ authoring studio for teachers who use Stapplet in class.
4. **Threats**: Enjoys high familiarity among AP Statistics teachers.

## 6. User Personas and Workflow Sequence.

### Primary Persona: High School and College Statistics Instructor.

1. **Context**: Teaches AP Statistics or Introductory Statistics. Prepares weekly lab sheets and free-response rubrics.
2. **Goal**: Build custom datasets with exact correlations and clear residual shapes, then print student worksheets with answer keys.
3. **Frustration**: Spending 40 minutes in R nudging numbers by hand so an outlier shifts the slope without breaking summary moments.

### Secondary Persona: STEM Lab Educator and Data Communicator.

1. **Context**: Teaches physics labs (such as pendulum linearization) or writes tutorials on regression diagnostics.
2. **Goal**: Show why summary moments hide model errors, then export clean R, Python, or LaTeX code.

### Four-Step User Sequence.

1. **Arrival**: The user opens the GitHub Pages link. Anscombe Set I loads immediately on the canvas without a signup wall.
2. **Exploration**: The user drags an outlier or switches presets. The OLS line, 95% confidence band, and Cook's $D_i$ halo update at 60fps.
3. **Moment Locking**: The user types target values for $\bar{x}, s_x, \bar{y}, s_y, r$ and clicks Project. Gram-Schmidt projection matches those moments to $10^{-10}$.
4. **Export and Print**: The user clicks Printable FRQ Sheet or copies the R/TI-84 snippet. The browser prints a formatted handout and rubric.
