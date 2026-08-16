/**
 * Custom (user-uploaded) notification sounds.
 * Blobs are stored in IndexedDB; object URLs are created lazily and cached.
 */
import { DB_STORES, idbDelete, idbGetAll, idbPut } from './database.js';
import { uid } from '../utils/uid.js';

const urlCache = new Map();

export async function addCustomSound(file) {
  const record = {
    id: uid(),
    name: file.name || 'Custom sound',
    type: file.type || 'audio/*',
    size: file.size || 0,
    createdAt: Date.now(),
    blob: file,
  };
  await idbPut(DB_STORES.customSounds, record);
  return record;
}

export async function listCustomSounds() {
  const all = (await idbGetAll(DB_STORES.customSounds).catch(() => [])) || [];
  return all.map(({ blob, ...meta }) => meta);
}

export async function getCustomSoundUrl(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const all = (await idbGetAll(DB_STORES.customSounds).catch(() => [])) || [];
  const record = all.find((r) => r.id === id);
  if (!record || !record.blob) return null;
  const url = URL.createObjectURL(record.blob);
  urlCache.set(id, url);
  return url;
}

export async function deleteCustomSound(id) {
  const cached = urlCache.get(id);
  if (cached) {
    try {
      URL.revokeObjectURL(cached);
    } catch {
      // ignore
    }
    urlCache.delete(id);
  }
  await idbDelete(DB_STORES.customSounds, id).catch(() => {});
}
