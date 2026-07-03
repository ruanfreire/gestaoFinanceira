import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildFluxoCaixaWorkbook, buildFluxoCaixaConsolidadoWorkbook } from './fluxo-caixa.export';
import { CARTAO_CREDITO_SHEET, REEMBOLSO_SHEET } from './fluxo-caixa-lista';

describe('fluxo-caixa.export', () => {
  it('gera planilha com aba Lista, validações e totais', async () => {
    const buffer = await buildFluxoCaixaWorkbook('compact', {
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

    const sheet = workbook.getWorksheet('Fluxo de caixa_NUBANK');
    expect(sheet?.getCell('B3').value).toContain('ANA LUISA');
    expect(sheet?.getCell('H5').value).toBe(1000);
    expect(sheet?.getCell('B8').value).toBe('Entrada');
    expect(sheet?.getCell('G8').value).toBe(500);

    const saldo8 = sheet?.getCell('H8').value as { formula?: string };
    expect(saldo8.formula).toBe('H5+IF(B8="Entrada";G8;-G8)');

    const saldo9 = sheet?.getCell('H9').value as { formula?: string };
    expect(saldo9.formula).toBe('H8+IF(B9="Entrada";G9;-G9)');

    const entradas = sheet?.getCell('G42').value as { formula?: string };
    expect(entradas.formula).toContain('SUMIF');
    expect(entradas.formula).toContain('Entrada');
    expect(entradas.formula).toContain('B8:B9');

    const saldoFinal = sheet?.getCell('H44').value as { formula?: string };
    expect(saldoFinal.formula).toBe('H5+G42-G43');

    expect(sheet?.getCell('H10').value).toBeNull();
    expect(sheet?.getCell('H11').value).toBeNull();

    const entradasLabel = sheet?.getCell('F42').value;
    expect(entradasLabel).toBe('Total Entradas');
    const saidasLabel = sheet?.getCell('F43').value;
    expect(saidasLabel).toBe('Total Saídas');
  });

  it('gera planilha consolidada com abas de todos os bancos', async () => {
    const buffer = await buildFluxoCaixaConsolidadoWorkbook([
      {
        layout: 'compact',
        sheetName: 'Fluxo de caixa_Nubank',
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
        layout: 'wide',
        sheetName: 'Fluxo de caixa_ASAAS',
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

    const nubank = workbook.worksheets.find((sheet) =>
      String(sheet.getCell('B3').value ?? '').includes('EMPRESA NUBANK'),
    );
    const asaas = workbook.worksheets.find((sheet) =>
      String(sheet.getCell('B3').value ?? '').includes('EMPRESA ASAAS'),
    );
    expect(nubank).toBeDefined();
    expect(asaas).toBeDefined();
    expect(workbook.getWorksheet('Lista')?.getCell('A1').value).toBe('Entrada');
    expect(workbook.getWorksheet('Cartão de Crédito')).toBeUndefined();
  });

  it('consolidado com abas de mesmo nome não quebra sem modelo Excel', async () => {
    const row = {
      data: new Date('2026-06-01'),
      tipo: 'Entrada' as const,
      categoria: 'Recebimento',
      numeroDocumento: '1',
      clienteFornecedor: 'Cliente',
      historico: 'NF 1',
      valor: 200,
    };

    const buffer = await buildFluxoCaixaConsolidadoWorkbook([
      {
        layout: 'compact',
        sheetName: 'Fluxo de caixa_Nubank',
        header: {
          empresaNome: 'EMPRESA A',
          empresaCnpj: '00.000.000/0001-00',
          banco: 'NUBANK',
          contaCorrente: '',
          saldoInicial: 100,
        },
        rows: [row],
      },
      {
        layout: 'compact',
        sheetName: 'Fluxo de caixa_Nubank',
        header: {
          empresaNome: 'EMPRESA B',
          empresaCnpj: '00.000.000/0001-00',
          banco: 'NUBANK 2',
          contaCorrente: '',
          saldoInicial: 50,
        },
        rows: [row],
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const fluxoSheets = workbook.worksheets.filter((sheet) => sheet.name.startsWith('Fluxo de caixa_Nubank'));
    expect(fluxoSheets.length).toBe(2);
    const empresaB = fluxoSheets.find((sheet) => String(sheet.getCell('B3').value ?? '').includes('EMPRESA B'));
    expect(empresaB).toBeDefined();
  });

  it('consolidado com dois perfis Asaas não quebra (colisão de nome)', async () => {
    const row = {
      data: new Date('2026-06-01'),
      tipo: 'Entrada' as const,
      categoria: 'Recebimento',
      numeroDocumento: '1',
      clienteFornecedor: 'Cliente',
      historico: 'NF 1',
      valor: 200,
    };

    const buffer = await buildFluxoCaixaConsolidadoWorkbook([
      {
        layout: 'wide',
        sheetName: 'Fluxo de caixa_ASAAS',
        header: {
          empresaNome: 'EMPRESA A',
          empresaCnpj: '00.000.000/0001-00',
          banco: 'ASAAS',
          contaCorrente: '',
          saldoInicial: 100,
        },
        rows: [row],
      },
      {
        layout: 'wide',
        sheetName: 'Fluxo de caixa_Asaas',
        header: {
          empresaNome: 'EMPRESA B',
          empresaCnpj: '00.000.000/0001-00',
          banco: 'Asaas',
          contaCorrente: '',
          saldoInicial: 50,
        },
        rows: [row],
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.worksheets.filter((sheet) => sheet.name.toLowerCase().startsWith('fluxo de caixa_asaas')).length)
      .toBe(2);
  });

  it('consolidado cria aba por perfil sem aba genérica de cartão', async () => {
    const row = {
      data: new Date('2026-05-02'),
      tipo: 'Saída' as const,
      categoria: 'Cartão de crédito',
      numeroDocumento: '',
      clienteFornecedor: '',
      historico: 'Google Workspace',
      valor: 163.6,
    };

    const buffer = await buildFluxoCaixaConsolidadoWorkbook([
      {
        layout: 'compact',
        sheetName: 'Fluxo de caixa_Nubank Cartão',
        header: {
          empresaNome: 'EMPRESA',
          empresaCnpj: '00.000.000/0001-00',
          banco: 'Nubank Cartão de Crédito',
          contaCorrente: '',
          saldoInicial: 0,
        },
        rows: [row],
      },
      {
        layout: 'compact',
        sheetName: 'Fluxo de caixa_Nubank Fatura',
        header: {
          empresaNome: 'EMPRESA',
          empresaCnpj: '00.000.000/0001-00',
          banco: 'Nubank Fatura',
          contaCorrente: '',
          saldoInicial: 0,
        },
        rows: [row],
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.getWorksheet('Cartão de Crédito')).toBeUndefined();
    expect(workbook.worksheets.some((s) => s.name.startsWith('Fluxo de caixa_Nubank'))).toBe(true);
    expect(workbook.worksheets.filter((s) => s.name.startsWith('Fluxo de caixa_')).length).toBe(2);
  });

  it('usa o nome do perfil na aba (ex.: Bradesco)', async () => {
    const buffer = await buildFluxoCaixaWorkbook(
      'compact',
      {
        empresaNome: 'Minha Empresa',
        empresaCnpj: '00.000.000/0001-00',
        banco: 'Bradesco',
        contaCorrente: '12345-6',
        saldoInicial: 500,
      },
      [
        {
          data: new Date('2026-06-01'),
          tipo: 'Entrada',
          categoria: 'Recebimento',
          numeroDocumento: '10',
          clienteFornecedor: 'Cliente',
          historico: 'NF 10',
          valor: 100,
        },
      ],
      undefined,
      undefined,
      'Fluxo de caixa_Bradesco',
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet('Fluxo de caixa_Bradesco');
    expect(sheet).toBeDefined();
    expect(sheet?.getCell('B5').value).toBe('Bradesco');
    expect(workbook.getWorksheet('Fluxo de caixa_Nubank')).toBeUndefined();
  });

  it('preenche aba Cartão de Crédito quando houver lançamentos', async () => {
    const buffer = await buildFluxoCaixaWorkbook(
      'compact',
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
    expect(cartao?.getCell('C5').value).toBe('Conta Corrente:');
    expect(cartao?.getCell('G8').value).toBe(163.6);
  });

  it('preenche aba Reembolso de despesas quando houver lançamentos', async () => {
    const buffer = await buildFluxoCaixaWorkbook(
      'wide',
      {
        empresaNome: 'EMPRESA',
        empresaCnpj: '00.000.000/0001-00',
        banco: 'ASAAS',
        contaCorrente: '',
        saldoInicial: 0,
      },
      [
        {
          data: new Date('2026-06-01'),
          tipo: 'Entrada',
          categoria: 'Recebimento',
          numeroDocumento: '',
          clienteFornecedor: '',
          historico: 'Recebimento',
          valor: 100,
        },
      ],
      undefined,
      {
        header: {
          empresaNome: 'EMPRESA',
          empresaCnpj: '00.000.000/0001-00',
          banco: 'ASAAS',
          contaCorrente: '',
          saldoInicial: 0,
        },
        rows: [
          {
            data: new Date('2026-06-03'),
            tipo: 'Saída',
            categoria: 'Reembolso de Despesas',
            numeroDocumento: '',
            clienteFornecedor: 'Colaborador',
            historico: 'Reembolso viagem',
            valor: 45,
          },
        ],
      },
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const reembolso = workbook.getWorksheet(REEMBOLSO_SHEET);
    expect(reembolso?.getCell('C5').value).toBe('Conta Corrente:');
    expect(reembolso?.getCell('G8').value).toBe(45);
  });

  it('calcula saldo corrido e saldo final com entradas e saídas', async () => {
    const buffer = await buildFluxoCaixaWorkbook('compact', {
      empresaNome: 'EMPRESA',
      empresaCnpj: '00.000.000/0001-00',
      banco: 'NUBANK',
      contaCorrente: '',
      saldoInicial: 1000,
    }, [
      {
        data: new Date('2026-06-01'),
        tipo: 'Entrada',
        categoria: 'Recebimento',
        numeroDocumento: '',
        clienteFornecedor: '',
        historico: 'Recebimento',
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
      {
        data: new Date('2026-06-03'),
        tipo: 'Entrada',
        categoria: 'Recebimento',
        numeroDocumento: '',
        clienteFornecedor: '',
        historico: 'Pix',
        valor: 200,
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets.find((ws) => ws.getCell('H5').value === 1000);
    expect(sheet).toBeDefined();

    const saidas = sheet?.getCell('G43').value as { formula?: string };
    expect(saidas.formula).toBe('SUMIF(B8:B10;"Saída";G8:G10)');

    const saldoFinal = sheet?.getCell('H44').value as { formula?: string };
    expect(saldoFinal.formula).toBe('H5+G42-G43');
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
      'wide',
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
    const sheet = workbook.worksheets.find((ws) =>
      String(ws.getCell(8, 6).value ?? '').includes('Tarifa 1'),
    );
    expect(sheet).toBeDefined();

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
