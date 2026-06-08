/**
 * TransporteRetiradaPage
 *
 * Gestão de transporte escolar, autorizados para retirada e empresas de transporte.
 * Todos os filtros de aluno, turma e empresa usam <select> com dados carregados da API.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bus,
  UserCheck,
  RefreshCw,
  Loader2,
  Users,
  Plus,
  Pencil,
  Power,
  X,
  Save,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import { ChildAvatar } from '../components/children/ChildAvatar';
import { PageShell } from '../components/ui/PageShell';

interface Autorizado {
  nome?: string;
  parentesco?: string;
  telefone?: string;
}

interface ClassroomOption {
  id: string;
  name: string;
}

interface Aluno {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  transporteEscolar?: { utiliza?: boolean; nomeTransporte?: string } | null;
  autorizadosRetirada?: Autorizado[] | null;
  enrollments?: Array<{ status: string; classroom?: { id?: string; name?: string } }>;
}

interface EmpresaTransporte {
  id: string;
  nome: string;
  cnpj?: string | null;
  telefone?: string | null;
  responsavel?: string | null;
  placa?: string | null;
  observacoes?: string | null;
  isActive: boolean;
}

type Aba = 'transporte' | 'autorizados' | 'empresas';

const empresaInicial = {
  nome: '',
  cnpj: '',
  telefone: '',
  responsavel: '',
  placa: '',
  observacoes: '',
};

export default function TransporteRetiradaPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<ClassroomOption[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaTransporte[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [aba, setAba] = useState<Aba>('transporte');

  const [turmaTransporteId, setTurmaTransporteId] = useState('');
  const [empresaFiltroId, setEmpresaFiltroId] = useState('');
  const [turmaAutorizadosId, setTurmaAutorizadosId] = useState('');
  const [alunoAutorizadosId, setAlunoAutorizadosId] = useState('');

  const [alunoTransporteEditando, setAlunoTransporteEditando] = useState<Aluno | null>(null);
  const [empresaSelecionadaNome, setEmpresaSelecionadaNome] = useState('');
  const [alunoAutorizadosEditando, setAlunoAutorizadosEditando] = useState<Aluno | null>(null);
  const [autorizadosDraft, setAutorizadosDraft] = useState<Autorizado[]>([]);

  const [modalEmpresa, setModalEmpresa] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState<EmpresaTransporte | null>(null);
  const [empresaForm, setEmpresaForm] = useState(empresaInicial);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [childrenRes, classroomsRes, empresasRes] = await Promise.all([
        http.get('/children', { params: { limit: 500 } }),
        http.get('/lookup/classrooms/accessible'),
        http.get('/empresas-transporte'),
      ]);
      const childrenData = childrenRes.data;
      const classroomsData = classroomsRes.data;
      const empresasData = empresasRes.data;
      setAlunos(Array.isArray(childrenData) ? childrenData : childrenData?.data ?? childrenData?.items ?? []);
      setTurmas(Array.isArray(classroomsData) ? classroomsData : classroomsData?.data ?? classroomsData?.items ?? []);
      setEmpresas(Array.isArray(empresasData) ? empresasData : empresasData?.data ?? empresasData?.items ?? []);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const turmaAtiva = (aluno: Aluno) => aluno.enrollments?.find((e) => e.status === 'ATIVA')?.classroom;

  const alunosPorTurmaTransporte = useMemo(() => alunos.filter((aluno) => {
    if (!aluno.transporteEscolar?.utiliza) return false;
    if (turmaTransporteId && turmaAtiva(aluno)?.id !== turmaTransporteId) return false;
    if (empresaFiltroId) {
      const empresaNome = empresas.find((empresa) => empresa.id === empresaFiltroId)?.nome;
      if (empresaNome && aluno.transporteEscolar?.nomeTransporte !== empresaNome) return false;
    }
    return true;
  }), [alunos, turmaTransporteId, empresaFiltroId, empresas]);

  const alunosAutorizadosPorTurma = useMemo(() => alunos.filter((aluno) => {
    if (turmaAutorizadosId && turmaAtiva(aluno)?.id !== turmaAutorizadosId) return false;
    return true;
  }), [alunos, turmaAutorizadosId]);

  const alunoAutorizadosSelecionado = useMemo(
    () => alunos.find((aluno) => aluno.id === alunoAutorizadosId) ?? null,
    [alunos, alunoAutorizadosId],
  );

  const totalTransporte = alunos.filter((a) => a.transporteEscolar?.utiliza).length;
  const totalAutorizados = alunos.filter((a) => (a.autorizadosRetirada?.filter((aut) => aut.nome?.trim()).length ?? 0) > 0).length;

  function abrirEditarTransporte(aluno: Aluno) {
    setAlunoTransporteEditando(aluno);
    setEmpresaSelecionadaNome(aluno.transporteEscolar?.nomeTransporte ?? '');
  }

  async function salvarTransporteAluno() {
    if (!alunoTransporteEditando) return;
    setSalvando(true);
    try {
      await http.put(`/children/${alunoTransporteEditando.id}`, {
        transporteEscolar: { utiliza: true, nomeTransporte: empresaSelecionadaNome || undefined },
      });
      toast.success('Empresa de transporte vinculada ao aluno.');
      setAlunoTransporteEditando(null);
      await carregar();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  }

  function abrirEditarAutorizados(aluno: Aluno) {
    setAlunoAutorizadosEditando(aluno);
    setAutorizadosDraft([...(aluno.autorizadosRetirada ?? [])]);
  }

  async function salvarAutorizados() {
    if (!alunoAutorizadosEditando) return;
    setSalvando(true);
    try {
      const normalizados = autorizadosDraft
        .map((aut) => ({ nome: aut.nome?.trim(), parentesco: aut.parentesco?.trim(), telefone: aut.telefone?.trim() }))
        .filter((aut) => aut.nome);
      await http.put(`/children/${alunoAutorizadosEditando.id}`, { autorizadosRetirada: normalizados });
      toast.success('Autorizados para retirada atualizados.');
      setAlunoAutorizadosEditando(null);
      await carregar();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  }

  function abrirNovaEmpresa() {
    setEmpresaEditando(null);
    setEmpresaForm(empresaInicial);
    setModalEmpresa(true);
  }

  function abrirEditarEmpresa(empresa: EmpresaTransporte) {
    setEmpresaEditando(empresa);
    setEmpresaForm({
      nome: empresa.nome ?? '',
      cnpj: empresa.cnpj ?? '',
      telefone: empresa.telefone ?? '',
      responsavel: empresa.responsavel ?? '',
      placa: empresa.placa ?? '',
      observacoes: empresa.observacoes ?? '',
    });
    setModalEmpresa(true);
  }

  async function salvarEmpresa() {
    if (!empresaForm.nome.trim()) {
      toast.error('Informe o nome da empresa.');
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        nome: empresaForm.nome.trim(),
        cnpj: empresaForm.cnpj.trim() || undefined,
        telefone: empresaForm.telefone.trim() || undefined,
        responsavel: empresaForm.responsavel.trim() || undefined,
        placa: empresaForm.placa.trim() || undefined,
        observacoes: empresaForm.observacoes.trim() || undefined,
      };
      if (empresaEditando) {
        await http.put(`/empresas-transporte/${empresaEditando.id}`, payload);
        toast.success('Empresa atualizada.');
      } else {
        await http.post('/empresas-transporte', payload);
        toast.success('Empresa cadastrada.');
      }
      setModalEmpresa(false);
      await carregar();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarEmpresa(empresa: EmpresaTransporte) {
    setSalvando(true);
    try {
      await http.patch(`/empresas-transporte/${empresa.id}`, { isActive: !empresa.isActive });
      toast.success(empresa.isActive ? 'Empresa desativada.' : 'Empresa ativada.');
      await carregar();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <PageShell
      title="Transporte e Retirada"
      description="Controle de transporte escolar, pessoas autorizadas e empresas vinculadas"
      headerActions={
        <button
          onClick={carregar}
          disabled={carregando}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-4 mb-6">
        <CardResumo icon={<Bus className="h-5 w-5" />} label="Usam transporte" valor={totalTransporte} tone="blue" />
        <CardResumo icon={<UserCheck className="h-5 w-5" />} label="Com autorizados" valor={totalAutorizados} tone="emerald" />
        <CardResumo icon={<Users className="h-5 w-5" />} label="Empresas ativas" valor={empresas.filter((e) => e.isActive).length} tone="violet" />
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
        <AbaButton ativa={aba === 'transporte'} onClick={() => setAba('transporte')} icon={<Bus className="h-4 w-4" />} label="Transporte Escolar" />
        <AbaButton ativa={aba === 'autorizados'} onClick={() => setAba('autorizados')} icon={<UserCheck className="h-4 w-4" />} label="Autorizados para Retirada" />
        <AbaButton ativa={aba === 'empresas'} onClick={() => setAba('empresas')} icon={<Users className="h-4 w-4" />} label="Empresas de Transporte" />
      </div>

      {carregando ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : aba === 'transporte' ? (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Turma" value={turmaTransporteId} onChange={setTurmaTransporteId} options={turmas.map((t) => ({ value: t.id, label: t.name }))} placeholder="Todas as turmas" />
            <Select label="Empresa" value={empresaFiltroId} onChange={setEmpresaFiltroId} options={empresas.map((e) => ({ value: e.id, label: e.nome }))} placeholder="Todas as empresas" />
          </div>
          {alunosPorTurmaTransporte.length === 0 ? (
            <EstadoVazio texto="Nenhum aluno com transporte encontrado para os filtros selecionados." />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {alunosPorTurmaTransporte.map((aluno) => (
                <LinhaAluno key={aluno.id} aluno={aluno} extra={aluno.transporteEscolar?.nomeTransporte ?? 'Transporte escolar'} onEditar={() => abrirEditarTransporte(aluno)} />
              ))}
            </div>
          )}
        </section>
      ) : aba === 'autorizados' ? (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Turma" value={turmaAutorizadosId} onChange={(valor) => { setTurmaAutorizadosId(valor); setAlunoAutorizadosId(''); }} options={turmas.map((t) => ({ value: t.id, label: t.name }))} placeholder="Todas as turmas" />
            <Select label="Aluno" value={alunoAutorizadosId} onChange={setAlunoAutorizadosId} options={alunosAutorizadosPorTurma.map((a) => ({ value: a.id, label: `${a.firstName} ${a.lastName}` }))} placeholder="Selecione um aluno" />
          </div>
          {!alunoAutorizadosSelecionado ? (
            <EstadoVazio texto="Selecione um aluno para visualizar e editar autorizados para retirada." />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <ChildAvatar firstName={alunoAutorizadosSelecionado.firstName} lastName={alunoAutorizadosSelecionado.lastName} photoUrl={alunoAutorizadosSelecionado.photoUrl} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{alunoAutorizadosSelecionado.firstName} {alunoAutorizadosSelecionado.lastName}</p>
                    <p className="text-xs text-slate-500">{turmaAtiva(alunoAutorizadosSelecionado)?.name ?? 'Sem turma ativa'}</p>
                  </div>
                </div>
                <button onClick={() => abrirEditarAutorizados(alunoAutorizadosSelecionado)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700">
                  <Pencil className="h-4 w-4" /> Editar autorizados
                </button>
              </div>
              {(alunoAutorizadosSelecionado.autorizadosRetirada?.filter((a) => a.nome?.trim()).length ?? 0) === 0 ? (
                <p className="text-sm text-slate-500">Nenhum autorizado cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {alunoAutorizadosSelecionado.autorizadosRetirada!.filter((a) => a.nome?.trim()).map((aut, idx) => (
                    <div key={`${aut.nome}-${idx}`} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-slate-800">{aut.nome}</span>
                      {aut.parentesco && <span className="text-xs text-slate-500">{aut.parentesco}</span>}
                      {aut.telefone && <span className="ml-auto flex items-center gap-1 text-xs text-emerald-700"><Phone className="h-3 w-3" />{aut.telefone}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex justify-end">
            <button onClick={abrirNovaEmpresa} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">
              <Plus className="h-4 w-4" /> Nova empresa
            </button>
          </div>
          {empresas.length === 0 ? <EstadoVazio texto="Nenhuma empresa de transporte cadastrada." /> : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Empresa</th>
                    <th className="px-4 py-3 text-left">CNPJ</th>
                    <th className="px-4 py-3 text-left">Telefone</th>
                    <th className="px-4 py-3 text-left">Responsável</th>
                    <th className="px-4 py-3 text-left">Placa</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {empresas.map((empresa) => (
                    <tr key={empresa.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{empresa.nome}</td>
                      <td className="px-4 py-3 text-slate-600">{empresa.cnpj ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{empresa.telefone ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{empresa.responsavel ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{empresa.placa ?? '—'}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${empresa.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{empresa.isActive ? 'Ativa' : 'Inativa'}</span></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => abrirEditarEmpresa(empresa)} className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" title="Editar"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => alternarEmpresa(empresa)} disabled={salvando} className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" title="Ativar ou desativar"><Power className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {alunoTransporteEditando && (
        <Modal titulo="Editar transporte do aluno" onClose={() => setAlunoTransporteEditando(null)}>
          <Select label="Empresa de transporte" value={empresaSelecionadaNome} onChange={setEmpresaSelecionadaNome} options={empresas.filter((e) => e.isActive).map((e) => ({ value: e.nome, label: e.nome }))} placeholder="Selecione a empresa" />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setAlunoTransporteEditando(null)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">Cancelar</button>
            <button onClick={salvarTransporteAluno} disabled={salvando} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-60"><Save className="h-4 w-4" />Salvar</button>
          </div>
        </Modal>
      )}

      {alunoAutorizadosEditando && (
        <Modal titulo="Editar autorizados para retirada" onClose={() => setAlunoAutorizadosEditando(null)}>
          <div className="space-y-3">
            {autorizadosDraft.map((aut, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                <input value={aut.nome ?? ''} onChange={(e) => setAutorizadosDraft((lista) => lista.map((item, i) => i === idx ? { ...item, nome: e.target.value } : item))} placeholder="Nome" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input value={aut.parentesco ?? ''} onChange={(e) => setAutorizadosDraft((lista) => lista.map((item, i) => i === idx ? { ...item, parentesco: e.target.value } : item))} placeholder="Parentesco" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input value={aut.telefone ?? ''} onChange={(e) => setAutorizadosDraft((lista) => lista.map((item, i) => i === idx ? { ...item, telefone: e.target.value } : item))} placeholder="Telefone" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <button onClick={() => setAutorizadosDraft((lista) => lista.filter((_, i) => i !== idx))} className="p-2 rounded-lg border border-red-200 text-red-600"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <button onClick={() => setAutorizadosDraft((lista) => [...lista, { nome: '', parentesco: '', telefone: '' }])} className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm"><Plus className="h-4 w-4" />Adicionar autorizado</button>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setAlunoAutorizadosEditando(null)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">Cancelar</button>
            <button onClick={salvarAutorizados} disabled={salvando} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-60"><Save className="h-4 w-4" />Salvar</button>
          </div>
        </Modal>
      )}

      {modalEmpresa && (
        <Modal titulo={empresaEditando ? 'Editar empresa de transporte' : 'Nova empresa de transporte'} onClose={() => setModalEmpresa(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nome" value={empresaForm.nome} onChange={(valor) => setEmpresaForm((f) => ({ ...f, nome: valor }))} required />
            <Input label="CNPJ" value={empresaForm.cnpj} onChange={(valor) => setEmpresaForm((f) => ({ ...f, cnpj: valor }))} />
            <Input label="Telefone" value={empresaForm.telefone} onChange={(valor) => setEmpresaForm((f) => ({ ...f, telefone: valor }))} />
            <Input label="Responsável" value={empresaForm.responsavel} onChange={(valor) => setEmpresaForm((f) => ({ ...f, responsavel: valor }))} />
            <Input label="Placa" value={empresaForm.placa} onChange={(valor) => setEmpresaForm((f) => ({ ...f, placa: valor }))} />
            <Input label="Observações" value={empresaForm.observacoes} onChange={(valor) => setEmpresaForm((f) => ({ ...f, observacoes: valor }))} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setModalEmpresa(false)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">Cancelar</button>
            <button onClick={salvarEmpresa} disabled={salvando} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-60"><Save className="h-4 w-4" />Salvar</button>
          </div>
        </Modal>
      )}
    </PageShell>
  );
}

function CardResumo({ icon, label, valor, tone }: { icon: React.ReactNode; label: string; valor: number; tone: 'blue' | 'emerald' | 'violet' }) {
  const tones = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    violet: 'bg-violet-50 border-violet-100 text-violet-700',
  };
  return (
    <div className={`rounded-xl p-4 border ${tones[tone]}`}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-sm font-medium">{label}</span></div>
      <p className="text-3xl font-semibold">{valor}</p>
    </div>
  );
}

function AbaButton({ ativa, onClick, icon, label }: { ativa: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${ativa ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
      {icon}{label}
    </button>
  );
}

function Select({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
        <option value="">{placeholder}</option>
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
  );
}

function LinhaAluno({ aluno, extra, onEditar }: { aluno: Aluno; extra?: string; onEditar: () => void }) {
  const turma = aluno.enrollments?.find((e) => e.status === 'ATIVA')?.classroom?.name;
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <ChildAvatar firstName={aluno.firstName} lastName={aluno.lastName} photoUrl={aluno.photoUrl} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{aluno.firstName} {aluno.lastName}</p>
        <p className="text-xs text-slate-500 truncate">{turma ?? 'Sem turma ativa'}{extra ? ` · ${extra}` : ''}</p>
      </div>
      <button onClick={onEditar} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">
        <Pencil className="h-4 w-4" /> Editar
      </button>
    </div>
  );
}

function EstadoVazio({ texto }: { texto: string }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
      <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500 text-sm">{texto}</p>
    </div>
  );
}

function Modal({ titulo, children, onClose }: { titulo: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{titulo}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}{required ? ' *' : ''}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
    </label>
  );
}
