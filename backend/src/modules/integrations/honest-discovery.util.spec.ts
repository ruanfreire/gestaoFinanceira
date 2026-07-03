import { describe, expect, it } from 'vitest';
import {
  buildHonestBrowsePaths,
  buildHonestGraphqlNfRequest,
  countHonestGraphqlNfItems,
  extractHonestEmpresas,
  isHonestGraphqlNfResponse,
  mergeDiscoveredEndpoints,
  matchHonestEmpresaByCnpj,
  scoreHonestPayload,
} from './honest-discovery.util';

describe('scoreHonestPayload', () => {
  it('detecta notas no formato Honest', () => {
    const payload = {
      data: {
        empresa: {
          id: 1,
          nf_lista: {
            items: [{ numero: '1', tomador_nome: 'Cliente', codigo_servico: '05762', valor: '10' }],
          },
        },
      },
    };
    const scored = scoreHonestPayload(payload);
    expect(scored.notaCount).toBe(1);
    expect(scored.score).toBeGreaterThanOrEqual(60);
  });
});

describe('extractHonestEmpresas', () => {
  it('lê empresa_list do GraphQL Honest', () => {
    const items = extractHonestEmpresas({
      data: {
        empresa_list: [{ id: 6148, nome: 'ANA', cpfcnpj: '39803761000117' }],
      },
    });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(6148);
  });

  it('faz match por CNPJ normalizado', () => {
    const matched = matchHonestEmpresaByCnpj(
      [{ id: 6148, nome: 'ANA', cpfcnpj: '39803761000117' }],
      '39.803.761/0001-17',
    );
    expect(matched?.id).toBe(6148);
  });
});

describe('buildHonestGraphqlNfRequest', () => {
  it('usa paginação igual ao portal nf/lista', () => {
    const body = buildHonestGraphqlNfRequest(6148);
    expect(body.operationName).toBe('NfsEmitidas');
    expect(body.variables).toEqual({ empresaId: 6148, query: { limit: 1000, offset: 0 } });
  });
});

describe('isHonestGraphqlNfResponse', () => {
  it('valida resposta NfsEmitidas da Honest', () => {
    const payload = {
      status: 'success',
      data: {
        empresa: {
          id: 6148,
          nf_lista: { items: [{ id: 1, numero: '409' }], total: 1 },
        },
      },
    };
    expect(isHonestGraphqlNfResponse(payload)).toBe(true);
    expect(countHonestGraphqlNfItems(payload)).toBe(1);
  });
});

describe('buildHonestBrowsePaths', () => {
  it('prioriza nf/lista após selecionar empresa', () => {
    const paths = buildHonestBrowsePaths(6148);
    expect(paths).toContain('/u/empresa/6148/nf/lista');
    expect(paths.indexOf('/u/empresa/6148/nf/lista')).toBeLessThan(paths.indexOf('/u/empresa/6148/nf'));
  });
});

describe('mergeDiscoveredEndpoints', () => {
  it('mantém o endpoint com maior score', () => {
    const merged = mergeDiscoveredEndpoints(
      [
        {
          id: 'a',
          url: 'https://api.test/notas',
          method: 'GET',
          label: 'notas',
          nota_count: 1,
          score: 50,
          captured_at: new Date().toISOString(),
          source: 'scan',
        },
      ],
      {
        url: 'https://api.test/notas',
        method: 'GET',
        label: 'notas',
        nota_count: 5,
        score: 80,
        captured_at: new Date().toISOString(),
        source: 'browse',
      },
    );
    expect(merged[0].nota_count).toBe(5);
    expect(merged[0].score).toBe(80);
  });
});
