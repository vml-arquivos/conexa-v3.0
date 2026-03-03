/**
 * PlanoDeAulaNovoPage — Formulário de criação/edição de planejamento
 *
 * Regra de negócio central:
 * O planejamento NÃO é livre. A Matriz Pedagógica 2026 já define para cada dia
 * do ano, para cada segmento, quais campos de experiência e objetivos BNCC devem
 * ser trabalhados. O professor NÃO escolhe os campos — eles vêm automáticos da
 * matriz via API. O professor só desenvolve as ATIVIDADES que vai executar em sala.
 *
 * Endpoint: GET /curriculum-matrix-entries/by-classroom-day?classroomId=&date=YYYY-MM-DD
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
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
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '../api/http';
import { submitPlanningForReview, getPlanning } from '../api/plannings';
import { safeJsonParse, safeJsonStringify } from '../lib/safeJson';
import { toPedagogicalISODate } from '../lib/formatDate';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Turma {
  id: string;
  name: string;
  ageGroupMin?: number | null;
  ageGroupMax?: number | null;
}

interface FormState {
  title: string;
  classroomId: string;
  startDate: string;
  endDate: string;
  activities: string;
  resources: string;
  notes: string;
}

/** Contrato de retorno do endpoint by-classroom-day */
interface MatrizObjective {
  campoExperiencia: string;
  codigoBNCC: string | null;
  objetivoBNCC: string;
  objetivoCurriculoDF: string;
  intencionalidadePedagogica: string | null;
}

interface MatrizByDayResponse {
  segment: string | null;
  date: string;
  classroomId: string;
  objectives: MatrizObjective[];
  message?: string;
}

const FORM_INICIAL: FormState = {
  title: '',
  classroomId: '',
  startDate: '',
  endDate: '',
  activities: '',
  resources: '',
  notes: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Infere o tipo de planejamento pelo período selecionado.
 */
function inferTipo(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return 'SEMANAL';
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  const dias = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (dias <= 1) return 'DIARIO';
  if (dias <= 7) return 'SEMANAL';
  if (dias <= 31) return 'MENSAL';
  return 'TRIMESTRAL';
}

// ─── Componente de Objetivo da Matriz (somente leitura) ──────────────────────

/**
 * ObjetivoCard — exibe os 4 campos obrigatórios da Matriz Curricular 2026 como somente leitura.
 * 1. Campo de Experiência (+ código BNCC)
 * 2. Objetivo da BNCC (Transcrição Literal)
 * 3. Objetivo do Currículo em Movimento — DF (Transcrição Literal)
 * 4. Intencionalidade Pedagógica
 * O campo "Exemplo de Atividade" NÃO é exibido — o professor cria o seu próprio.
 */
function ObjetivoCard({ objetivo, index }: { objetivo: MatrizObjective; index: number }) {
  const colors = [
    'bg-blue-50 border-blue-200',
    'bg-green-50 border-green-200',
    'bg-orange-50 border-orange-200',
    'bg-pink-50 border-pink-200',
    'bg-purple-50 border-purple-200',
    'bg-yellow-50 border-yellow-200',
  ];
  const bg = colors[index % colors.length];

  return (
    <div className={`rounded-xl border ${bg} overflow-hidden`}>
      {/* Cabeçalho: Campo de Experiência */}
      <div className={`px-4 py-2 flex items-center gap-2 flex-wrap border-b ${bg}`}>
        <span className="text-xs font-bold uppercase tracking-wide text-gray-700">
          Campo de Experiência: {objetivo.campoExperiencia.replace(/_/g, ' ')}
        </span>
        {objetivo.codigoBNCC && (
          <Badge variant="secondary" className="ml-auto text-xs font-mono">
            {objetivo.codigoBNCC}
          </Badge>
        )}
      </div>
      <div className="px-4 py-3 space-y-3 bg-white/80">
        {/* Campo 2: Objetivo BNCC */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Objetivo da BNCC (Transcrição Literal)
          </p>
          <p className="text-sm text-gray-800 leading-relaxed">{objetivo.objetivoBNCC}</p>
        </div>
        {/* Campo 3: Objetivo Currículo em Movimento */}
        {objetivo.objetivoCurriculoDF && objetivo.objetivoCurriculoDF !== objetivo.objetivoBNCC && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Objetivo do Currículo em Movimento — DF (Transcrição Literal)
            </p>
            <p className="text-sm text-gray-800 leading-relaxed">{objetivo.objetivoCurriculoDF}</p>
          </div>
        )}
        {/* Campo 4: Intencionalidade Pedagógica */}
        {objetivo.intencionalidadePedagogica && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
              🎯 Intencionalidade Pedagógica
            </p>
            <p className="text-sm text-indigo-800 leading-relaxed">
              {objetivo.intencionalidadePedagogica}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

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

  // Estado da Matriz (carregado via API)
  const [matrizData, setMatrizData] = useState<MatrizByDayResponse | null>(null);
  const [matrizLoading, setMatrizLoading] = useState(false);

  // ─── Carrega turmas e planejamento existente ───────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Busca turmas acessíveis (inclui ageGroupMin/ageGroupMax)
        const turmaRes = await http.get('/lookup/classrooms/accessible');
        const d = turmaRes.data;
        if (Array.isArray(d)) setTurmas(d);
        else if (d?.classrooms) setTurmas(d.classrooms);
        else if (d?.classroom) setTurmas([d.classroom]);

        if (id) {
          const planning = await getPlanning(id);
          // Parse seguro — compatível com dados antigos e novos
          const desc = safeJsonParse<{ activities?: string; resources?: string; notes?: string }>(
            (planning as any).description,
            {}
          );
          // Compatibilidade com formato antigo (pedagogicalContent)
          const pc = (planning as any).pedagogicalContent ?? {};
          const activities = desc.activities ?? pc.metodologia ?? '';
          const resources = desc.resources ?? pc.recursos ?? '';
          const notes = desc.notes ?? pc.avaliacao ?? '';

          setForm({
            title: planning.title ?? '',
            classroomId: planning.classroomId ?? '',
            startDate: planning.startDate ? planning.startDate.slice(0, 10) : '',
            endDate: planning.endDate ? planning.endDate.slice(0, 10) : '',
            activities,
            resources,
            notes,
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

  // ─── Busca objetivos da Matriz via API quando turma + data mudam ──────────
  const fetchMatriz = useCallback(async (classroomId: string, date: string) => {
    if (!classroomId || !date) {
      setMatrizData(null);
      return;
    }
    setMatrizLoading(true);
    try {
      const res = await http.get('/curriculum-matrix-entries/by-classroom-day', {
        params: { classroomId, date },
      });
      setMatrizData(res.data as MatrizByDayResponse);
    } catch (err: any) {
      // Erro de rede ou 4xx — não bloqueia o formulário
      setMatrizData({
        segment: null,
        date,
        classroomId,
        objectives: [],
        message: err?.response?.data?.message ?? 'Erro ao carregar a Matriz Pedagógica. Tente novamente.',
      });
    } finally {
      setMatrizLoading(false);
    }
  }, []);

  useEffect(() => {
    if (form.classroomId && form.startDate) {
      fetchMatriz(form.classroomId, form.startDate);
    } else {
      setMatrizData(null);
    }
  }, [form.classroomId, form.startDate, fetchMatriz]);

  // ─── Turma selecionada ─────────────────────────────────────────────────────
  const turmaSelecionada = useMemo(
    () => turmas.find(t => t.id === form.classroomId) ?? null,
    [turmas, form.classroomId],
  );

  // ─── Auto-gera título quando turma + data são selecionadas ────────────────
  useEffect(() => {
    if (turmaSelecionada && form.startDate && !form.title) {
      const [ano, mes, dia] = form.startDate.split('-');
      setForm(f => ({
        ...f,
        title: `Planejamento ${turmaSelecionada.name} — ${dia}/${mes}/${ano}`,
      }));
    }
  }, [turmaSelecionada, form.startDate, form.title]);

  // ─── Build do payload para a API ──────────────────────────────────────────
  function buildPayload() {
    // Usa toPedagogicalISODate para garantir YYYY-MM-DD no fuso America/Sao_Paulo
    const startDateISO = form.startDate
      ? toPedagogicalISODate(new Date(form.startDate + 'T12:00:00'))
      : '';
    const endDateISO = form.endDate
      ? toPedagogicalISODate(new Date(form.endDate + 'T12:00:00'))
      : startDateISO;

    // objectives: serializa os objetivos da Matriz para registro histórico
    const objectivesPayload = matrizData?.objectives?.length
      ? safeJsonStringify(matrizData.objectives)
      : null;

    // description: dados do professor (atividades, recursos, notas)
    const descriptionPayload = safeJsonStringify({
      activities: form.activities,
      resources: form.resources,
      notes: form.notes,
    });

    return {
      title: form.title,
      classroomId: form.classroomId,
      startDate: startDateISO,
      endDate: endDateISO,
      type: inferTipo(form.startDate, form.endDate),
      objectives: objectivesPayload,
      description: descriptionPayload,
    };
  }

  // ─── Salvar rascunho ──────────────────────────────────────────────────────
  async function salvarRascunho() {
    if (!form.classroomId || !form.startDate) {
      toast.error('Selecione a turma e a data de início');
      return;
    }
    if (!form.activities.trim()) {
      toast.error('Descreva as atividades a desenvolver');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (planningId) {
        await http.patch(`/plannings/${planningId}`, payload);
        toast.success('Rascunho atualizado');
      } else {
        const res = await http.post('/plannings', payload);
        const newId = res.data?.id ?? res.data?.planning?.id;
        if (newId) {
          setPlanningId(newId);
          navigate(`/planejamentos/${newId}/editar`, { replace: true });
        }
        toast.success('Rascunho salvo');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  // ─── Enviar para revisão ──────────────────────────────────────────────────
  async function enviarParaRevisao() {
    if (!form.classroomId || !form.startDate) {
      toast.error('Selecione a turma e a data de início');
      return;
    }
    if (!form.activities.trim()) {
      toast.error('Descreva as atividades a desenvolver');
      return;
    }
    setSubmitting(true);
    try {
      // Salva primeiro para garantir dados atualizados
      const payload = buildPayload();
      let currentId = planningId;
      if (currentId) {
        await http.patch(`/plannings/${currentId}`, payload);
      } else {
        const res = await http.post('/plannings', payload);
        currentId = res.data?.id ?? res.data?.planning?.id;
        if (currentId) setPlanningId(currentId);
      }
      if (!currentId) throw new Error('ID do planejamento não encontrado');
      await submitPlanningForReview(currentId);
      setStatus('EM_REVISAO');
      toast.success('Planejamento enviado para revisão!');
      navigate('/planejamentos');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao enviar para revisão');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Status badge ─────────────────────────────────────────────────────────
  const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    RASCUNHO: { label: 'Rascunho', icon: <Clock className="h-3 w-3" />, className: 'bg-gray-100 text-gray-700' },
    EM_REVISAO: { label: 'Em Revisão', icon: <Clock className="h-3 w-3" />, className: 'bg-amber-100 text-amber-700' },
    APROVADO: { label: 'Aprovado', icon: <CheckCircle className="h-3 w-3" />, className: 'bg-green-100 text-green-700' },
    DEVOLVIDO: { label: 'Devolvido', icon: <AlertCircle className="h-3 w-3" />, className: 'bg-red-100 text-red-700' },
  };
  const statusInfo = statusConfig[status] ?? statusConfig.RASCUNHO;
  const bloqueado = status === 'EM_REVISAO' || status === 'APROVADO';

  if (loading) {
    return (
      <PageShell title={isEditing ? 'Editar Planejamento' : 'Novo Planejamento'}>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={isEditing ? 'Editar Planejamento' : 'Novo Planejamento'}
      subtitle="Siga a Matriz Pedagógica 2026 e desenvolva suas atividades"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ─── Cabeçalho com status ─── */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/planejamentos')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}
          >
            {statusInfo.icon}
            {statusInfo.label}
          </span>
        </div>

        {/* ─── Identificação ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Identificação do Planejamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Turma */}
            <div>
              <Label>
                Turma <span className="text-red-500">*</span>
              </Label>
              <select
                className="w-full mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                value={form.classroomId}
                onChange={e =>
                  setForm(f => ({ ...f, classroomId: e.target.value, title: '' }))
                }
                disabled={bloqueado}
              >
                <option value="">Selecione a turma...</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Título (auto-gerado) */}
            <div>
              <Label>Título</Label>
              <Input
                placeholder="Gerado automaticamente ao selecionar turma e data"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                disabled={bloqueado}
              />
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  Data de Início <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      startDate: e.target.value,
                      endDate: f.endDate || e.target.value,
                    }))
                  }
                  disabled={bloqueado}
                />
              </div>
              <div>
                <Label>
                  Data de Término <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  disabled={bloqueado}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Objetivos da Matriz 2026 (somente leitura, via API) ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Objetivos da Matriz Pedagógica 2026
              <Badge variant="secondary" className="ml-auto text-xs">
                Automático
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!form.startDate || !form.classroomId ? (
              <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl text-gray-500 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Selecione a turma e a data de início para ver os objetivos automáticos da Matriz
                2026.
              </div>
            ) : matrizLoading ? (
              <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl text-gray-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                Carregando objetivos da Matriz Pedagógica 2026...
              </div>
            ) : matrizData?.objectives && matrizData.objectives.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 mb-2">
                  Os campos de experiência e objetivos BNCC abaixo são definidos automaticamente
                  pela Matriz Pedagógica 2026 para o segmento{' '}
                  <strong>{matrizData.segment}</strong> nesta data. Eles não podem ser alterados.
                </p>
                {matrizData.objectives.map((obj, i) => (
                  <ObjetivoCard key={`${obj.codigoBNCC ?? obj.campoExperiencia}-${i}`} objetivo={obj} index={i} />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {matrizData?.message ??
                  'Nenhum objetivo encontrado na Matriz 2026 para esta data e segmento. Verifique se a data está dentro do calendário letivo 2026.'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Planejamento do Professor ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              Planejamento do Professor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>
                Desenvolvimento da Atividade <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Descreva como você vai desenvolver a atividade em sala, seguindo a intencionalidade pedagógica da Matriz..."
                rows={6}
                value={form.activities}
                onChange={e => setForm(f => ({ ...f, activities: e.target.value }))}
                disabled={bloqueado}
              />
              <p className="text-xs text-gray-400 mt-1">
                Crie seu próprio desenvolvimento. Não há modelo pré-definido — siga a
                intencionalidade pedagógica da Matriz acima.
              </p>
            </div>
            <div>
              <Label>Recursos e materiais</Label>
              <Textarea
                placeholder="Liste os materiais, espaços e recursos necessários para as atividades..."
                rows={3}
                value={form.resources}
                onChange={e => setForm(f => ({ ...f, resources: e.target.value }))}
                disabled={bloqueado}
              />
            </div>
            <div>
              <Label>Observações / Adaptações</Label>
              <Textarea
                placeholder="Adaptações para crianças com necessidades específicas, observações pedagógicas..."
                rows={3}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
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
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" /> Salvar Rascunho
                </>
              )}
            </Button>
            <Button
              onClick={enviarParaRevisao}
              disabled={saving || submitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" /> Enviar para Revisão
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
