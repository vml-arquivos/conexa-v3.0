import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PageShell } from '../components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { LoadingState } from '../components/ui/LoadingState';
import { toast } from 'sonner';
import http from '../api/http';
import { Brain, Users, AlertTriangle, CheckCircle, ArrowLeft, RefreshCw, Activity, Heart, Stethoscope, TrendingUp, BookOpen, User, Globe } from 'lucide-react';

const ANO = 2026;
const TRIMESTRES = [
  { id:1, label:'1º Trimestre', short:'1T', cor:'#6366f1' },
  { id:2, label:'2º Trimestre', short:'2T', cor:'#22c55e' },
  { id:3, label:'3º Trimestre', short:'3T', cor:'#f59e0b' },
] as const;

const S_CFG: Record<string,{label:string,cor:string,bg:string}> = {
  PENDENTE:  {label:'Pendente',   cor:'#94a3b8',bg:'bg-slate-100 text-slate-600'},
  RASCUNHO:  {label:'Rascunho',   cor:'#6b7280',bg:'bg-gray-100 text-gray-600'},
  DEVOLVIDO: {label:'Devolvido',  cor:'#f97316',bg:'bg-orange-100 text-orange-700'},
  EM_REVISAO:{label:'Em Revisão', cor:'#eab308',bg:'bg-yellow-100 text-yellow-700'},
  APROVADO:  {label:'Aprovado',   cor:'#22c55e',bg:'bg-emerald-100 text-emerald-700'},
  FINALIZADO:{label:'Finalizado', cor:'#3b82f6',bg:'bg-blue-100 text-blue-700'},
  PUBLICADO: {label:'Publicado',  cor:'#16a34a',bg:'bg-green-100 text-green-700'},
};
function Dot({status}: {status:string}) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full" style={{backgroundColor:(S_CFG[status]??S_CFG.PENDENTE).cor}} title={(S_CFG[status]??S_CFG.PENDENTE).label}/>;
}

export default function PainelTurmaPage() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const [s1,setS1]=useState<any>(null); const [s2,setS2]=useState<any>(null); const [s3,setS3]=useState<any>(null);
  const [health,setHealth]=useState<any>(null); const [eventos,setEventos]=useState<any[]>([]); const [loading,setLoading]=useState(true);

  const carregar = useCallback(async () => {
    if (!classroomId) return;
    setLoading(true);
    try {
      const [r1,r2,r3,rH,rD] = await Promise.allSettled([
        http.get('/rdic/turma/status',{params:{classroomId,periodo:'1º Trimestre',anoLetivo:ANO}}),
        http.get('/rdic/turma/status',{params:{classroomId,periodo:'2º Trimestre',anoLetivo:ANO}}),
        http.get('/rdic/turma/status',{params:{classroomId,periodo:'3º Trimestre',anoLetivo:ANO}}),
        http.get('/children/health/dashboard',{params:{classroomId}}),
        http.get('/diary-events',{params:{classroomId,startDate:new Date(Date.now()-56*24*60*60*1000).toISOString().slice(0,10),limit:'500'}}),
      ]);
      if(r1.status==='fulfilled')setS1(r1.value?.data??null);
      if(r2.status==='fulfilled')setS2(r2.value?.data??null);
      if(r3.status==='fulfilled')setS3(r3.value?.data??null);
      if(rH.status==='fulfilled')setHealth(rH.value?.data??null);
      if(rD.status==='fulfilled'){const r=rD.value?.data;setEventos(Array.isArray(r)?r:(r?.data??[]));}
    } catch { toast.error('Erro ao carregar painel da turma.'); }
    finally { setLoading(false); }
  }, [classroomId]);

  useEffect(()=>{carregar();},[carregar]);

  const {completude,statusData,diarioSemanal,criancas,turmaName} = useMemo(()=>{
    const all=[s1,s2,s3];
    const turmaName=s1?.classroomName??s2?.classroomName??s3?.classroomName??'—';
    const completude=TRIMESTRES.map((t,i)=>({periodo:t.short,label:t.label,val:all[i]?.completude??0,cor:t.cor,aprov:(all[i]?.contagem?.aprovado??0)+(all[i]?.contagem?.finalizado??0),total:all[i]?.contagem?.total??0}));
    const statusData=TRIMESTRES.map((t,i)=>{const c=all[i]?.contagem;return{periodo:t.short,Aprovado:(c?.aprovado??0)+(c?.finalizado??0),'Em Revisão':c?.emRevisao??0,Rascunho:c?.rascunho??0,Devolvido:c?.devolvido??0,Pendente:c?.pendente??0};});
    const semanas:Record<string,number>={};
    for(const e of eventos){const d=new Date(e.eventDate);const dy=d.getDay();const diff=d.getDate()-dy+(dy===0?-6:1);const seg=new Date(d.setDate(diff));const k=seg.toISOString().slice(0,10);semanas[k]=(semanas[k]??0)+1;}
    const diarioSemanal=Object.entries(semanas).sort(([a],[b])=>a.localeCompare(b)).slice(-8).map(([s,t])=>{const d=new Date(s+'T12:00:00');return{semana:`${d.getDate()}/${d.getMonth()+1}`,Observações:t};});
    const todas=s1?.criancas??s2?.criancas??s3?.criancas??[];
    const ids=[...new Set(todas.map((c:any)=>c.childId))];
    const criancas=ids.map(cid=>{
      const c1=s1?.criancas?.find((c:any)=>c.childId===cid);
      const c2=s2?.criancas?.find((c:any)=>c.childId===cid);
      const c3=s3?.criancas?.find((c:any)=>c.childId===cid);
      const ref=c1??c2??c3;
      return{childId:cid,nome:ref?.nome??'—',st1:c1?.status??'PENDENTE',st2:c2?.status??'PENDENTE',st3:c3?.status??'PENDENTE'};
    });
    return{completude,statusData,diarioSemanal,criancas,turmaName};
  },[s1,s2,s3,eventos]);

  if(loading) return <LoadingState message="Carregando painel da turma..."/>;
  const total=s1?.contagem?.total??s2?.contagem?.total??s3?.contagem?.total??0;
  const aprovTotal=(s1?.contagem?.aprovado??0)+(s1?.contagem?.finalizado??0)+(s2?.contagem?.aprovado??0)+(s2?.contagem?.finalizado??0)+(s3?.contagem?.aprovado??0)+(s3?.contagem?.finalizado??0);

  return (
    <PageShell title={`Painel da Turma — ${turmaName}`} subtitle={`${total} crianças · ${ANO}`}>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button variant="outline" onClick={()=>navigate(-1)} className="flex items-center gap-2 text-sm"><ArrowLeft className="h-4 w-4"/>Voltar</Button>
          <Button variant="outline" onClick={carregar} className="flex items-center gap-2 text-sm"><RefreshCw className="h-4 w-4"/>Atualizar</Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {icon:<Users className="h-5 w-5 mx-auto mb-1 text-indigo-400"/>,val:total,label:'Crianças na turma'},
            {icon:<CheckCircle className="h-5 w-5 mx-auto mb-1 text-emerald-400"/>,val:aprovTotal,label:'RDICs aprovados (3T)'},
            {icon:<AlertTriangle className="h-5 w-5 mx-auto mb-1 text-red-400"/>,val:(health?.stats?.comAlergia??0)+(health?.stats?.comDieta??0),label:'Alertas alimentares'},
            {icon:<Activity className="h-5 w-5 mx-auto mb-1 text-blue-400"/>,val:eventos.length,label:'Observações (8 sem.)'},
          ].map((k,i)=>(
            <Card key={i}><CardContent className="p-4 text-center">{k.icon}<p className="text-2xl font-bold text-gray-800">{k.val}</p><p className="text-xs text-gray-500">{k.label}</p></CardContent></Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-indigo-500"/>Completude por Trimestre</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4 mt-1">
                {completude.map(t=>(
                  <div key={t.periodo}>
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{backgroundColor:t.cor}}/><span className="text-sm font-medium text-gray-700">{t.label}</span></div>
                      <div className="text-right"><span className="text-lg font-bold" style={{color:t.cor}}>{t.val}%</span><span className="text-xs text-gray-400 ml-1">({t.aprov}/{t.total})</span></div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3"><div className="h-3 rounded-full transition-all" style={{width:`${t.val}%`,backgroundColor:t.cor}}/></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Brain className="h-4 w-4 text-purple-500"/>Status por Trimestre</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={statusData} margin={{top:5,right:5,bottom:5,left:-15}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="periodo" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:10}} allowDecimals={false}/>
                  <Tooltip contentStyle={{fontSize:11}}/>
                  <Legend wrapperStyle={{fontSize:10}}/>
                  <Bar dataKey="Aprovado" stackId="a" fill="#22c55e" maxBarSize={40}/>
                  <Bar dataKey="Em Revisão" stackId="a" fill="#eab308" maxBarSize={40}/>
                  <Bar dataKey="Rascunho" stackId="a" fill="#9ca3af" maxBarSize={40}/>
                  <Bar dataKey="Devolvido" stackId="a" fill="#f97316" maxBarSize={40}/>
                  <Bar dataKey="Pendente" stackId="a" fill="#e2e8f0" radius={[2,2,0,0]} maxBarSize={40}/>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Heart className="h-4 w-4 text-red-400"/>Saúde e Nutrição</CardTitle></CardHeader>
            <CardContent>
              {!health?<p className="text-sm text-gray-400 text-center py-4">Sem dados de saúde</p>:(
                <div className="space-y-2">
                  {[
                    {icon:<AlertTriangle className="h-4 w-4 text-red-500"/>,label:'Com alergias',val:health.stats?.comAlergia??0,cor:'#ef4444'},
                    {icon:<Activity className="h-4 w-4 text-orange-500"/>,label:'Com dieta restritiva',val:health.stats?.comDieta??0,cor:'#f97316'},
                    {icon:<Heart className="h-4 w-4 text-blue-500"/>,label:'Com condição médica',val:health.stats?.comCondicaoMedica??0,cor:'#3b82f6'},
                    {icon:<Stethoscope className="h-4 w-4 text-purple-500"/>,label:'Com medicação',val:health.stats?.comMedicamento??0,cor:'#a855f7'},
                  ].map((item,i)=>(
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">{item.icon}</div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600">{item.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{width:health.stats?.total>0?`${(item.val/health.stats.total)*100}%`:'0%',backgroundColor:item.cor}}/></div>
                          <span className="text-sm font-bold w-6 text-right" style={{color:item.cor}}>{item.val}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><BookOpen className="h-4 w-4 text-emerald-500"/>Actividade Semanal do Diário</CardTitle></CardHeader>
            <CardContent>
              {diarioSemanal.length===0?<div className="flex items-center justify-center h-[160px] text-gray-400 text-xs">Sem observações nas últimas 8 semanas.</div>:(
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={diarioSemanal} margin={{top:5,right:5,bottom:5,left:-15}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="semana" tick={{fontSize:9}}/>
                    <YAxis tick={{fontSize:10}} allowDecimals={false}/>
                    <Tooltip contentStyle={{fontSize:11}}/>
                    <Bar dataKey="Observações" fill="#6366f1" radius={[3,3,0,0]} maxBarSize={24}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Users className="h-4 w-4 text-indigo-500"/>Acompanhamento Individual</CardTitle></CardHeader>
          <CardContent>
            {criancas.length===0?<p className="text-sm text-gray-400 text-center py-6">Nenhuma criança encontrada.</p>:(
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-4">Criança</th>
                      {TRIMESTRES.map(t=><th key={t.id} className="text-center text-xs font-semibold pb-2 px-2" style={{color:t.cor}}>{t.short}</th>)}
                      <th className="text-right text-xs font-semibold text-gray-500 pb-2 pl-2">Acções</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criancas.map((c:any)=>{
                      const aprov=[c.st1,c.st2,c.st3].filter((s:string)=>['APROVADO','FINALIZADO','PUBLICADO'].includes(s)).length;
                      return (
                        <tr key={c.childId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0"><User className="h-3.5 w-3.5 text-indigo-600"/></div>
                              <span className="font-medium text-gray-800 truncate max-w-[140px]">{c.nome}</span>
                              {aprov===3&&<Globe className="h-3.5 w-3.5 text-green-500 flex-shrink-0" title="Todos aprovados"/>}
                            </div>
                          </td>
                          {[c.st1,c.st2,c.st3].map((st:string,i:number)=><td key={i} className="text-center px-2 py-2.5"><Dot status={st}/></td>)}
                          <td className="text-right pl-2 py-2.5">
                            <Button size="sm" variant="outline" onClick={()=>navigate(`/app/crianca/${c.childId}/rdic-central`)} className="text-xs h-7 px-2">Central</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-100">
                  {Object.entries(S_CFG).map(([k,v])=><div key={k} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:v.cor}}/><span className="text-xs text-gray-500">{v.label}</span></div>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </PageShell>
  );
}
