import React, { useState } from 'react';
import { Layout, Menu, Typography, ConfigProvider, Dropdown, Avatar, Spin } from 'antd';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import {
  ShopOutlined, TeamOutlined, FileTextOutlined,
  BarChartOutlined, LineChartOutlined, UserOutlined, LogoutOutlined, KeyOutlined,
  BellOutlined
} from '@ant-design/icons';
import { AuthProvider, useAuth } from './AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
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
        width={220}
        className="crm-sider"
        style={{ position: 'fixed', height: '100vh', left: 0, top: 0, zIndex: 100 }}
      >
        <div className="crm-sider-logo">
          {!collapsed ? (
            <div className="crm-sider-logo-expanded">
              <div className="crm-sider-logo-icon">C</div>
              <div className="crm-sider-logo-text">
                <h1>CRM</h1>
                <p>客户管理系统</p>
              </div>
            </div>
          ) : (
            <div className="crm-sider-logo-collapsed">
              <div className="crm-sider-logo-icon">C</div>
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8, borderRight: 'none' }}
        />
        {!collapsed && <div className="crm-sider-version">v2.0</div>}
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <Header className="crm-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <BellOutlined style={{ fontSize: 18, color: 'var(--crm-text-muted)', cursor: 'pointer' }} />
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar icon={<UserOutlined />} className="crm-avatar" />
                <Text>{user?.username || '用户'}</Text>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="crm-content">
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
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#0d9488',
          colorInfo: '#0d9488',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          borderRadius: 10,
          fontFamily: '"Noto Sans SC", "DM Sans", sans-serif',
          colorBgContainer: '#ffffff',
          colorBorder: '#e2e8f0',
        },
        components: {
          Menu: {
            darkItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(13, 148, 136, 0.15)',
            darkItemSelectedColor: '#0d9488',
            darkItemHoverBg: 'rgba(255, 255, 255, 0.04)',
          },
          Layout: {
            siderBg: '#0f172a',
          },
          Button: {
            primaryShadow: '0 2px 0 rgba(13, 148, 136, 0.1)',
          },
          Modal: {
            borderRadiusLG: 12,
          },
          Card: {
            borderRadiusLG: 12,
          },
        },
      }}
    >
      <BrowserRouter>
        <ErrorBoundary>
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
        </ErrorBoundary>
      </BrowserRouter>
    </ConfigProvider>
  );
}
