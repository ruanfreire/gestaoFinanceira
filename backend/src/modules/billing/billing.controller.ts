import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { TenantRoles } from '../../common/decorators/tenant-roles.decorator';
import { TenantRolesGuard } from '../../common/guards/tenant-roles.guard';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller('billing')
@UseGuards(TenantRolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  listPlans() {
    return { items: this.billingService.listPlans() };
  }

  @Get('status')
  async status(@Req() req: { user: { sub: string; tenantId?: string } }) {
    if (!req.user.tenantId) {
      return { ok: false, message: 'Conta sem organização' };
    }
    const status = await this.billingService.getStatus(req.user.tenantId);
    return { ok: true, ...status };
  }

  @Post('checkout')
  @TenantRoles('owner')
  async checkout(@Req() req: { user: { sub: string; tenantId?: string } }, @Body() body: CreateCheckoutDto) {
    if (!req.user.tenantId) {
      return { ok: false, message: 'Conta sem organização' };
    }
    const session = await this.billingService.createCheckoutSession(
      req.user.tenantId,
      req.user.sub,
      body.plan,
    );
    return { ok: true, ...session };
  }

  @Post('portal')
  @TenantRoles('owner')
  async portal(@Req() req: { user: { tenantId?: string } }) {
    if (!req.user.tenantId) {
      return { ok: false, message: 'Conta sem organização' };
    }
    const session = await this.billingService.createPortalSession(req.user.tenantId);
    return { ok: true, ...session };
  }
}
