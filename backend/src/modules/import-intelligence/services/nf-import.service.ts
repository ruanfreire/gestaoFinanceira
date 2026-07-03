import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { hashJsonValue } from '../../../common/content-hash.util';
import { asLeanMany, asLeanOne } from '../../../common/mongoose-lean.util';
import { ImportacoesService } from '../../importacoes/importacoes.service';
import { NotasService } from '../../notas/notas.service';
import { PlanLimitsService } from '../../billing/plan-limits.service';
import type {
  NfImportAnalysisResult,
  NfImportProfileMapping,
  NfImportValidationReport,
} from '../types/nf-import-profile.types';
import { HONEST_V1_NF_MAPPING } from '../types/nf-import-profile.types';
import { analyzeNfJsonHeuristic, sanitizeNfStructureSample } from './nf-heuristic-analyzer.service';
import {
  mapNfPairToNotaDto,
  parseNfJsonWithMapping,
  shouldSkipNotaStatus,
} from './nf-json-profile.mapper';
import { ImportAiAnalysisService } from './import-ai-analysis.service';
import { detectJsonInconsistencies } from './nf-validation.util';

type NfImportProfileLean = {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  mapping: NfImportProfileMapping;
  system_key?: string;
  source?: string;
  confidence_score?: number;
  usage_count?: number;
};

function mergeNfAnalysis(
  heuristic: NfImportAnalysisResult,
  ai: Partial<NfImportAnalysisResult> | null,
): NfImportAnalysisResult {
  if (!ai?.mapping) return heuristic;
  return {
    ...heuristic,
    ...ai,
    mapping: ai.mapping,
    profile_name_suggested: ai.profile_name_suggested || heuristic.profile_name_suggested,
    field_confidence: { ...heuristic.field_confidence, ...ai.field_confidence },
    gaps: [...(heuristic.gaps || []), ...(ai.gaps || [])],
    source: ai.source === 'hybrid' || ai.source === 'gemini' ? ai.source : 'hybrid',
  };
}

@Injectable()
export class NfImportService {
  constructor(
    @InjectModel('NfImportProfile') private readonly profileModel: Model<any>,
    @InjectModel('Importacao') private readonly importModel: Model<any>,
    private readonly ai: ImportAiAnalysisService,
    private readonly importacoesService: ImportacoesService,
    private readonly notasService: NotasService,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  async listProfiles() {
    const items = asLeanMany<NfImportProfileLean>(
      await this.profileModel
        .find({ status: { $ne: 'archived' }, source: { $ne: 'system_template' } })
        .sort({ name: 1 })
        .lean(),
    );
    return {
      items: [
        {
          _id: 'system:honest_v1',
          name: 'Formato Honest / padrão',
          description: 'Estrutura data → empresa → nf_lista → items (sync Honest e exportações compatíveis)',
          system_key: 'honest_v1',
          mapping: HONEST_V1_NF_MAPPING,
          source: 'system_template',
        },
        ...items,
      ],
    };
  }

  async getProfile(id: string): Promise<NfImportProfileLean | { mapping: NfImportProfileMapping }> {
    if (id === 'system:honest_v1') {
      return {
        _id: new Types.ObjectId('000000000000000000000001'),
        name: 'Formato Honest / padrão',
        mapping: HONEST_V1_NF_MAPPING,
        system_key: 'honest_v1',
      };
    }
    const profile = asLeanOne<NfImportProfileLean>(await this.profileModel.findById(id).lean());
    if (!profile) throw new NotFoundException('Modelo de importação não encontrado');
    return profile;
  }

  resolveProfileMapping(profile: NfImportProfileLean | { mapping: NfImportProfileMapping; system_key?: string }) {
    if (profile.system_key === 'honest_v1') return HONEST_V1_NF_MAPPING;
    return profile.mapping;
  }

  async saveProfile(params: {
    name: string;
    description?: string;
    mapping: NfImportProfileMapping;
    userId?: string;
    confidence_score?: number;
  }) {
    const doc = await this.profileModel.create({
      name: params.name.trim(),
      description: params.description?.trim(),
      mapping: params.mapping,
      source: 'user',
      status: 'active',
      confidence_score: params.confidence_score ?? 0.8,
      confirmed_by: params.userId ? new Types.ObjectId(params.userId) : undefined,
      confirmed_at: new Date(),
    });
    return doc.toObject();
  }

  async updateProfile(
    id: string,
    params: {
      name?: string;
      description?: string;
      mapping?: NfImportProfileMapping;
      userId?: string;
    },
  ) {
    if (id === 'system:honest_v1') {
      throw new BadRequestException('O modelo padrão Honest não pode ser editado.');
    }
    const update: Record<string, unknown> = {};
    if (params.name !== undefined) update.name = params.name.trim();
    if (params.description !== undefined) update.description = params.description.trim();
    if (params.mapping) update.mapping = params.mapping;
    const doc = await this.profileModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .lean();
    if (!doc) throw new NotFoundException('Modelo não encontrado');
    return doc;
  }

  async deleteProfile(id: string) {
    if (id === 'system:honest_v1') {
      throw new BadRequestException('O modelo padrão Honest não pode ser excluído.');
    }
    const doc = await this.profileModel.findByIdAndUpdate(
      id,
      { $set: { status: 'archived' } },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Modelo não encontrado');
    return { ok: true, id };
  }

  async analyzeUpload(content: string, fileName: string, userId?: string): Promise<NfImportAnalysisResult> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BadRequestException('Arquivo JSON inválido');
    }

    const heuristic = analyzeNfJsonHeuristic(content, fileName);
    const aiAttempted = this.ai.isEnabled() && heuristic.mapping.structure !== 'honest_v1';
    const aiPartial = aiAttempted
      ? await this.ai.analyzeNfJsonMapping({
          heuristic,
          sanitizedStructure: sanitizeNfStructureSample(parsed),
          ragContext: '',
          userId,
        })
      : null;

    let merged = mergeNfAnalysis(heuristic, aiPartial);
    const { previews, errors } = parseNfJsonWithMapping(parsed, merged.mapping);
    const aiMappingApplied =
      JSON.stringify(heuristic.mapping) !== JSON.stringify(merged.mapping);

    merged = {
      ...merged,
      sample: previews.slice(0, 5),
      total_notas: previews.length,
      parse_errors: errors.slice(0, 20),
      ai_attempted: aiAttempted || heuristic.mapping.structure === 'honest_v1',
      ai_applied: Boolean(aiPartial?.mapping) || aiMappingApplied,
      ai_provider: this.ai.isEnabled() ? this.ai.provider() : undefined,
    };

    if (merged.total_notas === 0) {
      merged.gaps = [
        ...merged.gaps,
        {
          field: 'notas',
          severity: 'error',
          message: 'Nenhuma nota encontrada. Ajuste o modelo ou envie outro arquivo.',
        },
      ];
    }

    return merged;
  }

  async previewFile(
    content: string,
    mapping: NfImportProfileMapping,
  ): Promise<NfImportValidationReport> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return {
        valid: false,
        rows_ok: 0,
        rows_failed: 1,
        errors: ['JSON inválido'],
        warnings: [],
        sample: [],
        inconsistencies: [],
      };
    }

    const { previews, errors } = parseNfJsonWithMapping(parsed, mapping);
    const inconsistencies = detectJsonInconsistencies(previews);
    return {
      valid: previews.length > 0,
      rows_ok: previews.length,
      rows_failed: errors.length,
      errors: errors.slice(0, 30),
      warnings: inconsistencies.length ? [`${inconsistencies.length} inconsistência(s) detectada(s).`] : [],
      sample: previews.slice(0, 5),
      inconsistencies,
    };
  }

  async importFile(params: {
    content: string;
    fileName: string;
    profileId: string;
    userId?: string;
    mappingOverride?: NfImportProfileMapping;
    profileName?: string;
    saveProfile?: boolean;
  }) {
    await this.planLimitsService.assertCanImport();

    const profile = await this.getProfile(params.profileId);
    let mapping = params.mappingOverride || this.resolveProfileMapping(profile as NfImportProfileLean);

    let parsed: unknown;
    try {
      parsed = JSON.parse(params.content);
    } catch {
      throw new BadRequestException('Arquivo JSON inválido');
    }

    const contentHash = hashJsonValue(parsed);
    await this.importacoesService.assertJsonNotDuplicate(contentHash);

    if (params.saveProfile && params.profileName?.trim()) {
      await this.saveProfile({
        name: params.profileName.trim(),
        mapping,
        userId: params.userId,
        confidence_score: 0.85,
      });
    }

    const { pairs, errors } = parseNfJsonWithMapping(parsed, mapping);
    if (pairs.length === 0) {
      throw new BadRequestException(errors[0] || 'Nenhuma nota encontrada no arquivo.');
    }

    const saved = await this.importacoesService.createRecord({
      filename: params.fileName,
      originalName: params.fileName,
      uploadedBy: params.userId,
      status: 'processing',
      contentHash,
    });

    const importId = String(saved._id);
    const skipPatterns = mapping.skip_status_patterns ?? ['CANCEL'];

    try {
      const dtos = pairs
        .map(({ empresa, item }) => {
          const dto = mapNfPairToNotaDto(empresa, item, mapping);
          return { dto, skip: shouldSkipNotaStatus(dto.status_emissao, skipPatterns) };
        })
        .filter((row) => !row.skip)
        .map(({ dto }) => ({
          ...dto,
          importacao_fatura_id: importId,
        }));

      if (dtos.length === 0) {
        throw new BadRequestException('Nenhuma nota válida para importar após aplicar o modelo.');
      }

      const { imported, updated, ignored } = await this.notasService.importBulk(dtos, { batchSize: 40 });
      const result = await this.importacoesService.finalizeJsonImport(importId, parsed, params.userId, {
        imported,
        updated,
        ignored,
        total_faturas: dtos.length,
      });

      if (params.profileId !== 'system:honest_v1') {
        await this.profileModel.findByIdAndUpdate(params.profileId, {
          $inc: { usage_count: 1 },
          $set: { last_used_at: new Date() },
        });
      }

      return {
        ok: true,
        id: importId,
        ...result,
        profile_id: params.profileId,
      };
    } catch (error) {
      await this.importacoesService.markFailed(importId, (error as Error).message, params.userId);
      throw error;
    }
  }
}
