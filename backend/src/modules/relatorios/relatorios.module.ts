import { Module } from '@nestjs/common';
import { ExtratoNubankModule } from '../extrato-nubank/extrato-nubank.module';
import { ExtratoAsaasModule } from '../extrato-asaas/extrato-asaas.module';
import { FluxoCaixaExportController } from './fluxo-caixa-export.controller';
import { FluxoCaixaExportService } from './fluxo-caixa-export.service';

@Module({
  imports: [ExtratoNubankModule, ExtratoAsaasModule],
  providers: [FluxoCaixaExportService],
  controllers: [FluxoCaixaExportController],
})
export class RelatoriosModule {}
