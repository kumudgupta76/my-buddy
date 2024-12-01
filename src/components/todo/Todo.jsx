import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Table, Modal, message, Switch, Row, Col, DatePicker, Checkbox, Tooltip } from 'antd';
import dayjs from 'dayjs';
import TodoDetail from './TodoDetail';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import { dateToString, isMobile } from '../../common/utils';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { copyToClipboard } from '../../common/utils';

const TodoTracker = () => {
  const [todos, setTodos] = useState(() => {
    const savedTodos = JSON.parse(localStorage.getItem('todos'));
    return savedTodos || [];
  });

  const [archivedTodos, setArchivedTodos] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [enableRowSelection, setEnableRowSelection] = useState(false);

  useEffect(() => {
    const storedTodos = JSON.parse(localStorage.getItem('todos')) || [];
    const storedArchivedTodos = JSON.parse(localStorage.getItem('archivedTodos')) || [];
    const todosWithDayjsDates = storedTodos.map(todo => ({
      ...todo,
      date: dayjs(todo.date),
    }));
    const archivedTodosWithDayjsDates = storedArchivedTodos.map(todo => ({
      ...todo,
      date: dayjs(todo.date),
    }));
    setTodos(todosWithDayjsDates);
    setArchivedTodos(archivedTodosWithDayjsDates);
  }, []);

  const saveTodos = (newTodos) => {
    const todosToStore = newTodos.map(todo => ({
      ...todo,
      date: dateToString(todo.date),
    }));
    localStorage.setItem('todos', JSON.stringify(todosToStore));
    setTodos(newTodos);
  };

  const saveArchivedTodos = (newArchivedTodos) => {
    const archivedTodosToStore = newArchivedTodos.map(todo => ({
      ...todo,
      date: dateToString(todo.date),
    }));
    localStorage.setItem('archivedTodos', JSON.stringify(archivedTodosToStore));
    setArchivedTodos(newArchivedTodos);
  };

  const handleAddTodo = () => {
    form.validateFields().then((values) => {
      values.date = dateToString(values.date); // Convert to string before saving
      if (editingTodo) {
        const updatedTodos = todos.map((todo) =>
          todo.key === editingTodo.key ? { ...todo, ...values } : todo
        );
        saveTodos(updatedTodos);
        setEditingTodo(null);
      } else {
        const newTodo = { ...values, key: Date.now().toString(), checklist: [] }; // Add checklist as empty
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
    saveTodos(updatedTodos);
  };

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title', width: '80%' },
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
    { title: 'Title', dataIndex: 'title', key: 'title', width: '80%' },
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
    onChange: setSelectedRowKeys,
  } : null;

  const [newCheckList, setNewCheckList] = useState('');

  return (
    <div style={{ maxWidth: '100%', overflowX: 'auto' }} className='todo-container-div'>
      <Row>
        <Col style={{width:"100%"}}>
          <Button type="primary" onClick={() => setIsModalVisible(true)} block>
            <PlusOutlined></PlusOutlined> Todo
          </Button>
        </Col>
      </Row>
      <h3 style={{ marginTop: 20 }}>Active Todos ({todos ? todos.length : 0})</h3>
      <Table
        rowSelection={rowSelection}
        dataSource={todos}
        columns={columns}
        style={{ marginTop: 20 }}
        // scroll={{ x: 'max-content' }}
        expandable={{
          expandedRowRender: (record) => (
            <Row gutter={[16, 16]}>
              <Col md={12} sm={24} style={{ width:"100%"}}>
                <TodoDetail todo={record} />
              </Col>
              <Col md={12} sm={24} style={{ width:"100%"}}>
                <div style={{ backgroundColor: "white", padding: "10px", marginTop: "10px", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Input
                      placeholder="Add checklist item"
                      onChange={(e) => setNewCheckList(e.target.value)}
                      onPressEnter={(e) => handleAddChecklistItem(record.key, e.target.value)}
                      value={newCheckList}
                    />
                    <Button disabled={newCheckList.length == 0} onClick={() => handleAddChecklistItem(record.key, newCheckList)}><PlusOutlined /></Button>
                  </div>
                  {record.checklist && record.checklist.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
                      <Checkbox
                        checked={item.completed}
                        onChange={() => handleToggleChecklistCompletion(record.key, item.id)}
                      >
                        <span
                          style={{
                            textDecoration: item.completed ? 'line-through' : 'none',
                          }}
                        >{item.text}</span>
                      </Checkbox>
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteChecklistItem(record.key, item.id)}
                      />
                    </div>
                  ))}
                </div>
              </Col>
            </Row>
          ),
        }}
      />
      <h3 style={{ marginTop: 20 }}>Archived Todos ({archivedTodos ? archivedTodos.length : 0})</h3>
      <Table
        dataSource={archivedTodos}
        columns={archivedColumns}
        style={{ marginTop: 20 }}
        // scroll={{ x: 'max-content' }}
        expandable={{
          expandedRowRender: (record) => (
            <Row gutter={[16, 16]}>
              <Col md={12} sm={24}>
                <TodoDetail todo={record} />
              </Col>
              <Col md={12} sm={24}>
                <div style={{ backgroundColor: "white", padding: "10px", marginTop: "10px", borderRadius: "10px" }}>
                  {record.checklist && record.checklist.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
                      <Checkbox
                        checked={item.completed}
                      >
                        <span
                          style={{
                            textDecoration: item.completed ? 'line-through' : 'none',
                          }}
                        >{item.text}</span>
                      </Checkbox>
                    </div>
                  ))}
                </div>
              </Col>
            </Row>)
        }}
      />

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
      >
        <Form form={form} layout="vertical" onFinish={handleAddTodo}>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Please input the title!' }]}>
            <Input placeholder="Enter Todo Title" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: false, message: 'Please enter the description' }]}
          >
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
                  ['checklist'], // Add checklist button
                  ['clean'], // Remove formatting button
                ],
              }}
            />
          </Form.Item>
          <Form.Item
            name="date"
            label="Date"
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
