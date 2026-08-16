import { describe, expect, it } from 'vitest';
import { addDays, dateKey, daysBetween, parseDateKey, startOfWeek } from '../date.js';

describe('dateKey', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('parseDateKey', () => {
  it('parses back to a local date', () => {
    const d = parseDateKey('2026-03-14');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(14);
  });
});

describe('addDays', () => {
  it('adds and subtracts days', () => {
    expect(dateKey(addDays(new Date(2026, 0, 5), 1))).toBe('2026-01-06');
    expect(dateKey(addDays(new Date(2026, 0, 5), -5))).toBe('2025-12-31');
  });
});

describe('startOfWeek', () => {
  it('returns the Sunday before the date', () => {
    // Jan 5 2026 is a Monday.
    expect(dateKey(startOfWeek(new Date(2026, 0, 5)))).toBe('2026-01-04');
    // Jan 4 2026 is a Sunday.
    expect(dateKey(startOfWeek(new Date(2026, 0, 4)))).toBe('2026-01-04');
  });
});

describe('daysBetween', () => {
  it('counts whole days between keys', () => {
    expect(daysBetween('2026-01-01', '2026-01-03')).toBe(2);
    expect(daysBetween('2026-01-03', '2026-01-01')).toBe(-2);
  });
});
