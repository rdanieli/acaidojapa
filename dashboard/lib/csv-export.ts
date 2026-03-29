/**
 * Client-side CSV export utility.
 * Generates a CSV string and triggers a browser download.
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => {
      if (cell == null) return '';
      const str = String(cell);
      // Escape quotes and wrap in quotes if contains separator, quote, or newline
      if (str.includes(';') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(';'))
  ].join('\n');

  // Add BOM for Excel UTF-8 compatibility
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
