import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { asLeanMany } from '../../../common/mongoose-lean.util';
import { getCurrentTenantId } from '../../../common/tenant/tenant-storage';
import type { ImportProfileMapping } from '../types/import-profile.types';
import { ImportAiAnalysisService } from './import-ai-analysis.service';

type RagDoc = {
  _id: Types.ObjectId;
  scope: string;
  tenantId?: Types.ObjectId;
  doc_type: string;
  signature_text?: string;
  embedding: number[];
  payload?: Record<string, unknown>;
  quality_score?: number;
};

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function signatureOverlap(a: string, b: string): number {
  const tokenize = (value: string) =>
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2);
  const left = new Set(tokenize(a));
  const right = tokenize(b);
  if (!left.size || !right.length) return 0;
  let hits = 0;
  for (const token of right) {
    if (left.has(token)) hits += 1;
  }
  return hits / Math.max(left.size, right.length);
}

@Injectable()
export class RagRetrievalService {
  constructor(
    @InjectModel('RagDocument') private readonly ragModel: Model<RagDoc>,
    private readonly ai: ImportAiAnalysisService,
  ) {}

  async retrieveContext(signatureText: string, limit = 5): Promise<{ context: string; ids: string[] }> {
    let embedding: number[] = [];
    if (this.ai.supportsEmbeddings()) {
      try {
        embedding = await this.ai.embedText(signatureText);
      } catch {
        embedding = [];
      }
    }

    const tenantId = getCurrentTenantId();
    const filter: Record<string, unknown> = {};
    if (tenantId) {
      filter.$or = [{ tenantId: new Types.ObjectId(tenantId) }, { scope: 'global_template' }];
    }

    const docs = asLeanMany<RagDoc>(await this.ragModel.find(filter).limit(200).lean());

    const ranked = embedding.length
      ? docs
          .map((doc) => ({
            doc,
            score: cosineSimilarity(embedding, doc.embedding || []),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
      : docs
          .map((doc) => ({
            doc,
            score: signatureOverlap(signatureText, doc.signature_text || ''),
          }))
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);

    const context = ranked
      .map(({ doc, score }) => {
        const payload = doc.payload || {};
        return `- [${doc.doc_type} score=${score.toFixed(2)}] ${JSON.stringify(payload)}`;
      })
      .join('\n');

    return { context, ids: ranked.map(({ doc }) => String(doc._id)) };
  }

  async indexProfile(params: {
    mapping: ImportProfileMapping;
    banco_label: string;
    signatureText: string;
    scope?: 'tenant' | 'global_template';
    doc_type?: 'import_profile' | 'correction' | 'bank_signature';
    quality_score?: number;
  }) {
    let embedding: number[] = [];
    if (this.ai.supportsEmbeddings()) {
      try {
        embedding = await this.ai.embedText(params.signatureText);
      } catch {
        embedding = [];
      }
    }

    const tenantId = getCurrentTenantId();

    await this.ragModel.create({
      scope: params.scope || 'tenant',
      tenantId: tenantId ? new Types.ObjectId(tenantId) : undefined,
      doc_type: params.doc_type || 'import_profile',
      signature_text: params.signatureText,
      embedding,
      payload: {
        banco_label: params.banco_label,
        mapping: params.mapping,
      },
      quality_score: params.quality_score ?? 1,
    });
  }

  async indexCorrection(params: {
    signatureText: string;
    before: Partial<ImportProfileMapping>;
    after: ImportProfileMapping;
  }) {
    await this.indexProfile({
      mapping: params.after,
      banco_label: 'correction',
      signatureText: params.signatureText,
      doc_type: 'correction',
      quality_score: 1.2,
    });
  }

  async bumpQuality(docIds: string[], delta: number) {
    if (!docIds.length) return;
    await this.ragModel.updateMany(
      { _id: { $in: docIds.map((id) => new Types.ObjectId(id)) } },
      { $inc: { quality_score: delta, use_count: 1 } },
    );
  }
}
