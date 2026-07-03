import { Model, Schema, Types, model, models } from 'mongoose';
import { normalizeName } from '../name-match.util';
import { mesCompetenciaFromDate } from '../../modules/notas/competencia.util';
import { NotaSchema } from '../../modules/notas/schemas/nota.schema';
import { ImportacaoSchema } from '../../modules/importacoes/schemas/importacao.schema';
import {
  BankImportacaoSchema,
  BankLancamentoSchema,
} from '../../modules/import-intelligence/schemas/import-intelligence.schema';

export const RUAN_TARGET_EMAIL = 'ruanomaker@gmail.com';

const DEMO_PREFIX = 'ruan-santanaltda-demo';
const EMPRESA_ID = 9001;

export type RuanDemoContext = {
  tenantId: Types.ObjectId;
  ownerUserId: Types.ObjectId;
  empresaNome: string;
  empresaCnpj?: string;
};

type NotaSeed = {
  numero: string;
  tomador: string;
  valor: number;
  emissao: string;
  status_pagamento: 'em_aberto' | 'parcial' | 'pago';
  valor_pago?: number;
  data_pagamento?: string;
};

const NOTAS: NotaSeed[] = [
  { numero: '101', tomador: 'Marco Silva Consultoria', valor: 2500, emissao: '2026-05-10', status_pagamento: 'pago', valor_pago: 2500, data_pagamento: '2026-05-15' },
  { numero: '102', tomador: 'Ana Costa Arquitetura', valor: 1800, emissao: '2026-05-18', status_pagamento: 'pago', valor_pago: 1800, data_pagamento: '2026-05-22' },
  { numero: '103', tomador: 'Tech Solutions Brasil', valor: 4200, emissao: '2026-06-05', status_pagamento: 'parcial', valor_pago: 2000, data_pagamento: '2026-06-12' },
  { numero: '104', tomador: 'Studio Criativo LTDA', valor: 950, emissao: '2026-06-08', status_pagamento: 'em_aberto' },
  { numero: '105', tomador: 'Beta Marketing Digital', valor: 3100, emissao: '2026-06-12', status_pagamento: 'em_aberto' },
  { numero: '106', tomador: 'Clara Design Eireli', valor: 1500, emissao: '2026-06-15', status_pagamento: 'em_aberto' },
  { numero: '107', tomador: 'Delta Corp Servicos', valor: 2800, emissao: '2026-06-20', status_pagamento: 'em_aberto' },
  { numero: '108', tomador: 'Epsilon Participacoes', valor: 1200, emissao: '2026-06-22', status_pagamento: 'pago', valor_pago: 1200, data_pagamento: '2026-06-25' },
  { numero: '109', tomador: 'Felipe Araujo', valor: 650, emissao: '2026-05-28', status_pagamento: 'em_aberto' },
  { numero: '110', tomador: 'Gamma Industria', valor: 3900, emissao: '2026-06-28', status_pagamento: 'pago', valor_pago: 3900, data_pagamento: '2026-07-01' },
  { numero: '111', tomador: 'Horizonte Eventos', valor: 2200, emissao: '2026-06-30', status_pagamento: 'em_aberto' },
  { numero: '112', tomador: 'Iris Comunicacao', valor: 1750, emissao: '2026-07-02', status_pagamento: 'em_aberto' },
];

type BankSeed = {
  transacao_id: string;
  data: string;
  descricao: string;
  valor: number;
  pagador_nome: string;
  tipo_movimento: 'entrada' | 'saida';
  status_conciliacao: 'conciliado_auto' | 'pendente_vinculo' | 'sem_match' | 'extrato';
  banco_label: string;
  notaNumero?: string;
};

const BANK_LANCAMENTOS: BankSeed[] = [
  { transacao_id: 'ruan-bank-asaas-001', data: '2026-05-15', descricao: 'Cobrança recebida', valor: 2500, pagador_nome: 'Marco Silva Consultoria', tipo_movimento: 'entrada', status_conciliacao: 'conciliado_auto', banco_label: 'Asaas', notaNumero: '101' },
  { transacao_id: 'ruan-bank-asaas-002', data: '2026-05-22', descricao: 'Cobrança recebida', valor: 1800, pagador_nome: 'Ana Costa Arquitetura', tipo_movimento: 'entrada', status_conciliacao: 'conciliado_auto', banco_label: 'Asaas', notaNumero: '102' },
  { transacao_id: 'ruan-bank-asaas-003', data: '2026-06-12', descricao: 'Cobrança recebida', valor: 2000, pagador_nome: 'Tech Solutions Brasil', tipo_movimento: 'entrada', status_conciliacao: 'conciliado_auto', banco_label: 'Asaas', notaNumero: '103' },
  { transacao_id: 'ruan-bank-asaas-004', data: '2026-06-25', descricao: 'Cobrança recebida', valor: 1200, pagador_nome: 'Epsilon Participacoes', tipo_movimento: 'entrada', status_conciliacao: 'conciliado_auto', banco_label: 'Asaas', notaNumero: '108' },
  { transacao_id: 'ruan-bank-asaas-005', data: '2026-07-01', descricao: 'Cobrança recebida', valor: 3900, pagador_nome: 'Gamma Industria', tipo_movimento: 'entrada', status_conciliacao: 'conciliado_auto', banco_label: 'Asaas', notaNumero: '110' },
  { transacao_id: 'ruan-bank-asaas-006', data: '2026-06-18', descricao: 'Cobrança recebida', valor: 950, pagador_nome: 'Studio Criativo LTDA', tipo_movimento: 'entrada', status_conciliacao: 'pendente_vinculo', banco_label: 'Asaas', notaNumero: '104' },
  { transacao_id: 'ruan-bank-asaas-007', data: '2026-06-20', descricao: 'Cobrança recebida', valor: 3100, pagador_nome: 'Beta Marketing Digital', tipo_movimento: 'entrada', status_conciliacao: 'pendente_vinculo', banco_label: 'Asaas', notaNumero: '105' },
  { transacao_id: 'ruan-bank-asaas-008', data: '2026-06-24', descricao: 'Cobrança recebida', valor: 1500, pagador_nome: 'Clara Design Eireli', tipo_movimento: 'entrada', status_conciliacao: 'pendente_vinculo', banco_label: 'Asaas', notaNumero: '106' },
  { transacao_id: 'ruan-bank-asaas-009', data: '2026-06-28', descricao: 'Transferência Pix', valor: 500, pagador_nome: 'Cliente Avulso', tipo_movimento: 'entrada', status_conciliacao: 'sem_match', banco_label: 'Asaas' },
  { transacao_id: 'ruan-bank-asaas-010', data: '2026-06-10', descricao: 'Taxa Asaas', valor: -29.9, pagador_nome: 'Asaas', tipo_movimento: 'saida', status_conciliacao: 'extrato', banco_label: 'Asaas' },
  { transacao_id: 'ruan-bank-nubank-001', data: '2026-06-26', descricao: 'Pix recebido', valor: 2800, pagador_nome: 'Delta Corp Servicos', tipo_movimento: 'entrada', status_conciliacao: 'pendente_vinculo', banco_label: 'Nubank', notaNumero: '107' },
  { transacao_id: 'ruan-bank-nubank-002', data: '2026-06-29', descricao: 'Pix recebido', valor: 2200, pagador_nome: 'Horizonte Eventos', tipo_movimento: 'entrada', status_conciliacao: 'pendente_vinculo', banco_label: 'Nubank', notaNumero: '111' },
  { transacao_id: 'ruan-bank-nubank-003', data: '2026-06-05', descricao: 'Tarifa conta', valor: -12, pagador_nome: 'Nubank', tipo_movimento: 'saida', status_conciliacao: 'extrato', banco_label: 'Nubank' },
];

function safeModel(name: string, schema: Schema): Model<any> {
  return (models[name] as Model<any> | undefined) ?? model(name, schema);
}

function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

function buildNotaDoc(ctx: RuanDemoContext, seed: NotaSeed) {
  const dataEmissao = parseDate(seed.emissao);
  const valorPago = seed.valor_pago ?? (seed.status_pagamento === 'pago' ? seed.valor : 0);
  return {
    tenantId: ctx.tenantId,
    empresa: ctx.empresaNome,
    empresa_id: EMPRESA_ID,
    empresa_nome: ctx.empresaNome,
    empresa_cnpj: ctx.empresaCnpj,
    numero: seed.numero,
    nota_api_id: `${DEMO_PREFIX}-${seed.numero}`,
    tomador: seed.tomador,
    codigo_servico: '05762',
    discriminacao: `Serviços de consultoria — NF ${seed.numero}`,
    valor: seed.valor,
    valor_liquido: seed.valor * 0.95,
    valor_iss: seed.valor * 0.05,
    aliquota_iss: 5,
    data_emissao: dataEmissao,
    data_competencia: dataEmissao,
    mes_competencia: mesCompetenciaFromDate(dataEmissao),
    status: 'NORMAL',
    status_emissao: 'NORMAL',
    status_pagamento: seed.status_pagamento,
    valor_pago: valorPago,
    data_pagamento: seed.data_pagamento ? parseDate(seed.data_pagamento) : undefined,
    rps_id: `rps-ruan-${seed.numero}`,
  };
}

export async function seedRuanSantanaDemo(ctx: RuanDemoContext): Promise<void> {
  const { tenantId, ownerUserId } = ctx;
  const Nota = safeModel('Nota', NotaSchema);
  const Importacao = safeModel('Importacao', ImportacaoSchema);
  const BankImportacao = safeModel('BankImportacao', BankImportacaoSchema);
  const BankLancamento = safeModel('BankLancamento', BankLancamentoSchema);

  console.log(`==> Massa de dados: ${RUAN_TARGET_EMAIL} · ${ctx.empresaNome}`);

  await Nota.deleteMany({ tenantId, nota_api_id: new RegExp(`^${DEMO_PREFIX}-`) });
  await BankLancamento.deleteMany({ tenantId, transacao_id: /^ruan-bank-/ });

  const notaImport = await Importacao.findOneAndUpdate(
    { tenantId, contentHash: 'demo-ruan-notas-2026' },
    {
      $set: {
        tenantId,
        filename: 'ruan-demo-notas.json',
        originalName: 'notas-ruan-santana-demo.json',
        label: `Importação demo — ${ctx.empresaNome}`,
        uploadedBy: ownerUserId,
        status: 'finished',
        stats: { total_faturas: NOTAS.length, imported: NOTAS.length, updated: 0, ignored: 0 },
        contentHash: 'demo-ruan-notas-2026',
        finishedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );

  const notaIds = new Map<string, Types.ObjectId>();
  for (const seed of NOTAS) {
    const doc = buildNotaDoc(ctx, seed);
    const created = await Nota.findOneAndUpdate(
      { tenantId, numero: seed.numero },
      { $set: { ...doc, importacao_fatura_id: notaImport._id } },
      { upsert: true, new: true },
    );
    notaIds.set(seed.numero, created._id as Types.ObjectId);
  }

  const importsByLabel = new Map<string, typeof BANK_LANCAMENTOS>();
  for (const seed of BANK_LANCAMENTOS) {
    const group = importsByLabel.get(seed.banco_label) ?? [];
    group.push(seed);
    importsByLabel.set(seed.banco_label, group);
  }

  for (const [bancoLabel, seeds] of importsByLabel) {
    const hash = `demo-ruan-${bancoLabel.toLowerCase()}-2026`;
    const bankImport = await BankImportacao.findOneAndUpdate(
      { tenantId, contentHash: hash },
      {
        $set: {
          tenantId,
          banco_label: bancoLabel,
          filename: `ruan-demo-${bancoLabel.toLowerCase()}.csv`,
          originalName: `extrato-${bancoLabel.toLowerCase()}-ruan-jun-2026.csv`,
          label: `Extrato ${bancoLabel} — Jun/2026`,
          uploadedBy: ownerUserId,
          periodo: '2026-06',
          status: 'finished',
          contentHash: hash,
          transacao_ids: seeds.map((l) => l.transacao_id),
          stats: {
            total_linhas: seeds.length,
            entradas: seeds.filter((l) => l.tipo_movimento === 'entrada').length,
            saidas: seeds.filter((l) => l.tipo_movimento === 'saida').length,
            conciliado_auto: seeds.filter((l) => l.status_conciliacao === 'conciliado_auto').length,
            pendente_vinculo: seeds.filter((l) => l.status_conciliacao === 'pendente_vinculo').length,
            sem_match: seeds.filter((l) => l.status_conciliacao === 'sem_match').length,
            extrato: seeds.filter((l) => l.status_conciliacao === 'extrato').length,
            imported: seeds.length,
          },
        },
      },
      { upsert: true, new: true },
    );

    for (const seed of seeds) {
      const notaId = seed.notaNumero ? notaIds.get(seed.notaNumero) : undefined;
      const lancamento = await BankLancamento.findOneAndUpdate(
        { tenantId, transacao_id: seed.transacao_id },
        {
          $set: {
            tenantId,
            importacao_id: bankImport._id,
            transacao_id: seed.transacao_id,
            data: parseDate(seed.data),
            descricao: seed.descricao,
            valor: seed.valor,
            pagador_nome: seed.pagador_nome,
            pagador_nome_normalizado: normalizeName(seed.pagador_nome),
            tipo_movimento: seed.tipo_movimento,
            status_conciliacao: seed.status_conciliacao,
            nota_id: notaId,
            candidatas_nota_ids: notaId ? [notaId] : [],
          },
        },
        { upsert: true, new: true },
      );

      if (notaId && seed.status_conciliacao === 'conciliado_auto') {
        const notaSeed = NOTAS.find((n) => n.numero === seed.notaNumero);
        await Nota.updateOne(
          { _id: notaId },
          {
            $set: {
              pagamentos: [
                {
                  source: 'bank',
                  lancamento_id: lancamento._id,
                  transacao_id: seed.transacao_id,
                  valor: Math.abs(seed.valor),
                  data: parseDate(seed.data),
                  descricao: seed.descricao,
                  pagador_nome: seed.pagador_nome,
                },
              ],
            },
          },
        );
        if (notaSeed?.status_pagamento === 'parcial') {
          await Nota.updateOne(
            { _id: notaId },
            { $set: { status_pagamento: 'parcial', valor_pago: notaSeed.valor_pago } },
          );
        }
      }
    }
  }

  const totalEmitido = NOTAS.reduce((sum, n) => sum + n.valor, 0);
  const totalRecebido = NOTAS.reduce(
    (sum, n) => sum + (n.valor_pago ?? (n.status_pagamento === 'pago' ? n.valor : 0)),
    0,
  );
  const pendentes = BANK_LANCAMENTOS.filter((l) => l.status_conciliacao === 'pendente_vinculo').length;

  console.log(`    ${NOTAS.length} notas | emitido R$ ${totalEmitido.toFixed(2)} | recebido R$ ${totalRecebido.toFixed(2)}`);
  console.log(`    ${BANK_LANCAMENTOS.length} lançamentos bancários | ${pendentes} pendentes de vínculo`);
}
