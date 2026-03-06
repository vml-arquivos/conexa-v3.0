import http from './http';

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  price: number | null;
  supplier: string | null;
  isActive: boolean;
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * GET /catalog/items
 * Retorna itens do catálogo para a unidade do usuário logado.
 * Params: unitId (opcional para MANTENEDORA), category (opcional)
 */
export async function getCatalogItems(params?: {
  unitId?: string;
  category?: string;
}): Promise<CatalogItem[]> {
  const response = await http.get('/catalog/items', { params });
  return response.data as CatalogItem[];
}

/**
 * POST /catalog/import
 * Importa CSV ou XLSX via multipart/form-data.
 * Params: unitId (obrigatório para MANTENEDORA)
 */
export async function importCatalog(
  file: File,
  unitId?: string,
): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  const response = await http.post('/catalog/import', form, {
    params: unitId ? { unitId } : undefined,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data as ImportResult;
}
