import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SkipTenant } from '../../common/tenant/skip-tenant.decorator';
import { PushService } from './push.service';

@Controller('push')
@UseGuards(RolesGuard)
@SkipTenant()
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-public-key')
  @Roles('superadmin', 'client', 'admin', 'user')
  getVapidKey() {
    return { publicKey: this.pushService.getVapidPublicKey() };
  }

  @Post('subscribe')
  @Roles('superadmin', 'client', 'admin', 'user')
  subscribe(
    @Req() req: any,
    @Body()
    body: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    },
  ) {
    return this.pushService.saveSubscription(
      req.user.sub,
      body,
      req.headers['user-agent'] as string | undefined,
    );
  }

  @Delete('subscribe')
  @Roles('superadmin', 'client', 'admin', 'user')
  unsubscribe(@Req() req: any, @Body() body: { endpoint: string }) {
    return this.pushService.removeSubscription(req.user.sub, body.endpoint);
  }
}
