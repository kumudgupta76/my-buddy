import React, { useState, useEffect } from 'react';
import { Layout, notification, List, Button, Row, Col } from 'antd';
import Timer from './Timer';
import Reminder from './Reminder';
import moment from 'moment';
import TaskDetails from './TaskDetails';

const { Header, Content } = Layout;

const Base = () => {
  const [reminders, setReminders] = useState(JSON.parse(localStorage.getItem('reminders')) || []);
  const [archivedReminders, setArchivedReminders] = useState(JSON.parse(localStorage.getItem('archivedReminders')) || []);
  const [currentDate, setCurrentDate] = useState(moment().startOf('day'));
  const [deadline, setDeadline] = useState(Date.now() + 30 * 60 * 1000);

  // Load reminders and archived reminders from local storage on initial load
  useEffect(() => {
    const storedReminders = JSON.parse(localStorage.getItem('reminders')) || [];
    const storedArchivedReminders = JSON.parse(localStorage.getItem('archivedReminders')) || [];
    setReminders(storedReminders);
    setArchivedReminders(storedArchivedReminders);
  }, []);

  // Save reminders and archived reminders to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem('archivedReminders', JSON.stringify(archivedReminders));
  }, [archivedReminders]);

  const addReminder = (reminder) => {
    setReminders([...reminders, reminder]);
    notification.success({
      message: 'Reminder Added',
      description: `${reminder.task} scheduled for ${reminder.time.format('LLL')}`,
    });
  };

  const archiveReminder = (index) => {
    const newReminders = [...reminders];
    const archivedReminder = newReminders.splice(index, 1);
    setReminders(newReminders);
    setArchivedReminders([...archivedReminders, ...archivedReminder]);
    notification.info({
      message: 'Reminder Archived',
      description: `${archivedReminder[0].task} has been archived`,
    });
  };

  const unarchiveReminder = (index) => {
    const newArchivedReminders = [...archivedReminders];
    const unarchivedReminder = newArchivedReminders.splice(index, 1);
    setArchivedReminders(newArchivedReminders);
    setReminders([...reminders, ...unarchivedReminder]);
    notification.success({
      message: 'Reminder Unarchived',
      description: `${unarchivedReminder[0].task} has been unarchived`,
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = moment();
      reminders.forEach((reminder, index) => {
        if (moment(reminder.time).isSame(now, 'minute')) {
          notification.open({
            message: 'Reminder',
            description: reminder.task,
          });
          archiveReminder(index);
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [reminders]);

  const handlePrevDay = () => {
    setCurrentDate(currentDate.clone().subtract(1, 'days'));
  };

  const handleNextDay = () => {
    setCurrentDate(currentDate.clone().add(1, 'days'));
  };

  const filteredReminders = reminders.filter((reminder) =>
    moment(reminder.time).isSame(currentDate.startOf('day'), 'day')  
  );

  const filteredArchivedReminders = archivedReminders.filter((reminder) =>
    moment(reminder.time).isSame(currentDate.startOf('day'), 'day')
  );

  const handleEdit = () => {
    console.log('Edit button clicked');
  };
  
  const handleDelete = () => {
    console.log('Delete button clicked');
  };
  
  const handleArchive = () => {
    console.log('Archive button clicked');
  };

  return (
    <div>
        <Reminder addReminder={addReminder} />
        <div style={{ marginBottom: '20px' }}>
          <Button onClick={handlePrevDay}>Previous Day</Button>
          <Button onClick={handleNextDay} style={{ marginLeft: '10px' }}>Next Day</Button>
        </div>
        <Row>
            <Col span="24">Active Reminders - ({filteredReminders.length})</Col>
            <Col span={24}>
                {filteredReminders.map(item => <TaskDetails
                    task={item} 
                    onEdit={handleEdit} 
                    onDelete={handleDelete} 
                    onArchive={handleArchive} 
                />)}
            </Col>
        </Row>
        <List
          header={<div>Test</div>}
          bordered
          dataSource={filteredReminders}
          renderItem={(item, index) => (
            <List.Item
              actions={[
                <Button type="link" onClick={() => archiveReminder(index)}>Archive</Button>
              ]}
            >
              {item.task} - {moment(item.time).fromNow()}

              <TaskDetails
                    task={item} 
                    onEdit={handleEdit} 
                    onDelete={handleDelete} 
                    onArchive={handleArchive} 
                />
            </List.Item>
          )}
          style={{ marginTop: '20px', width: '100%' }}
        />
        <List
          header={<div>Archived Reminders</div>}
          bordered
          dataSource={filteredArchivedReminders}
          renderItem={(item, index) => (
            <List.Item
              actions={[
                <Button type="link" onClick={() => unarchiveReminder(index)}>Unarchive</Button>,
                <Button type="link" onClick={() => archiveReminder(index)}>Delete</Button>
              ]}
              style={{ textDecoration: 'line-through' }}
            >
              {item.task} - {moment(item.time).fromNow()}
            </List.Item>
          )}
          style={{ marginTop: '20px', width: '100%' }}
        />
      <Timer deadline={deadline} />
    </div>
  );
};

export default Base;
