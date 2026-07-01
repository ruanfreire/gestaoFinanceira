import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  BancoImportacao,
  mapAsaasLancamentoDetalhe,
  mapNubankLancamentoDetalhe,
  sanitizeImportacaoBancaria,
  withBancoTag,
} from '../../common/importacao-bancaria.util';
import { parseAsaasCsv } from '../extrato-asaas/asaas-csv.parser';
import { parseNubankCsv } from '../extrato-nubank/nubank-csv.parser';
import { asLeanMany, asLeanOne } from '../../common/mongoose-lean.util';

type ListOptions = {
  banco?: BancoImportacao;
  page?: number;
  limit?: number;
  search?: string;
};

type LancamentosOptions = {
  page?: number;
  limit?: number;
  search?: string;
  status_conciliacao?: string;
  sort?: 'asc' | 'desc';
};

@Injectable()
export class ImportacoesBancariasService {
  constructor(
    @InjectModel('AsaasImportacao') private asaasImportModel: Model<any>,
    @InjectModel('NubankImportacao') private nubankImportModel: Model<any>,
    @InjectModel('AsaasLancamento') private asaasLancamentoModel: Model<any>,
    @InjectModel('NubankLancamento') private nubankLancamentoModel: Model<any>,
  ) {}

  private resolveBanco(banco: string): BancoImportacao {
    if (banco === 'asaas' || banco === 'nubank') return banco;
    throw new BadRequestException('Banco inválido. Use asaas ou nubank.');
  }

  private importModel(banco: BancoImportacao) {
    return banco === 'asaas' ? this.asaasImportModel : this.nubankImportModel;
  }

  private lancamentoModel(banco: BancoImportacao) {
    return banco === 'asaas' ? this.asaasLancamentoModel : this.nubankLancamentoModel;
  }

  private buildImportSearchFilter(term?: string) {
    if (!term?.trim()) return {};
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return {
      $or: [{ filename: regex }, { originalName: regex }, { label: regex }, { descricao: regex }, { periodo: regex }],
    };
  }

  private buildLancamentoSearchFilter(banco: BancoImportacao, term?: string) {
    if (!term?.trim()) return {};
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (banco === 'asaas') {
      return {
        $or: [
          { transacao_id: regex },
          { descricao: regex },
          { pagador_nome: regex },
          { tipo_transacao: regex },
          { fatura_cobranca_id: regex },
          { fatura_parcelamento_id: regex },
        ],
      };
    }
    return {
      $or: [
        { transacao_id: regex },
        { descricao: regex },
        { pagador_nome: regex },
        { categoria: regex },
      ],
    };
  }

  /** IDs de todas as linhas do arquivo — inclui movimentos já importados em lotes anteriores */
  private async resolveTransacaoIds(banco: BancoImportacao, importacao: any): Promise<string[]> {
    const stored = (importacao.transacao_ids || []) as string[];
    if (stored.length > 0) return stored;

    if (!importacao.originalCsv) return [];

    const rows =
      banco === 'asaas'
        ? parseAsaasCsv(String(importacao.originalCsv)).rows
        : parseNubankCsv(String(importacao.originalCsv)).rows;
    const transacao_ids = rows.map((row) => row.transacao_id);

    if (transacao_ids.length > 0) {
      await this.importModel(banco).findByIdAndUpdate(importacao._id, { $set: { transacao_ids } });
    }

    return transacao_ids;
  }

  private buildLancamentoImportFilter(
    importacaoId: string,
    transacaoIds: string[],
  ): Record<string, unknown> {
    if (transacaoIds.length > 0) {
      return { transacao_id: { $in: transacaoIds } };
    }
    return { importacao_id: importacaoId };
  }

  async list(options: ListOptions = {}) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;
    const filter = this.buildImportSearchFilter(options.search);

    const fetchAsaas = options.banco == null || options.banco === 'asaas';
    const fetchNubank = options.banco == null || options.banco === 'nubank';

    const [asaasItems, nubankItems, asaasTotal, nubankTotal] = await Promise.all([
      fetchAsaas
        ? this.asaasImportModel.find(filter).sort({ createdAt: -1 }).select('-originalCsv').lean()
        : Promise.resolve([]),
      fetchNubank
        ? this.nubankImportModel.find(filter).sort({ createdAt: -1 }).select('-originalCsv').lean()
        : Promise.resolve([]),
      fetchAsaas ? this.asaasImportModel.countDocuments(filter) : Promise.resolve(0),
      fetchNubank ? this.nubankImportModel.countDocuments(filter) : Promise.resolve(0),
    ]);

    const merged = [
      ...asaasItems.map((item) => withBancoTag(item, 'asaas')),
      ...nubankItems.map((item) => withBancoTag(item, 'nubank')),
    ].sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime());

    const total = asaasTotal + nubankTotal;
    const items = merged.slice(skip, skip + limit);

    return { items, total, page, limit };
  }

  async findById(bancoRaw: string, id: string) {
    const banco = this.resolveBanco(bancoRaw);
    const doc = asLeanOne<Record<string, unknown>>(
      await this.importModel(banco).findById(id).select('-originalCsv').lean(),
    );
    if (!doc) throw new NotFoundException('Importação bancária não encontrada');
    return withBancoTag(doc, banco);
  }

  async updateMetadata(bancoRaw: string, id: string, payload: { label?: string; descricao?: string }) {
    const banco = this.resolveBanco(bancoRaw);
    const update: Record<string, string> = {};
    if (payload.label !== undefined) update.label = payload.label.trim();
    if (payload.descricao !== undefined) update.descricao = payload.descricao.trim();

    const doc = asLeanOne<Record<string, unknown>>(
      await this.importModel(banco)
        .findByIdAndUpdate(id, { $set: update }, { new: true })
        .select('-originalCsv')
        .lean(),
    );

    if (!doc) throw new NotFoundException('Importação bancária não encontrada');
    return withBancoTag(doc, banco);
  }

  async remove(bancoRaw: string, id: string) {
    const banco = this.resolveBanco(bancoRaw);
    const doc = await this.importModel(banco).findById(id).lean();
    if (!doc) throw new NotFoundException('Importação bancária não encontrada');

    const conciliados = await this.lancamentoModel(banco).countDocuments({
      importacao_id: id,
      status_conciliacao: { $in: ['conciliado_auto', 'conciliado_manual'] },
    });

    if (conciliados > 0) {
      throw new BadRequestException(
        `Não é possível excluir: ${conciliados} lançamento(s) conciliado(s) vinculado(s) a notas.`,
      );
    }

    await this.lancamentoModel(banco).deleteMany({ importacao_id: id });
    await this.importModel(banco).findByIdAndDelete(id);

    return { ok: true, id, banco };
  }

  async listLancamentos(bancoRaw: string, importacaoId: string, options: LancamentosOptions = {}) {
    const banco = this.resolveBanco(bancoRaw);
    const importacao = asLeanOne<Record<string, unknown> & { stats?: { total_linhas?: number } }>(
      await this.importModel(banco)
        .findById(importacaoId)
        .select('+originalCsv')
        .lean(),
    );
    if (!importacao) throw new NotFoundException('Importação bancária não encontrada');

    const transacaoIds = await this.resolveTransacaoIds(banco, importacao);

    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(500, Math.max(1, options.limit ?? 50));
    const skip = (page - 1) * limit;
    const sortDir = options.sort === 'desc' ? -1 : 1;

    const filter: Record<string, unknown> = {
      ...this.buildLancamentoImportFilter(importacaoId, transacaoIds),
      ...this.buildLancamentoSearchFilter(banco, options.search),
    };
    if (options.status_conciliacao) {
      filter.status_conciliacao = options.status_conciliacao;
    }

    const [items, total] = await Promise.all([
      this.lancamentoModel(banco)
        .find(filter)
        .sort({ data: sortDir, _id: sortDir })
        .skip(skip)
        .limit(limit)
        .populate('nota_id', 'numero tomador mes_competencia')
        .lean(),
      this.lancamentoModel(banco).countDocuments(filter),
    ]);

    const mapped =
      banco === 'asaas'
        ? items.map(mapAsaasLancamentoDetalhe)
        : items.map(mapNubankLancamentoDetalhe);

    const importacaoSanitized = sanitizeImportacaoBancaria(importacao);
    delete (importacaoSanitized as { originalCsv?: string }).originalCsv;

    return {
      items: mapped,
      total,
      linhas_arquivo: transacaoIds.length || importacao.stats?.total_linhas || total,
      page,
      limit,
      importacao: withBancoTag(importacaoSanitized, banco),
    };
  }

  async getOriginalCsv(bancoRaw: string, id: string) {
    const banco = this.resolveBanco(bancoRaw);
    const doc = asLeanOne<{
      originalCsv?: string;
      filename?: string;
      originalName?: string;
    }>(
      await this.importModel(banco).findById(id).select('originalCsv filename originalName').lean(),
    );
    if (!doc) throw new NotFoundException('Importação bancária não encontrada');
    if (!doc.originalCsv) {
      throw new BadRequestException('CSV original não disponível para esta importação');
    }
    return doc;
  }
}
