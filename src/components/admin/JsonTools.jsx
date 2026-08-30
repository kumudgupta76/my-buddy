import React, { useState } from 'react';
import { Button, Input, Space, Tag, Tooltip, message } from 'antd';
import {
  CopyOutlined, FormatPainterOutlined, CheckCircleOutlined, WarningOutlined,
  CompressOutlined, ExpandAltOutlined, MinusSquareOutlined, PlusSquareOutlined,
} from '@ant-design/icons';
import { copyToClipboard } from '../../common/utils';

const { TextArea } = Input;

export const tryParseJson = (str) => {
  try {
    return { parsed: JSON.parse(str), valid: true };
  } catch (e) {
    return { parsed: null, valid: false, error: e.message };
  }
};

export const isJsonString = (str) => {
  if (typeof str !== 'string') return false;
  const trimmed = str.trim();
  return (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"'));
};

// ─── Collapsible JSON Tree ───────────────────────────────────────────────────
const JsonNode = ({ data, depth = 0, defaultExpanded = true }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (data === null) return <span style={{ color: '#94a3b8' }}>null</span>;
  if (data === undefined) return <span style={{ color: '#94a3b8' }}>undefined</span>;
  if (typeof data === 'boolean') return <span style={{ color: '#f59e0b' }}>{String(data)}</span>;
  if (typeof data === 'number') return <span style={{ color: '#06b6d4' }}>{data}</span>;
  if (typeof data === 'string') {
    // Try to parse nested JSON strings
    if (isJsonString(data)) {
      const { parsed, valid } = tryParseJson(data);
      if (valid && typeof parsed === 'object' && parsed !== null) {
        return (
          <span>
            <Tag color="purple" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>nested</Tag>
            <JsonNode data={parsed} depth={depth} defaultExpanded={depth < 1} />
          </span>
        );
      }
    }
    const display = data.length > 120 ? data.slice(0, 120) + '…' : data;
    return <span style={{ color: '#10b981' }}>"{display}"</span>;
  }

  const isArray = Array.isArray(data);
  const entries = isArray ? data.map((v, i) => [i, v]) : Object.entries(data);
  const bracket = isArray ? ['[', ']'] : ['{', '}'];

  if (entries.length === 0) {
    return <span style={{ color: '#94a3b8' }}>{bracket[0]}{bracket[1]}</span>;
  }

  return (
    <span>
      <span
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer', userSelect: 'none', color: 'var(--color-primary)' }}
      >
        {expanded
          ? <MinusSquareOutlined style={{ fontSize: 11, marginRight: 3 }} />
          : <PlusSquareOutlined style={{ fontSize: 11, marginRight: 3 }} />
        }
      </span>
      <span style={{ color: '#94a3b8' }}>{bracket[0]}</span>
      {!expanded && (
        <span
          style={{ color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 'var(--text-xs)' }}
          onClick={() => setExpanded(true)}
        > …{entries.length} items </span>
      )}
      {expanded && (
        <div style={{ paddingLeft: 18 }}>
          {entries.map(([key, val], i) => (
            <div key={key} style={{ lineHeight: 1.7 }}>
              <span style={{ color: '#e879f9' }}>{isArray ? '' : `"${key}": `}</span>
              <JsonNode data={val} depth={depth + 1} defaultExpanded={depth < 1} />
              {i < entries.length - 1 && <span style={{ color: '#94a3b8' }}>,</span>}
            </div>
          ))}
        </div>
      )}
      <span style={{ color: '#94a3b8' }}>{bracket[1]}</span>
    </span>
  );
};

export const JsonViewer = ({ value }) => {
  const [allExpanded, setAllExpanded] = useState(true);
  const [viewKey, setViewKey] = useState(0); // force remount to reset expand state

  const { parsed, valid } = tryParseJson(value);

  const toggleAll = () => {
    setAllExpanded(prev => !prev);
    setViewKey(k => k + 1);
  };

  if (!valid || (typeof parsed !== 'object') || parsed === null) {
    // Not JSON or primitive — show raw
    return (
      <pre style={{
        margin: 0, padding: 'var(--space-md)', background: 'var(--color-bg)',
        borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)',
        overflow: 'auto', maxHeight: 300, border: '1px solid var(--color-border-light)',
        whiteSpace: 'pre-wrap', wordBreak: 'break-all',
      }}>{value}</pre>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4, gap: 4 }}>
        <Tooltip title={allExpanded ? 'Collapse All' : 'Expand All'}>
          <Button
            icon={allExpanded ? <CompressOutlined /> : <ExpandAltOutlined />}
            size="small"
            onClick={toggleAll}
          />
        </Tooltip>
        <Tooltip title="Copy formatted JSON">
          <Button
            icon={<CopyOutlined />}
            size="small"
            onClick={() => {
              copyToClipboard(JSON.stringify(parsed, null, 2));
              message.success('Copied formatted JSON');
            }}
          />
        </Tooltip>
      </div>
      <pre style={{
        margin: 0, padding: 'var(--space-md)', background: 'var(--color-bg)',
        borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)',
        overflow: 'auto', maxHeight: 400, border: '1px solid var(--color-border-light)',
        fontFamily: 'var(--font-mono)', lineHeight: 1.5,
      }}>
        <JsonNode key={viewKey} data={parsed} defaultExpanded={allExpanded} />
      </pre>
    </div>
  );
};

// ─── Edit Panel with Format & Validate ───────────────────────────────────────
export const EditPanel = ({ editKey, inputValue, setInputValue, onSave, onCancel, saving }) => {
  const [validationResult, setValidationResult] = useState(null);

  const handleFormat = () => {
    const { parsed, valid } = tryParseJson(inputValue);
    if (valid) {
      setInputValue(JSON.stringify(parsed, null, 2));
      setValidationResult({ valid: true, msg: 'Formatted successfully' });
      message.success('JSON formatted');
    } else {
      message.error('Cannot format — invalid JSON');
    }
  };

  const handleMinify = () => {
    const { parsed, valid } = tryParseJson(inputValue);
    if (valid) {
      setInputValue(JSON.stringify(parsed));
      message.success('JSON minified');
    } else {
      message.error('Cannot minify — invalid JSON');
    }
  };

  const handleValidate = () => {
    const result = tryParseJson(inputValue);
    if (result.valid) {
      setValidationResult({ valid: true, msg: 'Valid JSON' });
    } else {
      setValidationResult({ valid: false, msg: result.error });
    }
  };

  const isJson = isJsonString(inputValue);

  return (
    <div className="info-card" style={{ marginTop: 'var(--space-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
          Editing: <Tag>{editKey}</Tag>
        </span>
        {isJson && (
          <Space size={4}>
            <Tooltip title="Format / Beautify JSON">
              <Button icon={<FormatPainterOutlined />} size="small" onClick={handleFormat}>Format</Button>
            </Tooltip>
            <Tooltip title="Minify JSON">
              <Button icon={<CompressOutlined />} size="small" onClick={handleMinify}>Minify</Button>
            </Tooltip>
            <Tooltip title="Validate JSON">
              <Button icon={<CheckCircleOutlined />} size="small" onClick={handleValidate}>Validate</Button>
            </Tooltip>
          </Space>
        )}
      </div>

      {validationResult && (
        <div style={{
          padding: '6px 12px',
          marginBottom: 'var(--space-sm)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-xs)',
          background: validationResult.valid ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: validationResult.valid ? '#10b981' : '#ef4444',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {validationResult.valid ? <CheckCircleOutlined /> : <WarningOutlined />}
          {validationResult.msg}
        </div>
      )}

      <TextArea
        value={inputValue}
        onChange={(e) => { setInputValue(e.target.value); setValidationResult(null); }}
        placeholder="Edit value"
        style={{
          width: '100%', marginBottom: 'var(--space-sm)',
          fontFamily: isJson ? 'var(--font-mono)' : 'inherit',
          fontSize: 'var(--text-xs)',
        }}
        rows={8}
      />
      <Space>
        <Button type="primary" onClick={onSave} loading={saving}>Save</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Space>
    </div>
  );
};
