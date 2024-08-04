import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Table, Modal, message, Radio, DatePicker, Switch, Row, Col } from 'antd';
import moment from 'moment';
import TodoDetail from './TodoDetail';

const TodoTracker = () => {
  const [todos, setTodos] = useState([]);
  const [archivedTodos, setArchivedTodos] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [enableRowSelection, setEnableRowSelection] = useState(false);

  useEffect(() => {
    const storedTodos = JSON.parse(localStorage.getItem('todos')) || [];
    const storedArchivedTodos = JSON.parse(localStorage.getItem('archivedTodos')) || [];
    const todosWithMomentDates = storedTodos.map(todo => ({
      ...todo,
      date: moment(todo.date),
    }));
    const archivedTodosWithMomentDates = storedArchivedTodos.map(todo => ({
      ...todo,
      date: moment(todo.date),
    }));
    setTodos(todosWithMomentDates);
    setArchivedTodos(archivedTodosWithMomentDates);
  }, []);

  const saveTodos = (newTodos) => {
    const todosToStore = newTodos.map(todo => ({
      ...todo,
      date: todo.date.toString(),
    }));
    localStorage.setItem('todos', JSON.stringify(todosToStore));
    setTodos(newTodos);
  };

  const saveArchivedTodos = (newArchivedTodos) => {
    const archivedTodosToStore = newArchivedTodos.map(todo => ({
      ...todo,
      date: todo.date.toString(),
    }));
    localStorage.setItem('archivedTodos', JSON.stringify(archivedTodosToStore));
    setArchivedTodos(newArchivedTodos);
  };

  const handleAddTodo = () => {
    form.validateFields().then((values) => {
      values.date = values.date.toISOString(); // Convert to string before saving
      if (editingTodo) {
        const updatedTodos = todos.map((todo) =>
          todo.key === editingTodo.key ? { ...todo, ...values } : todo
        );
        saveTodos(updatedTodos);
        setEditingTodo(null);
      } else {
        const newTodo = { ...values, key: Date.now().toString() };
        const newTodos = [newTodo, ...todos];
        saveTodos(newTodos);
      }
      form.resetFields();
      setIsModalVisible(false);
      message.success('Todo saved successfully');
    });
  };

  const handleEditTodo = (record) => {
    form.setFieldsValue({
      ...record,
      date: moment(record.date), // Convert to moment object for the DatePicker
    });
    setEditingTodo(record);
    setIsModalVisible(true);
  };

  const handleDeleteTodo = (key) => {
    const updatedTodos = archivedTodos.filter((todo) => todo.key !== key);
    saveArchivedTodos(updatedTodos);
    message.success('Todo deleted successfully');
  };

  const handleArchiveTodo = (key) => {
    const todoToArchive = todos.find(todo => todo.key === key);
    const updatedTodos = todos.filter(todo => todo.key !== key);
    const updatedArchivedTodos = [...archivedTodos, { ...todoToArchive, archived: true }];
    saveTodos(updatedTodos);
    saveArchivedTodos(updatedArchivedTodos);
    message.success('Todo archived successfully');
  };

  const handleUnarchiveTodo = (key) => {
    const todoToUnarchive = archivedTodos.find(todo => todo.key === key);
    const updatedArchivedTodos = archivedTodos.filter(todo => todo.key !== key);
    const updatedTodos = [...todos, { ...todoToUnarchive, archived: false }];
    saveTodos(updatedTodos);
    saveArchivedTodos(updatedArchivedTodos);
    message.success('Todo unarchived successfully');
  };

  const handleRowSelectionChange = (selectedKeys) => {
    setSelectedRowKeys(selectedKeys);
  };

  const handleRowSelectionSwitchChange = (checked) => {
    setEnableRowSelection(checked);
  };

  const copyToClipboard = () => {
    const header = ["Description", "Amount", "Payment Mode", "Date"];
    const rows = todos.filter(todo => selectedRowKeys.includes(todo.key)).map(todo => [
      todo.description,
      todo.amount,
      todo.paymentMode,
      moment(todo.date).format('YYYY-MM-DD HH:mm:ss')
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
    { title: 'Title', dataIndex: 'title', key: 'title',width: '80%', },
    {
      title: 'Action',
      key: 'action',
      width: '20%',
      render: (_, record) => (
        <>
          <Button onClick={() => handleEditTodo(record)} type="link">
            Edit
          </Button>
          {!record.archived && (
            <Button onClick={() => handleArchiveTodo(record.key)} type="link" danger>
              Archive
            </Button>
          )}
        </>
      ),
    },
  ];

  const archivedColumns = [
    { title: 'Title', dataIndex: 'title', key: 'title',width: '80%', },
    {
      title: 'Action',
      key: 'action',
      width: '20%',
      render: (_, record) => (
        <>
          <Button onClick={() => handleDeleteTodo(record.key)} type="link" danger>
            Delete
          </Button>
          <Button onClick={() => handleUnarchiveTodo(record.key)} type="link">
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
    <div style={{ maxWidth: '100%', overflowX: 'auto' }} className='todo-continer-div'>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Button type="primary" onClick={() => setIsModalVisible(true)} block>
            Add Todo
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
        <Col xs={24} sm={12} md={8}>
          <h3>
            Total ({selectedRowKeys.length} selected) - {todos.filter(todo => selectedRowKeys.includes(todo.key)).reduce((accumulator, currentItem) => {
              return accumulator + Number(currentItem.amount);
            }, 0)}
          </h3>
        </Col>

      </Row>
      <h2 style={{ marginTop: 20 }}>Active Todos ({todos ? todos.length : 0})</h2>
      <Table
        rowSelection={rowSelection}
        dataSource={todos}
        columns={columns}
        style={{ marginTop: 20 }}
        scroll={{ x: 'max-content' }}
        expandable={{
          expandedRowRender: record =><TodoDetail todo={record}/>
        }}
      />
      <h2 style={{ marginTop: 20 }}>Archived Todos ({archivedTodos ? archivedTodos.length : 0})</h2>
      <Table
        dataSource={archivedTodos}
        columns={archivedColumns}
        style={{ marginTop: 20 }}
        scroll={{ x: 'max-content' }}
        expandable={{
          expandedRowRender: record => <TodoDetail todo={record}/>
        }}
      />

      <Modal
        title={editingTodo ? 'Edit Todo' : 'Add Todo'}
        visible={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingTodo(null);
          form.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={handleAddTodo}>
            Save
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Title is required' }]}
          >
            <Input type="text" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: false, message: 'Please enter the description' }]}
          >
            <Input />
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

export default TodoTracker;
