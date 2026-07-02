import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AsaasLancamentoSchema } from '../extrato-asaas/schemas/asaas-lancamento.schema';
import { NubankLancamentoSchema } from '../extrato-nubank/schemas/nubank-lancamento.schema';
import { ConciliacaoController } from './conciliacao.controller';
import { ConciliacaoService } from './conciliacao.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'AsaasLancamento', schema: AsaasLancamentoSchema },
      { name: 'NubankLancamento', schema: NubankLancamentoSchema },
    ]),
  ],
  providers: [ConciliacaoService],
  controllers: [ConciliacaoController],
  exports: [ConciliacaoService],
})
export class ConciliacaoModule {}
