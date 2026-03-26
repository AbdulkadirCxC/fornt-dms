import apiClient from '../client';

/**
 * Recall Notifications API - /api/recall-notifications/
 */
export const recallNotificationsApi = {
  getAll: (params = {}) => apiClient.get('/recall-notifications/', { params }),
  dueToday: (params = {}) => apiClient.get('/recall-notifications/due-today/', { params }),
  getById: (id) => apiClient.get(`/recall-notifications/${id}/`),
  markSent: (id) => apiClient.post(`/recall-notifications/${id}/mark-sent/`),
  create: (data) => apiClient.post('/recall-notifications/', data),
  update: (id, data) => apiClient.patch(`/recall-notifications/${id}/`, data),
  delete: (id) => apiClient.delete(`/recall-notifications/${id}/`),
};

