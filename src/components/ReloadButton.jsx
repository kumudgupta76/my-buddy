import { Button } from 'antd';
import React from 'react';

const ReloadButton = () => {
  const handleReload = () => {
    window.location.reload(true);
  };

  return (
    <Button onClick={handleReload}>
      Reload Page
    </Button >
  );
};

export default ReloadButton;
