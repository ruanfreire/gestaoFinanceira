import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImportacoesBancariasService } from './importacoes-bancarias.service';
import { ImportacoesBancariasController } from './importacoes-bancarias.controller';
import { AsaasImportacaoSchema } from '../extrato-asaas/schemas/asaas-importacao.schema';
import { AsaasLancamentoSchema } from '../extrato-asaas/schemas/asaas-lancamento.schema';
import { NubankImportacaoSchema } from '../extrato-nubank/schemas/nubank-importacao.schema';
import { NubankLancamentoSchema } from '../extrato-nubank/schemas/nubank-lancamento.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'AsaasImportacao', schema: AsaasImportacaoSchema },
      { name: 'AsaasLancamento', schema: AsaasLancamentoSchema },
      { name: 'NubankImportacao', schema: NubankImportacaoSchema },
      { name: 'NubankLancamento', schema: NubankLancamentoSchema },
    ]),
  ],
  providers: [ImportacoesBancariasService],
  controllers: [ImportacoesBancariasController],
  exports: [ImportacoesBancariasService],
})
export class ImportacoesBancariasModule {}
