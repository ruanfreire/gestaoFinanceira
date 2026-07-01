/** Lista consolidada do modelo Ana Luisa — aba "Lista" do Excel. */
export const FLUXO_CAIXA_TIPOS = ['Entrada', 'Saída'] as const;

export const FLUXO_CAIXA_CATEGORIAS = [
  'Recebimento',
  'Transferência bancária',
  'Fornecedor',
  'Prólabore',
  'SIMPLES',
  'Investimento Nubank RDB',
  'Empréstimo Sócio',
  'Empréstimo Bancário',
  'Adiantamento de Cliente',
  'Outras Entradas',
  'Tarifa Bancária',
  'Encargos bancários',
  'Folha de Pagamento',
  'Reembolso de Despesas',
  'Aluguel',
  'Condomínio',
  'Água',
  'Luz',
  'Despesas Diversas',
  'PIS',
  'COFINS',
  'ISS',
  'IRPJ',
  'CSLL',
  'IR Retido',
  'CS Retida',
  'ISS Retido',
  'INSS Retido',
  'Devolução Emprestimo Sócios',
  'Devolução Emprestimo Bancário',
  'Adiantamento Fornecedor',
] as const;

export type FluxoCaixaTipoLista = (typeof FLUXO_CAIXA_TIPOS)[number];
export type FluxoCaixaCategoriaLista = (typeof FLUXO_CAIXA_CATEGORIAS)[number];

const CATEGORIA_LOOKUP = new Map(
  FLUXO_CAIXA_CATEGORIAS.map((item) => [normalizeLookup(item), item]),
);

function normalizeLookup(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveFluxoCaixaCategoria(
  tipo: 'Entrada' | 'Saída',
  rawCategoria: string | undefined,
  historico: string,
): FluxoCaixaCategoriaLista {
  const candidates = [rawCategoria, historico].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const exact = CATEGORIA_LOOKUP.get(normalizeLookup(candidate));
    if (exact) return exact;
    for (const [key, value] of CATEGORIA_LOOKUP.entries()) {
      if (normalizeLookup(candidate).includes(key) || key.includes(normalizeLookup(candidate))) {
        return value;
      }
    }
  }

  const hist = normalizeLookup(historico);
  if (tipo === 'Entrada') {
    if (hist.includes('recebimento') || hist.includes('cobranca') || hist.includes('pix receb')) {
      return 'Recebimento';
    }
    if (hist.includes('transferencia')) return 'Transferência bancária';
    if (hist.includes('tarifa') || hist.includes('taxa')) return 'Tarifa Bancária';
    return 'Recebimento';
  }

  if (hist.includes('tarifa') || hist.includes('taxa')) return 'Tarifa Bancária';
  if (hist.includes('encargo') || hist.includes('juros')) return 'Encargos bancários';
  if (hist.includes('folha') || hist.includes('salario')) return 'Folha de Pagamento';
  if (hist.includes('reembolso')) return 'Reembolso de Despesas';
  if (hist.includes('transferencia')) return 'Transferência bancária';
  if (hist.includes('fornecedor')) return 'Fornecedor';
  return 'Despesas Diversas';
}

/** Linhas de dados do template por banco (inclui linhas em branco para edição manual). */
export const FLUXO_CAIXA_TEMPLATE_ROWS: Record<'nubank' | 'asaas', number> = {
  nubank: 36,
  asaas: 53,
};

export const FLUXO_CAIXA_SHEET_NAMES: Record<'nubank' | 'asaas', string> = {
  nubank: 'Fluxo de caixa_Nubank',
  asaas: 'Fluxo de caixa_ASAAS',
};

export const CARTAO_CREDITO_SHEET = 'Cartão de Crédito';

/**
 * Fórmula de saldo corrido conforme o modelo (valores em G sempre positivos;
 * sinal alternado por linha, com primeira operação distinta entre Nubank e Asaas).
 */
export function buildSaldoBancoFormula(
  banco: 'nubank' | 'asaas',
  excelRow: number,
  prevRow: number,
): string {
  if (excelRow === 8) {
    return banco === 'nubank' ? `H5-G${excelRow}` : `H5+G${excelRow}`;
  }
  const subtract = banco === 'nubank' ? (excelRow - 8) % 2 === 0 : (excelRow - 8) % 2 === 1;
  const op = subtract ? '-' : '+';
  return `H${prevRow}${op}G${excelRow}`;
}

/** Última linha com fórmula de saldo ativa no bloco de dados. */
export function resolveUltimaLinhaFormulaSaldo(
  banco: 'nubank' | 'asaas',
  dataRows: number,
): number {
  const templateRows = FLUXO_CAIXA_TEMPLATE_ROWS[banco];
  const bodyDataRows = Math.max(dataRows, templateRows - 2);
  const formulaEndRow = 8 + Math.max(dataRows, 10) - 1;
  return Math.min(formulaEndRow, 8 + bodyDataRows - 1);
}
