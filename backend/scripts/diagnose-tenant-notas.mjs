#!/usr/bin/env node
/**
 * Diagnóstico de notas por tenant e mês.
 * Uso: node scripts/diagnose-tenant-notas.mjs --email ruanomaker@gmail.com --mes 2026-06
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

await mongoose.connect(mongoUri);
const db = mongoose.connection.db;

const user = await db.collection('users').findOne({ email });
if (!user) {
  console.error('Usuário não encontrado:', email);
  process.exit(1);
}

const tid = user.tenantId;
const org = tid ? await db.collection('organizations').findOne({ _id: tid }) : null;

const total = await db.collection('notas').countDocuments({ tenantId: tid });
const juneComp = await db.collection('notas').countDocuments({ tenantId: tid, mes_competencia: mes });
const juneEmissao = await db.collection('notas').countDocuments({
  tenantId: tid,
  data_emissao: { $gte: new Date(`${from}T00:00:00.000Z`), $lte: new Date(`${to}T23:59:59.999Z`) },
});
const orphan = await db.collection('notas').countDocuments({
  $or: [{ tenantId: null }, { tenantId: { $exists: false } }],
});
const orphanMes = await db.collection('notas').countDocuments({
  $or: [{ tenantId: null }, { tenantId: { $exists: false } }],
  mes_competencia: mes,
});

const paidInJune = await db.collection('notas').countDocuments({
  tenantId: tid,
  $or: [
    { data_pagamento: { $gte: new Date(`${from}T00:00:00.000Z`), $lte: new Date(`${to}T23:59:59.999Z`) } },
    { pagamentos: { $elemMatch: { data: { $gte: new Date(`${from}T00:00:00.000Z`), $lte: new Date(`${to}T23:59:59.999Z`) } } } },
  ],
});

const honest = tid ? await db.collection('honestintegrations').findOne({ tenantId: tid }) : null;

const juneNotas = await db
  .collection('notas')
  .find({
    tenantId: tid,
    data_emissao: { $gte: new Date(`${from}T00:00:00.000Z`), $lte: new Date(`${to}T23:59:59.999Z`) },
  })
  .project({ numero: 1, tomador: 1, data_emissao: 1, mes_competencia: 1, valor: 1, status_pagamento: 1, nota_api_id: 1 })
  .sort({ data_emissao: 1, numero: 1 })
  .toArray();

const compMismatch = await db
  .collection('notas')
  .find({ tenantId: tid, mes_competencia: mes, data_emissao: { $lt: new Date(`${from}T00:00:00.000Z`) } })
  .project({ numero: 1, data_emissao: 1, mes_competencia: 1 })
  .toArray();

const emAbertoJune = juneNotas.filter((n) => n.status_pagamento === 'em_aberto' || !n.status_pagamento).length;

const importHonest = await db
  .collection('importacaos')
  .find({ tenantId: tid, source: { $in: ['honest_manual', 'honest_worker'] } })
  .sort({ createdAt: -1 })
  .limit(5)
  .project({ createdAt: 1, status: 1, source: 1, stats: 1, label: 1 })
  .toArray();

console.log(
  JSON.stringify(
    {
      email: user.email,
      tenantId: String(tid),
      org: org ? { slug: org.slug, name: org.name, cnpj: org.cnpj } : null,
      mes,
      totalNotas: total,
      porMesCompetencia: juneComp,
      porDataEmissao: juneEmissao,
      comPagamentoNoMes: paidInJune,
      emAbertoEmitidasEmJunho: emAbertoJune,
      competenciaMismatch: compMismatch,
      numerosEmitidosEmJunho: juneNotas.map((n) => n.numero),
      notasOrfasTotal: orphan,
      notasOrfasNoMes: orphanMes,
      honest: honest
        ? {
            last_sync_at: honest.last_sync_at,
            last_sync_status: honest.last_sync_status,
            last_sync_stats: honest.last_sync_stats,
            graphql_nota_count: honest.graphql_nota_count,
          }
        : null,
      ultimasImportacoesHonest: importHonest,
    },
    null,
    2,
  ),
);

await mongoose.disconnect();
