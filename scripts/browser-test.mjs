// End-to-end browser test for FocusFlow, driven over the Chrome DevTools
// Protocol with zero dependencies (Node 22+ has a global WebSocket).
//
// Usage:
//   1. Start the dev server:  npm run dev -- --port 5199 --strictPort
//   2. Run:                   node scripts/browser-test.mjs
//
// Exercises: task CRUD, active-task selection, timer start -> session
// completion (sound + notification + IndexedDB persistence + task tracking),
// floating timer, custom sound upload/preview, theme toggle, and persistence
// across a page reload.
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEBUG_PORT = 9333;
const APP_URL = 'http://127.0.0.1:5199/';
const PROFILE = '/tmp/focusflow-cdp-profile';

// Start from a clean slate every run (fresh localStorage + IndexedDB).
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
let ws = null;
let msgId = 0;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (res.exceptionDetails) {
    const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
    throw new Error(`evaluate failed: ${desc}`);
  }
  return res.result?.value;
}

async function waitFor(label, expression, timeoutMs = 12000) {
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
  const extra = firstError ? ` (first eval error: ${firstError.message})` : '';
  throw new Error(`timeout waiting for: ${label}${extra}`);
}

async function clickButtonByText(text) {
  return evaluate(`(() => {
    const el = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(text)}));
    if (!el) return false;
    el.click();
    return true;
  })()`);
}

async function clickLinkByHref(href) {
  return evaluate(`(() => {
    const el = document.querySelector('nav[aria-label="Primary"] a[href=${JSON.stringify(href)}]');
    if (!el) return false;
    el.click();
    return true;
  })()`);
}

async function setInput(selector, value) {
  return evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
}

async function selectOption(selector, text) {
  return evaluate(`(() => {
    const sel = document.querySelector(${JSON.stringify(selector)});
    if (!sel) return false;
    const opt = [...sel.options].find((o) => o.textContent.includes(${JSON.stringify(text)}));
    if (!opt) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, opt.value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return opt.value;
  })()`);
}

async function connect() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page' && t.url.startsWith(APP_URL));
      if (page) {
        ws = await new Promise((resolve, reject) => {
          const socket = new WebSocket(page.webSocketDebuggerUrl);
          socket.onopen = () => resolve(socket);
          socket.onerror = (e) => reject(e);
        });
        ws.onmessage = (e) => {
          const msg = JSON.parse(e.data);
          if (msg.id && pending.has(msg.id)) {
            const { resolve, reject } = pending.get(msg.id);
            pending.delete(msg.id);
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
  throw new Error('Could not connect to the app target');
}

async function closeChrome() {
  try {
    const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json();
    const browser = await new Promise((resolve, reject) => {
      const s = new WebSocket(webSocketDebuggerUrl);
      s.onopen = () => resolve(s);
      s.onerror = () => reject(new Error('ws error'));
    });
    browser.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
    await sleep(800);
  } catch {
    // ignore
  }
  if (chrome) {
    chrome.kill('SIGTERM');
  }
}

async function injectPatches() {
  await evaluate(`(() => {
    // 1) Controllable clock
    window.__timeOffset = 0;
    const realNow = Date.now.bind(Date);
    Date.now = () => realNow() + window.__timeOffset;

    // 2) Count AudioContext creations (built-in sounds)
    window.__audioCtxCreated = 0;
    const RealAC = window.AudioContext || window.webkitAudioContext;
    if (RealAC) {
      window.AudioContext = function (...args) {
        window.__audioCtxCreated += 1;
        try { return new RealAC(...args); } catch { return null; }
      };
      window.AudioContext.prototype = RealAC.prototype;
    }

    // 3) Fake Notification API (record calls, fake 'granted' permission)
    window.__notifications = [];
    const RealNotification = window.Notification;
    window.Notification = function (title, opts) {
      window.__notifications.push({ title, body: opts && opts.body });
      this.close = () => {};
    };
    window.Notification.prototype = RealNotification ? RealNotification.prototype : {};
    Object.defineProperty(window.Notification, 'permission', { get: () => 'granted' });

    // 4) Fake <audio> element (custom sounds)
    window.__audioPlays = 0;
    window.Audio = function () {
      this.play = () => { window.__audioPlays += 1; return Promise.resolve(); };
    };
    return true;
  })()`);
}

async function idbSessions() {
  return evaluate(`(async () => {
    const open = indexedDB.open('focusflow-db');
    const db = await new Promise((res, rej) => { open.onsuccess = () => res(open.result); open.onerror = () => rej(open.error); });
    const tx = db.transaction('sessions', 'readonly');
    return await new Promise((res) => {
      const r = tx.objectStore('sessions').getAll();
      r.onsuccess = () => res(r.result);
    });
  })()`);
}

async function storedTasks() {
  return evaluate(`JSON.parse(localStorage.getItem('focusflow:tasks') || '[]')`);
}

// ---------------------------------------------------------------------------

async function main() {
  chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${PROFILE}`,
      '--no-first-run',
      '--no-default-browser-check',
      APP_URL,
    ],
    { stdio: 'ignore' }
  );

  await connect();
  await send('Page.enable');
  await send('Runtime.enable');

  section('App boot');
  await waitFor('app renders', `document.body.textContent.includes(':') && document.body.textContent.includes('Start')`);
  check('home page renders timer + Start', true);

  await injectPatches();
  check('test patches injected', (await evaluate('true')) === true);

  section('Task CRUD');
  await clickLinkByHref('/tasks');
  await waitFor('tasks page', `document.body.textContent.includes('New task')`);

  // Create "Write report" (default 25 min)
  await clickButtonByText('New task');
  await waitFor('task modal', `!!document.querySelector('input[placeholder="e.g. Write project proposal"]')`);
  await setInput('input[placeholder="e.g. Write project proposal"]', 'Write report');
  await clickButtonByText('Add task');
  await waitFor('task created', `document.body.textContent.includes('Write report')`);
  check('task created via modal', true);

  // Edit it
  await evaluate(`document.querySelector('button[aria-label^="Edit"]').click()`);
  await waitFor('edit modal', `!!document.querySelector('input[placeholder="e.g. Write project proposal"]')`);
  await setInput('input[placeholder="e.g. Write project proposal"]', 'Write report v2');
  await clickButtonByText('Save changes');
  await waitFor('task renamed', `document.body.textContent.includes('Write report v2')`);
  check('task edited via modal', true);

  // Create "Quick win" with a 5-minute custom duration
  await clickButtonByText('New task');
  await waitFor('task modal 2', `!!document.querySelector('input[placeholder="e.g. Write project proposal"]')`);
  await setInput('input[placeholder="e.g. Write project proposal"]', 'Quick win');
  await setInput('input[type="number"]', '5');
  await clickButtonByText('Add task');
  await waitFor('task created 2', `document.body.textContent.includes('Quick win')`);
  const quickWin = (await storedTasks()).find((t) => t.name === 'Quick win');
  check('task with custom 5 min duration saved', !!quickWin && quickWin.durationMinutes === 5, JSON.stringify(quickWin));

  section('Timer completion (sound + notification + session saved)');
  await clickLinkByHref('/');
  await waitFor('focus page', `document.body.textContent.includes('Timer preset')`);

  const taskId = await selectOption('select[aria-label="Current task"]', 'Quick win');
  check('active task selected', !!taskId, taskId);
  await waitFor('task shown with timer', `document.body.textContent.includes('Focusing on Quick win')`);

  await clickButtonByText('Start');
  await waitFor('timer running', `[...document.querySelectorAll('button')].some((b) => b.textContent.includes('Pause'))`);
  check('timer started (Pause visible)', true);

  // The timer runs the Classic 25-minute preset. Fast-forward 25 minutes + buffer;
  // the next 1s tick completes the session.
  await evaluate(`window.__timeOffset = 25 * 60 * 1000 + 2000; true`);
  await waitFor('session persisted to IndexedDB', `(async () => { const s = await (async () => {
    const open = indexedDB.open('focusflow-db');
    const db = await new Promise((res, rej) => { open.onsuccess = () => res(open.result); open.onerror = () => rej(open.error); });
    const tx = db.transaction('sessions', 'readonly');
    return await new Promise((res) => { const r = tx.objectStore('sessions').getAll(); r.onsuccess = () => res(r.result); });
  })(); return s.length >= 1; })()`, 15000);

  const sessions = await idbSessions();
  const session = sessions[0];
  check(
    'session recorded with mode=duration=task',
    session.mode === 'focus' && session.durationSeconds === 1500 && session.taskId === taskId,
    JSON.stringify({ mode: session.mode, durationSeconds: session.durationSeconds, taskId: session.taskId })
  );
  check('notification shown on completion', (await evaluate('window.__notifications.length')) >= 1, JSON.stringify(await evaluate('window.__notifications')));
  check('built-in sound played (AudioContext created)', (await evaluate('window.__audioCtxCreated')) >= 1, `created=${await evaluate('window.__audioCtxCreated')}`);

  const tasksAfter = await storedTasks();
  const quickWinAfter = tasksAfter.find((t) => t.id === quickWin.id);
  // A 25-minute session exceeds the task's 5-minute target, so it auto-completes.
  check(
    'task tracking: sessions + focused time + auto-complete',
    quickWinAfter && quickWinAfter.completedSessions === 1 && quickWinAfter.focusedSeconds === 1500 && quickWinAfter.completed === true,
    JSON.stringify({ completedSessions: quickWinAfter?.completedSessions, focusedSeconds: quickWinAfter?.focusedSeconds, completed: quickWinAfter?.completed })
  );

  await waitFor('timer switched to break', `document.title.includes('Short Break')`);
  check('timer auto-switched to Short Break', true, await evaluate('document.title'));
  check('streak pill shows 1 day', (await evaluate(`document.querySelector('button[aria-label^="View your streak"]').textContent.includes('1')`)) === true);

  section('Floating timer');
  await evaluate(`window.__timeOffset = 0; true`); // back to real time
  await evaluate(`([...document.querySelectorAll('[role="tablist"] button')].find((b) => b.textContent.trim() === 'Focus')).click()`);
  await waitFor('focus mode reset', `document.title.startsWith('25:00')`);
  await clickButtonByText('Start');
  await waitFor('running again', `[...document.querySelectorAll('button')].some((b) => b.textContent.includes('Pause'))`);
  await clickLinkByHref('/tasks');
  await waitFor('floating timer visible', `!!document.querySelector('button[aria-label^="Timer:"]')`);
  await sleep(1600); // let some time elapse before pausing
  const pillLabel = await evaluate(`document.querySelector('button[aria-label^="Timer:"]').getAttribute('aria-label')`);
  check('floating timer shows mode + task + time', pillLabel.includes('Focus') && pillLabel.includes('Quick win') && /\d:\d\d/.test(pillLabel), pillLabel);

  await evaluate(`document.querySelector('button[aria-label^="Timer:"] [role="button"]').click()`); // pause via pill
  await sleep(400); // let the pause dispatch settle
  const afterPause = await evaluate(`({
    path: location.pathname,
    pill: !!document.querySelector('button[aria-label^="Timer:"]'),
    label: document.querySelector('button[aria-label^="Timer:"]')?.getAttribute('aria-label') || null,
  })`);
  await sleep(2500);
  const timeAfter = await evaluate(`document.querySelector('button[aria-label^="Timer:"]')?.getAttribute('aria-label') || null`);
  check('pause via floating timer freezes countdown', afterPause.pill && afterPause.label === timeAfter, `${afterPause.label} -> ${timeAfter} (path=${afterPause.path})`);

  section('Custom sound upload + preview');
  await clickLinkByHref('/settings');
  await waitFor('settings page', `document.body.textContent.includes('Upload sound')`);
  const uploadOk = await evaluate(`(async () => {
    const sampleRate = 8000, numSamples = sampleRate * 0.2;
    const buf = new ArrayBuffer(44 + numSamples * 2);
    const dv = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); dv.setUint32(4, 36 + numSamples * 2, true); w(8, 'WAVE');
    w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, sampleRate, true); dv.setUint32(28, sampleRate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    w(36, 'data'); dv.setUint32(40, numSamples * 2, true);
    for (let i = 0; i < numSamples; i++) dv.setInt16(44 + i * 2, 0, true);
    const file = new File([new Blob([buf], { type: 'audio/wav' })], 'test-tone.wav', { type: 'audio/wav' });
    const input = document.querySelector('input[type="file"]');
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  check('custom sound uploaded', uploadOk === true);
  await waitFor('custom sound listed', `document.body.textContent.includes('test-tone.wav')`);
  await evaluate(`document.querySelector('button[aria-label^="Preview test-tone.wav"]').click()`);
  await sleep(300);
  check('custom sound preview plays (Audio element)', (await evaluate('window.__audioPlays')) >= 1, `plays=${await evaluate('window.__audioPlays')}`);

  // Select the custom sound, then switch back to a built-in for the theme test
  await evaluate(`([...document.querySelectorAll('button')].find((b) => b.textContent.includes('test-tone.wav'))).click()`);
  await sleep(200);
  check('custom sound selected', (await evaluate(`JSON.parse(localStorage.getItem('focusflow:settings')).selectedSound.startsWith('custom:')`)) === true);
  await evaluate(`([...document.querySelectorAll('button')].find((b) => b.textContent.includes('Digital Bell'))).click()`);

  section('Theme (dark)');
  await evaluate(`document.querySelector('button[aria-label="Change theme"]').click()`);
  await waitFor('theme menu open', `document.body.textContent.includes('System')`);
  await evaluate(`([...document.querySelectorAll('[role="menuitemradio"]')].find((b) => b.textContent.includes('Dark'))).click()`);
  await waitFor('dark class applied', `document.documentElement.classList.contains('dark')`);
  check('dark theme applied', true);
  check('theme persisted', (await evaluate(`localStorage.getItem('focusflow:theme')`)) === '"dark"');

  section('Persistence across reload');
  await send('Page.navigate', { url: APP_URL });
  await waitFor('app re-rendered', `document.body.textContent.includes('Timer preset') && [...document.querySelectorAll('button')].some((b) => /Start|Resume/.test(b.textContent))`);
  check('dark theme survives reload', (await evaluate(`document.documentElement.classList.contains('dark')`)) === true);
  check('sessions survive reload (IndexedDB)', (await idbSessions()).length === 1);
  check('tasks survive reload', (await storedTasks()).length === 2);
  check('streak survives reload', (await evaluate(`document.querySelector('button[aria-label^="View your streak"]').textContent.includes('1')`)) === true);

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
