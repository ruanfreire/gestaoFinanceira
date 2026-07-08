import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentCoreController } from './document-core.controller';
import { DocumentCoreService } from './services/document-core.service';
import { FreteTituloService } from './services/frete-titulo.service';
import { FreteConciliacaoService } from './services/frete-conciliacao.service';
import { DocumentEnvelopeSchema } from './schemas/document-envelope.schema';
import { FreteTituloSchema } from './schemas/frete-titulo.schema';
import {
  BankImportacaoSchema,
  BankLancamentoSchema,
} from '../import-intelligence/schemas/import-intelligence.schema';
import { NotasModule } from '../notas/notas.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'DocumentEnvelope', schema: DocumentEnvelopeSchema },
      { name: 'FreteTitulo', schema: FreteTituloSchema },
      { name: 'BankLancamento', schema: BankLancamentoSchema },
      { name: 'BankImportacao', schema: BankImportacaoSchema },
    ]),
    NotasModule,
  ],
  controllers: [DocumentCoreController],
  providers: [DocumentCoreService, FreteTituloService, FreteConciliacaoService],
  exports: [DocumentCoreService, FreteTituloService, FreteConciliacaoService],
})
export class DocumentCoreModule {}
