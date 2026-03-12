import { IsEnum, IsOptional, IsString, IsArray, ValidateNested, IsInt, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReviewDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ADJUSTED = 'ADJUSTED',
  /** Aprovação item-a-item com qty individual */
  APPROVE_ITEMS = 'APPROVE_ITEMS',
}

/** Item de decisão individual (novo formato) */
export class ReviewItemDto {
  @IsString()
  itemId: string;

  @IsBoolean()
  approved: boolean;

  @IsInt()
  @Min(0)
  qtyApproved: number;

  @IsOptional()
  @IsString()
  reason?: string;
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

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  /** Itens com decisão individual (APPROVE_ITEMS) */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewItemDto)
  items?: ReviewItemDto[];

  /** Legado: itens com quantidades ajustadas (ADJUSTED) */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemApprovedDto)
  itemsApproved?: ItemApprovedDto[];
}
