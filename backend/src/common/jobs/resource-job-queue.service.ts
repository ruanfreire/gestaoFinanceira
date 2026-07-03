import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

export type ResourceJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'expired';
export type ResourceJobKind = 'fluxo_caixa' | 'honest';

export type ResourceJobPublicView = {
  id: string;
  kind: ResourceJobKind;
  status: ResourceJobStatus;
  position?: number;
  progressMessage?: string;
  error?: string;
  filename?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
};

type ResourceJobResult = {
  filename: string;
  filePath: string;
  contentType: string;
};

type InternalJob = {
  id: string;
  kind: ResourceJobKind;
  status: ResourceJobStatus;
  tenantId?: string;
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  error?: string;
  progressMessage?: string;
  result?: ResourceJobResult;
};

type QueueTask = () => Promise<void>;

type HeavyExecutionContext = {
  inHeavyJob: boolean;
};

const MAX_QUEUE_SIZE = 3;
const FILE_TTL_MS = 30 * 60 * 1000;
const JOB_METADATA_TTL_MS = 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class ResourceJobQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ResourceJobQueueService.name);
  private readonly jobs = new Map<string, InternalJob>();
  private readonly pending: Array<{ jobId?: string; task: QueueTask }> = [];
  private processing = false;
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private readonly jobsDir: string;
  private readonly heavyContext = new AsyncLocalStorage<HeavyExecutionContext>();

  constructor() {
    this.jobsDir = process.env.RESOURCE_JOBS_DIR?.trim() || path.join(os.tmpdir(), 'gestao-financeira-jobs');
  }

  onModuleInit() {
    void fs.mkdir(this.jobsDir, { recursive: true });
    this.cleanupTimer = setInterval(() => void this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  /** Executa tarefa pesada com concorrência global 1; reentrante para chamadas internas. */
  async runExclusive<T>(
    kind: ResourceJobKind,
    fn: () => Promise<T>,
    options?: { tenantId?: string; progressMessage?: string },
  ): Promise<T> {
    const ctx = this.heavyContext.getStore();
    if (ctx?.inHeavyJob) {
      return fn();
    }

    const jobId = randomUUID();
    const job: InternalJob = {
      id: jobId,
      kind,
      status: 'queued',
      tenantId: options?.tenantId,
      createdAt: new Date(),
      progressMessage: options?.progressMessage ?? 'Na fila',
    };
    this.jobs.set(jobId, job);
    this.rejectIfQueueFull();

    return new Promise<T>((resolve, reject) => {
      this.pending.push({
        jobId,
        task: async () => {
          job.status = 'running';
          job.startedAt = new Date();
          job.progressMessage = options?.progressMessage ?? 'Em execução';
          try {
            const result = await this.heavyContext.run({ inHeavyJob: true }, fn);
            job.status = 'succeeded';
            job.finishedAt = new Date();
            job.progressMessage = undefined;
            resolve(result);
          } catch (error) {
            job.status = 'failed';
            job.finishedAt = new Date();
            job.error = error instanceof Error ? error.message : String(error);
            reject(error);
          } finally {
            setTimeout(() => this.jobs.delete(jobId), JOB_METADATA_TTL_MS);
          }
        },
      });
      void this.pump();
    });
  }

  createJob(kind: ResourceJobKind, tenantId?: string): string {
    this.rejectIfQueueFull();
    const id = randomUUID();
    const job: InternalJob = {
      id,
      kind,
      status: 'queued',
      tenantId,
      createdAt: new Date(),
      progressMessage: 'Na fila',
    };
    this.jobs.set(id, job);
    return id;
  }

  enqueueJob(
    jobId: string,
    fn: () => Promise<{ buffer: Buffer; filename: string; contentType?: string }>,
  ): void {
    const job = this.getJobOrThrow(jobId);
    this.pending.push({
      jobId,
      task: async () => {
        job.status = 'running';
        job.startedAt = new Date();
        job.progressMessage = 'Gerando relatório...';
        try {
          const { buffer, filename, contentType } = await this.heavyContext.run({ inHeavyJob: true }, fn);
          const filePath = path.join(this.jobsDir, `${jobId}.xlsx`);
          await fs.writeFile(filePath, buffer);
          job.result = {
            filename,
            filePath,
            contentType:
              contentType ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          };
          job.status = 'succeeded';
          job.finishedAt = new Date();
          job.progressMessage = 'Pronto para download';
        } catch (error) {
          job.status = 'failed';
          job.finishedAt = new Date();
          job.error = error instanceof Error ? error.message : String(error);
          job.progressMessage = undefined;
        }
      },
    });
    void this.pump();
  }

  getJobView(jobId: string, tenantId?: string): ResourceJobPublicView | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    if (tenantId && job.tenantId && job.tenantId !== tenantId) return null;
    return this.toPublicView(job);
  }

  async readJobFile(
    jobId: string,
    tenantId?: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const job = this.getJobOrThrow(jobId);
    if (tenantId && job.tenantId && job.tenantId !== tenantId) {
      throw new NotFoundException('Job não encontrado');
    }
    if (job.status === 'expired') {
      throw new BadRequestException('Arquivo expirado. Gere o relatório novamente.');
    }
    if (job.status !== 'succeeded' || !job.result) {
      throw new BadRequestException('Relatório ainda não está pronto.');
    }
    const buffer = await fs.readFile(job.result.filePath);
    return { buffer, filename: job.result.filename, contentType: job.result.contentType };
  }

  setProgress(jobId: string, message: string): void {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'running') {
      job.progressMessage = message;
    }
  }

  getQueueDepth(): number {
    return this.pending.length + (this.processing ? 1 : 0);
  }

  private rejectIfQueueFull(): void {
    if (this.getQueueDepth() >= MAX_QUEUE_SIZE) {
      throw new ServiceUnavailableException(
        'Muitas tarefas pesadas na fila. Tente novamente em instantes.',
      );
    }
  }

  private async pump(): Promise<void> {
    if (this.processing || this.pending.length === 0) return;
    this.processing = true;
    const item = this.pending.shift()!;
    try {
      await item.task();
    } catch (error) {
      this.logger.error(`Job task failed unexpectedly: ${error}`);
    } finally {
      this.processing = false;
      void this.pump();
    }
  }

  private getJobOrThrow(jobId: string): InternalJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException('Job não encontrado');
    return job;
  }

  private toPublicView(job: InternalJob): ResourceJobPublicView {
    return {
      id: job.id,
      kind: job.kind,
      status: job.status,
      position: job.status === 'queued' ? this.queuePosition(job.id) : undefined,
      progressMessage: job.progressMessage,
      error: job.error,
      filename: job.result?.filename,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      finishedAt: job.finishedAt?.toISOString(),
    };
  }

  private queuePosition(jobId: string): number {
    let position = 1;
    for (const item of this.pending) {
      if (item.jobId === jobId) return position;
      position += 1;
    }
    return 0;
  }

  private async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [id, job] of this.jobs) {
      if (job.result?.filePath) {
        const fileAge = now - (job.finishedAt?.getTime() ?? job.createdAt.getTime());
        if (fileAge > FILE_TTL_MS) {
          try {
            await fs.unlink(job.result.filePath);
          } catch {
            // ignore missing files
          }
          if (job.status === 'succeeded') {
            job.status = 'expired';
            delete job.result;
          }
        }
      }

      const age = now - job.createdAt.getTime();
      if (
        age > JOB_METADATA_TTL_MS &&
        (job.status === 'succeeded' || job.status === 'failed' || job.status === 'expired')
      ) {
        this.jobs.delete(id);
      }
    }
  }
}
