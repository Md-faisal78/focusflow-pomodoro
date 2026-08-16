import React from 'react';
import clsx from 'clsx';
import Icon from './Icon.jsx';

export default function IconButton({ icon, label, onClick, className, active = false, size = 18, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={clsx(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition',
        active
          ? 'border-accent/60 bg-accent/5 text-accent dark:bg-accent/10 dark:text-accent-light'
          : 'border-soft-hairline bg-white text-ink-secondary hover:bg-secondary dark:border-night-hairline dark:bg-night-card dark:text-night-secondary dark:hover:bg-night-card2',
        className
      )}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}
