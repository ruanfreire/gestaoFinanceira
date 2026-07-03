import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotasService } from './notas.service';
import { NotasController } from './notas.controller';
import { NotaSchema } from './schemas/nota.schema';
import { BankLancamentoSchema, BankImportacaoSchema } from '../import-intelligence/schemas/import-intelligence.schema';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Nota', schema: NotaSchema },
      { name: 'BankLancamento', schema: BankLancamentoSchema },
      { name: 'BankImportacao', schema: BankImportacaoSchema },
    ]),
    BillingModule,
  ],
  providers: [NotasService],
  controllers: [NotasController],
  exports: [NotasService],
})
export class NotasModule {}
