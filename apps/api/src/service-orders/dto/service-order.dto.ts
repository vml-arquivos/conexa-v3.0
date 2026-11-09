import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ServiceOrderCategory,
  ServiceOrderPriority,
  ServiceOrderResult,
  ServiceOrderStatus,
} from '@prisma/client';

export class CreateServiceOrderDto {
  @IsString() @MinLength(3) @MaxLength(200)
  title: string;

  @IsString() @MinLength(5) @MaxLength(4000)
  description: string;

  /** Onde fazer: sala, pátio, cozinha… */
  @IsString() @MinLength(2) @MaxLength(200)
  location: string;

  @IsOptional() @IsEnum(ServiceOrderCategory)
  category?: ServiceOrderCategory;

  @IsOptional() @IsEnum(ServiceOrderPriority)
  priority?: ServiceOrderPriority;

  /** Obrigatório apenas para Mantenedora/Desenvolvedor; a unidade usa a própria. */
  @IsOptional() @IsString() @MaxLength(255)
  unitId?: string;
}

export class AcceptServiceOrderDto {
  /** Prazo para execução (ISO). Obrigatório. */
  @IsDateString()
  dueDate: string;

  @IsOptional() @IsString() @MaxLength(255)
  assignedToId?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  message?: string;
}

export class UpdateServiceOrderDto {
  @IsOptional() @IsDateString()
  dueDate?: string;

  @IsOptional() @IsString() @MaxLength(255)
  assignedToId?: string;

  @IsOptional() @IsEnum(ServiceOrderPriority)
  priority?: ServiceOrderPriority;

  @IsOptional() @IsString() @MaxLength(2000)
  message?: string;
}

export class CompleteServiceOrderDto {
  /** Prestação de contas: o que foi feito / o que aconteceu. */
  @IsString() @MinLength(10) @MaxLength(4000)
  report: string;

  @IsEnum(ServiceOrderResult)
  result: ServiceOrderResult;
}

export class EvaluateServiceOrderDto {
  @IsEnum(ServiceOrderResult)
  result: ServiceOrderResult;

  @IsOptional() @IsString() @MaxLength(4000)
  notes?: string;

  /** Se o resultado não foi satisfatório, devolve para a manutenção refazer. */
  @IsOptional() @IsBoolean()
  reopen?: boolean;
}

export class CancelServiceOrderDto {
  @IsString() @MinLength(3) @MaxLength(2000)
  reason: string;
}

export class CommentServiceOrderDto {
  @IsString() @MinLength(1) @MaxLength(2000)
  message: string;
}

export class ListServiceOrdersQueryDto {
  /** Lista separada por vírgula: ABERTA,ACEITA */
  @IsOptional() @IsString() @MaxLength(200)
  status?: string;

  @IsOptional() @IsString() @MaxLength(255)
  unitId?: string;

  /** 'me' | 'none' | id do responsável */
  @IsOptional() @IsString() @MaxLength(255)
  assignedTo?: string;

  @IsOptional() @IsEnum(ServiceOrderPriority)
  priority?: ServiceOrderPriority;

  @IsOptional() @IsEnum(ServiceOrderCategory)
  category?: ServiceOrderCategory;

  /** 'true' → apenas atrasadas */
  @IsOptional() @IsString() @MaxLength(5)
  overdue?: string;

  @IsOptional() @IsString() @MaxLength(100)
  q?: string;

  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100)
  limit?: number;

  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1)
  page?: number;
}

export const ACTIVE_STATUSES: ServiceOrderStatus[] = [
  ServiceOrderStatus.ABERTA,
  ServiceOrderStatus.ACEITA,
  ServiceOrderStatus.EM_EXECUCAO,
  ServiceOrderStatus.AGUARDANDO_AVALIACAO,
];
