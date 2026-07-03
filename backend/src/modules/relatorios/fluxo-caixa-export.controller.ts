import { Controller, Get, Param, Post, Query, Req, StreamableFile } from '@nestjs/common';
import { FluxoCaixaExportService } from './fluxo-caixa-export.service';
import type { FluxoCaixaExportBanco } from '../../common/fluxo-caixa.config';

function fluxoParamsFromQuery(query: {
  from?: string;
  to?: string;
  mes_pagamento?: string;
  mes_competencia?: string;
  mes_competencia_nf?: string;
  empresa_nome?: string;
  empresa_cnpj?: string;
  conta_corrente?: string;
  saldo_inicial?: string;
}) {
  return {
    from: query.from,
    to: query.to,
    mes_pagamento: query.mes_pagamento ?? query.mes_competencia,
    mes_competencia: query.mes_competencia,
    mes_competencia_nf: query.mes_competencia_nf,
    empresa_nome: query.empresa_nome,
    empresa_cnpj: query.empresa_cnpj,
    conta_corrente: query.conta_corrente,
    saldo_inicial: query.saldo_inicial,
  };
}

@Controller('relatorios')
export class FluxoCaixaExportController {
  constructor(private readonly exportService: FluxoCaixaExportService) {}

  @Get('exportacao-fluxo-caixa')
  async exportacaoFluxoCaixa(
    @Req() req: { user?: { tenantId?: string } },
    @Query('banco') banco: FluxoCaixaExportBanco = 'consolidado',
    @Query('profile_id') profile_id?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('mes_pagamento') mes_pagamento?: string,
    @Query('mes_competencia') mes_competencia?: string,
    @Query('mes_competencia_nf') mes_competencia_nf?: string,
    @Query('empresa_nome') empresa_nome?: string,
    @Query('empresa_cnpj') empresa_cnpj?: string,
    @Query('conta_corrente') conta_corrente?: string,
    @Query('saldo_inicial') saldo_inicial?: string,
  ) {
    const { buffer, filename } = await this.exportService.export(
      banco,
      fluxoParamsFromQuery({
        from,
        to,
        mes_pagamento,
        mes_competencia,
        mes_competencia_nf,
        empresa_nome,
        empresa_cnpj,
        conta_corrente,
        saldo_inicial,
      }),
      profile_id,
      req.user?.tenantId,
    );

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Post('fluxo-caixa/jobs')
  createFluxoCaixaJob(
    @Req() req: { user?: { tenantId?: string } },
    @Query('banco') banco: FluxoCaixaExportBanco = 'consolidado',
    @Query('profile_id') profile_id?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('mes_pagamento') mes_pagamento?: string,
    @Query('mes_competencia') mes_competencia?: string,
    @Query('mes_competencia_nf') mes_competencia_nf?: string,
    @Query('empresa_nome') empresa_nome?: string,
    @Query('empresa_cnpj') empresa_cnpj?: string,
    @Query('conta_corrente') conta_corrente?: string,
    @Query('saldo_inicial') saldo_inicial?: string,
  ) {
    return this.exportService.createExportJob(
      banco,
      fluxoParamsFromQuery({
        from,
        to,
        mes_pagamento,
        mes_competencia,
        mes_competencia_nf,
        empresa_nome,
        empresa_cnpj,
        conta_corrente,
        saldo_inicial,
      }),
      profile_id,
      req.user?.tenantId,
    );
  }

  @Get('fluxo-caixa/jobs/:id')
  getFluxoCaixaJob(@Req() req: { user?: { tenantId?: string } }, @Param('id') id: string) {
    return this.exportService.getJobStatus(id, req.user?.tenantId);
  }

  @Get('fluxo-caixa/jobs/:id/download')
  async downloadFluxoCaixaJob(
    @Req() req: { user?: { tenantId?: string } },
    @Param('id') id: string,
  ) {
    const { buffer, filename } = await this.exportService.downloadJob(id, req.user?.tenantId);
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
