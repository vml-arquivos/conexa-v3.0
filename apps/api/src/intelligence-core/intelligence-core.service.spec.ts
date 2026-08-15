import { RoleLevel, RoleType } from '@prisma/client';
import { IntelligenceCoreService } from './intelligence-core.service';

describe('IntelligenceCoreService', () => {
  const prisma = {
    unit: { findMany: jest.fn() },
    enrollment: { findMany: jest.fn() },
    attendance: { findMany: jest.fn() },
    diaryEvent: { findMany: jest.fn() },
    developmentObservation: { findMany: jest.fn() },
    acompanhamentoNutricional: { findMany: jest.fn() },
    alertaOperacional: { findMany: jest.fn() },
  } as any;

  let service: IntelligenceCoreService;

  const developer = {
    sub: 'dev-1',
    email: 'dev@example.com',
    mantenedoraId: 'm1',
    roles: [{ level: RoleLevel.DEVELOPER, type: RoleType.DEVELOPER, unitScopes: [] }],
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IntelligenceCoreService(prisma);
  });

  it('nega a fila sensível quando o usuário não é Psicologia Central', async () => {
    await expect(service.getPsychologyOverview({
      ...developer,
      roles: [{ level: RoleLevel.STAFF_CENTRAL, type: RoleType.STAFF_CENTRAL_PEDAGOGICO, unitScopes: [] }],
    } as any, {})).rejects.toThrow('Acesso restrito à Psicologia Central');
    expect(prisma.unit.findMany).not.toHaveBeenCalled();
  });

  it('exige unidade explícita para o resumo de unidade em perfis centrais', async () => {
    await expect(service.getUnitOverview(developer, {})).rejects.toThrow('Selecione uma unidade');
    expect(prisma.unit.findMany).not.toHaveBeenCalled();
  });

  it('mantém notas psicológicas fora do agregado da rede', async () => {
    prisma.unit.findMany.mockResolvedValue([{ id: 'u1', name: 'Unidade Piloto', mantenedoraId: 'm1' }]);
    prisma.enrollment.findMany.mockResolvedValue([]);
    prisma.attendance.findMany.mockResolvedValue([]);
    prisma.diaryEvent.findMany.mockResolvedValue([]);
    prisma.developmentObservation.findMany.mockResolvedValue([
      { childId: 'ch1', date: new Date('2026-08-01'), category: 'SOCIOAFETIVO', developmentAlerts: null, healthNotes: null, dietaryNotes: null, psychologicalNotes: 'nota restrita' },
    ]);
    prisma.acompanhamentoNutricional.findMany.mockResolvedValue([]);
    prisma.alertaOperacional.findMany.mockResolvedValue([]);

    const result = await service.getNetworkOverview(developer, { startDate: '2026-08-01', endDate: '2026-08-31' });

    expect(result.metrics.units).toBe(1);
    expect(result).not.toHaveProperty('psychologicalNotes');
    expect(JSON.stringify(result)).not.toContain('nota restrita');
  });

  it('calcula cobertura e cria sinal revisável quando uma criança não tem registro', async () => {
    prisma.unit.findMany.mockResolvedValue([{ id: 'u1', name: 'Unidade Piloto', mantenedoraId: 'm1' }]);
    prisma.enrollment.findMany.mockResolvedValue([
      { childId: 'ch1', classroomId: 'class-1', child: { id: 'ch1', firstName: 'Ana', lastName: 'Silva' }, classroom: { id: 'class-1', name: 'Maternal II' } },
    ]);
    prisma.attendance.findMany.mockResolvedValue([]);
    prisma.diaryEvent.findMany.mockResolvedValue([]);
    prisma.developmentObservation.findMany.mockResolvedValue([]);
    prisma.acompanhamentoNutricional.findMany.mockResolvedValue([]);
    prisma.alertaOperacional.findMany.mockResolvedValue([]);

    const result = await service.getUnitOverview(developer, { unitId: 'u1' });

    expect(result.metrics.records.coverageRate).toBe(0);
    expect(result.attentionItems).toEqual([
      expect.objectContaining({
        source: 'CoberturaDeRegistro',
        childId: 'ch1',
        type: 'SEM_REGISTRO_NO_PERIODO',
      }),
    ]);
  });
});
