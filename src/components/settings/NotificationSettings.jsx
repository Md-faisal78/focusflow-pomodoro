import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useApp } from '../../store/AppContext.jsx';
import {
  getNotificationPermission,
  permissionExplanation,
  requestNotificationPermission,
  notificationsSupported,
} from '../../services/notifications.js';
import Button from '../ui/Button.jsx';
import Toggle from '../ui/Toggle.jsx';
import Icon from '../ui/Icon.jsx';

const STATUS_STYLES = {
  granted: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300',
  denied: 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300',
  default: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300',
  unsupported: 'border-soft-hairline bg-secondary text-ink-secondary dark:border-night-hairline dark:bg-night-card2 dark:text-night-secondary',
};

export default function NotificationSettings() {
  const { state, actions } = useApp();
  const [permission, setPermission] = useState(getNotificationPermission());

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const supported = notificationsSupported();
  const enabled = state.settings.notificationEnabled && permission === 'granted';

  async function handleRequest() {
    const result = await requestNotificationPermission();
    setPermission(result);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-ink dark:text-white">Session notifications</p>
          <p className="text-sm text-ink-muted dark:text-night-muted">
            Show a browser notification when a session ends (when supported).
          </p>
        </div>
        <Toggle
          checked={state.settings.notificationEnabled}
          onChange={(v) => actions.setSetting({ notificationEnabled: v })}
          label="Session notifications"
          disabled={!supported}
        />
      </div>

      <div className={clsx('rounded-xl border p-4', STATUS_STYLES[permission] || STATUS_STYLES.unsupported)}>
        <div className="flex items-start gap-3">
          <Icon name={permission === 'granted' ? 'check' : permission === 'denied' ? 'x' : 'info'} size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Permission: {permission === 'granted' ? 'Granted' : permission === 'denied' ? 'Blocked' : permission === 'default' ? 'Not requested' : 'Unsupported'}
            </p>
            <p className="mt-0.5 text-sm opacity-90">{permissionExplanation(permission)}</p>
            {permission === 'default' && supported ? (
              <Button variant="secondary" className="mt-3" onClick={handleRequest}>
                <Icon name="bell" size={16} />
                Enable notifications
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <p className={clsx('text-sm font-medium', enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-muted dark:text-night-muted')}>
        {enabled
          ? 'Notifications are on — you will be alerted when a session completes.'
          : 'Notifications are off. Enable them above to get session alerts.'}
      </p>
    </div>
  );
}
