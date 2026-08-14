import {
  ageInCompletedMonths,
  resolveCurriculumContext,
  segmentForAgeInMonths,
} from './curriculum-segment';

describe('curriculum-segment', () => {
  const referenceDate = '2026-08-14T12:00:00.000Z';

  it('calcula meses completos na data do planejamento', () => {
    expect(ageInCompletedMonths('2025-02-14T12:00:00.000Z', referenceDate)).toBe(18);
    expect(ageInCompletedMonths('2024-08-15T12:00:00.000Z', referenceDate)).toBe(23);
  });

  it('resolve os limites oficiais de referência sem diagnosticar a criança', () => {
    expect(segmentForAgeInMonths(18)).toBe('EI01');
    expect(segmentForAgeInMonths(19)).toBe('EI02');
    expect(segmentForAgeInMonths(47)).toBe('EI02');
    expect(segmentForAgeInMonths(48)).toBe('EI03');
    expect(segmentForAgeInMonths(71)).toBe('EI03');
    expect(segmentForAgeInMonths(72)).toBeNull();
  });

  it('resolve turma homogênea por matrículas ativas', () => {
    const result = resolveCurriculumContext({
      referenceDate,
      configuredAgeGroupMin: 36,
      configuredAgeGroupMax: 47,
      children: [
        { id: 'child-1', dateOfBirth: '2023-08-14T12:00:00.000Z' },
        { id: 'child-2', dateOfBirth: '2023-10-14T12:00:00.000Z' },
      ],
    });

    expect(result.status).toBe('HOMOGENEOUS');
    expect(result.source).toBe('ACTIVE_ENROLLMENT');
    expect(result.resolvedSegment).toBe('EI02');
    expect(result.candidateSegments).toEqual(['EI02']);
    expect(result.counts).toEqual({ EI01: 0, EI02: 2, EI03: 0 });
  });

  it('não esconde turma mista com escolha arbitrária ou ponto médio', () => {
    const result = resolveCurriculumContext({
      referenceDate,
      configuredAgeGroupMin: 36,
      configuredAgeGroupMax: 47,
      children: [
        { id: 'child-ei02', dateOfBirth: '2023-08-14T12:00:00.000Z' },
        { id: 'child-ei03', dateOfBirth: '2022-07-14T12:00:00.000Z' },
      ],
    });

    expect(result.status).toBe('MIXED');
    expect(result.resolvedSegment).toBeNull();
    expect(result.candidateSegments).toEqual(['EI02', 'EI03']);
    expect(result.counts).toEqual({ EI01: 0, EI02: 1, EI03: 1 });
  });

  it('usa a configuração da turma somente quando não há matrículas válidas', () => {
    const result = resolveCurriculumContext({
      referenceDate,
      configuredAgeGroupMin: 19,
      configuredAgeGroupMax: 35,
      children: [],
    });

    expect(result.status).toBe('CLASSROOM_CONFIG_FALLBACK');
    expect(result.source).toBe('CLASSROOM_CONFIG');
    expect(result.resolvedSegment).toBe('EI02');
  });

  it('marca data de nascimento inválida e não a transforma em segmento', () => {
    const result = resolveCurriculumContext({
      referenceDate,
      configuredAgeGroupMin: null,
      children: [{ id: 'child-invalid', dateOfBirth: 'not-a-date' }],
    });

    expect(result.status).toBe('INVALID_AGE');
    expect(result.resolvedSegment).toBeNull();
    expect(result.invalidChildCount).toBe(1);
  });
});
