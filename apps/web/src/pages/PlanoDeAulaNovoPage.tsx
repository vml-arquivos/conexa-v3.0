/**
 * PlanoDeAulaNovoPage — Formulário de criação/edição de planejamento
 *
 * Regra de negócio central:
 * O planejamento NÃO é livre. A Matriz Pedagógica 2026 já define para cada dia
 * do ano, para cada segmento, quais campos de experiência e objetivos BNCC devem
 * ser trabalhados. O professor NÃO escolhe os campos — eles vêm automáticos da
 * matriz. O professor só desenvolve as ATIVIDADES que vai executar em sala.
 */
import { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import http from '../api/http';
import { submitPlanningForReview, getPlanning } from '../api/plannings';
import { LOOKUP_DIARIO_2026 } from '../data/lookupDiario2026';
import type { ObjetivoDia, SegmentoKey } from '../data/lookupDiario2026';

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
 * Infere o segmento BNCC (EI01/EI02/EI03) a partir da faixa etária da turma.
 * EI01: 0–18 meses | EI02: 19–47 meses | EI03: 48–71 meses
 */
function inferSegmento(ageGroupMin?: number | null, ageGroupMax?: number | null): SegmentoKey {
  const mid =
    ageGroupMin != null && ageGroupMax != null
      ? (ageGroupMin + ageGroupMax) / 2
      : ageGroupMin ?? ageGroupMax ?? 48;
  if (mid <= 18) return 'EI01';
  if (mid <= 47) return 'EI02';
  return 'EI03';
}

/**
 * Busca os objetivos da Matriz Pedagógica 2026 para uma data e segmento.
 */
function getObjetivosDoDia(date: Date, segmento: SegmentoKey): ObjetivoDia[] {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const ddmm = `${dd}/${mm}`;
  const entrada = LOOKUP_DIARIO_2026[ddmm];
  if (!entrada) return [];
  return entrada[segmento] ?? [];
}

/**
 * Infere o tipo de planejamento pelo período selecionado.
 */
function inferTipo(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return 'SEMANAL';
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dias = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (dias <= 1) return 'DIARIO';
  if (dias <= 7) return 'SEMANAL';
  if (dias <= 31) return 'MENSAL';
  return 'TRIMESTRAL';
}

// ─── Componente de Objetivo BNCC (somente leitura) ───────────────────────────

function ObjetivoCard({ objetivo }: { objetivo: ObjetivoDia }) {
  const corMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    pink: 'bg-pink-50 border-pink-200 text-pink-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };
  const cor = corMap[objetivo.campo_cor] ?? 'bg-gray-50 border-gray-200 text-gray-800';

  return (
    <div className={`p-3 rounded-xl border ${cor} space-y-1`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-lg">{objetivo.campo_emoji}</span>
        <span className="text-xs font-semibold uppercase tracking-wide">{objetivo.campo_label}</span>
        <Badge variant="secondary" className="ml-auto text-xs font-mono">{objetivo.codigo_bncc}</Badge>
      </div>
      {objetivo.semana_tema && (
        <p className="text-xs text-gray-500 italic">Tema da semana: {objetivo.semana_tema}</p>
      )}
      <p className="text-sm">{objetivo.objetivo_bncc}</p>
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
          // Tenta recuperar dados do professor do campo description (novo formato)
          let activities = '';
          let resources = '';
          let notes = '';
          try {
            const desc = JSON.parse((planning as any).description ?? '{}');
            activities = desc.activities ?? '';
            resources = desc.resources ?? '';
            notes = desc.notes ?? '';
          } catch {
            // Compatibilidade com formato antigo (pedagogicalContent)
            const pc = (planning as any).pedagogicalContent ?? {};
            activities = pc.metodologia ?? '';
            resources = pc.recursos ?? '';
            notes = pc.avaliacao ?? '';
          }

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

  // ─── Turma selecionada e segmento inferido ─────────────────────────────────
  const turmaSelecionada = useMemo(
    () => turmas.find(t => t.id === form.classroomId) ?? null,
    [turmas, form.classroomId],
  );

  const segmento = useMemo(
    () =>
      turmaSelecionada
        ? inferSegmento(turmaSelecionada.ageGroupMin, turmaSelecionada.ageGroupMax)
        : null,
    [turmaSelecionada],
  );

  // ─── Objetivos automáticos da Matriz 2026 ─────────────────────────────────
  const objetivosDoDia = useMemo(() => {
    if (!form.startDate || !segmento) return [];
    // Adiciona T12:00:00 para evitar problema de fuso horário
    const date = new Date(form.startDate + 'T12:00:00');
    return getObjetivosDoDia(date, segmento);
  }, [form.startDate, segmento]);

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
    return {
      title: form.title,
      type: inferTipo(form.startDate, form.endDate),
      classroomId: form.classroomId,
      startDate: form.startDate,
      endDate: form.endDate,
      // Objetivos da Matriz (vindos automaticamente, somente leitura)
      objectives: JSON.stringify(objetivosDoDia),
      // Dados de autoria do professor armazenados em description
      description: JSON.stringify({
        activities: form.activities,
        resources: form.resources,
        notes: form.notes,
      }),
    };
  }

  // ─── Salvar Rascunho ──────────────────────────────────────────────────────
  async function salvarRascunho() {
    if (!form.title.trim()) { toast.error('Informe o título do planejamento'); return; }
    if (!form.classroomId) { toast.error('Selecione uma turma'); return; }
    if (!form.startDate) { toast.error('Informe a data de início'); return; }
    if (!form.endDate) { toast.error('Informe a data de término'); return; }
    if (!form.activities.trim()) { toast.error('Descreva as atividades a desenvolver'); return; }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (planningId) {
        await http.put(`/plannings/${planningId}`, payload);
        toast.success('Planejamento atualizado!');
      } else {
        const res = await http.post('/plannings', { ...payload, status: 'RASCUNHO' });
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

  // ─── Enviar para Revisão ──────────────────────────────────────────────────
  async function enviarParaRevisao() {
    if (!form.title.trim() || !form.classroomId || !form.startDate || !form.endDate) {
      toast.error('Preencha todos os campos obrigatórios antes de enviar');
      return;
    }
    if (!form.activities.trim()) {
      toast.error('Descreva as atividades a desenvolver antes de enviar');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Salva o conteúdo primeiro
      const payload = buildPayload();
      let currentId = planningId;
      if (currentId) {
        await http.put(`/plannings/${currentId}`, payload);
      } else {
        const res = await http.post('/plannings', { ...payload, status: 'RASCUNHO' });
        currentId = res.data?.id;
        if (currentId) setPlanningId(currentId);
      }

      // 2. Envia para revisão via PATCH /plannings/:id/submit
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

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageShell title="Planejamento" subtitle="Carregando...">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </PageShell>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
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
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border ${
              status === 'EM_REVISAO'
                ? 'bg-yellow-50 border-yellow-300'
                : 'bg-green-50 border-green-300'
            }`}
          >
            {status === 'EM_REVISAO' ? (
              <>
                <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-800">
                    Aguardando revisão da coordenadora
                  </p>
                  <p className="text-sm text-yellow-600">
                    Este planejamento está em análise. Edição bloqueada até o retorno.
                  </p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Planejamento aprovado!</p>
                  <p className="text-sm text-green-600">
                    Este planejamento foi aprovado pela coordenação.
                  </p>
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
              <Label>
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Ex: Planejamento Turma Borboletas — 10/03/2026"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                disabled={bloqueado}
              />
            </div>
            <div>
              <Label>
                Turma <span className="text-red-500">*</span>
              </Label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100"
                value={form.classroomId}
                onChange={e =>
                  setForm(f => ({ ...f, classroomId: e.target.value, title: '' }))
                }
                disabled={bloqueado}
              >
                <option value="">Selecione a turma</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {turmaSelecionada && segmento && (
                <p className="text-xs text-indigo-600 mt-1">
                  Segmento detectado: <strong>{segmento}</strong>
                  {turmaSelecionada.ageGroupMin != null &&
                  turmaSelecionada.ageGroupMax != null
                    ? ` (${turmaSelecionada.ageGroupMin}–${turmaSelecionada.ageGroupMax} meses)`
                    : ''}
                </p>
              )}
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
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>
                Data de Início <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
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
          </CardContent>
        </Card>

        {/* ─── Objetivos da Matriz 2026 (somente leitura) ─── */}
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
            ) : objetivosDoDia.length === 0 ? (
              <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Nenhum objetivo encontrado na Matriz 2026 para esta data e segmento ({segmento}).
                Verifique se a data está dentro do calendário letivo 2026.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 mb-2">
                  Os campos de experiência e objetivos BNCC abaixo são definidos automaticamente
                  pela Matriz Pedagógica 2026 para o segmento <strong>{segmento}</strong> nesta
                  data. Eles não podem ser alterados.
                </p>
                {objetivosDoDia.map((obj, i) => (
                  <ObjetivoCard key={`${obj.codigo_bncc}-${i}`} objetivo={obj} />
                ))}
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
                Atividades a desenvolver <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Descreva as atividades que você vai executar em sala com as crianças..."
                rows={5}
                value={form.activities}
                onChange={e => setForm(f => ({ ...f, activities: e.target.value }))}
                disabled={bloqueado}
              />
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
