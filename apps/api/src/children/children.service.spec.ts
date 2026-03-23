import { Test, TestingModule } from '@nestjs/testing';
import { ChildrenService } from './children.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Testes unitários para ChildrenService.getHealthDashboard
 *
 * Cobertura:
 * 1. Retorna { children: [...], stats: {...} } com formato correto
 * 2. RBAC: query sempre filtra por mantenedoraId + unitId (coordenação A não vê unidade B)
 * 3. Retorna vazio quando unitId não resolvido (sem vazar dados)
 * 4. Filtra por classroomId quando fornecido
 * 5. Stats calculadas corretamente
 */
describe('ChildrenService — getHealthDashboard', () => {
  let service: ChildrenService;

  // ─── Mock Prisma ────────────────────────────────────────────────────────────
  const mockPrisma = {
    child: {
      findMany: jest.fn(),
    },
    classroomTeacher: {
      findFirst: jest.fn(),
    },
    unit: {
      findFirst: jest.fn(),
    },
    // outros métodos não usados neste teste
    dietaryRestriction: { findMany: jest.fn() },
    enrollment: { create: jest.fn() },
  };

  // ─── Usuário coordenação (UNIDADE) ──────────────────────────────────────────
  const mockUserCoord = {
    sub: 'user-coord-1',
    mantenedoraId: 'mant-A',
    unitId: 'unit-A',
    roles: [{ level: 'UNIDADE' }],
  };

  // ─── Usuário de outra unidade ───────────────────────────────────────────────
  const mockUserOutraUnidade = {
    sub: 'user-coord-2',
    mantenedoraId: 'mant-A',
    unitId: 'unit-B',
    roles: [{ level: 'UNIDADE' }],
  };

  // ─── Dados mock de crianças ─────────────────────────────────────────────────
  const mockChildren = [
    {
      id: 'child-1',
      firstName: 'Ana',
      lastName: 'Silva',
      dateOfBirth: new Date('2020-03-15'),
      photoUrl: null,
      bloodType: 'A+',
      allergies: 'Amendoim severo',
      medicalConditions: 'TEA — Laudo 2025',
      medicationNeeds: 'Ritalina 10mg às 8h',
      emergencyContactName: 'Maria Silva',
      emergencyContactPhone: '(61) 99999-0000',
      enrollments: [{ classroom: { id: 'class-1', name: 'MATERNAL I B' } }],
      dietaryRestrictions: [
        {
          id: 'dr-1',
          type: 'ALERGIA',
          name: 'Amendoim',
          description: 'Risco de anafilaxia',
          severity: 'severa',
          allowedFoods: null,
          forbiddenFoods: 'Amendoim, pasta de amendoim',
        },
      ],
    },
    {
      id: 'child-2',
      firstName: 'Pedro',
      lastName: 'Costa',
      dateOfBirth: new Date('2021-07-20'),
      photoUrl: null,
      bloodType: null,
      allergies: null,
      medicalConditions: null,
      medicationNeeds: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      enrollments: [{ classroom: { id: 'class-1', name: 'MATERNAL I B' } }],
      dietaryRestrictions: [
        {
          id: 'dr-2',
          type: 'INTOLERANCIA',
          name: 'Lactose',
          description: null,
          severity: 'moderada',
          allowedFoods: 'Leite sem lactose',
          forbiddenFoods: 'Leite, queijo, iogurte',
        },
      ],
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChildrenService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ChildrenService>(ChildrenService);
    jest.clearAllMocks();
  });

  // ─── Teste 1: Formato da resposta ───────────────────────────────────────────
  it('deve retornar { children: [...], stats: {...} } com formato correto', async () => {
    mockPrisma.child.findMany.mockResolvedValue(mockChildren);

    const result = await service.getHealthDashboard(mockUserCoord);

    expect(result).toHaveProperty('children');
    expect(result).toHaveProperty('stats');
    expect(Array.isArray(result.children)).toBe(true);
    expect(result.stats).toMatchObject({
      total: expect.any(Number),
      comAlergia: expect.any(Number),
      comDieta: expect.any(Number),
      comCondicaoMedica: expect.any(Number),
      comMedicamento: expect.any(Number),
      casosCriticos: expect.any(Number),
    });
  });

  // ─── Teste 2: RBAC — query filtra por mantenedoraId + unitId ────────────────
  it('RBAC: query deve sempre filtrar por mantenedoraId + unitId do usuário', async () => {
    mockPrisma.child.findMany.mockResolvedValue([]);

    await service.getHealthDashboard(mockUserCoord);

    expect(mockPrisma.child.findMany).toHaveBeenCalledTimes(1);
    const callArgs = mockPrisma.child.findMany.mock.calls[0][0];

    // Garante que mantenedoraId e unitId estão no where
    expect(callArgs.where).toMatchObject({
      mantenedoraId: 'mant-A',
      unitId: 'unit-A',
    });
  });

  // ─── Teste 3: RBAC — coordenação B não vê dados da unidade A ────────────────
  it('RBAC: coordenação de unit-B não deve ver dados de unit-A', async () => {
    mockPrisma.child.findMany.mockResolvedValue([]);

    await service.getHealthDashboard(mockUserOutraUnidade);

    const callArgs = mockPrisma.child.findMany.mock.calls[0][0];

    // Deve filtrar por unit-B, não unit-A
    expect(callArgs.where.unitId).toBe('unit-B');
    expect(callArgs.where.unitId).not.toBe('unit-A');
  });

  // ─── Teste 4: Retorna vazio quando unitId não resolvido ─────────────────────
  it('deve retornar { children: [], stats: zeros } quando unitId não resolvido', async () => {
    const userSemUnidade = {
      sub: 'user-sem-unidade',
      mantenedoraId: 'mant-A',
      unitId: undefined,
      roles: [{ level: 'UNIDADE' }],
    };

    const result = await service.getHealthDashboard(userSemUnidade as any);

    expect(result.children).toEqual([]);
    expect(result.stats.total).toBe(0);
    expect(mockPrisma.child.findMany).not.toHaveBeenCalled();
  });

  // ─── Teste 5: Stats calculadas corretamente ──────────────────────────────────
  it('deve calcular stats corretamente com os dados mock', async () => {
    mockPrisma.child.findMany.mockResolvedValue(mockChildren);

    const result = await service.getHealthDashboard(mockUserCoord);

    // child-1: tem allergies + ALERGIA severa + medicalConditions + medicationNeeds
    // child-2: tem INTOLERANCIA (não é ALERGIA)
    expect(result.stats.total).toBe(2);
    expect(result.stats.comAlergia).toBe(1);   // child-1 tem allergies
    expect(result.stats.comDieta).toBe(1);      // child-2 tem INTOLERANCIA (tipo != ALERGIA)
    expect(result.stats.comCondicaoMedica).toBe(1); // child-1 tem medicalConditions
    expect(result.stats.comMedicamento).toBe(1);    // child-1 tem medicationNeeds
    expect(result.stats.casosCriticos).toBe(1);     // child-1 tem restrição severa
  });

  // ─── Teste 6: Filtro por classroomId ────────────────────────────────────────
  it('deve incluir filtro por classroomId no enrollment quando fornecido', async () => {
    mockPrisma.child.findMany.mockResolvedValue([]);

    await service.getHealthDashboard(mockUserCoord, undefined, 'class-1');

    const callArgs = mockPrisma.child.findMany.mock.calls[0][0];

    // Deve incluir filtro de turma no where
    expect(callArgs.where).toMatchObject({
      enrollments: { some: { classroomId: 'class-1', status: 'ATIVA' } },
    });
  });

  // ─── Teste 7: unitId do query param sobrepõe o do token ─────────────────────
  it('deve usar unitId do query param quando fornecido', async () => {
    mockPrisma.child.findMany.mockResolvedValue([]);

    // Usuário tem unit-A no token, mas passa unit-C no query param
    await service.getHealthDashboard(mockUserCoord, 'unit-C');

    const callArgs = mockPrisma.child.findMany.mock.calls[0][0];
    expect(callArgs.where.unitId).toBe('unit-C');
  });
});
