import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @Public()
  async check() {
    const mongoState = this.connection.readyState;
    const mongo = mongoState === 1 ? 'up' : 'down';
    const ok = mongo === 'up';
    return {
      ok,
      status: ok ? 'healthy' : 'degraded',
      mongo,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
