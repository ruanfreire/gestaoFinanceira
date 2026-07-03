import { describe, expect, it } from 'vitest';
import {
  isAsaasCobrancaRecebida,
  resolveTipoMovimento,
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

  it('infere saída por descrição quando valor vem positivo', () => {
    expect(
      resolveTipoMovimento(
        2400,
        'Transferência enviada pelo Pix - Ana Luisa Ricci Bardi Calado Neca',
      ),
    ).toBe('saida');
    expect(
      resolveTipoMovimento(
        689.1,
        'Transferência recebida pelo Pix - MARTA JERUZA VASCONCELOS LEAL',
      ),
    ).toBe('entrada');
  });
});
