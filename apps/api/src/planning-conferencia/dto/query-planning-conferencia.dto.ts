import { IsString, IsOptional, IsDateString } from 'class-validator';

export class QueryPlanningConferenciaDto {
  @IsOptional()
  @IsString()
  planningId?: string;

  @IsOptional()
  @IsString()
  classroomId?: string;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;
}
