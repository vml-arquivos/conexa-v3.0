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
  Calendar, ChevronLeft, ChevronRight, BookOpen, Target, Lightbulb,
  CheckCircle, Clock, Users, Sparkles, Save, Plus, Eye, FileText,
  Activity, Brain, Palette, Music, Globe, Heart, Star, Download,
  AlertCircle, Info, RefreshCw, Layers,
} from 'lucide-react';
import {
  LOOKUP_DIARIO_2026,
  CAMPOS_EXPERIENCIA,
  SEGMENTOS,
  getObjetivosDia,
  temObjetivoNaData,
  getSegmentosNaData,
  type ObjetivoDia,
  type SegmentoKey,
} from '../data/lookupDiario2026';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface TemplatePlanejamento {
  id: string;
  titulo: string;
  campo_id: string;
  segmento: SegmentoKey;
  objetivo_bncc: string;
  codigo_bncc: string;
  intencionalidade: string;
  roteiro: string;
  materiais: string;
  avaliacao: string;
  adaptacoes: string;
  status: 'rascunho' | 'finalizado' | 'aplicado';
  data_aplicacao?: string;
  criado_em: string;
}

// ─── Cores por campo ──────────────────────────────────────────────────────────
const CAMPO_STYLES: Record<string, { bg: string; border: string; text: string; badge: string; icon: React.ReactNode }> = {
  'eu-outro-nos':   { bg: 'bg-pink-50',   border: 'border-pink-200',   text: 'text-pink-800',   badge: 'bg-pink-100 text-pink-700',   icon: <Heart className="h-4 w-4" /> },
  'corpo-gestos':   { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-700', icon: <Activity className="h-4 w-4" /> },
  'tracos-sons':    { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-700', icon: <Palette className="h-4 w-4" /> },
  'escuta-fala':    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   badge: 'bg-blue-100 text-blue-700',   icon: <BookOpen className="h-4 w-4" /> },
  'espacos-tempos': { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  badge: 'bg-green-100 text-green-700',  icon: <Globe className="h-4 w-4" /> },
  'outro':          { bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-800',   badge: 'bg-gray-100 text-gray-700',   icon: <Layers className="h-4 w-4" /> },
};

const SEG_STYLES: Record<SegmentoKey, { bg: string; text: string; label: string }> = {
  EI01: { bg: 'bg-rose-100',   text: 'text-rose-700',   label: 'EI01 — Bebês' },
  EI02: { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'EI02 — Bem Pequenas' },
  EI03: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'EI03 — Pequenas' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatarDataDDMM(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
}

function formatarDataBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function getDiasDoMes(ano: number, mes: number): Date[] {
  const dias: Date[] = [];
  const primeiro = new Date(ano, mes, 1);
  const ultimo = new Date(ano, mes + 1, 0);
  for (let d = 1; d <= ultimo.getDate(); d++) {
    dias.push(new Date(ano, mes, d));
  }
  return dias;
}

// ─── Template padrão por campo ────────────────────────────────────────────────
function gerarTemplateInicial(obj: ObjetivoDia, segmento: SegmentoKey): Partial<TemplatePlanejamento> {
  const roteiros: Record<string, string> = {
    'eu-outro-nos': `1. ACOLHIMENTO (15 min)\n   - Roda de conversa sobre o tema da semana: "${obj.semana_tema}"\n   - Canção de boas-vindas e chamada afetiva\n\n2. DESENVOLVIMENTO (30 min)\n   - Apresentação do objetivo: ${obj.objetivo_curriculo || obj.objetivo_bncc}\n   - Atividade principal: ${obj.exemplo_atividade || 'Exploração livre mediada pelo professor'}\n   - Interação em duplas/grupos pequenos\n\n3. REGISTRO (10 min)\n   - Desenho ou colagem sobre a experiência\n   - Roda de conversa: "O que aprendemos hoje?"\n\n4. ENCERRAMENTO (5 min)\n   - Organização do espaço\n   - Momento de despedida`,
    'corpo-gestos': `1. AQUECIMENTO CORPORAL (10 min)\n   - Música e movimento livre\n   - Exploração do espaço com o corpo\n\n2. ATIVIDADE PRINCIPAL (35 min)\n   - Objetivo: ${obj.objetivo_curriculo || obj.objetivo_bncc}\n   - ${obj.exemplo_atividade || 'Circuito de movimento e expressão corporal'}\n   - Variações: individual, duplas, coletivo\n\n3. RELAXAMENTO (10 min)\n   - Respiração e alongamento\n   - Conversa sobre as sensações do corpo\n\n4. REGISTRO (5 min)\n   - Fotografia das atividades\n   - Relato oral das crianças`,
    'tracos-sons': `1. SENSIBILIZAÇÃO (10 min)\n   - Apreciação de obra de arte / música relacionada ao tema\n   - Exploração de materiais disponíveis\n\n2. CRIAÇÃO (35 min)\n   - Objetivo: ${obj.objetivo_curriculo || obj.objetivo_bncc}\n   - ${obj.exemplo_atividade || 'Produção artística individual e coletiva'}\n   - Uso de diferentes suportes e materiais\n\n3. APRECIAÇÃO (10 min)\n   - Exposição das produções\n   - Cada criança fala sobre sua obra\n\n4. ORGANIZAÇÃO (5 min)\n   - Cuidado com os materiais\n   - Guarda das produções`,
    'escuta-fala': `1. RODA DE LEITURA (15 min)\n   - Leitura deleite pelo professor\n   - Exploração do livro/texto relacionado ao tema: "${obj.semana_tema}"\n\n2. DESENVOLVIMENTO (30 min)\n   - Objetivo: ${obj.objetivo_curriculo || obj.objetivo_bncc}\n   - ${obj.exemplo_atividade || 'Contação de histórias e recontagem pelas crianças'}\n   - Dramatização / fantoches / recursos visuais\n\n3. PRODUÇÃO (10 min)\n   - Criação coletiva de história\n   - Ditado ao professor ou escrita espontânea\n\n4. PARTILHA (5 min)\n   - Apresentação das produções\n   - Conexão com experiências pessoais`,
    'espacos-tempos': `1. INVESTIGAÇÃO (15 min)\n   - Levantamento de hipóteses sobre o fenômeno do dia\n   - Observação do ambiente / materiais\n\n2. EXPERIMENTAÇÃO (30 min)\n   - Objetivo: ${obj.objetivo_curriculo || obj.objetivo_bncc}\n   - ${obj.exemplo_atividade || 'Experimento científico ou exploração matemática'}\n   - Registro de observações\n\n3. SISTEMATIZAÇÃO (10 min)\n   - Organização dos dados coletados\n   - Comparação de resultados\n\n4. CONCLUSÃO (5 min)\n   - "O que descobrimos?"\n   - Conexão com a vida cotidiana`,
  };

  return {
    titulo: `${obj.campo_emoji} ${obj.objetivo_bncc.substring(0, 60)}...`,
    campo_id: obj.campo_id,
    segmento,
    objetivo_bncc: obj.objetivo_bncc,
    codigo_bncc: obj.codigo_bncc,
    intencionalidade: obj.intencionalidade || `Proporcionar às crianças experiências significativas relacionadas a "${obj.semana_tema}", desenvolvendo o campo "${obj.campo_label}" conforme previsto na Sequência Pedagógica 2026.`,
    roteiro: roteiros[obj.campo_id] || roteiros['escuta-fala'],
    materiais: '',
    avaliacao: `Observar se as crianças:\n- Demonstram interesse e engajamento na atividade\n- Atingem o objetivo: ${obj.objetivo_bncc}\n- Interagem com os colegas de forma respeitosa\n- Expressam suas descobertas verbalmente ou por meio de outras linguagens`,
    adaptacoes: 'Crianças com necessidades especiais: adaptar materiais e tempo conforme necessário.\nCrianças mais avançadas: propor desafios adicionais.\nCrianças em processo de inserção: respeitar o tempo de adaptação.',
    status: 'rascunho',
    criado_em: new Date().toISOString(),
  };
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function PlanejamentoDiarioPage() {
  const hoje = new Date();
  const [dataSelecionada, setDataSelecionada] = useState<Date>(hoje);
  const [segmentoSelecionado, setSegmentoSelecionado] = useState<SegmentoKey>('EI01');
  const [mesCalendario, setMesCalendario] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [aba, setAba] = useState<'calendario' | 'template' | 'historico'>('calendario');
  const [templateAtivo, setTemplateAtivo] = useState<Partial<TemplatePlanejamento> | null>(null);
  const [templates, setTemplates] = useState<TemplatePlanejamento[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [gerandoIA, setGerandoIA] = useState(false);

  const ddmm = formatarDataDDMM(dataSelecionada);
  const objetivosDia = getObjetivosDia(ddmm, segmentoSelecionado);
  const segmentosNaData = getSegmentosNaData(ddmm);
  const temObjetivo = temObjetivoNaData(ddmm);

  useEffect(() => {
    carregarTemplates();
  }, []);

  async function carregarTemplates() {
    try {
      const res = await http.get('/plannings?limit=100');
      const data = res.data;
      setTemplates(Array.isArray(data) ? data : data?.data ?? []);
    } catch { /* usa lista local */ }
  }

  function abrirTemplate(obj: ObjetivoDia) {
    setTemplateAtivo(gerarTemplateInicial(obj, segmentoSelecionado));
    setAba('template');
  }

  async function salvarTemplate() {
    if (!templateAtivo) return;
    setSalvando(true);
    try {
      await http.post('/plannings', {
        ...templateAtivo,
        data_aplicacao: ddmm,
        ano: dataSelecionada.getFullYear(),
      });
      toast.success('Planejamento salvo com sucesso!');
      setAba('historico');
      carregarTemplates();
    } catch (err: any) {
      // Salva localmente se API não disponível
      const local: TemplatePlanejamento = {
        id: `local-${Date.now()}`,
        ...(templateAtivo as TemplatePlanejamento),
        data_aplicacao: ddmm,
        criado_em: new Date().toISOString(),
      };
      setTemplates(prev => [local, ...prev]);
      toast.success('Planejamento salvo localmente!');
      setAba('historico');
    } finally {
      setSalvando(false);
    }
  }

  async function gerarComIA() {
    if (!templateAtivo || !objetivosDia[0]) return;
    setGerandoIA(true);
    try {
      const obj = objetivosDia[0];
      const res = await http.post('/ia-assistiva/gerar-atividade', {
        faixaEtaria: segmentoSelecionado,
        campoExperiencia: obj.campo_id,
        objetivoBncc: obj.objetivo_bncc,
        codigoBncc: obj.codigo_bncc,
        semanaTema: obj.semana_tema,
        intencionalidade: obj.intencionalidade,
      });
      const ia = res.data;
      setTemplateAtivo(prev => ({
        ...prev,
        titulo: ia.titulo || prev?.titulo,
        roteiro: ia.descricao || ia.roteiro || prev?.roteiro,
        materiais: (ia.materiais || []).join('\n') || prev?.materiais,
        avaliacao: ia.avaliacao || prev?.avaliacao,
        adaptacoes: ia.adaptacoes || prev?.adaptacoes,
      }));
      toast.success('Planejamento enriquecido com IA!');
    } catch {
      toast.error('IA temporariamente indisponível. Use o template gerado automaticamente.');
    } finally {
      setGerandoIA(false);
    }
  }

  // ─── Calendário ──────────────────────────────────────────────────────────────
  const diasDoMes = getDiasDoMes(mesCalendario.ano, mesCalendario.mes);
  const primeiroDia = new Date(mesCalendario.ano, mesCalendario.mes, 1).getDay();
  const nomesMes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  return (
    <PageShell
      title="Planejamento Diário"
      subtitle="Calendário pedagógico 2026 — Sequência Pedagógica Piloto por data, segmento e campo de experiência"
    >
      {/* Abas */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
        {[
          { id: 'calendario', label: 'Calendário Pedagógico', icon: <Calendar className="h-4 w-4" /> },
          { id: 'template', label: 'Template do Dia', icon: <FileText className="h-4 w-4" /> },
          { id: 'historico', label: 'Histórico', icon: <BookOpen className="h-4 w-4" /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setAba(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${aba === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            {tab.icon} {tab.label}
            {tab.id === 'template' && templateAtivo && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
          </button>
        ))}
      </div>

      {/* ─── ABA CALENDÁRIO ─── */}
      {aba === 'calendario' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendário */}
          <div className="lg:col-span-2 space-y-4">
            {/* Seletor de segmento */}
            <div className="flex gap-2 flex-wrap">
              {SEGMENTOS.map(seg => (
                <button key={seg.id} onClick={() => setSegmentoSelecionado(seg.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    segmentoSelecionado === seg.id
                      ? `${SEG_STYLES[seg.id].bg} ${SEG_STYLES[seg.id].text} border-current`
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}>
                  <Users className="h-4 w-4" />
                  {seg.label}
                  <span className="text-xs opacity-70">{seg.faixa}</span>
                </button>
              ))}
            </div>

            {/* Navegação do mês */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <button onClick={() => setMesCalendario(m => {
                    const d = new Date(m.ano, m.mes - 1, 1);
                    return { ano: d.getFullYear(), mes: d.getMonth() };
                  })} className="p-2 hover:bg-gray-100 rounded-lg">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-lg font-bold text-gray-800">
                    {nomesMes[mesCalendario.mes]} {mesCalendario.ano}
                  </h2>
                  <button onClick={() => setMesCalendario(m => {
                    const d = new Date(m.ano, m.mes + 1, 1);
                    return { ano: d.getFullYear(), mes: d.getMonth() };
                  })} className="p-2 hover:bg-gray-100 rounded-lg">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Cabeçalho dos dias */}
                <div className="grid grid-cols-7 mb-2">
                  {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">{d}</div>
                  ))}
                </div>
                {/* Grid de dias */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Espaços vazios antes do primeiro dia */}
                  {Array.from({ length: primeiroDia }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {diasDoMes.map(dia => {
                    const ddmmDia = formatarDataDDMM(dia);
                    const temObj = temObjetivoNaData(ddmmDia);
                    const objsDia = getObjetivosDia(ddmmDia, segmentoSelecionado);
                    const isHoje = dia.toDateString() === hoje.toDateString();
                    const isSelecionado = dia.toDateString() === dataSelecionada.toDateString();
                    const isFimDeSemana = dia.getDay() === 0 || dia.getDay() === 6;
                    const camposDia = objsDia.map(o => o.campo_id);
                    const campoStyle = camposDia[0] ? CAMPO_STYLES[camposDia[0]] : null;

                    return (
                      <button key={dia.toISOString()} onClick={() => setDataSelecionada(dia)}
                        className={`relative p-1.5 rounded-lg text-sm transition-all min-h-[52px] flex flex-col items-center ${
                          isSelecionado ? 'ring-2 ring-blue-500 bg-blue-50' :
                          isHoje ? 'ring-2 ring-blue-300 bg-blue-50/50' :
                          isFimDeSemana ? 'bg-gray-50 text-gray-400' :
                          temObj && objsDia.length > 0 ? `${campoStyle?.bg || 'bg-gray-50'} hover:opacity-80` :
                          'hover:bg-gray-50'
                        }`}>
                        <span className={`font-medium text-xs ${isSelecionado ? 'text-blue-700' : isHoje ? 'text-blue-600' : isFimDeSemana ? 'text-gray-400' : 'text-gray-700'}`}>
                          {dia.getDate()}
                        </span>
                        {objsDia.length > 0 && (
                          <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                            {objsDia.slice(0, 3).map((obj, i) => (
                              <span key={i} className="text-[10px]">{obj.campo_emoji}</span>
                            ))}
                          </div>
                        )}
                        {temObj && objsDia.length === 0 && (
                          <span className="text-[10px] text-gray-400 mt-0.5">outros seg.</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legenda */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Campos de Experiência</p>
                  <div className="flex flex-wrap gap-2">
                    {CAMPOS_EXPERIENCIA.map(c => (
                      <span key={c.id} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${CAMPO_STYLES[c.id]?.badge}`}>
                        {c.emoji} {c.label.split(',')[0]}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Painel do dia selecionado */}
          <div className="space-y-4">
            <Card className="border-2 border-blue-100">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Data selecionada</p>
                    <h3 className="font-bold text-gray-800 capitalize">{formatarDataBR(dataSelecionada)}</h3>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${SEG_STYLES[segmentoSelecionado].bg} ${SEG_STYLES[segmentoSelecionado].text}`}>
                    {SEG_STYLES[segmentoSelecionado].label}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {objetivosDia.length === 0 ? (
                  <div className="text-center py-6">
                    {temObjetivoNaData(ddmm) ? (
                      <div>
                        <Info className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 font-medium">Objetivos para outros segmentos</p>
                        <p className="text-xs text-gray-400 mt-1">Segmentos com objetivos nesta data:</p>
                        <div className="flex gap-1 justify-center mt-2 flex-wrap">
                          {segmentosNaData.map(s => (
                            <button key={s} onClick={() => setSegmentoSelecionado(s)}
                              className={`text-xs px-2 py-1 rounded-full ${SEG_STYLES[s].bg} ${SEG_STYLES[s].text}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Sem objetivos previstos nesta data</p>
                        <p className="text-xs text-gray-400 mt-1">Dia não letivo ou sem previsão na matriz 2026</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {objetivosDia.map((obj, i) => {
                      const style = CAMPO_STYLES[obj.campo_id] || CAMPO_STYLES['outro'];
                      return (
                        <div key={i} className={`rounded-xl border-2 p-3 ${style.bg} ${style.border}`}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{obj.campo_emoji}</span>
                              <div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                                  {obj.codigo_bncc}
                                </span>
                                <p className={`text-xs mt-0.5 ${style.text} opacity-70`}>{obj.campo_label}</p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">Sem. {obj.semana} / Bim. {obj.bimestre}</span>
                          </div>

                          <p className={`text-xs font-medium ${style.text} mb-1`}>
                            {obj.semana_tema && <span className="italic">"{obj.semana_tema}" — </span>}
                          </p>
                          <p className="text-sm text-gray-700 font-medium leading-snug">{obj.objetivo_bncc}</p>

                          {obj.intencionalidade && (
                            <div className="mt-2 pt-2 border-t border-current/10">
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Lightbulb className="h-3 w-3" /> <strong>Intencionalidade:</strong>
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5">{obj.intencionalidade}</p>
                            </div>
                          )}

                          {obj.exemplo_atividade && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Star className="h-3 w-3" /> <strong>Exemplo:</strong>
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5">{obj.exemplo_atividade}</p>
                            </div>
                          )}

                          <Button size="sm" onClick={() => abrirTemplate(obj)}
                            className={`w-full mt-3 text-xs h-8`}>
                            <FileText className="h-3 w-3 mr-1" /> Criar Template de Planejamento
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estatísticas rápidas */}
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Cobertura da Matriz 2026</p>
                <div className="space-y-2">
                  {SEGMENTOS.map(seg => {
                    const total = Object.values(LOOKUP_DIARIO_2026).reduce((acc, d) => acc + (d[seg.id]?.length || 0), 0);
                    const aplicados = templates.filter(t => t.segmento === seg.id).length;
                    const pct = total > 0 ? Math.round((aplicados / total) * 100) : 0;
                    return (
                      <div key={seg.id}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={`font-medium ${SEG_STYLES[seg.id].text}`}>{seg.id}</span>
                          <span className="text-gray-500">{aplicados}/{total} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full">
                          <div className={`h-1.5 rounded-full ${SEG_STYLES[seg.id].bg.replace('bg-', 'bg-').replace('-100', '-400')}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── ABA TEMPLATE ─── */}
      {aba === 'template' && (
        <div className="space-y-6">
          {!templateAtivo ? (
            <div className="text-center py-16">
              <FileText className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">Nenhum template aberto</h3>
              <p className="text-gray-400 mt-1">Selecione uma data no calendário e clique em "Criar Template"</p>
              <Button onClick={() => setAba('calendario')} className="mt-4">
                <Calendar className="h-4 w-4 mr-2" /> Ir para o Calendário
              </Button>
            </div>
          ) : (
            <>
              {/* Cabeçalho do template */}
              <div className={`rounded-2xl border-2 p-5 ${CAMPO_STYLES[templateAtivo.campo_id || 'outro']?.bg} ${CAMPO_STYLES[templateAtivo.campo_id || 'outro']?.border}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${CAMPO_STYLES[templateAtivo.campo_id || 'outro']?.badge}`}>
                        {templateAtivo.codigo_bncc}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${SEG_STYLES[templateAtivo.segmento || 'EI01'].bg} ${SEG_STYLES[templateAtivo.segmento || 'EI01'].text}`}>
                        {SEG_STYLES[templateAtivo.segmento || 'EI01'].label}
                      </span>
                      <span className="text-xs text-gray-500">📅 {ddmm}/2026</span>
                    </div>
                    <h2 className={`text-base font-bold ${CAMPO_STYLES[templateAtivo.campo_id || 'outro']?.text}`}>
                      {templateAtivo.titulo}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">{templateAtivo.objetivo_bncc}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={gerarComIA} disabled={gerandoIA}
                    className="flex items-center gap-2 whitespace-nowrap">
                    {gerandoIA ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {gerandoIA ? 'Gerando...' : 'Enriquecer com IA'}
                  </Button>
                </div>
              </div>

              {/* Campos do template */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" /> Título do Planejamento
                    </Label>
                    <Input value={templateAtivo.titulo || ''} onChange={e => setTemplateAtivo(p => ({ ...p, titulo: e.target.value }))}
                      className="mt-1" placeholder="Título criativo para o planejamento..." />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" /> Intencionalidade Pedagógica
                    </Label>
                    <Textarea value={templateAtivo.intencionalidade || ''} onChange={e => setTemplateAtivo(p => ({ ...p, intencionalidade: e.target.value }))}
                      className="mt-1 min-h-[100px]" placeholder="O que pretendo que as crianças vivenciem/aprendam..." />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-500" /> Materiais Necessários
                    </Label>
                    <Textarea value={templateAtivo.materiais || ''} onChange={e => setTemplateAtivo(p => ({ ...p, materiais: e.target.value }))}
                      className="mt-1 min-h-[80px]" placeholder="Liste os materiais necessários para a atividade..." />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-purple-500" /> Avaliação / Observação
                    </Label>
                    <Textarea value={templateAtivo.avaliacao || ''} onChange={e => setTemplateAtivo(p => ({ ...p, avaliacao: e.target.value }))}
                      className="mt-1 min-h-[100px]" placeholder="Como vou observar e registrar o desenvolvimento..." />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-indigo-500" /> Roteiro da Atividade
                    </Label>
                    <Textarea value={templateAtivo.roteiro || ''} onChange={e => setTemplateAtivo(p => ({ ...p, roteiro: e.target.value }))}
                      className="mt-1 min-h-[260px] font-mono text-sm" placeholder="Descreva o passo a passo da atividade..." />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Heart className="h-4 w-4 text-rose-500" /> Adaptações e Inclusão
                    </Label>
                    <Textarea value={templateAtivo.adaptacoes || ''} onChange={e => setTemplateAtivo(p => ({ ...p, adaptacoes: e.target.value }))}
                      className="mt-1 min-h-[80px]" placeholder="Adaptações para crianças com necessidades especiais..." />
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setAba('calendario')}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Voltar ao Calendário
                </Button>
                <Button variant="outline" onClick={() => {
                  setTemplateAtivo(p => ({ ...p, status: 'finalizado' }));
                  toast.info('Template marcado como finalizado');
                }}>
                  <Eye className="h-4 w-4 mr-1" /> Marcar como Finalizado
                </Button>
                <Button onClick={salvarTemplate} disabled={salvando} className="bg-blue-600 hover:bg-blue-700">
                  {salvando ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  {salvando ? 'Salvando...' : 'Salvar Planejamento'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── ABA HISTÓRICO ─── */}
      {aba === 'historico' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Planejamentos Salvos</h3>
            <Button size="sm" onClick={() => setAba('calendario')}>
              <Plus className="h-4 w-4 mr-1" /> Novo Planejamento
            </Button>
          </div>

          {templates.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">Nenhum planejamento salvo</h3>
              <p className="text-gray-400 mt-1">Crie seu primeiro planejamento a partir do calendário</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((t: any) => {
                const style = CAMPO_STYLES[t.campo_id || 'outro'];
                const segStyle = SEG_STYLES[t.segmento as SegmentoKey] || SEG_STYLES.EI01;
                return (
                  <Card key={t.id} className={`border-2 ${style?.border || 'border-gray-200'} hover:shadow-md transition-all`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style?.badge}`}>
                            {t.codigo_bncc || 'BNCC'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${segStyle.bg} ${segStyle.text}`}>
                            {t.segmento || 'EI01'}
                          </span>
                          {t.data_aplicacao && (
                            <span className="text-xs text-gray-500">📅 {t.data_aplicacao}</span>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          t.status === 'aplicado' ? 'bg-green-100 text-green-700' :
                          t.status === 'finalizado' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{t.status || 'rascunho'}</span>
                      </div>
                      <h4 className="font-semibold text-gray-800 text-sm line-clamp-2">{t.titulo || t.title || 'Planejamento'}</h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.objetivo_bncc || t.description}</p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1 text-xs h-7"
                          onClick={() => { setTemplateAtivo(t); setAba('template'); }}>
                          <Eye className="h-3 w-3 mr-1" /> Ver
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-7 text-green-600 border-green-200"
                          onClick={() => toast.success('Marcado como aplicado!')}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Aplicado
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
