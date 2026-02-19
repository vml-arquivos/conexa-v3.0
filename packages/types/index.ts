// Tipos compartilhados entre apps

// Enums do sistema (baseados no Prisma schema)
export enum RoleLevel {
  DEVELOPER = 'DEVELOPER',
  MANTENEDORA = 'MANTENEDORA',
  STAFF_CENTRAL = 'STAFF_CENTRAL',
  UNIDADE = 'UNIDADE',
  PROFESSOR = 'PROFESSOR',
}

export enum RoleType {
  DEVELOPER = 'DEVELOPER',
  MANTENEDORA_ADMIN = 'MANTENEDORA_ADMIN',
  MANTENEDORA_FINANCEIRO = 'MANTENEDORA_FINANCEIRO',
  STAFF_CENTRAL_PEDAGOGICO = 'STAFF_CENTRAL_PEDAGOGICO',
  STAFF_CENTRAL_PSICOLOGIA = 'STAFF_CENTRAL_PSICOLOGIA',
  UNIDADE_DIRETOR = 'UNIDADE_DIRETOR',
  UNIDADE_COORDENADOR_PEDAGOGICO = 'UNIDADE_COORDENADOR_PEDAGOGICO',
  UNIDADE_ADMINISTRATIVO = 'UNIDADE_ADMINISTRATIVO',
  UNIDADE_NUTRICIONISTA = 'UNIDADE_NUTRICIONISTA',
  PROFESSOR = 'PROFESSOR',
  PROFESSOR_AUXILIAR = 'PROFESSOR_AUXILIAR',
}

export enum UserStatus {
  ATIVO = 'ATIVO',
  INATIVO = 'INATIVO',
  SUSPENSO = 'SUSPENSO',
  CONVIDADO = 'CONVIDADO',
}

export enum CampoDeExperiencia {
  O_EU_O_OUTRO_E_O_NOS = 'O_EU_O_OUTRO_E_O_NOS',
  CORPO_GESTOS_E_MOVIMENTOS = 'CORPO_GESTOS_E_MOVIMENTOS',
  TRACOS_SONS_CORES_E_FORMAS = 'TRACOS_SONS_CORES_E_FORMAS',
  ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO = 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',
  ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES = 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',
}

// DTOs de autenticação
export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserPayload;
}

export interface UserPayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mantenedoraId: string;
  unitId?: string;
  roleLevel: RoleLevel;
  roleType: RoleType;
  unitScopes?: string[];
}

// DTOs de Lookup
export interface LookupUnit {
  id: string;
  code: string;
  name: string;
}

export interface LookupClassroom {
  id: string;
  code: string;
  name: string;
  unitId: string;
}

export interface LookupChild {
  id: string;
  fullName: string;
  birthDate: string;
}

// DTOs de Planejamento
export interface PlanningDto {
  id: string;
  classroomId: string;
  professorId: string;
  curriculumMatrixId?: string;
  startDate: string;
  endDate: string;
  title: string;
  objectives: string[];
  pedagogicalContent: any;
}

// DTOs de Diário de Bordo
export interface DiaryEventDto {
  id: string;
  childId: string;
  classroomId: string;
  planningId?: string;
  curriculumEntryId?: string;
  eventDate: string;
  type: string;
  description: string;
  tags?: any;
  attachments?: string[];
}

// DTOs de Matriz Curricular
export interface CurriculumMatrixDto {
  id: string;
  mantenedoraId: string;
  year: number;
  segment: string;
  version: number;
  isActive: boolean;
}

export interface CurriculumMatrixEntryDto {
  id: string;
  curriculumMatrixId: string;
  date: string;
  campoDeExperiencia: CampoDeExperiencia;
  objetivosBNCC: string[];
  objetivosCurriculo: string[];
  intencionalidade: string;
  exemplosAtividade: string[];
}

// Configuração de Tenant (Multi-tenancy)
export interface TenantConfig {
  id: string;
  mantenedoraId: string;
  branding: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  };
  features: {
    dashboards: string[];
    modules: string[];
    integrations: string[];
  };
  site: {
    domain?: string;
    theme?: string;
    customPages?: any[];
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
