#!/usr/bin/env node
/**
 * Simula listProfilesForFluxoExport + contagem de linhas por perfil (Mongo direto).
 */
import mongoose from 'mongoose';

const email = process.env.DIAG_EMAIL || 'ruanomaker@gmail.com';
const mes = process.env.DIAG_MES || '2026-06';
const mesCompetenciaNf = process.env.DIAG_MES_COMPETENCIA_NF || mes;
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finance';

const [year, month] = mes.split('-').map(Number);
const lastDay = new Date(year, month, 0).getDate();
const fromDate = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`);
const toDate = new Date(`${year}-${String(month).padStart(2, '0')}-${lastDay}T23:59:59.999Z`);

await mongoose.connect(mongoUri);
const db = mongoose.connection.db;
const user = await db.collection('users').findOne({ email });
if (!user) throw new Error(`User not found: ${email}`);
const tid = user.tenantId;

const profiles = await db
  .collection('importprofiles')
  .find({ tenantId: tid, status: 'active', source: { $ne: 'system_template' } })
  .sort({ banco_label: 1, name: 1 })
  .toArray();

const withCounts = [];
for (const profile of profiles) {
  const lancamentoCount = await db.collection('banklancamentos').countDocuments({
    tenantId: tid,
    profile_id: profile._id,
  });
  if (lancamentoCount > 0) withCounts.push({ ...profile, lancamentoCount });
}

const bestByKey = new Map();
for (const profile of withCounts) {
  const key = `${profile.system_key || ''}|${profile.banco_label}|${profile.name}`.trim().toLowerCase();
  const current = bestByKey.get(key);
  if (!current || profile.lancamentoCount > current.lancamentoCount) {
    bestByKey.set(key, profile);
  }
}
const exportProfiles = [...bestByKey.values()];

const notasComp = await db
  .collection('notas')
  .find({ tenantId: tid, mes_competencia: mesCompetenciaNf })
  .project({ _id: 1, numero: 1 })
  .toArray();
const notaIdsComp = notasComp.map((n) => n._id);

const sheetSim = [];
for (const profile of exportProfiles) {
  const dataFilter = { $gte: fromDate, $lte: toDate };
  const filter = {
    tenantId: tid,
    profile_id: profile._id,
    $or: [{ data: dataFilter }, { nota_id: { $in: notaIdsComp } }],
  };
  const raw = await db.collection('banklancamentos').countDocuments(filter);
  const junhoOnly = await db.collection('banklancamentos').countDocuments({
    tenantId: tid,
    profile_id: profile._id,
    data: dataFilter,
  });
  const linkedComp = await db.collection('banklancamentos').countDocuments({
    tenantId: tid,
    profile_id: profile._id,
    nota_id: { $in: notaIdsComp },
  });
  sheetSim.push({
    id: String(profile._id),
    name: profile.name,
    banco_label: profile.banco_label,
    system_key: profile.system_key,
    status: profile.status,
    source: profile.source,
    lancamentoCount: profile.lancamentoCount,
    queryOrCount: raw,
    junhoOnly,
    linkedComp,
    sheetName: `Fluxo de caixa_${profile.banco_label}`,
  });
}

console.log(
  JSON.stringify(
    {
      tenantId: String(tid),
      mes,
      mesCompetenciaNf,
      notasCompetencia: notasComp.length,
      exportProfileCount: exportProfiles.length,
      sheets: sheetSim,
    },
    null,
    2,
  ),
);
await mongoose.disconnect();
