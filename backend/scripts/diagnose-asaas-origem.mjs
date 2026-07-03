#!/usr/bin/env node
import mongoose from 'mongoose';

const pid = process.argv[2] || '6a4809e125268c176fa6995b';
await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finance');
const db = mongoose.connection.db;
const profileId = new mongoose.Types.ObjectId(pid);
const origem = await db
  .collection('banklancamentos')
  .aggregate([{ $match: { profile_id: profileId } }, { $group: { _id: '$origem', n: { $sum: 1 } } }])
  .toArray();
const withJson = await db.collection('banklancamentos').countDocuments({
  profile_id: profileId,
  json_original: { $exists: true, $ne: null },
});
console.log(JSON.stringify({ profileId: pid, origem, withJson }, null, 2));
await mongoose.disconnect();
