/**
 * QuartetLab Local-First Persistence & Privacy Inspector Module
 * Wraps browser localStorage safely with try/catch so sandboxed iframes
 * or strict privacy modes never throw unhandled exceptions.
 */

const STORAGE_KEY_ACTIVE = "quartetlab_active_session_v1";
const STORAGE_KEY_SNAPSHOTS = "quartetlab_saved_snapshots_v1";
const STORAGE_KEY_PREFS = "quartetlab_ui_prefs_v1";

function getSafeStorage() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const testKey = "__ql_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch (_e) {
    return null;
  }
  return null;
}

export function saveActiveSession(sessionState) {
  const store = getSafeStorage();
  if (!store) return false;
  try {
    const record = {
      updatedAt: new Date().toISOString(),
      ...sessionState
    };
    store.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(record));
    return true;
  } catch (_e) {
    return false;
  }
}

export function loadActiveSession() {
  const store = getSafeStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY_ACTIVE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.points) || parsed.points.length < 3) {
      return null;
    }
    return parsed;
  } catch (_e) {
    return null;
  }
}

export function loadSnapshots() {
  const store = getSafeStorage();
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY_SNAPSHOTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

export function saveSnapshot(name, state) {
  const store = getSafeStorage();
  if (!store) return [];
  try {
    const existing = loadSnapshots();
    const entry = {
      id: `snap_${Date.now()}`,
      name: String(name || state.title || "Saved Dataset").slice(0, 80),
      savedAt: new Date().toISOString(),
      state: {
        title: state.title,
        xLabel: state.xLabel,
        xUnit: state.xUnit,
        yLabel: state.yLabel,
        yUnit: state.yUnit,
        contextPrompt: state.contextPrompt,
        points: state.points.map((p) => ({ ...p }))
      }
    };
    const updated = [entry, ...existing].slice(0, 20);
    store.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(updated));
    return updated;
  } catch (_e) {
    return [];
  }
}

export function deleteSnapshot(snapshotId) {
  const store = getSafeStorage();
  if (!store) return [];
  try {
    const updated = loadSnapshots().filter((item) => item.id !== snapshotId);
    store.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(updated));
    return updated;
  } catch (_e) {
    return [];
  }
}

export function saveUiPrefs(prefs) {
  const store = getSafeStorage();
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY_PREFS, JSON.stringify(prefs));
    return true;
  } catch (_e) {
    return false;
  }
}

export function loadUiPrefs() {
  const store = getSafeStorage();
  if (!store) return {};
  try {
    const raw = store.getItem(STORAGE_KEY_PREFS);
    return raw ? JSON.parse(raw) : {};
  } catch (_e) {
    return {};
  }
}

export function inspectLocalStorageUsage() {
  const store = getSafeStorage();
  if (!store) {
    return {
      available: false,
      totalBytes: 0,
      keys: []
    };
  }
  const keys = [STORAGE_KEY_ACTIVE, STORAGE_KEY_SNAPSHOTS, STORAGE_KEY_PREFS];
  const details = [];
  let totalBytes = 0;
  for (const key of keys) {
    const val = store.getItem(key);
    if (val !== null) {
      const bytes = new Blob([val]).size;
      totalBytes += bytes;
      details.push({ key, bytes, preview: val.slice(0, 120) });
    }
  }
  return {
    available: true,
    totalBytes,
    keys: details
  };
}

export function clearAllLocalData() {
  const store = getSafeStorage();
  if (!store) return false;
  try {
    store.removeItem(STORAGE_KEY_ACTIVE);
    store.removeItem(STORAGE_KEY_SNAPSHOTS);
    store.removeItem(STORAGE_KEY_PREFS);
    return true;
  } catch (_e) {
    return false;
  }
}
