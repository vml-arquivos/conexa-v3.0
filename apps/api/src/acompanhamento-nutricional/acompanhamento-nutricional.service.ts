import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';

function hasLevel(user: JwtPayload, level: RoleLevel): boolean {
  return user.roles.some((r: { level: RoleLevel }) => r.level === level);
}

function isNutricionistaOuSuperior(user: JwtPayload): boolean {
  return user.roles.some((r) =>
    ['UNIDADE_NUTRICIONISTA', 'UNIDADE_DIRETOR', 'UNIDADE_COORDENADOR_PEDAGOGICO'].includes(r.type as string) ||
    ['MANTENEDORA', 'DEVELOPER', 'STAFF_CENTRAL'].includes(r.level),
  );
}

@Injectable()
export class AcompanhamentoNutricionalService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers de acesso ────────────────────────────────────────────────────────

  private assertUnitAccess(user: JwtPayload, unitId: string): void {
    const isGlobal = user.roles.some((r) =>
      ['DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL'].includes(r.level),
    );
    if (isGlobal) return;
    if (user.unitId && user.unitId !== unitId) {
      throw new ForbiddenException('Você não tem acesso a esta unidade');
    }
  }

  private assertMantenedoraAccess(user: JwtPayload, mantenedoraId: string): void {
    if (user.mantenedoraId !== mantenedoraId) {
      throw new ForbiddenException('Acesso negado: mantenedora diferente');
    }
  }

  // ─── Criar ou atualizar acompanhamento (upsert por childId) ──────────────────

  async upsert(dto: {
    childId: string;
    motivoAcompanhamento: string;
    statusCaso?: string;
    objetivos?: string;
    condutaAtual?: string;
    restricoesOperacionais?: string;
    substituicoesSeguras?: string;
    orientacoesProfCozinha?: string;
    frequenciaRevisao?: string;
    proximaReavaliacao?: string;
  }, user: JwtPayload) {
    if (!isNutricionistaOuSuperior(user)) {
      throw new ForbiddenException('Apenas a Nutricionista pode criar/editar acompanhamentos nutricionais');
    }

    // Buscar criança para validar acesso
    const child = await this.prisma.child.findUnique({
      where: { id: dto.childId },
      select: { id: true, mantenedoraId: true, unitId: true },
    });
    if (!child) throw new NotFoundException('Criança não encontrada');
    this.assertMantenedoraAccess(user, child.mantenedoraId);
    this.assertUnitAccess(user, child.unitId);

    const data: any = {
      mantenedoraId: child.mantenedoraId,
      unitId: child.unitId,
      childId: dto.childId,
      criadoPorId: user.sub,
      motivoAcompanhamento: dto.motivoAcompanhamento,
      statusCaso: (dto.statusCaso as any) ?? 'MONITORAMENTO',
      ativo: true,
      objetivos: dto.objetivos ?? null,
      condutaAtual: dto.condutaAtual ?? null,
      restricoesOperacionais: dto.restricoesOperacionais ?? null,
      substituicoesSeguras: dto.substituicoesSeguras ?? null,
      orientacoesProfCozinha: dto.orientacoesProfCozinha ?? null,
      frequenciaRevisao: dto.frequenciaRevisao ?? null,
      proximaReavaliacao: dto.proximaReavaliacao ? new Date(dto.proximaReavaliacao) : null,
    };

    const existing = await this.prisma.acompanhamentoNutricional.findUnique({
      where: { childId: dto.childId },
    });

    if (existing) {
      return this.prisma.acompanhamentoNutricional.update({
        where: { childId: dto.childId },
        data: { ...data, criadoPorId: existing.criadoPorId }, // preservar criador original
        include: {
          child: {
            select: {
              id: true, firstName: true, lastName: true, dateOfBirth: true, photoUrl: true,
              enrollments: {
                where: { status: 'ATIVA' },
                include: { classroom: { select: { id: true, name: true } } },
                take: 1,
              },
              dietaryRestrictions: { where: { isActive: true }, select: { id: true, type: true, name: true, severity: true } },
            },
          },
        },
      });
    }

    return this.prisma.acompanhamentoNutricional.create({
      data,
      include: {
        child: {
          select: {
            id: true, firstName: true, lastName: true, dateOfBirth: true, photoUrl: true,
            enrollments: {
              where: { status: 'ATIVA' },
              include: { classroom: { select: { id: true, name: true } } },
              take: 1,
            },
            dietaryRestrictions: { where: { isActive: true }, select: { id: true, type: true, name: true, severity: true } },
          },
        },
      },
    });
  }

  // ─── Buscar acompanhamento de uma criança ─────────────────────────────────────

  async findByChild(childId: string, user: JwtPayload) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { id: true, mantenedoraId: true, unitId: true },
    });
    if (!child) throw new NotFoundException('Criança não encontrada');
    this.assertMantenedoraAccess(user, child.mantenedoraId);

    // Professor: acesso apenas se a criança estiver na sua turma
    if (hasLevel(user, RoleLevel.PROFESSOR)) {
      const ct = await this.prisma.classroomTeacher.findFirst({
        where: { teacherId: user.sub, isActive: true },
        include: {
          classroom: {
            include: {
              enrollments: { where: { childId, status: 'ATIVA' } },
            },
          },
        },
      });
      const temAcesso = (ct?.classroom?.enrollments?.length ?? 0) > 0;
      if (!temAcesso) throw new ForbiddenException('Você não tem acesso a esta criança');

      // Professor vê apenas orientações operacionais — não o plano clínico completo
      const acomp = await this.prisma.acompanhamentoNutricional.findUnique({
        where: { childId },
        select: {
          id: true, statusCaso: true, ativo: true,
          orientacoesProfCozinha: true, restricoesOperacionais: true, substituicoesSeguras: true,
          proximaReavaliacao: true,
          child: {
            select: {
              id: true, firstName: true, lastName: true, dateOfBirth: true, photoUrl: true,
              dietaryRestrictions: { where: { isActive: true }, select: { id: true, type: true, name: true, severity: true, forbiddenFoods: true } },
            },
          },
        },
      });
      return acomp ?? null;
    }

    // Nutricionista e superiores: acesso completo
    this.assertUnitAccess(user, child.unitId);
    return this.prisma.acompanhamentoNutricional.findUnique({
      where: { childId },
      include: {
        child: {
          select: {
            id: true, firstName: true, lastName: true, dateOfBirth: true, photoUrl: true,
            allergies: true, medicalConditions: true, medicationNeeds: true,
            enrollments: {
              where: { status: 'ATIVA' },
              include: { classroom: { select: { id: true, name: true } } },
              take: 1,
            },
            dietaryRestrictions: { where: { isActive: true }, select: { id: true, type: true, name: true, severity: true, forbiddenFoods: true, allowedFoods: true, description: true } },
          },
        },
      },
    });
  }

  // ─── Listar todos os acompanhamentos ativos da unidade ────────────────────────

  async listByUnit(unitId: string, user: JwtPayload, statusCaso?: string) {
    this.assertMantenedoraAccess(user, user.mantenedoraId);

    if (!isNutricionistaOuSuperior(user)) {
      throw new ForbiddenException('Acesso restrito à Nutricionista e gestão');
    }
    this.assertUnitAccess(user, unitId);

    const where: any = {
      mantenedoraId: user.mantenedoraId,
      unitId,
      ativo: true,
    };
    if (statusCaso) where.statusCaso = statusCaso;

    return this.prisma.acompanhamentoNutricional.findMany({
      where,
      orderBy: [
        { statusCaso: 'desc' }, // CRITICO primeiro
        { proximaReavaliacao: 'asc' },
      ],
      include: {
        child: {
          select: {
            id: true, firstName: true, lastName: true, dateOfBirth: true, photoUrl: true,
            enrollments: {
              where: { status: 'ATIVA' },
              include: { classroom: { select: { id: true, name: true } } },
              take: 1,
            },
            dietaryRestrictions: { where: { isActive: true }, select: { id: true, type: true, name: true, severity: true } },
          },
        },
      },
    });
  }

  // ─── Encerrar acompanhamento ──────────────────────────────────────────────────

  async encerrar(childId: string, user: JwtPayload) {
    if (!isNutricionistaOuSuperior(user)) {
      throw new ForbiddenException('Apenas a Nutricionista pode encerrar acompanhamentos');
    }
    const existing = await this.prisma.acompanhamentoNutricional.findUnique({
      where: { childId },
      select: { id: true, mantenedoraId: true, unitId: true },
    });
    if (!existing) throw new NotFoundException('Acompanhamento não encontrado');
    this.assertMantenedoraAccess(user, existing.mantenedoraId);
    this.assertUnitAccess(user, existing.unitId);

    return this.prisma.acompanhamentoNutricional.update({
      where: { childId },
      data: { ativo: false },
    });
  }

  // ─── Resumo consolidado da unidade (para coordenação/direção) ────────────────

  async resumoUnidade(unitId: string, user: JwtPayload) {
    this.assertMantenedoraAccess(user, user.mantenedoraId);
    this.assertUnitAccess(user, unitId);

    const [total, porStatus, vencidos] = await Promise.all([
      this.prisma.acompanhamentoNutricional.count({
        where: { mantenedoraId: user.mantenedoraId, unitId, ativo: true },
      }),
      this.prisma.acompanhamentoNutricional.groupBy({
        by: ['statusCaso'],
        where: { mantenedoraId: user.mantenedoraId, unitId, ativo: true },
        _count: { statusCaso: true },
      }),
      this.prisma.acompanhamentoNutricional.count({
        where: {
          mantenedoraId: user.mantenedoraId,
          unitId,
          ativo: true,
          proximaReavaliacao: { lt: new Date() },
        },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of porStatus) {
      statusMap[s.statusCaso] = s._count.statusCaso;
    }

    return {
      total,
      criticos: statusMap['CRITICO'] ?? 0,
      atencaoAlta: statusMap['ATENCAO_ALTA'] ?? 0,
      atencaoModerada: statusMap['ATENCAO_MODERADA'] ?? 0,
      monitoramento: statusMap['MONITORAMENTO'] ?? 0,
      vencidosReavaliacao: vencidos,
    };
  }

  // ─── Visão operacional por turma para professor/cozinha ──────────────────────

  async visaoOperacionalTurma(classroomId: string, user: JwtPayload) {
    // Verificar acesso à turma
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, unit: { mantenedoraId: user.mantenedoraId } },
      select: { id: true, name: true, unitId: true },
    });
    if (!classroom) throw new NotFoundException('Turma não encontrada');

    // Professor: verificar vínculo
    if (hasLevel(user, RoleLevel.PROFESSOR)) {
      const ct = await this.prisma.classroomTeacher.findFirst({
        where: { teacherId: user.sub, classroomId, isActive: true },
      });
      if (!ct) throw new ForbiddenException('Você não está vinculado a esta turma');
    }

    // Buscar crianças da turma com acompanhamento ativo
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classroomId, status: 'ATIVA' },
      select: { childId: true },
    });
    const childIds = enrollments.map((e) => e.childId);

    const acompanhamentos = await this.prisma.acompanhamentoNutricional.findMany({
      where: { childId: { in: childIds }, ativo: true },
      select: {
        id: true, statusCaso: true,
        orientacoesProfCozinha: true, restricoesOperacionais: true, substituicoesSeguras: true,
        child: {
          select: {
            id: true, firstName: true, lastName: true, photoUrl: true,
            dietaryRestrictions: {
              where: { isActive: true },
              select: { id: true, type: true, name: true, severity: true, forbiddenFoods: true },
            },
          },
        },
      },
      orderBy: { statusCaso: 'desc' },
    });

    return {
      classroomId,
      classroomName: classroom.name,
      totalCriancasComAcompanhamento: acompanhamentos.length,
      acompanhamentos,
    };
  }
}
