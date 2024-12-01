import React from 'react';

const TodoDetail = ({ todo }) => {
  return (
    <div style={{backgroundColor: "white", padding:"10px", marginTop:"10px", borderRadius:"10px" }}>
      <div style={{display:"flex", justifyContent:"space-between"}}>
        <span>{todo.title}</span>
        <span>{new Date(todo.date).toLocaleString()}</span>
      </div>
      <hr />
      <div style={{ margin: 0, whiteSpace: "pre-wrap"}}>
        <div dangerouslySetInnerHTML={{ __html: todo.description }} />
      </div>
    </div>
  );
};

export default TodoDetail;
