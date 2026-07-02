import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserSchema } from './schemas/user.schema';
import { UserActionLogSchema } from '../platform/schemas/user-action-log.schema';
import { OrganizationSchema } from '../platform/schemas/organization.schema';
import { PlatformModule } from '../platform/platform.module';
import { OrgModule } from '../org/org.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'UserActionLog', schema: UserActionLogSchema },
      { name: 'Organization', schema: OrganizationSchema },
    ]),
    forwardRef(() => PlatformModule),
    OrgModule,
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
