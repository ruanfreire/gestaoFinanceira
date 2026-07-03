import type { NfImportPreviewItem } from '../types/nf-import-profile.types';

export function detectJsonInconsistencies(
  faturas: NfImportPreviewItem[],
): Array<{ type: string; message: string }> {
  const issues: Array<{ type: string; message: string }> = [];
  const numeroCounts = new Map<string, number>();

  faturas.forEach((fatura, index) => {
    const ref = fatura.numero ?? `item ${index + 1}`;

    if (!fatura.numero?.trim()) {
      issues.push({ type: 'missing_numero', message: `Nota sem número (posição ${index + 1})` });
    }
    if (fatura.valor == null || Number.isNaN(fatura.valor)) {
      issues.push({ type: 'missing_valor', message: `NF ${ref}: valor ausente ou inválido` });
    }
    if (!fatura.tomador?.trim()) {
      issues.push({ type: 'missing_tomador', message: `NF ${ref}: tomador ausente` });
    }
    const status = fatura.status_emissao?.toUpperCase() ?? '';
    if (status.includes('CANCEL')) {
      issues.push({ type: 'cancelada', message: `NF ${ref}: consta como cancelada no arquivo` });
    }
    if (fatura.numero?.trim()) {
      const key = fatura.numero.trim();
      numeroCounts.set(key, (numeroCounts.get(key) ?? 0) + 1);
    }
  });

  for (const [numero, count] of numeroCounts) {
    if (count > 1) {
      issues.push({ type: 'duplicate_numero', message: `NF ${numero}: aparece ${count} vezes no arquivo` });
    }
  }

  return issues;
}
