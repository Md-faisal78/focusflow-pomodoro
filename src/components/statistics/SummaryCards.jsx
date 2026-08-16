import React from 'react';
import { useApp } from '../../store/AppContext.jsx';
import { formatDurationLabel } from '../../utils/time.js';
import Card from '../ui/Card.jsx';
import Icon from '../ui/Icon.jsx';

// Neutral icon tiles — the accent is reserved for important data/active values.
const CARD_STYLES = {
  time: 'bg-secondary text-ink dark:bg-night-card2 dark:text-night-text',
  sessions: 'bg-secondary text-ink dark:bg-night-card2 dark:text-night-text',
  streak: 'bg-accent text-white dark:bg-accent dark:text-white',
  tasks: 'bg-secondary text-ink dark:bg-night-card2 dark:text-night-text',
};

export default function SummaryCards() {
  const { state, streak, totals } = useApp();
  const tasksCompleted = state.tasks.filter((t) => t.completed).length;

  const cards = [
    { key: 'time', icon: 'timer', label: 'Total focus time', value: formatDurationLabel(totals.totalSeconds), sub: 'all time' },
    { key: 'sessions', icon: 'check', label: 'Sessions completed', value: String(totals.sessions), sub: 'focus sessions' },
    { key: 'streak', icon: 'flame', label: 'Current streak', value: `${streak.current} day${streak.current === 1 ? '' : 's'}`, sub: `longest ${streak.longest}` },
    { key: 'tasks', icon: 'list', label: 'Tasks completed', value: String(tasksCompleted), sub: `${state.tasks.length} total` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.key} className="p-4">
          <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${CARD_STYLES[c.key]}`}>
            <Icon name={c.icon} size={18} />
          </span>
          <p className="text-2xl font-extrabold text-ink dark:text-white">{c.value}</p>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-ink-muted dark:text-night-muted">
            {c.label}
          </p>
          <p className="text-[11px] text-ink-muted dark:text-night-muted">{c.sub}</p>
        </Card>
      ))}
    </div>
  );
}
