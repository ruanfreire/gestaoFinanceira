import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { NotasModule } from './modules/notas/notas.module';
import { ImportacoesModule } from './modules/importacoes/importacoes.module';
import { ExtratoAsaasModule } from './modules/extrato-asaas/extrato-asaas.module';
import { ExtratoNubankModule } from './modules/extrato-nubank/extrato-nubank.module';
import { ImportacoesBancariasModule } from './modules/importacoes-bancarias/importacoes-bancarias.module';
import { RelatoriosModule } from './modules/relatorios/relatorios.module';
import { AuditModule } from './modules/audit_logs/audit.module';
import { HealthModule } from './modules/health/health.module';
import { ConciliacaoModule } from './modules/conciliacao/conciliacao.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtGuard } from './modules/auth/jwt.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/finance', {
      autoCreate: true,
    }),
    AuthModule,
    NotasModule,
    ImportacoesModule,
    ExtratoAsaasModule,
    ExtratoNubankModule,
    ImportacoesBancariasModule,
    RelatoriosModule,
    AuditModule,
    HealthModule,
    ConciliacaoModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtGuard }],
})
export class AppModule {}

