import React, { useMemo, useState } from 'react';
import { Modal, Upload, Radio, Alert, Table, Typography, Space, Input, Tabs, Tag } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { parseGroceryCsv } from './groceryCsv';
import { readTextFile } from './groceryStorage';
import { findDuplicatesAgainst, splitDuplicates, formatCurrency } from './groceryModel';

const { Dragger } = Upload;
const { Text, Paragraph } = Typography;

const PREVIEW_COLUMNS = [
  { title: 'Date', dataIndex: 'date', key: 'date', width: 110 },
  { title: 'Item', dataIndex: 'item', key: 'item' },
  { title: 'Qty', key: 'qty', width: 100, render: (_, r) => `${r.quantity} ${r.unit}` },
  { title: 'Value', dataIndex: 'value', key: 'value', width: 100, render: (v) => formatCurrency(v) },
  { title: 'Rate', dataIndex: 'rate', key: 'rate', width: 100, render: (v) => formatCurrency(v) },
];

const ERROR_COLUMNS = [
  { title: 'Line', dataIndex: 'line', key: 'line', width: 70 },
  { title: 'Problem', dataIndex: 'reason', key: 'reason', width: 200 },
  { title: 'Row', dataIndex: 'raw', key: 'raw', ellipsis: true },
];

const GroceryImportModal = ({ open, existing, onCancel, onImport }) => {
  const [parsed, setParsed] = useState(null);
  const [mode, setMode] = useState('skip');
  const [pasted, setPasted] = useState('');
  const [fileName, setFileName] = useState('');

  const reset = () => {
    setParsed(null);
    setPasted('');
    setFileName('');
    setMode('skip');
  };

  const handleClose = () => {
    reset();
    onCancel();
  };

  const ingest = (text, name) => {
    const result = parseGroceryCsv(text);
    setFileName(name);
    setParsed(result);
  };

  const analysis = useMemo(() => {
    if (!parsed) return null;
    const { unique, duplicates: inFile } = splitDuplicates(parsed.records);
    const { fresh, duplicates: againstExisting } = findDuplicatesAgainst(existing, unique);
    return { unique, inFile, fresh, againstExisting };
  }, [parsed, existing]);

  const toImport = useMemo(() => {
    if (!analysis || !parsed) return [];
    if (mode === 'replace') return analysis.unique;
    if (mode === 'all') return parsed.records;
    return analysis.fresh;
  }, [analysis, parsed, mode]);

  const confirm = () => {
    if (!parsed) return;
    onImport({ records: toImport, mode, skipped: parsed.errors.length });
    reset();
  };

  const items = parsed ? [
    {
      key: 'valid',
      label: <span>Ready <Tag color="green">{parsed.records.length}</Tag></span>,
      children: (
        <Table
          size="small"
          rowKey="id"
          columns={PREVIEW_COLUMNS}
          dataSource={parsed.records}
          pagination={{ pageSize: 8, size: 'small' }}
          scroll={{ x: 520 }}
        />
      ),
    },
    {
      key: 'errors',
      label: <span>Skipped <Tag color={parsed.errors.length ? 'red' : 'default'}>{parsed.errors.length}</Tag></span>,
      children: (
        <Table
          size="small"
          rowKey="line"
          columns={ERROR_COLUMNS}
          dataSource={parsed.errors}
          pagination={{ pageSize: 8, size: 'small' }}
          scroll={{ x: 520 }}
          locale={{ emptyText: 'Every row parsed cleanly' }}
        />
      ),
    },
  ] : [];

  return (
    <Modal
      title="Import grocery CSV"
      open={open}
      onCancel={handleClose}
      onOk={confirm}
      okText={mode === 'replace' ? `Replace with ${toImport.length} rows` : `Import ${toImport.length} rows`}
      okButtonProps={{ disabled: !parsed || toImport.length === 0, danger: mode === 'replace' }}
      width={840}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Dragger
          accept=".csv,text/csv,text/plain"
          maxCount={1}
          showUploadList={false}
          beforeUpload={async (file) => {
            const text = await readTextFile(file);
            ingest(text, file.name);
            return Upload.LIST_IGNORE;
          }}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Click or drop your grocery CSV here</p>
          <p className="ant-upload-hint">
            Expected columns: Date, Item, Weight/Count, Unit, Value, Rate, Unit
          </p>
        </Dragger>

        <Input.TextArea
          rows={3}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          onBlur={() => pasted.trim() && ingest(pasted, 'pasted text')}
          placeholder="…or paste rows here and click outside to parse"
        />

        {parsed && (
          <>
            <Alert
              type={parsed.errors.length ? 'warning' : 'success'}
              showIcon
              message={`${fileName}: ${parsed.total} rows read, ${parsed.records.length} usable, ${parsed.errors.length} skipped`}
              description={analysis && (
                <Text type="secondary">
                  {analysis.inFile.length} duplicate row(s) inside the file ·{' '}
                  {analysis.againstExisting.length} already in your tracker
                </Text>
              )}
            />

            <div>
              <Paragraph style={{ marginBottom: 8 }}><Text strong>How should these be applied?</Text></Paragraph>
              <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
                <Space direction="vertical">
                  <Radio value="skip">Add only new rows (skip duplicates)</Radio>
                  <Radio value="all">Add every parsed row, duplicates included</Radio>
                  <Radio value="replace">Replace all existing data with this file</Radio>
                </Space>
              </Radio.Group>
            </div>

            <Tabs items={items} />
          </>
        )}
      </Space>
    </Modal>
  );
};

export default GroceryImportModal;
