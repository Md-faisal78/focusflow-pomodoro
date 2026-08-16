import { describe, expect, it } from 'vitest';
import { clamp, formatSeconds, formatDurationLabel, formatMinutes, minutesToSeconds } from '../time.js';

describe('formatSeconds', () => {
  it('formats zero', () => {
    expect(formatSeconds(0)).toBe('0:00');
  });
  it('formats minutes and seconds', () => {
    expect(formatSeconds(1500)).toBe('25:00');
    expect(formatSeconds(65)).toBe('1:05');
  });
  it('formats hours', () => {
    expect(formatSeconds(3661)).toBe('1:01:01');
  });
  it('clamps negatives', () => {
    expect(formatSeconds(-5)).toBe('0:00');
  });
});

describe('formatDurationLabel', () => {
  it('formats minutes', () => {
    expect(formatDurationLabel(2700)).toBe('45m');
  });
  it('formats hours and minutes', () => {
    expect(formatDurationLabel(5100)).toBe('1h 25m');
  });
  it('formats whole hours', () => {
    expect(formatDurationLabel(7200)).toBe('2h');
  });
});

describe('formatMinutes', () => {
  it('formats plain minutes', () => {
    expect(formatMinutes(25)).toBe('25 min');
  });
  it('formats hours', () => {
    expect(formatMinutes(90)).toBe('1h 30m');
  });
});

describe('clamp', () => {
  it('clamps within bounds', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(0, 1, 10)).toBe(1);
    expect(clamp(99, 1, 10)).toBe(10);
  });
});

describe('minutesToSeconds', () => {
  it('converts minutes to seconds', () => {
    expect(minutesToSeconds(25)).toBe(1500);
    expect(minutesToSeconds(0)).toBe(0);
  });
});
