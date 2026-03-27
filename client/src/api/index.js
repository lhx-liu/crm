import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.response.use(
  res => res.data,
  err => Promise.reject(err)
);

export default api;
