import { describe, expect, it } from 'vitest';
import { buildHonestEmitNfRequest, parseHonestEmitResponse } from './honest-emissao.util';

describe('honest-emissao.util', () => {
  it('monta mutation NfEmitir', () => {
    const body = buildHonestEmitNfRequest(6148, {
      tomador_nome: 'Cliente A',
      tomador_documento: '12345678901',
      valor: 500,
      codigo_servico: '05762',
      discriminacao: 'Serviços prestados',
    });
    expect(body.operationName).toBe('NfEmitir');
    expect(body.variables.empresaId).toBe(6148);
    expect(body.variables.input.valor).toBe('500.00');
  });

  it('interpreta resposta de emissão', () => {
    const result = parseHonestEmitResponse({
      data: {
        nf_emitir: {
          id: 'nf-1',
          numero: '410',
          link_prefeitura: 'https://example.com/nf',
          status_emissao: 'NORMAL',
        },
      },
    });
    expect(result.ok).toBe(true);
    expect(result.numero).toBe('410');
    expect(result.nota_api_id).toBe('nf-1');
  });

  it('mapeia erro graphql', () => {
    const result = parseHonestEmitResponse({
      errors: [{ message: 'CPF inválido' }],
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('CPF');
  });
});
