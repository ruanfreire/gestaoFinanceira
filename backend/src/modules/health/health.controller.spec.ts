import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('retorna healthy quando mongo está conectado', async () => {
    const connection = { readyState: 1 } as any;
    const controller = new HealthController(connection);
    const result = await controller.check();
    expect(result.ok).toBe(true);
    expect(result.status).toBe('healthy');
    expect(result.mongo).toBe('up');
    expect(typeof result.uptime).toBe('number');
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('retorna degraded quando mongo está down', async () => {
    const connection = { readyState: 0 } as any;
    const controller = new HealthController(connection);
    const result = await controller.check();
    expect(result.ok).toBe(false);
    expect(result.status).toBe('degraded');
    expect(result.mongo).toBe('down');
  });
});
