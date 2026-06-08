import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateEmpresaTransporteDto, UpdateEmpresaTransporteDto } from './empresas-transporte.dto';
import { EmpresasTransporteService } from './empresas-transporte.service';

@Controller('empresas-transporte')
@UseGuards(JwtAuthGuard)
export class EmpresasTransporteController {
  constructor(private readonly service: EmpresasTransporteService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('unitId') unitId?: string) {
    return this.service.findAll(user, unitId);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateEmpresaTransporteDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEmpresaTransporteDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
