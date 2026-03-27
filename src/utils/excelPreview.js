import * as XLSX from 'xlsx';

/** Max rows shown in the preview table (file can have up to 5000 per backend). */
export const EXCEL_PREVIEW_MAX_ROWS = 200;

function formatCell(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) {
    const t = v.getTime();
    if (Number.isNaN(t)) return String(v);
    return v.toISOString().slice(0, 10);
  }
  return String(v);
}

function rowHasContent(row) {
  if (!row || !row.length) return false;
  return row.some((c) => String(c ?? '').trim() !== '');
}

/** Headers that mean "patient id" — shown first in preview to match the Patients table. */
const ID_HEADER_NORMALIZED = new Set(['id', 'patient_id', 'patient id']);

function normalizeHeaderLabel(h) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * If the sheet has an id / patient_id column not in column A, move it first for preview clarity.
 * @param {string[]} headers
 * @param {string[][]} rows
 */
function reorderIdColumnFirst(headers, rows) {
  const idIndices = [];
  headers.forEach((h, i) => {
    if (ID_HEADER_NORMALIZED.has(normalizeHeaderLabel(h))) idIndices.push(i);
  });
  if (idIndices.length === 0) return { headers, rows };
  const firstId = idIndices[0];
  if (firstId === 0 && idIndices.length === 1) return { headers, rows };

  const taken = new Set(idIndices);
  const rest = headers.map((_, i) => i).filter((i) => !taken.has(i));
  const order = [...idIndices, ...rest];
  const newHeaders = order.map((i) => headers[i]);
  const newRows = rows.map((row) => order.map((i) => (row[i] != null ? row[i] : '')));
  return { headers: newHeaders, rows: newRows };
}

/**
 * Reads first sheet of an .xlsx file for preview (headers + data rows).
 * @param {File} file
 * @returns {Promise<{
 *   headers: string[],
 *   previewRows: string[][],
 *   totalDataRows: number,
 *   truncated: boolean
 * }>}
 */
export async function parseExcelForPreview(file) {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new Error('The workbook has no sheets.');
  }
  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!matrix.length) {
    throw new Error('The sheet is empty.');
  }

  const headerRow = matrix[0] || [];
  const headers = headerRow.map((v) => formatCell(v));
  const dataRowsRaw = matrix.slice(1);
  const nonBlankRows = dataRowsRaw.filter(rowHasContent);
  const totalDataRows = nonBlankRows.length;

  if (totalDataRows === 0) {
    throw new Error('No data rows found (only a header row or empty rows).');
  }

  const slice = nonBlankRows.slice(0, EXCEL_PREVIEW_MAX_ROWS);
  const previewRows = slice.map((row) => row.map((c) => formatCell(c)));
  const truncated = totalDataRows > EXCEL_PREVIEW_MAX_ROWS;

  const reordered = reorderIdColumnFirst(headers, previewRows);

  return {
    headers: reordered.headers,
    previewRows: reordered.rows,
    totalDataRows,
    truncated,
  };
}
