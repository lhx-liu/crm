import React, { useState, useMemo } from 'react';
import { Layout, Menu, Typography, ConfigProvider, Dropdown, Avatar, Spin, Popover, Button } from 'antd';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import {
  ShopOutlined, TeamOutlined, FileTextOutlined,
  BarChartOutlined, LineChartOutlined, UserOutlined, LogoutOutlined, KeyOutlined,
  BellOutlined, BgColorsOutlined, CheckOutlined
} from '@ant-design/icons';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider, useTheme } from './ThemeContext';
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

/** 主题切换面板 */
function ThemeSwitcher() {
  const { themeKey, switchTheme, themeList } = useTheme();

  const content = (
    <div style={{ minWidth: 140 }}>
      <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--crm-text-muted)', fontWeight: 600 }}>选择主题</div>
      {themeList.map(t => (
        <div
          key={t.key}
          onClick={() => switchTheme(t.key)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'background 0.2s',
            background: themeKey === t.key ? 'var(--crm-primary-bg)' : 'transparent',
          }}
          onMouseEnter={e => { if (themeKey !== t.key) e.currentTarget.style.background = 'var(--crm-border-light)'; }}
          onMouseLeave={e => { if (themeKey !== t.key) e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={{ fontSize: 14, color: themeKey === t.key ? 'var(--crm-primary)' : 'var(--crm-text-body)', fontWeight: themeKey === t.key ? 600 : 400 }}>
            {t.name}
          </span>
          {themeKey === t.key && <CheckOutlined style={{ color: 'var(--crm-primary)', fontSize: 12 }} />}
        </div>
      ))}
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="bottomRight" overlayStyle={{ zIndex: 1050 }}>
      <BgColorsOutlined style={{ fontSize: 18, color: 'var(--crm-text-muted)', cursor: 'pointer', transition: 'color 0.2s' }} />
    </Popover>
  );
}

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme } = useTheme();
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
        {!collapsed && (
          <div className="crm-sider-version">
            <span>v2.0</span>
            <a
              className="crm-sider-beian"
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              title="工信部备案查询"
            >
              鲁ICP备2026044327号
            </a>
          </div>
        )}
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <Header className="crm-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <BellOutlined style={{ fontSize: 18, color: 'var(--crm-text-muted)', cursor: 'pointer' }} />
            <ThemeSwitcher />
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

/** 动态主题 ConfigProvider 包装器 */
function ThemedApp() {
  const { theme } = useTheme();

  const antdTheme = useMemo(() => ({
    token: {
      colorPrimary: theme.antdToken.colorPrimary,
      colorInfo: theme.antdToken.colorInfo,
      colorSuccess: theme.antdToken.colorSuccess,
      colorWarning: theme.antdToken.colorWarning,
      colorError: theme.antdToken.colorError,
      borderRadius: theme.antdToken.borderRadius,
      fontFamily: '"Noto Sans SC", "DM Sans", sans-serif',
      colorBgContainer: theme.antdToken.colorBgContainer,
      colorBorder: theme.antdToken.colorBorder,
    },
    components: theme.antdComponents,
  }), [theme]);

  return (
    <ConfigProvider locale={zhCN} theme={antdTheme}>
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

export default function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}
