import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  IsObject,
  IsDateString,
  Matches,
  IsInt,
  Min,
} from 'class-validator';
import { DiaryEventType } from '@prisma/client';

const CUID_REGEX = /^c[a-z0-9]{24,}$/i;

export class CreateDiaryEventDto {
  @IsEnum(DiaryEventType)
  @IsNotEmpty()
  type: DiaryEventType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  @IsNotEmpty()
  eventDate: string;

  @IsString()
  @IsNotEmpty()
  @Matches(CUID_REGEX, { message: 'childId deve ser um CUID válido' })
  childId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(CUID_REGEX, { message: 'classroomId deve ser um CUID válido' })
  classroomId: string;

  // planningId e curriculumEntryId são opcionais para permitir registros
  // de diário e microgestos sem vínculo obrigatório a um planejamento
  @IsString()
  @IsOptional()
  @Matches(CUID_REGEX, { message: 'planningId deve ser um CUID válido' })
  planningId?: string;

  @IsString()
  @IsOptional()
  @Matches(CUID_REGEX, { message: 'curriculumEntryId deve ser um CUID válido' })
  curriculumEntryId?: string;

  // Micro-gestos (JSONB)
  @IsObject()
  @IsOptional()
  medicaoAlimentar?: Record<string, any>;

  @IsInt()
  @Min(0)
  @IsOptional()
  sonoMinutos?: number;

  @IsString()
  @IsOptional()
  trocaFraldaStatus?: string;

  // Microgestos pedagógicos livres (array de objetos)
  @IsArray()
  @IsOptional()
  microgestos?: Record<string, any>[];

  // Observações adicionais
  @IsString()
  @IsOptional()
  observations?: string;

  @IsString()
  @IsOptional()
  developmentNotes?: string;

  @IsString()
  @IsOptional()
  behaviorNotes?: string;

  // Presenças e ausências
  @IsInt()
  @Min(0)
  @IsOptional()
  presencas?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  ausencias?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  aiContext?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mediaUrls?: string[];
}
