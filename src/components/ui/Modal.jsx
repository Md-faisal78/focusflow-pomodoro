import React, { useEffect } from 'react';
import clsx from 'clsx';
import Icon from './Icon.jsx';

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-md', labelledBy }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm dark:bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        className={clsx(
          'relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-soft-hairline bg-white p-6 shadow-2xl sm:m-4 sm:rounded-3xl dark:border-night-hairline dark:bg-night-card',
          maxWidth
        )}
      >
        {title ? (
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={labelledBy} className="text-lg font-bold text-ink dark:text-white">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-secondary dark:text-night-muted dark:hover:bg-night-card2"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
