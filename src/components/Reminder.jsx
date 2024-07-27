import React, { useState } from 'react';
import { DatePicker, TimePicker, Button, Input } from 'antd';
import moment from 'moment';

const Reminder = ({ addReminder }) => {
  const [date, setDate] = useState(moment());
  const [time, setTime] = useState(moment());
  const [task, setTask] = useState('');
  const [description, setDescription] = useState('');

  const handleAddReminder = () => {
    if (date && time && task) {
      const reminderTime = moment(date).set({
        hour: time.hour(),
        minute: time.minute(),
      });
      const createdAt = moment();
      const updatedAt = moment();
      addReminder({ task, time: reminderTime, createdAt, updatedAt, description });
      setDate(moment());
      setTime(moment());
      setTask('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Input 
        placeholder="Task" 
        value={task} 
        onChange={(e) => setTask(e.target.value)} 
        style={{ marginBottom: '10px', width: '300px' }}
      />
      <Input 
        placeholder="Description" 
        value={description} 
        onChange={(e) => setDescription(e.target.value)} 
        style={{ marginBottom: '10px', width: '300px' }}
      />
      <DatePicker 
        onChange={(value) => setDate(value)} 
        value={date} 
        style={{ marginBottom: '10px', width: '300px' }}
      />
      <TimePicker 
        onChange={(value) => setTime(value)} 
        value={time} 
        style={{ marginBottom: '10px', width: '300px' }}
      />
      <Button type="primary" onClick={handleAddReminder}>Add Reminder</Button>
    </div>
  );
};

export default Reminder;
