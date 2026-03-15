import { normalizeAlertConfig } from "./dashboard-logic.mjs";

export const ACCESS_PASSWORD = "970520";
export const ACCESS_STORAGE_KEY = "codex-dashboard-access-granted";
export const ALERT_CONFIG_STORAGE_KEY = "codex-dashboard-alert-config";
export const ALERT_STATE_STORAGE_KEY = "codex-dashboard-alert-state";
export const FAVORITE_VIEWS_STORAGE_KEY = "codex-dashboard-favorites"; // Added missing constant used functionally

export function readAccessState() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(ACCESS_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function readJsonStorage(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJsonStorage(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures and keep local controls usable for the current page load.
  }
}

export function persistAccessState(granted) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (granted) {
      window.localStorage.setItem(ACCESS_STORAGE_KEY, "true");
      return;
    }

    window.localStorage.removeItem(ACCESS_STORAGE_KEY);
  } catch {
    // Ignore storage failures and keep the gate usable for the current page load.
  }
}

export function readAlertConfig() {
  return normalizeAlertConfig(readJsonStorage(ALERT_CONFIG_STORAGE_KEY, {}));
}

export function persistAlertConfig(config) {
  writeJsonStorage(ALERT_CONFIG_STORAGE_KEY, normalizeAlertConfig(config));
}

export function readAlertStates() {
  return readJsonStorage(ALERT_STATE_STORAGE_KEY, {});
}

export function persistAlertStates(states) {
  writeJsonStorage(ALERT_STATE_STORAGE_KEY, states);
}

export function readFavoriteViews() {
  const stored = readJsonStorage(FAVORITE_VIEWS_STORAGE_KEY, []);
  return Array.isArray(stored) ? stored : [];
}

export function persistFavoriteViews(favorites) {
  writeJsonStorage(FAVORITE_VIEWS_STORAGE_KEY, favorites);
}
