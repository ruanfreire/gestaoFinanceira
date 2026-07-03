import { describe, expect, it } from 'vitest';
import {
  isAsaasCobrancaRecebida,
  resolveLancamentoTipoMovimento,
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
    expect(isAsaasCobrancaRecebida('Cobrança recebida')).toBe(true);
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

  it('reclassifica taxa Asaas positiva como saída na exportação', () => {
    expect(
      resolveLancamentoTipoMovimento({
        valor: 1.99,
        descricao: 'Taxa de boleto - fatura nr. 682228893 Luana',
        tipo_movimento: 'entrada',
        tipo_transacao: 'Taxa de boleto',
      }),
    ).toBe('saida');
  });

  it('classifica transferência enviada e pagamento de conta como saída', () => {
    expect(
      resolveLancamentoTipoMovimento({
        valor: 2400,
        descricao: 'Transferência enviada pelo Pix - Ana',
        tipo_movimento: 'entrada',
      }),
    ).toBe('saida');
    expect(
      resolveLancamentoTipoMovimento({
        valor: 150,
        descricao: 'Pagamento de conta - energia',
        tipo_movimento: 'entrada',
      }),
    ).toBe('saida');
  });

  it('reclassifica entrada gravada errada quando inferência diverge', () => {
    expect(
      resolveLancamentoTipoMovimento({
        valor: 500,
        descricao: 'Mensageria - fatura nr. 123',
        tipo_movimento: 'entrada',
      }),
    ).toBe('saida');
  });
});
