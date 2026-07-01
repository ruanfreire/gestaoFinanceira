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
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportacoesService } from './importacoes.service';
import { NotasService } from '../notas/notas.service';

@Controller('importacoes')
export class ImportacoesController {
  constructor(
    private readonly importService: ImportacoesService,
    private readonly notasService: NotasService,
  ) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.importService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get(':id/faturas')
  async faturas(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.importService.listFaturas(id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get(':id/json')
  async downloadJson(@Param('id') id: string) {
    const doc = await this.importService.getOriginalJson(id);
    const filename = doc.originalName || doc.filename || `importacao-${id}.json`;
    const buffer = Buffer.from(JSON.stringify(doc.originalJson, null, 2), 'utf-8');

    return new StreamableFile(buffer, {
      type: 'application/json',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Get(':id')
  async detail(@Param('id') id: string, @Query('include_json') includeJson?: string) {
    return this.importService.findById(id, includeJson === '1' || includeJson === 'true');
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { label?: string; descricao?: string },
  ) {
    return this.importService.updateMetadata(id, body);
  }

  @Post(':id/reprocessar')
  async reprocessar(@Param('id') id: string) {
    try {
      return await this.importService.reprocess(id, this.notasService);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.importService.remove(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('Arquivo não enviado');

    const saved = await this.importService.createRecord({
      filename: file.originalname,
      originalName: file.originalname,
      uploadedBy: req.user?.sub,
      status: 'processing',
    });

    const content = file.buffer.toString('utf-8');
    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch (e) {
      await this.importService.markFailed(String(saved._id), 'JSON inválido');
      throw new BadRequestException('Arquivo JSON inválido');
    }

    try {
      const stats = await this.importService.processJson(
        String(saved._id),
        json,
        req.user?.sub,
        this.notasService,
      );
      return { ok: true, id: saved._id, ...stats };
    } catch (e) {
      await this.importService.markFailed(String(saved._id), (e as Error).message);
      throw new BadRequestException((e as Error).message);
    }
  }
}
