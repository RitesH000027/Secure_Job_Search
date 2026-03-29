import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

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
const hasFieldRequiredError = (detail, fieldName) => {
  if (!Array.isArray(detail)) {
    return false;
  }

  return detail.some((item) => Array.isArray(item?.loc) && item.loc.includes(fieldName));
};

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  verifyOTP: async (data) => {
    try {
      return await api.post('/auth/verify-otp', data);
    } catch (error) {
      const detail = error?.response?.data?.detail;

      if (error?.response?.status === 422 && hasFieldRequiredError(detail, 'otp')) {
        const legacyPayload = {
          email: data.email,
          otp: data.email_otp || data.mobile_otp,
        };

        return api.post('/auth/verify-otp', legacyPayload);
      }

      throw error;
    }
  },
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
  enableTOTP: () => api.post('/auth/totp/enable'),
  verifyTOTP: (data) => api.post('/auth/totp/verify', data),
};

// Profile APIs
export const profileAPI = {
  getProfile: () => api.get('/profile/me'),
  getMyProfile: () => api.get('/profile/me'),
  updateProfile: (data) => api.put('/profile/me', data),
  getStats: () => api.get('/profile/stats/me'),
};

// Resume APIs
export const resumeAPI = {
  upload: (formData, isPublic = false) => api.post('/resume/upload', formData, {
    params: { is_public: isPublic },
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: () => api.get('/resume/list'),
  download: (id) => api.get(`/resume/download/${id}`, {
    responseType: 'blob',
  }),
  delete: (id) => api.delete(`/resume/${id}`),
  toggleVisibility: (id, isPublic) => api.patch(`/resume/${id}/visibility`, null, {
    params: { is_public: isPublic },
  }),
};

// Admin APIs
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  suspendUser: (id, data) => api.post(`/admin/users/${id}/suspend`, data),
  activateUser: (id) => api.post(`/admin/users/${id}/activate`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getAuditLogs: (limit = 100) => api.get('/admin/audit-logs', { params: { limit } }),
};

// Company APIs
export const companyAPI = {
  create: (data) => api.post('/companies', data),
  list: () => api.get('/companies'),
  getMyCompanies: () => api.get('/companies/my'),
  getById: (id) => api.get(`/companies/${id}`),
  update: (id, data) => api.patch(`/companies/${id}`, data),
  addAdmin: (companyId, userId) => api.post(`/companies/${companyId}/admins/${userId}`),
};

// Jobs APIs
export const jobsAPI = {
  create: (data) => api.post('/jobs', data),
  search: (params) => api.get('/jobs/search', { params }),
  getById: (id) => api.get(`/jobs/${id}`),
  update: (id, data) => api.patch(`/jobs/${id}`, data),
  apply: (jobId, data) => api.post(`/jobs/${jobId}/apply`, data),
  listMyApplications: () => api.get('/jobs/applications/me'),
  listApplicants: (jobId) => api.get(`/jobs/${jobId}/applications`),
  updateApplicationStatus: (applicationId, data) => api.patch(`/jobs/applications/${applicationId}/status`, data),
};

// Messaging APIs
export const messageAPI = {
  createConversation: (data) => api.post('/messages/conversations', data),
  listConversations: () => api.get('/messages/conversations'),
  sendMessage: (conversationId, data) => api.post(`/messages/conversations/${conversationId}/messages`, data),
  listMessages: (conversationId) => api.get(`/messages/conversations/${conversationId}/messages`),
};

export default api;
