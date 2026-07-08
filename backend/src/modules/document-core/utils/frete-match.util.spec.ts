import { describe, expect, it } from 'vitest';
import { resolveFreteMatchFromScored, scoreFreteTitulos } from './frete-match.util';

describe('frete-match.util', () => {
  const titulo = {
    _id: 'titulo1',
    tomador_nome: 'REMETENTE TESTE SA',
    valor: 1250.33,
    data_emissao: new Date('2026-03-15'),
    status_pagamento: 'aguardando_pagamento',
  };

  it('concilia automaticamente valor e nome compatíveis', () => {
    const scored = scoreFreteTitulos(
      [titulo],
      'REMETENTE TESTE SA',
      1250.33,
      new Date('2026-03-20'),
    );
    const result = resolveFreteMatchFromScored(scored, new Date('2026-03-20'));
    expect(result.status_conciliacao).toBe('conciliado_auto');
    if (result.status_conciliacao === 'conciliado_auto') {
      expect(result.frete_titulo_id).toBe('titulo1');
    }
  });

  it('retorna pendente quando há múltiplos títulos com mesmo valor e tomador', () => {
    const scored = scoreFreteTitulos(
      [
        titulo,
        { ...titulo, _id: 'titulo2' },
      ],
      'REMETENTE TESTE SA',
      1250.33,
      new Date('2026-03-20'),
    );
    const result = resolveFreteMatchFromScored(scored, new Date('2026-03-20'));
    expect(result.status_conciliacao).toBe('pendente_vinculo');
  });
});
