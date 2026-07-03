import { Module } from '@nestjs/common';
import { ImportIntelligenceModule } from '../import-intelligence/import-intelligence.module';
import { FluxoCaixaExportController } from './fluxo-caixa-export.controller';
import { FluxoCaixaExportService } from './fluxo-caixa-export.service';

@Module({
  imports: [ImportIntelligenceModule],
  providers: [FluxoCaixaExportService],
  controllers: [FluxoCaixaExportController],
})
export class RelatoriosModule {}
