/**
 * Robust, SSR-safe, error-guarded theme management module.
 * - Handles OS preference detection (prefers-color-scheme)
 * - Safe localStorage access guarded against SecurityError / QuotaExceeded
 * - In-memory fallback for blocked/disabled storage
 * - FOUT / Hydration safe with schema migration
 */

const STORAGE_KEY = 'ufs_theme_v1';
const LEGACY_KEY = 'ufs_theme';
const VALID_THEMES = ['dark', 'light'];

// In-memory fallback if localStorage is blocked, restricted, or throws
const memoryStore = {};

export function isClient() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Safely retrieve theme from localStorage with legacy migration
 */
export function getStoredTheme() {
  if (!isClient()) return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_KEY);
    if (stored && VALID_THEMES.includes(stored)) {
      return stored;
    }
  } catch (err) {
    // LocalStorage blocked (private mode / security policy) or threw QuotaExceeded
    if (memoryStore[STORAGE_KEY] && VALID_THEMES.includes(memoryStore[STORAGE_KEY])) {
      return memoryStore[STORAGE_KEY];
    }
  }
  return null;
}

/**
 * Detect OS dark/light mode preference via media query
 */
export function getSystemTheme() {
  if (!isClient() || !window.matchMedia) return 'dark';
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch (err) {
    return 'dark';
  }
}

/**
 * Determine initial active theme:
 * 1. User explicit stored choice
 * 2. OS preference fallback
 */
export function resolveInitialTheme() {
  const stored = getStoredTheme();
  if (stored) return stored;
  return getSystemTheme();
}

/**
 * Safely persist theme preference to storage
 */
export function saveTheme(theme) {
  if (!VALID_THEMES.includes(theme)) return;
  if (!isClient()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
    // Cleanup legacy key if present
    try {
      window.localStorage.removeItem(LEGACY_KEY);
    } catch (_) {}
  } catch (err) {
    // Fallback to memory store if quota exceeded or storage disabled
    memoryStore[STORAGE_KEY] = theme;
  }
}

/**
 * Synchronously apply theme to document root
 */
export function applyThemeToDOM(theme) {
  if (!isClient()) return;
  try {
    document.documentElement.setAttribute('data-theme', theme);
  } catch (err) {
    console.error('Failed to set data-theme on documentElement', err);
  }
}
