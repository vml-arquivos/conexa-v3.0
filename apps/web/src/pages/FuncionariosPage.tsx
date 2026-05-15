/**
 * FuncionariosPage — Gestão de Funcionários da Secretaria
 *
 * Lista, cadastra, edita e altera status de funcionários da unidade.
 * Usa os mesmos endpoints de /admin/users já existentes.
 * Filtra automaticamente por unidade do usuário logado.
 *
 * RBAC: UNIDADE_ADMINISTRATIVO, UNIDADE_DIRETOR, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
 * Usa endpoints existentes: GET /admin/users, POST /admin/users, PUT /admin/users/:id
 */

import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Button } from '../components/ui/button';
import http from '../api/http';
import { getErrorMessage } from '../utils/errorMessage';
import { toast } from 'sonner';
import {
  UserPlus, Search, RefreshCw, XCircle, Loader2, Users,
  Edit3, UserCheck, UserX, ChevronDown, ChevronUp, Shield,
  GraduationCap, Briefcase, Stethoscope, User, Crown, Building2,
  Eye, EyeOff, Mail, Phone,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Funcionario {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  cpf?: string;
  status: string;
  emailVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  roles: Array<{ roleType: string; unit?: { name: string; unitCode: string } }>;
}

interface Unidade {
  id: string;
  name: string;
  unitCode: string;
}

// ─── Configuração de papéis ───────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; cor: string; icon: React.ReactNode }> = {
  DEVELOPER:                      { label: 'Desenvolvedor',        cor: 'bg-red-100 text-red-700 border-red-200',     icon: <Shield className="h-3 w-3" /> },
  MANTENEDORA_ADMIN:              { label: 'Mantenedora — Admin',  cor: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Crown className="h-3 w-3" /> },
  STAFF_CENTRAL_PEDAGOGICO:       { label: 'Coord. Geral',         cor: 'bg-blue-100 text-blue-700 border-blue-200',  icon: <GraduationCap className="h-3 w-3" /> },
  STAFF_CENTRAL_PSICOLOGIA:       { label: 'Psicóloga Central',    cor: 'bg-blue-100 text-blue-700 border-blue-200',  icon: <Stethoscope className="h-3 w-3" /> },
  UNIDADE_DIRETOR:                { label: 'Diretor(a)',            cor: 'bg-green-100 text-green-700 border-green-200', icon: <Building2 className="h-3 w-3" /> },
  UNIDADE_COORDENADOR_PEDAGOGICO: { label: 'Coord. Pedagógica',    cor: 'bg-green-100 text-green-700 border-green-200', icon: <GraduationCap className="h-3 w-3" /> },
  UNIDADE_ADMINISTRATIVO:         { label: 'Secretaria / Adm.',    cor: 'bg-teal-100 text-teal-700 border-teal-200',  icon: <Briefcase className="h-3 w-3" /> },
  UNIDADE_NUTRICIONISTA:          { label: 'Nutricionista',         cor: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Stethoscope className="h-3 w-3" /> },
  PROFESSOR:                      { label: 'Professor(a)',          cor: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <GraduationCap className="h-3 w-3" /> },
  PROFESSOR_AUXILIAR:             { label: 'Prof. Auxiliar',        cor: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <User className="h-3 w-3" /> },
};

const ROLES_DISPONIVEIS = [
  'UNIDADE_DIRETOR', 'UNIDADE_COORDENADOR_PEDAGOGICO', 'UNIDADE_ADMINISTRATIVO',
  'UNIDADE_NUTRICIONISTA', 'PROFESSOR', 'PROFESSOR_AUXILIAR',
];

const STATUS_COR: Record<string, string> = {
  ATIVO:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  INATIVO:   'bg-slate-50 text-slate-500 border-slate-200',
  SUSPENSO:  'bg-red-50 text-red-600 border-red-200',
  CONVIDADO: 'bg-blue-50 text-blue-600 border-blue-200',
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroRole, setFiltroRole] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Funcionario | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Formulário
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', cpf: '',
    password: '', roleType: 'PROFESSOR', unitCode: '',
  });

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [usersRes, unitsRes] = await Promise.allSettled([
        http.get('/admin/users'),
        http.get('/admin/units'),
      ]);
      if (usersRes.status === 'fulfilled') {
        const data = usersRes.value.data;
        setFuncionarios(Array.isArray(data) ? data : data?.users ?? []);
      }
      if (unitsRes.status === 'fulfilled') {
        const data = unitsRes.value.data;
        setUnidades(Array.isArray(data) ? data : data?.units ?? []);
      }
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = funcionarios.filter((f) => {
    const nome = `${f.firstName} ${f.lastName} ${f.email}`.toLowerCase();
    const matchBusca = nome.includes(busca.toLowerCase());
    const matchRole = filtroRole === '' || f.roles.some(r => r.roleType === filtroRole);
    return matchBusca && matchRole;
  });

  const abrirCadastro = () => {
    setEditando(null);
    setForm({ firstName: '', lastName: '', email: '', phone: '', cpf: '', password: '', roleType: 'PROFESSOR', unitCode: unidades[0]?.unitCode ?? '' });
    setModalAberto(true);
  };

  const abrirEdicao = (f: Funcionario) => {
    setEditando(f);
    const roleType = f.roles[0]?.roleType ?? 'PROFESSOR';
    const unitCode = f.roles[0]?.unit?.unitCode ?? unidades[0]?.unitCode ?? '';
    setForm({ firstName: f.firstName, lastName: f.lastName, email: f.email, phone: f.phone ?? '', cpf: f.cpf ?? '', password: '', roleType, unitCode });
    setModalAberto(true);
  };

  const salvar = async () => {
    if (!form.firstName || !form.email) {
      toast.error('Nome e e-mail são obrigatórios.');
      return;
    }
    setSalvando(true);
    try {
      if (editando) {
        await http.put(`/admin/users/${editando.id}`, {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || undefined,
          cpf: form.cpf || undefined,
          roleType: form.roleType,
          unitCode: form.unitCode || undefined,
        });
        toast.success('Funcionário atualizado com sucesso.');
      } else {
        await http.post('/admin/users', {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password || undefined,
          phone: form.phone || undefined,
          cpf: form.cpf || undefined,
          roleType: form.roleType,
          unitCode: form.unitCode || undefined,
        });
        toast.success('Funcionário cadastrado com sucesso.');
      }
      setModalAberto(false);
      carregar();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  };

  const alterarStatus = async (id: string, novoStatus: string) => {
    try {
      await http.put(`/admin/users/${id}`, { status: novoStatus });
      toast.success(`Status alterado para ${novoStatus}.`);
      carregar();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const totalAtivos = funcionarios.filter(f => f.status === 'ATIVO').length;

  return (
    <PageShell
      title="Funcionários"
      description="Cadastro e gestão da equipe"
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
            onClick={abrirCadastro}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs px-3 py-1.5 h-auto"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Novo Funcionário
          </Button>
        </div>
      }
    >
      {/* ── KPIs ── */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
          <Users className="h-4 w-4 text-blue-500 mb-1" />
          <p className="text-2xl font-semibold text-blue-600 tabular-nums">{funcionarios.length}</p>
          <p className="text-[11px] text-slate-400 font-normal">Total</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
          <UserCheck className="h-4 w-4 text-emerald-500 mb-1" />
          <p className="text-2xl font-semibold text-emerald-600 tabular-nums">{totalAtivos}</p>
          <p className="text-[11px] text-slate-400 font-normal">Ativos</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-sm">
          <UserX className="h-4 w-4 text-slate-400 mb-1" />
          <p className="text-2xl font-semibold text-slate-500 tabular-nums">{funcionarios.length - totalAtivos}</p>
          <p className="text-[11px] text-slate-400 font-normal">Inativos</p>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
            placeholder="Buscar por nome ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          value={filtroRole}
          onChange={(e) => setFiltroRole(e.target.value)}
        >
          <option value="">Todos os cargos</option>
          {ROLES_DISPONIVEIS.map(r => (
            <option key={r} value={r}>{ROLE_CONFIG[r]?.label ?? r}</option>
          ))}
        </select>
      </div>

      {/* ── Erro ── */}
      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {erro}
        </div>
      )}

      {/* ── Lista ── */}
      {carregando ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Carregando funcionários...</span>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum funcionário encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-slate-50">
            <p className="text-xs text-slate-400 font-medium">{filtrados.length} funcionário{filtrados.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="divide-y divide-slate-50">
            {filtrados.map((f) => {
              const isExp = expandido === f.id;
              const roleType = f.roles[0]?.roleType;
              const roleCfg = ROLE_CONFIG[roleType ?? ''];
              return (
                <div key={f.id}>
                  <button
                    onClick={() => setExpandido(isExp ? null : f.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left touch-manipulation"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-slate-600">
                        {f.firstName?.[0]?.toUpperCase()}{f.lastName?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {f.firstName} {f.lastName}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{f.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {roleCfg && (
                        <span className={`hidden sm:flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${roleCfg.cor}`}>
                          {roleCfg.icon}
                          {roleCfg.label}
                        </span>
                      )}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${STATUS_COR[f.status] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {f.status}
                      </span>
                      {isExp ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </button>

                  {/* Painel expandido */}
                  {isExp && (
                    <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100 space-y-3">
                      <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                        {f.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {f.phone}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {f.emailVerified ? 'E-mail verificado' : 'E-mail não verificado'}
                        </div>
                        {f.lastLogin && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            Último acesso: {new Date(f.lastLogin).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => abrirEdicao(f)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-medium hover:bg-slate-100 transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        {f.status === 'ATIVO' ? (
                          <button
                            onClick={() => alterarStatus(f.id, 'INATIVO')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            Desativar
                          </button>
                        ) : (
                          <button
                            onClick={() => alterarStatus(f.id, 'ATIVO')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 text-xs font-medium hover:bg-emerald-100 transition-colors"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Ativar
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal de Cadastro/Edição ── */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">
                {editando ? 'Editar Funcionário' : 'Novo Funcionário'}
              </h2>
              <button
                onClick={() => setModalAberto(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Nome *">
                  <input
                    className={inputCls}
                    value={form.firstName}
                    onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="Nome"
                  />
                </FormField>
                <FormField label="Sobrenome">
                  <input
                    className={inputCls}
                    value={form.lastName}
                    onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Sobrenome"
                  />
                </FormField>
              </div>
              <FormField label="E-mail *">
                <input
                  type="email"
                  className={inputCls}
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  disabled={!!editando}
                />
              </FormField>
              {!editando && (
                <FormField label="Senha temporária">
                  <div className="relative">
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      className={`${inputCls} pr-10`}
                      value={form.password}
                      onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Deixe em branco para gerar automaticamente"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormField>
              )}
              <FormField label="Telefone">
                <input
                  className={inputCls}
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </FormField>
              <FormField label="CPF">
                <input
                  className={inputCls}
                  value={form.cpf}
                  onChange={(e) => setForm(f => ({ ...f, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                />
              </FormField>
              <FormField label="Cargo / Papel">
                <select
                  className={inputCls}
                  value={form.roleType}
                  onChange={(e) => setForm(f => ({ ...f, roleType: e.target.value }))}
                >
                  {ROLES_DISPONIVEIS.map(r => (
                    <option key={r} value={r}>{ROLE_CONFIG[r]?.label ?? r}</option>
                  ))}
                </select>
              </FormField>
              {unidades.length > 0 && (
                <FormField label="Unidade">
                  <select
                    className={inputCls}
                    value={form.unitCode}
                    onChange={(e) => setForm(f => ({ ...f, unitCode: e.target.value }))}
                  >
                    <option value="">Selecione a unidade</option>
                    {unidades.map(u => (
                      <option key={u.id} value={u.unitCode}>{u.name}</option>
                    ))}
                  </select>
                </FormField>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setModalAberto(false)}
                className="text-xs px-3 py-1.5 h-auto"
              >
                Cancelar
              </Button>
              <Button
                onClick={salvar}
                disabled={salvando || !form.firstName || !form.email}
                className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs px-3 py-1.5 h-auto"
              >
                {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {editando ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors disabled:bg-slate-50 disabled:text-slate-400';

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
