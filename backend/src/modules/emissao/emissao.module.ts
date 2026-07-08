import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BankImportacaoSchema, BankLancamentoSchema } from '../import-intelligence/schemas/import-intelligence.schema';
import { OrganizationSchema } from '../platform/schemas/organization.schema';
import { NotasModule } from '../notas/notas.module';
import { TomadoresModule } from '../tomadores/tomadores.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AuditModule } from '../audit_logs/audit.module';
import { EmissaoRascunhoSchema } from './schemas/emissao-rascunho.schema';
import { EmissaoController } from './emissao.controller';
import { EmissaoService } from './emissao.service';
import { PrefeituraEmissaoService } from './prefeitura-emissao.service';
import { SpNfseEmissaoProvider } from './providers/sp-nfse-emissao.provider';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'EmissaoRascunho', schema: EmissaoRascunhoSchema },
      { name: 'BankLancamento', schema: BankLancamentoSchema },
      { name: 'BankImportacao', schema: BankImportacaoSchema },
      { name: 'Organization', schema: OrganizationSchema },
    ]),
    NotasModule,
    TomadoresModule,
    IntegrationsModule,
    AuditModule,
  ],
  providers: [EmissaoService, PrefeituraEmissaoService, SpNfseEmissaoProvider],
  controllers: [EmissaoController],
  exports: [EmissaoService],
})
export class EmissaoModule {}
