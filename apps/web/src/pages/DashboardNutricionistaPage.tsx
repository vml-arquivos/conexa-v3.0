/**
 * Dashboard da Nutricionista
 * Acesso: UNIDADE_NUTRICIONISTA
 * Abas: Dietas/Restrições | Pedidos de Alimentação | Resumo por Turma | Cardápio | Nutrição
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { listConfiguracoesRefeicao } from '../api/configuracao-refeicao';
import { PageShell } from '@/components/ui/PageShell';
import http from '../api/http';
import { useAuth } from '../app/AuthProvider';
import {
  Apple, AlertTriangle, ShoppingCart, Users, Search,
  RefreshCw, Plus, ChevronDown, ChevronUp,
  CheckCircle, Clock, XCircle, Printer, BookOpen,
  BarChart2, ChevronLeft, ChevronRight, Save, Trash2,
  Settings, GripVertical, History, Eye, FileEdit, X, FileText, Download,
  Activity, Heart, TrendingDown, TrendingUp, UserCheck, CalendarClock, Clipboard,
} from 'lucide-react';
import {
  listCardapios, createCardapio, updateCardapio, upsertRefeicao, deleteCardapio, calcularNutricao,
  getSemanaAtual, getSemanaAnterior, getProximaSemana, formatarSemana,
  DIAS_SEMANA, TIPOS_REFEICAO, DIA_SEMANA_LABELS, TIPO_REFEICAO_LABELS,
  type Cardapio, type CardapioItem, type DiaSemana, type TipoRefeicao, type NutricaoResponse,
} from '../api/cardapio';
import {
  listAlimentos, agruparPorCategoria, calcularMacrosPorQuantidade,
  type Alimento,
} from '../api/alimentos';
import {
  listTodasConfiguracoesRefeicao, createConfiguracaoRefeicao,
  updateConfiguracaoRefeicao, removeConfiguracaoRefeicao,
  type ConfiguracaoRefeicao,
} from '../api/configuracao-refeicao';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface DietaryRestriction {
  id: string;
  type: string;
  name: string;
  description?: string;
  severity?: string;
  allowedFoods?: string;
  forbiddenFoods?: string;
  isActive: boolean;
  child: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    enrollments: { classroom: { id: string; name: string } }[];
  };
}

interface ItemPedido {
  id: string;
  categoria: string;
  descricao: string;
  quantidade: number;
  unidadeMedida?: string;
  custoEstimado?: number;
}

interface PedidoCompra {
  id: string;
  mesReferencia: string;
  status: string;
  observacoes?: string;
  criadoEm: string;
  unit?: { id: string; name: string };
  itens: ItemPedido[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  severa:   { label: 'Severa',   color: 'text-red-700',    bg: 'bg-red-100',    icon: '🚨' },
  moderada: { label: 'Moderada', color: 'text-orange-700', bg: 'bg-orange-100', icon: '⚠️' },
  leve:     { label: 'Leve',     color: 'text-yellow-700', bg: 'bg-yellow-100', icon: '⚡' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  RASCUNHO:   { label: 'Rascunho',   color: 'text-gray-600',   bg: 'bg-gray-100'   },
  ENVIADO:    { label: 'Enviado',    color: 'text-blue-700',   bg: 'bg-blue-100'   },
  EM_ANALISE: { label: 'Em Análise', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  APROVADO:   { label: 'Aprovado',   color: 'text-green-700',  bg: 'bg-green-100'  },
  COMPRADO:   { label: 'Comprado',   color: 'text-purple-700', bg: 'bg-purple-100' },
  EM_ENTREGA: { label: 'Em Entrega', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  ENTREGUE:   { label: 'Entregue',   color: 'text-green-800',  bg: 'bg-green-200'  },
  CANCELADO:  { label: 'Cancelado',  color: 'text-red-700',    bg: 'bg-red-100'    },
};

const TYPE_LABEL: Record<string, string> = {
  ALERGIA: 'Alergia', INTOLERANCIA: 'Intolerância',
  PREFERENCIA: 'Preferência', RELIGIOSA: 'Religiosa',
  MEDICA: 'Médica', OUTRA: 'Outra',
};

function calcIdade(dob: string): string {
  const hoje = new Date();
  const nasc = new Date(dob);
  const anos = hoje.getFullYear() - nasc.getFullYear();
  const meses = hoje.getMonth() - nasc.getMonth();
  if (anos === 0) return `${meses < 0 ? 0 : meses} meses`;
  return `${anos} ano${anos !== 1 ? 's' : ''}`;
}

// ─── Sub-componente: Aba Turmas e Crianças ────────────────────────────────────
interface ChildRecord {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  photoUrl?: string;
  enrollments: { classroom: { id: string; name: string } }[];
  dietaryRestrictions?: { id: string; type: string; name: string; severity?: string }[];
  healthHistory?: { peso?: number; altura?: number; data?: string }[];
}

function AbaTurmasCriancas({ unitId }: { unitId: string }) {
  const [turmas, setTurmas] = useState<{ id: string; name: string }[]>([]);
  const [turmaSel, setTurmaSel] = useState<string>('');
  const [criancas, setCriancas] = useState<ChildRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [criancaSel, setCriancaSel] = useState<ChildRecord | null>(null);
  const [abaCrianca, setAbaCrianca] = useState<'alunos' | 'presenca' | 'alimentacao' | 'peso'>('alunos');
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState('');
  const [erro, setErro] = useState('');
  const [historicoMed, setHistoricoMed] = useState<{ peso?: number; altura?: number; data?: string; obs?: string }[]>([]);

  useEffect(() => {
    if (!unitId) return;
    http.get('/lookup/classrooms/accessible', { params: { unitId } })
      .then((r) => {
        const lista = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
        setTurmas(lista);
        if (lista.length > 0) setTurmaSel(lista[0].id);
      })
      .catch(() => setTurmas([]));
  }, [unitId]);

  useEffect(() => {
    if (!turmaSel) return;
    setLoading(true);
    setCriancaSel(null);
    http.get(`/lookup/classrooms/${turmaSel}/children`)
      .then((r) => {
        const lista = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
        setCriancas(lista);
      })
      .catch(() => setCriancas([]))
      .finally(() => setLoading(false));
  }, [turmaSel]);

  const carregarHistorico = useCallback(async (childId: string) => {
    try {
      const r = await http.get('/diary-events', { params: { childId, type: 'SAUDE', limit: '30' } });
      const eventos = r.data?.data ?? r.data ?? [];
      const meds = eventos
        .filter((e: any) => e.medicaoAlimentar && (e.medicaoAlimentar.peso || e.medicaoAlimentar.altura))
        .map((e: any) => ({
          peso: e.medicaoAlimentar?.peso,
          altura: e.medicaoAlimentar?.altura,
          data: e.occurredAt ?? e.eventDate,
          obs: e.description,
        }));
      setHistoricoMed(meds);
    } catch {
      setHistoricoMed([]);
    }
  }, []);

  const selecionarCrianca = (c: ChildRecord) => {
    setCriancaSel(c);
    setAbaCrianca('alunos');
    setPeso(''); setAltura('');
    setSucesso(''); setErro('');
    carregarHistorico(c.id);
  };

  const registrarMedicao = async () => {
    if (!criancaSel || (!peso && !altura)) {
      setErro('Informe pelo menos peso ou altura.'); return;
    }
    setSalvando(true); setErro(''); setSucesso('');
    try {
      await http.post('/diary-events', {
        childId: criancaSel.id,
        classroomId: turmaSel,
        type: 'SAUDE',
        title: 'Medição Antropométrica',
        occurredAt: new Date().toISOString(),
        medicaoAlimentar: {
          peso: peso ? Number(peso) : undefined,
          altura: altura ? Number(altura) : undefined,
        },
      });
      setSucesso('Medição registrada com sucesso.');
      setPeso(''); setAltura('');
      carregarHistorico(criancaSel.id);
    } catch {
      setErro('Erro ao registrar medição.');
    } finally {
      setSalvando(false);
    }
  };

  const calcIMC = (p: number, a: number) => (p / ((a / 100) ** 2)).toFixed(1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna esquerda: seletor de turma + lista */}
      <div className="bg-white rounded-xl border p-4 space-y-3 lg:col-span-1">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-orange-500" />
          <h3 className="font-semibold text-gray-800 text-sm">Turmas e Crianças</h3>
        </div>
        <select
          value={turmaSel}
          onChange={(e) => setTurmaSel(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="">Selecione uma turma...</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {loading ? (
          <p className="text-center text-sm text-gray-400 py-6">Carregando...</p>
        ) : criancas.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-6">Nenhuma criança nesta turma.</p>
        ) : (
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {criancas.map((c) => {
              const temRestricao = (c.dietaryRestrictions?.length ?? 0) > 0;
              return (
                <button
                  key={c.id}
                  onClick={() => selecionarCrianca(c)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    criancaSel?.id === c.id
                      ? 'bg-orange-50 text-orange-700 font-medium border border-orange-200'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold flex-shrink-0">
                    {c.firstName?.[0]}{c.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{c.firstName} {c.lastName}</p>
                    {temRestricao && (
                      <p className="text-xs text-red-500">⚠️ {c.dietaryRestrictions!.length} restrição</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Coluna direita: detalhe da criança */}
      <div className="lg:col-span-2">
        {!criancaSel ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Selecione uma criança</p>
            <p className="text-sm mt-1">Escolha uma turma e clique em uma criança para ver os detalhes.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cabeçalho */}
            <div className="bg-white rounded-xl border p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-lg">
                {criancaSel.firstName?.[0]}{criancaSel.lastName?.[0]}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">{criancaSel.firstName} {criancaSel.lastName}</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {criancaSel.dateOfBirth && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                      {calcIdade(criancaSel.dateOfBirth)}
                    </span>
                  )}
                  {(criancaSel.dietaryRestrictions?.length ?? 0) > 0 && (
                    <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                      ⚠️ {criancaSel.dietaryRestrictions!.length} restrição alimentar
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Abas da criança */}
            <div className="flex gap-2 border-b pb-1">
              {(['alunos', 'alimentacao', 'peso'] as const).map((aba) => (
                <button
                  key={aba}
                  onClick={() => setAbaCrianca(aba)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    abaCrianca === aba ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {aba === 'alunos' ? 'Dados' : aba === 'alimentacao' ? 'Alimentação' : 'Peso/Altura'}
                </button>
              ))}
            </div>

            {/* Aba Dados */}
            {abaCrianca === 'alunos' && (
              <div className="bg-white rounded-xl border p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Dados da Criança</h4>
                {criancaSel.dateOfBirth && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Data de Nascimento</span>
                    <span className="text-gray-700">{new Date(criancaSel.dateOfBirth).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Turma</span>
                  <span className="text-gray-700">{turmas.find((t) => t.id === turmaSel)?.name}</span>
                </div>
                {(criancaSel.dietaryRestrictions?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Restrições Alimentares</p>
                    <div className="space-y-2">
                      {criancaSel.dietaryRestrictions!.map((r) => {
                        const sev = SEVERITY_CONFIG[r.severity ?? 'leve'] ?? SEVERITY_CONFIG['leve'];
                        return (
                          <div key={r.id} className={`flex items-center gap-2 p-2 rounded-lg ${sev.bg}`}>
                            <span>{sev.icon}</span>
                            <div>
                              <p className="text-xs font-medium text-gray-800">{r.name}</p>
                              <p className="text-xs text-gray-500">{TYPE_LABEL[r.type] ?? r.type} — {sev.label}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Aba Alimentação */}
            {abaCrianca === 'alimentacao' && (
              <div className="bg-white rounded-xl border p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Observações de Alimentação</h4>
                <p className="text-sm text-gray-400 text-center py-6">
                  Observações de alimentação registradas pelos professores aparecerão aqui.
                </p>
              </div>
            )}

            {/* Aba Peso/Altura */}
            {abaCrianca === 'peso' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Registrar Medição</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Peso (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={peso}
                        onChange={(e) => setPeso(e.target.value)}
                        placeholder="Ex: 15.5"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Altura (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={altura}
                        onChange={(e) => setAltura(e.target.value)}
                        placeholder="Ex: 95.0"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                  </div>
                  {peso && altura && Number(peso) > 0 && Number(altura) > 0 && (
                    <div className="bg-orange-50 rounded-lg p-3 text-sm">
                      <span className="text-gray-600">IMC calculado: </span>
                      <span className="font-bold text-orange-700">{calcIMC(Number(peso), Number(altura))}</span>
                    </div>
                  )}
                  {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
                  {sucesso && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{sucesso}</p>}
                  <button
                    onClick={registrarMedicao}
                    disabled={salvando}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {salvando ? 'Salvando...' : 'Registrar Diagnóstico'}
                  </button>
                </div>

                {/* Histórico de medições */}
                <div className="bg-white rounded-xl border p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Histórico de Medições</h4>
                  {historicoMed.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhum diagnóstico registrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {historicoMed.map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">⚖️</span>
                            <div>
                              <p className="font-medium text-gray-700">
                                {m.peso && `${m.peso}kg`}{m.peso && m.altura && ' · '}{m.altura && `${m.altura}cm`}
                                {m.peso && m.altura && ` · IMC: ${calcIMC(m.peso, m.altura)}`}
                              </p>
                              {m.obs && <p className="text-xs text-gray-500">{m.obs}</p>}
                            </div>
                          </div>
                          {m.data && (
                            <span className="text-xs text-gray-400">
                              {new Date(m.data).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-componente: Aba Dietas e Restrições ─────────────────────────────────
function AbaDietasRestricoes({ unitId }: { unitId: string }) {
  const [restricoes, setRestricoes] = useState<DietaryRestriction[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroSev, setFiltroSev] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await http.get('/children/dietary-restrictions/unidade', { params: { unitId, limit: '500' } });
      setRestricoes(Array.isArray(r.data) ? r.data : r.data?.data ?? []);
    } catch { setRestricoes([]); }
    finally { setLoading(false); }
  }, [unitId]);

  useEffect(() => { carregar(); }, [carregar]);

  const filtradas = restricoes.filter((r) => {
    const q = busca.toLowerCase();
    const nomeOk = !q || `${r.child?.firstName} ${r.child?.lastName}`.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
    const sevOk = !filtroSev || r.severity === filtroSev;
    return nomeOk && sevOk;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar criança ou restrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <select
            value={filtroSev}
            onChange={(e) => setFiltroSev(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="">Todas as severidades</option>
            <option value="severa">Severa</option>
            <option value="moderada">Moderada</option>
            <option value="leve">Leve</option>
          </select>
        </div>
        <button onClick={carregar} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="text-sm text-gray-500">{filtradas.length} restrição{filtradas.length !== 1 ? 'ões' : ''} encontrada{filtradas.length !== 1 ? 's' : ''}</div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando restrições...</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Nenhuma restrição encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((r) => {
            const sev = SEVERITY_CONFIG[r.severity ?? 'leve'] ?? SEVERITY_CONFIG['leve'];
            const turma = r.child?.enrollments?.[0]?.classroom?.name ?? 'Sem turma';
            return (
              <div key={r.id} className={`bg-white rounded-xl border p-4 flex gap-4`}>
                <div className={`flex-shrink-0 w-10 h-10 rounded-full ${sev.bg} flex items-center justify-center text-lg`}>
                  {sev.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">
                      {r.child?.firstName} {r.child?.lastName}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{turma}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sev.bg} ${sev.color}`}>{sev.label}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{TYPE_LABEL[r.type] ?? r.type}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mt-1">{r.name}</p>
                  {r.description && <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>}
                  {r.forbiddenFoods && (
                    <p className="text-xs text-red-700 mt-0.5"><span className="font-semibold">Proibido:</span> {r.forbiddenFoods}</p>
                  )}
                  {r.allowedFoods && (
                    <p className="text-xs text-green-700 mt-0.5"><span className="font-semibold">Permitido:</span> {r.allowedFoods}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sub-componente: Aba Pedidos de Alimentação ──────────────────────────────
function AbaPedidosAlimentacao({ unitId }: { unitId: string }) {
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [loading, setLoading] = useState(false);
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await http.get('/pedidos-compra', { params: { unitId, mesReferencia: mes } });
      setPedidos(Array.isArray(r.data) ? r.data : r.data?.data ?? []);
    } catch { setPedidos([]); }
    finally { setLoading(false); }
  }, [unitId, mes]);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        <button onClick={carregar} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>
      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando pedidos...</div>
      ) : pedidos.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Nenhum pedido para este mês</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => {
            const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG['RASCUNHO'];
            return (
              <div key={p.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800">{p.mesReferencia}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                </div>
                <p className="text-xs text-gray-500">{p.itens?.length ?? 0} itens</p>
                {p.observacoes && <p className="text-xs text-gray-600 mt-1">{p.observacoes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sub-componente: Aba Relatórios ──────────────────────────────────────────
function AbaRelatorios({ unitId }: { unitId: string }) {
  return (
    <div className="text-center py-16 text-gray-400 bg-white rounded-xl border">
      <FileText className="w-16 h-16 mx-auto mb-4 text-gray-200" />
      <p className="font-medium text-gray-500">Relatórios Nutricionais</p>
      <p className="text-sm mt-1">Em desenvolvimento — exportação PDF e relatórios consolidados.</p>
    </div>
  );
}

// ─── Sub-componente: Aba Observações dos Professores ─────────────────────────
interface DiaryEventItem {
  id: string;
  type: string;
  title?: string;
  description?: string;
  occurredAt: string;
  createdBy?: string;
  child?: { id: string; firstName: string; lastName: string };
  classroom?: { id: string; name: string };
}

const DIARY_TYPE_LABEL: Record<string, string> = {
  REFEICAO: 'Refeição', ALIMENTACAO: 'Alimentação', SAUDE: 'Saúde',
  COMPORTAMENTO: 'Comportamento', SONO: 'Sono', ATIVIDADE: 'Atividade',
  OCORRENCIA: 'Ocorrência', OUTRO: 'Outro',
};

function AbaObservacoesProfessores({ unitId }: { unitId: string }) {
  const [eventos, setEventos] = useState<DiaryEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<'REFEICAO' | 'ALIMENTACAO' | ''>('REFEICAO');
  const [busca, setBusca] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('');
  const [turmas, setTurmas] = useState<{ id: string; name: string }[]>([]);
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    http.get('/lookup/classrooms/accessible', { params: { unitId } })
      .then((r) => setTurmas(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(() => setTurmas([]));
  }, [unitId]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { unitId, limit: '200', startDate: dataInicio, endDate: dataFim };
      if (filtroTipo) params.type = filtroTipo;
      if (filtroTurma) params.classroomId = filtroTurma;
      const res = await http.get('/diary-events', { params });
      setEventos(res.data?.data ?? res.data ?? []);
    } catch { setEventos([]); }
    finally { setLoading(false); }
  }, [unitId, filtroTipo, filtroTurma, dataInicio, dataFim]);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = eventos.filter((e) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      e.child?.firstName?.toLowerCase().includes(q) ||
      e.child?.lastName?.toLowerCase().includes(q) ||
      e.classroom?.name?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.title?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar por criança, turma ou descrição..." value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
        </div>
        <select value={filtroTurma} onChange={(e) => setFiltroTurma(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
          <option value="">Todas as turmas</option>
          {turmas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as 'REFEICAO' | 'ALIMENTACAO' | '')}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
          <option value="REFEICAO">Refeições</option>
          <option value="ALIMENTACAO">Alimentação</option>
          <option value="">Todos os tipos</option>
        </select>
        <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
        <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
        <button onClick={carregar} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>
      <div className="text-sm text-gray-500">{filtrados.length} registro{filtrados.length !== 1 ? 's' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}</div>
      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando observações...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
          <Eye className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Nenhuma observação encontrada</p>
          <p className="text-sm mt-1">Os professores ainda não registraram observações alimentares no período selecionado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((e) => (
            <div key={e.id} className="bg-white rounded-xl border p-4 flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-lg">
                {e.type === 'REFEICAO' ? '🍽️' : '🥕'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800 text-sm">
                    {e.child ? `${e.child.firstName} ${e.child.lastName}` : 'Criança não identificada'}
                  </span>
                  {e.classroom && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{e.classroom.name}</span>}
                  <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{DIARY_TYPE_LABEL[e.type] ?? e.type}</span>
                </div>
                {e.title && <p className="text-sm font-medium text-gray-700 mt-1">{e.title}</p>}
                {e.description && <p className="text-sm text-gray-600 mt-0.5">{e.description}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(e.occurredAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  {e.createdBy && ` — por ${e.createdBy}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-componente: Aba Anotações Nutricionais ──────────────────────────────
interface DevObservation {
  id: string; childId: string; dietaryNotes?: string;
  recommendations?: string; healthNotes?: string;
  date: string; createdBy: string;
  child?: { id: string; firstName: string; lastName: string };
}

function AbaAnotacoesNutricionais({ unitId, userId }: { unitId: string; userId: string }) {
  const [criancas, setCriancas] = useState<{ id: string; firstName: string; lastName: string; enrollments: { classroom: { id: string; name: string } }[] }[]>([]);
  const [criancaSelecionada, setCriancaSelecionada] = useState<string>('');
  const [observacoes, setObservacoes] = useState<DevObservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroTurmaAnot, setFiltroTurmaAnot] = useState('');
  const [turmasAnot, setTurmasAnot] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ dietaryNotes: '', recommendations: '', healthNotes: '' });
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    http.get('/lookup/classrooms/accessible', { params: { unitId } })
      .then((r) => setTurmasAnot(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(() => setTurmasAnot([]));
  }, [unitId]);

  useEffect(() => {
    if (!unitId) return;
    http.get('/lookup/classrooms/accessible', { params: { unitId } })
      .then(async (r) => {
        const turmasList: { id: string; name: string }[] = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
        const resultados = await Promise.allSettled(
          turmasList.map((t) =>
            http.get(`/lookup/classrooms/${t.id}/children`).then((res) => ({
              turmaId: t.id, turmaName: t.name,
              children: Array.isArray(res.data) ? res.data : res.data?.data ?? [],
            }))
          )
        );
        const mapa = new Map<string, { id: string; firstName: string; lastName: string; enrollments: { classroom: { id: string; name: string } }[] }>();
        resultados.forEach((res) => {
          if (res.status === 'fulfilled') {
            const { turmaId, turmaName, children } = res.value;
            children.forEach((c: any) => {
              if (!mapa.has(c.id)) mapa.set(c.id, { id: c.id, firstName: c.firstName, lastName: c.lastName, enrollments: [] });
              mapa.get(c.id)!.enrollments.push({ classroom: { id: turmaId, name: turmaName } });
            });
          }
        });
        setCriancas(Array.from(mapa.values()).sort((a, b) => a.firstName.localeCompare(b.firstName)));
      })
      .catch(() => setCriancas([]));
  }, [unitId]);

  const carregarObs = useCallback(async () => {
    if (!criancaSelecionada) return;
    setLoading(true);
    try {
      const r = await http.get('/development-observations', { params: { childId: criancaSelecionada, category: 'NUTRICAO', limit: '50' } });
      setObservacoes(r.data?.data ?? r.data ?? []);
    } catch { setObservacoes([]); }
    finally { setLoading(false); }
  }, [criancaSelecionada]);

  useEffect(() => { carregarObs(); }, [carregarObs]);

  const salvar = async () => {
    if (!criancaSelecionada) { setErro('Selecione uma criança.'); return; }
    if (!form.dietaryNotes && !form.recommendations && !form.healthNotes) { setErro('Preencha pelo menos um campo.'); return; }
    setSalvando(true); setErro(''); setSucesso('');
    try {
      if (editandoId) {
        await http.patch(`/development-observations/${editandoId}`, {
          dietaryNotes: form.dietaryNotes || undefined,
          recommendations: form.recommendations || undefined,
          healthNotes: form.healthNotes || undefined,
        });
      } else {
        await http.post('/development-observations', {
          childId: criancaSelecionada, category: 'NUTRICAO', createdBy: userId,
          date: new Date().toISOString(),
          dietaryNotes: form.dietaryNotes || undefined,
          recommendations: form.recommendations || undefined,
          healthNotes: form.healthNotes || undefined,
        });
      }
      setSucesso('Anotação salva com sucesso.');
      setForm({ dietaryNotes: '', recommendations: '', healthNotes: '' });
      setEditandoId(null);
      carregarObs();
    } catch { setErro('Erro ao salvar. Tente novamente.'); }
    finally { setSalvando(false); }
  };

  const iniciarEdicao = (obs: DevObservation) => {
    setEditandoId(obs.id);
    setForm({ dietaryNotes: obs.dietaryNotes ?? '', recommendations: obs.recommendations ?? '', healthNotes: obs.healthNotes ?? '' });
    setSucesso(''); setErro('');
  };

  const cancelarEdicao = () => { setEditandoId(null); setForm({ dietaryNotes: '', recommendations: '', healthNotes: '' }); setErro(''); setSucesso(''); };

  const criancasFiltradas = criancas.filter((c) => {
    const q = busca.toLowerCase();
    const nomeOk = !q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q);
    const turmaOk = !filtroTurmaAnot || c.enrollments?.some((e) => e.classroom?.id === filtroTurmaAnot);
    return nomeOk && turmaOk;
  });

  const criancaAtual = criancas.find((c) => c.id === criancaSelecionada);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-xl border p-4 space-y-3 lg:col-span-1">
        <h3 className="font-semibold text-gray-800 text-sm">Selecionar Criança</h3>
        {turmasAnot.length > 0 && (
          <select value={filtroTurmaAnot} onChange={(e) => { setFiltroTurmaAnot(e.target.value); setCriancaSelecionada(''); }}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
            <option value="">Todas as turmas</option>
            {turmasAnot.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar criança..." value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
        </div>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {criancasFiltradas.map((c) => (
            <button key={c.id}
              onClick={() => { setCriancaSelecionada(c.id); setEditandoId(null); setForm({ dietaryNotes: '', recommendations: '', healthNotes: '' }); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                criancaSelecionada === c.id ? 'bg-orange-50 text-orange-700 font-medium border border-orange-200' : 'hover:bg-gray-50 text-gray-700'
              }`}>
              {c.firstName} {c.lastName}
              {c.enrollments?.[0]?.classroom?.name && <span className="text-xs text-gray-400 ml-1">({c.enrollments[0].classroom.name})</span>}
            </button>
          ))}
          {criancasFiltradas.length === 0 && <p className="text-center text-sm text-gray-400 py-4">Nenhuma criança encontrada.</p>}
        </div>
      </div>
      <div className="lg:col-span-2 space-y-4">
        {!criancaSelecionada ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <FileEdit className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Selecione uma criança</p>
            <p className="text-sm mt-1">Escolha uma criança na lista ao lado para ver ou criar anotações nutricionais.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">{editandoId ? 'Editar Anotação' : 'Nova Anotação'} — {criancaAtual?.firstName} {criancaAtual?.lastName}</h3>
                {editandoId && <button onClick={cancelarEdicao} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"><X className="w-3 h-3" /> Cancelar edição</button>}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Observações Alimentares</label>
                  <textarea rows={3} value={form.dietaryNotes} onChange={(e) => setForm((f) => ({ ...f, dietaryNotes: e.target.value }))}
                    placeholder="Descrição sobre alimentação, aceitação de alimentos, preferências..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Recomendações Nutricionais</label>
                  <textarea rows={2} value={form.recommendations} onChange={(e) => setForm((f) => ({ ...f, recommendations: e.target.value }))}
                    placeholder="Orientações, adaptações, substituições recomendadas..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Observações de Saúde Relacionadas</label>
                  <textarea rows={2} value={form.healthNotes} onChange={(e) => setForm((f) => ({ ...f, healthNotes: e.target.value }))}
                    placeholder="Condições de saúde relevantes para a alimentação..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
                </div>
              </div>
              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
              {sucesso && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{sucesso}</p>}
              <button onClick={salvar} disabled={salvando}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
                <Save className="w-4 h-4" />{salvando ? 'Salvando...' : editandoId ? 'Atualizar Anotação' : 'Salvar Anotação'}
              </button>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Histórico de Anotações</h3>
                <button onClick={carregarObs} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Atualizar</button>
              </div>
              {loading ? <p className="text-center text-sm text-gray-400 py-6">Carregando...</p>
              : observacoes.length === 0 ? <p className="text-center text-sm text-gray-400 py-6">Nenhuma anotação registrada para esta criança.</p>
              : (
                <div className="space-y-3">
                  {observacoes.map((obs) => (
                    <div key={obs.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{new Date(obs.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                        <button onClick={() => iniciarEdicao(obs)} className="text-xs text-orange-600 hover:underline flex items-center gap-1"><FileEdit className="w-3 h-3" /> Editar</button>
                      </div>
                      {obs.dietaryNotes && <div><p className="text-xs font-medium text-gray-500">Observações Alimentares</p><p className="text-sm text-gray-700 mt-0.5">{obs.dietaryNotes}</p></div>}
                      {obs.recommendations && <div><p className="text-xs font-medium text-gray-500">Recomendações</p><p className="text-sm text-gray-700 mt-0.5">{obs.recommendations}</p></div>}
                      {obs.healthNotes && <div><p className="text-xs font-medium text-gray-500">Saúde</p><p className="text-sm text-gray-700 mt-0.5">{obs.healthNotes}</p></div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── AbaAcompanhamentoIndividual ──────────────────────────────────────────────
type StatusCasoNutricional = 'MONITORAMENTO' | 'ATENCAO_MODERADA' | 'ATENCAO_ALTA' | 'CRITICO';

interface AcompanhamentoNutricional {
  id: string; childId: string; statusCaso: StatusCasoNutricional; ativo: boolean;
  motivoAcompanhamento: string; objetivos?: string; condutaAtual?: string;
  restricoesOperacionais?: string; substituicoesSeguras?: string;
  orientacoesProfCozinha?: string; frequenciaRevisao?: string;
  proximaReavaliacao?: string; criadoEm: string; atualizadoEm: string;
  child?: {
    id: string; firstName: string; lastName: string; dateOfBirth?: string;
    photoUrl?: string; allergies?: string; medicalConditions?: string;
    enrollments?: { classroom?: { id: string; name: string } }[];
    dietaryRestrictions?: { id: string; type: string; name: string; severity?: string; forbiddenFoods?: string; allowedFoods?: string }[];
  };
}

const STATUS_CASO_CONFIG: Record<StatusCasoNutricional, { label: string; color: string; bg: string; border: string; icon: string }> = {
  MONITORAMENTO:    { label: 'Monitoramento',    color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   icon: '🔵' },
  ATENCAO_MODERADA: { label: 'Atenção Moderada', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '🟡' },
  ATENCAO_ALTA:     { label: 'Atenção Alta',     color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: '🟠' },
  CRITICO:          { label: 'Crítico',           color: 'text-red-700',   bg: 'bg-red-50',   border: 'border-red-200',   icon: '🔴' },
};

function calcularIdade(dateOfBirth?: string): string {
  if (!dateOfBirth) return '';
  const nasc = new Date(dateOfBirth); const hoje = new Date();
  let anos = hoje.getFullYear() - nasc.getFullYear();
  const meses = hoje.getMonth() - nasc.getMonth();
  if (meses < 0 || (meses === 0 && hoje.getDate() < nasc.getDate())) anos--;
  const mesesRestantes = ((hoje.getMonth() - nasc.getMonth()) + 12) % 12;
  if (anos === 0) return `${mesesRestantes}m`;
  if (mesesRestantes === 0) return `${anos}a`;
  return `${anos}a ${mesesRestantes}m`;
}

function AbaAcompanhamentoIndividual({ unitId, userId }: { unitId: string; userId: string }) {
  const [lista, setLista] = useState<AcompanhamentoNutricional[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecionado, setSelecionado] = useState<AcompanhamentoNutricional | null>(null);
  const [criancas, setCriancas] = useState<{ id: string; firstName: string; lastName: string; enrollments: { classroom: { id: string; name: string } }[] }[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusCasoNutricional | ''>('');
  const [modoForm, setModoForm] = useState<'novo' | 'editar' | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [resumo, setResumo] = useState<{ total: number; criticos: number; atencaoAlta: number; atencaoModerada: number; monitoramento: number; vencidosReavaliacao: number } | null>(null);
  const [historico, setHistorico] = useState<{ id: string; date: string; dietaryNotes?: string; recommendations?: string; healthNotes?: string }[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [medicoes, setMedicoes] = useState<{ childId: string; peso?: number; altura?: number; data?: string; obs?: string }[]>([]);
  const [form, setForm] = useState({ childId: '', motivoAcompanhamento: '', statusCaso: 'MONITORAMENTO' as StatusCasoNutricional, objetivos: '', condutaAtual: '', restricoesOperacionais: '', substituicoesSeguras: '', orientacoesProfCozinha: '', frequenciaRevisao: '', proximaReavaliacao: '' });
  const [formTurmaId, setFormTurmaId] = useState('');

  const carregarResumo = useCallback(async () => {
    try { const { data } = await http.get('/acompanhamento-nutricional/resumo', { params: { unitId } }); setResumo(data); }
    catch { setResumo(null); }
  }, [unitId]);

  const carregarLista = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { unitId };
      if (filtroStatus) params.statusCaso = filtroStatus;
      const { data } = await http.get('/acompanhamento-nutricional', { params });
      setLista(Array.isArray(data) ? data : data?.data ?? []);
    } catch { setLista([]); }
    finally { setLoading(false); }
  }, [unitId, filtroStatus]);

  useEffect(() => {
    if (!unitId) return;
    http.get('/lookup/classrooms/accessible', { params: { unitId } })
      .then(async (r) => {
        const turmasList: { id: string; name: string }[] = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
        const resultados = await Promise.allSettled(turmasList.map((t) =>
          http.get(`/lookup/classrooms/${t.id}/children`).then((res) => ({ turmaId: t.id, turmaName: t.name, children: Array.isArray(res.data) ? res.data : res.data?.data ?? [] }))
        ));
        const mapa = new Map<string, { id: string; firstName: string; lastName: string; enrollments: { classroom: { id: string; name: string } }[] }>();
        resultados.forEach((res) => {
          if (res.status === 'fulfilled') {
            const { turmaId, turmaName, children } = res.value;
            children.forEach((c: any) => {
              if (!mapa.has(c.id)) mapa.set(c.id, { id: c.id, firstName: c.firstName, lastName: c.lastName, enrollments: [] });
              mapa.get(c.id)!.enrollments.push({ classroom: { id: turmaId, name: turmaName } });
            });
          }
        });
        setCriancas(Array.from(mapa.values()).sort((a, b) => a.firstName.localeCompare(b.firstName)));
      })
      .catch(() => setCriancas([]));
  }, [unitId]);

  useEffect(() => { carregarLista(); carregarResumo(); }, [carregarLista, carregarResumo]);

  const carregarHistorico = useCallback(async (childId: string) => {
    setLoadingHistorico(true);
    try {
      const [obsRes, pesoRes] = await Promise.allSettled([
        http.get('/development-observations', { params: { childId, category: 'NUTRICAO', limit: '20' } }),
        http.get('/diary-events', { params: { childId, type: 'SAUDE', limit: '30' } }),
      ]);
      setHistorico(obsRes.status === 'fulfilled' ? (obsRes.value.data?.data ?? obsRes.value.data ?? []) : []);
      if (pesoRes.status === 'fulfilled') {
        const eventos = pesoRes.value.data?.data ?? pesoRes.value.data ?? [];
        setMedicoes(eventos.filter((e: any) => e.medicaoAlimentar && (e.medicaoAlimentar.peso || e.medicaoAlimentar.altura))
          .map((e: any) => ({ childId: e.childId, peso: e.medicaoAlimentar?.peso, altura: e.medicaoAlimentar?.altura, data: e.occurredAt ?? e.eventDate, obs: e.description }))
          .slice(0, 10));
      }
    } catch { setHistorico([]); setMedicoes([]); }
    finally { setLoadingHistorico(false); }
  }, []);

  const abrirDetalhe = async (item: AcompanhamentoNutricional) => { setSelecionado(item); setModoForm(null); setErro(''); setSucesso(''); if (item.childId) carregarHistorico(item.childId); };

  const abrirFormNovo = () => {
    setSelecionado(null); setModoForm('novo');
    setForm({ childId: '', motivoAcompanhamento: '', statusCaso: 'MONITORAMENTO', objetivos: '', condutaAtual: '', restricoesOperacionais: '', substituicoesSeguras: '', orientacoesProfCozinha: '', frequenciaRevisao: '', proximaReavaliacao: '' });
    setFormTurmaId(''); setErro(''); setSucesso('');
  };

  const abrirFormEditar = (item: AcompanhamentoNutricional) => {
    setSelecionado(item); setModoForm('editar');
    setForm({ childId: item.childId, motivoAcompanhamento: item.motivoAcompanhamento ?? '', statusCaso: item.statusCaso, objetivos: item.objetivos ?? '', condutaAtual: item.condutaAtual ?? '', restricoesOperacionais: item.restricoesOperacionais ?? '', substituicoesSeguras: item.substituicoesSeguras ?? '', orientacoesProfCozinha: item.orientacoesProfCozinha ?? '', frequenciaRevisao: item.frequenciaRevisao ?? '', proximaReavaliacao: item.proximaReavaliacao ? item.proximaReavaliacao.slice(0, 10) : '' });
    setErro(''); setSucesso('');
  };

  const salvar = async () => {
    if (!form.childId || !form.motivoAcompanhamento.trim()) { setErro('Selecione uma criança e informe o motivo do acompanhamento.'); return; }
    setSalvando(true); setErro(''); setSucesso('');
    try {
      const { data } = await http.post('/acompanhamento-nutricional', { childId: form.childId, motivoAcompanhamento: form.motivoAcompanhamento, statusCaso: form.statusCaso, objetivos: form.objetivos || undefined, condutaAtual: form.condutaAtual || undefined, restricoesOperacionais: form.restricoesOperacionais || undefined, substituicoesSeguras: form.substituicoesSeguras || undefined, orientacoesProfCozinha: form.orientacoesProfCozinha || undefined, frequenciaRevisao: form.frequenciaRevisao || undefined, proximaReavaliacao: form.proximaReavaliacao || undefined });
      setSucesso('Acompanhamento salvo com sucesso.'); setModoForm(null); setSelecionado(data); carregarLista(); carregarResumo();
      if (data.childId) carregarHistorico(data.childId);
    } catch (e: any) { setErro(e?.response?.data?.message ?? 'Erro ao salvar. Tente novamente.'); }
    finally { setSalvando(false); }
  };

  const encerrar = async (childId: string) => {
    if (!confirm('Deseja encerrar este acompanhamento?')) return;
    try { await http.delete(`/acompanhamento-nutricional/crianca/${childId}`); setSelecionado(null); carregarLista(); carregarResumo(); }
    catch { setErro('Erro ao encerrar acompanhamento.'); }
  };

  const listafiltrada = lista.filter((item) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    const nome = `${item.child?.firstName ?? ''} ${item.child?.lastName ?? ''}`.toLowerCase();
    return nome.includes(q) || item.motivoAcompanhamento?.toLowerCase().includes(q);
  });

  const turmasUnicas = criancas.flatMap((c) => c.enrollments.map((e) => e.classroom))
    .filter((cls, idx, arr) => arr.findIndex((x) => x.id === cls.id) === idx)
    .sort((a, b) => a.name.localeCompare(b.name));

  const criancasDaTurma = formTurmaId ? criancas.filter((c) => c.enrollments.some((e) => e.classroom.id === formTurmaId)) : [];

  return (
    <div className="space-y-6">
      {resumo && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Ativos', value: resumo.total, color: 'text-gray-800', bg: 'bg-white' },
            { label: 'Críticos', value: resumo.criticos, color: 'text-red-700', bg: 'bg-red-50' },
            { label: 'Atenção Alta', value: resumo.atencaoAlta, color: 'text-orange-700', bg: 'bg-orange-50' },
            { label: 'Atenção Moderada', value: resumo.atencaoModerada, color: 'text-yellow-700', bg: 'bg-yellow-50' },
            { label: 'Reavaliação Vencida', value: resumo.vencidosReavaliacao, color: 'text-purple-700', bg: 'bg-purple-50' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl border p-3 text-center`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buscar criança ou motivo..." value={busca} onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as StatusCasoNutricional | '')}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
            <option value="">Todos os status</option>
            {(Object.keys(STATUS_CASO_CONFIG) as StatusCasoNutricional[]).map((s) => <option key={s} value={s}>{STATUS_CASO_CONFIG[s].label}</option>)}
          </select>
          <button onClick={() => { carregarLista(); carregarResumo(); }} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
        <button onClick={abrirFormNovo} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">
          <Plus className="w-4 h-4" /> Novo Acompanhamento
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3 lg:col-span-1">
          {loading ? <div className="text-center py-12 text-gray-500">Carregando...</div>
          : listafiltrada.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Nenhum caso encontrado</p>
              <p className="text-sm mt-1">Clique em "Novo Acompanhamento" para iniciar um caso.</p>
            </div>
          ) : listafiltrada.map((item) => {
            const cfg = STATUS_CASO_CONFIG[item.statusCaso];
            const turma = item.child?.enrollments?.[0]?.classroom?.name;
            const vencido = item.proximaReavaliacao && new Date(item.proximaReavaliacao) < new Date();
            return (
              <button key={item.id} onClick={() => abrirDetalhe(item)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${selecionado?.id === item.id ? `${cfg.bg} ${cfg.border} shadow-sm` : 'bg-white hover:bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{cfg.icon}</span>
                  <span className="font-semibold text-gray-800 text-sm">{item.child?.firstName} {item.child?.lastName}</span>
                </div>
                {turma && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{turma}</span>}
                <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{item.motivoAcompanhamento}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                  {vencido && <span className="text-xs text-purple-600 font-medium">⏰ Reavaliação vencida</span>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="lg:col-span-2">
          {modoForm && (
            <div className="bg-white rounded-xl border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Clipboard className="w-4 h-4 text-orange-500" />
                  {modoForm === 'novo' ? 'Novo Acompanhamento Nutricional' : 'Editar Acompanhamento'}
                </h3>
                <button onClick={() => setModoForm(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modoForm === 'novo' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Turma *</label>
                    <select value={formTurmaId} onChange={(e) => { setFormTurmaId(e.target.value); setForm((f) => ({ ...f, childId: '' })); }}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                      <option value="">Selecione uma turma...</option>
                      {turmasUnicas.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Criança *</label>
                  <select value={form.childId} onChange={(e) => setForm((f) => ({ ...f, childId: e.target.value }))}
                    disabled={modoForm === 'editar' || (modoForm === 'novo' && !formTurmaId)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:bg-gray-50 disabled:text-gray-400">
                    <option value="">{modoForm === 'novo' && !formTurmaId ? 'Selecione uma turma primeiro...' : 'Selecione uma criança...'}</option>
                    {(modoForm === 'editar' ? criancas : criancasDaTurma).map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Motivo do Acompanhamento *</label>
                  <textarea rows={2} value={form.motivoAcompanhamento} onChange={(e) => setForm((f) => ({ ...f, motivoAcompanhamento: e.target.value }))}
                    placeholder="Ex: Alergia severa a proteína do leite, obesidade, seletividade alimentar..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status do Caso</label>
                  <select value={form.statusCaso} onChange={(e) => setForm((f) => ({ ...f, statusCaso: e.target.value as StatusCasoNutricional }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                    {(Object.keys(STATUS_CASO_CONFIG) as StatusCasoNutricional[]).map((s) => <option key={s} value={s}>{STATUS_CASO_CONFIG[s].icon} {STATUS_CASO_CONFIG[s].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Próxima Reavaliação</label>
                  <input type="date" value={form.proximaReavaliacao} onChange={(e) => setForm((f) => ({ ...f, proximaReavaliacao: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Objetivos do Acompanhamento</label>
                  <textarea rows={2} value={form.objetivos} onChange={(e) => setForm((f) => ({ ...f, objetivos: e.target.value }))}
                    placeholder="Ex: Reduzir peso gradualmente, introduzir novos alimentos..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Conduta Atual</label>
                  <textarea rows={2} value={form.condutaAtual} onChange={(e) => setForm((f) => ({ ...f, condutaAtual: e.target.value }))}
                    placeholder="Descrição da conduta nutricional atual..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Restrições Operacionais</label>
                  <textarea rows={2} value={form.restricoesOperacionais} onChange={(e) => setForm((f) => ({ ...f, restricoesOperacionais: e.target.value }))}
                    placeholder="O que não pode ser servido a esta criança..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Substituições Seguras</label>
                  <textarea rows={2} value={form.substituicoesSeguras} onChange={(e) => setForm((f) => ({ ...f, substituicoesSeguras: e.target.value }))}
                    placeholder="Alternativas seguras para os alimentos restritos..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Orientações para Professor / Cozinha</label>
                  <textarea rows={2} value={form.orientacoesProfCozinha} onChange={(e) => setForm((f) => ({ ...f, orientacoesProfCozinha: e.target.value }))}
                    placeholder="Instruções práticas para o professor e a cozinha no dia a dia..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Frequência de Revisão</label>
                  <input type="text" value={form.frequenciaRevisao} onChange={(e) => setForm((f) => ({ ...f, frequenciaRevisao: e.target.value }))}
                    placeholder="Ex: Mensal, Quinzenal, Semanal..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
              </div>
              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
              {sucesso && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{sucesso}</p>}
              <div className="flex gap-3">
                <button onClick={salvar} disabled={salvando}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
                  <Save className="w-4 h-4" />{salvando ? 'Salvando...' : 'Salvar Acompanhamento'}
                </button>
                <button onClick={() => setModoForm(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              </div>
            </div>
          )}
          {!modoForm && selecionado && (() => {
            const cfg = STATUS_CASO_CONFIG[selecionado.statusCaso];
            const child = selecionado.child;
            const turma = child?.enrollments?.[0]?.classroom?.name;
            const idade = calcularIdade(child?.dateOfBirth);
            const vencido = selecionado.proximaReavaliacao && new Date(selecionado.proximaReavaliacao) < new Date();
            const ultimaMedicao = medicoes[0];
            const imc = ultimaMedicao?.peso && ultimaMedicao?.altura ? (ultimaMedicao.peso / ((ultimaMedicao.altura / 100) ** 2)).toFixed(1) : null;
            return (
              <div className="space-y-4">
                <div className={`bg-white rounded-xl border ${cfg.border} p-5`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {child?.photoUrl
                        ? <img src={child.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover border" />
                        : <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold text-lg">{child?.firstName?.[0]}{child?.lastName?.[0]}</div>
                      }
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{child?.firstName} {child?.lastName}</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {turma && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{turma}</span>}
                          {idade && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{idade}</span>}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
                          {vencido && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">⏰ Reavaliação vencida</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => abrirFormEditar(selecionado)} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs text-gray-600 hover:bg-gray-50"><FileEdit className="w-3.5 h-3.5" /> Editar</button>
                      <button onClick={() => encerrar(selecionado.childId)} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 rounded-lg text-xs text-red-600 hover:bg-red-50"><XCircle className="w-3.5 h-3.5" /> Encerrar</button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-orange-500" /> Última Medição</h4>
                    {ultimaMedicao ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Peso</span><span className="font-semibold">{ultimaMedicao.peso ? `${ultimaMedicao.peso} kg` : '—'}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Altura</span><span className="font-semibold">{ultimaMedicao.altura ? `${ultimaMedicao.altura} cm` : '—'}</span></div>
                        {imc && <div className="flex justify-between text-sm"><span className="text-gray-500">IMC</span><span className={`font-semibold ${Number(imc) > 25 ? 'text-orange-600' : Number(imc) < 18.5 ? 'text-blue-600' : 'text-green-600'}`}>{imc}</span></div>}
                        {ultimaMedicao.data && <p className="text-xs text-gray-400 mt-1">{new Date(ultimaMedicao.data).toLocaleDateString('pt-BR')}</p>}
                      </div>
                    ) : <p className="text-sm text-gray-400">Nenhuma medição registrada.</p>}
                  </div>
                  <div className={`${cfg.bg} rounded-xl border ${cfg.border} p-4`}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Heart className="w-4 h-4 text-orange-500" /> Status do Caso</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={`font-semibold ${cfg.color}`}>{cfg.icon} {cfg.label}</span></div>
                      {selecionado.frequenciaRevisao && <div className="flex justify-between"><span className="text-gray-500">Revisão</span><span className="font-medium">{selecionado.frequenciaRevisao}</span></div>}
                      {selecionado.proximaReavaliacao && <div className="flex justify-between"><span className="text-gray-500">Próx. Reavaliação</span><span className={`font-medium ${vencido ? 'text-red-600' : 'text-gray-700'}`}>{new Date(selecionado.proximaReavaliacao).toLocaleDateString('pt-BR')}</span></div>}
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border p-5 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Clipboard className="w-4 h-4 text-orange-500" /> Plano de Cuidado Nutricional</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Motivo do Acompanhamento', value: selecionado.motivoAcompanhamento, full: true },
                      { label: 'Objetivos', value: selecionado.objetivos, full: true },
                      { label: 'Conduta Atual', value: selecionado.condutaAtual, full: true },
                      { label: 'Restrições Operacionais', value: selecionado.restricoesOperacionais },
                      { label: 'Substituições Seguras', value: selecionado.substituicoesSeguras },
                      { label: 'Orientações para Professor / Cozinha', value: selecionado.orientacoesProfCozinha, full: true },
                    ].filter((f) => f.value).map((f) => (
                      <div key={f.label} className={f.full ? 'md:col-span-2' : ''}>
                        <p className="text-xs font-medium text-gray-500 mb-1">{f.label}</p>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><History className="w-4 h-4 text-orange-500" /> Linha do Tempo Nutricional</h4>
                    <button onClick={() => carregarHistorico(selecionado.childId)} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Atualizar</button>
                  </div>
                  {loadingHistorico ? <p className="text-center text-sm text-gray-400 py-4">Carregando histórico...</p>
                  : historico.length === 0 && medicoes.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Nenhum registro nutricional encontrado.</p>
                  : (
                    <div className="space-y-3">
                      {medicoes.map((m, idx) => (
                        <div key={idx} className="flex gap-3 items-start">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-sm">⚖️</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-blue-700">Medição Antropométrica</span>
                              {m.data && <span className="text-xs text-gray-400">{new Date(m.data).toLocaleDateString('pt-BR')}</span>}
                            </div>
                            <p className="text-sm text-gray-700 mt-0.5">{m.peso && `Peso: ${m.peso}kg`}{m.peso && m.altura && ' · '}{m.altura && `Altura: ${m.altura}cm`}{m.peso && m.altura && ` · IMC: ${(m.peso / ((m.altura / 100) ** 2)).toFixed(1)}`}</p>
                          </div>
                        </div>
                      ))}
                      {historico.map((obs) => (
                        <div key={obs.id} className="flex gap-3 items-start">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-sm">📋</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-orange-700">Anotação Nutricional</span>
                              <span className="text-xs text-gray-400">{new Date(obs.date).toLocaleDateString('pt-BR')}</span>
                            </div>
                            {obs.dietaryNotes && <p className="text-sm text-gray-700 mt-0.5">{obs.dietaryNotes}</p>}
                            {obs.recommendations && <p className="text-xs text-gray-500 mt-0.5"><strong>Rec:</strong> {obs.recommendations}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          {!modoForm && !selecionado && (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border">
              <Activity className="w-16 h-16 mx-auto mb-4 text-gray-200" />
              <p className="font-medium text-gray-500">Selecione um caso ou crie um novo</p>
              <p className="text-sm mt-1">Clique em uma criança na lista ou em "Novo Acompanhamento".</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export function DashboardNutricionistaPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const unitId: string = (user as any)?.unitId ?? '';
  const userId: string = (user as any)?.id ?? '';

  const ABA_CONFIG = [
    { key: 'painel',          label: 'Painel' },
    { key: 'turmas',          label: 'Turmas e Crianças' },
    { key: 'dietas',          label: 'Dietas e Restrições' },
    { key: 'obs-professores', label: 'Obs. Professores' },
    { key: 'anotacoes',       label: 'Anotações Nutricionais' },
    { key: 'acompanhamento',  label: 'Acompanhamento Individual' },
    { key: 'pedidos',         label: 'Pedidos de Alimentação' },
    { key: 'relatorios',      label: 'Relatórios' },
  ];

  const abaAtiva = searchParams.get('s') ?? 'painel';
  const setAba = (key: string) => setSearchParams({ s: key });

  return (
    <PageShell
      title="Painel da Nutricionista"
      subtitle={`Olá, ${(user as any)?.firstName ?? 'Nutricionista'}! Gestão de cardápios, restrições e nutrição.`}
    >
      {/* Navegação por abas */}
      <div className="flex gap-2 flex-wrap mb-6 border-b border-gray-200 pb-2">
        {ABA_CONFIG.map((aba) => (
          <button
            key={aba.key}
            onClick={() => setAba(aba.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              abaAtiva === aba.key
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {/* Conteúdo por aba */}
      {abaAtiva === 'turmas'          && <AbaTurmasCriancas unitId={unitId} />}
      {abaAtiva === 'dietas'          && <AbaDietasRestricoes unitId={unitId} />}
      {abaAtiva === 'obs-professores' && <AbaObservacoesProfessores unitId={unitId} />}
      {abaAtiva === 'anotacoes'       && <AbaAnotacoesNutricionais unitId={unitId} userId={userId} />}
      {abaAtiva === 'acompanhamento'  && <AbaAcompanhamentoIndividual unitId={unitId} userId={userId} />}
      {abaAtiva === 'pedidos'         && <AbaPedidosAlimentacao unitId={unitId} />}
      {abaAtiva === 'relatorios'      && <AbaRelatorios unitId={unitId} />}

      {/* Painel principal */}
      {abaAtiva === 'painel' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Turmas e Crianças', desc: 'Peso, altura e IMC', key: 'turmas', icon: '👶', color: 'bg-blue-50 border-blue-200' },
              { label: 'Dietas e Restrições', desc: 'Alergias e intolerâncias', key: 'dietas', icon: '⚠️', color: 'bg-red-50 border-red-200' },
              { label: 'Acompanhamento', desc: 'Casos individuais', key: 'acompanhamento', icon: '📋', color: 'bg-orange-50 border-orange-200' },
              { label: 'Obs. Professores', desc: 'Registros de alimentação', key: 'obs-professores', icon: '👀', color: 'bg-green-50 border-green-200' },
            ].map((card) => (
              <button
                key={card.key}
                onClick={() => setAba(card.key)}
                className={`${card.color} border rounded-xl p-4 text-left hover:shadow-sm transition-all`}
              >
                <div className="text-2xl mb-2">{card.icon}</div>
                <p className="font-semibold text-gray-800 text-sm">{card.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{card.desc}</p>
              </button>
            ))}
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
            <p className="font-semibold text-orange-800 mb-1">Bem-vinda ao Painel da Nutricionista</p>
            <p className="text-sm text-orange-700">Use as abas acima para navegar entre as seções. Comece por <strong>Turmas e Crianças</strong> para registrar medições ou <strong>Acompanhamento Individual</strong> para gerenciar casos clínicos.</p>
          </div>
        </div>
      )}
    </PageShell>
  );
}

export default DashboardNutricionistaPage;
