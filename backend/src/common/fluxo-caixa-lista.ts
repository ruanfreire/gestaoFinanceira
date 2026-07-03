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

/** Categorias da aba Cartão de Crédito no fluxo de caixa (Nubank CSV cartão). */
export function resolveFluxoCaixaCategoriaCartao(
  tipo: 'Entrada' | 'Saída',
  historico: string,
): string {
  if (tipo === 'Saída') return 'Cartão de crédito';
  const hist = normalizeLookup(historico);
  if (hist.includes('estorno')) return 'Estorno';
  return 'Pagamento de cartão';
}

/** Layout da planilha modelo — compact (padrão) ou wide (mais linhas). */
export type FluxoCaixaLayout = 'compact' | 'wide';

export const FLUXO_CAIXA_TEMPLATE_ROWS: Record<FluxoCaixaLayout, number> = {
  compact: 36,
  wide: 53,
};

/** Nomes das abas no arquivo modelo Excel (referência interna, não exibida ao usuário). */
export const FLUXO_CAIXA_TEMPLATE_SHEETS: Record<FluxoCaixaLayout, string> = {
  compact: 'Fluxo de caixa_Nubank',
  wide: 'Fluxo de caixa_ASAAS',
};

/** @deprecated use buildFluxoCaixaSheetName com o rótulo do perfil */
export const FLUXO_CAIXA_SHEET_NAMES = FLUXO_CAIXA_TEMPLATE_SHEETS;

/** Nome da aba Excel a partir do nome do perfil (card) — máx. 31 caracteres. */
export function buildFluxoCaixaSheetName(bancoLabel: string, profileName?: string): string {
  const label = (profileName?.trim() || bancoLabel.trim()).replace(/[:\\/?*[\]]/g, '');
  const name = label ? `Fluxo de caixa_${label}` : 'Fluxo de caixa';
  return name.slice(0, 31);
}

export const CARTAO_CREDITO_SHEET = 'Cartão de Crédito';
export const REEMBOLSO_SHEET = 'Reembolso de despesas';

export function splitFluxoRowsByReembolso<T extends { categoria: string }>(
  rows: T[],
): { principal: T[]; reembolso: T[] } {
  const reembolso: T[] = [];
  const principal = rows.filter((row) => {
    if (row.categoria === 'Reembolso de Despesas') {
      reembolso.push(row);
      return false;
    }
    return true;
  });
  return { principal, reembolso };
}

/**
 * Fórmula de saldo corrido: valores em G sempre positivos;
 * o sinal vem do tipo (Entrada soma, Saída subtrai).
 */
export function buildSaldoBancoFormula(excelRow: number, prevRow: number): string {
  const signed = `IF(B${excelRow}="Entrada";G${excelRow};-G${excelRow})`;
  if (excelRow === 8) {
    return `H5+${signed}`;
  }
  return `H${prevRow}+${signed}`;
}

/** Última linha com fórmula de saldo ativa no bloco de dados. */
export function resolveUltimaLinhaFormulaSaldo(layout: FluxoCaixaLayout, dataRows: number): number {
  const dataStartRow = 8;
  if (dataRows <= 0) return dataStartRow;
  const templateBodyRows = FLUXO_CAIXA_TEMPLATE_ROWS[layout] - 2;
  const lastDataRow = dataStartRow + Math.max(dataRows, templateBodyRows) - 1;
  return Math.min(dataStartRow + dataRows - 1, lastDataRow);
}
