/**
 * MobileObservacaoPage — Observação individual de desenvolvimento (BNCC)
 * Professor seleciona a criança → escolhe campo de experiência → registra observação
 */

import { useState, useEffect } from 'react';
import { Eye, ChevronDown, Loader2, Send, Search } from 'lucide-react';
import http from '../../api/http';
import { childrenCache, classroomsCache, type CachedChild, type CachedClassroom } from '../../services/offlineDB';
import { useOfflineSync } from '../../hooks/useOfflineSync';

function hojeISO() { return new Date().toISOString().slice(0, 10); }

const CAMPOS_BNCC = [
  { id: 'O_EU_O_OUTRO_E_NOS', label: 'O eu, o outro e o nós', emoji: '🤝' },
  { id: 'CORPO_GESTOS_E_MOVIMENTOS', label: 'Corpo, gestos e movimentos', emoji: '🏃' },
  { id: 'TRACOS_SONS_CORES_E_FORMAS', label: 'Traços, sons, cores e formas', emoji: '🎨' },
  { id: 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO', label: 'Escuta, fala, pensamento e imaginação', emoji: '💬' },
  { id: 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES', label: 'Espaços, tempos, quantidades e transformações', emoji: '🔢' },
];

const NIVEIS = [
  { id: 'EMERGINDO', label: 'Emergindo', color: '#f59e0b', desc: 'Dá os primeiros sinais' },
  { id: 'EM_DESENVOLVIMENTO', label: 'Desenvolvendo', color: '#3b82f6', desc: 'Demonstra com apoio' },
  { id: 'CONSOLIDADO', label: 'Consolidado', color: '#10b981', desc: 'Demonstra com autonomia' },
];

export default function MobileObservacaoPage() {
  const { isOnline, postOfflineSafe } = useOfflineSync();
  const [classrooms, setClassrooms] = useState<CachedClassroom[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [children, setChildren] = useState<CachedChild[]>([]);
  const [busca, setBusca] = useState('');
  const [selectedChild, setSelectedChild] = useState<CachedChild | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ campo: '', nivel: '', descricao: '' });

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
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isOnline]);

  useEffect(() => {
    if (!selectedClassroom) return;
    async function loadChildren() {
      if (isOnline) {
        try {
          const res = await http.get('/children', { params: { limit: 200 } });
          const all = Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.children ?? [];
          const da = all.filter((c: any) => c.enrollments?.some((e: any) => e.classroomId === selectedClassroom && e.status === 'ATIVA'));
          await childrenCache.saveAll(da.map((c: any) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, classroomId: selectedClassroom, laudado: c.laudado })));
          setChildren(da);
        } catch {
          setChildren(await childrenCache.getByClassroom(selectedClassroom));
        }
      } else {
        setChildren(await childrenCache.getByClassroom(selectedClassroom));
      }
    }
    loadChildren();
    setSelectedChild(null);
  }, [selectedClassroom, isOnline]);

  const childrenFiltrados = children.filter((c) =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(busca.toLowerCase()),
  );

  const salvar = async () => {
    if (!selectedChild || !form.campo || !form.nivel || !form.descricao.trim()) return;
    setSaving(true);
    try {
      const payload = {
        childId: selectedChild.id,
        classroomId: selectedClassroom,
        category: form.campo,
        nivel: form.nivel,
        description: form.descricao,
        observationDate: hojeISO(),
        fonte: 'PROFESSOR_MOBILE',
      };
      await postOfflineSafe('observacao', '/development-observations', 'POST', payload);
      setSaved(true);
      setForm({ campo: '', nivel: '', descricao: '' });
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const podeEnviar = selectedChild && form.campo && form.nivel && form.descricao.trim().length >= 10;

  return (
    <div style={{ padding: '16px 16px 120px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 2px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Eye size={20} /> Observação
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
          Desenvolvimento individual · BNCC · {isOnline ? '🟢' : '🔴 offline'}
        </p>
      </div>

      {/* Seletor turma */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <select value={selectedClassroom} onChange={(e) => setSelectedClassroom(e.target.value)}
          style={{ width: '100%', padding: '12px 40px 12px 14px', fontSize: 15, border: '0.5px solid var(--color-border-secondary)', borderRadius: 12, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', appearance: 'none' }}>
          <option value="">Selecionar turma</option>
          {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <ChevronDown size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-secondary)' }} />
      </div>

      {selectedClassroom && !selectedChild && (
        <>
          {/* Busca de aluno */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar criança..."
              style={{ width: '100%', padding: '12px 14px 12px 40px', fontSize: 15, border: '0.5px solid var(--color-border-secondary)', borderRadius: 12, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {childrenFiltrados.map((child) => (
              <button key={child.id} onClick={() => setSelectedChild(child)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)', cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-background-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 500, color: 'var(--color-text-info)', flexShrink: 0 }}>
                  {child.firstName[0]}{child.lastName?.[0] ?? ''}
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' }}>{child.firstName} {child.lastName}</p>
                  {child.laudado && <p style={{ fontSize: 11, color: '#7c3aed', margin: 0 }}>★ Laudado</p>}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {selectedChild && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Criança selecionada */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: '#eef2ff', border: '0.5px solid #c7d2fe' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 500, color: '#3730a3', flexShrink: 0 }}>
              {selectedChild.firstName[0]}{selectedChild.lastName?.[0] ?? ''}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 500, margin: 0, color: '#312e81' }}>{selectedChild.firstName} {selectedChild.lastName}</p>
            </div>
            <button onClick={() => setSelectedChild(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: 13 }}>Trocar</button>
          </div>

          {/* Campos BNCC */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>Campo de experiência (BNCC) *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CAMPOS_BNCC.map((campo) => (
                <button key={campo.id} onClick={() => setForm((f) => ({ ...f, campo: campo.id }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent',
                    border: `0.5px solid ${form.campo === campo.id ? '#4f46e5' : 'var(--color-border-tertiary)'}`,
                    background: form.campo === campo.id ? '#eef2ff' : 'var(--color-background-primary)',
                  }}>
                  <span style={{ fontSize: 20 }}>{campo.emoji}</span>
                  <span style={{ fontSize: 13, color: form.campo === campo.id ? '#4338ca' : 'var(--color-text-primary)', fontWeight: form.campo === campo.id ? 500 : 400 }}>
                    {campo.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Nível */}
          {form.campo && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>Nível observado *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {NIVEIS.map((nivel) => (
                  <button key={nivel.id} onClick={() => setForm((f) => ({ ...f, nivel: nivel.id }))}
                    style={{
                      padding: '12px 8px', borderRadius: 12, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                      border: `0.5px solid ${form.nivel === nivel.id ? nivel.color : 'var(--color-border-tertiary)'}`,
                      background: form.nivel === nivel.id ? `${nivel.color}18` : 'var(--color-background-primary)',
                      textAlign: 'center',
                    }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', color: form.nivel === nivel.id ? nivel.color : 'var(--color-text-primary)' }}>{nivel.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>{nivel.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Descrição */}
          {form.nivel && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>O que você observou? *</label>
              <textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva a situação específica onde observou esse comportamento/habilidade..."
                rows={5}
                style={{ width: '100%', padding: '12px 14px', fontSize: 15, border: '0.5px solid var(--color-border-secondary)', borderRadius: 12, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '4px 0 0', textAlign: 'right' }}>
                Mínimo 10 caracteres · {form.descricao.length}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Botão salvar */}
      {selectedChild && (
        <div style={{ position: 'fixed', bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))', left: 0, right: 0, padding: '12px 16px', background: 'var(--color-background-primary)', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <button onClick={salvar} disabled={saving || !podeEnviar}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: saved ? '#10b981' : '#4f46e5', color: '#fff', fontSize: 15, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: (!podeEnviar || saving) ? 0.6 : 1,
            }}>
            {saving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
            {saved ? '✓ Observação salva' : isOnline ? 'Salvar observação' : 'Salvar offline'}
          </button>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
