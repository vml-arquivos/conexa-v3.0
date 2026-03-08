import { Test, TestingModule } from '@nestjs/testing';
import { PlanningService } from './planning.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { RoleLevel, RoleType, PlanningStatus } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

// --- Helpers para criar payloads de usuário de teste ---

function makeProfessor(id = 'professor-1'): JwtPayload {
  return {
    sub: id,
    email: `${id}@test.com`,
    mantenedoraId: 'mant-1',
    unitId: 'unit-1',
    roles: [{ roleId: 'role-1', level: RoleLevel.PROFESSOR, type: RoleType.PROFESSOR, unitScopes: [] }],
  };
}

function makeCoordenador(id = 'coord-1'): JwtPayload {
  return {
    sub: id,
    email: `${id}@test.com`,
    mantenedoraId: 'mant-1',
    unitId: 'unit-1',
    roles: [{ roleId: 'role-2', level: RoleLevel.UNIDADE, type: RoleType.UNIDADE_COORDENADOR_PEDAGOGICO, unitScopes: [] }],
  };
}

// --- Mocks ---

const mockPlanningBase = {
  id: 'planning-1',
  mantenedoraId: 'mant-1',
  unitId: 'unit-1',
  classroomId: 'class-1',
  createdBy: 'professor-1',
  title: 'Planejamento de Teste',
  status: PlanningStatus.RASCUNHO,
  pedagogicalContent: {
    exemploAtividade: 'Exemplo secreto da coordenação',
    objetivoBNCC: 'Objetivo BNCC',
    intencionalidade: 'Intencionalidade pedagógica',
  },
  submittedAt: null,
  reviewedAt: null,
  reviewedBy: null,
  reviewComment: null,
};

const mockPrismaService = {
  planning: {
    findFirst: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  classroomTeacher: {
    findFirst: jest.fn(),
  },
};

const mockAuditService = {
  log: jest.fn().mockResolvedValue(undefined),
  logCreate: jest.fn().mockResolvedValue(undefined),
  logUpdate: jest.fn().mockResolvedValue(undefined),
};

// --- Suite de Testes ---

describe('PlanningService — Fluxo de Revisão e Mascaramento', () => {
  let service: PlanningService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanningService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<PlanningService>(PlanningService);
  });

  // ─── Testes de Mascaramento ───────────────────────────────────────────────

  describe('maskMatrizEntryForProfessor', () => {
    it('deve remover exemploAtividade do pedagogicalContent para PROFESSOR', async () => {
      const professor = makeProfessor();

      // Simular o professor sendo professor da turma
      mockPrismaService.classroomTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrismaService.planning.findFirst.mockResolvedValue({ ...mockPlanningBase });

      const result = await service.findOne('planning-1', professor);

      // O campo exemploAtividade deve estar ausente no retorno para o professor
      expect(result.pedagogicalContent).not.toHaveProperty('exemploAtividade');
    });

    it('deve manter exemploAtividade no pedagogicalContent para COORDENADOR', async () => {
      const coordenador = makeCoordenador();

      mockPrismaService.planning.findFirst.mockResolvedValue({ ...mockPlanningBase });

      const result = await service.findOne('planning-1', coordenador);

      // O campo exemploAtividade deve estar presente para a coordenação
      expect(result.pedagogicalContent).toHaveProperty('exemploAtividade', 'Exemplo secreto da coordenação');
    });
  });

  // ─── Testes de Edição por Status ─────────────────────────────────────────

  describe('update — regras de edição por status', () => {
    it('deve lançar ForbiddenException se PROFESSOR tentar editar planejamento EM_REVISAO', async () => {
      const professor = makeProfessor();
      const planningEmRevisao = { ...mockPlanningBase, status: PlanningStatus.EM_REVISAO };

      mockPrismaService.classroomTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrismaService.planning.findFirst.mockResolvedValue(planningEmRevisao);

      await expect(
        service.update('planning-1', { title: 'Novo título' } as any, professor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar ForbiddenException se PROFESSOR tentar editar planejamento APROVADO', async () => {
      const professor = makeProfessor();
      const planningAprovado = { ...mockPlanningBase, status: PlanningStatus.APROVADO };

      mockPrismaService.classroomTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrismaService.planning.findFirst.mockResolvedValue(planningAprovado);

      await expect(
        service.update('planning-1', { title: 'Novo título' } as any, professor),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── Testes do Fluxo de Revisão ──────────────────────────────────────────

  describe('submitForReview', () => {
    it('deve mudar status para EM_REVISAO quando professor dono envia', async () => {
      const professor = makeProfessor();
      const planningRascunho = { ...mockPlanningBase, status: PlanningStatus.RASCUNHO };
      const planningEmRevisao = { ...planningRascunho, status: PlanningStatus.EM_REVISAO };

      mockPrismaService.classroomTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrismaService.planning.findFirst.mockResolvedValue(planningRascunho);
      mockPrismaService.planning.update.mockResolvedValue(planningEmRevisao);

      const result = await service.submitForReview('planning-1', professor);

      expect(mockPrismaService.planning.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: PlanningStatus.EM_REVISAO }),
        }),
      );
      expect(result.status).toBe(PlanningStatus.EM_REVISAO);
    });

    it('deve lançar BadRequestException se tentar enviar planejamento já EM_REVISAO', async () => {
      const professor = makeProfessor();
      const planningEmRevisao = { ...mockPlanningBase, status: PlanningStatus.EM_REVISAO };

      mockPrismaService.classroomTeacher.findFirst.mockResolvedValue({ id: 'ct-1' });
      mockPrismaService.planning.findFirst.mockResolvedValue(planningEmRevisao);

      await expect(
        service.submitForReview('planning-1', professor),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('deve mudar status para APROVADO quando coordenador aprova', async () => {
      const coordenador = makeCoordenador();
      const planningEmRevisao = { ...mockPlanningBase, status: PlanningStatus.EM_REVISAO };
      const planningAprovado = { ...planningEmRevisao, status: PlanningStatus.APROVADO };

      mockPrismaService.planning.findFirst.mockResolvedValue(planningEmRevisao);
      mockPrismaService.planning.update.mockResolvedValue(planningAprovado);

      const result = await service.approve('planning-1', coordenador);

      expect(result.status).toBe(PlanningStatus.APROVADO);
    });

    it('deve lançar ForbiddenException se PROFESSOR tentar aprovar', async () => {
      const professor = makeProfessor();

      await expect(
        service.approve('planning-1', professor),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('returnForCorrections', () => {
    it('deve mudar status para DEVOLVIDO com comentário quando coordenador devolve', async () => {
      const coordenador = makeCoordenador();
      const planningEmRevisao = { ...mockPlanningBase, status: PlanningStatus.EM_REVISAO };
      const planningDevolvido = { ...planningEmRevisao, status: PlanningStatus.DEVOLVIDO, reviewComment: 'Faltou detalhar as atividades.' };

      mockPrismaService.planning.findFirst.mockResolvedValue(planningEmRevisao);
      mockPrismaService.planning.update.mockResolvedValue(planningDevolvido);

      const result = await service.returnForCorrections('planning-1', { comment: 'Faltou detalhar as atividades.' }, coordenador);

      expect(result.status).toBe(PlanningStatus.DEVOLVIDO);
      expect(result.reviewComment).toBe('Faltou detalhar as atividades.');
    });

    it('deve lançar ForbiddenException se PROFESSOR tentar devolver', async () => {
      const professor = makeProfessor();

      await expect(
        service.returnForCorrections('planning-1', { comment: 'Comentário' }, professor),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
