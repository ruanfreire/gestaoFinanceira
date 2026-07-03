import { describe, expect, it } from 'vitest';
import {
  buildSaldoBancoFormula,
  resolveFluxoCaixaCategoria,
  resolveFluxoCaixaCategoriaCartao,
  resolveUltimaLinhaFormulaSaldo,
} from './fluxo-caixa-lista';

describe('fluxo-caixa-lista', () => {
  it('gera fórmulas de saldo com base no tipo Entrada/Saída', () => {
    expect(buildSaldoBancoFormula(8, 5)).toBe('H5+IF(B8="Entrada";G8;-G8)');
    expect(buildSaldoBancoFormula(9, 8)).toBe('H8+IF(B9="Entrada";G9;-G9)');
    expect(buildSaldoBancoFormula(10, 9)).toBe('H9+IF(B10="Entrada";G10;-G10)');
  });

  it('mapeia categorias para a lista consolidada', () => {
    expect(resolveFluxoCaixaCategoria('Entrada', '05762', 'Cobrança recebida')).toBe('Recebimento');
    expect(resolveFluxoCaixaCategoria('Saída', undefined, 'Tarifa bancária')).toBe('Tarifa Bancária');
  });

  it('mapeia categorias do cartão Nubank', () => {
    expect(resolveFluxoCaixaCategoriaCartao('Saída', 'HONEST CONTABILIDADE EPP')).toBe('Cartão de crédito');
    expect(resolveFluxoCaixaCategoriaCartao('Entrada', 'Pagamento recebido')).toBe('Pagamento de cartão');
    expect(resolveFluxoCaixaCategoriaCartao('Entrada', 'Estorno de compra')).toBe('Estorno');
  });

  it('define última linha de fórmula apenas até os lançamentos reais', () => {
    expect(resolveUltimaLinhaFormulaSaldo('compact', 3)).toBe(10);
    expect(resolveUltimaLinhaFormulaSaldo('compact', 40)).toBe(47);
  });
});
