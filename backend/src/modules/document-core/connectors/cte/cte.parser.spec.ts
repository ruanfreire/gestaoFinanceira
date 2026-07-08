import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { calcChaveDv, extractChaveFromInfCteId, validateChaveAcesso } from '../../utils/cte.chave.util';

describe('cte.chave.util', () => {
  it('calcula DV conhecido para chave de teste', () => {
    const body = '3526031234567800019957001000001234112345678';
    expect(calcChaveDv(body)).toBe(0);
    expect(validateChaveAcesso(`${body}0`).ok).toBe(true);
  });

  it('rejeita DV inválido', () => {
    const body = '3526031234567800019957001000001234112345678';
    const result = validateChaveAcesso(`${body}9`);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('CTE_INVALID_CHAVE_DV');
  });

  it('extrai chave do Id infCte', () => {
    const chave = extractChaveFromInfCteId('CTe35260312345678000199570010000012341123456780');
    expect(chave).toBe('35260312345678000199570010000012341123456780');
  });
});

describe('cte.parser', () => {
  const fixturePath = join(__dirname, 'fixtures', 'cte-proc-3.00.xml');
  const bytes = readFileSync(fixturePath);

  it('parseia CT-e 3.00 com campos críticos', async () => {
    const { parseCteXml } = await import('./cte.parser');
    const { validateCteEnvelope } = await import('./cte.validator');

    const envelope = validateCteEnvelope(
      parseCteXml(bytes, {
        filename: 'cte-proc-3.00.xml',
        mime: 'application/xml',
        contentHash: 'test',
        ingestedAt: new Date().toISOString(),
      }),
    );

    expect(envelope.docType).toBe('cte');
    expect(envelope.validation.ok).toBe(true);
    expect(envelope.fiscalKeys?.chaveAcesso).toBe('35260312345678000199570010000012341123456780');
    expect(envelope.fiscalKeys?.numero).toBe('1234');
    expect(envelope.amounts?.valorReceber).toBe(1250.33);
    expect(envelope.parties?.emitente?.nome).toBe('TRANSPORTADORA TESTE LTDA');
    expect(envelope.parties?.tomador?.nome).toBe('REMETENTE TESTE SA');
    expect(envelope.linkedDocuments?.[0]?.chaveAcesso).toBe('35260398765432000188550010000056781234567890');
    expect(envelope.route?.ufInicio).toBe('SP');
    expect(envelope.route?.ufFim).toBe('RJ');
  });

  it('parseia CT-e 4.00', async () => {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const { parseCteXml } = await import('./cte.parser');
    const { validateCteEnvelope } = await import('./cte.validator');
    const bytes = readFileSync(join(__dirname, 'fixtures', 'cte-proc-4.00.xml'));
    const envelope = validateCteEnvelope(
      parseCteXml(bytes, {
        filename: 'cte-proc-4.00.xml',
        mime: 'application/xml',
        contentHash: 'test4',
        ingestedAt: new Date().toISOString(),
      }),
    );
    expect(envelope.layoutVersion).toBe('4.00');
    expect(envelope.validation.ok).toBe(true);
  });
});
