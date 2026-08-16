import React from 'react';
import clsx from 'clsx';

export default function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-night',
        checked ? 'bg-accent' : 'bg-ink-faint dark:bg-night-card2',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span
        className={clsx(
          'inline-block transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[1.25rem]' : 'translate-x-[0.1875rem]'
        )}
        style={{ width: 18, height: 18 }}
      />
    </button>
  );
}
