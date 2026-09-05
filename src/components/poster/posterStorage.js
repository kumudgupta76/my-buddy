// Storage helpers for the Poster Finder.
//
// Posters and collage settings live in Firestore (one document per user, shared
// with the other features). Two things deliberately stay in this browser only:
//   - the search-result cache, which is a throwaway performance cache
//   - uploaded manual poster images, which are base64 and would blow the
//     1MB Firestore document limit within a couple of entries

const CACHE_KEY = 'poster-finder-cache-v2';
const LOCAL_IMAGES_KEY = 'poster-finder-local-images-v1';
const MIGRATED_KEY = 'poster-finder-migrated-v1';
const LEGACY_RESULTS_KEY = 'poster-finder-results-v1';
const LEGACY_SETTINGS_KEY = 'poster-finder-settings-v1';

export const DEFAULT_SETTINGS = {
  collageTitle: 'Watch Of The Week #$(Counter)',
  collageTitleSize: 56,
  collageTitleColor: '#ffd84a',
  namesColor: '#ffffff',
  namesSize: 96,
  useDefaultBg: true,
  bgAdjust: { fit: 'stretch', scale: 1, offsetX: 0, offsetY: 0, dim: 0.12 },
  counter: 1,
  captionHashtags: '#movies #watchoftheweek #cinema',
  viewMode: 'large',
  selectedIds: [],
  collageHistory: [],
};

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const newPosterId = () =>
  `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const nowIso = () => new Date().toISOString();

const isDataUrl = (value) => typeof value === 'string' && value.startsWith('data:');

// ─── Search cache ───────────────────────────────────────────────────────────
export const getCachedResults = () => readJson(CACHE_KEY, {}) || {};
export const setCachedResults = (cache) => writeJson(CACHE_KEY, cache);
export const clearCachedResults = () => localStorage.removeItem(CACHE_KEY);

// ─── Local-only images ──────────────────────────────────────────────────────
export const getLocalImages = () => readJson(LOCAL_IMAGES_KEY, {}) || {};

export const setLocalImage = (id, dataUrl) => {
  const all = getLocalImages();
  all[id] = dataUrl;
  return writeJson(LOCAL_IMAGES_KEY, all) ? all : null;
};

export const removeLocalImage = (id) => {
  const all = getLocalImages();
  delete all[id];
  writeJson(LOCAL_IMAGES_KEY, all);
  return all;
};

// Drop images whose poster no longer exists (e.g. deleted on another device).
export const pruneLocalImages = (validIds) => {
  const all = getLocalImages();
  const keep = new Set(validIds);
  let changed = false;
  Object.keys(all).forEach(id => {
    if (!keep.has(id)) { delete all[id]; changed = true; }
  });
  if (changed) writeJson(LOCAL_IMAGES_KEY, all);
  return all;
};

// Shrink uploads before caching them so localStorage doesn't fill up.
export const downscaleImage = (file, maxSize = 800, quality = 0.8) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode the image'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

// ─── Shape helpers ──────────────────────────────────────────────────────────
export const normalizePoster = (raw) => {
  const created = raw.createdAt || nowIso();
  return {
    id: raw.id || newPosterId(),
    title: raw.title || '',
    displayName: raw.displayName || raw.title || '',
    imdbID: raw.imdbID || null,
    image: raw.image || null,
    error: raw.error || null,
    localImage: !!raw.localImage,
    rating: raw.rating == null ? 4 : raw.rating,
    adjustments: { scale: 1, offsetX: 0, offsetY: 0, ...(raw.adjustments || {}) },
    createdAt: created,
    updatedAt: raw.updatedAt || created,
  };
};

export const mergeSettings = (raw) => ({
  ...DEFAULT_SETTINGS,
  ...(raw || {}),
  bgAdjust: { ...DEFAULT_SETTINGS.bgAdjust, ...((raw && raw.bgAdjust) || {}) },
  selectedIds: Array.isArray(raw && raw.selectedIds) ? raw.selectedIds : [],
  collageHistory: Array.isArray(raw && raw.collageHistory) ? raw.collageHistory.slice(0, 50) : [],
});

// ─── One-time migration from the old localStorage-only format ───────────────
export const isMigrated = () => localStorage.getItem(MIGRATED_KEY) === 'true';
export const markMigrated = () => localStorage.setItem(MIGRATED_KEY, 'true');

export const readLegacyPosterData = () => {
  const legacy = readJson(LEGACY_RESULTS_KEY, null);
  const settings = mergeSettings(readJson(LEGACY_SETTINGS_KEY, null));
  const results = legacy && Array.isArray(legacy.results) ? legacy.results : [];

  // Space the timestamps a second apart so the original order survives sorting.
  const base = Date.now() - results.length * 1000;
  const posters = results.map((entry, i) => {
    const poster = normalizePoster({
      ...entry,
      createdAt: new Date(base + i * 1000).toISOString(),
    });
    // Manual uploads were stored as base64 inline; move them to the local store.
    if (poster.image && isDataUrl(poster.image.url)) {
      setLocalImage(poster.id, poster.image.url);
      poster.localImage = true;
      poster.image = { ...poster.image, url: null, urlHD: null };
    }
    return poster;
  });

  const selectedIds = (Array.isArray(legacy && legacy.selectedOrder) ? legacy.selectedOrder : [])
    .map(idx => (posters[idx] ? posters[idx].id : null))
    .filter(Boolean)
    .slice(0, 4);

  return { posters, settings: { ...settings, selectedIds } };
};
