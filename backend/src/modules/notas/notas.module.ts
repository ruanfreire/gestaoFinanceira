import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotasService } from './notas.service';
import { NotasController } from './notas.controller';
import { NotaSchema } from './schemas/nota.schema';
import { AsaasLancamentoSchema } from '../extrato-asaas/schemas/asaas-lancamento.schema';
import { AsaasImportacaoSchema } from '../extrato-asaas/schemas/asaas-importacao.schema';
import { NubankLancamentoSchema } from '../extrato-nubank/schemas/nubank-lancamento.schema';
import { NubankImportacaoSchema } from '../extrato-nubank/schemas/nubank-importacao.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Nota', schema: NotaSchema },
      { name: 'AsaasLancamento', schema: AsaasLancamentoSchema },
      { name: 'AsaasImportacao', schema: AsaasImportacaoSchema },
      { name: 'NubankLancamento', schema: NubankLancamentoSchema },
      { name: 'NubankImportacao', schema: NubankImportacaoSchema },
    ]),
  ],
  providers: [NotasService],
  controllers: [NotasController],
  exports: [NotasService],
})
export class NotasModule {}
