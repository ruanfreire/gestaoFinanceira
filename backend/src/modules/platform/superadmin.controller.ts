import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SkipTenant } from '../../common/tenant/skip-tenant.decorator';
import type { UserStatus } from '../../common/constants/user-status';
import { SuperadminService } from './superadmin.service';
import { SetClientPlanDto } from './dto/set-client-plan.dto';
import { UpdateOrgModulesDto } from './dto/update-org-modules.dto';
import { isModuleKey } from '../../common/entitlements/module-catalog';

@Controller('superadmin')
@UseGuards(RolesGuard)
@Roles('superadmin')
@SkipTenant()
export class SuperadminController {
  constructor(private readonly superadminService: SuperadminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.superadminService.getDashboard();
  }

  @Get('clients')
  listClients(@Query('status') status?: UserStatus) {
    return this.superadminService.listClients(status);
  }

  @Get('clients/:id')
  getClient(@Param('id') id: string) {
    return this.superadminService.getClient(id);
  }

  @Post('clients/:id/approve')
  approve(@Param('id') id: string, @Req() req: any) {
    return this.superadminService.approve(id, req.user.sub, req.ip);
  }

  @Post('clients/:id/reject')
  reject(@Param('id') id: string, @Req() req: any, @Body() body: { note?: string }) {
    return this.superadminService.reject(id, req.user.sub, req.ip, body?.note);
  }

  @Post('clients/:id/suspend')
  suspend(@Param('id') id: string, @Req() req: any, @Body() body: { note?: string }) {
    return this.superadminService.suspend(id, req.user.sub, req.ip, body?.note);
  }

  @Patch('clients/:id/plan')
  setPlan(@Param('id') id: string, @Req() req: any, @Body() body: SetClientPlanDto) {
    return this.superadminService.setClientPlan(id, body.plan, req.user.sub, req.ip);
  }

  @Get('clients/:id/modules')
  getClientModules(@Param('id') id: string) {
    return this.superadminService.getClientModules(id);
  }

  @Patch('clients/:id/modules')
  updateClientModules(@Param('id') id: string, @Req() req: any, @Body() body: UpdateOrgModulesDto) {
    return this.superadminService.updateClientModules(id, body.enabled_modules, req.user.sub, req.ip);
  }

  @Post('clients/:id/modules/:key/enable')
  enableClientModule(@Param('id') id: string, @Param('key') key: string, @Req() req: any) {
    if (!isModuleKey(key)) {
      throw new BadRequestException('Módulo inválido');
    }
    return this.superadminService.toggleClientModule(id, key, true, req.user.sub, req.ip);
  }

  @Post('clients/:id/modules/:key/disable')
  disableClientModule(@Param('id') id: string, @Param('key') key: string, @Req() req: any) {
    if (!isModuleKey(key)) {
      throw new BadRequestException('Módulo inválido');
    }
    return this.superadminService.toggleClientModule(id, key, false, req.user.sub, req.ip);
  }
}
