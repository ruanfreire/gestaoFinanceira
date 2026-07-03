import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotaSchema } from '../notas/schemas/nota.schema';
import { TomadorSchema } from './schemas/tomador.schema';
import { TomadoresController } from './tomadores.controller';
import { TomadoresService } from './tomadores.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Tomador', schema: TomadorSchema },
      { name: 'Nota', schema: NotaSchema },
    ]),
  ],
  providers: [TomadoresService],
  controllers: [TomadoresController],
  exports: [TomadoresService],
})
export class TomadoresModule {}
