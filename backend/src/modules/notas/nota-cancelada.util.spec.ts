import { describe, expect, it } from 'vitest';
import { isNotaCancelada } from './nota-cancelada.util';

describe('isNotaCancelada', () => {
  it('identifica CANCELADA em status_emissao', () => {
    expect(isNotaCancelada({ status_emissao: 'CANCELADA' })).toBe(true);
  });

  it('identifica cancelamento em status', () => {
    expect(isNotaCancelada({ status: 'Cancelada' })).toBe(true);
  });

  it('NF normal não é cancelada', () => {
    expect(isNotaCancelada({ status_emissao: 'NORMAL', status: 'NORMAL' })).toBe(false);
    expect(isNotaCancelada({})).toBe(false);
  });
});
