import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildFluxoCaixaWorkbook, buildFluxoCaixaConsolidadoWorkbook } from './fluxo-caixa.export';
import { CARTAO_CREDITO_SHEET } from './fluxo-caixa-lista';

describe('fluxo-caixa.export', () => {
  it('gera planilha com aba Lista, validações e totais', async () => {
    const buffer = await buildFluxoCaixaWorkbook('nubank', {
      empresaNome: 'ANA LUISA RICCI BARDI CALADO NECA',
      empresaCnpj: '39.803.761/0001-17',
      banco: 'NUBANK',
      contaCorrente: '',
      saldoInicial: 1000,
    }, [
      {
        data: new Date('2026-06-01'),
        tipo: 'Entrada',
        categoria: 'Recebimento',
        numeroDocumento: '100',
        clienteFornecedor: 'Cliente A',
        historico: 'NF 100',
        valor: 500,
      },
      {
        data: new Date('2026-06-02'),
        tipo: 'Saída',
        categoria: 'Tarifa Bancária',
        numeroDocumento: '',
        clienteFornecedor: '',
        historico: 'Tarifa',
        valor: 10,
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const lista = workbook.getWorksheet('Lista');
    expect(lista?.getCell('A1').value).toBe('Entrada');
    expect(lista?.getCell('B1').value).toBe('Recebimento');

    const sheet = workbook.getWorksheet('Fluxo de caixa_Nubank');
    expect(sheet?.getCell('B3').value).toContain('ANA LUISA');
    expect(sheet?.getCell('H5').value).toBe(1000);
    expect(sheet?.getCell('B8').value).toBe('Entrada');
    expect(sheet?.getCell('G8').value).toBe(500);

    const saldo8 = sheet?.getCell('H8').value as { formula?: string };
    expect(saldo8.formula).toBe('H5-G8');

    const entradas = sheet?.getCell('G42').value as { formula?: string };
    expect(entradas.formula).toContain('SUMIF');
    expect(entradas.formula).toContain('Entrada');

    const saldoFinal = sheet?.getCell('H44').value as { formula?: string };
    expect(saldoFinal.formula).toMatch(/^H\d+$/);

    const entradasLabel = sheet?.getCell('F42').value;
    expect(entradasLabel).toBe('Total Entradas');
    const saidasLabel = sheet?.getCell('F43').value;
    expect(saidasLabel).toBe('Total Saídas');
  });

  it('gera planilha consolidada com abas de todos os bancos', async () => {
    const buffer = await buildFluxoCaixaConsolidadoWorkbook([
      {
        banco: 'nubank',
        header: {
          empresaNome: 'EMPRESA NUBANK',
          empresaCnpj: '00.000.000/0001-00',
          banco: 'NUBANK',
          contaCorrente: '',
          saldoInicial: 100,
        },
        rows: [
          {
            data: new Date('2026-06-01'),
            tipo: 'Entrada',
            categoria: 'Recebimento',
            numeroDocumento: '1',
            clienteFornecedor: 'Cliente',
            historico: 'NF 1',
            valor: 200,
          },
        ],
      },
      {
        banco: 'asaas',
        header: {
          empresaNome: 'EMPRESA ASAAS',
          empresaCnpj: '00.000.000/0001-00',
          banco: 'ASAAS',
          contaCorrente: '123',
          saldoInicial: 50,
        },
        rows: [
          {
            data: new Date('2026-06-02'),
            tipo: 'Saída',
            categoria: 'Tarifa Bancária',
            numeroDocumento: '',
            clienteFornecedor: '',
            historico: 'Tarifa',
            valor: 5,
          },
        ],
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.getWorksheet('Fluxo de caixa_Nubank')?.getCell('B3').value).toContain('EMPRESA NUBANK');
    expect(workbook.getWorksheet('Fluxo de caixa_ASAAS')?.getCell('B3').value).toContain('EMPRESA ASAAS');
    expect(workbook.getWorksheet('Lista')?.getCell('A1').value).toBe('Entrada');
    expect(workbook.getWorksheet('Cartão de Crédito')).toBeDefined();
  });

  it('preenche aba Cartão de Crédito quando houver lançamentos', async () => {
    const buffer = await buildFluxoCaixaWorkbook(
      'nubank',
      {
        empresaNome: 'EMPRESA',
        empresaCnpj: '00.000.000/0001-00',
        banco: 'NUBANK',
        contaCorrente: '',
        saldoInicial: 0,
      },
      [],
      {
        header: {
          empresaNome: 'EMPRESA',
          empresaCnpj: '00.000.000/0001-00',
          banco: 'NUBANK',
          contaCorrente: '',
          saldoInicial: 0,
        },
        rows: [
          {
            data: new Date('2026-05-02'),
            tipo: 'Saída',
            categoria: 'Despesas Diversas',
            numeroDocumento: '',
            clienteFornecedor: 'Google',
            historico: 'Google Workspace',
            valor: 163.6,
          },
        ],
      },
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const cartao = workbook.getWorksheet(CARTAO_CREDITO_SHEET);
    expect(cartao?.getCell('C5').value).toBe('Cartão de crédito');
    expect(cartao?.getCell('G8').value).toBe(163.6);
  });

  it('coloca totais e saldo final sempre após o último lançamento', async () => {
    const rows = Array.from({ length: 62 }, (_, index) => ({
      data: new Date(`2026-06-${String((index % 28) + 1).padStart(2, '0')}`),
      tipo: 'Saída' as const,
      categoria: 'Tarifa Bancária',
      numeroDocumento: '',
      clienteFornecedor: '',
      historico: `Tarifa ${index + 1}`,
      valor: 1,
    }));

    const buffer = await buildFluxoCaixaWorkbook(
      'asaas',
      {
        empresaNome: 'EMPRESA',
        empresaCnpj: '00.000.000/0001-00',
        banco: 'ASAAS',
        contaCorrente: '',
        saldoInicial: 0,
      },
      rows,
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('Fluxo de caixa_ASAAS');

    const lastDataRow = 8 + 62 - 1;
    expect(sheet?.getCell(lastDataRow, 6).value).toContain('Tarifa 62');
    expect(sheet?.getCell(lastDataRow + 1, 6).value).toBe('Total Entradas');
    expect(sheet?.getCell(lastDataRow + 2, 6).value).toBe('Total Saídas');
    expect(sheet?.getCell(lastDataRow + 3, 1).value).toBe('Saldo Final do Extrato Bancário');
    const totalFill = sheet?.getCell(lastDataRow + 1, 6).fill;
    const fgColor =
      totalFill && "fgColor" in totalFill ? totalFill.fgColor?.argb : undefined;
    expect(fgColor).toBe("FF000000");
  });
});
