import React from 'react';
import { TIMER_MODES } from '../../constants/timer.js';
import { useApp } from '../../store/AppContext.jsx';
import { formatSeconds } from '../../utils/time.js';
import ProgressRing from '../ui/ProgressRing.jsx';

export default function TimerDisplay() {
  const { state, activeTask } = useApp();
  const { mode, remaining, initialDuration, focusCountInCycle } = state.timer;
  const progress = initialDuration > 0 ? 1 - remaining / initialDuration : 0;
  const interval = state.settings.longBreakInterval;

  const inCycle = mode === 'focus' ? (focusCountInCycle % interval) + 1 : null;

  return (
    <div className="mx-auto mt-6 w-64 sm:w-72">
      <ProgressRing progress={progress} className="aspect-square w-full">
        <span className="text-sm font-semibold uppercase tracking-widest text-ink-muted dark:text-night-muted">
          {TIMER_MODES[mode].label}
        </span>
        <span className="mt-1 text-5xl font-bold tabular-nums tracking-tight text-ink dark:text-white sm:text-6xl">
          {formatSeconds(remaining)}
        </span>
        <span className="mt-2 text-xs font-medium text-ink-muted dark:text-night-muted">
          {inCycle ? `Session ${inCycle} of ${interval}` : '\u00A0'}
        </span>
      </ProgressRing>
      <p className="mt-4 truncate text-center text-sm font-medium text-ink-muted dark:text-night-secondary">
        {activeTask ? (
          <>
            Focusing on <span className="font-semibold text-ink dark:text-white">{activeTask.name}</span>
          </>
        ) : (
          <span className="text-ink-muted dark:text-night-muted">No active task</span>
        )}
      </p>
    </div>
  );
}
