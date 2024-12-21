// Home.js
import React, { useContext } from 'react';
import { Button, List, Typography } from 'antd';
import { Link } from 'react-router-dom';
import ReloadButton from './ReloadButton';
import { routes } from '../common/constants';
import { signInUser, signOutUser } from '../common/authUtils';
import { UserContext } from '../common/UserContext';

const { Title } = Typography;

const Home = () => {
    const { user } = useContext(UserContext); 
    const menuItems = routes.map(route => ({ key: route.key, label: <Link to={`/my-buddy/${route.slug}`} ><Button type='link' disabled={route.isPrivate && !user}>{route.name}</Button></Link> }));

    if(user) {
        menuItems.push({ key: 'sign-out', label: <Button type='link' onClick={signOutUser}>Sign Out</Button> });
    } else {
        menuItems.push({ key: 'sign-in', label: <Link to="/my-buddy/auth"><Button type='link' >Sign In</Button></Link> });
    }

    return (
        <>
            <List
                header={<Title level={4}>Welcome to My Buddy</Title>}
                dataSource={menuItems}
                renderItem={item => <List.Item>{item.label}</List.Item>}>
            </List>
            <ReloadButton></ReloadButton>
        </>


    );
};

export default Home;
