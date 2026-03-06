import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  FileSpreadsheet,
  Info,
  Eye,
} from 'lucide-react';
import { importCatalog, type ImportResult } from '../api/catalog';
import { getMaterialsCatalog, type MaterialCatalogItem } from '../api/materials-catalog';
import { useAuth } from '../app/AuthProvider';
import { normalizeRoles } from '../app/RoleProtectedRoute';
import { useUnitScope } from '../contexts/UnitScopeContext';
import { UnitScopeSelector } from '../components/select/UnitScopeSelector';

// ── Modelo CSV para download ──────────────────────────────────────────────────
const CSV_MODELO = `codigo,descricao,categoria,unidade_medida,preco_unit,fornecedor
001,Lápis de cor 12 cores,PEDAGOGICO,cx,12.50,Faber-Castell
002,Papel A4 500fls,PEDAGOGICO,resma,25.90,Chamex
003,Sabonete líquido 500ml,HIGIENE,un,8.75,Dove
004,Papel higiênico 4 rolos,HIGIENE,pct,6.90,Scott
005,Resma papel ofício,ADMINISTRATIVO,resma,22.00,Chamex
`;

// ── Parser CSV simples para preview ──────────────────────────────────────────
function parseCSVPreview(text: string, maxRows = 20): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: string[][] = [];
  for (let i = 1; i <= Math.min(maxRows, lines.length - 1); i++) {
    const cols = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    rows.push(cols);
  }
  return { headers, rows };
}

// ── Badge de categoria ────────────────────────────────────────────────────────
function CategoriaBadge({ cat }: { cat: string }) {
  const colors: Record<string, string> = {
    PEDAGOGICO: 'bg-blue-50 text-blue-700',
    HIGIENE: 'bg-green-50 text-green-700',
    ADMINISTRATIVO: 'bg-purple-50 text-purple-700',
  };
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${colors[cat] ?? 'bg-gray-100 text-gray-600'}`}>
      {cat}
    </span>
  );
}

function downloadModelo() {
  const blob = new Blob([CSV_MODELO], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo_catalogo.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Componente ────────────────────────────────────────────────────────────────

export function CatalogImportPage() {
  const { user } = useAuth();
  const roles = normalizeRoles(user);
  const isMantenedora = roles.includes('MANTENEDORA') || roles.includes('DEVELOPER');
  const isCentral = roles.includes('STAFF_CENTRAL');
  const { selectedUnitId: ctxUnitId } = useUnitScope();

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Preview do arquivo (antes de importar)
  const [previewArquivo, setPreviewArquivo] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [totalLinhasArquivo, setTotalLinhasArquivo] = useState(0);

  // Catálogo atual
  const [catalogoAtual, setCatalogoAtual] = useState<MaterialCatalogItem[]>([]);
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);

  const carregarCatalogo = useCallback(async () => {
    setCarregandoCatalogo(true);
    try {
      const items = await getMaterialsCatalog(
        filtroCategoria as 'PEDAGOGICO' | 'HIGIENE' | 'ADMINISTRATIVO' | undefined,
      );
      setCatalogoAtual(items);
    } catch {
      setCatalogoAtual([]);
    } finally {
      setCarregandoCatalogo(false);
    }
  }, [filtroCategoria]);

  useEffect(() => { void carregarCatalogo(); }, [carregarCatalogo]);

  const handleArquivo = (f: File | null) => {
    setArquivo(f);
    setResultado(null);
    setErro(null);
    setPreviewArquivo(null);
    setTotalLinhasArquivo(0);
    if (!f) return;
    if (f.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = e => {
        const text = e.target?.result as string;
        const allLines = text.split(/\r?\n/).filter(l => l.trim());
        setTotalLinhasArquivo(Math.max(0, allLines.length - 1));
        setPreviewArquivo(parseCSVPreview(text, 20));
      };
      reader.readAsText(f, 'utf-8');
    }
  };

  const handleImportar = async () => {
    if (!arquivo) { setErro('Selecione um arquivo CSV ou XLSX.'); return; }
    setImportando(true); setErro(null); setResultado(null);
    try {
      const unitId = (isMantenedora || isCentral) ? (ctxUnitId || undefined) : undefined;
      const res = await importCatalog(arquivo, unitId);
      setResultado(res);
      void carregarCatalogo();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao importar catálogo.');
    } finally { setImportando(false); }
  };

  const catalogoFiltrado = filtroCategoria
    ? catalogoAtual.filter(i => i.category === filtroCategoria)
    : catalogoAtual;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Catálogo de Produtos</h1>
          <p className="text-sm text-gray-500">Importe CSV ou XLSX para preencher o catálogo de preços da unidade</p>
        </div>
      </div>

      {/* Seletor de unidade (apenas MANTENEDORA/STAFF_CENTRAL) */}
      {(isMantenedora || isCentral) && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <label className="block text-xs font-medium text-gray-600 mb-2">Unidade de destino</label>
          <UnitScopeSelector compact />
        </div>
      )}

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 space-y-1">
          <p className="font-medium">Formato esperado do arquivo</p>
          <p>O arquivo deve ter as colunas: <code className="bg-blue-100 px-1 rounded">code</code>, <code className="bg-blue-100 px-1 rounded">name</code>, <code className="bg-blue-100 px-1 rounded">category</code>, <code className="bg-blue-100 px-1 rounded">unit</code>, <code className="bg-blue-100 px-1 rounded">price</code>, <code className="bg-blue-100 px-1 rounded">supplier</code>.</p>
          <p>Categorias aceitas: <strong>PEDAGOGICO</strong>, <strong>HIGIENE</strong>, LIMPEZA, ALIMENTACAO, OUTRO.</p>
          <p>O campo <code className="bg-blue-100 px-1 rounded">price</code> pode usar vírgula ou ponto decimal. Deixe em branco se não souber o preço.</p>
          <p>A importação faz <strong>upsert</strong> pelo código do produto — itens existentes são atualizados, novos são inseridos.</p>
        </div>
      </div>

      {/* Download modelo */}
      <div className="flex items-center gap-3">
        <button
          onClick={downloadModelo}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <Download className="h-4 w-4" /> Baixar modelo CSV
        </button>
        <span className="text-xs text-gray-400">Use como base para montar sua planilha</span>
      </div>

      {/* Upload */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Importar arquivo</h2>

        {/* Área de drop */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${arquivo ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) handleArquivo(f);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={e => handleArquivo(e.target.files?.[0] ?? null)}
          />
          {arquivo ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <p className="font-medium text-green-700">{arquivo.name}</p>
              <p className="text-xs text-green-600">{(arquivo.size / 1024).toFixed(1)} KB</p>
              <button
                onClick={e => { e.stopPropagation(); handleArquivo(null); if (inputRef.current) inputRef.current.value = ''; }}
                className="text-xs text-red-400 hover:text-red-600 mt-1"
              >
                Remover arquivo
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Upload className="h-8 w-8" />
              <p className="font-medium text-gray-600">Clique ou arraste o arquivo aqui</p>
              <p className="text-xs">CSV ou XLSX — máximo 10 MB</p>
            </div>
          )}
        </div>

        {/* Feedback */}
        {erro && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {resultado && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-green-700 font-medium">
              <CheckCircle2 className="h-5 w-5" /> Importação concluída
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <p className="text-2xl font-bold text-green-600">{resultado.inserted}</p>
                <p className="text-xs text-gray-500 mt-0.5">Inseridos</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <p className="text-2xl font-bold text-blue-600">{resultado.updated}</p>
                <p className="text-xs text-gray-500 mt-0.5">Atualizados</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <p className="text-2xl font-bold text-gray-400">{resultado.skipped}</p>
                <p className="text-xs text-gray-500 mt-0.5">Ignorados</p>
              </div>
            </div>
            {resultado.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-red-600 mb-1">{resultado.errors.length} erro(s):</p>
                <ul className="text-xs text-red-500 space-y-0.5 max-h-32 overflow-y-auto">
                  {resultado.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleImportar}
            disabled={!arquivo || importando}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {importando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importando ? 'Importando…' : 'Importar'}
          </button>
        </div>
      </div>

      {/* Preview do arquivo (antes de importar) */}
      {previewArquivo && previewArquivo.headers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              Preview do arquivo
              {totalLinhasArquivo > 20 && (
                <span className="text-xs text-gray-400 ml-1">(primeiras 20 de {totalLinhasArquivo} linhas)</span>
              )}
            </p>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                  {previewArquivo.headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewArquivo.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{cell || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Catálogo atual */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-semibold text-gray-800">
            Catálogo atual
            {catalogoAtual.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">({catalogoAtual.length} produto(s))</span>
            )}
          </h2>
          <div className="flex items-center gap-3">
            <select
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="">Todas as categorias</option>
              <option value="PEDAGOGICO">Pedagógico</option>
              <option value="HIGIENE">Higiene Pessoal</option>
              <option value="ADMINISTRATIVO">Administrativo</option>
            </select>
            <button
              onClick={carregarCatalogo}
              disabled={carregandoCatalogo}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className={`h-4 w-4 ${carregandoCatalogo ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {carregandoCatalogo ? (
          <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Carregando catálogo…
          </div>
        ) : catalogoFiltrado.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {filtroCategoria
                ? `Nenhum produto na categoria "${filtroCategoria}".`
                : 'Catálogo vazio. Importe um arquivo para começar.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-3 py-2 text-left">Código</th>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Categoria</th>
                  <th className="px-3 py-2 text-left">Unid.</th>
                  <th className="px-3 py-2 text-right">Preço Ref.</th>
                  <th className="px-3 py-2 text-left">Fornecedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {catalogoFiltrado.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5 font-mono text-xs text-gray-500">{item.code}</td>
                    <td className="px-3 py-1.5 font-medium text-gray-800">{item.name}</td>
                    <td className="px-3 py-1.5"><CategoriaBadge cat={item.category} /></td>
                    <td className="px-3 py-1.5 text-gray-500">{item.unit}</td>
                    <td className="px-3 py-1.5 text-right">
                      {item.referencePrice !== null
                        ? (item.referencePrice ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-1.5 text-gray-500">{item.supplier ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtroCategoria && (
              <p className="text-xs text-gray-400 mt-2 text-right">
                {catalogoFiltrado.length} produto(s) em "{filtroCategoria}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CatalogImportPage;
