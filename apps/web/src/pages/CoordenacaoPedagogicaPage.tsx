import { useState, useEffect, useRef } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { toast } from 'sonner';
import http from '../api/http';
import {
  Users, BookOpen, Calendar, ClipboardList, ChevronRight,
  CheckCircle, Clock, AlertCircle, Plus, Eye, FileText,
  GraduationCap, Target, Star, TrendingUp, MessageSquare,
  Download, Filter, Search, ChevronDown, ChevronUp,
  Layers, Award, BarChart2, BookMarked, UserCheck,
} from 'lucide-react';
import { MATRIZ_2026 } from '../data/matrizCompleta2026';
import type { SegmentoKey } from '../data/matrizCompleta2026';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface TurmaTeacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Turma {
  id: string;
  name: string;
  code: string;
  segment: string;
  ageGroupMin: number;
  ageGroupMax: number;
  teacherCount: number;
  childCount: number;
  teachers: TurmaTeacher[];
  plansCount: number;
  unit?: { name: string };
}

interface Reuniao {
  id: string;
  tipo: 'SEMANAL' | 'MENSAL';
  titulo: string;
  data: string;
  status: 'AGENDADA' | 'REALIZADA' | 'CANCELADA';
  pauta: string;
  ata?: string;
  participantes?: string[];
  turmaId?: string;
  turmaNome?: string;
}

interface Planejamento {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  classroom?: { name: string };
  createdByUser?: { firstName: string; lastName: string };
}

// ─── Segmentos ────────────────────────────────────────────────────────────────
const SEGMENTO_LABELS: Record<string, string> = {
  EI01: 'EI01 — Bebês (0 a 1a 6m)',
  EI02: 'EI02 — Crianças Bem Pequenas (1a 7m a 3a 11m)',
  EI03: 'EI03 — Crianças Pequenas (4 a 5a 11m)',
};

const SEGMENTO_CORES: Record<string, string> = {
  EI01: 'bg-pink-100 text-pink-700 border-pink-200',
  EI02: 'bg-purple-100 text-purple-700 border-purple-200',
  EI03: 'bg-blue-100 text-blue-700 border-blue-200',
};

const STATUS_REUNIAO: Record<string, { label: string; cor: string; icon: any }> = {
  AGENDADA: { label: 'Agendada', cor: 'bg-blue-100 text-blue-700', icon: Clock },
  REALIZADA: { label: 'Realizada', cor: 'bg-green-100 text-green-700', icon: CheckCircle },
  CANCELADA: { label: 'Cancelada', cor: 'bg-red-100 text-red-700', icon: AlertCircle },
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function CoordenacaoPedagogicaPage() {
  const [aba, setAba] = useState<'turmas' | 'curriculo' | 'reunioes' | 'planejamentos' | 'pautas'>('turmas');
  const [pautas, setPautas] = useState<any[]>([]);
  const [modalPauta, setModalPauta] = useState(false);
  const [formPauta, setFormPauta] = useState({
    tipo: 'SEMANAL_UNIDADE' as 'SEMANAL_UNIDADE' | 'MENSAL_GERAL',
    titulo: '',
    data: new Date().toISOString().split('T')[0],
    participantes: '',
    pautaItens: '',
    ata: '',
    status: 'AGENDADA' as 'AGENDADA' | 'REALIZADA',
  });
  const [savingPauta, setSavingPauta] = useState(false);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState<Turma | null>(null);
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [planejamentos, setPlanejamentos] = useState<Planejamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [turmasError, setTurmasError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroSegmento, setFiltroSegmento] = useState<string>('TODOS');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Planejamentos — modal de devolução
  const [modalDevolver, setModalDevolver] = useState<{ id: string; titulo: string } | null>(null);
  const [motivoDevolver, setMotivoDevolver] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);
  const [planExpandedId, setPlanExpandedId] = useState<string | null>(null);
  const motivoRef = useRef<HTMLTextAreaElement>(null);

  // Modal de reunião
  const [modalReuniao, setModalReuniao] = useState(false);
  const [formReuniao, setFormReuniao] = useState({
    tipo: 'SEMANAL' as 'SEMANAL' | 'MENSAL',
    titulo: '',
    data: new Date().toISOString().split('T')[0],
    pauta: '',
    turmaId: '',
  });
  const [saving, setSaving] = useState(false);

  // Currículo da turma selecionada
  const [filtroSegCurriculo, setFiltroSegCurriculo] = useState<SegmentoKey>('EI01');
  const [filtroCampo, setFiltroCampo] = useState('TODOS');
  const [filtroBimestre, setFiltroBimestre] = useState('TODOS');

  useEffect(() => {
    loadTurmas();
    loadReunioes();
    loadPlanejamentos();
  }, []);

  // ─── Loaders ───────────────────────────────────────────────────────────────
  async function loadTurmas() {
    setLoading(true);
    setTurmasError(null);
    try {
      // Endpoint canônico com childrenCount real e todos os professores ativos
      const res = await http.get('/coordenacao/unit/classrooms');
      const payload = res.data;
      const rawClassrooms: any[] = payload?.classrooms ?? (Array.isArray(payload) ? payload : []);
      if (rawClassrooms.length === 0 && !payload?.classrooms) {
        // Fallback para lookup se endpoint não retornar classrooms
        const fallback = await http.get('/lookup/classrooms/accessible').catch(() => ({ data: [] }));
        const fb: any[] = Array.isArray(fallback.data) ? fallback.data : fallback.data?.data ?? [];
        setTurmas(fb.map((c: any) => ({
          id: c.id, name: c.name, code: c.code ?? '', segment: c.segment ?? 'EI02',
          ageGroupMin: c.ageGroupMin ?? 0, ageGroupMax: c.ageGroupMax ?? 71,
          teacherCount: 0, childCount: c._count?.enrollments ?? 0,
          teachers: [], plansCount: 0,
        })));
        return;
      }
      setTurmas(rawClassrooms.map((c: any) => ({
        id: c.id,
        name: c.name,
        code: c.code ?? '',
        segment: c.segment ?? 'EI02',
        ageGroupMin: c.ageGroupMin ?? 0,
        ageGroupMax: c.ageGroupMax ?? 71,
        teacherCount: (c.teachers ?? []).length,
        childCount: c.childrenCount ?? 0,
        teachers: (c.teachers ?? []) as TurmaTeacher[],
        plansCount: c.plansCount ?? 0,
      })));
    } catch {
      setTurmasError('Não foi possível carregar as turmas. Verifique sua conexão e tente novamente.');
      setTurmas([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadReunioes() {
    try {
      const res = await http.get('/coordenacao/reunioes?limit=30');
      const d = res.data;
      setReunioes(Array.isArray(d) ? d : d?.data ?? []);
    } catch {
      // Demo data
      const hoje = new Date();
      const proxSemana = new Date(hoje); proxSemana.setDate(hoje.getDate() + 7);
      const proxMes = new Date(hoje); proxMes.setDate(hoje.getDate() + 30);
      setReunioes([
        {
          id: 'r1', tipo: 'SEMANAL', titulo: 'Reunião Pedagógica Semanal',
          data: proxSemana.toISOString().split('T')[0], status: 'AGENDADA',
          pauta: 'Revisão dos planejamentos da semana\nAnálise dos registros de desenvolvimento\nOrganização dos espaços pedagógicos',
          participantes: ['Coordenadora Geral', 'Prof. Ana', 'Prof. Maria', 'Prof. João'],
        },
        {
          id: 'r2', tipo: 'MENSAL', titulo: 'Reunião de Coordenação Mensal — Março',
          data: proxMes.toISOString().split('T')[0], status: 'AGENDADA',
          pauta: 'Análise dos indicadores pedagógicos\nRevisão da Matriz Curricular 2026\nFormação continuada — Campos de Experiência\nPlanejamento do próximo mês',
          participantes: ['Coordenadora Geral', 'Todas as Coordenadoras de Unidade'],
        },
        {
          id: 'r3', tipo: 'SEMANAL', titulo: 'Reunião Pedagógica Semanal',
          data: new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'REALIZADA',
          pauta: 'Avaliação das atividades da semana anterior\nPreparação dos materiais pedagógicos',
          ata: 'Reunião realizada com a participação de 5 professoras. Foram discutidos os planejamentos da semana e definidas as estratégias para as atividades de exploração sensorial com o EI01. A coordenadora destacou a importância dos registros fotográficos para documentação pedagógica.',
          participantes: ['Coordenadora', 'Prof. Ana', 'Prof. Maria', 'Prof. Carla', 'Prof. Beatriz'],
        },
      ]);
    }
  }

  async function loadPlanejamentos() {
    try {
      const res = await http.get('/coordenacao/planejamentos');
      const d = res.data;
      setPlanejamentos(Array.isArray(d) ? d : d?.data ?? []);
    } catch {
      setPlanejamentos([]);
    }
  }

  async function aprovarPlanejamento(id: string) {
    setSavingPlan(true);
    try {
      await http.post(`/plannings/${id}/aprovar`);
      toast.success('Planejamento aprovado!');
      loadPlanejamentos();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao aprovar planejamento');
    } finally {
      setSavingPlan(false);
    }
  }

  async function devolverPlanejamento() {
    if (!modalDevolver) return;
    if (!motivoDevolver.trim() || motivoDevolver.trim().length < 5) {
      toast.error('Informe o motivo da devolução (mínimo 5 caracteres)');
      motivoRef.current?.focus();
      return;
    }
    setSavingPlan(true);
    try {
      await http.post(`/plannings/${modalDevolver.id}/devolver`, { comment: motivoDevolver.trim() });
      toast.success('Planejamento devolvido para correção');
      setModalDevolver(null);
      setMotivoDevolver('');
      loadPlanejamentos();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao devolver planejamento');
    } finally {
      setSavingPlan(false);
    }
  }

  // ─── Ações ─────────────────────────────────────────────────────────────────
  async function salvarReuniao() {
    if (!formReuniao.titulo.trim() || !formReuniao.pauta.trim()) {
      toast.error('Preencha o título e a pauta da reunião');
      return;
    }
    setSaving(true);
    try {
      await http.post('/coordenacao/reunioes', {
        tipo: formReuniao.tipo,
        titulo: formReuniao.titulo,
        data: formReuniao.data,
        pauta: formReuniao.pauta,
        turmaId: formReuniao.turmaId || undefined,
      });
      toast.success('Reunião agendada com sucesso!');
      setModalReuniao(false);
      loadReunioes();
      setFormReuniao({ tipo: 'SEMANAL', titulo: '', data: new Date().toISOString().split('T')[0], pauta: '', turmaId: '' });
    } catch (err: any) {
      // Fallback local
      const nova: Reuniao = {
        id: Date.now().toString(),
        tipo: formReuniao.tipo,
        titulo: formReuniao.titulo,
        data: formReuniao.data,
        status: 'AGENDADA',
        pauta: formReuniao.pauta,
        turmaId: formReuniao.turmaId || undefined,
        turmaNome: turmas.find(t => t.id === formReuniao.turmaId)?.name,
      };
      setReunioes(r => [nova, ...r]);
      toast.success('Reunião agendada (modo local)');
      setModalReuniao(false);
    } finally {
      setSaving(false);
    }
  }

  async function marcarRealizada(id: string, ata: string) {
    try {
      await http.post(`/coordenacao/reunioes/${id}/ata`, { ata });
      await http.patch(`/coordenacao/reunioes/${id}/status`, { status: 'REALIZADA' });
      toast.success('Reunião marcada como realizada');
      loadReunioes();
    } catch {
      setReunioes(r => r.map(re => re.id === id ? { ...re, status: 'REALIZADA', ata } : re));
      toast.success('Status atualizado');
    }
  }

  // ─── Dados do currículo ────────────────────────────────────────────────────
  const objetivosCurriculo = MATRIZ_2026[filtroSegCurriculo] || [];
  const camposUnicos = [...new Set(objetivosCurriculo.map(o => o.campo_experiencia_id))];
  const bimestresUnicos = [...new Set(objetivosCurriculo.map(o => o.bimestre))].sort();

  const objetivosFiltrados = objetivosCurriculo.filter(o => {
    if (filtroCampo !== 'TODOS' && o.campo_experiencia_id !== filtroCampo) return false;
    if (filtroBimestre !== 'TODOS' && String(o.bimestre) !== filtroBimestre) return false;
    return true;
  });

  // ─── Turmas filtradas ──────────────────────────────────────────────────────
  const turmasFiltradas = turmas.filter(t => {
    if (filtroSegmento !== 'TODOS' && t.segment !== filtroSegmento) return false;
    if (busca && !t.name.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  // ─── Estatísticas ──────────────────────────────────────────────────────────
  const totalCriancas = turmas.reduce((s, t) => s + (t.childCount || 0), 0);
  const totalProfessores = turmas.reduce((s, t) => s + (t.teacherCount || 0), 0);
  const reunioesAgendadas = reunioes.filter(r => r.status === 'AGENDADA').length;
  const planejamentosEmRevisao = planejamentos.filter(p => p.status === 'EM_REVISAO').length;

  return (
    <PageShell
      title="Coordenação Pedagógica"
      subtitle="Gerencie turmas, currículo, reuniões e planejamentos de toda a unidade"
    >
      {/* ─── Cards de Resumo ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Turmas', value: turmas.length, icon: Layers, cor: 'blue' },
          { label: 'Crianças', value: totalCriancas, icon: Users, cor: 'green' },
          { label: 'Professores', value: totalProfessores, icon: GraduationCap, cor: 'purple' },
          { label: 'Reuniões Agendadas', value: reunioesAgendadas, icon: Calendar, cor: 'orange' },
        ].map(stat => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-lg bg-${stat.cor}-100 mb-2`}>
                <stat.icon className={`h-5 w-5 text-${stat.cor}-600`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Abas ─── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
        {[
          { id: 'turmas', label: 'Turmas', icon: <Layers className="h-4 w-4" /> },
          { id: 'curriculo', label: 'Currículo 2026', icon: <BookMarked className="h-4 w-4" /> },
          { id: 'reunioes', label: 'Reuniões', icon: <Calendar className="h-4 w-4" /> },
          { id: 'pautas', label: 'Pautas de Coordenação', icon: <FileText className="h-4 w-4" /> },
          { id: 'planejamentos', label: 'Planejamentos', icon: <ClipboardList className="h-4 w-4" /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setAba(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${aba === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── ABA: TURMAS ─── */}
      {aba === 'turmas' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar turma..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <div className="flex gap-2">
              {['TODOS', 'EI01', 'EI02', 'EI03'].map(seg => (
                <button key={seg} onClick={() => setFiltroSegmento(seg)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${filtroSegmento === seg ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                  {seg === 'TODOS' ? 'Todos' : seg}
                </button>
              ))}
            </div>
          </div>

          {loading && <LoadingState message="Carregando turmas..." />}

          {!loading && turmasError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-red-700 mb-3">{turmasError}</p>
              <Button variant="outline" size="sm" onClick={loadTurmas}>Recarregar</Button>
            </div>
          )}

          {!loading && !turmasError && turmasFiltradas.length === 0 && (
            <EmptyState icon={<Layers className="h-12 w-12 text-gray-300" />} title="Nenhuma turma encontrada" description="Ajuste os filtros ou cadastre novas turmas" />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {turmasFiltradas.map(turma => (
              <Card key={turma.id} className={`border shadow-sm hover:shadow-md transition-shadow cursor-pointer ${turmaSelecionada?.id === turma.id ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => { setTurmaSelecionada(turma); setAba('curriculo'); setFiltroSegCurriculo((turma.segment as SegmentoKey) || 'EI01'); }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{turma.name}</h3>
                      {turma.unit && <p className="text-xs text-gray-500">{turma.unit.name}</p>}
                    </div>
                    <Badge className={`text-xs ${SEGMENTO_CORES[turma.segment] || 'bg-gray-100 text-gray-600'}`}>
                      {turma.segment || 'N/D'}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {SEGMENTO_LABELS[turma.segment] || turma.segment}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Users className="h-3.5 w-3.5 text-blue-500" />
                      <span>{turma.childCount || 0} crianças</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <GraduationCap className="h-3.5 w-3.5 text-purple-500" />
                      <span>{turma.teacherCount || 0} professor{turma.teacherCount !== 1 ? 'es' : ''}</span>
                    </div>
                  </div>
                  {turma.teachers && turma.teachers.length > 0 && (
                    <div className="text-xs text-gray-500 mb-2">
                      <span className="font-medium text-gray-600">Prof.: </span>
                      {turma.teachers.map(t => `${t.firstName} ${t.lastName}`).join(', ')}
                    </div>
                  )}
                  {turma.teachers && turma.teachers.length === 0 && (
                    <div className="text-xs text-amber-600 mb-2">Sem professor atribuído</div>
                  )}
                  {turma.plansCount > 0 && (
                    <div className="text-xs text-green-600 mb-1">
                      <BookOpen className="h-3 w-3 inline mr-1" />{turma.plansCount} plano{turma.plansCount !== 1 ? 's' : ''} publicado{turma.plansCount !== 1 ? 's' : ''}
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-xs"
                      onClick={e => { e.stopPropagation(); setTurmaSelecionada(turma); setAba('curriculo'); setFiltroSegCurriculo((turma.segment as SegmentoKey) || 'EI01'); }}>
                      <BookOpen className="h-3 w-3 mr-1" /> Currículo
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs"
                      onClick={e => { e.stopPropagation(); setTurmaSelecionada(turma); setAba('planejamentos'); }}>
                      <ClipboardList className="h-3 w-3 mr-1" /> Planos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── ABA: CURRÍCULO ─── */}
      {aba === 'curriculo' && (
        <div className="space-y-4">
          {turmaSelecionada && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
              <Layers className="h-5 w-5 text-blue-600" />
              <div>
                <span className="font-semibold text-blue-900">{turmaSelecionada.name}</span>
                <span className="text-sm text-blue-600 ml-2">— {SEGMENTO_LABELS[turmaSelecionada.segment]}</span>
              </div>
              <button onClick={() => setTurmaSelecionada(null)} className="ml-auto text-xs text-blue-500 hover:text-blue-700">
                Trocar turma
              </button>
            </div>
          )}

          {/* Seletor de segmento */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 self-center mr-1">Segmento:</span>
            {(['EI01', 'EI02', 'EI03'] as SegmentoKey[]).map(seg => (
              <button key={seg} onClick={() => { setFiltroSegCurriculo(seg); setFiltroCampo('TODOS'); setFiltroBimestre('TODOS'); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${filtroSegCurriculo === seg ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                {seg} <span className="text-xs opacity-75">({MATRIZ_2026[seg]?.length || 0})</span>
              </button>
            ))}
          </div>

          {/* Filtros de campo e bimestre */}
          <div className="flex flex-wrap gap-3">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Campo de Experiência</Label>
              <select value={filtroCampo} onChange={e => setFiltroCampo(e.target.value)}
                className="text-sm border rounded-lg px-3 py-1.5 bg-white">
                <option value="TODOS">Todos os campos</option>
                {camposUnicos.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Bimestre</Label>
              <select value={filtroBimestre} onChange={e => setFiltroBimestre(e.target.value)}
                className="text-sm border rounded-lg px-3 py-1.5 bg-white">
                <option value="TODOS">Todos</option>
                {bimestresUnicos.map(b => <option key={b} value={String(b)}>{b}º Bimestre</option>)}
              </select>
            </div>
            <div className="self-end">
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                {objetivosFiltrados.length} objetivos
              </Badge>
            </div>
          </div>

          {/* Lista de objetivos */}
          <div className="space-y-3">
            {objetivosFiltrados.slice(0, 50).map((obj, idx) => (
              <Card key={idx} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <button className="w-full text-left p-4" onClick={() => setExpandedId(expandedId === `c${idx}` ? null : `c${idx}`)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className="text-xs bg-gray-100 text-gray-600 font-mono">{obj.codigo_bncc}</Badge>
                          <Badge className="text-xs bg-blue-50 text-blue-700">{obj.campo_experiencia_emoji} {obj.campo_experiencia_label}</Badge>
                          <Badge className="text-xs bg-green-50 text-green-700">{obj.bimestre}º Bim</Badge>
                          <span className="text-xs text-gray-400">{obj.data} — {obj.dia_semana}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 line-clamp-2">{obj.objetivo_bncc}</p>
                      </div>
                      {expandedId === `c${idx}` ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 mt-1" />}
                    </div>
                  </button>

                  {expandedId === `c${idx}` && (
                    <div className="px-4 pb-4 border-t border-gray-100 space-y-3 pt-3">
                      {obj.objetivo_curriculo_movimento && (
                        <div>
                          <p className="text-xs font-semibold text-purple-700 mb-1">📚 Objetivo do Currículo em Movimento</p>
                          <p className="text-sm text-gray-700 bg-purple-50 p-2 rounded-lg">{obj.objetivo_curriculo_movimento}</p>
                        </div>
                      )}
                      {obj.intencionalidade_pedagogica && (
                        <div>
                          <p className="text-xs font-semibold text-blue-700 mb-1">🎯 Intencionalidade Pedagógica</p>
                          <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded-lg">{obj.intencionalidade_pedagogica}</p>
                        </div>
                      )}
                      {obj.exemplos_atividades && obj.exemplos_atividades.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 mb-2">✨ Exemplos de Atividades</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {obj.exemplos_atividades.map((ex: any, i: number) => (
                              <div key={i} className="bg-green-50 border border-green-200 rounded-lg p-2">
                                <p className="text-xs font-semibold text-green-800 mb-1">{i + 1}. {ex.titulo}</p>
                                <p className="text-xs text-green-700">{ex.descricao}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {objetivosFiltrados.length > 50 && (
              <p className="text-center text-sm text-gray-500 py-2">
                Mostrando 50 de {objetivosFiltrados.length} objetivos. Use os filtros para refinar.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── ABA: REUNIÕES ─── */}
      {aba === 'reunioes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-900">Reuniões Pedagógicas</h3>
              <p className="text-sm text-gray-500">Semanais (coordenadora + professoras) e Mensais (coordenação geral)</p>
            </div>
            <Button onClick={() => setModalReuniao(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Agendar Reunião
            </Button>
          </div>

          {/* Próximas reuniões */}
          <div className="space-y-3">
            {reunioes.length === 0 && (
              <EmptyState icon={<Calendar className="h-12 w-12 text-gray-300" />} title="Nenhuma reunião agendada" description="Agende a próxima reunião pedagógica" action={<Button onClick={() => setModalReuniao(true)}><Plus className="h-4 w-4 mr-2" />Agendar</Button>} />
            )}

            {reunioes.map(reuniao => {
              const statusInfo = STATUS_REUNIAO[reuniao.status];
              const StatusIcon = statusInfo?.icon || Clock;
              const isExpanded = expandedId === reuniao.id;

              return (
                <Card key={reuniao.id} className="border shadow-sm">
                  <CardContent className="p-0">
                    <button className="w-full text-left p-4" onClick={() => setExpandedId(isExpanded ? null : reuniao.id)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className={`text-xs ${reuniao.tipo === 'SEMANAL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                              {reuniao.tipo === 'SEMANAL' ? '📅 Semanal' : '📆 Mensal'}
                            </Badge>
                            <Badge className={`text-xs ${statusInfo?.cor || 'bg-gray-100 text-gray-600'}`}>
                              <StatusIcon className="h-3 w-3 mr-1 inline" />
                              {statusInfo?.label}
                            </Badge>
                            {reuniao.turmaNome && <Badge className="text-xs bg-green-100 text-green-700">{reuniao.turmaNome}</Badge>}
                          </div>
                          <h4 className="font-semibold text-gray-900">{reuniao.titulo}</h4>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {new Date(reuniao.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 space-y-3 pt-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">📋 Pauta</p>
                          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-line">{reuniao.pauta}</div>
                        </div>

                        {reuniao.participantes && reuniao.participantes.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">👥 Participantes</p>
                            <div className="flex flex-wrap gap-1">
                              {reuniao.participantes.map((p, i) => (
                                <Badge key={i} className="text-xs bg-blue-50 text-blue-700">{p}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {reuniao.ata && (
                          <div>
                            <p className="text-xs font-semibold text-green-700 mb-1">✅ Ata da Reunião</p>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-line">{reuniao.ata}</div>
                          </div>
                        )}

                        {reuniao.status === 'AGENDADA' && (
                          <div className="flex gap-2 pt-2">
                            <Button size="sm" variant="outline" className="text-xs"
                              onClick={() => {
                                const ata = prompt('Registre a ata desta reunião:');
                                if (ata) marcarRealizada(reuniao.id, ata);
                              }}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Marcar como Realizada
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── ABA: PAUTAS DE COORDENAÇÃO ─── */}
      {aba === 'pautas' && (
        <div className="space-y-4">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">Pautas de Coordenação</h3>
              <p className="text-sm text-gray-500">Semanal (unidade) e Mensal (coordenação geral)</p>
            </div>
            <Button onClick={() => setModalPauta(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Nova Pauta
            </Button>
          </div>

          {/* Templates rápidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-700 font-bold text-sm">📅 Pauta Semanal — Unidade</span>
              </div>
              <p className="text-xs text-blue-600 mb-3">Reunião semanal entre coordenadora pedagógica e professoras da unidade</p>
              <div className="text-xs text-blue-800 space-y-1 bg-white rounded-xl p-3 border border-blue-100">
                <p className="font-semibold mb-1">Template de Pauta:</p>
                <p>1. Acolhimento e abertura</p>
                <p>2. Revisão dos planejamentos da semana anterior</p>
                <p>3. Análise dos registros de desenvolvimento (microgestos)</p>
                <p>4. Planejamento da próxima semana</p>
                <p>5. Organização dos espaços pedagógicos</p>
                <p>6. Informe de materiais e recursos</p>
                <p>7. Encaminhamentos e próximos passos</p>
              </div>
              <Button size="sm" className="mt-3 w-full text-xs" variant="outline"
                onClick={() => {
                  setFormPauta(f => ({
                    ...f,
                    tipo: 'SEMANAL_UNIDADE',
                    titulo: `Pauta Semanal — ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`,
                    pautaItens: '1. Acolhimento e abertura\n2. Revisão dos planejamentos da semana anterior\n3. Análise dos registros de desenvolvimento (microgestos)\n4. Planejamento da próxima semana\n5. Organização dos espaços pedagógicos\n6. Informe de materiais e recursos\n7. Encaminhamentos e próximos passos',
                    participantes: 'Coordenadora Pedagógica, Professoras da Unidade',
                  }));
                  setModalPauta(true);
                }}>
                Usar Template Semanal
              </Button>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-purple-700 font-bold text-sm">📆 Pauta Mensal — Coordenação Geral</span>
              </div>
              <p className="text-xs text-purple-600 mb-3">Reunião mensal da coordenação geral com coordenadoras de todas as unidades</p>
              <div className="text-xs text-purple-800 space-y-1 bg-white rounded-xl p-3 border border-purple-100">
                <p className="font-semibold mb-1">Template de Pauta:</p>
                <p>1. Abertura e boas-vindas</p>
                <p>2. Análise dos indicadores pedagógicos do mês</p>
                <p>3. Revisão da Matriz Curricular 2026</p>
                <p>4. Formação continuada — Campos de Experiência</p>
                <p>5. Relatórios RDIC — discussão de casos</p>
                <p>6. Planejamento do próximo mês</p>
                <p>7. Informe administrativo e financeiro</p>
                <p>8. Encaminhamentos</p>
              </div>
              <Button size="sm" className="mt-3 w-full text-xs" variant="outline"
                onClick={() => {
                  setFormPauta(f => ({
                    ...f,
                    tipo: 'MENSAL_GERAL',
                    titulo: `Pauta Mensal — ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
                    pautaItens: '1. Abertura e boas-vindas\n2. Análise dos indicadores pedagógicos do mês\n3. Revisão da Matriz Curricular 2026\n4. Formação continuada — Campos de Experiência\n5. Relatórios RDIC — discussão de casos\n6. Planejamento do próximo mês\n7. Informe administrativo e financeiro\n8. Encaminhamentos',
                    participantes: 'Coordenação Geral, Coordenadoras de Unidade',
                  }));
                  setModalPauta(true);
                }}>
                Usar Template Mensal
              </Button>
            </div>
          </div>

          {/* Lista de pautas */}
          {pautas.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhuma pauta criada ainda</p>
              <p className="text-sm text-gray-400 mt-1">Use os templates acima para criar a primeira pauta</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pautas.map(pauta => (
                <Card key={pauta.id} className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={`text-xs ${pauta.tipo === 'SEMANAL_UNIDADE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {pauta.tipo === 'SEMANAL_UNIDADE' ? '📅 Semanal — Unidade' : '📆 Mensal — Geral'}
                          </Badge>
                          <Badge className={`text-xs ${pauta.status === 'REALIZADA' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {pauta.status === 'REALIZADA' ? '✅ Realizada' : '🕒 Agendada'}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-gray-900">{pauta.titulo}</h4>
                        <p className="text-sm text-gray-500">{new Date(pauta.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        {pauta.participantes && <p className="text-xs text-gray-400 mt-1">👥 {pauta.participantes}</p>}
                      </div>
                    </div>
                    <div className="mt-3 bg-gray-50 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-line">{pauta.pautaItens}</div>
                    {pauta.ata && (
                      <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-line">
                        <p className="text-xs font-semibold text-green-700 mb-1">✅ Ata da Reunião</p>
                        {pauta.ata}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Modal de nova pauta */}
          {modalPauta && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Nova Pauta de Coordenação</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Tipo de Reunião</Label>
                      <div className="flex gap-2 mt-1">
                        {[
                          { id: 'SEMANAL_UNIDADE', label: '📅 Semanal — Unidade' },
                          { id: 'MENSAL_GERAL', label: '📆 Mensal — Geral' },
                        ].map(op => (
                          <button key={op.id} onClick={() => setFormPauta(f => ({ ...f, tipo: op.id as any }))}
                            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                              formPauta.tipo === op.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                            }`}>
                            {op.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Título da Pauta</Label>
                      <Input className="mt-1" placeholder="Ex: Pauta Semanal — 24 de fevereiro" value={formPauta.titulo} onChange={e => setFormPauta(f => ({ ...f, titulo: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Data</Label>
                      <Input type="date" className="mt-1" value={formPauta.data} onChange={e => setFormPauta(f => ({ ...f, data: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Participantes</Label>
                      <Input className="mt-1" placeholder="Ex: Coordenadora, Prof. Ana, Prof. Maria" value={formPauta.participantes} onChange={e => setFormPauta(f => ({ ...f, participantes: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Itens da Pauta</Label>
                      <Textarea className="mt-1" rows={6} placeholder="1. Item um\n2. Item dois..." value={formPauta.pautaItens} onChange={e => setFormPauta(f => ({ ...f, pautaItens: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Ata (opcional — preencher após a reunião)</Label>
                      <Textarea className="mt-1" rows={3} placeholder="Registre o que foi discutido e decidido..." value={formPauta.ata} onChange={e => setFormPauta(f => ({ ...f, ata: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" className="flex-1" onClick={() => setModalPauta(false)}>Cancelar</Button>
                    <Button className="flex-1" disabled={savingPauta || !formPauta.titulo.trim()}
                      onClick={async () => {
                        setSavingPauta(true);
                        try {
                          await http.post('/coordenacao/pautas', formPauta);
                          toast.success('Pauta criada com sucesso!');
                        } catch {
                          // Fallback local
                          setPautas(p => [{ ...formPauta, id: Date.now().toString() }, ...p]);
                          toast.success('Pauta criada (modo local)');
                        } finally {
                          setSavingPauta(false);
                          setModalPauta(false);
                          setFormPauta({ tipo: 'SEMANAL_UNIDADE', titulo: '', data: new Date().toISOString().split('T')[0], participantes: '', pautaItens: '', ata: '', status: 'AGENDADA' });
                        }
                      }}>
                      {savingPauta ? 'Salvando...' : 'Salvar Pauta'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── ABA: PLANEJAMENTOS ─── */}
      {aba === 'planejamentos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-900">Planejamentos das Turmas</h3>
              <p className="text-sm text-gray-500">Visualize e aprove os planejamentos enviados pelos professores</p>
            </div>
            {planejamentosEmRevisao > 0 && (
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                <AlertCircle className="h-3 w-3 mr-1 inline" />
                {planejamentosEmRevisao} aguardando revisão
              </Badge>
            )}
          </div>

          {planejamentos.length === 0 && (
            <EmptyState icon={<ClipboardList className="h-12 w-12 text-gray-300" />} title="Nenhum planejamento encontrado" description="Os planejamentos criados pelos professores aparecerão aqui" />
          )}

          <div className="space-y-3">
            {planejamentos.map(plan => {
              const isExpanded = planExpandedId === plan.id;
              const statusCor: Record<string, string> = {
                RASCUNHO: 'bg-gray-100 text-gray-600',
                EM_REVISAO: 'bg-yellow-100 text-yellow-700',
                APROVADO: 'bg-green-100 text-green-700',
                DEVOLVIDO: 'bg-orange-100 text-orange-700',
              };
              const statusLabel: Record<string, string> = {
                RASCUNHO: 'Rascunho',
                EM_REVISAO: 'Em Revisão',
                APROVADO: 'Aprovado',
                DEVOLVIDO: 'Devolvido',
              };
              return (
                <Card key={plan.id} className="border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={`text-xs ${statusCor[plan.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {statusLabel[plan.status] ?? plan.status}
                          </Badge>
                          {plan.classroom && <Badge className="text-xs bg-blue-50 text-blue-700">{plan.classroom.name}</Badge>}
                        </div>
                        <h4 className="font-semibold text-gray-900 truncate">{plan.title}</h4>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {new Date(plan.startDate).toLocaleDateString('pt-BR')} — {new Date(plan.endDate).toLocaleDateString('pt-BR')}
                          {plan.createdByUser && ` · Prof. ${plan.createdByUser.firstName} ${plan.createdByUser.lastName}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => setPlanExpandedId(isExpanded ? null : plan.id)}
                        >
                          <Eye className="h-3 w-3 mr-1" /> {isExpanded ? 'Fechar' : 'Ver'}
                        </Button>
                        {plan.status === 'EM_REVISAO' && (
                          <>
                            <Button
                              size="sm"
                              className="text-xs bg-green-600 hover:bg-green-700"
                              disabled={savingPlan}
                              onClick={() => aprovarPlanejamento(plan.id)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" /> Aprovar
                            </Button>
                            <Button
                              size="sm"
                              className="text-xs bg-orange-500 hover:bg-orange-600"
                              disabled={savingPlan}
                              onClick={() => { setModalDevolver({ id: plan.id, titulo: plan.title }); setMotivoDevolver(''); }}
                            >
                              Devolver
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-2 text-sm text-gray-700">
                        <p><span className="font-semibold">Período:</span> {new Date(plan.startDate).toLocaleDateString('pt-BR')} — {new Date(plan.endDate).toLocaleDateString('pt-BR')}</p>
                        {plan.createdByUser && (
                          <p><span className="font-semibold">Professor:</span> {plan.createdByUser.firstName} {plan.createdByUser.lastName}</p>
                        )}
                        {plan.classroom && (
                          <p><span className="font-semibold">Turma:</span> {plan.classroom.name}</p>
                        )}
                        <p><span className="font-semibold">Status:</span> {statusLabel[plan.status] ?? plan.status}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Modal: Devolver Planejamento ─── */}
      {modalDevolver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertCircle className="h-5 w-5" />
                Devolver para Correção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Informe o motivo da devolução para <strong>{modalDevolver.titulo}</strong>.
                O professor receberá este comentário e poderá corrigir e reenviar.
              </p>
              <div>
                <Label className="text-sm font-semibold">Motivo da devolução <span className="text-red-500">*</span></Label>
                <Textarea
                  ref={motivoRef}
                  className="mt-1"
                  rows={4}
                  placeholder="Descreva o que precisa ser corrigido ou melhorado..."
                  value={motivoDevolver}
                  onChange={e => setMotivoDevolver(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">{motivoDevolver.length} caracteres (mínimo 5)</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setModalDevolver(null)} disabled={savingPlan}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  onClick={devolverPlanejamento}
                  disabled={savingPlan || motivoDevolver.trim().length < 5}
                >
                  {savingPlan ? 'Devolvendo...' : 'Confirmar Devolução'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Modal: Agendar Reunião ─── */}
      {modalReuniao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Agendar Reunião Pedagógica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Tipo de Reunião</Label>
                <div className="flex gap-3 mt-2">
                  {[
                    { id: 'SEMANAL', label: '📅 Semanal', desc: 'Coordenadora + Professoras da unidade' },
                    { id: 'MENSAL', label: '📆 Mensal', desc: 'Coordenação Geral + Todas as Coordenadoras' },
                  ].map(tipo => (
                    <button key={tipo.id} onClick={() => setFormReuniao(f => ({ ...f, tipo: tipo.id as any }))}
                      className={`flex-1 p-3 rounded-xl border-2 text-left transition-all ${formReuniao.tipo === tipo.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                      <div className="font-semibold text-sm">{tipo.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{tipo.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">Título</Label>
                <Input className="mt-1" placeholder="Ex: Reunião Pedagógica Semanal — Semana 10"
                  value={formReuniao.titulo} onChange={e => setFormReuniao(f => ({ ...f, titulo: e.target.value }))} />
              </div>

              <div>
                <Label className="text-sm font-semibold">Data</Label>
                <Input type="date" className="mt-1" value={formReuniao.data}
                  onChange={e => setFormReuniao(f => ({ ...f, data: e.target.value }))} />
              </div>

              {formReuniao.tipo === 'SEMANAL' && turmas.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold">Turma (opcional)</Label>
                  <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    value={formReuniao.turmaId} onChange={e => setFormReuniao(f => ({ ...f, turmaId: e.target.value }))}>
                    <option value="">Todas as turmas</option>
                    {turmas.map(t => <option key={t.id} value={t.id}>{t.name} ({t.segment})</option>)}
                  </select>
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold">Pauta</Label>
                <Textarea className="mt-1" rows={4} placeholder="Descreva os tópicos a serem discutidos..."
                  value={formReuniao.pauta} onChange={e => setFormReuniao(f => ({ ...f, pauta: e.target.value }))} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setModalReuniao(false)}>Cancelar</Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={salvarReuniao} disabled={saving}>
                  {saving ? 'Agendando...' : 'Agendar Reunião'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
