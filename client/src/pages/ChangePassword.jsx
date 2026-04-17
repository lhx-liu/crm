import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const { Title, Text } = Typography;

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, mustChangePassword, changePassword } = useAuth();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的新密码不一致');
      return;
    }
    setLoading(true);
    try {
      const res = await changePassword(user.id, values.oldPassword, values.newPassword);
      if (res.success) {
        if (mustChangePassword) {
          message.success('密码修改成功，欢迎使用系统');
          navigate('/', { replace: true });
        } else {
          message.success('密码修改成功，请重新登录');
          navigate('/login');
        }
      } else {
        message.error(res.message || '密码修改失败');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || '密码修改失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '40px auto' }}>
      <Card style={{ borderRadius: 8 }}>
        <div style={{ marginBottom: 24 }}>
          {!mustChangePassword && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              style={{ marginBottom: 16 }}
            >
              返回
            </Button>
          )}
          <Title level={4} style={{ margin: 0 }}>
            {mustChangePassword ? '首次登录 - 请修改默认密码' : '修改密码'}
          </Title>
          <Text type="secondary">当前用户：{user?.username}</Text>
        </div>

        <Form
          name="changePassword"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="oldPassword"
            label="原密码"
            rules={[{ required: true, message: '请输入原密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入原密码" />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请再次输入新密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              确认修改
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
