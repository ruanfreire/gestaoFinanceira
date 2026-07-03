#!/usr/bin/env node
import ExcelJS from 'exceljs';
import { existsSync } from 'node:fs';

const file = process.argv[2];
if (!file || !existsSync(file)) {
  console.error('Uso: node analyze-fluxo-xlsx.mjs <caminho.xlsx>');
  process.exit(1);
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);

console.log('Arquivo:', file);
console.log('Abas:', wb.worksheets.map((s) => s.name).join(' | '));

for (const sheet of wb.worksheets) {
  const rows = [];
  for (let r = 8; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const data = row.getCell(1).value;
    const tipo = row.getCell(2).value;
    const categoria = row.getCell(3).value;
    const doc = row.getCell(4).value;
    const cliente = row.getCell(5).value;
    const hist = String(row.getCell(6).value || '');
    const valor = row.getCell(7).value;
    const saldo = row.getCell(8).value;
    if (!tipo && !hist && valor == null) continue;
    if (String(tipo).includes('Saldo') || String(hist).includes('Saldo final')) continue;
    rows.push({
      r,
      data,
      tipo,
      categoria,
      doc: doc != null ? String(doc) : '',
      cliente: String(cliente || '').slice(0, 40),
      hist: hist.slice(0, 90),
      valor: typeof valor === 'number' ? valor : Number(valor) || 0,
      saldo: typeof saldo === 'number' ? saldo : null,
    });
  }

  const entradas = rows.filter((x) => x.tipo === 'Entrada');
  const saidas = rows.filter((x) => x.tipo === 'Saída');
  const taxasComoEntrada = rows.filter(
    (x) => x.tipo === 'Entrada' && /taxa|tarifa|mensageria/i.test(x.hist),
  );
  const taxasComoSaida = rows.filter((x) => x.tipo === 'Saída' && /taxa|tarifa|mensageria/i.test(x.hist));
  const cobrancas = rows.filter((x) => /cobran/i.test(x.hist));
  const semDoc = cobrancas.filter((x) => !x.doc);
  const comDoc = rows.filter((x) => x.doc);

  console.log('\n=== ' + sheet.name + ' ===');
  console.log('Linhas:', rows.length, '| Entradas:', entradas.length, '| Saídas:', saidas.length);
  console.log('Cobranças:', cobrancas.length, '| Com NF:', comDoc.length, '| Cobrança sem NF:', semDoc.length);
  console.log('Taxas como Entrada (erro):', taxasComoEntrada.length);
  console.log('Taxas como Saída (ok):', taxasComoSaida.length);

  const saldoIssues = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const cur = rows[i];
    if (prev.saldo == null || cur.saldo == null) continue;
    const expected = prev.saldo + (cur.tipo === 'Entrada' ? cur.valor : -cur.valor);
    if (Math.abs(expected - cur.saldo) > 0.02) {
      saldoIssues.push({
        row: cur.r,
        expected: +expected.toFixed(2),
        actual: cur.saldo,
        tipo: cur.tipo,
        valor: cur.valor,
        hist: cur.hist.slice(0, 60),
      });
    }
  }
  console.log('Saldo inconsistente:', saldoIssues.length);
  for (const s of saldoIssues.slice(0, 10)) console.log(' ', JSON.stringify(s));

  if (taxasComoEntrada.length) {
    console.log('\n-- Taxas erradas (Entrada) --');
    for (const t of taxasComoEntrada) console.log(' ', t.r, t.valor, t.hist);
  }

  const docs = [...new Set(comDoc.map((x) => x.doc))].sort((a, b) => Number(a) - Number(b));
  console.log('\nNFs (' + docs.length + '):', docs.join(', '));

  const totalEntrada = entradas.reduce((s, x) => s + x.valor, 0);
  const totalSaida = saidas.reduce((s, x) => s + x.valor, 0);
  console.log('Total entradas: R$', totalEntrada.toFixed(2), '| Total saídas: R$', totalSaida.toFixed(2));

  if (sheet.name.includes('Fluxo')) {
    const h = sheet.getRow(2).getCell(1).value;
    const banco = sheet.getRow(4).getCell(2).value;
    console.log('Cabeçalho banco:', banco, '| empresa:', h);
    console.log('\n-- Todas entradas --');
    for (const x of entradas) console.log([x.data, x.doc || '-', x.valor, x.tipo, x.hist].join(' | '));
  }
}
