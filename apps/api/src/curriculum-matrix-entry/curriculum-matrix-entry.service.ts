import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatrixCacheInvalidationService } from '../cache/matrix-cache-invalidation.service';
import { AuditService } from '../common/services/audit.service';
import { CreateCurriculumMatrixEntryDto } from './dto/create-curriculum-matrix-entry.dto';
import { UpdateCurriculumMatrixEntryDto } from './dto/update-curriculum-matrix-entry.dto';
import { QueryCurriculumMatrixEntryDto } from './dto/query-curriculum-matrix-entry.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { maskMatrizEntriesForProfessor, maskMatrizEntryForProfessor } from '../common/helpers/masking.helper';
import { RoleLevel } from '@prisma/client';

@Injectable()
export class CurriculumMatrixEntryService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  
    private readonly matrixCacheInvalidation: MatrixCacheInvalidationService,
  
) {}


  /**
   * Criar uma nova entrada na Matriz Curricular
   * Apenas Mantenedora e Staff Central podem criar
   */
  async create(createDto: CreateCurriculumMatrixEntryDto, user: JwtPayload) {
    // Validar permissão
    if (
      user.roles[0]?.level !== 'DEVELOPER' &&
      user.roles[0]?.level !== 'MANTENEDORA' &&
      user.roles[0]?.level !== 'STAFF_CENTRAL'
    ) {
      throw new ForbiddenException(
        'Apenas Mantenedora e Staff Central podem criar entradas na matriz',
      );
    }

    // Verificar se a matriz existe e pertence à mantenedora
    const matrix = await this.prisma.curriculumMatrix.findUnique({
      where: { id: createDto.matrixId },
    });

    if (!matrix) {
      throw new NotFoundException('Matriz curricular não encontrada');
    }

    if (matrix.mantenedoraId !== user.mantenedoraId && user.roles[0]?.level !== 'DEVELOPER') {
      throw new ForbiddenException('Acesso negado a esta matriz');
    }

    // Verificar se já existe uma entrada para a mesma data e campo de experiência
    const existing = await this.prisma.curriculumMatrixEntry.findFirst({
      where: {
        matrixId: createDto.matrixId,
        date: new Date(createDto.date),
        campoDeExperiencia: createDto.campoDeExperiencia,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Já existe uma entrada para ${createDto.campoDeExperiencia} na data ${createDto.date}`,
      );
    }

    // Criar entrada
    const entry = await this.prisma.curriculumMatrixEntry.create({
      data: {
        ...createDto,
        date: new Date(createDto.date),
      },
      include: {
        matrix: true,
      },
    });

    // Auditoria
    await this.auditService.log({
      action: 'CREATE',
      entity: 'CURRICULUM_MATRIX_ENTRY',
      entityId: entry.id,
      userId: user.sub,
      mantenedoraId: user.mantenedoraId,
      changes: {
        matrixId: entry.matrixId,
        date: entry.date,
        campoDeExperiencia: entry.campoDeExperiencia,
      },
    });

    await this.matrixCacheInvalidation.bump(user.mantenedoraId);

    return entry;
  }

  /**
   * Listar entradas com filtros
   */
  async findAll(query: QueryCurriculumMatrixEntryDto, user: JwtPayload) {
    // Validar acesso
    await this.validateAccess(user);

    const where: any = {};

    if (query.matrixId) {
      // Verificar se a matriz pertence à mantenedora
      const matrix = await this.prisma.curriculumMatrix.findUnique({
        where: { id: query.matrixId },
      });

      if (!matrix) {
        throw new NotFoundException('Matriz curricular não encontrada');
      }

      if (matrix.mantenedoraId !== user.mantenedoraId && user.roles[0]?.level !== 'DEVELOPER') {
        throw new ForbiddenException('Acesso negado a esta matriz');
      }

      where.matrixId = query.matrixId;
    } else {
      // Filtrar por mantenedora se não especificar matriz
      where.matrix = {
        mantenedoraId: user.mantenedoraId,
      };
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    if (query.weekOfYear) {
      where.weekOfYear = query.weekOfYear;
    }

    if (query.dayOfWeek) {
      where.dayOfWeek = query.dayOfWeek;
    }

    if (query.campoDeExperiencia) {
      where.campoDeExperiencia = query.campoDeExperiencia;
    }

    const entries = await this.prisma.curriculumMatrixEntry.findMany({
      where,
      include: {
        matrix: {
          select: {
            id: true,
            name: true,
            year: true,
            segment: true,
          },
        },
        _count: {
          select: { diaryEvents: true },
        },
      },
      orderBy: [{ date: 'asc' }, { campoDeExperiencia: 'asc' }],
    });

    return maskMatrizEntriesForProfessor(user, entries);
  }

  /**
   * Buscar entrada por ID
   */
  async findOne(id: string, user: JwtPayload) {
    await this.validateAccess(user);

    const entry = await this.prisma.curriculumMatrixEntry.findFirst({
      where: {
        id,
        matrix: {
          mantenedoraId: user.roles[0]?.level === 'DEVELOPER' ? undefined : user.mantenedoraId,
        },
      },
      include: {
        matrix: true,
        diaryEvents: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            child: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Entrada da matriz não encontrada');
    }

    return maskMatrizEntryForProfessor(user, entry);
  }

  /**
   * Atualizar entrada (apenas campos editáveis)
   */
  async update(id: string, updateDto: UpdateCurriculumMatrixEntryDto, user: JwtPayload) {
    // Validar permissão
    if (
      user.roles[0]?.level !== 'DEVELOPER' &&
      user.roles[0]?.level !== 'MANTENEDORA' &&
      user.roles[0]?.level !== 'STAFF_CENTRAL'
    ) {
      throw new ForbiddenException(
        'Apenas Mantenedora e Staff Central podem atualizar entradas',
      );
    }

    const entry = await this.findOne(id, user);

    // Verificar se há eventos vinculados
    const eventsCount = await this.prisma.diaryEvent.count({
      where: { curriculumEntryId: id },
    });

    if (eventsCount > 0) {
      // Permitir apenas atualização de campos não-normativos
      if (Object.keys(updateDto).some(key => !['intencionalidade', 'exemploAtividade', 'weekOfYear', 'dayOfWeek', 'bimester', 'objetivoBNCCCode'].includes(key))) {
        throw new BadRequestException(
          `Esta entrada possui ${eventsCount} evento(s) vinculado(s). Apenas campos de sugestão podem ser editados.`,
        );
      }
    }

    const updated = await this.prisma.curriculumMatrixEntry.update({
      where: { id },
      data: updateDto,
      include: {
        matrix: true,
      },
    });

    // Auditoria
    await this.auditService.log({
      action: 'UPDATE',
      entity: 'CURRICULUM_MATRIX_ENTRY',
      entityId: id,
      userId: user.sub,
      mantenedoraId: user.mantenedoraId,
      changes: { before: entry, after: updated },
    });

    await this.matrixCacheInvalidation.bump(user.mantenedoraId);

    return updated;
  }

  /**
   * Deletar entrada
   */
  async remove(id: string, user: JwtPayload) {
    // Validar permissão
    if (user.roles[0]?.level !== 'DEVELOPER' && user.roles[0]?.level !== 'MANTENEDORA') {
      throw new ForbiddenException('Apenas Mantenedora pode deletar entradas');
    }

    const entry = await this.findOne(id, user);

    // Verificar se há eventos vinculados
    const eventsCount = await this.prisma.diaryEvent.count({
      where: { curriculumEntryId: id },
    });

    if (eventsCount > 0) {
      throw new BadRequestException(
        `Não é possível deletar uma entrada com ${eventsCount} evento(s) vinculado(s)`,
      );
    }

    await this.prisma.curriculumMatrixEntry.delete({
      where: { id },
    });

    // Auditoria
    await this.auditService.log({
      action: 'DELETE',
      entity: 'CURRICULUM_MATRIX_ENTRY',
      entityId: id,
      userId: user.sub,
      mantenedoraId: user.mantenedoraId,
      changes: { entry },
    });

    await this.matrixCacheInvalidation.bump(user.mantenedoraId);

    return { message: 'Entrada da matriz deletada com sucesso' };
  }

  /**
   * Validar acesso do usuário
   */
  private async validateAccess(user: JwtPayload) {
    if (user.roles[0]?.level === 'DEVELOPER') {
      return; // Developer tem acesso total
    }

    // Todos os outros níveis podem visualizar, mas apenas criar/editar é restrito
    return;
  }

  /**
   * Busca as entradas da Matriz para uma turma + data específica.
   * Detecta o segmento via ageGroupMin do Classroom (sem fallback).
   * Retorna os 4 campos obrigatórios + exemploAtividade condicionalmente por role:
   * - PROFESSOR: sem exemploAtividade
   * - UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER: com exemploAtividade
   * Contrato de retorno padronizado conforme spec.
   */
  async byClassroomDay(
    classroomId: string,
    date: string,
    user: JwtPayload,
  ): Promise<{
    segment: string | null;
    date: string;
    classroomId: string;
    objectives: Array<{
      campoExperiencia: string;
      codigoBNCC: string | null;
      objetivoBNCC: string;
      objetivoCurriculoDF: string;
      intencionalidadePedagogica: string | null;
      exemploAtividade?: string | null;
    }>;
    message?: string;
  }> {
    // 1. Buscar a turma e validar acesso multi-tenant
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        ageGroupMin: true,
        ageGroupMax: true,
        unit: {
          select: {
            id: true,
            mantenedoraId: true,
          },
        },
      },
    });

    if (!classroom) {
      return { segment: null, date, classroomId, objectives: [], message: 'Turma não encontrada' };
    }

    // Validar escopo: o usuário deve pertencer à mesma mantenedora
    const level = user.roles[0]?.level;
    if (level !== 'DEVELOPER' && classroom.unit.mantenedoraId !== user.mantenedoraId) {
      return { segment: null, date, classroomId, objectives: [], message: 'Acesso negado a esta turma' };
    }

    // 2. Detectar segmento via ageGroupMin (meses) — sem fallback
    // EI01: 0–18 meses | EI02: 19–47 meses | EI03: 48–71 meses
    const min = classroom.ageGroupMin ?? 0;
    let segment: string | null = null;
    if (min <= 18) segment = 'EI01';
    else if (min <= 47) segment = 'EI02';
    else if (min <= 71) segment = 'EI03';

    if (!segment) {
      return {
        segment: null,
        date,
        classroomId,
        objectives: [],
        message: `Não foi possível detectar o segmento da turma (ageGroupMin=${min}). Verifique a configuração da turma.`,
      };
    }

    // 3. Normalizar a data sem toISOString() para evitar drift UTC
    // Parseia YYYY-MM-DD e cria intervalo do dia inteiro em horário local
    const parts = date.split('-').map(Number);
    const year = parts[0];
    const month = parts[1] - 1; // 0-indexed
    const day = parts[2];
    const targetDateStart = new Date(year, month, day, 0, 0, 0, 0);
    const targetDateEnd = new Date(year, month, day, 23, 59, 59, 999);

    // 4. Buscar a matriz ativa do segmento no escopo da mantenedora
    const matrix = await this.prisma.curriculumMatrix.findFirst({
      where: {
        mantenedoraId: classroom.unit.mantenedoraId,
        segment,
        isActive: true,
      },
      orderBy: { version: 'desc' },
      select: { id: true, name: true, segment: true },
    });

    if (!matrix) {
      return {
        segment,
        date,
        classroomId,
        objectives: [],
        message: `Nenhuma matriz ativa encontrada para o segmento ${segment} desta mantenedora.`,
      };
    }

    // Determinar se o usuário pode ver exemploAtividade
    // PROFESSOR não recebe; UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER recebem
    const isProfessorOnly = user.roles.every(
      (r) => r.level === RoleLevel.PROFESSOR,
    );

    // 5. Buscar as entries do dia
    const entries = await this.prisma.curriculumMatrixEntry.findMany({
      where: {
        matrixId: matrix.id,
        date: {
          gte: targetDateStart,
          lte: targetDateEnd,
        },
      },
      select: {
        campoDeExperiencia: true,
        objetivoBNCCCode: true,
        objetivoBNCC: true,
        objetivoCurriculo: true,
        intencionalidade: true,
        // exemploAtividade: retornado condicionalmente por role
        exemploAtividade: !isProfessorOnly,
      },
      orderBy: { campoDeExperiencia: 'asc' },
    });

    // 6. Mapear para o contrato padronizado
    const objectives = entries.map((e) => {
      const obj: {
        campoExperiencia: string;
        codigoBNCC: string | null;
        objetivoBNCC: string;
        objetivoCurriculoDF: string;
        intencionalidadePedagogica: string | null;
        exemploAtividade?: string | null;
      } = {
        campoExperiencia: e.campoDeExperiencia as string,
        codigoBNCC: e.objetivoBNCCCode ?? null,
        objetivoBNCC: e.objetivoBNCC,
        objetivoCurriculoDF: e.objetivoCurriculo,
        intencionalidadePedagogica: e.intencionalidade ?? null,
      };
      if (!isProfessorOnly && 'exemploAtividade' in e) {
        obj.exemploAtividade = (e as any).exemploAtividade ?? null;
      }
      return obj;
    });

    return { segment, date, classroomId, objectives };
  }

  /**
   * Retorna a Matriz completa com exemploAtividade para coordenação.
   * Agrupa por data e retorna todos os campos incluindo exemploAtividade.
   */
  async getMatrizFullForCoord(
    segment: string,
    startDateStr: string,
    endDateStr: string,
    unitId: string,
    user: JwtPayload,
  ) {
    const mantenedoraId = user.mantenedoraId;
    if (!mantenedoraId) throw new ForbiddenException('Escopo de mantenedora ausente');

    const start = new Date(startDateStr + 'T00:00:00-03:00');
    const end = new Date(endDateStr + 'T23:59:59-03:00');

    // Buscar matriz ativa para o segmento (ou todas se segment não informado)
    const matrix = await this.prisma.curriculumMatrix.findFirst({
      where: {
        mantenedoraId,
        ...(segment ? { segment } : {}),
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!matrix) {
      return { segment: segment || 'todos', diasLetivos: [], aviso: 'Nenhuma matriz ativa encontrada para este segmento' };
    }

    const entries = await this.prisma.curriculumMatrixEntry.findMany({
      where: {
        matrixId: matrix.id,
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });

    // Agrupar por data
    const byDate: Record<string, any[]> = {};
    for (const e of entries) {
      const key = e.date.toISOString().split('T')[0];
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push({
        id: e.id,
        campoExperiencia: (e as any).campoDeExperiencia ?? '',
        objetivoBNCCCodigo: (e as any).objetivoBNCCCode ?? '',
        objetivoBNCC: (e as any).objetivoBNCC ?? '',
        objetivoCurriculo: (e as any).objetivoCurriculo ?? '',
        intencionalidade: (e as any).intencionalidade ?? '',
        semana: (e as any).weekTheme ?? (e as any).semana ?? '',
        // Coordenação sempre vê o exemploAtividade:
        exemploAtividade: (e as any).exemploAtividade ?? '',
      });
    }

    return {
      segment: segment || matrix.segment,
      matrixId: matrix.id,
      startDate: startDateStr,
      endDate: endDateStr,
      totalEntradas: entries.length,
      diasLetivos: Object.entries(byDate).map(([date, objectives]) => ({
        date,
        diaSemana: new Date(date + 'T12:00:00-03:00').toLocaleDateString('pt-BR', {
          weekday: 'long', timeZone: 'America/Sao_Paulo',
        }),
        objectives,
      })),
    };
  }

  /**
   * Busca objetivos da Matriz para uma turma a partir de uma data, por N dias.
   * Retorna array de dias com objetivos, respeitando controle de exemploAtividade por role.
   */
  async byClassroomDateRange(
    classroomId: string,
    startDateStr: string,
    days: number,
    user: JwtPayload,
  ) {
    // Gerar array de datas
    const dates: string[] = [];
    const base = new Date(startDateStr + 'T12:00:00-03:00');
    for (let i = 0; i < days; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    // Buscar objetivos para cada dia em paralelo
    const results = await Promise.all(
      dates.map(async (date) => {
        const dayResult = await this.byClassroomDay(classroomId, date, user);
        return {
          date,
          diaSemana: new Date(date + 'T12:00:00-03:00').toLocaleDateString('pt-BR', {
            weekday: 'long', timeZone: 'America/Sao_Paulo',
          }),
          segment: dayResult.segment,
          objectives: dayResult.objectives,
          message: dayResult.message,
        };
      }),
    );

    return {
      classroomId,
      startDate: startDateStr,
      days,
      diasLetivos: results,
    };
  }
}
