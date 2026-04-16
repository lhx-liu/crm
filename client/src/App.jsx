import React, { useState } from 'react';
import { Layout, Menu, Typography, ConfigProvider } from 'antd';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import {
  ShopOutlined, TeamOutlined, FileTextOutlined,
  BarChartOutlined, LineChartOutlined
} from '@ant-design/icons';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Statistics from './pages/Statistics';
import AnalysisList from './pages/Analysis';
import AnalysisDetail from './pages/Analysis/detail';
import 'antd/dist/reset.css';
import './App.css';

dayjs.locale('zh-cn');

const { Sider, Content } = Layout;
const { Title } = Typography;

const menuItems = [
  { key: '/orders', icon: <FileTextOutlined />, label: '订单管理' },
  { key: '/customers', icon: <TeamOutlined />, label: '客户管理' },
  { key: '/products', icon: <ShopOutlined />, label: '产品管理' },
  { key: '/statistics', icon: <BarChartOutlined />, label: '订单统计' },
  { key: '/analysis', icon: <LineChartOutlined />, label: '客户分析' },
];

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const selectedKey = location.pathname === '/' ? '/orders' : '/' + location.pathname.split('/')[1];

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
        <Content style={{ background: '#f5f6fa', minHeight: '100vh' }}>
          <Routes>
            <Route path="/" element={<Orders />} />
            <Route path="/products" element={<Products />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/analysis" element={<AnalysisList />} />
            <Route path="/analysis/:id" element={<AnalysisDetail />} />
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
        <AppLayout />
      </BrowserRouter>
    </ConfigProvider>
  );
}
