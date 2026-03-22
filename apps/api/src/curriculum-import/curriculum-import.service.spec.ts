/**
 * Testes unitários do CurriculumImportService
 *
 * Cobertura:
 * 1. findEntryByPedagogicalDay — match por range (não por DateTime exato)
 * 2. Proteção de integridade histórica — entries com DiaryEvent só têm não-normativos atualizados
 * 3. Idempotência — rodar duas vezes não duplica
 * 4. Inserção canônica — date gravada como T12:00:00-03:00
 */

import { CurriculumImportService } from './curriculum-import.service';
import { CurriculumPdfParserService } from './curriculum-pdf-parser.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { MatrixCacheInvalidationService } from '../cache/matrix-cache-invalidation.service';
import { CampoDeExperiencia, RoleLevel, RoleType } from '@prisma/client';
import { ImportMode } from './dto/import-curriculum.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  curriculumMatrix: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  curriculumMatrixEntry: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  diaryEvent: {
    count: jest.fn(),
  },
} as unknown as PrismaService;

const mockAudit = {
  log: jest.fn(),
} as unknown as AuditService;

const mockParser = {
  parsePdf: jest.fn(),
} as unknown as CurriculumPdfParserService;

const mockCacheInvalidation = {
  bump: jest.fn(),
} as unknown as MatrixCacheInvalidationService;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser: JwtPayload = {
  sub: 'user-001',
  email: 'admin@conexa.com',
  mantenedoraId: 'mant-001',
  roles: [{
    roleId: 'role-001',
    level: RoleLevel.MANTENEDORA,
    type: RoleType.MANTENEDORA_ADMIN,
    unitScopes: [],
  }],
};

const mockMatrix = {
  id: 'matrix-001',
  mantenedoraId: 'mant-001',
  year: 2026,
  segment: 'EI01',
  version: 1,
  isActive: true,
};

const mockEntry = {
  date: new Date('2026-02-09T12:00:00-03:00'),
  weekOfYear: 7,
  dayOfWeek: 1,
  bimester: 1,
  campoDeExperiencia: CampoDeExperiencia.O_EU_O_OUTRO_E_O_NOS,
  objetivoBNCC: 'Estabelecer vínculos afetivos.',
  objetivoBNCCCode: 'EI01EO03',
  objetivoCurriculo: 'Perceber o ambiente.',
  intencionalidade: 'Favorecer a adaptação.',
  exemploAtividade: undefined,
};

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('CurriculumImportService', () => {
  let service: CurriculumImportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CurriculumImportService(
      mockPrisma,
      mockAudit,
      mockParser,
      mockCacheInvalidation,
    );
  });

  // ── 1. findEntryByPedagogicalDay ─────────────────────────────────────────────

  describe('findEntryByPedagogicalDay (range de dia pedagógico)', () => {
    it('deve buscar por range de dia (gte T00:00 lte T23:59) em vez de DateTime exato', async () => {
      (mockPrisma.curriculumMatrixEntry.findFirst as jest.Mock).mockResolvedValue(null);

      // Acessar método privado via cast
      const findFn = (service as any).findEntryByPedagogicalDay.bind(service);
      await findFn('matrix-001', new Date('2026-02-09T15:30:00Z'));

      const call = (mockPrisma.curriculumMatrixEntry.findFirst as jest.Mock).mock.calls[0][0];
      expect(call.where.matrixId).toBe('matrix-001');
      expect(call.where.date.gte).toBeDefined();
      expect(call.where.date.lte).toBeDefined();

      // O range deve cobrir o dia inteiro no fuso -03:00
      const gte = call.where.date.gte as Date;
      const lte = call.where.date.lte as Date;
      expect(gte.toISOString()).toMatch(/T03:00:00/); // 00:00 -03:00 = 03:00 UTC
      expect(lte.toISOString()).toMatch(/T02:59:59/); // 23:59 -03:00 = 02:59 UTC do dia seguinte
    });

    it('deve encontrar entry gravada com horário diferente (drift de timezone)', async () => {
      // Entry gravada com T00:00:00Z (meia-noite UTC = 21:00 do dia anterior em SP)
      // mas o dia pedagógico é 2026-02-09
      const entryWithDrift = {
        id: 'entry-001',
        date: new Date('2026-02-09T00:00:00Z'), // pode ser 08/02 em SP dependendo do fuso
        weekOfYear: mockEntry.weekOfYear,
        dayOfWeek: mockEntry.dayOfWeek,
        bimester: mockEntry.bimester,
        campoDeExperiencia: mockEntry.campoDeExperiencia,
        objetivoBNCC: mockEntry.objetivoBNCC,
        objetivoBNCCCode: mockEntry.objetivoBNCCCode,
        objetivoCurriculo: mockEntry.objetivoCurriculo,
        intencionalidade: mockEntry.intencionalidade,
        exemploAtividade: null,
      };
      (mockPrisma.curriculumMatrixEntry.findFirst as jest.Mock).mockResolvedValue(entryWithDrift);

      const findFn = (service as any).findEntryByPedagogicalDay.bind(service);
      const result = await findFn('matrix-001', new Date('2026-02-09T12:00:00-03:00'));

      expect(result).not.toBeNull();
      expect(result.id).toBe('entry-001');
    });
  });

  // ── 2. Proteção de integridade histórica ─────────────────────────────────────

  describe('integridade histórica', () => {
    it('deve atualizar apenas intencionalidade/exemploAtividade quando há DiaryEvent vinculado', async () => {
      const existingEntry = {
        id: 'entry-001',
        date: mockEntry.date,
        weekOfYear: mockEntry.weekOfYear,
        dayOfWeek: mockEntry.dayOfWeek,
        bimester: mockEntry.bimester,
        campoDeExperiencia: mockEntry.campoDeExperiencia,
        objetivoBNCC: mockEntry.objetivoBNCC,
        objetivoBNCCCode: mockEntry.objetivoBNCCCode,
        objetivoCurriculo: mockEntry.objetivoCurriculo,
        intencionalidade: 'Intencionalidade antiga.',
        exemploAtividade: null,
      };

      (mockPrisma.curriculumMatrixEntry.findFirst as jest.Mock).mockResolvedValue(existingEntry);
      (mockPrisma.diaryEvent.count as jest.Mock).mockResolvedValue(3); // 3 eventos vinculados
      (mockPrisma.curriculumMatrixEntry.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.curriculumMatrix.update as jest.Mock).mockResolvedValue({});

      const applyFn = (service as any).applyUpsert.bind(service);
      const result = await applyFn(
        mockMatrix,
        [
          {
            ...mockEntry,
            objetivoBNCC: 'NOVO objetivo BNCC — NÃO deve ser gravado.',
            intencionalidade: 'Nova intencionalidade.',
            exemploAtividade: 'Novo exemplo de atividade.',
          },
        ],
        false, // force = false
        mockUser,
      );

      expect(result.updates).toBe(1);
      expect(result.inserts).toBe(0);

      const updateCall = (mockPrisma.curriculumMatrixEntry.update as jest.Mock).mock.calls[0][0];
      // Deve atualizar apenas os campos não-normativos
      expect(updateCall.data.intencionalidade).toBe('Nova intencionalidade.');
      expect(updateCall.data.exemploAtividade).toBe('Novo exemplo de atividade.');
      // NÃO deve alterar campos normativos
      expect(updateCall.data.objetivoBNCC).toBeUndefined();
      expect(updateCall.data.campoDeExperiencia).toBeUndefined();
    });

    it('deve atualizar campos normativos quando force=true mesmo com DiaryEvent', async () => {
      const existingEntry = {
        id: 'entry-001',
        date: mockEntry.date,
        weekOfYear: mockEntry.weekOfYear,
        dayOfWeek: mockEntry.dayOfWeek,
        bimester: mockEntry.bimester,
        campoDeExperiencia: mockEntry.campoDeExperiencia,
        objetivoBNCC: mockEntry.objetivoBNCC,
        objetivoBNCCCode: mockEntry.objetivoBNCCCode,
        objetivoCurriculo: mockEntry.objetivoCurriculo,
        intencionalidade: mockEntry.intencionalidade,
        exemploAtividade: null,
      };
      (mockPrisma.curriculumMatrixEntry.findFirst as jest.Mock).mockResolvedValue(existingEntry);
      (mockPrisma.diaryEvent.count as jest.Mock).mockResolvedValue(2);
      (mockPrisma.curriculumMatrixEntry.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.curriculumMatrix.update as jest.Mock).mockResolvedValue({});

      const applyFn = (service as any).applyUpsert.bind(service);
      await applyFn(
        mockMatrix,
        [{ ...mockEntry, objetivoBNCC: 'Novo objetivo BNCC com force.' }],
        true, // force = true
        mockUser,
      );

      const updateCall = (mockPrisma.curriculumMatrixEntry.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.objetivoBNCC).toBe('Novo objetivo BNCC com force.');
    });

    it('deve retornar unchanged quando há DiaryEvent mas não há mudança não-normativa', async () => {
      const existingEntry = {
        id: 'entry-001',
        // Mesmos valores normativos que o mockEntry
        date: mockEntry.date,
        weekOfYear: mockEntry.weekOfYear,
        dayOfWeek: mockEntry.dayOfWeek,
        bimester: mockEntry.bimester,
        campoDeExperiencia: mockEntry.campoDeExperiencia,
        objetivoBNCC: mockEntry.objetivoBNCC,       // MESMO
        objetivoBNCCCode: mockEntry.objetivoBNCCCode,
        objetivoCurriculo: mockEntry.objetivoCurriculo, // MESMO
        intencionalidade: 'Mesma intencionalidade.',
        exemploAtividade: null,
      };
      (mockPrisma.curriculumMatrixEntry.findFirst as jest.Mock).mockResolvedValue(existingEntry);
      (mockPrisma.diaryEvent.count as jest.Mock).mockResolvedValue(1);

      const applyFn = (service as any).applyUpsert.bind(service);
      const result = await applyFn(
        mockMatrix,
        [
          {
            ...mockEntry,
            // Mesma intencionalidade e sem exemploAtividade → sem mudança não-normativa
            intencionalidade: 'Mesma intencionalidade.',
            exemploAtividade: undefined,
          },
        ],
        false,
        mockUser,
      );

      // Com DiaryEvent e sem mudança não-normativa: deve ser unchanged
      expect(result.unchanged).toBe(1);
      expect(result.updates).toBe(0);
      expect(mockPrisma.curriculumMatrixEntry.update).not.toHaveBeenCalled();
    });
  });

  // ── 3. Idempotência ──────────────────────────────────────────────────────────

  describe('idempotência', () => {
    it('deve retornar unchanged quando entry já existe e não há mudanças', async () => {
      const existingEntry = { id: 'entry-001', ...mockEntry };
      (mockPrisma.curriculumMatrixEntry.findFirst as jest.Mock).mockResolvedValue(existingEntry);
      (mockPrisma.diaryEvent.count as jest.Mock).mockResolvedValue(0);

      const applyFn = (service as any).applyUpsert.bind(service);
      const result = await applyFn(mockMatrix, [mockEntry], false, mockUser);

      expect(result.unchanged).toBe(1);
      expect(result.inserts).toBe(0);
      expect(result.updates).toBe(0);
      expect(mockPrisma.curriculumMatrixEntry.create).not.toHaveBeenCalled();
      expect(mockPrisma.curriculumMatrixEntry.update).not.toHaveBeenCalled();
    });
  });

  // ── 4. Inserção canônica ─────────────────────────────────────────────────────

  describe('inserção canônica', () => {
    it('deve gravar date como T12:00:00-03:00 ao inserir nova entry', async () => {
      (mockPrisma.curriculumMatrixEntry.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.curriculumMatrixEntry.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.curriculumMatrix.update as jest.Mock).mockResolvedValue({});

      const applyFn = (service as any).applyUpsert.bind(service);
      await applyFn(mockMatrix, [mockEntry], false, mockUser);

      const createCall = (mockPrisma.curriculumMatrixEntry.create as jest.Mock).mock.calls[0][0];
      const createdDate = createCall.data.date as Date;

      // T12:00:00-03:00 = T15:00:00Z
      expect(createdDate.toISOString()).toMatch(/T15:00:00\.000Z/);
    });
  });

  // ── 5. Permissão ─────────────────────────────────────────────────────────────

  describe('validação de permissão', () => {
    it('deve lançar ForbiddenException para usuário sem permissão de importação', async () => {
      const unprivilegedUser: JwtPayload = {
        ...mockUser,
        roles: [{
          roleId: 'role-002',
          level: RoleLevel.PROFESSOR,
          type: RoleType.PROFESSOR,
          unitScopes: [],
        }],
      };

      await expect(
        service.importDryRun(
          {
            mantenedoraId: 'mant-001',
            year: 2026,
            segment: 'EI01',
            version: 1,
            sourceUrl: '/fake.pdf',
            mode: ImportMode.DRY_RUN,
          },
          unprivilegedUser,
        ),
      ).rejects.toThrow(/Apenas Mantenedora/);
    });
  });
});
