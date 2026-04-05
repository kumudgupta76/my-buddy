import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Table, Modal, message, Row, Col, DatePicker, Checkbox, Tooltip, Space } from 'antd';
import dayjs from 'dayjs';
import TodoDetail from './TodoDetail';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import { CloudDownloadOutlined, CloudUploadOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { fetchData, saveData } from '../../common/dbUtils';
import { getCurrentUser } from '../../common/authUtils';
import { COLLECTION_NAME, dateToString, DOC_ID_TODO, isMobile } from '../../common/utils';

const TodoTracker = () => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletedTodos, setDeletedTodos] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [enableRowSelection, setEnableRowSelection] = useState(false);

  const prepareTodosForStorage = (todos) => {
    return todos.map(todo => ({
      ...todo,
      date: dateToString(todo.date),
      description: todo.description || '',
      checklist: todo.checklist || [],
    }));
  };

  const prepareTodosFromStorage = (todos) => {
    return todos.map(todo => ({
      ...todo,
      date: dayjs(todo.date),
    }));
  };

  useEffect(() => {
    const fetchDataFromFirestore = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Fetch todos from Firestore
      const todoDatafromFirestore = await fetchData(COLLECTION_NAME, currentUser.uid);
      if (todoDatafromFirestore.success) {
        const storedTodos = todoDatafromFirestore.data["todo-data"] || [];
        const deleltedArchivedTodos = todoDatafromFirestore.data["deleted-todo-data"] || [];
        const todosWithDayjsDates = prepareTodosFromStorage(storedTodos);
        const deletedTodosWithDayjsDate = prepareTodosFromStorage(deleltedArchivedTodos);

        setDeletedTodos(deletedTodosWithDayjsDate);
        setTodos(todosWithDayjsDates);
      }

      setLoading(false);
    };

    fetchDataFromFirestore();
  }, []);

  // useEffect(() => {
  //   saveTodos(todos);
  // }, [todos]);

  const saveTodos = async (newTodos) => {
    setTodos(newTodos);
    const todosToStore = prepareTodosForStorage(newTodos);
    const deletedTodosToStore = prepareTodosForStorage(deletedTodos);

    const results = await saveData(COLLECTION_NAME, getCurrentUser().uid, { "todo-data": todosToStore, "deleted-todo-data": deletedTodosToStore });
    console.log(results);

  };

  const saveDeletedTodos = async (deletedTodos, filterdTodos) => {
    setTodos(filterdTodos);
    setDeletedTodos(deletedTodos);
    const todosToStore = prepareTodosForStorage(filterdTodos);
    const deletedTodosToStore = prepareTodosForStorage(deletedTodos);

    const results = await saveData(COLLECTION_NAME, getCurrentUser().uid, { "todo-data": todosToStore, "deleted-todo-data": deletedTodosToStore });
    console.log(results);
  };

  const handleAddTodo = () => {
    form.validateFields().then((values) => {
      if (editingTodo) {
        const updatedTodos = todos.map((todo) =>
          todo.key === editingTodo.key ? { ...todo, ...values } : todo
        );
        saveTodos(updatedTodos);
        setEditingTodo(null);
      } else {
        const newTodo = { ...values, key: Date.now().toString(), checklist: [], archived: false }; // Add checklist as empty
        const newTodos = [newTodo, ...todos];
        saveTodos(newTodos);
      }
      form.resetFields();
      setIsModalVisible(false);
      message.success('Todo saved successfully');
    }).catch((errorInfo) => {
      console.error('Validation Failed:', errorInfo);
      message.error('Please fill in the required fields!');
    });
  };

  const handleEditTodo = (record) => {
    form.setFieldsValue({
      ...record,
      date: dayjs(record.date),
    });
    setEditingTodo(record);
    setIsModalVisible(true);
  };

  const handleDeleteTodo = (key) => {
    const updatedTodos = todos.filter((todo) => todo.key !== key);
    saveDeletedTodos([...deletedTodos, ...todos.filter((todo) => todo.key === key)], updatedTodos);
    message.success('Todo deleted successfully');
  };

  const handleArchiveTodo = (key) => {
    todos.find(todo => todo.key === key).archived = true;
    saveTodos([...todos]);
    // const todoToArchive = todos.find(todo => todo.key === key);
    // const updatedTodos = todos.filter(todo => todo.key !== key);
    // const updatedArchivedTodos = [...archivedTodos, { ...todoToArchive, archived: true }];
    // saveTodos(updatedTodos);
    // saveArchivedTodos(updatedArchivedTodos);
    message.success('Todo archived successfully');
  };

  const handleUnarchiveTodo = (key) => {
    todos.find(todo => todo.key === key).archived = false;
    saveTodos([...todos]);
    // const todoToUnarchive = archivedTodos.find(todo => todo.key === key);
    // const updatedArchivedTodos = archivedTodos.filter(todo => todo.key !== key);
    // const updatedTodos = [...todos, { ...todoToUnarchive, archived: false }];
    // saveTodos(updatedTodos);
    // saveArchivedTodos(updatedArchivedTodos);
    message.success('Todo unarchived successfully');
  };

  const handleRowSelectionSwitchChange = (checked) => {
    setEnableRowSelection(checked);
  };
  const handleAddChecklistItem = (todoKey, newChecklistItem) => {
    const updatedTodos = todos.map(todo => {
      if (todo.key === todoKey) {
        todo.checklist = todo.checklist || [];
        const updatedChecklist = [...todo.checklist, { id: Date.now(), text: newChecklistItem, completed: false }];
        return { ...todo, checklist: updatedChecklist };
      }
      return todo;
    });
    // setTodos(updatedTodos);
    saveTodos(updatedTodos);
    setNewCheckList('');
  };

  const handleToggleChecklistCompletion = (todoKey, checklistId) => {
    const updatedTodos = todos.map(todo => {
      if (todo.key === todoKey) {
        const updatedChecklist = todo.checklist.map(item =>
          item.id === checklistId ? { ...item, completed: !item.completed } : item
        );
        return { ...todo, checklist: updatedChecklist };
      }
      return todo;
    });
    // setTodos(updatedTodos);
    saveTodos(updatedTodos);
  };

  const handleDeleteChecklistItem = (todoKey, checklistId) => {
    const updatedTodos = todos.map(todo => {
      if (todo.key === todoKey) {
        const updatedChecklist = todo.checklist.filter(item => item.id !== checklistId);
        return { ...todo, checklist: updatedChecklist };
      }
      return todo;
    });
    // setTodos(updatedTodos);
    saveTodos(updatedTodos);
  };

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title', width: '80%' },
    {
      title: 'Action',
      key: 'action',
      width: '20%',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit Entry">
            <Button onClick={() => handleEditTodo(record)} icon={<EditOutlined />}>
              {isMobile() ? "" : "Edit"}
            </Button>
          </Tooltip>
          <Tooltip title="Archive Entry">
            {!record.archived && (
              <Button onClick={() => handleArchiveTodo(record.key)} icon={<CloudUploadOutlined />} danger>
                {isMobile() ? "" : "Archive"}
              </Button>
            )}
          </Tooltip>
        </Space>
      ),
    },
  ];

  const archivedColumns = [
    { title: 'Title', key: 'title', width: '80%', render: (_, record) => <>
    <strong>{record.title}</strong>
    
    </> },
    {
      title: 'Action',
      key: 'action',
      width: '20%',
      render: (_, record) => (
        <Space>
          <Tooltip title="Delete Entry">
            <Button
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteTodo(record.key)}
              danger
            >
              {isMobile() ? "" : "Delete"}
            </Button>
          </Tooltip>
          <Tooltip title="Unarchive Entry">
            <Button onClick={() => handleUnarchiveTodo(record.key)} icon={<CloudDownloadOutlined />}>
              {isMobile() ? "" : "Unarchive"}
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const rowSelection = enableRowSelection ? {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  } : null;

  const [newCheckList, setNewCheckList] = useState('');

  if (loading) {
    return (
      <div className="loading-container">
        <div style={{ fontSize: 40, color: 'var(--color-primary)' }}>
          <PlusOutlined spin />
        </div>
        <div style={{ fontSize: 'var(--text-base)', fontWeight: 500 }}>Loading your todos...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '100%', overflowX: 'auto' }} className='todo-container-div'>
      <Button type="primary" onClick={() => setIsModalVisible(true)} block size="large" icon={<PlusOutlined />}
        style={{ borderRadius: 'var(--radius-md)', height: 48, fontSize: 'var(--text-base)', fontWeight: 600 }}>
        New Todo
      </Button>

      {/* Active Todos */}
      <div className="section-header">
        <h3>
          Active Todos
          <span className="badge">{todos ? todos.filter((todos) => !todos.archived).length : 0}</span>
        </h3>
      </div>
      <Table
        rowSelection={rowSelection}
        dataSource={todos.filter((todo) => !todo.archived)}
        columns={columns}
        size="middle"
        expandable={{
          expandedRowRender: (record) => (
            <Row gutter={[16, 16]}>
              <Col md={12} sm={24} style={{ width: "100%" }}>
                <TodoDetail todo={record} />
              </Col>
              <Col md={12} sm={24} style={{ width: "100%" }}>
                <div className="info-card" style={{ marginTop: 'var(--space-sm)' }}>
                  <div style={{ display: "flex", gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                    <Input
                      placeholder="Add checklist item..."
                      onChange={(e) => setNewCheckList(e.target.value)}
                      onPressEnter={(e) => handleAddChecklistItem(record.key, e.target.value)}
                      value={newCheckList}
                      style={{ flex: 1 }}
                    />
                    <Button disabled={newCheckList.length == 0} onClick={() => handleAddChecklistItem(record.key, newCheckList)} icon={<PlusOutlined />} type="primary" />
                  </div>
                  {record.checklist && record.checklist.map((item) => (
                    <div key={item.id} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: 'center',
                      padding: 'var(--space-sm) 0',
                      borderBottom: '1px solid var(--color-border-light)',
                    }}>
                      <Checkbox
                        checked={item.completed}
                        onChange={() => handleToggleChecklistCompletion(record.key, item.id)}
                      >
                        <span style={{
                          textDecoration: item.completed ? 'line-through' : 'none',
                          color: item.completed ? 'var(--color-text-muted)' : 'var(--color-text)',
                          transition: 'all var(--transition-fast)',
                        }}>{item.text}</span>
                      </Checkbox>
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteChecklistItem(record.key, item.id)}
                        size="small"
                        danger
                      />
                    </div>
                  ))}
                </div>
              </Col>
            </Row>
          ),
        }}
      />

      {/* Archived Todos */}
      <div className="section-header">
        <h3>
          Archived Todos
          <span className="badge">{todos ? todos.filter((todo) => todo.archived).length : 0}</span>
        </h3>
      </div>
      <Table
        dataSource={todos.filter((todo) => todo.archived)}
        columns={archivedColumns}
        size="middle"
        expandable={{
          expandedRowRender: (record) => (
            <Row gutter={[16, 16]}>
              <Col md={12} sm={24}>
                <TodoDetail todo={record} />
              </Col>
              <Col md={12} sm={24}>
                <div className="info-card" style={{ marginTop: 'var(--space-sm)' }}>
                  {record.checklist && record.checklist.map((item) => (
                    <div key={item.id} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: 'var(--space-sm) 0',
                      borderBottom: '1px solid var(--color-border-light)',
                    }}>
                      <Checkbox checked={item.completed}>
                        <span style={{
                          textDecoration: item.completed ? 'line-through' : 'none',
                          color: item.completed ? 'var(--color-text-muted)' : 'var(--color-text)',
                        }}>{item.text}</span>
                      </Checkbox>
                    </div>
                  ))}
                </div>
              </Col>
            </Row>)
        }}
      />
      <div style={{ marginTop: 'var(--space-md)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
        Deleted Todos: {deletedTodos.length}
      </div>
      <Modal
        title={editingTodo ? 'Edit Todo' : 'Add Todo'}
        open={isModalVisible}
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
        centered
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleAddTodo}>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Please input the title!' }]}>
            <Input placeholder="Enter Todo Title" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: false, message: 'Please enter the description' }]}>
            <ReactQuill
              theme="snow"
              placeholder="Write your description here..."
              onChange={(content) => form.setFieldsValue({ description: content })}
              modules={{
                toolbar: [
                  [{ 'header': [1, 2, false] }, { 'font': [] }],
                  ['bold', 'italic', 'blockquote'],
                  ['link', 'image'],
                  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                  ['checklist'],
                  ['clean'],
                ],
              }}
            />
          </Form.Item>
          <Form.Item
            name="date"
            label="Due Date"
            rules={[{ required: true, message: 'Please select the date!' }]}
            initialValue={dayjs()}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TodoTracker;
