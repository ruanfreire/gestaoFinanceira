import { Controller, Get } from '@nestjs/common';
import { ConciliacaoService } from './conciliacao.service';

@Controller('conciliacao')
export class ConciliacaoController {
  constructor(private readonly conciliacaoService: ConciliacaoService) {}

  @Get('counts')
  async counts() {
    return this.conciliacaoService.getCounts();
  }
}
