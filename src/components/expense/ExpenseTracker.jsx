import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Table, Modal, message, Radio, DatePicker, Switch } from 'antd';
import moment from 'moment';

const ExpenseTracker = () => {
  const [expenses, setExpenses] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [enableRowSelection, setEnableRowSelection] = useState(false);

  const expenseMode = [
    { text: "UPI HDFC Crdit Card", value: "upi-hdfc-crdit-card" },
    { text: "UPI Kotak Crdit Card", value: "upi-kotak-crdit-card" },
    { text: "UPI SBI", value: "upi-sbi" },
    { text: "UPI Kotak", value: "upi-kotak" },
    { text: "UPI Lite", value: "upi-lite" },
    { text: "Cash", value: "cash" },
  ];
  useEffect(() => {
    const storedExpenses = JSON.parse(localStorage.getItem('expenses')) || [];
    const expensesWithMomentDates = storedExpenses.map(expense => ({
      ...expense,
      date: moment(expense.date),
    }));
    setExpenses(expensesWithMomentDates);
  }, []);

  const saveExpenses = (newExpenses) => {
    const expensesToStore = newExpenses.map(expense => ({
      ...expense,
      date: expense.date.toISOString(),
    }));
    localStorage.setItem('expenses', JSON.stringify(expensesToStore));
    setExpenses(newExpenses);
  };

  const handleAddExpense = () => {
    form.validateFields().then((values) => {
      values.date = values.date.toISOString(); // Convert to string before saving
      if (editingExpense) {
        const updatedExpenses = expenses.map((expense) =>
          expense.key === editingExpense.key ? { ...expense, ...values } : expense
        );
        saveExpenses(updatedExpenses);
        setEditingExpense(null);
      } else {
        const newExpense = { ...values, key: Date.now().toString() };
        const newExpenses = [...expenses, newExpense];
        saveExpenses(newExpenses);
      }
      form.resetFields();
      setIsModalVisible(false);
      message.success('Expense saved successfully');
    });
  };

  const handleEditExpense = (record) => {
    form.setFieldsValue({
      ...record,
      date: moment(record.date), // Convert to moment object for the DatePicker
    });
    setEditingExpense(record);
    setIsModalVisible(true);
  };

  const handleDeleteExpense = (key) => {
    const updatedExpenses = expenses.filter((expense) => expense.key !== key);
    saveExpenses(updatedExpenses);
    message.success('Expense deleted successfully');
  };

  const handleRowSelectionChange = (selectedKeys) => {
    setSelectedRowKeys(selectedKeys);
  };

  const handleRowSelectionSwitchChange = (checked) => {
    setEnableRowSelection(checked);
  };

  const copyToClipboard = () => {
    const header = ["Description", "Amount", "Payment Mode", "Date"];
    const rows = expenses.filter(expense => selectedRowKeys.includes(expense.key)).map(expense => [
      expense.description,
      expense.amount,
      expense.paymentMode,
      moment(expense.date).format('YYYY-MM-DD HH:mm:ss')
    ]);

    const tsv = [header, ...rows].map(row => row.join('\t')).join('\n');

    navigator.clipboard.writeText(tsv).then(() => {
      message.success('Table content copied to clipboard!');
    }).catch(err => {
      message.error('Failed to copy table content');
      console.error('Could not copy text: ', err);
    });
  };

  const columns = [
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', sorter: (a, b) => a.amount - b.amount },
    { title: 'Payment Mode', dataIndex: 'paymentMode', key: 'paymentMode', filters: expenseMode, onFilter: (value, record) => record.paymentMode.indexOf(value) === 0, },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text) => moment(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <>
          <Button onClick={() => handleEditExpense(record)} type="link">
            Edit
          </Button>
          <Button onClick={() => handleDeleteExpense(record.key)} type="link" danger>
            Delete
          </Button>
        </>
      ),
    },
  ];

  const rowSelection = enableRowSelection ? {
    selectedRowKeys,
    onChange: handleRowSelectionChange,
  } : null;

  return (
    <div style={{ minWidth: "200px" }}>
      <Button type="primary" onClick={() => setIsModalVisible(true)}>
        Add Expense
      </Button>
      <Button type="secondary" onClick={copyToClipboard} style={{ marginLeft: 10 }} disabled={selectedRowKeys.length === 0}>
        Copy Selected
      </Button>
      <div>
      Enable Row Selection <Switch checked={enableRowSelection} onChange={handleRowSelectionSwitchChange} style={{ marginLeft: 10 }}>
        </Switch></div>
      
      <Table rowSelection={rowSelection} dataSource={expenses} columns={columns} style={{ marginTop: 20 }} />

      <Modal
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
        visible={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingExpense(null);
          form.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={handleAddExpense}>
            Save
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter the description' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Amount"
            rules={[{ required: true, message: 'Please enter the amount' }]}
          >
            <Input type="number" />
          </Form.Item>
          <Form.Item
            name="paymentMode"
            label="Payment Mode"
            rules={[{ required: true, message: 'Please select the payment mode' }]}
          >
            <Radio.Group>
              {expenseMode.map((expenseType, index) =>
                <Radio.Button value={expenseType.value} key={index}>{expenseType.text}</Radio.Button>
              )}
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Please select the date!' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExpenseTracker;
