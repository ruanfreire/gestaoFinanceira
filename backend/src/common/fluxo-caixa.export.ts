import path from 'node:path';
import ExcelJS from 'exceljs';
import type { FluxoCaixaLayout } from './fluxo-caixa-lista';
import {
  CARTAO_CREDITO_SHEET,
  FLUXO_CAIXA_CATEGORIAS,
  FLUXO_CAIXA_TEMPLATE_ROWS,
  FLUXO_CAIXA_TEMPLATE_SHEETS,
  FLUXO_CAIXA_TIPOS,
  REEMBOLSO_SHEET,
  buildSaldoBancoFormula,
} from './fluxo-caixa-lista';

export type FluxoCaixaRow = {
  data: Date;
  tipo: 'Entrada' | 'Saída';
  categoria: string;
  numeroDocumento: string;
  clienteFornecedor: string;
  historico: string;
  valor: number;
};

export type FluxoCaixaHeader = {
  empresaNome: string;
  empresaCnpj: string;
  banco: string;
  contaCorrente: string;
  saldoInicial: number;
};

const HEADER_ROW = 7;
const DATA_START_ROW = 8;
const LISTA_SHEET = 'Lista';
const SUMMARY_SLOT_ROWS = 2;

const CURRENCY_FMT = 'R$ #,##0.00';
const DATE_FMT = 'dd/mm/yyyy';

const MODELO_PATH = path.resolve(__dirname, '../../assets/fluxo-caixa-modelo.xlsx');

type LayoutPlan = {
  dataRows: number;
  dataEndRow: number;
  formulaEndRow: number;
  summaryStartRow: number;
  saldoFinalRow: number;
  filterEndRow: number;
};

function buildLayoutPlan(layout: FluxoCaixaLayout, rowCount: number): LayoutPlan {
  const templateDataRows = FLUXO_CAIXA_TEMPLATE_ROWS[layout] - SUMMARY_SLOT_ROWS;
  const dataRows = Math.max(rowCount, templateDataRows);
  const dataEndRow = DATA_START_ROW + dataRows - 1;
  const summaryStartRow = dataEndRow + 1;
  const saldoFinalRow = dataEndRow + SUMMARY_SLOT_ROWS + 1;
  const formulaEndRow =
    rowCount > 0
      ? Math.min(DATA_START_ROW + rowCount - 1, dataEndRow)
      : DATA_START_ROW;

  return {
    dataRows,
    dataEndRow,
    formulaEndRow,
    summaryStartRow,
    saldoFinalRow,
    filterEndRow: dataEndRow,
  };
}

const FOOTER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF000000' },
};

const FOOTER_FONT: Partial<ExcelJS.Font> = {
  color: { argb: 'FFFFFFFF' },
  bold: true,
};

const TITLE_FONT: Partial<ExcelJS.Font> = {
  color: { argb: 'FFFFFFFF' },
  bold: true,
  size: 14,
};

const TABLE_HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF374151' },
};

const TABLE_HEADER_FONT: Partial<ExcelJS.Font> = {
  color: { argb: 'FFFFFFFF' },
  bold: true,
};

const LABEL_FONT: Partial<ExcelJS.Font> = { bold: true };

const FLUXO_COLUMN_WIDTHS = [
  { width: 13.29 },
  { width: 10.86 },
  { width: 19.86 },
  { width: 17 },
  { width: 60 },
  { width: 22.57 },
  { width: 14.86 },
  { width: 11.43 },
] as const;

const FLUXO_TABLE_HEADERS = [
  'Data',
  'Tipo',
  'Categoria/ Plano de contas',
  'Nº Documento / NF',
  'Cliente / Fornecedor',
  'Histórico',
  'Valor',
  'Saldo Banco',
] as const;

function resetCell(cell: ExcelJS.Cell) {
  cell.value = null;
  cell.style = {};
}

function clearSheetRows(sheet: ExcelJS.Worksheet, fromRow: number, toRow: number) {
  for (let rowNum = fromRow; rowNum <= toRow; rowNum += 1) {
    const row = sheet.getRow(rowNum);
    for (let col = 1; col <= 8; col += 1) {
      resetCell(row.getCell(col));
    }
  }
}

/** Remove fórmulas compartilhadas do modelo que ficaram abaixo do bloco preenchido. */
function scrubResidualTemplateFormulas(sheet: ExcelJS.Worksheet, fromRow: number) {
  const maxRow = Math.max(sheet.rowCount, fromRow);
  for (let rowNum = fromRow; rowNum <= maxRow; rowNum += 1) {
    const row = sheet.getRow(rowNum);
    for (let col = 1; col <= 8; col += 1) {
      const cell = row.getCell(col);
      if (cell.type === ExcelJS.ValueType.Formula) {
        resetCell(cell);
      }
    }
  }
}

function applyFooterRowStyle(sheet: ExcelJS.Worksheet, rowNum: number) {
  const row = sheet.getRow(rowNum);
  for (let col = 1; col <= 8; col += 1) {
    const cell = row.getCell(col);
    cell.fill = FOOTER_FILL;
    cell.font = FOOTER_FONT;
  }
}

function applyListSheet(workbook: ExcelJS.Workbook) {
  let lista = workbook.getWorksheet(LISTA_SHEET);
  if (!lista) {
    lista = workbook.addWorksheet(LISTA_SHEET);
  }
  lista.columns = [{ width: 14 }, { width: 36 }];
  FLUXO_CAIXA_TIPOS.forEach((tipo, index) => {
    lista.getCell(index + 1, 1).value = tipo;
  });
  FLUXO_CAIXA_CATEGORIAS.forEach((categoria, index) => {
    lista.getCell(index + 1, 2).value = categoria;
  });
}

function registerNamedRanges(workbook: ExcelJS.Workbook) {
  const lastCategoriaRow = FLUXO_CAIXA_CATEGORIAS.length;
  workbook.definedNames.add(`'${LISTA_SHEET}'!$A$1:$A$2`, 'tipo');
  workbook.definedNames.add(`'${LISTA_SHEET}'!$B$1:$B$${lastCategoriaRow}`, 'Categoria');
}

function removeOtherFluxoSheets(
  workbook: ExcelJS.Workbook,
  activeSheet: string,
  keepCartaoCredito = false,
  keepReembolso = false,
) {
  for (const name of Object.values(FLUXO_CAIXA_TEMPLATE_SHEETS)) {
    if (name === activeSheet) continue;
    const sheet = workbook.getWorksheet(name);
    if (sheet) workbook.removeWorksheet(sheet.id);
  }
  const extrasToRemove: string[] = [];
  if (!keepCartaoCredito) extrasToRemove.push(CARTAO_CREDITO_SHEET);
  if (!keepReembolso) extrasToRemove.push(REEMBOLSO_SHEET);
  for (const extra of extrasToRemove) {
    const sheet = workbook.getWorksheet(extra);
    if (sheet) workbook.removeWorksheet(sheet.id);
  }
}

function removeUnusedTemplateSheets(workbook: ExcelJS.Workbook, keepSheetNames: Set<string>) {
  for (const name of Object.values(FLUXO_CAIXA_TEMPLATE_SHEETS)) {
    if (keepSheetNames.has(name)) continue;
    const sheet = workbook.getWorksheet(name);
    if (sheet) workbook.removeWorksheet(sheet.id);
  }
}

function removeUnusedSecondarySheets(
  workbook: ExcelJS.Workbook,
  keepCartaoCredito: boolean,
  keepReembolso: boolean,
) {
  if (!keepCartaoCredito) {
    const cartao = workbook.getWorksheet(CARTAO_CREDITO_SHEET);
    if (cartao) workbook.removeWorksheet(cartao.id);
  }
  if (!keepReembolso) {
    const reembolso = workbook.getWorksheet(REEMBOLSO_SHEET);
    if (reembolso) workbook.removeWorksheet(reembolso.id);
  }
}

type AcquiredFluxoSheet = {
  sheet: ExcelJS.Worksheet;
  fromTemplate: boolean;
};

function normalizeSheetKey(name: string): string {
  return name.trim().toLowerCase();
}

function isSheetNameTaken(
  workbook: ExcelJS.Workbook,
  name: string,
  assignedNames: Set<string>,
): boolean {
  const key = normalizeSheetKey(name);
  if ([...assignedNames].some((candidate) => normalizeSheetKey(candidate) === key)) return true;
  return workbook.worksheets.some((sheet) => normalizeSheetKey(sheet.name) === key);
}

function ensureUniqueSheetName(
  workbook: ExcelJS.Workbook,
  desiredName: string,
  assignedNames: Set<string>,
): string {
  const base = desiredName.slice(0, 31);
  if (!isSheetNameTaken(workbook, base, assignedNames)) return base;

  for (let index = 2; index < 100; index += 1) {
    const suffix = ` (${index})`;
    const candidate = `${desiredName.slice(0, 31 - suffix.length)}${suffix}`;
    if (!isSheetNameTaken(workbook, candidate, assignedNames)) return candidate;
  }

  return `${base.slice(0, 24)}_${Date.now()}`.slice(0, 31);
}

function acquireFluxoSheetFallback(
  workbook: ExcelJS.Workbook,
  desiredName: string,
  assignedNames: Set<string>,
  reservedName?: string,
): AcquiredFluxoSheet {
  if (reservedName) assignedNames.delete(reservedName);
  const fallback = ensureUniqueSheetName(workbook, desiredName, assignedNames);
  assignedNames.add(fallback);
  return { sheet: workbook.addWorksheet(fallback), fromTemplate: false };
}

function acquireFluxoSheet(
  workbook: ExcelJS.Workbook,
  layout: FluxoCaixaLayout,
  sheetName: string,
  preserveLayout: boolean,
  usedTemplateSheets: Set<string>,
  assignedNames: Set<string>,
): AcquiredFluxoSheet {
  const safeName = ensureUniqueSheetName(workbook, sheetName, assignedNames);
  assignedNames.add(safeName);

  const requested = sheetName.slice(0, 31);
  const mayUseTemplate = preserveLayout && safeName === requested;

  if (mayUseTemplate) {
    const preferredTemplate = FLUXO_CAIXA_TEMPLATE_SHEETS[layout];
    if (!usedTemplateSheets.has(preferredTemplate)) {
      const templateSheet = workbook.getWorksheet(preferredTemplate);
      if (templateSheet) {
        usedTemplateSheets.add(preferredTemplate);
        if (preferredTemplate !== safeName) {
          try {
            templateSheet.name = safeName;
          } catch {
            return acquireFluxoSheetFallback(workbook, sheetName, assignedNames, safeName);
          }
        }
        return { sheet: templateSheet, fromTemplate: true };
      }
    }
    for (const templateName of Object.values(FLUXO_CAIXA_TEMPLATE_SHEETS)) {
      if (usedTemplateSheets.has(templateName)) continue;
      const templateSheet = workbook.getWorksheet(templateName);
      if (!templateSheet) continue;
      usedTemplateSheets.add(templateName);
      if (templateName !== safeName) {
        try {
          templateSheet.name = safeName;
        } catch {
          return acquireFluxoSheetFallback(workbook, sheetName, assignedNames, safeName);
        }
      }
      return { sheet: templateSheet, fromTemplate: true };
    }
  }

  return acquireFluxoSheetFallback(workbook, sheetName, assignedNames, safeName);
}

function applySheetChrome(sheet: ExcelJS.Worksheet) {
  sheet.getRow(1).height = 28;
  for (let col = 1; col <= 8; col += 1) {
    const cell = sheet.getRow(1).getCell(col);
    cell.fill = FOOTER_FILL;
    cell.font = TITLE_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  for (const rowNum of [3, 4, 5]) {
    sheet.getRow(rowNum).getCell(1).font = LABEL_FONT;
    sheet.getRow(rowNum).getCell(7).font = LABEL_FONT;
  }

  sheet.getRow(HEADER_ROW).height = 22;
  for (let col = 1; col <= 8; col += 1) {
    const cell = sheet.getRow(HEADER_ROW).getCell(col);
    cell.fill = TABLE_HEADER_FILL;
    cell.font = TABLE_HEADER_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }

  sheet.columns = [...FLUXO_COLUMN_WIDTHS];
}

function writeFluxoHeaderBlock(sheet: ExcelJS.Worksheet, header: FluxoCaixaHeader) {
  sheet.getCell('A1').value = 'CONTROLE DE FLUXO DE CAIXA';
  sheet.getCell('A3').value = 'Empresa:';
  sheet.getCell('B3').value = header.empresaNome;
  sheet.getCell('A4').value = 'CNPJ ';
  sheet.getCell('B4').value = header.empresaCnpj;
  sheet.getCell('A5').value = 'Banco:';
  sheet.getCell('B5').value = header.banco;
  sheet.getCell('C5').value = 'Conta Corrente:';
  sheet.getCell('D5').value = header.contaCorrente || '';
  sheet.getCell('G5').value = 'Saldo Inicial:';

  const saldoInicialCell = sheet.getCell('H5');
  saldoInicialCell.value = header.saldoInicial;
  saldoInicialCell.numFmt = CURRENCY_FMT;

  FLUXO_TABLE_HEADERS.forEach((text, index) => {
    sheet.getRow(HEADER_ROW).getCell(index + 1).value = text;
  });
}

function safeMergeCells(sheet: ExcelJS.Worksheet, range: string) {
  try {
    sheet.mergeCells(range);
  } catch {
    // célula já mesclada (reuso de aba no consolidado sem modelo Excel)
  }
}

function setupFluxoSheetLayout(
  sheet: ExcelJS.Worksheet,
  header: FluxoCaixaHeader,
  preserveLayout = false,
) {
  if (!preserveLayout) {
    safeMergeCells(sheet, 'A1:H1');
    safeMergeCells(sheet, 'B3:H3');
  }
  writeFluxoHeaderBlock(sheet, header);
  applySheetChrome(sheet);
}

function setupSecondaryFluxoSheetLayout(
  sheet: ExcelJS.Worksheet,
  header: FluxoCaixaHeader,
  preserveLayout = false,
) {
  setupFluxoSheetLayout(sheet, header, preserveLayout);
}

function setupCartaoCreditoSheetLayout(
  sheet: ExcelJS.Worksheet,
  header: FluxoCaixaHeader,
  preserveLayout = false,
) {
  setupFluxoSheetLayout(sheet, header, preserveLayout);
}

function fillDataBlock(
  sheet: ExcelJS.Worksheet,
  rows: FluxoCaixaRow[],
  plan: LayoutPlan,
) {
  let prevFormulaRow = 5;

  for (let i = 0; i < plan.dataRows; i += 1) {
    const excelRow = DATA_START_ROW + i;
    const rowData = rows[i];
    const sheetRow = sheet.getRow(excelRow);

    if (rowData) {
      sheetRow.getCell(1).value = rowData.data;
      sheetRow.getCell(1).numFmt = DATE_FMT;
      sheetRow.getCell(2).value = rowData.tipo;
      sheetRow.getCell(3).value = rowData.categoria;
      sheetRow.getCell(4).value = rowData.numeroDocumento;
      sheetRow.getCell(5).value = rowData.clienteFornecedor;
      sheetRow.getCell(6).value = rowData.historico;
      sheetRow.getCell(7).value = Math.abs(rowData.valor);
      sheetRow.getCell(7).numFmt = CURRENCY_FMT;
    } else {
      for (let col = 1; col <= 7; col += 1) {
        sheetRow.getCell(col).value = null;
      }
    }

    const saldoCell = sheetRow.getCell(8);
    if (excelRow <= plan.formulaEndRow) {
      saldoCell.value = { formula: buildSaldoBancoFormula(excelRow, prevFormulaRow) };
      prevFormulaRow = excelRow;
    } else {
      saldoCell.value = null;
    }
    saldoCell.numFmt = CURRENCY_FMT;

    sheetRow.getCell(2).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['=tipo'],
    };
    sheetRow.getCell(3).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['=Categoria'],
    };
  }
}

function fillSummaryRows(sheet: ExcelJS.Worksheet, plan: LayoutPlan) {
  const dataEndRow = plan.formulaEndRow >= DATA_START_ROW ? plan.formulaEndRow : plan.dataEndRow;

  const entradasRow = sheet.getRow(plan.summaryStartRow);
  entradasRow.getCell(6).value = 'Total Entradas';
  entradasRow.getCell(7).value = {
    formula: `SUMIF(B${DATA_START_ROW}:B${dataEndRow};"Entrada";G${DATA_START_ROW}:G${dataEndRow})`,
  };
  entradasRow.getCell(7).numFmt = CURRENCY_FMT;
  applyFooterRowStyle(sheet, plan.summaryStartRow);

  const saidasRow = sheet.getRow(plan.summaryStartRow + 1);
  saidasRow.getCell(6).value = 'Total Saídas';
  saidasRow.getCell(7).value = {
    formula: `SUMIF(B${DATA_START_ROW}:B${dataEndRow};"Saída";G${DATA_START_ROW}:G${dataEndRow})`,
  };
  saidasRow.getCell(7).numFmt = CURRENCY_FMT;
  applyFooterRowStyle(sheet, plan.summaryStartRow + 1);
}

function fillSaldoFinal(sheet: ExcelJS.Worksheet, plan: LayoutPlan) {
  const row = sheet.getRow(plan.saldoFinalRow);
  row.getCell(1).value = 'Saldo Final do Extrato Bancário';
  const saldoFinalCell = row.getCell(8);
  const entradasCell = `G${plan.summaryStartRow}`;
  const saidasCell = `G${plan.summaryStartRow + 1}`;
  saldoFinalCell.value = { formula: `H5+${entradasCell}-${saidasCell}` };
  saldoFinalCell.numFmt = CURRENCY_FMT;
  applyFooterRowStyle(sheet, plan.saldoFinalRow);
}

function prepareSheetDataArea(
  sheet: ExcelJS.Worksheet,
  plan: LayoutPlan,
  layout: FluxoCaixaLayout,
) {
  const templateEnd = DATA_START_ROW + FLUXO_CAIXA_TEMPLATE_ROWS[layout] + SUMMARY_SLOT_ROWS;
  const clearUntil = Math.max(plan.saldoFinalRow, templateEnd);
  clearSheetRows(sheet, DATA_START_ROW, clearUntil);
}

function populateFluxoBancoSheet(
  workbook: ExcelJS.Workbook,
  layout: FluxoCaixaLayout,
  sheetName: string,
  header: FluxoCaixaHeader,
  rows: FluxoCaixaRow[],
  preserveLayout = false,
  usedTemplateSheets: Set<string> = new Set(),
  assignedNames: Set<string> = new Set(),
): string {
  const { sheet, fromTemplate } = acquireFluxoSheet(
    workbook,
    layout,
    sheetName,
    preserveLayout,
    usedTemplateSheets,
    assignedNames,
  );
  const sheetPreserveLayout = preserveLayout && fromTemplate;
  setupFluxoSheetLayout(sheet, header, sheetPreserveLayout);

  const plan = buildLayoutPlan(layout, rows.length);
  if (sheetPreserveLayout) {
    prepareSheetDataArea(sheet, plan, layout);
  }
  fillDataBlock(sheet, rows, plan);
  fillSummaryRows(sheet, plan);
  fillSaldoFinal(sheet, plan);

  if (sheetPreserveLayout) {
    scrubResidualTemplateFormulas(sheet, plan.saldoFinalRow + 1);
  }

  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: plan.filterEndRow, column: 1 },
  };

  return sheet.name;
}

function populateCartaoCreditoSheet(
  workbook: ExcelJS.Workbook,
  header: FluxoCaixaHeader,
  rows: FluxoCaixaRow[],
  preserveLayout = false,
) {
  if (rows.length === 0) return;

  let sheet = workbook.getWorksheet(CARTAO_CREDITO_SHEET);
  if (!sheet) {
    sheet = workbook.addWorksheet(CARTAO_CREDITO_SHEET);
  }

  const plan = buildLayoutPlan('compact', rows.length);
  setupCartaoCreditoSheetLayout(sheet, header, preserveLayout);
  if (preserveLayout) {
    prepareSheetDataArea(sheet, plan, 'compact');
  }
  fillDataBlock(sheet, rows, plan);
  fillSummaryRows(sheet, plan);
  fillSaldoFinal(sheet, plan);

  if (preserveLayout) {
    scrubResidualTemplateFormulas(sheet, plan.saldoFinalRow + 1);
  }

  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: plan.filterEndRow, column: 1 },
  };
}

function setActiveSheet(workbook: ExcelJS.Workbook, sheetName: string) {
  const activeIndex = workbook.worksheets.findIndex((ws) => ws.name === sheetName);
  if (activeIndex >= 0) {
    workbook.views = [{ activeTab: activeIndex }] as ExcelJS.WorkbookView[];
  }
}

function populateReembolsoSheet(
  workbook: ExcelJS.Workbook,
  header: FluxoCaixaHeader,
  rows: FluxoCaixaRow[],
  preserveLayout = false,
) {
  if (rows.length === 0) return;

  let sheet = workbook.getWorksheet(REEMBOLSO_SHEET);
  if (!sheet) {
    sheet = workbook.addWorksheet(REEMBOLSO_SHEET);
  }

  const plan = buildLayoutPlan('compact', rows.length);
  setupSecondaryFluxoSheetLayout(sheet, header, preserveLayout);
  if (preserveLayout) {
    prepareSheetDataArea(sheet, plan, 'compact');
  }
  fillDataBlock(sheet, rows, plan);
  fillSummaryRows(sheet, plan);
  fillSaldoFinal(sheet, plan);

  if (preserveLayout) {
    scrubResidualTemplateFormulas(sheet, plan.saldoFinalRow + 1);
  }

  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: plan.filterEndRow, column: 1 },
  };
}

async function populateWorkbook(
  workbook: ExcelJS.Workbook,
  layout: FluxoCaixaLayout,
  sheetName: string,
  header: FluxoCaixaHeader,
  rows: FluxoCaixaRow[],
  preserveLayout = false,
  cartao?: FluxoCaixaCartaoSection,
  reembolso?: FluxoCaixaReembolsoSection,
) {
  applyListSheet(workbook);
  registerNamedRanges(workbook);
  removeOtherFluxoSheets(
    workbook,
    sheetName,
    Boolean(cartao?.rows.length),
    Boolean(reembolso?.rows.length),
  );
  populateFluxoBancoSheet(workbook, layout, sheetName, header, rows, preserveLayout);
  if (cartao?.rows.length) {
    populateCartaoCreditoSheet(workbook, cartao.header, cartao.rows, preserveLayout);
  }
  if (reembolso?.rows.length) {
    populateReembolsoSheet(workbook, reembolso.header, reembolso.rows, preserveLayout);
  }
  setActiveSheet(workbook, sheetName);
}

export type FluxoCaixaCartaoSection = {
  header: FluxoCaixaHeader;
  rows: FluxoCaixaRow[];
};

export type FluxoCaixaReembolsoSection = {
  header: FluxoCaixaHeader;
  rows: FluxoCaixaRow[];
};

export type FluxoCaixaBancoSection = {
  layout: FluxoCaixaLayout;
  sheetName: string;
  header: FluxoCaixaHeader;
  rows: FluxoCaixaRow[];
};

export async function buildFluxoCaixaWorkbook(
  layout: FluxoCaixaLayout,
  header: FluxoCaixaHeader,
  rows: FluxoCaixaRow[],
  cartao?: FluxoCaixaCartaoSection,
  reembolso?: FluxoCaixaReembolsoSection,
  sheetName?: string,
): Promise<Buffer> {
  const resolvedSheetName = (sheetName ?? `Fluxo de caixa_${header.banco}`).slice(0, 31);
  const workbook = new ExcelJS.Workbook();
  let preserveLayout = false;

  try {
    await workbook.xlsx.readFile(MODELO_PATH);
    preserveLayout = true;
  } catch {
    // modelo ausente — workbook vazio com fallback programático
  }

  await populateWorkbook(workbook, layout, resolvedSheetName, header, rows, preserveLayout, cartao, reembolso);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Planilha com uma aba por perfil de banco configurado no sistema. */
export async function buildFluxoCaixaConsolidadoWorkbook(
  sections: FluxoCaixaBancoSection[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  let preserveLayout = false;

  try {
    await workbook.xlsx.readFile(MODELO_PATH);
    preserveLayout = true;
  } catch {
    // modelo ausente — workbook vazio com fallback programático
  }

  applyListSheet(workbook);
  registerNamedRanges(workbook);

  const layoutsInUse = new Set<FluxoCaixaLayout>(['compact']);
  for (const [layout, templateName] of Object.entries(FLUXO_CAIXA_TEMPLATE_SHEETS)) {
    if (layoutsInUse.has(layout as FluxoCaixaLayout)) continue;
    const sheet = workbook.getWorksheet(templateName);
    if (sheet) workbook.removeWorksheet(sheet.id);
  }

  const usedTemplateSheets = new Set<string>();
  const assignedNames = new Set<string>();
  const sheetNames = new Set<string>();

  for (const section of sections) {
    const actualSheetName = populateFluxoBancoSheet(
      workbook,
      'compact',
      section.sheetName,
      section.header,
      section.rows,
      preserveLayout,
      usedTemplateSheets,
      assignedNames,
    );
    sheetNames.add(actualSheetName);
  }

  removeUnusedTemplateSheets(workbook, sheetNames);
  removeUnusedSecondarySheets(workbook, false, false);

  const firstSheet = sections[0] ? [...sheetNames][0] : 'Fluxo de caixa';
  setActiveSheet(workbook, firstSheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
