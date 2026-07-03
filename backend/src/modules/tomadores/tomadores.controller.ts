import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantRoles } from '../../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../../common/guards/tenant-roles.guard';
import { CreateTomadorDto, ResolverTomadorDto, UpdateTomadorDto } from './dto/tomador.dto';
import { TomadoresService } from './tomadores.service';

@Controller('tomadores')
@UseGuards(TenantRolesGuard)
export class TomadoresController {
  constructor(private readonly tomadoresService: TomadoresService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    return this.tomadoresService.list({
      page: Number(page) || 1,
      limit: Number(limit) || 50,
      q: typeof q === 'string' ? q : undefined,
    });
  }

  @Post('resolver')
  resolver(@Body() body: ResolverTomadorDto) {
    return this.tomadoresService.resolver(body);
  }

  @Post('importar-de-notas')
  @TenantRoles('owner')
  importarDeNotas() {
    return this.tomadoresService.importarDeNotas();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.tomadoresService.findById(id);
  }

  @Post()
  @TenantRoles('owner')
  create(@Body() body: CreateTomadorDto) {
    return this.tomadoresService.create(body);
  }

  @Patch(':id')
  @TenantRoles('owner')
  update(@Param('id') id: string, @Body() body: UpdateTomadorDto) {
    return this.tomadoresService.update(id, body);
  }

  @Delete(':id')
  @TenantRoles('owner')
  remove(@Param('id') id: string) {
    return this.tomadoresService.softDelete(id);
  }
}
