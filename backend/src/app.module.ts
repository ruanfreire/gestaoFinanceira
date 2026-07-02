import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { PlatformModule } from './modules/platform/platform.module';
import { OrgModule } from './modules/org/org.module';
import { BillingModule } from './modules/billing/billing.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtGuard } from './modules/auth/jwt.guard';
import { TenantGuard } from './common/tenant/tenant.guard';
import { TenantInterceptor } from './common/tenant/tenant.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),
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
    PlatformModule,
    OrgModule,
    BillingModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    ...(process.env.NODE_ENV !== 'test'
      ? [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
      : []),
  ],
})
export class AppModule {}
