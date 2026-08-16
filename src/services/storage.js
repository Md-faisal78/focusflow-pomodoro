/**
 * Small namespaced localStorage wrapper.
 * All keys are prefixed with "focusflow:" to avoid collisions.
 */

export const KEY_PREFIX = 'focusflow:';

function fullKey(key) {
  return `${KEY_PREFIX}${key}`;
}

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(fullKey(key));
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(fullKey(key), JSON.stringify(value));
  } catch {
    // Storage full / unavailable — ignore, app keeps working in memory.
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(fullKey(key));
  } catch {
    // ignore
  }
}

/** Remove every FocusFlow key from localStorage (used by "Clear all data"). */
export function clearAllLocalStorage() {
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
