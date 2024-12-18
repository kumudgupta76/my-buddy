import React, { useContext, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layout, Breadcrumb, Menu, Drawer, Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { getErrorCount, getErrors, isMobile } from '../common/utils';
import { routes } from '../common/constants';
import { UserContext } from '../common/UserContext';
import { signOutUser } from '../common/authUtils';

const { Header, Content, Footer } = Layout;

const Breadcrumbs = () => {
  const location = useLocation();
  const pathSnippets = location.pathname.split('/').filter(i => i);
  const breadcrumbItems = pathSnippets.map((_, index) => {
    const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
    const name = pathSnippets[index].replace(/-/g, ' '); // Replace hyphens with spaces for better readability
    return (
      <Breadcrumb.Item key={url} style={{ backgroundColor: "white", padding: "5px", borderRadius: "5px" }}>
        <Link to={url}>{name.charAt(0).toUpperCase() + name.slice(1)}</Link>
      </Breadcrumb.Item>
    );
  });
  return (
    <Breadcrumb style={{ margin: '10px 0', padding: "10px" }}>
      {breadcrumbItems}
    </Breadcrumb>
  );
};

const LayoutComponent = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const { user } = useContext(UserContext);

  const showDrawer = () => {
    setDrawerVisible(true);
  };

  const onCloseDrawer = () => {
    setDrawerVisible(false);
  };

  let menuItems = routes.map(route => ({ key: route.key, label: <Link to={`/my-buddy/${route.slug}`}><div>{route.name}</div></Link> }));

  if (user) {
    menuItems.push({ key: 'sign-out', label: <Button type='link' onClick={signOutUser}>Sign Out</Button> });
  } else {
    menuItems.push({ key: 'sign-in', label: <Link to="/my-buddy/auth"><div>Sign In</div></Link> });
  }

  let menuItemsHor = routes.map(route => ({ key: route.key, label: <Link to={`/my-buddy/${route.slug}`}><div style={{ color: "white", fontSize: "large", fontWeight: "bold" }}>{route.name}</div></Link> }));

  if (user) {
    menuItemsHor.push({ key: 'sign-out', label: <Button type='link' style={{ color: "white", fontSize: "large", fontWeight: "bold" }} onClick={signOutUser}>Sign Out</Button> });
  } else {
    menuItemsHor.push({ key: 'sign-in', label: <Link to="/my-buddy/auth"><div style={{ color: "white", fontSize: "large", fontWeight: "bold" }}>Sign In</div></Link> });
  }

  return (
    <Layout className="layout" style={{ minHeight: "100vh", height: "100vh" }}>
      {isMobile() ? <></> : <Header className="header">
        <div className="logo-container">
          <Link to="my-buddy/">
            <img src="icon.png" className="logo" alt="" />
          </Link>
          <Button
            className="menu-button"
            type="text"
            icon={<MenuOutlined color='white' />}
            onClick={showDrawer}
            style={{ color: "white", fontSize: "large", fontWeight: "bold", height: "100%" }}
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
            items={menuItems}
          />
        </Drawer>
        <Menu
          theme="dark"
          mode="horizontal"
          className="desktop-menu"
          items={menuItemsHor}
        />
      </Header>}
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
