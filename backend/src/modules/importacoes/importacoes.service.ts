import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  extractNotaItemsFromJson,
  mapNfItemToNotaDto,
  mapNfItemToPreview,
} from './nf-json.mapper';
import { NotasService } from '../notas/notas.service';
import { asLeanOne } from '../../common/mongoose-lean.util';

function sanitizeImportacao(doc: any, includeJson = false) {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (!includeJson) {
    delete plain.originalJson;
  }
  return plain;
}

@Injectable()
export class ImportacoesService {
  constructor(@InjectModel('Importacao') private importModel: Model<any>) {}

  async createRecord(metadata: Record<string, unknown>) {
    return this.importModel.create(metadata);
  }

  async markFailed(importId: string, errorMessage?: string) {
    await this.importModel.findByIdAndUpdate(importId, {
      $set: {
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: errorMessage || 'Falha ao processar JSON',
      },
    });
  }

  async findAll(options: { page?: number; limit?: number; search?: string } = {}) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    const term = options.search?.trim();
    if (term) {
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ filename: regex }, { originalName: regex }, { label: regex }, { descricao: regex }];
    }

    const [items, total] = await Promise.all([
      this.importModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-originalJson')
        .lean(),
      this.importModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: string, includeJson = false) {
    const doc = asLeanOne<Record<string, unknown>>(
      await this.importModel.findById(id).lean(),
    );
    if (!doc) {
      throw new NotFoundException('Importação não encontrada');
    }
    return sanitizeImportacao(doc, includeJson);
  }

  async updateMetadata(id: string, payload: { label?: string; descricao?: string }) {
    const update: Record<string, string> = {};
    if (payload.label !== undefined) update.label = payload.label.trim();
    if (payload.descricao !== undefined) update.descricao = payload.descricao.trim();

    const doc = await this.importModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .select('-originalJson')
      .lean();

    if (!doc) {
      throw new NotFoundException('Importação não encontrada');
    }
    return doc;
  }

  async remove(id: string) {
    const doc = await this.importModel.findByIdAndDelete(id).lean();
    if (!doc) {
      throw new NotFoundException('Importação não encontrada');
    }
    return { ok: true, id };
  }

  async listFaturas(id: string, options: { page?: number; limit?: number; search?: string } = {}) {
    const doc = asLeanOne<Record<string, unknown>>(
      await this.importModel.findById(id).lean(),
    );
    if (!doc) {
      throw new NotFoundException('Importação não encontrada');
    }
    if (!doc.originalJson) {
      throw new BadRequestException('Esta importação não possui JSON armazenado');
    }

    let faturas = extractNotaItemsFromJson(doc.originalJson).map(({ empresa, item }) =>
      mapNfItemToPreview(empresa, item),
    );

    const term = options.search?.trim().toLowerCase();
    if (term) {
      faturas = faturas.filter((fatura) =>
        [fatura.numero, fatura.tomador, fatura.nota_api_id, fatura.codigo_servico, fatura.empresa_nome]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term)),
      );
    }

    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(200, Math.max(1, options.limit ?? 50));
    const skip = (page - 1) * limit;
    const items = faturas.slice(skip, skip + limit);

    return {
      items,
      total: faturas.length,
      page,
      limit,
      importacao: sanitizeImportacao(doc, false),
    };
  }

  async getOriginalJson(id: string) {
    const doc = asLeanOne<{
      originalJson?: unknown;
      filename?: string;
      originalName?: string;
      uploadedBy?: unknown;
    }>(
      await this.importModel.findById(id).select('originalJson filename originalName').lean(),
    );
    if (!doc) {
      throw new NotFoundException('Importação não encontrada');
    }
    if (!doc.originalJson) {
      throw new BadRequestException('Esta importação não possui JSON armazenado');
    }
    return doc;
  }

  async reprocess(id: string, notasService: NotasService) {
    const doc = asLeanOne<Record<string, unknown>>(
      await this.importModel.findById(id).lean(),
    );
    if (!doc) {
      throw new NotFoundException('Importação não encontrada');
    }
    if (!doc.originalJson) {
      throw new BadRequestException('Esta importação não possui JSON para reprocessar');
    }

    await this.importModel.findByIdAndUpdate(id, {
      $set: { status: 'processing', errorMessage: null, finishedAt: null },
    });

    try {
      const stats = await this.processJson(id, doc.originalJson, doc.uploadedBy, notasService);
      return { ok: true, id, ...stats };
    } catch (error) {
      await this.markFailed(id, (error as Error).message);
      throw error;
    }
  }

  async processJson(importId: string, json: unknown, _userId: unknown, notasService: NotasService) {
    const start = Date.now();
    const notaItems = extractNotaItemsFromJson(json);
    const dtos = notaItems.map(({ empresa, item }) => ({
      ...mapNfItemToNotaDto(empresa, item),
      importacao_fatura_id: importId,
    }));

    const { imported, updated, ignored } = await notasService.importBulk(dtos, { batchSize: 40 });

    const finishedAt = new Date();
    const processingTimeMs = Date.now() - start;
    await this.importModel.findByIdAndUpdate(importId, {
      $set: {
        processingTimeMs,
        'stats.total_faturas': notaItems.length,
        'stats.imported': imported,
        'stats.updated': updated,
        'stats.ignored': ignored,
        status: 'finished',
        finishedAt,
        originalJson: json,
        errorMessage: null,
      },
    });
    return { imported, updated, ignored, total_faturas: notaItems.length, processingTimeMs };
  }
}
