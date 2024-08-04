import React from 'react';

const TodoDetail = ({todo}) => {
  return (
    <div>
      <h4>{todo.title}</h4>
      <p style={{ margin: 0 }}>{todo.description}<br></br><strong>Created At:</strong> {new Date(todo.date).toLocaleString()}</p>
    </div>
  );
};

export default TodoDetail;
