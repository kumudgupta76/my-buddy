import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Typography, Input, Button, Spin, Modal, Checkbox, message, Empty, Tooltip, AutoComplete, Tag, Upload, Slider } from 'antd';
import {
  SearchOutlined, DownloadOutlined, DeleteOutlined,
  EyeOutlined, AppstoreOutlined, UploadOutlined, PictureOutlined, ReloadOutlined, PlusOutlined,
} from '@ant-design/icons';
import { isMobile } from '../../common/utils';
import './PosterFinder.css';

const { Title, Text } = Typography;

const ITUNES_BASE = 'https://itunes.apple.com/search';
const OMDB_BASE = 'https://www.omdbapi.com/';
const OMDB_KEY = process.env.REACT_APP_OMDB_API_KEY;
const CACHE_KEY = 'poster-finder-cache-v2';
const DEFAULT_BG_URL = `${process.env.PUBLIC_URL || ''}/assets/background.png`;

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
  const [collageTitle, setCollageTitle] = useState('Watch Of The Week # 4');
  const [collageTitleSize, setCollageTitleSize] = useState(56); // canvas px
  const [collageTitleColor, setCollageTitleColor] = useState('#ffd84a');
  const [collageBg, setCollageBg] = useState(null); // dataURL of user-uploaded bg
  const [useDefaultBg, setUseDefaultBg] = useState(true);
  // Background adjustments: fit ('stretch' | 'cover' | 'contain'), scale 1..3, offsetX/Y -100..100, dim 0..0.7
  const [bgAdjust, setBgAdjust] = useState({ fit: 'stretch', scale: 1, offsetX: 0, offsetY: 0, dim: 0.12 });
  const [collageRendering, setCollageRendering] = useState(false);
  // Per-poster adjustments keyed by titleIdx: { scale: 1..3, offsetX: -100..100, offsetY: -100..100 }
  const [adjustments, setAdjustments] = useState({});
  const [activeSlot, setActiveSlot] = useState(0); // index within selectedOrder
  // Editable names overlay (per-slot text override). Keyed by titleIdx.
  const [nameOverrides, setNameOverrides] = useState({});
  const [namesColor, setNamesColor] = useState('#ffffff');
  const [previewMode, setPreviewMode] = useState('posters'); // 'posters' | 'names'
  // Manual poster modal
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualImage, setManualImage] = useState(null); // dataURL
  const [manualUrl, setManualUrl] = useState('');
  const suggestDebounceRef = useRef(null);
  const suggestAbortRef = useRef(null);

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
    setResults(prev => {
      const have = new Set(prev.map(r => (r.imdbID || r.title).toLowerCase()));
      const merged = [...prev];
      let skipped = 0;
      fetched.forEach(entry => {
        const key = (entry.imdbID || entry.title || '').toLowerCase();
        if (have.has(key)) { skipped += 1; return; }
        have.add(key);
        merged.push(entry);
      });
      if (skipped > 0) {
        message.info(`${skipped} title(s) were already added`);
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
    setResults(prev => [...prev, entry]);
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
      setResults(prev => [...prev, entry]);
    } finally {
      setQuery('');
      setSuggestions([]);
      setLoading(false);
    }
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
    setResults(prev => [...prev, entry]);
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
  const computeSlots = (n, x, y, w, h, gap) => {
    if (n === 2) {
      const cw = (w - gap) / 2;
      return [
        { x, y, w: cw, h },
        { x: x + cw + gap, y, w: cw, h },
      ];
    }
    if (n === 3) {
      // Big left, two stacked right
      const lw = (w - gap) * 0.55;
      const rw = w - gap - lw;
      const rh = (h - gap) / 2;
      return [
        { x, y, w: lw, h },
        { x: x + lw + gap, y, w: rw, h: rh },
        { x: x + lw + gap, y: y + rh + gap, w: rw, h: rh },
      ];
    }
    // 4 posters: 2x2
    const cw = (w - gap) / 2;
    const ch = (h - gap) / 2;
    return [
      { x, y, w: cw, h: ch },
      { x: x + cw + gap, y, w: cw, h: ch },
      { x, y: y + ch + gap, w: cw, h: ch },
      { x: x + cw + gap, y: y + ch + gap, w: cw, h: ch },
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
  const renderCollageCanvas = async (mode) => {
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
      ctx.fillText(collageTitle, W / 2, titleY);
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
          return `${i + 1}. ${override || it.title || ''}`;
        });

        // Auto-fit font size so all lines (with reasonable line height) fit and don't overflow width.
        let fontSize = 96;
        let lineH;
        for (let attempt = 0; attempt < 20; attempt++) {
          ctx.font = `bold ${fontSize}px Georgia, serif`;
          lineH = Math.round(fontSize * 1.6);
          const totalH = labels.length * lineH;
          const widest = Math.max(...labels.map(l => ctx.measureText(l).width));
          if (totalH <= areaH * 0.95 && widest <= maxTextW) break;
          fontSize = Math.max(28, Math.round(fontSize * 0.92));
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

  const triggerDownload = (blob, suffix) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safe = (collageTitle || 'collage').replace(/[^a-zA-Z0-9]+/g, '_');
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

    setCollageRendering(true);
    const allObjectUrls = [];
    try {
      const postersOut = await renderCollageCanvas('posters');
      allObjectUrls.push(...postersOut.objectUrls);
      const namesOut = await renderCollageCanvas('names');
      allObjectUrls.push(...namesOut.objectUrls);

      if (!postersOut.blob || !namesOut.blob) {
        message.error('Failed to generate collage');
        return;
      }
      triggerDownload(postersOut.blob, 'posters');
      // Slight delay so browsers don't block the second download
      setTimeout(() => triggerDownload(namesOut.blob, 'names'), 250);
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
      <Title level={3} style={{ marginBottom: 'var(--space-xs)', color: 'var(--color-text)' }}>
        🎬 Poster Finder
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 'var(--space-md)' }}>
        Search for movie &amp; TV series posters from iTunes &amp; OMDB. Enter titles separated by commas.
      </Text>

      {/* Search Input */}
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
            placeholder="e.g. Inception, Breaking Bad, Interstellar"
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

      {/* Selected title tags */}
      {results.length > 0 && (
        <div className="poster-tags-bar">
          {results.map((r, idx) => (
            <Tag
              key={`tag-${idx}-${r.title}`}
              closable
              onClose={(e) => { e.preventDefault(); removeTitle(idx); }}
              className="poster-title-tag"
              color={r.error ? 'error' : 'blue'}
            >
              {r.title}
            </Tag>
          ))}
        </div>
      )}

      {/* Action Bar */}
      {results.length > 0 && (
        <div className="poster-action-bar">
          <div className="poster-action-left">
            <Text type="secondary">
              {results.length} title(s)
            </Text>
            {selectedCount > 0 && (
              <Text strong style={{ color: 'var(--color-primary)' }}>
                · {selectedCount} selected
              </Text>
            )}
          </div>
          <div className="poster-action-right">
            <Button icon={<DeleteOutlined />} size="small" onClick={clearAll}>
              Clear all
            </Button>
            {selectedCount >= 2 && selectedCount <= 4 && (
              <Button
                type="primary"
                ghost
                icon={<AppstoreOutlined />}
                size="small"
                onClick={() => setCollageOpen(true)}
              >
                Create Collage ({selectedCount})
              </Button>
            )}
            {selectedCount > 0 && (
              <>
                <Button icon={<DeleteOutlined />} size="small" onClick={clearSelection}>
                  Deselect
                </Button>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  size="small"
                  onClick={downloadSelected}
                  loading={downloading}
                >
                  Download ({selectedCount})
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="poster-loading">
          <Spin size="large" />
          <Text type="secondary" style={{ marginTop: 'var(--space-sm)' }}>Searching for posters...</Text>
        </div>
      )}

      {/* Results — one poster per title */}
      {!loading && results.length > 0 && (
        <div className="poster-grid">
          {results.map((result, tIdx) => {
            if (result.error || !result.image) {
              return (
                <div key={tIdx} className="poster-card poster-card-error">
                  <Empty
                    description={
                      <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
                        {result.error || 'No poster'} — "{result.title}"
                      </Text>
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
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
                  <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
                    {result.title} · {img.kind}
                  </Text>
                  {img.source && (
                    <div className={`poster-source poster-source-${img.source.toLowerCase()}`}>
                      {img.source}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && (
        <div className="poster-empty">
          <div className="poster-empty-icon">🎥</div>
          <Title level={5} style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-xs)' }}>
            Search for movies or TV series
          </Title>
          <Text type="secondary">
            Enter one or more titles separated by commas to find posters and images.
          </Text>
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

      {/* Collage Modal */}
      <Modal
        open={collageOpen}
        onCancel={() => setCollageOpen(false)}
        title="Create Poster Collage"
        width={mobile ? '98%' : 1080}
        centered
        className="collage-modal"
        bodyStyle={{ padding: 0 }}
        footer={[
          <Button key="cancel" onClick={() => setCollageOpen(false)}>Close</Button>,
          <Button
            key="bg-clear"
            onClick={() => setCollageBg(null)}
            disabled={!collageBg}
          >
            Reset background
          </Button>,
          <Button
            key="dl"
            type="primary"
            icon={<DownloadOutlined />}
            loading={collageRendering}
            onClick={downloadCollage}
            disabled={selectedCount < 2}
          >
            Download collages
          </Button>,
        ]}
      >
        <div className="collage-workspace">
          {/* ── Preview pane ───────────────────────────────────────── */}
          <div className="collage-stage">
            {selectedCount >= 2 && (
              <div className="collage-preview-tabs">
                <button
                  type="button"
                  className={`collage-preview-tab ${previewMode === 'posters' ? 'active' : ''}`}
                  onClick={() => setPreviewMode('posters')}
                >
                  Posters
                </button>
                <button
                  type="button"
                  className={`collage-preview-tab ${previewMode === 'names' ? 'active' : ''}`}
                  onClick={() => setPreviewMode('names')}
                >
                  Names
                </button>
              </div>
            )}
            {selectedCount < 2 ? (
              <div className="collage-stage-empty">
                <PictureOutlined style={{ fontSize: 48, opacity: 0.5 }} />
                <Text type="secondary" style={{ marginTop: 8 }}>
                  Select 2 to 4 posters in the grid to start building your collage.
                </Text>
              </div>
            ) : (
              <div
                className={`collage-preview collage-preview-${selectedCount}`}
              >
                {(() => {
                  const bg = collageBg || (useDefaultBg ? DEFAULT_BG_URL : null);
                  if (!bg) return null;
                  const fit = bgAdjust.fit || 'stretch';
                  const scale = Math.max(1, bgAdjust.scale || 1);
                  const tx = (bgAdjust.offsetX || 0) / 2; // -50..50 percent
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
                  {collageTitle}
                </div>
                <div className={`collage-grid collage-grid-${selectedCount}`}>
                  {previewMode === 'names' ? (
                    <div className="collage-names-list" style={{ color: namesColor }}>
                      {selectedOrder.map((tIdx, i) => {
                        const r = results[tIdx];
                        if (!r) return null;
                        const label = (nameOverrides[tIdx] || '').trim() || r.title || '';
                        return (
                          <div key={tIdx} className="collage-names-line">
                            {i + 1}. {label}
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

          {/* ── Side panel ─────────────────────────────────────────── */}
          <div className="collage-side">
            <div className="collage-side-section">
              <div className="collage-side-label">Title</div>
              <Input
                value={collageTitle}
                onChange={(e) => setCollageTitle(e.target.value)}
                placeholder="Watch Of The Week # 4"
                prefix={<PictureOutlined />}
                allowClear
              />
              <div className="collage-adjust-row" style={{ marginTop: 8 }}>
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

            <div className="collage-side-section">
              <div className="collage-side-label">Background</div>
              <div className="collage-bg-row">
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={handleBgUpload}
                >
                  <Button icon={<UploadOutlined />} size="small">
                    {collageBg ? 'Change' : 'Upload'}
                  </Button>
                </Upload>
                {collageBg && (
                  <Button
                    icon={<DeleteOutlined />}
                    size="small"
                    onClick={() => setCollageBg(null)}
                  >
                    Remove
                  </Button>
                )}
                <Button
                  icon={<ReloadOutlined />}
                  size="small"
                  type="text"
                  onClick={() => setBgAdjust({ fit: 'stretch', scale: 1, offsetX: 0, offsetY: 0, dim: 0.12 })}
                >
                  Reset
                </Button>
              </div>
              <Checkbox
                checked={useDefaultBg}
                onChange={(e) => setUseDefaultBg(e.target.checked)}
                disabled={!!collageBg}
                style={{ marginTop: 8 }}
              >
                Use default background
              </Checkbox>

              {(collageBg || useDefaultBg) && (
                <>
                  <div className="collage-bg-fit-row">
                    {[
                      { v: 'stretch', label: 'Stretch' },
                      { v: 'cover', label: 'Cover' },
                      { v: 'contain', label: 'Contain' },
                    ].map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        className={`collage-bg-fit ${bgAdjust.fit === opt.v ? 'active' : ''}`}
                        onClick={() => setBgAdjust(prev => ({ ...prev, fit: opt.v }))}
                      >
                        {opt.label}
                      </button>
                    ))}
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
                </>
              )}
            </div>

            {selectedCount >= 2 && (
              <div className="collage-side-section">
                <div className="collage-side-label">
                  Posters · click to adjust
                </div>
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
            )}

            {selectedCount >= 2 && (
              <div className="collage-side-section">
                <div className="collage-adjust-header">
                  <span className="collage-side-label" style={{ marginBottom: 0 }}>
                    Names · edit text for the names canvas
                  </span>
                  <Button
                    size="small"
                    type="text"
                    icon={<ReloadOutlined />}
                    onClick={() => setNameOverrides({})}
                  >
                    Reset
                  </Button>
                </div>
                <div className="collage-names-edit">
                  {selectedOrder.map((tIdx, i) => {
                    const r = results[tIdx];
                    if (!r) return null;
                    return (
                      <div key={tIdx} className="collage-names-edit-row">
                        <span className="collage-names-edit-num">{i + 1}.</span>
                        <Input
                          size="small"
                          value={nameOverrides[tIdx] ?? r.title ?? ''}
                          onChange={(e) => setNameOverrides(prev => ({ ...prev, [tIdx]: e.target.value }))}
                          placeholder={r.title}
                          allowClear
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="collage-adjust-row" style={{ marginTop: 8 }}>
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
            )}

            {selectedCount >= 2 && selectedOrder[activeSlot] != null && (() => {
              const tIdx = selectedOrder[activeSlot];
              const r = results[tIdx];
              const adj = adjustments[tIdx] || { scale: 1, offsetX: 0, offsetY: 0 };
              const setAdj = (patch) => setAdjustments(prev => ({
                ...prev,
                [tIdx]: { scale: 1, offsetX: 0, offsetY: 0, ...prev[tIdx], ...patch },
              }));
              return (
                <div className="collage-side-section">
                  <div className="collage-adjust-header">
                    <span className="collage-side-label" style={{ marginBottom: 0 }}>
                      Adjust #{activeSlot + 1}
                    </span>
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
                  <Text type="secondary" ellipsis style={{ display: 'block', fontSize: 'var(--text-xs)', marginBottom: 8 }}>
                    {r ? r.title : ''}
                  </Text>
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
          </div>
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
