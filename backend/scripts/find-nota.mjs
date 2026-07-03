#!/usr/bin/env node
import mongoose from 'mongoose';
const email = process.argv[2] || 'ruanomaker@gmail.com';
const numero = process.argv[3] || '409';
await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finance');
const db = mongoose.connection.db;
const user = await db.collection('users').findOne({ email: email.toLowerCase() });
const tid = user?.tenantId;
const nota = await db.collection('notas').findOne({ tenantId: tid, numero });
console.log(JSON.stringify(nota, null, 2));
await mongoose.disconnect();
