import { describe, expect, it } from 'vitest';
import { mergeHonestPayloads } from './honest-fetch.util';
import { extractNotaItemsFromJson } from '../importacoes/nf-json.mapper';

describe('mergeHonestPayloads', () => {
  it('combina notas de múltiplos payloads', () => {
    const payloadA = {
      data: [
        {
          empresa: [
            {
              id: 1,
              nome: 'Empresa A',
              nf_lista: [{ items: [{ id: 'nf-1', numero: '100', valor: 500 }] }],
            },
          ],
        },
      ],
    };
    const payloadB = {
      data: [
        {
          empresa: [
            {
              id: 1,
              nome: 'Empresa A',
              nf_lista: [{ items: [{ id: 'nf-2', numero: '101', valor: 800 }] }],
            },
          ],
        },
      ],
    };

    const merged = mergeHonestPayloads([payloadA, payloadB]);
    const items = extractNotaItemsFromJson(merged);
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.item.numero).sort()).toEqual(['100', '101']);
  });

  it('preserva notas do GraphQL NfsEmitidas (nf_lista como objeto)', () => {
    const graphqlPayload = {
      status: 'success',
      data: {
        empresa: {
          id: 6148,
          nome: 'ANA',
          nf_lista: {
            items: [
              { id: 'nf-1', numero: '409', tomador_nome: 'Cliente', valor: 500 },
              { id: 'nf-2', numero: '410', tomador_nome: 'Cliente 2', valor: 800 },
            ],
            total: 2,
          },
        },
      },
    };

    const merged = mergeHonestPayloads([graphqlPayload]);
    const items = extractNotaItemsFromJson(merged);
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.item.numero).sort()).toEqual(['409', '410']);
  });
});
