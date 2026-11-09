import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleLevel, ServiceOrderStatus } from '@prisma/client';
import { ServiceOrdersService } from './service-orders.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

const mk = (level: RoleLevel, sub: string, unitId?: string): JwtPayload => ({
  sub,
  email: `${sub}@t.com`,
  mantenedoraId: 'm1',
  unitId,
  roles: [{ roleId: 'r', level, type: 'PROFESSOR' as any, unitScopes: [] }],
});

const prof = mk(RoleLevel.PROFESSOR, 'prof1', 'u1');
const coord = mk(RoleLevel.UNIDADE, 'coord1', 'u1');
const outraUnidade = mk(RoleLevel.UNIDADE, 'coord2', 'u2');
const manut = mk(RoleLevel.MANUTENCAO, 'man1');
const manut2 = mk(RoleLevel.MANUTENCAO, 'man2');
const mant = mk(RoleLevel.MANTENEDORA, 'admin1');

function build(order: any) {
  const tx: any = {
    serviceOrder: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn(), create: jest.fn() },
    serviceOrderEvent: { create: jest.fn() },
  };
  const prisma: any = {
    serviceOrder: {
      findFirst: jest.fn().mockImplementation(({ where }: any) => {
        // respeita o filtro de visibilidade montado pelo serviço
        const and = where.AND ?? [];
        const vis = and[1] ?? {};
        if (vis.id === '__none__') return null;
        if (vis.unitId?.in && !vis.unitId.in.includes(order.unitId)) return null;
        if (vis.requestedById && vis.requestedById !== order.requestedById) return null;
        return order ? { ...order, events: [], attachments: [], unit: { id: order.unitId, name: 'U', code: 'U' } } : null;
      }),
      count: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    user: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue({ id: 'x' }) },
    unit: { findFirst: jest.fn().mockResolvedValue({ id: 'u1' }) },
    serviceOrderAttachment: { create: jest.fn() },
    $transaction: jest.fn().mockImplementation(async (fn: any) => fn(tx)),
  };
  return { svc: new ServiceOrdersService(prisma), prisma, tx };
}

const base = (over: Partial<any> = {}) => ({
  id: 'o1',
  mantenedoraId: 'm1',
  unitId: 'u1',
  requestedById: 'prof1',
  assignedToId: null,
  evaluatedById: null,
  status: ServiceOrderStatus.ABERTA,
  startedAt: null,
  dueDate: null,
  ...over,
});
const future = () => new Date(Date.now() + 3 * 864e5).toISOString();

describe('ServiceOrdersService — visibilidade', () => {
  it('professor não vê ordem aberta por outra pessoa', async () => {
    const { svc } = build(base({ requestedById: 'outro' }));
    await expect(svc.get(prof, 'o1')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('unidade não vê ordem de outra unidade', async () => {
    const { svc } = build(base());
    await expect(svc.get(outraUnidade, 'o1')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('coordenação da unidade vê ordens da própria unidade', async () => {
    const { svc, prisma } = build(base());
    prisma.serviceOrder.findFirst.mockResolvedValueOnce({ ...base(), events: [], attachments: [], unit: {} });
    await expect(svc.get(coord, 'o1')).resolves.toBeTruthy();
  });
  it('lista do professor é filtrada pelo próprio autor e unidade', async () => {
    const { svc, prisma } = build(base());
    prisma.serviceOrder.count.mockResolvedValue(0);
    await svc.list(prof, {});
    const where = prisma.serviceOrder.count.mock.calls[0][0].where.AND[0];
    expect(where).toMatchObject({ mantenedoraId: 'm1', unitId: { in: ['u1'] }, requestedById: 'prof1' });
  });
  it('manutenção enxerga todas as unidades da mantenedora', async () => {
    const { svc, prisma } = build(base());
    prisma.serviceOrder.count.mockResolvedValue(0);
    await svc.list(manut, {});
    expect(prisma.serviceOrder.count.mock.calls[0][0].where.AND[0]).toEqual({ mantenedoraId: 'm1' });
  });
});

describe('ServiceOrdersService — criação', () => {
  it('manutenção não abre ordem', async () => {
    const { svc } = build(base());
    await expect(svc.create(manut, { title: 'abc', description: 'abcde', location: 'xx' })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('unidade não abre ordem para outra unidade', async () => {
    const { svc } = build(base());
    await expect(
      svc.create(coord, { title: 'abc', description: 'abcde', location: 'xx', unitId: 'u9' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('mantenedora precisa informar a unidade', async () => {
    const { svc } = build(base());
    await expect(svc.create(mant, { title: 'abc', description: 'abcde', location: 'xx' })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ServiceOrdersService — fluxo', () => {
  it('aceitar exige prazo válido e atribui ao próprio executor', async () => {
    const { svc, tx } = build(base());
    await svc.accept(manut, 'o1', { dueDate: future() });
    const data = tx.serviceOrder.updateMany.mock.calls[0][0].data;
    expect(data).toMatchObject({ status: ServiceOrderStatus.ACEITA, assignedToId: 'man1' });
    expect(tx.serviceOrderEvent.create).toHaveBeenCalled();
  });
  it('prazo no passado é recusado', async () => {
    const { svc } = build(base());
    await expect(svc.accept(manut, 'o1', { dueDate: '2020-01-01T00:00:00Z' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('outro membro da manutenção não conclui ordem atribuída a colega', async () => {
    const { svc } = build(base({ status: ServiceOrderStatus.EM_EXECUCAO, assignedToId: 'man1' }));
    await expect(svc.complete(manut2, 'o1', { report: 'feito tudo certo', result: 'EXECUTADO' as any })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('responsável conclui e a ordem vai para avaliação', async () => {
    const { svc, tx } = build(base({ status: ServiceOrderStatus.EM_EXECUCAO, assignedToId: 'man1' }));
    await svc.complete(manut, 'o1', { report: 'troca da lâmpada feita', result: 'EXECUTADO' as any });
    expect(tx.serviceOrder.updateMany.mock.calls[0][0].data.status).toBe(ServiceOrderStatus.AGUARDANDO_AVALIACAO);
  });
  it('avaliação negativa exige justificativa', async () => {
    const { svc } = build(base({ status: ServiceOrderStatus.AGUARDANDO_AVALIACAO }));
    await expect(svc.evaluate(prof, 'o1', { result: 'NAO_EXECUTADO' as any })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('avaliação positiva encerra; negativa com reabertura devolve à manutenção', async () => {
    let r = build(base({ status: ServiceOrderStatus.AGUARDANDO_AVALIACAO }));
    await r.svc.evaluate(prof, 'o1', { result: 'EXECUTADO' as any });
    expect(r.tx.serviceOrder.updateMany.mock.calls[0][0].data.status).toBe(ServiceOrderStatus.ENCERRADA);
    r = build(base({ status: ServiceOrderStatus.AGUARDANDO_AVALIACAO }));
    await r.svc.evaluate(prof, 'o1', { result: 'PARCIAL' as any, notes: 'faltou pintar', reopen: true });
    expect(r.tx.serviceOrder.updateMany.mock.calls[0][0].data.status).toBe(ServiceOrderStatus.ACEITA);
  });
  it('transição concorrente (status já mudou) é bloqueada', async () => {
    const { svc, tx } = build(base());
    tx.serviceOrder.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.accept(manut, 'o1', { dueDate: future() })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('professor só cancela ordem ainda aberta/aceita', async () => {
    const { svc } = build(base({ status: ServiceOrderStatus.EM_EXECUCAO }));
    await expect(svc.cancel(prof, 'o1', { reason: 'não precisa' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
