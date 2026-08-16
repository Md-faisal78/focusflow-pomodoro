import React from 'react';
import clsx from 'clsx';
import { useApp } from '../../store/AppContext.jsx';
import { formatMinutes } from '../../utils/time.js';
import IconButton from '../ui/IconButton.jsx';
import Icon from '../ui/Icon.jsx';

export default function TaskItem({ task, onEdit, onDelete }) {
  const { actions } = useApp();
  const targetSeconds = (task.durationMinutes || 25) * 60;
  const progress = Math.min(100, Math.round(((task.focusedSeconds || 0) / targetSeconds) * 100));
  const focusedLabel = formatMinutes((task.focusedSeconds || 0) / 60);

  return (
    <div className="card flex items-start gap-3 p-4">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={task.completed ? `Mark "${task.name}" as active` : `Mark "${task.name}" as complete`}
        onClick={() => actions.toggleTask(task.id)}
        className={clsx(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition',
          task.completed
            ? 'border-accent bg-accent text-white'
            : 'border-ink-faint text-transparent hover:border-accent dark:border-night-muted'
        )}
      >
        <Icon name="check" size={14} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={clsx(
              'break-words font-semibold',
              task.completed ? 'text-ink-muted line-through dark:text-night-muted' : 'text-ink dark:text-white'
            )}
          >
            {task.name}
          </span>
          <span className="chip bg-secondary text-ink-secondary dark:bg-night-card2 dark:text-night-secondary">
            {task.durationMinutes} min
          </span>
          {task.completed ? (
            <span className="chip bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              Completed
            </span>
          ) : null}
        </div>

        <p className="mt-1 text-xs text-ink-muted dark:text-night-muted">
          {task.completedSessions || 0} focus session{task.completedSessions === 1 ? '' : 's'} · {focusedLabel} focused
        </p>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary dark:bg-night-card2">
          <div
            className={clsx('h-full rounded-full transition-all', task.completed ? 'bg-ink-faint dark:bg-night-muted' : 'bg-accent')}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-ink-muted dark:text-night-muted">
          {Math.round((task.focusedSeconds || 0) / 60)} of {task.durationMinutes} min target
        </p>
      </div>

      <div className="flex shrink-0 gap-1.5">
        <IconButton icon="pencil" label={`Edit "${task.name}"`} onClick={() => onEdit(task)} size={16} />
        <IconButton
          icon="trash"
          label={`Delete "${task.name}"`}
          onClick={() => onDelete(task)}
          size={16}
          className="hover:border-accent/40 hover:bg-accent/5 hover:text-accent dark:hover:border-accent/40 dark:hover:bg-accent/10 dark:hover:text-accent-light"
        />
      </div>
    </div>
  );
}
