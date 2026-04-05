// Home.js
import React, { useContext } from 'react';
import { Button, Typography } from 'antd';
import { Link } from 'react-router-dom';
import ReloadButton from './ReloadButton';
import { routes } from '../common/constants';
import { signInUser, signOutUser } from '../common/authUtils';
import { UserContext } from '../common/UserContext';
import {
  CheckSquareOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  LockOutlined,
  PictureOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const iconMap = {
  'todo': <CheckSquareOutlined style={{ fontSize: 24, color: 'var(--color-primary)' }} />,
  'timer': <ClockCircleOutlined style={{ fontSize: 24, color: '#06b6d4' }} />,
  'expense': <DollarOutlined style={{ fontSize: 24, color: '#10b981' }} />,
  'cal': <CalendarOutlined style={{ fontSize: 24, color: '#f59e0b' }} />,
  'battery': <ThunderboltOutlined style={{ fontSize: 24, color: '#ef4444' }} />,
  'admin': <DatabaseOutlined style={{ fontSize: 24, color: '#64748b' }} />,
  'poster': <PictureOutlined style={{ fontSize: 24, color: '#8b5cf6' }} />,
  'dump': <AppstoreOutlined style={{ fontSize: 24, color: '#94a3b8' }} />,
};

const Home = () => {
    const { user } = useContext(UserContext);

    const menuItems = routes.map(route => ({
      key: route.key,
      label: (
        <Link to={`/my-buddy/${route.slug}`}>
          <Button type='link' disabled={route.isPrivate && !user}>{route.name}</Button>
        </Link>
      )
    }));

    if(user) {
        menuItems.push({ key: 'sign-out', label: <Button type='link' onClick={signOutUser}>Sign Out</Button> });
    } else {
        menuItems.push({ key: 'sign-in', label: <Link to="/my-buddy/auth"><Button type='link' >Sign In</Button></Link> });
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
                <Title level={3} style={{ marginBottom: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
                    My Buddy
                </Title>
                <Text type="secondary" style={{ fontSize: 'var(--text-sm)' }}>
                    Your personal productivity toolkit
                </Text>
            </div>

            <div className="home-grid">
                {routes.map(route => {
                    const isDisabled = route.isPrivate && !user;
                    return (
                        <Link
                            key={route.key}
                            to={isDisabled ? '#' : `/my-buddy/${route.slug}`}
                            style={{
                                textDecoration: 'none',
                                pointerEvents: isDisabled ? 'none' : 'auto',
                                opacity: isDisabled ? 0.45 : 1,
                            }}
                        >
                            <div className="info-card home-card" style={{
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                position: 'relative',
                            }}>
                                {isDisabled && (
                                    <LockOutlined style={{
                                        position: 'absolute',
                                        top: 6,
                                        right: 6,
                                        fontSize: 10,
                                        color: 'var(--color-text-muted)'
                                    }} />
                                )}
                                <div className="home-card-icon">
                                    {iconMap[route.slug] || <AppstoreOutlined style={{ fontSize: 24, color: 'var(--color-text-muted)' }} />}
                                </div>
                                <div className="home-card-label">
                                    {route.name}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 'var(--space-sm)',
                flexWrap: 'wrap',
                marginTop: 'var(--space-md)',
            }}>
                {user ? (
                    <Button onClick={signOutUser} danger size="small">Sign Out</Button>
                ) : (
                    <Link to="/my-buddy/auth"><Button type="primary" size="small">Sign In</Button></Link>
                )}
                <ReloadButton />
            </div>
        </div>
    );
};

export default Home;
