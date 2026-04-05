import React, { useState, useEffect } from 'react';
import { Calendar, Badge, Layout, Typography } from 'antd';
import moment from 'moment';
import { dateToString } from '../common/utils';
import TodoDetail from './todo/TodoDetail';
import { CalendarOutlined } from '@ant-design/icons';

const { Content } = Layout;
const { Text } = Typography;

const CalendarComponent = () => {
  const [selectedDate, setSelectedDate] = useState(moment()); // Set today's date as the initial state
  const [todos, setTodos] = useState([]);


  useEffect(() => {
    const storedTodos = JSON.parse(localStorage.getItem('todos')) || [];
    const todosWithmomentDates = storedTodos.map(todo => ({
      ...todo,
      date: moment(todo.date),
    }));
    setTodos(todosWithmomentDates);
  }, []);

  // Handle date selection
  const onSelectDate = (date) => {
    setSelectedDate(date);
  };

  const getTasksForDate = (date) => {
    const dateStr = dateToString(date);
    return todos.filter(todo => dateToString(todo.date) === dateStr);
  };

  // Render events on each date cell
  const dateCellRender = (date) => {
    const events = getTasksForDate(date);
    return (
      <div>
        {events.length > 0 && <Badge count={events.length} color="#4f46e5" />}
      </div>
    );
  };

  // Handle mobile responsiveness by adjusting the layout dynamically
  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Content>
        <div className="action-bar" style={{ justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
          <CalendarOutlined style={{ color: 'var(--color-primary)' }} />
          <Text strong style={{ fontSize: 'var(--text-sm)' }}>
            {selectedDate.format("dddd, MMMM D, YYYY")}
          </Text>
        </div>
        <Calendar
          fullscreen={true}
          onSelect={onSelectDate}
          value={selectedDate}
          dateCellRender={dateCellRender}
        />
      </Content>
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
    </Layout>
  );
};

export default CalendarComponent;
