/**
 * API Client: Configuração de Refeições por Unidade (Fase 2 - Nutricionista)
 */
import http from './http';

export interface ConfiguracaoRefeicao {
  id: string;
  unitId: string;
  nome: string;
  horario?: string | null;
  ordem: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConfiguracaoRefeicaoPayload {
  unitId: string;
  nome: string;
  horario?: string;
  ordem?: number;
  ativo?: boolean;
}

/** Lista as refeições ativas configuradas para a unidade */
export async function listConfiguracoesRefeicao(
  unitId: string,
): Promise<ConfiguracaoRefeicao[]> {
  const res = await http.get(`/configuracao-refeicao/unidade/${unitId}`);
  return res.data;
}

/** Lista todas as refeições (incluindo inativas) para gerenciamento */
export async function listTodasConfiguracoesRefeicao(
  unitId: string,
): Promise<ConfiguracaoRefeicao[]> {
  const res = await http.get(`/configuracao-refeicao/unidade/${unitId}/todas`);
  return res.data;
}

/** Cria uma nova configuração de refeição */
export async function createConfiguracaoRefeicao(
  data: CreateConfiguracaoRefeicaoPayload,
): Promise<ConfiguracaoRefeicao> {
  const res = await http.post('/configuracao-refeicao', data);
  return res.data;
}

/** Atualiza uma configuração de refeição existente */
export async function updateConfiguracaoRefeicao(
  id: string,
  data: Partial<CreateConfiguracaoRefeicaoPayload>,
): Promise<ConfiguracaoRefeicao> {
  const res = await http.patch(`/configuracao-refeicao/${id}`, data);
  return res.data;
}

/** Desativa (soft delete) uma configuração de refeição */
export async function removeConfiguracaoRefeicao(
  id: string,
): Promise<ConfiguracaoRefeicao> {
  const res = await http.delete(`/configuracao-refeicao/${id}`);
  return res.data;
}
