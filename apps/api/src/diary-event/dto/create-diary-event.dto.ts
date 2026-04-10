import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  IsObject,
  IsDateString,
  IsInt,
  Min,
  ValidateIf,
} from 'class-validator';
import { DiaryEventType, DiaryEventStatus } from '@prisma/client';

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
  childId: string;

  /**
   * classroomId é OPCIONAL.
   * Quando ausente ou inválido, o service resolve via matrícula ativa da criança.
   * NÃO aplicar @Matches aqui — o ValidationPipe rejeitaria strings inválidas
   * antes de chegar ao service, impedindo o fallback automático.
   */
  @IsOptional()
  @ValidateIf((o) => o.classroomId != null && o.classroomId !== '' && o.classroomId !== 'undefined')
  @IsString()
  classroomId?: string;

  /**
   * planningId é OPCIONAL.
   * Quando fornecido, o service valida a existência e o status do planejamento.
   */
  @IsOptional()
  @ValidateIf((o) => o.planningId != null && o.planningId !== '' && o.planningId !== 'undefined')
  @IsString()
  planningId?: string;

  /**
   * curriculumEntryId é OPCIONAL.
   * Quando fornecido, o service valida a existência da entrada curricular.
   */
  @IsOptional()
  @ValidateIf((o) => o.curriculumEntryId != null && o.curriculumEntryId !== '' && o.curriculumEntryId !== 'undefined')
  @IsString()
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

  /**
   * status é OPCIONAL.
   * Quando não informado, o service usa PUBLICADO como padrão ao salvar
   * (o professor está "publicando" ao clicar em Salvar).
   * Valores aceitos: RASCUNHO | PUBLICADO | REVISADO | ARQUIVADO
   */
  @IsEnum(DiaryEventStatus)
  @IsOptional()
  status?: DiaryEventStatus;
}
