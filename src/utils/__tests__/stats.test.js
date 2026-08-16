import { describe, expect, it } from 'vitest';
import {
  buildHeatmap,
  computeStreaks,
  computeTotals,
  countPerfectWeeks,
  focusSecondsPerDay,
  lastNDays,
  monthlyTotals,
  rangeStats,
} from '../stats.js';
import { addDays, dateKey } from '../date.js';

function session(daysAgo, durationSeconds = 1500, mode = 'focus') {
  return {
    id: `s-${daysAgo}-${Math.random()}`,
    mode,
    durationSeconds,
    dateKey: dateKey(addDays(new Date(2026, 0, 15), -daysAgo)),
    completedAt: new Date(2026, 0, 15).getTime(),
  };
}

const NOW = new Date(2026, 0, 15); // a fixed "today" (Thursday)

describe('computeStreaks', () => {
  it('returns zeros for no sessions', () => {
    expect(computeStreaks([], NOW)).toEqual({ current: 0, longest: 0, activeDays: 0 });
  });

  it('counts a streak that includes today', () => {
    const sessions = [session(0), session(1), session(2)];
    expect(computeStreaks(sessions, NOW)).toEqual({ current: 3, longest: 3, activeDays: 3 });
  });

  it('counts a streak that ends yesterday as still current', () => {
    const sessions = [session(1), session(2)];
    expect(computeStreaks(sessions, NOW)).toEqual({ current: 2, longest: 2, activeDays: 2 });
  });

  it('breaks the current streak when today and yesterday are missed', () => {
    const sessions = [session(2), session(3)];
    expect(computeStreaks(sessions, NOW)).toEqual({ current: 0, longest: 2, activeDays: 2 });
  });

  it('tracks the longest streak across gaps', () => {
    const sessions = [session(0), session(1), session(2), session(10), session(11), session(12), session(13)];
    expect(computeStreaks(sessions, NOW)).toEqual({ current: 3, longest: 4, activeDays: 7 });
  });

  it('ignores break sessions', () => {
    const sessions = [session(1, 300, 'shortBreak'), session(0)];
    expect(computeStreaks(sessions, NOW)).toEqual({ current: 1, longest: 1, activeDays: 1 });
  });
});

describe('focusSecondsPerDay', () => {
  it('aggregates seconds per day', () => {
    const sessions = [session(0, 1500), session(0, 600), session(1, 900)];
    const map = focusSecondsPerDay(sessions);
    expect(map.get(dateKey(addDays(NOW, 0)))).toBe(2100);
    expect(map.get(dateKey(addDays(NOW, -1)))).toBe(900);
  });
});

describe('computeTotals', () => {
  it('computes totals and best day', () => {
    const sessions = [session(0, 1500), session(0, 600), session(1, 900)];
    const totals = computeTotals(sessions);
    expect(totals.sessions).toBe(3);
    expect(totals.totalSeconds).toBe(3000);
    expect(totals.bestDay).toBe(dateKey(addDays(NOW, 0)));
    expect(totals.bestDayMinutes).toBe(35);
  });
});

describe('buildHeatmap', () => {
  it('builds the requested number of columns with 7 days each', () => {
    const { cols } = buildHeatmap([session(0)], 53, NOW);
    expect(cols.length).toBe(53);
    expect(cols[0].days.length).toBe(7);
  });

  it('marks future days and scores levels', () => {
    const sessions = [session(0, 1500), session(1, 1500), session(2, 1500), session(3, 1500)];
    const { cols } = buildHeatmap(sessions, 53, NOW);
    const today = dateKey(NOW);
    const futureDays = cols.flatMap((c) => c.days).filter((d) => d.key > today);
    expect(futureDays.length).toBeGreaterThan(0);
    expect(futureDays.every((d) => d.future)).toBe(true);
    const active = cols.flatMap((c) => c.days).find((d) => d.key === today);
    expect(active.level).toBeGreaterThan(0);
    const empty = cols.flatMap((c) => c.days).find((d) => d.key === dateKey(addDays(NOW, -100)));
    expect(empty.level).toBe(0);
  });
});

describe('lastNDays', () => {
  it('returns n days oldest first', () => {
    const sessions = [session(0, 1500), session(1, 900)];
    const days = lastNDays(sessions, 7, NOW);
    expect(days.length).toBe(7);
    expect(days[6].minutes).toBe(25);
    expect(days[5].minutes).toBe(15);
    expect(days[0].minutes).toBe(0);
  });
});

describe('rangeStats', () => {
  const sessions = [
    session(0, 1500),
    session(3, 900),
    session(40, 1800), // outside this week/month
  ];

  it('filters to the last 7 days', () => {
    const stats = rangeStats(sessions, 'week', NOW);
    expect(stats.sessions).toBe(2);
    expect(stats.totalSeconds).toBe(2400);
    expect(stats.activeDays).toBe(2);
  });

  it('filters to the current calendar month', () => {
    const stats = rangeStats(sessions, 'month', NOW);
    // session(40) falls in the previous month (Dec 2025).
    expect(stats.sessions).toBe(2);
    expect(stats.totalSeconds).toBe(2400);
  });

  it('includes everything for all time', () => {
    const stats = rangeStats(sessions, 'all', NOW);
    expect(stats.sessions).toBe(3);
    expect(stats.totalSeconds).toBe(4200);
  });
});

describe('monthlyTotals', () => {
  it('returns 12 months with labels and aggregates', () => {
    const sessions = [session(0, 1500), session(40, 1800)];
    const months = monthlyTotals(sessions, 12, NOW);
    expect(months.length).toBe(12);
    expect(months[months.length - 1].sessions).toBe(1); // this month: 1 session
    expect(months[months.length - 1].minutes).toBe(25);
    expect(months[months.length - 2].sessions).toBe(1); // last month (Dec 2025)
    expect(months[months.length - 2].minutes).toBe(30);
  });
});

describe('countPerfectWeeks', () => {
  it('counts weeks with focus on all 7 days', () => {
    // Every day from 21 days ago through yesterday.
    const sessions = [];
    for (let i = 1; i <= 21; i++) sessions.push(session(i, 1500));
    const count = countPerfectWeeks(sessions, NOW);
    // 21 days back from Jan 15 = Dec 25..Jan 14. Full weeks: Dec 28..Jan 3 and Jan 4..Jan 10.
    expect(count).toBe(2);
  });
});
