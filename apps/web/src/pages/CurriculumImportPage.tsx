/**
 * CurriculumImportPage — Importação de Matriz Curricular via CSV
 *
 * Tarefa 3.3 — Motor Universal de Currículo (Fase 1)
 *
 * Fluxo:
 *  1. Usuário baixa o modelo CSV
 *  2. Preenche e faz upload
 *  3. Preview das primeiras linhas
 *  4. Confirma importação → POST /curriculum-matrices/import/csv
 *  5. Exibe relatório: importados, erros
 *
 * RBAC: MANTENEDORA, STAFF_CENTRAL, DEVELOPER
 */
import { useState } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Download,
  FileSpreadsheet,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { http } from '../api/http';
import { toast } from 'sonner';

// ── Modelo CSV para download ──────────────────────────────────────────────────
const CSV_MODELO = `data,campo_experiencia,objetivo_bncc,codigo_bncc,objetivo_curriculo,intencionalidade,exemplo_atividade
2026-02-02,O_EU_O_OUTRO_E_O_NOS,Demonstrar atitudes de cuidado e solidariedade na interação com crianças e adultos.,EI01EO01,Desenvolver a identidade pessoal e coletiva da criança.,Promover rodas de conversa sobre sentimentos e relações.,Roda de apresentação com fantoches.
2026-02-03,CORPO_GESTOS_E_MOVIMENTOS,Explorar formas de se deslocar no espaço combinando movimentos e seguindo orientações.,EI01CG01,Desenvolver a consciência corporal e a coordenação motora.,Circuito motor com obstáculos variados.,Percurso com bambolês e cones.
`;

// ── Parser CSV simples para preview ──────────────────────────────────────────
function parseCSVPreview(text: string, maxRows = 10): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows: string[][] = [];
  for (let i = 1; i <= Math.min(maxRows, lines.length - 1); i++) {
    const cols = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    rows.push(cols);
  }
  return { headers, rows };
}

function downloadModelo() {
  const blob = new Blob([CSV_MODELO], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo_matriz_curricular.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Componente ────────────────────────────────────────────────────────────────
export function CurriculumImportPage() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{
    matrixId: string;
    importados: number;
    erros: string[];
  } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);

  // Parâmetros da matriz
  const [nome, setNome] = useState('');
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [segmento, setSegmento] = useState('EI02');
  const [versao, setVersao] = useState('1');

  function handleArquivo(file: File) {
    setArquivo(file);
    setResultado(null);
    setErro(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setPreview(parseCSVPreview(text));
    };
    reader.readAsText(file, 'utf-8');
  }

  async function handleImportar() {
    if (!arquivo) return;
    if (!nome.trim()) { toast.error('Informe o nome da matriz'); return; }
    if (!segmento.trim()) { toast.error('Informe o segmento'); return; }

    setImportando(true);
    setErro(null);
    try {
      const form = new FormData();
      form.append('file', arquivo);
      form.append('name', nome.trim());
      form.append('year', ano);
      form.append('segment', segmento.trim());
      form.append('version', versao);

      const res = await http.post('/curriculum-matrices/import/csv', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResultado(res.data);
      toast.success(`${res.data.importados} entradas importadas com sucesso!`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao importar CSV';
      setErro(Array.isArray(msg) ? msg.join(', ') : msg);
      toast.error('Falha na importação');
    } finally {
      setImportando(false);
    }
  }

  return (
    <PageShell title="Importar Matriz Curricular" subtitle="Motor Universal de Currículo — Fase 1">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Passo 1 — Baixar modelo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4 text-indigo-600" />
              Passo 1 — Baixe o modelo CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              O arquivo CSV deve conter as colunas: <code className="bg-gray-100 px-1 rounded text-xs">data</code>,{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">campo_experiencia</code>,{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">objetivo_bncc</code>,{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">codigo_bncc</code>,{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">objetivo_curriculo</code>,{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">intencionalidade</code> (opcional),{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">exemplo_atividade</code> (opcional).
            </p>
            <Button variant="outline" size="sm" onClick={downloadModelo} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Baixar modelo CSV
            </Button>
          </CardContent>
        </Card>

        {/* Passo 2 — Parâmetros da matriz */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              Passo 2 — Identifique a matriz
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome da Matriz <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Ex: Matriz Curricular EI02 2026"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div>
              <Label>Segmento <span className="text-red-500">*</span></Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={segmento}
                onChange={(e) => setSegmento(e.target.value)}
              >
                <option value="EI01">EI01 — Bebês (0–1a6m)</option>
                <option value="EI02">EI02 — Crianças bem pequenas (1a7m–3a11m)</option>
                <option value="EI03">EI03 — Crianças pequenas (4a–5a11m)</option>
              </select>
            </div>
            <div>
              <Label>Ano letivo</Label>
              <Input
                type="number"
                min={2020}
                max={2030}
                value={ano}
                onChange={(e) => setAno(e.target.value)}
              />
            </div>
            <div>
              <Label>Versão</Label>
              <Input
                type="number"
                min={1}
                value={versao}
                onChange={(e) => setVersao(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Passo 3 — Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4 text-indigo-600" />
              Passo 3 — Selecione o arquivo CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-indigo-200 rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleArquivo(f);
              }}
            >
              <Upload className="h-8 w-8 text-indigo-400 mb-2" />
              <span className="text-sm text-gray-500">
                {arquivo ? arquivo.name : 'Arraste o CSV aqui ou clique para selecionar'}
              </span>
              <input
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleArquivo(f);
                }}
              />
            </label>

            {/* Preview */}
            {preview && preview.headers.length > 0 && (
              <div className="overflow-x-auto rounded-lg border">
                <table className="text-xs w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {preview.headers.map((h) => (
                        <th key={h} className="px-2 py-1 text-left font-medium text-gray-600 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} className="border-t">
                        {row.map((cell, j) => (
                          <td key={j} className="px-2 py-1 text-gray-700 max-w-[180px] truncate">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Button
              onClick={handleImportar}
              disabled={!arquivo || importando}
              className="w-full gap-2"
            >
              {importando ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>
              ) : (
                <><Upload className="h-4 w-4" /> Importar Matriz</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Resultado */}
        {resultado && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700 font-semibold">
                <CheckCircle2 className="h-5 w-5" />
                Importação concluída
              </div>
              <p className="text-sm text-green-800">
                <strong>{resultado.importados}</strong> entradas importadas com sucesso.
              </p>
              <p className="text-xs text-gray-500">ID da Matriz: <code>{resultado.matrixId}</code></p>
              {resultado.erros.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold text-amber-700">
                    {resultado.erros.length} linha(s) com erro:
                  </p>
                  {resultado.erros.slice(0, 10).map((e, i) => (
                    <Badge key={i} variant="outline" className="text-xs text-amber-700 border-amber-300 block">
                      {e}
                    </Badge>
                  ))}
                  {resultado.erros.length > 10 && (
                    <p className="text-xs text-gray-400">... e mais {resultado.erros.length - 10} erros</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Erro */}
        {erro && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4 flex items-start gap-2 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{erro}</p>
            </CardContent>
          </Card>
        )}

      </div>
    </PageShell>
  );
}
