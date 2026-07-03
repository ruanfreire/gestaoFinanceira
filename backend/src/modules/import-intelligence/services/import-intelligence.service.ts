import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { hashTextContent } from '../../../common/content-hash.util';
import { asLeanMany, asLeanOne } from '../../../common/mongoose-lean.util';
import {
  buildFluxoCaixaFilename,
  type FluxoCaixaExportParams,
  resolveFluxoCaixaHeader,
} from '../../../common/fluxo-caixa.config';
import { buildFluxoCaixaSheetName, resolveFluxoCaixaCategoriaCartao } from '../../../common/fluxo-caixa-lista';
import type { FluxoCaixaRow } from '../../../common/fluxo-caixa.export';
import type { FluxoCaixaLayout } from '../../../common/fluxo-caixa-lista';
import {
  annotateLancamentosOrigem,
  buildDateFilter,
  collectValidNotaIds,
  detectNubankOrigemFromMapping,
  enrichHeaderFromNotas,
  filterLancamentosForFluxoCaixaExport,
  mapLancamentosToFluxoCaixaRows,
  resolveExportDateRange,
  resolveMesCompetenciaNf,
  resolveStatementMonthFromFileName,
  splitNubankLancamentosFluxoCaixa,
} from '../../../common/fluxo-caixa-data.util';
import { buildFluxoCaixaWorkbook } from '../../../common/fluxo-caixa.export';
import { resolveSaldoInicialAutomatico, persistImportSaldos } from '../../../common/fluxo-caixa-saldo.resolver';
import { extractStatementBalances } from '../../../common/statement-balance.util';
import { extractStatementFileMetadata } from '../../../common/statement-metadata.util';
import { sumNetMovimentos } from '../../../common/fluxo-caixa-saldo.util';
import { normalizeName } from '../../../common/name-match.util';
import { mapScoredCandidatas } from '../../../common/conciliacao-response.util';
import { resolveCreditoMatch } from '../../conciliacao/credito-match.util';
import { sanitizePagadorNome, extractPagadorFromDescricao, isDirtyPagadorNome } from '../../../common/pagador-from-descricao.util';
import { NotasService } from '../../notas/notas.service';
import { PlanLimitsService } from '../../billing/plan-limits.service';
import type {
  ImportAnalysisResult,
  ImportProfileMapping,
  ImportValidationReport,
  NormalizedLancamentoRow,
  NormalizedLancamentoSample,
} from '../types/import-profile.types';
import {
  analyzeCsvHeuristic,
  buildFileSignature,
  inspectFileContent,
  mergeAnalysis,
  parseWithMapping,
  defaultMapping,
} from './heuristic-analyzer.service';
import { analyzeJsonHeuristic, parseJsonWithMapping } from './json-heuristic-analyzer.service';
import { GeminiUsageService } from './gemini-usage.service';
import { ImportAiAnalysisService } from './import-ai-analysis.service';
import { RagRetrievalService } from './rag-retrieval.service';
import { parseCsvLine, parseDelimitedLine, sanitizeSampleValue } from '../utils/csv-parse.util';
import { getImportPreset, listImportPresets, type ImportPreset } from '../import-presets';

type ImportProfileLean = {
  _id: Types.ObjectId;
  name: string;
  banco_label: string;
  empresa_nome?: string;
  empresa_cnpj?: string;
  conta_corrente?: string;
  mapping: ImportProfileMapping;
  system_key?: string;
  source?: string;
  confidence_score?: number;
};

type BankLancamentoFluxoLean = {
  nota_id?: unknown;
  data?: Date | string;
  descricao?: string;
  valor?: number;
  pagador_nome?: string;
  tipo_movimento?: 'entrada' | 'saida';
  origem?: 'conta' | 'cartao';
  importacao_id?: unknown;
  json_original?: Record<string, unknown>;
};

export type FluxoCaixaPreparedData = {
  header: ReturnType<typeof resolveFluxoCaixaHeader>;
  rows: FluxoCaixaRow[];
  profile: ImportProfileLean;
  layout: FluxoCaixaLayout;
  sheetName: string;
};

type BankLancamentoLean = {
  _id: Types.ObjectId;
  pagador_nome?: string;
  valor?: number;
  data?: Date | string;
  transacao_id?: string;
  descricao?: string;
  status_conciliacao?: string;
  importacao_id?: Types.ObjectId;
};

@Injectable()
export class ImportIntelligenceService implements OnModuleInit {
  private readonly logger = new Logger(ImportIntelligenceService.name);

  constructor(
    @InjectModel('ImportProfile') private readonly profileModel: Model<any>,
    @InjectModel('ImportAnalysisSession') private readonly sessionModel: Model<any>,
    @InjectModel('RagDocument') private readonly ragModel: Model<any>,
    @InjectModel('BankImportacao') private readonly importModel: Model<any>,
    @InjectModel('BankLancamento') private readonly lancamentoModel: Model<any>,
    @InjectModel('Nota') private readonly notaModel: Model<any>,
    private readonly ai: ImportAiAnalysisService,
    private readonly rag: RagRetrievalService,
    private readonly notasService: NotasService,
    private readonly planLimitsService: PlanLimitsService,
    private readonly config: ConfigService,
    private readonly geminiUsage: GeminiUsageService,
  ) {}

  async onModuleInit() {
    await this.purgeLegacySystemTemplates();
    await this.purgeLegacyStaticImports();
  }

  /** Remove templates Asaas/Nubank legados — perfis passam a ser só os criados pelo usuário. */
  private async purgeLegacySystemTemplates() {
    const [profiles, rag] = await Promise.all([
      this.profileModel.deleteMany({ source: 'system_template' }),
      this.ragModel.deleteMany({ scope: 'global_template' }),
    ]);
    if (profiles.deletedCount > 0 || rag.deletedCount > 0) {
      this.logger.log(
        `Templates legados removidos: ${profiles.deletedCount} perfil(is), ${rag.deletedCount} doc(s) RAG`,
      );
    }
  }

  /** Remove importações estáticas Asaas/Nubank — fluxo único via import-intelligence. */
  private async purgeLegacyStaticImports() {
    const conn = this.profileModel.db;
    const collections = [
      'asaasimportacaos',
      'asaaslancamentos',
      'nubankimportacaos',
      'nubanklancamentos',
    ];
    for (const name of collections) {
      try {
        const result = await conn.collection(name).deleteMany({});
        if (result.deletedCount > 0) {
          this.logger.log(`Importação estática legada (${name}): ${result.deletedCount} registro(s) removido(s)`);
        }
      } catch {
        // coleção pode não existir em ambientes novos
      }
    }
  }

  listPresets() {
    return { items: listImportPresets() };
  }

  async listProfiles() {
    const items = asLeanMany(
      await this.profileModel
        .find({ status: { $ne: 'archived' }, source: { $ne: 'system_template' } })
        .sort({ name: 1 })
        .lean(),
    );
    return { items };
  }

  async getProfile(id: string): Promise<ImportProfileLean> {
    const profile = asLeanOne<ImportProfileLean>(await this.profileModel.findById(id).lean());
    if (!profile) throw new NotFoundException('Perfil não encontrado');
    return profile;
  }

  async saveProfile(params: {
    name: string;
    banco_label: string;
    empresa_nome?: string;
    empresa_cnpj?: string;
    conta_corrente?: string;
    mapping: ImportProfileMapping;
    userId?: string;
    confidence_score?: number;
    file_kind?: 'csv' | 'json' | 'xlsx';
    system_key?: string;
  }) {
    const payload = {
      name: params.name,
      banco_label: params.banco_label,
      empresa_nome: params.empresa_nome?.trim() || undefined,
      empresa_cnpj: params.empresa_cnpj?.trim() || undefined,
      conta_corrente: params.conta_corrente,
      mapping: params.mapping,
      file_kind: params.file_kind || 'csv',
      source: 'user' as const,
      status: 'active' as const,
      confidence_score: params.confidence_score ?? 0,
      confirmed_by: params.userId ? new Types.ObjectId(params.userId) : undefined,
      confirmed_at: new Date(),
      ...(params.system_key ? { system_key: params.system_key } : {}),
    };

    let profile;
    if (params.system_key) {
      const existing = await this.profileModel.findOne({
        system_key: params.system_key,
        status: { $ne: 'archived' },
      });
      if (existing) {
        profile = await this.profileModel.findByIdAndUpdate(existing._id, { $set: payload }, { new: true });
      }
    }
    if (!profile) {
      profile = await this.profileModel.create(payload);
    }

    const signature = buildFileSignature(
      Object.values(params.mapping.columns).filter(Boolean) as string[],
      params.mapping.delimiter,
    );
    await this.rag.indexProfile({
      mapping: params.mapping,
      banco_label: params.banco_label,
      signatureText: signature,
    });

    return profile;
  }

  async updateProfile(
    id: string,
    params: {
      name?: string;
      banco_label?: string;
      empresa_nome?: string;
      empresa_cnpj?: string;
      conta_corrente?: string;
      mapping?: ImportProfileMapping;
      userId?: string;
    },
  ) {
    const existing = await this.profileModel.findById(id);
    if (!existing || existing.status === 'archived') {
      throw new NotFoundException('Perfil não encontrado');
    }

    const update: Record<string, unknown> = { confirmed_at: new Date() };
    if (params.name !== undefined) {
      const name = params.name.trim();
      if (!name) throw new BadRequestException('Nome do perfil é obrigatório');
      update.name = name;
    }
    if (params.banco_label !== undefined) {
      const banco_label = params.banco_label.trim();
      if (!banco_label) throw new BadRequestException('Nome do banco é obrigatório');
      update.banco_label = banco_label;
    }
    if (params.empresa_nome !== undefined) {
      update.empresa_nome = params.empresa_nome.trim() || undefined;
    }
    if (params.empresa_cnpj !== undefined) {
      update.empresa_cnpj = params.empresa_cnpj.trim() || undefined;
    }
    if (params.conta_corrente !== undefined) {
      update.conta_corrente = params.conta_corrente.trim() || undefined;
    }
    if (params.mapping) {
      update.mapping = params.mapping;
    }
    if (params.userId) {
      update.confirmed_by = new Types.ObjectId(params.userId);
    }

    const profile = await this.profileModel.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!profile) throw new NotFoundException('Perfil não encontrado');

    if (params.mapping) {
      const signature = buildFileSignature(
        Object.values(params.mapping.columns).filter(Boolean) as string[],
        params.mapping.delimiter,
      );
      await this.rag.indexProfile({
        mapping: params.mapping,
        banco_label: String(profile.banco_label),
        signatureText: signature,
      });
    }

    return profile;
  }

  async deleteProfile(id: string) {
    const profile = await this.profileModel.findById(id);
    if (!profile || profile.status === 'archived') {
      throw new NotFoundException('Perfil não encontrado');
    }

    await this.purgeImportsByProfile(String(profile._id));
    await this.profileModel.findByIdAndUpdate(id, { $set: { status: 'archived' } });
    return { ok: true, id };
  }

  private async purgeImportsByProfile(profileId: string) {
    const imports = asLeanMany<{ _id: unknown }>(
      await this.importModel.find({ profile_id: profileId }).select('_id').lean(),
    );
    for (const imp of imports) {
      await this.purgeBankImport(String(imp._id));
    }
  }

  private async purgeBankImport(importacaoId: string) {
    const lancamentos = asLeanMany<{
      _id: unknown;
      nota_id?: unknown;
      status_conciliacao?: string;
    }>(await this.lancamentoModel.find({ importacao_id: importacaoId }).lean());

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

    await this.lancamentoModel.deleteMany({ importacao_id: importacaoId });
    await this.importModel.findByIdAndDelete(importacaoId);
  }

  async analyzeUpload(
    fileBuffer: Buffer,
    fileName: string,
    userId?: string,
    presetKey?: string,
  ): Promise<ImportAnalysisResult> {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) {
      return this.analyzePdfUpload(fileBuffer, fileName, userId);
    }
    const content = fileBuffer.toString('utf-8');
    if (lower.endsWith('.json')) {
      return this.analyzeJsonUpload(content, fileName, userId);
    }
    const preset = presetKey ? getImportPreset(presetKey) : null;
    if (preset) {
      return this.analyzeCsvWithPreset(content, fileName, userId, preset);
    }
    return this.analyzeCsvUpload(content, fileName, userId);
  }

  /** @deprecated use analyzeUpload */
  async analyzeFile(content: string, fileName: string, userId?: string): Promise<ImportAnalysisResult> {
    return this.analyzeUpload(Buffer.from(content, 'utf-8'), fileName, userId);
  }

  private parseWithFileFormat(content: string, fileName: string, mapping: ImportProfileMapping) {
    if (fileName.toLowerCase().endsWith('.json')) {
      return parseJsonWithMapping(content, mapping);
    }
    return parseWithMapping(content, mapping);
  }

  private async parseAndEnrich(
    content: string,
    fileName: string,
    mapping: ImportProfileMapping,
    userId?: string,
  ): Promise<{ rows: NormalizedLancamentoRow[]; errors: string[] }> {
    const { rows, errors } = this.parseWithFileFormat(content, fileName, mapping);
    const enriched = await this.enrichPagadorNames(rows, userId);
    return { rows: enriched, errors };
  }

  private async enrichPagadorNames(
    rows: NormalizedLancamentoRow[],
    userId?: string,
  ): Promise<NormalizedLancamentoRow[]> {
    const sanitized = rows.map((row) => {
      let pagador = row.pagador_nome ? sanitizePagadorNome(row.pagador_nome) : undefined;

      if (row.tipo_movimento === 'entrada' && row.descricao?.trim()) {
        if (!pagador || isDirtyPagadorNome(pagador)) {
          const fromDesc = extractPagadorFromDescricao(row.descricao, row.tipo_movimento);
          if (fromDesc) pagador = sanitizePagadorNome(fromDesc);
        }
      } else if (row.tipo_movimento === 'saida') {
        pagador = undefined;
      }

      return { ...row, pagador_nome: pagador };
    });

    if (!this.ai.isEnabled()) return sanitized;

    const candidates = sanitized.filter(
      (row) =>
        row.tipo_movimento === 'entrada' &&
        row.descricao?.trim() &&
        (!row.pagador_nome || isDirtyPagadorNome(row.pagador_nome)),
    );
    if (candidates.length === 0) return sanitized;

    const aiMap = await this.ai.extractPagadoresFromDescricoes(
      candidates.slice(0, 60).map((row) => ({
        id: row.transacao_id,
        descricao: row.descricao,
      })),
      userId,
    );
    if (aiMap.size === 0) return sanitized;

    return sanitized.map((row) => {
      const fromAi = aiMap.get(row.transacao_id);
      if (!fromAi) return row;
      if (row.pagador_nome && !isDirtyPagadorNome(row.pagador_nome)) return row;
      return { ...row, pagador_nome: sanitizePagadorNome(fromAi) };
    });
  }

  private async recordAnalysisSession(params: {
    content: string;
    fileName: string;
    merged: ImportAnalysisResult;
    heuristic: ImportAnalysisResult;
    geminiPartial: Partial<ImportAnalysisResult> | null;
    ragIds: string[];
    rows: number;
    errors: number;
    userId?: string;
    outcome?: string;
  }) {
    await this.sessionModel.create({
      userId: params.userId ? new Types.ObjectId(params.userId) : undefined,
      file_hash: hashTextContent(params.content),
      file_name: params.fileName,
      file_kind: params.merged.file_kind,
      heuristic_result: params.heuristic,
      gemini_result: params.geminiPartial,
      rag_context_ids: params.ragIds.map((id) => new Types.ObjectId(id)),
      validation_report: { rows: params.rows, errors: params.errors },
      prompt_version: params.geminiPartial?.prompt_version,
      outcome: params.outcome || 'confirmed',
    });
  }

  private resolvePresetHeaderRow(lines: string[], preset: ImportPreset): number {
    for (let i = 0; i < Math.min(lines.length, 25); i += 1) {
      const cells = parseCsvLine(lines[i]);
      const normalized = cells.map((c) => c.toLowerCase());
      if (preset.key === 'asaas' && cells[0] === 'Data' && cells[1]?.includes('Transa')) {
        return i + 1;
      }
      if (
        preset.key === 'nubank' &&
        (normalized.includes('data') || normalized.includes('date')) &&
        (normalized.includes('valor') || normalized.includes('amount') || normalized.includes('title'))
      ) {
        return i + 1;
      }
    }
    return preset.mapping.header_row;
  }

  private async analyzeCsvWithPreset(
    content: string,
    fileName: string,
    userId: string | undefined,
    preset: ImportPreset,
  ): Promise<ImportAnalysisResult> {
    const { lines } = inspectFileContent(content, fileName);
    const mapping: ImportProfileMapping = {
      ...preset.mapping,
      header_row: this.resolvePresetHeaderRow(lines, preset),
    };

    const headerCells = parseDelimitedLine(lines[mapping.header_row - 1] || '', mapping.delimiter);
    const headers = headerCells.filter(Boolean);
    const { rows, errors } = parseWithMapping(content, mapping);
    const enrichedRows = await this.enrichPagadorNames(rows, userId);
    const fileMetadata = this.attachFileMetadata(content, mapping);
    const sampleRawRows = lines
      .slice(mapping.header_row, mapping.header_row + 3)
      .map((line) => parseDelimitedLine(line, mapping.delimiter));

    const merged: ImportAnalysisResult = {
      file_kind: 'csv',
      source: 'rag_template',
      mapping,
      field_confidence: {
        data: 1,
        valor: 1,
        descricao: 0.95,
        transacao_id: mapping.columns.transacao_id ? 0.95 : 0,
        tipo_transacao: mapping.columns.tipo_transacao ? 0.95 : 0,
        saldo: mapping.columns.saldo ? 0.95 : 0,
        documento: mapping.columns.documento ? 0.95 : 0,
        pagador_nome: 0.5,
      },
      gaps: [],
      banco_label_suggested: preset.banco_label,
      sample_normalized: this.toSampleRows(enrichedRows),
      total_rows_parsed: enrichedRows.length,
      parse_errors: errors.slice(0, 20),
      rag_document_ids: [],
      overall_confidence: enrichedRows.length > 0 ? 0.95 : 0.3,
      detected_headers: headers,
      sample_raw_rows: sampleRawRows,
      file_metadata: fileMetadata,
    };

    if (enrichedRows.length === 0) {
      merged.gaps.push({
        field: 'rows',
        severity: 'error',
        message: `Não encontramos lançamentos no formato ${preset.name}. Confira se exportou o CSV correto.`,
      });
    }

    await this.recordAnalysisSession({
      content,
      fileName,
      merged,
      heuristic: merged,
      geminiPartial: null,
      ragIds: [],
      rows: enrichedRows.length,
      errors: errors.length,
      userId,
    });

    return merged;
  }

  private async analyzeCsvUpload(content: string, fileName: string, userId?: string): Promise<ImportAnalysisResult> {
    const heuristic = analyzeCsvHeuristic(content, fileName);
    const { lines } = inspectFileContent(content, fileName);

    const headerCells = parseDelimitedLine(
      lines[heuristic.mapping.header_row - 1] || '',
      heuristic.mapping.delimiter,
    );
    const headers = headerCells.filter(Boolean);
    const sanitizedHeaders = headerCells.map(sanitizeSampleValue);
    const sanitizedSampleRows = lines
      .slice(heuristic.mapping.header_row, heuristic.mapping.header_row + 5)
      .map((line) => parseDelimitedLine(line, heuristic.mapping.delimiter).map(sanitizeSampleValue));

    const signature = buildFileSignature(headerCells, heuristic.mapping.delimiter);
    const ragResult = await this.rag.retrieveContext(signature);
    const geminiPartial = await this.ai.analyzeExtratoCsv({
      heuristic,
      sanitizedHeaders,
      sanitizedSampleRows,
      ragContext: ragResult.context,
      userId,
    });

    let merged = mergeAnalysis(heuristic, geminiPartial);
    const { rows, errors } = this.parseWithFileFormat(content, fileName, merged.mapping);
    const enrichedRows = await this.enrichPagadorNames(rows, userId);
    const fileMetadata = this.attachFileMetadata(content, merged.mapping);
    const sampleRawRows = lines
      .slice(heuristic.mapping.header_row, heuristic.mapping.header_row + 3)
      .map((line) => parseDelimitedLine(line, merged.mapping.delimiter));
    merged = {
      ...merged,
      sample_normalized: this.toSampleRows(enrichedRows),
      total_rows_parsed: enrichedRows.length,
      parse_errors: errors.slice(0, 20),
      rag_document_ids: ragResult.ids,
      overall_confidence: this.computeOverallConfidence(merged),
      detected_headers: headers,
      sample_raw_rows: sampleRawRows,
      file_metadata: fileMetadata,
    };

    if (merged.overall_confidence < this.ai.minConfidence()) {
      merged.gaps = [
        ...merged.gaps,
        {
          field: 'confidence',
          severity: 'warning',
          message: 'Confiança abaixo do limiar — revise o mapeamento antes de importar.',
        },
      ];
    }

    await this.recordAnalysisSession({
      content,
      fileName,
      merged,
      heuristic,
      geminiPartial,
      ragIds: ragResult.ids,
      rows: enrichedRows.length,
      errors: errors.length,
      userId,
    });

    return merged;
  }

  private async analyzeJsonUpload(content: string, fileName: string, userId?: string): Promise<ImportAnalysisResult> {
    const heuristic = analyzeJsonHeuristic(content, fileName);

    if (heuristic.detected_json_kind === 'nota_fiscal') {
      await this.recordAnalysisSession({
        content,
        fileName,
        merged: heuristic,
        heuristic,
        geminiPartial: null,
        ragIds: [],
        rows: heuristic.total_rows_parsed,
        errors: 0,
        userId,
        outcome: 'rejected',
      });
      return heuristic;
    }

    const sanitizedStructure = JSON.stringify(
      (heuristic.detected_headers || []).slice(0, 20),
      null,
      0,
    );
    const signature = buildFileSignature(heuristic.detected_headers || [], ',');
    const ragResult = await this.rag.retrieveContext(signature);
    const geminiPartial = await this.ai.analyzeJsonExtrato({
      heuristic,
      sanitizedStructure,
      ragContext: ragResult.context,
      userId,
    });

    let merged = mergeAnalysis(heuristic, geminiPartial);
    const { rows, errors } = parseJsonWithMapping(content, merged.mapping);
    const enrichedRows = await this.enrichPagadorNames(rows, userId);
    merged = {
      ...merged,
      file_kind: 'json',
      sample_normalized: this.toSampleRows(enrichedRows),
      total_rows_parsed: enrichedRows.length,
      parse_errors: errors.slice(0, 20),
      rag_document_ids: ragResult.ids,
      overall_confidence: this.computeOverallConfidence(merged),
      detected_headers: heuristic.detected_headers,
      detected_json_kind: 'bank_transactions',
    };

    await this.recordAnalysisSession({
      content,
      fileName,
      merged,
      heuristic,
      geminiPartial,
      ragIds: ragResult.ids,
      rows: enrichedRows.length,
      errors: errors.length,
      userId,
    });

    return merged;
  }

  private async analyzePdfUpload(
    fileBuffer: Buffer,
    fileName: string,
    userId?: string,
  ): Promise<ImportAnalysisResult> {
    const ragResult = await this.rag.retrieveContext('pdf:extrato-bancario');
    const geminiPartial = await this.ai.analyzePdfExtrato({
      fileBuffer,
      ragContext: ragResult.context,
      userId,
    });

    const mapping = geminiPartial?.mapping || defaultMapping();
    const merged: ImportAnalysisResult = {
      file_kind: 'unknown',
      banco_label_suggested: geminiPartial?.banco_label_suggested || fileName.replace(/\.pdf$/i, ''),
      mapping,
      field_confidence: geminiPartial?.field_confidence || {},
      overall_confidence: geminiPartial ? 0.75 : 0.3,
      gaps: [
        ...(geminiPartial?.gaps || []),
        {
          field: 'pdf',
          severity: 'info',
          message:
            'PDF analisado para sugerir perfil. Para importar, exporte CSV do banco ou converta o extrato para CSV.',
        },
      ],
      source: geminiPartial?.source || 'heuristic',
      prompt_version: geminiPartial?.prompt_version,
      rag_document_ids: ragResult.ids,
      sample_normalized: [],
      total_rows_parsed: 0,
      parse_errors: [],
    };

    await this.recordAnalysisSession({
      content: fileName,
      fileName,
      merged,
      heuristic: merged,
      geminiPartial,
      ragIds: ragResult.ids,
      rows: 0,
      errors: 0,
      userId,
    });

    return merged;
  }

  private toSampleRows(rows: NormalizedLancamentoRow[]): NormalizedLancamentoSample[] {
    return rows.slice(0, 10).map((row) => ({
      transacao_id: row.transacao_id,
      data: row.data.toISOString(),
      valor: row.valor,
      descricao: row.descricao,
      pagador_nome: row.pagador_nome,
      tipo_movimento: row.tipo_movimento,
      tipo_transacao: row.tipo_transacao,
      saldo_pos: row.saldo_pos,
      documento_ref: row.documento_ref,
      fatura_numero: row.fatura_numero,
    }));
  }

  private attachFileMetadata(content: string, mapping: ImportProfileMapping) {
    return extractStatementFileMetadata(content, mapping);
  }

  async previewFile(
    content: string,
    mapping: ImportProfileMapping,
    fileName = 'extrato.csv',
    userId?: string,
  ): Promise<ImportValidationReport> {
    const { rows, errors } = await this.parseAndEnrich(content, fileName, mapping, userId);
    const valid = rows.length > 0 && errors.length === 0;
    return {
      valid,
      rows_ok: rows.length,
      rows_failed: errors.length,
      errors: errors.slice(0, 30),
      warnings: rows.length === 0 ? ['Nenhuma linha válida encontrada.'] : [],
      sample_normalized: rows.slice(0, 5).map((row) => ({
        transacao_id: row.transacao_id,
        data: row.data.toISOString(),
        valor: row.valor,
        descricao: row.descricao,
        pagador_nome: row.pagador_nome,
        tipo_movimento: row.tipo_movimento,
        tipo_transacao: row.tipo_transacao,
        saldo_pos: row.saldo_pos,
        documento_ref: row.documento_ref,
        fatura_numero: row.fatura_numero,
      })),
    };
  }

  async importFile(params: {
    content: string;
    fileName: string;
    profileId: string;
    userId?: string;
    label?: string;
    sessionId?: string;
    mappingBeforeImport?: ImportProfileMapping;
    mappingOverride?: ImportProfileMapping;
    suggestionAcceptedWithoutEdit?: boolean;
  }) {
    await this.planLimitsService.assertCanImport();

    if (params.fileName.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException(
        'Importação de PDF não suportada. Exporte CSV do banco ou converta o extrato.',
      );
    }

    const profile = await this.getProfile(params.profileId);
    const mapping = params.mappingOverride || (profile.mapping as ImportProfileMapping);
    const validation = await this.previewFile(params.content, mapping, params.fileName, params.userId);
    if (!validation.valid && validation.rows_ok === 0) {
      throw new BadRequestException(
        validation.errors[0] || 'Não encontramos lançamentos válidos com este mapeamento.',
      );
    }

    const contentHash = hashTextContent(params.content);
    const duplicate = asLeanOne<{ _id: unknown; profile_id?: unknown; banco_label?: string; originalName?: string }>(
      await this.importModel
        .findOne({ contentHash })
        .select('_id profile_id banco_label originalName')
        .lean(),
    );
    if (duplicate) {
      const dupProfile = duplicate.profile_id
        ? asLeanOne<{ status?: string }>(
            await this.profileModel.findById(duplicate.profile_id).select('status').lean(),
          )
        : null;
      const stale = !dupProfile || dupProfile.status === 'archived';
      const sameProfile = String(duplicate.profile_id) === String(profile._id);

      if (stale) {
        await this.purgeBankImport(String(duplicate._id));
        this.logger.log(`Importação órfã removida para permitir reenvio: ${duplicate._id}`);
      } else if (sameProfile) {
        throw new BadRequestException(
          'Este arquivo já foi importado. Veja em Arquivos → Histórico ou exclua a importação anterior.',
        );
      } else {
        const label = duplicate.banco_label || duplicate.originalName || 'outro banco';
        throw new BadRequestException(
          `Este arquivo já foi importado em "${label}". Veja em Arquivos → Histórico ou exclua a importação anterior.`,
        );
      }
    }

    if (params.mappingOverride) {
      await this.profileModel.findByIdAndUpdate(profile._id, { $set: { mapping: params.mappingOverride } });
    }

    const { rows } = await this.parseAndEnrich(params.content, params.fileName, mapping, params.userId);
    const previewRows = validation.rows_ok;
    const importOrigem = detectNubankOrigemFromMapping(mapping);
    const statementBalances = extractStatementBalances(params.content, mapping);

    let importacao;
    try {
      importacao = await this.importModel.create({
        profile_id: profile._id,
        banco_label: profile.banco_label,
        filename: params.fileName,
        originalName: params.fileName,
        label: params.label,
        periodo: resolveStatementMonthFromFileName(params.fileName),
        uploadedBy: params.userId ? new Types.ObjectId(params.userId) : undefined,
        contentHash,
        originalCsv: params.content,
        origem: importOrigem,
        transacao_ids: rows.map((r) => r.transacao_id),
        status: 'processing',
        stats: {
          total_linhas: rows.length,
          entradas: 0,
          saidas: 0,
          conciliado_auto: 0,
          pendente_vinculo: 0,
          conciliado_manual: 0,
          sem_match: 0,
          extrato: 0,
          imported: 0,
          skipped: 0,
        },
      });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000) {
        throw new BadRequestException(
          'Este arquivo já foi importado. Veja em Arquivos → Histórico ou envie outro extrato.',
        );
      }
      throw error;
    }

    const stats = {
      total_linhas: rows.length,
      entradas: 0,
      saidas: 0,
      conciliado_auto: 0,
      pendente_vinculo: 0,
      conciliado_manual: 0,
      sem_match: 0,
      extrato: 0,
      imported: 0,
      skipped: 0,
    };

    for (const row of rows) {
      const exists = await this.lancamentoModel.findOne({ transacao_id: row.transacao_id }).lean();
      if (exists) {
        stats.skipped += 1;
        continue;
      }

      stats.imported += 1;
      if (row.tipo_movimento === 'entrada') stats.entradas += 1;
      else stats.saidas += 1;

      let status_conciliacao: string = row.tipo_movimento === 'entrada' ? 'sem_match' : 'extrato';
      let nota_id: string | undefined;
      let candidatas: string[] = [];

      if (row.tipo_movimento === 'entrada') {
        const match = await resolveCreditoMatch(this.notasService, row.pagador_nome || '', row.valor, row.data);
        status_conciliacao = match.status_conciliacao;
        nota_id = match.status_conciliacao === 'conciliado_auto' ? match.nota_id : undefined;
        candidatas = match.candidatas_nota_ids;
        if (status_conciliacao === 'conciliado_auto') stats.conciliado_auto += 1;
        else if (status_conciliacao === 'pendente_vinculo') stats.pendente_vinculo += 1;
        else stats.sem_match += 1;
      } else {
        stats.extrato += 1;
      }

      const created = await this.lancamentoModel.create({
        profile_id: profile._id,
        importacao_id: importacao._id,
        transacao_id: row.transacao_id,
        data: row.data,
        descricao: row.descricao,
        valor: row.valor,
        pagador_nome: row.pagador_nome,
        pagador_nome_normalizado: row.pagador_nome ? normalizeName(row.pagador_nome) : undefined,
        tipo_movimento: row.tipo_movimento,
        origem: importOrigem,
        status_conciliacao,
        nota_id,
        candidatas_nota_ids: candidatas,
        tipo_transacao: row.tipo_transacao,
        saldo_pos: row.saldo_pos,
        documento_ref: row.documento_ref,
        fatura_numero: row.fatura_numero,
        json_original: row.json_original,
      });

      if (status_conciliacao === 'conciliado_auto' && nota_id) {
        await this.notasService.applyPayment(
          nota_id,
          String(created._id),
          row.valor,
          row.data,
          'bank',
          {
            transacao_id: row.transacao_id,
            descricao: row.descricao,
            pagador_nome: row.pagador_nome,
          },
        );
      }
    }

    await this.importModel.findByIdAndUpdate(importacao._id, {
      $set: {
        status: 'finished',
        stats,
        ...(statementBalances.saldoInicial != null
          ? { saldo_inicial: statementBalances.saldoInicial }
          : {}),
        ...(statementBalances.saldoFinal != null ? { saldo_final: statementBalances.saldoFinal } : {}),
      },
    });

    if (statementBalances.saldoInicial == null) {
      await persistImportSaldos(
        this.importModel,
        this.lancamentoModel,
        this.config,
        importacao._id,
      );
    } else if (statementBalances.saldoFinal == null) {
      const saldoFinal =
        statementBalances.saldoInicial + sumNetMovimentos(rows);
      await this.importModel.findByIdAndUpdate(importacao._id, {
        $set: { saldo_final: saldoFinal },
      });
    }

    await this.profileModel.findByIdAndUpdate(profile._id, {
      $inc: { usage_count: 1 },
      $set: { last_used_at: new Date() },
    });

    const importedRows = stats.imported;
    const previewVsImportMatch = previewRows === importedRows + stats.skipped;
    await this.sessionModel.create({
      file_hash: contentHash,
      file_name: params.fileName,
      file_kind: 'csv',
      outcome: 'imported',
      validation_report: { rows: previewRows, errors: validation.rows_failed },
      metrics: {
        preview_rows: previewRows,
        imported_rows: importedRows,
        preview_vs_import_match: previewVsImportMatch,
        suggestion_accepted_without_edit: Boolean(params.suggestionAcceptedWithoutEdit),
        overall_confidence: profile.confidence_score,
      },
    });

    if (previewVsImportMatch && stats.conciliado_auto / Math.max(stats.imported, 1) < 0.5) {
      await this.profileModel.findByIdAndUpdate(profile._id, { $inc: { quality_score: -0.1 } });
    }

    return {
      ok: true,
      importacao_id: String(importacao._id),
      profile_id: String(profile._id),
      ...stats,
    };
  }

  async getMetrics() {
    const sessions = asLeanMany<{ metrics?: Record<string, unknown> }>(
      await this.sessionModel.find({ outcome: 'imported', metrics: { $exists: true } }).lean(),
    );
    const imported = sessions.length;
    const withMatch = sessions.filter((s) => s.metrics?.preview_vs_import_match).length;
    const accepted = sessions.filter((s) => s.metrics?.suggestion_accepted_without_edit).length;
    return {
      imports_total: imported,
      preview_vs_import_match_rate: imported ? withMatch / imported : 1,
      suggestion_accepted_rate: imported ? accepted / imported : 0,
      profiles_active: await this.profileModel.countDocuments({ status: 'active', source: { $ne: 'system_template' } }),
      profiles_system: 0,
    };
  }

  async listProfilesForFluxoExport() {
    const profiles = asLeanMany<{ _id: Types.ObjectId; name: string; banco_label: string; system_key?: string }>(
      await this.profileModel
        .find({ status: 'active', source: { $ne: 'system_template' } })
        .sort({ banco_label: 1, name: 1 })
        .select('name banco_label system_key')
        .lean(),
    );

    const withData: typeof profiles = [];
    for (const profile of profiles) {
      const count = await this.lancamentoModel.countDocuments({ profile_id: profile._id });
      if (count > 0) withData.push(profile);
    }
    return withData;
  }

  private resolveFluxoLayout(_profile: ImportProfileLean): FluxoCaixaLayout {
    return 'compact';
  }

  private async findImportIdsForStatementMonth(
    profileId: Types.ObjectId,
    mesPagamento: string,
  ): Promise<Types.ObjectId[]> {
    const escaped = mesPagamento.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escaped);
    const imports = asLeanMany<{ _id: Types.ObjectId }>(
      await this.importModel
        .find({
          profile_id: profileId,
          $or: [{ periodo: mesPagamento }, { filename: pattern }, { originalName: pattern }],
        })
        .select('_id')
        .lean(),
    );
    return imports.map((item) => item._id);
  }

  async prepareFluxoCaixaData(profileId: string, params: FluxoCaixaExportParams): Promise<FluxoCaixaPreparedData> {
    const profile = await this.getProfile(profileId);
    const { from, to } = resolveExportDateRange(params);
    const dataFilter = buildDateFilter(from, to);
    const mesCompetencia = resolveMesCompetenciaNf(params);
    const mesPagamento = params.mes_pagamento?.trim() || params.mes_competencia?.trim();
    const mappingOrigem = detectNubankOrigemFromMapping(profile.mapping);

    const filter: Record<string, unknown> = { profile_id: profile._id };
    if (mappingOrigem === 'cartao' && mesPagamento && /^\d{4}-\d{2}$/.test(mesPagamento)) {
      const statementImportIds = await this.findImportIdsForStatementMonth(profile._id, mesPagamento);
      if (statementImportIds.length) {
        filter.importacao_id = { $in: statementImportIds };
      } else if (dataFilter) {
        filter.data = dataFilter;
      }
    } else if (dataFilter) {
      filter.data = dataFilter;
    }

    const lancamentos = asLeanMany<BankLancamentoFluxoLean>(
      await this.lancamentoModel.find(filter).sort({ data: 1 }).lean(),
    );
    const importIds = [
      ...new Set(
        lancamentos
          .map((item) => item.importacao_id)
          .filter((id) => id != null)
          .map((id) => String(id)),
      ),
    ];
    const importacoes = importIds.length
      ? asLeanMany<{ _id: Types.ObjectId; origem?: 'conta' | 'cartao' }>(
          await this.importModel.find({ _id: { $in: importIds } }).select('origem').lean(),
        )
      : [];
    const importOrigemById = new Map(
      importacoes.map((item) => [String(item._id), item.origem === 'cartao' ? 'cartao' : 'conta'] as const),
    );

    const annotated = annotateLancamentosOrigem({
      lancamentos,
      profileSystemKey: profile.system_key,
      profileMapping: profile.mapping,
      importOrigemById,
    });

    const notaIds = collectValidNotaIds(annotated);
    const notas = notaIds.length
      ? asLeanMany(
          await this.notaModel
            .find({ _id: { $in: notaIds } })
            .select('numero tomador codigo_servico mes_competencia empresa_nome empresa_cnpj')
            .lean(),
        )
      : [];
    const notaById = new Map(notas.map((n: any) => [String(n._id), n]));

    let contaLancamentos = annotated;
    let cartaoLancamentos: typeof annotated = [];

    if (mappingOrigem === 'cartao') {
      cartaoLancamentos = annotated;
      contaLancamentos = [];
    } else if (profile.system_key === 'nubank' || annotated.some((item) => item.origem === 'cartao')) {
      const split = splitNubankLancamentosFluxoCaixa(annotated, mesCompetencia, notaById);
      contaLancamentos = split.conta;
      cartaoLancamentos = split.cartao;
    } else {
      contaLancamentos = filterLancamentosForFluxoCaixaExport(annotated, mesCompetencia, notaById);
    }

    const { rows: contaRows } = mapLancamentosToFluxoCaixaRows(
      contaLancamentos,
      notaById,
      (l) => l.descricao || '',
      undefined,
      (l) => l.tipo_movimento || 'entrada',
    );

    const { rows: cartaoRows } = cartaoLancamentos.length
      ? mapLancamentosToFluxoCaixaRows(
          cartaoLancamentos,
          notaById,
          (l) => l.descricao || '',
          undefined,
          (l) => l.tipo_movimento || 'entrada',
          (tipo, historico) => resolveFluxoCaixaCategoriaCartao(tipo, historico),
        )
      : { rows: [] };

    const exportRows = mappingOrigem === 'cartao' ? cartaoRows : contaRows;
    const saldoLancamentos = mappingOrigem === 'cartao' ? cartaoLancamentos : contaLancamentos;

    const layout = this.resolveFluxoLayout(profile);
    const autoSaldo = await resolveSaldoInicialAutomatico(
      {
        lancamentoModel: this.lancamentoModel,
        importModel: this.importModel,
        config: this.config,
      },
      layout,
      params,
      saldoLancamentos,
      String(profile._id),
    );
    const header = resolveFluxoCaixaHeader(
      this.config,
      {
        banco_label: profile.banco_label,
        conta_corrente: params.conta_corrente ?? profile.conta_corrente,
        empresa_nome: params.empresa_nome ?? profile.empresa_nome,
        empresa_cnpj: params.empresa_cnpj ?? profile.empresa_cnpj,
        saldo_inicial: params.saldo_inicial,
      },
      autoSaldo,
    );
    enrichHeaderFromNotas(header, notas as any[]);
    header.banco = profile.banco_label;
    if (profile.empresa_nome?.trim()) {
      header.empresaNome = profile.empresa_nome.trim();
    }
    if (profile.empresa_cnpj?.trim()) {
      header.empresaCnpj = profile.empresa_cnpj.trim();
    }
    if (profile.conta_corrente?.trim()) {
      header.contaCorrente = profile.conta_corrente.trim();
    }

    const sheetName = buildFluxoCaixaSheetName(profile.banco_label, profile.name);

    return {
      header,
      rows: exportRows,
      profile,
      layout,
      sheetName,
    };
  }

  async exportFluxoCaixa(profileId: string, params: FluxoCaixaExportParams) {
    const { header, rows, profile, layout, sheetName } = await this.prepareFluxoCaixaData(profileId, params);
    const buffer = await buildFluxoCaixaWorkbook(layout, header, rows, undefined, undefined, sheetName);
    return {
      buffer,
      filename: buildFluxoCaixaFilename(profile.banco_label, params),
    };
  }

  async submitFeedback(params: {
    profileId: string;
    beforeMapping: ImportProfileMapping;
    afterMapping: ImportProfileMapping;
    accepted: boolean;
  }) {
    const signature = buildFileSignature(
      Object.values(params.afterMapping.columns).filter(Boolean) as string[],
      params.afterMapping.delimiter,
    );

    if (!params.accepted) {
      await this.profileModel.findByIdAndUpdate(params.profileId, { $inc: { quality_score: -0.2 } });
      return { ok: true };
    }

    await this.rag.indexCorrection({
      signatureText: signature,
      before: params.beforeMapping,
      after: params.afterMapping,
    });

    await this.profileModel.findByIdAndUpdate(params.profileId, {
      $set: { mapping: params.afterMapping },
      $inc: { quality_score: 0.1 },
    });

    return { ok: true };
  }

  async listSemMatch() {
    const lancamentos = asLeanMany<BankLancamentoLean>(
      await this.lancamentoModel.find({ status_conciliacao: 'sem_match' }).sort({ data: -1 }).lean(),
    );

    const results = [];
    for (const lancamento of lancamentos) {
      const scored = await this.notasService.findOpenForConciliacao(
        lancamento.pagador_nome || '',
        Number(lancamento.valor ?? 0),
        new Date(lancamento.data ?? Date.now()),
      );
      results.push({ lancamento, candidatas: mapScoredCandidatas(scored) });
    }
    return results;
  }

  async listPendentes() {
    const lancamentos = asLeanMany<BankLancamentoLean>(
      await this.lancamentoModel.find({ status_conciliacao: 'pendente_vinculo' }).sort({ data: -1 }).lean(),
    );

    const results = [];
    for (const lancamento of lancamentos) {
      const scored = await this.notasService.findOpenForConciliacao(
        lancamento.pagador_nome || '',
        Number(lancamento.valor ?? 0),
        new Date(lancamento.data ?? Date.now()),
      );
      results.push({ lancamento, candidatas: mapScoredCandidatas(scored) });
    }
    return results;
  }

  async listNotasParaLancamento(lancamentoId: string, q?: string) {
    const lancamento = asLeanOne<BankLancamentoLean>(await this.lancamentoModel.findById(lancamentoId).lean());
    if (!lancamento) throw new NotFoundException('Lançamento não encontrado');

    const scored = await this.notasService.findOpenForConciliacao(
      lancamento.pagador_nome || '',
      Number(lancamento.valor ?? 0),
      new Date(lancamento.data ?? Date.now()),
      q,
    );
    return { candidatas: mapScoredCandidatas(scored) };
  }

  async vincularManual(lancamentoId: string, notaId: string) {
    const lancamento = await this.lancamentoModel.findById(lancamentoId);
    if (!lancamento) throw new NotFoundException('Lançamento não encontrado');
    if (!['pendente_vinculo', 'sem_match'].includes(lancamento.status_conciliacao)) {
      throw new BadRequestException('Lançamento não está disponível para vínculo manual');
    }

    const nota = await this.notasService.findById(notaId);
    if (!nota) throw new NotFoundException('Nota não encontrada');

    await this.notasService.applyPayment(
      notaId,
      lancamentoId,
      lancamento.valor,
      new Date(lancamento.data),
      'bank',
      {
        transacao_id: lancamento.transacao_id,
        descricao: lancamento.descricao,
        pagador_nome: lancamento.pagador_nome,
      },
    );

    await this.lancamentoModel.findByIdAndUpdate(lancamentoId, {
      $set: { status_conciliacao: 'conciliado_manual', nota_id: notaId },
    });

    const previousStatus = lancamento.status_conciliacao;
    const statsInc: Record<string, number> = { 'stats.conciliado_manual': 1 };
    if (previousStatus === 'pendente_vinculo') statsInc['stats.pendente_vinculo'] = -1;
    else if (previousStatus === 'sem_match') statsInc['stats.sem_match'] = -1;

    if (lancamento.importacao_id) {
      await this.importModel.findByIdAndUpdate(lancamento.importacao_id, { $inc: statsInc });
    }

    return { ok: true };
  }

  async updatePagadorNome(lancamentoId: string, pagador_nome: string) {
    const lancamento = asLeanOne<BankLancamentoLean>(await this.lancamentoModel.findById(lancamentoId).lean());
    if (!lancamento) throw new NotFoundException('Lançamento não encontrado');
    if (!['pendente_vinculo', 'sem_match'].includes(lancamento.status_conciliacao ?? '')) {
      throw new BadRequestException('Lançamento não está disponível para alteração');
    }

    const trimmed = pagador_nome.trim();
    await this.lancamentoModel.findByIdAndUpdate(lancamentoId, {
      $set: {
        pagador_nome: trimmed || undefined,
        pagador_nome_normalizado: trimmed ? normalizeName(trimmed) : undefined,
      },
    });

    const updated = asLeanOne<BankLancamentoLean>(await this.lancamentoModel.findById(lancamentoId).lean());
    const scored = await this.notasService.findOpenForConciliacao(
      trimmed,
      Number(lancamento.valor ?? 0),
      new Date(lancamento.data ?? Date.now()),
    );

    return { lancamento: updated, candidatas: mapScoredCandidatas(scored) };
  }

  async getOpsDashboard() {
    const [metrics, gemini, sessions, ai] = await Promise.all([
      this.getMetrics(),
      this.geminiUsage.getOpsStats(),
      this.listSessions(15),
      Promise.resolve(this.ai.getConfigStatus()),
    ]);
    return { metrics, gemini, sessions, ai };
  }

  async listSessions(limit = 20) {
    const items = asLeanMany(
      await this.sessionModel
        .find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('-heuristic_result -gemini_result')
        .lean(),
    );
    return { items, total: items.length };
  }

  private computeOverallConfidence(result: ImportAnalysisResult): number {
    const fc = result.field_confidence;
    const cols = result.mapping.columns;
    const values = [
      fc.data,
      fc.valor,
      fc.descricao,
      fc.header_row,
      fc.pagador_nome,
    ].filter((v): v is number => typeof v === 'number');

    for (const key of ['transacao_id', 'tipo_transacao', 'saldo', 'documento'] as const) {
      if (cols[key] && typeof fc[key] === 'number') values.push(fc[key]!);
    }

    if (!values.length) return 0;
    const base = values.reduce((a, b) => a + b, 0) / values.length;
    if (result.parse_errors.length > 0) return Math.min(base, 0.7);
    if (result.total_rows_parsed === 0) return 0;
    return base;
  }
}
