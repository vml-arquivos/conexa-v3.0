/**
 * useMaterialsCatalog
 *
 * Hook para carregar o catálogo de materiais do backend por categoria.
 * Endpoint: GET /materials/catalog?category=PEDAGOGICO|HIGIENE|ADMINISTRATIVO
 *
 * Regras:
 * - Filtra por mantenedoraId automaticamente (via JWT no backend)
 * - Retorna lista vazia enquanto carrega ou em caso de erro
 * - Não lança exceção — erros são silenciosos para não quebrar o formulário
 * - Recarrega quando a categoria muda
 */
import { useState, useEffect, useRef } from 'react';
import http from '../api/http';

export interface CatalogMaterial {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string | null;
  referencePrice: number | null;
}

interface UseMaterialsCatalogResult {
  materials: CatalogMaterial[];
  loading: boolean;
  error: string | null;
}

export function useMaterialsCatalog(category: string | null): UseMaterialsCatalogResult {
  const [materials, setMaterials] = useState<CatalogMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!category) {
      setMaterials([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Cancelar requisição anterior se ainda estiver em andamento
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    http
      .get('/materials/catalog', {
        params: { category },
        signal: controller.signal,
      })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setMaterials(res.data as CatalogMaterial[]);
        } else {
          setMaterials([]);
        }
      })
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'AbortError') return;
        console.warn('[useMaterialsCatalog] Erro ao carregar catálogo:', err?.message);
        setError('Não foi possível carregar o catálogo. Você pode digitar o nome do item manualmente.');
        setMaterials([]);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [category]);

  return { materials, loading, error };
}
