import React, { useEffect, useMemo } from 'react';
import { Modal, Form, Input, InputNumber, Select, AutoComplete, DatePicker, Row, Col, Alert } from 'antd';
import moment from 'moment';
import { CATEGORY_OPTIONS, UNIT_OPTIONS, guessCategory, hasRateMismatch } from './groceryModel';

const DATE_PICKER_FORMAT = 'DD MMM YYYY';

const GroceryFormModal = ({ open, editing, records, onCancel, onSubmit }) => {
  const [form] = Form.useForm();

  const itemOptions = useMemo(() => {
    const names = new Map();
    records.forEach((record) => {
      if (record.item) names.set(record.item, (names.get(record.item) || 0) + 1);
    });
    return [...names.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value]) => ({ value }));
  }, [records]);

  const storeOptions = useMemo(() => {
    const stores = new Set(records.map((record) => record.store).filter(Boolean));
    return [...stores].map((value) => ({ value }));
  }, [records]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        ...editing,
        date: editing.date ? moment(editing.date, 'YYYY-MM-DD') : null,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ date: moment(), unit: 'kg' });
    }
  }, [open, editing, form]);

  // Keep quantity × rate = value in sync while still letting either side win.
  const handleValuesChange = (changed, all) => {
    const quantity = Number(all.quantity);
    const value = Number(all.value);
    const rate = Number(all.rate);

    if ('item' in changed && !editing) {
      form.setFieldsValue({ category: guessCategory(changed.item) });
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

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSubmit({
        ...values,
        date: values.date.format('YYYY-MM-DD'),
      });
    }).catch(() => { /* antd highlights the offending fields */ });
  };

  return (
    <Modal
      title={editing ? 'Edit purchase' : 'Add purchase'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText={editing ? 'Save changes' : 'Add'}
      destroyOnClose
      width={640}
    >
      <Form form={form} layout="vertical" onValuesChange={handleValuesChange} preserve={false}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Pick the purchase date' }]}>
              <DatePicker style={{ width: '100%' }} format={DATE_PICKER_FORMAT} allowClear={false} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="item"
              label="Item"
              rules={[{ required: true, message: 'Item name is required' }]}
            >
              <AutoComplete
                options={itemOptions}
                placeholder="e.g. Arhar Dal"
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
          </Col>
          <Col xs={12} sm={6}>
            <Form.Item name="rate" label="Rate per unit (₹)">
              <InputNumber style={{ width: '100%' }} min={0} step={1} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item name="category" label="Category">
              <Select options={CATEGORY_OPTIONS.map((value) => ({ value, label: value }))} allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="store" label="Store">
              <AutoComplete options={storeOptions} placeholder="Optional" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="rateUnit" hidden><Input /></Form.Item>
            <Form.Item name="notes" label="Notes">
              <Input placeholder="Optional" />
            </Form.Item>
          </Col>
        </Row>

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
