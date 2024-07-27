import React from 'react';
import { Card, Button, Typography, Space, Row, Col, Popover, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, BoxPlotOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const TaskDetails = ({ task, onEdit, onDelete, onArchive }) => {
  return (
    <Card
      title={task.task}
      style={{ margin: '10px auto' }}
    >
      <Row>
        <Col flex="auto">
          <Row>
            <Title level={5}>{task.description}</Title>
          </Row>
          <Row>
            <Col span={24}><strong>Time:</strong> {new Date(task.time).toLocaleString()}</Col>
          </Row>
          <Row>
            <Col span={12}><strong>Created At:</strong> {new Date(task.createdAt).toLocaleString()}
            </Col>
            <Col span={12}><strong>Updated At:</strong> {new Date(task.updatedAt).toLocaleString()}
            </Col>
          </Row>
        </Col>
        <Col flex="50px" >
          <Row style={{ textAlign: "center" }}>
            <Tooltip title="Edit Task">
              <Button
                icon={<EditOutlined />}
                onClick={onEdit}
                type="primary"
              >
              </Button>
            </Tooltip>

          </Row>
          <Row>
            <Tooltip title="Delete Task">
              <Button
                icon={<DeleteOutlined />}
                onClick={onDelete}
                type="danger"
              >

              </Button>
            </Tooltip>
          </Row>
          <Row>
            <Tooltip title="Archive Task">
              <Button
                icon={<BoxPlotOutlined />}
                onClick={onArchive}
              >

              </Button>
            </Tooltip>
          </Row>
        </Col>
      </Row>
    </Card>
  );
};

export default TaskDetails;
