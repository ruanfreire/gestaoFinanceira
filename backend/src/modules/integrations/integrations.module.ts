import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImportacoesModule } from '../importacoes/importacoes.module';
import { NotasModule } from '../notas/notas.module';
import { BillingModule } from '../billing/billing.module';
import { HonestIntegrationSchema } from './schemas/honest-integration.schema';
import { OrganizationSchema } from '../platform/schemas/organization.schema';
import { HonestIntegrationService } from './honest-integration.service';
import { EmissaoNfConfigService } from './emissao-nf-config.service';
import { IntegrationsWorkerService } from './integrations-worker.service';
import { IntegrationsController } from './integrations.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'HonestIntegration', schema: HonestIntegrationSchema },
      { name: 'Organization', schema: OrganizationSchema },
    ]),
    ImportacoesModule,
    NotasModule,
    BillingModule,
  ],
  providers: [HonestIntegrationService, EmissaoNfConfigService, IntegrationsWorkerService],
  controllers: [IntegrationsController],
  exports: [HonestIntegrationService, EmissaoNfConfigService, IntegrationsWorkerService],
})
export class IntegrationsModule {}
