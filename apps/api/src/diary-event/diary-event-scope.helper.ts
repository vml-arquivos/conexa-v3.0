import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';

/**
 * Helper para criar where clause com escopo para DiaryEvent.
 *
 * IMPORTANTE: O modelo Classroom NÃO tem campo mantenedoraId direto.
 * O vínculo com mantenedora é feito via classroom.unit.mantenedoraId.
 * Portanto, o filtro de escopo deve usar a relação aninhada:
 *   classroom: { unit: { mantenedoraId: ... } }
 *
 * Para PROFESSOR: o escopo é validado via ClassroomTeacher após a query,
 * pois não é possível filtrar por relação many-to-many no where do Prisma
 * de forma direta sem subquery. Retornamos where vazio e validamos depois.
 */
export function getScopedWhereForDiaryEvent(user: JwtPayload) {
  // DEVELOPER tem acesso total
  if (user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
    return {};
  }

  // MANTENEDORA: filtrar por mantenedoraId via classroom.unit (Classroom não tem mantenedoraId direto)
  if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
    return {
      classroom: {
        unit: { mantenedoraId: user.mantenedoraId },
      },
    };
  }

  // STAFF_CENTRAL: filtrar por unitScopes via classroom.unitId
  if (user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)) {
    const staffRole = user.roles.find(
      (role) => role.level === RoleLevel.STAFF_CENTRAL,
    );
    const scopes = staffRole?.unitScopes ?? [];
    if (scopes.length > 0) {
      return {
        classroom: {
          unitId: { in: scopes },
          unit: { mantenedoraId: user.mantenedoraId },
        },
      };
    }
    // Sem unitScopes: acesso a todas as unidades da mantenedora
    return {
      classroom: {
        unit: { mantenedoraId: user.mantenedoraId },
      },
    };
  }

  // UNIDADE: filtrar por unitId via classroom
  if (user.roles.some((role) => role.level === RoleLevel.UNIDADE)) {
    return {
      classroom: {
        unitId: user.unitId,
      },
    };
  }

  // PROFESSOR: retorna where vazio — a validação de acesso é feita
  // via ClassroomTeacher no método findOne/findAll após a query.
  // Isso evita o erro "Unknown argument mantenedoraId" no Prisma.
  return {};
}
