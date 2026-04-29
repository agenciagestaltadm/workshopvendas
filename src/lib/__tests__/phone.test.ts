import { describe, expect, it } from 'vitest';
import { normalizePhoneForDisparo, normalizePhoneForWhatsApp } from '@/lib/phone';

describe('normalizePhoneForWhatsApp', () => {
  it('mantém o 9 inicial para DDD <= 27', () => {
    expect(normalizePhoneForWhatsApp('(11) 91234-5678')).toBe('5511912345678');
    expect(normalizePhoneForWhatsApp('5511912345678')).toBe('5511912345678');
  });

  it('remove o 9 inicial para DDD > 27 quando presente', () => {
    expect(normalizePhoneForWhatsApp('(94) 99403-9847')).toBe('559494039847');
    expect(normalizePhoneForWhatsApp('5594994039847')).toBe('559494039847');
  });

  it('não remove dígitos quando já está sem 9 e DDD > 27', () => {
    expect(normalizePhoneForWhatsApp('(94) 9403-9847')).toBe('559494039847');
  });
});

describe('normalizePhoneForDisparo', () => {
  it('mantém formato válido quando já está correto', () => {
    expect(normalizePhoneForDisparo('5563999112061')).toBe('5563999112061');
  });

  it('remove símbolos e aplica 55 + DDD + 9 + número', () => {
    expect(normalizePhoneForDisparo('+55 (63) 99112-061')).toBe('5563999112061');
  });

  it('corrige país repetido da base legada', () => {
    expect(normalizePhoneForDisparo('555563999112061')).toBe('5563999112061');
  });

  it('converte número local de 8 dígitos para celular com 9', () => {
    expect(normalizePhoneForDisparo('(63) 3112-0610')).toBe('5563931120610');
  });

  it('trunca ramal colado no final', () => {
    expect(normalizePhoneForDisparo('5563999112061123')).toBe('5563999112061');
  });

  it('retorna vazio para entrada inválida', () => {
    expect(normalizePhoneForDisparo('123')).toBe('');
    expect(normalizePhoneForDisparo('')).toBe('');
  });
});

