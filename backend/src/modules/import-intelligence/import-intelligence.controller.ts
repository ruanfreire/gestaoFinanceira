import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportIntelligenceService } from './services/import-intelligence.service';
import type { ImportProfileMapping } from './types/import-profile.types';

@Controller('import-intelligence')
export class ImportIntelligenceController {
  constructor(private readonly service: ImportIntelligenceService) {}

  @Get('presets')
  listPresets() {
    return this.service.listPresets();
  }

  @Get('profiles')
  listProfiles() {
    return this.service.listProfiles();
  }

  @Get('profiles/:id')
  getProfile(@Param('id') id: string) {
    return this.service.getProfile(id);
  }

  @Post('analyze')
  @UseInterceptors(FileInterceptor('file'))
  async analyze(
    @UploadedFile() file: Express.Multer.File,
    @Body('preset_key') presetKey: string | undefined,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    return this.service.analyzeUpload(file.buffer, file.originalname, req.user?.sub, presetKey);
  }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  async preview(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Body('mapping') mappingJson?: string,
  ) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    if (!mappingJson) throw new BadRequestException('mapping obrigatório');
    const mapping = JSON.parse(mappingJson) as ImportProfileMapping;
    const content = file.buffer.toString('utf-8');
    return this.service.previewFile(content, mapping, file.originalname, req.user?.sub);
  }

  @Post('profiles')
  async saveProfile(
    @Body()
    body: {
      name: string;
      banco_label: string;
      empresa_nome?: string;
      empresa_cnpj?: string;
      conta_corrente?: string;
      mapping: ImportProfileMapping;
      confidence_score?: number;
      file_kind?: 'csv' | 'json' | 'xlsx';
      system_key?: string;
    },
    @Req() req: any,
  ) {
    return this.service.saveProfile({
      ...body,
      userId: req.user?.sub,
    });
  }

  @Patch('profiles/:id')
  async updateProfile(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      banco_label?: string;
      empresa_nome?: string;
      empresa_cnpj?: string;
      conta_corrente?: string;
      mapping?: ImportProfileMapping;
    },
    @Req() req: any,
  ) {
    return this.service.updateProfile(id, {
      ...body,
      userId: req.user?.sub,
    });
  }

  @Delete('profiles/:id')
  async deleteProfile(@Param('id') id: string) {
    return this.service.deleteProfile(id);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Body('profile_id') profileId: string,
    @Body('label') label: string | undefined,
    @Body('mapping') mappingJson: string | undefined,
    @Body('mapping_before') mappingBeforeJson: string | undefined,
    @Body('suggestion_accepted_without_edit') suggestionAccepted: string | undefined,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    if (!profileId) throw new BadRequestException('profile_id obrigatório');
    const content = file.buffer.toString('utf-8');
    const mappingOverride = mappingJson
      ? (JSON.parse(mappingJson) as ImportProfileMapping)
      : undefined;
    const mappingBefore = mappingBeforeJson
      ? (JSON.parse(mappingBeforeJson) as ImportProfileMapping)
      : undefined;
    return this.service.importFile({
      content,
      fileName: file.originalname,
      profileId,
      userId: req.user?.sub,
      label,
      mappingOverride,
      mappingBeforeImport: mappingBefore,
      suggestionAcceptedWithoutEdit: suggestionAccepted === 'true',
    });
  }

  @Post('feedback')
  submitFeedback(
    @Body()
    body: {
      profile_id: string;
      before_mapping: ImportProfileMapping;
      after_mapping: ImportProfileMapping;
      accepted: boolean;
    },
  ) {
    return this.service.submitFeedback({
      profileId: body.profile_id,
      beforeMapping: body.before_mapping,
      afterMapping: body.after_mapping,
      accepted: body.accepted,
    });
  }

  @Get('pendentes')
  async pendentes() {
    const items = await this.service.listPendentes();
    return { items, total: items.length };
  }

  @Get('sem-match')
  async semMatch() {
    const items = await this.service.listSemMatch();
    return { items, total: items.length };
  }

  @Get('lancamentos/:id/notas')
  async notasParaLancamento(@Param('id') id: string, @Query('q') q?: string) {
    return this.service.listNotasParaLancamento(id, q);
  }

  @Post('vincular')
  async vincular(@Body() body: { lancamento_id: string; nota_id: string }) {
    return this.service.vincularManual(body.lancamento_id, body.nota_id);
  }

  @Post('lancamentos/:id/pagador')
  async updatePagador(@Param('id') id: string, @Body() body: { pagador_nome: string }) {
    return this.service.updatePagadorNome(id, body.pagador_nome ?? '');
  }

  @Get('metrics')
  getMetrics() {
    return this.service.getMetrics();
  }

  @Get('sessions')
  listSessions(@Query('limit') limit?: string) {
    return this.service.listSessions(limit ? Number(limit) : 20);
  }

  @Get('ops')
  getOps() {
    return this.service.getOpsDashboard();
  }
}
