import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanningConferenciaStatus, RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreatePlanningConferenciaDto } from './dto/create-planning-conferencia.dto';
import { QueryPlanningConferenciaDto } from './dto/query-planning-conferencia.dto';

@Injectable()
export class PlanningConferenciaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert: cria ou actualiza a conferência do dia para um planejamento.
   * Apenas o PROFESSOR responsável pelo planejamento pode conferir.
   * UNIDADE/STAFF_CENTRAL/MANTENEDORA só lêem.
   */
  async upsert(dto: CreatePlanningConferenciaDto, user: JwtPayload) {
    if (!user?.mantenedoraId) {
      throw new ForbiddenException('Escopo inválido');
    }

    // 1. Verificar que o planning existe e pertence ao escopo do utilizador
    const planning = await this.prisma.planning.findFirst({
      where: { id: dto.planningId, mantenedoraId: user.mantenedoraId },
      select: {
        id: true,
        unitId: true,
        classroomId: true,
        status: true,
        professorId: true,
      },
    });

    if (!planning) {
      throw new NotFoundException('Planejamento não encontrado ou fora do escopo');
    }

    // 2. Apenas PROFESSOR pode conferir — e só o professor dono do planejamento
    const level = user.roles?.[0]?.level;
    if (level === RoleLevel.PROFESSOR) {
      // Verificar vínculo classroomTeacher
      const ct = await this.prisma.classroomTeacher.findFirst({
        where: {
          teacherId: user.sub,
          classroomId: planning.classroomId,
          isActive: true,
        },
      });
      if (!ct) {
        throw new ForbiddenException('Você não está vinculado a esta turma');
      }
    } else if (
      level !== RoleLevel.DEVELOPER &&
      level !== RoleLevel.UNIDADE &&
      level !== RoleLevel.STAFF_CENTRAL &&
      level !== RoleLevel.MANTENEDORA
    ) {
      throw new ForbiddenException('Sem permissão para conferir planejamentos');
    }

    // Coord/Central não pode criar, só ler
    if (
      level === RoleLevel.UNIDADE ||
      level === RoleLevel.STAFF_CENTRAL ||
      level === RoleLevel.MANTENEDORA
    ) {
      throw new ForbiddenException(
        'Coordenação pode apenas visualizar conferências — o professor é responsável pelo preenchimento',
      );
    }

    // 3. Planejamento deve estar em estado que permite execução
    const statusValidos = ['APROVADO', 'EM_EXECUCAO', 'CONCLUIDO'];
    if (!statusValidos.includes(planning.status)) {
      throw new BadRequestException(
        `Planejamento com status "${planning.status}" não pode ser conferido. ` +
          `Apenas planejamentos APROVADOS ou EM_EXECUCAO podem ser conferidos.`,
      );
    }

    // 4. Normalizar data para meio-dia UTC (evita problemas de timezone)
    const dateParts = dto.dataConferencia.split('T')[0].split('-').map(Number);
    const dataConferencia = new Date(
      Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], 12, 0, 0, 0),
    );

    // 5. Upsert — 1 conferência por planning por dia
    return this.prisma.planningConferencia.upsert({
      where: {
        planningId_dataConferencia: {
          planningId: dto.planningId,
          dataConferencia,
        },
      },
      update: {
        status: dto.status as PlanningConferenciaStatus,
        observacao: dto.observacao ?? null,
        justificativa: dto.justificativa ?? null,
      },
      create: {
        planningId: dto.planningId,
        mantenedoraId: user.mantenedoraId,
        unitId: planning.unitId,
        classroomId: planning.classroomId,
        professorId: user.sub,
        dataConferencia,
        status: dto.status as PlanningConferenciaStatus,
        observacao: dto.observacao ?? null,
        justificativa: dto.justificativa ?? null,
      },
    });
  }

  /**
   * Listar conferências por planningId ou classroomId + período.
   * RBAC automático por mantenedoraId.
   */
  async listar(query: QueryPlanningConferenciaDto, user: JwtPayload) {
    if (!user?.mantenedoraId) {
      throw new ForbiddenException('Escopo inválido');
    }

    const where: any = { mantenedoraId: user.mantenedoraId };

    if (query.planningId) where.planningId = query.planningId;
    if (query.classroomId) where.classroomId = query.classroomId;

    if (query.dataInicio || query.dataFim) {
      where.dataConferencia = {};
      if (query.dataInicio) {
        where.dataConferencia.gte = new Date(query.dataInicio + 'T00:00:00.000Z');
      }
      if (query.dataFim) {
        where.dataConferencia.lte = new Date(query.dataFim + 'T23:59:59.999Z');
      }
    }

    // UNIDADE: filtrar por unitId
    const level = user.roles?.[0]?.level;
    if (level === RoleLevel.UNIDADE) {
      where.unitId = user.unitId;
    }

    // PROFESSOR: filtrar por classroomTeacher (vê apenas suas turmas)
    if (level === RoleLevel.PROFESSOR) {
      const vinculadas = await this.prisma.classroomTeacher.findMany({
        where: { teacherId: user.sub, isActive: true },
        select: { classroomId: true },
      });
      const classroomIds = vinculadas.map((v) => v.classroomId);
      where.classroomId = { in: classroomIds };
    }

    return this.prisma.planningConferencia.findMany({
      where,
      orderBy: { dataConferencia: 'desc' },
      include: {
        planning: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Resumo agregado por planning: % FEITO / PARCIAL / NAO_REALIZADO.
   * Usado pelo Painel da Turma e coordenação.
   */
  async resumoPorPlanning(planningId: string, user: JwtPayload) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');

    const conferencias = await this.prisma.planningConferencia.findMany({
      where: { planningId, mantenedoraId: user.mantenedoraId },
      select: { status: true, dataConferencia: true },
    });

    const total = conferencias.length;
    const feito = conferencias.filter((c) => c.status === 'FEITO').length;
    const parcial = conferencias.filter((c) => c.status === 'PARCIAL').length;
    const naoRealizado = conferencias.filter((c) => c.status === 'NAO_REALIZADO').length;

    return {
      planningId,
      total,
      feito,
      parcial,
      naoRealizado,
      pctFeito: total > 0 ? Math.round((feito / total) * 100) : 0,
      pctParcial: total > 0 ? Math.round((parcial / total) * 100) : 0,
      pctNaoRealizado: total > 0 ? Math.round((naoRealizado / total) * 100) : 0,
      conferencias,
    };
  }
}
