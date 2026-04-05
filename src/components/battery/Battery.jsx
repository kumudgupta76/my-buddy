import { Typography, Progress, Spin, Table, Button, Tooltip, Row, Col, message } from 'antd'
import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  LoadingOutlined, ThunderboltOutlined, DeleteOutlined,
  HistoryOutlined, DashboardOutlined, BarChartOutlined,
  ArrowUpOutlined, ArrowDownOutlined, PauseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import './Battery.css';

const { Title, Text } = Typography;

const STORAGE_KEY = 'battery-history';
const SAMPLE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Simple SVG Line Chart ──────────────────────────────────────────────────
const BatteryChart = ({ data, height = 220 }) => {
  if (!data || data.length < 2) {
    return (
      <div className="chart-empty">
        <BarChartOutlined style={{ fontSize: 32, opacity: 0.3 }} />
        <Text type="secondary" style={{ fontSize: 'var(--text-sm)' }}>
          Need at least 2 data points to render chart
        </Text>
      </div>
    );
  }

  const width = 600;
  const padding = { top: 20, right: 20, bottom: 40, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minTime = data[0].timestamp;
  const maxTime = data[data.length - 1].timestamp;
  const timeRange = maxTime - minTime || 1;

  const toX = (ts) => padding.left + ((ts - minTime) / timeRange) * chartW;
  const toY = (lvl) => padding.top + chartH - (lvl / 100) * chartH;

  // Build path
  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(d.timestamp).toFixed(1)},${toY(d.level).toFixed(1)}`)
    .join(' ');

  // Gradient fill area
  const areaD = pathD
    + ` L${toX(data[data.length - 1].timestamp).toFixed(1)},${(padding.top + chartH).toFixed(1)}`
    + ` L${toX(data[0].timestamp).toFixed(1)},${(padding.top + chartH).toFixed(1)} Z`;

  // Y-axis labels
  const yLabels = [0, 25, 50, 75, 100];

  // X-axis labels (up to 6)
  const xLabelCount = Math.min(6, data.length);
  const xLabels = [];
  for (let i = 0; i < xLabelCount; i++) {
    const idx = Math.round((i / (xLabelCount - 1)) * (data.length - 1));
    xLabels.push(data[idx]);
  }

  // Charging segments (green dots)
  const chargingPoints = data.filter(d => d.charging);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="battery-chart-svg">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yLabels.map(v => (
        <g key={v}>
          <line
            x1={padding.left} y1={toY(v)}
            x2={padding.left + chartW} y2={toY(v)}
            stroke="var(--color-border-light)" strokeWidth="1"
          />
          <text
            x={padding.left - 8} y={toY(v) + 4}
            textAnchor="end" fontSize="11" fill="var(--color-text-muted)"
          >{v}%</text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaD} fill="url(#lineGrad)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* Data points */}
      {data.map((d, i) => (
        <circle key={i} cx={toX(d.timestamp)} cy={toY(d.level)} r="3"
          fill={d.charging ? 'var(--color-success)' : 'var(--color-primary)'}
          stroke="var(--color-surface)" strokeWidth="1.5"
        />
      ))}

      {/* Charging indicators */}
      {chargingPoints.map((d, i) => (
        <text key={`c${i}`} x={toX(d.timestamp)} y={toY(d.level) - 10}
          textAnchor="middle" fontSize="10" fill="var(--color-success)">⚡</text>
      ))}

      {/* X-axis labels */}
      {xLabels.map((d, i) => (
        <text key={`x${i}`}
          x={toX(d.timestamp)} y={padding.top + chartH + 20}
          textAnchor="middle" fontSize="10" fill="var(--color-text-muted)"
        >{dayjs(d.timestamp).format('HH:mm')}</text>
      ))}

      {/* X-axis date (first point) */}
      <text
        x={padding.left + chartW / 2} y={padding.top + chartH + 35}
        textAnchor="middle" fontSize="10" fill="var(--color-text-muted)"
      >{dayjs(data[0].timestamp).format('MMM D')} – {dayjs(data[data.length - 1].timestamp).format('MMM D, YYYY')}</text>
    </svg>
  );
};

// ─── Stats Helpers ───────────────────────────────────────────────────────────
const computeStats = (history) => {
  if (!history || history.length === 0) return null;

  const levels = history.map(h => h.level);
  const avg = Math.round(levels.reduce((a, b) => a + b, 0) / levels.length);
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  const current = history[history.length - 1];

  // Drain/charge rate: level change per hour over last N samples
  let ratePerHour = null;
  if (history.length >= 2) {
    const recent = history.slice(-12); // last ~1 hour (12 x 5min)
    const first = recent[0];
    const last = recent[recent.length - 1];
    const hoursDiff = (last.timestamp - first.timestamp) / (1000 * 60 * 60);
    if (hoursDiff > 0) {
      ratePerHour = ((last.level - first.level) / hoursDiff).toFixed(1);
    }
  }

  // Time on battery vs charging
  let chargingMs = 0;
  let dischargingMs = 0;
  for (let i = 1; i < history.length; i++) {
    const dt = history[i].timestamp - history[i - 1].timestamp;
    if (history[i - 1].charging) {
      chargingMs += dt;
    } else {
      dischargingMs += dt;
    }
  }

  const totalMs = chargingMs + dischargingMs;
  const chargingPct = totalMs > 0 ? Math.round((chargingMs / totalMs) * 100) : 0;

  // Estimated time remaining (simple linear projection from recent rate)
  let estimatedMins = null;
  if (ratePerHour !== null && Number(ratePerHour) < 0 && !current.charging) {
    const minsLeft = (current.level / Math.abs(Number(ratePerHour))) * 60;
    estimatedMins = Math.round(minsLeft);
  } else if (ratePerHour !== null && Number(ratePerHour) > 0 && current.charging) {
    const minsToFull = ((100 - current.level) / Number(ratePerHour)) * 60;
    estimatedMins = Math.round(minsToFull);
  }

  // Sessions: count transitions from charging→discharging
  let sessions = 0;
  for (let i = 1; i < history.length; i++) {
    if (history[i - 1].charging && !history[i].charging) sessions++;
  }

  return {
    avg, min, max, current, ratePerHour,
    chargingPct, dischargingPct: 100 - chargingPct,
    estimatedMins, sessions,
    totalSamples: history.length,
    firstSample: history[0].timestamp,
    lastSample: history[history.length - 1].timestamp,
  };
};

const formatDuration = (mins) => {
  if (mins == null) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

// ─── Main Component ─────────────────────────────────────────────────────────
const Battery = () => {
  const conicColors = {
    '0%': '#ef4444',
    '50%': '#f59e0b',
    '100%': '#10b981'
  };

  const [value, setValue] = useState(0);
  const [charging, setCharging] = useState(false);
  const [batterySupported, setBatterySupported] = useState(true);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | history
  const lastSampleRef = useRef(0);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      setHistory(stored);
    } catch {
      setHistory([]);
    }
  }, []);

  // Save history to localStorage
  const persistHistory = useCallback((newHistory) => {
    setHistory(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  }, []);

  // Record a sample if enough time has passed
  const recordSample = useCallback((level, isCharging) => {
    const now = Date.now();
    if (now - lastSampleRef.current < SAMPLE_INTERVAL_MS) return;
    lastSampleRef.current = now;

    const entry = { timestamp: now, level, charging: isCharging };
    setHistory(prev => {
      const updated = [...prev, entry];
      // Keep max 2016 samples (~7 days at 5min intervals)
      const trimmed = updated.length > 2016 ? updated.slice(-2016) : updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      return trimmed;
    });
  }, []);

  // Battery API polling
  useEffect(() => {
    if (!('getBattery' in navigator)) {
      setBatterySupported(false);
      return;
    }

    let intervalId;
    let batteryRef;

    const setup = async () => {
      try {
        batteryRef = await navigator.getBattery();
        const update = () => {
          const pct = Math.round(batteryRef.level * 100);
          setValue(pct);
          setCharging(batteryRef.charging);
          recordSample(pct, batteryRef.charging);
        };
        update();
        batteryRef.addEventListener('levelchange', update);
        batteryRef.addEventListener('chargingchange', update);
        intervalId = setInterval(update, 60000); // also poll every minute
      } catch {
        setBatterySupported(false);
      }
    };

    setup();
    return () => {
      clearInterval(intervalId);
    };
  }, [recordSample]);

  const clearHistory = () => {
    persistHistory([]);
    lastSampleRef.current = 0;
    message.success('Battery history cleared');
  };

  const stats = computeStats(history);

  // Table columns for history log
  const historyColumns = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'time',
      render: (ts) => dayjs(ts).format('MMM D, HH:mm'),
      sorter: (a, b) => a.timestamp - b.timestamp,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      render: (lvl) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress percent={lvl} size="small" strokeColor={lvl > 50 ? '#10b981' : lvl > 20 ? '#f59e0b' : '#ef4444'} showInfo={false} style={{ width: 60 }} />
          <span>{lvl}%</span>
        </div>
      ),
      sorter: (a, b) => a.level - b.level,
    },
    {
      title: 'Status',
      dataIndex: 'charging',
      key: 'charging',
      render: (c) => (
        <span className={`battery-status-tag ${c ? 'charging' : 'discharging'}`}>
          {c ? '⚡ Charging' : '🔋 On Battery'}
        </span>
      ),
      filters: [
        { text: 'Charging', value: true },
        { text: 'On Battery', value: false },
      ],
      onFilter: (val, record) => record.charging === val,
    },
  ];

  if (!batterySupported) {
    return (
      <div className="outer-container">
        <div className="empty-state">
          <ThunderboltOutlined className="empty-state-icon" />
          <Title level={4} style={{ color: 'var(--color-text-muted)' }}>Battery Status API not supported</Title>
          <Text type="secondary">Your browser doesn't support the Battery Status API</Text>
        </div>
      </div>
    );
  }

  if (value === 0) {
    return (
      <div className="outer-container">
        <div className="loading-container">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: 'var(--color-primary)' }} spin />} />
          <Text type="secondary">Reading battery status...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="battery-page">
      {/* Tab Switcher */}
      <div className="battery-tabs">
        <button
          className={`battery-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <DashboardOutlined /> Dashboard
        </button>
        <button
          className={`battery-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <HistoryOutlined /> History ({history.length})
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <>
          {/* Live Battery Card */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={10}>
              <div className="info-card battery-live-card">
                <div className="battery-live-header">
                  <ThunderboltOutlined style={{ fontSize: 20, color: charging ? 'var(--color-success)' : 'var(--color-primary)' }} />
                  <Text strong style={{ fontSize: 'var(--text-lg)' }}>Live Status</Text>
                  <span className={`battery-status-tag ${charging ? 'charging' : 'discharging'}`}>
                    {charging ? '⚡ Charging' : '🔋 On Battery'}
                  </span>
                </div>
                <div style={{ textAlign: 'center', padding: 'var(--space-md) 0' }}>
                  <Progress type='dashboard' percent={value} strokeColor={conicColors} strokeWidth={10}
                    format={(pct) => (
                      <div>
                        <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>{pct}%</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                          {stats?.estimatedMins != null
                            ? (charging ? `~${formatDuration(stats.estimatedMins)} to full` : `~${formatDuration(stats.estimatedMins)} left`)
                            : 'Calculating...'}
                        </div>
                      </div>
                    )}
                  />
                </div>
                <Progress steps={10} percent={value} strokeWidth={16} strokeColor={value > 50 ? '#10b981' : value > 20 ? '#f59e0b' : '#ef4444'} />
              </div>
            </Col>

            {/* Stats Cards */}
            <Col xs={24} md={14}>
              <Row gutter={[12, 12]}>
                <Col xs={12}>
                  <div className="info-card stat-card">
                    <Text type="secondary" className="stat-card-label">Average Level</Text>
                    <div className="stat-card-value">{stats?.avg ?? '—'}%</div>
                    <Progress percent={stats?.avg ?? 0} showInfo={false} size="small" strokeColor="var(--color-primary)" />
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="info-card stat-card">
                    <Text type="secondary" className="stat-card-label">
                      {stats?.ratePerHour != null && Number(stats.ratePerHour) >= 0 ? 'Charge Rate' : 'Drain Rate'}
                    </Text>
                    <div className="stat-card-value">
                      {stats?.ratePerHour != null ? (
                        <span style={{ color: Number(stats.ratePerHour) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {Number(stats.ratePerHour) >= 0
                            ? <><ArrowUpOutlined /> +{stats.ratePerHour}</>
                            : <><ArrowDownOutlined /> {stats.ratePerHour}</>
                          }
                        </span>
                      ) : '—'}
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}> %/hr</span>
                    </div>
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="info-card stat-card">
                    <Text type="secondary" className="stat-card-label">Min / Max</Text>
                    <div className="stat-card-value">
                      <span style={{ color: 'var(--color-danger)' }}>{stats?.min ?? '—'}</span>
                      <span style={{ color: 'var(--color-text-muted)', margin: '0 4px' }}>/</span>
                      <span style={{ color: 'var(--color-success)' }}>{stats?.max ?? '—'}</span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>%</span>
                    </div>
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="info-card stat-card">
                    <Text type="secondary" className="stat-card-label">Charge Sessions</Text>
                    <div className="stat-card-value">
                      <ThunderboltOutlined style={{ color: 'var(--color-warning)', marginRight: 4 }} />
                      {stats?.sessions ?? 0}
                    </div>
                  </div>
                </Col>
                <Col xs={24}>
                  <div className="info-card stat-card">
                    <Text type="secondary" className="stat-card-label">Time Split</Text>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>⚡ Charging</Text>
                        <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>{stats?.chargingPct ?? 0}%</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <Progress
                          percent={stats?.chargingPct ?? 0}
                          success={{ percent: stats?.chargingPct ?? 0 }}
                          showInfo={false}
                          size="small"
                          style={{ marginTop: 6 }}
                        />
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>🔋 Battery</Text>
                        <div style={{ fontWeight: 600, color: 'var(--color-warning)' }}>{stats?.dischargingPct ?? 0}%</div>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>

          {/* Chart */}
          <div className="info-card" style={{ marginTop: 'var(--space-md)', padding: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <Text strong><BarChartOutlined /> Battery Level Over Time</Text>
              <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
                {history.length} samples &middot; every 5 min
              </Text>
            </div>
            <BatteryChart data={history} />
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginTop: 'var(--space-sm)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', marginRight: 4, verticalAlign: 'middle' }} />
                On Battery
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', marginRight: 4, verticalAlign: 'middle' }} />
                Charging
              </span>
            </div>
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="info-card" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <div>
              <Text strong>Battery Log</Text>
              {stats && (
                <Text type="secondary" style={{ fontSize: 'var(--text-xs)', display: 'block' }}>
                  Tracking since {dayjs(stats.firstSample).format('MMM D, YYYY HH:mm')}
                </Text>
              )}
            </div>
            <Tooltip title="Clear all history">
              <Button icon={<DeleteOutlined />} danger size="small" onClick={clearHistory}>
                Clear
              </Button>
            </Tooltip>
          </div>
          <Table
            dataSource={history.map((h, i) => ({ ...h, key: i }))}
            columns={historyColumns}
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] }}
            scroll={{ x: 'max-content' }}
          />
        </div>
      )}
    </div>
  );
};

export default Battery;
