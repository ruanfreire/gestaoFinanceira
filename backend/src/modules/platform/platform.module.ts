import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from '../auth/schemas/user.schema';
import { NotificationSchema } from './schemas/notification.schema';
import { PushSubscriptionSchema } from './schemas/push-subscription.schema';
import { UserActionLogSchema } from './schemas/user-action-log.schema';
import { OrganizationSchema } from './schemas/organization.schema';
import { SuperadminController } from './superadmin.controller';
import { SuperadminService } from './superadmin.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushController } from './push.controller';
import { PushService } from './push.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Organization', schema: OrganizationSchema },
      { name: 'Notification', schema: NotificationSchema },
      { name: 'PushSubscription', schema: PushSubscriptionSchema },
      { name: 'UserActionLog', schema: UserActionLogSchema },
    ]),
  ],
  controllers: [SuperadminController, NotificationsController, PushController],
  providers: [SuperadminService, NotificationsService, PushService],
  exports: [NotificationsService, PushService],
})
export class PlatformModule {}
