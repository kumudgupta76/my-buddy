import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button, Table, Input, DatePicker, Space, Tooltip, Tabs, Modal,
  message, Spin, Typography, Dropdown, Menu, Tag, Empty,
} from 'antd';
import {
  PlusOutlined, ImportOutlined, ExportOutlined, CopyOutlined, DeleteOutlined,
  EditOutlined, CloudSyncOutlined, ReloadOutlined, SaveOutlined, ClearOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import { UserContext } from '../../common/UserContext';
import GroceryFormModal from './GroceryFormModal';
import GroceryImportModal from './GroceryImportModal';
import GroceryInsights from './GroceryInsights';
import GroceryCleanup from './GroceryCleanup';
import {
  makeRecord, sortByDateDesc, computeSummary, formatCurrency, itemKeyOf,
  hasRateMismatch, normalizeRecordText,
} from './groceryModel';
import {
  recordsToLegacyCsv, recordsToNormalizedCsv, recordsToTsv, toSheetDate,
} from './groceryCsv';
import {
  loadGroceries, saveGroceries, readCache, writeCache, downloadTextFile, readTextFile,
} from './groceryStorage';
import './GroceryTracker.css';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;

const SAVE_DEBOUNCE_MS = 800;

const stamp = () => moment().format('YYYY-MM-DD');

const GroceryTracker = () => {
  const { user } = useContext(UserContext);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [range, setRange] = useState(() => [moment().startOf('day'), moment().startOf('day')]);
  // True while the range is still the "today" default; typing a search then widens to all dates.
  const [rangeIsDefault, setRangeIsDefault] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [tab, setTab] = useState('purchases');

  const saveTimerRef = useRef(null);
  const restoreInputRef = useRef(null);
  const skipSaveRef = useRef(true);

  // ─── Load: cache paints first, Firestore then becomes the source of truth ──
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;

    const cached = readCache(user.uid);
    if (cached) {
      const normalizedCache = cached.map(normalizeRecordText);
      setRecords(normalizedCache);
      writeCache(user.uid, normalizedCache);
    }

    (async () => {
      const res = await loadGroceries(user.uid);
      if (cancelled) return;
      if (!res.success) {
        message.error('Could not load your grocery data — showing the last cached copy');
        skipSaveRef.current = true;
        setLoading(false);
        return;
      }
      const normalizedRecords = res.records.map(normalizeRecordText);
      const textFields = ['item', 'unit', 'rateUnit', 'category', 'store', 'notes'];
      const needsNormalization = res.records.some((record, index) => (
        textFields.some((field) => record[field] !== normalizedRecords[index][field])
      ));
      skipSaveRef.current = !needsNormalization;
      setRecords(normalizedRecords);
      writeCache(user.uid, normalizedRecords);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user]);

  // ─── Persist (debounced — the whole array is rewritten) ───────────────────
  useEffect(() => {
    if (!user || loading) return undefined;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return undefined;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      writeCache(user.uid, records);
      const res = await saveGroceries(user.uid, records);
      setSaving(false);
      if (!res.success) message.error('Could not sync to the cloud — your changes are cached locally');
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(saveTimerRef.current);
  }, [user, loading, records]);

  const commit = (next, note) => {
    setRecords(sortByDateDesc(next.map(normalizeRecordText)));
    if (note) message.success(note);
  };

  // ─── Filtering ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const from = range?.[0] ? range[0].format('YYYY-MM-DD') : null;
    const to = range?.[1] ? range[1].format('YYYY-MM-DD') : null;

    return records.filter((record) => {
      if (term) {
        const haystack = `${record.item} ${record.store} ${record.notes} ${record.category}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (from && record.date < from) return false;
      if (to && record.date > to) return false;
      return true;
    });
  }, [records, search, range]);

  const summary = useMemo(() => computeSummary(filtered), [filtered]);
  const selected = useMemo(
    () => records.filter((record) => selectedRowKeys.includes(record.id)),
    [records, selectedRowKeys]
  );

  const filtersActive = search.trim() !== '' || !!range;

  const clearFilters = () => {
    setSearch('');
    setRange(null);
    setRangeIsDefault(false);
  };

  const handleSearchChange = (e) => {
    const { value } = e.target;
    setSearch(value);
    if (rangeIsDefault && value.trim()) {
      setRange(null);
      setRangeIsDefault(false);
    }
  };

  const handleRangeChange = (value) => {
    setRange(value);
    setRangeIsDefault(false);
  };

  // ─── Row actions ──────────────────────────────────────────────────────────
  const openAdd = () => { setEditing(null); setFormOpen(true); };

  const openEdit = (record) => { setEditing(record); setFormOpen(true); setTab('purchases'); };

  const handleSubmit = (values, { addAnother = false } = {}) => {
    if (editing) {
      commit(
        records.map((r) => (r.id === editing.id ? makeRecord({ ...editing, ...values }) : r)),
        'Purchase updated'
      );
    } else {
      commit([makeRecord(values), ...records], 'Purchase added');
    }
    if (addAnother && !editing) return;
    setFormOpen(false);
    setEditing(null);
  };

  const deleteRecords = (ids) => Modal.confirm({
    title: ids.length === 1 ? 'Delete this purchase?' : `Delete ${ids.length} purchases?`,
    content: 'This cannot be undone.',
    okText: 'Delete',
    okButtonProps: { danger: true },
    onOk: () => {
      const targets = new Set(ids);
      commit(records.filter((r) => !targets.has(r.id)), `${ids.length} row(s) deleted`);
      setSelectedRowKeys((keys) => keys.filter((key) => !targets.has(key)));
    },
  });

  // ─── Import / export ──────────────────────────────────────────────────────

  const handleImport = ({ records: incoming, mode, skipped }) => {
    const apply = () => {
      const next = mode === 'replace' ? incoming : [...incoming, ...records];
      commit(next, `${incoming.length} row(s) imported${skipped ? `, ${skipped} skipped` : ''}`);
      setImportOpen(false);
    };

    if (mode === 'replace') {
      Modal.confirm({
        title: 'Replace all grocery data?',
        content: `Your existing ${records.length} row(s) will be deleted and replaced with ${incoming.length} imported row(s).`,
        okText: 'Replace',
        okButtonProps: { danger: true },
        onOk: apply,
      });
      return;
    }
    apply();
  };

  const exportCsv = (rows, { normalized = false } = {}) => {
    if (rows.length === 0) { message.warning('Nothing to export'); return; }
    const content = normalized ? recordsToNormalizedCsv(rows) : recordsToLegacyCsv(rows);
    downloadTextFile(`grocery-${normalized ? 'normalized-' : ''}${stamp()}.csv`, content);
    message.success(`Exported ${rows.length} row(s)`);
  };

  const copyRows = (rows) => {
    if (rows.length === 0) { message.warning('Nothing to copy'); return; }
    navigator.clipboard.writeText(recordsToTsv(rows))
      .then(() => message.success(`${rows.length} row(s) copied`))
      .catch(() => message.error('Failed to copy'));
  };

  const backupJson = () => {
    downloadTextFile(
      `grocery-backup-${stamp()}.json`,
      JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records }, null, 2),
      'application/json'
    );
    message.success('Backup downloaded');
  };

  const restoreJson = async (file) => {
    try {
      const parsed = JSON.parse(await readTextFile(file));
      const incoming = Array.isArray(parsed) ? parsed : parsed.records;
      if (!Array.isArray(incoming)) throw new Error('Unrecognised backup file');
      const restored = incoming.map((entry) => makeRecord(entry));
      Modal.confirm({
        title: 'Restore from backup?',
        content: `All ${records.length} current row(s) will be replaced with ${restored.length} row(s) from the backup.`,
        okText: 'Restore',
        okButtonProps: { danger: true },
        onOk: () => commit(restored, 'Backup restored'),
      });
    } catch (error) {
      message.error('That file is not a valid grocery backup');
    }
    return undefined;
  };

  // ─── Table ────────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      defaultSortOrder: 'descend',
      sorter: (a, b) => String(a.date).localeCompare(String(b.date)),
      render: (value) => <span className="grocery-date">{toSheetDate(value)}</span>,
    },
    {
      title: 'Item',
      dataIndex: 'item',
      key: 'item',
      sorter: (a, b) => itemKeyOf(a.item).localeCompare(itemKeyOf(b.item)),
      render: (value, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{value}</Text>
          {record.store && <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>{record.store}</Text>}
        </Space>
      ),
    },
    {
      title: 'Quantity',
      key: 'quantity',
      width: 110,
      sorter: (a, b) => (a.quantity || 0) - (b.quantity || 0),
      render: (_, record) => `${record.quantity ?? '—'} ${record.unit || ''}`.trim(),
    },
    {
      title: 'Paid',
      dataIndex: 'value',
      key: 'value',
      width: 110,
      align: 'right',
      sorter: (a, b) => (a.value || 0) - (b.value || 0),
      render: (value) => formatCurrency(value),
    },
    {
      title: 'Rate',
      dataIndex: 'rate',
      key: 'rate',
      width: 130,
      align: 'right',
      sorter: (a, b) => (a.rate || 0) - (b.rate || 0),
      render: (value, record) => (
        <Space size={4}>
          <span>{formatCurrency(value)}</span>
          {hasRateMismatch(record) && <Tooltip title="Rate × quantity doesn’t match the total paid"><Tag color="orange">!</Tag></Tooltip>}
        </Space>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 160,
      responsive: ['lg'],
      render: (value) => (value ? <Tag>{value}</Tag> : null),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 76,
      fixed: 'right',
      render: (_, record) => (
        <Tooltip title="Edit">
          <Button aria-label="Edit purchase" type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
        </Tooltip>
      ),
    },
  ];

  const actionsMenu = (
    <Menu
      onClick={({ key }) => {
        if (key === 'import') setImportOpen(true);
        if (key === 'export-filtered') exportCsv(filtered);
        if (key === 'export-all') exportCsv(records);
        if (key === 'export-normalized') exportCsv(filtered, { normalized: true });
        if (key === 'backup') backupJson();
        if (key === 'copy') copyRows(selected.length > 0 ? selected : filtered);
        if (key === 'delete') deleteRecords(selected.map((record) => record.id));
        if (key === 'restore') restoreInputRef.current?.click();
      }}
      items={[
        { key: 'import', label: 'Import CSV', icon: <ImportOutlined /> },
        {
          key: 'export',
          label: 'Export',
          icon: <ExportOutlined />,
          children: [
            { key: 'export-filtered', label: `CSV — filtered (${filtered.length})` },
            { key: 'export-all', label: `CSV — everything (${records.length})` },
            { key: 'export-normalized', label: 'Detailed CSV' },
            { key: 'backup', label: 'JSON backup', icon: <SaveOutlined /> },
          ],
        },
        { type: 'divider' },
        { key: 'copy', label: selected.length > 0 ? `Copy selected (${selected.length})` : `Copy visible (${filtered.length})`, icon: <CopyOutlined /> },
        ...(selected.length ? [{ key: 'delete', label: `Delete selected (${selected.length})`, icon: <DeleteOutlined />, danger: true }] : []),
        { key: 'restore', label: 'Restore JSON backup', icon: <ReloadOutlined /> },
      ]}
    />
  );

  if (loading && records.length === 0) {
    return <div className="loading-container"><Spin size="large" /><Text type="secondary">Loading your grocery data…</Text></div>;
  }

  const purchasesTab = (
    <>
      <div className="grocery-filters">
        <Input.Search
          allowClear
          placeholder="Search item, store or note"
          value={search}
          onChange={handleSearchChange}
          style={{ maxWidth: 260 }}
        />
        <RangePicker
          value={range}
          onChange={handleRangeChange}
          format="DD MMM YYYY"
          allowEmpty={[true, true]}
        />
        {filtersActive && (
          <Button size="small" type="link" icon={<ClearOutlined />} onClick={clearFilters}>Clear</Button>
        )}
      </div>

      <div className="grocery-stats" aria-live="polite">
        <span>Count: <strong>{summary.rows}</strong></span>
        <span>Sum: <strong>{formatCurrency(summary.totalSpend)}</strong></span>
      </div>

      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={filtered}
        scroll={{ x: 820 }}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys, preserveSelectedRowKeys: true }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `${total} row(s)`,
          size: 'small',
        }}
        locale={{
          emptyText: (
            <Empty description={filtersActive ? 'No purchases match these filters' : 'No purchases yet'}>
              {!filtersActive && (
                <Space wrap>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add one</Button>
                  <Button icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>Import CSV</Button>
                </Space>
              )}
            </Empty>
          ),
        }}
      />
    </>
  );

  return (
    <div className="grocery-container">
      <div className="grocery-header">
        <div>
          <Title level={4} style={{ margin: 0 }}>Grocery Tracker</Title>
          <Text type="secondary" style={{ fontSize: 'var(--text-sm)' }}>
            {saving ? <><CloudSyncOutlined spin /> Syncing…</> : 'Purchases, rates and price history'}
          </Text>
        </div>
      </div>

      <div className="action-bar">
        <Button aria-label="Add purchase" type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add purchase</Button>
        <Dropdown overlay={actionsMenu} trigger={['click']} placement="bottomRight">
          <Button aria-label="More grocery actions" icon={<MenuOutlined />}></Button>
        </Dropdown>
        <input
          ref={restoreInputRef}
          type="file"
          accept=".json,application/json"
          className="grocery-hidden-input"
          aria-label="Restore JSON backup"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) restoreJson(file);
            event.target.value = '';
          }}
        />
      </div>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'purchases', label: `Purchases (${filtered.length})`, children: purchasesTab },
          { key: 'insights', label: 'Insights', children: <GroceryInsights records={filtered} /> },
          {
            key: 'cleanup',
            label: 'Data cleanup',
            children: <GroceryCleanup records={records} onApply={commit} onEdit={openEdit} />,
          },
        ]}
      />

      <GroceryFormModal
        open={formOpen}
        editing={editing}
        records={records}
        onCancel={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />

      <GroceryImportModal
        open={importOpen}
        existing={records}
        onCancel={() => setImportOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
};

export default GroceryTracker;
