import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEmpresaTransporteDto {
  @IsString()
  @MaxLength(255)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefone?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsString()
  unitId?: string;
}

export class UpdateEmpresaTransporteDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefone?: string | null;

  @IsOptional()
  @IsString()
  observacoes?: string | null;

  @IsOptional()
  @IsString()
  unitId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
