import { useState, useEffect } from 'react';
import { useAuth } from '../app/AuthProvider';
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
  User, Plus, Save, Search, ChevronDown, ChevronUp,
  Brain, RefreshCw, Calendar, UserCircle, Edit3,
  FileText, ClipboardCheck, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { normalizeRoles } from '../app/RoleProtectedRoute';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Crianca {
  id: string;
  firstName: string;
  lastName: string;
  idade: number;
  gender: string;
  photoUrl?: string;
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

interface DimensaoAvaliacao {
  dimensao: string;
  indicadores: IndicadorAvaliacao[];
}

interface IndicadorAvaliacao {
  codigo: string;
  descricao: string;
  nivel: 'NAO_OBSERVADO' | 'EM_DESENVOLVIMENTO' | 'CONSOLIDADO' | 'AMPLIADO';
}

// ─── Dimensões BNCC ───────────────────────────────────────────────────────────
const DIMENSOES_BNCC = [
  {
    id: 'eu-outro-nos', label: 'O eu, o outro e o nós', emoji: '🤝', cor: 'pink',
    indicadores: [
      { codigo: 'EO01', descricao: 'Demonstra interesse em interagir com outras crianças e adultos' },
      { codigo: 'EO02', descricao: 'Expressa necessidades, desejos e emoções de forma verbal ou não verbal' },
      { codigo: 'EO03', descricao: 'Participa de brincadeiras coletivas e situações de cuidado' },
      { codigo: 'EO04', descricao: 'Demonstra empatia e respeito nas relações com os outros' },
    ],
  },
  {
    id: 'corpo-gestos', label: 'Corpo, gestos e movimentos', emoji: '🕺', cor: 'orange',
    indicadores: [
      { codigo: 'CG01', descricao: 'Explora e controla movimentos corporais amplos e finos' },
      { codigo: 'CG02', descricao: 'Utiliza o corpo para expressar emoções e comunicar-se' },
      { codigo: 'CG03', descricao: 'Demonstra equilíbrio, coordenação e lateralidade' },
      { codigo: 'CG04', descricao: 'Participa de brincadeiras que envolvem movimento e expressão corporal' },
    ],
  },
  {
    id: 'tracos-sons', label: 'Traços, sons, cores e formas', emoji: '🎨', cor: 'purple',
    indicadores: [
      { codigo: 'TS01', descricao: 'Explora diferentes materiais plásticos e sonoros' },
      { codigo: 'TS02', descricao: 'Produz trabalhos artísticos com intencionalidade expressiva' },
      { codigo: 'TS03', descricao: 'Aprecia e comenta produções artísticas próprias e dos colegas' },
      { codigo: 'TS04', descricao: 'Demonstra criatividade e imaginação nas produções' },
    ],
  },
  {
    id: 'escuta-fala', label: 'Escuta, fala, pensamento e imaginação', emoji: '💬', cor: 'blue',
    indicadores: [
      { codigo: 'EF01', descricao: 'Demonstra interesse por histórias, livros e situações de leitura' },
      { codigo: 'EF02', descricao: 'Comunica-se oralmente com clareza e amplia o vocabulário' },
      { codigo: 'EF03', descricao: 'Reconhece letras, palavras e inicia a escrita espontânea' },
      { codigo: 'EF04', descricao: 'Reconta histórias e cria narrativas com coerência' },
    ],
  },
  {
    id: 'espacos-tempos', label: 'Espaços, tempos, quantidades, relações e transformações', emoji: '🔢', cor: 'green',
    indicadores: [
      { codigo: 'ET01', descricao: 'Explora e descreve características do ambiente natural e social' },
      { codigo: 'ET02', descricao: 'Estabelece relações de comparação, classificação e seriação' },
      { codigo: 'ET03', descricao: 'Compreende noções de número, quantidade e medida' },
      { codigo: 'ET04', descricao: 'Resolve situações-problema com autonomia e criatividade' },
    ],
  },
];

const NIVEIS = [
  { id: 'NAO_OBSERVADO', label: 'Não Observado', cor: 'bg-gray-100 text-gray-600', short: 'NO' },
  { id: 'EM_DESENVOLVIMENTO', label: 'Em Desenvolvimento', cor: 'bg-yellow-100 text-yellow-700', short: 'ED' },
  { id: 'CONSOLIDADO', label: 'Consolidado', cor: 'bg-green-100 text-green-700', short: 'C' },
  { id: 'AMPLIADO', label: 'Ampliado', cor: 'bg-blue-100 text-blue-700', short: 'A' },
];

// ─── Interface RIA ───────────────────────────────────────────────────────────
interface RiaEntry {
  id: string;
  childId: string;
  child?: { firstName: string; lastName: string };
  periodo: string;
  tipoIntervencao: string;
  descricaoSituacao: string;
  estrategiasAdotadas: string;
  encaminhamentos: string;
  resultadoObservado: string;
  proximaAvaliacao: string;
  status: 'ABERTO' | 'EM_ACOMPANHAMENTO' | 'CONCLUIDO';
  createdAt: string;
}
// ─── Componente Principal ─────────────────────────────────────────────────────
export default function RdicRiaPage() {
  const { user } = useAuth();
  const userRoles = normalizeRoles(user);
  const isCoordenador = userRoles.some(r =>
    r === 'UNIDADE' || r.startsWith('UNIDADE_') ||
    r === 'STAFF_CENTRAL' || r.startsWith('STAFF_CENTRAL_') ||
    r === 'MANTENEDORA' || r === 'DEVELOPER'
  );
  const [aba, setAba] = useState<'rdic' | 'novo-rdic' | 'ria' | 'nova-ria'>('rdic');
  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [rdicList, setRdicList] = useState<RdicEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState('');
  // ─── Estado RIA ─────────────────────────────────────────────────────
  const [riaList, setRiaList] = useState<RiaEntry[]>([]);
  const [riaForm, setRiaForm] = useState({
    childId: '',
    periodo: '',
    tipoIntervencao: 'PEDAGOGICA',
    descricaoSituacao: '',
    estrategiasAdotadas: '',
    encaminhamentos: '',
    resultadoObservado: '',
    proximaAvaliacao: '',
    status: 'ABERTO' as const,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [dashRes, rdicRes] = await Promise.allSettled([
        http.get('/teachers/dashboard'),
        http.get('/rdx?limit=50'),
      ]);
      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value.data;
        if (d?.alunos) setCriancas(d.alunos);
      }
      if (rdicRes.status === 'fulfilled') {
        const d = rdicRes.value.data;
        setRdicList(Array.isArray(d) ? d : d?.data ?? []);
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
      setRdicForm({
        childId: '', bimestre: 1, observacaoGeral: '', proximosPassos: '',
        dimensoes: DIMENSOES_BNCC.map(d => ({
          dimensao: d.id,
          indicadores: d.indicadores.map(ind => ({ codigo: ind.codigo, descricao: ind.descricao, nivel: 'NAO_OBSERVADO' as const })),
        })),
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar RDIC');
    } finally { setSaving(false); }
  }

   async function salvarRia() {
    if (!riaForm.childId) { toast.error('Selecione uma criança'); return; }
    if (!riaForm.descricaoSituacao.trim()) { toast.error('Descreva a situação'); return; }
    if (!riaForm.periodo.trim()) { toast.error('Informe o período'); return; }
    setSaving(true);
    try {
      const res = await http.post('/rdx', {
        childId: riaForm.childId,
        type: 'RIA',
        periodo: riaForm.periodo,
        tipoIntervencao: riaForm.tipoIntervencao,
        descricaoSituacao: riaForm.descricaoSituacao,
        estrategiasAdotadas: riaForm.estrategiasAdotadas,
        encaminhamentos: riaForm.encaminhamentos,
        resultadoObservado: riaForm.resultadoObservado,
        proximaAvaliacao: riaForm.proximaAvaliacao,
        status: riaForm.status,
      });
      setRiaList(prev => [res.data, ...prev]);
      toast.success('RIA salvo com sucesso!');
      setAba('ria');
      setRiaForm({
        childId: '', periodo: '', tipoIntervencao: 'PEDAGOGICA',
        descricaoSituacao: '', estrategiasAdotadas: '', encaminhamentos: '',
        resultadoObservado: '', proximaAvaliacao: '', status: 'ABERTO',
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar RIA');
    } finally { setSaving(false); }
  }

  const criancaAtualRdic = criancas.find(c => c.id === rdicForm.childId);
  const criancaAtualRia = criancas.find(c => c.id === riaForm.childId);
  const rdicFiltrado = rdicList.filter(r =>
    !busca || `${r.child?.firstName} ${r.child?.lastName}`.toLowerCase().includes(busca.toLowerCase())
  );
  const riaFiltrada = riaList.filter(r =>
    !busca || `${r.child?.firstName} ${r.child?.lastName}`.toLowerCase().includes(busca.toLowerCase())
  );
  return (
    <PageShell
      title="RDIC — Registro de Desenvolvimento Individual da Criança"
      subtitle="Avaliação bimestral por dimensões de desenvolvimento baseada nos 5 Campos de Experiência da BNCC"
    >
      {/* Abas */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 flex-wrap">
        {[
          { id: 'rdic', label: 'Registros RDIC', icon: <User className="h-4 w-4" /> },
          { id: 'novo-rdic', label: 'Novo RDIC', icon: <Plus className="h-4 w-4" /> },
          ...(isCoordenador ? [
            { id: 'ria', label: 'RIA — Intervenções', icon: <ClipboardCheck className="h-4 w-4" /> },
            { id: 'nova-ria', label: 'Nova RIA', icon: <FileText className="h-4 w-4" /> },
          ] : []),
        ].map(tab => (
          <button key={tab.id} onClick={() => setAba(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${aba === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
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

          {!loading && rdicFiltrado.length === 0 && (
            <EmptyState
              icon={<Brain className="h-12 w-12 text-gray-300" />}
              title="Nenhum RDIC registrado"
              description="Crie o primeiro Registro de Desenvolvimento Individual da Criança"
              action={<Button onClick={() => setAba('novo-rdic')}><Plus className="h-4 w-4 mr-2" />Criar RDIC</Button>}
            />
          )}

          <div className="space-y-3">
            {rdicFiltrado.map(rdic => (
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
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <ClipboardCheck className="h-6 w-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-purple-800">RIA — Relatório de Intervenção e Acompanhamento</h3>
                <p className="text-sm text-purple-600 mt-0.5">
                  Elaborado pela coordenação pedagógica. Registra situações que demandam intervenção, as estratégias adotadas e o acompanhamento da criança.
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" placeholder="Buscar por nome da criança..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <Button onClick={() => setAba('nova-ria')}><Plus className="h-4 w-4 mr-2" />Nova RIA</Button>
          </div>
          {riaFiltrada.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhum RIA registrado</p>
              <p className="text-sm mt-1">Crie o primeiro Relatório de Intervenção e Acompanhamento</p>
              <Button className="mt-4" onClick={() => setAba('nova-ria')}><Plus className="h-4 w-4 mr-2" />Criar RIA</Button>
            </div>
          ) : (
            riaFiltrada.map(ria => (
              <Card key={ria.id} className="border border-purple-100">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <UserCircle className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{ria.child?.firstName} {ria.child?.lastName}</p>
                        <p className="text-xs text-gray-500">{ria.periodo} · {ria.tipoIntervencao}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      ria.status === 'CONCLUIDO' ? 'bg-green-100 text-green-700'
                      : ria.status === 'EM_ACOMPANHAMENTO' ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                    }`}>{ria.status === 'CONCLUIDO' ? 'Concluído' : ria.status === 'EM_ACOMPANHAMENTO' ? 'Em Acompanhamento' : 'Aberto'}</span>
                  </div>
                  <button className="mt-3 w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-800" onClick={() => setExpandedId(expandedId === ria.id ? null : ria.id)}>
                    <span>Ver detalhes</span>
                    {expandedId === ria.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedId === ria.id && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      {ria.descricaoSituacao && <div><p className="text-xs font-medium text-gray-500">Situação</p><p className="text-sm text-gray-700">{ria.descricaoSituacao}</p></div>}
                      {ria.estrategiasAdotadas && <div><p className="text-xs font-medium text-gray-500">Estratégias Adotadas</p><p className="text-sm text-gray-700">{ria.estrategiasAdotadas}</p></div>}
                      {ria.encaminhamentos && <div><p className="text-xs font-medium text-gray-500">Encaminhamentos</p><p className="text-sm text-gray-700">{ria.encaminhamentos}</p></div>}
                      {ria.resultadoObservado && <div><p className="text-xs font-medium text-gray-500">Resultado Observado</p><p className="text-sm text-gray-700">{ria.resultadoObservado}</p></div>}
                      {ria.proximaAvaliacao && <div><p className="text-xs font-medium text-gray-500">Próxima Avaliação</p><p className="text-sm text-gray-700">{ria.proximaAvaliacao}</p></div>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ─── FORMULARIO NOVA RIA ─── */}
      {aba === 'nova-ria' && (
        <div className="space-y-4">
          <Card className="border-2 border-purple-100">
            <CardHeader><CardTitle className="flex items-center gap-2 text-purple-700"><FileText className="h-5 w-5" /> Nova RIA — Relatório de Intervenção e Acompanhamento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Criança *</Label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={riaForm.childId} onChange={e => setRiaForm(f => ({ ...f, childId: e.target.value }))}>
                    <option value="">Selecione uma criança...</option>
                    {criancas.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Período *</Label>
                  <Input placeholder="Ex: 1º Bimestre 2026" value={riaForm.periodo} onChange={e => setRiaForm(f => ({ ...f, periodo: e.target.value }))} />
                </div>
                <div>
                  <Label>Tipo de Intervenção</Label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={riaForm.tipoIntervencao} onChange={e => setRiaForm(f => ({ ...f, tipoIntervencao: e.target.value }))}>
                    <option value="PEDAGOGICA">Pedagógica</option>
                    <option value="COMPORTAMENTAL">Comportamental</option>
                    <option value="FAMILIAR">Familiar</option>
                    <option value="SAUDE">Saúde</option>
                    <option value="INCLUSAO">Inclusão / NEE</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>
                <div>
                  <Label>Status</Label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={riaForm.status} onChange={e => setRiaForm(f => ({ ...f, status: e.target.value as any }))}>
                    <option value="ABERTO">Aberto</option>
                    <option value="EM_ACOMPANHAMENTO">Em Acompanhamento</option>
                    <option value="CONCLUIDO">Concluído</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Descrição da Situação *</Label>
                <Textarea placeholder="Descreva a situação que motivou a intervenção, o contexto e os comportamentos observados..." rows={3} value={riaForm.descricaoSituacao} onChange={e => setRiaForm(f => ({ ...f, descricaoSituacao: e.target.value }))} />
              </div>
              <div>
                <Label>Estratégias Adotadas</Label>
                <Textarea placeholder="Quais estratégias pedagógicas, adaptações ou encaminhamentos foram realizados?" rows={3} value={riaForm.estrategiasAdotadas} onChange={e => setRiaForm(f => ({ ...f, estrategiasAdotadas: e.target.value }))} />
              </div>
              <div>
                <Label>Encaminhamentos</Label>
                <Textarea placeholder="Encaminhamentos para família, especialistas, serviços de saúde, etc." rows={2} value={riaForm.encaminhamentos} onChange={e => setRiaForm(f => ({ ...f, encaminhamentos: e.target.value }))} />
              </div>
              <div>
                <Label>Resultado Observado</Label>
                <Textarea placeholder="Descreva os resultados observados após as intervenções..." rows={2} value={riaForm.resultadoObservado} onChange={e => setRiaForm(f => ({ ...f, resultadoObservado: e.target.value }))} />
              </div>
              <div>
                <Label>Próxima Avaliação</Label>
                <Input placeholder="Data ou período da próxima avaliação" value={riaForm.proximaAvaliacao} onChange={e => setRiaForm(f => ({ ...f, proximaAvaliacao: e.target.value }))} />
              </div>
              {criancaAtualRia && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center">
                    <UserCircle className="h-7 w-7 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-purple-800">{criancaAtualRia.firstName} {criancaAtualRia.lastName}</p>
                    <p className="text-xs text-purple-600">{criancaAtualRia.idade} meses</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button onClick={salvarRia} disabled={saving} className="flex-1 bg-purple-600 hover:bg-purple-700">
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
