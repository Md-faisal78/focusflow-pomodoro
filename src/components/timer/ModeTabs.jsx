import React from 'react';
import clsx from 'clsx';
import { TIMER_MODES } from '../../constants/timer.js';
import { useApp } from '../../store/AppContext.jsx';

// Top-level tabs. "Break" groups the short and long break modes; the active
// one is chosen with the secondary selector below the tab.
const GROUPS = [
  { id: 'focus', label: 'Focus', modes: ['focus'] },
  { id: 'break', label: 'Break', modes: ['shortBreak', 'longBreak'] },
];

export default function ModeTabs({ className }) {
  const { state, actions } = useApp();
  const { mode } = state.timer;
  const activeGroup = GROUPS.find((g) => g.modes.includes(mode)) || GROUPS[0];
  const isBreak = activeGroup.id === 'break';

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="tablist"
        aria-label="Timer mode"
        className={clsx('inline-flex rounded-xl bg-secondary p-1 dark:bg-night-card2', className)}
      >
        {GROUPS.map((group) => {
          const active = activeGroup.id === group.id;
          return (
            <button
              key={group.id}
              role="tab"
              aria-selected={active}
              onClick={() => {
                if (group.id === 'focus') actions.setMode('focus');
                else actions.setMode(mode === 'longBreak' ? 'longBreak' : 'shortBreak');
              }}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                active
                  ? 'bg-white text-ink shadow-sm dark:bg-night-card dark:text-white'
                  : 'text-ink-muted hover:text-ink dark:text-night-muted dark:hover:text-white'
              )}
            >
              {group.label}
            </button>
          );
        })}
      </div>

      {isBreak ? (
        <div
          role="tablist"
          aria-label="Break type"
          className="inline-flex rounded-lg bg-secondary p-0.5 dark:bg-night-card2"
        >
          {['shortBreak', 'longBreak'].map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                role="tab"
                aria-selected={active}
                onClick={() => actions.setMode(m)}
                className={clsx(
                  'rounded-md px-2.5 py-1 text-xs font-semibold transition',
                  active
                    ? 'bg-accent text-white'
                    : 'text-ink-muted hover:text-ink dark:text-night-muted dark:hover:text-white'
                )}
              >
                {TIMER_MODES[m].label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
