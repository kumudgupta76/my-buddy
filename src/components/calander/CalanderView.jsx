// src/components/CalendarView.js
import React, { useState, useEffect } from 'react';
import { Calendar, Modal, Button, Input, List } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

const CalendarView = () => {
  const [selectedDate, setSelectedDate] = useState(null);
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
    setSelectedDate(value.format('YYYY-MM-DD'));
    setIsModalVisible(true);
  };

  const handleAddTask = () => {
    if (taskInput.trim()) {
      setTasks({
        ...tasks,
        [selectedDate]: [...(tasks[selectedDate] || []), { id: Date.now(), text: taskInput }],
      });
      setTaskInput('');
      setIsModalVisible(false);
    }
  };

  const handleEditTask = (taskId, newText) => {
    setTasks({
      ...tasks,
      [selectedDate]: tasks[selectedDate].map(task => 
        task.id === taskId ? { ...task, text: newText } : task
      ),
    });
  };

  const handleDeleteTask = (taskId) => {
    setTasks({
      ...tasks,
      [selectedDate]: tasks[selectedDate].filter(task => task.id !== taskId),
    });
  };

  return (
    <div>
      <Calendar
        onSelect={handleDateClick}
        dateCellRender={(date) => {
          const dateStr = date.format('YYYY-MM-DD');
          return (
            <div>
              {tasks[dateStr]?.map(task => (
                <div key={task.id}>
                  {task.text}
                  <Button 
                    icon={<EditOutlined />} 
                    onClick={() => handleEditTask(task.id, prompt('Edit Task:', task.text))}
                  />
                  <Button 
                    icon={<DeleteOutlined />} 
                    onClick={() => handleDeleteTask(task.id)}
                  />
                </div>
              ))}
            </div>
          );
        }}
      />
      <Modal
        title={`Tasks for ${selectedDate}`}
        visible={isModalVisible}
        onOk={handleAddTask}
        onCancel={() => setIsModalVisible(false)}
      >
        <Input
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          placeholder="Add a new task"
        />
        <List
          dataSource={tasks[selectedDate] || []}
          renderItem={item => (
            <List.Item>
              {item.text}
              <Button 
                icon={<EditOutlined />} 
                onClick={() => handleEditTask(item.id, prompt('Edit Task:', item.text))}
              />
              <Button 
                icon={<DeleteOutlined />} 
                onClick={() => handleDeleteTask(item.id)}
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default CalendarView;
