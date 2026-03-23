import { Test, TestingModule } from '@nestjs/testing';
import { MaterialRequestService } from './material-request.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { BadRequestException } from '@nestjs/common';
import { RoleLevel } from '@prisma/client';

/**
 * FIX P0 — Consumo de Materiais
 *
 * Testes cobrindo:
 * 1. Filtro por status aplicado na query
 * 2. Filtro por type/categoria aplicado na query
 * 3. Consistência entre KPI e agregações (regra unificada normalizarReq)
 * 4. Proteção contra NaN/null (items com unitPrice/quantity ausentes)
 * 5. Retorno controlado em filtro inválido (400, nunca 500)
 */

// ─── Dados mock base ──────────────────────────────────────────────────────────

const makeReq = (overrides: Record<string, unknown> = {}) => ({
  id: 'req-001',
  code: 'REQ-001',
  title: 'Teste',
  type: 'PEDAGOGICO',
  status: 'APROVADO',
  priority: 'NORMAL',
  quantity: 5,
  estimatedCost: 100,
  requestedDate: new Date('2026-03-01'),
  approvedDate: null,
  classroomId: null,
  classroom: null,
  unitId: 'unit-001',
  unit: { id: 'unit-001', name: 'Escola Teste' },
  createdBy: 'prof-001',
  createdByUser: { id: 'prof-001', firstName: 'Ana', lastName: 'Silva', email: 'ana@escola.com' },
  items: [],
  ...overrides,
});

describe('MaterialRequestService — relatorioConsumo() — FIX P0', () => {
  let service: MaterialRequestService;
  let mockFindMany: jest.Mock;

  const mockPrismaService = {
    materialRequest: {
      findMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };

  const mockAuditService = { log: jest.fn(), logCreate: jest.fn(), logUpdate: jest.fn() };

  const userUnidade = {
    sub: 'coord-001',
    email: 'coord@escola.com',
    mantenedoraId: 'mant-001',
    unitId: 'unit-001',
    roles: [{ level: RoleLevel.UNIDADE, type: 'UNIDADE_COORDENADOR_PEDAGOGICO', unitScopes: [] }],
  } as any;

  const userCentral = {
    sub: 'staff-001',
    email: 'staff@central.com',
    mantenedoraId: 'mant-001',
    unitId: undefined,
    roles: [{ level: RoleLevel.MANTENEDORA, type: 'MANTENEDORA', unitScopes: [] }],
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialRequestService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<MaterialRequestService>(MaterialRequestService);
    mockFindMany = mockPrismaService.materialRequest.findMany;
    jest.clearAllMocks();
    // Default: retorna lista vazia
    mockFindMany.mockResolvedValue([]);
  });

  // ─── 1. Filtro por status ──────────────────────────────────────────────────

  describe('Filtro 1: status', () => {
    it('deve passar status na query Prisma quando fornecido', async () => {
      await service.relatorioConsumo(userUnidade, { status: 'APROVADO' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'APROVADO' }),
        }),
      );
    });

    it('deve passar status em maiúsculas mesmo que enviado em minúsculas', async () => {
      await service.relatorioConsumo(userUnidade, { status: 'aprovado' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'APROVADO' }),
        }),
      );
    });

    it('NÃO deve incluir status no where quando não fornecido', async () => {
      await service.relatorioConsumo(userUnidade, {});

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs.where.status).toBeUndefined();
    });
  });

  // ─── 2. Filtro por type/categoria ─────────────────────────────────────────

  describe('Filtro 2: type/categoria', () => {
    it('deve passar type na query Prisma quando fornecido', async () => {
      await service.relatorioConsumo(userUnidade, { type: 'PEDAGOGICO' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'PEDAGOGICO' }),
        }),
      );
    });

    it('deve normalizar type para maiúsculas', async () => {
      await service.relatorioConsumo(userUnidade, { type: 'higiene' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'HIGIENE' }),
        }),
      );
    });

    it('NÃO deve incluir type no where quando não fornecido', async () => {
      await service.relatorioConsumo(userUnidade, {});

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs.where.type).toBeUndefined();
    });
  });

  // ─── 3. Consistência KPI ↔ agregações (regra normalizarReq unificada) ─────

  describe('Consistência 3: KPI = porCategoria = serieMensal = tabela', () => {
    it('KPI custoEstimadoTotal deve ser igual à soma de porCategoria.custo (sem items)', async () => {
      mockFindMany.mockResolvedValue([
        makeReq({ type: 'PEDAGOGICO', estimatedCost: 100, quantity: 2, items: [] }),
        makeReq({ id: 'req-002', type: 'HIGIENE', estimatedCost: 50, quantity: 1, items: [] }),
      ]);

      const r = await service.relatorioConsumo(userUnidade, {});

      const somaPorCategoria = Object.values(r.porCategoria).reduce((s, c) => s + (c as any).custo, 0);
      expect(r.custoEstimadoTotal).toBe(150);
      expect(Math.round(somaPorCategoria * 100) / 100).toBe(r.custoEstimadoTotal);
    });

    it('KPI custoEstimadoTotal usa estimatedCost (items não incluídos na query de relatório)', async () => {
      mockFindMany.mockResolvedValue([
        makeReq({
          estimatedCost: 150, // campo direto usado pelo relatório
          quantity: 3,
          items: [], // items não são incluídos na query de relatório
        }),
      ]);

      const r = await service.relatorioConsumo(userUnidade, {});

      // Relatório usa estimatedCost (campo direto do MaterialRequest)
      expect(r.custoEstimadoTotal).toBe(150);
    });

    it('tabela detalhes.quantidade usa campo direto quantity do MaterialRequest', async () => {
      mockFindMany.mockResolvedValue([
        makeReq({
          quantity: 5, // campo direto usado pelo relatório
          items: [], // items não são incluídos na query de relatório
        }),
      ]);

      const r = await service.relatorioConsumo(userUnidade, {});

      // Tabela usa quantity (campo direto do MaterialRequest)
      expect(r.detalhes[0].quantidade).toBe(5);
    });

    it('tabela detalhes.custoEstimado usa campo direto estimatedCost do MaterialRequest', async () => {
      mockFindMany.mockResolvedValue([
        makeReq({
          estimatedCost: 70, // campo direto usado pelo relatório
          items: [], // items não são incluídos na query de relatório
        }),
      ]);

      const r = await service.relatorioConsumo(userUnidade, {});

      // Tabela usa estimatedCost (campo direto do MaterialRequest)
      expect(r.detalhes[0].custoEstimado).toBe(70);
    });

    it('KPI total deve ser igual a detalhes.length', async () => {
      mockFindMany.mockResolvedValue([
        makeReq({ id: 'req-001' }),
        makeReq({ id: 'req-002', status: 'SOLICITADO' }),
        makeReq({ id: 'req-003', status: 'REJEITADO' }),
      ]);

      const r = await service.relatorioConsumo(userUnidade, {});

      expect(r.total).toBe(3);
      expect(r.detalhes).toHaveLength(3);
    });
  });

  // ─── 4. Proteção contra NaN/null ──────────────────────────────────────────

  describe('Proteção 4: NaN/null em items', () => {
    it('deve tratar quantity=null como 0 (não NaN) usando campo direto', async () => {
      mockFindMany.mockResolvedValue([
        makeReq({
          quantity: null, // campo direto null
          estimatedCost: null, // campo direto null
          items: [],
        }),
      ]);

      const r = await service.relatorioConsumo(userUnidade, {});

      expect(r.custoEstimadoTotal).toBe(0); // null tratado como 0
      expect(isNaN(r.custoEstimadoTotal)).toBe(false);
      expect(r.detalhes[0].quantidade).toBe(0); // null tratado como 0
    });

    it('deve tratar estimatedCost=null como 0 quando sem items', async () => {
      mockFindMany.mockResolvedValue([
        makeReq({ estimatedCost: null, quantity: 3, items: [] }),
      ]);

      const r = await service.relatorioConsumo(userUnidade, {});

      expect(r.custoEstimadoTotal).toBe(0);
      expect(isNaN(r.custoEstimadoTotal)).toBe(false);
    });

    it('deve tratar quantity=null como 0 quando sem items', async () => {
      mockFindMany.mockResolvedValue([
        makeReq({ quantity: null, estimatedCost: 100, items: [] }),
      ]);

      const r = await service.relatorioConsumo(userUnidade, {});

      expect(r.detalhes[0].quantidade).toBe(0);
      expect(isNaN(r.detalhes[0].quantidade)).toBe(false);
    });

    it('deve retornar custoEstimadoTotal=0 quando lista vazia', async () => {
      mockFindMany.mockResolvedValue([]);

      const r = await service.relatorioConsumo(userUnidade, {});

      expect(r.custoEstimadoTotal).toBe(0);
      expect(r.total).toBe(0);
      expect(r.detalhes).toHaveLength(0);
    });
  });

  // ─── 5. Retorno controlado em filtro inválido (400, nunca 500) ────────────

  describe('Filtro inválido 5: 400 controlado', () => {
    it('deve retornar BadRequestException 400 para status inválido', async () => {
      await expect(
        service.relatorioConsumo(userUnidade, { status: 'INVALIDO' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.relatorioConsumo(userUnidade, { status: 'INVALIDO' }),
      ).rejects.toThrow(/Status inv\u00e1lido/i);
    });

    it('NÃO deve chamar Prisma quando status é inválido', async () => {
      try {
        await service.relatorioConsumo(userUnidade, { status: 'XPTO' });
      } catch {
        // esperado
      }
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it('deve retornar BadRequestException 400 para type inválido', async () => {
      await expect(
        service.relatorioConsumo(userUnidade, { type: 'INVALIDO' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('NÃO deve chamar Prisma quando type é inválido', async () => {
      try {
        await service.relatorioConsumo(userUnidade, { type: 'XPTO' });
      } catch {
        // esperado
      }
      expect(mockFindMany).not.toHaveBeenCalled();
    });
  });

  // ─── 6. RBAC ──────────────────────────────────────────────────────────────

  describe('RBAC 6: isolamento por mantenedoraId + unitId', () => {
    it('deve sempre incluir mantenedoraId no where', async () => {
      await service.relatorioConsumo(userUnidade, {});

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ mantenedoraId: 'mant-001' }),
        }),
      );
    });

    it('UNIDADE deve sempre filtrar por unitId do token', async () => {
      await service.relatorioConsumo(userUnidade, {});

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ unitId: 'unit-001' }),
        }),
      );
    });

    it('MANTENEDORA pode filtrar por unitId do query param', async () => {
      await service.relatorioConsumo(userCentral, { unitId: 'unit-999' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ unitId: 'unit-999' }),
        }),
      );
    });

    it('MANTENEDORA sem unitId no query param não deve ter filtro de unitId (acesso global)', async () => {
      await service.relatorioConsumo(userCentral, {});

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs.where.unitId).toBeUndefined();
    });
  });

  // ─── 7. Formato de resposta flat (compatibilidade com frontend) ───────────

  describe('Formato 7: resposta flat (compatibilidade frontend)', () => {
    it('deve retornar campos flat: total, aprovados, pendentes, rejeitados, entregues', async () => {
      mockFindMany.mockResolvedValue([
        makeReq({ status: 'APROVADO' }),
        makeReq({ id: 'req-002', status: 'ENTREGUE' }),
        makeReq({ id: 'req-003', status: 'SOLICITADO' }),
        makeReq({ id: 'req-004', status: 'REJEITADO' }),
      ]);

      const r = await service.relatorioConsumo(userUnidade, {});

      expect(r.total).toBe(4);
      expect(r.aprovados).toBe(2); // APROVADO + ENTREGUE
      expect(r.pendentes).toBe(1); // SOLICITADO
      expect(r.rejeitados).toBe(1);
      expect(r.entregues).toBe(1);
      expect(r).not.toHaveProperty('totais'); // Não deve ter objeto aninhado
    });

    it('deve incluir filtros aplicados no retorno', async () => {
      const r = await service.relatorioConsumo(userUnidade, { status: 'APROVADO', type: 'PEDAGOGICO' });

      expect(r.filtros).toEqual({ status: 'APROVADO', type: 'PEDAGOGICO' });
    });
  });
});
