import ExcelJS from 'exceljs';

const path = process.argv[2];
if (!path) {
  console.error('usage: npx tsx scripts/inspect-xlsx.mts <file>');
  process.exit(1);
}

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(path);

console.log('SHEETS:', workbook.worksheets.map((sheet) => sheet.name));

for (const sheet of workbook.worksheets) {
  console.log(`\n=== ${sheet.name} ===`);
  console.log('B3 empresa:', sheet.getCell('B3').value);
  console.log('B5 banco:', sheet.getCell('B5').value);
  console.log('H5 saldo:', sheet.getCell('H5').value);

  let filled = 0;
  for (let row = 8; row <= 90; row += 1) {
    const historico = sheet.getRow(row).getCell(6).value;
    const valor = sheet.getRow(row).getCell(7).value;
    if (!historico && (valor === null || valor === undefined || valor === '')) continue;
    filled += 1;
    if (filled <= 10) {
      console.log(
        `R${row}`,
        sheet.getRow(row).getCell(1).value,
        sheet.getRow(row).getCell(2).value,
        sheet.getRow(row).getCell(3).value,
        historico,
        valor,
      );
    }
  }
  console.log('filled rows 8-90:', filled);
  console.log('F42/F43/F44:', sheet.getCell('F42').value, sheet.getCell('F43').value, sheet.getCell('F44').value);
}
