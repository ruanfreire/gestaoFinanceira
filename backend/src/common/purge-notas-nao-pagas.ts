import { connect, connection, Types } from 'mongoose';
import { NOTA_NAO_CANCELADA_FILTER } from '../modules/notas/nota-cancelada.util';

const CUTOFF_MES_COMPETENCIA = process.env.CUTOFF_MES_COMPETENCIA;

/** Meses 01–05 (anteriores ao mês 6) em qualquer ano. */
const MES_ANTES_DO_6_REGEX = /-(0[1-5])$/;

const UNPAID_FILTER = {
  $or: [
    { status_pagamento: 'em_aberto' },
    { status_pagamento: 'parcial' },
    { status_pagamento: { $exists: false } },
    { status_pagamento: null },
  ],
};

function buildFilter() {
  const mesFilter = process.env.CUTOFF_MES_COMPETENCIA
    ? {
        mes_competencia: {
          $exists: true,
          $ne: null,
          $lt: CUTOFF_MES_COMPETENCIA,
        },
      }
    : {
        mes_competencia: { $regex: MES_ANTES_DO_6_REGEX },
      };

  return {
    $and: [
      mesFilter,
      UNPAID_FILTER,
      ...(process.env.CUTOFF_MES_COMPETENCIA ? [] : [NOTA_NAO_CANCELADA_FILTER]),
    ],
  };
}

async function purgeNotasNaoPagas() {
  const dryRun = process.env.DRY_RUN !== '0';
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/finance';
  const filter = buildFilter();

  await connect(mongoUri);
  console.log('Conectado:', mongoUri);
  console.log(
    'Critério competência:',
    process.env.CUTOFF_MES_COMPETENCIA
      ? `anterior a ${CUTOFF_MES_COMPETENCIA}`
      : 'meses 01–05 (anteriores ao mês 6)',
  );
  console.log('Modo:', dryRun ? 'DRY_RUN (apenas prévia)' : 'EXECUÇÃO');

  const notas = connection.collection('notas');
  const count = await notas.countDocuments(filter);

  const sample = await notas
    .find(filter)
    .project({ numero: 1, tomador: 1, mes_competencia: 1, status_pagamento: 1, valor: 1, valor_pago: 1 })
    .sort({ mes_competencia: 1, numero: 1 })
    .limit(20)
    .toArray();

  const byCompetencia = await notas
    .aggregate([
      { $match: filter },
      { $group: { _id: '$mes_competencia', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  console.log('\nNotas a remover:', count);
  console.log('Por competência:', byCompetencia);
  console.log('\nAmostra (até 20):');
  for (const n of sample) {
    console.log(
      `  ${n.mes_competencia} | NF ${n.numero} | ${n.tomador ?? '—'} | ${n.status_pagamento ?? 'em_aberto'} | R$ ${n.valor ?? 0}`,
    );
  }

  if (!dryRun && count > 0) {
    if (process.env.PURGE_CONFIRM !== '1') {
      console.error('\nDefina PURGE_CONFIRM=1 para executar a remoção.');
      process.exit(1);
    }

    const ids = await notas.find(filter).project({ _id: 1 }).toArray();
    const notaIds = ids.map((n) => n._id as Types.ObjectId);

    const bankLancamentos = connection.collection('banklancamentos');

    const bankUnlink = await bankLancamentos.updateMany(
      { nota_id: { $in: notaIds } },
      { $set: { nota_id: null, status_conciliacao: 'pendente_vinculo' } },
    );
    const pullCandidatas = { $pullAll: { candidatas_nota_ids: notaIds } } as Record<string, unknown>;
    const bankCandidatas = await bankLancamentos.updateMany(
      { candidatas_nota_ids: { $in: notaIds } },
      pullCandidatas,
    );

    const result = await notas.deleteMany(filter);
    console.log('\nLançamentos bancários desvinculados (nota_id):', bankUnlink.modifiedCount);
    console.log('Candidatas bancárias atualizadas:', bankCandidatas.modifiedCount);
    console.log('Notas removidas:', result.deletedCount);
  } else if (dryRun) {
    console.log('\nPara executar: DRY_RUN=0 PURGE_CONFIRM=1 npm run purge-notas-nao-pagas --workspace backend');
  }

  await connection.close();
}

if (require.main === module) {
  purgeNotasNaoPagas().catch((err) => {
    console.error('Falha:', err);
    process.exit(1);
  });
}
