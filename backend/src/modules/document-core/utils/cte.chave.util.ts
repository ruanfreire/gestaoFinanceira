/** Calcula dígito verificador da chave de acesso (43 primeiros dígitos). */
export function calcChaveDv(chave43: string): number {
  if (!/^\d{43}$/.test(chave43)) {
    throw new Error('Chave deve ter exatamente 43 dígitos para cálculo do DV');
  }
  let mult = 2;
  let soma = 0;
  for (let i = chave43.length - 1; i >= 0; i -= 1) {
    soma += parseInt(chave43.charAt(i), 10) * mult;
    mult += 1;
    if (mult > 9) mult = 2;
  }
  const mod = soma % 11;
  return mod === 0 || mod === 1 ? 0 : 11 - mod;
}

export function extractChaveFromInfCteId(id: string | undefined): string | null {
  if (!id) return null;
  const digits = id.replace(/^CTe/i, '').replace(/\D/g, '');
  return digits.length === 44 ? digits : digits.length === 43 ? `${digits}${calcChaveDv(digits)}` : null;
}

export function validateChaveAcesso(chave: string): { ok: boolean; code?: string; message?: string } {
  const normalized = chave.replace(/\D/g, '');
  if (normalized.length !== 44) {
    return { ok: false, code: 'CTE_MISSING_CHAVE', message: 'Chave deve ter 44 dígitos' };
  }
  const body = normalized.slice(0, 43);
  const dv = parseInt(normalized.charAt(43), 10);
  const expected = calcChaveDv(body);
  if (dv !== expected) {
    return {
      ok: false,
      code: 'CTE_INVALID_CHAVE_DV',
      message: `Dígito verificador inválido (esperado ${expected}, encontrado ${dv})`,
    };
  }
  return { ok: true };
}
