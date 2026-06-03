import { RoleLevel, RoleType } from '@prisma/client';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  mantenedoraId: string;
  unitId?: string;
  roles: {
    roleId: string;
    level: RoleLevel;
    type: RoleType;       // Papel específico (UNIDADE_NUTRICIONISTA, UNIDADE_DIRETOR, etc.)
    unitScopes: string[]; // Array de unitIds que o usuário tem acesso
  }[];
}

export interface JwtPayloadWithRefresh extends JwtPayload {
  refreshToken?: string;
}
