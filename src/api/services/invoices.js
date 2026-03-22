import apiClient from '../client';

/**
 * Invoices API - GET /api/invoices/
 * List/detail: { invoice_id, patient_id, total_amount, paid_amount, balance, status, created_at, ... }
 */
export const invoicesApi = {
  getAll: (params = {}) => apiClient.get('/invoices/', { params }),
  getById: (id) => apiClient.get(`/invoices/${id}/`),
  /** GET /api/invoices/{id}/voucher/ — printable voucher payload */
  getVoucher: (id) => apiClient.get(`/invoices/${id}/voucher/`),
  create: (data) => apiClient.post('/invoices/', data),
  update: (id, data) => apiClient.put(`/invoices/${id}/`, data),
  delete: (id) => apiClient.delete(`/invoices/${id}/`),
};
