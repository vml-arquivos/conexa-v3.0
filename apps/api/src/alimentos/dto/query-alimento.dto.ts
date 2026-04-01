import { IsEnum, IsOptional, IsString, IsNumberString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { CategoriaAlimento } from '@prisma/client';

export class QueryAlimentoDto {
  @IsOptional()
  @IsString()
  busca?: string; // busca por nome (ILIKE)

  @IsOptional()
  @IsEnum(CategoriaAlimento)
  categoria?: CategoriaAlimento;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsNumberString()
  skip?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  apenasAtivos?: boolean;
}
