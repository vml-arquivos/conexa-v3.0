import { IsEnum, IsOptional, IsString, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReviewDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ADJUSTED = 'ADJUSTED',
}

export class ItemApprovedDto {
  @IsString()
  id: string;

  @IsInt()
  @Min(0)
  quantidadeAprovada: number;
}

export class ReviewMaterialRequestDto {
  @IsEnum(ReviewDecision)
  decision: ReviewDecision;

  /** Observação/motivo (obrigatório para REJECTED, opcional para outros) */
  @IsOptional()
  @IsString()
  notes?: string;

  /** Itens com quantidades ajustadas (usado em ADJUSTED) */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemApprovedDto)
  itemsApproved?: ItemApprovedDto[];
}
