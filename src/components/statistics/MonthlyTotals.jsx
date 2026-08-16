import React, { useMemo } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import { monthlyTotals } from '../../utils/stats.js';

export default function MonthlyTotals() {
  const { state } = useApp();
  const months = useMemo(() => monthlyTotals(state.sessions, 12, new Date()), [state.sessions]);
  const maxMinutes = Math.max(1, ...months.map((m) => m.minutes));

  return (
    <div>
      <ul className="space-y-2.5">
        {months.map((m) => (
          <li key={m.key} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs font-semibold text-ink-muted dark:text-night-muted">{m.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary dark:bg-night-card2">
              <div
                className="h-full rounded-full bg-accent/80"
                style={{ width: `${Math.max(m.minutes > 0 ? 4 : 0, (m.minutes / maxMinutes) * 100)}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs font-bold text-ink-secondary dark:text-night-secondary">
              {m.minutes > 0 ? `${m.minutes} min` : '—'}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-muted dark:text-night-muted">Focus time per month · last 12 months</p>
    </div>
  );
}
