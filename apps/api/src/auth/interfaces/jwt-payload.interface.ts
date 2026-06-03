import { RoleLevel, RoleType } from '@prisma/client';

export interface JwtPayload {
  /** ID do usuário autenticado. Mantém compatibilidade com o padrão JWT. */
  sub: string;

  /** Alias explícito para facilitar interceptors, logs e integrações. */
  id?: string;

  email: string;

  /** Raiz multi-tenant obrigatória do sistema. */
  mantenedoraId: string;

  /** Unidade principal do usuário, quando aplicável. */
  unitId?: string;

  roles: {
    roleId: string;
    level: RoleLevel;
    type: RoleType;
    unitScopes: string[];
  }[];
}

export interface JwtPayloadWithRefresh extends JwtPayload {
  refreshToken?: string;
}
