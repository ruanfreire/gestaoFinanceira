import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { RequireModule } from '../../common/entitlements/require-module.decorator';
import { RequireModuleGuard } from '../../common/entitlements/require-module.guard';
import { DocumentCoreService } from './services/document-core.service';
import { FreteConciliacaoService } from './services/frete-conciliacao.service';

@Controller('documents')
@UseGuards(RequireModuleGuard)
export class DocumentCoreController {
  constructor(
    private readonly service: DocumentCoreService,
    private readonly freteConciliacao: FreteConciliacaoService,
  ) {}

  @Post('ingest')
  @RequireModule('document_core')
  @UseInterceptors(FilesInterceptor('files', 100, { limits: { fileSize: 15 * 1024 * 1024 } }))
  async ingest(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) {
      throw new BadRequestException('Envie ao menos um arquivo (XML ou ZIP)');
    }
    return this.service.ingestFiles(
      files.map((f) => ({
        buffer: f.buffer,
        originalname: f.originalname,
        mimetype: f.mimetype,
      })),
    );
  }

  @Post('link/run')
  @RequireModule('logistics_frete')
  runLinkBatch() {
    return this.freteConciliacao.runBatchLink();
  }

  @Get('frete-conciliacao/counts')
  @RequireModule('logistics_frete')
  freteCounts() {
    return this.freteConciliacao.getCounts();
  }

  @Get('frete-conciliacao/pendentes')
  @RequireModule('logistics_frete')
  async fretePendentes() {
    const items = await this.freteConciliacao.listPendentes();
    return { items, total: items.length };
  }

  @Get('frete-conciliacao/sem-match')
  @RequireModule('logistics_frete')
  async freteSemMatch() {
    const items = await this.freteConciliacao.listSemMatch();
    return { items, total: items.length };
  }

  @Get('frete-conciliacao/lancamentos/:id/titulos')
  @RequireModule('logistics_frete')
  titulosParaLancamento(@Param('id') id: string, @Query('q') q?: string) {
    return this.freteConciliacao.listTitulosParaLancamento(id, q);
  }

  @Post('frete-conciliacao/vincular')
  @RequireModule('logistics_frete')
  vincularFrete(@Body() body: { lancamento_id: string; frete_titulo_id: string }) {
    return this.freteConciliacao.vincularManual(body.lancamento_id, body.frete_titulo_id);
  }

  @Get()
  @RequireModule('document_core')
  list(
    @Query('docType') docType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listDocuments({
      docType,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('frete-titulos')
  @RequireModule('logistics_frete')
  listFreteTitulos(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listFreteTitulos({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
    });
  }

  @Get(':id')
  @RequireModule('document_core')
  getOne(@Param('id') id: string) {
    return this.service.getDocument(id);
  }
}
