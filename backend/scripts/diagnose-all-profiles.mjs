#!/usr/bin/env node
import mongoose from 'mongoose';

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finance';
const email = 'ruanomaker@gmail.com';

await mongoose.connect(mongoUri);
const db = mongoose.connection.db;
const user = await db.collection('users').findOne({ email });
const tid = user.tenantId;

const all = await db.collection('importprofiles').find({ tenantId: tid }).toArray();
console.log('all profiles', all.map((p) => ({
  id: String(p._id),
  name: p.name,
  banco: p.banco_label,
  status: p.status,
  source: p.source,
  system_key: p.system_key,
  count: null,
})));

for (const p of all) {
  const count = await db.collection('banklancamentos').countDocuments({ tenantId: tid, profile_id: p._id });
  console.log(String(p._id), p.name, p.status, 'lancamentos', count);
}

await mongoose.disconnect();
