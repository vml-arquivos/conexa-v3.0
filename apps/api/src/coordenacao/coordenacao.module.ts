import { Module } from '@nestjs/common';
import { CoordenacaoController } from './coordenacao.controller';
import { CoordenacaoService } from './coordenacao.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CoordenacaoController],
  providers: [CoordenacaoService],
  exports: [CoordenacaoService],
})
export class CoordenacaoModule {}
