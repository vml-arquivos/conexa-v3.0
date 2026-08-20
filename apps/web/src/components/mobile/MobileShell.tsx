/**
 * MobileShell — Layout PWA mobile-first
 *
 * - Header compacto com nome do usuário e botão de logout
 * - Bottom navigation com 5 módulos
 * - Banner de status offline
 * - Design limpo, sem nada do desktop
 */

import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  ClipboardList, BookOpen, Eye, HeartPulse, Users,
  Wifi, WifiOff, RefreshCw, LogOut, Monitor, Moon, Sun,
} from 'lucide-react';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useAuth } from '../../app/AuthProvider';
import { useTheme } from '../../contexts/ThemeContext';

const NAV = [
  { path: '/app/mobile/chamada',    label: 'Chamada',    Icon: ClipboardList, cor: 'var(--brand-500)' },
  { path: '/app/mobile/diario',     label: 'Diário',     Icon: BookOpen,      cor: 'var(--brand-500)' },
  { path: '/app/mobile/observacao', label: 'Observação', Icon: Eye,           cor: 'var(--brand-500)' },
  { path: '/app/mobile/ocorrencia', label: 'Ocorrência', Icon: HeartPulse,    cor: 'var(--brand-500)' },
  { path: '/app/mobile/alunos',     label: 'Alunos',     Icon: Users,         cor: 'var(--brand-500)' },
];

export default function MobileShell() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isOnline, queueCount, isSyncing, syncNow } = useOfflineSync();

  const nomeUsuario = (user as any)?.nome?.split(' ')[0]
    ?? (user as any)?.firstName
    ?? (user as any)?.email?.split('@')[0]
    ?? 'Professor(a)';

  const ativaIdx = NAV.findIndex(n => n.path === location.pathname);
  const corAtiva = ativaIdx >= 0 ? NAV[ativaIdx].cor : 'var(--brand-500)';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', background: 'var(--surface-page)',
      fontFamily: 'var(--font-body)',
    }}>

      {/* ── Header compacto ─────────────────────────────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        paddingTop: 'max(10px, env(safe-area-inset-top))',
        background: 'var(--surface-card)',
        borderBottom: '0.5px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
        flexShrink: 0,
      }}>
        {/* Logo + nome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'var(--brand-600)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: 'var(--text-inverse)', fontSize: 14, fontWeight: 700 }}>C</span>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              Olá, {nomeUsuario}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.2 }}>
              COCRIS Pedagógico
            </p>
          </div>
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Botão versão desktop */}
          <button
            onClick={() => navigate('/app/teacher-dashboard')}
            title="Versão desktop"
            style={{
              width: 34, height: 34, borderRadius: 10, border: '0.5px solid var(--border-default)',
              background: 'var(--surface-subtle)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-tertiary)',
            }}
          >
            <Monitor size={16} />
          </button>

          {/* Tema */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            style={{
              width: 34, height: 34, borderRadius: 10, border: '0.5px solid var(--border-default)',
              background: 'var(--surface-subtle)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-brand)',
            }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Logout */}
          <button
            onClick={() => { logout?.(); navigate('/login'); }}
            title="Sair"
            style={{
              width: 34, height: 34, borderRadius: 10, border: '0.5px solid var(--error-border)',
              background: 'var(--error-bg)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--error)',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── Banner offline/sync ──────────────────────────────────── */}
      {(!isOnline || queueCount > 0) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 16px', flexShrink: 0,
          background: isOnline ? 'var(--info-bg)' : 'var(--error-bg)',
          borderBottom: `0.5px solid ${isOnline ? 'var(--info-border)' : 'var(--error-border)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isOnline
              ? <Wifi size={13} color="var(--info)" />
              : <WifiOff size={13} color="var(--error)" />}
            <span style={{ fontSize: 12, color: isOnline ? 'var(--info)' : 'var(--error)' }}>
              {isOnline
                ? `${queueCount} ${queueCount === 1 ? 'ação aguardando envio' : 'ações aguardando envio'}`
                : `Sem conexão · ${queueCount} ${queueCount === 1 ? 'ação salva localmente' : 'ações salvas localmente'}`}
            </span>
          </div>
          {isOnline && queueCount > 0 && (
            <button onClick={syncNow} disabled={isSyncing} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              color: 'var(--info)', fontSize: 12, fontWeight: 500,
              opacity: isSyncing ? 0.6 : 1,
            }}>
              <RefreshCw size={12} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
              Sincronizar
            </button>
          )}
        </div>
      )}

      {/* ── Conteúdo da página ───────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <Outlet />
      </div>

      {/* ── Bottom navigation ────────────────────────────────────── */}
      <nav style={{
        display: 'flex',
        background: 'var(--surface-card)',
        borderTop: '0.5px solid #e2e8f0',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: 'var(--shadow-sm)',
        flexShrink: 0,
      }}>
        {NAV.map(({ path, label, Icon, cor }) => {
          const active = location.pathname === path;
          return (
            <button key={path} onClick={() => navigate(path)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, padding: '9px 4px 8px',
              background: 'none', border: 'none', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative',
            }}>
              {/* Indicador ativo */}
              {active && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 32, height: 2.5, borderRadius: '0 0 4px 4px',
                  background: cor,
                }} />
              )}
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? `${cor}14` : 'transparent',
                transition: 'background 0.15s',
              }}>
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.8}
                  color={active ? cor : '#94a3b8'}
                />
              </div>
              <span style={{
                fontSize: 10, fontWeight: active ? 600 : 400,
                color: active ? cor : '#94a3b8',
                letterSpacing: 0.1, lineHeight: 1,
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
