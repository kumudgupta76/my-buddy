import { Checkbox, Typography } from 'antd';
import dayjs from 'dayjs';
import React from 'react';
import { ClockCircleOutlined } from '@ant-design/icons';



const TodoDetail = ({ todo }) => {
  const { Text } = Typography;

  const getDisplayDueDate = (date) => {
    const now = dayjs();

    const dueDate = dayjs(date);
  
    const diffInDays = dueDate.diff(now, 'day'); // Total days remaining
    
    const weeks = Math.floor(diffInDays / 7); // Calculate weeks
    const days = diffInDays % 7; // Calculate remaining days after weeks
    console.log(weeks, days, diffInDays);
    // Format the time string
    let timeRemaining = '';
    if (diffInDays > 0) {
      timeRemaining = `${weeks > 0 ? `${weeks} week${weeks > 1 ? 's' : ''}` : ''} ${days > 0 ? `${days} day${days > 1 ? 's' : ''}` : ''}`;
      timeRemaining = timeRemaining.trim(); // Clean up extra spaces
    } else {
      timeRemaining = 'Due Now';
    }

    let type = 'success'; // Default color
    if (diffInDays <= 3) {
      type = 'danger'; // Less than 3 days remaining - red
    } else if (diffInDays <= 7) {
      type = 'warning'; // Less than or equal to 7 days - orange
    }
  
    return <> <Text type={{type}}><ClockCircleOutlined /> {timeRemaining}</Text> ({dueDate.format("Do MMM YY")})</>;
}
  return (
    <div className="info-card" style={{ marginTop: 'var(--space-sm)' }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
        <span style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>{todo.title}</span>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{ getDisplayDueDate(todo.date)}</span>
      </div>
      <div style={{
        height: 1,
        background: 'var(--color-border-light)',
        margin: 'var(--space-sm) 0',
      }} />
      <div style={{ margin: 0, whiteSpace: "pre-wrap", overflow: "auto", fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
        <div dangerouslySetInnerHTML={{ __html: todo.description }} />
        {todo.checklist && todo.checklist.map((item) => (
          <div key={item.id} style={{
            display: "flex",
            justifyContent: "space-between",
            padding: 'var(--space-xs) 0',
          }}>
            <Checkbox
              checked={item.completed}
            >
              <span
                style={{
                  textDecoration: item.completed ? 'line-through' : 'none',
                  color: item.completed ? 'var(--color-text-muted)' : 'var(--color-text)',
                }}
              >{item.text}</span>
            </Checkbox>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodoDetail;
