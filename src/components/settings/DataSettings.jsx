import React, { useState } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import Button from '../ui/Button.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';

export default function DataSettings() {
  const { state, actions } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-soft-hairline p-3 dark:border-night-hairline">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted dark:text-night-muted">Stored sessions</dt>
          <dd className="mt-0.5 text-lg font-extrabold text-ink dark:text-white">{state.sessions.length}</dd>
        </div>
        <div className="rounded-xl border border-soft-hairline p-3 dark:border-night-hairline">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted dark:text-night-muted">Tasks</dt>
          <dd className="mt-0.5 text-lg font-extrabold text-ink dark:text-white">{state.tasks.length}</dd>
        </div>
        <div className="rounded-xl border border-soft-hairline p-3 dark:border-night-hairline">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted dark:text-night-muted">Custom sounds</dt>
          <dd className="mt-0.5 text-lg font-extrabold text-ink dark:text-white">{state.customSounds.length}</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm text-ink-muted dark:text-night-muted">
        All data is stored locally in your browser (localStorage + IndexedDB). Nothing is ever uploaded.
      </p>

      <div className="mt-4">
        <Button variant="danger" onClick={() => setConfirmOpen(true)}>
          Clear all data
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Clear all data?"
        message="This permanently deletes your tasks, session history, streaks, statistics and custom sounds from this browser. This cannot be undone."
        confirmLabel="Clear everything"
        onConfirm={() => actions.clearAllData()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
