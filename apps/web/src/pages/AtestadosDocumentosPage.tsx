/**
 * AtestadosDocumentosPage — Atestados Médicos e Documentos de Matrícula
 *
 * Módulo exclusivo da Secretaria. Permite:
 * - consultar documentos entregues e pendentes de cada criança
 * - registrar recebimento de atestados médicos
 * - acompanhar situação documental da matrícula
 *
 * Os campos são armazenados no modelo Child como JSONB:
 * - documentos_matricula
 * (migration 20260603040000_child_secretaria_administrative_fields)
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Clock,
  FileCheck,
  FileMinus,
  FolderCheck,
  Loader2,
  RefreshCw,
  Search,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../app/AuthProvider';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import { PageShell } from '../components/ui/PageShell';

// ── Tipos de documentos da matrícula ───────────────────────────────────────
const DOCUMENTOS_OBRIGATORIOS = [
  { id: 'certidao_nascimento', label: 'Certidão de Nascimento' },
  { id: 'cpf_crianca', label: 'CPF da Criança' },
  { id: 'carteirinha_vacina', label: 'Carteirinha de Vacinação' },
  { id: 'foto_3x4', label: 'Foto 3x4' },
  { id: 'cpf_responsavel', label: 'CPF do Responsável' },
  { id: 'rg_responsavel', label: 'RG do Responsável' },
  { id: 'comprovante_residencia', label: 'Comprovante de Residência' },
  { id: 'declaracao_escola_anterior', label: 'Declaração de Escola Anterior (se houver)' },
];

interface DocumentoStatus {
  id: string;
  entregue: boolean;
  dataEntrega?: string;
  observacao?: string;
}

interface Atestado {
  id: string;
  tipo: string;
  dataEmissao: string;
  dataEntrega: string;
  medico?: string;
  diasAfastamento?: number;
  observacao?: string;
}

interface DocumentosMatricula {
  documentos?: DocumentoStatus[];
  atestados?: Atestado[];
  observacaoGeral?: string;
}

interface AlunoDoc {
  id: string;
  firstName: string;
  lastName: string;
  turma: string;
  documentos_matricula?: DocumentosMatricula | null;
}

export default function AtestadosDocumentosPage() {
  const { user } = useAuth();
  const [alunos, setAlunos] = useState<AlunoDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<AlunoDoc | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // Formulários de edição
  const [formDocs, setFormDocs] = useState<DocumentoStatus[]>([]);
  const [formAtestados, setFormAtestados] = useState<Atestado[]>([]);
  const [formObservacao, setFormObservacao] = useState('');
  const [novoAtestado, setNovoAtestado] = useState(false);
  const [atestadoForm, setAtestadoForm] = useState<Partial<Atestado>>({ tipo: 'médico', dataEmissao: '', dataEntrega: new Date().toISOString().slice(0, 10) });

  const carregarAlunos = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const unitId = (user as any)?.unitId;
      const params = unitId ? `?unitId=${unitId}` : '';
      const res = await http.get(`/children${params}`);
      const lista: AlunoDoc[] = (res.data?.children ?? res.data ?? []).map((c: any) => ({
        id: c.id,
        firstName: c.firstName ?? '',
        lastName: c.lastName ?? '',
        turma: c.enrollments?.[0]?.classroom?.name ?? '—',
        documentos_matricula: c.documentos_matricula ?? null,
      }));
      setAlunos(lista);
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { carregarAlunos(); }, [carregarAlunos]);

  function abrirEdicao(aluno: AlunoDoc) {
    const dm = aluno.documentos_matricula ?? {};
    // Garantir que todos os documentos obrigatórios estejam na lista
    const docsExistentes = dm.documentos ?? [];
    const docsMerge = DOCUMENTOS_OBRIGATORIOS.map(d => {
      const existe = docsExistentes.find(e => e.id === d.id);
      return existe ?? { id: d.id, entregue: false };
    });
    setSelecionado(aluno);
    setFormDocs(docsMerge);
    setFormAtestados(dm.atestados ?? []);
    setFormObservacao(dm.observacaoGeral ?? '');
    setNovoAtestado(false);
    setMensagem(null);
  }

  function fecharEdicao() {
    setSelecionado(null);
    setNovoAtestado(false);
    setMensagem(null);
  }

  function toggleDoc(id: string) {
    setFormDocs(prev => prev.map(d =>
      d.id === id
        ? { ...d, entregue: !d.entregue, dataEntrega: !d.entregue ? new Date().toISOString().slice(0, 10) : undefined }
        : d,
    ));
  }

  function adicionarAtestado() {
    if (!atestadoForm.tipo || !atestadoForm.dataEmissao || !atestadoForm.dataEntrega) return;
    const novo: Atestado = {
      id: `at_${Date.now()}`,
      tipo: atestadoForm.tipo ?? 'médico',
      dataEmissao: atestadoForm.dataEmissao ?? '',
      dataEntrega: atestadoForm.dataEntrega ?? '',
      medico: atestadoForm.medico,
      diasAfastamento: atestadoForm.diasAfastamento,
      observacao: atestadoForm.observacao,
    };
    setFormAtestados(prev => [novo, ...prev]);
    setNovoAtestado(false);
    setAtestadoForm({ tipo: 'médico', dataEmissao: '', dataEntrega: new Date().toISOString().slice(0, 10) });
  }

  function removerAtestado(id: string) {
    setFormAtestados(prev => prev.filter(a => a.id !== id));
  }

  async function salvar() {
    if (!selecionado) return;
    setSalvando(true);
    setMensagem(null);
    try {
      await http.patch(`/children/${selecionado.id}/secretaria`, {
        documentos_matricula: {
          documentos: formDocs,
          atestados: formAtestados,
          observacaoGeral: formObservacao,
        },
      });
      setMensagem({ tipo: 'ok', texto: 'Documentos salvos com sucesso.' });
      const dm = { documentos: formDocs, atestados: formAtestados, observacaoGeral: formObservacao };
      setAlunos(prev => prev.map(a => a.id === selecionado.id ? { ...a, documentos_matricula: dm } : a));
      setSelecionado(prev => prev ? { ...prev, documentos_matricula: dm } : null);
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: getErrorMessage(e) });
    } finally {
      setSalvando(false);
    }
  }

  const alunosFiltrados = alunos.filter(a =>
    `${a.firstName} ${a.lastName}`.toLowerCase().includes(busca.toLowerCase()),
  );

  // Calcular status documental para a lista
  function statusDocs(aluno: AlunoDoc) {
    const dm = aluno.documentos_matricula;
    if (!dm?.documentos) return { entregues: 0, total: DOCUMENTOS_OBRIGATORIOS.length };
    const entregues = dm.documentos.filter(d => d.entregue).length;
    return { entregues, total: DOCUMENTOS_OBRIGATORIOS.length };
  }

  // ── View de edição ───────────────────────────────────────────────────────
  if (selecionado) {
    return (
      <PageShell titulo="Atestados e Documentos" subtitulo={`${selecionado.firstName} ${selecionado.lastName}`}>
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
            {mensagem.tipo === 'ok' ? <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
            {mensagem.texto}
          </div>
        )}

        {/* Documentos de matrícula */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <FolderCheck className="h-5 w-5 text-sky-600" />
            <h2 className="text-base font-semibold text-slate-800">Documentos de Matrícula</h2>
          </div>
          <div className="space-y-2">
            {formDocs.map(doc => {
              const label = DOCUMENTOS_OBRIGATORIOS.find(d => d.id === doc.id)?.label ?? doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleDoc(doc.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${doc.entregue ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'}`}
                >
                  {doc.entregue
                    ? <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    : <FileMinus className="h-5 w-5 text-slate-400 flex-shrink-0" />
                  }
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${doc.entregue ? 'text-emerald-800' : 'text-slate-600'}`}>{label}</p>
                    {doc.entregue && doc.dataEntrega && (
                      <p className="text-xs text-emerald-600">Entregue em {new Date(doc.dataEntrega + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium ${doc.entregue ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {doc.entregue ? 'Entregue' : 'Pendente'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Atestados médicos */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-rose-600" />
              <h2 className="text-base font-semibold text-slate-800">Atestados Médicos</h2>
            </div>
            <button
              onClick={() => setNovoAtestado(true)}
              className="text-sm text-rose-700 hover:text-rose-900 font-medium transition-colors"
            >
              + Registrar atestado
            </button>
          </div>

          {novoAtestado && (
            <div className="border border-rose-200 bg-rose-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tipo de atestado</label>
                  <select
                    value={atestadoForm.tipo}
                    onChange={e => setAtestadoForm(prev => ({ ...prev, tipo: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  >
                    <option value="médico">Atestado Médico</option>
                    <option value="odontológico">Atestado Odontológico</option>
                    <option value="hospitalar">Internação Hospitalar</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Dias de afastamento</label>
                  <input
                    type="number"
                    min={1}
                    value={atestadoForm.diasAfastamento ?? ''}
                    onChange={e => setAtestadoForm(prev => ({ ...prev, diasAfastamento: Number(e.target.value) || undefined }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Data de emissão *</label>
                  <input
                    type="date"
                    value={atestadoForm.dataEmissao}
                    onChange={e => setAtestadoForm(prev => ({ ...prev, dataEmissao: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Data de entrega *</label>
                  <input
                    type="date"
                    value={atestadoForm.dataEntrega}
                    onChange={e => setAtestadoForm(prev => ({ ...prev, dataEntrega: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Médico / Profissional</label>
                  <input
                    type="text"
                    value={atestadoForm.medico ?? ''}
                    onChange={e => setAtestadoForm(prev => ({ ...prev, medico: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    placeholder="Dr. Nome do profissional (opcional)"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Observação</label>
                  <input
                    type="text"
                    value={atestadoForm.observacao ?? ''}
                    onChange={e => setAtestadoForm(prev => ({ ...prev, observacao: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    placeholder="CID, diagnóstico, restrições..."
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={adicionarAtestado}
                  className="text-sm bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Registrar
                </button>
                <button
                  onClick={() => setNovoAtestado(false)}
                  className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {formAtestados.length === 0 && !novoAtestado && (
            <p className="text-sm text-slate-400 text-center py-4">Nenhum atestado registrado.</p>
          )}

          <div className="space-y-2">
            {formAtestados.map(at => (
              <div key={at.id} className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                <FileCheck className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{at.tipo}</p>
                  <p className="text-xs text-slate-400">
                    Emitido: {new Date(at.dataEmissao + 'T12:00:00').toLocaleDateString('pt-BR')}
                    {at.diasAfastamento ? ` · ${at.diasAfastamento} dia(s)` : ''}
                    {at.medico ? ` · ${at.medico}` : ''}
                  </p>
                  {at.observacao && <p className="text-xs text-slate-500 mt-0.5">{at.observacao}</p>}
                </div>
                <button
                  onClick={() => removerAtestado(at.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Observação geral */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-2">Observações gerais sobre documentação</label>
          <textarea
            value={formObservacao}
            onChange={e => setFormObservacao(e.target.value)}
            rows={3}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            placeholder="Ex: Certidão de nascimento apresentada e devolvida, aguardando comprovante de residência atualizado."
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
          <button onClick={fecharEdicao} className="text-sm text-slate-500 hover:text-slate-700 transition-colors px-4 py-2.5">
            Cancelar
          </button>
        </div>
      </PageShell>
    );
  }

  // ── View de lista ────────────────────────────────────────────────────────
  return (
    <PageShell titulo="Atestados e Documentos" subtitulo="Acompanhe a situação documental e os atestados médicos de cada criança">
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar aluno..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
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
              const { entregues, total } = statusDocs(aluno);
              const completo = entregues === total;
              const percentual = Math.round((entregues / total) * 100);
              return (
                <button
                  key={aluno.id}
                  onClick={() => abrirEdicao(aluno)}
                  className="w-full flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-sky-300 hover:bg-sky-50 transition-all text-left"
                >
                  <div className="h-9 w-9 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{aluno.firstName} {aluno.lastName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-[100px]">
                        <div
                          className={`h-1.5 rounded-full transition-all ${completo ? 'bg-emerald-500' : percentual >= 70 ? 'bg-amber-500' : 'bg-red-400'}`}
                          style={{ width: `${percentual}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">{entregues}/{total} docs</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {completo
                      ? <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"><CheckCircle className="h-3 w-3" /> Completo</span>
                      : <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"><Clock className="h-3 w-3" /> Pendente</span>
                    }
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
