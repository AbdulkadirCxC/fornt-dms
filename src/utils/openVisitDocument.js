import apiClient from '../api/client';
import { apiConfig } from '../api/config';
import {
  normalizeVisitDocumentPayload,
  buildPrintableHtmlFromVisitDocumentJson,
} from './visitDocumentInvoice';

/**
 * Build an absolute URL for GET /api/patient-treatments/visit-document?ids=… (JSON invoice).
 * Use when re-printing from the list (no `visit_document_url` stored on the row).
 */
export function buildVisitDocumentAbsoluteUrl(ids) {
  const arr = (Array.isArray(ids) ? ids : [ids]).filter((id) => id != null && id !== '');
  const csv = arr.map(String).join(',');
  if (!csv) return '';
  const base = (apiConfig.baseURL || '/api').replace(/\/$/, '');
  const path = `${base}/patient-treatments/visit-document?ids=${csv}`;
  if (path.startsWith('http')) return path;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Same as openVisitDocumentWithAuth, but takes one or more patient-treatment IDs. */
export async function openVisitDocumentForIds(ids) {
  const url = buildVisitDocumentAbsoluteUrl(ids);
  if (!url) throw new Error('No treatment IDs for visit document.');
  return openVisitDocumentWithAuth(url);
}

export function ensureVisitDocumentJsonUrl(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    const base =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost';
    const u = url.startsWith('http') ? new URL(url) : new URL(url.replace(/^\//, ''), base);
    u.searchParams.delete('format');
    return u.toString();
  } catch {
    return url.replace(/[?&]format=[^&]*/gi, '').replace(/\?&/, '?').replace(/\?$/, '');
  }
}

function parseVisitDocumentUrl(absoluteUrl) {
  const jsonUrl = ensureVisitDocumentJsonUrl(absoluteUrl);
  const base =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost';
  const u = jsonUrl.startsWith('http') ? new URL(jsonUrl) : new URL(jsonUrl.replace(/^\//, ''), base);
  const path = u.pathname.replace(/^\/api/, '') + u.search;
  return path;
}

/**
 * Fetches visit-document JSON (authenticated), builds the same printable invoice as vouchers, opens in a new tab.
 */
export async function openVisitDocumentWithAuth(absoluteUrl) {
  const path = parseVisitDocumentUrl(absoluteUrl);
  const res = await apiClient.get(path);
  const payload = normalizeVisitDocumentPayload(res.data);
  const html = buildPrintableHtmlFromVisitDocumentJson(payload);
  const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
}
