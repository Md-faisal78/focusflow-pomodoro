// Redesign verification: warm neutral + red accent system.
//  - Contrast sweep: every visible text node across all pages, in light AND
//    dark mode, measured against its effective background (WCAG contrast).
//    Flags anything below 3:1 (catches dark-on-dark / light-on-light).
//  - Accent color is applied to the primary Start button.
//  - Top-right nav order: Streak → Theme → Settings.
//  - Floating timer: minimize to a compact pill, expand back, task/preset shown.
//  - Home heatmap heading "Your Focus Activity".
//  - Streak button navigates to Statistics (no modal), heatmap + summary there.
//  - Mode tabs: Focus | Break with Short/Long chooser.
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEBUG_PORT = 9340;
const APP_URL = 'http://127.0.0.1:5199/';
const PROFILE = '/tmp/focusflow-cdp-redesign';

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
  while (Date.now() - start < timeoutMs) {
    try {
      if (await evaluate(expression)) return true;
    } catch {
      // retry
    }
    await sleep(150);
  }
  throw new Error(`timeout waiting for: ${label}`);
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
          s.onerror = () => reject(new Error('ws error'));
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

// ---- contrast helpers (Node side) ------------------------------------------
function parseRgb(str) {
  const m = String(str).match(/(\d+(?:\.\d+)?)/g);
  if (!m || m.length < 3) return null;
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}
function luminance([r, g, b]) {
  const lin = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contrast(fgStr, bgArr) {
  const fg = parseRgb(fgStr);
  if (!fg || !bgArr) return null;
  const l1 = luminance(fg);
  const l2 = luminance(bgArr);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

const SWEEP_SNIPPET = `(() => {
  const blend = (dst, src) => {
    const a = src[3];
    return [
      Math.round(src[0] * a + dst[0] * (1 - a)),
      Math.round(src[1] * a + dst[1] * (1 - a)),
      Math.round(src[2] * a + dst[2] * (1 - a)),
    ];
  };
  const parse = (c) => {
    const m = String(c).match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(',').map((s) => parseFloat(s.trim()));
    return [p[0], p[1], p[2], p.length === 4 ? p[3] : 1];
  };
  const effBg = (el) => {
    // Collect layers from the element (top) up to the body (bottom), then
    // composite bottom-up so opaque ancestors don't overwrite the element's
    // own background.
    const layers = [];
    let node = el;
    while (node && node !== document.documentElement) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c[3] > 0) layers.push(c);
      node = node.parentElement;
    }
    let out = [255, 255, 255];
    for (let i = layers.length - 1; i >= 0; i--) out = blend(out, layers[i]);
    return out;
  };
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.textContent.trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    out.push({ text: t.slice(0, 26), color: cs.color, bg: effBg(el) });
  }
  return out;
})()`;

async function sweepPage(theme) {
  await evaluate(`document.documentElement.classList.toggle('dark', ${theme === 'dark'})`);
  await sleep(250);
  const nodes = await evaluate(SWEEP_SNIPPET);
  const bad = [];
  for (const node of nodes) {
    const ratio = contrast(node.color, node.bg);
    if (ratio === null) continue;
    if (ratio < 3) {
      bad.push({ text: node.text, ratio: ratio.toFixed(2), color: node.color, bg: node.bg });
    }
  }
  return bad;
}

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
  await waitFor('app renders', `document.body.textContent.includes('Timer preset')`);

  const PAGES = [
    ['Focus', APP_URL, `document.body.textContent.includes('Timer preset')`],
    ['Tasks', APP_URL + 'tasks', `document.body.textContent.includes('Tasks')`],
    ['Statistics', APP_URL + 'statistics', `document.body.textContent.includes('Activity calendar')`],
    ['Settings', APP_URL + 'settings', `document.body.textContent.includes('Timer preferences')`],
  ];

  section('Contrast sweep (light)');
  for (const [name, url, ready] of PAGES) {
    await send('Page.navigate', { url });
    await waitFor(`${name} page`, ready);
    const bad = await sweepPage('light');
    check(`${name} page: no text below 3:1 contrast`, bad.length === 0, bad.slice(0, 4).map((b) => `"${b.text}" ${b.ratio}:1`).join(' | '));
  }

  section('Contrast sweep (dark)');
  for (const [name, url, ready] of PAGES) {
    await send('Page.navigate', { url });
    await waitFor(`${name} page`, ready);
    const bad = await sweepPage('dark');
    check(`${name} page: no text below 3:1 contrast`, bad.length === 0, bad.slice(0, 4).map((b) => `"${b.text}" ${b.ratio}:1 (${b.color} on ${b.bg})`).join(' | '));
  }

  section('Accent + navigation');
  await send('Page.navigate', { url: APP_URL });
  await waitFor('focus page', `document.body.textContent.includes('Timer preset')`);
  const accent = await evaluate(`(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Start'));
    return btn ? getComputedStyle(btn).backgroundColor : null;
  })()`);
  check('primary Start button uses the red accent', (accent || '').includes('230, 0, 35'), accent);

  const navOrder = await evaluate(`(() => {
    const controls = [...document.querySelectorAll('header button, header a')];
    const names = controls
      .map((el) => el.getAttribute('aria-label') || el.getAttribute('title') || '')
      .filter((l) => l && (l.includes('streak') || l.toLowerCase().includes('theme') || l.toLowerCase().includes('settings')));
    return names;
  })()`);
  check(
    'top-right order: Streak → Theme → Settings',
    navOrder.length === 3 &&
      navOrder[0].toLowerCase().includes('streak') &&
      navOrder[1].toLowerCase().includes('theme') &&
      navOrder[2].toLowerCase().includes('settings'),
    JSON.stringify(navOrder)
  );

  section('Floating timer minimize');
  await evaluate(`(() => {
    const t = document.querySelector('div[role="tablist"][aria-label="Timer mode"] button');
    t.click();
    const start = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Start'));
    start.click();
  })()`);
  await sleep(400);
  // Client-side navigation keeps the running timer state (a reload would not).
  await evaluate(`document.querySelector('nav[aria-label="Primary"] a[href="/tasks"]').click()`);
  await waitFor('tasks page via nav', `document.body.textContent.includes('Each task has its own focus target')`);
  await waitFor('floating timer visible', `!!document.querySelector('button[aria-label^="Timer:"]')`);
  const pillBefore = await evaluate(`document.querySelector('button[aria-label^="Timer:"]').getAttribute('aria-label')`);
  check('floating timer shows time + preset/task', /\d:\d\d/.test(pillBefore) && !pillBefore.includes('undefined'), pillBefore);

  await evaluate(`document.querySelector('button[aria-label^="Timer:"] [aria-label="Minimize timer"]').click()`);
  await sleep(300);
  const collapsed = await evaluate(`(() => {
    const btn = document.querySelector('button[aria-label^="Timer:"]');
    return btn ? { label: btn.getAttribute('aria-label'), text: btn.textContent.trim() } : null;
  })()`);
  check('minimize collapses to a compact pill', !!collapsed && collapsed.label.includes('Expand'), JSON.stringify(collapsed));
  check('collapsed pill still shows the time', !!collapsed && /\d:\d\d/.test(collapsed.text), collapsed ? collapsed.text : '');

  await evaluate(`document.querySelector('button[aria-label^="Timer:"]').click()`);
  await sleep(300);
  const expanded = await evaluate(`!!document.querySelector('button[aria-label^="Timer:"] [aria-label="Minimize timer"]')`);
  check('clicking the pill expands it again', expanded === true);

  section('Streak navigation');
  // The streak button navigates directly to Statistics — no modal/popup.
  await evaluate(`document.querySelector('button[aria-label^="View your streak"]').click()`);
  await waitFor('navigated to statistics', `location.pathname === '/statistics'`);
  check('no popup or dialog opened', (await evaluate(`!!document.querySelector('[role="dialog"]')`)) === false);
  check('streak count still on the button', (await evaluate(`document.querySelector('button[aria-label^="View your streak"]').getAttribute('aria-label')`)).includes('0 days'));
  check('statistics page shows streak summary', (await evaluate(`document.body.textContent.includes('Current streak')`)) === true);
  check('statistics heatmap rendered', (await evaluate(`document.querySelectorAll('svg[aria-label="Focus activity heatmap"] rect').length`)) === 371);

  section('Home page');
  await evaluate(`document.querySelector('nav[aria-label="Primary"] a[href="/"]').click()`);
  await waitFor('focus page via nav', `document.body.textContent.includes('Timer preset')`);
  const home = await evaluate(`(() => {
    const h2 = [...document.querySelectorAll('h2')].find((el) => el.textContent.includes('Focus Activity'));
    return { heading: h2 ? h2.textContent.trim() : null };
  })()`);
  check('home heatmap heading is "Your Focus Activity"', home.heading === 'Your Focus Activity', home.heading);
  const hasLegend = await evaluate(`(() => {
    const svg = document.querySelector('svg[aria-label="Focus activity heatmap"]');
    const lessMore = [...document.querySelectorAll('span')].some((s) => s.textContent.trim() === 'Less');
    return { svg: !!svg, legend: lessMore };
  })()`);
  check('home heatmap renders with legend', hasLegend.svg && hasLegend.legend, JSON.stringify(hasLegend));

  section('Mode tabs');
  const tabs = await evaluate(`[...document.querySelectorAll('div[role="tablist"][aria-label="Timer mode"] button')].map((b) => b.textContent.trim())`);
  check('tabs are Focus | Break', JSON.stringify(tabs) === JSON.stringify(['Focus', 'Break']), JSON.stringify(tabs));
  await evaluate(`[...document.querySelectorAll('div[role="tablist"][aria-label="Timer mode"] button')].find((b) => b.textContent.trim() === 'Break').click()`);
  await sleep(250);
  const sub = await evaluate(`(() => {
    const el = document.querySelector('div[role="tablist"][aria-label="Break type"]');
    return el ? [...el.querySelectorAll('button')].map((b) => b.textContent.trim()) : null;
  })()`);
  check('Break tab reveals Short/Long chooser', JSON.stringify(sub) === JSON.stringify(['Short Break', 'Long Break']), JSON.stringify(sub));

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
