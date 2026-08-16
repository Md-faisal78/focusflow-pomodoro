import React, { useMemo } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import { lastNDays } from '../../utils/stats.js';

const BAR_AREA = 150;

export default function WeeklyChart() {
  const { state } = useApp();
  const days = useMemo(() => lastNDays(state.sessions, 7, new Date()), [state.sessions]);
  const max = Math.max(1, ...days.map((d) => d.minutes));

  return (
    <div>
      <div className="flex h-44 items-end gap-1.5 sm:gap-2">
        {days.map((day) => {
          const barHeight = day.minutes > 0 ? Math.max(8, (day.minutes / max) * BAR_AREA) : 3;
          const isToday = day.key === days[days.length - 1].key;
          return (
            <div key={day.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[10px] font-semibold text-ink-muted opacity-0 transition group-hover:opacity-100 dark:text-night-muted">
                {day.minutes}m
              </span>
              <div className="flex w-full flex-1 items-end justify-center">
                <div
                  title={`${day.dateLabel} · ${day.minutes} min · ${day.sessions} session${day.sessions === 1 ? '' : 's'}`}
                  className={
                    day.minutes > 0
                      ? `w-full max-w-8 rounded-t-md transition ${isToday ? 'bg-accent' : 'bg-accent/70 group-hover:bg-accent'}`
                      : 'w-full max-w-8 rounded-t-md bg-secondary dark:bg-night-card2'
                  }
                  style={{ height: barHeight }}
                />
              </div>
              <span className={`text-[10px] font-semibold uppercase ${isToday ? 'text-accent dark:text-accent-light' : 'text-ink-muted dark:text-night-muted'}`}>
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-muted dark:text-night-muted">Focus minutes per day · last 7 days</p>
    </div>
  );
}
