import { Module } from '@nestjs/common';
import { AcompanhamentoNutricionalController } from './acompanhamento-nutricional.controller';
import { AcompanhamentoNutricionalService } from './acompanhamento-nutricional.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AcompanhamentoNutricionalController],
  providers: [AcompanhamentoNutricionalService],
  exports: [AcompanhamentoNutricionalService],
})
export class AcompanhamentoNutricionalModule {}
