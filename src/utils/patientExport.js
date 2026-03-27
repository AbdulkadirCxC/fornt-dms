/** Primary columns (order); extra API keys are appended after these. */
export const PATIENT_EXPORT_BASE_COLUMNS = [
  'id',
  'full_name',
  'gender',
  'date_of_birth',
  'phone',
  'email',
  'address',
  'blood_group',
  'allergies',
  'medical_history',
  'emergency_contact',
  'notes',
  'status',
  'registration_date',
  'last_visit',
  'appointment_count',
  'profile_photo',
];

function csvCell(v) {
  if (v == null || v === '') return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function collectColumns(rows) {
  const extra = new Set();
  for (const p of rows) {
    if (p && typeof p === 'object') {
      Object.keys(p).forEach((k) => {
        if (!PATIENT_EXPORT_BASE_COLUMNS.includes(k)) extra.add(k);
      });
    }
  }
  return [...PATIENT_EXPORT_BASE_COLUMNS, ...[...extra].sort()];
}

/**
 * @param {object[]} rows Patient objects from the API
 * @returns {string} CSV with UTF-8 BOM for Excel
 */
export function buildPatientsCsv(rows) {
  if (!rows.length) {
    const header = PATIENT_EXPORT_BASE_COLUMNS.join(',');
    return `\uFEFF${header}\r\n`;
  }
  const cols = collectColumns(rows);
  const header = cols.join(',');
  const lines = rows.map((p) => cols.map((col) => csvCell(p[col])).join(','));
  return `\uFEFF${[header, ...lines].join('\r\n')}`;
}

export function downloadTextFile(content, filename, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
