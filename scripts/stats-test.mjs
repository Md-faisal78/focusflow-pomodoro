// E2E test for the Statistics and Streak pages.
//
// Seeds session history for a fixed plan of past days directly into IndexedDB
// (plus tasks into localStorage), reloads the app, then verifies:
//   - Summary cards (total time, sessions, streak, tasks completed)
//   - Weekly chart (7 bars, correct minutes, today highlighted)
//   - Range breakdown filters (This week / This month / All time)
//   - Activity calendar (heatmap) cell counts + intensity levels
//   - Monthly totals (12 rows, correct minutes)
//   - Streak button navigation (straight to Statistics, no modal)
//   - Heatmap on the Focus page
//
// Expected values are computed with the app's own stats utilities, so the
// assertions are exact rather than hand-written numbers.
//
// Usage:
//   npm run dev -- --port 5199 --strictPort   (terminal 1)
//   node scripts/stats-test.mjs               (terminal 2)
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import {
  buildHeatmap,
  computeStreaks,
  computeTotals,
  countPerfectWeeks,
  lastNDays,
  monthlyTotals,
  rangeStats,
} from '../src/utils/stats.js';
import { addDays, dateKey } from '../src/utils/date.js';
import { formatDurationLabel, formatSeconds } from '../src/utils/time.js';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEBUG_PORT = 9337;
const APP_URL = 'http://127.0.0.1:5199/';
const PROFILE = '/tmp/focusflow-cdp-stats';

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
    await sleep(150);
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

// ---- Seed plan & expected values (computed with the app's own utilities) ----
const NOW = new Date();
// [daysAgo, numberOf25-minute-sessions]
const SEED_PLAN = [
  [0, 1],
  [1, 2],
  [2, 1],
  [4, 3],
  [5, 1],
  [6, 2],
  [8, 1],
  [40, 2],
];
const sessions = [];
let seedId = 0;
for (const [daysAgo, count] of SEED_PLAN) {
  const date = addDays(NOW, -daysAgo);
  const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0).getTime();
  for (let i = 0; i < count; i++) {
    seedId += 1;
    sessions.push({
      id: `seed-${seedId}`,
      mode: 'focus',
      durationSeconds: 1500,
      completedAt: noon,
      dateKey: dateKey(date),
      taskId: null,
    });
  }
}

const tasks = [
  { id: 't-1', name: 'Shipped report', durationMinutes: 25, completed: true, completedSessions: 2, focusedSeconds: 3000, createdAt: Date.now() - 100000, completedAt: Date.now() - 50000 },
  { id: 't-2', name: 'Writing docs', durationMinutes: 50, completed: false, completedSessions: 1, focusedSeconds: 1500, createdAt: Date.now() - 90000, completedAt: null },
];

const EXPECTED = {
  totals: computeTotals(sessions),
  streaks: computeStreaks(sessions, NOW),
  week: rangeStats(sessions, 'week', NOW),
  month: rangeStats(sessions, 'month', NOW),
  all: rangeStats(sessions, 'all', NOW),
  perfectWeeks: countPerfectWeeks(sessions, NOW),
  heatmap53: buildHeatmap(sessions, 53, NOW),
  heatmap26: buildHeatmap(sessions, 26, NOW),
  last7: lastNDays(sessions, 7, NOW),
  months: monthlyTotals(sessions, 12, NOW),
};

function levelCounts(hm) {
  const counts = { l0: 0, l1: 0, l2: 0, l3: 0, l4: 0, future: 0 };
  for (const col of hm.cols) {
    for (const day of col.days) {
      if (day.future) counts.future += 1;
      else counts[`l${day.level}`] += 1;
    }
  }
  return counts;
}
const EXPECTED_LEVELS_53 = levelCounts(EXPECTED.heatmap53);
const EXPECTED_LEVELS_26 = levelCounts(EXPECTED.heatmap26);

function fmtMin(minutes) {
  return minutes > 0 ? `${Math.round(minutes)} min` : '—';
}

// ---- Browser helpers --------------------------------------------------------
function clickLink(href) {
  return evaluate(`(() => { const el = document.querySelector('nav[aria-label="Primary"] a[href=${JSON.stringify(href)}]'); if (!el) return false; el.click(); return true; })()`);
}
function clickByText(text) {
  return evaluate(`(() => { const el = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(text)})); if (!el) return false; el.click(); return true; })()`);
}
function cardValue(label) {
  // Value <p> sits directly before its label <p>.
  return evaluate(`(() => {
    const p = [...document.querySelectorAll('p')].find((el) => el.textContent.trim().toUpperCase() === ${JSON.stringify(label.toUpperCase())});
    return p ? p.previousElementSibling.textContent.trim() : null;
  })()`);
}
function rowValue(label) {
  // RangeStats rows are <dt>label</dt><dd>value</dd>.
  return evaluate(`(() => {
    const dt = [...document.querySelectorAll('dt')].find((el) => el.textContent.trim() === ${JSON.stringify(label)});
    return dt ? dt.nextElementSibling.textContent.trim() : null;
  })()`);
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

  await waitFor('app renders', `document.body.textContent.includes('Timer preset')`);

  // The heatmap uses a light or dark palette depending on the active theme.
  const IS_DARK = (await evaluate(`document.documentElement.classList.contains('dark')`)) === true;
  const PALETTE = IS_DARK
    ? ['#262622', '#382A2C', '#553338', '#7C3A43', '#E60023']
    : ['#E9E9E4', '#F4D6D8', '#E9AAB0', '#DD7B85', '#E60023'];
  console.log(`(theme: ${IS_DARK ? 'dark' : 'light'})`);

  section('Seed session history + tasks');
  const seeded = await evaluate(`(async () => {
    const sessions = ${JSON.stringify(sessions)};
    const open = indexedDB.open('focusflow-db');
    const db = await new Promise((res, rej) => { open.onsuccess = () => res(open.result); open.onerror = () => rej(open.error); });
    const tx = db.transaction('sessions', 'readwrite');
    const store = tx.objectStore('sessions');
    for (const s of sessions) store.put(s);
    await new Promise((res) => { tx.oncomplete = () => res(); });
    localStorage.setItem('focusflow:tasks', ${JSON.stringify(JSON.stringify(tasks))});
    return sessions.length;
  })()`);
  check('seeded sessions into IndexedDB', seeded === sessions.length, `${seeded} sessions`);
  await send('Page.navigate', { url: APP_URL });
  await waitFor('app reloaded with seeded data', `document.querySelector('button[aria-label^="View your streak"]').textContent.includes('${EXPECTED.streaks.current}')`);

  section('Summary cards');
  await clickLink('/statistics');
  await waitFor('statistics page', `document.body.textContent.includes('Activity calendar')`);
  check('total focus time', (await cardValue('Total focus time')) === formatDurationLabel(EXPECTED.totals.totalSeconds), await cardValue('Total focus time'));
  check('sessions completed', (await cardValue('Sessions completed')) === String(EXPECTED.totals.sessions), await cardValue('Sessions completed'));
  check(
    'current streak card',
    (await cardValue('Current streak')) === `${EXPECTED.streaks.current} days`,
    await cardValue('Current streak')
  );
  check('tasks completed', (await cardValue('Tasks completed')) === '1', await cardValue('Tasks completed'));

  section('Weekly chart');
  const bars = await evaluate(`(() => {
    const bars = [...document.querySelectorAll('div[title]')].filter((b) => /\\d+ min/.test(b.getAttribute('title')));
    const mins = bars.map((b) => parseInt((b.getAttribute('title').match(/(\\d+) min/) || [])[1], 10));
    return { count: bars.length, total: mins.reduce((a, b) => a + b, 0), lastTitle: bars[bars.length - 1] && bars[bars.length - 1].getAttribute('title') };
  })()`);
  check('weekly chart has 7 bars', bars.count === 7, `count=${bars.count}`);
  const expectedWeekTotal = EXPECTED.last7.reduce((a, d) => a + d.minutes, 0);
  check('weekly chart minutes total', bars.total === expectedWeekTotal, `ui=${bars.total} expected=${expectedWeekTotal}`);
  check(
    'today bar shows its minutes',
    bars.lastTitle.includes(`${EXPECTED.last7[6].minutes} min`),
    bars.lastTitle
  );

  section('Range breakdown filters');
  check('default "This week" sessions', (await rowValue('Focus sessions')) === String(EXPECTED.week.sessions), await rowValue('Focus sessions'));
  check('default "This week" focus time', (await rowValue('Focus time')) === formatDurationLabel(EXPECTED.week.totalSeconds), await rowValue('Focus time'));
  check('default "This week" active days', (await rowValue('Active days')) === String(EXPECTED.week.activeDays), await rowValue('Active days'));

  await clickByText('This month');
  await sleep(300);
  check('month sessions', (await rowValue('Focus sessions')) === String(EXPECTED.month.sessions), `ui=${await rowValue('Focus sessions')} expected=${EXPECTED.month.sessions}`);
  check('month focus time', (await rowValue('Focus time')) === formatDurationLabel(EXPECTED.month.totalSeconds), await rowValue('Focus time'));
  check(
    'month avg session',
    EXPECTED.month.sessions ? (await rowValue('Avg session length')) === formatSeconds(EXPECTED.month.avgSeconds) : true,
    await rowValue('Avg session length')
  );
  check('month best day', (await rowValue('Best day')) === fmtMin(EXPECTED.month.bestMinutes), await rowValue('Best day'));

  await clickByText('All time');
  await sleep(300);
  check('all-time sessions', (await rowValue('Focus sessions')) === String(EXPECTED.all.sessions), await rowValue('Focus sessions'));
  check('all-time focus time', (await rowValue('Focus time')) === formatDurationLabel(EXPECTED.all.totalSeconds), await rowValue('Focus time'));
  check('all-time active days', (await rowValue('Active days')) === String(EXPECTED.all.activeDays), await rowValue('Active days'));
  check('all-time best day', (await rowValue('Best day')) === fmtMin(EXPECTED.all.bestMinutes), await rowValue('Best day'));

  section('Activity calendar (heatmap)');
  const heatmapDom = await evaluate(`(() => {
    const rects = [...document.querySelectorAll('svg[aria-label="Focus activity heatmap"] rect')];
    const colors = ${JSON.stringify(PALETTE)};
    const counts = { l0: 0, l1: 0, l2: 0, l3: 0, l4: 0, future: 0, total: rects.length };
    for (const r of rects) {
      const f = r.getAttribute('fill');
      const i = colors.indexOf(f);
      if (i >= 0) counts['l' + i] += 1;
      else counts.future += 1;
    }
    return counts;
  })()`);
  check('heatmap renders 53 weeks x 7 days', heatmapDom.total === 371, `total=${heatmapDom.total}`);
  check(
    'heatmap cell intensity levels match',
    heatmapDom.l0 === EXPECTED_LEVELS_53.l0 &&
      heatmapDom.l1 === EXPECTED_LEVELS_53.l1 &&
      heatmapDom.l2 === EXPECTED_LEVELS_53.l2 &&
      heatmapDom.l3 === EXPECTED_LEVELS_53.l3 &&
      heatmapDom.l4 === EXPECTED_LEVELS_53.l4 &&
      heatmapDom.future === EXPECTED_LEVELS_53.future,
    JSON.stringify({ ui: heatmapDom, expected: EXPECTED_LEVELS_53 })
  );

  section('Monthly totals');
  const monthsDom = await evaluate(`(() => {
    const rows = [...document.querySelectorAll('ul > li')].filter((li) => li.querySelector('.w-16') && li.querySelector('.flex-1'));
    const last = rows[rows.length - 1];
    const spans = last ? [...last.querySelectorAll('span')] : [];
    return { count: rows.length, lastMinutes: spans.length ? spans[spans.length - 1].textContent.trim() : null };
  })()`);
  check('monthly totals has 12 rows', monthsDom.count === 12, `count=${monthsDom.count}`);
  const lastMonth = EXPECTED.months[EXPECTED.months.length - 1];
  check(
    'current month minutes shown',
    monthsDom.lastMinutes === `${lastMonth.minutes} min`,
    `ui=${monthsDom.lastMinutes} expected=${lastMonth.minutes} min`
  );

  section('Streak navigation');
  // The streak button navigates straight to the Statistics page — no modal.
  await evaluate(`document.querySelector('button[aria-label^="View your streak"]').click()`);
  await waitFor('navigated to statistics', `location.pathname === '/statistics'`);
  check('no dialog opened', (await evaluate(`!!document.querySelector('[role="dialog"]')`)) === false);
  check('streak still shown on the button', (await evaluate(`document.querySelector('button[aria-label^="View your streak"]').textContent.includes('${EXPECTED.streaks.current}')`)) === true);
  check('statistics shows current streak card', (await cardValue('Current streak')) === `${EXPECTED.streaks.current} days`, await cardValue('Current streak'));
  check('statistics shows longest streak', (await evaluate(`document.body.textContent.includes('longest ${EXPECTED.streaks.longest}')`)) === true);
  check('statistics heatmap still renders 53 weeks', (await evaluate(`document.querySelectorAll('svg[aria-label="Focus activity heatmap"] rect').length`)) === 371);

  section('Focus page heatmap');
  await clickLink('/');
  await waitFor('focus page', `document.body.textContent.includes('Your Focus Activity')`);
  const focusHeatmap = await evaluate(`document.querySelectorAll('svg[aria-label="Focus activity heatmap"] rect').length`);
  check('focus page heatmap renders 53 weeks x 7 days', focusHeatmap === 371, `total=${focusHeatmap}`);

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
