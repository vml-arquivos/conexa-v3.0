/**
 * MobileShell — Layout base do PWA mobile
 * Bottom navigation com 5 módulos principais
 * Design: clean, touch-first, contraste alto
 */

import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { ClipboardList, BookOpen, Eye, HeartPulse, Package, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineSync } from '../../hooks/useOfflineSync';

const NAV_ITEMS = [
  { path: '/app/mobile/chamada',    label: 'Chamada',    Icon: ClipboardList },
  { path: '/app/mobile/diario',     label: 'Diário',     Icon: BookOpen      },
  { path: '/app/mobile/observacao', label: 'Observação', Icon: Eye           },
  { path: '/app/mobile/ocorrencia', label: 'Ocorrência', Icon: HeartPulse    },
  { path: '/app/mobile/material',   label: 'Material',   Icon: Package       },
];

export default function MobileShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline, queueCount, isSyncing, syncNow } = useOfflineSync();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-background-tertiary)' }}>

      {/* Status bar: offline/sync indicator */}
      {(!isOnline || queueCount > 0) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 16px',
          background: isOnline ? 'var(--color-background-warning)' : 'var(--color-background-danger)',
          fontSize: 12, color: isOnline ? 'var(--color-text-warning)' : 'var(--color-text-danger)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>
              {isOnline
                ? `${queueCount} ação${queueCount !== 1 ? 'ões' : ''} aguardando envio`
                : `Sem conexão · ${queueCount} ação${queueCount !== 1 ? 'ões' : ''} salva${queueCount !== 1 ? 's' : ''} localmente`}
            </span>
          </div>
          {isOnline && queueCount > 0 && (
            <button onClick={syncNow} disabled={isSyncing}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'inherit', fontSize: 12 }}>
              <RefreshCw size={12} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
              Sincronizar
            </button>
          )}
        </div>
      )}

      {/* Conteúdo da página */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <Outlet />
      </div>

      {/* Bottom navigation */}
      <nav style={{
        display: 'flex',
        background: 'var(--color-background-primary)',
        borderTop: '0.5px solid var(--color-border-tertiary)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {NAV_ITEMS.map(({ path, label, Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '8px 4px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: active ? 'var(--color-text-info)' : 'var(--color-text-tertiary)',
                transition: 'color 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, letterSpacing: 0.2 }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
