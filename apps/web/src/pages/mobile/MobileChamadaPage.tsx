/**
 * MobileChamadaPage — Chamada mobile-first com suporte offline
 *
 * Fluxo:
 * 1. Carrega alunos do IndexedDB (offline) ou da API (online)
 * 2. Professor toca em cada aluno para marcar presença/falta
 * 3. Salva localmente e envia (ou enfileira se offline)
 */

import { useState, useEffect, useCallback } from 'react';
import { Check, X, ChevronDown, Loader2, RefreshCw, Send } from 'lucide-react';
import { useAuth } from '../../app/AuthProvider';
import http from '../../api/http';
import { childrenCache, classroomsCache, type CachedChild, type CachedClassroom } from '../../services/offlineDB';
import { useOfflineSync } from '../../hooks/useOfflineSync';

type Status = 'P' | 'F' | null;

function hojeISO() { return new Date().toISOString().slice(0, 10); }

export default function MobileChamadaPage() {
  const { user } = useAuth();
  const { isOnline, postOfflineSafe } = useOfflineSync();

  const [classrooms, setClassrooms] = useState<CachedClassroom[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  const [children, setChildren] = useState<CachedChild[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Carregar turmas (online ou cache)
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

  // Carregar alunos da turma selecionada
  useEffect(() => {
    if (!selectedClassroom) return;
    async function loadChildren() {
      setLoading(true);
      setAttendance({});
      try {
        if (isOnline) {
          const [childRes, chamadaRes] = await Promise.all([
            http.get('/children', { params: { limit: 200 } }),
            http.get('/attendance/today', { params: { classroomId: selectedClassroom, date: hojeISO() } }),
          ]);
          const all = Array.isArray(childRes.data) ? childRes.data : childRes.data?.data ?? childRes.data?.children ?? [];
          const da = all.filter((c: any) => c.enrollments?.some((e: any) => e.classroomId === selectedClassroom && e.status === 'ATIVA'));
          setChildren(da);
          // Preencher chamada já feita hoje
          const chamada = chamadaRes.data?.records ?? chamadaRes.data ?? [];
          if (Array.isArray(chamada)) {
            const map: Record<string, Status> = {};
            chamada.forEach((r: any) => { map[r.childId] = r.status === 'P' ? 'P' : 'F'; });
            setAttendance(map);
          }
        } else {
          const cached = await childrenCache.getByClassroom(selectedClassroom);
          setChildren(cached);
        }
      } catch {
        const cached = await childrenCache.getByClassroom(selectedClassroom);
        setChildren(cached);
      } finally {
        setLoading(false);
      }
    }
    loadChildren();
  }, [selectedClassroom, isOnline]);

  const toggle = useCallback((id: string) => {
    setAttendance((prev) => {
      const current = prev[id];
      return { ...prev, [id]: current === 'P' ? 'F' : current === 'F' ? null : 'P' };
    });
    setSaved(false);
  }, []);

  const marcarTodos = (status: Status) => {
    const map: Record<string, Status> = {};
    children.forEach((c) => { map[c.id] = status; });
    setAttendance(map);
    setSaved(false);
  };

  const salvar = async () => {
    if (!selectedClassroom) return;
    setSaving(true);
    setErro(null);
    try {
      const records = children.map((c) => ({
        childId: c.id,
        status: attendance[c.id] ?? 'P',
        date: hojeISO(),
      }));
      const payload = { classroomId: selectedClassroom, date: hojeISO(), records };
      const result = await postOfflineSafe('chamada', '/attendance/register', 'POST', payload);
      setSaved(true);
      if (!result.synced && !isOnline) {
        // Feedback visual: salvo offline
      }
    } catch (e) {
      setErro('Erro ao salvar. Verifique a conexão.');
    } finally {
      setSaving(false);
    }
  };

  const presentes = children.filter((c) => attendance[c.id] === 'P').length;
  const faltas = children.filter((c) => attendance[c.id] === 'F').length;
  const naoBatidos = children.filter((c) => !attendance[c.id]).length;

  return (
    <div style={{ padding: '16px 16px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 2px', color: 'var(--color-text-primary)' }}>Chamada</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
          {hojeISO().split('-').reverse().join('/')} · {isOnline ? '🟢 online' : '🔴 offline'}
        </p>
      </div>

      {/* Seletor de turma */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <select
          value={selectedClassroom}
          onChange={(e) => setSelectedClassroom(e.target.value)}
          style={{
            width: '100%', padding: '12px 40px 12px 14px', fontSize: 15,
            border: '0.5px solid var(--color-border-secondary)',
            borderRadius: 12, background: 'var(--color-background-primary)',
            color: 'var(--color-text-primary)', appearance: 'none',
          }}
        >
          <option value="">Selecionar turma</option>
          {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <ChevronDown size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-secondary)' }} />
      </div>

      {selectedClassroom && !loading && children.length > 0 && (
        <>
          {/* Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Presentes', value: presentes, color: '#10b981' },
              { label: 'Faltas', value: faltas, color: '#ef4444' },
              { label: 'Pendente', value: naoBatidos, color: '#f59e0b' },
            ].map((item) => (
              <div key={item.label} style={{
                background: 'var(--color-background-primary)', borderRadius: 12,
                padding: '10px 12px', border: '0.5px solid var(--color-border-tertiary)', textAlign: 'center',
              }}>
                <p style={{ fontSize: 22, fontWeight: 500, margin: 0, color: item.color }}>{item.value}</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: 0 }}>{item.label}</p>
              </div>
            ))}
          </div>

          {/* Ações rápidas */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => marcarTodos('P')} style={{
              flex: 1, padding: '10px', borderRadius: 10, border: '0.5px solid #10b981',
              background: '#f0fdf4', color: '#065f46', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>
              ✓ Todos presentes
            </button>
            <button onClick={() => marcarTodos(null)} style={{
              flex: 1, padding: '10px', borderRadius: 10, border: '0.5px solid var(--color-border-secondary)',
              background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', fontSize: 13, cursor: 'pointer',
            }}>
              ↺ Limpar
            </button>
          </div>

          {/* Lista de alunos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 100 }}>
            {children.map((child) => {
              const status = attendance[child.id];
              return (
                <button
                  key={child.id}
                  onClick={() => toggle(child.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 14,
                    border: `0.5px solid ${status === 'P' ? '#10b981' : status === 'F' ? '#ef4444' : 'var(--color-border-tertiary)'}`,
                    background: status === 'P' ? '#f0fdf4' : status === 'F' ? '#fef2f2' : 'var(--color-background-primary)',
                    cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: status === 'P' ? '#d1fae5' : status === 'F' ? '#fee2e2' : 'var(--color-background-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 500,
                    color: status === 'P' ? '#065f46' : status === 'F' ? '#991b1b' : 'var(--color-text-secondary)',
                  }}>
                    {status === 'P' ? <Check size={18} /> : status === 'F' ? <X size={18} /> : `${child.firstName[0]}${child.lastName?.[0] ?? ''}`}
                  </div>

                  {/* Nome */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                      {child.firstName} {child.lastName}
                    </p>
                    {child.allergies && (
                      <p style={{ fontSize: 11, color: '#d97706', margin: 0 }}>⚠ {child.allergies.slice(0, 30)}</p>
                    )}
                  </div>

                  {/* Status badge */}
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                    background: status === 'P' ? '#d1fae5' : status === 'F' ? '#fee2e2' : 'var(--color-background-secondary)',
                    color: status === 'P' ? '#065f46' : status === 'F' ? '#991b1b' : 'var(--color-text-tertiary)',
                    flexShrink: 0,
                  }}>
                    {status === 'P' ? 'Presente' : status === 'F' ? 'Falta' : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-text-tertiary)' }} />
        </div>
      )}

      {erro && (
        <div style={{ padding: '10px 14px', background: 'var(--color-background-danger)', borderRadius: 10, marginBottom: 12, fontSize: 13, color: 'var(--color-text-danger)' }}>
          {erro}
        </div>
      )}

      {/* Botão salvar fixo */}
      {selectedClassroom && children.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))',
          left: 0, right: 0, padding: '12px 16px',
          background: 'var(--color-background-primary)',
          borderTop: '0.5px solid var(--color-border-tertiary)',
        }}>
          <button
            onClick={salvar}
            disabled={saving || naoBatidos === children.length}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: saved ? '#10b981' : '#4f46e5', color: '#fff',
              fontSize: 15, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: (saving || naoBatidos === children.length) ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {saving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
            {saved ? '✓ Chamada salva' : isOnline ? 'Salvar chamada' : 'Salvar offline'}
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
