import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ImportAnalysisResult, ImportProfileMapping } from '../types/import-profile.types';
import { buildExtratoCsvPrompt, PROMPT_VERSION } from '../prompts/extrato-csv.prompt';
import { buildExtratoPagadorPrompt, PROMPT_PAGADOR_VERSION, type PagadorExtractionInput } from '../prompts/extrato-pagador.prompt';
import { buildExtratoPdfPrompt, PROMPT_EXTRATO_PDF_VERSION } from '../prompts/extrato-pdf.prompt';
import { buildNotaJsonPrompt, PROMPT_NOTA_JSON_VERSION } from '../prompts/nota-json.prompt';
import { GeminiAnalysisService } from './gemini-analysis.service';
import { GeminiUsageService, type GeminiOperation } from './gemini-usage.service';
import {
  isImportAiProviderReady,
  resolveImportAiProvider,
  type ImportAiProvider,
} from '../utils/import-ai-config.util';
import { parseLlmJsonResponse } from '../utils/llm-json.util';

export type { ImportAiProvider };

type LlmParseResult = {
  banco_label_suggested?: string;
  mapping?: ImportProfileMapping;
  field_confidence?: ImportAnalysisResult['field_confidence'];
  gaps?: ImportAnalysisResult['gaps'];
};

type PagadorExtractionResult = {
  items?: Array<{ id: string; pagador_nome?: string | null; confidence?: number }>;
};

type AiJsonOperation = Extract<GeminiOperation, 'csv_analysis' | 'json_analysis' | 'pdf_analysis' | 'pagador_extraction'>;

@Injectable()
export class ImportAiAnalysisService {
  private readonly logger = new Logger(ImportAiAnalysisService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly gemini: GeminiAnalysisService,
    private readonly usage: GeminiUsageService,
  ) {}

  provider(): ImportAiProvider {
    return resolveImportAiProvider(this.envConfig());
  }

  isEnabled(): boolean {
    const provider = this.provider();
    return isImportAiProviderReady(provider, this.envConfig());
  }

  getConfigStatus() {
    const provider = this.provider();
    const enabled = this.isEnabled();
    return {
      enabled,
      provider,
      import_ai_enabled: this.config.get<string>('IMPORT_AI_ENABLED', 'true') !== 'false',
      capabilities: {
        csv_mapping: enabled,
        pagador_extraction: enabled,
        json_mapping: enabled,
        pdf_analysis: enabled && provider === 'gemini',
        embeddings: this.supportsEmbeddings(),
      },
      models: {
        groq: this.config.get<string>('GROQ_MODEL', 'llama-3.3-70b-versatile'),
        ollama: this.config.get<string>('OLLAMA_MODEL', 'llama3.2'),
        gemini_analysis: this.config.get<string>('GEMINI_MODEL_ANALYSIS', 'gemini-2.0-flash'),
        gemini_complex: this.config.get<string>('GEMINI_MODEL_COMPLEX', 'gemini-2.0-flash'),
      },
      daily_limit: this.usage.dailyLimit(),
    };
  }

  private envConfig() {
    return {
      importAiEnabled: this.config.get<string>('IMPORT_AI_ENABLED', 'true') !== 'false',
      explicitProvider: this.config.get<string>('IMPORT_AI_PROVIDER', ''),
      hasGroqKey: this.hasGroqKey(),
      hasGeminiKey: this.hasGeminiKey(),
      ollamaEnabled: this.config.get<string>('OLLAMA_ENABLED', 'false') === 'true',
    };
  }

  supportsEmbeddings(): boolean {
    return this.provider() === 'gemini' && this.hasGeminiKey();
  }

  minConfidence(): number {
    return this.gemini.minConfidence();
  }

  private hasGeminiKey(): boolean {
    const key = this.config.get<string>('GEMINI_API_KEY', '').trim();
    return key.startsWith('AIza');
  }

  private hasGroqKey(): boolean {
    return Boolean(this.config.get<string>('GROQ_API_KEY', '').trim());
  }

  private aiSource(): ImportAnalysisResult['source'] {
    const provider = this.provider();
    if (provider === 'groq' || provider === 'ollama') return 'hybrid';
    return 'gemini';
  }

  private async callLlmJson(params: {
    operation: AiJsonOperation;
    prompt: string;
    promptVersion: string;
    userId?: string;
    pdfBuffer?: Buffer;
  }): Promise<unknown | null> {
    if (!this.isEnabled()) return null;

    const provider = this.provider();
    if (params.operation === 'pdf_analysis' && provider !== 'gemini') {
      this.logger.debug(`PDF analysis skipped: provider ${provider} does not support PDF inline`);
      return null;
    }

    await this.usage.assertWithinLimit();

    if (provider === 'gemini') {
      return this.geminiGenerateJson(params);
    }
    if (provider === 'groq') {
      return this.groqGenerateJson(params);
    }
    return this.ollamaGenerateJson(params);
  }

  private async generateJson(params: {
    operation: Extract<AiJsonOperation, 'csv_analysis' | 'json_analysis' | 'pdf_analysis'>;
    prompt: string;
    promptVersion: string;
    userId?: string;
    pdfBuffer?: Buffer;
  }): Promise<LlmParseResult | null> {
    const parsed = await this.callLlmJson(params);
    return (parsed as LlmParseResult | null) ?? null;
  }

  private async geminiGenerateJson(params: {
    operation: AiJsonOperation;
    prompt: string;
    promptVersion: string;
    userId?: string;
    pdfBuffer?: Buffer;
  }): Promise<unknown | null> {
    if (!this.hasGeminiKey()) return null;

    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) return null;

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const modelName =
      params.operation === 'pdf_analysis'
        ? this.config.get<string>('GEMINI_MODEL_COMPLEX', 'gemini-2.0-flash')
        : this.config.get<string>('GEMINI_MODEL_ANALYSIS', 'gemini-2.0-flash');
    const started = Date.now();

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      });

      const content =
        params.pdfBuffer && params.operation === 'pdf_analysis'
          ? [
              { inlineData: { mimeType: 'application/pdf', data: params.pdfBuffer.toString('base64') } },
              { text: params.prompt },
            ]
          : [{ text: params.prompt }];

      const result = await model.generateContent(content);
      const text = result.response.text();
      const parsed = parseLlmJsonResponse(text);
      await this.logSuccess(params, modelName, started, text);
      return parsed;
    } catch (error) {
      await this.logFailure(params, modelName, started, error);
      this.logger.warn(`Gemini ${params.operation} failed: ${String(error)}`);
      return null;
    }
  }

  private async groqGenerateJson(params: {
    operation: AiJsonOperation;
    prompt: string;
    promptVersion: string;
    userId?: string;
  }): Promise<unknown | null> {
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    const model = this.config.get<string>('GROQ_MODEL', 'llama-3.3-70b-versatile');
    const started = Date.now();

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: params.prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${await response.text()}`);
      }

      const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = json.choices?.[0]?.message?.content ?? '';
      const parsed = parseLlmJsonResponse(text);
      await this.logSuccess(params, model, started, text);
      return parsed;
    } catch (error) {
      await this.logFailure(params, model, started, error);
      this.logger.warn(`Groq ${params.operation} failed: ${String(error)}`);
      return null;
    }
  }

  private async ollamaGenerateJson(params: {
    operation: AiJsonOperation;
    prompt: string;
    promptVersion: string;
    userId?: string;
  }): Promise<unknown | null> {
    const baseUrl = this.config.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434').replace(/\/$/, '');
    const model = this.config.get<string>('OLLAMA_MODEL', 'llama3.2');
    const started = Date.now();

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: params.prompt }],
          format: 'json',
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} — instale e rode: ollama pull ${model}`);
      }

      const json = (await response.json()) as { message?: { content?: string } };
      const text = json.message?.content ?? '';
      const parsed = parseLlmJsonResponse(text);
      await this.logSuccess(params, model, started, text);
      return parsed;
    } catch (error) {
      await this.logFailure(params, model, started, error);
      this.logger.warn(`Ollama ${params.operation} failed: ${String(error)}`);
      return null;
    }
  }

  private async logSuccess(
    params: { operation: string; prompt: string; promptVersion: string; userId?: string },
    model: string,
    started: number,
    text: string,
  ) {
    await this.usage.log({
      operation: params.operation as GeminiOperation,
      model: `${this.provider()}:${model}`,
      prompt_version: params.promptVersion,
      success: true,
      latency_ms: Date.now() - started,
      estimated_tokens: Math.ceil((params.prompt.length + text.length) / 4),
      userId: params.userId,
    });
  }

  private async logFailure(
    params: { operation: string; promptVersion: string; userId?: string },
    model: string,
    started: number,
    error: unknown,
  ) {
    await this.usage.log({
      operation: params.operation as GeminiOperation,
      model: `${this.provider()}:${model}`,
      prompt_version: params.promptVersion,
      success: false,
      latency_ms: Date.now() - started,
      error_message: String(error),
      userId: params.userId,
    });
  }

  async analyzeExtratoCsv(params: {
    heuristic: ImportAnalysisResult;
    sanitizedHeaders: string[];
    sanitizedSampleRows: string[][];
    ragContext: string;
    userId?: string;
  }): Promise<Partial<ImportAnalysisResult> | null> {
    if (!this.isEnabled()) return null;

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
      source: this.aiSource(),
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
    if (!this.isEnabled()) return null;

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
      source: this.aiSource(),
      prompt_version: PROMPT_NOTA_JSON_VERSION,
    };
  }

  async analyzePdfExtrato(params: {
    fileBuffer: Buffer;
    ragContext: string;
    userId?: string;
  }): Promise<Partial<ImportAnalysisResult> | null> {
    if (!this.isEnabled() || this.provider() !== 'gemini') return null;

    const prompt = buildExtratoPdfPrompt(params.ragContext);
    const parsed = await this.generateJson({
      operation: 'pdf_analysis',
      prompt,
      promptVersion: PROMPT_EXTRATO_PDF_VERSION,
      userId: params.userId,
      pdfBuffer: params.fileBuffer,
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
    if (!this.supportsEmbeddings()) return [];
    try {
      return await this.gemini.embedText(text, userId);
    } catch {
      return [];
    }
  }

  async extractPagadoresFromDescricoes(
    items: PagadorExtractionInput[],
    userId?: string,
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (!this.isEnabled() || items.length === 0) return result;

    const MIN_CONFIDENCE = 0.65;
    const batchSize = this.provider() === 'ollama' ? 20 : 50;

    for (let offset = 0; offset < items.length; offset += batchSize) {
      const batch = items.slice(offset, offset + batchSize);
      const prompt = buildExtratoPagadorPrompt(batch);
      const parsed = (await this.callLlmJson({
        operation: 'pagador_extraction',
        prompt,
        promptVersion: PROMPT_PAGADOR_VERSION,
        userId,
      })) as PagadorExtractionResult | null;

      for (const item of parsed?.items || []) {
        if (!item?.id || !item.pagador_nome?.trim()) continue;
        if ((item.confidence ?? 0) < MIN_CONFIDENCE) continue;
        result.set(item.id, item.pagador_nome.trim());
      }
    }

    return result;
  }
}
