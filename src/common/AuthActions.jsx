import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Divider, message } from 'antd';
import { signUpUser, signInUser, signOutUser, onAuthStateChangedListener } from './authUtils';

const { Title } = Typography;

const AuthActions = () => {
    const [isSignUp, setIsSignUp] = useState(true); // Toggle state for Sign Up/Sign In
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
        <div style={{ maxWidth: 400, margin: 'auto', padding: '20px', borderRadius: '8px', boxShadow: '0px 4px 8px rgba(0,0,0,0.1)' }}>


            {user ? (
                <>
                    <Title level={5}>Welcome, {user.email}</Title>
                    <Button danger type="primary" onClick={signOutUser} block>
                        Sign Out
                    </Button>
                </>
            ) : <>
                <Title level={3}>{isSignUp ? 'Sign Up' : 'Sign In'}</Title>

                <Form
                    name={isSignUp ? 'signup-form' : 'signin-form'}
                    onFinish={isSignUp ? handleSignUp : handleSignIn}
                    layout="vertical"
                >
                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[{ required: true, type: 'email', message: 'Please enter a valid email!' }]}
                    >
                        <Input placeholder="Enter your email" />
                    </Form.Item>

                    <Form.Item
                        label="Password"
                        name="password"
                        rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters!' }]}
                    >
                        <Input.Password placeholder="Enter your password" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>
                            {isSignUp ? 'Sign Up' : 'Sign In'}
                        </Button>
                    </Form.Item>
                </Form>

                <Divider />

                <Button type="link" onClick={toggleAuthMode} block>
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </Button>
            </>}
        </div>
    );
};

export default AuthActions;
