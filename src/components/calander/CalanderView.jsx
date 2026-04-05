import React, { useState, useEffect } from 'react';
import { Form, Calendar, Modal, Button, Input, Typography, Row, Col, message, DatePicker } from 'antd';
// import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import moment from "moment";
// import './CalendarView.css';
import { dateToString, isMobile } from '../../common/utils';
import TextArea from 'antd/lib/input/TextArea';
import TodoDetail from '../todo/TodoDetail';

const { Title } = Typography;

const CalendarView = () => {
  const [selectedDate, setSelectedDate] = useState(moment());
  const [todos, setTodos] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    const storedTodos = JSON.parse(localStorage.getItem('todos')) || [];
    const todosWithmomentDates = storedTodos.map(todo => ({
      ...todo,
      date: moment(todo.date),
    }));
    setTodos(todosWithmomentDates);
  }, []);

  useEffect(() => {
    form.resetFields();
  }, [isModalVisible, form]);

  const saveTodos = (newTodos) => {
    const todosToStore = newTodos.map(todo => ({
      ...todo,
      date: dateToString(todo.date),
    }));
    localStorage.setItem('todos', JSON.stringify(todosToStore));
    setTodos(newTodos);
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


  const handleDateClick = (value) => {
    setSelectedDate(value);
  };

  const getTasksForDate = (date) => {
    const dateStr = dateToString(date);
    return todos.filter(todo => dateToString(todo.date) === dateStr);
  };

  const handleTodosChange = (newTodos) => {
    setTodos(newTodos);
  };

  return (
    <div className="calendar-container">
      <div className="action-bar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <Button type="primary" onClick={() => setIsModalVisible(true)} icon={<span>+</span>}>Add Task</Button>
          <Button onClick={() => setSelectedDate(moment())}>Today</Button>
        </div>
        <div className="stat-pill">
          {selectedDate.format("ddd, MMM D, YYYY")}
        </div>
      </div>

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
        centered
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
            <TextArea rows={4} />
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
      {todos.length > 0 && (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <div className="section-header">
            <h3>All Tasks<span className="badge">{todos.length}</span></h3>
          </div>
          {todos.map(todo => (
            <div key={todo.key}>
              <TodoDetail todo={todo} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarView;
