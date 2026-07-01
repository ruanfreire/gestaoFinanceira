import { describe, expect, it } from 'vitest';
import {
  buildFaturaSnapshot,
  mapFromStoredJsonOriginal,
  mapNfItemToNotaDto,
} from './nf-json.mapper';

describe('mapNfItemToNotaDto', () => {
  const empresa = { id: 6148, nome: 'Empresa Teste', cnpj: '12.345.678/0001-99' };
  const item = {
    id: 32895352,
    numero: '408',
    tomador_nome: 'PATRICIA JUNQUEIRA RODRIGUES',
    codigo_servico: '05762',
    valor: '758.01',
    data_emissao: '2026-06-25',
    status_emissao: 'NORMAL',
    rpsId: 544695,
    link_prefeitura:
      'https://nfe.prefeitura.sp.gov.br/nfe.aspx?ccm=67687385&nf=408&cod=6NTESE2G',
    __typename: 'Nf',
  };

  it('mapeia campos do inicial.json', () => {
    const dto = mapNfItemToNotaDto(empresa, item);
    expect(dto.nota_api_id).toBe('32895352');
    expect(dto.numero).toBe('408');
    expect(dto.tomador).toBe('PATRICIA JUNQUEIRA RODRIGUES');
    expect(dto.valor).toBe(758.01);
    expect(dto.mes_competencia).toBe('2026-06');
    expect(dto.rps_id).toBe('544695');
    expect(dto.prefeitura_ccm).toBe('67687385');
    expect(dto.prefeitura_cod_nf).toBe('408');
    expect(dto.prefeitura_cod_verificacao).toBe('6NTESE2G');
    expect(dto.empresa_id).toBe(6148);
    expect(dto.empresa_nome).toBe('Empresa Teste');
  });

  it('guarda snapshot completo em json_original', () => {
    const dto = mapNfItemToNotaDto(empresa, item);
    expect(dto.json_original?.nf).toEqual(item);
    expect(dto.json_original?.empresa?.id).toBe(6148);
    expect(dto.json_original?.mapeado_em).toBeTruthy();
  });

  it('aceita aliases alternativos da API', () => {
    const dto = mapNfItemToNotaDto(empresa, {
      id: 1,
      numero: '1',
      tomador: 'Cliente API',
      tomador_cnpj: '12345678000199',
      tomador_email: 'a@b.com',
      valorLiquido: '100.50',
      data_competencia: '2026-05-15',
      discriminacao: 'Serviços de consultoria',
      statusEmissao: 'NORMAL',
      rps_id: '99',
    });
    expect(dto.tomador).toBe('Cliente API');
    expect(dto.tomador_documento).toBe('12345678000199');
    expect(dto.tomador_email).toBe('a@b.com');
    expect(dto.valor_liquido).toBe(100.5);
    expect(dto.mes_competencia).toBe('2026-05');
    expect(dto.discriminacao).toBe('Serviços de consultoria');
  });

  it('preserva campos desconhecidos em fatura_extras', () => {
    const dto = mapNfItemToNotaDto(empresa, {
      ...item,
      campo_novo_api: 'valor futuro',
    });
    expect(dto.fatura_extras?.campo_novo_api).toBe('valor futuro');
    expect(dto.fatura_extras?.__typename).toBeUndefined();
  });
});

describe('mapFromStoredJsonOriginal', () => {
  it('remapeia snapshot enriquecido', () => {
    const snapshot = buildFaturaSnapshot({ id: 1, nome: 'X' }, { id: 10, numero: '5', valor: '10' });
    const dto = mapFromStoredJsonOriginal(snapshot);
    expect(dto?.numero).toBe('5');
    expect(dto?.valor).toBe(10);
  });

  it('compatível com json_original legado (item puro)', () => {
    const dto = mapFromStoredJsonOriginal({
      id: 99,
      numero: '100',
      tomador_nome: 'Legado',
      valor: '50',
      data_emissao: '2026-01-10',
    });
    expect(dto?.tomador).toBe('Legado');
    expect(dto?.mes_competencia).toBe('2026-01');
  });
});
