/**
 * MobileChamadaPage — Chamada mobile-first
 *
 * - Avatar com foto real do aluno (ou iniciais coloridas se não tiver foto)
 * - Toque simples: marca Presente → Falta → sem marcação
 * - Toque longo (> 400ms): abre painel de comportamento individual
 * - Painel individual: status + observação rápida + nota de comportamento
 * - Após salvar: navega automaticamente para o Diário (/app/mobile/diario)
 * - Funciona offline: salva localmente, sincroniza ao reconectar
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Loader2, X, Check, AlertTriangle, ChevronDown, MessageSquare } from 'lucide-react';
import http from '../../api/http';
import { childrenCache, classroomsCache, type CachedChild, type CachedClassroom } from '../../services/offlineDB';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { resolveChildPhotoUrl } from '../../components/children/ChildAvatar';
import { MobilePageHeader, MobileSelect, M } from '../../components/mobile/mobileUI';

type Status = 'P' | 'F' | null;

interface AlunoComportamento {
  status: Status;
  observacao: string;
  comportamento: 'OTIMO' | 'BOM' | 'REGULAR' | 'ATENCAO' | '';
}

const COMPORTAMENTOS = [
  { id: 'OTIMO',   label: '😊 Ótimo',      cor: M.color.success },
  { id: 'BOM',     label: '🙂 Bom',         cor: '#3b82f6' },
  { id: 'REGULAR', label: '😐 Regular',     cor: M.color.warning },
  { id: 'ATENCAO', label: '😟 Atenção',     cor: M.color.error },
];

function hojeISO() { return new Date().toISOString().slice(0, 10); }

// ─── Avatar com foto ──────────────────────────────────────────────────────────
function AvatarAluno({ child, status, size = 44 }: { child: CachedChild; status: Status; size?: number }) {
  const foto = resolveChildPhotoUrl(child as any);
  const iniciais = `${child.firstName?.[0] ?? ''}${child.lastName?.[0] ?? ''}`.toUpperCase();
  const cor = status === 'P' ? M.color.success : status === 'F' ? M.color.error : '#6366f1';
  const bg  = status === 'P' ? '#d1fae5' : status === 'F' ? '#fee2e2' : '#eef2ff';

  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, position: 'relative', overflow: 'hidden',
      border: `2px solid ${status ? cor : '#e2e8f0'}`,
      background: foto ? 'transparent' : bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {foto ? (
        <img src={foto} alt={iniciais} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      ) : (
        <span style={{ fontSize: size * 0.35, fontWeight: 700, color: cor }}>{iniciais}</span>
      )}
      {/* Badge de status */}
      {status && (
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: size * 0.36, height: size * 0.36, borderRadius: '50%',
          background: cor, border: '1.5px solid #fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {status === 'P'
            ? <Check size={size * 0.2} color="#fff" strokeWidth={3} />
            : <X size={size * 0.2} color="#fff" strokeWidth={3} />}
        </div>
      )}
    </div>
  );
}

export default function MobileChamadaPage() {
  const navigate = useNavigate();
  const { isOnline, postOfflineSafe } = useOfflineSync();

  const [classrooms, setClassrooms] = useState<CachedClassroom[]>([]);
  const [selected, setSelected] = useState('');
  const [children, setChildren] = useState<CachedChild[]>([]);
  const [dados, setDados] = useState<Record<string, AlunoComportamento>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Painel individual (sheet de baixo)
  const [painelAluno, setPainelAluno] = useState<CachedChild | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getDado = (id: string): AlunoComportamento =>
    dados[id] ?? { status: null, observacao: '', comportamento: '' };

  const setStatus = (id: string, status: Status) => {
    setDados(p => ({ ...p, [id]: { ...getDado(id), status } }));
    setSaved(false);
  };

  const toggle = (id: string) => {
    const atual = getDado(id).status;
    setStatus(id, atual === 'P' ? 'F' : atual === 'F' ? null : 'P');
  };

  // Toque longo → abre painel individual
  const onPressStart = (child: CachedChild) => {
    longPressTimer.current = setTimeout(() => {
      setPainelAluno(child);
    }, 400);
  };
  const onPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // Carregar turmas
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (isOnline) {
          const r = await http.get('/lookup/classrooms/accessible');
          const list = Array.isArray(r.data) ? r.data : r.data?.classrooms ?? [];
          await classroomsCache.saveAll(list);
          setClassrooms(list);
          if (list.length === 1) setSelected(list[0].id);
        } else {
          const c = await classroomsCache.getAll();
          setClassrooms(c);
          if (c.length === 1) setSelected(c[0].id);
        }
      } finally { setLoading(false); }
    }
    load();
  }, [isOnline]);

  // Carregar alunos da turma
  useEffect(() => {
    if (!selected) return;
    setDados({}); setSaved(false);
    async function loadChildren() {
      setLoading(true);
      try {
        if (isOnline) {
          const [cr, ar] = await Promise.all([
            http.get('/children', { params: { limit: 300 } }),
            http.get('/attendance/today', { params: { classroomId: selected, date: hojeISO() } }).catch(() => null),
          ]);
          const all = Array.isArray(cr.data) ? cr.data : cr.data?.data ?? cr.data?.children ?? [];
          const da: CachedChild[] = all.filter((c: any) =>
            c.enrollments?.some((e: any) => e.classroomId === selected && e.status === 'ATIVA')
          ).map((c: any) => ({
            id: c.id, firstName: c.firstName, lastName: c.lastName,
            photoUrl: c.photoUrl ?? null,
            classroomId: selected, laudado: c.laudado ?? false, allergies: c.allergies ?? null,
          }));
          await childrenCache.saveAll(da);
          setChildren(da);

          // Pré-preencher chamada já feita
          if (ar?.data) {
            const records = ar.data?.records ?? ar.data ?? [];
            if (Array.isArray(records)) {
              const map: Record<string, AlunoComportamento> = {};
              records.forEach((r: any) => { map[r.childId] = { status: r.status === 'PRESENTE' ? 'P' : 'F', observacao: r.observacao ?? '', comportamento: r.comportamento ?? '' }; });
              setDados(map);
            }
          }
        } else {
          setChildren(await childrenCache.getByClassroom(selected));
        }
      } finally { setLoading(false); }
    }
    loadChildren();
  }, [selected, isOnline]);

  const presentes = children.filter(c => getDado(c.id).status === 'P').length;
  const faltas    = children.filter(c => getDado(c.id).status === 'F').length;
  const pendente  = children.filter(c => !getDado(c.id).status).length;

  const marcarTodos = (s: Status) => {
    const m: Record<string, AlunoComportamento> = {};
    children.forEach(c => { m[c.id] = { ...getDado(c.id), status: s }; });
    setDados(m); setSaved(false);
  };

  const salvar = useCallback(async () => {
    if (!selected) return;
    setSaving(true); setErro(null);
    try {
      const records = children.map(c => {
        const d = getDado(c.id);
        return {
          childId: c.id,
          status: d.status === 'P' ? 'PRESENTE' : d.status === 'F' ? 'AUSENTE' : 'PRESENTE',
          date: hojeISO(),
          observacao: d.observacao || undefined,
          comportamento: d.comportamento || undefined,
        };
      });
      // postOfflineSafe NUNCA lança — salva localmente e tenta sync.
      // Navegamos imediatamente após salvar local, sem esperar resposta do backend.
      await postOfflineSafe('chamada', '/attendance/register', 'POST',
        { classroomId: selected, date: hojeISO(), records });
    } catch {
      // postOfflineSafe não deveria lançar, mas se lançar ainda navegamos
      console.warn('[Chamada] Erro no save, navegando mesmo assim');
    } finally {
      setSaving(false);
    }
    // Navega SEMPRE — fora do try/catch — não depende de sucesso do backend
    setSaved(true);
    setTimeout(() => navigate('/app/mobile/diario'), 900);
  }, [selected, children, dados, postOfflineSafe, navigate]);

  const alunoSelecionado = painelAluno ? getDado(painelAluno.id) : null;

  return (
    <div style={{ padding: '16px 16px 100px', minHeight: '100%', background: M.color.page }}>
      <MobilePageHeader title="Chamada" subtitle={`${hojeISO().split('-').reverse().join('/')} · ${isOnline ? 'online' : 'offline'}`} icon={ClipboardList} color={M.color.brand} />

      {/* Seletor de turma */}
      <div style={{ marginBottom: 14 }}>
        <MobileSelect value={selected} onChange={setSelected} options={classrooms.map(c => ({ id: c.id, label: c.name }))} placeholder="Selecionar turma" />
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={26} color={M.color.textMuted} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {selected && !loading && children.length > 0 && (
        <>
          {/* Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Presentes', value: presentes, color: M.color.success },
              { label: 'Faltas',    value: faltas,    color: M.color.error   },
              { label: 'Pendente',  value: pendente,  color: M.color.warning },
            ].map(item => (
              <div key={item.label} style={{ background: M.color.surface, borderRadius: M.radius.lg, padding: '10px 8px', border: `0.5px solid ${M.color.borderSoft}`, textAlign: 'center' }}>
                <p style={{ fontSize: 24, fontWeight: 600, margin: 0, color: item.color, letterSpacing: -0.5 }}>{item.value}</p>
                <p style={{ fontSize: M.font.xs, color: M.color.textMuted, margin: 0 }}>{item.label}</p>
              </div>
            ))}
          </div>

          {/* Ações rápidas */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button onClick={() => marcarTodos('P')} style={{ flex: 1, padding: 10, borderRadius: M.radius.md, cursor: 'pointer', border: `0.5px solid ${M.color.success}`, background: M.color.successBg, color: '#065f46', fontSize: M.font.md, fontWeight: 500, WebkitTapHighlightColor: 'transparent' }}>
              ✓ Todos presentes
            </button>
            <button onClick={() => marcarTodos(null)} style={{ flex: 1, padding: 10, borderRadius: M.radius.md, cursor: 'pointer', border: `0.5px solid ${M.color.border}`, background: M.color.surface, color: M.color.textSoft, fontSize: M.font.md, WebkitTapHighlightColor: 'transparent' }}>
              ↺ Limpar
            </button>
          </div>

          {/* Instrução toque longo */}
          <p style={{ fontSize: 11, color: M.color.textMuted, marginBottom: 10, textAlign: 'center' }}>
            Toque: marca presença/falta &nbsp;·&nbsp; Toque longo: comportamento individual
          </p>

          {/* Lista de alunos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {children.map(child => {
              const d = getDado(child.id);
              const corStatus = d.status === 'P' ? M.color.success : d.status === 'F' ? M.color.error : M.color.textMuted;
              const bgStatus  = d.status === 'P' ? M.color.successBg : d.status === 'F' ? M.color.errorBg : M.color.surface;
              const hasComp   = !!d.comportamento;

              return (
                <button
                  key={child.id}
                  onClick={() => toggle(child.id)}
                  onMouseDown={() => onPressStart(child)}
                  onMouseUp={onPressEnd}
                  onTouchStart={() => onPressStart(child)}
                  onTouchEnd={(e) => { onPressEnd(); e.preventDefault(); toggle(child.id); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: M.radius.lg,
                    border: `0.5px solid ${d.status ? corStatus + '50' : M.color.borderSoft}`,
                    background: bgStatus, cursor: 'pointer', textAlign: 'left',
                    WebkitTapHighlightColor: 'transparent', transition: 'all 0.12s',
                    width: '100%',
                  }}
                >
                  <AvatarAluno child={child} status={d.status} size={46} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: M.font.base, fontWeight: 500, margin: 0, color: M.color.text, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {child.firstName} {child.lastName}
                    </p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                      {child.allergies && (
                        <span style={{ fontSize: 10, color: M.color.warning }}>⚠ Alergia</span>
                      )}
                      {child.laudado && (
                        <span style={{ fontSize: 10, color: '#7c3aed' }}>★ Laudado</span>
                      )}
                      {hasComp && (
                        <span style={{ fontSize: 10, color: '#0284c7' }}>
                          <MessageSquare size={9} style={{ display: 'inline', marginRight: 2 }} />
                          {COMPORTAMENTOS.find(b => b.id === d.comportamento)?.label.split(' ')[1] ?? d.comportamento}
                        </span>
                      )}
                      {d.observacao && (
                        <span style={{ fontSize: 10, color: M.color.textMuted }}>📝 obs.</span>
                      )}
                    </div>
                  </div>

                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: M.radius.full, flexShrink: 0,
                    background: d.status ? corStatus + '20' : M.color.page,
                    color: d.status ? corStatus : M.color.textMuted,
                    border: `0.5px solid ${d.status ? corStatus + '40' : M.color.borderSoft}`,
                  }}>
                    {d.status === 'P' ? 'Presente' : d.status === 'F' ? 'Falta' : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {erro && <div style={{ padding: '10px 14px', background: M.color.errorBg, borderRadius: M.radius.md, marginTop: 12, fontSize: M.font.md, color: M.color.error }}>{erro}</div>}

      {/* Botão salvar fixo */}
      {selected && children.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '12px 16px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          background: M.color.surface, borderTop: `0.5px solid ${M.color.borderSoft}`,
          boxShadow: '0 -4px 16px rgba(0,0,0,0.06)', zIndex: 10,
        }}>
          <button
            onClick={salvar}
            disabled={saving || pendente === children.length}
            style={{
              width: '100%', padding: 15, borderRadius: M.radius.lg, border: 'none',
              background: saved ? M.color.success : saving ? '#818cf8' : M.color.brand,
              color: '#fff', fontSize: M.font.base, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: (saving || pendente === children.length) ? 0.6 : 1,
              transition: 'background 0.2s', WebkitTapHighlightColor: 'transparent',
            }}
          >
            {saving
              ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
              : saved ? '✓✓' : null}
            {saved ? 'Chamada salva — indo para o Diário…' : isOnline ? 'Salvar chamada' : 'Salvar offline'}
          </button>
        </div>
      )}

      {/* ── Painel individual (sheet de baixo) ──────────────────────────── */}
      {painelAluno && alunoSelecionado && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setPainelAluno(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 20 }}
          />
          {/* Sheet */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
            background: M.color.surface,
            borderRadius: '20px 20px 0 0',
            padding: '20px 20px',
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
          }}>
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: M.color.border, margin: '0 auto 16px' }} />

            {/* Cabeçalho do aluno */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <AvatarAluno child={painelAluno} status={alunoSelecionado.status} size={52} />
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: M.color.text }}>
                  {painelAluno.firstName} {painelAluno.lastName}
                </p>
                {painelAluno.allergies && (
                  <p style={{ fontSize: 11, color: M.color.warning, margin: '2px 0 0' }}>⚠ {painelAluno.allergies}</p>
                )}
              </div>
              <button onClick={() => setPainelAluno(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: M.color.textMuted }}>
                <X size={20} />
              </button>
            </div>

            {/* Status */}
            <p style={{ fontSize: 12, fontWeight: 600, color: M.color.textSoft, marginBottom: 8 }}>Presença</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              {(['P', 'F', null] as Status[]).map(s => {
                const label = s === 'P' ? '✓ Presente' : s === 'F' ? '✗ Falta' : '— Não marcado';
                const cor   = s === 'P' ? M.color.success : s === 'F' ? M.color.error : M.color.textMuted;
                const active = alunoSelecionado.status === s;
                return (
                  <button key={String(s)} onClick={() => { setStatus(painelAluno.id, s); setDados(p => ({ ...p, [painelAluno.id]: { ...getDado(painelAluno.id), status: s } })); }}
                    style={{ flex: 1, padding: '10px 6px', borderRadius: M.radius.md, cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400,
                      border: `0.5px solid ${active ? cor : M.color.border}`,
                      background: active ? `${cor}18` : M.color.surface, color: active ? cor : M.color.textSoft,
                      WebkitTapHighlightColor: 'transparent' }}>
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Comportamento */}
            <p style={{ fontSize: 12, fontWeight: 600, color: M.color.textSoft, marginBottom: 8 }}>Comportamento</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
              {COMPORTAMENTOS.map(b => {
                const active = alunoSelecionado.comportamento === b.id;
                return (
                  <button key={b.id}
                    onClick={() => setDados(p => ({ ...p, [painelAluno.id]: { ...getDado(painelAluno.id), comportamento: active ? '' : b.id as any } }))}
                    style={{ padding: '10px', borderRadius: M.radius.md, cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
                      border: `0.5px solid ${active ? b.cor : M.color.border}`,
                      background: active ? `${b.cor}18` : M.color.surface, color: active ? b.cor : M.color.textSoft,
                      WebkitTapHighlightColor: 'transparent' }}>
                    {b.label}
                  </button>
                );
              })}
            </div>

            {/* Observação rápida */}
            <p style={{ fontSize: 12, fontWeight: 600, color: M.color.textSoft, marginBottom: 6 }}>Observação rápida</p>
            <textarea
              value={alunoSelecionado.observacao}
              onChange={e => setDados(p => ({ ...p, [painelAluno.id]: { ...getDado(painelAluno.id), observacao: e.target.value } }))}
              placeholder="Observação sobre a criança hoje (opcional)..."
              rows={3}
              style={{ width: '100%', padding: '11px 13px', fontSize: 14, border: `0.5px solid ${M.color.border}`, borderRadius: M.radius.md, background: M.color.page, color: M.color.text, resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
            />

            {/* Confirmar */}
            <button
              onClick={() => setPainelAluno(null)}
              style={{ width: '100%', marginTop: 14, padding: 13, borderRadius: M.radius.lg, border: 'none', background: M.color.brand, color: '#fff', fontSize: M.font.base, fontWeight: 600, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
              Confirmar
            </button>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
