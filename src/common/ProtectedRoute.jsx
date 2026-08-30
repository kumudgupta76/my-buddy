import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { UserContext } from './UserContext';

const ProtectedRoute = ({ children }) => {
  const { user, authLoading } = useContext(UserContext);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
        <Spin size="large" />
      </div>
    );
  }

  return user ? children : <Navigate to="/my-buddy/auth" replace />;
};

export default ProtectedRoute;
