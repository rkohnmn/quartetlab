import { trapDialogFocus } from "./dialog-focus.js";
/**
 * QuartetLab Main Application Controller
 * Coordinates interactive canvas manipulation, exact-moment projection,
 * undo/redo history, multi-format exports, URL state sharing, and FRQ worksheet generation.
 */

import {
  computeDatasetDiagnostics,
  projectToExactMoments,
  synthesizeGeometricDataset
} from "./math-engine.js";
import { PRESET_DATASETS } from "./presets.js";
import {
  exportToCSV,
  exportToRScript,
  exportToPythonScript,
  exportToTI84Command,
  exportToLaTeXTable,
  parseDelimitedText,
  encodeStateToHash,
  decodeStateFromHash
} from "./exporters.js";
import {
  saveActiveSession,
  loadActiveSession,
  loadSnapshots,
  saveSnapshot,
  deleteSnapshot,
  saveUiPrefs,
  loadUiPrefs,
  inspectLocalStorageUsage,
  clearAllLocalData
} from "./storage.js";
import {
  renderScatterCanvas,
  renderResidualCanvas,
  renderQQCanvas
} from "./renderer.js";

const MAX_HISTORY = 40;

class QuartetLabApp {
  constructor() {
    this.state = {
      presetId: "anscombe_1",
      title: PRESET_DATASETS.anscombe_1.name,
      xLabel: PRESET_DATASETS.anscombe_1.xLabel,
      xUnit: PRESET_DATASETS.anscombe_1.xUnit,
      yLabel: PRESET_DATASETS.anscombe_1.yLabel,
      yUnit: PRESET_DATASETS.anscombe_1.yUnit,
      contextPrompt: PRESET_DATASETS.anscombe_1.contextPrompt,
      points: PRESET_DATASETS.anscombe_1.points.map((p) => ({ ...p }))
    };

    this.ui = {
      toolMode: "drag", // 'drag' | 'add' | 'erase'
      lockMomentsOnDrag: false,
      showCIBand: true,
      showResidualLines: true,
      showFulcrum: true,
      showQuadratic: false,
      activeExportFormat: "r", // 'csv' | 'r' | 'python' | 'ti84' | 'latex'
      activeIndex: -1,
      draggingIndex: -1,
      lockedBounds: null,
      showRubricInWorksheet: true,
      theme: "light"
    };

    this.history = [];
    this.redoStack = [];
    this.diagnostics = null;
    this.scatterTransform = null;
  }

  init() {
    this.restorePreferences();
    this.restoreInitialDataset();
    this.bindElements();
    this.bindEvents();
    this.recomputeAndRender(false);
  }

  restorePreferences() {
    const prefs = loadUiPrefs();
    if (prefs.theme === "dark" || prefs.theme === "light") {
      this.ui.theme = prefs.theme;
    } else if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      this.ui.theme = "dark";
    }
    document.documentElement.setAttribute("data-theme", this.ui.theme);
  }

  restoreInitialDataset() {
    if (typeof window !== "undefined" && window.location.hash.includes("state=")) {
      const fromHash = decodeStateFromHash(window.location.hash);
      if (fromHash) {
        this.state = {
          presetId: "custom",
          ...fromHash
        };
        return;
      }
    }
    const saved = loadActiveSession();
    if (saved && Array.isArray(saved.points) && saved.points.length >= 3) {
      this.state = {
        presetId: saved.presetId || "anscombe_1",
        title: saved.title || PRESET_DATASETS.anscombe_1.name,
        xLabel: saved.xLabel || "Explanatory X",
        xUnit: saved.xUnit || "",
        yLabel: saved.yLabel || "Response Y",
        yUnit: saved.yUnit || "",
        contextPrompt: saved.contextPrompt || "",
        points: saved.points.map((p, i) => ({
          id: p.id || `pt_${i + 1}`,
          label: p.label || `Obs ${i + 1}`,
          x: Number(p.x),
          y: Number(p.y)
        }))
      };
    }
  }

  pushHistory() {
    const snapshot = JSON.stringify(this.state);
    if (this.history.length && this.history[this.history.length - 1] === snapshot) {
      return;
    }
    this.history.push(snapshot);
    if (this.history.length > MAX_HISTORY) this.history.shift();
    this.redoStack = [];
    this.updateHistoryButtons();
  }

  undo() {
    if (!this.history.length) return;
    this.redoStack.push(JSON.stringify(this.state));
    const prev = JSON.parse(this.history.pop());
    this.state = prev;
    this.recomputeAndRender(true);
    this.showToast("Undid last dataset change.");
  }

  redo() {
    if (!this.redoStack.length) return;
    this.history.push(JSON.stringify(this.state));
    const next = JSON.parse(this.redoStack.pop());
    this.state = next;
    this.recomputeAndRender(true);
    this.showToast("Redid dataset change.");
  }

  updateHistoryButtons() {
    if (this.els.undoBtn) this.els.undoBtn.disabled = this.history.length === 0;
    if (this.els.redoBtn) this.els.redoBtn.disabled = this.redoStack.length === 0;
  }

  bindElements() {
    const $ = (id) => document.getElementById(id);
    this.els = {
      presetSelect: $("preset-select"),
      patternSelect: $("pattern-select"),
      synthesizePatternBtn: $("synthesize-pattern-btn"),
      undoBtn: $("undo-btn"),
      redoBtn: $("redo-btn"),
      resetPresetBtn: $("reset-preset-btn"),
      shareUrlBtn: $("share-url-btn"),
      openImportBtn: $("open-import-btn"),
      openWorksheetBtn: $("open-worksheet-btn"),
      openPrivacyBtn: $("open-privacy-btn"),
      themeToggleBtn: $("theme-toggle-btn"),

      // Moment strip readouts
      mN: $("m-n"),
      mMeanX: $("m-mean-x"),
      mSdX: $("m-sd-x"),
      mMeanY: $("m-mean-y"),
      mSdY: $("m-sd-y"),
      mR: $("m-r"),
      mR2: $("m-r2"),
      mOlsEq: $("m-ols-eq"),

      // Canvas & toolbars
      scatterCanvas: $("scatter-canvas"),
      residualCanvas: $("residual-canvas"),
      qqCanvas: $("qq-canvas"),
      modeButtons: document.querySelectorAll("[data-tool-mode]"),
      toggleCiCheck: $("toggle-ci"),
      toggleResidCheck: $("toggle-resid-lines"),
      toggleQuadCheck: $("toggle-quadratic"),
      lockMomentsCheck: $("lock-moments-check"),
      cursorReadout: $("cursor-readout"),
      diagnosticAlertBanner: $("diagnostic-alert-banner"),

      // Scenario metadata inputs
      xLabelInput: $("x-label-input"),
      xUnitInput: $("x-unit-input"),
      yLabelInput: $("y-label-input"),
      yUnitInput: $("y-unit-input"),
      contextPromptInput: $("context-prompt-input"),

      // Exact-Moment Solver inputs
      targetMeanX: $("target-mean-x"),
      targetSdX: $("target-sd-x"),
      targetMeanY: $("target-mean-y"),
      targetSdY: $("target-sd-y"),
      targetR: $("target-r"),
      projectMomentsBtn: $("project-moments-btn"),
      matchAnscombeBtn: $("match-anscombe-btn"),

      // Computer Regression Output Table
      regTableBody: $("reg-table-body"),
      regSummaryFooter: $("reg-summary-footer"),

      // Observations Diagnostic Table
      pointsTableBody: $("points-table-body"),
      addRowBtn: $("add-row-btn"),

      // Exporters
      exportTabButtons: document.querySelectorAll("[data-export-tab]"),
      codePreviewBox: $("code-preview-box"),
      copyCodeBtn: $("copy-code-btn"),
      downloadCsvBtn: $("download-csv-btn"),

      // Modals
      importModal: $("import-modal"),
      importTextarea: $("import-textarea"),
      confirmImportBtn: $("confirm-import-btn"),
      closeImportBtn: $("close-import-btn"),

      worksheetModal: $("worksheet-modal"),
      worksheetContent: $("worksheet-content"),
      toggleRubricBtn: $("toggle-rubric-btn"),
      printWorksheetBtn: $("print-worksheet-btn"),
      closeWorksheetBtn: $("close-worksheet-btn"),

      privacyModal: $("privacy-modal"),
      storageReportBox: $("storage-report-box"),
      snapshotNameInput: $("snapshot-name-input"),
      saveSnapshotBtn: $("save-snapshot-btn"),
      snapshotsList: $("snapshots-list"),
      wipeStorageBtn: $("wipe-storage-btn"),
      closePrivacyBtn: $("close-privacy-btn"),

      toastContainer: $("toast-container"),
      srStatus: $("sr-live-status")
    };
  }

  bindEvents() {
    // Preset Selection
    this.els.presetSelect?.addEventListener("change", (e) => {
      const id = e.target.value;
      if (PRESET_DATASETS[id]) {
        this.loadPreset(id);
      }
    });

    // Synthesize Geometric Pattern onto current target moments
    this.els.synthesizePatternBtn?.addEventListener("click", () => {
      const pattern = this.els.patternSelect?.value || "parabola";
      this.pushHistory();
      const targets = this.readTargetInputs();
      const count = Math.max(8, this.state.points.length);
      this.state.points = synthesizeGeometricDataset(pattern, count, targets);
      this.state.presetId = "custom";
      this.recomputeAndRender(true);
      this.showToast(`Synthesized ${pattern} pattern with exact target moments.`);
    });

    // Undo / Redo / Reset
    this.els.undoBtn?.addEventListener("click", () => this.undo());
    this.els.redoBtn?.addEventListener("click", () => this.redo());
    this.els.resetPresetBtn?.addEventListener("click", () => {
      const targetPreset = PRESET_DATASETS[this.state.presetId] ? this.state.presetId : "anscombe_1";
      this.loadPreset(targetPreset);
    });

    // Theme Toggle
    this.els.themeToggleBtn?.addEventListener("click", () => {
      this.ui.theme = this.ui.theme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", this.ui.theme);
      saveUiPrefs({ theme: this.ui.theme });
      this.renderAllCanvases();
    });

    // Tool Mode Switcher
    this.els.modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-tool-mode");
        this.ui.toolMode = mode;
        this.els.modeButtons.forEach((b) => {
          const isCurrent = b.getAttribute("data-tool-mode") === mode;
          b.setAttribute("aria-pressed", String(isCurrent));
          b.classList.toggle("active", isCurrent);
        });
      });
    });

    // Display Toggles
    this.els.toggleCiCheck?.addEventListener("change", (e) => {
      this.ui.showCIBand = e.target.checked;
      this.renderAllCanvases();
    });
    this.els.toggleResidCheck?.addEventListener("change", (e) => {
      this.ui.showResidualLines = e.target.checked;
      this.renderAllCanvases();
    });
    this.els.toggleQuadCheck?.addEventListener("change", (e) => {
      this.ui.showQuadratic = e.target.checked;
      this.renderAllCanvases();
    });
    this.els.lockMomentsCheck?.addEventListener("change", (e) => {
      this.ui.lockMomentsOnDrag = e.target.checked;
      this.showToast(
        this.ui.lockMomentsOnDrag
          ? "Exact Moment Lock enabled during dragging."
          : "Freehand dragging enabled."
      );
    });

    // Metadata Inputs
    const onMetaChange = () => {
      this.state.xLabel = this.els.xLabelInput.value || "Explanatory X";
      this.state.xUnit = this.els.xUnitInput.value || "";
      this.state.yLabel = this.els.yLabelInput.value || "Response Y";
      this.state.yUnit = this.els.yUnitInput.value || "";
      this.state.contextPrompt = this.els.contextPromptInput.value || "";
      this.recomputeAndRender(true);
    };
    this.els.xLabelInput?.addEventListener("input", onMetaChange);
    this.els.xUnitInput?.addEventListener("input", onMetaChange);
    this.els.yLabelInput?.addEventListener("input", onMetaChange);
    this.els.yUnitInput?.addEventListener("input", onMetaChange);
    this.els.contextPromptInput?.addEventListener("input", onMetaChange);

    // Exact-Moment Solver Buttons
    this.els.projectMomentsBtn?.addEventListener("click", () => {
      this.pushHistory();
      const targets = this.readTargetInputs();
      this.state.points = projectToExactMoments(this.state.points, targets);
      this.recomputeAndRender(true);
      this.showToast("Projected dataset onto exact sample moments.");
    });

    this.els.matchAnscombeBtn?.addEventListener("click", () => {
      this.pushHistory();
      const anscombeTargets = {
        meanX: 9.0,
        sdX: 3.31662479,
        meanY: 7.50090909,
        sdY: 2.03156814,
        r: 0.81642052
      };
      this.state.points = projectToExactMoments(this.state.points, anscombeTargets);
      this.recomputeAndRender(true);
      this.showToast("Matched exact Anscombe Quartet moments (r = 0.8164).");
    });

    // Add Row Button
    this.els.addRowBtn?.addEventListener("click", () => {
      this.pushHistory();
      const mx = this.diagnostics?.meanX ?? 9;
      const my = this.diagnostics?.meanY ?? 7.5;
      const idx = this.state.points.length + 1;
      this.state.points.push({
        id: `pt_${Date.now()}`,
        label: `Obs ${idx}`,
        x: Number((mx + 0.5).toFixed(2)),
        y: Number((my + 0.5).toFixed(2))
      });
      this.recomputeAndRender(true);
    });

    // Export Format Switcher
    this.els.exportTabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const fmt = btn.getAttribute("data-export-tab");
        this.ui.activeExportFormat = fmt;
        this.els.exportTabButtons.forEach((b) => {
          const active = b.getAttribute("data-export-tab") === fmt;
          b.setAttribute("aria-pressed", String(active));
          b.classList.toggle("active", active);
        });
        this.updateExportPreview();
      });
    });

    this.els.copyCodeBtn?.addEventListener("click", () => {
      const code = this.els.codePreviewBox?.textContent || "";
      this.copyToClipboard(code, "Copied export snippet to clipboard.");
    });

    this.els.downloadCsvBtn?.addEventListener("click", () => {
      if (!this.diagnostics?.valid) return;
      const csv = exportToCSV(this.state, this.diagnostics, 4);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(this.state.presetId || "quartetlab").toLowerCase()}_diagnostics.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast("Downloaded CSV with regression diagnostics.");
    });

    // Shareable URL State
    this.els.shareUrlBtn?.addEventListener("click", () => {
      const hash = encodeStateToHash(this.state);
      if (typeof window !== "undefined" && window.history?.replaceState) {
        window.history.replaceState(null, "", `#${hash}`);
      }
      const fullUrl = typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}#${hash}`
        : `#${hash}`;
      this.copyToClipboard(fullUrl, "Shareable dataset URL copied to clipboard.");
    });

    // Modals: Import CSV
    let importReturnFocus;
    const closeImport = () => {
      this.els.importModal.hidden = true;
      importReturnFocus?.focus();
    };
    this.els.importModal.addEventListener("keydown", e => trapDialogFocus(e, this.els.importModal, closeImport));
    this.els.importTextarea.addEventListener("input", () => {
      document.getElementById("import-validation-error").textContent = "";
    });
    this.els.openImportBtn?.addEventListener("click", () => {
      importReturnFocus = document.activeElement;
      document.getElementById("import-validation-error").textContent = "";
      this.els.importModal.hidden = false;
      this.els.importTextarea?.focus();
    });
    this.els.closeImportBtn?.addEventListener("click", closeImport);
    this.els.confirmImportBtn?.addEventListener("click", () => {
      const parsed = parseDelimitedText(this.els.importTextarea?.value || "");
      if (parsed.points.length < 3) {
        document.getElementById("import-validation-error").textContent = parsed.errors[0] || "Please provide at least 3 numeric (X, Y) rows.";
        return;
      }
      this.pushHistory();
      this.state.presetId = "custom";
      this.state.title = "Imported Custom Dataset";
      if (parsed.xLabel) this.state.xLabel = parsed.xLabel;
      if (parsed.yLabel) this.state.yLabel = parsed.yLabel;
      this.state.points = parsed.points;
      closeImport();
      this.recomputeAndRender(true);
      this.showToast(`Imported ${parsed.points.length} observations.`);
    });

    // Modals: Printable FRQ Worksheet
    this.els.openWorksheetBtn?.addEventListener("click", () => {
      this.buildWorksheetPreview();
      this.els.worksheetModal.hidden = false;
    });
    this.els.closeWorksheetBtn?.addEventListener("click", () => {
      this.els.worksheetModal.hidden = true;
    });
    this.els.toggleRubricBtn?.addEventListener("click", () => {
      this.ui.showRubricInWorksheet = !this.ui.showRubricInWorksheet;
      this.els.toggleRubricBtn.textContent = this.ui.showRubricInWorksheet
        ? "Hide Answer Key / Rubric"
        : "Show Answer Key / Rubric";
      this.buildWorksheetPreview();
    });
    this.els.printWorksheetBtn?.addEventListener("click", () => {
      window.print();
    });

    // Modals: Privacy & Storage Inspector
    this.els.openPrivacyBtn?.addEventListener("click", () => {
      this.refreshPrivacyModal();
      this.els.privacyModal.hidden = false;
    });
    this.els.closePrivacyBtn?.addEventListener("click", () => {
      this.els.privacyModal.hidden = true;
    });
    this.els.saveSnapshotBtn?.addEventListener("click", () => {
      const name = this.els.snapshotNameInput?.value.trim() || this.state.title;
      saveSnapshot(name, this.state);
      if (this.els.snapshotNameInput) this.els.snapshotNameInput.value = "";
      this.refreshPrivacyModal();
      this.showToast(`Saved local snapshot "${name}".`);
    });
    this.els.wipeStorageBtn?.addEventListener("click", () => {
      clearAllLocalData();
      this.refreshPrivacyModal();
      this.showToast("Cleared all QuartetLab local browser storage.");
    });

    // Canvas Pointer & Keyboard Interaction
    this.bindCanvasInteractions();

    // Window resize
    window.addEventListener("resize", () => this.renderAllCanvases());
    window.addEventListener("keydown", (e) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          this.redo();
        } else {
          e.preventDefault();
          this.undo();
        }
      } else if (e.key === "Escape") {
        this.els.importModal.hidden = true;
        this.els.worksheetModal.hidden = true;
        this.els.privacyModal.hidden = true;
      }
    });
  }

  bindCanvasInteractions() {
    const canvas = this.els.scatterCanvas;
    if (!canvas) return;

    const getCanvasCoords = (evt) => {
      const rect = canvas.getBoundingClientRect();
      return {
        px: evt.clientX - rect.left,
        py: evt.clientY - rect.top
      };
    };

    const findNearestPoint = (px, py, maxDist = 14) => {
      if (!this.scatterTransform || !this.diagnostics?.valid) return -1;
      let bestIdx = -1;
      let bestD2 = maxDist * maxDist;
      for (const pt of this.diagnostics.points) {
        const sx = this.scatterTransform.toScreenX(pt.x);
        const sy = this.scatterTransform.toScreenY(pt.y);
        const d2 = (sx - px) * (sx - px) + (sy - py) * (sy - py);
        if (d2 <= bestD2) {
          bestD2 = d2;
          bestIdx = pt.index;
        }
      }
      return bestIdx;
    };

    canvas.addEventListener("pointerdown", (e) => {
      if (!this.scatterTransform) return;
      const { px, py } = getCanvasCoords(e);
      const hitIdx = findNearestPoint(px, py, 15);

      if (this.ui.toolMode === "add") {
        this.pushHistory();
        const newX = Number(this.scatterTransform.toDataX(px).toFixed(3));
        const newY = Number(this.scatterTransform.toDataY(py).toFixed(3));
        this.state.points.push({
          id: `pt_${Date.now()}`,
          label: `Obs ${this.state.points.length + 1}`,
          x: newX,
          y: newY
        });
        if (this.ui.lockMomentsOnDrag) {
          this.state.points = projectToExactMoments(this.state.points, this.readTargetInputs());
        }
        this.recomputeAndRender(true);
        return;
      }

      if (this.ui.toolMode === "erase") {
        if (hitIdx !== -1 && this.state.points.length > 3) {
          this.pushHistory();
          this.state.points.splice(hitIdx, 1);
          this.ui.activeIndex = -1;
          this.recomputeAndRender(true);
        } else if (this.state.points.length <= 3) {
          this.showToast("At least 3 observations must remain.");
        }
        return;
      }

      // Default 'drag' mode
      if (hitIdx !== -1) {
        this.pushHistory();
        this.ui.draggingIndex = hitIdx;
        this.ui.activeIndex = hitIdx;
        this.ui.lockedBounds = {
          x: this.scatterTransform.xBounds,
          y: this.scatterTransform.yBounds
        };
        this.lockedMomentSnapshot = this.readTargetInputs();
        canvas.setPointerCapture(e.pointerId);
      }
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!this.scatterTransform) return;
      const { px, py } = getCanvasCoords(e);
      const dataX = this.scatterTransform.toDataX(px);
      const dataY = this.scatterTransform.toDataY(py);

      if (this.els.cursorReadout) {
        this.els.cursorReadout.textContent = `x: ${dataX.toFixed(2)}, y: ${dataY.toFixed(2)}`;
      }

      if (this.ui.draggingIndex !== -1) {
        const pt = this.state.points[this.ui.draggingIndex];
        if (pt) {
          pt.x = Number(dataX.toFixed(4));
          pt.y = Number(dataY.toFixed(4));
          if (this.ui.lockMomentsOnDrag && this.lockedMomentSnapshot) {
            this.state.points = projectToExactMoments(this.state.points, this.lockedMomentSnapshot);
          }
          this.recomputeAndRender(false);
        }
        return;
      }

      const hoverIdx = findNearestPoint(px, py, 14);
      if (hoverIdx !== this.ui.activeIndex) {
        this.ui.activeIndex = hoverIdx;
        this.highlightActiveTableRow();
        this.renderAllCanvases();
      }
    });

    const endDrag = () => {
      if (this.ui.draggingIndex !== -1) {
        this.ui.draggingIndex = -1;
        this.ui.lockedBounds = null;
        this.recomputeAndRender(true);
      }
    };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    // Keyboard accessibility on Scatter Canvas
    canvas.addEventListener("keydown", (e) => {
      if (!this.state.points.length) return;
      if (e.key === "Tab") return;
      if (this.ui.activeIndex < 0) this.ui.activeIndex = 0;

      if (e.key === "[" || e.key === "PageUp") {
        e.preventDefault();
        this.ui.activeIndex = (this.ui.activeIndex - 1 + this.state.points.length) % this.state.points.length;
        this.highlightActiveTableRow();
        this.renderAllCanvases();
        return;
      }
      if (e.key === "]" || e.key === "PageDown") {
        e.preventDefault();
        this.ui.activeIndex = (this.ui.activeIndex + 1) % this.state.points.length;
        this.highlightActiveTableRow();
        this.renderAllCanvases();
        return;
      }

      const stepX = (this.scatterTransform?.xBounds?.step || 1) * (e.shiftKey ? 0.5 : 0.1);
      const stepY = (this.scatterTransform?.yBounds?.step || 1) * (e.shiftKey ? 0.5 : 0.1);
      const activePt = this.state.points[this.ui.activeIndex];
      if (!activePt) return;

      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        this.pushHistory();
        if (e.key === "ArrowLeft") activePt.x = Number((activePt.x - stepX).toFixed(4));
        if (e.key === "ArrowRight") activePt.x = Number((activePt.x + stepX).toFixed(4));
        if (e.key === "ArrowUp") activePt.y = Number((activePt.y + stepY).toFixed(4));
        if (e.key === "ArrowDown") activePt.y = Number((activePt.y - stepY).toFixed(4));
        this.recomputeAndRender(true);
      }
    });
  }

  loadPreset(presetId) {
    const preset = PRESET_DATASETS[presetId];
    if (!preset) return;
    this.pushHistory();
    this.state = {
      presetId: preset.id,
      title: preset.name,
      xLabel: preset.xLabel,
      xUnit: preset.xUnit,
      yLabel: preset.yLabel,
      yUnit: preset.yUnit,
      contextPrompt: preset.contextPrompt,
      points: preset.points.map((p) => ({ ...p }))
    };
    this.ui.activeIndex = -1;
    this.recomputeAndRender(true);
    this.showToast(`Loaded ${preset.name}.`);
  }

  readTargetInputs() {
    return {
      meanX: parseFloat(this.els.targetMeanX?.value) || this.diagnostics?.meanX || 9.0,
      sdX: Math.max(0.001, parseFloat(this.els.targetSdX?.value) || this.diagnostics?.sdX || 3.3166),
      meanY: parseFloat(this.els.targetMeanY?.value) || this.diagnostics?.meanY || 7.50,
      sdY: Math.max(0.001, parseFloat(this.els.targetSdY?.value) || this.diagnostics?.sdY || 2.0316),
      r: Math.max(-0.999, Math.min(0.999, parseFloat(this.els.targetR?.value) ?? this.diagnostics?.r ?? 0.8164))
    };
  }

  recomputeAndRender(persist = true) {
    this.diagnostics = computeDatasetDiagnostics(this.state.points);
    this.syncMetadataInputs();
    this.updateMomentStrip();
    this.updateSolverInputs();
    this.updateRegressionOutputTable();
    this.updatePointsTable();
    this.updateExportPreview();
    this.renderAllCanvases();
    this.updateHistoryButtons();

    if (persist) {
      saveActiveSession(this.state);
    }
  }

  syncMetadataInputs() {
    if (this.els.presetSelect && PRESET_DATASETS[this.state.presetId]) {
      this.els.presetSelect.value = this.state.presetId;
    }
    if (this.els.xLabelInput && document.activeElement !== this.els.xLabelInput) {
      this.els.xLabelInput.value = this.state.xLabel;
    }
    if (this.els.xUnitInput && document.activeElement !== this.els.xUnitInput) {
      this.els.xUnitInput.value = this.state.xUnit;
    }
    if (this.els.yLabelInput && document.activeElement !== this.els.yLabelInput) {
      this.els.yLabelInput.value = this.state.yLabel;
    }
    if (this.els.yUnitInput && document.activeElement !== this.els.yUnitInput) {
      this.els.yUnitInput.value = this.state.yUnit;
    }
    if (this.els.contextPromptInput && document.activeElement !== this.els.contextPromptInput) {
      this.els.contextPromptInput.value = this.state.contextPrompt;
    }
  }

  updateMomentStrip() {
    const d = this.diagnostics;
    if (!d || !d.valid) return;
    if (this.els.mN) this.els.mN.textContent = String(d.n);
    if (this.els.mMeanX) this.els.mMeanX.textContent = d.meanX.toFixed(4);
    if (this.els.mSdX) this.els.mSdX.textContent = d.sdX.toFixed(4);
    if (this.els.mMeanY) this.els.mMeanY.textContent = d.meanY.toFixed(4);
    if (this.els.mSdY) this.els.mSdY.textContent = d.sdY.toFixed(4);
    if (this.els.mR) this.els.mR.textContent = d.r.toFixed(4);
    if (this.els.mR2) this.els.mR2.textContent = `${(d.r2 * 100).toFixed(2)}%`;
    const sign = d.slope >= 0 ? "+" : "−";
    if (this.els.mOlsEq) {
      this.els.mOlsEq.textContent = `ŷ = ${d.intercept.toFixed(3)} ${sign} ${Math.abs(d.slope).toFixed(3)}x`;
    }

    // Diagnostic Alert Banner
    if (this.els.diagnosticAlertBanner) {
      const influential = d.points.filter((p) => p.isInfluential);
      const highLev = d.points.filter((p) => p.isHighLeverage);
      const quadGain = d.quadraticFit ? d.quadraticFit.r2 - d.r2 : 0;

      const alerts = [];
      if (influential.length > 0) {
        alerts.push(
          `${influential.length} influential obs (max Cook's D = ${Math.max(...influential.map((p) => p.cooksD)).toFixed(2)} > ${(4 / d.n).toFixed(2)})`
        );
      }
      if (highLev.length > 0) {
        alerts.push(
          `${highLev.length} high-leverage obs (max h = ${Math.max(...highLev.map((p) => p.leverage)).toFixed(2)})`
        );
      }
      if (quadGain > 0.12) {
        alerts.push(
          `Non-linear curvature detected: Quadratic R² (${(d.quadraticFit.r2 * 100).toFixed(1)}%) exceeds linear R² (${(d.r2 * 100).toFixed(1)}%)`
        );
      }
      this.els.diagnosticAlertBanner.textContent = alerts.length
        ? `Diagnostic Alerts: ${alerts.join(" · ")}`
        : `Diagnostics Clean: No single observation exceeds Cook's Distance threshold 4/n (${(4 / d.n).toFixed(2)}).`;
    }
  }

  updateSolverInputs() {
    if (this.ui.draggingIndex !== -1) return;
    const d = this.diagnostics;
    if (!d || !d.valid) return;
    const setIfIdle = (el, val) => {
      if (el && document.activeElement !== el) el.value = val.toFixed(4);
    };
    setIfIdle(this.els.targetMeanX, d.meanX);
    setIfIdle(this.els.targetSdX, d.sdX);
    setIfIdle(this.els.targetMeanY, d.meanY);
    setIfIdle(this.els.targetSdY, d.sdY);
    setIfIdle(this.els.targetR, d.r);
  }

  updateRegressionOutputTable() {
    const d = this.diagnostics;
    if (!d || !d.valid || !this.els.regTableBody) return;
    const fmtNum = (v, digits = 4) => (Number.isFinite(v) ? v.toFixed(digits) : "—");
    const fmtP = (p) => {
      if (!Number.isFinite(p)) return "—";
      if (p < 0.0001) return "< 0.0001";
      return p.toFixed(4);
    };

    this.els.regTableBody.innerHTML = `
      <tr>
        <td>Constant</td>
        <td>${fmtNum(d.intercept, 4)}</td>
        <td>${fmtNum(d.seIntercept, 4)}</td>
        <td>${fmtNum(d.tIntercept, 2)}</td>
        <td>${fmtP(d.pIntercept)}</td>
      </tr>
      <tr>
        <td>${this.escapeHtml(this.state.xLabel || "Explanatory X")}</td>
        <td>${fmtNum(d.slope, 4)}</td>
        <td>${fmtNum(d.seSlope, 4)}</td>
        <td>${fmtNum(d.tSlope, 2)}</td>
        <td>${fmtP(d.pSlope)}</td>
      </tr>
    `;

    if (this.els.regSummaryFooter) {
      this.els.regSummaryFooter.innerHTML = `
        <span>S = ${fmtNum(d.sResid, 4)}</span>
        <span>R-Sq = ${(d.r2 * 100).toFixed(2)}%</span>
        <span>R-Sq(adj) = ${(d.r2Adj * 100).toFixed(2)}%</span>
        <span>95% CI β₁: [${fmtNum(d.slopeCI95[0], 3)}, ${fmtNum(d.slopeCI95[1], 3)}]</span>
      `;
    }
  }

  updatePointsTable() {
    const d = this.diagnostics;
    if (!d || !d.valid || !this.els.pointsTableBody) return;

    this.els.pointsTableBody.innerHTML = d.points
      .map((pt) => {
        const flagClass =
          pt.primaryFlag === "INFLUENTIAL"
            ? "flag-influence"
            : pt.primaryFlag === "HIGH LEV"
            ? "flag-leverage"
            : pt.primaryFlag === "OUTLIER"
            ? "flag-outlier"
            : "flag-ok";

        return `
          <tr data-row-index="${pt.index}" class="${this.ui.activeIndex === pt.index ? "active-row" : ""}">
            <td>${pt.index + 1}</td>
            <td><input type="number" step="0.1" class="coord-input" data-coord="x" data-idx="${pt.index}" value="${Number(pt.x.toFixed(4))}" aria-label="Observation ${pt.index + 1} X value"></td>
            <td><input type="number" step="0.1" class="coord-input" data-coord="y" data-idx="${pt.index}" value="${Number(pt.y.toFixed(4))}" aria-label="Observation ${pt.index + 1} Y value"></td>
            <td>${pt.yhat.toFixed(3)}</td>
            <td>${pt.residual >= 0 ? "+" : ""}${pt.residual.toFixed(3)}</td>
            <td>${pt.leverage.toFixed(3)}</td>
            <td>${pt.cooksD.toFixed(3)}</td>
            <td><span class="diag-chip ${flagClass}">${pt.primaryFlag}</span></td>
            <td>
              <button type="button" class="btn btn-sm" data-delete-idx="${pt.index}" title="Delete observation ${pt.index + 1}" aria-label="Delete observation ${pt.index + 1}" ${d.n <= 3 ? "disabled" : ""}>×</button>
            </td>
          </tr>
        `;
      })
      .join("");

    // Delegate inline coordinate edits and row deletions
    this.els.pointsTableBody.querySelectorAll(".coord-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const idx = Number(e.target.getAttribute("data-idx"));
        const axis = e.target.getAttribute("data-coord");
        const val = parseFloat(e.target.value);
        if (Number.isFinite(val) && this.state.points[idx]) {
          this.pushHistory();
          this.state.points[idx][axis] = val;
          this.recomputeAndRender(true);
        }
      });
    });

    this.els.pointsTableBody.querySelectorAll("[data-delete-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-delete-idx"));
        if (this.state.points.length > 3) {
          this.pushHistory();
          this.state.points.splice(idx, 1);
          this.ui.activeIndex = -1;
          this.recomputeAndRender(true);
        }
      });
    });

    this.els.pointsTableBody.querySelectorAll("tr[data-row-index]").forEach((row) => {
      row.addEventListener("mouseenter", () => {
        this.ui.activeIndex = Number(row.getAttribute("data-row-index"));
        this.highlightActiveTableRow();
        this.renderAllCanvases();
      });
    });
  }

  highlightActiveTableRow() {
    if (!this.els.pointsTableBody) return;
    this.els.pointsTableBody.querySelectorAll("tr[data-row-index]").forEach((row) => {
      const idx = Number(row.getAttribute("data-row-index"));
      row.classList.toggle("active-row", idx === this.ui.activeIndex);
    });
  }

  updateExportPreview() {
    const d = this.diagnostics;
    if (!d || !d.valid || !this.els.codePreviewBox) return;
    const fmt = this.ui.activeExportFormat;
    let output = "";
    if (fmt === "csv") output = exportToCSV(this.state, d, 4);
    else if (fmt === "python") output = exportToPythonScript(this.state, d, 4);
    else if (fmt === "ti84") output = exportToTI84Command(this.state, d, 3);
    else if (fmt === "latex") output = exportToLaTeXTable(this.state, d);
    else output = exportToRScript(this.state, d, 4);
    this.els.codePreviewBox.textContent = output;
  }

  renderAllCanvases() {
    if (!this.diagnostics) return;
    if (this.els.scatterCanvas) {
      this.scatterTransform = renderScatterCanvas(
        this.els.scatterCanvas,
        this.diagnostics,
        this.state,
        this.ui
      );
    }
    if (this.els.residualCanvas) {
      renderResidualCanvas(this.els.residualCanvas, this.diagnostics, this.ui);
    }
    if (this.els.qqCanvas) {
      renderQQCanvas(this.els.qqCanvas, this.diagnostics, this.ui);
    }
  }

  buildWorksheetPreview() {
    const d = this.diagnostics;
    if (!d || !d.valid || !this.els.worksheetContent) return;

    const scatterDataUrl = this.els.scatterCanvas?.toDataURL("image/png") || "";
    const residDataUrl = this.els.residualCanvas?.toDataURL("image/png") || "";
    const xName = this.escapeHtml(this.state.xLabel || "Explanatory X");
    const yName = this.escapeHtml(this.state.yLabel || "Response Y");
    const xUnit = this.escapeHtml(this.state.xUnit || "units");
    const yUnit = this.escapeHtml(this.state.yUnit || "units");
    const maxCookPt = [...d.points].sort((a, b) => b.cooksD - a.cooksD)[0];

    const sign = d.slope >= 0 ? "+" : "−";
    const eqStr = `ŷ = ${d.intercept.toFixed(4)} ${sign} ${Math.abs(d.slope).toFixed(4)}x`;
    const direction = d.slope >= 0 ? "increases" : "decreases";

    this.els.worksheetContent.innerHTML = `
      <div class="worksheet-preview-sheet">
        <div class="worksheet-header">
          <div>
            <h2 class="worksheet-title">${this.escapeHtml(this.state.title || "Bivariate Regression Free-Response Assessment")}</h2>
            <p style="font-size: 0.85rem; color: #525866; margin-top: 4px;">Name: ___________________________ &nbsp;&nbsp; Date: ______________ &nbsp;&nbsp; Section: ________</p>
          </div>
          <div class="worksheet-meta">
            <div>n = ${d.n} observations</div>
            <div>QuartetLab Worksheet Studio</div>
          </div>
        </div>

        <p style="font-size: 0.9rem; line-height: 1.5; margin-bottom: 12px;">
          <strong>Scenario Context:</strong> ${this.escapeHtml(this.state.contextPrompt)}
        </p>

        <div class="worksheet-figures-grid">
          <div class="worksheet-figure-box">
            <img src="${scatterDataUrl}" alt="Scatter plot of ${yName} versus ${xName}">
            <div style="font-size: 0.75rem; color: #525866; margin-top: 4px;">Figure 1: Scatterplot &amp; Least-Squares Line</div>
          </div>
          <div class="worksheet-figure-box">
            <img src="${residDataUrl}" alt="Residual plot versus fitted values">
            <div style="font-size: 0.75rem; color: #525866; margin-top: 4px;">Figure 2: Residuals vs. Fitted Values (ŷ)</div>
          </div>
        </div>

        <div style="margin: 14px 0;">
          <div style="font-family: var(--font-mono); font-size: 0.78rem; font-weight: 700; margin-bottom: 4px;">COMPUTER REGRESSION OUTPUT TABLE</div>
          <table class="stat-table" style="border: 1px solid #D8D4C8;">
            <thead>
              <tr>
                <th>Predictor</th>
                <th>Coef</th>
                <th>SE Coef</th>
                <th>T</th>
                <th>P</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Constant</td>
                <td>${d.intercept.toFixed(4)}</td>
                <td>${d.seIntercept.toFixed(4)}</td>
                <td>${d.tIntercept.toFixed(2)}</td>
                <td>${d.pIntercept < 0.0001 ? "< 0.0001" : d.pIntercept.toFixed(4)}</td>
              </tr>
              <tr>
                <td>${xName}</td>
                <td>${d.slope.toFixed(4)}</td>
                <td>${d.seSlope.toFixed(4)}</td>
                <td>${d.tSlope.toFixed(2)}</td>
                <td>${d.pSlope < 0.0001 ? "< 0.0001" : d.pSlope.toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
          <div style="font-family: var(--font-mono); font-size: 0.78rem; padding: 6px 8px; background: #F6F4EE; border: 1px solid #D8D4C8; border-top: none;">
            S = ${d.sResid.toFixed(4)} &nbsp;&nbsp;&nbsp; R-Sq = ${(d.r2 * 100).toFixed(2)}% &nbsp;&nbsp;&nbsp; R-Sq(adj) = ${(d.r2Adj * 100).toFixed(2)}% &nbsp;&nbsp;&nbsp; r = ${d.r.toFixed(4)}
          </div>
        </div>

        <div class="worksheet-questions">
          <div class="worksheet-q-item">
            <strong>(a)</strong> Write the equation of the least-squares regression line in context, defining all variables used, and interpret the slope in the context of this setting.
            ${
              this.ui.showRubricInWorksheet
                ? `<div class="worksheet-rubric-box"><strong>Scoring Rubric (a):</strong> Predicted ${yName} (${eqStr}). For each 1-${xUnit} increase in ${xName}, the predicted ${yName} ${direction} by ${Math.abs(d.slope).toFixed(4)} ${yUnit}, on average.</div>`
                : `<div class="worksheet-answer-space"></div>`
            }
          </div>

          <div class="worksheet-q-item">
            <strong>(b)</strong> Interpret the coefficient of determination (R-Sq = ${(d.r2 * 100).toFixed(2)}%) and the standard deviation of the residuals (S = ${d.sResid.toFixed(4)}) in context.
            ${
              this.ui.showRubricInWorksheet
                ? `<div class="worksheet-rubric-box"><strong>Scoring Rubric (b):</strong> Approximately ${(d.r2 * 100).toFixed(2)}% of the variability in ${yName} is accounted for by the linear regression model on ${xName}. Actual ${yName} values typically differ from the model's predicted values by about ${d.sResid.toFixed(4)} ${yUnit}.</div>`
                : `<div class="worksheet-answer-space"></div>`
            }
          </div>

          <div class="worksheet-q-item">
            <strong>(c)</strong> Based on Figure 2 (the residual plot) and point diagnostics, is a linear model appropriate for these data? Identify the most influential observation and state how removing it would affect the slope.
            ${
              this.ui.showRubricInWorksheet
                ? `<div class="worksheet-rubric-box"><strong>Scoring Rubric (c):</strong> Observation #${maxCookPt.index + 1} (${this.escapeHtml(maxCookPt.label)}, x = ${maxCookPt.x.toFixed(2)}, y = ${maxCookPt.y.toFixed(2)}) has the largest Cook's Distance (D = ${maxCookPt.cooksD.toFixed(3)}, leverage h = ${maxCookPt.leverage.toFixed(3)}, residual e = ${maxCookPt.residual.toFixed(3)}). Cite residual plot structure (random scatter vs. curved/fan pattern) to justify linear model appropriateness.</div>`
                : `<div class="worksheet-answer-space"></div>`
            }
          </div>
        </div>
      </div>
    `;
  }

  refreshPrivacyModal() {
    const usage = inspectLocalStorageUsage();
    if (this.els.storageReportBox) {
      if (!usage.available) {
        this.els.storageReportBox.textContent =
          "Browser localStorage is disabled or restricted in this environment. QuartetLab is running purely in volatile memory.";
      } else {
        const lines = [
          `Local Storage Status: Active (${usage.totalBytes} bytes used across ${usage.keys.length} keys)`,
          `External Network Requests: 0 (100% client-side computation)`,
          ...usage.keys.map((k) => `  • ${k.key}: ${k.bytes} bytes`)
        ];
        this.els.storageReportBox.textContent = lines.join("\n");
      }
    }

    const snapshots = loadSnapshots();
    if (this.els.snapshotsList) {
      if (!snapshots.length) {
        this.els.snapshotsList.innerHTML = `<p style="font-size: 0.8rem; color: var(--color-text-muted);">No saved local snapshots yet.</p>`;
      } else {
        this.els.snapshotsList.innerHTML = snapshots
          .map(
            (s) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 8px; border:var(--border-thin); border-radius:var(--radius-sm); background:var(--color-background);">
            <div style="font-size:0.8rem;">
              <strong>${this.escapeHtml(s.name)}</strong>
              <span class="mono" style="color:var(--color-text-muted); font-size:0.72rem; margin-left:6px;">(${s.state.points.length} pts · ${new Date(s.savedAt).toLocaleDateString()})</span>
            </div>
            <div style="display:flex; gap:6px;">
              <button type="button" class="btn btn-sm" data-load-snap="${s.id}">Load</button>
              <button type="button" class="btn btn-sm" data-del-snap="${s.id}">Delete</button>
            </div>
          </div>
        `
          )
          .join("");

        this.els.snapshotsList.querySelectorAll("[data-load-snap]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-load-snap");
            const found = snapshots.find((item) => item.id === id);
            if (found) {
              this.pushHistory();
              this.state = {
                presetId: "custom",
                ...found.state,
                points: found.state.points.map((p) => ({ ...p }))
              };
              this.recomputeAndRender(true);
              this.els.privacyModal.hidden = true;
              this.showToast(`Loaded snapshot "${found.name}".`);
            }
          });
        });

        this.els.snapshotsList.querySelectorAll("[data-del-snap]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-del-snap");
            deleteSnapshot(id);
            this.refreshPrivacyModal();
          });
        });
      }
    }
  }

  copyToClipboard(text, message) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => this.showToast(message),
        () => this.fallbackCopy(text, message)
      );
    } else {
      this.fallbackCopy(text, message);
    }
  }

  fallbackCopy(text, message) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      this.showToast(message);
    } catch (_e) {
      this.showToast("Press Ctrl+C / Cmd+C to copy.");
    }
    document.body.removeChild(ta);
  }

  showToast(message) {
    if (this.els.srStatus) {
      this.els.srStatus.textContent = message;
    }
    if (!this.els.toastContainer) return;
    this.els.toastContainer.innerHTML = "";
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    this.els.toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2800);
  }

  escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    const app = new QuartetLabApp();
    app.init();
    window.__quartetLabApp = app;
  });
}
