import React from 'react';
import { APP, AUTHOR } from '../constants/app.js';
import Card from './ui/Card.jsx';
import Icon from './ui/Icon.jsx';

// About FocusFlow — developer attribution shown at the bottom of Settings.
// The only external link is the project repository (see constants/app.js).

export default function AboutFocusFlow() {
  return (
    <Card className="p-6 sm:p-8">
      <h2 className="text-lg font-bold text-ink dark:text-white">About FocusFlow</h2>
      <p className="mb-5 mt-0.5 text-sm text-ink-muted dark:text-night-muted">
        A local-first Pomodoro focus timer. Everything runs in your browser — no account needed.
      </p>

      <div className="flex flex-col items-center rounded-2xl border border-soft-hairline bg-soft px-6 py-8 text-center dark:border-night-hairline dark:bg-night-card2/60">
        <img src="/icons/favicon.svg" alt="FocusFlow" width="48" height="48" className="h-12 w-12" draggable={false} />

        <h3 className="mt-4 text-2xl font-extrabold tracking-wide text-ink dark:text-white">
          {APP.name.toUpperCase()}
        </h3>
        <p className="mt-1 text-base font-medium text-ink-muted dark:text-night-muted">{APP.tagline}</p>

        <p className="mt-4 text-sm text-ink-secondary dark:text-night-secondary">
          Designed &amp; developed by{' '}
          <span className="font-semibold text-ink dark:text-white">{AUTHOR.name}</span>
        </p>

        <a
          href={AUTHOR.repository}
          target="_blank"
          rel="noreferrer"
          className="mt-4 text-sm font-semibold text-accent hover:underline dark:text-accent-light"
        >
          Project Repository
        </a>
        <p className="mt-0.5 text-xs text-ink-muted dark:text-night-muted">GitHub · FocusFlow</p>

        <a
          href={AUTHOR.repository}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex w-full max-w-sm flex-col items-center gap-1 rounded-2xl border border-soft-hairline bg-white px-5 py-3.5 text-center shadow-sm transition hover:border-accent/50 hover:shadow dark:border-night-hairline dark:bg-night-card2 dark:hover:border-accent/50"
        >
          <span className="inline-flex items-center gap-2 text-sm font-bold text-ink dark:text-night-text">
            <Icon name="star" size={16} className="text-accent dark:text-accent-light" />
            Star FocusFlow on GitHub
          </span>
          <span className="text-xs text-ink-muted dark:text-night-muted">View Project Repository →</span>
        </a>

        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-ink-muted dark:text-night-muted">
          Version {APP.version}
        </p>
      </div>
    </Card>
  );
}
