import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';
import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 启动时检查本地存储的登录状态
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setMustChangePassword(!!parsed.mustChangePassword);
        // 验证 token 是否仍然有效
        api.get('/auth/me').then(res => {
          if (res.success) {
            setUser(res.data);
            setMustChangePassword(!!res.data.mustChangePassword);
            localStorage.setItem('user', JSON.stringify(res.data));
          }
        }).catch(() => {
          // token 无效，清除登录状态
          logout();
        });
      } catch {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.success) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      setMustChangePassword(!!res.data.user.mustChangePassword);
      message.success('登录成功');
      return res.data.user;
    }
    return null;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setMustChangePassword(false);
  };

  const changePassword = async (userId, oldPassword, newPassword) => {
    const res = await api.put('/auth/password', { userId, oldPassword, newPassword });
    if (res.success) {
      setMustChangePassword(false);
      setUser(prev => prev ? { ...prev, mustChangePassword: false } : prev);
      localStorage.setItem('user', JSON.stringify({ ...user, mustChangePassword: false }));
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, loading, mustChangePassword, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default AuthContext;
