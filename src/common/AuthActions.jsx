import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Divider, message } from 'antd';
import { signUpUser, signInUser, signOutUser, onAuthStateChangedListener } from './authUtils';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const AuthActions = () => {
    const [isSignUp, setIsSignUp] = useState(false); // Toggle state for Sign Up/Sign In
    const [user, setUser] = useState(null);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChangedListener(setUser);
        return () => unsubscribe();
    }, []);

    const handleSignUp = async (values) => {
        try {
            const userCredential = await signUpUser(values.email, values.password);
            message.success('Sign up successful!');
            console.log('Signed up user:', userCredential);
        } catch (error) {
            message.error(error.message);
        }
    };

    const handleSignIn = async (values) => {
        try {
            const userCredential = await signInUser(values.email, values.password);
            message.success('Sign in successful!');
            console.log('Signed in user:', userCredential);
        } catch (error) {
            message.error(error.message);
        }
    };

    const toggleAuthMode = () => {
        setIsSignUp((prev) => !prev);
    };

    return (
        <div style={{
            maxWidth: 420,
            margin: '0 auto',
            padding: 'var(--space-xl)',
        }}>
            <div className="info-card" style={{ padding: 'var(--space-xl)' }}>

            {user ? (
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--color-primary-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto var(--space-md)',
                    }}>
                        <UserOutlined style={{ fontSize: 28, color: 'var(--color-primary)' }} />
                    </div>
                    <Title level={5} style={{ marginBottom: 'var(--space-xs)' }}>Welcome back</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 'var(--space-lg)' }}>{user.email}</Text>
                    <Button danger type="primary" onClick={signOutUser} block size="large">
                        Sign Out
                    </Button>
                </div>
            ) : (
                <>
                    <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
                        <div style={{
                            width: 56,
                            height: 56,
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--color-primary-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto var(--space-md)',
                        }}>
                            <LockOutlined style={{ fontSize: 24, color: 'var(--color-primary)' }} />
                        </div>
                        <Title level={3} style={{ marginBottom: 'var(--space-xs)' }}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Title>
                        <Text type="secondary">{isSignUp ? 'Sign up to get started' : 'Sign in to your account'}</Text>
                    </div>

                    <Form
                        name={isSignUp ? 'signup-form' : 'signin-form'}
                        onFinish={isSignUp ? handleSignUp : handleSignIn}
                        layout="vertical"
                        size="large"
                    >
                        <Form.Item
                            label="Email"
                            name="email"
                            rules={[{ required: true, type: 'email', message: 'Please enter a valid email!' }]}
                        >
                            <Input placeholder="Enter your email" prefix={<UserOutlined style={{ color: 'var(--color-text-muted)' }} />} />
                        </Form.Item>

                        <Form.Item
                            label="Password"
                            name="password"
                            rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters!' }]}
                        >
                            <Input.Password placeholder="Enter your password" prefix={<LockOutlined style={{ color: 'var(--color-text-muted)' }} />} />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" block>
                                {isSignUp ? 'Sign Up' : 'Sign In'}
                            </Button>
                        </Form.Item>
                    </Form>

                    <Divider style={{ margin: 'var(--space-md) 0' }}>
                        <Text type="secondary" style={{ fontSize: 'var(--text-xs)' }}>OR</Text>
                    </Divider>

                    {/* <Button type="text" onClick={toggleAuthMode} block style={{ color: 'var(--color-primary)' }}>
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </Button> */}
                </>
            )}
            </div>
        </div>
    );
};

export default AuthActions;
