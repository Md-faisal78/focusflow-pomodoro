// Built-in notification sounds. Each id maps to a Web Audio synth player in
// services/sounds.js. Custom uploaded sounds are stored separately (IndexedDB)
// and referenced as "custom:<id>".
export const BUILT_IN_SOUNDS = [
  { id: 'digital-bell', name: 'Digital Bell', description: 'Two crisp bell rings' },
  { id: 'soft-chime', name: 'Soft Chime', description: 'A gentle three-note chime' },
  { id: 'marimba', name: 'Marimba', description: 'Warm, wooden plucks' },
  { id: 'ping', name: 'Ping', description: 'A short, bright ping' },
  { id: 'fanfare', name: 'Fanfare', description: 'An uplifting ascending arpeggio' },
  { id: 'zen-gong', name: 'Zen Gong', description: 'A deep, resonant gong' },
  { id: 'bells', name: 'Bells', description: 'A sparkling bell cascade' },
];

export const DEFAULT_SOUND_ID = 'digital-bell';

export const MAX_CUSTOM_SOUND_BYTES = 5 * 1024 * 1024; // 5 MB
