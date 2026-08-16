import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useApp } from '../store/AppContext.jsx';
import TaskForm from '../components/tasks/TaskForm.jsx';
import TaskItem from '../components/tasks/TaskItem.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import Button from '../components/ui/Button.jsx';
import Icon from '../components/ui/Icon.jsx';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

export default function TasksPage() {
  const { state, actions } = useApp();
  const [filter, setFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const filtered = useMemo(() => {
    const list = filter === 'all' ? state.tasks : state.tasks.filter((t) => (filter === 'active' ? !t.completed : t.completed));
    return [...list].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [state.tasks, filter]);

  const counts = useMemo(
    () => ({
      all: state.tasks.length,
      active: state.tasks.filter((t) => !t.completed).length,
      completed: state.tasks.filter((t) => t.completed).length,
    }),
    [state.tasks]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink dark:text-white">Tasks</h1>
          <p className="text-sm text-ink-muted dark:text-night-muted">
            Each task has its own focus target. Pick one on the Focus page to track sessions against it.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Icon name="plus" size={18} />
          New task
        </Button>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Task filter">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={clsx(
              'rounded-full px-4 py-1.5 text-sm font-semibold transition',
              filter === f.id
                ? 'bg-accent text-white'
                : 'bg-secondary text-ink-secondary hover:bg-secondary-pressed dark:bg-night-card2 dark:text-night-secondary dark:hover:bg-[#3A3A36]'
            )}
          >
            {f.label} · {counts[f.id]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
          <img src="/icons/favicon.svg" alt="" width="48" height="48" className="h-12 w-12" draggable={false} />
          <div>
            <p className="font-semibold text-ink-secondary dark:text-night-secondary">
              {state.tasks.length === 0 ? 'No tasks yet' : 'Nothing in this view'}
            </p>
            <p className="mt-1 text-sm text-ink-muted dark:text-night-muted">
              {state.tasks.length === 0
                ? 'Create a task with its own focus duration to start tracking.'
                : 'Try another filter.'}
            </p>
          </div>
          {state.tasks.length === 0 ? (
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Icon name="plus" size={18} />
              Create your first task
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((task) => (
            <li key={task.id}>
              <TaskItem
                task={task}
                onEdit={(t) => { setEditing(t); setFormOpen(true); }}
                onDelete={(t) => setDeleting(t)}
              />
            </li>
          ))}
        </ul>
      )}

      <TaskForm
        open={formOpen}
        task={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={(data) => {
          if (editing) {
            actions.updateTask({ ...editing, ...data });
          } else {
            actions.addTask(data);
          }
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete task?"
        message={`"${deleting?.name || ''}" and its progress will be removed. Sessions already logged stay in your statistics.`}
        confirmLabel="Delete"
        onConfirm={() => deleting && actions.deleteTask(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
