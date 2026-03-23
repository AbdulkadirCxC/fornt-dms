import apiClient from '../client';

/**
 * Reports API - GET /api/reports/*
 */
export const reportsApi = {
  dailyRevenue: (params = {}) => apiClient.get('/reports/daily-revenue/', { params }),
  patientTreatmentHistory: (params = {}) => apiClient.get('/reports/patient-treatment-history/', { params }),
  appointments: (params = {}) => apiClient.get('/reports/appointments/', { params }),
  outstandingPayments: (params = {}) => apiClient.get('/reports/outstanding-payments/', { params }),
  dentistPerformance: (params = {}) => apiClient.get('/reports/dentist-performance/', { params }),
  mostCommonTreatments: (params = {}) => apiClient.get('/reports/most-common-treatments/', { params }),
  paymentMethods: (params = {}) => apiClient.get('/reports/payment-methods/', { params }),
  customerStatement: (params = {}) => apiClient.get('/reports/customer-statement/', { params }),
  logs: (params = {}) => apiClient.get('/reports/logs/', { params }),
};
