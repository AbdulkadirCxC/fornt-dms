/**
 * API Configuration for Dental Management System
 * Update VITE_API_BASE_URL in .env to point to your backend
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};
