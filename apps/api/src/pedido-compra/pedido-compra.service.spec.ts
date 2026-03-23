/**
 * Testes unitários para PedidoCompraService.listar()
 *
 * FIX P0: Cobrindo os 3 bugs que causavam 500 no GET /pedidos-compra:
 *   Bug 1: UNIDADE sem unitId → Prisma query sem filtro → 500
 *   Bug 2: STAFF_CENTRAL com unitScopes=[] → { in: [] } → comportamento inesperado
 *   Bug 3: Sem try/catch global → qualquer erro de Prisma virava 500 genérico
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PedidoCompraService } from './pedido-compra.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('PedidoCompraService — listar() — FIX P0 (500 → erro controlado)', () => {
  let service: PedidoCompraService;

  const mockPrismaService = {
    pedidoCompra: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    unit: { findFirst: jest.fn() },
    materialRequest: { findMany: jest.fn() },
    itemPedidoCompra: { deleteMany: jest.fn(), createMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  const mockAuditService = { log: jest.fn() };

  // ─── Usuários mock ────────────────────────────────────────────────────────

  const userUnidadeComUnitId: JwtPayload = {
    sub: 'coord-001',
    email: 'coordenadora@escola.com',
    mantenedoraId: 'mant-001',
    unitId: 'unit-001',
    roles: [{ roleId: 'r1', level: RoleLevel.UNIDADE, type: 'UNIDADE_COORDENADOR_PEDAGOGICO' as any, unitScopes: [] }],
  };

  // FIX P0 Bug 1: UNIDADE sem unitId
  const userUnidadeSemUnitId: JwtPayload = {
    sub: 'coord-sem-unidade',
    email: 'sem-unidade@escola.com',
    mantenedoraId: 'mant-001',
    unitId: undefined as any,
    roles: [{ roleId: 'r2', level: RoleLevel.UNIDADE, type: 'UNIDADE_COORDENADOR_PEDAGOGICO' as any, unitScopes: [] }],
  };

  // FIX P0 Bug 2: STAFF_CENTRAL com unitScopes=[]
  const userStaffCentralSemScopes: JwtPayload = {
    sub: 'staff-001',
    email: 'staff@central.com',
    mantenedoraId: 'mant-001',
    unitId: undefined as any,
    roles: [{ roleId: 'r3', level: RoleLevel.STAFF_CENTRAL, type: 'STAFF_CENTRAL' as any, unitScopes: [] }],
  };

  // STAFF_CENTRAL com unitScopes preenchidos
  const userStaffCentralComScopes: JwtPayload = {
    sub: 'staff-002',
    email: 'staff2@central.com',
    mantenedoraId: 'mant-001',
    unitId: undefined as any,
    roles: [{ roleId: 'r4', level: RoleLevel.STAFF_CENTRAL, type: 'STAFF_CENTRAL' as any, unitScopes: ['unit-001', 'unit-002'] }],
  };

  const userMantenedora: JwtPayload = {
    sub: 'mant-001',
    email: 'mantenedora@rede.com',
    mantenedoraId: 'mant-001',
    unitId: undefined as any,
    roles: [{ roleId: 'r5', level: RoleLevel.MANTENEDORA, type: 'MANTENEDORA' as any, unitScopes: [] }],
  };

  const userProfessor: JwtPayload = {
    sub: 'prof-001',
    email: 'professor@escola.com',
    mantenedoraId: 'mant-001',
    unitId: 'unit-001',
    roles: [{ roleId: 'r6', level: RoleLevel.PROFESSOR, type: 'PROFESSOR' as any, unitScopes: [] }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PedidoCompraService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<PedidoCompraService>(PedidoCompraService);
    jest.clearAllMocks();
    // Restaurar mock padrão: retorna lista vazia
    mockPrismaService.pedidoCompra.findMany.mockResolvedValue([]);
  });

  // ─── Bug 1: UNIDADE sem unitId ────────────────────────────────────────────

  describe('Bug 1: UNIDADE sem unitId', () => {
    it('deve retornar 400 com mensagem clara (não 500) quando UNIDADE não tem unitId', async () => {
      await expect(
        service.listar(userUnidadeSemUnitId, {}),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.listar(userUnidadeSemUnitId, {}),
      ).rejects.toThrow(/não está vinculada a uma unidade/i);
    });

    it('NÃO deve chamar Prisma quando UNIDADE não tem unitId', async () => {
      try {
        await service.listar(userUnidadeSemUnitId, {});
      } catch {
        // esperado
      }
      expect(mockPrismaService.pedidoCompra.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── Bug 2: STAFF_CENTRAL com unitScopes=[] ──────────────────────────────

  describe('Bug 2: STAFF_CENTRAL com unitScopes=[]', () => {
    it('deve retornar [] (acesso global na mantenedora) quando STAFF_CENTRAL tem unitScopes vazio', async () => {
      const result = await service.listar(userStaffCentralSemScopes, {});

      expect(result).toEqual([]);
      // Confirma que findMany foi chamado SEM filtro { in: [] }
      expect(mockPrismaService.pedidoCompra.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            unitId: { in: [] },
          }),
        }),
      );
    });

    it('deve filtrar por unitScopes quando STAFF_CENTRAL tem escopos definidos', async () => {
      await service.listar(userStaffCentralComScopes, {});

      expect(mockPrismaService.pedidoCompra.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            unitId: { in: ['unit-001', 'unit-002'] },
          }),
        }),
      );
    });
  });

  // ─── UNIDADE com unitId válido ────────────────────────────────────────────

  describe('UNIDADE com unitId válido', () => {
    it('deve retornar [] quando não há pedidos (não 500)', async () => {
      const result = await service.listar(userUnidadeComUnitId, {});

      expect(result).toEqual([]);
      expect(mockPrismaService.pedidoCompra.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            mantenedoraId: 'mant-001',
            unitId: 'unit-001',
          }),
        }),
      );
    });

    it('deve retornar lista de pedidos quando existem pedidos', async () => {
      const pedidosMock = [
        {
          id: 'ped-001',
          mesReferencia: '2026-03',
          status: 'RASCUNHO',
          unitId: 'unit-001',
          mantenedoraId: 'mant-001',
          unit: { id: 'unit-001', name: 'Escola Teste' },
          itens: [],
        },
      ];
      mockPrismaService.pedidoCompra.findMany.mockResolvedValue(pedidosMock);

      const result = await service.listar(userUnidadeComUnitId, {});

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ped-001');
    });

    it('deve aplicar filtro de mesReferencia quando fornecido', async () => {
      await service.listar(userUnidadeComUnitId, { mesReferencia: '2026-03' });

      expect(mockPrismaService.pedidoCompra.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            mesReferencia: '2026-03',
          }),
        }),
      );
    });
  });

  // ─── PROFESSOR bloqueado ──────────────────────────────────────────────────

  describe('PROFESSOR bloqueado', () => {
    it('deve retornar ForbiddenException para PROFESSOR', async () => {
      await expect(
        service.listar(userProfessor, {}),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.listar(userProfessor, {}),
      ).rejects.toThrow(/professores não têm acesso/i);
    });
  });

  // ─── MANTENEDORA — acesso global ──────────────────────────────────────────

  describe('MANTENEDORA — acesso global', () => {
    it('deve retornar pedidos de todas as unidades da mantenedora', async () => {
      await service.listar(userMantenedora, {});

      // Não deve ter filtro de unitId (acesso global)
      expect(mockPrismaService.pedidoCompra.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            mantenedoraId: 'mant-001',
          }),
        }),
      );
      const callArgs = mockPrismaService.pedidoCompra.findMany.mock.calls[0][0];
      expect(callArgs.where.unitId).toBeUndefined();
    });
  });

  // ─── Bug 3: try/catch global ──────────────────────────────────────────────

  describe('Bug 3: try/catch global — erros de Prisma não viram 500 genérico', () => {
    it('deve relançar ForbiddenException sem transformar', async () => {
      await expect(
        service.listar(userProfessor, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve relançar BadRequestException sem transformar', async () => {
      await expect(
        service.listar(userUnidadeSemUnitId, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
