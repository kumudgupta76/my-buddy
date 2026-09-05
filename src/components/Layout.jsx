import React, { useContext, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layout, Breadcrumb, Menu, Drawer, Button, Tooltip } from 'antd';
import { MenuOutlined, HomeOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import { getErrorCount, getErrors } from '../common/utils';
import { routes } from '../common/constants';
import { UserContext } from '../common/UserContext';
import { iconFor, colorFor } from '../common/navIcons';
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
  const { pathname } = useLocation();
  const activeRoute = routes.find(route =>
    pathname === `/my-buddy/${route.slug}` || pathname.startsWith(`/my-buddy/${route.slug}/`)
  );
  const isAuthRoute = pathname === '/my-buddy/auth' || pathname.startsWith('/my-buddy/auth/');
  const selectedKeys = activeRoute ? [String(activeRoute.key)] : isAuthRoute ? ['sign-in'] : [];

  const { user } = useContext(UserContext);

  const showDrawer = () => {
    setDrawerVisible(true);
  };

  const onCloseDrawer = () => {
    setDrawerVisible(false);
  };

  let menuItems = routes.map(route => {
    const Icon = iconFor(route.slug);
    return {
      key: String(route.key),
      icon: <Icon style={{ color: colorFor(route.slug) }} />,
      label: <Link to={`/my-buddy/${route.slug}`}><div>{route.name}</div></Link>,
    };
  });

  if (user) {
    menuItems.push({ key: 'sign-out', icon: <LogoutOutlined />, label: <div onClick={signOutUser} style={{ cursor: 'pointer', color: 'var(--color-danger)' }}>Sign Out</div> });
  } else {
    menuItems.push({ key: 'sign-in', icon: <LoginOutlined />, label: <Link to="/my-buddy/auth"><div>Sign In</div></Link> });
  }

  const navItems = routes.map(route => {
    const Icon = iconFor(route.slug);
    return (
        <Tooltip key={route.key} title={route.name} placement="bottom">
          <Link
            to={`/my-buddy/${route.slug}`}
            className="nav-icon-link"
            aria-label={route.name}
            aria-current={activeRoute === route ? 'page' : undefined}
          >
            <Icon />
          </Link>
        </Tooltip>
    );
  });

  return (
    <Layout className="layout">
      <Header className="header">
        <div className="logo-container">
          <Link to="/my-buddy/" className="header-brand" aria-label="My Buddy home">
            <img src={`${process.env.PUBLIC_URL}/icon.png`} className="logo" alt="" />
            <span>My Buddy</span>
          </Link>
        </div>
        <Drawer
          className="mobile-navigation"
          width="min(340px, 100vw)"
          title="Navigation"
          placement="right"
          closable={true}
          onClose={onCloseDrawer}
          open={drawerVisible}
          bodyStyle={{ padding: 0 }}
        >
          <Menu
            id="mobile-navigation-menu"
            mode="inline"
            items={menuItems}
            selectedKeys={selectedKeys}
            style={{ border: 'none' }}
            onClick={onCloseDrawer}
          />
        </Drawer>
        <nav className="desktop-menu" aria-label="Main navigation">
          {navItems}
        </nav>
        <div className="header-auth">
          {user ? (
            <Tooltip title="Sign Out">
              <Button className="header-account-button" type="text" icon={<LogoutOutlined />} aria-label="Sign Out" onClick={signOutUser} />
            </Tooltip>
          ) : (
            <Tooltip title="Sign In">
              <Link to="/my-buddy/auth" className="nav-icon-link" aria-label="Sign In" aria-current={isAuthRoute ? 'page' : undefined}>
                <LoginOutlined />
              </Link>
            </Tooltip>
          )}
        </div>
        <Tooltip title="Open navigation" placement="bottom">
          <Button
            className="menu-button"
            type="text"
            icon={<MenuOutlined />}
            aria-label="Open navigation"
            aria-expanded={drawerVisible}
            aria-controls="mobile-navigation-menu"
            onClick={showDrawer}
          />
        </Tooltip>
      </Header>
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
