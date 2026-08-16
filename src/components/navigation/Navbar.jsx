import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { APP } from '../../constants/app.js';
import Icon from '../ui/Icon.jsx';
import StreakButton from './StreakButton.jsx';
import ThemeMenu from './ThemeMenu.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Focus', icon: 'timer', end: true },
  { to: '/tasks', label: 'Tasks', icon: 'list' },
  { to: '/statistics', label: 'Statistics', icon: 'chart' },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-soft-hairline bg-white/90 backdrop-blur dark:border-night-hairline dark:bg-night/90">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-extrabold tracking-tight text-ink dark:text-white">
          <img src="/icons/favicon.svg" alt="FocusFlow" width="32" height="32" className="h-8 w-8 shrink-0" draggable={false} />
          <span className="hidden sm:inline">{APP.name}</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-accent/5 text-accent dark:bg-accent/10 dark:text-accent-light'
                    : 'text-ink-secondary hover:bg-secondary dark:text-night-secondary dark:hover:bg-night-card2'
                }`
              }
            >
              <Icon name={item.icon} size={15} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Top-right order: Streak → Theme → Settings. */}
          <StreakButton />
          <ThemeMenu />
          <Link
            to="/settings"
            aria-label="Settings"
            title="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-soft-hairline bg-white text-ink-secondary transition hover:bg-secondary dark:border-night-hairline dark:bg-night-card dark:text-night-secondary dark:hover:bg-night-card2"
          >
            <Icon name="settings" size={17} />
          </Link>
        </div>
      </div>
    </header>
  );
}
