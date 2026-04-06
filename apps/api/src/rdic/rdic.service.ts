import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * Fluxo de aprovação do RDIC (P0):
 *
 *  PROFESSOR          → cria/edita em RASCUNHO ou DEVOLVIDO
 *                     → envia para revisão (→ EM_REVISAO)
 *
 *  COORD. UNIDADE     → lê, edita (RASCUNHO ou EM_REVISAO), salva
 *  (UNIDADE)          → aprova (→ APROVADO)
 *                     → devolve com comentário obrigatório (→ DEVOLVIDO)
 *
 *  STAFF_CENTRAL      → somente leitura (apenas APROVADO/PUBLICADO)
 *                     → 403 para editar/aprovar/devolver
 *
 *  MANTENEDORA/DEV    → leitura completa (sem ações de aprovação)
 */
@Injectable()
export class RdicService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Criar RDIC (professor) ───────────────────────────────────────────────
  async criar(dto: any, user: JwtPayload) {
    if (!user?.mantenedoraId || !user?.unitId) {
      throw new ForbiddenException('Escopo inválido');
    }
    const { childId, classroomId, periodo, anoLetivo, rascunhoJson } = dto;
    if (!childId || !classroomId || !periodo || !anoLetivo) {
      throw new BadRequestException('childId, classroomId, periodo e anoLetivo são obrigatórios');
    }

    // Verificar se a turma pertence à unidade do professor
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, unitId: user.unitId },
    });
    if (!classroom) throw new NotFoundException('Turma não encontrada ou fora do escopo');

    // Buscar ou criar template padrão para a mantenedora
    let template = await this.prisma.rDIXTemplate.findFirst({
      where: { mantenedoraId: user.mantenedoraId, ativo: true },
    });
    if (!template) {
      template = await this.prisma.rDIXTemplate.create({
        data: {
          mantenedoraId: user.mantenedoraId,
          segmento: 'EDUCACAO_INFANTIL',
          titulo: 'RDIC — Relatório de Desenvolvimento Individual da Criança',
          estruturaJson: {},
          criadoPorId: user.sub,
        },
      });
    }

    // Verificar se já existe instância para este período
    const existente = await this.prisma.rDIXInstancia.findFirst({
      where: { childId, classroomId, periodo, anoLetivo },
    });
    if (existente) {
      throw new BadRequestException(
        `Já existe um RDIC para esta criança no período ${periodo}/${anoLetivo}. Use o endpoint de atualização.`,
      );
    }

    const periodoEnumMap: Record<string, string> = {
      'PRIMEIRO_TRIMESTRE': 'PRIMEIRO_TRIMESTRE',
      'SEGUNDO_TRIMESTRE':  'SEGUNDO_TRIMESTRE',
      'TERCEIRO_TRIMESTRE': 'TERCEIRO_TRIMESTRE',
      'PRIMEIRO_BIMESTRE':  'PRIMEIRO_BIMESTRE',
      'SEGUNDO_BIMESTRE':   'SEGUNDO_BIMESTRE',
      'TERCEIRO_BIMESTRE':  'TERCEIRO_BIMESTRE',
      'QUARTO_BIMESTRE':    'QUARTO_BIMESTRE',
    };
    const periodoEnumResolvido = dto.periodoEnum
      ? (periodoEnumMap[dto.periodoEnum] ?? null)
      : null;

    return this.prisma.rDIXInstancia.create({
      data: {
        mantenedoraId: user.mantenedoraId,
        unitId:        user.unitId,
        templateId:    template.id,
        childId,
        classroomId,
        periodo,
        periodoEnum:   periodoEnumResolvido as any ?? undefined,
        anoLetivo:     Number(anoLetivo),
        status:        'RASCUNHO',
        rascunhoJson:  rascunhoJson ?? {},
        criadoPorId:   user.sub,
      },
      include: { child: { select: { firstName: true, lastName: true } } },
    });
  }

  // ─── Atualizar rascunho ───────────────────────────────────────────────────
  async atualizar(id: string, dto: any, user: JwtPayload) {
    const level = user.roles[0]?.level;

    // STAFF_CENTRAL: nunca pode editar
    if (level === 'STAFF_CENTRAL') {
      throw new ForbiddenException('Central pedagógica não pode editar RDICs.');
    }

    const instancia = await this._buscarEValidar(id, user);

    // Professor só pode editar RASCUNHO ou DEVOLVIDO (e apenas o próprio)
    if (level === 'PROFESSOR') {
      if (!['RASCUNHO', 'DEVOLVIDO'].includes(instancia.status)) {
        throw new ForbiddenException(
          'Você só pode editar o RDIC enquanto estiver em RASCUNHO ou DEVOLVIDO.',
        );
      }
      if (instancia.criadoPorId !== user.sub) {
        throw new ForbiddenException('Você só pode editar seus próprios RDICs.');
      }
    }

    // Coordenadora pedagógica pode editar RASCUNHO ou EM_REVISAO
    if (level === 'UNIDADE') {
      if (!['RASCUNHO', 'EM_REVISAO', 'DEVOLVIDO'].includes(instancia.status)) {
        throw new ForbiddenException('RDIC já aprovado ou publicado. Não é possível editar.');
      }
    }

    return this.prisma.rDIXInstancia.update({
      where: { id },
      data: { rascunhoJson: dto.rascunhoJson ?? instancia.rascunhoJson },
      include: { child: { select: { firstName: true, lastName: true } } },
    });
  }

  // ─── Enviar para revisão (professor → EM_REVISAO) ─────────────────────────
  async enviarParaRevisao(id: string, user: JwtPayload) {
    const instancia = await this._buscarEValidar(id, user);
    if (!['RASCUNHO', 'DEVOLVIDO'].includes(instancia.status)) {
      throw new BadRequestException('Apenas RDICs em RASCUNHO ou DEVOLVIDO podem ser enviados para revisão.');
    }
    if (instancia.criadoPorId !== user.sub) {
      throw new ForbiddenException('Apenas o professor que criou o RDIC pode enviá-lo para revisão.');
    }
    return this.prisma.rDIXInstancia.update({
      where: { id },
      data: {
        status: 'EM_REVISAO',
        submittedAt: new Date(),
      },
    });
  }

  // ─── Aprovar (coord. unidade → APROVADO) ─────────────────────────────────
  async aprovar(id: string, user: JwtPayload) {
    if (user.roles[0]?.level !== 'UNIDADE') {
      throw new ForbiddenException('Apenas a coordenação pedagógica da unidade pode aprovar o RDIC.');
    }
    const instancia = await this._buscarEValidar(id, user);
    if (!['EM_REVISAO', 'RASCUNHO'].includes(instancia.status)) {
      throw new BadRequestException('Apenas RDICs em EM_REVISAO ou RASCUNHO podem ser aprovados.');
    }
    return this.prisma.rDIXInstancia.update({
      where: { id },
      data: {
        status: 'APROVADO',
        conteudoFinal: instancia.conteudoFinal ?? instancia.rascunhoJson ?? undefined,
        revisadoPorId: user.sub,
        reviewedAt: new Date(),
      },
      include: { child: { select: { firstName: true, lastName: true } } },
    });
  }

  // ─── Devolver ao professor (coord. unidade → DEVOLVIDO) ───────────────────
  async devolver(id: string, dto: { comment: string }, user: JwtPayload) {
    if (user.roles[0]?.level !== 'UNIDADE') {
      throw new ForbiddenException('Apenas a coordenação pedagógica pode devolver o RDIC.');
    }
    if (!dto.comment || dto.comment.trim().length < 5) {
      throw new BadRequestException('O comentário de devolução é obrigatório (mínimo 5 caracteres).');
    }
    const instancia = await this._buscarEValidar(id, user);
    if (instancia.status !== 'EM_REVISAO') {
      throw new BadRequestException('Apenas RDICs em EM_REVISAO podem ser devolvidos.');
    }
    return this.prisma.rDIXInstancia.update({
      where: { id },
      data: {
        status: 'DEVOLVIDO',
        reviewComment: dto.comment,
        revisadoPorId: user.sub,
        reviewedAt: new Date(),
      },
    });
  }

  // ─── Finalizar/Aprovar legado (coord. pedagógica unidade → FINALIZADO) ────
  // Mantido para compatibilidade; novos clientes devem usar /aprovar
  async finalizar(id: string, dto: any, user: JwtPayload) {
    if (user.roles[0]?.level !== 'UNIDADE') {
      throw new ForbiddenException('Apenas a coordenação pedagógica da unidade pode finalizar o RDIC.');
    }
    const instancia = await this._buscarEValidar(id, user);
    if (!['EM_REVISAO', 'RASCUNHO'].includes(instancia.status)) {
      throw new BadRequestException('RDIC já finalizado ou publicado.');
    }
    return this.prisma.rDIXInstancia.update({
      where: { id },
      data: {
        status: 'FINALIZADO',
        conteudoFinal: dto.conteudoFinal ?? instancia.rascunhoJson,
        revisadoPorId: user.sub,
        finalizadoEm: new Date(),
        reviewedAt: new Date(),
      },
      include: { child: { select: { firstName: true, lastName: true } } },
    });
  }

  // ─── Publicar (coord. pedagógica unidade → PUBLICADO) ────────────────────
  async publicar(id: string, user: JwtPayload) {
    if (user.roles[0]?.level !== 'UNIDADE') {
      throw new ForbiddenException('Apenas a coordenação pedagógica da unidade pode publicar o RDIC.');
    }
    const instancia = await this._buscarEValidar(id, user);
    if (!['FINALIZADO', 'APROVADO'].includes(instancia.status)) {
      throw new BadRequestException('Apenas RDICs FINALIZADOS ou APROVADOS podem ser publicados.');
    }
    return this.prisma.rDIXInstancia.update({
      where: { id },
      data: {
        status: 'PUBLICADO',
        publicadoEm: new Date(),
      },
    });
  }

  // ─── Status de completude da turma por bimestre ───────────────────────────
  // GET /rdic/turma/status?classroomId&periodo&anoLetivo
  async turmaStatus(query: any, user: JwtPayload) {
    const level = user.roles[0]?.level;
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');

    const { classroomId, periodo, anoLetivo } = query;
    if (!classroomId || !periodo || !anoLetivo) {
      throw new BadRequestException('classroomId, periodo e anoLetivo são obrigatórios');
    }

    // Verificar escopo
    const classroom = await this.prisma.classroom.findFirst({
      where: {
        id: classroomId,
        unit: { mantenedoraId: user.mantenedoraId },
        ...(level === 'PROFESSOR' || level === 'UNIDADE' ? { unitId: user.unitId! } : {}),
      },
    });
    if (!classroom) throw new NotFoundException('Turma não encontrada ou fora do escopo');

    // Buscar crianças com matrícula ativa na turma
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classroomId, status: 'ATIVA' },
      include: { child: { select: { id: true, firstName: true, lastName: true } } },
    });

    // Buscar RDICs existentes para essa turma/período/ano
    const rdics = await this.prisma.rDIXInstancia.findMany({
      where: {
        classroomId,
        periodo,
        anoLetivo: Number(anoLetivo),
        mantenedoraId: user.mantenedoraId,
      },
      select: {
        id: true,
        childId: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
      },
    });

    const rdicByChild = new Map(rdics.map(r => [r.childId, r]));
    const totalCriancas = enrollments.length;
    const criancas = enrollments.map(({ child }) => ({
      childId: child.id,
      nome: `${child.firstName} ${child.lastName}`,
      rdic: rdicByChild.get(child.id) ?? null,
      status: rdicByChild.get(child.id)?.status ?? 'PENDENTE',
    }));

    const contagem = {
      total: totalCriancas,
      pendente: criancas.filter(c => c.status === 'PENDENTE').length,
      rascunho: criancas.filter(c => c.status === 'RASCUNHO').length,
      emRevisao: criancas.filter(c => c.status === 'EM_REVISAO').length,
      devolvido: criancas.filter(c => c.status === 'DEVOLVIDO').length,
      aprovado: criancas.filter(c => c.status === 'APROVADO').length,
      finalizado: criancas.filter(c => ['FINALIZADO', 'PUBLICADO'].includes(c.status)).length,
    };

    return {
      classroomId,
      classroomName: classroom.name,
      periodo,
      anoLetivo: Number(anoLetivo),
      completude: totalCriancas > 0
        ? Math.round(((contagem.aprovado + contagem.finalizado) / totalCriancas) * 100)
        : 0,
      contagem,
      criancas,
    };
  }

  // ─── Consolidado da turma (dados para relatório) ──────────────────────────
  // GET /rdic/turma/consolidado?classroomId&periodo&anoLetivo
  async turmaConsolidado(query: any, user: JwtPayload) {
    const level = user.roles[0]?.level;
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');

    const { classroomId, periodo, anoLetivo } = query;
    if (!classroomId || !periodo || !anoLetivo) {
      throw new BadRequestException('classroomId, periodo e anoLetivo são obrigatórios');
    }

    // STAFF_CENTRAL só vê APROVADO/PUBLICADO
    const statusFilter: any =
      level === 'STAFF_CENTRAL'
        ? { status: { in: ['APROVADO', 'PUBLICADO', 'FINALIZADO'] as any } }
        : {};

    const rdics = await this.prisma.rDIXInstancia.findMany({
      where: {
        classroomId,
        periodo,
        anoLetivo: Number(anoLetivo),
        mantenedoraId: user.mantenedoraId,
        ...statusFilter,
      },
      include: {
        child: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });

    return {
      classroomId,
      periodo,
      anoLetivo: Number(anoLetivo),
      total: rdics.length,
      rdics: rdics.map(r => ({
        id: r.id,
        childId: r.childId,
        childNome: `${r.child.firstName} ${r.child.lastName}`,
        status: r.status,
        submittedAt: r.submittedAt,
        reviewedAt: r.reviewedAt,
        reviewComment: r.reviewComment,
        conteudo: r.conteudoFinal ?? r.rascunhoJson,
      })),
    };
  }

  // ─── Listar RDICs com controle de acesso por role ─────────────────────────
  async listar(query: any, user: JwtPayload) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    const level = user.roles[0]?.level;

    const where: any = { mantenedoraId: user.mantenedoraId };

    // PROFESSOR: vê apenas os RDICs que ele criou (qualquer status)
    if (level === 'PROFESSOR') {
      where.criadoPorId = user.sub;
      where.unitId = user.unitId;
    }
    // UNIDADE (coord. pedagógica): vê todos da sua unidade
    else if (level === 'UNIDADE') {
      where.unitId = user.unitId;
      // Exige pelo menos um filtro granular para evitar carga de toda a unidade
      if (!query.classroomId && !query.childId) {
        throw new BadRequestException(
          'Para a coordenação de unidade, é obrigatório filtrar por classroomId ou childId.',
        );
      }
    }
    // STAFF_CENTRAL: somente APROVADO/PUBLICADO/FINALIZADO
    else if (level === 'STAFF_CENTRAL') {
      where.status = { in: ['APROVADO', 'PUBLICADO', 'FINALIZADO'] as any };
    }
    // MANTENEDORA / DEVELOPER: vê tudo (sem filtro adicional)

    // Filtros opcionais da query
    if (query.classroomId) where.classroomId = query.classroomId;
    if (query.childId) where.childId = query.childId;
    if (query.status) where.status = query.status;
    if (query.periodo) where.periodo = query.periodo;
    if (query.anoLetivo) where.anoLetivo = Number(query.anoLetivo);
    if (query.unitId && (level === 'MANTENEDORA' || level === 'DEVELOPER' || level === 'STAFF_CENTRAL')) {
      where.unitId = query.unitId;
    }

    return this.prisma.rDIXInstancia.findMany({
      where,
      include: {
        child: { select: { firstName: true, lastName: true, dateOfBirth: true } },
      },
      orderBy: { criadoEm: 'desc' },
      take: 200,
    });
  }

  // ─── Detalhe de um RDIC ───────────────────────────────────────────────────
  async getById(id: string, user: JwtPayload) {
    const instancia = await this._buscarEValidar(id, user);
    const level = user.roles[0]?.level;

    // STAFF_CENTRAL só pode ler APROVADO/PUBLICADO/FINALIZADO
    if (level === 'STAFF_CENTRAL' && !['APROVADO', 'PUBLICADO', 'FINALIZADO'].includes(instancia.status)) {
      throw new ForbiddenException(
        'Este RDIC ainda não foi aprovado pela coordenação pedagógica da unidade.',
      );
    }

    return instancia;
  }

  // ─── Central da Criança ─────────────────────────────────────────────────
  async centralDaCrianca(childId: string, user: JwtPayload) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    const level = user.roles?.[0]?.level;

    // 1. Dados da criança com restrições alimentares
    const child = await this.prisma.child.findFirst({
      where: { id: childId, mantenedoraId: user.mantenedoraId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        photoUrl: true,
        allergies: true,
        medicalConditions: true,
        medicationNeeds: true,
        enrollments: {
          where: { status: 'ATIVA' },
          select: {
            classroom: { select: { id: true, name: true } },
          },
          take: 1,
        },
        dietaryRestrictions: {
          where: { isActive: true },
          select: {
            id: true,
            type: true,
            name: true,
            severity: true,
            forbiddenFoods: true,
          },
        },
      },
    });

    if (!child) {
      throw new NotFoundException('Criança não encontrada ou fora do escopo');
    }

    // 2. PROFESSOR: verificar vínculo com a turma da criança
    if (level === 'PROFESSOR') {
      const enrollment = child.enrollments?.[0];
      if (!enrollment) {
        throw new ForbiddenException('Criança sem turma activa');
      }
      const ct = await this.prisma.classroomTeacher.findFirst({
        where: {
          teacherId: user.sub,
          classroomId: enrollment.classroom.id,
          isActive: true,
        },
      });
      if (!ct) {
        throw new ForbiddenException(
          'Você não está vinculado à turma desta criança.',
        );
      }
    }

    // 3. Acompanhamento nutricional — query separada e defensiva
    let acompanhamentoNutricional: any = null;
    try {
      acompanhamentoNutricional = await (this.prisma as any)
        .acompanhamentoNutricional.findUnique({
          where: { childId },
          select: {
            statusCaso: true,
            orientacoesProfCozinha: true,
            restricoesOperacionais: true,
            substituicoesSeguras: true,
            proximaReavaliacao: true,
          },
        });
    } catch {
      // Silencioso — acompanhamento é opcional, nunca deve quebrar o endpoint
    }

    // 4. Todos os RDICs da criança (mais recente primeiro)
    const rdics = await this.prisma.rDIXInstancia.findMany({
      where: { childId, mantenedoraId: user.mantenedoraId },
      select: {
        id: true,
        periodo: true,
        periodoEnum: true,
        anoLetivo: true,
        status: true,
        rascunhoJson: true,
        reviewComment: true,
        submittedAt: true,
        reviewedAt: true,
        finalizadoEm: true,
        publicadoEm: true,
        criadoEm: true,
        atualizadoEm: true,
      },
      orderBy: { criadoEm: 'desc' },
    });

    // 5. Contar eventos do diário nos últimos 90 dias
    let totalDiario90dias = 0;
    try {
      const noventa = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      totalDiario90dias = await this.prisma.diaryEvent.count({
        where: {
          childId,
          mantenedoraId: user.mantenedoraId,
          createdAt: { gte: noventa },
        },
      });
    } catch {
      // Silencioso — contagem é informativa, não deve quebrar o endpoint
    }

    return {
      child: {
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        dateOfBirth: child.dateOfBirth
          ? (child.dateOfBirth as Date).toISOString()
          : null,
        gender: child.gender ? String(child.gender) : null,
        photoUrl: child.photoUrl ?? null,
        allergies: child.allergies ?? null,
        medicalConditions: child.medicalConditions ?? null,
        medicationNeeds: child.medicationNeeds ?? null,
        turma: child.enrollments?.[0]?.classroom ?? null,
        restricoesAlimentares: child.dietaryRestrictions ?? [],
        acompanhamentoNutricional,
      },
      rdics,
      rdicAtual: rdics[0] ?? null,
      totalDiario90dias,
    };
  }

  // ─── Helper interno ───────────────────────────────────────────────────────
  private async _buscarEValidar(id: string, user: JwtPayload) {
    const instancia = await this.prisma.rDIXInstancia.findUnique({
      where: { id },
      include: { child: { select: { firstName: true, lastName: true } } },
    });
    if (!instancia) throw new NotFoundException('RDIC não encontrado');
    if (instancia.mantenedoraId !== user.mantenedoraId) {
      throw new ForbiddenException('Fora do escopo');
    }
    return instancia;
  }
}
