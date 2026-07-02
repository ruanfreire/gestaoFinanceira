import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationSchema } from '../platform/schemas/organization.schema';
import { OrganizationInviteSchema } from '../platform/schemas/organization-invite.schema';
import { UserSchema } from '../auth/schemas/user.schema';
import { OrgController, OrgsPublicController } from './org.controller';
import { OrgService } from './org.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Organization', schema: OrganizationSchema },
      { name: 'OrganizationInvite', schema: OrganizationInviteSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  controllers: [OrgController, OrgsPublicController],
  providers: [OrgService],
  exports: [OrgService],
})
export class OrgModule {}
