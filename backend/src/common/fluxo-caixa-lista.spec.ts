import { describe, expect, it } from 'vitest';
import {
  buildSaldoBancoFormula,
  resolveFluxoCaixaCategoria,
  resolveFluxoCaixaCategoriaCartao,
  resolveUltimaLinhaFormulaSaldo,
} from './fluxo-caixa-lista';

describe('fluxo-caixa-lista', () => {
  it('gera fórmulas de saldo no padrão do modelo Nubank', () => {
    expect(buildSaldoBancoFormula('nubank', 8, 5)).toBe('H5-G8');
    expect(buildSaldoBancoFormula('nubank', 9, 8)).toBe('H8+G9');
    expect(buildSaldoBancoFormula('nubank', 10, 9)).toBe('H9-G10');
  });

  it('gera fórmulas de saldo no padrão do modelo Asaas', () => {
    expect(buildSaldoBancoFormula('asaas', 8, 5)).toBe('H5+G8');
    expect(buildSaldoBancoFormula('asaas', 9, 8)).toBe('H8-G9');
    expect(buildSaldoBancoFormula('asaas', 10, 9)).toBe('H9+G10');
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

  it('define última linha de fórmula respeitando o template', () => {
    expect(resolveUltimaLinhaFormulaSaldo('nubank', 3)).toBe(17);
    expect(resolveUltimaLinhaFormulaSaldo('nubank', 40)).toBe(47);
  });
});
