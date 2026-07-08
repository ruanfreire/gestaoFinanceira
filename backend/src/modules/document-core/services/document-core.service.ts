import { createHash, randomUUID } from 'crypto';
import AdmZip from 'adm-zip';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { cteConnector } from '../connectors/cte/cte.connector';
import { classifyXmlContent } from '../classification/xml-classifier';
import { addDuplicateWarning } from '../connectors/cte/cte.validator';
import { FreteConciliacaoService } from './frete-conciliacao.service';
import { FreteTituloService } from './frete-titulo.service';
import { EntitlementsService } from '../../../common/entitlements/entitlements.service';
import type {
  DocumentEnvelopePayload,
  IngestBatchResult,
  IngestItemResult,
} from '../types/document-envelope.types';
import type { DocumentConnector } from '../types/document-connector.interface';

export type IngestFileInput = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

@Injectable()
export class DocumentCoreService {
  private readonly connectors: DocumentConnector[] = [cteConnector];

  constructor(
    @InjectModel('DocumentEnvelope') private readonly envelopeModel: Model<Record<string, unknown>>,
    @InjectModel('FreteTitulo') private readonly freteTituloModel: Model<Record<string, unknown>>,
    private readonly freteConciliacao: FreteConciliacaoService,
    private readonly freteTituloService: FreteTituloService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  async ingestFiles(files: IngestFileInput[]): Promise<IngestBatchResult> {
    const batchId = `batch_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const expanded = this.expandFiles(files);
    const items: IngestItemResult[] = [];
    let cteOk = 0;
    let cteWarning = 0;
    let failed = 0;
    let skipped = 0;

    for (const file of expanded) {
      const result = await this.ingestOne(file, batchId);
      items.push(result);
      if (result.docType === 'cte') {
        if (result.validation.ok) {
          if (result.validation.warnings.length) cteWarning += 1;
          else cteOk += 1;
        } else {
          failed += 1;
        }
      } else if (result.docType === 'unknown' || result.docType === 'unknown_xml') {
        skipped += 1;
        failed += 1;
      } else {
        skipped += 1;
      }
    }

    return {
      batch_id: batchId,
      summary: {
        total: expanded.length,
        cte_ok: cteOk,
        cte_warning: cteWarning,
        failed,
        skipped,
      },
      items,
    };
  }

  async listDocuments(params: { docType?: string; page?: number; limit?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const filter: Record<string, unknown> = {};
    if (params.docType) filter.docType = params.docType;

    const [items, total] = await Promise.all([
      this.envelopeModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.envelopeModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async getDocument(id: string) {
    const doc = await this.envelopeModel.findById(id).lean();
    if (!doc) throw new NotFoundException('Documento não encontrado');
    return doc;
  }

  async listFreteTitulos(params: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const filter: Record<string, unknown> = {};
    if (params.status) filter.status_pagamento = params.status;

    const [items, total] = await Promise.all([
      this.freteTituloModel
        .find(filter)
        .sort({ data_emissao: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.freteTituloModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  private expandFiles(files: IngestFileInput[]): IngestFileInput[] {
    const out: IngestFileInput[] = [];
    for (const file of files) {
      if (/\.zip$/i.test(file.originalname)) {
        try {
          const zip = new AdmZip(file.buffer);
          for (const entry of zip.getEntries()) {
            if (entry.isDirectory) continue;
            const name = entry.entryName.split('/').pop() ?? entry.entryName;
            if (!/\.xml$/i.test(name)) continue;
            out.push({
              buffer: entry.getData(),
              originalname: name,
              mimetype: 'application/xml',
            });
          }
        } catch {
          out.push(file);
        }
      } else {
        out.push(file);
      }
    }
    return out;
  }

  private async ingestOne(file: IngestFileInput, batchId: string): Promise<IngestItemResult> {
    const contentHash = createHash('sha256').update(file.buffer).digest('hex');
    const ingestedAt = new Date().toISOString();
    const ctx = {
      filename: file.originalname,
      mime: file.mimetype || 'application/octet-stream',
      contentHash,
      ingestedAt,
    };

    const connector = this.resolveConnector(file);
    if (!connector) {
      const kind = classifyXmlContent(file.buffer, file.originalname);
      const docType = kind === 'nfe' ? 'nfe' : kind === 'unknown_xml' ? 'unknown_xml' : 'unknown';
      const saved = await this.envelopeModel.create({
        batchId,
        docType,
        source: { filename: file.originalname, mime: ctx.mime, contentHash, ingestedAt },
        validation: {
          ok: false,
          errors: [{ code: 'UNSUPPORTED_FORMAT', message: 'Formato não suportado nesta versão' }],
          warnings: [],
        },
        confidence: 0,
        links: [],
      });
      return this.toItemResult(String(saved._id), docType, file.originalname, {
        docType,
        source: ctx,
        validation: {
          ok: false,
          errors: [{ code: 'UNSUPPORTED_FORMAT', message: 'Formato não suportado nesta versão' }],
          warnings: [],
        },
        confidence: 0,
        links: [],
      });
    }

    let envelope = await connector.parse(file.buffer, ctx);

    const chave = envelope.fiscalKeys?.chaveAcesso;
    if (chave && envelope.docType === 'cte') {
      const dup = await this.envelopeModel.exists({
        docType: 'cte',
        'fiscalKeys.chaveAcesso': chave,
        validation: { ok: true },
      });
      if (dup) {
        envelope = addDuplicateWarning(envelope, true);
      }
    }

    const saved = await this.envelopeModel.create({
      batchId,
      ...envelope,
    });

    let freteTituloId: string | undefined;
    const logisticsEnabled = await this.entitlementsService.hasModuleForCurrentTenant('logistics_frete');
    if (logisticsEnabled && envelope.docType === 'cte' && envelope.validation.ok && chave) {
      const titulo = await this.upsertFreteTitulo(String(saved._id), envelope);
      freteTituloId = titulo ? String(titulo._id) : undefined;
      if (freteTituloId) {
        await this.freteConciliacao.tryMatchTituloWithLancamentos(freteTituloId);
        await this.freteConciliacao.linkNfeToEnvelopes();
      }
    }

    return this.toItemResult(String(saved._id), envelope.docType, file.originalname, envelope, freteTituloId);
  }

  private resolveConnector(file: IngestFileInput): DocumentConnector | null {
    for (const connector of this.connectors) {
      const result = connector.classify(file.originalname, file.buffer);
      if (result) return connector;
    }
    return null;
  }

  private async upsertFreteTitulo(documentId: string, envelope: DocumentEnvelopePayload) {
    const chave = envelope.fiscalKeys?.chaveAcesso;
    if (!chave) return null;

    const tomador = envelope.parties?.tomador;
    const emitente = envelope.parties?.emitente;
    const emissao = envelope.dates?.emissao ? new Date(envelope.dates.emissao) : undefined;

    try {
      return await this.freteTituloModel.findOneAndUpdate(
        { chave_cte: chave },
        {
          documentEnvelopeId: documentId,
          chave_cte: chave,
          numero: envelope.fiscalKeys?.numero,
          serie: envelope.fiscalKeys?.serie,
          emitente_nome: emitente?.nome,
          emitente_cnpj: emitente?.cnpj ?? emitente?.cpf,
          tomador_nome: tomador?.nome,
          tomador_documento: tomador?.cnpj ?? tomador?.cpf,
          tomador_nome_normalizado: this.freteTituloService.stampTomadorNormalizado(tomador?.nome),
          valor: envelope.amounts?.valorReceber,
          data_emissao: emissao,
          competencia: envelope.dates?.competencia,
          linked_nfe_chaves: (envelope.linkedDocuments ?? [])
            .map((d) => d.chaveAcesso)
            .filter(Boolean),
          status_pagamento: 'aguardando_pagamento',
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch {
      return this.freteTituloModel.findOne({ chave_cte: chave }).lean();
    }
  }

  private toItemResult(
    id: string,
    docType: DocumentEnvelopePayload['docType'],
    filename: string,
    envelope: DocumentEnvelopePayload,
    freteTituloId?: string,
  ): IngestItemResult {
    return {
      id,
      docType,
      filename,
      fiscalKeys: envelope.fiscalKeys,
      amounts: envelope.amounts?.valorReceber !== undefined ? { valorReceber: envelope.amounts.valorReceber } : undefined,
      parties: {
        tomador: envelope.parties?.tomador,
        emitente: envelope.parties?.emitente,
      },
      validation: envelope.validation,
      freteTituloId,
    };
  }
}
