import React, { useMemo, useState } from 'react';
import { Card, Table, Button, Space, Empty, Select, Typography, Tag, Modal, Alert } from 'antd';
import {
  findIssues,
  recalculateRate,
  splitDuplicates,
  cleanItemName,
  normalizeUnit,
  formatCurrency,
} from './groceryModel';

const { Text } = Typography;

const rowColumns = (extra = []) => [
  { title: 'Date', dataIndex: 'date', key: 'date', width: 110 },
  { title: 'Item', dataIndex: 'item', key: 'item' },
  { title: 'Qty', key: 'qty', width: 100, render: (_, r) => `${r.quantity ?? '—'} ${r.unit || ''}` },
  { title: 'Paid', dataIndex: 'value', key: 'value', width: 100, render: (v) => formatCurrency(v) },
  { title: 'Rate', dataIndex: 'rate', key: 'rate', width: 100, render: (v) => formatCurrency(v) },
  ...extra,
];

const GroceryCleanup = ({ records, onApply, onEdit }) => {
  const issues = useMemo(() => findIssues(records), [records]);
  const [merges, setMerges] = useState({});

  const untidyNames = useMemo(
    () => records.filter((r) => r.item !== cleanItemName(r.item) || r.unit !== normalizeUnit(r.unit)),
    [records]
  );

  const confirmThen = (title, content, action) => Modal.confirm({
    title,
    content,
    okText: 'Apply',
    onOk: action,
  });

  const tidyFormatting = () => confirmThen(
    'Tidy names and units?',
    `${untidyNames.length} row(s) will have stray spacing removed and units standardised.`,
    () => onApply(
      records.map((r) => ({ ...r, item: cleanItemName(r.item), unit: normalizeUnit(r.unit), rateUnit: normalizeUnit(r.rateUnit || r.unit) })),
      'Names and units tidied'
    )
  );

  const recalcAll = () => confirmThen(
    'Recalculate rates?',
    `${issues.rateMismatch.length} row(s) will have their rate set to total ÷ quantity.`,
    () => {
      const targets = new Set(issues.rateMismatch.map((r) => r.id));
      onApply(records.map((r) => (targets.has(r.id) ? recalculateRate(r) : r)), 'Rates recalculated');
    }
  );

  const removeDuplicates = () => confirmThen(
    'Remove duplicate rows?',
    `${issues.duplicates.length} row(s) that repeat an identical purchase will be deleted.`,
    () => onApply(splitDuplicates(records).unique, 'Duplicate rows removed')
  );

  const mergeAlias = (group) => {
    const target = merges[group.key] || group.suggested;
    const variantNames = new Set(group.variants.map((v) => v.name));
    confirmThen(
      `Rename to "${target}"?`,
      `${group.total} row(s) currently spelled ${group.variants.map((v) => `"${v.name}"`).join(', ')} will use "${target}".`,
      () => onApply(
        records.map((r) => (variantNames.has(r.item) ? { ...r, item: target, updatedAt: new Date().toISOString() } : r)),
        `Merged into "${target}"`
      )
    );
  };

  const clean = issues.incomplete.length === 0
    && issues.rateMismatch.length === 0
    && issues.duplicates.length === 0
    && issues.unitConflicts.length === 0
    && issues.aliasGroups.length === 0
    && untidyNames.length === 0;

  if (records.length === 0) return <Empty description="Nothing to check yet" />;
  if (clean) {
    return <Alert type="success" showIcon message="No data issues found" description="Names, units, rates and duplicates all look consistent." />;
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {untidyNames.length > 0 && (
        <Card
          size="small"
          bordered={false}
          className="grocery-card"
          title={<span>Formatting <Tag>{untidyNames.length}</Tag></span>}
          extra={<Button size="small" onClick={tidyFormatting}>Tidy all</Button>}
        >
          <Text type="secondary">Rows with extra spacing or non-standard unit spelling (e.g. “ltr” vs “l”).</Text>
        </Card>
      )}

      {issues.incomplete.length > 0 && (
        <Card
          size="small"
          bordered={false}
          className="grocery-card"
          title={<span>Incomplete rows <Tag color="red">{issues.incomplete.length}</Tag></span>}
        >
          <Table
            size="small"
            rowKey="id"
            dataSource={issues.incomplete}
            columns={rowColumns([{
              title: '',
              key: 'fix',
              width: 70,
              render: (_, r) => <Button type="link" size="small" onClick={() => onEdit(r)}>Fix</Button>,
            }])}
            pagination={{ pageSize: 5, size: 'small', hideOnSinglePage: true }}
            scroll={{ x: 560 }}
          />
        </Card>
      )}

      {issues.rateMismatch.length > 0 && (
        <Card
          size="small"
          bordered={false}
          className="grocery-card"
          title={<span>Rate doesn’t match total <Tag color="orange">{issues.rateMismatch.length}</Tag></span>}
          extra={<Button size="small" onClick={recalcAll}>Recalculate all</Button>}
        >
          <Table
            size="small"
            rowKey="id"
            dataSource={issues.rateMismatch}
            columns={rowColumns([{
              title: 'Expected',
              key: 'expected',
              width: 110,
              render: (_, r) => formatCurrency(Math.round((r.value / r.quantity) * 100) / 100),
            }, {
              title: '',
              key: 'fix',
              width: 70,
              render: (_, r) => (
                <Button
                  type="link"
                  size="small"
                  onClick={() => onApply(records.map((x) => (x.id === r.id ? recalculateRate(x) : x)), 'Rate recalculated')}
                >
                  Fix
                </Button>
              ),
            }])}
            pagination={{ pageSize: 5, size: 'small', hideOnSinglePage: true }}
            scroll={{ x: 660 }}
          />
        </Card>
      )}

      {issues.duplicates.length > 0 && (
        <Card
          size="small"
          bordered={false}
          className="grocery-card"
          title={<span>Duplicate rows <Tag color="volcano">{issues.duplicates.length}</Tag></span>}
          extra={<Button size="small" danger onClick={removeDuplicates}>Remove duplicates</Button>}
        >
          <Table
            size="small"
            rowKey="id"
            dataSource={issues.duplicates}
            columns={rowColumns()}
            pagination={{ pageSize: 5, size: 'small', hideOnSinglePage: true }}
            scroll={{ x: 520 }}
          />
        </Card>
      )}

      {issues.aliasGroups.length > 0 && (
        <Card
          size="small"
          bordered={false}
          className="grocery-card"
          title={<span>Possible name variants <Tag color="blue">{issues.aliasGroups.length}</Tag></span>}
        >
          <Table
            size="small"
            rowKey="key"
            dataSource={issues.aliasGroups}
            pagination={{ pageSize: 5, size: 'small', hideOnSinglePage: true }}
            columns={[
              {
                title: 'Spelled as',
                key: 'variants',
                render: (_, g) => g.variants.map((v) => <Tag key={v.name}>{v.name} × {v.count}</Tag>),
              },
              {
                title: 'Keep',
                key: 'keep',
                width: 220,
                render: (_, g) => (
                  <Select
                    size="small"
                    style={{ width: '100%' }}
                    value={merges[g.key] || g.suggested}
                    onChange={(value) => setMerges((prev) => ({ ...prev, [g.key]: value }))}
                    options={g.variants.map((v) => ({ value: v.name, label: v.name }))}
                  />
                ),
              },
              {
                title: '',
                key: 'merge',
                width: 80,
                render: (_, g) => <Button type="link" size="small" onClick={() => mergeAlias(g)}>Merge</Button>,
              },
            ]}
            scroll={{ x: 560 }}
          />
        </Card>
      )}

      {issues.unitConflicts.length > 0 && (
        <Card
          size="small"
          bordered={false}
          className="grocery-card"
          title={<span>Items bought in mixed units <Tag color="purple">{issues.unitConflicts.length}</Tag></span>}
        >
          <Table
            size="small"
            rowKey="key"
            dataSource={issues.unitConflicts}
            pagination={{ pageSize: 5, size: 'small', hideOnSinglePage: true }}
            columns={[
              { title: 'Item', dataIndex: 'item', key: 'item' },
              { title: 'Units', key: 'units', render: (_, r) => r.units.map((u) => <Tag key={u}>{u}</Tag>) },
            ]}
          />
          <Text type="secondary">Rates across different units aren’t comparable — worth normalising by hand.</Text>
        </Card>
      )}
    </Space>
  );
};

export default GroceryCleanup;
