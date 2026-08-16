import React from 'react';
import clsx from 'clsx';
import { useApp } from '../../store/AppContext.jsx';
import Icon from '../ui/Icon.jsx';

const OPTIONS = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'system', label: 'System', icon: 'monitor' },
];

export default function ThemeSettings() {
  const { state, actions } = useApp();

  return (
    <div>
      <p className="text-sm text-ink-muted dark:text-night-muted">
        Theme is also available directly in the top-right corner of the app, next to your streak.
      </p>
      <div className="mt-3 flex gap-2">
        {OPTIONS.map((opt) => {
          const active = state.theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => actions.setTheme(opt.id)}
              className={clsx(
                'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition',
                active
                  ? 'border-accent/70 bg-accent/5 text-accent dark:bg-accent/10 dark:text-accent-light'
                  : 'border-soft-hairline bg-white text-ink-secondary hover:bg-secondary dark:border-night-hairline dark:bg-night-card dark:text-night-secondary dark:hover:bg-night-card2'
              )}
            >
              <Icon name={opt.icon} size={16} />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
