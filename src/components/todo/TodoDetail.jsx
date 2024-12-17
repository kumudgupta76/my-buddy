import { Button, Checkbox } from 'antd';
import React from 'react';

const TodoDetail = ({ todo }) => {
  return (
    <div style={{ backgroundColor: "white", padding: "10px", marginTop: "10px", borderRadius: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{todo.title}</span>
        <span>{new Date(todo.date).toLocaleString()}</span>
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
