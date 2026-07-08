import { describe, expect, it } from 'vitest';
import { mapPrefeituraEmitErrorMessage } from './prefeitura-emissao.util';

describe('prefeitura-emissao.util', () => {
  it('mapeia erro de documento', () => {
    expect(mapPrefeituraEmitErrorMessage('CPF inválido')).toMatch(/tomador/i);
  });

  it('preserva mensagem desconhecida', () => {
    expect(mapPrefeituraEmitErrorMessage('Erro customizado')).toBe('Erro customizado');
  });
});
