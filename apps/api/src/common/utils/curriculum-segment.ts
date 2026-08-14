export const CURRICULUM_SEGMENTS = ['EI01', 'EI02', 'EI03'] as const;

export type CurriculumSegment = (typeof CURRICULUM_SEGMENTS)[number];

export type CurriculumResolutionStatus =
  | 'HOMOGENEOUS'
  | 'MIXED'
  | 'NO_ACTIVE_ENROLLMENT'
  | 'CLASSROOM_CONFIG_FALLBACK'
  | 'INVALID_AGE';

export type CurriculumResolutionSource = 'ACTIVE_ENROLLMENT' | 'CLASSROOM_CONFIG' | 'NONE';

export interface CurriculumChildReference {
  id?: string;
  dateOfBirth: Date | string | null | undefined;
}

export interface CurriculumResolutionInput {
  referenceDate: Date | string;
  children: CurriculumChildReference[];
  configuredAgeGroupMin?: number | null;
  configuredAgeGroupMax?: number | null;
}

export interface CurriculumResolutionContext {
  status: CurriculumResolutionStatus;
  source: CurriculumResolutionSource;
  resolvedSegment: CurriculumSegment | null;
  candidateSegments: CurriculumSegment[];
  childCount: number;
  validChildCount: number;
  invalidChildCount: number;
  counts: Record<CurriculumSegment, number>;
  referenceDate: string;
}

const SEGMENT_LIMITS: ReadonlyArray<readonly [number, CurriculumSegment]> = [
  [18, 'EI01'],
  [47, 'EI02'],
  [71, 'EI03'],
];

function toUtcDate(value: Date | string): Date | null {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Calcula idade civil em meses completos, usando a data de referência do planejamento.
 * A função não usa a idade para diagnosticar ou avaliar a criança; apenas resolve a
 * referência curricular da turma.
 */
export function ageInCompletedMonths(
  dateOfBirth: Date | string | null | undefined,
  referenceDate: Date | string,
): number | null {
  if (!dateOfBirth) return null;
  const birth = toUtcDate(dateOfBirth);
  const reference = toUtcDate(referenceDate);
  if (!birth || !reference || birth > reference) return null;

  let months =
    (reference.getUTCFullYear() - birth.getUTCFullYear()) * 12
    + reference.getUTCMonth() - birth.getUTCMonth();

  if (reference.getUTCDate() < birth.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

export function segmentForAgeInMonths(ageMonths: number): CurriculumSegment | null {
  for (const [limit, segment] of SEGMENT_LIMITS) {
    if (ageMonths <= limit) return segment;
  }
  return null;
}

function emptyCounts(): Record<CurriculumSegment, number> {
  return { EI01: 0, EI02: 0, EI03: 0 };
}

function segmentForConfiguredRange(min: number | null | undefined): CurriculumSegment | null {
  if (typeof min !== 'number' || !Number.isFinite(min) || min < 0) return null;
  return segmentForAgeInMonths(min);
}

/**
 * Resolve o contexto curricular sem esconder turmas com composição etária mista.
 * O chamador deve filtrar previamente apenas matrículas ativas na data de referência.
 */
export function resolveCurriculumContext(input: CurriculumResolutionInput): CurriculumResolutionContext {
  const reference = toUtcDate(input.referenceDate) ?? new Date(0);
  const counts = emptyCounts();
  let validChildCount = 0;
  let invalidChildCount = 0;

  for (const child of input.children) {
    const months = ageInCompletedMonths(child.dateOfBirth, reference);
    const segment = months === null ? null : segmentForAgeInMonths(months);
    if (!segment) {
      invalidChildCount += 1;
      continue;
    }
    validChildCount += 1;
    counts[segment] += 1;
  }

  const candidateSegments = CURRICULUM_SEGMENTS.filter((segment) => counts[segment] > 0);
  const referenceDate = reference.toISOString().slice(0, 10);

  if (candidateSegments.length > 1) {
    return {
      status: 'MIXED',
      source: 'ACTIVE_ENROLLMENT',
      resolvedSegment: null,
      candidateSegments,
      childCount: input.children.length,
      validChildCount,
      invalidChildCount,
      counts,
      referenceDate,
    };
  }

  if (candidateSegments.length === 1 && validChildCount > 0) {
    return {
      status: invalidChildCount > 0 ? 'INVALID_AGE' : 'HOMOGENEOUS',
      source: 'ACTIVE_ENROLLMENT',
      resolvedSegment: candidateSegments[0],
      candidateSegments,
      childCount: input.children.length,
      validChildCount,
      invalidChildCount,
      counts,
      referenceDate,
    };
  }

  const configuredSegment = segmentForConfiguredRange(input.configuredAgeGroupMin);
  if (configuredSegment) {
    return {
      status: 'CLASSROOM_CONFIG_FALLBACK',
      source: 'CLASSROOM_CONFIG',
      resolvedSegment: configuredSegment,
      candidateSegments: [configuredSegment],
      childCount: input.children.length,
      validChildCount,
      invalidChildCount,
      counts,
      referenceDate,
    };
  }

  return {
    status: invalidChildCount > 0 ? 'INVALID_AGE' : 'NO_ACTIVE_ENROLLMENT',
    source: 'NONE',
    resolvedSegment: null,
    candidateSegments: [],
    childCount: input.children.length,
    validChildCount,
    invalidChildCount,
    counts,
    referenceDate,
  };
}
