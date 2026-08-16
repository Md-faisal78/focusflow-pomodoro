import React, { useMemo, useState } from 'react';
import { buildHeatmap } from '../../utils/stats.js';
import { useIsDark } from '../../hooks/useIsDark.js';
import { formatDateKeyLabel } from '../../utils/time.js';

// Neutral-to-accent intensity ramp (light and dark).
const LIGHT_LEVELS = ['#E9E9E4', '#F4D6D8', '#E9AAB0', '#DD7B85', '#E60023'];
const DARK_LEVELS = ['#262622', '#382A2C', '#553338', '#7C3A43', '#E60023'];

const CELL = 12;
const GAP = 3;
const PAD_X = 30;
const PAD_TOP = 18;
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

export default function Heatmap({ sessions, weeks = 53, className }) {
  const isDark = useIsDark();
  const { cols, maxMinutes } = useMemo(() => buildHeatmap(sessions, weeks), [sessions, weeks]);
  const [tip, setTip] = useState(null);

  const width = PAD_X + cols.length * (CELL + GAP);
  const height = PAD_TOP + 7 * (CELL + GAP);
  const levels = isDark ? DARK_LEVELS : LIGHT_LEVELS;

  const totalMinutes = useMemo(
    () => cols.reduce((acc, c) => acc + c.days.reduce((x, d) => x + d.minutes, 0), 0),
    [cols]
  );

  return (
    <div className={className}>
      <div className="relative overflow-x-auto pb-1">
        <svg width={width} height={height} role="img" aria-label="Focus activity heatmap" className="block">
          {/* Month labels */}
          {cols.map((col, ci) => {
            const first = col.days[0];
            const prev = cols[ci - 1];
            const show =
              !prev ||
              (prev.days[0].date.getMonth() !== first.date.getMonth() ||
                prev.days[0].date.getFullYear() !== first.date.getFullYear());
            if (!show) return null;
            return (
              <text
                key={col.weekKey}
                x={PAD_X + ci * (CELL + GAP)}
                y={10}
                className="fill-ink-disabled text-[10px] dark:fill-night-muted"
              >
                {first.date.toLocaleDateString(undefined, { month: 'short' })}
              </text>
            );
          })}
          {/* Weekday labels */}
          {WEEKDAY_LABELS.map((label, di) =>
            label ? (
              <text
                key={label}
                x={0}
                y={PAD_TOP + di * (CELL + GAP) + CELL - 2}
                className="fill-ink-disabled text-[10px] dark:fill-night-muted"
              >
                {label}
              </text>
            ) : null
          )}
          {/* Cells */}
          {cols.map((col, ci) =>
            col.days.map((day, di) => {
              const x = PAD_X + ci * (CELL + GAP);
              const y = PAD_TOP + di * (CELL + GAP);
              return (
                <rect
                  key={day.key}
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  rx={3}
                  fill={day.future ? 'transparent' : levels[day.level]}
                  onMouseEnter={(e) => {
                    if (day.future) return;
                    const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                    setTip({
                      x: rect.left + x + CELL / 2,
                      y: rect.top + y - 6,
                      text:
                        day.minutes > 0
                          ? `${formatDateKeyLabel(day.key, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · ${day.minutes} min focused`
                          : `${formatDateKeyLabel(day.key, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · no sessions`,
                    });
                  }}
                  onMouseLeave={() => setTip(null)}
                />
              );
            })
          )}
        </svg>

        {tip ? (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-night-card2 dark:text-night-text"
            style={{ left: tip.x, top: tip.y }}
          >
            {tip.text}
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="text-xs text-ink-muted dark:text-night-muted">
          {totalMinutes > 0
            ? `${Math.round(totalMinutes)} min focused in the last year`
            : 'Complete a focus session to light up your calendar.'}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-ink-muted dark:text-night-muted">
          <span>Less</span>
          {levels.map((color, i) => (
            <span key={i} className="h-[10px] w-[10px] rounded-[2px]" style={{ backgroundColor: color }} />
          ))}
          <span>More</span>
        </div>
      </div>
      <p className="sr-only">
        {maxMinutes > 0 ? `Maximum daily focus: ${Math.round(maxMinutes)} minutes.` : 'No activity yet.'}
      </p>
    </div>
  );
}
