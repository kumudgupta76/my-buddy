import React, { useState, useCallback } from 'react';
import { Typography, Input, Button, Spin, Modal, Checkbox, message, Empty, Tooltip } from 'antd';
import {
  SearchOutlined, DownloadOutlined, DeleteOutlined,
  EyeOutlined, CheckSquareOutlined,
  BorderOutlined, SwapOutlined,
} from '@ant-design/icons';
import { isMobile } from '../../common/utils';
import './PosterFinder.css';

const { Title, Text } = Typography;

const ITUNES_BASE = 'https://itunes.apple.com/search';
const CACHE_KEY = 'poster-finder-cache';

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
  const [results, setResults] = useState([]); // [{title, images: [{id, url, urlHD, label}], error?}]
  const [selected, setSelected] = useState({}); // { titleIndex: Set of image ids }
  const [loading, setLoading] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [downloading, setDownloading] = useState(false);

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
    setSelected({});
    const cache = getCachedResults();
    const newResults = [];

    for (const title of titles) {
      // Check cache
      if (cache[title.toLowerCase()]) {
        newResults.push(cache[title.toLowerCase()]);
        continue;
      }

      try {
        // Search movies first, then TV shows, combine results
        const movieUrl = `${ITUNES_BASE}?term=${encodeURIComponent(title)}&media=movie&entity=movie&limit=5`;
        const tvUrl = `${ITUNES_BASE}?term=${encodeURIComponent(title)}&media=tvShow&entity=tvSeason&limit=5`;

        const [movieRes, tvRes] = await Promise.all([
          fetchWithTimeout(movieUrl),
          fetchWithTimeout(tvUrl),
        ]);

        const movieData = await movieRes.json();
        const tvData = await tvRes.json();

        const allHits = [
          ...(movieData.results || []).map(r => ({ ...r, _kind: 'movie' })),
          ...(tvData.results || []).map(r => ({ ...r, _kind: 'tv' })),
        ];

        if (allHits.length === 0) {
          newResults.push({ title, images: [], error: 'No results found' });
          continue;
        }

        // Deduplicate by artwork URL (different editions may share the same poster)
        const seen = new Set();
        const images = [];
        for (const hit of allHits) {
          const artUrl = hit.artworkUrl100;
          if (!artUrl || seen.has(artUrl)) continue;
          seen.add(artUrl);

          const displayName = hit.trackName || hit.collectionName || title;
          images.push({
            id: `img-${images.length}`,
            url: resizeArtwork(artUrl, 600),
            urlHD: resizeArtwork(artUrl, 1200),
            label: displayName,
            kind: hit._kind === 'tv' ? 'TV' : 'Movie',
            year: hit.releaseDate ? new Date(hit.releaseDate).getFullYear() : null,
          });

          if (images.length >= 8) break;
        }

        // Pick the best display title from the top result
        const displayTitle = allHits[0].trackName || allHits[0].collectionName || title;

        const entry = { title: displayTitle, images };
        newResults.push(entry);
        cache[title.toLowerCase()] = entry;
      } catch (err) {
        const errMsg = err.name === 'AbortError' ? 'Request timed out' : (err.message || 'Network error');
        newResults.push({ title, images: [], error: errMsg });
      }
    }

    setCachedResults(cache);
    setResults(newResults);
    setLoading(false);
  }, [query]);

  const toggleSelect = (titleIdx, imgId) => {
    setSelected(prev => {
      const copy = { ...prev };
      const set = new Set(copy[titleIdx] || []);
      if (set.has(imgId)) set.delete(imgId);
      else set.add(imgId);
      copy[titleIdx] = set;
      return copy;
    });
  };

  const selectAllForTitle = (titleIdx) => {
    const images = results[titleIdx]?.images || [];
    setSelected(prev => {
      const copy = { ...prev };
      const current = new Set(copy[titleIdx] || []);
      const allSelected = images.every(img => current.has(img.id));
      if (allSelected) {
        copy[titleIdx] = new Set();
      } else {
        copy[titleIdx] = new Set(images.map(img => img.id));
      }
      return copy;
    });
  };

  const getSelectedCount = () => {
    return Object.values(selected).reduce((sum, set) => sum + set.size, 0);
  };

  const clearSelection = () => setSelected({});

  const shuffleImages = (titleIdx) => {
    setResults(prev => {
      const copy = [...prev];
      if (titleIdx === 'all') {
        copy.forEach((r, i) => {
          copy[i] = { ...r, images: [...r.images].sort(() => Math.random() - 0.5) };
        });
      } else {
        const r = copy[titleIdx];
        copy[titleIdx] = { ...r, images: [...r.images].sort(() => Math.random() - 0.5) };
      }
      return copy;
    });
  };

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
      const sel = selected[tIdx];
      if (!sel || sel.size === 0) return;
      r.images.forEach(img => {
        if (sel.has(img.id)) {
          const safeName = r.title.replace(/[^a-zA-Z0-9]/g, '_');
          items.push({ url: img.urlHD || img.url, filename: `${safeName}_${img.id}.jpg` });
        }
      });
    });

    if (items.length === 0) {
      message.warning('No images selected');
      return;
    }

    setDownloading(true);
    message.info(`Downloading ${items.length} image(s)...`);

    for (const item of items) {
      await downloadImage(item.url, item.filename);
      // Small delay between downloads to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setDownloading(false);
    message.success('Downloads complete!');
  };

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    message.success('Cache cleared');
  };

  const mobile = isMobile();
  const selectedCount = getSelectedCount();

  return (
    <div className="poster-page">
      <Title level={3} style={{ marginBottom: 'var(--space-xs)', color: 'var(--color-text)' }}>
        🎬 Poster Finder
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 'var(--space-md)' }}>
        Search for movie &amp; TV series posters. Enter titles separated by commas. No API key needed.
      </Text>

      {/* Cache clear */}
      <div className="poster-settings-bar">
        <Tooltip title="Clear cache">
          <Button icon={<DeleteOutlined />} size="small" onClick={clearCache}>Clear Cache</Button>
        </Tooltip>
      </div>

      {/* Search Input */}
      <div className="poster-search-bar">
        <Input
          placeholder="e.g. Inception, Breaking Bad, Interstellar"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onPressEnter={searchTitles}
          prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />}
          size="large"
          allowClear
          disabled={loading}
        />
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

      {/* Action Bar */}
      {results.length > 0 && (
        <div className="poster-action-bar">
          <div className="poster-action-left">
            <Text type="secondary">
              {results.length} title(s) · {results.reduce((s, r) => s + r.images.length, 0)} images
            </Text>
            {selectedCount > 0 && (
              <Text strong style={{ color: 'var(--color-primary)' }}>
                · {selectedCount} selected
              </Text>
            )}
          </div>
          <div className="poster-action-right">
            <Tooltip title="Shuffle all">
              <Button icon={<SwapOutlined />} size="small" onClick={() => shuffleImages('all')} />
            </Tooltip>
            {selectedCount > 0 && (
              <>
                <Button icon={<DeleteOutlined />} size="small" onClick={clearSelection}>
                  Clear
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

      {/* Results */}
      {!loading && results.map((result, tIdx) => (
        <div key={tIdx} className="poster-title-group">
          <div className="poster-title-header">
            <div className="poster-title-info">
              <Title level={4} style={{ margin: 0 }}>{result.title}</Title>
              {!result.error && (
                <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
                  {result.images.length} image(s)
                </Text>
              )}
            </div>
            <div className="poster-title-actions">
              <Tooltip title="Shuffle">
                <Button icon={<SwapOutlined />} size="small" onClick={() => shuffleImages(tIdx)} />
              </Tooltip>
              <Tooltip title={
                results[tIdx]?.images?.length > 0 &&
                results[tIdx].images.every(img => selected[tIdx]?.has(img.id))
                  ? 'Deselect all' : 'Select all'
              }>
                <Button
                  icon={
                    results[tIdx]?.images?.length > 0 &&
                    results[tIdx].images.every(img => selected[tIdx]?.has(img.id))
                      ? <CheckSquareOutlined /> : <BorderOutlined />
                  }
                  size="small"
                  onClick={() => selectAllForTitle(tIdx)}
                />
              </Tooltip>
            </div>
          </div>

          {result.error ? (
            <div className="poster-error">
              <Empty
                description={<Text type="secondary">{result.error} for "{result.title}"</Text>}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : result.images.length === 0 ? (
            <div className="poster-error">
              <Empty
                description={<Text type="secondary">No images found for "{result.title}"</Text>}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : (
            <div className="poster-grid">
              {result.images.map(img => {
                const isSelected = selected[tIdx]?.has(img.id);
                return (
                  <div
                    key={img.id}
                    className={`poster-card ${isSelected ? 'poster-card-selected' : ''}`}
                    onClick={() => toggleSelect(tIdx, img.id)}
                  >
                    <div className="poster-img-wrapper">
                      <img
                        src={img.url}
                        alt={img.label}
                        loading="lazy"
                      />
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
                                downloadImage(img.urlHD || img.url, `${safeName}_${img.id}.jpg`);
                              }}
                            />
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                    <div className="poster-card-label">
                      <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
                        {img.label}{img.year ? ` (${img.year})` : ''} · {img.kind}
                      </Text>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

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
            downloadImage(previewImg.urlHD || previewImg.url, `${safeName}_${previewImg.id}.jpg`);
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
