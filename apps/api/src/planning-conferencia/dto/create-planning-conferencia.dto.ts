import { IsString, IsDateString, IsEnum, IsOptional, MaxLength } from 'class-validator';

export enum PlanningConferenciaStatusDto {
  FEITO = 'FEITO',
  PARCIAL = 'PARCIAL',
  NAO_REALIZADO = 'NAO_REALIZADO',
}

export class CreatePlanningConferenciaDto {
  @IsString()
  planningId: string;

  @IsDateString()
  dataConferencia: string;

  @IsEnum(PlanningConferenciaStatusDto)
  status: PlanningConferenciaStatusDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  justificativa?: string;
}
