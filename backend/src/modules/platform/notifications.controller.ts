import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SkipTenant } from '../../common/tenant/skip-tenant.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(RolesGuard)
@SkipTenant()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles('superadmin', 'client', 'admin', 'user')
  list(@Req() req: any) {
    return this.notificationsService.listForUser(req.user.sub);
  }

  @Get('unread-count')
  @Roles('superadmin', 'client', 'admin', 'user')
  unreadCount(@Req() req: any) {
    return this.notificationsService.unreadCount(req.user.sub).then((count) => ({ count }));
  }

  @Patch(':id/read')
  @Roles('superadmin', 'client', 'admin', 'user')
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.markRead(req.user.sub, id);
  }

  @Post('read-all')
  @Roles('superadmin', 'client', 'admin', 'user')
  markAllRead(@Req() req: any) {
    return this.notificationsService.markAllRead(req.user.sub);
  }

  @Get('push-preferences')
  @Roles('superadmin', 'client', 'admin', 'user')
  getPushPreferences(@Req() req: any) {
    return this.notificationsService.getPushPreferences(req.user.sub);
  }

  @Patch('push-preferences')
  @Roles('superadmin', 'client', 'admin', 'user')
  updatePushPreferences(@Req() req: any, @Body() body: Record<string, boolean>) {
    return this.notificationsService.updatePushPreferences(req.user.sub, body);
  }
}
