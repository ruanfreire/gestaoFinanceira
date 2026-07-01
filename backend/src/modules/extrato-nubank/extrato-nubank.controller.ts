import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExtratoNubankService } from './extrato-nubank.service';

@Controller('extrato-nubank')
export class ExtratoNubankController {
  constructor(private readonly extratoService: ExtratoNubankService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('Arquivo não enviado');
    const content = file.buffer.toString('utf-8');
    return this.extratoService.processUpload(content, {
      filename: file.originalname,
      originalName: file.originalname,
      uploadedBy: req.user?.sub,
    });
  }

  @Get('sem-match')
  async semMatch() {
    const items = await this.extratoService.listSemMatch();
    return { items, total: items.length };
  }

  @Get('pendentes')
  async pendentes() {
    const items = await this.extratoService.listPendentes();
    return { items, total: items.length };
  }

  @Get('lancamentos/:id/notas')
  async notasParaLancamento(@Param('id') id: string, @Query('q') q?: string) {
    try {
      return await this.extratoService.listNotasParaLancamento(id, q);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  @Post('lancamentos/:id/pagador')
  async atualizarPagador(
    @Param('id') id: string,
    @Body() body: { pagador_nome?: string },
  ) {
    try {
      return await this.extratoService.updatePagadorNome(id, body.pagador_nome ?? '');
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  @Post('vincular')
  async vincular(@Body() body: { lancamento_id: string; nota_id: string }) {
    try {
      return await this.extratoService.vincularManual(body.lancamento_id, body.nota_id);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  @Post('reconciliar-pendentes')
  async reconciliarPendentes() {
    return this.extratoService.reconcilePendentes();
  }

  @Get('exportacao-fluxo-caixa')
  async exportacaoFluxoCaixa(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('mes_competencia') mes_competencia?: string,
    @Query('empresa_nome') empresa_nome?: string,
    @Query('empresa_cnpj') empresa_cnpj?: string,
    @Query('conta_corrente') conta_corrente?: string,
    @Query('saldo_inicial') saldo_inicial?: string,
  ) {
    const { buffer, filename } = await this.extratoService.exportFluxoCaixa({
      from,
      to,
      mes_competencia,
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
