import { describe, expect, it } from 'vitest';
import {
  extractPagadorFromDescricao,
  isDirtyPagadorNome,
  resolvePagadorNome,
} from './pagador-from-descricao.util';

describe('pagador-from-descricao', () => {
  it('extrai nome após Pix recebido de', () => {
    expect(extractPagadorFromDescricao('Pix recebido de Marco Silva Consultoria')).toBe(
      'Marco Silva Consultoria',
    );
  });

  it('extrai nome após Pix recebido sem "de"', () => {
    expect(extractPagadorFromDescricao('Pix recebido Cliente A')).toBe('Cliente A');
  });

  it('extrai nome de TED recebida', () => {
    expect(extractPagadorFromDescricao('TED RECEBIDA EMPRESA X')).toBe('EMPRESA X');
  });

  it('extrai nome de transferência pelo Pix', () => {
    expect(
      extractPagadorFromDescricao('Transferência recebida pelo Pix - Delta Corp Servicos'),
    ).toBe('Delta Corp Servicos');
  });

  it('extrai nome de segmento após pipe', () => {
    expect(extractPagadorFromDescricao('Pix recebido | Horizonte Eventos LTDA')).toBe(
      'Horizonte Eventos LTDA',
    );
  });

  it('ignora descrições genéricas sem pagador', () => {
    expect(extractPagadorFromDescricao('Pix recebido')).toBeUndefined();
    expect(extractPagadorFromDescricao('Tarifa bancária')).toBeUndefined();
  });

  it('extrai nome em Pix curto', () => {
    expect(extractPagadorFromDescricao('Pix Cliente B')).toBe('Cliente B');
  });

  it('prioriza coluna Quem pagou quando preenchida', () => {
    expect(resolvePagadorNome('Ana Costa', 'Pix recebido de Outra Pessoa')).toBe('Ana Costa');
  });

  it('usa descrição quando coluna Quem pagou está vazia', () => {
    expect(resolvePagadorNome('', 'Pix recebido de Beta Marketing Digital')).toBe(
      'Beta Marketing Digital',
    );
    expect(resolvePagadorNome(undefined, 'Cobrança recebida - Studio Criativo LTDA')).toBe(
      'Studio Criativo LTDA',
    );
    expect(
      resolvePagadorNome(
        undefined,
        'Cobrança recebida - fatura nr. 682228893 Luana Barreto Kaderabek',
      ),
    ).toBe('Luana Barreto Kaderabek');
  });

  it('sanitiza CPF/CNPJ de coluna Quem pagou', () => {
    expect(resolvePagadorNome('Studio Criativo LTDA CPF 123.456.789-00', 'Pix')).toBe(
      'Studio Criativo LTDA',
    );
  });

  it('extrai só o nome em extrato Nubank com CPF mascarado e banco', () => {
    const descricao =
      'Transferência recebida pelo Pix - MARTA JERUZA VASCONCELOS LEAL - •••.181.194-•• - ITAÚ UNIBANCO S.A. (0341) Agência: 6385 Conta: 26439-2';
    expect(resolvePagadorNome(undefined, descricao)).toBe('MARTA JERUZA VASCONCELOS LEAL');
  });

  it('extrai razão social em TED/CIP sem lixo bancário', () => {
    const descricao =
      'Transferência Recebida - CAMARA INTERBANCARIA DE PAGAMENTOS CIP - 04.391.007/0001-32 - BCO BRADESCO S.A. (0237) Agência: 3395 Conta: 55076-0';
    expect(resolvePagadorNome(undefined, descricao)).toBe('CAMARA INTERBANCARIA DE PAGAMENTOS CIP');
  });

  it('não preenche pagador em transferência enviada', () => {
    const descricao =
      'Transferência enviada pelo Pix - Ana Luisa Ricci Bardi Calado Neca - •••.563.599-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 98707762-3';
    expect(resolvePagadorNome(undefined, descricao, 'entrada')).toBeUndefined();
    expect(resolvePagadorNome(undefined, descricao, 'saida')).toBeUndefined();
  });

  it('não preenche pagador em movimento interno', () => {
    expect(resolvePagadorNome(undefined, 'Dinheiro guardado com resgate planejado')).toBeUndefined();
  });

  it('detecta pagador sujo com dados bancários', () => {
    expect(
      isDirtyPagadorNome(
        'MARTA JERUZA VASCONCELOS LEAL - •••.181.194-•• - ITAÚ UNIBANCO S.A. (0341) Agência: 6385',
      ),
    ).toBe(true);
  });
});
