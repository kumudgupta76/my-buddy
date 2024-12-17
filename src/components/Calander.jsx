import React, { useState, useEffect } from 'react';
import { Calendar, Badge, Layout, Row, Col, Button } from 'antd';
import moment from 'moment';
import { dateToString } from '../common/utils';
import TodoDetail from './todo/TodoDetail';

const { Content } = Layout;

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
        {events.length > 0 && <Badge count={events.length} color="green" />}
      </div>
    );
  };

  // Handle mobile responsiveness by adjusting the layout dynamically
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content>
        <div style={{background:"white", fontFamily:"monospace", textAlign:"center"}}>{`Selected Date - ${selectedDate.format("YYYY-MM-DD")}`}</div>
        <Calendar
          fullscreen={true}
          onSelect={onSelectDate}
          value={selectedDate}
          dateCellRender={dateCellRender}
        />
      </Content>
      {todos.map(todo => <div><TodoDetail todo={todo} /> </div>)}
    </Layout>
  );
};

export default CalendarComponent;
