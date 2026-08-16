// Real-browser notification permission flow test.
//
// Launches a HEADED Chrome window (so the real Notification API and OS toasts
// work) and drives it over the DevTools Protocol. Permission state transitions
// are performed with the browser-level Browser.setPermission command — the same
// outcome as a user clicking "Allow"/"Block" on the native prompt (the prompt
// itself is Chrome's UI and cannot be clicked programmatically).
//
// Flow verified:
//   1. Fresh profile -> Settings shows "Permission: Not requested" + button
//   2. Grant -> clicking "Enable notifications" -> "Granted" state + message
//   3. Completing a focus session dispatches a REAL Notification (OS toast)
//   4. Granted state persists across a page reload
//   5. Toggling "Session notifications" off suppresses the notification
//   6. Denying permission -> "Blocked" state with explanation; no notification
//
// Usage:
//   npm run dev -- --port 5199 --strictPort   (terminal 1)
//   node scripts/notification-test.mjs        (terminal 2)
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEBUG_PORT = 9335;
const APP_URL = 'http://127.0.0.1:5199/';
const ORIGIN = 'http://127.0.0.1:5199';
const PROFILE = '/tmp/focusflow-cdp-notif';

rmSync(PROFILE, { recursive: true, force: true });

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}
function section(name) {
  console.log(`\n== ${name} ==`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let chrome = null;
let pageWs = null;
let browserWs = null;
let pageId = 0;
let browserId = 0;
const pagePending = new Map();
const browserPending = new Map();

function makeClient(socket, pending, counter) {
  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++counter.value;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
}

function makeEvaluate(sendCmd) {
  return async (expression) => {
    const res = await sendCmd('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) {
      throw new Error(`evaluate failed: ${res.exceptionDetails.exception?.description || res.exceptionDetails.text}`);
    }
    return res.result?.value;
  };
}

async function openSocket(url) {
  return new Promise((resolve, reject) => {
    const s = new WebSocket(url);
    s.onopen = () => resolve(s);
    s.onerror = (e) => reject(e);
  });
}

async function connect() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page' && t.url.startsWith(APP_URL));
      if (page) {
        pageWs = await openSocket(page.webSocketDebuggerUrl);
        pageWs.onmessage = (e) => {
          const msg = JSON.parse(e.data);
          if (msg.id && pagePending.has(msg.id)) {
            const { resolve, reject } = pagePending.get(msg.id);
            pagePending.delete(msg.id);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          }
        };
        const version = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json();
        browserWs = await openSocket(version.webSocketDebuggerUrl);
        browserWs.onmessage = (e) => {
          const msg = JSON.parse(e.data);
          if (msg.id && browserPending.has(msg.id)) {
            const { resolve, reject } = browserPending.get(msg.id);
            browserPending.delete(msg.id);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          }
        };
        return;
      }
    } catch {
      // retry
    }
    await sleep(300);
  }
  throw new Error('Could not connect to Chrome');
}

async function closeChrome() {
  try {
    if (browserWs) {
      browserWs.send(JSON.stringify({ id: 999, method: 'Browser.close' }));
      await sleep(800);
    }
  } catch {
    // ignore
  }
  if (chrome) chrome.kill('SIGTERM');
}

// ---------------------------------------------------------------------------

async function main() {
  chrome = spawn(
    CHROME,
    [
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${PROFILE}`,
      '--no-first-run',
      '--no-default-browser-check',
      APP_URL,
    ],
    { stdio: 'ignore' }
  );

  await connect();
  const sendPage = makeClient(pageWs, pagePending, { value: pageId });
  const sendBrowser = makeClient(browserWs, browserPending, { value: browserId });
  const evaluate = makeEvaluate(sendPage);
  pageId = 0;
  browserId = 0;

  const waitFor = async (label, expression, timeoutMs = 15000) => {
    const start = Date.now();
    let firstError = null;
    while (Date.now() - start < timeoutMs) {
      try {
        if (await evaluate(expression)) return true;
      } catch (err) {
        if (!firstError) firstError = err;
      }
      await sleep(150);
    }
    throw new Error(`timeout waiting for: ${label}${firstError ? ` (first eval error: ${firstError.message})` : ''}`);
  };

  const clickByText = (text) =>
    evaluate(`(() => { const el = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(text)})); if (!el) return false; el.click(); return true; })()`);

  const clickLink = (href) =>
    evaluate(`(() => { const el = document.querySelector('nav[aria-label="Primary"] a[href=${JSON.stringify(href)}]'); if (!el) return false; el.click(); return true; })()`);

  const patchClockAndNotification = () =>
    evaluate(`(() => {
      window.__timeOffset = 0;
      const realNow = Date.now.bind(Date);
      Date.now = () => realNow() + window.__timeOffset;
      window.__sent = [];
      const Real = window.Notification;
      window.Notification = function (title, opts) {
        window.__sent.push({ title, body: opts && opts.body });
        return new Real(title, opts);
      };
      window.Notification.prototype = Real.prototype;
      Object.defineProperty(window.Notification, 'permission', { get: () => Real.permission });
      return true;
    })()`);

  const completeSession = async () => {
    await clickByText('Start');
    await waitFor('timer running', `[...document.querySelectorAll('button')].some((b) => b.textContent.includes('Pause'))`);
    await evaluate(`window.__timeOffset = 25 * 60 * 1000 + 2000; true`);
    await waitFor('session completed', `document.title.includes('Short Break')`, 15000);
  };

  section('Boot + default permission state');
  await waitFor('app renders', `document.body.textContent.includes('Timer preset')`);
  await clickLink('/settings');
  await waitFor('settings page', `document.body.textContent.includes('Permission:')`);
  const defaultState = await evaluate(`document.body.textContent.includes('Not requested') && [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Enable notifications'))`);
  check('fresh profile shows "Not requested" + Enable button', defaultState === true);

  section('Grant permission (simulates clicking "Allow")');
  await sendBrowser('Browser.setPermission', {
    permission: { name: 'notifications' },
    setting: 'granted',
    origin: ORIGIN,
  });
  await clickByText('Enable notifications');
  await waitFor('permission granted', `document.body.textContent.includes('Permission: Granted')`);
  check('UI shows Granted after request', true);
  check(
    'success message shown',
    (await evaluate(`document.body.textContent.includes('Notifications are on')`)) === true
  );

  section('Real notification on session completion');
  await patchClockAndNotification();
  check('real Notification.permission is granted', (await evaluate(`window.Notification.permission`)) === 'granted');
  await clickLink('/');
  await waitFor('focus page', `document.body.textContent.includes('Timer preset')`);
  await completeSession();
  const sent = await evaluate(`window.__sent`);
  check(
    'a real OS notification was dispatched',
    sent.length === 1 && sent[0].title === 'Focus session complete!',
    JSON.stringify(sent)
  );

  section('Granted state persists across reload');
  await sendPage('Page.navigate', { url: APP_URL });
  await waitFor('app re-rendered', `document.body.textContent.includes('Timer preset')`);
  await clickLink('/settings');
  await waitFor('settings rendered', `document.body.textContent.includes('Permission:')`);
  check(
    'permission still Granted after reload',
    (await evaluate(`document.body.textContent.includes('Permission: Granted')`)) === true
  );

  section('Notification toggle off suppresses the toast');
  await patchClockAndNotification();
  await evaluate(`document.querySelector('button[role="switch"][aria-label="Session notifications"]').click()`);
  await waitFor('notifications disabled message', `document.body.textContent.includes('Notifications are off')`);
  await clickLink('/');
  await waitFor('focus page 2', `document.body.textContent.includes('Timer preset')`);
  await completeSession();
  check(
    'no notification dispatched while disabled',
    (await evaluate(`window.__sent.length`)) === 0,
    `sent=${await evaluate('window.__sent.length')}`
  );

  section('Denied permission shows Blocked state and suppresses the toast');
  await sendBrowser('Browser.setPermission', {
    permission: { name: 'notifications' },
    setting: 'denied',
    origin: ORIGIN,
  });
  await sendPage('Page.navigate', { url: APP_URL });
  await waitFor('app re-rendered 2', `document.body.textContent.includes('Timer preset')`);
  await clickLink('/settings');
  await waitFor('blocked state', `document.body.textContent.includes('Permission: Blocked')`);
  check(
    'denied state explained',
    (await evaluate(`document.body.textContent.includes('Permission is blocked')`)) === true
  );
  check(
    'Enable button hidden when blocked',
    (await evaluate(`[...document.querySelectorAll('button')].some((b) => b.textContent.includes('Enable notifications'))`)) === false
  );
  await patchClockAndNotification();
  await clickLink('/');
  await waitFor('focus page 3', `document.body.textContent.includes('Timer preset')`);
  await completeSession();
  check(
    'no notification dispatched while denied',
    (await evaluate(`window.__sent.length`)) === 0,
    `sent=${await evaluate('window.__sent.length')}`
  );

  section('Summary');
  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
}

main()
  .catch((err) => {
    console.error('TEST ERROR:', err.message);
    failures += 1;
  })
  .finally(async () => {
    await closeChrome();
    process.exit(failures === 0 ? 0 : 1);
  });
