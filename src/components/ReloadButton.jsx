import { Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import React from 'react';

const ReloadButton = () => {
  const handleReload = () => {
    window.location.reload(true);
  };

  return (
    <Button onClick={handleReload} icon={<ReloadOutlined />}>
      Reload Page
    </Button>
  );
};

export default ReloadButton;
