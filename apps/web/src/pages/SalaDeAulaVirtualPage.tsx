import { useState, useEffect, useRef } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { toast } from 'sonner';
import http from '../api/http';
import {
  GraduationCap, Plus, Save, RefreshCw, BookOpen, Star, Users,
  FileText, Image, Paperclip, ChevronDown, ChevronUp, BarChart2,
  CheckCircle, Clock, AlertCircle, UserCircle, Trash2, Eye,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ClassroomPost {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  dueDate?: string;
  createdAt: string;
  createdBy: string;
  classroom?: { id: string; name: string };
  files: PostFile[];
  performances: StudentPerformance[];
}

interface PostFile {
  id: string;
  nomeOriginal: string;
  url: string;
  mimeType: string;
}

interface StudentPerformance {
  id: string;
  childId: string;
  performance: string;
  notes?: string;
  child?: { id: string; firstName: string; lastName: string; photoUrl?: string };
}

interface Crianca {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
}

interface Turma {
  id: string;
  name: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const TIPOS_POST = [
  { id: 'TAREFA', label: 'Tarefa', emoji: '📋', cor: 'bg-blue-100 text-blue-700' },
  { id: 'ATIVIDADE', label: 'Atividade', emoji: '✏️', cor: 'bg-green-100 text-green-700' },
  { id: 'AVISO', label: 'Aviso', emoji: '📢', cor: 'bg-yellow-100 text-yellow-700' },
  { id: 'MATERIAL', label: 'Material', emoji: '📚', cor: 'bg-purple-100 text-purple-700' },
  { id: 'REGISTRO', label: 'Registro', emoji: '📸', cor: 'bg-pink-100 text-pink-700' },
  { id: 'PLANEJAMENTO', label: 'Planejamento', emoji: '🎯', cor: 'bg-indigo-100 text-indigo-700' },
];

const DESEMPENHOS = [
  { id: 'EXCELENTE', label: 'Excelente', emoji: '⭐', cor: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { id: 'BOM', label: 'Bom', emoji: '😊', cor: 'bg-green-100 text-green-700 border-green-300' },
  { id: 'REGULAR', label: 'Regular', emoji: '😐', cor: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'PRECISA_APOIO', label: 'Precisa de Apoio', emoji: '🤝', cor: 'bg-orange-100 text-orange-700 border-orange-300' },
  { id: 'NAO_AVALIADO', label: 'Não Avaliado', emoji: '⬜', cor: 'bg-gray-100 text-gray-500 border-gray-200' },
];

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function SalaDeAulaVirtualPage() {
  const [aba, setAba] = useState<'feed' | 'novo' | 'desempenho'>('feed');
  const [posts, setPosts] = useState<ClassroomPost[]>([]);
  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [postDesempenho, setPostDesempenho] = useState<ClassroomPost | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'TAREFA',
    status: 'PUBLICADO',
    dueDate: '',
  });

  const [desempenhoMap, setDesempenhoMap] = useState<Record<string, { performance: string; notes: string }>>({});

  useEffect(() => {
    loadTurmas();
  }, []);

  useEffect(() => {
    if (turmaId) {
      loadPosts();
      loadCriancas();
    }
  }, [turmaId, filterType]);

  async function loadTurmas() {
    try {
      const res = await http.get('/teachers/minhas-turmas');
      const lista: Turma[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setTurmas(lista);
      if (lista.length > 0) setTurmaId(lista[0].id);
    } catch {
      setTurmas([]);
    }
  }

  async function loadPosts() {
    setLoading(true);
    try {
      const params: Record<string, string> = { classroomId: turmaId };
      if (filterType) params.type = filterType;
      const res = await http.get('/classroom-posts', { params });
      setPosts(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCriancas() {
    try {
      const res = await http.get(`/classrooms/${turmaId}/children`);
      setCriancas(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
    } catch {
      setCriancas([]);
    }
  }

  async function criarPost() {
    if (!form.title.trim()) { toast.error('Informe o título'); return; }
    if (!form.content.trim()) { toast.error('Informe o conteúdo'); return; }
    if (!turmaId) { toast.error('Selecione uma turma'); return; }
    setSaving(true);
    try {
      await http.post('/classroom-posts', {
        classroomId: turmaId,
        ...form,
        dueDate: form.dueDate || null,
      });
      toast.success('Post criado com sucesso!');
      setForm({ title: '', content: '', type: 'TAREFA', status: 'PUBLICADO', dueDate: '' });
      setAba('feed');
      loadPosts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao criar post');
    } finally {
      setSaving(false);
    }
  }

  async function abrirDesempenho(post: ClassroomPost) {
    setPostDesempenho(post);
    // Pré-carregar desempenhos existentes
    const map: Record<string, { performance: string; notes: string }> = {};
    post.performances?.forEach(p => {
      map[p.childId] = { performance: p.performance, notes: p.notes ?? '' };
    });
    // Inicializar crianças sem desempenho
    criancas.forEach(c => {
      if (!map[c.id]) map[c.id] = { performance: 'NAO_AVALIADO', notes: '' };
    });
    setDesempenhoMap(map);
    setAba('desempenho');
  }

  async function salvarDesempenhos() {
    if (!postDesempenho) return;
    setSaving(true);
    try {
      const promises = Object.entries(desempenhoMap).map(([childId, val]) =>
        http.post(`/classroom-posts/${postDesempenho.id}/desempenho`, {
          childId,
          performance: val.performance,
          notes: val.notes,
        })
      );
      await Promise.all(promises);
      toast.success('Desempenhos salvos com sucesso!');
      setAba('feed');
      loadPosts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar desempenhos');
    } finally {
      setSaving(false);
    }
  }

  async function deletarPost(id: string) {
    if (!confirm('Deseja excluir este post?')) return;
    try {
      await http.delete(`/classroom-posts/${id}`);
      toast.success('Post excluído');
      loadPosts();
    } catch {
      toast.error('Erro ao excluir post');
    }
  }

  function getTipoInfo(tipo: string) {
    return TIPOS_POST.find(t => t.id === tipo) ?? TIPOS_POST[0];
  }

  function getDesempenhoInfo(d: string) {
    return DESEMPENHOS.find(x => x.id === d) ?? DESEMPENHOS[4];
  }

  return (
    <PageShell title="Sala de Aula Virtual" subtitle="Gerencie tarefas, atividades e o desempenho individual de cada aluno">
      {/* ─── Seletor de turma ─── */}
      {turmas.length > 1 && (
        <div className="flex items-center gap-3 mb-4">
          <Label className="text-sm font-medium text-gray-600">Turma:</Label>
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={turmaId}
            onChange={e => setTurmaId(e.target.value)}
          >
            {turmas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      {/* ─── Abas ─── */}
      <div className="flex gap-2 flex-wrap mb-6">
        {[
          { id: 'feed', label: 'Feed da Turma', icon: <BookOpen className="h-4 w-4" /> },
          { id: 'novo', label: 'Novo Post', icon: <Plus className="h-4 w-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setAba(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              aba === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── FEED DA TURMA ─── */}
      {aba === 'feed' && (
        <div className="space-y-4 max-w-3xl">
          {/* Filtro por tipo */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterType('')}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${!filterType ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
            >
              Todos
            </button>
            {TIPOS_POST.map(t => (
              <button
                key={t.id}
                onClick={() => setFilterType(filterType === t.id ? '' : t.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${filterType === t.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>

          {loading && <LoadingState message="Carregando posts..." />}
          {!loading && posts.length === 0 && (
            <EmptyState
              title="Nenhum post ainda"
              description="Crie o primeiro post da turma clicando em 'Novo Post'"
              action={<Button onClick={() => setAba('novo')}><Plus className="h-4 w-4 mr-2" /> Criar Primeiro Post</Button>}
            />
          )}

          {posts.map(post => {
            const tipoInfo = getTipoInfo(post.type);
            const isExpanded = expandedPost === post.id;
            const totalAlunos = criancas.length;
            const avaliados = post.performances?.filter(p => p.performance !== 'NAO_AVALIADO').length ?? 0;

            return (
              <Card key={post.id} className="border-2 hover:border-indigo-100 transition-all">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tipoInfo.cor}`}>
                          {tipoInfo.emoji} {tipoInfo.label}
                        </span>
                        {post.dueDate && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(post.dueDate).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {post.status === 'RASCUNHO' && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Rascunho</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-800 text-base">{post.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{post.content}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => abrirDesempenho(post)} title="Registrar desempenho">
                        <BarChart2 className="h-4 w-4 text-indigo-500" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setExpandedPost(isExpanded ? null : post.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deletarPost(post.id)} title="Excluir">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </div>

                  {/* Barra de progresso de desempenho */}
                  {totalAlunos > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${(avaliados / totalAlunos) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{avaliados}/{totalAlunos} avaliados</span>
                    </div>
                  )}

                  {/* Expandido: detalhes e desempenhos */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.content}</p>

                      {post.files?.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-500 uppercase">Arquivos</p>
                          {post.files.map(f => (
                            <a key={f.id} href={f.url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
                              <Paperclip className="h-3 w-3" /> {f.nomeOriginal}
                            </a>
                          ))}
                        </div>
                      )}

                      {post.performances?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-500 uppercase">Desempenho dos Alunos</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {post.performances.map(p => {
                              const d = getDesempenhoInfo(p.performance);
                              return (
                                <div key={p.id} className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${d.cor}`}>
                                  {p.child?.photoUrl ? (
                                    <img src={p.child.photoUrl} className="w-6 h-6 rounded-full object-cover" alt="" />
                                  ) : (
                                    <UserCircle className="w-6 h-6 opacity-50" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{p.child?.firstName}</p>
                                    <p className="opacity-75">{d.emoji} {d.label}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-400">
                        Publicado em {new Date(post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── NOVO POST ─── */}
      {aba === 'novo' && (
        <div className="space-y-6 max-w-2xl">
          <Card className="border-2 border-indigo-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-700">
                <Plus className="h-5 w-5" /> Criar Novo Post
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tipo */}
              <div>
                <Label className="mb-2 block">Tipo de Post</Label>
                <div className="flex flex-wrap gap-2">
                  {TIPOS_POST.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: t.id }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-all ${
                        form.type === t.id
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-200'
                      }`}
                    >
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Título */}
              <div>
                <Label>Título *</Label>
                <Input
                  placeholder="Ex: Atividade de Artes — Pintura com dedos"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              {/* Conteúdo */}
              <div>
                <Label>Descrição / Conteúdo *</Label>
                <Textarea
                  placeholder="Descreva a atividade, tarefa ou aviso em detalhes..."
                  rows={5}
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                />
              </div>

              {/* Data limite */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Limite (opcional)</Label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.dueDate}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="PUBLICADO">Publicado</option>
                    <option value="RASCUNHO">Rascunho</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={criarPost} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                  {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Publicar Post
                </Button>
                <Button variant="outline" onClick={() => setAba('feed')}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── DESEMPENHO DOS ALUNOS ─── */}
      {aba === 'desempenho' && postDesempenho && (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <BarChart2 className="h-6 w-6 text-indigo-600" />
              <div>
                <h2 className="font-semibold text-indigo-800">{postDesempenho.title}</h2>
                <p className="text-sm text-indigo-600">Registre o desempenho individual de cada aluno nesta atividade</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {criancas.map(crianca => {
              const val = desempenhoMap[crianca.id] ?? { performance: 'NAO_AVALIADO', notes: '' };
              return (
                <Card key={crianca.id} className="border-2 hover:border-indigo-100 transition-all">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      {crianca.photoUrl ? (
                        <img src={crianca.photoUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                          <UserCircle className="w-6 h-6 text-indigo-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-800">{crianca.firstName} {crianca.lastName}</p>
                      </div>
                    </div>

                    {/* Seletor de desempenho */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {DESEMPENHOS.map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setDesempenhoMap(m => ({ ...m, [crianca.id]: { ...val, performance: d.id } }))}
                          className={`px-2 py-1 rounded-lg text-xs font-medium border-2 transition-all ${
                            val.performance === d.id ? d.cor + ' border-current shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {d.emoji} {d.label}
                        </button>
                      ))}
                    </div>

                    {/* Observação */}
                    <Textarea
                      placeholder="Observação sobre o desempenho deste aluno (opcional)..."
                      rows={2}
                      className="text-sm"
                      value={val.notes}
                      onChange={e => setDesempenhoMap(m => ({ ...m, [crianca.id]: { ...val, notes: e.target.value } }))}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button onClick={salvarDesempenhos} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
              {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Salvar Desempenhos
            </Button>
            <Button variant="outline" onClick={() => setAba('feed')}>Cancelar</Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
