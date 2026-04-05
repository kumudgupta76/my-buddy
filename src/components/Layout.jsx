import React, { useContext, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layout, Breadcrumb, Menu, Drawer, Button } from 'antd';
import { MenuOutlined, HomeOutlined } from '@ant-design/icons';
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
    const name = pathSnippets[index].replace(/-/g, ' ');
    return (
      <Breadcrumb.Item key={url}>
        <Link to={url} style={{ color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: 'var(--text-sm)' }}>
          {name.charAt(0).toUpperCase() + name.slice(1)}
        </Link>
      </Breadcrumb.Item>
    );
  });
  return (
    <Breadcrumb style={{ margin: 'var(--space-md) 0 var(--space-sm) 0' }}>
      <Breadcrumb.Item>
        <Link to="/my-buddy/" style={{ color: 'var(--color-text-muted)' }}><HomeOutlined /></Link>
      </Breadcrumb.Item>
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
    menuItems.push({ key: 'sign-out', label: <div onClick={signOutUser} style={{ cursor: 'pointer', color: 'var(--color-danger)' }}>Sign Out</div> });
  } else {
    menuItems.push({ key: 'sign-in', label: <Link to="/my-buddy/auth"><div>Sign In</div></Link> });
  }

  let menuItemsHor = routes.map(route => ({
    key: route.key,
    label: (
      <Link to={`/my-buddy/${route.slug}`}>
        <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 'var(--text-sm)', fontWeight: 500, letterSpacing: '0.01em' }}>
          {route.name}
        </div>
      </Link>
    )
  }));

  if (user) {
    menuItemsHor.push({
      key: 'sign-out',
      label: (
        <div
          style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            cursor: 'pointer',
          }}
          onClick={signOutUser}
        >
          Sign Out
        </div>
      )
    });
  } else {
    menuItemsHor.push({
      key: 'sign-in',
      label: (
        <Link to="/my-buddy/auth">
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>Sign In</div>
        </Link>
      )
    });
  }

  return (
    <Layout className="layout" style={{ minHeight: '100vh', height: '100vh' }}>
      {isMobile() ? null : (
        <Header className="header">
          <div className="logo-container">
            <Link to="my-buddy/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
              <img src="icon.png" className="logo" alt="" />
              <span style={{ color: 'white', fontSize: 'var(--text-lg)', fontWeight: 600, letterSpacing: '-0.02em' }}>
                My Buddy
              </span>
            </Link>
            <Button
              className="menu-button"
              type="text"
              icon={<MenuOutlined />}
              onClick={showDrawer}
              style={{ color: 'white', fontSize: 'var(--text-lg)', height: '100%' }}
            />
          </div>
          <Drawer
            title="Navigation"
            placement="right"
            closable={true}
            onClose={onCloseDrawer}
            visible={drawerVisible}
            bodyStyle={{ padding: 0 }}
          >
            <Menu
              mode="inline"
              items={menuItems}
              style={{ border: 'none' }}
            />
          </Drawer>
          <Menu
            theme="dark"
            mode="horizontal"
            className="desktop-menu"
            items={menuItemsHor}
            style={{ background: 'transparent', borderBottom: 'none' }}
          />
        </Header>
      )}
      <Content className="content-div">
        <Breadcrumbs />
        <div className="site-layout-content">
          <Outlet />
        </div>
      </Content>
      <Footer className="footer-layout">
        {getErrorCount() !== 0 && (
          <span style={{ color: 'var(--color-danger)', fontSize: 'var(--text-xs)' }}>
            Errors({getErrorCount()}) - {JSON.stringify(getErrors())}
          </span>
        )}
      </Footer>
    </Layout>
  );
};

export default LayoutComponent;
