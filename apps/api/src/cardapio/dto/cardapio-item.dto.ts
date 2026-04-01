import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CardapioItemDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantidade?: number;

  @IsOptional()
  @IsString()
  unidade?: string; // g, ml, unidade, porção

  // Nutrição (todos opcionais)
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) calorias?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) proteinas?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) carboidratos?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) gorduras?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) fibras?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) sodio?: number;
}
