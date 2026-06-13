/**
 * MobileObservacaoPage — Observação individual BNCC (PWA)
 * Zero emoji — ícones Lucide exclusivamente.
 */

import { useState, useEffect } from 'react';
import { Eye, Search, ChevronLeft, Loader2, Send, Check, Star, PersonStanding, Palette, MessageSquare, Globe, TrendingUp, TrendingDown, Minus, ShieldAlert, X } from 'lucide-react';
import http from '../../api/http';
import { childrenCache, classroomsCache, type CachedChild, type CachedClassroom } from '../../services/offlineDB';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { resolveChildPhotoUrl } from '../../components/children/ChildAvatar';
import { MobileField, MobileSelect, MobileTextarea, MobileSaveBar, PhotoCapture, type CapturedPhoto, inputStyle, M } from '../../components/mobile/mobileUI';

const hojeISO = () => new Date().toISOString().slice(0, 10);

// Campos de experiência BNCC — ícones Lucide
const CAMPOS = [
  { id: 'O_EU_O_OUTRO_E_NOS',                    label: 'O eu, o outro e o nós',                  Icon: PersonStanding },
  { id: 'CORPO_GESTOS_E_MOVIMENTOS',              label: 'Corpo, gestos e movimentos',              Icon: Star         },
  { id: 'TRACOS_SONS_CORES_E_FORMAS',             label: 'Traços, sons, cores e formas',            Icon: Palette      },
  { id: 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',    label: 'Escuta, fala e imaginação',               Icon: MessageSquare},
  { id: 'ESPACOS_TEMPOS_QUANTIDADES',             label: 'Espaços, quantidades e transformações',   Icon: Globe        },
];

// Níveis — ícones Lucide por nível
const NIVEIS = [
  { id: 'EMERGINDO',        label: 'Emergindo',     desc: 'Primeiros sinais',  Icon: TrendingUp,   color: M.color.warning  },
  { id: 'EM_DESENVOLVIMENTO',label: 'Desenvolvendo', desc: 'Com apoio',         Icon: Minus,        color: '#3b82f6'        },
  { id: 'CONSOLIDADO',      label: 'Consolidado',   desc: 'Com autonomia',     Icon: TrendingDown, color: M.color.success  },
];

// Avatar inline
function Avatar({ child, size = 44 }: { child: CachedChild; size?: number }) {
  const foto = resolveChildPhotoUrl(child as any);
  const ini  = `${child.firstName?.[0] ?? ''}${child.lastName?.[0] ?? ''}`.toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: '#ede9fe', border: '1.5px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {foto
        ? <img src={foto} alt={ini} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        : <span style={{ fontSize: size * 0.35, fontWeight: 700, color: '#7c3aed' }}>{ini}</span>}
    </div>
  );
}

export default function MobileObservacaoPage() {
  const { isOnline, postOfflineSafe } = useOfflineSync();
  const [classrooms, setClassrooms] = useState<CachedClassroom[]>([]);
  const [turma, setTurma] = useState('');
  const [children, setChildren] = useState<CachedChild[]>([]);
  const [busca, setBusca] = useState('');
  const [crianca, setCrianca] = useState<CachedChild | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fotos, setFotos] = useState<CapturedPhoto[]>([]);
  const [form, setForm] = useState({ campo: '', nivel: '', descricao: '' });

  useEffect(() => {
    async function load() {
      try {
        if (isOnline) {
          const r = await http.get('/lookup/classrooms/accessible');
          const list = Array.isArray(r.data) ? r.data : r.data?.classrooms ?? [];
          await classroomsCache.saveAll(list);
          setClassrooms(list);
          if (list.length === 1) setTurma(list[0].id);
        } else { const c = await classroomsCache.getAll(); setClassrooms(c); if (c.length === 1) setTurma(c[0].id); }
      } catch { setClassrooms(await classroomsCache.getAll()); }
    }
    load();
  }, [isOnline]);

  useEffect(() => {
    if (!turma) return;
    setCrianca(null);
    if (isOnline) {
      http.get('/children', { params: { limit: 300 } }).then(r => {
        const all = Array.isArray(r.data) ? r.data : r.data?.data ?? r.data?.children ?? [];
        setChildren(all.filter((c: any) => c.enrollments?.some((e: any) => e.classroomId === turma && e.status === 'ATIVA')));
      }).catch(async () => setChildren(await childrenCache.getByClassroom(turma)));
    } else { childrenCache.getByClassroom(turma).then(setChildren); }
  }, [turma, isOnline]);

  const filtrados = children.filter(c => `${c.firstName} ${c.lastName ?? ''}`.toLowerCase().includes(busca.toLowerCase()));

  const salvar = async () => {
    if (!crianca || !form.campo || !form.nivel || form.descricao.trim().length < 10) return;
    setSaving(true);
    try {
      const payload: any = { childId: crianca.id, classroomId: turma, category: form.campo, nivel: form.nivel, description: form.descricao, observationDate: hojeISO() };
      if (isOnline) {
        await http.post('/development-observations', payload);
      } else { await postOfflineSafe('observacao', '/development-observations', 'POST', payload); }
      setSaved(true);
      setForm({ campo: '', nivel: '', descricao: '' }); setFotos([]);
      setTimeout(() => { setSaved(false); setCrianca(null); }, 2500);
    } finally { setSaving(false); }
  };

  const podeEnviar = crianca && form.campo && form.nivel && form.descricao.trim().length >= 10;

  return (
    <div style={{ padding: '16px 16px 90px', minHeight: '100%', background: M.color.page }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Eye size={18} color="#7c3aed" strokeWidth={2} />
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: M.color.text }}>Observação Individual</h1>
      </div>
      <p style={{ fontSize: 12, color: M.color.textMuted, margin: '0 0 16px' }}>Desenvolvimento individual · Campos de experiência BNCC</p>

      <MobileField label="Turma" required>
        <MobileSelect value={turma} onChange={setTurma} options={classrooms.map(c => ({ id: c.id, label: c.name }))} placeholder="Selecionar turma" />
      </MobileField>

      {/* Busca de criança */}
      {turma && !crianca && (
        <MobileField label="Criança" required>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: M.color.textMuted }} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome..."
              style={{ ...inputStyle, paddingLeft: 36 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
            {filtrados.slice(0, 15).map(c => (
              <button key={c.id} onClick={() => setCrianca(c)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                borderRadius: M.radius.lg, border: `0.5px solid ${M.color.borderSoft}`,
                background: M.color.surface, cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent',
              }}>
                <Avatar child={c} size={40} />
                <div>
                  <p style={{ fontSize: M.font.base, fontWeight: 500, margin: 0, color: M.color.text }}>{c.firstName} {c.lastName}</p>
                  {c.laudado && <p style={{ fontSize: 11, color: '#7c3aed', margin: 0, display: 'flex', alignItems: 'center', gap: 3 }}><Star size={10} /> Laudado</p>}
                </div>
              </button>
            ))}
          </div>
        </MobileField>
      )}

      {/* Criança selecionada */}
      {crianca && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: M.radius.lg, background: '#ede9fe', border: '0.5px solid #ddd6fe', marginBottom: 20 }}>
            <Avatar child={crianca} size={38} />
            <p style={{ flex: 1, margin: 0, fontSize: M.font.base, fontWeight: 600, color: '#4c1d95' }}>{crianca.firstName} {crianca.lastName}</p>
            <button onClick={() => setCrianca(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', display: 'flex', alignItems: 'center' }}>
              <X size={16} />
            </button>
          </div>

          {/* Campos BNCC */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #ddd6fe' }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={13} color="#7c3aed" strokeWidth={2} />
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', margin: 0, letterSpacing: 0.6, textTransform: 'uppercase' }}>Campo de Experiência (BNCC)</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CAMPOS.map(c => {
                const active = form.campo === c.id;
                return (
                  <button key={c.id} onClick={() => setForm(f => ({ ...f, campo: c.id === f.campo ? '' : c.id }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: M.radius.lg, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', border: `0.5px solid ${active ? '#7c3aed' : M.color.border}`, background: active ? '#ede9fe' : M.color.surface, transition: 'all 0.12s' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: active ? '#7c3aed' : M.color.page, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.12s' }}>
                      <c.Icon size={16} color={active ? '#fff' : M.color.textMuted} strokeWidth={1.8} />
                    </div>
                    <span style={{ fontSize: 13, color: active ? '#4c1d95' : M.color.text, fontWeight: active ? 600 : 400, lineHeight: 1.3 }}>{c.label}</span>
                    {active && <Check size={14} color="#7c3aed" strokeWidth={2.5} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nível observado */}
          {form.campo && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #fde68a' }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={13} color="#d97706" strokeWidth={2} />
                </div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#d97706', margin: 0, letterSpacing: 0.6, textTransform: 'uppercase' }}>Nível Observado</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {NIVEIS.map(n => {
                  const active = form.nivel === n.id;
                  return (
                    <button key={n.id} onClick={() => setForm(f => ({ ...f, nivel: n.id }))}
                      style={{ padding: '14px 8px', borderRadius: M.radius.lg, cursor: 'pointer', textAlign: 'center', WebkitTapHighlightColor: 'transparent', border: `0.5px solid ${active ? n.color : M.color.border}`, background: active ? `${n.color}14` : M.color.surface, transition: 'all 0.12s' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', margin: '0 auto 8px', background: active ? `${n.color}20` : M.color.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <n.Icon size={18} color={active ? n.color : M.color.textMuted} strokeWidth={active ? 2.5 : 1.8} />
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 2px', color: active ? n.color : M.color.text }}>{n.label}</p>
                      <p style={{ fontSize: 10, color: M.color.textMuted, margin: 0 }}>{n.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Descrição */}
          {form.nivel && (
            <MobileField label="O que você observou?" required hint={`Mínimo 10 caracteres · ${form.descricao.length}`}>
              <MobileTextarea value={form.descricao} onChange={v => setForm(f => ({ ...f, descricao: v }))}
                placeholder="Descreva a situação específica onde observou esse comportamento..." rows={5} />
            </MobileField>
          )}

          {/* Foto */}
          <MobileField label="Foto de evidência">
            <PhotoCapture photos={fotos} onAdd={p => setFotos(prev => [...prev, p])} onRemove={i => setFotos(prev => prev.filter((_, idx) => idx !== i))} maxPhotos={2} label="evidência" />
          </MobileField>

          <MobileSaveBar label="Salvar observação" labelDone="Observação salva" onClick={salvar}
            disabled={!podeEnviar} saving={saving} saved={saved} isOnline={isOnline} color="#7c3aed" />
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
