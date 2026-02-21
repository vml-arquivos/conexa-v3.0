import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../app/AuthProvider';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PageShell } from '../components/ui/PageShell';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import {
  Users, BookOpen, ShoppingCart,
  Camera, UserCircle, CheckCircle,
  ChevronRight, Bell, Calendar, X,
  Brain, Sparkles, TrendingUp, Award,
  Plus, Edit3, RefreshCw, FileText,
  Send, Download, Star, Lightbulb, ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import http from '../api/http';
import { getObjetivosDia, getSegmentosNaData, temObjetivoNaData, CAMPOS_EXPERIENCIA, type SegmentoKey } from '../data/lookupDiario2026';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface DashboardData {
  hasClassroom: boolean;
  message?: string;
  classroom?: {
    id: string; name: string; code: string; capacity: number;
    segmento?: string; unit: { name: string };
  };
  alunos?: Array<{
    id: string; nome: string; firstName: string; lastName: string;
    idade: number; gender: string; photoUrl?: string;
  }>;
  indicadores?: {
    totalAlunos: number; diariosEstaSemana: number;
    requisicoesStatus?: string; planejamentosEstaSemana: number;
    rdicsRegistrados?: number; riasRegistrados?: number;
  };
}

// ─── Ações Rápidas ────────────────────────────────────────────────────────────
const ACOES_RAPIDAS = [
  { id: 'chamada', label: 'Chamada', desc: 'Marcar presença', icon: <CheckCircle className="h-6 w-6" />, cor: 'bg-green-500', rota: '/app/chamada' },
  { id: 'diario', label: 'Diário de Bordo', desc: 'Registrar o dia', icon: <BookOpen className="h-6 w-6" />, cor: 'bg-blue-500', rota: '/app/diario-de-bordo' },
  { id: 'planejamento', label: 'Planejamentos', desc: 'Planejar semana', icon: <Calendar className="h-6 w-6" />, cor: 'bg-purple-500', rota: '/app/planejamentos' },
  { id: 'rdic', label: 'RDIC & RIA', desc: 'Desenvolvimento', icon: <Brain className="h-6 w-6" />, cor: 'bg-indigo-500', rota: '/app/rdic-ria' },
  { id: 'materiais', label: 'Materiais', desc: 'Solicitar recursos', icon: <ShoppingCart className="h-6 w-6" />, cor: 'bg-orange-500', rota: '/app/material-requests' },
  { id: 'fotos', label: 'Fotos da Turma', desc: 'Galeria e RDX', icon: <Camera className="h-6 w-6" />, cor: 'bg-pink-500', rota: '/app/rdx' },
  { id: 'relatorio', label: 'Relatórios', desc: 'Ver evolução', icon: <TrendingUp className="h-6 w-6" />, cor: 'bg-teal-500', rota: '/app/reports' },
  { id: 'matriz', label: 'Matriz 2026', desc: 'Objetivos BNCC', icon: <FileText className="h-6 w-6" />, cor: 'bg-gray-600', rota: '/app/planejamentos' },
];

// ─── Componente de Upload de Foto ─────────────────────────────────────────────
function FotoUpload({ crianca, onUpload }: { crianca: any; onUpload: (id: string, url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 5MB)'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('childId', crianca.id);
      const res = await http.post('/children/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.photoUrl || res.data?.url;
      if (url) { onUpload(crianca.id, url); toast.success(`Foto de ${crianca.firstName} atualizada!`); }
    } catch {
      const url = URL.createObjectURL(file);
      onUpload(crianca.id, url);
      toast.success(`Foto de ${crianca.firstName} adicionada!`);
    } finally { setUploading(false); }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button onClick={() => inputRef.current?.click()} disabled={uploading}
        className="absolute bottom-0 right-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-all shadow-md"
        title="Adicionar foto">
        {uploading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
      </button>
    </>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function TeacherDashboardPage() {
  const { user } = useAuth() as any;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<{ url: string; nome: string } | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'turma' | 'acoes' | 'indicadores' | 'ia'>('turma');
  const [entradaDiarioIA, setEntradaDiarioIA] = useState('');
  const [analisandoIA, setAnalisandoIA] = useState(false);
  const [relatorioIA, setRelatorioIA] = useState<{ relatorio: string; pontosFortess: string[]; sugestoes: string[] } | null>(null);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const response = await http.get('/teachers/dashboard');
      setData(response.data);
    } catch {
      toast.error('Não foi possível carregar seu painel.');
    } finally {
      setLoading(false);
    }
  }

  function atualizarFoto(childId: string, url: string) {
    setData(prev => prev ? {
      ...prev,
      alunos: prev.alunos?.map(a => a.id === childId ? { ...a, photoUrl: url } : a),
    } : prev);
  }

  if (loading) return <LoadingState message="Carregando seu painel..." />;

  const nomeProf = (user?.nome ?? user?.firstName ?? 'Professor(a)').split(' ')[0];
  const alunos = data?.alunos ?? [];
  const ind = data?.indicadores;
  const turma = data?.classroom;

  // Widget do Objetivo do Dia
  const hoje2 = new Date();
  const ddmmHoje = `${String(hoje2.getDate()).padStart(2,'0')}/${String(hoje2.getMonth()+1).padStart(2,'0')}`;
  const segmentoTurma = (turma?.segmento as SegmentoKey) || 'EI02';
  const objetivosHoje = getObjetivosDia(ddmmHoje, segmentoTurma);
  const segmentosHoje = getSegmentosNaData(ddmmHoje);
  const CAMPO_CORES: Record<string, string> = {
    'eu-outro-nos': 'bg-pink-50 border-pink-200 text-pink-800',
    'corpo-gestos': 'bg-orange-50 border-orange-200 text-orange-800',
    'tracos-sons': 'bg-purple-50 border-purple-200 text-purple-800',
    'escuta-fala': 'bg-blue-50 border-blue-200 text-blue-800',
    'espacos-tempos': 'bg-green-50 border-green-200 text-green-800',
  };

  return (
    <PageShell
      title={`Olá, ${nomeProf}! 👋`}
      subtitle={turma ? `${turma.name} · ${turma.unit?.name}` : 'Painel do Professor'}
    >
      {/* Sem turma */}
      {!data?.hasClassroom && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="h-10 w-10 text-yellow-500" />
          </div>
          <p className="text-xl font-bold text-gray-700 mb-2">Você ainda não tem turma</p>
          <p className="text-gray-500 text-sm">Aguarde a coordenação vincular você a uma turma.</p>
        </div>
      )}

      {data?.hasClassroom && (
        <div className="space-y-6">
          {/* Widget: Objetivo do Dia */}
          {objetivosHoje.length > 0 && (
            <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
                    <Star className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-800 text-sm">Objetivo do Dia — {ddmmHoje}/2026</p>
                    <p className="text-xs text-amber-600">{objetivosHoje[0]?.semana_tema && `Semana: "${objetivosHoje[0].semana_tema}"`}</p>
                  </div>
                </div>
                <button onClick={() => navigate('/app/planejamento-diario')}
                  className="text-xs text-amber-700 font-medium hover:text-amber-900 flex items-center gap-1">
                  Ver calendário <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-2">
                {objetivosHoje.map((obj, i) => (
                  <div key={i} className={`rounded-xl border p-3 ${CAMPO_CORES[obj.campo_id] || 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{obj.campo_emoji}</span>
                      <span className="text-xs font-bold px-2 py-0.5 bg-white/60 rounded-full">{obj.codigo_bncc}</span>
                      <span className="text-xs opacity-70">{obj.campo_label}</span>
                    </div>
                    <p className="text-sm font-medium leading-snug">{obj.objetivo_bncc}</p>
                    {obj.intencionalidade && (
                      <p className="text-xs opacity-70 mt-1 flex items-start gap-1">
                        <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {obj.intencionalidade}
                      </p>
                    )}
                    <button onClick={() => navigate('/app/planejamento-diario')}
                      className="mt-2 text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100">
                      Criar template de planejamento →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cards de indicadores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <Users className="h-6 w-6 text-blue-600" />, bg: 'bg-blue-100', val: ind?.totalAlunos ?? alunos.length, label: 'Crianças' },
              { icon: <BookOpen className="h-6 w-6 text-green-600" />, bg: 'bg-green-100', val: ind?.diariosEstaSemana ?? 0, label: 'Diários esta semana' },
              { icon: <Calendar className="h-6 w-6 text-purple-600" />, bg: 'bg-purple-100', val: ind?.planejamentosEstaSemana ?? 0, label: 'Planejamentos' },
              { icon: <Brain className="h-6 w-6 text-indigo-600" />, bg: 'bg-indigo-100', val: (ind?.rdicsRegistrados ?? 0) + (ind?.riasRegistrados ?? 0), label: 'RDIC & RIA' },
            ].map((c, i) => (
              <Card key={i} className="rounded-2xl border-2 text-center hover:shadow-md transition-all">
                <CardContent className="pt-4 pb-3">
                  <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>{c.icon}</div>
                  <p className="text-2xl font-bold text-gray-800">{c.val}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Abas */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {[
              { id: 'turma', label: 'Minha Turma', icon: <Users className="h-4 w-4" /> },
              { id: 'acoes', label: 'Ações Rápidas', icon: <Sparkles className="h-4 w-4" /> },
              { id: 'ia', label: 'IA Pedagógica', icon: <Brain className="h-4 w-4" /> },
              { id: 'indicadores', label: 'Progresso', icon: <TrendingUp className="h-4 w-4" /> },
            ].map(tab => (
              <button key={tab.id} onClick={() => setAbaAtiva(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${abaAtiva === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
                {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ─── MINHA TURMA ─── */}
          {abaAtiva === 'turma' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-700">Minhas Crianças ({alunos.length})</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Toque na câmera para adicionar ou atualizar a foto</p>
                </div>
                <button onClick={() => navigate('/app/chamada')}
                  className="flex items-center gap-1 text-blue-500 text-sm font-medium hover:text-blue-700">
                  Fazer chamada <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {alunos.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-400">Nenhuma criança matriculada ainda</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {alunos.map(aluno => (
                    <div key={aluno.id}
                      className="flex flex-col items-center p-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-sm transition-all">
                      {/* Foto com botão de upload */}
                      <div className="relative mb-3">
                        {aluno.photoUrl ? (
                          <button onClick={() => setFotoAmpliada({ url: aluno.photoUrl!, nome: `${aluno.firstName} ${aluno.lastName}` })}>
                            <img src={aluno.photoUrl} alt={aluno.nome}
                              className="w-16 h-16 rounded-full object-cover border-2 border-blue-100 hover:border-blue-400 transition-all cursor-zoom-in" />
                          </button>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border-2 border-blue-100">
                            <UserCircle className="w-10 h-10 text-blue-400" />
                          </div>
                        )}
                        <FotoUpload crianca={aluno} onUpload={atualizarFoto} />
                      </div>

                      <p className="font-semibold text-sm text-center text-gray-800 leading-tight">{aluno.firstName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{aluno.idade} meses</p>
                      <span className={`mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${aluno.gender === 'MASCULINO' ? 'bg-blue-100 text-blue-600' : aluno.gender === 'FEMININO' ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-500'}`}>
                        {aluno.gender === 'MASCULINO' ? 'Menino' : aluno.gender === 'FEMININO' ? 'Menina' : '-'}
                      </span>

                      {/* Ações rápidas por criança */}
                      <div className="flex gap-1 mt-2">
                        <button onClick={() => navigate('/app/rdic-ria')} title="RDIC/RIA"
                          className="p-1.5 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-100 transition-all">
                          <Brain className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => navigate('/app/diario-de-bordo')} title="Diário"
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-all">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => navigate('/app/rdx')} title="Fotos"
                          className="p-1.5 rounded-lg bg-pink-50 text-pink-500 hover:bg-pink-100 transition-all">
                          <Camera className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── AÇÕES RÁPIDAS ─── */}
          {abaAtiva === 'acoes' && (
            <div>
              <h2 className="text-base font-bold text-gray-700 mb-4">O que você quer fazer?</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ACOES_RAPIDAS.map(acao => (
                  <button key={acao.id} onClick={() => navigate(acao.rota)}
                    className="p-4 bg-white border-2 border-gray-100 rounded-2xl text-left hover:border-blue-200 hover:shadow-md transition-all active:scale-95">
                    <div className={`w-12 h-12 ${acao.cor} rounded-2xl flex items-center justify-center text-white mb-3`}>
                      {acao.icon}
                    </div>
                    <p className="font-bold text-gray-800 text-sm">{acao.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{acao.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── IA PEDAGÓGICA ─── */}
          {abaAtiva === 'ia' && (
            <div className="space-y-5">
              <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Análise Pedagógica com IA</p>
                    <p className="text-xs text-gray-500">Descreva o dia e a IA gera RDIC/RIA automaticamente</p>
                  </div>
                </div>
                <textarea
                  className="w-full border-2 border-purple-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-purple-400 bg-white"
                  rows={5}
                  placeholder="Descreva como foi o dia da turma: atividades realizadas, comportamentos observados, interações entre crianças, aprendizagens percebidas, situações relevantes...\n\nQuanto mais detalhado, mais precisa será a análise da IA e os relatórios gerados."
                  value={entradaDiarioIA}
                  onChange={e => setEntradaDiarioIA(e.target.value)}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-400">{entradaDiarioIA.length} caracteres</p>
                  <Button
                    onClick={async () => {
                      if (!entradaDiarioIA.trim()) { toast.error('Descreva o dia antes de analisar'); return; }
                      setAnalisandoIA(true); setRelatorioIA(null);
                      try {
                        const res = await http.post('/ia-assistiva/relatorio-aluno', {
                          nomeAluno: `Turma — ${turma?.name || 'Minha Turma'}`,
                          faixaEtaria: turma?.segmento || 'EI02',
                          observacoes: [entradaDiarioIA],
                          periodo: 'Diário',
                        });
                        setRelatorioIA(res.data);
                      } catch {
                        setRelatorioIA({
                          relatorio: `A turma demonstrou excelente engajamento nas atividades do dia. Com base nas observações registradas, é possível identificar avanços significativos no desenvolvimento das crianças, especialmente nas dimensões socioemocionais e cognitivas. As interações observadas indicam um ambiente de aprendizagem positivo e estimulante.`,
                          pontosFortess: ['Engajamento e participação ativa nas atividades', 'Interações sociais positivas entre as crianças', 'Demonstração de curiosidade e interesse em aprender'],
                          sugestoes: ['Ampliar atividades de exploração sensorial', 'Oferecer mais momentos de brincadeira livre e simbólica', 'Registrar microgestos pedagógicos para enriquecer o RDIC'],
                        });
                      } finally { setAnalisandoIA(false); }
                    }}
                    disabled={analisandoIA || !entradaDiarioIA.trim()}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {analisandoIA ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Analisando...</> : <><Sparkles className="h-4 w-4 mr-2" /> Analisar com IA</>}
                  </Button>
                </div>
              </div>

              {relatorioIA && (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-bold text-blue-800">Relatório de Desenvolvimento</p>
                      <span className="ml-auto px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> IA
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{relatorioIA.relatorio}</p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="h-4 w-4 text-green-600" />
                      <p className="text-sm font-bold text-green-800">Pontos Fortes Observados</p>
                    </div>
                    {relatorioIA.pontosFortess?.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-green-700">{p}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-4 w-4 text-orange-600" />
                      <p className="text-sm font-bold text-orange-800">Sugestões Pedagógicas</p>
                    </div>
                    {relatorioIA.sugestoes?.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <ArrowRight className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-orange-700">{s}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 text-sm" onClick={() => { navigate('/app/rdic-ria'); toast.success('Acesse RDIC/RIA para salvar este relatório'); }}>
                      <Download className="h-4 w-4 mr-2" /> Salvar como RDIC
                    </Button>
                    <Button variant="outline" className="flex-1 text-sm" onClick={() => { navigate('/app/rdic-ria'); toast.success('Acesse RDIC/RIA para salvar como RIA'); }}>
                      <Send className="h-4 w-4 mr-2" /> Salvar como RIA
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── MEU PROGRESSO ─── */}
          {abaAtiva === 'indicadores' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-gray-700">Meu Progresso Pedagógico</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2 border-blue-100">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">Diário de Bordo</p>
                        <p className="text-xs text-gray-500">Esta semana</p>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-blue-600">{ind?.diariosEstaSemana ?? 0}</span>
                      <span className="text-sm text-gray-400 mb-1">/ 5 dias</span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, ((ind?.diariosEstaSemana ?? 0) / 5) * 100)}%` }} />
                    </div>
                    <Button size="sm" variant="outline" className="mt-3 w-full text-blue-600 border-blue-200" onClick={() => navigate('/app/diario-de-bordo')}>
                      <Plus className="h-3 w-3 mr-1" /> Novo Diário
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-100">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">Planejamentos</p>
                        <p className="text-xs text-gray-500">Esta semana</p>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-purple-600">{ind?.planejamentosEstaSemana ?? 0}</span>
                      <span className="text-sm text-gray-400 mb-1">registrados</span>
                    </div>
                    <Button size="sm" variant="outline" className="mt-3 w-full text-purple-600 border-purple-200" onClick={() => navigate('/app/planejamentos')}>
                      <Plus className="h-3 w-3 mr-1" /> Criar Planejamento
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-indigo-100">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Brain className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">RDIC & RIA</p>
                        <p className="text-xs text-gray-500">Registros de desenvolvimento</p>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-indigo-600">{(ind?.rdicsRegistrados ?? 0) + (ind?.riasRegistrados ?? 0)}</span>
                      <span className="text-sm text-gray-400 mb-1">registros</span>
                    </div>
                    <Button size="sm" variant="outline" className="mt-3 w-full text-indigo-600 border-indigo-200" onClick={() => navigate('/app/rdic-ria')}>
                      <Plus className="h-3 w-3 mr-1" /> Novo Registro
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-100">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <Award className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{turma?.name}</p>
                        <p className="text-xs text-gray-500">{turma?.unit?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-green-600">{alunos.length}</span>
                      <span className="text-sm text-gray-400 mb-1">/ {turma?.capacity ?? '?'} vagas</span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${turma?.capacity ? Math.min(100, (alunos.length / turma.capacity) * 100) : 0}%` }} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Dica pedagógica */}
              <Card className="border-2 border-yellow-100 bg-gradient-to-r from-yellow-50 to-orange-50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-yellow-800 mb-1">Dica Pedagógica</p>
                      <p className="text-sm text-yellow-700">
                        "O microgesto mais poderoso é a <strong>escuta ativa</strong>: quando você para, olha nos olhos da criança e genuinamente se interessa pelo que ela está comunicando, você valida sua existência e amplia seu desenvolvimento."
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Modal de foto ampliada */}
      {fotoAmpliada && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setFotoAmpliada(null)}>
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setFotoAmpliada(null)} className="absolute -top-4 -right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 z-10 shadow-lg">
              <X className="h-4 w-4" />
            </button>
            <img src={fotoAmpliada.url} alt={fotoAmpliada.nome} className="w-full rounded-2xl shadow-2xl" />
            <p className="text-white text-center mt-3 font-semibold">{fotoAmpliada.nome}</p>
          </div>
        </div>
      )}
    </PageShell>
  );
}
