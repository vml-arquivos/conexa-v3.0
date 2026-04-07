import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { isCentral, isMantenedora, isUnidade } from '../api/auth';
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
  Upload, History, TrendingUp, Brain, Heart, Activity, X, Camera,
} from 'lucide-react';
import { AlergiaAlert } from '../components/ui/AlergiaAlert';
import { ChildAvatar } from '../components/children/ChildAvatar';

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
  allergies?: string | null;
  medicalConditions?: string | null;
}

interface ObservacaoHistorico {
  id: string;
  date: string;
  category: string;
  learningProgress?: string;
  behaviorDescription?: string;
  planningParticipation?: string;
  emotionalState?: string;
  psychologicalNotes?: string;
  developmentAlerts?: string;
  recommendations?: string;
  atividadeTitulo?: string;
  atividadeDescricao?: string;
  atividadeArquivoUrl?: string;
  atividadeArquivoNome?: string;
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
  const navigate = useNavigate();
  const { user } = useAuth();
  // FIX P4: Coordenação (UNIDADE), Coordenação Geral (STAFF_CENTRAL) e Mantenedora
  // acessam em modo leitura — apenas professores podem criar posts na Sala de Aula Virtual
  const modoLeitura = isCentral(user) || isMantenedora(user) || isUnidade(user);
  const [aba, setAba] = useState<'feed' | 'novo' | 'desempenho' | 'alunos'>('feed');
  const [posts, setPosts] = useState<ClassroomPost[]>([]);
  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState<string>('');
  const [alunoSelecionado, setAlunoSelecionado] = useState<Crianca | null>(null);
  const [abaAluno, setAbaAluno] = useState<'registro' | 'hoje' | 'mes' | 'historico' | 'desenvolvimento' | 'rdic'>('registro');
  const [resumoAluno, setResumoAluno] = useState<any>(null);
  const [gerandoRdic, setGerandoRdic] = useState(false);
  const [anotacaoAluno, setAnotacaoAluno] = useState('');
  const [avaliacaoAluno, setAvaliacaoAluno] = useState('NAO_AVALIADO');
  const [atividadeTitulo, setAtividadeTitulo] = useState('');
  const [atividadeDescricao, setAtividadeDescricao] = useState('');
  const [participacaoAtividade, setParticipacaoAtividade] = useState('');
  const [estadoEmocional, setEstadoEmocional] = useState('');
  const [notasPsicologicas, setNotasPsicologicas] = useState('');
  const [alertasDesenvolvimento, setAlertasDesenvolvimento] = useState('');
  const [recomendacoes, setRecomendacoes] = useState('');
  const [arquivoAtividade, setArquivoAtividade] = useState<File | null>(null);
  const [arquivoPreview, setArquivoPreview] = useState<string>('');
  const [historicoAluno, setHistoricoAluno] = useState<ObservacaoHistorico[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [savingAluno, setSavingAluno] = useState(false);
  const fileInputAlunoRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [postDesempenho, setPostDesempenho] = useState<ClassroomPost | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !alunoSelecionado) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 5MB)'); return; }
    setUploadingFoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await http.post(`/children/${alunoSelecionado.id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.photoUrl || res.data?.url;
      if (url) {
        setAlunoSelecionado(prev => prev ? { ...prev, photoUrl: url } : prev);
        setCriancas(prev => prev.map(c => c.id === alunoSelecionado.id ? { ...c, photoUrl: url } : c));
        toast.success(`Foto de ${alunoSelecionado.firstName} atualizada!`);
      }
    } catch {
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setUploadingFoto(false);
      if (fotoInputRef.current) fotoInputRef.current.value = '';
    }
  }

  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'TAREFA',
    status: 'PUBLICADO',
    dueDate: '',
  });

  const [desempenhoMap, setDesempenhoMap] = useState<Record<string, { performance: string; notes: string }>>({});

  useEffect(() => {
    if (modoLeitura) {
      // Coordenação/Mantenedora: carrega posts de todas as turmas da unidade diretamente
      loadPosts();
    } else {
      // Professor: carrega turma principal via dashboard
      loadDashboard();
    }
  }, []);

  useEffect(() => {
    if (!modoLeitura && turmaId) {
      loadPosts();
    }
  }, [turmaId, filterType]);

  // Usa o mesmo endpoint que RdicCriancaPage e outras telas — retorna classroom + alunos
  async function loadDashboard() {
    try {
      const res = await http.get('/teachers/dashboard');
      const data = res.data;
      if (data?.hasClassroom === false || !data?.classroom) {
        setTurmas([]);
        return;
      }
      const turma: Turma = { id: data.classroom.id, name: data.classroom.name };
      setTurmas([turma]);
      setTurmaId(turma.id);
      // alunos já vêm do dashboard — sem segunda requisição
      const lista: Crianca[] = Array.isArray(data.alunos) ? data.alunos : [];
      setCriancas(lista);
    } catch {
      setTurmas([]);
      setCriancas([]);
    }
  }

  async function loadPosts() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      // Para professor, filtrar pela turma; para coordenação, o backend filtra automaticamente pela unidade
      if (turmaId) params.classroomId = turmaId;
      if (filterType) params.type = filterType;
      const res = await http.get('/classroom-posts', { params });
      setPosts(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
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

  async function selecionarAluno(c: Crianca) {
    setAlunoSelecionado(c);
    setAbaAluno('registro');
    setAnotacaoAluno('');
    setAvaliacaoAluno('NAO_AVALIADO');
    setAtividadeTitulo('');
    setAtividadeDescricao('');
    setParticipacaoAtividade('');
    setEstadoEmocional('');
    setNotasPsicologicas('');
    setAlertasDesenvolvimento('');
    setRecomendacoes('');
    setArquivoAtividade(null);
    setArquivoPreview('');
    // Carrega histórico em paralelo
    carregarHistoricoAluno(c.id);
  }

  async function carregarHistoricoAluno(childId: string) {
    setLoadingHistorico(true);
    try {
      const [resObs, resResumo] = await Promise.all([
        http.get('/development-observations', { params: { childId, limit: 100 } }),
        http.get(`/development-observations/resumo/${childId}`).catch(() => ({ data: null })),
      ]);
      setHistoricoAluno(Array.isArray(resObs.data) ? resObs.data : resObs.data?.data ?? []);
      setResumoAluno(resResumo.data);
    } catch {
      setHistoricoAluno([]);
      setResumoAluno(null);
    } finally {
      setLoadingHistorico(false);
    }
  }

  async function gerarRdicAutomatico() {
    if (!alunoSelecionado || !turmaId) return;
    setGerandoRdic(true);
    try {
      // Verifica se já existe RDIC para este período
      const anoAtual = new Date().getFullYear();
      const mesAtual = new Date().getMonth() + 1;
      const periodo = mesAtual <= 3 ? '1B' : mesAtual <= 6 ? '2B' : mesAtual <= 9 ? '3B' : '4B';
      // Monta o rascunhoJson a partir das observações coletadas
      const obsDoMes = historicoAluno.filter(h => {
        const d = new Date(h.date);
        return d.getFullYear() === anoAtual;
      });
      const avaliacoesCont = DESEMPENHOS.filter(d => d.id !== 'NAO_AVALIADO').reduce((acc: Record<string, number>, d) => {
        acc[d.id] = obsDoMes.filter(h => h.learningProgress === d.id).length;
        return acc;
      }, {});
      const avaliacaoMaisFreq = Object.entries(avaliacoesCont).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'NAO_AVALIADO';
      const observacoesTexto = obsDoMes
        .filter(h => h.behaviorDescription)
        .map(h => `• ${new Date(h.date).toLocaleDateString('pt-BR')}: ${h.behaviorDescription}`)
        .join('\n');
      const alertasTexto = obsDoMes
        .filter(h => h.developmentAlerts)
        .map(h => h.developmentAlerts)
        .join('; ');
      const psicologicoTexto = obsDoMes
        .filter(h => h.psychologicalNotes)
        .map(h => h.psychologicalNotes)
        .join('; ');
      const recomendacoesTexto = obsDoMes
        .filter(h => h.recommendations)
        .map(h => h.recommendations)
        .join('; ');
      const rascunhoJson = {
        avaliacaoGeral: avaliacaoMaisFreq,
        totalRegistros: obsDoMes.length,
        avaliacoesPorNivel: avaliacoesCont,
        observacoesComportamento: observacoesTexto || 'Sem observações registradas.',
        alertasDesenvolvimento: alertasTexto || 'Nenhum alerta registrado.',
        notasPsicologicas: psicologicoTexto || 'Sem observações psicológicas.',
        recomendacoes: recomendacoesTexto || 'Sem recomendações.',
        geradoAutomaticamente: true,
        geradoEm: new Date().toISOString(),
      };
      // Tenta criar o RDIC (se já existir, vai para a página de edição)
      try {
        await http.post('/rdic', {
          childId: alunoSelecionado.id,
          classroomId: turmaId,
          periodo,
          anoLetivo: anoAtual,
          rascunhoJson,
        });
        toast.success(`RDIC de ${alunoSelecionado.firstName} criado! Acesse RDIC por Criança para completar.`);
      } catch (err: any) {
        if (err?.response?.status === 400 && err?.response?.data?.message?.includes('Já existe')) {
          toast.info(`RDIC de ${alunoSelecionado.firstName} já existe para este período. Acesse RDIC por Criança para editar.`);
        } else {
          throw err;
        }
      }
      navigate('/app/rdic-crianca');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao gerar RDIC.');
    } finally {
      setGerandoRdic(false);
    }
  }

  function handleArquivoAtividade(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande. Máximo 10MB.'); return; }
    setArquivoAtividade(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => setArquivoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setArquivoPreview('');
    }
  }

  async function salvarRegistroAluno() {
    if (!alunoSelecionado) return;
    if (!atividadeTitulo.trim() && !anotacaoAluno.trim() && avaliacaoAluno === 'NAO_AVALIADO') {
      toast.error('Preencha ao menos o título da atividade, uma anotação ou a avaliação.');
      return;
    }
    setSavingAluno(true);
    try {
      // Upload de arquivo como base64 se houver
      let arquivoUrl = '';
      let arquivoNome = '';
      if (arquivoAtividade) {
        arquivoNome = arquivoAtividade.name;
        // Converte para base64 para envio
        arquivoUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = ev => resolve(ev.target?.result as string);
          reader.readAsDataURL(arquivoAtividade);
        });
      }

      await http.post('/development-observations', {
        childId: alunoSelecionado.id,
        classroomId: turmaId,
        date: new Date().toISOString(),
        category: 'ATIVIDADE',
        learningProgress: avaliacaoAluno !== 'NAO_AVALIADO' ? avaliacaoAluno : undefined,
        behaviorDescription: anotacaoAluno || undefined,
        planningParticipation: participacaoAtividade || undefined,
        emotionalState: estadoEmocional || undefined,
        psychologicalNotes: notasPsicologicas || undefined,
        developmentAlerts: alertasDesenvolvimento || undefined,
        recommendations: recomendacoes || undefined,
        // Campos extras para atividade
        atividadeTitulo: atividadeTitulo || undefined,
        atividadeDescricao: atividadeDescricao || undefined,
        atividadeArquivoUrl: arquivoUrl || undefined,
        atividadeArquivoNome: arquivoNome || undefined,
      });

      toast.success(`Registro de ${alunoSelecionado.firstName} salvo com sucesso!`);
      // Limpa o formulário
      setAnotacaoAluno('');
      setAvaliacaoAluno('NAO_AVALIADO');
      setAtividadeTitulo('');
      setAtividadeDescricao('');
      setParticipacaoAtividade('');
      setEstadoEmocional('');
      setNotasPsicologicas('');
      setAlertasDesenvolvimento('');
      setRecomendacoes('');
      setArquivoAtividade(null);
      setArquivoPreview('');
      // Recarrega histórico
      carregarHistoricoAluno(alunoSelecionado.id);
      setAbaAluno('historico');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar. Tente novamente.');
    } finally {
      setSavingAluno(false);
    }
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
      {/* Turma carregada automaticamente — sem seletor visível para o professor */}
      {turmas.length > 0 && (
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
          <GraduationCap className="h-4 w-4 text-indigo-500" />
          <span className="font-medium text-gray-700">{turmas.find(t => t.id === turmaId)?.name ?? 'Minha Turma'}</span>
          <span className="text-gray-400">· {criancas.length} aluno{criancas.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* ─── Abas ─── */}
      <div className="flex gap-2 flex-wrap mb-6">
        {[
          { id: 'feed', label: 'Feed da Turma', icon: <BookOpen className="h-4 w-4" /> },
          { id: 'alunos', label: 'Meus Alunos', icon: <Users className="h-4 w-4" /> },
          // Aba de criação de post oculta para perfis em modo leitura
          ...(!modoLeitura ? [{ id: 'novo', label: 'Novo Post', icon: <Plus className="h-4 w-4" /> }] : []),
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
              description={modoLeitura ? 'Nenhum post publicado nesta turma.' : "Crie o primeiro post da turma clicando em 'Novo Post'"}
              action={!modoLeitura ? <Button onClick={() => setAba('novo')}><Plus className="h-4 w-4 mr-2" /> Criar Primeiro Post</Button> : undefined}
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
                                  <ChildAvatar
                                    child={p.child}
                                    sizeClassName="w-6 h-6"
                                    imageClassName="rounded-full object-cover"
                                    fallbackClassName="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center"
                                    iconClassName="w-6 h-6 opacity-50"
                                  />
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
      {aba === 'novo' && !modoLeitura && (
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

      {/* ─── MEUS ALUNOS — avaliação e anotações individuais ─── */}
      {aba === 'alunos' && (
        <div className="space-y-4 max-w-3xl">
          {!alunoSelecionado ? (
            <>
              <p className="text-sm text-gray-500">Selecione um aluno para registrar atividades, avaliações e acompanhar o desenvolvimento individual.</p>
              {criancas.length === 0 && <EmptyState title="Nenhum aluno encontrado" description="Verifique se a turma possui alunos cadastrados." />}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {criancas.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selecionarAluno(c)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-indigo-300 hover:shadow-md transition-all text-center"
                  >
                    <ChildAvatar
                      child={c}
                      sizeClassName="w-14 h-14"
                      imageClassName="rounded-full object-cover"
                      fallbackClassName="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center"
                      iconClassName="w-8 h-8 text-indigo-400"
                    />
                    <p className="text-sm font-medium text-gray-800 leading-tight">{c.firstName} {c.lastName}</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4 max-w-3xl">
              {/* ─── Cabeçalho do aluno ─── */}
              <div className="flex items-center gap-3 bg-white border-2 border-indigo-100 rounded-2xl p-4">
                <button onClick={() => setAlunoSelecionado(null)} className="text-indigo-600 hover:underline text-sm font-medium">← Voltar</button>
                <div className="relative">
                  <ChildAvatar
                    child={alunoSelecionado}
                    sizeClassName="w-12 h-12"
                    imageClassName="rounded-full object-cover"
                    fallbackClassName="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center"
                    iconClassName="w-7 h-7 text-indigo-400"
                  />
                  <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadFoto} />
                  <button
                    onClick={() => fotoInputRef.current?.click()}
                    disabled={uploadingFoto}
                    className="absolute bottom-0 right-0 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white hover:bg-indigo-600 transition-all shadow-md"
                    title="Adicionar foto"
                  >
                    {uploadingFoto ? <RefreshCw className="h-2.5 w-2.5 animate-spin" /> : <Camera className="h-2.5 w-2.5" />}
                  </button>
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-gray-900">{alunoSelecionado.firstName} {alunoSelecionado.lastName}</h2>
                  <p className="text-xs text-gray-500">{turmas[0]?.name} · {historicoAluno.length} registro(s)</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/app/diario-de-bordo')}>
                  <FileText className="h-3 w-3 mr-1" /> Diário
                </Button>
              </div>

              {/* ─── Alerta de Alergia ─── */}
              <AlergiaAlert
                childId={alunoSelecionado.id}
                allergies={alunoSelecionado.allergies}
                medicalConditions={alunoSelecionado.medicalConditions}
              />

              {/* ─── Abas internas do aluno ─── */}
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
                {[
                  { id: 'registro', label: 'Registrar', icon: <Plus className="h-3.5 w-3.5" /> },
                  { id: 'hoje', label: 'Hoje', icon: <Clock className="h-3.5 w-3.5" /> },
                  { id: 'mes', label: 'Este Mês', icon: <BarChart2 className="h-3.5 w-3.5" /> },
                  { id: 'historico', label: 'Histórico', icon: <History className="h-3.5 w-3.5" /> },
                  { id: 'desenvolvimento', label: 'Evolução', icon: <TrendingUp className="h-3.5 w-3.5" /> },
                  { id: 'rdic', label: 'RDIC', icon: <FileText className="h-3.5 w-3.5" /> },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAbaAluno(tab.id as typeof abaAluno)}
                    className={`flex-shrink-0 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      abaAluno === tab.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* ─── ABA: REGISTRAR ATIVIDADE ─── */}
              {abaAluno === 'registro' && (
                <Card className="border-2 border-indigo-50">
                  <CardContent className="pt-5 space-y-5">

                    {/* Título da atividade */}
                    <div>
                      <Label className="mb-1.5 block font-semibold text-sm">Título da Atividade <span className="text-gray-400 font-normal">(opcional)</span></Label>
                      <Input
                        placeholder="Ex: Pintura com tinta, Roda de conversa, Atividade de encaixe..."
                        value={atividadeTitulo}
                        onChange={e => setAtividadeTitulo(e.target.value)}
                      />
                    </div>

                    {/* Avaliação geral */}
                    <div>
                      <Label className="mb-2 block font-semibold text-sm">Como o aluno se saiu nesta atividade?</Label>
                      <div className="flex flex-wrap gap-2">
                        {DESEMPENHOS.map(d => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setAvaliacaoAluno(d.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-all ${
                              avaliacaoAluno === d.id ? d.cor + ' border-current shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            {d.emoji} {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Participação e comportamento */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-1.5 block font-semibold text-sm">Participação na Atividade</Label>
                        <Textarea
                          placeholder="O aluno participou? Como reagiu? Mostrou interesse?"
                          rows={3}
                          value={participacaoAtividade}
                          onChange={e => setParticipacaoAtividade(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="mb-1.5 block font-semibold text-sm">Estado Emocional</Label>
                        <Textarea
                          placeholder="Como estava o humor? Agitado, tranquilo, triste, alegre?"
                          rows={3}
                          value={estadoEmocional}
                          onChange={e => setEstadoEmocional(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Observações gerais */}
                    <div>
                      <Label className="mb-1.5 block font-semibold text-sm">Observações e Anotações Gerais</Label>
                      <Textarea
                        placeholder={`Registre tudo sobre ${alunoSelecionado.firstName}: comportamento, alimentação, interação com colegas, evolução, conquistas do dia...`}
                        rows={4}
                        value={anotacaoAluno}
                        onChange={e => setAnotacaoAluno(e.target.value)}
                      />
                    </div>

                    {/* Notas psicológicas e alertas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-1.5 flex items-center gap-1.5 font-semibold text-sm">
                          <Brain className="h-3.5 w-3.5 text-purple-500" /> Observações Psicológicas
                        </Label>
                        <Textarea
                          placeholder="Comportamentos que chamaram atenção, sinais de ansiedade, isolamento..."
                          rows={3}
                          value={notasPsicologicas}
                          onChange={e => setNotasPsicologicas(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="mb-1.5 flex items-center gap-1.5 font-semibold text-sm">
                          <AlertCircle className="h-3.5 w-3.5 text-orange-500" /> Alertas de Desenvolvimento
                        </Label>
                        <Textarea
                          placeholder="Dificuldades motoras, de linguagem, cognitivas que precisam de atenção..."
                          rows={3}
                          value={alertasDesenvolvimento}
                          onChange={e => setAlertasDesenvolvimento(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Recomendações */}
                    <div>
                      <Label className="mb-1.5 block font-semibold text-sm">Recomendações e Próximos Passos</Label>
                      <Textarea
                        placeholder="Sugestões para a coordenação, família ou próximas atividades..."
                        rows={2}
                        value={recomendacoes}
                        onChange={e => setRecomendacoes(e.target.value)}
                      />
                    </div>

                    {/* Upload de arquivo da atividade */}
                    <div>
                      <Label className="mb-2 block font-semibold text-sm">
                        <Upload className="h-3.5 w-3.5 inline mr-1.5" /> Anexar Registro da Atividade
                        <span className="text-gray-400 font-normal ml-1">(foto, PDF, imagem — máx. 10MB)</span>
                      </Label>
                      <input
                        ref={fileInputAlunoRef}
                        type="file"
                        accept="image/*,.pdf,.doc,.docx"
                        className="hidden"
                        onChange={handleArquivoAtividade}
                      />
                      {!arquivoAtividade ? (
                        <button
                          type="button"
                          onClick={() => fileInputAlunoRef.current?.click()}
                          className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                        >
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Clique para selecionar ou arraste o arquivo aqui</p>
                          <p className="text-xs text-gray-400 mt-1">Foto da atividade, trabalho feito, registro do dia</p>
                        </button>
                      ) : (
                        <div className="border-2 border-indigo-200 rounded-xl p-4 bg-indigo-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {arquivoPreview ? (
                                <img src={arquivoPreview} className="w-16 h-16 rounded-lg object-cover" alt="preview" />
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-indigo-100 flex items-center justify-center">
                                  <FileText className="h-8 w-8 text-indigo-400" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-800">{arquivoAtividade.name}</p>
                                <p className="text-xs text-gray-500">{(arquivoAtividade.size / 1024).toFixed(0)} KB</p>
                              </div>
                            </div>
                            <button
                              onClick={() => { setArquivoAtividade(null); setArquivoPreview(''); }}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={salvarRegistroAluno}
                      disabled={savingAluno}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 py-3"
                    >
                      {savingAluno ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Salvar Registro de {alunoSelecionado.firstName}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* ─── ABA: HISTÓRICO ─── */}
              {abaAluno === 'historico' && (
                <div className="space-y-3">
                  {loadingHistorico ? (
                    <LoadingState message="Carregando histórico..." />
                  ) : historicoAluno.length === 0 ? (
                    <EmptyState title="Nenhum registro ainda" description="Os registros de atividades e observações aparecerão aqui." />
                  ) : (
                    historicoAluno.map(obs => (
                      <Card key={obs.id} className="border hover:border-indigo-200 transition-all">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">
                                {obs.atividadeTitulo || (obs.category === 'ATIVIDADE' ? 'Registro de Atividade' : 'Observação Geral')}
                              </p>
                              <p className="text-xs text-gray-400">
                                {new Date(obs.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                              </p>
                            </div>
                            {obs.learningProgress && obs.learningProgress !== 'NAO_AVALIADO' && (
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                obs.learningProgress === 'EXCELENTE' ? 'bg-yellow-100 text-yellow-700' :
                                obs.learningProgress === 'BOM' ? 'bg-green-100 text-green-700' :
                                obs.learningProgress === 'REGULAR' ? 'bg-blue-100 text-blue-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {DESEMPENHOS.find(d => d.id === obs.learningProgress)?.emoji} {DESEMPENHOS.find(d => d.id === obs.learningProgress)?.label}
                              </span>
                            )}
                          </div>
                          {obs.behaviorDescription && <p className="text-sm text-gray-600 mb-2">{obs.behaviorDescription}</p>}
                          {obs.planningParticipation && (
                            <p className="text-xs text-gray-500"><span className="font-medium">Participação:</span> {obs.planningParticipation}</p>
                          )}
                          {obs.emotionalState && (
                            <p className="text-xs text-gray-500"><span className="font-medium">Estado emocional:</span> {obs.emotionalState}</p>
                          )}
                          {obs.developmentAlerts && (
                            <div className="mt-2 flex items-start gap-1.5 bg-orange-50 border border-orange-200 rounded-lg p-2">
                              <AlertCircle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                              <p className="text-xs text-orange-700">{obs.developmentAlerts}</p>
                            </div>
                          )}
                          {obs.atividadeArquivoUrl && (
                            <div className="mt-3">
                              {obs.atividadeArquivoUrl.startsWith('data:image') ? (
                                <img src={obs.atividadeArquivoUrl} className="w-full max-h-48 object-contain rounded-lg border" alt="atividade" />
                              ) : (
                                <a href={obs.atividadeArquivoUrl} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-indigo-600 text-xs hover:underline">
                                  <Paperclip className="h-3.5 w-3.5" /> {obs.atividadeArquivoNome || 'Ver arquivo'}
                                </a>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {/* ─── ABA: DESENVOLVIMENTO ─── */}
              {/* ─── ABA: HOJE ─── */}
              {abaAluno === 'hoje' && (
                <div className="space-y-3">
                  {loadingHistorico ? (
                    <LoadingState message="Carregando registros de hoje..." />
                  ) : (() => {
                    const hoje = new Date().toDateString();
                    const obsHoje = historicoAluno.filter(h => new Date(h.date).toDateString() === hoje);
                    return obsHoje.length === 0 ? (
                      <EmptyState
                        title="Nenhum registro hoje"
                        description={`Nenhuma atividade registrada para ${alunoSelecionado?.firstName} hoje. Vá para a aba Registrar para adicionar.`}
                      />
                    ) : (
                      obsHoje.map(obs => (
                        <Card key={obs.id} className="border-2 border-blue-100">
                          <CardContent className="pt-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-gray-800">{obs.atividadeTitulo || 'Registro do Dia'}</p>
                              {obs.learningProgress && obs.learningProgress !== 'NAO_AVALIADO' && (
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                                  {DESEMPENHOS.find(d => d.id === obs.learningProgress)?.emoji} {DESEMPENHOS.find(d => d.id === obs.learningProgress)?.label}
                                </span>
                              )}
                            </div>
                            {obs.behaviorDescription && <p className="text-sm text-gray-600"><strong>Comportamento:</strong> {obs.behaviorDescription}</p>}
                            {obs.planningParticipation && <p className="text-sm text-gray-600"><strong>Participação:</strong> {obs.planningParticipation}</p>}
                            {obs.emotionalState && <p className="text-sm text-gray-600"><strong>Estado emocional:</strong> {obs.emotionalState}</p>}
                            {obs.psychologicalNotes && (
                              <div className="bg-purple-50 rounded-lg p-2">
                                <p className="text-xs font-semibold text-purple-700">Observação Psicológica</p>
                                <p className="text-sm text-purple-800">{obs.psychologicalNotes}</p>
                              </div>
                            )}
                            {obs.developmentAlerts && (
                              <div className="bg-orange-50 rounded-lg p-2">
                                <p className="text-xs font-semibold text-orange-700">Alerta</p>
                                <p className="text-sm text-orange-800">{obs.developmentAlerts}</p>
                              </div>
                            )}
                            {obs.atividadeArquivoUrl && (
                              <a href={obs.atividadeArquivoUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
                                <Paperclip className="h-4 w-4" /> {obs.atividadeArquivoNome || 'Ver arquivo'}
                              </a>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    );
                  })()}
                </div>
              )}

              {/* ─── ABA: ESTE MÊS ─── */}
              {abaAluno === 'mes' && (
                <div className="space-y-3">
                  {loadingHistorico ? (
                    <LoadingState message="Carregando registros do mês..." />
                  ) : (() => {
                    const agora = new Date();
                    const obsMes = historicoAluno.filter(h => {
                      const d = new Date(h.date);
                      return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
                    });
                    const avaliacoesCont = DESEMPENHOS.filter(d => d.id !== 'NAO_AVALIADO').map(d => ({
                      ...d,
                      count: obsMes.filter(h => h.learningProgress === d.id).length,
                    }));
                    return (
                      <>
                        <Card className="border-2 border-indigo-50">
                          <CardHeader><CardTitle className="text-base">
                            {agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} — {obsMes.length} registros
                          </CardTitle></CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                              {avaliacoesCont.map(d => (
                                <div key={d.id} className={`rounded-xl p-3 text-center ${d.cor.split(' ')[0]} border`}>
                                  <p className="text-2xl">{d.emoji}</p>
                                  <p className="text-xs font-medium mt-1">{d.label}</p>
                                  <p className="text-xl font-bold">{d.count}</p>
                                  <p className="text-xs opacity-70">{obsMes.length > 0 ? Math.round((d.count / obsMes.length) * 100) : 0}%</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                        {obsMes.length === 0 ? (
                          <EmptyState title="Nenhum registro este mês" description="Adicione registros na aba Registrar." />
                        ) : (
                          obsMes.map(obs => (
                            <Card key={obs.id} className="border hover:border-indigo-200 transition-all">
                              <CardContent className="pt-3">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-xs text-gray-400">{new Date(obs.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
                                  {obs.learningProgress && obs.learningProgress !== 'NAO_AVALIADO' && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                      {DESEMPENHOS.find(d => d.id === obs.learningProgress)?.emoji} {DESEMPENHOS.find(d => d.id === obs.learningProgress)?.label}
                                    </span>
                                  )}
                                </div>
                                <p className="font-medium text-sm text-gray-800">{obs.atividadeTitulo || 'Observação'}</p>
                                {obs.behaviorDescription && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{obs.behaviorDescription}</p>}
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ─── ABA: RDIC ─── */}
              {abaAluno === 'rdic' && (
                <div className="space-y-4">
                  <Card className="border-2 border-indigo-100">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-600" />
                        Relatório de Desenvolvimento Individual da Criança (RDIC)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Resumo dos dados coletados */}
                      {loadingHistorico ? (
                        <LoadingState message="Calculando dados para o RDIC..." />
                      ) : (
                        <>
                          <div className="bg-blue-50 rounded-xl p-4">
                            <p className="text-sm font-semibold text-blue-800 mb-2">Dados coletados para gerar o RDIC:</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-indigo-600">{historicoAluno.length}</p>
                                <p className="text-xs text-gray-500">Registros totais</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-orange-500">{historicoAluno.filter(h => h.developmentAlerts).length}</p>
                                <p className="text-xs text-gray-500">Alertas registrados</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-purple-600">{historicoAluno.filter(h => h.psychologicalNotes).length}</p>
                                <p className="text-xs text-gray-500">Obs. psicológicas</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-green-600">
                                  {DESEMPENHOS.find(d => d.id === (Object.entries(
                                    DESEMPENHOS.filter(d => d.id !== 'NAO_AVALIADO').reduce((acc: Record<string, number>, d) => {
                                      acc[d.id] = historicoAluno.filter(h => h.learningProgress === d.id).length;
                                      return acc;
                                    }, {})
                                  ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'NAO_AVALIADO'))?.emoji ?? '❓'}
                                </p>
                                <p className="text-xs text-gray-500">Avaliação predominante</p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <p className="text-sm font-semibold text-amber-800 mb-1">O que acontece ao gerar o RDIC:</p>
                            <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                              <li>Um rascunho do RDIC é criado automaticamente com base nos seus registros</li>
                              <li>Você será redirecionado para a página RDIC por Criança para completar e enviar</li>
                              <li>A coordenadora revisará e aprovará o relatório final</li>
                              <li>Após publicado, fica disponível para coordenadora geral e psicóloga</li>
                            </ul>
                          </div>

                          <div className="flex gap-3">
                            <Button
                              onClick={gerarRdicAutomatico}
                              disabled={gerandoRdic || historicoAluno.length === 0}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                            >
                              {gerandoRdic ? (
                                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Gerando RDIC...</>
                              ) : (
                                <><FileText className="h-4 w-4 mr-2" /> Gerar RDIC de {alunoSelecionado?.firstName}</>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => navigate('/app/rdic-crianca')}
                              className="flex-1"
                            >
                              <Eye className="h-4 w-4 mr-2" /> Ver RDICs Existentes
                            </Button>
                          </div>

                          {historicoAluno.length === 0 && (
                            <p className="text-center text-sm text-gray-400">Adicione pelo menos 1 registro de atividade para gerar o RDIC.</p>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {abaAluno === 'desenvolvimento' && (
                <div className="space-y-4">
                  {loadingHistorico ? (
                    <LoadingState message="Calculando desenvolvimento..." />
                  ) : (
                    <>
                      {/* Resumo de avaliações */}
                      <Card className="border-2 border-indigo-50">
                        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-indigo-600" /> Resumo de Avaliações</CardTitle></CardHeader>
                        <CardContent>
                          {historicoAluno.length === 0 ? (
                            <p className="text-sm text-gray-400">Nenhum registro ainda.</p>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {DESEMPENHOS.filter(d => d.id !== 'NAO_AVALIADO').map(d => {
                                const count = historicoAluno.filter(h => h.learningProgress === d.id).length;
                                const pct = historicoAluno.length > 0 ? Math.round((count / historicoAluno.length) * 100) : 0;
                                return (
                                  <div key={d.id} className={`rounded-xl p-3 text-center ${d.cor.split(' ')[0]} border`}>
                                    <p className="text-2xl">{d.emoji}</p>
                                    <p className="text-xs font-medium mt-1">{d.label}</p>
                                    <p className="text-lg font-bold">{count}</p>
                                    <p className="text-xs opacity-70">{pct}%</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Alertas de desenvolvimento */}
                      {historicoAluno.filter(h => h.developmentAlerts).length > 0 && (
                        <Card className="border-2 border-orange-100">
                          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4 text-orange-500" /> Alertas de Desenvolvimento</CardTitle></CardHeader>
                          <CardContent className="space-y-2">
                            {historicoAluno.filter(h => h.developmentAlerts).map(h => (
                              <div key={h.id} className="flex items-start gap-2 bg-orange-50 rounded-lg p-3">
                                <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-400">{new Date(h.date).toLocaleDateString('pt-BR')}</p>
                                  <p className="text-sm text-orange-800">{h.developmentAlerts}</p>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {/* Observações psicológicas */}
                      {historicoAluno.filter(h => h.psychologicalNotes).length > 0 && (
                        <Card className="border-2 border-purple-100">
                          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="h-4 w-4 text-purple-500" /> Observações Psicológicas</CardTitle></CardHeader>
                          <CardContent className="space-y-2">
                            {historicoAluno.filter(h => h.psychologicalNotes).map(h => (
                              <div key={h.id} className="bg-purple-50 rounded-lg p-3">
                                <p className="text-xs text-gray-400">{new Date(h.date).toLocaleDateString('pt-BR')}</p>
                                <p className="text-sm text-purple-800">{h.psychologicalNotes}</p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {/* Recomendações */}
                      {historicoAluno.filter(h => h.recommendations).length > 0 && (
                        <Card className="border-2 border-green-100">
                          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Recomendações</CardTitle></CardHeader>
                          <CardContent className="space-y-2">
                            {historicoAluno.filter(h => h.recommendations).map(h => (
                              <div key={h.id} className="bg-green-50 rounded-lg p-3">
                                <p className="text-xs text-gray-400">{new Date(h.date).toLocaleDateString('pt-BR')}</p>
                                <p className="text-sm text-green-800">{h.recommendations}</p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── DESEMPENHO DOS ALUNOS (via post) ─── */}
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
                      <ChildAvatar
                        child={crianca}
                        sizeClassName="w-10 h-10"
                        imageClassName="rounded-full object-cover"
                        fallbackClassName="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center"
                        iconClassName="w-6 h-6 text-indigo-400"
                      />
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
