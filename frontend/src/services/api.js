import axios from 'axios';

const getDefaultApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8010`;
  }
  return 'http://127.0.0.1:8010';
};

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || getDefaultApiBaseUrl()).replace(/\/$/, '');

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

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  login: (data) => api.post('/auth/login', data),
  requestHighRiskOTP: (action) => api.post('/auth/high-risk-otp/request', { action }),
  requestPasswordReset: (email) => api.post('/auth/password-reset', { email }),
  confirmPasswordReset: (data) => api.post('/auth/password-reset/confirm', data),
  getCurrentUser: () => api.get('/auth/me'),
  enableTOTP: () => api.post('/auth/totp/enable'),
  verifyTOTP: (data) => api.post('/auth/totp/verify', data),
};

// Profile APIs
export const profileAPI = {
  getProfile: () => api.get('/profile/me'),
  getMyProfile: () => api.get('/profile/me'),
  updateProfile: (data) => api.put('/profile/me', data),
  uploadProfilePicture: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/profile/me/picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteMyProfile: (otpCode) => api.delete('/profile/me', { params: { otp_code: otpCode } }),
  getStats: () => api.get('/profile/stats/me'),
  getRecentViewers: (limit = 20) => api.get('/profile/viewers/me', { params: { limit } }),
};

// Resume APIs
export const resumeAPI = {
  upload: (formData, isPublic = false) => api.post('/resume/upload', formData, {
    params: { is_public: isPublic },
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: () => api.get('/resume/list'),
  download: (id, otpCode) => api.get(`/resume/download/${id}`, {
    params: { otp_code: otpCode },
    responseType: 'blob',
  }),
  delete: (id, otpCode) => api.delete(`/resume/${id}`, { params: { otp_code: otpCode } }),
  toggleVisibility: (id, isPublic) => api.patch(`/resume/${id}/visibility`, null, {
    params: { is_public: isPublic },
  }),
  verifyIntegrity: (id) => api.get(`/resume/${id}/integrity`),
};

// Admin APIs
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  suspendUser: (id, data) => api.post(`/admin/users/${id}/suspend`, data),
  activateUser: (id) => api.post(`/admin/users/${id}/activate`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getAuditLogs: (limit = 100) => api.get('/admin/audit-logs', { params: { limit } }),
  verifyAuditChain: () => api.get('/admin/audit-logs/verify'),
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
  upsertMyPublicKey: (publicKey) => api.put('/messages/keys/me', { public_key: publicKey }),
  getUsersPublicKeys: (userIds) => api.get('/messages/keys/users', { params: { user_ids: userIds.join(',') } }),
  upsertConversationKeys: (conversationId, envelopes) =>
    api.post(`/messages/conversations/${conversationId}/keys`, { envelopes }),
  getMyConversationKey: (conversationId) => api.get(`/messages/conversations/${conversationId}/keys/me`),
};

export const connectionAPI = {
  searchUsers: (params) => api.get('/connections/search', { params }),
  sendRequest: (recipientId) => api.post('/connections/requests', { recipient_id: recipientId }),
  listReceivedRequests: () => api.get('/connections/requests/received'),
  listSentRequests: () => api.get('/connections/requests/sent'),
  acceptRequest: (requestId) => api.post(`/connections/requests/${requestId}/accept`),
  rejectRequest: (requestId) => api.post(`/connections/requests/${requestId}/reject`),
  listFriends: () => api.get('/connections/friends'),
  getGraph: () => api.get('/connections/graph'),
  removeFriend: (friendId) => api.delete(`/connections/friends/${friendId}`),
};

export const searchAPI = {
  global: (query, limit = 20) => api.get('/search', { params: { query, limit } }),
};

export default api;
