import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useApp } from '../../store/AppContext.jsx';
import { rangeStats } from '../../utils/stats.js';
import { formatDurationLabel, formatSeconds } from '../../utils/time.js';

const RANGES = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
];

export default function RangeStats() {
  const { state } = useApp();
  const [range, setRange] = useState('week');
  const stats = useMemo(() => rangeStats(state.sessions, range, new Date()), [state.sessions, range]);

  const rows = [
    { label: 'Focus sessions', value: String(stats.sessions) },
    { label: 'Focus time', value: formatDurationLabel(stats.totalSeconds) },
    { label: 'Avg session length', value: stats.sessions ? formatSeconds(stats.avgSeconds) : '—' },
    { label: 'Active days', value: String(stats.activeDays) },
    { label: 'Best day', value: stats.bestMinutes > 0 ? `${Math.round(stats.bestMinutes)} min` : '—' },
  ];

  return (
    <div>
      <div className="flex gap-2" role="tablist" aria-label="Statistics range">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={range === r.id}
            onClick={() => setRange(r.id)}
            className={clsx(
              'rounded-full px-4 py-1.5 text-sm font-semibold transition',
              range === r.id
                ? 'bg-accent text-white'
                : 'bg-secondary text-ink-secondary hover:bg-secondary-pressed dark:bg-night-card2 dark:text-night-secondary dark:hover:bg-[#3A3A36]'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <dl className="mt-4 divide-y divide-soft-hairline dark:divide-night-hairline">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2.5">
            <dt className="text-sm text-ink-muted dark:text-night-muted">{row.label}</dt>
            <dd className="text-sm font-bold text-ink dark:text-white">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
