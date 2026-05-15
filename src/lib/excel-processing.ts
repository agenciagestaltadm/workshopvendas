import * as XLSX from 'xlsx';
import { normalizePhoneForWhatsApp } from '@/lib/phone';

export type ProcessedRow = {
  name: string;
  phone: string;
  originalPhone: string;
  isValid: boolean;
  error?: string;
};

export type ProcessResult = {
  validRows: ProcessedRow[];
  invalidRows: ProcessedRow[];
  total: number;
};

export const processDisparoFile = async (file: File): Promise<ProcessResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse to JSON with header row
        const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
        
        if (!rawRows || rawRows.length < 2) {
            reject(new Error('Arquivo vazio ou sem cabeçalho.'));
            return;
        }

        const headerRow = rawRows[0] as string[];
        // Allow case-insensitive and Portuguese variations
        const nameIdx = headerRow.findIndex(h => h && (h.toString().toLowerCase() === 'name' || h.toString().toLowerCase() === 'nome'));
        const phoneIdx = headerRow.findIndex(h => h && (h.toString().toLowerCase() === 'phone' || h.toString().toLowerCase() === 'telefone' || h.toString().toLowerCase() === 'celular'));

        if (nameIdx === -1 || phoneIdx === -1) {
             reject(new Error('Formato inválido. O arquivo deve conter colunas "name" e "phone".'));
             return;
        }

        const validRows: ProcessedRow[] = [];
        const invalidRows: ProcessedRow[] = [];

        // Skip header
        for (let i = 1; i < rawRows.length; i++) {
            const row = rawRows[i] as unknown[];
            if (!row || row.length === 0) continue;

            const name = String(row[nameIdx] || '').trim();
            const rawPhone = String(row[phoneIdx] || '').trim();

            if (!name && !rawPhone) continue; // Skip empty rows

            if (!name) {
                invalidRows.push({ name: 'Desconhecido', phone: '', originalPhone: rawPhone, isValid: false, error: 'Nome ausente' });
                continue;
            }

            if (!rawPhone) {
                invalidRows.push({ name, phone: '', originalPhone: rawPhone, isValid: false, error: 'Telefone ausente' });
                continue;
            }

            // Clean and format phone
            const normalized = normalizePhoneForWhatsApp(rawPhone);
            
            // Validate the normalized phone
            // It should be 55 + 2 digits DDD + 8 or 9 digits
            const isValidFormat = /^\d{12,13}$/.test(normalized);
            
            if (isValidFormat) {
                validRows.push({ name, phone: normalized, originalPhone: rawPhone, isValid: true });
            } else {
                 invalidRows.push({ name, phone: normalized, originalPhone: rawPhone, isValid: false, error: 'Formato de telefone inválido após processamento' });
            }
        }

        resolve({ validRows, invalidRows, total: validRows.length + invalidRows.length });

      } catch (err) {
        reject(new Error('Erro ao ler o arquivo. Verifique se é um Excel válido.'));
      }
    };
    reader.onerror = () => reject(new Error('Erro na leitura do arquivo.'));
    reader.readAsArrayBuffer(file);
  });
};
