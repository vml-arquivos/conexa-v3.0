import { Module } from '@nestjs/common';
import { FornecedoresController } from './fornecedores.controller';
import { FornecedoresService } from './fornecedores.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FornecedoresController],
  providers: [FornecedoresService],
  exports: [FornecedoresService],
})
export class FornecedoresModule {}
