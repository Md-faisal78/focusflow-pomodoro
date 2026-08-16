/**
 * Minimal promise-based IndexedDB wrapper.
 * Used for session history (potentially large over time) and custom sound
 * blobs. Everything else lives in localStorage via services/storage.js.
 */

const DB_NAME = 'focusflow-db';
const DB_VERSION = 1;

export const DB_STORES = {
  sessions: 'sessions',
  customSounds: 'customSounds',
};

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORES.sessions)) {
        db.createObjectStore(DB_STORES.sessions, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DB_STORES.customSounds)) {
        db.createObjectStore(DB_STORES.customSounds, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open database'));
    request.onblocked = () => reject(new Error('Database upgrade blocked'));
  });
  return dbPromise;
}

function run(store, mode, operation) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        let result;
        const tx = db.transaction(store, mode);
        const objectStore = tx.objectStore(store);
        const request = operation(objectStore);
        request.onsuccess = () => {
          result = request.result;
        };
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error || new Error('Transaction failed'));
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      })
  );
}

export const idbAdd = (store, value) => run(store, 'readwrite', (os) => os.add(value));
export const idbPut = (store, value) => run(store, 'readwrite', (os) => os.put(value));
export const idbGet = (store, key) => run(store, 'readonly', (os) => os.get(key));
export const idbGetAll = (store) => run(store, 'readonly', (os) => os.getAll());
export const idbDelete = (store, key) => run(store, 'readwrite', (os) => os.delete(key));
export const idbClear = (store) => run(store, 'readwrite', (os) => os.clear());
