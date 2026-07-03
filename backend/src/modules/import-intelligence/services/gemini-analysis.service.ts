import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ImportAnalysisResult, ImportProfileMapping } from '../types/import-profile.types';
import { buildExtratoCsvPrompt, PROMPT_VERSION } from '../prompts/extrato-csv.prompt';
import { buildExtratoPdfPrompt, PROMPT_EXTRATO_PDF_VERSION } from '../prompts/extrato-pdf.prompt';
import { buildNotaJsonPrompt, PROMPT_NOTA_JSON_VERSION } from '../prompts/nota-json.prompt';
import { GeminiUsageService } from './gemini-usage.service';

type GeminiParseResult = {
  banco_label_suggested?: string;
  mapping?: ImportProfileMapping;
  field_confidence?: ImportAnalysisResult['field_confidence'];
  gaps?: ImportAnalysisResult['gaps'];
};

@Injectable()
export class GeminiAnalysisService {
  private readonly logger = new Logger(GeminiAnalysisService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly usage: GeminiUsageService,
  ) {}

  isEnabled(): boolean {
    const key = this.config.get<string>('GEMINI_API_KEY', '').trim();
    return (
      this.config.get<string>('IMPORT_AI_ENABLED', 'true') !== 'false' &&
      key.startsWith('AIza')
    );
  }

  minConfidence(): number {
    return Number(this.config.get<string>('IMPORT_AI_MIN_CONFIDENCE', '0.85'));
  }

  private modelName(kind: 'analysis' | 'complex' = 'analysis'): string {
    if (kind === 'complex') {
      return this.config.get<string>('GEMINI_MODEL_COMPLEX', 'gemini-2.0-flash');
    }
    return this.config.get<string>('GEMINI_MODEL_ANALYSIS', 'gemini-2.0-flash');
  }

  private async generateJson(params: {
    operation: 'csv_analysis' | 'json_analysis' | 'pdf_analysis';
    prompt: string;
    promptVersion: string;
    parts?: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
    userId?: string;
  }): Promise<GeminiParseResult | null> {
    if (!this.isEnabled()) return null;

    await this.usage.assertWithinLimit();

    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) return null;

    const modelName = this.modelName(params.operation === 'pdf_analysis' ? 'complex' : 'analysis');
    const started = Date.now();

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const content = params.parts ?? [{ text: params.prompt }];
      const result = await model.generateContent(content);
      const text = result.response.text();
      const parsed = JSON.parse(text) as GeminiParseResult;
      const latency = Date.now() - started;

      await this.usage.log({
        operation: params.operation,
        model: modelName,
        prompt_version: params.promptVersion,
        success: true,
        latency_ms: latency,
        estimated_tokens: Math.ceil((params.prompt.length + text.length) / 4),
        userId: params.userId,
      });

      return parsed;
    } catch (error) {
      const latency = Date.now() - started;
      await this.usage.log({
        operation: params.operation,
        model: modelName,
        prompt_version: params.promptVersion,
        success: false,
        latency_ms: latency,
        error_message: String(error),
        userId: params.userId,
      });
      this.logger.warn(`Gemini ${params.operation} failed: ${String(error)}`);
      return null;
    }
  }

  async analyzeExtratoCsv(params: {
    heuristic: ImportAnalysisResult;
    sanitizedHeaders: string[];
    sanitizedSampleRows: string[][];
    ragContext: string;
    userId?: string;
  }): Promise<Partial<ImportAnalysisResult> | null> {
    if (params.heuristic.overall_confidence >= this.minConfidence()) return null;

    const prompt = buildExtratoCsvPrompt({
      sanitizedHeaders: params.sanitizedHeaders,
      sanitizedSampleRows: params.sanitizedSampleRows,
      ragContext: params.ragContext,
      heuristicJson: JSON.stringify({
        mapping: params.heuristic.mapping,
        field_confidence: params.heuristic.field_confidence,
        gaps: params.heuristic.gaps,
      }),
    });

    const parsed = await this.generateJson({
      operation: 'csv_analysis',
      prompt,
      promptVersion: PROMPT_VERSION,
      userId: params.userId,
    });
    if (!parsed) return null;

    return {
      banco_label_suggested: parsed.banco_label_suggested,
      mapping: parsed.mapping,
      field_confidence: parsed.field_confidence,
      gaps: parsed.gaps,
      source: 'gemini',
      prompt_version: PROMPT_VERSION,
    };
  }

  async analyzeJsonExtrato(params: {
    heuristic: ImportAnalysisResult;
    sanitizedStructure: string;
    ragContext: string;
    userId?: string;
  }): Promise<Partial<ImportAnalysisResult> | null> {
    if (params.heuristic.detected_json_kind !== 'bank_transactions') return null;
    if (params.heuristic.overall_confidence >= this.minConfidence()) return null;

    const prompt = buildNotaJsonPrompt({
      sanitizedStructure: params.sanitizedStructure,
      ragContext: params.ragContext,
    });

    const parsed = await this.generateJson({
      operation: 'json_analysis',
      prompt,
      promptVersion: PROMPT_NOTA_JSON_VERSION,
      userId: params.userId,
    });
    if (!parsed) return null;

    return {
      banco_label_suggested: parsed.banco_label_suggested,
      mapping: parsed.mapping,
      field_confidence: parsed.field_confidence,
      gaps: parsed.gaps,
      source: 'gemini',
      prompt_version: PROMPT_NOTA_JSON_VERSION,
    };
  }

  async analyzePdfExtrato(params: {
    fileBuffer: Buffer;
    ragContext: string;
    userId?: string;
  }): Promise<Partial<ImportAnalysisResult> | null> {
    if (!this.isEnabled()) return null;

    const prompt = buildExtratoPdfPrompt(params.ragContext);
    const parsed = await this.generateJson({
      operation: 'pdf_analysis',
      prompt,
      promptVersion: PROMPT_EXTRATO_PDF_VERSION,
      parts: [
        { inlineData: { mimeType: 'application/pdf', data: params.fileBuffer.toString('base64') } },
        { text: prompt },
      ],
      userId: params.userId,
    });
    if (!parsed?.mapping) return null;

    return {
      banco_label_suggested: parsed.banco_label_suggested || 'Banco (PDF)',
      mapping: parsed.mapping,
      field_confidence: parsed.field_confidence,
      gaps: parsed.gaps,
      source: 'gemini',
      prompt_version: PROMPT_EXTRATO_PDF_VERSION,
      file_kind: 'unknown',
    };
  }

  async embedText(text: string, userId?: string): Promise<number[]> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) return [];

    const model = this.config.get<string>('GEMINI_EMBEDDING_MODEL', 'text-embedding-004');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;
    const started = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text }] },
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const json = (await response.json()) as { embedding?: { values?: number[] } };
      await this.usage.log({
        operation: 'embedding',
        model,
        success: true,
        latency_ms: Date.now() - started,
        estimated_tokens: Math.ceil(text.length / 4),
        userId,
      });
      return json.embedding?.values ?? [];
    } catch (error) {
      await this.usage.log({
        operation: 'embedding',
        model,
        success: false,
        latency_ms: Date.now() - started,
        error_message: String(error),
        userId,
      });
      throw error;
    }
  }
}
