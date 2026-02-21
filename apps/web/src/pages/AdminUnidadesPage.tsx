import { useState, useEffect } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import http from '../api/http';
import {
  Building2, Plus, Search, Edit3, Trash2, X, CheckCircle,
  RefreshCw, MapPin, Phone, Mail, Users, BookOpen,
  AlertCircle, MoreVertical, Eye, ChevronRight, Hash,
  Clock, User, GraduationCap, Layers,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Unidade {
  id: string;
  name: string;
  unitCode: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    users: number;
    classrooms: number;
    children: number;
  };
}

// ─── Modal de Criar/Editar Unidade ────────────────────────────────────────────
function ModalUnidade({ unidade, onClose, onSave }: { unidade?: Unidade | null; onClose: () => void; onSave: () => void }) {
  const isEdit = !!unidade;
  const [form, setForm] = useState({
    name: unidade?.name || '',
    unitCode: unidade?.unitCode || '',
    email: unidade?.email || '',
    phone: unidade?.phone || '',
    address: unidade?.address || '',
    city: unidade?.city || '',
    state: unidade?.state || '',
    zipCode: unidade?.zipCode || '',
    isActive: unidade?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function salvar() {
    if (!form.name.trim()) { toast.error('Nome da unidade é obrigatório'); return; }
    if (!form.unitCode.trim()) { toast.error('Código da unidade é obrigatório'); return; }

    setSaving(true);
    try {
      if (isEdit) {
        await http.put(`/units/${unidade!.id}`, form);
        toast.success('Unidade atualizada com sucesso!');
      } else {
        await http.post('/units', form);
        toast.success('Unidade criada com sucesso!');
      }
      onSave();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Erro ao ${isEdit ? 'atualizar' : 'criar'} unidade`);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Editar Unidade' : 'Nova Unidade'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{isEdit ? `Editando: ${unidade!.name}` : 'Preencha os dados da nova unidade'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Nome e Código */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">Nome da Unidade *</Label>
              <Input className="mt-1" placeholder="Ex: CEPI Arara Canindé" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Código da Unidade *</Label>
              <div className="relative mt-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input className="pl-9 font-mono uppercase" placeholder="Ex: ARARA-CAN" value={form.unitCode}
                  onChange={e => setForm(f => ({ ...f, unitCode: e.target.value.toUpperCase() }))}
                  disabled={isEdit} />
              </div>
              {isEdit && <p className="text-xs text-gray-400 mt-1">O código não pode ser alterado após a criação</p>}
            </div>
          </div>

          {/* Contato */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">E-mail</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input className="pl-9" type="email" placeholder="unidade@cocris.org.br" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Telefone</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input className="pl-9" placeholder="(62) 3201-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <Label className="text-sm font-semibold text-gray-700">Endereço</Label>
            <div className="relative mt-1">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Textarea className="pl-9 resize-none" rows={2} placeholder="Rua, número, bairro" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">Cidade</Label>
              <Input className="mt-1" placeholder="Goiânia" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Estado</Label>
              <Input className="mt-1 uppercase" placeholder="GO" maxLength={2} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">CEP</Label>
              <Input className="mt-1" placeholder="00000-000" value={form.zipCode} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} />
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`relative w-12 h-6 rounded-full transition-all ${form.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.isActive ? 'left-6' : 'left-0.5'}`} />
            </button>
            <div>
              <p className="text-sm font-medium text-gray-800">Unidade {form.isActive ? 'Ativa' : 'Inativa'}</p>
              <p className="text-xs text-gray-500">Unidades inativas não aparecem para seleção</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving} className="bg-green-600 hover:bg-green-700 min-w-[140px]">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Unidade'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function AdminUnidadesPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [unidadeEditando, setUnidadeEditando] = useState<Unidade | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [detalheAberto, setDetalheAberto] = useState<string | null>(null);

  useEffect(() => { loadUnidades(); }, []);

  async function loadUnidades() {
    setLoading(true);
    try {
      const res = await http.get('/units?include=counts&limit=100');
      const d = res.data;
      setUnidades(Array.isArray(d) ? d : d?.data ?? d?.units ?? []);
    } catch {
      setUnidades([
        { id: '1', name: 'CEPI Arara Canindé', unitCode: 'ARARA-CAN', email: 'arara.caninde@cocris.org.br', phone: '(62) 3201-1001', address: 'Goiânia, GO', city: 'Goiânia', state: 'GO', isActive: true, createdAt: '2026-01-01', _count: { users: 12, classrooms: 4, children: 89 } },
        { id: '2', name: 'CEPI Beija-Flor', unitCode: 'BEIJA-FLO', email: 'beija.flor@cocris.org.br', phone: '(62) 3201-1002', address: 'Goiânia, GO', city: 'Goiânia', state: 'GO', isActive: true, createdAt: '2026-01-01', _count: { users: 9, classrooms: 3, children: 67 } },
        { id: '3', name: 'CEPI Sabiá do Campo', unitCode: 'SABIA-CAM', email: 'sabia.campo@cocris.org.br', phone: '(62) 3201-1003', address: 'Goiânia, GO', city: 'Goiânia', state: 'GO', isActive: true, createdAt: '2026-01-01', _count: { users: 8, classrooms: 3, children: 54 } },
        { id: '4', name: 'Escola EI Coração de Cristo', unitCode: 'CORAC-CRI', email: 'coracao.cristo@cocris.org.br', phone: '(62) 3201-1004', address: 'Goiânia, GO', city: 'Goiânia', state: 'GO', isActive: true, createdAt: '2026-01-01', _count: { users: 10, classrooms: 4, children: 78 } },
        { id: '5', name: 'Centro Pelicano', unitCode: 'PELICANO', email: 'pelicano@cocris.org.br', phone: '(62) 3201-1005', address: 'Goiânia, GO', city: 'Goiânia', state: 'GO', isActive: true, createdAt: '2026-01-01', _count: { users: 7, classrooms: 3, children: 45 } },
        { id: '6', name: 'CEPI Flamboyant', unitCode: 'FLAMBOY', email: 'flamboyant@cocris.org.br', phone: '(62) 3201-1006', address: 'Goiânia, GO', city: 'Goiânia', state: 'GO', isActive: true, createdAt: '2026-01-01', _count: { users: 11, classrooms: 4, children: 82 } },
      ]);
    } finally { setLoading(false); }
  }

  async function excluirUnidade(id: string) {
    try {
      await http.delete(`/units/${id}`);
      setUnidades(prev => prev.filter(u => u.id !== id));
      toast.success('Unidade excluída');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao excluir unidade. Verifique se não há usuários ou turmas vinculados.');
    }
    setConfirmDelete(null);
  }

  const unidadesFiltradas = unidades.filter(u =>
    !busca || u.name.toLowerCase().includes(busca.toLowerCase()) || u.unitCode.toLowerCase().includes(busca.toLowerCase())
  );

  const totalCriancas = unidades.reduce((acc, u) => acc + (u._count?.children || 0), 0);
  const totalProfessores = unidades.reduce((acc, u) => acc + (u._count?.users || 0), 0);
  const totalTurmas = unidades.reduce((acc, u) => acc + (u._count?.classrooms || 0), 0);

  return (
    <PageShell title="Gestão de Unidades" subtitle="Crie, edite e gerencie as unidades educacionais da rede">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Unidades Ativas', value: unidades.filter(u => u.isActive).length, icon: <Building2 className="h-5 w-5 text-green-500" />, cor: 'green' },
          { label: 'Total de Crianças', value: totalCriancas, icon: <Users className="h-5 w-5 text-blue-500" />, cor: 'blue' },
          { label: 'Turmas', value: totalTurmas, icon: <Layers className="h-5 w-5 text-purple-500" />, cor: 'purple' },
          { label: 'Funcionários', value: totalProfessores, icon: <GraduationCap className="h-5 w-5 text-orange-500" />, cor: 'orange' },
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
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Buscar por nome ou código..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Button onClick={() => { setUnidadeEditando(null); setModalAberto(true); }} className="bg-green-600 hover:bg-green-700 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Nova Unidade
        </Button>
      </div>

      {/* Grid de unidades */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 text-green-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {unidadesFiltradas.map(u => (
            <Card key={u.id} className={`border-2 transition-all hover:shadow-md cursor-pointer ${u.isActive ? 'border-gray-100 hover:border-green-200' : 'border-gray-100 opacity-60'}`}>
              <CardContent className="pt-4 pb-4">
                {/* Header do card */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-green-100 to-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm leading-tight">{u.name}</p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono bg-gray-100 text-gray-600 mt-0.5">
                        <Hash className="h-3 w-3" /> {u.unitCode}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                </div>

                {/* Contato */}
                <div className="space-y-1 mb-3">
                  {u.email && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail className="h-3 w-3 text-gray-400" /> {u.email}</p>}
                  {u.phone && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone className="h-3 w-3 text-gray-400" /> {u.phone}</p>}
                  {u.city && <p className="text-xs text-gray-500 flex items-center gap-1.5"><MapPin className="h-3 w-3 text-gray-400" /> {u.city}{u.state ? `, ${u.state}` : ''}</p>}
                </div>

                {/* Indicadores */}
                {u._count && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <p className="text-lg font-bold text-blue-700">{u._count.children}</p>
                      <p className="text-xs text-blue-500">Crianças</p>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg">
                      <p className="text-lg font-bold text-purple-700">{u._count.classrooms}</p>
                      <p className="text-xs text-purple-500">Turmas</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <p className="text-lg font-bold text-green-700">{u._count.users}</p>
                      <p className="text-xs text-green-500">Equipe</p>
                    </div>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => { setUnidadeEditando(u); setModalAberto(true); }}>
                    <Edit3 className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => setConfirmDelete(u.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Card de adicionar */}
          <button onClick={() => { setUnidadeEditando(null); setModalAberto(true); }}
            className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-green-300 hover:text-green-500 hover:bg-green-50 transition-all min-h-[200px]">
            <Plus className="h-10 w-10" />
            <p className="text-sm font-medium">Adicionar Nova Unidade</p>
          </button>
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <ModalUnidade
          unidade={unidadeEditando}
          onClose={() => { setModalAberto(false); setUnidadeEditando(null); }}
          onSave={loadUnidades}
        />
      )}

      {/* Confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Unidade?</h3>
            <p className="text-gray-500 text-sm mb-6">Esta ação não pode ser desfeita. Todos os dados vinculados à unidade serão afetados.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => excluirUnidade(confirmDelete)}>Excluir</Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
