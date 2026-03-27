function csvCell(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'object') {
    const s = JSON.stringify(v);
    return `"${s.replace(/"/g, '""')}"`;
  }
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {object[]} rows
 * @param {string[]} columns
 * @param {(row: object, col: string) => string} getCellText
 */
export function buildCsvFromTable(rows, columns, getCellText) {
  if (!columns.length) return '\uFEFF';
  const header = columns.map((c) => csvCell(c)).join(',');
  const lines = rows.map((row) =>
    columns.map((col) => csvCell(getCellText(row, col))).join(',')
  );
  return `\uFEFF${[header, ...lines].join('\r\n')}`;
}

export function downloadCsvFile(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
