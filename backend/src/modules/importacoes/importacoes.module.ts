import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImportacoesService } from './importacoes.service';
import { ImportacoesController } from './importacoes.controller';
import { ImportacaoSchema } from './schemas/importacao.schema';
import { NotasModule } from '../notas/notas.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Importacao', schema: ImportacaoSchema }]),
    NotasModule,
  ],
  providers: [ImportacoesService],
  controllers: [ImportacoesController],
  exports: [ImportacoesService],
})
export class ImportacoesModule {}

