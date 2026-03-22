import apiClient from '../client';

/**
 * Patient Treatments API - GET /api/patient-treatments/
 * Single row: { patient, treatment, dentist, date, cost_override }
 * Batch visit:
 * POST /api/patient-treatments/batch/
 * { patient, dentist, date, treatments: [ { treatment }, { treatment, cost_override? }, ... ] }
 */
export const patientTreatmentsApi = {
  getAll: (params = {}) => apiClient.get('/patient-treatments/', { params }),
  getById: (id) => apiClient.get(`/patient-treatments/${id}/`),
  create: (data) => apiClient.post('/patient-treatments/', data),
  /**
   * One request with nested treatments (visit).
   * Response: { patient_treatments: [...], visit_document_url: string }
   */
  createBatch: (data) => apiClient.post('/patient-treatments/batch/', data),
  /** GET JSON for printable visit invoice: ?ids=1,2,3 */
  getVisitDocument: (params) => apiClient.get('/patient-treatments/visit-document/', { params }),
  update: (id, data) => apiClient.put(`/patient-treatments/${id}/`, data),
  delete: (id) => apiClient.delete(`/patient-treatments/${id}/`),
};
