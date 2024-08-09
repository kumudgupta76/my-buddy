// src/components/CalendarView.js
import React, { useState, useEffect } from 'react';
import { Calendar, Modal, Button, Input, List, Typography, Space } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import './CalendarView.css'; // Import the CSS file for additional styling
import TodoTracker from '../todo/Todo';
import moment from "moment";
import { dateToString, isMobile } from '../../common/utils';

const { Title } = Typography;

const CalendarView = () => {
  const [selectedDate, setSelectedDate] = useState(moment());
  const [tasks, setTasks] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [editTaskId, setEditTaskId] = useState(null);

  useEffect(() => {
    // Load tasks from localStorage
    const savedTasks = JSON.parse(localStorage.getItem('tasks')) || {};
    setTasks(savedTasks);
  }, []);

  useEffect(() => {
    // Save tasks to localStorage
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleDateClick = (value) => {
    setSelectedDate(value);
  };

  const handleAddTask = () => {
    if (taskInput.trim()) {
      setTasks({
        ...tasks,
        [dateToString(selectedDate)]: [...(tasks[dateToString(selectedDate)] || []), { id: Date.now(), text: taskInput }],
      });
      setTaskInput('');
      setIsModalVisible(false);
    }
  };

  const handleEditTask = (taskId, newText) => {
    setTasks({
      ...tasks,
      [dateToString(selectedDate)]: tasks[dateToString(selectedDate)].map(task => 
        task.id === taskId ? { ...task, text: newText } : task
      ),
    });
  };

  const handleDeleteTask = (taskId) => {
    setTasks({
      ...tasks,
      [dateToString(selectedDate)]: tasks[dateToString(selectedDate)].filter(task => task.id !== taskId),
    });
  };

  return (
    <div className="calendar-container">
      <Button 
        onClick={() => setIsModalVisible(true)}
      >Add Task</Button>
      <Button 
        style={{marginLeft:"10px"}}
        onClick={() => setSelectedDate(moment())}
      >Today</Button>
      <Typography.Text style={{marginLeft:"10px", border:"1px solid", padding:"5px", borderRadius:"2px"}} >{`Date - ${selectedDate.toLocaleString()}`}</Typography.Text>
      <Calendar
        onSelect={handleDateClick}
        fullscreen={!isMobile()}
        dateCellRender={(date) => {
          const dateStr = dateToString(date);
          return (
            <div className="calendar-date-cell">
              {tasks[dateStr]?.map(task => (
                <div key={task.id} className="calendar-task">
                  <div className='date-cell-title'>{task.text}</div>
                </div>
              ))}
            </div>
          );
        }}
      />
      <Modal
        title={<Title level={4}>Tasks for {dateToString(selectedDate)}</Title>}
        visible={isModalVisible}
        onOk={handleAddTask}
        onCancel={() => setIsModalVisible(false)}
        okText="Add Task"
        cancelText="Cancel"
        className="calendar-modal"
      >
        <Input
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          placeholder="Add a new task"
        />
        <List
          dataSource={tasks[dateToString(selectedDate)] || []}
          renderItem={item => (
            <List.Item className="task-list-item">
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                {item.text}
                <Space>
                  <Button 
                    icon={<EditOutlined />} 
                    onClick={() => handleEditTask(item.id, prompt('Edit Task:', item.text))}
                    size="small"
                  />
                  <Button 
                    icon={<DeleteOutlined />} 
                    onClick={() => handleDeleteTask(item.id)}
                    size="small"
                  />
                </Space>
              </Space>
            </List.Item>
          )}
        />
      </Modal>

      <div>
        {JSON.stringify(tasks)}
      </div>
    </div>
  );
};

export default CalendarView;
