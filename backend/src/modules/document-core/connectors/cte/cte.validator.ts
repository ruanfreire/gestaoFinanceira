import type { DocumentEnvelopePayload, ValidationIssue } from '../../types/document-envelope.types';
import { validateChaveAcesso } from '../../utils/cte.chave.util';

export function validateCteEnvelope(envelope: DocumentEnvelopePayload): DocumentEnvelopePayload {
  const errors: ValidationIssue[] = [...envelope.validation.errors];
  const warnings: ValidationIssue[] = [...envelope.validation.warnings];

  const chave = envelope.fiscalKeys?.chaveAcesso;
  if (!chave) {
    errors.push({ code: 'CTE_MISSING_CHAVE', field: 'fiscalKeys.chaveAcesso', message: 'Chave de acesso ausente' });
  } else {
    const chaveCheck = validateChaveAcesso(chave);
    if (!chaveCheck.ok) {
      errors.push({
        code: chaveCheck.code ?? 'CTE_INVALID_CHAVE_DV',
        field: 'fiscalKeys.chaveAcesso',
        message: chaveCheck.message ?? 'Chave inválida',
      });
    }
  }

  const emitente = envelope.parties?.emitente;
  if (!emitente?.nome || (!emitente.cnpj && !emitente.cpf)) {
    errors.push({
      code: 'CTE_MISSING_EMITENTE',
      field: 'parties.emitente',
      message: 'Emitente sem CNPJ/CPF ou razão social',
    });
  }

  const valorReceber = envelope.amounts?.valorReceber;
  if (valorReceber === undefined || valorReceber <= 0 || Number.isNaN(valorReceber)) {
    errors.push({
      code: 'CTE_MISSING_VALOR',
      field: 'amounts.valorReceber',
      message: 'Valor a receber ausente ou inválido',
    });
  }

  const emissao = envelope.dates?.emissao;
  if (!emissao || Number.isNaN(new Date(emissao).getTime())) {
    errors.push({
      code: 'CTE_MISSING_EMISSAO',
      field: 'dates.emissao',
      message: 'Data de emissão inválida',
    });
  }

  const ok = errors.length === 0;

  return {
    ...envelope,
    validation: { ok, errors, warnings },
    confidence: ok ? (warnings.length ? 0.85 : 0.95) : envelope.confidence,
  };
}

export function addDuplicateWarning(
  envelope: DocumentEnvelopePayload,
  existingChave: boolean,
): DocumentEnvelopePayload {
  if (!existingChave) return envelope;
  const warnings = [
    ...envelope.validation.warnings,
    {
      code: 'CTE_DUPLICATE_INGEST',
      message: 'Esta chave já foi importada nesta organização',
    },
  ];
  return {
    ...envelope,
    validation: { ...envelope.validation, warnings },
  };
}
