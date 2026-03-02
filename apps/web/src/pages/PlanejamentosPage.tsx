import React, { useState, useEffect } from 'react';
import { useAuth } from '../app/AuthProvider';
import { isProfessor, isUnidade } from '../api/auth';
import { submitPlanningForReview, approvePlanning, returnPlanning } from '../api/plannings';
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
  BookOpen, Calendar, Plus, Save, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, Sparkles, FileText,
  Users, Target, Lightbulb, RefreshCw, Eye, Edit3,
  Search, Star, BookMarked, Layers, Send, ThumbsUp, ThumbsDown,
  MessageSquare, Clock,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface MatrizEntry {
  id?: string;
  data: string;
  segmento: string;
  bimestre: number;
  semana: number;
  semana_tema?: string;
  campo_experiencia: string;
  campo_id: string;
  codigo_bncc: string;
  objetivo_bncc: string;
  objetivo_curriculo_movimento: string;
  intencionalidade_pedagogica: string;
  exemplo_atividade: string;
}

interface Planning {
  id: string;
  title: string;
  type: string;
  status: string;
  startDate?: string;    // campo real da API
  endDate?: string;      // campo real da API
  weekStart?: string;    // alias legado
  weekEnd?: string;      // alias legado
  classroomId?: string;
  classroom?: { id: string; name: string };
  createdByUser?: { firstName: string; lastName: string; email: string };
  reviewComment?: string;
  pedagogicalContent?: any;
  createdAt: string;
  updatedAt?: string;
}

interface Template {
  id: string;
  name: string;
  description?: string;
  type: string;
}

interface Classroom {
  id: string;
  name: string;
}

// ─── Campos de Experiência ────────────────────────────────────────────────────
const CAMPOS = [
  { id: 'eu-outro-nos', label: 'O eu, o outro e o nós', cor: 'bg-pink-100 text-pink-700 border-pink-300', emoji: '🤝' },
  { id: 'corpo-gestos', label: 'Corpo, gestos e movimentos', cor: 'bg-orange-100 text-orange-700 border-orange-300', emoji: '🕺' },
  { id: 'tracos-sons', label: 'Traços, sons, cores e formas', cor: 'bg-purple-100 text-purple-700 border-purple-300', emoji: '🎨' },
  { id: 'escuta-fala', label: 'Escuta, fala, pensamento e imaginação', cor: 'bg-blue-100 text-blue-700 border-blue-300', emoji: '📖' },
  { id: 'espacos-tempos', label: 'Espaços, tempos, quantidades, relações e transformações', cor: 'bg-green-100 text-green-700 border-green-300', emoji: '🔬' },
];

const STATUS_CONFIG: Record<string, { label: string; cor: string; icon: React.ReactNode }> = {
  RASCUNHO: { label: 'Rascunho', cor: 'bg-gray-100 text-gray-600', icon: <Edit3 className="h-3 w-3" /> },
  PUBLICADO: { label: 'Publicado', cor: 'bg-blue-100 text-blue-700', icon: <Eye className="h-3 w-3" /> },
  EM_EXECUCAO: { label: 'Em Execução', cor: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" /> },
  CONCLUIDO: { label: 'Concluído', cor: 'bg-emerald-100 text-emerald-700', icon: <Star className="h-3 w-3" /> },
  CANCELADO: { label: 'Cancelado', cor: 'bg-red-100 text-red-600', icon: <AlertCircle className="h-3 w-3" /> },
  // Fluxo de Revisão
  EM_REVISAO: { label: 'Em Revisão', cor: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3 w-3" /> },
  APROVADO: { label: 'Aprovado', cor: 'bg-teal-100 text-teal-700', icon: <ThumbsUp className="h-3 w-3" /> },
  DEVOLVIDO: { label: 'Devolvido', cor: 'bg-orange-100 text-orange-700', icon: <ThumbsDown className="h-3 w-3" /> },
};

// ─── Amostra da Matriz 2026 (fallback offline) ────────────────────────────────
const MATRIZ_SAMPLE: MatrizEntry[] = [
  { data: '09/02', segmento: 'EI01', bimestre: 1, semana: 1, semana_tema: 'Semana de acolhimento e inserção', campo_experiencia: 'O eu, o outro e o nós', campo_id: 'eu-outro-nos', codigo_bncc: 'EI01EO03', objetivo_bncc: 'Estabelecer vínculos afetivos com adultos e outras crianças, sentindo-se protegido e seguro no ambiente educativo.', objetivo_curriculo_movimento: 'Perceber o ambiente de educação coletiva como um local afetivo e protetor, que lhe transmite segurança e acolhimento.', intencionalidade_pedagogica: 'Favorecer a adaptação inicial dos bebês, promovendo vínculo, segurança emocional e sentimento de pertencimento ao espaço escolar.', exemplo_atividade: 'Acolhimento no tapete com músicas suaves, colo e exploração livre da sala com presença constante do adulto de referência.' },
  { data: '10/02', segmento: 'EI01', bimestre: 1, semana: 1, semana_tema: 'Semana de acolhimento e inserção', campo_experiencia: 'Corpo, gestos e movimentos', campo_id: 'corpo-gestos', codigo_bncc: 'EI01CG01', objetivo_bncc: 'Movimentar as partes do corpo para exprimir corporalmente emoções, necessidades e desejos.', objetivo_curriculo_movimento: 'Movimentar as partes do corpo para exprimir corporalmente emoções, necessidades e desejos.', intencionalidade_pedagogica: 'Estimular a expressão corporal como forma primordial de comunicação dos bebês.', exemplo_atividade: 'Brincadeiras corporais com músicas, espelho e gestos, valorizando movimentos espontâneos e expressões faciais.' },
  { data: '11/02', segmento: 'EI01', bimestre: 1, semana: 1, semana_tema: 'Semana de acolhimento e inserção', campo_experiencia: 'Traços, sons, cores e formas', campo_id: 'tracos-sons', codigo_bncc: 'EI01TS02', objetivo_bncc: 'Manipular materiais diversos e variados para explorar cores, formas, texturas e sons.', objetivo_curriculo_movimento: 'Manusear objetos e brinquedos coloridos.', intencionalidade_pedagogica: 'Ampliar a percepção visual e o interesse pelas cores por meio da exploração ativa de objetos.', exemplo_atividade: 'Cesto de brinquedos coloridos para exploração livre no chão, com nomeação das cores pelo adulto.' },
  { data: '12/02', segmento: 'EI01', bimestre: 1, semana: 1, semana_tema: 'Semana de acolhimento e inserção', campo_experiencia: 'Escuta, fala, pensamento e imaginação', campo_id: 'escuta-fala', codigo_bncc: 'EI01EF04', objetivo_bncc: 'Reconhecer quando é chamado por seu nome e reconhecer os nomes das pessoas com quem convive.', objetivo_curriculo_movimento: 'Reconhecer quando é chamado por seu nome e reconhecer os nomes das pessoas com quem convive.', intencionalidade_pedagogica: 'Fortalecer a identidade do bebê e o vínculo com os adultos e pares por meio do reconhecimento do nome.', exemplo_atividade: 'Roda de acolhimento com músicas e chamadas nominais, utilizando fotos das crianças e da equipe.' },
  { data: '13/02', segmento: 'EI01', bimestre: 1, semana: 1, semana_tema: 'Semana de acolhimento e inserção', campo_experiencia: 'Espaços, tempos, quantidades, relações e transformações', campo_id: 'espacos-tempos', codigo_bncc: 'EI01ET01', objetivo_bncc: 'Explorar o ambiente pela ação e observação, manipulando, experimentando e fazendo descobertas.', objetivo_curriculo_movimento: 'Explorar o ambiente pela ação e observação, manipulando, experimentando e fazendo descobertas.', intencionalidade_pedagogica: 'Incentivar a curiosidade e a exploração ativa dos espaços e objetos do cotidiano escolar.', exemplo_atividade: 'Exploração orientada da sala e do pátio com objetos dispostos para manipulação e observação livre.' },
  { data: '23/02', segmento: 'EI01', bimestre: 1, semana: 3, semana_tema: 'Semana letiva completa', campo_experiencia: 'O eu, o outro e o nós', campo_id: 'eu-outro-nos', codigo_bncc: 'EI01EO01', objetivo_bncc: 'Interagir com outras crianças e adultos, adaptando-se gradativamente às rotinas de cuidado.', objetivo_curriculo_movimento: 'Interagir com crianças de diferentes faixas etárias e com adultos, percebendo que suas ações têm efeitos nas outras pessoas e constituindo relações de amizade.', intencionalidade_pedagogica: 'Promover interações afetivas entre os bebês e os adultos, favorecendo a construção inicial de vínculos.', exemplo_atividade: 'Brincadeira livre em pequenos grupos, com mediação do adulto incentivando trocas de olhares, gestos e aproximações.' },
  { data: '09/03', segmento: 'EI02', bimestre: 1, semana: 5, semana_tema: 'Semana Distrital de Educação Inclusiva', campo_experiencia: 'O eu, o outro e o nós', campo_id: 'eu-outro-nos', codigo_bncc: 'EI02EO01', objetivo_bncc: 'Demonstrar atitudes de cuidado e solidariedade na interação com crianças e adultos.', objetivo_curriculo_movimento: 'Perceber que existem diferentes formas de se comunicar com as demais pessoas do convívio social.', intencionalidade_pedagogica: 'Favorecer o reconhecimento das múltiplas formas de comunicação nas interações cotidianas.', exemplo_atividade: 'Roda de interação com gestos, expressões faciais, balbucios e objetos sonoros, com mediação sensível do adulto.' },
  { data: '16/03', segmento: 'EI03', bimestre: 1, semana: 6, semana_tema: 'Semana do Uso Sustentável da Água', campo_experiencia: 'Espaços, tempos, quantidades, relações e transformações', campo_id: 'espacos-tempos', codigo_bncc: 'EI03ET01', objetivo_bncc: 'Estabelecer relações de comparação entre objetos, observando suas propriedades.', objetivo_curriculo_movimento: 'Explorar e descrever semelhanças e diferenças entre as propriedades dos objetos (textura, massa, tamanho).', intencionalidade_pedagogica: 'Estimular a observação e comparação de propriedades da água em diferentes estados e contextos do cotidiano.', exemplo_atividade: 'Experimento com água: observar, tocar, comparar água quente/fria, líquida/congelada, registrar descobertas em desenho.' },
  { data: '23/03', segmento: 'EI03', bimestre: 1, semana: 7, semana_tema: 'Semana letiva completa', campo_experiencia: 'Traços, sons, cores e formas', campo_id: 'tracos-sons', codigo_bncc: 'EI03TS01', objetivo_bncc: 'Utilizar sons produzidos por materiais, objetos e instrumentos musicais durante brincadeiras de faz de conta, encenações, criações musicais, festas.', objetivo_curriculo_movimento: 'Criar e recriar músicas, sons, ritmos e melodias com a voz, o corpo e instrumentos musicais.', intencionalidade_pedagogica: 'Estimular a criatividade musical e a expressão sonora como linguagem artística.', exemplo_atividade: 'Oficina de instrumentos com materiais recicláveis: garrafinhas com areia, caixas, tampinhas. Criação de ritmos coletivos.' },
  { data: '30/03', segmento: 'EI02', bimestre: 1, semana: 8, semana_tema: 'Semana letiva completa', campo_experiencia: 'Escuta, fala, pensamento e imaginação', campo_id: 'escuta-fala', codigo_bncc: 'EI02EF01', objetivo_bncc: 'Dialogar com crianças e adultos, expressando seus desejos, necessidades, sentimentos e opiniões.', objetivo_curriculo_movimento: 'Comunicar-se com outras pessoas usando movimentos, gestos, balbucios, fala e outras formas de expressão.', intencionalidade_pedagogica: 'Ampliar o vocabulário e a capacidade expressiva das crianças em situações cotidianas de comunicação.', exemplo_atividade: 'Roda de conversa sobre o fim de semana: cada criança traz um objeto de casa e conta sobre ele. Registro em painel coletivo.' },
];

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function PlanejamentosPage() {
  const { user } = useAuth();
  const ehProfessor = isProfessor(user);
  const ehCoordenador = isUnidade(user);
  const [aba, setAba] = useState<'meus' | 'novo' | 'matriz' | 'templates'>('meus');
  const [revisaoModal, setRevisaoModal] = useState<{ planningId: string; tipo: 'devolver' } | null>(null);
  const [comentarioRevisao, setComentarioRevisao] = useState('');
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [turmas, setTurmas] = useState<Classroom[]>([]);
  const [matrizEntries, setMatrizEntries] = useState<MatrizEntry[]>(MATRIZ_SAMPLE);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroSegmento, setFiltroSegmento] = useState('');
  const [busca, setBusca] = useState('');
  const [expandedPlanning, setExpandedPlanning] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    type: 'SEMANAL',
    classroomId: '',
    weekStart: '',
    weekEnd: '',
    objetivos: [] as string[],
    experiencias: [] as string[],
    materiais: '',
    observacoes: '',
    camposSelecionados: [] as string[],
    codigosBNCC: [] as string[],
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [planRes, turmaRes, templRes] = await Promise.allSettled([
        http.get('/plannings?limit=100'),
        http.get('/lookup/classrooms/accessible'),
        http.get('/planning-templates'),
      ]);
      if (planRes.status === 'fulfilled') {
        const d = planRes.value.data;
        setPlannings(Array.isArray(d) ? d : d?.data ?? d?.plannings ?? []);
      }
      if (turmaRes.status === 'fulfilled') {
        const d = turmaRes.value.data;
        // /lookup/classrooms/accessible retorna array direto
        if (Array.isArray(d)) setTurmas(d);
        else if (d?.classroom) setTurmas([d.classroom]);
        else if (d?.classrooms) setTurmas(d.classrooms);
      }
      if (templRes.status === 'fulfilled') {
        const d = templRes.value.data;
        setTemplates(Array.isArray(d) ? d : d?.data ?? []);
      }
      try {
        const mr = await http.get('/curriculum-matrix-entries?limit=300');
        const md = mr.data;
        const entries = Array.isArray(md) ? md : md?.data ?? [];
        if (entries.length > 0) setMatrizEntries(entries);
      } catch { /* usa sample */ }
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }

  async function salvarPlanejamento() {
    if (!form.title.trim()) { toast.error('Informe o título do planejamento'); return; }
    if (!form.classroomId) { toast.error('Selecione uma turma'); return; }
    if (!form.weekStart) { toast.error('Informe a data de início'); return; }
    if (!form.weekEnd) { toast.error('Informe a data de término'); return; }
    setSaving(true);
    try {
      await http.post('/plannings', {
        title: form.title,
        type: form.type,
        classroomId: form.classroomId,
        startDate: form.weekStart,   // API espera startDate
        endDate: form.weekEnd,       // API espera endDate
        pedagogicalContent: {
          objetivos: form.objetivos,
          experiencias: form.experiencias,
          materiais: form.materiais,
          observacoes: form.observacoes,
          camposSelecionados: form.camposSelecionados,
          codigosBNCC: form.codigosBNCC,
        },
      });
      toast.success('Planejamento salvo como rascunho!');
      setAba('meus');
      loadData();
      setForm({ title: '', type: 'SEMANAL', classroomId: '', weekStart: '', weekEnd: '', objetivos: [], experiencias: [], materiais: '', observacoes: '', camposSelecionados: [], codigosBNCC: [] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  function toggleCampo(campoId: string) {
    setForm(f => ({
      ...f,
      camposSelecionados: f.camposSelecionados.includes(campoId)
        ? f.camposSelecionados.filter(c => c !== campoId)
        : [...f.camposSelecionados, campoId],
    }));
  }

  async function enviarParaRevisao(planningId: string) {
    try {
      await submitPlanningForReview(planningId);
      toast.success('Planejamento enviado para revisão!');
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao enviar para revisão');
    }
  }

  async function aprovarPlanejamento(planningId: string) {
    try {
      await approvePlanning(planningId);
      toast.success('Planejamento aprovado!');
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao aprovar planejamento');
    }
  }

  async function devolverPlanejamento() {
    if (!revisaoModal || !comentarioRevisao.trim()) {
      toast.error('Informe um comentário para a devolução.');
      return;
    }
    try {
      await returnPlanning(revisaoModal.planningId, comentarioRevisao);
      toast.success('Planejamento devolvido para correções.');
      setRevisaoModal(null);
      setComentarioRevisao('');
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao devolver planejamento');
    }
  }

  function adicionarObjetivoMatriz(entry: MatrizEntry) {
    setForm(f => ({
      ...f,
      objetivos: [...new Set([...f.objetivos, entry.objetivo_bncc])],
      codigosBNCC: [...new Set([...f.codigosBNCC, entry.codigo_bncc])],
      camposSelecionados: [...new Set([...f.camposSelecionados, entry.campo_id])],
      experiencias: entry.exemplo_atividade ? [...new Set([...f.experiencias, entry.exemplo_atividade])] : f.experiencias,
    }));
    toast.success(`Objetivo ${entry.codigo_bncc} adicionado`);
    setAba('novo');
  }

  const planningsFiltrados = plannings.filter(p => {
    if (filtroStatus && p.status !== filtroStatus) return false;
    if (busca && !p.title.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const matrizFiltrada = matrizEntries.filter(e => {
    if (filtroSegmento && e.segmento !== filtroSegmento) return false;
    if (busca && !e.objetivo_bncc.toLowerCase().includes(busca.toLowerCase()) && !e.codigo_bncc.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <PageShell title="Planejamentos Pedagógicos" subtitle="Organize seus planejamentos com base na Matriz Curricular COCRIS 2026">
      {/* Abas */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
        {[
          { id: 'meus', label: 'Meus Planejamentos', icon: <BookOpen className="h-4 w-4" /> },
          { id: 'novo', label: 'Novo Planejamento', icon: <Plus className="h-4 w-4" /> },
          { id: 'matriz', label: 'Matriz Curricular 2026', icon: <Layers className="h-4 w-4" /> },
          { id: 'templates', label: 'Templates', icon: <BookMarked className="h-4 w-4" /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setAba(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${aba === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── MEUS PLANEJAMENTOS ─── */}
      {aba === 'meus' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar planejamento..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <select className="px-3 py-2 border rounded-lg text-sm text-gray-700" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <Button onClick={() => setAba('novo')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Novo
            </Button>
          </div>

          {loading && <LoadingState message="Carregando planejamentos..." />}

          {!loading && planningsFiltrados.length === 0 && (
            <EmptyState
              icon={<BookOpen className="h-12 w-12 text-gray-300" />}
              title="Nenhum planejamento encontrado"
              description="Crie seu primeiro planejamento usando a Matriz Curricular 2026"
              action={<Button onClick={() => setAba('novo')}><Plus className="h-4 w-4 mr-2" />Criar Planejamento</Button>}
            />
          )}

          <div className="space-y-3">
            {planningsFiltrados.map(p => {
              const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.RASCUNHO;
              const isExpanded = expandedPlanning === p.id;
              return (
                <Card key={p.id} className="border-2 hover:border-blue-200 transition-all">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.cor}`}>{sc.icon} {sc.label}</span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{{ SEMANAL: 'Semanal', QUINZENAL: 'Quinzenal', MENSAL: 'Mensal', TRIMESTRAL: 'Trimestral', SEMESTRAL: 'Semestral', ANUAL: 'Anual' }[p.type] ?? p.type}</span>
                          {p.classroom && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Users className="h-3 w-3" /> {p.classroom.name}</span>}
                        </div>
                        <h3 className="font-semibold text-gray-800 truncate">{p.title}</h3>
                        {(p.startDate || p.weekStart) && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(p.startDate ?? p.weekStart!).toLocaleDateString('pt-BR')}{(p.endDate || p.weekEnd) && ` — ${new Date(p.endDate ?? p.weekEnd!).toLocaleDateString('pt-BR')}`}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Badge Aguardando Revisão — professor vendo plano EM_REVISAO */}
                        {ehProfessor && p.status === 'EM_REVISAO' && (
                          <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg font-medium">
                            <Clock className="h-3 w-3" /> Aguardando revisão
                          </span>
                        )}
                        {/* Botão Enviar para Revisão — professor em RASCUNHO */}
                        {ehProfessor && p.status === 'RASCUNHO' && (
                          <button
                            onClick={() => enviarParaRevisao(p.id)}
                            title="Enviar para revisão"
                            className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Send className="h-3 w-3" /> Enviar para Revisão
                          </button>
                        )}
                        {/* Botão Corrigir e Reenviar — professor em DEVOLVIDO */}
                        {ehProfessor && p.status === 'DEVOLVIDO' && (
                          <button
                            onClick={() => enviarParaRevisao(p.id)}
                            title="Corrigir e reenviar para revisão"
                            className="flex items-center gap-1 text-xs bg-orange-600 text-white px-2 py-1 rounded-lg hover:bg-orange-700 transition-colors"
                          >
                            <Send className="h-3 w-3" /> Corrigir e Reenviar
                          </button>
                        )}
                        {/* Botões de Coordenação — apenas para UNIDADE em EM_REVISAO */}
                        {ehCoordenador && p.status === 'EM_REVISAO' && (
                          <>
                            <button
                              onClick={() => aprovarPlanejamento(p.id)}
                              title="Aprovar planejamento"
                              className="flex items-center gap-1 text-xs bg-teal-600 text-white px-2 py-1 rounded-lg hover:bg-teal-700 transition-colors"
                            >
                              <ThumbsUp className="h-3 w-3" /> Aprovar
                            </button>
                            <button
                              onClick={() => setRevisaoModal({ planningId: p.id, tipo: 'devolver' })}
                              title="Devolver para correções"
                              className="flex items-center gap-1 text-xs bg-orange-500 text-white px-2 py-1 rounded-lg hover:bg-orange-600 transition-colors"
                            >
                              <ThumbsDown className="h-3 w-3" /> Devolver
                            </button>
                          </>
                        )}
                        <button onClick={() => setExpandedPlanning(isExpanded ? null : p.id)} className="text-gray-400 hover:text-gray-600 p-1">
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    {/* Motivo da devolução — sempre visível para planos DEVOLVIDOS */}
                    {p.status === 'DEVOLVIDO' && p.reviewComment && (
                      <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-xs font-semibold text-orange-700 uppercase mb-1 flex items-center gap-1"><ThumbsDown className="h-3 w-3" /> Motivo da Devolução</p>
                        <p className="text-sm text-orange-800">{p.reviewComment}</p>
                        {ehProfessor && (
                          <p className="text-xs text-orange-600 mt-2">Corrija o planejamento e clique em <strong>Corrigir e Reenviar</strong> para enviar novamente.</p>
                        )}
                      </div>
                    )}
                    {isExpanded && p.pedagogicalContent && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        {p.pedagogicalContent.camposSelecionados?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Campos de Experiência</p>
                            <div className="flex flex-wrap gap-2">
                              {p.pedagogicalContent.camposSelecionados.map((c: string) => {
                                const campo = CAMPOS.find(x => x.id === c);
                                return campo ? <span key={c} className={`text-xs px-2 py-1 rounded-full border ${campo.cor}`}>{campo.emoji} {campo.label.split(',')[0]}</span> : null;
                              })}
                            </div>
                          </div>
                        )}
                        {p.pedagogicalContent.codigosBNCC?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Objetivos BNCC</p>
                            <div className="flex flex-wrap gap-2">
                              {p.pedagogicalContent.codigosBNCC.map((c: string) => <span key={c} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-mono">{c}</span>)}
                            </div>
                          </div>
                        )}
                        {p.pedagogicalContent.objetivos?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Objetivos de Aprendizagem</p>
                            <ul className="space-y-1">
                              {p.pedagogicalContent.objetivos.map((o: string, i: number) => (
                                <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><Target className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />{o}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {p.pedagogicalContent.experiencias?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Experiências Propostas</p>
                            <ul className="space-y-1">
                              {p.pedagogicalContent.experiencias.map((e: string, i: number) => (
                                <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><Lightbulb className="h-3.5 w-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />{e}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {p.pedagogicalContent.materiais && <div><p className="text-xs font-semibold text-gray-500 uppercase mb-1">Materiais</p><p className="text-sm text-gray-700">{p.pedagogicalContent.materiais}</p></div>}
                        {p.pedagogicalContent.observacoes && <div><p className="text-xs font-semibold text-gray-500 uppercase mb-1">Observações</p><p className="text-sm text-gray-700">{p.pedagogicalContent.observacoes}</p></div>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── NOVO PLANEJAMENTO ─── */}
      {aba === 'novo' && (
        <div className="space-y-6 max-w-3xl">
          <Card className="border-2 border-blue-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-blue-700"><FileText className="h-5 w-5" /> Informações Básicas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Título do Planejamento *</Label>
                  <Input placeholder="Ex: Planejamento Semanal — Semana 1 — Acolhimento" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <select className="w-full px-3 py-2 border rounded-lg text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="SEMANAL">Semanal (1 semana)</option>
                    <option value="QUINZENAL">Quinzenal (2 semanas)</option>
                    <option value="MENSAL">Mensal (1 mês)</option>
                    <option value="TRIMESTRAL">Trimestral</option>
                    <option value="SEMESTRAL">Semestral</option>
                    <option value="ANUAL">Anual</option>
                  </select>
                </div>
                {turmas.length > 0 && (
                  <div>
                    <Label>Turma</Label>
                    <select className="w-full px-3 py-2 border rounded-lg text-sm" value={form.classroomId} onChange={e => setForm(f => ({ ...f, classroomId: e.target.value }))}>
                      <option value="">Selecionar turma...</option>
                      {turmas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}
                <div><Label>Data de Início</Label><Input type="date" value={form.weekStart} onChange={e => setForm(f => ({ ...f, weekStart: e.target.value }))} /></div>
                <div><Label>Data de Fim</Label><Input type="date" value={form.weekEnd} onChange={e => setForm(f => ({ ...f, weekEnd: e.target.value }))} /></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-purple-700"><Layers className="h-5 w-5" /> Campos de Experiência (BNCC)</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-3">Selecione os campos que serão trabalhados neste planejamento</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {CAMPOS.map(campo => (
                  <button key={campo.id} onClick={() => toggleCampo(campo.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${form.camposSelecionados.includes(campo.id) ? campo.cor + ' border-current shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                    <span className="text-xl">{campo.emoji}</span>
                    <span className="text-sm font-medium leading-tight">{campo.label}</span>
                    {form.camposSelecionados.includes(campo.id) && <CheckCircle className="h-4 w-4 ml-auto flex-shrink-0" />}
                  </button>
                ))}
              </div>
              {form.codigosBNCC.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-2">Objetivos BNCC vinculados:</p>
                  <div className="flex flex-wrap gap-2">
                    {form.codigosBNCC.map(c => (
                      <span key={c} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-mono flex items-center gap-1">
                        {c}<button onClick={() => setForm(f => ({ ...f, codigosBNCC: f.codigosBNCC.filter(x => x !== c) }))} className="hover:text-red-500 ml-1">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => setAba('matriz')} className="text-purple-600 border-purple-200">
                  <Layers className="h-4 w-4 mr-2" /> Buscar objetivos na Matriz 2026
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-green-700"><Target className="h-5 w-5" /> Objetivos e Experiências</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Objetivos de Aprendizagem</Label>
                <Textarea placeholder="Descreva os objetivos de aprendizagem (um por linha)..." rows={3} value={form.objetivos.join('\n')} onChange={e => setForm(f => ({ ...f, objetivos: e.target.value.split('\n').filter(Boolean) }))} />
              </div>
              <div>
                <Label>Experiências e Atividades Propostas</Label>
                <Textarea placeholder="Descreva as experiências pedagógicas (uma por linha)..." rows={3} value={form.experiencias.join('\n')} onChange={e => setForm(f => ({ ...f, experiencias: e.target.value.split('\n').filter(Boolean) }))} />
              </div>
              <div>
                <Label>Materiais Necessários</Label>
                <Input placeholder="Ex: Tintas atóxicas, papel kraft, massinha, espelho..." value={form.materiais} onChange={e => setForm(f => ({ ...f, materiais: e.target.value }))} />
              </div>
              <div>
                <Label>Intencionalidade Pedagógica e Observações</Label>
                <Textarea placeholder="Registre a intencionalidade pedagógica, adaptações necessárias, observações sobre a turma..." rows={3} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={salvarPlanejamento} disabled={saving} className="flex-1">
              {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Planejamento
            </Button>
            <Button variant="outline" onClick={() => setAba('meus')}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* ─── MATRIZ CURRICULAR 2026 ─── */}
      {aba === 'matriz' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-6 w-6 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-indigo-800">Matriz Curricular COCRIS 2026</h3>
                <p className="text-sm text-indigo-600 mt-0.5">
                  Baseada na BNCC e no Currículo em Movimento do DF. Clique em qualquer objetivo para adicioná-lo ao seu planejamento.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar objetivo, código BNCC..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <select className="px-3 py-2 border rounded-lg text-sm" value={filtroSegmento} onChange={e => setFiltroSegmento(e.target.value)}>
              <option value="">Todos os segmentos</option>
              <option value="EI01">EI01 — Bebês</option>
              <option value="EI02">EI02 — Bem Pequenas</option>
              <option value="EI03">EI03 — Pequenas</option>
            </select>
          </div>

          <p className="text-sm text-gray-500">{matrizFiltrada.length} objetivos encontrados</p>

          <div className="space-y-3">
            {matrizFiltrada.map((entry, idx) => {
              const campo = CAMPOS.find(c => c.id === entry.campo_id);
              return (
                <Card key={idx} className="border hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group" onClick={() => adicionarObjetivoMatriz(entry)}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">{entry.codigo_bncc}</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{entry.segmento} · B{entry.bimestre}S{entry.semana}</span>
                          {entry.semana_tema && <span className="text-xs text-gray-400 italic">{entry.semana_tema}</span>}
                          {campo && <span className={`text-xs px-2 py-0.5 rounded-full border ${campo.cor}`}>{campo.emoji} {campo.label.split(',')[0]}</span>}
                        </div>
                        <p className="text-sm font-medium text-gray-800 mb-1">{entry.objetivo_bncc}</p>
                        {entry.intencionalidade_pedagogica && <p className="text-xs text-gray-500 flex items-start gap-1"><Lightbulb className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />{entry.intencionalidade_pedagogica}</p>}
                        {entry.exemplo_atividade && <p className="text-xs text-blue-600 mt-1 flex items-start gap-1"><Star className="h-3 w-3 mt-0.5 flex-shrink-0" />{entry.exemplo_atividade}</p>}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg flex items-center gap-1"><Plus className="h-3 w-3" /> Usar</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TEMPLATES ─── */}
      {aba === 'templates' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Templates pré-configurados para facilitar seu planejamento</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(templates.length > 0 ? templates.map(t => ({ nome: t.name, tipo: t.type, desc: t.description || '', campos: [], cor: 'border-blue-200 bg-blue-50' })) : [
              { nome: 'Planejamento Semanal — EI01 Bebês', tipo: 'SEMANAL', desc: 'Template para bebês (0-18 meses) com foco em rotinas de cuidado, exploração sensorial e vínculos afetivos.', campos: ['eu-outro-nos', 'corpo-gestos'], cor: 'border-pink-200 bg-pink-50' },
              { nome: 'Planejamento Semanal — EI02 Bem Pequenas', tipo: 'SEMANAL', desc: 'Template para crianças bem pequenas (1a7m-3a11m) com ênfase em linguagem, movimento e descobertas.', campos: ['escuta-fala', 'corpo-gestos', 'tracos-sons'], cor: 'border-orange-200 bg-orange-50' },
              { nome: 'Planejamento Semanal — EI03 Pequenas', tipo: 'SEMANAL', desc: 'Template para crianças pequenas (4-5a11m) com foco em autonomia, criatividade e pensamento lógico.', campos: ['espacos-tempos', 'tracos-sons', 'escuta-fala'], cor: 'border-blue-200 bg-blue-50' },
              { nome: 'Projeto Temático Mensal', tipo: 'MENSAL', desc: 'Template para projetos temáticos mensais integrando todos os campos de experiência da BNCC.', campos: ['eu-outro-nos', 'corpo-gestos', 'tracos-sons', 'escuta-fala', 'espacos-tempos'], cor: 'border-green-200 bg-green-50' },
            ]).map((t, i) => (
              <Card key={i} className={`border-2 ${t.cor} hover:shadow-md transition-all cursor-pointer`}
                onClick={() => { setForm(f => ({ ...f, title: t.nome, type: t.tipo, camposSelecionados: t.campos })); setAba('novo'); }}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <BookMarked className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-gray-800 text-sm mb-1">{t.nome}</h3>
                      <p className="text-xs text-gray-600 mb-3">{t.desc}</p>
                      <div className="flex flex-wrap gap-1">
                        {t.campos.map(c => {
                          const campo = CAMPOS.find(x => x.id === c);
                          return campo ? <span key={c} className="text-xs text-gray-600 bg-white border px-2 py-0.5 rounded-full">{campo.emoji} {campo.label.split(' ').slice(0, 3).join(' ')}</span> : null;
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {/* ─── MODAL DE DEVOLUÇÃO ─── */}
      {revisaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Devolver para Correções</h3>
                <p className="text-xs text-gray-500">Informe o motivo da devolução ao professor</p>
              </div>
            </div>
            <textarea
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
              rows={4}
              placeholder="Descreva os ajustes necessários no planejamento..."
              value={comentarioRevisao}
              onChange={e => setComentarioRevisao(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={devolverPlanejamento}
                className="flex-1 bg-orange-500 text-white py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
              >
                Confirmar Devolução
              </button>
              <button
                onClick={() => { setRevisaoModal(null); setComentarioRevisao(''); }}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
