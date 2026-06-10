/**
 * MobileOcorrenciaPage — Registro de ocorrência de saúde mobile
 * Projetado para ser rápido: criança passa mal → professor registra em < 30 segundos
 */

import { useState, useEffect } from 'react';
import { HeartPulse, ChevronDown, Loader2, Send, Search, AlertTriangle } from 'lucide-react';
import http from '../../api/http';
import { childrenCache, classroomsCache, type CachedChild, type CachedClassroom } from '../../services/offlineDB';
import { useOfflineSync } from '../../hooks/useOfflineSync';

function hojeISO() { return new Date().toISOString().slice(0, 10); }
function agoraISO() { return new Date().toISOString(); }

const TIPOS_OCORRENCIA = [
  { id: 'MAL_ESTAR', label: 'Mal-estar geral', emoji: '🤒', cor: '#f59e0b' },
  { id: 'QUEDA_ACIDENTE', label: 'Queda / acidente', emoji: '🩹', cor: '#ef4444' },
  { id: 'ALERGIA', label: 'Reação alérgica', emoji: '⚠️', cor: '#dc2626' },
  { id: 'VOMITO', label: 'Vômito', emoji: '🤢', cor: '#f59e0b' },
  { id: 'FEBRE', label: 'Febre', emoji: '🌡️', cor: '#ef4444' },
  { id: 'CHORO_EXCESSIVO', label: 'Choro excessivo', emoji: '😢', cor: '#3b82f6' },
  { id: 'MEDICACAO', label: 'Administração de medicamento', emoji: '💊', cor: '#8b5cf6' },
  { id: 'OUTRO', label: 'Outro', emoji: '📋', cor: '#6b7280' },
];

export function MobileOcorrenciaPage() {
  const { isOnline, postOfflineSafe } = useOfflineSync();
  const [classrooms, setClassrooms] = useState<CachedClassroom[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [children, setChildren] = useState<CachedChild[]>([]);
  const [busca, setBusca] = useState('');
  const [selectedChild, setSelectedChild] = useState<CachedChild | null>(null);
  const [tipo, setTipo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [contatoPais, setContatoPais] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
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
        setClassrooms(await classroomsCache.getAll());
      }
    }
    load();
  }, [isOnline]);

  useEffect(() => {
    if (!selectedClassroom) return;
    if (isOnline) {
      http.get('/children', { params: { limit: 200 } }).then((res) => {
        const all = Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.children ?? [];
        setChildren(all.filter((c: any) => c.enrollments?.some((e: any) => e.classroomId === selectedClassroom && e.status === 'ATIVA')));
      }).catch(async () => setChildren(await childrenCache.getByClassroom(selectedClassroom)));
    } else {
      childrenCache.getByClassroom(selectedClassroom).then(setChildren);
    }
    setSelectedChild(null);
  }, [selectedClassroom, isOnline]);

  const salvar = async () => {
    if (!tipo || !descricao.trim()) return;
    setSaving(true);
    try {
      const payload = {
        classroomId: selectedClassroom,
        childId: selectedChild?.id,
        type: tipo,
        title: TIPOS_OCORRENCIA.find((t) => t.id === tipo)?.label ?? tipo,
        description: descricao,
        eventDate: hojeISO(),
        occurredAt: agoraISO(),
        status: 'PUBLICADO',
        tags: ['ocorrencia', tipo.toLowerCase()],
        contatoPaisRealizado: contatoPais,
      };
      await postOfflineSafe('ocorrencia', '/diary-events', 'POST', payload);
      setSaved(true);
      setTipo(''); setDescricao(''); setContatoPais(false); setSelectedChild(null);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const filtrados = children.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(busca.toLowerCase()));
  const tipoInfo = TIPOS_OCORRENCIA.find((t) => t.id === tipo);
  const urgente = ['ALERGIA', 'QUEDA_ACIDENTE', 'FEBRE'].includes(tipo);

  return (
    <div style={{ padding: '16px 16px 120px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 2px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <HeartPulse size={20} /> Ocorrência
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>Saúde e acidentes · {isOnline ? '🟢' : '🔴 offline'}</p>
      </div>

      {urgente && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef2f2', border: '0.5px solid #fca5a5', borderRadius: 12, marginBottom: 12 }}>
          <AlertTriangle size={16} color="#ef4444" />
          <p style={{ fontSize: 13, color: '#991b1b', margin: 0, fontWeight: 500 }}>Caso grave — notifique a secretaria imediatamente</p>
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <select value={selectedClassroom} onChange={(e) => setSelectedClassroom(e.target.value)}
          style={{ width: '100%', padding: '12px 40px 12px 14px', fontSize: 15, border: '0.5px solid var(--color-border-secondary)', borderRadius: 12, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', appearance: 'none' }}>
          <option value="">Selecionar turma</option>
          {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <ChevronDown size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-secondary)' }} />
      </div>

      {selectedClassroom && !selectedChild && (
        <>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 8px' }}>Selecione a criança (opcional):</p>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..."
              style={{ width: '100%', padding: '10px 14px 10px 36px', fontSize: 14, border: '0.5px solid var(--color-border-secondary)', borderRadius: 10, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
            <button onClick={() => setSelectedChild(null)} style={{ padding: '10px 14px', borderRadius: 10, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
              📋 Turma toda / sem criança específica
            </button>
            {filtrados.slice(0, 8).map((child) => (
              <button key={child.id} onClick={() => setSelectedChild(child)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-background-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: 'var(--color-text-info)', flexShrink: 0 }}>
                  {child.firstName[0]}{child.lastName?.[0] ?? ''}
                </div>
                <span style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>{child.firstName} {child.lastName}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {(selectedChild !== undefined && selectedClassroom) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {selectedChild && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: '#fef2f2', border: '0.5px solid #fca5a5' }}>
              <span style={{ fontSize: 20 }}>👤</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#991b1b', flex: 1 }}>{selectedChild.firstName} {selectedChild.lastName}</span>
              <button onClick={() => setSelectedChild(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: 12 }}>Trocar</button>
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>Tipo de ocorrência *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {TIPOS_OCORRENCIA.map((t) => (
                <button key={t.id} onClick={() => setTipo(t.id === tipo ? '' : t.id)}
                  style={{
                    padding: '11px 10px', borderRadius: 12, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                    border: `0.5px solid ${tipo === t.id ? t.cor : 'var(--color-border-tertiary)'}`,
                    background: tipo === t.id ? `${t.cor}18` : 'var(--color-background-primary)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                  <span style={{ fontSize: 18 }}>{t.emoji}</span>
                  <span style={{ fontSize: 12, color: tipo === t.id ? t.cor : 'var(--color-text-primary)', fontWeight: tipo === t.id ? 500 : 400, lineHeight: 1.2 }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {tipo && (
            <>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Descreva o que aconteceu *</label>
                <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)}
                  placeholder="O que aconteceu, quando, como foi atendido, estado atual da criança..."
                  rows={4}
                  style={{ width: '100%', padding: '12px 14px', fontSize: 15, border: '0.5px solid var(--color-border-secondary)', borderRadius: 12, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={contatoPais} onChange={(e) => setContatoPais(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#4f46e5' }} />
                <span style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>Responsável já foi contactado</span>
              </label>
            </>
          )}
        </div>
      )}

      {selectedClassroom && (
        <div style={{ position: 'fixed', bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))', left: 0, right: 0, padding: '12px 16px', background: 'var(--color-background-primary)', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <button onClick={salvar} disabled={saving || !tipo || !descricao.trim()}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: saved ? '#10b981' : urgente ? '#ef4444' : '#4f46e5', color: '#fff',
              fontSize: 15, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: (!tipo || !descricao.trim() || saving) ? 0.6 : 1,
            }}>
            {saving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
            {saved ? '✓ Ocorrência registrada' : 'Registrar ocorrência'}
          </button>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default MobileOcorrenciaPage;
