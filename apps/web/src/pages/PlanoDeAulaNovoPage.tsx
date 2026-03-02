import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  Save,
  Send,
  Clock,
  CheckCircle,
  BookOpen,
  Calendar,
  Layers,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '../api/http';
import { submitPlanningForReview, getPlanning } from '../api/plannings';

// ─── Campos de Experiência da Matriz 2026 ────────────────────────────────────
const CAMPOS_EXPERIENCIA = [
  {
    id: 'eu-outro-nos',
    label: 'O eu, o outro e o nós',
    emoji: '🤝',
    cor: 'border-purple-300 bg-purple-50 text-purple-800',
    corCheck: 'accent-purple-600',
  },
  {
    id: 'corpo-gestos',
    label: 'Corpo, gestos e movimentos',
    emoji: '🕺',
    cor: 'border-orange-300 bg-orange-50 text-orange-800',
    corCheck: 'accent-orange-600',
  },
  {
    id: 'tracos-sons',
    label: 'Traços, sons, cores e formas',
    emoji: '🎨',
    cor: 'border-pink-300 bg-pink-50 text-pink-800',
    corCheck: 'accent-pink-600',
  },
  {
    id: 'escuta-fala',
    label: 'Escuta, fala, pensamento e imaginação',
    emoji: '📖',
    cor: 'border-blue-300 bg-blue-50 text-blue-800',
    corCheck: 'accent-blue-600',
  },
  {
    id: 'espacos-tempos',
    label: 'Espaços, tempos, quantidades, relações e transformações',
    emoji: '🔬',
    cor: 'border-green-300 bg-green-50 text-green-800',
    corCheck: 'accent-green-600',
  },
];

const TIPOS_PLANEJAMENTO = [
  { value: 'DIARIO', label: 'Diário' },
  { value: 'SEMANAL', label: 'Semanal' },
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'TRIMESTRAL', label: 'Bimestral' },
] as const;

type PlanningType = 'DIARIO' | 'SEMANAL' | 'MENSAL' | 'TRIMESTRAL';

interface Turma {
  id: string;
  name: string;
}

interface FormState {
  title: string;
  type: PlanningType;
  classroomId: string;
  startDate: string;
  endDate: string;
  camposSelecionados: string[];
  metodologia: string;
  recursos: string;
  avaliacao: string;
}

const FORM_INICIAL: FormState = {
  title: '',
  type: 'SEMANAL',
  classroomId: '',
  startDate: '',
  endDate: '',
  camposSelecionados: [],
  metodologia: '',
  recursos: '',
  avaliacao: '',
};

export default function PlanoDeAulaNovoPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [planningId, setPlanningId] = useState<string | null>(id ?? null);
  const [status, setStatus] = useState<string>('RASCUNHO');

  // Carrega turmas e, se editando, carrega o planejamento existente
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const turmaRes = await http.get('/lookup/classrooms/accessible');
        const d = turmaRes.data;
        if (Array.isArray(d)) setTurmas(d);
        else if (d?.classrooms) setTurmas(d.classrooms);
        else if (d?.classroom) setTurmas([d.classroom]);

        if (id) {
          const planning = await getPlanning(id);
          const pc = (planning as any).pedagogicalContent ?? {};
          setForm({
            title: planning.title ?? '',
            type: (planning.type as PlanningType) ?? 'SEMANAL',
            classroomId: planning.classroomId ?? '',
            startDate: planning.startDate ? planning.startDate.slice(0, 10) : '',
            endDate: planning.endDate ? planning.endDate.slice(0, 10) : '',
            camposSelecionados: pc.camposSelecionados ?? [],
            metodologia: pc.metodologia ?? '',
            recursos: pc.recursos ?? '',
            avaliacao: pc.avaliacao ?? '',
          });
          setStatus(planning.status ?? 'RASCUNHO');
          setPlanningId(id);
        }
      } catch {
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function toggleCampo(campoId: string) {
    setForm(f => ({
      ...f,
      camposSelecionados: f.camposSelecionados.includes(campoId)
        ? f.camposSelecionados.filter(c => c !== campoId)
        : [...f.camposSelecionados, campoId],
    }));
  }

  function buildPayload() {
    return {
      title: form.title,
      type: form.type,
      classroomId: form.classroomId,
      startDate: form.startDate,
      endDate: form.endDate,
      pedagogicalContent: {
        camposSelecionados: form.camposSelecionados,
        metodologia: form.metodologia,
        recursos: form.recursos,
        avaliacao: form.avaliacao,
      },
    };
  }

  async function salvarRascunho() {
    if (!form.title.trim()) { toast.error('Informe o título do planejamento'); return; }
    if (!form.classroomId) { toast.error('Selecione uma turma'); return; }
    if (!form.startDate) { toast.error('Informe a data de início'); return; }
    if (!form.endDate) { toast.error('Informe a data de término'); return; }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (planningId) {
        await http.put(`/plannings/${planningId}`, payload);
        toast.success('Planejamento atualizado!');
      } else {
        const res = await http.post('/plannings', payload);
        const newId = res.data?.id;
        if (newId) setPlanningId(newId);
        toast.success('Rascunho salvo com sucesso!');
      }
      setStatus('RASCUNHO');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function enviarParaRevisao() {
    if (!form.title.trim() || !form.classroomId || !form.startDate || !form.endDate) {
      toast.error('Preencha todos os campos obrigatórios antes de enviar');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Salva primeiro (garante que o conteúdo está persistido)
      const payload = buildPayload();
      let currentId = planningId;
      if (currentId) {
        await http.put(`/plannings/${currentId}`, payload);
      } else {
        const res = await http.post('/plannings', payload);
        currentId = res.data?.id;
        if (currentId) setPlanningId(currentId);
      }

      // 2. Envia para revisão
      if (!currentId) throw new Error('ID do planejamento não encontrado');
      await submitPlanningForReview(currentId);
      setStatus('EM_REVISAO');
      toast.success('Planejamento enviado para revisão da coordenadora!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao enviar para revisão');
    } finally {
      setSubmitting(false);
    }
  }

  const bloqueado = status === 'EM_REVISAO' || status === 'APROVADO';

  if (loading) {
    return (
      <PageShell title="Planejamento" subtitle="Carregando...">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={isEditing ? 'Editar Planejamento' : 'Nova Oficina de Planejamento'}
      subtitle="Crie seu planejamento pedagógico com base na Matriz Curricular 2026"
    >
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Botão voltar */}
        <button
          onClick={() => navigate('/app/planejamentos')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Meus Planejamentos
        </button>

        {/* Badge de status quando bloqueado */}
        {bloqueado && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            status === 'EM_REVISAO'
              ? 'bg-yellow-50 border-yellow-300'
              : 'bg-green-50 border-green-300'
          }`}>
            {status === 'EM_REVISAO' ? (
              <>
                <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-800">Aguardando revisão da coordenadora</p>
                  <p className="text-sm text-yellow-600">Este planejamento está em análise. Edição bloqueada até o retorno.</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Planejamento aprovado!</p>
                  <p className="text-sm text-green-600">Este planejamento foi aprovado pela coordenação.</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── Identificação ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              Identificação do Planejamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Título <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Ex: Semana da Natureza — EI02 Turma Borboletas"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                disabled={bloqueado}
              />
            </div>

            <div>
              <Label>Turma <span className="text-red-500">*</span></Label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100"
                value={form.classroomId}
                onChange={e => setForm(f => ({ ...f, classroomId: e.target.value }))}
                disabled={bloqueado}
              >
                <option value="">Selecione a turma</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Tipo — Radio Group */}
            <div>
              <Label>Tipo de Planejamento <span className="text-red-500">*</span></Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {TIPOS_PLANEJAMENTO.map(tipo => (
                  <label
                    key={tipo.value}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium ${
                      form.type === tipo.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                    } ${bloqueado ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="tipo"
                      value={tipo.value}
                      checked={form.type === tipo.value}
                      onChange={() => setForm(f => ({ ...f, type: tipo.value }))}
                      disabled={bloqueado}
                      className="sr-only"
                    />
                    {tipo.label}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Período ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Período
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Data de Início <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                disabled={bloqueado}
              />
            </div>
            <div>
              <Label>Data de Término <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                disabled={bloqueado}
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Campos de Experiência ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-5 w-5 text-indigo-600" />
              Campos de Experiência da Matriz 2026
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Selecione os campos de experiência que serão trabalhados neste planejamento.
            </p>
            <div className="space-y-2">
              {CAMPOS_EXPERIENCIA.map(campo => (
                <label
                  key={campo.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    form.camposSelecionados.includes(campo.id)
                      ? campo.cor + ' border-current'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } ${bloqueado ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={form.camposSelecionados.includes(campo.id)}
                    onChange={() => !bloqueado && toggleCampo(campo.id)}
                    disabled={bloqueado}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-lg">{campo.emoji}</span>
                  <span className="text-sm font-medium">{campo.label}</span>
                  {form.camposSelecionados.includes(campo.id) && (
                    <Badge variant="secondary" className="ml-auto text-xs">Selecionado</Badge>
                  )}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ─── Conteúdo Pedagógico ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              Conteúdo Pedagógico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Metodologia</Label>
              <Textarea
                placeholder="Descreva as estratégias e metodologias pedagógicas que serão utilizadas..."
                rows={4}
                value={form.metodologia}
                onChange={e => setForm(f => ({ ...f, metodologia: e.target.value }))}
                disabled={bloqueado}
              />
            </div>
            <div>
              <Label>Recursos Necessários</Label>
              <Textarea
                placeholder="Liste os materiais, espaços e recursos necessários para as atividades..."
                rows={3}
                value={form.recursos}
                onChange={e => setForm(f => ({ ...f, recursos: e.target.value }))}
                disabled={bloqueado}
              />
            </div>
            <div>
              <Label>Avaliação</Label>
              <Textarea
                placeholder="Descreva como será feita a avaliação do desenvolvimento das crianças..."
                rows={3}
                value={form.avaliacao}
                onChange={e => setForm(f => ({ ...f, avaliacao: e.target.value }))}
                disabled={bloqueado}
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Ações ─── */}
        {!bloqueado && (
          <div className="flex flex-col sm:flex-row gap-3 pb-8">
            <Button
              variant="outline"
              onClick={salvarRascunho}
              disabled={saving || submitting}
              className="flex-1"
            >
              {saving
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                : <><Save className="h-4 w-4 mr-2" /> Salvar Rascunho</>
              }
            </Button>
            <Button
              onClick={enviarParaRevisao}
              disabled={saving || submitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {submitting
                ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                : <><Send className="h-4 w-4 mr-2" /> Enviar para Revisão</>
              }
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
