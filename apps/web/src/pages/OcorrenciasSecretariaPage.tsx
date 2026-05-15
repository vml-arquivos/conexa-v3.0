/**
 * OcorrenciasSecretariaPage — Ocorrências da Secretaria
 *
 * Reutiliza o OcorrenciasPanel existente e adiciona a capacidade de
 * registrar novas ocorrências administrativas via POST /diary-events.
 *
 * RBAC: UNIDADE_ADMINISTRATIVO, UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
 */

import { useState, useCallback } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Button } from '../components/ui/button';
import { OcorrenciasPanel } from '../components/dashboard/OcorrenciasPanel';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import { toast } from 'sonner';
import {
  Plus, XCircle, Loader2, FileWarning, AlertTriangle,
  Search, Calendar,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Turma {
  id: string;
  name: string;
}

interface Crianca {
  id: string;
  firstName: string;
  lastName: string;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function OcorrenciasSecretariaPage() {
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [turmasCarregadas, setTurmasCarregadas] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [form, setForm] = useState({
    title: '',
    description: '',
    classroomId: '',
    childId: '',
    eventDate: new Date().toISOString().split('T')[0],
    categoria: 'comportamento',
  });

  const carregarTurmas = useCallback(async () => {
    if (turmasCarregadas) return;
    try {
      const [turmasRes, criancasRes] = await Promise.allSettled([
        http.get('/lookup/classrooms/accessible'),
        http.get('/children', { params: { limit: 200 } }),
      ]);
      if (turmasRes.status === 'fulfilled') {
        setTurmas(Array.isArray(turmasRes.value.data) ? turmasRes.value.data : []);
      }
      if (criancasRes.status === 'fulfilled') {
        const data = criancasRes.value.data;
        setCriancas(Array.isArray(data) ? data : data?.data ?? []);
      }
      setTurmasCarregadas(true);
    } catch {
      setTurmasCarregadas(true);
    }
  }, [turmasCarregadas]);

  const abrirModal = () => {
    carregarTurmas();
    setModalAberto(true);
  };

  const salvar = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.classroomId) {
      toast.error('Título, descrição e turma são obrigatórios.');
      return;
    }
    setSalvando(true);
    try {
      await http.post('/diary-events', {
        title: form.title,
        description: form.description,
        classroomId: form.classroomId,
        childId: form.childId || undefined,
        eventDate: form.eventDate,
        type: 'COMPORTAMENTO',
        status: 'PUBLICADO',
        tags: ['ocorrencia', form.categoria],
      });
      toast.success('Ocorrência registrada com sucesso.');
      setModalAberto(false);
      setForm({
        title: '', description: '', classroomId: '', childId: '',
        eventDate: new Date().toISOString().split('T')[0], categoria: 'comportamento',
      });
      setRefreshKey(k => k + 1);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  };

  const criancasFiltradas = form.classroomId
    ? criancas // Em produção, filtrar por turma via enrollment
    : criancas;

  return (
    <PageShell
      title="Ocorrências"
      description="Registre e acompanhe ocorrências administrativas e pedagógicas"
      headerActions={
        <Button
          onClick={abrirModal}
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs px-3 py-1.5 h-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          Nova Ocorrência
        </Button>
      }
    >
      {/* ── Painel de ocorrências existente ── */}
      <div key={refreshKey}>
        <OcorrenciasPanel titulo="Ocorrências Registradas" />
      </div>

      {/* ── Modal de Nova Ocorrência ── */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Nova Ocorrência</h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Título *</label>
                <input
                  className={inputCls}
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Título da ocorrência"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Categoria</label>
                <select
                  className={inputCls}
                  value={form.categoria}
                  onChange={(e) => setForm(f => ({ ...f, categoria: e.target.value }))}
                >
                  <option value="comportamento">Comportamento</option>
                  <option value="saude_lesao">Saúde / Lesão</option>
                  <option value="chegada_saida">Chegada / Saída</option>
                  <option value="material_pertences">Material / Pertences</option>
                  <option value="comunicacao_responsaveis">Comunicação c/ Responsáveis</option>
                  <option value="familia">Família</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Turma *</label>
                <select
                  className={inputCls}
                  value={form.classroomId}
                  onChange={(e) => setForm(f => ({ ...f, classroomId: e.target.value, childId: '' }))}
                >
                  <option value="">Selecione a turma</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Criança (opcional)</label>
                <select
                  className={inputCls}
                  value={form.childId}
                  onChange={(e) => setForm(f => ({ ...f, childId: e.target.value }))}
                >
                  <option value="">Toda a turma / Não especificado</option>
                  {criancasFiltradas.map(c => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Data da Ocorrência</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.eventDate}
                  onChange={(e) => setForm(f => ({ ...f, eventDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Descrição *</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descreva a ocorrência com detalhes..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setModalAberto(false)} className="text-xs px-3 py-1.5 h-auto">
                Cancelar
              </Button>
              <Button
                onClick={salvar}
                disabled={salvando || !form.title || !form.description || !form.classroomId}
                className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs px-3 py-1.5 h-auto"
              >
                {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileWarning className="h-3.5 w-3.5" />}
                Registrar Ocorrência
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors';
