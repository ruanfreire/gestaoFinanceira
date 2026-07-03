import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { AtualizarEmissaoRascunhoDto, CriarEmissaoRascunhoDto } from './dto/emissao.dto';
import { EmissaoService } from './emissao.service';

@Controller('emissao')
export class EmissaoController {
  constructor(private readonly emissaoService: EmissaoService) {}

  @Get('counts')
  getCounts() {
    return this.emissaoService.getCounts();
  }

  @Post('rascunhos')
  criarRascunho(@Req() req: { user?: { sub?: string } }, @Body() body: CriarEmissaoRascunhoDto) {
    return this.emissaoService.criarRascunho(body, req.user?.sub);
  }

  @Get('rascunhos/:id')
  findById(@Param('id') id: string) {
    return this.emissaoService.findById(id);
  }

  @Patch('rascunhos/:id')
  atualizar(@Param('id') id: string, @Body() body: AtualizarEmissaoRascunhoDto) {
    return this.emissaoService.atualizarRascunho(id, body);
  }

  @Post('rascunhos/:id/confirmar')
  confirmar(@Req() req: { user?: { sub?: string } }, @Param('id') id: string) {
    return this.emissaoService.confirmarRascunho(id, req.user?.sub);
  }
}
