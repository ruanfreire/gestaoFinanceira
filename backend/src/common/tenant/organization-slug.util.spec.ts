import { describe, expect, it } from 'vitest';
import { slugifyOrganization } from './organization-slug.util';

describe('slugifyOrganization', () => {
  it('normaliza nome com acentos e espaços', () => {
    expect(slugifyOrganization('Clínica São José')).toBe('clinica-sao-jose');
  });

  it('retorna fallback para string vazia', () => {
    expect(slugifyOrganization('---')).toBe('organizacao');
  });
});
