import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DiaryEventService } from './diary-event.service';
import { GeminiService } from '../ai/services/gemini.service';
import { CreateDiaryEventDto } from './dto/create-diary-event.dto';
import { UpdateDiaryEventDto } from './dto/update-diary-event.dto';
import { QueryDiaryEventDto } from './dto/query-diary-event.dto';
import { GenerateAvaliacaoDto } from './dto/generate-avaliacao.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ScopeGuard } from '../common/guards/scope.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';

@Controller('diary-events')
@UseGuards(JwtAuthGuard, RolesGuard, ScopeGuard)
export class DiaryEventController {
  constructor(
    private readonly diaryEventService: DiaryEventService,
    private readonly geminiService: GeminiService,
  ) {}

  /**
   * POST /diary-events/generate-avaliacao
   *
   * Gera uma sugestão de "Avaliação do Plano de Aula" via Gemini,
   * com base nos dados de execução preenchidos/clicados pelo professor.
   *
   * - O texto gerado é uma sugestão editável pelo professor.
   * - O campo é salvo em aiContext.avaliacaoPlanoAula e alimenta RIA/RDIC.
   * - Não cria nem altera registros no banco — apenas gera texto.
   * - Sem migration, sem schema change.
   */
  @Post('generate-avaliacao')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.DEVELOPER,
  )
  async generateAvaliacao(
    @Body() dto: GenerateAvaliacaoDto,
    @CurrentUser() _user: JwtPayload,
  ) {
    if (!this.geminiService.isEnabled()) {
      throw new ServiceUnavailableException(
        'Serviço de IA não configurado. Configure GEMINI_API_KEY no ambiente.',
      );
    }

    // ── Mapeamentos de rótulos legíveis ──────────────────────────────────────
    const FATORES_LABEL: Record<string, string> = {
      ENGAJAMENTO_DA_TURMA: 'Engajamento da turma',
      TEMPO_DA_ROTINA: 'Tempo da rotina',
      MATERIAIS_DISPONIVEIS: 'Materiais disponíveis',
      INTERVENCAO_DOCENTE: 'Intervenção docente',
      ADAPTACOES_NECESSARIAS: 'Adaptações necessárias',
      OCORRENCIAS_DO_DIA: 'Ocorrências do dia',
    };
    const STATUS_LABEL: Record<string, string> = {
      FEITO: 'Cumprido integralmente',
      PARCIAL: 'Cumprido parcialmente',
      NAO_REALIZADO: 'Não realizado',
      ATINGIDO: 'Atingido',
      EM_PROCESSO: 'Em processo',
      PRECISA_RETOMAR: 'Precisa retomar',
    };

    // ── Montar contexto legível a partir dos cliques/textos do professor ─────
    const fatoresTexto = (dto.fatoresInfluenciaram ?? [])
      .map((f) => FATORES_LABEL[f] ?? f)
      .join(', ');

    const objetivosTexto = (dto.avaliacoesObjetivos ?? [])
      .filter((o) => o.status)
      .map(
        (o) =>
          `  - Objetivo ${o.objectiveIndex + 1}: ${STATUS_LABEL[o.status] ?? o.status}` +
          (o.observacao ? ` — ${o.observacao}` : ''),
      )
      .join('\n');

    // ── Prompt estruturado ───────────────────────────────────────────────────
    const linhasPrompt = [
      'Você é um assistente pedagógico especialista em Educação Infantil (BNCC).',
      'Gere uma AVALIAÇÃO DO PLANO DE AULA em português brasileiro, em 3 a 5 parágrafos curtos,',
      'com linguagem pedagógica profissional, clara e objetiva.',
      'A avaliação deve sintetizar: a execução do plano, a leitura da turma, os fatores que influenciaram e os encaminhamentos pedagógicos.',
      'NÃO use marcadores, listas ou títulos. Apenas parágrafos corridos.',
      '',
      '=== DADOS DA EXECUÇÃO ===',
      dto.planejamentoTitulo ? `Plano do dia: ${dto.planejamentoTitulo}` : '',
      dto.camposExperiencia?.length
        ? `Campos de experiência: ${dto.camposExperiencia.join(', ')}`
        : '',
      dto.statusExecucaoPlano
        ? `Status de execução: ${STATUS_LABEL[dto.statusExecucaoPlano] ?? dto.statusExecucaoPlano}`
        : '',
      dto.execucaoPlanejamento
        ? `Detalhamento da execução: ${dto.execucaoPlanejamento}`
        : '',
      dto.reacaoCriancas ? `Leitura da turma: ${dto.reacaoCriancas}` : '',
      fatoresTexto ? `Fatores que influenciaram: ${fatoresTexto}` : '',
      objetivosTexto ? `Avaliação por objetivo:\n${objetivosTexto}` : '',
      dto.adaptacoesRealizadas
        ? `Adaptações realizadas: ${dto.adaptacoesRealizadas}`
        : '',
      dto.materiaisUtilizados
        ? `Materiais utilizados: ${dto.materiaisUtilizados}`
        : '',
      dto.ocorrencias ? `Ocorrências relevantes: ${dto.ocorrencias}` : '',
      dto.reflexaoPedagogica
        ? `O que precisa ser retomado: ${dto.reflexaoPedagogica}`
        : '',
      dto.textoComplementarProfessor
        ? `Observações complementares: ${dto.textoComplementarProfessor}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const avaliacao = await this.geminiService.generateText(
      linhasPrompt,
      'Você é um assistente pedagógico especialista em Educação Infantil. Responda sempre em português brasileiro com linguagem profissional e pedagógica.',
    );

    return { avaliacao: avaliacao.trim() };
  }

  /**
   * POST /diary-events
   * Cria um novo evento no diário de bordo
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createDiaryEventDto: CreateDiaryEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.diaryEventService.create(createDiaryEventDto, user);
  }

  /**
   * GET /diary-events
   * Lista eventos com filtros opcionais
   */
  @Get()
  findAll(@Query() query: QueryDiaryEventDto, @CurrentUser() user: JwtPayload) {
    return this.diaryEventService.findAll(query, user);
  }

  /**
   * GET /diary-events/:id
   * Busca um evento específico por ID
   */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.diaryEventService.findOne(id, user);
  }

  /**
   * PATCH /diary-events/:id
   * Atualiza um evento existente
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDiaryEventDto: UpdateDiaryEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.diaryEventService.update(id, updateDiaryEventDto, user);
  }

  /**
   * DELETE /diary-events/:id
   * Remove um evento (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.diaryEventService.remove(id, user);
  }

  /**
   * POST /diary-events/:id/media
   * Upload de foto via multipart/form-data — resolve erro 413 (base64 no JSON).
   * Campo: file (image/*)
   * Limite: 5 MB
   */
  @Post(':id/media')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  uploadMedia(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.diaryEventService.uploadMedia(id, file, user);
  }
}
