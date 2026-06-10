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
  ClipboardList, BookOpen, Eye, HeartPulse, Package, Users,
  Wifi, WifiOff, RefreshCw, RotateCw, LogOut, Monitor,
} from 'lucide-react';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useAuth } from '../../app/AuthProvider';
import { hardRefreshPWA, BUILD_ID } from '../../lib/pwaUpdate';

const NAV = [
  { path: '/app/mobile/chamada',    label: 'Chamada',    Icon: ClipboardList, cor: '#4f46e5' },
  { path: '/app/mobile/diario',     label: 'Diário',     Icon: BookOpen,      cor: '#0284c7' },
  { path: '/app/mobile/observacao', label: 'Observação', Icon: Eye,           cor: '#7c3aed' },
  { path: '/app/mobile/ocorrencia', label: 'Ocorrência', Icon: HeartPulse,    cor: '#dc2626' },
  { path: '/app/mobile/alunos',     label: 'Alunos',     Icon: Users,         cor: '#0891b2' },
  { path: '/app/mobile/material',   label: 'Material',   Icon: Package,       cor: '#d97706' },
];

// Considera a aba ativa também nas sub-rotas (ex.: /alunos/:childId → aba Alunos)
function isNavActive(path: string, pathname: string): boolean {
  if (pathname === path) return true;
  if (path === '/app/mobile/alunos') return pathname.startsWith('/app/mobile/alunos');
  return false;
}

export default function MobileShell() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuth();
  const { isOnline, queueCount, isSyncing, syncNow } = useOfflineSync();

  const nomeUsuario = (user as any)?.nome?.split(' ')[0]
    ?? (user as any)?.firstName
    ?? (user as any)?.email?.split('@')[0]
    ?? 'Professor(a)';

  const ativaIdx = NAV.findIndex(n => isNavActive(n.path, location.pathname));
  const corAtiva = ativaIdx >= 0 ? NAV[ativaIdx].cor : '#4f46e5';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', background: '#f8fafc',
      fontFamily: '"Inter","system-ui",sans-serif',
    }}>

      {/* ── Header compacto ─────────────────────────────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        paddingTop: 'max(10px, env(safe-area-inset-top))',
        background: '#fff',
        borderBottom: '0.5px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        flexShrink: 0,
      }}>
        {/* Logo + nome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: '#4f46e5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>C</span>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>
              Olá, {nomeUsuario}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.2 }}>
              COCRIS Pedagógico · v{BUILD_ID}
            </p>
          </div>
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Atualizar app (força nova versão — destrava cache do PWA no iOS) */}
          <button
            onClick={() => {
              if (confirm('Atualizar o app para a versão mais recente? A tela vai recarregar.')) {
                hardRefreshPWA();
              }
            }}
            title="Atualizar app"
            style={{
              width: 34, height: 34, borderRadius: 10, border: '0.5px solid #e2e8f0',
              background: '#f8fafc', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#94a3b8',
            }}
          >
            <RotateCw size={16} />
          </button>

          {/* Botão versão desktop */}
          <button
            onClick={() => navigate('/app/teacher-dashboard')}
            title="Versão desktop"
            style={{
              width: 34, height: 34, borderRadius: 10, border: '0.5px solid #e2e8f0',
              background: '#f8fafc', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#94a3b8',
            }}
          >
            <Monitor size={16} />
          </button>

          {/* Logout */}
          <button
            onClick={() => { logout?.(); navigate('/login'); }}
            title="Sair"
            style={{
              width: 34, height: 34, borderRadius: 10, border: '0.5px solid #fecaca',
              background: '#fef2f2', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#dc2626',
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
          background: isOnline ? '#fffbeb' : '#fef2f2',
          borderBottom: `0.5px solid ${isOnline ? '#fde68a' : '#fecaca'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isOnline
              ? <Wifi size={13} color="#d97706" />
              : <WifiOff size={13} color="#dc2626" />}
            <span style={{ fontSize: 12, color: isOnline ? '#92400e' : '#991b1b' }}>
              {isOnline
                ? `${queueCount} ação${queueCount !== 1 ? 'ões' : ''} aguardando envio`
                : `Sem conexão · ${queueCount} salva${queueCount !== 1 ? 's' : ''} localmente`}
            </span>
          </div>
          {isOnline && queueCount > 0 && (
            <button onClick={syncNow} disabled={isSyncing} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              color: '#d97706', fontSize: 12, fontWeight: 500,
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
        background: '#fff',
        borderTop: '0.5px solid #e2e8f0',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -1px 8px rgba(0,0,0,0.06)',
        flexShrink: 0,
      }}>
        {NAV.map(({ path, label, Icon, cor }) => {
          const active = isNavActive(path, location.pathname);
          return (
            <button key={path} onClick={() => navigate(path)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, padding: '9px 2px 8px',
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
                width: 34, height: 34, borderRadius: 11,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? `${cor}14` : 'transparent',
                transition: 'background 0.15s',
              }}>
                <Icon
                  size={19}
                  strokeWidth={active ? 2.5 : 1.8}
                  color={active ? cor : '#94a3b8'}
                />
              </div>
              <span style={{
                fontSize: 9.5, fontWeight: active ? 600 : 400,
                color: active ? cor : '#94a3b8',
                letterSpacing: 0, lineHeight: 1, whiteSpace: 'nowrap',
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
