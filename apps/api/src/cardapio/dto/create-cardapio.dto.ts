import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { CardapioRefeicaoDto } from './cardapio-refeicao.dto';

export class CreateCardapioDto {
  @IsString()
  unitId: string;

  /** Semana de referência: YYYY-MM-DD (segunda-feira) */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'semana deve ser YYYY-MM-DD' })
  semana: string;

  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsBoolean()
  publicado?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CardapioRefeicaoDto)
  refeicoes?: CardapioRefeicaoDto[];
}
