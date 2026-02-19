import { useEffect, useState, useCallback } from 'react';
import {
  BookOpen,
  Calendar,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
} from 'lucide-react';
import { getPlannings, type Planning } from '../api/plannings';
import { GeradorAtividadeIA } from '../components/planejamento/GeradorAtividadeIA';
import { useAuth } from '../app/AuthProvider';
import type { FaixaEtaria } from '../api/ia-assistiva';

const SEQUENCIA_PILOTO_EXEMPLO = [
  {
    semana: 'Semana 1 — Fevereiro 2026',
    campoDeExperiencia: 'O eu, o outro e o nós',
    objetivoBNCC: 'EI03EO01 — Demonstrar empatia pelos outros, percebendo que as pessoas têm diferentes sentimentos, necessidades e maneiras de pensar e agir.',
    objetivoCurriculo: 'Reconhecer e respeitar as diferenças individuais, desenvolvendo atitudes de cooperação e solidariedade nas relações com os colegas.',
  },
  {
    semana: 'Semana 2 — Fevereiro 2026',
    campoDeExperiencia: 'Corpo, gestos e movimentos',
    objetivoBNCC: 'EI03CG01 — Criar com o corpo formas diversificadas de expressão de sentimentos, sensações e emoções, tanto nas situações do cotidiano quanto em brincadeiras, dança, teatro, música.',
    objetivoCurriculo: 'Explorar as possibilidades expressivas do corpo por meio de movimentos, gestos e danças, ampliando o repertório corporal e a consciência corporal.',
  },
  {
    semana: 'Semana 3 — Fevereiro 2026',
    campoDeExperiencia: 'Traços, sons, cores e formas',
    objetivoBNCC: 'EI03TS01 — Utilizar sons produzidos por materiais, objetos e instrumentos musicais durante brincadeiras de faz de conta, encenações, criações musicais, festas.',
    objetivoCurriculo: 'Explorar diferentes materiais e suportes para produzir criações artísticas, desenvolvendo a percepção estética e a expressão criativa.',
  },
  {
    semana: 'Semana 4 — Fevereiro 2026',
    campoDeExperiencia: 'Escuta, fala, pensamento e imaginação',
    objetivoBNCC: 'EI03EF01 — Expressar ideias, desejos e sentimentos sobre suas vivências, por meio da linguagem oral e escrita (escrita espontânea), de fotos, desenhos e outras formas de expressão.',
    objetivoCurriculo: 'Ampliar o vocabulário e a capacidade de comunicação oral, desenvolvendo a escuta ativa e a expressão de ideias com clareza e criatividade.',
  },
];

const STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  PUBLICADO: 'Publicado',
  ARQUIVADO: 'Arquivado',
  EM_REVISAO: 'Em Revisão',
};

const STATUS_CORES: Record<string, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-700',
  PUBLICADO: 'bg-green-100 text-green-800',
  ARQUIVADO: 'bg-orange-100 text-orange-800',
  EM_REVISAO: 'bg-blue-100 text-blue-800',
};

export function PlanningsPage() {
  const { user } = useAuth();
  const [planejamentos, setPlanejamentos] = useState<Planning[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [semanaAtiva, setSemanaAtiva] = useState(0);
  const [expandidoGerador, setExpandidoGerador] = useState(false);
  const [planejamentoExpandido, setPlanejamentoExpandido] = useState<string | null>(null);
  const faixaEtaria: FaixaEtaria = 'EI03';

  const carregarPlanejamentos = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await getPlannings(filtroStatus ? { status: filtroStatus } : undefined);
      setPlanejamentos(dados || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar planejamentos.';
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  }, [filtroStatus]);

  useEffect(() => { carregarPlanejamentos(); }, [carregarPlanejamentos]);

  const sequenciaAtiva = SEQUENCIA_PILOTO_EXEMPLO[semanaAtiva];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-blue-600" />
          Planejamentos Pedagógicos
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Crie planejamentos alinhados à Sequência Piloto 2026 com apoio de Inteligência Artificial.
        </p>
      </header>

      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl p-5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 opacity-80" />
            <h2 className="text-base font-semibold">Sequência Piloto 2026 — Semana Atual</h2>
          </div>
          <div className="flex gap-1">
            {SEQUENCIA_PILOTO_EXEMPLO.map((_, i) => (
              <button key={i} onClick={() => setSemanaAtiva(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === semanaAtiva ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        </div>
        <p className="text-xs text-blue-200 mb-3">{sequenciaAtiva.semana}</p>
        <div className="space-y-2">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-200 mb-1">Campo de Experiência</p>
            <p className="text-sm font-medium">{sequenciaAtiva.campoDeExperiencia}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-200 mb-1">Objetivo BNCC</p>
            <p className="text-xs leading-relaxed">{sequenciaAtiva.objetivoBNCC}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-200 mb-1">Objetivo Currículo em Movimento DF</p>
            <p className="text-xs leading-relaxed">{sequenciaAtiva.objetivoCurriculo}</p>
          </div>
        </div>
        <button onClick={() => setExpandidoGerador(!expandidoGerador)}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-white text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors">
          <Sparkles className="h-4 w-4" />
          {expandidoGerador ? 'Fechar Gerador de Atividade' : 'Gerar Atividade com IA para esta Semana'}
        </button>
      </section>

      {expandidoGerador && (
        <GeradorAtividadeIA
          campoDeExperiencia={sequenciaAtiva.campoDeExperiencia}
          objetivoBNCC={sequenciaAtiva.objetivoBNCC}
          objetivoCurriculo={sequenciaAtiva.objetivoCurriculo}
          faixaEtariaPadrao={faixaEtaria}
          onAtividadeGerada={(atividade) => { console.log('Atividade gerada:', atividade); }}
        />
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            Meus Planejamentos
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-gray-400" />
              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Todos os status</option>
                <option value="RASCUNHO">Rascunho</option>
                <option value="PUBLICADO">Publicado</option>
                <option value="EM_REVISAO">Em Revisão</option>
                <option value="ARQUIVADO">Arquivado</option>
              </select>
            </div>
            <button onClick={carregarPlanejamentos} disabled={carregando}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {erro && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{erro}</p>
          </div>
        )}

        {carregando ? (
          <div className="text-center py-10 text-gray-400">
            <RefreshCw className="h-7 w-7 animate-spin mx-auto mb-2" />
            <p className="text-sm">Carregando planejamentos...</p>
          </div>
        ) : planejamentos.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <BookOpen className="h-9 w-9 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Nenhum planejamento encontrado.</p>
            <p className="text-xs text-gray-400 mt-1">Use o gerador de IA acima para criar seu primeiro planejamento.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {planejamentos.map((p) => {
              const expandido = planejamentoExpandido === p.id;
              return (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setPlanejamentoExpandido(expandido ? null : p.id)}>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CORES[p.status] || 'bg-gray-100 text-gray-700'}`}>
                        {p.status === 'PUBLICADO' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {STATUS_LABELS[p.status] || p.status}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{p.title}</p>
                        {p.startDate && (
                          <p className="text-xs text-gray-500">
                            {new Date(p.startDate).toLocaleDateString('pt-BR')}
                            {p.endDate && ` até ${new Date(p.endDate).toLocaleDateString('pt-BR')}`}
                          </p>
                        )}
                      </div>
                    </div>
                    {expandido ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                  {expandido && (
                    <div className="border-t border-gray-100 p-4 space-y-3">
                      {p.description && <p className="text-sm text-gray-700">{p.description}</p>}
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div><span className="font-medium">Tipo:</span> {(p.type as string) || '—'}</div>
                        <div><span className="font-medium">Criado em:</span> {p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : '—'}</div>
                      </div>
                      <div className="pt-2 border-t border-gray-100">
                        <GeradorAtividadeIA
                          campoDeExperiencia={sequenciaAtiva.campoDeExperiencia}
                          objetivoBNCC={sequenciaAtiva.objetivoBNCC}
                          objetivoCurriculo={sequenciaAtiva.objetivoCurriculo}
                          faixaEtariaPadrao={faixaEtaria}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {user && (
        <p className="text-xs text-gray-400 text-center">
          Planejamentos de <span className="font-medium">{(user.nome as string) || user.email}</span> · Conexa V2 © 2026
        </p>
      )}
    </div>
  );
}
