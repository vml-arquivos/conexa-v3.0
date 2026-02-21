import { IsDateString, IsOptional, IsString } from 'class-validator';

export class GeneratePlanningDto {
  @IsDateString()
  weekStartDate: string; // Data de início da semana (segunda-feira)

  @IsOptional()
  @IsString()
  classroomId?: string; // Se não fornecido, usa turma do professor
}
