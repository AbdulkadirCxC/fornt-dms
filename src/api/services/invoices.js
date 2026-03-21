import apiClient from '../client';

/**
 * Invoices API - GET /api/invoices/
 * Schema: { invoice_id, patient_id, total_amount, status, created_at }
 */
export const invoicesApi = {
  getAll: (params = {}) => apiClient.get('/invoices/', { params }),
  getById: (id) => apiClient.get(`/invoices/${id}/`),
  create: (data) => apiClient.post('/invoices/', data),
  update: (id, data) => apiClient.put(`/invoices/${id}/`, data),
  delete: (id) => apiClient.delete(`/invoices/${id}/`),
};
