import React, { useState } from 'react';
import { Layout, Menu, Typography, ConfigProvider, Dropdown, Avatar, Spin } from 'antd';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import {
  ShopOutlined, TeamOutlined, FileTextOutlined,
  BarChartOutlined, LineChartOutlined, UserOutlined, LogoutOutlined, KeyOutlined
} from '@ant-design/icons';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Statistics from './pages/Statistics';
import AnalysisList from './pages/Analysis';
import AnalysisDetail from './pages/Analysis/detail';
import ChangePassword from './pages/ChangePassword';
import 'antd/dist/reset.css';
import './App.css';

dayjs.locale('zh-cn');

const { Sider, Content, Header } = Layout;
const { Title, Text } = Typography;

const menuItems = [
  { key: '/orders', icon: <FileTextOutlined />, label: '订单管理' },
  { key: '/customers', icon: <TeamOutlined />, label: '客户管理' },
  { key: '/products', icon: <ShopOutlined />, label: '产品管理' },
  { key: '/statistics', icon: <BarChartOutlined />, label: '订单统计' },
  { key: '/analysis', icon: <LineChartOutlined />, label: '客户分析' },
];

/** 路由守卫：未登录跳转到登录页，首次登录强制改密码 */
function PrivateRoute({ children }) {
  const { user, loading, mustChangePassword } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  // 首次登录必须修改密码，只允许访问修改密码页
  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return children;
}

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const selectedKey = location.pathname === '/' ? '/orders' : '/' + location.pathname.split('/')[1];

  const userMenuItems = [
    { key: 'changePassword', icon: <KeyOutlined />, label: '修改密码' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ];

  const handleUserMenuClick = ({ key }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    } else if (key === 'changePassword') {
      navigate('/change-password');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={200}
        style={{ position: 'fixed', height: '100vh', left: 0, top: 0, zIndex: 100 }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          {!collapsed && <Title level={5} style={{ color: '#fff', margin: 0 }}>CRM 系统</Title>}
          {collapsed && <Title level={5} style={{ color: '#fff', margin: 0, textAlign: 'center' }}>C</Title>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8 }}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#667eea' }} />
              <Text>{user?.username || '用户'}</Text>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ background: '#f5f6fa', minHeight: 'calc(100vh - 64px)', padding: '16px' }}>
          <Routes>
            <Route path="/" element={<Orders />} />
            <Route path="/products" element={<Products />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/analysis" element={<AnalysisList />} />
            <Route path="/analysis/:id" element={<AnalysisDetail />} />
            <Route path="/change-password" element={<ChangePassword />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}
