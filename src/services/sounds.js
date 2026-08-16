/**
 * Sound playback.
 * Built-in sounds are synthesized with the Web Audio API (no audio files
 * shipped). Custom uploaded sounds are played from object URLs.
 */
import { getCustomSoundUrl } from './audioStore.js';

let audioCtx = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) {
    try {
      audioCtx = new AC();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function tone({ freq = 440, type = 'sine', when = 0, duration = 0.5, peak = 0.18 }) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  } catch {
    // ignore audio errors
  }
}

function playDigitalBell() {
  tone({ freq: 880, type: 'square', duration: 0.15, peak: 0.16 });
  tone({ freq: 1174.66, type: 'square', when: 0.22, duration: 0.45, peak: 0.16 });
}

function playSoftChime() {
  [523.25, 659.25, 783.99].forEach((freq, i) =>
    tone({ freq, type: 'sine', when: i * 0.14, duration: 0.7, peak: 0.16 })
  );
}

function playMarimba() {
  [392, 523.25, 659.25].forEach((freq, i) =>
    tone({ freq, type: 'triangle', when: i * 0.09, duration: 0.35, peak: 0.2 })
  );
}

function playPing() {
  tone({ freq: 1320, type: 'sine', duration: 0.5, peak: 0.14 });
  tone({ freq: 1320, type: 'sine', when: 0.18, duration: 0.35, peak: 0.08 });
}

function playFanfare() {
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
    tone({ freq, type: 'triangle', when: i * 0.12, duration: 0.4, peak: 0.18 })
  );
  tone({ freq: 1046.5, type: 'triangle', when: 0.48, duration: 0.8, peak: 0.1 });
}

function playZenGong() {
  tone({ freq: 196, type: 'sine', duration: 2.4, peak: 0.22 });
  tone({ freq: 392, type: 'sine', when: 0.05, duration: 1.6, peak: 0.06 });
}

function playBells() {
  [1046.5, 1318.5, 1568, 2093].forEach((freq, i) =>
    tone({ freq, type: 'sine', when: i * 0.11, duration: 0.9, peak: 0.1 })
  );
}

const PLAYERS = {
  'digital-bell': playDigitalBell,
  'soft-chime': playSoftChime,
  marimba: playMarimba,
  ping: playPing,
  fanfare: playFanfare,
  'zen-gong': playZenGong,
  bells: playBells,
};

export function playBuiltInSound(id) {
  try {
    const player = PLAYERS[id] || playDigitalBell;
    player();
  } catch {
    // ignore
  }
}

export function isCustomSoundSelection(selection) {
  return typeof selection === 'string' && selection.startsWith('custom:');
}

/** Play whatever sound is selected: a built-in id or "custom:<soundId>". */
export async function playSoundSelection(selection) {
  if (isCustomSoundSelection(selection)) {
    const url = await getCustomSoundUrl(selection.slice('custom:'.length));
    if (url) playAudioUrl(url);
    return;
  }
  playBuiltInSound(selection || 'digital-bell');
}

/** Play an audio file from a URL (used for custom sounds and previews). */
export function playAudioUrl(url, volume = 0.8) {
  try {
    const audio = new Audio(url);
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.play().catch(() => {});
  } catch {
    // ignore
  }
}
