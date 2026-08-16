import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../store/AppContext.jsx';
import { todayKey } from '../../utils/date.js';
import { formatMinutes } from '../../utils/time.js';
import Card from '../ui/Card.jsx';

function Stat({ label, value, sub }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted dark:text-night-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-ink dark:text-white">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-ink-muted dark:text-night-muted">{sub}</p> : null}
    </Card>
  );
}

export default function FocusStats() {
  const { state, streak } = useApp();
  const today = todayKey();
  const todaySeconds = state.sessions
    .filter((s) => s.dateKey === today && s.mode === 'focus')
    .reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const todayCount = state.sessions.filter((s) => s.dateKey === today && s.mode === 'focus').length;

  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat label="Today" value={formatMinutes(todaySeconds / 60)} sub={todayCount ? `${todayCount} session${todayCount === 1 ? '' : 's'}` : 'No sessions yet'} />
      <Stat label="Streak" value={`${streak.current} day${streak.current === 1 ? '' : 's'}`} sub={streak.current > 0 ? 'Keep it up!' : 'Start today'} />
      <Stat label="Longest" value={`${streak.longest} day${streak.longest === 1 ? '' : 's'}`} sub={<Link to="/statistics" className="font-semibold text-accent hover:underline dark:text-accent-light">View stats</Link>} />
    </div>
  );
}
