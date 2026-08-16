import { addDays, dateKey, daysBetween, monthKey, parseDateKey, startOfWeek } from './date.js';

/** A "focus session" is a completed focus timer run. */
export function focusSessions(sessions) {
  return (sessions || []).filter((s) => s.mode === 'focus');
}

/** Map of dateKey -> total focused seconds. */
export function focusSecondsPerDay(sessions) {
  const map = new Map();
  for (const s of focusSessions(sessions)) {
    if (!s.dateKey) continue;
    map.set(s.dateKey, (map.get(s.dateKey) || 0) + (s.durationSeconds || 0));
  }
  return map;
}

/** Map of dateKey -> focused minutes (rounded to 1 decimal). */
export function focusMinutesPerDay(sessions) {
  const out = new Map();
  for (const [key, seconds] of focusSecondsPerDay(sessions)) {
    out.set(key, Math.round((seconds / 60) * 10) / 10);
  }
  return out;
}

/**
 * Current and longest day streaks.
 * A streak day is any day with at least one completed focus session.
 * The current streak counts back from today; if today has no session yet,
 * it counts back from yesterday (the streak is still alive until today ends).
 */
export function computeStreaks(sessions, now = new Date()) {
  const days = new Set(focusSessions(sessions).map((s) => s.dateKey).filter(Boolean));

  let current = 0;
  if (days.size > 0) {
    let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!days.has(dateKey(cursor))) {
      cursor = addDays(cursor, -1);
    }
    while (days.has(dateKey(cursor))) {
      current += 1;
      cursor = addDays(cursor, -1);
    }
  }

  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const key of sorted) {
    run = prev !== null && daysBetween(prev, key) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = key;
  }

  return { current, longest, activeDays: days.size };
}

export function computeTotals(sessions) {
  const fs = focusSessions(sessions);
  const totalSeconds = fs.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  let bestDay = null;
  let bestMinutes = 0;
  for (const [key, minutes] of focusMinutesPerDay(sessions)) {
    if (minutes > bestMinutes) {
      bestMinutes = minutes;
      bestDay = key;
    }
  }
  return { totalSeconds, sessions: fs.length, bestDay, bestDayMinutes: bestMinutes };
}

/** Count of fully-focused weeks (all 7 days have focus) in the past year, excluding the current week. */
export function countPerfectWeeks(sessions, now = new Date()) {
  const byDay = focusSecondsPerDay(sessions);
  const currentWeekStart = startOfWeek(now);
  let count = 0;
  for (let w = 1; w <= 52; w++) {
    const weekStart = addDays(currentWeekStart, -w * 7);
    let full = true;
    for (let d = 0; d < 7; d++) {
      if (!byDay.has(dateKey(addDays(weekStart, d)))) {
        full = false;
        break;
      }
    }
    if (full) count += 1;
  }
  return count;
}

/**
 * Build GitHub-style heatmap columns for the last `weeks` weeks (Sunday start).
 * Returns { cols, maxMinutes } where each column has 7 day cells.
 */
export function buildHeatmap(sessions, weeks = 53, now = new Date()) {
  const minutes = focusMinutesPerDay(sessions);
  const maxMinutes = Math.max(1, ...minutes.values());
  const today = dateKey(now);
  const lastWeekStart = startOfWeek(now);
  const cols = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const colStart = addDays(lastWeekStart, -w * 7);
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(colStart, d);
      const key = dateKey(date);
      const value = minutes.get(key) || 0;
      days.push({
        key,
        date,
        minutes: value,
        future: key > today,
        level: levelFor(value, maxMinutes),
      });
    }
    cols.push({ weekKey: dateKey(colStart), days });
  }
  return { cols, maxMinutes };
}

function levelFor(minutes, max) {
  if (!minutes || minutes <= 0) return 0;
  if (max <= 0) return 1;
  return Math.min(4, Math.max(1, 1 + Math.floor(((minutes - 0.001) / max) * 4)));
}

/** Daily breakdown for the last n days (oldest first). */
export function lastNDays(sessions, n = 7, now = new Date()) {
  const secondsByDay = focusSecondsPerDay(sessions);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(now, -i);
    const key = dateKey(date);
    const seconds = secondsByDay.get(key) || 0;
    out.push({
      key,
      date,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      dateLabel: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      minutes: Math.round(seconds / 60),
      sessions: focusSessions(sessions).filter((s) => s.dateKey === key).length,
    });
  }
  return out;
}

/** Aggregate stats for a range: 'week' (last 7 days), 'month' (this calendar month) or 'all'. */
export function rangeStats(sessions, range, now = new Date()) {
  let startKey = null;
  if (range === 'week') {
    startKey = dateKey(addDays(now, -6));
  } else if (range === 'month') {
    startKey = dateKey(new Date(now.getFullYear(), now.getMonth(), 1));
  }
  const fs = focusSessions(sessions).filter((s) => !startKey || (s.dateKey && s.dateKey >= startKey));
  const byDay = focusSecondsPerDay(fs);
  const totalSeconds = fs.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  let bestMinutes = 0;
  for (const minutes of focusMinutesPerDay(fs).values()) {
    if (minutes > bestMinutes) bestMinutes = minutes;
  }
  return {
    sessions: fs.length,
    totalSeconds,
    avgSeconds: fs.length ? Math.round(totalSeconds / fs.length) : 0,
    activeDays: byDay.size,
    bestMinutes,
  };
}

/** Monthly totals for the last `months` months (oldest first). */
export function monthlyTotals(sessions, months = 12, now = new Date()) {
  const byMonth = new Map();
  for (const s of focusSessions(sessions)) {
    if (!s.dateKey) continue;
    const key = monthKey(parseDateKey(s.dateKey));
    const entry = byMonth.get(key) || { sessions: 0, seconds: 0 };
    entry.sessions += 1;
    entry.seconds += s.durationSeconds || 0;
    byMonth.set(key, entry);
  }
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const entry = byMonth.get(key) || { sessions: 0, seconds: 0 };
    out.push({
      key,
      label: d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
      sessions: entry.sessions,
      minutes: Math.round(entry.seconds / 60),
    });
  }
  return out;
}
