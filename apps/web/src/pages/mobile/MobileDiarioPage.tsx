/**
 * MobileDiarioPage — Diário do Dia + Observações Individuais (PWA Mobile)
 * Design system: ícones Lucide exclusivamente. Zero emoji no UI.
 */

import { useState, useEffect } from 'react';
import {
  BookOpen, Send, Loader2, X, Check, Save, Users,
  Sun, CloudSun, Cloud, CloudRain, Zap,
  Star, Lightbulb, UserCheck, Users as UsersIcon, Meh, UserX, Repeat2,
  Brain, AlertOctagon, Frown, Wind, Volume2,
  Stethoscope, Utensils, ShieldAlert,
  Coffee, Music, Palette, PersonStanding, Apple, Leaf, Waves,
  ClipboardCheck, MessageCircle, Target, Activity, Heart, GraduationCap,
  Camera, Image as ImageIcon,
} from 'lucide-react';
import http from '../../api/http';
import { classroomsCache, childrenCache, drafts, type CachedClassroom, type CachedChild } from '../../services/offlineDB';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { resolveChildPhotoUrl } from '../../components/children/ChildAvatar';
import { MobileTextarea, PhotoCapture, type CapturedPhoto, M } from '../../components/mobile/mobileUI';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  purple: { text: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  red:    { text: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  amber:  { text: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  blue:   { text: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  green:  { text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  slate:  { text: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
};

// ─── Clima emocional (ícones Lucide) ─────────────────────────────────────────
const CLIMAS = [
  { id: 'MUITO_BOM', label: 'Muito Bom', Icon: Sun,      cor: '#ca8a04', bg: '#fefce8', border: '#fde047' },
  { id: 'BOM',       label: 'Bom',       Icon: CloudSun, cor: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  { id: 'REGULAR',   label: 'Regular',   Icon: Cloud,    cor: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
  { id: 'AGITADO',   label: 'Agitado',   Icon: Zap,      cor: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
  { id: 'DIFICIL',   label: 'Difícil',   Icon: CloudRain,cor: '#4b5563', bg: '#f9fafb', border: '#d1d5db' },
];

// ─── Rotina do dia (ícones Lucide) ───────────────────────────────────────────
const ROTINA = [
  { id: 'ACOLHIDA',               label: 'Acolhida',             Icon: Heart        },
  { id: 'RODA_DE_CONVERSA',       label: 'Roda de Conversa',     Icon: MessageCircle},
  { id: 'ATIVIDADE_DIRIGIDA',     label: 'Atividade Dirigida',   Icon: Target       },
  { id: 'BRINCADEIRA_LIVRE',      label: 'Brincadeira Livre',    Icon: Activity     },
  { id: 'HIGIENE',                label: 'Higiene',              Icon: Waves        },
  { id: 'REFEICAO',               label: 'Refeição',             Icon: Utensils     },
  { id: 'REPOUSO',                label: 'Repouso',              Icon: Coffee       },
  { id: 'ATIVIDADE_COMPLEMENTAR', label: 'Atividade Complementar',Icon: Palette     },
  { id: 'RODA_DE_ENCERRAMENTO',   label: 'Encerramento',         Icon: GraduationCap},
];

// ─── Tipos de atividade ───────────────────────────────────────────────────────
const TIPOS_ATIVIDADE = [
  { id: 'Roda de conversa',      label: 'Roda de conversa',   Icon: MessageCircle },
  { id: 'Atividade dirigida',    label: 'Atividade dirigida', Icon: Target        },
  { id: 'Brincadeira livre',     label: 'Brincadeira livre',  Icon: Activity      },
  { id: 'Leitura compartilhada', label: 'Leitura',            Icon: BookOpen      },
  { id: 'Exploração sensorial',  label: 'Sensorial',          Icon: Leaf          },
  { id: 'Arte e expressão',      label: 'Arte',               Icon: Palette       },
  { id: 'Música e movimento',    label: 'Música',             Icon: Music         },
  { id: 'Hora do pátio',         label: 'Pátio',              Icon: PersonStanding},
];

// ─── Chips de observação (ícones Lucide, IDs = desktop) ──────────────────────
const CHIPS_DESEMPENHO = [
  { id: 'SE_DESTACOU',            label: 'Se destacou na atividade',   Icon: Star       },
  { id: 'DEMONSTROU_COMPREENSAO', label: 'Demonstrou compreensão',     Icon: Lightbulb  },
  { id: 'PARTICIPOU_ATIVAMENTE',  label: 'Participou ativamente',      Icon: UserCheck  },
  { id: 'DEMONSTROU_AUTONOMIA',   label: 'Demonstrou autonomia',       Icon: UsersIcon  },
  { id: 'PARTICIPACAO_PARCIAL',   label: 'Participação parcial',       Icon: Meh        },
  { id: 'RECUSOU_PARTICIPAR',     label: 'Recusou participar',         Icon: UserX      },
  { id: 'PRECISA_RETOMAR',        label: 'Precisa retomar o conteúdo', Icon: Repeat2    },
];

const CHIPS_COMPORTAMENTO = [
  { id: 'COMPORTAMENTO_AGITADO',    label: 'Comportamento agitado',          Icon: Zap           },
  { id: 'DIFICULDADE_CONCENTRACAO', label: 'Dificuldade de concentração',    Icon: Brain         },
  { id: 'COMPORTAMENTO_AGRESSIVO',  label: 'Comportamento agressivo',        Icon: AlertOctagon  },
  { id: 'INSTABILIDADE_EMOCIONAL',  label: 'Instabilidade emocional / choro',Icon: Frown         },
  { id: 'ISOLAMENTO',               label: 'Ficou isolado / não interagiu',  Icon: Wind          },
];

const CHIPS_DESENVOLVIMENTO = [
  { id: 'DIFICULDADE_FALA',   label: 'Dificuldade na fala / comunicação', Icon: Volume2   },
  { id: 'ATENCAO_ESPECIAL',   label: 'Precisa de atenção especial',       Icon: ShieldAlert},
  { id: 'RECUSOU_ALIMENTACAO', label: 'Recusou alimentação',              Icon: Utensils  },
];

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ObsIndividual {
  chips_desempenho: string[];
  chips_comportamento: string[];
  chips_desenvolvimento: string[];
  observacao: string;
  fotos: CapturedPhoto[];
}
type Aba = 'diario' | 'individual';

function hojeISO() { return new Date().toISOString().slice(0, 10); }
function hojeLabel() { return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }

// ─── Avatar com foto ─────────────────────────────────────────────────────────
function Avatar({ child, marcado, size = 52 }: { child: CachedChild; marcado: boolean; size?: number }) {
  const foto = resolveChildPhotoUrl(child as any);
  const ini = `${child.firstName?.[0] ?? ''}${child.lastName?.[0] ?? ''}`.toUpperCase();
  const accentColor = marcado ? T.purple.text : M.color.textMuted;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: `2.5px solid ${marcado ? T.purple.text : M.color.borderSoft}`,
      background: foto ? 'transparent' : marcado ? T.purple.bg : M.color.page,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative',
    }}>
      {foto
        ? <img src={foto} alt={ini} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        : <span style={{ fontSize: size * 0.32, fontWeight: 700, color: accentColor }}>{ini}</span>}
      {marcado && (
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: size * 0.34, height: size * 0.34, borderRadius: '50%', background: T.purple.text, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={size * 0.18} color="#fff" strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

// ─── Chip com ícone Lucide ────────────────────────────────────────────────────
function ChipIcon({ id, label, Icon, active, token, onClick }: {
  id: string; label: string; Icon: React.ElementType;
  active: boolean; token: typeof T.purple; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px',
      borderRadius: M.radius.full, fontSize: 13, cursor: 'pointer',
      border: `0.5px solid ${active ? token.border : M.color.border}`,
      background: active ? token.bg : M.color.surface,
      color: active ? token.text : M.color.textSoft,
      fontWeight: active ? 600 : 400,
      transition: 'all 0.12s', WebkitTapHighlightColor: 'transparent',
    }}>
      <Icon size={14} strokeWidth={active ? 2.5 : 1.8} />
      {label}
    </button>
  );
}

// ─── Cabeçalho de seção ───────────────────────────────────────────────────────
function Secao({ label, Icon, token, children }: {
  label: string; Icon: React.ElementType;
  token: typeof T.purple; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 11, paddingBottom: 8, borderBottom: `1px solid ${token.border}` }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: token.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={13} color={token.text} strokeWidth={2} />
        </div>
        <p style={{ fontSize: 11, fontWeight: 700, color: token.text, margin: 0, letterSpacing: 0.6, textTransform: 'uppercase' }}>{label}</p>
      </div>
      {children}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function MobileDiarioPage() {
  const { isOnline, postOfflineSafe } = useOfflineSync();

  const [classrooms, setClassrooms] = useState<CachedClassroom[]>([]);
  const [turma, setTurma] = useState('');
  const [children, setChildren] = useState<CachedChild[]>([]);
  const [aba, setAba] = useState<Aba>('diario');

  // Diário da turma
  const [tipo, setTipo] = useState('');
  const [climaEmocional, setClimaEmocional] = useState('BOM');
  const [rotina, setRotina] = useState<string[]>([]);
  const [descricao, setDescricao] = useState('');
  const [momentoDestaque, setMomentoDestaque] = useState('');
  const [oQueRetomar, setOQueRetomar] = useState('');
  const [fotosDiario, setFotosDiario] = useState<CapturedPhoto[]>([]);
  const [savingDiario, setSavingDiario] = useState(false);
  const [savedDiario, setSavedDiario] = useState(false);
  const [erroDiario, setErroDiario] = useState<string | null>(null);

  // Obs individuais
  const [criancaAtiva, setCriancaAtiva] = useState<CachedChild | null>(null);
  const [obsMap, setObsMap] = useState<Record<string, ObsIndividual>>({});
  const [savingObs, setSavingObs] = useState(false);
  const [savedObs, setSavedObs] = useState<Record<string, boolean>>({});

  const draftKey = `diario-${turma}-${hojeISO()}`;

  useEffect(() => {
    async function load() {
      try {
        if (isOnline) {
          const r = await http.get('/lookup/classrooms/accessible');
          const list = Array.isArray(r.data) ? r.data : r.data?.classrooms ?? [];
          await classroomsCache.saveAll(list);
          setClassrooms(list);
          if (list.length === 1) setTurma(list[0].id);
        } else {
          const c = await classroomsCache.getAll();
          setClassrooms(c);
          if (c.length === 1) setTurma(c[0].id);
        }
      } catch { setClassrooms(await classroomsCache.getAll()); }
    }
    load();
  }, [isOnline]);

  useEffect(() => {
    if (!turma) return;
    if (isOnline) {
      http.get('/children', { params: { limit: 300 } }).then(r => {
        const all = Array.isArray(r.data) ? r.data : r.data?.data ?? r.data?.children ?? [];
        const da: CachedChild[] = all
          .filter((c: any) => c.enrollments?.some((e: any) => e.classroomId === turma && e.status === 'ATIVA'))
          .map((c: any) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, photoUrl: c.photoUrl ?? null, classroomId: turma, laudado: c.laudado ?? false, allergies: c.allergies ?? null }));
        setChildren(da); childrenCache.saveAll(da);
      }).catch(async () => setChildren(await childrenCache.getByClassroom(turma)));
    } else { childrenCache.getByClassroom(turma).then(setChildren); }

    drafts.get(draftKey).then(d => {
      if (d?.data) {
        const data = d.data as any;
        if (data.tipo) setTipo(data.tipo);
        if (data.climaEmocional) setClimaEmocional(data.climaEmocional);
        if (data.rotina) setRotina(data.rotina);
        if (data.descricao) setDescricao(data.descricao);
        if (data.momentoDestaque) setMomentoDestaque(data.momentoDestaque);
        if (data.oQueRetomar) setOQueRetomar(data.oQueRetomar);
      }
    });
  }, [turma, isOnline]);

  useEffect(() => {
    if (!turma) return;
    const t = setTimeout(() => drafts.save(draftKey, 'diario', { tipo, climaEmocional, rotina, descricao, momentoDestaque, oQueRetomar }), 800);
    return () => clearTimeout(t);
  }, [tipo, climaEmocional, rotina, descricao, momentoDestaque, oQueRetomar, turma]);

  const getObs = (id: string): ObsIndividual =>
    obsMap[id] ?? { chips_desempenho: [], chips_comportamento: [], chips_desenvolvimento: [], observacao: '', fotos: [] };
  const setObs = (id: string, patch: Partial<ObsIndividual>) =>
    setObsMap(p => ({ ...p, [id]: { ...getObs(id), ...patch } }));
  const toggleChip = (childId: string, campo: keyof ObsIndividual, chip: string) => {
    const atual = getObs(childId)[campo] as string[];
    setObs(childId, { [campo]: atual.includes(chip) ? atual.filter(c => c !== chip) : [...atual, chip] });
    setSavedObs(p => ({ ...p, [childId]: false }));
  };
  const toggleRotina = (id: string) => setRotina(p => p.includes(id) ? p.filter(r => r !== id) : [...p, id]);

  const obsComDados = children.filter(c => {
    const o = getObs(c.id);
    return o.chips_desempenho.length + o.chips_comportamento.length + o.chips_desenvolvimento.length > 0 || o.observacao.trim();
  }).length;

  const salvarDiario = async () => {
    if (!turma || !descricao.trim()) return;
    setSavingDiario(true); setErroDiario(null);
    try {
      const payload: any = {
        classroomId: turma, date: hojeISO(), eventDate: hojeISO() + 'T12:00:00.000Z',
        title: momentoDestaque.slice(0, 100) || tipo || 'Diário do dia',
        description: descricao, type: 'ATIVIDADE_PEDAGOGICA', status: 'PUBLICADO',
        tags: [climaEmocional, ...(tipo ? [tipo] : [])],
        climaEmocional, observations: oQueRetomar || undefined,
        aiContext: { climaEmocional, rotina, tipo, descricao, momentoDestaque, oQueRetomar, obsIndividuaisCount: obsComDados },
      };
      if (isOnline) {
        const res = await http.post('/diary-events', payload);
        const id = res.data?.id;
        if (id) for (const foto of fotosDiario) {
          const blob = await fetch(foto.dataUrl).then(r => r.blob());
          const fd = new FormData(); fd.append('file', blob, foto.fileName);
          await http.post(`/diary-events/${id}/media`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {});
        }
      } else { await postOfflineSafe('diario', '/diary-events', 'POST', payload); }
      await drafts.delete(draftKey);
      setSavedDiario(true);
      setTimeout(() => setSavedDiario(false), 3000);
    } catch { setErroDiario('Erro ao salvar. Verifique a conexão.'); }
    finally { setSavingDiario(false); }
  };

  const salvarObs = async (child: CachedChild) => {
    const obs = getObs(child.id);
    setSavingObs(true);
    try {
      const alertas = [...obs.chips_comportamento, ...obs.chips_desenvolvimento];
      const payload = {
        childId: child.id, classroomId: turma, category: 'DIARIO',
        date: hojeISO() + 'T12:00:00.000Z',
        learningProgress: obs.chips_desempenho.join(',') || undefined,
        developmentAlerts: alertas.length ? alertas.join(',') : undefined,
        behaviorDescription: obs.chips_comportamento.join(',') || undefined,
        interests: obs.observacao.trim() || undefined,
        tags: [...obs.chips_desempenho, ...obs.chips_comportamento, ...obs.chips_desenvolvimento],
      };
      if (isOnline) {
        const res = await http.post('/development-observations', payload);
        const obsId = res.data?.id;
        if (obsId) for (const foto of obs.fotos) {
          const blob = await fetch(foto.dataUrl).then(r => r.blob());
          const fd = new FormData(); fd.append('file', blob, foto.fileName);
          await http.post(`/development-observations/${obsId}/attachment`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {});
        }
      } else { await postOfflineSafe('observacao', '/development-observations', 'POST', payload); }
      setSavedObs(p => ({ ...p, [child.id]: true }));
      setTimeout(() => setSavedObs(p => ({ ...p, [child.id]: false })), 2500);
    } finally { setSavingObs(false); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100%', background: M.color.page }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 2px', color: M.color.text, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={18} color="#0284c7" strokeWidth={2} /> Diário do Dia
        </h1>
        <p style={{ fontSize: 12, color: M.color.textMuted, margin: '0 0 12px' }}>{hojeLabel()} · {isOnline ? 'online' : 'offline'}</p>

        {/* Seletor de turma */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <select value={turma} onChange={e => setTurma(e.target.value)}
            style={{ width: '100%', padding: '12px 40px 12px 14px', fontSize: 15, border: `0.5px solid ${M.color.border}`, borderRadius: M.radius.md, background: M.color.surface, color: M.color.text, appearance: 'none', WebkitAppearance: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}>
            <option value="">Selecionar turma</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <svg viewBox="0 0 20 20" fill="none" stroke={M.color.textMuted} strokeWidth="1.5" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, pointerEvents: 'none' }}>
            <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Abas */}
        {turma && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 0, background: M.color.surface, borderRadius: M.radius.xl, padding: 4, border: `0.5px solid ${M.color.borderSoft}` }}>
            {([
              { id: 'diario' as Aba,     label: 'Diário da turma',     Icon: BookOpen },
              { id: 'individual' as Aba, label: `Individuais${obsComDados > 0 ? ` (${obsComDados})` : ''}`, Icon: Users },
            ]).map(a => (
              <button key={a.id} onClick={() => { setAba(a.id); setCriancaAtiva(null); }}
                style={{ flex: 1, padding: '9px 8px', borderRadius: M.radius.lg, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: aba === a.id ? 600 : 400, background: aba === a.id ? '#0284c7' : 'transparent', color: aba === a.id ? '#fff' : M.color.textSoft, transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <a.Icon size={14} strokeWidth={aba === a.id ? 2.5 : 1.8} />{a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ══ ABA DIÁRIO ══════════════════════════════════════════════════════ */}
      {aba === 'diario' && turma && (
        <div style={{ padding: '20px 16px 110px' }}>

          {/* Clima emocional */}
          <Secao label="Clima emocional da turma" Icon={Sun} token={T.blue}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CLIMAS.map(c => {
                const active = climaEmocional === c.id;
                return (
                  <button key={c.id} onClick={() => setClimaEmocional(c.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: M.radius.full, fontSize: 13, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', border: `0.5px solid ${active ? c.border : M.color.border}`, background: active ? c.bg : M.color.surface, color: active ? c.cor : M.color.textSoft, fontWeight: active ? 700 : 400, transition: 'all 0.12s' }}>
                    <c.Icon size={14} strokeWidth={active ? 2.5 : 1.8} color={active ? c.cor : M.color.textMuted} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </Secao>

          {/* Rotina do dia */}
          <Secao label="Rotina do dia" Icon={ClipboardCheck} token={T.purple}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ROTINA.map(r => {
                const checked = rotina.includes(r.id);
                return (
                  <button key={r.id} onClick={() => toggleRotina(r.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: M.radius.md, border: `0.5px solid ${checked ? T.purple.border : M.color.border}`, background: checked ? T.purple.bg : M.color.surface, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${checked ? T.purple.text : M.color.border}`, background: checked ? T.purple.text : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}>
                      {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                    </div>
                    <r.Icon size={13} color={checked ? T.purple.text : M.color.textMuted} strokeWidth={1.8} />
                    <span style={{ fontSize: 13, color: checked ? T.purple.text : M.color.text, fontWeight: checked ? 500 : 400 }}>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </Secao>

          {/* Tipo de atividade */}
          <Secao label="Tipo de atividade" Icon={Target} token={T.blue}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TIPOS_ATIVIDADE.map(t => (
                <ChipIcon key={t.id} id={t.id} label={t.label} Icon={t.Icon}
                  active={tipo === t.id} token={T.blue}
                  onClick={() => setTipo(tipo === t.id ? '' : t.id)} />
              ))}
            </div>
          </Secao>

          {/* O que aconteceu */}
          <Secao label="O que aconteceu na turma hoje?" Icon={BookOpen} token={T.slate}>
            <MobileTextarea value={descricao} onChange={setDescricao}
              placeholder="Descreva as atividades, como as crianças participaram, o que foi observado..." rows={5} maxLength={2000} />
          </Secao>

          {/* Momento de destaque */}
          <Secao label="Momento de destaque" Icon={Star} token={T.amber}>
            <MobileTextarea value={momentoDestaque} onChange={setMomentoDestaque}
              placeholder="Descreva o momento mais significativo do dia..." rows={3} />
          </Secao>

          {/* O que precisa ser retomado */}
          <Secao label="O que precisa ser retomado?" Icon={Repeat2} token={T.red}>
            <MobileTextarea value={oQueRetomar} onChange={setOQueRetomar}
              placeholder="O que continuar, aprofundar ou retomar no próximo dia?" rows={3} />
          </Secao>

          {/* Fotos */}
          <Secao label="Fotos da atividade" Icon={Camera} token={T.slate}>
            <PhotoCapture photos={fotosDiario} onAdd={p => setFotosDiario(prev => [...prev, p])} onRemove={i => setFotosDiario(prev => prev.filter((_, j) => j !== i))} maxPhotos={4} label="foto" />
          </Secao>

          <p style={{ fontSize: 11, color: M.color.textMuted, textAlign: 'center', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Save size={11} /> Rascunho salvo automaticamente
          </p>
          {erroDiario && <div style={{ padding: '10px 14px', background: T.red.bg, borderRadius: M.radius.md, fontSize: 13, color: T.red.text, marginBottom: 12 }}>{erroDiario}</div>}

          {/* Botão salvar diário */}
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', background: M.color.surface, borderTop: `0.5px solid ${M.color.borderSoft}`, boxShadow: '0 -4px 16px rgba(0,0,0,0.06)', zIndex: 10 }}>
            <button onClick={salvarDiario} disabled={savingDiario || !descricao.trim()}
              style={{ width: '100%', padding: 15, borderRadius: M.radius.lg, border: 'none', background: savedDiario ? T.green.text : '#0284c7', color: '#fff', fontSize: M.font.base, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (!descricao.trim() || savingDiario) ? 0.6 : 1, WebkitTapHighlightColor: 'transparent', transition: 'background 0.2s', fontFamily: 'inherit' }}>
              {savingDiario ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : savedDiario ? <Check size={18} /> : <Send size={16} />}
              {savedDiario ? 'Diário publicado!' : isOnline ? 'Publicar diário' : 'Salvar offline'}
            </button>
          </div>
        </div>
      )}

      {/* ══ ABA INDIVIDUAIS ═════════════════════════════════════════════════ */}
      {aba === 'individual' && turma && (
        <div style={{ padding: '16px 0 110px' }}>

          {/* Grid de seleção */}
          {!criancaAtiva && (
            <div style={{ padding: '0 16px' }}>
              <p style={{ fontSize: 12, color: M.color.textMuted, marginBottom: 16, textAlign: 'center' }}>
                Selecione uma criança para registrar o desempenho e comportamento do dia
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                {children.map(child => {
                  const obs = getObs(child.id);
                  const temDado = obs.chips_desempenho.length + obs.chips_comportamento.length + obs.chips_desenvolvimento.length > 0 || obs.observacao.trim();
                  const temAlerta = obs.chips_comportamento.length + obs.chips_desenvolvimento.length > 0;
                  return (
                    <button key={child.id} onClick={() => setCriancaAtiva(child)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', padding: 4, position: 'relative' }}>
                      <div style={{ position: 'relative' }}>
                        <Avatar child={child} marcado={!!temDado} size={54} />
                        {savedObs[child.id] && (
                          <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: T.green.text, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={10} color="#fff" strokeWidth={3} />
                          </div>
                        )}
                        {temAlerta && !savedObs[child.id] && (
                          <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: T.amber.text, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShieldAlert size={10} color="#fff" strokeWidth={2.5} />
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 10, color: temDado ? T.purple.text : M.color.textMuted, fontWeight: temDado ? 600 : 400, textAlign: 'center', lineHeight: 1.2, maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {child.firstName}
                      </span>
                    </button>
                  );
                })}
              </div>
              {obsComDados > 0 && (
                <div style={{ padding: '12px 16px', background: T.purple.bg, borderRadius: M.radius.lg, border: `0.5px solid ${T.purple.border}` }}>
                  <p style={{ fontSize: 12, color: T.purple.text, margin: 0, textAlign: 'center', fontWeight: 500 }}>
                    {obsComDados} de {children.length} crianças registradas
                  </p>
                  <p style={{ fontSize: 11, color: T.purple.text, margin: '2px 0 0', textAlign: 'center', opacity: 0.7 }}>
                    Alimenta RDIC · Painel analítico · IA do sistema
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Painel da criança ativa */}
          {criancaAtiva && (() => {
            const obs = getObs(criancaAtiva.id);
            const idx = children.findIndex(c => c.id === criancaAtiva.id);
            return (
              <div style={{ padding: '0 16px 20px' }}>
                {/* Cabeçalho */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0 16px', borderBottom: `1px solid ${M.color.borderSoft}`, marginBottom: 20 }}>
                  <Avatar child={criancaAtiva} marcado={false} size={52} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: M.color.text }}>{criancaAtiva.firstName} {criancaAtiva.lastName}</p>
                    <p style={{ fontSize: 11, color: M.color.textMuted, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{idx + 1} de {children.length}</span>
                      {criancaAtiva.allergies && <span style={{ color: T.amber.text, display: 'flex', alignItems: 'center', gap: 3 }}><ShieldAlert size={11} /> Alergia</span>}
                      {criancaAtiva.laudado && <span style={{ color: T.purple.text, display: 'flex', alignItems: 'center', gap: 3 }}><Star size={11} /> Laudado</span>}
                    </p>
                  </div>
                  <button onClick={() => setCriancaAtiva(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: M.color.textMuted, padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={20} />
                  </button>
                </div>

                {/* DESEMPENHO */}
                <Secao label="Desempenho e aprendizagem" Icon={Star} token={T.purple}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {CHIPS_DESEMPENHO.map(chip => (
                      <ChipIcon key={chip.id} id={chip.id} label={chip.label} Icon={chip.Icon}
                        active={obs.chips_desempenho.includes(chip.id)} token={T.purple}
                        onClick={() => toggleChip(criancaAtiva.id, 'chips_desempenho', chip.id)} />
                    ))}
                  </div>
                </Secao>

                {/* COMPORTAMENTO */}
                <Secao label="Comportamento e regulação emocional" Icon={Brain} token={T.red}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {CHIPS_COMPORTAMENTO.map(chip => (
                      <ChipIcon key={chip.id} id={chip.id} label={chip.label} Icon={chip.Icon}
                        active={obs.chips_comportamento.includes(chip.id)} token={T.red}
                        onClick={() => toggleChip(criancaAtiva.id, 'chips_comportamento', chip.id)} />
                    ))}
                  </div>
                </Secao>

                {/* DESENVOLVIMENTO */}
                <Secao label="Desenvolvimento e sinais de atenção" Icon={ShieldAlert} token={T.amber}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {CHIPS_DESENVOLVIMENTO.map(chip => (
                      <ChipIcon key={chip.id} id={chip.id} label={chip.label} Icon={chip.Icon}
                        active={obs.chips_desenvolvimento.includes(chip.id)} token={T.amber}
                        onClick={() => toggleChip(criancaAtiva.id, 'chips_desenvolvimento', chip.id)} />
                    ))}
                  </div>
                </Secao>

                {/* Observação livre */}
                <Secao label="Observação livre" Icon={BookOpen} token={T.slate}>
                  <MobileTextarea value={obs.observacao}
                    onChange={v => setObs(criancaAtiva.id, { observacao: v })}
                    placeholder="Observação específica sobre esta criança hoje..." rows={3} maxLength={500} />
                </Secao>

                {/* Foto de evidência */}
                <Secao label="Foto de evidência" Icon={Camera} token={T.slate}>
                  <PhotoCapture photos={obs.fotos}
                    onAdd={p => setObs(criancaAtiva.id, { fotos: [...obs.fotos, p] })}
                    onRemove={i => setObs(criancaAtiva.id, { fotos: obs.fotos.filter((_, j) => j !== i) })}
                    maxPhotos={2} label="evidência" />
                </Secao>

                {/* Info */}
                <div style={{ padding: '10px 14px', background: T.green.bg, borderRadius: M.radius.md, border: `0.5px solid ${T.green.border}`, marginBottom: 16 }}>
                  <p style={{ fontSize: 11, color: T.green.text, margin: 0, lineHeight: 1.6 }}>
                    Dados salvos aqui alimentam automaticamente o <strong>RDIC</strong> desta criança, o <strong>painel analítico</strong> da coordenação e os <strong>alertas da IA</strong>.
                  </p>
                </div>

                {/* Navegação */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {([children[idx - 1], children[idx + 1]] as (CachedChild | undefined)[]).map((c, i) => (
                    <button key={i} onClick={() => c && setCriancaAtiva(c)} disabled={!c}
                      style={{ flex: 1, padding: 11, borderRadius: M.radius.md, border: `0.5px solid ${M.color.border}`, background: M.color.surface, color: c ? M.color.textSoft : M.color.textMuted, fontSize: 13, cursor: c ? 'pointer' : 'default', opacity: c ? 1 : 0.4, WebkitTapHighlightColor: 'transparent', fontFamily: 'inherit' }}>
                      {i === 0 ? '← Anterior' : 'Próxima →'}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Botão salvar obs individual */}
      {aba === 'individual' && criancaAtiva && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', background: M.color.surface, borderTop: `0.5px solid ${M.color.borderSoft}`, boxShadow: '0 -4px 16px rgba(0,0,0,0.06)', zIndex: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCriancaAtiva(null)}
              style={{ width: 48, borderRadius: M.radius.md, border: `0.5px solid ${M.color.border}`, background: M.color.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: M.color.textSoft, flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>
              <Users size={18} />
            </button>
            <button onClick={() => salvarObs(criancaAtiva)} disabled={savingObs}
              style={{ flex: 1, padding: 15, borderRadius: M.radius.lg, border: 'none', background: savedObs[criancaAtiva.id] ? T.green.text : T.purple.text, color: '#fff', fontSize: M.font.base, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s', WebkitTapHighlightColor: 'transparent', fontFamily: 'inherit' }}>
              {savingObs ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : savedObs[criancaAtiva.id] ? <Check size={18} /> : <Send size={16} />}
              {savedObs[criancaAtiva.id] ? 'Observação salva!' : 'Salvar observação'}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
