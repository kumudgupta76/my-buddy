import { getCurrentUser } from "../common/authUtils";
import { Typography } from 'antd';
import { FileExclamationOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const NoPage = () => {
    console.log(process.env);
    const user = getCurrentUser();
    return (
      <div className="empty-state">
        <FileExclamationOutlined className="empty-state-icon" />
        <Title level={3} style={{ color: 'var(--color-text-muted)', margin: 0 }}>404</Title>
        <Text type="secondary">
          {process.env.APP_NAME} - {JSON.stringify(user)}
        </Text>
      </div>
    );
  };
  
  export default NoPage;