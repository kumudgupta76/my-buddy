import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button, Table, Input, DatePicker, Select, Space, Tooltip, Tabs, Modal,
  message, Spin, Typography, Dropdown, Menu, Tag, Upload, Empty,
} from 'antd';
import {
  PlusOutlined, ImportOutlined, ExportOutlined, CopyOutlined, DeleteOutlined,
  EditOutlined, CloudSyncOutlined, ReloadOutlined, SaveOutlined, ClearOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import { UserContext } from '../../common/UserContext';
import { isMobile } from '../../common/utils';
import GroceryFormModal from './GroceryFormModal';
import GroceryImportModal from './GroceryImportModal';
import GroceryInsights from './GroceryInsights';
import GroceryCleanup from './GroceryCleanup';
import {
  makeRecord, sortByDateDesc, computeSummary, formatCurrency, itemKeyOf,
  hasRateMismatch, CATEGORY_OPTIONS, findDuplicatesAgainst,
} from './groceryModel';
import {
  recordsToLegacyCsv, recordsToNormalizedCsv, recordsToTsv, toSheetDate,
} from './groceryCsv';
import {
  loadGroceries, saveGroceries, readCache, writeCache, downloadTextFile, readTextFile,
} from './groceryStorage';
import { buildSeedRecords, SEED_COUNT } from './groceryCatalog';
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
  const [range, setRange] = useState(null);
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [tab, setTab] = useState('purchases');

  const saveTimerRef = useRef(null);
  const skipSaveRef = useRef(true);
  const seedOfferedRef = useRef(false);

  // ─── Load: cache paints first, Firestore then becomes the source of truth ──
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;

    const cached = readCache(user.uid);
    if (cached) setRecords(cached);

    (async () => {
      const res = await loadGroceries(user.uid);
      if (cancelled) return;
      if (!res.success) {
        message.error('Could not load your grocery data — showing the last cached copy');
        skipSaveRef.current = true;
        setLoading(false);
        return;
      }
      skipSaveRef.current = true;
      setRecords(res.records);
      writeCache(user.uid, res.records);
      setLoading(false);

      // Offer the sheet import once, and only to an account holding nothing.
      if (res.records.length === 0 && !seedOfferedRef.current) {
        seedOfferedRef.current = true;
        Modal.confirm({
          title: 'Load your grocery sheet?',
          content: `Your tracker is empty. Import the ${SEED_COUNT} purchases from your maintained sheet to get started.`,
          okText: 'Load them',
          cancelText: 'Start empty',
          onOk: () => commit(buildSeedRecords(), `${SEED_COUNT} purchases loaded`),
        });
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setRecords(sortByDateDesc(next));
    if (note) message.success(note);
  };

  // ─── Filtering ────────────────────────────────────────────────────────────
  const unitOptions = useMemo(() => {
    const found = new Set(records.map((r) => r.unit).filter(Boolean));
    return [...found].sort().map((value) => ({ value, label: value }));
  }, [records]);

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
      if (units.length > 0 && !units.includes(record.unit)) return false;
      if (categories.length > 0 && !categories.includes(record.category)) return false;
      return true;
    });
  }, [records, search, range, units, categories]);

  const summary = useMemo(() => computeSummary(filtered), [filtered]);
  const selected = useMemo(
    () => filtered.filter((record) => selectedRowKeys.includes(record.id)),
    [filtered, selectedRowKeys]
  );

  const filtersActive = search.trim() !== '' || !!range || units.length > 0 || categories.length > 0;

  const clearFilters = () => {
    setSearch('');
    setRange(null);
    setUnits([]);
    setCategories([]);
  };

  // ─── Row actions ──────────────────────────────────────────────────────────
  const openAdd = () => { setEditing(null); setFormOpen(true); };

  const openEdit = (record) => { setEditing(record); setFormOpen(true); setTab('purchases'); };

  const handleSubmit = (values) => {
    if (editing) {
      commit(
        records.map((r) => (r.id === editing.id ? makeRecord({ ...editing, ...values }) : r)),
        'Purchase updated'
      );
    } else {
      commit([makeRecord(values), ...records], 'Purchase added');
    }
    setFormOpen(false);
    setEditing(null);
  };

  const duplicateRecord = (record) => {
    const copy = makeRecord({ ...record, id: undefined, createdAt: undefined, date: stamp() });
    commit([copy, ...records], 'Copied to today — edit as needed');
    openEdit(copy);
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
  const loadSeed = () => {
    const { fresh } = findDuplicatesAgainst(records, buildSeedRecords());
    if (fresh.length === 0) {
      message.info('Every row from the sheet is already in your tracker');
      return;
    }
    Modal.confirm({
      title: 'Load rows from your grocery sheet?',
      content: `${fresh.length} of ${SEED_COUNT} sheet row(s) aren’t in your tracker yet and will be added.`,
      okText: 'Add them',
      onOk: () => commit([...fresh, ...records], `${fresh.length} row(s) added from the sheet`),
    });
  };

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
    return Upload.LIST_IGNORE;
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
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Tooltip title="Edit"><Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} /></Tooltip>
          <Tooltip title="Duplicate to today"><Button type="link" size="small" icon={<CopyOutlined />} onClick={() => duplicateRecord(record)} /></Tooltip>
          <Tooltip title="Delete"><Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteRecords([record.id])} /></Tooltip>
        </Space>
      ),
    },
  ];

  const exportMenu = (
    <Menu
      onClick={({ key }) => {
        if (key === 'filtered') exportCsv(filtered);
        if (key === 'all') exportCsv(records);
        if (key === 'normalized') exportCsv(filtered, { normalized: true });
        if (key === 'backup') backupJson();
      }}
      items={[
        { key: 'filtered', label: `Sheet CSV — filtered (${filtered.length})` },
        { key: 'all', label: `Sheet CSV — everything (${records.length})` },
        { key: 'normalized', label: 'Detailed CSV (with category, store, notes)' },
        { type: 'divider' },
        { key: 'backup', label: 'JSON backup', icon: <SaveOutlined /> },
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
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 260 }}
        />
        <RangePicker
          value={range}
          onChange={setRange}
          format="DD MMM YYYY"
          allowEmpty={[true, true]}
        />
        <Select
          mode="multiple"
          allowClear
          placeholder="Unit"
          value={units}
          onChange={setUnits}
          options={unitOptions}
          style={{ minWidth: 140 }}
          maxTagCount="responsive"
        />
        <Select
          mode="multiple"
          allowClear
          placeholder="Category"
          value={categories}
          onChange={setCategories}
          options={CATEGORY_OPTIONS.map((value) => ({ value, label: value }))}
          style={{ minWidth: 170 }}
          maxTagCount="responsive"
        />
        {filtersActive && (
          <Button size="small" type="link" icon={<ClearOutlined />} onClick={clearFilters}>Clear</Button>
        )}
      </div>

      <div className="grocery-stats">
        <span className="stat-pill">{summary.rows} rows</span>
        <span className="stat-pill">{formatCurrency(summary.totalSpend)} total</span>
        <span className="stat-pill">{summary.trips} trips</span>
        <span className="stat-pill">{summary.uniqueItems} items</span>
        <span className="stat-pill">{formatCurrency(summary.avgPerTrip)} avg / trip</span>
      </div>

      {selectedRowKeys.length > 0 && (
        <div className="grocery-selection-bar">
          <Text>{selectedRowKeys.length} selected</Text>
          <Space>
            <Button size="small" icon={<CopyOutlined />} onClick={() => copyRows(selected)}>Copy</Button>
            <Button size="small" icon={<ExportOutlined />} onClick={() => exportCsv(selected)}>Export</Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteRecords(selectedRowKeys)}>Delete</Button>
            <Button size="small" type="link" onClick={() => setSelectedRowKeys([])}>Clear</Button>
          </Space>
        </div>
      )}

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
                <Space>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add one</Button>
                  <Button icon={<DatabaseOutlined />} onClick={loadSeed}>Load my sheet ({SEED_COUNT})</Button>
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
        <Tooltip title="Add purchase">
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            {isMobile() ? null : 'Add'}
          </Button>
        </Tooltip>
        <Tooltip title="Import CSV">
          <Button icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
            {isMobile() ? null : 'Import'}
          </Button>
        </Tooltip>
        <Dropdown overlay={exportMenu} trigger={['click']}>
          <Button icon={<ExportOutlined />}>{isMobile() ? null : 'Export'}</Button>
        </Dropdown>
        <Tooltip title="Copy visible rows as tab-separated text">
          <Button icon={<CopyOutlined />} onClick={() => copyRows(filtered)}>
            {isMobile() ? null : 'Copy'}
          </Button>
        </Tooltip>
        <Upload accept=".json,application/json" maxCount={1} showUploadList={false} beforeUpload={restoreJson}>
          <Tooltip title="Restore from a JSON backup">
            <Button icon={<ReloadOutlined />}>{isMobile() ? null : 'Restore'}</Button>
          </Tooltip>
        </Upload>
        <Tooltip title={`Add any of the ${SEED_COUNT} rows from your sheet that are missing`}>
          <Button icon={<DatabaseOutlined />} onClick={loadSeed}>
            {isMobile() ? null : 'Load sheet'}
          </Button>
        </Tooltip>
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
