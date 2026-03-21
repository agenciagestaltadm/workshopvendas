import * as XLSX from 'xlsx';

export type FullExportRow = {
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  course: string;
};

const pad2 = (value: number) => String(value).padStart(2, '0');

export const formatDateDDMMYYYY = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const buildDisparoXlsxBlob = (rows: Array<{ name: string; phone: string }>) => {
  const header = ['name', 'phone'];
  const data = rows.map((row) => [row.name, row.phone]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);

  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1:B1');
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  ws['!cols'] = [{ wch: 30 }, { wch: 20 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Disparo');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const buildFullWorkbookArrayBuffer = (rows: FullExportRow[]) => {
  const header = ['Data', 'Nome', 'Email', 'Telefone', 'CPF/CNPJ', 'Curso'];
  const data = rows.map((row) => [formatDateDDMMYYYY(row.createdAt), row.name, row.email, row.phone, row.document, row.course]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);

  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1:A1');
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

  const colWidths = header.map((title, colIndex) => {
    let max = title.length;
    for (const row of data) {
      const cell = row[colIndex];
      const length = typeof cell === 'string' ? cell.length : String(cell ?? '').length;
      if (length > max) max = length;
    }
    return { wch: Math.min(60, Math.max(12, max + 2)) };
  });
  ws['!cols'] = colWidths;

  for (let col = 0; col < header.length; col += 1) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: col });
    const cell = ws[addr];
    if (cell) cell.s = { font: { bold: true } };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inscrições');

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true }) as ArrayBuffer;
};

export const buildFullWorkbookBlob = (rows: FullExportRow[]) => {
  const buffer = buildFullWorkbookArrayBuffer(rows);
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
};
