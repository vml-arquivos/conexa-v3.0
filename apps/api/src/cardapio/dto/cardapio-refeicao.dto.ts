import { IsEnum, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CardapioItemDto } from './cardapio-item.dto';

export enum DiaSemanaEnum {
  SEGUNDA = 'SEGUNDA',
  TERCA = 'TERCA',
  QUARTA = 'QUARTA',
  QUINTA = 'QUINTA',
  SEXTA = 'SEXTA',
}

export enum TipoRefeicaoEnum {
  CAFE_MANHA = 'CAFE_MANHA',
  ALMOCO = 'ALMOCO',
  LANCHE_TARDE = 'LANCHE_TARDE',
  JANTAR = 'JANTAR',
}

export class CardapioRefeicaoDto {
  @IsEnum(DiaSemanaEnum)
  diaSemana: DiaSemanaEnum;

  @IsEnum(TipoRefeicaoEnum)
  tipoRefeicao: TipoRefeicaoEnum;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CardapioItemDto)
  itens: CardapioItemDto[];
}
