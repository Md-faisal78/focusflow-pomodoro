// Verification of the About FocusFlow section + home footer.
// Checks content, link targets (repository only — no profile link), dark-mode
// contrast of every key text element, and mobile layout (no overflow, tappable
// GitHub button).
//
// Usage:
//   npm run dev -- --port 5199 --strictPort   (terminal 1)
//   node scripts/about-check.mjs              (terminal 2)
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEBUG_PORT = 9338;
const APP_URL = 'http://127.0.0.1:5199/';
const PROFILE = '/tmp/focusflow-cdp-about';
const REPO = 'https://github.com/Md-faisal78/focusflow-pomodoro';

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

  // ---- Home page footer -----------------------------------------------------
  await waitFor('focus page', `document.body.textContent.includes('Your Focus Activity')`);
  section('Home page footer');
  const home = await evaluate(`(() => {
    const footer = document.querySelector('footer');
    return {
      hasFooter: !!footer,
      text: footer ? footer.textContent.replace(/\\s+/g, ' ').trim() : '',
      links: footer ? [...footer.querySelectorAll('a')].map((a) => a.href) : [],
    };
  })()`);
  check('footer present at bottom of home page', home.hasFooter);
  check('footer line 1: name + tagline', home.text.includes('FocusFlow · Focus. Rest. Repeat.'), home.text);
  check(
    'footer line 2: developer + repository link',
    home.text.includes('Designed & developed by Mohammed Faisal Farooq') && home.text.includes('Project Repository'),
    home.text
  );
  check('footer link points to repository', home.links.length === 1 && home.links[0] === REPO, JSON.stringify(home.links));

  // ---- Settings -> About FocusFlow -----------------------------------------
  await send('Page.navigate', { url: APP_URL + 'settings' });
  await waitFor('settings page', `document.body.textContent.includes('Timer preferences')`);
  section('Settings → About FocusFlow');
  const about = await evaluate(`(() => {
    const h2 = [...document.querySelectorAll('h2')].find((el) => el.textContent.trim() === 'About FocusFlow');
    const card = h2 ? h2.closest('.card') : null;
    const text = card ? card.textContent.replace(/\\s+/g, ' ').trim() : '';
    return {
      hasHeading: !!h2,
      hasCard: !!card,
      text,
      links: card ? [...card.querySelectorAll('a')].map((a) => a.href) : [],
      allExternalLinksAreRepo: card
        ? [...card.querySelectorAll('a')].filter((a) => a.href.startsWith('http')).every((a) => a.href === ${JSON.stringify(REPO)})
        : false,
      hasStarButton: card
        ? [...card.querySelectorAll('a')].some((a) => a.textContent.includes('Star FocusFlow on GitHub'))
        : false,
    };
  })()`);
  check('heading "About FocusFlow" present', about.hasHeading);
  check('section inside a card', about.hasCard);
  check('shows FOCUSFLOW', about.text.includes('FOCUSFLOW'), about.text);
  check('shows tagline', about.text.includes('Focus. Rest. Repeat.'));
  check('shows developer', about.text.includes('Designed & developed by Mohammed Faisal Farooq'));
  check('shows "Project Repository"', about.text.includes('Project Repository'));
  check('shows "GitHub · FocusFlow"', about.text.includes('GitHub · FocusFlow'));
  check('shows star button text', about.text.includes('Star FocusFlow on GitHub'));
  check('shows "View Project Repository →"', about.text.includes('View Project Repository →'));
  check('shows Version 1.0.0', about.text.includes('Version 1.0.0'));
  check('no external link except the repository', about.allExternalLinksAreRepo, JSON.stringify(about.links));
  check('exactly 2 links, both the repository', about.links.length === 2 && about.links.every((l) => l === REPO), JSON.stringify(about.links));

  // ---- Dark mode: About card on Settings -----------------------------------
  section('Dark mode');
  await evaluate(`document.documentElement.classList.add('dark')`);
  await sleep(200);
  const dark = await evaluate(`(() => {
    const h2 = [...document.querySelectorAll('h2')].find((el) => el.textContent.trim() === 'About FocusFlow');
    const card = h2.closest('.card');
    const panel = card.querySelector('.rounded-2xl');
    const devName = [...card.querySelectorAll('span')].find((s) => s.textContent.trim() === 'Mohammed Faisal Farooq');
    const repoLink = [...card.querySelectorAll('a')].find((a) => a.textContent.trim() === 'Project Repository');
    const star = [...card.querySelectorAll('a')].find((a) => a.textContent.includes('Star FocusFlow on GitHub'));
    const starText = star.querySelector('span');
    const starSub = [...star.querySelectorAll('span')][1];
    const version = [...card.querySelectorAll('p')].find((p) => p.textContent.includes('Version'));
    const cs = (el) => (el ? getComputedStyle(el).color : null);
    const bg = (el) => (el ? getComputedStyle(el).backgroundColor : null);
    return {
      darkClass: document.documentElement.classList.contains('dark'),
      cardBg: bg(card),
      panelBg: bg(panel),
      devName: cs(devName),
      repoLink: cs(repoLink),
      starText: cs(starText),
      starSub: cs(starSub),
      version: cs(version),
      starIconPresent: !!star.querySelector('svg'),
      starIconColor: (() => {
        const icon = star.querySelector('svg');
        return icon ? getComputedStyle(icon).color : null;
      })(),
      starBtnBg: bg(star),
      bodyBg: bg(document.body),
    };
  })()`);
  check('dark class applied', dark.darkClass === true);
  check('card has dark background', (dark.cardBg || '').includes('38, 38, 34'), dark.cardBg);
  const contrastRatio = (c1, c2) => {
    const lum = (rgb) => {
      const m = String(rgb).match(/(\d+)/g);
      if (!m || m.length < 3) return 0;
      const lin = m.slice(0, 3).map((v) => {
        const c = Number(v) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    };
    const l1 = lum(c1);
    const l2 = lum(c2);
    const hi = Math.max(l1, l2);
    const lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  };
  const textRatio = (fg, bgc) => contrastRatio(fg, bgc);
  // The inner panel is 60% opacity over the card, so comparing against the
  // card background gives a fair (slightly conservative) contrast figure.
  check('developer name readable in dark mode', textRatio(dark.devName, dark.cardBg) >= 4.5, `${textRatio(dark.devName, dark.cardBg).toFixed(2)}:1`);
  check('repository link readable in dark mode', textRatio(dark.repoLink, dark.cardBg) >= 4.5, `${textRatio(dark.repoLink, dark.cardBg).toFixed(2)}:1`);
  check('star button text readable in dark mode', textRatio(dark.starText, dark.starBtnBg) >= 4.5, `${textRatio(dark.starText, dark.starBtnBg).toFixed(2)}:1`);
  check('star button subtext readable in dark mode', textRatio(dark.starSub, dark.starBtnBg) >= 4.5, `${textRatio(dark.starSub, dark.starBtnBg).toFixed(2)}:1`);
  check('version text readable in dark mode', textRatio(dark.version, dark.cardBg) >= 4.5, `${textRatio(dark.version, dark.cardBg).toFixed(2)}:1`);
  const starRatio = contrastRatio(dark.starIconColor, dark.starBtnBg);
  check('star icon visible in dark mode (contrast >= 3:1)', dark.starIconPresent && starRatio >= 3, `ratio=${starRatio.toFixed(2)}:1`);

  // ---- Dark mode: footer on the home page ----------------------------------
  await send('Page.navigate', { url: APP_URL });
  await waitFor('focus page (dark)', `document.body.textContent.includes('Your Focus Activity')`);
  const darkFooter = await evaluate(`(() => {
    const footer = document.querySelector('footer');
    const link = footer.querySelector('a');
    return {
      footerColor: getComputedStyle(footer).color,
      linkColor: getComputedStyle(link).color,
      bodyBg: getComputedStyle(document.body).backgroundColor,
    };
  })()`);
  check('footer text readable in dark mode', textRatio(darkFooter.footerColor, darkFooter.bodyBg) >= 4.5, `${textRatio(darkFooter.footerColor, darkFooter.bodyBg).toFixed(2)}:1`);
  check('footer link readable in dark mode', textRatio(darkFooter.linkColor, darkFooter.bodyBg) >= 4.5, `${textRatio(darkFooter.linkColor, darkFooter.bodyBg).toFixed(2)}:1`);

  // ---- Light mode spot check ------------------------------------------------
  section('Light mode');
  await send('Page.navigate', { url: APP_URL + 'settings' });
  await waitFor('settings page (light)', `document.body.textContent.includes('Timer preferences')`);
  await evaluate(`document.documentElement.classList.remove('dark')`);
  await sleep(200);
  const light = await evaluate(`(() => {
    const h2 = [...document.querySelectorAll('h2')].find((el) => el.textContent.trim() === 'About FocusFlow');
    const card = h2.closest('.card');
    const devName = [...card.querySelectorAll('span')].find((s) => s.textContent.trim() === 'Mohammed Faisal Farooq');
    return { devName: getComputedStyle(devName).color, cardBg: getComputedStyle(card).backgroundColor };
  })()`);
  const darkOnLight = (rgb) => {
    const m = String(rgb).match(/(\d+)/g);
    return m && m.length >= 3 && Number(m[0]) < 100 && Number(m[1]) < 100 && Number(m[2]) < 100;
  };
  check('developer name readable in light mode', darkOnLight(light.devName), light.devName);
  check('card has warm light background', light.cardBg.includes('246, 246, 243'), light.cardBg);

  // ---- Mobile layout (home footer + settings star button) -------------------
  section('Mobile layout');
  await send('Page.navigate', { url: APP_URL });
  await waitFor('focus page (mobile)', `document.body.textContent.includes('Your Focus Activity')`);
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await sleep(300);
  const mobileHome = await evaluate(`(() => {
    const footer = document.querySelector('footer');
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      footerWidth: footer.getBoundingClientRect().width,
      viewport: window.innerWidth,
    };
  })()`);
  check('no horizontal overflow on mobile (home)', !mobileHome.overflow, `scrollWidth=${mobileHome.scrollWidth} innerWidth=${mobileHome.innerWidth}`);
  check('footer does not overflow (home)', mobileHome.footerWidth <= mobileHome.viewport, `footer=${mobileHome.footerWidth} viewport=${mobileHome.viewport}`);

  await send('Page.navigate', { url: APP_URL + 'settings' });
  await waitFor('settings page (mobile)', `document.body.textContent.includes('Timer preferences')`);
  const mobileSettings = await evaluate(`(() => {
    const h2 = [...document.querySelectorAll('h2')].find((el) => el.textContent.trim() === 'About FocusFlow');
    const card = h2.closest('.card');
    const star = [...card.querySelectorAll('a')].find((a) => a.textContent.includes('Star FocusFlow on GitHub'));
    const r = star.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      starWidth: Math.round(r.width),
      starHeight: Math.round(r.height),
    };
  })()`);
  check('no horizontal overflow on mobile (settings)', !mobileSettings.overflow, `scrollWidth=${mobileSettings.scrollWidth} innerWidth=${mobileSettings.innerWidth}`);
  check('star button comfortably wide on mobile', mobileSettings.starWidth >= 200, `width=${mobileSettings.starWidth}px`);
  check('star button tall enough to tap (>= 44px)', mobileSettings.starHeight >= 44, `height=${mobileSettings.starHeight}px`);

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
