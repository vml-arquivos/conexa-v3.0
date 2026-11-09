import { useState, useEffect, useMemo } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import http from '../api/http';
import {
  Users, Plus, Search, Edit3, Trash2, UserCheck, Key, Mail, Phone, Building2, Shield,
  RefreshCw, X, Eye, EyeOff, CheckCircle, AlertCircle, Crown, GraduationCap, Stethoscope,
  Briefcase, User, MoreVertical, Lock, Unlock, Send, Wrench, ChevronDown, ChevronRight,
  LayoutDashboard, Sparkles,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Usuario {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  cpf?: string;
  status: 'ATIVO' | 'INATIVO' | 'SUSPENSO' | 'CONVIDADO';
  emailVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  homePath?: string | null;
  classrooms?: Array<{ id: string; name: string }>;
  roles: Array<{ roleType: string; unit?: { name: string; unitCode: string } }>;
  unit?: { name: string; unitCode: string };
}
interface Unidade { id: string; name: string; unitCode: string }
interface Turma { id: string; name: string; unit?: { id: string; name: string; code: string } }

// ─── Cargos ───────────────────────────────────────────────────────────────────
type Grupo = 'REDE' | 'UNIDADE' | 'PROFESSOR' | 'MANUTENCAO';
const GRUPOS: Record<Grupo, string> = {
  REDE: 'Rede (mantenedora e coordenação geral)',
  UNIDADE: 'Gestão da unidade',
  PROFESSOR: 'Professores',
  MANUTENCAO: 'Manutenção',
};

const ROLE_CONFIG: Record<string, { label: string; cor: string; icon: React.ReactNode; grupo: Grupo; ordem: number; painel: string }> = {
  DEVELOPER: { label: 'Desenvolvedor', cor: 'bg-red-100 text-red-700 border-red-200', icon: <Shield className="h-3 w-3" />, grupo: 'REDE', ordem: 1, painel: '/app/dashboard' },
  MANTENEDORA_ADMIN: { label: 'Mantenedora — Admin', cor: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Crown className="h-3 w-3" />, grupo: 'REDE', ordem: 2, painel: '/app/administracao' },
  MANTENEDORA_FINANCEIRO: { label: 'Mantenedora — Financeiro', cor: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Briefcase className="h-3 w-3" />, grupo: 'REDE', ordem: 3, painel: '/app/administracao' },
  STAFF_CENTRAL_PEDAGOGICO: { label: 'Coord. Pedagógica Geral', cor: 'bg-blue-100 text-blue-700 border-blue-200', icon: <GraduationCap className="h-3 w-3" />, grupo: 'REDE', ordem: 4, painel: '/app/central' },
  STAFF_CENTRAL_PSICOLOGIA: { label: 'Psicóloga Central', cor: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Stethoscope className="h-3 w-3" />, grupo: 'REDE', ordem: 5, painel: '/app/psicologo' },
  UNIDADE_DIRETOR: { label: 'Diretor(a) de Unidade', cor: 'bg-green-100 text-green-700 border-green-200', icon: <Building2 className="h-3 w-3" />, grupo: 'UNIDADE', ordem: 6, painel: '/app/diretor' },
  UNIDADE_COORDENADOR_PEDAGOGICO: { label: 'Coord. Pedagógica', cor: 'bg-green-100 text-green-700 border-green-200', icon: <GraduationCap className="h-3 w-3" />, grupo: 'UNIDADE', ordem: 7, painel: '/app/coordenacao-pedagogica' },
  UNIDADE_ADMINISTRATIVO: { label: 'Secretaria / Adm.', cor: 'bg-teal-100 text-teal-700 border-teal-200', icon: <Briefcase className="h-3 w-3" />, grupo: 'UNIDADE', ordem: 8, painel: '/app/secretaria' },
  UNIDADE_NUTRICIONISTA: { label: 'Nutricionista', cor: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Stethoscope className="h-3 w-3" />, grupo: 'UNIDADE', ordem: 9, painel: '/app/nutricionista' },
  PROFESSOR: { label: 'Professor(a)', cor: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <GraduationCap className="h-3 w-3" />, grupo: 'PROFESSOR', ordem: 10, painel: '/app/teacher-dashboard' },
  PROFESSOR_AUXILIAR: { label: 'Professor(a) Auxiliar', cor: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <User className="h-3 w-3" />, grupo: 'PROFESSOR', ordem: 11, painel: '/app/teacher-dashboard' },
  MANUTENCAO_EXECUTOR: { label: 'Manutenção', cor: 'bg-slate-100 text-slate-700 border-slate-200', icon: <Wrench className="h-3 w-3" />, grupo: 'MANUTENCAO', ordem: 12, painel: '/app/manutencao' },
};

/** Painéis reais (rotas existentes no router) que podem ser definidos como destino do login. */
const PAINEIS: Array<{ path: string; label: string }> = [
  { path: '/app/dashboard', label: 'Painel geral' },
  { path: '/app/administracao', label: 'Administração (mantenedora)' },
  { path: '/app/central', label: 'Coordenação geral' },
  { path: '/app/psicologo', label: 'Psicologia' },
  { path: '/app/diretor', label: 'Diretor(a) da unidade' },
  { path: '/app/coordenacao-pedagogica', label: 'Coordenação pedagógica' },
  { path: '/app/secretaria', label: 'Secretaria' },
  { path: '/app/nutricionista', label: 'Nutrição' },
  { path: '/app/teacher-dashboard', label: 'Professor(a)' },
  { path: '/app/mobile', label: 'Professor — modo celular' },
  { path: '/app/manutencao', label: 'Manutenção (ordens de serviço)' },
];
const nomePainel = (path: string) => PAINEIS.find((p) => p.path === path)?.label ?? path;

const STATUS_CONFIG = {
  ATIVO: { label: 'Ativo', cor: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  INATIVO: { label: 'Inativo', cor: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  SUSPENSO: { label: 'Suspenso', cor: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  CONVIDADO: { label: 'Convidado', cor: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
};

const roleDe = (u: Usuario) => u.roles?.[0]?.roleType || '';
const unidadeDe = (u: Usuario) => u.unit ?? u.roles?.[0]?.unit;
const nomeCompleto = (u: Usuario) => `${u.firstName} ${u.lastName}`.trim();
const precisaUnidadeDe = (role: string) => role.startsWith('UNIDADE_') || role.startsWith('PROFESSOR');

const selectCls =
  'h-9 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] px-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-brand)]';

function gerarSenha() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 10; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return `${s}@7`;
}

// ─── Modal de Criar/Editar ────────────────────────────────────────────────────
function ModalUsuario({
  usuario, presetRole, unidades, turmas, onClose, onSave,
}: {
  usuario?: Usuario | null;
  presetRole?: string;
  unidades: Unidade[];
  turmas: Turma[];
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!usuario;
  const turmaInicial = usuario?.classrooms?.[0]?.id ?? '';
  const [form, setForm] = useState({
    firstName: usuario?.firstName || '',
    lastName: usuario?.lastName || '',
    email: usuario?.email || '',
    phone: usuario?.phone || '',
    roleType: usuario ? roleDe(usuario) || 'PROFESSOR' : presetRole || 'PROFESSOR',
    unitCode: (usuario ? unidadeDe(usuario)?.unitCode : '') || '',
    classroomId: turmaInicial,
    homePath: usuario?.homePath || '',
    password: '',
    status: usuario?.status || 'ATIVO',
  });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [saving, setSaving] = useState(false);

  const cfg = ROLE_CONFIG[form.roleType];
  const precisaUnidade = precisaUnidadeDe(form.roleType);
  const ehProfessor = form.roleType === 'PROFESSOR' || form.roleType === 'PROFESSOR_AUXILIAR';
  const turmasDaUnidade = turmas.filter((t) => !form.unitCode || t.unit?.code === form.unitCode);

  async function salvar() {
    if (!form.firstName.trim() || !form.lastName.trim()) { toast.error('Nome e sobrenome são obrigatórios'); return; }
    if (!form.email.trim()) { toast.error('E-mail é obrigatório'); return; }
    if (precisaUnidade && !form.unitCode) { toast.error('Escolha a unidade deste cargo'); return; }
    if (!isEdit && form.password.length < 6) { toast.error('A senha precisa ter pelo menos 6 caracteres'); return; }
    if (isEdit && form.password && form.password.length < 6) { toast.error('A senha precisa ter pelo menos 6 caracteres'); return; }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone || undefined,
        roleType: form.roleType,
        unitCode: precisaUnidade ? form.unitCode || undefined : undefined,
        status: form.status,
      };
      if (form.password) payload.password = form.password;
      if (isEdit) {
        payload.homePath = form.homePath || null;
        if (ehProfessor && form.classroomId !== turmaInicial) payload.classroomId = form.classroomId || null;
        await http.put(`/admin/users/${usuario!.id}`, payload);
        toast.success('Usuário atualizado');
      } else {
        if (form.homePath) payload.homePath = form.homePath;
        if (ehProfessor && form.classroomId) payload.classroomId = form.classroomId;
        await http.post('/admin/users', payload);
        toast.success(`Usuário criado. Abre em: ${nomePainel(form.homePath || cfg?.painel || '')}`);
      }
      onSave();
      onClose();
    } catch (err: any) {
      const m = err?.response?.data?.message;
      toast.error(Array.isArray(m) ? m.join(', ') : m || `Erro ao ${isEdit ? 'atualizar' : 'criar'} usuário`);
    } finally { setSaving(false); }
  }

  const campo = 'mt-1';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border-default)] bg-[var(--surface-base)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] p-5">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{isEdit ? 'Editar usuário' : 'Novo usuário'}</h2>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              {isEdit ? nomeCompleto(usuario!) : 'Cargo, unidade, turma e painel de entrada'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-[var(--text-tertiary)] hover:bg-[var(--surface-subtle)]" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label>Nome *</Label><Input className={campo} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} /></div>
            <div><Label>Sobrenome *</Label><Input className={campo} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} /></div>
            <div>
              <Label>E-mail (será o login) *</Label>
              <div className="relative mt-1"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <Input className="pl-9" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Telefone</Label>
              <div className="relative mt-1"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <Input className="pl-9" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            </div>
          </div>

          <div>
            <Label>Cargo (perfil de acesso) *</Label>
            <select className={`${selectCls} mt-1 w-full`} value={form.roleType}
              onChange={(e) => setForm((f) => ({ ...f, roleType: e.target.value, classroomId: '' }))}>
              {(Object.keys(GRUPOS) as Grupo[]).map((g) => (
                <optgroup key={g} label={GRUPOS[g]}>
                  {Object.entries(ROLE_CONFIG)
                    .filter(([r, c]) => c.grupo === g && (r !== 'DEVELOPER' || usuario?.roles?.[0]?.roleType === 'DEVELOPER'))
                    .map(([r, c]) => <option key={r} value={r}>{c.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          {precisaUnidade && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Unidade *</Label>
                <select className={`${selectCls} mt-1 w-full`} value={form.unitCode}
                  onChange={(e) => setForm((f) => ({ ...f, unitCode: e.target.value, classroomId: '' }))}>
                  <option value="">Selecione…</option>
                  {unidades.map((u) => <option key={u.id} value={u.unitCode}>{u.name}</option>)}
                </select>
              </div>
              {ehProfessor && (
                <div>
                  <Label>Turma</Label>
                  <select className={`${selectCls} mt-1 w-full`} value={form.classroomId}
                    onChange={(e) => setForm((f) => ({ ...f, classroomId: e.target.value }))} disabled={!form.unitCode}>
                    <option value="">{form.unitCode ? 'Sem turma por enquanto' : 'Escolha a unidade primeiro'}</option>
                    {turmasDaUnidade.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3">
            <Label className="flex items-center gap-1.5"><LayoutDashboard className="h-4 w-4" /> Painel de entrada (ao fazer login)</Label>
            <select className={`${selectCls} mt-1.5 w-full`} value={form.homePath}
              onChange={(e) => setForm((f) => ({ ...f, homePath: e.target.value }))}>
              <option value="">Padrão do cargo — {nomePainel(cfg?.painel ?? '/app/dashboard')}</option>
              {PAINEIS.map((p) => <option key={p.path} value={p.path}>{p.label}</option>)}
            </select>
            <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
              Só define a primeira tela. O que cada pessoa pode abrir continua sendo controlado pelo cargo.
            </p>
          </div>

          {isEdit && (
            <div>
              <Label>Status</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                  <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, status: s as any }))}
                    className={`flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-medium ${form.status === s ? 'border-[var(--border-brand)] bg-[var(--surface-brand)] text-[var(--text-brand)]' : 'border-[var(--border-default)] text-[var(--text-secondary)]'}`}>
                    <span className={`h-2 w-2 rounded-full ${c.dot}`} /> {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-[var(--border-default)] pt-4">
            <Label>{isEdit ? 'Nova senha (opcional)' : 'Senha inicial *'}</Label>
            <div className="mt-1 flex gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <Input className="pl-9 pr-9" type={mostrarSenha ? 'text' : 'password'} placeholder="Mínimo 6 caracteres"
                  value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" aria-label="Mostrar senha">
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="button" variant="outline" onClick={() => { setForm((f) => ({ ...f, password: gerarSenha() })); setMostrarSenha(true); }}>
                <Sparkles className="mr-1.5 h-4 w-4" /> Gerar
              </Button>
            </div>
            {!isEdit && <p className="mt-1.5 flex items-center gap-1 text-xs text-[var(--text-secondary)]"><AlertCircle className="h-3 w-3" /> Anote a senha antes de salvar; depois ela não aparece mais.</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 rounded-b-2xl border-t border-[var(--border-default)] bg-[var(--surface-subtle)] p-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving} className="min-w-[130px]">
            {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            {saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar usuário'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState<'' | Grupo>('');
  const [filtroRole, setFiltroRole] = useState('');
  const [filtroUnidade, setFiltroUnidade] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [agrupar, setAgrupar] = useState<'unidade' | 'cargo' | 'nenhum'>('unidade');
  const [ordenar, setOrdenar] = useState<'nome' | 'cargo' | 'acesso'>('nome');
  const [fechados, setFechados] = useState<Set<string>>(new Set());

  const [modal, setModal] = useState<{ usuario?: Usuario | null; preset?: string } | null>(null);
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => { loadDados(); }, []);

  async function loadDados() {
    setLoading(true);
    try {
      const [usersRes, unitsRes, turmasRes] = await Promise.all([
        http.get('/admin/users?limit=500'),
        http.get('/admin/units'),
        http.get('/classrooms?limit=500').catch(() => null),
      ]);
      const pick = (d: any, k: string) => (Array.isArray(d) ? d : (d?.data ?? d?.[k] ?? d?.items ?? []));
      setUsuarios(pick(usersRes.data, 'users'));
      setUnidades(pick(unitsRes.data, 'units'));
      setTurmas(turmasRes ? pick(turmasRes.data, 'classrooms') : []);
    } catch {
      toast.error('Não foi possível carregar os usuários');
    } finally { setLoading(false); }
  }

  async function alterarStatus(id: string, novoStatus: string) {
    try {
      await http.put(`/admin/users/${id}`, { status: novoStatus });
      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, status: novoStatus as any } : u)));
      toast.success(novoStatus === 'ATIVO' ? 'Acesso reativado' : 'Acesso suspenso');
    } catch { toast.error('Erro ao alterar status'); }
    setMenuAberto(null);
  }
  async function resetarSenha(id: string, email: string) {
    try { await http.post(`/admin/users/${id}/reset-password`); toast.success(`Link enviado para ${email}`); }
    catch { toast.error('Erro ao enviar link de redefinição'); }
    setMenuAberto(null);
  }
  async function excluirUsuario(id: string) {
    try { await http.delete(`/admin/users/${id}`); setUsuarios((p) => p.filter((u) => u.id !== id)); toast.success('Usuário excluído'); }
    catch { toast.error('Erro ao excluir usuário'); }
    setConfirmDelete(null);
  }

  const turmasFiltro = turmas.filter((t) => !filtroUnidade || t.unit?.code === filtroUnidade);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = usuarios.filter((u) => {
      const r = roleDe(u);
      if (q && !nomeCompleto(u).toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (filtroGrupo && ROLE_CONFIG[r]?.grupo !== filtroGrupo) return false;
      if (filtroRole && r !== filtroRole) return false;
      if (filtroUnidade === '__rede__' ? !!unidadeDe(u) : filtroUnidade && unidadeDe(u)?.unitCode !== filtroUnidade) return false;
      if (filtroTurma && !u.classrooms?.some((c) => c.id === filtroTurma)) return false;
      if (filtroStatus && u.status !== filtroStatus) return false;
      return true;
    });
    const cmp: Record<string, (a: Usuario, b: Usuario) => number> = {
      nome: (a, b) => nomeCompleto(a).localeCompare(nomeCompleto(b), 'pt-BR'),
      cargo: (a, b) => (ROLE_CONFIG[roleDe(a)]?.ordem ?? 99) - (ROLE_CONFIG[roleDe(b)]?.ordem ?? 99) || nomeCompleto(a).localeCompare(nomeCompleto(b), 'pt-BR'),
      acesso: (a, b) => (b.lastLogin ? Date.parse(b.lastLogin) : 0) - (a.lastLogin ? Date.parse(a.lastLogin) : 0),
    };
    return [...lista].sort(cmp[ordenar]);
  }, [usuarios, busca, filtroGrupo, filtroRole, filtroUnidade, filtroTurma, filtroStatus, ordenar]);

  const grupos = useMemo(() => {
    if (agrupar === 'nenhum') return [{ key: 'todos', titulo: 'Todos os usuários', itens: filtrados }];
    const m = new Map<string, { key: string; titulo: string; ordem: number; itens: Usuario[] }>();
    for (const u of filtrados) {
      let key: string; let titulo: string; let ordem: number;
      if (agrupar === 'unidade') {
        const un = unidadeDe(u);
        key = un?.unitCode ?? '__rede__'; titulo = un?.name ?? 'Rede — sem unidade (mantenedora, coordenação geral, manutenção)'; ordem = un ? 1 : 0;
      } else {
        const r = roleDe(u); key = r || '__sem__'; titulo = ROLE_CONFIG[r]?.label ?? 'Sem cargo'; ordem = ROLE_CONFIG[r]?.ordem ?? 99;
      }
      if (!m.has(key)) m.set(key, { key, titulo, ordem, itens: [] });
      m.get(key)!.itens.push(u);
    }
    return [...m.values()].sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, 'pt-BR'));
  }, [filtrados, agrupar]);

  const cont = (fn: (u: Usuario) => boolean) => usuarios.filter(fn).length;
  const stats = [
    { label: 'Total', value: usuarios.length, icon: <Users className="h-5 w-5" /> },
    { label: 'Ativos', value: cont((u) => u.status === 'ATIVO'), icon: <UserCheck className="h-5 w-5" /> },
    { label: 'Professores', value: cont((u) => ROLE_CONFIG[roleDe(u)]?.grupo === 'PROFESSOR'), icon: <GraduationCap className="h-5 w-5" /> },
    { label: 'Gestão', value: cont((u) => ['REDE', 'UNIDADE'].includes(ROLE_CONFIG[roleDe(u)]?.grupo)), icon: <Crown className="h-5 w-5" /> },
    { label: 'Manutenção', value: cont((u) => roleDe(u) === 'MANUTENCAO_EXECUTOR'), icon: <Wrench className="h-5 w-5" /> },
  ];
  const temFiltro = !!(busca || filtroGrupo || filtroRole || filtroUnidade || filtroTurma || filtroStatus);
  const limpar = () => { setBusca(''); setFiltroGrupo(''); setFiltroRole(''); setFiltroUnidade(''); setFiltroTurma(''); setFiltroStatus(''); };

  const linha = (u: Usuario) => {
    const r = roleDe(u); const rc = ROLE_CONFIG[r]; const st = STATUS_CONFIG[u.status] || STATUS_CONFIG.INATIVO;
    const un = unidadeDe(u);
    const destino = u.homePath || rc?.painel;
    return (
      <div key={u.id} className={`flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-2.5 ${u.status !== 'ATIVO' ? 'opacity-70' : ''}`}>
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-brand)] text-sm font-bold text-[var(--text-brand)] ring-1 ring-[var(--border-brand)]">
          {(u.firstName?.[0] ?? '?')}{(u.lastName?.[0] ?? '')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{nomeCompleto(u)}</p>
            {rc && <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${rc.cor}`}>{rc.icon}{rc.label}</span>}
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.cor}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{st.label}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{u.email}</span>
            {agrupar !== 'unidade' && un && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{un.name}</span>}
            {!!u.classrooms?.length && <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{u.classrooms.map((c) => c.name).join(', ')}</span>}
            {destino && <span className="flex items-center gap-1 text-[var(--text-brand)]"><LayoutDashboard className="h-3 w-3" />Abre em: {nomePainel(destino)}{u.homePath ? ' (personalizado)' : ''}</span>}
            {u.lastLogin && <span>Último acesso: {new Date(u.lastLogin).toLocaleDateString('pt-BR')}</span>}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button onClick={() => setModal({ usuario: u })} className="rounded-lg p-2 text-[var(--text-brand)] hover:bg-[var(--surface-subtle)]" title="Editar"><Edit3 className="h-4 w-4" /></button>
          <div className="relative">
            <button onClick={() => setMenuAberto(menuAberto === u.id ? null : u.id)} className="rounded-lg p-2 text-[var(--text-tertiary)] hover:bg-[var(--surface-subtle)]" aria-label="Mais ações"><MoreVertical className="h-4 w-4" /></button>
            {menuAberto === u.id && (
              <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] shadow-lg">
                {u.status === 'ATIVO'
                  ? <button onClick={() => alterarStatus(u.id, 'SUSPENSO')} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-orange-600 hover:bg-[var(--surface-subtle)]"><Lock className="h-4 w-4" /> Suspender acesso</button>
                  : <button onClick={() => alterarStatus(u.id, 'ATIVO')} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-green-600 hover:bg-[var(--surface-subtle)]"><Unlock className="h-4 w-4" /> Reativar acesso</button>}
                <button onClick={() => resetarSenha(u.id, u.email)} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-brand)] hover:bg-[var(--surface-subtle)]"><Send className="h-4 w-4" /> Enviar link de senha</button>
                <div className="border-t border-[var(--border-default)]" />
                <button onClick={() => { setConfirmDelete(u.id); setMenuAberto(null); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-[var(--surface-subtle)]"><Trash2 className="h-4 w-4" /> Excluir usuário</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const chip = (ativo: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${ativo ? 'border-[var(--border-brand)] bg-[var(--surface-brand)] text-[var(--text-brand)]' : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'}`;

  return (
    <PageShell
      title="Gestão de Usuários"
      subtitle="Crie acessos, escolha o cargo, a unidade, a turma e o painel de entrada de cada pessoa"
      headerActions={
        <>
          <Button variant="outline" onClick={() => setModal({ preset: 'MANUTENCAO_EXECUTOR' })}><Wrench className="mr-2 h-4 w-4" /> Novo da Manutenção</Button>
          <Button onClick={() => setModal({})}><Plus className="mr-2 h-4 w-4" /> Novo usuário</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] p-3.5">
              <div><p className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">{s.value}</p><p className="text-xs text-[var(--text-secondary)]">{s.label}</p></div>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-subtle)] text-[var(--text-tertiary)]">{s.icon}</span>
            </div>
          ))}
        </div>

        {/* Grupos de cargo */}
        <div className="flex flex-wrap gap-2">
          <button className={chip(filtroGrupo === '')} onClick={() => { setFiltroGrupo(''); setFiltroRole(''); }}>Todos</button>
          {(Object.keys(GRUPOS) as Grupo[]).map((g) => (
            <button key={g} className={chip(filtroGrupo === g)} onClick={() => { setFiltroGrupo(g); setFiltroRole(''); }}>
              {g === 'REDE' ? 'Rede' : g === 'UNIDADE' ? 'Gestão da unidade' : GRUPOS[g]}
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <Input className="pl-9" placeholder="Buscar por nome ou e-mail…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <select className={selectCls} value={filtroUnidade} onChange={(e) => { setFiltroUnidade(e.target.value); setFiltroTurma(''); }}>
            <option value="">Todas as unidades</option>
            <option value="__rede__">Rede (sem unidade)</option>
            {unidades.map((u) => <option key={u.id} value={u.unitCode}>{u.name}</option>)}
          </select>
          <select className={selectCls} value={filtroRole} onChange={(e) => setFiltroRole(e.target.value)}>
            <option value="">Todos os cargos</option>
            {Object.entries(ROLE_CONFIG).filter(([, c]) => !filtroGrupo || c.grupo === filtroGrupo).map(([r, c]) => <option key={r} value={r}>{c.label}</option>)}
          </select>
          <select className={selectCls} value={filtroTurma} onChange={(e) => setFiltroTurma(e.target.value)} disabled={turmas.length === 0}>
            <option value="">Todas as turmas</option>
            {turmasFiltro.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className={selectCls} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_CONFIG).map(([s, c]) => <option key={s} value={s}>{c.label}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--text-secondary)]">
          <span>
            Exibindo <b className="text-[var(--text-primary)]">{filtrados.length}</b> de {usuarios.length}
            {temFiltro && <button onClick={limpar} className="ml-2 text-[var(--text-brand)] underline">limpar filtros</button>}
          </span>
          <span className="flex items-center gap-2">
            <label className="flex items-center gap-1.5">Agrupar
              <select className={selectCls} value={agrupar} onChange={(e) => setAgrupar(e.target.value as any)}>
                <option value="unidade">por unidade</option><option value="cargo">por cargo</option><option value="nenhum">sem grupos</option>
              </select></label>
            <label className="flex items-center gap-1.5">Ordenar
              <select className={selectCls} value={ordenar} onChange={(e) => setOrdenar(e.target.value as any)}>
                <option value="nome">por nome</option><option value="cargo">por cargo</option><option value="acesso">pelo último acesso</option>
              </select></label>
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><RefreshCw className="h-8 w-8 animate-spin text-[var(--text-brand)]" /></div>
        ) : filtrados.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[var(--border-default)] py-12 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-[var(--text-tertiary)]" />
            <p className="font-medium text-[var(--text-secondary)]">Nenhum usuário encontrado</p>
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">Ajuste os filtros ou crie um novo usuário</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grupos.map((g) => {
              const fechado = fechados.has(g.key);
              return (
                <section key={g.key}>
                  {agrupar !== 'nenhum' && (
                    <button
                      onClick={() => setFechados((p) => { const n = new Set(p); n.has(g.key) ? n.delete(g.key) : n.add(g.key); return n; })}
                      className="mb-2 flex w-full items-center gap-2 text-left"
                    >
                      {fechado ? <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />}
                      <h2 className="font-display text-sm font-bold text-[var(--text-primary)]">{g.titulo}</h2>
                      <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">{g.itens.length}</span>
                    </button>
                  )}
                  {!fechado && <div className="space-y-2">{g.itens.map(linha)}</div>}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <ModalUsuario usuario={modal.usuario} presetRole={modal.preset} unidades={unidades} turmas={turmas}
          onClose={() => setModal(null)} onSave={loadDados} />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border-default)] bg-[var(--surface-base)] p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100"><Trash2 className="h-7 w-7 text-red-500" /></div>
            <h3 className="mb-2 text-lg font-bold text-[var(--text-primary)]">Excluir usuário</h3>
            <p className="mb-6 text-sm text-[var(--text-secondary)]">Esta ação não pode ser desfeita. A pessoa perde o acesso na hora.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => excluirUsuario(confirmDelete)}>Excluir</Button>
            </div>
          </div>
        </div>
      )}

      {menuAberto && <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(null)} />}
    </PageShell>
  );
}
