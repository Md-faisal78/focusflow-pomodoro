import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext.jsx';
import Icon from '../ui/Icon.jsx';

export default function StreakButton() {
  const { streak } = useApp();
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate('/statistics')}
      title={`Streak: ${streak.current} day${streak.current === 1 ? '' : 's'} — view statistics`}
      aria-label={`View your streak: ${streak.current} days`}
      className="flex h-9 items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/5 px-2.5 text-accent transition hover:bg-accent/10 dark:border-accent/40 dark:bg-accent/10 dark:text-accent-light dark:hover:bg-accent/15"
    >
      <Icon name="flame" size={16} />
      <span className="text-sm font-bold tabular-nums">{streak.current}</span>
      <span className="hidden text-xs font-medium text-accent/80 dark:text-accent-light/80 sm:inline">Streak</span>
    </button>
  );
}
