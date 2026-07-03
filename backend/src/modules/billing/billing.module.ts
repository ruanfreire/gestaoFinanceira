import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationSchema } from '../platform/schemas/organization.schema';
import { NotaSchema } from '../notas/schemas/nota.schema';
import { ImportacaoSchema } from '../importacoes/schemas/importacao.schema';
import { BankImportacaoSchema } from '../import-intelligence/schemas/import-intelligence.schema';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing-webhook.controller';
import { BillingService } from './billing.service';
import { PlanLimitsService } from './plan-limits.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Organization', schema: OrganizationSchema },
      { name: 'Nota', schema: NotaSchema },
      { name: 'Importacao', schema: ImportacaoSchema },
      { name: 'BankImportacao', schema: BankImportacaoSchema },
    ]),
  ],
  controllers: [BillingController, BillingWebhookController],
  providers: [BillingService, PlanLimitsService],
  exports: [BillingService, PlanLimitsService],
})
export class BillingModule {}
