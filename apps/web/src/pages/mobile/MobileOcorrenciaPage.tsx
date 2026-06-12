import { useState, useEffect } from 'react';
import { HeartPulse, AlertTriangle, Search } from 'lucide-react';
import http from '../../api/http';
import { childrenCache, classroomsCache, type CachedChild, type CachedClassroom } from '../../services/offlineDB';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import {
  MobilePageHeader, MobileField, MobileSelect, MobileTextarea,
  MobileSaveBar, PhotoCapture, type CapturedPhoto, inputStyle, M,
} from '../../components/mobile/mobileUI';

const hojeISO = () => new Date().toISOString().slice(0, 10);

const TIPOS = [
  { id: 'MAL_ESTAR', label: 'Mal-estar', emoji: '🤒', cor: M.color.warning, urgente: false },
  { id: 'QUEDA_ACIDENTE', label: 'Queda/acidente', emoji: '🩹', cor: M.color.error, urgente: true },
  { id: 'ALERGIA', label: 'Alergia', emoji: '⚠️', cor: '#dc2626', urgente: true },
  { id: 'VOMITO', label: 'Vômito', emoji: '🤢', cor: M.color.warning, urgente: false },
  { id: 'FEBRE', label: 'Febre', emoji: '🌡️', cor: M.color.error, urgente: true },
  { id: 'CHORO', label: 'Choro excessivo', emoji: '😢', cor: '#3b82f6', urgente: false },
  { id: 'MEDICACAO', label: 'Medicação', emoji: '💊', cor: '#8b5cf6', urgente: false },
  { id: 'OUTRO', label: 'Outro', emoji: '📋', cor: M.color.textMuted, urgente: false },
];

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
    setCrianca(null);
    if (isOnline) {
      http.get('/children', { params: { limit: 300 } }).then(r => {
        const all = Array.isArray(r.data) ? r.data : r.data?.data ?? r.data?.children ?? [];
        setChildren(all.filter((c: any) => c.enrollments?.some((e: any) => e.classroomId === turma && e.status === 'ATIVA')));
      }).catch(async () => setChildren(await childrenCache.getByClassroom(turma)));
    } else {
      childrenCache.getByClassroom(turma).then(setChildren);
    }
  }, [turma, isOnline]);

  const tipoInfo = TIPOS.find(t => t.id === tipo);
  const urgente = tipoInfo?.urgente ?? false;
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
      if (fotos.length > 0) payload.attachments = fotos.map(f => ({ base64: f.base64, mimeType: f.mimeType, fileName: f.fileName }));
      await postOfflineSafe('ocorrencia', '/diary-events', 'POST', payload);
      setSaved(true);
      setTipo(''); setDescricao(''); setContatoPais(false); setFotos([]); setCrianca(null);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '16px 16px 90px', minHeight: '100%', background: M.color.page }}>
      <MobilePageHeader title="Ocorrência" subtitle="Saúde e acidentes" icon={HeartPulse} color={M.color.error} />

      {urgente && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: M.color.errorBg, border: `0.5px solid #fca5a5`, borderRadius: M.radius.lg, marginBottom: 14 }}>
          <AlertTriangle size={16} color={M.color.error} />
          <p style={{ margin: 0, fontSize: M.font.md, color: '#991b1b', fontWeight: 500 }}>Caso urgente — notifique a secretaria</p>
        </div>
      )}

      <MobileField label="Turma" required>
        <MobileSelect value={turma} onChange={setTurma} options={classrooms.map(c => ({ id: c.id, label: c.name }))} placeholder="Selecionar turma" />
      </MobileField>

      {turma && !crianca && (
        <MobileField label="Criança (opcional)">
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: M.color.textMuted }} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar ou deixar sem criança específica..." style={{ ...inputStyle, paddingLeft: 36 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
            <button onClick={() => setCrianca(null as any)} style={{ padding: '9px 14px', borderRadius: M.radius.md, border: `0.5px solid ${M.color.border}`, background: M.color.surface, color: M.color.textSoft, fontSize: M.font.md, cursor: 'pointer', textAlign: 'left' }}>
              📋 Ocorrência geral da turma
            </button>
            {filtrados.slice(0, 8).map(c => (
              <button key={c.id} onClick={() => setCrianca(c)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: M.radius.md, border: `0.5px solid ${M.color.borderSoft}`, background: M.color.surface, cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: M.color.errorBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: M.color.error, flexShrink: 0 }}>
                  {c.firstName?.[0]}{c.lastName?.[0] ?? ''}
                </div>
                <span style={{ fontSize: M.font.md, color: M.color.text }}>{c.firstName} {c.lastName}</span>
              </button>
            ))}
          </div>
        </MobileField>
      )}

      {turma && (crianca !== undefined) && (
        <>
          {crianca && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: M.radius.lg, background: M.color.errorBg, border: `0.5px solid #fca5a5`, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>👤</span>
              <p style={{ flex: 1, margin: 0, fontSize: M.font.base, fontWeight: 600, color: '#991b1b' }}>{crianca.firstName} {crianca.lastName}</p>
              <button onClick={() => setCrianca(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: M.color.error, fontSize: M.font.sm }}>Trocar</button>
            </div>
          )}

          <MobileField label="Tipo de ocorrência" required>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {TIPOS.map(t => (
                <button key={t.id} onClick={() => setTipo(t.id === tipo ? '' : t.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '11px 10px', borderRadius: M.radius.md, cursor: 'pointer',
                  border: `0.5px solid ${tipo === t.id ? t.cor : M.color.border}`,
                  background: tipo === t.id ? `${t.cor}14` : M.color.surface,
                  WebkitTapHighlightColor: 'transparent',
                }}>
                  <span style={{ fontSize: 18 }}>{t.emoji}</span>
                  <span style={{ fontSize: 12, color: tipo === t.id ? t.cor : M.color.textSoft, fontWeight: tipo === t.id ? 600 : 400, lineHeight: 1.2 }}>{t.label}</span>
                </button>
              ))}
            </div>
          </MobileField>

          {tipo && (
            <>
              <MobileField label="O que aconteceu?" required>
                <MobileTextarea value={descricao} onChange={setDescricao} placeholder="Descreva o que aconteceu, quando, como foi atendido, estado atual da criança..." rows={4} />
              </MobileField>

              <MobileField label="Foto da ocorrência">
                <PhotoCapture photos={fotos} onAdd={p => setFotos(prev => [...prev, p])} onRemove={i => setFotos(prev => prev.filter((_, idx) => idx !== i))} maxPhotos={2} label="foto" />
              </MobileField>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: M.radius.lg, border: `0.5px solid ${M.color.border}`, background: M.color.surface, cursor: 'pointer', marginBottom: 14 }}>
                <input type="checkbox" checked={contatoPais} onChange={e => setContatoPais(e.target.checked)} style={{ width: 18, height: 18, accentColor: M.color.brand }} />
                <span style={{ fontSize: M.font.base, color: M.color.text }}>Responsável já foi contactado</span>
              </label>
            </>
          )}

          <MobileSaveBar label="Registrar ocorrência" labelDone="✓ Registrado" onClick={salvar} disabled={!tipo || !descricao.trim()} saving={saving} saved={saved} isOnline={isOnline} color={urgente ? M.color.error : M.color.brand} />
        </>
      )}
    </div>
  );
}
