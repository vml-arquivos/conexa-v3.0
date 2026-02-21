import { useState, useEffect } from 'react';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { LoadingState } from '../components/ui/LoadingState';
import http from '../api/http';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, TrendingUp, ShoppingCart,
  BookOpen, ClipboardList, CheckCircle, AlertCircle,
  ChevronRight, BarChart2, Network, Star, Layers, Calendar, ArrowRight,
} from 'lucide-react';
import { LOOKUP_DIARIO_2026, CAMPOS_EXPERIENCIA, SEGMENTOS, type SegmentoKey } from '../data/lookupDiario2026';

interface UnidadeResumo {
  id: string; nome: string;
  totalTurmas: number; totalAlunos: number; totalProfessores: number;
  taxaPresenca: number; requisicoesAbertas: number;
  planejamentosOk: boolean; diariosEstaSemana: number;
  status: 'otimo' | 'atencao' | 'critico';
}
interface DashboardGeral {
  totalUnidades: number; totalAlunos: number; totalProfessores: number;
  mediaPresenca: number; requisicoesAbertas: number;
  unidades: UnidadeResumo[];
}
const STATUS_CONFIG = {
  otimo: { label: 'Otimo', cor: 'bg-green-100 text-green-700 border-green-300', dot: 'bg-green-500', barCor: 'bg-green-500' },
  atencao: { label: 'Atencao', cor: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-500', barCor: 'bg-yellow-500' },
  critico: { label: 'Critico', cor: 'bg-red-100 text-red-700 border-red-300', dot: 'bg-red-500', barCor: 'bg-red-500' },
};
const DEMO: DashboardGeral = {
  totalUnidades: 4, totalAlunos: 312, totalProfessores: 28, mediaPresenca: 87, requisicoesAbertas: 5,
  unidades: [
    { id:'1', nome:'Unidade Centro', totalTurmas:6, totalAlunos:89, totalProfessores:8, taxaPresenca:92, requisicoesAbertas:1, planejamentosOk:true, diariosEstaSemana:12, status:'otimo' },
    { id:'2', nome:'Unidade Norte', totalTurmas:5, totalAlunos:74, totalProfessores:7, taxaPresenca:78, requisicoesAbertas:3, planejamentosOk:false, diariosEstaSemana:8, status:'atencao' },
    { id:'3', nome:'Unidade Sul', totalTurmas:4, totalAlunos:61, totalProfessores:6, taxaPresenca:95, requisicoesAbertas:0, planejamentosOk:true, diariosEstaSemana:9, status:'otimo' },
    { id:'4', nome:'Unidade Leste', totalTurmas:6, totalAlunos:88, totalProfessores:7, taxaPresenca:65, requisicoesAbertas:1, planejamentosOk:false, diariosEstaSemana:4, status:'critico' },
  ],
};

export default function DashboardCoordenacaoGeralPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardGeral>(DEMO);
  const [filtro, setFiltro] = useState<'todas'|'otimo'|'atencao'|'critico'>('todas');
  const [abaAtiva, setAbaAtiva] = useState<'visao'|'unidades'|'relatorio'|'matriz'>('visao');

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const res = await http.get('/coordenacao/dashboard/geral');
      const d = res.data ?? {};
      // Map API response (indicadoresGerais + consolidadoUnidades) to local shape
      if (d.indicadoresGerais && Array.isArray(d.consolidadoUnidades)) {
        const ind = d.indicadoresGerais;
        const mapped: DashboardGeral = {
          totalUnidades: ind.totalUnidades ?? 0,
          totalAlunos: ind.totalAlunos ?? 0,
          totalProfessores: ind.totalProfessores ?? 0,
          mediaPresenca: 0,
          requisicoesAbertas: ind.requisicoesPendentes ?? 0,
          unidades: (d.consolidadoUnidades as any[]).map((u: any) => ({
            id: u.id,
            nome: u.nome,
            totalTurmas: u.totalTurmas ?? 0,
            totalAlunos: u.totalAlunos ?? 0,
            totalProfessores: u.totalProfessores ?? 0,
            taxaPresenca: u.coberturaChamada ?? 0,
            requisicoesAbertas: u.requisicoesPendentes ?? 0,
            planejamentosOk: (u.planejamentosRascunho ?? 0) === 0,
            diariosEstaSemana: u.diariosHoje ?? 0,
            status: u.coberturaChamada >= 90 && u.requisicoesPendentes === 0 ? 'otimo'
                  : u.coberturaChamada < 50 || u.requisicoesPendentes >= 3 ? 'critico'
                  : 'atencao',
          })),
        };
        setDashboard(mapped);
      }
    } catch { /* mantém DEMO */ }
    finally { setLoading(false); }
  }

  if (loading) return <LoadingState message="Carregando painel geral da rede..." />;

  const unidadesFiltradas = filtro === 'todas' ? (dashboard.unidades ?? []) : (dashboard.unidades ?? []).filter(u => u.status === filtro);
  const abas = [
    { id:'visao', label:'Visao Geral', icon:<Star className="h-4 w-4"/> },
    { id:'unidades', label:'Por Unidade', icon:<Building2 className="h-4 w-4"/> },
    { id:'relatorio', label:'Relatorio', icon:<BarChart2 className="h-4 w-4"/> },
    { id:'matriz', label:'Matriz 2026', icon:<Layers className="h-4 w-4"/> },
  ] as const;
  const filtros = [
    { id:'todas', label:'Todas', count:(dashboard.unidades ?? []).length },
    { id:'otimo', label:'Otimo', count:(dashboard.unidades ?? []).filter(u=>u.status==='otimo').length },
    { id:'atencao', label:'Atencao', count:(dashboard.unidades ?? []).filter(u=>u.status==='atencao').length },
    { id:'critico', label:'Critico', count:(dashboard.unidades ?? []).filter(u=>u.status==='critico').length },
  ] as const;

  return (
    <PageShell title="Coordenacao Geral da Rede" description="Acompanhe todas as unidades em um so lugar">
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-2xl overflow-x-auto">
        {abas.map(aba => (
          <button key={aba.id} onClick={() => setAbaAtiva(aba.id as typeof abaAtiva)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${abaAtiva===aba.id?'bg-white text-blue-600 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            {aba.icon}{aba.label}
          </button>
        ))}
      </div>

      {abaAtiva === 'visao' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {icon:<Building2 className="h-6 w-6 text-blue-600"/>,bg:'bg-blue-100',val:dashboard.totalUnidades,label:'Unidades'},
              {icon:<Users className="h-6 w-6 text-purple-600"/>,bg:'bg-purple-100',val:dashboard.totalAlunos,label:'Criancas na rede'},
              {icon:<Star className="h-6 w-6 text-yellow-600"/>,bg:'bg-yellow-100',val:dashboard.totalProfessores,label:'Professores'},
              {icon:<TrendingUp className="h-6 w-6 text-green-600"/>,bg:'bg-green-100',val:`${dashboard.mediaPresenca}%`,label:'Presenca media'},
            ].map((c,i)=>(
              <Card key={i} className="rounded-2xl border-2 text-center">
                <CardContent className="pt-5 pb-4">
                  <div className={`w-12 h-12 ${c.bg} rounded-2xl flex items-center justify-center mx-auto mb-3`}>{c.icon}</div>
                  <p className="text-3xl font-bold text-gray-800">{c.val}</p>
                  <p className="text-sm text-gray-500 mt-1">{c.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-2xl border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="h-5 w-5 text-blue-500"/>Como estao as unidades hoje?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(dashboard.unidades ?? []).map(u=>{
                const cfg=STATUS_CONFIG[u.status];
                return (
                  <div key={u.id} className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`}/>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold">{u.nome}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.cor}`}>{cfg.label}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full ${cfg.barCor}`} style={{width:`${u.taxaPresenca}%`}}/>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{u.taxaPresenca}% de presenca · {u.totalAlunos} criancas</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {(dashboard.unidades ?? []).some(u=>u.status!=='otimo') && (
            <Card className="rounded-2xl border-2 border-orange-200 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-orange-800">
                  <AlertCircle className="h-5 w-5"/>Unidades que precisam de atencao
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(dashboard.unidades ?? []).filter(u=>u.status!=='otimo').map(u=>(
                  <div key={u.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-orange-200">
                    <div>
                      <p className="font-semibold text-sm">{u.nome}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        {u.taxaPresenca<80 && <span>Presenca baixa ({u.taxaPresenca}%)</span>}
                        {!u.planejamentosOk && <span>Planejamentos pendentes</span>}
                        {u.requisicoesAbertas>0 && <span>{u.requisicoesAbertas} pedido(s) aberto(s)</span>}
                      </div>
                    </div>
                    <button onClick={()=>{setFiltro(u.status);setAbaAtiva('unidades');}}
                      className="flex items-center gap-1 text-blue-500 text-sm font-medium hover:text-blue-700">
                      Ver <ChevronRight className="h-4 w-4"/>
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {abaAtiva === 'unidades' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {filtros.map(f=>(
              <button key={f.id} onClick={()=>setFiltro(f.id as typeof filtro)}
                className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${filtro===f.id?'bg-blue-500 text-white border-blue-500':'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                {f.label} ({f.count})
              </button>
            ))}
          </div>
          {unidadesFiltradas.map(u=>{
            const cfg=STATUS_CONFIG[u.status];
            return (
              <Card key={u.id} className={`rounded-2xl border-2 overflow-hidden ${u.status==='critico'?'border-red-300':u.status==='atencao'?'border-yellow-300':'border-green-200'}`}>
                <div className={`px-4 py-2 flex items-center justify-between ${u.status==='critico'?'bg-red-50':u.status==='atencao'?'bg-yellow-50':'bg-green-50'}`}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-600"/>
                    <span className="font-bold text-sm">{u.nome}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${cfg.cor}`}>{cfg.label}</span>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-800">{u.totalAlunos}</p>
                      <p className="text-xs text-gray-500">Criancas</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-800">{u.totalTurmas}</p>
                      <p className="text-xs text-gray-500">Turmas</p>
                    </div>
                    <div className={`text-center p-3 rounded-xl ${u.taxaPresenca>=85?'bg-green-50':u.taxaPresenca>=70?'bg-yellow-50':'bg-red-50'}`}>
                      <p className={`text-2xl font-bold ${u.taxaPresenca>=85?'text-green-700':u.taxaPresenca>=70?'text-yellow-700':'text-red-700'}`}>{u.taxaPresenca}%</p>
                      <p className="text-xs text-gray-500">Presenca</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${u.planejamentosOk?'bg-green-50 text-green-700 border-green-200':'bg-red-50 text-red-700 border-red-200'}`}>
                      {u.planejamentosOk?<CheckCircle className="h-3 w-3"/>:<AlertCircle className="h-3 w-3"/>}
                      Planejamentos {u.planejamentosOk?'ok':'pendentes'}
                    </span>
                    <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
                      <ClipboardList className="h-3 w-3"/>{u.diariosEstaSemana} diarios esta semana
                    </span>
                    {u.requisicoesAbertas>0 && (
                      <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border bg-orange-50 text-orange-700 border-orange-200">
                        <ShoppingCart className="h-3 w-3"/>{u.requisicoesAbertas} pedido(s) aberto(s)
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {abaAtiva === 'relatorio' && (
        <div className="space-y-4">
          <Card className="rounded-2xl border-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-blue-500"/>Ranking de Presenca por Unidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[...(dashboard.unidades ?? [])].sort((a,b)=>b.taxaPresenca-a.taxaPresenca).map((u,idx)=>{
                const cfg=STATUS_CONFIG[u.status];
                return (
                  <div key={u.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx===0?'bg-yellow-400 text-white':idx===1?'bg-gray-300 text-white':idx===2?'bg-orange-400 text-white':'bg-gray-100 text-gray-600'}`}>{idx+1}</span>
                        <span className="text-sm font-semibold">{u.nome}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{u.taxaPresenca}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className={`h-3 rounded-full ${cfg.barCor}`} style={{width:`${u.taxaPresenca}%`}}/>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-500"/>Diarios registrados esta semana
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(dashboard.unidades ?? []).map(u=>(
                <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium">{u.nome}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {Array.from({length:Math.min(u.diariosEstaSemana,10)}).map((_,i)=>(
                        <span key={i} className="w-3 h-3 bg-blue-400 rounded-sm"/>
                      ))}
                      {u.diariosEstaSemana>10 && <span className="text-xs text-gray-500">+{u.diariosEstaSemana-10}</span>}
                    </div>
                    <span className="text-sm font-bold text-blue-600">{u.diariosEstaSemana}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── ABA MATRIZ 2026 ─── */}
      {abaAtiva === 'matriz' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Cobertura da Matriz Pedagógica 2026</h2>
              <p className="text-sm text-gray-500">Sequência Pedagógica Piloto — objetivos por segmento e campo de experiência</p>
            </div>
            <button onClick={() => navigate('/app/planejamento-diario')}
              className="flex items-center gap-1 text-indigo-600 text-sm font-medium hover:text-indigo-800">
              Calendário completo <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Resumo por segmento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SEGMENTOS.map(seg => {
              const total = Object.values(LOOKUP_DIARIO_2026).reduce((acc, d) => acc + (d[seg.id as SegmentoKey]?.length || 0), 0);
              const SEG_CORES: Record<string, string> = { EI01: 'bg-rose-50 border-rose-200', EI02: 'bg-amber-50 border-amber-200', EI03: 'bg-emerald-50 border-emerald-200' };
              const SEG_TEXT: Record<string, string> = { EI01: 'text-rose-700', EI02: 'text-amber-700', EI03: 'text-emerald-700' };
              const SEG_BAR: Record<string, string> = { EI01: 'bg-rose-400', EI02: 'bg-amber-400', EI03: 'bg-emerald-400' };
              return (
                <Card key={seg.id} className={`border-2 ${SEG_CORES[seg.id]}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-bold text-sm ${SEG_TEXT[seg.id]}`}>{seg.label}</span>
                      <span className="text-xs text-gray-500">{seg.faixa}</span>
                    </div>
                    <div className="flex items-end gap-2 mb-3">
                      <span className={`text-3xl font-bold ${SEG_TEXT[seg.id]}`}>{total}</span>
                      <span className="text-sm text-gray-400 mb-1">objetivos previstos</span>
                    </div>
                    <div className="space-y-1.5">
                      {CAMPOS_EXPERIENCIA.map(campo => {
                        const qtd = Object.values(LOOKUP_DIARIO_2026).reduce((acc, d) => acc + (d[seg.id as SegmentoKey]?.filter((o: any) => o.campo_id === campo.id).length || 0), 0);
                        const pct = total > 0 ? Math.round((qtd / total) * 100) : 0;
                        return (
                          <div key={campo.id}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-gray-600">{campo.emoji} {campo.label.split(',')[0]}</span>
                              <span className="text-gray-500">{qtd} ({pct}%)</span>
                            </div>
                            <div className="h-1.5 bg-white/80 rounded-full">
                              <div className={`h-1.5 rounded-full ${SEG_BAR[seg.id]}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Próximos objetivos da semana */}
          <Card className="border-2 border-indigo-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-500" /> Objetivos dos próximos 7 dias (todas as turmas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Data</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Segmentos</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Campo</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Código BNCC</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Tema da Semana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const hoje = new Date();
                      const linhas: React.ReactNode[] = [];
                      for (let i = 0; i < 7; i++) {
                        const d = new Date(hoje); d.setDate(hoje.getDate() + i);
                        const ddmm = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
                        const entrada = LOOKUP_DIARIO_2026[ddmm];
                        if (!entrada) continue;
                        const segs = Object.keys(entrada) as SegmentoKey[];
                        const primeiroObj = entrada[segs[0]]?.[0];
                        if (!primeiroObj) continue;
                        const CAMPO_BADGE: Record<string, string> = {
                          'eu-outro-nos': 'bg-pink-100 text-pink-700',
                          'corpo-gestos': 'bg-orange-100 text-orange-700',
                          'tracos-sons': 'bg-purple-100 text-purple-700',
                          'escuta-fala': 'bg-blue-100 text-blue-700',
                          'espacos-tempos': 'bg-green-100 text-green-700',
                        };
                        linhas.push(
                          <tr key={ddmm} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium">
                              {ddmm}/{d.getFullYear()}
                              {d.toDateString() === hoje.toDateString() && <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Hoje</span>}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex gap-1 flex-wrap">
                                {segs.map(s => (
                                  <span key={s} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                    s === 'EI01' ? 'bg-rose-100 text-rose-700' :
                                    s === 'EI02' ? 'bg-amber-100 text-amber-700' :
                                    'bg-emerald-100 text-emerald-700'
                                  }`}>{s}</span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${CAMPO_BADGE[(primeiroObj as any).campo_id] || 'bg-gray-100 text-gray-600'}`}>
                                {(primeiroObj as any).campo_emoji} {(primeiroObj as any).campo_label}
                              </span>
                            </td>
                            <td className="py-2 px-3"><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{(primeiroObj as any).codigo_bncc}</span></td>
                            <td className="py-2 px-3 text-xs text-gray-600 max-w-[200px] truncate">{(primeiroObj as any).semana_tema}</td>
                          </tr>
                        );
                      }
                      return linhas.length > 0 ? linhas : (
                        <tr><td colSpan={5} className="py-6 text-center text-gray-400 text-sm">Nenhum objetivo previsto nos próximos 7 dias</td></tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 pt-3 border-t flex justify-end">
                <button onClick={() => navigate('/app/planejamento-diario')}
                  className="flex items-center gap-1 text-indigo-600 text-sm font-medium hover:text-indigo-800">
                  Ver calendário pedagógico completo <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
