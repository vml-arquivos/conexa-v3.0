import {
  IsString,
  Matches,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsInt,
  Min,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MaterialRequestType } from '@prisma/client';

export class ItemPedidoDto {
  @IsEnum(MaterialRequestType)
  categoria: MaterialRequestType;

  @IsString()
  descricao: string;

  @IsInt()
  @Min(1)
  quantidade: number;

  @IsOptional()
  @IsString()
  unidadeMedida?: string;

  @IsOptional()
  @IsNumber()
  custoEstimado?: number;
}

/**
 * DTO para criação direta de Pedido de Compra com itens (sem exigir requisições aprovadas).
 * Usado pela Coordenadora de Unidade para montar a planilha de pedido.
 */
export class CriarPedidoDto {
  /**
   * Mês de referência no formato YYYY-MM (ex.: 2026-03)
   */
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'mesReferencia deve estar no formato YYYY-MM (ex.: 2026-03)',
  })
  mesReferencia: string;

  /**
   * ID da unidade. Se não informado, usa a unidade do usuário autenticado.
   */
  @IsOptional()
  @IsString()
  unitId?: string;

  /**
   * Observações adicionais da unidade
   */
  @IsOptional()
  @IsString()
  observacoes?: string;

  /**
   * Itens do pedido
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  itens: ItemPedidoDto[];
}

export class AtualizarItensPedidoDto {
  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  itens?: ItemPedidoDto[];
}
