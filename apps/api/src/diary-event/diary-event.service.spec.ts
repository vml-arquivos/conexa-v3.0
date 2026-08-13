import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DiaryEventService } from './diary-event.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
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
    diaryEvent: {
      create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
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
    mockPrismaService.diaryEvent.findUnique.mockResolvedValue({
      id: 'event-1',
      classroomId: 'class-1',
      unitId: 'unit-1',
      mantenedoraId: 'mant-1',
      mediaUrls: ['data:image/png;base64,old'],
      createdBy: 'user-1',
      classroom: {
        id: 'class-1',
        unitId: 'unit-1',
        unit: { id: 'unit-1', mantenedoraId: 'mant-1' },
      },
    });
    mockPrismaService.diaryEvent.findFirst.mockResolvedValue({
      id: 'event-1',
      classroomId: 'class-1',
      unitId: 'unit-1',
      mantenedoraId: 'mant-1',
      createdBy: 'user-1',
      eventDate: new Date('2026-04-13T12:00:00.000Z'),
      classroom: {
        id: 'class-1',
        unitId: 'unit-1',
      },
    });
    mockPrismaService.diaryEvent.findMany.mockResolvedValue([]);
    mockPrismaService.diaryEvent.update.mockResolvedValue({ id: 'event-1' });
    mockPrismaService.classroomTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
    mockPrismaService.enrollment.findFirst.mockResolvedValue({ classroomId: 'class-1' });
  });

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

    const result = await service.create(dto as any, mockUser);
    expect(result).toBeDefined();
    expect(result.id).toBe('event-1');
    expect(mockPrismaService.planning.findUnique).not.toHaveBeenCalled();
  });

  it('deve criar ocorrência com planningId válido em status EM_EXECUCAO', async () => {
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

  describe('uploadMedia', () => {
    const file = {
      size: 1024,
      mimetype: 'image/png',
      buffer: Buffer.from('img'),
    } as Express.Multer.File;

    it('deve permitir upload para professor da própria turma', async () => {
      const professor = {
        sub: 'teacher-1',
        mantenedoraId: 'mant-1',
        roles: [{ level: RoleLevel.PROFESSOR }],
      } as any;

      mockPrismaService.diaryEvent.findUnique.mockResolvedValue({
        id: 'event-1',
        classroomId: 'class-1',
        unitId: 'unit-1',
        mantenedoraId: 'mant-1',
        mediaUrls: ['data:image/png;base64,old'],
        createdBy: 'other-user',
        classroom: {
          id: 'class-1',
          unitId: 'unit-1',
          unit: { id: 'unit-1', mantenedoraId: 'mant-1' },
        },
      });

      const result = await service.uploadMedia('event-1', file, professor);

      expect(mockPrismaService.classroomTeacher.findFirst).toHaveBeenCalledWith({
        where: {
          classroomId: 'class-1',
          teacherId: 'teacher-1',
          isActive: true,
        },
      });
      expect(mockPrismaService.diaryEvent.update).toHaveBeenCalledTimes(1);
      expect(result.mediaUrls).toHaveLength(2);
    });

    it('deve bloquear upload para professor que não pertence à turma do evento', async () => {
      const professor = {
        sub: 'teacher-2',
        mantenedoraId: 'mant-1',
        roles: [{ level: RoleLevel.PROFESSOR }],
      } as any;

      mockPrismaService.classroomTeacher.findFirst.mockResolvedValue(null);
      mockPrismaService.diaryEvent.findUnique.mockResolvedValue({
        id: 'event-1',
        classroomId: 'class-1',
        unitId: 'unit-1',
        mantenedoraId: 'mant-1',
        mediaUrls: [],
        createdBy: 'teacher-2',
        classroom: {
          id: 'class-1',
          unitId: 'unit-1',
          unit: { id: 'unit-1', mantenedoraId: 'mant-1' },
        },
      });

      await expect(service.uploadMedia('event-1', file, professor)).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.diaryEvent.update).not.toHaveBeenCalled();
    });

    it('deve fazer staff central respeitar unitScopes', async () => {
      const staff = {
        sub: 'staff-1',
        unitId: 'unit-1',
        mantenedoraId: 'mant-1',
        roles: [{ level: RoleLevel.STAFF_CENTRAL, unitScopes: ['unit-2'] }],
      } as any;

      await expect(service.uploadMedia('event-1', file, staff)).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.diaryEvent.update).not.toHaveBeenCalled();
    });

    it('deve bloquear upload de mantenedora fora da própria rede', async () => {
      const mantenedora = {
        sub: 'mant-user',
        mantenedoraId: 'mant-2',
        roles: [{ level: RoleLevel.MANTENEDORA }],
      } as any;

      await expect(service.uploadMedia('event-1', file, mantenedora)).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.diaryEvent.update).not.toHaveBeenCalled();
    });

    it('deve lançar not found quando o evento não existir', async () => {
      mockPrismaService.diaryEvent.findUnique.mockResolvedValue(null);

      await expect(service.uploadMedia('event-404', file, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('filtros pedagógicos e update de data', () => {
    it('deve ocultar sábado/domingo em findAll quando pedagogicalOnly=true no fluxo ATIVIDADE_PEDAGOGICA', async () => {
      mockPrismaService.diaryEvent.findMany.mockResolvedValue([
        { id: 'dom-1', eventDate: new Date('2026-04-12T12:00:00.000Z') }, // domingo
        { id: 'seg-1', eventDate: new Date('2026-04-13T12:00:00.000Z') }, // segunda
      ]);

      const result = await service.findAll(
        { type: DiaryEventType.ATIVIDADE_PEDAGOGICA, pedagogicalOnly: 'true' } as any,
        mockUser,
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('seg-1');
    });

    it('não deve filtrar fins de semana quando pedagogicalOnly não é enviado', async () => {
      mockPrismaService.diaryEvent.findMany.mockResolvedValue([
        { id: 'dom-1', eventDate: new Date('2026-04-12T12:00:00.000Z') },
        { id: 'seg-1', eventDate: new Date('2026-04-13T12:00:00.000Z') },
      ]);

      const result = await service.findAll(
        { type: DiaryEventType.ATIVIDADE_PEDAGOGICA } as any,
        mockUser,
      );

      expect(result).toHaveLength(2);
    });

    it('deve bloquear PATCH com eventDate em domingo', async () => {
      await expect(
        service.update(
          'event-1',
          { eventDate: '2026-04-12T12:00:00.000Z' } as any,
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.diaryEvent.update).not.toHaveBeenCalled();
    });
  });
});
