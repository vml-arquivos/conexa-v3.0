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
    child: { findUnique: jest.fn().mockResolvedValue({ id: 'child-1', dateOfBirth: new Date('2020-01-01'), enrollments: [{ status: 'ATIVA' }] }) },
    classroom: { findUnique: jest.fn().mockResolvedValue({ id: 'class-1', ageGroupMin: 0, ageGroupMax: 100, unit: { mantenedoraId: 'mant-1' }, unitId: 'unit-1' }) },
    planning: { findUnique: jest.fn() },
    curriculumMatrixEntry: { findUnique: jest.fn() },
    diaryEvent: { create: jest.fn().mockResolvedValue({ id: 'event-1' }) },
    classroomTeacher: { findFirst: jest.fn().mockResolvedValue({ id: 'ct-1' }) }
  };
  
  const mockAuditService = { logCreate: jest.fn() };
  const mockUser = { sub: 'user-1', roles: [{ level: RoleLevel.DEVELOPER }] } as any;

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
  });

  it('deve bloquear criação de ocorrência sem planningId e curriculumEntryId', async () => {
    const dto = {
      type: DiaryEventType.COMPORTAMENTO,
      title: 'Ocorrência de Teste',
      description: 'Teste',
      eventDate: new Date().toISOString(),
      childId: 'child-1',
      classroomId: 'class-1',
      tags: ['ocorrencia']
    };
    
    await expect(service.create(dto as any, mockUser)).rejects.toThrow(BadRequestException);
    await expect(service.create(dto as any, mockUser)).rejects.toThrow(/vínculo obrigatório com um Planejamento ativo/);
  });

  it('deve bloquear criação de ocorrência se planning não estiver EM_EXECUCAO', async () => {
    mockPrismaService.planning.findUnique.mockResolvedValue({ status: PlanningStatus.RASCUNHO });
    
    const dto = {
      type: DiaryEventType.COMPORTAMENTO,
      title: 'Ocorrência de Teste',
      description: 'Teste',
      eventDate: new Date().toISOString(),
      childId: 'child-1',
      classroomId: 'class-1',
      tags: ['ocorrencia'],
      planningId: 'plan-1',
      curriculumEntryId: 'entry-1'
    };
    
    await expect(service.create(dto as any, mockUser)).rejects.toThrow(BadRequestException);
    await expect(service.create(dto as any, mockUser)).rejects.toThrow(/status EM_EXECUCAO/);
  });
});
