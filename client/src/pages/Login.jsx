import React, { useState } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const { Title, Text } = Typography;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const user = await login(values.username, values.password);
      if (user) {
        if (user.mustChangePassword) {
          navigate('/change-password', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.message || '登录失败，请检查用户名和密码';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
    }}>
      {/* 左侧品牌展示区 */}
      <div style={{
        width: '55%',
        background: '#0f172a',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 48px',
      }}>
        {/* 几何装饰 — 大圆环 */}
        <div style={{
          position: 'absolute',
          top: '10%',
          right: '15%',
          width: 300,
          height: 300,
          border: '2px solid rgba(13, 148, 136, 0.3)',
          borderRadius: '50%',
          animation: 'crm-spin-slow 20s linear infinite',
        }} />
        {/* 几何装饰 — 小圆环 */}
        <div style={{
          position: 'absolute',
          bottom: '20%',
          left: '10%',
          width: 180,
          height: 180,
          border: '2px solid rgba(13, 148, 136, 0.2)',
          borderRadius: '50%',
          animation: 'crm-spin-slow 15s linear infinite reverse',
        }} />
        {/* 装饰点阵 */}
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '30%',
          width: 80,
          height: 80,
          background: 'radial-gradient(circle, rgba(13, 148, 136, 0.1) 1px, transparent 1px)',
          backgroundSize: '12px 12px',
          animation: 'crm-float 6s ease-in-out infinite',
        }} />
        {/* 对角线 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '60%',
          width: 1,
          height: '100%',
          background: 'linear-gradient(to bottom, transparent, rgba(13, 148, 136, 0.15), transparent)',
          transform: 'rotate(25deg)',
          transformOrigin: 'top',
        }} />

        {/* 品牌内容 */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'left',
          width: '100%',
          maxWidth: 420,
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #0d9488, #0f766e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"DM Sans", sans-serif',
            fontWeight: 700,
            fontSize: 28,
            color: '#fff',
            marginBottom: 32,
          }}>
            C
          </div>
          <h1 style={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 42,
            fontWeight: 700,
            color: '#fff',
            margin: 0,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
          }}>
            CRM
          </h1>
          <h2 style={{
            fontFamily: '"Noto Sans SC", "DM Sans", sans-serif',
            fontSize: 20,
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.6)',
            margin: '8px 0 32px',
            lineHeight: 1.4,
          }}>
            客户管理系统
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '◆', text: '智能管理' },
              { icon: '◆', text: '高效协作' },
              { icon: '◆', text: '数据驱动' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: 16,
                fontFamily: '"Noto Sans SC", sans-serif',
              }}>
                <span style={{ color: 'rgba(13, 148, 136, 0.6)', fontSize: 10 }}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 48,
            color: 'rgba(255, 255, 255, 0.2)',
            fontSize: 12,
            fontFamily: '"JetBrains Mono", monospace',
          }}>
            ─── v2.0 ───
          </div>
        </div>
      </div>

      {/* 右侧登录表单区 */}
      <div style={{
        width: '45%',
        background: '#f0fdfa',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 48,
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 40 }}>
            <Title level={3} style={{
              marginBottom: 8,
              color: 'var(--crm-text-primary)',
              fontFamily: 'var(--crm-font-display)',
            }}>
              CRM 客户管理系统
            </Title>
            <Text style={{ color: 'var(--crm-text-muted)', fontSize: 15 }}>
              请登录以继续操作
            </Text>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: 'var(--crm-text-placeholder)' }} />}
                placeholder="用户名"
                style={{
                  borderRadius: 10,
                  height: 48,
                  borderColor: 'var(--crm-border)',
                }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--crm-text-placeholder)' }} />}
                placeholder="密码"
                style={{
                  borderRadius: 10,
                  height: 48,
                  borderColor: 'var(--crm-border)',
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 48,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                  border: 'none',
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: 'var(--crm-font-display)',
                }}
              >
                登 录
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
}
