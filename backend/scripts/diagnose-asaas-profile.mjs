#!/usr/bin/env node
import mongoose from 'mongoose';

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finance';
const profileId = process.env.PROFILE_ID || '6a4809e125268c176fa6995b';

await mongoose.connect(mongoUri);
const db = mongoose.connection.db;
const p = await db.collection('importprofiles').findOne({ _id: new mongoose.Types.ObjectId(profileId) });
console.log('profile', JSON.stringify({
  name: p?.name,
  banco_label: p?.banco_label,
  system_key: p?.system_key,
  status: p?.status,
  source: p?.source,
  mapping_columns: p?.mapping?.columns,
  tipo_movimento_rule: p?.mapping?.tipo_movimento_rule,
}, null, 2));

const cobrancas = await db.collection('banklancamentos').countDocuments({
  profile_id: p._id,
  descricao: /cobran[cç]a\s+recebid/i,
});
const withNota = await db.collection('banklancamentos').countDocuments({
  profile_id: p._id,
  nota_id: { $ne: null },
});
const samples = await db.collection('banklancamentos')
  .find({ profile_id: p._id })
  .limit(5)
  .project({ descricao: 1, tipo_transacao: 1, origem: 1, valor: 1, nota_id: 1 })
  .toArray();
console.log({ cobrancas, withNota, samples });
await mongoose.disconnect();
