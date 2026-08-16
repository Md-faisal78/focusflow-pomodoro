import React from 'react';
import { LONG_BREAK_INTERVAL_MAX, LONG_BREAK_INTERVAL_MIN } from '../../constants/timer.js';
import { useApp } from '../../store/AppContext.jsx';
import { clamp } from '../../utils/time.js';
import Toggle from '../ui/Toggle.jsx';

export default function TimerSettings() {
  const { state, actions } = useApp();
  const s = state.settings;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-ink dark:text-white">Auto-start breaks</p>
          <p className="text-sm text-ink-muted dark:text-night-muted">
            Start the break automatically when a focus session ends.
          </p>
        </div>
        <Toggle
          checked={s.autoStartBreaks}
          onChange={(v) => actions.setSetting({ autoStartBreaks: v })}
          label="Auto-start breaks"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-ink dark:text-white">Auto-start focus sessions</p>
          <p className="text-sm text-ink-muted dark:text-night-muted">
            Start the next focus session automatically when a break ends.
          </p>
        </div>
        <Toggle
          checked={s.autoStartFocus}
          onChange={(v) => actions.setSetting({ autoStartFocus: v })}
          label="Auto-start focus sessions"
        />
      </div>

      <label className="block">
        <span className="label">Long break every</span>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={LONG_BREAK_INTERVAL_MIN}
            max={LONG_BREAK_INTERVAL_MAX}
            value={s.longBreakInterval}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!Number.isNaN(n)) {
                actions.setSetting({ longBreakInterval: clamp(n, LONG_BREAK_INTERVAL_MIN, LONG_BREAK_INTERVAL_MAX) });
              }
            }}
            className="input w-24"
            aria-label="Focus sessions before a long break"
          />
          <span className="text-sm text-ink-muted dark:text-night-muted">focus sessions</span>
        </div>
        <span className="mt-1 block text-[11px] text-ink-muted dark:text-night-muted">
          After this many focus sessions, the timer switches to a long break.
        </span>
      </label>
    </div>
  );
}
