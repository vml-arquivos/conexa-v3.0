import { useState, useEffect } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import http from '../api/http';
import {
  Camera,
  Plus,
  Eye,
  Upload,
  Globe,
  Lock,
  Image as ImageIcon,
  X,
  ChevronLeft,
  Calendar,
  BookOpen,
} from 'lucide-react';

interface FotoItem {
  url: string;
  legenda?: string;
  campoExperiencia?: string;
  criancas?: string[];
}

interface RelatorioFoto {
  id: string;
  titulo: string;
  descricao?: string;
  dataAtividade: string;
  publicado: boolean;
  publicadoEm?: string;
  classroomId: string;
  fotos: FotoItem[];
  criadoPorId: string;
}

const CAMPOS_EXPERIENCIA = [
  'O eu, o outro e o nós',
  'Corpo, gestos e movimentos',
  'Traços, sons, cores e formas',
  'Escuta, fala, pensamento e imaginação',
  'Espaços, tempos, quantidades, relações e transformações',
];

export default function RdxPage() {
  const [loading, setLoading] = useState(true);
  const [relatorios, setRelatorios] = useState<RelatorioFoto[]>([]);
  const [view, setView] = useState<'lista' | 'novo' | 'detalhe'>('lista');
  const [selected, setSelected] = useState<RelatorioFoto | null>(null);
  const [classrooms, setClassrooms] = useState<Array<{ id: string; name: string }>>([]);

  // Form state
  const [form, setForm] = useState({
    classroomId: '',
    titulo: '',
    descricao: '',
    dataAtividade: new Date().toISOString().split('T')[0],
    fotos: [] as FotoItem[],
  });
  const [novaFoto, setNovaFoto] = useState<FotoItem>({ url: '', legenda: '', campoExperiencia: '' });
  const [saving, setSaving] = useState(false);
  const [publicando, setPublicando] = useState(false);

  useEffect(() => {
    loadRelatorios();
    loadClassrooms();
  }, []);

  async function loadRelatorios() {
    try {
      setLoading(true);
      const res = await http.get('/rdx');
      setRelatorios(res.data);
    } catch {
      toast.error('Erro ao carregar relatórios de fotos');
    } finally {
      setLoading(false);
    }
  }

  async function loadClassrooms() {
    try {
      const res = await http.get('/classrooms');
      setClassrooms(res.data ?? []);
      if (res.data?.length > 0) {
        setForm((f) => ({ ...f, classroomId: res.data[0].id }));
      }
    } catch {
      // silencioso
    }
  }

  function adicionarFoto() {
    if (!novaFoto.url) {
      toast.error('URL da foto é obrigatória');
      return;
    }
    setForm((f) => ({ ...f, fotos: [...f.fotos, { ...novaFoto }] }));
    setNovaFoto({ url: '', legenda: '', campoExperiencia: '' });
  }

  function removerFoto(index: number) {
    setForm((f) => ({ ...f, fotos: f.fotos.filter((_, i) => i !== index) }));
  }

  async function criarRelatorio() {
    if (!form.classroomId || !form.titulo || !form.dataAtividade) {
      toast.error('Turma, título e data são obrigatórios');
      return;
    }
    try {
      setSaving(true);
      const res = await http.post('/rdx', form);
      toast.success('Relatório de fotos criado!');
      setRelatorios((prev) => [res.data, ...prev]);
      setView('lista');
      setForm({
        classroomId: classrooms[0]?.id ?? '',
        titulo: '',
        descricao: '',
        dataAtividade: new Date().toISOString().split('T')[0],
        fotos: [],
      });
    } catch {
      toast.error('Erro ao criar relatório');
    } finally {
      setSaving(false);
    }
  }

  async function publicarRelatorio(id: string) {
    try {
      setPublicando(true);
      await http.patch(`/rdx/${id}/publicar`);
      toast.success('Relatório publicado para as famílias!');
      loadRelatorios();
      if (selected?.id === id) {
        setSelected((prev) => prev ? { ...prev, publicado: true } : null);
      }
    } catch {
      toast.error('Erro ao publicar relatório');
    } finally {
      setPublicando(false);
    }
  }

  if (loading) return <LoadingState message="Carregando relatórios de fotos..." />;

  // ─── Detalhe ────────────────────────────────────────────────────────────────
  if (view === 'detalhe' && selected) {
    return (
      <PageShell
        title={selected.titulo}
        description={`Atividade: ${new Date(selected.dataAtividade).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`}
        headerActions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setView('lista')}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            {!selected.publicado && (
              <Button
                size="sm"
                onClick={() => publicarRelatorio(selected.id)}
                disabled={publicando}
                className="bg-green-600 hover:bg-green-700"
              >
                <Globe className="h-4 w-4 mr-1" />
                {publicando ? 'Publicando...' : 'Publicar para Famílias'}
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3">
            <Badge variant={selected.publicado ? 'default' : 'secondary'} className="flex items-center gap-1">
              {selected.publicado ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {selected.publicado ? 'Publicado' : 'Rascunho'}
            </Badge>
            {selected.publicadoEm && (
              <span className="text-xs text-muted-foreground">
                Publicado em {new Date(selected.publicadoEm).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>

          {/* Descrição */}
          {selected.descricao && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-700">{selected.descricao}</p>
              </CardContent>
            </Card>
          )}

          {/* Fotos */}
          {selected.fotos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Nenhuma foto adicionada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selected.fotos.map((foto, idx) => (
                <Card key={idx} className="overflow-hidden">
                  <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                    <img
                      src={foto.url}
                      alt={foto.legenda ?? `Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '';
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <CardContent className="pt-3 pb-3">
                    {foto.legenda && <p className="text-sm font-medium">{foto.legenda}</p>}
                    {foto.campoExperiencia && (
                      <Badge variant="outline" className="text-xs mt-1">
                        <BookOpen className="h-3 w-3 mr-1" />
                        {foto.campoExperiencia}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PageShell>
    );
  }

  // ─── Novo Relatório ──────────────────────────────────────────────────────────
  if (view === 'novo') {
    return (
      <PageShell
        title="Novo Relatório de Fotos"
        description="Registre as atividades da turma com fotos e campos de experiência"
        headerActions={
          <Button variant="outline" size="sm" onClick={() => setView('lista')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
        }
      >
        <div className="space-y-6 max-w-2xl">
          {/* Dados básicos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações da Atividade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Turma *</label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  value={form.classroomId}
                  onChange={(e) => setForm({ ...form, classroomId: e.target.value })}
                >
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Título do Relatório *</label>
                <input
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  placeholder="Ex: Atividade de Artes — Pinturas com guache"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Data da Atividade *</label>
                <input
                  type="date"
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  value={form.dataAtividade}
                  onChange={(e) => setForm({ ...form, dataAtividade: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Descrição da Atividade</label>
                <textarea
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  rows={3}
                  placeholder="Descreva a atividade realizada, objetivos e observações..."
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Adicionar fotos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Fotos da Atividade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fotos adicionadas */}
              {form.fotos.length > 0 && (
                <div className="space-y-2">
                  {form.fotos.map((foto, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                      <ImageIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate text-blue-600">{foto.url}</p>
                        {foto.legenda && <p className="text-xs text-muted-foreground">{foto.legenda}</p>}
                        {foto.campoExperiencia && (
                          <Badge variant="outline" className="text-xs mt-1">{foto.campoExperiencia}</Badge>
                        )}
                      </div>
                      <button
                        onClick={() => removerFoto(idx)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulário nova foto */}
              <div className="border rounded-lg p-4 space-y-3 bg-blue-50">
                <p className="text-sm font-medium text-blue-800">Adicionar Foto</p>
                <div>
                  <label className="text-xs font-medium text-gray-600">URL da Foto *</label>
                  <input
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                    placeholder="https://... (URL da imagem)"
                    value={novaFoto.url}
                    onChange={(e) => setNovaFoto({ ...novaFoto, url: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Legenda</label>
                  <input
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                    placeholder="Descreva o que está acontecendo na foto..."
                    value={novaFoto.legenda}
                    onChange={(e) => setNovaFoto({ ...novaFoto, legenda: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Campo de Experiência (BNCC)</label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                    value={novaFoto.campoExperiencia}
                    onChange={(e) => setNovaFoto({ ...novaFoto, campoExperiencia: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {CAMPOS_EXPERIENCIA.map((ce) => (
                      <option key={ce} value={ce}>{ce}</option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={adicionarFoto}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Foto
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Salvar */}
          <Button
            onClick={criarRelatorio}
            disabled={saving}
            className="w-full"
            size="lg"
          >
            {saving ? 'Salvando...' : 'Salvar Relatório de Fotos'}
          </Button>
        </div>
      </PageShell>
    );
  }

  // ─── Lista ───────────────────────────────────────────────────────────────────
  return (
    <PageShell
      title="Relatório de Fotos (RDX)"
      description="Registre e compartilhe atividades pedagógicas com as famílias"
      headerActions={
        <Button onClick={() => setView('novo')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Relatório
        </Button>
      }
    >
      {relatorios.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Camera className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-2">Nenhum relatório de fotos</p>
          <p className="text-sm mb-6">Crie seu primeiro relatório para compartilhar atividades com as famílias</p>
          <Button onClick={() => setView('novo')}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Relatório
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {relatorios.map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => { setSelected(r); setView('detalhe'); }}
            >
              {/* Thumbnail da primeira foto */}
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-t-lg flex items-center justify-center overflow-hidden">
                {r.fotos.length > 0 && r.fotos[0].url ? (
                  <img
                    src={r.fotos[0].url}
                    alt={r.titulo}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Camera className="h-12 w-12 text-blue-300" />
                )}
              </div>

              <CardContent className="pt-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-sm line-clamp-2">{r.titulo}</h3>
                  <Badge
                    variant={r.publicado ? 'default' : 'secondary'}
                    className="text-xs flex-shrink-0"
                  >
                    {r.publicado ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  </Badge>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(r.dataAtividade).toLocaleDateString('pt-BR')}</span>
                  <span className="mx-1">·</span>
                  <Camera className="h-3 w-3" />
                  <span>{r.fotos.length} foto(s)</span>
                </div>

                {r.descricao && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{r.descricao}</p>
                )}

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={(e) => { e.stopPropagation(); setSelected(r); setView('detalhe'); }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                  {!r.publicado && (
                    <Button
                      size="sm"
                      className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                      onClick={(e) => { e.stopPropagation(); publicarRelatorio(r.id); }}
                      disabled={publicando}
                    >
                      <Globe className="h-3 w-3 mr-1" />
                      Publicar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
