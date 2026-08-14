import { CurriculumMatrixEntryService } from './curriculum-matrix-entry.service';
import { RoleLevel, RoleType } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

function makeProfessor(): JwtPayload {
  return {
    sub: 'professor-1',
    email: 'professor@test.com',
    mantenedoraId: 'mant-1',
    unitId: 'unit-1',
    roles: [
      {
        roleId: 'role-1',
        level: RoleLevel.PROFESSOR,
        type: RoleType.PROFESSOR,
        unitScopes: [],
      },
    ],
  };
}

describe('CurriculumMatrixEntryService — composição etária', () => {
  const prisma = {
    classroom: { findUnique: jest.fn() },
    curriculumMatrix: { findFirst: jest.fn() },
    curriculumMatrixEntry: { findMany: jest.fn() },
  } as any;
  const auditService = {} as any;
  const cacheService = {} as any;
  const service = new CurriculumMatrixEntryService(prisma, auditService, cacheService);

  beforeEach(() => jest.clearAllMocks());

  it('retorna mensagem controlada para turma mista e não escolhe uma matriz', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'class-1',
      ageGroupMin: 36,
      ageGroupMax: 47,
      unit: { id: 'unit-1', mantenedoraId: 'mant-1' },
      enrollments: [
        { child: { id: 'child-ei02', dateOfBirth: '2023-08-14T12:00:00.000Z' } },
        { child: { id: 'child-ei03', dateOfBirth: '2022-07-14T12:00:00.000Z' } },
      ],
    });

    const result = await service.byClassroomDay('class-1', '2026-08-14', makeProfessor());

    expect(result.segment).toBeNull();
    expect(result.objectives).toEqual([]);
    expect(result.message).toContain('composição etária mista');
    expect(prisma.curriculumMatrix.findFirst).not.toHaveBeenCalled();
  });

  it('seleciona a matriz do segmento real mesmo quando a configuração da turma diverge', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'class-1',
      ageGroupMin: 36,
      ageGroupMax: 47,
      unit: { id: 'unit-1', mantenedoraId: 'mant-1' },
      enrollments: [
        { child: { id: 'child-ei03-a', dateOfBirth: '2022-07-14T12:00:00.000Z' } },
        { child: { id: 'child-ei03-b', dateOfBirth: '2022-06-14T12:00:00.000Z' } },
      ],
    });
    prisma.curriculumMatrix.findFirst.mockResolvedValue({
      id: 'matrix-ei03',
      name: 'Matriz EI03',
      segment: 'EI03',
    });
    prisma.curriculumMatrixEntry.findMany.mockResolvedValue([
      {
        campoDeExperiencia: 'CORPO_GESTOS_E_MOVIMENTOS',
        objetivoBNCCCode: 'EI03CG01',
        objetivoBNCC: 'Objetivo BNCC',
        objetivoCurriculo: 'Objetivo curricular',
        intencionalidade: 'Intencionalidade',
      },
    ]);

    const result = await service.byClassroomDay('class-1', '2026-08-14', makeProfessor());

    expect(result.segment).toBe('EI03');
    expect(result.objectives).toHaveLength(1);
    expect(prisma.curriculumMatrix.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ segment: 'EI03' }) }),
    );
  });

  it('carrega o segmento explicitamente escolhido em turma mista', async () => {
    prisma.classroom.findUnique.mockResolvedValue({
      id: 'class-1',
      ageGroupMin: 36,
      ageGroupMax: 47,
      unit: { id: 'unit-1', mantenedoraId: 'mant-1' },
      enrollments: [
        { child: { id: 'child-ei02', dateOfBirth: '2023-08-14T12:00:00.000Z' } },
        { child: { id: 'child-ei03', dateOfBirth: '2022-07-14T12:00:00.000Z' } },
      ],
    });
    prisma.curriculumMatrix.findFirst.mockResolvedValue({
      id: 'matrix-ei02',
      name: 'Matriz EI02',
      segment: 'EI02',
    });
    prisma.curriculumMatrixEntry.findMany.mockResolvedValue([
      {
        campoDeExperiencia: 'O_EU_O_OUTRO_E_NOS',
        objetivoBNCCCode: 'EI02EO01',
        objetivoBNCC: 'Objetivo BNCC EI02',
        objetivoCurriculo: 'Objetivo curricular EI02',
        intencionalidade: 'Intencionalidade EI02',
      },
    ]);

    const result = await service.byClassroomDay('class-1', '2026-08-14', makeProfessor(), 'EI02');

    expect(result.segment).toBe('EI02');
    expect(result.candidateSegments).toEqual(['EI02', 'EI03']);
    expect(result.matrixId).toBe('matrix-ei02');
    expect(result.objectives).toHaveLength(1);
    expect(prisma.curriculumMatrix.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ segment: 'EI02' }) }),
    );
  });

});
