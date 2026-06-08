/**
 * TransporteRetiradaPage — Gestão de Transporte Escolar e Autorizados para Retirada
 *
 * Módulo exclusivo da Secretaria. Permite consultar e atualizar:
 * - dados de transporte escolar de cada criança
 * - lista de pessoas autorizadas para retirada
 * - observações e contatos de emergência
 *
 * Os campos são armazenados no modelo Child como JSONB:
 * - transporte_escolar
 * - autorizados_retirada
 * (migration 20260603040000_child_secretaria_administrative_fields)
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Bus,
  ChevronRight,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  User,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { useAuth } from '../app/AuthProvider';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import { PageShell } from '../components/ui/PageShell';

interface AutorizadoRetirada {
  nome: string;
  parentesco: string;
  telefone?: string;
  cpf?: string;
  observacao?: string;
}

interface TransporteEscolar {
  utiliza: boolean;
  empresa?: string;
  linha?: string;
  horarioIda?: string;
  horarioVolta?: string;
  observacao?: string;
}

interface AlunoTransporte {
  id: string;
  firstName: string;
  lastName: string;
  turma?: string;
  transporte_escolar?: TransporteEscolar | null;
  autorizados_retirada?: AutorizadoRetirada[] | null;
  enrollments?: Array<{ classroom?: { name?: string } }>;
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function TransporteRetiradaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alunos, setAlunos] = useState<AlunoTransporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<AlunoTransporte | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // ── Formulário de edição ──────────────────────────────────────────────────
  const [formTransporte, setFormTransporte] = useState<TransporteEscolar>({ utiliza: false });
  const [formAutorizados, setFormAutorizados] = useState<AutorizadoRetirada[]>([]);

  const carregarAlunos = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const unitId = (user as any)?.unitId;
      const params = unitId ? `?unitId=${unitId}` : '';
      const res = await http.get(`/children${params}`);
      const lista: AlunoTransporte[] = (res.data?.children ?? res.data ?? []).map((c: any) => ({
        id: c.id,
        firstName: c.firstName ?? '',
        lastName: c.lastName ?? '',
        turma: c.enrollments?.[0]?.classroom?.name ?? '—',
        transporte_escolar: c.transporte_escolar ?? null,
        autorizados_retirada: c.autorizados_retirada ?? null,
        enrollments: c.enrollments ?? [],
      }));
      setAlunos(lista);
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { carregarAlunos(); }, [carregarAlunos]);

  function abrirEdicao(aluno: AlunoTransporte) {
    setSelecionado(aluno);
    setFormTransporte(aluno.transporte_escolar ?? { utiliza: false });
    setFormAutorizados(aluno.autorizados_retirada ?? []);
    setMensagem(null);
  }

  function fecharEdicao() {
    setSelecionado(null);
    setFormTransporte({ utiliza: false });
    setFormAutorizados([]);
    setMensagem(null);
  }

  function adicionarAutorizado() {
    setFormAutorizados(prev => [...prev, { nome: '', parentesco: '', telefone: '' }]);
  }

  function removerAutorizado(idx: number) {
    setFormAutorizados(prev => prev.filter((_, i) => i !== idx));
  }

  function atualizarAutorizado(idx: number, campo: keyof AutorizadoRetirada, valor: string) {
    setFormAutorizados(prev => prev.map((a, i) => i === idx ? { ...a, [campo]: valor } : a));
  }

  async function salvar() {
    if (!selecionado) return;
    setSalvando(true);
    setMensagem(null);
    try {
      await http.patch(`/children/${selecionado.id}/secretaria`, {
        transporte_escolar: formTransporte,
        autorizados_retirada: formAutorizados,
      });
      setMensagem({ tipo: 'ok', texto: 'Dados salvos com sucesso.' });
      // Atualizar lista local
      setAlunos(prev => prev.map(a =>
        a.id === selecionado.id
          ? { ...a, transporte_escolar: formTransporte, autorizados_retirada: formAutorizados }
          : a,
      ));
      setSelecionado(prev => prev ? { ...prev, transporte_escolar: formTransporte, autorizados_retirada: formAutorizados } : null);
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: getErrorMessage(e) });
    } finally {
      setSalvando(false);
    }
  }

  const alunosFiltrados = alunos.filter(a => {
    const nome = `${a.firstName} ${a.lastName}`.toLowerCase();
    return nome.includes(busca.toLowerCase());
  });

  // ── Render ────────────────────────────────────────────────────────────────

  if (selecionado) {
    return (
      <PageShell titulo="Transporte e Retirada" subtitulo={`${selecionado.firstName} ${selecionado.lastName}`}>
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={fecharEdicao}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" /> Voltar à lista
          </button>
          <span className="text-slate-300 text-sm">·</span>
          <span className="text-sm text-slate-500">{selecionado.turma}</span>
        </div>

        {mensagem && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-start gap-2 ${mensagem.tipo === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
            {mensagem.tipo === 'erro' && <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
            {mensagem.texto}
          </div>
        )}

        {/* Transporte escolar */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Bus className="h-5 w-5 text-violet-600" />
            <h2 className="text-base font-semibold text-slate-800">Transporte Escolar</h2>
          </div>

          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={formTransporte.utiliza}
              onChange={e => setFormTransporte(prev => ({ ...prev, utiliza: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-violet-600"
            />
            <span className="text-sm text-slate-700">Utiliza transporte escolar</span>
          </label>

          {formTransporte.utiliza && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Empresa</label>
                <input
                  type="text"
                  value={formTransporte.empresa ?? ''}
                  onChange={e => setFormTransporte(prev => ({ ...prev, empresa: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Nome da empresa"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Linha / Rota</label>
                <input
                  type="text"
                  value={formTransporte.linha ?? ''}
                  onChange={e => setFormTransporte(prev => ({ ...prev, linha: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Ex: Linha 3 — Brazlândia"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Horário de ida</label>
                <input
                  type="time"
                  value={formTransporte.horarioIda ?? ''}
                  onChange={e => setFormTransporte(prev => ({ ...prev, horarioIda: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Horário de volta</label>
                <input
                  type="time"
                  value={formTransporte.horarioVolta ?? ''}
                  onChange={e => setFormTransporte(prev => ({ ...prev, horarioVolta: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Observações</label>
                <textarea
                  value={formTransporte.observacao ?? ''}
                  onChange={e => setFormTransporte(prev => ({ ...prev, observacao: e.target.value }))}
                  rows={2}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  placeholder="Ponto de embarque, responsável no transporte, etc."
                />
              </div>
            </div>
          )}
        </div>

        {/* Autorizados para retirada */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-semibold text-slate-800">Autorizados para Retirada</h2>
            </div>
            <button
              onClick={adicionarAutorizado}
              className="text-sm text-emerald-700 hover:text-emerald-900 font-medium transition-colors"
            >
              + Adicionar
            </button>
          </div>

          {formAutorizados.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Nenhum autorizado cadastrado.</p>
          )}

          <div className="space-y-4">
            {formAutorizados.map((a, idx) => (
              <div key={idx} className="border border-slate-100 rounded-lg p-3 relative">
                <button
                  onClick={() => removerAutorizado(idx)}
                  className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Nome completo *</label>
                    <input
                      type="text"
                      value={a.nome}
                      onChange={e => atualizarAutorizado(idx, 'nome', e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Nome do autorizado"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Parentesco *</label>
                    <input
                      type="text"
                      value={a.parentesco}
                      onChange={e => atualizarAutorizado(idx, 'parentesco', e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: Avó, Tio, Vizinho"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Telefone</label>
                    <input
                      type="tel"
                      value={a.telefone ?? ''}
                      onChange={e => atualizarAutorizado(idx, 'telefone', e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="(61) 9 0000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">CPF</label>
                    <input
                      type="text"
                      value={a.cpf ?? ''}
                      onChange={e => atualizarAutorizado(idx, 'cpf', e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">Observação</label>
                    <input
                      type="text"
                      value={a.observacao ?? ''}
                      onChange={e => atualizarAutorizado(idx, 'observacao', e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: Só nas quartas-feiras"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
          <button
            onClick={fecharEdicao}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors px-4 py-2.5"
          >
            Cancelar
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell titulo="Transporte e Retirada" subtitulo="Gerencie o transporte escolar e os autorizados para retirada de cada criança">
      {/* Barra de busca */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar aluno..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <button
          onClick={carregarAlunos}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-2 transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando alunos...</span>
        </div>
      )}

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2 mb-4">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {erro}
        </div>
      )}

      {!loading && !erro && (
        <div className="space-y-2">
          {alunosFiltrados.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">Nenhum aluno encontrado.</p>
          ) : (
            alunosFiltrados.map(aluno => {
              const temTransporte = aluno.transporte_escolar?.utiliza === true;
              const qtdAutorizados = aluno.autorizados_retirada?.length ?? 0;
              return (
                <button
                  key={aluno.id}
                  onClick={() => abrirEdicao(aluno)}
                  className="w-full flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-violet-300 hover:bg-violet-50 transition-all text-left"
                >
                  <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{aluno.firstName} {aluno.lastName}</p>
                    <p className="text-xs text-slate-400">{aluno.turma}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${temTransporte ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                      <Bus className="h-3 w-3" />
                      {temTransporte ? 'Transporte' : 'Sem transporte'}
                    </span>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${qtdAutorizados > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {qtdAutorizados > 0 ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                      {qtdAutorizados} autorizado{qtdAutorizados !== 1 ? 's' : ''}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </PageShell>
  );
}
