import React from 'react';
import { List, Button, Checkbox, Typography, Row, Col } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

const { Title } = Typography;

const TodoTracker = ({ todos, onTodosChange }) => {
  // Handle toggling the completed status of a task
  const handleToggleCompleted = (taskId) => {
    const updatedTodos = todos.map(todo =>
      todo.id === taskId ? { ...todo, completed: !todo.completed } : todo
    );
    onTodosChange(updatedTodos); // Pass the updated todos to the parent
  };

  // Handle deleting a task
  const handleDeleteTask = (taskId) => {
    const updatedTodos = todos.filter(todo => todo.id !== taskId);
    onTodosChange(updatedTodos); // Pass the updated todos to the parent
  };

  return (
    <div>
      <div className="section-header">
        <h3>All Tasks<span className="badge">{todos.length}</span></h3>
      </div>
      <List
        dataSource={todos}
        renderItem={todo => (
          <List.Item key={todo.id} className={todo.completed ? 'completed-task' : ''} style={{ padding: 'var(--space-sm) var(--space-md)' }}>
            <Row style={{ width: '100%' }}>
              <Col span={24}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Checkbox
                    checked={todo.completed}
                    onChange={() => handleToggleCompleted(todo.id)}
                  >
                    <span style={{
                      textDecoration: todo.completed ? 'line-through' : 'none',
                      color: todo.completed ? 'var(--color-text-muted)' : 'var(--color-text)',
                      fontWeight: 500,
                    }}>
                      {todo.title}
                    </span>
                  </Checkbox>
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteTask(todo.id)}
                    size="small"
                    type="text"
                    danger
                  />
                </div>
              </Col>
              {todo.description && (
                <Col span={24}>
                  <div style={{
                    overflow: "auto",
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    paddingLeft: 24,
                    marginTop: 'var(--space-xs)',
                  }} dangerouslySetInnerHTML={{ __html: todo.description }} />
                </Col>
              )}
            </Row>
          </List.Item>
        )}
      />
    </div>
  );
};

export default TodoTracker;
