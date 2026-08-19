import axios from 'axios';

const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '';

const api = axios.create({
  baseURL: apiBaseUrl ? `${apiBaseUrl}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  registerVerify: (data: any) => api.post('/auth/register-verify', data),
  login: (data: any) => api.post('/auth/login', data),
  oauth: (data: any) => api.post('/auth/oauth', data),
  googleAuth: (data: { credential?: string; token?: string; role?: string }) => api.post('/auth/google', data),
  getGoogleConfig: () => api.get('/auth/google/config'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  verifyCode: (data: { email: string; code: string; type?: string }) => api.post('/auth/verify-code', data),
  resetPassword: (data: { email: string; code: string; newPassword: string }) => api.post('/auth/reset-password', data),
  sendVerification: (email: string) => api.post('/auth/send-verification', { email }),
  verifyEmail: (data: { email: string; code: string }) => api.post('/auth/verify-email', data),
};




// Users API
export const usersAPI = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: any) => api.put('/users/me', data),
  switchRole: (role: string) => api.put('/users/switch-role', { role }),
  deleteMe: () => api.delete('/users/me'),
  getAdminAll: (params?: any) => api.get('/users/admin/all', { params }),
  toggleActive: (id: string) => api.put(`/users/admin/${id}/toggle-active`),
  adminDelete: (id: string) => api.delete(`/users/admin/${id}`),
};

// Tailors API
export const tailorsAPI = {
  search: (params?: any) => api.get('/tailors', { params }),
  getById: (id: string) => api.get(`/tailors/${id}`),
  updateProfile: (data: any) => api.put('/tailors/profile', data),
  getPending: () => api.get('/tailors/admin/pending'),
  approve: (id: string, status: string) => api.put(`/tailors/admin/${id}/approval`, { approvalStatus: status }),
  addPortfolio: (data: { imageUrl: string; title?: string; description?: string }) => api.post('/tailors/portfolio', data),
  removePortfolio: (index: number) => api.delete(`/tailors/portfolio/${index}`),
};
// Reviews API (updated)
export const reviewsAPI = {
  create: (requestId: string, data: any) => api.post(`/reviews/${requestId}`, data),
  reply: (id: string, data: any) => api.put(`/reviews/${id}/reply`, data),
  getByTailor: (tailorId: string, params?: any) => api.get(`/reviews/tailor/${tailorId}`, { params }),
  flag: (id: string, isFlagged: boolean) => api.put(`/reviews/admin/${id}/flag`, { isFlagged }),
};

// Service Requests API
export const requestsAPI = {
  create: (data: any) => api.post('/requests', data),
  getAll: (params?: any) => api.get('/requests', { params }),
  getById: (id: string) => api.get(`/requests/${id}`),
  accept: (id: string) => api.put(`/requests/${id}/accept`),
  reject: (id: string) => api.put(`/requests/${id}/reject`),
  confirmCustomer: (id: string, data?: any) => api.put(`/requests/${id}/confirm-customer`, data),
  confirmTailor: (id: string) => api.put(`/requests/${id}/confirm-tailor`),
};

// Messages API
export const messagesAPI = {
  getByConversation: (conversationId: string) => api.get(`/messages/conversation/${conversationId}`),
  sendToConversation: (conversationId: string, data: any) => api.post(`/messages/conversation/${conversationId}`, data),
  getByRequest: (requestId: string) => api.get(`/messages/${requestId}`),
  send: (requestId: string, data: any) => api.post(`/messages/${requestId}`, data),
  markRead: (requestId: string) => api.put(`/messages/${requestId}/read`),
  getConversations: () => api.get('/messages/conversations'),
  createConversation: (tailorId: string) => api.post('/messages/conversations', { tailorId }),
  adminDirect: (targetUserId: string) => api.post('/messages/admin/direct', { targetUserId }),
  editMessage: (conversationId: string, messageId: string, content: string) => api.put(`/messages/conversation/${conversationId}/messages/${messageId}`, { content }),
  deleteMessage: (conversationId: string, messageId: string) => api.delete(`/messages/conversation/${conversationId}/messages/${messageId}`),
  reactToMessage: (conversationId: string, messageId: string, emoji: string) => api.post(`/messages/conversation/${conversationId}/messages/${messageId}/react`, { emoji }),
};

// Measurements API
export const measurementsAPI = {
  uploadPhotos: (requestId: string, data: any) => api.post(`/measurements/${requestId}/photos`, data),
  getByRequest: (requestId: string) => api.get(`/measurements/${requestId}`),
  addAdjustments: (requestId: string, data: any) => api.put(`/measurements/${requestId}/adjustments`, data),
  getVaultLatest: () => api.get('/measurements/vault/latest'),
  applyVault: (requestId: string, data?: any) => api.post(`/measurements/${requestId}/apply-vault`, data || {}),
  updateVaultManual: (data: any) => api.put('/measurements/vault/manual', data),
};

// Orders API
export const ordersAPI = {
  createEvent: (requestId: string, data: any) => api.post(`/orders/${requestId}/events`, data),
  getEvents: (requestId: string) => api.get(`/orders/${requestId}`),
};

// Negotiations API
export const negotiationsAPI = {
  getByRequest: (requestId: string) => api.get(`/negotiations/${requestId}`),
  propose: (requestId: string, data: any) => api.post(`/negotiations/${requestId}/propose`, data),
  accept: (id: string) => api.put(`/negotiations/${id}/accept`),
  decline: (id: string) => api.put(`/negotiations/${id}/decline`),
};

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications/clear-all'),
  getUnreadCount: () => api.get('/notifications/count/unread'),
};

// Products API
export const productsAPI = {
  getByTailor: (tailorId: string) => api.get(`/products/tailor/${tailorId}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

// Uploads API
export const uploadsAPI = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Settings API
export const settingsAPI = {
  getPublic: () => api.get('/settings/public'),
  getAll: () => api.get('/settings'),
  update: (data: Record<string, any>) => api.put('/settings', data),
};

