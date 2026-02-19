/**
 * Página de Atendimentos aos Pais/Responsáveis
 * Acesso: Professor, Unidade, Staff Central, Mantenedora, Developer
 * Funcionalidades: Registrar atendimentos, listar histórico, atualizar status
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Phone,
  Video,
  MessageSquare,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import { getAccessibleClassrooms } from '../api/lookup';
import type { AccessibleClassroom } from '../types/lookup';

// ─── Tipos ───────────────────────────────────────────────────────────────────
type TipoAtendimento = 'PRESENCIAL' | 'REMOTO' | 'TELEFONEMA' | 'MENSAGEM';
type StatusAtendimento = 'AGENDADO' | 'REALIZADO' | 'CANCELADO' | 'PENDENTE_RETORNO';

interface Atendimento {
  id: string;
  childId: string;
  child: { id: string; firstName: string; lastName: string };
  responsavelNome: string;
  responsavelRelacao?: string;
  responsavelContato?: string;
  tipo: TipoAtendimento;
  status: StatusAtendimento;
  dataAtendimento: string;
  assunto: string;
  descricao?: string;
  encaminhamento?: string;
  retornoNecessario: boolean;
  dataRetorno?: string;
  criadoEm: string;
}

interface NovoAtendimento {
  childId: string;
  responsavelNome: string;
  responsavelRelacao: string;
  responsavelContato: string;
  tipo: TipoAtendimento;
  dataAtendimento: string;
  assunto: string;
  descricao: string;
  encaminhamento: string;
  retornoNecessario: boolean;
  dataRetorno: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TIPO_LABELS: Record<TipoAtendimento, string> = {
  PRESENCIAL: 'Presencial',
  REMOTO: 'Remoto (Vídeo)',
  TELEFONEMA: 'Telefonema',
  MENSAGEM: 'Mensagem',
};

const TIPO_ICONES: Record<TipoAtendimento, React.ReactNode> = {
  PRESENCIAL: <UserCheck className="h-4 w-4" />,
  REMOTO: <Video className="h-4 w-4" />,
  TELEFONEMA: <Phone className="h-4 w-4" />,
  MENSAGEM: <MessageSquare className="h-4 w-4" />,
};

const STATUS_LABELS: Record<StatusAtendimento, string> = {
  AGENDADO: 'Agendado',
  REALIZADO: 'Realizado',
  CANCELADO: 'Cancelado',
  PENDENTE_RETORNO: 'Pendente Retorno',
};

const STATUS_CORES: Record<StatusAtendimento, string> = {
  AGENDADO: 'bg-blue-100 text-blue-800',
  REALIZADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
  PENDENTE_RETORNO: 'bg-amber-100 text-amber-800',
};

const STATUS_ICONES: Record<StatusAtendimento, React.ReactNode> = {
  AGENDADO: <Clock className="h-3 w-3" />,
  REALIZADO: <CheckCircle2 className="h-3 w-3" />,
  CANCELADO: <XCircle className="h-3 w-3" />,
  PENDENTE_RETORNO: <AlertCircle className="h-3 w-3" />,
};

const FORM_INICIAL: NovoAtendimento = {
  childId: '',
  responsavelNome: '',
  responsavelRelacao: '',
  responsavelContato: '',
  tipo: 'PRESENCIAL',
  dataAtendimento: new Date().toISOString().slice(0, 16),
  assunto: '',
  descricao: '',
  encaminhamento: '',
  retornoNecessario: false,
  dataRetorno: '',
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export function AtendimentoPaisPage() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [form, setForm] = useState<NovoAtendimento>(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<StatusAtendimento | ''>('');
  const [turmas, setTurmas] = useState<AccessibleClassroom[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState('');
  const [alunos, setAlunos] = useState<{ id: string; name: string }[]>([]);

  // Carregar turmas
  useEffect(() => {
    getAccessibleClassrooms()
      .then(setTurmas)
      .catch(() => setTurmas([]));
  }, []);

  // Carregar alunos ao selecionar turma
  useEffect(() => {
    if (!turmaSelecionada) {
      setAlunos([]);
      return;
    }
    http.get('/lookup/children/accessible', { params: { classroomId: turmaSelecionada } })
      .then(r => setAlunos(r.data || []))
      .catch(() => setAlunos([]));
  }, [turmaSelecionada]);

  const carregarAtendimentos = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const params: Record<string, string> = {};
      if (filtroStatus) params.status = filtroStatus;
      const r = await http.get('/atendimentos-pais', { params });
      setAtendimentos(r.data || []);
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, [filtroStatus]);

  useEffect(() => {
    carregarAtendimentos();
  }, [carregarAtendimentos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.childId || !form.responsavelNome || !form.assunto) {
      setErroForm('Preencha os campos obrigatórios: Criança, Nome do Responsável e Assunto.');
      return;
    }
    setSalvando(true);
    setErroForm(null);
    try {
      await http.post('/atendimentos-pais', {
        ...form,
        dataAtendimento: new Date(form.dataAtendimento).toISOString(),
        dataRetorno: form.dataRetorno ? new Date(form.dataRetorno).toISOString() : undefined,
      });
      setForm(FORM_INICIAL);
      setMostrarFormulario(false);
      await carregarAtendimentos();
    } catch (e) {
      setErroForm(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  };

  const atualizarStatus = async (id: string, status: StatusAtendimento) => {
    try {
      await http.patch(`/atendimentos-pais/${id}/status`, { status });
      await carregarAtendimentos();
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Atendimentos aos Pais
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Registre e acompanhe os atendimentos realizados com pais e responsáveis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={carregarAtendimentos}
            disabled={carregando}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Novo Atendimento
          </button>
        </div>
      </header>

      {/* Formulário de Novo Atendimento */}
      {mostrarFormulario && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Registrar Atendimento</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Seleção de turma e aluno */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Turma
                </label>
                <select
                  value={turmaSelecionada}
                  onChange={e => { setTurmaSelecionada(e.target.value); setForm(f => ({ ...f, childId: '' })); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Selecione a turma...</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Criança <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.childId}
                  onChange={e => setForm(f => ({ ...f, childId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                >
                  <option value="">Selecione a criança...</option>
                  {alunos.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dados do responsável */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Responsável <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.responsavelNome}
                  onChange={e => setForm(f => ({ ...f, responsavelNome: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ex: Maria Silva"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relação
                </label>
                <input
                  type="text"
                  value={form.responsavelRelacao}
                  onChange={e => setForm(f => ({ ...f, responsavelRelacao: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ex: Mãe, Pai, Avó..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contato
                </label>
                <input
                  type="text"
                  value={form.responsavelContato}
                  onChange={e => setForm(f => ({ ...f, responsavelContato: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Telefone ou e-mail"
                />
              </div>
            </div>

            {/* Tipo e Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Atendimento
                </label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoAtendimento }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {Object.entries(TIPO_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data e Hora
                </label>
                <input
                  type="datetime-local"
                  value={form.dataAtendimento}
                  onChange={e => setForm(f => ({ ...f, dataAtendimento: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Assunto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assunto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.assunto}
                onChange={e => setForm(f => ({ ...f, assunto: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Resumo do assunto tratado"
                required
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição / Observações
              </label>
              <textarea
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={3}
                placeholder="Detalhes do atendimento..."
              />
            </div>

            {/* Encaminhamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Encaminhamento
              </label>
              <textarea
                value={form.encaminhamento}
                onChange={e => setForm(f => ({ ...f, encaminhamento: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
                placeholder="Próximos passos ou encaminhamentos necessários..."
              />
            </div>

            {/* Retorno necessário */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="retornoNecessario"
                checked={form.retornoNecessario}
                onChange={e => setForm(f => ({ ...f, retornoNecessario: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="retornoNecessario" className="text-sm font-medium text-gray-700">
                Necessita de retorno
              </label>
              {form.retornoNecessario && (
                <input
                  type="date"
                  value={form.dataRetorno}
                  onChange={e => setForm(f => ({ ...f, dataRetorno: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                />
              )}
            </div>

            {erroForm && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {erroForm}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setMostrarFormulario(false); setForm(FORM_INICIAL); setErroForm(null); }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Registrar Atendimento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Filtrar por status:</label>
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value as StatusAtendimento | '')}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Mensagem de erro */}
      {erro && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {erro}
        </div>
      )}

      {/* Lista de Atendimentos */}
      {carregando ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-500">Carregando atendimentos...</span>
        </div>
      ) : atendimentos.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum atendimento registrado</p>
          <p className="text-sm text-gray-400 mt-1">
            Clique em "Novo Atendimento" para registrar o primeiro.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {atendimentos.map(at => (
            <div key={at.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Cabeçalho do card */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandido(expandido === at.id ? null : at.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    {TIPO_ICONES[at.tipo]}
                    <span className="text-xs">{TIPO_LABELS[at.tipo]}</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {at.child.firstName} {at.child.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {at.responsavelNome}{at.responsavelRelacao ? ` (${at.responsavelRelacao})` : ''} •{' '}
                      {new Date(at.dataAtendimento).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_CORES[at.status]}`}>
                    {STATUS_ICONES[at.status]}
                    {STATUS_LABELS[at.status]}
                  </span>
                  {expandido === at.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </div>

              {/* Detalhes expandidos */}
              {expandido === at.id && (
                <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Assunto</p>
                    <p className="text-sm">{at.assunto}</p>
                  </div>
                  {at.descricao && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Descrição</p>
                      <p className="text-sm text-gray-700">{at.descricao}</p>
                    </div>
                  )}
                  {at.encaminhamento && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Encaminhamento</p>
                      <p className="text-sm text-gray-700">{at.encaminhamento}</p>
                    </div>
                  )}
                  {at.retornoNecessario && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                      <AlertCircle className="h-4 w-4" />
                      Retorno necessário{at.dataRetorno ? ` até ${new Date(at.dataRetorno).toLocaleDateString('pt-BR')}` : ''}
                    </div>
                  )}
                  {/* Ações de status */}
                  {at.status !== 'REALIZADO' && at.status !== 'CANCELADO' && (
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-xs text-gray-500">Atualizar status:</span>
                      {at.status === 'AGENDADO' && (
                        <button
                          onClick={() => atualizarStatus(at.id, 'REALIZADO')}
                          className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Marcar como Realizado
                        </button>
                      )}
                      {at.status === 'PENDENTE_RETORNO' && (
                        <button
                          onClick={() => atualizarStatus(at.id, 'REALIZADO')}
                          className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Retorno Concluído
                        </button>
                      )}
                      <button
                        onClick={() => atualizarStatus(at.id, 'CANCELADO')}
                        className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
