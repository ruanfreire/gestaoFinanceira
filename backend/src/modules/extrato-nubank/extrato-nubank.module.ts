import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExtratoNubankService } from './extrato-nubank.service';
import { ExtratoNubankController } from './extrato-nubank.controller';
import { NubankImportacaoSchema } from './schemas/nubank-importacao.schema';
import { NubankLancamentoSchema } from './schemas/nubank-lancamento.schema';
import { NotasModule } from '../notas/notas.module';
import { NotaSchema } from '../notas/schemas/nota.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'NubankImportacao', schema: NubankImportacaoSchema },
      { name: 'NubankLancamento', schema: NubankLancamentoSchema },
      { name: 'Nota', schema: NotaSchema },
    ]),
    NotasModule,
  ],
  providers: [ExtratoNubankService],
  controllers: [ExtratoNubankController],
  exports: [ExtratoNubankService],
})
export class ExtratoNubankModule {}
