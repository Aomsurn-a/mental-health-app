import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL?.trim() || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// แนบ token ทุกครั้งที่ส่ง request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
