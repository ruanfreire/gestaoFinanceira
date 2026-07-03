import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  mapCustomLancamentoDetalhe,
  sanitizeImportacaoBancaria,
  withBancoTag,
} from '../../common/importacao-bancaria.util';
import { asLeanMany, asLeanOne } from '../../common/mongoose-lean.util';
import { NotasService } from '../notas/notas.service';

type ListOptions = {
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
    @InjectModel('BankImportacao') private bankImportModel: Model<any>,
    @InjectModel('BankLancamento') private bankLancamentoModel: Model<any>,
    private readonly notasService: NotasService,
  ) {}

  private buildImportSearchFilter(term?: string) {
    if (!term?.trim()) return {};
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return {
      $or: [{ filename: regex }, { originalName: regex }, { label: regex }, { descricao: regex }, { periodo: regex }],
    };
  }

  private buildLancamentoSearchFilter(term?: string) {
    if (!term?.trim()) return {};
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return {
      $or: [
        { transacao_id: regex },
        { descricao: regex },
        { pagador_nome: regex },
        { categoria: regex },
      ],
    };
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

  private resolveBanco(banco: string): 'bank' {
    if (banco === 'bank' || banco === 'custom' || banco === 'asaas' || banco === 'nubank') return 'bank';
    throw new BadRequestException('Banco inválido. Use bank.');
  }

  async list(options: ListOptions = {}) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;
    const filter = this.buildImportSearchFilter(options.search);

    const [items, total] = await Promise.all([
      this.bankImportModel.find(filter).sort({ createdAt: -1 }).select('-originalCsv').lean(),
      this.bankImportModel.countDocuments(filter),
    ]);

    const mapped = items.map((item) =>
      withBancoTag(item, 'bank', {
        banco_label: item.banco_label,
        profile_id: item.profile_id ? String(item.profile_id) : undefined,
      }),
    );

    return { items: mapped.slice(skip, skip + limit), total, page, limit };
  }

  async findById(bancoRaw: string, id: string) {
    this.resolveBanco(bancoRaw);
    const doc = asLeanOne<Record<string, unknown>>(
      await this.bankImportModel.findById(id).select('-originalCsv').lean(),
    );
    if (!doc) throw new NotFoundException('Importação bancária não encontrada');
    return withBancoTag(doc, 'bank', {
      banco_label: doc.banco_label,
      profile_id: doc.profile_id ? String(doc.profile_id) : undefined,
    });
  }

  async updateMetadata(bancoRaw: string, id: string, payload: { label?: string; descricao?: string }) {
    this.resolveBanco(bancoRaw);
    const update: Record<string, string> = {};
    if (payload.label !== undefined) update.label = payload.label.trim();
    if (payload.descricao !== undefined) update.descricao = payload.descricao.trim();

    const doc = asLeanOne<Record<string, unknown>>(
      await this.bankImportModel
        .findByIdAndUpdate(id, { $set: update }, { new: true })
        .select('-originalCsv')
        .lean(),
    );

    if (!doc) throw new NotFoundException('Importação bancária não encontrada');
    return withBancoTag(doc, 'bank', {
      banco_label: doc.banco_label,
      profile_id: doc.profile_id ? String(doc.profile_id) : undefined,
    });
  }

  async remove(bancoRaw: string, id: string) {
    this.resolveBanco(bancoRaw);
    const doc = await this.bankImportModel.findById(id).lean();
    if (!doc) throw new NotFoundException('Importação bancária não encontrada');

    const lancamentos = asLeanMany<{
      _id: unknown;
      nota_id?: unknown;
      status_conciliacao?: string;
    }>(await this.bankLancamentoModel.find({ importacao_id: id }).lean());

    for (const lancamento of lancamentos) {
      if (
        lancamento.nota_id &&
        ['conciliado_auto', 'conciliado_manual'].includes(String(lancamento.status_conciliacao))
      ) {
        try {
          await this.notasService.desvincularPagamento(
            String(lancamento.nota_id),
            String(lancamento._id),
            'bank',
          );
        } catch {
          // segue com exclusão do lançamento
        }
      }
    }

    const deleted = await this.bankLancamentoModel.deleteMany({ importacao_id: id });
    await this.bankImportModel.findByIdAndDelete(id);

    return { ok: true, id, banco: 'bank', lancamentos_excluidos: deleted.deletedCount ?? 0 };
  }

  async listLancamentos(bancoRaw: string, importacaoId: string, options: LancamentosOptions = {}) {
    this.resolveBanco(bancoRaw);
    const importacao = asLeanOne<Record<string, unknown> & { stats?: { total_linhas?: number } }>(
      await this.bankImportModel
        .findById(importacaoId)
        .select('+originalCsv')
        .lean(),
    );
    if (!importacao) throw new NotFoundException('Importação bancária não encontrada');

    const transacaoIds = (importacao.transacao_ids || []) as string[];

    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(500, Math.max(1, options.limit ?? 50));
    const skip = (page - 1) * limit;
    const sortDir = options.sort === 'desc' ? -1 : 1;

    const filter: Record<string, unknown> = {
      ...this.buildLancamentoImportFilter(importacaoId, transacaoIds),
      ...this.buildLancamentoSearchFilter(options.search),
    };
    if (options.status_conciliacao) {
      filter.status_conciliacao = options.status_conciliacao;
    }

    const [items, total] = await Promise.all([
      this.bankLancamentoModel
        .find(filter)
        .sort({ data: sortDir, _id: sortDir })
        .skip(skip)
        .limit(limit)
        .populate('nota_id', 'numero tomador mes_competencia')
        .lean(),
      this.bankLancamentoModel.countDocuments(filter),
    ]);

    const importacaoSanitized = sanitizeImportacaoBancaria(importacao);
    delete (importacaoSanitized as { originalCsv?: string }).originalCsv;

    return {
      items: items.map(mapCustomLancamentoDetalhe),
      total,
      linhas_arquivo: transacaoIds.length || importacao.stats?.total_linhas || total,
      page,
      limit,
      importacao: withBancoTag(importacaoSanitized, 'bank', {
        banco_label: importacao.banco_label,
        profile_id: importacao.profile_id ? String(importacao.profile_id) : undefined,
      }),
    };
  }

  async getOriginalCsv(bancoRaw: string, id: string) {
    this.resolveBanco(bancoRaw);
    const doc = asLeanOne<{
      originalCsv?: string;
      filename?: string;
      originalName?: string;
    }>(await this.bankImportModel.findById(id).select('originalCsv filename originalName').lean());
    if (!doc) throw new NotFoundException('Importação bancária não encontrada');
    if (!doc.originalCsv) {
      throw new BadRequestException('CSV original não disponível para esta importação');
    }
    return doc;
  }
}
