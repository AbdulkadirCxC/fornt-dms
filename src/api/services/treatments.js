import apiClient from '../client';

/**
 * Treatments API - GET /api/treatments/
 * Schema: { name, description, cost }
 */
export const treatmentsApi = {
  getAll: (params = {}) => apiClient.get('/treatments/', { params }),
  getById: (id) => apiClient.get(`/treatments/${id}/`),
  create: (data) => apiClient.post('/treatments/', data),
  update: (id, data) => apiClient.put(`/treatments/${id}/`, data),
  delete: (id) => apiClient.delete(`/treatments/${id}/`),
};
