import { Test, TestingModule } from '@nestjs/testing';
import { DiaryEventService } from './diary-event.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { BadRequestException } from '@nestjs/common';
import { DiaryEventType, PlanningStatus, RoleLevel } from '@prisma/client';

describe('DiaryEventService - Ocorrências', () => {
  let service: DiaryEventService;

  const mockPrismaService = {
    unit: { findUnique: jest.fn().mockResolvedValue({ nonSchoolDays: [] }) },
    child: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'child-1',
        dateOfBirth: new Date('2020-01-01'),
        enrollments: [{ status: 'ATIVA' }],
      }),
    },
    classroom: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'class-1',
        ageGroupMin: 0,
        ageGroupMax: 100,
        unit: { mantenedoraId: 'mant-1' },
        unitId: 'unit-1',
      }),
    },
    planning: { findUnique: jest.fn() },
    curriculumMatrixEntry: { findUnique: jest.fn() },
    diaryEvent: { create: jest.fn().mockResolvedValue({ id: 'event-1' }) },
    classroomTeacher: { findFirst: jest.fn().mockResolvedValue({ id: 'ct-1' }) },
    enrollment: { findFirst: jest.fn().mockResolvedValue({ classroomId: 'class-1' }) },
  };

  const mockAuditService = { logCreate: jest.fn() };
  const mockUser = {
    sub: 'user-1',
    mantenedoraId: 'mant-1',
    roles: [{ level: RoleLevel.DEVELOPER }],
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiaryEventService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();
    service = module.get<DiaryEventService>(DiaryEventService);
    jest.clearAllMocks();
    // Restaurar mocks padrão após clearAllMocks
    mockPrismaService.unit.findUnique.mockResolvedValue({ nonSchoolDays: [] });
    mockPrismaService.child.findUnique.mockResolvedValue({
      id: 'child-1',
      dateOfBirth: new Date('2020-01-01'),
      enrollments: [{ status: 'ATIVA' }],
    });
    mockPrismaService.classroom.findUnique.mockResolvedValue({
      id: 'class-1',
      ageGroupMin: 0,
      ageGroupMax: 100,
      unit: { mantenedoraId: 'mant-1' },
      unitId: 'unit-1',
    });
    mockPrismaService.diaryEvent.create.mockResolvedValue({ id: 'event-1' });
    mockPrismaService.classroomTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
    mockPrismaService.enrollment.findFirst.mockResolvedValue({ classroomId: 'class-1' });
  });

  // FIX P0: O backend atual NÃO exige planningId para ocorrências.
  // O teste antigo que exigia foi removido pois contradiz o comportamento atual do serviço.
  // Ocorrências são independentes de planejamento — professor pode registrar sem planejamento ativo.

  it('deve criar ocorrência sem planningId (planejamento é opcional para ocorrências)', async () => {
    const dto = {
      type: DiaryEventType.COMPORTAMENTO,
      title: 'Ocorrência de Teste',
      description: 'Teste de comportamento',
      eventDate: new Date().toISOString(),
      childId: 'child-1',
      classroomId: 'class-1',
      tags: ['ocorrencia'],
    };

    // Não deve lançar exceção — planning é opcional
    const result = await service.create(dto as any, mockUser);
    expect(result).toBeDefined();
    expect(result.id).toBe('event-1');
    // Confirma que NÃO buscou planning (não foi fornecido planningId)
    expect(mockPrismaService.planning.findUnique).not.toHaveBeenCalled();
  });

  it('deve criar ocorrência com planningId válido em status EM_EXECUCAO', async () => {
    // CUID válido para passar a sanitização CUID_RE
    const validPlanningId = 'clxxxxxxxxxxxxxxxxxxxxxxxx';
    mockPrismaService.planning.findUnique.mockResolvedValue({
      id: validPlanningId,
      status: PlanningStatus.EM_EXECUCAO,
      classroomId: 'class-1',
      startDate: new Date('2020-01-01'),
      endDate: new Date('2099-12-31'),
      curriculumMatrix: null,
    });

    const dto = {
      type: DiaryEventType.COMPORTAMENTO,
      title: 'Ocorrência com Planejamento',
      description: 'Teste',
      eventDate: new Date().toISOString(),
      childId: 'child-1',
      classroomId: 'class-1',
      tags: ['ocorrencia'],
      planningId: validPlanningId,
    };

    const result = await service.create(dto as any, mockUser);
    expect(result).toBeDefined();
  });

  it('deve bloquear ocorrência se planning fornecido estiver CANCELADO', async () => {
    const validPlanningId = 'clxxxxxxxxxxxxxxxxxxxxxxxx';
    mockPrismaService.planning.findUnique.mockResolvedValue({
      id: validPlanningId,
      status: PlanningStatus.CANCELADO,
      classroomId: 'class-1',
      startDate: new Date('2020-01-01'),
      endDate: new Date('2099-12-31'),
      curriculumMatrix: null,
    });

    const dto = {
      type: DiaryEventType.COMPORTAMENTO,
      title: 'Ocorrência com Planejamento Cancelado',
      description: 'Teste',
      eventDate: new Date().toISOString(),
      childId: 'child-1',
      classroomId: 'class-1',
      tags: ['ocorrencia'],
      planningId: validPlanningId,
    };

    await expect(service.create(dto as any, mockUser)).rejects.toThrow(BadRequestException);
    await expect(service.create(dto as any, mockUser)).rejects.toThrow(/cancelado/i);
  });
});
