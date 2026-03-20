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
  ValidateIf,
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

  // classroomId é opcional — quando ausente, o service resolve via matrícula ativa da criança
  @IsOptional()
  @ValidateIf((o) => o.classroomId != null && o.classroomId !== '')
  @IsString()
  @Matches(CUID_REGEX, { message: 'classroomId deve ser um CUID válido' })
  classroomId?: string;

  // planningId e curriculumEntryId são opcionais — sem vínculo obrigatório a planejamento
  @IsOptional()
  @ValidateIf((o) => o.planningId != null && o.planningId !== '')
  @IsString()
  @Matches(CUID_REGEX, { message: 'planningId deve ser um CUID válido' })
  planningId?: string;

  @IsOptional()
  @ValidateIf((o) => o.curriculumEntryId != null && o.curriculumEntryId !== '')
  @IsString()
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
