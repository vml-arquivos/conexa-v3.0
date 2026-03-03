import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsObject,
  IsOptional,
  IsEnum,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum PlanningType {
  SEMANAL = 'SEMANAL',
  QUINZENAL = 'QUINZENAL',
  MENSAL = 'MENSAL',
  TRIMESTRAL = 'TRIMESTRAL',
  SEMESTRAL = 'SEMESTRAL',
  ANUAL = 'ANUAL',
}

/**
 * Normaliza o campo `type` para um valor válido do enum PlanningType.
 * Aceita valores legados (DIARIO, PLANO, etc.) e os converte para SEMANAL.
 * Garante que o campo nunca cause erro de validação por valor inválido.
 */
function normalizePlanningType(value: unknown): PlanningType {
  if (!value) return PlanningType.SEMANAL;
  const valid = Object.values(PlanningType) as string[];
  if (valid.includes(value as string)) return value as PlanningType;
  // Mapeamento de valores legados
  const legacyMap: Record<string, PlanningType> = {
    DIARIO: PlanningType.SEMANAL,
    PLANO: PlanningType.SEMANAL,
    MENSALIDADE: PlanningType.MENSAL,
    BIMESTRAL: PlanningType.TRIMESTRAL,
    SEMESTRAL: PlanningType.SEMESTRAL,
    ANUAL: PlanningType.ANUAL,
  };
  return legacyMap[String(value).toUpperCase()] ?? PlanningType.SEMANAL;
}

export class CreatePlanningDto {
  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  curriculumMatrixId?: string; // NOVO: Vínculo com matriz curricular

  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Tipo do planejamento. Opcional — default = SEMANAL.
   * Valores legados (DIARIO, PLANO, etc.) são normalizados automaticamente.
   */
  @IsOptional()
  @Transform(({ value }) => normalizePlanningType(value))
  @IsEnum(PlanningType)
  type?: PlanningType;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  // Campos legados (mantidos para compatibilidade)
  // objectives pode ser string JSON (novo formato) ou objeto (formato legado)
  @IsOptional()
  objectives?: Record<string, any> | string;

  @IsObject()
  @IsOptional()
  activities?: Record<string, any>;

  @IsObject()
  @IsOptional()
  resources?: Record<string, any>;

  @IsOptional()
  @IsString()
  evaluation?: string;

  @IsObject()
  @IsOptional()
  bnccAreas?: Record<string, any>;

  @IsOptional()
  @IsString()
  curriculumAlignment?: string;

  // NOVO: Conteúdo pedagógico de autoria docente
  @IsObject()
  @IsOptional()
  pedagogicalContent?: Record<string, any>; // Experiências, materiais e estratégias por dia
}
