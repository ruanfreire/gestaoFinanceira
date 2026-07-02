import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExtratoAsaasService } from './extrato-asaas.service';
import { ExtratoAsaasController } from './extrato-asaas.controller';
import { AsaasImportacaoSchema } from './schemas/asaas-importacao.schema';
import { AsaasLancamentoSchema } from './schemas/asaas-lancamento.schema';
import { NotasModule } from '../notas/notas.module';
import { BillingModule } from '../billing/billing.module';
import { NotaSchema } from '../notas/schemas/nota.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'AsaasImportacao', schema: AsaasImportacaoSchema },
      { name: 'AsaasLancamento', schema: AsaasLancamentoSchema },
      { name: 'Nota', schema: NotaSchema },
    ]),
    NotasModule,
    BillingModule,
  ],
  providers: [ExtratoAsaasService],
  controllers: [ExtratoAsaasController],
  exports: [ExtratoAsaasService],
})
export class ExtratoAsaasModule {}
