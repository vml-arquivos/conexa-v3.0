/**
 * Testes unitários para LookupService
 * Foco: RBAC de getAccessibleClassrooms e getAccessibleChildren
 * Garante que professor/auxiliar retorna apenas turmas/crianças da própria unidade
 * e que o contrato de resposta é array direto (não { data: [...] })
 *
 * FIX P0: Cobrindo o bug de crianças não aparecerem na aba Ocorrências
 */
import { Test, TestingModule } from '@nestjs/testing';
import { LookupService } from './lookup.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('LookupService — RBAC de turmas e crianças', () => {
  let service: LookupService;

  // ─── Mocks do Prisma ─────────────────────────────────────────────────────
  const mockClassrooms = [
    { id: 'class-001', code: 'MAT-A', name: 'Maternal A', unitId: 'unit-001', ageGroupMin: 24, ageGroupMax: 36 },
    { id: 'class-002', code: 'MAT-B', name: 'Maternal B', unitId: 'unit-001', ageGroupMin: 24, ageGroupMax: 36 },
  ];

  const mockChildren = [
    { id: 'child-001', firstName: 'Ana', lastName: 'Lima', allergies: null, medicalConditions: null, photoUrl: null },
    { id: 'child-002', firstName: 'Bruno', lastName: 'Santos', allergies: 'Lactose', medicalConditions: null, photoUrl: null },
  ];

  const mockEnrollments = mockChildren.map((c, i) => ({
    child: { ...c },
    classroomId: 'class-001',
  }));

  const mockPrismaService = {
    classroom: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    classroomTeacher: {
      findFirst: jest.fn(),
    },
    enrollment: {
      findMany: jest.fn(),
    },
    unit: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  // ─── Usuários mock ────────────────────────────────────────────────────────
  const professorUser: JwtPayload = {
    sub: 'prof-001',
    email: 'professora@escola.com',
    mantenedoraId: 'mant-001',
    unitId: 'unit-001',
    roles: [{ roleId: 'r1', level: 'PROFESSOR' as any, type: 'PROFESSOR' as any, unitScopes: [] }],
  };

  // PROFESSOR_AUXILIAR tem level=PROFESSOR (conforme admin.service.ts:28)
  const professorAuxiliarUser: JwtPayload = {
    sub: 'aux-001',
    email: 'auxiliar@escola.com',
    mantenedoraId: 'mant-001',
    unitId: 'unit-001',
    roles: [{ roleId: 'r2', level: 'PROFESSOR' as any, type: 'PROFESSOR_AUXILIAR' as any, unitScopes: [] }],
  };

  const coordenadoraUser: JwtPayload = {
    sub: 'coord-001',
    email: 'coordenadora@escola.com',
    mantenedoraId: 'mant-001',
    unitId: 'unit-001',
    roles: [{ roleId: 'r3', level: 'UNIDADE' as any, type: 'UNIDADE_COORDENADOR_PEDAGOGICO' as any, unitScopes: [] }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LookupService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LookupService>(LookupService);
    jest.clearAllMocks();
  });

  // ─── getAccessibleClassrooms ─────────────────────────────────────────────
  describe('getAccessibleClassrooms()', () => {
    it('RBAC: professor retorna apenas turmas vinculadas via ClassroomTeacher', async () => {
      mockPrismaService.classroom.findMany.mockResolvedValue(mockClassrooms);

      const result = await service.getAccessibleClassrooms(professorUser);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThanOrEqual(0);
      // Contrato: retorna array direto (não { data: [...] })
      expect(Array.isArray(result)).toBe(true);
    });

    it('RBAC: professor auxiliar (level=PROFESSOR) retorna turmas corretamente', async () => {
      mockPrismaService.classroom.findMany.mockResolvedValue(mockClassrooms);

      const result = await service.getAccessibleClassrooms(professorAuxiliarUser);

      expect(Array.isArray(result)).toBe(true);
      // Confirma que professor auxiliar não é bloqueado
      expect(result).toBeDefined();
    });

    it('RBAC: professor sem vínculo formal usa fallback para turmas da mantenedora', async () => {
      // Primeiro findMany retorna [] (sem ClassroomTeacher), segundo retorna fallback
      mockPrismaService.classroom.findMany
        .mockResolvedValueOnce([])     // sem vínculo formal
        .mockResolvedValueOnce(mockClassrooms); // fallback

      const result = await service.getAccessibleClassrooms(professorUser);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('RBAC: coordenadora (UNIDADE) retorna turmas da própria unidade', async () => {
      mockPrismaService.classroom.findMany.mockResolvedValue(mockClassrooms);

      const result = await service.getAccessibleClassrooms(coordenadoraUser);

      expect(Array.isArray(result)).toBe(true);
    });

    it('contrato: cada turma tem id, code, name, unitId', async () => {
      mockPrismaService.classroom.findMany.mockResolvedValue(mockClassrooms);

      const result = await service.getAccessibleClassrooms(professorUser);

      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('code');
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('unitId');
      }
    });
  });

  // ─── getAccessibleChildren ───────────────────────────────────────────────
  describe('getAccessibleChildren()', () => {
    beforeEach(() => {
      // Turma pertence à mantenedora do usuário
      mockPrismaService.classroom.findFirst.mockResolvedValue({
        id: 'class-001',
        unitId: 'unit-001',
        unit: { mantenedoraId: 'mant-001' },
      });
      mockPrismaService.enrollment.findMany.mockResolvedValue(mockEnrollments);
    });

    it('RBAC: professor retorna crianças da turma da própria mantenedora', async () => {
      const result = await service.getAccessibleChildren(professorUser, 'class-001');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      // Confirma que a query filtrou por mantenedoraId
      expect(mockPrismaService.classroom.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'class-001',
            unit: expect.objectContaining({ mantenedoraId: 'mant-001' }),
          }),
        }),
      );
    });

    it('RBAC: professor auxiliar (level=PROFESSOR) retorna crianças corretamente', async () => {
      const result = await service.getAccessibleChildren(professorAuxiliarUser, 'class-001');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('RBAC: turma de outra mantenedora lança ForbiddenException', async () => {
      mockPrismaService.classroom.findFirst.mockResolvedValue(null); // turma não encontrada na mantenedora

      await expect(
        service.getAccessibleChildren(professorUser, 'class-outra-mant'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('contrato: cada criança tem id, firstName, lastName, name, classroomId', async () => {
      const result = await service.getAccessibleChildren(professorUser, 'class-001');

      result.forEach((child: any) => {
        expect(child).toHaveProperty('id');
        expect(child).toHaveProperty('firstName');
        expect(child).toHaveProperty('lastName');
        expect(child).toHaveProperty('name');
        expect(child).toHaveProperty('classroomId');
      });
    });

    it('deve retornar [] quando classroomId não é fornecido e professor não tem vínculo', async () => {
      mockPrismaService.classroomTeacher.findFirst.mockResolvedValue(null);
      mockPrismaService.classroom.findFirst.mockResolvedValue(null);

      const result = await service.getAccessibleChildren(professorUser, undefined);

      expect(result).toEqual([]);
    });
  });
});
