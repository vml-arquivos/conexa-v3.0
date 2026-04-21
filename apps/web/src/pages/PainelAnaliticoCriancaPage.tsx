import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
} from 'recharts';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import http from '../api/http';
import { Brain, BookOpen, ArrowLeft, RefreshCw, Activity, TrendingUp, BarChart2, Award, ChevronRight, AlertCircle } from 'lucide-react';

const DIMENSOES = [
  { id: 'eu-outro-nos',   short: 'Eu e o Nós',  cor: '#ec4899' },
  { id: 'corpo-gestos',   short: 'Corpo',        cor: '#f97316' },
  { id: 'tracos-sons',    short: 'Arte',         cor: '#a855f7' },
  { id: 'escuta-fala',    short: 'Linguagem',    cor: '#3b82f6' },
  { id: 'espacos-tempos', short: 'Matemática',   cor: '#22c55e' },
] as const;

const NIVEL_COR: Record<string, string> = {
  NAO_OBSERVADO: '#e5e7eb', EM_DESENVOLVIMENTO: '#fde68a', CONSOLIDADO: '#86efac', AMPLIADO: '#93c5fd',
};

const DIARY_CORES = ['#6366f1','#22c55e','#f59e0b','#ef4444','#f97316','#06b6d4','#8b5cf6','#ec4899','#6b7280','#3b82f6','#9ca3af'];
const DIARY_LABELS: Record<string, string> = {
  ATIVIDADE_PEDAGOGICA:'Pedagógica', DESENVOLVIMENTO:'Desenvolvimento', COMPORTAMENTO:'Comportamento',
  SAUDE:'Saúde', REFEICAO:'Refeição', HIGIENE:'Higiene', SONO:'Sono',
  FAMILIA:'Família', OBSERVACAO:'Observação', AVALIACAO:'Avaliação', OUTRO:'Outro',
};

function parseDims(j: any) { return Array.isArray(j?.dimensoes) ? j.dimensoes : []; }
function pctCons(dims: any[], id: string) {
  const d = dims.find((x: any) => x.dimensao === id);
  if (!d?.indicadores?.length) return 0;
  return Math.round(d.indicadores.filter((i: any) => i.nivel === 'CONSOLIDADO' || i.nivel === 'AMPLIADO').length / d.indicadores.length * 100);
}
function pctED(dims: any[], id: string) {
  const d = dims.find((x: any) => x.dimensao === id);
  if (!d?.indicadores?.length) return 0;
  return Math.round(d.indicadores.filter((i: any) => i.nivel === 'EM_DESENVOLVIMENTO').length / d.indicadores.length * 100);
}
function calcularIdade(dob: string | null | undefined): string {
  if (!dob) return '—';
  try {
    const hoje = new Date(); const nasc = new Date(dob);
    if (isNaN(nasc.getTime())) return '—';
    let anos = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--;
    return anos < 1 ? `${Math.max(0,(hoje.getFullYear()-nasc.getFullYear())*12+hoje.getMonth()-nasc.getMonth())} meses` : `${anos} anos`;
  } catch { return '—'; }
}

export default function PainelAnaliticoCriancaPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [aba, setAba] = useState<'bncc'|'diario'|'microgestos'>('bncc');
  const [microgestos, setMicrogestos] = useState<any[]>([]);
  const [loadingMg, setLoadingMg] = useState(false);
  const [loadingC, setLoadingC] = useState(true);
  const [loadingD, setLoadingD] = useState(false);
  const [central, setCentral] = useState<any>(null);
  const [eventos, setEventos] = useState<any[]>([]);

  const carregarCentral = useCallback(async () => {
    if (!childId) return;
    setLoadingC(true);
    try { const r = await http.get(`/rdic/child/${childId}/central`); setCentral(r?.data ?? null); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Erro ao carregar RDIC.'); }
    finally { setLoadingC(false); }
  }, [childId]);

  const carregarDiario = useCallback(async () => {
    if (!childId) return;
    setLoadingD(true);
    try {
      const start = new Date(Date.now() - 180*24*60*60*1000).toISOString().slice(0,10);
      const r = await http.get('/diary-events', { params: { childId, startDate: start, limit: '300' } });
      setEventos(Array.isArray(r?.data) ? r.data : (r?.data?.data ?? []));
    } catch { /* silencioso */ } finally { setLoadingD(false); }
  }, [childId]);

  useEffect(() => { carregarCentral(); }, [carregarCentral]);
  useEffect(() => { if (aba === 'diario' && eventos.length === 0) carregarDiario(); }, [aba, carregarDiario, eventos.length]);

  useEffect(() => {
    if (aba !== 'microgestos' || microgestos.length > 0) return;
    setLoadingMg(true);
    http.get(`/microgesto/child/${childId}`)
      .then(r => setMicrogestos(Array.isArray(r?.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoadingMg(false));
  }, [aba, childId, microgestos.length]);

  const { radarData, evolData, distData, resumo } = useMemo(() => {
    const rdics = central?.rdics ?? [];
    const atual = rdics.find((r: any) => parseDims(r.rascunhoJson).length > 0) ?? rdics[0] ?? null;
    const dims = parseDims(atual?.rascunhoJson);
    const radarData = DIMENSOES.map(d => ({ campo: d.short, pct: pctCons(dims, d.id), pctED: pctED(dims, d.id), cor: d.cor }));
    const evolData = [1,2,3].map(t => {
      const rdic = rdics.find((r: any) => (r.periodo ?? '').includes(`${t}º Trimestre`));
      const d2 = parseDims(rdic?.rascunhoJson);
      const e: Record<string, any> = { periodo: `${t}T`, temDados: !!rdic };
      DIMENSOES.forEach(d => { e[d.short] = rdic ? pctCons(d2, d.id) : null; });
      return e;
    });
    const distData = DIMENSOES.map(d => {
      const dd = dims.find((x: any) => x.dimensao === d.id);
      const inds = dd?.indicadores ?? [];
      return { dimensao: d.short, NO: inds.filter((i: any) => i.nivel==='NAO_OBSERVADO').length, ED: inds.filter((i: any) => i.nivel==='EM_DESENVOLVIMENTO').length, C: inds.filter((i: any) => i.nivel==='CONSOLIDADO').length, A: inds.filter((i: any) => i.nivel==='AMPLIADO').length };
    });
    const todos = dims.flatMap((d: any) => d.indicadores ?? []);
    const totalCons = todos.filter((i: any) => i.nivel==='CONSOLIDADO'||i.nivel==='AMPLIADO').length;
    const pctGeral = todos.length > 0 ? Math.round(totalCons/todos.length*100) : 0;
    let tend: string|null = null;
    if (rdics.length >= 2) {
      const ant = parseDims(rdics[1]?.rascunhoJson).flatMap((d: any) => d.indicadores ?? []);
      const pa = ant.length > 0 ? Math.round(ant.filter((i: any) => i.nivel==='CONSOLIDADO'||i.nivel==='AMPLIADO').length/ant.length*100) : 0;
      tend = pctGeral > pa ? 'up' : pctGeral < pa ? 'down' : 'stable';
    }
    return { radarData, evolData, distData, resumo: { pctGeral, totalCons, totalInd: todos.length, tend, atual } };
  }, [central]);

  const { pieData, lineData, totalEvt } = useMemo(() => {
    if (!eventos.length) return { pieData: [], lineData: [], totalEvt: 0 };
    const cnt: Record<string, number> = {};
    for (const e of eventos) cnt[e.type] = (cnt[e.type]??0)+1;
    const pieData = Object.entries(cnt).map(([type, value]) => ({ name: DIARY_LABELS[type]??type, value, type })).sort((a,b)=>b.value-a.value);
    const meses: Record<string, {p:number,o:number,t:number}> = {};
    for (const e of eventos) {
      const d = new Date(e.eventDate); const day = d.getDay();
      const diff = d.getDate()-day+(day===0?-6:1); const seg = new Date(d.setDate(diff));
      const k = `${seg.getFullYear()}-${String(seg.getMonth()+1).padStart(2,'0')}`;
      if (!meses[k]) meses[k]={p:0,o:0,t:0};
      meses[k].t++;
      if (['ATIVIDADE_PEDAGOGICA','DESENVOLVIMENTO','AVALIACAO'].includes(e.type)) meses[k].p++;
      if (['COMPORTAMENTO','SAUDE','FAMILIA'].includes(e.type)||(Array.isArray(e.tags)&&e.tags.includes('ocorrencia'))) meses[k].o++;
    }
    const lineData = Object.entries(meses).sort(([a],[b])=>a.localeCompare(b)).slice(-6).map(([mes,v])=>{
      const [ano,m]=mes.split('-'); return { mes:`${m}/${ano.slice(2)}`, Pedagógico:v.p, Ocorrências:v.o, Total:v.t };
    });
    return { pieData, lineData, totalEvt: eventos.length };
  }, [eventos]);

  const nome = `${central?.child?.firstName??''} ${central?.child?.lastName??''}`.trim();
  if (loadingC) return <LoadingState message="Carregando painel analítico..." />;
  if (!central) return <PageShell title="Painel Analítico" subtitle="—"><Button variant="outline" onClick={()=>navigate(-1)} className="flex items-center gap-2"><ArrowLeft className="h-4 w-4"/>Voltar</Button></PageShell>;

  return (
    <PageShell title={`Painel Analítico — ${nome}`} subtitle={`${central?.child?.turma?.name??'—'} · ${calcularIdade(central?.child?.dateOfBirth)}`}>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button variant="outline" onClick={()=>navigate(`/app/crianca/${childId}/rdic-central`)} className="flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4"/>Central RDIC
          </Button>
          <Button variant="outline" onClick={()=>{carregarCentral();if(aba==='diario')carregarDiario();}} className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4"/>Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon:<Brain className="h-5 w-5 mx-auto mb-1 text-indigo-400"/>, val:`${resumo.pctGeral}%`, label:'Consolidado BNCC', sub:`${resumo.totalCons}/${resumo.totalInd}` },
            { icon:<Award className="h-5 w-5 mx-auto mb-1 text-emerald-400"/>, val:central?.rdics?.length??0, label:'RDICs registados', sub:'' },
            { icon:<Activity className="h-5 w-5 mx-auto mb-1 text-blue-400"/>, val:totalEvt, label:'Observações (180d)', sub:aba!=='diario'?'Ver diário →':'' },
            { icon:<TrendingUp className="h-5 w-5 mx-auto mb-1 text-purple-400"/>, val:resumo.tend==='up'?'↑ Progresso':resumo.tend==='down'?'↓ Atenção':resumo.tend==='stable'?'→ Estável':'— Primeiro RDIC', label:'Tendência', sub:'' },
          ].map((k,i)=>(
            <Card key={i} className={i===2?'cursor-pointer hover:shadow-md':''}  onClick={i===2?()=>setAba('diario'):undefined}>
              <CardContent className="p-4 text-center">
                {k.icon}
                <p className={`font-bold text-gray-800 ${i===0||i===1?'text-2xl':'text-lg'}`}>{k.val}</p>
                <p className="text-xs text-gray-500">{k.label}</p>
                {k.sub&&<p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {(['bncc','diario','microgestos'] as const).map(a=>(
            <button key={a} onClick={()=>setAba(a)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${aba===a?'border-indigo-600 text-indigo-700':'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {a==='bncc' ? <><Brain className="h-4 w-4"/>Indicadores BNCC</> : a==='diario' ? <><BookOpen className="h-4 w-4"/>Diário de Bordo{totalEvt>0&&<span className="bg-indigo-100 text-indigo-600 text-xs px-1.5 py-0.5 rounded-full">{totalEvt}</span>}</> : <><Activity className="h-4 w-4"/>Microgestos{microgestos.length>0&&<span className="bg-cyan-100 text-cyan-600 text-xs px-1.5 py-0.5 rounded-full">{microgestos.length}</span>}</>}
            </button>
          ))}
        </div>

        {aba==='bncc'&&(
          <div className="space-y-5">
            {resumo.totalInd===0?(
              <Card><CardContent className="py-12 text-center">
                <Brain className="h-10 w-10 mx-auto mb-3 text-gray-300"/>
                <p className="text-sm text-gray-500">Nenhum RDIC com indicadores preenchidos.</p>
                <Button size="sm" onClick={()=>navigate(`/app/rdic-crianca?childId=${childId}`)} className="mt-3 bg-indigo-600 text-white text-xs">Criar RDIC</Button>
              </CardContent></Card>
            ):(
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Award className="h-4 w-4 text-indigo-500"/>Perfil BNCC</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <RadarChart data={radarData} margin={{top:10,right:20,bottom:10,left:20}}>
                          <PolarGrid stroke="#e5e7eb"/>
                          <PolarAngleAxis dataKey="campo" tick={{fontSize:10,fill:'#6b7280'}}/>
                          <Radar name="Consolidado" dataKey="pct" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2}/>
                          <Radar name="Em Desenvolvimento" dataKey="pctED" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 2"/>
                          <Tooltip formatter={(v:number)=>[`${v}%`]} contentStyle={{fontSize:11}}/>
                          <Legend wrapperStyle={{fontSize:10}}/>
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><BarChart2 className="h-4 w-4 text-emerald-500"/>Distribuição de Níveis</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3 mb-3">
                        {Object.entries(NIVEL_COR).map(([n,c])=>(
                          <div key={n} className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm border border-gray-200" style={{backgroundColor:c}}/>
                            <span className="text-xs text-gray-500">{n==='NAO_OBSERVADO'?'N/O':n==='EM_DESENVOLVIMENTO'?'Em Dev.':n==='CONSOLIDADO'?'Cons.':'Amp.'}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {distData.map(d=>{
                          const t=5; const pA=(d.A/t)*100,pC=(d.C/t)*100,pED=(d.ED/t)*100,pNO=(d.NO/t)*100;
                          return (
                            <div key={d.dimensao}>
                              <div className="flex justify-between mb-0.5"><span className="text-xs text-gray-600 font-medium">{d.dimensao}</span><span className="text-xs text-gray-400">{d.C+d.A}/{t} ✓</span></div>
                              <div className="h-4 rounded-full overflow-hidden flex w-full bg-gray-100">
                                {pA>0&&<div className="h-full" style={{width:`${pA}%`,backgroundColor:NIVEL_COR.AMPLIADO}}/>}
                                {pC>0&&<div className="h-full" style={{width:`${pC}%`,backgroundColor:NIVEL_COR.CONSOLIDADO}}/>}
                                {pED>0&&<div className="h-full" style={{width:`${pED}%`,backgroundColor:NIVEL_COR.EM_DESENVOLVIMENTO}}/>}
                                {pNO>0&&<div className="h-full" style={{width:`${pNO}%`,backgroundColor:NIVEL_COR.NAO_OBSERVADO}}/>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500"/>Evolução Trimestral</CardTitle></CardHeader>
                  <CardContent>
                    {central.rdics.length<2?(
                      <div className="flex items-center justify-center h-20 text-gray-400 text-xs"><AlertCircle className="h-4 w-4 mr-2 opacity-50"/>Registe o 2º RDIC para ver a evolução.</div>
                    ):(
                      <ResponsiveContainer width="100%" height={210}>
                        <BarChart data={evolData} margin={{top:5,right:10,bottom:5,left:-10}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                          <XAxis dataKey="periodo" tick={{fontSize:10}}/>
                          <YAxis domain={[0,100]} tick={{fontSize:10}} unit="%"/>
                          <Tooltip formatter={(v:any)=>v!==null?[`${v}%`]:['—']} contentStyle={{fontSize:11}}/>
                          <Legend wrapperStyle={{fontSize:10}}/>
                          {DIMENSOES.map(d=><Bar key={d.id} dataKey={d.short} fill={d.cor} radius={[2,2,0,0]} maxBarSize={16}/>)}
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {aba==='diario'&&(
          <div className="space-y-5">
            {loadingD?<LoadingState message="Carregando observações..."/>:totalEvt===0?(
              <Card><CardContent className="py-12 text-center">
                <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300"/>
                <p className="text-sm text-gray-500">Sem observações nos últimos 180 dias.</p>
                <Button size="sm" variant="outline" onClick={()=>navigate(`/app/diario-de-bordo?childId=${childId}`)} className="mt-3 text-xs">
                  Ir para o Diário <ChevronRight className="h-3 w-3 ml-1"/>
                </Button>
              </CardContent></Card>
            ):(
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Activity className="h-4 w-4 text-indigo-500"/>Distribuição por Tipo</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={pieData} cx="40%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({percent})=>percent>0.06?`${(percent*100).toFixed(0)}%`:''} labelLine={false}>
                          {pieData.map((_,i)=><Cell key={i} fill={DIARY_CORES[i%DIARY_CORES.length]}/>)}
                        </Pie>
                        <Tooltip formatter={(v:number,n:string)=>[v,n]} contentStyle={{fontSize:11}}/>
                        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{fontSize:10}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500"/>Observações por Mês</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={lineData} margin={{top:5,right:10,bottom:5,left:-10}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                        <XAxis dataKey="mes" tick={{fontSize:10}}/>
                        <YAxis tick={{fontSize:10}} allowDecimals={false}/>
                        <Tooltip contentStyle={{fontSize:11}}/>
                        <Legend wrapperStyle={{fontSize:10}}/>
                        <Line type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={2} dot={{r:3}}/>
                        <Line type="monotone" dataKey="Pedagógico" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 2" dot={{r:2}}/>
                        <Line type="monotone" dataKey="Ocorrências" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 2" dot={{r:2}}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {aba === 'microgestos' && (
          <div className="space-y-4">
            {loadingMg ? (
              <LoadingState message="Carregando microgestos..." />
            ) : microgestos.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum microgesto registrado ainda.</p>
                <p className="text-xs mt-1">Registre microgestos no Diário de Bordo para visualizar o portfólio.</p>
              </div>
            ) : (
              <>
                {/* Resumo por categoria */}
                <Card>
                  <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Distribuição por Área de Desenvolvimento</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(
                        microgestos.reduce((acc: Record<string, number>, m: any) => {
                          const cat = m.categoria ?? 'OUTRO';
                          acc[cat] = (acc[cat] ?? 0) + 1;
                          return acc;
                        }, {})
                      ).sort((a,b) => b[1]-a[1]).map(([cat, count]) => (
                        <div key={cat} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-44 truncate">{cat.replace(/_/g,' ')}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="bg-cyan-500 h-2 rounded-full transition-all" style={{ width: `${Math.round((count as number)/microgestos.length*100)}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 w-8 text-right">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Distribuição por nível */}
                <Card>
                  <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Distribuição por Nível</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex gap-3 flex-wrap">
                      {(['ALCANCADO','EM_DESENVOLVIMENTO','REQUER_ATENCAO'] as const).map(nivel => {
                        const count = microgestos.filter((m:any) => m.nivel === nivel).length;
                        const pct = Math.round(count/microgestos.length*100);
                        const cor = nivel === 'ALCANCADO' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : nivel === 'EM_DESENVOLVIMENTO' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-rose-100 text-rose-700 border-rose-200';
                        return (
                          <div key={nivel} className={`flex-1 min-w-[120px] rounded-xl border p-3 text-center ${cor}`}>
                            <p className="text-2xl font-bold">{count}</p>
                            <p className="text-xs font-medium mt-0.5">{nivel === 'ALCANCADO' ? '✅ Alcançado' : nivel === 'EM_DESENVOLVIMENTO' ? '🟡 Em Desenvolvimento' : '🔴 Requer Atenção'}</p>
                            <p className="text-xs opacity-70">{pct}%</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Timeline dos últimos 20 registros */}
                <Card>
                  <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Últimos Registros</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {microgestos.slice(0,20).map((m: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 border border-gray-100">
                          <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${m.nivel === 'ALCANCADO' ? 'bg-emerald-500' : m.nivel === 'EM_DESENVOLVIMENTO' ? 'bg-amber-400' : 'bg-rose-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{(m.tags?.[0] ?? m.categoria ?? '').replace(/_/g,' ')}</p>
                            <p className="text-xs text-gray-400">{m.data ? new Date(m.data).toLocaleDateString('pt-BR') : '—'}</p>
                            {m.descricao && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{m.descricao}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
