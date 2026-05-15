/**
 * ComunicacaoPage — Central de Comunicação da Secretaria
 *
 * Permite criar e visualizar recados institucionais para professores e turmas.
 * Usa os endpoints existentes de /recados (POST, GET, PATCH /:id/lido).
 *
 * RBAC: UNIDADE_ADMINISTRATIVO, UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
 */

import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Button } from '../components/ui/button';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import { toast } from 'sonner';
import {
  Bell, Plus, RefreshCw, XCircle, Loader2, MessageSquare,
  AlertTriangle, CheckCircle, Clock, Users, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Recado {
  id: string;
  titulo: string;
  mensagem: string;
  importante: boolean;
  destinatario: string;
  criadoEm: string;
  expiresAt?: string | null;
  leituras?: { userId: string }[];
}

interface Turma {
  id: string;
  name: string;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function ComunicacaoPage() {
  const [recados, setRecados] = useState<Recado[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  const [form, setForm] = useState({
    titulo: '',
    mensagem: '',
    importante: false,
    destinatario: 'TODAS_PROFESSORAS',
    classroomId: '',
    expiresAt: '',
  });

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [recadosRes, turmasRes] = await Promise.allSettled([
        http.get('/recados'),
        http.get('/lookup/classrooms/accessible'),
      ]);
      if (recadosRes.status === 'fulfilled') {
        const data = recadosRes.value.data;
        setRecados(Array.isArray(data) ? data : data?.recados ?? []);
      }
      if (turmasRes.status === 'fulfilled') {
        setTurmas(Array.isArray(turmasRes.value.data) ? turmasRes.value.data : []);
      }
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    if (!form.titulo.trim() || !form.mensagem.trim()) {
      toast.error('Título e mensagem são obrigatórios.');
      return;
    }
    setSalvando(true);
    try {
      await http.post('/recados', {
        titulo: form.titulo,
        mensagem: form.mensagem,
        importante: form.importante,
        destinatario: form.destinatario,
        classroomId: form.classroomId || undefined,
        expiresAt: form.expiresAt || undefined,
      });
      toast.success('Comunicado enviado com sucesso.');
      setModalAberto(false);
      setForm({ titulo: '', mensagem: '', importante: false, destinatario: 'TODAS_PROFESSORAS', classroomId: '', expiresAt: '' });
      carregar();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  };

  const importantesCount = recados.filter(r => r.importante).length;
  const ativos = recados.filter(r => !r.expiresAt || new Date(r.expiresAt) > new Date());

  return (
    <PageShell
      title="Comunicação"
      description="Recados, avisos e comunicados institucionais"
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={carregar}
            disabled={carregando}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <Button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs px-3 py-1.5 h-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo Comunicado
          </Button>
        </div>
      }
    >
      {/* ── KPIs ── */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
          <MessageSquare className="h-4 w-4 text-violet-500 mb-1" />
          <p className="text-2xl font-semibold text-violet-600 tabular-nums">{recados.length}</p>
          <p className="text-[11px] text-slate-400 font-normal">Total de recados</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
          <CheckCircle className="h-4 w-4 text-emerald-500 mb-1" />
          <p className="text-2xl font-semibold text-emerald-600 tabular-nums">{ativos.length}</p>
          <p className="text-[11px] text-slate-400 font-normal">Ativos</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 mb-1" />
          <p className="text-2xl font-semibold text-amber-600 tabular-nums">{importantesCount}</p>
          <p className="text-[11px] text-slate-400 font-normal">Importantes</p>
        </div>
      </div>

      {/* ── Erro ── */}
      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {erro}
        </div>
      )}

      {/* ── Lista de recados ── */}
      {carregando ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Carregando comunicados...</span>
        </div>
      ) : recados.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum comunicado enviado ainda</p>
          <button
            onClick={() => setModalAberto(true)}
            className="text-xs text-brand-600 mt-1 hover:underline"
          >
            Criar o primeiro comunicado
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {recados.map((r) => {
            const isExp = expandido === r.id;
            const expirado = r.expiresAt && new Date(r.expiresAt) < new Date();
            return (
              <div
                key={r.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  r.importante ? 'border-amber-200' : 'border-slate-100'
                } ${expirado ? 'opacity-60' : ''}`}
              >
                <button
                  onClick={() => setExpandido(isExp ? null : r.id)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left touch-manipulation hover:bg-slate-50 transition-colors"
                >
                  <div className={`mt-0.5 flex-shrink-0 ${r.importante ? 'text-amber-500' : 'text-slate-400'}`}>
                    {r.importante ? <AlertTriangle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-700">{r.titulo}</p>
                      {r.importante && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                          Importante
                        </span>
                      )}
                      {expirado && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-200">
                          Expirado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {destinatarioLabel(r.destinatario)}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(r.criadoEm).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  {isExp ? <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />}
                </button>
                {isExp && (
                  <div className="px-4 pb-4 border-t border-slate-50 bg-slate-50">
                    <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap leading-relaxed">
                      {r.mensagem}
                    </p>
                    {r.expiresAt && (
                      <p className="text-[11px] text-slate-400 mt-2">
                        Expira em: {new Date(r.expiresAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    {r.leituras && r.leituras.length > 0 && (
                      <p className="text-[11px] text-emerald-600 mt-1">
                        {r.leituras.length} leitura{r.leituras.length !== 1 ? 's' : ''} confirmada{r.leituras.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal de Novo Comunicado ── */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Novo Comunicado</h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Título *</label>
                <input
                  className={inputCls}
                  value={form.titulo}
                  onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Título do comunicado"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Mensagem *</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={4}
                  value={form.mensagem}
                  onChange={(e) => setForm(f => ({ ...f, mensagem: e.target.value }))}
                  placeholder="Escreva a mensagem do comunicado..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Destinatário</label>
                <select
                  className={inputCls}
                  value={form.destinatario}
                  onChange={(e) => setForm(f => ({ ...f, destinatario: e.target.value }))}
                >
                  <option value="TODAS_PROFESSORAS">Todos os professores</option>
                  <option value="COORDENACAO">Coordenação</option>
                  <option value="TURMA_ESPECIFICA">Turma específica</option>
                </select>
              </div>
              {form.destinatario === 'TURMA_ESPECIFICA' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Turma</label>
                  <select
                    className={inputCls}
                    value={form.classroomId}
                    onChange={(e) => setForm(f => ({ ...f, classroomId: e.target.value }))}
                  >
                    <option value="">Selecione a turma</option>
                    {turmas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Data de expiração (opcional)</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.expiresAt}
                  onChange={(e) => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="importante"
                  checked={form.importante}
                  onChange={(e) => setForm(f => ({ ...f, importante: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="importante" className="text-sm text-slate-700 cursor-pointer">
                  Marcar como importante
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setModalAberto(false)} className="text-xs px-3 py-1.5 h-auto">
                Cancelar
              </Button>
              <Button
                onClick={salvar}
                disabled={salvando || !form.titulo || !form.mensagem}
                className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs px-3 py-1.5 h-auto"
              >
                {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                Enviar Comunicado
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors';

function destinatarioLabel(d: string): string {
  const map: Record<string, string> = {
    TODAS_PROFESSORAS: 'Todos os professores',
    COORDENACAO: 'Coordenação',
    TURMA_ESPECIFICA: 'Turma específica',
  };
  return map[d] ?? d;
}
