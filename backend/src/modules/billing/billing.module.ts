import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationSchema } from '../platform/schemas/organization.schema';
import { NotaSchema } from '../notas/schemas/nota.schema';
import { ImportacaoSchema } from '../importacoes/schemas/importacao.schema';
import { AsaasImportacaoSchema } from '../extrato-asaas/schemas/asaas-importacao.schema';
import { NubankImportacaoSchema } from '../extrato-nubank/schemas/nubank-importacao.schema';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing-webhook.controller';
import { BillingService, PlanLimitsService } from './billing.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Organization', schema: OrganizationSchema },
      { name: 'Nota', schema: NotaSchema },
      { name: 'Importacao', schema: ImportacaoSchema },
      { name: 'AsaasImportacao', schema: AsaasImportacaoSchema },
      { name: 'NubankImportacao', schema: NubankImportacaoSchema },
    ]),
  ],
  controllers: [BillingController, BillingWebhookController],
  providers: [BillingService, PlanLimitsService],
  exports: [BillingService, PlanLimitsService],
})
export class BillingModule {}
