// Remove tudo que não é dígito
export const cleanDocument = (value: string): string => {
  return value.replace(/\D/g, '');
};

// Aplica máscara de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)
export const applyDocumentMask = (value: string): string => {
  const cleaned = cleanDocument(value);

  if (cleaned.length <= 11) {
    // CPF: 000.000.000-00
    return cleaned
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // CNPJ: 00.000.000/0000-00
    return cleaned
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
};

// Valida dígitos verificadores do CPF
const isValidCPF = (cpf: string): boolean => {
  if (cpf.length !== 11) return false;

  // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
  if (/^(\d)\1+$/.test(cpf)) return false;

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10))) return false;

  return true;
};

// Valida dígitos verificadores do CNPJ
const isValidCNPJ = (cnpj: string): boolean => {
  if (cnpj.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cnpj)) return false;

  // Validação do primeiro dígito verificador
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  // Validação do segundo dígito verificador
  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
};

// Valida CPF ou CNPJ
export const isValidDocument = (value: string): boolean => {
  const cleaned = cleanDocument(value);

  if (cleaned.length === 11) {
    return isValidCPF(cleaned);
  } else if (cleaned.length === 14) {
    return isValidCNPJ(cleaned);
  }

  return false;
};

// Retorna o tipo do documento
export const getDocumentType = (value: string): 'CPF' | 'CNPJ' | 'INVALID' => {
  const cleaned = cleanDocument(value);

  if (cleaned.length === 11 && isValidCPF(cleaned)) {
    return 'CPF';
  } else if (cleaned.length === 14 && isValidCNPJ(cleaned)) {
    return 'CNPJ';
  }

  return 'INVALID';
};
