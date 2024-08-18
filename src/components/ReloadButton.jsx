import React from 'react';

const ReloadButton = () => {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <button onClick={handleReload}>
      Reload Page
    </button>
  );
};

export default ReloadButton;
