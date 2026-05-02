import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Typography, Input, Button, Spin, Modal, Checkbox, message, Empty, Tooltip, AutoComplete, Tag } from 'antd';
import {
  SearchOutlined, DownloadOutlined, DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { isMobile } from '../../common/utils';
import './PosterFinder.css';

const { Title, Text } = Typography;

const ITUNES_BASE = 'https://itunes.apple.com/search';
const OMDB_BASE = 'https://www.omdbapi.com/';
const OMDB_KEY = process.env.REACT_APP_OMDB_API_KEY;
const CACHE_KEY = 'poster-finder-cache-v2';

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
  const [selected, setSelected] = useState(() => new Set()); // Set<titleIdx>
  const [loading, setLoading] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
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
    setSelected(new Set());
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
    setSelected(prev => {
      const next = new Set();
      prev.forEach(i => {
        if (i === idx) return;
        next.add(i > idx ? i - 1 : i);
      });
      return next;
    });
  };

  const toggleSelect = (titleIdx) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(titleIdx)) next.delete(titleIdx);
      else next.add(titleIdx);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

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
    results.forEach((r, tIdx) => {
      if (!selected.has(tIdx) || !r.image) return;
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
  const selectedCount = selected.size;

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
            const isSelected = selected.has(tIdx);
            return (
              <div
                key={tIdx}
                className={`poster-card ${isSelected ? 'poster-card-selected' : ''}`}
                onClick={() => toggleSelect(tIdx)}
              >
                <div className="poster-img-wrapper">
                  <img src={img.url} alt={img.label} loading="lazy" />
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
    </div>
  );
};

export default PosterFinder;
