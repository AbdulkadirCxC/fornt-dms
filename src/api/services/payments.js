import apiClient from '../client';

/**
 * Payments API - GET /api/payments/
 * Schema: { amount, method, payment_date, invoice }
 */
export const paymentsApi = {
  getAll: (params = {}) => apiClient.get('/payments/', { params }),
  getById: (id) => apiClient.get(`/payments/${id}/`),
  /** GET /api/payments/{id}/voucher/ — printable payment voucher payload */
  getVoucher: (id) => apiClient.get(`/payments/${id}/voucher/`),
  create: (data) => apiClient.post('/payments/', data),
  update: (id, data) => apiClient.put(`/payments/${id}/`, data),
  delete: (id) => apiClient.delete(`/payments/${id}/`),
};
