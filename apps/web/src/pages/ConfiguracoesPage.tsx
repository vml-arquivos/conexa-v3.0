import { useState, useEffect, useRef } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import { useAuth } from '../app/AuthProvider';
import http from '../api/http';
import {
  Settings, User, Building2, Users, Shield, Bell,
  Save, RefreshCw, Camera, Eye, EyeOff, Key,
  Globe, Palette, Clock, Mail, Phone, MapPin,
  ChevronRight, CheckCircle, AlertCircle, Plus,
  Trash2, Edit3, Lock, Unlock, UserCheck, UserX,
  Database, Download, Upload, Info,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface PerfilUsuario {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  cargo?: string;
  photoUrl?: string;
  role: string;
  unidade?: { name: string };
  createdAt: string;
}

interface ConfiguracaoUnidade {
  id: string;
  name: string;
  unitCode: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  capacidade?: number;
  horarioFuncionamento?: string;
  coordenadora?: string;
}

interface UsuarioSistema {
  id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  ultimoAcesso?: string;
  unidade?: { name: string };
}

const ROLES_LABELS: Record<string, string> = {
  DEVELOPER: 'Desenvolvedor',
  MANTENEDORA: 'Mantenedora',
  STAFF_CENTRAL: 'Equipe Central',
  UNIDADE: 'Gestão de Unidade',
  PROFESSOR: 'Professor(a)',
  PROFESSOR_AUXILIAR: 'Professor(a) Auxiliar',
};

const ROLES_COR: Record<string, string> = {
  DEVELOPER: 'bg-red-100 text-red-700',
  MANTENEDORA: 'bg-purple-100 text-purple-700',
  STAFF_CENTRAL: 'bg-blue-100 text-blue-700',
  UNIDADE: 'bg-green-100 text-green-700',
  PROFESSOR: 'bg-orange-100 text-orange-700',
  PROFESSOR_AUXILIAR: 'bg-yellow-100 text-yellow-700',
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function ConfiguracoesPage() {
  const { user } = useAuth() as any;
  const [abaAtiva, setAbaAtiva] = useState<'perfil' | 'unidade' | 'usuarios' | 'sistema' | 'notificacoes'>('perfil');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  // Perfil
  const [perfil, setPerfil] = useState<Partial<PerfilUsuario>>({});
  const [senhaForm, setSenhaForm] = useState({ atual: '', nova: '', confirmar: '' });
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // Unidade
  const [unidade, setUnidade] = useState<Partial<ConfiguracaoUnidade>>({});

  // Usuários
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [buscaUsuario, setBuscaUsuario] = useState('');
  const [novoUsuario, setNovoUsuario] = useState({ nome: '', email: '', role: 'PROFESSOR', senha: '' });
  const [showNovoUsuario, setShowNovoUsuario] = useState(false);

  // Notificações
  const [notifs, setNotifs] = useState({
    emailPlanejamentos: true,
    emailDiarios: false,
    emailRequisicoes: true,
    emailRdic: true,
    pushAtivado: true,
  });

  const userRole = user?.role || user?.roles?.[0] || '';
  const isAdmin = ['DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL', 'UNIDADE'].includes(userRole);
  const isDev = userRole === 'DEVELOPER';

  useEffect(() => { loadPerfil(); }, []);
  useEffect(() => {
    if (abaAtiva === 'usuarios' && isAdmin) loadUsuarios();
    if (abaAtiva === 'unidade' && isAdmin) loadUnidade();
  }, [abaAtiva]);

  async function loadPerfil() {
    setLoading(true);
    try {
      const res = await http.get('/auth/me');
      const u = res.data?.user || res.data;
      setPerfil({
        id: u.id,
        nome: u.nome || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        email: u.email,
        telefone: u.telefone || u.phone || '',
        cargo: u.cargo || '',
        photoUrl: u.photoUrl || u.photo || '',
        role: u.role || u.roles?.[0] || '',
        unidade: u.unidade || u.classroom?.unit,
      });
    } catch {
      // Usar dados do contexto
      setPerfil({
        nome: user?.nome || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        email: user?.email || '',
        role: user?.role || user?.roles?.[0] || '',
      });
    } finally { setLoading(false); }
  }

  async function loadUsuarios() {
    try {
      const res = await http.get('/users?limit=50');
      const d = res.data;
      setUsuarios(Array.isArray(d) ? d : d?.data ?? []);
    } catch { /* silencioso */ }
  }

  async function loadUnidade() {
    try {
      const res = await http.get('/units/my');
      setUnidade(res.data || {});
    } catch { /* silencioso */ }
  }

  async function salvarPerfil() {
    if (!perfil.nome?.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    try {
      await http.put('/auth/profile', {
        nome: perfil.nome,
        telefone: perfil.telefone,
        cargo: perfil.cargo,
      });
      toast.success('Perfil atualizado com sucesso!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar perfil');
    } finally { setSaving(false); }
  }

  async function alterarSenha() {
    if (!senhaForm.atual) { toast.error('Informe a senha atual'); return; }
    if (senhaForm.nova.length < 6) { toast.error('Nova senha deve ter pelo menos 6 caracteres'); return; }
    if (senhaForm.nova !== senhaForm.confirmar) { toast.error('As senhas não coincidem'); return; }
    setSaving(true);
    try {
      await http.put('/auth/change-password', {
        currentPassword: senhaForm.atual,
        newPassword: senhaForm.nova,
      });
      toast.success('Senha alterada com sucesso!');
      setSenhaForm({ atual: '', nova: '', confirmar: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao alterar senha');
    } finally { setSaving(false); }
  }

  async function uploadFotoPerfil(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await http.post('/auth/upload-photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = res.data?.photoUrl || URL.createObjectURL(file);
      setPerfil(p => ({ ...p, photoUrl: url }));
      toast.success('Foto atualizada!');
    } catch {
      const url = URL.createObjectURL(file);
      setPerfil(p => ({ ...p, photoUrl: url }));
      toast.success('Foto atualizada localmente');
    }
  }

  async function salvarUnidade() {
    setSaving(true);
    try {
      await http.put('/units/my', unidade);
      toast.success('Dados da unidade atualizados!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar dados da unidade');
    } finally { setSaving(false); }
  }

  async function criarUsuario() {
    if (!novoUsuario.email || !novoUsuario.nome || !novoUsuario.senha) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setSaving(true);
    try {
      await http.post('/users', novoUsuario);
      toast.success('Usuário criado com sucesso!');
      setShowNovoUsuario(false);
      setNovoUsuario({ nome: '', email: '', role: 'PROFESSOR', senha: '' });
      loadUsuarios();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao criar usuário');
    } finally { setSaving(false); }
  }

  async function toggleUsuario(id: string, ativo: boolean) {
    try {
      await http.put(`/users/${id}`, { ativo: !ativo });
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ativo: !ativo } : u));
      toast.success(ativo ? 'Usuário desativado' : 'Usuário ativado');
    } catch {
      toast.error('Erro ao alterar status do usuário');
    }
  }

  const usuariosFiltrados = usuarios.filter(u =>
    !buscaUsuario ||
    u.nome.toLowerCase().includes(buscaUsuario.toLowerCase()) ||
    u.email.toLowerCase().includes(buscaUsuario.toLowerCase())
  );

  const ABAS = [
    { id: 'perfil', label: 'Meu Perfil', icon: <User className="h-4 w-4" /> },
    ...(isAdmin ? [{ id: 'unidade', label: 'Unidade', icon: <Building2 className="h-4 w-4" /> }] : []),
    ...(isAdmin ? [{ id: 'usuarios', label: 'Usuários', icon: <Users className="h-4 w-4" /> }] : []),
    { id: 'notificacoes', label: 'Notificações', icon: <Bell className="h-4 w-4" /> },
    ...(isDev ? [{ id: 'sistema', label: 'Sistema', icon: <Settings className="h-4 w-4" /> }] : []),
  ];

  if (loading) return <LoadingState message="Carregando configurações..." />;

  return (
    <PageShell title="Configurações" subtitle="Gerencie seu perfil, unidade, usuários e preferências do sistema">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Menu lateral */}
        <aside className="w-full md:w-56 flex-shrink-0">
          <nav className="space-y-1">
            {ABAS.map(aba => (
              <button key={aba.id} onClick={() => setAbaAtiva(aba.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${abaAtiva === aba.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
                {aba.icon} {aba.label}
                {abaAtiva === aba.id && <ChevronRight className="h-4 w-4 ml-auto" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* ─── PERFIL ─── */}
          {abaAtiva === 'perfil' && (
            <>
              <Card className="border-2 border-blue-100">
                <CardHeader><CardTitle className="flex items-center gap-2 text-blue-700"><User className="h-5 w-5" /> Dados Pessoais</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {/* Foto */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {perfil.photoUrl ? (
                        <img src={perfil.photoUrl} alt="Foto de perfil" className="w-20 h-20 rounded-full object-cover border-4 border-blue-100" />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-4 border-blue-100">
                          <User className="w-10 h-10 text-blue-400" />
                        </div>
                      )}
                      <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={uploadFotoPerfil} />
                      <button onClick={() => photoRef.current?.click()}
                        className="absolute bottom-0 right-0 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white hover:bg-blue-600 shadow-md">
                        <Camera className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{perfil.nome}</p>
                      <p className="text-sm text-gray-500">{perfil.email}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLES_COR[perfil.role || ''] || 'bg-gray-100 text-gray-600'}`}>
                        {ROLES_LABELS[perfil.role || ''] || perfil.role}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nome Completo *</Label>
                      <Input value={perfil.nome || ''} onChange={e => setPerfil(p => ({ ...p, nome: e.target.value }))} />
                    </div>
                    <div>
                      <Label>E-mail</Label>
                      <Input value={perfil.email || ''} disabled className="bg-gray-50 cursor-not-allowed" />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input placeholder="(00) 00000-0000" value={perfil.telefone || ''} onChange={e => setPerfil(p => ({ ...p, telefone: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Cargo / Função</Label>
                      <Input placeholder="Ex: Professora de Educação Infantil" value={perfil.cargo || ''} onChange={e => setPerfil(p => ({ ...p, cargo: e.target.value }))} />
                    </div>
                  </div>

                  {perfil.unidade && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-gray-600">Unidade: <span className="font-medium text-gray-800">{perfil.unidade.name}</span></p>
                    </div>
                  )}

                  <Button onClick={salvarPerfil} disabled={saving}>
                    {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar Perfil
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-100">
                <CardHeader><CardTitle className="flex items-center gap-2 text-orange-700"><Key className="h-5 w-5" /> Alterar Senha</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Senha Atual</Label>
                    <div className="relative">
                      <Input type={mostrarSenha ? 'text' : 'password'} value={senhaForm.atual} onChange={e => setSenhaForm(f => ({ ...f, atual: e.target.value }))} />
                      <button onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nova Senha</Label>
                      <Input type="password" placeholder="Mínimo 6 caracteres" value={senhaForm.nova} onChange={e => setSenhaForm(f => ({ ...f, nova: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Confirmar Nova Senha</Label>
                      <Input type="password" value={senhaForm.confirmar} onChange={e => setSenhaForm(f => ({ ...f, confirmar: e.target.value }))} />
                    </div>
                  </div>
                  {senhaForm.nova && senhaForm.confirmar && senhaForm.nova !== senhaForm.confirmar && (
                    <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> As senhas não coincidem</p>
                  )}
                  <Button onClick={alterarSenha} disabled={saving} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
                    {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
                    Alterar Senha
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* ─── UNIDADE ─── */}
          {abaAtiva === 'unidade' && isAdmin && (
            <Card className="border-2 border-green-100">
              <CardHeader><CardTitle className="flex items-center gap-2 text-green-700"><Building2 className="h-5 w-5" /> Dados da Unidade</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome da Unidade</Label>
                    <Input value={unidade.name || ''} onChange={e => setUnidade(u => ({ ...u, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Código da Unidade</Label>
                    <Input value={unidade.unitCode || ''} disabled className="bg-gray-50 cursor-not-allowed" />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input placeholder="(00) 0000-0000" value={unidade.telefone || ''} onChange={e => setUnidade(u => ({ ...u, telefone: e.target.value }))} />
                  </div>
                  <div>
                    <Label>E-mail da Unidade</Label>
                    <Input type="email" value={unidade.email || ''} onChange={e => setUnidade(u => ({ ...u, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Coordenadora</Label>
                    <Input placeholder="Nome da coordenadora" value={unidade.coordenadora || ''} onChange={e => setUnidade(u => ({ ...u, coordenadora: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Horário de Funcionamento</Label>
                    <Input placeholder="Ex: 07h às 18h" value={unidade.horarioFuncionamento || ''} onChange={e => setUnidade(u => ({ ...u, horarioFuncionamento: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Endereço</Label>
                  <Textarea rows={2} value={unidade.endereco || ''} onChange={e => setUnidade(u => ({ ...u, endereco: e.target.value }))} />
                </div>
                <Button onClick={salvarUnidade} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Dados da Unidade
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ─── USUÁRIOS ─── */}
          {abaAtiva === 'usuarios' && isAdmin && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Input placeholder="Buscar usuário..." value={buscaUsuario} onChange={e => setBuscaUsuario(e.target.value)} className="flex-1" />
                <Button onClick={() => setShowNovoUsuario(!showNovoUsuario)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Novo Usuário
                </Button>
              </div>

              {/* Formulário novo usuário */}
              {showNovoUsuario && (
                <Card className="border-2 border-blue-100 bg-blue-50">
                  <CardHeader><CardTitle className="text-blue-700 text-base flex items-center gap-2"><UserCheck className="h-5 w-5" /> Criar Novo Usuário</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Nome Completo *</Label>
                        <Input value={novoUsuario.nome} onChange={e => setNovoUsuario(f => ({ ...f, nome: e.target.value }))} />
                      </div>
                      <div>
                        <Label>E-mail *</Label>
                        <Input type="email" value={novoUsuario.email} onChange={e => setNovoUsuario(f => ({ ...f, email: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Perfil *</Label>
                        <select className="w-full px-3 py-2 border rounded-lg text-sm" value={novoUsuario.role} onChange={e => setNovoUsuario(f => ({ ...f, role: e.target.value }))}>
                          {Object.entries(ROLES_LABELS).filter(([r]) => r !== 'DEVELOPER').map(([role, label]) => (
                            <option key={role} value={role}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Senha Inicial *</Label>
                        <Input type="password" placeholder="Mínimo 6 caracteres" value={novoUsuario.senha} onChange={e => setNovoUsuario(f => ({ ...f, senha: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={criarUsuario} disabled={saving} size="sm">
                        {saving ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                        Criar Usuário
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowNovoUsuario(false)}>Cancelar</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lista de usuários */}
              <div className="space-y-2">
                {usuariosFiltrados.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <Users className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-400">Nenhum usuário encontrado</p>
                  </div>
                )}
                {usuariosFiltrados.map(u => (
                  <Card key={u.id} className={`border-2 transition-all ${u.ativo ? 'border-gray-100 hover:border-gray-200' : 'border-gray-100 opacity-60'}`}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-800 text-sm">{u.nome}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLES_COR[u.role] || 'bg-gray-100 text-gray-600'}`}>
                              {ROLES_LABELS[u.role] || u.role}
                            </span>
                            {!u.ativo && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600">Inativo</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                          {u.unidade && <p className="text-xs text-gray-400">{u.unidade.name}</p>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => toggleUsuario(u.id, u.ativo)}
                            className={`p-2 rounded-lg transition-all ${u.ativo ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-500 hover:bg-green-100'}`}
                            title={u.ativo ? 'Desativar usuário' : 'Ativar usuário'}>
                            {u.ativo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ─── NOTIFICAÇÕES ─── */}
          {abaAtiva === 'notificacoes' && (
            <Card className="border-2 border-yellow-100">
              <CardHeader><CardTitle className="flex items-center gap-2 text-yellow-700"><Bell className="h-5 w-5" /> Preferências de Notificação</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">Configure quais notificações você deseja receber por e-mail e push</p>

                {[
                  { key: 'emailPlanejamentos', label: 'Planejamentos pendentes', desc: 'Lembrete semanal para criar planejamentos' },
                  { key: 'emailDiarios', label: 'Diário de Bordo', desc: 'Lembrete diário para registrar o dia' },
                  { key: 'emailRequisicoes', label: 'Requisições de materiais', desc: 'Atualizações sobre pedidos de materiais' },
                  { key: 'emailRdic', label: 'RDIC', desc: 'Lembretes de registros de desenvolvimento da criança' },
                  { key: 'pushAtivado', label: 'Notificações push', desc: 'Notificações em tempo real no navegador' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifs(n => ({ ...n, [item.key]: !n[item.key as keyof typeof n] }))}
                      className={`relative w-12 h-6 rounded-full transition-all ${notifs[item.key as keyof typeof notifs] ? 'bg-blue-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${notifs[item.key as keyof typeof notifs] ? 'left-6' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}

                <Button onClick={() => toast.success('Preferências salvas!')} className="w-full">
                  <Save className="h-4 w-4 mr-2" /> Salvar Preferências
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ─── SISTEMA (apenas DEVELOPER) ─── */}
          {abaAtiva === 'sistema' && isDev && (
            <div className="space-y-4">
              <Card className="border-2 border-red-100">
                <CardHeader><CardTitle className="flex items-center gap-2 text-red-700"><Settings className="h-5 w-5" /> Configurações do Sistema</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">Esta seção é exclusiva para desenvolvedores. Alterações aqui podem afetar todo o sistema.</p>
                  </div>

                  {[
                    { label: 'Versão do Sistema', value: 'Conexa V3.0' },
                    { label: 'Ambiente', value: 'Produção' },
                    { label: 'Banco de Dados', value: 'PostgreSQL (Prisma)' },
                    { label: 'Framework', value: 'React + Vite + TypeScript' },
                    { label: 'API', value: 'Node.js + Fastify' },
                    { label: 'Autenticação', value: 'JWT + Refresh Token' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-600">{item.label}</p>
                      <p className="text-sm font-mono font-medium text-gray-800">{item.value}</p>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-blue-600 border-blue-200">
                      <Download className="h-4 w-4 mr-1" /> Exportar Logs
                    </Button>
                    <Button variant="outline" size="sm" className="text-green-600 border-green-200">
                      <Database className="h-4 w-4 mr-1" /> Backup DB
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
