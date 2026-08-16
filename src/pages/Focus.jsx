import React from 'react';
import { Link } from 'react-router-dom';
import ModeTabs from '../components/timer/ModeTabs.jsx';
import TimerDisplay from '../components/timer/TimerDisplay.jsx';
import TimerControls from '../components/timer/TimerControls.jsx';
import PresetPicker from '../components/timer/PresetPicker.jsx';
import TaskSelect from '../components/focus/TaskSelect.jsx';
import FocusStats from '../components/focus/FocusStats.jsx';
import Heatmap from '../components/statistics/Heatmap.jsx';
import Card from '../components/ui/Card.jsx';
import { APP, AUTHOR } from '../constants/app.js';
import { useApp } from '../store/AppContext.jsx';

export default function FocusPage() {
  const { state } = useApp();

  return (
    <div className="space-y-6">
      <section className="card px-4 py-8 sm:px-8">
        <div className="flex justify-center">
          <ModeTabs />
        </div>
        <TimerDisplay />
        <div className="mt-6 flex justify-center">
          <TaskSelect />
        </div>
        <TimerControls />
      </section>

      <section className="card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-ink dark:text-white">Timer preset</h2>
          <p className="text-sm text-ink-muted dark:text-night-muted">
            Choose a rhythm — or create your own with custom durations.
          </p>
        </div>
        <PresetPicker />
      </section>

      <FocusStats />

      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-ink dark:text-white">Your Focus Activity</h2>
            <p className="text-sm text-ink-muted dark:text-night-muted">Your last year of focus sessions.</p>
          </div>
          <Link
            to="/statistics"
            className="shrink-0 text-sm font-semibold text-accent hover:underline dark:text-accent-light"
          >
            View statistics
          </Link>
        </div>
        <Heatmap sessions={state.sessions} weeks={53} />
      </section>

      <footer className="pt-2 text-center text-xs leading-relaxed text-ink-muted dark:text-night-muted">
        <p>
          {APP.name} · {APP.tagline}
        </p>
        <p className="mt-0.5">
          Designed &amp; developed by {AUTHOR.name} ·{' '}
          <a
            href={AUTHOR.repository}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-ink-muted transition hover:text-accent dark:text-night-secondary dark:hover:text-accent-light"
          >
            Project Repository
          </a>
        </p>
      </footer>
    </div>
  );
}
