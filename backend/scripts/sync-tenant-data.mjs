#!/usr/bin/env node
/**
 * Exporta / importa dados de um tenant (por e-mail) entre ambientes.
 *
 * Export (local):
 *   node scripts/sync-tenant-data.mjs export --email ruanomaker@gmail.com --out tenant-ruan.json
 *
 * Import (produção — apaga dados atuais do tenant antes de inserir):
 *   node scripts/sync-tenant-data.mjs import --email ruanomaker@gmail.com --in tenant-ruan.json --yes
 *
 * Variáveis: MONGO_URI (default mongodb://127.0.0.1:27017/finance)
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { EJSON } from 'bson';

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/finance';

const TENANT_COLLECTIONS = [
  'importprofiles',
  'importacaos',
  'bankimportacaos',
  'notas',
  'banklancamentos',
  'importanalysissessions',
  'ragdocuments',
  'honestintegrations',
  'geminiusagelogs',
];

const INSERT_ORDER = [...TENANT_COLLECTIONS];
const DELETE_ORDER = [
  'pagamentovinculos',
  ...[...TENANT_COLLECTIONS].reverse(),
];

const REF_FIELDS = {
  importprofiles: ['confirmed_by'],
  importacaos: ['uploadedBy'],
  bankimportacaos: ['uploadedBy', 'profile_id'],
  notas: ['importacao_fatura_id'],
  banklancamentos: ['profile_id', 'importacao_id', 'nota_id', 'candidatas_nota_ids'],
  importanalysissessions: ['userId', 'rag_context_ids'],
  honestintegrations: ['last_sync_by'],
};

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

function oid(value) {
  if (!value) return value;
  if (value instanceof mongoose.Types.ObjectId) return value;
  return new mongoose.Types.ObjectId(String(value));
}

function mapId(idMap, value) {
  if (!value) return value;
  const key = String(value);
  return idMap.has(key) ? idMap.get(key) : oid(value);
}

function remapDoc(doc, { prodTenantId, prodUserId, idMap, collection }) {
  const next = { ...doc };
  delete next.__v;

  next.tenantId = prodTenantId;

  const fields = REF_FIELDS[collection] ?? [];
  for (const field of fields) {
    if (field === 'candidatas_nota_ids' || field === 'rag_context_ids') {
      if (Array.isArray(next[field])) {
        next[field] = next[field].map((id) => mapId(idMap, id));
      }
      continue;
    }
    if (next[field]) {
      next[field] = mapId(idMap, next[field]);
    }
  }

  if (collection === 'importacaos' || collection === 'bankimportacaos') {
    if (next.uploadedBy) next.uploadedBy = prodUserId;
  }
  if (collection === 'importanalysissessions' && next.userId) {
    next.userId = prodUserId;
  }
  if (collection === 'honestintegrations' && next.last_sync_by) {
    next.last_sync_by = prodUserId;
  }
  if (collection === 'importprofiles' && next.confirmed_by) {
    next.confirmed_by = prodUserId;
  }

  return next;
}

async function resolveUser(db, email) {
  const user = await db.collection('users').findOne({ email: email.toLowerCase() });
  if (!user) throw new Error(`Usuário não encontrado: ${email}`);
  if (!user.tenantId) throw new Error(`Usuário ${email} sem tenantId`);
  const org = await db.collection('organizations').findOne({ _id: user.tenantId });
  if (!org) throw new Error(`Organização não encontrada para ${email}`);
  return { user, org };
}

async function fetchTenantDocs(db, tenantId, userId) {
  const tid = oid(tenantId);
  const data = {};

  for (const name of TENANT_COLLECTIONS) {
    if (name === 'importacaos') {
      data[name] = await db
        .collection(name)
        .find({ $or: [{ tenantId: tid }, { uploadedBy: userId }] })
        .toArray();
    } else if (name === 'ragdocuments') {
      data[name] = await db
        .collection(name)
        .find({ $or: [{ tenantId: tid }, { tenantId: null, scope: 'tenant' }] })
        .toArray();
      data[name] = data[name].filter((d) => !d.tenantId || String(d.tenantId) === String(tenantId));
    } else {
      data[name] = await db.collection(name).find({ tenantId: tid }).toArray();
    }
  }

  const lancamentoIds = data.banklancamentos.map((d) => d._id);
  data.pagamentovinculos =
    lancamentoIds.length > 0
      ? await db.collection('pagamentovinculos').find({ lancamento_id: { $in: lancamentoIds } }).toArray()
      : [];

  return data;
}

function summarize(data) {
  const lines = [];
  for (const name of [...INSERT_ORDER, 'pagamentovinculos']) {
    lines.push(`${name}: ${(data[name] ?? []).length}`);
  }
  return lines.join(', ');
}

async function cmdExport(db, email, outFile) {
  const { user, org } = await resolveUser(db, email);
  const data = await fetchTenantDocs(db, user.tenantId, user._id);

  const bundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    sourceEmail: user.email,
    sourceTenantId: String(user.tenantId),
    sourceOrgSlug: org.slug,
    sourceOrgName: org.name,
    counts: Object.fromEntries(
      [...INSERT_ORDER, 'pagamentovinculos'].map((c) => [c, (data[c] ?? []).length]),
    ),
    data: EJSON.serialize(data),
  };

  const abs = path.resolve(outFile);
  fs.writeFileSync(abs, JSON.stringify(bundle, null, 2));
  console.log(`Exportado → ${abs}`);
  console.log(`Org: ${org.slug} (${org.name})`);
  console.log(summarize(data));
}

async function deleteTenantData(db, tenantId) {
  const tid = oid(tenantId);
  const lancamentos = await db.collection('banklancamentos').find({ tenantId: tid }, { projection: { _id: 1 } }).toArray();
  const lancamentoIds = lancamentos.map((d) => d._id);

  if (lancamentoIds.length > 0) {
    const r = await db.collection('pagamentovinculos').deleteMany({ lancamento_id: { $in: lancamentoIds } });
    console.log(`  pagamentovinculos removidos: ${r.deletedCount}`);
  }

  for (const name of TENANT_COLLECTIONS.slice().reverse()) {
    if (name === 'importacaos') {
      const users = await db.collection('users').find({ tenantId: tid }, { projection: { _id: 1 } }).toArray();
      const userIds = users.map((u) => u._id);
      const r = await db.collection(name).deleteMany({
        $or: [{ tenantId: tid }, { uploadedBy: { $in: userIds } }],
      });
      console.log(`  ${name} removidos: ${r.deletedCount}`);
    } else {
      const r = await db.collection(name).deleteMany({ tenantId: tid });
      console.log(`  ${name} removidos: ${r.deletedCount}`);
    }
  }
}

async function cmdImport(db, email, inFile, { dryRun, yes }) {
  const abs = path.resolve(inFile);
  if (!fs.existsSync(abs)) throw new Error(`Arquivo não encontrado: ${abs}`);

  const bundle = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const data = EJSON.deserialize(bundle.data);
  const { user, org } = await resolveUser(db, email);

  console.log(`Bundle: ${bundle.sourceOrgSlug} exportado em ${bundle.exportedAt}`);
  console.log(`Destino: ${org.slug} (${org.name}) tenantId=${user.tenantId}`);
  console.log('Contagem no bundle:', summarize(data));

  if (!yes && !dryRun) {
    console.error('\n⚠️  Isso APAGA os dados atuais deste tenant em produção.');
    console.error('    Reexecute com --yes para confirmar.');
    process.exit(1);
  }

  if (dryRun) {
    console.log('\n[dry-run] Nenhuma alteração feita.');
    return;
  }

  console.log('\n==> Removendo dados atuais do tenant...');
  await deleteTenantData(db, user.tenantId);

  const prodTenantId = oid(user.tenantId);
  const prodUserId = oid(user._id);
  const idMap = new Map();

  console.log('\n==> Inserindo dados...');
  for (const collection of INSERT_ORDER) {
    const docs = data[collection] ?? [];
    if (docs.length === 0) continue;

    const toInsert = [];
    for (const doc of docs) {
      const oldId = String(doc._id);
      const newId = new mongoose.Types.ObjectId();
      idMap.set(oldId, newId);

      const remapped = remapDoc(doc, { prodTenantId, prodUserId, idMap, collection });
      remapped._id = newId;
      toInsert.push(remapped);
    }

    if (toInsert.length > 0) {
      await db.collection(collection).insertMany(toInsert, { ordered: false });
    }
    console.log(`  ${collection}: ${toInsert.length} inseridos`);
  }

  const vinculos = data.pagamentovinculos ?? [];
  if (vinculos.length > 0) {
    const toInsert = vinculos.map((doc) => {
      const next = { ...doc };
      delete next.__v;
      next.lancamento_id = mapId(idMap, doc.lancamento_id);
      if (!idMap.has(String(doc.lancamento_id))) {
        throw new Error(`pagamentovinculo sem lancamento_id mapeado: ${doc._id}`);
      }
      next._id = new mongoose.Types.ObjectId();
      return next;
    });
    await db.collection('pagamentovinculos').insertMany(toInsert, { ordered: false });
    console.log(`  pagamentovinculos: ${toInsert.length} inseridos`);
  }

  console.log('\n==> Import concluído.');
  const after = await fetchTenantDocs(db, user.tenantId, user._id);
  console.log('Contagem final:', summarize(after));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  const email = (args.email || '').toLowerCase();
  const mongoUri = process.env.MONGO_URI || DEFAULT_URI;

  if (!cmd || !['export', 'import'].includes(cmd)) {
    console.error('Uso: sync-tenant-data.mjs export|import --email <email> [--out|--in arquivo] [--yes] [--dry-run]');
    process.exit(1);
  }
  if (!email) {
    console.error('--email é obrigatório');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  console.log('MongoDB:', db.databaseName);

  try {
    if (cmd === 'export') {
      const out = args.out || `tenant-${email.split('@')[0]}.json`;
      await cmdExport(db, email, out);
    } else {
      const inFile = args.in;
      if (!inFile) {
        console.error('--in é obrigatório para import');
        process.exit(1);
      }
      await cmdImport(db, email, inFile, { dryRun: !!args['dry-run'], yes: !!args.yes });
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('sync-tenant-data failed:', err);
  process.exit(1);
});
