import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Space, message, Tooltip, Tag } from 'antd';
import {
  EditOutlined, DeleteOutlined, CopyOutlined,
  FormatPainterOutlined, CheckCircleOutlined, WarningOutlined,
  CompressOutlined, ExpandAltOutlined, MinusSquareOutlined, PlusSquareOutlined,
} from '@ant-design/icons';
import { copyToClipboard } from '../../common/utils';

const { TextArea } = Input;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const tryParseJson = (str) => {
  try {
    return { parsed: JSON.parse(str), valid: true };
  } catch (e) {
    return { parsed: null, valid: false, error: e.message };
  }
};

const isJsonString = (str) => {
  if (typeof str !== 'string') return false;
  const trimmed = str.trim();
  return (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"'));
};

// ─── Collapsible JSON Tree ───────────────────────────────────────────────────
const JsonNode = ({ data, label, depth = 0, defaultExpanded = true }) => {
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

const JsonViewer = ({ value }) => {
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
const EditPanel = ({ editKey, inputValue, setInputValue, onSave, onCancel }) => {
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
        <Button type="primary" onClick={onSave}>Save</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Space>
    </div>
  );
};

const LocalStorageManager = () => {
  const [data, setData] = useState([]);
  const [editKey, setEditKey] = useState(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    // Load all key-value pairs from localStorage
    const localData = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      localData.push({ key, value });
    }
    setData(localData);
  }, []);

  const handleEdit = (key) => {
    setEditKey(key);
    const item = data.find(d => d.key === key);
    if (item) {
      setInputValue(item.value);
    }
  };

  const handleCopy = (key) => {
    let textToCopy = JSON.stringify(data.find(d => d.key === key).value);
    copyToClipboard(textToCopy);
  }

  const handleSave = () => {
    localStorage.setItem(editKey, inputValue);
    const newData = data.map(item =>
      item.key === editKey ? { ...item, value: inputValue } : item
    );
    setData(newData);
    message.success('Data updated successfully!');
    setEditKey(null);
    setInputValue('');
  };

  const handleDelete = (key) => {
    localStorage.removeItem(key);
    const newData = data.filter(item => item.key !== key);
    setData(newData);
    message.success('Data deleted successfully!');
  };

  const columns = [
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      width: '50%',
    },
    // {
    //   title: 'Value',
    //   dataIndex: 'value',
    //   key: 'value',
    // },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: "50%",
      render: (_, record) => (
        <Space>
          <Tooltip title="Copy Entry">
            <Button
              icon={<CopyOutlined />}
              onClick={() => handleCopy(record.key)}
            />
          </Tooltip>
          <Tooltip title="Edit Entry">
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEdit(record.key)}
            /></Tooltip>
          <Tooltip title="Delete Entry">
            <Button
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.key)}
              danger
            />
          </Tooltip>

        </Space>
      ),
    },
  ];
  const [backupString, setBackupString] = useState('');

  const handleBackup = () => {
    const backup = backupLocalStorage();
    setBackupString(backup);
    copyToClipboard(backup);
  };

  const handleRestore = () => {
    restoreLocalStorage(backupString);
    alert('LocalStorage has been restored.');
  };
  function backupLocalStorage() {
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      backup[key] = value;
    }
    return JSON.stringify(backup);
  }

  function restoreLocalStorage(backupString) {
    const backup = JSON.parse(backupString);
    for (const key in backup) {
      if (backup.hasOwnProperty(key)) {
        localStorage.setItem(key, backup[key]);
      }
    }
  }

  const handleBackupJson = () => {
    // Retrieve all keys and values from localStorage
    const allData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      allData[key] = value;
    }

    // Convert the data into a JSON string
    const jsonData = JSON.stringify(allData, null, 2);

    // Create a Blob from the JSON string
    const blob = new Blob([jsonData], { type: 'application/json' });

    // Create a download link programmatically without appending it to the document
    const now = new Date();
    const timestamp = now.getFullYear().toString()
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0')
      + '_' + String(now.getHours()).padStart(2, '0')
      + String(now.getMinutes()).padStart(2, '0')
      + String(now.getSeconds()).padStart(2, '0');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `localStorageBackup_${timestamp}.json`;

    // Trigger the download
    link.click();
  };

  // Function to handle the restore (reading the uploaded file)
  const handleRestoreJson = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const restoredData = JSON.parse(reader.result);
          // Restore each key-value pair from the JSON data into localStorage
          for (const key in restoredData) {
            if (restoredData.hasOwnProperty(key)) {
              localStorage.setItem(key, restoredData[key]);
            }
          }
          alert('Data restored successfully!');
        } catch (error) {
          alert('Error: Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
      {/* Action Bar */}
      <div className="action-bar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <Button onClick={handleBackup} type="primary">Backup</Button>
          <Button onClick={handleRestore}>Restore</Button>
          <Button onClick={handleBackupJson}>Backup to JSON</Button>
          <Button onClick={() => document.getElementById('restoreFileInput').click()}>Restore from JSON</Button>
        </div>
        <input
          type="file"
          accept=".json"
          onChange={handleRestoreJson}
          style={{ display: 'none' }}
          id="restoreFileInput"
        />
        <TextArea
          value={backupString}
          onChange={(e) => setBackupString(e.target.value)}
          rows="3"
          placeholder='Paste backup string here...'
          style={{ width: '100%', borderRadius: 'var(--radius-sm)' }}
        />
      </div>

      <div className="section-header">
        <h3>
          Local Storage Data
          <span className="badge">{data.length}</span>
        </h3>
      </div>

      <Table dataSource={data} columns={columns} rowKey="key" size="middle" expandable={{
        expandedRowRender: (record) => <JsonViewer value={record.value} />,
      }} />

      {editKey !== null && (
        <EditPanel
          editKey={editKey}
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSave={handleSave}
          onCancel={() => setEditKey(null)}
        />
      )}
    </div>
  );
};

export default LocalStorageManager;
