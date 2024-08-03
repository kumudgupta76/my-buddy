import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Table, Modal, message, Radio, DatePicker, Switch, Row, Col } from 'antd';
import moment from 'moment';
import { render } from '@testing-library/react';

const ExpenseTracker = () => {
  const [expenses, setExpenses] = useState([]);
  const [archivedExpenses, setArchivedExpenses] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [enableRowSelection, setEnableRowSelection] = useState(false);

  useEffect(() => {
    const storedExpenses = JSON.parse(localStorage.getItem('expenses')) || [];
    const storedArchivedExpenses = JSON.parse(localStorage.getItem('archivedExpenses')) || [];
    const expensesWithMomentDates = storedExpenses.map(expense => ({
      ...expense,
      date: moment(expense.date),
    }));
    const archivedExpensesWithMomentDates = storedArchivedExpenses.map(expense => ({
      ...expense,
      date: moment(expense.date),
    }));
    setExpenses(expensesWithMomentDates);
    setArchivedExpenses(archivedExpensesWithMomentDates);
  }, []);

  const saveExpenses = (newExpenses) => {
    const expensesToStore = newExpenses.map(expense => ({
      ...expense,
      date: expense.date.toString(),
    }));
    localStorage.setItem('expenses', JSON.stringify(expensesToStore));
    setExpenses(newExpenses);
  };

  const saveArchivedExpenses = (newArchivedExpenses) => {
    const archivedExpensesToStore = newArchivedExpenses.map(expense => ({
      ...expense,
      date: expense.date.toString(),
    }));
    localStorage.setItem('archivedExpenses', JSON.stringify(archivedExpensesToStore));
    setArchivedExpenses(newArchivedExpenses);
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
        const newExpenses = [newExpense, ...expenses];
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
    const updatedExpenses = archivedExpenses.filter((expense) => expense.key !== key);
    saveArchivedExpenses(updatedExpenses);
    message.success('Expense deleted successfully');
  };

  const handleArchiveExpense = (key) => {
    const expenseToArchive = expenses.find(expense => expense.key === key);
    const updatedExpenses = expenses.filter(expense => expense.key !== key);
    const updatedArchivedExpenses = [...archivedExpenses, { ...expenseToArchive, archived: true }];
    saveExpenses(updatedExpenses);
    saveArchivedExpenses(updatedArchivedExpenses);
    message.success('Expense archived successfully');
  };

  const handleUnarchiveExpense = (key) => {
    const expenseToUnarchive = archivedExpenses.find(expense => expense.key === key);
    const updatedArchivedExpenses = archivedExpenses.filter(expense => expense.key !== key);
    const updatedExpenses = [...expenses, { ...expenseToUnarchive, archived: false }];
    saveExpenses(updatedExpenses);
    saveArchivedExpenses(updatedArchivedExpenses);
    message.success('Expense unarchived successfully');
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

  const expenseMode = [
    { text: "UPI HDFC Credit Card", value: "upi-hdfc-credit-card" },
    { text: "UPI Kotak Credit Card", value: "upi-kotak-credit-card" },
    { text: "UPI SBI", value: "upi-sbi" },
    { text: "UPI Kotak", value: "upi-kotak" },
    { text: "UPI Lite", value: "upi-lite" },
    { text: "Cash", value: "cash" },
  ];

  const columns = [
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', sorter: (a, b) => a.amount - b.amount },
    {
      title: 'Payment Mode',
      dataIndex: 'paymentMode',
      key: 'paymentMode',
      filters: expenseMode,
      onFilter: (value, record) => record.paymentMode.indexOf(value) === 0,
      render: (value) => {
        const mode = expenseMode.find(item => item.value === value);
        return mode ? mode.text : value;
      }
    },
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
          {!record.archived && (
            <Button onClick={() => handleArchiveExpense(record.key)} type="link" danger>
              Archive
            </Button>
          )}
        </>
      ),
    },
  ];

  const archivedColumns = [
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', sorter: (a, b) => a.amount - b.amount },
    {
      title: 'Payment Mode', dataIndex: 'paymentMode', key: 'paymentMode', filters: expenseMode, onFilter: (value, record) => record.paymentMode.indexOf(value) === 0,
      render: (value) => {
        const mode = expenseMode.find(item => item.value === value);
        return mode ? mode.text : value;
      }
    },
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
          <Button onClick={() => handleDeleteExpense(record.key)} type="link" danger>
            Delete
          </Button>
          <Button onClick={() => handleUnarchiveExpense(record.key)} type="link">
            Unarchive
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
    <div style={{ maxWidth: '100%', overflowX: 'auto' }} className='expense-continer-div'>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Button type="primary" onClick={() => setIsModalVisible(true)} block>
            Add Expense
          </Button>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Button type="secondary" onClick={copyToClipboard} block disabled={selectedRowKeys.length === 0}>
            Copy Selected ({selectedRowKeys.length})
          </Button>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div>
            Enable Row Selection <Switch checked={enableRowSelection} onChange={handleRowSelectionSwitchChange} style={{ marginLeft: 10 }}>
            </Switch>
          </div>
        </Col>
      </Row>
      <h2 style={{ marginTop: 20 }}>Active Expenses ({expenses ? expenses.length : 0})</h2>
      <Table
        rowSelection={rowSelection}
        dataSource={expenses}
        columns={columns}
        style={{ marginTop: 20 }}
        scroll={{ x: 'max-content' }}
      />
      <h2 style={{ marginTop: 20 }}>Archived Expenses ({archivedExpenses ? archivedExpenses.length : 0})</h2>
      <Table
        dataSource={archivedExpenses}
        columns={archivedColumns}
        style={{ marginTop: 20 }}
        scroll={{ x: 'max-content' }}
      />

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
            initialValue={moment()}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExpenseTracker;
