import { Outlet, Link } from "react-router-dom";

import { Layout, Breadcrumb, Menu } from "antd";

const { Header, Content, Footer } = Layout;

const LayoutComponent = () => {
  return (
    <Layout className="layout" style={{minHeight:"100vh", height:"100vh"}}>
    <Header>
      <div className="logo" />
      <Menu
        theme="dark"
        mode="horizontal"
        defaultSelectedKeys={['2']}
        items={[{key:1, label:<Link to="/">Home</Link>},{key:2, label:<Link to="/timer">Timer</Link>}, {key:3, label:<Link to="/dump">Dump</Link>}]}
      />
    </Header>
    <Content
      style={{
        padding: '0 50px',
        overflow:"auto"
      }}
    >
      <Breadcrumb
        style={{
          margin: '16px 0',
        }}
      >
        <Breadcrumb.Item>Home</Breadcrumb.Item>
        <Breadcrumb.Item>List</Breadcrumb.Item>
        <Breadcrumb.Item>App</Breadcrumb.Item>
      </Breadcrumb>
      <div className="site-layout-content"><Outlet></Outlet></div>
      
    </Content>
    <Footer
      style={{
        textAlign: 'center',
      }}
    >
      Ant Design ©2018 Created by Ant UED
    </Footer>
  </Layout>
  )
};

export default LayoutComponent;