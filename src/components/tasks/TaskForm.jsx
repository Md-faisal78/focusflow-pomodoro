import React, { useEffect, useState } from 'react';
import { MAX_SESSION_MINUTES, MIN_SESSION_MINUTES } from '../../constants/timer.js';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { clamp } from '../../utils/time.js';

const DEFAULT_DURATION = 25;

export default function TaskForm({ open, task, onSubmit, onClose }) {
  const [name, setName] = useState('');
  const [durationText, setDurationText] = useState(String(DEFAULT_DURATION));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(task?.name || '');
    setDurationText(String(task?.durationMinutes ?? DEFAULT_DURATION));
    setError('');
  }, [open, task]);

  const durationMinutes = clamp(parseInt(durationText, 10) || 0, MIN_SESSION_MINUTES, MAX_SESSION_MINUTES);

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please give the task a name.');
      return;
    }
    onSubmit({ name: name.trim(), durationMinutes });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      maxWidth="max-w-md"
      labelledBy="task-form-title"
    >
      <h2 id="task-form-title" className="sr-only">
        {task ? 'Edit task' : 'New task'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="label">Task name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Write project proposal"
            className="input"
            autoFocus
            maxLength={120}
          />
        </label>

        <label className="block">
          <span className="label">Custom focus duration (minutes)</span>
          <div className="relative">
            <input
              type="number"
              min={MIN_SESSION_MINUTES}
              max={MAX_SESSION_MINUTES}
              value={durationText}
              onChange={(e) => setDurationText(e.target.value)}
              onBlur={() => setDurationText(String(durationMinutes))}
              className="input pr-14"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-ink-disabled">
              min
            </span>
          </div>
          <span className="mt-1 block text-[11px] text-ink-muted dark:text-night-muted">
            The task auto-completes once its total focused time reaches this target.
          </span>
        </label>

        {error ? <p className="text-sm font-medium text-accent dark:text-accent-light">{error}</p> : null}

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{task ? 'Save changes' : 'Add task'}</Button>
        </div>
      </form>
    </Modal>
  );
}
