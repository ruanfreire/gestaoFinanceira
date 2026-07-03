import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { ResourceJobQueueService } from './resource-job-queue.service';

describe('ResourceJobQueueService', () => {
  let service: ResourceJobQueueService;
  let jobsDir: string;

  beforeEach(async () => {
    jobsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gf-jobs-test-'));
    process.env.RESOURCE_JOBS_DIR = jobsDir;
    service = new ResourceJobQueueService();
    service.onModuleInit();
  });

  afterEach(async () => {
    service.onModuleDestroy();
    await fs.rm(jobsDir, { recursive: true, force: true });
    delete process.env.RESOURCE_JOBS_DIR;
    vi.useRealTimers();
  });

  it('executa tarefas pesadas com concorrência 1', async () => {
    const order: string[] = [];

    const first = service.runExclusive('fluxo_caixa', async () => {
      order.push('a-start');
      await new Promise((resolve) => setTimeout(resolve, 30));
      order.push('a-end');
      return 'a';
    });

    const second = service.runExclusive('fluxo_caixa', async () => {
      order.push('b-start');
      order.push('b-end');
      return 'b';
    });

    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe('a');
    expect(b).toBe('b');
    expect(order).toEqual(['a-start', 'a-end', 'b-start', 'b-end']);
  });

  it('rejeita novas tarefas quando a fila está cheia', async () => {
    const blockers = Array.from({ length: 3 }, () =>
      service.runExclusive('honest', () => new Promise<void>(() => {})),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));

    await expect(
      service.runExclusive('honest', async () => 'late'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    blockers.forEach((promise) => {
      void promise.catch(() => {});
    });
  });

  it('cria job assíncrono, salva arquivo e permite download', async () => {
    const jobId = service.createJob('fluxo_caixa', 'tenant-1');
    service.enqueueJob(jobId, async () => ({
      buffer: Buffer.from('excel-bytes'),
      filename: 'fluxo.xlsx',
    }));

    await vi.waitFor(async () => {
      const view = service.getJobView(jobId, 'tenant-1');
      expect(view?.status).toBe('succeeded');
    });

    const file = await service.readJobFile(jobId, 'tenant-1');
    expect(file.filename).toBe('fluxo.xlsx');
    expect(file.buffer.toString()).toBe('excel-bytes');
  });

  it('marca job como failed quando a tarefa lança erro', async () => {
    const jobId = service.createJob('fluxo_caixa');
    service.enqueueJob(jobId, async () => {
      throw new Error('falha simulada');
    });

    await vi.waitFor(() => {
      const view = service.getJobView(jobId);
      expect(view?.status).toBe('failed');
      expect(view?.error).toContain('falha simulada');
    });
  });

  it('expira arquivos antigos na limpeza periódica', async () => {
    vi.useFakeTimers();
    const jobId = service.createJob('fluxo_caixa');
    service.enqueueJob(jobId, async () => ({
      buffer: Buffer.from('old'),
      filename: 'old.xlsx',
    }));

    await vi.waitFor(() => {
      expect(service.getJobView(jobId)?.status).toBe('succeeded');
    });

    await vi.advanceTimersByTimeAsync(31 * 60 * 1000);
    await (service as unknown as { cleanup: () => Promise<void> }).cleanup();

    const view = service.getJobView(jobId);
    expect(view?.status).toBe('expired');
    await expect(service.readJobFile(jobId)).rejects.toThrow(/expirado/i);
  });

  it('é reentrante para chamadas internas na mesma tarefa pesada', async () => {
    const order: string[] = [];

    await service.runExclusive('honest', async () => {
      order.push('outer-start');
      await service.runExclusive('honest', async () => {
        order.push('inner');
        return true;
      });
      order.push('outer-end');
      return true;
    });

    expect(order).toEqual(['outer-start', 'inner', 'outer-end']);
  });
});
