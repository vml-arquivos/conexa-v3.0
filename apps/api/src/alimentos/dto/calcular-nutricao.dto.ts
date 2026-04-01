import { IsString, IsNumber, IsOptional, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ItemCalculoDto {
  @IsString()
  alimentoId: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantidade: number; // em gramas

  @IsOptional()
  @IsString()
  unidade?: string; // g, ml, unidade, colher, etc.
}

export class CalcularNutricaoDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemCalculoDto)
  itens: ItemCalculoDto[];
}
