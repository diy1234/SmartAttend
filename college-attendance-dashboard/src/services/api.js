// src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Common API functions
export const getAttendances = async (params = {}) => {
  const response = await api.get('/attendance', { params });
  return response.data?.attendance || response.data;
};

export const getUserProfile = async (userId) => {
  const response = await api.get(`/users/profile?user_id=${userId}`);
  return response.data;
};

export const markAttendanceSingle = async (data) => {
  const response = await api.post('/attendance', data);
  return response.data;
};

export const getClasses = async () => {
  const response = await api.get('/classes');
  return response.data?.classes || response.data;
};

export { api };
export default api;

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`🔄 API Call: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);