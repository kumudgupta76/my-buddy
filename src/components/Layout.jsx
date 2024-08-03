import { Outlet, Link, useLocation } from "react-router-dom";

import { Layout, Breadcrumb, Menu } from "antd";

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

  return (
    <Breadcrumb style={{ margin: '16px 0' }}>
      {breadcrumbItems}
    </Breadcrumb>
  );
};

const LayoutComponent = () => {
  return (
    <Layout className="layout" style={{minHeight:"100vh", height:"100vh"}}>
    <Header>
    <Link to="my-buddy/home">
        <img src="icon.png" className="logo"></img>
      </Link>
      <Menu
        theme="dark"
        mode="horizontal"
        defaultSelectedKeys={['3']}
        items={[{key:1, label:<Link to="my-buddy/home">Home</Link>},
          {key:2, label:<Link to="my-buddy/timer">Timer</Link>},
          {key:3, label:<Link to="my-buddy/expense">Expense Tacker</Link>},
          {key:4, label:<Link to="my-buddy/cal">Calendar</Link>},
          {key:5, label:<Link to="my-buddy/dump">Dump</Link>}]}
      />
    </Header>
    <Content
      className="content-div"
    >
      <Breadcrumbs/>
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