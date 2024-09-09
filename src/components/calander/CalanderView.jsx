import React, { useState, useEffect } from 'react';
import { Form, Calendar, Modal, Button, Input, List, Typography, Space, Row, Col,message, DatePicker } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import moment from "moment";
import './CalendarView.css';
import { dateToString, isMobile } from '../../common/utils';
import TodoTracker from './TodoTracker';
import TextArea from 'antd/lib/input/TextArea';

const { Title } = Typography;

const CalendarView = () => {
  const [selectedDate, setSelectedDate] = useState(moment());
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
    const todosWithmomentDates = storedTodos.map(todo => ({
      ...todo,
      date: moment(todo.date),
    }));
    const archivedTodosWithmomentDates = storedArchivedTodos.map(todo => ({
      ...todo,
      date: moment(todo.date),
    }));
    setTodos(todosWithmomentDates);
    setArchivedTodos(archivedTodosWithmomentDates);
  }, []);

  useEffect(() => {
    form.resetFields();
  }, [isModalVisible]);

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
      values.date = dateToString(values.date) // Convert to string before saving
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
    }).catch((errorInfo) => {
      // Handle form validation error here
      console.error('Validation Failed:', errorInfo);
      message.error('Please fill in the required fields!');
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

  const handleDateClick = (value) => {
    setSelectedDate(value);
  };

  // const handleAddTask = () => {
  //   if (taskInput.trim()) {
  //     const newTask = {
  //       id: Date.now(), // A unique identifier for the task
  //       date: dateToString(selectedDate), // Store the date in string format
  //       title: taskInput, // The title of the task from the input
  //       completed: false, // By default, the task is not completed
  //       key: Date.now().toString(), // Another unique identifier for React lists
  //     };
  //     setTodos([...todos, newTask]);
  //     setTaskInput('');
  //     setIsModalVisible(false);
  //   }
  // };

  // const handleEditTask = (taskId, newText) => {
  //   const updatedTodos = todos.map(todo =>
  //     todo.id === taskId ? { ...todo, title: newText } : todo
  //   );
  //   setTodos(updatedTodos);
  // };

  // const handleDeleteTask = (taskId) => {
  //   const updatedTodos = todos.filter(todo => todo.id !== taskId);
  //   setTodos(updatedTodos);
  // };

  const getTasksForDate = (date) => {
    const dateStr = dateToString(date);
    return todos.filter(todo => dateToString(todo.date) === dateStr);
  };

  const handleTodosChange = (newTodos) => {
    setTodos(newTodos);
  };

  return (
    <div className="calendar-container">
      <Row gutter={[16, 16]}>
        <Col sm={24} md={12}>
          <Button onClick={() => setIsModalVisible(true)}>Add Task</Button>
          <Button style={{ marginLeft: "10px" }} onClick={() => setSelectedDate(moment())}>Today</Button>
        </Col>
        <Col sm={24} md={12}>
          <div style={{ border: "1px solid", borderRadius: "2px", padding: "4px" }}>
            {`Date - ${selectedDate.format("YYYY-MM-DD")}`}
          </div>
        </Col>
      </Row>

      <Calendar
        onSelect={handleDateClick}
        fullscreen={!isMobile()}
        dateCellRender={(date) => {
          const tasksForDate = getTasksForDate(date);
          return (
            <div className="calendar-date-cell">
              {tasksForDate.map(task => (
                <div key={task.key} className="calendar-task">
                  <div className='date-cell-title'>{task.title}</div>
                </div>
              ))}
            </div>
          );
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
            <TextArea rows={4}/>
          </Form.Item>

          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Please select the date!' }]}
            initialValue={selectedDate}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* TodoTracker component, now using the shared todos object */}
      <div style={{ marginTop: '20px' }}>
        <Title level={4}>Todo Tracker</Title>
        <TodoTracker todos={todos} onTodosChange={handleTodosChange} />
      </div>
    </div>
  );
};

export default CalendarView;
