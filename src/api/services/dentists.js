import apiClient from '../client';

/**
 * Dentists API - GET /api/dentists/
 * Schema: { name, specialization }
 */
export const dentistsApi = {
  getAll: (params = {}) => apiClient.get('/dentists/', { params }),
  getById: (id) => apiClient.get(`/dentists/${id}/`),
  create: (data) => apiClient.post('/dentists/', data),
  update: (id, data) => apiClient.put(`/dentists/${id}/`, data),
  delete: (id) => apiClient.delete(`/dentists/${id}/`),
};
