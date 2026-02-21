import { useState, useEffect, useRef } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import http from '../api/http';
import {
  User, Mail, Phone, Lock, Eye, EyeOff, CheckCircle,
  RefreshCw, Camera, Shield, Bell, Palette, Globe,
  Key, AlertCircle, Edit3, Save, X, Building2,
  GraduationCap, Crown, Briefcase, Stethoscope,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  DEVELOPER: 'Desenvolvedor do Sistema',
  MANTENEDORA_ADMIN: 'Administrador — Mantenedora',
  MANTENEDORA_FINANCEIRO: 'Financeiro — Mantenedora',
  STAFF_CENTRAL_PEDAGOGICO: 'Coordenação Pedagógica Geral',
  STAFF_CENTRAL_PSICOLOGIA: 'Psicóloga Central',
  UNIDADE_DIRETOR: 'Diretor(a) de Unidade',
  UNIDADE_COORDENADOR_PEDAGOGICO: 'Coordenação Pedagógica',
  UNIDADE_ADMINISTRATIVO: 'Secretaria / Administrativo',
  UNIDADE_NUTRICIONISTA: 'Nutricionista',
  PROFESSOR: 'Professor(a)',
  PROFESSOR_AUXILIAR: 'Professor(a) Auxiliar',
};

interface Perfil {
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
  roles?: Array<{ roleType: string }>;
  unit?: { name: string; unitCode: string };
}

export default function MeuPerfilPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [editandoDados, setEditandoDados] = useState(false);
  const [editandoSenha, setEditandoSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [formDados, setFormDados] = useState({ firstName: '', lastName: '', phone: '' });
  const [formEmail, setFormEmail] = useState({ email: '', senha: '' });
  const [formSenha, setFormSenha] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });

  useEffect(() => { loadPerfil(); }, []);

  async function loadPerfil() {
    setLoading(true);
    try {
      const res = await http.get('/auth/me');
      const d = res.data;
      setPerfil(d);
      setFormDados({ firstName: d.firstName, lastName: d.lastName, phone: d.phone || '' });
      setFormEmail({ email: d.email, senha: '' });
    } catch {
      const demo: Perfil = {
        id: '1', firstName: 'Maria', lastName: 'Professora', email: 'professor1@unidade1.com',
        phone: '(62) 99999-0001', status: 'ATIVO', emailVerified: true, createdAt: '2026-01-01',
        roles: [{ roleType: 'PROFESSOR' }], unit: { name: 'CEPI Arara Canindé', unitCode: 'ARARA-CAN' },
      };
      setPerfil(demo);
      setFormDados({ firstName: demo.firstName, lastName: demo.lastName, phone: demo.phone || '' });
      setFormEmail({ email: demo.email, senha: '' });
    } finally { setLoading(false); }
  }

  async function salvarDados() {
    if (!formDados.firstName.trim() || !formDados.lastName.trim()) { toast.error('Nome e sobrenome são obrigatórios'); return; }
    setSalvando(true);
    try {
      await http.put('/auth/me', { firstName: formDados.firstName.trim(), lastName: formDados.lastName.trim(), phone: formDados.phone });
      setPerfil(prev => prev ? { ...prev, ...formDados } : prev);
      toast.success('Dados atualizados com sucesso!');
      setEditandoDados(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao atualizar dados');
    } finally { setSalvando(false); }
  }

  async function salvarEmail() {
    if (!formEmail.email.trim()) { toast.error('E-mail é obrigatório'); return; }
    if (!formEmail.senha) { toast.error('Confirme sua senha atual para alterar o e-mail'); return; }
    setSalvando(true);
    try {
      await http.put('/auth/me/email', { email: formEmail.email.trim().toLowerCase(), currentPassword: formEmail.senha });
      setPerfil(prev => prev ? { ...prev, email: formEmail.email, emailVerified: false } : prev);
      toast.success('E-mail atualizado! Verifique sua caixa de entrada.');
      setFormEmail(f => ({ ...f, senha: '' }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao atualizar e-mail');
    } finally { setSalvando(false); }
  }

  async function salvarSenha() {
    if (!formSenha.senhaAtual) { toast.error('Informe a senha atual'); return; }
    if (!formSenha.novaSenha) { toast.error('Informe a nova senha'); return; }
    if (formSenha.novaSenha.length < 6) { toast.error('Nova senha deve ter pelo menos 6 caracteres'); return; }
    if (formSenha.novaSenha !== formSenha.confirmar) { toast.error('As senhas não coincidem'); return; }
    setSalvando(true);
    try {
      await http.put('/auth/me/password', { currentPassword: formSenha.senhaAtual, newPassword: formSenha.novaSenha });
      toast.success('Senha alterada com sucesso!');
      setFormSenha({ senhaAtual: '', novaSenha: '', confirmar: '' });
      setEditandoSenha(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Senha atual incorreta');
    } finally { setSalvando(false); }
  }

  if (loading) return (
    <PageShell title="Meu Perfil">
      <div className="flex items-center justify-center py-20"><RefreshCw className="h-8 w-8 text-blue-500 animate-spin" /></div>
    </PageShell>
  );

  if (!perfil) return null;

  const roleAtual = perfil.roles?.[0]?.roleType || '';
  const iniciais = `${perfil.firstName[0]}${perfil.lastName[0]}`.toUpperCase();

  return (
    <PageShell title="Meu Perfil" subtitle="Gerencie suas informações pessoais e configurações de acesso">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Card de identidade */}
        <Card className="border-2 border-gray-100 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          <CardContent className="pt-0 pb-5">
            <div className="flex items-end gap-4 -mt-10 mb-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-blue-600 bg-gradient-to-br from-blue-100 to-purple-100">
                  {iniciais}
                </div>
                <button onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white hover:bg-blue-600 shadow-md">
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" />
              </div>
              <div className="flex-1 pb-1">
                <h2 className="text-xl font-bold text-gray-900">{perfil.firstName} {perfil.lastName}</h2>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {roleAtual && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      <GraduationCap className="h-3 w-3" /> {ROLE_LABELS[roleAtual] || roleAtual}
                    </span>
                  )}
                  {perfil.unit && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <Building2 className="h-3 w-3" /> {perfil.unit.name}
                    </span>
                  )}
                  {perfil.emailVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      <CheckCircle className="h-3 w-3" /> E-mail verificado
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-500"><Mail className="h-4 w-4" /> {perfil.email}</div>
              {perfil.phone && <div className="flex items-center gap-2 text-gray-500"><Phone className="h-4 w-4" /> {perfil.phone}</div>}
              {perfil.lastLogin && <div className="flex items-center gap-2 text-gray-500"><Shield className="h-4 w-4" /> Último acesso: {new Date(perfil.lastLogin).toLocaleDateString('pt-BR')}</div>}
              <div className="flex items-center gap-2 text-gray-500"><User className="h-4 w-4" /> Membro desde {new Date(perfil.createdAt).toLocaleDateString('pt-BR')}</div>
            </div>
          </CardContent>
        </Card>

        {/* Dados Pessoais */}
        <Card className="border-2 border-gray-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-blue-500" /> Dados Pessoais</CardTitle>
              {!editandoDados && (
                <Button size="sm" variant="outline" onClick={() => setEditandoDados(true)} className="h-8 text-xs">
                  <Edit3 className="h-3 w-3 mr-1" /> Editar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editandoDados ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Nome</Label>
                    <Input className="mt-1" value={formDados.firstName} onChange={e => setFormDados(f => ({ ...f, firstName: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Sobrenome</Label>
                    <Input className="mt-1" value={formDados.lastName} onChange={e => setFormDados(f => ({ ...f, lastName: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Telefone</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input className="pl-9" placeholder="(00) 00000-0000" value={formDados.phone} onChange={e => setFormDados(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditandoDados(false)} className="flex items-center gap-1"><X className="h-3 w-3" /> Cancelar</Button>
                  <Button size="sm" onClick={salvarDados} disabled={salvando} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1">
                    {salvando ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Salvar
                  </Button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500 text-xs">Nome</p><p className="font-medium text-gray-900">{perfil.firstName}</p></div>
                <div><p className="text-gray-500 text-xs">Sobrenome</p><p className="font-medium text-gray-900">{perfil.lastName}</p></div>
                <div><p className="text-gray-500 text-xs">Telefone</p><p className="font-medium text-gray-900">{perfil.phone || '—'}</p></div>
                <div><p className="text-gray-500 text-xs">CPF</p><p className="font-medium text-gray-900">{perfil.cpf || '—'}</p></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* E-mail */}
        <Card className="border-2 border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-green-500" /> Endereço de E-mail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">E-mail atual</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input className="pl-9" type="email" value={formEmail.email} onChange={e => setFormEmail(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            {formEmail.email !== perfil.email && (
              <div>
                <Label className="text-sm font-semibold text-gray-700">Confirme sua senha para alterar o e-mail</Label>
                <div className="relative mt-1">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input className="pl-9" type="password" placeholder="Sua senha atual" value={formEmail.senha} onChange={e => setFormEmail(f => ({ ...f, senha: e.target.value }))} />
                </div>
                <Button size="sm" onClick={salvarEmail} disabled={salvando} className="mt-2 bg-green-600 hover:bg-green-700">
                  {salvando ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />} Salvar Novo E-mail
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Senha */}
        <Card className="border-2 border-gray-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4 text-orange-500" /> Segurança — Senha</CardTitle>
              {!editandoSenha && (
                <Button size="sm" variant="outline" onClick={() => setEditandoSenha(true)} className="h-8 text-xs">
                  <Key className="h-3 w-3 mr-1" /> Alterar Senha
                </Button>
              )}
            </div>
          </CardHeader>
          {editandoSenha && (
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">Senha Atual</Label>
                <div className="relative mt-1">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input className="pl-9 pr-9" type={mostrarSenha ? 'text' : 'password'} placeholder="Sua senha atual" value={formSenha.senhaAtual} onChange={e => setFormSenha(f => ({ ...f, senhaAtual: e.target.value }))} />
                  <button onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Nova Senha</Label>
                  <Input className="mt-1" type="password" placeholder="Mínimo 6 caracteres" value={formSenha.novaSenha} onChange={e => setFormSenha(f => ({ ...f, novaSenha: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Confirmar Nova Senha</Label>
                  <Input className="mt-1" type="password" placeholder="Repita a nova senha" value={formSenha.confirmar} onChange={e => setFormSenha(f => ({ ...f, confirmar: e.target.value }))} />
                  {formSenha.novaSenha && formSenha.confirmar && formSenha.novaSenha !== formSenha.confirmar && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Senhas não coincidem</p>
                  )}
                </div>
              </div>

              {/* Indicador de força */}
              {formSenha.novaSenha && (
                <div>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4].map(n => (
                      <div key={n} className={`h-1.5 flex-1 rounded-full transition-all ${
                        formSenha.novaSenha.length >= n * 3
                          ? n <= 1 ? 'bg-red-400' : n <= 2 ? 'bg-yellow-400' : n <= 3 ? 'bg-blue-400' : 'bg-green-500'
                          : 'bg-gray-200'
                      }`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formSenha.novaSenha.length < 6 ? 'Muito curta' : formSenha.novaSenha.length < 9 ? 'Fraca' : formSenha.novaSenha.length < 12 ? 'Média' : 'Forte'}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditandoSenha(false); setFormSenha({ senhaAtual: '', novaSenha: '', confirmar: '' }); }}>
                  <X className="h-3 w-3 mr-1" /> Cancelar
                </Button>
                <Button size="sm" onClick={salvarSenha} disabled={salvando} className="bg-orange-600 hover:bg-orange-700">
                  {salvando ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />} Salvar Nova Senha
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Informações do sistema */}
        <Card className="border-2 border-gray-100 bg-gray-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Informações do Sistema</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-400">ID do usuário</p><p className="font-mono text-xs text-gray-600">{perfil.id}</p></div>
              <div><p className="text-xs text-gray-400">Status</p><p className="text-green-600 font-medium text-xs">{perfil.status}</p></div>
              <div><p className="text-xs text-gray-400">Perfil de acesso</p><p className="text-gray-700 text-xs">{ROLE_LABELS[roleAtual] || roleAtual}</p></div>
              <div><p className="text-xs text-gray-400">Unidade</p><p className="text-gray-700 text-xs">{perfil.unit?.name || 'Acesso global'}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
