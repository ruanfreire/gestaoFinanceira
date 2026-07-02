import { Controller, Get, Query, StreamableFile } from '@nestjs/common';
import { FluxoCaixaExportService } from './fluxo-caixa-export.service';
import type { FluxoCaixaExportBanco } from '../../common/fluxo-caixa.config';

@Controller('relatorios')
export class FluxoCaixaExportController {
  constructor(private readonly exportService: FluxoCaixaExportService) {}

  @Get('exportacao-fluxo-caixa')
  async exportacaoFluxoCaixa(
    @Query('banco') banco: FluxoCaixaExportBanco = 'consolidado',
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
    const { buffer, filename } = await this.exportService.export(banco, {
      from,
      to,
      mes_pagamento: mes_pagamento ?? mes_competencia,
      mes_competencia,
      mes_competencia_nf,
      empresa_nome,
      empresa_cnpj,
      conta_corrente,
      saldo_inicial,
    });

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
