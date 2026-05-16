import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Typography, Input, InputNumber, Button, Spin, Modal, Checkbox, message, Tooltip, AutoComplete, Tag, Upload, Slider, Tabs, Segmented } from 'antd';
import {
  SearchOutlined, DownloadOutlined, DeleteOutlined,
  EyeOutlined, AppstoreOutlined, UploadOutlined, PictureOutlined, ReloadOutlined, PlusOutlined,
  FontSizeOutlined, BgColorsOutlined, EditOutlined,
} from '@ant-design/icons';
import { isMobile } from '../../common/utils';
import './PosterFinder.css';

const { Text } = Typography;

const ITUNES_BASE = 'https://itunes.apple.com/search';
const OMDB_BASE = 'https://www.omdbapi.com/';
const OMDB_KEY = process.env.REACT_APP_OMDB_API_KEY;
const CACHE_KEY = 'poster-finder-cache-v2';
const SETTINGS_KEY = 'poster-finder-settings-v1';
const DEFAULT_BG_URL = `${process.env.PUBLIC_URL || ''}/assets/background.png`;

const DEFAULT_SETTINGS = {
  collageTitle: 'Watch Of The Week #$(Counter)',
  collageTitleSize: 56,
  collageTitleColor: '#ffd84a',
  namesColor: '#ffffff',
  namesSize: 96,
  useDefaultBg: true,
  bgAdjust: { fit: 'stretch', scale: 1, offsetX: 0, offsetY: 0, dim: 0.12 },
  counter: 1,
};

const loadSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      bgAdjust: { ...DEFAULT_SETTINGS.bgAdjust, ...(parsed.bgAdjust || {}) },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* storage full */ }
};

// Replace tokens in the title template — currently just $(Counter).
const resolveTitle = (template, counter) =>
  String(template || '').replace(/\$\(Counter\)/gi, String(counter ?? ''));

const getCachedResults = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
  } catch { return {}; }
};

const setCachedResults = (cache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* storage full */ }
};

// iTunes artwork URLs contain a size like 100x100bb.jpg — we can swap in any size
const resizeArtwork = (url, size) => url.replace(/\d+x\d+bb/, `${size}x${size}bb`);

const PosterFinder = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]); // [{title, image: {url, urlHD, label, kind, year, source}, error?, imdbID?}]
  const [selectedOrder, setSelectedOrder] = useState([]); // ordered array of titleIdx
  const [loading, setLoading] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [collageOpen, setCollageOpen] = useState(false);
  // Persisted settings (lazy-init from localStorage)
  const initialSettings = (() => loadSettings())();
  const [collageTitle, setCollageTitle] = useState(initialSettings.collageTitle);
  const [collageTitleSize, setCollageTitleSize] = useState(initialSettings.collageTitleSize); // canvas px
  const [collageTitleColor, setCollageTitleColor] = useState(initialSettings.collageTitleColor);
  const [collageBg, setCollageBg] = useState(null); // dataURL of user-uploaded bg
  const [useDefaultBg, setUseDefaultBg] = useState(initialSettings.useDefaultBg);
  // Background adjustments: fit ('stretch' | 'cover' | 'contain'), scale 1..3, offsetX/Y -100..100, dim 0..0.7
  const [bgAdjust, setBgAdjust] = useState(initialSettings.bgAdjust);
  const [collageRendering, setCollageRendering] = useState(false);
  // Per-poster adjustments keyed by titleIdx: { scale: 1..3, offsetX: -100..100, offsetY: -100..100 }
  const [adjustments, setAdjustments] = useState({});
  const [activeSlot, setActiveSlot] = useState(0); // index within selectedOrder
  // Editable names overlay (per-slot text override). Keyed by titleIdx.
  const [nameOverrides, setNameOverrides] = useState({});
  // Star ratings per titleIdx. Default 4 stars (0..5).
  const [ratings, setRatings] = useState({});
  const getRating = (tIdx) => (ratings[tIdx] == null ? 4 : ratings[tIdx]);
  const setRating = (tIdx, n) =>
    setRatings(prev => ({ ...prev, [tIdx]: Math.max(0, Math.min(5, n)) }));
  const [namesColor, setNamesColor] = useState(initialSettings.namesColor);
  const [namesSize, setNamesSize] = useState(initialSettings.namesSize);
  const [previewMode, setPreviewMode] = useState('posters'); // 'posters' | 'names'
  // Title $(Counter) token value. Incremented only after a successful download.
  const [counter, setCounter] = useState(initialSettings.counter);
  // Manual poster modal
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualImage, setManualImage] = useState(null); // dataURL
  const [manualUrl, setManualUrl] = useState('');
  const suggestDebounceRef = useRef(null);
  const suggestAbortRef = useRef(null);

  // Persist collage settings to localStorage whenever they change.
  useEffect(() => {
    saveSettings({
      collageTitle,
      collageTitleSize,
      collageTitleColor,
      namesColor,
      namesSize,
      useDefaultBg,
      bgAdjust,
      counter,
    });
  }, [collageTitle, collageTitleSize, collageTitleColor, namesColor, namesSize, useDefaultBg, bgAdjust, counter]);

  const fetchWithTimeout = async (url, timeoutMs = 10000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  };

  const searchTitles = useCallback(async () => {
    if (!query.trim()) {
      message.warning('Please enter at least one title');
      return;
    }

    const titles = query.split(',').map(t => t.trim()).filter(Boolean);
    if (titles.length === 0) return;

    setLoading(true);
    const cache = getCachedResults();
    const fetched = [];

    for (const title of titles) {
      const entry = await fetchTitle(title, cache);
      fetched.push(entry);
    }

    setCachedResults(cache);
    // Append to existing results, skipping titles that are already added.
    // Auto-select newly added entries (that have an image) up to the 4-poster cap.
    setResults(prev => {
      const have = new Set(prev.map(r => (r.imdbID || r.title).toLowerCase()));
      const merged = [...prev];
      const newIdxs = [];
      let skipped = 0;
      fetched.forEach(entry => {
        const key = (entry.imdbID || entry.title || '').toLowerCase();
        if (have.has(key)) { skipped += 1; return; }
        have.add(key);
        if (entry.image) newIdxs.push(merged.length);
        merged.push(entry);
      });
      if (skipped > 0) {
        message.info(`${skipped} title(s) were already added`);
      }
      if (newIdxs.length > 0) {
        setSelectedOrder(sel => {
          const out = [...sel];
          for (const i of newIdxs) {
            if (out.length >= 4) break;
            if (!out.includes(i)) out.push(i);
          }
          return out;
        });
      }
      return merged;
    });
    setQuery('');
    setSuggestions([]);
    setLoading(false);
  }, [query]);

  // Clear all results, selections, and the input.
  const clearAll = () => {
    setResults([]);
    setSelectedOrder([]);
    setQuery('');
    setSuggestions([]);
  };

  // Fetch a single best poster for a free-text title.
  // Mutates the provided cache object in-place when a fresh entry is created.
  const fetchTitle = async (title, cache) => {
    if (cache[title.toLowerCase()]) {
      return cache[title.toLowerCase()];
    }

    try {
      const movieUrl = `${ITUNES_BASE}?term=${encodeURIComponent(title)}&media=movie&entity=movie&limit=1`;
      const tvUrl = `${ITUNES_BASE}?term=${encodeURIComponent(title)}&media=tvShow&entity=tvSeason&limit=1`;
      const omdbUrl = OMDB_KEY
        ? `${OMDB_BASE}?apikey=${OMDB_KEY}&t=${encodeURIComponent(title)}`
        : null;

      const fetches = [
        fetchWithTimeout(movieUrl).then(r => r.json()).catch(() => ({ results: [] })),
        fetchWithTimeout(tvUrl).then(r => r.json()).catch(() => ({ results: [] })),
        omdbUrl
          ? fetchWithTimeout(omdbUrl).then(r => r.json()).catch(() => ({}))
          : Promise.resolve({}),
      ];

      const [movieData, tvData, omdbData] = await Promise.all(fetches);

      // Prefer OMDB exact-title match (canonical poster)
      if (omdbData && omdbData.Response === 'True' && omdbData.Poster && omdbData.Poster !== 'N/A') {
        const yearNum = omdbData.Year ? parseInt(String(omdbData.Year).slice(0, 4), 10) || omdbData.Year : null;
        const entry = {
          title: yearNum ? `${omdbData.Title} (${yearNum})` : omdbData.Title || title,
          imdbID: omdbData.imdbID,
          image: {
            url: omdbData.Poster,
            urlHD: omdbData.Poster.replace(/SX\d+/, 'SX1200'),
            label: omdbData.Title || title,
            kind: omdbData.Type === 'series' ? 'TV' : 'Movie',
            year: yearNum,
            source: 'OMDB',
          },
        };
        cache[title.toLowerCase()] = entry;
        return entry;
      }

      // Fallback to first iTunes hit (movie preferred over TV)
      const hit = (movieData.results && movieData.results[0]) || (tvData.results && tvData.results[0]);
      if (hit && hit.artworkUrl100) {
        const isTv = !!(tvData.results && tvData.results[0] === hit);
        const year = hit.releaseDate ? new Date(hit.releaseDate).getFullYear() : null;
        const label = hit.trackName || hit.collectionName || title;
        const entry = {
          title: year ? `${label} (${year})` : label,
          image: {
            url: resizeArtwork(hit.artworkUrl100, 600),
            urlHD: resizeArtwork(hit.artworkUrl100, 1200),
            label,
            kind: isTv ? 'TV' : 'Movie',
            year,
            source: 'iTunes',
          },
        };
        cache[title.toLowerCase()] = entry;
        return entry;
      }

      return { title, image: null, error: 'No results found' };
    } catch (err) {
      const errMsg = err.name === 'AbortError' ? 'Request timed out' : (err.message || 'Network error');
      return { title, image: null, error: errMsg };
    }
  };

  // Add a single title (e.g. picked from autocomplete) and append it to results.
  const addSingleTitle = async (title) => {
    const trimmed = (title || '').trim();
    if (!trimmed) return;

    // Avoid duplicates (case-insensitive title match)
    const exists = results.some(r => r.title.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      message.info(`"${trimmed}" is already added`);
      setQuery('');
      setSuggestions([]);
      return;
    }

    setLoading(true);
    const cache = getCachedResults();
    const entry = await fetchTitle(trimmed, cache);
    setCachedResults(cache);
    addEntryWithAutoSelect(entry);
    setQuery('');
    setSuggestions([]);
    setLoading(false);
  };

  // Fetch the single best poster for an EXACT item picked from autocomplete.
  const addExactTitle = async (suggestion) => {
    const { title, year, type, imdbID, poster } = suggestion;
    const displayTitle = year ? `${title} (${year})` : title;

    // De-dupe by imdbID first, then by display title
    const exists = results.some(r =>
      (imdbID && r.imdbID === imdbID) ||
      r.title.toLowerCase() === displayTitle.toLowerCase()
    );
    if (exists) {
      message.info(`"${displayTitle}" is already added`);
      setQuery('');
      setSuggestions([]);
      return;
    }

    setLoading(true);
    const yearNum = year ? parseInt(String(year).slice(0, 4), 10) : null;
    const isTv = type === 'series';
    let image = null;

    try {
      // 1) OMDB by imdbID — the canonical single poster for that exact title
      if (OMDB_KEY && imdbID) {
        try {
          const res = await fetchWithTimeout(
            `${OMDB_BASE}?apikey=${OMDB_KEY}&i=${encodeURIComponent(imdbID)}`
          );
          const data = await res.json();
          const p = data && data.Poster && data.Poster !== 'N/A' ? data.Poster : poster;
          if (p) {
            image = {
              url: p,
              urlHD: p.replace(/SX\d+/, 'SX1200'),
              label: data.Title || title,
              kind: (data.Type || type) === 'series' ? 'TV' : 'Movie',
              year: data.Year ? parseInt(String(data.Year).slice(0, 4), 10) || data.Year : yearNum,
              source: 'OMDB',
            };
          }
        } catch { /* ignore, fall through */ }
      } else if (poster) {
        image = {
          url: poster,
          urlHD: poster.replace(/SX\d+/, 'SX1200'),
          label: title,
          kind: isTv ? 'TV' : 'Movie',
          year: yearNum,
          source: 'OMDB',
        };
      }

      // 2) Fallback to iTunes (year-matched) only if OMDB had no poster
      if (!image) {
        const itunesUrl = isTv
          ? `${ITUNES_BASE}?term=${encodeURIComponent(title)}&media=tvShow&entity=tvSeason&limit=10`
          : `${ITUNES_BASE}?term=${encodeURIComponent(title)}&media=movie&entity=movie&limit=10`;
        try {
          const res = await fetchWithTimeout(itunesUrl);
          const data = await res.json();
          const hit = (data.results || []).find(h => {
            if (!h.artworkUrl100) return false;
            if (!yearNum) return true;
            const hy = h.releaseDate ? new Date(h.releaseDate).getFullYear() : null;
            if (isTv) return hy ? hy >= yearNum : false;
            return hy ? Math.abs(hy - yearNum) <= 1 : false;
          });
          if (hit) {
            image = {
              url: resizeArtwork(hit.artworkUrl100, 600),
              urlHD: resizeArtwork(hit.artworkUrl100, 1200),
              label: hit.trackName || hit.collectionName || title,
              kind: isTv ? 'TV' : 'Movie',
              year: hit.releaseDate ? new Date(hit.releaseDate).getFullYear() : yearNum,
              source: 'iTunes',
            };
          }
        } catch { /* ignore */ }
      }

      const entry = {
        title: displayTitle,
        imdbID,
        image,
        ...(image ? {} : { error: 'No poster found' }),
      };
      addEntryWithAutoSelect(entry);
    } finally {
      setQuery('');
      setSuggestions([]);
      setLoading(false);
    }
  };

  // Append a single entry and auto-select it (up to the 4-poster cap).
  const addEntryWithAutoSelect = (entry) => {
    setResults(prev => {
      const idx = prev.length;
      if (entry.image) {
        setSelectedOrder(sel =>
          sel.length >= 4 || sel.includes(idx) ? sel : [...sel, idx]
        );
      }
      return [...prev, entry];
    });
  };

  // Remove a title (and its selection) from the results.
  const removeTitle = (idx) => {
    setResults(prev => prev.filter((_, i) => i !== idx));
    setSelectedOrder(prev => prev
      .filter(i => i !== idx)
      .map(i => (i > idx ? i - 1 : i))
    );
    setAdjustments(prev => {
      const next = {};
      Object.keys(prev).forEach(k => {
        const ki = parseInt(k, 10);
        if (ki === idx) return;
        next[ki > idx ? ki - 1 : ki] = prev[k];
      });
      return next;
    });
  };

  const toggleSelect = (titleIdx) => {
    setSelectedOrder(prev => {
      if (prev.includes(titleIdx)) return prev.filter(i => i !== titleIdx);
      if (prev.length >= 4) {
        message.info('You can select up to 4 posters for a collage');
        return prev;
      }
      return [...prev, titleIdx];
    });
  };

  const clearSelection = () => setSelectedOrder([]);

  const downloadImage = async (url, filename) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      message.error(`Failed to download: ${filename}`);
    }
  };

  const downloadSelected = async () => {
    const items = [];
    selectedOrder.forEach(tIdx => {
      const r = results[tIdx];
      if (!r || !r.image) return;
      const safeName = r.title.replace(/[^a-zA-Z0-9]/g, '_');
      items.push({ url: r.image.urlHD || r.image.url, filename: `${safeName}.jpg` });
    });

    if (items.length === 0) {
      message.warning('No posters selected');
      return;
    }

    setDownloading(true);
    message.info(`Downloading ${items.length} poster(s)...`);

    for (const item of items) {
      await downloadImage(item.url, item.filename);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setDownloading(false);
    message.success('Downloads complete!');
  };

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    message.success('Cache cleared');
  };

  // ─── Autocomplete ────────────────────────────────────────────────────────
  // Suggest based on the last comma-separated fragment.
  const getActiveFragment = (val) => {
    const parts = val.split(',');
    return {
      prefix: parts.slice(0, -1).join(',').trim(),
      term: (parts[parts.length - 1] || '').trim(),
    };
  };

  const fetchSuggestions = useCallback((term) => {
    if (!term || term.length < 2 || !OMDB_KEY) {
      setSuggestions([]);
      return;
    }
    if (suggestAbortRef.current) suggestAbortRef.current.abort();
    const controller = new AbortController();
    suggestAbortRef.current = controller;

    const url = `${OMDB_BASE}?apikey=${OMDB_KEY}&s=${encodeURIComponent(term)}`;
    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        const items = (data.Search || []).slice(0, 8).map(it => ({
          title: it.Title,
          year: it.Year,
          type: it.Type,
          imdbID: it.imdbID,
          poster: it.Poster && it.Poster !== 'N/A' ? it.Poster : null,
        }));
        // Deduplicate by imdbID (preferred) or title+year
        const seen = new Set();
        const unique = items.filter(it => {
          const k = it.imdbID || `${it.title}|${it.year}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        setSuggestions(unique);
      })
      .catch(() => { /* ignored */ });
  }, []);

  const handleQueryChange = (val) => {
    setQuery(val);
    const { term } = getActiveFragment(val);
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    suggestDebounceRef.current = setTimeout(() => fetchSuggestions(term), 300);
  };

  const handleSuggestionSelect = (_value, option) => {
    const suggestion = option?.suggestion;
    if (suggestion) {
      addExactTitle(suggestion);
    } else {
      addSingleTitle(_value);
    }
  };

  useEffect(() => () => {
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    if (suggestAbortRef.current) suggestAbortRef.current.abort();
  }, []);

  // Clamp the active slot whenever selection changes
  useEffect(() => {
    if (selectedOrder.length === 0) {
      setActiveSlot(0);
    } else if (activeSlot >= selectedOrder.length) {
      setActiveSlot(selectedOrder.length - 1);
    }
  }, [selectedOrder, activeSlot]);

  const autocompleteOptions = suggestions.map((s, i) => ({
    value: `${s.title}__${s.imdbID || s.year || i}`,
    suggestion: s,
    key: `${s.imdbID || s.title}-${s.year}-${i}`,
    label: (
      <div className="poster-suggest-item">
        {s.poster ? (
          <img src={s.poster} alt="" className="poster-suggest-thumb" />
        ) : (
          <div className="poster-suggest-thumb poster-suggest-thumb-empty">🎬</div>
        )}
        <div className="poster-suggest-meta">
          <div className="poster-suggest-title">{s.title}</div>
          <div className="poster-suggest-sub">
            {s.year}{s.type ? ` · ${s.type}` : ''}
          </div>
        </div>
      </div>
    ),
  }));

  const mobile = isMobile();
  const selectedCount = selectedOrder.length;

  // ─── Collage helpers ─────────────────────────────────────────────────────
  const handleBgUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => setCollageBg(e.target.result);
    reader.readAsDataURL(file);
    return false; // prevent antd auto-upload
  };

  // ─── Manual poster ──────────────────────────────────────────────────────────
  const openManualModal = () => {
    setManualTitle('');
    setManualImage(null);
    setManualUrl('');
    setManualOpen(true);
  };

  const handleManualImageUpload = (file) => {
    if (!file.type || !file.type.startsWith('image/')) {
      message.error('Please select an image file');
      return false;
    }
    const reader = new FileReader();
    reader.onload = (e) => setManualImage(e.target.result);
    reader.readAsDataURL(file);
    return false;
  };

  const submitManualPoster = () => {
    const title = manualTitle.trim();
    if (!title) {
      message.warning('Please enter a title');
      return;
    }
    const src = manualImage || manualUrl.trim();
    if (!src) {
      message.warning('Please upload an image or paste an image URL');
      return;
    }
    if (results.some(r => r.title.toLowerCase() === title.toLowerCase())) {
      message.info(`"${title}" is already added`);
      return;
    }
    const entry = {
      title,
      image: {
        url: src,
        urlHD: src,
        label: title,
        kind: 'Manual',
        year: null,
        source: 'Manual',
      },
    };
    addEntryWithAutoSelect(entry);
    setManualOpen(false);
    message.success(`Added "${title}"`);
  };

  const fetchAsImage = (url) => new Promise((resolve, reject) => {
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { resolve({ img, objectUrl }); };
        img.onerror = (e) => { URL.revokeObjectURL(objectUrl); reject(e); };
        img.src = objectUrl;
      })
      .catch(reject);
  });

  // Compute poster slot rectangles inside a content box [x,y,w,h] for n posters.
  // Layouts:
  //  - 2 posters: staggered diagonal — first top-left, second bottom-right.
  //  - 3 posters: pyramid — two on top row, one centered below.
  //  - 4 posters: 2x2 grid.
  // All tiles within a layout share the same size and 2:3 aspect.
  const computeSlots = (n, x, y, w, h, gap) => {
    const ASPECT = 1.5; // height / width for a standard movie poster

    const fitTile = (cols, rows, hOverlap = 0) => {
      // hOverlap shrinks the effective total height since rows overlap vertically.
      const wByW = (w - (cols - 1) * gap) / cols;
      const hAvail = h + (rows - 1) * hOverlap; // gain back overlap
      const hByH = (hAvail - (rows - 1) * gap) / rows;
      const tileW = Math.min(wByW, hByH / ASPECT);
      return { tileW, tileH: tileW * ASPECT };
    };

    if (n === 2) {
      // Staggered: two tiles arranged on a diagonal. Tile #1 sits to the left and
      // slightly higher; tile #2 sits to the right and slightly lower. They share
      // a horizontal overlap so the composition feels denser.
      const overlapX = 0.18; // 18% horizontal overlap
      // Effective horizontal footprint: 2*tileW - overlapX*tileW
      // Solve for tileW so 2*tileW*(1 - overlapX/2) fits w (with no inner gap).
      const wByW = w / (2 - overlapX);
      const offsetY = 0.18; // vertical stagger (fraction of tileH)
      // Block height: tileH * (1 + offsetY)
      const hByH = h / (1 + offsetY);
      const tileW = Math.min(wByW, hByH / ASPECT);
      const tileH = tileW * ASPECT;
      const blockW = 2 * tileW - overlapX * tileW;
      const blockH = tileH * (1 + offsetY);
      const ox = x + (w - blockW) / 2;
      const oy = y + (h - blockH) / 2;
      // Other diagonal: tile #1 top-right, tile #2 bottom-left.
      return [
        {
          x: ox + tileW - overlapX * tileW,
          y: oy,
          w: tileW,
          h: tileH,
        },
        {
          x: ox,
          y: oy + tileH * offsetY,
          w: tileW,
          h: tileH,
        },
      ];
    }

    if (n === 3) {
      // Pyramid: top row of 2, bottom row centered single. Two rows, but tiles
      // overlap vertically slightly so the bottom tile tucks under the top pair.
      const overlapY = 0.18; // 18% of tileH
      const { tileW, tileH } = fitTile(2, 2, tileForY => 0); // first pass: rough
      // We need a real solver: total width = 2*tileW + gap; total height = 2*tileH + gap - overlapY*tileH
      // i.e. (2 - overlapY)*tileH + gap. Solve for tileW vs both constraints.
      const wByW = (w - gap) / 2;
      const hByH = (h - gap) / (2 - overlapY);
      const finalW = Math.min(wByW, hByH / ASPECT);
      const finalH = finalW * ASPECT;
      void tileW; void tileH;

      const topBlockW = 2 * finalW + gap;
      const totalH = 2 * finalH + gap - overlapY * finalH;
      const ox = x + (w - topBlockW) / 2;
      const oy = y + (h - totalH) / 2;
      const row2Y = oy + finalH + gap - overlapY * finalH;
      const row2X = x + (w - finalW) / 2; // centered single tile
      return [
        { x: ox, y: oy, w: finalW, h: finalH },
        { x: ox + finalW + gap, y: oy, w: finalW, h: finalH },
        { x: row2X, y: row2Y, w: finalW, h: finalH },
      ];
    }

    // 4 posters: 2x2.
    const { tileW, tileH } = fitTile(2, 2);
    const blockW = 2 * tileW + gap;
    const blockH = 2 * tileH + gap;
    const ox = x + (w - blockW) / 2;
    const oy = y + (h - blockH) / 2;
    return [
      { x: ox, y: oy, w: tileW, h: tileH },
      { x: ox + tileW + gap, y: oy, w: tileW, h: tileH },
      { x: ox, y: oy + tileH + gap, w: tileW, h: tileH },
      { x: ox + tileW + gap, y: oy + tileH + gap, w: tileW, h: tileH },
    ];
  };

  const roundRectPath = (ctx, x, y, w, h, r) => {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };

  // Draw `img` into rect using object-fit: cover.
  const drawCover = (ctx, img, x, y, w, h) => {
    const ir = img.width / img.height;
    const tr = w / h;
    let sx, sy, sw, sh;
    if (ir > tr) {
      sh = img.height;
      sw = img.height * tr;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = img.width / tr;
      sx = 0;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };

  // Draw with cover + per-poster scale (zoom) and pan offset in -100..100 (% of pannable range).
  const drawCoverAdjusted = (ctx, img, x, y, w, h, adj) => {
    const scale = Math.max(1, adj?.scale || 1);
    const ox = (adj?.offsetX || 0) / 100; // -1..1
    const oy = (adj?.offsetY || 0) / 100;
    const ir = img.width / img.height;
    const tr = w / h;
    let sw, sh;
    if (ir > tr) {
      sh = img.height;
      sw = img.height * tr;
    } else {
      sw = img.width;
      sh = img.width / tr;
    }
    sw /= scale;
    sh /= scale;
    const maxSx = img.width - sw;
    const maxSy = img.height - sh;
    const sx = Math.min(Math.max(0, maxSx / 2 + (maxSx / 2) * ox), maxSx);
    const sy = Math.min(Math.max(0, maxSy / 2 + (maxSy / 2) * oy), maxSy);
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };

  // Render the collage to an off-screen canvas. mode: 'posters' | 'names'
  // `titleText` is the already-resolved title (counter substituted).
  const renderCollageCanvas = async (mode, titleText) => {
    const items = selectedOrder.map(i => results[i]).filter(r => r && r.image);
    const W = 1200;
    const H = 1500;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const objectUrls = [];

    try {
      // Background: user upload > default > gradient. Honors fit + adjustments.
      const activeBg = collageBg || (useDefaultBg ? DEFAULT_BG_URL : null);
      if (activeBg) {
        try {
          const bgImg = await new Promise((res, rej) => {
            const im = new Image();
            im.crossOrigin = 'anonymous';
            im.onload = () => res(im);
            im.onerror = rej;
            im.src = activeBg;
          });

          // Base color fill (visible only if 'contain' leaves bars)
          ctx.fillStyle = '#1a0b2e';
          ctx.fillRect(0, 0, W, H);

          const fit = bgAdjust.fit || 'stretch';
          const scale = Math.max(1, bgAdjust.scale || 1);
          const ox = (bgAdjust.offsetX || 0) / 100;
          const oy = (bgAdjust.offsetY || 0) / 100;

          if (fit === 'stretch') {
            // Stretch fill, then optional zoom-in via source rect cropping
            const sw = bgImg.width / scale;
            const sh = bgImg.height / scale;
            const maxSx = bgImg.width - sw;
            const maxSy = bgImg.height - sh;
            const sx = Math.min(Math.max(0, maxSx / 2 + (maxSx / 2) * ox), maxSx);
            const sy = Math.min(Math.max(0, maxSy / 2 + (maxSy / 2) * oy), maxSy);
            ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, W, H);
          } else if (fit === 'cover') {
            drawCoverAdjusted(ctx, bgImg, 0, 0, W, H, { scale, offsetX: bgAdjust.offsetX, offsetY: bgAdjust.offsetY });
          } else {
            // contain
            const ir = bgImg.width / bgImg.height;
            const tr = W / H;
            let dw, dh;
            if (ir > tr) { dw = W; dh = W / ir; } else { dh = H; dw = H * ir; }
            dw *= scale;
            dh *= scale;
            const dx = (W - dw) / 2 + ((W - dw) / 2) * ox;
            const dy = (H - dh) / 2 + ((H - dh) / 2) * oy;
            ctx.drawImage(bgImg, dx, dy, dw, dh);
          }

          const dim = Math.max(0, Math.min(0.85, bgAdjust.dim ?? 0.12));
          if (dim > 0) {
            ctx.fillStyle = `rgba(0,0,0,${dim})`;
            ctx.fillRect(0, 0, W, H);
          }
        } catch {
          ctx.fillStyle = '#1a0b2e';
          ctx.fillRect(0, 0, W, H);
        }
      } else {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#2b0a3d');
        grad.addColorStop(1, '#1a0b2e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // Title
      const titleSize = Math.max(20, Math.min(140, collageTitleSize || 56));
      const titleY = Math.max(40, Math.round(titleSize * 0.9));
      ctx.fillStyle = collageTitleColor || '#ffd84a';
      ctx.font = `bold ${titleSize}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 12;
      ctx.fillText(titleText, W / 2, titleY);
      ctx.shadowBlur = 0;

      // Posters area (top padding scales with title size)
      const padX = 80;
      const top = titleY + titleSize + 60;
      const bottom = 120;
      const slots = computeSlots(items.length, padX, top, W - padX * 2, H - top - bottom, 28);

      // Names mode: draw a simple, centered, stacked text list below the title — no cards/posters.
      if (mode === 'names') {
        const areaTop = top;
        const areaBottom = H - bottom;
        const areaH = areaBottom - areaTop;
        const maxTextW = W - padX * 2;
        const labels = items.map((it, i) => {
          const tIdx = selectedOrder[i];
          const override = (nameOverrides[tIdx] || '').trim();
          const name = override || it.title || '';
          const stars = getRating(tIdx);
          const starStr = '⭐'.repeat(stars);
          return stars > 0 ? `${i + 1}. ${name} (${starStr})` : `${i + 1}. ${name}`;
        });

        // Auto-fit font size so all lines (with reasonable line height) fit and don't overflow width.
        // Start from the user-chosen names size, then shrink only if needed.
        let fontSize = Math.max(24, Math.min(180, namesSize || 96));
        let lineH;
        for (let attempt = 0; attempt < 20; attempt++) {
          ctx.font = `bold ${fontSize}px Georgia, serif`;
          lineH = Math.round(fontSize * 1.6);
          const totalH = labels.length * lineH;
          const widest = Math.max(...labels.map(l => ctx.measureText(l).width));
          if (totalH <= areaH * 0.95 && widest <= maxTextW) break;
          fontSize = Math.max(20, Math.round(fontSize * 0.92));
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = namesColor || '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 12;
        const blockH = labels.length * lineH;
        const startY = areaTop + (areaH - blockH) / 2 + lineH / 2;
        labels.forEach((ln, i) => {
          ctx.fillText(ln, W / 2, startY + i * lineH);
        });
        ctx.shadowBlur = 0;

        const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
        return { blob, objectUrls };
      }

      // Posters mode below this point — load images
      const loaded = await Promise.all(items.map(it => fetchAsImage(it.image.urlHD || it.image.url)));
      loaded.forEach(l => objectUrls.push(l.objectUrl));

      slots.forEach((s, i) => {
        const tIdx = selectedOrder[i];
        const adj = adjustments[tIdx];

        // Outer padded "card" frame (like the sample) with shadow
        const cardR = 28;
        const innerPad = 14;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 28;
        ctx.shadowOffsetY = 10;
        roundRectPath(ctx, s.x, s.y, s.w, s.h, cardR);
        ctx.fillStyle = 'rgba(20, 8, 36, 0.55)';
        ctx.fill();
        ctx.restore();

        // Card border (subtle, matches the reference)
        ctx.save();
        roundRectPath(ctx, s.x + 1, s.y + 1, s.w - 2, s.h - 2, cardR);
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Inner poster rect (with padding)
        const ix = s.x + innerPad;
        const iy = s.y + innerPad;
        const iw = s.w - innerPad * 2;
        const ih = s.h - innerPad * 2;
        const innerR = cardR - innerPad + 4;

        ctx.save();
        roundRectPath(ctx, ix, iy, iw, ih, innerR);
        ctx.clip();
        ctx.fillStyle = '#000';
        ctx.fillRect(ix, iy, iw, ih);
        drawCoverAdjusted(ctx, loaded[i].img, ix, iy, iw, ih, adj);
        ctx.restore();

        // Inner subtle border
        ctx.save();
        roundRectPath(ctx, ix + 0.5, iy + 0.5, iw - 1, ih - 1, innerR);
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      });

      // Convert to blob
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      return { blob, objectUrls };
    } catch (e) {
      objectUrls.forEach(u => URL.revokeObjectURL(u));
      throw e;
    }
  };

  const triggerDownload = (blob, suffix, titleText) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safe = (titleText || 'collage').replace(/[^a-zA-Z0-9]+/g, '_');
    a.download = `${safe}_${suffix}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCollage = async () => {
    const items = selectedOrder.map(i => results[i]).filter(r => r && r.image);
    if (items.length < 2 || items.length > 4) {
      message.warning('Select 2 to 4 posters');
      return;
    }

    // Resolve $(Counter) using the current counter; this download will use this value,
    // then increment for next time.
    const titleText = resolveTitle(collageTitle, counter);

    setCollageRendering(true);
    const allObjectUrls = [];
    try {
      const postersOut = await renderCollageCanvas('posters', titleText);
      allObjectUrls.push(...postersOut.objectUrls);
      const namesOut = await renderCollageCanvas('names', titleText);
      allObjectUrls.push(...namesOut.objectUrls);

      if (!postersOut.blob || !namesOut.blob) {
        message.error('Failed to generate collage');
        return;
      }
      triggerDownload(postersOut.blob, 'posters', titleText);
      // Slight delay so browsers don't block the second download
      setTimeout(() => triggerDownload(namesOut.blob, 'names', titleText), 250);
      // Increment counter only on successful download (and only if template uses it).
      if (/\$\(Counter\)/i.test(collageTitle)) {
        setCounter(c => c + 1);
      }
      message.success('Posters and names collages downloaded');
    } catch (e) {
      message.error('Failed to render collage. Some images may be blocked by CORS.');
    } finally {
      allObjectUrls.forEach(u => URL.revokeObjectURL(u));
      setCollageRendering(false);
    }
  };

  return (
    <div className="poster-page">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="poster-header">
        <div className="poster-header-icon" aria-hidden="true">
          <PictureOutlined />
        </div>
        <div className="poster-header-text">
          <h1 className="poster-header-title">Poster Finder</h1>
          <p className="poster-header-sub">
            Search posters from iTunes &amp; OMDB, then build clean collages.
          </p>
        </div>
        {results.length > 0 && (
          <div className="poster-header-stats">
            <span className="poster-stat">
              <strong>{results.length}</strong>
              <em>title{results.length === 1 ? '' : 's'}</em>
            </span>
            <span className="poster-stat poster-stat-accent">
              <strong>{selectedCount}</strong>
              <em>selected</em>
            </span>
          </div>
        )}
      </header>

      {/* ── Search Card ────────────────────────────────────────── */}
      <section className="poster-search-card">
        <div className="poster-search-bar">
          <AutoComplete
            value={query}
            options={autocompleteOptions}
            onChange={handleQueryChange}
            onSelect={handleSuggestionSelect}
            style={{ flex: 1 }}
            popupClassName="poster-suggest-dropdown"
            disabled={loading}
          >
            <Input
              placeholder="Search a movie or series — e.g. Inception, Breaking Bad"
              onPressEnter={searchTitles}
              prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />}
              size="large"
              allowClear
              disabled={loading}
            />
          </AutoComplete>
          <Button
            type="primary"
            size="large"
            icon={<SearchOutlined />}
            onClick={searchTitles}
            loading={loading}
          >
            {mobile ? '' : 'Search'}
          </Button>
          <Tooltip title="Add a poster manually (when OMDB has no result)">
            <Button
              size="large"
              icon={<PlusOutlined />}
              onClick={openManualModal}
            >
              {mobile ? '' : 'Add manually'}
            </Button>
          </Tooltip>
        </div>
        <p className="poster-search-hint">
          Tip: pick from the suggestions for the most accurate poster, or paste several titles
          separated by commas.
        </p>
      </section>

      {/* ── Selected title chips ───────────────────────────────── */}
      {results.length > 0 && (
        <div className="poster-tags-bar">
          {results.map((r, idx) => (
            <Tag
              key={`tag-${idx}-${r.title}`}
              closable
              onClose={(e) => { e.preventDefault(); removeTitle(idx); }}
              className="poster-title-tag"
              color={r.error ? 'error' : 'default'}
            >
              {r.title}
            </Tag>
          ))}
        </div>
      )}

      {/* ── Action toolbar ─────────────────────────────────────── */}
      {results.length > 0 && (
        <div className="poster-action-bar">
          <div className="poster-action-left">
            <span className="poster-action-summary">
              {selectedCount > 0
                ? `${selectedCount} of ${results.length} selected`
                : `${results.length} title${results.length === 1 ? '' : 's'} ready`}
            </span>
          </div>
          <div className="poster-action-right">
            <Button icon={<DeleteOutlined />} size="middle" onClick={clearAll}>
              Clear all
            </Button>
            {selectedCount > 0 && (
              <Button size="middle" onClick={clearSelection}>
                Deselect
              </Button>
            )}
            {selectedCount >= 2 && selectedCount <= 4 && (
              <Button
                type="default"
                icon={<AppstoreOutlined />}
                size="middle"
                onClick={() => setCollageOpen(true)}
              >
                Create collage ({selectedCount})
              </Button>
            )}
            {selectedCount > 0 && (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                size="middle"
                onClick={downloadSelected}
                loading={downloading}
              >
                Download ({selectedCount})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Loading ────────────────────────────────────────────── */}
      {loading && (
        <div className="poster-loading">
          <Spin size="large" />
          <Text type="secondary" style={{ marginTop: 'var(--space-sm)' }}>
            Fetching posters…
          </Text>
        </div>
      )}

      {/* ── Results grid ───────────────────────────────────────── */}
      {!loading && results.length > 0 && (
        <div className="poster-grid">
          {results.map((result, tIdx) => {
            if (result.error || !result.image) {
              return (
                <div key={tIdx} className="poster-card poster-card-error">
                  <div className="poster-card-error-body">
                    <PictureOutlined className="poster-card-error-icon" />
                    <Text strong style={{ fontSize: 'var(--text-sm)' }}>
                      {result.title}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
                      {result.error || 'No poster found'}
                    </Text>
                    <Button
                      size="small"
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={(e) => { e.stopPropagation(); removeTitle(tIdx); }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            }

            const img = result.image;
            const orderIdx = selectedOrder.indexOf(tIdx);
            const isSelected = orderIdx !== -1;
            return (
              <div
                key={tIdx}
                className={`poster-card ${isSelected ? 'poster-card-selected' : ''}`}
                onClick={() => toggleSelect(tIdx)}
              >
                <div className="poster-img-wrapper">
                  <img src={img.url} alt={img.label} loading="lazy" />
                  {isSelected && (
                    <div className="poster-order-badge" title={`Position ${orderIdx + 1}`}>
                      {orderIdx + 1}
                    </div>
                  )}
                  {img.source && (
                    <div className={`poster-source poster-source-${img.source.toLowerCase()}`}>
                      {img.source}
                    </div>
                  )}
                  <div className="poster-overlay">
                    <Checkbox checked={isSelected} className="poster-checkbox" />
                    <div className="poster-overlay-actions">
                      <Tooltip title="Preview">
                        <Button
                          icon={<EyeOutlined />}
                          size="small"
                          shape="circle"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImg({ ...img, title: result.title });
                          }}
                        />
                      </Tooltip>
                      <Tooltip title="Download">
                        <Button
                          icon={<DownloadOutlined />}
                          size="small"
                          shape="circle"
                          onClick={(e) => {
                            e.stopPropagation();
                            const safeName = result.title.replace(/[^a-zA-Z0-9]/g, '_');
                            downloadImage(img.urlHD || img.url, `${safeName}.jpg`);
                          }}
                        />
                      </Tooltip>
                    </div>
                  </div>
                </div>
                <div className="poster-card-label">
                  <div className="poster-card-title" title={result.title}>
                    {result.title}
                  </div>
                  <div className="poster-card-meta">{img.kind}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────── */}
      {!loading && results.length === 0 && (
        <div className="poster-empty">
          <div className="poster-empty-icon">
            <PictureOutlined />
          </div>
          <h3 className="poster-empty-title">Start by searching a title</h3>
          <p className="poster-empty-sub">
            Find posters for any movie or series. Select 2–4 to build a collage.
          </p>
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        open={!!previewImg}
        onCancel={() => setPreviewImg(null)}
        footer={[
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={() => {
            if (!previewImg) return;
            const safeName = previewImg.title.replace(/[^a-zA-Z0-9]/g, '_');
            downloadImage(previewImg.urlHD || previewImg.url, `${safeName}.jpg`);
          }}>
            Download HD
          </Button>,
        ]}
        width={mobile ? '95%' : 800}
        centered
        title={previewImg?.title}
        bodyStyle={{ textAlign: 'center', padding: 'var(--space-md)' }}
      >
        {previewImg && (
          <img
            src={previewImg.urlHD || previewImg.url}
            alt={previewImg.title}
            style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 'var(--radius-md)' }}
          />
        )}
      </Modal>

      {/* ── Collage Modal ─────────────────────────────────────── */}
      <Modal
        open={collageOpen}
        onCancel={() => setCollageOpen(false)}
        title={
          <div className="collage-modal-title">
            <div className="collage-modal-title-icon" aria-hidden="true">
              <AppstoreOutlined />
            </div>
            <div className='collage-model-title-div'>
              <div>
              <div className="collage-modal-title-main">Create poster collage</div>
              <div className="collage-modal-title-sub">
                {selectedCount >= 2
                  ? `Combining ${selectedCount} poster${selectedCount === 1 ? '' : 's'} · output 1200×1500`
                  : 'Select 2 to 4 posters to start'}
              </div>
              </div>
                       {selectedCount >= 2 && (
              <div className="collage-stage-toolbar">
                <div className="collage-preview-tabs" role="tablist" aria-label="Preview mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={previewMode === 'posters'}
                    className={`collage-preview-tab ${previewMode === 'posters' ? 'active' : ''}`}
                    onClick={() => setPreviewMode('posters')}
                  >
                    <AppstoreOutlined /> Posters
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={previewMode === 'names'}
                    className={`collage-preview-tab ${previewMode === 'names' ? 'active' : ''}`}
                    onClick={() => setPreviewMode('names')}
                  >
                    <FontSizeOutlined /> Names
                  </button>
                </div>
              </div>
            )}
            </div>
               
          </div>
        }
        width={mobile ? '98%' : 1180}
        centered
        className="collage-modal"
        bodyStyle={{ padding: 0 }}
        footer={
          <div className="collage-footer">
            <div className="collage-footer-hint">
              {selectedCount >= 2 && (
                <span>
                  Downloads two PNGs: <strong>posters</strong> &amp; <strong>names</strong>.
                </span>
              )}
            </div>
            <div className="collage-footer-actions">
              <Button onClick={() => setCollageOpen(false)}>Close</Button>
              <Button
                onClick={() => setCollageBg(null)}
                disabled={!collageBg}
              >
                Reset background
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                loading={collageRendering}
                onClick={downloadCollage}
                disabled={selectedCount < 2}
              >
                Download collages
              </Button>
            </div>
          </div>
        }
      >
        <div className="collage-workspace">
          {/* ── Preview pane ───────────────────────────────────── */}
          <div className="collage-stage">
            <div className="collage-stage-canvas">
              {selectedCount < 2 ? (
                <div className="collage-stage-empty">
                  <div className="collage-stage-empty-icon">
                    <PictureOutlined />
                  </div>
                  <h4 className="collage-stage-empty-title">No posters selected</h4>
                  <Text type="secondary" style={{ maxWidth: 280 }}>
                    Pick 2 to 4 posters in the grid to start composing your collage.
                  </Text>
                </div>
              ) : (
                <div className={`collage-preview collage-preview-${selectedCount}`}>
                  {(() => {
                    const bg = collageBg || (useDefaultBg ? DEFAULT_BG_URL : null);
                    if (!bg) return null;
                    const fit = bgAdjust.fit || 'stretch';
                    const scale = Math.max(1, bgAdjust.scale || 1);
                    const tx = (bgAdjust.offsetX || 0) / 2;
                    const ty = (bgAdjust.offsetY || 0) / 2;
                    const objectFit = fit === 'stretch' ? 'fill' : fit;
                    return (
                      <img
                        src={bg}
                        alt=""
                        className="collage-preview-bg"
                        style={{
                          objectFit,
                          transform: `translate(${tx}%, ${ty}%) scale(${scale})`,
                        }}
                      />
                    );
                  })()}
                  <div
                    className="collage-preview-overlay"
                    style={{ background: `rgba(0,0,0,${bgAdjust.dim ?? 0.12})` }}
                  />
                  <div
                    className="collage-preview-title"
                    style={{
                      color: collageTitleColor,
                      fontSize: `${(collageTitleSize / 1200) * 100}cqw`,
                    }}
                  >
                    {resolveTitle(collageTitle, counter)}
                  </div>
                  <div className={`collage-grid collage-grid-${selectedCount}`}>
                    {previewMode === 'names' ? (
                      <div
                        className="collage-names-list"
                        style={{
                          color: namesColor,
                          fontSize: `${(namesSize / 1200) * 100}cqw`,
                        }}
                      >
                        {selectedOrder.map((tIdx, i) => {
                          const r = results[tIdx];
                          if (!r) return null;
                          const label = (nameOverrides[tIdx] || '').trim() || r.title || '';
                          const stars = getRating(tIdx);
                          const starStr = '⭐'.repeat(stars);
                          return (
                            <div key={tIdx} className="collage-names-line">
                              {i + 1}. {label}{stars > 0 ? ` (${starStr})` : ''}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      selectedOrder.map((tIdx, i) => {
                        const r = results[tIdx];
                        if (!r || !r.image) return null;
                        const adj = adjustments[tIdx] || { scale: 1, offsetX: 0, offsetY: 0 };
                        const isActive = activeSlot === i;
                        return (
                          <div
                            key={tIdx}
                            className={`collage-slot collage-slot-${i + 1} ${isActive ? 'collage-slot-active' : ''}`}
                            onClick={() => setActiveSlot(i)}
                          >
                            <div className="collage-slot-inner">
                              <img
                                src={r.image.url}
                                alt={r.title}
                                style={{
                                  transform: `translate(${adj.offsetX / 2}%, ${adj.offsetY / 2}%) scale(${adj.scale})`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Side panel ─────────────────────────────────────── */}
          <aside className="collage-side">
            <Tabs
              size="small"
              defaultActiveKey="title"
              className="collage-tabs"
              items={[
                {
                  key: 'title',
                  label: (<Tooltip title="Title" placement="right"><EditOutlined /></Tooltip>),
                  children: (
                    <div className="collage-tab-body">
                      <div className="collage-section">
                        <label className="collage-field-label" htmlFor="collage-heading">Heading</label>
                        <Input
                          id="collage-heading"
                          value={collageTitle}
                          onChange={(e) => setCollageTitle(e.target.value)}
                          placeholder="Watch Of The Week #$(Counter)"
                          allowClear
                        />
                        <p className="collage-field-help">
                          Use <code>$(Counter)</code> to auto-insert a number that increments on each
                          successful download.
                        </p>
                      </div>

                      <div className="collage-section">
                        <div className="collage-field-label">Counter</div>
                        <div className="collage-counter-row">
                          <InputNumber
                            size="middle"
                            min={0}
                            value={counter}
                            onChange={(v) => setCounter(Number(v) || 0)}
                            style={{ width: 110 }}
                          />
                          <Button size="middle" type="text" icon={<ReloadOutlined />} onClick={() => setCounter(1)}>
                            Reset
                          </Button>
                        </div>
                      </div>

                      <div className="collage-section">
                        <div className="collage-field-label">Appearance</div>
                        <div className="collage-adjust-row">
                          <span className="collage-adjust-label">Size</span>
                          <Slider
                            min={24}
                            max={120}
                            step={1}
                            value={collageTitleSize}
                            onChange={setCollageTitleSize}
                            tooltip={{ formatter: (v) => `${v}px` }}
                          />
                        </div>
                        <div className="collage-adjust-row">
                          <span className="collage-adjust-label">Color</span>
                          <div className="collage-color-row">
                            <input
                              type="color"
                              className="collage-color-swatch"
                              value={collageTitleColor}
                              onChange={(e) => setCollageTitleColor(e.target.value)}
                              aria-label="Title color"
                            />
                            <div className="collage-color-presets">
                              {['#ffd84a', '#ffffff', '#ff5c8a', '#5ad1ff', '#7cf08a', '#ffb142'].map(c => (
                                <button
                                  key={c}
                                  type="button"
                                  className={`collage-color-preset ${collageTitleColor.toLowerCase() === c ? 'active' : ''}`}
                                  style={{ background: c }}
                                  onClick={() => setCollageTitleColor(c)}
                                  aria-label={`Set title color ${c}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'bg',
                  label: (<Tooltip title="Background" placement="right"><BgColorsOutlined /></Tooltip>),
                  children: (
                    <div className="collage-tab-body">
                      <div className="collage-section">
                        <div className="collage-field-label">Source</div>
                        <div className="collage-bg-row">
                          <Upload
                            accept="image/*"
                            showUploadList={false}
                            beforeUpload={handleBgUpload}
                          >
                            <Button icon={<UploadOutlined />} size="middle">
                              {collageBg ? 'Change image' : 'Upload image'}
                            </Button>
                          </Upload>
                          {collageBg && (
                            <Button
                              icon={<DeleteOutlined />}
                              size="middle"
                              onClick={() => setCollageBg(null)}
                            >
                              Remove
                            </Button>
                          )}
                          <Button
                            icon={<ReloadOutlined />}
                            size="middle"
                            type="text"
                            onClick={() => setBgAdjust({ fit: 'stretch', scale: 1, offsetX: 0, offsetY: 0, dim: 0.12 })}
                          >
                            Reset adjustments
                          </Button>
                        </div>
                        <Checkbox
                          checked={useDefaultBg}
                          onChange={(e) => setUseDefaultBg(e.target.checked)}
                          disabled={!!collageBg}
                          style={{ marginTop: 10 }}
                        >
                          Use default background
                        </Checkbox>
                      </div>

                      {(collageBg || useDefaultBg) ? (
                        <div className="collage-section">
                          <div className="collage-field-label">Adjustments</div>
                          <div className="collage-adjust-row">
                            <span className="collage-adjust-label">Fit</span>
                            <Segmented
                              size="small"
                              value={bgAdjust.fit || 'stretch'}
                              onChange={(v) => setBgAdjust(prev => ({ ...prev, fit: v }))}
                              options={[
                                { label: 'Stretch', value: 'stretch' },
                                { label: 'Cover', value: 'cover' },
                                { label: 'Contain', value: 'contain' },
                              ]}
                            />
                          </div>
                          <div className="collage-adjust-row">
                            <span className="collage-adjust-label">Zoom</span>
                            <Slider min={1} max={3} step={0.05} value={bgAdjust.scale}
                              onChange={(v) => setBgAdjust(prev => ({ ...prev, scale: v }))} />
                          </div>
                          <div className="collage-adjust-row">
                            <span className="collage-adjust-label">Pan X</span>
                            <Slider min={-100} max={100} step={1} value={bgAdjust.offsetX}
                              onChange={(v) => setBgAdjust(prev => ({ ...prev, offsetX: v }))} />
                          </div>
                          <div className="collage-adjust-row">
                            <span className="collage-adjust-label">Pan Y</span>
                            <Slider min={-100} max={100} step={1} value={bgAdjust.offsetY}
                              onChange={(v) => setBgAdjust(prev => ({ ...prev, offsetY: v }))} />
                          </div>
                          <div className="collage-adjust-row">
                            <span className="collage-adjust-label">Dim</span>
                            <Slider min={0} max={0.85} step={0.01} value={bgAdjust.dim}
                              tooltip={{ formatter: (v) => `${Math.round(v * 100)}%` }}
                              onChange={(v) => setBgAdjust(prev => ({ ...prev, dim: v }))} />
                          </div>
                        </div>
                      ) : (
                        <div className="collage-empty-hint">
                          No background selected. Upload one or enable the default to adjust it.
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'posters',
                  label: (<Tooltip title="Posters" placement="right"><AppstoreOutlined /></Tooltip>),
                  disabled: selectedCount < 2,
                  children: (
                    <div className="collage-tab-body">
                      {selectedCount < 2 ? (
                        <div className="collage-empty-hint">
                          Select 2–4 posters in the grid first.
                        </div>
                      ) : (
                        <>
                          <div className="collage-section">
                            <div className="collage-field-label">Select a poster to adjust</div>
                            <div className="collage-thumbs">
                              {selectedOrder.map((tIdx, i) => {
                                const r = results[tIdx];
                                if (!r || !r.image) return null;
                                return (
                                  <button
                                    type="button"
                                    key={tIdx}
                                    className={`collage-thumb ${activeSlot === i ? 'collage-thumb-active' : ''}`}
                                    onClick={() => setActiveSlot(i)}
                                    title={r.title}
                                  >
                                    <img src={r.image.url} alt={r.title} />
                                    <span className="collage-thumb-num">{i + 1}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {selectedOrder[activeSlot] != null && (() => {
                            const tIdx = selectedOrder[activeSlot];
                            const r = results[tIdx];
                            const adj = adjustments[tIdx] || { scale: 1, offsetX: 0, offsetY: 0 };
                            const setAdj = (patch) => setAdjustments(prev => ({
                              ...prev,
                              [tIdx]: { scale: 1, offsetX: 0, offsetY: 0, ...prev[tIdx], ...patch },
                            }));
                            return (
                              <div className="collage-section collage-active-card">
                                <div className="collage-adjust-header">
                                  <div>
                                    <div className="collage-field-label" style={{ marginBottom: 2 }}>
                                      Adjust slot #{activeSlot + 1}
                                    </div>
                                    <div className="collage-active-title" title={r ? r.title : ''}>
                                      {r ? r.title : ''}
                                    </div>
                                  </div>
                                  <Button
                                    size="small"
                                    type="text"
                                    icon={<ReloadOutlined />}
                                    onClick={() => setAdjustments(prev => {
                                      const next = { ...prev };
                                      delete next[tIdx];
                                      return next;
                                    })}
                                  >
                                    Reset
                                  </Button>
                                </div>
                                <div className="collage-adjust-row">
                                  <span className="collage-adjust-label">Zoom</span>
                                  <Slider min={1} max={3} step={0.05} value={adj.scale} onChange={(v) => setAdj({ scale: v })} />
                                </div>
                                <div className="collage-adjust-row">
                                  <span className="collage-adjust-label">Pan X</span>
                                  <Slider min={-100} max={100} step={1} value={adj.offsetX} onChange={(v) => setAdj({ offsetX: v })} />
                                </div>
                                <div className="collage-adjust-row">
                                  <span className="collage-adjust-label">Pan Y</span>
                                  <Slider min={-100} max={100} step={1} value={adj.offsetY} onChange={(v) => setAdj({ offsetY: v })} />
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'names',
                  label: (<Tooltip title="Names" placement="right"><FontSizeOutlined /></Tooltip>),
                  disabled: selectedCount < 2,
                  children: (
                    <div className="collage-tab-body">
                      {selectedCount < 2 ? (
                        <div className="collage-empty-hint">
                          Select 2–4 posters in the grid first.
                        </div>
                      ) : (
                        <>
                          <div className="collage-section">
                            <div className="collage-adjust-header">
                              <div className="collage-field-label" style={{ marginBottom: 0 }}>
                                Titles &amp; ratings
                              </div>
                              <Button
                                size="small"
                                type="text"
                                icon={<ReloadOutlined />}
                                onClick={() => { setNameOverrides({}); setRatings({}); }}
                              >
                                Reset
                              </Button>
                            </div>
                            <div className="collage-names-edit">
                              {selectedOrder.map((tIdx, i) => {
                                const r = results[tIdx];
                                if (!r) return null;
                                const stars = getRating(tIdx);
                                return (
                                  <div key={tIdx} className="collage-names-edit-group">
                                    {r.image && (
                                      <img
                                        src={r.image.url}
                                        alt=""
                                        className="collage-names-edit-thumb"
                                      />
                                    )}
                                    <div className="collage-names-edit-content">
                                      <div className="collage-names-edit-row">
                                        <span className="collage-names-edit-num">{i + 1}.</span>
                                        <Input
                                          size="small"
                                          value={nameOverrides[tIdx] ?? r.title ?? ''}
                                          onChange={(e) => setNameOverrides(prev => ({ ...prev, [tIdx]: e.target.value }))}
                                          placeholder={r.title}
                                          allowClear
                                        />
                                      </div>
                                      <div className="collage-names-stars-row">
                                        <span className="collage-names-stars-label">Rating</span>
                                        <div className="collage-stars-ctrl" title={`Rating: ${stars}/5`}>
                                          <Button
                                            size="small"
                                            onClick={() => setRating(tIdx, stars - 1)}
                                            disabled={stars <= 0}
                                          >−</Button>
                                          <span className="collage-stars-val">
                                            {stars > 0 ? '⭐'.repeat(stars) : '—'}
                                          </span>
                                          <Button
                                            size="small"
                                            onClick={() => setRating(tIdx, stars + 1)}
                                            disabled={stars >= 5}
                                          >+</Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="collage-section">
                            <div className="collage-field-label">Appearance</div>
                            <div className="collage-adjust-row">
                              <span className="collage-adjust-label">Size</span>
                              <Slider
                                min={24}
                                max={160}
                                step={1}
                                value={namesSize}
                                onChange={setNamesSize}
                                tooltip={{ formatter: (v) => `${v}px` }}
                              />
                            </div>
                            <div className="collage-adjust-row">
                              <span className="collage-adjust-label">Color</span>
                              <div className="collage-color-row">
                                <input
                                  type="color"
                                  className="collage-color-swatch"
                                  value={namesColor}
                                  onChange={(e) => setNamesColor(e.target.value)}
                                  aria-label="Names color"
                                />
                                <div className="collage-color-presets">
                                  {['#ffffff', '#ffd84a', '#ff5c8a', '#5ad1ff', '#7cf08a', '#ffb142'].map(c => (
                                    <button
                                      key={c}
                                      type="button"
                                      className={`collage-color-preset ${namesColor.toLowerCase() === c ? 'active' : ''}`}
                                      style={{ background: c }}
                                      onClick={() => setNamesColor(c)}
                                      aria-label={`Set names color ${c}`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </aside>
        </div>
      </Modal>

      {/* Manual Poster Modal */}
      <Modal
        open={manualOpen}
        onCancel={() => setManualOpen(false)}
        title="Add poster manually"
        width={mobile ? '95%' : 520}
        centered
        okText="Add poster"
        onOk={submitManualPoster}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <Input
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            placeholder="Title (e.g. My Custom Movie)"
            allowClear
          />
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={handleManualImageUpload}
          >
            <Button icon={<UploadOutlined />} block>
              {manualImage ? 'Change image' : 'Upload poster image'}
            </Button>
          </Upload>
          <Input
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="…or paste an image URL"
            allowClear
            disabled={!!manualImage}
          />
          {(manualImage || manualUrl) && (
            <div className="manual-preview">
              <img
                src={manualImage || manualUrl}
                alt="preview"
                onError={() => message.warning('Image failed to load — check the URL')}
              />
            </div>
          )}
          <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
            Tip: uploaded images are embedded locally. URLs must allow cross-origin access for the
            collage download to render them; otherwise upload the file directly.
          </Text>
        </div>
      </Modal>
    </div>
  );
};

export default PosterFinder;
