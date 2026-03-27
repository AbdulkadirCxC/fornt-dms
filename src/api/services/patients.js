import apiClient from '../client';

function extractPatientList(data) {
  if (Array.isArray(data)) return data;
  return data?.results ?? data?.data ?? data?.patients ?? data?.items ?? [];
}

/**
 * Loads every patient (paginated) for export. Supports DRF `next` links or `offset` + `limit`.
 * @returns {Promise<object[]>}
 */
export async function fetchAllPatientsForExport() {
  const batchSize = 500;
  const res0 = await apiClient.get('/patients/', {
    params: { ordering: 'id', limit: batchSize, offset: 0 },
  });
  const data0 = res0.data;

  if (Array.isArray(data0)) {
    return data0;
  }

  const firstBatch = extractPatientList(data0);
  const firstPageFirstId = firstBatch[0]?.id ?? firstBatch[0]?.patientId;
  const all = [...firstBatch];

  if (data0?.next && typeof data0.next === 'string') {
    let nextUrl = data0.next;
    while (nextUrl) {
      const res = await apiClient.get(nextUrl);
      const d = res.data;
      const list = extractPatientList(d);
      all.push(...list);
      nextUrl = d?.next ?? null;
    }
    return all;
  }

  if (firstBatch.length < batchSize) {
    return all;
  }

  let offset = firstBatch.length;
  while (true) {
    const res = await apiClient.get('/patients/', {
      params: { ordering: 'id', limit: batchSize, offset },
    });
    const data = res.data;
    const batch = extractPatientList(data);
    if (!batch.length) break;
    const fid = batch[0]?.id ?? batch[0]?.patientId;
    if (offset > 0 && firstPageFirstId != null && fid === firstPageFirstId) break;
    all.push(...batch);
    if (batch.length < batchSize) break;
    offset += batch.length;
  }

  return all;
}

/** @param {object|FormData} data */
function requestConfig(data) {
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    return { headers: { 'Content-Type': 'multipart/form-data' } };
  }
  return {};
}

/**
 * Patients API — GET/POST/PATCH /api/patients/
 * Fields: full_name, gender, date_of_birth, phone, email, address,
 * blood_group, allergies, medical_history, emergency_contact, profile_photo,
 * notes, registration_date (read), last_visit (read), appointment_count (read), status
 */
export const patientsApi = {
  getAll: (params = {}) => apiClient.get('/patients/', { params }),
  getById: (id) => apiClient.get(`/patients/${id}/`),
  create: (data) => apiClient.post('/patients/', data, requestConfig(data)),
  update: (id, data) => apiClient.patch(`/patients/${id}/`, data, requestConfig(data)),
  delete: (id) => apiClient.delete(`/patients/${id}/`),
  /** @param {FormData} formData — must include `file` (.xlsx) */
  uploadExcel: (formData) =>
    apiClient.post('/patients/upload-excel/', formData, requestConfig(formData)),
};
