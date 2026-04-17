import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器：自动附加 token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// 响应拦截器：处理 401 和统一返回数据
api.interceptors.response.use(
  res => res.data,
  error => {
    if (error.response && error.response.status === 401) {
      // token 过期或无效，清除登录状态，跳转到登录页
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // 避免在登录页重复跳转
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
