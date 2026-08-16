/**
 * Local-date helpers. All keys are "YYYY-MM-DD" in the user's local timezone.
 */

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayKey() {
  return dateKey(new Date());
}

/** Parse a "YYYY-MM-DD" key (or a Date) back into a local Date at midnight. */
export function parseDateKey(key) {
  if (key instanceof Date) key = dateKey(key);
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

export function addDays(date, days) {
  const out = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  return out;
}

/** Number of whole days between two local dates or keys (b - a). */
export function daysBetween(a, b) {
  return Math.round((parseDateKey(b) - parseDateKey(a)) / 86400000);
}

/** Start of the week (Sunday) for a given local date. */
export function startOfWeek(date = new Date()) {
  const c = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  c.setDate(c.getDate() - c.getDay());
  return c;
}

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'short' });
}

export function weekdayShort(date) {
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}
