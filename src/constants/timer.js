export const TIMER_MODES = {
  focus: { id: 'focus', label: 'Focus', shortLabel: 'Focus' },
  shortBreak: { id: 'shortBreak', label: 'Short Break', shortLabel: 'Break' },
  longBreak: { id: 'longBreak', label: 'Long Break', shortLabel: 'Long Break' },
};

export const MODE_ORDER = ['focus', 'shortBreak', 'longBreak'];

export const PRESETS = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'The standard Pomodoro rhythm.',
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
  },
  deep: {
    id: 'deep',
    name: 'Deep Focus',
    description: 'Long sessions for deep, uninterrupted work.',
    focus: 50,
    shortBreak: 10,
    longBreak: 30,
  },
  quick: {
    id: 'quick',
    name: 'Quick Focus',
    description: 'Short sprints when you need a fast start.',
    focus: 15,
    shortBreak: 3,
    longBreak: 10,
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Set your own durations.',
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
  },
};

export const DEFAULT_PRESET_ID = 'classic';
export const DEFAULT_CUSTOM_DURATIONS = { focus: 25, shortBreak: 5, longBreak: 15 };
export const DEFAULT_LONG_BREAK_INTERVAL = 4;
export const LONG_BREAK_INTERVAL_MIN = 2;
export const LONG_BREAK_INTERVAL_MAX = 8;

// Duration bounds (in minutes) for custom sessions / tasks.
export const MIN_SESSION_MINUTES = 1;
export const MAX_SESSION_MINUTES = 180;
