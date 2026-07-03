import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImportacoesBancariasService } from './importacoes-bancarias.service';
import { ImportacoesBancariasController } from './importacoes-bancarias.controller';
import {
  BankImportacaoSchema,
  BankLancamentoSchema,
} from '../import-intelligence/schemas/import-intelligence.schema';
import { NotasModule } from '../notas/notas.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'BankImportacao', schema: BankImportacaoSchema },
      { name: 'BankLancamento', schema: BankLancamentoSchema },
    ]),
    NotasModule,
  ],
  providers: [ImportacoesBancariasService],
  controllers: [ImportacoesBancariasController],
  exports: [ImportacoesBancariasService],
})
export class ImportacoesBancariasModule {}
