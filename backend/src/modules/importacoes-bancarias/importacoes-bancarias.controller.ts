import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ImportacoesBancariasService } from './importacoes-bancarias.service';

@Controller('importacoes-bancarias')
export class ImportacoesBancariasController {
  constructor(private readonly service: ImportacoesBancariasService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get(':banco/:id/lancamentos')
  async lancamentos(
    @Param('banco') banco: string,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status_conciliacao') status_conciliacao?: string,
    @Query('sort') sort?: 'asc' | 'desc',
  ) {
    return this.service.listLancamentos(banco, id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      status_conciliacao,
      sort,
    });
  }

  @Get(':banco/:id/csv')
  async downloadCsv(@Param('banco') banco: string, @Param('id') id: string) {
    const doc = await this.service.getOriginalCsv(banco, id);
    const filename = doc.originalName || doc.filename || `extrato-${banco}-${id}.csv`;
    const buffer = Buffer.from(String(doc.originalCsv), 'utf-8');

    return new StreamableFile(buffer, {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Get(':banco/:id')
  async detail(@Param('banco') banco: string, @Param('id') id: string) {
    return this.service.findById(banco, id);
  }

  @Patch(':banco/:id')
  async update(
    @Param('banco') banco: string,
    @Param('id') id: string,
    @Body() body: { label?: string; descricao?: string },
  ) {
    try {
      return await this.service.updateMetadata(banco, id, body);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  @Delete(':banco/:id')
  async remove(@Param('banco') banco: string, @Param('id') id: string) {
    try {
      return await this.service.remove(banco, id);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }
}
