import { BadRequestException, Injectable } from '@nestjs/common';
import { ImportIntelligenceService } from '../import-intelligence/services/import-intelligence.service';
import {
  buildFluxoCaixaConsolidadoFilename,
  validateFluxoCaixaExportParams,
  type FluxoCaixaExportBanco,
  type FluxoCaixaExportParams,
} from '../../common/fluxo-caixa.config';
import { buildFluxoCaixaConsolidadoWorkbook } from '../../common/fluxo-caixa.export';

@Injectable()
export class FluxoCaixaExportService {
  constructor(private readonly importIntelligenceService: ImportIntelligenceService) {}

  async export(
    banco: FluxoCaixaExportBanco,
    params: FluxoCaixaExportParams,
    profileId?: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const validationError = validateFluxoCaixaExportParams(params);
    if (validationError) {
      throw new BadRequestException(validationError);
    }

    if (banco === 'custom') {
      if (!profileId) {
        throw new BadRequestException('profile_id obrigatório para exportação por banco.');
      }
      return this.importIntelligenceService.exportFluxoCaixa(profileId, params);
    }

    if (banco === 'consolidado') {
      return this.exportConsolidado(params);
    }

    throw new BadRequestException(`Banco inválido: ${banco}. Use consolidado ou custom com profile_id.`);
  }

  private async exportConsolidado(params: FluxoCaixaExportParams) {
    const profiles = await this.importIntelligenceService.listProfilesForFluxoExport();
    if (!profiles.length) {
      throw new BadRequestException('Nenhum banco configurado para exportação. Importe um extrato primeiro.');
    }

    const prepared = await Promise.all(
      profiles.map((profile) =>
        this.importIntelligenceService.prepareFluxoCaixaData(String(profile._id), params),
      ),
    );

    const sections = prepared
      .filter((data) => data.rows.length > 0)
      .map((data) => ({
        layout: data.layout,
        sheetName: data.sheetName,
        header: data.header,
        rows: data.rows,
      }));

    if (!sections.length) {
      throw new BadRequestException(
        'Nenhum lançamento encontrado para o período informado. Ajuste o mês de pagamento ou importe extratos.',
      );
    }

    const buffer = await buildFluxoCaixaConsolidadoWorkbook(sections);

    return {
      buffer,
      filename: buildFluxoCaixaConsolidadoFilename(params),
    };
  }
}
