// Home.js
import React from 'react';
import { List, Typography } from 'antd';
import { Link } from 'react-router-dom';
import ReloadButton from './ReloadButton';

const { Title } = Typography;

const Home = () => {
    const menuItems = [{ key: 1, label: <Link to="/my-buddy/todo">Todo</Link> },
    { key: 2, label: <Link to="/my-buddy/timer">Timer</Link> },
    { key: 3, label: <Link to="/my-buddy/expense">Expense Tacker</Link> },
    { key: 4, label: <Link to="/my-buddy/cal">Calendar</Link> },
    { key: 5, label: <Link to="/my-buddy/calview">Calendar View</Link> },
    { key: 6, label: <Link to="/my-buddy/battery">Battery</Link> },
    { key: 7, label: <Link to="/my-buddy/admin"><div >Local Store Manager</div></Link> },
    { key: 8, label: <Link to="/my-buddy/dump"><div >Dump</div></Link> }];

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
