/**
 * DTOs para o módulo de Units (CRUD de Unidades)
 *
 * Nota: O projeto não usa class-validator para evitar dependência extra.
 * A validação é feita manualmente no service, seguindo o padrão do projeto.
 */

export interface CreateUnitDto {
  /** Nome da unidade — obrigatório */
  name: string;
  /** Código único por mantenedora — obrigatório, será normalizado (trim + uppercase) */
  code: string;
  /** Endereço completo — opcional */
  address?: string;
  /** Cidade — opcional */
  city?: string;
  /** Estado (2 chars, uppercase) — opcional */
  state?: string;
  /** CEP — opcional */
  zipCode?: string;
  /** E-mail de contato — opcional */
  email?: string;
  /** Telefone de contato — opcional */
  phone?: string;
  /** Unidade ativa? — padrão true */
  isActive?: boolean;
}

export interface UpdateUnitDto {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  // code NÃO pode ser alterado após criação (unique constraint)
}
