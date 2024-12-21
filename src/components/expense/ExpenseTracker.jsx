import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Table, Modal, message, Radio, DatePicker, Row, Col, Dropdown, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { CopyOutlined, DatabaseOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { isMobile } from '../../common/utils';
import './ExpenseTracker.css';

const ExpenseTracker = () => {
  const [expenses, setExpenses] = useState([]);
  const [archivedExpenses, setArchivedExpenses] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  // const [enableRowSelection, setEnableRowSelection] = useState(true);
  const enableRowSelection = true;

  useEffect(() => {
    const storedExpenses = JSON.parse(localStorage.getItem('expenses')) || [];
    const storedArchivedExpenses = JSON.parse(localStorage.getItem('archivedExpenses')) || [];
    const expensesWithdayjsDates = storedExpenses.map(expense => ({
      ...expense,
      date: dayjs(expense.date),
    }));
    const archivedExpensesWithdayjsDates = storedArchivedExpenses.map(expense => ({
      ...expense,
      date: dayjs(expense.date),
    }));
    setExpenses(expensesWithdayjsDates);
    setArchivedExpenses(archivedExpensesWithdayjsDates);
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
      date: dayjs(record.date), // Convert to dayjs object for the DatePicker
    });
    setEditingExpense(record);
    setIsModalVisible(true);
  };

  const handleDeleteExpense = (key) => {
    const updatedExpenses = archivedExpenses.filter((expense) => expense.key !== key);
    saveArchivedExpenses(updatedExpenses);
    message.success('Expense deleted successfully');
  };

  const handleArchiveExpense = (keys) => {
    // Ensure keys is an array, even if a single key is provided
    const keysArray = Array.isArray(keys) ? keys : [keys];

    // Find and archive the expenses corresponding to the provided keys
    const expensesToArchive = expenses.filter(expense => keysArray.includes(expense.key));
    const updatedExpenses = expenses.filter(expense => !keysArray.includes(expense.key));
    const updatedArchivedExpenses = [...archivedExpenses, ...expensesToArchive.map(expense => ({ ...expense, archived: true }))];

    // Save the updated lists
    saveExpenses(updatedExpenses);
    saveArchivedExpenses(updatedArchivedExpenses);

    message.success(`Expenses(${keysArray.length}) archived successfully`);
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

  // const handleRowSelectionSwitchChange = (checked) => {
  //   setEnableRowSelection(checked);
  // };

  const copyToClipboard = ({ includeHeader = false, copyAll = false }) => {
    const header = ["Date", "Description", "Payment Mode", "Amount"];
    let rows = expenses.filter(expense => copyAll || selectedRowKeys.includes(expense.key)).map(expense => [
      dayjs(expense.date).format('YYYY-MM-DD'),
      expense.description,
      expense.paymentMode,
      expense.amount,
      expense.comment
    ]);

    rows.sort((a, b) => new Date(a[0]) - new Date(b[0]));

    const tsv = [
      ...(includeHeader ? [header] : []),
      ...rows
    ].map(row => row.join('\t')).join('\n');

    navigator.clipboard.writeText(tsv).then(() => {
      message.success(`Table content(${rows.length} rows) copied to clipboard!`);
    }).catch(err => {
      message.error('Failed to copy table content');
      console.error('Could not copy text: ', err);
    });
  };

  const expenseMode = [
    { text: "HDFC Card", value: "hdfc-card" },
    { text: "Kotak Visa Card", value: "kotak-rupay-card" },
    { text: "Kotak Rupay Card", value: "kotak-visa-card" },
    { text: "UPI SBI", value: "upi-sbi" },
    { text: "UPI Kotak", value: "upi-kotak" },
    { text: "UPI Lite", value: "upi-lite" },
    { text: "Cash", value: "cash" },
    { text: "Other", value: "other" }
  ];

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),  // Sort based on raw date values
      sortDirections: ['ascend', 'descend'],  // Enable both ascending and descending sorting
    },
    {
      title: 'Description', dataIndex: 'description', key: 'description'
      , filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            autoFocus
            placeholder="Search description"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <div>
            <Button
              type="link"
              size="small"
              onClick={() => clearFilters && clearFilters()}
            >
              Reset
            </Button>
            <Button
              type="primary"
              size="small"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
            >
              Search
            </Button>
          </div>
        </div>
      ),
      filterIcon: () => <SearchOutlined />,
      onFilter: (value, record) => record.description.toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      sorter: (a, b) => a.amount - b.amount
    },
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
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      sorter: (a, b) => {
        const commentA = a.comment || ''; // Default to empty string if a.comment is undefined
        const commentB = b.comment || ''; // Default to empty string if b.comment is undefined
        return commentA.localeCompare(commentB); // Perform the comparison on non-null values
      },  // Sort alphabetically by comment text
      sortDirections: ['ascend', 'descend'],  // Enable both ascending and descending sorting
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
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text) => text.toISOString(),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),  // Sort based on raw date values
      sortDirections: ['ascend', 'descend'],  // Enable both ascending and descending sorting
    },
    {
      title: 'Description', dataIndex: 'description', key: 'description'
      , filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            autoFocus
            placeholder="Search description"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <div>
            <Button
              type="link"
              size="small"
              onClick={() => clearFilters && clearFilters()}
            >
              Reset
            </Button>
            <Button
              type="primary"
              size="small"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
            >
              Search
            </Button>
          </div>
        </div>
      ),
      filterIcon: () => <SearchOutlined />,
      onFilter: (value, record) => record.description.toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      sorter: (a, b) => a.amount - b.amount
    },
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
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      sorter: (a, b) => {
        const commentA = a.comment || ''; // Default to empty string if a.comment is undefined
        const commentB = b.comment || ''; // Default to empty string if b.comment is undefined
        return commentA.localeCompare(commentB); // Perform the comparison on non-null values
      },  // Sort alphabetically by comment text
      sortDirections: ['ascend', 'descend'],  // Enable both ascending and descending sorting
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

  const items = [
    { label: 'Archive Selected', key: 'item-1' },
  ];

  const onMenuClick = (e) => {
    if (e.key === "item-1") {
      handleArchiveExpense(selectedRowKeys)
    }
  }

  return (
    <div style={{ maxWidth: '100%', overflowX: 'auto' }} className='expense-continer-div'>
      <Row gutter={[16, 16]}>
        <Col sm={12} md={24} style={{ display: "flex", justifyContent: "space-between" }}>
        <Tooltip title="Add Expense">
          <Button className='expense-btn' onClick={() => setIsModalVisible(true)}>
            {isMobile() ? <PlusOutlined/> :"Add Expense"}
          </Button>
          </Tooltip>
          <Tooltip title="Copy All Rows">
            <Button className='expense-btn' onClick={() => copyToClipboard({ copyAll: true })}>
            {isMobile() ? <CopyOutlined/> :"Copy All"}
          </Button>
          </Tooltip>
          <Tooltip title="Archive All Rows">
            <Button className='expense-btn' onClick={() => handleArchiveExpense(expenses.map(e => e.key))}>
            {isMobile() ? <DatabaseOutlined/> :"Archive All" }
          </Button>
          </Tooltip>
        </Col>
        <Col sm={12} md={24}>
          <Dropdown.Button
            menu={{
              items,
              onClick: onMenuClick,
            }}
            onClick={copyToClipboard}
            disabled={selectedRowKeys.length === 0}
          >
            {isMobile() ? <CopyOutlined/> : `Copy Selected (${selectedRowKeys.length})`}
          </Dropdown.Button>
        </Col>
      </Row>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h3 style={{ marginTop: 20 }}>Active Expenses ({expenses ? expenses.length : 0})</h3>
        <h4 style={{ marginTop: 20 }}>
          Total ({selectedRowKeys.length} selected) - {expenses.filter(expense => selectedRowKeys.includes(expense.key)).reduce((accumulator, currentItem) => {
            return accumulator + Number(currentItem.amount);
          }, 0)}
        </h4>
      </div>

      <Table
        rowSelection={rowSelection}
        dataSource={expenses}
        columns={columns}
        style={{ marginTop: 20 }}
        scroll={{ x: 'max-content' }}
      />
      <h3 style={{ marginTop: 20 }}>Archived Expenses ({archivedExpenses ? archivedExpenses.length : 0})</h3>
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
            <Radio.Group className="tag-radio-group">
              {expenseMode.map((expenseType, index) =>
                <Radio.Button value={expenseType.value} key={index} className="tag-radio">{expenseType.text}</Radio.Button>
              )}
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Please select the date!' }]}
            initialValue={dayjs()}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="comment"
            label="Comment"
            rules={[{ required: false, message: 'Please enter the comment' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExpenseTracker;
