import axios from 'axios';

const API_BASE_URL = 'https://192.168.3.40';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          
          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
  enableTOTP: () => api.post('/auth/totp/enable'),
  verifyTOTP: (data) => api.post('/auth/totp/verify', data),
};

// Profile APIs
export const profileAPI = {
  getMyProfile: () => api.get('/profile/me'),
  updateProfile: (data) => api.put('/profile/me', data),
  getStats: () => api.get('/profile/stats/me'),
};

// Resume APIs
export const resumeAPI = {
  upload: (formData) => api.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: () => api.get('/resume/list'),
  download: (id) => api.get(`/resume/download/${id}`, {
    responseType: 'blob',
  }),
  delete: (id) => api.delete(`/resume/${id}`),
  toggleVisibility: (id) => api.patch(`/resume/${id}/visibility`),
};

// Admin APIs
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  suspendUser: (id, data) => api.post(`/admin/users/${id}/suspend`, data),
  activateUser: (id) => api.post(`/admin/users/${id}/activate`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

export default api;
