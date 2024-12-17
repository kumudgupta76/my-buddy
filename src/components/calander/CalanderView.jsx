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
      {todos.map(todo => <div style={{ backgroundColor: "#f9f9f9", padding: "10px", marginTop: "10px", borderRadius: "10px" }}><TodoDetail todo={todo} /> </div>)}
    </div>
  );
};

export default CalendarView;
