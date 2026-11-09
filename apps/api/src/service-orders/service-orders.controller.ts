import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleLevel } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ServiceOrdersService } from './service-orders.service';
import {
  AcceptServiceOrderDto,
  CancelServiceOrderDto,
  CommentServiceOrderDto,
  CompleteServiceOrderDto,
  CreateServiceOrderDto,
  EvaluateServiceOrderDto,
  ListServiceOrdersQueryDto,
  UpdateServiceOrderDto,
} from './dto/service-order.dto';

const ALL = [
  RoleLevel.PROFESSOR,
  RoleLevel.UNIDADE,
  RoleLevel.MANTENEDORA,
  RoleLevel.MANUTENCAO,
  RoleLevel.DEVELOPER,
] as const;
const REQUESTERS = [
  RoleLevel.PROFESSOR,
  RoleLevel.UNIDADE,
  RoleLevel.MANTENEDORA,
  RoleLevel.DEVELOPER,
] as const;
const MAINTENANCE = [RoleLevel.MANUTENCAO, RoleLevel.DEVELOPER] as const;
const MANAGERS = [RoleLevel.MANUTENCAO, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER] as const;

/**
 * Ordens de Serviço (Manutenção).
 * Módulo novo e isolado: não altera nenhuma rota/tabela existente.
 */
@Controller('service-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceOrdersController {
  constructor(private readonly svc: ServiceOrdersService) {}

  @Get('summary')
  @RequireRoles(...ALL)
  summary(@CurrentUser() user: JwtPayload) {
    return this.svc.summary(user);
  }

  @Get('team')
  @RequireRoles(...MANAGERS)
  team(@CurrentUser() user: JwtPayload) {
    return this.svc.team(user);
  }

  @Get()
  @RequireRoles(...ALL)
  list(@CurrentUser() user: JwtPayload, @Query() query: ListServiceOrdersQueryDto) {
    return this.svc.list(user, query);
  }

  @Post()
  @RequireRoles(...REQUESTERS)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateServiceOrderDto) {
    return this.svc.create(user, dto);
  }

  @Get(':id')
  @RequireRoles(...ALL)
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.svc.get(user, id);
  }

  @Post(':id/accept')
  @RequireRoles(...MAINTENANCE)
  accept(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: AcceptServiceOrderDto) {
    return this.svc.accept(user, id, dto);
  }

  @Patch(':id')
  @RequireRoles(...MANAGERS)
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateServiceOrderDto) {
    return this.svc.update(user, id, dto);
  }

  @Post(':id/start')
  @RequireRoles(...MAINTENANCE)
  start(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.svc.start(user, id);
  }

  @Post(':id/complete')
  @RequireRoles(...MAINTENANCE)
  complete(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CompleteServiceOrderDto) {
    return this.svc.complete(user, id, dto);
  }

  @Post(':id/evaluate')
  @RequireRoles(...REQUESTERS)
  evaluate(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: EvaluateServiceOrderDto) {
    return this.svc.evaluate(user, id, dto);
  }

  @Post(':id/cancel')
  @RequireRoles(...REQUESTERS)
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CancelServiceOrderDto) {
    return this.svc.cancel(user, id, dto);
  }

  @Post(':id/comments')
  @RequireRoles(...ALL)
  comment(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CommentServiceOrderDto) {
    return this.svc.comment(user, id, dto);
  }

  @Post(':id/attachments')
  @RequireRoles(...ALL)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  attach(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Envie um arquivo no campo "file"');
    return this.svc.addAttachment(user, id, file);
  }
}
