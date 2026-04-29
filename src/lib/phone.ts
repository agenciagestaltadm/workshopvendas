export const normalizePhoneForWhatsApp = (value: string) => {
  const digits = (value ?? '').replace(/\D/g, '');
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  const ddd = Number(withCountry.slice(2, 4));
  const local = withCountry.slice(4);

  if (!Number.isFinite(ddd) || local.length === 0) return withCountry;

  const dddLabel = String(ddd).padStart(2, '0');
  const shouldStripLeadingNine = local.length === 9 && local.startsWith('9');

  if (ddd <= 27) return `55${dddLabel}${local}`;
  if (shouldStripLeadingNine) return `55${dddLabel}${local.slice(1)}`;
  return `55${dddLabel}${local}`;
};

/**
 * Normaliza telefone legado para formato de disparo:
 * 55 + DDD + 9 + numero (13 digitos), sem simbolos.
 * Retorna string vazia quando nao for possivel normalizar com seguranca.
 */
export const normalizePhoneForDisparo = (value: string) => {
  let digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return '';

  // Remove repeticao acidental do codigo de pais (ex.: 5555...)
  while (digits.startsWith('5555')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  // Corta lixo comum de ramal colado no final
  if (digits.length > 11) {
    digits = digits.slice(0, 11);
  }

  // precisa de ao menos DDD + numero local
  if (digits.length < 10) return '';

  const ddd = digits.slice(0, 2);
  let local = digits.slice(2);

  // Fixo (8) -> celular (9)
  if (local.length === 8) {
    local = `9${local}`;
  }

  // Se vier com mais de 9, mantem os 9 primeiros apos DDD
  if (local.length > 9) {
    local = local.slice(0, 9);
  }

  if (local.length !== 9) return '';
  if (!local.startsWith('9')) {
    // Corrige caso legado com primeiro digito diferente de 9
    local = `9${local.slice(1)}`;
  }

  const normalized = `55${ddd}${local}`;
  return /^55\d{2}9\d{8}$/.test(normalized) ? normalized : '';
};

export const applyPhoneMask = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  // Assume user is typing local number if not starting with 55
  // But be careful with editing.
  let clean = digits;
  if (!clean.startsWith('55')) {
    clean = `55${clean}`;
  }

  if (clean.length > 13) clean = clean.slice(0, 13);

  let formatted = `+${clean.slice(0, 2)}`;
  if (clean.length > 2) formatted += ` ${clean.slice(2, 4)}`;
  if (clean.length > 4) formatted += ` ${clean.slice(4, 9)}`;
  if (clean.length > 9) formatted += `-${clean.slice(9)}`;
  
  return formatted;
};
