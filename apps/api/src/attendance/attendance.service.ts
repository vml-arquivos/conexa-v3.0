import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { assertSchoolDay } from '../common/utils/date.utils';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra a chamada de uma turma para uma data específica
   */
  async register(dto: any, user: JwtPayload) {
    if (!user?.mantenedoraId || !user?.unitId) {
      throw new ForbiddenException('Escopo inválido');
    }
    const { classroomId, date, registros } = dto;
    if (!classroomId || !date || !Array.isArray(registros) || registros.length === 0) {
      throw new BadRequestException('classroomId, date e registros são obrigatórios');
    }
    // TIMEZONE FIX: Usar meio-dia UTC (T12:00:00Z) para garantir que a data seja
    // o mesmo dia em qualquer timezone (UTC-12 a UTC+12).
    // UTC midnight (T00:00:00Z) pode ser o dia anterior em fusos negativos (ex: GMT-3).
    const dataRegistro = /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(date + 'T12:00:00.000Z')
      : new Date(date);
    // Normalizar para meio-dia UTC para consistência
    dataRegistro.setUTCHours(12, 0, 0, 0);

    // VALIDAÇÃO DE DATA FUTURA: não permite registrar chamada para datas futuras
    const hoje = new Date();
    hoje.setUTCHours(12, 0, 0, 0);
    if (dataRegistro > hoje) {
      throw new BadRequestException('Não é possível registrar chamada para uma data futura.');
    }

    // BLOQUEIO DE DIA NÃO LETIVO: Buscar datas não letivas da unidade e validar
    const unit = await this.prisma.unit.findUnique({
      where: { id: user.unitId ?? '' },
      select: { nonSchoolDays: true },
    });
    assertSchoolDay(dataRegistro, unit?.nonSchoolDays ?? [], BadRequestException);

    const results = await Promise.all(
      registros.map(async (reg: any) => {
        return this.prisma.attendance.upsert({
          where: {
            classroomId_childId_date: {
              classroomId,
              childId: reg.childId,
              date: dataRegistro,
            },
          },
          update: {
            status: reg.status as AttendanceStatus,
            justification: reg.justification ?? null,
            recordedBy: user.sub,
          },
          create: {
            mantenedoraId: user.mantenedoraId,
            unitId: user.unitId ?? '',
            classroomId,
            childId: reg.childId,
            date: dataRegistro,
            status: reg.status as AttendanceStatus,
            justification: reg.justification ?? null,
            recordedBy: user.sub,
          },
        });
      }),
    );

    const presentes = results.filter((r) => r.status === 'PRESENTE').length;
    const ausentes = results.filter((r) => r.status === 'AUSENTE').length;
    const justificados = results.filter((r) => r.status === 'JUSTIFICADO').length;

    return {
      success: true,
      date: dataRegistro.toISOString(),
      classroomId,
      total: results.length,
      presentes,
      ausentes,
      justificados,
      taxaPresenca: results.length > 0 ? Math.round((presentes / results.length) * 100) : 0,
    };
  }

  /**
   * Busca chamada de hoje para uma turma
   * Crianças são obtidas via Enrollment -> Child (schema correto)
   */
  async getToday(classroomId: string, user: JwtPayload, dateParam?: string) {
    if (!classroomId) {
      // Buscar turma do professor automaticamente
      const classroomTeacher = await this.prisma.classroomTeacher.findFirst({
        where: { teacherId: user.sub },
        include: { classroom: true },
      });
      if (!classroomTeacher) throw new BadRequestException('Nenhuma turma encontrada');
      classroomId = classroomTeacher.classroomId;
    }

    // TIMEZONE FIX: Usar meio-dia UTC (T12:00:00Z) para consistência com o register.
    // O register também usa T12:00:00Z para evitar que UTC midnight seja o dia anterior em GMT-3.
    let today: Date;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      today = new Date(dateParam + 'T12:00:00.000Z');
    } else {
      today = new Date();
      today.setUTCHours(12, 0, 0, 0);
    }

    // Buscar turma com alunos via enrollments (relação correta no schema)
    const [classroom, attendances] = await Promise.all([
      this.prisma.classroom.findUnique({
        where: { id: classroomId },
        include: {
          enrollments: {
            where: { status: 'ATIVA' },
            include: {
              child: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { child: { firstName: 'asc' } },
          },
        },
      }),
      this.prisma.attendance.findMany({
        where: { classroomId, date: today },
      }),
    ]);

    if (!classroom) throw new BadRequestException('Turma não encontrada');

    const attendanceMap = new Map(attendances.map((a) => [a.childId, a]));
    const alunos = classroom.enrollments.map(({ child }) => {
      const att = attendanceMap.get(child.id);
      return {
        id: child.id,
        nome: `${child.firstName} ${child.lastName}`,
        photoUrl: null as string | null,
        status: att?.status ?? null,
        justification: att?.justification ?? null,
        registrado: !!att,
      };
    });

    const registrados = alunos.filter((a) => a.registrado).length;
    const presentes = alunos.filter((a) => a.status === 'PRESENTE').length;
    const ausentes = alunos.filter((a) => a.status === 'AUSENTE').length;

    return {
      classroomId,
      classroomName: classroom.name,
      date: today.toISOString(),
      totalAlunos: alunos.length,
      registrados,
      presentes,
      ausentes,
      taxaPresenca: alunos.length > 0 ? Math.round((presentes / alunos.length) * 100) : 0,
      chamadaCompleta: registrados === alunos.length,
      alunos,
    };
  }

  /**
   * Resumo de frequência por turma em um período
   */
  async getSummary(classroomId: string, startDate: string, endDate: string, user: JwtPayload) {
    if (!classroomId || !startDate || !endDate) {
      throw new BadRequestException('classroomId, startDate e endDate são obrigatórios');
    }
    // FIX P0.3: usar UTC noon para consistência com register()
    const start = /^\d{4}-\d{2}-\d{2}$/.test(startDate)
      ? new Date(startDate + 'T00:00:00.000Z')   // início do dia UTC
      : new Date(startDate);
    const end = /^\d{4}-\d{2}-\d{2}$/.test(endDate)
      ? new Date(endDate + 'T23:59:59.999Z')      // fim do dia UTC
      : new Date(endDate);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        classroomId,
        date: { gte: start, lte: end },
      },
      include: {
        child: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { date: 'asc' },
    });

    const byChild = new Map<string, { nome: string; presentes: number; ausentes: number; justificados: number; total: number }>();
    for (const att of attendances) {
      const key = att.childId;
      if (!byChild.has(key)) {
        byChild.set(key, {
          nome: `${att.child.firstName} ${att.child.lastName}`,
          presentes: 0,
          ausentes: 0,
          justificados: 0,
          total: 0,
        });
      }
      const entry = byChild.get(key)!;
      entry.total++;
      if (att.status === 'PRESENTE') entry.presentes++;
      else if (att.status === 'AUSENTE') entry.ausentes++;
      else if (att.status === 'JUSTIFICADO') entry.justificados++;
    }

    const resumo = Array.from(byChild.entries()).map(([childId, data]) => ({
      childId,
      ...data,
      taxaPresenca: data.total > 0 ? Math.round((data.presentes / data.total) * 100) : 0,
    }));

    return {
      classroomId,
      periodo: { startDate, endDate },
      totalRegistros: attendances.length,
      resumoPorAluno: resumo,
    };
  }

  /**
   * Resumo de frequência de todas as turmas da unidade
   * Usa enrollments para contar alunos (relação correta no schema)
   */
  async getUnitSummary(date: string, user: JwtPayload) {
    if (!user?.mantenedoraId || !user?.unitId) {
      throw new ForbiddenException('Escopo inválido');
    }
    // FIX P0.3: usar UTC noon (T12:00:00Z) para consistência com register() e getToday().
    // setHours(0,0,0,0) usava local time do servidor (UTC), resultando em
    // 2026-03-08T00:00:00.000Z, enquanto os registros foram salvos com T12:00:00.000Z.
    // A query WHERE date = targetDate não encontrava nenhum registro.
    let targetDate: Date;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      targetDate = new Date(date + 'T12:00:00.000Z');
    } else {
      targetDate = new Date();
      targetDate.setUTCHours(12, 0, 0, 0);
    }

    const classrooms = await this.prisma.classroom.findMany({
      where: { unitId: user.unitId },
      include: {
        enrollments: {
          where: { status: 'ATIVA' },
          select: { id: true },
        },
        teachers: {
          where: { isActive: true },
          include: {
            teacher: { select: { firstName: true, lastName: true } },
          },
          take: 1,
        },
      },
    });

    const results = await Promise.all(
      classrooms.map(async (classroom) => {
        const attendances = await this.prisma.attendance.findMany({
          where: { classroomId: classroom.id, date: targetDate },
        });
        const totalAlunos = classroom.enrollments.length;
        const presentes = attendances.filter((a) => a.status === 'PRESENTE').length;
        const ausentes = attendances.filter((a) => a.status === 'AUSENTE').length;
        const registrados = attendances.length;
        const professor = classroom.teachers[0]?.teacher;

        return {
          classroomId: classroom.id,
          classroomName: classroom.name,
          professor: professor ? `${professor.firstName} ${professor.lastName}` : 'Não atribuído',
          totalAlunos,
          registrados,
          presentes,
          ausentes,
          chamadaFeita: registrados > 0,
          taxaPresenca: totalAlunos > 0 ? Math.round((presentes / totalAlunos) * 100) : 0,
        };
      }),
    );

    const turmasComChamada = results.filter((r) => r.chamadaFeita).length;
    const totalPresentes = results.reduce((sum, r) => sum + r.presentes, 0);
    const totalAlunos = results.reduce((sum, r) => sum + r.totalAlunos, 0);

    return {
      date: targetDate.toISOString(),
      unitId: user.unitId,
      totalTurmas: classrooms.length,
      turmasComChamada,
      totalAlunos,
      totalPresentes,
      taxaPresencaGeral: totalAlunos > 0 ? Math.round((totalPresentes / totalAlunos) * 100) : 0,
      turmas: results,
    };
  }
}
