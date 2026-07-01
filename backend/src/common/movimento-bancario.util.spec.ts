import { describe, expect, it } from 'vitest';
import {
  isAsaasCobrancaRecebida,
  tipoMovimentoFromAsaas,
  tipoMovimentoFromNubank,
} from './movimento-bancario.util';

describe('movimento-bancario.util', () => {
  it('classifica Asaas crédito e débito', () => {
    expect(tipoMovimentoFromAsaas('Crédito')).toBe('entrada');
    expect(tipoMovimentoFromAsaas('Débito')).toBe('saida');
  });

  it('identifica cobrança recebida Asaas', () => {
    expect(isAsaasCobrancaRecebida('Cobrança recebida', 'Crédito')).toBe(true);
    expect(isAsaasCobrancaRecebida('Transferência', 'Crédito')).toBe(false);
    expect(isAsaasCobrancaRecebida('Cobrança recebida', 'Débito')).toBe(false);
  });

  it('classifica Nubank crédito e débito', () => {
    expect(tipoMovimentoFromNubank('credito')).toBe('entrada');
    expect(tipoMovimentoFromNubank('debito')).toBe('saida');
  });
});
