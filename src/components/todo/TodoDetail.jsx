import React from 'react';

const TodoDetail = ({ todo }) => {
  return (
    <div>
      <h4>{todo.title}</h4>
      <div style={{ margin: 0, whiteSpace: "pre-wrap" }}>
        <div dangerouslySetInnerHTML={{ __html: todo.description }} />
        <br />
        <strong>Created At:</strong> {new Date(todo.date).toLocaleString()}
      </div>
    </div>
  );
};

export default TodoDetail;
