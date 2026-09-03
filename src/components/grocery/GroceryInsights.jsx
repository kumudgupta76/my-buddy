import React, { useMemo, useState } from 'react';
import { Row, Col, Table, Select, Empty, Typography, Tag, Card } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';
import {
  monthlySpend,
  categorySpend,
  itemSummary,
  priceHistory,
  formatCurrency,
} from './groceryModel';

const { Text } = Typography;

const SpendBar = ({ value, max }) => (
  <div className="grocery-bar-track">
    <div className="grocery-bar-fill" style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} />
  </div>
);

const ChangeTag = ({ percent }) => {
  if (percent === null || percent === undefined) return <Text type="secondary">—</Text>;
  if (percent === 0) return <Tag icon={<MinusOutlined />}>flat</Tag>;
  const up = percent > 0;
  return (
    <Tag color={up ? 'red' : 'green'} icon={up ? <ArrowUpOutlined /> : <ArrowDownOutlined />}>
      {Math.abs(percent)}%
    </Tag>
  );
};

const GroceryInsights = ({ records }) => {
  const months = useMemo(() => monthlySpend(records), [records]);
  const categories = useMemo(() => categorySpend(records), [records]);
  const items = useMemo(() => itemSummary(records), [records]);
  const [selectedItem, setSelectedItem] = useState(null);

  const maxMonth = months.reduce((max, m) => Math.max(max, m.total), 0);
  const maxCategory = categories.reduce((max, c) => Math.max(max, c.total), 0);

  const activeKey = selectedItem || items[0]?.key || null;
  const history = useMemo(
    () => (activeKey ? priceHistory(records, activeKey) : []),
    [records, activeKey]
  );

  if (records.length === 0) {
    return <Empty description="No purchases match the current filters" />;
  }

  const monthColumns = [
    { title: 'Month', dataIndex: 'month', key: 'month', width: 110 },
    { title: 'Spend', dataIndex: 'total', key: 'total', width: 120, render: (v) => formatCurrency(v) },
    { title: 'Rows', dataIndex: 'rows', key: 'rows', width: 70 },
    { title: '', key: 'bar', render: (_, r) => <SpendBar value={r.total} max={maxMonth} /> },
  ];

  const categoryColumns = [
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { title: 'Spend', dataIndex: 'total', key: 'total', width: 120, render: (v) => formatCurrency(v) },
    { title: '', key: 'bar', render: (_, r) => <SpendBar value={r.total} max={maxCategory} /> },
  ];

  const itemColumns = [
    { title: 'Item', dataIndex: 'item', key: 'item' },
    {
      title: 'Spend',
      dataIndex: 'total',
      key: 'total',
      width: 110,
      sorter: (a, b) => a.total - b.total,
      defaultSortOrder: 'descend',
      render: (v) => formatCurrency(v),
    },
    { title: 'Times', dataIndex: 'times', key: 'times', width: 80, sorter: (a, b) => a.times - b.times },
    {
      title: 'Latest rate',
      key: 'latestRate',
      width: 140,
      sorter: (a, b) => (a.latestRate || 0) - (b.latestRate || 0),
      render: (_, r) => (r.latestRate === null ? '—' : `${formatCurrency(r.latestRate)}/${r.unit || ''}`),
    },
    { title: 'Change', key: 'change', width: 100, render: (_, r) => <ChangeTag percent={r.changePercent} /> },
  ];

  const historyColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110 },
    { title: 'Qty', key: 'qty', width: 100, render: (_, r) => `${r.quantity} ${r.unit}` },
    { title: 'Paid', dataIndex: 'value', key: 'value', width: 100, render: (v) => formatCurrency(v) },
    { title: 'Rate', dataIndex: 'rate', key: 'rate', render: (v) => formatCurrency(v) },
  ];

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card size="small" title="Spend by month" bordered={false} className="grocery-card">
          <Table
            size="small"
            rowKey="key"
            columns={monthColumns}
            dataSource={months}
            pagination={{ pageSize: 8, size: 'small', hideOnSinglePage: true }}
          />
        </Card>
      </Col>

      <Col xs={24} lg={12}>
        <Card size="small" title="Spend by category" bordered={false} className="grocery-card">
          <Table
            size="small"
            rowKey="key"
            columns={categoryColumns}
            dataSource={categories}
            pagination={{ pageSize: 8, size: 'small', hideOnSinglePage: true }}
          />
        </Card>
      </Col>

      <Col xs={24} lg={14}>
        <Card size="small" title="Items — spend, frequency and price movement" bordered={false} className="grocery-card">
          <Table
            size="small"
            rowKey="key"
            columns={itemColumns}
            dataSource={items}
            pagination={{ pageSize: 10, size: 'small' }}
            scroll={{ x: 560 }}
            onRow={(record) => ({ onClick: () => setSelectedItem(record.key) })}
            rowClassName={(record) => (record.key === activeKey ? 'grocery-row-active' : '')}
          />
        </Card>
      </Col>

      <Col xs={24} lg={10}>
        <Card
          size="small"
          bordered={false}
          className="grocery-card"
          title="Price history"
          extra={(
            <Select
              size="small"
              style={{ minWidth: 180 }}
              showSearch
              value={activeKey}
              onChange={setSelectedItem}
              placeholder="Pick an item"
              options={items.map((i) => ({ value: i.key, label: i.item }))}
              filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
            />
          )}
        >
          <Table
            size="small"
            rowKey="key"
            columns={historyColumns}
            dataSource={history}
            pagination={{ pageSize: 10, size: 'small', hideOnSinglePage: true }}
            locale={{ emptyText: 'Select an item to see how its rate moved' }}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default GroceryInsights;
