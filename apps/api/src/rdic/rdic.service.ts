import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * Fluxo de aprovação do RDIC:
 *
 *  PROFESSOR          → cria/edita em RASCUNHO
 *                     → envia para revisão (EM_REVISAO)
 *
 *  COORD. PEDAGÓGICA  → lê, edita, corrige e aprova (FINALIZADO)
 *  (UNIDADE)          → pode devolver ao professor (volta para RASCUNHO)
 *
 *  COORD. GERAL       → somente leitura, somente status FINALIZADO
 *  (STAFF_CENTRAL)
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

    return this.prisma.rDIXInstancia.create({
      data: {
        mantenedoraId: user.mantenedoraId,
        unitId: user.unitId,
        templateId: template.id,
        childId,
        classroomId,
        periodo,
        anoLetivo: Number(anoLetivo),
        status: 'RASCUNHO',
        rascunhoJson: rascunhoJson ?? {},
        criadoPorId: user.sub,
      },
      include: { child: { select: { firstName: true, lastName: true } } },
    });
  }

  // ─── Atualizar rascunho (professor — somente RASCUNHO) ────────────────────
  async atualizar(id: string, dto: any, user: JwtPayload) {
    const instancia = await this._buscarEValidar(id, user);

    // Professor só pode editar RASCUNHO
    const isProfessor = user.roles[0]?.level === 'PROFESSOR';
    if (isProfessor && instancia.status !== 'RASCUNHO') {
      throw new ForbiddenException(
        'Você só pode editar o RDIC enquanto ele estiver em RASCUNHO. Solicite devolução à coordenação.',
      );
    }

    // Coordenadora pedagógica pode editar RASCUNHO ou EM_REVISAO
    const isUnidade = user.roles[0]?.level === 'UNIDADE';
    if (isUnidade && !['RASCUNHO', 'EM_REVISAO'].includes(instancia.status)) {
      throw new ForbiddenException('RDIC já finalizado. Não é possível editar.');
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
    if (instancia.status !== 'RASCUNHO') {
      throw new BadRequestException('Apenas RDICs em RASCUNHO podem ser enviados para revisão.');
    }
    if (instancia.criadoPorId !== user.sub) {
      throw new ForbiddenException('Apenas o professor que criou o RDIC pode enviá-lo para revisão.');
    }
    return this.prisma.rDIXInstancia.update({
      where: { id },
      data: { status: 'EM_REVISAO' },
    });
  }

  // ─── Devolver ao professor (coord. unidade → RASCUNHO) ────────────────────
  async devolver(id: string, user: JwtPayload) {
    if (user.roles[0]?.level !== 'UNIDADE' && user.roles[0]?.level !== 'DEVELOPER') {
      throw new ForbiddenException('Apenas a coordenação pedagógica pode devolver o RDIC.');
    }
    const instancia = await this._buscarEValidar(id, user);
    if (instancia.status !== 'EM_REVISAO') {
      throw new BadRequestException('Apenas RDICs em EM_REVISAO podem ser devolvidos.');
    }
    return this.prisma.rDIXInstancia.update({
      where: { id },
      data: { status: 'RASCUNHO' },
    });
  }

  // ─── Finalizar/Aprovar (coord. pedagógica unidade → FINALIZADO) ───────────
  async finalizar(id: string, dto: any, user: JwtPayload) {
    if (user.roles[0]?.level !== 'UNIDADE' && user.roles[0]?.level !== 'DEVELOPER') {
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
      },
      include: { child: { select: { firstName: true, lastName: true } } },
    });
  }

  // ─── Publicar (coord. pedagógica unidade → PUBLICADO) ────────────────────
  // Após PUBLICADO, fica disponível para a coordenação geral (leitura)
  async publicar(id: string, user: JwtPayload) {
    if (user.roles[0]?.level !== 'UNIDADE' && user.roles[0]?.level !== 'DEVELOPER') {
      throw new ForbiddenException('Apenas a coordenação pedagógica da unidade pode publicar o RDIC.');
    }
    const instancia = await this._buscarEValidar(id, user);
    if (instancia.status !== 'FINALIZADO') {
      throw new BadRequestException('Apenas RDICs FINALIZADOS podem ser publicados.');
    }
    return this.prisma.rDIXInstancia.update({
      where: { id },
      data: {
        status: 'PUBLICADO',
        publicadoEm: new Date(),
      },
    });
  }

  // ─── Listar RDICs com controle de acesso por role ─────────────────────────
  async listar(query: any, user: JwtPayload) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');

    const where: any = { mantenedoraId: user.mantenedoraId };

    // PROFESSOR: vê apenas os RDICs que ele criou (qualquer status)
    if (user.roles[0]?.level === 'PROFESSOR') {
      where.criadoPorId = user.sub;
      where.unitId = user.unitId;
    }

    // UNIDADE (coord. pedagógica): vê todos da sua unidade (qualquer status)
    else if (user.roles[0]?.level === 'UNIDADE') {
      where.unitId = user.unitId;
    }

    // STAFF_CENTRAL (coord. geral): somente PUBLICADOS
    else if (user.roles[0]?.level === 'STAFF_CENTRAL') {
      where.status = 'PUBLICADO';
    }

    // MANTENEDORA / DEVELOPER: vê tudo
    // (sem filtro adicional)

    // Filtros opcionais da query
    if (query.classroomId) where.classroomId = query.classroomId;
    if (query.childId) where.childId = query.childId;
    if (query.status) where.status = query.status;
    if (query.periodo) where.periodo = query.periodo;
    if (query.anoLetivo) where.anoLetivo = Number(query.anoLetivo);

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

    // STAFF_CENTRAL só pode ler PUBLICADOS
    if (user.roles[0]?.level === 'STAFF_CENTRAL' && instancia.status !== 'PUBLICADO') {
      throw new ForbiddenException(
        'Este RDIC ainda não foi publicado pela coordenação pedagógica da unidade.',
      );
    }

    return instancia;
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
