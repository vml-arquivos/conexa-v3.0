import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';
import { useAuth } from '../../app/AuthProvider';
import http from '../../api/http';
import { childrenCache, classroomsCache, type CachedChild, type CachedClassroom } from '../../services/offlineDB';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { MobilePageHeader, MobileSelect, MobileSaveBar, AlunoCard, M } from '../../components/mobile/mobileUI';

type Status = 'P' | 'F' | null;
const hojeISO = () => new Date().toISOString().slice(0, 10);

export default function MobileChamadaPage() {
  const { user } = useAuth();
  const { isOnline, postOfflineSafe } = useOfflineSync();
  const [classrooms, setClassrooms] = useState<CachedClassroom[]>([]);
  const [selected, setSelected] = useState('');
  const [children, setChildren] = useState<CachedChild[]>([]);
  const [att, setAtt] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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

  useEffect(() => {
    if (!selected) return;
    setAtt({}); setSaved(false);
    async function loadChildren() {
      setLoading(true);
      try {
        if (isOnline) {
          const [cr, ar] = await Promise.all([
            http.get('/children', { params: { limit: 300 } }),
            http.get('/attendance/today', { params: { classroomId: selected, date: hojeISO() } }).catch(() => null),
          ]);
          const all = Array.isArray(cr.data) ? cr.data : cr.data?.data ?? cr.data?.children ?? [];
          const da = all.filter((c: any) => c.enrollments?.some((e: any) => e.classroomId === selected && e.status === 'ATIVA'));
          setChildren(da);
          if (ar?.data) {
            const records = ar.data?.records ?? ar.data ?? [];
            if (Array.isArray(records)) {
              const map: Record<string, Status> = {};
              records.forEach((r: any) => { map[r.childId] = r.status === 'P' ? 'P' : 'F'; });
              setAtt(map);
            }
          }
        } else {
          setChildren(await childrenCache.getByClassroom(selected));
        }
      } finally { setLoading(false); }
    }
    loadChildren();
  }, [selected, isOnline]);

  const toggle = useCallback((id: string) => {
    setAtt(p => ({ ...p, [id]: p[id] === 'P' ? 'F' : p[id] === 'F' ? null : 'P' }));
    setSaved(false);
  }, []);

  const presentes = children.filter(c => att[c.id] === 'P').length;
  const faltas    = children.filter(c => att[c.id] === 'F').length;
  const pendente  = children.filter(c => !att[c.id]).length;

  const salvar = async () => {
    if (!selected) return;
    setSaving(true); setErro(null);
    try {
      const records = children.map(c => ({ childId: c.id, status: att[c.id] ?? 'P', date: hojeISO() }));
      await postOfflineSafe('chamada', '/attendance/register', 'POST', { classroomId: selected, date: hojeISO(), records });
      setSaved(true);
    } catch { setErro('Erro ao salvar.'); } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '16px 16px 90px', minHeight: '100%', background: M.color.page }}>
      <MobilePageHeader
        title="Chamada"
        subtitle={`${hojeISO().split('-').reverse().join('/')} · ${isOnline ? 'online' : 'offline'}`}
        icon={ClipboardList}
        color={M.color.brand}
      />

      <div style={{ marginBottom: 14 }}>
        <MobileSelect
          value={selected}
          onChange={setSelected}
          options={classrooms.map(c => ({ id: c.id, label: c.name }))}
          placeholder="Selecionar turma"
        />
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
              <div key={item.label} style={{
                background: M.color.surface, borderRadius: M.radius.lg,
                padding: '10px 8px', border: `0.5px solid ${M.color.borderSoft}`, textAlign: 'center',
              }}>
                <p style={{ fontSize: 22, fontWeight: 600, margin: 0, color: item.color, letterSpacing: -0.5 }}>{item.value}</p>
                <p style={{ fontSize: M.font.xs, color: M.color.textMuted, margin: 0 }}>{item.label}</p>
              </div>
            ))}
          </div>

          {/* Ações rápidas */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button onClick={() => { const m: Record<string, Status> = {}; children.forEach(c => { m[c.id] = 'P'; }); setAtt(m); setSaved(false); }} style={{
              flex: 1, padding: 10, borderRadius: M.radius.md, cursor: 'pointer',
              border: `0.5px solid ${M.color.success}`, background: M.color.successBg,
              color: '#065f46', fontSize: M.font.md, fontWeight: 500,
              WebkitTapHighlightColor: 'transparent',
            }}>✓ Todos presentes</button>
            <button onClick={() => { setAtt({}); setSaved(false); }} style={{
              flex: 1, padding: 10, borderRadius: M.radius.md, cursor: 'pointer',
              border: `0.5px solid ${M.color.border}`, background: M.color.surface,
              color: M.color.textSoft, fontSize: M.font.md,
              WebkitTapHighlightColor: 'transparent',
            }}>↺ Limpar</button>
          </div>

          {/* Lista */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {children.map(c => (
              <AlunoCard
                key={c.id}
                nome={`${c.firstName} ${c.lastName ?? ''}`.trim()}
                iniciais={`${c.firstName?.[0] ?? ''}${c.lastName?.[0] ?? ''}`}
                status={att[c.id] ?? null}
                alerta={c.allergies?.slice(0, 30)}
                onClick={() => toggle(c.id)}
              />
            ))}
          </div>
        </>
      )}

      {erro && <div style={{ padding: '10px 14px', background: M.color.errorBg, borderRadius: M.radius.md, marginTop: 12, fontSize: M.font.md, color: M.color.error }}>{erro}</div>}

      {selected && children.length > 0 && (
        <MobileSaveBar
          label="Salvar chamada"
          labelDone="✓ Chamada salva"
          onClick={salvar}
          disabled={pendente === children.length}
          saving={saving}
          saved={saved}
          isOnline={isOnline}
          color={M.color.brand}
        />
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
