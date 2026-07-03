#!/usr/bin/env node
/**
 * Diagnóstico de notas + extrato bancário para exportação de fluxo de caixa.
 * Uso: node scripts/diagnose-fluxo-tenant.mjs --email ruanomaker@gmail.com --mes 2026-06
 */
import mongoose from 'mongoose';

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const email = arg('--email', 'ruanomaker@gmail.com').toLowerCase();
const mes = arg('--mes', '2026-06');
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finance';

const [year, month] = mes.split('-').map(Number);
const lastDay = new Date(year, month, 0).getDate();
const from = `${year}-${String(month).padStart(2, '0')}-01`;
const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
const fromDate = new Date(`${from}T00:00:00.000Z`);
const toDate = new Date(`${to}T23:59:59.999Z`);

const OUTGOING_TX = /\btransfer[eê]ncia\s+enviad|\btaxa\b|\btarifa\b|mensageria|\bsaque\b|\bpagamento\s+de\s+conta/i;
const INCOMING_TX = /\bcobran[cç]a\s+recebid|\bpix\s+recebid|\btransfer[eê]ncia\s+recebid/i;
const FEE_DESC = /^taxa\s+(?:de|do)\b|^tarifa\b|mensageria|taxa\s+asaas/i;
const COBRANCA_DESC = /\bcobran[cç]a\s+recebid[oa]\b/i;

function mesFromData(data) {
  if (!data) return undefined;
  const parsed = new Date(data);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}`;
}

function looksWrongTipo(l) {
  const desc = String(l.descricao || '');
  const tipoTx = String(l.tipo_transacao || '');
  const valor = Number(l.valor || 0);
  const stored = l.tipo_movimento;
  let expected = stored;
  if (tipoTx && OUTGOING_TX.test(tipoTx)) expected = 'saida';
  else if (tipoTx && INCOMING_TX.test(tipoTx)) expected = 'entrada';
  else if (FEE_DESC.test(desc) || OUTGOING_TX.test(desc)) expected = 'saida';
  else if (COBRANCA_DESC.test(desc)) expected = 'entrada';
  else expected = valor >= 0 ? 'entrada' : 'saida';
  return stored && expected !== stored ? { stored, expected, desc: desc.slice(0, 80), tipoTx } : null;
}

await mongoose.connect(mongoUri);
const db = mongoose.connection.db;

const user = await db.collection('users').findOne({ email });
if (!user) {
  console.error('Usuário não encontrado:', email);
  process.exit(1);
}

const tid = user.tenantId;
const org = tid ? await db.collection('organizations').findOne({ _id: tid }) : null;

const notaFilterComp = { tenantId: tid, mes_competencia: mes };
const notaFilterEmissao = { tenantId: tid, data_emissao: { $gte: fromDate, $lte: toDate } };

const [
  totalNotas,
  notasCompetencia,
  notasEmissao,
  notasSemCompetencia,
  notasOrfasMes,
  notasCompetenciaList,
] = await Promise.all([
  db.collection('notas').countDocuments({ tenantId: tid }),
  db.collection('notas').countDocuments(notaFilterComp),
  db.collection('notas').countDocuments(notaFilterEmissao),
  db.collection('notas').countDocuments({
    tenantId: tid,
    $or: [{ mes_competencia: { $exists: false } }, { mes_competencia: '' }, { mes_competencia: null }],
    data_emissao: { $gte: fromDate, $lte: toDate },
  }),
  db.collection('notas').countDocuments({
    $or: [{ tenantId: null }, { tenantId: { $exists: false } }],
    mes_competencia: mes,
  }),
  db
    .collection('notas')
    .find(notaFilterComp)
    .project({ numero: 1, tomador: 1, valor: 1, status_pagamento: 1, mes_competencia: 1, data_emissao: 1 })
    .sort({ numero: 1 })
    .toArray(),
]);

const profiles = await db
  .collection('importprofiles')
  .find({ tenantId: tid, status: { $ne: 'archived' } })
  .project({ name: 1, banco_label: 1, system_key: 1, 'mapping.tipo_movimento_rule': 1 })
  .toArray();

const profileIds = profiles.map((p) => p._id);

const lancamentosJunho = await db
  .collection('banklancamentos')
  .find({
    tenantId: tid,
    data: { $gte: fromDate, $lte: toDate },
    ...(profileIds.length ? { profile_id: { $in: profileIds } } : {}),
  })
  .project({
    data: 1,
    descricao: 1,
    valor: 1,
    tipo_movimento: 1,
    tipo_transacao: 1,
    status_conciliacao: 1,
    nota_id: 1,
    pagador_nome: 1,
    profile_id: 1,
  })
  .sort({ data: 1 })
  .toArray();

const notaIdsComp = new Set(notasCompetenciaList.map((n) => String(n._id)));
const cobrancasRecebidas = lancamentosJunho.filter(
  (l) => COBRANCA_DESC.test(l.descricao || '') || INCOMING_TX.test(l.tipo_transacao || ''),
);
const cobrancasSemVinculo = cobrancasRecebidas.filter((l) => !l.nota_id);
const vinculadasCompetencia = lancamentosJunho.filter(
  (l) => l.nota_id && notaIdsComp.has(String(l.nota_id)),
);
const tipoErrado = lancamentosJunho.map(looksWrongTipo).filter(Boolean);
const taxas = lancamentosJunho.filter(
  (l) => FEE_DESC.test(l.descricao || '') || /\btaxa\b/i.test(l.tipo_transacao || ''),
);

const importsJunho = await db
  .collection('bankimportacaos')
  .find({
    tenantId: tid,
    $or: [{ periodo: mes }, { filename: new RegExp(mes) }, { originalName: new RegExp(mes) }],
  })
  .project({ filename: 1, originalName: 1, periodo: 1, banco_label: 1, stats: 1, createdAt: 1 })
  .sort({ createdAt: -1 })
  .toArray();

const honest = tid ? await db.collection('honestintegrations').findOne({ tenantId: tid }) : null;

const resumoFluxo = {
  lancamentosNoMesPagamento: lancamentosJunho.length,
  cobrancasRecebidas: cobrancasRecebidas.length,
  cobrancasSemVinculo: cobrancasSemVinculo.length,
  vinculadasNotasCompetencia: vinculadasCompetencia.length,
  taxasNoMes: taxas.length,
  tipoMovimentoSuspeito: tipoErrado.length,
  entradas: lancamentosJunho.filter((l) => l.tipo_movimento === 'entrada').length,
  saidas: lancamentosJunho.filter((l) => l.tipo_movimento === 'saida').length,
};

console.log(
  JSON.stringify(
    {
      email: user.email,
      tenantId: String(tid),
      org: org ? { slug: org.slug, name: org.name } : null,
      mes,
      notas: {
        total: totalNotas,
        competenciaMes: notasCompetencia,
        emitidasNoMes: notasEmissao,
        emitidasSemMesCompetencia: notasSemCompetencia,
        orfasNoMes: notasOrfasMes,
        numerosCompetencia: notasCompetenciaList.map((n) => n.numero),
        emAberto: notasCompetenciaList.filter((n) => n.status_pagamento === 'em_aberto' || !n.status_pagamento).length,
        pagas: notasCompetenciaList.filter((n) => n.status_pagamento === 'pago').length,
      },
      extrato: {
        importacoesJunho: importsJunho.length,
        perfis: profiles.map((p) => ({
          name: p.name,
          banco: p.banco_label,
          system_key: p.system_key,
          tipo_movimento_rule: p.mapping?.tipo_movimento_rule?.type,
        })),
        resumoFluxo,
        cobrancasSemVinculo: cobrancasSemVinculo.slice(0, 15).map((l) => ({
          data: l.data,
          valor: l.valor,
          pagador: l.pagador_nome,
          descricao: String(l.descricao || '').slice(0, 100),
          status: l.status_conciliacao,
        })),
        tipoMovimentoCorrigir: tipoErrado.slice(0, 15),
        ultimasImportacoes: importsJunho.slice(0, 5),
      },
      honest: honest
        ? {
            last_sync_at: honest.last_sync_at,
            last_sync_status: honest.last_sync_status,
            graphql_nota_count: honest.graphql_nota_count,
          }
        : null,
      recomendacoes: [],
    },
    null,
    2,
  ),
);

const recs = [];
if (notasCompetencia === 0 && notasEmissao > 0) {
  recs.push('Notas emitidas em junho sem mes_competencia — rode enrichNotasMetadata ou reimporte.');
}
if (notasOrfasMes > 0) {
  recs.push(`${notasOrfasMes} nota(s) órfã(s) (sem tenantId) com competência ${mes}.`);
}
if (importsJunho.length === 0) {
  recs.push('Nenhum extrato bancário importado para junho — fluxo de caixa depende do CSV Asaas.');
}
if (cobrancasSemVinculo.length > 0) {
  recs.push(
    `${cobrancasSemVinculo.length} cobrança(s) recebida(s) sem NF vinculada — confira em Recebimentos.`,
  );
}
if (tipoErrado.length > 0) {
  recs.push(
    `${tipoErrado.length} lançamento(s) com tipo_movimento errado no banco — exportação já reclassifica; reimportar extrato corrige o cadastro.`,
  );
}
if (notasCompetencia > 0 && vinculadasCompetencia.length === 0 && cobrancasRecebidas.length > 0) {
  recs.push('Há cobranças mas nenhuma vinculada às NFs de junho — vincule em Recebimentos para Nº Documento no Excel.');
}

const output = JSON.parse(
  JSON.stringify({
    recomendacoes: recs.length ? recs : ['Dados consistentes para exportar fluxo de caixa de ' + mes + '.'],
  }),
);
console.log('\n=== RECOMENDAÇÕES ===');
for (const r of output.recomendacoes) console.log('-', r);

await mongoose.disconnect();
