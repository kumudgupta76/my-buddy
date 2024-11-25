import React from 'react';
import { List, Button, Checkbox, Typography, Row,Col } from 'antd';
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
      <Title level={4}>All Tasks</Title>
      <List
        dataSource={todos}
        renderItem={todo => (
          <List.Item key={todo.id} className={todo.completed ? 'completed-task' : ''}>
            <Row >
              <Col>
              <Checkbox
                checked={todo.completed}
                onChange={() => handleToggleCompleted(todo.id)}
              >
                {todo.title}
              </Checkbox>
              
              <Button
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteTask(todo.id)}
                size="small"
              />
              </Col>
              <Col>
              <div style={{overflow:"auto"}} dangerouslySetInnerHTML={{ __html: todo.description }} />
              </Col>
            </Row>
            <Row>
              
            </Row>
            
          </List.Item>
        )}
      />
    </div>
  );
};

export default TodoTracker;
