import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BankImportacaoSchema,
  BankLancamentoSchema,
} from '../import-intelligence/schemas/import-intelligence.schema';
import { NotasModule } from '../notas/notas.module';
import { DocumentCoreModule } from '../document-core/document-core.module';
import { ConciliacaoController } from './conciliacao.controller';
import { ConciliacaoService } from './conciliacao.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'BankLancamento', schema: BankLancamentoSchema },
      { name: 'BankImportacao', schema: BankImportacaoSchema },
    ]),
    NotasModule,
    DocumentCoreModule,
  ],
  providers: [ConciliacaoService],
  controllers: [ConciliacaoController],
  exports: [ConciliacaoService],
})
export class ConciliacaoModule {}
