// PWA install-flow test (production build).
//
// Verifies, against the vite preview server:
//   1. Manifest: valid JSON, correct fields, 192/512 icons (any + maskable)
//   2. Installability: Chrome reports no installability errors
//   3. Service worker: registered, activated, controlling the page
//   4. First-visit offline: a fresh profile that never reloaded can still boot
//      the app fully offline (assets precached at install time)
//   5. Cache: app shell + assets + icons present under "focusflow-v1"
//   6. Offline with data: tasks/sessions/streak survive an offline reload
//
// "Served from cache" is proven via Resource Timing (transferSize === 0).
//
// Usage:
//   npm run build && npm run preview -- --port 4180 --strictPort   (terminal 1)
//   node scripts/pwa-test.mjs                                      (terminal 2)
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEBUG_PORT = 9336;
const APP_URL = 'http://127.0.0.1:4180/';
const PROFILE = '/tmp/focusflow-cdp-pwa';

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
  const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) {
    throw new Error(`evaluate failed: ${res.exceptionDetails.exception?.description || res.exceptionDetails.text}`);
  }
  return res.result?.value;
}

async function waitFor(label, expression, timeoutMs = 20000) {
  const start = Date.now();
  let firstError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      if (await evaluate(expression)) return true;
    } catch (err) {
      if (!firstError) firstError = err;
    }
    await sleep(200);
  }
  throw new Error(`timeout waiting for: ${label}${firstError ? ` (first eval error: ${firstError.message})` : ''}`);
}

async function connect() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page' && t.url.startsWith(APP_URL));
      if (page) {
        ws = await new Promise((resolve, reject) => {
          const s = new WebSocket(page.webSocketDebuggerUrl);
          s.onopen = () => resolve(s);
          s.onerror = (e) => reject(e);
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
  throw new Error('Could not connect to Chrome');
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
  if (chrome) chrome.kill('SIGTERM');
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
      APP_URL,
    ],
    { stdio: 'ignore' }
  );

  await connect();
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  const clickLink = (href) =>
    evaluate(`(() => { const el = document.querySelector('nav[aria-label="Primary"] a[href=${JSON.stringify(href)}]'); if (!el) return false; el.click(); return true; })()`);
  const clickByText = (text) =>
    evaluate(`(() => { const el = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(text)})); if (!el) return false; el.click(); return true; })()`);
  const setInput = (selector, value) =>
    evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);

  section('App loads from the production build');
  await waitFor('app renders', `document.body.textContent.includes('Timer preset')`);
  check('production page rendered', true);

  section('Manifest');
  const manifestResult = await send('Page.getAppManifest');
  check('manifest fetched without errors', !manifestResult.errors || manifestResult.errors.length === 0, JSON.stringify(manifestResult.errors || []));
  const manifest = JSON.parse(manifestResult.data);
  check('manifest name', manifest.name === 'FocusFlow — Focus. Rest. Repeat.', manifest.name);
  check('manifest short_name', manifest.short_name === 'FocusFlow', manifest.short_name);
  check('manifest display standalone', manifest.display === 'standalone', manifest.display);
  check('manifest start_url', manifest.start_url === '/', manifest.start_url);
  const icons = manifest.icons || [];
  check(
    'icons: 192 + 512 any and maskable',
    icons.some((i) => i.sizes === '192x192' && i.purpose === 'any') &&
      icons.some((i) => i.sizes === '512x512' && i.purpose === 'any') &&
      icons.some((i) => i.sizes === '192x192' && i.purpose === 'maskable') &&
      icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'),
    icons.map((i) => `${i.sizes}/${i.purpose}`).join(', ')
  );

  section('Installability');
  const installability = await send('Page.getInstallabilityErrors');
  check('no installability errors', installability.installabilityErrors.length === 0, JSON.stringify(installability.installabilityErrors));

  section('Service worker lifecycle');
  await waitFor('SW ready', `(async () => { try { await navigator.serviceWorker.ready; return true; } catch { return false; } })()`);
  const reg = await evaluate(`(async () => { const r = await navigator.serviceWorker.getRegistration(); return r ? { scope: r.scope, state: r.active && r.active.state } : null; })()`);
  check('SW registered with active state', reg && reg.state === 'activated', JSON.stringify(reg));

  section('First-visit offline (the install scenario)');
  // Go offline after only ONE online load — the case where a user installs on
  // their first visit, then opens the app with no network.
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await send('Page.reload');
  await waitFor('app renders offline on first visit', `document.body.textContent.includes('Timer preset')`);
  check('app boots fully offline after a single visit', true);
  const firstVisitAssets = await evaluate(`(() => {
    const entries = performance.getEntriesByType('resource').filter((r) => r.name.includes('/assets/'));
    return { count: entries.length, allFromCache: entries.length > 0 && entries.every((e) => e.transferSize === 0) };
  })()`);
  check(
    'JS/CSS served from service-worker cache (transferSize 0)',
    firstVisitAssets.allFromCache === true,
    JSON.stringify(firstVisitAssets)
  );
  section('Back online: precache contents');
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await send('Page.reload');
  await waitFor('app re-rendered online', `document.body.textContent.includes('Timer preset')`);
  await waitFor('SW controlling page', `!!navigator.serviceWorker.controller`);
  check('page controlled by service worker', true, await evaluate(`navigator.serviceWorker.controller.scriptURL`));

  const asset = await evaluate(`(async () => {
    const html = await (await fetch(location.href)).text();
    return (html.match(/\\/assets\\/[^"']+\\.js/) || [])[0];
  })()`);
  await waitFor('JS bundle cached', `(async () => { const c = await caches.open('focusflow-v1'); return !!(await c.match(${JSON.stringify(asset)})); })()`);
  const cacheInfo = await evaluate(`(async () => {
    const names = await caches.keys();
    const cache = await caches.open('focusflow-v1');
    return {
      names,
      shell: !!(await cache.match('/')),
      manifestCached: !!(await cache.match('/manifest.webmanifest')),
      iconCached: !!(await cache.match('/icons/icon-192.png')),
      maskableIconCached: !!(await cache.match('/icons/maskable-512.png')),
      assetCached: !!(await cache.match(${JSON.stringify(asset)})),
    };
  })()`);
  check('cache "focusflow-v1" exists', cacheInfo.names.includes('focusflow-v1'), JSON.stringify(cacheInfo.names));
  check('app shell (/) cached', cacheInfo.shell === true);
  check('manifest cached', cacheInfo.manifestCached === true);
  check('icon cached', cacheInfo.iconCached === true);
  check('maskable icon cached', cacheInfo.maskableIconCached === true);
  check('JS bundle cached', cacheInfo.assetCached === true, asset);

  section('Seed data before going offline');
  await clickLink('/tasks');
  await waitFor('tasks page', `document.body.textContent.includes('New task')`);
  await clickByText('New task');
  await waitFor('task modal', `!!document.querySelector('input[placeholder="e.g. Write project proposal"]')`);
  await setInput('input[placeholder="e.g. Write project proposal"]', 'Offline draft');
  await clickByText('Add task');
  await waitFor('task created', `document.body.textContent.includes('Offline draft')`);
  check('task "Offline draft" created', true);

  await clickLink('/');
  await waitFor('focus page', `document.body.textContent.includes('Timer preset')`);
  await evaluate(`(() => {
    window.__timeOffset = 0;
    const realNow = Date.now.bind(Date);
    Date.now = () => realNow() + window.__timeOffset;
    return true;
  })()`);
  await clickByText('Start');
  await waitFor('timer running', `[...document.querySelectorAll('button')].some((b) => b.textContent.includes('Pause'))`);
  await evaluate(`window.__timeOffset = 25 * 60 * 1000 + 2000; true`);
  await waitFor('session completed', `document.title.includes('Short Break')`, 15000);
  check('focus session completed', true);

  section('Offline reload with local data');
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await send('Page.reload');
  await waitFor('app renders offline', `document.body.textContent.includes('Timer preset')`);
  check('app shell rendered while offline', true);
  const offlineAssets = await evaluate(`(() => {
    const entries = performance.getEntriesByType('resource').filter((r) => r.name.includes('/assets/'));
    return entries.length > 0 && entries.every((e) => e.transferSize === 0);
  })()`);
  check('assets again served from cache while offline', offlineAssets === true);

  check('offline: task still listed', (await evaluate(`document.body.textContent.includes('Offline draft')`)) === true);
  const offlineState = await evaluate(`(async () => {
    const tasks = JSON.parse(localStorage.getItem('focusflow:tasks') || '[]');
    const open = indexedDB.open('focusflow-db');
    const db = await new Promise((res, rej) => { open.onsuccess = () => res(open.result); open.onerror = () => rej(open.error); });
    const tx = db.transaction('sessions', 'readonly');
    const sessions = await new Promise((res) => { const r = tx.objectStore('sessions').getAll(); r.onsuccess = () => res(r.result); });
    return { taskCount: tasks.length, taskName: tasks[0] && tasks[0].name, sessionCount: sessions.length };
  })()`);
  check(
    'offline: tasks + sessions intact (localStorage + IndexedDB)',
    offlineState.taskCount === 1 && offlineState.taskName === 'Offline draft' && offlineState.sessionCount === 1,
    JSON.stringify(offlineState)
  );
  check(
    'offline: streak still shown',
    (await evaluate(`document.querySelector('button[aria-label^="View your streak"]').textContent.includes('1')`)) === true
  );

  await clickLink('/tasks');
  await waitFor('tasks page offline', `document.body.textContent.includes('New task')`);
  check('offline: /tasks route renders from cache', (await evaluate(`document.body.textContent.includes('Offline draft')`)) === true);

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
