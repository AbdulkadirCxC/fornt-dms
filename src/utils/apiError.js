/**
 * Human-readable message from axios error (DRF: string detail, list detail, or field dict).
 */
export function formatAxiosError(err, fallback = 'Request failed.') {
  const d = err?.response?.data;
  if (typeof d === 'string') return d;
  if (typeof d?.detail === 'string') return d.detail;
  if (Array.isArray(d?.detail)) {
    return d.detail
      .map((x) => (typeof x === 'string' ? x : x?.msg ?? x?.message ?? JSON.stringify(x)))
      .join('; ');
  }
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    const parts = [];
    for (const key of Object.keys(d)) {
      if (key === 'detail' || key === 'message') continue;
      if (key === 'non_field_errors' && Array.isArray(d[key])) {
        parts.push(d[key].map((x) => (typeof x === 'string' ? x : String(x))).join(' '));
        continue;
      }
      const v = d[key];
      if (Array.isArray(v)) {
        const msg = v.map((x) => (typeof x === 'string' ? x : String(x))).join(' ');
        parts.push(`${humanizeField(key)}: ${msg}`);
      } else if (typeof v === 'string') {
        parts.push(`${humanizeField(key)}: ${v}`);
      }
    }
    if (parts.length) return parts.join('\n');
  }
  if (typeof d?.message === 'string') return d.message;
  return err?.message ?? fallback;
}

function humanizeField(key) {
  if (!key || typeof key !== 'string') return 'Field';
  return key.replace(/_/g, ' ');
}
