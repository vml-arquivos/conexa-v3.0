import { useState, useEffect } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { toast } from 'sonner';
import http from '../api/http';
import {
  BookOpen, Plus, Save, Calendar, ChevronDown, ChevronUp,
  Heart, Smile, Cloud, Sun, CloudRain, Star, Zap, RefreshCw,
  CheckCircle, Users, MessageCircle, Lightbulb, Target,
  Clock, Edit3, Sparkles, Music, Palette, Activity,
  UserCircle, Search, Filter,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface DiaryEntry {
  id: string;
  date: string;
  climaEmocional: string;
  microgestos: Microgesto[];
  rotina: RotinaItem[];
  momentoDestaque: string;
  reflexaoPedagogica: string;
  encaminhamentos: string;
  presencas: number;
  ausencias: number;
  status: string;
  createdAt: string;
}

interface Microgesto {
  id: string;
  tipo: string;
  descricao: string;
  criancaId?: string;
  criancaNome?: string;
  campo: string;
  horario?: string;
}

interface RotinaItem {
  momento: string;
  descricao: string;
  observacao?: string;
  concluido: boolean;
}

// ─── Microgestos Pedagógicos ──────────────────────────────────────────────────
const TIPOS_MICROGESTO = [
  { id: 'ESCUTA', label: 'Escuta Ativa', emoji: '👂', cor: 'blue', desc: 'Momento de escuta sensível e acolhimento da fala da criança' },
  { id: 'MEDIACAO', label: 'Mediação', emoji: '🤝', cor: 'purple', desc: 'Intervenção pedagógica que amplia a experiência da criança' },
  { id: 'PROVOCACAO', label: 'Provocação', emoji: '💡', cor: 'yellow', desc: 'Questionamento ou situação que instiga curiosidade e pensamento' },
  { id: 'ACOLHIMENTO', label: 'Acolhimento', emoji: '💚', cor: 'green', desc: 'Gesto de cuidado, afeto e suporte emocional' },
  { id: 'OBSERVACAO', label: 'Observação', emoji: '👁️', cor: 'indigo', desc: 'Registro de comportamento, aprendizagem ou interação observada' },
  { id: 'ENCORAJAMENTO', label: 'Encorajamento', emoji: '⭐', cor: 'orange', desc: 'Incentivo à autonomia, persistência e autoconfiança' },
  { id: 'DOCUMENTACAO', label: 'Documentação', emoji: '📸', cor: 'pink', desc: 'Registro fotográfico ou escrito de momento significativo' },
  { id: 'INTENCIONALIDADE', label: 'Intencionalidade', emoji: '🎯', cor: 'red', desc: 'Ação pedagógica intencional vinculada ao planejamento' },
];

// ─── Clima Emocional da Turma ─────────────────────────────────────────────────
const CLIMAS = [
  { id: 'MUITO_BOM', label: 'Muito Bom', emoji: '☀️', cor: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { id: 'BOM', label: 'Bom', emoji: '🌤️', cor: 'bg-green-100 text-green-700 border-green-300' },
  { id: 'REGULAR', label: 'Regular', emoji: '⛅', cor: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'AGITADO', label: 'Agitado', emoji: '🌩️', cor: 'bg-orange-100 text-orange-700 border-orange-300' },
  { id: 'DIFICIL', label: 'Difícil', emoji: '🌧️', cor: 'bg-gray-100 text-gray-600 border-gray-300' },
];

// ─── Rotina Padrão da Educação Infantil ──────────────────────────────────────
const ROTINA_PADRAO = [
  { momento: 'Acolhida', descricao: 'Recepção das crianças, roda de conversa inicial', concluido: false },
  { momento: 'Roda de Conversa', descricao: 'Calendário, tempo, novidades, planejamento do dia', concluido: false },
  { momento: 'Atividade Dirigida', descricao: 'Atividade pedagógica intencional', concluido: false },
  { momento: 'Brincadeira Livre', descricao: 'Exploração autônoma de brinquedos e espaços', concluido: false },
  { momento: 'Higiene', descricao: 'Lavagem das mãos, troca de fraldas/banheiro', concluido: false },
  { momento: 'Refeição', descricao: 'Lanche ou almoço com autonomia e socialização', concluido: false },
  { momento: 'Repouso', descricao: 'Momento de descanso e relaxamento', concluido: false },
  { momento: 'Atividade Complementar', descricao: 'Arte, música, movimento ou exploração externa', concluido: false },
  { momento: 'Roda de Encerramento', descricao: 'Revisão do dia, combinados, despedida', concluido: false },
];

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function DiarioBordoPage() {
  const [aba, setAba] = useState<'lista' | 'novo' | 'microgestos'>('lista');
  const [diarios, setDiarios] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  // Formulário do Diário
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    climaEmocional: 'BOM',
    momentoDestaque: '',
    reflexaoPedagogica: '',
    encaminhamentos: '',
    presencas: 0,
    ausencias: 0,
    rotina: ROTINA_PADRAO.map(r => ({ ...r })),
    microgestos: [] as Microgesto[],
  });

  // Formulário de microgesto
  const [microgestoForm, setMicrogestoForm] = useState({
    tipo: 'ESCUTA',
    descricao: '',
    campo: 'eu-outro-nos',
    horario: '',
    criancaNome: '',
  });

  useEffect(() => { loadDiarios(); }, []);

  async function loadDiarios() {
    setLoading(true);
    try {
      const res = await http.get('/diary-events?limit=30&category=DIARIO');
      const d = res.data;
      setDiarios(Array.isArray(d) ? d : d?.data ?? []);
    } catch {
      // silencioso — pode não ter registros ainda
    } finally {
      setLoading(false);
    }
  }

  function adicionarMicrogesto() {
    if (!microgestoForm.descricao.trim()) { toast.error('Descreva o microgesto'); return; }
    const novo: Microgesto = {
      id: Date.now().toString(),
      tipo: microgestoForm.tipo,
      descricao: microgestoForm.descricao,
      campo: microgestoForm.campo,
      horario: microgestoForm.horario,
      criancaNome: microgestoForm.criancaNome,
    };
    setForm(f => ({ ...f, microgestos: [...f.microgestos, novo] }));
    setMicrogestoForm({ tipo: 'ESCUTA', descricao: '', campo: 'eu-outro-nos', horario: '', criancaNome: '' });
    toast.success('Microgesto adicionado');
  }

  function removerMicrogesto(id: string) {
    setForm(f => ({ ...f, microgestos: f.microgestos.filter(m => m.id !== id) }));
  }

  function toggleRotinaItem(idx: number) {
    setForm(f => ({
      ...f,
      rotina: f.rotina.map((r, i) => i === idx ? { ...r, concluido: !r.concluido } : r),
    }));
  }

  async function salvarDiario() {
    if (!form.momentoDestaque.trim() && !form.reflexaoPedagogica.trim()) {
      toast.error('Preencha pelo menos o Momento de Destaque ou a Reflexão Pedagógica');
      return;
    }
    setSaving(true);
    try {
      await http.post('/diary-events', {
        date: form.date,
        category: 'DIARIO',
        climaEmocional: form.climaEmocional,
        momentoDestaque: form.momentoDestaque,
        reflexaoPedagogica: form.reflexaoPedagogica,
        encaminhamentos: form.encaminhamentos,
        presencas: form.presencas,
        ausencias: form.ausencias,
        rotina: form.rotina,
        microgestos: form.microgestos,
        description: form.momentoDestaque || form.reflexaoPedagogica,
        type: 'DIARIO_BORDO',
      });
      toast.success('Diário de Bordo salvo!');
      setAba('lista');
      loadDiarios();
      setForm({
        date: new Date().toISOString().split('T')[0],
        climaEmocional: 'BOM',
        momentoDestaque: '',
        reflexaoPedagogica: '',
        encaminhamentos: '',
        presencas: 0,
        ausencias: 0,
        rotina: ROTINA_PADRAO.map(r => ({ ...r })),
        microgestos: [],
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar diário');
    } finally {
      setSaving(false);
    }
  }

  const diariosFiltrados = diarios.filter(d => {
    if (busca && !new Date(d.date || d.createdAt).toLocaleDateString('pt-BR').includes(busca) && !(d.momentoDestaque || '').toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <PageShell title="Diário de Bordo" subtitle="Registre o dia pedagógico, microgestos e reflexões sobre a prática docente">
      {/* Abas */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
        {[
          { id: 'lista', label: 'Meus Diários', icon: <BookOpen className="h-4 w-4" /> },
          { id: 'novo', label: 'Novo Registro', icon: <Plus className="h-4 w-4" /> },
          { id: 'microgestos', label: 'O que são Microgestos?', icon: <Sparkles className="h-4 w-4" /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setAba(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${aba === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── LISTA DE DIÁRIOS ─── */}
      {aba === 'lista' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar por data ou conteúdo..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <Button onClick={() => setAba('novo')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Novo Diário
            </Button>
          </div>

          {loading && <LoadingState message="Carregando diários..." />}

          {!loading && diariosFiltrados.length === 0 && (
            <EmptyState
              icon={<BookOpen className="h-12 w-12 text-gray-300" />}
              title="Nenhum diário registrado"
              description="Comece registrando o dia pedagógico de hoje"
              action={<Button onClick={() => setAba('novo')}><Plus className="h-4 w-4 mr-2" />Criar Diário</Button>}
            />
          )}

          <div className="space-y-3">
            {diariosFiltrados.map(diario => {
              const clima = CLIMAS.find(c => c.id === diario.climaEmocional) || CLIMAS[1];
              const isExpanded = expandedId === diario.id;
              return (
                <Card key={diario.id} className="border-2 hover:border-blue-200 transition-all">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${clima.cor}`}>
                            {clima.emoji} {clima.label}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(diario.date || diario.createdAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                          </span>
                          {diario.microgestos?.length > 0 && (
                            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                              {diario.microgestos.length} microgestos
                            </span>
                          )}
                        </div>
                        {diario.momentoDestaque && (
                          <p className="text-sm text-gray-700 line-clamp-2 mt-1">
                            <span className="font-medium">Destaque: </span>{diario.momentoDestaque}
                          </p>
                        )}
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          {diario.presencas > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3 text-green-500" />{diario.presencas} presentes</span>}
                          {diario.ausencias > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3 text-red-400" />{diario.ausencias} ausentes</span>}
                        </div>
                      </div>
                      <button onClick={() => setExpandedId(isExpanded ? null : diario.id)} className="text-gray-400 hover:text-gray-600 p-1">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        {diario.rotina?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Rotina do Dia</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {diario.rotina.map((r: any, i: number) => (
                                <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${r.concluido ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                                  <CheckCircle className={`h-3.5 w-3.5 flex-shrink-0 ${r.concluido ? 'text-green-500' : 'text-gray-300'}`} />
                                  {r.momento}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {diario.microgestos?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Microgestos Pedagógicos</p>
                            <div className="space-y-2">
                              {diario.microgestos.map((m: any, i: number) => {
                                const tipo = TIPOS_MICROGESTO.find(t => t.id === m.tipo);
                                return (
                                  <div key={i} className="flex items-start gap-2 p-2 bg-purple-50 rounded-lg">
                                    <span className="text-base flex-shrink-0">{tipo?.emoji || '✨'}</span>
                                    <div>
                                      <p className="text-xs font-medium text-purple-700">{tipo?.label || m.tipo}</p>
                                      <p className="text-xs text-gray-600">{m.descricao}</p>
                                      {m.criancaNome && <p className="text-xs text-gray-400 mt-0.5">👤 {m.criancaNome}</p>}
                                    </div>
                                    {m.horario && <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{m.horario}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {diario.reflexaoPedagogica && (
                          <div className="bg-indigo-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-indigo-500 uppercase mb-1">Reflexão Pedagógica</p>
                            <p className="text-sm text-indigo-700">{diario.reflexaoPedagogica}</p>
                          </div>
                        )}
                        {diario.encaminhamentos && (
                          <div className="bg-orange-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-orange-500 uppercase mb-1">Encaminhamentos</p>
                            <p className="text-sm text-orange-700">{diario.encaminhamentos}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── NOVO DIÁRIO ─── */}
      {aba === 'novo' && (
        <div className="space-y-6 max-w-3xl">
          {/* Cabeçalho */}
          <Card className="border-2 border-blue-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-blue-700"><Calendar className="h-5 w-5" /> Informações do Dia</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <Label>Presenças</Label>
                  <Input type="number" min={0} value={form.presencas} onChange={e => setForm(f => ({ ...f, presencas: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Ausências</Label>
                  <Input type="number" min={0} value={form.ausencias} onChange={e => setForm(f => ({ ...f, ausencias: Number(e.target.value) }))} />
                </div>
              </div>

              <div>
                <Label>Clima Emocional da Turma</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {CLIMAS.map(clima => (
                    <button key={clima.id} onClick={() => setForm(f => ({ ...f, climaEmocional: clima.id }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${form.climaEmocional === clima.id ? clima.cor + ' border-current shadow-sm' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {clima.emoji} {clima.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rotina */}
          <Card className="border-2 border-green-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-green-700"><Clock className="h-5 w-5" /> Rotina do Dia</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-3">Marque os momentos da rotina que foram realizados hoje</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {form.rotina.map((item, idx) => (
                  <button key={idx} onClick={() => toggleRotinaItem(idx)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${item.concluido ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <CheckCircle className={`h-5 w-5 flex-shrink-0 ${item.concluido ? 'text-green-500' : 'text-gray-300'}`} />
                    <div>
                      <p className={`text-sm font-medium ${item.concluido ? 'text-green-700' : 'text-gray-700'}`}>{item.momento}</p>
                      <p className="text-xs text-gray-400">{item.descricao}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Microgestos */}
          <Card className="border-2 border-purple-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-purple-700"><Sparkles className="h-5 w-5" /> Microgestos Pedagógicos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">Registre as pequenas ações pedagógicas intencionais que você realizou ao longo do dia</p>

              {/* Formulário de microgesto */}
              <div className="bg-purple-50 rounded-xl p-4 space-y-3">
                <div>
                  <Label>Tipo de Microgesto</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    {TIPOS_MICROGESTO.map(tipo => (
                      <button key={tipo.id} onClick={() => setMicrogestoForm(f => ({ ...f, tipo: tipo.id }))}
                        className={`p-2 rounded-lg border-2 text-center transition-all ${microgestoForm.tipo === tipo.id ? 'border-purple-400 bg-white shadow-sm' : 'border-transparent bg-white/50 hover:bg-white'}`}>
                        <span className="text-lg block">{tipo.emoji}</span>
                        <span className="text-xs font-medium text-gray-700">{tipo.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Horário (opcional)</Label>
                    <Input type="time" value={microgestoForm.horario} onChange={e => setMicrogestoForm(f => ({ ...f, horario: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Criança envolvida (opcional)</Label>
                    <Input placeholder="Nome da criança..." value={microgestoForm.criancaNome} onChange={e => setMicrogestoForm(f => ({ ...f, criancaNome: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Descrição do Microgesto *</Label>
                  <Textarea placeholder="Descreva a ação pedagógica: o que você fez, como a criança respondeu, qual foi o impacto..." rows={2} value={microgestoForm.descricao} onChange={e => setMicrogestoForm(f => ({ ...f, descricao: e.target.value }))} />
                </div>
                <Button onClick={adicionarMicrogesto} variant="outline" className="w-full border-purple-300 text-purple-700 hover:bg-purple-100">
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Microgesto
                </Button>
              </div>

              {/* Lista de microgestos adicionados */}
              {form.microgestos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase">{form.microgestos.length} microgesto(s) registrado(s)</p>
                  {form.microgestos.map(m => {
                    const tipo = TIPOS_MICROGESTO.find(t => t.id === m.tipo);
                    return (
                      <div key={m.id} className="flex items-start gap-3 p-3 bg-white border border-purple-200 rounded-xl">
                        <span className="text-xl flex-shrink-0">{tipo?.emoji || '✨'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-purple-700">{tipo?.label}</p>
                          <p className="text-sm text-gray-700">{m.descricao}</p>
                          {m.criancaNome && <p className="text-xs text-gray-400 mt-0.5">👤 {m.criancaNome}</p>}
                        </div>
                        {m.horario && <span className="text-xs text-gray-400 flex-shrink-0">{m.horario}</span>}
                        <button onClick={() => removerMicrogesto(m.id)} className="text-gray-300 hover:text-red-400 flex-shrink-0">×</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reflexão */}
          <Card className="border-2 border-indigo-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-indigo-700"><Lightbulb className="h-5 w-5" /> Reflexão Pedagógica</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Momento de Destaque do Dia</Label>
                <Textarea placeholder="Descreva o momento mais significativo do dia: uma descoberta, uma fala marcante, uma interação especial, uma conquista..." rows={3} value={form.momentoDestaque} onChange={e => setForm(f => ({ ...f, momentoDestaque: e.target.value }))} />
              </div>
              <div>
                <Label>Reflexão Pedagógica</Label>
                <Textarea placeholder="Reflita sobre sua prática: O que funcionou bem? O que você faria diferente? Quais aprendizagens emergiram? Como as crianças surpreenderam?" rows={3} value={form.reflexaoPedagogica} onChange={e => setForm(f => ({ ...f, reflexaoPedagogica: e.target.value }))} />
              </div>
              <div>
                <Label>Encaminhamentos e Próximos Passos</Label>
                <Textarea placeholder="Registre o que precisa ser retomado, comunicado aos pais, encaminhado à coordenação ou planejado para os próximos dias..." rows={2} value={form.encaminhamentos} onChange={e => setForm(f => ({ ...f, encaminhamentos: e.target.value }))} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={salvarDiario} disabled={saving} className="flex-1">
              {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Diário de Bordo
            </Button>
            <Button variant="outline" onClick={() => setAba('lista')}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* ─── O QUE SÃO MICROGESTOS? ─── */}
      {aba === 'microgestos' && (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-purple-800 mb-2">O que são Microgestos Pedagógicos?</h2>
                <p className="text-gray-700 leading-relaxed">
                  Microgestos pedagógicos são as <strong>pequenas ações intencionais</strong> que o professor realiza no cotidiano da Educação Infantil — 
                  um olhar atento, uma pergunta provocadora, um gesto de acolhimento, uma mediação sutil. 
                  Embora pareçam simples, esses gestos são <strong>poderosos instrumentos pedagógicos</strong> que promovem 
                  vínculos, ampliam aprendizagens e revelam a intencionalidade da prática docente.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TIPOS_MICROGESTO.map(tipo => (
              <Card key={tipo.id} className="border-2 hover:border-purple-200 transition-all">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl flex-shrink-0">{tipo.emoji}</span>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">{tipo.label}</h3>
                      <p className="text-sm text-gray-600">{tipo.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-2 border-indigo-100 bg-indigo-50">
            <CardContent className="pt-4">
              <h3 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                <Target className="h-5 w-5" /> Por que registrar microgestos?
              </h3>
              <div className="space-y-2 text-sm text-indigo-700">
                <p>• <strong>Tornar visível</strong> a intencionalidade pedagógica que muitas vezes é invisível</p>
                <p>• <strong>Documentar</strong> a qualidade das interações e do cuidado oferecido</p>
                <p>• <strong>Refletir</strong> sobre a própria prática e identificar pontos de melhoria</p>
                <p>• <strong>Evidenciar</strong> o trabalho pedagógico para a coordenação e famílias</p>
                <p>• <strong>Alimentar</strong> o planejamento com base no que foi observado</p>
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => setAba('novo')} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Começar a Registrar Microgestos
          </Button>
        </div>
      )}
    </PageShell>
  );
}
