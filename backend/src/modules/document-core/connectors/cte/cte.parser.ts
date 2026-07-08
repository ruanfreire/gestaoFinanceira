import { XMLParser } from 'fast-xml-parser';
import type { DocumentEnvelopePayload, Party, ValidationIssue } from '../../types/document-envelope.types';
import type { ParseContext } from '../../types/document-connector.interface';
import { extractChaveFromInfCteId } from '../../utils/cte.chave.util';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseTagValue: true,
  trimValues: true,
  numberParseOptions: {
    skipLike: /^\d{15,}$/,
    hex: false,
    leadingZeros: false,
  },
  isArray: (name) => ['infNFe', 'Comp'].includes(name),
});

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pickString(obj: Record<string, unknown> | null, ...keys: string[]): string | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const val = obj[key];
    if (val !== undefined && val !== null && val !== '') {
      return String(val);
    }
  }
  return undefined;
}

function pickNumber(obj: Record<string, unknown> | null, ...keys: string[]): number | undefined {
  const str = pickString(obj, ...keys);
  if (str === undefined) return undefined;
  const n = Number(String(str).replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function parseParty(node: unknown): Party | undefined {
  const obj = asRecord(node);
  if (!obj) return undefined;
  const nome = pickString(obj, 'xNome', 'xRazao');
  const cnpj = pickString(obj, 'CNPJ');
  const cpf = pickString(obj, 'CPF');
  const ie = pickString(obj, 'IE');
  if (!nome && !cnpj && !cpf) return undefined;

  const ender = asRecord(obj.enderEmit ?? obj.enderReme ?? obj.enderDest ?? obj.enderExped ?? obj.enderReceb);
  return {
    nome: nome ?? '—',
    cnpj,
    cpf,
    ie,
    municipio: pickString(ender, 'xMun'),
    uf: pickString(ender, 'UF'),
  };
}

function resolveTomador(
  ide: Record<string, unknown>,
  parties: {
    rem?: Party;
    dest?: Party;
    exped?: Party;
    receb?: Party;
    toma4?: Party;
  },
): { tomador?: Party; ambiguous: boolean } {
  const toma4 = parties.toma4;
  if (toma4) return { tomador: toma4, ambiguous: false };

  const toma3 = asRecord(ide.toma3);
  const toma = pickString(toma3, 'toma');
  if (!toma) return { tomador: undefined, ambiguous: true };

  switch (toma) {
    case '0':
      return { tomador: parties.rem, ambiguous: !parties.rem };
    case '1':
      return { tomador: parties.exped, ambiguous: !parties.exped };
    case '2':
      return { tomador: parties.receb, ambiguous: !parties.receb };
    case '3':
      return { tomador: parties.dest, ambiguous: !parties.dest };
    case '4':
      return { tomador: toma4, ambiguous: true };
    default:
      return { tomador: undefined, ambiguous: true };
  }
}

function detectLayoutVersion(infCte: Record<string, unknown>, root: Record<string, unknown>): string {
  const v = pickString(infCte, '@_versao') ?? pickString(root, '@_versao');
  if (v?.startsWith('4')) return '4.00';
  if (v?.startsWith('3')) return '3.00';
  return 'unknown';
}

function extractLinkedNfe(infCteNorm: Record<string, unknown> | null): DocumentEnvelopePayload['linkedDocuments'] {
  if (!infCteNorm) return [];
  const infDoc = asRecord(infCteNorm.infDoc);
  if (!infDoc) return [];
  const items = infDoc.infNFe;
  const list = Array.isArray(items) ? items : items ? [items] : [];
  return list
    .map((item) => {
      const rec = asRecord(item);
      const chave = pickString(rec, 'chave');
      if (!chave) return null;
      return { type: 'nfe' as const, chaveAcesso: String(chave).replace(/\D/g, '') };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

export function parseCteXml(bytes: Buffer, ctx: ParseContext): DocumentEnvelopePayload {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  let parsed: Record<string, unknown>;
  try {
    const text = bytes.toString('utf-8');
    parsed = parser.parse(text) as Record<string, unknown>;
  } catch {
    return buildFailedEnvelope(ctx, [
      { code: 'CTE_PARSE_ERROR', message: 'XML malformado ou ilegível' },
    ]);
  }

  const cteProc = asRecord(parsed.cteProc) ?? parsed;
  const cteNode = asRecord(cteProc.CTe) ?? asRecord(parsed.CTe);
  if (!cteNode) {
    return buildFailedEnvelope(ctx, [
      { code: 'CTE_PARSE_ERROR', message: 'Estrutura CT-e não encontrada no XML' },
    ]);
  }

  const infCte = asRecord(cteNode.infCte);
  if (!infCte) {
    return buildFailedEnvelope(ctx, [
      { code: 'CTE_PARSE_ERROR', message: 'Tag infCte ausente' },
    ]);
  }

  const hasProtocol = Boolean(cteProc.protCTe);
  if (!hasProtocol) {
    warnings.push({
      code: 'CTE_NO_PROTOCOLO',
      message: 'XML sem protocolo de autorização (protCTe)',
    });
  }

  const protCte = asRecord(cteProc.protCTe);
  const infProt = asRecord(protCte?.infProt);
  const cStat = pickString(infProt, 'cStat');
  if (cStat && cStat !== '100') {
    warnings.push({
      code: 'CTE_CANCELADO',
      message: `Status do protocolo: ${cStat} — ${pickString(infProt, 'xMotivo') ?? 'verificar situação fiscal'}`,
    });
  }

  const ide = asRecord(infCte.ide) ?? {};
  const layoutVersion = detectLayoutVersion(infCte, cteProc);

  const infCteId = pickString(infCte, '@_Id');
  const chaveAcesso =
    extractChaveFromInfCteId(infCteId) ??
    pickString(infProt, 'chCTe')?.replace(/^CTe/i, '').replace(/\D/g, '');

  const rem = parseParty(infCte.rem);
  const dest = parseParty(infCte.dest);
  const exped = parseParty(infCte.exped);
  const receb = parseParty(infCte.receb);
  const toma4Node = asRecord(ide.toma4);
  const toma4 = toma4Node ? parseParty(toma4Node) : undefined;
  const { tomador, ambiguous } = resolveTomador(ide, { rem, dest, exped, receb, toma4 });
  if (ambiguous && !tomador) {
    warnings.push({
      code: 'CTE_TOMADOR_AMBIGUO',
      message: 'Tomador do serviço não pôde ser resolvido automaticamente',
    });
  }

  const vPrest = asRecord(infCte.vPrest);
  const valorPrestacao = pickNumber(vPrest, 'vTPrest');
  const valorReceber = pickNumber(vPrest, 'vRec');

  const dhEmi = pickString(ide, 'dhEmi', 'dEmi');
  let competencia: string | undefined;
  if (dhEmi) {
    const d = new Date(dhEmi);
    if (!Number.isNaN(d.getTime())) {
      competencia = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }
  }

  const infCTeNorm = asRecord(infCte.infCTeNorm);
  const linkedDocuments = extractLinkedNfe(infCTeNorm);

  const envelope: DocumentEnvelopePayload = {
    docType: 'cte',
    layoutVersion,
    source: {
      filename: ctx.filename,
      mime: ctx.mime,
      contentHash: ctx.contentHash,
      ingestedAt: ctx.ingestedAt,
    },
    fiscalKeys: {
      chaveAcesso: chaveAcesso ?? undefined,
      numero: pickString(ide, 'nCT'),
      serie: pickString(ide, 'serie'),
      modelo: pickString(ide, 'mod') ?? '57',
      tpCTe: pickString(ide, 'tpCTe'),
    },
    parties: {
      emitente: parseParty(infCte.emit),
      remetente: rem,
      destinatario: dest,
      tomador,
      expedidor: exped,
      recebedor: receb,
    },
    amounts: {
      valorPrestacao,
      valorReceber,
    },
    dates: {
      emissao: dhEmi,
      competencia,
    },
    route: {
      municipioInicio: pickString(ide, 'xMunIni'),
      ufInicio: pickString(ide, 'UFIni'),
      municipioFim: pickString(ide, 'xMunFim'),
      ufFim: pickString(ide, 'UFFim'),
    },
    linkedDocuments,
    validation: { ok: true, errors, warnings },
    confidence: 0.9,
    rawXml: bytes.toString('utf-8'),
    links: [],
  };

  return envelope;
}

function buildFailedEnvelope(ctx: ParseContext, errors: ValidationIssue[]): DocumentEnvelopePayload {
  return {
    docType: 'cte',
    source: {
      filename: ctx.filename,
      mime: ctx.mime,
      contentHash: ctx.contentHash,
      ingestedAt: ctx.ingestedAt,
    },
    validation: { ok: false, errors, warnings: [] },
    confidence: 0,
    links: [],
  };
}
