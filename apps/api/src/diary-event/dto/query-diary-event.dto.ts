import { IsOptional, IsString, IsDateString, IsEnum, IsNumberString } from 'class-validator';
import { DiaryEventType } from '@prisma/client';

export class QueryDiaryEventDto {
  @IsString()
  @IsOptional()
  childId?: string;

  @IsString()
  @IsOptional()
  classroomId?: string;

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsEnum(DiaryEventType)
  @IsOptional()
  type?: DiaryEventType;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  createdBy?: string;

  /** Filtrar por tag contida no array JSON (ex: tag=ocorrencia) */
  @IsString()
  @IsOptional()
  tag?: string;

  /**
   * Número máximo de registros a retornar.
   * Padrão: 500. Máximo aceito: 1000.
   * FIX: campo ausente causava 400 Bad Request com forbidNonWhitelisted: true,
   * fazendo todos os painéis de ocorrências exibirem zero resultados.
   */
  @IsNumberString()
  @IsOptional()
  limit?: string;

  /**
   * Offset para paginação (número de registros a pular).
   * Padrão: 0.
   */
  @IsNumberString()
  @IsOptional()
  skip?: string;
}
