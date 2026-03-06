import http from './http';

export interface MaterialCatalogItem {
  id: string;
  code: string;
  name: string;
  category: string; // PEDAGOGICO | HIGIENE
  unit: string;     // UN, Caixa, Pacote, Rolo, etc.
  referencePrice: number | null;
}

/**
 * GET /materials/catalog?category=PEDAGOGICO|HIGIENE
 * Catálogo de preços de referência para pedidos de compra.
 */
export async function getMaterialsCatalog(
  category?: 'PEDAGOGICO' | 'HIGIENE' | 'HIGIENE_PESSOAL_CRIANCAS',
): Promise<MaterialCatalogItem[]> {
  const response = await http.get('/materials/catalog', {
    params: category ? { category } : undefined,
  });
  return response.data ?? [];
}
