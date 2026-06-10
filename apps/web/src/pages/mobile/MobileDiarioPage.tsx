/**
 * MobileDiarioPage — Diário de bordo mobile-first com suporte offline
 */

import { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, Loader2, Send, Save } from 'lucide-react';
import http from '../../api/http';
import { classroomsCache, type CachedClassroom, drafts } from '../../services/offlineDB';
import { useOfflineSync } from '../../hooks/useOfflineSync';

function hojeISO() { return new Date().toISOString().slice(0, 10); }

const TIPOS_ATIVIDADE = [
  'Roda de conversa', 'Atividade dirigida', 'Brincadeira livre',
  'Leitura compartilhada', 'Exploração sensorial', 'Arte e expressão',
  'Música e movimento', 'Hora do pátio', 'Alimentação', 'Sono / repouso',
];

export default function MobileDiarioPage() {
  const { isOnline, postOfflineSafe } = useOfflineSync();
  const [classrooms, setClassrooms] = useState<CachedClassroom[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    tipo: '',
    titulo: '',
    descricao: '',
    observacoes: '',
    tags: [] as string[],
  });

  const DRAFT_KEY = `diario-draft-${selectedClassroom}-${hojeISO()}`;

  // Carregar turmas
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (isOnline) {
          const res = await http.get('/lookup/classrooms/accessible');
          const list = Array.isArray(res.data) ? res.data : res.data?.classrooms ?? [];
          await classroomsCache.saveAll(list);
          setClassrooms(list);
          if (list.length === 1) setSelectedClassroom(list[0].id);
        } else {
          const cached = await classroomsCache.getAll();
          setClassrooms(cached);
          if (cached.length === 1) setSelectedClassroom(cached[0].id);
        }
      } catch {
        const cached = await classroomsCache.getAll();
        setClassrooms(cached);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isOnline]);

  // Recuperar rascunho ao mudar de turma
  useEffect(() => {
    if (!selectedClassroom) return;
    drafts.get(DRAFT_KEY).then((draft) => {
      if (draft?.data) setForm(draft.data as typeof form);
    });
  }, [selectedClassroom, DRAFT_KEY]);

  // Auto-salvar rascunho
  const update = (field: string, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    setSaved(false);
    if (selectedClassroom) {
      drafts.save(DRAFT_KEY, 'diario', next);
    }
  };

  const salvar = async () => {
    if (!selectedClassroom || !form.descricao.trim()) return;
    setSaving(true);
    try {
      const payload = {
        classroomId: selectedClassroom,
        date: hojeISO(),
        eventDate: hojeISO(),
        title: form.titulo || form.tipo || 'Diário do dia',
        description: form.descricao,
        type: 'ATIVIDADE',
        status: 'PUBLICADO',
        tags: form.tipo ? [form.tipo] : [],
        teacherNotes: form.observacoes || undefined,
      };
      await postOfflineSafe('diario', '/diary-events', 'POST', payload);
      await drafts.delete(DRAFT_KEY);
      setForm({ tipo: '', titulo: '', descricao: '', observacoes: '', tags: [] });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const progressoForm = [
    !!form.tipo,
    !!form.descricao,
  ].filter(Boolean).length;

  return (
    <div style={{ padding: '16px 16px 120px' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 2px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={20} /> Diário
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
          {hojeISO().split('-').reverse().join('/')} · {isOnline ? '🟢' : '🔴 offline'}
        </p>
      </div>

      {/* Seletor de turma */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <select value={selectedClassroom} onChange={(e) => setSelectedClassroom(e.target.value)}
          style={{ width: '100%', padding: '12px 40px 12px 14px', fontSize: 15, border: '0.5px solid var(--color-border-secondary)', borderRadius: 12, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', appearance: 'none' }}>
          <option value="">Selecionar turma</option>
          {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <ChevronDown size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-secondary)' }} />
      </div>

      {selectedClassroom && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Progresso visual */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1].map((i) => (
              <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i < progressoForm ? '#4f46e5' : 'var(--color-border-tertiary)', transition: 'background 0.2s' }} />
            ))}
          </div>

          {/* Tipo de atividade */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
              Tipo de atividade *
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TIPOS_ATIVIDADE.map((tipo) => (
                <button key={tipo} onClick={() => update('tipo', tipo === form.tipo ? '' : tipo)}
                  style={{
                    padding: '7px 12px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                    border: `0.5px solid ${form.tipo === tipo ? '#4f46e5' : 'var(--color-border-tertiary)'}`,
                    background: form.tipo === tipo ? '#eef2ff' : 'var(--color-background-primary)',
                    color: form.tipo === tipo ? '#4338ca' : 'var(--color-text-secondary)',
                    fontWeight: form.tipo === tipo ? 500 : 400,
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Título opcional */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Título (opcional)</label>
            <input value={form.titulo} onChange={(e) => update('titulo', e.target.value)}
              placeholder="Ex.: Explorando formas geométricas"
              style={{ width: '100%', padding: '12px 14px', fontSize: 15, border: '0.5px solid var(--color-border-secondary)', borderRadius: 12, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>

          {/* Descrição principal */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>O que aconteceu na turma hoje? *</label>
            <textarea value={form.descricao} onChange={(e) => update('descricao', e.target.value)}
              placeholder="Descreva as atividades, como as crianças participaram, o que foi observado..."
              rows={6}
              style={{ width: '100%', padding: '12px 14px', fontSize: 15, border: '0.5px solid var(--color-border-secondary)', borderRadius: 12, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '4px 0 0', textAlign: 'right' }}>
              {form.descricao.length} caracteres
            </p>
          </div>

          {/* Observações pedagógicas */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Observações pedagógicas (opcional)</label>
            <textarea value={form.observacoes} onChange={(e) => update('observacoes', e.target.value)}
              placeholder="Encaminhamentos, ajustes para próxima aula, crianças que precisam de atenção especial..."
              rows={3}
              style={{ width: '100%', padding: '12px 14px', fontSize: 15, border: '0.5px solid var(--color-border-secondary)', borderRadius: 12, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>

          {/* Indicador de rascunho */}
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Save size={12} /> Rascunho salvo automaticamente
          </p>
        </div>
      )}

      {/* Botão salvar fixo */}
      {selectedClassroom && (
        <div style={{ position: 'fixed', bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))', left: 0, right: 0, padding: '12px 16px', background: 'var(--color-background-primary)', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <button onClick={salvar} disabled={saving || !form.descricao.trim()}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: saved ? '#10b981' : '#4f46e5', color: '#fff',
              fontSize: 15, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: (!form.descricao.trim() || saving) ? 0.6 : 1,
            }}>
            {saving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
            {saved ? '✓ Diário publicado' : isOnline ? 'Publicar diário' : 'Salvar offline'}
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
