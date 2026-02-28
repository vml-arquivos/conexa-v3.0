import { RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

/**
 * Remove o campo `exemploAtividade` de uma lista de entradas da matriz curricular
 * se o usuário for um professor.
 *
 * Retorna uma nova lista com cópias dos objetos, sem mutar os originais.
 */
export function maskMatrizEntriesForProfessor<T extends { exemploAtividade?: any }>(
  user: JwtPayload,
  entries: T[],
): T[] {
  const isProfessor = user.roles.some((role) => role.level === RoleLevel.PROFESSOR);

  if (!isProfessor) {
    return entries;
  }

  return entries.map((entry) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { exemploAtividade, ...rest } = entry;
    return rest as T;
  });
}

/**
 * Remove o campo `exemploAtividade` de um único objeto (entrada da matriz ou planejamento)
 * se o usuário for um professor.
 *
 * Retorna uma cópia do objeto sem mutar o original.
 */
export function maskMatrizEntryForProfessor<T extends { exemploAtividade?: any; pedagogicalContent?: any }>(
  user: JwtPayload,
  entry: T,
): T {
  const isProfessor = user.roles.some((role) => role.level === RoleLevel.PROFESSOR);

  if (!isProfessor) {
    return entry;
  }

  // Trabalha com uma cópia rasa para não mutar o objeto original
  const masked: any = { ...entry };

  // Remover campo direto no objeto (ex: CurriculumMatrixEntry)
  if ('exemploAtividade' in masked) {
    delete masked.exemploAtividade;
  }

  // Remover campo dentro do `pedagogicalContent` (ex: Planning)
  if (masked.pedagogicalContent && typeof masked.pedagogicalContent === 'object') {
    const { exemploAtividade: _removed, ...contentWithoutExample } = masked.pedagogicalContent;
    masked.pedagogicalContent = contentWithoutExample;
  }

  return masked as T;
}
