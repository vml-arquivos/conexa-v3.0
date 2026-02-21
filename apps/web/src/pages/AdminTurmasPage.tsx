import { useState, useEffect } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import http from '../api/http';
import {
  Layers, Plus, Search, Edit3, Trash2, X, CheckCircle,
  RefreshCw, Users, BookOpen, Building2, GraduationCap,
  AlertCircle, Hash, Baby, Calendar, User,
} from 'lucide-react';

interface Turma {
  id: string;
  name: string;
  code?: string;
  ageGroup: string;
  year: number;
  maxStudents?: number;
  isActive: boolean;
  unit?: { id: string; name: string; unitCode: string };
  teachers?: Array<{ user: { firstName: string; lastName: string } }>;
  _count?: { children: number; teachers: number };
}

interface Unidade { id: string; name: string; unitCode: string; }

const AGE_GROUPS = [
  { value: 'EI01', label: 'EI01 — Bebês (0 a 1a 6m)', cor: 'bg-pink-100 text-pink-700' },
  { value: 'EI02', label: 'EI02 — Crianças Bem Pequenas (1a 7m a 3a 11m)', cor: 'bg-blue-100 text-blue-700' },
  { value: 'EI03', label: 'EI03 — Crianças Pequenas (4 a 5a 11m)', cor: 'bg-green-100 text-green-700' },
];

function ModalTurma({ turma, unidades, onClose, onSave }: { turma?: Turma | null; unidades: Unidade[]; onClose: () => void; onSave: () => void }) {
  const isEdit = !!turma;
  const [form, setForm] = useState({
    name: turma?.name || '',
    code: turma?.code || '',
    ageGroup: turma?.ageGroup || 'EI01',
    year: turma?.year || new Date().getFullYear(),
    maxStudents: turma?.maxStudents || 20,
    unitId: turma?.unit?.id || '',
    isActive: turma?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function salvar() {
    if (!form.name.trim()) { toast.error('Nome da turma é obrigatório'); return; }
    if (!form.unitId) { toast.error('Selecione a unidade'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await http.put(`/classrooms/${turma!.id}`, form);
        toast.success('Turma atualizada!');
      } else {
        await http.post('/classrooms', form);
        toast.success('Turma criada!');
      }
      onSave(); onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar turma');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Editar Turma' : 'Nova Turma'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{isEdit ? `Editando: ${turma!.name}` : 'Configure a nova turma'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">Nome da Turma *</Label>
              <Input className="mt-1" placeholder="Ex: Turma Borboletas" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Código</Label>
              <div className="relative mt-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input className="pl-9 font-mono uppercase" placeholder="Ex: TURMA-A" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700">Faixa Etária / Segmento *</Label>
            <div className="mt-1 grid grid-cols-1 gap-2">
              {AGE_GROUPS.map(ag => (
                <button key={ag.value} onClick={() => setForm(f => ({ ...f, ageGroup: ag.value }))}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${form.ageGroup === ag.value ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
                  <Baby className="h-4 w-4 text-gray-400" />
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ag.cor}`}>{ag.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">Ano Letivo</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input className="pl-9" type="number" min={2020} max={2030} value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Máx. de Alunos</Label>
              <div className="relative mt-1">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input className="pl-9" type="number" min={1} max={50} value={form.maxStudents} onChange={e => setForm(f => ({ ...f, maxStudents: parseInt(e.target.value) }))} />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700">Unidade *</Label>
            <div className="relative mt-1">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.unitId} onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))}>
                <option value="">Selecione a unidade...</option>
                {unidades.map(u => <option key={u.id} value={u.id}>{u.name} ({u.unitCode})</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`relative w-12 h-6 rounded-full transition-all ${form.isActive ? 'bg-blue-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.isActive ? 'left-6' : 'left-0.5'}`} />
            </button>
            <p className="text-sm font-medium text-gray-800">Turma {form.isActive ? 'Ativa' : 'Inativa'}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving} className="bg-purple-600 hover:bg-purple-700 min-w-[130px]">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Turma'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTurmasPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroUnidade, setFiltroUnidade] = useState('');
  const [filtroSegmento, setFiltroSegmento] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [turmaEditando, setTurmaEditando] = useState<Turma | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => { loadDados(); }, []);

  async function loadDados() {
    setLoading(true);
    try {
      const [turmasRes, unitsRes] = await Promise.all([
        http.get('/classrooms?include=counts&limit=200'),
        http.get('/units?limit=100'),
      ]);
      const t = turmasRes.data;
      setTurmas(Array.isArray(t) ? t : t?.data ?? t?.classrooms ?? []);
      const u = unitsRes.data;
      setUnidades(Array.isArray(u) ? u : u?.data ?? u?.units ?? []);
    } catch {
      setTurmas([
        { id: '1', name: 'Turma Borboletas', ageGroup: 'EI01', year: 2026, isActive: true, unit: { id: '1', name: 'CEPI Arara Canindé', unitCode: 'ARARA-CAN' }, _count: { children: 18, teachers: 2 } },
        { id: '2', name: 'Turma Girassóis', ageGroup: 'EI02', year: 2026, isActive: true, unit: { id: '1', name: 'CEPI Arara Canindé', unitCode: 'ARARA-CAN' }, _count: { children: 22, teachers: 1 } },
        { id: '3', name: 'Turma Estrelas', ageGroup: 'EI03', year: 2026, isActive: true, unit: { id: '2', name: 'CEPI Beija-Flor', unitCode: 'BEIJA-FLO' }, _count: { children: 20, teachers: 1 } },
        { id: '4', name: 'Turma Arco-Íris', ageGroup: 'EI02', year: 2026, isActive: true, unit: { id: '2', name: 'CEPI Beija-Flor', unitCode: 'BEIJA-FLO' }, _count: { children: 19, teachers: 2 } },
      ]);
      setUnidades([
        { id: '1', name: 'CEPI Arara Canindé', unitCode: 'ARARA-CAN' },
        { id: '2', name: 'CEPI Beija-Flor', unitCode: 'BEIJA-FLO' },
        { id: '3', name: 'CEPI Sabiá do Campo', unitCode: 'SABIA-CAM' },
      ]);
    } finally { setLoading(false); }
  }

  async function excluirTurma(id: string) {
    try {
      await http.delete(`/classrooms/${id}`);
      setTurmas(prev => prev.filter(t => t.id !== id));
      toast.success('Turma excluída');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao excluir turma');
    }
    setConfirmDelete(null);
  }

  const turmasFiltradas = turmas.filter(t => {
    if (busca && !t.name.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroUnidade && t.unit?.id !== filtroUnidade) return false;
    if (filtroSegmento && t.ageGroup !== filtroSegmento) return false;
    return true;
  });

  return (
    <PageShell title="Gestão de Turmas" subtitle="Crie e gerencie as turmas de todas as unidades">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total de Turmas', value: turmas.length, cor: 'purple' },
          { label: 'Turmas EI01 (Bebês)', value: turmas.filter(t => t.ageGroup === 'EI01').length, cor: 'pink' },
          { label: 'Turmas EI02', value: turmas.filter(t => t.ageGroup === 'EI02').length, cor: 'blue' },
          { label: 'Turmas EI03', value: turmas.filter(t => t.ageGroup === 'EI03').length, cor: 'green' },
        ].map((s, i) => (
          <Card key={i} className="border-2 border-gray-100">
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Buscar turma..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)}>
          <option value="">Todas as unidades</option>
          {unidades.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          value={filtroSegmento} onChange={e => setFiltroSegmento(e.target.value)}>
          <option value="">Todos os segmentos</option>
          {AGE_GROUPS.map(ag => <option key={ag.value} value={ag.value}>{ag.value}</option>)}
        </select>
        <Button onClick={() => { setTurmaEditando(null); setModalAberto(true); }} className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Nova Turma
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><RefreshCw className="h-8 w-8 text-purple-500 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {turmasFiltradas.map(t => {
            const ag = AGE_GROUPS.find(a => a.value === t.ageGroup);
            return (
              <Card key={t.id} className="border-2 border-gray-100 hover:border-purple-200 hover:shadow-md transition-all">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center">
                        <Layers className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                        {ag && <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${ag.cor}`}>{ag.value}</span>}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {t.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>

                  {t.unit && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-3">
                      <Building2 className="h-3 w-3 text-gray-400" /> {t.unit.name}
                    </p>
                  )}

                  {t._count && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="text-center p-2 bg-blue-50 rounded-lg">
                        <p className="text-lg font-bold text-blue-700">{t._count.children}</p>
                        <p className="text-xs text-blue-500">Crianças</p>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded-lg">
                        <p className="text-lg font-bold text-green-700">{t._count.teachers}</p>
                        <p className="text-xs text-green-500">Professores</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => { setTurmaEditando(t); setModalAberto(true); }}>
                      <Edit3 className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-red-500 border-red-200 hover:bg-red-50"
                      onClick={() => setConfirmDelete(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <button onClick={() => { setTurmaEditando(null); setModalAberto(true); }}
            className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-purple-300 hover:text-purple-500 hover:bg-purple-50 transition-all min-h-[180px]">
            <Plus className="h-10 w-10" />
            <p className="text-sm font-medium">Nova Turma</p>
          </button>
        </div>
      )}

      {modalAberto && (
        <ModalTurma turma={turmaEditando} unidades={unidades}
          onClose={() => { setModalAberto(false); setTurmaEditando(null); }}
          onSave={loadDados} />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Turma?</h3>
            <p className="text-gray-500 text-sm mb-6">Esta ação removerá a turma permanentemente.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => excluirTurma(confirmDelete)}>Excluir</Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
