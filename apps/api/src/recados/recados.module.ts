import { Module } from '@nestjs/common';
import { RecadosService } from './recados.service';
import { RecadosController } from './recados.controller';

@Module({
  controllers: [RecadosController],
  providers: [RecadosService],
  exports: [RecadosService],
})
export class RecadosModule {}
