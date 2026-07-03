import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { getCurrentTenantId } from '../../../common/tenant/tenant-storage';

export type GeminiOperation = 'csv_analysis' | 'json_analysis' | 'pdf_analysis' | 'embedding' | 'pagador_extraction';

@Injectable()
export class GeminiUsageService {
  constructor(
    @InjectModel('GeminiUsageLog') private readonly logModel: Model<any>,
    private readonly config: ConfigService,
  ) {}

  dailyLimit(): number {
    return Number(this.config.get<string>('IMPORT_AI_DAILY_LIMIT', '50'));
  }

  async assertWithinLimit() {
    const limit = this.dailyLimit();
    if (limit <= 0) return;

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const tenantId = getCurrentTenantId();
    const filter: Record<string, unknown> = { createdAt: { $gte: since }, success: true };
    if (tenantId) filter.tenantId = new Types.ObjectId(tenantId);

    const count = await this.logModel.countDocuments(filter);
    if (count >= limit) {
      throw new BadRequestException(
        `Limite diário de análises com IA atingido (${limit}). Tente amanhã ou use importação manual.`,
      );
    }
  }

  async log(params: {
    operation: GeminiOperation;
    model?: string;
    prompt_version?: string;
    success: boolean;
    latency_ms?: number;
    estimated_tokens?: number;
    error_message?: string;
    userId?: string;
  }) {
    const tenantId = getCurrentTenantId();
    await this.logModel.create({
      tenantId: tenantId ? new Types.ObjectId(tenantId) : undefined,
      userId: params.userId ? new Types.ObjectId(params.userId) : undefined,
      operation: params.operation,
      model: params.model,
      prompt_version: params.prompt_version,
      success: params.success,
      latency_ms: params.latency_ms,
      estimated_tokens: params.estimated_tokens,
      error_message: params.error_message,
    });
  }

  async getOpsStats() {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const tenantId = getCurrentTenantId();
    const filter: Record<string, unknown> = { createdAt: { $gte: since } };
    if (tenantId) filter.tenantId = new Types.ObjectId(tenantId);

    const logs = await this.logModel.find(filter).lean();
    const success = logs.filter((l) => l.success).length;
    const failed = logs.length - success;
    const tokens = logs.reduce((sum, l) => sum + Number(l.estimated_tokens ?? 0), 0);
    const avgLatency =
      logs.length > 0
        ? logs.reduce((sum, l) => sum + Number(l.latency_ms ?? 0), 0) / logs.length
        : 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = logs.filter(
      (l) => l.success && new Date(l.createdAt).getTime() >= todayStart.getTime(),
    ).length;

    return {
      period_days: 30,
      total_calls: logs.length,
      success_calls: success,
      failed_calls: failed,
      estimated_tokens_30d: tokens,
      avg_latency_ms: Math.round(avgLatency),
      today_calls: todayCount,
      daily_limit: this.dailyLimit(),
      remaining_today: Math.max(0, this.dailyLimit() - todayCount),
    };
  }
}
