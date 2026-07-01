import { BadRequestException, Injectable } from '@nestjs/common';
import { ExtratoNubankService } from '../extrato-nubank/extrato-nubank.service';
import { ExtratoAsaasService } from '../extrato-asaas/extrato-asaas.service';
import {
  buildFluxoCaixaConsolidadoFilename,
  validateFluxoCaixaExportParams,
  type FluxoCaixaExportBanco,
  type FluxoCaixaExportParams,
} from '../../common/fluxo-caixa.config';
import { buildFluxoCaixaConsolidadoWorkbook } from '../../common/fluxo-caixa.export';

@Injectable()
export class FluxoCaixaExportService {
  constructor(
    private readonly nubankService: ExtratoNubankService,
    private readonly asaasService: ExtratoAsaasService,
  ) {}

  async export(
    banco: FluxoCaixaExportBanco,
    params: FluxoCaixaExportParams,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const validationError = validateFluxoCaixaExportParams(params);
    if (validationError) {
      throw new BadRequestException(validationError);
    }

    if (banco === 'consolidado') {
      return this.exportConsolidado(params);
    }
    if (banco === 'nubank') {
      return this.nubankService.exportFluxoCaixa(params);
    }
    if (banco === 'asaas') {
      return this.asaasService.exportFluxoCaixa(params);
    }
    throw new BadRequestException(`Banco inválido: ${banco}`);
  }

  private async exportConsolidado(params: FluxoCaixaExportParams) {
    const baseParams = this.paramsForConsolidado(params);
    const nubankData = await this.nubankService.prepareFluxoCaixaData(baseParams);
    const asaasData = await this.asaasService.prepareFluxoCaixaData(baseParams);

    const sections = [
      { banco: 'nubank' as const, header: nubankData.header, rows: nubankData.rows },
      { banco: 'asaas' as const, header: asaasData.header, rows: asaasData.rows },
    ];

    const buffer = await buildFluxoCaixaConsolidadoWorkbook(sections, nubankData.cartao);

    return {
      buffer,
      filename: buildFluxoCaixaConsolidadoFilename(params),
    };
  }

  private paramsForConsolidado(params: FluxoCaixaExportParams): FluxoCaixaExportParams {
    return {
      from: params.from,
      to: params.to,
      mes_pagamento: params.mes_pagamento ?? params.mes_competencia,
    };
  }
}
