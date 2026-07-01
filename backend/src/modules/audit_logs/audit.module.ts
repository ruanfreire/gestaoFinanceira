import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditService } from './audit.service';
import { AuditMiddleware } from './audit.middleware';
import { AuditLogSchema } from './schemas/audit_log.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'AuditLog', schema: AuditLogSchema }])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditMiddleware).forRoutes('*');
  }
}

