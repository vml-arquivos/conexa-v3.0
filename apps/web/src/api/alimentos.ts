/**
 * API de Alimentos — Banco Nutricional
 * Endpoints: GET /alimentos, GET /alimentos/categorias, GET /alimentos/:id
 *            POST /alimentos/calcular-nutricao
 */
import http from './http';

export interface NutricaoPor100g {
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  fibras: number;
  sodio: number;
}

export interface Alimento {
  id: string;
  nome: string;
  categoria: string;
  categoriaLabel: string;
  unidadePadrao: string;
  porcaoPadrao: number;
  descricao?: string;
  ativo: boolean;
  nutricaoPor100g: NutricaoPor100g;
  nutricaoPorcaoPadrao: NutricaoPor100g & { porcao: number; unidade: string };
}

export interface CategoriaInfo {
  categoria: string;
  label: string;
  total: number;
}

export interface ListAlimentosResponse {
  total: number;
  data: Alimento[];
}

export const CATEGORIA_LABELS: Record<string, string> = {
  CEREAIS_GRAOS:        'Cereais e Grãos',
  LEGUMINOSAS:          'Leguminosas',
  PROTEINAS:            'Proteínas',
  LATICINIOS:           'Laticínios',
  FRUTAS:               'Frutas',
  VERDURAS_LEGUMES:     'Verduras e Legumes',
  GORDURAS_OLEOS:       'Gorduras e Óleos',
  ACUCARES_DOCES:       'Açúcares e Doces',
  BEBIDAS:              'Bebidas',
  PREPARACOES:          'Preparações',
  OLEAGINOSAS:          'Oleaginosas e Sementes',
  EMBUTIDOS:            'Embutidos',
  FARINHAS_AMIDOS:      'Farinhas e Amidos',
  TEMPEROS_CONDIMENTOS: 'Temperos e Condimentos',
  SOPAS_CALDOS:         'Sopas e Caldos',
  OUTROS:               'Outros',
};

// Ordem de exibição das categorias no select
export const CATEGORIAS_ORDEM = [
  'CEREAIS_GRAOS',
  'LEGUMINOSAS',
  'PROTEINAS',
  'LATICINIOS',
  'FRUTAS',
  'VERDURAS_LEGUMES',
  'GORDURAS_OLEOS',
  'ACUCARES_DOCES',
  'BEBIDAS',
  'PREPARACOES',
  'OLEAGINOSAS',
  'EMBUTIDOS',
  'FARINHAS_AMIDOS',
  'TEMPEROS_CONDIMENTOS',
  'SOPAS_CALDOS',
  'OUTROS',
];

/** Busca todos os alimentos ativos (até 500) */
export async function listAlimentos(params?: {
  busca?: string;
  categoria?: string;
  limit?: number;
}): Promise<ListAlimentosResponse> {
  const res = await http.get('/alimentos', {
    params: {
      limit: params?.limit ?? 500,
      apenasAtivos: true,
      ...(params?.busca     ? { busca: params.busca }         : {}),
      ...(params?.categoria ? { categoria: params.categoria } : {}),
    },
  });
  return res.data;
}

/** Agrupa alimentos por categoria mantendo a ordem definida */
export function agruparPorCategoria(
  alimentos: Alimento[]
): { categoria: string; label: string; itens: Alimento[] }[] {
  const mapa = new Map<string, Alimento[]>();

  for (const a of alimentos) {
    if (!mapa.has(a.categoria)) mapa.set(a.categoria, []);
    mapa.get(a.categoria)!.push(a);
  }

  return CATEGORIAS_ORDEM
    .filter((cat) => mapa.has(cat))
    .map((cat) => ({
      categoria: cat,
      label: CATEGORIA_LABELS[cat] ?? cat,
      itens: mapa.get(cat)!.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    }));
}

/** Calcula macros proporcionais à quantidade (em gramas) */
export function calcularMacrosPorQuantidade(
  alimento: Alimento,
  quantidadeG: number
): NutricaoPor100g {
  const fator = quantidadeG / 100;
  const n = alimento.nutricaoPor100g;
  return {
    calorias:     Math.round(n.calorias     * fator * 100) / 100,
    proteinas:    Math.round(n.proteinas    * fator * 100) / 100,
    carboidratos: Math.round(n.carboidratos * fator * 100) / 100,
    gorduras:     Math.round(n.gorduras     * fator * 100) / 100,
    fibras:       Math.round(n.fibras       * fator * 100) / 100,
    sodio:        Math.round(n.sodio        * fator * 100) / 100,
  };
}
