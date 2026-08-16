# FocusFlow

> Focus. Rest. Repeat.

FocusFlow is a simple, distraction-free Pomodoro productivity web app designed
to help you focus using customizable focus and break sessions. It opens
straight into the app — **no login, no signup, no account** — and keeps all of
your data in your browser. Built with **React + Vite + Tailwind CSS** and ready
to install as a **PWA**.

## Features

- **Pomodoro timer** — Focus, Short Break and Long Break modes with a clean,
  prominent countdown and progress ring.
- **Custom focus and break durations** — Classic, Deep Focus, Quick Focus and
  Custom presets, plus your own focus / short break / long break durations.
- **Task management** — Create, edit, delete and complete tasks, each with its
  own custom focus duration (in minutes, not just "number of Pomodoros").
  Completed focus sessions and focused time are tracked per task, and a task
  auto-completes once its target is reached.
- **Floating timer** — A compact popup that stays visible while you navigate,
  showing the remaining time, the current task (or preset), and play/pause
  controls. It can be minimized to a tiny pill.
- **Streak tracking** — A live streak counter in the top-right corner that
  links straight to your streak details.
- **Statistics** — Summary cards, a weekly chart, daily/weekly/monthly
  breakdowns, monthly totals and full session history.
- **Activity heatmap** — A GitHub-style activity calendar of your focus sessions
  on the Statistics page and at the bottom of the Focus page.
- **Light and dark themes** — Switch between light, dark and system themes from
  the top-right corner; dark mode is carefully checked for contrast.
- **Built-in notification sounds** — A set of built-in sounds that play when a
  session ends (no audio files — synthesized in your browser).
- **Custom notification sounds** — Upload your own sound (stored locally) and
  preview it before selecting.
- **PWA support** — Installable with a manifest, service worker, app icons and
  offline support for core functionality.
- **Responsive design** — Works well on desktop, tablet and mobile.
- **Local / no-login usage** — No accounts, no backend, no data uploaded.
- **Data persistence** — Settings and tasks in `localStorage`, session history
  and custom sounds in `IndexedDB`; everything survives reloads and stays
  available offline.
- **Mobile-friendly interface** — A bottom tab bar, large tap targets and
  layouts that adapt to small screens.

## Screenshots

Screenshots will be added here. The expected layout is:

```
screenshots/
├── home.png
├── timer.png
├── tasks.png
├── statistics.png
├── settings.png
└── dark-mode.png
```

![FocusFlow Home](screenshots/home.png)
![FocusFlow Timer](screenshots/timer.png)
![FocusFlow Tasks](screenshots/tasks.png)
![FocusFlow Statistics](screenshots/statistics.png)
![FocusFlow Settings](screenshots/settings.png)
![FocusFlow Dark Mode](screenshots/dark-mode.png)

**Adding your own screenshots:** create a `screenshots/` folder in the project
root, save a PNG named as above (e.g. `home.png` for the Focus page, `timer.png`
for the timer with a running session, `dark-mode.png` for any page with the dark
theme enabled), and the images above will render automatically. On a phone or
desktop browser, a full-page screenshot capture works well. No screenshots are
shipped with the repository — the images only appear once you add them.

## How to Use

1. **Open FocusFlow.** It starts right on the Focus page — no sign-up needed.
2. **Create a task.** Go to **Tasks**, create a task, and give it its own focus
   duration if you like (25 minutes by default).
3. **Choose the focus duration and break duration.** Pick a preset (Classic,
   Deep Focus, Quick Focus) or set custom focus, short break and long break
   durations.
4. **Start the timer.** Press **Start** and work until the session completes.
5. **Work during the focus session.** The timer counts down; a sound and (if
   enabled) a browser notification let you know when it's done.
6. **Take the break when the timer completes.** FocusFlow switches to a short or
   long break automatically — rest, then come back.
7. **Track progress using Statistics and Streaks.** Open the **Statistics** page
   to see your focus time, sessions and activity heatmap, and keep your streak
   alive by focusing each day.
8. **Customize sounds and appearance from Settings.** Toggle sounds, pick or
   upload a notification sound, enable notifications, and choose light or dark
   theme.

## Installation

Run FocusFlow locally:

```bash
git clone https://github.com/Md-faisal78/focusflow-pomodoro.git
cd focusflow-pomodoro
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`) in your browser.

Other useful commands:

```bash
npm test           # run unit tests
npm run build      # production build -> dist/
npm run preview    # preview the production build
npm run icons      # regenerate the PWA PNG icons
```

## Development

The repo includes zero-dependency browser test scripts (headless Chrome driven
over the DevTools Protocol) that exercise the real app:

- `scripts/browser-test.mjs` — full timer completion flow (task CRUD, session
  persistence, notification, sound, floating timer, theme, reload persistence).
- `scripts/notification-test.mjs` — real notification permission flow in a
  visible Chrome window (default → granted → denied, real OS toast).
- `scripts/stats-test.mjs` — Statistics and Streak pages against seeded data
  (summary cards, weekly chart, range filters, heatmap levels, monthly totals).
- `scripts/pwa-test.mjs` — PWA install flow against the production build
  (manifest, service worker, first-visit offline boot, offline data).
- `scripts/about-check.mjs` — About section + home footer content, links,
  dark-mode contrast and mobile layout.
- `scripts/redesign-check.mjs` — visual audit: WCAG contrast sweep across all
  pages in light and dark mode, navigation order, floating timer, heatmaps.

To run the dev-server scripts:

```bash
npm run dev -- --port 5199 --strictPort   # terminal 1
node scripts/browser-test.mjs             # terminal 2 (adjust APP_URL if needed)
node scripts/stats-test.mjs
node scripts/about-check.mjs
node scripts/redesign-check.mjs

npm run build
npm run preview -- --port 4180 --strictPort   # terminal 1
node scripts/pwa-test.mjs                     # terminal 2
```

## Configuration

Developer attribution lives in [`src/constants/app.js`](src/constants/app.js):

```js
export const AUTHOR = {
  name: 'Mohammed Faisal Farooq',
  repository: 'https://github.com/Md-faisal78/focusflow-pomodoro',
};
```

The **About FocusFlow** section in Settings and the footer on the Focus page
both use these values. The only external link exposed is the project repository
— there is no separate profile link and no GitHub API dependency.

## Tech stack

- React 18 + Vite 5
- Tailwind CSS 3 (class-based dark mode)
- react-router-dom
- Web Audio API (built-in sounds, no audio files)
- IndexedDB + localStorage (no backend)

## Project structure

```
public/
  icons/               PWA icons (generated by scripts/generate-icons.mjs)
  manifest.webmanifest PWA manifest
  sw.js                service worker (precache + offline fallback)
src/
  components/
    focus/             Focus page pieces (task select, quick stats)
    navigation/        Navbar, mobile tab bar, theme menu, streak button, floating timer
    settings/          Timer, sound, notification, theme and data settings
    statistics/        Heatmap, weekly chart, summary cards, range stats, monthly totals
    tasks/             Task form and task item
    timer/             Timer display, mode tabs, controls, presets
    ui/                Buttons, modal, toggle, icons, progress ring, …
  constants/           App, timer and sound constants
  hooks/               useIsDark
  lib/                 (reserved)
  pages/               Focus, Tasks, Statistics, Settings
  services/            storage, database (IndexedDB), sounds, audioStore, notifications
  store/               AppContext (global state)
  utils/               time, date, stats (with unit tests)
  types/               (reserved)
scripts/               Browser test scripts + icon generator
screenshots/           Add your screenshots here (see "Screenshots")
```

## License

[MIT](LICENSE)
