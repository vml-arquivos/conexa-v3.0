import { useState, useEffect } from 'react';
import { useAuth } from '../app/AuthProvider';
import { isProfessor } from '../api/auth';
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
  User, Users, Plus, Save, Search, ChevronDown, ChevronUp,
  Heart, Brain, Smile, Activity, BookOpen, Eye, RefreshCw,
  MessageCircle, Star, Camera, Layers, Target, Calendar,
  UserCircle, CheckCircle, AlertCircle, Edit3, Sparkles,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Crianca {
  id: string;
  nome: string;
  firstName: string;
  lastName: string;
  idade: number;
  gender: string;
  photoUrl?: string;
  turma?: string;
}

interface RdicEntry {
  id: string;
  childId: string;
  child?: { firstName: string; lastName: string; photoUrl?: string };
  periodo: string;
  bimestre: number;
  dimensoes: DimensaoAvaliacao[];
  observacaoGeral: string;
  proximosPassos: string;
  status: string;
  createdAt: string;
}

interface RiaEntry {
  id: string;
  childId?: string;
  child?: { firstName: string; lastName: string; photoUrl?: string };
  data: string;
  tipo: string;
  campoExperiencia: string;
  descricao: string;
  description?: string;
  aprendizagens: string[];
  interacoes: string[];
  emocoes: string[];
  fotoUrl?: string;
  status: string;
  createdAt: string;
}

interface DimensaoAvaliacao {
  dimensao: string;
  indicadores: IndicadorAvaliacao[];
}

interface IndicadorAvaliacao {
  codigo: string;
  descricao: string;
  nivel: 'NAO_OBSERVADO' | 'EM_DESENVOLVIMENTO' | 'CONSOLIDADO' | 'AMPLIADO';
}

// ─── Dimensões de Desenvolvimento (BNCC) ─────────────────────────────────────
const DIMENSOES_BNCC = [
  {
    id: 'eu-outro-nos',
    label: 'O eu, o outro e o nós',
    emoji: '🤝',
    cor: 'pink',
    indicadores: [
      { codigo: 'EO01', descricao: 'Demonstra interesse em interagir com outras crianças e adultos' },
      { codigo: 'EO02', descricao: 'Expressa necessidades, desejos e emoções de forma verbal ou não verbal' },
      { codigo: 'EO03', descricao: 'Participa de brincadeiras coletivas e situações de cuidado' },
      { codigo: 'EO04', descricao: 'Demonstra empatia e respeito nas relações com os outros' },
    ],
  },
  {
    id: 'corpo-gestos',
    label: 'Corpo, gestos e movimentos',
    emoji: '🕺',
    cor: 'orange',
    indicadores: [
      { codigo: 'CG01', descricao: 'Explora e controla movimentos corporais amplos e finos' },
      { codigo: 'CG02', descricao: 'Utiliza o corpo para expressar emoções e comunicar-se' },
      { codigo: 'CG03', descricao: 'Demonstra equilíbrio, coordenação e lateralidade' },
      { codigo: 'CG04', descricao: 'Participa de brincadeiras que envolvem movimento e expressão corporal' },
    ],
  },
  {
    id: 'tracos-sons',
    label: 'Traços, sons, cores e formas',
    emoji: '🎨',
    cor: 'purple',
    indicadores: [
      { codigo: 'TS01', descricao: 'Explora diferentes materiais plásticos e sonoros' },
      { codigo: 'TS02', descricao: 'Produz e aprecia manifestações artísticas e culturais' },
      { codigo: 'TS03', descricao: 'Utiliza diferentes linguagens expressivas (visual, musical, corporal)' },
      { codigo: 'TS04', descricao: 'Demonstra criatividade e imaginação nas produções' },
    ],
  },
  {
    id: 'escuta-fala',
    label: 'Escuta, fala, pensamento e imaginação',
    emoji: '📖',
    cor: 'blue',
    indicadores: [
      { codigo: 'EF01', descricao: 'Demonstra interesse por histórias, livros e situações de leitura' },
      { codigo: 'EF02', descricao: 'Amplia vocabulário e capacidade de comunicação oral' },
      { codigo: 'EF03', descricao: 'Participa de situações de escuta e fala com atenção' },
      { codigo: 'EF04', descricao: 'Demonstra imaginação em brincadeiras de faz de conta e narrativas' },
    ],
  },
  {
    id: 'espacos-tempos',
    label: 'Espaços, tempos, quantidades, relações e transformações',
    emoji: '🔬',
    cor: 'green',
    indicadores: [
      { codigo: 'ET01', descricao: 'Explora o ambiente com curiosidade, observação e experimentação' },
      { codigo: 'ET02', descricao: 'Estabelece relações de comparação, classificação e seriação' },
      { codigo: 'ET03', descricao: 'Demonstra noções de quantidade, espaço e tempo' },
      { codigo: 'ET04', descricao: 'Resolve situações-problema com autonomia e criatividade' },
    ],
  },
];

const NIVEIS = [
  { id: 'NAO_OBSERVADO', label: 'Não Observado', cor: 'bg-gray-100 text-gray-500', short: 'NO' },
  { id: 'EM_DESENVOLVIMENTO', label: 'Em Desenvolvimento', cor: 'bg-yellow-100 text-yellow-700', short: 'ED' },
  { id: 'CONSOLIDADO', label: 'Consolidado', cor: 'bg-green-100 text-green-700', short: 'C' },
  { id: 'AMPLIADO', label: 'Ampliado', cor: 'bg-blue-100 text-blue-700', short: 'A' },
];

const TIPOS_RIA = [
  { id: 'INTERACAO', label: 'Interação', emoji: '🤝', desc: 'Registro de interação entre crianças ou com adultos' },
  { id: 'APRENDIZAGEM', label: 'Aprendizagem', emoji: '💡', desc: 'Registro de descoberta ou aprendizagem significativa' },
  { id: 'BRINCADEIRA', label: 'Brincadeira', emoji: '🎮', desc: 'Registro de brincadeira livre ou dirigida' },
  { id: 'EXPRESSAO', label: 'Expressão', emoji: '🎨', desc: 'Registro de expressão artística, corporal ou verbal' },
  { id: 'EXPLORACAO', label: 'Exploração', emoji: '🔍', desc: 'Registro de exploração do ambiente ou materiais' },
  { id: 'CUIDADO', label: 'Cuidado', emoji: '💚', desc: 'Registro de situação de cuidado e rotina' },
];

const EMOCOES = ['😊 Alegre', '😢 Triste', '😠 Irritado', '😨 Ansioso', '😴 Cansado', '🤔 Curioso', '😍 Encantado', '😌 Tranquilo', '😤 Frustrado', '🥰 Afetuoso'];

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function RdicRiaPage() {
  const { user } = useAuth();
  // Professor só cria RDIC. RIA é feito pela coordenação/direção.
  const soProfessor = isProfessor(user) && !user?.roles?.some(r => ['UNIDADE','STAFF_CENTRAL','MANTENEDORA','DEVELOPER'].includes(r));
  const [aba, setAba] = useState<'rdic' | 'ria' | 'novo-rdic' | 'novo-ria'>('rdic');
  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [rdicList, setRdicList] = useState<RdicEntry[]>([]);
  const [riaList, setRiaList] = useState<RiaEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Formulário RDIC
  const [rdicForm, setRdicForm] = useState({
    childId: '',
    bimestre: 1,
    observacaoGeral: '',
    proximosPassos: '',
    dimensoes: DIMENSOES_BNCC.map(d => ({
      dimensao: d.id,
      indicadores: d.indicadores.map(ind => ({
        codigo: ind.codigo,
        descricao: ind.descricao,
        nivel: 'NAO_OBSERVADO' as const,
      })),
    })),
  });

  // Formulário RIA
  const [riaForm, setRiaForm] = useState({
    childId: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'INTERACAO',
    campoExperiencia: 'eu-outro-nos',
    descricao: '',
    aprendizagens: '',
    interacoes: '',
    emocoesSelecionadas: [] as string[],
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [dashRes, rdicRes, riaRes] = await Promise.allSettled([
        http.get('/teachers/dashboard'),
        http.get('/rdx?limit=50'),
        http.get('/diary-events?limit=50'),
      ]);

      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value.data;
        if (d?.alunos) setCriancas(d.alunos);
      }
      if (rdicRes.status === 'fulfilled') {
        const d = rdicRes.value.data;
        setRdicList(Array.isArray(d) ? d : d?.data ?? []);
      }
      if (riaRes.status === 'fulfilled') {
        const d = riaRes.value.data;
        setRiaList(Array.isArray(d) ? d : d?.data ?? []);
      }
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }

  function setNivelIndicador(dimensaoId: string, codigoInd: string, nivel: string) {
    setRdicForm(f => ({
      ...f,
      dimensoes: f.dimensoes.map(d =>
        d.dimensao === dimensaoId
          ? { ...d, indicadores: d.indicadores.map(ind => ind.codigo === codigoInd ? { ...ind, nivel: nivel as any } : ind) }
          : d
      ),
    }));
  }

  async function salvarRdic() {
    if (!rdicForm.childId) { toast.error('Selecione uma criança'); return; }
    if (!rdicForm.observacaoGeral.trim()) { toast.error('Preencha a observação geral'); return; }
    setSaving(true);
    try {
      await http.post('/rdx', {
        childId: rdicForm.childId,
        bimestre: rdicForm.bimestre,
        observacaoGeral: rdicForm.observacaoGeral,
        proximosPassos: rdicForm.proximosPassos,
        dimensoes: rdicForm.dimensoes,
        type: 'RDIC',
      });
      toast.success('RDIC salvo com sucesso!');
      setAba('rdic');
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar RDIC');
    } finally { setSaving(false); }
  }

  async function salvarRia() {
    if (!riaForm.descricao.trim()) { toast.error('Preencha a descrição da interação/aprendizagem'); return; }
    setSaving(true);
    try {
      await http.post('/diary-events', {
        childId: riaForm.childId || undefined,
        date: riaForm.data,
        type: riaForm.tipo,
        campoExperiencia: riaForm.campoExperiencia,
        description: riaForm.descricao,
        aprendizagens: riaForm.aprendizagens.split('\n').filter(Boolean),
        interacoes: riaForm.interacoes.split('\n').filter(Boolean),
        emocoes: riaForm.emocoesSelecionadas,
        category: 'RIA',
      });
      toast.success('RIA registrado com sucesso!');
      setAba('ria');
      loadData();
      setRiaForm({ childId: '', data: new Date().toISOString().split('T')[0], tipo: 'INTERACAO', campoExperiencia: 'eu-outro-nos', descricao: '', aprendizagens: '', interacoes: '', emocoesSelecionadas: [] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar RIA');
    } finally { setSaving(false); }
  }

  function toggleEmocao(emocao: string) {
    setRiaForm(f => ({
      ...f,
      emocoesSelecionadas: f.emocoesSelecionadas.includes(emocao)
        ? f.emocoesSelecionadas.filter(e => e !== emocao)
        : [...f.emocoesSelecionadas, emocao],
    }));
  }

  const criancaAtualRdic = criancas.find(c => c.id === rdicForm.childId);

  return (
    <PageShell
      title="RDIC & RIA"
      subtitle="Registro de Desenvolvimento Individual da Criança e Registro de Interações e Aprendizagens"
    >
      {/* Abas */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
        {[
          { id: 'rdic', label: 'RDIC', icon: <User className="h-4 w-4" />, desc: 'Desenvolvimento Individual' },
          { id: 'novo-rdic', label: 'Novo RDIC', icon: <Plus className="h-4 w-4" />, desc: '' },
          ...(!soProfessor ? [
            { id: 'ria', label: 'RIA', icon: <Users className="h-4 w-4" />, desc: 'Interações e Aprendizagens' },
            { id: 'novo-ria', label: 'Novo RIA', icon: <Plus className="h-4 w-4" />, desc: '' },
          ] : []),
        ].map(tab => (
          <button key={tab.id} onClick={() => setAba(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${aba === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── LISTA RDIC ─── */}
      {aba === 'rdic' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Brain className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-800">RDIC — Registro de Desenvolvimento Individual da Criança</h3>
                <p className="text-sm text-blue-600 mt-0.5">
                  Avaliação bimestral por dimensões de desenvolvimento baseada nos 5 Campos de Experiência da BNCC.
                  Registre o nível de desenvolvimento de cada criança em cada indicador.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar por criança..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <Button onClick={() => setAba('novo-rdic')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Novo RDIC
            </Button>
          </div>

          {loading && <LoadingState message="Carregando registros..." />}

          {!loading && rdicList.length === 0 && (
            <EmptyState
              icon={<Brain className="h-12 w-12 text-gray-300" />}
              title="Nenhum RDIC registrado"
              description="Crie o primeiro Registro de Desenvolvimento Individual da Criança"
              action={<Button onClick={() => setAba('novo-rdic')}><Plus className="h-4 w-4 mr-2" />Criar RDIC</Button>}
            />
          )}

          <div className="space-y-3">
            {rdicList.map(rdic => (
              <Card key={rdic.id} className="border-2 hover:border-blue-200 transition-all">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {rdic.child?.photoUrl ? (
                        <img src={rdic.child.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-blue-100 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <UserCircle className="h-6 w-6 text-blue-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-800">{rdic.child?.firstName} {rdic.child?.lastName}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-2">
                          <Calendar className="h-3 w-3" /> {rdic.periodo || `${rdic.bimestre}º Bimestre`}
                          <span className={`px-2 py-0.5 rounded-full ${rdic.status === 'PUBLICADO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{rdic.status || 'Rascunho'}</span>
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setExpandedId(expandedId === rdic.id ? null : rdic.id)} className="text-gray-400 hover:text-gray-600 p-1">
                      {expandedId === rdic.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                  </div>

                  {expandedId === rdic.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {rdic.dimensoes?.map((dim: any, i: number) => {
                        const dimInfo = DIMENSOES_BNCC.find(d => d.id === dim.dimensao);
                        return (
                          <div key={i}>
                            <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <span>{dimInfo?.emoji}</span> {dimInfo?.label || dim.dimensao}
                            </p>
                            <div className="space-y-1">
                              {dim.indicadores?.map((ind: any, j: number) => {
                                const nivel = NIVEIS.find(n => n.id === ind.nivel);
                                return (
                                  <div key={j} className="flex items-center gap-2 text-xs">
                                    <span className={`px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${nivel?.cor || 'bg-gray-100 text-gray-500'}`}>{nivel?.short || 'NO'}</span>
                                    <span className="text-gray-600">{ind.descricao}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      {rdic.observacaoGeral && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Observação Geral</p>
                          <p className="text-sm text-gray-700">{rdic.observacaoGeral}</p>
                        </div>
                      )}
                      {rdic.proximosPassos && (
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-blue-500 uppercase mb-1">Próximos Passos</p>
                          <p className="text-sm text-blue-700">{rdic.proximosPassos}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── NOVO RDIC ─── */}
      {aba === 'novo-rdic' && (
        <div className="space-y-6 max-w-3xl">
          <Card className="border-2 border-blue-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-blue-700"><User className="h-5 w-5" /> Identificação</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Criança *</Label>
                  <select className="w-full px-3 py-2 border rounded-lg text-sm" value={rdicForm.childId} onChange={e => setRdicForm(f => ({ ...f, childId: e.target.value }))}>
                    <option value="">Selecionar criança...</option>
                    {criancas.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Bimestre</Label>
                  <select className="w-full px-3 py-2 border rounded-lg text-sm" value={rdicForm.bimestre} onChange={e => setRdicForm(f => ({ ...f, bimestre: Number(e.target.value) }))}>
                    <option value={1}>1º Bimestre</option>
                    <option value={2}>2º Bimestre</option>
                    <option value={3}>3º Bimestre</option>
                    <option value={4}>4º Bimestre</option>
                  </select>
                </div>
              </div>

              {criancaAtualRdic && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  {criancaAtualRdic.photoUrl ? (
                    <img src={criancaAtualRdic.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-blue-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
                      <UserCircle className="h-7 w-7 text-blue-500" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-blue-800">{criancaAtualRdic.firstName} {criancaAtualRdic.lastName}</p>
                    <p className="text-xs text-blue-600">{criancaAtualRdic.idade} meses · {criancaAtualRdic.gender === 'MASCULINO' ? 'Menino' : 'Menina'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dimensões de Desenvolvimento */}
          {DIMENSOES_BNCC.map(dim => (
            <Card key={dim.id} className={`border-2 border-${dim.cor}-100`}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 text-${dim.cor}-700 text-base`}>
                  <span className="text-xl">{dim.emoji}</span> {dim.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dim.indicadores.map(ind => {
                    const dimForm = rdicForm.dimensoes.find(d => d.dimensao === dim.id);
                    const indForm = dimForm?.indicadores.find(i => i.codigo === ind.codigo);
                    const nivelAtual = indForm?.nivel || 'NAO_OBSERVADO';
                    return (
                      <div key={ind.codigo} className="space-y-1">
                        <p className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">{ind.codigo}</span>
                          {ind.descricao}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {NIVEIS.map(nivel => (
                            <button key={nivel.id}
                              onClick={() => setNivelIndicador(dim.id, ind.codigo, nivel.id)}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${nivelAtual === nivel.id ? nivel.cor + ' border-current shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                              {nivel.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="border-2 border-gray-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-gray-700"><Edit3 className="h-5 w-5" /> Observações e Encaminhamentos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Observação Geral *</Label>
                <Textarea placeholder="Descreva o desenvolvimento geral da criança neste bimestre, destacando avanços, interesses e conquistas..." rows={4} value={rdicForm.observacaoGeral} onChange={e => setRdicForm(f => ({ ...f, observacaoGeral: e.target.value }))} />
              </div>
              <div>
                <Label>Próximos Passos e Encaminhamentos</Label>
                <Textarea placeholder="Registre as estratégias pedagógicas, encaminhamentos e objetivos para o próximo período..." rows={3} value={rdicForm.proximosPassos} onChange={e => setRdicForm(f => ({ ...f, proximosPassos: e.target.value }))} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={salvarRdic} disabled={saving} className="flex-1">
              {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar RDIC
            </Button>
            <Button variant="outline" onClick={() => setAba('rdic')}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* ─── LISTA RIA ─── */}
      {aba === 'ria' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-800">RIA — Registro de Interações e Aprendizagens</h3>
                <p className="text-sm text-green-600 mt-0.5">
                  Registros cotidianos de momentos significativos: interações, descobertas, brincadeiras, expressões e aprendizagens das crianças.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar registro..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <Button onClick={() => setAba('novo-ria')} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4" /> Novo RIA
            </Button>
          </div>

          {loading && <LoadingState message="Carregando registros..." />}

          {!loading && riaList.length === 0 && (
            <EmptyState
              icon={<MessageCircle className="h-12 w-12 text-gray-300" />}
              title="Nenhum RIA registrado"
              description="Registre interações e aprendizagens significativas das crianças"
              action={<Button onClick={() => setAba('novo-ria')} className="bg-green-600 hover:bg-green-700"><Plus className="h-4 w-4 mr-2" />Criar RIA</Button>}
            />
          )}

          <div className="space-y-3">
            {riaList.map(ria => {
              const tipo = TIPOS_RIA.find(t => t.id === ria.tipo);
              const campo = DIMENSOES_BNCC.find(d => d.id === ria.campoExperiencia);
              return (
                <Card key={ria.id} className="border-2 hover:border-green-200 transition-all">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {tipo && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{tipo.emoji} {tipo.label}</span>}
                          {campo && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{campo.emoji} {campo.label.split(',')[0]}</span>}
                          <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(ria.data || ria.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                        {ria.child && (
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                            <UserCircle className="h-3 w-3" /> {ria.child.firstName} {ria.child.lastName}
                          </p>
                        )}
                        <p className="text-sm text-gray-700 line-clamp-2">{ria.descricao || ria.description}</p>
                        {ria.emocoes?.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {ria.emocoes.map((e: string, i: number) => <span key={i} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">{e}</span>)}
                          </div>
                        )}
                      </div>
                      <button onClick={() => setExpandedId(expandedId === ria.id ? null : ria.id)} className="text-gray-400 hover:text-gray-600 p-1">
                        {expandedId === ria.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>

                    {expandedId === ria.id && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        {ria.aprendizagens?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Aprendizagens Observadas</p>
                            <ul className="space-y-1">
                              {ria.aprendizagens.map((a: string, i: number) => <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><Star className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />{a}</li>)}
                            </ul>
                          </div>
                        )}
                        {ria.interacoes?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Interações Registradas</p>
                            <ul className="space-y-1">
                              {ria.interacoes.map((i: string, idx: number) => <li key={idx} className="text-sm text-gray-700 flex items-start gap-2"><Heart className="h-3 w-3 text-pink-500 mt-0.5 flex-shrink-0" />{i}</li>)}
                            </ul>
                          </div>
                        )}
                        {ria.fotoUrl && <img src={ria.fotoUrl} alt="Registro" className="rounded-xl max-h-48 object-cover" />}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── NOVO RIA ─── */}
      {aba === 'novo-ria' && (
        <div className="space-y-6 max-w-3xl">
          <Card className="border-2 border-green-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-green-700"><MessageCircle className="h-5 w-5" /> Identificação do Registro</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Criança (opcional — pode ser coletivo)</Label>
                  <select className="w-full px-3 py-2 border rounded-lg text-sm" value={riaForm.childId} onChange={e => setRiaForm(f => ({ ...f, childId: e.target.value }))}>
                    <option value="">Toda a turma / Coletivo</option>
                    {criancas.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={riaForm.data} onChange={e => setRiaForm(f => ({ ...f, data: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label>Tipo de Registro</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {TIPOS_RIA.map(tipo => (
                    <button key={tipo.id} onClick={() => setRiaForm(f => ({ ...f, tipo: tipo.id }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${riaForm.tipo === tipo.id ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <span className="text-xl block mb-1">{tipo.emoji}</span>
                      <span className="text-sm font-medium text-gray-700">{tipo.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Campo de Experiência</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {DIMENSOES_BNCC.map(dim => (
                    <button key={dim.id} onClick={() => setRiaForm(f => ({ ...f, campoExperiencia: dim.id }))}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${riaForm.campoExperiencia === dim.id ? `border-${dim.cor}-400 bg-${dim.cor}-50` : 'border-gray-200 hover:border-gray-300'}`}>
                      <span>{dim.emoji}</span>
                      <span className="text-xs font-medium text-gray-700">{dim.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-teal-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-teal-700"><Edit3 className="h-5 w-5" /> Conteúdo do Registro</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Descrição da Interação/Aprendizagem *</Label>
                <Textarea placeholder="Descreva o momento observado com riqueza de detalhes: o que aconteceu, como as crianças reagiram, o que disseram, o que fizeram..." rows={4} value={riaForm.descricao} onChange={e => setRiaForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>
              <div>
                <Label>Aprendizagens Observadas (uma por linha)</Label>
                <Textarea placeholder="Ex: A criança demonstrou compreender causa e efeito ao empurrar o objeto&#10;Ampliou vocabulário com novas palavras..." rows={3} value={riaForm.aprendizagens} onChange={e => setRiaForm(f => ({ ...f, aprendizagens: e.target.value }))} />
              </div>
              <div>
                <Label>Interações Registradas (uma por linha)</Label>
                <Textarea placeholder="Ex: Compartilhou espontaneamente o brinquedo com colega&#10;Buscou apoio do adulto ao sentir dificuldade..." rows={3} value={riaForm.interacoes} onChange={e => setRiaForm(f => ({ ...f, interacoes: e.target.value }))} />
              </div>
              <div>
                <Label>Emoções Observadas</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {EMOCOES.map(emocao => (
                    <button key={emocao} onClick={() => toggleEmocao(emocao)}
                      className={`px-3 py-1.5 rounded-full text-sm border-2 transition-all ${riaForm.emocoesSelecionadas.includes(emocao) ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {emocao}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={salvarRia} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700">
              {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar RIA
            </Button>
            <Button variant="outline" onClick={() => setAba('ria')}>Cancelar</Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
