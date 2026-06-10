/**
 * MobileAlunosPage — Lista de alunos no PWA (consulta de fichas)
 *
 * Local dedicado para ver os alunos SEM ser na Chamada (na chamada o toque marca presença).
 * Toque no aluno / avatar → abre a ficha completa (/app/mobile/alunos/:childId).
 *
 * - Filtro por turma + busca por nome.
 * - Avatar com foto (mesma resolução de URL do painel web).
 * - Funciona online (API) e offline (cache local).
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import http from '../../api/http';
import {
  childrenCache, classroomsCache, type CachedChild, type CachedClassroom,
} from '../../services/offlineDB';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { resolveChildPhotoUrl, getChildInitials } from '../../components/children/ChildAvatar';

interface AlunoLista {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  allergies?: string | null;
  laudado?: boolean;
  classroomId?: string;
  classroomName?: string;
}

const ACCENT = '#4f46e5';

export default function MobileAlunosPage() {
  const navigate = useNavigate();
  const { isOnline } = useOfflineSync();

  const [classrooms, setClassrooms] = useState<CachedClassroom[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  const [alunos, setAlunos] = useState<AlunoLista[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Turmas
  useEffect(() => {
    async function load() {
      try {
        if (isOnline) {
          const res = await http.get('/lookup/classrooms/accessible');
          const list = Array.isArray(res.data) ? res.data : res.data?.classrooms ?? [];
          await classroomsCache.saveAll(list);
          setClassrooms(list);
        } else {
          setClassrooms(await classroomsCache.getAll());
        }
      } catch {
        setClassrooms(await classroomsCache.getAll());
      }
    }
    load();
  }, [isOnline]);

  // Alunos
  useEffect(() => {
    async function load() {
      setLoading(true);
      setErro(null);
      try {
        if (isOnline) {
          const res = await http.get('/children', { params: { limit: 300 } });
          const all = Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.children ?? [];
          const mapped: AlunoLista[] = all.map((c: any) => {
            const ativa = c.enrollments?.find((e: any) => e.status === 'ATIVA');
            return {
              id: c.id,
              firstName: c.firstName,
              lastName: c.lastName,
              photoUrl: c.photoUrl ?? null,
              allergies: c.allergies ?? null,
              laudado: c.laudado ?? false,
              classroomId: ativa?.classroomId,
              classroomName: ativa?.classroom?.name,
            };
          });
          setAlunos(mapped);
        } else {
          const cached = await childrenCache.getAll();
          setAlunos(cached.map((c: CachedChild) => ({
            id: c.id, firstName: c.firstName, lastName: c.lastName,
            photoUrl: c.photoUrl, allergies: c.allergies, laudado: c.laudado,
            classroomId: c.classroomId,
          })));
        }
      } catch {
        const cached = await childrenCache.getAll();
        setAlunos(cached.map((c: CachedChild) => ({
          id: c.id, firstName: c.firstName, lastName: c.lastName,
          photoUrl: c.photoUrl, allergies: c.allergies, laudado: c.laudado,
          classroomId: c.classroomId,
        })));
        if (cached.length === 0) setErro('Não foi possível carregar os alunos.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isOnline]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return alunos
      .filter((a) => !selectedClassroom || a.classroomId === selectedClassroom)
      .filter((a) => !q || `${a.firstName} ${a.lastName}`.toLowerCase().includes(q))
      .sort((a, b) => a.firstName.localeCompare(b.firstName, 'pt-BR'));
  }, [alunos, busca, selectedClassroom]);

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 2px', color: '#0f172a' }}>Alunos</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          {filtrados.length} aluno{filtrados.length !== 1 ? 's' : ''} · toque para ver a ficha
        </p>
      </div>

      {/* Busca */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar aluno…"
          style={{
            width: '100%', padding: '11px 14px 11px 38px', fontSize: 15,
            border: '0.5px solid #e2e8f0', borderRadius: 12, background: '#fff',
            color: '#0f172a', outline: 'none',
          }}
        />
      </div>

      {/* Filtro turma */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <select
          value={selectedClassroom}
          onChange={(e) => setSelectedClassroom(e.target.value)}
          style={{
            width: '100%', padding: '11px 40px 11px 14px', fontSize: 15,
            border: '0.5px solid #e2e8f0', borderRadius: 12, background: '#fff',
            color: '#0f172a', appearance: 'none',
          }}
        >
          <option value="">Todas as turmas</option>
          {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <ChevronDown size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} />
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#94a3b8' }} />
        </div>
      )}

      {erro && !loading && (
        <div style={{ padding: '12px 14px', background: '#fef2f2', borderRadius: 12, fontSize: 14, color: '#991b1b' }}>{erro}</div>
      )}

      {!loading && filtrados.length === 0 && !erro && (
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: 24 }}>Nenhum aluno encontrado.</p>
      )}

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtrados.map((a) => {
          const fotoUrl = resolveChildPhotoUrl(a);
          return (
            <button
              key={a.id}
              onClick={() => navigate(`/app/mobile/alunos/${a.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 14,
                border: '0.5px solid #e2e8f0', background: '#fff',
                cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Avatar (foto ou iniciais) */}
              {fotoUrl ? (
                <img src={fotoUrl} alt={a.firstName} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg,#e0e7ff,#ede9fe)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 600, color: ACCENT,
                }}>
                  {getChildInitials(a)}
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 500, margin: 0, color: '#0f172a', lineHeight: 1.3 }}>
                  {a.firstName} {a.lastName}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  {a.classroomName && <span style={{ fontSize: 11, color: '#94a3b8' }}>{a.classroomName}</span>}
                  {a.allergies && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#d97706' }}>
                      <AlertTriangle size={11} /> Alergia
                    </span>
                  )}
                  {a.laudado && <span style={{ fontSize: 11, color: '#7c3aed' }}>Laudado</span>}
                </div>
              </div>

              <ChevronRight size={18} color="#cbd5e1" style={{ flexShrink: 0 }} />
            </button>
          );
        })}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
