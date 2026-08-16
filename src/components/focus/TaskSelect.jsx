import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../store/AppContext.jsx';
import Icon from '../ui/Icon.jsx';

export default function TaskSelect() {
  const { state, actions } = useApp();
  const tasks = state.tasks;

  return (
    <div className="flex w-full max-w-sm items-center gap-2">
      <Icon name="target" size={16} className="shrink-0 text-ink-disabled dark:text-night-muted" />
      <select
        value={state.activeTaskId || ''}
        onChange={(e) => actions.setActiveTask(e.target.value || null)}
        className="input"
        aria-label="Current task"
      >
        <option value="">No task</option>
        {tasks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.completed ? '✓ ' : ''}
            {t.name} · {t.durationMinutes} min
          </option>
        ))}
      </select>
      {tasks.length === 0 ? (
        <Link to="/tasks" className="shrink-0 text-sm font-semibold text-accent hover:underline dark:text-accent-light">
          Add task
        </Link>
      ) : null}
    </div>
  );
}
