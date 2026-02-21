import { useState, useEffect, useRef } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import http from '../api/http';
import {
  Users, Plus, Search, Filter, Edit3, Trash2, UserCheck,
  UserX, Key, Mail, Phone, Building2, Shield, ChevronDown,
  RefreshCw, X, Eye, EyeOff, CheckCircle, AlertCircle,
  Crown, GraduationCap, Stethoscope, Briefcase, User,
  MoreVertical, Lock, Unlock, Send, Download,
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
  roles: Array<{ roleType: string; unit?: { name: string; unitCode: string } }>;
  unit?: { name: string; unitCode: string };
  mantenedora?: { name: string };
}

interface Unidade {
  id: string;
  name: string;
  unitCode: string;
}

// ─── Configurações de papel ───────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; cor: string; icon: React.ReactNode; nivel: number }> = {
  DEVELOPER: { label: 'Desenvolvedor', cor: 'bg-red-100 text-red-700 border-red-200', icon: <Shield className="h-3 w-3" />, nivel: 1 },
  MANTENEDORA_ADMIN: { label: 'Mantenedora — Admin', cor: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Crown className="h-3 w-3" />, nivel: 2 },
  MANTENEDORA_FINANCEIRO: { label: 'Mantenedora — Financeiro', cor: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Briefcase className="h-3 w-3" />, nivel: 2 },
  STAFF_CENTRAL_PEDAGOGICO: { label: 'Coord. Pedagógica Geral', cor: 'bg-blue-100 text-blue-700 border-blue-200', icon: <GraduationCap className="h-3 w-3" />, nivel: 3 },
  STAFF_CENTRAL_PSICOLOGIA: { label: 'Psicóloga Central', cor: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Stethoscope className="h-3 w-3" />, nivel: 3 },
  UNIDADE_DIRETOR: { label: 'Diretor(a) de Unidade', cor: 'bg-green-100 text-green-700 border-green-200', icon: <Building2 className="h-3 w-3" />, nivel: 4 },
  UNIDADE_COORDENADOR_PEDAGOGICO: { label: 'Coord. Pedagógica', cor: 'bg-green-100 text-green-700 border-green-200', icon: <GraduationCap className="h-3 w-3" />, nivel: 4 },
  UNIDADE_ADMINISTRATIVO: { label: 'Secretaria / Adm.', cor: 'bg-teal-100 text-teal-700 border-teal-200', icon: <Briefcase className="h-3 w-3" />, nivel: 4 },
  UNIDADE_NUTRICIONISTA: { label: 'Nutricionista', cor: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Stethoscope className="h-3 w-3" />, nivel: 4 },
  PROFESSOR: { label: 'Professor(a)', cor: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <GraduationCap className="h-3 w-3" />, nivel: 5 },
  PROFESSOR_AUXILIAR: { label: 'Professor(a) Auxiliar', cor: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <User className="h-3 w-3" />, nivel: 5 },
};

const STATUS_CONFIG = {
  ATIVO: { label: 'Ativo', cor: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  INATIVO: { label: 'Inativo', cor: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  SUSPENSO: { label: 'Suspenso', cor: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  CONVIDADO: { label: 'Convidado', cor: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
};

// ─── Modal de Criar/Editar Usuário ────────────────────────────────────────────
function ModalUsuario({
  usuario, unidades, onClose, onSave,
}: {
  usuario?: Usuario | null;
  unidades: Unidade[];
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!usuario;
  const [form, setForm] = useState({
    firstName: usuario?.firstName || '',
    lastName: usuario?.lastName || '',
    email: usuario?.email || '',
    phone: usuario?.phone || '',
    cpf: usuario?.cpf || '',
    roleType: usuario?.roles?.[0]?.roleType || 'PROFESSOR',
    unitId: usuario?.unit?.unitCode || '',
    password: '',
    confirmarSenha: '',
    status: usuario?.status || 'ATIVO',
  });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [saving, setSaving] = useState(false);

  const roleAtual = ROLE_CONFIG[form.roleType];
  const precisaUnidade = form.roleType.startsWith('UNIDADE_') || form.roleType === 'PROFESSOR' || form.roleType === 'PROFESSOR_AUXILIAR';

  async function salvar() {
    if (!form.firstName.trim() || !form.lastName.trim()) { toast.error('Nome e sobrenome são obrigatórios'); return; }
    if (!form.email.trim()) { toast.error('E-mail é obrigatório'); return; }
    if (!isEdit && !form.password) { toast.error('Senha é obrigatória para novos usuários'); return; }
    if (form.password && form.password !== form.confirmarSenha) { toast.error('As senhas não coincidem'); return; }
    if (form.password && form.password.length < 6) { toast.error('Senha deve ter pelo menos 6 caracteres'); return; }

    setSaving(true);
    try {
      const payload: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone || undefined,
        cpf: form.cpf || undefined,
        roleType: form.roleType,
        unitCode: precisaUnidade ? form.unitId || undefined : undefined,
        status: form.status,
      };
      if (form.password) payload.password = form.password;

      if (isEdit) {
        await http.put(`/admin/users/${usuario!.id}`, payload);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await http.post('/admin/users', payload);
        toast.success('Usuário criado com sucesso!');
      }
      onSave();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Erro ao ${isEdit ? 'atualizar' : 'criar'} usuário`);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{isEdit ? `Editando: ${usuario!.firstName} ${usuario!.lastName}` : 'Preencha os dados do novo usuário'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulário */}
        <div className="p-6 space-y-5">
          {/* Nome */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">Nome *</Label>
              <Input className="mt-1" placeholder="Nome" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Sobrenome *</Label>
              <Input className="mt-1" placeholder="Sobrenome" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>

          {/* Email e Telefone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">E-mail *</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input className="pl-9" type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Telefone</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input className="pl-9" placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Perfil de Acesso */}
          <div>
            <Label className="text-sm font-semibold text-gray-700">Perfil de Acesso *</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {Object.entries(ROLE_CONFIG).filter(([r]) => r !== 'DEVELOPER').map(([role, cfg]) => (
                <button key={role} onClick={() => setForm(f => ({ ...f, roleType: role }))}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${form.roleType === role ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cor}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Unidade (condicional) */}
          {precisaUnidade && (
            <div>
              <Label className="text-sm font-semibold text-gray-700">Unidade {precisaUnidade ? '*' : ''}</Label>
              <div className="relative mt-1">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.unitId} onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))}>
                  <option value="">Selecione a unidade...</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.unitCode}>{u.name} ({u.unitCode})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Status (apenas edição) */}
          {isEdit && (
            <div>
              <Label className="text-sm font-semibold text-gray-700">Status</Label>
              <div className="mt-1 flex gap-2">
                {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                  <button key={status} onClick={() => setForm(f => ({ ...f, status: status as any }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all ${form.status === status ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-600 hover:border-gray-200'}`}>
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} /> {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Senha */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">{isEdit ? 'Alterar Senha (opcional)' : 'Senha de Acesso *'}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">{isEdit ? 'Nova Senha' : 'Senha'}</Label>
                <div className="relative mt-1">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input className="pl-9 pr-9" type={mostrarSenha ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  <button onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Confirmar Senha</Label>
                <div className="relative mt-1">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input className="pl-9" type="password" placeholder="Repita a senha" value={form.confirmarSenha} onChange={e => setForm(f => ({ ...f, confirmarSenha: e.target.value }))} />
                </div>
                {form.password && form.confirmarSenha && form.password !== form.confirmarSenha && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Senhas não coincidem</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving} className="bg-blue-600 hover:bg-blue-700 min-w-[120px]">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Usuário'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroRole, setFiltroRole] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => { loadDados(); }, []);

  async function loadDados() {
    setLoading(true);
    try {
      const [usersRes, unitsRes] = await Promise.all([
        http.get('/admin/users?limit=200'),
        http.get('/units?limit=100'),
      ]);
      const u = usersRes.data;
      setUsuarios(Array.isArray(u) ? u : u?.data ?? u?.users ?? []);
      const un = unitsRes.data;
      setUnidades(Array.isArray(un) ? un : un?.data ?? un?.units ?? []);
    } catch {
      // Dados de demonstração
      setUsuarios([
        { id: '1', firstName: 'Bruna', lastName: 'Vaz', email: 'bruna.vaz@cocris.org', status: 'ATIVO', emailVerified: true, createdAt: '2026-01-01', roles: [{ roleType: 'STAFF_CENTRAL_PEDAGOGICO' }] },
        { id: '2', firstName: 'Carla', lastName: 'Psicóloga', email: 'carla.psicologa@cocris.org', status: 'ATIVO', emailVerified: true, createdAt: '2026-01-01', roles: [{ roleType: 'STAFF_CENTRAL_PSICOLOGIA' }] },
        { id: '3', firstName: 'Ana', lastName: 'Carolina', email: 'ana.carolina@cocris.org', status: 'ATIVO', emailVerified: true, createdAt: '2026-01-01', roles: [{ roleType: 'UNIDADE_COORDENADOR_PEDAGOGICO', unit: { name: 'CEPI Arara Canindé', unitCode: 'ARARA-CAN' } }], unit: { name: 'CEPI Arara Canindé', unitCode: 'ARARA-CAN' } },
        { id: '4', firstName: 'Maria', lastName: 'Professora', email: 'professor1@unidade1.com', status: 'ATIVO', emailVerified: true, createdAt: '2026-01-01', roles: [{ roleType: 'PROFESSOR', unit: { name: 'CEPI Arara Canindé', unitCode: 'ARARA-CAN' } }], unit: { name: 'CEPI Arara Canindé', unitCode: 'ARARA-CAN' } },
      ]);
      setUnidades([
        { id: '1', name: 'CEPI Arara Canindé', unitCode: 'ARARA-CAN' },
        { id: '2', name: 'CEPI Beija-Flor', unitCode: 'BEIJA-FLO' },
        { id: '3', name: 'CEPI Sabiá do Campo', unitCode: 'SABIA-CAM' },
      ]);
    } finally { setLoading(false); }
  }

  async function alterarStatus(id: string, novoStatus: string) {
    try {
      await http.put(`/admin/users/${id}`, { status: novoStatus });
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, status: novoStatus as any } : u));
      toast.success(`Usuário ${novoStatus === 'ATIVO' ? 'ativado' : novoStatus === 'SUSPENSO' ? 'suspenso' : 'inativado'}`);
    } catch { toast.error('Erro ao alterar status'); }
    setMenuAberto(null);
  }

  async function resetarSenha(id: string, email: string) {
    try {
      await http.post(`/admin/users/${id}/reset-password`);
      toast.success(`Link de redefinição enviado para ${email}`);
    } catch { toast.error('Erro ao enviar link de redefinição'); }
    setMenuAberto(null);
  }

  async function excluirUsuario(id: string) {
    try {
      await http.delete(`/admin/users/${id}`);
      setUsuarios(prev => prev.filter(u => u.id !== id));
      toast.success('Usuário excluído');
    } catch { toast.error('Erro ao excluir usuário'); }
    setConfirmDelete(null);
  }

  // Filtros
  const usuariosFiltrados = usuarios.filter(u => {
    const nome = `${u.firstName} ${u.lastName}`.toLowerCase();
    const roleAtual = u.roles?.[0]?.roleType || '';
    if (busca && !nome.includes(busca.toLowerCase()) && !u.email.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroRole && roleAtual !== filtroRole) return false;
    if (filtroStatus && u.status !== filtroStatus) return false;
    return true;
  });

  // Estatísticas
  const stats = {
    total: usuarios.length,
    ativos: usuarios.filter(u => u.status === 'ATIVO').length,
    professores: usuarios.filter(u => u.roles?.[0]?.roleType?.startsWith('PROFESSOR')).length,
    gestores: usuarios.filter(u => u.roles?.[0]?.roleType?.startsWith('UNIDADE_') || u.roles?.[0]?.roleType?.startsWith('STAFF_') || u.roles?.[0]?.roleType?.startsWith('MANTENEDORA_')).length,
  };

  return (
    <PageShell title="Gestão de Usuários" subtitle="Crie, edite e gerencie todos os acessos ao sistema">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total de Usuários', value: stats.total, cor: 'blue', icon: <Users className="h-5 w-5 text-blue-500" /> },
          { label: 'Usuários Ativos', value: stats.ativos, cor: 'green', icon: <UserCheck className="h-5 w-5 text-green-500" /> },
          { label: 'Professores', value: stats.professores, cor: 'yellow', icon: <GraduationCap className="h-5 w-5 text-yellow-500" /> },
          { label: 'Gestores', value: stats.gestores, cor: 'purple', icon: <Crown className="h-5 w-5 text-purple-500" /> },
        ].map((s, i) => (
          <Card key={i} className="border-2 border-gray-100 hover:border-gray-200 transition-all">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
                <div className={`w-10 h-10 bg-${s.cor}-50 rounded-xl flex items-center justify-center`}>{s.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Barra de ações */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Buscar por nome ou e-mail..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filtroRole} onChange={e => setFiltroRole(e.target.value)}>
          <option value="">Todos os perfis</option>
          {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
            <option key={role} value={role}>{cfg.label}</option>
          ))}
        </select>
        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
            <option key={s} value={s}>{cfg.label}</option>
          ))}
        </select>
        <Button onClick={() => { setUsuarioEditando(null); setModalAberto(true); }} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      {/* Contagem */}
      <p className="text-sm text-gray-500 mb-3">
        Exibindo <span className="font-semibold text-gray-700">{usuariosFiltrados.length}</span> de {usuarios.length} usuários
      </p>

      {/* Lista de usuários */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {usuariosFiltrados.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">Nenhum usuário encontrado</p>
              <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros ou crie um novo usuário</p>
            </div>
          )}

          {usuariosFiltrados.map(u => {
            const roleAtual = u.roles?.[0]?.roleType || '';
            const roleCfg = ROLE_CONFIG[roleAtual];
            const statusCfg = STATUS_CONFIG[u.status] || STATUS_CONFIG.INATIVO;

            return (
              <Card key={u.id} className={`border-2 transition-all hover:shadow-sm ${u.status !== 'ATIVO' ? 'opacity-70 border-gray-100' : 'border-gray-100 hover:border-blue-100'}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm">
                      <span className="text-sm font-bold text-blue-600">
                        {u.firstName[0]}{u.lastName[0]}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{u.firstName} {u.lastName}</p>
                        {roleCfg && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${roleCfg.cor}`}>
                            {roleCfg.icon} {roleCfg.label}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.cor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                        {u.emailVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-600">
                            <CheckCircle className="h-3 w-3" /> Verificado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <p className="text-xs text-gray-400 flex items-center gap-1"><Mail className="h-3 w-3" /> {u.email}</p>
                        {u.phone && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="h-3 w-3" /> {u.phone}</p>}
                        {u.unit && <p className="text-xs text-gray-400 flex items-center gap-1"><Building2 className="h-3 w-3" /> {u.unit.name}</p>}
                        {u.lastLogin && <p className="text-xs text-gray-400">Último acesso: {new Date(u.lastLogin).toLocaleDateString('pt-BR')}</p>}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => { setUsuarioEditando(u); setModalAberto(true); }}
                        className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-all" title="Editar usuário">
                        <Edit3 className="h-4 w-4" />
                      </button>

                      {/* Menu de ações */}
                      <div className="relative">
                        <button onClick={() => setMenuAberto(menuAberto === u.id ? null : u.id)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-all">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuAberto === u.id && (
                          <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-10 overflow-hidden">
                            {u.status === 'ATIVO' ? (
                              <button onClick={() => alterarStatus(u.id, 'SUSPENSO')}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50">
                                <Lock className="h-4 w-4" /> Suspender acesso
                              </button>
                            ) : (
                              <button onClick={() => alterarStatus(u.id, 'ATIVO')}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50">
                                <Unlock className="h-4 w-4" /> Reativar acesso
                              </button>
                            )}
                            <button onClick={() => resetarSenha(u.id, u.email)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50">
                              <Send className="h-4 w-4" /> Enviar link de senha
                            </button>
                            <div className="border-t border-gray-100" />
                            <button onClick={() => { setConfirmDelete(u.id); setMenuAberto(null); }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" /> Excluir usuário
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de criação/edição */}
      {modalAberto && (
        <ModalUsuario
          usuario={usuarioEditando}
          unidades={unidades}
          onClose={() => { setModalAberto(false); setUsuarioEditando(null); }}
          onSave={loadDados}
        />
      )}

      {/* Confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Usuário</h3>
            <p className="text-gray-500 text-sm mb-6">Esta ação não pode ser desfeita. O usuário perderá acesso imediatamente.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => excluirUsuario(confirmDelete)}>Excluir</Button>
            </div>
          </div>
        </div>
      )}

      {/* Fechar menu ao clicar fora */}
      {menuAberto && <div className="fixed inset-0 z-0" onClick={() => setMenuAberto(null)} />}
    </PageShell>
  );
}
