export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function minutesToSeconds(minutes) {
  return Math.max(0, Math.round(minutes)) * 60;
}

export function secondsToMinutes(seconds) {
  return Math.round(seconds) / 60;
}

/**
 * Format a number of seconds as a clock string: "25:00" or "1:02:03".
 */
export function formatSeconds(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/**
 * Format a duration in seconds as a compact label: "45m", "1h 25m".
 */
export function formatDurationLabel(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Format a plain number of minutes: "25 min".
 */
export function formatMinutes(minutes) {
  const m = Math.round(minutes || 0);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest > 0 ? `${h}h ${rest}m` : `${h}h`;
  }
  return `${m} min`;
}

/**
 * Format an ISO date key ("2026-01-05") as a friendly label, e.g. "Jan 5, 2026".
 */
export function formatDateKeyLabel(dateKey, options = { month: 'short', day: 'numeric' }) {
  if (!dateKey) return '';
  const [y, m, d] = String(dateKey).split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return date.toLocaleDateString(undefined, options);
}
