import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { IaOrchestratorService, IaRequestType } from './ia-orchestrator.service';
import {
  SolicitarIaDtoClass,
  FeedbackDtoClass,
  RevisarRespostaDtoClass,
} from '../dto/ia-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Controller('ia')
@UseGuards(JwtAuthGuard)
export class IaOrchestratorController {
  constructor(private readonly orchestrator: IaOrchestratorService) {}

  /**
   * POST /ia/request
   * Cria e executa uma requisição genérica de IA.
   */
  @Post('request')
  @HttpCode(HttpStatus.OK)
  solicitar(
    @Body() dto: SolicitarIaDtoClass,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orchestrator.solicitar({
      requesterId: user.sub,
      mantenedoraId: user.mantenedoraId,
      unitId: user.unitId ?? '',
      type: dto.type as IaRequestType,
      payload: dto.payload,
      prompt: dto.prompt,
      systemInstruction: dto.systemInstruction,
      promptId: dto.promptId,
    });
  }

  /**
   * GET /ia/request/:id
   * Busca uma requisição por ID com resposta e logs.
   */
  @Get('request/:id')
  findOne(@Param('id') id: string) {
    return this.orchestrator.findOne(id);
  }

  /**
   * GET /ia/requests
   * Lista requisições com filtros (paginado).
   */
  @Get('requests')
  findAll(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('unitId') unitId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.orchestrator.findAll({
      mantenedoraId: user?.mantenedoraId,
      unitId,
      type: type as IaRequestType | undefined,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * POST /ia/feedback
   * Registra feedback do usuário sobre uma resposta de IA.
   */
  @Post('feedback')
  @HttpCode(HttpStatus.CREATED)
  registrarFeedback(
    @Body() dto: FeedbackDtoClass,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orchestrator.registrarFeedback({
      responseId: dto.responseId,
      userId: user.sub,
      rating: dto.rating,
      comment: dto.comment,
    });
  }

  /**
   * PATCH /ia/response/:id/revisar
   * Aprova ou rejeita uma resposta de IA (revisão humana).
   */
  @Patch('response/:id/revisar')
  revisarResposta(
    @Param('id') id: string,
    @Body() dto: RevisarRespostaDtoClass,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orchestrator.revisarResposta({
      responseId: id,
      reviewedBy: user.sub,
      approved: dto.approved,
    });
  }
}
