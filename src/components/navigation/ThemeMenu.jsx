import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useApp } from '../../store/AppContext.jsx';
import Icon from '../ui/Icon.jsx';

const OPTIONS = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'system', label: 'System', icon: 'monitor' },
];

const ICON_BY_THEME = { light: 'sun', dark: 'moon', system: 'monitor' };

export default function ThemeMenu() {
  const { state, actions } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Change theme"
        title="Change theme"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-soft-hairline bg-white text-ink-secondary transition hover:bg-secondary dark:border-night-hairline dark:bg-night-card dark:text-night-secondary dark:hover:bg-night-card2"
      >
        <Icon name={ICON_BY_THEME[state.theme] || 'sun'} size={17} />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Theme"
          className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-soft-hairline bg-white p-1 shadow-xl dark:border-night-hairline dark:bg-night-card"
        >
          {OPTIONS.map((opt) => {
            const active = state.theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  actions.setTheme(opt.id);
                  setOpen(false);
                }}
                className={clsx(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-accent/5 text-accent dark:bg-accent/10 dark:text-accent-light'
                    : 'text-ink-secondary hover:bg-secondary dark:text-night-secondary dark:hover:bg-night-card2'
                )}
              >
                <Icon name={opt.icon} size={16} />
                <span className="flex-1 text-left">{opt.label}</span>
                {active ? <Icon name="check" size={15} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
