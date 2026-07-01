import path from 'node:path';
import ExcelJS from 'exceljs';
import type { FluxoCaixaBanco } from './fluxo-caixa.config';
import {
  CARTAO_CREDITO_SHEET,
  FLUXO_CAIXA_CATEGORIAS,
  FLUXO_CAIXA_SHEET_NAMES,
  FLUXO_CAIXA_TEMPLATE_ROWS,
  FLUXO_CAIXA_TIPOS,
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
const MIN_FORMULA_ROWS = 10;
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

function buildLayoutPlan(banco: FluxoCaixaBanco, rowCount: number): LayoutPlan {
  const templateDataRows = FLUXO_CAIXA_TEMPLATE_ROWS[banco] - SUMMARY_SLOT_ROWS;
  const dataRows = Math.max(rowCount, templateDataRows);
  const dataEndRow = DATA_START_ROW + dataRows - 1;
  const summaryStartRow = dataEndRow + 1;
  const saldoFinalRow = dataEndRow + SUMMARY_SLOT_ROWS + 1;
  const formulaEndRow = Math.min(
    DATA_START_ROW + Math.max(rowCount, MIN_FORMULA_ROWS) - 1,
    dataEndRow,
  );

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

function clearSheetRows(sheet: ExcelJS.Worksheet, fromRow: number, toRow: number) {
  for (let rowNum = fromRow; rowNum <= toRow; rowNum += 1) {
    const row = sheet.getRow(rowNum);
    for (let col = 1; col <= 8; col += 1) {
      const cell = row.getCell(col);
      cell.value = null;
      cell.style = {};
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
) {
  for (const name of Object.values(FLUXO_CAIXA_SHEET_NAMES)) {
    if (name === activeSheet) continue;
    const sheet = workbook.getWorksheet(name);
    if (sheet) workbook.removeWorksheet(sheet.id);
  }
  const extrasToRemove = keepCartaoCredito
    ? ['Reembolso de despesas']
    : [CARTAO_CREDITO_SHEET, 'Reembolso de despesas'];
  for (const extra of extrasToRemove) {
    const sheet = workbook.getWorksheet(extra);
    if (sheet) workbook.removeWorksheet(sheet.id);
  }
}

function setupFluxoSheetLayout(
  sheet: ExcelJS.Worksheet,
  header: FluxoCaixaHeader,
  preserveLayout = false,
) {
  if (!preserveLayout) {
    sheet.mergeCells('A1:H1');
    sheet.mergeCells('B3:H3');
  }
  sheet.getCell('A1').value = 'CONTROLE DE FLUXO DE CAIXA';

  if (!preserveLayout) {
    sheet.mergeCells('B3:H3');
  }
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

  const headers = [
    'Data',
    'Tipo',
    'Categoria/ Plano de contas',
    'Nº Documento / NF',
    'Cliente / Fornecedor',
    'Histórico',
    'Valor',
    'Saldo Banco',
  ];
  headers.forEach((text, index) => {
    sheet.getRow(HEADER_ROW).getCell(index + 1).value = text;
  });

  sheet.columns = [
    { width: 13.29 },
    { width: 10.86 },
    { width: 19.86 },
    { width: 17 },
    { width: 60 },
    { width: 22.57 },
    { width: 14.86 },
    { width: 11.43 },
  ];
}

function setupCartaoCreditoSheetLayout(
  sheet: ExcelJS.Worksheet,
  header: FluxoCaixaHeader,
  preserveLayout = false,
) {
  if (!preserveLayout) {
    sheet.mergeCells('A1:H1');
    sheet.mergeCells('B3:H3');
  }
  sheet.getCell('A1').value = 'CONTROLE DE FLUXO DE CAIXA';
  sheet.getCell('A3').value = 'Empresa:';
  sheet.getCell('B3').value = header.empresaNome;
  sheet.getCell('A4').value = 'CNPJ ';
  sheet.getCell('B4').value = header.empresaCnpj;
  sheet.getCell('A5').value = 'Banco:';
  sheet.getCell('B5').value = header.banco;
  sheet.getCell('C5').value = 'Cartão de crédito';
  sheet.getCell('G5').value = 'Saldo Inicial:';

  const saldoInicialCell = sheet.getCell('H5');
  saldoInicialCell.value = header.saldoInicial;
  saldoInicialCell.numFmt = CURRENCY_FMT;

  const headers = [
    'Data',
    'Tipo',
    'Categoria/ Plano de contas',
    'Nº Documento / NF',
    'Cliente / Fornecedor',
    'Histórico',
    'Valor',
    'Saldo Banco',
  ];
  headers.forEach((text, index) => {
    sheet.getRow(HEADER_ROW).getCell(index + 1).value = text;
  });

  sheet.columns = [
    { width: 13.29 },
    { width: 10.86 },
    { width: 19.86 },
    { width: 17 },
    { width: 60 },
    { width: 22.57 },
    { width: 14.86 },
    { width: 11.43 },
  ];
}

function fillDataBlock(
  sheet: ExcelJS.Worksheet,
  banco: FluxoCaixaBanco,
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
      saldoCell.value = { formula: buildSaldoBancoFormula(banco, excelRow, prevFormulaRow) };
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
  const dataEndRow = plan.dataEndRow;

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
  saldoFinalCell.value = { formula: `H${plan.formulaEndRow}` };
  saldoFinalCell.numFmt = CURRENCY_FMT;
  applyFooterRowStyle(sheet, plan.saldoFinalRow);
}

function prepareSheetDataArea(
  sheet: ExcelJS.Worksheet,
  plan: LayoutPlan,
  banco: FluxoCaixaBanco,
) {
  const templateEnd = DATA_START_ROW + FLUXO_CAIXA_TEMPLATE_ROWS[banco] + SUMMARY_SLOT_ROWS;
  const clearUntil = Math.max(plan.saldoFinalRow, templateEnd);
  clearSheetRows(sheet, DATA_START_ROW, clearUntil);
}

async function populateFluxoBancoSheet(
  workbook: ExcelJS.Workbook,
  banco: FluxoCaixaBanco,
  header: FluxoCaixaHeader,
  rows: FluxoCaixaRow[],
  preserveLayout = false,
) {
  const sheetName = FLUXO_CAIXA_SHEET_NAMES[banco];
  let sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    sheet = workbook.addWorksheet(sheetName);
  }

  const plan = buildLayoutPlan(banco, rows.length);
  setupFluxoSheetLayout(sheet, header, preserveLayout);
  if (preserveLayout) {
    prepareSheetDataArea(sheet, plan, banco);
  }
  fillDataBlock(sheet, banco, rows, plan);
  fillSummaryRows(sheet, plan);
  fillSaldoFinal(sheet, plan);

  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: plan.filterEndRow, column: 1 },
  };
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

  const plan = buildLayoutPlan('nubank', rows.length);
  setupCartaoCreditoSheetLayout(sheet, header, preserveLayout);
  if (preserveLayout) {
    prepareSheetDataArea(sheet, plan, 'nubank');
  }
  fillDataBlock(sheet, 'nubank', rows, plan);
  fillSummaryRows(sheet, plan);
  fillSaldoFinal(sheet, plan);

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

async function populateWorkbook(
  workbook: ExcelJS.Workbook,
  banco: FluxoCaixaBanco,
  header: FluxoCaixaHeader,
  rows: FluxoCaixaRow[],
  preserveLayout = false,
  cartao?: FluxoCaixaCartaoSection,
) {
  applyListSheet(workbook);
  registerNamedRanges(workbook);
  removeOtherFluxoSheets(
    workbook,
    FLUXO_CAIXA_SHEET_NAMES[banco],
    Boolean(cartao?.rows.length),
  );
  populateFluxoBancoSheet(workbook, banco, header, rows, preserveLayout);
  if (cartao?.rows.length) {
    populateCartaoCreditoSheet(workbook, cartao.header, cartao.rows, preserveLayout);
  }
  setActiveSheet(workbook, FLUXO_CAIXA_SHEET_NAMES[banco]);
}

export type FluxoCaixaCartaoSection = {
  header: FluxoCaixaHeader;
  rows: FluxoCaixaRow[];
};

export async function buildFluxoCaixaWorkbook(
  banco: FluxoCaixaBanco,
  header: FluxoCaixaHeader,
  rows: FluxoCaixaRow[],
  cartao?: FluxoCaixaCartaoSection,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  let preserveLayout = false;

  try {
    await workbook.xlsx.readFile(MODELO_PATH);
    preserveLayout = true;
  } catch {
    // modelo ausente — workbook vazio com fallback programático
  }

  await populateWorkbook(workbook, banco, header, rows, preserveLayout, cartao);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export type FluxoCaixaBancoSection = {
  banco: FluxoCaixaBanco;
  header: FluxoCaixaHeader;
  rows: FluxoCaixaRow[];
};

/** Planilha com abas de todos os bancos (modelo Ana Luisa completo). */
export async function buildFluxoCaixaConsolidadoWorkbook(
  sections: FluxoCaixaBancoSection[],
  cartao?: FluxoCaixaCartaoSection,
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

  for (const section of sections) {
    populateFluxoBancoSheet(workbook, section.banco, section.header, section.rows, preserveLayout);
  }

  if (cartao?.rows.length) {
    populateCartaoCreditoSheet(workbook, cartao.header, cartao.rows, preserveLayout);
  }

  const firstSheet = sections[0]
    ? FLUXO_CAIXA_SHEET_NAMES[sections[0].banco]
    : FLUXO_CAIXA_SHEET_NAMES.nubank;
  setActiveSheet(workbook, firstSheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
