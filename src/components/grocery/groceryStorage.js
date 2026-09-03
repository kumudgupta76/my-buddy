// Persistence for grocery records: Firestore is the source of truth, with a
// per-user local cache so the table paints immediately on reload.

import { fetchData, saveData } from '../../common/dbUtils';
import { COLLECTION_NAME, GROCERY_DATA_KEY } from '../../common/utils';

const cacheKeyFor = (uid) => `grocery-cache:${uid}`;

export const readCache = (uid) => {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(cacheKeyFor(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.error('Could not read grocery cache', error);
    return null;
  }
};

export const writeCache = (uid, records) => {
  if (!uid) return;
  try {
    localStorage.setItem(cacheKeyFor(uid), JSON.stringify(records));
  } catch (error) {
    console.error('Could not write grocery cache', error);
  }
};

export const clearCache = (uid) => {
  if (!uid) return;
  localStorage.removeItem(cacheKeyFor(uid));
};

export const loadGroceries = async (uid) => {
  const res = await fetchData(COLLECTION_NAME, uid);
  const docMissing = !res.success && res.error === 'Document does not exist';

  if (!res.success && !docMissing) return { success: false, records: [] };

  const stored = res.success ? res.data : {};
  const records = Array.isArray(stored[GROCERY_DATA_KEY]) ? stored[GROCERY_DATA_KEY] : [];
  return { success: true, records };
};

export const saveGroceries = async (uid, records) => saveData(COLLECTION_NAME, uid, {
  [GROCERY_DATA_KEY]: records,
});

export const downloadTextFile = (filename, content, mime = 'text/csv;charset=utf-8') => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const readTextFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result ?? ''));
  reader.onerror = () => reject(reader.error);
  reader.readAsText(file);
});
