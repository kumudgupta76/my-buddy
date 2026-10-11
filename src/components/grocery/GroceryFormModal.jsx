import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, AutoComplete, DatePicker, Row, Col, Alert, Typography, Collapse, Tag, Button, Space } from 'antd';
import moment from 'moment';
import { CATEGORY_OPTIONS, UNIT_OPTIONS, guessCategory, hasRateMismatch, formatCurrency } from './groceryModel';
import { buildItemCatalog, itemCatalogKeyOf } from './groceryCatalog';

const { Text } = Typography;

const DATE_PICKER_FORMAT = 'DD MMM YYYY';

const GroceryFormModal = ({ open, editing, records, onCancel, onSubmit }) => {
  const [form] = Form.useForm();
  const [selectedItem, setSelectedItem] = useState(null);

  const catalog = useMemo(() => buildItemCatalog(records), [records]);

  const itemOptions = useMemo(() => catalog.map((entry) => ({
    value: entry.name,
    entry,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span>{entry.name}</span>
        <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>
          {entry.rate ? `${formatCurrency(entry.rate)}/${entry.unit}` : entry.unit}
        </Text>
      </div>
    ),
  })), [catalog]);

  const storeOptions = useMemo(() => {
    const stores = new Set(records.map((record) => record.store).filter(Boolean));
    return [...stores].map((value) => ({ value }));
  }, [records]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        ...editing,
        date: editing.date ? moment(editing.date, 'YYYY-MM-DD') : moment(),
      });
    } else {
      form.resetFields();
    }
  }, [open, editing, form]);

  useEffect(() => {
    if (!open) return;
    setSelectedItem(editing
      ? catalog.find((entry) => entry.key === itemCatalogKeyOf(editing.item)) || null
      : null);
  }, [open, editing, catalog]);

  // Keep quantity × rate = value in sync while still letting either side win.
  const handleValuesChange = (changed, all) => {
    const quantity = Number(all.quantity);
    const value = Number(all.value);
    const rate = Number(all.rate);

    if ('item' in changed && !editing) {
      form.setFieldsValue({ category: guessCategory(changed.item).toLowerCase() });
    }
    if ('unit' in changed) {
      form.setFieldsValue({ rateUnit: changed.unit });
    }
    if (('quantity' in changed || 'value' in changed) && quantity > 0 && Number.isFinite(value)) {
      form.setFieldsValue({ rate: Math.round((value / quantity) * 10000) / 10000 });
      return;
    }
    if ('rate' in changed && quantity > 0 && Number.isFinite(rate)) {
      form.setFieldsValue({ value: Math.round(quantity * rate * 100) / 100 });
    }
  };

  const handleOk = (addAnother = false) => {
    form.validateFields().then((values) => {
      onSubmit({
        ...values,
        date: values.date.format('YYYY-MM-DD'),
      }, { addAnother });
      if (addAnother) {
        form.resetFields();
        form.setFieldsValue({ date: values.date, store: values.store, unit: 'kg' });
        setSelectedItem(null);
      }
    }).catch(() => { /* antd highlights the offending fields */ });
  };

  // Picking a known item carries its usual unit and last paid rate across.
  const handleItemSelect = (_, option) => {
    const entry = option?.entry;
    if (!entry) return;
    setSelectedItem(entry);
    const { quantity, unit, rate } = form.getFieldsValue(['quantity', 'unit', 'rate']);
    const patch = { category: entry.category.toLowerCase() };
    if (entry.unit && (!unit || unit === 'kg')) {
      patch.unit = entry.unit;
      patch.rateUnit = entry.unit;
    }
    if (entry.rate && !rate) {
      patch.rate = entry.rate;
      if (Number(quantity) > 0) patch.value = Math.round(Number(quantity) * entry.rate * 100) / 100;
    }
    form.setFieldsValue(patch);
  };

  const handleItemChange = (value) => {
    const key = itemCatalogKeyOf(value);
    const entry = catalog.find((candidate) => candidate.key === key);
    setSelectedItem(entry || null);
  };

  const applyQuantitySuggestion = (suggestion) => {
    form.setFieldsValue({ quantity: suggestion.quantity, unit: suggestion.unit, rateUnit: suggestion.unit });
  };

  const applyValueSuggestion = (value) => {
    form.setFieldsValue({ value });
  };

  return (
    <Modal
      title={editing ? 'Edit purchase' : 'Add purchase'}
      open={open}
      onCancel={onCancel}
      destroyOnClose
      width={640}
      footer={(
        <div className="grocery-modal-actions">
          {!editing && (
            <Button onClick={() => handleOk(true)}>Add another</Button>
          )}
          <Space wrap>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" onClick={() => handleOk(false)}>
              {editing ? 'Save changes' : 'Add'}
            </Button>
          </Space>
        </div>
      )}
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        preserve={false}
        initialValues={{ date: moment(), unit: 'kg' }}
      >
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item
              name="item"
              label="Item"
              rules={[{ required: true, message: 'Item name is required' }]}
            >
              <AutoComplete
                options={itemOptions}
                placeholder="e.g. Arhar Dal"
                onSelect={handleItemSelect}
                onChange={handleItemChange}
                filterOption={(input, option) => option.value.toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={12} sm={6}>
            <Form.Item
              name="quantity"
              label="Quantity"
              rules={[{ required: true, message: 'Required' }, { type: 'number', min: 0.0001, message: 'Must be > 0' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0} step={0.25} />
            </Form.Item>
            {selectedItem?.quantitySuggestions.length > 0 && (
              <div className="grocery-suggestions">
                <Text type="secondary">Often bought:</Text>
                {selectedItem.quantitySuggestions.map((suggestion) => (
                  <Tag
                    key={`${suggestion.quantity}|${suggestion.unit}`}
                    color="blue"
                    title={`Used in ${suggestion.count} previous purchase(s)`}
                    onClick={() => applyQuantitySuggestion(suggestion)}
                  >
                    {suggestion.quantity} {suggestion.unit}
                  </Tag>
                ))}
              </div>
            )}
          </Col>
          <Col xs={12} sm={6}>
            <Form.Item name="unit" label="Unit" rules={[{ required: true, message: 'Required' }]}>
              <AutoComplete
                options={UNIT_OPTIONS.map((value) => ({ value }))}
                placeholder="kg"
              />
            </Form.Item>
          </Col>
          <Col xs={12} sm={6}>
            <Form.Item
              name="value"
              label="Total paid (₹)"
              rules={[{ required: true, message: 'Required' }, { type: 'number', min: 0, message: 'Must be ≥ 0' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0} step={1} />
            </Form.Item>
            {selectedItem?.valueSuggestions.length > 0 && (
              <div className="grocery-suggestions">
                <Text type="secondary">Often paid:</Text>
                {selectedItem.valueSuggestions.map((suggestion) => (
                  <Tag
                    key={suggestion.value}
                    color="green"
                    title={`Used in ${suggestion.count} previous purchase(s)`}
                    onClick={() => applyValueSuggestion(suggestion.value)}
                  >
                    {formatCurrency(suggestion.value)}
                  </Tag>
                ))}
              </div>
            )}
          </Col>
          <Col xs={12} sm={6}>
            <Form.Item name="rate" label="Rate per unit (₹)">
              <InputNumber style={{ width: '100%' }} min={0} step={1} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="rateUnit" hidden><Input /></Form.Item>

        <Collapse>
          <Collapse.Panel header="More details" key="more-details">
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Pick the purchase date' }]}>
                  <DatePicker style={{ width: '100%' }} format={DATE_PICKER_FORMAT} allowClear={false} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="category" label="Category">
                  <Select options={CATEGORY_OPTIONS.map((value) => {
                    const normalized = value.toLowerCase();
                    return { value: normalized, label: normalized };
                  })} allowClear />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="store" label="Store">
                  <AutoComplete options={storeOptions} placeholder="Optional" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="notes" label="Notes">
                  <Input placeholder="Optional" />
                </Form.Item>
              </Col>
            </Row>
          </Collapse.Panel>
        </Collapse>

        <Form.Item shouldUpdate noStyle>
          {({ getFieldsValue }) => {
            const values = getFieldsValue();
            return hasRateMismatch({
              quantity: Number(values.quantity),
              value: Number(values.value),
              rate: Number(values.rate),
            }) ? (
              <Alert
                type="warning"
                showIcon
                message="Quantity × rate does not match the total paid. Saved as entered."
              />
            ) : null;
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default GroceryFormModal;
