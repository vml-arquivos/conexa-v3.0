import { Module } from '@nestjs/common';
import { AlimentosController } from './alimentos.controller';
import { AlimentosService } from './alimentos.service';

@Module({
  controllers: [AlimentosController],
  providers:   [AlimentosService],
  exports:     [AlimentosService],
})
export class AlimentosModule {}
