import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export enum IaRequestTypeEnum {
  ATIVIDADE = 'ATIVIDADE',
  MICROGESTOS = 'MICROGESTOS',
  RELATORIO_ALUNO = 'RELATORIO_ALUNO',
  RELATORIO_TURMA = 'RELATORIO_TURMA',
  ANALISE_PLANO = 'ANALISE_PLANO',
  ANALISE_DIARIO = 'ANALISE_DIARIO',
  LEMBRETE = 'LEMBRETE',
  VARREDURA = 'VARREDURA',
  TEXTO_PERSONALIZADO = 'TEXTO_PERSONALIZADO',
}

export class SolicitarIaDtoClass {
  @IsEnum(IaRequestTypeEnum)
  type: IaRequestTypeEnum;

  @IsObject()
  payload: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsString()
  @IsOptional()
  systemInstruction?: string;

  @IsString()
  @IsOptional()
  promptId?: string;
}

export class FeedbackDtoClass {
  @IsString()
  @IsNotEmpty()
  responseId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class RevisarRespostaDtoClass {
  @IsBoolean()
  approved: boolean;
}
