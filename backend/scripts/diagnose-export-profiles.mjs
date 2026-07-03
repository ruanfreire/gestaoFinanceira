#!/usr/bin/env node
import mongoose from 'mongoose';

const email = 'ruanomaker@gmail.com';
const mes = '2026-06';
const mesCompetenciaNf = '2026-06';
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finance';

const [year, month] = mes.split('-').map(Number);
const lastDay = new Date(year, month, 0).getDate();
const fromDate = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`);
const toDate = new Date(`${year}-${String(month).padStart(2, '0')}-${lastDay}T23:59:59.999Z`);

await mongoose.connect(mongoUri);
const db = mongoose.connection.db;
const user = await db.collection('users').findOne({ email });
const tid = user.tenantId;

const profiles = await db
  .collection('importprofiles')
  .find({ tenantId: tid, status: { $ne: 'archived' } })
  .toArray();

const result = [];
for (const profile of profiles) {
  const total = await db.collection('banklancamentos').countDocuments({
    tenantId: tid,
    profile_id: profile._id,
  });
  const junho = await db.collection('banklancamentos').countDocuments({
    tenantId: tid,
    profile_id: profile._id,
    data: { $gte: fromDate, $lte: toDate },
  });
  const notasComp = await db
    .collection('notas')
    .find({ tenantId: tid, mes_competencia: mesCompetenciaNf })
    .project({ _id: 1 })
    .toArray();
  const notaIds = notasComp.map((n) => n._id);
  const linkedComp = await db.collection('banklancamentos').countDocuments({
    tenantId: tid,
    profile_id: profile._id,
    nota_id: { $in: notaIds },
    data: { $gte: fromDate, $lte: toDate },
  });
  result.push({
    name: profile.name,
    banco: profile.banco_label,
    system_key: profile.system_key,
    id: String(profile._id),
    total,
    junho,
    linkedCompetenciaJunho: linkedComp,
  });
}

console.log(JSON.stringify({ mes, mesCompetenciaNf, profiles: result }, null, 2));
await mongoose.disconnect();
