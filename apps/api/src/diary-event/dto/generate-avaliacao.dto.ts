import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
} from 'class-validator';

/**
 * DTO para geração de avaliação pedagógica do plano de aula via IA (Gemini).
 * Todos os campos são opcionais — o endpoint aceita qualquer subconjunto
 * de dados que o professor já tenha preenchido/clicado.
 */
export class GenerateAvaliacaoDto {
  /** Título do planejamento do dia (contexto pedagógico) */
  @IsString()
  @IsOptional()
  planejamentoTitulo?: string;

  /** Status de execução do plano: FEITO | PARCIAL | NAO_REALIZADO */
  @IsString()
  @IsOptional()
  statusExecucaoPlano?: 'FEITO' | 'PARCIAL' | 'NAO_REALIZADO';

  /** Texto livre sobre o que foi executado (quando PARCIAL ou NAO_REALIZADO) */
  @IsString()
  @IsOptional()
  execucaoPlanejamento?: string;

  /** Leitura da turma: como responderam à proposta */
  @IsString()
  @IsOptional()
  reacaoCriancas?: string;

  /** Fatores que influenciaram a execução (IDs selecionados) */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fatoresInfluenciaram?: string[];

  /** Avaliações por objetivo do plano */
  @IsArray()
  @IsOptional()
  avaliacoesObjetivos?: Array<{
    objectiveIndex: number;
    status: 'ATINGIDO' | 'EM_PROCESSO' | 'PRECISA_RETOMAR' | '';
    observacao: string;
  }>;

  /** Adaptações realizadas em relação ao previsto */
  @IsString()
  @IsOptional()
  adaptacoesRealizadas?: string;

  /** Materiais utilizados */
  @IsString()
  @IsOptional()
  materiaisUtilizados?: string;

  /** Ocorrências relevantes do dia */
  @IsString()
  @IsOptional()
  ocorrencias?: string;

  /** O que precisa ser retomado (reflexão pedagógica) */
  @IsString()
  @IsOptional()
  reflexaoPedagogica?: string;

  /** Texto complementar do professor */
  @IsString()
  @IsOptional()
  textoComplementarProfessor?: string;

  /** Objetivos do plano (para contextualizar o prompt) */
  @IsArray()
  @IsOptional()
  objetivosPlano?: string[];

  /** Campos de experiência do plano */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  camposExperiencia?: string[];
}
