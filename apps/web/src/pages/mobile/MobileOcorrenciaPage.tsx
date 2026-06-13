/**
 * MobileOcorrenciaPage — Registro de ocorrências (PWA)
 * Zero emoji — ícones Lucide exclusivamente.
 */

import { useState, useEffect } from 'react';
import { HeartPulse, AlertTriangle, Search, X, Loader2, Send, Check,
  Thermometer, Activity, AlertOctagon, ShieldAlert, Frown, Pill, ClipboardList, Wind,
  Zap, Heart } from 'lucide-react';
import http from '../../api/http';
import { childrenCache, classroomsCache, type CachedChild, type CachedClassroom } from '../../services/offlineDB';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { resolveChildPhotoUrl } from '../../components/children/ChildAvatar';
import { MobileField, MobileSelect, MobileTextarea, MobileSaveBar, PhotoCapture, type CapturedPhoto, inputStyle, M } from '../../components/mobile/mobileUI';

const hojeISO = () => new Date().toISOString().slice(0, 10);

// Tipos de ocorrência — ícones Lucide
const TIPOS = [
  { id: 'MAL_ESTAR',      label: 'Mal-estar',        Icon: Frown,        cor: M.color.warning, urgente: false },
  { id: 'QUEDA_ACIDENTE', label: 'Queda / Acidente',  Icon: AlertTriangle,cor: M.color.error,   urgente: true  },
  { id: 'ALERGIA',        label: 'Alergia',            Icon: ShieldAlert,  cor: '#dc2626',       urgente: true  },
  { id: 'VOMITO',         label: 'Vômito',             Icon: Wind,         cor: M.color.warning, urgente: false },
  { id: 'FEBRE',          label: 'Febre',              Icon: Thermometer,  cor: M.color.error,   urgente: true  },
  { id: 'CHORO',          label: 'Choro excessivo',    Icon: Heart,        cor: '#3b82f6',       urgente: false },
  { id: 'MEDICACAO',      label: 'Medicação',          Icon: Pill,         cor: '#8b5cf6',       urgente: false },
  { id: 'OUTRO',          label: 'Outro',              Icon: ClipboardList,cor: M.color.textMuted,urgente: false },
];

function Avatar({ child, size = 36 }: { child: CachedChild; size?: number }) {
  const foto = resolveChildPhotoUrl(child as any);
  const ini  = `${child.firstName?.[0] ?? ''}${child.lastName?.[0] ?? ''}`.toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: '#fee2e2', border: '1.5px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {foto
        ? <img src={foto} alt={ini} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        : <span style={{ fontSize: size * 0.35, fontWeight: 700, color: M.color.error }}>{ini}</span>}
    </div>
  );
}

export default function MobileOcorrenciaPage() {
  const { isOnline, postOfflineSafe } = useOfflineSync();
  const [classrooms, setClassrooms] = useState<CachedClassroom[]>([]);
  const [turma, setTurma] = useState('');
  const [children, setChildren] = useState<CachedChild[]>([]);
  const [busca, setBusca] = useState('');
  const [crianca, setCrianca] = useState<CachedChild | null>(null);
  const [tipo, setTipo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [contatoPais, setContatoPais] = useState(false);
  const [fotos, setFotos] = useState<CapturedPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  const tipoInfo = TIPOS.find(t => t.id === tipo);
  const urgente  = tipoInfo?.urgente ?? false;
  const filtrados = children.filter(c => `${c.firstName} ${c.lastName ?? ''}`.toLowerCase().includes(busca.toLowerCase()));

  const salvar = async () => {
    if (!tipo || !descricao.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
        classroomId: turma, childId: crianca?.id,
        type: tipo, title: tipoInfo?.label ?? tipo,
        description: descricao, eventDate: hojeISO(),
        status: 'PUBLICADO', tags: ['ocorrencia'],
        contatoPaisRealizado: contatoPais,
      };
      if (isOnline) { await http.post('/diary-events', payload); }
      else { await postOfflineSafe('ocorrencia', '/diary-events', 'POST', payload); }
      setSaved(true);
      setTipo(''); setDescricao(''); setContatoPais(false); setFotos([]); setCrianca(null);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '16px 16px 90px', minHeight: '100%', background: M.color.page }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <HeartPulse size={18} color={M.color.error} strokeWidth={2} />
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: M.color.text }}>Ocorrência</h1>
      </div>
      <p style={{ fontSize: 12, color: M.color.textMuted, margin: '0 0 16px' }}>Saúde, acidentes e situações especiais</p>

      {/* Banner urgente */}
      {urgente && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 14px', background: '#fef2f2', border: '0.5px solid #fca5a5', borderRadius: M.radius.lg, marginBottom: 14 }}>
          <AlertTriangle size={16} color={M.color.error} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 13, color: '#991b1b', fontWeight: 500 }}>Caso urgente — notifique imediatamente a secretaria e a coordenação</p>
        </div>
      )}

      <MobileField label="Turma" required>
        <MobileSelect value={turma} onChange={setTurma} options={classrooms.map(c => ({ id: c.id, label: c.name }))} placeholder="Selecionar turma" />
      </MobileField>

      {/* Tipo de ocorrência */}
      {turma && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #fecaca' }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={13} color={M.color.error} strokeWidth={2} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 700, color: M.color.error, margin: 0, letterSpacing: 0.6, textTransform: 'uppercase' }}>Tipo de ocorrência</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TIPOS.map(t => {
              const active = tipo === t.id;
              return (
                <button key={t.id} onClick={() => setTipo(active ? '' : t.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 12px', borderRadius: M.radius.md, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', border: `0.5px solid ${active ? t.cor : M.color.border}`, background: active ? `${t.cor}12` : M.color.surface, transition: 'all 0.12s' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: active ? `${t.cor}20` : M.color.page, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <t.Icon size={15} color={active ? t.cor : M.color.textMuted} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: 13, color: active ? t.cor : M.color.textSoft, fontWeight: active ? 600 : 400, lineHeight: 1.2 }}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Criança (opcional) */}
      {turma && tipo && !crianca && (
        <MobileField label="Criança envolvida (opcional)">
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: M.color.textMuted }} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar criança..."
              style={{ ...inputStyle, paddingLeft: 36 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
            <button onClick={() => setCrianca({} as CachedChild)} style={{ padding: '10px 14px', borderRadius: M.radius.md, border: `0.5px solid ${M.color.border}`, background: M.color.surface, color: M.color.textSoft, fontSize: 13, cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
              Ocorrência geral da turma
            </button>
            {filtrados.slice(0, 8).map(c => (
              <button key={c.id} onClick={() => setCrianca(c)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: M.radius.md, border: `0.5px solid ${M.color.borderSoft}`, background: M.color.surface, cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
                <Avatar child={c} size={34} />
                <span style={{ fontSize: 13, color: M.color.text }}>{c.firstName} {c.lastName}</span>
              </button>
            ))}
          </div>
        </MobileField>
      )}

      {/* Criança selecionada */}
      {crianca && crianca.id && tipo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: M.radius.lg, background: '#fef2f2', border: '0.5px solid #fca5a5', marginBottom: 16 }}>
          <Avatar child={crianca} size={36} />
          <p style={{ flex: 1, margin: 0, fontSize: 13, fontWeight: 600, color: '#991b1b' }}>{crianca.firstName} {crianca.lastName}</p>
          <button onClick={() => setCrianca(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: M.color.error, display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Descrição */}
      {tipo && (
        <>
          <MobileField label="O que aconteceu?" required>
            <MobileTextarea value={descricao} onChange={setDescricao}
              placeholder="Descreva o que aconteceu, quando, como foi atendido, estado atual..." rows={4} />
          </MobileField>

          <MobileField label="Foto da ocorrência">
            <PhotoCapture photos={fotos} onAdd={p => setFotos(prev => [...prev, p])} onRemove={i => setFotos(prev => prev.filter((_, idx) => idx !== i))} maxPhotos={2} label="foto" />
          </MobileField>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: M.radius.lg, border: `0.5px solid ${M.color.border}`, background: M.color.surface, cursor: 'pointer', marginBottom: 16 }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${contatoPais ? M.color.brand : M.color.border}`, background: contatoPais ? M.color.brand : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}
              onClick={() => setContatoPais(p => !p)}>
              {contatoPais && <Check size={12} color="#fff" strokeWidth={3} />}
            </div>
            <span style={{ fontSize: 14, color: M.color.text }}>Responsável já foi contactado</span>
          </label>
        </>
      )}

      {tipo && (
        <MobileSaveBar label="Registrar ocorrência" labelDone="Ocorrência registrada" onClick={salvar}
          disabled={!tipo || !descricao.trim()} saving={saving} saved={saved} isOnline={isOnline}
          color={urgente ? M.color.error : M.color.brand} />
      )}
    </div>
  );
}
