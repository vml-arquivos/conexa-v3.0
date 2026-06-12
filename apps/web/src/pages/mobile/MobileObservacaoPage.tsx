import { useState, useEffect } from 'react';
import { Eye, Search } from 'lucide-react';
import http from '../../api/http';
import { childrenCache, classroomsCache, type CachedChild, type CachedClassroom } from '../../services/offlineDB';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import {
  MobilePageHeader, MobileField, MobileSelect, MobileTextarea,
  MobileSaveBar, ChipGroup, PhotoCapture, type CapturedPhoto, inputStyle, M,
} from '../../components/mobile/mobileUI';

const hojeISO = () => new Date().toISOString().slice(0, 10);

const CAMPOS = [
  { id: 'O_EU_O_OUTRO_E_NOS', label: 'O eu, o outro e o nós', emoji: '🤝' },
  { id: 'CORPO_GESTOS_E_MOVIMENTOS', label: 'Corpo, gestos e movimentos', emoji: '🏃' },
  { id: 'TRACOS_SONS_CORES_E_FORMAS', label: 'Traços, sons, cores e formas', emoji: '🎨' },
  { id: 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', label: 'Escuta, fala e imaginação', emoji: '💬' },
  { id: 'ESPACOS_TEMPOS_QUANTIDADES', label: 'Espaços, quantidades e transformações', emoji: '🔢' },
];

const NIVEIS = [
  { id: 'EMERGINDO', label: 'Emergindo', emoji: '🌱', desc: 'Primeiros sinais', color: M.color.warning },
  { id: 'EM_DESENVOLVIMENTO', label: 'Desenvolvendo', emoji: '🌿', desc: 'Com apoio', color: '#3b82f6' },
  { id: 'CONSOLIDADO', label: 'Consolidado', emoji: '🌳', desc: 'Com autonomia', color: M.color.success },
];

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

  const filtrados = children.filter(c => `${c.firstName} ${c.lastName ?? ''}`.toLowerCase().includes(busca.toLowerCase()));

  const salvar = async () => {
    if (!crianca || !form.campo || !form.nivel || form.descricao.trim().length < 10) return;
    setSaving(true);
    try {
      const payload: any = {
        childId: crianca.id, classroomId: turma,
        category: form.campo, nivel: form.nivel,
        description: form.descricao, observationDate: hojeISO(),
      };
      if (fotos.length > 0) payload.attachments = fotos.map(f => ({ base64: f.base64, mimeType: f.mimeType, fileName: f.fileName }));
      await postOfflineSafe('observacao', '/development-observations', 'POST', payload);
      setSaved(true);
      setForm({ campo: '', nivel: '', descricao: '' }); setFotos([]);
      setTimeout(() => { setSaved(false); setCrianca(null); }, 2500);
    } finally { setSaving(false); }
  };

  const podeEnviar = crianca && form.campo && form.nivel && form.descricao.trim().length >= 10;

  return (
    <div style={{ padding: '16px 16px 90px', minHeight: '100%', background: M.color.page }}>
      <MobilePageHeader title="Observação" subtitle="Desenvolvimento individual · BNCC" icon={Eye} color="#7c3aed" />

      <MobileField label="Turma" required>
        <MobileSelect value={turma} onChange={setTurma} options={classrooms.map(c => ({ id: c.id, label: c.name }))} placeholder="Selecionar turma" />
      </MobileField>

      {turma && !crianca && (
        <>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: M.color.textMuted }} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar criança..."
              style={{ ...inputStyle, paddingLeft: 38 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {filtrados.slice(0, 12).map(c => (
              <button key={c.id} onClick={() => setCrianca(c)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderRadius: M.radius.lg, border: `0.5px solid ${M.color.borderSoft}`,
                background: M.color.surface, cursor: 'pointer', textAlign: 'left',
                WebkitTapHighlightColor: 'transparent',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#7c3aed', flexShrink: 0 }}>
                  {c.firstName?.[0]}{c.lastName?.[0] ?? ''}
                </div>
                <div>
                  <p style={{ fontSize: M.font.base, fontWeight: 500, margin: 0, color: M.color.text }}>{c.firstName} {c.lastName}</p>
                  {c.laudado && <p style={{ fontSize: M.font.xs, color: '#7c3aed', margin: 0 }}>★ Laudado</p>}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {crianca && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: M.radius.lg, background: '#ede9fe', border: '0.5px solid #ddd6fe', marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#6d28d9', flexShrink: 0 }}>
              {crianca.firstName?.[0]}{crianca.lastName?.[0] ?? ''}
            </div>
            <p style={{ flex: 1, margin: 0, fontSize: M.font.base, fontWeight: 600, color: '#4c1d95' }}>{crianca.firstName} {crianca.lastName}</p>
            <button onClick={() => setCrianca(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: M.font.sm }}>Trocar</button>
          </div>

          <MobileField label="Campo de experiência (BNCC)" required>
            <ChipGroup options={CAMPOS} selected={form.campo} onToggle={id => setForm(f => ({ ...f, campo: id === f.campo ? '' : id }))} color="#7c3aed" />
          </MobileField>

          {form.campo && (
            <MobileField label="Nível observado" required>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {NIVEIS.map(n => (
                  <button key={n.id} onClick={() => setForm(f => ({ ...f, nivel: n.id }))} style={{
                    padding: '12px 6px', borderRadius: M.radius.md, cursor: 'pointer', textAlign: 'center',
                    border: `0.5px solid ${form.nivel === n.id ? n.color : M.color.border}`,
                    background: form.nivel === n.id ? `${n.color}14` : M.color.surface,
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 3 }}>{n.emoji}</div>
                    <p style={{ fontSize: 11, fontWeight: 600, margin: '0 0 2px', color: form.nivel === n.id ? n.color : M.color.text }}>{n.label}</p>
                    <p style={{ fontSize: 10, color: M.color.textMuted, margin: 0 }}>{n.desc}</p>
                  </button>
                ))}
              </div>
            </MobileField>
          )}

          {form.nivel && (
            <MobileField label="O que você observou?" required hint={`Mínimo 10 caracteres · ${form.descricao.length}`}>
              <MobileTextarea value={form.descricao} onChange={v => setForm(f => ({ ...f, descricao: v }))} placeholder="Descreva a situação específica onde observou esse comportamento..." rows={5} />
            </MobileField>
          )}

          <MobileField label="Foto (evidência)">
            <PhotoCapture photos={fotos} onAdd={p => setFotos(prev => [...prev, p])} onRemove={i => setFotos(prev => prev.filter((_, idx) => idx !== i))} maxPhotos={2} label="evidência" />
          </MobileField>

          <MobileSaveBar label="Salvar observação" labelDone="✓ Observação salva" onClick={salvar} disabled={!podeEnviar} saving={saving} saved={saved} isOnline={isOnline} color="#7c3aed" />
        </>
      )}
    </div>
  );
}
