import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { TenantRoles } from '../../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../../common/guards/tenant-roles.guard';
import { SkipTenant } from '../../common/tenant/skip-tenant.decorator';
import { OrgService } from './org.service';
import { CreateInviteDto } from './dto/invite.dto';

@Controller('orgs')
@SkipTenant()
export class OrgsPublicController {
  constructor(private readonly orgService: OrgService) {}

  @Get('resolve/:slug')
  @Public()
  resolve(@Param('slug') slug: string) {
    return this.orgService.resolveBySlug(slug);
  }
}

@Controller('org')
@UseGuards(TenantRolesGuard)
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get('members')
  @TenantRoles('owner')
  listMembers(@Req() req: { user: { tenantId?: string } }) {
    return this.orgService.listMembers(req.user.tenantId!);
  }

  @Get('invites')
  @TenantRoles('owner')
  listInvites(@Req() req: { user: { tenantId?: string } }) {
    return this.orgService.listInvites(req.user.tenantId!);
  }

  @Post('invites')
  @TenantRoles('owner')
  createInvite(@Req() req: { user: { sub: string; tenantId?: string } }, @Body() body: CreateInviteDto) {
    return this.orgService.createInvite(req.user.tenantId!, req.user.sub, body);
  }

  @Delete('invites/:id')
  @TenantRoles('owner')
  revokeInvite(@Req() req: { user: { tenantId?: string } }, @Param('id') id: string) {
    return this.orgService.revokeInvite(req.user.tenantId!, id);
  }
}
