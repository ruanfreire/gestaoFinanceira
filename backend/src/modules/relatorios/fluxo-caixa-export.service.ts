import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ImportIntelligenceService } from '../import-intelligence/services/import-intelligence.service';
import {
  buildFluxoCaixaConsolidadoFilename,
  validateFluxoCaixaExportParams,
  type FluxoCaixaExportBanco,
  type FluxoCaixaExportParams,
} from '../../common/fluxo-caixa.config';
import { buildFluxoCaixaConsolidadoWorkbook } from '../../common/fluxo-caixa.export';
import {
  ResourceJobQueueService,
  type ResourceJobPublicView,
} from '../../common/jobs/resource-job-queue.service';

@Injectable()
export class FluxoCaixaExportService {
  constructor(
    private readonly importIntelligenceService: ImportIntelligenceService,
    private readonly jobQueue: ResourceJobQueueService,
  ) {}

  async export(
    banco: FluxoCaixaExportBanco,
    params: FluxoCaixaExportParams,
    profileId?: string,
    tenantId?: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    return this.jobQueue.runExclusive(
      'fluxo_caixa',
      () => this.exportInternal(banco, params, profileId),
      { tenantId, progressMessage: 'Preparando relatório' },
    );
  }

  createExportJob(
    banco: FluxoCaixaExportBanco,
    params: FluxoCaixaExportParams,
    profileId: string | undefined,
    tenantId?: string,
  ): ResourceJobPublicView {
    const validationError = validateFluxoCaixaExportParams(params);
    if (validationError) {
      throw new BadRequestException(validationError);
    }

    const jobId = this.jobQueue.createJob('fluxo_caixa', tenantId);
    this.jobQueue.enqueueJob(jobId, () => this.exportInternal(banco, params, profileId));
    const view = this.jobQueue.getJobView(jobId, tenantId);
    if (!view) {
      throw new BadRequestException('Não foi possível iniciar o relatório.');
    }
    return view;
  }

  getJobStatus(jobId: string, tenantId?: string): ResourceJobPublicView {
    const view = this.jobQueue.getJobView(jobId, tenantId);
    if (!view) {
      throw new NotFoundException('Job não encontrado');
    }
    return view;
  }

  async downloadJob(
    jobId: string,
    tenantId?: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const file = await this.jobQueue.readJobFile(jobId, tenantId);
    return { buffer: file.buffer, filename: file.filename };
  }

  private async exportInternal(
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

    const prepared = [];
    for (const profile of profiles) {
      prepared.push(await this.importIntelligenceService.prepareFluxoCaixaData(String(profile._id), params));
    }

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
