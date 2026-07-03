import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BankImportacaoSchema,
  BankLancamentoSchema,
  ImportAnalysisSessionSchema,
  ImportProfileSchema,
  RagDocumentSchema,
} from './schemas/import-intelligence.schema';
import { GeminiUsageLogSchema } from './schemas/gemini-usage-log.schema';
import { ImportIntelligenceController } from './import-intelligence.controller';
import { ImportIntelligenceService } from './services/import-intelligence.service';
import { ImportAiAnalysisService } from './services/import-ai-analysis.service';
import { GeminiAnalysisService } from './services/gemini-analysis.service';
import { GeminiUsageService } from './services/gemini-usage.service';
import { RagRetrievalService } from './services/rag-retrieval.service';
import { NotasModule } from '../notas/notas.module';
import { BillingModule } from '../billing/billing.module';
import { NotaSchema } from '../notas/schemas/nota.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ImportProfile', schema: ImportProfileSchema },
      { name: 'ImportAnalysisSession', schema: ImportAnalysisSessionSchema },
      { name: 'RagDocument', schema: RagDocumentSchema },
      { name: 'BankImportacao', schema: BankImportacaoSchema },
      { name: 'BankLancamento', schema: BankLancamentoSchema },
      { name: 'Nota', schema: NotaSchema },
      { name: 'GeminiUsageLog', schema: GeminiUsageLogSchema },
    ]),
    NotasModule,
    BillingModule,
  ],
  controllers: [ImportIntelligenceController],
  providers: [
    ImportIntelligenceService,
    ImportAiAnalysisService,
    GeminiAnalysisService,
    GeminiUsageService,
    RagRetrievalService,
  ],
  exports: [ImportIntelligenceService],
})
export class ImportIntelligenceModule {}
