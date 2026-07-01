import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { NotasService } from './notas.service';

@Controller('notas')
export class NotasController {
  constructor(private readonly notasService: NotasService) {}

  @Post()
  async create(@Body() body: any) {
    return this.notasService.create(body);
  }

  @Post('desvincular-pagamento')
  async desvincularPagamento(
    @Body() body: { nota_id?: string; lancamento_id?: string; source?: string },
  ) {
    const notaId = body.nota_id?.trim();
    const lancamentoId = body.lancamento_id?.trim();
    const source = body.source === 'nubank' ? 'nubank' : body.source === 'asaas' ? 'asaas' : null;

    if (!notaId || !lancamentoId || !source) {
      throw new BadRequestException('nota_id, lancamento_id e source (asaas|nubank) são obrigatórios');
    }

    return this.notasService.desvincularPagamento(notaId, lancamentoId, source);
  }

  @Get('extracao')
  async extracao(@Query() query: any) {
    return this.notasService.findForExtracao({
      from: typeof query.from === 'string' ? query.from : undefined,
      to: typeof query.to === 'string' ? query.to : undefined,
      status_pagamento: typeof query.status_pagamento === 'string' ? query.status_pagamento : undefined,
      mes_pagamento:
        typeof query.mes_pagamento === 'string'
          ? query.mes_pagamento
          : typeof query.mes_competencia === 'string'
            ? query.mes_competencia
            : undefined,
      date_basis: query.date_basis === 'emissao' ? 'emissao' : 'pagamento',
    });
  }

  @Get()
  async list(@Query() query: any) {
    const search = typeof query.q === 'string' ? query.q : undefined;
    const filter = this.notasService.buildSearchFilter(search);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 50));
    const options = {
      page,
      limit,
      sort: { data_emissao: -1, createdAt: -1 },
    };
    return this.notasService.findAll(filter, options);
  }
}

