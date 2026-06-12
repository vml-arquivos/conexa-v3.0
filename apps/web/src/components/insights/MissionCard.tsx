/**
 * MissionCard.tsx — Card reutilizável de missão inteligente
 *
 * Usado em: TeacherDashboard, CoordPedagogica, CoordGeral, Diretor, Nutricionista, Secretaria
 * Cada missão responde: o que, por que, evidência, prioridade, próximo passo, destino.
 */

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle, Info, Zap } from 'lucide-react';

export type MissionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface MissionEvidence {
  source: string;
  sourceId?: string;
  label: string;
  date?: string;
  value?: string | number;
}

export interface Mission {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: MissionPriority;
  profile: string[];
  evidence: MissionEvidence[];
  suggestedAction: string;
  targetRoute?: string;
  requiresHumanReview: true;
  generatedAt: string;
  tenantScope: { mantenedoraId?: string; unitId?: string };
}

const PRIORITY_CONFIG: Record<MissionPriority, {
  label: string; bg: string; border: string; text: string; dot: string;
}> = {
  CRITICAL: { label: 'Crítico', bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', dot: '#dc2626' },
  HIGH:     { label: 'Alto',    bg: '#fffbeb', border: '#fde68a', text: '#92400e', dot: '#f59e0b' },
  MEDIUM:   { label: 'Médio',   bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', dot: '#3b82f6' },
  LOW:      { label: 'Baixo',   bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', dot: '#22c55e' },
};

const TYPE_LABELS: Record<string, string> = {
  ALERTA_OPERACIONAL:       'Alerta',
  RDIC_PENDENTE:            'RDIC',
  BAIXA_FREQUENCIA:         'Frequência',
  OBSERVACAO_DESENVOLVIMENTO: 'Desenvolvimento',
  RESTRICAO_ALIMENTAR_CRITICA: 'Nutrição',
  CRIANCA_SEM_DIARIO:       'Diário',
};

export function MissionCard({ mission, compact = false }: { mission: Mission; compact?: boolean }) {
  const navigate = useNavigate();
  const cfg = PRIORITY_CONFIG[mission.priority];

  return (
    <div style={{
      background: cfg.bg,
      border: `0.5px solid ${cfg.border}`,
      borderRadius: 14,
      padding: compact ? '10px 12px' : '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: cfg.text, margin: 0, lineHeight: 1.3 }}>
            {mission.title}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px',
            background: cfg.dot, color: '#fff', borderRadius: 20,
          }}>
            {cfg.label}
          </span>
          <span style={{
            fontSize: 10, color: cfg.text, padding: '2px 7px',
            border: `0.5px solid ${cfg.border}`, borderRadius: 20,
            background: 'rgba(255,255,255,0.6)',
          }}>
            {TYPE_LABELS[mission.type] ?? mission.type}
          </span>
        </div>
      </div>

      {/* Descrição */}
      {!compact && (
        <p style={{ fontSize: 12, color: cfg.text, margin: 0, opacity: 0.8, lineHeight: 1.5 }}>
          {mission.description}
        </p>
      )}

      {/* Evidências */}
      {!compact && mission.evidence.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {mission.evidence.map((e, i) => (
            <span key={i} style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 20,
              background: 'rgba(255,255,255,0.7)', border: `0.5px solid ${cfg.border}`,
              color: cfg.text,
            }}>
              {e.label}{e.value !== undefined ? `: ${e.value}` : ''}
            </span>
          ))}
        </div>
      )}

      {/* Ação sugerida + botão */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ fontSize: 11, color: cfg.text, margin: 0, opacity: 0.75, flex: 1, lineHeight: 1.4 }}>
          {mission.suggestedAction}
        </p>
        {mission.targetRoute && (
          <button
            onClick={() => navigate(mission.targetRoute!)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 8, border: `0.5px solid ${cfg.border}`,
              background: 'rgba(255,255,255,0.8)', color: cfg.text,
              fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Abrir <ArrowRight size={12} />
          </button>
        )}
      </div>

      {/* Rodapé */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 0.5 }}>
        <Info size={10} color={cfg.dot} />
        <span style={{ fontSize: 10, color: cfg.text }}>Revisão humana necessária</span>
        <span style={{ fontSize: 10, color: cfg.text, marginLeft: 'auto' }}>
          {new Date(mission.generatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// ─── Painel de missões (usado nos dashboards) ─────────────────────────────────
export function MissionPanel({
  missions, loading, error, title = 'Missões', compact = false, maxItems = 5,
}: {
  missions: Mission[];
  loading?: boolean;
  error?: string;
  title?: string;
  compact?: boolean;
  maxItems?: number;
}) {
  const navigate = useNavigate();
  const shown = missions.slice(0, maxItems);
  const criticos = missions.filter((m) => m.priority === 'CRITICAL').length;
  const altos = missions.filter((m) => m.priority === 'HIGH').length;

  return (
    <div style={{
      background: '#fff', border: '0.5px solid #e2e8f0',
      borderRadius: 16, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '0.5px solid #f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} color="#f59e0b" />
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#0f172a' }}>{title}</p>
          {missions.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '1px 7px',
              background: criticos > 0 ? '#dc2626' : altos > 0 ? '#f59e0b' : '#64748b',
              color: '#fff', borderRadius: 20,
            }}>
              {missions.length}
            </span>
          )}
        </div>
        {missions.length > maxItems && (
          <button
            onClick={() => navigate('/app/inteligencia/missoes')}
            style={{ fontSize: 12, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
          >
            Ver todas →
          </button>
        )}
      </div>

      {/* Conteúdo */}
      <div style={{ padding: '12px 16px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: 13 }}>
            Carregando missões...
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', gap: 8, padding: '10px', background: '#fef2f2', borderRadius: 8, fontSize: 12, color: '#991b1b' }}>
            <AlertTriangle size={14} />
            {error}
          </div>
        )}
        {!loading && !error && missions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
            <CheckCircle size={24} color="#10b981" style={{ margin: '0 auto 8px', display: 'block' }} />
            <p style={{ fontSize: 13, margin: 0 }}>Nenhuma missão pendente</p>
          </div>
        )}
        {!loading && !error && shown.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shown.map((m) => <MissionCard key={m.id} mission={m} compact={compact} />)}
          </div>
        )}
      </div>
    </div>
  );
}
