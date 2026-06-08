import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmpresasTransporteController } from './empresas-transporte.controller';
import { EmpresasTransporteService } from './empresas-transporte.service';

@Module({
  imports: [PrismaModule],
  controllers: [EmpresasTransporteController],
  providers: [EmpresasTransporteService],
})
export class EmpresasTransporteModule {}
