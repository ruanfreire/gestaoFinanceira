#!/usr/bin/env node
import mongoose from 'mongoose';

const email = 'ruanomaker@gmail.com';
const mes = '2026-06';
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finance';
const [year, month] = mes.split('-').map(Number);
const fromDate = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`);
const toDate = new Date(`${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}T23:59:59.999Z`);

await mongoose.connect(mongoUri);
const db = mongoose.connection.db;
const user = await db.collection('users').findOne({ email });
const tid = user.tenantId;

const notas = await db
  .collection('notas')
  .find({ tenantId: tid, mes_competencia: mes })
  .project({ numero: 1 })
  .sort({ numero: 1 })
  .toArray();

const profiles = await db.collection('importprofiles').find({ tenantId: tid }).toArray();
const byProfile = {};

for (const p of profiles) {
  const pid = String(p._id);
  const linked = await db.collection('banklancamentos').countDocuments({
    tenantId: tid,
    profile_id: p._id,
    nota_id: { $in: notas.map((n) => n._id) },
    data: { $gte: fromDate, $lte: toDate },
  });
  const cobrancas = await db.collection('banklancamentos').countDocuments({
    tenantId: tid,
    profile_id: p._id,
    data: { $gte: fromDate, $lte: toDate },
    descricao: /cobran[cç]a\s+recebid/i,
  });
  const junho = await db.collection('banklancamentos').countDocuments({
    tenantId: tid,
    profile_id: p._id,
    data: { $gte: fromDate, $lte: toDate },
  });
  byProfile[p.name + ' (' + p.banco_label + ')'] = { linked, cobrancas, junho, system_key: p.system_key };
}

const missing = [];
for (const nota of notas) {
  const lanc = await db.collection('banklancamentos').findOne({
    tenantId: tid,
    nota_id: nota._id,
    data: { $gte: fromDate, $lte: toDate },
  });
  if (!lanc) {
    missing.push(nota.numero);
  }
}

console.log(JSON.stringify({ notasCompetencia: notas.length, byProfile, notasSemLancamentoJunho: missing }, null, 2));
await mongoose.disconnect();
