import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import {
  DEFAULT_CUSTOM_DURATIONS,
  DEFAULT_LONG_BREAK_INTERVAL,
  DEFAULT_PRESET_ID,
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  PRESETS,
  TIMER_MODES,
} from '../constants/timer.js';
import { STORAGE_KEYS } from '../constants/app.js';
import { load, save, clearAllLocalStorage } from '../services/storage.js';
import { DB_STORES, idbAdd, idbClear, idbGetAll } from '../services/database.js';
import { playSoundSelection } from '../services/sounds.js';
import { addCustomSound, deleteCustomSound, listCustomSounds } from '../services/audioStore.js';
import { showNotification } from '../services/notifications.js';
import { computeStreaks, computeTotals } from '../utils/stats.js';
import { clamp, formatSeconds, minutesToSeconds } from '../utils/time.js';
import { todayKey } from '../utils/date.js';
import { uid } from '../utils/uid.js';

const DEFAULT_SETTINGS = {
  presetId: DEFAULT_PRESET_ID,
  customDurations: { ...DEFAULT_CUSTOM_DURATIONS },
  longBreakInterval: DEFAULT_LONG_BREAK_INTERVAL,
  soundEnabled: true,
  selectedSound: 'digital-bell',
  notificationEnabled: true,
  autoStartBreaks: false,
  autoStartFocus: false,
};

/** Full duration (seconds) for a given mode under the current settings. */
function durationSecondsFor(state, mode) {
  const { presetId, customDurations } = state.settings;
  const preset = PRESETS[presetId] || PRESETS[DEFAULT_PRESET_ID];
  const d = presetId === 'custom' ? { ...DEFAULT_CUSTOM_DURATIONS, ...customDurations } : preset;
  const minutes = mode === 'focus' ? d.focus : mode === 'shortBreak' ? d.shortBreak : d.longBreak;
  return minutesToSeconds(minutes);
}

function initialTimer(state) {
  const duration = durationSecondsFor(state, 'focus');
  return {
    mode: 'focus',
    remaining: duration,
    initialDuration: duration,
    isRunning: false,
    focusCountInCycle: 0,
    endsAt: null,
  };
}

/** Restore a persisted timer. Always restored paused; expired timers reset. */
function persistedTimer(state, saved) {
  if (!saved || typeof saved !== 'object') return initialTimer(state);
  const mode = TIMER_MODES[saved.mode] ? saved.mode : 'focus';
  const initialDuration = durationSecondsFor(state, mode);
  let remaining = initialDuration;
  if (saved.endsAt && typeof saved.endsAt === 'number' && saved.endsAt > Date.now()) {
    remaining = clamp(Math.ceil((saved.endsAt - Date.now()) / 1000), 1, initialDuration);
  } else if (saved.remaining && saved.remaining < initialDuration) {
    remaining = clamp(Math.round(saved.remaining), 1, initialDuration);
  }
  return {
    mode,
    remaining,
    initialDuration,
    isRunning: false,
    focusCountInCycle: Math.max(0, Math.round(saved.focusCountInCycle) || 0),
    endsAt: null,
  };
}

function init() {
  const settings = { ...DEFAULT_SETTINGS, ...(load(STORAGE_KEYS.settings, {}) || {}) };
  settings.customDurations = { ...DEFAULT_CUSTOM_DURATIONS, ...(settings.customDurations || {}) };
  if (!PRESETS[settings.presetId]) settings.presetId = DEFAULT_PRESET_ID;

  const tasks = load(STORAGE_KEYS.tasks, []) || [];
  const activeTaskId = load(STORAGE_KEYS.activeTaskId, null);

  const state = {
    theme: load(STORAGE_KEYS.theme, 'system'),
    settings,
    tasks,
    activeTaskId,
    sessions: [],
    sessionsLoaded: false,
    customSounds: [],
    timer: null,
    lastCompleted: null,
    floatingCollapsed: false,
  };
  state.timer = persistedTimer(state, load(STORAGE_KEYS.timer, null));
  return state;
}

/** Complete the current session: record it, then switch to the next mode. */
function completeSession(state) {
  const { mode } = state.timer;
  const { longBreakInterval, autoStartBreaks, autoStartFocus } = state.settings;

  let focusCountInCycle = state.timer.focusCountInCycle;
  let nextMode;
  if (mode === 'focus') {
    focusCountInCycle += 1;
    nextMode = focusCountInCycle % longBreakInterval === 0 ? 'longBreak' : 'shortBreak';
  } else {
    nextMode = 'focus';
  }

  const nextDuration = durationSecondsFor(state, nextMode);
  const autoStart = mode === 'focus' ? autoStartBreaks : autoStartFocus;

  const session = {
    id: uid(),
    mode,
    durationSeconds: state.timer.initialDuration,
    completedAt: Date.now(),
    dateKey: todayKey(),
    taskId: state.activeTaskId || null,
  };

  return {
    ...state,
    lastCompleted: { mode, session, at: Date.now() },
    timer: {
      mode: nextMode,
      remaining: nextDuration,
      initialDuration: nextDuration,
      isRunning: autoStart,
      focusCountInCycle,
      endsAt: autoStart ? Date.now() + nextDuration * 1000 : null,
    },
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FLOATING_COLLAPSED':
      return { ...state, floatingCollapsed: !!action.collapsed };

    case 'SET_THEME':
      return { ...state, theme: action.theme };

    case 'SET_SETTING':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'SET_PRESET': {
      const settings = { ...state.settings, presetId: action.presetId };
      const next = { ...state, settings };
      // If the timer is idle (untouched), refresh its duration for the new preset.
      if (!state.timer.isRunning && state.timer.remaining === durationSecondsFor(state, state.timer.mode)) {
        const duration = durationSecondsFor(next, state.timer.mode);
        next.timer = {
          ...state.timer,
          remaining: duration,
          initialDuration: duration,
          endsAt: null,
        };
      }
      return next;
    }

    case 'SET_CUSTOM_DURATIONS': {
      const customDurations = { ...DEFAULT_CUSTOM_DURATIONS, ...action.values };
      const settings = { ...state.settings, customDurations };
      const next = { ...state, settings };
      if (!state.timer.isRunning && state.timer.remaining === durationSecondsFor(state, state.timer.mode)) {
        const duration = durationSecondsFor(next, state.timer.mode);
        next.timer = { ...state.timer, remaining: duration, initialDuration: duration, endsAt: null };
      }
      return next;
    }

    case 'SET_MODE': {
      const duration = durationSecondsFor(state, action.mode);
      return {
        ...state,
        timer: {
          ...state.timer,
          mode: action.mode,
          remaining: duration,
          initialDuration: duration,
          isRunning: false,
          endsAt: null,
        },
      };
    }

    case 'START_TIMER':
      return {
        ...state,
        timer: { ...state.timer, isRunning: true, endsAt: Date.now() + state.timer.remaining * 1000 },
      };

    case 'PAUSE_TIMER': {
      // Floor so elapsed time never rounds back up to the full duration.
      const remaining = state.timer.endsAt
        ? Math.max(1, Math.floor((state.timer.endsAt - Date.now()) / 1000))
        : state.timer.remaining;
      return { ...state, timer: { ...state.timer, isRunning: false, remaining, endsAt: null } };
    }

    case 'RESET_TIMER': {
      const duration = durationSecondsFor(state, state.timer.mode);
      return {
        ...state,
        timer: { ...state.timer, remaining: duration, initialDuration: duration, isRunning: false, endsAt: null },
      };
    }

    case 'TICK': {
      if (!state.timer.isRunning) return state;
      if (state.timer.endsAt && state.timer.endsAt <= Date.now()) {
        return completeSession(state);
      }
      const remaining = state.timer.endsAt
        ? Math.max(1, Math.round((state.timer.endsAt - Date.now()) / 1000))
        : state.timer.remaining - 1;
      return { ...state, timer: { ...state.timer, remaining } };
    }

    case 'SESSION_ADDED':
      return { ...state, sessions: [...state.sessions, action.session] };

    case 'SESSIONS_LOADED':
      return { ...state, sessions: action.sessions || [], sessionsLoaded: true };

    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.task] };

    case 'UPDATE_TASK':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.task.id ? action.task : t)) };

    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.id),
        activeTaskId: state.activeTaskId === action.id ? null : state.activeTaskId,
      };

    case 'TOGGLE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, completed: !t.completed, completedAt: t.completed ? null : Date.now() } : t
        ),
      };

    case 'TASK_FOCUS_SESSION':
      return {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.id !== action.taskId) return t;
          const focusedSeconds = (t.focusedSeconds || 0) + action.durationSeconds;
          const targetSeconds = (t.durationMinutes || 25) * 60;
          const completed = t.completed || focusedSeconds >= targetSeconds;
          return {
            ...t,
            focusedSeconds,
            completedSessions: (t.completedSessions || 0) + 1,
            completed,
            completedAt: t.completedAt || (completed ? Date.now() : null),
          };
        }),
      };

    case 'SET_ACTIVE_TASK':
      return { ...state, activeTaskId: action.id };

    case 'CUSTOM_SOUNDS_LOADED':
      return { ...state, customSounds: action.list || [] };

    case 'ADD_CUSTOM_SOUND':
      return { ...state, customSounds: [action.sound, ...state.customSounds] };

    case 'DELETE_CUSTOM_SOUND':
      return { ...state, customSounds: state.customSounds.filter((s) => s.id !== action.id) };

    case 'CLEAR_ALL_DATA':
      return init();

    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  // ---- Theme -------------------------------------------------------------
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const apply = () => {
      const dark = state.theme === 'dark' || (state.theme === 'system' && !!mq?.matches);
      root.classList.toggle('dark', dark);
      root.style.colorScheme = dark ? 'dark' : 'light';
    };
    apply();
    mq?.addEventListener?.('change', apply);
    return () => mq?.removeEventListener?.('change', apply);
  }, [state.theme]);

  // ---- Timer tick --------------------------------------------------------
  useEffect(() => {
    if (!state.timer.isRunning) return undefined;
    const id = window.setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => window.clearInterval(id);
  }, [state.timer.isRunning]);

  // ---- Session completion side effects ------------------------------------
  useEffect(() => {
    const event = state.lastCompleted;
    if (!event) return;
    const { mode, session } = event;
    const isFocus = mode === 'focus';
    const title = isFocus
      ? 'Focus session complete!'
      : mode === 'shortBreak'
        ? 'Short break complete'
        : 'Long break complete';
    const nextLabel = state.timer.mode === 'focus' ? 'focus' : 'break';
    const body = isFocus
      ? `Great work — ${formatSeconds(session.durationSeconds)} of focus. Time for a ${nextLabel}.`
      : 'Break is over — ready to focus again?';

    if (state.settings.soundEnabled) {
      playSoundSelection(state.settings.selectedSound);
    }
    if (state.settings.notificationEnabled) {
      showNotification({ title, body });
    }

    if (isFocus) {
      // Persist to IndexedDB, then add to in-memory state for stats/streaks.
      idbAdd(DB_STORES.sessions, session)
        .then(() => dispatch({ type: 'SESSION_ADDED', session }))
        .catch(() => {});
      if (session.taskId) {
        dispatch({
          type: 'TASK_FOCUS_SESSION',
          taskId: session.taskId,
          durationSeconds: session.durationSeconds,
        });
      }
    }
  }, [state.lastCompleted]);

  // ---- Load persisted collections on mount --------------------------------
  useEffect(() => {
    let cancelled = false;
    idbGetAll(DB_STORES.sessions)
      .then((list) => {
        if (!cancelled) dispatch({ type: 'SESSIONS_LOADED', sessions: list || [] });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'SESSIONS_LOADED', sessions: [] });
      });
    listCustomSounds()
      .then((list) => {
        if (!cancelled) dispatch({ type: 'CUSTOM_SOUNDS_LOADED', list });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Persist to localStorage --------------------------------------------
  useEffect(() => save(STORAGE_KEYS.settings, state.settings), [state.settings]);
  useEffect(() => save(STORAGE_KEYS.tasks, state.tasks), [state.tasks]);
  useEffect(() => save(STORAGE_KEYS.activeTaskId, state.activeTaskId), [state.activeTaskId]);
  useEffect(() => save(STORAGE_KEYS.theme, state.theme), [state.theme]);
  useEffect(
    () =>
      save(STORAGE_KEYS.timer, {
        mode: state.timer.mode,
        remaining: state.timer.remaining,
        focusCountInCycle: state.timer.focusCountInCycle,
        endsAt: state.timer.isRunning ? state.timer.endsAt : null,
      }),
    [state.timer.mode, state.timer.remaining, state.timer.focusCountInCycle, state.timer.isRunning, state.timer.endsAt]
  );

  // ---- Document title ------------------------------------------------------
  useEffect(() => {
    const label = TIMER_MODES[state.timer.mode].label;
    document.title = `${formatSeconds(state.timer.remaining)} · ${label} · FocusFlow`;
  }, [state.timer.remaining, state.timer.mode]);

  // ---- Actions -------------------------------------------------------------
  const actions = useMemo(
    () => ({
      setFloatingCollapsed: (collapsed) => dispatch({ type: 'SET_FLOATING_COLLAPSED', collapsed }),
      setTheme: (theme) => dispatch({ type: 'SET_THEME', theme }),
      setSetting: (patch) => dispatch({ type: 'SET_SETTING', patch }),
      setPreset: (presetId) => dispatch({ type: 'SET_PRESET', presetId }),
      setCustomDurations: (values) => dispatch({ type: 'SET_CUSTOM_DURATIONS', values }),
      setMode: (mode) => dispatch({ type: 'SET_MODE', mode }),
      startTimer: () => dispatch({ type: 'START_TIMER' }),
      pauseTimer: () => dispatch({ type: 'PAUSE_TIMER' }),
      resetTimer: () => dispatch({ type: 'RESET_TIMER' }),

      addTask: (data) => {
        const task = {
          id: uid(),
          name: String(data.name || '').trim(),
          durationMinutes: clamp(Number(data.durationMinutes) || 25, MIN_SESSION_MINUTES, MAX_SESSION_MINUTES),
          completed: false,
          completedSessions: 0,
          focusedSeconds: 0,
          createdAt: Date.now(),
          completedAt: null,
        };
        dispatch({ type: 'ADD_TASK', task });
        return task;
      },
      updateTask: (task) => dispatch({ type: 'UPDATE_TASK', task }),
      deleteTask: (id) => dispatch({ type: 'DELETE_TASK', id }),
      toggleTask: (id) => dispatch({ type: 'TOGGLE_TASK', id }),
      setActiveTask: (id) => dispatch({ type: 'SET_ACTIVE_TASK', id }),

      previewSound: (selection) => {
        playSoundSelection(selection);
      },
      addCustomSound: async (file) => {
        const record = await addCustomSound(file);
        dispatch({ type: 'ADD_CUSTOM_SOUND', sound: record });
        return record;
      },
      deleteCustomSound: async (id) => {
        await deleteCustomSound(id);
        dispatch({ type: 'DELETE_CUSTOM_SOUND', id });
      },
      clearAllData: async () => {
        clearAllLocalStorage();
        await idbClear(DB_STORES.sessions).catch(() => {});
        await idbClear(DB_STORES.customSounds).catch(() => {});
        dispatch({ type: 'CLEAR_ALL_DATA' });
      },
    }),
    []
  );

  const value = useMemo(() => {
    const activeTask = state.tasks.find((t) => t.id === state.activeTaskId) || null;
    return {
      state,
      ...state,
      actions,
      activeTask,
      streak: computeStreaks(state.sessions),
      totals: computeTotals(state.sessions),
    };
  }, [state, actions]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
