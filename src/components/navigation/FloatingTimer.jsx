import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PRESETS, TIMER_MODES } from '../../constants/timer.js';
import { useApp } from '../../store/AppContext.jsx';
import { formatSeconds } from '../../utils/time.js';
import Icon from '../ui/Icon.jsx';

export default function FloatingTimer({ currentPath }) {
  const { state, actions, activeTask } = useApp();
  const navigate = useNavigate();
  const { isRunning, remaining, initialDuration, mode } = state.timer;

  const started = isRunning || remaining < initialDuration;
  if (!started || currentPath === '/') return null;

  const progress = initialDuration > 0 ? 1 - remaining / initialDuration : 0;
  const label = TIMER_MODES[mode].shortLabel;
  const presetName = (PRESETS[state.settings.presetId] || PRESETS.classic).name;
  const title = activeTask ? activeTask.name : presetName;

  // Minimized: a compact pill showing only the remaining time; click to expand.
  if (state.floatingCollapsed) {
    return (
      <button
        type="button"
        onClick={() => actions.setFloatingCollapsed(false)}
        title={`Timer: ${formatSeconds(remaining)} — expand`}
        aria-label={`Timer: ${formatSeconds(remaining)}. Expand the timer popup.`}
        className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center overflow-hidden rounded-full border border-soft-hairline bg-white/95 px-4 py-2 shadow-xl backdrop-blur transition hover:bg-white md:bottom-6 dark:border-night-hairline dark:bg-night-card/95 dark:hover:bg-night-card"
      >
        <span className="font-bold tabular-nums text-ink dark:text-white">{formatSeconds(remaining)}</span>
        <span className="absolute bottom-0 left-0 h-0.5 bg-accent transition-[width] duration-500 ease-linear" style={{ width: `${progress * 100}%` }} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/')}
      title="Open the timer"
      aria-label={`Timer: ${label}, ${formatSeconds(remaining)}, ${title}`}
      className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 overflow-hidden rounded-full border border-soft-hairline bg-white/95 py-2 pl-3 pr-2 shadow-xl backdrop-blur transition hover:bg-white md:bottom-6 dark:border-night-hairline dark:bg-night-card/95 dark:hover:bg-night-card"
    >
      <span className="chip bg-secondary text-ink-secondary dark:bg-night-card2 dark:text-night-secondary">{label}</span>
      <span className="hidden max-w-40 truncate text-sm font-medium text-ink-secondary dark:text-night-secondary sm:block">
        {title}
      </span>
      <span className="font-bold tabular-nums text-ink dark:text-white">{formatSeconds(remaining)}</span>
      <span
        role="button"
        tabIndex={0}
        aria-label={isRunning ? 'Pause timer' : 'Resume timer'}
        onClick={(e) => {
          e.stopPropagation();
          if (isRunning) actions.pauseTimer();
          else actions.startTimer();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            if (isRunning) actions.pauseTimer();
            else actions.startTimer();
          }
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white transition hover:bg-accent-pressed"
      >
        <Icon name={isRunning ? 'pause' : 'play'} size={15} />
      </span>
      <span
        role="button"
        tabIndex={0}
        aria-label="Minimize timer"
        title="Minimize"
        onClick={(e) => {
          e.stopPropagation();
          actions.setFloatingCollapsed(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            actions.setFloatingCollapsed(true);
          }
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-secondary dark:text-night-muted dark:hover:bg-night-card2"
      >
        <Icon name="chevron-down" size={16} />
      </span>
      <span className="absolute bottom-0 left-0 h-0.5 bg-accent transition-[width] duration-500 ease-linear" style={{ width: `${progress * 100}%` }} />
    </button>
  );
}
