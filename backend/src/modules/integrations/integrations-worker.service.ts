import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HonestIntegrationService } from './honest-integration.service';

@Injectable()
export class IntegrationsWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IntegrationsWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly honestService: HonestIntegrationService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;

    const enabled = this.config.get<string>('INTEGRATIONS_WORKER_ENABLED') !== 'false';
    if (!enabled) {
      this.logger.log('Worker de integrações desativado (INTEGRATIONS_WORKER_ENABLED=false)');
      return;
    }

    const intervalMs = Number(this.config.get('INTEGRATIONS_WORKER_INTERVAL_MS') ?? 60_000);
    this.timer = setInterval(() => void this.tick('worker'), intervalMs);
    this.logger.log(`Worker de integrações ativo (intervalo ${intervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runNow(): Promise<{ processed: number; errors: string[] }> {
    return this.tick('worker');
  }

  private async tick(source: 'worker'): Promise<{ processed: number; errors: string[] }> {
    if (this.running) {
      return { processed: 0, errors: ['Worker já em execução'] };
    }

    this.running = true;
    const errors: string[] = [];
    let processed = 0;

    try {
      const due = await this.honestService.listDueForWorker();
      for (const item of due) {
        try {
          await this.honestService.sync(String(item.tenantId), undefined, source);
          processed += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Falha desconhecida';
          errors.push(`tenant ${item.tenantId}: ${message}`);
          this.logger.warn(`Honest worker sync failed for tenant ${item.tenantId}: ${message}`);
        }
      }
    } finally {
      this.running = false;
    }

    return { processed, errors };
  }
}
