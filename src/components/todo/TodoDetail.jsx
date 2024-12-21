import { Button, Checkbox, Typography } from 'antd';
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
    <div style={{ backgroundColor: "white", padding: "10px", marginTop: "10px", borderRadius: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{todo.title}</span>
        <span>{ getDisplayDueDate(todo.date)}</span>
      </div>
      <hr />
      <div style={{ margin: 0, whiteSpace: "pre-wrap", overflow: "auto" }}>
        <div dangerouslySetInnerHTML={{ __html: todo.description }} />
        {todo.checklist && todo.checklist.map((item) => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
            <Checkbox
              checked={item.completed}
            >
              <span
                style={{
                  textDecoration: item.completed ? 'line-through' : 'none',
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
