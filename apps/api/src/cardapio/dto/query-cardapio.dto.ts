import { IsOptional, IsString, IsNumberString, IsBooleanString, IsDateString } from 'class-validator';

export class QueryCardapioDto {
  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  semana?: string;

  /** Filtrar por status de publicação: 'true' | 'false' */
  @IsOptional()
  @IsBooleanString()
  publicado?: string;

  /** Data de início do período (YYYY-MM-DD) — filtra semana >= dataInicio */
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  /** Data de fim do período (YYYY-MM-DD) — filtra semana <= dataFim */
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsNumberString()
  skip?: string;
}
