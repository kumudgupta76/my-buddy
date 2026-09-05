import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Table, Button, Space, message, Tooltip, Tag, Modal, Spin, Alert } from 'antd';
import { EditOutlined, DeleteOutlined, CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import { copyToClipboard, COLLECTION_NAME } from '../../common/utils';
import { fetchData, saveData, deleteFields } from '../../common/dbUtils';
import { UserContext } from '../../common/UserContext';
import { JsonViewer, EditPanel, tryParseJson } from './JsonTools';

// The whole account lives in one Firestore document, so keep an eye on the 1MB cap.
const DOC_SIZE_LIMIT = 1024 * 1024;
const DOC_SIZE_WARN = 0.7 * DOC_SIZE_LIMIT;

const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const byteSize = (value) => new Blob([JSON.stringify(value ?? null)]).size;

const DbStorageManager = () => {
    const { user } = useContext(UserContext);
    const [rows, setRows] = useState([]);
    const [docSize, setDocSize] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editKey, setEditKey] = useState(null);
    const [inputValue, setInputValue] = useState('');

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const res = await fetchData(COLLECTION_NAME, user.uid);
        if (res.success) {
            const data = res.data || {};
            setRows(Object.keys(data).sort().map(key => ({
                key,
                value: JSON.stringify(data[key], null, 2),
                size: byteSize(data[key]),
                count: Array.isArray(data[key]) ? data[key].length : null,
            })));
            setDocSize(byteSize(data));
        } else {
            setRows([]);
            setDocSize(0);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => { load(); }, [load]);

    const handleEdit = (key) => {
        const row = rows.find(r => r.key === key);
        if (!row) return;
        setEditKey(key);
        setInputValue(row.value);
    };

    const handleSave = async () => {
        const { parsed, valid, error } = tryParseJson(inputValue);
        if (!valid) {
            message.error(`Invalid JSON — ${error}`);
            return;
        }
        setSaving(true);
        const res = await saveData(COLLECTION_NAME, user.uid, { [editKey]: parsed });
        setSaving(false);
        if (!res.success) {
            message.error('Could not save the change');
            return;
        }
        message.success(`"${editKey}" updated`);
        setEditKey(null);
        setInputValue('');
        load();
    };

    const handleDelete = (key) => {
        Modal.confirm({
            title: `Delete "${key}"?`,
            content: 'This removes the field from your Firestore document and cannot be undone.',
            okText: 'Delete',
            okButtonProps: { danger: true },
            onOk: async () => {
                const res = await deleteFields(COLLECTION_NAME, user.uid, [key]);
                if (!res.success) {
                    message.error('Could not delete the field');
                    return;
                }
                message.success(`"${key}" deleted`);
                if (editKey === key) setEditKey(null);
                load();
            },
        });
    };

    const handleBackupJson = () => {
        const all = rows.reduce((acc, row) => {
            acc[row.key] = tryParseJson(row.value).parsed;
            return acc;
        }, {});
        const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `firestoreBackup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const handleRestoreJson = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const { parsed, valid } = tryParseJson(reader.result);
            if (!valid || typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                message.error('That file is not a JSON object');
                return;
            }
            Modal.confirm({
                title: 'Restore from backup?',
                content: `This overwrites ${Object.keys(parsed).length} field(s) in your document.`,
                okText: 'Restore',
                onOk: async () => {
                    const res = await saveData(COLLECTION_NAME, user.uid, parsed);
                    if (!res.success) {
                        message.error('Restore failed');
                        return;
                    }
                    message.success('Data restored');
                    load();
                },
            });
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const columns = [
        {
            title: 'Field',
            dataIndex: 'key',
            key: 'key',
            render: (key, record) => (
                <Space size={6}>
                    <span style={{ fontWeight: 500 }}>{key}</span>
                    {record.count != null && <Tag>{record.count} items</Tag>}
                    <Tag color="blue">{formatBytes(record.size)}</Tag>
                </Space>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 160,
            render: (_, record) => (
                <Space>
                    <Tooltip title="Copy value">
                        <Button icon={<CopyOutlined />} onClick={() => copyToClipboard(record.value)} />
                    </Tooltip>
                    <Tooltip title="Edit value">
                        <Button icon={<EditOutlined />} onClick={() => handleEdit(record.key)} />
                    </Tooltip>
                    <Tooltip title="Delete field">
                        <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.key)} />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    if (!user) return null;

    return (
        <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
            <div className="action-bar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-md)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                    <Button onClick={load} icon={<ReloadOutlined />}>Refresh</Button>
                    <Button onClick={handleBackupJson} type="primary">Backup to JSON</Button>
                    <Button onClick={() => document.getElementById('dbRestoreFileInput').click()}>
                        Restore from JSON
                    </Button>
                </div>
                <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreJson}
                    style={{ display: 'none' }}
                    id="dbRestoreFileInput"
                />
                {docSize > DOC_SIZE_WARN && (
                    <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 'var(--space-md)' }}
                        message="This document is getting large"
                        description={`Firestore limits a document to 1 MB. Yours is ${formatBytes(docSize)}.`}
                    />
                )}

                <div className="section-header" style={{ flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                    <h3 style={{ flexShrink: 0 }}>
                        Cloud Data
                        <span className="badge">{rows.length}</span>
                    </h3>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', minWidth: 0, overflowWrap: 'anywhere' }}>
                        {COLLECTION_NAME}/{user.uid} · {formatBytes(docSize)} of {formatBytes(DOC_SIZE_LIMIT)}
                    </span>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-lg)' }}><Spin /></div>
                ) : (
                    <Table
                        dataSource={rows}
                        columns={columns}
                        rowKey="key"
                        size="middle"
                        scroll={{ x: 'max-content' }}
                        pagination={false}
                        expandable={{ expandedRowRender: (record) => <JsonViewer value={record.value} /> }}
                    />
                )}

                {editKey !== null && (
                    <EditPanel
                        editKey={editKey}
                        inputValue={inputValue}
                        setInputValue={setInputValue}
                        onSave={handleSave}
                        onCancel={() => setEditKey(null)}
                        saving={saving}
                    />
                )}
            </div>
        </div>
    );
};

export default DbStorageManager;
