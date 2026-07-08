import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationSchema } from '../../modules/platform/schemas/organization.schema';
import { EntitlementsService } from './entitlements.service';
import { RequireModuleGuard } from './require-module.guard';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Organization', schema: OrganizationSchema }]),
  ],
  providers: [EntitlementsService, RequireModuleGuard],
  exports: [EntitlementsService, RequireModuleGuard],
})
export class EntitlementsModule {}
