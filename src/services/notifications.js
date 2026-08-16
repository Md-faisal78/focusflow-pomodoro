/**
 * Browser notifications. Wraps the Notifications API and clearly exposes the
 * permission state so the UI can explain it to the user.
 */

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** 'granted' | 'denied' | 'default' | 'unsupported' */
export function getNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return getNotificationPermission();
  }
}

export function showNotification({ title, body, icon = '/icons/icon-192.png' }) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false;
  try {
    const n = new Notification(title, {
      body,
      icon,
      badge: '/icons/icon-192.png',
      tag: 'focusflow-session',
      // The app plays its own selected sound — don't double up with the OS one.
      silent: true,
    });
    window.setTimeout(() => n.close(), 10_000);
    return true;
  } catch {
    return false;
  }
}

/** Plain-language explanation of the current permission state. */
export function permissionExplanation(permission) {
  switch (permission) {
    case 'granted':
      return 'Notifications are enabled. You will be notified when a session ends.';
    case 'denied':
      return 'Permission is blocked. To receive session alerts, allow notifications for this site in your browser settings.';
    case 'default':
      return 'Permission has not been requested yet. Click the button below to enable session alerts.';
    case 'unsupported':
      return 'This browser does not support notifications.';
    default:
      return '';
  }
}
