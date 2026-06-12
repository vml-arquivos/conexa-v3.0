import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import http from '../../api/http';
import { classroomsCache, type CachedClassroom, drafts } from '../../services/offlineDB';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import {
  MobilePageHeader, MobileField, MobileSelect, MobileTextarea,
  MobileSaveBar, ChipGroup, PhotoCapture, type CapturedPhoto, M,
} from '../../components/mobile/mobileUI';

const hojeISO = () => new Date().toISOString().slice(0, 10);

const TIPOS = [
  { id: 'Roda de conversa', label: 'Roda de conversa', emoji: '💬' },
  { id: 'Atividade dirigida', label: 'Atividade dirigida', emoji: '📝' },
  { id: 'Brincadeira livre', label: 'Brincadeira livre', emoji: '🎮' },
  { id: 'Leitura compartilhada', label: 'Leitura', emoji: '📚' },
  { id: 'Exploração sensorial', label: 'Sensorial', emoji: '🎨' },
  { id: 'Arte e expressão', label: 'Arte', emoji: '🖌️' },
  { id: 'Música e movimento', label: 'Música', emoji: '🎵' },
  { id: 'Hora do pátio', label: 'Pátio', emoji: '⛅' },
];

export default function MobileDiarioPage() {
  const { isOnline, postOfflineSafe } = useOfflineSync();
  const [classrooms, setClassrooms] = useState<CachedClassroom[]>([]);
  const [turma, setTurma] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fotos, setFotos] = useState<CapturedPhoto[]>([]);
  const [form, setForm] = useState({ tipo: '', descricao: '', observacoes: '' });
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
    drafts.get(draftKey).then(d => { if (d?.data) setForm(d.data as typeof form); });
  }, [turma, draftKey]);

  const update = (field: string, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    setSaved(false);
    if (turma) drafts.save(draftKey, 'diario', next);
  };

  const salvar = async () => {
    if (!turma || !form.descricao.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
        classroomId: turma,
        date: hojeISO(),
        eventDate: hojeISO(),
        title: form.tipo || 'Diário do dia',
        description: form.descricao,
        type: 'ATIVIDADE',
        status: 'PUBLICADO',
        tags: form.tipo ? [form.tipo] : [],
        teacherNotes: form.observacoes || undefined,
      };
      if (fotos.length > 0) {
        payload.attachments = fotos.map(f => ({ base64: f.base64, mimeType: f.mimeType, fileName: f.fileName }));
      }
      await postOfflineSafe('diario', '/diary-events', 'POST', payload);
      await drafts.delete(draftKey);
      setForm({ tipo: '', descricao: '', observacoes: '' });
      setFotos([]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '16px 16px 90px', minHeight: '100%', background: M.color.page }}>
      <MobilePageHeader title="Diário" subtitle={`${hojeISO().split('-').reverse().join('/')} · ${isOnline ? 'online' : 'offline'}`} icon={BookOpen} color="#0284c7" />

      <MobileField label="Turma" required>
        <MobileSelect value={turma} onChange={setTurma} options={classrooms.map(c => ({ id: c.id, label: c.name }))} placeholder="Selecionar turma" />
      </MobileField>

      {turma && (
        <>
          <MobileField label="Tipo de atividade">
            <ChipGroup
              options={TIPOS}
              selected={form.tipo}
              onToggle={id => update('tipo', id === form.tipo ? '' : id)}
              color="#0284c7"
            />
          </MobileField>

          <MobileField label="O que aconteceu na turma hoje?" required hint={`${form.descricao.length} caracteres`}>
            <MobileTextarea
              value={form.descricao}
              onChange={v => update('descricao', v)}
              placeholder="Descreva as atividades, participação, observações..."
              rows={5}
              maxLength={2000}
            />
          </MobileField>

          <MobileField label="Fotos da atividade">
            <PhotoCapture
              photos={fotos}
              onAdd={p => setFotos(prev => [...prev, p])}
              onRemove={i => setFotos(prev => prev.filter((_, idx) => idx !== i))}
              maxPhotos={3}
              label="foto"
            />
          </MobileField>

          <MobileField label="Observações pedagógicas">
            <MobileTextarea
              value={form.observacoes}
              onChange={v => update('observacoes', v)}
              placeholder="Encaminhamentos, ajustes para próxima aula..."
              rows={3}
            />
          </MobileField>

          <p style={{ fontSize: M.font.xs, color: M.color.textMuted }}>💾 Rascunho salvo automaticamente</p>
        </>
      )}

      {turma && (
        <MobileSaveBar
          label="Publicar diário"
          labelDone="✓ Diário publicado"
          onClick={salvar}
          disabled={!form.descricao.trim()}
          saving={saving}
          saved={saved}
          isOnline={isOnline}
          color="#0284c7"
        />
      )}
    </div>
  );
}
