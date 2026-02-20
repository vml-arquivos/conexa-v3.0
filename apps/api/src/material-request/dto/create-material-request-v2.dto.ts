import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MaterialRequestPriority {
  BAIXA = 'baixa',
  NORMAL = 'normal',
  ALTA = 'alta',
  URGENTE = 'urgente',
}

export class CreateMaterialRequestItemDto {
  @IsString()
  materialId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  observations?: string;
}

export class CreateMaterialRequestV2Dto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  classroomId?: string;

  @IsOptional()
  @IsEnum(MaterialRequestPriority)
  priority?: MaterialRequestPriority;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMaterialRequestItemDto)
  items: CreateMaterialRequestItemDto[];
}
