import { useState, useEffect, useCallback } from 'react';
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
import { createMicrogestureEvent, type MicrogestureKind } from '../services/microgestures';
import {
  BookOpen, Plus, Save, Calendar, ChevronDown, ChevronUp,
  Sparkles, Lightbulb, Target, Clock, RefreshCw,
  CheckCircle, Users, Search, UserCircle, X, Brain, Heart, Apple, Star,
} from 'lucide-react';
import { AlergiaAlert } from '../components/ui/AlergiaAlert';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Crianca {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  idade?: number;
  gender?: string;
  allergies?: string | null;
  medicalConditions?: string | null;
}

interface DiaryEntry {
  id: string;
  date: string;
  climaEmocional: string;
  microgestos: Microgesto[];
  rotina: RotinaItem[];
  momentoDestaque: string;
  reflexaoPedagogica: string;
  encaminhamentos: string;
  presencas: number;
  ausencias: number;
  status: string;
  createdAt: string;
}

interface Microgesto {
  id: string;
  tipo: string;
  descricao: string;
  criancaId?: string;
  criancaNome?: string;
  criancaFoto?: string;
  campo: string;
  horario?: string;
}

interface ObservacaoIndividual {
  id?: string;
  childId: string;
  category: string;
  date: string;
  behaviorDescription?: string;
  socialInteraction?: string;
  emotionalState?: string;
  dietaryNotes?: string;
  sleepPattern?: string;
  learningProgress?: string;
  planningParticipation?: string;
  psychologicalNotes?: string;
  developmentAlerts?: string;
  recommendations?: string;
  child?: { id: string; firstName: string; lastName: string; photoUrl?: string };
}

interface RotinaItem {
  momento: string;
  descricao: string;
  observacao?: string;
  concluido: boolean;
}

// ─── Microgestos Pedagógicos ──────────────────────────────────────────────────
const TIPOS_MICROGESTO = [
  { id: 'ESCUTA', label: 'Escuta Ativa', emoji: '👂', desc: 'Momento de escuta sensível e acolhimento da fala da criança' },
  { id: 'MEDIACAO', label: 'Mediação', emoji: '🤝', desc: 'Intervenção pedagógica que amplia a experiência da criança' },
  { id: 'PROVOCACAO', label: 'Provocação', emoji: '💡', desc: 'Questionamento ou situação que instiga curiosidade e pensamento' },
  { id: 'ACOLHIMENTO', label: 'Acolhimento', emoji: '💚', desc: 'Gesto de cuidado, afeto e suporte emocional' },
  { id: 'OBSERVACAO', label: 'Observação', emoji: '👁️', desc: 'Registro de comportamento, aprendizagem ou interação observada' },
  { id: 'ENCORAJAMENTO', label: 'Encorajamento', emoji: '⭐', desc: 'Incentivo à autonomia, persistência e autoconfiança' },
  { id: 'DOCUMENTACAO', label: 'Documentação', emoji: '📸', desc: 'Registro fotográfico ou escrito de momento significativo' },
  { id: 'INTENCIONALIDADE', label: 'Intencionalidade', emoji: '🎯', desc: 'Ação pedagógica intencional vinculada ao planejamento' },
];

const CAMPOS_EXPERIENCIA = [
  { id: 'eu-outro-nos', label: 'O eu, o outro e o nós', emoji: '🤝' },
  { id: 'corpo-gestos', label: 'Corpo, gestos e movimentos', emoji: '🏃' },
  { id: 'tracos-sons', label: 'Traços, sons, cores e formas', emoji: '🎨' },
  { id: 'escuta-fala', label: 'Escuta, fala, pensamento e imaginação', emoji: '💬' },
  { id: 'espacos-tempos', label: 'Espaços, tempos, quantidades e relações', emoji: '🌍' },
];

// ─── Clima Emocional da Turma ─────────────────────────────────────────────────
const CLIMAS = [
  { id: 'MUITO_BOM', label: 'Muito Bom', emoji: '☀️', cor: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { id: 'BOM', label: 'Bom', emoji: '🌤️', cor: 'bg-green-100 text-green-700 border-green-300' },
  { id: 'REGULAR', label: 'Regular', emoji: '⛅', cor: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'AGITADO', label: 'Agitado', emoji: '🌩️', cor: 'bg-orange-100 text-orange-700 border-orange-300' },
  { id: 'DIFICIL', label: 'Difícil', emoji: '🌧️', cor: 'bg-gray-100 text-gray-600 border-gray-300' },
];

// ─── Rotina Padrão ────────────────────────────────────────────────────────────
const ROTINA_PADRAO = [
  { momento: 'Acolhida', descricao: 'Recepção das crianças, roda de conversa inicial', concluido: false },
  { momento: 'Roda de Conversa', descricao: 'Calendário, tempo, novidades, planejamento do dia', concluido: false },
  { momento: 'Atividade Dirigida', descricao: 'Atividade pedagógica intencional', concluido: false },
  { momento: 'Brincadeira Livre', descricao: 'Exploração autônoma de brinquedos e espaços', concluido: false },
  { momento: 'Higiene', descricao: 'Lavagem das mãos, troca de fraldas/banheiro', concluido: false },
  { momento: 'Refeição', descricao: 'Lanche ou almoço com autonomia e socialização', concluido: false },
  { momento: 'Repouso', descricao: 'Momento de descanso e relaxamento', concluido: false },
  { momento: 'Atividade Complementar', descricao: 'Arte, música, movimento ou exploração externa', concluido: false },
  { momento: 'Roda de Encerramento', descricao: 'Revisão do dia, combinados, despedida', concluido: false },
];

// ─── Seletor de Criança por Foto ──────────────────────────────────────────────
function SeletorCrianca({
  criancas,
  selecionadas,
  onToggle,
  multiplo = false,
  label = 'Criança(s) envolvida(s)',
}: {
  criancas: Crianca[];
  selecionadas: string[];
  onToggle: (id: string) => void;
  multiplo?: boolean;
  label?: string;
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-gray-700 mb-2 block">{label} (opcional)</Label>
      {criancas.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Nenhuma criança cadastrada na turma</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {criancas.map(c => {
            const sel = selecionadas.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggle(c.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${sel ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-blue-300'}`}
                title={`${c.firstName} ${c.lastName}`}
              >
                {c.photoUrl ? (
                  <img src={c.photoUrl} alt={c.firstName} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-2 border-white shadow">
                    <UserCircle className="w-6 h-6 text-blue-400" />
                  </div>
                )}
                <span className={`text-xs font-medium leading-tight text-center max-w-[60px] truncate ${sel ? 'text-blue-700' : 'text-gray-600'}`}>
                  {c.firstName}
                </span>
                {sel && <span className="text-blue-500 text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}
      {!multiplo && selecionadas.length > 0 && (
        <button
          type="button"
          onClick={() => onToggle(selecionadas[0])}
          className="mt-1 text-xs text-gray-400 hover:text-red-400 flex items-center gap-1"
        >
          <X className="h-3 w-3" /> Remover seleção
        </button>
      )}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function DiarioBordoPage() {
  const [aba, setAba] = useState<'lista' | 'novo' | 'microgestos' | 'observacoes'>('lista');
  const [diarios, setDiarios] = useState<DiaryEntry[]>([]);
  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  // Formulário do Diário
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    climaEmocional: 'BOM',
    momentoDestaque: '',
    reflexaoPedagogica: '',
    encaminhamentos: '',
    presencas: 0,
    ausencias: 0,
    rotina: ROTINA_PADRAO.map(r => ({ ...r })),
    microgestos: [] as Microgesto[],
    criancasPresentes: [] as string[],
  });

  // Formulário de microgesto
  const [microgestoForm, setMicrogestoForm] = useState({
    tipo: 'ESCUTA',
    descricao: '',
    campo: 'eu-outro-nos',
    horario: '',
    criancasSelecionadas: [] as string[],
  });

  // Dados da turma e professor
  const [classroomId, setClassroomId] = useState<string | undefined>();
  const [childId, setChildId] = useState<string | undefined>();
  const [savingMicrogesto, setSavingMicrogesto] = useState(false);
  // Chamada do dia pré-carregada para preencher presenças automaticamente
  const [chamadaCarregada, setChamadaCarregada] = useState(false);
  const [chamadaInfo, setChamadaInfo] = useState<{ presentes: number; ausentes: number; total: number } | null>(null);
  // Planejamento aprovado do dia
  const [planejamentoHoje, setPlanejamentoHoje] = useState<{ id: string; title: string; objectives?: string; activities?: string; status: string } | null>(null);

  // Observações individuais
  const [observacoes, setObservacoes] = useState<ObservacaoIndividual[]>([]);
  const [loadingObs, setLoadingObs] = useState(false);
  const [savingObs, setSavingObs] = useState(false);
  const [criancaSelecionadaObs, setCriancaSelecionadaObs] = useState<string>('');
  const [obsForm, setObsForm] = useState({
    category: 'GERAL',
    date: new Date().toISOString().split('T')[0],
    behaviorDescription: '',
    socialInteraction: '',
    emotionalState: '',
    dietaryNotes: '',
    sleepPattern: '',
    learningProgress: '',
    planningParticipation: '',
    psychologicalNotes: '',
    developmentAlerts: '',
    recommendations: '',
  });

  useEffect(() => {
    loadDiarios();
    loadTurmaECriancas();
  }, []);

  async function loadObservacoes(cid?: string) {
    setLoadingObs(true);
    try {
      const params: Record<string, string> = {};
      if (cid) params.childId = cid;
      if (classroomId) params.classroomId = classroomId;
      const res = await http.get('/development-observations', { params });
      setObservacoes(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
    } catch {
      setObservacoes([]);
    } finally {
      setLoadingObs(false);
    }
  }

  async function salvarObservacao() {
    if (!criancaSelecionadaObs) { toast.error('Selecione uma criança'); return; }
    setSavingObs(true);
    try {
      await http.post('/development-observations', {
        childId: criancaSelecionadaObs,
        classroomId,
        ...obsForm,
        date: obsForm.date + 'T12:00:00.000Z',
      });
      toast.success('Observação salva com sucesso!');
      setObsForm({
        category: 'GERAL', date: new Date().toISOString().split('T')[0],
        behaviorDescription: '', socialInteraction: '', emotionalState: '',
        dietaryNotes: '', sleepPattern: '', learningProgress: '',
        planningParticipation: '', psychologicalNotes: '', developmentAlerts: '', recommendations: '',
      });
      setCriancaSelecionadaObs('');
      loadObservacoes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar observação');
    } finally {
      setSavingObs(false);
    }
  }

  async function loadTurmaECriancas() {
    try {
      // Usa o endpoint de lookup que retorna turmas acessíveis ao professor
      const turmasRes = await http.get('/lookup/classrooms/accessible');
      const turmas: { id: string; name: string }[] = Array.isArray(turmasRes.data) ? turmasRes.data : [];
      if (turmas.length === 0) return;
      const cid = turmas[0].id;
      setClassroomId(cid);

      // Buscar crianças matriculadas na turma
      let lista: Crianca[] = [];
      try {
        const criancasRes = await http.get('/lookup/children/accessible', { params: { classroomId: cid } });
        lista = Array.isArray(criancasRes.data) ? criancasRes.data : [];
        setCriancas(lista);
        if (lista.length > 0) setChildId(lista[0].id);
      } catch {
        setCriancas([]);
      }

      // Pré-carregar chamada do dia para preencher presenças automaticamente
      // Usa data local para evitar bug de timezone servidor UTC vs cliente GMT-3
      try {
        const hoje = (() => {
          const d = new Date();
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${dd}`;
        })();
        const chamadaRes = await http.get('/attendance/today', { params: { classroomId: cid, date: hoje } });
        const chamadaData = chamadaRes.data;
        if (chamadaData?.alunos && chamadaData.alunos.length > 0) {
          // Pré-marcar crianças com status PRESENTE na chamada
          const presentesIds: string[] = chamadaData.alunos
            .filter((a: any) => a.status === 'PRESENTE')
            .map((a: any) => a.id);
          if (presentesIds.length > 0) {
            setForm(f => ({ ...f, criancasPresentes: presentesIds }));
            setChamadaCarregada(true);
            setChamadaInfo({
              presentes: chamadaData.presentes ?? presentesIds.length,
              ausentes: chamadaData.ausentes ?? (chamadaData.totalAlunos - presentesIds.length),
              total: chamadaData.totalAlunos ?? lista.length,
            });
          }
        }
      } catch {
        // Chamada ainda não feita — não é erro, apenas não pré-preenche
      }

      // Buscar planejamento aprovado/em execução do dia
      try {
        const hoje = (() => {
          const d = new Date();
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${dd}`;
        })();
        const planRes = await http.get('/plannings', {
          params: {
            classroomId: cid,
            startDate: hoje,
            endDate: hoje,
            limit: 1,
          },
        });
        const planData = planRes.data;
        const planList = Array.isArray(planData) ? planData : planData?.data ?? [];
        // Aceitar planejamentos APROVADO ou EM_EXECUCAO
        const planHoje = planList.find((p: any) =>
          p.status === 'APROVADO' || p.status === 'EM_EXECUCAO' || p.status === 'ACTIVE'
        );
        if (planHoje) {
          const pc = typeof planHoje.pedagogicalContent === 'string'
            ? JSON.parse(planHoje.pedagogicalContent)
            : planHoje.pedagogicalContent;
          setPlanejamentoHoje({
            id: planHoje.id,
            title: planHoje.title || 'Planejamento do Dia',
            objectives: pc?.objetivos || planHoje.objectives || '',
            activities: pc?.atividades || planHoje.activities || '',
            status: planHoje.status,
          });
        }
      } catch {
        // Sem planejamento para hoje — não é erro
      }
    } catch {
      // sem turma vinculada
    }
  }

  async function loadDiarios() {
    setLoading(true);
    try {
      const res = await http.get('/diary-events?limit=50&type=ATIVIDADE_PEDAGOGICA');
      const d = res.data;
      setDiarios(Array.isArray(d) ? d : d?.data ?? []);
    } catch {
      // Tenta carregar do localStorage como fallback
      try {
        const local = JSON.parse(localStorage.getItem('diarios_bordo') || '[]');
        setDiarios(local);
      } catch { /* silencioso */ }
    } finally {
      setLoading(false);
    }
  }

  function toggleCriancaMicrogesto(id: string) {
    setMicrogestoForm(f => ({
      ...f,
      criancasSelecionadas: f.criancasSelecionadas.includes(id)
        ? f.criancasSelecionadas.filter(c => c !== id)
        : [...f.criancasSelecionadas, id],
    }));
  }

  function toggleCriancaPresente(id: string) {
    setForm(f => ({
      ...f,
      criancasPresentes: f.criancasPresentes.includes(id)
        ? f.criancasPresentes.filter(c => c !== id)
        : [...f.criancasPresentes, id],
    }));
  }

  const adicionarMicrogesto = useCallback(async () => {
    if (!microgestoForm.descricao.trim()) { toast.error('Descreva o microgesto'); return; }

    // Montar nomes e fotos das crianças selecionadas
    const criancasSel = criancas.filter(c => microgestoForm.criancasSelecionadas.includes(c.id));
    const criancaNome = criancasSel.map(c => c.firstName).join(', ');
    const criancaFoto = criancasSel[0]?.photoUrl;
    const criancaIdSel = criancasSel[0]?.id;

    // Bloquear se não houver criança selecionada
    if (!criancaIdSel) {
      toast.error('Selecione uma criança antes de registrar o microgesto.');
      return;
    }
    // Bloquear se não houver turma identificada
    if (!classroomId) {
      toast.error('Turma não identificada. Recarregue a página e tente novamente.');
      return;
    }

    setSavingMicrogesto(true);
    try {
      // Mapear tipo do microgesto pedagógico para MicrogestureKind
      // Tipos pedagógicos (ESCUTA, MEDIACAO, etc.) são salvos como OBSERVACAO no backend
      const kindMap: Record<string, MicrogestureKind> = {
        ESCUTA: 'OBSERVACAO',
        MEDIACAO: 'OBSERVACAO',
        PROVOCACAO: 'OBSERVACAO',
        ACOLHIMENTO: 'OBSERVACAO',
        OBSERVACAO: 'OBSERVACAO',
        ENCORAJAMENTO: 'OBSERVACAO',
        DOCUMENTACAO: 'OBSERVACAO',
        INTENCIONALIDADE: 'OBSERVACAO',
      };
      const kind: MicrogestureKind = kindMap[microgestoForm.tipo] ?? 'OBSERVACAO';

      const horarioInfo = microgestoForm.horario ? ` [${microgestoForm.horario}]` : '';
      const campoInfo = microgestoForm.campo ? ` | Campo: ${microgestoForm.campo}` : '';
      const tipoLabel = TIPOS_MICROGESTO.find(t => t.id === microgestoForm.tipo)?.label ?? microgestoForm.tipo;

      await createMicrogestureEvent({
        childId: criancaIdSel,
        classroomId,
        kind,
        payload: {
          texto: `[${tipoLabel}]${horarioInfo}${campoInfo} — ${microgestoForm.descricao}`,
        },
        eventDate: new Date().toISOString(),
      });

      // Adicionar também ao estado local para exibição imediata na lista do diário
      const novo: Microgesto = {
        id: Date.now().toString(),
        tipo: microgestoForm.tipo,
        descricao: microgestoForm.descricao,
        campo: microgestoForm.campo,
        horario: microgestoForm.horario,
        criancaId: criancaIdSel,
        criancaNome: criancaNome || undefined,
        criancaFoto: criancaFoto,
      };
      setForm(f => ({ ...f, microgestos: [...f.microgestos, novo] }));
      setMicrogestoForm({ tipo: 'ESCUTA', descricao: '', campo: 'eu-outro-nos', horario: '', criancasSelecionadas: [] });
      toast.success('Registrado com sucesso!');
    } catch (err: unknown) {
      const e = err as Error;
      toast.error(e?.message || 'Erro ao salvar microgesto');
    } finally {
      setSavingMicrogesto(false);
    }
  }, [microgestoForm, criancas, classroomId]);

  function removerMicrogesto(id: string) {
    setForm(f => ({ ...f, microgestos: f.microgestos.filter(m => m.id !== id) }));
  }

  function toggleRotinaItem(idx: number) {
    setForm(f => ({
      ...f,
      rotina: f.rotina.map((r, i) => i === idx ? { ...r, concluido: !r.concluido } : r),
    }));
  }

  async function salvarDiario() {
    if (!form.momentoDestaque.trim() && !form.reflexaoPedagogica.trim()) {
      toast.error('Preencha pelo menos o Momento de Destaque ou a Reflexão Pedagógica');
      return;
    }
    setSaving(true);
    try {
      const presencasReais = form.criancasPresentes.length > 0 ? form.criancasPresentes.length : form.presencas;
      const ausenciasReais = criancas.length > 0 ? criancas.length - presencasReais : form.ausencias;

      if (!classroomId || !childId) {
        // Modo offline/demo: salva localmente
        const localEntry = {
          id: Date.now().toString(),
          date: form.date,
          climaEmocional: form.climaEmocional,
          momentoDestaque: form.momentoDestaque,
          reflexaoPedagogica: form.reflexaoPedagogica,
          encaminhamentos: form.encaminhamentos,
          presencas: presencasReais,
          ausencias: ausenciasReais,
          rotina: form.rotina,
          microgestos: form.microgestos,
          status: 'LOCAL',
          createdAt: new Date().toISOString(),
        };
        const saved = JSON.parse(localStorage.getItem('diarios_bordo') || '[]');
        saved.unshift(localEntry);
        localStorage.setItem('diarios_bordo', JSON.stringify(saved.slice(0, 100)));
      } else {
        await http.post('/diary-events', {
          type: 'ATIVIDADE_PEDAGOGICA',
          title: form.momentoDestaque.substring(0, 100) || 'Diário de Bordo',
          description: form.reflexaoPedagogica || form.momentoDestaque,
          eventDate: form.date + 'T12:00:00.000Z',
          childId,
          classroomId,
          observations: form.encaminhamentos,
          developmentNotes: form.reflexaoPedagogica,
          presencas: presencasReais,
          ausencias: ausenciasReais,
          microgestos: form.microgestos,
          tags: [form.climaEmocional],
          aiContext: {
            climaEmocional: form.climaEmocional,
            momentoDestaque: form.momentoDestaque,
            rotina: form.rotina,
            criancasPresentes: form.criancasPresentes,
          },
        });
      }
      toast.success('Diário de Bordo salvo!');
      setAba('lista');
      loadDiarios();
      setForm({
        date: new Date().toISOString().split('T')[0],
        climaEmocional: 'BOM',
        momentoDestaque: '',
        reflexaoPedagogica: '',
        encaminhamentos: '',
        presencas: 0,
        ausencias: 0,
        rotina: ROTINA_PADRAO.map(r => ({ ...r })),
        microgestos: [],
        criancasPresentes: [],
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar diário');
    } finally {
      setSaving(false);
    }
  }

  const diariosFiltrados = diarios.filter(d => {
    if (busca && !new Date(d.date || d.createdAt).toLocaleDateString('pt-BR').includes(busca) && !(d.momentoDestaque || '').toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <PageShell title="Diário de Bordo" subtitle="Registre o dia pedagógico, microgestos e reflexões sobre a prática docente">
      {/* Abas */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
        {[
          { id: 'lista', label: 'Meus Diários', icon: <BookOpen className="h-4 w-4" /> },
          { id: 'novo', label: 'Novo Registro', icon: <Plus className="h-4 w-4" /> },
          { id: 'observacoes', label: 'Observações Individuais', icon: <Brain className="h-4 w-4" /> },
          { id: 'microgestos', label: 'O que são Microgestos?', icon: <Sparkles className="h-4 w-4" /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setAba(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${aba === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── LISTA DE DIÁRIOS ─── */}
      {aba === 'lista' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar por data ou conteúdo..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <Button onClick={() => setAba('novo')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Novo Diário
            </Button>
          </div>

          {loading && <LoadingState message="Carregando diários..." />}

          {!loading && diariosFiltrados.length === 0 && (
            <EmptyState
              icon={<BookOpen className="h-12 w-12 text-gray-300" />}
              title="Nenhum diário registrado"
              description="Comece registrando o dia pedagógico de hoje"
              action={<Button onClick={() => setAba('novo')}><Plus className="h-4 w-4 mr-2" />Criar Diário</Button>}
            />
          )}

          <div className="space-y-3">
            {diariosFiltrados.map(diario => {
              const clima = CLIMAS.find(c => c.id === diario.climaEmocional) || CLIMAS[1];
              const isExpanded = expandedId === diario.id;
              return (
                <Card key={diario.id} className="border-2 hover:border-blue-200 transition-all">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${clima.cor}`}>
                            {clima.emoji} {clima.label}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(diario.date || diario.createdAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                          </span>
                          {diario.microgestos?.length > 0 && (
                            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                              {diario.microgestos.length} microgestos
                            </span>
                          )}
                        </div>
                        {diario.momentoDestaque && (
                          <p className="text-sm text-gray-700 line-clamp-2 mt-1">
                            <span className="font-medium">Destaque: </span>{diario.momentoDestaque}
                          </p>
                        )}
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          {diario.presencas > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3 text-green-500" />{diario.presencas} presentes</span>}
                          {diario.ausencias > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3 text-red-400" />{diario.ausencias} ausentes</span>}
                        </div>
                      </div>
                      <button onClick={() => setExpandedId(isExpanded ? null : diario.id)} className="text-gray-400 hover:text-gray-600 p-1">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        {diario.rotina?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Rotina do Dia</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {diario.rotina.map((r: any, i: number) => (
                                <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${r.concluido ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                                  <CheckCircle className={`h-3.5 w-3.5 flex-shrink-0 ${r.concluido ? 'text-green-500' : 'text-gray-300'}`} />
                                  {r.momento}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {diario.microgestos?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Microgestos Pedagógicos</p>
                            <div className="space-y-2">
                              {diario.microgestos.map((m: any, i: number) => {
                                const tipo = TIPOS_MICROGESTO.find(t => t.id === m.tipo);
                                return (
                                  <div key={i} className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg">
                                    <span className="text-base flex-shrink-0">{tipo?.emoji || '✨'}</span>
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-purple-700">{tipo?.label || m.tipo}</p>
                                      <p className="text-xs text-gray-600">{m.descricao}</p>
                                      {m.criancaNome && (
                                        <div className="flex items-center gap-1 mt-1">
                                          {m.criancaFoto ? (
                                            <img src={m.criancaFoto} alt={m.criancaNome} className="w-5 h-5 rounded-full object-cover" />
                                          ) : (
                                            <UserCircle className="w-4 h-4 text-gray-400" />
                                          )}
                                          <p className="text-xs text-gray-500">{m.criancaNome}</p>
                                        </div>
                                      )}
                                    </div>
                                    {m.horario && <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{m.horario}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {diario.reflexaoPedagogica && (
                          <div className="bg-indigo-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-indigo-500 uppercase mb-1">Reflexão Pedagógica</p>
                            <p className="text-sm text-indigo-700">{diario.reflexaoPedagogica}</p>
                          </div>
                        )}
                        {diario.encaminhamentos && (
                          <div className="bg-orange-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-orange-500 uppercase mb-1">Encaminhamentos</p>
                            <p className="text-sm text-orange-700">{diario.encaminhamentos}</p>
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

      {/* ─── NOVO DIÁRIO ─── */}
      {aba === 'novo' && (
        <div className="space-y-6 max-w-3xl">
          {/* Card de Planejamento do Dia */}
          {planejamentoHoje ? (
            <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Target className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-indigo-800">Planejamento do Dia</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-200 text-indigo-800">
                      {planejamentoHoje.status === 'EM_EXECUCAO' ? 'Em Execução' : 'Aprovado'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-indigo-900 mb-1">{planejamentoHoje.title}</p>
                  {planejamentoHoje.objectives && (
                    <p className="text-xs text-indigo-700 mb-1"><strong>Objetivos:</strong> {planejamentoHoje.objectives}</p>
                  )}
                  {planejamentoHoje.activities && (
                    <p className="text-xs text-indigo-700"><strong>Atividades:</strong> {planejamentoHoje.activities}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-500">Nenhum planejamento aprovado para hoje. Registre o diário livremente.</p>
            </div>
          )}
          {/* Cabeçalho */}
          <Card className="border-2 border-blue-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-blue-700"><Calendar className="h-5 w-5" /> Informações do Dia</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                {criancas.length === 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Presenças</Label>
                      <Input type="number" min={0} value={form.presencas} onChange={e => setForm(f => ({ ...f, presencas: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>Ausências</Label>
                      <Input type="number" min={0} value={form.ausencias} onChange={e => setForm(f => ({ ...f, ausencias: Number(e.target.value) }))} />
                    </div>
                  </div>
                )}
              </div>

              {/* Chamada visual por fotos */}
              {criancas.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Chamada — Crianças Presentes ({form.criancasPresentes.length}/{criancas.length})</Label>
                    {chamadaCarregada && chamadaInfo && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                        <CheckCircle className="h-3 w-3" /> Chamada importada da lista de presença
                      </span>
                    )}
                  </div>
                  {!chamadaCarregada && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                      ⚠️ Chamada do dia ainda não realizada. Marque as presenças manualmente ou acesse <strong>Chamada Diária</strong> primeiro.
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mb-2">Toque na foto para ajustar a presença</p>
                  <div className="flex flex-wrap gap-2">
                    {criancas.map(c => {
                      const presente = form.criancasPresentes.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCriancaPresente(c.id)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${presente ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white opacity-60 hover:opacity-100'}`}
                        >
                          {c.photoUrl ? (
                            <img src={c.photoUrl} alt={c.firstName} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                              <UserCircle className="w-6 h-6 text-blue-400" />
                            </div>
                          )}
                          <span className="text-xs font-medium text-center max-w-[60px] truncate">{c.firstName}</span>
                          {presente && <span className="text-green-500 text-xs font-bold">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {form.criancasPresentes.length} presente(s) · {criancas.length - form.criancasPresentes.length} ausente(s)
                  </p>
                </div>
              )}

              <div>
                <Label>Clima Emocional da Turma</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {CLIMAS.map(clima => (
                    <button key={clima.id} onClick={() => setForm(f => ({ ...f, climaEmocional: clima.id }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${form.climaEmocional === clima.id ? clima.cor + ' border-current shadow-sm' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {clima.emoji} {clima.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rotina */}
          <Card className="border-2 border-green-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-green-700"><Clock className="h-5 w-5" /> Rotina do Dia</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-3">Marque os momentos da rotina que foram realizados hoje</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {form.rotina.map((item, idx) => (
                  <button key={idx} onClick={() => toggleRotinaItem(idx)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${item.concluido ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <CheckCircle className={`h-5 w-5 flex-shrink-0 ${item.concluido ? 'text-green-500' : 'text-gray-300'}`} />
                    <div>
                      <p className={`text-sm font-medium ${item.concluido ? 'text-green-700' : 'text-gray-700'}`}>{item.momento}</p>
                      <p className="text-xs text-gray-400">{item.descricao}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Microgestos */}
          <Card className="border-2 border-purple-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-purple-700"><Sparkles className="h-5 w-5" /> Microgestos Pedagógicos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">Registre as pequenas ações pedagógicas intencionais que você realizou ao longo do dia</p>

              {/* Formulário de microgesto */}
              <div className="bg-purple-50 rounded-xl p-4 space-y-3">
                {/* Tipo */}
                <div>
                  <Label>Tipo de Microgesto</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    {TIPOS_MICROGESTO.map(tipo => (
                      <button key={tipo.id} onClick={() => setMicrogestoForm(f => ({ ...f, tipo: tipo.id }))}
                        className={`p-2 rounded-lg border-2 text-center transition-all ${microgestoForm.tipo === tipo.id ? 'border-purple-400 bg-white shadow-sm' : 'border-transparent bg-white/50 hover:bg-white'}`}>
                        <span className="text-lg block">{tipo.emoji}</span>
                        <span className="text-xs font-medium text-gray-700">{tipo.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Campo de Experiência */}
                <div>
                  <Label>Campo de Experiência</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {CAMPOS_EXPERIENCIA.map(c => (
                      <button key={c.id} onClick={() => setMicrogestoForm(f => ({ ...f, campo: c.id }))}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full border-2 text-xs font-medium transition-all ${microgestoForm.campo === c.id ? 'border-purple-500 bg-purple-100 text-purple-700' : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300'}`}>
                        {c.emoji} {c.label.split(',')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seleção de criança por foto */}
                <SeletorCrianca
                  criancas={criancas}
                  selecionadas={microgestoForm.criancasSelecionadas}
                  onToggle={toggleCriancaMicrogesto}
                  multiplo={true}
                  label="Criança(s) envolvida(s)"
                />

                {/* Horário */}
                <div>
                  <Label>Horário (opcional)</Label>
                  <Input type="time" value={microgestoForm.horario} onChange={e => setMicrogestoForm(f => ({ ...f, horario: e.target.value }))} />
                </div>

                {/* Descrição */}
                <div>
                  <Label>Descrição do Microgesto *</Label>
                  <Textarea
                    placeholder="Descreva a ação pedagógica: o que você fez, como a criança respondeu, qual foi o impacto..."
                    rows={2}
                    value={microgestoForm.descricao}
                    onChange={e => setMicrogestoForm(f => ({ ...f, descricao: e.target.value }))}
                  />
                </div>

                <Button onClick={adicionarMicrogesto} disabled={savingMicrogesto} variant="outline" className="w-full border-purple-300 text-purple-700 hover:bg-purple-100">
                  {savingMicrogesto
                    ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                    : <><Plus className="h-4 w-4 mr-2" /> Adicionar Microgesto</>}
                </Button>
              </div>

              {/* Lista de microgestos adicionados */}
              {form.microgestos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase">{form.microgestos.length} microgesto(s) registrado(s)</p>
                  {form.microgestos.map(m => {
                    const tipo = TIPOS_MICROGESTO.find(t => t.id === m.tipo);
                    return (
                      <div key={m.id} className="flex items-start gap-3 p-3 bg-white border border-purple-200 rounded-xl">
                        <span className="text-xl flex-shrink-0">{tipo?.emoji || '✨'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-purple-700">{tipo?.label}</p>
                          <p className="text-sm text-gray-700">{m.descricao}</p>
                          {m.criancaNome && (
                            <div className="flex items-center gap-1 mt-1">
                              {m.criancaFoto ? (
                                <img src={m.criancaFoto} alt={m.criancaNome} className="w-5 h-5 rounded-full object-cover" />
                              ) : (
                                <UserCircle className="w-4 h-4 text-gray-400" />
                              )}
                              <p className="text-xs text-gray-500">{m.criancaNome}</p>
                            </div>
                          )}
                        </div>
                        {m.horario && <span className="text-xs text-gray-400 flex-shrink-0">{m.horario}</span>}
                        <button onClick={() => removerMicrogesto(m.id)} className="text-gray-300 hover:text-red-400 flex-shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reflexão */}
          <Card className="border-2 border-indigo-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-indigo-700"><Lightbulb className="h-5 w-5" /> Reflexão Pedagógica</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Momento de Destaque do Dia</Label>
                <Textarea
                  placeholder="Descreva o momento mais significativo do dia: uma descoberta, uma fala marcante, uma interação especial, uma conquista..."
                  rows={3}
                  value={form.momentoDestaque}
                  onChange={e => setForm(f => ({ ...f, momentoDestaque: e.target.value }))}
                />
              </div>
              <div>
                <Label>Reflexão Pedagógica</Label>
                <Textarea
                  placeholder="Reflita sobre sua prática: O que funcionou bem? O que você faria diferente? Quais aprendizagens emergiram? Como as crianças surpreenderam?"
                  rows={3}
                  value={form.reflexaoPedagogica}
                  onChange={e => setForm(f => ({ ...f, reflexaoPedagogica: e.target.value }))}
                />
              </div>
              <div>
                <Label>Encaminhamentos e Próximos Passos</Label>
                <Textarea
                  placeholder="Registre o que precisa ser retomado, comunicado aos pais, encaminhado à coordenação ou planejado para os próximos dias..."
                  rows={2}
                  value={form.encaminhamentos}
                  onChange={e => setForm(f => ({ ...f, encaminhamentos: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={salvarDiario} disabled={saving} className="flex-1">
              {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Diário de Bordo
            </Button>
            <Button variant="outline" onClick={() => setAba('lista')}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* ─── OBSERVAÇÕES INDIVIDUAIS ─── */}
      {aba === 'observacoes' && (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-4">
            <p className="text-sm text-teal-700">
              Registre observações individuais de cada criança: comportamento, alimentação, sono, participação no plano de aula, desenvolvimento psicológico e físico.
              Essas informações ficam disponíveis para a coordenadora pedagógica e geram relatórios de evolução.
            </p>
          </div>

          {/* Seletor de criança */}
          <Card className="border-2 border-teal-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-teal-700"><UserCircle className="h-5 w-5" /> Selecionar Criança</CardTitle></CardHeader>
            <CardContent>
              {criancas.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Nenhuma criança cadastrada na turma</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {criancas.map(c => {
                    const sel = criancaSelecionadaObs === c.id;
                    return (
                      <button key={c.id} type="button"
                        onClick={() => { setCriancaSelecionadaObs(sel ? '' : c.id); loadObservacoes(sel ? undefined : c.id); }}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${sel ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-gray-200 bg-white hover:border-teal-300'}`}>
                        {c.photoUrl ? (
                          <img src={c.photoUrl} alt={c.firstName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center">
                            <UserCircle className="w-6 h-6 text-teal-400" />
                          </div>
                        )}
                        <span className={`text-xs font-medium text-center max-w-[60px] truncate ${sel ? 'text-teal-700' : 'text-gray-600'}`}>{c.firstName}</span>
                        {sel && <span className="text-teal-500 text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulário de observação */}
          {criancaSelecionadaObs && (() => {
            const criancaObs = criancas.find(c => c.id === criancaSelecionadaObs);
            return (
            <Card className="border-2 border-teal-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-teal-700">
                  <Plus className="h-5 w-5" />
                  Nova Observação — {criancaObs?.firstName}
                </CardTitle>
              </CardHeader>
              {/* Alerta de Alergia */}
              {criancaObs && (
                <div className="px-6 pb-2">
                  <AlergiaAlert
                    childId={criancaObs.id}
                    allergies={criancaObs.allergies}
                    medicalConditions={criancaObs.medicalConditions}
                  />
                </div>
              )}
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data</Label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={obsForm.date}
                      onChange={e => setObsForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={obsForm.category}
                      onChange={e => setObsForm(f => ({ ...f, category: e.target.value }))}>
                      <option value="GERAL">Geral</option>
                      <option value="COMPORTAMENTO">Comportamento</option>
                      <option value="DESENVOLVIMENTO">Desenvolvimento</option>
                      <option value="SAUDE">Saúde e Bem-estar</option>
                      <option value="APRENDIZAGEM">Aprendizagem</option>
                    </select>
                  </div>
                </div>

                {/* Comportamento */}
                <div className="bg-orange-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-orange-700 flex items-center gap-2"><Heart className="h-4 w-4" /> Comportamento e Emoções</p>
                  <Textarea placeholder="Como foi o comportamento geral da criança hoje? Houve agitação, choro, agressividade, tranquilidade?" rows={2}
                    value={obsForm.behaviorDescription} onChange={e => setObsForm(f => ({ ...f, behaviorDescription: e.target.value }))} />
                  <Textarea placeholder="Interação social com outras crianças e adultos..." rows={2}
                    value={obsForm.socialInteraction} onChange={e => setObsForm(f => ({ ...f, socialInteraction: e.target.value }))} />
                  <Textarea placeholder="Estado emocional: alegre, triste, ansioso, calmo..." rows={2}
                    value={obsForm.emotionalState} onChange={e => setObsForm(f => ({ ...f, emotionalState: e.target.value }))} />
                </div>

                {/* Alimentação e sono */}
                <div className="bg-green-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-green-700 flex items-center gap-2"><Apple className="h-4 w-4" /> Alimentação e Sono</p>
                  <Textarea placeholder="Como foi a alimentação? Aceitou bem? Recusou algum alimento? Quantidade ingerida..." rows={2}
                    value={obsForm.dietaryNotes} onChange={e => setObsForm(f => ({ ...f, dietaryNotes: e.target.value }))} />
                  <Textarea placeholder="Padrão de sono: dormiu bem, teve dificuldade, dormiu mais que o habitual..." rows={2}
                    value={obsForm.sleepPattern} onChange={e => setObsForm(f => ({ ...f, sleepPattern: e.target.value }))} />
                </div>

                {/* Pedagógico */}
                <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-blue-700 flex items-center gap-2"><Star className="h-4 w-4" /> Desenvolvimento Pedagógico</p>
                  <Textarea placeholder="Como foi o aprendizado? Progresso observado, dificuldades, conquistas..." rows={2}
                    value={obsForm.learningProgress} onChange={e => setObsForm(f => ({ ...f, learningProgress: e.target.value }))} />
                  <Textarea placeholder="Participação no plano de aula: engajamento, interesse, como foi o desempenho na atividade planejada..." rows={2}
                    value={obsForm.planningParticipation} onChange={e => setObsForm(f => ({ ...f, planningParticipation: e.target.value }))} />
                </div>

                {/* Psicológico / Desenvolvimento integral */}
                <div className="bg-purple-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-purple-700 flex items-center gap-2"><Brain className="h-4 w-4" /> Desenvolvimento Integral</p>
                  <Textarea placeholder="Observações psicológicas, mentais e físicas: sinais de ansiedade, dificuldades de atenção, desenvolvimento motor, linguagem..." rows={2}
                    value={obsForm.psychologicalNotes} onChange={e => setObsForm(f => ({ ...f, psychologicalNotes: e.target.value }))} />
                  <Textarea placeholder="Alertas de desenvolvimento: algo que chama atenção e pode indicar necessidade de acompanhamento especializado..." rows={2}
                    value={obsForm.developmentAlerts} onChange={e => setObsForm(f => ({ ...f, developmentAlerts: e.target.value }))} />
                  <Textarea placeholder="Recomendações e próximos passos para esta criança..." rows={2}
                    value={obsForm.recommendations} onChange={e => setObsForm(f => ({ ...f, recommendations: e.target.value }))} />
                </div>

                <Button onClick={salvarObservacao} disabled={savingObs} className="w-full bg-teal-600 hover:bg-teal-700">
                  {savingObs ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Observação Individual
                </Button>
              </CardContent>
            </Card>
            );
          })()}

          {/* Lista de observações da criança selecionada */}
          {criancaSelecionadaObs && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-600 uppercase">Histórico de Observações</h3>
              {loadingObs && <LoadingState message="Carregando observações..." />}
              {!loadingObs && observacoes.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-4">Nenhuma observação registrada para esta criança</p>
              )}
              {observacoes.map(obs => (
                <Card key={obs.id} className="border hover:border-teal-200 transition-all">
                  <CardContent className="pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">{obs.category}</span>
                      <span className="text-xs text-gray-400">{new Date(obs.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {obs.behaviorDescription && <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Comportamento:</span> {obs.behaviorDescription}</p>}
                    {obs.dietaryNotes && <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Alimentação:</span> {obs.dietaryNotes}</p>}
                    {obs.learningProgress && <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Aprendizagem:</span> {obs.learningProgress}</p>}
                    {obs.planningParticipation && <p className="text-sm text-gray-700 mb-1"><span className="font-medium">Plano de Aula:</span> {obs.planningParticipation}</p>}
                    {obs.developmentAlerts && <p className="text-sm text-red-600 mb-1"><span className="font-medium">⚠️ Alerta:</span> {obs.developmentAlerts}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── O QUE SÃO MICROGESTOS? ─── */}
      {aba === 'microgestos' && (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-purple-800 mb-2">O que são Microgestos Pedagógicos?</h2>
                <p className="text-gray-700 leading-relaxed">
                  Microgestos pedagógicos são as <strong>pequenas ações intencionais</strong> que o professor realiza no cotidiano da Educação Infantil —
                  um olhar atento, uma pergunta provocadora, um gesto de acolhimento, uma mediação sutil.
                  Embora pareçam simples, esses gestos são <strong>poderosos instrumentos pedagógicos</strong> que promovem
                  vínculos, ampliam aprendizagens e revelam a intencionalidade da prática docente.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TIPOS_MICROGESTO.map(tipo => (
              <Card key={tipo.id} className="border-2 hover:border-purple-200 transition-all">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl flex-shrink-0">{tipo.emoji}</span>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">{tipo.label}</h3>
                      <p className="text-sm text-gray-600">{tipo.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-2 border-indigo-100 bg-indigo-50">
            <CardContent className="pt-4">
              <h3 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                <Target className="h-5 w-5" /> Por que registrar microgestos?
              </h3>
              <div className="space-y-2 text-sm text-indigo-700">
                <p>• <strong>Tornar visível</strong> a intencionalidade pedagógica que muitas vezes é invisível</p>
                <p>• <strong>Documentar</strong> a qualidade das interações e do cuidado oferecido</p>
                <p>• <strong>Refletir</strong> sobre a própria prática e identificar pontos de melhoria</p>
                <p>• <strong>Evidenciar</strong> o trabalho pedagógico para a coordenação e famílias</p>
                <p>• <strong>Alimentar</strong> o planejamento com base no que foi observado</p>
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => setAba('novo')} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Começar a Registrar Microgestos
          </Button>
        </div>
      )}
    </PageShell>
  );
}
