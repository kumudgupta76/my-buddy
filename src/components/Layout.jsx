import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layout, Breadcrumb, Menu, Drawer, Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { getErrorCount, getErrors } from '../common/utils';

const { Header, Content, Footer } = Layout;

const Breadcrumbs = () => {
  const location = useLocation();
  const pathSnippets = location.pathname.split('/').filter(i => i);
  const breadcrumbItems = pathSnippets.map((_, index) => {
    const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
    const name = pathSnippets[index].replace(/-/g, ' '); // Replace hyphens with spaces for better readability
    return (
      <Breadcrumb.Item key={url}>
        <Link to={url}>{name.charAt(0).toUpperCase() + name.slice(1)}</Link>
      </Breadcrumb.Item>
    );
  });

  console.log(process.env.PUBLIC_URL)
  return (
    <Breadcrumb style={{ margin: '16px 0' }}>
      {breadcrumbItems}
    </Breadcrumb>
  );
};

const LayoutComponent = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const showDrawer = () => {
    setDrawerVisible(true);
  };

  const onCloseDrawer = () => {
    setDrawerVisible(false);
  };

  return (
    <Layout className="layout" style={{ minHeight: "100vh", height: "100vh" }}>
      <Header className="header">
        <div className="logo-container">
          <Link to="my-buddy/">
            <img src="icon.png" className="logo" alt="image not loaded" />
          </Link>
          <Button
            className="menu-button"
            type="text"
            icon={<MenuOutlined color='white' />}
            onClick={showDrawer}
            style={{ color: "white", fontSize: "large", fontWeight: "bold",height:"100%" }}
          />
        </div>
        <Drawer
          title="Menu"
          placement="right"
          closable={true}
          onClose={onCloseDrawer}
          visible={drawerVisible}
        >
          <Menu
            mode="inline"
            items={[
              { key: 1, label: <Link to="my-buddy/todo"><div >Todo</div></Link> },
              { key: 2, label: <Link to="my-buddy/timer"><div >Timer</div></Link> },
              { key: 3, label: <Link to="my-buddy/expense"><div >Expense Tracker</div></Link> },
              { key: 4, label: <Link to="my-buddy/cal"><div >Calendar</div></Link> },
              { key: 5, label: <Link to="/my-buddy/calview"><div >Calendar View</div></Link> },
              { key: 6, label: <Link to="/my-buddy/battery"><div >Battery</div></Link> },
              { key: 7, label: <Link to="/my-buddy/admin"><div >Local Store Manager</div></Link> },
              { key: 8, label: <Link to="/my-buddy/dump"><div >Dump</div></Link> }
            ]}
          />
        </Drawer>
        <Menu
          theme="dark"
          mode="horizontal"
          className="desktop-menu"
          items={[
            { key: 1, label: <Link to="my-buddy/todo"><div style={{ color: "white", fontSize: "large", fontWeight: "bold" }}>Todo</div></Link> },
            { key: 2, label: <Link to="my-buddy/timer"><div style={{ color: "white", fontSize: "large", fontWeight: "bold" }}>Timer</div></Link> },
            { key: 3, label: <Link to="my-buddy/expense"><div style={{ color: "white", fontSize: "large", fontWeight: "bold" }}>Expense Tracker</div></Link> },
            // { key: 4, label: <Link to="my-buddy/cal"><div style={{ color: "white", fontSize: "large", fontWeight: "bold" }}>Calendar</div></Link> },
            { key: 5, label: <Link to="/my-buddy/calview"><div style={{ color: "white", fontSize: "large", fontWeight: "bold" }}>Calendar View</div></Link> },
            { key: 6, label: <Link to="/my-buddy/battery"><div style={{ color: "white", fontSize: "large", fontWeight: "bold" }}>Battery</div></Link> },
            { key: 7, label: <Link to="/my-buddy/admin"><div style={{ color: "white", fontSize: "large", fontWeight: "bold" }}>LocalStorageManager</div></Link> },
            { key: 8, label: <Link to="/my-buddy/dump"><div style={{ color: "white", fontSize: "large", fontWeight: "bold" }}>Dump</div></Link> }
          ]}
        />
      </Header>
      <Content className="content-div">
        <Breadcrumbs />
        <div className="site-layout-content">
          <Outlet />
        </div>
      </Content>
      <Footer className='footer-layout'>
        {getErrorCount() !== 0 && `Errors(${getErrorCount()}) - ${JSON.stringify(getErrors())}`}
      </Footer>
    </Layout>
  );
};

export default LayoutComponent;
