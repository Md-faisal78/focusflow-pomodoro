// App-wide configuration.
export const APP = {
  name: 'FocusFlow',
  tagline: 'Focus. Rest. Repeat.',
  version: '1.0.0',
  description:
    'A local-first Pomodoro focus timer with tasks, streaks, statistics and sounds. No account needed.',
};

// Developer attribution. Only the project repository is exposed in the UI.
export const AUTHOR = {
  name: 'Mohammed Faisal Farooq',
  repository: 'https://github.com/Md-faisal78/focusflow-pomodoro',
};

// Keys are stored namespaced under "focusflow:" — see services/storage.js.
export const STORAGE_KEYS = {
  settings: 'settings',
  tasks: 'tasks',
  activeTaskId: 'activeTaskId',
  timer: 'timer',
  theme: 'theme',
};
