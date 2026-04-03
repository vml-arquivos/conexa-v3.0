import { apiClient } from './client';

export type DiaSemana = 'SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA';
export type TipoRefeicao = 'CAFE_MANHA' | 'ALMOCO' | 'LANCHE_TARDE' | 'JANTAR';

export const DIA_SEMANA_LABELS: Record<DiaSemana, string> = {
  SEGUNDA: 'Segunda',
  TERCA: 'Terça',
  QUARTA: 'Quarta',
  QUINTA: 'Quinta',
  SEXTA: 'Sexta',
};

export const TIPO_REFEICAO_LABELS: Record<TipoRefeicao, string> = {
  CAFE_MANHA: 'Café da Manhã',
  ALMOCO: 'Almoço',
  LANCHE_TARDE: 'Lanche da Tarde',
  JANTAR: 'Jantar',
};

export const DIAS_SEMANA: DiaSemana[] = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];
export const TIPOS_REFEICAO: TipoRefeicao[] = ['CAFE_MANHA', 'ALMOCO', 'LANCHE_TARDE', 'JANTAR'];

export interface CardapioItem {
  id: string;
  nome: string;
  quantidade?: number | null;
  unidade?: string | null;
  calorias?: number | null;
  proteinas?: number | null;
  carboidratos?: number | null;
  gorduras?: number | null;
  fibras?: number | null;
  sodio?: number | null;
}

export interface CardapioRefeicao {
  id: string;
  diaSemana: DiaSemana;
  tipoRefeicao: TipoRefeicao;
  observacoes?: string | null;
  itens: CardapioItem[];
  totaisNutricionais?: {
    calorias: number;
    proteinas: number;
    carboidratos: number;
    gorduras: number;
    fibras: number;
    sodio: number;
  };
}

export interface Cardapio {
  id: string;
  unitId: string;
  semana: string;
  titulo?: string | null;
  observacoes?: string | null;
  publicado: boolean;
  createdAt: string;
  updatedAt: string;
  refeicoes: CardapioRefeicao[];
}

export interface CardapioListResponse {
  total: number;
  data: Cardapio[];
}

export interface NutricaoResponse {
  cardapioId: string;
  semana: string;
  resumoDiario: Array<{
    dia: string;
    refeicoes: Array<{
      refeicao: string;
      itens: number;
      calorias: number;
      proteinas: number;
      carboidratos: number;
      gorduras: number;
      fibras: number;
      sodio: number;
    }>;
    totais: {
      calorias: number;
      proteinas: number;
      carboidratos: number;
      gorduras: number;
      fibras: number;
      sodio: number;
    };
  }>;
  totalSemanal: {
    calorias: number;
    proteinas: number;
    carboidratos: number;
    gorduras: number;
    fibras: number;
    sodio: number;
  };
  mediadiaria: {
    calorias: number;
    proteinas: number;
    carboidratos: number;
    gorduras: number;
    fibras: number;
    sodio: number;
  };
}

export async function listCardapios(params: {
  unitId?: string;
  semana?: string;
  publicado?: boolean;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
  skip?: number;
}): Promise<CardapioListResponse> {
  const q = new URLSearchParams();
  if (params.unitId) q.set('unitId', params.unitId);
  if (params.semana) q.set('semana', params.semana);
  if (params.publicado !== undefined) q.set('publicado', String(params.publicado));
  if (params.dataInicio) q.set('dataInicio', params.dataInicio);
  if (params.dataFim) q.set('dataFim', params.dataFim);
  if (params.limit !== undefined) q.set('limit', String(params.limit));
  if (params.skip !== undefined) q.set('skip', String(params.skip));
  const res = await apiClient.get(`/cardapios?${q.toString()}`);
  return res.data;
}

export async function getCardapio(id: string): Promise<Cardapio> {
  const res = await apiClient.get(`/cardapios/${id}`);
  return res.data;
}

export async function createCardapio(data: {
  unitId: string;
  semana: string;
  titulo?: string;
  observacoes?: string;
  publicado?: boolean;
}): Promise<Cardapio> {
  const res = await apiClient.post('/cardapios', data);
  return res.data;
}

export async function updateCardapio(id: string, data: {
  titulo?: string;
  observacoes?: string;
  publicado?: boolean;
}): Promise<Cardapio> {
  const res = await apiClient.patch(`/cardapios/${id}`, data);
  return res.data;
}

export async function upsertRefeicao(cardapioId: string, data: {
  diaSemana: DiaSemana;
  tipoRefeicao: TipoRefeicao;
  observacoes?: string;
  itens: Array<{
    nome: string;
    quantidade?: number;
    unidade?: string;
    calorias?: number;
    proteinas?: number;
    carboidratos?: number;
    gorduras?: number;
    fibras?: number;
    sodio?: number;
  }>;
}): Promise<Cardapio> {
  const res = await apiClient.put(`/cardapios/${cardapioId}/refeicoes`, data);
  return res.data;
}

export async function deleteCardapio(id: string): Promise<void> {
  await apiClient.delete(`/cardapios/${id}`);
}

export async function calcularNutricao(id: string): Promise<NutricaoResponse> {
  const res = await apiClient.get(`/cardapios/${id}/nutricao`);
  return res.data;
}

/** Retorna a segunda-feira da semana corrente no formato YYYY-MM-DD */
export function getSemanaAtual(): string {
  const now = new Date();
  const day = now.getDay(); // 0=dom, 1=seg...
  const diff = day === 0 ? -6 : 1 - day;
  const seg = new Date(now);
  seg.setDate(now.getDate() + diff);
  return seg.toISOString().slice(0, 10);
}

/** Retorna a semana anterior no formato YYYY-MM-DD */
export function getSemanaAnterior(semana: string): string {
  const d = new Date(semana + 'T12:00:00');
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

/** Retorna a próxima semana no formato YYYY-MM-DD */
export function getProximaSemana(semana: string): string {
  const d = new Date(semana + 'T12:00:00');
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

/** Formata a semana para exibição: "31/03 – 04/04/2026" */
export function formatarSemana(semana: string): string {
  const seg = new Date(semana + 'T12:00:00');
  const sex = new Date(semana + 'T12:00:00');
  sex.setDate(seg.getDate() + 4);
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${fmt(seg)} – ${fmt(sex)}/${sex.getFullYear()}`;
}
