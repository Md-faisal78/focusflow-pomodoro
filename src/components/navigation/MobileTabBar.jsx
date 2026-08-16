import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '../ui/Icon.jsx';

const TABS = [
  { to: '/', label: 'Focus', icon: 'timer', end: true },
  { to: '/tasks', label: 'Tasks', icon: 'list' },
  { to: '/statistics', label: 'Stats', icon: 'chart' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export default function MobileTabBar() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-soft-hairline bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-night-hairline dark:bg-night/95"
    >
      <div className="grid grid-cols-4">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition ${
                isActive
                  ? 'text-accent dark:text-accent-light'
                  : 'text-ink-muted hover:text-ink-secondary dark:text-night-muted dark:hover:text-night-secondary'
              }`
            }
          >
            <Icon name={tab.icon} size={20} />
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
