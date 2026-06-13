import http from './http';

export type FaixaEtaria = 'EI01' | 'EI02' | 'EI03';
export type TipoAtividade =
  | 'RODA_DE_CONVERSA'
  | 'EXPLORACAO_SENSORIAL'
  | 'ATIVIDADE_PLASTICA'
  | 'BRINCADEIRA_DIRIGIDA'
  | 'LEITURA_COMPARTILHADA'
  | 'MUSICA_E_MOVIMENTO'
  | 'JOGO_SIMBOLICO'
  | 'INVESTIGACAO'
  | 'SEQUENCIA_DIDATICA'
  | 'LIVRE';

export interface GerarAtividadeDto {
  campoDeExperiencia: string;
  objetivoBNCC: string;
  objetivoCurriculo: string;
  faixaEtaria: FaixaEtaria;
  tipoAtividade?: TipoAtividade;
  numeroCriancas?: number;
  contextoAdicional?: string;
  matrizEntradaId?: string;
}

export interface AtividadeGerada {
  titulo: string;
  descricao: string;
  intencionalidade: string;
  materiais: string[];
  etapas: string[];
  duracao: string;
  adaptacoes: string;
  registroSugerido: string;
  campoDeExperiencia: string;
  objetivoBNCC: string;
  objetivoCurriculo: string;
  faixaEtaria: string;
  geradoPorIA: true;
}

export interface MicrogesTosGerados {
  microgestos: string[];
  justificativa: string;
}

export interface RelatorioAlunoGerado {
  relatorio: string;
  pontosFortess: string[];
  sugestoes: string[];
}

/**
 * Gera uma atividade pedagógica com IA alinhada à Sequência Piloto 2026
 */
export async function gerarAtividade(
  dto: GerarAtividadeDto,
): Promise<AtividadeGerada> {
  const response = await http.post('/ia/gerar-atividade', dto);
  return response.data;
}

/**
 * Gera microgestos pedagógicos para um aluno específico
 */
export async function gerarMicrogestos(params: {
  nomeAluno: string;
  faixaEtaria: string;
  observacoes: string;
  campoDeExperiencia: string;
}): Promise<MicrogesTosGerados> {
  const response = await http.post('/ia/microgestos', params);
  return response.data;
}

/**
 * Gera relatório de desenvolvimento de um aluno
 */
export async function gerarRelatorioAluno(params: {
  nomeAluno: string;
  faixaEtaria: string;
  observacoes: string[];
  periodo: string;
}): Promise<RelatorioAlunoGerado> {
  const response = await http.post('/ia/relatorio-aluno', params);
  return response.data;
}

// Labels em PT-BR
export const LABELS_FAIXA_ETARIA: Record<FaixaEtaria, string> = {
  EI01: 'Bebês (0 a 1 ano e 6 meses)',
  EI02: 'Crianças Bem Pequenas (1a7m a 3a11m)',
  EI03: 'Crianças Pequenas (4 a 5 anos e 11 meses)',
};

export const LABELS_TIPO_ATIVIDADE: Record<TipoAtividade, string> = {
  RODA_DE_CONVERSA: 'Roda de Conversa',
  EXPLORACAO_SENSORIAL: 'Exploração Sensorial',
  ATIVIDADE_PLASTICA: 'Atividade Plástica',
  BRINCADEIRA_DIRIGIDA: 'Brincadeira Dirigida',
  LEITURA_COMPARTILHADA: 'Leitura Compartilhada',
  MUSICA_E_MOVIMENTO: 'Música e Movimento',
  JOGO_SIMBOLICO: 'Jogo Simbólico',
  INVESTIGACAO: 'Investigação',
  SEQUENCIA_DIDATICA: 'Sequência Didática',
  LIVRE: 'Livre',
};
