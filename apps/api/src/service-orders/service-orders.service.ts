import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleLevel, ServiceOrderResult, ServiceOrderStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  ACTIVE_STATUSES,
  AcceptServiceOrderDto,
  CancelServiceOrderDto,
  CommentServiceOrderDto,
  CompleteServiceOrderDto,
  CreateServiceOrderDto,
  EvaluateServiceOrderDto,
  ListServiceOrdersQueryDto,
  UpdateServiceOrderDto,
} from './dto/service-order.dto';

type Actor = 'ADMIN' | 'MANTENEDORA' | 'MANUTENCAO' | 'UNIDADE' | 'PROFESSOR';

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
const MAX_ATTACHMENTS_PER_ORDER = 12;

@Injectable()
export class ServiceOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Perfil / escopo ──────────────────────────────────────────

  /** Perfil efetivo = o mais amplo entre os papéis do usuário. */
  private actorOf(user: JwtPayload): Actor {
    const levels = new Set((user.roles ?? []).map((r) => r.level));
    if (levels.has(RoleLevel.DEVELOPER)) return 'ADMIN';
    if (levels.has(RoleLevel.MANTENEDORA)) return 'MANTENEDORA';
    if (levels.has(RoleLevel.MANUTENCAO)) return 'MANUTENCAO';
    if (levels.has(RoleLevel.UNIDADE)) return 'UNIDADE';
    if (levels.has(RoleLevel.PROFESSOR)) return 'PROFESSOR';
    throw new ForbiddenException('Seu perfil não tem acesso a ordens de serviço');
  }

  private unitIdsOf(user: JwtPayload): string[] {
    const ids = new Set<string>();
    if (user.unitId) ids.add(user.unitId);
    for (const r of user.roles ?? []) for (const u of r.unitScopes ?? []) ids.add(u);
    return [...ids];
  }

  private requireMantenedora(user: JwtPayload): string {
    if (!user?.mantenedoraId) throw new BadRequestException('mantenedoraId ausente no token');
    return user.mantenedoraId;
  }

  /** Filtro de visibilidade aplicado a toda leitura. */
  private visibilityWhere(user: JwtPayload): Prisma.ServiceOrderWhereInput {
    const mantenedoraId = this.requireMantenedora(user);
    const actor = this.actorOf(user);
    if (actor === 'ADMIN' || actor === 'MANTENEDORA' || actor === 'MANUTENCAO') {
      return { mantenedoraId };
    }
    const units = this.unitIdsOf(user);
    if (units.length === 0) return { mantenedoraId, id: '__none__' }; // sem unidade → nada
    if (actor === 'UNIDADE') return { mantenedoraId, unitId: { in: units } };
    return { mantenedoraId, unitId: { in: units }, requestedById: user.sub }; // PROFESSOR
  }

  private async loadVisible(user: JwtPayload, id: string) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { AND: [{ id }, this.visibilityWhere(user)] },
      include: {
        unit: { select: { id: true, name: true, code: true } },
        events: { orderBy: { createdAt: 'asc' } },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException('Ordem de serviço não encontrada');
    return order;
  }

  /** Quem pode avaliar/cancelar como "solicitante": autor, gestão da unidade, mantenedora, dev. */
  private canActAsRequester(user: JwtPayload, order: { requestedById: string; unitId: string }): boolean {
    const actor = this.actorOf(user);
    if (actor === 'ADMIN' || actor === 'MANTENEDORA') return true;
    if (order.requestedById === user.sub) return true;
    return actor === 'UNIDADE' && this.unitIdsOf(user).includes(order.unitId);
  }

  private async namesFor(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true },
    });
    return new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
  }

  private async decorate<T extends { requestedById: string; assignedToId: string | null; evaluatedById: string | null }>(
    orders: T[],
  ) {
    const names = await this.namesFor(orders.flatMap((o) => [o.requestedById, o.assignedToId, o.evaluatedById]));
    const now = Date.now();
    return orders.map((o) => {
      const due = (o as any).dueDate as Date | null;
      const status = (o as any).status as ServiceOrderStatus;
      return {
        ...o,
        requestedByName: names.get(o.requestedById) ?? null,
        assignedToName: o.assignedToId ? names.get(o.assignedToId) ?? null : null,
        evaluatedByName: o.evaluatedById ? names.get(o.evaluatedById) ?? null : null,
        isOverdue: !!due && due.getTime() < now && ACTIVE_STATUSES.includes(status),
      };
    });
  }

  private async log(
    tx: Prisma.TransactionClient,
    orderId: string,
    authorId: string,
    type: string,
    fromStatus: ServiceOrderStatus | null,
    toStatus: ServiceOrderStatus | null,
    message?: string | null,
  ) {
    await tx.serviceOrderEvent.create({
      data: { orderId, authorId, type, fromStatus, toStatus, message: message?.trim() || null },
    });
  }

  /** Troca de status com condição (evita corrida entre dois cliques/usuários). */
  private async transition(
    orderId: string,
    from: ServiceOrderStatus[],
    data: Prisma.ServiceOrderUpdateManyMutationInput & { assignedToId?: string | null },
    event: { authorId: string; type: string; to: ServiceOrderStatus; message?: string | null; from: ServiceOrderStatus },
  ) {
    await this.prisma.$transaction(async (tx) => {
      const res = await tx.serviceOrder.updateMany({
        where: { id: orderId, status: { in: from } },
        data: { ...data, status: event.to },
      });
      if (res.count !== 1) {
        throw new BadRequestException('A situação desta ordem mudou. Atualize a tela e tente novamente.');
      }
      await this.log(tx, orderId, event.authorId, event.type, event.from, event.to, event.message);
    });
  }

  // ─── Criação ──────────────────────────────────────────────────

  async create(user: JwtPayload, dto: CreateServiceOrderDto) {
    const mantenedoraId = this.requireMantenedora(user);
    const actor = this.actorOf(user);
    if (actor === 'MANUTENCAO') throw new ForbiddenException('A manutenção não abre ordens de serviço');

    let unitId: string | undefined;
    if (actor === 'ADMIN' || actor === 'MANTENEDORA') {
      unitId = dto.unitId;
      if (!unitId) throw new BadRequestException('Informe a unidade da ordem de serviço');
    } else {
      const own = this.unitIdsOf(user);
      unitId = dto.unitId ?? user.unitId ?? own[0];
      if (!unitId || !own.includes(unitId)) {
        throw new ForbiddenException('Você só pode abrir ordens para a sua unidade');
      }
    }

    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, mantenedoraId },
      select: { id: true },
    });
    if (!unit) throw new BadRequestException('Unidade não encontrada');

    const created = await this.prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.create({
        data: {
          mantenedoraId,
          unitId: unit.id,
          title: dto.title.trim(),
          description: dto.description.trim(),
          location: dto.location.trim(),
          category: dto.category,
          priority: dto.priority,
          requestedById: user.sub,
        },
      });
      await this.log(tx, order.id, user.sub, 'CRIADA', null, ServiceOrderStatus.ABERTA, null);
      return order;
    });
    return this.get(user, created.id);
  }

  // ─── Leitura ──────────────────────────────────────────────────

  async list(user: JwtPayload, q: ListServiceOrdersQueryDto) {
    const actor = this.actorOf(user);
    const and: Prisma.ServiceOrderWhereInput[] = [this.visibilityWhere(user)];

    if (q.status) {
      const wanted = q.status
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is ServiceOrderStatus => s in ServiceOrderStatus);
      if (wanted.length) and.push({ status: { in: wanted } });
    }
    if (q.unitId && actor !== 'UNIDADE' && actor !== 'PROFESSOR') and.push({ unitId: q.unitId });
    if (q.assignedTo === 'me') and.push({ assignedToId: user.sub });
    else if (q.assignedTo === 'none') and.push({ assignedToId: null });
    else if (q.assignedTo) and.push({ assignedToId: q.assignedTo });
    if (q.priority) and.push({ priority: q.priority });
    if (q.category) and.push({ category: q.category });
    if (q.overdue === 'true') and.push({ dueDate: { lt: new Date() }, status: { in: ACTIVE_STATUSES } });
    if (q.q?.trim()) {
      const term = q.q.trim();
      const asNumber = Number(term.replace(/^#?(os)?/i, ''));
      and.push({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { location: { contains: term, mode: 'insensitive' } },
          ...(Number.isInteger(asNumber) && asNumber > 0 ? [{ number: asNumber }] : []),
        ],
      });
    }

    const limit = q.limit ?? 50;
    const page = q.page ?? 1;
    const where: Prisma.ServiceOrderWhereInput = { AND: and };
    const [total, rows] = await Promise.all([
      this.prisma.serviceOrder.count({ where }),
      this.prisma.serviceOrder.findMany({
        where,
        include: { unit: { select: { id: true, name: true, code: true } } },
        orderBy: [{ createdAt: 'desc' }],
        take: limit,
        skip: (page - 1) * limit,
      }),
    ]);
    return { total, page, limit, items: await this.decorate(rows) };
  }

  async get(user: JwtPayload, id: string) {
    const order = await this.loadVisible(user, id);
    const [decorated] = await this.decorate([order]);
    const names = await this.namesFor(order.events.map((e) => e.authorId).concat(order.attachments.map((a) => a.uploadedById)));
    return {
      ...decorated,
      events: order.events.map((e) => ({ ...e, authorName: names.get(e.authorId) ?? null })),
      attachments: order.attachments.map((a) => ({
        ...a,
        url: `/uploads/${a.path}`,
        uploadedByName: names.get(a.uploadedById) ?? null,
      })),
    };
  }

  /** Painel: contadores (respeita a visibilidade do perfil). */
  async summary(user: JwtPayload) {
    const actor = this.actorOf(user);
    const base = this.visibilityWhere(user);
    const now = new Date();
    const [byStatus, overdue, urgent, mine, unassigned, closed, byUnit] = await Promise.all([
      this.prisma.serviceOrder.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
      this.prisma.serviceOrder.count({ where: { AND: [base, { dueDate: { lt: now }, status: { in: ACTIVE_STATUSES } }] } }),
      this.prisma.serviceOrder.count({
        where: { AND: [base, { priority: 'URGENTE', status: { in: ACTIVE_STATUSES } }] },
      }),
      this.prisma.serviceOrder.count({
        where: { AND: [base, { assignedToId: user.sub, status: { in: ['ACEITA', 'EM_EXECUCAO'] } }] },
      }),
      this.prisma.serviceOrder.count({ where: { AND: [base, { status: 'ABERTA' }] } }),
      this.prisma.serviceOrder.findMany({
        where: { AND: [base, { status: 'ENCERRADA' }] },
        select: { createdAt: true, completedAt: true },
        orderBy: { closedAt: 'desc' },
        take: 200,
      }),
      actor === 'UNIDADE' || actor === 'PROFESSOR'
        ? Promise.resolve([] as { unitId: string; status: ServiceOrderStatus; _count: { _all: number } }[])
        : this.prisma.serviceOrder.groupBy({ by: ['unitId', 'status'], where: base, _count: { _all: true } }),
    ]);

    const counts: Record<string, number> = {};
    for (const s of Object.values(ServiceOrderStatus)) counts[s] = 0;
    for (const row of byStatus) counts[row.status] = row._count._all;

    const times = closed
      .filter((c) => c.completedAt)
      .map((c) => (c.completedAt!.getTime() - c.createdAt.getTime()) / 36e5);
    const avgResolutionHours = times.length ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10 : null;

    let units: { unitId: string; unitName: string; open: number; overdue: number; total: number }[] = [];
    if (byUnit.length) {
      const unitRows = await this.prisma.unit.findMany({
        where: { id: { in: [...new Set(byUnit.map((r) => r.unitId))] } },
        select: { id: true, name: true },
      });
      const nameById = new Map(unitRows.map((u) => [u.id, u.name]));
      const overdueByUnit = await this.prisma.serviceOrder.groupBy({
        by: ['unitId'],
        where: { AND: [base, { dueDate: { lt: now }, status: { in: ACTIVE_STATUSES } }] },
        _count: { _all: true },
      });
      const overdueMap = new Map(overdueByUnit.map((r) => [r.unitId, r._count._all]));
      const agg = new Map<string, { open: number; total: number }>();
      for (const r of byUnit) {
        const cur = agg.get(r.unitId) ?? { open: 0, total: 0 };
        cur.total += r._count._all;
        if (ACTIVE_STATUSES.includes(r.status)) cur.open += r._count._all;
        agg.set(r.unitId, cur);
      }
      units = [...agg.entries()]
        .map(([unitId, v]) => ({
          unitId,
          unitName: nameById.get(unitId) ?? unitId,
          open: v.open,
          total: v.total,
          overdue: overdueMap.get(unitId) ?? 0,
        }))
        .sort((a, b) => b.open - a.open);
    }

    return {
      profile: actor,
      counts,
      open: ACTIVE_STATUSES.reduce((n, s) => n + counts[s], 0),
      overdue,
      urgent,
      unassigned,
      mine,
      awaitingEvaluation: counts[ServiceOrderStatus.AGUARDANDO_AVALIACAO],
      avgResolutionHours,
      units,
    };
  }

  /** Equipe de manutenção (para atribuir responsável). */
  async team(user: JwtPayload) {
    const mantenedoraId = this.requireMantenedora(user);
    const rows = await this.prisma.user.findMany({
      where: {
        mantenedoraId,
        status: 'ATIVO',
        roles: { some: { role: { level: RoleLevel.MANUTENCAO } } },
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
    });
    return rows.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`.trim() }));
  }

  private async assertMaintenanceUser(mantenedoraId: string, userId: string) {
    const ok = await this.prisma.user.findFirst({
      where: { id: userId, mantenedoraId, roles: { some: { role: { level: RoleLevel.MANUTENCAO } } } },
      select: { id: true },
    });
    if (!ok) throw new BadRequestException('Responsável deve ser um usuário da Manutenção');
  }

  private parseDue(value: string): Date {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Prazo inválido');
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (d.getTime() < startOfToday.getTime() - 24 * 36e5) {
      throw new BadRequestException('O prazo não pode estar no passado');
    }
    return d;
  }

  // ─── Fluxo da manutenção ──────────────────────────────────────

  async accept(user: JwtPayload, id: string, dto: AcceptServiceOrderDto) {
    const order = await this.loadVisible(user, id);
    if (order.status !== ServiceOrderStatus.ABERTA) {
      throw new BadRequestException('Só é possível aceitar ordens abertas');
    }
    const actor = this.actorOf(user);
    const assignee = dto.assignedToId ?? (actor === 'MANUTENCAO' ? user.sub : undefined);
    if (!assignee) throw new BadRequestException('Informe o responsável pela execução');
    if (dto.assignedToId && dto.assignedToId !== user.sub) {
      await this.assertMaintenanceUser(order.mantenedoraId, dto.assignedToId);
    }
    const due = this.parseDue(dto.dueDate);

    await this.transition(
      id,
      [ServiceOrderStatus.ABERTA],
      { dueDate: due, acceptedAt: new Date(), assignedToId: assignee },
      { authorId: user.sub, type: 'ACEITA', from: ServiceOrderStatus.ABERTA, to: ServiceOrderStatus.ACEITA, message: dto.message },
    );
    return this.get(user, id);
  }

  async update(user: JwtPayload, id: string, dto: UpdateServiceOrderDto) {
    const order = await this.loadVisible(user, id);
    if (!ACTIVE_STATUSES.includes(order.status)) {
      throw new BadRequestException('Esta ordem já foi encerrada ou cancelada');
    }
    const data: Prisma.ServiceOrderUpdateInput = {};
    const notes: string[] = [];
    if (dto.dueDate) {
      data.dueDate = this.parseDue(dto.dueDate);
      notes.push('Prazo alterado');
    }
    if (dto.assignedToId) {
      await this.assertMaintenanceUser(order.mantenedoraId, dto.assignedToId);
      data.assignedToId = dto.assignedToId;
      notes.push('Responsável alterado');
    }
    if (dto.priority) {
      data.priority = dto.priority;
      notes.push(`Prioridade: ${dto.priority}`);
    }
    if (notes.length === 0) throw new BadRequestException('Nada para alterar');

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceOrder.update({ where: { id }, data });
      await this.log(tx, id, user.sub, 'ATUALIZADA', order.status, order.status, [notes.join('; '), dto.message].filter(Boolean).join(' — '));
    });
    return this.get(user, id);
  }

  async start(user: JwtPayload, id: string) {
    const order = await this.loadVisible(user, id);
    this.assertAssignee(user, order);
    await this.transition(
      id,
      [ServiceOrderStatus.ACEITA],
      { startedAt: new Date() },
      { authorId: user.sub, type: 'INICIADA', from: ServiceOrderStatus.ACEITA, to: ServiceOrderStatus.EM_EXECUCAO },
    );
    return this.get(user, id);
  }

  async complete(user: JwtPayload, id: string, dto: CompleteServiceOrderDto) {
    const order = await this.loadVisible(user, id);
    this.assertAssignee(user, order);
    await this.transition(
      id,
      [ServiceOrderStatus.ACEITA, ServiceOrderStatus.EM_EXECUCAO],
      {
        completedAt: new Date(),
        executionReport: dto.report.trim(),
        executionResult: dto.result,
        startedAt: order.startedAt ?? new Date(),
      },
      {
        authorId: user.sub,
        type: 'CONCLUIDA',
        from: order.status,
        to: ServiceOrderStatus.AGUARDANDO_AVALIACAO,
        message: `[${dto.result}] ${dto.report.trim()}`,
      },
    );
    return this.get(user, id);
  }

  private assertAssignee(user: JwtPayload, order: { assignedToId: string | null }) {
    const actor = this.actorOf(user);
    if (actor === 'ADMIN') return;
    if (actor !== 'MANUTENCAO') throw new ForbiddenException('Apenas a manutenção executa ordens de serviço');
    if (order.assignedToId !== user.sub) {
      throw new ForbiddenException('Esta ordem está atribuída a outro membro da manutenção');
    }
  }

  // ─── Fluxo de quem solicitou ──────────────────────────────────

  async evaluate(user: JwtPayload, id: string, dto: EvaluateServiceOrderDto) {
    const order = await this.loadVisible(user, id);
    if (!this.canActAsRequester(user, order)) {
      throw new ForbiddenException('Apenas quem solicitou (ou a gestão da unidade) pode avaliar');
    }
    if (order.status !== ServiceOrderStatus.AGUARDANDO_AVALIACAO) {
      throw new BadRequestException('A ordem não está aguardando avaliação');
    }
    const satisfied = dto.result === ServiceOrderResult.EXECUTADO;
    if (!satisfied && !dto.notes?.trim()) {
      throw new BadRequestException('Explique o que não foi resolvido');
    }
    const reopen = !satisfied && dto.reopen === true;
    const now = new Date();

    await this.transition(
      id,
      [ServiceOrderStatus.AGUARDANDO_AVALIACAO],
      {
        evaluationResult: dto.result,
        evaluationNotes: dto.notes?.trim() || null,
        evaluatedById: user.sub,
        evaluatedAt: now,
        ...(reopen
          ? { reopenCount: { increment: 1 }, completedAt: null }
          : { closedAt: now }),
      },
      {
        authorId: user.sub,
        type: reopen ? 'REABERTA' : 'AVALIADA',
        from: ServiceOrderStatus.AGUARDANDO_AVALIACAO,
        to: reopen ? ServiceOrderStatus.ACEITA : ServiceOrderStatus.ENCERRADA,
        message: `[${dto.result}] ${dto.notes?.trim() ?? ''}`.trim(),
      },
    );
    return this.get(user, id);
  }

  async cancel(user: JwtPayload, id: string, dto: CancelServiceOrderDto) {
    const order = await this.loadVisible(user, id);
    if (!this.canActAsRequester(user, order)) {
      throw new ForbiddenException('Você não pode cancelar esta ordem');
    }
    const actor = this.actorOf(user);
    const cancellable: ServiceOrderStatus[] =
      actor === 'ADMIN' || actor === 'MANTENEDORA'
        ? ACTIVE_STATUSES
        : [ServiceOrderStatus.ABERTA, ServiceOrderStatus.ACEITA];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException('Nesta etapa a ordem não pode mais ser cancelada');
    }
    await this.transition(
      id,
      cancellable,
      { closedAt: new Date() },
      { authorId: user.sub, type: 'CANCELADA', from: order.status, to: ServiceOrderStatus.CANCELADA, message: dto.reason },
    );
    return this.get(user, id);
  }

  async comment(user: JwtPayload, id: string, dto: CommentServiceOrderDto) {
    const order = await this.loadVisible(user, id);
    await this.prisma.$transaction((tx) =>
      this.log(tx, id, user.sub, 'COMENTARIO', order.status, order.status, dto.message),
    );
    return this.get(user, id);
  }

  // ─── Anexos (fotos) ───────────────────────────────────────────

  async addAttachment(user: JwtPayload, id: string, file: Express.Multer.File) {
    const order = await this.loadVisible(user, id);
    if (order.status === ServiceOrderStatus.CANCELADA || order.status === ServiceOrderStatus.ENCERRADA) {
      throw new BadRequestException('Ordem encerrada: não é possível anexar arquivos');
    }
    const ext = ALLOWED_MIME[file.mimetype];
    if (!ext) throw new BadRequestException('Envie uma foto (JPG, PNG, WEBP) ou PDF');
    if (order.attachments.length >= MAX_ATTACHMENTS_PER_ORDER) {
      throw new BadRequestException(`Limite de ${MAX_ATTACHMENTS_PER_ORDER} anexos por ordem`);
    }
    const actor = this.actorOf(user);
    const kind = actor === 'MANUTENCAO' ? 'EXECUCAO' : 'SOLICITACAO';

    // Nome gerado pelo servidor: nunca usa o nome enviado pelo cliente no caminho.
    const relDir = path.posix.join('service-orders', order.id);
    const fileName = `${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
    const root = path.resolve(process.env.UPLOADS_DIR ?? 'uploads');
    const absDir = path.join(root, relDir);
    await fs.mkdir(absDir, { recursive: true });
    await fs.writeFile(path.join(absDir, fileName), file.buffer);

    const saved = await this.prisma.serviceOrderAttachment.create({
      data: {
        orderId: order.id,
        kind,
        originalName: (file.originalname ?? 'arquivo').slice(0, 255),
        path: path.posix.join(relDir, fileName),
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedById: user.sub,
      },
    });
    return { ...saved, url: `/uploads/${saved.path}` };
  }
}
